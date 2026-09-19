import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import {
  hasPermission,
  getRoleLevel,
  isSuperAdmin,
} from '@/lib/permissions';
import { prisma } from '@/lib/db';

// GET /api/users/[id]/permissions - Get specific overrides
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const canManage = await hasPermission(currentUser.userId, 'users.permissions');
    if (!canManage) {
      return NextResponse.json({ error: 'Forbidden: Bạn không có quyền xem phân quyền nhân sự' }, { status: 403 });
    }

    const { id } = await params;
    const userPermissions = await prisma.userPermission.findMany({
      where: { userId: id },
      include: { permission: true },
    });

    return NextResponse.json({ success: true, data: userPermissions });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch user permissions' }, { status: 500 });
  }
}

// POST /api/users/[id]/permissions - Set user-specific permission overrides
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const canManage = await hasPermission(currentUser.userId, 'users.permissions');
    if (!canManage) {
      return NextResponse.json({ error: 'Forbidden: Bạn không có quyền phân quyền nhân sự' }, { status: 403 });
    }

    const { id: userId } = await params;

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      include: { role: true },
    });
    if (!targetUser) {
      return NextResponse.json({ error: 'Không tìm thấy người dùng' }, { status: 404 });
    }

    const callerLevel = getRoleLevel(currentUser.roleName);
    const targetLevel = getRoleLevel(targetUser.role?.name);

    if (targetLevel > callerLevel) {
      return NextResponse.json({
        error: `Forbidden: Bạn không thể can thiệp phân quyền của người dùng có cấp bậc cao hơn bạn (Cấp của bạn: ${callerLevel}, Cấp đối tượng: ${targetLevel})`,
      }, { status: 403 });
    }

    if (targetLevel >= 100 && !isSuperAdmin(currentUser.roleName)) {
      return NextResponse.json({
        error: 'Forbidden: Chỉ Quản trị viên Tối cao (Super Admin) mới có thể can thiệp phân quyền của Super Admin',
      }, { status: 403 });
    }

    const body = await request.json();
    const { grantedCodes, revokedCodes } = body as { grantedCodes?: string[]; revokedCodes?: string[] };

    // Delete existing overrides
    await prisma.userPermission.deleteMany({ where: { userId } });

    // Grant additional
    if (grantedCodes && grantedCodes.length > 0) {
      const perms = await prisma.permission.findMany({ where: { code: { in: grantedCodes } } });
      for (const p of perms) {
        await prisma.userPermission.create({
          data: {
            userId,
            permissionId: p.id,
            granted: true,
            grantedById: currentUser.userId,
          },
        });
      }
    }

    // Explicitly revoke
    if (revokedCodes && revokedCodes.length > 0) {
      const perms = await prisma.permission.findMany({ where: { code: { in: revokedCodes } } });
      for (const p of perms) {
        await prisma.userPermission.create({
          data: {
            userId,
            permissionId: p.id,
            granted: false,
            grantedById: currentUser.userId,
          },
        });
      }
    }

    return NextResponse.json({ success: true, message: 'Đã cập nhật phân quyền riêng cho người dùng' });
  } catch (error) {
    console.error('Update user permissions error:', error);
    return NextResponse.json({ error: 'Failed to update user permissions' }, { status: 500 });
  }
}
