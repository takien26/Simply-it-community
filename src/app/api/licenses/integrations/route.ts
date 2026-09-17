import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const settings = await prisma.systemSetting.findMany({
      where: {
        key: {
          in: [
            'license.m365_tenant_id',
            'license.m365_client_id',
            'license.m365_client_secret',
            'license.m365_is_demo',
            'license.m365_auto_sync',
            'license.google_service_account',
            'license.google_admin_email',
            'license.adobe_client_id',
            'license.adobe_org_id',
            'sso.ms365_tenant_id',
            'sso.ms365_client_id',
            'sso.ms365_client_secret',
          ],
        },
      },
    });

    const map = new Map<string, string>();
    settings.forEach((s) => map.set(s.key, s.value));

    // Lấy thông tin M365 (ưu tiên key license, fallback sang SSO nếu có)
    const m365TenantId = map.get('license.m365_tenant_id') || map.get('sso.ms365_tenant_id') || '';
    const m365ClientId = map.get('license.m365_client_id') || map.get('sso.ms365_client_id') || '';
    const m365SecretRaw = map.get('license.m365_client_secret') || map.get('sso.ms365_client_secret') || '';
    const m365IsDemo = map.get('license.m365_is_demo') === 'true';
    const m365AutoSync = map.get('license.m365_auto_sync') === 'true';

    return NextResponse.json({
      m365: {
        tenantId: m365TenantId,
        clientId: m365ClientId,
        clientSecretMasked: m365SecretRaw ? '••••••••••••••••' : '',
        hasSecret: Boolean(m365SecretRaw),
        isDemoMode: m365IsDemo,
        autoSyncEnabled: m365AutoSync,
      },
      google: {
        serviceAccountEmail: map.get('license.google_service_account') || '',
        adminEmail: map.get('license.google_admin_email') || '',
        isDemoMode: true,
      },
      adobe: {
        clientId: map.get('license.adobe_client_id') || '',
        orgId: map.get('license.adobe_org_id') || '',
        isDemoMode: true,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Lỗi đọc cấu hình tích hợp' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { m365, google, adobe } = body;

    const upserts = [];

    if (m365) {
      if (m365.tenantId !== undefined) {
        upserts.push(
          prisma.systemSetting.upsert({
            where: { key: 'license.m365_tenant_id' },
            update: { value: String(m365.tenantId).trim() },
            create: { key: 'license.m365_tenant_id', value: String(m365.tenantId).trim() },
          })
        );
      }
      if (m365.clientId !== undefined) {
        upserts.push(
          prisma.systemSetting.upsert({
            where: { key: 'license.m365_client_id' },
            update: { value: String(m365.clientId).trim() },
            create: { key: 'license.m365_client_id', value: String(m365.clientId).trim() },
          })
        );
      }
      // Chỉ cập nhật secret nếu người dùng nhập mới (không phải chuỗi mask)
      if (m365.clientSecret && !m365.clientSecret.includes('••••')) {
        upserts.push(
          prisma.systemSetting.upsert({
            where: { key: 'license.m365_client_secret' },
            update: { value: String(m365.clientSecret).trim() },
            create: { key: 'license.m365_client_secret', value: String(m365.clientSecret).trim() },
          })
        );
      }
      if (m365.isDemoMode !== undefined) {
        upserts.push(
          prisma.systemSetting.upsert({
            where: { key: 'license.m365_is_demo' },
            update: { value: String(m365.isDemoMode) },
            create: { key: 'license.m365_is_demo', value: String(m365.isDemoMode) },
          })
        );
      }
      if (m365.autoSyncEnabled !== undefined) {
        upserts.push(
          prisma.systemSetting.upsert({
            where: { key: 'license.m365_auto_sync' },
            update: { value: String(m365.autoSyncEnabled) },
            create: { key: 'license.m365_auto_sync', value: String(m365.autoSyncEnabled) },
          })
        );
      }
    }

    if (google) {
      if (google.serviceAccountEmail !== undefined) {
        upserts.push(
          prisma.systemSetting.upsert({
            where: { key: 'license.google_service_account' },
            update: { value: String(google.serviceAccountEmail).trim() },
            create: { key: 'license.google_service_account', value: String(google.serviceAccountEmail).trim() },
          })
        );
      }
      if (google.adminEmail !== undefined) {
        upserts.push(
          prisma.systemSetting.upsert({
            where: { key: 'license.google_admin_email' },
            update: { value: String(google.adminEmail).trim() },
            create: { key: 'license.google_admin_email', value: String(google.adminEmail).trim() },
          })
        );
      }
    }

    if (adobe) {
      if (adobe.clientId !== undefined) {
        upserts.push(
          prisma.systemSetting.upsert({
            where: { key: 'license.adobe_client_id' },
            update: { value: String(adobe.clientId).trim() },
            create: { key: 'license.adobe_client_id', value: String(adobe.clientId).trim() },
          })
        );
      }
      if (adobe.orgId !== undefined) {
        upserts.push(
          prisma.systemSetting.upsert({
            where: { key: 'license.adobe_org_id' },
            update: { value: String(adobe.orgId).trim() },
            create: { key: 'license.adobe_org_id', value: String(adobe.orgId).trim() },
          })
        );
      }
    }

    await Promise.all(upserts);
    return NextResponse.json({ success: true, message: 'Đã lưu cấu hình tích hợp thành công' });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Lỗi lưu cấu hình' }, { status: 500 });
  }
}
