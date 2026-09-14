'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import {
  Clock,
  Receipt,
  Plus,
  RotateCcw,
  Edit2,
  FileText,
  Trash2,
  X,
  DollarSign,
  Eye,
  Link as LinkIcon,
  FolderOpen,
  Check,
} from 'lucide-react';
import { useLanguage } from '@/lib/i18n/context';
import { QuickLink } from '@/components/common/QuickLink';
import { formatDate, formatCurrency, numberToVietnameseWords } from '@/lib/utils';
import {
  ITServiceItem,
  CurrencyConfig,
  PaymentRecord,
  convertCurrency,
  getEffectiveServicePayments,
  getBillingCycleLabel,
  getServiceTypeLabel,
  formatPrice,
  DEFAULT_SERVICE_TYPES,
  calculateNextRenewalDate,
} from './types';

export interface ServiceDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  service: ITServiceItem | any;
  selectedCurrency: string;
  users?: any[];
  assets?: any[];
  currencies?: CurrencyConfig[];
  exchangeRatesMap?: Record<string, number>;
  onOpenEdit?: (service: any) => void;
  onQuickRenew?: (service: any, months: number) => void;
  onDeletePaymentRecord?: (serviceId: string, payId: string) => void;
  onOpenDocPreview?: (service: any) => void;
  onOpenAddPayment?: (service: any) => void;
}

