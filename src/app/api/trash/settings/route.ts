import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getTrashRetentionDays, setTrashRetentionDays } from '@/lib/trash';

// GET /api/trash/settings - Lấy cấu hình số ngày lưu trữ thùng rác
export async function GET() {
  try {
    const days = await getTrashRetentionDays();
    return NextResponse.json({
      success: true,
      retentionDays: days,
      defaultDays: 30,
      options: [7, 14, 30, 60, 90, 180],
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Lỗi khi lấy cài đặt' }, { status: 500 });
  }
}

// POST /api/trash/settings - Cập nhật cấu hình số ngày lưu trữ thùng rác
export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (currentUser.roleName !== 'Admin') {
      return NextResponse.json({ error: 'Forbidden: Chỉ Quản trị viên mới có quyền thay đổi cấu hình thùng rác' }, { status: 403 });
    }

    const body = await request.json();
    const days = parseInt(body.retentionDays, 10);
    if (isNaN(days) || days < 1 || days > 365) {
      return NextResponse.json(
        { error: 'Số ngày lưu trữ phải từ 1 đến 365 ngày' },
        { status: 400 }
      );
    }

    const savedDays = await setTrashRetentionDays(days);

    return NextResponse.json({
      success: true,
      message: `Đã cập nhật thời gian lưu trữ thùng rác thành ${savedDays} ngày`,
      retentionDays: savedDays,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Lỗi khi lưu cài đặt' }, { status: 500 });
  }
}
