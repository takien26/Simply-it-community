import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { COMPREHENSIVE_IT_KB, KBArticle } from '@/lib/it-knowledge-base';
import { getGenAIClient, generateUnifiedTextAI } from '@/lib/ai-config';

// Smart Weighted Matching Algorithm (Scoring TF-IDF & Exact phrase match)
function findBestMatchingKB(query: string, knowledge: KBArticle[]): { article: KBArticle; score: number }[] {
  const normalizedQuery = query.toLowerCase().trim();
  const words = normalizedQuery.split(/[\s,./?!;:]+/).filter((w) => w.length > 1);

  // If query is an inventory or workload query, suppress general troubleshooting articles
  const isInventoryOrWorkloadQuery =
    normalizedQuery.includes('trong kho') ||
    normalizedQuery.includes('tồn kho') ||
    normalizedQuery.includes('còn bao nhiêu') ||
    normalizedQuery.includes('bao nhiêu máy') ||
    normalizedQuery.includes('bao nhiêu laptop') ||
    normalizedQuery.includes('bao nhiêu màn hình') ||
    normalizedQuery.includes('bao nhiêu pc') ||
    normalizedQuery.includes('bao nhiêu thiết bị') ||
    normalizedQuery.includes('sẵn sàng') ||
    normalizedQuery.includes('chưa cấp') ||
    normalizedQuery.includes('available') ||
    normalizedQuery.includes('it nào') ||
    normalizedQuery.includes('nhiều ticket') ||
    normalizedQuery.includes('ai nhiều ticket') ||
    normalizedQuery.includes('kỹ thuật viên nào');

  if (isInventoryOrWorkloadQuery) {
    return [];
  }

  const scored = knowledge.map((item) => {
    let score = 0;

    // 1. Exact phrase matching in title or keywords (Highest priority +150)
    for (const kw of item.keywords) {
      const kwLower = kw.toLowerCase().trim();
      if (normalizedQuery === kwLower) {
        score += 150;
      } else if (normalizedQuery.includes(kwLower)) {
        score += 90;
      }
    }

    // 2. Exact Title Match
    if (normalizedQuery.includes(item.title.toLowerCase())) {
      score += 100;
    }

    // 3. Category match
    if (normalizedQuery.includes(item.category.toLowerCase())) {
      score += 20;
    }

    // 4. Whole-word matching (avoid partial prefix false-positives like 'kho' in 'khóa')
    for (const word of words) {
      try {
        const wordRegex = new RegExp(`\\b${word}\\b`, 'i');
        if (wordRegex.test(item.title)) score += 15;
        if (wordRegex.test(item.summary)) score += 5;
        if (item.keywords.some((k) => wordRegex.test(k))) score += 10;
      } catch {}
    }

    // Intent Guardrails:
    if ((normalizedQuery.includes('mật khẩu') || normalizedQuery.includes('pass')) && item.categoryKey === 'APPROVAL') {
      score -= 150;
    }
    if ((normalizedQuery.includes('xin cấp') || normalizedQuery.includes('máy mới')) && item.categoryKey === 'ACCOUNT') {
      score -= 150;
    }

    return { article: item, score };
  });

  return scored.sort((a, b) => b.score - a.score).filter((s) => s.score >= 40);
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { message, history = [] } = body;

    if (!message || !message.trim()) {
      return NextResponse.json({ error: 'Vui lòng nhập câu hỏi' }, { status: 400 });
    }

    const userQuery = message.trim().toLowerCase();
    const userRole = user.roleName || 'Staff';
    const isAdmin = userRole === 'Admin' || (Array.isArray((user as any).permissions) && (user as any).permissions.includes('*'));
    const isITStaff = isAdmin || userRole.toLowerCase().includes('it') || userRole.toLowerCase().includes('manager') || userRole.toLowerCase().includes('kỹ thuật');

    // ==================== 1. CONTINUOUS LEARNING: DB DOCUMENTS & RESOLVED TICKETS ====================
    const [dbDocuments, resolvedTickets] = await Promise.all([
      prisma.document.findMany({
        take: 50,
        select: { id: true, title: true, notes: true, type: true, fileUrl: true },
        orderBy: { createdAt: 'desc' },
      }).catch(() => []),
      prisma.ticket.findMany({
        where: {
          status: { in: ['RESOLVED', 'CLOSED'] },
          resolutionNotes: { not: null },
        },
        take: 30,
        orderBy: { resolvedAt: 'desc' },
        select: { id: true, ticketNumber: true, title: true, category: true, description: true, resolutionNotes: true },
      }).catch(() => []),
    ]);

    const accessibleDocs = dbDocuments.filter((d) => {
      if (isAdmin || isITStaff) return true;
      const isInternal = d.title.includes('[IT-NET]') || d.title.includes('[IT-APP]') || d.title.includes('[IT-HELPDESK]') || d.title.includes('[IT-SEC]');
      return !isInternal;
    });

    const dynamicKB: KBArticle[] = [
      ...COMPREHENSIVE_IT_KB,
      ...accessibleDocs.map((d) => {
        const extractedKeywords = [
          ...d.title.toLowerCase().replace(/[[\]]/g, ' ').split(/\s+/).filter(w => w.length > 2),
          ...(d.notes ? d.notes.toLowerCase().split(/\s+/).filter(w => w.length > 3).slice(0, 15) : [])
        ];
        return {
          id: `doc-${d.id}`,
          title: d.title,
          category: String(d.type || 'Tài liệu Chuyên môn IT'),
          categoryKey: 'SOFTWARE' as const,
          keywords: Array.from(new Set(extractedKeywords)),
          summary: d.notes ? d.notes.split('\n')[0] : d.title,
          steps: d.notes || d.title,
        };
      }),
      // Auto-Learned Knowledge from successfully solved IT Tickets
      ...resolvedTickets.map((t) => {
        const titleKeywords = t.title.toLowerCase().replace(/[[\]]/g, ' ').split(/\s+/).filter(w => w.length > 2);
        return {
          id: `resolved-${t.id}`,
          title: `[Kinh nghiệm xử lý] ${t.title}`,
          category: `Sự cố đã xử lý (${t.category})`,
          categoryKey: 'SOFTWARE' as const,
          keywords: Array.from(new Set([...titleKeywords, t.ticketNumber.toLowerCase()])),
          summary: `Sự cố trước đây: ${t.description || t.title}`,
          steps: `**Giải pháp kỹ thuật đã áp dụng thành công (từ Ticket ${t.ticketNumber}):**\n${t.resolutionNotes}`,
        };
      }),
    ];

    // ==================== 2. USER'S OWN ASSETS (PERSONAL ASSETS QUERY) ====================
    if (userQuery.includes('máy của tôi') || userQuery.includes('tài sản của tôi') || userQuery.includes('thiết bị của tôi') || userQuery.includes('đang dùng máy gì')) {
      const myAssets = await prisma.assetAssignment.findMany({
        where: { userId: user.userId, returnedAt: null },
        include: { asset: true },
        take: 5,
      }).catch(() => []);

      if (myAssets.length > 0) {
        const assetListStr = myAssets
          .map((a, i) => `${i + 1}. **${a.asset?.name}** (Mã: \`${a.asset?.assetTag}\`, Serial: \`${a.asset?.serialNumber || 'N/A'}\`)`)
          .join('\n');
        return NextResponse.json({
          success: true,
          reply: `💻 **Danh sách thiết bị bạn đang được công ty bàn giao sử dụng:**\n\n${assetListStr}\n\n*Nếu thiết bị gặp sự cố hoặc cần bảo dưỡng, bạn có thể bấm "Tạo Ticket Hỗ Trợ" bên dưới nhé!*`,
          userRole,
        });
      } else {
        return NextResponse.json({
          success: true,
          reply: `Bạn hiện chưa có thiết bị nào được ghi nhận bàn giao trên hệ thống. Nếu bạn cần cấp máy tính mới, hãy vào mục **Hỗ trợ > Yêu cầu & Phê duyệt** (\`/approvals\`) để tạo đơn xin cấp máy nhé!`,
          userRole,
        });
      }
    }

    // ==================== 3. TICKET WORKLOAD & IT PERFORMANCE GROUNDING ====================
    const isTicketWorkloadQuery =
      userQuery.includes('it nào') ||
      userQuery.includes('ai nhiều ticket') ||
      userQuery.includes('nhiều ticket nhất') ||
      userQuery.includes('kỹ thuật viên nào') ||
      userQuery.includes('phân công ticket') ||
      userQuery.includes('ai đang xử lý') ||
      userQuery.includes('khối lượng công việc') ||
      userQuery.includes('ticket đang mở') ||
      userQuery.includes('quá hạn sla');

    if (isTicketWorkloadQuery) {
      const openTickets = await prisma.ticket.findMany({
        where: { status: { in: ['OPEN', 'IN_PROGRESS'] } },
        include: { assignedTo: true },
        orderBy: { createdAt: 'desc' },
      }).catch(() => []);

      const countMap = new Map<string, { count: number; tickets: string[] }>();
      let unassignedCount = 0;

      for (const t of openTickets) {
        if (!t.assignedTo) {
          unassignedCount++;
        } else {
          const name = t.assignedTo.fullName;
          const cur = countMap.get(name) || { count: 0, tickets: [] };
          cur.count++;
          if (cur.tickets.length < 3) {
            cur.tickets.push(`\`${t.ticketNumber}\` (${t.title})`);
          }
          countMap.set(name, cur);
        }
      }

      const sortedTechs = Array.from(countMap.entries()).sort((a, b) => b[1].count - a[1].count);

      if (sortedTechs.length > 0 || unassignedCount > 0) {
        const topTechsList = sortedTechs
          .map(([name, data], i) => {
            const ticketSamples = data.tickets.length > 0 ? `\n   ↳ *Gần đây: ${data.tickets.join(', ')}*` : '';
            return `${i + 1}. 👨‍💻 **${name}**: **${data.count}** ticket đang xử lý${ticketSamples}`;
          })
          .join('\n');

        const topPerson = sortedTechs[0]
          ? `**${sortedTechs[0][0]}** (đang phụ trách **${sortedTechs[0][1].count}** ticket)`
          : 'Chưa có IT nào được phân công';

        const replyMarkdown = `📊 **Thống Kê Khối Lượng Công Việc & Phân Công Ticket IT Hôm Nay:**\n\n🔥 **Kỹ thuật viên đang phụ trách nhiều Ticket nhất:** ${topPerson}\n\n📋 **Chi tiết phân bổ công việc theo Kỹ thuật viên:**\n${topTechsList || '*(Chưa có kỹ thuật viên nào đang nhận ticket)*'}\n\n${unassignedCount > 0 ? `⚠️ **Hàng đợi chưa phân công (Unassigned):** **${unassignedCount}** ticket đang chờ tiếp nhận.` : '✅ Không có ticket nào bị tồn đọng chưa phân công.'}\n\n👉 *Xem chi tiết và điều phối tại mục [Quản lý Ticket](/tickets).*`;

        return NextResponse.json({
          success: true,
          reply: replyMarkdown,
          userRole,
        });
      }
    }

    // ==================== 4. SPARE PARTS STOCK QUERY ====================
    const isSparePartQuery =
      userQuery.includes('ram') ||
      userQuery.includes('ssd') ||
      userQuery.includes('ổ cứng') ||
      userQuery.includes('phụ tùng') ||
      userQuery.includes('linh kiện') ||
      userQuery.includes('cáp mạng') ||
      userQuery.includes('dây mạng') ||
      userQuery.includes('chuột') ||
      userQuery.includes('bàn phím');

    if (isSparePartQuery) {
      let partWhere: any = {};
      if (userQuery.includes('ram')) {
        partWhere = { name: { contains: 'ram', mode: 'insensitive' } };
      } else if (userQuery.includes('ssd') || userQuery.includes('ổ cứng')) {
        partWhere = { OR: [{ name: { contains: 'ssd', mode: 'insensitive' } }, { name: { contains: 'ổ cứng', mode: 'insensitive' } }] };
      } else if (userQuery.includes('cáp') || userQuery.includes('dây mạng')) {
        partWhere = { name: { contains: 'cáp', mode: 'insensitive' } };
      }

      const parts = await prisma.sparePart.findMany({
        where: partWhere,
        take: 10,
        orderBy: { quantity: 'asc' },
      }).catch(() => []);

      if (parts.length > 0) {
        const partsList = parts
          .map((p, i) => {
            const alert = p.quantity <= (p.minStock || 5) ? ' ⚠️ *(Sắp hết)*' : '';
            return `${i + 1}. **${p.name}** (Mã: \`${p.sku || p.id.slice(0, 8)}\`) — Số lượng: **${p.quantity}** ${p.unit || 'cái'}${alert}`;
          })
          .join('\n');

        return NextResponse.json({
          success: true,
          reply: `🔩 **Tồn kho linh kiện & Phụ tùng IT hiện tại:**\n\n${partsList}\n\n👉 *Quản lý chi tiết tại mục [Kho Phụ Tùng](/spare-parts).*`,
          userRole,
        });
      } else {
        const itemType = userQuery.includes('ram')
          ? 'RAM'
          : userQuery.includes('ssd') || userQuery.includes('ổ cứng')
          ? 'Ổ cứng / SSD'
          : userQuery.includes('cáp')
          ? 'Cáp mạng'
          : 'linh kiện';
        return NextResponse.json({
          success: true,
          reply: `🔩 Hiện tại trong **Kho Phụ Tùng** chưa có linh kiện **${itemType}** nào được ghi nhận.\n\n👉 *Bạn có thể xem danh sách hoặc nhập thêm tại mục [Kho Phụ Tùng](/spare-parts).*`,
          userRole,
        });
      }
    }

    // ==================== 5. LICENSE ALLOCATION QUERY ====================
    const isLicenseQuery =
      userQuery.includes('bao nhiêu license') ||
      userQuery.includes('còn bao nhiêu license') ||
      userQuery.includes('bản quyền office') ||
      userQuery.includes('bản quyền windows') ||
      userQuery.includes('license office') ||
      userQuery.includes('license windows') ||
      userQuery.includes('license');

    if (isLicenseQuery) {
      const licenses = await prisma.license.findMany({
        where: { status: 'ACTIVE' },
        take: 10,
        orderBy: { usedSeats: 'desc' },
      }).catch(() => []);

      if (licenses.length > 0) {
        const licList = licenses
          .map((l, i) => {
            const avail = Math.max(0, l.totalSeats - l.usedSeats);
            return `${i + 1}. **${l.name}**: Đã dùng **${l.usedSeats}/${l.totalSeats}** seats *(Còn trống: **${avail}** seats)*`;
          })
          .join('\n');

        return NextResponse.json({
          success: true,
          reply: `🔑 **Tình trạng phân bổ License & Bản quyền phần mềm:**\n\n${licList}\n\n👉 *Quản lý chi tiết tại mục [Quản lý License](/licenses).*`,
          userRole,
        });
      }
    }

    // ==================== 6. REAL-TIME WAREHOUSE / ASSET INVENTORY GROUNDING ====================
    const isInventoryQuery =
      userQuery.includes('trong kho') ||
      userQuery.includes('tồn kho') ||
      userQuery.includes('còn bao nhiêu') ||
      userQuery.includes('bao nhiêu máy') ||
      userQuery.includes('bao nhiêu laptop') ||
      userQuery.includes('bao nhiêu màn hình') ||
      userQuery.includes('bao nhiêu pc') ||
      userQuery.includes('bao nhiêu thiết bị') ||
      userQuery.includes('danh sách máy sẵn') ||
      userQuery.includes('sẵn sàng cấp') ||
      userQuery.includes('chưa cấp') ||
      userQuery.includes('available');

    if (isInventoryQuery) {
      const isLaptop = userQuery.includes('laptop') || userQuery.includes('macbook') || userQuery.includes('máy tính xách tay');
      const isMonitor = userQuery.includes('màn hình') || userQuery.includes('monitor') || userQuery.includes('display');
      const isPC = userQuery.includes('máy bàn') || userQuery.includes('pc') || userQuery.includes('desktop') || userQuery.includes('máy cây');
      const isPrinter = userQuery.includes('máy in') || userQuery.includes('printer');
      const isNetwork = userQuery.includes('switch') || userQuery.includes('router') || userQuery.includes('wifi') || userQuery.includes('mạng');

      let targetStatus: any = 'AVAILABLE';
      let statusTitle = 'Sẵn sàng trong kho (AVAILABLE)';
      if (userQuery.includes('bảo trì') || userQuery.includes('sửa chữa')) {
        targetStatus = 'MAINTENANCE';
        statusTitle = 'Đang bảo trì / Sửa chữa (MAINTENANCE)';
      } else if (userQuery.includes('đang dùng') || userQuery.includes('đang sử dụng') || userQuery.includes('đã cấp')) {
        targetStatus = 'IN_USE';
        statusTitle = 'Đang bàn giao sử dụng (IN_USE)';
      } else if (userQuery.includes('hỏng') || userQuery.includes('thanh lý') || userQuery.includes('lost')) {
        targetStatus = { in: ['RETIRED', 'LOST'] };
        statusTitle = 'Thanh lý / Đã mất';
      }

      const whereClause: any = {
        ...(typeof targetStatus === 'string' ? { status: targetStatus } : { status: targetStatus }),
      };

      if (isLaptop) {
        whereClause.OR = [
          { name: { contains: 'laptop', mode: 'insensitive' } },
          { name: { contains: 'macbook', mode: 'insensitive' } },
          { category: { name: { contains: 'laptop', mode: 'insensitive' } } },
        ];
      } else if (isMonitor) {
        whereClause.OR = [
          { name: { contains: 'màn hình', mode: 'insensitive' } },
          { name: { contains: 'monitor', mode: 'insensitive' } },
          { category: { name: { contains: 'màn hình', mode: 'insensitive' } } },
        ];
      } else if (isPC) {
        whereClause.OR = [
          { name: { contains: 'pc', mode: 'insensitive' } },
          { name: { contains: 'desktop', mode: 'insensitive' } },
          { category: { name: { contains: 'máy tính để bàn', mode: 'insensitive' } } },
        ];
      } else if (isPrinter) {
        whereClause.OR = [
          { name: { contains: 'máy in', mode: 'insensitive' } },
          { name: { contains: 'printer', mode: 'insensitive' } },
          { category: { name: { contains: 'máy in', mode: 'insensitive' } } },
        ];
      } else if (isNetwork) {
        whereClause.OR = [
          { name: { contains: 'switch', mode: 'insensitive' } },
          { name: { contains: 'router', mode: 'insensitive' } },
          { name: { contains: 'wifi', mode: 'insensitive' } },
          { category: { name: { contains: 'mạng', mode: 'insensitive' } } },
        ];
      }

      const [matchedAssets, totalInStockAll, totalInUseAll, totalMaintAll] = await Promise.all([
        prisma.asset.findMany({
          where: whereClause,
          include: { category: true, location: true },
          take: 15,
          orderBy: { updatedAt: 'desc' },
        }).catch(() => []),
        prisma.asset.count({ where: { status: 'AVAILABLE' } }).catch(() => 0),
        prisma.asset.count({ where: { status: 'IN_USE' } }).catch(() => 0),
        prisma.asset.count({ where: { status: 'MAINTENANCE' } }).catch(() => 0),
      ]);

      const deviceTypeLabel = isLaptop
        ? 'Laptop'
        : isMonitor
        ? 'Màn hình'
        : isPC
        ? 'Máy tính để bàn (PC)'
        : isPrinter
        ? 'Máy in'
        : 'Thiết bị';

      let replyMarkdown = '';
      if (matchedAssets.length > 0) {
        const listItems = matchedAssets
          .map((a, i) => {
            const locStr = a.location?.name ? ` - Vị trí: *${a.location.name}*` : '';
            const brandStr = a.brand ? ` (${a.brand})` : '';
            return `${i + 1}. **${a.name}**${brandStr} — Mã: \`${a.assetTag}\`${locStr}`;
          })
          .join('\n');

        replyMarkdown = `📦 **Hiện tại trong kho có ${matchedAssets.length} ${deviceTypeLabel} ${statusTitle.toLowerCase()}:**\n\n${listItems}\n\n📊 **Tổng quan trạng thái toàn bộ tài sản hệ thống:**\n- 🟢 **Sẵn sàng trong kho (AVAILABLE):** **${totalInStockAll}** thiết bị\n- 🔵 **Đang bàn giao sử dụng (IN_USE):** **${totalInUseAll}** thiết bị\n- 🟠 **Đang bảo trì / Sửa chữa (MAINTENANCE):** **${totalMaintAll}** thiết bị\n\n👉 *Bạn có thể xem chi tiết danh mục tại trang [Quản lý tài sản](/assets).*`;
      } else {
        replyMarkdown = `⚠️ Hiện tại trong kho **không còn ${deviceTypeLabel} nào ở trạng thái ${statusTitle}**.\n\n📊 **Số liệu tồn kho hiện tại:**\n- 🟢 **Sẵn sàng trong kho:** **${totalInStockAll}** thiết bị\n- 🔵 **Đang sử dụng:** **${totalInUseAll}** thiết bị\n- 🟠 **Đang bảo trì:** **${totalMaintAll}** thiết bị\n\n*Nếu cần mua sắm bổ sung thiết bị, bạn có thể tạo đề xuất tại mục [Yêu cầu & Phê duyệt](/approvals).*`;
      }

      return NextResponse.json({
        success: true,
        reply: replyMarkdown,
        userRole,
      });
    }

    // ==================== 7. ADMIN SYSTEM MACRO STATS ====================
    if (isAdmin && (userQuery.includes('thống kê') || userQuery.includes('tổng quan') || userQuery.includes('báo cáo') || userQuery.includes('hôm nay'))) {
      const now = new Date();
      const next30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      const [assetCount, expiringLicenses, openTickets, urgentTickets, lowStockParts] = await Promise.all([
        prisma.asset.count().catch(() => 0),
        prisma.license.count({ where: { expiryDate: { lte: next30Days, gte: now } } }).catch(() => 0),
        prisma.ticket.count({ where: { status: { in: ['OPEN', 'IN_PROGRESS'] } } }).catch(() => 0),
        prisma.ticket.count({ where: { priority: 'URGENT', status: { in: ['OPEN', 'IN_PROGRESS'] } } }).catch(() => 0),
        prisma.sparePart.count({ where: { quantity: { lte: 5 } } }).catch(() => 0),
      ]);

      const replyText = `📊 **Báo Cáo Tóm Tắt Quản Trị Hệ Thống Hôm Nay (Chế độ Admin):**\n\n- 💻 **Tổng tài sản quản lý:** **${assetCount}** thiết bị\n- 🔑 **License sắp hết hạn (30 ngày tới):** **${expiringLicenses}** bản quyền (vào \`/licenses\` để gia hạn)\n- 🎫 **Ticket Helpdesk đang xử lý:** **${openTickets}** (trong đó có **${urgentTickets}** sự cố khẩn cấp)\n- 📦 **Linh kiện kho phụ tùng sắp hết (≤5 cái):** **${lowStockParts}** loại (vào \`/spare-parts\` để nhập thêm)\n\n*Bạn có thể bấm vào các menu tương ứng trên thanh điều hướng để xử lý ngay nhé!*`;
      return NextResponse.json({
        success: true,
        reply: replyText,
        userRole,
      });
    }

    // ==================== 8. SECURITY GUARDRAILS ====================
    const askingForSensitive =
      (userQuery.includes('mật khẩu admin') ||
        userQuery.includes('root') ||
        userQuery.includes('password vault') ||
        userQuery.includes('mật khẩu wifi quản trị') ||
        userQuery.includes('ip server') ||
        userQuery.includes('máy chủ nội bộ')) &&
      !isAdmin;

    if (askingForSensitive) {
      return NextResponse.json({
        success: true,
        reply: `🔒 **Thông Báo Bảo Mật**: Bạn đang sử dụng quyền **${userRole}**. Thông tin cấu hình hạ tầng và mật khẩu quản trị là dữ liệu tuyệt mật được bảo vệ bởi chính sách an toàn thông tin (Security Guardrail). Nếu bạn cần hỗ trợ, vui lòng tạo Ticket để IT Admin xử lý trực tiếp.`,
        userRole,
        suggestedAction: {
          type: 'CREATE_TICKET',
          title: 'Yêu cầu cấp quyền / Hỗ trợ hạ tầng mạng',
          description: message,
        },
      });
    }

    // ==================== 9. KB EXACT MATCHING ====================
    const matchedRankings = findBestMatchingKB(message, dynamicKB);
    const topMatch = matchedRankings.length > 0 ? matchedRankings[0].article : null;
    const topScore = matchedRankings.length > 0 ? matchedRankings[0].score : 0;

    const wantsTicket =
      userQuery.includes('tạo ticket') ||
      userQuery.includes('mở ticket') ||
      userQuery.includes('không sửa được') ||
      userQuery.includes('không giải quyết được') ||
      userQuery.includes('nhờ it xuống') ||
      userQuery.includes('gặp kỹ thuật') ||
      userQuery.includes('hỗ trợ trực tiếp') ||
      userQuery.includes('báo hỏng');

    // High confidence KB matching
    if (topMatch && topScore >= 70 && !wantsTicket) {
      const instantReply = `### 💡 Hướng dẫn xử lý: **${topMatch.title}**\n\n${topMatch.summary}\n\n**Các bước thực hiện:**\n${topMatch.steps}\n\n*Nếu bạn đã làm theo các bước trên nhưng vẫn chưa được, hãy nhấn nút **"Tạo Ticket Hỗ Trợ"** bên dưới để Kỹ thuật viên IT hỗ trợ trực tiếp nhé!*`;
      return NextResponse.json({
        success: true,
        reply: instantReply,
        userRole,
        suggestedAction: topMatch.requiresTicketIfFailed
          ? {
              type: 'CREATE_TICKET',
              title: topMatch.title,
              description: `Cần IT hỗ trợ xử lý sự cố: ${topMatch.title}`,
            }
          : null,
        relatedKB: matchedRankings.slice(0, 2).map((m) => m.article),
      });
    }

    // ==================== 10. ADVANCED MULTI-AI INVOCATION (GEMINI / OPENAI) ====================
    try {
      // Fetch Live Database Stats for AI Grounding
      const [totalAssets, inStockAssets, openTicketsCount, allOpenTickets] = await Promise.all([
        prisma.asset.count().catch(() => 0),
        prisma.asset.count({ where: { status: 'AVAILABLE' } }).catch(() => 0),
        prisma.ticket.count({ where: { status: 'OPEN' } }).catch(() => 0),
        prisma.ticket.findMany({
          where: { status: { in: ['OPEN', 'IN_PROGRESS'] } },
          include: { assignedTo: { select: { fullName: true } } },
          take: 20,
        }).catch(() => []),
      ]);

      const itWorkloads: Record<string, number> = {};
      for (const t of allOpenTickets) {
        const name = t.assignedTo?.fullName || 'Chưa phân công';
        itWorkloads[name] = (itWorkloads[name] || 0) + 1;
      }

      const prompt = `
Bạn là Trợ lý AI IT Support & Quản Trị Hệ Thống (SIMPLY IT Assistant) của công ty.
Vai trò người dùng hiện tại: "${userRole}" (Admin: ${isAdmin ? 'Đúng' : 'Không'}).

Dữ liệu thời gian thực của hệ thống SIMPLY IT:
- Tổng số thiết bị quản lý: ${totalAssets}
- Thiết bị sẵn sàng trong kho (AVAILABLE): ${inStockAssets}
- Ticket sự cố đang mở: ${openTicketsCount}
- Phân bổ công việc Kỹ thuật viên IT hiện tại: ${JSON.stringify(itWorkloads)}

Cơ sở tri thức IT chuẩn & Bài học đã tự học từ các sự cố trước:
${JSON.stringify(topMatch ? [topMatch] : dynamicKB.slice(0, 8), null, 2)}

Lịch sử trò chuyện gần nhất:
${JSON.stringify(history.slice(-4), null, 2)}

Câu hỏi của người dùng: "${message}"

Quy tắc trả lời:
1. Trả lời bằng tiếng Việt chuyên nghiệp, tự nhiên, đúng trọng tâm câu hỏi.
2. Nếu hỏi về kỹ thuật viên/khối lượng ticket/tồn kho/license, hãy tính toán và trả lời chính xác theo số liệu thời gian thực ở trên.
3. Nếu người dùng hỏi cách giải quyết sự cố, hướng dẫn từng bước 1., 2., 3. rõ ràng.
4. Nếu vấn đề phức tạp, đề xuất người dùng nhấn nút "Tạo Ticket Hỗ Trợ".
`;

      const aiResponse = await generateUnifiedTextAI({
        prompt,
        temperature: 0.3,
        maxTokens: 2000,
      });

      if (aiResponse) {
        return NextResponse.json({
          success: true,
          reply: aiResponse,
          userRole,
          suggestedAction: wantsTicket || topMatch?.requiresTicketIfFailed
            ? {
                type: 'CREATE_TICKET',
                title: message.slice(0, 60),
                description: `Tự động tạo từ cuộc trò chuyện Chatbot AI: "${message}"`,
              }
            : null,
          relatedKB: matchedRankings.slice(0, 2).map((m) => m.article),
        });
      }
    } catch (aiErr) {
      console.warn('AI provider error, falling back to local engine:', aiErr);
    }

    // ==================== 11. LOCAL FALLBACK ====================
    let reply = '';
    if (topMatch) {
      reply = `### 💡 Hướng dẫn xử lý: **${topMatch.title}**\n\n${topMatch.summary}\n\n**Các bước thực hiện:**\n${topMatch.steps}\n\n*Nếu bạn đã làm theo các bước trên nhưng vẫn chưa được, hãy nhấn nút **"Tạo Ticket Hỗ Trợ"** bên dưới để Kỹ thuật viên IT hỗ trợ trực tiếp nhé!*`;
    } else if (wantsTicket) {
      reply = `Mình đã hiểu sự cố của bạn. Để Kỹ thuật viên IT tiếp nhận và xử lý tận nơi, bạn có thể nhấn nút **"Tạo Ticket Ngay"** bên dưới để mở yêu cầu hỗ trợ nhé!`;
    } else {
      reply = `Chào bạn! Mình là Trợ lý IT ảo SIMPLY IT.\n\nBạn có thể hỏi mình:\n- 👨‍💻 **Khối lượng công việc IT**: *"Nay IT nào có nhiều ticket nhất?"*, *"Tình hình phân công ticket"*...\n- 📦 **Kiểm tra tồn kho**: *"Trong kho hiện còn bao nhiêu laptop?"*, *"Tồn kho phụ tùng RAM/SSD"*...\n- 💻 **Tài sản cá nhân**: *"Tôi đang dùng những máy tính nào?"*\n- 🔑 **Sự cố thường gặp**: Đổi mật khẩu, VPN FortiClient, Outlook, máy in, WiFi...\n- 📊 **Thống kê quản trị**: Báo cáo tổng quan hệ thống hôm nay.\n\nHãy nhập câu hỏi vào ô chat để mình hỗ trợ ngay nhé!`;
    }

    return NextResponse.json({
      success: true,
      reply,
      userRole,
      suggestedAction: wantsTicket || topMatch?.requiresTicketIfFailed
        ? {
            type: 'CREATE_TICKET',
            title: message.slice(0, 60),
            description: `Tự động tạo từ Chatbot AI: "${message}"`,
          }
        : null,
      relatedKB: matchedRankings.slice(0, 2).map((m) => m.article),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
