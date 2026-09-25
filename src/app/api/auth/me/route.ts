import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getUserPermissions, isAdminOrAbove } from '@/lib/permissions';
import { prisma } from '@/lib/db';
import { getCachedMe, setCachedMe } from '@/lib/me-cache';

export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const cached = getCachedMe(currentUser.userId);
    if (cached) {
      return NextResponse.json(cached);
    }

    const user = await prisma.user.findUnique({
      where: { id: currentUser.userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        department: true,
        position: true,
        phone: true,
        avatarUrl: true,
        managerId: true,
        manager: {
          select: {
            id: true,
            fullName: true,
            email: true,
            department: true,
            position: true,
          },
        },
        role: {
          select: { id: true, name: true },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const permissions = await getUserPermissions(currentUser.userId);

    // Determine authProvider and password status
    const authRecord = await prisma.user.findUnique({
      where: { id: currentUser.userId },
      select: { passwordHash: true },
    });

    let authProvider: 'LOCAL' | 'SSO' | 'LDAP' = 'LOCAL';
    const deptLower = (user.department || '').toLowerCase();

    if (authRecord?.passwordHash?.startsWith('SSO_')) {
      authProvider = 'SSO';
    } else if (deptLower.includes('ldap') || deptLower.includes('active directory')) {
      authProvider = 'LDAP';
    } else {
      authProvider = 'LOCAL';
    }

    let isDefaultPassword = false;
    if (authProvider === 'LOCAL' && authRecord?.passwordHash) {
      if (isAdminOrAbove(user.role?.name)) {
        try {
          const bcrypt = await import('bcryptjs');
          isDefaultPassword = await bcrypt.default.compare('Admin@123', authRecord.passwordHash);
        } catch {}
      }
    }

    const responsePayload = {
      success: true,
      data: {
        ...user,
        permissions: Array.from(permissions),
        isDefaultPassword,
        authProvider,
      },
    };
    setCachedMe(currentUser.userId, responsePayload);
    return NextResponse.json(responsePayload);
  } catch (error) {
    console.error('Get current user error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
