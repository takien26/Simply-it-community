import React from 'react';
import { Folder } from 'lucide-react';

export interface PasswordItem {
  id: string;
  title: string;
  username: string | null;
  password: string;
  url: string | null;
  category: string;
  groupName: string | null;
  assetId: string | null;
  serviceId: string | null;
  vendorId: string | null;
  isFavorite: boolean;
  totpSecret: string | null;
  notes: string | null;
  asset?: { id: string; assetTag: string; name: string } | null;
  service?: { id: string; serviceCode: string; name: string } | null;
  vendor?: { id: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface FolderNode {
  id: string;
  name: string;
  fullPath: string;
  iconStr?: string;
  count: number;
  totalCount: number;
  children: FolderNode[];
}

export const POPULAR_ICONS = [
  { emoji: '📁', label: 'Thư mục chung' },
  { emoji: '🏢', label: 'Văn phòng / Trụ sở' },
  { emoji: '🏭', label: 'Nhà máy / Xí nghiệp' },
  { emoji: '🏬', label: 'Chi nhánh / Cửa hàng' },
  { emoji: '📍', label: 'Địa điểm / Vị trí' },
  { emoji: '🖥️', label: 'Máy chủ / Server' },
  { emoji: '🗄️', label: 'Cơ sở dữ liệu / Database' },
  { emoji: '☁️', label: 'Đám mây / Cloud' },
  { emoji: '🌐', label: 'Mạng / Router / Firewall' },
  { emoji: '📡', label: 'WiFi / Thiết bị mạng' },
  { emoji: '📹', label: 'Camera / An ninh' },
  { emoji: '🛡️', label: 'Bảo mật / Admin Root' },
  { emoji: '🔒', label: 'Khóa bảo vệ VIP' },
  { emoji: '🔑', label: 'Chìa khóa truy cập' },
  { emoji: '✉️', label: 'Email / Microsoft 365' },
  { emoji: '💻', label: 'Máy tính cá nhân / PC' },
  { emoji: '📱', label: 'Thiết bị di động' },
  { emoji: '⚙️', label: 'Hệ thống / ERP' },
  { emoji: '⚡', label: 'Hạ tầng điện / UPS' },
  { emoji: '🖨️', label: 'Máy in / Scan' },
  { emoji: '📦', label: 'Kho thiết bị / Package' },
  { emoji: '🚀', label: 'Dự án / Triển khai' },
  { emoji: '🔌', label: 'Cổng kết nối / Switch' },
  { emoji: '🏷️', label: 'Nhãn định danh / Tag' },
];

export function renderFolderIcon(iconStr?: string) {
  if (!iconStr) return <Folder className="w-3.5 h-3.5 text-indigo-600 shrink-0" />;
  if (iconStr.startsWith('http') || iconStr.startsWith('data:image')) {
    return <img src={iconStr} alt="icon" className="w-3.5 h-3.5 object-contain rounded shrink-0" />;
  }
  return <span className="text-sm leading-none shrink-0">{iconStr}</span>;
}

export function parseFolderDisplay(fullFolderName: string): { icon: string; name: string } {
  const trimmed = fullFolderName.trim();
  const spaceIdx = trimmed.indexOf(' ');
  if (spaceIdx > 0 && spaceIdx <= 4) {
    const possibleIcon = trimmed.slice(0, spaceIdx);
    const restName = trimmed.slice(spaceIdx + 1).trim();
    return { icon: possibleIcon, name: restName };
  }
  if (trimmed.startsWith('data:image') || trimmed.startsWith('http')) {
    const parts = trimmed.split(' ');
    return { icon: parts[0], name: parts.slice(1).join(' ') };
  }
  return { icon: '📁', name: trimmed };
}

export function evaluatePasswordStrength(pass: string): { score: number; label: string; color: string; bg: string } {
  if (!pass) return { score: 0, label: 'Chưa nhập', color: 'text-slate-400', bg: 'bg-slate-200' };
  let score = 0;
  if (pass.length >= 8) score += 20;
  if (pass.length >= 12) score += 20;
  if (pass.length >= 16) score += 10;
  if (/[A-Z]/.test(pass)) score += 15;
  if (/[a-z]/.test(pass)) score += 15;
  if (/[0-9]/.test(pass)) score += 10;
  if (/[^A-Za-z0-9]/.test(pass)) score += 10;

  if (score < 40) return { score, label: 'Yếu', color: 'text-rose-600', bg: 'bg-rose-500' };
  if (score < 70) return { score, label: 'Trung bình', color: 'text-amber-600', bg: 'bg-amber-500' };
  if (score < 90) return { score, label: 'Mạnh', color: 'text-emerald-600', bg: 'bg-emerald-500' };
  return { score: 100, label: 'Rất mạnh', color: 'text-indigo-600', bg: 'bg-indigo-600' };
}

export function generateSecurePassword(options: {
  length: number;
  useUpper: boolean;
  useLower: boolean;
  useDigits: boolean;
  useSymbols: boolean;
  avoidAmbiguous: boolean;
}): string {
  let upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let lower = 'abcdefghijklmnopqrstuvwxyz';
  let digits = '0123456789';
  let symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';

  if (options.avoidAmbiguous) {
    upper = upper.replace(/[IO]/g, '');
    lower = lower.replace(/[lo]/g, '');
    digits = digits.replace(/[01]/g, '');
    symbols = symbols.replace(/[|]/g, '');
  }

  let charset = '';
  if (options.useUpper) charset += upper;
  if (options.useLower) charset += lower;
  if (options.useDigits) charset += digits;
  if (options.useSymbols) charset += symbols;

  if (!charset) charset = lower + digits;

  let password = '';
  const array = new Uint32Array(options.length);
  window.crypto.getRandomValues(array);
  for (let i = 0; i < options.length; i++) {
    password += charset[array[i] % charset.length];
  }
  return password;
}
