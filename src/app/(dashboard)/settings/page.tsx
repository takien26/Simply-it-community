'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Settings,
  Mail,
  Database,
  Sliders,
  Bell,
  Sparkles,
  Building,
  ShieldCheck,
  Palette,
  QrCode,
  Key,
  Globe,
  Shield,
  Loader2,
  Filter,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { SupportOrgSettingsTab } from '@/components/settings/support-org-tab';
import { CurrencySettingsCard } from '@/components/settings/currency-settings';
import { AuditLogsSettingsTab } from '@/components/settings/audit-logs-tab';
import { AlertSettingsTab } from '@/components/settings/alert-settings-tab';
import { EmailSettingsTab } from '@/components/settings/email-settings-tab';
import { MaintenanceSchedulesTab } from '@/components/settings/maintenance-schedules-tab';
import { WebhookSettingsTab } from '@/components/settings/webhook-settings-tab';
import { AICopilotSettingsTab } from '@/components/settings/ai-settings-tab';
import { LicenseSettingsTab } from '@/components/settings/license-settings-tab';
import { GeneralSettingsTab } from '@/components/settings/general-settings-tab';
import { SsoSettingsTab } from '@/components/settings/sso-settings-tab';
import { LdapSettingsTab } from '@/components/settings/ldap-settings-tab';
import { RbacSettingsTab } from '@/components/settings/rbac-settings-tab';
import { EnterpriseFeatureLock } from '@/components/common/EnterpriseFeatureLock';
import { useLanguage } from '@/lib/i18n/context';

