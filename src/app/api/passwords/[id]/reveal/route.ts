import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { hasPermission, isAdminOrAbove } from '@/lib/permissions';
import { createAuditLog } from '@/lib/audit';
import { decrypt, decryptOptional } from '@/lib/crypto';

// POST /api/passwords/[id]/reveal - On-demand decrypt with audit trail logging
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    }

    const allowed = isAdminOrAbove(user.roleName) || (await hasPermission(user.userId, 'passwords.view'));
    if (!allowed) {
      return NextResponse.json(
        { error: 'Forbidden: Bạn không có quyền xem mật khẩu tài khoản' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const item = await prisma.passwordEntry.findUnique({
      where: { id },
      include: {
        service: { select: { name: true } },
        asset: { select: { assetTag: true, name: true } },
      },
    });

    if (!item) {
      return NextResponse.json({ error: 'Không tìm thấy tài khoản mật khẩu' }, { status: 404 });
    }

    const plainPassword = decrypt(item.password);
    const plainTotp = decryptOptional(item.totpSecret);

    // Create Audit Log for security compliance (ISO 27001 / SOC 2 / ITIL)
    await createAuditLog({
      action: 'LOGIN', // or VIEW action
      entityType: 'PasswordEntry',
      entityId: id,
      userId: user.userId,
      changes: {
        event: 'REVEAL_SECRET',
        title: item.title,
        username: item.username,
        target: item.service?.name || item.asset?.assetTag || item.url || 'Internal Vault',
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: item.id,
        password: plainPassword,
        totpSecret: plainTotp,
      },
    });
  } catch (error: any) {
    console.error('Reveal password error:', error);
    return NextResponse.json({ error: error.message || 'Lỗi khi giải mã mật khẩu' }, { status: 500 });
  }
}
