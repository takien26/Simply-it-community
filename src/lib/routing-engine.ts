// src/lib/routing-engine.ts
// SIMPLY IT — Advanced Ticket Routing & Assignment Engine
// Tự động phân tuyến Ticket theo Ngữ cảnh, Tổ chức IT, Rule Priority và Cân bằng kỹ năng

import { prisma } from '@/lib/db';

export interface RoutingCondition {
  field: 'category' | 'subCategory' | 'companyName' | 'location' | 'service' | 'assetType' | 'priority' | 'keyword';
  operator: 'equals' | 'not_equals' | 'contains' | 'in' | 'starts_with';
  value: string;
}

export interface RoutingDecisionPath {
  company: string;
  location: string;
  service: string;
  category: string;
  subCategory: string;
  team: string;
  queue: string;
  assignee: string;
  ruleName: string;
}

export interface RoutingResult {
  teamId: string | null;
  teamName: string | null;
  queueId: string | null;
  queueName: string | null;
  assigneeId: string | null;
  assigneeName: string | null;
  ruleName: string | null;
  isAutoRouted: boolean;
  decisionPath: RoutingDecisionPath;
  routingLog: string[];
}

export interface TicketContext {
  category?: string;
  subCategory?: string;
  priority?: string;
  companyName?: string;
  description?: string;
  title?: string;
  assetId?: string;
  customAssetName?: string;
  createdById?: string;
  userDepartment?: string;
  userCompany?: string;
  userLocation?: string;
  serviceName?: string;
  assetTypeName?: string;
}

/**
 * Seed default IT Organization structure & standard routing rules if database is empty
 */
