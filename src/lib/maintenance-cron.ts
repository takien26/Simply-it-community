import { prisma } from './db';
import { MaintenanceFrequency, TicketPriority, TicketCategory } from '@prisma/client';
import { sendEmail } from './email';

export interface ScheduleConfig {
  repeatMode?: 'EVERY_DAY' | 'WEEKDAYS' | 'SELECTED_DAYS' | 'MONTHLY_DAY';
  selectedDays?: number[]; // 0 = Chủ nhật, 1 = Thứ 2, 2 = Thứ 3, 3 = Thứ 4, 4 = Thứ 5, 5 = Thứ 6, 6 = Thứ 7
  monthlyDay?: number; // 1 - 31
  runTime?: string; // "08:00"
}

export function parseScheduleConfig(description?: string | null): {
  cleanDesc: string;
  config: ScheduleConfig | null;
} {
  if (!description) return { cleanDesc: '', config: null };
  const match = description.match(/<!--SCHEDULE_CONFIG:(.+?)-->/s);
  if (match) {
    try {
      const config: ScheduleConfig = JSON.parse(match[1]);
      const cleanDesc = description.replace(/<!--SCHEDULE_CONFIG:.+?-->/s, '').trim();
      return { cleanDesc, config };
    } catch {
      return { cleanDesc: description, config: null };
    }
  }
  return { cleanDesc: description, config: null };
}

export function encodeScheduleConfig(cleanDesc: string, config?: ScheduleConfig | null): string {
  if (!config) return cleanDesc;
  const tag = `<!--SCHEDULE_CONFIG:${JSON.stringify(config)}-->`;
  return cleanDesc ? `${tag}\n${cleanDesc}` : tag;
}

export function calculateNextRunDate(
  fromDate: Date,
  frequency: MaintenanceFrequency,
  config?: ScheduleConfig | null
): Date {
  const next = new Date(fromDate);

  // Parse target run time (HH:mm)
  let hour = 8;
  let minute = 0;
  if (config?.runTime && config.runTime.includes(':')) {
    const [h, m] = config.runTime.split(':').map((v) => parseInt(v, 10));
    if (!isNaN(h) && !isNaN(m)) {
      hour = h;
      minute = m;
    }
  }

  const isCandidateLater = (cand: Date): boolean => cand.getTime() > fromDate.getTime();

  // 1. WEEKLY or DAILY with specific selectedDays (Veeam style)
  const hasSpecificDays =
    (frequency === 'WEEKLY' && config?.selectedDays && config.selectedDays.length > 0) ||
    (frequency === 'DAILY' && config?.repeatMode === 'SELECTED_DAYS' && config?.selectedDays && config.selectedDays.length > 0);

  if (hasSpecificDays && config?.selectedDays) {
    for (let i = 0; i <= 14; i++) {
      const candidate = new Date(fromDate);
      candidate.setDate(candidate.getDate() + i);
      candidate.setHours(hour, minute, 0, 0);
      if (isCandidateLater(candidate) && config.selectedDays.includes(candidate.getDay())) {
        return candidate;
      }
    }
  }

  // 2. DAILY with WEEKDAYS (Monday - Friday)
  if (frequency === 'DAILY' && config?.repeatMode === 'WEEKDAYS') {
    for (let i = 0; i <= 7; i++) {
      const candidate = new Date(fromDate);
      candidate.setDate(candidate.getDate() + i);
      candidate.setHours(hour, minute, 0, 0);
      const day = candidate.getDay();
      if (isCandidateLater(candidate) && day >= 1 && day <= 5) {
        return candidate;
      }
    }
  }

  // 3. MONTHLY with specific day of month
  if (frequency === 'MONTHLY' && config?.monthlyDay) {
    const candidateThisMonth = new Date(fromDate);
    candidateThisMonth.setDate(Math.min(config.monthlyDay, 28));
    candidateThisMonth.setHours(hour, minute, 0, 0);
    if (isCandidateLater(candidateThisMonth)) {
      return candidateThisMonth;
    }
    const candidateNextMonth = new Date(fromDate);
    candidateNextMonth.setMonth(candidateNextMonth.getMonth() + 1);
    candidateNextMonth.setDate(Math.min(config.monthlyDay, 28));
    candidateNextMonth.setHours(hour, minute, 0, 0);
    return candidateNextMonth;
  }

  // Standard fallback
  switch (frequency) {
    case 'DAILY':
      next.setDate(next.getDate() + 1);
      break;
    case 'WEEKLY':
      next.setDate(next.getDate() + 7);
      break;
    case 'MONTHLY':
      next.setMonth(next.getMonth() + 1);
      break;
    case 'QUARTERLY':
      next.setMonth(next.getMonth() + 3);
      break;
    case 'SEMI_ANNUAL':
      next.setMonth(next.getMonth() + 6);
      break;
    case 'ANNUAL':
      next.setFullYear(next.getFullYear() + 1);
      break;
  }
  next.setHours(hour, minute, 0, 0);
  return next;
}

