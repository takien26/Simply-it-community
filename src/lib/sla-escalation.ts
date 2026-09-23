import { prisma } from './db';
import { dispatchWebhookEvent } from './webhooks';

export interface SlaBreachRiskTicket {
  id: string;
  ticketNumber: string;
  title: string;
  category: string;
  priority: string;
  status: string;
  assignedTo: { id: string; fullName: string; email: string } | null;
  createdAt: string;
  slaDeadline: string;
  elapsedRatio: number;
  remainingMinutes: number;
  isUnassigned: boolean;
  escalationAction?: string;
}

/**
 * Quét toàn bộ ticket đang mở và phát hiện các ticket có nguy cơ vỡ SLA
 * Ngưỡng: Đã trôi qua >= 75% thời hạn SLA hoặc còn lại <= 60 phút
 */
export async function detectSlaBreachRisks(): Promise<SlaBreachRiskTicket[]> {
  const now = new Date();

  const tickets = await prisma.ticket.findMany({
    where: {
      status: { in: ['OPEN', 'IN_PROGRESS', 'WAITING'] },
      slaDeadline: { not: null },
    },
    include: {
      assignedTo: {
        select: { id: true, fullName: true, email: true },
      },
      createdBy: {
        select: { id: true, fullName: true, email: true },
      },
      team: {
        select: { id: true, name: true },
      },
    },
    orderBy: { slaDeadline: 'asc' },
  });

  const riskTickets: SlaBreachRiskTicket[] = [];

  for (const t of tickets) {
    if (!t.slaDeadline) continue;
    const deadline = new Date(t.slaDeadline);
    const createdAt = new Date(t.createdAt);
    const totalDuration = Math.max(1, deadline.getTime() - createdAt.getTime());
    const elapsed = Math.max(0, now.getTime() - createdAt.getTime());
    const elapsedRatio = Math.min(2.0, elapsed / totalDuration);
    const remainingMs = deadline.getTime() - now.getTime();
    const remainingMinutes = Math.round(remainingMs / (60 * 1000));

    // Ngưỡng rủi ro vỡ SLA: Đã dùng >= 75% thời gian hoặc còn dưới 60 phút
    if (elapsedRatio >= 0.75 || remainingMinutes <= 60) {
      riskTickets.push({
        id: t.id,
        ticketNumber: t.ticketNumber,
        title: t.title,
        category: t.category,
        priority: t.priority,
        status: t.status,
        assignedTo: t.assignedTo,
        createdAt: t.createdAt.toISOString(),
        slaDeadline: t.slaDeadline.toISOString(),
        elapsedRatio: Math.round(elapsedRatio * 100) / 100,
        remainingMinutes,
        isUnassigned: !t.assignedToId,
      });
    }
  }

  return riskTickets;
}

/**
 * Tự động điều phối và kích hoạt cảnh báo leo thang (Escalation) cho các ticket có nguy cơ vỡ SLA
 */
export async function processSlaEscalation(operatorUserId?: string) {
  const risks = await detectSlaBreachRisks();
  const escalatedItems: SlaBreachRiskTicket[] = [];

  for (const item of risks) {
    let actionTaken = '';

    // 1. Nếu ticket chưa có ai nhận việc (Unassigned) -> Tự động tìm KTV có ít việc nhất (Least Busy)
    if (item.isUnassigned) {
      // Tìm thành viên IT có số ticket đang mở ít nhất
      const candidate = await prisma.user.findFirst({
        where: {
          isActive: true,
          OR: [
            { role: { name: { in: ['Admin', 'Super Admin', 'IT Staff', 'Kỹ thuật viên', 'IT Support'] } } },
            { department: { in: ['IT', 'CNTT', 'Công Nghệ Thông Tin', 'Kỹ thuật'] } },
          ],
        },
        include: {
          assignedTickets: {
            where: { status: { in: ['OPEN', 'IN_PROGRESS', 'WAITING'] } },
            select: { id: true },
          },
        },
        orderBy: {
          assignedTickets: { _count: 'asc' },
        },
      });

      if (candidate) {
        await prisma.ticket.update({
          where: { id: item.id },
          data: {
            assignedToId: candidate.id,
            status: item.status === 'OPEN' ? 'IN_PROGRESS' : item.status as any,
            isAutoRouted: true,
          },
        });

        // Ghi comment hệ thống nội bộ
        const systemUserId = operatorUserId || candidate.id;
        await prisma.ticketComment.create({
          data: {
            ticketId: item.id,
            userId: systemUserId,
            isInternal: true,
            content: `⚡ [ĐIỀU PHỐI KHẨN CẤP VÌ NGUY CƠ VỠ SLA]
Hệ thống phát hiện ticket đã đạt ${Math.round(item.elapsedRatio * 100)}% thời hạn cam kết (còn ${item.remainingMinutes} phút) nhưng chưa có người tiếp nhận.
👉 Tự động phân công cho Kỹ thuật viên: ${candidate.fullName} (Đang xử lý ${candidate.assignedTickets.length} ticket).`,
          },
        }).catch(() => {});

        actionTaken = `Tự động gán cho ${candidate.fullName} (Least Busy)`;
        item.assignedTo = { id: candidate.id, fullName: candidate.fullName, email: candidate.email };
      }
    } else {
      actionTaken = `Cảnh báo leo thang tới KTV phụ trách: ${item.assignedTo?.fullName}`;
    }

    // 2. Bắn Webhook sự kiện cảnh báo leo thang khẩn cấp tới Telegram / Kênh thông báo
    await dispatchWebhookEvent('ticket.sla_escalation' as any, {
      ticketId: item.id,
      ticketNumber: item.ticketNumber,
      title: item.title,
      category: item.category,
      priority: item.priority,
      remainingMinutes: item.remainingMinutes,
      elapsedRatio: Math.round(item.elapsedRatio * 100),
      assignedTo: item.assignedTo?.fullName || 'Chưa gán (Đã kích hoạt điều phối tự động)',
      actionTaken,
    }).catch(() => {});

    escalatedItems.push({
      ...item,
      escalationAction: actionTaken,
    });
  }

  return {
    success: true,
    totalRisks: risks.length,
    escalatedCount: escalatedItems.length,
    items: escalatedItems,
  };
}
