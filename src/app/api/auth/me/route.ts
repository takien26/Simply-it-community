import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getUserPermissions } from '@/lib/permissions';
import { prisma } from '@/lib/db';

const meCache = new Map<string, { timestamp: number; data: any }>();
const ME_CACHE_TTL_MS = 2 * 1000; // 2s cache

export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const cached = meCache.get(currentUser.userId);
    if (cached && Date.now() - cached.timestamp < ME_CACHE_TTL_MS) {
      return NextResponse.json(cached.data);
    }

    const user = await prisma.user.findUnique({
      where: { id: currentUser.userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        department: true,
        phone: true,
        avatarUrl: true,
        role: {
          select: { id: true, name: true },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const permissions = await getUserPermissions(currentUser.userId);

    const responsePayload = {
      success: true,
      data: {
        ...user,
        permissions: Array.from(permissions),
      },
    };
    meCache.set(currentUser.userId, { timestamp: Date.now(), data: responsePayload });
    return NextResponse.json(responsePayload);
  } catch (error) {
    console.error('Get current user error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
