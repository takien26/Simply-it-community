import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { createAuditLog } from '@/lib/audit';
import bcrypt from 'bcryptjs';
import { clearMeCache } from '@/lib/me-cache';

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { currentPassword, newPassword, confirmPassword } = body;

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: 'Vui lòng nhập đầy đủ mật khẩu hiện tại và mật khẩu mới' },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: 'Mật khẩu mới phải có tối thiểu 6 ký tự' },
        { status: 400 }
      );
    }

    if (confirmPassword && newPassword !== confirmPassword) {
      return NextResponse.json(
        { error: 'Mật khẩu mới và xác nhận mật khẩu không khớp' },
        { status: 400 }
      );
    }

    // Retrieve user from database
    const user = await prisma.user.findUnique({
      where: { id: currentUser.userId },
      select: { id: true, email: true, passwordHash: true, department: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'Không tìm thấy người dùng' }, { status: 404 });
    }

    // Guard: SSO users cannot change password locally
    if (user.passwordHash?.startsWith('SSO_')) {
      return NextResponse.json(
        {
          error:
            'Tài khoản đăng nhập qua SSO (Microsoft 365 / Google). Vui lòng đổi mật khẩu tại trang quản lý tài khoản của tổ chức.',
        },
        { status: 400 }
      );
    }

    // Guard: LDAP Domain users should change via Windows / AD
    const deptLower = (user.department || '').toLowerCase();
    if (deptLower.includes('ldap') || deptLower.includes('active directory')) {
      return NextResponse.json(
        {
          error:
            'Tài khoản Windows Domain (LDAP). Vui lòng nhấn Ctrl + Alt + Del trên máy tính Windows để đổi mật khẩu.',
        },
        { status: 400 }
      );
    }

    // Verify current password
    const isCurrentValid = await bcrypt.compare(currentPassword.trim(), user.passwordHash);
    if (!isCurrentValid) {
      return NextResponse.json(
        { error: 'Mật khẩu hiện tại không chính xác. Vui lòng kiểm tra lại.' },
        { status: 400 }
      );
    }

    if (currentPassword.trim() === newPassword.trim()) {
      return NextResponse.json(
        { error: 'Mật khẩu mới không được trùng với mật khẩu hiện tại' },
        { status: 400 }
      );
    }

    // Hash new password and save
    const newPasswordHash = await bcrypt.hash(newPassword.trim(), 10);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: newPasswordHash,
        updatedAt: new Date(),
      },
    });

    // Invalidate cached me endpoint data
    clearMeCache(user.id);

    // Audit log
    await createAuditLog({
      action: 'UPDATE',
      entityType: 'User',
      entityId: user.id,
      userId: user.id,
    });

    return NextResponse.json({
      success: true,
      message: 'Đổi mật khẩu thành công! Mật khẩu mới đã được cập nhật.',
    });
  } catch (error: any) {
    console.error('Change password error:', error);
    return NextResponse.json(
      { error: error?.message || 'Lỗi hệ thống khi đổi mật khẩu' },
      { status: 500 }
    );
  }
}
