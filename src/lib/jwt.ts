import { SignJWT, jwtVerify } from 'jose';

export const PRIMARY_COOKIE_NAME = 'simply_ce_token';
export const ALL_COOKIE_NAMES = ['simply_ce_token', 'simply_it_token', 'auth-token'];

// Known weak or sample defaults that must never be trusted in production
const INSECURE_DEFAULT_SECRETS = new Set([
  'simply-it-dev-secret',
  'itsm-enterprise-super-secret-key-2026',
  'your-super-secret-jwt-key-change-this-in-production',
]);

export function getJwtSecretKey(): Uint8Array {
  const envSecret = process.env.JWT_SECRET?.trim();
  const isProd = process.env.NODE_ENV === 'production';

  // If a valid custom secret is provided and not a known default, use it
  if (envSecret && !INSECURE_DEFAULT_SECRETS.has(envSecret)) {
    return new TextEncoder().encode(envSecret);
  }

  // In development, allow the secret if provided
  if (!isProd && envSecret) {
    return new TextEncoder().encode(envSecret);
  }

  // Fallback: Generate or retrieve a secure 512-bit random secret so that known defaults
  // can NEVER be exploited by an attacker to forge tokens.
  const globalRef = globalThis as any;
  if (!globalRef.__simply_auto_jwt_secret) {
    const randomBytes = new Uint8Array(64);
    if (typeof globalThis.crypto?.getRandomValues === 'function') {
      globalThis.crypto.getRandomValues(randomBytes);
    } else {
      for (let i = 0; i < 64; i++) {
        randomBytes[i] = Math.floor(Math.random() * 256);
      }
    }
    globalRef.__simply_auto_jwt_secret = randomBytes;
    if (isProd) {
      console.warn(
        '⚠️ [Security Notice] JWT_SECRET was missing or set to a known template default. An isolated 512-bit cryptographic key was automatically generated to guarantee zero token-forgery risk.'
      );
    }
  }

  return globalRef.__simply_auto_jwt_secret;
}

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
  const secretKey = getJwtSecretKey();

  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(secretKey);
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  if (!token || typeof token !== 'string') return null;
  const secretKey = getJwtSecretKey();

  try {
    const { payload } = await jwtVerify(token, secretKey);
    if (payload && payload.userId) {
      return payload as unknown as JWTPayload;
    }
  } catch {
    // Invalid or expired token
  }

  return null;
}
