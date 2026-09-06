import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { testLdapConnection, LdapConfig } from '@/lib/ldap';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    }

    const body = await req.json();
    const config: LdapConfig = {
      enabled: body.enabled ?? true,
      serverUrl: body.serverUrl || body['ldap.server_url'] || 'ldap://127.0.0.1:389',
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
