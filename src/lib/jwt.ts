import { SignJWT, jwtVerify } from 'jose';

export const PRIMARY_COOKIE_NAME = 'simply_ce_token';
export const ALL_COOKIE_NAMES = ['simply_ce_token', 'simply_it_token', 'auth-token'];

// ponytail: fallback 'simply-it-dev-secret' only for local dev; prod MUST set JWT_SECRET
const PRIMARY_SECRET_STR = process.env.JWT_SECRET || 'simply-it-dev-secret';
const PRIMARY_JWT_SECRET = new TextEncoder().encode(PRIMARY_SECRET_STR);

export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '30d';

export interface JWTPayload {
  userId: string;
  email: string;
  roleId: string;
  roleName: string;
  fullName?: string;
  name?: string;
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

  try {
    const { payload } = await jwtVerify(token, PRIMARY_JWT_SECRET);
    if (payload && payload.userId) {
      return payload as unknown as JWTPayload;
    }
  } catch {
    // Invalid or expired token
  }

  return null;
}
