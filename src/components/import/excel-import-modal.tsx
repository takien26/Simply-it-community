'use client';

import { useState } from 'react';
import { FileSpreadsheet, Download, Upload, CheckCircle, AlertCircle, Loader2, X, Globe, Laptop, Key } from 'lucide-react';

interface ExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function ExcelImportModal({ isOpen, onClose, onSuccess }: ExcelImportModalProps) {
  const [importType, setImportType] = useState<'ASSET' | 'LICENSE' | 'SERVICE'>('ASSET');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<any>(null);

  if (!isOpen) return null;

  const handleDownloadTemplate = () => {
    window.open(`/api/import/template?type=${importType}`, '_blank');
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError('Vui lòng chọn file Excel (.xlsx)');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      if (importType === 'SERVICE') {
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
      <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 p-6 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-lg leading-tight">Import Hàng Loạt từ Excel</h3>
              <p className="text-xs text-emerald-100 mt-0.5">Nạp hàng loạt Thiết bị IT, License hoặc Gói Dịch vụ & Thuê bao</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white p-1.5 rounded-xl hover:bg-white/10 transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Type Switcher - 3 Options: ASSET, LICENSE, SERVICE */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              1. Chọn phân hệ cần import
            </label>
            <div className="grid grid-cols-3 gap-2 bg-slate-100 p-1.5 rounded-2xl">
              <button
                type="button"
                onClick={() => {
                  setImportType('ASSET');
                  setResult(null);
                }}
                className={`py-2 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  importType === 'ASSET' ? 'bg-white shadow-2xs text-emerald-700 font-extrabold ring-1 ring-emerald-500/20' : 'text-slate-600 hover:text-slate-900'
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
                  importType === 'LICENSE' ? 'bg-white shadow-2xs text-purple-700 font-extrabold ring-1 ring-purple-500/20' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Key className="w-3.5 h-3.5" />
                <span>License</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setImportType('SERVICE');
                  setResult(null);
                }}
                className={`py-2 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  importType === 'SERVICE' ? 'bg-white shadow-2xs text-indigo-700 font-extrabold ring-1 ring-indigo-500/20' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                <span>Dịch Vụ IT</span>
              </button>
            </div>
          </div>

          {/* Download Template Step */}
          <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold text-emerald-950">2. Tải file mẫu chuẩn (.xlsx)</p>
              <p className="text-[11px] text-emerald-700 mt-0.5">
                {importType === 'SERVICE'
                  ? 'Mẫu chuẩn gồm: Mã gói, Tên dịch vụ, Giá cước, Chu kỳ, Ngày gia hạn, IP/Mã KH, Hotline...'
                  : importType === 'LICENSE'
                  ? 'Mẫu chuẩn gồm: Tên phần mềm, License key, Loại license, Số seat, Ngày hết hạn...'
                  : 'Mẫu chuẩn gồm: Tên thiết bị, Danh mục, Hãng, Serial number, Giá mua, Người dùng...'}
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
              <label className="block text-xs font-bold text-slate-700 mb-1.5">3. Tải lên file Excel đã điền dữ liệu (*)</label>
              <div className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-2xl p-6 text-center bg-slate-50/60 hover:bg-emerald-50/30 transition-colors cursor-pointer relative">
                <input
                  type="file"
                  accept=".xlsx, .xls"
                  onChange={(e) => {
                    if (e.target.files?.[0]) setFile(e.target.files[0]);
                  }}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="flex flex-col items-center justify-center space-y-2">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                    <Upload className="w-5 h-5" />
                  </div>
                  {file ? (
                    <div className="text-xs">
                      <p className="font-bold text-emerald-900">{file.name}</p>
                      <p className="text-[11px] text-slate-500">{(file.size / 1024).toFixed(1)} KB</p>
                    </div>
                  ) : (
                    <div className="text-xs">
                      <p className="font-bold text-slate-700">Kéo thả file vào đây hoặc bấm để duyệt</p>
                      <p className="text-[11px] text-slate-400">Hỗ trợ định dạng file Microsoft Excel (.xlsx, .xls)</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Result Box */}
            {result && (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-2 text-xs">
                <div className="flex items-center space-x-2 text-emerald-800 font-bold">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{result.message || 'Import hoàn tất thành công!'}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center pt-1 font-mono">
                  <div className="p-2 bg-white rounded-xl border border-emerald-100">
                    <p className="text-[10px] text-slate-500 uppercase">Tổng số dòng</p>
                    <p className="font-extrabold text-slate-800 text-sm">{result.totalRows || 0}</p>
                  </div>
                  <div className="p-2 bg-white rounded-xl border border-emerald-100">
                    <p className="text-[10px] text-emerald-600 uppercase">Thành công</p>
                    <p className="font-extrabold text-emerald-700 text-sm">{result.successRows || 0}</p>
                  </div>
                  <div className="p-2 bg-white rounded-xl border border-emerald-100">
                    <p className="text-[10px] text-rose-500 uppercase">Thất bại</p>
                    <p className="font-extrabold text-rose-600 text-sm">{result.failedRows || 0}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
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
      </div>
    </div>
  );
}
