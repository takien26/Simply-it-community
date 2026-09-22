import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { signToken, PRIMARY_COOKIE_NAME } from '@/lib/jwt';
import { cookies } from 'next/headers';
import { handleM365Callback, getM365Config, M365AuthError } from '@/lib/auth/ms365-oauth-handler';
import { normalizeEmail, normalizeCompanyName, areCompaniesEqual } from '@/lib/normalize';

function getRedirectTarget(request: NextRequest, customRedirectUri: string | null | undefined, targetPath: string): string {
  if (customRedirectUri?.trim()) {
    try {
      const parsed = new URL(customRedirectUri.trim());
      return `${parsed.origin}${targetPath.startsWith('/') ? targetPath : '/' + targetPath}`;
    } catch {}
  }
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
  const proto = request.headers.get('x-forwarded-proto') || (request.url.startsWith('https') ? 'https' : 'http');
  if (host) {
    return `${proto}://${host}${targetPath.startsWith('/') ? targetPath : '/' + targetPath}`;
  }
  try {
    return new URL(targetPath, request.url).toString();
  } catch {
    return `https://localhost:3443${targetPath.startsWith('/') ? targetPath : '/' + targetPath}`;
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  const customRedirectUriSetting = await prisma.systemSetting.findUnique({ where: { key: 'sso.ms365_redirect_uri' } });
  const customRedirectUri = customRedirectUriSetting?.value?.trim();

  if (error || !code) {
    console.error('MS365 Auth Error:', error, searchParams.get('error_description'));
    return NextResponse.redirect(getRedirectTarget(request, customRedirectUri, `/login?error=${encodeURIComponent(error || 'no_code')}`));
  }

  try {
    const config = await getM365Config();
    if (!config.clientId || !config.clientSecret) {
      return NextResponse.redirect(getRedirectTarget(request, customRedirectUri, '/login?error=sso_misconfigured'));
    }

    let redirectUri = customRedirectUri || config.redirectUri;
    if (!redirectUri) {
      const protocol = request.headers.get('x-forwarded-proto') || (request.url.startsWith('https') ? 'https' : 'http');
      const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || 'localhost:3443';
      redirectUri = `${protocol}://${host}/api/auth/sso/ms365/callback`;
    }

    // 1. Đổi code lấy token, 2. Gọi Graph /me, 3. Kiểm tra Authorization Filter (chặn Guest)
    const { profile, accessToken } = await handleM365Callback(code, redirectUri, config);

    const email = normalizeEmail(profile.email);
    const fullName = profile.displayName;
    const department = profile.department || null;
    const position = profile.jobTitle || null;
    const phone = profile.phone || null;
    const companyName = profile.companyName ? normalizeCompanyName(profile.companyName) : null;
    const officeLocation = profile.officeLocation || null;
    const isAccountEnabled = profile.accountEnabled;

    if (!email) {
      return NextResponse.redirect(new URL('/login?error=email_not_found', request.url));
    }

    // Resolve Location if officeLocation provided
    let locationId: string | null = null;
    if (officeLocation) {
      const locName = officeLocation.trim();
      let loc = await prisma.location.findFirst({
        where: { name: { equals: locName, mode: 'insensitive' } },
      });
      if (!loc) {
        loc = await prisma.location.create({
          data: {
            name: locName,
            notes: 'Tự động tạo từ Microsoft 365 SSO',
          },
        });
      }
      locationId = loc.id;
    }

    // Resolve Manager from Microsoft Graph
    let managerId: string | null = null;
    try {
      const mgrRes = await fetch('https://graph.microsoft.com/v1.0/me/manager?$select=id,displayName,mail,userPrincipalName', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (mgrRes.ok) {
        const mgrData = await mgrRes.json();
        const mgrEmail = (mgrData.mail || mgrData.userPrincipalName || '').toLowerCase().trim();
        if (mgrEmail) {
          const mgrUser = await prisma.user.findUnique({ where: { email: mgrEmail } });
          if (mgrUser) managerId = mgrUser.id;
        }
      }
    } catch {}

    // 3. Find or auto-create User in database
    let user = await prisma.user.findUnique({
      where: { email },
      include: { role: true },
    });

    if (!user) {
      // Check if user changed email or has alternate UPN format
      const upnEmail = normalizeEmail(profile.userPrincipalName);
      if (upnEmail && upnEmail !== email) {
        user = await prisma.user.findUnique({
          where: { email: upnEmail },
          include: { role: true },
        });
      }

      if (!user && fullName) {
        user = await prisma.user.findFirst({
          where: {
            fullName: { equals: fullName, mode: 'insensitive' },
            companyName: companyName ? { equals: companyName, mode: 'insensitive' } : undefined,
          },
          include: { role: true },
        });
      }

      if (user) {
        // User changed email on M365 -> Update their email to the new one!
        await prisma.user.update({
          where: { id: user.id },
          data: { email },
        });
        user.email = email;
      }
    }

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
          companyName,
          phone,
          locationId,
          managerId,
          isActive: isAccountEnabled,
        },
        include: { role: true },
      });
    } else {
      // Always synchronize and refresh latest profile info from Microsoft Graph on login
      const updates: any = {};
      if (user.isActive !== isAccountEnabled) updates.isActive = isAccountEnabled;
      if (fullName && user.fullName !== fullName) updates.fullName = fullName;
      if (department && user.department !== department) updates.department = department;
      if (position && user.position !== position) updates.position = position;
      if (companyName && (!user.companyName || !areCompaniesEqual(user.companyName, companyName))) {
        updates.companyName = normalizeCompanyName(companyName);
      }
      if (phone && user.phone !== phone) updates.phone = phone;
      if (locationId && user.locationId !== locationId) updates.locationId = locationId;
      if (managerId && user.managerId !== managerId && managerId !== user.id) updates.managerId = managerId;

      if (Object.keys(updates).length > 0) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: updates,
          include: { role: true },
        });
      }
    }

    if (!user.isActive || !isAccountEnabled) {
      return NextResponse.redirect(getRedirectTarget(request, customRedirectUri, '/login?error=user_disabled'));
    }

    // 4. Issue JWT Token & Set Cookie
    const token = await signToken({
      userId: user.id,
      email: user.email,
      roleId: user.roleId,
      roleName: user.role.name,
    });

    const cookieStore = await cookies();
    const isHttps = request.url.startsWith('https://') || request.headers.get('x-forwarded-proto') === 'https';
    const cookieOptions = {
      httpOnly: true,
      secure: isHttps,
      sameSite: 'lax' as const,
      path: '/',
      maxAge: 30 * 24 * 60 * 60, // 30 days
    };
    cookieStore.set(PRIMARY_COOKIE_NAME, token, cookieOptions);
    cookieStore.set('auth-token', token, cookieOptions);

    return NextResponse.redirect(getRedirectTarget(request, customRedirectUri, '/dashboard'));
  } catch (error: any) {
    console.error('SSO callback processing error:', error);
    if (request.headers.get('accept')?.includes('application/json')) {
      return NextResponse.json(
        { error: error?.message || 'Lỗi xử lý xác thực SSO', code: error?.code || 'AUTH_ERROR' },
        { status: error?.statusCode || 500 }
      );
    }
    if (error?.code === 'GUEST_FORBIDDEN' || error?.statusCode === 403) {
      return NextResponse.redirect(getRedirectTarget(request, customRedirectUri, '/login?error=guest_forbidden'));
    }
    return NextResponse.redirect(
      getRedirectTarget(request, customRedirectUri, `/login?error=${encodeURIComponent(error?.code || error?.message || 'sso_exception')}`)
    );
  }
}
