// src/app/api/tickets/[id]/rate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { broadcastRealtimeEvent } from '@/lib/realtime';

export async function POST(
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
    const { rating, comment } = body;

    const numRating = Number(rating);
    if (!numRating || numRating < 1 || numRating > 5) {
      return NextResponse.json(
        { error: 'Số sao đánh giá phải từ 1 đến 5' },
        { status: 400 }
      );
    }

    const ticket = await prisma.ticket.findUnique({
      where: { id },
      select: {
        id: true,
        ticketNumber: true,
        status: true,
        createdById: true,
        assignedToId: true,
        rating: true,
      },
    });

    if (!ticket) {
      return NextResponse.json({ error: 'Không tìm thấy Ticket' }, { status: 404 });
    }

    // Only creator or admin can submit CSAT rating
    const isAdmin = currentUser.roleName === 'Admin' || (Array.isArray((currentUser as any).permissions) && (currentUser as any).permissions.includes('*'));
    if (ticket.createdById !== currentUser.userId && !isAdmin) {
      return NextResponse.json(
        { error: 'Chỉ người tạo yêu cầu mới có quyền đánh giá chất lượng phục vụ của Ticket này' },
        { status: 403 }
      );
    }

    const updated = await prisma.ticket.update({
      where: { id },
      data: {
        rating: numRating,
        ratingComment: comment && typeof comment === 'string' ? comment.trim() : null,
        ratedAt: new Date(),
      },
      select: {
        id: true,
        ticketNumber: true,
        rating: true,
        ratingComment: true,
        ratedAt: true,
      },
    });

    try {
      broadcastRealtimeEvent({
        type: 'TICKET_RATED',
        title: `Ticket #${ticket.ticketNumber} được đánh giá ${numRating}⭐`,
        message: `${(currentUser as any).fullName || currentUser.email} đã đánh giá ${numRating} sao`,
        data: {
          ticketId: id,
          ticketNumber: ticket.ticketNumber,
          rating: numRating,
          ratedBy: (currentUser as any).fullName || currentUser.email,
        },
      });
    } catch (e) {}

    return NextResponse.json({
      success: true,
      message: 'Cảm ơn bạn đã gửi đánh giá chất lượng hỗ trợ!',
      data: updated,
    });
  } catch (error: any) {
    console.error('Rate ticket error:', error);
    return NextResponse.json(
      { error: error.message || 'Lỗi gửi đánh giá' },
      { status: 500 }
    );
  }
}
