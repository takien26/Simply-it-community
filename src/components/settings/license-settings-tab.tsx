'use client';

import { useState, useEffect } from 'react';
import { ShieldCheck, Key, CheckCircle2, AlertCircle, Loader2, Building2, Calendar, Crown, RefreshCw, Mail, Copy, Check, Sparkles } from 'lucide-react';
import { EnterpriseUpgradeModal } from '@/components/common/EnterpriseUpgradeModal';
import { useLanguage } from '@/lib/i18n/context';

export function LicenseSettingsTab() {
  const { language } = useLanguage();
  const isEn = language === 'en';

  const [license, setLicense] = useState<{
    isEnterprise: boolean;
    tier: string;
    customer?: string;
    expiresAt?: string;
    daysRemaining?: number;
    modules: string[];
  } | null>(null);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [licenseKey, setLicenseKey] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);

  const fetchLicense = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/license');
      if (res.ok) {
        const data = await res.json();
        setLicense(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLicense();
  }, []);

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!licenseKey.trim()) {
      setErrorMsg(isEn ? 'Please enter a license key' : 'Vui lòng dán mã License Key');
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch('/api/license', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: licenseKey.trim() }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        setErrorMsg(data.error || (isEn ? 'Activation failed' : 'Kích hoạt thất bại'));
      } else {
        setSuccessMsg(isEn ? 'Enterprise Edition activated successfully!' : 'Kích hoạt bản quyền Enterprise thành công!');
        setLicenseKey('');
        await fetchLicense();
        // Notify other components & reload page navigation
        window.dispatchEvent(new CustomEvent('simply:license-updated'));
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi kết nối máy chủ');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeactivate = async () => {
    if (!confirm(isEn ? 'Are you sure you want to deactivate and revert to Community Edition?' : 'Bạn có chắc chắn muốn hủy bản quyền và quay về bản Community?')) {
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch('/api/license', { method: 'DELETE' });
      if (res.ok) {
        await fetchLicense();
        window.dispatchEvent(new CustomEvent('simply:license-updated'));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 flex flex-col items-center justify-center gap-3 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="text-xs">{isEn ? 'Loading license status...' : 'Đang tải thông tin bản quyền...'}</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 flex items-center justify-center font-bold text-lg">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {isEn ? 'System Edition & License' : 'Bản Quyền & Phiên Bản Hệ Thống'}
              </h3>
              <p className="text-xs text-slate-500">
                {isEn ? 'Manage active license key, edition tier, and features' : 'Quản lý phiên bản hệ thống, khóa bản quyền và các tính năng mở khóa'}
              </p>
            </div>
          </div>

          <span
            className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
              license?.isEnterprise
                ? 'bg-amber-500 text-slate-950 shadow-xs'
                : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
            }`}
          >
            {license?.isEnterprise ? '👑 ENTERPRISE EDITION' : 'COMMUNITY EDITION'}
          </span>
        </div>

        {license?.isEnterprise ? (
          /* ENTERPRISE ACTIVE STATE */
          <div className="space-y-5">
            <div className="p-5 rounded-2xl border border-amber-300 dark:border-amber-800/60 bg-linear-to-br from-amber-50/70 to-orange-50/40 dark:from-amber-950/20 dark:to-slate-900 text-slate-800 dark:text-slate-200 space-y-4">
              <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-bold text-sm">
                <Crown className="w-5 h-5 fill-current" />
                <span>{isEn ? 'SIMPLY IT Enterprise Edition is Active' : 'Hệ thống đang hoạt động với Bản Quyền Enterprise'}</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-3 bg-white/70 dark:bg-slate-800/70 rounded-xl border border-amber-200/80 dark:border-amber-900/50">
                  <span className="text-[11px] text-slate-500 block mb-0.5">{isEn ? 'Licensed To' : 'Cấp phép cho đơn vị'}</span>
                  <strong className="text-slate-900 dark:text-white text-sm flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-amber-600" />
                    <span>{license.customer}</span>
                  </strong>
                </div>

                <div className="p-3 bg-white/70 dark:bg-slate-800/70 rounded-xl border border-amber-200/80 dark:border-amber-900/50">
                  <span className="text-[11px] text-slate-500 block mb-0.5">{isEn ? 'Expiration Date' : 'Thời hạn bản quyền'}</span>
                  <strong className="text-slate-900 dark:text-white text-sm flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-amber-600" />
                    <span>{new Date(license.expiresAt || '').toLocaleDateString(isEn ? 'en-US' : 'vi-VN')}</span>
                    <span className="text-amber-700 dark:text-amber-400 font-normal text-xs">
                      ({license.daysRemaining} {isEn ? 'days left' : 'ngày còn lại'})
                    </span>
                  </strong>
                </div>
              </div>

              <div className="pt-2">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-2">
                  {isEn ? 'Active Enterprise Modules:' : 'Các mô-đun doanh nghiệp đã được mở khóa:'}
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-white/90 dark:bg-slate-800/90 border border-emerald-200 text-emerald-800 dark:text-emerald-300 flex items-center gap-2 font-medium">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Microsoft 365 SSO</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/90 dark:bg-slate-800/90 border border-emerald-200 text-emerald-800 dark:text-emerald-300 flex items-center gap-2 font-medium">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Active Directory / LDAP</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/90 dark:bg-slate-800/90 border border-emerald-200 text-emerald-800 dark:text-emerald-300 flex items-center gap-2 font-medium">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Webhooks Teams/Zalo</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/90 dark:bg-slate-800/90 border border-emerald-200 text-emerald-800 dark:text-emerald-300 flex items-center gap-2 font-medium">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{isEn ? 'IT Routing & SLA' : 'Phân tuyến IT & SLA'}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/90 dark:bg-slate-800/90 border border-emerald-200 text-emerald-800 dark:text-emerald-300 flex items-center gap-2 font-medium">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{isEn ? 'Telegram Alerts' : 'Cảnh báo Telegram'}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/90 dark:bg-slate-800/90 border border-emerald-200 text-emerald-800 dark:text-emerald-300 flex items-center gap-2 font-medium">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{isEn ? 'Artificial Intelligence (AI)' : 'Trí Tuệ Nhân Tạo AI'}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/90 dark:bg-slate-800/90 border border-emerald-200 text-emerald-800 dark:text-emerald-300 flex items-center gap-2 font-medium">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{isEn ? 'Asset Audit' : 'Kiểm Kê Tài Sản (Audit)'}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/90 dark:bg-slate-800/90 border border-emerald-200 text-emerald-800 dark:text-emerald-300 flex items-center gap-2 font-medium">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{isEn ? 'Device Discovery' : 'Scan Thiết Bị (Discovery)'}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/90 dark:bg-slate-800/90 border border-emerald-200 text-emerald-800 dark:text-emerald-300 flex items-center gap-2 font-medium">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{isEn ? '2D Floor Maps' : 'Sơ Đồ Mặt Bằng 2D'}</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-amber-200/80 dark:border-amber-900/50 flex justify-end">
                <button
                  type="button"
                  onClick={handleDeactivate}
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                >
                  {isEn ? 'Deactivate & Revert to Community' : 'Hủy kích hoạt bản quyền này'}
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* COMMUNITY FREE STATE */
          <div className="space-y-5">
            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-2">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>SIMPLY IT Community Edition</span>
                <span className="text-xs px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-semibold">v1.0.0</span>
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                {isEn
                  ? 'This system is running on the free open-source Community Edition. You have full access to core IT asset management, software licenses, ticketing helpdesk, spare parts, and QR code inventory.'
                  : 'Hệ thống đang hoạt động trên bản Community Edition miễn phí vĩnh viễn. Bạn có toàn quyền sử dụng quản lý vòng đời tài sản CNTT, bản quyền phần mềm, tiếp nhận ticket helpdesk, kho phụ tùng và quét mã QR kiểm kê.'}
              </p>
            </div>

            {/* License Key Activation Form */}
            <form onSubmit={handleActivate} className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
              <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-sm">
                <Key className="w-4 h-4 text-blue-600" />
                <span>{isEn ? 'Activate Enterprise License' : 'Kích Hoạt Giấy Phép Bản Quyền Enterprise'}</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {isEn ? 'License Key' : 'Mã Bản Quyền (License Key)'}
                </label>
                <textarea
                  rows={3}
                  required
                  value={licenseKey}
                  onChange={(e) => setLicenseKey(e.target.value)}
                  placeholder="SIMPLY-ENT-eyJjdXN0b21lciI6IkNvbmcgdHkgTWF5IDEwIiwidGllciI6IkVOVEVSUFJJU0UiLCJleHBpcmVzQXQiOiIyMDI3LTA5LTA2VDEwOjAwOjAwWiJ9..."
                  className="w-full p-3 text-xs font-mono rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  {isEn
                    ? 'Paste the cryptographic license key provided by your IT administrator or vendor.'
                    : 'Dán chuỗi mã bản quyền được cung cấp khi nâng cấp bản Enterprise để mở khóa hệ thống.'}
                </p>
              </div>

              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {successMsg && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-start gap-2 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{successMsg}</span>
                </div>
              )}

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={submitting || !licenseKey.trim()}
                  className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
                  <span>{isEn ? 'Activate Enterprise Edition' : 'Kích Hoạt Bản Quyền'}</span>
                </button>
              </div>
            </form>

            {/* Contact to Purchase Enterprise License Card */}
            <div className="p-6 rounded-2xl border border-indigo-200 dark:border-indigo-900/60 bg-linear-to-br from-indigo-50/70 via-blue-50/40 to-slate-50 dark:from-slate-900 dark:to-indigo-950/20 space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-indigo-100 dark:border-indigo-900/40">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                    <Crown className="w-4 h-4 fill-current" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                      {isEn ? 'Interested in SIMPLY IT Enterprise Edition?' : 'Liên Hệ Đăng Ký Mua Bản Quyền Enterprise'}
                    </h4>
                    <p className="text-xs text-slate-500">
                      {isEn ? 'Unlock full ITSM power, single sign-on, AI assistant, and unlimited assets' : 'Khai phóng toàn diện các tính năng cao cấp: SSO M365, LDAP, Webhook, SLA và Trợ lý AI'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowUpgradeModal(true)}
                  className="px-4 py-2 bg-linear-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{isEn ? 'Request Consultation & Pricing' : 'Đăng Ký Tư Vấn & Nhận Báo Giá'}</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 text-xs">
                <div className="p-3 bg-white dark:bg-slate-800/80 rounded-xl border border-slate-200/80 dark:border-slate-700/60 flex items-center gap-2">
                  <span className="text-base">🔑</span>
                  <div>
                    <strong className="block text-slate-900 dark:text-white text-[11.5px]">Microsoft 365 SSO</strong>
                    <span className="text-[10.5px] text-slate-500">Đăng nhập 1 chạm Azure AD</span>
                  </div>
                </div>
                <div className="p-3 bg-white dark:bg-slate-800/80 rounded-xl border border-slate-200/80 dark:border-slate-700/60 flex items-center gap-2">
                  <span className="text-base">🏢</span>
                  <div>
                    <strong className="block text-slate-900 dark:text-white text-[11.5px]">Active Directory / LDAP</strong>
                    <span className="text-[10.5px] text-slate-500">Đồng bộ máy chủ Domain Windows</span>
                  </div>
                </div>
                <div className="p-3 bg-white dark:bg-slate-800/80 rounded-xl border border-slate-200/80 dark:border-slate-700/60 flex items-center gap-2">
                  <span className="text-base">🚨</span>
                  <div>
                    <strong className="block text-slate-900 dark:text-white text-[11.5px]">Cảnh Báo Tự Động Telegram</strong>
                    <span className="text-[10.5px] text-slate-500">Quét hạn License & Dịch vụ IT</span>
                  </div>
                </div>
                <div className="p-3 bg-white dark:bg-slate-800/80 rounded-xl border border-slate-200/80 dark:border-slate-700/60 flex items-center gap-2">
                  <span className="text-base">🔔</span>
                  <div>
                    <strong className="block text-slate-900 dark:text-white text-[11.5px]">Webhook Đa Kênh</strong>
                    <span className="text-[10.5px] text-slate-500">Bắn tin Teams, Zalo OA, Slack</span>
                  </div>
                </div>
                <div className="p-3 bg-white dark:bg-slate-800/80 rounded-xl border border-slate-200/80 dark:border-slate-700/60 flex items-center gap-2">
                  <span className="text-base">🎯</span>
                  <div>
                    <strong className="block text-slate-900 dark:text-white text-[11.5px]">Phân Tuyến Ticket & SLA</strong>
                    <span className="text-[10.5px] text-slate-500">Điều phối theo nhóm & cam kết SLA</span>
                  </div>
                </div>
                <div className="p-3 bg-white dark:bg-slate-800/80 rounded-xl border border-slate-200/80 dark:border-slate-700/60 flex items-center gap-2">
                  <span className="text-base">🤖</span>
                  <div>
                    <strong className="block text-slate-900 dark:text-white text-[11.5px]">Trí Tuệ Nhân Tạo AI</strong>
                    <span className="text-[10.5px] text-slate-500">Gemini AI Copilot & OCR hóa đơn</span>
                  </div>
                </div>
                <div className="p-3 bg-white dark:bg-slate-800/80 rounded-xl border border-slate-200/80 dark:border-slate-700/60 flex items-center gap-2">
                  <span className="text-base">📋</span>
                  <div>
                    <strong className="block text-slate-900 dark:text-white text-[11.5px]">Kiểm Kê Tài Sản (Audit)</strong>
                    <span className="text-[10.5px] text-slate-500">Quét QR camera điện thoại, đối soát sai lệch</span>
                  </div>
                </div>
                <div className="p-3 bg-white dark:bg-slate-800/80 rounded-xl border border-slate-200/80 dark:border-slate-700/60 flex items-center gap-2">
                  <span className="text-base">📡</span>
                  <div>
                    <strong className="block text-slate-900 dark:text-white text-[11.5px]">Scan Thiết Bị (Discovery)</strong>
                    <span className="text-[10.5px] text-slate-500">Quét dải IP LAN & Agent thu thập phần cứng</span>
                  </div>
                </div>
                <div className="p-3 bg-white dark:bg-slate-800/80 rounded-xl border border-slate-200/80 dark:border-slate-700/60 flex items-center gap-2">
                  <span className="text-base">🗺️</span>
                  <div>
                    <strong className="block text-slate-900 dark:text-white text-[11.5px]">Sơ Đồ Mặt Bằng 2D</strong>
                    <span className="text-[10.5px] text-slate-500">Bản đồ tầng, phòng máy chủ & tủ rack trực quan</span>
                  </div>
                </div>
              </div>

              {/* Direct Author & Commercial Contact Info */}
              <div className="p-3.5 bg-white dark:bg-slate-800/90 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {isEn ? 'Commercial & Technical Contact:' : 'Đơn vị phát triển & Cung cấp bản quyền:'}
                    </span>
                    <strong className="text-blue-600 dark:text-blue-400">Tạ Trung Kiên</strong>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    {isEn
                      ? 'Contact directly via email for custom licensing, pricing quotes, or deployment support.'
                      : 'Liên hệ trực tiếp qua email để nhận báo giá, cấp mã bản quyền hoặc hỗ trợ triển khai cho doanh nghiệp.'}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText('takien26@gmail.com');
                      setCopiedEmail(true);
                      setTimeout(() => setCopiedEmail(false), 2500);
                    }}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    {copiedEmail ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                    <span>{copiedEmail ? (isEn ? 'Copied!' : 'Đã sao chép') : 'takien26@gmail.com'}</span>
                  </button>

                  <a
                    href="mailto:takien26@gmail.com?subject=[SIMPLY%20IT]%20Dang%20ky%20mua%20ban%20quyen%20Enterprise"
                    className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>{isEn ? 'Send Email' : 'Gửi Email'}</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <EnterpriseUpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
      />
    </div>
  );
}
