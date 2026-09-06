'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '@/lib/i18n/context';
import {
  BookOpen,
  Search,
  ChevronRight,
  Eye,
  Calendar,
  Layers,
  Sparkles,
  ArrowUpRight,
  X,
  FileText,
  Clock,
  User,
  Shield,
  HelpCircle,
  Plus,
  Upload,
  Lock,
  Globe,
  Server,
  Smartphone,
  Wrench,
  CheckCircle2,
  Loader2,
  FileDown,
} from 'lucide-react';

interface Article {
  id: string;
  title: string;
  slug: string;
  category: string;
  categoryKey: string;
  summary: string;
  content: string;
  views: number;
  updatedAt: string;
  isFeatured: boolean;
  author: string;
  teamScope?: string;
  isInternalIT?: boolean;
  fileUrl?: string;
  fileName?: string;
}

interface CategoryItem {
  key: string;
  name: string;
  count: number;
}

interface TeamScopeItem {
  key: string;
  name: string;
  count: number;
}

const CATEGORY_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  NETWORK: { bg: 'bg-blue-50 dark:bg-blue-950/40', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-200 dark:border-blue-800' },
  EMAIL: { bg: 'bg-emerald-50 dark:bg-emerald-950/40', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-200 dark:border-emerald-800' },
  SOFTWARE: { bg: 'bg-cyan-50 dark:bg-cyan-950/40', text: 'text-cyan-700 dark:text-cyan-300', border: 'border-cyan-200 dark:border-cyan-800' },
  HARDWARE: { bg: 'bg-orange-50 dark:bg-orange-950/40', text: 'text-orange-700 dark:text-orange-300', border: 'border-orange-200 dark:border-orange-800' },
  ACCOUNT: { bg: 'bg-purple-50 dark:bg-purple-950/40', text: 'text-purple-700 dark:text-purple-300', border: 'border-purple-200 dark:border-purple-800' },
  APPROVAL: { bg: 'bg-indigo-50 dark:bg-indigo-950/40', text: 'text-indigo-700 dark:text-indigo-300', border: 'border-indigo-200 dark:border-indigo-800' },
  MEETING: { bg: 'bg-rose-50 dark:bg-rose-950/40', text: 'text-rose-700 dark:text-rose-300', border: 'border-rose-200 dark:border-rose-800' },
  OTHER: { bg: 'bg-slate-50 dark:bg-slate-800/40', text: 'text-slate-700 dark:text-slate-300', border: 'border-slate-200 dark:border-slate-700' },
};

const getCategoryDisplayName = (catName: string, catKey: string, isEn: boolean) => {
  if (!isEn) return catName;
  const map: Record<string, string> = {
    ALL: 'All Categories',
    NETWORK: 'Network & WiFi',
    EMAIL: 'Email & Outlook',
    SOFTWARE: 'Software & ERP',
    HARDWARE: 'Hardware & Devices',
    PRINTER: 'Printers & Scanners',
    ACCOUNT: 'Accounts & Passwords',
    APPROVAL: 'Approvals & Workflows',
    MEETING: 'Meeting Room Tech',
    OTHER: 'Other Guides',
  };
  return map[catKey] || catName;
};

const getTeamScopeDisplayName = (scopeName: string, scopeKey: string, isEn: boolean) => {
  if (!isEn) return scopeName;
  const map: Record<string, string> = {
    ALL: 'All Scopes',
    PUBLIC: '🌍 All Employees (Public)',
    'IT-NET': '🔒 IT Network & Infrastructure',
    'IT-APP': '🔒 IT Applications & ERP',
    'IT-HELPDESK': '🔒 IT Helpdesk & Support',
    'IT-SEC': '🔒 Security & Compliance',
  };
  return map[scopeKey] || scopeName;
};

export default function KnowledgeBasePage() {
  const { language } = useLanguage();
  const isEn = language === 'en';

  const [articles, setArticles] = useState<Article[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [teamScopes, setTeamScopes] = useState<TeamScopeItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedTeamScope, setSelectedTeamScope] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [isITStaff, setIsITStaff] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // Upload / Create Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [formTitle, setFormTitle] = useState('');
  const [formTeamScope, setFormTeamScope] = useState('PUBLIC');
  const [formCategory, setFormCategory] = useState('NETWORK');
  const [formSummary, setFormSummary] = useState('');
  const [formContent, setFormContent] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (selectedCategory !== 'ALL') q.set('category', selectedCategory);
      if (selectedTeamScope !== 'ALL') q.set('teamScope', selectedTeamScope);
      if (search) q.set('search', search);

      const res = await fetch(`/api/kb?${q.toString()}`).then((r) => r.json());
      if (res.success) {
        setArticles(res.data);
        setCategories(res.categories);
        if (res.teamScopes) setTeamScopes(res.teamScopes);
        setIsITStaff(Boolean(res.isITStaff));
        setIsAdmin(Boolean(res.isAdmin));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedCategory, selectedTeamScope, search]);

  const handleCreateArticle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return;

    setSubmitting(true);
    try {
      let fileUrl = '';
      let fileName = '';

      if (uploadFile) {
        const formData = new FormData();
        formData.append('file', uploadFile);
        const upRes = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        }).then((r) => r.json());

        if (upRes.url) {
          fileUrl = upRes.url;
          fileName = uploadFile.name;
        }
      }

      const res = await fetch('/api/kb', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formTitle.trim(),
          teamScope: formTeamScope,
          category: formCategory,
          summary: formSummary.trim(),
          content: formContent.trim(),
          fileUrl,
          fileName,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setToastMsg(isEn ? '🎉 Guide article uploaded successfully!' : '🎉 Đã tải lên tài liệu hướng dẫn thành công!');
        setIsCreateModalOpen(false);
        setFormTitle('');
        setFormSummary('');
        setFormContent('');
        setUploadFile(null);
        loadData();
        setTimeout(() => setToastMsg(null), 4000);
      } else {
        alert(data.error || (isEn ? 'Error creating article' : 'Lỗi khi tạo bài viết'));
      }
    } catch (e: any) {
      alert(e.message || (isEn ? 'Connection error' : 'Lỗi kết nối'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-16">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="p-4 bg-emerald-500 text-white rounded-2xl shadow-xl flex items-center justify-between font-bold text-xs animate-in slide-in-from-top duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5" />
            <span>{toastMsg}</span>
          </div>
          <button onClick={() => setToastMsg(null)} className="cursor-pointer text-white/80 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20">
              <BookOpen className="w-5 h-5" />
            </span>
            <span>{isEn ? 'User Guides & IT Knowledge Base' : 'Hướng Dẫn Sử Dụng & Tài Liệu IT'}</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {isEn
              ? 'Knowledge center • Fast self-service troubleshooting guides and role-based IT operational procedures'
              : 'Trung tâm tài liệu hướng dẫn • Hướng dẫn tự xử lý sự cố nhanh chóng và quy trình vận hành CNTT có phân quyền'}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {isITStaff && (
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition-all cursor-pointer hover:scale-105 active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>{isEn ? '+ Add Guide / Upload Doc' : '+ Thêm Hướng Dẫn / Upload Tài Liệu'}</span>
            </button>
          )}

          <button
            onClick={() => {
              setSelectedCategory('ALL');
              setSelectedTeamScope('ALL');
            }}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 shadow-2xs cursor-pointer"
          >
            <BookOpen className="w-4 h-4 text-blue-600" />
            <span>{isEn ? 'View all' : 'Xem tất cả'}</span>
          </button>
        </div>
      </div>

      {/* Main Container - 2 Columns */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
        {/* Left Categories & Team Scope Sidebar (1 Column) */}
        <div className="space-y-4">
          {/* IT TEAM SCOPE FILTER (Chỉ hiển thị hoặc nổi bật với IT/Admin) */}
          {isITStaff && (
            <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-slate-900 text-white rounded-2xl p-4 shadow-lg border border-indigo-800/60 space-y-2">
              <div className="flex items-center justify-between text-[11px] font-extrabold uppercase tracking-wider text-indigo-300">
                <span className="flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5" />
                  <span>{isEn ? 'IT Team Scope' : 'Phân Luồng Team IT'}</span>
                </span>
                <span className="text-[9px] bg-indigo-500/30 px-1.5 py-0.5 rounded-full border border-indigo-400/30">
                  RBAC
                </span>
              </div>
              <p className="text-[10px] text-slate-300 leading-relaxed">
                {isEn ? 'Filter technical documentation by internal IT team:' : 'Lọc tài liệu kỹ thuật chuyên môn theo từng Team IT nội bộ:'}
              </p>

              <div className="space-y-1 pt-1">
                {teamScopes.map((scope) => {
                  const isActive = selectedTeamScope === scope.key;
                  const label = getTeamScopeDisplayName(scope.name, scope.key, isEn);
                  return (
                    <button
                      key={scope.key}
                      onClick={() => setSelectedTeamScope(scope.key)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-[11.5px] font-bold transition-all text-left cursor-pointer ${
                        isActive
                          ? 'bg-blue-600 text-white shadow-md font-black'
                          : 'text-slate-300 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <span className="truncate pr-1">{label}</span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full shrink-0 ${
                        isActive ? 'bg-white text-blue-900 font-extrabold' : 'bg-white/10 text-slate-300'
                      }`}>
                        {scope.count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* General Categories */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs space-y-1">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-3 py-2 flex items-center justify-between">
              <span>{isEn ? 'Support Categories' : 'Danh mục hỗ trợ'}</span>
              <Globe className="w-3.5 h-3.5 text-slate-400" />
            </div>

            {categories.map((cat) => {
              const isActive = selectedCategory === cat.key;
              const label = getCategoryDisplayName(cat.name, cat.key, isEn);
              return (
                <button
                  key={cat.key}
                  onClick={() => setSelectedCategory(cat.key)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all text-left cursor-pointer ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 shadow-2xs font-extrabold'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <span>{label}</span>
                  <span
                    className={`text-[11px] px-2 py-0.5 rounded-full ${
                      isActive
                        ? 'bg-blue-200/60 text-blue-800 dark:bg-blue-900 dark:text-blue-200 font-black'
                        : 'text-slate-400'
                    }`}
                  >
                    {cat.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Content Area: Search Bar + Articles List (3 Columns) */}
        <div className="md:col-span-3 space-y-4">
          {/* Search & Filter Toolbar */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder={isEn ? "Search articles, technical docs, VLAN, ERP, VPN..." : "Tìm kiếm bài viết, tài liệu kỹ thuật, VLAN, MISA, VPN..."}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500 shadow-xs font-medium"
              />
            </div>

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 outline-none shadow-xs cursor-pointer"
            >
              <option value="ALL">{isEn ? 'All Categories' : 'Tất cả danh mục'}</option>
              {categories.filter((c) => c.key !== 'ALL').map((c) => (
                <option key={c.key} value={c.key}>
                  {getCategoryDisplayName(c.name, c.key, isEn)}
                </option>
              ))}
            </select>
          </div>

          {/* Section Header */}
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider pt-2">
            <span>{isEn ? `Articles (${articles.length})` : `Danh sách bài viết (${articles.length})`}</span>
            {selectedTeamScope !== 'ALL' && (
              <span className="text-indigo-600 normal-case font-bold flex items-center gap-1">
                <Lock className="w-3 h-3" />
                <span>{isEn ? 'Filtering:' : 'Đang lọc:'} {selectedTeamScope}</span>
              </span>
            )}
          </div>

          {/* Articles List */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 shadow-xs overflow-hidden">
            {articles.length === 0 ? (
              <div className="p-12 text-center space-y-2">
                <FileText className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="text-xs font-bold text-slate-600">
                  {isEn ? 'No matching articles found.' : 'Không tìm thấy bài viết nào phù hợp.'}
                </p>
                <p className="text-[11px] text-slate-400">
                  {isEn ? 'Try changing your search keyword or selecting another category.' : 'Hãy thử đổi từ khóa tìm kiếm hoặc chọn danh mục khác.'}
                </p>
              </div>
            ) : (
              articles.map((item) => {
                const style = CATEGORY_STYLES[item.categoryKey] || CATEGORY_STYLES.OTHER;
                const catLabel = getCategoryDisplayName(item.category, item.categoryKey, isEn);
                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedArticle(item)}
                    className="p-4 sm:p-5 hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors flex items-center justify-between gap-4 cursor-pointer group"
                  >
                    <div className="space-y-1.5 flex-1">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors flex items-center gap-2 flex-wrap">
                        {item.isInternalIT && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-indigo-100 text-indigo-800 border border-indigo-200 flex items-center gap-1">
                            <Lock className="w-2.5 h-2.5 text-indigo-600" />
                            <span>{item.teamScope}</span>
                          </span>
                        )}
                        <span>{item.title}</span>
                        <ArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-blue-500" />
                      </h3>

                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
                        {item.summary}
                      </p>

                      <div className="flex items-center gap-3 text-[11px] text-slate-400 pt-0.5">
                        <span className="flex items-center gap-1 font-medium">
                          <User className="w-3 h-3 text-slate-400" />
                          <span>{item.author}</span>
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          <span>{isEn ? 'Updated:' : 'Cập nhật:'} {new Date(item.updatedAt).toLocaleDateString(isEn ? 'en-US' : 'vi-VN')}</span>
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          <span>{item.views.toLocaleString()} {isEn ? 'views' : 'lượt xem'}</span>
                        </span>
                      </div>
                    </div>

                    {/* Category Tag Badge on the right */}
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold border shrink-0 ${style.bg} ${style.text} ${style.border}`}
                    >
                      {catLabel}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Article Detail Modal / Reader */}
      {selectedArticle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col border border-slate-200 dark:border-slate-800 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                  {getCategoryDisplayName(selectedArticle.category, selectedArticle.categoryKey, isEn)}
                </span>
                {selectedArticle.isInternalIT && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800 border border-indigo-200 flex items-center gap-1">
                    <Lock className="w-3 h-3" />
                    <span>{isEn ? `Internal ${selectedArticle.teamScope}` : `Nội Bộ ${selectedArticle.teamScope}`}</span>
                  </span>
                )}
                <span className="text-xs text-slate-400">{isEn ? 'Author:' : 'Tác giả:'} <strong>{selectedArticle.author}</strong></span>
              </div>
              <button onClick={() => setSelectedArticle(null)} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              <h2 className="text-xl font-black text-slate-900 dark:text-white leading-tight">
                {selectedArticle.title}
              </h2>

              <div className="p-3.5 bg-blue-50/60 dark:bg-blue-950/30 rounded-2xl border border-blue-100 dark:border-blue-900/50 text-xs text-blue-900 dark:text-blue-200 font-semibold leading-relaxed">
                {selectedArticle.summary}
              </div>

              <div className="prose dark:prose-invert max-w-none text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed space-y-2">
                {selectedArticle.content}
              </div>

              {selectedArticle.fileUrl && (
                <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-4 mt-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center font-bold text-xs">
                      PDF
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">{selectedArticle.fileName || (isEn ? 'Attached Document' : 'Tài liệu đính kèm')}</h4>
                      <p className="text-[11px] text-slate-400">{isEn ? 'Full operational procedure document' : 'File tài liệu quy trình đầy đủ'}</p>
                    </div>
                  </div>
                  <a
                    href={selectedArticle.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
                  >
                    <FileDown className="w-4 h-4" />
                    <span>{isEn ? 'Download' : 'Tải File'}</span>
                  </a>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-400 bg-slate-50 dark:bg-slate-800/50">
              <span>{selectedArticle.views.toLocaleString()} {isEn ? 'views' : 'lượt xem'}</span>
              <button
                onClick={() => setSelectedArticle(null)}
                className="px-5 py-2 bg-blue-600 text-white rounded-xl font-bold cursor-pointer hover:bg-blue-700 transition-colors shadow-xs"
              >
                {isEn ? 'Understood & Close' : 'Đã hiểu & Đóng'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE / UPLOAD MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
              <div className="flex items-center gap-2.5">
                <Upload className="w-5 h-5" />
                <h3 className="font-black text-sm">
                  {isEn ? 'Add Guide / Upload IT Documentation' : 'Thêm Hướng Dẫn / Upload Tài Liệu Kỹ Thuật IT'}
                </h3>
              </div>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-white/80 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateArticle} className="p-6 overflow-y-auto space-y-4 flex-1 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {isEn ? 'Article Title / Document Name' : 'Tiêu đề bài viết / Tên tài liệu'} <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder={isEn ? "e.g. Cisco Switch Configuration Guide, VLAN Network Map, MISA ERP Setup..." : "VD: Hướng dẫn cấu hình Switch Cisco, Sơ đồ VLAN, Cài phần mềm MISA..."}
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-blue-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {isEn ? 'Visibility Scope & IT Team Permissions' : 'Phạm vi hiển thị & Phân quyền Team IT'} <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formTeamScope}
                    onChange={(e) => setFormTeamScope(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-blue-500 font-bold text-slate-800 cursor-pointer"
                  >
                    <option value="PUBLIC">{isEn ? '🌍 All Employees (Public)' : '🌍 Tất cả Nhân viên (Public)'}</option>
                    <option value="IT-NET">{isEn ? '🔒 Team IT Network & Infra' : '🔒 Team IT Network & Hạ Tầng'}</option>
                    <option value="IT-APP">{isEn ? '🔒 Team IT Applications & ERP' : '🔒 Team IT Ứng Dụng & ERP'}</option>
                    <option value="IT-HELPDESK">{isEn ? '🔒 Team IT Helpdesk & Hardware' : '🔒 Team IT Helpdesk & Thiết Bị'}</option>
                    <option value="IT-SEC">{isEn ? '🔒 Team Security & Compliance' : '🔒 Team An Toàn & Bảo Mật'}</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {isEn ? 'Category' : 'Danh mục chuyên mục'}
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-blue-500 font-bold text-slate-800 cursor-pointer"
                  >
                    <option value="NETWORK">{isEn ? 'Network & WiFi' : 'Hệ thống mạng & WiFi'}</option>
                    <option value="EMAIL">{isEn ? 'Email & Outlook' : 'Email & Outlook'}</option>
                    <option value="SOFTWARE">{isEn ? 'Software & ERP' : 'Phần mềm & ERP'}</option>
                    <option value="PRINTER">{isEn ? 'Printers & Scanners' : 'Máy in & Scan'}</option>
                    <option value="HARDWARE">{isEn ? 'Hardware & Devices' : 'Phần cứng & Thiết bị'}</option>
                    <option value="ACCOUNT">{isEn ? 'Accounts & Passwords' : 'Tài khoản & Mật khẩu'}</option>
                    <option value="MEETING">{isEn ? 'Meeting Room Tech' : 'Thiết bị Phòng Họp'}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {isEn ? 'Short Summary' : 'Tóm tắt ngắn gọn'}
                </label>
                <input
                  type="text"
                  placeholder={isEn ? "Describe purpose and scope of application..." : "Mô tả mục đích và phạm vi áp dụng..."}
                  value={formSummary}
                  onChange={(e) => setFormSummary(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-blue-500 font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {isEn ? 'Detailed Content & Step-by-Step Instructions' : 'Nội dung chi tiết & Các bước thực hiện'}
                </label>
                <textarea
                  rows={6}
                  placeholder={isEn ? "Enter step 1, 2, 3 instructions, IP configurations, ports, terminal commands..." : "Nhập hướng dẫn từng bước 1, 2, 3, các thông số kỹ thuật IP, Port, lệnh cấu hình..."}
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-blue-500 font-medium font-mono text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {isEn ? 'Attach Document File (PDF, Word, Diagrams)' : 'Đính kèm File tài liệu (PDF, Word, Ảnh sơ đồ)'}
                </label>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  {isEn ? 'Cancel' : 'Hủy'}
                </button>
                <button
                  type="submit"
                  disabled={submitting || !formTitle.trim()}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  <span>{submitting ? (isEn ? 'Uploading...' : 'Đang tải lên...') : (isEn ? 'Save & Publish' : 'Lưu & Xuất Bản')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
