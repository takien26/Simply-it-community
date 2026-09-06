import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const ssoEnabledSetting = await prisma.systemSetting.findUnique({
      where: { key: 'sso.ms365_enabled' },
    });

    const clientIdSetting = await prisma.systemSetting.findUnique({
      where: { key: 'sso.ms365_client_id' },
    });

    const isEnabled = ssoEnabledSetting?.value === 'true' && Boolean(clientIdSetting?.value);

    return NextResponse.json({
      ms365: {
        enabled: isEnabled,
        clientId: clientIdSetting?.value ? clientIdSetting.value.slice(0, 8) + '...' : '',
      },
    });
  } catch {
    return NextResponse.json({ ms365: { enabled: false } });
  }
}
