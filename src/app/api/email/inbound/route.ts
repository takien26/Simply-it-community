// src/app/api/email/inbound/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getImapConfig } from '@/lib/email-inbound';

export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const config = await getImapConfig();

    const lastTime = await prisma.systemSetting.findUnique({
      where: { key: 'email.imap_last_sync_time' },
    });

    const lastResultSetting = await prisma.systemSetting.findUnique({
      where: { key: 'email.imap_last_sync_result' },
    });

    let lastResult = null;
    if (lastResultSetting?.value) {
      try {
        lastResult = JSON.parse(lastResultSetting.value);
      } catch {}
    }

    return NextResponse.json({
      success: true,
      config,
      lastSyncTime: lastTime?.value || null,
      lastSyncResult: lastResult,
    });
  } catch (error: any) {
    console.error('Get Inbound Email config error:', error);
    return NextResponse.json({ error: error.message || 'Failed to get config' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      host,
      port,
      secure,
      user,
      password,
      enabled,
      pollIntervalMinutes,
      defaultCategory,
      defaultPriority,
      autoCreateUser,
      mailbox,
    } = body;

    const settingsToSave = [
      { key: 'email.imap_host', value: (host || '').trim(), label: 'Máy chủ IMAP (Host)' },
      { key: 'email.imap_port', value: String(port || '993').trim(), label: 'Cổng IMAP (Port)' },
      { key: 'email.imap_secure', value: String(secure ?? true), label: 'Bật mã hóa SSL/TLS IMAP' },
      { key: 'email.imap_user', value: (user || '').trim(), label: 'Tài khoản IMAP' },
      { key: 'email.imap_enabled', value: String(enabled ?? false), label: 'Bật nhận Ticket qua Email' },
      { key: 'email.imap_poll_interval', value: String(pollIntervalMinutes || '2'), label: 'Tần suất quét hòm thư (phút)' },
      { key: 'email.imap_default_category', value: defaultCategory || 'HARDWARE', label: 'Danh mục Ticket mặc định' },
      { key: 'email.imap_default_priority', value: defaultPriority || 'MEDIUM', label: 'Mức ưu tiên Ticket mặc định' },
      { key: 'email.imap_auto_create_user', value: String(autoCreateUser ?? true), label: 'Tự động tạo User cho người gửi mới' },
      { key: 'email.imap_mailbox', value: mailbox || 'INBOX', label: 'Thư mục hòm thư' },
    ];

    if (password !== undefined && password !== '') {
      settingsToSave.push({
        key: 'email.imap_password',
        value: password,
        label: 'Mật khẩu IMAP',
      });
    }

    for (const item of settingsToSave) {
      await prisma.systemSetting.upsert({
        where: { key: item.key },
        update: { value: item.value },
        create: {
          key: item.key,
          value: item.value,
          group: 'email',
          label: item.label,
        },
      });
    }

    return NextResponse.json({ success: true, message: 'Đã lưu cấu hình Inbound Email thành công' });
  } catch (error: any) {
    console.error('Save Inbound Email config error:', error);
    return NextResponse.json({ error: error.message || 'Failed to save config' }, { status: 500 });
  }
}
