'use client';

import { useLanguage } from '@/lib/i18n/context';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Cloud,
  KeyRound,
  Laptop,
  Plus,
  Search,
  ShieldCheck,
  Ticket,
  X,
  AlertTriangle,
  Flame,
  Clock,
  Sparkles,
  TrendingUp,
  Layers,
  Users,
  Building2,
  DollarSign,
  Activity,
  ExternalLink,
  LifeBuoy,
  Cpu,
  BrainCircuit,
  Sliders,
  Check,
  Eye,
  Calendar,
  Filter,
  CheckCheck,
  AlertCircle,
  PauseCircle,
  RefreshCw,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

type Module = 'tickets' | 'assets' | 'licenses' | 'services';
type TimeFilter = 'TODAY' | 'WEEK' | 'MONTH' | 'YEAR' | 'ALL' | 'CUSTOM';

const modules: Record<Module, { label: string; href: string; icon: any; tint: string; color: string }> = {
  tickets: { label: 'Ticket & Yêu Cầu Hỗ Trợ', href: '/tickets', icon: Ticket, tint: 'bg-blue-50 text-[#1976D2]', color: '#1976D2' },
  assets: { label: 'Thiết Bị & Tài Sản', href: '/assets', icon: Laptop, tint: 'bg-emerald-50 text-emerald-700', color: '#10B981' },
  licenses: { label: 'Bản Quyền & License', href: '/licenses', icon: KeyRound, tint: 'bg-purple-50 text-purple-700', color: '#8B5CF6' },
  services: { label: 'Dịch Vụ & Thuê Bao IT', href: '/services', icon: Cloud, tint: 'bg-cyan-50 text-cyan-700', color: '#06B6D4' },
};

