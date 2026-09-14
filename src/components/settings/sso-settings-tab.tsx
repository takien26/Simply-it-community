'use client';

import React from 'react';
import { CheckCircle2, Save, Info, Copy } from 'lucide-react';
import { EnterpriseFeatureLock } from '@/components/common/EnterpriseFeatureLock';

interface SsoSettingsTabProps {
  isEn: boolean;
  saved: boolean;
  getSettingValue: (key: string) => string;
  handleChange: (key: string, value: string) => void;
  handleSaveSettings: (e: React.FormEvent) => void;
  copyRedirectUri: () => void;
  copiedUri: boolean;
  redirectUri: string;
  isModActive: (mod: string) => boolean;
}

export function SsoSettingsTab({
  isEn,
  saved,
  getSettingValue,
  handleChange,
  handleSaveSettings,
  copyRedirectUri,
  copiedUri,
  redirectUri,
  isModActive,
}: SsoSettingsTabProps) {
  if (!isModActive('SSO')) {
    return (
      <EnterpriseFeatureLock
        previewType="sso"
        tier="ENTERPRISE"
        icon="🔑"
        title="Đăng Nhập Một Lần Microsoft 365 (SSO & Azure AD)"
        titleEn="Microsoft 365 Single Sign-On (SSO / Entra ID)"
        subtitle="Đăng nhập 1 chạm an toàn bằng tài khoản công ty @company.com qua Microsoft Azure AD / Entra ID"
        subtitleEn="1-click secure enterprise login with corporate @company.com via Microsoft Azure AD / Entra ID"
        bullets={[
          'Đăng nhập 1 chạm an toàn với tài khoản Microsoft 365 công ty',
          'Không cần nhớ mật khẩu riêng, hỗ trợ Microsoft Authenticator 2FA',
          'Tự động phân quyền vai trò (Admin, IT, Staff) theo nhóm Azure AD',
          'Tự động cấp tài khoản khi nhân sự đăng nhập lần đầu',
          'Tuân thủ tiêu chuẩn bảo mật danh tính doanh nghiệp SSO SAML/OIDC',
          'Hỗ trợ cấu hình đa Tenant hoặc Single Tenant chuyên biệt',
        ]}
        bulletsEn={[
          '1-click login with corporate Microsoft 365 credentials',
          'Zero password friction with full Microsoft 2FA / MFA enforcement',
          'Auto-sync role permissions from Azure AD security groups',
          'Just-in-time user auto-provisioning upon initial sign-in',
          'Compliant with SAML 2.0 and OpenID Connect (OIDC) standards',
          'Supports multi-tenant or single-tenant corporate directory',
        ]}
      />
    );
  }

  return (
    <form onSubmit={handleSaveSettings} className="space-y-6">
      {saved && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-semibold rounded-2xl flex items-center space-x-2 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          <span>{isEn ? 'Microsoft 365 SSO configuration has been saved successfully!' : 'Cấu hình SSO Microsoft 365 đã được lưu thành công!'}</span>
        </div>
      )}

      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold">
              🪟
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">{isEn ? 'Microsoft 365 Single Sign-On (SSO)' : 'Đăng Nhập Một Lần Microsoft 365 (SSO)'}</h3>
              <p className="text-xs text-slate-500">{isEn ? 'Integrate Azure Active Directory / Microsoft Entra ID for enterprise accounts' : 'Tích hợp Azure Active Directory / Microsoft Entra ID cho tài khoản doanh nghiệp'}</p>
            </div>
          </div>

          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={getSettingValue('sso.ms365_enabled') === 'true'}
              onChange={(e) => handleChange('sso.ms365_enabled', e.target.checked ? 'true' : 'false')}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            <span className="ml-2 text-xs font-bold text-slate-700">
              {isEn
                ? (getSettingValue('sso.ms365_enabled') === 'true' ? 'ON' : 'OFF')
                : (getSettingValue('sso.ms365_enabled') === 'true' ? 'Đang BẬT' : 'Đang TẮT')}
            </span>
          </label>
        </div>

        {/* Redirect URI with Copy Button */}
        <div className="p-3.5 bg-indigo-50/70 border border-indigo-100 rounded-xl space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-bold text-indigo-900 flex items-center gap-1.5">
              <Info className="w-4 h-4 text-indigo-600" />
              <span>{isEn ? 'Redirect URI (Paste into Azure Portal):' : 'Redirect URI (Dán vào Azure Portal):'}</span>
            </span>
            <button
              type="button"
              onClick={copyRedirectUri}
              className="px-2.5 py-1 bg-white hover:bg-indigo-100 text-indigo-700 rounded-lg font-semibold border border-indigo-200 inline-flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>{isEn ? (copiedUri ? 'Copied!' : 'Copy URI') : (copiedUri ? 'Đã sao chép!' : 'Sao chép URI')}</span>
            </button>
          </div>
          <input
            type="text"
            readOnly
            value={redirectUri}
            className="w-full px-3 py-1.5 bg-white border border-indigo-200 rounded-lg text-xs font-mono text-indigo-950 select-all outline-none"
          />
        </div>

        {/* Credentials Fields */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Application (Client) ID <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              placeholder="VD: 4a8b1c2d-3e4f-5a6b-7c8d-9e0f1a2b3c4d"
              value={getSettingValue('sso.ms365_client_id')}
              onChange={(e) => handleChange('sso.ms365_client_id', e.target.value)}
              className="w-full p-2.5 border border-slate-300 rounded-xl text-sm font-mono outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Client Secret (Secret Value) <span className="text-rose-500">*</span>
            </label>
            <input
              type="password"
              placeholder="VD: ~aBcDeFgHiJkLmNoPqRsTuVwXyZ12345"
              value={getSettingValue('sso.ms365_client_secret')}
              onChange={(e) => handleChange('sso.ms365_client_secret', e.target.value)}
              className="w-full p-2.5 border border-slate-300 rounded-xl text-sm font-mono outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <p className="text-[11px] text-slate-500 mt-1">{isEn ? 'Note: Use the Value column (not Secret ID) when generated in Azure.' : 'Lưu ý: Lấy giá trị tại cột Value (không phải Secret ID) khi tạo mới trên Azure.'}</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Directory (Tenant) ID
            </label>
            <input
              type="text"
              placeholder={isEn ? 'common or Tenant directory ID' : 'common hoặc ID thư mục Tenant'}
              value={getSettingValue('sso.ms365_tenant_id') || 'common'}
              onChange={(e) => handleChange('sso.ms365_tenant_id', e.target.value)}
              className="w-full p-2.5 border border-slate-300 rounded-xl text-sm font-mono outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <p className="text-[11px] text-slate-500 mt-1">{isEn ? <>Use <code>common</code> to support all organizational Microsoft accounts or enter your specific Tenant ID.</> : <>Để <code>common</code> nếu muốn hỗ trợ mọi tài khoản Microsoft công ty hoặc nhập Tenant ID cụ thể của công ty bạn.</>}</p>
          </div>
        </div>

        {/* Quick 3-Step Guide Card */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs text-slate-700">
          <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
            <span>📖</span>
            <span>{isEn ? '3-step setup guide on Azure Portal (Microsoft Entra admin center):' : 'Hướng dẫn 3 bước cấu hình trên Azure Portal (Microsoft Entra admin center):'}</span>
          </h4>
          <ol className="list-decimal list-inside space-y-1 text-slate-600 leading-relaxed text-[11px]">
            {isEn ? (
              <>
                <li>Navigate to <strong>portal.azure.com</strong> ➔ <strong>Microsoft Entra ID</strong> ➔ <strong>App registrations</strong> ➔ Click <strong>New registration</strong>.</li>
                <li>Enter name (e.g. <em>Simply IT Hub</em>), select <em>Accounts in any organizational directory</em>, and under <strong>Redirect URI</strong> choose platform <strong>Web</strong> and paste the link above.</li>
                <li>Go to <strong>Certificates & secrets</strong> ➔ Click <strong>New client secret</strong> ➔ Copy <strong>Client ID</strong> and <strong>Secret Value</strong> into the form above and click <strong>Save Configuration</strong>.</li>
              </>
            ) : (
              <>
                <li>Truy cập <strong>portal.azure.com</strong> ➔ <strong>Microsoft Entra ID</strong> ➔ <strong>App registrations</strong> ➔ Bấm <strong>New registration</strong>.</li>
                <li>Đặt tên (VD: <em>IT Asset Hub</em>), chọn <em>Accounts in any organizational directory</em>, và tại <strong>Redirect URI</strong> chọn nền tảng <strong>Web</strong> rồi dán link phía trên vào.</li>
                <li>Vào mục <strong>Certificates & secrets</strong> ➔ Bấm <strong>New client secret</strong> ➔ Copy <strong>Client ID</strong> và <strong>Secret Value</strong> dán vào form trên rồi bấm <strong>Lưu Cấu Hình</strong>.</li>
              </>
            )}
          </ol>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="inline-flex items-center space-x-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-md transition-all text-xs cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>{isEn ? 'Save SSO Configuration' : 'Lưu Cấu Hình SSO'}</span>
          </button>
        </div>
      </div>
    </form>
  );
}
