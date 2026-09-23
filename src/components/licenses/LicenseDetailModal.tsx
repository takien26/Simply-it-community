'use client';

import React, { useEffect } from 'react';
import {
  Key,
  Clock,
  Receipt,
  Plus,
  RotateCcw,
  Edit2,
  UserPlus,
  FileText,
  Trash2,
  X,
  DollarSign,
  Eye,
  Link as LinkIcon,
  FolderOpen,
  Users,
  Search,
  Check,
  FileSpreadsheet,
} from 'lucide-react';
import { useLanguage } from '@/lib/i18n/context';
import { QuickLink } from '@/components/common/QuickLink';
import { formatDate, formatCurrency, numberToVietnameseWords } from '@/lib/utils';
import { CurrencyConfig, PaymentRecord, convertCurrency, getEffectiveLicensePayments } from './types';

export interface LicenseDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  license: any;
  selectedCurrency: string;
  currencies?: CurrencyConfig[];
  exchangeRatesMap?: Record<string, number>;
  formatPrice: (amount: number, currency?: string) => string;
  onOpenEdit?: (license: any) => void;
  onOpenAssign?: (license: any) => void;
  onQuickRenew?: (license: any, months: number) => void;
  onDeletePaymentRecord?: (licenseId: string, payId: string) => void;
  onOpenDocPreview?: (license: any) => void;
  onOpenAddPayment?: (license: any) => void;
  onExportExcel?: (license: any) => void;
}

