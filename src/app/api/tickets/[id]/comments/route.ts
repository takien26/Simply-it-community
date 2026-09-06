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

    const { id: ticketId } = await params;
    const body = await request.json();
    const { content, isInternal, attachmentUrls } = body;

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

    return NextResponse.json(comment, { status: 201 });
  } catch (error) {
    console.error('Add comment error:', error);
    return NextResponse.json({ error: 'Failed to add comment' }, { status: 500 });
  }
}