interface NavItem {
  id: 'GENERAL' | 'ALERTS' | 'EMAIL' | 'MAINTENANCE' | 'WEBHOOKS' | 'AI_COPILOT' | 'CURRENCY' | 'ROUTING' | 'RBAC' | 'SSO' | 'LDAP' | 'AUDIT' | 'LICENSE';
  label: string;
  icon: string;
  desc: string;
  badge?: string;
  color?: string;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

function getSettingsNavGroups(isEn: boolean, isEnterprise: boolean, activeModules: string[] = []): NavGroup[] {
  return [
    {
      title: isEn ? 'System & Interface' : 'Hệ Thống & Giao Diện',
      items: [
        { id: 'GENERAL', label: isEn ? 'General Settings & Logo' : 'Cài đặt Chung & Logo', icon: '⚙️', desc: isEn ? 'System name, logo, favicon, interface appearance' : 'Tên hệ thống, logo, favicon, màu sắc giao diện' },
        { id: 'CURRENCY', label: isEn ? 'Currency & Base Denomination' : 'Tiền Tệ & Đồng Tiền Gốc', icon: '💰', desc: isEn ? 'Configure VND, USD, EUR and exchange rates' : 'Cấu hình VND, USD, EUR và tỷ giá hối đoái' },
        { id: 'LICENSE', label: isEn ? 'Edition & License' : 'Giấy Phép & Bản Quyền', icon: '🛡️', desc: isEn ? 'System edition, activation status' : 'Phiên bản hệ thống, kích hoạt bản quyền Enterprise' },
      ],
    },
    {
      title: isEn ? 'Security & Access Control' : 'Bảo Mật & Phân Quyền',
      items: [
        { id: 'RBAC', label: isEn ? 'Role-Based Access Control (RBAC)' : 'Phân Quyền Vai Trò (RBAC)', icon: '🔐', desc: isEn ? 'Detailed permission matrix for Admin, IT, Staff' : 'Ma trận quyền hạn chi tiết Admin, IT, Staff' },
        { id: 'SSO', label: isEn ? 'Microsoft 365 Single Sign-On' : 'Đăng Nhập SSO Microsoft 365', icon: '🔑', desc: isEn ? '1-click login via Microsoft Azure AD / Entra ID' : 'Đăng nhập 1 chạm qua Microsoft Azure AD', badge: !isEnterprise ? 'ENTERPRISE' : undefined },
        { id: 'LDAP', label: isEn ? 'LDAP / Active Directory' : 'Xác Thực LDAP / Active Directory', icon: '🏢', desc: isEn ? 'Synchronize Windows Server Active Directory accounts' : 'Đồng bộ tài khoản máy chủ Windows Server', badge: !isEnterprise ? 'ENTERPRISE' : undefined },
      ],
    },
    {
      title: isEn ? 'Integrations & Notifications' : 'Tích Hợp & Thông Báo',
      items: [
        { id: 'ALERTS', label: isEn ? 'Automated Alerts (Telegram/Email)' : 'Cảnh Báo Tự Động (Telegram/Email)', icon: '🚨', desc: isEn ? 'Scan expiry dates for IT services, licenses, warranties' : 'Quét hạn Dịch vụ IT, License, Bảo hành và bắn tin', badge: !isEnterprise ? 'ENTERPRISE' : undefined },
        { id: 'EMAIL', label: isEn ? 'Email & SMTP Configuration' : 'Cấu Hình Email & SMTP', icon: '📧', desc: isEn ? 'Mail servers & 7 automated notification email templates' : 'Máy chủ gửi mail & 7 mẫu email có link CTA' },
        { id: 'WEBHOOKS', label: isEn ? 'Multi-Channel Webhooks' : 'Webhook Đa Kênh (Teams/Zalo)', icon: '🔔', desc: isEn ? 'Instant alerts to Teams, Zalo, Slack webhooks' : 'Bắn thông báo tức thời qua Zalo, Teams, Slack', badge: !isEnterprise ? 'ENTERPRISE' : undefined },
      ],
    },
    {
      title: isEn ? 'ITSM Workflows & Operations' : 'Quy Trình & Vận Hành IT',
      items: [
        { id: 'ROUTING', label: isEn ? 'IT Support Org, Routing & SLA' : 'Tổ Chức IT, Phân Tuyến & SLA', icon: '🎯', desc: isEn ? 'Support teams, queues, and committed SLA policies' : 'Đội ngũ hỗ trợ, hàng đợi và hạn cam kết SLA', badge: !isEnterprise ? 'ENTERPRISE' : undefined },
        { id: 'MAINTENANCE', label: isEn ? 'Periodic Maintenance Schedules' : 'Lịch Bảo Trì Định Kỳ', icon: '📅', desc: isEn ? 'Automated maintenance schedules for enterprise assets' : 'Lên lịch tự động kiểm tra bảo dưỡng thiết bị' },
        { id: 'AI_COPILOT', label: isEn ? 'Artificial Intelligence (AI)' : 'Trí Tuệ Nhân Tạo (AI)', icon: '🤖', desc: isEn ? 'Configure Gemini AI models, Copilot assistant, and OCR' : 'Cấu hình Gemini API, Trợ lý AI và OCR hóa đơn', badge: !isEnterprise ? 'ENTERPRISE' : undefined },
      ],
    },
    {
      title: isEn ? 'Audit & Compliance' : 'Nhật Ký & Tuân Thủ',
      items: [
        { id: 'AUDIT', label: isEn ? 'Activity Logs (Audit Logs)' : 'Nhật Ký Hoạt Động (Audit Logs)', icon: '📜', desc: isEn ? 'Trace all user activities and audit trials' : 'Ghi vết toàn bộ hành động người dùng' },
      ],
    },
  ];
}

export default function SettingsPage() {
  const { language, setLanguage, t, supportedLanguages } = useLanguage();
  const isEn = language === 'en';
  const [activeTab, setActiveTab] = useState<'GENERAL' | 'ALERTS' | 'EMAIL' | 'MAINTENANCE' | 'WEBHOOKS' | 'AI_COPILOT' | 'CURRENCY' | 'ROUTING' | 'RBAC' | 'SSO' | 'LDAP' | 'AUDIT' | 'LICENSE'>('GENERAL');
  const [isEnterprise, setIsEnterprise] = useState<boolean>(false);
  const [activeModules, setActiveModules] = useState<string[]>([]);
  const [searchFilter, setSearchFilter] = useState('');
  const [isPinned, setIsPinned] = useState<boolean>(true);
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const [collapsedGroups, setCollapsedGroups] = useState<string[]>([]);
  const [isMobileTabMenuOpen, setIsMobileTabMenuOpen] = useState<boolean>(false);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Core settings state
  const [settings, setSettings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // RBAC State
  const [roles, setRoles] = useState<any[]>([]);
  const [allPermissions, setAllPermissions] = useState<any[]>([]);
  const [selectedRole, setSelectedRole] = useState<any>(null);
  const [rolePermissions, setRolePermissions] = useState<string[]>([]);
  const [roleSaved, setRoleSaved] = useState(false);
  const [rbacSubTab, setRbacSubTab] = useState<'ROLES' | 'PERMISSIONS'>('ROLES');
  const [permSearch, setPermSearch] = useState('');
  const [permModuleFilter, setPermModuleFilter] = useState('ALL');
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [roleFormId, setRoleFormId] = useState<string | null>(null);
  const [roleFormName, setRoleFormName] = useState('');
  const [roleFormDesc, setRoleFormDesc] = useState('');
  const [isPermModalOpen, setIsPermModalOpen] = useState(false);
  const [permFormId, setPermFormId] = useState<string | null>(null);
  const [permFormCode, setPermFormCode] = useState('');
  const [permFormName, setPermFormName] = useState('');
  const [permFormModule, setPermFormModule] = useState('documents');
  const [permFormDesc, setPermFormDesc] = useState('');
  const [savingPerm, setSavingPerm] = useState(false);

  // SSO & LDAP State
  const [copiedUri, setCopiedUri] = useState(false);
  const [testingLdap, setTestingLdap] = useState(false);
  const [ldapTestResult, setLdapTestResult] = useState<{ success: boolean; message: string } | null>(null);

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
      .catch((err) => console.error(err));
  };

  useEffect(() => {
    fetchLicenseStatus();
    const handleLicenseUpdated = () => fetchLicenseStatus();
    window.addEventListener('simply:license-updated', handleLicenseUpdated);
    return () => window.removeEventListener('simply:license-updated', handleLicenseUpdated);
  }, []);

  // Load pinned state & URL tab from localStorage / searchParams on mount
  useEffect(() => {
    try {
      const savedPin = localStorage.getItem('settings_sidebar_pinned');
      if (savedPin !== null) {
        setIsPinned(savedPin === 'true');
      }
      const urlParams = new URLSearchParams(window.location.search);
      const tabParam = urlParams.get('tab')?.toLowerCase();
      if (tabParam) {
        if (tabParam === 'ai' || tabParam === 'ai_copilot' || tabParam === 'copilot') {
          setActiveTab('AI_COPILOT');
        } else if (tabParam === 'alerts' || tabParam === 'alert' || tabParam === 'telegram') {
          setActiveTab('ALERTS');
        } else if (tabParam === 'email' || tabParam === 'smtp') {
          setActiveTab('EMAIL');
        } else if (tabParam === 'maintenance' || tabParam === 'schedule') {
          setActiveTab('MAINTENANCE');
        } else if (tabParam === 'webhooks' || tabParam === 'webhook') {
          setActiveTab('WEBHOOKS');
        } else if (tabParam === 'currency' || tabParam === 'currencies') {
          setActiveTab('CURRENCY');
        } else if (tabParam === 'routing' || tabParam === 'sla') {
          setActiveTab('ROUTING');
        } else if (tabParam === 'rbac' || tabParam === 'roles') {
          setActiveTab('RBAC');
        } else if (tabParam === 'sso' || tabParam === 'azure') {
          setActiveTab('SSO');
        } else if (tabParam === 'ldap' || tabParam === 'ad') {
          setActiveTab('LDAP');
        } else if (tabParam === 'audit' || tabParam === 'logs') {
          setActiveTab('AUDIT');
        } else if (tabParam === 'license' || tabParam === 'lic' || tabParam === 'banquyen') {
          setActiveTab('LICENSE');
        } else if (tabParam === 'general') {
          setActiveTab('GENERAL');
        }
      }
    } catch {
      // Ignore localStorage error
    }
  }, []);

  const handleTogglePin = () => {
    const nextState = !isPinned;
    setIsPinned(nextState);
    try {
      localStorage.setItem('settings_sidebar_pinned', String(nextState));
    } catch {
      // Ignore localStorage error
    }
  };

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
      }, 150);
    }
  };

  const isExpanded = isPinned || isHovered;

  const toggleGroup = (groupTitle: string) => {
    setCollapsedGroups((prev) =>
      prev.includes(groupTitle)
        ? prev.filter((t) => t !== groupTitle)
        : [...prev, groupTitle]
    );
  };

  const loadAll = async () => {
    setLoading(true);
    try {
      const [settingsRes, rolesRes, meRes] = await Promise.all([
        fetch('/api/settings').then((r) => r.json()),
        fetch('/api/roles').then((r) => r.json()),
        fetch('/api/auth/me').then((r) => r.json()).catch(() => null),
      ]);

      if (meRes?.success && meRes?.data) setCurrentUser(meRes.data);
      if (settingsRes.success) setSettings(settingsRes.data);
      if (rolesRes.success) {
        setRoles(rolesRes.data.roles);
        setAllPermissions(rolesRes.data.allPermissions);
        if (rolesRes.data.roles.length > 0 && !selectedRole) {
          setSelectedRole(rolesRes.data.roles[0]);
          setRolePermissions(rolesRes.data.roles[0].permissionCodes);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const handleChange = (key: string, value: string) => {
    setSettings((prev) => {
      const exists = prev.some((s) => s.key === key);
      if (exists) {
        return prev.map((s) => (s.key === key ? { ...s, value } : s));
      }
      return [...prev, { key, value, label: key, group: 'general' }];
    });
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(false);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings }),
      });

      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
        loadAll();
      }
    } catch {
      alert('Lỗi lưu cài đặt');
    }
  };

  const getSettingValue = (key: string) => {
    const s = settings.find((item) => item.key === key);
    return s ? s.value : '';
  };

  // SSO helpers
  const redirectUri = typeof window !== 'undefined'
    ? `${window.location.origin}/api/auth/sso/ms365/callback`
    : 'https://localhost:3443/api/auth/sso/ms365/callback';

  const copyRedirectUri = () => {
    navigator.clipboard.writeText(redirectUri);
    setCopiedUri(true);
    setTimeout(() => setCopiedUri(false), 2000);
  };

  // LDAP helpers
  const handleTestLdap = async () => {
    setTestingLdap(true);
    setLdapTestResult(null);
    try {
      const res = await fetch('/api/auth/ldap/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serverUrl: getSettingValue('ldap.server_url'),
          baseDn: getSettingValue('ldap.base_dn'),
          bindDn: getSettingValue('ldap.bind_dn'),
          bindPassword: getSettingValue('ldap.bind_password'),
          userSearchFilter: getSettingValue('ldap.user_search_filter'),
        }),
      });
      const data = await res.json();
      setLdapTestResult(data);
    } catch (e: any) {
      setLdapTestResult({ success: false, message: 'Lỗi khi gọi API kiểm tra: ' + e.message });
    } finally {
      setTestingLdap(false);
    }
  };

  // RBAC helpers
  const handleSelectRole = (role: any) => {
    setSelectedRole(role);
    setRolePermissions(role.permissionCodes || []);
  };

  const handleOpenRoleModal = (role?: any) => {
    if (role) {
      setRoleFormId(role.id);
      setRoleFormName(role.name);
      setRoleFormDesc(role.description || '');
    } else {
      setRoleFormId(null);
      setRoleFormName('');
      setRoleFormDesc('');
    }
    setIsRoleModalOpen(true);
  };

  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleFormName.trim()) return;

    try {
      const res = await fetch('/api/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: roleFormId,
          name: roleFormName.trim(),
          description: roleFormDesc.trim(),
        }),
      });
      if (res.ok) {
        setIsRoleModalOpen(false);
        loadAll();
      } else {
        const err = await res.json();
        alert(err.error || 'Lưu vai trò thất bại');
      }
    } catch {
      alert('Lỗi kết nối khi lưu vai trò');
    }
  };

  const handleDeleteRole = async (id: string, name: string) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa vai trò "${name}"?`)) return;
    try {
      const res = await fetch(`/api/roles?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        loadAll();
      } else {
        const err = await res.json();
        alert(err.error || 'Xóa vai trò thất bại');
      }
    } catch {
      alert('Lỗi kết nối khi xóa vai trò');
    }
  };

  const handleOpenPermModal = (perm?: any) => {
    if (perm) {
      setPermFormId(perm.id);
      setPermFormCode(perm.code);
      setPermFormName(perm.name);
      setPermFormModule(perm.module);
      setPermFormDesc(perm.description || '');
    } else {
      setPermFormId(null);
      setPermFormCode('');
      setPermFormName('');
      setPermFormModule('documents');
      setPermFormDesc('');
    }
    setIsPermModalOpen(true);
  };

  const handleSavePermission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!permFormCode.trim() || !permFormName.trim()) return;

    setSavingPerm(true);
    try {
      const method = permFormId ? 'PUT' : 'POST';
      const res = await fetch('/api/permissions', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: permFormId,
          code: permFormCode.trim(),
          name: permFormName.trim(),
          module: permFormModule.trim(),
          description: permFormDesc.trim(),
        }),
      });

      if (res.ok) {
        setIsPermModalOpen(false);
        loadAll();
      } else {
        const err = await res.json();
        alert(err.error || 'Lưu quyền hạn thất bại');
      }
    } catch {
      alert('Lỗi kết nối khi lưu quyền hạn');
    } finally {
      setSavingPerm(false);
    }
  };

  const handleDeletePermission = async (id: string, name: string, code: string) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa quyền "${name}" (${code}) khỏi hệ thống?`)) return;
    try {
      const res = await fetch(`/api/permissions?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        loadAll();
      } else {
        const err = await res.json();
        alert(err.error || 'Xóa quyền thất bại');
      }
    } catch {
      alert('Lỗi kết nối khi xóa quyền');
    }
  };

  const handleToggleModulePermissions = (modulePerms: any[], check: boolean) => {
    const codes = modulePerms.map((p) => p.code);
    if (check) {
      setRolePermissions((prev) => Array.from(new Set([...prev, ...codes])));
    } else {
      setRolePermissions((prev) => prev.filter((c) => !codes.includes(c)));
    }
  };

  const handleTogglePermission = (code: string) => {
    setRolePermissions((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  const handleSaveRolePermissions = async () => {
    if (!selectedRole) return;
    try {
      const res = await fetch('/api/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedRole.id,
          name: selectedRole.name,
          description: selectedRole.description,
          permissionCodes: rolePermissions,
        }),
      });
      if (res.ok) {
        setRoleSaved(true);
        setTimeout(() => setRoleSaved(false), 3000);
        loadAll();
      }
    } catch {
      alert('Lỗi khi lưu phân quyền');
    }
  };

  const roleName = currentUser?.role?.name || currentUser?.roleName || '';
  const isAdmin = roleName === 'Super Admin' || roleName === 'Admin';

  if (!loading && currentUser && !isAdmin) {
    return (
      <div className="max-w-md mx-auto my-16 p-8 bg-white rounded-3xl border border-rose-200 shadow-xl text-center space-y-4 animate-in fade-in">
        <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto text-2xl shadow-inner">
          🔒
        </div>
        <h2 className="text-lg font-black text-slate-900">Quyền Truy Cập Bị Giới Hạn</h2>
        <p className="text-xs text-slate-500 leading-relaxed">
          Chỉ Quản trị viên hệ thống (Role: <strong>Admin</strong>) mới có quyền truy cập, chỉnh sửa quy chuẩn thời hạn SLA, phân tuyến tự động và phân quyền vai trò.
        </p>
        <div className="pt-2">
          <a
            href="/dashboard"
            className="inline-block px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
          >
            Quay lại Tổng Quan
          </a>
        </div>
      </div>
    );
  }

  const navGroups = getSettingsNavGroups(isEn, isEnterprise, activeModules);
  const filteredNavGroups = navGroups.map((group) => {
    if (!searchFilter.trim()) return group;
    const term = searchFilter.toLowerCase();
    const items = group.items.filter(
      (item) =>
        item.label.toLowerCase().includes(term) ||
        item.desc.toLowerCase().includes(term) ||
        group.title.toLowerCase().includes(term)
    );
    return { ...group, items };
  }).filter((group) => group.items.length > 0);

  const currentNavItem = navGroups.flatMap((g) => g.items).find(
    (i) => i.id === activeTab
  );

  return (
    <div className="space-y-4 sm:space-y-6 w-full pb-20 md:pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/80">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <span className="p-2 bg-blue-600 text-white rounded-2xl shadow-xs text-lg">⚙️</span>
            <span>{isEn ? 'System Settings & Configuration' : 'Cài đặt & Cấu hình Hệ thống'}</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {isEnterprise
              ? (isEn ? 'Central administration for identity, role-based access control (RBAC), SSO/LDAP authentication, and ITSM integrations' : 'Trung tâm quản trị nhận diện, phân quyền vai trò (RBAC), bảo mật xác thực SSO/LDAP và tích hợp vận hành ITSM')
              : (isEn ? 'Central administration for system configuration, role-based access control (RBAC), and ITSM operations' : 'Trung tâm cấu hình hệ thống, phân quyền vai trò (RBAC) và tích hợp vận hành ITSM')}
          </p>
        </div>
      </div>

      {/* MOBILE SETTINGS TAB SWITCHER (Visible ONLY on mobile < md) */}
      <div className="md:hidden space-y-2.5 w-full">
        {/* Active Tab Card with Change Button */}
        <div className="p-3 bg-white rounded-2xl border border-slate-200/90 shadow-2xs flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <span className="text-xl p-2 bg-blue-50 text-blue-700 rounded-xl border border-blue-100 shrink-0">
              {currentNavItem?.icon}
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-bold text-slate-900 truncate">
                  {currentNavItem?.label}
                </span>
                {currentNavItem?.badge && (
                  <span className="text-[9px] px-1.5 py-0.2 rounded-full font-mono bg-amber-100 text-amber-800 border border-amber-200 font-bold shrink-0">
                    {currentNavItem.badge}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 truncate mt-0.5">
                {currentNavItem?.desc}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsMobileTabMenuOpen(true)}
            aria-label={isEn ? 'Open settings menu' : 'Mở menu cài đặt'}
            className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200/70 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1 cursor-pointer active:scale-95 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
          >
            <span>{isEn ? 'All Tabs' : 'Tất cả mục'}</span>
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Quick Horizontal Scrollable Strip for Fast 1-Touch Switching */}
        <nav aria-label={isEn ? 'Settings tabs' : 'Các mục cài đặt'} className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar -mx-1 px-1">
          {navGroups.flatMap((g) => g.items).map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200/80 shadow-2xs'
                }`}
              >
                <span className="text-sm">{item.icon}</span>
                <span className="whitespace-nowrap">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Full Modal Bottom Sheet for Selecting Settings on Mobile */}
        {isMobileTabMenuOpen && (
          <div role="dialog" aria-modal="true" aria-label={isEn ? 'System Settings Menu' : 'Danh Mục Cài Đặt Hệ Thống'} className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150">
            <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-lg max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in slide-in-from-bottom duration-200">
              {/* Modal Header */}
              <div className="p-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <span className="text-lg">⚙️</span>
                  <h3 className="text-sm font-bold text-slate-900">
                    {isEn ? 'System Settings Menu' : 'Danh Mục Cài Đặt Hệ Thống'}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMobileTabMenuOpen(false)}
                  aria-label={isEn ? 'Close menu' : 'Đóng menu'}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
                >
                  ✕
                </button>
              </div>

              {/* Modal Body with All Groups and Items */}
              <div className="p-3.5 space-y-4 overflow-y-auto flex-1">
                {navGroups.map((group) => (
                  <div key={group.title} className="space-y-1.5">
                    <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-2">
                      {group.title}
                    </div>
                    <div className="grid grid-cols-1 gap-1">
                      {group.items.map((item) => {
                        const isActive = activeTab === item.id;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => {
                              setActiveTab(item.id);
                              setIsMobileTabMenuOpen(false);
                            }}
                            className={`w-full flex items-center gap-3 p-2.5 rounded-2xl text-left transition-all cursor-pointer ${
                              isActive
                                ? 'bg-blue-600 text-white font-bold shadow-xs'
                                : 'hover:bg-slate-50 text-slate-700 border border-transparent hover:border-slate-200'
                            }`}
                          >
                            <span className="text-xl p-1.5 rounded-xl bg-slate-100/80 text-slate-900 shrink-0">
                              {item.icon}
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-1">
                                <span className="text-xs font-bold truncate">{item.label}</span>
                                {item.badge && (
                                  <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono shrink-0 ${
                                    isActive ? 'bg-blue-700 text-blue-100' : 'bg-amber-100 text-amber-800'
                                  }`}>
                                    {item.badge}
                                  </span>
                                )}
                              </div>
                              <p className={`text-[11px] font-normal truncate mt-0.5 ${
                                isActive ? 'text-blue-100' : 'text-slate-400'
                              }`}>
                                {item.desc}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main 2-Column Layout */}
      <div className="flex flex-col md:flex-row items-start gap-4 lg:gap-6 relative">
        {/* Left Sidebar Menu (Hidden on mobile, pristine on desktop) */}
        <aside
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          className={`hidden md:block shrink-0 transition-all duration-300 ease-in-out z-20 ${
            isExpanded ? 'w-80' : 'w-16'
          }`}
        >
          <div className="sticky top-4 bg-white rounded-3xl border border-slate-200 shadow-sm p-3 space-y-4 overflow-hidden">
            {/* Sidebar Controls */}
            <div className="flex items-center justify-between px-1 pb-2 border-b border-slate-100">
              {isExpanded ? (
                <>
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                    {isEn ? 'Navigation' : 'Điều Hướng'}
                  </span>
                  <button
                    type="button"
                    onClick={handleTogglePin}
                    className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-blue-600 transition-colors cursor-pointer"
                    title={isPinned ? (isEn ? 'Unpin sidebar' : 'Bỏ ghim thanh bên') : (isEn ? 'Pin sidebar' : 'Ghim thanh bên')}
                  >
                    {isPinned ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={handleTogglePin}
                  className="w-full flex justify-center p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-blue-600 transition-colors cursor-pointer"
                  title={isEn ? 'Expand sidebar' : 'Mở rộng thanh bên'}
                >
                  <PanelLeftOpen className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Quick Search in Sidebar */}
            {isExpanded && (
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder={isEn ? 'Search settings...' : 'Tìm cấu hình...'}
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            {/* Nav Groups */}
            <div className="space-y-4 max-h-[calc(100vh-220px)] overflow-y-auto pr-1">
              {filteredNavGroups.map((group) => {
                const isCollapsed = collapsedGroups.includes(group.title);
                return (
                  <div key={group.title} className="space-y-1">
                    {isExpanded && (
                      <button
                        type="button"
                        onClick={() => toggleGroup(group.title)}
                        className="w-full flex items-center justify-between px-2 py-1 text-[10px] font-black uppercase tracking-wider text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        <span>{group.title}</span>
                        {isCollapsed ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
                      </button>
                    )}

                    {!isCollapsed && (
                      <div className="space-y-0.5">
                        {group.items.map((item) => {
                          const isActive = activeTab === item.id;
                          return (
                            <div key={item.id} className="relative group">
                              <button
                                type="button"
                                onClick={() => setActiveTab(item.id)}
                                className={`w-full flex items-center rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                                  isExpanded ? 'gap-3 p-2.5' : 'justify-center p-2.5'
                                } ${
                                  isActive
                                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                }`}
                              >
                                <span className="text-base shrink-0">{item.icon}</span>
                                {isExpanded && (
                                  <div className="text-left min-w-0 flex-1">
                                    <div className="flex items-center justify-between gap-1">
                                      <span className="truncate">{item.label}</span>
                                      {item.badge && (
                                        <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono shrink-0 ${
                                          isActive
                                            ? 'bg-blue-700 text-blue-100'
                                            : 'bg-amber-100 text-amber-800'
                                        }`}>
                                          {item.badge}
                                        </span>
                                      )}
                                    </div>
                                    <p className={`text-[10px] font-normal truncate mt-0.5 ${
                                      isActive ? 'text-blue-100' : 'text-slate-400'
                                    }`}>
                                      {item.desc}
                                    </p>
                                  </div>
                                )}
                              </button>

                              {/* Tooltip when collapsed */}
                              {!isExpanded && (
                                <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-3 py-1.5 bg-slate-900 text-white text-xs rounded-xl shadow-xl whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity z-50">
                                  <p className="font-bold">{item.label}</p>
                                  <p className="text-[10px] text-slate-300 font-normal">{item.desc}</p>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </aside>

        {/* Right Content Area */}
        <main className="w-full flex-1 min-w-0 space-y-4 sm:space-y-6">
          {/* Active Tab Heading Card (Desktop only, mobile has top selector) */}
          {currentNavItem && (
            <div className="hidden md:flex p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl p-2 bg-slate-50 rounded-xl border border-slate-100">{currentNavItem.icon}</span>
                <div>
                  <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <span>{currentNavItem.label}</span>
                    {currentNavItem.badge && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-amber-100 text-amber-800 border border-amber-200 font-bold">
                        {currentNavItem.badge}
                      </span>
                    )}
                  </h2>
                  <p className="text-xs text-slate-500">{currentNavItem.desc}</p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 1: GENERAL & APPEARANCE */}
          {activeTab === 'GENERAL' && (
            <GeneralSettingsTab
              isEn={isEn}
              language={language}
              setLanguage={setLanguage}
              supportedLanguages={supportedLanguages}
              settings={settings}
              getSettingValue={getSettingValue}
              handleChange={handleChange}
              handleSaveSettings={handleSaveSettings}
              saved={saved}
              loadAll={loadAll}
            />
          )}

          {/* TAB 2: CURRENCY */}
          {activeTab === 'CURRENCY' && (
            <div className="space-y-6">
              <CurrencySettingsCard />
            </div>
          )}

          {/* TAB 3: LICENSE */}
          {activeTab === 'LICENSE' && (
            <LicenseSettingsTab />
          )}

          {/* TAB 4: RBAC */}
          {activeTab === 'RBAC' && (
            <RbacSettingsTab
              isEn={isEn}
              roles={roles}
              allPermissions={allPermissions}
              selectedRole={selectedRole}
              rolePermissions={rolePermissions}
              roleSaved={roleSaved}
              rbacSubTab={rbacSubTab}
              setRbacSubTab={setRbacSubTab}
              permSearch={permSearch}
              setPermSearch={setPermSearch}
              permModuleFilter={permModuleFilter}
              setPermModuleFilter={setPermModuleFilter}
              handleSelectRole={handleSelectRole}
              handleSaveRolePermissions={handleSaveRolePermissions}
              handleToggleModulePermissions={handleToggleModulePermissions}
              handleTogglePermission={handleTogglePermission}
              handleDeleteRole={handleDeleteRole}
              handleDeletePermission={handleDeletePermission}
              handleOpenRoleModal={handleOpenRoleModal}
              handleOpenPermModal={handleOpenPermModal}
              isRoleModalOpen={isRoleModalOpen}
              setIsRoleModalOpen={setIsRoleModalOpen}
              roleFormId={roleFormId}
              roleFormName={roleFormName}
              setRoleFormName={setRoleFormName}
              roleFormDesc={roleFormDesc}
              setRoleFormDesc={setRoleFormDesc}
              handleSaveRole={handleSaveRole}
              isPermModalOpen={isPermModalOpen}
              setIsPermModalOpen={setIsPermModalOpen}
              permFormId={permFormId}
              permFormCode={permFormCode}
              setPermFormCode={setPermFormCode}
              permFormName={permFormName}
              setPermFormName={setPermFormName}
              permFormModule={permFormModule}
              setPermFormModule={setPermFormModule}
              permFormDesc={permFormDesc}
              setPermFormDesc={setPermFormDesc}
              handleSavePermission={handleSavePermission}
              savingPerm={savingPerm}
            />
          )}

          {/* TAB 5: SSO */}
          {activeTab === 'SSO' && (
            <SsoSettingsTab
              isEn={isEn}
              saved={saved}
              getSettingValue={getSettingValue}
              handleChange={handleChange}
              handleSaveSettings={handleSaveSettings}
              copyRedirectUri={copyRedirectUri}
              copiedUri={copiedUri}
              redirectUri={redirectUri}
              isModActive={isModActive}
            />
          )}

          {/* TAB 6: LDAP */}
          {activeTab === 'LDAP' && (
            <LdapSettingsTab
              isEn={isEn}
              saved={saved}
              getSettingValue={getSettingValue}
              handleChange={handleChange}
              handleSaveSettings={handleSaveSettings}
              roles={roles}
              testingLdap={testingLdap}
              ldapTestResult={ldapTestResult}
              handleTestLdap={handleTestLdap}
              isModActive={isModActive}
            />
          )}

          {/* TAB 7: ALERTS */}
          {activeTab === 'ALERTS' && (
            isModActive('ALERTS') ? (
              <AlertSettingsTab />
            ) : (
              <EnterpriseFeatureLock
                previewType="alerts"
                tier="ENTERPRISE"
                icon="🚨"
                title="Cảnh Báo Tự Động Telegram, Email & MS Teams"
                titleEn="Automated Expiry Alerts (Telegram, Email & MS Teams)"
                subtitle="Tự động quét hạn hợp đồng Dịch vụ IT, Bản quyền License, Bảo hành thiết bị và bắn tin tức thời"
                subtitleEn="Automated background scan for IT service renewals, software licenses, and device warranty deadlines"
                bullets={[
                  'Quét tự động định kỳ vào 08:00 sáng mỗi ngày',
                  'Thông báo đa kênh: Telegram Bot, Email SMTP, Microsoft Teams',
                  'Cảnh báo theo 3 mốc hạn: 30 ngày, 15 ngày, và 7 ngày trước khi hết hạn',
                  'Gửi email thông báo trực tiếp đến kỹ thuật viên phụ trách dịch vụ/thiết bị',
                  'Hỗ trợ cấu hình tùy biến Chat ID Telegram và Webhook URL',
                ]}
                bulletsEn={[
                  'Daily automated background scan at 08:00 AM',
                  'Multi-channel dispatch: Telegram Bot, SMTP Email, Microsoft Teams',
                  '3-tier warning thresholds: 30 days, 15 days, and 7 days prior to expiry',
                  'Direct notification to assigned IT technician or asset manager',
                  'Custom Telegram Chat ID and Webhook configuration',
                ]}
              />
            )
          )}

          {/* TAB 8: EMAIL */}
          {activeTab === 'EMAIL' && <EmailSettingsTab />}

          {/* TAB 9: MAINTENANCE */}
          {activeTab === 'MAINTENANCE' && <MaintenanceSchedulesTab />}

          {/* TAB 10: WEBHOOKS */}
          {activeTab === 'WEBHOOKS' && (
            isModActive('WEBHOOKS') ? (
              <WebhookSettingsTab />
            ) : (
              <EnterpriseFeatureLock
                previewType="webhooks"
                tier="ENTERPRISE"
                icon="🔔"
                title="Webhook Đa Kênh Tức Thời (Zalo, Teams, Slack, Lark)"
                titleEn="Multi-Channel Webhooks (Teams, Slack, Zalo, Lark)"
                subtitle="Bắn thông báo sự kiện Ticket mới, Sự cố khẩn cấp và Phê duyệt thiết bị tức thì qua HTTP Webhook"
                subtitleEn="Real-time event webhooks for new tickets, critical incidents, and asset approvals"
                bullets={[
                  'Gửi payload JSON chuẩn hóa đến mọi hệ thống bên ngoài',
                  'Hỗ trợ Microsoft Teams Incoming Webhook với Adaptive Cards',
                  'Tích hợp Zalo OA ZNS, Slack Webhook, Lark Suite, Discord Bot',
                  'Lọc sự kiện theo mức độ ưu tiên (Khẩn cấp, Cao, Bình thường)',
                  'Nhật ký gửi Webhook và cơ chế thử lại tự động khi mất kết nối',
                ]}
                bulletsEn={[
                  'Standardized JSON payloads to any external webhook receiver',
                  'Native Microsoft Teams Adaptive Cards with interactive buttons',
                  'Seamless integration with Slack, Discord, Lark Suite, and Zalo OA',
                  'Event filtering by priority (Critical, High, Normal)',
                  'Full webhook dispatch log and automatic exponential retry',
                ]}
              />
            )
          )}

          {/* TAB 11: ROUTING */}
          {activeTab === 'ROUTING' && (
            isModActive('ROUTING') ? (
              <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs">
                <SupportOrgSettingsTab />
              </div>
            ) : (
              <EnterpriseFeatureLock
                previewType="routing"
                tier="ENTERPRISE"
                icon="🎯"
                title="Tổ Chức IT, Phân Tuyến Hỗ Trợ & SLA Tự Động"
                titleEn="IT Support Organization, Routing & Automated SLA"
                subtitle="Quản lý Đội ngũ hỗ trợ (Support Teams), Hàng đợi (Queues), Phân tuyến thông minh và Chính sách SLA cam kết"
                subtitleEn="Manage Support Teams, Queues, Round-Robin Auto-Assignment, and SLA Escalation Policies"
                bullets={[
                  'Thiết lập đa Đội hỗ trợ IT theo chuyên môn (Phần mềm, Mạng, Phần cứng, ERP)',
                  'Hàng đợi thông minh phân phối ticket tự động (Round-Robin hoặc Least-Busy)',
                  'Chính sách SLA linh hoạt theo mức độ ưu tiên và loại sự cố',
                  'Tự động leo thang (Escalation) khi ticket sắp hoặc quá hạn cam kết',
                  'Báo cáo tuân thủ SLA và hiệu suất xử lý của từng kỹ thuật viên',
                ]}
                bulletsEn={[
                  'Multi-team IT organization by specialization (Software, Network, Hardware, ERP)',
                  'Smart queuing with Round-Robin or Least-Busy auto-assignment',
                  'Flexible SLA commitments tailored to priority and incident severity',
                  'Automatic escalation when tickets approach or exceed SLA deadlines',
                  'Technician resolution efficiency and SLA compliance metrics',
                ]}
              />
            )
          )}

          {/* TAB 12: AI COPILOT */}
          {activeTab === 'AI_COPILOT' && (
            isModActive('AI_COPILOT') ? (
              <div className="space-y-6">
                <AICopilotSettingsTab />
              </div>
            ) : (
              <EnterpriseFeatureLock
                previewType="ai"
                tier="ENTERPRISE"
                icon="🤖"
                title="Trí Tuệ Nhân Tạo (AI Copilot & Trợ Lý Ảo IT)"
                titleEn="Artificial Intelligence (AI Copilot & Virtual Assistant)"
                subtitle="Tích hợp Google Gemini AI thế hệ mới: OCR hóa đơn, Chẩn đoán ticket sự cố và Trợ lý ảo hỏi đáp"
                subtitleEn="Next-generation Google Gemini AI: Invoice OCR, intelligent ticket diagnosis, and virtual IT assistant"
                bullets={[
                  'Trích xuất tự động thông tin từ Hóa đơn VAT / Hợp đồng bằng AI OCR chính xác 99%',
                  'Trợ lý ảo Copilot giải đáp quy trình IT nội bộ và tìm kiếm tài sản thông minh',
                  'Tự động phân loại danh mục và đề xuất kỹ thuật viên xử lý ticket',
                  'Gợi ý giải pháp khắc phục sự cố dựa trên kho tri thức IT (Knowledge Base)',
                  'Tùy biến Prompt mẫu và quản lý hạn ngạch API Token theo doanh nghiệp',
                ]}
                bulletsEn={[
                  'Automated VAT invoice / contract data extraction with 99% OCR accuracy',
                  'Virtual Copilot assistant for internal IT inquiries and smart asset discovery',
                  'Automated ticket categorization and technician recommendation',
                  'Intelligent troubleshooting suggestions grounded in Knowledge Base articles',
                  'Custom prompt templates and enterprise API token quota controls',
                ]}
              />
            )
          )}

          {/* TAB 13: AUDIT LOGS */}
          {activeTab === 'AUDIT' && (
            <AuditLogsSettingsTab />
          )}
        </main>
      </div>
    </div>
  );
}
