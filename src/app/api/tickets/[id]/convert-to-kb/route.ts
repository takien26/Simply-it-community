// src/app/api/tickets/[id]/convert-to-kb/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { DocumentType } from '@prisma/client';

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
    const body = await request.json().catch(() => ({}));
    const { customTitle, teamScope = 'PUBLIC', customContent, categoryKey } = body;

    const ticket = await prisma.ticket.findUnique({
      where: { id },
      include: {
        createdBy: { select: { fullName: true, email: true } },
        assignedTo: { select: { fullName: true, email: true } },
        comments: {
          orderBy: { createdAt: 'asc' },
          select: { content: true, isInternal: true, createdAt: true },
        },
      },
    });

    if (!ticket) {
      return NextResponse.json({ error: 'Không tìm thấy Ticket' }, { status: 404 });
    }

    // Compose comprehensive KB article text
    const articleTitle = customTitle && customTitle.trim()
      ? customTitle.trim()
      : `[Hướng dẫn xử lý] ${ticket.title}`;

    let finalTitle = articleTitle;
    if (teamScope !== 'PUBLIC' && !finalTitle.includes(`[${teamScope}]`)) {
      finalTitle = `[${teamScope}] ${finalTitle}`;
    }

    const resolutionText = customContent || ticket.resolutionNotes || (
      ticket.comments.length > 0
        ? ticket.comments.map(c => c.content).join('\n\n')
        : 'Sự cố đã được kiểm tra và xử lý thành công theo quy trình kỹ thuật.'
    );

    const fullArticleContent = `## 1. Hiện tượng & Vấn đề sự cố
${ticket.description || 'Không có mô tả chi tiết'}

## 2. Các bước kiểm tra & Hướng dẫn xử lý
${resolutionText}

---
*Nguồn gốc bài viết:* Chuyển đổi từ Ticket **#${ticket.ticketNumber}** (Danh mục: ${ticket.category})
*Kỹ thuật viên thực hiện:* ${ticket.assignedTo?.fullName || (currentUser as any).fullName || currentUser.email}`;

    // Create Document record in DB (used by KB module)
    const newDoc = await prisma.document.create({
      data: {
        title: finalTitle,
        type: DocumentType.OTHER,
        notes: fullArticleContent,
        fileUrl: '/uploads/documents/kb-guideline.pdf',
        fileName: `${finalTitle.slice(0, 40).replace(/[^a-zA-Z0-9\s_-]/g, '')}.pdf`,
        createdById: currentUser.userId,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Đã đóng góp giải pháp vào Thư viện Tri thức (KB) thành công!',
      data: newDoc,
    });
  } catch (error: any) {
    console.error('Convert to KB error:', error);
    return NextResponse.json(
      { error: error.message || 'Lỗi chuyển đổi bài viết KB' },
      { status: 500 }
    );
  }
}
