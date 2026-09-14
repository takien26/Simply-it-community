export interface CurrencyConfig {
  code: string;
  name: string;
  symbol: string;
  rateToVnd: number;
  flag: string;
}

export interface PaymentRecord {
  id: string;
  paymentDate: string;
  amount: number;
  originalAmount?: number;
  currency?: string;
  exchangeRate?: number;
  period: string;
  periodStartDate?: string;
  periodEndDate?: string;
  invoiceNumber?: string;
  contractNumber?: string;
  status: 'PAID' | 'PENDING';
  notes?: string;
  createdAt?: string;
}

export const DEFAULT_CURRENCIES: CurrencyConfig[] = [
  { code: 'VND', name: 'Việt Nam Đồng', symbol: '₫', rateToVnd: 1, flag: '🇻🇳' },
  { code: 'USD', name: 'Đô la Mỹ', symbol: '$', rateToVnd: 25400, flag: '🇺🇸' },
  { code: 'EUR', name: 'Đồng Euro', symbol: '€', rateToVnd: 27500, flag: '🇪🇺' },
  { code: 'JPY', name: 'Yên Nhật', symbol: '¥', rateToVnd: 165, flag: '🇯🇵' },
  { code: 'SGD', name: 'Đô la Singapore', symbol: 'S$', rateToVnd: 19200, flag: '🇸🇬' },
  { code: 'CNY', name: 'Nhân dân tệ', symbol: '¥', rateToVnd: 3550, flag: '🇨🇳' },
  { code: 'KRW', name: 'Won Hàn Quốc', symbol: '₩', rateToVnd: 18.5, flag: '🇰🇷' },
  { code: 'GBP', name: 'Bảng Anh', symbol: '£', rateToVnd: 32800, flag: '🇬🇧' },
  { code: 'AUD', name: 'Đô la Úc', symbol: 'A$', rateToVnd: 16800, flag: '🇦🇺' },
  { code: 'THB', name: 'Baht Thái', symbol: '฿', rateToVnd: 720, flag: '🇹🇭' },
  { code: 'CAD', name: 'Đô la Canada', symbol: 'C$', rateToVnd: 18500, flag: '🇨🇦' },
];

export function convertCurrency(
  amount: number,
  fromCurr: string,
  toCurr: string,
  exchangeRatesMap: Record<string, number> = {}
): number {
  if (!amount) return 0;
  if (fromCurr === toCurr) return amount;
  const fromRate = exchangeRatesMap[fromCurr] || 1;
  const toRate = exchangeRatesMap[toCurr] || 1;
  const inVnd = amount * fromRate;
  return inVnd / toRate;
}

export function getEffectiveLicensePayments(
  lic: any,
  exchangeRatesMap: Record<string, number> = {}
): PaymentRecord[] {
  if (Array.isArray(lic?.specs?.paymentHistory) && lic.specs.paymentHistory.length > 0) {
    return lic.specs.paymentHistory;
  }
  const rawPrice = Number(lic?.purchasePrice) || 0;
  if (rawPrice <= 0 && !lic?.purchaseDate) return [];

  const cur = (lic?.purchaseCurrency || 'VND').toUpperCase();
  const rate = lic?.exchangeRate || exchangeRatesMap[cur] || 1;
  const inVnd = cur === 'VND' ? rawPrice : rawPrice * rate;
  const eDate = lic?.expiryDate ? new Date(lic.expiryDate).toLocaleDateString('vi-VN') : '';

  return [
    {
      id: `pay_initial_${lic?.id}`,
      paymentDate: lic?.purchaseDate ? new Date(lic.purchaseDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      amount: inVnd,
      originalAmount: rawPrice,
      currency: cur,
      exchangeRate: rate,
      period: `Đợt 1: Thanh toán mua mới ban đầu${eDate ? ` (Hạn dùng: ${eDate})` : ''}`,
      periodStartDate: lic?.purchaseDate ? new Date(lic.purchaseDate).toISOString().split('T')[0] : undefined,
      periodEndDate: lic?.expiryDate ? new Date(lic.expiryDate).toISOString().split('T')[0] : undefined,
      invoiceNumber: lic?.invoiceNumber || undefined,
      contractNumber: lic?.contractNumber || undefined,
      status: 'PAID',
      notes: 'Tự động ghi nhận Đợt 1 khi mua bản quyền',
      createdAt: lic?.createdAt || new Date().toISOString(),
    },
  ];
}

export function calculateAssignedSeats(pairs: Array<{ userId?: string; assetId?: string }>): number {
  if (!Array.isArray(pairs) || pairs.length === 0) return 0;
  const valid = pairs.filter((p) => Boolean((p.userId && p.userId.trim() !== '') || (p.assetId && p.assetId.trim() !== '')));
  const seen = new Set<string>();
  let count = 0;
  for (const p of valid) {
    const u = p.userId ? p.userId.trim() : '';
    const a = p.assetId ? p.assetId.trim() : '';
    const key = `${u}_${a}`;
    if (!seen.has(key)) {
      seen.add(key);
      count++;
    }
  }
  return count;
}

export const formatPrice = (amount: number, currency: string = 'VND'): string => {
  if (amount === null || amount === undefined || isNaN(amount)) return '—';
  if (currency === 'VND') {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Math.round(amount));
  } else if (currency === 'USD') {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  } else if (currency === 'EUR') {
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(amount);
  }
  return new Intl.NumberFormat('vi-VN').format(amount) + ` ${currency}`;
};
