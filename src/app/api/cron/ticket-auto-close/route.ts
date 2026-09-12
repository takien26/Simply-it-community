import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const shouldRun = searchParams.get('run') === 'true';
    const dryRun = searchParams.get('dryRun') === 'true';

    // 1. Determine days threshold (Default 3 days)
    let autoCloseDays = 3;
    try {
      const setting = await prisma.systemSetting.findUnique({
        where: { key: 'ticket.auto_close_days' },
      });
      if (setting && setting.value) {
        const parsed = parseInt(setting.value, 10);
        if (!isNaN(parsed) && parsed > 0) autoCloseDays = parsed;
      }
    } catch {}

    const customDaysParam = searchParams.get('days');
    if (customDaysParam) {
      const p = parseInt(customDaysParam, 10);
      if (!isNaN(p) && p > 0) autoCloseDays = p;
    }

    const cutoffDate = new Date(Date.now() - autoCloseDays * 24 * 60 * 60 * 1000);

    // 2. Find eligible tickets (RESOLVED and resolvedAt <= cutoffDate)
    const eligibleTickets = await prisma.ticket.findMany({
      where: {
        status: 'RESOLVED',
        resolvedAt: {
          lte: cutoffDate,
        },
      },
      select: {
        id: true,
        ticketNumber: true,
        title: true,
        resolvedAt: true,
        createdById: true,
        assignedToId: true,
      },
    });

    if (!shouldRun || dryRun) {
      return NextResponse.json({
        success: true,
        dryRun: true,
        autoCloseDays,
        cutoffDate,
        eligibleCount: eligibleTickets.length,
        tickets: eligibleTickets,
      });
    }

    // 3. Perform Auto-Close
    let closedCount = 0;
    // Find or fallback system/first admin user for system comments
    let defaultAdminId: string | null = null;
    const admin = await prisma.user.findFirst({
      where: { role: { name: { contains: 'Admin', mode: 'insensitive' } } },
      select: { id: true },
    });
    defaultAdminId = admin?.id || null;

    for (const ticket of eligibleTickets) {
      await prisma.ticket.update({
        where: { id: ticket.id },
        data: {
          status: 'CLOSED',
        },
      });

      const authorId = ticket.assignedToId || ticket.createdById || defaultAdminId;
      if (authorId) {
        await prisma.ticketComment.create({
          data: {
            ticketId: ticket.id,
            userId: authorId,
            content: `🤖 [👑 Enterprise Auto-Close]: Ticket đã được hệ thống tự động đóng sau ${autoCloseDays} ngày ở trạng thái "Đã giải quyết" do không có phản hồi thêm từ người yêu cầu.`,
            isInternal: false,
          },
        });
      }

      closedCount++;
    }

    return NextResponse.json({
      success: true,
      autoCloseDays,
      closedCount,
      message: `Đã tự động đóng thành công ${closedCount} ticket treo quá ${autoCloseDays} ngày.`,
    });
  } catch (error: any) {
    console.error('Auto close tickets cron error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Lỗi khi tự động đóng ticket' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  return GET(req);
}
