import { prisma } from './db';
import { MaintenanceFrequency, TicketPriority, TicketCategory } from '@prisma/client';
import { sendEmail } from './email';

export function calculateNextRunDate(fromDate: Date, frequency: MaintenanceFrequency): Date {
  const next = new Date(fromDate);
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

        // Advance nextRunAt
        const nextDate = calculateNextRunDate(schedule.nextRunAt, schedule.frequency);
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
