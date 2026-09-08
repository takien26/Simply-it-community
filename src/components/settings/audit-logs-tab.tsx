'use client';

import { useLanguage } from '@/lib/i18n/context';

import React, { useState, useEffect, useCallback } from 'react';
import {
  History,
  Search,
  Filter,
  Calendar,
  Download,
  RefreshCw,
  User,
  Shield,
  Layers,
  ChevronLeft,
  ChevronRight,
  Eye,
  X,
  FileText,
  Clock,
  Laptop,
  Key,
  Globe,
  Tag,
  CheckCircle2,
  AlertTriangle,
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

const ACTION_BADGES: Record<string, { label: string; bg: string; text: string; border: string }> = {
  CREATE: { label: '➕ Tạo Mới', bg: 'bg-emerald-50 dark:bg-emerald-950/40', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-200 dark:border-emerald-800' },
  UPDATE: { label: '✏️ Cập Nhật', bg: 'bg-blue-50 dark:bg-blue-950/40', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-200 dark:border-blue-800' },
  DELETE: { label: '🗑️ Xóa Bỏ', bg: 'bg-rose-50 dark:bg-rose-950/40', text: 'text-rose-700 dark:text-rose-300', border: 'border-rose-200 dark:border-rose-800' },
  ASSIGN: { label: '🤝 Gán Cấp Phát', bg: 'bg-purple-50 dark:bg-purple-950/40', text: 'text-purple-700 dark:text-purple-300', border: 'border-purple-200 dark:border-purple-800' },
  REVOKE: { label: '↩️ Thu Hồi', bg: 'bg-amber-50 dark:bg-amber-950/40', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-200 dark:border-amber-800' },
  LOGIN: { label: '🔑 Đăng Nhập', bg: 'bg-indigo-50 dark:bg-indigo-950/40', text: 'text-indigo-700 dark:text-indigo-300', border: 'border-indigo-200 dark:border-indigo-800' },
  IMPORT: { label: '📥 Import Dữ Liệu', bg: 'bg-teal-50 dark:bg-teal-950/40', text: 'text-teal-700 dark:text-teal-300', border: 'border-teal-200 dark:border-teal-800' },
  AI_EXTRACT: { label: '✨ Trích Xuất AI', bg: 'bg-violet-50 dark:bg-violet-950/40', text: 'text-violet-700 dark:text-violet-300', border: 'border-violet-200 dark:border-violet-800' },
};

export const AuditLogsSettingsTab: React.FC = () => {
  const { language } = useLanguage();
  const isEn = language === 'en';
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [entityFilter, setEntityFilter] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalLogs, setTotalLogs] = useState(0);
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);

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
      params.append('limit', '40');

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
  }, [search, actionFilter, entityFilter, startDate, endDate, page]);

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

  const handleExportCSV = () => {
    if (logs.length === 0) return;
    const headers = isEn ? ['Timestamp', 'Actor', 'Email', 'Action', 'Module', 'Target ID', 'IP Address', 'Changes Detail'] : ['Thời gian', 'Người thực hiện', 'Email', 'Hành động', 'Phân hệ', 'ID Đối tượng', 'Địa chỉ IP', 'Chi tiết thay đổi'];
    const rows = logs.map((l) => [
      `"${new Date(l.createdAt).toLocaleString('vi-VN')}"`,
      `"${l.user?.fullName || (isEn ? 'System' : 'Hệ thống')}"`,
      `"${l.user?.email || ''}"`,
      `"${l.action}"`,
      `"${l.entityType}"`,
      `"${l.entityId}"`,
      `"${l.ipAddress || ''}"`,
      `"${JSON.stringify(l.changes || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = '﻿' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Nhat_Ky_Hoat_Dong_SIMPLY_IT_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  return (
    <div className="space-y-4">
      {/* Top Filter Bar */}
      <div className="p-4 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
          <div>
            <h3 className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <History className="w-4 h-4 text-purple-600" />
              <span>{isEn ? 'System Audit Trail & Activity Logs' : 'Nhật Ký Hoạt Động & Biến Động Hệ Thống (Audit Logs)'}</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {isEn ? `Detailed audit trail of creation, updates, deletions, assignments and security changes by admins and users (${totalLogs} records)` : `Theo dõi chi tiết các thao tác Thêm, Sửa, Xóa, Bàn giao, Reset bảo mật của quản trị viên và người dùng (${totalLogs} bản ghi)`}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleExportCSV}
              className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isEn ? 'Export CSV' : 'Xuất CSV'}</span>
            </button>

            <button
              type="button"
              onClick={() => fetchLogs()}
              className="p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl cursor-pointer transition-colors"
              title={isEn ? 'Reload audit logs' : 'Tải lại nhật ký'}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
          {/* 1. Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder={isEn ? 'Search by actor name, email, target ID...' : 'Tìm theo tên người thực hiện, email, ID...'}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-8 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs outline-none focus:ring-2 focus:ring-purple-500 font-medium"
            />
          </div>

          {/* 2. Action Filter */}
          <div>
            <select
              value={actionFilter}
              onChange={(e) => {
                setActionFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs outline-none focus:ring-2 focus:ring-purple-500 font-semibold text-slate-700 dark:text-slate-200 cursor-pointer"
            >
              <option value="ALL">{isEn ? '⚡ All Actions' : '⚡ Tất cả hành động'}</option>
              <option value="CREATE">{isEn ? '➕ CREATE - Create New' : '➕ CREATE - Tạo mới'}</option>
              <option value="UPDATE">{isEn ? '✏️ UPDATE - Update' : '✏️ UPDATE - Cập nhật / Sửa'}</option>
              <option value="DELETE">{isEn ? '🗑️ DELETE - Delete' : '🗑️ Xóa bỏ'}</option>
              <option value="ASSIGN">{isEn ? '🤝 ASSIGN - Assignment' : '🤝 ASSIGN - Gán cấp phát'}</option>
              <option value="REVOKE">{isEn ? '↩️ REVOKE - Revoke' : '↩️ REVOKE - Thu hồi'}</option>
              <option value="LOGIN">{isEn ? '🔑 LOGIN - User Login' : '🔑 LOGIN - Đăng nhập'}</option>
              <option value="IMPORT">{isEn ? '📥 IMPORT - Import' : '📥 IMPORT - Nhập dữ liệu'}</option>
              <option value="AI_EXTRACT">{isEn ? '✨ AI_EXTRACT - AI Extraction' : '✨ AI_EXTRACT - Trích xuất AI'}</option>
            </select>
          </div>

          {/* 3. Entity Type Filter */}
          <div>
            <select
              value={entityFilter}
              onChange={(e) => {
                setEntityFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs outline-none focus:ring-2 focus:ring-purple-500 font-semibold text-slate-700 dark:text-slate-200 cursor-pointer"
            >
              <option value="ALL">{isEn ? '📦 All Modules' : '📦 Tất cả phân hệ'}</option>
              <option value="User">👤 Người dùng / Tài khoản</option>
              <option value="Asset">💻 Thiết bị / Tài sản</option>
              <option value="License">🔑 Bản quyền / License</option>
              <option value="ITService">☁️ Dịch vụ IT / Thuê bao</option>
              <option value="Ticket">🎫 Ticket / Yêu cầu hỗ trợ</option>
              <option value="PasswordEntry">🔐 Mật khẩu / Credentials</option>
              <option value="Document">📄 Hồ sơ / Hóa đơn / HĐ</option>
              <option value="Project">📁 Gói mua sắm / Dự án</option>
              <option value="Vendor">🤝 Nhà cung cấp / Đối tác</option>
            </select>
          </div>

          {/* 4. Date Filter Presets */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => handleDatePreset('TODAY')}
              className={`px-2 py-1.5 rounded-xl text-[10.5px] font-bold border transition-colors cursor-pointer ${
                startDate === endDate && startDate === new Date().toISOString().split('T')[0]
                  ? 'bg-purple-600 text-white border-purple-600'
                  : 'bg-slate-50 dark:bg-slate-800 border-slate-200 text-slate-600'
              }`}
            >
              Hôm nay
            </button>
            <button
              type="button"
              onClick={() => handleDatePreset('7DAYS')}
              className="px-2 py-1.5 rounded-xl text-[10.5px] font-bold border bg-slate-50 dark:bg-slate-800 border-slate-200 text-slate-600 hover:bg-slate-100 cursor-pointer"
            >
              7 ngày
            </button>
            <button
              type="button"
              onClick={() => handleDatePreset('30DAYS')}
              className="px-2 py-1.5 rounded-xl text-[10.5px] font-bold border bg-slate-50 dark:bg-slate-800 border-slate-200 text-slate-600 hover:bg-slate-100 cursor-pointer"
            >
              30 ngày
            </button>
            <button
              type="button"
              onClick={() => handleDatePreset('ALL')}
              className="px-2 py-1.5 rounded-xl text-[10.5px] font-bold border bg-slate-50 dark:bg-slate-800 border-slate-200 text-slate-600 hover:bg-slate-100 cursor-pointer"
            >{isEn ? 'All' : 'Tất cả'}</button>
          </div>
        </div>

        {/* Custom Date Inputs */}
        <div className="flex items-center gap-2 pt-1 text-xs text-slate-500">
          <Calendar className="w-3.5 h-3.5 text-purple-600" />
          <span className="font-bold text-slate-700 dark:text-slate-300">{isEn ? 'Custom filter:' : 'Lọc tùy chọn:'}</span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              setPage(1);
            }}
            className="px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none"
          />
          <span>→</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => {
              setEndDate(e.target.value);
              setPage(1);
            }}
            className="px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none"
          />
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto max-h-[calc(100vh-360px)] scrollbar-thin">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[11px] font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="py-3 px-4">{isEn ? 'Time' : 'Thời gian'}</th>
                <th className="py-3 px-4">{isEn ? 'Performed By' : 'Người thực hiện'}</th>
                <th className="py-3 px-4 text-center">{isEn ? 'Action' : 'Hành động'}</th>
                <th className="py-3 px-4">{isEn ? 'Module / Entity' : 'Phân hệ / Đối tượng'}</th>
                <th className="py-3 px-4">{isEn ? 'Content / Changes' : 'Nội dung / Thay đổi'}</th>
                <th className="py-3 px-4 text-right">{isEn ? 'Details' : 'Chi tiết'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-purple-600 mb-2" />
                    <span>Đang tải danh sách nhật ký hoạt động...</span>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <History className="w-8 h-8 mx-auto text-slate-300 mb-1.5" />
                    <p className="font-bold text-xs text-slate-600">Không tìm thấy bản ghi nhật ký nào</p>
                    <p className="text-[11px]">Thử điều chỉnh lại bộ lọc thời gian hoặc từ khóa tìm kiếm.</p>
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const badge = ACTION_BADGES[log.action] || {
                    label: log.action,
                    bg: 'bg-slate-100',
                    text: 'text-slate-700',
                    border: 'border-slate-200',
                  };

                  return (
                    <tr
                      key={log.id}
                      onClick={() => setSelectedLog(log)}
                      className="hover:bg-purple-50/40 dark:hover:bg-purple-950/20 transition-colors cursor-pointer"
                    >
                      {/* Thời gian */}
                      <td className="py-3 px-4 font-mono text-[11px] whitespace-nowrap text-slate-600 dark:text-slate-400">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3 h-3 text-purple-600" />
                          <span>{new Date(log.createdAt).toLocaleString(isEn ? 'en-US' : 'vi-VN')}</span>
                        </div>
                      </td>

                      {/* Người thực hiện */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                            {log.user?.fullName ? log.user.fullName.charAt(0) : 'S'}
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 dark:text-white block text-xs truncate max-w-[140px]">
                              {log.user?.fullName || 'Hệ Thống'}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono block truncate max-w-[140px]">
                              {log.user?.email || 'System Bot'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* {isEn ? 'Action' : 'Hành động'} */}
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10.5px] font-extrabold border ${badge.bg} ${badge.text} ${badge.border}`}>
                          {badge.label}
                        </span>
                      </td>

                      {/* {isEn ? 'Module' : 'Phân hệ'} / Đối tượng */}
                      <td className="py-3 px-4">
                        <div>
                          <span className="font-bold text-slate-800 dark:text-slate-200 block text-xs">
                            {log.entityType}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono block truncate max-w-[150px]">
                            ID: {log.entityId}
                          </span>
                        </div>
                      </td>

                      {/* Nội dung tóm tắt */}
                      <td className="py-3 px-4 max-w-[280px]">
                        <div className="truncate text-xs font-mono text-slate-600 dark:text-slate-400">
                          {log.changes?.message ? (
                            <span className="font-sans font-semibold text-purple-700 dark:text-purple-300">
                              {log.changes.message}
                            </span>
                          ) : (
                            JSON.stringify(log.changes || {}).substring(0, 100)
                          )}
                        </div>
                      </td>

                      {/* Nút Xem chi tiết */}
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedLog(log);
                          }}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-purple-100 text-purple-700 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                        >{isEn ? 'Details' : 'Chi tiết'}</button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-3 bg-slate-50 dark:bg-slate-850 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
          <div>
            Trang <strong>{page}</strong> / <strong>{totalPages}</strong> (Tổng <strong>{totalLogs}</strong> bản ghi)
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="p-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl disabled:opacity-40 hover:bg-slate-100 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="p-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl disabled:opacity-40 hover:bg-slate-100 cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* MODAL: DETAIL AUDIT LOG */}
      {selectedLog && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-3xl w-full border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 bg-gradient-to-r from-purple-700 to-indigo-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-white/20 flex items-center justify-center">
                  <History className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm">Chi Tiết Bản Ghi Nhật Ký (Audit Log)</h3>
                  <p className="text-[11px] text-purple-200 font-mono">ID: {selectedLog.id}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="text-white/80 hover:text-white p-1 rounded-xl hover:bg-white/10 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700">
                <div>
                  <span className="text-slate-400 block font-bold text-[10.5px]">Người thực hiện:</span>
                  <span className="font-bold text-slate-900 dark:text-white text-sm">
                    {selectedLog.user?.fullName || (isEn ? 'System' : 'Hệ thống')} ({selectedLog.user?.email || 'System'})
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block font-bold text-[10.5px]">Thời gian ghi nhận:</span>
                  <span className="font-bold font-mono text-purple-700 dark:text-purple-300">
                    {new Date(selectedLog.createdAt).toLocaleString('vi-VN')}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block font-bold text-[10.5px]">{isEn ? 'Action' : 'Hành động'}:</span>
                  <span className="font-extrabold text-indigo-700 dark:text-indigo-300 font-mono">
                    {selectedLog.action}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block font-bold text-[10.5px]">{isEn ? 'Module' : 'Phân hệ'} / Đối tượng:</span>
                  <span className="font-bold text-slate-900 dark:text-white font-mono">
                    {selectedLog.entityType} ({selectedLog.entityId})
                  </span>
                </div>
              </div>

              {/* JSON Changes Viewer */}
              <div>
                <span className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-purple-600" />
                  <span>Dữ liệu biến động & Chi tiết thay đổi (JSON Diff):</span>
                </span>
                <pre className="p-4 bg-slate-900 text-purple-300 rounded-2xl font-mono text-xs overflow-x-auto max-h-72 border border-slate-800 scrollbar-thin">
                  {JSON.stringify(selectedLog.changes || {}, null, 2)}
                </pre>
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl font-bold text-xs shadow-sm cursor-pointer"
              >{isEn ? 'Close' : 'Đóng'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};