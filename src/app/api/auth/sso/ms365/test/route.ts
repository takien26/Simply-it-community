import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, message: 'Bạn cần đăng nhập để kiểm tra kết nối SSO' }, { status: 401 });
    }

    const canTest = user.roleName === 'Admin' || (await hasPermission(user.userId, 'settings.update'));
    if (!canTest) {
      return NextResponse.json({ success: false, message: 'Forbidden: Bạn cần quyền Quản trị viên để kiểm tra kết nối SSO' }, { status: 403 });
    }

    const body = await req.json();
    const clientId = (body.clientId || body['sso.ms365_client_id'] || '').trim();
    const clientSecret = (body.clientSecret || body['sso.ms365_client_secret'] || '').trim();
    const rawTenantId = (body.tenantId || body['sso.ms365_tenant_id'] || '').trim();

    if (!clientId || !clientSecret) {
      return NextResponse.json({
        success: false,
        message: 'Vui lòng nhập đầy đủ Application (Client) ID và Client Secret',
      });
    }

    // Check if user accidentally pasted placeholder/label text
    if (/directory.*tenant/i.test(rawTenantId) || rawTenantId.toLowerCase() === 'tenant id' || rawTenantId.toLowerCase() === 'directory id') {
      return NextResponse.json({
        success: false,
        message: `Giá trị Directory (Tenant) ID "${rawTenantId}" không hợp lệ. Đây là nhãn tiêu đề trên Azure, không phải mã ID thật. Vui lòng vào Azure Portal > App registrations > Ứng dụng của bạn > Overview, copy mã GUID 36 ký tự tại dòng "Directory (tenant) ID" (VD: 84a7e3d1-42b8-47bc-926f-998811223344 hoặc tên miền yourcompany.onmicrosoft.com).`,
      });
    }

    const tenantId = rawTenantId || 'common';

    const tokenParams = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      scope: 'https://graph.microsoft.com/.default',
      grant_type: 'client_credentials',
    });

    const tokenRes = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: tokenParams.toString(),
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok) {
      const errDesc = tokenData.error_description || tokenData.error || 'Token request failed';
      if (errDesc.includes('AADSTS900023')) {
        return NextResponse.json({
          success: false,
          message: `Lỗi xác thực Microsoft Entra ID (AADSTS900023): Mã Tenant ID "${tenantId}" không hợp lệ hoặc sai định dạng. Hãy kiểm tra lại ô "Directory (Tenant) ID", điền mã GUID (VD: 84a7e3d1-42b8-47bc-926f-998811223344) hoặc tên miền công ty (VD: contoso.onmicrosoft.com).`,
        });
      }
      if (errDesc.includes('AADSTS90002') && tenantId === 'common') {
        return NextResponse.json({
          success: false,
          message: `Microsoft Entra ID yêu cầu nhập Directory (Tenant) ID cụ thể (mã GUID hoặc tên miền công ty, VD: hayen.vn hoặc contoso.onmicrosoft.com) khi kiểm tra bằng Client Secret. Vui lòng nhập Directory (tenant) ID thay vì "common". (Lưu ý: Nếu App là Multi-tenant, người dùng vẫn có thể đăng nhập bằng tài khoản Microsoft trên trang login bình thường).`,
        });
      }
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
      const errMsg = graphError?.error?.message || 'Chưa cấp quyền Application';
      return NextResponse.json({
        success: true,
        hasSyncPermission: false,
        message: `✅ Xác thực Microsoft Entra ID thành công!\n\n• Thông tin Client ID, Client Secret và Tenant ID hoàn toàn chính xác.\n• Tính năng Đăng Nhập SSO một chạm cho người dùng (User.Read) đã sẵn sàng hoạt động.\n\n⚠️ Lưu ý về đồng bộ danh bạ: Ứng dụng chưa được cấp quyền Application "User.Read.All" (${errMsg}). Nếu bạn muốn dùng thêm tính năng "Đồng bộ toàn bộ User từ M365", hãy vào Azure Portal > App registrations > API permissions > Add a permission > Microsoft Graph > Application permissions > User.Read.All và nhấn "Grant admin consent".`,
      });
    }

    const graphData = await graphRes.json();
    const sampleCount = graphData.value ? graphData.value.length : 0;

    return NextResponse.json({
      success: true,
      hasSyncPermission: true,
      message: `✅ Kết nối Microsoft Entra ID & Microsoft Graph API thành công!\n\n• Thông tin Client ID, Client Secret và Tenant ID hoàn toàn hợp lệ.\n• Đã kiểm tra quyền User.Read.All (đọc được ${sampleCount} tài khoản mẫu).\n• Hệ thống đã sẵn sàng cho cả Đăng Nhập SSO và Đồng Bộ Toàn Bộ Danh Bạ!`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Lỗi khi kiểm tra kết nối SSO' },
      { status: 500 }
    );
  }
}
