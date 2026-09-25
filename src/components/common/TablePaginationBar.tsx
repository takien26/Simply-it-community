'use client';

import React from 'react';
import { useLanguage } from '@/lib/i18n/context';

export interface TablePaginationBarProps {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  pageSizeOptions?: number[];
  storageKey?: string;
  itemName?: string;
  className?: string;
}

export function TablePaginationBar({
  currentPage,
  totalPages,
  totalCount,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [15, 25, 50, 100],
  storageKey,
  itemName,
  className = '',
}: TablePaginationBarProps) {
  const { language } = useLanguage();

  if (totalCount <= 0) return null;

  const effectiveTotalPages = Math.max(1, totalPages || Math.ceil(totalCount / pageSize));
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(totalCount, currentPage * pageSize);

  const defaultItemName =
    itemName ||
    (language === 'en' ? 'items' : language === 'ja' ? '件' : 'bản ghi');

  return (
    <div
      className={`flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 text-xs shrink-0 select-none ${className}`}
    >
      {/* Left: Summary Counter & Page Size Selector */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="text-slate-500 dark:text-slate-400 font-medium">
          {language === 'en' ? 'Showing' : language === 'ja' ? '表示中' : 'Hiển thị'}{' '}
          <span className="font-bold text-slate-900 dark:text-white">{startItem}</span>
          {' - '}
          <span className="font-bold text-slate-900 dark:text-white">{endItem}</span>{' '}
          {language === 'en' ? 'of' : language === 'ja' ? '件中 / 全' : 'trên'}{' '}
          <span className="font-bold text-blue-600 dark:text-blue-400">{totalCount}</span>{' '}
          {defaultItemName}
        </div>

        {/* Page Size Selector */}
        <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
          <span>{language === 'en' ? 'Per page:' : language === 'ja' ? '表示件数:' : 'Số dòng:'}</span>
          <select
            value={pageSize}
            onChange={(e) => {
              const newSize = Number(e.target.value);
              onPageSizeChange(newSize);
              onPageChange(1);
              if (storageKey && typeof window !== 'undefined') {
                try {
                  localStorage.setItem(storageKey, String(newSize));
                } catch {}
              }
            }}
            className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold text-xs focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
          >
            {pageSizeOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Right: Navigation Controls */}
      <div className="flex items-center gap-1">
        {/* First Page */}
        <button
          type="button"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(1)}
          className="p-1.5 px-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-700 font-bold transition-all shadow-2xs cursor-pointer"
          title={language === 'en' ? 'First page' : language === 'ja' ? '先頭ページ' : 'Trang đầu'}
        >
          «
        </button>

        {/* Prev Page */}
        <button
          type="button"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-700 font-bold transition-all shadow-2xs cursor-pointer"
        >
          ← {language === 'en' ? 'Prev' : language === 'ja' ? '前' : 'Trước'}
        </button>

        {/* Current / Total */}
        <span className="px-2.5 py-1 font-bold text-slate-800 dark:text-slate-200">
          {language === 'en'
            ? `Page ${currentPage} / ${effectiveTotalPages}`
            : language === 'ja'
            ? `${currentPage} / ${effectiveTotalPages} ページ`
            : `Trang ${currentPage} / ${effectiveTotalPages}`}
        </span>

        {/* Next Page */}
        <button
          type="button"
          disabled={currentPage >= effectiveTotalPages}
          onClick={() => onPageChange(Math.min(effectiveTotalPages, currentPage + 1))}
          className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-700 font-bold transition-all shadow-2xs cursor-pointer"
        >
          {language === 'en' ? 'Next' : language === 'ja' ? '次' : 'Sau'} →
        </button>

        {/* Last Page */}
        <button
          type="button"
          disabled={currentPage >= effectiveTotalPages}
          onClick={() => onPageChange(effectiveTotalPages)}
          className="p-1.5 px-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-700 font-bold transition-all shadow-2xs cursor-pointer"
          title={language === 'en' ? 'Last page' : language === 'ja' ? '末尾ページ' : 'Trang cuối'}
        >
          »
        </button>
      </div>
    </div>
  );
}