export function ServiceDetailModal({
  isOpen,
  onClose,
  service: selectedService,
  selectedCurrency,
  users = [],
  assets = [],
  currencies = [],
  exchangeRatesMap = {},
  onOpenEdit,
  onQuickRenew,
  onDeletePaymentRecord,
  onOpenDocPreview,
  onOpenAddPayment,
}: ServiceDetailModalProps) {
  // ESC key listener to close modal
  useEffect(() => {
    if (!isOpen) return;
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

  if (!isOpen || !selectedService) return null;

  const setIsDetailModalOpen = (open: boolean) => {
    if (!open) onClose();
  };

  const handleOpenEdit = (svc: any) => {
    if (onOpenEdit) onOpenEdit(svc);
  };

  const handleQuickRenew = (svc: any, months: number) => {
    if (onQuickRenew) onQuickRenew(svc, months);
  };

  const handleDeletePaymentRecord = (serviceId: string, payId: string) => {
    if (onDeletePaymentRecord) onDeletePaymentRecord(serviceId, payId);
  };

  const setIsDocPreviewOpen = (open: boolean) => {
    if (open && onOpenDocPreview) onOpenDocPreview(selectedService);
  };

  const setIsAddPaymentModalOpen = (open: boolean) => {
    if (open && onOpenAddPayment) onOpenAddPayment(selectedService);
  };

  const setPaymentForm = (_: any) => {
    if (onOpenAddPayment) onOpenAddPayment(selectedService);
  };

  const renderStatusBadge = (status: string, renewalDate: string | null) => {
    if (status === 'EXPIRED') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
          {txt('Đã quá hạn', 'Expired', '期限切れ')}
        </span>
      );
    }
    if (status === 'PENDING_RENEWAL') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
          <Clock className="w-3 h-3 text-amber-500" />
          {txt('Sắp đến hạn', 'Pending Renewal', '更新期限間近')}
        </span>
      );
    }
    if (status === 'ACTIVE') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>{txt('Đang hoạt động', 'Active', 'アクティブ')}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
        {status}
      </span>
    );
  };

  return (

        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-3 sm:p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-5xl w-full flex flex-col max-h-[92vh] border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-purple-50 to-indigo-50 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-600 text-white flex items-center justify-center shadow-xs text-lg font-bold">
                  🌐
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-purple-700 bg-purple-100/70 px-2 py-0.5 rounded-md">
                      {selectedService.serviceCode}
                    </span>
                    {renderStatusBadge(selectedService.status, selectedService.renewalDate)}
                  </div>
                  <h3 className="font-extrabold text-base text-slate-900 leading-snug mt-0.5">{selectedService.name}</h3>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setIsDetailModalOpen(false);
                    handleOpenEdit(selectedService);
                  }}
                  className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>{txt('Sửa', 'Edit', '編集')}</span>
                </button>
                <button
                  onClick={() => setIsDetailModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto space-y-5 text-xs flex-1">
              {/* Specs and Key Info Cards */}
              {(() => {
                const rawCost = Number(selectedService.cost) || 0;
                const rawCurr = (selectedService.currency || 'VND').toUpperCase();
                const rate = selectedService.specs?.exchangeRate || exchangeRatesMap[rawCurr] || 1;
                const inVnd = rawCost * rate;
                const convertedCost = convertCurrency(rawCost, rawCurr, selectedCurrency, exchangeRatesMap);
                const isDual = rawCost > 0 && rawCurr !== selectedCurrency.toUpperCase();

                // Tính chi phí dự toán 1 năm (Annual cost)
                const pCount = selectedService.specs?.billingPeriodCount || (selectedService.billingCycle === 'ANNUAL' ? 1 : selectedService.billingCycle === 'QUARTERLY' ? 3 : selectedService.billingCycle === 'SEMI_ANNUAL' ? 6 : selectedService.billingCycle === 'BIENNIAL' ? 2 : selectedService.billingCycle === 'TRIENNIAL' ? 3 : 1);
                const pUnit = selectedService.specs?.billingPeriodUnit || (['ANNUAL', 'BIENNIAL', 'TRIENNIAL'].includes(selectedService.billingCycle) ? 'YEAR' : selectedService.billingCycle === 'ONE_TIME' ? 'ONE_TIME' : 'MONTH');
                let annualFactor = 12;
                if (pUnit === 'MONTH') annualFactor = 12 / (pCount || 1);
                else if (pUnit === 'YEAR') annualFactor = 1 / (pCount || 1);
                else if (pUnit === 'DAY') annualFactor = 365 / (pCount || 1);
                else if (pUnit === 'ONE_TIME') annualFactor = 1;
                const annualCost = convertedCost * annualFactor;

                const totalPaid = (Array.isArray(selectedService.specs?.paymentHistory)
                  ? selectedService.specs.paymentHistory
                  : []
                ).reduce((acc: number, p: PaymentRecord) => acc + (Number(p.amount) || 0), 0);

                const assignedUser = users.find((u: any) => u.id === selectedService.specs?.assignedUserId);
                const assignedAsset = assets.find((a: any) => a.id === selectedService.specs?.assignedAssetId);

                return (
                  <>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {/* Card 1: Trạng thái */}
                      <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl space-y-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{txt('Trạng thái', 'Status', 'ステータス')}</span>
                        <div className="mt-0.5">
                          {renderStatusBadge(selectedService.status, selectedService.renewalDate)}
                        </div>
                        <span className="text-[10px] text-slate-500 block truncate">
                          {txt('Loại:', 'Type:', 'タイプ:')} {getServiceTypeLabel(selectedService.serviceType, language)}
                        </span>
                      </div>

                      {/* Card 2: Chu kỳ & Hạn gia hạn */}
                      <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl space-y-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{txt('Hạn gia hạn tiếp theo', 'Next Renewal Date', '次回更新期限')}</span>
                        <p className="text-sm font-black text-purple-700 dark:text-purple-300 font-mono">
                          {selectedService.renewalDate ? formatDateI18n(selectedService.renewalDate) : txt('Vĩnh viễn', 'Perpetual', '無期限')}
                        </p>
                        <span className="text-[10px] text-slate-500 block">
                          {txt('Chu kỳ:', 'Cycle:', 'サイクル:')} {selectedService.specs?.billingPeriodCount ? `${selectedService.specs.billingPeriodCount} ${selectedService.specs.billingPeriodUnit === 'YEAR' ? txt('Năm', 'Year(s)', '年') : txt('Tháng', 'Month(s)', 'ヶ月')} / ${txt('lần', 'cycle', '回')}` : getBillingCycleLabel(selectedService.billingCycle, language)}
                        </span>
                      </div>

                      {/* Card 3: Công ty & Đối tác / Phụ trách (Không dùng truncate) */}
                      <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl space-y-1 flex flex-col justify-between">
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                            {txt('Công ty & Phụ trách', 'Company & Person in Charge', '会社・担当者')}
                          </span>
                          <p className="text-xs font-bold text-indigo-950 dark:text-indigo-200 whitespace-normal break-words leading-snug">
                            🏢 {selectedService.companyName || txt('Công ty chung', 'General Company', '共通企業')}
                          </p>
                        </div>
                        <div className="text-[10.5px] text-slate-500 whitespace-normal break-words leading-tight space-y-0.5 pt-1 border-t border-slate-200/60">
                          {assignedUser && (
                            <span className="block text-indigo-700 dark:text-indigo-300 font-semibold truncate">
                              👤 {assignedUser.fullName}
                            </span>
                          )}
                          {assignedAsset && (
                            <span className="block text-blue-700 dark:text-blue-300 font-mono font-semibold truncate">
                              💻 [{assignedAsset.assetTag}] {assignedAsset.name}
                            </span>
                          )}
                          {!assignedUser && !assignedAsset && (
                            selectedService.vendor ? (
                              <div className="flex items-start gap-1">
                                <span className="text-slate-400 shrink-0">{txt('Đối tác:', 'Vendor:', 'ベンダー:')}</span>
                                <QuickLink
                                  type="vendor"
                                  id={selectedService.vendor.id || selectedService.vendor.name}
                                  label={selectedService.vendor.name}
                                  icon="🏢"
                                  showIcon={false}
                                  multiline
                                  maxLines={3}
                                  className="font-bold text-indigo-700 dark:text-indigo-300 text-[10.5px] leading-snug line-clamp-3 break-words"
                                />
                              </div>
                            ) : (
                              <span className="text-slate-400 italic">{txt('Đối tác: —', 'Vendor: —', 'ベンダー: —')}</span>
                            )
                          )}
                        </div>
                      </div>

                      {/* Card 4: Chi phí chu kỳ (Dual-Currency) */}
                      <div className="p-3.5 bg-purple-50/60 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 rounded-2xl space-y-1 flex flex-col justify-between">
                        <div>
                          <span className="text-[10px] font-bold text-purple-700 dark:text-purple-300 uppercase tracking-wider block mb-0.5">
                            {txt('Chi phí mỗi kỳ', 'Recurring Cost', 'サイクル利用料')}
                          </span>
                          <p className="text-sm font-black text-purple-950 dark:text-purple-200 font-mono">
                            {rawCost > 0 ? formatPrice(convertedCost, selectedCurrency) : txt('Trọn gói', 'Package / Flat-rate', '定額・無料')}
                          </p>
                          {isDual && (
                            <p className="text-[10.5px] font-bold text-emerald-700 dark:text-emerald-400 block font-mono">
                              {txt('Gốc:', 'Orig:', '原価:')} {formatPrice(rawCost, rawCurr)}
                            </p>
                          )}
                        </div>
                        <div className="pt-1 border-t border-purple-200/60 space-y-0.5">
                          <span className="text-[10px] text-purple-800/80 dark:text-purple-300 block">
                            {txt('Dự toán năm:', 'Annual Budget:', '年間予算:')} <strong>{formatPrice(annualCost, selectedCurrency)}</strong>
                          </span>
                          <span className="text-[9.5px] text-slate-400 block font-mono">
                            {txt('(Tỷ giá quy đổi ngày 25/08/2026)', '(FX rate as of 25/08/2026)', '(為替レート基準日: 2026/08/25)')}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* THANH CHỈ SỐ TÀI CHÍNH & CHI PHÍ DỊCH VỤ */}
                    <div className="p-4 bg-gradient-to-r from-purple-50/80 via-indigo-50/70 to-blue-50/80 dark:from-slate-800/80 dark:to-slate-800/50 border border-purple-200/80 dark:border-purple-900/60 rounded-2xl space-y-3">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <span className="text-xs font-extrabold text-purple-950 dark:text-purple-200 uppercase tracking-wider flex items-center gap-1.5">
                          <DollarSign className="w-4 h-4 text-purple-600" />
                          <span>{txt('Chỉ Số Tài Chính & Chi Phí Tích Lũy', 'Financial Metrics & Accumulated Cost', '財務指標と累積コスト')}</span>
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-200/80 text-purple-950 dark:bg-purple-900 dark:text-purple-200">
                          {txt('Hạch toán dịch vụ IT', 'IT Service Accounting', 'ITサービス会計')}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                        <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-purple-100 dark:border-slate-800 shadow-2xs">
                          <span className="text-[9.5px] font-bold text-slate-400 uppercase block">{txt('1. Giá kỳ gốc', '1. Original Period Cost', '1. 原価（期間）')}</span>
                          <span className="text-xs font-black text-slate-900 dark:text-white font-mono block mt-0.5 truncate">
                            {formatPrice(rawCost, rawCurr)}
                          </span>
                        </div>

                        <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-purple-100 dark:border-slate-800 shadow-2xs">
                          <span className="text-[9.5px] font-bold text-slate-400 uppercase block">{txt('2. Tỷ giá hạch toán', '2. Accounting FX Rate', '2. 会計為替レート')}</span>
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 font-mono block mt-0.5 truncate">
                            1 {rawCurr} = {new Intl.NumberFormat(isJa ? 'ja-JP' : (isEn ? 'en-US' : 'vi-VN')).format(rate)} {isVi ? 'đ' : 'VND'}
                          </span>
                        </div>

                        <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-purple-100 dark:border-slate-800 shadow-2xs">
                          <span className="text-[9.5px] font-bold text-purple-600 uppercase block">{txt('3. Giá mỗi kỳ', '3. Cost / Cycle', '3. サイクル利用料')} ({selectedCurrency})</span>
                          <span className="text-xs font-black text-purple-900 dark:text-purple-300 font-mono block mt-0.5 truncate">
                            {formatPrice(convertedCost, selectedCurrency)}
                          </span>
                        </div>

                        <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-indigo-100 dark:border-slate-800 shadow-2xs">
                          <span className="text-[9.5px] font-bold text-indigo-600 uppercase block">{txt('4. Dự toán 1 Năm', '4. Annual Budget', '4. 年間予算見積')}</span>
                          <span className="text-xs font-black text-indigo-900 dark:text-indigo-300 font-mono block mt-0.5 truncate">
                            {formatPrice(annualCost, selectedCurrency)}
                          </span>
                        </div>

                        <div className="col-span-2 sm:col-span-1 p-2.5 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800 shadow-2xs">
                          <span className="text-[9.5px] font-bold text-emerald-700 uppercase block">{txt('5. Đã đóng lũy kế', '5. Cumulative Paid', '5. 累積支払額')}</span>
                          <span className="text-xs font-black text-emerald-900 dark:text-emerald-300 font-mono block mt-0.5 truncate">
                            {formatPrice(totalPaid, 'VND')}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* KHỐI BÁO CÁO ĐỊNH GIÁ & HẠCH TOÁN CHI TIẾT */}
                    <div className="p-4 bg-gradient-to-r from-purple-50/70 to-indigo-50/70 border border-purple-200/80 rounded-2xl space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-purple-950 flex items-center gap-1.5 uppercase tracking-wider">
                          <DollarSign className="w-3.5 h-3.5 text-purple-600" />
                          <span>{txt('Chứng từ & Định giá chu kỳ dịch vụ', 'Documentation & Service Valuation', '証憑・サービス評価')}</span>
                        </span>
                        <span className="text-[10px] font-extrabold bg-purple-200/80 text-purple-900 px-2 py-0.5 rounded-full">
                          {txt('Đa Tiền Tệ Hạch Toán', 'Multi-Currency Accounting', '多通貨会計')}
                        </span>
                      </div>

                      {/* Đọc số tiền bằng chữ tiếng Việt */}
                      {rawCost > 0 && (
                        <div className="p-2.5 bg-purple-100/50 border border-purple-200 rounded-xl text-xs text-purple-950 font-medium italic">
                          <span>✍️ {txt('Bằng chữ:', 'In words:', '金額（文字表記）:')} <strong>{numberToVietnameseWords(inVnd)}</strong></span>
                        </div>
                      )}

                      {/* Dòng Quy đổi nhanh theo Tiền tệ ưu tiên */}
                      <div className="p-2.5 bg-white/90 dark:bg-slate-900 rounded-xl border border-purple-200/60 space-y-0.5">
                        <div className="flex items-center justify-between text-purple-900 dark:text-purple-200 font-semibold text-[11px]">
                          <span>⚡ {txt('Quy đổi theo Tiền tệ ưu tiên', 'Converted to Preferred Currency', '優先通貨換算')} [{selectedCurrency}]:</span>
                          <span className="font-black font-mono">{formatPrice(convertedCost, selectedCurrency)}</span>
                        </div>
                        <p className="text-[10px] text-slate-500 font-mono">
                          ({txt('Tỷ giá hạch toán:', 'Accounting FX Rate:', '会計為替レート:')} 1 {rawCurr} = {new Intl.NumberFormat(isJa ? 'ja-JP' : (isEn ? 'en-US' : 'vi-VN')).format(rate)} VND)
                        </p>
                      </div>

                      {/* Mốc thời gian tham chiếu tỷ giá & Ghi chú đối soát */}
                      <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-[10.5px] text-slate-600">
                        <div className="flex items-center gap-1.5 text-slate-700 font-semibold">
                          <Clock className="w-3.5 h-3.5 text-purple-600" />
                          <span>🕒 {txt('Tỷ giá tham chiếu hạch toán cập nhật: 25/08/2026 (Theo Vietcombank / Tỷ giá hạch toán)', 'Reference FX rate updated: 25/08/2026 (Vietcombank / Accounting Rate)', '会計基準為替レート更新: 2026/08/25 (Vietcombank / 会計レート)')}</span>
                        </div>
                        <div className="text-slate-500">
                          💡 {txt('Tỷ giá cố định phục vụ đối soát tài chính và tính khấu hao dồn tích.', 'Fixed exchange rate for financial reconciliation and accrual tracking.', '財務突合および発生主義会計のための固定為替レート。')}
                        </div>
                      </div>

                      {/* Hóa đơn, Hợp đồng & Chứng từ đính kèm (Hỗ trợ Xem Nhanh & Gắn Link) */}
                      <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-purple-200/80 dark:border-purple-900/60 flex items-center justify-between gap-2.5 text-xs flex-wrap">
                        <div className="flex items-center gap-3 flex-wrap">
                          {selectedService.invoiceNumber && (
                            <button
                              type="button"
                              onClick={() => setIsDocPreviewOpen(true)}
                              className="flex items-center gap-1 font-mono text-slate-700 dark:text-slate-300 hover:text-purple-600 dark:hover:text-purple-400 transition-colors cursor-pointer group"
                              title={txt('Bấm để xem nhanh hóa đơn', 'Click to preview invoice', 'クリックして請求書をプレビュー')}
                            >
                              <Receipt className="w-3.5 h-3.5 text-purple-600 group-hover:scale-110 transition-transform" />
                              <span>{txt('HĐ:', 'Inv:', '請求書:')} <strong className="underline decoration-purple-300 underline-offset-2">{selectedService.invoiceNumber}</strong></span>
                            </button>
                          )}
                          {selectedService.contractNumber && (
                            <button
                              type="button"
                              onClick={() => setIsDocPreviewOpen(true)}
                              className="flex items-center gap-1 font-mono text-slate-700 dark:text-slate-300 hover:text-purple-600 dark:hover:text-purple-400 transition-colors cursor-pointer group"
                              title={txt('Bấm để xem nhanh hợp đồng', 'Click to preview contract', 'クリックして契約書をプレビュー')}
                            >
                              <FileText className="w-3.5 h-3.5 text-purple-600 group-hover:scale-110 transition-transform" />
                              <span>{txt('Hợp đồng:', 'Contract:', '契約書:')} <strong className="underline decoration-purple-300 underline-offset-2">{selectedService.contractNumber}</strong></span>
                            </button>
                          )}
                          {selectedService.contractUrl && (
                            <a
                              href={selectedService.contractUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="px-2 py-0.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-md text-[11px] font-bold flex items-center gap-1 transition-colors"
                              title={txt('Mở đường dẫn tài liệu online', 'Open document link online', 'オンライン証憑を開く')}
                            >
                              <LinkIcon className="w-3 h-3" />
                              <span>Link Online</span>
                            </a>
                          )}
                          {!selectedService.invoiceNumber && !selectedService.contractNumber && !selectedService.contractUrl && (
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
                            href={`/documents?search=${encodeURIComponent(selectedService.invoiceNumber || selectedService.contractNumber || selectedService.name || '')}`}
                            target="_blank"
                            rel="noreferrer"
                            className="px-2.5 py-1.5 bg-purple-50 hover:bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors"
                            title={txt('Mở trong Kho chứng từ ở tab mới', 'Open in Document Archive in new tab', '新しいタブで証憑アーカイブを開く')}
                          >
                            <FolderOpen className="w-3.5 h-3.5 text-purple-600" />
                            <span>{txt('Kho Chứng Từ', 'Document Archive', '証憑アーカイブ')}</span>
                          </a>
                        </div>
                      </div>
                    </div>

                    {/* LỊCH SỬ THANH TOÁN (HỖ TRỢ NGOẠI TỆ & KỲ CƯỚC TỪ NGÀY ĐẾN NGÀY) */}
                    {(() => {
                      const effectivePayments = getEffectiveServicePayments(selectedService, exchangeRatesMap);
                      const nextBatchNumber = effectivePayments.length + 1;

                      return (
                        <div className="p-4 bg-gradient-to-r from-purple-50/70 via-indigo-50/60 to-blue-50/70 rounded-2xl border border-purple-200/80 space-y-3 shadow-2xs">
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-xs">
                                <Receipt className="w-3.5 h-3.5" />
                              </div>
                              <div>
                                <h4 className="text-xs font-black text-purple-950 uppercase tracking-wider">
                                  {txt('Lịch Sử Các Đợt Thanh Toán Cước', 'Payment & Renewal History', '支払・更新履歴')} ({effectivePayments.length})
                                </h4>
                                <p className="text-[10.5px] text-purple-700/80">
                                  {txt('Theo dõi các đợt đóng tiền cước dịch vụ định kỳ & gia hạn', 'Track periodic fee payments and service renewals', '定期利用料の支払いおよびサービス更新の追跡')}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              {/* Cumulative spent badge */}
                              <div className="px-3 py-1 bg-white border border-purple-300 rounded-xl shadow-2xs text-right">
                                <span className="text-[10px] font-bold text-slate-500 block uppercase">{txt('Tổng tiền đã thanh toán:', 'Total Paid Amount:', '支払累計総額:')}</span>
                                <span className="text-xs font-black text-purple-900 font-mono">
                                  {formatCurrency(
                                    effectivePayments.reduce((acc: number, p: PaymentRecord) => acc + (Number(p.amount) || 0), 0)
                                  )}
                                </span>
                              </div>

                              <button
                                type="button"
                                onClick={() => {
                                  const cur = selectedService.currency || 'VND';
                                  const curObj = currencies.find((c) => c.code === cur);
                                  const rate = curObj ? curObj.rateToVnd : (exchangeRatesMap[cur] || 1);

                                  const startStr = selectedService.renewalDate
                                    ? new Date(selectedService.renewalDate).toISOString().split('T')[0]
                                    : (selectedService.startDate ? new Date(selectedService.startDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);

                                  const pCount = selectedService.specs?.billingPeriodCount || 1;
                                  const pUnit = selectedService.specs?.billingPeriodUnit || 'MONTH';
                                  const nextEnd = calculateNextRenewalDate(startStr, pCount, pUnit) || '';

                                  const sFormatted = new Date(startStr).toLocaleDateString('vi-VN');
                                  const eFormatted = nextEnd ? new Date(nextEnd).toLocaleDateString('vi-VN') : '';

                                  setPaymentForm({
                                    paymentDate: new Date().toISOString().split('T')[0],
                                    amount: selectedService.cost ? String(selectedService.cost) : '',
                                    currency: cur,
                                    exchangeRate: rate,
                                    period: txt(`Đợt ${nextBatchNumber}: Kỳ từ ${sFormatted}${eFormatted ? ` đến ${eFormatted}` : ''}`, `Batch ${nextBatchNumber}: Period from ${sFormatted}${eFormatted ? ` to ${eFormatted}` : ''}`, `第${nextBatchNumber}回: ${sFormatted}${eFormatted ? ` ～ ${eFormatted}` : ''}`),
                                    periodStartDate: startStr,
                                    periodEndDate: nextEnd,
                                    invoiceNumber: selectedService.invoiceNumber || '',
                                    contractNumber: selectedService.contractNumber || '',
                                    status: 'PAID',
                                    notes: '',
                                  });
                                  setIsAddPaymentModalOpen(true);
                                }}
                                className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-2xs cursor-pointer transition-colors"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>+ {txt('Ghi nhận đợt thanh toán', 'Record Payment', '支払レコード追加')} ({txt('Đợt', 'Batch', '第')} {nextBatchNumber}{txt('', '', '回')})</span>
                              </button>
                            </div>
                          </div>

                          {/* Table of Payment Records */}
                          <div className="overflow-x-auto rounded-xl border border-purple-200/80 bg-white shadow-2xs">
                            <table className="w-full text-left text-xs border-collapse">
                              <thead className="bg-purple-100/50 text-[10px] font-bold text-purple-900 uppercase tracking-wider border-b border-purple-200/80">
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
                              <tbody className="divide-y divide-purple-100/60">
                                {effectivePayments.length === 0 ? (
                                  <tr>
                                    <td colSpan={7} className="py-6 text-center text-xs text-slate-400 italic">
                                      {txt('Chưa có dữ liệu đợt thanh toán nào được ghi nhận. Bấm nút "+ Ghi nhận đợt thanh toán" ở trên để thêm!', 'No payment records found. Click "+ Record Payment" above to add!', '支払データが登録されていません。上の「+ 支払レコード追加」ボタンから登録してください。')}
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
                                      <tr key={p.id} className="hover:bg-purple-50/50 transition-colors">
                                        <td className="py-2 px-3 font-mono font-bold text-slate-800">
                                          {formatDateI18n(p.paymentDate)}
                                        </td>
                                        <td className="py-2 px-3">
                                          <div className="space-y-0.5">
                                            <span className="font-mono font-black text-purple-900 block">
                                              {formatPrice(convertedAmt, selectedCurrency)}
                                            </span>
                                            {isDual && (
                                              <span className="text-[10px] font-bold text-emerald-700 block font-mono">
                                                {txt('Gốc:', 'Orig:', '原価:')} {formatPrice(rawAmt, pCur)}
                                              </span>
                                            )}
                                            <span className="text-[9px] text-slate-400 block font-mono">
                                              ({txt('Tỷ giá:', 'Rate:', 'レート:')} {p.paymentDate ? formatDateI18n(p.paymentDate) : '25/08/2026'})
                                            </span>
                                          </div>
                                        </td>
                                        <td className="py-2 px-3 font-medium text-slate-700 min-w-[150px]">
                                          <span className="font-semibold text-slate-900 block">{p.period || txt('Kỳ cước', 'Billing Period', '請求期')}</span>
                                          {p.periodStartDate && p.periodEndDate && (
                                            <span className="text-[10px] text-slate-500 font-mono block mt-0.5">
                                              📅 {new Date(p.periodStartDate).toLocaleDateString('vi-VN')} → {new Date(p.periodEndDate).toLocaleDateString('vi-VN')}
                                            </span>
                                          )}
                                        </td>
                                        <td className="py-2 px-3 font-mono text-[11px] text-slate-600">
                                          {p.invoiceNumber || p.contractNumber ? (
                                            <Link
                                              href={`/documents?search=${encodeURIComponent(p.invoiceNumber || p.contractNumber || '')}`}
                                              className="text-purple-600 hover:text-purple-800 hover:underline font-mono text-[11px] font-bold"
                                              title={txt('Xem tài liệu trong kho chứng từ', 'View document in archive', '証憑アーカイブでドキュメントを確認')}
                                            >
                                              {p.invoiceNumber || p.contractNumber}
                                            </Link>
                                          ) : (
                                            <span className="text-slate-400 italic">—</span>
                                          )}
                                        </td>
                                        <td className="py-2 px-3">
                                          <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.2 rounded-md text-[10px] font-bold">
                                            <Check className="w-3 h-3" />
                                            <span>{p.status === 'PAID' ? txt('Đã thanh toán', 'Paid', '支払済') : txt('Chờ xử lý', 'Pending', '処理待ち')}</span>
                                          </span>
                                        </td>
                                        <td className="py-2 px-3 text-slate-500 text-[11px] truncate max-w-[180px]">
                                          {p.notes || '—'}
                                        </td>
                                        <td className="py-2 px-2 text-right">
                                          <button
                                            type="button"
                                            onClick={() => handleDeletePaymentRecord(selectedService.id, p.id)}
                                            title={txt('Xóa đợt thanh toán này', 'Delete this payment record', 'この支払レコードを削除')}
                                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded cursor-pointer transition-colors"
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
                      );
                    })()}

                    {/* Quick Renew Section */}
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                      <h4 className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                        <RotateCcw className="w-3.5 h-3.5 text-purple-600" />
                        <span>{txt('Gia Hạn Nhanh Dịch Vụ:', 'Quick Renew Service:', 'サービスのクイック更新:')}</span>
                      </h4>
                      <div className="flex items-center gap-2 flex-wrap pt-1">
                        {[
                          { label: txt('+ 1 Tháng', '+ 1 Month', '+ 1ヶ月'), months: 1 },
                          { label: txt('+ 3 Tháng (Quý)', '+ 3 Months (Quarter)', '+ 3ヶ月 (四半期)'), months: 3 },
                          { label: txt('+ 6 Tháng', '+ 6 Months', '+ 6ヶ月'), months: 6 },
                          { label: txt('+ 1 Năm (12T)', '+ 1 Year (12M)', '+ 1年 (12ヶ月)'), months: 12 },
                          { label: txt('+ 2 Năm (24T)', '+ 2 Years (24M)', '+ 2年 (24ヶ月)'), months: 24 },
                        ].map((chip) => (
                          <button
                            key={chip.months}
                            type="button"
                            onClick={() => handleQuickRenew(selectedService, chip.months)}
                            className="px-3 py-1.5 bg-white hover:bg-purple-600 hover:text-white border border-purple-200 rounded-xl text-xs font-bold text-purple-700 transition-all cursor-pointer shadow-2xs"
                          >
                            {chip.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
  );
}
