'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Crown,
  ShieldCheck,
  LayoutDashboard,
  Laptop,
  Key,
  Globe,
  Package,
  KeyRound,
  Lock,
  LifeBuoy,
  AlertTriangle,
  BookOpen,
  BarChart3,
  Cpu,
  Sparkles,
  FileSpreadsheet,
  FileText,
  Settings,
  LogOut,
  User as UserIcon,
  Users,
  Layers,
  Pin,
  PinOff,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ClipboardCheck,
  Boxes,
  Map,
  Wifi,
  ScanLine,
  UserCheck,
} from 'lucide-react';
import { useEffect, useState, useRef } from 'react';
import { useLanguage } from '@/lib/i18n/context';
import { EnterpriseUpgradeModal } from '@/components/common/EnterpriseUpgradeModal';

interface SubNavItem {
  label: string;
  href: string;
  icon: any;
  badge?: string;
  badgeColor?: string;
  permission?: string | string[];
}

interface NavItem {
  label: string;
  href?: string;
  icon: any;
  badge?: string;
  badgeColor?: string;
  permission?: string | string[];
  children?: SubNavItem[];
}

export function Sidebar({
  onOpenAIModal,
  onOpenExcelModal,
}: {
  onOpenAIModal?: () => void;
  onOpenExcelModal?: () => void;
}) {
  const rawPathname = usePathname();
  const pathname = rawPathname || '';
  const router = useRouter();
  const { language, t } = useLanguage();
  const [user, setUser] = useState<{
    id?: string;
    fullName: string;
    role?: { id?: string; name: string };
    email: string;
    permissions?: string[];
  } | null>(null);
  const [appName, setAppName] = useState('SIMPLY IT');
  const [companyName, setCompanyName] = useState('Do Less - Achieve More');
  const [appLogo, setAppLogo] = useState('/logo-icon.png');
  const [logoError, setLogoError] = useState(false);
  const [primaryColor, setPrimaryColor] = useState('#1976D2');
  const [notifSummary, setNotifSummary] = useState<{ ticketsTotal: number; licensesExpiring: number; servicesExpiring: number }>({
    ticketsTotal: 0,
    licensesExpiring: 0,
    servicesExpiring: 0,
  });

  // State: Ghim cố định (Pinned) vs Thu gọn (Hover expansion)
  const [isPinned, setIsPinned] = useState<boolean>(true);
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // State: Expandable dropdown menus (Default all CLOSED for compact and neat view)
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({});
  const [isMobileOpen, setIsMobileOpen] = useState<boolean>(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState<boolean>(false);
  const [isEnterprise, setIsEnterprise] = useState<boolean>(false);
  const [activeModules, setActiveModules] = useState<string[]>([]);

  const isModActive = (mod: string) => isEnterprise && (activeModules.length === 0 || activeModules.includes(mod) || activeModules.includes('*'));

  const fetchLicenseStatus = () => {
    fetch('/api/license')
      .then((res) => res.json())
      .then((data) => {
        if (data && data.isEnterprise) {
          setIsEnterprise(true);
          setActiveModules(Array.isArray(data.modules) ? data.modules : []);
        } else {
          setIsEnterprise(false);
          setActiveModules([]);
        }
      })
      .catch(() => {
        setIsEnterprise(false);
        setActiveModules([]);
      });
  };

  useEffect(() => {
    fetchLicenseStatus();
    const handleLicenseUpdated = () => fetchLicenseStatus();
    window.addEventListener('simply:license-updated', handleLicenseUpdated);
    return () => window.removeEventListener('simply:license-updated', handleLicenseUpdated);
  }, []);

  const toggleMenu = (key: string) => {
    if (!isExpanded) setIsPinned(true);
    setOpenMenus((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Mobile sidebar event listeners & route change auto-close
  useEffect(() => {
    const handleToggle = () => setIsMobileOpen((prev) => !prev);
    const handleClose = () => setIsMobileOpen(false);
    window.addEventListener('app:toggle-sidebar', handleToggle);
    window.addEventListener('app:close-sidebar', handleClose);
    return () => {
      window.removeEventListener('app:toggle-sidebar', handleToggle);
      window.removeEventListener('app:close-sidebar', handleClose);
    };
  }, []);

  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  // Load pinned preference from localStorage on mount
  useEffect(() => {
    try {
      const savedPin = localStorage.getItem('simply_sidebar_pinned');
      if (savedPin !== null) {
        setIsPinned(savedPin === 'true');
      }
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  // Update localStorage when isPinned changes
  const handleTogglePin = () => {
    const nextState = !isPinned;
    setIsPinned(nextState);
    try {
      localStorage.setItem('simply_sidebar_pinned', String(nextState));
    } catch {
      // Ignore localStorage errors
    }
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
        if (data.success && data.data && Array.isArray(data.data)) {
          const appNameSetting = data.data.find((s: any) => s.key === 'app.name');
          const companySetting = data.data.find((s: any) => s.key === 'app.company_name');
          const logoSetting = data.data.find((s: any) => s.key === 'app.logo');
          const colorSetting = data.data.find((s: any) => s.key === 'app.primary_color');
          if (appNameSetting?.value) setAppName(appNameSetting.value);
          if (companySetting?.value) setCompanyName(companySetting.value);
          if (logoSetting?.value) setAppLogo(logoSetting.value);
          if (colorSetting?.value) setPrimaryColor(colorSetting.value);
        }
      })
      .catch(() => {});

    fetch('/api/notifications')
      .then((res) => res.json())
      .then((data) => {
        if (data.summary) {
          setNotifSummary(data.summary);
        }
      })
      .catch(() => {});
  }, []);

  const handleMouseEnter = () => {
    if (!isPinned) {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
      setIsHovered(true);
    }
  };

  const handleMouseLeave = () => {
    if (!isPinned) {
      hoverTimeoutRef.current = setTimeout(() => {
        setIsHovered(false);
      }, 200);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  // Helper check permission access
  const hasAccess = (permission?: string | string[]) => {
    if (!user) return true; // Show items while loading or if not resolved
    if (user.role?.name === 'Admin' || user.permissions?.includes('*')) return true;
    if (!permission) return true;

    const userPerms = Array.isArray(user.permissions) ? user.permissions : [];
    if (Array.isArray(permission)) {
      return permission.some((p) => userPerms.includes(p));
    }
    return userPerms.includes(permission);
  };

  const isStaffUser = user?.role?.name === 'Staff';

  // Navigation dành riêng cho Nhân viên (tự thu gọn chỉ các tính năng cần thiết)
  const staffNavItems: NavItem[] = [
    {
      label: t('nav.portal', 'Cổng Nhân Viên'),
      href: '/portal',
      icon: UserCheck,
      badge: t('nav.portal_badge', 'Cá nhân'),
      badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
      permission: 'portal.view',
    },
    {
      label: t('nav.my_tickets', 'Yêu cầu hỗ trợ của tôi'),
      href: '/tickets',
      icon: LifeBuoy,
      badge: notifSummary.ticketsTotal > 0 ? String(notifSummary.ticketsTotal) : undefined,
      badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
      permission: ['tickets.view', 'tickets.create'],
    },
    {
      label: t('nav.kb', 'Hướng dẫn sử dụng IT'),
      href: '/kb',
      icon: BookOpen,
      permission: 'kb.view',
    },
    {
      label: t('nav.approvals', 'Yêu cầu & Phê duyệt'),
      href: '/approvals',
      icon: ClipboardCheck,
      permission: 'approvals.create',
    },
  ];

  // Navigation đầy đủ cho Quản trị viên và Quản lý tài sản
  const adminNavItems: NavItem[] = [
    {
      label: t('nav.portal', 'Cổng Nhân Viên'),
      href: '/portal',
      icon: UserCheck,
      permission: 'portal.view',
    },
    { label: t('nav.dashboard', 'Tổng quan (Dashboard)'), href: '/dashboard', icon: LayoutDashboard, permission: 'dashboard.view' },
    {
      label: t('nav.support', 'Hỗ trợ'),
      icon: LifeBuoy,
      badge: notifSummary.ticketsTotal > 0 ? String(notifSummary.ticketsTotal) : undefined,
      badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
      children: [
        {
          label: t('nav.tickets', 'Danh sách Ticket'),
          href: '/tickets',
          icon: LifeBuoy,
          badge: notifSummary.ticketsTotal > 0 ? String(notifSummary.ticketsTotal) : undefined,
          badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
          permission: ['tickets.view', 'tickets.create'],
        },
        {
          label: t('nav.approvals', 'Yêu cầu & Phê duyệt'),
          href: '/approvals',
          icon: ClipboardCheck,
          permission: 'approvals.create',
        },
        { label: t('nav.incidents', 'Sự cố & Vấn đề'), href: '/incidents', icon: AlertTriangle, permission: 'incidents.view' },
        { label: t('nav.kb', 'Hướng dẫn'), href: '/kb', icon: BookOpen, permission: 'kb.view' },
        {
          label: t('nav.reports', 'Báo cáo & Thống kê'),
          href: '/tickets/reports',
          icon: BarChart3,
          permission: ['reports.view', 'tickets.reports'],
        },
      ],
    },
    {
      label: t('nav.assets_mgmt', 'Quản lý Tài sản'),
      icon: Laptop,
      permission: 'assets.view',
      children: [
        { label: t('nav.assets_list', 'Danh sách Thiết bị'), href: '/assets', icon: Laptop, permission: 'assets.view' },
        ...(isModActive('AUDIT') ? [
          { label: t('nav.assets_audit', 'Kiểm kê Tài sản'), href: '/assets/audit', icon: ClipboardCheck, permission: 'assets.view' },
        ] : []),
        ...(isModActive('DISCOVERY') ? [
          { label: t('nav.assets_scan', 'Scan Thiết bị'), href: '/discovery', icon: ScanLine, permission: 'assets.view' },
        ] : []),
        ...(isModActive('FLOOR_MAPS') ? [
          { label: t('nav.floor_maps', 'Sơ đồ Mặt bằng 2D'), href: '/floor-maps', icon: Map, permission: 'assets.view' },
        ] : []),
        { label: t('nav.spare_parts', 'Kho Phụ tùng & Linh kiện'), href: '/spare-parts', icon: Boxes, permission: 'assets.view' },
      ],
    },
    {
      label: t('nav.licenses', 'Quản lý License'),
      href: '/licenses',
      icon: Key,
      badge: notifSummary.licensesExpiring > 0 ? String(notifSummary.licensesExpiring) : undefined,
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      permission: 'licenses.view',
    },
    {
      label: t('nav.services', 'Dịch vụ & Thuê bao IT'),
      href: '/services',
      icon: Package,
      badge: notifSummary.servicesExpiring > 0 ? String(notifSummary.servicesExpiring) : undefined,
      badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
      permission: 'services.view',
    },
    {
      label: t('nav.passwords', 'Quản lý tài khoản mật khẩu'),
      href: '/passwords',
      icon: KeyRound,
      permission: 'passwords.view',
    },
    { label: t('nav.documents', 'Hóa đơn & Hợp đồng'), href: '/documents', icon: FileText, permission: 'documents.view' },
    { label: t('nav.categories', 'Quản lý Danh mục'), href: '/categories', icon: Layers, permission: 'categories.view' },
    { label: t('nav.users', 'Nhân sự & Cấp phát'), href: '/users', icon: Users, permission: 'users.view' },
    { label: t('nav.settings', 'Cài đặt hệ thống'), href: '/settings', icon: Settings, permission: 'settings.view' },
  ];

  const currentNavItems = isStaffUser ? staffNavItems : adminNavItems;

  const visibleNavItems = currentNavItems
    .map((item) => {
      if (item.children) {
        const filteredChildren = item.children.filter((child) => hasAccess(child.permission));
        if (filteredChildren.length === 0) return null;
        return { ...item, children: filteredChildren };
      }
      if (!hasAccess(item.permission)) {
        return null;
      }
      return item;
    })
    .filter(Boolean) as NavItem[];

  const isExpanded = isPinned || isHovered || isMobileOpen;

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 md:hidden animate-in fade-in duration-200"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      <div
        className="hidden md:block relative shrink-0 z-30"
        style={{ width: isPinned ? 256 : 68 }}
      >
        {/* Placeholder spacer for desktop fixed layout */}
      </div>

      <aside
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={`bg-slate-900 text-slate-100 flex flex-col h-screen fixed top-0 left-0 border-r border-slate-800 z-50 transition-all duration-300 ease-in-out ${
          isMobileOpen
            ? 'w-64 shadow-2xl translate-x-0'
            : '-translate-x-full md:translate-x-0'
        } ${
          isExpanded ? 'w-64 shadow-2xl' : 'w-[68px] shadow-md'
        }`}
      >
        {/* Brand Header */}
        <div className="p-3 border-b border-slate-800 flex items-center justify-between gap-2 h-16 shrink-0">
          <div className="flex items-center space-x-3 min-w-0 flex-1 overflow-hidden">
            {appLogo && !logoError ? (
              <div className="w-10 h-10 rounded-xl bg-slate-800/80 flex items-center justify-center overflow-hidden border border-slate-700/50 p-1.5 shrink-0 shadow-inner">
                <img
                  src={appLogo}
                  alt="SIMPLY IT Logo"
                  className="w-full h-full object-contain"
                  onError={() => setLogoError(true)}
                />
              </div>
            ) : (
              <div
                style={{ backgroundColor: primaryColor || '#1976D2' }}
                className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20 shrink-0 font-extrabold text-white text-lg"
              >
                S
              </div>
            )}

            {isExpanded && (
              <div className="min-w-0 flex-1 animate-in fade-in duration-200">
                <h1 className="font-extrabold text-sm text-white tracking-wider truncate" title={appName}>{appName}</h1>
                <p className="text-[10px] text-cyan-400 font-medium truncate" title={companyName}>{companyName}</p>
              </div>
            )}
          </div>

          {/* Pin / Unpin Button */}
          {isExpanded && (
            <button
              type="button"
              onClick={handleTogglePin}
              className={`p-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer shrink-0 ${
                isPinned
                  ? 'text-indigo-400 hover:text-indigo-200 bg-slate-800 hover:bg-slate-700'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
              title={isPinned ? (language === 'en' ? 'Unpin (Collapse sidebar)' : 'Bỏ ghim (Thu gọn menu để mở rộng màn hình)') : (language === 'en' ? 'Pin sidebar' : 'Ghim cố định menu')}
            >
              {isPinned ? <Pin className="w-4 h-4" /> : <PinOff className="w-4 h-4" />}
            </button>
          )}
        </div>

        {/* Navigation Links */}
        <div className="flex-1 px-2 py-3 space-y-1 overflow-y-auto overflow-x-hidden">
          {isExpanded && (
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-2 animate-in fade-in duration-200">{language === 'en' ? 'Navigation' : 'Điều hướng'}</p>
          )}

          {visibleNavItems.map((item, idx) => {
            const Icon = item.icon;

            // IF THIS IS AN EXPANDABLE DROPDOWN MENU (e.g. HỖ TRỢ, QUẢN LÝ TÀI SẢN)
            if (item.children) {
              const isGroupOpen = Boolean(openMenus[item.label]);
              const isGroupActive = item.children.some(
                (c) => pathname === c.href || (c.href !== '/dashboard' && pathname.startsWith(c.href + '/'))
              );

              return (
                <div key={idx} className="space-y-1">
                  {/* Parent Accordion Header */}
                  <button
                    type="button"
                    onClick={() => toggleMenu(item.label)}
                    className={`w-full flex items-center rounded-xl text-sm font-medium transition-all group relative cursor-pointer ${
                      isExpanded ? 'px-3 py-2.5 space-x-3' : 'p-2.5 justify-center'
                    } ${
                      isGroupActive
                        ? 'bg-blue-600/20 text-blue-300 border border-blue-500/30 font-bold'
                        : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                    }`}
                    title={!isExpanded ? item.label : undefined}
                  >
                    <Icon className={`w-5 h-5 shrink-0 ${isGroupActive ? 'text-blue-400' : 'text-slate-400 group-hover:text-white'}`} />

                    {isExpanded && (
                      <span className="flex-1 text-left truncate animate-in fade-in duration-200 text-xs font-bold">
                        {item.label}
                      </span>
                    )}

                    {/* Badge or Chevron Arrow */}
                    {isExpanded && (
                      <div className="flex items-center gap-1.5 shrink-0">
                        {item.badge && (
                          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold border ${item.badgeColor || 'bg-blue-500/20 text-blue-300 border-blue-500/30'}`}>
                            {item.badge}
                          </span>
                        )}
                        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isGroupOpen ? 'rotate-0' : '-rotate-90'}`} />
                      </div>
                    )}
                  </button>

                  {/* Sub-items accordion container - ONLY RENDERS WHEN USER CLICKS TO OPEN */}
                  {isExpanded && isGroupOpen && (
                    <div className="pl-4 pr-1 py-1 space-y-1 border-l-2 border-blue-500/30 ml-4 animate-in fade-in slide-in-from-top-1 duration-150">
                      {item.children.map((sub) => {
                        const SubIcon = sub.icon;
                        const isSubActive =
                          pathname === sub.href ||
                          (sub.href !== '/dashboard' &&
                            pathname.startsWith(sub.href + '/') &&
                            !item.children?.some(
                              (otherSub) => otherSub.href !== sub.href && otherSub.href.length > sub.href.length && pathname.startsWith(otherSub.href)
                            ));

                        return (
                          <Link
                            key={sub.href}
                            href={sub.href}
                            className={`flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                              isSubActive
                                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-bold'
                                : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                            }`}
                          >
                            <SubIcon className={`w-4 h-4 shrink-0 ${isSubActive ? 'text-white' : 'text-slate-400'}`} />
                            <span className="flex-1 truncate">{sub.label}</span>
                            {sub.badge && (
                              <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-bold border shrink-0 ${sub.badgeColor || 'bg-blue-500/20 text-blue-300 border-blue-500/30'}`}>
                                {sub.badge}
                              </span>
                            )}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            // REGULAR STANDALONE ITEMS
            const isActive = pathname === item.href || (item.href && item.href !== '/' && pathname.startsWith(item.href + '/'));

            return (
              <Link
                key={item.href || idx}
                href={item.href || '#'}
                className={`flex items-center rounded-xl text-sm font-medium transition-all group relative cursor-pointer ${
                  isExpanded ? 'px-3 py-2.5 space-x-3' : 'p-2.5 justify-center'
                } ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-bold'
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                }`}
                title={!isExpanded ? item.label : undefined}
              >
                <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'}`} />

                {isExpanded && (
                  <span className="flex-1 truncate animate-in fade-in duration-200 text-xs">
                    {item.label}
                  </span>
                )}

                {/* Badge */}
                {item.badge && (
                  isExpanded ? (
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold border shrink-0 ${item.badgeColor || 'bg-blue-500/20 text-blue-300 border-blue-500/30'}`}>
                      {item.badge}
                    </span>
                  ) : (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-slate-900" />
                  )
                )}
              </Link>
            );
          })}
        </div>

        {/* User Footer Profile */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/40 shrink-0">
          <div className={`flex items-center space-x-2.5 ${isExpanded ? 'mb-2.5' : 'justify-center'}`}>
            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-slate-200 font-bold border border-slate-600 shrink-0 text-xs">
              {user?.fullName?.charAt(0) || <UserIcon className="w-4 h-4" />}
            </div>

            {isExpanded && (
              <div className="flex-1 min-w-0 animate-in fade-in duration-200">
                <p className="text-xs font-bold text-white truncate">{user?.fullName || t('common.loading', 'Đang tải...')}</p>
                <p className="text-[10px] text-blue-400 truncate font-mono">{user?.role?.name || user?.email || 'IT Manager'}</p>
              </div>
            )}
          </div>

          {isExpanded ? (
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-colors border border-rose-500/20 cursor-pointer animate-in fade-in duration-200"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>{t('header.logout', 'Đăng xuất')}</span>
            </button>
          ) : (
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center p-2 rounded-lg text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-colors border border-rose-500/20 cursor-pointer mt-1"
              title={t('header.logout', 'Đăng xuất')}
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </aside>
    </>
  );
}
