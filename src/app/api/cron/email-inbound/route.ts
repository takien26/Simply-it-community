// src/app/api/cron/email-inbound/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { processInboundEmails, getImapConfig } from '@/lib/email-inbound';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const shouldRun = searchParams.get('run') === 'true';

    const config = await getImapConfig();
    if (!config.enabled) {
      return NextResponse.json({
        success: false,
        message: 'Inbound Email polling is disabled in system settings',
      });
    }

    if (!shouldRun) {
      return NextResponse.json({
        status: 'ready',
        enabled: config.enabled,
        pollIntervalMinutes: config.pollIntervalMinutes,
      });
    }

    const result = await processInboundEmails();
    return NextResponse.json(result);
  } catch (err: any) {
    console.error('[Cron Email Inbound Error]:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
