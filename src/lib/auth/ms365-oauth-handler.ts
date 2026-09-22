import { prisma } from '@/lib/db';

export interface M365OAuthConfig {
  clientId: string;
  clientSecret: string;
  tenantId: string;
  redirectUri?: string;
}

export interface M365UserProfile {
  id: string;
  displayName: string;
  email: string;
  userPrincipalName: string;
  userType: 'Member' | string;
  department?: string | null;
  jobTitle?: string | null;
  phone?: string | null;
  officeLocation?: string | null;
  companyName?: string | null;
  accountEnabled: boolean;
}

export class M365AuthError extends Error {
  statusCode: number;
  code: string;

  constructor(message: string, statusCode = 400, code = 'AUTH_ERROR') {
    super(message);
    this.name = 'M365AuthError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

/**
 * Đọc cấu hình OAuth2 M365: Ưu tiên biến môi trường (.env), sau đó fallback về SystemSetting DB
 */
export async function getM365Config(): Promise<M365OAuthConfig> {
  // 1. Ưu tiên biến môi trường (.env)
  const envClientId =
    process.env.CLIENT_ID ||
    process.env.AZURE_AD_CLIENT_ID ||
    process.env.MS365_CLIENT_ID;

  const envClientSecret =
    process.env.CLIENT_SECRET ||
    process.env.AZURE_AD_CLIENT_SECRET ||
    process.env.MS365_CLIENT_SECRET;

  const envTenantId =
    process.env.TENANT_ID ||
    process.env.AZURE_AD_TENANT_ID ||
    process.env.MS365_TENANT_ID;

  const envRedirectUri =
    process.env.REDIRECT_URI ||
    process.env.AZURE_AD_REDIRECT_URI ||
    process.env.MS365_REDIRECT_URI;

  // 2. Fallback sang SystemSetting nếu thiếu
  let dbClientId = '';
  let dbClientSecret = '';
  let dbTenantId = '';
  let dbRedirectUri = '';

  if (!envClientId || !envClientSecret || !envTenantId) {
    try {
      const settings = await prisma.systemSetting.findMany({
        where: {
          key: {
            in: [
              'sso.ms365_client_id',
              'sso.ms365_client_secret',
              'sso.ms365_tenant_id',
              'sso.ms365_redirect_uri',
              'license.m365_client_id',
              'license.m365_client_secret',
              'license.m365_tenant_id',
            ],
          },
        },
      });
      const map = new Map(settings.map((s) => [s.key, s.value]));
      dbClientId = map.get('sso.ms365_client_id') || map.get('license.m365_client_id') || '';
      dbClientSecret = map.get('sso.ms365_client_secret') || map.get('license.m365_client_secret') || '';
      dbTenantId = map.get('sso.ms365_tenant_id') || map.get('license.m365_tenant_id') || '';
      dbRedirectUri = map.get('sso.ms365_redirect_uri') || '';
    } catch (e) {
      console.warn('Không thể đọc cấu hình M365 từ database:', e);
    }
  }

  const clientId = (envClientId || dbClientId).trim();
  const clientSecret = (envClientSecret || dbClientSecret).trim();
  let tenantId = (envTenantId || dbTenantId || 'common').trim();
  if (/directory.*tenant/i.test(tenantId) || tenantId.toLowerCase() === 'tenant id') {
    tenantId = 'common';
  }
  const redirectUri = (envRedirectUri || dbRedirectUri).trim() || undefined;

  return { clientId, clientSecret, tenantId, redirectUri };
}

/**
 * 1. Đổi authorization code lấy access_token và id_token từ Microsoft endpoint (token_endpoint v2.0)
 */
export async function exchangeCodeForTokens(
  code: string,
  redirectUri: string,
  config: M365OAuthConfig
): Promise<{ accessToken: string; idToken?: string; expiresIn?: number }> {
  if (!config.clientId || !config.clientSecret) {
    throw new M365AuthError(
      'Cấu hình Microsoft SSO chưa đầy đủ (thiếu CLIENT_ID hoặc CLIENT_SECRET)',
      500,
      'SSO_MISCONFIGURED'
    );
  }

  const tokenEndpoint = `https://login.microsoftonline.com/${config.tenantId || 'common'}/oauth2/v2.0/token`;

  const body = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    code,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
  });

