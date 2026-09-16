'use client';

import React, { useState, useEffect } from 'react';
import {
  Key,
  Users,
  DollarSign,
  FileText,
  Clock,
  Plus,
  Trash2,
  Check,
  AlertTriangle,
  X,
  UserPlus,
  ShieldCheck,
} from 'lucide-react';
import { useLanguage } from '@/lib/i18n/context';
import CurrencyInput from '@/components/ui/currency-input';
import { numberToVietnameseWords } from '@/lib/utils';
import { CurrencyConfig, PaymentRecord, calculateAssignedSeats, formatPrice } from './types';

export interface LicenseFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'add' | 'edit';
  initialData: any;
  editingLicenseId?: string | null;
  vendors?: any[];
  companies?: string[];
  users?: any[];
  assets?: any[];
  currencies?: CurrencyConfig[];
  exchangeRatesMap?: Record<string, number>;
  onSuccess?: (savedData?: any) => void;
  onOpenAddCurrency?: () => void;
}

export function LicenseFormModal({
  isOpen,
  onClose,
  mode,
  initialData,
  editingLicenseId,
  vendors = [],
  companies = [],
  users = [],
  assets = [],
  currencies = [],
  exchangeRatesMap = {},
  onSuccess,
  onOpenAddCurrency,
}: LicenseFormModalProps) {
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

  const isEditing = mode === 'edit';
  const [currentForm, setCurrentForm] = useState<any>(initialData || {});
  const [modalActiveTab, setModalActiveTab] = useState<'general' | 'finance' | 'settings' | 'assignees'>('general');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setCurrentForm(initialData || {});
      setModalActiveTab('general');
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const setIsAddModalOpen = (open: boolean) => { if (!open) onClose(); };
  const setIsEditModalOpen = (open: boolean) => { if (!open) onClose(); };
  const setIsAddCurrencyModalOpen = (open: boolean) => { if (open && onOpenAddCurrency) onOpenAddCurrency(); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (isEditing && editingLicenseId) {
        const res = await fetch(`/api/licenses/${editingLicenseId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...currentForm,
            purchaseCurrency: currentForm.purchaseCurrency || 'VND',
            exchangeRate: currentForm.exchangeRate || exchangeRatesMap[currentForm.purchaseCurrency || 'VND'] || 1,
            totalSeats: Number(currentForm.totalSeats) || 1,
            purchasePrice: currentForm.purchasePrice ? Number(currentForm.purchasePrice) : null,
            purchaseDate: currentForm.purchaseDate ? new Date(currentForm.purchaseDate).toISOString() : null,
            expiryDate: currentForm.expiryDate ? new Date(currentForm.expiryDate).toISOString() : null,
            pairs: currentForm.pairs || [],
          }),
        });
        if (res.ok) {
          const resData = await res.json();
          onClose();
          if (onSuccess) onSuccess(resData.data);
        } else {
          const err = await res.json();
          alert(err.error || 'Cập nhật bản quyền thất bại');
        }
      } else {
        let initialPaymentHistory: PaymentRecord[] = [];
        const priceNum = Number(currentForm.purchasePrice) || 0;
        if (priceNum > 0 || currentForm.purchaseDate) {
          const cur = (currentForm.purchaseCurrency || 'VND').toUpperCase();
          const rate = currentForm.exchangeRate || exchangeRatesMap[cur] || 1;
          const inVnd = cur === 'VND' ? priceNum : priceNum * rate;
          const eDate = currentForm.expiryDate ? new Date(currentForm.expiryDate).toLocaleDateString('vi-VN') : '';

          initialPaymentHistory = [
            {
              id: `pay_initial_${Date.now()}`,
              paymentDate: currentForm.purchaseDate || new Date().toISOString().split('T')[0],
              amount: inVnd,
              originalAmount: priceNum,
              currency: cur,
              exchangeRate: rate,
              period: `Đợt 1: Thanh toán mua mới ban đầu${eDate ? ` (Hạn dùng: ${eDate})` : ''}`,
              periodStartDate: currentForm.purchaseDate || undefined,
              periodEndDate: currentForm.expiryDate || undefined,
              invoiceNumber: currentForm.invoiceNumber || undefined,
              contractNumber: currentForm.contractNumber || undefined,
              status: 'PAID',
              notes: 'Tự động ghi nhận Đợt 1 khi mua bản quyền',
              createdAt: new Date().toISOString(),
            },
          ];
        }

        const res = await fetch('/api/licenses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...currentForm,
            purchaseCurrency: currentForm.purchaseCurrency || 'VND',
            exchangeRate: currentForm.exchangeRate || exchangeRatesMap[currentForm.purchaseCurrency || 'VND'] || 1,
            totalSeats: Number(currentForm.totalSeats) || 1,
            purchasePrice: currentForm.purchasePrice ? Number(currentForm.purchasePrice) : null,
            purchaseDate: currentForm.purchaseDate ? new Date(currentForm.purchaseDate).toISOString() : null,
            expiryDate: currentForm.expiryDate ? new Date(currentForm.expiryDate).toISOString() : null,
            pairs: currentForm.pairs || [],
            specs: {
              paymentHistory: initialPaymentHistory,
            },
          }),
        });

        if (res.ok) {
          const resData = await res.json();
          onClose();
          if (onSuccess) onSuccess(resData.data);
        } else {
          const err = await res.json();
          alert(err.error || 'Thêm bản quyền thất bại');
        }
      }
    } catch {
      alert('Lỗi kết nối khi lưu bản quyền');
    } finally {
      setSubmitting(false);
    }
  };

  return (

          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
            <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-6xl w-full flex flex-col max-h-[92vh] border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-900 text-white rounded-t-3xl shrink-0">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="p-1.5 bg-purple-600 text-white rounded-xl shadow-xs shrink-0">
                    <Key className="w-4 h-4" />
                  </span>
                  <h3 className="font-extrabold text-sm text-white">
                    {isEditing ? `Chỉnh Sửa Bản Quyền: ${currentForm.name}` : 'Thêm Bản Quyền Phần Mềm Mới'}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (isEditing) setIsEditModalOpen(false);
                    else setIsAddModalOpen(false);
                  }}
                  className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* 4 TABS Navigation */}
              <div className="flex items-center px-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 shrink-0 overflow-x-auto">
                {(() => {
                  const pairs = currentForm.pairs || [];
                  const usedCount = calculateAssignedSeats(pairs);
                  const totalCount = Number(currentForm.totalSeats) || 1;

                  const tabList = [
                    { key: 'general', label: '1. Thông tin chung', icon: Key },
                    { key: 'finance', label: '2. Tài chính & Hợp đồng', icon: DollarSign },
                    { key: 'settings', label: '3. Ghi chú & Cảnh báo', icon: ShieldCheck },
                    {
                      key: 'assignees',
                      label: '4. Phân Bổ & Gán Sử Dụng',
                      icon: Users,
                      badge: `${usedCount}/${totalCount}`,
                    },
                  ];

                  return tabList.map((tab: any) => {
                    const Icon = tab.icon;
                    const isActive = modalActiveTab === tab.key;
                    return (
                      <button
                        key={tab.key}
                        type="button"
                        onClick={() => setModalActiveTab(tab.key as any)}
                        className={`flex items-center gap-2 py-3 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer shrink-0 ${
                          isActive
                            ? 'border-purple-600 text-purple-600 dark:text-purple-400 bg-white dark:bg-slate-800/80 shadow-2xs'
                            : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span>{tab.label}</span>
                        {tab.badge && (
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10.5px] font-mono font-bold ${
                              usedCount > totalCount
                                ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                                : usedCount === totalCount
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                : 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300'
                            }`}
                          >
                            {tab.badge}
                          </span>
                        )}
                      </button>
                    );
                  });
                })()}
              </div>

              {/* Body */}
              <form id="license-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
                {/* TAB 1: THÔNG TIN CHUNG */}
                {modalActiveTab === 'general' && (
                  <div className="space-y-4 animate-in fade-in duration-100">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Tên phần mềm (*):
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="VD: Microsoft 365 Business Standard, Adobe CC..."
                          value={currentForm.name}
                          onChange={(e) => setCurrentForm({ ...currentForm, name: e.target.value })}
                          className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          License Key / Serial:
                        </label>
                        <input
                          type="text"
                          placeholder="XXXXX-XXXXX-XXXXX-XXXXX"
                          value={currentForm.licenseKey}
                          onChange={(e) => setCurrentForm({ ...currentForm, licenseKey: e.target.value })}
                          className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Loại bản quyền (*):
                        </label>
                        <select
                          value={currentForm.licenseType}
                          onChange={(e) => setCurrentForm({ ...currentForm, licenseType: e.target.value })}
                          className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold outline-none cursor-pointer"
                        >
                          <option value="PERPETUAL">{language === 'en' ? 'Perpetual' : 'Vĩnh viễn (Perpetual)'}</option>
                          <option value="SUBSCRIPTION">Thuê bao định kỳ (Subscription)</option>
                          <option value="OEM">OEM (Đi kèm phần cứng máy)</option>
                          <option value="TRIAL">{language === 'en' ? 'Trial' : 'Dùng thử (Trial)'}</option>
                          <option value="OPEN_SOURCE">Mã nguồn mở (Open Source)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Tổng số Seats (Số người / máy tối đa) (*):
                        </label>
                        <input
                          type="number"
                          min={1}
                          required
                          value={currentForm.totalSeats}
                          onChange={(e) => setCurrentForm({ ...currentForm, totalSeats: e.target.value })}
                          className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-black outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                    </div>

                    {/* Section: Đơn vị & Nhà cung cấp */}
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl space-y-3">
                      <span className="text-xs font-extrabold text-slate-800 dark:text-white uppercase tracking-wider block">
                        Đơn vị & Nhà cung cấp
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Công ty quản lý:
                          </label>
                          <select
                            value={currentForm.companyName}
                            onChange={(e) => setCurrentForm({ ...currentForm, companyName: e.target.value })}
                            className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs outline-none cursor-pointer"
                          >
                            <option value="">-- Toàn tập đoàn / Chung --</option>
                            {companies.map((c: any) => (
                              <option key={c} value={c}>
                                🏢 {c}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Nhà cung cấp / Đối tác bán lẻ:
                          </label>
                          <select
                            value={currentForm.vendorId || ''}
                            onChange={(e) => setCurrentForm({ ...currentForm, vendorId: e.target.value })}
                            className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs outline-none cursor-pointer"
                          >
                            <option value="">-- Chọn nhà cung cấp --</option>
                            {vendors.map((v: any) => (
                              <option key={v.id} value={v.id}>
                                🤝 {v.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 2: TÀI CHÍNH & HỢP ĐỒNG */}
                {modalActiveTab === 'finance' && (
                  <div className="space-y-4 animate-in fade-in duration-100">
                    <div className="p-4 bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 rounded-2xl space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-extrabold text-purple-950 dark:text-purple-200 uppercase tracking-wide flex items-center gap-1.5">
                          <DollarSign className="w-4 h-4 text-purple-600" />
                          <span>1. Định giá & Tiền tệ hóa đơn gốc (Ngoại tệ)</span>
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

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-start">
                        {/* Giá mua hóa đơn gốc with dot separators & foreign words */}
                        <div>
                          <CurrencyInput
                            label="Giá mua hóa đơn gốc (*)"
                            value={currentForm.purchasePrice}
                            onChange={(val) => setCurrentForm({ ...currentForm, purchasePrice: val })}
                            currency={currentForm.purchaseCurrency || 'VND'}
                            currencyName={currencies.find((c) => c.code === (currentForm.purchaseCurrency || 'VND'))?.name}
                            exchangeRate={currentForm.exchangeRate || exchangeRatesMap[currentForm.purchaseCurrency || 'VND'] || 1}
                            placeholder="VD: 1.000"
                          />
                        </div>

                        {/* Loại tiền tệ gốc */}
                        <div>
                          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                            Loại tiền tệ gốc
                          </label>
                          <select
                            value={currentForm.purchaseCurrency || 'VND'}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === '__ADD_NEW__') {
                                setIsAddCurrencyModalOpen(true);
                                return;
                              }
                              const found = currencies.find((c) => c.code === val);
                              setCurrentForm({
                                ...currentForm,
                                purchaseCurrency: val,
                                exchangeRate: found ? found.rateToVnd : exchangeRatesMap[val] || 1,
                              });
                            }}
                            className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold outline-none cursor-pointer"
                          >
                            {currencies.map((c: any) => (
                              <option key={c.code} value={c.code}>
                                {c.flag} {c.code} ({c.name})
                              </option>
                            ))}
                            <option value="__ADD_NEW__" className="text-purple-600 font-bold">
                              ➕ Thêm đồng tiền khác...
                            </option>
                          </select>
                        </div>

                        {/* Tỷ giá quy đổi cơ sở */}
                        <div>
                          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                            Tỷ giá hạch toán (1 {currentForm.purchaseCurrency || 'VND'} = ? VNĐ)
                          </label>
                          <input
                            type="number"
                            value={currentForm.exchangeRate || exchangeRatesMap[currentForm.purchaseCurrency || 'VND'] || 1}
                            onChange={(e) => setCurrentForm({ ...currentForm, exchangeRate: Number(e.target.value) })}
                            className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono font-bold outline-none"
                          />
                        </div>
                      </div>

                      {/* KHỐI 2: Ô GIÁ TIỀN QUY CHUẨN VNĐ RIÊNG & BẰNG CHỮ RÕ RÀNG */}
                      {(() => {
                        const numVal = Number(String(currentForm.purchasePrice).replace(/\D/g, '')) || 0;
                        const curr = currentForm.purchaseCurrency || 'VND';
                        const rate = currentForm.exchangeRate || exchangeRatesMap[curr] || 1;
                        const inVnd = curr === 'VND' ? numVal : numVal * rate;

                        return (
                          <div className="p-3.5 bg-white dark:bg-slate-800/90 rounded-2xl border border-emerald-200 dark:border-emerald-800/80 shadow-xs space-y-2.5">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-extrabold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5 uppercase tracking-wide">
                                <span>🇻🇳 2. Giá Tiền Quy Chuẩn VNĐ (Hạch Toán Kế Toán)</span>
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

                      {/* AI & Rate Reference Timestamp (1 dòng nhỏ gọn) */}
                      <div className="p-2 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 rounded-xl flex items-center gap-1.5 text-[10.5px] text-purple-900 dark:text-purple-200 font-medium">
                        <Clock className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 shrink-0" />
                        <span>Tỷ giá tham chiếu hạch toán cập nhật: 25/08/2026 (Theo Vietcombank / Tỷ giá hạch toán)</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Ngày mua / kích hoạt:
                        </label>
                        <input
                          type="date"
                          value={currentForm.purchaseDate}
                          onChange={(e) => setCurrentForm({ ...currentForm, purchaseDate: e.target.value })}
                          className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Hạn hết hạn (Để trống nếu Vô thời hạn):
                        </label>
                        <input
                          type="date"
                          value={currentForm.expiryDate}
                          onChange={(e) => setCurrentForm({ ...currentForm, expiryDate: e.target.value })}
                          className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Số Hợp Đồng / PO:
                        </label>
                        <input
                          type="text"
                          placeholder="VD: HD-MS-2026-01"
                          value={currentForm.contractNumber}
                          onChange={(e) => setCurrentForm({ ...currentForm, contractNumber: e.target.value })}
                          className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Link chứng từ / Hợp đồng đính kèm:
                        </label>
                        <input
                          type="text"
                          placeholder="https://... đường dẫn file hợp đồng"
                          value={currentForm.contractUrl}
                          onChange={(e) => setCurrentForm({ ...currentForm, contractUrl: e.target.value })}
                          className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs outline-none"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 3: GHI CHÚ & CẢNH BÁO */}
                {modalActiveTab === 'settings' && (
                  <div className="space-y-4 animate-in fade-in duration-100">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Ghi chú nội bộ quản trị:
                      </label>
                      <textarea
                        rows={4}
                        placeholder="Ghi chú về tài khoản admin quản lý, email đăng ký, hotline hỗ trợ của hãng..."
                        value={currentForm.notes}
                        onChange={(e) => setCurrentForm({ ...currentForm, notes: e.target.value })}
                        className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs outline-none"
                      />
                    </div>
                  </div>
                )}

                {/* TAB 4: PHÂN BỔ & GÁN SỬ DỤNG */}
                {modalActiveTab === 'assignees' && (() => {
                  const pairs = currentForm.pairs || [];
                  const usedCount = calculateAssignedSeats(pairs);
                  const totalCount = Number(currentForm.totalSeats) || 1;
                  const remainingCount = Math.max(0, totalCount - usedCount);
                  const isOverLimit = usedCount > totalCount;
                  const isFull = usedCount === totalCount;

                  const handleAddPair = () => {
                    const newPairs = [
                      ...pairs,
                      {
                        userId: '',
                        assetId: '',
                        assignedAt: new Date().toISOString().split('T')[0],
                        notes: '',
                      },
                    ];
                    setCurrentForm({ ...currentForm, pairs: newPairs });
                  };

                  const handleRemovePair = (index: number) => {
                    const newPairs = pairs.filter((_: any, idx: number) => idx !== index);
                    setCurrentForm({ ...currentForm, pairs: newPairs });
                  };

                  const handleUpdatePair = (index: number, field: string, value: any) => {
                    const newPairs = [...pairs];
                    newPairs[index] = { ...newPairs[index], [field]: value };

                    // Auto switch userId when assetId is selected, or clear if unassigned
                    if (field === 'assetId') {
                      if (value) {
                        const selectedAsset = assets.find((a) => a.id === value);
                        const activeAsg = selectedAsset?.assignments?.find((a: any) => !a.returnedAt);
                        const foundUserId = activeAsg?.user?.id || (selectedAsset as any)?.userId || '';
                        newPairs[index].userId = foundUserId || '';
                      } else {
                        newPairs[index].userId = '';
                      }
                    }

                    setCurrentForm({ ...currentForm, pairs: newPairs });
                  };

                  return (
                    <div className="space-y-4 animate-in fade-in duration-100">
                      {/* Quota Header Card */}
                      <div className={`p-4 rounded-2xl border transition-all ${
                        isOverLimit
                          ? 'bg-rose-50/80 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800'
                          : isFull
                          ? 'bg-amber-50/80 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800'
                          : 'bg-purple-50/70 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800'
                      }`}>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white flex items-center gap-1.5">
                                <Users className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                                <span>Hạn mức Seats Bản Quyền:</span>
                              </span>
                              <span className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-black ${
                                isOverLimit
                                  ? 'bg-rose-600 text-white'
                                  : isFull
                                  ? 'bg-amber-500 text-white'
                                  : 'bg-emerald-600 text-white'
                              }`}>
                                Đã gán: {usedCount} / {totalCount} Seats
                              </span>
                              <span className="text-xs text-slate-600 dark:text-slate-300 font-semibold">
                                (Còn trống: <strong className={remainingCount === 0 ? 'text-rose-600' : 'text-emerald-600'}>{remainingCount}</strong> seats)
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">
                              💡 1 Người dùng có thể gán nhiều Thiết bị khác nhau. Hệ thống tự động nhận diện thiết bị & nhân sự sở hữu.
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={handleAddPair}
                            className="px-3.5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm flex items-center justify-center gap-1.5 cursor-pointer shrink-0 active:scale-95 transition-all"
                          >
                            <UserPlus className="w-3.5 h-3.5" />
                            <span>+ Thêm Cấp Phát / Gán Mới</span>
                          </button>
                        </div>

                        {isOverLimit && (
                          <div className="mt-2.5 p-2.5 bg-rose-100/80 dark:bg-rose-900/40 rounded-xl border border-rose-300 dark:border-rose-800 text-[11px] text-rose-800 dark:text-rose-200 font-bold flex items-center gap-1.5">
                            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                            <span>Cảnh báo: Số lượng cấp phát ({usedCount}) đã vượt quá tổng số Seats tối đa ({totalCount})! Hãy tăng tổng số seats ở Tab 1 hoặc gỡ bớt người dùng.</span>
                          </div>
                        )}
                      </div>

                      {/* Bảng Danh Sách Gán (Assignees Table) */}
                      <div className="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden bg-white dark:bg-slate-900 shadow-2xs">
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-[11px] uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                                <th className="p-3 pl-4 min-w-[220px]">💻 Chọn Thiết Bị</th>
                                <th className="p-3 min-w-[200px]">👤 Người Sử Dụng</th>
                                <th className="p-3 min-w-[160px]">📅 Ngày Gán & Trạng Thái</th>
                                <th className="p-3 pr-4 text-center w-16">Thao Tác</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                              {pairs.length === 0 ? (
                                <tr>
                                  <td colSpan={4} className="p-8 text-center text-slate-400 space-y-2">
                                    <Users className="w-7 h-7 mx-auto text-slate-300 dark:text-slate-600" />
                                    <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                                      Chưa có thiết bị hoặc nhân sự nào được phân bổ cho bản quyền này
                                    </p>
                                    <button
                                      type="button"
                                      onClick={handleAddPair}
                                      className="px-3 py-1.5 bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 rounded-xl text-xs font-bold hover:bg-purple-100 cursor-pointer"
                                    >
                                      + Thêm lượt cấp phát đầu tiên
                                    </button>
                                  </td>
                                </tr>
                              ) : (
                                pairs.map((pair: any, idx: number) => {
                                  // Exclude assets already selected in OTHER rows of this license
                                  const alreadySelectedAssetIds = new Set(
                                    pairs.filter((p: any, i: number) => i !== idx && p.assetId).map((p: any) => p.assetId)
                                  );
                                  const availableAssets = assets.filter((a: any) => !alreadySelectedAssetIds.has(a.id) || a.id === pair.assetId);

                                  return (
                                    <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                                      {/* Cột 1: Thiết Bị */}
                                      <td className="p-2.5 pl-4">
                                        <select
                                          value={pair.assetId || ''}
                                          onChange={(e) => handleUpdatePair(idx, 'assetId', e.target.value)}
                                          className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
                                        >
                                          <option value="">-- Không gán theo thiết bị cụ thể --</option>
                                          {availableAssets.map((a: any) => {
                                            const currentHolder = a.assignments?.find((asg: any) => !asg.returnedAt)?.user;
                                            return (
                                              <option key={a.id} value={a.id}>
                                                💻 [{a.assetTag}] {a.name} ({a.brand || ''}) {currentHolder ? `• Đang dùng: ${currentHolder.fullName}` : '• (Trong kho)'}
                                              </option>
                                            );
                                          })}
                                        </select>
                                      </td>

                                      {/* Cột 2: Người Sử Dụng */}
                                      <td className="p-2.5">
                                        <select
                                          value={pair.userId || ''}
                                          onChange={(e) => handleUpdatePair(idx, 'userId', e.target.value)}
                                          className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
                                        >
                                          <option value="">-- Không gán theo nhân sự cụ thể --</option>
                                          {users.map((u: any) => (
                                            <option key={u.id} value={u.id}>
                                              👤 {u.fullName} {u.department ? `(${u.department})` : ''}
                                            </option>
                                          ))}
                                        </select>
                                      </td>

                                      {/* Cột 3: Ngày Gán & Trạng Thái */}
                                      <td className="p-2.5">
                                        <div className="flex items-center gap-2">
                                          <input
                                            type="date"
                                            value={pair.assignedAt ? pair.assignedAt.split('T')[0] : ''}
                                            onChange={(e) => handleUpdatePair(idx, 'assignedAt', e.target.value)}
                                            className="p-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none font-mono"
                                          />
                                          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-md text-[10px] font-bold shrink-0">
                                            🟢 Đang hoạt động
                                          </span>
                                        </div>
                                      </td>

                                      {/* Cột 4: Thao Tác (Xóa) */}
                                      <td className="p-2.5 pr-4 text-center">
                                        <button
                                          type="button"
                                          onClick={() => handleRemovePair(idx)}
                                          className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/60 rounded-xl transition-colors cursor-pointer"
                                          title="Xóa dòng gán này"
                                        >
                                          <Trash2 className="w-4 h-4" />
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
                    </div>
                  );
                })()}
              </form>

              {/* Footer */}
              <div className="flex items-center justify-between px-6 py-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 rounded-b-3xl shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    if (isEditing) setIsEditModalOpen(false);
                    else setIsAddModalOpen(false);
                  }}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 cursor-pointer"
                >
                  Hủy (Esc)
                </button>

                <button
                  type="submit"
                  form="license-form"
                  className="px-5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>{isEditing ? 'Lưu Thay Đổi' : 'Tạo Bản Quyền'}</span>
                </button>
              </div>
            </div>
          </div>
        
  );
}
