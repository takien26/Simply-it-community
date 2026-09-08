import { SignJWT, jwtVerify } from 'jose';

export const PRIMARY_COOKIE_NAME = 'simply_ce_token';
export const ALL_COOKIE_NAMES = ['simply_ce_token', 'simply_it_token', 'auth-token'];

const PRIMARY_SECRET_STR = process.env.JWT_SECRET || 'simply-it-community-secret-key-2026-test';
const PRIMARY_JWT_SECRET = new TextEncoder().encode(PRIMARY_SECRET_STR);

// Fallback secrets to ensure tokens signed by either port or secret never get rejected
const ALL_SECRET_KEYS = Array.from(new Set([
  PRIMARY_SECRET_STR,
  'simply-it-community-secret-key-2026-test',
  'my-super-secret-jwt-key-2024-change-in-production',
  'fallback-secret-change-in-production',
])).map(s => new TextEncoder().encode(s));

export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '30d';

export interface JWTPayload {
  userId: string;
  email: string;
  roleId: string;
  roleName: string;
}

export async function signToken(payload: JWTPayload): Promise<string> {
  const expiresIn = JWT_EXPIRES_IN.endsWith('d') || JWT_EXPIRES_IN.endsWith('h') ? JWT_EXPIRES_IN : '30d';

  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(PRIMARY_JWT_SECRET);
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  if (!token || typeof token !== 'string') return null;

  for (const secret of ALL_SECRET_KEYS) {
    try {
      const { payload } = await jwtVerify(token, secret);
      if (payload && payload.userId) {
        return payload as unknown as JWTPayload;
      }
    } catch {
      // Continue to test next known secret
    }
  }

  return null;
}
