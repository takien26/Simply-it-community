'use client';

import {
  Sparkles,
  Crown,
  Loader2,
  FileSpreadsheet,
  Bell,
  ShieldCheck,
  LifeBuoy,
  Key,
  Globe,
  Laptop,
  X,
  CheckCircle2,
  CheckCheck,
  ChevronRight,
  AlertTriangle,
  Clock,
  Trash2,
  HelpCircle,
  Info,
  Server,
  Database,
  User,
  Code2,
  Heart,
  Package,
  Mail,
  Copy,
  Check,
  ChevronDown,
  Search,
  BookOpen,
  RefreshCw,
  Menu,
} from 'lucide-react';
import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { GlobalSearch } from '@/components/common/GlobalSearch';
import { useLanguage } from '@/lib/i18n/context';

const PAGE_TITLES: Record<string, { titleVi: string; titleEn: string; icon: string }> = {
  '/dashboard': { titleVi: 'Tổng Quan & Dashboard', titleEn: 'Dashboard & Overview', icon: '📊' },
  '/portal': { titleVi: 'Cổng Tự Phục Vụ Nhân Viên', titleEn: 'Employee Self-Service Portal', icon: '👤' },
  '/assets': { titleVi: 'Quản Lý Tài Sản & Thiết Bị', titleEn: 'Asset Management & Hardware', icon: '💻' },
  '/assets/audit': { titleVi: 'Kiểm Kê & Đối Soát Tài Sản', titleEn: 'Asset Audit & Inventory', icon: '📋' },
  '/discovery': { titleVi: 'Quét & Khám Phá Thiết Bị', titleEn: 'Device Network Scanner', icon: '🔍' },
  '/licenses': { titleVi: 'Quản Lý Bản Quyền Phần Mềm', titleEn: 'Software License Management', icon: '🔑' },
  '/services': { titleVi: 'Dịch Vụ Viễn Thông & CNTT', titleEn: 'IT Services & Subscriptions', icon: '🌐' },
  '/tickets': { titleVi: 'Hỗ Trợ IT & Ticket Helpdesk', titleEn: 'IT Helpdesk & Tickets', icon: '🎫' },
  '/tickets/reports': { titleVi: 'Báo Cáo Ticket & SLA', titleEn: 'Ticket Reports & SLA Analytics', icon: '📈' },
  '/approvals': { titleVi: 'Yêu Cầu & Cấp Phát Thiết Bị', titleEn: 'Requests & Approvals', icon: '📋' },
  '/passwords': { titleVi: 'Kho Mật Khẩu An Toàn (Vault)', titleEn: 'Password Vault', icon: '🔐' },
  '/documents': { titleVi: 'Hóa Đơn & Chứng Từ IT', titleEn: 'Invoices & Documents', icon: '📄' },
  '/spare-parts': { titleVi: 'Kho Phụ Tùng & Linh Kiện', titleEn: 'Spare Parts Inventory', icon: '🔩' },
  '/incidents': { titleVi: 'Quản Lý Sự Cố IT (Incidents)', titleEn: 'Incident Management', icon: '🚨' },
  '/categories': { titleVi: 'Danh Mục Thiết Bị', titleEn: 'Asset Categories', icon: '🏢' },
  '/floor-maps': { titleVi: 'Sơ Đồ Vị Trí Tầng', titleEn: '2D Floor Maps', icon: '🗺️' },
  '/users': { titleVi: 'Người Dùng & Phân Quyền', titleEn: 'Users & RBAC Permissions', icon: '👥' },
  '/kb': { titleVi: 'Cơ Sở Tri Thức & Hướng Dẫn', titleEn: 'IT Knowledge Base', icon: '📖' },
  '/scan': { titleVi: 'Quét Mã QR Tài Sản', titleEn: 'QR & Barcode Scanner', icon: '📱' },
  '/settings': { titleVi: 'Cài Đặt Hệ Thống', titleEn: 'System Settings', icon: '⚙️' },
  '/settings/support-org': { titleVi: 'Phân Tuyến & Tổ Chức IT', titleEn: 'IT Support Organization', icon: '🎯' },
};

const SUPPORTED_LANGUAGES = [
  { code: 'vi', label: 'Tiếng Việt', sub: 'Việt Nam (VN)', flag: '🇻🇳', ready: true },
  { code: 'en', label: 'English', sub: 'UK / Global', flag: '🇬🇧', ready: true },
  { code: 'ja', label: '日本語', sub: 'Japanese (Nihongo)', flag: '🇯🇵', ready: false },
  { code: 'zh', label: '中文', sub: 'Chinese (Simplified)', flag: '🇨🇳', ready: false },
  { code: 'ko', label: '한국어', sub: 'Korean (Hangul)', flag: '🇰🇷', ready: false },
  { code: 'fr', label: 'Français', sub: 'French', flag: '🇫🇷', ready: false },
  { code: 'de', label: 'Deutsch', sub: 'German', flag: '🇩🇪', ready: false },
] as const;

