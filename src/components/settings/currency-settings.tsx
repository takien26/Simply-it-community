'use client';

import { useLanguage } from '@/lib/i18n/context';

import { useState, useEffect } from 'react';
import {
  Coins,
  Plus,
  Check,
  Edit2,
  Trash2,
  Save,
  RotateCcw,
  Sparkles,
  AlertCircle,
  Clock,
  RefreshCw,
  TrendingUp,
  Zap,
} from 'lucide-react';
import {
  CurrencyConfig,
  DEFAULT_CURRENCIES,
  getStoredCurrencies,
  getStoredBaseCurrency,
  saveCurrencyConfig,
  formatCurrencyWithSymbol,
  syncRatesWithAI,
  getLastSyncTime,
  getAutoSyncEnabled,
  setAutoSyncEnabled,
  checkAndTriggerHourlySync,
} from '@/lib/currency-store';

const CURRENCY_EN_NAMES: Record<string, string> = {
  VND: 'Vietnamese Dong',
  USD: 'US Dollar (USD)',
  EUR: 'Euro (EUR)',
  JPY: 'Japanese Yen (JPY)',
  SGD: 'Singapore Dollar (SGD)',
  GBP: 'British Pound (GBP)',
  AUD: 'Australian Dollar (AUD)',
  CNY: 'Chinese Yuan (CNY)',
};

