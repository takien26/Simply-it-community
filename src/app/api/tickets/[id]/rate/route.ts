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

    // Chỉ cho phép đánh giá khi Ticket đã hoàn thành (RESOLVED hoặc CLOSED)
    if (ticket.status !== 'RESOLVED' && ticket.status !== 'CLOSED') {
      return NextResponse.json(
        { error: 'Chỉ có thể đánh giá mức độ hài lòng khi Ticket đã được giải quyết hoặc đã đóng' },
        { status: 400 }
      );
    }

    // Only creator or admin can submit CSAT rating
    const isAdmin = currentUser.roleName === 'Admin' || (Array.isArray((currentUser as any).permissions) && (currentUser as any).permissions.includes('*'));
    if (ticket.createdById !== currentUser.userId && !isAdmin) {
      return NextResponse.json(
        { error: 'Chỉ người tạo yêu cầu mới có quyền đánh giá chất lượng phục vụ của Ticket này' },
        { status: 403 }
      );
    }

    // Không cho phép đánh giá lại nhiều lần nếu đã chấm điểm (trừ khi là Admin)
    if (ticket.rating !== null && !isAdmin) {
      return NextResponse.json(
        { error: 'Ticket này đã được đánh giá trước đó, không thể đánh giá lại' },
        { status: 400 }
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

// GET /api/tickets/[id]/rate?rating=5&comment=... (1-Click CSAT from email or direct link)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const rawRating = searchParams.get('rating') || searchParams.get('score');
    const comment = searchParams.get('comment') || '';

    const numRating = Number(rawRating);
    if (!numRating || numRating < 1 || numRating > 5) {
      return NextResponse.redirect(new URL(`/tickets?id=${id}&error=invalid_rating`, request.url));
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
      return NextResponse.redirect(new URL(`/tickets?error=not_found`, request.url));
    }

    // Only allow rating on completed tickets
    if (ticket.status !== 'RESOLVED' && ticket.status !== 'CLOSED') {
      return NextResponse.redirect(new URL(`/tickets?id=${id}&error=ticket_not_resolved`, request.url));
    }

    // If already rated, redirect gracefully
    if (ticket.rating !== null) {
      return NextResponse.redirect(new URL(`/tickets?id=${id}&already_rated=true&score=${ticket.rating}`, request.url));
    }

    await prisma.ticket.update({
      where: { id },
      data: {
        rating: numRating,
        ratingComment: comment ? comment.trim() : null,
        ratedAt: new Date(),
      },
    });

    try {
      broadcastRealtimeEvent({
        type: 'TICKET_RATED',
        title: `Ticket #${ticket.ticketNumber} được đánh giá ${numRating}⭐`,
        message: `Khách hàng đã đánh giá ${numRating} sao từ khảo sát 1-click`,
        data: {
          ticketId: id,
          ticketNumber: ticket.ticketNumber,
          rating: numRating,
          ratedBy: '1-Click Email CSAT',
        },
      });
    } catch (e) {}

    return NextResponse.redirect(new URL(`/tickets?id=${id}&rated=true&score=${numRating}`, request.url));
  } catch (error: any) {
    console.error('GET rate ticket error:', error);
    return NextResponse.redirect(new URL(`/tickets?error=rate_failed`, request.url));
  }
}
