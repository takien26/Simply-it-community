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
 * Tính toán thời hạn cam kết SLA (Deadline) theo giờ hành chính
 * Giờ làm việc: Thứ 2 - Thứ 6, từ 08:00 đến 17:30 (Nghỉ Thứ 7, CN)
 * Ngoại lệ: Ưu tiên Khẩn cấp (URGENT / P1) áp dụng 24/7
 */
export function calculateBusinessSlaDeadline(
  startDate: Date = new Date(),
  slaHours: number = 24,
  is24x7: boolean = false
): Date {
  if (is24x7) {
    return new Date(startDate.getTime() + slaHours * 3600 * 1000);
  }

  const START_HOUR = 8;
  const START_MIN = 0;
  const END_HOUR = 17;
  const END_MIN = 30;

  let remainingMinutes = Math.round(slaHours * 60);
  const cur = new Date(startDate);

  while (remainingMinutes > 0) {
    const day = cur.getDay(); // 0: CN, 6: T7
    const isWeekend = day === 0 || day === 6;

    if (isWeekend) {
      const daysToAdd = day === 0 ? 1 : 2;
      cur.setDate(cur.getDate() + daysToAdd);
      cur.setHours(START_HOUR, START_MIN, 0, 0);
      continue;
    }

    const currentMinutesOfDay = cur.getHours() * 60 + cur.getMinutes();
    const workStartMinutes = START_HOUR * 60 + START_MIN;
    const workEndMinutes = END_HOUR * 60 + END_MIN;

    if (currentMinutesOfDay < workStartMinutes) {
      cur.setHours(START_HOUR, START_MIN, 0, 0);
      continue;
    }

    if (currentMinutesOfDay >= workEndMinutes) {
      cur.setDate(cur.getDate() + 1);
      cur.setHours(START_HOUR, START_MIN, 0, 0);
      continue;
    }

    const availableMinutesToday = workEndMinutes - currentMinutesOfDay;
    if (remainingMinutes <= availableMinutesToday) {
      cur.setMinutes(cur.getMinutes() + remainingMinutes);
      remainingMinutes = 0;
    } else {
      remainingMinutes -= availableMinutesToday;
      cur.setDate(cur.getDate() + 1);
      cur.setHours(START_HOUR, START_MIN, 0, 0);
    }
  }

  return cur;
}

/**
 * Tính số phút làm việc hành chính (Business Minutes) giữa 2 thời điểm
 */
export function calculateBusinessMinutesElapsed(
  from: Date,
  to: Date,
  is24x7: boolean = false
): number {
  if (to <= from) return 0;
  if (is24x7) {
    return Math.round((to.getTime() - from.getTime()) / (60 * 1000));
  }

  const START_HOUR = 8;
  const START_MIN = 0;
  const END_HOUR = 17;
  const END_MIN = 30;

  let totalMinutes = 0;
  const cur = new Date(from);

  while (cur < to) {
    const day = cur.getDay();
    const isWeekend = day === 0 || day === 6;

    if (isWeekend) {
      cur.setDate(cur.getDate() + 1);
      cur.setHours(START_HOUR, START_MIN, 0, 0);
      continue;
    }

    const curYear = cur.getFullYear();
    const curMonth = cur.getMonth();
    const curDate = cur.getDate();

    const dayWorkStart = new Date(curYear, curMonth, curDate, START_HOUR, START_MIN, 0, 0);
    const dayWorkEnd = new Date(curYear, curMonth, curDate, END_HOUR, END_MIN, 0, 0);

    const segmentStart = cur > dayWorkStart ? cur : dayWorkStart;
    const dayEndLimit = to < dayWorkEnd ? to : dayWorkEnd;

    if (segmentStart < dayEndLimit) {
      totalMinutes += Math.round((dayEndLimit.getTime() - segmentStart.getTime()) / (60 * 1000));
    }

    cur.setDate(cur.getDate() + 1);
    cur.setHours(START_HOUR, START_MIN, 0, 0);
  }

  return totalMinutes;
}

/**
 * Quét toàn bộ ticket đang mở và phát hiện các ticket có nguy cơ vỡ SLA
 * - Bỏ qua ticket đang ở trạng thái WAITING (Đang chờ phản hồi từ người dùng -> Đóng băng SLA)
 * - Tính toán chính xác theo Giờ Làm Việc Hành Chính (trừ T7/CN và ngoài giờ) cho vé thường
 * - Ngưỡng: Đã trôi qua >= 75% thời hạn SLA hoặc còn lại <= 60 phút
 */
export async function detectSlaBreachRisks(): Promise<SlaBreachRiskTicket[]> {
  const now = new Date();

  // Chỉ quét ticket OPEN hoặc IN_PROGRESS (WAITING được freeze SLA)
  const tickets = await prisma.ticket.findMany({
    where: {
      status: { in: ['OPEN', 'IN_PROGRESS'] },
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
    const is24x7 = t.priority === 'URGENT';
    const deadline = new Date(t.slaDeadline);
    const createdAt = new Date(t.createdAt);

    // Tổng số phút SLA cam kết
    const totalBusinessMins = Math.max(
      1,
      calculateBusinessMinutesElapsed(createdAt, deadline, is24x7)
    );

    // Thời gian đã đóng băng trong quá khứ khi ở trạng thái WAITING
    const pastPausedMinutes = t.totalSlaPausedMinutes || 0;

    // Số phút đã trôi qua thực tế
    const rawElapsedMins = calculateBusinessMinutesElapsed(createdAt, now, is24x7);
    const effectiveElapsedMins = Math.max(0, rawElapsedMins - pastPausedMinutes);

    const elapsedRatio = Math.min(2.0, effectiveElapsedMins / totalBusinessMins);

    // Số phút còn lại
    let remainingMinutes: number;
    if (now >= deadline) {
      remainingMinutes = -Math.round((now.getTime() - deadline.getTime()) / (60 * 1000));
    } else {
      remainingMinutes = calculateBusinessMinutesElapsed(now, deadline, is24x7);
    }

    // Ngưỡng rủi ro vỡ SLA: Đã dùng >= 75% thời gian cam kết hoặc còn dưới 60 phút làm việc
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
            where: { status: { in: ['OPEN', 'IN_PROGRESS'] } },
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
Hệ thống phát hiện ticket đã đạt ${Math.round(item.elapsedRatio * 100)}% thời hạn cam kết (còn ${item.remainingMinutes} phút làm việc) nhưng chưa có người tiếp nhận.
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
