import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { encrypt } from '@/lib/crypto';

export const dynamic = 'force-dynamic';

function hashPassphrase(phrase: string): string {
  return crypto.createHash('sha256').update(phrase.trim()).digest('hex');
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    }

    const allowed = await hasPermission(user.userId, 'passwords.view');
    if (!allowed) {
      return NextResponse.json({ error: 'Bạn không có quyền sử dụng tính năng này' }, { status: 403 });
    }

    const body = await req.json();
    const {
      title,
      username,
      password,
      notes,
      expiresInHours = 24,
      maxViews = 1,
      passphrase,
    } = body;

    if (!password && !notes) {
      return NextResponse.json(
        { error: 'Vui lòng nhập mật khẩu hoặc nội dung cần chia sẻ bí mật' },
        { status: 400 }
      );
    }

    // Generate secure random token (URL-safe base64, 32 bytes)
    const token = crypto.randomBytes(24).toString('base64url');

    const secretPayload = {
      title: title?.trim() || 'Bí mật dùng 1 lần',
      username: username?.trim() || '',
      password: password || '',
      notes: notes?.trim() || '',
      createdByName: user.name || user.email || 'IT Staff',
      createdAt: new Date().toISOString(),
    };

    // Encrypt payload using AES-256-GCM
    const encryptedData = encrypt(JSON.stringify(secretPayload));

    const validHours = Math.min(Math.max(Number(expiresInHours) || 24, 1), 168); // Between 1 hour and 7 days
    const expiresAt = new Date(Date.now() + validHours * 3600 * 1000);

    const settingRecord = {
      encryptedData,
      passphraseHash: passphrase?.trim() ? hashPassphrase(passphrase) : null,
      hasPassphrase: Boolean(passphrase?.trim()),
      expiresAt: expiresAt.toISOString(),
      maxViews: Math.min(Math.max(Number(maxViews) || 1, 1), 10),
      viewCount: 0,
      createdById: user.userId,
      createdAt: new Date().toISOString(),
    };

    await prisma.systemSetting.create({
      data: {
        key: `vault.secret.${token}`,
        value: JSON.stringify(settingRecord),
        type: 'JSON',
        group: 'vault_share',
        label: `Bí mật chia sẻ: ${title?.slice(0, 50) || 'One-time secret'}`,
      },
    });

    return NextResponse.json({
      success: true,
      token,
      shareUrl: `/secret/${token}`,
      expiresAt: expiresAt.toISOString(),
      maxViews: settingRecord.maxViews,
      hasPassphrase: settingRecord.hasPassphrase,
    });
  } catch (error: any) {
    console.error('Error creating one-time secret link:', error);
    return NextResponse.json(
      { error: 'Lỗi máy chủ khi tạo link chia sẻ bí mật' },
      { status: 500 }
    );
  }
}
