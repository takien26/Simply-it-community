import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { sendEmail } from '@/lib/email';

const STATUS_LABELS: Record<string, string> = {
  OPEN: 'Mới mở',
  IN_PROGRESS: 'Đang xử lý',
  WAITING: 'Chờ phản hồi',
  RESOLVED: 'Đã giải quyết',
  CLOSED: 'Đã đóng',
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const ticket = await prisma.ticket.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: { id: true, fullName: true, email: true, department: true, avatarUrl: true },
        },
        assignedTo: {
          select: { id: true, fullName: true, email: true, department: true, avatarUrl: true },
        },
        team: {
          select: { id: true, name: true, code: true },
        },
        queue: {
          select: { id: true, name: true, code: true },
        },
        asset: {
          select: { id: true, assetTag: true, name: true, status: true, brand: true, model: true },
        },
        comments: {
          orderBy: { createdAt: 'asc' },
          include: {
            user: { select: { id: true, fullName: true, email: true, avatarUrl: true, role: true } },
          },
        },
      },
    });

    if (!ticket) {
      return NextResponse.json({ error: 'Không tìm thấy ticket' }, { status: 404 });
    }

    return NextResponse.json(ticket);
  } catch (error) {
    console.error('Get ticket error:', error);
    return NextResponse.json({ error: 'Failed to fetch ticket' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { status, priority, category, assignedToId, teamId, queueId, dueDate, resolutionNotes } = body;

    const currentTicket = await prisma.ticket.findUnique({
      where: { id },
      include: {
        assignedTo: { select: { id: true, fullName: true } },
      },
    });

    if (!currentTicket) {
      return NextResponse.json({ error: 'Ticket không tồn tại' }, { status: 404 });
    }

    const data: any = {};
    const historyLogs: string[] = [];

    // Handle SLA Pause / Resume & Resolution Date when status changes
    if (status !== undefined && status !== currentTicket.status) {
      data.status = status;
      const oldStatusLabel = STATUS_LABELS[currentTicket.status] || currentTicket.status;
      const newStatusLabel = STATUS_LABELS[status] || status;

      if (status === 'RESOLVED' || status === 'CLOSED') {
        const resolveTime = new Date();
        data.resolvedAt = resolveTime;

        // Determine if resolved on time or overdue
        let isOverdue = false;
        if (currentTicket.slaDeadline) {
          isOverdue = resolveTime.getTime() > new Date(currentTicket.slaDeadline).getTime();
        } else {
          // Default 48h if no deadline specified
          const defaultDeadline = new Date(new Date(currentTicket.createdAt).getTime() + 48 * 3600 * 1000);
          isOverdue = resolveTime.getTime() > defaultDeadline.getTime();
        }

        const slaNote = isOverdue ? '⚠️ (Quá hạn SLA)' : '✅ (Đúng hạn SLA)';
        historyLogs.push(
          `🔄 Đã chuyển trạng thái từ "${oldStatusLabel}" sang "${newStatusLabel}" ${slaNote}.`
        );
      } else {
        // If reopening from resolved/closed to active status
        if (currentTicket.status === 'RESOLVED' || currentTicket.status === 'CLOSED') {
          data.resolvedAt = null;
        }
        historyLogs.push(
          `🔄 Đã chuyển trạng thái từ "${oldStatusLabel}" sang "${newStatusLabel}".`
        );
      }

      // If transitioning to WAITING status -> Pause SLA
      if (status === 'WAITING' && currentTicket.status !== 'WAITING') {
        data.slaPausedAt = new Date();
      }
      // If transitioning from WAITING back to active status -> Resume & Compensate SLA
      else if (status !== 'WAITING' && currentTicket.status === 'WAITING' && currentTicket.slaPausedAt) {
        const pausedMs = Date.now() - new Date(currentTicket.slaPausedAt).getTime();
        const pausedMinutes = Math.max(1, Math.round(pausedMs / (60 * 1000)));
        data.totalSlaPausedMinutes = (currentTicket.totalSlaPausedMinutes || 0) + pausedMinutes;
        data.slaPausedAt = null;

        if (currentTicket.slaDeadline) {
          data.slaDeadline = new Date(new Date(currentTicket.slaDeadline).getTime() + pausedMs);
        }
      }
    }

    // Handle Assignee change log
    if (assignedToId !== undefined && assignedToId !== currentTicket.assignedToId) {
      data.assignedToId = assignedToId || null;
      if (assignedToId) {
        const newAssignee = await prisma.user.findUnique({
          where: { id: assignedToId },
          select: { fullName: true },
        });
        historyLogs.push(`👨‍💻 Đã phân công cho IT: ${newAssignee?.fullName || 'Nhân viên IT'}.`);
      } else {
        historyLogs.push('👨‍💻 Đã hủy phân công IT.');
      }
    }

    if (priority !== undefined) data.priority = priority;
    if (category !== undefined) data.category = category;
    if (teamId !== undefined) data.teamId = teamId || null;
    if (queueId !== undefined) data.queueId = queueId || null;
    if (dueDate !== undefined) data.dueDate = dueDate ? new Date(dueDate) : null;
    if (resolutionNotes !== undefined) data.resolutionNotes = resolutionNotes;

    // Record system comments for history
    for (const logContent of historyLogs) {
      await prisma.ticketComment.create({
        data: {
          ticketId: id,
          userId: currentUser.userId,
          content: logContent,
          isInternal: false,
        },
      });
    }

    const updated = await prisma.ticket.update({
      where: { id },
      data,
      include: {
        createdBy: {
          select: { id: true, fullName: true, email: true, department: true, avatarUrl: true },
        },
        assignedTo: {
          select: { id: true, fullName: true, email: true, department: true, avatarUrl: true },
        },
        team: {
          select: { id: true, name: true, code: true },
        },
        queue: {
          select: { id: true, name: true, code: true },
        },
        asset: {
          select: { id: true, assetTag: true, name: true, status: true },
        },
        comments: {
          orderBy: { createdAt: 'asc' },
          include: {
            user: { select: { id: true, fullName: true, email: true, avatarUrl: true, role: true } },
          },
        },
      },
    });

    // If ticket was just resolved/closed, notify creator
    if (
      (status === 'RESOLVED' || status === 'CLOSED') &&
      currentTicket.status !== 'RESOLVED' &&
      currentTicket.status !== 'CLOSED'
    ) {
      if (updated.createdBy?.email) {
        (async () => {
          try {
            const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
            await sendEmail({
              to: updated.createdBy.email,
              templateCode: 'ticket.resolved',
              data: {
                ticketNumber: updated.ticketNumber,
                title: updated.title,
                creatorName: updated.createdBy.fullName,
                assigneeName: updated.assignedTo?.fullName || 'Bộ phận kỹ thuật IT',
                link: `${appUrl}/tickets?id=${updated.id}`,
              },
            });
          } catch (e) {
            console.error('Failed to send ticket.resolved email:', e);
          }
        })();
      }
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Update ticket error:', error);
    return NextResponse.json({ error: 'Failed to update ticket' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    await prisma.ticket.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: 'Đã xóa ticket thành công' });
  } catch (error) {
    console.error('Delete ticket error:', error);
    return NextResponse.json({ error: 'Failed to delete ticket' }, { status: 500 });
  }
}
