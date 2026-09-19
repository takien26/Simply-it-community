import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import {
  isAdminOrAbove,
  isSuperAdmin,
  getRoleLevel,
} from '@/lib/permissions';
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

    if (!isAdminOrAbove(currentUser.roleName)) {
      return NextResponse.json({ error: 'Forbidden: Chỉ Quản trị viên (Admin) mới có quyền Reset mật khẩu cấp 2 của người dùng' }, { status: 403 });
    }

    const { id } = await params;
    const targetUser = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        fullName: true,
        email: true,
        secondaryPasswordHash: true,
        role: { select: { name: true } },
      },
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'Không tìm thấy người dùng' }, { status: 404 });
    }

    const callerLevel = getRoleLevel(currentUser.roleName);
    const targetLevel = getRoleLevel(targetUser.role?.name);

    // HIERARCHY RULE: Không được reset mật khẩu của người có quyền cao hơn mình
    if (targetLevel > callerLevel) {
      return NextResponse.json({
        error: `Forbidden: Bạn không thể Reset mật khẩu của người dùng có cấp bậc cao hơn bạn (Cấp của bạn: ${callerLevel}, Cấp đối tượng: ${targetLevel})`,
      }, { status: 403 });
    }

    if (targetLevel >= 100 && !isSuperAdmin(currentUser.roleName)) {
      return NextResponse.json({
        error: 'Forbidden: Chỉ Quản trị viên Tối cao (Super Admin) mới có thể can thiệp vào tài khoản Super Admin',
      }, { status: 403 });
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
