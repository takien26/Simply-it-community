import { NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth';
import { PRIMARY_COOKIE_NAME, ALL_COOKIE_NAMES } from '@/lib/jwt';
import { createAuditLog } from '@/lib/audit';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email và mật khẩu là bắt buộc' },
        { status: 400 }
      );
    }

    const result = await authenticate(email, password);

    if (!result) {
      return NextResponse.json(
        { error: 'Email hoặc mật khẩu không đúng' },
        { status: 401 }
      );
    }

    // Create audit log
    await createAuditLog({
      action: 'LOGIN',
      entityType: 'User',
      entityId: result.user.userId,
      userId: result.user.userId,
    });

    // Set HTTP-only cookie
    const response = NextResponse.json({
      success: true,
      user: {
        id: result.user.userId,
        email: result.user.email,
        roleName: result.user.roleName,
      },
    });

    const cookieOptions = {
      httpOnly: true,
      secure: false,
      sameSite: 'lax' as const,
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/',
    };

    // Set dedicated port-isolated cookie
    response.cookies.set(PRIMARY_COOKIE_NAME, result.token, cookieOptions);
    // Also set legacy auth-token for backward compatibility
    response.cookies.set('auth-token', result.token, cookieOptions);

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