  const res = await fetch(tokenEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  const data = await res.json();
  if (!res.ok || !data.access_token) {
    console.error('Lỗi đổi token từ Microsoft token_endpoint v2.0:', data);
    throw new M365AuthError(
      data.error_description || data.error || 'Đổi authorization code lấy token thất bại',
      res.status,
      'TOKEN_EXCHANGE_FAILED'
    );
  }

  return {
    accessToken: data.access_token,
    idToken: data.id_token,
    expiresIn: data.expires_in,
  };
}

/**
 * 2. Gọi Microsoft Graph API (GET https://graph.microsoft.com/v1.0/me?$select=...) bằng access_token
 */
export async function fetchUserProfile(accessToken: string): Promise<any> {
  const graphEndpoint =
    'https://graph.microsoft.com/v1.0/me?$select=id,displayName,mail,userPrincipalName,userType,department,jobTitle,accountEnabled,mobilePhone,businessPhones,officeLocation,companyName,city';

  const res = await fetch(graphEndpoint, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error('Lỗi gọi Microsoft Graph API /me:', res.status, errText);
    throw new M365AuthError(
      'Không thể lấy hồ sơ người dùng từ Microsoft Graph API',
      res.status,
      'GRAPH_FETCH_FAILED'
    );
  }

  return res.json();
}

/**
 * 3. Bộ lọc bắt buộc (Authorization Filter):
 * - Chỉ cho phép tài khoản nội bộ (userType === 'Member').
 * - Chặn tuyệt đối tài khoản khách (Guest): từ chối nếu userType === 'Guest' hoặc userPrincipalName chứa '#EXT#'.
 * - Nếu vi phạm, ném lỗi HTTP 403 Forbidden kèm thông báo: "Chỉ tài khoản nội bộ mới có quyền truy cập".
 */
export function validateInternalUser(rawUser: any): M365UserProfile {
  const userType = (rawUser.userType || '').trim();
  const upn = (rawUser.userPrincipalName || '').trim();
  const mail = (rawUser.mail || '').trim();
  const email = (mail || upn).toLowerCase();

  if (!email) {
    throw new M365AuthError('Không tìm thấy địa chỉ email hợp lệ từ tài khoản Microsoft', 400, 'EMAIL_NOT_FOUND');
  }

  // Kiểm tra tài khoản Guest:
  // a) userType là Guest
  // b) userPrincipalName hoặc mail có chuỗi #EXT# (dấu hiệu tài khoản khách Azure B2B)
  const isGuest =
    userType.toLowerCase() === 'guest' ||
    upn.toUpperCase().includes('#EXT#') ||
    mail.toUpperCase().includes('#EXT#');

  if (isGuest || userType !== 'Member') {
    console.warn(`[SSO Security Filter] Chặn đăng nhập tài khoản khách (Guest): UPN=${upn}, userType=${userType}`);
    throw new M365AuthError('Chỉ tài khoản nội bộ mới có quyền truy cập', 403, 'GUEST_FORBIDDEN');
  }

  // Kiểm tra tài khoản đã bị vô hiệu hóa
  if (rawUser.accountEnabled === false) {
    throw new M365AuthError(
      'Tài khoản của bạn đã bị vô hiệu hóa trên hệ thống công ty',
      403,
      'ACCOUNT_DISABLED'
    );
  }

  const phone =
    rawUser.mobilePhone ||
    (Array.isArray(rawUser.businessPhones) && rawUser.businessPhones.length > 0 ? rawUser.businessPhones[0] : null);

  return {
    id: rawUser.id,
    displayName: rawUser.displayName || email.split('@')[0],
    email,
    userPrincipalName: upn,
    userType: 'Member',
    department: rawUser.department || null,
    jobTitle: rawUser.jobTitle || null,
    phone,
    officeLocation: rawUser.officeLocation || rawUser.city || null,
    companyName: rawUser.companyName || null,
    accountEnabled: true,
  };
}

/**
 * 4. Hàm điều phối thực thi Callback trọn gói
 */
export async function handleM365Callback(
  code: string,
  redirectUri: string,
  customConfig?: Partial<M365OAuthConfig>
): Promise<{ profile: M365UserProfile; idToken?: string; accessToken: string }> {
  const baseConfig = await getM365Config();
  const config = { ...baseConfig, ...customConfig };

  // 1. Đổi authorization code lấy access_token và id_token
  const tokens = await exchangeCodeForTokens(code, redirectUri, config);

  // 2. Gọi Microsoft Graph API bằng access_token
  const rawProfile = await fetchUserProfile(tokens.accessToken);

  // 3. Chạy qua Bộ lọc bắt buộc (Authorization Filter)
  const validatedProfile = validateInternalUser(rawProfile);

  return {
    profile: validatedProfile,
    idToken: tokens.idToken,
    accessToken: tokens.accessToken,
  };
}
