// src/app/api/cron/email-inbound/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { processInboundEmails, getImapConfig } from '@/lib/email-inbound';
import { getActiveLicense } from '@/lib/license';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const shouldRun = searchParams.get('run') === 'true';

    // Inbound Email-to-Ticket is an Enterprise feature
    const license = await getActiveLicense();
    if (!license.isEnterprise) {
      return NextResponse.json({
        success: false,
        message: 'Inbound Email-to-Ticket requires an active Enterprise license',
      });
    }

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
