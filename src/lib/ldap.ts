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
  officeLocation?: string;
  company?: string;
  managerRaw?: string;
  managerEmail?: string;
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
 * Normalizes LDAP URL to ensure correct scheme and port pairing
 */
export function normalizeLdapUrl(urlStr: string): string {
  let clean = (urlStr || '').trim();
  if (!clean) return 'ldap://localhost:389';

  // Add protocol if missing
  if (!clean.toLowerCase().startsWith('ldap://') && !clean.toLowerCase().startsWith('ldaps://')) {
    if (clean.includes(':636') || clean.includes(':3269')) {
      clean = 'ldaps://' + clean;
    } else {
      clean = 'ldap://' + clean;
    }
  }

  // Auto-correct mismatched scheme/port
  if (clean.toLowerCase().startsWith('ldap://') && (clean.includes(':636') || clean.includes(':3269'))) {
    clean = clean.replace(/^ldap:\/\//i, 'ldaps://');
  } else if (clean.toLowerCase().startsWith('ldaps://') && (clean.includes(':389') || clean.includes(':3268'))) {
    clean = clean.replace(/^ldaps:\/\//i, 'ldap://');
  }

  return clean;
}

/**
 * Parses host and port from an LDAP URL (e.g. ldap://192.168.1.10:389 or ldaps://dc.domain.com:636)
 */
export function parseLdapUrl(urlStr: string): { protocol: string; host: string; port: number } {
  try {
    let clean = (urlStr || '').trim();
    let protocol = 'ldap:';
    let defaultPort = 389;

    if (clean.startsWith('ldaps://')) {
      protocol = 'ldaps:';
      defaultPort = 636;
      clean = clean.replace(/^ldaps:\/\//i, '');
    } else if (clean.startsWith('ldap://')) {
      protocol = 'ldap:';
      defaultPort = 389;
      clean = clean.replace(/^ldap:\/\//i, '');
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
          checkServerIdentity: () => undefined,
          minVersion: 'TLSv1',
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
 * Creates a configured LDAP Client.
 * Automatically normalizes URLs and enables proper TLS options for secure connections
 */
export function createLdapClient(serverUrl: string, timeout = 10000): Client {
  const cleanUrl = normalizeLdapUrl(serverUrl);
  const isSecure = cleanUrl.toLowerCase().startsWith('ldaps://');
  return new Client({
    url: cleanUrl,
    timeout,
    connectTimeout: 5000,
    strictDN: false,
    ...(isSecure
      ? {
          tlsOptions: {
            rejectUnauthorized: false,
            checkServerIdentity: () => undefined,
            minVersion: 'TLSv1',
          },
        }
      : {}),
  });
}

/**
 * Derives potential bind identifiers (DN, UPN, Down-Level, username)
 */
export function getBindCandidates(bindDn: string, baseDn?: string, domainConfig?: string): string[] {
  const raw = (bindDn || '').trim();
  if (!raw) return [];

  const candidates: string[] = [raw];

  // Derive domain from domainConfig, baseDn, or raw DN
  let domain = domainConfig ? domainConfig.replace(/^@/, '').trim() : '';
  if (!domain && baseDn) {
    const dcParts = baseDn
      .split(',')
      .map((p) => p.trim())
      .filter((p) => p.toLowerCase().startsWith('dc='))
      .map((p) => p.substring(3));
    if (dcParts.length > 0) domain = dcParts.join('.');
  }
  if (!domain && raw.includes(',')) {
    const dcParts = raw
      .split(',')
      .map((p) => p.trim())
      .filter((p) => p.toLowerCase().startsWith('dc='))
      .map((p) => p.substring(3));
    if (dcParts.length > 0) domain = dcParts.join('.');
  }

  // Derive username
  let username = '';
  if (raw.includes(',')) {
    const cnMatch = raw.match(/^(?:cn|uid|sAMAccountName)=([^,]+)/i);
    if (cnMatch && cnMatch[1]) {
      username = cnMatch[1].trim();
    }
  } else if (raw.includes('@')) {
    username = raw.split('@')[0].trim();
    if (!domain) domain = raw.split('@')[1].trim();
  } else if (raw.includes('\\')) {
    username = raw.split('\\')[1].trim();
  } else {
    username = raw;
  }

  if (username && domain) {
    const upn = `${username}@${domain}`;
    if (!candidates.includes(upn)) candidates.push(upn);

    const netbios = domain.split('.')[0].toUpperCase();
    const downLevel = `${netbios}\\${username}`;
    if (!candidates.includes(downLevel)) candidates.push(downLevel);
  }

  if (username && !candidates.includes(username)) {
    candidates.push(username);
  }

  return candidates;
}

/**
 * Tests LDAP connectivity and validates Bind credentials if provided
 */
export async function testLdapConnection(config: LdapConfig): Promise<{
  success: boolean;
  message: string;
  suggestedUrl?: string;
  suggestedBindDn?: string;
}> {
  const normalizedUrl = normalizeLdapUrl(config.serverUrl);
  const normalizedConfig = { ...config, serverUrl: normalizedUrl };
  const { host, port } = parseLdapUrl(normalizedConfig.serverUrl);

  const rawTest = await testRawSocket(normalizedConfig);
  if (!rawTest.success) {
    if (port === 389) {
      const ldapsTest = await testRawSocket({ ...normalizedConfig, serverUrl: `ldaps://${host}:636` });
      if (ldapsTest.success) {
        return {
          success: false,
          suggestedUrl: `ldaps://${host}:636`,
          message: `Không thể kết nối cổng 389, nhưng cổng LDAPS 636 đang mở sẵn sàng!\nKhuyên dùng URL: ldaps://${host}:636`,
        };
      }
    }
    return rawTest;
  }

  // If bindDn is configured, verify Bind authentication with candidate identities & TLS fallback
  if (normalizedConfig.bindDn && normalizedConfig.bindPassword) {
    const isSecure = normalizedConfig.serverUrl.toLowerCase().startsWith('ldaps://');
    const candidates = getBindCandidates(normalizedConfig.bindDn, normalizedConfig.baseDn, normalizedConfig.domain);
    const upnCandidate = candidates.find((c) => c.includes('@') && c !== normalizedConfig.bindDn);
    const downLevelCandidate = candidates.find((c) => c.includes('\\') && c !== normalizedConfig.bindDn);

    let bindSuccessful = false;
    let successfulCandidate = '';
    let lastBindErr: any = null;
    let hadConnReset = false;

    // 1. Try binding on current URL with candidates
    for (const cand of candidates) {
      const client = createLdapClient(normalizedConfig.serverUrl, 6000);
      try {
        await client.bind(cand, normalizedConfig.bindPassword);
        await client.unbind();
        bindSuccessful = true;
        successfulCandidate = cand;
        break;
      } catch (err: any) {
        lastBindErr = err;
        const errMsg = err?.message || String(err);
        if (err.code === 'ECONNRESET' || errMsg.includes('ECONNRESET')) {
          hadConnReset = true;
          break; // Active Directory drops TCP on unencrypted bind - all candidates will reset on 389
        }
      }
    }

    if (bindSuccessful) {
      return {
        success: true,
        suggestedBindDn: successfulCandidate !== normalizedConfig.bindDn ? successfulCandidate : undefined,
        message: `✅ Kết nối mạng và xác thực tài khoản Bind thành công tới máy chủ LDAP (${normalizedConfig.serverUrl})!` +
          (successfulCandidate !== normalizedConfig.bindDn ? `\n• Định dạng tài khoản xác thực: "${successfulCandidate}".` : ''),
      };
    }

    // 2. If unencrypted connection got ECONNRESET or failed, try secure channels (LDAPS 636 or StartTLS)
    if (!isSecure && (hadConnReset || port === 389)) {
      const secureUrl = `ldaps://${host}:636`;

      // Option A: Try direct LDAPS on port 636
      for (const cand of candidates) {
        try {
          const secureClient = createLdapClient(secureUrl, 6000);
          await secureClient.bind(cand, normalizedConfig.bindPassword);
          await secureClient.unbind();
          return {
            success: true,
            suggestedUrl: secureUrl,
            suggestedBindDn: cand !== normalizedConfig.bindDn ? cand : undefined,
            message: `✅ Kết nối và xác thực thành công qua kênh bảo mật LDAPS (${secureUrl})!\n\n` +
              `• Máy chủ Active Directory chặn cổng 389 không mã hóa (chính sách LDAP Server Signing), hệ thống đã tự động kết nối và xác thực thành công qua cổng 636 an toàn.\n` +
              (cand !== normalizedConfig.bindDn ? `• Định dạng tài khoản xác thực thành công: "${cand}" (UPN).\n` : '') +
              `• Vui lòng bấm nút "⚡ Cập nhật cấu hình khuyến nghị" phía dưới và nhấn "Lưu Cài Đặt LDAP / AD".`,
          };
        } catch {}
      }

      // Option B: Try StartTLS on port 389
      for (const cand of candidates) {
        try {
          const tlsClient = createLdapClient(normalizedConfig.serverUrl, 6000);
          await tlsClient.startTLS({ rejectUnauthorized: false, checkServerIdentity: () => undefined });
          await tlsClient.bind(cand, normalizedConfig.bindPassword);
          await tlsClient.unbind();
          return {
            success: true,
            suggestedBindDn: cand !== normalizedConfig.bindDn ? cand : undefined,
            message: `✅ Kết nối và xác thực thành công tới máy chủ LDAP (${normalizedConfig.serverUrl}) qua cơ chế StartTLS!\n` +
              (cand !== normalizedConfig.bindDn ? `• Định dạng tài khoản xác thực thành công: "${cand}".\n` : '') +
              `• Hãy nhấn "Lưu Cài Đặt LDAP / AD" để áp dụng.`,
          };
        } catch {}
      }

      // Both failed: report detailed actionable diagnostic
      return {
        success: false,
        suggestedUrl: secureUrl,
        suggestedBindDn: upnCandidate || downLevelCandidate || undefined,
        message: `❌ Máy chủ Active Directory (Windows Server) đã ngắt kết nối (read ECONNRESET).\n\n` +
          `📌 NGUYÊN NHÂN:\n` +
          `Active Directory trên Windows Server áp dụng chính sách "LDAP server signing requirements" (khuyến nghị ADV190023 của Microsoft), tự động ngắt kết nối TCP RST đối với các yêu cầu xác thực mật khẩu không mã hóa trên cổng 389.\n\n` +
          `🛠️ GIẢI PHÁP KHẮC PHỤC:\n` +
          `1. Bấm nút "⚡ Tự động đổi sang LDAPS (Cổng 636)" phía dưới để đổi sang cổng mã hóa an toàn (${secureUrl}).\n` +
          (upnCandidate ? `2. Bấm nút "⚡ Đổi Bind DN sang UPN (${upnCandidate})" để tránh lỗi sai đường dẫn OU.\n` : '') +
          `3. Đảm bảo cổng TCP 636 đã được mở trên Windows Firewall của máy chủ Active Directory (${host}).`,
      };
    }

    const lastErrMsg = lastBindErr?.message || String(lastBindErr || '');
    if (
      lastErrMsg.includes('Invalid Credentials') ||
      lastErrMsg.includes('49') ||
      lastErrMsg.includes('AcceptSecurityContext error, data 52e')
    ) {
      return {
        success: false,
        suggestedBindDn: upnCandidate || undefined,
        message: `❌ Máy chủ Active Directory từ chối xác thực: Tài khoản hoặc mật khẩu Bind DN không chính xác (Error 49 / Invalid Credentials).\n\n` +
          `• Vui lòng kiểm tra lại mật khẩu của tài khoản "${config.bindDn}".\n` +
          (upnCandidate ? `• Mẹo: Hãy thử đổi Bind DN sang định dạng UPN "${upnCandidate}".` : ''),
      };
    }

    return {
      success: false,
      message: `Đã kết nối mạng tới máy chủ nhưng không thể xác thực tài khoản Bind: ${lastErrMsg}`,
    };
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
  const isSecure = config.serverUrl.trim().toLowerCase().startsWith('ldaps://');
  let client = createLdapClient(config.serverUrl, 12000);

  try {
    if (config.bindDn && config.bindPassword) {
      const candidates = getBindCandidates(config.bindDn, config.baseDn, config.domain);
      let bound = false;
      let lastErr: any = null;

      for (const cand of candidates) {
        try {
          await client.bind(cand, config.bindPassword);
          bound = true;
          break;
        } catch (bindErr: any) {
          lastErr = bindErr;
          if (!isSecure && (bindErr.code === 'ECONNRESET' || bindErr.message?.includes('ECONNRESET'))) {
            // If plain LDAP connection was reset on port 389, try direct LDAPS on port 636
            const secureUrl = `ldaps://${host}:636`;
            try {
              const fallbackResult = await syncUsersFromLdap({ ...config, serverUrl: secureUrl });
              if (fallbackResult.success) {
                fallbackResult.message = `${fallbackResult.message} (Tự động chuyển sang cổng 636 LDAPS do cổng 389 bị ngắt kết nối).`;
                return fallbackResult;
              }
            } catch {}

            try {
              client = createLdapClient(config.serverUrl, 12000);
              await client.startTLS({ rejectUnauthorized: false, checkServerIdentity: () => undefined });
              await client.bind(cand, config.bindPassword);
              bound = true;
              break;
            } catch {}
          }
        }
      }

      if (!bound) {
        throw lastErr || new Error('Không thể xác thực tài khoản quản trị LDAP (Bind)');
      }
    } else {
      await client.bind('', '');
    }

    const getAttr = (val: any): string => {
      if (val === undefined || val === null) return '';
      if (Array.isArray(val)) return val[0] !== undefined ? String(val[0]) : '';
      if (Buffer.isBuffer(val)) return val.toString('utf8');
      return String(val);
    };

    // Universal filter for active person/user accounts across Active Directory and OpenLDAP/FreeIPA
    // Exclude computer accounts to prevent machine accounts from being imported as employees
    const searchFilter = '(&(|(objectClass=user)(objectClass=inetOrgPerson)(objectClass=person))(!(objectClass=computer)))';

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
        'company',
        'telephoneNumber',
        'mobile',
        'physicalDeliveryOfficeName',
        'l',
        'streetAddress',
        'manager',
        'userAccountControl',
      ],
      sizeLimit: 1000,
    });

    // Derive domain name from baseDn if domain is not explicitly configured (e.g. dc=company,dc=com -> company.com)
    let domainFallback = config.domain ? config.domain.replace(/^@/, '') : '';
    if (!domainFallback && config.baseDn) {
      const dcParts = config.baseDn
        .split(',')
        .map((p) => p.trim())
        .filter((p) => p.toLowerCase().startsWith('dc='))
        .map((p) => p.substring(3));
      if (dcParts.length > 0) domainFallback = dcParts.join('.');
    }
    if (!domainFallback) domainFallback = 'company.local';

    const dnToEmail = new Map<string, string>();
    const cnToEmail = new Map<string, string>();
    const users: LdapUserEntry[] = [];

    for (const entry of searchEntries) {
      const username = getAttr(entry.sAMAccountName || entry.cn || '').trim();
      if (!username || username.endsWith('$')) continue;

      const uac = Number(entry.userAccountControl || 0);
      // Skip computer or domain trust accounts: 0x1000 (workstation), 0x2000 (server), 0x0800 (trust)
      if ((uac & 0x1000) !== 0 || (uac & 0x2000) !== 0 || (uac & 0x0800) !== 0) continue;

      let email = getAttr(entry.mail || entry.userPrincipalName || '').trim();
      if (!email || !email.includes('@')) {
        email = `${username.toLowerCase()}@${domainFallback}`;
      } else {
        email = email.toLowerCase();
      }

      const fullName = getAttr(entry.displayName || entry.cn || username).trim();
      const department = getAttr(entry.department).trim() || undefined;
      const title = getAttr(entry.title).trim() || undefined;
      const phone = getAttr(entry.telephoneNumber || entry.mobile).trim() || undefined;
      const company = getAttr(entry.company).trim() || undefined;
      const officeLocation = getAttr(entry.physicalDeliveryOfficeName || entry.l || entry.streetAddress).trim() || undefined;
      const managerRaw = getAttr(entry.manager).trim() || undefined;

      // Indexing for manager resolution
      const entryDn = String(entry.dn || '').toLowerCase().trim();
      if (entryDn) dnToEmail.set(entryDn, email);
      if (username) cnToEmail.set(username.toLowerCase(), email);
      const entryCn = getAttr(entry.cn || '').toLowerCase().trim();
      if (entryCn) cnToEmail.set(entryCn, email);
      if (fullName) cnToEmail.set(fullName.toLowerCase(), email);

      // In Active Directory: Bit 2 (0x0002) of userAccountControl indicates ACCOUNTDISABLE
      const isDisabled = (uac & 2) !== 0;

      users.push({
        username,
        email,
        fullName: fullName || username,
        department,
        title,
        phone,
        company,
        officeLocation,
        managerRaw,
        isDisabled,
      });
    }

    // Second pass: resolve direct manager email
    for (const u of users) {
      if (u.managerRaw) {
        const raw = u.managerRaw.trim();
        let matched = dnToEmail.get(raw.toLowerCase());
        if (!matched) {
          const cnMatch = raw.match(/^CN=([^,]+)/i);
          if (cnMatch && cnMatch[1]) {
            matched = cnToEmail.get(cnMatch[1].toLowerCase().trim());
          }
        }
        if (matched && matched !== u.email) {
          u.managerEmail = matched;
        }
      }
    }

    return {
      success: true,
      users,
      message: `Đã truy vấn thành công ${users.length} tài khoản từ máy chủ LDAP (${host}:${port}).`,
    };
  } catch (err: any) {
    let errMsg = err?.message || String(err);
    if (errMsg.includes('ECONNRESET')) {
      errMsg = `Máy chủ LDAP / Active Directory đóng kết nối đột ngột (read ECONNRESET). Domain Controller có thể yêu cầu giao thức bảo mật LDAPS (cổng 636). Vui lòng đổi URL sang ldaps://${parseLdapUrl(config.serverUrl).host}:636.`;
    }
    return {
      success: false,
      users: [],
      error: `Lỗi truy vấn danh bạ LDAP: ${errMsg}`,
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
  password: string,
  overrideUrl?: string
): Promise<{
  success: boolean;
  user?: {
    email: string;
    fullName: string;
    department?: string;
    username: string;
    phone?: string;
    position?: string;
    companyName?: string;
    officeLocation?: string;
    managerName?: string;
  };
  error?: string;
  isAccountDisabled?: boolean;
}> {
  const config = await getLdapConfig();
  if (overrideUrl) {
    config.serverUrl = overrideUrl;
  }
  if (!config.enabled) {
    return { success: false, error: 'Xác thực LDAP hiện đang bị tắt trong hệ thống' };
  }

  const cleanInput = usernameOrEmail.trim();
  const username = cleanInput.includes('@') ? cleanInput.split('@')[0] : cleanInput;

  let domainFallback = config.domain ? config.domain.replace(/^@/, '') : '';
  if (!domainFallback && config.baseDn) {
    const dcParts = config.baseDn
      .split(',')
      .map((p) => p.trim())
      .filter((p) => p.toLowerCase().startsWith('dc='))
      .map((p) => p.substring(3));
    if (dcParts.length > 0) domainFallback = dcParts.join('.');
  }
  if (!domainFallback) domainFallback = 'company.local';

  let email = cleanInput.includes('@')
    ? cleanInput.toLowerCase()
    : `${cleanInput.toLowerCase()}@${domainFallback}`;

  const isSecure = config.serverUrl.toLowerCase().startsWith('ldaps://');
  const { host } = parseLdapUrl(config.serverUrl);

  try {
    let userDn = '';
    let fetchedDisplayName = '';
    let fetchedDepartment = '';
    let fetchedTitle = '';
    let fetchedCompany = '';
    let fetchedPhone = '';
    let fetchedOffice = '';
    let fetchedManagerName = '';
    let isAccountDisabled = false;

    // 1. If bindDn configured, search for user's DN first
    if (config.bindDn && config.bindPassword) {
      const adminCandidates = getBindCandidates(config.bindDn, config.baseDn, config.domain);
      let searchClient = createLdapClient(config.serverUrl, 8000);
      let adminBound = false;

      for (const cand of adminCandidates) {
        try {
          await searchClient.bind(cand, config.bindPassword);
          adminBound = true;
          break;
        } catch (aErr: any) {
          if (!isSecure && (aErr.code === 'ECONNRESET' || aErr.message?.includes('ECONNRESET'))) {
            // Try LDAPS
            try {
              searchClient = createLdapClient(`ldaps://${host}:636`, 8000);
              await searchClient.bind(cand, config.bindPassword);
              adminBound = true;
              config.serverUrl = `ldaps://${host}:636`;
              break;
            } catch {}
          }
        }
      }

      if (adminBound) {
        const filterTemplate = config.userSearchFilter || '(|(sAMAccountName={{username}})(sAMAccountName={{cleanInput}})(mail={{cleanInput}})(userPrincipalName={{cleanInput}}))';
        const searchFilter = filterTemplate
          .replace(/{{username}}/g, username)
          .replace(/{{cleanInput}}/g, cleanInput);

        const { searchEntries } = await searchClient.search(config.baseDn, {
          scope: 'sub',
          filter: searchFilter,
          attributes: [
            'dn',
            'displayName',
            'cn',
            'department',
            'title',
            'company',
            'telephoneNumber',
            'mobile',
            'physicalDeliveryOfficeName',
            'l',
            'streetAddress',
            'manager',
            'userAccountControl',
            'mail',
            'userPrincipalName',
          ],
        });

        if (searchEntries && searchEntries.length > 0) {
          const entry = searchEntries[0];
          userDn = entry.dn;
          fetchedDisplayName = String(entry.displayName || entry.cn || '');
          fetchedDepartment = entry.department ? String(entry.department) : '';
          fetchedTitle = entry.title ? String(entry.title).trim() : '';
          fetchedCompany = entry.company ? String(entry.company).trim() : '';
          fetchedPhone = String(entry.telephoneNumber || entry.mobile || '').trim();
          fetchedOffice = String(entry.physicalDeliveryOfficeName || entry.l || entry.streetAddress || '').trim();
          const rawMgr = String(entry.manager || '').trim();
          if (rawMgr) {
            const cnMatch = rawMgr.match(/^CN=([^,]+)/i);
            if (cnMatch && cnMatch[1]) fetchedManagerName = cnMatch[1].trim();
          }
          const realMail = String(entry.mail || entry.userPrincipalName || '').trim().toLowerCase();
          if (realMail && realMail.includes('@')) {
            email = realMail;
          }
          const uac = Number(entry.userAccountControl || 0);
          if ((uac & 2) !== 0) {
            isAccountDisabled = true;
          }
        }
        await searchClient.unbind();
      }
    }

    if (isAccountDisabled) {
      return {
        success: false,
        isAccountDisabled: true,
        error: 'Tài khoản Active Directory đã bị vô hiệu hóa (Disabled).',
      };
    }

    // 2. Attempt to bind as user using candidate formats
    const userCandidates: string[] = [];
    if (userDn) userCandidates.push(userDn);
    if (domainFallback) {
      userCandidates.push(`${username}@${domainFallback}`);
      userCandidates.push(`${domainFallback.split('.')[0].toUpperCase()}\\${username}`);
    }
    if (cleanInput.includes('@') && !userCandidates.includes(cleanInput)) {
      userCandidates.push(cleanInput);
    }
    if (!userCandidates.includes(username)) {
      userCandidates.push(username);
    }

    let userBound = false;
    for (const target of userCandidates) {
      const clientUser = createLdapClient(config.serverUrl, 8000);
      try {
        await clientUser.bind(target, password);
        await clientUser.unbind();
        userBound = true;
        break;
      } catch (uErr: any) {
        if (!config.serverUrl.toLowerCase().startsWith('ldaps://') && (uErr.code === 'ECONNRESET' || uErr.message?.includes('ECONNRESET'))) {
          // Retry with LDAPS 636
          const secureClient = createLdapClient(`ldaps://${host}:636`, 8000);
          try {
            await secureClient.bind(target, password);
            await secureClient.unbind();
            userBound = true;
            break;
          } catch {}
        }
      }
    }

    if (!userBound) {
      return { success: false, error: 'Mật khẩu tài khoản LDAP / Active Directory không chính xác.' };
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
        phone: fetchedPhone || undefined,
        position: fetchedTitle || undefined,
        companyName: fetchedCompany || undefined,
        officeLocation: fetchedOffice || undefined,
        managerName: fetchedManagerName || undefined,
      },
    };
  } catch (err: any) {
    if (
      !overrideUrl &&
      !config.serverUrl.toLowerCase().startsWith('ldaps://') &&
      (err.code === 'ECONNRESET' || err.message?.includes('ECONNRESET'))
    ) {
      return authenticateWithLdap(usernameOrEmail, password, `ldaps://${host}:636`);
    }
    return {
      success: false,
      error: `Lỗi kết nối máy chủ LDAP (${config.serverUrl}): ${err.message}`,
    };
  }
}