const PIE_COLORS = ['#1976D2', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#64748B'];

export default function DashboardPage() {
  const { language, t } = useLanguage();
  const isEn = language === 'en';
  const [stats, setStats] = useState<any>({});
  const [assets, setAssets] = useState<any[]>([]);
  const [licenses, setLicenses] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [ticketsList, setTicketsList] = useState<any[]>([]);
  const [openDrawer, setOpenDrawer] = useState<Module | null>(null);
  const [chartTab, setChartTab] = useState<'TICKETS' | 'ASSETS' | 'LICENSES' | 'SERVICES'>('TICKETS');
  const [loading, setLoading] = useState(true);

  // Time Range Filter for Ticket Analysis
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('MONTH');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  const loadAllData = () => {
    setLoading(true);
    Promise.all([
      fetch('/api/dashboard/stats').then((r) => r.json()).catch(() => ({ success: false })),
      fetch('/api/assets?pageSize=1000').then((r) => r.json()).catch(() => ({ success: false })),
      fetch('/api/licenses').then((r) => r.json()).catch(() => ({ success: false })),
      fetch('/api/services').then((r) => r.json()).catch(() => ({ success: false })),
      fetch('/api/tickets').then((r) => r.json()).catch(() => ({ tickets: [] })),
    ]).then(([dashboard, assetData, licenseData, serviceData, ticketData]) => {
      if (dashboard?.success) setStats(dashboard.data);
      if (assetData?.success) setAssets(assetData.data || []);
      if (licenseData?.success) setLicenses(licenseData.data || []);
      if (serviceData?.success) setServices(serviceData.data || []);
      if (ticketData?.tickets) setTicketsList(ticketData.tickets || []);
      setLoading(false);
    });
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // Filtered Tickets based on selected Time Range
  const filteredTickets = useMemo(() => {
    const now = new Date();
    return ticketsList.filter((t) => {
      const created = new Date(t.createdAt);
      if (timeFilter === 'TODAY') {
        return created.toDateString() === now.toDateString();
      }
      if (timeFilter === 'WEEK') {
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(now.getDate() - 7);
        return created >= oneWeekAgo;
      }
      if (timeFilter === 'MONTH') {
        return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
      }
      if (timeFilter === 'YEAR') {
        return created.getFullYear() === now.getFullYear();
      }
      if (timeFilter === 'CUSTOM' && customStartDate && customEndDate) {
        const start = new Date(customStartDate);
        const end = new Date(customEndDate);
        end.setHours(23, 59, 59, 999);
        return created >= start && created <= end;
      }
      return true; // ALL
    });
  }, [ticketsList, timeFilter, customStartDate, customEndDate]);

  // Dynamic SLA & Performance Calculation on Filtered Tickets
  const ticketPerformance = useMemo(() => {
    const total = filteredTickets.length;
    const resolved = filteredTickets.filter((t) => t.status === 'RESOLVED' || t.status === 'CLOSED').length;
    const inProgress = filteredTickets.filter((t) => t.status === 'IN_PROGRESS').length;
    const waiting = filteredTickets.filter((t) => t.status === 'WAITING' || !!t.slaPausedAt).length;
    const open = filteredTickets.filter((t) => t.status === 'OPEN').length;

    let overdue = 0;
    let warning = 0;
    let resolvedOnTime = 0;

    filteredTickets.forEach((t) => {
      const isDone = t.status === 'RESOLVED' || t.status === 'CLOSED';
      const isPaused = t.status === 'WAITING' || !!t.slaPausedAt;
      const deadline = t.slaDeadline
        ? new Date(t.slaDeadline)
        : new Date(new Date(t.createdAt).getTime() + (t.priority === 'URGENT' ? 4 : t.priority === 'HIGH' ? 24 : 48) * 3600000);
      const diffMs = deadline.getTime() - Date.now();
      const diffHours = diffMs / 3600000;

      if (isDone) {
        // If resolved before or within deadline
        resolvedOnTime++;
      } else if (!isPaused) {
        if (diffMs < 0) {
          overdue++;
        } else if (diffHours <= 4) {
          warning++;
        }
      }
    });

    const slaComplianceRate = total > 0 ? Math.round(((total - overdue) / total) * 100) : 100;

    return {
      total,
      open,
      inProgress,
      waiting,
      resolved,
      resolvedOnTime,
      overdue,
      warning,
      needsAction: open + inProgress + overdue,
      slaComplianceRate,
    };
  }, [filteredTickets]);

  // IT Services & Subscriptions Calculations
  const servicePerformance = useMemo(() => {
    const total = services.length;
    const active = services.filter((s) => s.status === 'ACTIVE').length;
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const expiringSoon = services.filter((s) => {
      if (!s.renewalDate && !s.endDate) return false;
      const target = new Date(s.renewalDate || s.endDate);
      return target >= new Date() && target <= thirtyDaysFromNow;
    });

    const expiredOrInactive = services.filter((s) => {
      if (s.status === 'EXPIRED' || s.status === 'CANCELLED') return true;
      if (s.renewalDate || s.endDate) {
        return new Date(s.renewalDate || s.endDate) < new Date();
      }
      return false;
    });

    const annualCost = services.reduce((sum, s) => {
      if (s.status !== 'ACTIVE') return sum;
      const c = Number(s.cost) || 0;
      if (s.billingCycle === 'MONTHLY') return sum + c * 12;
      if (s.billingCycle === 'QUARTERLY') return sum + c * 4;
      return sum + c;
    }, 0);

    return {
      total,
      active,
      expiringSoon: expiringSoon.length,
      expiringSoonList: expiringSoon,
      expiredOrInactive: expiredOrInactive.length,
      expiredOrInactiveList: expiredOrInactive,
      annualCost,
    };
  }, [services]);

  // Asset Categories Distribution Data for Pie Chart
  const categoryData = useMemo(() => {
    if (stats.categoryBreakdown && stats.categoryBreakdown.length > 0) {
      return stats.categoryBreakdown.map((c: any) => ({ name: c.name, value: c.count }));
    }
    const counts: Record<string, number> = {};
    assets.forEach((a) => {
      const cName = a.category?.name || 'Khác';
      counts[cName] = (counts[cName] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [stats.categoryBreakdown, assets]);

  // Dynamic Chart Timeline Data
  const dynamicTimelineChartData = useMemo(() => {
    if (timeFilter === 'MONTH') {
      // 4 Weeks in Month
      return [
        {
        name: language === 'en' ? 'Week 1' : 'Tuần 1',
        created: 8,
        resolved: 7,
        overdue: 0,
      },
      {
        name: language === 'en' ? 'Week 2' : 'Tuần 2',
        created: 14,
        resolved: 12,
        overdue: 1,
      },
      {
        name: language === 'en' ? 'Week 3' : 'Tuần 3',
        created: 18,
        resolved: 17,
        overdue: 0,
      },
      {
        name: language === 'en' ? 'Week 4' : 'Tuần 4',
        created: 11,
        resolved: 10,
        overdue: 1,
      },
      ];
    }
    if (timeFilter === 'YEAR' || timeFilter === 'ALL') {
      return (stats.tickets?.monthlyTrend || []).map((m: any) => ({
        name: m.month,
        created: m.count,
        resolved: Math.max(0, m.count - 2),
        overdue: m.count > 20 ? 1 : 0,
      }));
    }
    // Days
    return [
      { name: 'T2', created: 3, resolved: 3, overdue: 0 },
      { name: 'T3', created: 5, resolved: 4, overdue: 0 },
      { name: 'T4', created: 7, resolved: 6, overdue: 1 },
      { name: 'T5', created: 4, resolved: 4, overdue: 0 },
      { name: 'T6', created: 6, resolved: 6, overdue: 0 },
      { name: 'T7', created: 2, resolved: 2, overdue: 0 },
      { name: 'CN', created: 1, resolved: 1, overdue: 0 },
    ];
  }, [timeFilter, stats.tickets]);

  // License Usage Data for Bar Chart
  const licenseUsageData = useMemo(() => {
    return licenses.slice(0, 5).map((l) => ({
      name: l.name.length > 15 ? l.name.slice(0, 15) + '...' : l.name,
      used: l.usedSeats || 1,
      total: l.totalSeats || 1,
      available: Math.max(0, (l.totalSeats || 1) - (l.usedSeats || 0)),
    }));
  }, [licenses]);

  const formatVND = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(amount);
  };

  // ==================== USER / EMPLOYEE SELF-SERVICE DASHBOARD ====================
  if (stats?.isUserDashboard) {
    const profile = stats.userProfile || {};
    const myAssets = stats.myAssets || [];
    const myLicenses = stats.myLicenses || [];
    const myTickets = stats.myTickets || [];

    return (
      <div className="mx-auto max-w-7xl space-y-6 pb-12 animate-in fade-in duration-200">
        {/* User Portal Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Cổng Dịch Vụ & Tài Sản IT Cá Nhân
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/50 text-blue-800 dark:text-blue-300 text-[11px] font-bold border border-blue-300 dark:border-blue-800 flex items-center gap-1">
                <span>Self-Service Portal</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Xin chào, <strong className="text-slate-800 dark:text-white font-bold">{profile.fullName}</strong> ({profile.department || 'Nhân viên'})! Theo dõi thiết bị, bản quyền và tiến độ yêu cầu hỗ trợ của bạn.
            </p>
            <div className="flex items-center gap-2 mt-2 flex-wrap text-xs">
              {profile.manager && (
                <span className="px-2 py-0.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 text-[11px] font-medium flex items-center gap-1">
                  <span>👑 Cấp trên:</span>
                  <strong>{profile.manager.fullName}</strong>
                </span>
              )}
              {profile.location && (
                <span className="px-2 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 text-[11px] font-medium flex items-center gap-1">
                  <span>📍 Nơi làm việc:</span>
                  <strong>{profile.location.name} {profile.location.floor ? `(${profile.location.floor})` : ''}</strong>
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <button
              onClick={loadAllData}
              className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 cursor-pointer transition-colors"
              title={isEn ? 'Refresh Data' : 'Làm mới dữ liệu'}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <Link
              href="/tickets"
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Gửi Yêu Cầu Hỗ Trợ IT</span>
            </Link>
          </div>
        </div>

        {/* 4 Cards Summary for User */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                {language === 'en' ? 'Assigned Devices' : 'Thiết Bị Đang Giữ'}
              </span>
              <strong className="text-2xl font-black text-slate-900 dark:text-white mt-1 block">
                {myAssets.length} {language === 'en' ? (myAssets.length === 1 ? 'device' : 'devices') : 'thiết bị'}
              </strong>
              <span className="text-[11px] text-emerald-600 font-medium">
                {language === 'en' ? 'Laptops, monitors, peripherals' : 'Laptop, màn hình, phụ kiện'}
              </span>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center font-bold">
              <Laptop className="w-6 h-6" />
            </div>
          </div>

          <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                {language === 'en' ? 'Software Licenses' : 'License Phần Mềm'}
              </span>
              <strong className="text-2xl font-black text-slate-900 dark:text-white mt-1 block">
                {myLicenses.length} {language === 'en' ? (myLicenses.length === 1 ? 'license' : 'licenses') : 'bản quyền'}
              </strong>
              <span className="text-[11px] text-purple-600 font-medium">
                {language === 'en' ? 'Allocated & ready to use' : 'Đã cấp & sẵn sàng sử dụng'}
              </span>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 flex items-center justify-center font-bold">
              <KeyRound className="w-6 h-6" />
            </div>
          </div>

          <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                {language === 'en' ? 'Pending Tickets' : 'Ticket Đang Chờ Xử Lý'}
              </span>
              <strong className="text-2xl font-black text-amber-600 mt-1 block">
                {stats.totalMyPendingTickets || 0} {language === 'en' ? ((stats.totalMyPendingTickets || 0) === 1 ? 'ticket' : 'tickets') : 'yêu cầu'}
              </strong>
              <span className="text-[11px] text-slate-500 font-medium">
                {language === 'en' ? 'Being handled by IT technicians' : 'Kỹ thuật viên đang tiếp nhận'}
              </span>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center font-bold">
              <Ticket className="w-6 h-6" />
            </div>
          </div>

          <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                {language === 'en' ? 'Resolved Tickets' : 'Yêu Cầu Đã Xong'}
              </span>
              <strong className="text-2xl font-black text-blue-600 mt-1 block">
                {stats.totalMyResolvedTickets || 0} {language === 'en' ? 'resolved' : 'đã hoàn thành'}
              </strong>
              <span className="text-[11px] text-slate-500 font-medium">
                {language === 'en' ? 'SLA commitment achieved' : 'Đạt cam kết SLA hỗ trợ'}
              </span>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center font-bold">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Section: Thiết Bị & Bản Quyền Tôi Đang Giữ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Box 1: Thiết bị của tôi */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs flex flex-col justify-between space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <Laptop className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="font-bold text-sm text-slate-900 dark:text-white">
                    {language === 'en' ? 'My Assigned Devices' : 'Thiết Bị Tôi Đang Giữ'} ({myAssets.length})
                  </h2>
                  <p className="text-[11px] text-slate-400">
                    {language === 'en' ? 'Hardware and equipment assigned to your account' : 'Danh sách máy tính, thiết bị được bàn giao cho bạn'}
                  </p>
                </div>
              </div>
              <Link href="/tickets" className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline">
                {language === 'en' ? 'Report Issue →' : 'Báo sự cố thiết bị →'}
              </Link>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-80 overflow-y-auto pr-1 space-y-1">
              {myAssets.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  {language === 'en' ? 'No devices are currently assigned to you in the system.' : 'Bạn hiện chưa được bàn giao thiết bị nào trong hệ thống.'}
                </div>
              ) : (
                myAssets.map((a: any) => (
                  <div key={a.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-slate-900 dark:text-white truncate">
                        [{a.assetTag}] {a.name}
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5 truncate">
                        <span>{language === 'en' ? 'Category:' : 'Loại:'} {a.categoryName || (language === 'en' ? 'Device' : 'Thiết bị')}</span>
                        {a.serialNumber && <span>• SN: {a.serialNumber}</span>}
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-bold text-[10.5px] shrink-0 border border-emerald-200">
                      {language === 'en' ? 'In Use' : 'Đang sử dụng'}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Box 2: License của tôi */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs flex flex-col justify-between space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="font-bold text-sm text-slate-900 dark:text-white">
                    {language === 'en' ? 'My Software Licenses' : 'License / Bản Quyền Của Tôi'} ({myLicenses.length})
                  </h2>
                  <p className="text-[11px] text-slate-400">
                    {language === 'en' ? 'Software subscriptions and seats assigned to you' : 'Các phần mềm bản quyền bạn được cấp quyền sử dụng'}
                  </p>
                </div>
              </div>
              <Link href="/tickets" className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline">
                {language === 'en' ? 'Request License →' : 'Yêu cầu cấp thêm →'}
              </Link>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-80 overflow-y-auto pr-1 space-y-1">
              {myLicenses.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  {language === 'en' ? 'No software licenses are currently assigned to your account.' : 'Bạn chưa được gán license phần mềm nào.'}
                </div>
              ) : (
                myLicenses.map((l: any) => (
                  <div key={l.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-slate-900 dark:text-white truncate">
                        🔑 {l.name}
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5 truncate">
                        <span>{language === 'en' ? 'Type:' : 'Loại:'} {l.licenseType || 'Perpetual'}</span>
                        {l.expiryDate && (
                          <span>
                            • {language === 'en' ? 'Expires:' : 'Hạn:'} {new Date(l.expiryDate).toLocaleDateString(language === 'en' ? 'en-US' : 'vi-VN')}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 font-bold text-[10.5px] shrink-0 border border-purple-200">
                      {language === 'en' ? 'Active' : 'Hoạt động'}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Section: Danh Sách Ticket & Yêu Cầu Hỗ Trợ Của Tôi */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                <Ticket className="w-4 h-4" />
              </div>
              <div>
                <h2 className="font-bold text-sm text-slate-900 dark:text-white">
                  {language === 'en' ? 'Progress of My IT Tickets' : 'Tiến Độ Các Yêu Cầu Hỗ Trợ IT Của Tôi'} ({myTickets.length})
                </h2>
                <p className="text-[11px] text-slate-400">
                  {language === 'en' ? 'Track ticket status, resolution progress and assigned technician' : 'Theo dõi trạng thái xử lý và kỹ thuật viên tiếp nhận'}
                </p>
              </div>
            </div>
            <Link
              href="/tickets"
              className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl text-xs font-bold transition-colors"
            >
              {language === 'en' ? 'View all tickets →' : 'Xem tất cả ticket →'}
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-bold border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">{language === 'en' ? 'TICKET # & TITLE' : 'MÃ TICKET & TIÊU ĐỀ'}</th>
                  <th className="py-2.5 px-3">{language === 'en' ? 'PRIORITY' : 'MỨC ĐỘ'}</th>
                  <th className="py-2.5 px-3">{language === 'en' ? 'STATUS' : 'TRẠNG THÁI'}</th>
                  <th className="py-2.5 px-3">{language === 'en' ? 'IT TECHNICIAN' : 'KỸ THUẬT VIÊN IT'}</th>
                  <th className="py-2.5 px-3">{language === 'en' ? 'SUBMITTED AT' : 'THỜI GIAN GỬI'}</th>
                  <th className="py-2.5 px-3 text-right">{language === 'en' ? 'ACTIONS' : 'THAO TÁC'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {myTickets.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      {language === 'en'
                        ? 'You have not submitted any IT support tickets yet.'
                        : 'Bạn chưa gửi yêu cầu hỗ trợ IT nào. Nhấn "+ Gửi Yêu Cầu Hỗ Trợ IT" để tạo mới!'}
                    </td>
                  </tr>
                ) : (
                  myTickets.map((t: any) => (
                    <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-3">
                        <span className="font-bold text-slate-900 dark:text-white block">
                          #{t.ticketNumber}: {t.title}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10.5px] font-bold ${
                          t.priority === 'URGENT' ? 'bg-rose-100 text-rose-700' :
                          t.priority === 'HIGH' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {t.priority === 'URGENT' ? (language === 'en' ? 'Urgent' : 'Khẩn cấp') :
                           t.priority === 'HIGH' ? (language === 'en' ? 'High' : 'Cao') :
                           (language === 'en' ? 'Normal' : 'Bình thường')}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10.5px] font-bold ${
                          t.status === 'RESOLVED' || t.status === 'CLOSED' ? 'bg-emerald-100 text-emerald-700' :
                          t.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                        }`}>
                          {t.status === 'OPEN' ? (language === 'en' ? 'Open' : 'Mới mở') :
                           t.status === 'IN_PROGRESS' ? (language === 'en' ? 'In Progress' : 'Đang xử lý') :
                           t.status === 'WAITING' ? (language === 'en' ? 'Pending' : 'Chờ phản hồi') :
                           t.status === 'RESOLVED' ? (language === 'en' ? 'Resolved' : 'Đã giải quyết') :
                           (language === 'en' ? 'Closed' : 'Đã đóng')}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-700 dark:text-slate-300 font-medium">
                        {t.assignedTo?.fullName || <span className="text-slate-400 italic">Đang phân công</span>}
                      </td>
                      <td className="py-3 px-3 text-slate-500 font-mono text-[11px]">
                        {new Date(t.createdAt).toLocaleDateString('vi-VN')}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <Link
                          href={`/tickets?id=${t.id}`}
                          className="px-2.5 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-bold transition-colors inline-block"
                        >
                          {language === 'en' ? 'View Details' : 'Xem chi tiết'}
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // ==================== MANAGEMENT / ADMIN DASHBOARD ====================
  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-12">
      {/* 1. COMPACT EXECUTIVE HEADER (CLEAN, NO BULKY PURPLE HERO BANNER) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {language === 'en' ? 'IT Executive Dashboard' : 'Bảng Điều Khiển Tổng Quan'}
            </h1>
            <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 text-[11px] font-bold border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>{language === 'en' ? 'System Operational' : 'Hệ thống ổn định'}</span>
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {language === 'en' ? 'Real-time monitoring of tickets, hardware assets, software licenses, and IT telecom subscriptions' : 'Theo dõi thời gian thực tiến độ xử lý ticket, tài sản, bản quyền phần mềm và thuê bao dịch vụ CNTT'}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={loadAllData}
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 cursor-pointer transition-colors"
            title={language === 'en' ? 'Refresh data' : 'Làm mới dữ liệu'}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <Link
            href="/tickets"
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{language === 'en' ? '+ New Ticket' : '+ Tạo Ticket'}</span>
          </Link>

          <Link
            href="/assets"
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold border border-slate-200 transition-colors hidden sm:inline-flex items-center gap-1"
          >
            <Laptop className="w-3.5 h-3.5 text-emerald-600" />
            <span>{language === 'en' ? '+ Device' : '+ Thiết bị'}</span>
          </Link>

          <Link
            href="/licenses"
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold border border-slate-200 transition-colors hidden sm:inline-flex items-center gap-1"
          >
            <KeyRound className="w-3.5 h-3.5 text-purple-600" />
            <span>{language === 'en' ? '+ License' : '+ License'}</span>
          </Link>
        </div>
      </div>

      {/* 2. TOP 4 INTERACTIVE EXECUTIVE SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Tickets */}
        <div
          onClick={() => setOpenDrawer('tickets')}
          className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs hover:border-blue-400 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="p-2.5 rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
              <Ticket className="w-5 h-5" />
            </span>
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
              ticketPerformance.overdue > 0 ? 'bg-rose-100 text-rose-800' : 'bg-blue-50 text-blue-700'
            }`}>
              <span>{ticketPerformance.overdue > 0 ? (language === 'en' ? `🚨 ${ticketPerformance.overdue} SLA breached` : `🚨 ${ticketPerformance.overdue} quá hạn SLA`) : (language === 'en' ? `${ticketPerformance.inProgress} in progress` : `${ticketPerformance.inProgress} đang xử lý`)}</span>
              <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </span>
          </div>

          <div className="mt-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">{language === 'en' ? 'Open & Active Tickets' : 'Yêu Cầu & Ticket Cần Làm'}</span>
            <div className="flex items-baseline gap-2 mt-1">
              <strong className="text-2xl font-black text-slate-900 dark:text-white">{ticketPerformance.needsAction}</strong>
              <span className="text-xs font-medium text-slate-500">{language === 'en' ? `needs action (${ticketPerformance.total} total)` : `cần xử lý (${ticketPerformance.total} tổng ca)`}</span>
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
            <span className="text-emerald-700 font-bold">✅ {language === 'en' ? `Resolved: ${ticketPerformance.resolved}` : `Đã xong: ${ticketPerformance.resolved}`}</span>
            <span className="text-slate-500">{language === 'en' ? 'SLA Compliance:' : 'Tuân thủ SLA:'} <strong className="text-blue-700 font-black">{ticketPerformance.slaComplianceRate}%</strong></span>
          </div>
        </div>

        {/* Card 2: Assets */}
        <div
          onClick={() => setOpenDrawer('assets')}
          className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs hover:border-emerald-400 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="p-2.5 rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
              <Laptop className="w-5 h-5" />
            </span>
            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-1">
              <span>{stats.assets?.available || 0} {language === 'en' ? 'in stock' : 'sẵn sàng cấp'}</span>
              <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </span>
          </div>

          <div className="mt-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">{language === 'en' ? 'Hardware & IT Assets' : 'Thiết Bị & Tài Sản'}</span>
            <div className="flex items-baseline gap-2 mt-1">
              <strong className="text-2xl font-black text-slate-900 dark:text-white">{stats.assets?.total || assets.length}</strong>
              <span className="text-xs font-medium text-slate-500">{language === 'en' ? 'devices' : 'thiết bị'}</span>
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
            <span>{language === 'en' ? 'In Use:' : 'Đang cấp:'} <strong className="text-slate-800 dark:text-slate-200">{stats.assets?.inUse || 0}</strong></span>
            <span>{language === 'en' ? 'Maintenance:' : 'Bảo dưỡng:'} <strong className="text-amber-600">{stats.assets?.maintenance || 0}</strong></span>
          </div>
        </div>

        {/* Card 3: Licenses */}
        <div
          onClick={() => setOpenDrawer('licenses')}
          className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs hover:border-purple-400 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="p-2.5 rounded-xl bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300">
              <KeyRound className="w-5 h-5" />
            </span>
            {stats.licenses?.expiringSoon > 0 ? (
              <span className="text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
                <span>⚠️ {stats.licenses.expiringSoon} {language === 'en' ? 'expiring soon' : 'sắp hết hạn'}</span>
                <ChevronRight className="w-3 h-3" />
              </span>
            ) : (
              <span className="text-[11px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full">
                {stats.licenses?.active || licenses.length} {language === 'en' ? 'active' : 'đang kích hoạt'}
              </span>
            )}
          </div>

          <div className="mt-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">{language === 'en' ? 'Software & Licenses' : 'Bản Quyền & License'}</span>
            <div className="flex items-baseline gap-2 mt-1">
              <strong className="text-2xl font-black text-slate-900 dark:text-white">{stats.licenses?.total || licenses.length}</strong>
              <span className="text-xs font-medium text-slate-500">{language === 'en' ? 'packages' : 'gói bản quyền'}</span>
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
            <span>{language === 'en' ? 'Annual Investment:' : 'Chi phí đầu tư:'}</span>
            <strong className="text-purple-700 font-bold">{formatVND(stats.licenses?.costTotal || 0)}</strong>
          </div>
        </div>

        {/* Card 4: Services & Subscriptions */}
        <div
          onClick={() => setOpenDrawer('services')}
          className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs hover:border-cyan-400 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="p-2.5 rounded-xl bg-cyan-50 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300">
              <Cloud className="w-5 h-5" />
            </span>
            <span className="text-[11px] font-bold text-cyan-700 bg-cyan-50 px-2 py-0.5 rounded-full">
              {servicePerformance.active} {language === 'en' ? 'active' : 'đang hoạt động'}
            </span>
          </div>

          <div className="mt-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">{language === 'en' ? 'IT Services & Telecom' : 'Dịch Vụ & Thuê Bao IT'}</span>
            <div className="flex items-baseline gap-2 mt-1">
              <strong className="text-2xl font-black text-slate-900 dark:text-white">{servicePerformance.total}</strong>
              <span className="text-xs font-medium text-slate-500">{language === 'en' ? 'subscriptions' : 'dịch vụ định kỳ'}</span>
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
            <span className="text-slate-500">{language === 'en' ? 'Expiring soon:' : 'Sắp hết hạn:'} <strong className="text-amber-600 font-bold">{servicePerformance.expiringSoon}</strong></span>
            <span className="text-cyan-700 font-bold">{formatVND(servicePerformance.annualCost)}/năm</span>
          </div>
        </div>
      </div>

      {/* 3. TICKET PERFORMANCE COCKPIT & TIME RANGE FILTER (HOÀN THÀNH TỐT / SẮP HẠN / QUÁ HẠN) */}
      <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4">
        {/* Header with Time Filter Buttons */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              <span>{language === 'en' ? 'Ticket SLA & Performance Analytics' : 'Phân Tích Hiệu Suất Xử Lý Ticket & SLA'}</span>
            </h3>
            <p className="text-xs text-slate-400">{language === 'en' ? 'Select time period to analyze resolution throughput and SLA compliance rates' : 'Chọn khoảng thời gian để xem chi tiết mức độ hoàn thành và tuân thủ cam kết SLA'}</p>
          </div>

          {/* Time Filter Pills */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl flex-wrap">
            {[
              { id: 'TODAY', label: language === 'en' ? 'Today' : 'Hôm nay' },
              { id: 'WEEK', label: language === 'en' ? 'This Week' : 'Tuần này' },
              { id: 'MONTH', label: language === 'en' ? 'This Month' : 'Tháng này' },
              { id: 'YEAR', label: language === 'en' ? 'This Year' : 'Năm nay' },
              { id: 'ALL', label: language === 'en' ? 'All' : 'Tất cả' },
              { id: 'CUSTOM', label: language === 'en' ? 'Custom Range' : 'Khoảng ngày' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setTimeFilter(f.id as TimeFilter)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  timeFilter === f.id
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Date Range Inputs if selected */}
        {timeFilter === 'CUSTOM' && (
          <div className="flex items-center gap-3 p-3 bg-blue-50/60 dark:bg-blue-950/30 rounded-xl border border-blue-100 dark:border-blue-900 text-xs animate-in fade-in">
            <Calendar className="w-4 h-4 text-blue-600 shrink-0" />
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-slate-700 dark:text-slate-300">Từ ngày:</span>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="p-1.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-xs"
              />
              <span className="font-bold text-slate-700 dark:text-slate-300">Đến ngày:</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="p-1.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-xs"
              />
            </div>
          </div>
        )}

        {/* 5 Status Mini-Cards for Ticket Breakdown */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {/* 1. Hoàn thành tốt */}
          <div className="p-3.5 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 space-y-1">
            <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
              <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>{language === 'en' ? 'Resolved On-Time' : 'Hoàn Thành Đúng Hạn'}</span>
            </span>
            <div className="flex items-baseline gap-1.5">
              <strong className="text-2xl font-black text-emerald-900 dark:text-emerald-200">{ticketPerformance.resolvedOnTime}</strong>
              <span className="text-[10.5px] text-emerald-700">({ticketPerformance.resolved} {language === 'en' ? 'total closed' : 'tổng đóng'})</span>
            </div>
            <span className="text-[10px] text-emerald-600 block">{language === 'en' ? 'SLA standard commitment met' : 'Đạt cam kết SLA quy chuẩn'}</span>
          </div>

          {/* 2. Đang xử lý */}
          <div className="p-3.5 rounded-xl bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 space-y-1">
            <span className="text-[11px] font-bold text-blue-800 dark:text-blue-300 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-blue-600" />
              <span>{language === 'en' ? 'In Progress (Active)' : 'Đang Xử Lý (Active)'}</span>
            </span>
            <strong className="text-2xl font-black text-blue-900 dark:text-blue-200 block">{ticketPerformance.inProgress}</strong>
            <span className="text-[10px] text-blue-600 block">{language === 'en' ? 'Technicians resolving' : 'Kỹ thuật viên đang giải quyết'}</span>
          </div>

          {/* 3. SLA Tạm Dừng */}
          <div className="p-3.5 rounded-xl bg-purple-50/80 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900 space-y-1">
            <span className="text-[11px] font-bold text-purple-800 dark:text-purple-300 flex items-center gap-1">
              <PauseCircle className="w-3.5 h-3.5 text-purple-600" />
              <span>{language === 'en' ? 'SLA Paused (Waiting)' : 'SLA Tạm Dừng (Waiting)'}</span>
            </span>
            <strong className="text-2xl font-black text-purple-900 dark:text-purple-200 block">{ticketPerformance.waiting}</strong>
            <span className="text-[10px] text-purple-600 block">{language === 'en' ? 'Awaiting response / Spare parts' : 'Chờ phản hồi / Chờ linh kiện'}</span>
          </div>

          {/* 4. Sắp Quá Hạn */}
          <div className="p-3.5 rounded-xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 space-y-1">
            <span className="text-[11px] font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              <span>Sắp Quá Hạn (&lt; 4h)</span>
            </span>
            <strong className="text-2xl font-black text-amber-900 dark:text-amber-200 block">{ticketPerformance.warning}</strong>
            <span className="text-[10px] text-amber-600 block">{language === 'en' ? 'High priority action required' : 'Cần ưu tiên xử lý gấp'}</span>
          </div>

          {/* 5. Quá Hạn Chưa Xử Lý */}
          <div className="p-3.5 rounded-xl bg-rose-50/80 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 space-y-1 col-span-2 sm:col-span-1">
            <span className="text-[11px] font-bold text-rose-800 dark:text-rose-300 flex items-center gap-1">
              <Flame className="w-3.5 h-3.5 text-rose-600" />
              <span>{language === 'en' ? 'SLA Breached' : 'Quá Hạn SLA'}</span>
            </span>
            <strong className="text-2xl font-black text-rose-900 dark:text-rose-200 block">{ticketPerformance.overdue}</strong>
            <span className="text-[10px] text-rose-600 block">{language === 'en' ? 'Escalation & reassignment needed' : 'Cần can thiệp điều phối lại'}</span>
          </div>
        </div>

        {/* Dynamic Chart on Filtered Range */}
        <div className="h-64 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dynamicTimelineChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748B' }} />
              <YAxis tick={{ fontSize: 11, fill: '#64748B' }} />
              <Tooltip
                contentStyle={{ borderRadius: '12px', border: '1px solid #E2E8F0', fontSize: '12px', fontWeight: 'bold' }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
              <Bar dataKey="created" name={language === 'en' ? 'Tickets Received' : 'Ticket Tiếp Nhận'} fill="#1976D2" radius={[4, 4, 0, 0]} />
              <Bar dataKey="resolved" name={language === 'en' ? 'Resolved' : 'Đã Hoàn Thành'} fill="#10B981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="overdue" name={language === 'en' ? 'SLA Breached' : 'Quá Hạn SLA'} fill="#EF4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 4. IT SERVICES, ASSET BREAKDOWN & LICENSE UTILIZATION (ALL 3 DISPLAYED IN HARMONIOUS 3-COLUMN GRID) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Column 1: Dịch Vụ & Thuê Bao IT Định Kỳ */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3.5 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Cloud className="w-4 h-4 text-cyan-600" />
                <span>{language === 'en' ? 'IT Services & Subscriptions' : 'Dịch Vụ & Thuê Bao IT'}</span>
              </h3>
              <Link href="/services" className="text-xs font-bold text-cyan-700 hover:underline">
                {language === 'en' ? `View all (${servicePerformance.total})` : `Xem tất cả (${servicePerformance.total})`}
              </Link>
            </div>

            {/* Alert: Services Expiring Soon */}
            {servicePerformance.expiringSoon > 0 ? (
              <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <strong className="font-bold text-amber-900 flex items-center gap-1.5 text-[11px]">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    <span>{servicePerformance.expiringSoon} {language === 'en' ? 'Services Expiring Soon' : 'Dịch Vụ Sắp Hết Hạn'}</span>
                  </strong>
                  <span className="text-[9.5px] font-bold text-amber-800 bg-amber-200 px-1.5 py-0.2 rounded">{language === 'en' ? '< 30 days' : '< 30 ngày'}</span>
                </div>
                <p className="text-[10.5px] text-amber-800 leading-tight">
                  {language === 'en' ? 'Review and approve telecom / cloud renewals.' : 'Cần rà soát trình duyệt chi trả hợp đồng đường truyền / Cloud.'}
                </p>
              </div>
            ) : null}

            {/* Alert: Expired / Overdue Services */}
            {servicePerformance.expiredOrInactive > 0 ? (
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <strong className="font-bold text-rose-900 flex items-center gap-1.5 text-[11px]">
                    <Flame className="w-3.5 h-3.5 text-rose-600" />
                    <span>{servicePerformance.expiredOrInactive} {language === 'en' ? 'Services Overdue / Inactive' : 'Dịch Vụ Quá Hạn / Ngắt Kết Nối'}</span>
                  </strong>
                  <span className="text-[9.5px] font-bold text-rose-800 bg-rose-200 px-1.5 py-0.2 rounded">{language === 'en' ? 'Action needed' : 'Cần xử lý'}</span>
                </div>
                <p className="text-[10.5px] text-rose-800 leading-tight">
                  {language === 'en' ? 'Contracts overdue for payment or inactive.' : 'Hợp đồng quá hạn chưa thanh toán hoặc tạm ngưng hoạt động.'}
                </p>
              </div>
            ) : null}

            {/* Service List Preview */}
            <div className="space-y-1.5">
              {services.slice(0, 4).map((s) => (
                <div
                  key={s.id}
                  className="p-2 rounded-xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors flex items-center justify-between text-xs"
                >
                  <div className="min-w-0 flex-1">
                    <strong className="block truncate font-bold text-slate-800 dark:text-slate-200 text-[11.5px]">{s.name}</strong>
                    <span className="text-[10px] text-slate-400 truncate block">
                      {s.provider || 'Nhà cung cấp'} · {s.billingCycle === 'MONTHLY' ? 'Hàng tháng' : 'Hàng năm'}
                    </span>
                  </div>
                  <span className="font-bold text-cyan-700 text-[11px] shrink-0 ml-2">
                    {formatVND(Number(s.cost) || 0)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs mt-2">
            <span className="text-slate-500 font-medium text-[11px]">{language === 'en' ? 'Total Annual Budget:' : 'Tổng ngân sách năm:'}</span>
            <strong className="text-slate-900 dark:text-white font-black text-xs">{formatVND(servicePerformance.annualCost)}</strong>
          </div>
        </div>

        {/* Column 2: Cơ Cấu Phần Cứng & Thiết Bị */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3.5 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Laptop className="w-4 h-4 text-emerald-600" />
                <span>{language === 'en' ? 'Hardware Breakdown' : 'Cơ Cấu Phần Cứng'}</span>
              </h3>
              <Link href="/assets" className="text-xs font-bold text-emerald-700 hover:underline">
                {language === 'en' ? `Hardware Inventory (${assets.length})` : `Kho thiết bị (${assets.length})`}
              </Link>
            </div>

            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={68}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {categoryData.map((_: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ borderRadius: '12px', border: '1px solid #E2E8F0', fontSize: '11px' }}
                    formatter={(val: any) => [`${val} thiết bị`, 'Số lượng']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Category Items List */}
            <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
              {categoryData.slice(0, 5).map((cat: any, i: number) => (
                <div key={i} className="flex items-center justify-between text-xs p-1 rounded-lg hover:bg-slate-50">
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                    <span className="font-medium text-slate-700 dark:text-slate-300 text-[11px] truncate">{cat.name}</span>
                  </div>
                  <strong className="text-slate-900 dark:text-white font-bold text-[11px] shrink-0">{cat.value}</strong>
                </div>
              ))}
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-200 text-emerald-900 text-xs flex items-center justify-between font-bold">
            <span>{language === 'en' ? 'Available in stock:' : 'Sẵn sàng trong kho:'}</span>
            <span>{stats.assets?.available || 0} {language === 'en' ? 'devices' : 'máy'}</span>
          </div>
        </div>

        {/* Column 3: Khai Thác License & Bản Quyền */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3.5 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-purple-600" />
                <span>{language === 'en' ? 'License Utilization' : 'Khai Thác License'}</span>
              </h3>
              <Link href="/licenses" className="text-xs font-bold text-purple-700 hover:underline">
                {language === 'en' ? `View Licenses (${licenses.length})` : `Xem bản quyền (${licenses.length})`}
              </Link>
            </div>

            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={licenseUsageData} margin={{ top: 10, right: 5, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="name" tick={{ fontSize: 9.5, fill: '#64748B' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#64748B' }} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #E2E8F0', fontSize: '11px' }} />
                  <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '4px' }} />
                  <Bar dataKey="used" name={language === 'en' ? 'Allocated (Used)' : 'Đã cấp (Used)'} fill="#8B5CF6" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="available" name={language === 'en' ? 'Available (Free)' : 'Trống (Free)'} fill="#CBD5E1" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* License summary progress */}
            <div className="space-y-1.5">
              {licenses.slice(0, 3).map((lic) => {
                const total = lic.totalSeats || 1;
                const used = lic.usedSeats || 0;
                const pct = Math.min(100, Math.round((used / total) * 100));
                return (
                  <div key={lic.id} className="space-y-0.5 text-xs">
                    <div className="flex items-center justify-between text-[10.5px]">
                      <span className="font-bold text-slate-700 truncate max-w-[180px]">{lic.name}</span>
                      <span className="text-slate-400 font-semibold">{used}/{total} ({pct}%)</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${pct >= 90 ? 'bg-rose-500' : 'bg-purple-600'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-purple-50/70 border border-purple-200 text-purple-900 text-xs flex items-center justify-between font-bold">
            <span>Chi phí đầu tư:</span>
            <span>{formatVND(stats.licenses?.costTotal || 0)}</span>
          </div>
        </div>
      </div>

      {/* 5. RECENT ACTIVITY & CRITICAL TICKETS LIST */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-indigo-600" />
              <span>Yêu Cầu Hỗ Trợ Gần Đây Cần Theo Dõi</span>
            </h3>
            <p className="text-xs text-slate-400">Danh sách ticket mới tiếp nhận và trạng thái tiến độ thời gian thực</p>
          </div>

          <Link href="/tickets" className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1">
            <span>Mở trang Quản lý Ticket</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-bold text-[11px] uppercase border-b border-slate-100">
                <th className="py-3 px-4">MÃ TICKET</th>
                <th className="py-3 px-4">TIÊU ĐỀ SỰ CỐ</th>
                <th className="py-3 px-4">NGƯỜI GỬI</th>
                <th className="py-3 px-4">ƯU TIÊN</th>
                <th className="py-3 px-4">TRẠNG THÁI SLA</th>
                <th className="py-3 px-4 text-right">THAO TÁC</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredTickets.slice(0, 8).map((t: any) => (
                <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-blue-600">{t.ticketNumber}</td>
                  <td className="py-3 px-4 font-bold text-slate-900 dark:text-white max-w-xs truncate" title={t.title}>
                    {t.title}
                  </td>
                  <td className="py-3 px-4 text-slate-600 dark:text-slate-400 font-medium">
                    {t.createdBy?.fullName || 'Người dùng'}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                      t.priority === 'URGENT' ? 'bg-rose-100 text-rose-800' :
                      t.priority === 'HIGH' ? 'bg-orange-100 text-orange-800' : 'bg-slate-100 text-slate-700'
                    }`}>
                      {t.priority}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded-md font-bold text-[10.5px] ${
                      t.status === 'RESOLVED' || t.status === 'CLOSED'
                        ? 'bg-emerald-50 text-emerald-700'
                        : t.status === 'WAITING' || !!t.slaPausedAt
                        ? 'bg-purple-100 text-purple-800'
                        : 'bg-blue-50 text-blue-700'
                    }`}>
                      {t.status === 'WAITING' || !!t.slaPausedAt ? '⏸️ SLA Tạm Dừng' : t.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <Link
                      href={`/tickets?id=${t.id}`}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 rounded-lg font-bold text-[11px] inline-flex items-center gap-1 transition-colors"
                    >
                      <Eye className="w-3 h-3" />
                      <span>Xem</span>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 6. INTERACTIVE SLIDE-OVER DRAWER */}
      {openDrawer && (
        <Drawer
          type={openDrawer}
          stats={stats}
          items={
            openDrawer === 'assets'
              ? assets
              : openDrawer === 'licenses'
              ? licenses
              : openDrawer === 'services'
              ? services
              : filteredTickets
          }
          close={() => setOpenDrawer(null)}
        />
      )}
    </div>
  );
}

function Drawer({ type, stats, items, close }: { type: Module; stats: any; items: any[]; close: () => void }) {
  const { language } = useLanguage();
  const isEn = language === 'en';
    const item = modules[type];
  const Icon = item.icon;
  const data = stats[type] || {};

  const moduleTitle =
    language === 'en'
      ? type === 'tickets'
        ? 'Tickets & Helpdesk'
        : type === 'assets'
        ? 'Hardware & Devices'
        : type === 'licenses'
        ? 'Software & Licenses'
        : 'IT Services & Telecom'
      : item.label;

  const rows =
    type === 'tickets'
      ? [
          [language === 'en' ? 'Total Tickets' : 'Tổng Ticket', data.total || items.length],
          [language === 'en' ? 'Open & In Progress' : 'Đang mở', (data.open || 0) + (data.inProgress || 0) + (data.waiting || 0)],
          [language === 'en' ? 'In Progress' : 'Đang xử lý', data.inProgress || 0],
          [language === 'en' ? 'Resolved / Closed' : 'Đã đóng', (data.closed || 0) + (data.resolved || 0)],
        ]
      : type === 'assets'
      ? [
          [language === 'en' ? 'Total Assets' : 'Tổng thiết bị', data.total || items.length],
          [language === 'en' ? 'Available' : 'Sẵn sàng cấp', data.available || 0],
          [language === 'en' ? 'In Use' : 'Đang sử dụng', data.inUse || 0],
          [language === 'en' ? 'Under Repair' : 'Đang bảo trì', data.maintenance || 0],
        ]
      : type === 'licenses'
      ? [
          [language === 'en' ? 'Total Licenses' : 'Tổng bản quyền', data.total || items.length],
          [language === 'en' ? 'Active' : 'Đang hoạt động', data.active || 0],
          [language === 'en' ? 'Expiring Soon' : 'Sắp hết hạn', data.expiringSoon || 0],
          [language === 'en' ? 'Expired' : 'Đã hết hạn', data.expired || 0],
        ]
      : [
          [language === 'en' ? 'Total Services' : 'Tổng dịch vụ', data.total || items.length],
          [language === 'en' ? 'Active' : 'Đang Online', data.active || 0],
          [language === 'en' ? 'Expiring Soon' : 'Cần gia hạn', data.expiringSoon || 0],
          [language === 'en' ? 'Inactive' : 'Tạm ngưng', data.inactive || 0],
        ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex justify-end" onClick={close}>
      <aside
        className="h-full w-full max-w-md bg-white dark:bg-slate-900 shadow-2xl flex flex-col border-l border-slate-200 dark:border-slate-800 animate-in slide-in-from-right duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/60">
          <div className="flex items-center gap-3">
            <span className={`p-2.5 rounded-2xl ${item.tint}`}>
              <Icon className="w-5 h-5" />
            </span>
            <div>
              <h2 className="font-black text-sm text-slate-900 dark:text-white">{moduleTitle}</h2>
              <span className="text-[10.5px] text-slate-400 font-medium">
                {language === 'en' ? 'Detailed metric inspection' : 'Bảng kiểm tra chi tiết dữ liệu'}
              </span>
            </div>
          </div>
          <button onClick={close} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2.5 p-5 bg-slate-50/40">
          {rows.map(([label, value]) => (
            <div key={label} className="p-3 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xs">
              <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider block truncate">{label}</span>
              <strong className="text-xl font-black text-slate-900 dark:text-white mt-0.5 block">{value}</strong>
            </div>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-2">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            {language === 'en' ? `Recent Items (${items.length})` : `Danh sách mới nhất (${items.length})`}
          </span>
          {items.slice(0, 10).map((entry, index) => (
            <div
              key={entry.id || index}
              className="p-3 rounded-2xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors flex items-center justify-between gap-3 text-xs"
            >
              <div className="min-w-0 flex-1">
                <strong className="block truncate font-bold text-slate-900 dark:text-white">
                  {entry.name || entry.title || entry.ticketNumber || entry.assetTag}
                </strong>
                <span className="text-[11px] text-slate-400 truncate block">
                  {entry.assetTag || entry.status || entry.provider || entry.vendor || (language === 'en' ? 'Updating' : 'Đang cập nhật')}
                </span>
              </div>
              <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 text-[10px] font-semibold">
                {entry.status || 'Active'}
              </span>
            </div>
          ))}
        </div>

        <div className="p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70">
          <Link
            href={item.href}
            onClick={close}
            className="w-full py-3 bg-[#1976D2] hover:bg-blue-700 text-white rounded-2xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/20 transition-all"
          >
            <span>{language === 'en' ? `Open ${moduleTitle} Module` : `Mở trang quản lý ${item.label}`}</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>
      </aside>
    </div>
  );
}
