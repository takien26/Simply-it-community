import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { syncAndReconcileM365 } from '@/lib/license-connectors/m365-connector';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  try {
    const { provider } = await params;
    const body = await req.json().catch(() => ({}));

    if (provider === 'm365') {
      let clientSecret = body.clientSecret || '';
      if (!clientSecret || clientSecret.includes('••••')) {
        const secretSetting = await prisma.systemSetting.findFirst({
          where: {
            key: { in: ['license.m365_client_secret', 'sso.ms365_client_secret'] },
          },
        });
        clientSecret = secretSetting?.value || '';
      }

      const tenantId = body.tenantId || (await prisma.systemSetting.findFirst({ where: { key: { in: ['license.m365_tenant_id', 'sso.ms365_tenant_id'] } } }))?.value || '';
      const clientId = body.clientId || (await prisma.systemSetting.findFirst({ where: { key: { in: ['license.m365_client_id', 'sso.ms365_client_id'] } } }))?.value || '';
      const isDemoMode = body.isDemoMode !== undefined ? body.isDemoMode : false;

      const report = await syncAndReconcileM365({
        tenantId,
        clientId,
        clientSecret,
        isDemoMode,
      });

      // Lưu thời điểm đồng bộ gần nhất
      await prisma.systemSetting.upsert({
        where: { key: 'license.m365_last_synced_at' },
        update: { value: new Date().toISOString() },
        create: { key: 'license.m365_last_synced_at', value: new Date().toISOString(), label: 'M365 Last Synced At', group: 'license' },
      });

      return NextResponse.json(report);
    }

    if (provider === 'google') {
      return NextResponse.json({
        provider: 'google',
        providerName: 'Google Workspace (Admin SDK)',
        syncedAt: new Date().toISOString(),
        status: 'SUCCESS',
        message: 'Đồng bộ Google Workspace (Mô phỏng) hoàn tất.',
        isDemoMode: true,
        skus: [
          {
            skuId: 'google-gw-standard',
            skuPartNumber: 'Google-Apps-For-Business',
            displayName: 'Google Workspace Business Standard',
            totalPrepaid: 50,
            consumed: 44,
            available: 6,
            unitPriceEstimate: 160000,
            currency: 'VND',
          },
        ],
        totalCloudSeats: 50,
        totalCloudConsumed: 44,
        totalLocalSeats: 50,
        totalLocalConsumed: 42,
        discrepancies: [],
        dormantUsers: [],
        unmatchedUsers: [],
        estimatedPotentialSavings: 0,
        currency: 'VND',
      });
    }

    if (provider === 'adobe') {
      return NextResponse.json({
        provider: 'adobe',
        providerName: 'Adobe Creative Cloud (Admin Console)',
        syncedAt: new Date().toISOString(),
        status: 'SUCCESS',
        message: 'Đồng bộ Adobe Creative Cloud (Mô phỏng) hoàn tất.',
        isDemoMode: true,
        skus: [
          {
            skuId: 'adobe-cce-all',
            skuPartNumber: 'CCE_ALL_APPS',
            displayName: 'Creative Cloud All Apps for Enterprise',
            totalPrepaid: 15,
            consumed: 14,
            available: 1,
            unitPriceEstimate: 1800000,
            currency: 'VND',
          },
        ],
        totalCloudSeats: 15,
        totalCloudConsumed: 14,
        totalLocalSeats: 15,
        totalLocalConsumed: 13,
        discrepancies: [],
        dormantUsers: [],
        unmatchedUsers: [],
        estimatedPotentialSavings: 0,
        currency: 'VND',
      });
    }

    return NextResponse.json({ error: `Nhà cung cấp "${provider}" không hợp lệ.` }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Lỗi đồng bộ dữ liệu Cloud' }, { status: 500 });
  }
}
