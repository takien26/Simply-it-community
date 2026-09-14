'use client';

import React, { useState, useEffect } from 'react';
import {
  Globe,
  Clock,
  DollarSign,
  Plus,
  Building2,
  Handshake,
  X,
} from 'lucide-react';
import { useLanguage } from '@/lib/i18n/context';
import CurrencyInput from '@/components/ui/currency-input';
import { ManageableDropdown } from '@/components/ui/manageable-dropdown';
import { numberToVietnameseWords } from '@/lib/utils';
import {
  CurrencyConfig,
  PaymentRecord,
  formatPrice,
  calculateNextRenewalDate,
  mapCycleEnum,
  BILLING_CYCLES,
  DEFAULT_SERVICE_TYPES,
  getServiceTypeLabel,
} from './types';

export interface ServiceFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'add' | 'edit';
  initialData?: any;
  serviceId?: string | null;
  vendors?: any[];
  companies?: string[];
  locations?: any[];
  users?: any[];
  assets?: any[];
  currencies?: CurrencyConfig[];
  exchangeRatesMap?: Record<string, number>;
  onSuccess?: () => void;
  onOpenAddCurrency?: () => void;
  onAddVendor?: (name: string) => Promise<any> | any;
  onEditVendor?: (id: string, name: string) => Promise<any> | any;
  onDeleteVendor?: (id: string, name: string) => Promise<any> | any;
  onAddCompany?: (name: string) => Promise<any> | any;
  onEditCompany?: (id: string, name: string) => Promise<any> | any;
  onDeleteCompany?: (id: string, name: string) => Promise<any> | any;
  onAddLocation?: (name: string) => Promise<any> | any;
  onEditLocation?: (id: string, name: string) => Promise<any> | any;
  onDeleteLocation?: (id: string, name: string) => Promise<any> | any;
}

const defaultFormData = {
  serviceCode: '',
  name: '',
  serviceType: 'INTERNET',
  status: 'ACTIVE',
  billingCycle: 'MONTHLY',
  periodCount: 1,
  periodUnit: 'MONTH',
  cost: '',
  currency: 'VND',
  exchangeRate: 1,
  startDate: new Date().toISOString().split('T')[0],
  renewalDate: '',
  accountNumber: '',
  contractNumber: '',
  invoiceNumber: '',
  vendorId: '',
  companyName: '',
  locationId: '',
  contactSupport: '',
  assignedUserId: '',
  assignedAssetId: '',
  bandwidth: '',
  ipStatic: '',
  notes: '',
};

