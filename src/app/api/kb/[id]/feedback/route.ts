import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { recordArticleFeedback } from '@/lib/kb-storage';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const isHelpful = Boolean(body.isHelpful);

    const stats = await recordArticleFeedback(id, isHelpful, currentUser?.userId);

    return NextResponse.json({
      success: true,
      data: stats,
      message: isHelpful
        ? 'Cảm ơn phản hồi! Đã ghi nhận bạn tự xử lý thành công.'
        : 'Đã ghi nhận phản hồi! Hệ thống đã gợi ý tạo yêu cầu hỗ trợ IT.',
    });
  } catch (error: any) {
    console.error('KB feedback error:', error);
    return NextResponse.json({ error: error.message || 'Lỗi lưu phản hồi' }, { status: 500 });
  }
}
