import { SignJWT, jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'fallback-secret-change-in-production'
);

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export interface JWTPayload {
  userId: string;
  email: string;
  roleId: string;
  roleName: string;
}

export async function signToken(payload: JWTPayload): Promise<string> {
  const expiresIn = JWT_EXPIRES_IN;
  let expirationTime = '7d';

  if (expiresIn.endsWith('d')) {
    expirationTime = expiresIn;
  } else if (expiresIn.endsWith('h')) {
    expirationTime = expiresIn;
  }

  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expirationTime)
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as JWTPayload;
  } catch {
    return null;
  }
}
