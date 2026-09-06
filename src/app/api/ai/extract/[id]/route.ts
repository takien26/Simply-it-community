import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { confirmExtraction, confirmExtractionBatch, rejectExtraction } from '@/lib/services/ai-extraction';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const canExtract = await hasPermission(currentUser.userId, 'ai.extract');
    if (!canExtract) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const action = body.action as 'confirm' | 'reject' | 'confirm_batch';

    if (!action || !['confirm', 'reject', 'confirm_batch'].includes(action)) {
      return NextResponse.json(
        { error: 'action must be "confirm", "confirm_batch" or "reject"' },
        { status: 400 }
      );
    }

    if (action === 'confirm_batch') {
      const batchItems = (body.batchItems as Array<Record<string, unknown>>) || [];
      const commonData = (body.commonData as Record<string, unknown>) || {};

      if (batchItems.length === 0) {
        return NextResponse.json({ error: 'Vui lòng chọn ít nhất 1 tài sản để lưu' }, { status: 400 });
      }

      const result = await confirmExtractionBatch(id, currentUser.userId, batchItems, commonData);
      return NextResponse.json({
        success: true,
        data: result,
        message: `✅ Đã lưu thành công ${result.count} tài sản vào hệ thống!`,
      });
    }

    if (action === 'confirm') {
      const editedData = body.editedData as Record<string, unknown> | undefined;
      const result = await confirmExtraction(id, currentUser.userId, editedData);
      return NextResponse.json({
        success: true,
        data: result,
        message: editedData
          ? '✅ Đã lưu với dữ liệu đã chỉnh sửa'
          : '✅ Đã xác nhận và lưu',
      });
    } else {
      await rejectExtraction(id, currentUser.userId);
      return NextResponse.json({
        success: true,
        message: '❌ Đã từ chối kết quả AI',
      });
    }
  } catch (error) {
    console.error('Extraction action error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Action failed' },
      { status: 500 }
    );
  }
}
