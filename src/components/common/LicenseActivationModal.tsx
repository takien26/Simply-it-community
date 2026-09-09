'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Key, ShieldCheck, CheckCircle2, AlertCircle, Loader2, Sparkles, Building2, Calendar, RefreshCw, Server, Copy, Check, UploadCloud, FileText } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/context';

interface LicenseActivationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function LicenseActivationModal({ isOpen, onClose, onSuccess }: LicenseActivationModalProps) {
  const { language } = useLanguage();
  const isEn = language === 'en';

  const [license, setLicense] = useState<{
    isEnterprise: boolean;
    tier: string;
    customer?: string;
    expiresAt?: string;
    daysRemaining?: number;
    isLifetime?: boolean;
    modules: string[];
    machineId?: string;
    currentMachineId?: string;
    isHardwareLocked?: boolean;
  } | null>(null);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [licenseKey, setLicenseKey] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [copiedMachineId, setCopiedMachineId] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    if (isOpen) {
      fetchLicense();
      setErrorMsg('');
      setSuccessMsg('');
      setLicenseKey('');
      setUploadedFileName('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const executeActivation = async (keyToActivate: string) => {
    setErrorMsg('');
    setSuccessMsg('');

    if (!keyToActivate.trim()) {
      setErrorMsg(isEn ? 'Please enter a license key or upload a .lic file' : 'Vui lòng dán mã License Key hoặc tải tập tin .lic');
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch('/api/license', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: keyToActivate.trim() }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        setErrorMsg(data.error || (isEn ? 'Activation failed' : 'Kích hoạt thất bại'));
      } else {
        setSuccessMsg(isEn ? 'Enterprise Edition activated successfully!' : 'Kích hoạt bản quyền Enterprise thành công!');
        setLicenseKey('');
        setUploadedFileName('');
        await fetchLicense();
        if (onSuccess) onSuccess();
        // Dispatch event for other components to reload license state
        window.dispatchEvent(new CustomEvent('simply:license-updated'));
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi kết nối máy chủ');
    } finally {
      setSubmitting(false);
    }
  };

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    await executeActivation(licenseKey);
  };

