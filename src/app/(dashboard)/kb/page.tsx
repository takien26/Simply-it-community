'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { TablePaginationBar } from '@/components/common/TablePaginationBar';
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
  Pencil,
  Trash2,
  AlertTriangle,
  ThumbsUp,
  ThumbsDown,
  MessageSquarePlus,
} from 'lucide-react';
import { KBArticleContent } from '@/components/kb/KBArticleContent';
import { KBEditorModal } from '@/components/kb/KBEditorModal';

const FEEDBACK_REASON_MAP: Record<string, { vi: string; en: string }> = {
  OUTDATED: { vi: 'Thông tin đã cũ / không giống thực tế', en: 'Information is outdated / not matching' },
  MISSING_STEPS: { vi: 'Thiếu bước thực hiện', en: 'Missing steps / incomplete guide' },
  BROKEN_LINK: { vi: 'Không tải được phần mềm / link hỏng', en: 'Broken download link or files' },
  HARD_TO_UNDERSTAND: { vi: 'Khó hiểu / Không làm theo được', en: 'Hard to understand / follow' },
  OTHER: { vi: 'Khác', en: 'Other' },
};

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
  helpfulCount?: number;
  unhelpfulCount?: number;
  deflectedTickets?: number;
  feedbackRatio?: number;
  needsImprovement?: boolean;
  reasons?: Array<{
    id: string;
    reason: string;
    reasonLabel: string;
    comment?: string;
    createdAt: string;
  }>;
  reasonCounts?: Record<string, number>;
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
  const [canCreate, setCanCreate] = useState(false);
  const [canUpdate, setCanUpdate] = useState(false);
  const [canDelete, setCanDelete] = useState(false);

  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [filterNeedsImprovement, setFilterNeedsImprovement] = useState<boolean>(false);
  const [needsImprovementCount, setNeedsImprovementCount] = useState<number>(0);
  const [totalDeflectedTickets, setTotalDeflectedTickets] = useState<number>(0);
  const [feedbackSubmitting, setFeedbackSubmitting] = useState<boolean>(false);

  // Pagination state with localStorage persistence
  const [pageSize, setPageSize] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('simply_it_kb_page_size');
      if (saved) {
        const parsed = parseInt(saved, 10);
        if ([15, 25, 50, 100].includes(parsed)) return parsed;
      }
    }
    return 25;
  });
  const [currentPage, setCurrentPage] = useState(1);

  // Reset page when search or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedCategory, selectedTeamScope, filterNeedsImprovement]);

  const totalPages = Math.ceil(articles.length / pageSize) || 1;
  const paginatedArticles = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return articles.slice(start, start + pageSize);
  }, [articles, currentPage, pageSize]);

  // Unified Editor Modal State (Create & Edit)
  const [isEditorModalOpen, setIsEditorModalOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<Article | null>(null);

  // Article Reader Feedback State
  const [feedbackGiven, setFeedbackGiven] = useState<'yes' | 'need_reason' | 'submitted_reason' | null>(null);
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [feedbackComment, setFeedbackComment] = useState<string>('');

  // Delete Confirm Modal State
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [deletingArticle, setDeletingArticle] = useState<Article | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  // Reset feedback state when selectedArticle changes
  useEffect(() => {
    setFeedbackGiven(null);
    setSelectedReason('');
    setFeedbackComment('');
  }, [selectedArticle]);

  // ESC key listener to close active modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isDeleteConfirmOpen) setIsDeleteConfirmOpen(false);
        else if (isEditorModalOpen) setIsEditorModalOpen(false);
        else if (selectedArticle) setSelectedArticle(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDeleteConfirmOpen, isEditorModalOpen, selectedArticle]);

  const loadData = async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (selectedCategory !== 'ALL') q.set('category', selectedCategory);
      if (selectedTeamScope !== 'ALL') q.set('teamScope', selectedTeamScope);
      if (search) q.set('search', search);
      if (filterNeedsImprovement) q.set('needsImprovement', 'true');

      const res = await fetch(`/api/kb?${q.toString()}`).then((r) => r.json());
      if (res.success) {
        setArticles(res.data);
        setCategories(res.categories);
        if (res.teamScopes) setTeamScopes(res.teamScopes);
        if (typeof res.needsImprovementCount === 'number') {
          setNeedsImprovementCount(res.needsImprovementCount);
        }
        if (typeof res.totalDeflectedTickets === 'number') {
          setTotalDeflectedTickets(res.totalDeflectedTickets);
        }
        setIsITStaff(Boolean(res.isITStaff));
        setIsAdmin(Boolean(res.isAdmin));
        setCanCreate(Boolean(res.canCreate));
        setCanUpdate(Boolean(res.canUpdate));
        setCanDelete(Boolean(res.canDelete));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleFeedback = async (isHelpful: boolean, reason?: string, comment?: string) => {
    if (!selectedArticle || feedbackSubmitting) return;
    setFeedbackSubmitting(true);
    setFeedbackGiven(isHelpful ? 'yes' : 'submitted_reason');

    // Optimistic UI update
    const prevHelpful = selectedArticle.helpfulCount || 0;
    const prevUnhelpful = selectedArticle.unhelpfulCount || 0;
    const newHelpful = prevHelpful + (isHelpful ? 1 : 0);
    const newUnhelpful = prevUnhelpful + (isHelpful ? 0 : 1);
    const total = newHelpful + newUnhelpful;
    const newRatio = total > 0 ? Math.round((newHelpful / total) * 100) : 100;
    const newNeedsImprovement = total >= 2 && newRatio < 70;

    const existingReasons = selectedArticle.reasons || [];
    const reasonLabel =
      reason === 'OUTDATED'
        ? (isEn ? 'Information is outdated / not matching' : 'Thông tin đã cũ / không giống thực tế')
        : reason === 'MISSING_STEPS'
        ? (isEn ? 'Missing steps / incomplete guide' : 'Thiếu bước thực hiện')
        : reason === 'BROKEN_LINK'
        ? (isEn ? 'Broken download link or files' : 'Không tải được phần mềm / link hỏng')
        : reason === 'HARD_TO_UNDERSTAND'
        ? (isEn ? 'Hard to understand / follow' : 'Khó hiểu / Không làm theo được')
        : (isEn ? 'Other' : 'Lý do khác');

    const newReasons = reason
      ? [
          {
            id: `temp-${Date.now()}`,
            reason,
            reasonLabel,
            comment,
            createdAt: new Date().toISOString(),
          },
          ...existingReasons,
        ]
      : existingReasons;

    const existingCounts = selectedArticle.reasonCounts || {};
    const newCounts = reason
      ? { ...existingCounts, [reason]: (existingCounts[reason] || 0) + 1 }
      : existingCounts;

    const updatedArticle: Article = {
      ...selectedArticle,
      helpfulCount: newHelpful,
      unhelpfulCount: newUnhelpful,
      feedbackRatio: newRatio,
      needsImprovement: newNeedsImprovement,
      reasons: newReasons,
      reasonCounts: newCounts,
    };
    setSelectedArticle(updatedArticle);
    setArticles((prev) =>
      prev.map((a) => (a.id === selectedArticle.id ? { ...a, ...updatedArticle } : a))
    );

    try {
      await fetch(`/api/kb/${selectedArticle.id}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isHelpful, reason, comment }),
      });
      // Refresh count in background
      const refreshRes = await fetch('/api/kb').then((r) => r.json());
      if (refreshRes.success && typeof refreshRes.needsImprovementCount === 'number') {
        setNeedsImprovementCount(refreshRes.needsImprovementCount);
      }
    } catch (e) {
      console.error('Error submitting feedback', e);
    } finally {
      setFeedbackSubmitting(false);
    }
  };

  const openCreateModal = () => {
    setEditingArticle(null);
    setIsEditorModalOpen(true);
  };

  const openEditModal = (article: Article) => {
    setEditingArticle(article);
    setIsEditorModalOpen(true);
  };

  const handleEditorSaveSuccess = async (savedArticle?: any) => {
    const isEditMode = Boolean(editingArticle?.id);
    setToastMsg(
      isEditMode
        ? (isEn ? '🎉 Article updated successfully!' : '🎉 Đã cập nhật bài viết thành công!')
        : (isEn ? '🎉 Guide article uploaded successfully!' : '🎉 Đã tải lên tài liệu hướng dẫn thành công!')
    );
    setIsEditorModalOpen(false);
    setEditingArticle(null);
    await loadData();
    if (selectedArticle && savedArticle && (selectedArticle.id === savedArticle.id || selectedArticle.id === editingArticle?.id)) {
      setSelectedArticle((prev) => (prev ? { ...prev, ...savedArticle } : null));
    }
    setTimeout(() => setToastMsg(null), 4000);
  };

  const openDeleteConfirm = (article: Article) => {
    setDeletingArticle(article);
    setIsDeleteConfirmOpen(true);
  };

  const handleDeleteArticle = async () => {
    if (!deletingArticle) return;

    setDeleteSubmitting(true);
    try {
      const res = await fetch(`/api/kb/${deletingArticle.id}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setToastMsg(isEn ? '🗑️ Article deleted successfully!' : '🗑️ Đã xóa bài viết thành công!');
        setIsDeleteConfirmOpen(false);
        if (selectedArticle && selectedArticle.id === deletingArticle.id) {
          setSelectedArticle(null);
        }
        setDeletingArticle(null);
        loadData();
        setTimeout(() => setToastMsg(null), 4000);
      } else {
        alert(data.error || (isEn ? 'Error deleting article' : 'Lỗi khi xóa bài viết'));
      }
    } catch (e: any) {
      alert(e.message || (isEn ? 'Connection error' : 'Lỗi kết nối'));
    } finally {
      setDeleteSubmitting(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedCategory, selectedTeamScope, search, filterNeedsImprovement]);

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
          {canCreate && (
            <button
              onClick={openCreateModal}
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
              setFilterNeedsImprovement(false);
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

          {/* Quality & Needs Improvement Filter Card (Deflection Rate Monitoring) */}
          <div className={`rounded-2xl border p-4 shadow-xs space-y-2 transition-all ${
            filterNeedsImprovement
              ? 'bg-amber-500/10 border-amber-500/40 text-amber-900 dark:text-amber-200'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
          }`}>
            <div className="flex items-center justify-between text-[11px] font-extrabold uppercase tracking-wider text-amber-700 dark:text-amber-400">
              <span className="flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span>{isEn ? 'Quality Review' : 'Cần Cập Nhật / Bổ Sung'}</span>
              </span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                needsImprovementCount > 0
                  ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
              }`}>
                {needsImprovementCount} {isEn ? 'articles' : 'bài'}
              </span>
            </div>
            {/* Deflection Impact Counter */}
            <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-base">🛡️</span>
                <div>
                  <p className="text-[10px] uppercase tracking-wider font-extrabold text-emerald-800 dark:text-emerald-300">
                    {isEn ? 'Ticket Deflection' : 'Giảm Tải Ticket IT'}
                  </p>
                  <p className="text-xs font-black text-emerald-900 dark:text-emerald-100">
                    {totalDeflectedTickets} {isEn ? 'tickets deflected' : 'ticket đã tự xử lý'}
                  </p>
                </div>
              </div>
            </div>

            <p className="text-[10.5px] text-slate-500 dark:text-slate-400 leading-relaxed">
              {isEn
                ? 'Articles with self-service resolution rate < 70% or where users needed more support.'
                : 'Bài viết có tỷ lệ người dùng tự sửa được < 70% hoặc có lượt phản hồi cần IT hỗ trợ thêm.'}
            </p>
            <button
              type="button"
              onClick={() => setFilterNeedsImprovement(!filterNeedsImprovement)}
              className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                filterNeedsImprovement
                  ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-md'
                  : 'bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/80'
              }`}
            >
              {filterNeedsImprovement ? (
                <>
                  <X className="w-3.5 h-3.5" />
                  <span>{isEn ? 'Clear Filter (Show All)' : 'Bỏ Lọc (Hiện tất cả)'}</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>{isEn ? `Filter Needs Work (${needsImprovementCount})` : `Lọc Bài Cần Cải Thiện (${needsImprovementCount})`}</span>
                </>
              )}
            </button>
          </div>

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
              <>
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {paginatedArticles.map((item) => {
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

                          <div className="flex items-center gap-3 text-[11px] text-slate-400 pt-0.5 flex-wrap">
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
                            {typeof item.feedbackRatio === 'number' && (
                              <>
                                <span>•</span>
                                {item.needsImprovement ? (
                                  <span className="inline-flex items-center gap-1 text-[10.5px] font-extrabold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-300 dark:border-amber-700">
                                    <AlertTriangle className="w-3 h-3 text-amber-600" />
                                    <span>{item.feedbackRatio}% {isEn ? 'resolved' : 'tự sửa được'} • {isEn ? 'Needs review' : 'Cần bổ sung'}</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                                    <ThumbsUp className="w-3 h-3 text-emerald-500" />
                                    <span>{item.feedbackRatio}% {isEn ? 'helpful' : 'hữu ích'} ({item.helpfulCount || 0})</span>
                                  </span>
                                )}
                              </>
                            )}
                            {typeof item.deflectedTickets === 'number' && item.deflectedTickets > 0 && (
                              <>
                                <span>•</span>
                                <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-full border border-blue-200 dark:border-blue-800">
                                  <span>🛡️</span>
                                  <span>{item.deflectedTickets} {isEn ? 'deflected' : 'ticket đã tự xử lý'}</span>
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Action buttons & Category Tag Badge on the right */}
                        <div className="flex items-center gap-2 shrink-0">
                          {(canUpdate || canDelete) && (
                            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                              {canUpdate && (
                                <button
                                  type="button"
                                  onClick={() => openEditModal(item)}
                                  title={isEn ? "Edit article" : "Chỉnh sửa bài viết"}
                                  className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded-lg transition-colors cursor-pointer"
                                >
                                  <Pencil className="w-4 h-4" />
                                </button>
                              )}
                              {canDelete && (
                                <button
                                  type="button"
                                  onClick={() => openDeleteConfirm(item)}
                                  title={isEn ? "Delete article" : "Xóa bài viết"}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors cursor-pointer"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          )}
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-bold border shrink-0 ${style.bg} ${style.text} ${style.border}`}
                          >
                            {catLabel}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Pagination Controls */}
                <TablePaginationBar
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalCount={articles.length}
                  pageSize={pageSize}
                  onPageChange={setCurrentPage}
                  onPageSizeChange={setPageSize}
                  storageKey="simply_it_kb_page_size"
                  itemName={isEn ? 'articles' : 'bài viết'}
                />
              </>
            )}
          </div>
        </div>
      </div>

      {/* Article Detail Modal / Reader */}
      {selectedArticle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-3 sm:p-5 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-5xl w-full max-h-[92vh] flex flex-col border border-slate-200 dark:border-slate-800 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800">
                  {getCategoryDisplayName(selectedArticle.category, selectedArticle.categoryKey, isEn)}
                </span>
                {selectedArticle.isInternalIT && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800 border border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800 flex items-center gap-1">
                    <Lock className="w-3 h-3" />
                    <span>{isEn ? `Internal ${selectedArticle.teamScope}` : `Nội Bộ ${selectedArticle.teamScope}`}</span>
                  </span>
                )}
                <span className="text-xs text-slate-400">
                  {isEn ? 'Author:' : 'Tác giả:'} <strong className="text-slate-600 dark:text-slate-300">{selectedArticle.author}</strong>
                </span>
                <span className="text-slate-300 dark:text-slate-700">•</span>
                <span className="text-xs text-slate-400">
                  {isEn ? 'Updated:' : 'Cập nhật:'} {new Date(selectedArticle.updatedAt).toLocaleDateString(isEn ? 'en-US' : 'vi-VN')}
                </span>
                {typeof selectedArticle.feedbackRatio === 'number' && (
                  <>
                    <span className="text-slate-300 dark:text-slate-700">•</span>
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                      selectedArticle.needsImprovement
                        ? 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800'
                        : 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
                    }`}>
                      {selectedArticle.needsImprovement ? (
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                      ) : (
                        <ThumbsUp className="w-3.5 h-3.5 text-emerald-600" />
                      )}
                      <span>{selectedArticle.feedbackRatio}% {isEn ? 'helpful' : 'tự sửa được'} ({selectedArticle.helpfulCount || 0}👍 / {selectedArticle.unhelpfulCount || 0}👎)</span>
                    </span>
                  </>
                )}
                {typeof selectedArticle.deflectedTickets === 'number' && selectedArticle.deflectedTickets > 0 && (
                  <>
                    <span className="text-slate-300 dark:text-slate-700">•</span>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-800 border border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800">
                      <span>🛡️</span>
                      <span>{selectedArticle.deflectedTickets} {isEn ? 'tickets deflected' : 'ticket đã tự giải quyết'}</span>
                    </span>
                  </>
                )}
              </div>
              <div className="flex items-center gap-2">
                {canUpdate && (
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedArticle) openEditModal(selectedArticle);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200 dark:border-blue-800 transition-colors cursor-pointer"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    <span>{isEn ? 'Edit' : 'Sửa'}</span>
                  </button>
                )}
                {canDelete && (
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedArticle) openDeleteConfirm(selectedArticle);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200 dark:border-rose-800 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{isEn ? 'Delete' : 'Xóa'}</span>
                  </button>
                )}
                <button
                  onClick={() => setSelectedArticle(null)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="p-6 sm:p-8 overflow-y-auto space-y-6 flex-1">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white leading-tight">
                  {selectedArticle.title}
                </h2>
                {selectedArticle.summary && (
                  <div className="mt-3 p-4 bg-blue-50/70 dark:bg-blue-950/30 rounded-2xl border border-blue-100 dark:border-blue-900/50 text-xs text-blue-900 dark:text-blue-200 font-semibold leading-relaxed">
                    {selectedArticle.summary}
                  </div>
                )}
                {selectedArticle.needsImprovement && (
                  <div className="mt-3 p-3.5 bg-amber-50 dark:bg-amber-950/40 rounded-2xl border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 font-medium flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>{isEn ? 'Quality Alert: This article currently has a lower resolution rate (<70%). It may need clearer steps or updated screenshots.' : 'Cảnh báo chất lượng: Bài viết này đang có tỷ lệ tự khắc phục thấp (<70%). Nội dung cần được IT kiểm tra bổ sung bước thực hiện hoặc hình ảnh minh họa mới.'}</span>
                    </div>
                    {canUpdate && (
                      <button
                        type="button"
                        onClick={() => openEditModal(selectedArticle)}
                        className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shrink-0 cursor-pointer shadow-xs"
                      >
                        {isEn ? 'Update Guide' : 'Cập nhật ngay'}
                      </button>
                    )}
                  </div>
                )}

                {/* User Feedback Reasons & Comments (Visible to IT / Admins) */}
                {isITStaff && selectedArticle.reasons && selectedArticle.reasons.length > 0 && (
                  <div className="mt-3 p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                        <span>💬</span>
                        <span>{isEn ? `User Feedback & Issues (${selectedArticle.reasons.length} reports):` : `Lý do người dùng chưa tự sửa được (${selectedArticle.reasons.length} phản hồi):`}</span>
                      </h4>
                      <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-100/80 dark:bg-amber-950/80 px-2 py-0.5 rounded-full border border-amber-300 dark:border-amber-700">
                        {isEn ? 'IT Actionable Points' : 'Điểm cần bổ sung'}
                      </span>
                    </div>

                    {/* Reason Counts Pills */}
                    {selectedArticle.reasonCounts && Object.keys(selectedArticle.reasonCounts).length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {Object.entries(selectedArticle.reasonCounts).map(([code, count]) => {
                          const label =
                            code === 'OUTDATED'
                              ? (isEn ? 'Outdated' : 'Thông tin cũ/sai')
                              : code === 'MISSING_STEPS'
                              ? (isEn ? 'Missing steps' : 'Thiếu bước')
                              : code === 'BROKEN_LINK'
                              ? (isEn ? 'Broken link' : 'Link hỏng')
                              : code === 'HARD_TO_UNDERSTAND'
                              ? (isEn ? 'Hard to follow' : 'Khó hiểu')
                              : (isEn ? 'Other' : 'Khác');
                          return (
                            <span
                              key={code}
                              className="text-[10.5px] font-bold px-2 py-0.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                            >
                              📌 {label}: <strong className="text-rose-600 dark:text-rose-400">{count}</strong>
                            </span>
                          );
                        })}
                      </div>
                    )}

                    {/* Specific User Comments */}
                    <div className="space-y-1.5 max-h-36 overflow-y-auto">
                      {selectedArticle.reasons.map((r) => (
                        <div key={r.id} className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700/80 text-[11px]">
                          <div className="flex items-center justify-between text-slate-400 text-[10px]">
                            <span className="font-bold text-amber-700 dark:text-amber-400">[{r.reasonLabel}]</span>
                            <span>{new Date(r.createdAt).toLocaleDateString(isEn ? 'en-US' : 'vi-VN')}</span>
                          </div>
                          {r.comment && (
                            <p className="text-slate-700 dark:text-slate-200 mt-1 italic leading-relaxed">
                              "{r.comment}"
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Rich Content Render with Lightbox Zoom */}
              <div className="pt-2">
                <KBArticleContent content={selectedArticle.content} />
              </div>

              {/* Attached File */}
              {selectedArticle.fileUrl && (
                <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-4 mt-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center font-bold text-xs">
                      PDF
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                        {selectedArticle.fileName || (isEn ? 'Attached Document' : 'Tài liệu đính kèm')}
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        {isEn ? 'Full operational procedure document' : 'File tài liệu quy trình đầy đủ'}
                      </p>
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

              {/* Self-service Feedback Widget (Like ServiceNow / Zendesk) */}
              <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800">
                <div className="p-5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-4">
                  {feedbackGiven === null && (
                    <>
                      <div className="space-y-0.5 text-center sm:text-left">
                        <h4 className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5 justify-center sm:justify-start">
                          <HelpCircle className="w-4 h-4 text-blue-600" />
                          <span>{isEn ? 'Did this article help you resolve the problem?' : 'Bài viết này có giúp bạn giải quyết được vấn đề không?'}</span>
                        </h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          {isEn ? 'Your feedback helps us continuously improve the Knowledge Base' : 'Ý kiến của bạn giúp chúng tôi hoàn thiện tài liệu hướng dẫn tốt hơn'}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={feedbackSubmitting}
                          onClick={() => handleFeedback(true)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/80 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
                        >
                          <ThumbsUp className="w-3.5 h-3.5" />
                          <span>{isEn ? 'Yes, resolved!' : 'Có, tự sửa được!'}</span>
                        </button>
                        <button
                          type="button"
                          disabled={feedbackSubmitting}
                          onClick={() => setFeedbackGiven('need_reason')}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
                        >
                          <ThumbsDown className="w-3.5 h-3.5" />
                          <span>{isEn ? 'Still need help' : 'Vẫn cần hỗ trợ'}</span>
                        </button>
                      </div>
                    </>
                  )}

                  {feedbackGiven === 'need_reason' && (
                    <div className="w-full space-y-3 animate-in fade-in">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                          <HelpCircle className="w-4 h-4 text-amber-600" />
                          <span>{isEn ? 'Please let IT know what needs improvement:' : 'Bạn có thể cho IT biết vấn đề bạn gặp phải không?'}</span>
                        </h4>
                        <button
                          type="button"
                          onClick={() => {
                            handleFeedback(false);
                            setFeedbackGiven('submitted_reason');
                          }}
                          className="text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                        >
                          {isEn ? 'Skip reason' : 'Bỏ qua lý do'}
                        </button>
                      </div>

                      {/* 4 reason option chips */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {[
                          { key: 'OUTDATED', label: isEn ? 'Information is outdated / not matching' : 'Thông tin đã cũ / không giống thực tế' },
                          { key: 'MISSING_STEPS', label: isEn ? 'Missing steps / incomplete guide' : 'Thiếu bước thực hiện' },
                          { key: 'BROKEN_LINK', label: isEn ? 'Broken download link or files' : 'Không tải được phần mềm / link hỏng' },
                          { key: 'HARD_TO_UNDERSTAND', label: isEn ? 'Hard to understand / follow' : 'Khó hiểu / Không làm theo được' },
                        ].map((item) => (
                          <button
                            key={item.key}
                            type="button"
                            onClick={() => setSelectedReason(item.key)}
                            className={`p-2.5 rounded-xl text-xs font-semibold text-left transition-all border cursor-pointer ${
                              selectedReason === item.key
                                ? 'bg-amber-100 dark:bg-amber-950/70 border-amber-400 text-amber-900 dark:text-amber-200 shadow-2xs font-bold'
                                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                            }`}
                          >
                            <span className="mr-1">{selectedReason === item.key ? '✅' : '⚪'}</span>
                            <span>{item.label}</span>
                          </button>
                        ))}
                      </div>

                      {/* Optional comment input & Submit */}
                      <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
                        <input
                          type="text"
                          value={feedbackComment}
                          onChange={(e) => setFeedbackComment(e.target.value)}
                          placeholder={isEn ? 'Describe specific detail (optional)...' : 'Mô tả chi tiết thêm nếu có (tùy chọn)...'}
                          className="w-full sm:flex-1 px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-slate-100 font-medium"
                        />
                        <button
                          type="button"
                          disabled={feedbackSubmitting}
                          onClick={() => {
                            handleFeedback(false, selectedReason || 'OTHER', feedbackComment);
                          }}
                          className="w-full sm:w-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs whitespace-nowrap disabled:opacity-50"
                        >
                          {feedbackSubmitting ? (isEn ? 'Sending...' : 'Đang gửi...') : (isEn ? 'Submit Feedback' : 'Gửi Góp Ý Cho IT')}
                        </button>
                      </div>
                    </div>
                  )}

                  {feedbackGiven === 'yes' && (
                    <div className="w-full flex items-center gap-3 text-emerald-700 dark:text-emerald-400 text-xs font-bold animate-in fade-in">
                      <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
                      <span>{isEn ? '🎉 Awesome! Thank you for letting us know. Have a productive day!' : '🎉 Tuyệt vời! Cảm ơn phản hồi của bạn. Chúc bạn một ngày làm việc hiệu quả!'}</span>
                    </div>
                  )}

                  {feedbackGiven === 'submitted_reason' && (
                    <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-3 animate-in fade-in">
                      <div className="text-xs text-slate-600 dark:text-slate-300 font-medium text-center sm:text-left space-y-0.5">
                        <p className="font-bold text-amber-600 dark:text-amber-400">
                          {isEn ? '✅ Thank you! Your feedback has been sent to the IT team to improve this guide.' : '✅ Cảm ơn bạn! Đóng góp ý kiến đã được chuyển đến Đội ngũ IT để cải tiến bài viết.'}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {isEn ? 'Still need urgent technical help? Create a support ticket right away.' : 'Nếu bạn vẫn cần xử lý gấp, hãy tạo ticket để kỹ thuật viên hỗ trợ bạn ngay.'}
                        </p>
                      </div>
                      <Link
                        href={`/tickets?create=true&title=${encodeURIComponent((isEn ? 'Support request: ' : 'Yêu cầu hỗ trợ: ') + selectedArticle.title)}&kbArticleId=${encodeURIComponent(selectedArticle.id)}&kbArticleTitle=${encodeURIComponent(selectedArticle.title)}&kbFeedbackReason=${encodeURIComponent(selectedReason ? (FEEDBACK_REASON_MAP[selectedReason]?.[isEn ? 'en' : 'vi'] || selectedReason) : '')}&kbFeedbackComment=${encodeURIComponent(feedbackComment || '')}`}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black bg-blue-600 hover:bg-blue-700 text-white shadow-md transition-colors cursor-pointer shrink-0"
                      >
                        <MessageSquarePlus className="w-4 h-4" />
                        <span>{isEn ? 'Create IT Ticket' : 'Tạo Ticket IT Hỗ Trợ'}</span>
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-3.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-400 bg-slate-50 dark:bg-slate-800/50">
              <span className="flex items-center gap-1.5 font-medium">
                <Eye className="w-3.5 h-3.5 text-slate-400" />
                <span>{selectedArticle.views.toLocaleString()} {isEn ? 'views' : 'lượt xem'}</span>
              </span>
              <button
                onClick={() => setSelectedArticle(null)}
                className="px-5 py-2 bg-blue-600 text-white rounded-xl font-bold cursor-pointer hover:bg-blue-700 transition-colors shadow-xs"
              >
                {isEn ? 'Close' : 'Đóng'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CMS EDITOR MODAL (Supports Full Toolbar, Ctrl+V Paste Image, Drag-and-Drop, Live Preview) */}
      <KBEditorModal
        isOpen={isEditorModalOpen}
        onClose={() => {
          setIsEditorModalOpen(false);
          setEditingArticle(null);
        }}
        initialData={editingArticle}
        onSaveSuccess={handleEditorSaveSuccess}
        isEn={isEn}
      />

      {/* DELETE CONFIRM MODAL */}
      {isDeleteConfirmOpen && deletingArticle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-rose-100 dark:bg-rose-950/50 text-rose-600 rounded-2xl">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  {isEn ? 'Confirm Deletion' : 'Xác Nhận Xóa Bài Viết'}
                </h3>
                <p className="text-xs text-slate-400">
                  {isEn ? 'This action will remove the article from KB' : 'Thao tác này sẽ xóa bài viết khỏi cơ sở tri thức'}
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl text-xs text-slate-700 dark:text-slate-300 font-medium">
              <p className="font-bold text-slate-900 dark:text-white line-clamp-2">
                {deletingArticle.title}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                {isEn
                  ? 'The article will be moved to Recycle Bin or hidden from suggestions.'
                  : 'Bài viết sẽ được đưa vào Thùng rác hoặc ẩn khỏi hệ thống hướng dẫn & gợi ý tự động.'}
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={deleteSubmitting}
                onClick={() => {
                  setIsDeleteConfirmOpen(false);
                  setDeletingArticle(null);
                }}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                {isEn ? 'Cancel' : 'Hủy'}
              </button>
              <button
                type="button"
                disabled={deleteSubmitting}
                onClick={handleDeleteArticle}
                className="px-5 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {deleteSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                <span>{deleteSubmitting ? (isEn ? 'Deleting...' : 'Đang xóa...') : (isEn ? 'Delete Article' : 'Xóa Bài Viết')}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
