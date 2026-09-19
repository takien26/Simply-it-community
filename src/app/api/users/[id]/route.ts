import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { hasPermission } from '@/lib/permissions';
import bcrypt from 'bcryptjs';
import { moveToTrash } from '@/lib/trash';

// GET /api/users/[id] - Get user details with asset assignments
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const isSelf = id === currentUser.userId;
    const canViewUsers = currentUser.roleName === 'Admin' || (await hasPermission(currentUser.userId, 'users.view'));
    if (!isSelf && !canViewUsers) {
      return NextResponse.json({ error: 'Forbidden: Bạn không có quyền xem thông tin người dùng này' }, { status: 403 });
    }
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        role: true,
        manager: { select: { id: true, fullName: true, email: true, position: true, phone: true, department: true } },
        directReports: { select: { id: true, fullName: true, email: true, position: true, phone: true, department: true } },
        location: { select: { id: true, name: true, building: true, floor: true } },
        assetAssignments: {
          where: { returnedAt: null },
          include: { asset: true },
        },
        licenseAssignments: {
          where: { revokedAt: null },
          include: { license: true },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error('Get user detail error:', error);
    return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 });
  }
}

// PUT /api/users/[id] - Update user details & Role
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const isSelf = id === currentUser.userId;
    const isAdmin = currentUser.roleName === 'Admin';
    const canManageUsers = isAdmin || (await hasPermission(currentUser.userId, 'users.update'));

    if (!isSelf && !canManageUsers) {
      return NextResponse.json({ error: 'Forbidden: Bạn không có quyền chỉnh sửa thông tin người dùng này' }, { status: 403 });
    }

    const body = await request.json();
    const { fullName, email, department, position, companyName, phone, roleId, password, isActive, managerId, locationId, revokeAllAssignments } = body;

    // Role elevation guard: only Admin can change roleId
    if (roleId !== undefined && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden: Chỉ Quản trị viên (Admin) mới có quyền thay đổi vai trò hệ thống' }, { status: 403 });
    }

    // Account activation guard: only managers with users.update can change isActive
    if (isActive !== undefined && !canManageUsers) {
      return NextResponse.json({ error: 'Forbidden: Bạn không có quyền thay đổi trạng thái hoạt động của tài khoản' }, { status: 403 });
    }

    const data: Record<string, unknown> = {};
    if (fullName) data.fullName = fullName;
    if (email) {
      const trimmedEmail = email.trim();
      const existing = await prisma.user.findFirst({
        where: { email: trimmedEmail, id: { not: id } },
      });
      if (existing) {
        return NextResponse.json({ error: `Email '${trimmedEmail}' đã được người dùng khác sử dụng` }, { status: 400 });
      }
      data.email = trimmedEmail;
    }
    if (department !== undefined) data.department = department || null;
    if (position !== undefined) data.position = position || null;
    if (companyName !== undefined) data.companyName = companyName || null;
    if (phone !== undefined) data.phone = phone || null;
    if (managerId !== undefined) data.managerId = managerId || null;
    if (locationId !== undefined) data.locationId = locationId || null;
    if (roleId) data.roleId = roleId;
    if (isActive !== undefined) data.isActive = isActive;
    if (password) {
      data.passwordHash = await bcrypt.hash(password, 10);
    }

    // If user is being marked as resigned/inactive and admin requested to revoke all assignments
    if (isActive === false && revokeAllAssignments) {
      const activeAssetAssignments = await prisma.assetAssignment.findMany({
        where: { userId: id, returnedAt: null },
      });

      if (activeAssetAssignments.length > 0) {
        await prisma.assetAssignment.updateMany({
          where: { userId: id, returnedAt: null },
          data: { returnedAt: new Date(), notes: 'Tự động thu hồi do nhân sự nghỉ việc' },
        });

        const assetIds = activeAssetAssignments.map((a) => a.assetId);
        await prisma.asset.updateMany({
          where: { id: { in: assetIds } },
          data: { status: 'AVAILABLE' },
        });
      }

      await prisma.licenseAssignment.updateMany({
        where: { userId: id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data,
      include: {
        role: true,
        manager: { select: { id: true, fullName: true, email: true } },
        location: true,
      },
    });

    return NextResponse.json({ success: true, data: updatedUser });
  } catch (error) {
    console.error('Update user error:', error);
    return NextResponse.json({ error: 'Update user failed' }, { status: 500 });
  }
}

// DELETE /api/users/[id] - Deactivate user
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    if (id === currentUser.userId) {
      return NextResponse.json({ error: 'Không thể tự xóa tài khoản của chính mình' }, { status: 400 });
    }

    const isAdmin = currentUser.roleName === 'Admin';
    const canDeleteUser = isAdmin || (await hasPermission(currentUser.userId, 'users.delete'));
    if (!canDeleteUser) {
      return NextResponse.json({ error: 'Forbidden: Bạn không có quyền xóa hoặc vô hiệu hóa tài khoản này' }, { status: 403 });
    }

    const existingUser = await prisma.user.findUnique({ where: { id } });
    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Lưu snapshot vào Thùng rác
    const trashResult = await moveToTrash({
      entityType: 'USER',
      entityId: id,
      entityName: existingUser.fullName,
      entityCode: existingUser.email,
      dataSnapshot: existingUser,
      deletedById: currentUser.userId,
      deletedByName: currentUser.fullName || currentUser.email,
    }).catch((err) => {
      console.error('Failed to snapshot user to trash:', err);
      return null;
    });

    await prisma.user.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({
      success: true,
      message: 'Đã chuyển nhân viên vào Thùng rác',
      trashItemId: trashResult?.trashItem?.id || null,
      userName: existingUser.fullName,
    });
  } catch (error) {
    console.error('Delete user error:', error);
    return NextResponse.json({ error: 'Delete user failed' }, { status: 500 });
  }
}
