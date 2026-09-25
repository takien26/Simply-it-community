import React from 'react';
import { formatCurrency } from '@/lib/utils';

export interface CurrencyConfig {
  code: string;
  name: string;
  symbol: string;
  rate: number;
}

export const DEFAULT_CURRENCIES: CurrencyConfig[] = [
  { code: 'VND', name: 'Việt Nam Đồng', symbol: '₫', rate: 1 },
  { code: 'USD', name: 'Đô la Mỹ', symbol: '$', rate: 25400 },
  { code: 'EUR', name: 'Đồng Euro', symbol: '€', rate: 27500 },
  { code: 'JPY', name: 'Yên Nhật', symbol: '¥', rate: 165 },
  { code: 'KRW', name: 'Won Hàn Quốc', symbol: '₩', rate: 18.5 },
  { code: 'CNY', name: 'Nhân dân tệ', symbol: '¥', rate: 3500 },
  { code: 'SGD', name: 'Đô la Singapore', symbol: 'S$', rate: 18800 },
];

export interface CustomFieldDef {
  key: string;
  label: string;
  type: 'text' | 'number' | 'select';
  options?: string[];
  unit?: string;
  required?: boolean;
}

export function formatPrice(amount: number, currency: string = 'VND'): string {
  if (amount === null || amount === undefined || isNaN(amount)) return '—';
  if (currency === 'VND') {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Math.round(amount));
  } else if (currency === 'USD') {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  } else if (currency === 'EUR') {
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(amount);
  }
  return new Intl.NumberFormat('vi-VN').format(amount) + ` ${currency}`;
}

export function getCategoryFields(categories: any[], categoryId: string): CustomFieldDef[] {
  const cat = categories.find((c) => c.id === categoryId);
  if (cat && Array.isArray(cat.customFields)) {
    return cat.customFields;
  }
  return [];
}

export function getFriendlySpecLabel(rawKey: string, categoryId?: string, categories: any[] = []): string {
  if (!rawKey) return '';
  const cleanKey = rawKey.trim().toLowerCase().replace(/[^a-z0-9]/g, '');

  if (categoryId && categories.length > 0) {
    const catFields = getCategoryFields(categories, categoryId);
    const matched = catFields.find((f) => f.key.toLowerCase().replace(/[^a-z0-9]/g, '') === cleanKey);
    if (matched) return matched.label;
  }

  const DICTIONARY: Record<string, string> = {
    motherboard: 'Bo mạch chủ (Mainboard)',
    mainboard: 'Bo mạch chủ (Mainboard)',
    baseboard: 'Bo mạch chủ (Mainboard)',
    cpu: 'CPU / Vi xử lý',
    processor: 'CPU / Vi xử lý',
    chip: 'CPU / Vi xử lý',
    ram: 'Dung lượng RAM',
    memory: 'Dung lượng RAM',
    storage: 'Ổ cứng / SSD',
    ssd: 'Ổ cứng / SSD',
    hdd: 'Ổ cứng / HDD',
    rom: 'Bộ nhớ trong',
    display: 'Kích thước màn hình',
    screensize: 'Kích thước màn hình',
    screen: 'Màn hình',
    resolution: 'Độ phân giải',
    refreshrate: 'Tần số quét màn hình',
    os: 'Hệ điều hành',
    operatingsystem: 'Hệ điều hành',
    computername: 'Tên máy tính',
    hostname: 'Tên máy tính',
    color: 'Màu sắc',
    material: 'Chất liệu vỏ',
    includedaccessories: 'Phụ kiện đi kèm',
    accessories: 'Phụ kiện đi kèm',
    gpu: 'Card đồ họa (GPU)',
    graphics: 'Card đồ họa (GPU)',
    graphicscard: 'Card đồ họa (GPU)',
    battery: 'Dung lượng Pin',
    weight: 'Trọng lượng',
    ipaddress: 'Địa chỉ IP',
    ip: 'Địa chỉ IP',
    macaddress: 'Địa chỉ MAC',
    mac: 'Địa chỉ MAC',
    ports: 'Cổng kết nối',
    paneltype: 'Loại tấm nền',
    printspeed: 'Tốc độ in',
    papersize: 'Khổ giấy in',
    bandwidth: 'Băng thông',
  };

  if (DICTIONARY[cleanKey]) return DICTIONARY[cleanKey];

  return rawKey
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .trim()
    .toUpperCase();
}


export function renderCategoryIcon(icon?: string, className = 'w-4 h-4') {
  if (!icon) return <span>📦</span>;
  if (
    icon.startsWith('http://') ||
    icon.startsWith('https://') ||
    icon.startsWith('/uploads/') ||
    icon.startsWith('data:image/') ||
    icon.startsWith('/images/')
  ) {
    return <img src={icon} alt="icon" className={`${className} object-contain rounded inline-block`} />;
  }
  return <span className="inline-block">{icon}</span>;
}
