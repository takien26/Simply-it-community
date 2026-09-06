'use client';

export interface CurrencyConfig {
  code: string;
  name: string;
  symbol: string;
  rate: number; // Exchange rate to base currency (e.g. 1 USD = 25400 VND if VND is base)
  isBase?: boolean;
  flag?: string;
  isCustom?: boolean;
}

export const DEFAULT_CURRENCIES: CurrencyConfig[] = [
  { code: 'VND', name: 'Việt Nam Đồng', symbol: '₫', flag: '🇻🇳', rate: 1, isBase: true },
  { code: 'USD', name: 'Đô la Mỹ (USD)', symbol: '$', flag: '🇺🇸', rate: 25400, isBase: false },
  { code: 'EUR', name: 'Đồng Euro (EUR)', symbol: '€', flag: '🇪🇺', rate: 27500, isBase: false },
  { code: 'JPY', name: 'Yên Nhật (JPY)', symbol: '¥', flag: '🇯🇵', rate: 165, isBase: false },
  { code: 'SGD', name: 'Đô la Singapore (SGD)', symbol: 'S$', flag: '🇸🇬', rate: 19200, isBase: false },
  { code: 'GBP', name: 'Bảng Anh (GBP)', symbol: '£', flag: '🇬🇧', rate: 32500, isBase: false },
  { code: 'AUD', name: 'Đô la Úc (AUD)', symbol: 'A$', flag: '🇦🇺', rate: 16400, isBase: false },
  { code: 'CNY', name: 'Nhân dân tệ (CNY)', symbol: '¥', flag: '🇨🇳', rate: 3500, isBase: false },
];

export function getStoredCurrencies(): CurrencyConfig[] {
  if (typeof window === 'undefined') return DEFAULT_CURRENCIES;
  try {
    const raw = localStorage.getItem('app_currencies_list');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return DEFAULT_CURRENCIES;
}

export function getStoredBaseCurrency(): string {
  if (typeof window === 'undefined') return 'VND';
  try {
    const base = localStorage.getItem('app_base_currency') || localStorage.getItem('app_currency');
    if (base) return base.toUpperCase();
    const list = getStoredCurrencies();
    const foundBase = list.find((c) => c.isBase);
    if (foundBase) return foundBase.code;
  } catch {}
  return 'VND';
}

export function getLastSyncTime(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('app_currency_last_sync');
}

export function getAutoSyncEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  const val = localStorage.getItem('app_currency_auto_sync');
  return val === null ? true : val === 'true';
}

export function setAutoSyncEnabled(enabled: boolean) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('app_currency_auto_sync', String(enabled));
}

export function saveCurrencyConfig(currencies: CurrencyConfig[], baseCode: string) {
  if (typeof window === 'undefined') return;
  const updated = currencies.map((c) => ({
    ...c,
    isBase: c.code.toUpperCase() === baseCode.toUpperCase(),
  }));
  localStorage.setItem('app_currencies_list', JSON.stringify(updated));
  localStorage.setItem('app_base_currency', baseCode.toUpperCase());
  localStorage.setItem('app_currency', baseCode.toUpperCase());

  window.dispatchEvent(new CustomEvent('app-currency-changed', {
    detail: { baseCurrency: baseCode.toUpperCase(), currencies: updated }
  }));
}

export async function syncRatesWithAI(baseCode?: string, currentList?: CurrencyConfig[]): Promise<{
  success: boolean;
  currencies: CurrencyConfig[];
  source?: string;
  lastUpdated?: string;
  error?: string;
}> {
  try {
    const base = baseCode || getStoredBaseCurrency();
    const list = currentList || getStoredCurrencies();

    const res = await fetch('/api/currencies/sync-rates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ baseCurrency: base, currencies: list }),
    });

    const data = await res.json();
    if (data.success && Array.isArray(data.currencies)) {
      saveCurrencyConfig(data.currencies, base);
      if (typeof window !== 'undefined') {
        localStorage.setItem('app_currency_last_sync', data.lastUpdated || new Date().toISOString());
      }
      return {
        success: true,
        currencies: data.currencies,
        source: data.source,
        lastUpdated: data.lastUpdated,
      };
    }
    return { success: false, currencies: list, error: data.error || 'Lỗi đồng bộ' };
  } catch (err: any) {
    return { success: false, currencies: currentList || DEFAULT_CURRENCIES, error: err.message };
  }
}

