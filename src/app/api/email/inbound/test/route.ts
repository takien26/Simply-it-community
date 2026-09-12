// src/app/api/email/inbound/test/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { testImapConnection, getImapConfig } from '@/lib/email-inbound';

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { host, port, secure, user, pass, mailbox } = body;

    const baseConfig = await getImapConfig();
    const effectivePass = pass !== undefined && pass !== '' ? pass : baseConfig.pass;

    const testConfig = {
      ...baseConfig,
      host: host ? String(host).trim() : baseConfig.host,
      port: port ? parseInt(port, 10) : baseConfig.port,
      secure: secure !== undefined ? Boolean(secure) : baseConfig.secure,
      user: user ? String(user).trim() : baseConfig.user,
      pass: effectivePass,
      mailbox: mailbox || baseConfig.mailbox || 'INBOX',
    };

    const result = await testImapConnection(testConfig);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Test IMAP error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Lỗi kiểm tra kết nối IMAP' },
      { status: 500 }
    );
  }
}
