// src/app/api/email/inbound/sync/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { processInboundEmails, getImapConfig } from '@/lib/email-inbound';
import { hasPermission } from '@/lib/permissions';

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const canSync = currentUser.roleName === 'Admin' || (await hasPermission(currentUser.userId, 'settings.update')) || (await hasPermission(currentUser.userId, 'tickets.create'));
    if (!canSync) {
      return NextResponse.json({ error: 'Forbidden: Bạn không có quyền đồng bộ hòm thư' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const customConfig = body && Object.keys(body).length > 0 ? body : undefined;

    // Trigger sync
    const result = await processInboundEmails(customConfig);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Inbound Email Sync error:', error);
    return NextResponse.json(
      { success: false, errors: [error.message || 'Lỗi đồng bộ hộp thư email'] },
      { status: 500 }
    );
  }
}
