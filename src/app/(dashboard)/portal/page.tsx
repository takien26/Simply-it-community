'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Laptop,
  Key,
  LifeBuoy,
  Plus,
  AlertTriangle,
  Clock,
  CheckCircle2,
  FileText,
  Copy,
  Check,
  Building,
  User,
  ExternalLink,
  ChevronRight,
  RefreshCw,
  Phone,
  Mail,
  ShieldCheck,
  Search,
  Wifi,
  Printer,
  Lock,
  Globe,
  HelpCircle,
  X,
  MessageSquare,
  Sparkles,
  MapPin,
  Calendar,
  UserCheck,
  BookOpen,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';
import AssetHandoverModal from '@/components/assets/asset-handover-modal';
import { useLanguage } from '@/lib/i18n/context';
import CreateTicketModal from '@/components/tickets/CreateTicketModal';
import { PWAInstallPrompt } from '@/components/common/PWAInstallPrompt';

type TicketFilter = 'ALL' | 'OPEN' | 'RESOLVED';
type RightTab = 'ASSETS' | 'LICENSES';
type GuideType = 'wifi' | 'printer' | 'password' | 'vpn' | null;

const GUIDE_ARTICLE_MAP: Record<'wifi' | 'printer' | 'password' | 'vpn', { id: string; ticketTitle: string }> = {
  wifi: { id: 'kb-wifi-info', ticketTitle: 'Hỗ trợ sự cố kết nối mạng WiFi công ty' },
  printer: { id: 'kb-printer-list', ticketTitle: 'Hỗ trợ kết nối máy in văn phòng' },
  password: { id: 'kb-pwd-change', ticketTitle: 'Yêu cầu mở khóa / Đặt lại mật khẩu tài khoản' },
  vpn: { id: 'kb-vpn-forticlient', ticketTitle: 'Hỗ trợ cấu hình VPN FortiClient làm việc từ xa' },
};

