import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency: string = 'VND'): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency,
  }).format(amount);
}

export function formatDate(date: Date | string, options?: Intl.DateTimeFormatOptions): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    ...options,
  }).format(d);
}

export function generateAssetTag(prefix: string, sequence: number): string {
  return `${prefix}-${String(sequence).padStart(4, '0')}`;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function formatNumberWithDots(val: number | string): string {
  if (val === '' || val === null || val === undefined) return '';
  const numStr = String(val).replace(/\D/g, '');
  if (!numStr) return '';
  return Number(numStr).toLocaleString('vi-VN');
}

const defaultNumbers = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];

function readThreeDigits(threeDigits: number, showZeroHundred: boolean): string {
  const hundreds = Math.floor(threeDigits / 100);
  const remainder = threeDigits % 100;
  const tens = Math.floor(remainder / 10);
  const units = remainder % 10;
  let result = '';

  if (hundreds > 0 || showZeroHundred) {
    result += defaultNumbers[hundreds] + ' trăm ';
  }

  if (tens > 1) {
    result += defaultNumbers[tens] + ' mươi ';
    if (units === 1) result += 'mốt ';
    else if (units === 5) result += 'lăm ';
    else if (units > 0) result += defaultNumbers[units] + ' ';
  } else if (tens === 1) {
    result += 'mười ';
    if (units === 1) result += 'một ';
    else if (units === 5) result += 'lăm ';
    else if (units > 0) result += defaultNumbers[units] + ' ';
  } else if (tens === 0 && units > 0) {
    if (hundreds > 0 || showZeroHundred) result += 'linh ';
    result += defaultNumbers[units] + ' ';
  }

  return result.trim();
}

export function numberToVietnameseWords(amount: number | string): string {
  if (amount === '' || amount === null || amount === undefined) return '';
  const num = typeof amount === 'string' ? Number(amount.replace(/\D/g, '')) : amount;
  if (isNaN(num) || num < 0) return '';
  if (num === 0) return 'Không đồng';

  const units = ['', 'nghìn', 'triệu', 'tỷ', 'nghìn tỷ', 'triệu tỷ'];
  let tempNum = num;
  const groups: number[] = [];

  while (tempNum > 0) {
    groups.push(tempNum % 1000);
    tempNum = Math.floor(tempNum / 1000);
  }

  let result = '';
  for (let i = groups.length - 1; i >= 0; i--) {
    const group = groups[i];
    if (group > 0) {
      const showZero = i < groups.length - 1;
      const groupText = readThreeDigits(group, showZero);
      result += groupText + ' ' + units[i] + ' ';
    }
  }

  result = result.trim() + ' đồng';
  // Capitalize first letter
  return result.charAt(0).toUpperCase() + result.slice(1);
}

export function calculateWarrantyExpiry(purchaseDateStr: string, months: number): string {
  if (!purchaseDateStr || isNaN(months) || months <= 0) return '';
  const d = new Date(purchaseDateStr);
  if (isNaN(d.getTime())) return '';
  d.setMonth(d.getMonth() + Number(months));
  return d.toISOString().split('T')[0];
}

export function getRemainingTimeText(expiryDate: string | Date | null | undefined): {
  text: string;
  isExpired: boolean;
  daysLeft: number;
  badgeClass: string;
} {
  if (!expiryDate) {
    return {
      text: 'Không có hạn',
      isExpired: false,
      daysLeft: 999999,
      badgeClass: 'bg-slate-100 text-slate-600',
    };
  }

  const exp = typeof expiryDate === 'string' ? new Date(expiryDate) : expiryDate;
  if (isNaN(exp.getTime())) {
    return {
      text: '—',
      isExpired: false,
      daysLeft: 0,
      badgeClass: 'bg-slate-100 text-slate-600',
    };
  }

  const now = new Date();
  // reset time part for clean day calc
  const expDay = new Date(exp.getFullYear(), exp.getMonth(), exp.getDate()).getTime();
  const nowDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const diffTime = expDay - nowDay;
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    const absDays = Math.abs(diffDays);
    let expiredAgo = `${absDays} ngày`;
    if (absDays >= 365) {
      const years = Math.floor(absDays / 365);
      const remMonths = Math.floor((absDays % 365) / 30);
      expiredAgo = `${years} năm ${remMonths > 0 ? remMonths + 'th' : ''}`.trim();
    } else if (absDays >= 30) {
      const months = Math.floor(absDays / 30);
      expiredAgo = `${months} tháng`;
    }

    return {
      text: `Hết hạn ${expiredAgo}`,
      isExpired: true,
      daysLeft: diffDays,
      badgeClass: 'bg-rose-100 text-rose-700 font-semibold',
    };
  }

  if (diffDays === 0) {
    return {
      text: 'Hôm nay',
      isExpired: false,
      daysLeft: 0,
      badgeClass: 'bg-amber-100 text-amber-800 font-bold',
    };
  }

  let remainingStr = `Còn ${diffDays} ngày`;
  if (diffDays >= 365) {
    const years = Math.floor(diffDays / 365);
    const remMonths = Math.floor((diffDays % 365) / 30);
    remainingStr = `Còn ${years} năm ${remMonths > 0 ? remMonths + 'th' : ''}`.trim();
  } else if (diffDays >= 30) {
    const months = Math.floor(diffDays / 30);
    remainingStr = `Còn ${months} tháng`;
  }

  if (diffDays <= 30) {
    return {
      text: remainingStr,
      isExpired: false,
      daysLeft: diffDays,
      badgeClass: 'bg-amber-100 text-amber-800 font-semibold',
    };
  }

  return {
    text: remainingStr,
    isExpired: false,
    daysLeft: diffDays,
    badgeClass: 'bg-emerald-100 text-emerald-700 font-semibold',
  };
}

export function numberToForeignCurrencyWords(
  amount: number | string,
  currencyCode: string = 'USD',
  currencyName?: string
): string {
  if (amount === '' || amount === null || amount === undefined) return '';
  const num = typeof amount === 'string' ? Number(amount.replace(/\D/g, '')) : amount;
  if (isNaN(num) || num < 0) return '';
  if (num === 0) return '0 ' + currencyCode;

  const units = ['', 'nghìn', 'triệu', 'tỷ', 'nghìn tỷ', 'triệu tỷ'];
  let tempNum = num;
  const groups: number[] = [];

  while (tempNum > 0) {
    groups.push(tempNum % 1000);
    tempNum = Math.floor(tempNum / 1000);
  }

  let result = '';
  for (let i = groups.length - 1; i >= 0; i--) {
    const group = groups[i];
    if (group > 0) {
      const showZero = i < groups.length - 1;
      const groupText = readThreeDigits(group, showZero);
      result += groupText + ' ' + units[i] + ' ';
    }
  }

  const curr = currencyCode.toUpperCase();
  const currLabel =
    currencyName ||
    (curr === 'USD'
      ? 'Đô la Mỹ'
      : curr === 'EUR'
      ? 'Euro'
      : curr === 'JPY'
      ? 'Yên Nhật'
      : curr === 'GBP'
      ? 'Bảng Anh'
      : curr === 'SGD'
      ? 'Đô la Singapore'
      : curr === 'KRW'
      ? 'Won Hàn Quốc'
      : curr === 'CNY'
      ? 'Nhân dân tệ'
      : curr === 'AUD'
      ? 'Đô la Úc'
      : curr === 'CAD'
      ? 'Đô la Canada'
      : curr === 'THB'
      ? 'Baht Thái'
      : curr);

  result = result.trim() + ' ' + currLabel;
  return result.charAt(0).toUpperCase() + result.slice(1);
}


