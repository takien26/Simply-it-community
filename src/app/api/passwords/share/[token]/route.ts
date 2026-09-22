import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/db';
import { decrypt } from '@/lib/crypto';

export const dynamic = 'force-dynamic';

function hashPassphrase(phrase: string): string {
  return crypto.createHash('sha256').update(phrase.trim()).digest('hex');
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    if (!token) {
      return NextResponse.json({ error: 'Token không hợp lệ' }, { status: 400 });
    }

    const key = `vault.secret.${token}`;
    const setting = await prisma.systemSetting.findUnique({
      where: { key },
    });

    if (!setting) {
      return NextResponse.json(
        {
          error: 'Liên kết không tồn tại, đã hết hạn hoặc đã bị tiêu hủy vĩnh viễn.',
          burned: true,
        },
        { status: 404 }
      );
    }

    let record: any;
    try {
      record = JSON.parse(setting.value);
    } catch {
      return NextResponse.json(
        { error: 'Dữ liệu bí mật bị lỗi cấu trúc', burned: true },
        { status: 500 }
      );
    }

    // Check expiry
    const expiresAt = new Date(record.expiresAt);
    if (Date.now() > expiresAt.getTime()) {
      // Auto-purge expired record
      await prisma.systemSetting.delete({ where: { key } }).catch(() => {});
      return NextResponse.json(
        {
          error: 'Liên kết bí mật này đã hết thời hạn hiệu lực và đã được tự động tiêu hủy.',
          burned: true,
        },
        { status: 410 }
      );
    }

    const { searchParams } = new URL(req.url);
    const isPeek = searchParams.get('peek') === 'true';

    // If client is just checking status (before clicking "Reveal Secret")
    if (isPeek) {
      return NextResponse.json({
        success: true,
        exists: true,
        hasPassphrase: Boolean(record.hasPassphrase),
        expiresAt: record.expiresAt,
        maxViews: record.maxViews || 1,
      });
    }

    // Attempt to reveal
    const providedPassphrase = searchParams.get('passphrase') || req.headers.get('x-passphrase') || '';

    if (record.hasPassphrase) {
      if (!providedPassphrase) {
        return NextResponse.json(
          { error: 'Bí mật này được bảo vệ bởi mật khẩu phụ. Vui lòng nhập mật khẩu.', requiresPassphrase: true },
          { status: 401 }
        );
      }

      const providedHash = hashPassphrase(providedPassphrase);
      if (providedHash !== record.passphraseHash) {
        return NextResponse.json(
          { error: 'Mật khẩu bảo vệ không chính xác.', incorrectPassphrase: true },
          { status: 403 }
        );
      }
    }

    // Decrypt the payload
    let decryptedPayload: any;
    try {
      const jsonStr = decrypt(record.encryptedData);
      decryptedPayload = JSON.parse(jsonStr);
    } catch (e) {
      console.error('Decryption failed for secret:', e);
      return NextResponse.json(
        { error: 'Không thể giải mã dữ liệu bí mật' },
        { status: 500 }
      );
    }

    // Update view count and burn if limit reached
    const newViewCount = (record.viewCount || 0) + 1;
    const maxViews = record.maxViews || 1;
    const isBurned = newViewCount >= maxViews;

    if (isBurned) {
      // Burn immediately!
      await prisma.systemSetting.delete({ where: { key } }).catch(() => {});
    } else {
      // Update remaining views
      record.viewCount = newViewCount;
      await prisma.systemSetting.update({
        where: { key },
        data: { value: JSON.stringify(record) },
      });
    }

    return NextResponse.json({
      success: true,
      secret: decryptedPayload,
      burned: isBurned,
      remainingViews: Math.max(0, maxViews - newViewCount),
    });
  } catch (error: any) {
    console.error('Error fetching secret link:', error);
    return NextResponse.json(
      { error: 'Lỗi máy chủ khi mở bí mật' },
      { status: 500 }
    );
  }
}
