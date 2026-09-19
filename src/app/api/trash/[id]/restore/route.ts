import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { restoreFromTrash } from '@/lib/trash';
import { hasPermission } from '@/lib/permissions';

// POST /api/trash/[id]/restore - Khôi phục mục từ Thùng rác về bảng gốc
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const canRestore = currentUser.roleName === 'Admin' || (await hasPermission(currentUser.userId, 'settings.update'));
    if (!canRestore) {
      return NextResponse.json({ error: 'Chỉ Quản trị viên mới có quyền khôi phục dữ liệu từ Thùng rác' }, { status: 403 });
    }

    const { id } = await params;
    const result = await restoreFromTrash(id, currentUser.userId);

    return NextResponse.json({
      success: true,
      message: 'Đã khôi phục thành công',
      data: result.restoredEntity,
    });
  } catch (error: any) {
    console.error('Restore trash item error:', error);
    return NextResponse.json({ error: error.message || 'Lỗi khi khôi phục mục' }, { status: 500 });
  }
}
