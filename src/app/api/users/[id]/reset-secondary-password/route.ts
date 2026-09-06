import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { prisma } from '@/lib/db';
import { createAuditLog } from '@/lib/audit';

// POST /api/users/[id]/reset-secondary-password
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const canManageUsers = await hasPermission(currentUser.userId, 'users.update');
    const isAdmin = currentUser.roleName === 'Admin' || currentUser.roleName === 'admin' || canManageUsers;

    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden: Chỉ Quản trị viên (Admin) mới có quyền Reset mật khẩu cấp 2 của người dùng' }, { status: 403 });
    }

    const { id } = await params;
    const targetUser = await prisma.user.findUnique({
      where: { id },
      select: { id: true, fullName: true, email: true, secondaryPasswordHash: true },
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'Không tìm thấy người dùng' }, { status: 404 });
    }

    // Reset secondary password hash to null
    await prisma.user.update({
      where: { id },
      data: { secondaryPasswordHash: null },
    });

    await createAuditLog({
      action: 'UPDATE',
      entityType: 'User',
      entityId: id,
      userId: currentUser.userId,
      changes: {
        action: 'RESET_SECONDARY_PASSWORD',
        targetUser: targetUser.fullName,
        performedBy: currentUser.email,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Đã Reset Mật khẩu cấp 2 của ${targetUser.fullName} (${targetUser.email}) thành công! Người dùng sẽ được yêu cầu tạo lại mật khẩu cấp 2 mới khi truy cập.`,
    });
  } catch (error) {
    console.error('Reset secondary password error:', error);
    return NextResponse.json({ error: 'Lỗi máy chủ khi Reset mật khẩu cấp 2' }, { status: 500 });
  }
}
