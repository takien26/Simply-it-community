import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';

const notifCache = new Map<string, { timestamp: number; data: any }>();
const CACHE_TTL_MS = 15 * 1000; // 15 seconds cache

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    }

    const lang = req.nextUrl.searchParams.get('lang') || 'vi';
    const isEn = lang === 'en';
    const cacheKey = `${user.userId}_${lang}`;
    const cached = notifCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return NextResponse.json(cached.data);
    }

    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(now.getDate() + 30);

    const isAdmin = user.roleName === 'Admin' || user.roleName?.toLowerCase().includes('admin');
    const isManager = user.roleName === 'Asset Manager' || user.roleName?.toLowerCase().includes('manager');
    const isManagementRole = isAdmin || isManager;

    // 1. Expiring Licenses (For Management: all; For Staff: only licenses assigned to user)
    const expiringLicenses = await prisma.license.findMany({
      where: {
        expiryDate: {
          not: null,
          lte: thirtyDaysFromNow,
        },
        ...(isManagementRole
          ? {}
          : {
              assignments: {
                some: { userId: user.userId, revokedAt: null },
              },
            }),
      },
      select: {
        id: true,
        name: true,
        expiryDate: true,
        status: true,
        totalSeats: true,
        usedSeats: true,
        vendor: { select: { name: true } },
      },
      orderBy: { expiryDate: 'asc' },
      take: 15,
    });

    // 2. Expiring IT Services (Only for Management roles)
    const expiringServices = isManagementRole
      ? await prisma.iTService.findMany({
          where: {
            renewalDate: {
              not: null,
              lte: thirtyDaysFromNow,
            },
          },
          select: {
            id: true,
            name: true,
            serviceCode: true,
            renewalDate: true,
            status: true,
            cost: true,
            vendor: { select: { name: true } },
            updatedAt: true,
            createdAt: true,
          },
          orderBy: { renewalDate: 'asc' },
          take: 15,
        })
      : [];

    // 3. Expiring Asset Warranties
    const expiringWarranties = await prisma.asset.findMany({
      where: {
        status: { not: 'RETIRED' },
        warrantyExpiry: {
          not: null,
          lte: thirtyDaysFromNow,
        },
        ...(isManagementRole
          ? {}
          : {
              assignments: {
                some: { userId: user.userId, returnedAt: null },
              },
            }),
      },
      select: {
        id: true,
        assetTag: true,
        name: true,
        brand: true,
        model: true,
        warrantyExpiry: true,
        assignments: {
          where: { returnedAt: null },
          select: { user: { select: { fullName: true } } },
          take: 1,
        },
      },
      orderBy: { warrantyExpiry: 'asc' },
      take: 15,
    });

    // 4. Open Tickets (For Management: all pending; For Staff: only tickets created by or assigned to user)
    const pendingTickets = await prisma.ticket.findMany({
      where: {
        status: { in: ['OPEN', 'IN_PROGRESS', 'WAITING'] },
        ...(isManagementRole
          ? {}
          : {
              OR: [
                { createdById: user.userId },
                { assignedToId: user.userId },
              ],
            }),
      },
      select: {
        id: true,
        ticketNumber: true,
        title: true,
        priority: true,
        status: true,
        assignedToId: true,
        createdById: true,
        dueDate: true,
        createdAt: true,
        createdBy: { select: { id: true, fullName: true, department: true } },
        assignedTo: { select: { id: true, fullName: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });

    const notifications: any[] = [];

    // Fetch dynamic SLA settings
    const slaSettings = await prisma.systemSetting.findMany({
      where: { key: { in: ['sla.urgent_hours', 'sla.high_hours', 'sla.medium_hours', 'sla.low_hours'] } },
    });
    const urgentHours = Number(slaSettings.find((s) => s.key === 'sla.urgent_hours')?.value || 4);
    const highHours = Number(slaSettings.find((s) => s.key === 'sla.high_hours')?.value || 24);
    const mediumHours = Number(slaSettings.find((s) => s.key === 'sla.medium_hours')?.value || 48);
    const lowHours = Number(slaSettings.find((s) => s.key === 'sla.low_hours')?.value || 72);

    // Format Tickets & SLA Overdue Alerts
    pendingTickets.forEach((t) => {
      const isAssignedToMe = t.assignedToId === user.userId;
      const isCreatedByMe = t.createdById === user.userId;
      const isUnassigned = !t.assignedToId;

      let slaHours = mediumHours;
      if (t.priority === 'URGENT') slaHours = urgentHours;
      else if (t.priority === 'HIGH') slaHours = highHours;
      else if (t.priority === 'MEDIUM') slaHours = mediumHours;
      else if (t.priority === 'LOW') slaHours = lowHours;

      const deadline = new Date(new Date(t.createdAt).getTime() + slaHours * 60 * 60 * 1000);
      const diffMs = deadline.getTime() - now.getTime();
      const isOverdue = diffMs < 0;
      const overdueHours = Math.abs(Math.round(diffMs / (1000 * 60 * 60)));

      if (isOverdue && (isAssignedToMe || isManagementRole)) {
        notifications.push({
          id: `overdue-${t.id}`,
          ticketId: t.id,
          ticketNumber: t.ticketNumber,
          type: 'TICKET',
          severity: 'CRITICAL',
          title: isEn ? `🚨 Ticket #${t.ticketNumber} OVERDUE (SLA)` : `🚨 Ticket #${t.ticketNumber} ĐÃ QUÁ HẠN XỬ LÝ (SLA)`,
          message: isEn ? `Ticket "${t.title}" is overdue by ${overdueHours === 0 ? 'almost 1' : overdueHours} hour(s)! ${t.assignedTo ? 'IT Assignee: ' + t.assignedTo.fullName : 'Unassigned IT'}.` : `Ticket "${t.title}" đã quá hạn xử lý ${overdueHours === 0 ? 'gần 1' : overdueHours} giờ! ${t.assignedTo ? 'IT phụ trách: ' + t.assignedTo.fullName : 'Chưa phân công IT'}.`,
          detail: isEn ? `Priority: ${t.priority === 'URGENT' ? 'Urgent (4h)' : t.priority === 'HIGH' ? 'High (24h)' : 'Standard'} • Requester: ${t.createdBy.fullName}` : `Mức độ: ${t.priority === 'URGENT' ? 'Khẩn cấp (4h)' : t.priority === 'HIGH' ? 'Cao (24h)' : 'Quy chuẩn'} • Người gửi: ${t.createdBy.fullName}`,
          link: `/tickets?search=${encodeURIComponent(t.ticketNumber)}&id=${t.id}`,
          createdAt: deadline.toISOString(),
          isOverdue: true,
        });
      } else if (isAssignedToMe) {
        notifications.push({
          id: `ticket-${t.id}`,
          ticketId: t.id,
          ticketNumber: t.ticketNumber,
          type: 'TICKET',
          severity: t.priority === 'URGENT' ? 'CRITICAL' : t.priority === 'HIGH' ? 'WARNING' : 'INFO',
          title: isEn ? `Ticket #${t.ticketNumber} assigned to you` : `Ticket #${t.ticketNumber} bạn đang phụ trách`,
          message: isEn ? `"${t.title}" from ${t.createdBy.fullName} (${t.createdBy.department || 'Employee'}).` : `"${t.title}" từ ${t.createdBy.fullName} (${t.createdBy.department || 'Nhân viên'}).`,
          detail: isEn ? `Status: ${t.status === 'OPEN' ? 'Open' : t.status === 'IN_PROGRESS' ? 'In Progress' : 'Pending Response'}` : `Trạng thái: ${t.status === 'OPEN' ? 'Mới mở' : t.status === 'IN_PROGRESS' ? 'Đang xử lý' : 'Chờ phản hồi'}`,
          link: `/tickets?search=${encodeURIComponent(t.ticketNumber)}&id=${t.id}`,
          createdAt: t.createdAt,
        });
      } else if (isCreatedByMe) {
        notifications.push({
          id: `ticket-${t.id}`,
          ticketId: t.id,
          ticketNumber: t.ticketNumber,
          type: 'TICKET',
          severity: 'INFO',
          title: isEn ? `Your request: #${t.ticketNumber}` : `Yêu cầu của bạn: #${t.ticketNumber}`,
          message: isEn ? `"${t.title}" - Status: ${t.status === 'OPEN' ? 'Open' : t.status === 'IN_PROGRESS' ? 'In Progress' : 'Pending Response'}` : `"${t.title}" - Trạng thái: ${t.status === 'OPEN' ? 'Mới mở' : t.status === 'IN_PROGRESS' ? 'Đang xử lý' : 'Chờ phản hồi'}`,
          detail: isEn ? `IT Assignee: ${t.assignedTo?.fullName || 'Pending assignment'}` : `IT phụ trách: ${t.assignedTo?.fullName || 'Đang chờ phân công'}`,
          link: `/tickets?search=${encodeURIComponent(t.ticketNumber)}&id=${t.id}`,
          createdAt: t.createdAt,
        });
      } else if (isManagementRole) {
        notifications.push({
          id: `ticket-${t.id}`,
          ticketId: t.id,
          ticketNumber: t.ticketNumber,
          type: 'TICKET',
          severity: t.priority === 'URGENT' ? 'CRITICAL' : t.priority === 'HIGH' ? 'WARNING' : 'INFO',
          title: isUnassigned
            ? (isEn ? `New unassigned ticket: #${t.ticketNumber}` : `Ticket mới chờ nhận: #${t.ticketNumber}`)
            : `Ticket #${t.ticketNumber} (${t.assignedTo?.fullName || 'IT'})`,
          message: isEn ? `"${t.title}" from ${t.createdBy.fullName} (${t.createdBy.department || 'Employee'}).` : `"${t.title}" từ ${t.createdBy.fullName} (${t.createdBy.department || 'Nhân viên'}).`,
          detail: isEn ? `Status: ${t.status === 'OPEN' ? 'Open' : t.status === 'IN_PROGRESS' ? 'In Progress' : 'Pending Response'}` : `Trạng thái: ${t.status === 'OPEN' ? 'Mới mở' : t.status === 'IN_PROGRESS' ? 'Đang xử lý' : 'Chờ phản hồi'}`,
          link: `/tickets?search=${encodeURIComponent(t.ticketNumber)}&id=${t.id}`,
          createdAt: t.createdAt,
          isUnassigned,
        });
      }
    });

    // Format Expiring IT Services
    expiringServices.forEach((s) => {
      const daysLeft = Math.ceil((new Date(s.renewalDate!).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      notifications.push({
        id: `service-${s.id}`,
        type: 'SERVICE',
        severity: daysLeft <= 7 ? 'CRITICAL' : daysLeft <= 15 ? 'WARNING' : 'INFO',
        title: isEn ? `🌐 Service [${s.serviceCode}] expiring soon` : `🌐 Dịch vụ [${s.serviceCode}] sắp đến hạn gia hạn`,
        message: isEn ? `Package "${s.name}" ${daysLeft <= 0 ? 'is due today!' : `expires in ${daysLeft} day(s)`}.` : `Gói "${s.name}" ${daysLeft <= 0 ? 'đã đến hạn hôm nay!' : `còn ${daysLeft} ngày là đến hạn gia hạn`}.`,
        detail: s.vendor?.name ? (isEn ? `Vendor: ${s.vendor.name}` : `Đối tác: ${s.vendor.name}`) : undefined,
        link: `/services`,
        createdAt: s.renewalDate!.toISOString(),
      });
    });

    // Format Expiring Licenses
    expiringLicenses.forEach((l) => {
      const daysLeft = Math.ceil((new Date(l.expiryDate!).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      notifications.push({
        id: `license-${l.id}`,
        type: 'LICENSE',
        severity: daysLeft <= 7 ? 'CRITICAL' : daysLeft <= 15 ? 'WARNING' : 'INFO',
        title: isEn ? `🔑 License "${l.name}" expiring soon` : `🔑 Bản quyền "${l.name}" sắp hết hạn`,
        message: isEn ? `License ${daysLeft <= 0 ? 'expired today!' : `expires in ${daysLeft} day(s)`}. Seats: ${l.usedSeats}/${l.totalSeats}.` : `License ${daysLeft <= 0 ? 'đã hết hạn!' : `sẽ hết hạn trong ${daysLeft} ngày`}. Số seats: ${l.usedSeats}/${l.totalSeats}.`,
        detail: l.vendor?.name ? (isEn ? `Vendor: ${l.vendor.name}` : `Đối tác: ${l.vendor.name}`) : undefined,
        link: `/licenses`,
        createdAt: l.expiryDate!.toISOString(),
      });
    });

    // Format Expiring Warranties
    expiringWarranties.forEach((w) => {
      const daysLeft = Math.ceil((new Date(w.warrantyExpiry!).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      notifications.push({
        id: `warranty-${w.id}`,
        type: 'WARRANTY',
        severity: daysLeft <= 7 ? 'CRITICAL' : 'WARNING',
        title: `💻 Thiết bị [${w.assetTag}] sắp hết bảo hành`,
        message: `${w.name} ${daysLeft <= 0 ? 'đã hết hạn bảo hành hôm nay' : `còn ${daysLeft} ngày là hết hạn bảo hành`}.`,
        detail: w.assignments[0]?.user ? `Đang cấp phát cho: ${w.assignments[0].user.fullName}` : 'Thiết bị trong kho',
        link: `/assets?search=${encodeURIComponent(w.assetTag)}`,
        createdAt: w.warrantyExpiry!.toISOString(),
      });
    });

    // 5. Escalation & Internal IT Assistance Comments
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(now.getDate() - 30);

    const escalationComments = await prisma.ticketComment.findMany({
      where: {
        isInternal: true,
        content: { contains: '[YÊU CẦU HỖ TRỢ NỘI BỘ IT]' },
        createdAt: { gte: thirtyDaysAgo },
      },
      include: {
        ticket: {
          select: {
            id: true,
            ticketNumber: true,
            title: true,
            priority: true,
            status: true,
            assignedToId: true,
          },
        },
        user: {
          select: {
            id: true,
            fullName: true,
            department: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    const userFullName = (await prisma.user.findUnique({
      where: { id: user.userId },
      select: { fullName: true, role: { select: { name: true } } },
    }))?.fullName || '';

    escalationComments.forEach((c) => {
      const isMentioned = userFullName && c.content.toLowerCase().includes(userFullName.toLowerCase());
      const isSender = c.user.id === user.userId;

      if ((isMentioned || user.roleName === 'Admin') && !isSender) {
        notifications.push({
          id: `escalate-${c.id}`,
          ticketId: c.ticket.id,
          ticketNumber: c.ticket.ticketNumber,
          type: 'ESCALATION',
          severity: 'CRITICAL',
          title: isEn ? `🚨 IT Assistance Request: #${c.ticket.ticketNumber}` : `🚨 Yêu cầu hỗ trợ IT: #${c.ticket.ticketNumber}`,
          message: isEn ? `${c.user.fullName} requested your assistance on ticket "${c.ticket.title}".` : `${c.user.fullName} nhờ bạn hỗ trợ xử lý ticket "${c.ticket.title}".`,
          detail: c.content.replace('🚨 [YÊU CẦU HỖ TRỢ NỘI BỘ IT]', '').trim(),
          link: `/tickets?search=${encodeURIComponent(c.ticket.ticketNumber)}&id=${c.ticket.id}`,
          createdAt: c.createdAt,
          isEscalation: true,
        });
      }
    });

    // Sort descending by date
    notifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const ticketsCount = pendingTickets.length;
    const licensesCount = expiringLicenses.length;
    const servicesCount = expiringServices.length;
    const warrantiesCount = expiringWarranties.length;
    const unassignedCount = pendingTickets.filter((t) => !t.assignedToId).length;
    const myTicketsCount = pendingTickets.filter((t) => t.assignedToId === user.userId).length;

    const responsePayload = {
      success: true,
      counts: {
        total: notifications.length,
        licenses: licensesCount,
        services: servicesCount,
        warranties: warrantiesCount,
        tickets: ticketsCount,
        unassignedTickets: unassignedCount,
        myTickets: myTicketsCount,
      },
      summary: {
        total: notifications.length,
        ticketsTotal: ticketsCount,
        licensesExpiring: licensesCount,
        servicesExpiring: servicesCount,
        warrantiesExpiring: warrantiesCount,
        unassignedTickets: unassignedCount,
        myTickets: myTicketsCount,
      },
      notifications,
    };

    notifCache.set(cacheKey, { timestamp: Date.now(), data: responsePayload });
    return NextResponse.json(responsePayload);
  } catch (error: any) {
    console.error('Notifications API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Lỗi khi tải thông báo',
        counts: { total: 0, licenses: 0, services: 0, warranties: 0, tickets: 0, unassignedTickets: 0, myTickets: 0 },
        summary: { total: 0, ticketsTotal: 0, licensesExpiring: 0, servicesExpiring: 0, warrantiesExpiring: 0, unassignedTickets: 0, myTickets: 0 },
        notifications: [],
      },
      { status: 500 }
    );
  }
}
