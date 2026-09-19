'use client';

import { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  Download,
  Upload,
  CheckCircle,
  AlertCircle,
  Loader2,
  X,
  Globe,
  Laptop,
  Key,
  Users,
  Lock,
  Crown,
  Sparkles,
  ShieldCheck,
  Check,
} from 'lucide-react';

interface ExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  defaultType?: 'ASSET' | 'LICENSE' | 'USER' | 'SERVICE';
}

export function ExcelImportModal({
  isOpen,
  onClose,
  onSuccess,
  defaultType = 'ASSET',
}: ExcelImportModalProps) {
  // ESC key listener to close modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const [importType, setImportType] = useState<'ASSET' | 'LICENSE' | 'USER' | 'SERVICE'>(defaultType);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<any>(null);

  // License verification state for Paid / Enterprise tier gating
  const [licenseInfo, setLicenseInfo] = useState<{ isEnterprise: boolean; tier?: string; customer?: string } | null>(null);
  const [loadingLicense, setLoadingLicense] = useState(true);
  const [licKeyInput, setLicKeyInput] = useState('');
  const [licActivating, setLicActivating] = useState(false);
  const [licError, setLicError] = useState('');

  const fetchLicense = async () => {
    try {
      setLoadingLicense(true);
      const res = await fetch('/api/license');
      if (res.ok) {
        const data = await res.json();
        setLicenseInfo(data);
      }
    } catch {
      setLicenseInfo(null);
    } finally {
      setLoadingLicense(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setImportType(defaultType);
      setFile(null);
      setError('');
      setResult(null);
      setLicError('');
      fetchLicense();
    }
  }, [isOpen, defaultType]);

  if (!isOpen) return null;

  const handleDownloadTemplate = () => {
    window.open(`/api/import/template?type=${importType}`, '_blank');
  };

  const handleActivateLicense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!licKeyInput.trim()) {
      setLicError('Vui lòng dán mã License Key để kích hoạt.');
      return;
    }

    setLicActivating(true);
    setLicError('');
    try {
      const res = await fetch('/api/license', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: licKeyInput.trim() }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setLicError(data.error || 'Kích hoạt không thành công.');
      } else {
        await fetchLicense();
        window.dispatchEvent(new CustomEvent('simply:license-updated'));
      }
    } catch {
      setLicError('Lỗi kết nối máy chủ khi kích hoạt bản quyền.');
    } finally {
      setLicActivating(false);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError('Vui lòng chọn file Excel (.xlsx hoặc .xls)');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      if (importType === 'USER') {
        const formData = new FormData();
        formData.append('file', file);

        const res = await fetch('/api/users/import', {
          method: 'POST',
          body: formData,
        });

        const data = await res.json();
        if (!res.ok) {
          setError(data.error || 'Import nhân sự thất bại');
        } else {
          setResult({
            successRows: (data.importedCount || 0) + (data.updatedCount || 0),
            totalRows: data.totalRows || 0,
            failedRows: data.failedCount || 0,
            message: data.message,
          });
          if (onSuccess) onSuccess();
        }
      } else if (importType === 'SERVICE') {
        const formData = new FormData();
        formData.append('file', file);

        const res = await fetch('/api/services/import', {
          method: 'POST',
          body: formData,
        });

        const data = await res.json();
        if (!res.ok) {
          setError(data.error || 'Import dịch vụ thất bại');
        } else {
          setResult({
            successRows: data.successCount,
            totalRows: data.successCount + (data.errorCount || 0),
            failedRows: data.errorCount || 0,
            message: data.message,
          });
          if (onSuccess) onSuccess();
        }
      } else {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('importType', importType);

        const res = await fetch('/api/import', {
          method: 'POST',
          body: formData,
        });

        const data = await res.json();
        if (!res.ok) {
          setError(data.error || 'Import thất bại');
        } else {
          setResult(data.data);
          if (onSuccess) onSuccess();
        }
      }
    } catch {
      setError('Lỗi kết nối khi tải file lên server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-200 text-slate-900 dark:text-slate-100">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 p-6 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-lg leading-tight">Mục Import Chung từ Excel</h3>
                {licenseInfo?.isEnterprise && (
                  <span className="px-2 py-0.5 bg-amber-400/30 border border-amber-300/40 text-amber-100 text-[10px] font-bold rounded-full uppercase tracking-wider flex items-center gap-1">
                    <Crown className="w-3 h-3 text-amber-300" />
                    <span>Enterprise</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-emerald-100 mt-0.5">
                Nạp hàng loạt Tài sản IT, License, Nhân sự và Dịch vụ & Thuê bao
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1.5 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Loading license check */}
        {loadingLicense ? (
          <div className="p-12 flex flex-col items-center justify-center space-y-3 text-slate-400">
            <Loader2 className="w-7 h-7 animate-spin text-emerald-600" />
            <span className="text-xs">Đang kiểm tra quyền hạn tài khoản...</span>
          </div>
        ) : !licenseInfo?.isEnterprise ? (
          /* Gating Screen: Only Paid / Enterprise Accounts Have Access */
          <div className="p-6 sm:p-7 space-y-5">
            <div className="p-5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-sm shrink-0">
                  <Crown className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm">Tính Năng Dành Cho Tài Khoản Trả Phí</h4>
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    Phiên bản hiện tại: <strong>Cộng Đồng (Community Miễn Phí)</strong>
                  </p>
                </div>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Mục Import chung bằng Excel (Tài sản IT, Bản quyền, Nhân sự 12 trường thông tin, Gói dịch vụ) là đặc quyền chỉ dành riêng cho các tài khoản trả phí <strong>Enterprise Edition</strong>.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-[11px] text-slate-700 dark:text-slate-200">
                <div className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Import không giới hạn số lượng dòng</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Tự động liên kết Công ty, Khối, Phòng ban</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Đầy đủ 12 trường thông tin nhân sự</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Kiểm tra trùng lặp mã & email tự động</span>
                </div>
              </div>
            </div>

            {/* Quick Activation Box */}
            <form onSubmit={handleActivateLicense} className="space-y-3 pt-1">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Kích hoạt bản quyền Enterprise để mở khóa:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Dán mã License Key (SIMPLY-ENT-...)"
                  value={licKeyInput}
                  onChange={(e) => setLicKeyInput(e.target.value)}
                  className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <button
                  type="submit"
                  disabled={licActivating || !licKeyInput.trim()}
                  className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shrink-0"
                >
                  {licActivating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                  <span>Kích Hoạt Ngay</span>
                </button>
              </div>

              {licError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{licError}</span>
                </div>
              )}
            </form>

            <div className="flex justify-end pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
              >
                Đóng (ESC)
              </button>
            </div>
          </div>
        ) : (
          /* Active Import Form (Unlocked for Paid / Enterprise Accounts) */
          <div className="p-6 space-y-5">
            {error && (
              <div className="p-3.5 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs font-semibold rounded-xl flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Type Switcher - 4 Options: ASSET, LICENSE, USER, SERVICE */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                1. Chọn phân hệ cần import
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-100 dark:bg-slate-800/80 p-1.5 rounded-2xl">
                <button
                  type="button"
                  onClick={() => {
                    setImportType('ASSET');
                    setResult(null);
                  }}
                  className={`py-2 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    importType === 'ASSET'
                      ? 'bg-white dark:bg-slate-700 shadow-2xs text-emerald-700 dark:text-emerald-300 font-extrabold ring-1 ring-emerald-500/30'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Laptop className="w-3.5 h-3.5" />
                  <span>Tài sản IT</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setImportType('LICENSE');
                    setResult(null);
                  }}
                  className={`py-2 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    importType === 'LICENSE'
                      ? 'bg-white dark:bg-slate-700 shadow-2xs text-purple-700 dark:text-purple-300 font-extrabold ring-1 ring-purple-500/30'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Key className="w-3.5 h-3.5" />
                  <span>License</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setImportType('USER');
                    setResult(null);
                  }}
                  className={`py-2 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    importType === 'USER'
                      ? 'bg-white dark:bg-slate-700 shadow-2xs text-indigo-700 dark:text-indigo-300 font-extrabold ring-1 ring-indigo-500/30'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Nhân sự</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setImportType('SERVICE');
                    setResult(null);
                  }}
                  className={`py-2 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    importType === 'SERVICE'
                      ? 'bg-white dark:bg-slate-700 shadow-2xs text-teal-700 dark:text-teal-300 font-extrabold ring-1 ring-teal-500/30'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>Dịch Vụ IT</span>
                </button>
              </div>
            </div>

            {/* Download Template Step */}
            <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-emerald-950 dark:text-emerald-300">
                  2. Tải file mẫu chuẩn (.xlsx)
                </p>
                <p className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-0.5 leading-relaxed">
                  {importType === 'USER'
                    ? 'Mẫu chuẩn 12 cột: Họ tên (*), Email (*), Công ty Quản lý, Khối/Phòng ban, Vị trí, SĐT, Cơ sở/Location, Quản lý trực tiếp, Vai trò, Trạng thái, Mật khẩu...'
                    : importType === 'SERVICE'
                    ? 'Mẫu chuẩn gồm: Mã gói, Tên dịch vụ, Công ty Quản lý, Phân loại, Giá cước, Chu kỳ, Ngày gia hạn, IP/Mã KH, Hotline...'
                    : importType === 'LICENSE'
                    ? 'Mẫu chuẩn gồm: Tên phần mềm, License key, Công ty Quản lý, Loại license, Số seat, Nhà cung cấp, Người sử dụng (Email), Hạn dùng...'
                    : 'Mẫu chuẩn gồm: Mã tài sản, Tên thiết bị, Danh mục, Công ty Quản lý, Hãng, Serial number, Giá mua, Vị trí, Người sử dụng (Email)...'}
                </p>
              </div>
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors shrink-0 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Tải Mẫu</span>
              </button>
            </div>

            {/* Upload Form */}
            <form onSubmit={handleUpload} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  3. Tải lên file Excel đã điền dữ liệu (*)
                </label>
                <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500 rounded-2xl p-6 text-center bg-slate-50/60 dark:bg-slate-800/40 hover:bg-emerald-50/30 dark:hover:bg-emerald-950/20 transition-colors cursor-pointer relative">
                  <input
                    type="file"
                    accept=".xlsx, .xls"
                    onChange={(e) => {
                      if (e.target.files?.[0]) setFile(e.target.files[0]);
                    }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                      <Upload className="w-5 h-5" />
                    </div>
                    {file ? (
                      <div className="text-xs">
                        <p className="font-bold text-emerald-900 dark:text-emerald-300">{file.name}</p>
                        <p className="text-[11px] text-slate-500">{(file.size / 1024).toFixed(1)} KB</p>
                      </div>
                    ) : (
                      <div className="text-xs">
                        <p className="font-bold text-slate-700 dark:text-slate-200">Kéo thả file vào đây hoặc bấm để duyệt</p>
                        <p className="text-[11px] text-slate-400">Hỗ trợ định dạng file Microsoft Excel (.xlsx, .xls)</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Result Box */}
              {result && (
                <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 space-y-2 text-xs">
                  <div className="flex items-center space-x-2 text-emerald-800 dark:text-emerald-300 font-bold">
                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{result.message || 'Import hoàn tất thành công!'}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center pt-1 font-mono">
                    <div className="p-2 bg-white dark:bg-slate-800 rounded-xl border border-emerald-100 dark:border-slate-700">
                      <p className="text-[10px] text-slate-500 uppercase">Tổng số dòng</p>
                      <p className="font-extrabold text-slate-800 dark:text-white text-sm">{result.totalRows || 0}</p>
                    </div>
                    <div className="p-2 bg-white dark:bg-slate-800 rounded-xl border border-emerald-100 dark:border-slate-700">
                      <p className="text-[10px] text-emerald-600 uppercase">Thành công</p>
                      <p className="font-extrabold text-emerald-700 dark:text-emerald-400 text-sm">{result.successRows || 0}</p>
                    </div>
                    <div className="p-2 bg-white dark:bg-slate-800 rounded-xl border border-emerald-100 dark:border-slate-700">
                      <p className="text-[10px] text-rose-500 uppercase">Thất bại</p>
                      <p className="font-extrabold text-rose-600 text-sm">{result.failedRows || 0}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  {result ? 'Đóng (ESC)' : 'Hủy (ESC)'}
                </button>
                <button
                  type="submit"
                  disabled={!file || loading}
                  className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center space-x-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Đang nạp dữ liệu...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-3.5 h-3.5" />
                      <span>Tiến Hành Import</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
