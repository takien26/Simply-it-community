'use client';

import { useState, useEffect } from 'react';
import { ShieldCheck, Key, CheckCircle2, AlertCircle, Loader2, Building2, Calendar, Crown, RefreshCw } from 'lucide-react';
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
                    <span>Phân tuyến IT & SLA</span>
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
          </div>
        )}
      </div>
    </div>
  );
}
