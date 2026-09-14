'use client';

import React, { useState, useEffect } from 'react';
import {
  Receipt,
  Calendar,
  DollarSign,
  Clock,
  Plus,
  Check,
  X,
} from 'lucide-react';
import { useLanguage } from '@/lib/i18n/context';
import CurrencyInput from '@/components/ui/currency-input';
import { numberToVietnameseWords } from '@/lib/utils';
import {
  ITServiceItem,
  CurrencyConfig,
  PaymentRecord,
  formatPrice,
  getEffectiveServicePayments,
} from './types';

export interface ServicePaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  service: ITServiceItem | any;
  currencies?: CurrencyConfig[];
  exchangeRatesMap?: Record<string, number>;
  onSuccess?: () => void;
  onOpenAddCurrency?: () => void;
}

export function ServicePaymentModal({
  isOpen,
  onClose,
  service: selectedService,
  currencies = [],
  exchangeRatesMap = {},
  onSuccess,
  onOpenAddCurrency,
}: ServicePaymentModalProps) {
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

  const { language, t } = useLanguage();
  const isEn = language === 'en';

  const [paymentForm, setPaymentForm] = useState<{
    paymentDate: string;
    amount: number | string;
    currency: string;
    exchangeRate: number;
    period: string;
    periodStartDate: string;
    periodEndDate: string;
    invoiceNumber: string;
    contractNumber: string;
    status: 'PAID' | 'PENDING';
    notes: string;
  }>({
    paymentDate: new Date().toISOString().split('T')[0],
    amount: '',
    currency: 'VND',
    exchangeRate: 1,
    period: '',
    periodStartDate: '',
    periodEndDate: '',
    invoiceNumber: '',
    contractNumber: '',
    status: 'PAID',
    notes: '',
  });

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (selectedService && isOpen) {
      const cur = (selectedService.currency || 'VND').toUpperCase();
      const rate = selectedService.specs?.exchangeRate || exchangeRatesMap[cur] || 1;
      setPaymentForm({
        paymentDate: new Date().toISOString().split('T')[0],
        amount: selectedService.cost || '',
        currency: cur,
        exchangeRate: rate,
        period: '',
        periodStartDate: selectedService.renewalDate || '',
        periodEndDate: '',
        invoiceNumber: selectedService.invoiceNumber || '',
        contractNumber: selectedService.contractNumber || '',
        status: 'PAID',
        notes: '',
      });
    }
  }, [selectedService, isOpen, exchangeRatesMap]);

  if (!isOpen || !selectedService) return null;

  const setIsAddPaymentModalOpen = (open: boolean) => {
    if (!open) onClose();
  };

  const setIsAddCurrencyModalOpen = (open: boolean) => {
    if (open && onOpenAddCurrency) onOpenAddCurrency();
  };

  const handleSavePaymentRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedService) return;

    const rawAmount = parseFloat(String(paymentForm.amount).replace(/[^0-9.-]+/g, '')) || 0;
    if (rawAmount <= 0) {
      alert('Vui lòng nhập số tiền thanh toán hợp lệ (> 0)');
      return;
    }

    const cur = (paymentForm.currency || 'VND').toUpperCase();
    const rate = paymentForm.exchangeRate || exchangeRatesMap[cur] || 1;
    const inVnd = cur === 'VND' ? rawAmount : rawAmount * rate;

    const currentHistory = getEffectiveServicePayments(selectedService, exchangeRatesMap);
    const nextBatchNumber = currentHistory.length + 1;

    let periodStr = paymentForm.period.trim();
    if (paymentForm.periodStartDate && paymentForm.periodEndDate) {
      const s = new Date(paymentForm.periodStartDate).toLocaleDateString('vi-VN');
      const end = new Date(paymentForm.periodEndDate).toLocaleDateString('vi-VN');
      if (!periodStr) {
        periodStr = `Đợt ${nextBatchNumber}: Kỳ từ ${s} đến ${end}`;
      }
    } else if (!periodStr) {
      periodStr = `Đợt ${nextBatchNumber}: Kỳ cước dịch vụ`;
    }

    const newRecord: PaymentRecord = {
      id: `pay_${Date.now()}`,
      paymentDate: paymentForm.paymentDate || new Date().toISOString().split('T')[0],
      amount: inVnd,
      originalAmount: rawAmount,
      currency: cur,
      exchangeRate: rate,
      period: periodStr,
      periodStartDate: paymentForm.periodStartDate || undefined,
      periodEndDate: paymentForm.periodEndDate || undefined,
      invoiceNumber: paymentForm.invoiceNumber || undefined,
      contractNumber: paymentForm.contractNumber || undefined,
      status: paymentForm.status,
      notes: paymentForm.notes || undefined,
      createdAt: new Date().toISOString(),
    };

    const updatedHistory = [newRecord, ...currentHistory];

    setSubmitting(true);
    try {
      const res = await fetch(`/api/services/${selectedService.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          renewalDate: paymentForm.periodEndDate || selectedService.renewalDate,
          status: 'ACTIVE',
          invoiceNumber: paymentForm.invoiceNumber || selectedService.invoiceNumber,
          contractNumber: paymentForm.contractNumber || selectedService.contractNumber,
          specs: {
            ...(selectedService.specs || {}),
            paymentHistory: updatedHistory,
            lastPaymentDate: paymentForm.paymentDate,
            lastPaymentAmount: inVnd,
            lastPaymentCurrency: cur,
          },
        }),
      });

      if (res.ok) {
        onClose();
        if (onSuccess) onSuccess();
      } else {
        const err = await res.json();
        alert(err.error || 'Thêm đợt thanh toán thất bại');
      }
    } catch {
      alert('Lỗi kết nối khi lưu đợt thanh toán');
    } finally {
      setSubmitting(false);
    }
  };

  return (

        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-3 sm:p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-3xl w-full flex flex-col max-h-[92vh] border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-slate-800/80 dark:to-slate-800/40 shrink-0">
              <h3 className="font-bold text-sm text-purple-950 dark:text-purple-200 flex items-center gap-2">
                <span className="p-1.5 bg-purple-600 text-white rounded-xl shadow-xs">
                  <Receipt className="w-4 h-4" />
                </span>
                <span>Ghi Nhận Đợt Thanh Toán Mới</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsAddPaymentModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-xl hover:bg-white/80 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePaymentRecord} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 text-xs">
              {/* Row 1: Ngày thanh toán & Trạng thái */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Ngày thanh toán (*)
                  </label>
                  <input
                    type="date"
                    required
                    value={paymentForm.paymentDate}
                    onChange={(e) => setPaymentForm({ ...paymentForm, paymentDate: e.target.value })}
                    className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Trạng thái thanh toán
                  </label>
                  <select
                    value={paymentForm.status}
                    onChange={(e) => setPaymentForm({ ...paymentForm, status: e.target.value as any })}
                    className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
                  >
                    <option value="PAID">🟢 Đã thanh toán thành công</option>
                    <option value="PENDING">⏳ Đang chờ duyệt / Chưa thanh toán</option>
                  </select>
                </div>
              </div>

              {/* Row 2: Phạm vi kỳ cước (Từ ngày nào đến ngày nào) */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl space-y-2.5">
                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-purple-600" />
                  <span>Kỳ Cước Áp Dụng / Phạm Vi Gia Hạn</span>
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Kỳ cước từ ngày:
                    </label>
                    <input
                      type="date"
                      value={paymentForm.periodStartDate}
                      onChange={(e) => {
                        const s = e.target.value;
                        let autoPeriod = paymentForm.period;
                        if (s && paymentForm.periodEndDate) {
                          autoPeriod = `Kỳ từ ${new Date(s).toLocaleDateString('vi-VN')} đến ${new Date(paymentForm.periodEndDate).toLocaleDateString('vi-VN')}`;
                        }
                        setPaymentForm({ ...paymentForm, periodStartDate: s, period: autoPeriod });
                      }}
                      className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Kỳ cước đến ngày:
                    </label>
                    <input
                      type="date"
                      value={paymentForm.periodEndDate}
                      onChange={(e) => {
                        const end = e.target.value;
                        let autoPeriod = paymentForm.period;
                        if (paymentForm.periodStartDate && end) {
                          autoPeriod = `Kỳ từ ${new Date(paymentForm.periodStartDate).toLocaleDateString('vi-VN')} đến ${new Date(end).toLocaleDateString('vi-VN')}`;
                        }
                        setPaymentForm({ ...paymentForm, periodEndDate: end, period: autoPeriod });
                      }}
                      className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Tên / Nhãn kỳ cước (Gợi ý tự động hoặc nhập tùy chỉnh):
                  </label>
                  <input
                    type="text"
                    placeholder="VD: Kỳ 1 năm 2026 hoặc Kỳ tháng 08/2026..."
                    value={paymentForm.period}
                    onChange={(e) => setPaymentForm({ ...paymentForm, period: e.target.value })}
                    className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              {/* Row 3: Khối Tài Chính & Ngoại Tệ (Dual-Currency) */}
              <div className="p-4 bg-gradient-to-r from-purple-50/80 to-indigo-50/80 dark:from-purple-950/40 dark:to-indigo-950/40 border border-purple-200 dark:border-purple-800/80 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-purple-950 dark:text-purple-200 flex items-center gap-1.5 uppercase tracking-wider">
                    <DollarSign className="w-4 h-4 text-purple-600" />
                    <span>1. Định Giá Thanh Toán Gốc (Ngoại Tệ)</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsAddCurrencyModalOpen(true)}
                    className="text-[11px] font-bold text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Thêm đồng tiền mới</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-start">
                  <div className="sm:col-span-4">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Loại tiền tệ (*)
                    </label>
                    <select
                      value={paymentForm.currency || 'VND'}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === '__ADD_NEW__') {
                          setIsAddCurrencyModalOpen(true);
                          return;
                        }
                        const curObj = currencies.find((c) => c.code === val);
                        setPaymentForm({
                          ...paymentForm,
                          currency: val,
                          exchangeRate: curObj ? curObj.rateToVnd : (exchangeRatesMap[val] || 1),
                        });
                      }}
                      className="w-full p-2.5 bg-white dark:bg-slate-800 border border-purple-200 dark:border-purple-700 rounded-xl text-xs font-bold text-purple-900 dark:text-purple-200 outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer shadow-2xs"
                    >
                      {currencies.map((c: any) => (
                        <option key={c.code} value={c.code}>
                          {c.flag} {c.code} - {c.name} ({c.symbol})
                        </option>
                      ))}
                      <option value="__ADD_NEW__" className="text-purple-600 font-bold">
                        ➕ Thêm đồng tiền khác...
                      </option>
                    </select>
                  </div>

                  <div className="sm:col-span-5">
                    <CurrencyInput
                      label="Số tiền thanh toán gốc (*)"
                      value={paymentForm.amount}
                      onChange={(val) => setPaymentForm({ ...paymentForm, amount: val })}
                      currency={paymentForm.currency || 'VND'}
                      currencyName={currencies.find((c) => c.code === (paymentForm.currency || 'VND'))?.name}
                      exchangeRate={paymentForm.exchangeRate || exchangeRatesMap[paymentForm.currency || 'VND'] || 1}
                      placeholder="VD: 1.000"
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Tỷ giá (1 {paymentForm.currency || 'VND'} = ? VNĐ)
                    </label>
                    <input
                      type="number"
                      disabled={(paymentForm.currency || 'VND').toUpperCase() === 'VND'}
                      value={paymentForm.exchangeRate || exchangeRatesMap[paymentForm.currency || 'VND'] || 1}
                      onChange={(e) => {
                        const r = parseFloat(e.target.value) || 1;
                        setPaymentForm({ ...paymentForm, exchangeRate: r });
                      }}
                      className="w-full p-2.5 bg-white dark:bg-slate-800 disabled:bg-slate-100 dark:disabled:bg-slate-800/50 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-purple-500 shadow-2xs"
                    />
                  </div>
                </div>

                {/* KHỐI 2: Ô GIÁ TIỀN QUY CHUẨN VNĐ */}
                {(() => {
                  const numVal = Number(String(paymentForm.amount).replace(/\D/g, '')) || 0;
                  const curr = paymentForm.currency || 'VND';
                  const rate = paymentForm.exchangeRate || exchangeRatesMap[curr] || 1;
                  const inVnd = curr === 'VND' ? numVal : numVal * rate;

                  return (
                    <div className="p-3.5 bg-white dark:bg-slate-800 rounded-2xl border border-emerald-200 dark:border-emerald-800 shadow-xs space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-extrabold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5 uppercase tracking-wide">
                          <span>🇻🇳 2. Số Tiền Quy Chuẩn VNĐ (Hạch Toán Kế Toán)</span>
                        </span>
                        <span className="font-mono text-xs font-black text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-xl border border-emerald-200 dark:border-emerald-800">
                          {formatPrice(inVnd, 'VND')}
                        </span>
                      </div>

                      {inVnd > 0 && (
                        <div className="text-[11px] text-emerald-900 dark:text-emerald-200 bg-emerald-50/80 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/60 rounded-xl px-3 py-2 flex items-start gap-1.5 font-medium">
                          <span className="text-emerald-700 dark:text-emerald-400 font-bold shrink-0">
                            ✍️ Giá chuẩn VNĐ bằng chữ:
                          </span>
                          <span className="italic font-bold">{numberToVietnameseWords(inVnd)}</span>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Note nhỏ 1 dòng */}
                <div className="p-2 bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/80 rounded-xl flex items-center gap-1.5 text-[10.5px] text-amber-900 dark:text-amber-200 font-medium">
                  <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span>Tỷ giá tham chiếu hạch toán cập nhật: 25/08/2026 (Theo Vietcombank / Tỷ giá hạch toán)</span>
                </div>
              </div>

              {/* Row 4: Số hóa đơn & Số hợp đồng */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Số hóa đơn VAT / Phiếu thu
                  </label>
                  <input
                    type="text"
                    placeholder="VD: HD-2026-001"
                    value={paymentForm.invoiceNumber}
                    onChange={(e) => setPaymentForm({ ...paymentForm, invoiceNumber: e.target.value })}
                    className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-purple-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Số hợp đồng liên quan
                  </label>
                  <input
                    type="text"
                    placeholder="VD: HĐ-VT-2026"
                    value={paymentForm.contractNumber}
                    onChange={(e) => setPaymentForm({ ...paymentForm, contractNumber: e.target.value })}
                    className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-purple-500 font-mono"
                  />
                </div>
              </div>

              {/* Row 5: Ghi chú */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Ghi chú thanh toán
                </label>
                <textarea
                  rows={2}
                  placeholder="Phương thức chuyển khoản, người duyệt, ủy nhiệm chi..."
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                  className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddPaymentModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Hủy (ESC)
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl font-bold shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>💾 Lưu Đợt Thanh Toán</span>
                </button>
              </div>
            </form>
          </div>
        </div>
  );
}
