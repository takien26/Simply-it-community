import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: assetId } = await params;

    const asset = await prisma.asset.findUnique({
      where: { id: assetId },
      select: {
        id: true,
        assetTag: true,
        name: true,
        brand: true,
        model: true,
        serialNumber: true,
        status: true,
        category: { select: { id: true, name: true } },
      },
    });

    if (!asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    const [health, activeAlerts, recentResolvedAlerts] = await Promise.all([
      prisma.assetHealth.findUnique({
        where: { assetId },
      }),
      prisma.healthAlert.findMany({
        where: {
          assetId,
          status: 'ACTIVE',
        },
        include: {
          ticket: {
            select: { id: true, ticketNumber: true, title: true, status: true, priority: true },
          },
        },
        orderBy: { lastDetectedAt: 'desc' },
      }),
      prisma.healthAlert.findMany({
        where: {
          assetId,
          status: 'RESOLVED',
        },
        include: {
          ticket: {
            select: { id: true, ticketNumber: true, title: true, status: true },
          },
        },
        orderBy: { resolvedAt: 'desc' },
        take: 10,
      }),
    ]);

    // Check if agent is offline (lastReportedAt > 30 minutes ago)
    let isOffline = false;
    let offlineMinutes = 0;
    if (health?.lastReportedAt) {
      offlineMinutes = Math.floor((Date.now() - new Date(health.lastReportedAt).getTime()) / (60 * 1000));
      if (offlineMinutes > 30) {
        isOffline = true;
      }
    } else {
      isOffline = true;
    }

    return NextResponse.json({
      success: true,
      asset,
      health: health
        ? {
            ...health,
            isOffline,
            offlineMinutes,
          }
        : null,
      activeAlerts,
      recentResolvedAlerts,
    });
  } catch (error: any) {
    console.error('Error fetching asset health:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
