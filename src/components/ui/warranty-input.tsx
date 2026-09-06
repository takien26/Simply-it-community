'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, Clock, ShieldCheck, AlertCircle, CheckCircle2 } from 'lucide-react';
import { calculateWarrantyExpiry, getRemainingTimeText, formatDate } from '@/lib/utils';

interface WarrantyInputProps {
  purchaseDate: string;
  onPurchaseDateChange: (date: string) => void;
  warrantyExpiry: string;
  onWarrantyExpiryChange: (expiry: string) => void;
  className?: string;
}

export function WarrantyInput({
  purchaseDate,
  onPurchaseDateChange,
  warrantyExpiry,
  onWarrantyExpiryChange,
  className = '',
}: WarrantyInputProps) {
  const [selectedMonths, setSelectedMonths] = useState<string>('');
  const [customMonths, setCustomMonths] = useState<string>('');
  const [unit, setUnit] = useState<'months' | 'years'>('months');
  const [customNumber, setCustomNumber] = useState<string>('');

  // Preset options
  const presets = [
    { label: '6 tháng', months: 6 },
    { label: '12 tháng (1 năm)', months: 12 },
    { label: '24 tháng (2 năm)', months: 24 },
    { label: '36 tháng (3 năm)', months: 36 },
    { label: '48 tháng (4 năm)', months: 48 },
  ];

  // When purchaseDate or selected duration changes, calculate expiry
  const handleApplyDuration = (months: number) => {
    setSelectedMonths(String(months));
    if (purchaseDate && months > 0) {
      const computedExpiry = calculateWarrantyExpiry(purchaseDate, months);
      onWarrantyExpiryChange(computedExpiry);
    }
  };

  const handleCustomNumberChange = (numStr: string, currentUnit: 'months' | 'years') => {
    setCustomNumber(numStr);
    const num = Number(numStr);
    if (!isNaN(num) && num > 0) {
      const totalMonths = currentUnit === 'years' ? num * 12 : num;
      setSelectedMonths(String(totalMonths));
      if (purchaseDate) {
        const computedExpiry = calculateWarrantyExpiry(purchaseDate, totalMonths);
        onWarrantyExpiryChange(computedExpiry);
      }
    }
  };

  const handleUnitChange = (newUnit: 'months' | 'years') => {
    setUnit(newUnit);
    if (customNumber) {
      handleCustomNumberChange(customNumber, newUnit);
    }
  };

  const handlePurchaseDateChange = (newDate: string) => {
    onPurchaseDateChange(newDate);
    if (newDate && selectedMonths && Number(selectedMonths) > 0) {
      const computedExpiry = calculateWarrantyExpiry(newDate, Number(selectedMonths));
      onWarrantyExpiryChange(computedExpiry);
    }
  };

  // Remaining duration info
  const remainingInfo = warrantyExpiry ? getRemainingTimeText(warrantyExpiry) : null;

  return (
    <div className={`p-4 bg-slate-50/80 border border-slate-200 rounded-2xl space-y-3 ${className}`}>
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-1.5">
          <ShieldCheck className="w-4 h-4 text-blue-600" />
          <span>Ngày Mua & Thời Hạn Bảo Hành Thông Minh</span>
        </label>
        {remainingInfo && warrantyExpiry && (
          <span className={`text-[11px] px-2.5 py-0.5 rounded-full ${remainingInfo.badgeClass}`}>
            {remainingInfo.text}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
        {/* Ngày mua */}
        <div>
          <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center justify-between">
            <span>Ngày mua hàng <span className="text-rose-500 font-black">(* Bắt buộc)</span></span>
          </label>
          <input
            type="date"
            required
            value={purchaseDate || ''}
            onChange={(e) => handlePurchaseDateChange(e.target.value)}
            className="w-full p-2.5 bg-white border-2 border-blue-300 rounded-xl text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
          />
        </div>

        {/* Thời hạn bảo hành nhập theo tháng / năm */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">
            Nhập thời hạn bảo hành (Tháng / Năm)
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              min="1"
              placeholder="VD: 12, 24, 36..."
              value={customNumber}
              onChange={(e) => handleCustomNumberChange(e.target.value, unit)}
              className="flex-1 p-2 bg-white border border-slate-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500 font-bold"
            />
            <select
              value={unit}
              onChange={(e) => handleUnitChange(e.target.value as 'months' | 'years')}
              className="w-24 p-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="months">Tháng</option>
              <option value="years">Năm</option>
            </select>
          </div>
        </div>
      </div>

      {/* Quick Preset Buttons */}
      <div className="space-y-1.5">
        <span className="text-[11px] text-slate-500 font-medium">Chọn nhanh thời hạn phổ biến:</span>
        <div className="flex flex-wrap gap-1.5">
          {presets.map((p) => {
            const isSelected = selectedMonths === String(p.months);
            return (
              <button
                key={p.months}
                type="button"
                onClick={() => {
                  setCustomNumber(unit === 'years' && p.months % 12 === 0 ? String(p.months / 12) : String(p.months));
                  if (unit === 'years' && p.months % 12 !== 0) setUnit('months');
                  handleApplyDuration(p.months);
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all border ${
                  isSelected
                    ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                {p.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Computed Expiry Date & Manual Override */}
      <div className="pt-2 border-t border-slate-200/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="text-xs text-slate-700">
          <span className="text-slate-500">Hạn bảo hành tự tính: </span>
          <strong className="font-semibold text-blue-700">
            {warrantyExpiry ? formatDate(warrantyExpiry) : '(Chưa xác định)'}
          </strong>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-[11px] text-slate-400">Hoặc chọn ngày cụ thể:</span>
          <input
            type="date"
            value={warrantyExpiry || ''}
            onChange={(e) => onWarrantyExpiryChange(e.target.value)}
            className="p-1.5 bg-white border border-slate-300 rounded-lg text-xs outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>
    </div>
  );
}

export default WarrantyInput;
