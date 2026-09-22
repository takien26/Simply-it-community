import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

function getRedirectTarget(request: NextRequest, targetPath: string): string {
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
  const proto = request.headers.get('x-forwarded-proto') || (request.url.startsWith('https') ? 'https' : 'http');
  if (host) {
    return `${proto}://${host}${targetPath.startsWith('/') ? targetPath : '/' + targetPath}`;
  }
  return new URL(targetPath, request.url).toString();
}

export async function GET(request: NextRequest) {
  try {
    const ssoEnabled = await prisma.systemSetting.findUnique({ where: { key: 'sso.ms365_enabled' } });
    const clientId = await prisma.systemSetting.findUnique({ where: { key: 'sso.ms365_client_id' } });
    const tenantId = await prisma.systemSetting.findUnique({ where: { key: 'sso.ms365_tenant_id' } });

    if (ssoEnabled?.value !== 'true' || !clientId?.value) {
      return NextResponse.redirect(getRedirectTarget(request, '/login?error=sso_disabled'));
    }

    let tenant = tenantId?.value?.trim() || 'common';
    if (/directory.*tenant/i.test(tenant) || tenant.toLowerCase() === 'tenant id') {
      tenant = 'common';
    }
    const customRedirectUri = await prisma.systemSetting.findUnique({ where: { key: 'sso.ms365_redirect_uri' } });
    let redirectUri = customRedirectUri?.value?.trim();
    if (!redirectUri) {
      const protocol = request.headers.get('x-forwarded-proto') || (request.url.startsWith('https') ? 'https' : 'http');
      const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || 'localhost:3443';
      redirectUri = `${protocol}://${host}/api/auth/sso/ms365/callback`;
    }

    const scope = encodeURIComponent('openid profile email User.Read');
    const authUrl = `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize?client_id=${clientId.value}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&response_mode=query&scope=${scope}&state=${Date.now()}`;

    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('SSO MS365 login error:', error);
    return NextResponse.redirect(getRedirectTarget(request, '/login?error=sso_failed'));
  }
}
