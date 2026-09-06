'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  X,
  Laptop,
  User,
  LifeBuoy,
  Key,
  Globe,
  ArrowRight,
  Command,
  Loader2,
  BookOpen,
  FileText,
  Wrench,
  AlertTriangle,
  ChevronRight,
} from 'lucide-react';
import { useLanguage } from '@/lib/i18n/context';

interface SearchResult {
  type: 'asset' | 'user' | 'ticket' | 'license' | 'service' | 'kb' | 'document' | 'spare_part';
  icon: string;
  id: string;
  title: string;
  subtitle: string;
  category?: string;
  url: string;
}

interface SearchResponse {
  success: boolean;
  query: string;
  total: number;
  results: SearchResult[];
  grouped: Record<string, SearchResult[]>;
}

const TYPE_CONFIG: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  asset: { label: 'Tài sản & Thiết bị', icon: Laptop, color: 'text-blue-600', bg: 'bg-blue-50' },
  ticket: { label: 'Ticket Helpdesk', icon: LifeBuoy, color: 'text-rose-600', bg: 'bg-rose-50' },
  kb: { label: 'Hướng dẫn & Tri thức IT', icon: BookOpen, color: 'text-indigo-600', bg: 'bg-indigo-50' },
  license: { label: 'Bản quyền License', icon: Key, color: 'text-amber-600', bg: 'bg-amber-50' },
  service: { label: 'Dịch vụ viễn thông', icon: Globe, color: 'text-cyan-600', bg: 'bg-cyan-50' },
  spare_part: { label: 'Kho phụ tùng linh kiện', icon: Wrench, color: 'text-orange-600', bg: 'bg-orange-50' },
  user: { label: 'Nhân sự & Người dùng', icon: User, color: 'text-emerald-600', bg: 'bg-emerald-50' },
};