export async function runMaintenanceSchedulesCron(): Promise<{
  processedCount: number;
  ticketsCreated: number;
  errors: string[];
}> {
  const now = new Date();
  const errors: string[] = [];
  let processedCount = 0;
  let ticketsCreated = 0;

  try {
    // 1. Fetch all active schedules that are due
    const dueSchedules = await prisma.maintenanceSchedule.findMany({
      where: {
        isActive: true,
        nextRunAt: { lte: now },
      },
      include: {
        asset: { select: { id: true, assetTag: true, name: true } },
        category: { select: { id: true, name: true } },
        assignTo: { select: { id: true, fullName: true, email: true } },
      },
    });

    if (dueSchedules.length === 0) {
      return { processedCount: 0, ticketsCreated: 0, errors: [] };
    }

    // Default system user for auto-created tickets
    const adminUser = await prisma.user.findFirst({
      where: {
        OR: [
          { role: { name: { in: ['Admin', 'Asset Manager', 'IT Admin'] } } },
          { email: 'admin@company.com' },
        ],
      },
      orderBy: { createdAt: 'asc' },
    });

    const currentYear = now.getFullYear();

    for (const schedule of dueSchedules) {
      processedCount++;
      try {
        if (schedule.autoCreateTicket && adminUser) {
          const totalTickets = await prisma.ticket.count();
          const ticketNumber = `TK-${currentYear}-${String(totalTickets + 1).padStart(4, '0')}`;

          const targetName = schedule.asset
            ? `[${schedule.asset.assetTag}] ${schedule.asset.name}`
            : schedule.category
            ? `Danh mục: ${schedule.category.name}`
            : 'Toàn bộ thiết bị';

          const ticketTitle = `[BẢO TRÌ ĐỊNH KỲ] ${schedule.name} - ${targetName}`;
          const ticketDesc = `🔧 [TỰ ĐỘNG TẠO TỪ LỊCH BẢO TRÌ ĐỊNH KỲ]
Lịch bảo trì: ${schedule.name}
Tần suất: ${schedule.frequency}
Loại hình: ${schedule.maintenanceType}
Mục tiêu: ${targetName}
${schedule.description ? 'Mô tả công việc:\n' + schedule.description : ''}`;

          const slaHours = schedule.ticketPriority === 'URGENT' ? 4 : schedule.ticketPriority === 'HIGH' ? 8 : 48;
          const slaDeadline = new Date(Date.now() + slaHours * 60 * 60 * 1000);

          const ticket = await prisma.ticket.create({
            data: {
              ticketNumber,
              title: ticketTitle,
              description: ticketDesc,
              category: 'HARDWARE',
              priority: schedule.ticketPriority,
              status: 'OPEN',
              createdById: adminUser.id,
              assignedToId: schedule.assignToId || null,
              assetId: schedule.assetId || null,
              slaDeadline,
            },
          });

          ticketsCreated++;

          // Send notification email to assigned technician
          if (schedule.assignTo?.email) {
            sendEmail({
              to: schedule.assignTo.email,
              templateCode: 'ticket.assigned',
              data: {
                ticketNumber: ticket.ticketNumber,
                title: ticket.title,
                priority: ticket.priority,
                creatorName: 'Hệ thống Lịch Bảo Trì Tự Động',
                assigneeName: schedule.assignTo.fullName,
                slaDeadline: slaDeadline.toLocaleString('vi-VN'),
              },
            }).catch(() => {});
          }
        }

        // Advance nextRunAt using smart Veeam-style schedule config if present
        const { config } = parseScheduleConfig(schedule.description);
        const nextDate = calculateNextRunDate(schedule.nextRunAt, schedule.frequency, config);
        await prisma.maintenanceSchedule.update({
          where: { id: schedule.id },
          data: {
            lastRunAt: now,
            nextRunAt: nextDate,
          },
        });
      } catch (err: any) {
        errors.push(`Schedule ${schedule.name} error: ${err.message}`);
      }
    }

    return { processedCount, ticketsCreated, errors };
  } catch (error: any) {
    return { processedCount, ticketsCreated, errors: [error.message] };
  }
}
