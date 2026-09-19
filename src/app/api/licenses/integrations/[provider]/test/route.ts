import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { testM365Connection } from '@/lib/license-connectors/m365-connector';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const canManage = currentUser.roleName === 'Admin' || (await hasPermission(currentUser.userId, 'licenses.update'));
    if (!canManage) {
      return NextResponse.json({ error: 'Forbidden: Bạn không có quyền kiểm tra kết nối license' }, { status: 403 });
    }

    const { provider } = await params;
    const body = await req.json().catch(() => ({}));

    if (provider === 'm365') {
      // Đọc secret thực tế từ DB nếu client chỉ gửi chuỗi masked
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

      const result = await testM365Connection({
        tenantId,
        clientId,
        clientSecret,
        isDemoMode,
      });

      return NextResponse.json(result);
    }

    if (provider === 'google') {
      return NextResponse.json({
        success: true,
        message: 'Google Workspace Connector (Simulation Mode): Kết nối mô phỏng thành công!',
      });
    }

    if (provider === 'adobe') {
      return NextResponse.json({
        success: true,
        message: 'Adobe Creative Cloud Connector (Simulation Mode): Kết nối mô phỏng thành công!',
      });
    }

    return NextResponse.json({ success: false, message: `Nhà cung cấp "${provider}" chưa được hỗ trợ.` }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err?.message || 'Lỗi kiểm tra kết nối' }, { status: 500 });
  }
}
