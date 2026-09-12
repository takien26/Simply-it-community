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

    const { id: ticketId } = await params;
    const body = await request.json();
    const { content, isInternal, attachmentUrls, broadcastToMerged = true } = body;

    if (!content || !content.trim()) {
      return NextResponse.json({ error: 'Nội dung bình luận không được để trống' }, { status: 400 });
    }

    const comment = await prisma.ticketComment.create({
      data: {
        ticketId,
        userId: currentUser.userId,
        content: content.trim(),
        isInternal: Boolean(isInternal),
        attachmentUrls: attachmentUrls || null,
      },
      include: {
        user: {
          select: { id: true, fullName: true, email: true, avatarUrl: true, role: true },
        },
      },
    });

    // 👑 Enterprise Feature: Broadcast public comments to all merged child tickets
    if (!isInternal && broadcastToMerged) {
      try {
        const parentTicket = await prisma.ticket.findUnique({
          where: { id: ticketId },
          select: {
            ticketNumber: true,
            title: true,
            mergedTickets: {
              select: {
                id: true,
                ticketNumber: true,
                title: true,
                createdBy: { select: { id: true, fullName: true, email: true } },
              },
            },
          },
        });

        if (parentTicket && parentTicket.mergedTickets.length > 0) {
          const broadcastContent = `📢 [Phản hồi từ Ticket gốc #${parentTicket.ticketNumber}]:\n\n${content.trim()}`;
          for (const child of parentTicket.mergedTickets) {
            // Clone comment to child ticket
            await prisma.ticketComment.create({
              data: {
                ticketId: child.id,
                userId: currentUser.userId,
                content: broadcastContent,
                isInternal: false,
                attachmentUrls: attachmentUrls || null,
              },
            });

            // Send notification email to child requester
            if (child.createdBy?.email) {
              sendEmail({
                to: child.createdBy.email,
                subject: `[Simply IT] Cập nhật tiến độ ticket #${child.ticketNumber} (qua Ticket gốc #${parentTicket.ticketNumber})`,
                html: `
                  <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                    <h3 style="color: #2563eb;">Cập nhật tiến độ hỗ trợ</h3>
                    <p>Xin chào <strong>${child.createdBy.fullName}</strong>,</p>
                    <p>Kỹ thuật viên <strong>${comment.user.fullName}</strong> vừa gửi thông báo cập nhật cho sự cố liên quan đến yêu cầu <strong>#${child.ticketNumber}</strong> của bạn:</p>
                    <div style="background: #f8fafc; border-left: 4px solid #3b82f6; padding: 12px; margin: 15px 0; border-radius: 4px;">
                      <p style="margin: 0; white-space: pre-line;">${content.trim()}</p>
                    </div>
                    <p style="font-size: 13px; color: #64748b;">(Thông báo này được gửi tự động vì yêu cầu của bạn đã được gộp vào ticket chính #${parentTicket.ticketNumber}).</p>
                  </div>
                `,
              }).catch(() => {});
            }
          }
        }
      } catch (broadcastErr) {
        console.warn('Broadcasting comment to merged tickets error:', broadcastErr);
      }
    }

    return NextResponse.json(comment, { status: 201 });
  } catch (error) {
    console.error('Add comment error:', error);
    return NextResponse.json({ error: 'Failed to add comment' }, { status: 500 });
  }
}