export function checkAndTriggerHourlySync() {
  if (typeof window === 'undefined') return;
  if (!getAutoSyncEnabled()) return;

  const lastSyncStr = getLastSyncTime();
  const now = Date.now();
  const ONE_HOUR_MS = 60 * 60 * 1000;

  if (!lastSyncStr || now - new Date(lastSyncStr).getTime() >= ONE_HOUR_MS) {
    console.log('[AI Currency Auto-Sync] 1 hour elapsed, refreshing exchange rates...');
    syncRatesWithAI().catch(console.warn);
  }
}

/**
 * Convert with Historical Exchange Rate preservation.
 * If the item has a recorded historical rate (e.g. 25,400 at purchase time), it will be preserved.
 */
export function getRecordedConversion(
  amount: number,
  itemCurrency: string = 'VND',
  targetCurrency: string = 'VND',
  recordedRate?: number,
  currenciesList: CurrencyConfig[] = DEFAULT_CURRENCIES
): {
  convertedAmount: number;
  rateUsed: number;
  isHistorical: boolean;
} {
  if (!amount || isNaN(amount) || amount === 0) {
    return { convertedAmount: 0, rateUsed: 1, isHistorical: false };
  }
  const f = (itemCurrency || 'VND').toUpperCase();
  const t = (targetCurrency || 'VND').toUpperCase();

  if (f === t) {
    return { convertedAmount: amount, rateUsed: 1, isHistorical: false };
  }

  const baseItem = currenciesList.find((c) => c.isBase) || currenciesList[0];
  const toItem = currenciesList.find((c) => c.code.toUpperCase() === t) || { rate: 1 };

  // Use historical recorded rate if present
  if (recordedRate && !isNaN(recordedRate) && recordedRate > 0) {
    const amountInBase = f === baseItem.code ? amount : amount * recordedRate;
    const converted = t === baseItem.code ? amountInBase : amountInBase / (toItem.rate || 1);
    return {
      convertedAmount: converted,
      rateUsed: recordedRate,
      isHistorical: true,
    };
  }

  // Otherwise calculate using current market rate
  const fromItem = currenciesList.find((c) => c.code.toUpperCase() === f) || { rate: 1 };
  const currentRate = fromItem.rate || 1;
  const amountInBase = f === baseItem.code ? amount : amount * currentRate;
  const converted = t === baseItem.code ? amountInBase : amountInBase / (toItem.rate || 1);

  return {
    convertedAmount: converted,
    rateUsed: currentRate,
    isHistorical: false,
  };
}

export function convertCurrencyAmount(
  amount: number,
  fromCurr: string = 'VND',
  toCurr: string = 'VND',
  currenciesList: CurrencyConfig[] = DEFAULT_CURRENCIES
): number {
  return getRecordedConversion(amount, fromCurr, toCurr, undefined, currenciesList).convertedAmount;
}

export function formatCurrencyWithSymbol(
  amount: number,
  currencyCode: string = 'VND',
  currenciesList: CurrencyConfig[] = DEFAULT_CURRENCIES
): string {
  if (isNaN(amount) || amount === null || amount === undefined) amount = 0;
  const cur = currenciesList.find((c) => c.code.toUpperCase() === currencyCode.toUpperCase());
  const symbol = cur ? cur.symbol : currencyCode;

  if (currencyCode.toUpperCase() === 'VND') {
    return `${Math.round(amount).toLocaleString('vi-VN')} ${symbol}`;
  }
  return `${symbol}${amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}
