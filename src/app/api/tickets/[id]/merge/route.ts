import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { sendEmail } from '@/lib/email';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Role check: Only IT staff/admin/managers can merge tickets
    const userRole = (currentUser.roleName || '').toLowerCase();
    const canMerge =
      userRole.includes('admin') ||
      userRole.includes('manager') ||
      userRole.includes('tech') ||
      userRole.includes('staff');
    if (!canMerge) {
      return NextResponse.json(
        { error: 'Chỉ nhân viên kỹ thuật hoặc quản trị viên mới có quyền gộp ticket' },
        { status: 403 }
      );
    }

    const { id: sourceTicketId } = await params;
    const body = await request.json();
    const { targetTicketId, reason } = body;

    if (!targetTicketId) {
      return NextResponse.json(
        { error: 'Vui lòng chọn ticket gốc cần gộp vào' },
        { status: 400 }
      );
    }

    if (sourceTicketId === targetTicketId) {
      return NextResponse.json(
        { error: 'Không thể gộp ticket vào chính nó' },
        { status: 400 }
      );
    }

    // Fetch user & both tickets
    const [userRecord, sourceTicket, targetTicket] = await Promise.all([
      prisma.user.findUnique({ where: { id: currentUser.userId }, select: { fullName: true } }),
      prisma.ticket.findUnique({
        where: { id: sourceTicketId },
        include: { createdBy: { select: { id: true, fullName: true, email: true } } },
      }),
      prisma.ticket.findUnique({
        where: { id: targetTicketId },
        include: { createdBy: { select: { id: true, fullName: true, email: true } } },
      }),
    ]);

    const techName = userRecord?.fullName || currentUser.email;

    if (!sourceTicket) {
      return NextResponse.json({ error: 'Không tìm thấy ticket nguồn' }, { status: 404 });
    }
    if (!targetTicket) {
      return NextResponse.json({ error: 'Không tìm thấy ticket đích cần gộp' }, { status: 404 });
    }

    // Prevent merging into a ticket that itself is already merged into another
    if (targetTicket.mergedIntoTicketId) {
      return NextResponse.json(
        { error: `Ticket #${targetTicket.ticketNumber} đã bị gộp vào một ticket khác. Vui lòng chọn ticket gốc.` },
        { status: 400 }
      );
    }

    const mergeReason = reason?.trim() || 'Trùng lặp nội dung yêu cầu';

    // Update source ticket to CLOSED and link to target
    await prisma.ticket.update({
      where: { id: sourceTicketId },
      data: {
        mergedIntoTicketId: targetTicketId,
        status: 'CLOSED',
        resolvedAt: new Date(),
        resolutionNotes: `🔀 Đã gộp vào ticket #${targetTicket.ticketNumber} (${targetTicket.title}). Lý do: ${mergeReason}`,
      },
    });

    // Add comment to source ticket
    await prisma.ticketComment.create({
      data: {
        ticketId: sourceTicketId,
        userId: currentUser.userId,
        content: `🔀 Ticket này đã được kỹ thuật viên ${techName} gộp vào ticket #${targetTicket.ticketNumber} (${targetTicket.title}).\n\n📌 Lý do: ${mergeReason}\nℹ️ Mọi cập nhật tiếp theo về sự cố sẽ được xử lý tại ticket chính.`,
        isInternal: false,
      },
    });

    // Add comment to target ticket
    await prisma.ticketComment.create({
      data: {
        ticketId: targetTicketId,
        userId: currentUser.userId,
        content: `🔀 [👑 Enterprise] Đã tiếp nhận và gộp ticket con #${sourceTicket.ticketNumber} ("${sourceTicket.title}") của người yêu cầu: ${sourceTicket.createdBy?.fullName || 'N/A'}.\n\n📌 Lý do gộp: ${mergeReason}`,
        isInternal: false,
      },
    });

    // Optional email notification to source requester
    if (sourceTicket.createdBy?.email) {
      try {
        await sendEmail({
          to: sourceTicket.createdBy.email,
          subject: `[Simply IT] Ticket #${sourceTicket.ticketNumber} đã được gộp vào #${targetTicket.ticketNumber}`,
          html: `
            <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
              <h3 style="color: #2563eb;">Thông báo gộp Ticket hỗ trợ</h3>
              <p>Xin chào <strong>${sourceTicket.createdBy.fullName}</strong>,</p>
              <p>Yêu cầu hỗ trợ <strong>#${sourceTicket.ticketNumber} - ${sourceTicket.title}</strong> của bạn đã được gộp vào ticket chính <strong>#${targetTicket.ticketNumber} - ${targetTicket.title}</strong> do có cùng nội dung xử lý.</p>
              <p><strong>Lý do:</strong> ${mergeReason}</p>
              <p>Đội ngũ IT đang tiến hành xử lý tại ticket chính. Bạn sẽ nhận được các thông báo cập nhật tiến độ tự động.</p>
              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
              <p style="font-size: 12px; color: #64748b;">Simply IT Service Desk System</p>
            </div>
          `,
        });
      } catch (mailErr) {
        console.warn('Failed to send merge notification email:', mailErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Đã gộp thành công ticket #${sourceTicket.ticketNumber} vào #${targetTicket.ticketNumber}`,
      targetTicketId,
    });
  } catch (error: any) {
    console.error('Merge ticket error:', error);
    return NextResponse.json(
      { error: error.message || 'Lỗi khi gộp ticket' },
      { status: 500 }
    );
  }
}
