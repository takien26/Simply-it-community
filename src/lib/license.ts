import crypto from 'crypto';
import { prisma } from '@/lib/db';

export const LICENSE_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA0AiUHdsvcZeRS2RBh7q0
dSr4Pk/yMPjFrL7/5mWPfUFFsCLK9DKkNBkLo7e7koiH1wpN83MkZ601gmoG+zdS
6R3zPDu540hFtR92CCg2O3QAqlhQhGxiPrP/F5GAc/rxdyzian14yoA6H4uJxi5Q
eA3klsVLUrpWp+4kC+qkGxTSNKU8eTK/XSmLyFmWoM1Hh+rtb5bXrOBt4cN10vnE
nR0obKWmMbUNXNQ+VykfEhGCHaWMjR3WkSf1PQC34M6090d2+WhQ/G0D4WgbwNNR
PmOY6ARZT8wrdaxl7ZEBtOg1DYdQQmHsUt2gid8zt1fe+VgM6apE/c5OA6X4Ubjw
swIDAQAB
-----END PUBLIC KEY-----`;

export interface LicensePayload {
  customer: string;
  tier: string;
  modules: string[];
  maxAssets?: number;
  issuedAt: string;
  expiresAt: string;
}

export interface LicenseStatus {
  isEnterprise: boolean;
  tier: 'COMMUNITY' | 'ENTERPRISE' | 'PRO';
  customer?: string;
  expiresAt?: string;
  daysRemaining?: number;
  maxAssets?: number;
  modules: string[];
}

export function verifyLicenseKey(keyString: string): { valid: boolean; payload?: LicensePayload; error?: string } {
  if (!keyString || typeof keyString !== 'string') {
    return { valid: false, error: 'Khóa bản quyền không được để trống' };
  }

  const cleanKey = keyString.trim();
  if (!cleanKey.startsWith('SIMPLY-ENT-') && !cleanKey.startsWith('SIMPLY-PRO-')) {
    return { valid: false, error: 'Định dạng mã bản quyền không hợp lệ (Phải bắt đầu bằng SIMPLY-ENT-)' };
  }

  const raw = cleanKey.replace(/^SIMPLY-(ENT|PRO)-/, '');
  const parts = raw.split('.');
  if (parts.length !== 2) {
    return { valid: false, error: 'Cấu trúc mã bản quyền không đúng' };
  }

  const [payloadB64, signatureB64] = parts;

  try {
    const verifier = crypto.createVerify('SHA256');
    verifier.update(payloadB64);
    verifier.end();

    const signature = Buffer.from(signatureB64, 'base64url');
    const isSignatureValid = verifier.verify(LICENSE_PUBLIC_KEY, signature);

    if (!isSignatureValid) {
      return { valid: false, error: 'Chữ ký số không hợp lệ hoặc mã bản quyền đã bị chỉnh sửa' };
    }

    const payloadJson = Buffer.from(payloadB64, 'base64url').toString('utf8');
    const payload: LicensePayload = JSON.parse(payloadJson);

    // Check expiration
    const expiresDate = new Date(payload.expiresAt);
    if (expiresDate.getTime() < Date.now()) {
      return { valid: false, error: `Bản quyền đã hết hạn vào ngày ${expiresDate.toLocaleDateString('vi-VN')}` };
    }

    return { valid: true, payload };
  } catch (err: any) {
    return { valid: false, error: err.message || 'Lỗi kiểm tra tính hợp lệ của mã bản quyền' };
  }
}

export async function getActiveLicense(): Promise<LicenseStatus> {
  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { key: 'system.license_key' },
    });

    if (!setting || !setting.value) {
      return {
        isEnterprise: false,
        tier: 'COMMUNITY',
        customer: 'Cộng đồng (Miễn phí vĩnh viễn)',
        modules: [],
      };
    }

    const result = verifyLicenseKey(setting.value);
    if (!result.valid || !result.payload) {
      return {
        isEnterprise: false,
        tier: 'COMMUNITY',
        customer: 'Cộng đồng (Miễn phí vĩnh viễn)',
        modules: [],
      };
    }

    const payload = result.payload;
    const expiresDate = new Date(payload.expiresAt);
    const msRemaining = expiresDate.getTime() - Date.now();
    const daysRemaining = Math.max(0, Math.ceil(msRemaining / (1000 * 60 * 60 * 24)));

    return {
      isEnterprise: true,
      tier: (payload.tier as any) || 'ENTERPRISE',
      customer: payload.customer,
      expiresAt: payload.expiresAt,
      daysRemaining,
      maxAssets: payload.maxAssets,
      modules: payload.modules || [],
    };
  } catch (err) {
    console.error('Error reading active license:', err);
    return {
      isEnterprise: false,
      tier: 'COMMUNITY',
      customer: 'Cộng đồng (Miễn phí vĩnh viễn)',
      modules: [],
    };
  }
}

export async function activateLicense(keyString: string) {
  const result = verifyLicenseKey(keyString);
  if (!result.valid || !result.payload) {
    return { success: false, error: result.error || 'Khóa bản quyền không hợp lệ' };
  }

  await prisma.systemSetting.upsert({
    where: { key: 'system.license_key' },
    update: {
      value: keyString.trim(),
      updatedAt: new Date(),
    },
    create: {
      key: 'system.license_key',
      value: keyString.trim(),
      label: 'Mã Giấy Phép Bản Quyền Hệ Thống',
      group: 'license',
      description: `Bản quyền cấp cho: ${result.payload.customer}`,
    },
  });

  return {
    success: true,
    license: result.payload,
  };
}

export async function deactivateLicense() {
  await prisma.systemSetting.deleteMany({
    where: { key: 'system.license_key' },
  });
  return { success: true };
}