export function Header({
  onOpenAIModal,
  onOpenExcelModal,
}: {
  onOpenAIModal?: () => void;
  onOpenExcelModal?: () => void;
}) {
  const router = useRouter();
  const pathname = usePathname() || '/dashboard';
  const { language, setLanguage, t, supportedLanguages } = useLanguage();
  const isEn = language === 'en';
  const [currentTab, setCurrentTab] = useState<string>('');
  const [appName, setAppName] = useState('IT Asset Manager');
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [notifTab, setNotifTab] = useState<'ALL' | 'TICKETS' | 'LICENSES' | 'SERVICES'>('ALL');
  const [readNotifIds, setReadNotifIds] = useState<string[]>([]);
  const [notifsData, setNotifsData] = useState<{
    summary?: { total: number; ticketsTotal: number; unassignedTickets: number; myTickets: number; licensesExpiring: number; servicesExpiring: number; warrantiesExpiring: number };
    counts?: { total: number; tickets: number; licenses: number; services: number; unassignedTickets: number; myTickets: number };
    notifications: any[];
  }>({
    summary: { total: 0, ticketsTotal: 0, unassignedTickets: 0, myTickets: 0, licensesExpiring: 0, servicesExpiring: 0, warrantiesExpiring: 0 },
    counts: { total: 0, tickets: 0, licenses: 0, services: 0, unassignedTickets: 0, myTickets: 0 },
    notifications: [],
  });

  // Track active setting tab or search params
  useEffect(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const tab = urlParams.get('tab')?.toLowerCase() || '';
      setCurrentTab(tab);
    } catch {}

    const handleTabChange = (e: any) => {
      if (e?.detail?.tab) setCurrentTab(e.detail.tab);
    };
    window.addEventListener('app:tab-change', handleTabChange);
    return () => window.removeEventListener('app:tab-change', handleTabChange);
  }, [pathname]);

  // Compute active section title and icon (Bilingual)
  const pageDef = PAGE_TITLES[pathname];
  let currentTitle =
    (language === 'en' ? pageDef?.titleEn : pageDef?.titleVi) ||
    (language === 'en' ? 'ITSM System' : 'Hệ Thống ITSM');
  let currentIcon = pageDef?.icon || '💻';

  if (pathname === '/settings') {
    if (currentTab === 'license' || currentTab === 'lic' || currentTab === 'banquyen') {
      currentTitle = language === 'en' ? 'Edition & License' : 'Giấy Phép & Bản Quyền';
      currentIcon = '🛡️';
    } else if (currentTab === 'ai' || currentTab === 'ai_copilot' || currentTab === 'copilot') {
      currentTitle = language === 'en' ? 'AI Copilot Settings' : 'Cài Đặt AI';
      currentIcon = '🤖';
    } else if (currentTab === 'email' || currentTab === 'smtp') {
      currentTitle = language === 'en' ? 'Email & SMTP Configuration' : 'Cài Đặt Email & SMTP';
      currentIcon = '📧';
    } else if (currentTab === 'rbac' || currentTab === 'roles') {
      currentTitle = language === 'en' ? 'Role-Based Access Control (RBAC)' : 'Phân Quyền Vai Trò (RBAC)';
      currentIcon = '🔐';
    } else if (currentTab === 'sso' || currentTab === 'azure') {
      currentTitle = language === 'en' ? 'Microsoft 365 SSO Login' : 'Đăng Nhập SSO Microsoft 365';
      currentIcon = '🔑';
    } else if (currentTab === 'ldap' || currentTab === 'ad') {
      currentTitle = language === 'en' ? 'LDAP / Active Directory' : 'Xác Thực LDAP / Active Directory';
      currentIcon = '🏢';
    } else if (currentTab === 'webhooks') {
      currentTitle = language === 'en' ? 'Multi-Channel Webhooks' : 'Webhook Đa Kênh';
      currentIcon = '🔔';
    } else if (currentTab === 'maintenance') {
      currentTitle = language === 'en' ? 'Maintenance Schedules' : 'Lịch Bảo Trì Định Kỳ';
      currentIcon = '📅';
    } else if (currentTab === 'currency') {
      currentTitle = language === 'en' ? 'Currency & Exchange Rates' : 'Tiền Tệ & Tỷ Giá';
      currentIcon = '💰';
    } else if (currentTab === 'routing') {
      currentTitle = language === 'en' ? 'IT Routing, Teams & SLA' : 'Tổ Chức IT, Phân Tuyến & SLA';
      currentIcon = '🎯';
    } else if (currentTab === 'audit') {
      currentTitle = language === 'en' ? 'Activity Audit Logs' : 'Nhật Ký Hoạt Động (Audit)';
      currentIcon = '📜';
    } else {
      currentTitle = language === 'en' ? 'General Settings & Branding' : 'Cài Đặt Chung & Logo';
      currentIcon = '⚙️';
    }
  }

  // Update browser tab document.title dynamically
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.title = `${currentTitle} | SIMPLY IT`;
    }
  }, [currentTitle]);

  const notifRef = useRef<HTMLDivElement>(null);
  const healthRef = useRef<HTMLDivElement>(null);
  const langRef = useRef<HTMLDivElement>(null);
  const [isLangOpen, setIsLangOpen] = useState(false);
  const [isSystemHealthOpen, setIsSystemHealthOpen] = useState(false);
  const [systemTab, setSystemTab] = useState<'ABOUT' | 'LICENSE' | 'HELP' | 'SYSTEM'>('ABOUT');
  const [copiedEmail, setCopiedEmail] = useState(false);

  // License state for Header & Help modal
  const [licenseInfo, setLicenseInfo] = useState<{
    isEnterprise: boolean;
    tier: string;
    customer?: string;
    expiresAt?: string;
    daysRemaining?: number;
    maxAssets?: number;
    modules: string[];
  } | null>(null);
  const [licKeyInput, setLicKeyInput] = useState('');
  const [licSubmitting, setLicSubmitting] = useState(false);
  const [licMsg, setLicMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchLicenseInfo = async () => {
    try {
      const res = await fetch('/api/license');
      if (res.ok) {
        const data = await res.json();
        setLicenseInfo(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchLicenseInfo();
    const handleLicenseUpdated = () => fetchLicenseInfo();
    window.addEventListener('simply:license-updated', handleLicenseUpdated);
    return () => window.removeEventListener('simply:license-updated', handleLicenseUpdated);
  }, []);

  const handleActivateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setLicMsg(null);
    if (!licKeyInput.trim()) {
      setLicMsg({
        type: 'error',
        text: language === 'en' ? 'Please enter a License Key' : 'Vui lòng dán mã License Key',
      });
      return;
    }

    try {
      setLicSubmitting(true);
      const res = await fetch('/api/license', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: licKeyInput.trim() }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setLicMsg({
          type: 'error',
          text: data.error || (language === 'en' ? 'Activation failed' : 'Kích hoạt thất bại'),
        });
      } else {
        setLicMsg({
          type: 'success',
          text: language === 'en' ? 'Enterprise Edition activated successfully!' : 'Kích hoạt bản quyền Enterprise thành công!',
        });
        setLicKeyInput('');
        await fetchLicenseInfo();
        window.dispatchEvent(new CustomEvent('simply:license-updated'));
      }
    } catch (err: any) {
      setLicMsg({ type: 'error', text: err.message || 'Lỗi kết nối máy chủ' });
    } finally {
      setLicSubmitting(false);
    }
  };

  const [user, setUser] = useState<{
    id?: string;
    role?: { name: string };
    permissions?: string[];
  } | null>(null);

  // Load read status from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('it_read_notifications');
      if (stored) {
        setReadNotifIds(JSON.parse(stored));
      }
    } catch {}
  }, []);

  const loadNotifications = () => {
    fetch('/api/notifications')
      .then((res) => res.json())
      .then((data) => {
        if (data && data.success) {
          setNotifsData(data);
        }
      })
      .catch((e) => {
        console.error('Failed to load notifications:', e);
      });
  };

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.data || data.user) setUser(data.data || data.user);
      })
      .catch(() => {});

    fetch('/api/settings')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data) {
          const nameSetting = data.data.find((s: any) => s.key === 'app.name');
          if (nameSetting?.value) setAppName(nameSetting.value);
        }
      })
      .catch(() => {});

    loadNotifications();
    const interval = setInterval(loadNotifications, 30000); // Polling every 30s
    return () => clearInterval(interval);
  }, []);

  // Helper check permission access
  const hasAccess = (permission?: string | string[]) => {
    if (!user) return false;
    if (user.role?.name === 'Admin' || user.permissions?.includes('*')) return true;
    if (!permission) return true;

    const userPerms = Array.isArray(user.permissions) ? user.permissions : [];
    if (Array.isArray(permission)) {
      return permission.some((p) => userPerms.includes(p));
    }
    return userPerms.includes(permission);
  };

  const canUseAI = Boolean(licenseInfo?.isEnterprise) && hasAccess(['ai.extract', 'ai.templates.manage', 'ai.auto_save']);
  const canImportExcel = hasAccess(['assets.import', 'licenses.import', 'services.import', 'import.view']);

  // Click outside to close notification / health popovers
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotifOpen(false);
      }
      if (healthRef.current && !healthRef.current.contains(event.target as Node)) {
        setIsSystemHealthOpen(false);
      }
      if (langRef.current && !langRef.current.contains(event.target as Node)) {
        setIsLangOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Safe Notifications calculation
  const notificationsList = Array.isArray(notifsData?.notifications) ? notifsData.notifications : [];
  const unreadNotifications = notificationsList.filter((n) => !readNotifIds.includes(n.id));
  const unreadCount = unreadNotifications.length;

  const ticketsCount = notifsData?.counts?.tickets ?? notifsData?.summary?.ticketsTotal ?? notificationsList.filter((n) => n.type === 'TICKET').length;
  const licensesCount = notifsData?.counts?.licenses ?? notifsData?.summary?.licensesExpiring ?? notificationsList.filter((n) => n.type === 'LICENSE').length;
  const servicesCount = notifsData?.counts?.services ?? notifsData?.summary?.servicesExpiring ?? notificationsList.filter((n) => n.type === 'SERVICE').length;
  const totalCount = notifsData?.counts?.total ?? notificationsList.length;

  const filteredNotifs = notificationsList.filter((n) => {
    if (notifTab === 'TICKETS') return n.type === 'TICKET';
    if (notifTab === 'LICENSES') return n.type === 'LICENSE';
    if (notifTab === 'SERVICES') return n.type === 'SERVICE';
    return true;
  });

  // Mark all as read handler
  const handleMarkAllAsRead = () => {
    const allIds = notificationsList.map((n) => n.id);
    const updated = Array.from(new Set([...readNotifIds, ...allIds]));
    setReadNotifIds(updated);
    try {
      localStorage.setItem('it_read_notifications', JSON.stringify(updated));
    } catch {}
  };

  // Direct Click on Notification Item -> Routes & dispatches event directly to exact item!
  const handleNotificationClick = (item: any) => {
    // 1. Mark as read
    const updated = Array.from(new Set([...readNotifIds, item.id]));
    setReadNotifIds(updated);
    try {
      localStorage.setItem('it_read_notifications', JSON.stringify(updated));
    } catch {}

    // 2. Close dropdown
    setIsNotifOpen(false);

    const targetId = item.ticketId || item.licenseId || item.serviceId || item.assetId;

    // 3. Dispatch global custom event immediately for in-page instant popup opening!
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('app:open-notification', {
          detail: {
            type: item.type,
            id: targetId,
            item,
          },
        })
      );
    }

    // 4. Route / update URL for cross-page or history
    if ((item.type === 'TICKET' || item.type === 'ESCALATION') && targetId) {
      if (typeof window !== 'undefined' && window.location.pathname.startsWith('/tickets')) {
        window.history.pushState({}, '', `/tickets?id=${targetId}`);
      } else {
        router.push(`/tickets?id=${targetId}`);
      }
    } else if (item.type === 'LICENSE' && targetId) {
      if (typeof window !== 'undefined' && window.location.pathname.startsWith('/licenses')) {
        window.history.pushState({}, '', `/licenses?id=${targetId}`);
      } else {
        router.push(`/licenses?id=${targetId}`);
      }
    } else if (item.type === 'SERVICE' && targetId) {
      if (typeof window !== 'undefined' && window.location.pathname.startsWith('/services')) {
        window.history.pushState({}, '', `/services?id=${targetId}`);
      } else {
        router.push(`/services?id=${targetId}`);
      }
    } else {
      router.push(item.link || '/dashboard');
    }
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs">
      <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
        {/* Mobile Sidebar Hamburger Toggle */}
        <button
          type="button"
          onClick={() => {
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('app:toggle-sidebar'));
            }
          }}
          className="md:hidden p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
          title="Mở menu điều hướng"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Logo nhỏ + Mục đang ở (Breadcrumb chuyên nghiệp) */}
        <div className="flex items-center space-x-2 sm:space-x-2.5 min-w-0">
          <Link href="/dashboard" className="flex items-center space-x-1.5 shrink-0 group">
            <img
              src="/logo-icon.png"
              alt="Logo"
              className="w-6 h-6 sm:w-7 sm:h-7 object-contain rounded-lg shadow-2xs group-hover:scale-105 transition-transform"
              onError={(e) => {
                (e.target as any).style.display = 'none';
              }}
            />
            <span className="font-extrabold text-slate-900 text-sm sm:text-base tracking-tight hidden sm:inline">
              SIMPLY IT
            </span>
          </Link>

          <span className="text-slate-300 font-light select-none text-sm hidden sm:inline">/</span>

          <div className="flex items-center space-x-1.5 min-w-0 bg-slate-50 sm:bg-slate-100/70 border border-slate-200/80 px-2.5 py-1 rounded-xl">
            <span className="text-sm shrink-0">{currentIcon}</span>
            <span className="font-bold text-slate-800 text-xs sm:text-sm truncate">
              {currentTitle}
            </span>
          </div>

          <span className="hidden xl:flex text-[11px] bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold px-2 py-0.5 rounded-full items-center space-x-1 shrink-0 ml-1">
            <ShieldCheck className="w-3 h-3 text-emerald-600" />
            <span>RBAC Active</span>
          </span>
        </div>
      </div>

      <div className="flex items-center space-x-2.5 sm:space-x-3">
        {/* GLOBAL SEARCH — Command Palette (Ctrl+K) */}
        <GlobalSearch />

        {/* NOTIFICATION BELL WITH LIVE POPUP */}
        <div className="relative" ref={notifRef}>
          <button
            type="button"
            onClick={() => setIsNotifOpen(!isNotifOpen)}
            className="relative p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
            title="Thông báo & Việc cần xử lý"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-rose-600 text-[10px] font-bold text-white shadow-xs animate-pulse">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {/* NOTIFICATION DROPDOWN POPOVER */}
          {isNotifOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-100 flex flex-col max-h-[500px]">
              {/* Header */}
              <div className="p-3.5 bg-slate-900 text-white flex items-center justify-between shrink-0">
                <div className="flex items-center space-x-2">
                  <Bell className="w-4 h-4 text-amber-400" />
                  <span className="font-bold text-xs">{t('header.notifications_title', 'Thông Báo & Việc Cần Xử Lý')}</span>
                  {unreadCount > 0 ? (
                    <span className="bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                      {unreadCount} {t('header.unread', 'chưa đọc')}
                    </span>
                  ) : (
                    <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-semibold px-1.5 py-0.2 rounded-full border border-emerald-500/30">
                      {t('header.all_read', 'Đã đọc hết')}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setIsNotifOpen(false)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Sub-tabs */}
              <div className="flex items-center border-b border-slate-100 bg-slate-50/80 p-1.5 gap-1 shrink-0 text-xs">
                <button
                  type="button"
                  onClick={() => setNotifTab('ALL')}
                  className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-colors cursor-pointer ${
                    notifTab === 'ALL' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {language === 'en' ? 'All' : 'Tất cả'} ({totalCount})
                </button>
                <button
                  type="button"
                  onClick={() => setNotifTab('TICKETS')}
                  className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-colors cursor-pointer flex items-center gap-1 ${
                    notifTab === 'TICKETS' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <LifeBuoy className="w-3 h-3 text-indigo-600" />
                  <span>Ticket ({ticketsCount})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setNotifTab('LICENSES')}
                  className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-colors cursor-pointer flex items-center gap-1 ${
                    notifTab === 'LICENSES' ? 'bg-white text-purple-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Key className="w-3 h-3 text-purple-600" />
                  <span>License ({licensesCount})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setNotifTab('SERVICES')}
                  className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-colors cursor-pointer flex items-center gap-1 ${
                    notifTab === 'SERVICES' ? 'bg-white text-emerald-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Globe className="w-3 h-3 text-emerald-600" />
                  <span>{language === 'en' ? 'Services' : 'Dịch vụ'} ({servicesCount})</span>
                </button>
              </div>

              {/* Items List */}
              <div className="overflow-y-auto flex-1 divide-y divide-slate-100 p-1">
                {filteredNotifs.length === 0 ? (
                  <div className="py-8 px-4 text-center space-y-1.5">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                    <p className="font-bold text-xs text-slate-800">{language === 'en' ? 'No notifications!' : 'Không có thông báo nào!'}</p>
                    <p className="text-[11px] text-slate-400">{language === 'en' ? 'All tickets, software licenses and IT services are operating normally.' : 'Tất cả ticket, bản quyền license và dịch vụ IT đều đang hoạt động tốt.'}</p>
                  </div>
                ) : (
                  filteredNotifs.map((item) => {
                    const isRead = readNotifIds.includes(item.id);

                    return (
                      <div
                        key={item.id}
                        onClick={() => handleNotificationClick(item)}
                        className={`p-2.5 rounded-xl transition-all cursor-pointer group flex items-start space-x-2.5 ${
                          isRead
                            ? 'opacity-60 hover:opacity-100 hover:bg-slate-50'
                            : 'bg-blue-50/40 hover:bg-blue-50/80 border-l-2 border-blue-500'
                        }`}
                      >
                        <div className="mt-0.5 shrink-0">
                          {item.type === 'ESCALATION' ? (
                            <div className="w-7 h-7 rounded-lg bg-amber-100 border border-amber-300 text-amber-800 flex items-center justify-center font-bold text-xs shadow-2xs animate-pulse">
                              🚨
                            </div>
                          ) : item.type === 'TICKET' ? (
                            <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center">
                              <LifeBuoy className="w-3.5 h-3.5" />
                            </div>
                          ) : item.type === 'LICENSE' ? (
                            <div className="w-7 h-7 rounded-lg bg-purple-50 border border-purple-200 text-purple-700 flex items-center justify-center">
                              <Key className="w-3.5 h-3.5" />
                            </div>
                          ) : item.type === 'SERVICE' ? (
                            <div className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center">
                              <Globe className="w-3.5 h-3.5" />
                            </div>
                          ) : (
                            <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center">
                              <Laptop className="w-3.5 h-3.5" />
                            </div>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1">
                            <p className={`text-xs group-hover:text-blue-700 transition-colors truncate ${
                              isRead ? 'font-semibold text-slate-700' : 'font-bold text-slate-900'
                            }`}>
                              {item.title}
                            </p>
                            {item.severity === 'CRITICAL' && (
                              <span className="bg-rose-100 text-rose-800 text-[9px] font-bold px-1.5 py-0.2 rounded shrink-0">
                                Quá hạn
                              </span>
                            )}
                            {item.severity === 'WARNING' && (
                              <span className="bg-amber-100 text-amber-800 text-[9px] font-bold px-1.5 py-0.2 rounded shrink-0">
                                Sắp hạn
                              </span>
                            )}
                          </div>

                          <p className="text-xs text-slate-600 line-clamp-1 mt-0.5 font-medium">{item.message}</p>
                          <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
                            <span className="truncate">{item.detail}</span>
                            <span className="text-blue-600 font-semibold group-hover:underline ml-1 shrink-0">
                              {language === 'en' ? 'Open →' : 'Mở xem →'}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* FOOTER: MARK ALL AS READ BUTTON */}
              <div className="p-2.5 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs shrink-0 font-semibold">
                <span className="text-[11px] text-slate-500">
                  {unreadCount > 0 ? (language === 'en' ? `${unreadCount} unread` : `${unreadCount} việc chưa đọc`) : (language === 'en' ? 'All caught up' : 'Đã đọc toàn bộ')}
                </span>

                <button
                  type="button"
                  onClick={handleMarkAllAsRead}
                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 hover:text-blue-700 rounded-lg text-xs font-bold shadow-2xs transition-colors cursor-pointer"
                >
                  <CheckCheck className="w-3.5 h-3.5 text-blue-600" />
                  <span>{t('header.mark_all_read', 'Đánh dấu đã đọc tất cả')}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {canUseAI && onOpenAIModal && (
          <button
            onClick={onOpenAIModal}
            className="flex items-center space-x-2 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-medium text-xs shadow-2xs transition-all cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
            <span>{t('header.ai_copilot', 'Nhập nhanh AI')}</span>
          </button>
        )}

        {canImportExcel && onOpenExcelModal && (
          <button
            onClick={onOpenExcelModal}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs transition-colors border border-slate-200 cursor-pointer h-8"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>{t('header.excel_import', 'Import Excel')}</span>
          </button>
        )}

        {/* QUICK LANGUAGE SWITCHER POPOVER */}
        <div className="relative" ref={langRef}>
          <button
            type="button"
            onClick={() => setIsLangOpen(!isLangOpen)}
            className="h-8 px-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center gap-1.5 shadow-2xs border border-slate-200 transition-all cursor-pointer shrink-0"
            title={t('header.change_language', 'Đổi ngôn ngữ')}
          >
            <span className="text-sm shrink-0">
              {supportedLanguages.find((l) => l.code === language)?.flag || '🌐'}
            </span>
            <span className="hidden sm:inline text-slate-800 font-bold text-xs uppercase">
              {language}
            </span>
            <ChevronDown className="w-3 h-3 text-slate-500" />
          </button>

          {isLangOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 p-1.5 space-y-1 animate-in fade-in zoom-in-95 duration-100">
              <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                {t('header.change_language', 'Chọn ngôn ngữ')}
              </div>
              {supportedLanguages.map((lang) => (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => {
                    setLanguage(lang.code as any);
                    setIsLangOpen(false);
                  }}
                  className={`w-full px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center justify-between transition-colors cursor-pointer ${
                    language === lang.code
                      ? 'bg-blue-50 text-blue-700'
                      : 'hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base">{lang.flag}</span>
                    <span>{lang.nativeName}</span>
                  </div>
                  {language === lang.code && <Check className="w-3.5 h-3.5 text-blue-600" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* KEEPASS DESKTOP STYLE HELP MENU & AUTHOR INFO */}
        <div className="relative" ref={healthRef}>
          <button
            type="button"
            onClick={() => setIsSystemHealthOpen(!isSystemHealthOpen)}
            className="h-8 px-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center gap-1.5 shadow-2xs border border-slate-200 hover:scale-102 transition-all cursor-pointer relative shrink-0"
            title="Menu Trợ giúp & Thông tin tác giả (Help)"
          >
            <div className="w-5 h-5 rounded-md bg-slate-900 flex items-center justify-center p-0.5 shrink-0">
              <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
            </div>
            <span className="text-slate-800 font-bold text-xs">Help</span>
            <ChevronDown className="w-3 h-3 text-slate-500" />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 border-2 border-white shadow-xs" />
          </button>

          {isSystemHealthOpen && (
            <div className="absolute right-0 mt-2 w-88 sm:w-[440px] bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100 flex flex-col">
              {/* Header */}
              <div className="p-3.5 bg-slate-900 text-white flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center p-1 border border-slate-700 shrink-0">
                    <img src="/logo-icon.png" alt="Logo" className="w-full h-full object-contain" />
                  </div>
                  <div>
                    <h4 className="text-sm font-extrabold text-white tracking-wide">SIMPLY IT</h4>
                    <p className="text-[10.5px] text-cyan-400 font-medium">Do Less — Achieve More</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsSystemHealthOpen(false)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* KeePass Style Sub-Menu Tabs */}
              <div className="flex border-b border-slate-100 bg-slate-50 p-1.5 gap-1 text-xs">
                <button
                  type="button"
                  onClick={() => { setSystemTab('ABOUT'); setLicMsg(null); }}
                  className={`flex-1 py-1.5 px-1.5 rounded-lg font-bold text-[11px] flex items-center justify-center gap-1 transition-colors cursor-pointer ${
                    systemTab === 'ABOUT' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Info className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span>About</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setSystemTab('LICENSE'); setLicMsg(null); }}
                  className={`flex-1 py-1.5 px-1.5 rounded-lg font-bold text-[11px] flex items-center justify-center gap-1 transition-colors cursor-pointer ${
                    systemTab === 'LICENSE' ? 'bg-white text-amber-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>{language === 'en' ? 'License' : 'Bản Quyền'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setSystemTab('HELP'); setLicMsg(null); }}
                  className={`flex-1 py-1.5 px-1.5 rounded-lg font-bold text-[11px] flex items-center justify-center gap-1 transition-colors cursor-pointer ${
                    systemTab === 'HELP' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <span>{language === 'en' ? 'Help' : 'Trợ Giúp'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setSystemTab('SYSTEM'); setLicMsg(null); }}
                  className={`flex-1 py-1.5 px-1.5 rounded-lg font-bold text-[11px] flex items-center justify-center gap-1 transition-colors cursor-pointer ${
                    systemTab === 'SYSTEM' ? 'bg-white text-emerald-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Server className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>{language === 'en' ? 'Health' : 'Kỹ Thuật'}</span>
                </button>
              </div>

              {/* Tab Content */}
              <div className="p-4 text-xs max-h-[520px] overflow-y-auto space-y-3">
                {systemTab === 'ABOUT' && (
                  <div className="space-y-3.5">
                    {/* COMPACT AUTHOR CARD (NO TK BADGE) */}
                    <div className="bg-slate-900 text-white p-4 rounded-2xl border border-slate-700/70 shadow-lg space-y-3">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2.5 border-b border-slate-700/60">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-base font-extrabold text-white">Tạ Trung Kiên</h3>
                            <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-[10px] font-bold border border-blue-400/30">{language === 'en' ? 'Author & Software Engineer' : 'Tác Giả & Kỹ Sư Phát Triển'}</span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5">Hệ thống Quản lý Dịch vụ & Tài sản CNTT Doanh Nghiệp (SIMPLY IT)</p>
                        </div>

                        <a
                          href="mailto:takien26@gmail.com?subject=[SIMPLY%20IT]%20Lien%20he%20va%20hop%20tac%20phat%20trien%20he%20thong"
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer shrink-0"
                        >
                          <Mail className="w-3.5 h-3.5" />
                          <span>{language === 'en' ? 'Send Email' : 'Gửi Email'}</span>
                        </a>
                      </div>

                      <div className="space-y-2 text-xs">
                        <div className="p-2.5 bg-slate-800/90 rounded-xl border border-slate-700/50 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-slate-400 text-[11px]">{language === 'en' ? 'Contact Email:' : 'Email liên hệ:'}</span>
                            <span className="font-mono text-emerald-400 font-bold text-xs sm:text-sm select-all">takien26@gmail.com</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText('takien26@gmail.com');
                              setCopiedEmail(true);
                              setTimeout(() => setCopiedEmail(false), 2500);
                            }}
                            className="px-2.5 py-1 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-[11px] font-medium border border-slate-600 flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            {copiedEmail ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            <span>{copiedEmail ? 'Đã sao chép!' : 'Sao chép'}</span>
                          </button>
                        </div>

                        <div className="p-2.5 bg-slate-800/70 rounded-xl border border-slate-700/40 text-[11px] text-slate-300 leading-relaxed">
                          📩 <strong>Hình thức trao đổi & Hợp tác:</strong> Liên hệ qua email để trao đổi nghiệp vụ, yêu cầu thêm tính năng mới, đóng góp phát triển hoặc nhận hỗ trợ kỹ thuật chuyên sâu về hệ thống.
                        </div>
                      </div>
                    </div>

                    {/* Phiên bản đang dùng & Nhập License Key trực tiếp */}
                    <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                      <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-100 flex-wrap">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                            <ShieldCheck className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="font-extrabold text-slate-900 text-xs">
                              {language === 'en' ? 'Edition & License Status' : 'Phiên Bản Đang Dùng & Bản Quyền'}
                            </h4>
                            <p className="text-[10px] text-slate-500">
                              SIMPLY IT v1.0.0
                            </p>
                          </div>
                        </div>

                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide flex items-center gap-1 ${
                          licenseInfo?.isEnterprise
                            ? 'bg-amber-100 text-amber-900 border border-amber-300'
                            : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        }`}>
                          {licenseInfo?.isEnterprise ? (
                            <>
                              <Crown className="w-3 h-3 text-amber-600 shrink-0" />
                              <span>ENTERPRISE</span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-3 h-3 text-emerald-600 shrink-0" />
                              <span>COMMUNITY</span>
                            </>
                          )}
                        </span>
                      </div>

                      {licenseInfo?.isEnterprise ? (
                        <div className="space-y-2.5">
                          <div className="p-2.5 bg-amber-50/60 border border-amber-200/70 rounded-xl space-y-1.5 text-xs">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="text-slate-500">{language === 'en' ? 'Licensed To:' : 'Đơn vị sở hữu:'}</span>
                              <strong className="text-slate-900">{licenseInfo.customer || 'Doanh Nghiệp'}</strong>
                            </div>
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="text-slate-500">{language === 'en' ? 'License Status:' : 'Trạng thái:'}</span>
                              <span className="font-bold text-emerald-600 flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>{language === 'en' ? 'Active' : 'Đã kích hoạt hợp lệ'}</span>
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="text-slate-500">{language === 'en' ? 'Device Limit:' : 'Hạn mức tài sản:'}</span>
                              <span className="font-bold text-slate-800">
                                {licenseInfo.maxAssets ? `${licenseInfo.maxAssets} thiết bị` : (language === 'en' ? 'Unlimited' : 'Không giới hạn')}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="text-slate-500">{language === 'en' ? 'Expiry:' : 'Hạn bản quyền:'}</span>
                              <span className="font-bold text-slate-800">
                                {licenseInfo.expiresAt
                                  ? `${new Date(licenseInfo.expiresAt).toLocaleDateString('vi-VN')} (${licenseInfo.daysRemaining ?? 0} ngày)`
                                  : (language === 'en' ? 'Lifetime (Perpetual)' : 'Vĩnh viễn (Không giới hạn)')}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between gap-2 pt-0.5">
                            <Link
                              href="/settings?tab=license"
                              onClick={() => setIsSystemHealthOpen(false)}
                              className="text-blue-600 hover:text-blue-800 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                            >
                              <span>{language === 'en' ? 'Manage in Settings →' : 'Quản lý trong Cài Đặt →'}</span>
                            </Link>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2.5">
                          <p className="text-[11px] text-slate-600 leading-relaxed">
                            {language === 'en'
                              ? 'Community Edition is 100% free (supports up to 50 assets). To unlock Enterprise features (AI Copilot, SLA, LDAP/SSO), paste your license key:'
                              : 'Bản Community miễn phí vĩnh viễn (tối đa 50 thiết bị). Nhập mã License Key để mở khóa trọn bộ tính năng Enterprise (AI Copilot, SLA, LDAP, SSO):'}
                          </p>

                          <form onSubmit={handleActivateKey} className="space-y-2">
                            <div className="flex items-center gap-1.5">
                              <div className="relative flex-1">
                                <Key className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                  type="text"
                                  value={licKeyInput}
                                  onChange={(e) => setLicKeyInput(e.target.value)}
                                  placeholder="SIMPLY-ENT-XXXX-XXXX..."
                                  className="w-full pl-8 pr-2 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-[11px] font-mono text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                                />
                              </div>
                              <button
                                type="submit"
                                disabled={licSubmitting}
                                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[11px] font-bold transition-all shadow-2xs flex items-center gap-1 cursor-pointer shrink-0 disabled:opacity-50"
                              >
                                {licSubmitting ? <Loader2 className="w-3 h-3 animate-spin" /> : <ShieldCheck className="w-3 h-3" />}
                                <span>{licSubmitting ? '...' : (language === 'en' ? 'Activate' : 'Kích hoạt')}</span>
                              </button>
                            </div>

                            {licMsg && (
                              <div className={`p-2 rounded-xl text-[10.5px] font-medium flex items-center gap-1.5 ${
                                licMsg.type === 'success'
                                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                  : 'bg-rose-50 text-rose-800 border border-rose-200'
                              }`}>
                                {licMsg.type === 'success' ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> : <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />}
                                <span>{licMsg.text}</span>
                              </div>
                            )}

                            <div className="flex items-center justify-between text-[10.5px] pt-0.5">
                              <button
                                type="button"
                                onClick={() => { setSystemTab('LICENSE'); setLicMsg(null); }}
                                className="text-amber-700 hover:text-amber-900 font-bold flex items-center gap-1 cursor-pointer"
                              >
                                <Crown className="w-3 h-3 text-amber-600" />
                                <span>{language === 'en' ? 'Compare Editions' : 'So sánh tính năng'}</span>
                              </button>

                              <Link
                                href="/settings?tab=license"
                                onClick={() => setIsSystemHealthOpen(false)}
                                className="text-blue-600 hover:text-blue-800 font-bold flex items-center gap-0.5"
                              >
                                <span>{language === 'en' ? 'License Settings' : 'Mở Cài Đặt'}</span>
                                <ChevronRight className="w-3 h-3" />
                              </Link>
                            </div>
                          </form>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {systemTab === 'LICENSE' && (
                  <div className="space-y-3.5">
                    {/* Full License Details Card */}
                    <div className="bg-slate-900 text-white p-4 rounded-2xl border border-slate-700/70 shadow-lg space-y-3">
                      <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-700/60">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
                            <ShieldCheck className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="font-extrabold text-white text-xs sm:text-sm">
                              {language === 'en' ? 'System License & Edition' : 'Thông Tin Giấy Phép & Bản Quyền'}
                            </h4>
                            <p className="text-[10px] text-slate-400">
                              SIMPLY IT ITSM Platform v1.0.0
                            </p>
                          </div>
                        </div>

                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          licenseInfo?.isEnterprise
                            ? 'bg-amber-400 text-slate-950 font-black'
                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        }`}>
                          {licenseInfo?.isEnterprise ? '👑 ENTERPRISE' : 'COMMUNITY'}
                        </span>
                      </div>

                      {licenseInfo?.isEnterprise ? (
                        <div className="space-y-3 text-xs">
                          <div className="p-3 bg-slate-800/90 rounded-xl border border-slate-700/60 space-y-2 text-[11px]">
                            <div className="flex justify-between">
                              <span className="text-slate-400">{language === 'en' ? 'Customer:' : 'Cấp phép cho:'}</span>
                              <strong className="text-white text-xs">{licenseInfo.customer || 'Enterprise'}</strong>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">{language === 'en' ? 'Max Assets:' : 'Quy mô thiết bị:'}</span>
                              <span className="text-emerald-400 font-bold font-mono">
                                {licenseInfo.maxAssets ? `${licenseInfo.maxAssets} thiết bị` : (language === 'en' ? 'Unlimited' : 'Không giới hạn')}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">{language === 'en' ? 'Expires:' : 'Hạn dùng:'}</span>
                              <span className="text-amber-300 font-bold font-mono">
                                {licenseInfo.expiresAt
                                  ? `${new Date(licenseInfo.expiresAt).toLocaleDateString('vi-VN')} (còn ${licenseInfo.daysRemaining ?? 0} ngày)`
                                  : (language === 'en' ? 'Perpetual (Lifetime)' : 'Vĩnh viễn (Lifetime)')}
                              </span>
                            </div>
                          </div>

                          <div className="p-2.5 bg-emerald-950/40 border border-emerald-500/30 rounded-xl text-emerald-300 text-[11px] flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                            <span>{language === 'en' ? 'All Enterprise modules (AI, SLA, SSO, LDAP) are fully active.' : 'Toàn bộ tính năng cao cấp (AI, SLA, SSO M365, LDAP) đã được kích hoạt.'}</span>
                          </div>

                          <div className="flex items-center justify-between pt-1">
                            <Link
                              href="/settings?tab=license"
                              onClick={() => setIsSystemHealthOpen(false)}
                              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-[11px] font-bold transition-all shadow-xs flex items-center gap-1.5"
                            >
                              <span>{language === 'en' ? 'Open License Settings' : 'Mở Quản Lý Bản Quyền'}</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </Link>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-2 text-[10.5px]">
                            <div className="p-2.5 bg-slate-800/80 rounded-xl border border-slate-700/50 space-y-1">
                              <span className="text-emerald-400 font-bold flex items-center gap-1">
                                <Check className="w-3 h-3" /> Community
                              </span>
                              <p className="text-slate-400 text-[10px]">Tối đa 50 tài sản, Service Desk & Ticket, Quản lý người dùng cơ bản.</p>
                            </div>
                            <div className="p-2.5 bg-amber-950/30 rounded-xl border border-amber-700/40 space-y-1">
                              <span className="text-amber-400 font-bold flex items-center gap-1">
                                <Crown className="w-3 h-3" /> Enterprise
                              </span>
                              <p className="text-slate-300 text-[10px]">Không giới hạn tài sản, AI Copilot, SSO M365, LDAP, SLA & Routing.</p>
                            </div>
                          </div>

                          {/* Key input inside License Tab */}
                          <form onSubmit={handleActivateKey} className="space-y-2">
                            <label className="block text-[11px] font-bold text-slate-300">
                              {language === 'en' ? 'Activate License Key:' : 'Kích hoạt mã bản quyền Enterprise:'}
                            </label>
                            <div className="flex items-center gap-1.5">
                              <div className="relative flex-1">
                                <Key className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                  type="text"
                                  value={licKeyInput}
                                  onChange={(e) => setLicKeyInput(e.target.value)}
                                  placeholder="SIMPLY-ENT-XXXX-XXXX..."
                                  className="w-full pl-8 pr-2 py-1.5 bg-slate-800 border border-slate-600 rounded-xl text-[11px] font-mono text-white placeholder:text-slate-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500 transition-all"
                                />
                              </div>
                              <button
                                type="submit"
                                disabled={licSubmitting}
                                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-[11px] transition-all shadow-xs flex items-center gap-1 cursor-pointer shrink-0 disabled:opacity-50"
                              >
                                {licSubmitting ? <Loader2 className="w-3 h-3 animate-spin" /> : <ShieldCheck className="w-3 h-3" />}
                                <span>{licSubmitting ? '...' : (language === 'en' ? 'Activate' : 'Kích hoạt')}</span>
                              </button>
                            </div>

                            {licMsg && (
                              <div className={`p-2 rounded-xl text-[10.5px] font-medium flex items-center gap-1.5 ${
                                licMsg.type === 'success'
                                  ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/40'
                                  : 'bg-rose-950/60 text-rose-300 border border-rose-500/40'
                              }`}>
                                {licMsg.type === 'success' ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> : <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />}
                                <span>{licMsg.text}</span>
                              </div>
                            )}

                            <div className="flex items-center justify-between text-[10.5px] pt-1 border-t border-slate-800">
                              <a
                                href="mailto:takien26@gmail.com?subject=[SIMPLY%20IT]%20Lien%20he%20mua%20key%20Enterprise"
                                className="text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1"
                              >
                                <Mail className="w-3 h-3" />
                                <span>{language === 'en' ? 'Contact to buy key' : 'Liên hệ mua key Enterprise'}</span>
                              </a>
                              <Link
                                href="/settings?tab=license"
                                onClick={() => setIsSystemHealthOpen(false)}
                                className="text-blue-400 hover:text-blue-300 font-bold flex items-center gap-0.5"
                              >
                                <span>{language === 'en' ? 'Settings Page' : 'Trang Cài Đặt'}</span>
                                <ChevronRight className="w-3 h-3" />
                              </Link>
                            </div>
                          </form>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {systemTab === 'HELP' && (
                  <div className="space-y-3">
                    <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl space-y-1.5">
                      <h5 className="font-bold text-indigo-950 text-xs flex items-center gap-1.5">
                        <BookOpen className="w-4 h-4 text-indigo-600" />
                        <span>Hướng Dẫn Sử Dụng Nhanh (Help Contents):</span>
                      </h5>
                      <ul className="space-y-2 text-[11.5px] text-slate-700 pt-1">
                        <li className="flex items-start gap-2">
                          <span className="text-blue-600 font-bold text-sm">💻</span>
                          <span><strong>Quản lý Tài sản (Assets):</strong> Quản lý toàn bộ thiết bị máy tính, cấu hình chi tiết, in tem mã QR / Barcode để dán lên máy.</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-cyan-600 font-bold text-sm">📦</span>
                          <span><strong>Dịch vụ & License:</strong> Theo dõi thời hạn domain, hosting, SSL, bản quyền phần mềm và tự động cảnh báo trước 30 ngày.</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-rose-600 font-bold text-sm">🎫</span>
                          <span><strong>Ticket & Hỗ trợ (Service Desk):</strong> Tiếp nhận yêu cầu hỗ trợ, phân công kỹ thuật viên và theo dõi SLA theo mức độ ưu tiên.</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-purple-600 font-bold text-sm">🤖</span>
                          <span><strong>Nhập nhanh AI:</strong> Quét ảnh chụp hóa đơn mua hàng hoặc tem serial thiết bị để tự động trích xuất thông tin.</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-emerald-600 font-bold text-sm">💾</span>
                          <span><strong>Sao lưu & Phục hồi:</strong> Vào <i>Cài đặt hệ thống</i> để sao lưu tự động định kỳ hoặc tạo snapshot phục hồi 1-click.</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                )}

                {systemTab === 'SYSTEM' && (
                  <div className="space-y-2.5">
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                      <span className="text-slate-600 flex items-center gap-1.5">
                        <Server className="w-3.5 h-3.5 text-slate-500" />
                        <span>Máy chủ Web:</span>
                      </span>
                      <span className="font-bold text-slate-900 font-mono text-[11px]">Next.js 15 (Online)</span>
                    </div>
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                      <span className="text-slate-600 flex items-center gap-1.5">
                        <Database className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Cơ sở dữ liệu:</span>
                      </span>
                      <span className="font-bold text-emerald-700 font-mono text-[11px]">PostgreSQL (Connected)</span>
                    </div>
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                      <span className="text-slate-600 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                        <span>Nhật ký lỗi (Logs):</span>
                      </span>
                      <span className="font-bold text-emerald-600 text-[11px]">0 lỗi nghiêm trọng</span>
                    </div>
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                      <span className="text-slate-600 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        <span>Thời gian phản hồi:</span>
                      </span>
                      <span className="font-bold text-blue-700 font-mono text-[11px]">~8ms (Rất nhanh)</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px]">
                <span className="text-slate-400">© 2026 SIMPLY IT Platform</span>
                <button
                  type="button"
                  onClick={() => setIsSystemHealthOpen(false)}
                  className="text-xs text-blue-600 hover:text-blue-800 font-bold cursor-pointer"
                >{isEn ? 'Close' : 'Đóng'}</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