export async function ensureDefaultSupportOrg() {
  try {
    const count = await prisma.supportTeam.count();
    if (count > 0) return;

    // 1. Root IT Group
    const rootGroup = await prisma.supportTeam.create({
      data: {
        name: 'IT Group (Tập đoàn)',
        code: 'IT-GROUP',
        description: 'Ban Công nghệ Thông tin Tập đoàn',
        sortOrder: 1,
      },
    });

    // 2. IT Hà Nội & IT TP.HCM
    const itHN = await prisma.supportTeam.create({
      data: {
        name: 'IT Hà Nội',
        code: 'IT-HN',
        parentId: rootGroup.id,
        locationScope: 'Hà Nội',
        sortOrder: 2,
      },
    });

    const itHCM = await prisma.supportTeam.create({
      data: {
        name: 'IT TP.HCM',
        code: 'IT-HCM',
        parentId: rootGroup.id,
        locationScope: 'Hồ Chí Minh',
        sortOrder: 3,
      },
    });

    // 3. Sub-teams for IT Hà Nội
    const helpdeskHN = await prisma.supportTeam.create({
      data: {
        name: 'Helpdesk & Endpoint HN',
        code: 'HD-HN',
        parentId: itHN.id,
        description: 'Hỗ trợ người dùng đầu cuối, cài đặt máy tính, máy in tại HN',
        sortOrder: 1,
      },
    });

    const networkHN = await prisma.supportTeam.create({
      data: {
        name: 'Network & Hạ tầng HN',
        code: 'NET-HN',
        parentId: itHN.id,
        description: 'Quản trị mạng WiFi, Switch, Router, Firewall, VPN tại HN',
        sortOrder: 2,
      },
    });

    const appTeam = await prisma.supportTeam.create({
      data: {
        name: 'Application & Phần mềm ERP',
        code: 'APP-TEAM',
        parentId: rootGroup.id,
        description: 'Hỗ trợ ERP SAP/Bravo, CRM, Phần mềm nghiệp vụ toàn tập đoàn',
        sortOrder: 4,
      },
    });

    const systemTeam = await prisma.supportTeam.create({
      data: {
        name: 'System & Cloud Server',
        code: 'SYS-TEAM',
        parentId: rootGroup.id,
        description: 'Quản trị Server, Active Directory, M365, Virtualization',
        sortOrder: 5,
      },
    });

    // 4. Create Queues for teams
    const defaultQueue = await prisma.supportQueue.create({
      data: {
        name: 'Helpdesk General Queue',
        code: 'HD-GEN-Q',
        teamId: helpdeskHN.id,
        isDefault: true,
        description: 'Hàng đợi mặc định tiếp nhận mọi yêu cầu chưa phân loại',
      },
    });

    const netHNQueue = await prisma.supportQueue.create({
      data: {
        name: 'Network - Hà Nội Queue',
        code: 'NET-HN-Q',
        teamId: networkHN.id,
        isDefault: false,
        description: 'Hàng đợi xử lý sự cố mạng khu vực Hà Nội',
      },
    });

    const erpQueue = await prisma.supportQueue.create({
      data: {
        name: 'ERP & Application Queue',
        code: 'ERP-APP-Q',
        teamId: appTeam.id,
        isDefault: false,
        description: 'Hàng đợi hỗ trợ phần mềm và ERP',
      },
    });

    const sysQueue = await prisma.supportQueue.create({
      data: {
        name: 'System & Server Queue',
        code: 'SYS-SRV-Q',
        teamId: systemTeam.id,
        isDefault: false,
        description: 'Hàng đợi xử lý hệ thống máy chủ và dịch vụ đám mây',
      },
    });

    // 5. Seed standard Routing Rules
    // Rule 1: ERP / Phần mềm -> Application Team (Priority: 10)
    await prisma.routingRule.create({
      data: {
        name: 'Phần mềm & ERP Toàn Tập Đoàn',
        description: 'Tất cả yêu cầu liên quan đến ERP, phần mềm nghiệp vụ chuyển đến Application Team',
        priority: 10,
        targetTeamId: appTeam.id,
        targetQueueId: erpQueue.id,
        autoAssign: true,
        conditions: [
          { field: 'category', operator: 'equals', value: 'SOFTWARE' },
        ],
      },
    });

    // Rule 2: Network / WiFi / VPN -> Network Team (Priority: 20)
    await prisma.routingRule.create({
      data: {
        name: 'Mạng & Hạ Tầng Kết Nối HN',
        description: 'Yêu cầu Mạng, WiFi, VPN tại khu vực Hà Nội chuyển đến Network Team HN',
        priority: 20,
        targetTeamId: networkHN.id,
        targetQueueId: netHNQueue.id,
        autoAssign: true,
        conditions: [
          { field: 'category', operator: 'equals', value: 'NETWORK' },
        ],
      },
    });

    // Rule 3: License / M365 -> System Team (Priority: 30)
    await prisma.routingRule.create({
      data: {
        name: 'Bản Quyền & Tài Khoản Hệ Thống',
        description: 'Cấp quyền, bản quyền Office/Windows, tài khoản chuyển đến System Team',
        priority: 30,
        targetTeamId: systemTeam.id,
        targetQueueId: sysQueue.id,
        autoAssign: true,
        conditions: [
          { field: 'category', operator: 'in', value: 'LICENSE,ACCESS_REQUEST' },
        ],
      },
    });

    // Rule 4: Hardware / Thiết bị đầu cuối -> Helpdesk HN (Priority: 40)
    await prisma.routingRule.create({
      data: {
        name: 'Thiết Bị & Phần Cứng Đầu Cuối',
        description: 'Sửa chữa máy tính, laptop, bàn phím, màn hình chuyển đến Helpdesk HN',
        priority: 40,
        targetTeamId: helpdeskHN.id,
        targetQueueId: defaultQueue.id,
        autoAssign: true,
        conditions: [
          { field: 'category', operator: 'equals', value: 'HARDWARE' },
        ],
      },
    });
  } catch (err) {
    console.error('Error ensuring default support org:', err);
  }
}

/**
 * Evaluate a single routing condition against ticket context
 */
function evaluateCondition(condition: RoutingCondition, context: TicketContext): boolean {
  const fieldValue = getFieldValue(condition.field, context);
  if (fieldValue === null || fieldValue === undefined) return false;

  const normalizedField = String(fieldValue).toLowerCase().trim();
  const normalizedValue = String(condition.value).toLowerCase().trim();

  switch (condition.operator) {
    case 'equals':
      return normalizedField === normalizedValue;
    case 'not_equals':
      return normalizedField !== normalizedValue;
    case 'contains':
      return normalizedField.includes(normalizedValue);
    case 'in': {
      const values = normalizedValue.split(',').map((v) => v.trim());
      return values.includes(normalizedField);
    }
    case 'starts_with':
      return normalizedField.startsWith(normalizedValue);
    default:
      return false;
  }
}

