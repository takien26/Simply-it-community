import {
  Globe,
  Wifi,
  Cloud,
  Shield,
  Mail,
  PhoneCall,
  Wrench,
  Server,
  Layers,
} from 'lucide-react';

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

export interface CurrencyConfig {
  code: string;
  name: string;
  symbol: string;
  rateToVnd: number;
  flag: string;
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

export interface ITServiceItem {
  id: string;
  serviceCode: string;
  name: string;
  serviceType: 'INTERNET' | 'CLOUD_HOSTING' | 'DOMAIN_SSL' | 'EMAIL_COMMUNICATION' | 'MAINTENANCE_SLA' | 'TELECOM_VOIP' | 'SOFTWARE_SAAS' | 'OTHER';
  status: 'ACTIVE' | 'PENDING_RENEWAL' | 'SUSPENDED' | 'TERMINATED' | 'EXPIRED';
  billingCycle: 'MONTHLY' | 'QUARTERLY' | 'SEMI_ANNUAL' | 'ANNUAL' | 'BIENNIAL' | 'TRIENNIAL' | 'ONE_TIME';
  cost: number | string | null;
  currency: string;
  startDate: string | null;
  renewalDate: string | null;
  expiryDate: string | null;
  accountNumber: string | null;
  contractNumber: string | null;
  invoiceNumber: string | null;
  vendorId: string | null;
  companyName: string | null;
  locationId: string | null;
  contactSupport: string | null;
  specs: any;
  contractUrl: string | null;
  notes: string | null;
  vendor?: { id: string; name: string; phone?: string; email?: string } | null;
  location?: { id: string; name: string; building?: string; floor?: string } | null;
  documents?: Array<{ id: string; title: string; type: string; fileUrl: string; fileName: string; amount?: number }> | null;
  createdBy?: { id: string; fullName: string; email: string } | null;
  createdAt: string;
  updatedAt: string;
}

export const BILLING_CYCLES: { value: string; label: string }[] = [
  { value: 'MONTHLY', label: 'Hàng tháng (1 tháng / lần)' },
  { value: 'QUARTERLY', label: 'Hàng quý (3 tháng / lần)' },
  { value: 'SEMI_ANNUAL', label: '6 tháng / lần' },
  { value: 'ANNUAL', label: 'Hàng năm (12 tháng / lần)' },
  { value: 'BIENNIAL', label: '2 năm / lần' },
  { value: 'TRIENNIAL', label: '3 năm / lần' },
  { value: 'ONE_TIME', label: 'Trọn gói / Thanh toán 1 lần' },
];

export function getBillingCycleLabel(value: string, lang: string): string {
  if (lang === 'ja') {
    switch (value) {
      case 'MONTHLY': return '月払い (1ヶ月)';
      case 'QUARTERLY': return '四半期払い (3ヶ月)';
      case 'SEMI_ANNUAL': return '半年払い (6ヶ月)';
      case 'ANNUAL': return '年払い (12ヶ月)';
      case 'BIENNIAL': return '2年払い (24ヶ月)';
      case 'TRIENNIAL': return '3年払い (36ヶ月)';
      case 'ONE_TIME': return '一括払い / 単発';
      default: return value;
    }
  }
  if (lang === 'en') {
    switch (value) {
      case 'MONTHLY': return 'Monthly (1 Month)';
      case 'QUARTERLY': return 'Quarterly (3 Months)';
      case 'SEMI_ANNUAL': return 'Semi-Annual (6 Months)';
      case 'ANNUAL': return 'Annual (12 Months)';
      case 'BIENNIAL': return 'Biennial (2 Years)';
      case 'TRIENNIAL': return 'Triennial (3 Years)';
      case 'ONE_TIME': return 'One-time Payment';
      default: return value;
    }
  }
  const found = BILLING_CYCLES.find((b) => b.value === value);
  return found ? found.label : value;
}

export function calculateNextRenewalDate(
  startDateStr: string | null | undefined,
  count: number,
  unit: 'MONTH' | 'YEAR' | 'DAY' | 'ONE_TIME'
): string {
  if (!startDateStr || unit === 'ONE_TIME' || count <= 0) return '';
  const d = new Date(startDateStr);
  if (isNaN(d.getTime())) return '';

  if (unit === 'MONTH') {
    d.setMonth(d.getMonth() + count);
  } else if (unit === 'YEAR') {
    d.setFullYear(d.getFullYear() + count);
  } else if (unit === 'DAY') {
    d.setDate(d.getDate() + count);
  }
  return d.toISOString().split('T')[0];
}

export function mapCycleEnum(count: number, unit: 'MONTH' | 'YEAR' | 'DAY' | 'ONE_TIME'): string {
  if (unit === 'ONE_TIME') return 'ONE_TIME';
  if (unit === 'YEAR') {
    if (count === 1) return 'ANNUAL';
    if (count === 2) return 'BIENNIAL';
    if (count === 3) return 'TRIENNIAL';
    return 'ANNUAL';
  }
  if (unit === 'MONTH') {
    if (count === 1) return 'MONTHLY';
    if (count === 3) return 'QUARTERLY';
    if (count === 6) return 'SEMI_ANNUAL';
    if (count === 12) return 'ANNUAL';
    if (count === 24) return 'BIENNIAL';
    if (count === 36) return 'TRIENNIAL';
    return 'MONTHLY';
  }
  return 'MONTHLY';
}

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

export function getEffectiveServicePayments(
  svc: any,
  exchangeRatesMap: Record<string, number> = {}
): PaymentRecord[] {
  if (Array.isArray(svc?.specs?.paymentHistory) && svc.specs.paymentHistory.length > 0) {
    return svc.specs.paymentHistory;
  }
  const rawCost = Number(svc?.cost) || 0;
  if (rawCost <= 0 && !svc?.startDate) return [];

  const cur = (svc?.currency || 'VND').toUpperCase();
  const rate = svc?.specs?.exchangeRate || exchangeRatesMap[cur] || 1;
  const inVnd = cur === 'VND' ? rawCost : rawCost * rate;
  const sDate = svc?.startDate ? new Date(svc.startDate).toLocaleDateString('vi-VN') : 'Ban đầu';
  const rDate = svc?.renewalDate ? new Date(svc.renewalDate).toLocaleDateString('vi-VN') : '';

  return [
    {
      id: `pay_initial_${svc?.id}`,
      paymentDate: svc?.startDate ? new Date(svc.startDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      amount: inVnd,
      originalAmount: rawCost,
      currency: cur,
      exchangeRate: rate,
      period: `Đợt 1: Thanh toán khởi tạo / Mua mới ban đầu${rDate ? ` (Kỳ từ ${sDate} đến ${rDate})` : ''}`,
      periodStartDate: svc?.startDate ? new Date(svc.startDate).toISOString().split('T')[0] : undefined,
      periodEndDate: svc?.renewalDate ? new Date(svc.renewalDate).toISOString().split('T')[0] : undefined,
      invoiceNumber: svc?.invoiceNumber || undefined,
      contractNumber: svc?.contractNumber || undefined,
      status: 'PAID',
      notes: 'Tự động ghi nhận Đợt 1 từ thông tin khởi tạo ban đầu',
      createdAt: svc?.createdAt || new Date().toISOString(),
    },
  ];
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

export const DEFAULT_SERVICE_TYPES: { value: string; label: string; icon: any; color: string }[] = [
  { value: 'ALL', label: 'Tất cả loại dịch vụ', icon: Globe, color: 'text-slate-600' },
  { value: 'INTERNET', label: 'Đường truyền Internet / Cáp quang', icon: Wifi, color: 'text-blue-600' },
  { value: 'CLOUD_HOSTING', label: 'Máy chủ Cloud / VPS / Hosting', icon: Cloud, color: 'text-indigo-600' },
  { value: 'DOMAIN_SSL', label: 'Tên miền & Chứng chỉ SSL', icon: Shield, color: 'text-emerald-600' },
  { value: 'EMAIL_COMMUNICATION', label: 'Email doanh nghiệp & SaaS', icon: Mail, color: 'text-cyan-600' },
  { value: 'TELECOM_VOIP', label: 'Tổng đài ảo VoIP & Thoại', icon: PhoneCall, color: 'text-purple-600' },
  { value: 'MAINTENANCE_SLA', label: 'Bảo trì SLA & Hỗ trợ kỹ thuật', icon: Wrench, color: 'text-amber-600' },
  { value: 'SOFTWARE_SAAS', label: 'Phần mềm thuê bao (SaaS)', icon: Server, color: 'text-rose-600' },
  { value: 'OTHER', label: 'Dịch vụ IT khác', icon: Layers, color: 'text-slate-600' },
];

export function getServiceTypeLabel(value: string, lang: string): string {
  if (lang === 'ja') {
    switch (value) {
      case 'ALL': return 'すべてのサービス';
      case 'INTERNET': return 'インターネット回線 / 光回線';
      case 'CLOUD_HOSTING': return 'クラウドサーバー / VPS / ホスティング';
      case 'DOMAIN_SSL': return 'ドメイン & SSL証明書';
      case 'EMAIL_COMMUNICATION': return 'ビジネスメール & SaaS';
      case 'TELECOM_VOIP': return 'クラウドPBX・VoIP電話';
      case 'MAINTENANCE_SLA': return 'SLA保守 & テクニカルサポート';
      case 'SOFTWARE_SAAS': return 'SaaSサブスクリプション';
      case 'OTHER': return 'その他ITサービス';
      default: return value;
    }
  }
  if (lang === 'en') {
    switch (value) {
      case 'ALL': return 'All Service Categories';
      case 'INTERNET': return 'Internet Circuits / FTTH';
      case 'CLOUD_HOSTING': return 'Cloud Servers / VPS / Hosting';
      case 'DOMAIN_SSL': return 'Domains & SSL Certificates';
      case 'EMAIL_COMMUNICATION': return 'Corporate Email & SaaS';
      case 'TELECOM_VOIP': return 'Cloud VoIP & SIP Trunking';
      case 'MAINTENANCE_SLA': return 'SLA Maintenance & Support';
      case 'SOFTWARE_SAAS': return 'SaaS Software Subscriptions';
      case 'OTHER': return 'Other IT Services';
      default: return value;
    }
  }
  const found = DEFAULT_SERVICE_TYPES.find((t) => t.value === value);
  return found ? found.label : value;
}
