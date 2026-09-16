import { prisma } from './db';
import net from 'net';
import tls from 'tls';
import { Client } from 'ldapts';

export interface LdapConfig {
  enabled: boolean;
  serverUrl: string;
  baseDn: string;
  bindDn?: string;
  bindPassword?: string;
  userSearchFilter: string;
  autoCreateUser: boolean;
  defaultRoleId?: string;
  domain?: string;
}

export interface LdapUserEntry {
  username: string;
  email: string;
  fullName: string;
  department?: string;
  title?: string;
  phone?: string;
  isDisabled?: boolean;
}

export async function getLdapConfig(): Promise<LdapConfig> {
  const settings = await prisma.systemSetting.findMany({
    where: {
      OR: [
        { group: 'ldap' },
        { key: { startsWith: 'ldap.' } },
      ],
    },
  });

  const map: Record<string, string> = {};
  settings.forEach((s) => {
    map[s.key] = s.value;
  });

  return {
    enabled: map['ldap.enabled'] === 'true',
    serverUrl: map['ldap.server_url'] || 'ldap://127.0.0.1:389',
    baseDn: map['ldap.base_dn'] || 'dc=company,dc=com',
    bindDn: map['ldap.bind_dn'] || '',
    bindPassword: map['ldap.bind_password'] || '',
    userSearchFilter: map['ldap.user_search_filter'] || '(|(sAMAccountName={{username}})(mail={{username}})(userPrincipalName={{username}}))',
    autoCreateUser: map['ldap.auto_create_user'] !== 'false',
    defaultRoleId: map['ldap.default_role_id'] || '',
    domain: map['ldap.domain'] || '',
  };
}

/**
 * Parses host and port from an LDAP URL (e.g. ldap://192.168.1.10:389 or ldaps://dc.domain.com:636)
 */
export function parseLdapUrl(urlStr: string): { protocol: string; host: string; port: number } {
  try {
    let clean = urlStr.trim();
    let protocol = 'ldap:';
    let defaultPort = 389;

    if (clean.startsWith('ldaps://')) {
      protocol = 'ldaps:';
      defaultPort = 636;
      clean = clean.replace('ldaps://', '');
    } else if (clean.startsWith('ldap://')) {
      protocol = 'ldap:';
      defaultPort = 389;
      clean = clean.replace('ldap://', '');
    }

    const parts = clean.split('/')[0].split(':');
    const host = parts[0] || 'localhost';
    const port = parts[1] ? parseInt(parts[1], 10) : defaultPort;

    return { protocol, host, port };
  } catch {
    return { protocol: 'ldap:', host: 'localhost', port: 389 };
  }
}

/**
 * Tests raw socket/TLS connectivity to LDAP Server
 */
function testRawSocket(config: LdapConfig): Promise<{ success: boolean; message: string }> {
  return new Promise((resolve) => {
    const { protocol, host, port } = parseLdapUrl(config.serverUrl);
    const socketTimeout = 4000;
    let timer: NodeJS.Timeout;

    const cleanup = () => {
      clearTimeout(timer);
    };

    if (protocol === 'ldaps:') {
      const socket = tls.connect(
        {
          host,
          port,
          rejectUnauthorized: false,
          timeout: socketTimeout,
        },
        () => {
          cleanup();
          socket.end();
          resolve({
            success: true,
            message: `Kết nối thành công tới máy chủ LDAPS ${host}:${port} qua kênh mã hóa SSL/TLS an toàn.`,
          });
        }
      );

      socket.on('error', (err) => {
        cleanup();
        resolve({
          success: false,
          message: `Không thể kết nối LDAPS tới ${host}:${port}: ${err.message}`,
        });
      });

      timer = setTimeout(() => {
        socket.destroy();
        resolve({
          success: false,
          message: `Kết nối tới ${host}:${port} quá thời gian chờ (Timeout sau ${socketTimeout / 1000}s).`,
        });
      }, socketTimeout);
    } else {
      const socket = net.createConnection({ host, port, timeout: socketTimeout }, () => {
        cleanup();
        socket.end();
        resolve({
          success: true,
          message: `Kết nối thành công tới cổng LDAP ${host}:${port}.`,
        });
      });

      socket.on('error', (err) => {
        cleanup();
        resolve({
          success: false,
          message: `Không thể kết nối LDAP tới ${host}:${port}: ${err.message}`,
        });
      });

      timer = setTimeout(() => {
        socket.destroy();
        resolve({
          success: false,
          message: `Kết nối tới ${host}:${port} quá thời gian chờ (Timeout sau ${socketTimeout / 1000}s).`,
        });
      }, socketTimeout);
    }
  });
}