/**
 * Map field name to actual ticket context value
 */
function getFieldValue(field: string, context: TicketContext): string | null {
  switch (field) {
    case 'category':
      return context.category || null;
    case 'subCategory':
      return context.subCategory || null;
    case 'priority':
      return context.priority || null;
    case 'companyName':
    case 'company':
      return context.companyName || context.userCompany || null;
    case 'department':
      return context.userDepartment || null;
    case 'location':
      return context.userLocation || null;
    case 'service':
      return context.serviceName || null;
    case 'assetType':
      return context.assetTypeName || null;
    case 'title':
      return context.title || null;
    case 'description':
      return context.description || null;
    case 'keyword':
      return `${context.title || ''} ${context.description || ''} ${context.subCategory || ''}`;
    default:
      return null;
  }
}

/**
 * Core routing function — finds the best matching rule and routes the ticket
 */
export async function routeTicket(ticketId: string): Promise<RoutingResult> {
  await ensureDefaultSupportOrg();

  const log: string[] = [];
  const decisionPath: RoutingDecisionPath = {
    company: 'N/A',
    location: 'N/A',
    service: 'N/A',
    category: 'N/A',
    subCategory: 'N/A',
    team: 'Chưa xác định',
    queue: 'Chưa xác định',
    assignee: 'Chưa phân công',
    ruleName: 'Chưa áp dụng',
  };

  const result: RoutingResult = {
    teamId: null,
    teamName: null,
    queueId: null,
    queueName: null,
    assigneeId: null,
    assigneeName: null,
    ruleName: null,
    isAutoRouted: false,
    decisionPath,
    routingLog: log,
  };

  try {
    // 1. Load ticket with full context
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        createdBy: {
          select: { department: true, companyName: true },
        },
        asset: {
          select: {
            id: true,
            name: true,
            locationId: true,
            companyName: true,
            category: { select: { name: true } },
            location: { select: { name: true, building: true } },
          },
        },
      },
    });

    if (!ticket) {
      log.push('❌ Ticket không tồn tại');
      return result;
    }

    // 2. Build routing context
    const context: TicketContext = {
      category: ticket.category,
      subCategory: ticket.subCategory || undefined,
      priority: ticket.priority,
      companyName: ticket.companyName || ticket.createdBy?.companyName || undefined,
      description: ticket.description,
      title: ticket.title,
      assetId: ticket.assetId || undefined,
      customAssetName: ticket.customAssetName || undefined,
      createdById: ticket.createdById,
      userDepartment: ticket.createdBy?.department || undefined,
      userCompany: ticket.createdBy?.companyName || undefined,
      userLocation: ticket.asset?.location?.name || undefined,
      assetTypeName: ticket.asset?.category?.name || undefined,
    };

    decisionPath.company = context.companyName || 'Tập đoàn Công nghệ Mẫu';
    decisionPath.location = context.userLocation || 'Hà Nội';
    decisionPath.category = context.category || 'HARDWARE';
    decisionPath.subCategory = context.subCategory || 'Chung';

    log.push(`📋 Thu thập Ngữ cảnh: Công ty=[${decisionPath.company}], Vị trí=[${decisionPath.location}], Phân loại=[${decisionPath.category}], Tiểu mục=[${decisionPath.subCategory}]`);

    // 3. Load all active routing rules sorted by priority (lowest number = highest priority)
    const rules = await prisma.routingRule.findMany({
      where: { isActive: true },
      orderBy: { priority: 'asc' },
      include: {
        targetTeam: {
          select: { id: true, name: true, code: true },
        },
      },
    });

    log.push(`📐 Đã nạp ${rules.length} Rule phân tuyến đang hoạt động`);

    // 4. Find first matching rule
    let matchedRule: (typeof rules)[0] | null = null;

    for (const rule of rules) {
      const conditions = rule.conditions as any[];
      if (!Array.isArray(conditions) || conditions.length === 0) continue;

      const allMatch = conditions.every((cond) => evaluateCondition(cond, context));
      if (allMatch) {
        matchedRule = rule;
        log.push(`✅ Khớp Rule [Độ ưu tiên #${rule.priority}]: "${rule.name}"`);
        break;
      } else {
        log.push(`⏩ Bỏ qua Rule: "${rule.name}" (điều kiện không thỏa mãn)`);
      }
    }

    // 5. Apply matched rule or fallback
    if (matchedRule) {
      result.teamId = matchedRule.targetTeamId;
      result.teamName = matchedRule.targetTeam.name;
      result.ruleName = matchedRule.name;
      result.isAutoRouted = true;
      decisionPath.team = matchedRule.targetTeam.name;
      decisionPath.ruleName = matchedRule.name;

      if (matchedRule.targetQueueId) {
        const queue = await prisma.supportQueue.findUnique({
          where: { id: matchedRule.targetQueueId },
          select: { id: true, name: true },
        });
        if (queue) {
          result.queueId = queue.id;
          result.queueName = queue.name;
          decisionPath.queue = queue.name;
          log.push(`📦 Hàng đợi chỉ định: "${queue.name}"`);
        }
      } else {
        const defaultQueue = await prisma.supportQueue.findFirst({
          where: { teamId: matchedRule.targetTeamId, isActive: true },
          orderBy: { isDefault: 'desc' },
          select: { id: true, name: true },
        });
        if (defaultQueue) {
          result.queueId = defaultQueue.id;
          result.queueName = defaultQueue.name;
          decisionPath.queue = defaultQueue.name;
          log.push(`📦 Hàng đợi mặc định của Team: "${defaultQueue.name}"`);
        }
      }

      // 6. Direct User Assignment or Auto-assign or Whole Team Queue
      if (matchedRule.targetUserId) {
        const targetUser = await prisma.user.findUnique({
          where: { id: matchedRule.targetUserId },
          select: { id: true, fullName: true },
        });
        if (targetUser) {
          result.assigneeId = targetUser.id;
          result.assigneeName = targetUser.fullName;
          decisionPath.assignee = targetUser.fullName;
          log.push(`👨‍💻 Gán ĐÍCH DANH cho Kỹ thuật viên: "${targetUser.fullName}" (theo cấu hình chỉ định của Rule).`);
        }
      } else if (matchedRule.autoAssign) {
        const assignee = await findBestAssignee(matchedRule.targetTeamId, context);
        if (assignee) {
          result.assigneeId = assignee.userId;
          result.assigneeName = assignee.userName;
          decisionPath.assignee = assignee.userName;
          log.push(`👨‍💻 Tự động phân công (Auto-assigned): "${assignee.userName}" (${assignee.openTickets} ticket đang mở, điểm chuyên môn: ${assignee.skillScore})`);
        } else {
          log.push('⚠️ Bật Auto-assign nhưng không tìm thấy Agent khả dụng phù hợp — chuyển vào Queue chờ nhận.');
        }
      } else {
        log.push(`👥 Không gán đích danh cá nhân — Toàn bộ thành viên Team "${matchedRule.targetTeam.name}" cùng nhận và xử lý trong Hàng đợi chung.`);
      }
    } else {
      log.push('⚠️ Không có Rule nào khớp — Kích hoạt cơ chế Fallback (Default Helpdesk Queue)');
      let fallbackQueue = await prisma.supportQueue.findFirst({
        where: { isDefault: true, isActive: true },
        include: { team: { select: { id: true, name: true, code: true } } },
      });

      if (!fallbackQueue) {
        // Find IT-ALL or any active queue
        fallbackQueue = await prisma.supportQueue.findFirst({
          where: { isActive: true },
          include: { team: { select: { id: true, name: true, code: true } } },
        });
      }

      if (!fallbackQueue) {
        // Auto-create safe fallback queue under IT-ALL or first team
        let defaultTeam = await prisma.supportTeam.findFirst({
          where: { code: 'IT-ALL' },
        });
        if (!defaultTeam) {
          defaultTeam = await prisma.supportTeam.findFirst();
        }

        if (defaultTeam) {
          fallbackQueue = await prisma.supportQueue.create({
            data: {
              name: `Hàng Đợi Cứu Cánh Mặc Định - ${defaultTeam.name}`,
              code: `Q-FALLBACK`,
              teamId: defaultTeam.id,
              isDefault: true,
              isActive: true,
            },
            include: { team: { select: { id: true, name: true, code: true } } },
          });
        }
      }

      if (fallbackQueue) {
        result.teamId = fallbackQueue.team.id;
        result.teamName = fallbackQueue.team.name;
        result.queueId = fallbackQueue.id;
        result.queueName = fallbackQueue.name;
        result.isAutoRouted = true;
        result.ruleName = 'Fallback — Hàng Đợi Cứu Cánh (Default Fallback Queue)';
        decisionPath.team = fallbackQueue.team.name;
        decisionPath.queue = fallbackQueue.name;
        decisionPath.ruleName = 'Fallback An Toàn (Chưa khớp Rule cụ thể)';
        log.push(`🛡️ 100% Không thất lạc: Đã tự động đưa vào Hàng đợi cứu cánh: "${fallbackQueue.name}" (${fallbackQueue.team.name})`);
      }
    }

    // 7. Update ticket with routing result & audit history
    await prisma.ticket.update({
      where: { id: ticketId },
      data: {
        teamId: result.teamId,
        queueId: result.queueId,
        assignedToId: result.assigneeId || ticket.assignedToId,
        routedAt: new Date(),
        routedByRule: result.ruleName,
        isAutoRouted: result.isAutoRouted,
        routingLog: {
          decisionPath: decisionPath as any,
          logs: log,
          timestamp: new Date().toISOString(),
        } as any,
      },
    });

    // 8. Create transparent internal routing note for IT team & assigned agent (Internal only, invisible to normal user)
    if (result.teamName || result.assigneeName) {
      const company = decisionPath.company || 'Đơn vị thành viên';
      const location = decisionPath.location || 'Địa bàn chung';
      const noteLines = [
        `🤖 [TỰ ĐỘNG PHÂN TUYẾN IT]:`,
        `• Nhân sự tạo yêu cầu: ${(ticket as any).createdBy?.fullName || (ticket as any).requester?.fullName || 'Người dùng'} (${(ticket as any).createdBy?.department || (ticket as any).requester?.department || 'Phòng ban'})`,
        `• Công ty / Đơn vị: ${company}`,
        `• Nơi làm việc / Địa điểm: ${location}`,
        `• Team IT tiếp nhận: ${result.teamName || 'IT Support'}`,
        result.assigneeName
          ? `• Kỹ thuật viên phụ trách: [${result.assigneeName}]`
          : `• Phân bổ: Chuyển vào Hàng đợi chung của Team (Toàn bộ thành viên trong Team cùng nhận và xử lý)`,
        `• Căn cứ quy tắc: ${result.ruleName || 'Ma trận phân vùng IT phụ trách'}.`,
      ];

      const authorId = ticket.createdById;
      if (authorId) {
        await prisma.ticketComment.create({
          data: {
            ticketId,
            userId: authorId,
            content: noteLines.join('\n'),
            isInternal: true,
          },
        }).catch(() => {});
      }
    }

    log.push('🏁 Hoàn tất phân tuyến tự động thành công.');
    return result;
  } catch (error) {
    log.push(`❌ Lỗi phân tuyến: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return result;
  }
}

/**
 * Find the best available team member based on skills, company/location scope, and workload
 */
async function findBestAssignee(
  teamId: string,
  context: TicketContext
): Promise<{ userId: string; userName: string; openTickets: number; skillScore: number } | null> {
  const members = await prisma.teamMember.findMany({
    where: {
      teamId,
      isAvailable: true,
      user: { isActive: true },
    },
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          assignedTickets: {
            where: {
              status: { in: ['OPEN', 'IN_PROGRESS', 'WAITING'] },
            },
            select: { id: true },
          },
        },
      },
    },
  });

  if (members.length === 0) return null;

  const scored = members.map((member) => {
    const openTickets = member.user.assignedTickets.length;
    const isUnderLimit = openTickets < member.maxTickets;

    let skillScore = 50; // default baseline

    // Skill Match
    const searchTerms = [context.category, context.subCategory, context.title].filter(Boolean).map((s) => s!.toLowerCase());

    const hasPrimaryMatch = member.primarySkills.some((ps) =>
      searchTerms.some((term) => term.includes(ps.toLowerCase()) || ps.toLowerCase().includes(term))
    );
    const hasSecondaryMatch = member.secondarySkills.some((ss) =>
      searchTerms.some((term) => term.includes(ss.toLowerCase()) || ss.toLowerCase().includes(term))
    );

    if (hasPrimaryMatch) skillScore -= 40; // High bonus
    else if (hasSecondaryMatch) skillScore -= 20; // Medium bonus

    // Location / Company Scope Bonus (Strong affinity for local territory IT manager)
    if (context.userLocation && member.supportedLocations.some((loc) => loc.toLowerCase().includes(context.userLocation!.toLowerCase()))) {
      skillScore -= 35; // Strong territory bonus
    }
    if (context.companyName && member.supportedCompanies.some((comp) => comp.toLowerCase().includes(context.companyName!.toLowerCase()))) {
      skillScore -= 35; // Strong company bonus
    }

    // Workload Penalty
    const workloadScore = openTickets * 10;

    const totalScore = isUnderLimit ? skillScore + workloadScore : 9999;

    return {
      userId: member.user.id,
      userName: member.user.fullName,
      openTickets,
      skillScore,
      isUnderLimit,
      totalScore,
    };
  });

  scored.sort((a, b) => a.totalScore - b.totalScore);
  const best = scored[0];

  if (!best || !best.isUnderLimit) return null;

  return {
    userId: best.userId,
    userName: best.userName,
    openTickets: best.openTickets,
    skillScore: best.skillScore,
  };
}

/**
 * Manual override handler with audit trail
 */
export async function overrideTicketRouting(
  ticketId: string,
  newTeamId: string | null,
  newQueueId: string | null,
  newAssigneeId: string | null,
  reason: string,
  managerId: string
) {
  const current = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: {
      team: { select: { name: true } },
      queue: { select: { name: true } },
      assignedTo: { select: { fullName: true } },
    },
  });

  if (!current) throw new Error('Ticket not found');

  const prevLog = (current.routingLog as any)?.logs || [];
  const newLog = [
    ...prevLog,
    `✍️ [${new Date().toLocaleString('vi-VN')}] Điều chuyển thủ công bởi Quản lý: Chuyển sang Team [${newTeamId || 'N/A'}], Queue [${newQueueId || 'N/A'}], Assignee [${newAssigneeId || 'N/A'}]. Lý do: ${reason}`,
  ];

  const updated = await prisma.ticket.update({
    where: { id: ticketId },
    data: {
      teamId: newTeamId,
      queueId: newQueueId,
      assignedToId: newAssigneeId,
      isAutoRouted: false,
      reassignmentCount: current.reassignmentCount + 1,
      overrideReason: reason,
      overriddenById: managerId,
      routingLog: {
        ...(current.routingLog as any),
        logs: newLog,
        lastOverride: {
          managerId,
          reason,
          timestamp: new Date().toISOString(),
        },
      },
    },
  });

  return updated;
}

/**
 * Test routing simulation for admin preview
 */
export async function testRouting(context: TicketContext): Promise<{
  matchedRule: string | null;
  teamName: string | null;
  queueName: string | null;
  assigneeName: string | null;
  log: string[];
}> {
  const log: string[] = [];

  const rules = await prisma.routingRule.findMany({
    where: { isActive: true },
    orderBy: { priority: 'asc' },
    include: {
      targetTeam: { select: { name: true } },
    },
  });

  for (const rule of rules) {
    const conditions = rule.conditions as any[];
    if (!Array.isArray(conditions) || conditions.length === 0) continue;

    const allMatch = conditions.every((cond) => evaluateCondition(cond, context));
    if (allMatch) {
      log.push(`✅ Khớp Rule [Ưu tiên #${rule.priority}]: "${rule.name}" → Team đích: ${rule.targetTeam.name}`);
      return {
        matchedRule: rule.name,
        teamName: rule.targetTeam.name,
        queueName: null,
        assigneeName: null,
        log,
      };
    } else {
      log.push(`⏩ Bỏ qua Rule: "${rule.name}"`);
    }
  }

  log.push('⚠️ Không có Rule nào khớp — sẽ rơi vào Default Helpdesk Queue');
  return { matchedRule: null, teamName: null, queueName: null, assigneeName: null, log };
}
