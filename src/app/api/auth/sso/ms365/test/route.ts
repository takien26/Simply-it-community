import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, message: 'Bạn cần đăng nhập với quyền quản trị' }, { status: 401 });
    }

    const body = await req.json();
    const clientId = (body.clientId || body['sso.ms365_client_id'] || '').trim();
    const clientSecret = (body.clientSecret || body['sso.ms365_client_secret'] || '').trim();
    const tenantId = (body.tenantId || body['sso.ms365_tenant_id'] || 'common').trim();

    if (!clientId || !clientSecret) {
      return NextResponse.json({
        success: false,
        message: 'Vui lòng nhập đầy đủ Application (Client) ID và Client Secret',
      });
    }

    const tokenParams = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      scope: 'https://graph.microsoft.com/.default',
      grant_type: 'client_credentials',
    });

    const tokenRes = await fetch(`https://login.microsoftonline.com/${tenantId || 'common'}/oauth2/v2.0/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: tokenParams.toString(),
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok) {
      const errDesc = tokenData.error_description || tokenData.error || 'Token request failed';
      return NextResponse.json({
        success: false,
        message: `Lỗi xác thực Microsoft Entra ID: ${errDesc}`,
      });
    }

    // Verify Graph API access (User.Read.All permission)
    const graphRes = await fetch('https://graph.microsoft.com/v1.0/users?$top=5', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    if (!graphRes.ok) {
      const graphError = await graphRes.json().catch(() => ({}));
      const errMsg = graphError?.error?.message || 'Quyền hạn không đủ';
      return NextResponse.json({
        success: false,
        message: `Kết nối Entra ID thành công nhưng thiếu quyền Microsoft Graph API: ${errMsg}. Hướng dẫn: Thêm quyền "User.Read.All" (Application permission) trên Azure App Registration và nhấn "Grant admin consent".`,
      });
    }

    const graphData = await graphRes.json();
    const sampleCount = graphData.value ? graphData.value.length : 0;

    return NextResponse.json({
      success: true,
      message: `Kết nối Microsoft Entra ID & Microsoft Graph API thành công! Đã kiểm tra quyền User.Read.All (đọc được ${sampleCount} tài khoản mẫu).`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Lỗi khi kiểm tra kết nối SSO' },
      { status: 500 }
    );
  }
}