export default function EmployeePortalPage() {
  const { t: tr, language } = useLanguage();
  const isEn = language === 'en';

  const [data, setData] = useState<{
    user: any;
    assets: any[];
    licenses: any[];
    tickets: any[];
    stats: {
      totalAssets: number;
      totalLicenses: number;
      openTickets: number;
      resolvedTickets: number;
      totalTickets: number;
    };
  } | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Ticket creation modal state
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [selectedAssetForTicket, setSelectedAssetForTicket] = useState<string>('');
  const [initialTicketTitle, setInitialTicketTitle] = useState<string>('');

  // Handover modal state
  const [selectedAssetForHandover, setSelectedAssetForHandover] = useState<any>(null);
  const [isHandoverModalOpen, setIsHandoverModalOpen] = useState(false);

  // Copy serial feedback
  const [copiedSerial, setCopiedSerial] = useState<string | null>(null);

  // Filter & tab states
  const [ticketFilter, setTicketFilter] = useState<TicketFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [rightTab, setRightTab] = useState<RightTab>('ASSETS');

  const router = useRouter();

  // Quick guide modal state & deflection
  const [activeGuide, setActiveGuide] = useState<GuideType>(null);
  const [kbSearchQuery, setKbSearchQuery] = useState('');
  const [deflectionSuccess, setDeflectionSuccess] = useState<string | null>(null);
  const [ticketKbContext, setTicketKbContext] = useState<{ id?: string; title?: string; reason?: string; comment?: string } | null>(null);

  const handleSelfResolved = async (guideKey: 'wifi' | 'printer' | 'password' | 'vpn') => {
    const item = GUIDE_ARTICLE_MAP[guideKey];
    try {
      await fetch(`/api/kb/${item.id}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isHelpful: true, isDeflection: true }),
      });
    } catch (err) {
      console.error('Failed to record deflection:', err);
    }
    setDeflectionSuccess(guideKey);
    setTimeout(() => {
      setActiveGuide(null);
      setDeflectionSuccess(null);
    }, 2200);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/portal/my-assets');
      if (!res.ok) throw new Error(isEn ? 'Failed to load employee portal data' : 'Không thể tải dữ liệu cổng nhân viên');
      const json = await res.json();
      if (json.success) {
        setData(json);
      } else {
        throw new Error(json.error || (isEn ? 'An error occurred' : 'Có lỗi xảy ra'));
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || (isEn ? 'Server connection error' : 'Lỗi kết nối máy chủ'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCopySerial = (serial: string) => {
    if (!serial) return;
    navigator.clipboard.writeText(serial);
    setCopiedSerial(serial);
    setTimeout(() => setCopiedSerial(null), 2000);
  };

  const openTicketForAsset = (asset: any) => {
    setSelectedAssetForTicket(asset.id);
    setInitialTicketTitle(`[${isEn ? 'Issue' : 'Sự cố'}] ${asset.name} (${asset.assetTag})`);
    setIsTicketModalOpen(true);
  };

  const openGeneralTicket = (prefilledTitle?: string) => {
    setSelectedAssetForTicket('');
    setInitialTicketTitle(prefilledTitle || '');
    setIsTicketModalOpen(true);
  };

  // Filtered tickets
  const filteredTickets = useMemo(() => {
    if (!data?.tickets) return [];
    let list = data.tickets;

    if (ticketFilter === 'OPEN') {
      list = list.filter((t) => t.status === 'OPEN' || t.status === 'IN_PROGRESS' || t.status === 'WAITING');
    } else if (ticketFilter === 'RESOLVED') {
      list = list.filter((t) => t.status === 'RESOLVED' || t.status === 'CLOSED');
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (t) =>
          t.ticketNumber?.toLowerCase().includes(q) ||
          t.title?.toLowerCase().includes(q) ||
          t.asset?.name?.toLowerCase().includes(q) ||
          t.asset?.assetTag?.toLowerCase().includes(q)
      );
    }

    return list;
  }, [data?.tickets, ticketFilter, searchQuery]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3 text-slate-500">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
        <p className="text-xs sm:text-sm font-medium">
          {isEn ? 'Loading your employee portal...' : 'Đang tải cổng thông tin nhân viên...'}
        </p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 max-w-xl mx-auto text-center mt-10 bg-white rounded-2xl border border-slate-200 shadow-sm">
        <div className="w-12 h-12 rounded-xl bg-red-50 border border-red-200 text-red-600 flex items-center justify-center mx-auto mb-3">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h2 className="text-base font-bold text-slate-900 mb-1">
          {isEn ? 'Unable to load information' : 'Không thể tải thông tin'}
        </h2>
        <p className="text-xs text-slate-600 mb-4">{error || (isEn ? 'Please check your connection or log in again.' : 'Vui lòng kiểm tra lại kết nối hoặc đăng nhập lại.')}</p>
        <button
          onClick={loadData}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-xs transition-colors cursor-pointer shadow-xs"
        >
          {isEn ? 'Try Again' : 'Thử lại'}
        </button>
      </div>
    );
  }

  const { user, assets, licenses, tickets, stats } = data;

  return (
    <div className="w-full space-y-5 animate-in fade-in duration-200">
      {/* 1. Page Header Bar - Consistent with other modules */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-slate-200/80">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <span className="p-2 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-xs">
              <UserCheck className="w-5 h-5" />
            </span>
            <span>{isEn ? 'Employee Self-Service Portal' : 'Cổng Tự Phục Vụ Nhân Viên'}</span>
            <span className="text-xs font-bold bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-full border border-blue-200">
              {isEn ? 'Self-Service 24/7' : 'Tự phục vụ 24/7'}
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {isEn
              ? 'Employee self-service portal: Look up assigned devices, software licenses, and submit IT tickets 24/7.'
              : 'Cổng tự phục vụ nhân viên: Tra cứu thiết bị, bản quyền phần mềm và gửi yêu cầu IT nhanh chóng 24/7.'}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <button
            onClick={() => openGeneralTicket()}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 hover:from-amber-600 hover:to-red-600 text-white font-bold text-xs shadow-sm shadow-orange-500/20 hover:shadow-orange-500/30 transition-all transform active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
          >
            <LifeBuoy className="w-4 h-4 animate-pulse" />
            <span>{isEn ? 'Report Issue / Request IT Help' : 'Báo hỏng / Yêu cầu IT hỗ trợ'}</span>
          </button>
          <Link
            href="/tickets"
            className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 font-semibold text-xs border border-slate-200 flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
          >
            <ExternalLink className="w-3.5 h-3.5 text-blue-600" />
            <span>{isEn ? 'All Tickets ↗' : 'Tất cả Tickets ↗'}</span>
          </Link>
        </div>
      </div>

      {/* 2. Employee Profile Banner - Clean, Full-Width & Balanced */}
      <div className="relative overflow-hidden rounded-2xl bg-white border border-slate-200/90 shadow-xs p-4 sm:p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 sm:gap-4">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 text-white flex items-center justify-center text-xl sm:text-2xl font-extrabold shadow-sm shadow-blue-500/20 border border-blue-100 shrink-0">
              {user.fullName ? user.fullName.charAt(0).toUpperCase() : 'U'}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-0.5">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                  {isEn ? 'Welcome' : 'Xin chào'}, {user.fullName}!
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1 shadow-2xs">
                  <ShieldCheck className="w-3 h-3 text-blue-600" />
                  <span>{user.role?.name || (isEn ? 'Staff' : 'Nhân viên')}</span>
                </span>
                {user.position && (
                  <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 font-semibold text-[11px]">
                    {user.position}
                  </span>
                )}
              </div>
              <div className="text-xs text-slate-600 flex items-center gap-2 flex-wrap">
                <span className="flex items-center gap-1 font-medium text-slate-700">
                  <Mail className="w-3 h-3 text-slate-400" />
                  <span>{user.email}</span>
                </span>
                {user.department && (
                  <>
                    <span className="text-slate-300">•</span>
                    <span className="px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 font-medium text-[11px] flex items-center gap-1">
                      <Building className="w-2.5 h-2.5 text-slate-400" />
                      <span>{user.department}</span>
                    </span>
                  </>
                )}
                {user.companyName && (
                  <>
                    <span className="text-slate-300">•</span>
                    <span className="text-slate-600 text-[11px] font-medium">
                      {user.companyName}
                    </span>
                  </>
                )}
                {user.phone && (
                  <>
                    <span className="text-slate-300">•</span>
                    <span className="text-slate-500 flex items-center gap-1 text-[11px]">
                      <Phone className="w-2.5 h-2.5 text-slate-400" />
                      <span>{user.phone}</span>
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Interactive KPI Stats Row - Standalone 4 Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <button
          type="button"
          onClick={() => setRightTab('ASSETS')}
          className={`p-3.5 sm:p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between ${
            rightTab === 'ASSETS'
              ? 'bg-blue-50/90 border-blue-300 ring-2 ring-blue-500/20 shadow-xs'
              : 'bg-white hover:bg-slate-50/80 border-slate-200/90 shadow-2xs'
          }`}
        >
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              {isEn ? 'Assigned Devices' : 'Thiết bị đang giữ'}
            </p>
            <p className="text-lg sm:text-2xl font-black text-slate-900 mt-0.5">
              {stats.totalAssets}{' '}
              <span className="text-xs font-normal text-slate-500">{isEn ? 'devices' : 'máy'}</span>
            </p>
            <span className="text-[11px] text-blue-600 font-medium hidden sm:inline">
              {isEn ? 'Assigned devices' : 'Laptop, máy bàn, phụ kiện'}
            </span>
          </div>
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 shadow-2xs">
            <Laptop className="w-5 h-5" />
          </div>
        </button>

        <button
          type="button"
          onClick={() => setRightTab('LICENSES')}
          className={`p-3.5 sm:p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between ${
            rightTab === 'LICENSES'
              ? 'bg-amber-50/90 border-amber-300 ring-2 ring-amber-500/20 shadow-xs'
              : 'bg-white hover:bg-slate-50/80 border-slate-200/90 shadow-2xs'
          }`}
        >
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              {isEn ? 'Software Licenses' : 'Bản quyền phần mềm'}
            </p>
            <p className="text-lg sm:text-2xl font-black text-slate-900 mt-0.5">
              {stats.totalLicenses}{' '}
              <span className="text-xs font-normal text-slate-500">{isEn ? 'licenses' : 'gói'}</span>
            </p>
            <span className="text-[11px] text-amber-600 font-medium hidden sm:inline">
              {isEn ? 'Assigned software' : 'M365, Adobe, CAD...'}
            </span>
          </div>
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 shadow-2xs">
            <Key className="w-5 h-5" />
          </div>
        </button>

        <button
          type="button"
          onClick={() => setTicketFilter(ticketFilter === 'OPEN' ? 'ALL' : 'OPEN')}
          className={`p-3.5 sm:p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between ${
            ticketFilter === 'OPEN'
              ? 'bg-purple-50/90 border-purple-300 ring-2 ring-purple-500/20 shadow-xs'
              : 'bg-white hover:bg-slate-50/80 border-slate-200/90 shadow-2xs'
          }`}
        >
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              {isEn ? 'Pending IT Tickets' : 'Phiếu IT đang xử lý'}
            </p>
            <p className="text-lg sm:text-2xl font-black text-purple-700 mt-0.5">
              {stats.openTickets}{' '}
              <span className="text-xs font-normal text-purple-600">{isEn ? 'tickets' : 'phiếu'}</span>
            </p>
            <span className="text-[11px] text-purple-600 font-medium hidden sm:inline">
              {isEn ? 'Under resolution' : 'Tiến độ xử lý sự cố'}
            </span>
          </div>
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0 shadow-2xs relative">
            <Clock className="w-5 h-5" />
            {stats.openTickets > 0 && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-purple-600 rounded-full border-2 border-white animate-pulse" />
            )}
          </div>
        </button>

        <button
          type="button"
          onClick={() => setTicketFilter(ticketFilter === 'RESOLVED' ? 'ALL' : 'RESOLVED')}
          className={`p-3.5 sm:p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between ${
            ticketFilter === 'RESOLVED'
              ? 'bg-emerald-50/90 border-emerald-300 ring-2 ring-emerald-500/20 shadow-xs'
              : 'bg-white hover:bg-slate-50/80 border-slate-200/90 shadow-2xs'
          }`}
        >
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              {isEn ? 'Resolved Tickets' : 'Phiếu đã hoàn thành'}
            </p>
            <p className="text-lg sm:text-2xl font-black text-emerald-700 mt-0.5">
              {stats.resolvedTickets}{' '}
              <span className="text-xs font-normal text-emerald-600">{isEn ? 'tickets' : 'phiếu'}</span>
            </p>
            <span className="text-[11px] text-emerald-600 font-medium hidden sm:inline">
              {isEn ? 'Resolved & closed' : 'Đã đóng & khắc phục'}
            </span>
          </div>
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 shadow-2xs">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </button>
      </div>

      {/* 3. Self-Service Knowledge Base & Quick Problem Solver */}
      <div className="bg-gradient-to-br from-blue-50/80 via-indigo-50/30 to-slate-50 border border-blue-100 rounded-3xl p-4 sm:p-5 shadow-xs space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-blue-500/20">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-black text-slate-900">
                  {isEn ? 'Self-Service IT Knowledge Base' : 'Cẩm Nang & Tự Xử Lý Sự Cố IT Nhanh'}
                </h2>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700">
                  <Sparkles className="w-3 h-3 text-blue-600" />
                  {isEn ? 'Instant self-help' : 'Giải quyết tức thì'}
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
                {isEn
                  ? 'Search technical guides or pick a quick solution to resolve issues without waiting for IT'
                  : 'Tra cứu cẩm nang kỹ thuật hoặc chọn giải pháp phổ biến để tự khắc phục ngay không cần chờ IT'}
              </p>
            </div>
          </div>

          <Link
            href="/kb"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 bg-white hover:bg-slate-50 px-3.5 py-1.5 rounded-xl border border-blue-200/80 shadow-2xs transition-all w-fit"
          >
            <span>{isEn ? 'View all KB guides' : 'Xem toàn bộ cẩm nang (KB)'}</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Quick KB Search Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (kbSearchQuery.trim()) {
              router.push(`/kb?search=${encodeURIComponent(kbSearchQuery.trim())}`);
            } else {
              router.push('/kb');
            }
          }}
          className="relative flex items-center"
        >
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
          <input
            type="text"
            value={kbSearchQuery}
            onChange={(e) => setKbSearchQuery(e.target.value)}
            placeholder={
              isEn
                ? 'Search issues (e.g. Printer setup, Password reset, WiFi connection, VPN, Outlook error)...'
                : 'Nhập sự cố bạn gặp (VD: Cài máy in tầng, Quên mật khẩu, Rớt mạng WiFi, Cài VPN, Lỗi Outlook)...'
            }
            className="w-full pl-10 pr-24 py-2.5 bg-white border border-slate-200/90 rounded-2xl text-xs sm:text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-2xs transition-all"
          />
          <button
            type="submit"
            className="absolute right-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer shadow-xs"
          >
            {isEn ? 'Search' : 'Tìm kiếm'}
          </button>
        </form>

        {/* 4 Most Common Quick Solution Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 pt-0.5">
          {/* 1. WiFi */}
          <button
            type="button"
            onClick={() => setActiveGuide('wifi')}
            className="p-3 sm:p-3.5 rounded-2xl bg-white hover:bg-blue-50/50 border border-slate-200/90 hover:border-blue-300 text-left transition-all cursor-pointer group shadow-2xs hover:shadow-xs flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Wifi className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
              <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                CORP-WIFI
              </span>
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-blue-700 transition-colors">
                {isEn ? 'Corporate Wi-Fi' : 'WiFi Công Ty & Khách'}
              </h4>
              <p className="text-[10px] sm:text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                {isEn ? 'SSID & login credentials' : 'Tên mạng, tài khoản đăng nhập'}
              </p>
            </div>
          </button>

          {/* 2. Printer */}
          <button
            type="button"
            onClick={() => setActiveGuide('printer')}
            className="p-3 sm:p-3.5 rounded-2xl bg-white hover:bg-amber-50/50 border border-slate-200/90 hover:border-amber-300 text-left transition-all cursor-pointer group shadow-2xs hover:shadow-xs flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Printer className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
              <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md">
                \\print-server
              </span>
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-amber-700 transition-colors">
                {isEn ? 'Network Printer' : 'Cài Đặt Máy In Mạng'}
              </h4>
              <p className="text-[10px] sm:text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                {isEn ? 'Connect floor printer & drivers' : 'Kết nối máy in tầng trong 10s'}
              </p>
            </div>
          </button>

          {/* 3. Password */}
          <button
            type="button"
            onClick={() => setActiveGuide('password')}
            className="p-3 sm:p-3.5 rounded-2xl bg-white hover:bg-purple-50/50 border border-slate-200/90 hover:border-purple-300 text-left transition-all cursor-pointer group shadow-2xs hover:shadow-xs flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Lock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
              <span className="text-[10px] font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-md">
                Ctrl+Alt+Del
              </span>
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-purple-700 transition-colors">
                {isEn ? 'Password Reset' : 'Đổi & Lấy Lại Mật Khẩu'}
              </h4>
              <p className="text-[10px] sm:text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                {isEn ? 'Windows AD & M365 account' : 'Tài khoản máy tính & M365'}
              </p>
            </div>
          </button>

          {/* 4. VPN */}
          <button
            type="button"
            onClick={() => setActiveGuide('vpn')}
            className="p-3 sm:p-3.5 rounded-2xl bg-white hover:bg-emerald-50/50 border border-slate-200/90 hover:border-emerald-300 text-left transition-all cursor-pointer group shadow-2xs hover:shadow-xs flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Globe className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                FortiClient
              </span>
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                {isEn ? 'Remote VPN Access' : 'Cài Đặt VPN Làm Từ Xa'}
              </h4>
              <p className="text-[10px] sm:text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                {isEn ? 'Secure work from home' : 'Truy cập mạng nội bộ an toàn'}
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* 4. Main Dashboard Body - Two-Column Balanced Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 items-start">
        {/* ================= LEFT COLUMN: My Support Tickets (Primary Area) ================= */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
            {/* Header with Title & Filter Controls */}
            <div className="p-4 sm:p-4.5 border-b border-slate-100 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-purple-50 border border-purple-200 text-purple-700 flex items-center justify-center shadow-2xs">
                    <LifeBuoy className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">
                      {isEn ? 'Your IT Support Requests' : 'Yêu Cầu Hỗ Trợ IT Của Bạn'}
                    </h2>
                    <p className="text-[11px] text-slate-500">
                      {isEn ? 'Track resolution status & communicate with IT technicians' : 'Theo dõi tiến độ xử lý và trao đổi với kỹ thuật viên IT'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => openGeneralTicket()}
                  className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{isEn ? 'New Ticket' : 'Tạo phiếu mới'}</span>
                </button>
              </div>

              {/* Filter Tabs & Search Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1">
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl w-fit">
                  <button
                    type="button"
                    onClick={() => setTicketFilter('ALL')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      ticketFilter === 'ALL'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {isEn ? 'All' : 'Tất cả'} ({tickets.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setTicketFilter('OPEN')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                      ticketFilter === 'OPEN'
                        ? 'bg-white text-purple-700 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                    <span>{isEn ? 'In Progress' : 'Đang xử lý'} ({stats.openTickets})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTicketFilter('RESOLVED')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                      ticketFilter === 'RESOLVED'
                        ? 'bg-white text-emerald-700 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span>{isEn ? 'Resolved' : 'Đã xong'} ({stats.resolvedTickets})</span>
                  </button>
                </div>

                <div className="relative flex-1 sm:max-w-xs">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder={isEn ? 'Search ticket # or title...' : 'Tìm theo mã hoặc tiêu đề...'}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:bg-white focus:ring-1 focus:ring-blue-500"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      aria-label={isEn ? 'Clear search' : 'Xóa tìm kiếm'}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Ticket List Body */}
            {filteredTickets.length === 0 ? (
              <div className="py-10 px-4 text-center text-slate-500 space-y-2">
                <div className="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center mx-auto border border-slate-200">
                  <LifeBuoy className="w-5 h-5" />
                </div>
                <p className="text-xs sm:text-sm font-semibold text-slate-700">
                  {searchQuery
                    ? (isEn ? 'No tickets found matching your search.' : 'Không tìm thấy phiếu nào phù hợp với tìm kiếm.')
                    : ticketFilter === 'OPEN'
                    ? (isEn ? 'You have no open IT tickets currently.' : 'Bạn hiện không có phiếu IT nào đang chờ xử lý.')
                    : ticketFilter === 'RESOLVED'
                    ? (isEn ? 'No resolved tickets yet.' : 'Chưa có phiếu nào đã hoàn thành.')
                    : (isEn ? 'You have not submitted any support tickets yet.' : 'Bạn chưa gửi yêu cầu hỗ trợ nào.')}
                </p>
                <div className="pt-1">
                  {searchQuery ? (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="text-xs text-blue-600 hover:text-blue-700 font-semibold cursor-pointer"
                    >
                      {isEn ? 'Clear search filter' : 'Xóa bộ lọc tìm kiếm'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => openGeneralTicket()}
                      className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{isEn ? 'Create support request' : 'Gửi yêu cầu hỗ trợ ngay'}</span>
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
                {filteredTickets.map((t) => {
                  const statusBadge =
                    t.status === 'OPEN'
                      ? { label: isEn ? 'Open' : 'Mới tiếp nhận', bg: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-500' }
                      : t.status === 'IN_PROGRESS'
                      ? { label: isEn ? 'In Progress' : 'Đang xử lý', bg: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' }
                      : t.status === 'WAITING'
                      ? { label: isEn ? 'Pending' : 'Chờ phản hồi', bg: 'bg-purple-50 text-purple-700 border-purple-200', dot: 'bg-purple-500' }
                      : { label: isEn ? 'Resolved' : 'Đã hoàn thành', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' };

                  const priorityBadge =
                    t.priority === 'URGENT'
                      ? { label: isEn ? 'Urgent' : 'Khẩn cấp', color: 'text-rose-700 bg-rose-50 border-rose-200' }
                      : t.priority === 'HIGH'
                      ? { label: isEn ? 'High' : 'Ưu tiên', color: 'text-orange-700 bg-orange-50 border-orange-200' }
                      : { label: isEn ? 'Normal' : 'Bình thường', color: 'text-slate-600 bg-slate-50 border-slate-200' };

                  return (
                    <div
                      key={t.id}
                      className="p-3.5 sm:p-4 hover:bg-slate-50/80 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                    >
                      <div className="space-y-1 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap text-xs">
                          <span className="font-mono font-bold text-blue-600 text-[11px] bg-blue-50/70 px-1.5 py-0.5 rounded border border-blue-100">
                            {t.ticketNumber}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1.5 ${statusBadge.bg}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${statusBadge.dot}`} />
                            <span>{statusBadge.label}</span>
                          </span>
                          {t.priority && (
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${priorityBadge.color}`}>
                              {priorityBadge.label}
                            </span>
                          )}
                          {t.rating ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                              <span>⭐</span>
                              <span>{t.rating}/5 {isEn ? 'stars' : 'sao'}</span>
                            </span>
                          ) : (t.status === 'RESOLVED' || t.status === 'CLOSED') ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 animate-pulse">
                              {isEn ? 'Awaiting CSAT' : 'Chờ bạn đánh giá CSAT'}
                            </span>
                          ) : null}
                          <span className="text-[11px] text-slate-400">
                            • {formatDate(t.createdAt)}
                          </span>
                        </div>

                        <h4 className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1">
                          {t.title}
                        </h4>

                        <div className="flex items-center gap-3 text-[11px] text-slate-500 flex-wrap">
                          {t.asset && (
                            <span className="flex items-center gap-1 font-medium text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                              <Laptop className="w-3 h-3 text-slate-400" />
                              <span>{t.asset.name} ({t.asset.assetTag})</span>
                            </span>
                          )}
                          {t._count?.comments > 0 && (
                            <span className="flex items-center gap-1 text-slate-500 font-medium">
                              <MessageSquare className="w-3 h-3 text-slate-400" />
                              <span>{t._count.comments} {isEn ? 'messages' : 'trao đổi'}</span>
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        {t.assignedTo ? (
                          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2 py-1 rounded-lg text-[11px] font-medium text-slate-700">
                            <div className="w-4 h-4 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[9px] font-bold">
                              {t.assignedTo.fullName?.charAt(0) || 'I'}
                            </div>
                            <span className="max-w-[120px] truncate">{t.assignedTo.fullName}</span>
                          </div>
                        ) : (
                          <span className="text-[10px] font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                            {isEn ? 'Awaiting IT' : 'Chờ tiếp nhận'}
                          </span>
                        )}

                        {(t.status === 'RESOLVED' || t.status === 'CLOSED') && !t.rating && (
                          <Link
                            href={`/tickets?id=${t.id}`}
                            className="px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-all flex items-center gap-1 shadow-xs hover:scale-[1.02]"
                            title={isEn ? 'Rate satisfaction CSAT' : 'Đánh giá mức độ hài lòng CSAT'}
                          >
                            <span>⭐</span>
                            <span>{isEn ? 'Rate IT' : 'Đánh giá'}</span>
                          </Link>
                        )}

                        <Link
                          href={`/tickets?id=${t.id}`}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 text-xs font-semibold border border-slate-200 transition-colors flex items-center gap-1 shadow-2xs"
                          title={isEn ? 'View ticket details' : 'Xem chi tiết'}
                        >
                          <span>{isEn ? 'View' : 'Chi tiết'}</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ================= RIGHT COLUMN: Assigned Assets/Licenses & Helpdesk Contacts ================= */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-4">
          {/* Card 1: Tabbed Assets & Licenses Widget */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
            {/* Segmented Tab Header */}
            <div className="p-3 sm:p-3.5 border-b border-slate-100 flex items-center justify-between gap-2">
              <div className="flex items-center p-0.5 bg-slate-100 rounded-xl border border-slate-200/60 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setRightTab('ASSETS')}
                  className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    rightTab === 'ASSETS'
                      ? 'bg-white text-blue-700 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Laptop className="w-3.5 h-3.5" />
                  <span>{isEn ? 'Devices' : 'Thiết bị'} ({assets.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRightTab('LICENSES')}
                  className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    rightTab === 'LICENSES'
                      ? 'bg-white text-amber-700 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Key className="w-3.5 h-3.5" />
                  <span>{isEn ? 'Licenses' : 'Bản quyền'} ({licenses.length})</span>
                </button>
              </div>

              {rightTab === 'ASSETS' && assets.length > 0 && (
                <button
                  type="button"
                  onClick={() => openGeneralTicket(isEn ? '[Request] New work equipment' : '[Yêu cầu] Cấp bổ sung thiết bị')}
                  className="hidden sm:inline-flex text-[11px] font-semibold text-blue-600 hover:text-blue-700 items-center gap-0.5 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>{isEn ? 'Request device' : 'Xin cấp thêm'}</span>
                </button>
              )}
            </div>

            {/* Tab Body */}
            <div className="p-3 sm:p-3.5">
              {rightTab === 'ASSETS' ? (
                assets.length === 0 ? (
                  /* Compact, beautiful empty state for Devices (NO MORE GIANT DESERT!) */
                  <div className="py-4 px-3 rounded-xl bg-slate-50/70 border border-slate-200/80 text-center space-y-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mx-auto border border-blue-100">
                      <Laptop className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-800">
                        {isEn ? 'No devices currently assigned to you.' : 'Hiện chưa có thiết bị nào bàn giao cho bạn.'}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {isEn ? 'Need a laptop or monitor? Request IT to assign one.' : 'Bạn cần máy tính hoặc màn hình? Hãy gửi yêu cầu bàn giao.'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => openGeneralTicket(isEn ? '[Request] New work device handover' : '[Yêu cầu] Bàn giao thiết bị làm việc mới')}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer shadow-xs inline-flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{isEn ? 'Request Device Allocation' : 'Yêu cầu cấp máy / thiết bị'}</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-0.5">
                    {assets.map((item) => {
                      const asset = item.asset;
                      const specs = asset.specs || {};
                      return (
                        <div
                          key={item.id}
                          className="rounded-xl bg-slate-50/60 hover:bg-slate-50 border border-slate-200 p-3 transition-all space-y-2"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200">
                              {asset.assetTag}
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              <span>{isEn ? 'In Use' : 'Đang sử dụng'}</span>
                            </span>
                          </div>

                          <div>
                            <h4 className="text-xs font-bold text-slate-900 line-clamp-1">{asset.name}</h4>
                            <p className="text-[11px] text-slate-500">
                              {asset.brand} {asset.model ? `• ${asset.model}` : ''}
                            </p>
                          </div>

                          {/* Serial with copy */}
                          {asset.serialNumber && (
                            <div className="flex items-center justify-between text-[11px] bg-white px-2 py-1 rounded border border-slate-200">
                              <span className="text-slate-400 font-medium">Serial:</span>
                              <div className="flex items-center gap-1 font-mono font-bold text-slate-800 text-[10px]">
                                <span>{asset.serialNumber}</span>
                                <button
                                  type="button"
                                  onClick={() => handleCopySerial(asset.serialNumber)}
                                  className="p-0.5 hover:text-blue-600 transition-colors cursor-pointer"
                                  title={isEn ? 'Copy serial' : 'Sao chép Serial'}
                                >
                                  {copiedSerial === asset.serialNumber ? (
                                    <Check className="w-3 h-3 text-emerald-600" />
                                  ) : (
                                    <Copy className="w-3 h-3 text-slate-400" />
                                  )}
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Handover & Location */}
                          <div className="text-[10px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-200/60">
                            <span>
                              {isEn ? 'Assigned:' : 'Bàn giao:'}{' '}
                              <strong className="text-slate-700 font-medium">{item.assignedAt ? formatDate(item.assignedAt) : 'N/A'}</strong>
                            </span>
                            {asset.location && (
                              <span className="flex items-center gap-0.5 text-slate-600 font-medium">
                                <MapPin className="w-2.5 h-2.5 text-slate-400" />
                                <span>{asset.location.name}</span>
                              </span>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="grid grid-cols-2 gap-1.5 pt-1">
                            <button
                              type="button"
                              onClick={() => openTicketForAsset(asset)}
                              className="px-2 py-1 rounded bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                            >
                              <LifeBuoy className="w-3 h-3 text-orange-600" />
                              <span>{isEn ? 'Report Issue' : 'Báo hỏng'}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedAssetForHandover(asset);
                                setIsHandoverModalOpen(true);
                              }}
                              className="px-2 py-1 rounded bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                            >
                              <FileText className="w-3 h-3 text-blue-600" />
                              <span>{isEn ? 'Handover Slip' : 'Biên bản'}</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )
              ) : (
                licenses.length === 0 ? (
                  /* Compact, beautiful empty state for Licenses */
                  <div className="py-4 px-3 rounded-xl bg-slate-50/70 border border-slate-200/80 text-center space-y-2">
                    <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-100">
                      <Key className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-800">
                        {isEn ? 'No software licenses currently assigned.' : 'Chưa có bản quyền phần mềm nào được gán.'}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {isEn ? 'Need Microsoft 365, Adobe, or CAD licenses?' : 'Cần tài khoản Microsoft 365, Adobe, hoặc CAD?'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => openGeneralTicket(isEn ? '[Request] Software license assignment' : '[Yêu cầu] Cấp bản quyền phần mềm')}
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer shadow-xs inline-flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{isEn ? 'Request License' : 'Yêu cầu cấp phần mềm'}</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-0.5">
                    {licenses.map((item) => {
                      const lic = item.license;
                      return (
                        <div
                          key={item.id}
                          className="rounded-xl bg-slate-50/60 hover:bg-slate-50 border border-slate-200 p-3 transition-all space-y-1.5"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                              {lic.licenseType || 'SUBSCRIPTION'}
                            </span>
                            <span className="text-[10px] text-slate-500 font-medium">
                              {isEn ? 'Assigned:' : 'Gán:'} {item.assignedAt ? formatDate(item.assignedAt) : 'N/A'}
                            </span>
                          </div>

                          <div>
                            <h4 className="text-xs font-bold text-slate-900 line-clamp-1">{lic.name}</h4>
                            {lic.vendor?.name && (
                              <p className="text-[11px] text-slate-500 font-medium">{lic.vendor.name}</p>
                            )}
                          </div>

                          {lic.expiryDate && (
                            <div className="text-[10px] flex items-center justify-between text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200">
                              <span className="text-slate-400 font-medium">{isEn ? 'Expires:' : 'Hạn dùng:'}</span>
                              <span className="font-bold text-amber-800">{formatDate(lic.expiryDate)}</span>
                            </div>
                          )}

                          {item.notes && (
                            <p className="text-[10px] text-slate-500 italic pt-0.5">
                              {isEn ? 'Notes:' : 'Ghi chú:'} {item.notes}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )
              )}
            </div>
          </div>

          {/* Card 2: IT Desk Direct Contact & Quick Help Shortcuts (Fills space cleanly!) */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-4 space-y-3.5">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <div className="w-6 h-6 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center">
                <Phone className="w-3.5 h-3.5" />
              </div>
              <h3 className="text-xs font-bold text-slate-900">
                {isEn ? 'IT Support Contacts' : 'Kênh Hỗ Trợ IT Trực Tiếp'}
              </h3>
            </div>

            <div className="grid grid-cols-1 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-slate-600 font-medium">{isEn ? 'IT Hotline:' : 'Hotline nội bộ:'}</span>
                </div>
                <span className="font-mono font-bold text-slate-900">Ext: 101 / 102</span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-blue-600" />
                  <span className="text-slate-600 font-medium">{isEn ? 'Email:' : 'Email hỗ trợ:'}</span>
                </div>
                <span className="font-mono font-medium text-slate-800 text-[11px]">it-support@company.internal</span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-purple-600" />
                  <span className="text-slate-600 font-medium">{isEn ? 'Support Hours:' : 'Giờ làm việc:'}</span>
                </div>
                <span className="font-medium text-slate-800 text-[11px]">08:00 - 17:30 (T2 - T7)</span>
              </div>
            </div>

            {/* Quick IT Guides Mini Tiles */}
            <div className="pt-2 border-t border-slate-100 space-y-2">
              <h4 className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                <HelpCircle className="w-3 h-3 text-blue-600" />
                <span>{isEn ? 'Quick Self-Help Guides' : 'Hướng dẫn kỹ thuật thường dùng'}</span>
              </h4>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setActiveGuide('wifi')}
                  className="p-2.5 rounded-xl bg-blue-50/50 hover:bg-blue-50 border border-blue-200/70 text-left transition-all cursor-pointer group"
                >
                  <Wifi className="w-4 h-4 text-blue-600 mb-1 group-hover:scale-110 transition-transform" />
                  <p className="text-xs font-bold text-slate-900">{isEn ? 'Company Wifi' : 'Wifi Doanh Nghiệp'}</p>
                  <p className="text-[10px] text-slate-500 line-clamp-1">{isEn ? 'SSID & Credentials' : 'Tên mạng & cài đặt'}</p>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveGuide('printer')}
                  className="p-2.5 rounded-xl bg-amber-50/50 hover:bg-amber-50 border border-amber-200/70 text-left transition-all cursor-pointer group"
                >
                  <Printer className="w-4 h-4 text-amber-600 mb-1 group-hover:scale-110 transition-transform" />
                  <p className="text-xs font-bold text-slate-900">{isEn ? 'Office Printer' : 'Cài Đặt Máy In'}</p>
                  <p className="text-[10px] text-slate-500 line-clamp-1">{isEn ? 'Network print setup' : 'Kết nối in nội bộ'}</p>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveGuide('password')}
                  className="p-2.5 rounded-xl bg-purple-50/50 hover:bg-purple-50 border border-purple-200/70 text-left transition-all cursor-pointer group"
                >
                  <Lock className="w-4 h-4 text-purple-600 mb-1 group-hover:scale-110 transition-transform" />
                  <p className="text-xs font-bold text-slate-900">{isEn ? 'Reset Password' : 'Đổi Mật Khẩu'}</p>
                  <p className="text-[10px] text-slate-500 line-clamp-1">{isEn ? 'AD & M365 accounts' : 'Tài khoản miền / M365'}</p>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveGuide('vpn')}
                  className="p-2.5 rounded-xl bg-emerald-50/50 hover:bg-emerald-50 border border-emerald-200/70 text-left transition-all cursor-pointer group"
                >
                  <Globe className="w-4 h-4 text-emerald-600 mb-1 group-hover:scale-110 transition-transform" />
                  <p className="text-xs font-bold text-slate-900">{isEn ? 'Remote VPN' : 'Kết Nối VPN'}</p>
                  <p className="text-[10px] text-slate-500 line-clamp-1">{isEn ? 'Secure remote access' : 'Làm việc từ xa an toàn'}</p>
                </button>
              </div>
            </div>
          </div>

          {/* Card 3: PWA / Mobile Application Prompt */}
          <PWAInstallPrompt className="mt-2" />
        </div>
      </div>

      {/* Quick Guide Popup Modal */}
      {activeGuide && (
        <div role="dialog" aria-modal="true" aria-label={isEn ? 'Quick Guide' : 'Hướng dẫn nhanh'} className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  {activeGuide === 'wifi' && <Wifi className="w-4 h-4" />}
                  {activeGuide === 'printer' && <Printer className="w-4 h-4" />}
                  {activeGuide === 'password' && <Lock className="w-4 h-4" />}
                  {activeGuide === 'vpn' && <Globe className="w-4 h-4" />}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {activeGuide === 'wifi' && (isEn ? 'Corporate Wi-Fi Setup' : 'Hướng Dẫn Kết Nối Wifi Doanh Nghiệp')}
                    {activeGuide === 'printer' && (isEn ? 'Office Network Printer' : 'Hướng Dẫn Kết Nối Máy In Mạng')}
                    {activeGuide === 'password' && (isEn ? 'Change Account Password' : 'Hướng Dẫn Đổi Mật Khẩu')}
                    {activeGuide === 'vpn' && (isEn ? 'Remote Access VPN' : 'Hướng Dẫn Kết Nối Mạng VPN Nội Bộ')}
                  </h3>
                  <p className="text-[11px] text-slate-500">{isEn ? 'Official IT department guide' : 'Tài liệu chuẩn từ phòng Công Nghệ Thông Tin'}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveGuide(null)}
                aria-label={isEn ? 'Close guide' : 'Đóng hướng dẫn'}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-slate-700 leading-relaxed space-y-3">
              {activeGuide === 'wifi' && (
                <>
                  <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl space-y-1">
                    <p className="font-bold text-blue-900">Tên mạng Wifi: <span className="font-mono">CORP-WIFI</span></p>
                    <p className="text-slate-600">Bảo mật: <strong>WPA2/WPA3 Enterprise (802.1X)</strong></p>
                  </div>
                  <ol className="list-decimal list-inside space-y-1.5 text-slate-600">
                    <li>Bật Wifi trên máy tính/điện thoại, chọn mạng <strong>CORP-WIFI</strong>.</li>
                    <li>Đăng nhập bằng <strong>Tài khoản Email công ty</strong> (VD: <code>user@company.domain</code>) và mật khẩu máy tính của bạn.</li>
                    <li>Nếu máy hỏi xác nhận chứng chỉ mạng (Certificate Trust), bấm <strong>Connect / Trust</strong> để hoàn tất.</li>
                  </ol>
                </>
              )}

              {activeGuide === 'printer' && (
                <>
                  <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl space-y-1">
                    <p className="font-bold text-amber-900">Địa chỉ máy in mạng: <span className="font-mono">\\print-server\Printer-Name</span></p>
                    <p className="text-slate-600">Vị trí: <strong>Khu vực văn phòng</strong></p>
                  </div>
                  <ol className="list-decimal list-inside space-y-1.5 text-slate-600">
                    <li>Nhấn tổ hợp phím <strong>Windows + R</strong> để mở hộp thoại Run.</li>
                    <li>Gõ vào <code>\\print-server\Printer-Name</code> rồi nhấn Enter.</li>
                    <li>Máy sẽ tự động tải và cài driver máy in trong 30 giây.</li>
                    <li>Mở file tài liệu bất kỳ và chọn máy in vừa cài để in.</li>
                  </ol>
                </>
              )}

              {activeGuide === 'password' && (
                <>
                  <div className="p-3 bg-purple-50/70 border border-purple-200 rounded-xl space-y-1">
                    <p className="font-bold text-purple-900">Quy tắc mật khẩu an toàn:</p>
                    <p className="text-slate-600">Tối thiểu 8 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt (@, #, $).</p>
                  </div>
                  <ul className="list-disc list-inside space-y-1.5 text-slate-600">
                    <li><strong>Khi ở văn phòng:</strong> Nhấn <code>Ctrl + Alt + Delete</code> trên máy tính ➔ Chọn <strong>Change a password</strong> ➔ Nhập mật khẩu cũ và mật khẩu mới.</li>
                    <li><strong>Qua Microsoft 365:</strong> Truy cập <a href="https://myaccount.microsoft.com" target="_blank" rel="noreferrer" className="text-blue-600 underline font-semibold">myaccount.microsoft.com</a> ➔ Vào mục <em>Password</em> để đổi.</li>
                    <li>Nếu quên mật khẩu hoàn toàn, vui lòng liên hệ phòng IT (Hotline 101) để reset.</li>
                  </ul>
                </>
              )}

              {activeGuide === 'vpn' && (
                <>
                  <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-1">
                    <p className="font-bold text-emerald-900">Máy chủ VPN công ty: <span className="font-mono">vpn.company.domain</span></p>
                    <p className="text-slate-600">Phần mềm khuyên dùng: <strong>OpenVPN Client</strong> hoặc <strong>FortiClient</strong>.</p>
                  </div>
                  <ol className="list-decimal list-inside space-y-1.5 text-slate-600">
                    <li>Cài đặt ứng dụng VPN được IT bàn giao trên máy tính.</li>
                    <li>Mở ứng dụng, nhập địa chỉ máy chủ <code>vpn.company.domain</code>.</li>
                    <li>Nhập tài khoản đăng nhập và mã xác thực 2 bước (OTP).</li>
                    <li>Sau khi kết nối Connected, bạn có thể truy cập phần mềm nội bộ từ xa.</li>
                  </ol>
                </>
              )}
            </div>

            {deflectionSuccess === activeGuide ? (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-1.5 animate-in zoom-in-95">
                <div className="w-9 h-9 mx-auto rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <p className="font-bold text-xs sm:text-sm text-emerald-800">
                  {isEn ? 'Awesome! Problem solved!' : 'Tuyệt vời! Bạn đã tự xử lý sự cố thành công!'}
                </p>
                <p className="text-[11px] text-emerald-600">
                  {isEn
                    ? 'Thank you for resolving without an IT ticket 🎉'
                    : 'Hệ thống đã ghi nhận bài viết hữu ích. Cảm ơn bạn đã tự khắc phục mà không cần mở ticket IT 🎉'}
                </p>
              </div>
            ) : (
              <div className="pt-3 border-t border-slate-100 space-y-2">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
                  <Link
                    href={`/kb?search=${encodeURIComponent(activeGuide)}`}
                    onClick={() => setActiveGuide(null)}
                    className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1 self-start sm:self-center"
                  >
                    <span>{isEn ? 'View full KB article' : 'Xem bài viết đầy đủ trong KB'}</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>

                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        const guideKey = activeGuide;
                        const guideInfo = GUIDE_ARTICLE_MAP[guideKey];
                        setActiveGuide(null);
                        setSelectedAssetForTicket('');
                        setInitialTicketTitle(`[${guideKey.toUpperCase()}] ${guideInfo.ticketTitle}`);
                        setTicketKbContext({
                          id: guideInfo.id,
                          title: guideInfo.ticketTitle,
                          reason: isEn ? 'Self-service troubleshooting unresolved' : 'Nhân viên đã đọc cẩm nang tự phục vụ nhưng chưa khắc phục được',
                        });
                        setIsTicketModalOpen(true);
                      }}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                    >
                      {isEn ? 'Still need help? Create Ticket' : 'Chưa được? Gửi Ticket'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelfResolved(activeGuide)}
                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer shadow-xs inline-flex items-center gap-1.5"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>{isEn ? 'Resolved by this!' : 'Đã tự xử lý xong!'}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Shared Unified Ticket Creation Modal */}
      <CreateTicketModal
        isOpen={isTicketModalOpen}
        onClose={() => {
          setIsTicketModalOpen(false);
          setSelectedAssetForTicket('');
          setInitialTicketTitle('');
          setTicketKbContext(null);
        }}
        currentUser={user}
        userAssets={assets.map((a) => a.asset)}
        initialAssetId={selectedAssetForTicket}
        initialTitle={initialTicketTitle}
        kbArticleId={ticketKbContext?.id}
        kbArticleTitle={ticketKbContext?.title}
        kbFeedbackReason={ticketKbContext?.reason}
        kbFeedbackComment={ticketKbContext?.comment}
        onSuccess={() => {
          loadData();
        }}
      />

      {/* Asset Handover Modal */}
      {selectedAssetForHandover && (
        <AssetHandoverModal
          isOpen={isHandoverModalOpen}
          onClose={() => {
            setIsHandoverModalOpen(false);
            setSelectedAssetForHandover(null);
          }}
          asset={selectedAssetForHandover}
          initialMode="HANDOVER"
        />
      )}
    </div>
  );
}
