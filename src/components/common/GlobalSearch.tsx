'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
  Calendar,
  Flame,
  Settings,
  LayoutDashboard,
  ShieldCheck,
  Zap,
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

interface ActionItem {
  id: string;
  title: string;
  subtitle: string;
  keywords: string[];
  url: string;
  icon: any;
  color: string;
  bg: string;
  badge: string;
  section: 'action' | 'navigation';
}

const STATIC_ACTIONS: ActionItem[] = [
  // Quick Actions
  {
    id: 'act-ticket',
    title: 'Tạo Ticket Hỗ Trợ Mới',
    subtitle: 'Báo sự cố kỹ thuật hoặc gửi yêu cầu cấp phát thiết bị',
    keywords: ['ticket', 'tạo ticket', 'sự cố', 'hỗ trợ', 'helpdesk', 'báo hỏng', 'create ticket'],
    url: '/tickets',
    icon: LifeBuoy,
    color: 'text-rose-600',
    bg: 'bg-rose-50',
    badge: '⚡ Thao tác',
    section: 'action',
  },
  {
    id: 'act-asset',
    title: 'Thêm Thiết Bị / Tài Sản Mới',
    subtitle: 'Nhập máy tính, màn hình, máy in vào cơ sở dữ liệu tài sản',
    keywords: ['tài sản', 'thiết bị', 'thêm máy', 'nhập tài sản', 'laptop', 'asset', 'pc'],
    url: '/assets',
    icon: Laptop,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    badge: '⚡ Thao tác',
    section: 'action',
  },
  {
    id: 'act-runway',
    title: 'Lịch Dự Báo Chi Phí Gia Hạn 12 Tháng (Runway)',
    subtitle: 'Dòng tiền chi tiêu IT: Domain, SSL, Hosting, Thuê bao phần mềm 12 tháng',
    keywords: ['runway', 'lịch gia hạn', 'chi phí', 'ngân sách', 'dự toán', '12 tháng', 'hạn dùng', 'calendar'],
    url: '/services?tab=runway',
    icon: Calendar,
    color: 'text-indigo-600',
    bg: 'bg-indigo-50',
    badge: '📊 Runway',
    section: 'action',
  },
  {
    id: 'act-secret',
    title: 'Chia Sẻ Mật Khẩu Tự Hủy Dùng 1 Lần',
    subtitle: 'Tạo link bí mật mã hóa AES-256 tự hủy sau khi người nhận mở xem',
    keywords: ['chia sẻ', 'mật khẩu', 'link tự hủy', 'secret', 'pass', 'vault', 'burn', 'one time'],
    url: '/passwords',
    icon: Flame,
    color: 'text-orange-600',
    bg: 'bg-orange-50',
    badge: '🔥 One-Time',
    section: 'action',
  },
  {
    id: 'act-license',
    title: 'Quản Lý Bản Quyền Phần Mềm (Licenses)',
    subtitle: 'Kê khai giấy phép Microsoft 365, CAD, Antivirus, MISA...',
    keywords: ['bản quyền', 'license', 'software', 'phần mềm', 'office', 'windows'],
    url: '/licenses',
    icon: Key,
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    badge: '⚡ Thao tác',
    section: 'action',
  },

  // Direct Page Navigation
  {
    id: 'nav-dashboard',
    title: 'Bàn Làm Việc / Dashboard',
    subtitle: 'Tổng quan chỉ số SLA, cảnh báo tài sản và tình trạng hệ thống',
    keywords: ['dashboard', 'tổng quan', 'trang chủ', 'home', 'chỉ số'],
    url: '/dashboard',
    icon: LayoutDashboard,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    badge: '🧭 Điều hướng',
    section: 'navigation',
  },
  {
    id: 'nav-assets',
    title: 'Quản Lý Tài Sản & Thiết Bị',
    subtitle: 'Danh mục thiết bị, lịch sử bàn giao, bảo trì và kiểm kê',
    keywords: ['tài sản', 'thiết bị', 'assets', 'máy tính', 'laptop'],
    url: '/assets',
    icon: Laptop,
    color: 'text-cyan-600',
    bg: 'bg-cyan-50',
    badge: '🧭 Điều hướng',
    section: 'navigation',
  },
  {
    id: 'nav-tickets',
    title: 'Trung Tâm Ticket & Helpdesk',
    subtitle: 'Xử lý yêu cầu hỗ trợ người dùng, phân công IT và theo dõi SLA',
    keywords: ['ticket', 'helpdesk', 'hỗ trợ', 'sự cố', 'yêu cầu'],
    url: '/tickets',
    icon: LifeBuoy,
    color: 'text-rose-600',
    bg: 'bg-rose-50',
    badge: '🧭 Điều hướng',
    section: 'navigation',
  },
  {
    id: 'nav-passwords',
    title: 'Kho Mật Khẩu Doanh Nghiệp (Password Vault)',
    subtitle: 'Lưu trữ tài khoản server, wifi, tài khoản quản trị mã hóa AES',
    keywords: ['mật khẩu', 'passwords', 'kho pass', 'vault', 'credentials'],
    url: '/passwords',
    icon: ShieldCheck,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    badge: '🧭 Điều hướng',
    section: 'navigation',
  },
  {
    id: 'nav-kb',
    title: 'Thư Viện Tri Thức & Hướng Dẫn IT (KB)',
    subtitle: 'Kho tài liệu tự phục vụ: WiFi, máy in, đổi mật khẩu, VPN...',
    keywords: ['kb', 'tri thức', 'hướng dẫn', 'knowledge', 'tài liệu'],
    url: '/kb',
    icon: BookOpen,
    color: 'text-indigo-600',
    bg: 'bg-indigo-50',
    badge: '🧭 Điều hướng',
    section: 'navigation',
  },
  {
    id: 'nav-users',
    title: 'Quản Lý Người Dùng & Nhân Sự',
    subtitle: 'Danh bạ nhân viên, tài khoản đăng nhập và phòng ban',
    keywords: ['người dùng', 'users', 'nhân sự', 'nhân viên', 'phòng ban'],
    url: '/users',
    icon: User,
    color: 'text-violet-600',
    bg: 'bg-violet-50',
    badge: '🧭 Điều hướng',
    section: 'navigation',
  },
  {
    id: 'nav-settings',
    title: 'Cài Đặt Hệ Thống & Mẫu Biên Bản',
    subtitle: 'Tùy biến cấu hình, biểu mẫu bàn giao tài sản, phân quyền',
    keywords: ['cài đặt', 'settings', 'cấu hình', 'mẫu'],
    url: '/settings',
    icon: Settings,
    color: 'text-slate-600',
    bg: 'bg-slate-50',
    badge: '🧭 Điều hướng',
    section: 'navigation',
  },
];

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
    if (!q || q.trim().length < 1) {
      setResults(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q.trim())}&limit=20`);
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

  // Filter actions based on query
  const matchedActions = useMemo(() => {
    const cleanQ = query.trim().toLowerCase().replace(/^>/, '').trim();
    if (!cleanQ) {
      return STATIC_ACTIONS;
    }
    return STATIC_ACTIONS.filter((act) => {
      return (
        act.title.toLowerCase().includes(cleanQ) ||
        act.subtitle.toLowerCase().includes(cleanQ) ||
        act.keywords.some((k) => k.toLowerCase().includes(cleanQ))
      );
    });
  }, [query]);

  // Unified list of all selectable items
  const allSelectableItems = useMemo(() => {
    const items: Array<{ id: string; url: string; title: string }> = [];

    if (!query.trim()) {
      // Empty query: actions and navigation
      matchedActions.forEach((a) => items.push({ id: a.id, url: a.url, title: a.title }));
    } else {
      // With query: matched actions first, then db search results
      matchedActions.forEach((a) => items.push({ id: a.id, url: a.url, title: a.title }));
      if (results?.results) {
        results.results.forEach((r) => items.push({ id: r.id, url: r.url, title: r.title }));
      }
    }
    return items;
  }, [query, matchedActions, results]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, allSelectableItems.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && allSelectableItems[selectedIndex]) {
      e.preventDefault();
      navigateToUrl(allSelectableItems[selectedIndex].url);
    }
  };

  const navigateToUrl = (url: string) => {
    setIsOpen(false);
    router.push(url);
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
        className="flex items-center gap-2 p-2 sm:px-3.5 sm:py-2 rounded-xl bg-slate-100/90 hover:bg-slate-200 text-slate-500 text-xs font-semibold transition-all border border-slate-200/80 cursor-pointer w-9 h-9 sm:w-auto sm:min-w-[240px] justify-center sm:justify-start shadow-2xs hover:border-blue-300 shrink-0"
        title={t('search.title', 'Tìm kiếm nhanh toàn hệ thống (Ctrl + K)')}
      >
        <Search className="w-4 h-4 text-slate-500 shrink-0" />
        <span className="hidden sm:inline flex-1 text-left text-slate-500">{t('search.trigger', 'Tìm kiếm hoặc gõ lệnh...')}</span>
        <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-white border border-slate-300 rounded-md text-[10px] font-mono text-slate-500 shadow-2xs">
          <Command className="w-2.5 h-2.5" />K
        </kbd>
      </button>

      {/* Full-screen Command Palette Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[7vh] p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs animate-in fade-in"
            onClick={() => setIsOpen(false)}
          />

          {/* Modal Card */}
          <div
            ref={modalRef}
            className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[84vh]"
          >
            {/* Top Search & Command Bar */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
              <Zap className="w-5 h-5 text-amber-500 shrink-0" />
              <input
                ref={inputRef}
                type="text"
                placeholder={t('search.modal_placeholder', 'Gõ từ khóa, hoặc lệnh nhanh (VD: ticket, runway, pass, dell, misa...)')}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-1 text-sm outline-none placeholder:text-slate-400 font-semibold bg-transparent"
                autoComplete="off"
              />
              {loading && <Loader2 className="w-4 h-4 text-blue-600 animate-spin shrink-0" />}
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Results & Commands */}
            <div className="overflow-y-auto flex-1 divide-y divide-slate-100 dark:divide-slate-800">
              {/* SECTION: Quick Actions / Matched Actions */}
              {matchedActions.length > 0 && (
                <div className="py-2.5">
                  <div className="px-5 py-1.5 flex items-center justify-between text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
                    <span>{!query ? (isEn ? '⚡ Quick Actions & Direct Navigation' : '⚡ Thao Tác Nhanh & Điều Hướng') : (isEn ? '⚡ Matched Actions' : '⚡ Lệnh Nhanh Phù Hợp')}</span>
                    <span className="text-[10px] font-bold text-slate-400">({matchedActions.length})</span>
                  </div>

                  <div className="space-y-0.5 px-2">
                    {matchedActions.map((act) => {
                      const itemIdx = allSelectableItems.findIndex((x) => x.id === act.id);
                      const isSelected = itemIdx === selectedIndex;
                      const Icon = act.icon;

                      return (
                        <button
                          key={act.id}
                          type="button"
                          onClick={() => navigateToUrl(act.url)}
                          onMouseEnter={() => setSelectedIndex(itemIdx)}
                          className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-left transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-blue-50/90 dark:bg-blue-950/50 text-blue-900 shadow-2xs'
                              : 'hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-800'
                          }`}
                        >
                          <div className={`w-8 h-8 rounded-xl ${act.bg} flex items-center justify-center shrink-0 shadow-2xs`}>
                            <Icon className={`w-4 h-4 ${act.color}`} />
                          </div>

                          <div className="flex-1 min-w-0">
                            <p className={`text-xs font-bold truncate ${isSelected ? 'text-blue-700 dark:text-blue-300' : 'text-slate-800 dark:text-slate-200'}`}>
                              {act.title}
                            </p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                              {act.subtitle}
                            </p>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-full">
                              {act.badge}
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
                </div>
              )}

              {/* SECTION: Database Query Results */}
              {results && results.results.length > 0 && (
                <div className="py-2.5">
                  <div className="px-5 py-1.5 flex items-center justify-between text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
                    <span>{isEn ? '🔍 System Database Results' : '🔍 Dữ Liệu Khớp Từ Toàn Hệ Thống'}</span>
                    <span className="text-[10px] font-bold text-blue-600">({results.total} kết quả)</span>
                  </div>

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
                        <div className="px-5 py-1.5 flex items-center gap-2">
                          <div className={`w-4 h-4 rounded-md ${config.bg} flex items-center justify-center`}>
                            <Icon className={`w-2.5 h-2.5 ${config.color}`} />
                          </div>
                          <span className="text-[10.5px] font-extrabold text-slate-400 uppercase tracking-wider">
                            {getTypeLabel(type)}
                          </span>
                          <span className="text-[10px] text-slate-400 font-bold">({items.length})</span>
                        </div>

                        {/* Items in group */}
                        <div className="space-y-0.5 px-2">
                          {items.map((item) => {
                            const itemIdx = allSelectableItems.findIndex((x) => x.id === item.id);
                            const isSelected = itemIdx === selectedIndex;

                            return (
                              <button
                                key={item.id}
                                type="button"
                                onClick={() => navigateToUrl(item.url)}
                                onMouseEnter={() => setSelectedIndex(itemIdx)}
                                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-left transition-colors cursor-pointer ${
                                  isSelected ? 'bg-blue-50/90 dark:bg-blue-950/40 text-blue-900' : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
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
                                    {item.category || type}
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
                      </div>
                    );
                  })}
                </div>
              )}

              {/* No results state */}
              {query && !loading && matchedActions.length === 0 && results && results.results.length === 0 && (
                <div className="px-6 py-12 text-center text-xs text-slate-400 space-y-2">
                  <p className="font-bold text-slate-700 dark:text-slate-200 text-sm">
                    {t('search.no_results', 'Không tìm thấy kết quả nào phù hợp')} &ldquo;{query}&rdquo;
                  </p>
                  <p className="text-slate-400">
                    {language === 'en'
                      ? 'Try searching with other keywords (e.g. ticket, runway, pass, dell, misa...)'
                      : 'Hãy thử tìm với từ khóa khác (VD: ticket, runway, pass, dell, misa, wifi...)'}
                  </p>
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
                  <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded font-mono shadow-2xs">Enter</kbd> Chọn / Mở
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded font-mono shadow-2xs">Esc</kbd> {isEn ? 'Close' : 'Đóng'}
                </span>
              </div>
              <span className="text-[10px] text-slate-400">
                ⚡ <strong>Command Palette</strong>
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
