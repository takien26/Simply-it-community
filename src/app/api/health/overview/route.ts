import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

    const [allHealths, activeAlerts] = await Promise.all([
      prisma.assetHealth.findMany({
        include: {
          asset: {
            select: {
              id: true,
              assetTag: true,
              name: true,
              brand: true,
              model: true,
              companyName: true,
              status: true,
            },
          },
        },
        orderBy: { lastReportedAt: 'desc' },
      }),
      prisma.healthAlert.findMany({
        where: { status: 'ACTIVE' },
        include: {
          asset: {
            select: { id: true, assetTag: true, name: true, companyName: true },
          },
          ticket: {
            select: { id: true, ticketNumber: true, status: true, priority: true },
          },
        },
        orderBy: { lastDetectedAt: 'desc' },
      }),
    ]);

    let healthyCount = 0;
    let warningCount = 0;
    let criticalCount = 0;
    let offlineCount = 0;

    const storageIssues: any[] = [];
    const securityIssues: any[] = [];
    const cpuIssues: any[] = [];
    const memoryIssues: any[] = [];

    for (const h of allHealths) {
      const isOffline = new Date(h.lastReportedAt) < thirtyMinutesAgo;
      if (isOffline) {
        offlineCount++;
      } else if (h.status === 'CRITICAL') {
        criticalCount++;
      } else if (h.status === 'WARNING') {
        warningCount++;
      } else {
        healthyCount++;
      }

      // Check specific issues for quick filtering in Control Center
      if (Array.isArray(h.storage)) {
        for (const drive of h.storage as any[]) {
          if (drive.usedPercent >= 80) {
            storageIssues.push({
              assetId: h.assetId,
              assetTag: h.asset.assetTag,
              assetName: h.asset.name,
              drive: drive.drive,
              usedPercent: drive.usedPercent,
              freeGB: drive.freeGB,
              totalGB: drive.totalGB,
            });
          }
        }
      }

      const sec = (h.securityStatus as any) || {};
      const defDisabled = sec.defender?.enabled === false || sec.defender?.realTimeProtection === false;
      const fwDisabled = sec.firewall?.domain === false || sec.firewall?.private === false || sec.firewall?.public === false;
      if (defDisabled || fwDisabled) {
        securityIssues.push({
          assetId: h.assetId,
          assetTag: h.asset.assetTag,
          assetName: h.asset.name,
          defenderDisabled: defDisabled,
          firewallDisabled: fwDisabled,
        });
      }

      if (h.cpuUsagePercent && h.cpuUsagePercent >= 85) {
        cpuIssues.push({
          assetId: h.assetId,
          assetTag: h.asset.assetTag,
          assetName: h.asset.name,
          cpuPercent: h.cpuUsagePercent,
        });
      }

      if (h.ramUsedPercent && h.ramUsedPercent >= 85) {
        memoryIssues.push({
          assetId: h.assetId,
          assetTag: h.asset.assetTag,
          assetName: h.asset.name,
          ramPercent: h.ramUsedPercent,
        });
      }
    }

    return NextResponse.json({
      success: true,
      summary: {
        totalMonitored: allHealths.length,
        healthy: healthyCount,
        warning: warningCount,
        critical: criticalCount,
        offline: offlineCount,
        activeAlertsCount: activeAlerts.length,
      },
      activeAlerts,
      storageIssues,
      securityIssues,
      cpuIssues,
      memoryIssues,
      healthList: allHealths.slice(0, 50),
    });
  } catch (error: any) {
    console.error('Error fetching health overview:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
