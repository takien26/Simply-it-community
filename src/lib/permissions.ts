import { prisma } from './db';
import { getCurrentUser } from './auth';

export type PermissionCode = string;

/**
 * Get all effective permissions for a user.
 * Logic: (Role permissions + granted overrides) - revoked overrides
 */
export async function getUserPermissions(userId: string): Promise<Set<string>> {
  // 1. Get user with role
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      role: {
        include: {
          permissions: {
            include: { permission: true },
          },
        },
      },
      ownPermissions: {
        include: { permission: true },
      },
    },
  });

  if (!user) return new Set();

  if (user.role?.name === 'Admin') {
    const allPerms = await prisma.permission.findMany({ select: { code: true } });
    const fullSet = new Set<string>(allPerms.map((p) => p.code));
    fullSet.add('*');
    return fullSet;
  }

  // 2. Start with role permissions
  const permissions = new Set<string>(
    user.role.permissions.map((rp) => rp.permission.code)
  );

  // 3. Apply user-specific overrides
  for (const up of user.ownPermissions) {
    if (up.granted) {
      permissions.add(up.permission.code); // Grant additional
    } else {
      permissions.delete(up.permission.code); // Revoke from role
    }
  }

  return permissions;
}

/**
 * Check if a user has a specific permission
 */
export async function hasPermission(
  userId: string,
  permissionCode: PermissionCode
): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { role: true },
  });
  if (user?.role?.name === 'Admin') return true;
  const permissions = await getUserPermissions(userId);
  return permissions.has(permissionCode) || permissions.has('*');
}

/**
 * Check if a user has ANY of the specified permissions
 */
export async function hasAnyPermission(
  userId: string,
  permissionCodes: PermissionCode[]
): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { role: true },
  });
  if (user?.role?.name === 'Admin') return true;
  const permissions = await getUserPermissions(userId);
  return permissionCodes.some((code) => permissions.has(code) || permissions.has('*'));
}

/**
 * Check if a user has ALL of the specified permissions
 */
export async function hasAllPermissions(
  userId: string,
  permissionCodes: PermissionCode[]
): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { role: true },
  });
  if (user?.role?.name === 'Admin') return true;
  const permissions = await getUserPermissions(userId);
  return permissionCodes.every((code) => permissions.has(code) || permissions.has('*'));
}

/**
 * Middleware helper: check permission for the current user
 * Throws an error if the user doesn't have the required permission
 */
export async function requirePermission(
  permissionCode: PermissionCode
): Promise<void> {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    throw new Error('Unauthorized: Not logged in');
  }

  const allowed = await hasPermission(currentUser.userId, permissionCode);
  if (!allowed) {
    throw new Error(`Forbidden: Missing permission '${permissionCode}'`);
  }
}

/**
 * Get all available permissions grouped by module
 */
export async function getAllPermissionsGrouped(): Promise<
  Record<string, { id: string; code: string; name: string }[]>
> {
  const permissions = await prisma.permission.findMany({
    orderBy: [{ module: 'asc' }, { code: 'asc' }],
  });

  const grouped: Record<string, { id: string; code: string; name: string }[]> = {};

  for (const perm of permissions) {
    if (!grouped[perm.module]) {
      grouped[perm.module] = [];
    }
    grouped[perm.module].push({
      id: perm.id,
      code: perm.code,
      name: perm.name,
    });
  }

  return grouped;
}
