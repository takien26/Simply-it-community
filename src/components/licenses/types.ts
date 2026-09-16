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

export interface CompanyLicenseStat {
  companyName: string;
  purchasedSeats: number;
  usedSeats: number;
  balanceSeats: number; // purchasedSeats - usedSeats (> 0: surplus, < 0: deficit, = 0: exact)
  status: 'SURPLUS' | 'DEFICIT' | 'BORROWED' | 'EXACT';
  batches: Array<{
    batchId: string;
    batchNumber: number;
    contractNumber?: string;
    invoiceNumber?: string;
    seats: number;
    purchaseDate?: string;
    expiryDate?: string;
    costInSelectedCurrency: number;
  }>;
  assignments: Array<any>;
  totalCostInSelectedCurrency: number;
}

export interface LicenseGroup {
  id: string;
  name: string;
  companyName: string | null;
  vendor: any;
  licenseType: string;
  masterLicense: any;
  batches: any[];
  totalSeats: number;
  usedSeats: number;
  remainingSeats: number;
  seatPercent: number;
  earliestExpiry: string | null;
  earliestBatch: any | null;
  hasMultipleBatches: boolean;
  totalCostInSelectedCurrency: number;
  allAssignments: any[];
  companyStats: CompanyLicenseStat[];
}

export function groupLicenses(
  licenses: any[],
  convertCurrencyFn: (amount: number, from: string, to: string) => number,
  selectedCurrency: string = 'VND'
): LicenseGroup[] {
  if (!Array.isArray(licenses) || licenses.length === 0) return [];

  // Map to hold groups keyed by normalized name (or explicit parentLicenseId)
  const groupMap = new Map<string, any[]>();

  // Step 1: Collect all child batches that have parentLicenseId
  const explicitChildrenByParent = new Map<string, any[]>();
  const explicitParents = new Set<string>();

  licenses.forEach((lic) => {
    if (lic.parentLicenseId) {
      if (!explicitChildrenByParent.has(lic.parentLicenseId)) {
        explicitChildrenByParent.set(lic.parentLicenseId, []);
      }
      explicitChildrenByParent.get(lic.parentLicenseId)!.push(lic);
      explicitParents.add(lic.parentLicenseId);
    }
  });

  // Step 2: Group top-level licenses (exclude those that are child batches of another license)
  licenses.forEach((lic) => {
    if (lic.parentLicenseId) return; // Will be attached to their parent

    const key = `name:${(lic.name || '').trim().toLowerCase()}`;
    if (!groupMap.has(key)) {
      groupMap.set(key, []);
    }
    groupMap.get(key)!.push(lic);
  });

  // Step 3: Build consolidated LicenseGroup objects
  const result: LicenseGroup[] = [];

  groupMap.forEach((matchedLicenses) => {
    if (!matchedLicenses || matchedLicenses.length === 0) return;

    // Pick the primary master license (first created or most seats)
    const sortedMasters = [...matchedLicenses].sort((a, b) => {
      const dateA = new Date(a.createdAt || 0).getTime();
      const dateB = new Date(b.createdAt || 0).getTime();
      return dateA - dateB;
    });
    const masterLicense = sortedMasters[0];

    // Combine all batches:
    // 1. All matched licenses under this name group
    // 2. Plus any explicit child batches attached via parentLicenseId
    const allBatchItems: any[] = [];
    const seenBatchIds = new Set<string>();

    matchedLicenses.forEach((m) => {
      if (!seenBatchIds.has(m.id)) {
        seenBatchIds.add(m.id);
        allBatchItems.push(m);
      }
      const children = explicitChildrenByParent.get(m.id) || m.batches || [];
      children.forEach((c: any) => {
        if (!seenBatchIds.has(c.id)) {
          seenBatchIds.add(c.id);
          allBatchItems.push(c);
        }
      });
    });

    // Sort batches chronologically by purchaseDate or createdAt
    allBatchItems.sort((a, b) => {
      const pA = new Date(a.purchaseDate || a.createdAt || 0).getTime();
      const pB = new Date(b.purchaseDate || b.createdAt || 0).getTime();
      return pA - pB;
    });

    // Aggregate metrics
    let totalSeats = 0;
    let usedSeats = 0;
    let totalCostInSelectedCurrency = 0;
    let earliestExpiryDate: Date | null = null;
    let earliestBatch: any | null = null;
    const allAssignments: any[] = [];

    allBatchItems.forEach((b, idx) => {
      const bSeats = b.totalSeats || 1;
      const bActiveAssignments = b.assignments?.filter((a: any) => !a.revokedAt) || [];
      const bUsed = b.usedSeats !== undefined && b.usedSeats !== null ? b.usedSeats : bActiveAssignments.length;

      totalSeats += bSeats;
      usedSeats += bUsed;

      bActiveAssignments.forEach((a: any) => allAssignments.push({ ...a, batchId: b.id, batchNumber: idx + 1 }));

      const rawPrice = Number(b.purchasePrice) || 0;
      const cur = b.purchaseCurrency || 'VND';
      totalCostInSelectedCurrency += convertCurrencyFn(rawPrice, cur, selectedCurrency);

      if (b.expiryDate) {
        const exp = new Date(b.expiryDate);
        if (!earliestExpiryDate || exp < earliestExpiryDate) {
          earliestExpiryDate = exp;
          earliestBatch = b;
        }
      }
    });

    // ==================== CROSS-COMPANY BREAKDOWN & BALANCE MATRIX ====================
    const companyMap = new Map<string, {
      purchasedSeats: number;
      batches: Array<any>;
      assignments: Array<any>;
      totalCostInSelectedCurrency: number;
    }>();

    const getCompKey = (comp?: string | null) => (comp && comp.trim()) ? comp.trim() : 'Toàn tập đoàn / Chung';

    // A. Count purchased seats & costs by company
    allBatchItems.forEach((b, idx) => {
      const bComp = getCompKey(b.companyName);
      if (!companyMap.has(bComp)) {
        companyMap.set(bComp, {
          purchasedSeats: 0,
          batches: [],
          assignments: [],
          totalCostInSelectedCurrency: 0,
        });
      }
      const cData = companyMap.get(bComp)!;
      const bSeats = b.totalSeats || 1;
      cData.purchasedSeats += bSeats;

      const rawPrice = Number(b.purchasePrice) || 0;
      const cur = b.purchaseCurrency || 'VND';
      const cost = convertCurrencyFn(rawPrice, cur, selectedCurrency);
      cData.totalCostInSelectedCurrency += cost;

      cData.batches.push({
        batchId: b.id,
        batchNumber: idx + 1,
        contractNumber: b.contractNumber,
        invoiceNumber: b.invoiceNumber,
        seats: bSeats,
        purchaseDate: b.purchaseDate,
        expiryDate: b.expiryDate,
        costInSelectedCurrency: cost,
      });
    });

    // B. Count used seats by company of assigned users / assets
    allAssignments.forEach((a) => {
      const userComp = getCompKey(a.user?.companyName || a.asset?.companyName);
      if (!companyMap.has(userComp)) {
        companyMap.set(userComp, {
          purchasedSeats: 0,
          batches: [],
          assignments: [],
          totalCostInSelectedCurrency: 0,
        });
      }
      companyMap.get(userComp)!.assignments.push(a);
    });

    // C. Compile company stats with balance status
    const companyStats: CompanyLicenseStat[] = [];
    companyMap.forEach((cData, compName) => {
      const used = cData.assignments.length;
      const balance = cData.purchasedSeats - used;
      let status: 'SURPLUS' | 'DEFICIT' | 'BORROWED' | 'EXACT' = 'EXACT';

      if (cData.purchasedSeats === 0 && used > 0) {
        status = 'BORROWED';
      } else if (balance > 0) {
        status = 'SURPLUS';
      } else if (balance < 0) {
        status = 'DEFICIT';
      }

      companyStats.push({
        companyName: compName,
        purchasedSeats: cData.purchasedSeats,
        usedSeats: used,
        balanceSeats: balance,
        status,
        batches: cData.batches,
        assignments: cData.assignments,
        totalCostInSelectedCurrency: cData.totalCostInSelectedCurrency,
      });
    });

    // Sort companyStats: Deficit first (red), then Borrowed (yellow), then Surplus (green), then Exact
    companyStats.sort((a, b) => {
      const pMap = { DEFICIT: 1, BORROWED: 2, SURPLUS: 3, EXACT: 4 };
      if (pMap[a.status] !== pMap[b.status]) return pMap[a.status] - pMap[b.status];
      return b.purchasedSeats - a.purchasedSeats;
    });

    const remainingSeats = Math.max(0, totalSeats - usedSeats);
    const seatPercent = totalSeats > 0 ? Math.min(100, Math.round((usedSeats / totalSeats) * 100)) : 0;

    result.push({
      id: masterLicense.id,
      name: masterLicense.name,
      companyName: masterLicense.companyName || null,
      vendor: masterLicense.vendor || (allBatchItems.find((b) => b.vendor)?.vendor) || null,
      licenseType: masterLicense.licenseType || 'PERPETUAL',
      masterLicense,
      batches: allBatchItems,
      totalSeats,
      usedSeats,
      remainingSeats,
      seatPercent,
      earliestExpiry: earliestExpiryDate ? (earliestExpiryDate as Date).toISOString() : null,
      earliestBatch,
      hasMultipleBatches: allBatchItems.length > 1,
      totalCostInSelectedCurrency,
      allAssignments,
      companyStats,
    });
  });

  return result;
}
