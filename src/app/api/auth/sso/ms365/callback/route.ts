import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { signToken } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error || !code) {
    console.error('MS365 Auth Error:', error, searchParams.get('error_description'));
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error || 'no_code')}`, request.url));
  }

  try {
    const clientId = await prisma.systemSetting.findUnique({ where: { key: 'sso.ms365_client_id' } });
    const clientSecret = await prisma.systemSetting.findUnique({ where: { key: 'sso.ms365_client_secret' } });
    const tenantId = await prisma.systemSetting.findUnique({ where: { key: 'sso.ms365_tenant_id' } });

    if (!clientId?.value || !clientSecret?.value) {
      return NextResponse.redirect(new URL('/login?error=sso_misconfigured', request.url));
    }

    const tenant = tenantId?.value || 'common';
    const protocol = request.headers.get('x-forwarded-proto') || 'http';
    const host = request.headers.get('host') || 'localhost:3000';
    const redirectUri = `${protocol}://${host}/api/auth/sso/ms365/callback`;

    // 1. Exchange code for token
    const tokenParams = new URLSearchParams({
      client_id: clientId.value,
      client_secret: clientSecret.value,
      code,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    });

    const tokenRes = await fetch(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: tokenParams.toString(),
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || !tokenData.access_token) {
      console.error('Failed to get MS365 token:', tokenData);
      return NextResponse.redirect(new URL('/login?error=token_exchange_failed', request.url));
    }

    // 2. Get user info from Microsoft Graph
    const graphRes = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    const graphUser = await graphRes.json();
    const email = (graphUser.mail || graphUser.userPrincipalName || '').toLowerCase();
    const fullName = graphUser.displayName || email.split('@')[0];
    const department = graphUser.department || null;
    const position = graphUser.jobTitle || null;

    if (!email) {
      return NextResponse.redirect(new URL('/login?error=email_not_found', request.url));
    }

    // 3. Find or auto-create User in database
    let user = await prisma.user.findUnique({
      where: { email },
      include: { role: true },
    });

    if (!user) {
      // Find default role 'Staff' or first role
      let defaultRole = await prisma.role.findUnique({ where: { name: 'Staff' } });
      if (!defaultRole) {
        defaultRole = await prisma.role.findFirst();
      }

      if (!defaultRole) {
        return NextResponse.redirect(new URL('/login?error=no_role_configured', request.url));
      }

      user = await prisma.user.create({
        data: {
          email,
          fullName,
          passwordHash: 'SSO_MS365_AUTH_NO_PASSWORD',
          roleId: defaultRole.id,
          department,
          position,
          isActive: true,
        },
        include: { role: true },
      });
    }

    if (!user.isActive) {
      return NextResponse.redirect(new URL('/login?error=user_disabled', request.url));
    }

    // 4. Issue JWT Token & Set Cookie
    const token = await signToken({
      userId: user.id,
      email: user.email,
      roleId: user.roleId,
      roleName: user.role.name,
    });

    const cookieStore = await cookies();
    cookieStore.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return NextResponse.redirect(new URL('/dashboard', request.url));
  } catch (error) {
    console.error('SSO callback processing error:', error);
    return NextResponse.redirect(new URL('/login?error=sso_exception', request.url));
  }
}
