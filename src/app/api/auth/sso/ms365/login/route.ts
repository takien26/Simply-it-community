import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const ssoEnabled = await prisma.systemSetting.findUnique({ where: { key: 'sso.ms365_enabled' } });
    const clientId = await prisma.systemSetting.findUnique({ where: { key: 'sso.ms365_client_id' } });
    const tenantId = await prisma.systemSetting.findUnique({ where: { key: 'sso.ms365_tenant_id' } });

    if (ssoEnabled?.value !== 'true' || !clientId?.value) {
      return NextResponse.redirect(new URL('/login?error=sso_disabled', request.url));
    }

    const tenant = tenantId?.value || 'common';
    const protocol = request.headers.get('x-forwarded-proto') || 'http';
    const host = request.headers.get('host') || 'localhost:3000';
    const redirectUri = `${protocol}://${host}/api/auth/sso/ms365/callback`;

    const scope = encodeURIComponent('openid profile email User.Read');
    const authUrl = `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize?client_id=${clientId.value}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&response_mode=query&scope=${scope}&state=${Date.now()}`;

    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('SSO MS365 login error:', error);
    return NextResponse.redirect(new URL('/login?error=sso_failed', request.url));
  }
}
