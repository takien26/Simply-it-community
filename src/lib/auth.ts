import { signToken, verifyToken, ALL_COOKIE_NAMES, PRIMARY_COOKIE_NAME, type JWTPayload } from './jwt';
export type { JWTPayload };
import { cookies } from 'next/headers';
import { prisma } from './db';
import bcrypt from 'bcryptjs';
import { authenticateWithLdap, getLdapConfig } from './ldap';

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

export async function authenticate(
  usernameOrEmail: string,
  password: string
): Promise<{ token: string; user: JWTPayload; isLdap?: boolean } | null> {
  const cleanInput = usernameOrEmail.trim();

  // 1. Check local database user by exact email OR case-insensitive
  const localUser = await prisma.user.findFirst({
    where: {
      OR: [
        { email: cleanInput },
        { email: { equals: cleanInput, mode: 'insensitive' } },
      ],
      isActive: true,
    },
    include: { role: true },
  });

  if (localUser) {
    const isLocalPasswordValid = await bcrypt.compare(password, localUser.passwordHash);
    if (isLocalPasswordValid) {
      const payload: JWTPayload = {
        userId: localUser.id,
        email: localUser.email,
        roleId: localUser.roleId,
        roleName: localUser.role.name,
      };
      const token = await signToken(payload);
      return { token, user: payload, isLdap: false };
    }
  }

  // 2. If local password failed or user not in DB, try LDAP / Active Directory
  const ldapConfig = await getLdapConfig();
  if (ldapConfig.enabled) {
    try {
      const ldapRes = await authenticateWithLdap(cleanInput, password);
      if (ldapRes.success && ldapRes.user) {
        let userInDb = localUser;

        // If user not in DB, auto-provision user if enabled
        if (!userInDb && ldapConfig.autoCreateUser) {
          // Find default role
          let targetRole = null;
          if (ldapConfig.defaultRoleId) {
            targetRole = await prisma.role.findUnique({ where: { id: ldapConfig.defaultRoleId } });
          }
          if (!targetRole) {
            targetRole = (await prisma.role.findFirst({ where: { name: 'Staff' } })) ||
                         (await prisma.role.findFirst({ where: { isSystem: true } })) ||
                         (await prisma.role.findFirst());
          }

          if (!targetRole) {
            throw new Error('Hệ thống chưa có vai trò mặc định để cấp cho tài khoản LDAP');
          }

          const defaultPasswordHash = await bcrypt.hash(`Ldap@${Date.now()}`, 10);

          userInDb = await prisma.user.create({
            data: {
              email: ldapRes.user.email,
              fullName: ldapRes.user.fullName,
              department: ldapRes.user.department || 'LDAP Domain User',
              roleId: targetRole.id,
              passwordHash: defaultPasswordHash,
              isActive: true,
            },
            include: { role: true },
          });
        }

        if (userInDb && userInDb.isActive) {
          const payload: JWTPayload = {
            userId: userInDb.id,
            email: userInDb.email,
            roleId: userInDb.roleId,
            roleName: userInDb.role.name,
          };
          const token = await signToken(payload);
          return { token, user: payload, isLdap: true };
        }
      }
    } catch (ldapErr) {
      console.error('LDAP auth exception:', ldapErr);
    }
  }

  return null;
}

export async function getCurrentUser(): Promise<JWTPayload | null> {
  const cookieStore = await cookies();
  let token: string | undefined;
  for (const name of ALL_COOKIE_NAMES) {
    const val = cookieStore.get(name)?.value;
    if (val) {
      token = val;
      break;
    }
  }
  if (!token) return null;
  return verifyToken(token);
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}