/**
 * Tests LDAP connectivity and validates Bind credentials if provided
 */
export async function testLdapConnection(config: LdapConfig): Promise<{ success: boolean; message: string }> {
  const rawTest = await testRawSocket(config);
  if (!rawTest.success) {
    return rawTest;
  }

  // If bindDn is configured, also verify Bind authentication
  if (config.bindDn && config.bindPassword) {
    const client = new Client({
      url: config.serverUrl,
      timeout: 6000,
      connectTimeout: 4000,
      tlsOptions: { rejectUnauthorized: false },
    });
    try {
      await client.bind(config.bindDn, config.bindPassword);
      await client.unbind();
      return {
        success: true,
        message: `Kết nối mạng và xác thực tài khoản Bind DN thành công tới máy chủ LDAP (${config.serverUrl})!`,
      };
    } catch (bindErr: any) {
      return {
        success: false,
        message: `Đã kết nối cổng mạng thành công nhưng tài khoản Bind DN không hợp lệ: ${bindErr.message}`,
      };
    }
  }

  return rawTest;
}

/**
 * Queries LDAP / Active Directory and extracts all active user accounts
 */
export async function syncUsersFromLdap(customConfig?: LdapConfig): Promise<{
  success: boolean;
  users: LdapUserEntry[];
  message?: string;
  error?: string;
}> {
  const config = customConfig || (await getLdapConfig());
  if (!config.enabled && !customConfig) {
    return { success: false, users: [], error: 'Cấu hình LDAP hiện đang bị tắt' };
  }

  const { host, port } = parseLdapUrl(config.serverUrl);
  const client = new Client({
    url: config.serverUrl,
    timeout: 10000,
    connectTimeout: 5000,
    tlsOptions: { rejectUnauthorized: false },
  });

  try {
    if (config.bindDn && config.bindPassword) {
      await client.bind(config.bindDn, config.bindPassword);
    } else {
      await client.bind('', '');
    }

    // Default filter for active persons in AD / OpenLDAP
    // Exclude disabled accounts in AD (userAccountControl:1.2.840.113556.1.4.803:=2)
    const searchFilter = '(&(|(objectCategory=person)(objectClass=inetOrgPerson)(objectClass=user))(!(userAccountControl:1.2.840.113556.1.4.803:=2)))';

    const { searchEntries } = await client.search(config.baseDn, {
      scope: 'sub',
      filter: searchFilter,
      attributes: [
        'sAMAccountName',
        'mail',
        'userPrincipalName',
        'displayName',
        'cn',
        'department',
        'title',
        'telephoneNumber',
        'userAccountControl',
      ],
      sizeLimit: 1000,
    });

    const users: LdapUserEntry[] = [];
    for (const entry of searchEntries) {
      const username = String(entry.sAMAccountName || entry.cn || '').trim();
      if (!username) continue;

      let email = String(entry.mail || entry.userPrincipalName || '').trim();
      if (!email || !email.includes('@')) {
        const domain = config.domain ? config.domain.replace(/^@/, '') : 'company.local';
        email = `${username.toLowerCase()}@${domain}`;
      } else {
        email = email.toLowerCase();
      }

      const fullName = String(entry.displayName || entry.cn || username).trim();
      const department = entry.department ? String(entry.department).trim() : undefined;
      const title = entry.title ? String(entry.title).trim() : undefined;
      const phone = entry.telephoneNumber ? String(entry.telephoneNumber).trim() : undefined;

      const uac = Number(entry.userAccountControl || 0);
      const isDisabled = (uac & 2) !== 0;

      users.push({
        username,
        email,
        fullName: fullName || username,
        department,
        title,
        phone,
        isDisabled,
      });
    }

    return {
      success: true,
      users,
      message: `Đã truy vấn thành công ${users.length} tài khoản từ máy chủ LDAP (${host}:${port}).`,
    };
  } catch (err: any) {
    return {
      success: false,
      users: [],
      error: `Lỗi truy vấn danh bạ LDAP: ${err?.message || err}`,
    };
  } finally {
    try {
      await client.unbind();
    } catch {}
  }
}

