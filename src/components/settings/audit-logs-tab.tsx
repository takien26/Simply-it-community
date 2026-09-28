'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '@/lib/i18n/context';
import { TablePaginationBar } from '@/components/common/TablePaginationBar';
import {
  History,
  Search,
  Filter,
  Calendar,
  Download,
  RefreshCw,
  Clock,
  Eye,
  X,
  FileText,
} from 'lucide-react';

interface AuditLogItem {
  id: string;
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  changes: any;
  ipAddress: string | null;
  createdAt: string;
  user?: {
    id: string;
    fullName: string;
    email: string;
    department: string | null;
    avatarUrl: string | null;
  };
}

export const AuditLogsSettingsTab: React.FC = () => {
  const { language, t, isEn } = useLanguage();
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [entityFilter, setEntityFilter] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(25);
  const [totalPages, setTotalPages] = useState(1);
  const [totalLogs, setTotalLogs] = useState(0);
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'CREATE':
        return {
          label: t('settings.audit.action_create', '➕ Tạo Mới'),
          bg: 'bg-emerald-50 dark:bg-emerald-950/40',
          text: 'text-emerald-700 dark:text-emerald-300',
          border: 'border-emerald-200 dark:border-emerald-800',
        };
      case 'UPDATE':
        return {
          label: t('settings.audit.action_update', '✏️ Cập Nhật'),
          bg: 'bg-blue-50 dark:bg-blue-950/40',
          text: 'text-blue-700 dark:text-blue-300',
          border: 'border-blue-200 dark:border-blue-800',
        };
      case 'DELETE':
        return {
          label: t('settings.audit.action_delete', '🗑️ Xóa Bỏ'),
          bg: 'bg-rose-50 dark:bg-rose-950/40',
          text: 'text-rose-700 dark:text-rose-300',
          border: 'border-rose-200 dark:border-rose-800',
        };
      case 'ASSIGN':
        return {
          label: t('settings.audit.action_assign', '🤝 Gán Cấp Phát'),
          bg: 'bg-purple-50 dark:bg-purple-950/40',
          text: 'text-purple-700 dark:text-purple-300',
          border: 'border-purple-200 dark:border-purple-800',
        };
      case 'REVOKE':
        return {
          label: t('settings.audit.action_revoke', '↩️ Thu Hồi'),
          bg: 'bg-amber-50 dark:bg-amber-950/40',
          text: 'text-amber-700 dark:text-amber-300',
          border: 'border-amber-200 dark:border-amber-800',
        };
      case 'LOGIN':
        return {
          label: t('settings.audit.action_login', '🔑 Đăng Nhập'),
          bg: 'bg-indigo-50 dark:bg-indigo-950/40',
          text: 'text-indigo-700 dark:text-indigo-300',
          border: 'border-indigo-200 dark:border-indigo-800',
        };
      case 'IMPORT':
        return {
          label: t('settings.audit.action_import', '📥 Import Dữ Liệu'),
          bg: 'bg-teal-50 dark:bg-teal-950/40',
          text: 'text-teal-700 dark:text-teal-300',
          border: 'border-teal-200 dark:border-teal-800',
        };
      case 'AI_EXTRACT':
        return {
          label: t('settings.audit.action_ai_extract', '✨ Trích Xuất AI'),
          bg: 'bg-violet-50 dark:bg-violet-950/40',
          text: 'text-violet-700 dark:text-violet-300',
          border: 'border-violet-200 dark:border-violet-800',
        };
      default:
        return {
          label: action,
          bg: 'bg-slate-50 dark:bg-slate-800',
          text: 'text-slate-700 dark:text-slate-300',
          border: 'border-slate-200 dark:border-slate-700',
        };
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('simply_it_audit_logs_page_size');
      const n = Number(saved);
      if ([15, 25, 50, 100].includes(n)) setPageSize(n);
    }
  }, []);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (actionFilter !== 'ALL') params.append('action', actionFilter);
      if (entityFilter !== 'ALL') params.append('entityType', entityFilter);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      params.append('page', String(page));
      params.append('limit', String(pageSize));

      const res = await fetch(`/api/system/audit-logs?${params.toString()}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setLogs(data.data || []);
        setTotalPages(data.pagination?.totalPages || 1);
        setTotalLogs(data.pagination?.total || 0);
      }
    } catch (err) {
      console.error('Fetch audit logs error:', err);
    } finally {
      setLoading(false);
    }
  }, [search, actionFilter, entityFilter, startDate, endDate, page, pageSize]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Preset Date Ranges
  const handleDatePreset = (preset: 'TODAY' | '7DAYS' | '30DAYS' | 'ALL') => {
    const now = new Date();
    const nowStr = now.toISOString().split('T')[0];

    if (preset === 'TODAY') {
      setStartDate(nowStr);
      setEndDate(nowStr);
    } else if (preset === '7DAYS') {
      const past = new Date();
      past.setDate(past.getDate() - 7);
      setStartDate(past.toISOString().split('T')[0]);
      setEndDate(nowStr);
    } else if (preset === '30DAYS') {
      const past = new Date();
      past.setDate(past.getDate() - 30);
      setStartDate(past.toISOString().split('T')[0]);
      setEndDate(nowStr);
    } else {
      setStartDate('');
      setEndDate('');
    }
    setPage(1);
  };

  const locale = isEn ? 'en-US' : language === 'ja' ? 'ja-JP' : 'vi-VN';

  const handleExportCSV = () => {
    if (logs.length === 0) return;
    const headers = [
      t('settings.audit.col_time', 'Thời gian'),
      t('settings.audit.col_performed_by', 'Người thực hiện'),
      'Email',
      t('settings.audit.col_action', 'Hành động'),
      t('settings.audit.col_module', 'Phân hệ'),
      'ID Target',
      'IP Address',
      t('settings.audit.col_content', 'Chi tiết thay đổi'),
    ];
    const rows = logs.map((l) => [
      `"${new Date(l.createdAt).toLocaleString(locale)}"`,
      `"${l.user?.fullName || t('settings.audit.system_actor', 'Hệ thống')}"`,
      `"${l.user?.email || ''}"`,
      `"${l.action}"`,
      `"${l.entityType}"`,
      `"${l.entityId}"`,
      `"${l.ipAddress || ''}"`,
      `"${JSON.stringify(l.changes || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Audit_Logs_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  return (
    <div className="space-y-3">
      {/* Top Filter Bar (Compact & Space-Optimized) */}
      <div className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-2.5">
        {/* Row 1: Title, Record Count & Quick Date Presets + Export */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
              <History className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-xs sm:text-sm text-slate-900 dark:text-white leading-tight">
                  {t('settings.audit.title', 'Nhật Ký Hoạt Động & Biến Động Hệ Thống')}
                </h3>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300 border border-purple-200/60 dark:border-purple-800">
                  {totalLogs.toLocaleString()} {t('settings.audit.item_name', 'bản ghi')}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Quick Date Presets */}
            <div className="flex items-center bg-slate-100/80 dark:bg-slate-800/80 p-0.5 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
              <button
                type="button"
                onClick={() => handleDatePreset('TODAY')}
                className={`px-2 py-1 rounded-lg text-[10.5px] font-bold transition-all cursor-pointer ${
                  startDate === endDate && startDate === new Date().toISOString().split('T')[0]
                    ? 'bg-purple-600 text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {t('settings.audit.date_today', 'Hôm nay')}
              </button>
              <button
                type="button"
                onClick={() => handleDatePreset('7DAYS')}
                className="px-2 py-1 rounded-lg text-[10.5px] font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer"
              >
                {t('settings.audit.date_7days', '7 ngày')}
              </button>
              <button
                type="button"
                onClick={() => handleDatePreset('30DAYS')}
                className="px-2 py-1 rounded-lg text-[10.5px] font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer"
              >
                {t('settings.audit.date_30days', '30 ngày')}
              </button>
              <button
                type="button"
                onClick={() => handleDatePreset('ALL')}
                className={`px-2 py-1 rounded-lg text-[10.5px] font-bold transition-all cursor-pointer ${
                  !startDate && !endDate
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs font-extrabold'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {t('settings.audit.date_all', 'Tất cả')}
              </button>
            </div>

            <button
              type="button"
              onClick={handleExportCSV}
              className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{t('settings.audit.export_csv', 'Xuất CSV')}</span>
            </button>

            <button
              type="button"
              onClick={() => fetchLogs()}
              className="p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl cursor-pointer transition-colors"
              title={t('settings.audit.reload', 'Tải lại nhật ký')}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-purple-600' : ''}`} />
            </button>
          </div>
        </div>

        {/* Row 2: Filter Controls Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 items-center">
          {/* 1. Search Box */}
          <div className="relative sm:col-span-2 lg:col-span-4">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder={t('settings.audit.search_placeholder', 'Tìm theo tên người thực hiện, email, ID...')}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-purple-500 font-medium"
            />
          </div>

          {/* 2. Action Filter */}
          <div className="lg:col-span-3">
            <select
              value={actionFilter}
              onChange={(e) => {
                setActionFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-purple-500 font-semibold text-slate-700 dark:text-slate-200 cursor-pointer"
            >
              <option value="ALL">{t('settings.audit.all_actions', '⚡ Tất cả hành động')}</option>
              <option value="CREATE">{t('settings.audit.action_create', '➕ CREATE - Tạo mới')}</option>
              <option value="UPDATE">{t('settings.audit.action_update', '✏️ UPDATE - Cập nhật')}</option>
              <option value="DELETE">{t('settings.audit.action_delete', '🗑️ DELETE - Xóa bỏ')}</option>
              <option value="ASSIGN">{t('settings.audit.action_assign', '🤝 ASSIGN - Gán cấp phát')}</option>
              <option value="REVOKE">{t('settings.audit.action_revoke', '↩️ REVOKE - Thu hồi')}</option>
              <option value="LOGIN">{t('settings.audit.action_login', '🔑 LOGIN - Đăng nhập')}</option>
              <option value="IMPORT">{t('settings.audit.action_import', '📥 IMPORT - Nhập dữ liệu')}</option>
              <option value="AI_EXTRACT">{t('settings.audit.action_ai_extract', '✨ AI_EXTRACT - Trích xuất AI')}</option>
            </select>
          </div>

          {/* 3. Entity Type Filter */}
          <div className="lg:col-span-3">
            <select
              value={entityFilter}
              onChange={(e) => {
                setEntityFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-purple-500 font-semibold text-slate-700 dark:text-slate-200 cursor-pointer"
            >
              <option value="ALL">{t('settings.audit.all_modules', '📦 Tất cả phân hệ')}</option>
              <option value="User">{t('settings.audit.module_user', '👤 Người dùng / Tài khoản')}</option>
              <option value="Asset">{t('settings.audit.module_asset', '💻 Thiết bị / Tài sản')}</option>
              <option value="License">{t('settings.audit.module_license', '🔑 Bản quyền / License')}</option>
              <option value="ITService">{t('settings.audit.module_service', '☁️ Dịch vụ IT / Thuê bao')}</option>
              <option value="Ticket">{t('settings.audit.module_ticket', '🎫 Ticket / Yêu cầu hỗ trợ')}</option>
              <option value="PasswordEntry">{t('settings.audit.module_password', '🔐 Mật khẩu / Credentials')}</option>
              <option value="Document">{t('settings.audit.module_document', '📄 Hồ sơ / Hóa đơn / HĐ')}</option>
              <option value="Project">{t('settings.audit.module_project', '📁 Gói mua sắm / Dự án')}</option>
              <option value="Vendor">{t('settings.audit.module_vendor', '🤝 Nhà cung cấp / Đối tác')}</option>
            </select>
          </div>

          {/* 4. Custom Date Range Pickers (Compact) */}
          <div className="lg:col-span-2 flex items-center gap-1 text-[11px] text-slate-500">
            <input
              type="date"
              value={startDate}
              aria-label="Start Date"
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
              }}
              className="w-full px-1.5 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[11px] outline-none font-mono"
            />
            <span>-</span>
            <input
              type="date"
              value={endDate}
              aria-label="End Date"
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1);
              }}
              className="w-full px-1.5 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[11px] outline-none font-mono"
            />
          </div>
        </div>
      </div>

      {/* Logs Table (Dense, Compact, Multi-row Visible) */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto max-h-[calc(100vh-280px)] scrollbar-thin">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 z-10 bg-slate-100/90 dark:bg-slate-800/90 backdrop-blur-xs text-slate-600 dark:text-slate-300 text-[11px] font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="py-2 px-3 whitespace-nowrap">{t('settings.audit.col_time', 'Thời gian')}</th>
                <th className="py-2 px-3 whitespace-nowrap">{t('settings.audit.col_performed_by', 'Người thực hiện')}</th>
                <th className="py-2 px-2 text-center whitespace-nowrap">{t('settings.audit.col_action', 'Hành động')}</th>
                <th className="py-2 px-3 whitespace-nowrap">{t('settings.audit.col_module', 'Phân hệ / Đối tượng')}</th>
                <th className="py-2 px-3">{t('settings.audit.col_content', 'Nội dung / Thay đổi')}</th>
                <th className="py-2 px-3 text-right whitespace-nowrap">{t('settings.audit.col_details', 'Chi tiết')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto text-purple-600 mb-2" />
                    <span className="text-xs">{t('settings.audit.loading', 'Đang tải danh sách nhật ký hoạt động...')}</span>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <History className="w-7 h-7 mx-auto text-slate-300 mb-1.5" />
                    <p className="font-bold text-xs text-slate-600 dark:text-slate-300">
                      {t('settings.audit.empty_title', 'Không tìm thấy bản ghi nhật ký nào')}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {t('settings.audit.empty_desc', 'Thử điều chỉnh lại bộ lọc thời gian hoặc từ khóa tìm kiếm.')}
                    </p>
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const badge = getActionBadge(log.action);

                  return (
                    <tr
                      key={log.id}
                      onClick={() => setSelectedLog(log)}
                      className="hover:bg-purple-50/40 dark:hover:bg-purple-950/20 transition-colors cursor-pointer group"
                    >
                      {/* Thời gian (Compact font-mono) */}
                      <td className="py-2 px-3 font-mono text-[11px] whitespace-nowrap text-slate-600 dark:text-slate-400">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3 h-3 text-purple-500 shrink-0" />
                          <span>{new Date(log.createdAt).toLocaleString(locale)}</span>
                        </div>
                      </td>

                      {/* Người thực hiện (Compact Avatar + Name + Email) */}
                      <td className="py-2 px-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded-md bg-purple-600 text-white flex items-center justify-center font-bold text-[10px] shrink-0">
                            {log.user?.fullName ? log.user.fullName.charAt(0).toUpperCase() : 'S'}
                          </div>
                          <div className="min-w-0">
                            <span className="font-semibold text-slate-900 dark:text-white block text-xs truncate max-w-[130px] leading-tight">
                              {log.user?.fullName || t('settings.audit.system_actor', 'Hệ Thống')}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono block truncate max-w-[130px] leading-tight">
                              {log.user?.email || t('settings.audit.system_bot', 'System Bot')}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Action Badge (Compact) */}
                      <td className="py-2 px-2 text-center whitespace-nowrap">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${badge.bg} ${badge.text} ${badge.border}`}>
                          {badge.label}
                        </span>
                      </td>

                      {/* Module / Đối tượng */}
                      <td className="py-2 px-3 whitespace-nowrap">
                        <div>
                          <span className="font-semibold text-slate-800 dark:text-slate-200 block text-xs leading-tight">
                            {log.entityType}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono block truncate max-w-[130px] leading-tight">
                            ID: {log.entityId}
                          </span>
                        </div>
                      </td>

                      {/* Nội dung tóm tắt */}
                      <td className="py-2 px-3 max-w-[280px]">
                        <div className="truncate text-[11px] font-mono text-slate-600 dark:text-slate-400">
                          {log.changes?.message ? (
                            <span className="font-sans font-medium text-purple-700 dark:text-purple-300">
                              {log.changes.message}
                            </span>
                          ) : (
                            JSON.stringify(log.changes || {}).substring(0, 100)
                          )}
                        </div>
                      </td>

                      {/* Nút Xem chi tiết */}
                      <td className="py-2 px-3 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedLog(log);
                          }}
                          className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 hover:bg-purple-100 dark:hover:bg-purple-900/40 text-purple-700 dark:text-purple-300 rounded-md text-[11px] font-bold transition-colors cursor-pointer"
                        >
                          {t('settings.audit.col_details', 'Chi tiết')}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <TablePaginationBar
          currentPage={page}
          totalPages={totalPages}
          totalCount={totalLogs}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          storageKey="simply_it_audit_logs_page_size"
          itemName={t('settings.audit.item_name', 'bản ghi nhật ký')}
        />
      </div>

      {/* MODAL: DETAIL AUDIT LOG */}
      {selectedLog && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-3xl w-full border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 bg-gradient-to-r from-purple-700 to-indigo-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                  <History className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm">
                    {t('settings.audit.modal_title', 'Chi Tiết Bản Ghi Nhật Ký (Audit Log)')}
                  </h3>
                  <p className="text-[11px] text-purple-200 font-mono">ID: {selectedLog.id}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                aria-label={t('settings.audit.modal_close', 'Đóng')}
                className="text-white/80 hover:text-white p-1 rounded-xl hover:bg-white/10 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700">
                <div>
                  <span className="text-slate-400 block font-bold text-[10.5px]">
                    {t('settings.audit.modal_actor', 'Người thực hiện:')}
                  </span>
                  <span className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">
                    {selectedLog.user?.fullName || t('settings.audit.system_actor', 'Hệ thống')} ({selectedLog.user?.email || 'System'})
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block font-bold text-[10.5px]">
                    {t('settings.audit.modal_time', 'Thời gian ghi nhận:')}
                  </span>
                  <span className="font-bold font-mono text-purple-700 dark:text-purple-300">
                    {new Date(selectedLog.createdAt).toLocaleString(locale)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block font-bold text-[10.5px]">
                    {t('settings.audit.modal_action', 'Hành động:')}
                  </span>
                  <span className="font-extrabold text-indigo-700 dark:text-indigo-300 font-mono">
                    {selectedLog.action}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block font-bold text-[10.5px]">
                    {t('settings.audit.modal_target', 'Phân hệ / Đối tượng:')}
                  </span>
                  <span className="font-bold text-slate-900 dark:text-white font-mono">
                    {selectedLog.entityType} ({selectedLog.entityId})
                  </span>
                </div>
              </div>

              {/* JSON Changes Viewer */}
              <div>
                <span className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-purple-600" />
                  <span>{t('settings.audit.modal_diff', 'Dữ liệu biến động & Chi tiết thay đổi (JSON Diff):')}</span>
                </span>
                <pre className="p-3 bg-slate-900 text-purple-300 rounded-xl font-mono text-xs overflow-x-auto max-h-72 border border-slate-800 scrollbar-thin">
                  {JSON.stringify(selectedLog.changes || {}, null, 2)}
                </pre>
              </div>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold text-xs shadow-sm cursor-pointer"
              >
                {t('settings.audit.modal_close', 'Đóng')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};