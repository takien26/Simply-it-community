import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { createAuditLog } from '@/lib/audit';

// GET: Check status of current user's secondary password
export async function GET(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: currentUser.userId },
      select: { id: true, secondaryPasswordHash: true, fullName: true, email: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      hasSecondaryPassword: !!user.secondaryPasswordHash,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
      },
    });
  } catch (error) {
    console.error('Secondary password status error:', error);
    return NextResponse.json({ error: 'Failed to check secondary password' }, { status: 500 });
  }
}

// POST: Verify, Set, Change, OR Reset-with-login-password
export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { action, secondaryPassword, currentSecondaryPassword, newSecondaryPassword, primaryPassword } = body;

    const user = await prisma.user.findUnique({
      where: { id: currentUser.userId },
      select: { id: true, passwordHash: true, secondaryPasswordHash: true, fullName: true, email: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // ACTION 1: VERIFY
    if (action === 'verify') {
      if (!secondaryPassword || typeof secondaryPassword !== 'string') {
        return NextResponse.json({ error: 'Vui lòng nhập mật khẩu cấp 2' }, { status: 400 });
      }

      if (!user.secondaryPasswordHash) {
        return NextResponse.json({
          error: 'Tài khoản chưa thiết lập mật khẩu cấp 2. Vui lòng tạo mới.',
          needSetup: true,
        }, { status: 400 });
      }

      const isValid = await bcrypt.compare(secondaryPassword.trim(), user.secondaryPasswordHash);
      if (!isValid) {
        return NextResponse.json({ error: 'Mật khẩu cấp 2 không chính xác!' }, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        message: 'Xác thực mật khẩu cấp 2 thành công!',
        verified: true,
      });
    }

    // ACTION 2: SET OR CHANGE
    if (action === 'set' || action === 'change') {
      if (!newSecondaryPassword || typeof newSecondaryPassword !== 'string' || newSecondaryPassword.trim().length < 4) {
        return NextResponse.json({ error: 'Mật khẩu cấp 2 mới phải có ít nhất 4 ký tự' }, { status: 400 });
      }

      // If changing, verify old secondary password
      if (user.secondaryPasswordHash && action === 'change') {
        if (!currentSecondaryPassword) {
          return NextResponse.json({ error: 'Vui lòng nhập mật khẩu cấp 2 hiện tại để thay đổi' }, { status: 400 });
        }
        const isOldValid = await bcrypt.compare(currentSecondaryPassword.trim(), user.secondaryPasswordHash);
        if (!isOldValid) {
          return NextResponse.json({ error: 'Mật khẩu cấp 2 hiện tại không chính xác' }, { status: 400 });
        }
      }

      const newHash = await bcrypt.hash(newSecondaryPassword.trim(), 10);

      await prisma.user.update({
        where: { id: user.id },
        data: { secondaryPasswordHash: newHash },
      });

      await createAuditLog({
        action: 'UPDATE',
        entityType: 'User',
        entityId: user.id,
        userId: currentUser.userId,
        changes: { message: user.secondaryPasswordHash ? 'Đã đổi mật khẩu cấp 2' : 'Đã thiết lập mật khẩu cấp 2 mới' },
      });

      return NextResponse.json({
        success: true,
        message: user.secondaryPasswordHash ? 'Đổi mật khẩu cấp 2 thành công!' : 'Thiết lập mật khẩu cấp 2 thành công!',
      });
    }

    // ACTION 3: RESET USING PRIMARY LOGIN PASSWORD (SELF-RESET WHEN FORGOTTEN)
    if (action === 'reset-with-login-password') {
      if (!primaryPassword) {
        return NextResponse.json({ error: 'Vui lòng nhập Mật khẩu đăng nhập tài khoản của bạn để xác thực' }, { status: 400 });
      }
      if (!newSecondaryPassword || newSecondaryPassword.trim().length < 4) {
        return NextResponse.json({ error: 'Mật khẩu cấp 2 mới phải có ít nhất 4 ký tự' }, { status: 400 });
      }

      const isPrimaryValid = await bcrypt.compare(primaryPassword.trim(), user.passwordHash);
      if (!isPrimaryValid) {
        return NextResponse.json({ error: 'Mật khẩu đăng nhập tài khoản không chính xác!' }, { status: 400 });
      }

      const newHash = await bcrypt.hash(newSecondaryPassword.trim(), 10);

      await prisma.user.update({
        where: { id: user.id },
        data: { secondaryPasswordHash: newHash },
      });

      await createAuditLog({
        action: 'UPDATE',
        entityType: 'User',
        entityId: user.id,
        userId: currentUser.userId,
        changes: { message: 'Đã tự Reset mật khẩu cấp 2 bằng mật khẩu đăng nhập chính' },
      });

      return NextResponse.json({
        success: true,
        message: 'Đã đặt lại Mật khẩu cấp 2 thành công bằng Mật khẩu đăng nhập!',
      });
    }

    return NextResponse.json({ error: 'Action không hợp lệ' }, { status: 400 });
  } catch (error) {
    console.error('Secondary password action error:', error);
    return NextResponse.json({ error: 'Lỗi máy chủ khi xử lý mật khẩu cấp 2' }, { status: 500 });
  }
}
