import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getOrInitPolicies } from '@/lib/health/alert-engine';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const policies = await getOrInitPolicies();
    const offlinePolicy = policies.find((p) => p.metric === 'AGENT_OFFLINE');

    if (!offlinePolicy || !offlinePolicy.isEnabled) {
      return NextResponse.json({ executed: true, message: 'Policy AGENT_OFFLINE đang tắt' });
    }

    const warnThresholdMinutes = offlinePolicy.warningThreshold || 30;
    const critThresholdMinutes = offlinePolicy.criticalThreshold || 120;

    const warnCutoff = new Date(Date.now() - warnThresholdMinutes * 60 * 1000);
    const critCutoff = new Date(Date.now() - critThresholdMinutes * 60 * 1000);

    // 1. Tìm các máy đã quá hạn không báo cáo
    const staleHealths = await prisma.assetHealth.findMany({
      where: {
        lastReportedAt: { lt: warnCutoff },
        asset: { status: 'IN_USE' }, // chỉ giám sát máy đang hoạt động
      },
      include: {
        asset: { select: { id: true, assetTag: true, name: true } },
      },
    });

    const now = new Date();
    let offlineCount = 0;

    for (const h of staleHealths) {
      const isCrit = new Date(h.lastReportedAt) < critCutoff;
      const severity = isCrit ? 'CRITICAL' : 'WARNING';
      const offlineMinutes = Math.floor((now.getTime() - new Date(h.lastReportedAt).getTime()) / (60 * 1000));

      // Cập nhật trạng thái OFFLINE
      await prisma.assetHealth.update({
        where: { id: h.id },
        data: { status: 'OFFLINE' },
      });

      const fingerprint = `${h.assetId}:AGENT_OFFLINE:heartbeat`;
      const existingAlert = await prisma.healthAlert.findFirst({
        where: {
          assetId: h.assetId,
          fingerprint,
          status: 'ACTIVE',
        },
      });

      if (existingAlert) {
        await prisma.healthAlert.update({
          where: { id: existingAlert.id },
          data: {
            occurrenceCount: existingAlert.occurrenceCount + 1,
            lastDetectedAt: now,
            severity,
            currentValue: offlineMinutes,
            currentValueText: `${offlineMinutes} phút không phản hồi`,
          },
        });
      } else {
        await prisma.healthAlert.create({
          data: {
            assetId: h.assetId,
            fingerprint,
            metric: 'AGENT_OFFLINE',
            resource: 'Heartbeat',
            severity,
            status: 'ACTIVE',
            currentValue: offlineMinutes,
            currentValueText: `${offlineMinutes} phút không phản hồi`,
            thresholdValue: isCrit ? critThresholdMinutes : warnThresholdMinutes,
            thresholdValueText: `${isCrit ? critThresholdMinutes : warnThresholdMinutes} phút`,
            message: `Máy tính ${h.asset.name} (${h.asset.assetTag}) đã mất kết nối với hệ thống ${offlineMinutes} phút`,
            occurrenceCount: 1,
            firstDetectedAt: now,
            lastDetectedAt: now,
          },
        });
      }
      offlineCount++;
    }

    return NextResponse.json({
      success: true,
      executed: true,
      staleAssetsFound: staleHealths.length,
      offlineCount,
    });
  } catch (error: any) {
    console.error('Error running health offline cron:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
