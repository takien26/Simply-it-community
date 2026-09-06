import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';

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
    const { extensionHours, reason } = body;

    const hours = Number(extensionHours);
    if (!hours || hours <= 0 || hours > 168) {
      return NextResponse.json(
        { error: 'Số giờ gia hạn không hợp lệ (Phải từ 1 đến 168 giờ / tối đa 7 ngày)' },
        { status: 400 }
      );
    }

    if (!reason || reason.trim().length < 5) {
      return NextResponse.json(
        { error: 'Vui lòng cung cấp lý do gia hạn rõ ràng (ít nhất 5 ký tự) để phục vụ kiểm toán và báo cáo' },
        { status: 400 }
      );
    }

    const ticket = await prisma.ticket.findUnique({
      where: { id },
      include: {
        assignedTo: { select: { id: true, fullName: true } },
        team: { select: { id: true, name: true } },
      },
    });

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket không tồn tại' }, { status: 404 });
    }

    const baseDeadline = ticket.slaDeadline ? new Date(ticket.slaDeadline) : new Date();
    const newDeadline = new Date(baseDeadline.getTime() + hours * 60 * 60 * 1000);

    const historyEntry = {
      timestamp: new Date().toISOString(),
      requestedById: currentUser.userId,
      addedHours: hours,
      previousDeadline: ticket.slaDeadline,
      newDeadline: newDeadline.toISOString(),
      reason: reason.trim(),
    };

    const existingHistory = Array.isArray(ticket.slaExtensionHistory)
      ? (ticket.slaExtensionHistory as any[])
      : [];

    const updated = await prisma.ticket.update({
      where: { id },
      data: {
        originalSlaDeadline: ticket.originalSlaDeadline || ticket.slaDeadline,
        slaDeadline: newDeadline,
        isSlaExtended: true,
        slaExtensionReason: reason.trim(),
        slaExtensionHistory: [...existingHistory, historyEntry],
      },
    });

    // Add internal audit note on the ticket
    await prisma.ticketComment.create({
      data: {
        ticketId: id,
        userId: currentUser.userId,
        content: `⏱️ [GIA HẠN SLA XỬ LÝ]: Đã gia hạn thêm +${hours} giờ.\n• Hạn SLA mới: ${newDeadline.toLocaleString('vi-VN')}\n• Lý do giải trình: "${reason.trim()}"\n• Ghi chú kiểm toán: Yêu cầu này được lưu lại trong Báo cáo Kiểm toán SLA để IT Lead theo dõi minh bạch.`,
        isInternal: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: updated,
      message: `Đã gia hạn thành công thêm ${hours} giờ. Hạn xử lý mới: ${newDeadline.toLocaleString('vi-VN')}`,
    });
  } catch (error) {
    console.error('Extend SLA error:', error);
    return NextResponse.json({ error: 'Lỗi khi gia hạn SLA' }, { status: 500 });
  }
}