/**
 * Authenticates user credentials via LDAP / Active Directory
 */
export async function authenticateWithLdap(
  usernameOrEmail: string,
  password: string
): Promise<{
  success: boolean;
  user?: { email: string; fullName: string; department?: string; username: string };
  error?: string;
  isAccountDisabled?: boolean;
}> {
  const config = await getLdapConfig();
  if (!config.enabled) {
    return { success: false, error: 'Xác thực LDAP hiện đang bị tắt trong hệ thống' };
  }

  const cleanInput = usernameOrEmail.trim();
  const username = cleanInput.includes('@') ? cleanInput.split('@')[0] : cleanInput;
  const email = cleanInput.includes('@')
    ? cleanInput.toLowerCase()
    : config.domain
    ? `${cleanInput.toLowerCase()}@${config.domain.replace(/^@/, '')}`
    : `${cleanInput.toLowerCase()}@company.local`;

  // Try authenticating with LDAP client
  const client = new Client({
    url: config.serverUrl,
    timeout: 8000,
    connectTimeout: 5000,
    tlsOptions: { rejectUnauthorized: false },
  });

  try {
    let userDn = '';
    let fetchedDisplayName = '';
    let fetchedDepartment = '';
    let isAccountDisabled = false;

    // 1. If bindDn configured, search for user's DN first
    if (config.bindDn && config.bindPassword) {
      await client.bind(config.bindDn, config.bindPassword);
      const searchFilter = (config.userSearchFilter || '(|(sAMAccountName={{username}})(mail={{username}})(userPrincipalName={{username}}))')
        .replace(/{{username}}/g, username);

      const { searchEntries } = await client.search(config.baseDn, {
        scope: 'sub',
        filter: searchFilter,
        attributes: ['dn', 'displayName', 'cn', 'department', 'userAccountControl'],
      });

      if (searchEntries && searchEntries.length > 0) {
        const entry = searchEntries[0];
        userDn = entry.dn;
        fetchedDisplayName = String(entry.displayName || entry.cn || '');
        fetchedDepartment = entry.department ? String(entry.department) : '';
        const uac = Number(entry.userAccountControl || 0);
        if ((uac & 2) !== 0) {
          isAccountDisabled = true;
        }
      }
      await client.unbind();
    }

    if (isAccountDisabled) {
      return {
        success: false,
        isAccountDisabled: true,
        error: 'Tài khoản Active Directory đã bị vô hiệu hóa (Disabled).',
      };
    }

    // 2. Attempt to bind as user
    const clientUser = new Client({
      url: config.serverUrl,
      timeout: 8000,
      connectTimeout: 5000,
      tlsOptions: { rejectUnauthorized: false },
    });

    const bindTarget = userDn || (config.domain ? `${username}@${config.domain.replace(/^@/, '')}` : cleanInput);
    try {
      await clientUser.bind(bindTarget, password);
      await clientUser.unbind();
    } catch {
      // If specific bind failed and we didn't have userDn, try domain\username format
      if (!userDn && config.domain && !cleanInput.includes('@')) {
        const retryClient = new Client({
          url: config.serverUrl,
          timeout: 6000,
          tlsOptions: { rejectUnauthorized: false },
        });
        try {
          await retryClient.bind(`${config.domain.replace(/^@/, '')}\\${username}`, password);
          await retryClient.unbind();
        } catch {
          return { success: false, error: 'Mật khẩu tài khoản LDAP / Active Directory không chính xác.' };
        }
      } else {
        return { success: false, error: 'Mật khẩu tài khoản LDAP / Active Directory không chính xác.' };
      }
    }

    const formattedName = fetchedDisplayName || username
      .split(/[._-]/)
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase())
      .join(' ');

    return {
      success: true,
      user: {
        username,
        email,
        fullName: formattedName,
        department: fetchedDepartment || 'Tài khoản miền (LDAP / AD)',
      },
    };
  } catch (err: any) {
    return {
      success: false,
      error: `Lỗi kết nối máy chủ LDAP (${config.serverUrl}): ${err.message}`,
    };
  }
}

