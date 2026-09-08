import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken, ALL_COOKIE_NAMES, PRIMARY_COOKIE_NAME } from '@/lib/jwt';

// Routes that don't require authentication
const publicRoutes = ['/login', '/api/auth/login', '/api/license', '/api/auto-scan', '/api/v1/auto-scan', '/api/scripts', '/api/cron'];

// API routes that need auth
const protectedApiPrefix = '/api/';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes
  if (publicRoutes.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Allow static files and Next.js internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/images') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Check auth token
  let token: string | undefined;
  for (const name of ALL_COOKIE_NAMES) {
    const val = request.cookies.get(name)?.value;
    if (val) {
      token = val;
      break;
    }
  }

  if (!token) {
    // API routes return 401
    if (pathname.startsWith(protectedApiPrefix)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    // Page routes redirect to login
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Verify token against all known valid secrets
  const payload = await verifyToken(token);
  if (!payload) {
    // API routes return 401 WITHOUT aggressively deleting the cookie (prevents wiping session on transient network errors)
    if (pathname.startsWith(protectedApiPrefix)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Page routes redirect to login and clear the session cookie
    const response = NextResponse.redirect(new URL('/login', request.url));
    for (const name of ALL_COOKIE_NAMES) {
      response.cookies.delete(name);
    }
    return response;
  }

  // Redirect Staff users to /portal when accessing root or dashboard
  if (payload.roleName === 'Staff' && (pathname === '/' || pathname === '/dashboard')) {
    return NextResponse.redirect(new URL('/portal', request.url));
  }

  // Add user info to headers for downstream use
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-user-id', payload.userId);
  requestHeaders.set('x-user-email', payload.email);
  requestHeaders.set('x-user-role', payload.roleName);

  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