  const handleFileUpload = (file: File) => {
    if (!file) return;
    setUploadedFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setLicenseKey(content);
        executeActivation(content);
      }
    };
    reader.readAsText(file);
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
        if (onSuccess) onSuccess();
        window.dispatchEvent(new CustomEvent('simply:license-updated'));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 overflow-hidden">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors z-10 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 text-lg">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {isEn ? 'System Information & License' : 'Thông Tin Hệ Thống & Bản Quyền'}
              </h3>
              <p className="text-xs text-slate-500">
                {isEn ? 'Manage edition tier and activation keys' : 'Quản lý phiên bản và kích hoạt bản quyền'}
              </p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {loading ? (
            <div className="py-8 flex flex-col items-center justify-center gap-2 text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              <span className="text-xs">{isEn ? 'Checking license status...' : 'Đang kiểm tra trạng thái bản quyền...'}</span>
            </div>
          ) : (
            <>
              {/* Current Status Card */}
              <div
                className={`p-4 rounded-2xl border transition-all ${
                  license?.isEnterprise
                    ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800/60 text-amber-950 dark:text-amber-200'
                    : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    {isEn ? 'Current Edition' : 'Phiên bản hiện tại'}
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider ${
                      license?.isEnterprise
                        ? 'bg-amber-500 text-slate-950 shadow-xs'
                        : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                    }`}
                  >
                    {license?.isEnterprise ? '👑 ENTERPRISE' : 'COMMUNITY FREE'}
                  </span>
                </div>

                <div className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>SIMPLY IT {license?.isEnterprise ? 'Enterprise Edition' : 'Community Edition'}</span>
                  <span className="text-xs font-normal text-slate-400 font-mono">v1.0.0</span>
                </div>

                {license?.isEnterprise ? (
                  <div className="mt-3 pt-3 border-t border-amber-200 dark:border-amber-900/50 space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span>{isEn ? 'Licensed to:' : 'Đơn vị sử dụng:'} <strong>{license.customer}</strong></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span>
                        {isEn ? 'Expires in:' : 'Hạn dùng:'}{' '}
                        {license.isLifetime || (license.daysRemaining && license.daysRemaining > 3650) ? (
                          <strong className="text-amber-700 dark:text-amber-400">
                            {isEn ? 'Lifetime (Perpetual)' : 'Vĩnh viễn'}
                          </strong>
                        ) : (
                          <>
                            <strong>{new Date(license.expiresAt || '').toLocaleDateString(isEn ? 'en-US' : 'vi-VN')}</strong>{' '}
                            <span className="text-amber-700 dark:text-amber-400 font-semibold">({license.daysRemaining} {isEn ? 'days left' : 'ngày còn lại'})</span>
                          </>
                        )}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 pt-1 font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{isEn ? 'Enterprise features unlocked: SSO, LDAP, Webhooks, SLA Routing' : 'Đã mở khóa toàn bộ: SSO, LDAP, Webhooks, Phân tuyến SLA'}</span>
                    </div>

                    <div className="pt-2 text-right">
                      <button
                        type="button"
                        onClick={handleDeactivate}
                        disabled={submitting}
                        className="text-xs text-rose-500 hover:text-rose-700 underline font-semibold cursor-pointer"
                      >
                        {isEn ? 'Deactivate License' : 'Hủy kích hoạt bản quyền này'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                    {isEn
                      ? 'Free forever for standard IT asset management. If your organization has an Enterprise License Key, enter it below to unlock advanced features.'
                      : 'Phiên bản miễn phí vĩnh viễn cho quản lý tài sản IT tiêu chuẩn. Nếu doanh nghiệp có mã License Enterprise, nhập mã bên dưới để mở khóa.'}
                  </p>
                )}
              </div>

              {/* Server Hardware Machine ID Box */}
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 flex items-center justify-center shrink-0">
                    <Server className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                      {isEn ? 'Server Machine ID' : 'Mã Máy Chủ (Machine ID)'}
                    </span>
                    <span className="text-xs font-mono font-bold text-slate-900 dark:text-white select-all truncate block">
                      {license?.currentMachineId || 'SIMPLY-HW-...'}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (license?.currentMachineId) {
                      navigator.clipboard.writeText(license.currentMachineId);
                      setCopiedMachineId(true);
                      setTimeout(() => setCopiedMachineId(false), 2000);
                    }
                  }}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 shrink-0 cursor-pointer shadow-2xs"
                  title={isEn ? 'Copy Machine ID' : 'Sao chép mã máy'}
                >
                  {copiedMachineId ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                  <span>{copiedMachineId ? (isEn ? 'Copied' : 'Đã chép') : (isEn ? 'Copy' : 'Sao chép')}</span>
                </button>
              </div>

              {/* Activation Form (Only shown if Community or if updating key) */}
              {!license?.isEnterprise && (
                <form onSubmit={handleActivate} className="space-y-3 pt-1">
                  {/* File Upload / Drag-and-Drop Area */}
                  <div>
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept=".lic,.txt,.cert"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload(file);
                      }}
                    />

                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        setIsDragging(true);
                      }}
                      onDragLeave={(e) => {
                        e.preventDefault();
                        setIsDragging(false);
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        setIsDragging(false);
                        const file = e.dataTransfer.files?.[0];
                        if (file) handleFileUpload(file);
                      }}
                      onClick={() => fileInputRef.current?.click()}
                      className={`border-2 border-dashed rounded-xl p-3.5 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-1.5 ${
                        isDragging
                          ? 'border-blue-500 bg-blue-50/70 dark:bg-blue-950/40'
                          : 'border-slate-300 dark:border-slate-700 hover:border-blue-400 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      <UploadCloud className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {isEn
                          ? 'Choose .lic file or drag & drop here'
                          : 'Chọn tập tin .lic hoặc kéo thả vào đây để kích hoạt ngay'}
                      </span>
                      {uploadedFileName && (
                        <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300 text-[11px] font-mono font-bold">
                          <FileText className="w-3 h-3" />
                          <span>{uploadedFileName}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="relative flex items-center justify-center">
                    <div className="border-t border-slate-200 dark:border-slate-800 w-full"></div>
                    <span className="bg-white dark:bg-slate-900 px-2 text-[10px] font-bold uppercase text-slate-400 shrink-0">
                      {isEn ? 'OR PASTE KEY' : 'HOẶC DÁN MÃ KEY'}
                    </span>
                    <div className="border-t border-slate-200 dark:border-slate-800 w-full"></div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      {isEn ? 'License Key / Certificate' : 'Mã Bản Quyền (License Key) Hoặc Khối Chứng Thư'}
                    </label>
                    <textarea
                      rows={2}
                      value={licenseKey}
                      onChange={(e) => setLicenseKey(e.target.value)}
                      placeholder="SIMPLY-ENT-eyJ... hoặc -----BEGIN SIMPLY IT ENTERPRISE..."
                      className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-slate-100"
                    />
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

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-slate-400">
                      {isEn ? '1-click upload or paste key' : 'Tải file .lic hoặc dán key'}
                    </span>
                    <button
                      type="submit"
                      disabled={submitting || !licenseKey.trim()}
                      className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
                      <span>{isEn ? 'Activate License' : 'Kích Hoạt Bản Quyền'}</span>
                    </button>
                  </div>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
