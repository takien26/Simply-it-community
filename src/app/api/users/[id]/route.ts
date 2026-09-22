import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import {
  hasPermission,
  getRoleLevel,
  isSuperAdmin,
  isAdminOrAbove,
  canModifyUser,
  canDeleteUser,
  canAssignRole,
} from '@/lib/permissions';
import bcrypt from 'bcryptjs';
import { moveToTrash } from '@/lib/trash';
import { normalizeEmail, normalizeCompanyName } from '@/lib/normalize';

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
    const canViewUsers = isAdminOrAbove(currentUser.roleName) || (await hasPermission(currentUser.userId, 'users.view'));
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

    const callerLevel = getRoleLevel(currentUser.roleName);
    const callerIsSuperAdmin = isSuperAdmin(currentUser.roleName);
    const callerIsAdminOrAbove = isAdminOrAbove(currentUser.roleName);
    const canManageUsers = callerIsAdminOrAbove || (await hasPermission(currentUser.userId, 'users.update'));

    if (!isSelf && !canManageUsers) {
      return NextResponse.json({ error: 'Forbidden: Bạn không có quyền chỉnh sửa thông tin người dùng này' }, { status: 403 });
    }

    const targetUser = await prisma.user.findUnique({
      where: { id },
      include: { role: true },
    });
    if (!targetUser) {
      return NextResponse.json({ error: 'Không tìm thấy người dùng' }, { status: 404 });
    }

    const targetLevel = getRoleLevel(targetUser.role?.name);

    // HIERARCHY RULE: Không được sửa người có cấp bậc cao hơn mình (trừ khi chính chủ tự sửa thông tin cá nhân cơ bản)
    if (!isSelf && !canModifyUser(callerLevel, targetLevel)) {
      return NextResponse.json({
        error: `Forbidden: Bạn không có quyền chỉnh sửa tài khoản có cấp bậc cao hơn bạn (Cấp của bạn: ${callerLevel}, Cấp đối tượng: ${targetLevel})`,
      }, { status: 403 });
    }

    const body = await request.json();
    const { fullName, email, department, position, companyName, phone, roleId, password, isActive, managerId, locationId, revokeAllAssignments } = body;

    // Self-elevation guard: Người dùng không được tự đổi roleId hoặc tự đổi isActive của chính mình
    if (isSelf && roleId !== undefined && roleId !== targetUser.roleId) {
      return NextResponse.json({ error: 'Forbidden: Bạn không thể tự thay đổi vai trò của chính mình' }, { status: 403 });
    }
    if (isSelf && isActive !== undefined && isActive !== targetUser.isActive) {
      return NextResponse.json({ error: 'Forbidden: Bạn không thể tự thay đổi trạng thái hoạt động của chính mình' }, { status: 403 });
    }

    // Role elevation guard: Chỉ gán vai trò ngang hoặc thấp hơn mình
    if (roleId !== undefined && roleId !== targetUser.roleId) {
      const newRole = await prisma.role.findUnique({ where: { id: roleId } });
      if (!newRole) {
        return NextResponse.json({ error: 'Vai trò mới không tồn tại' }, { status: 400 });
      }
      const newRoleLevel = getRoleLevel(newRole.name);
      if (!canAssignRole(callerLevel, newRoleLevel)) {
        return NextResponse.json({
          error: `Forbidden: Bạn chỉ được gán vai trò có cấp bậc ngang hoặc thấp hơn vai trò của bạn. Không thể gán vai trò '${newRole.name}' (Cấp ${newRoleLevel}) khi cấp của bạn là ${callerLevel}`,
        }, { status: 403 });
      }
    }

    // Account activation guard
    if (isActive !== undefined && !canManageUsers) {
      return NextResponse.json({ error: 'Forbidden: Bạn không có quyền thay đổi trạng thái hoạt động của tài khoản' }, { status: 403 });
    }

    // Bảo vệ Super Admin: Không ai được khóa Super Admin (trừ chính Super Admin)
    if (isActive === false && targetLevel >= 100 && !callerIsSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden: Không thể khóa hoặc vô hiệu hóa Quản trị viên Tối cao (Super Admin)' }, { status: 403 });
    }

    const data: Record<string, unknown> = {};
    if (fullName) data.fullName = fullName.trim().replace(/\s+/g, ' ');
    if (email) {
      const normalizedEmail = normalizeEmail(email);
      const existing = await prisma.user.findFirst({
        where: { email: normalizedEmail, id: { not: id } },
      });
      if (existing) {
        return NextResponse.json({ error: `Email '${normalizedEmail}' đã được người dùng khác sử dụng` }, { status: 400 });
      }
      data.email = normalizedEmail;
    }
    if (department !== undefined) data.department = department || null;
    if (position !== undefined) data.position = position || null;
    if (companyName !== undefined) data.companyName = companyName ? normalizeCompanyName(companyName) : null;
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

    const callerLevel = getRoleLevel(currentUser.roleName);
    const callerIsSuperAdmin = isSuperAdmin(currentUser.roleName);
    const callerIsAdminOrAbove = isAdminOrAbove(currentUser.roleName);
    const canDeleteUserPerm = callerIsAdminOrAbove || (await hasPermission(currentUser.userId, 'users.delete'));
    if (!canDeleteUserPerm) {
      return NextResponse.json({ error: 'Forbidden: Bạn không có quyền xóa hoặc vô hiệu hóa tài khoản' }, { status: 403 });
    }

    const existingUser = await prisma.user.findUnique({
      where: { id },
      include: { role: true },
    });
    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const targetLevel = getRoleLevel(existingUser.role?.name);

    // HIERARCHY RULE: Cấm xóa người có quyền cao hơn mình hoặc xóa Super Admin
    if (!canDeleteUser(callerLevel, targetLevel, callerIsSuperAdmin)) {
      return NextResponse.json({
        error: `Forbidden: Bạn không thể xóa hoặc vô hiệu hóa người dùng có cấp bậc quyền hạn cao hơn hoặc ngang bằng bạn (Cấp của bạn: ${callerLevel}, Cấp đối tượng: ${targetLevel})`,
      }, { status: 403 });
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
