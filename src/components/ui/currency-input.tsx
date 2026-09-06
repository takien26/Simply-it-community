'use client';

import React from 'react';
import { formatNumberWithDots, numberToVietnameseWords, numberToForeignCurrencyWords } from '@/lib/utils';

interface CurrencyInputProps {
  label?: string;
  value: string | number;
  onChange: (numericValue: string) => void;
  currency?: string;
  currencyName?: string;
  exchangeRate?: number;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  showWords?: boolean;
}

export function CurrencyInput({
  label,
  value,
  onChange,
  currency = 'VND',
  currencyName,
  exchangeRate = 1,
  placeholder = 'VD: 20.000.000',
  required = false,
  disabled = false,
  className = '',
  showWords = true,
}: CurrencyInputProps) {
  const displayValue = formatNumberWithDots(value);
  const numericVal = Number(String(value).replace(/\D/g, '')) || 0;

  // Words for the current input value in its own currency
  const textWords =
    numericVal > 0
      ? currency === 'VND'
        ? numberToVietnameseWords(numericVal)
        : numberToForeignCurrencyWords(numericVal, currency, currencyName)
      : '';

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '');
    onChange(raw);
  };

  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}

      <div className="relative">
        <input
          type="text"
          disabled={disabled}
          placeholder={placeholder}
          value={displayValue}
          onChange={handleInputChange}
          className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-black text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 pr-14 transition-all"
        />
        <div className="absolute right-3 top-2.5 text-xs font-bold text-purple-600 dark:text-purple-400 pointer-events-none">
          {currency}
        </div>
      </div>

      {showWords && textWords && (
        <div className="text-[11px] text-purple-800 dark:text-purple-300 bg-purple-50/80 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/60 rounded-xl px-2.5 py-1.5 flex items-start gap-1.5 font-medium animate-in fade-in duration-100">
          <span className="text-purple-600 dark:text-purple-400 font-bold shrink-0">
            ✍️ {currency !== 'VND' ? 'Ngoại tệ bằng chữ:' : 'Bằng chữ:'}
          </span>
          <span className="italic font-semibold">{textWords}</span>
        </div>
      )}
    </div>
  );
}

export default CurrencyInput;


