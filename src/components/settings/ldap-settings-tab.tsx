'use client';

import React from 'react';
import { CheckCircle2, AlertCircle, Loader2, Save } from 'lucide-react';
import { EnterpriseFeatureLock } from '@/components/common/EnterpriseFeatureLock';

interface LdapSettingsTabProps {
  isEn: boolean;
  saved: boolean;
  getSettingValue: (key: string) => string;
  handleChange: (key: string, value: string) => void;
  handleSaveSettings: (e: React.FormEvent) => void;
  roles: any[];
  testingLdap: boolean;
  ldapTestResult: { success: boolean; message: string } | null;
  handleTestLdap: () => void;
  isModActive: (mod: string) => boolean;
}

export function LdapSettingsTab({
  isEn,
  saved,
  getSettingValue,
  handleChange,
  handleSaveSettings,
  roles,
  testingLdap,
  ldapTestResult,
  handleTestLdap,
  isModActive,
}: LdapSettingsTabProps) {
  const [syncingLdap, setSyncingLdap] = React.useState(false);
  const [ldapSyncResult, setLdapSyncResult] = React.useState<{ success: boolean; message: string; importedCount?: number } | null>(null);

  const handleSwitchToLdaps = (suggestedUrl?: string) => {
    let newUrl = suggestedUrl;
    if (!newUrl) {
      const current = getSettingValue('ldap.server_url');
      let host = 'localhost';
      try {
        const clean = current.replace(/^ldaps?:\/\//i, '').split('/')[0].split(':')[0];
        if (clean) host = clean;
      } catch {}
      newUrl = `ldaps://${host}:636`;
    }
    handleChange('ldap.server_url', newUrl);
    setTimeout(() => {
      handleTestLdap();
    }, 150);
  };

  const handleSwitchToUpn = (suggestedBindDn: string) => {
    if (suggestedBindDn) {
      handleChange('ldap.bind_dn', suggestedBindDn);
      setTimeout(() => {
        handleTestLdap();
      }, 150);
    }
  };

  const handleApplyRecommendedConfig = (suggestedUrl?: string, suggestedBindDn?: string) => {
    if (suggestedUrl) {
      handleChange('ldap.server_url', suggestedUrl);
    }
    if (suggestedBindDn) {
      handleChange('ldap.bind_dn', suggestedBindDn);
    }
    setTimeout(() => {
      handleTestLdap();
    }, 150);
  };

  const handleSyncLdapNow = async () => {
    const serverUrl = getSettingValue('ldap.server_url');
    const baseDn = getSettingValue('ldap.base_dn');
    if (!serverUrl || !baseDn) {
      setLdapSyncResult({
        success: false,
        message: isEn
          ? 'Please enter LDAP Server URL and Base DN before syncing.'
          : 'Vui lòng nhập đầy đủ Địa chỉ máy chủ LDAP Server URL và Base DN trước khi đồng bộ.',
      });
      return;
    }

    setSyncingLdap(true);
    setLdapSyncResult(null);
    try {
      const res = await fetch('/api/users/sync-directory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: 'ldap',
          config: {
            enabled: true,
            serverUrl,
            baseDn,
            bindDn: getSettingValue('ldap.bind_dn'),
            bindPassword: getSettingValue('ldap.bind_password'),
            userSearchFilter: getSettingValue('ldap.user_search_filter'),
            defaultRoleId: getSettingValue('ldap.default_role_id'),
            autoSyncInterval: getSettingValue('ldap.auto_sync_interval') || '60',
            autoCreateUser: getSettingValue('ldap.auto_create_user') !== 'false',
            domain: getSettingValue('ldap.domain'),
          },
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        handleChange('ldap.enabled', 'true');
        setLdapSyncResult({
          success: true,
          message: data.message,
          importedCount: data.ldapImportedCount || data.importedCount,
        });
      } else {
        setLdapSyncResult({
          success: false,
          message: data.error || data.message || (isEn ? 'LDAP sync failed' : 'Đồng bộ thất bại'),
        });
      }
    } catch (err: any) {
      setLdapSyncResult({
        success: false,
        message: err.message || (isEn ? 'API connection error' : 'Lỗi kết nối API'),
      });
    } finally {
      setSyncingLdap(false);
    }
  };

  if (!isModActive('LDAP')) {
    return (
      <EnterpriseFeatureLock
        previewType="ldap"
        tier="ENTERPRISE"
        icon="🏢"
        title="Đồng Bộ Thư Mục Active Directory (LDAP / Windows Server)"
        titleEn="Active Directory / LDAP Directory Synchronization"
        subtitle="Đồng bộ danh bạ người dùng và xác thực tập trung từ máy chủ Windows Server Active Directory On-Premise"
        subtitleEn="Centralized user sync and authentication from On-Premise Windows Server Active Directory"
        bullets={[
          'Kết nối an toàn qua giao thức LDAPS (Cổng 636 mã hóa SSL/TLS)',
          'Tự động đồng bộ danh sách nhân viên từ Organizational Unit (OU)',
          'Xác thực trực tiếp với Domain Controller của doanh nghiệp',
          'Tự động vô hiệu hóa tài khoản khi nhân viên thôi việc trên AD',
          'Tùy biến bộ lọc User Search Filter linh hoạt',
          'Hỗ trợ cả Windows Server AD và Linux OpenLDAP / FreeIPA',
        ]}
        bulletsEn={[
          'Secure LDAPS communication over encrypted SSL/TLS port 636',
          'Automated employee roster sync from target Organizational Units (OU)',
          'Direct authentication against corporate Domain Controllers',
          'Instant account deactivation upon AD offboarding',
          'Customizable LDAP search filters and attribute mappings',
          'Supports Windows Server AD, OpenLDAP, and FreeIPA',
        ]}
      />
    );
  }

  return (
    <form onSubmit={handleSaveSettings} className="space-y-6">
      {saved && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-semibold rounded-2xl flex items-center space-x-2 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          <span>{isEn ? 'LDAP / Active Directory configuration saved successfully!' : 'Cấu hình xác thực LDAP / Active Directory đã được lưu thành công!'}</span>
        </div>
      )}

      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 flex-wrap gap-2">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-lg">
              🏢
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">{isEn ? 'LDAP / Active Directory (AD) Authentication Server' : 'Máy Chủ Xác Thực LDAP / Active Directory (AD)'}</h3>
              <p className="text-xs text-slate-500">{isEn ? 'Synchronize logins with enterprise Windows Domain / OpenLDAP accounts' : 'Đồng bộ đăng nhập với tài khoản Windows Domain / OpenLDAP của doanh nghiệp'}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={getSettingValue('ldap.enabled') === 'true'}
                onChange={(e) => handleChange('ldap.enabled', e.target.checked ? 'true' : 'false')}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
              <span className="ml-2 text-xs font-bold text-slate-700">
                {isEn
                  ? (getSettingValue('ldap.enabled') === 'true' ? 'ON' : 'OFF')
                  : (getSettingValue('ldap.enabled') === 'true' ? 'Đang BẬT' : 'Đang TẮT')}
              </span>
            </label>
          </div>
        </div>

        {/* Test connection alert */}
        {ldapTestResult && (
          <div
            className={`p-4 rounded-xl border text-xs font-semibold flex items-start gap-2 animate-in fade-in ${
              ldapTestResult.success
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            {ldapTestResult.success ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            )}
            <div className="flex-1 min-w-0">
              <span className="whitespace-pre-line leading-relaxed">{ldapTestResult.message || (ldapTestResult as any).error}</span>
              {/* Quick action buttons if suggested configuration available */}
              {((ldapTestResult as any)?.suggestedUrl || (ldapTestResult as any)?.suggestedBindDn) && (
                <div className="mt-2.5 pt-2.5 border-t border-current/10 flex flex-wrap gap-2">
                  {(ldapTestResult as any)?.suggestedUrl && (ldapTestResult as any)?.suggestedBindDn && (
                    <button
                      type="button"
                      onClick={() => handleApplyRecommendedConfig((ldapTestResult as any).suggestedUrl, (ldapTestResult as any).suggestedBindDn)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                    >
                      <span>⚡ {isEn ? 'Apply Recommended Settings & Test Again' : 'Áp dụng toàn bộ cấu hình khuyến nghị & Thử lại'}</span>
                    </button>
                  )}
                  {(ldapTestResult as any)?.suggestedUrl && getSettingValue('ldap.server_url') !== (ldapTestResult as any).suggestedUrl && (
                    <button
                      type="button"
                      onClick={() => handleSwitchToLdaps((ldapTestResult as any)?.suggestedUrl)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                    >
                      <span>⚡ {isEn ? 'Switch to Secure LDAPS (Port 636)' : 'Đổi sang LDAPS (Cổng 636)'}</span>
                    </button>
                  )}
                  {(ldapTestResult as any)?.suggestedBindDn && getSettingValue('ldap.bind_dn') !== (ldapTestResult as any).suggestedBindDn && (
                    <button
                      type="button"
                      onClick={() => handleSwitchToUpn((ldapTestResult as any).suggestedBindDn)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                    >
                      <span>⚡ {isEn ? `Use UPN Format (${(ldapTestResult as any).suggestedBindDn})` : `Đổi sang định dạng UPN (${(ldapTestResult as any).suggestedBindDn})`}</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Sync directory result alert */}
        {ldapSyncResult && (
          <div
            className={`p-4 rounded-xl border text-xs font-semibold flex items-start gap-2 animate-in fade-in ${
              ldapSyncResult.success
                ? 'bg-indigo-50 border-indigo-200 text-indigo-900'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            {ldapSyncResult.success ? (
              <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            )}
            <div className="flex-1 min-w-0">
              <span className="whitespace-pre-line leading-relaxed">{ldapSyncResult.message}</span>
              {(ldapSyncResult?.message && (ldapSyncResult.message.includes('636') || ldapSyncResult.message.includes('ECONNRESET'))) && !ldapSyncResult.success && (
                <div className="mt-2 pt-2 border-t border-rose-200/80">
                  <button
                    type="button"
                    onClick={() => handleSwitchToLdaps()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                  >
                    <span>⚡ {isEn ? 'Switch to Secure LDAPS (Port 636) & Test Again' : 'Tự động đổi sang LDAPS (Cổng 636 Mã Hóa) & Thử lại'}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Form inputs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {isEn ? 'LDAP Server URL' : 'Địa chỉ máy chủ LDAP Server URL'} <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              placeholder="VD: ldaps://dc.company.com:636 hoặc ldap://192.168.1.10:389"
              value={getSettingValue('ldap.server_url')}
              onChange={(e) => handleChange('ldap.server_url', e.target.value)}
              className="w-full p-2.5 border border-slate-300 rounded-xl text-xs font-mono outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
              {isEn
                ? 'Standard ports: 389 (LDAP) or 636 (LDAPS SSL/TLS). Active Directory requires LDAPS (port 636) by default.'
                : 'Cổng chuẩn: 389 (LDAP) hoặc 636 (LDAPS SSL). Máy chủ Windows Server AD mặc định yêu cầu LDAPS (cổng 636 mã hóa) để tránh lỗi ngắt kết nối (ECONNRESET).'}
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {isEn ? 'Base DN (Search Base)' : 'Base DN (Tên miền cơ sở tìm kiếm)'} <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              placeholder="VD: dc=company,dc=com hoặc ou=Users,dc=company,dc=local"
              value={getSettingValue('ldap.base_dn')}
              onChange={(e) => handleChange('ldap.base_dn', e.target.value)}
              className="w-full p-2.5 border border-slate-300 rounded-xl text-xs font-mono outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <p className="text-[10px] text-slate-400 mt-1">{isEn ? 'Search scope for user accounts in directory tree' : 'Phạm vi tìm kiếm tài khoản nhân viên trong cây thư mục'}</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {isEn ? 'Bind DN (Admin Account)' : 'Bind DN (Tài khoản kết nối quản trị)'}
            </label>
            <input
              type="text"
              placeholder="VD: cn=Administrator,dc=company,dc=com hoặc svc_ldap@company.com"
              value={getSettingValue('ldap.bind_dn')}
              onChange={(e) => handleChange('ldap.bind_dn', e.target.value)}
              className="w-full p-2.5 border border-slate-300 rounded-xl text-xs font-mono outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <p className="text-[10px] text-slate-400 mt-1">{isEn ? 'Leave blank if server allows Anonymous Bind' : 'Để trống nếu máy chủ cho phép Anonymous Bind'}</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {isEn ? 'Bind Password (Connection Password)' : 'Bind Password (Mật khẩu tài khoản kết nối)'}
            </label>
            <input
              type="password"
              placeholder="••••••••••••"
              value={getSettingValue('ldap.bind_password')}
              onChange={(e) => handleChange('ldap.bind_password', e.target.value)}
              className="w-full p-2.5 border border-slate-300 rounded-xl text-xs font-mono outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        <div className="space-y-4 pt-2 border-t border-slate-100">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {isEn ? 'User Search Filter' : 'User Search Filter (Bộ lọc tìm kiếm tài khoản)'}
            </label>
            <input
              type="text"
              placeholder="(|(sAMAccountName={{username}})(mail={{username}})(userPrincipalName={{username}}))"
              value={getSettingValue('ldap.user_search_filter') || '(|(sAMAccountName={{username}})(mail={{username}})(userPrincipalName={{username}}))'}
              onChange={(e) => handleChange('ldap.user_search_filter', e.target.value)}
              className="w-full p-2.5 border border-slate-300 rounded-xl text-xs font-mono outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {isEn ? 'Default Role for New LDAP Users' : 'Vai trò mặc định gán cho User LDAP mới'}
              </label>
              <select
                value={getSettingValue('ldap.default_role_id')}
                onChange={(e) => handleChange('ldap.default_role_id', e.target.value)}
                className="w-full p-2.5 border border-slate-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-emerald-500 font-semibold"
              >
                <option value="">{isEn ? '-- Default (Staff) --' : '-- Mặc định (Nhân viên / Staff) --'}</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} {r.isSystem ? '(Hệ thống)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {isEn ? 'Automatic Background Sync Schedule' : 'Chu kỳ tự động đồng bộ ngầm (Background Sync)'}
              </label>
              <select
                value={getSettingValue('ldap.auto_sync_interval') || '60'}
                onChange={(e) => handleChange('ldap.auto_sync_interval', e.target.value)}
                className="w-full p-2.5 border border-emerald-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-emerald-500 font-semibold bg-emerald-50/40 text-emerald-900"
              >
                <option value="0">{isEn ? 'Off (Manual sync only via buttons)' : 'Tắt (Chỉ đồng bộ thủ công khi bấm nút)'}</option>
                <option value="30">{isEn ? 'Every 30 minutes' : 'Mỗi 30 phút'}</option>
                <option value="60">{isEn ? 'Every 1 hour (Recommended)' : 'Mỗi 1 giờ (Mặc định - Khuyên dùng)'}</option>
                <option value="120">{isEn ? 'Every 2 hours' : 'Mỗi 2 giờ'}</option>
                <option value="360">{isEn ? 'Every 6 hours' : 'Mỗi 6 giờ'}</option>
                <option value="720">{isEn ? 'Every 12 hours' : 'Mỗi 12 giờ'}</option>
                <option value="1440">{isEn ? 'Every 24 hours (Daily)' : 'Mỗi 24 giờ (1 lần/ngày)'}</option>
              </select>
              <p className="text-[10px] text-slate-400 mt-1">
                {isEn ? 'Server automatically synchronizes directory, adds new employees and deactivates resigned staff' : 'Hệ thống tự động chạy ngầm: nạp nhân viên mới, cập nhật phòng ban và khóa tài khoản nghỉ việc'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="autoCreateLdapUser"
              checked={getSettingValue('ldap.auto_create_user') !== 'false'}
              onChange={(e) => handleChange('ldap.auto_create_user', e.target.checked ? 'true' : 'false')}
              className="rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
            />
            <label htmlFor="autoCreateLdapUser" className="text-xs font-bold text-slate-700 cursor-pointer">
              {isEn ? 'Automatically create system account upon first successful LDAP login (JIT)' : 'Tự động tạo tài khoản trong hệ thống khi đăng nhập LDAP thành công lần đầu (JIT Provisioning)'}
            </label>
          </div>
        </div>

        {/* Test Connection Button, Sync Button & Save */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100 flex-wrap gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              disabled={testingLdap || syncingLdap}
              onClick={handleTestLdap}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 border border-slate-300 cursor-pointer disabled:opacity-50"
            >
              {testingLdap ? <Loader2 className="w-4 h-4 animate-spin text-emerald-600" /> : <span>⚡</span>}
              <span>{testingLdap ? (isEn ? 'Testing connection...' : 'Đang thử kết nối...') : (isEn ? 'Test LDAP Server Connection' : 'Kiểm Tra Kết Nối Máy Chủ LDAP')}</span>
            </button>

            <button
              type="button"
              disabled={syncingLdap || testingLdap}
              onClick={handleSyncLdapNow}
              className="px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {syncingLdap ? <Loader2 className="w-4 h-4 animate-spin text-indigo-600" /> : <span>🔄</span>}
              <span>{syncingLdap ? (isEn ? 'Syncing users from LDAP...' : 'Đang đồng bộ User từ LDAP...') : (isEn ? 'Sync All Users from LDAP Now' : 'Đồng Bộ Toàn Bộ User Từ LDAP Ngay')}</span>
            </button>
          </div>

          <button
            type="submit"
            className="inline-flex items-center space-x-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>{isEn ? 'Save LDAP / AD Settings' : 'Lưu Cài Đặt LDAP / AD'}</span>
          </button>
        </div>
      </div>
    </form>
  );
}
