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
    const isDeflection = Boolean(body.isDeflection);
    const reason = typeof body.reason === 'string' ? body.reason : undefined;
    const comment = typeof body.comment === 'string' ? body.comment : undefined;

    const stats = await recordArticleFeedback(
      id,
      isHelpful,
      currentUser?.userId,
      isDeflection,
      reason,
      comment
    );

    return NextResponse.json({
      success: true,
      data: stats,
      message: isDeflection
        ? '🎉 Tuyệt vời! Đã ghi nhận bài viết giúp giải quyết sự cố và giảm tải 1 ticket cho IT.'
        : isHelpful
        ? 'Cảm ơn phản hồi! Đã ghi nhận bạn tự xử lý thành công.'
        : reason
        ? 'Cảm ơn bạn đã đóng góp lý do cụ thể! Đội ngũ IT sẽ nhanh chóng rà soát và bổ sung nội dung bài viết.'
        : 'Đã ghi nhận phản hồi! Hệ thống đã gợi ý tạo yêu cầu hỗ trợ IT.',
    });
  } catch (error: any) {
    console.error('KB feedback error:', error);
    return NextResponse.json({ error: error.message || 'Lỗi lưu phản hồi' }, { status: 500 });
  }
}
