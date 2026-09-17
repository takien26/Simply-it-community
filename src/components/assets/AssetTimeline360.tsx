'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Calendar,
  Clock,
  User,
  Users,
  Wrench,
  Cpu,
  Key,
  AlertTriangle,
  CheckCircle2,
  FileText,
  DollarSign,
  Search,
  Filter,
  ArrowUpDown,
  ShoppingBag,
  RotateCcw,
  Tag,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  ShieldAlert,
  HelpCircle,
  Building,
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { formatPrice } from './types';

export interface AssetTimeline360Props {
  assetId: string;
  asset?: any;
  onOpenTicket?: (ticketId: string) => void;
  onOpenUser?: (userId: string) => void;
}

export const AssetTimeline360: React.FC<AssetTimeline360Props> = ({
  assetId,
  asset: propAsset,
  onOpenTicket,
  onOpenUser,
}) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [expandedEventIds, setExpandedEventIds] = useState<Set<string>>(new Set());

  const fetchTimeline = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/assets/${assetId}/timeline`);
      const json = await res.json();
      if (res.ok && json.data) {
        setData(json.data);
      }
    } catch (err) {
      console.error('Failed to load asset timeline 360:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (assetId) {
      fetchTimeline();
    }
  }, [assetId]);

  const toggleExpand = (id: string) => {
    const next = new Set(expandedEventIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedEventIds(next);
  };

  if (loading) {
    return (
      <div className="py-16 flex flex-col items-center justify-center space-y-3 text-slate-500">
        <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-semibold">Đang tổng hợp vòng đời 360° của tài sản...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="py-12 text-center text-slate-400 space-y-2">
        <AlertTriangle className="w-8 h-8 mx-auto text-amber-500" />
        <p className="text-xs font-medium">Không thể tải dữ liệu vòng đời cho thiết bị này.</p>
        <button
          onClick={fetchTimeline}
          className="text-xs text-indigo-600 hover:underline font-bold"
        >
          Thử lại
        </button>
      </div>
    );
  }

  const { asset, kpis, events } = data;

  // Lọc theo danh mục
  const filteredEvents = events.filter((ev: any) => {
    if (selectedFilter !== 'ALL') {
      if (selectedFilter === 'ASSIGNMENT' && !['ASSIGNMENT', 'RETURN'].includes(ev.type)) return false;
      if (selectedFilter === 'TICKET' && ev.type !== 'TICKET') return false;
      if (selectedFilter === 'SPARE_PART' && ev.type !== 'SPARE_PART') return false;
      if (selectedFilter === 'MAINTENANCE' && ev.type !== 'MAINTENANCE') return false;
      if (selectedFilter === 'LICENSE' && !['LICENSE_ASSIGN', 'LICENSE_REVOKE'].includes(ev.type)) return false;
      if (selectedFilter === 'PURCHASE' && ev.type !== 'PURCHASE') return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchTitle = ev.title?.toLowerCase().includes(q);
      const matchDesc = ev.description?.toLowerCase().includes(q);
      const matchActor = ev.actor?.toLowerCase().includes(q);
      const matchSub = ev.subtitle?.toLowerCase().includes(q);
      if (!matchTitle && !matchDesc && !matchActor && !matchSub) return false;
    }

    return true;
  });

  // Sắp xếp
  const sortedEvents = [...filteredEvents].sort((a, b) => {
    const timeA = new Date(a.timestamp).getTime();
    const timeB = new Date(b.timestamp).getTime();
    return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
  });

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'PURCHASE':
        return <ShoppingBag className="w-4 h-4 text-blue-600 dark:text-blue-400" />;
      case 'ASSIGNMENT':
        return <User className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />;
      case 'RETURN':
        return <RotateCcw className="w-4 h-4 text-slate-600 dark:text-slate-400" />;
      case 'TICKET':
        return <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400" />;
      case 'SPARE_PART':
        return <Cpu className="w-4 h-4 text-amber-600 dark:text-amber-400" />;
      case 'MAINTENANCE':
        return <Wrench className="w-4 h-4 text-purple-600 dark:text-purple-400" />;
      case 'LICENSE_ASSIGN':
      case 'LICENSE_REVOKE':
        return <Key className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />;
      default:
        return <Clock className="w-4 h-4 text-slate-600 dark:text-slate-400" />;
    }
  };

  const getEventRing = (type: string) => {
    switch (type) {
      case 'PURCHASE':
        return 'bg-blue-100 border-blue-500 text-blue-700';
      case 'ASSIGNMENT':
        return 'bg-emerald-100 border-emerald-500 text-emerald-700';
      case 'RETURN':
        return 'bg-slate-100 border-slate-400 text-slate-700';
      case 'TICKET':
        return 'bg-rose-100 border-rose-500 text-rose-700';
      case 'SPARE_PART':
        return 'bg-amber-100 border-amber-500 text-amber-700';
      case 'MAINTENANCE':
        return 'bg-purple-100 border-purple-500 text-purple-700';
      case 'LICENSE_ASSIGN':
      case 'LICENSE_REVOKE':
        return 'bg-indigo-100 border-indigo-500 text-indigo-700';
      default:
        return 'bg-slate-100 border-slate-400 text-slate-700';
    }
  };

  return (
    <div className="space-y-5">
      {/* KPI Overview 360 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 bg-gradient-to-br from-blue-50 to-indigo-50/50 dark:from-blue-950/40 dark:to-indigo-950/30 rounded-2xl border border-blue-200/80 dark:border-blue-800">
          <span className="text-[10px] font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider block">
            ⏳ Tuổi Thọ Hoạt Động
          </span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl font-black text-blue-950 dark:text-blue-200 font-mono">
              {kpis.ageYears > 0 ? `${kpis.ageYears} năm` : `${kpis.ageMonths} tháng`}
            </span>
            <span className="text-[11px] text-blue-600 font-medium">({kpis.ageMonths} tháng)</span>
          </div>
          <p className="text-[10.5px] text-slate-500 mt-0.5">
            Từ lúc nhập kho hệ thống
          </p>
        </div>

        <div className="p-3.5 bg-gradient-to-br from-emerald-50 to-teal-50/50 dark:from-emerald-950/40 dark:to-teal-950/30 rounded-2xl border border-emerald-200/80 dark:border-emerald-800">
          <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider block">
            👥 Đời Người Sử Dụng
          </span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl font-black text-emerald-950 dark:text-emerald-200 font-mono">
              {kpis.totalUsersCount}
            </span>
            <span className="text-[11px] text-emerald-700 font-semibold">nhân sự</span>
          </div>
          <p className="text-[10.5px] text-slate-500 mt-0.5 truncate">
            {kpis.currentHolder ? `Hiện tại: ${kpis.currentHolder.fullName}` : 'Hiện tại: Trong kho IT'}
          </p>
        </div>

        <div className="p-3.5 bg-gradient-to-br from-rose-50 to-amber-50/50 dark:from-rose-950/40 dark:to-amber-950/30 rounded-2xl border border-rose-200/80 dark:border-rose-800">
          <span className="text-[10px] font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider block">
            🎫 Sự Cố & Hỗ Trợ
          </span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl font-black text-rose-950 dark:text-rose-200 font-mono">
              {kpis.totalTicketsCount}
            </span>
            <span className="text-[11px] text-rose-700 font-semibold">ticket phát sinh</span>
          </div>
          <p className="text-[10.5px] text-slate-500 mt-0.5">
            {kpis.openTicketsCount > 0 ? (
              <span className="text-rose-600 font-bold">● {kpis.openTicketsCount} ticket đang mở</span>
            ) : (
              <span className="text-emerald-600 font-semibold">✓ Đã giải quyết 100%</span>
            )}
          </p>
        </div>

        <div className="p-3.5 bg-gradient-to-br from-purple-50 to-indigo-50/50 dark:from-purple-950/40 dark:to-indigo-950/30 rounded-2xl border border-purple-200/80 dark:border-purple-800">
          <span className="text-[10px] font-bold text-purple-700 dark:text-purple-400 uppercase tracking-wider block">
            💰 Chi Phí Sửa / Linh Kiện
          </span>
          <div className="mt-1">
            <span className="text-base font-black text-purple-950 dark:text-purple-200 font-mono truncate block">
              {formatPrice(kpis.totalMaintenanceCost, 'VND')}
            </span>
          </div>
          <p className="text-[10.5px] text-slate-500 mt-0.5">
            {kpis.sparePartsCount} lần thay linh kiện • {kpis.maintenanceCount} lần bảo dưỡng
          </p>
        </div>
      </div>

      {/* Toolbar: Filter pills, Search, Sort */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2">
        {/* Category Filters */}
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: 'ALL', label: `Tất cả (${events.length})` },
            { id: 'ASSIGNMENT', label: `Cấp phát (${events.filter((e: any) => ['ASSIGNMENT', 'RETURN'].includes(e.type)).length})` },
            { id: 'TICKET', label: `Ticket (${kpis.totalTicketsCount})` },
            { id: 'SPARE_PART', label: `Linh kiện (${kpis.sparePartsCount})` },
            { id: 'MAINTENANCE', label: `Bảo dưỡng (${kpis.maintenanceCount})` },
            { id: 'LICENSE', label: `Bản quyền (${events.filter((e: any) => ['LICENSE_ASSIGN', 'LICENSE_REVOKE'].includes(e.type)).length})` },
          ].map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedFilter(cat.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedFilter === cat.id
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Search & Sort */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-48">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm sự kiện..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <button
            type="button"
            onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
            className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1 shrink-0 cursor-pointer"
            title={sortOrder === 'desc' ? 'Đang xếp: Mới nhất lên đầu' : 'Đang xếp: Cũ nhất lên đầu'}
          >
            <ArrowUpDown className="w-3.5 h-3.5 text-indigo-600" />
            <span>{sortOrder === 'desc' ? 'Mới nhất' : 'Cũ nhất'}</span>
          </button>
        </div>
      </div>

      {/* Visual Timeline Stream */}
      {sortedEvents.length === 0 ? (
        <div className="py-12 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 space-y-1">
          <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Không tìm thấy sự kiện nào phù hợp với bộ lọc.</p>
          <p className="text-[11px] text-slate-400">Hãy thử đổi từ khóa tìm kiếm hoặc chọn danh mục khác.</p>
        </div>
      ) : (
        <div className="relative pl-7 sm:pl-9 space-y-5 before:absolute before:left-3.5 sm:before:left-4.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-gradient-to-b before:from-indigo-400 before:via-slate-300 before:to-emerald-400 dark:before:via-slate-700">
          {sortedEvents.map((ev: any, idx: number) => {
            const isExpanded = expandedEventIds.has(ev.id);
            const evDate = new Date(ev.timestamp);

            return (
              <div key={ev.id} className="relative group animate-in fade-in duration-200">
                {/* Node Icon on Timeline */}
                <div
                  className={`absolute -left-7 sm:-left-9 top-1.5 w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 shadow-sm flex items-center justify-center z-10 transition-transform group-hover:scale-110 ${getEventRing(
                    ev.type
                  )}`}
                  title={ev.type}
                >
                  {getEventIcon(ev.type)}
                </div>

                {/* Event Card */}
                <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xs hover:border-indigo-300 dark:hover:border-indigo-700 transition-all space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      {ev.badge && (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border border-black/5 ${ev.badge.bg} ${ev.badge.text}`}>
                          {ev.badge.label}
                        </span>
                      )}
                      <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                        {ev.title}
                      </h4>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400 shrink-0">
                      <span>📅 {evDate.toLocaleDateString('vi-VN')}</span>
                      <span>•</span>
                      <span>{evDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>

                  {ev.subtitle && (
                    <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                      {ev.subtitle}
                    </p>
                  )}

                  {ev.description && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                      {ev.description}
                    </p>
                  )}

                  {/* Footer info: Actor, Cost, Links */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400">
                    <div className="flex items-center gap-3">
                      {ev.actor && (
                        <span>
                          👤 Thực hiện / Liên quan: <strong className="text-slate-700 dark:text-slate-300">{ev.actor}</strong>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {ev.cost && ev.cost.amount > 0 && (
                        <span className="font-bold font-mono text-xs text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded-lg border border-rose-200 dark:border-rose-900">
                          {formatPrice(ev.cost.amount, ev.cost.currency || 'VND')}
                        </span>
                      )}

                      {/* Quick Links for Tickets */}
                      {ev.type === 'TICKET' && ev.metadata?.ticketId && (
                        <Link
                          href={`/tickets?search=${encodeURIComponent(ev.metadata.ticketNumber || '')}`}
                          target="_blank"
                          className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 bg-indigo-50 dark:bg-indigo-950/50 px-2 py-0.5 rounded-lg hover:underline"
                        >
                          <span>Xem Ticket</span>
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      )}

                      {/* Quick Link for Users */}
                      {ev.metadata?.userId && onOpenUser && (
                        <button
                          type="button"
                          onClick={() => onOpenUser(ev.metadata.userId)}
                          className="text-xs font-bold text-emerald-600 hover:text-emerald-800 flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-lg hover:underline cursor-pointer"
                        >
                          <span>Hồ sơ nhân sự</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
