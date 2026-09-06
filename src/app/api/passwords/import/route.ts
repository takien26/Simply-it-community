import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import * as ExcelJS from 'exceljs';
import * as kdbxweb from 'kdbxweb';
import * as argon2 from 'argon2';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

// Configure Argon2 bridge for kdbxweb KDBX4 support
if (kdbxweb.CryptoEngine) {
  (kdbxweb.CryptoEngine as any).argon2 = async function (
    password: ArrayBuffer,
    salt: ArrayBuffer,
    memory: number,
    iterations: number,
    length: number,
    parallelism: number,
    type: any,
    version: any
  ) {
    const argonType = type === 0 ? argon2.argon2d : type === 1 ? argon2.argon2i : argon2.argon2id;
    const hash = await argon2.hash(Buffer.from(password), {
      salt: Buffer.from(salt),
      timeCost: iterations,
      memoryCost: memory,
      parallelism: parallelism,
      hashLength: length,
      type: argonType,
      version: version,
      raw: true,
    });
    return hash.buffer;
  };
}

function decodeXmlEntities(str: string): string {
  if (!str) return '';
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .trim();
}

function detectCategory(title: string, group: string, url: string): string {
  const text = `${title} ${group} ${url}`.toLowerCase();
  if (text.includes('server') || text.includes('vps') || text.includes('linux') || text.includes('ubuntu') || text.includes('windows server') || text.includes('esxi') || text.includes('vmware') || text.includes('proxmox') || text.includes('ssh') || text.includes('rdp')) return 'SERVER';
  if (text.includes('database') || text.includes('sql') || text.includes('mysql') || text.includes('postgres') || text.includes('mongodb') || text.includes('redis') || text.includes('oracle') || text.includes('db ')) return 'DATABASE';
  if (text.includes('router') || text.includes('switch') || text.includes('firewall') || text.includes('fortigate') || text.includes('mikrotik') || text.includes('cisco') || text.includes('pfsense') || text.includes('vpn') || text.includes('mạng') || text.includes('network')) return 'NETWORK';
  if (text.includes('wifi') || text.includes('unifi') || text.includes('aruba') || text.includes('access point') || text.includes('ap ')) return 'WIFI';
  if (text.includes('camera') || text.includes('dahua') || text.includes('hikvision') || text.includes('nvr') || text.includes('dvr') || text.includes('an ninh')) return 'CAMERA';
  if (text.includes('mail') || text.includes('outlook') || text.includes('office 365') || text.includes('m365') || text.includes('gmail') || text.includes('exchange')) return 'EMAIL';
  if (text.includes('aws') || text.includes('azure') || text.includes('gcp') || text.includes('cloud') || text.includes('cloudflare') || text.includes('digitalocean')) return 'CLOUD';
  if (text.includes('erp') || text.includes('crm') || text.includes('sap') || text.includes('phần mềm') || text.includes('app') || text.includes('jira') || text.includes('git')) return 'APP';
  if (text.includes('portal') || text.includes('web') || text.includes('admin') || text.includes('cpanel') || text.includes('hosting')) return 'PORTAL';
  return 'GENERAL';
}

function normalizeGroupPath(rawPath: string, defaultGroup: string = 'KeePass Import'): string {
  if (!rawPath) return defaultGroup;
  const parts = rawPath
    .replace(/\\/g, '/')
    .split('/')
    .map((p) => p.trim())
    .filter((p) => p && p !== 'Root' && p !== 'Database' && p !== 'KeePass' && p !== 'General');

  if (parts.length === 0) return defaultGroup;
  return parts.join(' / ');
}

// Parse CSV line handling quotes and commas
function parseCsvLine(text: string): string[] {
  const result: string[] = [];
  let cur = '';
  let inQuote = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      if (inQuote && text[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuote = !inQuote;
      }
    } else if (char === ',' && !inQuote) {
      result.push(cur.trim());
      cur = '';
    } else {
      cur += char;
    }
  }
  result.push(cur.trim());
  return result;
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });

    let rows: any[] = [];
    let defaultGroup = 'KeePass Import';
    let companyName: string | null = null;

    const contentType = req.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      const body = await req.json();
      defaultGroup = body.defaultGroup || 'KeePass Import';
      companyName = body.companyName || null;

      // 1. Direct parsed rows from browser (instant and bypasses any file upload limits!)
      if (Array.isArray(body.rows) && body.rows.length > 0) {
        rows = body.rows.map((r: any) => ({
          title: r.title || 'Tài khoản KeePass',
          username: r.username || null,
          password: r.password || '123456',
          url: r.url || null,
          groupName: normalizeGroupPath(r.groupName || defaultGroup, defaultGroup),
          category: r.category || detectCategory(r.title || '', r.groupName || '', r.url || ''),
          notes: r.notes || null,
          totpSecret: r.totpSecret || null,
        }));
      } else if (body.fileData) {
        const raw = body.fileData.includes('base64,') ? body.fileData.split('base64,')[1] : body.fileData;
        const fileBuffer = Buffer.from(raw, 'base64');
        const fileName = (body.fileName || '').toLowerCase();
        const masterPassword = body.masterPassword || '';

        if (fileName.endsWith('.xml')) {
          const xmlText = fileBuffer.toString('utf8');
          // simple regex parse
          const entryRegex = /<Entry>([\s\S]*?)<\/Entry>/gi;
          let match;
          while ((match = entryRegex.exec(xmlText)) !== null) {
            const block = match[1];
            const stringRegex = /<String>\s*<Key>([^<]+)<\/Key>\s*<Value[^>]*>([^<]*)<\/Value>\s*<\/String>/gi;
            let sMatch;
            const entryData: Record<string, string> = {};
            while ((sMatch = stringRegex.exec(block)) !== null) {
              entryData[decodeXmlEntities(sMatch[1])] = decodeXmlEntities(sMatch[2]);
            }
            if (entryData.Title || entryData.Password) {
              rows.push({
                title: entryData.Title || 'KeePass Item',
                username: entryData.UserName || null,
                password: entryData.Password || '123456',
                url: entryData.URL || null,
                groupName: defaultGroup,
                category: detectCategory(entryData.Title || '', defaultGroup, entryData.URL || ''),
                notes: entryData.Notes || null,
              });
            }
          }
        }
      }
    }

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Không tìm thấy dữ liệu mật khẩu nào hợp lệ để lưu' }, { status: 400 });
    }

    const uniqueGroups = new Set<string>();
    let successCount = 0;

    // Use Prisma transaction / chunked creates for maximum reliability
    for (const r of rows) {
      if (!r.title || !r.password) continue;
      const finalGroup = r.groupName || defaultGroup;
      uniqueGroups.add(finalGroup);

      await prisma.passwordEntry.create({
        data: {
          title: r.title,
          username: r.username || null,
          password: r.password,
          url: r.url || null,
          category: r.category || 'GENERAL',
          groupName: finalGroup,
          companyName: companyName || null,
          totpSecret: r.totpSecret || null,
          notes: r.notes ? r.notes : null,
          createdById: user.userId,
        },
      });
      successCount++;
    }

    return NextResponse.json({
      success: true,
      message: `Đã import thành công ${successCount}/${rows.length} tài khoản từ file KeePass với ${uniqueGroups.size} thư mục nhóm.`,
      successCount,
      totalRows: rows.length,
      groupsCount: uniqueGroups.size,
      groups: Array.from(uniqueGroups),
    });
  } catch (error: any) {
    console.error('Import KeePass error:', error);
    return NextResponse.json({ error: error.message || 'Lỗi xử lý lưu tài khoản KeePass' }, { status: 500 });
  }
}