export function GlobalSearch() {
  const router = useRouter();
  const { language, t } = useLanguage();
    const isEn = language === 'en';
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Ctrl+K / Cmd+K shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Auto-focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
      setResults(null);
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Debounced search API
  const doSearch = useCallback(async (q: string) => {
    if (!q || q.length < 1) {
      setResults(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&limit=20`);
      const data = await res.json();
      if (data.success) {
        setResults(data);
        setSelectedIndex(0);
      }
    } catch (e) {
      console.error('Search error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(query), 200);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, doSearch]);

  const allResults = results?.results || [];

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, allResults.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && allResults[selectedIndex]) {
      e.preventDefault();
      navigateTo(allResults[selectedIndex]);
    }
  };

  const navigateTo = (item: SearchResult) => {
    setIsOpen(false);
    router.push(item.url);
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'asset': return language === 'en' ? 'Hardware & Assets' : 'Tài sản & Thiết bị';
      case 'ticket': return language === 'en' ? 'Helpdesk Tickets' : 'Ticket Helpdesk';
      case 'kb': return language === 'en' ? 'Knowledge Base' : 'Hướng dẫn & Tri thức IT';
      case 'license': return language === 'en' ? 'Software Licenses' : 'Bản quyền License';
      case 'service': return language === 'en' ? 'Telecom & Services' : 'Dịch vụ viễn thông';
      case 'spare_part': return language === 'en' ? 'Spare Parts Vault' : 'Kho phụ tùng linh kiện';
      case 'user': return language === 'en' ? 'Users & Directory' : 'Nhân sự & Người dùng';
      default: return type;
    }
  };

  return (
    <>
      {/* Search Input Trigger Button in Top Header */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100/90 hover:bg-slate-200 text-slate-500 text-xs font-semibold transition-all border border-slate-200/80 cursor-pointer min-w-[200px] sm:min-w-[240px] shadow-2xs hover:border-blue-300"
        title={t('search.title', 'Tìm kiếm nhanh toàn hệ thống (Ctrl + K)')}
      >
        <Search className="w-4 h-4 text-slate-400" />
        <span className="flex-1 text-left text-slate-500">{t('search.trigger', 'Tìm kiếm nhanh...')}</span>
        <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-white border border-slate-300 rounded-md text-[10px] font-mono text-slate-500 shadow-2xs">
          <Command className="w-2.5 h-2.5" />K
        </kbd>
      </button>

      {/* Full-screen Command Palette Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[8vh] p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs animate-in fade-in"
            onClick={() => setIsOpen(false)}
          />

          {/* Modal Card */}
          <div
            ref={modalRef}
            className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[82vh]"
          >
            {/* Top Search Input */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
              <Search className="w-5 h-5 text-blue-600 shrink-0" />
              <input
                ref={inputRef}
                type="text"
                placeholder={t('search.modal_placeholder', 'Tìm tài sản, serial, nhân viên, ticket, wifi, vlan, máy in, misa...')}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-1 text-sm outline-none placeholder:text-slate-400 font-semibold bg-transparent"
                autoComplete="off"
              />
              {loading && <Loader2 className="w-4 h-4 text-blue-600 animate-spin shrink-0" />}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Results */}
            <div className="overflow-y-auto flex-1 divide-y divide-slate-100 dark:divide-slate-800">
              {!query && (
                <div className="px-6 py-10 text-center text-xs text-slate-400 space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto shadow-xs">
                    <Search className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-700 dark:text-slate-200 text-sm">{t('search.hint_title', 'Gõ từ khóa để tra cứu ngay')}</p>
                    <p className="mt-1 text-slate-400">
                      {t('search.hint_desc', 'Mã tài sản, số serial, tên nhân viên, mã ticket, hướng dẫn WiFi, máy in, VLAN, MISA...')}
                    </p>
                  </div>
                </div>
              )}

              {query && !loading && results && allResults.length === 0 && (
                <div className="px-6 py-10 text-center text-xs text-slate-400 space-y-2">
                  <p className="font-bold text-slate-700 dark:text-slate-200 text-sm">
                    {t('search.no_results', 'Không tìm thấy kết quả nào phù hợp')} &ldquo;{query}&rdquo;
                  </p>
                  <p className="text-slate-400">{language === 'en' ? 'Try searching with other keywords (e.g. wifi, dell, ticket, misa, ram...)' : 'Hãy thử tìm với từ khóa khác (VD: wifi, dell, ticket, misa, ram...)'}</p>
                </div>
              )}

              {results && allResults.length > 0 && (
                <div className="py-2">
                  {Object.entries(results.grouped).map(([type, items]) => {
                    if (items.length === 0) return null;
                    const config = TYPE_CONFIG[type] || {
                      label: type,
                      icon: FileText,
                      color: 'text-slate-600',
                      bg: 'bg-slate-50',
                    };
                    const Icon = config.icon;

                    return (
                      <div key={type} className="mb-2">
                        {/* Group Header */}
                        <div className="px-5 py-2 flex items-center gap-2">
                          <div className={`w-5 h-5 rounded-md ${config.bg} flex items-center justify-center`}>
                            <Icon className={`w-3 h-3 ${config.color}`} />
                          </div>
                          <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
                            {getTypeLabel(type)}
                          </span>
                          <span className="text-[10px] text-slate-400 font-bold">({items.length})</span>
                        </div>

                        {/* Items in group */}
                        {items.map((item) => {
                          const globalIdx = allResults.indexOf(item);
                          const isSelected = globalIdx === selectedIndex;
                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => navigateTo(item)}
                              onMouseEnter={() => setSelectedIndex(globalIdx)}
                              className={`w-full flex items-center gap-3 px-5 py-2.5 text-left transition-colors cursor-pointer ${
                                isSelected ? 'bg-blue-50/80 dark:bg-blue-950/40 text-blue-900' : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                              }`}
                            >
                              <div className="flex-1 min-w-0">
                                <p className={`text-xs font-bold truncate ${isSelected ? 'text-blue-700 dark:text-blue-300' : 'text-slate-800 dark:text-slate-200'}`}>
                                  {item.title}
                                </p>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                                  {item.subtitle}
                                </p>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                                  {item.category}
                                </span>
                                {isSelected ? (
                                  <ArrowRight className="w-4 h-4 text-blue-600" />
                                ) : (
                                  <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer Shortcut Bar */}
            <div className="px-5 py-2.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between text-[10.5px] text-slate-400 font-medium">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded font-mono shadow-2xs">↑↓</kbd> Di chuyển
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded font-mono shadow-2xs">Enter</kbd> Mở
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded font-mono shadow-2xs">Esc</kbd>{isEn ? 'Close' : 'Đóng'}</span>
              </div>
              {results && <span className="font-bold text-blue-600">{results.total} kết quả tìm thấy</span>}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