export function CurrencySettingsCard() {
  const { language } = useLanguage();
  const isEn = language === 'en';
  const [currencies, setCurrencies] = useState<CurrencyConfig[]>(DEFAULT_CURRENCIES);
  const [baseCurrency, setBaseCurrency] = useState<string>('VND');
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [editRate, setEditRate] = useState<string>('');
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newCurrency, setNewCurrency] = useState<{
    code: string;
    name: string;
    symbol: string;
    flag: string;
    rate: string;
  }>({
    code: '',
    name: '',
    symbol: '',
    flag: '🌐',
    rate: '1',
  });
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isSyncingAI, setIsSyncingAI] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [autoSync, setAutoSync] = useState(true);

  useEffect(() => {
    const storedList = getStoredCurrencies();
    const storedBase = getStoredBaseCurrency();
    const syncTime = getLastSyncTime();
    const auto = getAutoSyncEnabled();

    setCurrencies(storedList);
    setBaseCurrency(storedBase);
    setLastSyncTime(syncTime);
    setAutoSync(auto);

    // Run hourly check on mount
    checkAndTriggerHourlySync();

    // Set up hourly timer check while settings tab is open
    const interval = setInterval(() => {
      checkAndTriggerHourlySync();
      setLastSyncTime(getLastSyncTime());
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, []);

  const handleToggleAutoSync = (val: boolean) => {
    setAutoSync(val);
    setAutoSyncEnabled(val);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleSyncNowWithAI = async () => {
    setIsSyncingAI(true);
    setSyncMessage(null);
    try {
      const result = await syncRatesWithAI(baseCurrency, currencies);
      if (result.success) {
        setCurrencies(result.currencies);
        setLastSyncTime(result.lastUpdated || new Date().toISOString());
        setSyncMessage(`Đã cập nhật tỷ giá mới nhất qua ${result.source || 'AI Market Data'}!`);
        setSavedSuccess(true);
        setTimeout(() => {
          setSavedSuccess(false);
          setSyncMessage(null);
        }, 4000);
      } else {
        alert(result.error || 'Lỗi khi đồng bộ tỷ giá qua AI');
      }
    } catch (e: any) {
      alert('Lỗi kết nối khi cập nhật tỷ giá: ' + e.message);
    } finally {
      setIsSyncingAI(false);
    }
  };

  const handleSelectBase = (code: string) => {
    setBaseCurrency(code);
    const updated = currencies.map((c) => ({
      ...c,
      isBase: c.code.toUpperCase() === code.toUpperCase(),
      rate: c.code.toUpperCase() === code.toUpperCase() ? 1 : c.rate,
    }));
    setCurrencies(updated);
    saveCurrencyConfig(updated, code);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleSaveRate = (code: string) => {
    const num = parseFloat(editRate.replace(/,/g, ''));
    if (isNaN(num) || num <= 0) return;

    const updated = currencies.map((c) => (c.code === code ? { ...c, rate: num } : c));
    setCurrencies(updated);
    setEditingCode(null);
    saveCurrencyConfig(updated, baseCurrency);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleAddNewCurrency = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCurrency.code.trim()) return;

    const codeUpper = newCurrency.code.trim().toUpperCase();
    if (currencies.some((c) => c.code.toUpperCase() === codeUpper)) {
      alert(`Mã tiền tệ ${codeUpper} đã tồn tại trong danh sách!`);
      return;
    }

    const rateNum = parseFloat(newCurrency.rate.replace(/,/g, '')) || 1;
    const item: CurrencyConfig = {
      code: codeUpper,
      name: newCurrency.name.trim() || codeUpper,
      symbol: newCurrency.symbol.trim() || codeUpper,
      flag: newCurrency.flag.trim() || '🌐',
      rate: rateNum,
      isBase: false,
      isCustom: true,
    };

    const updated = [...currencies, item];
    setCurrencies(updated);
    setIsAddingNew(false);
    setNewCurrency({ code: '', name: '', symbol: '', flag: '🌐', rate: '1' });
    saveCurrencyConfig(updated, baseCurrency);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleDeleteCurrency = (code: string) => {
    if (code === baseCurrency) {
      alert('Không thể xóa đồng tiền đang được chọn làm Gốc & Chính!');
      return;
    }
    if (confirm(`Bạn có chắc chắn muốn xóa đồng tiền ${code}?`)) {
      const updated = currencies.filter((c) => c.code !== code);
      setCurrencies(updated);
      saveCurrencyConfig(updated, baseCurrency);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    }
  };

  const handleResetDefaults = () => {
    if (confirm('Đặt lại danh sách tiền tệ về mặc định ban đầu?')) {
      setCurrencies(DEFAULT_CURRENCIES);
      setBaseCurrency('VND');
      saveCurrencyConfig(DEFAULT_CURRENCIES, 'VND');
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    }
  };

  const formatTimeAgo = (iso?: string | null) => {
    if (!iso) return 'Chưa đồng bộ';
    try {
      const d = new Date(iso);
      return `${d.toLocaleTimeString('vi-VN')} ngày ${d.toLocaleDateString('vi-VN')}`;
    } catch {
      return iso;
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-xs shrink-0">
            <Coins className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <span>{isEn ? 'Currency & Base Currency Configuration' : 'Cấu hình Tiền Tệ & Đồng Tiền Gốc (Base Currency)'}</span>
              {savedSuccess && (
                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800 flex items-center gap-1 animate-in fade-in">
                  <Check className="w-3 h-3" /> {isEn ? 'Saved successfully!' : 'Đã lưu thành công!'}
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {isEn ? 'Select 1 primary currency for valuation across Assets, Licenses, and Services. Automatic exchange rates conversion.' : 'Chọn 1 đồng tiền làm gốc định giá cho toàn bộ Tài sản, License và Dịch vụ. Tự động quy đổi tỷ giá chính xác.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1 cursor-pointer"
            title={isEn ? 'Reset to Defaults' : 'Khôi phục mặc định'}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{isEn ? 'Default' : 'Mặc định'}</span>
          </button>
          <button
            type="button"
            onClick={() => setIsAddingNew(true)}
            className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>{isEn ? '+ Add Currency' : '+ Thêm Tiền Tệ Mới'}</span>
          </button>
        </div>
      </div>

      {/* AI Hourly Auto-Sync Banner */}
      <div className="p-4 bg-gradient-to-r from-violet-50/90 via-indigo-50/70 to-blue-50/90 dark:from-violet-950/30 dark:via-indigo-950/20 dark:to-blue-950/30 border border-indigo-200 dark:border-indigo-800/60 rounded-2xl flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 bg-indigo-600 text-white rounded-2xl shadow-xs shrink-0 mt-0.5">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-black uppercase text-indigo-950 dark:text-indigo-200 tracking-wider">
                🤖 {isEn ? 'AI Automated Market Exchange Rates (Updated Hourly)' : 'AI Tự Động Cập Nhật Tỷ Giá Thị Trường (Mỗi 1 Giờ / Lần)'}
              </span>
              <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 rounded-full text-[10px] font-black border border-emerald-500/30">
                ● Live 1-Hour Sync
              </span>
            </div>
            <p className="text-xs text-indigo-900/80 dark:text-indigo-300/80 mt-1">
              {isEn ? 'System automatically connects to financial market rates & Gemini AI hourly to update exchange rates accurately across the catalog.' : 'Hệ thống tự động kết nối nguồn tỷ giá tài chính thị trường & Gemini AI mỗi giờ để cập nhật tỷ giá quy đổi chính xác cho toàn bộ danh mục.'}
            </p>
            <div className="flex items-center gap-4 mt-2 text-[11px] text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-indigo-500" />
                {isEn ? 'Last updated:' : 'Cập nhật lần cuối:'} <strong className="text-slate-700 dark:text-slate-200 font-mono">{formatTimeAgo(lastSyncTime)}</strong>
              </span>
              {syncMessage && (
                <span className="text-emerald-600 font-bold animate-in fade-in">
                  ✓ {syncMessage}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
          <label className="flex items-center gap-2 cursor-pointer select-none bg-white dark:bg-slate-800 px-3 py-2 rounded-xl border border-indigo-200 dark:border-indigo-800 shadow-2xs">
            <input
              type="checkbox"
              checked={autoSync}
              onChange={(e) => handleToggleAutoSync(e.target.checked)}
              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
            />
            <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
              Tự động mỗi giờ
            </span>
          </label>

          <button
            type="button"
            onClick={handleSyncNowWithAI}
            disabled={isSyncingAI}
            className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-2 cursor-pointer transition-all active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncingAI ? 'animate-spin' : ''}`} />
            <span>{isSyncingAI ? (isEn ? 'Syncing rates...' : 'Đang cập nhật tỷ giá...') : (isEn ? '⚡ Sync Exchange Rates Now' : '⚡ Cập nhật Tỷ giá Ngay')}</span>
          </button>
        </div>
      </div>

      {/* Active Base Currency Banner */}
      <div className="p-4 bg-gradient-to-r from-amber-50/80 via-orange-50/60 to-yellow-50/80 dark:from-amber-950/30 dark:via-orange-950/20 dark:to-yellow-950/30 border border-amber-200 dark:border-amber-800/60 rounded-2xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-2xl">
            {currencies.find((c) => c.code === baseCurrency)?.flag || '💰'}
          </span>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase text-amber-900 dark:text-amber-300">
                {isEn ? 'Primary Base Currency:' : 'Đồng Tiền Gốc Hiện Tại (Primary Base Currency):'}
              </span>
              <span className="px-2.5 py-0.5 bg-amber-600 text-white rounded-full text-xs font-black">
                {baseCurrency} ({currencies.find((c) => c.code === baseCurrency)?.symbol || ''})
              </span>
            </div>
            <p className="text-xs text-amber-800/80 dark:text-amber-300/70 mt-0.5">
              {isEn ? 'All total asset metrics, license costs and service budgets will be synchronized according to unit: ' : 'Mọi chỉ số tổng tài sản, chi phí license và ngân sách dịch vụ sẽ được đồng bộ tính toán theo đơn vị '}{' '}
              <strong>{currencies.find((c) => c.code === baseCurrency)?.name || baseCurrency}</strong>.
            </p>
          </div>
        </div>

        {/* Quick Base Switcher */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-xs font-semibold text-amber-900 dark:text-amber-200">{isEn ? 'Change Base Currency:' : 'Đổi đồng tiền gốc:'}</span>
          <select
            value={baseCurrency}
            onChange={(e) => handleSelectBase(e.target.value)}
            className="p-2 bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-700 rounded-xl text-xs font-black text-slate-900 dark:text-white outline-none cursor-pointer"
          >
            {currencies.map((c) => (
              <option key={c.code} value={c.code}>
                {c.flag} {c.code} - {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Currency List Table / Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs font-extrabold text-slate-500 uppercase tracking-wider">
          <span>{isEn ? `Currency List & Exchange Rates (${currencies.length} currencies)` : `Danh Sách Tiền Tệ & Tỷ Giá Quy Đổi (${currencies.length} loại)`}</span>
          <span className="text-[11px] text-slate-400 font-normal">
            {isEn ? `* 1 Foreign currency unit = Rate x ${baseCurrency}` : `* 1 Đơn vị ngoại tệ = Tỷ giá x ${baseCurrency}`}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {currencies.map((curr) => {
            const isBase = curr.code === baseCurrency;
            const isEditing = editingCode === curr.code;

            return (
              <div
                key={curr.code}
                className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                  isBase
                    ? 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800 ring-2 ring-amber-500/20'
                    : 'bg-slate-50/60 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/60 hover:bg-white dark:hover:bg-slate-800'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl">{curr.flag || '🌐'}</span>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-black text-sm text-slate-900 dark:text-white">
                          {curr.code}
                        </span>
                        <span className="text-xs font-bold text-slate-400">({curr.symbol})</span>
                      </div>
                      <span className="text-xs text-slate-500 dark:text-slate-400 truncate block max-w-[140px]">
                        {curr.name}
                      </span>
                    </div>
                  </div>

                  {isBase ? (
                    <span className="px-2 py-0.5 bg-amber-500 text-white rounded-full text-[10px] font-black uppercase tracking-wider shrink-0">
                      GỐC & CHÍNH
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleSelectBase(curr.code)}
                      className="px-2 py-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 rounded-lg border border-indigo-200 dark:border-indigo-800 cursor-pointer shrink-0 transition-colors"
                      title={isEn ? 'Set as software base currency' : 'Chọn làm đồng tiền gốc của phần mềm'}
                    >
                      Đặt làm Gốc
                    </button>
                  )}
                </div>

                {/* Exchange Rate Box */}
                <div className="mt-3 pt-3 border-t border-slate-200/70 dark:border-slate-700/50 flex items-center justify-between">
                  <div className="text-xs">
                    <span className="text-[11px] text-slate-400 block">{isEn ? `Exchange rate vs ${baseCurrency}:` : `Tỷ giá so với ${baseCurrency}:`}</span>
                    {isBase ? (
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-200 text-xs">
                        {isEn ? '1.00 (Default)' : '1.00 (Mặc định)'}
                      </span>
                    ) : isEditing ? (
                      <div className="flex items-center gap-1 mt-1">
                        <input
                          type="number"
                          step="any"
                          value={editRate}
                          onChange={(e) => setEditRate(e.target.value)}
                          className="w-24 p-1 bg-white dark:bg-slate-900 border border-indigo-400 rounded-lg text-xs font-mono font-bold outline-none"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveRate(curr.code)}
                          className="p-1 bg-emerald-600 text-white rounded-md hover:bg-emerald-700"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingCode(null)}
                          className="p-1 bg-slate-200 text-slate-700 rounded-md hover:bg-slate-300"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-200 text-xs">
                        1 {curr.code} = {curr.rate?.toLocaleString('vi-VN')} {baseCurrency}
                      </span>
                    )}
                  </div>

                  {!isBase && !isEditing && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingCode(curr.code);
                          setEditRate(String(curr.rate || 1));
                        }}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
                        title={isEn ? 'Edit exchange rate manually' : 'Sửa tỷ giá thủ công'}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      {curr.isCustom && (
                        <button
                          type="button"
                          onClick={() => handleDeleteCurrency(curr.code)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950 cursor-pointer"
                          title={isEn ? 'Delete this custom currency' : 'Xóa tiền tệ tùy chỉnh này'}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add New Currency Modal Form */}
      {isAddingNew && (
        <div className="p-5 bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 rounded-2xl space-y-4 animate-in fade-in">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-black uppercase text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-indigo-600" />
              <span>{isEn ? 'Add New Currency' : 'Thêm Loại Tiền Tệ Mới Vào Hệ Thống'}</span>
            </h4>
            <button
              type="button"
              onClick={() => setIsAddingNew(false)}
              className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              ✕ Đóng
            </button>
          </div>

          <form onSubmit={handleAddNewCurrency} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                {isEn ? 'Currency Code (ISO)' : 'Mã Tiền Tệ (ISO)'} <span className="text-rose-500">(*)</span>
              </label>
              <input
                type="text"
                required
                placeholder="VD: CAD, KRW, THB"
                value={newCurrency.code}
                onChange={(e) => setNewCurrency((p) => ({ ...p, code: e.target.value.toUpperCase() }))}
                className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono font-bold uppercase outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                {isEn ? 'Currency Name' : 'Tên Tiền Tệ'} <span className="text-rose-500">(*)</span>
              </label>
              <input
                type="text"
                required
                placeholder={isEn ? 'e.g. Canadian Dollar, Korean Won' : 'VD: Đô la Canada, Won Hàn Quốc'}
                value={newCurrency.name}
                onChange={(e) => setNewCurrency((p) => ({ ...p, name: e.target.value }))}
                className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                {isEn ? 'Symbol / Sign' : 'Ký Hiệu / Biểu Tượng'}
              </label>
              <input
                type="text"
                placeholder="VD: C$, ₩, ฿"
                value={newCurrency.symbol}
                onChange={(e) => setNewCurrency((p) => ({ ...p, symbol: e.target.value }))}
                className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                {isEn ? `Exchange Rate vs ${baseCurrency}` : `Tỷ Giá So Với ${baseCurrency}`}
              </label>
              <input
                type="number"
                step="any"
                required
                placeholder="VD: 18500"
                value={newCurrency.rate}
                onChange={(e) => setNewCurrency((p) => ({ ...p, rate: e.target.value }))}
                className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono font-bold outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="sm:col-span-4 flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsAddingNew(false)}
                className="px-4 py-2 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
              >{isEn ? 'Cancel' : 'Hủy'}</button>
              <button
                type="submit"
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm cursor-pointer"
              >
                {isEn ? '✓ Save Currency' : '✓ Lưu Tiền Tệ Mới'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}