export function ServiceFormModal({
  isOpen,
  onClose,
  mode,
  initialData,
  serviceId,
  vendors = [],
  companies = [],
  locations = [],
  users = [],
  assets = [],
  currencies = [],
  exchangeRatesMap = {},
  onSuccess,
  onOpenAddCurrency,
  onAddVendor,
  onEditVendor,
  onDeleteVendor,
  onAddCompany,
  onEditCompany,
  onDeleteCompany,
  onAddLocation,
  onEditLocation,
  onDeleteLocation,
}: ServiceFormModalProps) {
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

  const [formData, setFormData] = useState<any>(initialData || defaultFormData);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (initialData && isEditing) {
      setFormData(initialData);
    } else {
      setFormData(defaultFormData);
    }
  }, [initialData, isEditing, isOpen]);

  if (!isOpen) return null;

  const setIsAddModalOpen = (open: boolean) => {
    if (!open) onClose();
  };

  const setIsAddCurrencyModalOpen = (open: boolean) => {
    if (open && onOpenAddCurrency) onOpenAddCurrency();
  };

  const vendorDropdownItems = vendors.map((v: any) => ({
    id: v.id,
    name: v.name,
    subtitle: v.phone ? `Hotline: ${v.phone}` : undefined,
    icon: <Handshake className="w-3.5 h-3.5 text-emerald-600" />,
  }));

  const locationDropdownItems = locations.map((l: any) => ({
    id: l.id,
    name: l.name,
    subtitle: l.building ? `${l.building} ${l.floor || ''}` : undefined,
    icon: <Building2 className="w-3.5 h-3.5 text-blue-600" />,
  }));

  const companyDropdownItems = companies.map((c: any) => ({
    id: c,
    name: c,
    icon: <Building2 className="w-3.5 h-3.5 text-indigo-600" />,
  }));

  const handleAddVendor = (name: string) => onAddVendor && onAddVendor(name);
  const handleEditVendor = (id: string, name: string) => onEditVendor && onEditVendor(id, name);
  const handleDeleteVendor = (id: string, name: string) => onDeleteVendor && onDeleteVendor(id, name);

  const handleAddCompany = (name: string) => onAddCompany && onAddCompany(name);
  const handleEditCompany = (id: string, name: string) => onEditCompany && onEditCompany(id, name);
  const handleDeleteCompany = (id: string, name: string) => onDeleteCompany && onDeleteCompany(id, name);

  const handleAddLocation = (name: string) => onAddLocation && onAddLocation(name);
  const handleEditLocation = (id: string, name: string) => onEditLocation && onEditLocation(id, name);
  const handleDeleteLocation = (id: string, name: string) => onDeleteLocation && onDeleteLocation(id, name);

  const applyCycleChip = (_: boolean, count: number, unit: any) => {
    const nextRen = calculateNextRenewalDate(formData.startDate, count, unit);
    const cEnum = mapCycleEnum(count, unit);
    setFormData((prev: any) => ({
      ...prev,
      periodCount: count,
      periodUnit: unit,
      billingCycle: cEnum,
      renewalDate: nextRen || prev.renewalDate,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (isEditing && serviceId) {
        const payload: any = {
          ...formData,
          currency: formData.currency || 'VND',
          specs: {
            ...(formData.specs || {}),
            bandwidth: formData.bandwidth || undefined,
            ipStatic: formData.ipStatic || undefined,
            billingPeriodCount: formData.periodCount,
            billingPeriodUnit: formData.periodUnit,
            paymentHistory: formData.paymentHistory || [],
            assignedUserId: formData.assignedUserId || undefined,
            assignedAssetId: formData.assignedAssetId || undefined,
            exchangeRate: formData.exchangeRate || 1,
          },
        };

        const res = await fetch(`/api/services/${serviceId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          onClose();
          if (onSuccess) onSuccess();
        } else {
          const data = await res.json();
          alert(data.error || 'Cập nhật dịch vụ thất bại');
        }
      } else {
        let initialPaymentHistory: PaymentRecord[] = [];
        const costNum = Number(formData.cost) || 0;
        if (costNum > 0 || formData.startDate) {
          const cur = (formData.currency || 'VND').toUpperCase();
          const rate = formData.exchangeRate || exchangeRatesMap[cur] || 1;
          const inVnd = cur === 'VND' ? costNum : costNum * rate;
          const sDate = formData.startDate ? new Date(formData.startDate).toLocaleDateString('vi-VN') : '';
          const rDate = formData.renewalDate ? new Date(formData.renewalDate).toLocaleDateString('vi-VN') : '';

          initialPaymentHistory = [
            {
              id: `pay_initial_${Date.now()}`,
              paymentDate: formData.startDate || new Date().toISOString().split('T')[0],
              amount: inVnd,
              originalAmount: costNum,
              currency: cur,
              exchangeRate: rate,
              period: `Đợt 1: Thanh toán khởi tạo / Mua mới ban đầu${rDate ? ` (Kỳ từ ${sDate} đến ${rDate})` : ''}`,
              periodStartDate: formData.startDate || undefined,
              periodEndDate: formData.renewalDate || undefined,
              invoiceNumber: formData.invoiceNumber || undefined,
              contractNumber: formData.contractNumber || undefined,
              status: 'PAID',
              notes: 'Tự động ghi nhận Đợt 1 khi khởi tạo dịch vụ',
              createdAt: new Date().toISOString(),
            },
          ];
        }

        const payload: any = {
          ...formData,
          currency: formData.currency || 'VND',
          specs: {
            bandwidth: formData.bandwidth || undefined,
            ipStatic: formData.ipStatic || undefined,
            billingPeriodCount: formData.periodCount,
            billingPeriodUnit: formData.periodUnit,
            paymentHistory: initialPaymentHistory,
            assignedUserId: formData.assignedUserId || undefined,
            assignedAssetId: formData.assignedAssetId || undefined,
            exchangeRate: formData.exchangeRate || 1,
          },
        };

        const res = await fetch('/api/services', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          onClose();
          if (onSuccess) onSuccess();
        } else {
          const data = await res.json();
          alert(data.error || 'Thêm dịch vụ thất bại');
        }
      }
    } catch {
      alert('Lỗi kết nối khi lưu dịch vụ');
    } finally {
      setSubmitting(false);
    }
  };

  return (

        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-3 sm:p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full flex flex-col max-h-[92vh] border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-t-3xl shrink-0">
              <h3 className="font-bold text-base text-slate-900 flex items-center space-x-2">
                <span className="p-1.5 bg-purple-600 text-white rounded-xl shadow-xs">
                  <Globe className="w-4 h-4" />
                </span>
                <span>{isEditing ? `Chỉnh Sửa Gói Dịch Vụ IT: ${formData.name || ""}` : "Thêm Mới Gói Dịch Vụ IT & Thuê Bao"}</span>
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-white/80 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* Row 1: Code & Name */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Mã dịch vụ (*)</label>
                  <input
                    type="text"
                    required
                    placeholder="VD: SVC-NET-001"
                    value={formData.serviceCode}
                    onChange={(e) => setFormData({ ...formData, serviceCode: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono outline-none focus:bg-white focus:ring-2 focus:ring-purple-500 uppercase font-bold"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Tên gói dịch vụ (*)</label>
                  <input
                    type="text"
                    required
                    placeholder="VD: Đường truyền Internet FTTH Viettel Pro 500Mbps..."
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 outline-none focus:bg-white focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              {/* Row 2: Type, Status, Flexible Billing Cycle */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                <div className="sm:col-span-4">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Loại dịch vụ (*)</label>
                  <select
                    value={formData.serviceType}
                    onChange={(e) => setFormData({ ...formData, serviceType: e.target.value as any })}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    {DEFAULT_SERVICE_TYPES.filter((t) => t.value !== 'ALL').map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-3">
                  <label className="block text-xs font-bold text-slate-700 mb-1">{isEn ? 'Status' : 'Trạng thái'}</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="ACTIVE">🟢 Đang hoạt động</option>
                    <option value="PENDING_RENEWAL">⚠️ Sắp đến hạn</option>
                    <option value="EXPIRED">🔴 Đã quá hạn</option>
                    <option value="SUSPENDED">⏸️ Tạm ngưng</option>
                  </select>
                </div>

                {/* FLEXIBLE NUMBER + UNIT BILLING CYCLE */}
                <div className="sm:col-span-5 space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Chu kỳ thanh toán (Điền số & chọn đơn vị)
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min="1"
                      value={formData.periodCount}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10) || 1;
                        const nextRen = calculateNextRenewalDate(formData.startDate, val, formData.periodUnit);
                        const cEnum = mapCycleEnum(val, formData.periodUnit);
                        setFormData({
                          ...formData,
                          periodCount: val,
                          billingCycle: cEnum as any,
                          renewalDate: nextRen || formData.renewalDate,
                        });
                      }}
                      className="w-16 p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 text-center outline-none focus:ring-2 focus:ring-purple-500"
                    />

                    <select
                      value={formData.periodUnit}
                      onChange={(e) => {
                        const u = e.target.value as any;
                        const nextRen = calculateNextRenewalDate(formData.startDate, formData.periodCount, u);
                        const cEnum = mapCycleEnum(formData.periodCount, u);
                        setFormData({
                          ...formData,
                          periodUnit: u,
                          billingCycle: cEnum as any,
                          renewalDate: nextRen || formData.renewalDate,
                        });
                      }}
                      className="flex-1 p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="MONTH">Tháng (tháng / lần)</option>
                      <option value="YEAR">Năm (năm / lần)</option>
                      <option value="DAY">Ngày (ngày / lần)</option>
                      <option value="ONE_TIME">Trọn gói (1 lần)</option>
                    </select>
                  </div>

                  {/* PRESET CHIPS GỢI Ý NHANH */}
                  <div className="flex items-center gap-1 overflow-x-auto pt-0.5">
                    <span className="text-[10px] font-bold text-slate-400 shrink-0">Gợi ý:</span>
                    {[
                      { label: '1T', count: 1, unit: 'MONTH' as const },
                      { label: '3T (Quý)', count: 3, unit: 'MONTH' as const },
                      { label: '6T', count: 6, unit: 'MONTH' as const },
                      { label: '1 Năm', count: 1, unit: 'YEAR' as const },
                      { label: '2 Năm', count: 2, unit: 'YEAR' as const },
                      { label: '3 Năm', count: 3, unit: 'YEAR' as const },
                    ].map((chip: any) => (
                      <button
                        key={chip.label}
                        type="button"
                        onClick={() => applyCycleChip(false, chip.count, chip.unit)}
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                          formData.periodCount === chip.count && formData.periodUnit === chip.unit
                            ? 'bg-purple-100 text-purple-900 border-purple-300'
                            : 'bg-white text-slate-600 hover:bg-slate-50 border-slate-200'
                        }`}
                      >
                        {chip.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Row 3: Multi-Currency Pricing + Rates + Dates */}
              <div className="p-4 bg-gradient-to-r from-purple-50/80 to-indigo-50/80 border border-purple-200 rounded-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-purple-950 flex items-center gap-1.5 uppercase tracking-wider">
                    <DollarSign className="w-4 h-4 text-purple-600" />
                    <span>1. Định Giá Cước Chu Kỳ Hóa Đơn Gốc (Ngoại tệ)</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsAddCurrencyModalOpen(true)}
                    className="text-[11px] font-bold text-purple-600 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Thêm đồng tiền mới</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-start">
                  <div className="sm:col-span-4">
                    <label className="block text-xs font-bold text-slate-700 mb-1">Loại tiền tệ hóa đơn (*)</label>
                    <select
                      value={formData.currency || 'VND'}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === '__ADD_NEW__') {
                          setIsAddCurrencyModalOpen(true);
                          return;
                        }
                        const curObj = currencies.find((c) => c.code === val);
                        setFormData({
                          ...formData,
                          currency: val,
                          exchangeRate: curObj ? curObj.rateToVnd : (exchangeRatesMap[val] || 1),
                        });
                      }}
                      className="w-full p-2.5 bg-white border border-purple-200 rounded-xl text-xs font-bold text-purple-900 outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer shadow-2xs"
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
                      label="Giá cước chu kỳ hóa đơn gốc (*)"
                      value={formData.cost}
                      onChange={(val) => setFormData({ ...formData, cost: val })}
                      currency={formData.currency || 'VND'}
                      currencyName={currencies.find((c) => c.code === (formData.currency || 'VND'))?.name}
                      exchangeRate={formData.exchangeRate || exchangeRatesMap[formData.currency || 'VND'] || 1}
                      placeholder="VD: 100"
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Tỷ giá (1 {formData.currency || 'VND'} = ? VNĐ)
                    </label>
                    <input
                      type="number"
                      disabled={(formData.currency || 'VND').toUpperCase() === 'VND'}
                      value={formData.exchangeRate || exchangeRatesMap[formData.currency || 'VND'] || 1}
                      onChange={(e) => {
                        const r = parseFloat(e.target.value) || 1;
                        setFormData({ ...formData, exchangeRate: r });
                      }}
                      className="w-full p-2.5 bg-white disabled:bg-slate-100 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-800 outline-none focus:ring-2 focus:ring-purple-500 shadow-2xs"
                    />
                  </div>
                </div>

                {/* KHỐI 2: Ô GIÁ TIỀN QUY CHUẨN VNĐ RIÊNG & BẰNG CHỮ RÕ RÀNG */}
                {(() => {
                  const numVal = Number(String(formData.cost).replace(/\D/g, '')) || 0;
                  const curr = formData.currency || 'VND';
                  const rate = formData.exchangeRate || exchangeRatesMap[curr] || 1;
                  const inVnd = curr === 'VND' ? numVal : numVal * rate;

                  return (
                    <div className="p-3.5 bg-white rounded-2xl border border-emerald-200 shadow-xs space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-extrabold text-emerald-800 flex items-center gap-1.5 uppercase tracking-wide">
                          <span>🇻🇳 2. Giá Cước Quy Chuẩn VNĐ (Mỗi Kỳ)</span>
                        </span>
                        <span className="font-mono text-xs font-black text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200">
                          {formatPrice(inVnd, 'VND')}
                        </span>
                      </div>

                      {inVnd > 0 && (
                        <div className="text-[11px] text-emerald-900 bg-emerald-50/80 border border-emerald-200/60 rounded-xl px-3 py-2 flex items-start gap-1.5 font-medium">
                          <span className="text-emerald-700 font-bold shrink-0">
                            ✍️ Giá chuẩn VNĐ bằng chữ:
                          </span>
                          <span className="italic font-bold">{numberToVietnameseWords(inVnd)}</span>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Ghi chú mốc thời gian tham chiếu tỷ giá (1 dòng nhỏ) */}
                <div className="p-2 bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/80 rounded-xl flex items-center gap-1.5 text-[10.5px] text-amber-900 dark:text-amber-200 font-medium">
                  <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span>Tỷ giá tham chiếu hạch toán cập nhật: 25/08/2026 (Theo Vietcombank / Tỷ giá hạch toán)</span>
                </div>

                {/* Dates */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-purple-200/50">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Ngày bắt đầu sử dụng</label>
                    <input
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => {
                        const newStart = e.target.value;
                        const nextRen = calculateNextRenewalDate(newStart, formData.periodCount, formData.periodUnit);
                        setFormData({
                          ...formData,
                          startDate: newStart,
                          renewalDate: nextRen || formData.renewalDate,
                        });
                      }}
                      className="w-full p-2 bg-white border border-slate-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-purple-500 font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Ngày gia hạn kế tiếp (Tự động tính)
                    </label>
                    <input
                      type="date"
                      value={formData.renewalDate}
                      onChange={(e) => setFormData({ ...formData, renewalDate: e.target.value })}
                      className="w-full p-2 bg-purple-50/80 border border-purple-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-purple-500 font-bold text-purple-900"
                    />
                  </div>
                </div>
              </div>

              {/* Row 4: Account Number, IP, Specs */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Mã thuê bao / Khách hàng</label>
                  <input
                    type="text"
                    placeholder="VD: HNI_FTTH_588291..."
                    value={formData.accountNumber}
                    onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-purple-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">IP Tĩnh / Cấu hình mạng</label>
                  <input
                    type="text"
                    placeholder="VD: 115.78.22.105 / 29"
                    value={formData.ipStatic}
                    onChange={(e) => setFormData({ ...formData, ipStatic: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-purple-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Băng thông / Thông số</label>
                  <input
                    type="text"
                    placeholder="VD: 500 Mbps, 8 vCPU 32GB RAM..."
                    value={formData.bandwidth}
                    onChange={(e) => setFormData({ ...formData, bandwidth: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              {/* Row 5: Vendor, Company, Location */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <ManageableDropdown
                    label="Nhà cung cấp / Đối tác"
                    placeholder="-- Chọn nhà cung cấp --"
                    icon={<Handshake className="w-3.5 h-3.5 text-emerald-600" />}
                    items={vendorDropdownItems}
                    selectedValue={formData.vendorId}
                    onSelect={(val) => setFormData({ ...formData, vendorId: val })}
                    onAdd={handleAddVendor}
                    onEdit={handleEditVendor}
                    onDelete={handleDeleteVendor}
                    allowEmpty={true}
                    emptyLabel="-- Chưa chọn đối tác --"
                    themeColor="blue"
                  />
                </div>

                <div>
                  <ManageableDropdown
                    label="Công ty / Chi nhánh quản lý"
                    placeholder="-- Chọn công ty --"
                    icon={<Building2 className="w-3.5 h-3.5 text-indigo-600" />}
                    items={companyDropdownItems}
                    selectedValue={formData.companyName}
                    onSelect={(val) => setFormData({ ...formData, companyName: val })}
                    onAdd={handleAddCompany}
                    onEdit={handleEditCompany}
                    onDelete={handleDeleteCompany}
                    allowEmpty={true}
                    emptyLabel="-- Chưa chọn công ty --"
                    themeColor="indigo"
                  />
                </div>

                <div>
                  <ManageableDropdown
                    label="Vị trí / Địa điểm lắp đặt"
                    placeholder="-- Chọn địa điểm --"
                    icon={<Building2 className="w-3.5 h-3.5 text-blue-600" />}
                    items={locationDropdownItems}
                    selectedValue={formData.locationId}
                    onSelect={(val) => setFormData({ ...formData, locationId: val })}
                    onAdd={handleAddLocation}
                    onEdit={handleEditLocation}
                    onDelete={handleDeleteLocation}
                    allowEmpty={true}
                    emptyLabel="-- Chưa chọn vị trí --"
                    themeColor="blue"
                  />
                </div>
              </div>

              {/* Row 6: Gán Người Phụ Trách & Thiết Bị Liên Quan */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    👤 Nhân viên / IT phụ trách dịch vụ:
                  </label>
                  <select
                    value={formData.assignedUserId}
                    onChange={(e) => setFormData({ ...formData, assignedUserId: e.target.value })}
                    className="w-full p-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer shadow-2xs"
                  >
                    <option value="">-- Chưa gán người phụ trách --</option>
                    {users.map((u: any) => (
                      <option key={u.id} value={u.id}>
                        👤 {u.fullName} ({u.department || 'Nhân sự'}) - {u.email}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    💻 Thiết bị / Máy chủ kết nối:
                  </label>
                  <select
                    value={formData.assignedAssetId}
                    onChange={(e) => setFormData({ ...formData, assignedAssetId: e.target.value })}
                    className="w-full p-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer shadow-2xs"
                  >
                    <option value="">-- Chưa gán thiết bị/máy chủ --</option>
                    {assets.map((a: any) => (
                      <option key={a.id} value={a.id}>
                        💻 [{a.assetTag}] {a.name} ({a.brand || ''} {a.model || ''})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 7: Hotline Support Contact */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Hotline / Đầu mối hỗ trợ kỹ thuật nhà mạng</label>
                <input
                  type="text"
                  placeholder="VD: 18008119 - KTV phụ trách: Anh Hùng Viettel 0988.xxx.xxx"
                  value={formData.contactSupport}
                  onChange={(e) => setFormData({ ...formData, contactSupport: e.target.value })}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* Row 8: Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Ghi chú thêm</label>
                <textarea
                  rows={2}
                  placeholder="Ghi chú về cam kết chất lượng SLA, vị trí tủ rack, mật khẩu PPPoE nếu có..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* Footer Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Hủy (ESC)
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
                >
                  💾 Lưu Dịch Vụ
                </button>
              </div>
            </form>
          </div>
        </div>
  );
}
