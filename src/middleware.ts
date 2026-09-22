import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken, ALL_COOKIE_NAMES, PRIMARY_COOKIE_NAME } from '@/lib/jwt';

// Routes that don't require authentication
const publicRoutes = [
  '/login',
  '/api/auth/login',
  '/api/auth/sso',
  '/api/license',
  '/api/auto-scan',
  '/api/v1/auto-scan',
  '/api/scripts',
  '/secret',
  '/api/passwords/share',
];

const CRON_SECRET = process.env.CRON_SECRET || 'simply-internal-cron';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Cron routes: allow if internal cron secret matches, otherwise require session authentication below
  if (pathname.startsWith('/api/cron')) {
    if (request.headers.get('x-cron-secret') === CRON_SECRET) {
      return NextResponse.next();
    }
    // Fall through to normal auth check below (requires logged-in user)
  }

  // Allow public routes
  if (publicRoutes.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Allow static files and Next.js internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/images') ||
    /\.(ico|png|jpe?g|gif|svg|webp|css|js|woff2?|ttf|eot|map)$/i.test(pathname)
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
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    // Page routes redirect to login
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Verify token
  const payload = await verifyToken(token);
  if (!payload) {
    // API routes return 401 WITHOUT aggressively deleting the cookie (prevents wiping session on transient network errors)
    if (pathname.startsWith('/api/')) {
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

  // For backup and restore streams, bypass header rewriting so Next.js does not buffer/truncate request body at 10MB
  if (pathname.startsWith('/api/system/backup')) {
    return NextResponse.next();
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
