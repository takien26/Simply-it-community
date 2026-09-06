import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { COMPREHENSIVE_IT_KB } from '@/lib/it-knowledge-base';

// GET /api/search?q=keyword&limit=15
export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const q = (searchParams.get('q') || '').trim();
    const limit = Math.min(parseInt(searchParams.get('limit') || '15'), 30);

    if (!q || q.length < 1) {
      return NextResponse.json({ success: true, results: [], grouped: {} });
    }

    const userRole = currentUser.roleName || 'Staff';
    const isAdmin = userRole === 'Admin' || (Array.isArray((currentUser as any).permissions) && (currentUser as any).permissions.includes('*'));
    const isITStaff = isAdmin || userRole.toLowerCase().includes('it') || userRole.toLowerCase().includes('manager') || userRole.toLowerCase().includes('kỹ thuật');

    // Parallel search across all entity tables
    const [assets, users, tickets, licenses, services, spareParts, dbDocs] = await Promise.all([
      // 1. Assets
      prisma.asset.findMany({
        where: {
          OR: [
            { assetTag: { contains: q, mode: 'insensitive' } },
            { name: { contains: q, mode: 'insensitive' } },
            { serialNumber: { contains: q, mode: 'insensitive' } },
            { model: { contains: q, mode: 'insensitive' } },
            { brand: { contains: q, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          assetTag: true,
          name: true,
          serialNumber: true,
          status: true,
          category: { select: { name: true } },
        },
        take: limit,
        orderBy: { updatedAt: 'desc' },
      }),

      // 2. Users
      prisma.user.findMany({
        where: {
          OR: [
            { fullName: { contains: q, mode: 'insensitive' } },
            { email: { contains: q, mode: 'insensitive' } },
            { department: { contains: q, mode: 'insensitive' } },
            { phone: { contains: q, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          fullName: true,
          email: true,
          department: true,
          role: { select: { name: true } },
        },
        take: limit,
        orderBy: { fullName: 'asc' },
      }),

      // 3. Tickets
      prisma.ticket.findMany({
        where: {
          OR: [
            { ticketNumber: { contains: q, mode: 'insensitive' } },
            { title: { contains: q, mode: 'insensitive' } },
            { description: { contains: q, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          ticketNumber: true,
          title: true,
          status: true,
          priority: true,
          createdBy: { select: { fullName: true } },
        },
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),

      // 4. Licenses
      prisma.license.findMany({
        where: {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { licenseKey: { contains: q, mode: 'insensitive' } },
            { companyName: { contains: q, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          name: true,
          companyName: true,
          vendor: { select: { name: true } },
          status: true,
          licenseType: true,
        },
        take: limit,
        orderBy: { updatedAt: 'desc' },
      }),

      // 5. IT Services
      prisma.iTService.findMany({
        where: {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { serviceCode: { contains: q, mode: 'insensitive' } },
            { contractNumber: { contains: q, mode: 'insensitive' } },
            { companyName: { contains: q, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          name: true,
          serviceCode: true,
          companyName: true,
          vendor: { select: { name: true } },
          status: true,
          serviceType: true,
        },
        take: limit,
        orderBy: { updatedAt: 'desc' },
      }),

      // 6. Spare Parts
      prisma.sparePart.findMany({
        where: {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { sku: { contains: q, mode: 'insensitive' } },
            { notes: { contains: q, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          name: true,
          sku: true,
          quantity: true,
          unit: true,
        },
        take: limit,
      }).catch(() => []),

      // 7. Documents & Knowledge Base in DB
      prisma.document.findMany({
        where: {
          OR: [
            { title: { contains: q, mode: 'insensitive' } },
            { notes: { contains: q, mode: 'insensitive' } },
            { fileName: { contains: q, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          title: true,
          type: true,
          notes: true,
          fileUrl: true,
          fileName: true,
        },
        take: limit,
      }).catch(() => []),
    ]);

    // 8. Filter Static KB Articles
    const qLower = q.toLowerCase();
    const matchedStaticKB = COMPREHENSIVE_IT_KB.filter(
      (k) =>
        k.title.toLowerCase().includes(qLower) ||
        k.keywords.some((w) => w.toLowerCase().includes(qLower)) ||
        k.summary.toLowerCase().includes(qLower)
    ).slice(0, 5);

    // Format results
    const results: any[] = [];

    const assetStatusMap: Record<string, string> = {
      AVAILABLE: 'Sẵn sàng', IN_USE: 'Đang sử dụng', MAINTENANCE: 'Bảo trì',
      RETIRED: 'Đã thanh lý', LOST: 'Mất', PENDING: 'Chờ xử lý',
    };

    assets.forEach((a) => {
      results.push({
        type: 'asset',
        icon: 'laptop',
        id: a.id,
        title: a.name || a.assetTag,
        subtitle: `${a.assetTag}${a.serialNumber ? ' | SN: ' + a.serialNumber : ''} | ${assetStatusMap[a.status] || a.status}`,
        category: a.category?.name || 'Tài sản',
        url: `/assets?id=${a.id}`,
      });
    });

    users.forEach((u) => {
      results.push({
        type: 'user',
        icon: 'user',
        id: u.id,
        title: u.fullName || u.email,
        subtitle: `${u.email}${u.department ? ' | ' + u.department : ''} | ${u.role?.name || ''}`,
        category: 'Nhân sự',
        url: `/users?id=${u.id}`,
      });
    });

    const ticketStatusMap: Record<string, string> = {
      OPEN: 'Mới mở', IN_PROGRESS: 'Đang xử lý', WAITING: 'Chờ phản hồi',
      RESOLVED: 'Đã giải quyết', CLOSED: 'Đã đóng',
    };
    const priorityMap: Record<string, string> = { LOW: 'P4 (Thấp)', MEDIUM: 'P3 (Vừa)', HIGH: 'P2 (Cao)', URGENT: 'P1 (Khẩn cấp)' };

    tickets.forEach((t) => {
      results.push({
        type: 'ticket',
        icon: 'ticket',
        id: t.id,
        title: `${t.ticketNumber}: ${t.title}`,
        subtitle: `${ticketStatusMap[t.status] || t.status} | ${priorityMap[t.priority] || t.priority}${t.createdBy ? ' | ' + t.createdBy.fullName : ''}`,
        category: 'Ticket Helpdesk',
        url: `/tickets?id=${t.id}`,
      });
    });

    const licenseStatusMap: Record<string, string> = {
      ACTIVE: 'Đang hoạt động', EXPIRED: 'Hết hạn', SUSPENDED: 'Tạm ngưng',
    };

    licenses.forEach((l) => {
      results.push({
        type: 'license',
        icon: 'key',
        id: l.id,
        title: l.name,
        subtitle: `${l.vendor?.name || l.companyName || ''} | ${licenseStatusMap[l.status] || l.status} | ${l.licenseType}`,
        category: 'Bản quyền phần mềm',
        url: `/licenses?id=${l.id}`,
      });
    });

    const serviceStatusMap: Record<string, string> = {
      ACTIVE: 'Đang hoạt động', PENDING_RENEWAL: 'Sắp gia hạn',
      SUSPENDED: 'Tạm ngưng', TERMINATED: 'Đã chấm dứt', EXPIRED: 'Hết hạn',
    };

    services.forEach((s) => {
      results.push({
        type: 'service',
        icon: 'globe',
        id: s.id,
        title: s.name,
        subtitle: `${s.serviceCode}${s.vendor?.name ? ' | ' + s.vendor.name : ''} | ${serviceStatusMap[s.status] || s.status}`,
        category: 'Dịch vụ viễn thông',
        url: `/services?id=${s.id}`,
      });
    });

    spareParts.forEach((sp: any) => {
      results.push({
        type: 'spare_part',
        icon: 'wrench',
        id: sp.id,
        title: sp.name,
        subtitle: `Mã kho: ${sp.sku || 'N/A'} | Tồn kho: ${sp.quantity} ${sp.unit}`,
        category: 'Kho phụ tùng',
        url: `/spare-parts?id=${sp.id}`,
      });
    });

    // Knowledge Base Articles
    matchedStaticKB.forEach((k) => {
      results.push({
        type: 'kb',
        icon: 'book',
        id: k.id,
        title: `📖 ${k.title}`,
        subtitle: `${k.category} | ${k.summary}`,
        category: 'Hướng dẫn IT',
        url: `/kb?search=${encodeURIComponent(k.title)}`,
      });
    });

    dbDocs.forEach((d: any) => {
      const isInternal = d.title.includes('[IT-NET]') || d.title.includes('[IT-APP]') || d.title.includes('[IT-HELPDESK]') || d.title.includes('[IT-SEC]');
      if (!isITStaff && !isAdmin && isInternal) return; // RBAC protect

      results.push({
        type: 'document',
        icon: 'file',
        id: d.id,
        title: `📄 ${d.title}`,
        subtitle: d.notes ? d.notes.slice(0, 80) : d.fileName,
        category: 'Tài liệu & Quy trình',
        url: `/documents?id=${d.id}`,
      });
    });

    const grouped = {
      asset: results.filter((r) => r.type === 'asset'),
      ticket: results.filter((r) => r.type === 'ticket'),
      kb: results.filter((r) => r.type === 'kb' || r.type === 'document'),
      license: results.filter((r) => r.type === 'license'),
      service: results.filter((r) => r.type === 'service'),
      spare_part: results.filter((r) => r.type === 'spare_part'),
      user: results.filter((r) => r.type === 'user'),
    };

    return NextResponse.json({
      success: true,
      query: q,
      total: results.length,
      results,
      grouped,
    });
  } catch (error) {
    console.error('Global search error:', error);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
