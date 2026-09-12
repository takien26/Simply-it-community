import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { testLdapConnection, LdapConfig } from '@/lib/ldap';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, message: 'Bạn cần đăng nhập với quyền quản trị để kiểm tra kết nối LDAP' }, { status: 401 });
    }

    const body = await req.json();
    const rawServerUrl = (body.serverUrl || body['ldap.server_url'] || '').trim();

    if (!rawServerUrl) {
      return NextResponse.json({
        success: false,
        message: 'Vui lòng nhập địa chỉ máy chủ LDAP Server URL (Ví dụ: ldap://192.168.1.10:389 hoặc ldaps://dc.company.com:636)',
      });
    }

    const config: LdapConfig = {
      enabled: body.enabled ?? true,
      serverUrl: rawServerUrl,
      baseDn: body.baseDn || body['ldap.base_dn'] || 'dc=company,dc=com',
      bindDn: body.bindDn || body['ldap.bind_dn'] || '',
      bindPassword: body.bindPassword || body['ldap.bind_password'] || '',
      userSearchFilter: body.userSearchFilter || body['ldap.user_search_filter'] || '(|(sAMAccountName={{username}})(mail={{username}}))',
      autoCreateUser: body.autoCreateUser !== false,
      defaultRoleId: body.defaultRoleId || '',
    };

    const result = await testLdapConnection(config);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Lỗi kiểm tra kết nối LDAP' },
      { status: 500 }
    );
  }
}