export function LicenseDetailModal({
  isOpen,
  onClose,
  license: selectedDetailLicense,
  selectedCurrency,
  currencies = [],
  exchangeRatesMap = {},
  formatPrice,
  onOpenEdit,
  onOpenAssign,
  onQuickRenew,
  onDeletePaymentRecord,
  onOpenDocPreview,
  onOpenAddPayment,
  onExportExcel,
}: LicenseDetailModalProps) {
  const [assignSearch, setAssignSearch] = React.useState('');

  // ESC key listener to close modal
  useEffect(() => {
    if (!isOpen) {
      setAssignSearch('');
      return;
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const { language, t, isEn, isJa, isVi } = useLanguage();
  const txt = (vi: string, en: string, ja: string) => isJa ? ja : (isEn ? en : vi);
  const formatDateI18n = (d?: string | null) => {
    if (!d) return '—';
    const dateObj = new Date(d);
    if (isNaN(dateObj.getTime())) return d;
    return dateObj.toLocaleDateString(isJa ? 'ja-JP' : (isEn ? 'en-US' : 'vi-VN'));
  };

  if (!isOpen || !selectedDetailLicense) return null;

  const setIsDetailModalOpen = (open: boolean) => {
    if (!open) onClose();
  };

  const handleOpenEdit = (lic: any) => {
    if (onOpenEdit) onOpenEdit(lic);
  };

  const handleOpenAssign = (lic: any) => {
    if (onOpenAssign) onOpenAssign(lic);
  };

  const handleQuickRenew = (lic: any, months: number) => {
    if (onQuickRenew) onQuickRenew(lic, months);
  };

  const handleDeletePaymentRecord = (licenseId: string, payId: string) => {
    if (onDeletePaymentRecord) onDeletePaymentRecord(licenseId, payId);
  };

  const setIsDocPreviewOpen = (open: boolean) => {
    if (open && onOpenDocPreview) onOpenDocPreview(selectedDetailLicense);
  };

  const setIsAddPaymentModalOpen = (open: boolean) => {
    if (open && onOpenAddPayment) onOpenAddPayment(selectedDetailLicense);
  };

  const setPaymentForm = (_: any) => {
    if (onOpenAddPayment) onOpenAddPayment(selectedDetailLicense);
  };

  return (

        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-3xl w-full flex flex-col max-h-[92vh] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-xs">
            {/* Header (Fixed Top) */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <span className="p-2.5 bg-gradient-to-tr from-purple-600 to-indigo-600 text-white rounded-2xl shadow-xs shrink-0">
                  <Key className="w-5 h-5" />
                </span>
                <div className="min-w-0">
                  <h3 className="text-base font-black text-slate-900 dark:text-white leading-snug truncate">
                    {selectedDetailLicense.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5 text-slate-500 dark:text-slate-400">
                    <span className="font-bold text-purple-700 dark:text-purple-300">
                      {selectedDetailLicense.licenseType}
                    </span>
                    <span>•</span>
                    <span className="font-mono truncate">{selectedDetailLicense.licenseKey ? `Key: ${selectedDetailLicense.licenseKey}` : txt('Không có Key', 'No License Key', 'キーなし')}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {onExportExcel && (
                  <button
                    type="button"
                    onClick={() => onExportExcel(selectedDetailLicense)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900 text-emerald-700 dark:text-emerald-300 font-bold text-xs border border-emerald-200 dark:border-emerald-800 transition-colors cursor-pointer"
                    title={txt('Xuất báo cáo Excel chi tiết cho phần mềm này', 'Export detailed Excel report for this software', 'このソフトウェアのExcelレポートを出力')}
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span className="hidden sm:inline">{txt('Xuất Excel', 'Export Excel', 'Excel出力')}</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsDetailModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* 4 Header Top Cards */}
              {(() => {
                const rawPrice = Number(selectedDetailLicense.purchasePrice) || 0;
                const rawCurr = (selectedDetailLicense.purchaseCurrency || 'VND').toUpperCase();
                const rate = selectedDetailLicense.exchangeRate || exchangeRatesMap[rawCurr] || 1;
                const convertedPrice = convertCurrency(rawPrice, rawCurr, selectedCurrency, exchangeRatesMap);
                const isDual = rawPrice > 0 && rawCurr !== selectedCurrency.toUpperCase();
                const rawBatches = selectedDetailLicense.batches || [];
                const childBatches = rawBatches.filter((b: any) => b && b.id !== selectedDetailLicense.id);
                const hasBatches = childBatches.length > 0;
                let childSeats = 0;
                let childUsed = 0;
                if (hasBatches) {
                  childBatches.forEach((b: any) => {
                    childSeats += Number(b.totalSeats) || 1;
                    childUsed += b.usedSeats !== undefined ? b.usedSeats : (b.assignments?.filter((a: any) => !a.revokedAt)?.length || 0);
                  });
                }
                const dUsed = selectedDetailLicense.usedSeats !== undefined ? selectedDetailLicense.usedSeats : (selectedDetailLicense.assignments?.filter((a: any) => !a.revokedAt)?.length || 0);
                const dTotal = selectedDetailLicense.totalSeats || 1;
                const used = hasBatches ? (dUsed + childUsed) : dUsed;
                const total = selectedDetailLicense.groupTotalSeats || (hasBatches ? (dTotal + childSeats) : dTotal);
                const percent = Math.min(100, Math.round((used / total) * 100));

                return (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {/* Card 1: Trạng thái */}
                    <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{txt('Trạng thái', 'Status', 'ステータス')}</span>
                      <div>
                        {selectedDetailLicense.status === 'ACTIVE' ? (
                          <span className="px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            🟢 {txt('Đang hoạt động', 'Active', 'アクティブ')}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            🔴 {txt('Hết hạn / Tạm dừng', 'Expired / Suspended', '期限切れ・停止中')}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-500 block truncate">
                        {txt('Loại:', 'Type:', 'タイプ:')} {selectedDetailLicense.licenseType}
                      </span>
                    </div>

                    {/* Card 2: Phân bổ Seats */}
                    <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-1.5">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{txt('Phân bổ Seats', 'Seat Allocation', 'シート割り当て')}</span>
                      <p className="text-xs font-black text-slate-900 dark:text-white font-mono flex items-center gap-1.5">
                        <span>{used} / {total} Seats</span>
                        {used > total && (
                          <span className="px-1.5 py-0.2 bg-rose-100 text-rose-700 rounded-md text-[9.5px] font-bold">
                            + {used - total} {txt('dư', 'excess', '超過')}
                          </span>
                        )}
                      </p>
                      <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${used > total ? 'bg-rose-500' : 'bg-purple-600'}`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>

                    {/* Card 3: Công ty & Nhà cung cấp (Không dùng truncate) */}
                    <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-1 flex flex-col justify-between">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                          {txt('Công ty & Nhà cung cấp', 'Company & Vendor', '会社・ベンダー')}
                        </span>
                        <p className="text-xs font-bold text-indigo-950 dark:text-indigo-200 whitespace-normal break-words leading-snug">
                          🏢 {selectedDetailLicense.companyName || txt('Công ty chung', 'General Company', '共通企業')}
                        </p>
                      </div>
                      <div className="text-[10.5px] text-slate-500 whitespace-normal break-words leading-tight pt-1 border-t border-slate-200/60 flex items-center gap-1">
                        <span>{txt('Đối tác:', 'Vendor:', 'ベンダー:')}</span>
                        {selectedDetailLicense.vendor ? (
                          <QuickLink
                            type="vendor"
                            id={selectedDetailLicense.vendor.id || selectedDetailLicense.vendor.name}
                            label={selectedDetailLicense.vendor.name}
                            icon="🏢"
                            showIcon={false}
                            multiline
                            maxLines={3}
                            className="font-bold text-purple-700 dark:text-purple-300 text-[10.5px] leading-snug line-clamp-3 break-words"
                          />
                        ) : (
                          <span className="text-slate-400 italic">{txt('Chưa chọn', 'Not selected', '未選択')}</span>
                        )}
                      </div>
                    </div>

                    {/* Card 4: Chi phí mua sắm (Dual-Currency) */}
                    <div className="p-3.5 bg-purple-50/60 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 rounded-2xl space-y-1 flex flex-col justify-between">
                      <div>
                        <span className="text-[10px] font-bold text-purple-700 dark:text-purple-300 uppercase tracking-wider block mb-0.5">
                          {txt('Chi phí mua sắm', 'Purchase Cost', '購入費用')}
                        </span>
                        {rawPrice > 0 ? (
                          <div className="space-y-0.5">
                            <p className="text-sm font-black text-purple-950 dark:text-purple-200 font-mono">
                              {formatPrice(convertedPrice, selectedCurrency)}
                            </p>
                            {isDual && (
                              <p className="text-[10.5px] font-bold text-emerald-700 dark:text-emerald-400 block font-mono">
                                {txt('Gốc:', 'Orig:', '原価:')} {formatPrice(rawPrice, rawCurr)}
                              </p>
                            )}
                          </div>
                        ) : (
                          <p className="text-xs font-bold text-slate-400">{txt('Miễn phí / OEM', 'Free / OEM', '無料 / OEM')}</p>
                        )}
                      </div>
                      <div className="pt-1 border-t border-purple-200/60 space-y-0.5">
                        <span className="text-[10px] text-purple-800/80 dark:text-purple-300 block">
                          {txt('Đơn giá:', 'Unit price:', '単価:')} <strong>{formatPrice(rawPrice > 0 ? convertedPrice / total : 0, selectedCurrency)}</strong> / seat
                        </span>
                        <span className="text-[9.5px] text-slate-400 block font-mono">
                          {txt('(Tỷ giá quy đổi ngày 25/08/2026)', '(FX rate as of 25/08/2026)', '(為替レート基準日: 2026/08/25)')}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* BẢNG CHỈ SỐ TÀI CHÍNH & KHẤU HAO */}
              {(() => {
                const rawPrice = Number(selectedDetailLicense.purchasePrice) || 0;
                const rawCurr = (selectedDetailLicense.purchaseCurrency || 'VND').toUpperCase();
                const rate = selectedDetailLicense.exchangeRate || exchangeRatesMap[rawCurr] || 1;
                const convertedPrice = convertCurrency(rawPrice, rawCurr, selectedCurrency, exchangeRatesMap);

                if (rawPrice <= 0) return null;

                const purchaseDate = selectedDetailLicense.purchaseDate ? new Date(selectedDetailLicense.purchaseDate) : null;
                const now = new Date();
                const totalMonths = 12;
                let usedMonths = 0;
                if (purchaseDate) {
                  usedMonths = Math.max(0, (now.getFullYear() - purchaseDate.getFullYear()) * 12 + (now.getMonth() - purchaseDate.getMonth()));
                }
                const depRatio = Math.min(1, Math.max(0, usedMonths / totalMonths));
                const accumulatedDepreciation = convertedPrice * depRatio;
                const remainingValue = Math.max(0, convertedPrice - accumulatedDepreciation);

                return (
                  <div className="p-4 bg-purple-50/50 dark:bg-purple-950/30 border border-purple-200/60 dark:border-purple-800/60 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-purple-950 dark:text-purple-200 flex items-center gap-1.5 uppercase tracking-wider text-xs">
                        <DollarSign className="w-4 h-4 text-purple-600" />
                        <span>{txt('Chỉ số tài chính & Khấu hao bản quyền', 'Financial Metrics & Depreciation', '財務指標と減価償却')}</span>
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-200/80 text-purple-950 dark:bg-purple-900 dark:text-purple-200">
                        {txt(`Khung khấu hao ${totalMonths} tháng`, `Depreciation: ${totalMonths} months`, `減価償却期間: ${totalMonths}ヶ月`)}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                      <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-purple-100 dark:border-slate-800 shadow-2xs">
                        <span className="text-[9.5px] font-bold text-slate-400 uppercase block">{txt('1. Nguyên giá gốc', '1. Original Cost', '1. 取得原価')}</span>
                        <span className="text-xs font-black text-slate-900 dark:text-white font-mono block mt-0.5 truncate">
                          {formatPrice(rawPrice, rawCurr)}
                        </span>
                      </div>

                      <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-purple-100 dark:border-slate-800 shadow-2xs">
                        <span className="text-[9.5px] font-bold text-slate-400 uppercase block">{txt('2. Tỷ giá hạch toán', '2. Accounting FX Rate', '2. 会計為替レート')}</span>
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300 font-mono block mt-0.5 truncate">
                          1 {rawCurr} = {new Intl.NumberFormat(isJa ? 'ja-JP' : (isEn ? 'en-US' : 'vi-VN')).format(rate)} {isVi ? 'đ' : 'VND'}
                        </span>
                      </div>

                      <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-purple-100 dark:border-slate-800 shadow-2xs">
                        <span className="text-[9.5px] font-bold text-purple-600 uppercase block">{txt('3. Giá quy đổi', '3. Converted Value', '3. 換算価額')} ({selectedCurrency})</span>
                        <span className="text-xs font-black text-purple-900 dark:text-purple-300 font-mono block mt-0.5 truncate">
                          {formatPrice(convertedPrice, selectedCurrency)}
                        </span>
                      </div>

                      <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-amber-100 dark:border-slate-800 shadow-2xs">
                        <span className="text-[9.5px] font-bold text-amber-600 uppercase block">{txt('4. Khấu hao', '4. Depreciation', '4. 減価償却')} ({Math.round(depRatio * 100)}%)</span>
                        <span className="text-xs font-black text-amber-700 dark:text-amber-400 font-mono block mt-0.5 truncate">
                          {formatPrice(accumulatedDepreciation, selectedCurrency)}
                        </span>
                      </div>

                      <div className="col-span-2 sm:col-span-1 p-2.5 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800 shadow-2xs">
                        <span className="text-[9.5px] font-bold text-emerald-700 uppercase block">{txt('5. Giá trị còn lại', '5. Remaining Value', '5. 残存簿価')}</span>
                        <span className="text-xs font-black text-emerald-900 dark:text-emerald-300 font-mono block mt-0.5 truncate">
                          {formatPrice(remainingValue, selectedCurrency)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Chi tiết Tài chính & Định giá Hóa đơn */}
              {(() => {
                const rawPrice = Number(selectedDetailLicense.purchasePrice) || 0;
                const rawCurr = (selectedDetailLicense.purchaseCurrency || 'VND').toUpperCase();
                const rate = selectedDetailLicense.exchangeRate || exchangeRatesMap[rawCurr] || 1;
                const priceInVnd = rawPrice * rate;
                const convertedPrice = convertCurrency(rawPrice, rawCurr, selectedCurrency, exchangeRatesMap);
                const wordsVnd = priceInVnd > 0 ? numberToVietnameseWords(priceInVnd) : '';

                if (rawPrice <= 0) return null;

                return (
                  <div className="p-4 bg-purple-50/70 dark:bg-purple-950/40 border border-purple-200/80 dark:border-purple-800/80 rounded-2xl space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-purple-950 dark:text-purple-200 flex items-center gap-1.5 uppercase tracking-wider text-xs">
                        <DollarSign className="w-4 h-4 text-purple-600" />
                        <span>{txt('Chứng từ & Định giá mua sắm bản quyền', 'Documentation & License Valuation', '証憑・ライセンス評価')}</span>
                      </span>
                      <span className="font-mono font-bold text-purple-700 dark:text-purple-300">
                        {formatPrice(rawPrice, rawCurr)}
                      </span>
                    </div>

                    {/* Đọc số tiền bằng chữ */}
                    {wordsVnd && (
                      <p className="text-[11px] font-bold text-purple-700 dark:text-purple-300 italic">
                        ✍️ {txt('Bằng chữ:', 'In words:', '金額（文字表記）:')} {wordsVnd} {!isVi && '(VND)'}
                      </p>
                    )}

                    {/* Dòng Quy đổi nhanh theo Tiền tệ ưu tiên */}
                    <div className="p-2.5 bg-white/90 dark:bg-slate-900 rounded-xl border border-purple-200/60 space-y-0.5">
                      <div className="flex items-center justify-between text-purple-900 dark:text-purple-200 font-semibold text-[11px]">
                        <span>⚡ {txt('Quy đổi theo Tiền tệ ưu tiên', 'Converted to Preferred Currency', '優先通貨換算')} [{selectedCurrency}]:</span>
                        <span className="font-black font-mono">{formatPrice(convertedPrice, selectedCurrency)}</span>
                      </div>
                      <p className="text-[10px] text-slate-500 font-mono">
                        ({txt('Tỷ giá hạch toán:', 'Accounting FX Rate:', '会計為替レート:')} 1 {rawCurr} = {new Intl.NumberFormat(isJa ? 'ja-JP' : (isEn ? 'en-US' : 'vi-VN')).format(rate)} VND)
                      </p>
                    </div>

                    <div className="p-2 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800 text-[10.5px] text-slate-600 dark:text-slate-400 flex items-center gap-1.5 font-medium">
                      <Clock className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 shrink-0" />
                      <span>{txt('Tỷ giá tham chiếu hạch toán cập nhật: 25/08/2026 (Theo Vietcombank / Tỷ giá hạch toán)', 'Reference FX rate updated: 25/08/2026 (Vietcombank / Accounting Rate)', '会計基準為替レート更新: 2026/08/25 (Vietcombank / 会計レート)')}</span>
                    </div>

                    {/* Hóa đơn, Hợp đồng & Chứng từ đính kèm (Hỗ trợ Xem Nhanh & Gắn Link trực tiếp) */}
                    <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-purple-200/80 dark:border-purple-900/60 flex items-center justify-between gap-2.5 text-xs flex-wrap">
                      <div className="flex items-center gap-3 flex-wrap">
                        {selectedDetailLicense.invoiceNumber && (
                          <button
                            type="button"
                            onClick={() => setIsDocPreviewOpen(true)}
                            className="flex items-center gap-1 font-mono text-slate-700 dark:text-slate-300 hover:text-purple-600 dark:hover:text-purple-400 transition-colors cursor-pointer group"
                            title={txt('Bấm để xem nhanh hóa đơn', 'Click to preview invoice', 'クリックして請求書をプレビュー')}
                          >
                            <Receipt className="w-3.5 h-3.5 text-purple-600 group-hover:scale-110 transition-transform" />
                            <span>{txt('HĐ:', 'Inv:', '請求書:')} <strong className="underline decoration-purple-300 underline-offset-2">{selectedDetailLicense.invoiceNumber}</strong></span>
                          </button>
                        )}
                        {selectedDetailLicense.contractNumber && (
                          <button
                            type="button"
                            onClick={() => setIsDocPreviewOpen(true)}
                            className="flex items-center gap-1 font-mono text-slate-700 dark:text-slate-300 hover:text-purple-600 dark:hover:text-purple-400 transition-colors cursor-pointer group"
                            title={txt('Bấm để xem nhanh hợp đồng', 'Click to preview contract', 'クリックして契約書をプレビュー')}
                          >
                            <FileText className="w-3.5 h-3.5 text-purple-600 group-hover:scale-110 transition-transform" />
                            <span>{txt('Hợp đồng:', 'Contract:', '契約書:')} <strong className="underline decoration-purple-300 underline-offset-2">{selectedDetailLicense.contractNumber}</strong></span>
                          </button>
                        )}
                        {selectedDetailLicense.contractUrl && (
                          <a
                            href={selectedDetailLicense.contractUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="px-2 py-0.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-md text-[11px] font-bold flex items-center gap-1 transition-colors"
                            title={txt('Mở đường dẫn tài liệu online', 'Open document link online', 'オンライン証憑を開く')}
                          >
                            <LinkIcon className="w-3 h-3" />
                            <span>Link Online</span>
                          </a>
                        )}
                        {!selectedDetailLicense.invoiceNumber && !selectedDetailLicense.contractNumber && !selectedDetailLicense.contractUrl && (
                          <span className="text-slate-400 italic text-[11px]">{txt('Chưa gắn chứng từ hoặc link xem', 'No document or link attached', '証憑またはリンクが未登録です')}</span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 flex-wrap">
                        <button
                          type="button"
                          onClick={() => setIsDocPreviewOpen(true)}
                          className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 active:scale-95 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                          title={txt('Bấm để xem nhanh chứng từ ngay tại màn hình này', 'Preview documents right on this screen', 'この画面で証憑をクイックプレビュー')}
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>{txt('Xem Nhanh Chứng Từ', 'Quick Preview Document', '証憑クイックプレビュー')}</span>
                        </button>

                        <a
                          href={`/documents?search=${encodeURIComponent(selectedDetailLicense.invoiceNumber || selectedDetailLicense.contractNumber || selectedDetailLicense.name || '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1.5 bg-purple-50 hover:bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors"
                          title={txt('Mở trong Kho chứng từ ở tab mới (không làm mất màn hình hiện tại)', 'Open in Document Archive in new tab', '新しいタブで証憑アーカイブを開く')}
                        >
                          <FolderOpen className="w-3.5 h-3.5 text-purple-600" />
                          <span>{txt('Kho Chứng Từ', 'Document Archive', '証憑アーカイブ')}</span>
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* DANH SÁCH NHÂN SỰ & THIẾT BỊ ĐƯỢC CẤP PHÁT (Nhìn nhanh phân bổ) */}
              {(() => {
                const rawBatches = selectedDetailLicense.batches || [];
                const childBatches = rawBatches.filter((b: any) => b && b.id !== selectedDetailLicense.id);
                const allBatches = [selectedDetailLicense, ...childBatches];
                const seenIds = new Set<string>();
                const allList: any[] = [];

                allBatches.forEach((b: any, idx: number) => {
                  const bName = b.specs?.batchName || b.specs?.batchLabel || b.name || (allBatches.length > 1 ? `Đợt ${idx + 1}` : b.name);
                  const bAssignments = b.assignments?.filter((a: any) => !a.revokedAt) || [];
                  bAssignments.forEach((a: any) => {
                    if (!seenIds.has(a.id)) {
                      seenIds.add(a.id);
                      allList.push({
                        ...a,
                        batchLabel: bName,
                      });
                    }
                  });
                });

                // Also include any allAssignments if passed from group
                if (Array.isArray(selectedDetailLicense.allAssignments)) {
                  selectedDetailLicense.allAssignments.forEach((a: any) => {
                    if (!a.revokedAt && !seenIds.has(a.id)) {
                      seenIds.add(a.id);
                      allList.push(a);
                    }
                  });
                }

                const calcTotal = allBatches.reduce((sum: number, b: any) => sum + (Number(b.totalSeats) || 1), 0);
                const total = selectedDetailLicense.groupTotalSeats || calcTotal;
                const isOver = allList.length > total;

                const filteredAssignments = allList.filter((asg: any) => {
                  if (!assignSearch.trim()) return true;
                  const q = assignSearch.toLowerCase().trim();
                  const assetHolder = asg.asset?.assignments?.find((a: any) => !a.returnedAt)?.user;
                  const u = asg.user || assetHolder;
                  const uName = (u?.fullName || '').toLowerCase();
                  const uEmail = (u?.email || '').toLowerCase();
                  const uDept = (u?.department || '').toLowerCase();
                  const uComp = (u?.companyName || '').toLowerCase();
                  const aTag = (asg.asset?.assetTag || '').toLowerCase();
                  const aName = (asg.asset?.name || '').toLowerCase();
                  const bLabel = (asg.batchLabel || asg.batchName || '').toLowerCase();
                  return (
                    uName.includes(q) ||
                    uEmail.includes(q) ||
                    uDept.includes(q) ||
                    uComp.includes(q) ||
                    aTag.includes(q) ||
                    aName.includes(q) ||
                    bLabel.includes(q)
                  );
                });

                return (
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                          <Users className="w-4 h-4 text-purple-600" />
                          <span>
                            {txt('Danh sách nhân sự & thiết bị được cấp phát', 'Assigned Personnel & Devices', '割り当て済み人員・機器')} ({assignSearch.trim() ? `${filteredAssignments.length}/${allList.length}` : allList.length} / {total} Seats)
                          </span>
                        </span>
                        {isOver && (
                          <span className="px-2 py-0.5 bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 rounded-full text-[10.5px] font-bold">
                            ⚠️ {txt('Cấp vượt hạn mức', 'Exceeded limit', '制限超過')} (+{allList.length - total})
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {/* Ô tìm kiếm nhỏ gọn */}
                        <div className="relative w-44 sm:w-52">
                          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                          <input
                            type="text"
                            value={assignSearch}
                            onChange={(e) => setAssignSearch(e.target.value)}
                            placeholder={txt('Tìm nhân sự, máy...', 'Search staff, device...', '検索...')}
                            className="w-full pl-8 pr-7 py-1 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1.5 focus:ring-purple-500 text-slate-900 dark:text-white placeholder:text-slate-400 transition-all"
                          />
                          {assignSearch && (
                            <button
                              type="button"
                              onClick={() => setAssignSearch('')}
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
                              title="Xóa tìm kiếm"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setIsDetailModalOpen(false);
                            handleOpenAssign(selectedDetailLicense);
                          }}
                          className="text-[11px] font-bold text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1 cursor-pointer whitespace-nowrap"
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          <span>+ {txt('Quản lý cấp phát', 'Manage Seats', '割り当て管理')}</span>
                        </button>
                      </div>
                    </div>

                    {allList.length === 0 ? (
                      <div className="text-center py-6 bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 space-y-1">
                        <Users className="w-6 h-6 text-slate-300 mx-auto" />
                        <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
                          {txt('Chưa có nhân sự hoặc thiết bị nào được cấp phát seat', 'No personnel or device has been assigned a seat yet', 'シートを割り当てられた人員または機器はまだありません')}
                        </p>
                        <p className="text-[10.5px] text-slate-400">
                          {txt('Bấm "Cấp Phát / Thu Hồi Seats" để bắt đầu phân bổ license cho nhân viên hoặc máy tính.', 'Click "Assign / Revoke Seats" to allocate licenses to employees or computers.', '「シート割り当て/回収」をクリックしてライセンスを割り当ててください。')}
                        </p>
                      </div>
                    ) : filteredAssignments.length === 0 ? (
                      <div className="text-center py-6 bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 space-y-1">
                        <Search className="w-6 h-6 text-slate-300 mx-auto" />
                        <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
                          {txt('Không tìm thấy nhân sự hoặc thiết bị phù hợp', 'No matching personnel or device found', '該当する人員・機器が見つかりません')}
                        </p>
                        <p className="text-[10.5px] text-slate-400">
                          {txt('Không có kết quả nào khớp với từ khóa tìm kiếm', 'No results match your search keyword', '検索キーワードに一致する結果がありません')}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                        {filteredAssignments.map((asg: any, index: number) => {
                          const assetHolder = asg.asset?.assignments?.find((a: any) => !a.returnedAt)?.user;
                          const displayUser = asg.user || assetHolder;

                          return (
                            <div
                              key={asg.id || index}
                              className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs"
                            >
                              <div className="space-y-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  {displayUser ? (
                                    <QuickLink
                                      type="user"
                                      id={displayUser.id}
                                      label={displayUser.fullName}
                                      subLabel={displayUser.department}
                                      icon="👤"
                                      className="font-bold text-xs text-slate-900 dark:text-white"
                                    />
                                  ) : (
                                    <span className="text-xs font-semibold text-slate-400 italic">
                                      ⚪ {txt('Chưa gán nhân sự (Chỉ gán máy trong kho)', 'No personnel assigned (Inventory device only)', '担当者未設定 (在庫機器のみ)')}
                                    </span>
                                  )}

                                  {displayUser?.isActive === false ? (
                                    <span className="px-2 py-0.5 bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 dark:border-rose-800 rounded-md text-[10px] font-extrabold flex items-center gap-1">
                                      ⚠️ {txt('Nghỉ việc / Inactive', 'Resigned / Inactive Staff', '退職・無効')}
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.2 bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-md text-[10px] font-bold">
                                      🟢 {txt('Đang hoạt động', 'Active', '利用中')}
                                    </span>
                                  )}

                                  {asg.asset && ['MAINTENANCE', 'RETIRED', 'LOST'].includes(asg.asset.status) && (
                                    <span className="px-2 py-0.5 bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800 rounded-md text-[10px] font-extrabold flex items-center gap-1">
                                      ⚠️ {txt(`Máy ${asg.asset.status}`, `Device ${asg.asset.status}`, `機器状態: ${asg.asset.status}`)}
                                    </span>
                                  )}

                                  {asg.batchLabel && (
                                    <span className="px-1.5 py-0.2 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-[9.5px] font-bold">
                                      🏷️ {asg.batchLabel}
                                    </span>
                                  )}
                                </div>

                                <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-3 flex-wrap">
                                  {asg.asset ? (
                                    <span className="inline-flex items-center gap-1">
                                      <span className="text-slate-400 text-xs">💻 {txt('Máy:', 'Device:', '機器:')}</span>
                                      <QuickLink
                                        type="asset"
                                        id={asg.asset.id}
                                        label={`[${asg.asset.assetTag}] ${asg.asset.name}`}
                                        icon="💻"
                                        showIcon={false}
                                        className="font-bold text-purple-700 dark:text-purple-300 text-xs"
                                      />
                                    </span>
                                  ) : (
                                    <span className="text-slate-400 italic">💻 {txt('Chưa gắn máy tính cụ thể', 'No specific device linked', '特定PCの紐付けなし')}</span>
                                  )}
                                  <span>📅 {txt('Ngày gán:', 'Assigned Date:', '割当日:')} {formatDateI18n(asg.assignedAt)}</span>
                                </div>
                              </div>

                              {(displayUser?.isActive === false || (asg.asset && ['MAINTENANCE', 'RETIRED', 'LOST'].includes(asg.asset.status))) && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    onClose();
                                    if (onOpenAssign) onOpenAssign(selectedDetailLicense);
                                  }}
                                  className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1 shrink-0 cursor-pointer"
                                  title={txt('Mở cửa sổ cấp phát để thu hồi license này', 'Open assign modal to reclaim this license', 'ライセンス回収画面を開く')}
                                >
                                  <span>⚡ {txt('Thu hồi lãng phí', 'Reclaim License', '回収')}</span>
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* KHUNG GIA HẠN & LỊCH SỬ THANH TOÁN (CHO BẢN QUYỀN KHÔNG VĨNH VIỄN) */}
              {((selectedDetailLicense.licenseType && selectedDetailLicense.licenseType !== 'PERPETUAL') || !!selectedDetailLicense.expiryDate) && (() => {
                const effectivePayments = getEffectiveLicensePayments(selectedDetailLicense, exchangeRatesMap);
                const nextBatchNumber = effectivePayments.length + 1;

                return (
                  <div className="space-y-3">
                    {/* Khung Lịch Sử Thanh Toán / Gia Hạn */}
                    <div className="p-4 bg-gradient-to-r from-purple-50/70 via-indigo-50/60 to-blue-50/70 dark:from-slate-800/70 dark:to-slate-800/50 rounded-2xl border border-purple-200/80 dark:border-purple-800/60 space-y-3 shadow-2xs">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-xs">
                            <Receipt className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <h4 className="text-xs font-black text-purple-950 dark:text-purple-200 uppercase tracking-wider">
                              {txt('Lịch Sử Thanh Toán & Gia Hạn Bản Quyền', 'Payment & Renewal History', '支払・更新履歴')} ({effectivePayments.length})
                            </h4>
                            <p className="text-[10.5px] text-purple-700/80 dark:text-purple-300">
                              {txt('Theo dõi các đợt thanh toán cước gia hạn bản quyền phần mềm', 'Track fee payments for software license renewals', 'ソフトウェアライセンス更新費用の支払いを追跡')}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {/* Cumulative payment badge */}
                          <div className="px-3 py-1 bg-white dark:bg-slate-900 border border-purple-300 dark:border-purple-700 rounded-xl shadow-2xs text-right">
                            <span className="text-[9.5px] font-bold text-slate-500 block uppercase">{txt('Tổng tiền đã thanh toán:', 'Total Paid Amount:', '支払累計総額:')}</span>
                            <span className="text-xs font-black text-purple-900 dark:text-purple-200 font-mono">
                              {formatCurrency(
                                effectivePayments.reduce((acc: number, p: PaymentRecord) => acc + (Number(p.amount) || 0), 0)
                              )}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              const cur = (selectedDetailLicense.purchaseCurrency || 'VND').toUpperCase();
                              const curObj = currencies.find((c) => c.code === cur);
                              const rate = curObj ? curObj.rateToVnd : (exchangeRatesMap[cur] || 1);

                              const startStr = selectedDetailLicense.expiryDate
                                ? new Date(selectedDetailLicense.expiryDate).toISOString().split('T')[0]
                                : (selectedDetailLicense.purchaseDate ? new Date(selectedDetailLicense.purchaseDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);

                              const baseDate = new Date(startStr);
                              const nextEnd = new Date(baseDate);
                              nextEnd.setFullYear(nextEnd.getFullYear() + 1);
                              const endStr = nextEnd.toISOString().split('T')[0];

                              const sFormatted = new Date(startStr).toLocaleDateString('vi-VN');
                              const eFormatted = nextEnd.toLocaleDateString('vi-VN');

                              setPaymentForm({
                                paymentDate: new Date().toISOString().split('T')[0],
                                amount: selectedDetailLicense.purchasePrice ? String(selectedDetailLicense.purchasePrice) : '',
                                currency: cur,
                                exchangeRate: rate,
                                period: txt(`Đợt ${nextBatchNumber}: Kỳ từ ${sFormatted} đến ${eFormatted}`, `Batch ${nextBatchNumber}: Period from ${sFormatted} to ${eFormatted}`, `第${nextBatchNumber}回: ${sFormatted} ～ ${eFormatted}`),
                                periodStartDate: startStr,
                                periodEndDate: endStr,
                                invoiceNumber: selectedDetailLicense.invoiceNumber || '',
                                contractNumber: selectedDetailLicense.contractNumber || '',
                                status: 'PAID',
                                notes: '',
                              });
                              setIsAddPaymentModalOpen(true);
                            }}
                            className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-2xs cursor-pointer transition-colors"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>+ {txt('Ghi nhận đợt thanh toán / gia hạn', 'Record Payment / Renewal', '支払・更新レコード追加')} ({txt('Đợt', 'Batch', '第')} {nextBatchNumber}{txt('', '', '回')})</span>
                          </button>
                        </div>
                      </div>

                      {/* Table of Payment Records */}
                      <div className="overflow-x-auto rounded-xl border border-purple-200/80 dark:border-purple-800/80 bg-white dark:bg-slate-900 shadow-2xs">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead className="bg-purple-100/50 dark:bg-purple-950/60 text-[10px] font-bold text-purple-900 dark:text-purple-200 uppercase tracking-wider border-b border-purple-200/80 dark:border-purple-800/80">
                            <tr>
                              <th className="py-2.5 px-3">{txt('Ngày Thanh Toán', 'Payment Date', '支払日')}</th>
                              <th className="py-2.5 px-3">{txt('Số Tiền & Ngoại Tệ', 'Amount & Currency', '金額・通貨')}</th>
                              <th className="py-2.5 px-3">{txt('Kỳ Áp Dụng / Thời Gian', 'Applicable Period', '適用期間')}</th>
                              <th className="py-2.5 px-3">{txt('Số Hóa Đơn / Hợp Đồng', 'Invoice / Contract No.', '請求書・契約番号')}</th>
                              <th className="py-2.5 px-3">{txt('Trạng Thái', 'Status', 'ステータス')}</th>
                              <th className="py-2.5 px-3">{txt('Ghi Chú', 'Notes', '備考')}</th>
                              <th className="py-2.5 px-2 text-right">{txt('Xóa', 'Delete', '削除')}</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-purple-100/60 dark:divide-slate-800">
                            {effectivePayments.length === 0 ? (
                              <tr>
                                <td colSpan={7} className="py-6 text-center text-xs text-slate-400 italic">
                                  {txt('Chưa có dữ liệu đợt thanh toán nào được ghi nhận. Bấm nút "+ Ghi nhận đợt thanh toán / gia hạn" ở trên để thêm!', 'No payment records found. Click "+ Record Payment / Renewal" above to add!', '支払データが登録されていません。上の「+ 支払・更新レコード追加」ボタンから登録してください。')}
                                </td>
                              </tr>
                            ) : (
                              effectivePayments.map((p: PaymentRecord) => {
                                const pCur = (p.currency || 'VND').toUpperCase();
                                const rawAmt = p.originalAmount !== undefined ? p.originalAmount : (Number(p.amount) || 0);
                                const inVnd = Number(p.amount) || (rawAmt * (p.exchangeRate || exchangeRatesMap[pCur] || 1));
                                const convertedAmt = convertCurrency(inVnd, 'VND', selectedCurrency, exchangeRatesMap);
                                const isDual = pCur !== 'VND' && pCur !== selectedCurrency.toUpperCase();

                                return (
                                  <tr key={p.id} className="hover:bg-purple-50/50 dark:hover:bg-slate-800/50 transition-colors">
                                    <td className="py-2 px-3 font-mono font-bold text-slate-800 dark:text-slate-200">
                                      {formatDateI18n(p.paymentDate)}
                                    </td>
                                    <td className="py-2 px-3">
                                      <div className="space-y-0.5">
                                        <span className="font-mono font-black text-purple-900 dark:text-purple-200 block">
                                          {formatPrice(convertedAmt, selectedCurrency)}
                                        </span>
                                        {isDual && (
                                          <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 block font-mono">
                                            {txt('Gốc:', 'Orig:', '原価:')} {formatPrice(rawAmt, pCur)}
                                          </span>
                                        )}
                                        <span className="text-[9px] text-slate-400 block font-mono">
                                          ({txt('Tỷ giá:', 'Rate:', 'レート:')} {p.paymentDate ? formatDateI18n(p.paymentDate) : '25/08/2026'})
                                        </span>
                                      </div>
                                    </td>
                                    <td className="py-2 px-3 font-medium text-slate-700 dark:text-slate-300 min-w-[150px]">
                                      <span className="font-semibold text-slate-900 dark:text-white block">{p.period || txt('Kỳ gia hạn', 'Renewal Period', '更新期')}</span>
                                      {p.periodStartDate && p.periodEndDate && (
                                        <span className="text-[10px] text-slate-500 font-mono block mt-0.5">
                                          📅 {formatDate(p.periodStartDate)} → {formatDate(p.periodEndDate)}
                                        </span>
                                      )}
                                    </td>
                                    <td className="py-2 px-3 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                                      {p.invoiceNumber || p.contractNumber || '—'}
                                    </td>
                                    <td className="py-2 px-3">
                                      <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 px-2 py-0.2 rounded-md text-[10px] font-bold">
                                        <Check className="w-3 h-3" />
                                        <span>{p.status === 'PAID' ? txt('Đã thanh toán', 'Paid', '支払済') : txt('Chờ xử lý', 'Pending', '処理待ち')}</span>
                                      </span>
                                    </td>
                                    <td className="py-2 px-3 text-slate-500 dark:text-slate-400 text-[11px] truncate max-w-[180px]">
                                      {p.notes || '—'}
                                    </td>
                                    <td className="py-2 px-2 text-right">
                                      <button
                                        type="button"
                                        onClick={() => handleDeletePaymentRecord(selectedDetailLicense.id, p.id)}
                                        title={txt('Xóa đợt thanh toán này', 'Delete this payment record', 'この支払レコードを削除')}
                                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800 rounded cursor-pointer transition-colors"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Quick Renew Section */}
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl space-y-2">
                      <h4 className="font-bold text-xs text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                        <RotateCcw className="w-3.5 h-3.5 text-purple-600" />
                        <span>{txt('Gia Hạn Nhanh Bản Quyền:', 'Quick Renew License:', 'ライセンスのクイック更新:')}</span>
                      </h4>
                      <div className="flex items-center gap-2 flex-wrap pt-1">
                        {[
                          { label: txt('+ 1 Tháng', '+ 1 Month', '+ 1ヶ月'), months: 1 },
                          { label: txt('+ 3 Tháng (Quý)', '+ 3 Months (Quarter)', '+ 3ヶ月 (四半期)'), months: 3 },
                          { label: txt('+ 6 Tháng', '+ 6 Months', '+ 6ヶ月'), months: 6 },
                          { label: txt('+ 1 Năm (12T)', '+ 1 Year (12M)', '+ 1年 (12ヶ月)'), months: 12 },
                          { label: txt('+ 2 Năm (24T)', '+ 2 Years (24M)', '+ 2年 (24ヶ月)'), months: 24 },
                          { label: txt('+ 3 Năm (36T)', '+ 3 Years (36M)', '+ 3年 (36ヶ月)'), months: 36 },
                        ].map((chip) => (
                          <button
                            key={chip.months}
                            type="button"
                            onClick={() => handleQuickRenew(selectedDetailLicense, chip.months)}
                            className="px-3 py-1.5 bg-white dark:bg-slate-900 hover:bg-purple-600 hover:text-white dark:hover:bg-purple-600 border border-purple-200 dark:border-purple-800 rounded-xl text-xs font-bold text-purple-700 dark:text-purple-300 transition-all cursor-pointer shadow-2xs active:scale-95"
                          >
                            {chip.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {selectedDetailLicense.notes && (
                <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700">
                  <span className="text-[10.5px] font-bold text-slate-400 block mb-1">{txt('Ghi chú:', 'Notes:', '備考:')}</span>
                  <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                    {selectedDetailLicense.notes}
                  </p>
                </div>
              )}
            </div>

            {/* Sticky Footer */}
            <div className="flex items-center justify-between px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90 rounded-b-3xl shrink-0">
              <button
                type="button"
                onClick={() => {
                  setIsDetailModalOpen(false);
                  handleOpenAssign(selectedDetailLicense);
                }}
                className="px-4 py-2 bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/60 dark:hover:bg-purple-900 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
              >
                <Users className="w-3.5 h-3.5" />
                <span>{txt('Cấp Phát / Thu Hồi Seats', 'Assign / Revoke Seats', 'シート割り当て/回収')}</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsDetailModalOpen(false);
                    handleOpenEdit(selectedDetailLicense);
                  }}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1.5 active:scale-95"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>{txt('Sửa Thông Tin', 'Edit License', 'ライセンス編集')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsDetailModalOpen(false)}
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold cursor-pointer active:scale-95"
                >
                  {txt('Đóng (Esc)', 'Close (Esc)', '閉じる (Esc)')}
                </button>
              </div>
            </div>
          </div>
        </div>
      
  );
}
