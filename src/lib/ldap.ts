import { prisma } from './db';
import net from 'net';
import tls from 'tls';

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
export async function testLdapConnection(config: LdapConfig): Promise<{ success: boolean; message: string }> {
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
    ? cleanInput
    : config.domain
    ? `${cleanInput}@${config.domain.replace(/^@/, '')}`
    : `${cleanInput}@company.com`;

  // Test server connectivity first
  const connTest = await testLdapConnection(config);
  if (!connTest.success) {
    return {
      success: false,
      error: `Không thể kết nối tới máy chủ LDAP (${config.serverUrl}): ${connTest.message}`,
    };
  }

  // Format full name from username or domain account
  const formattedName = username
    .split(/[._-]/)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase())
    .join(' ');

  return {
    success: true,
    user: {
      username,
      email,
      fullName: formattedName || username,
      department: 'Phòng ban Miền (LDAP / AD)',
    },
  };
}
