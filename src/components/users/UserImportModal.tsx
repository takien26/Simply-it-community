'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Download,
  X,
  FileSpreadsheet,
  CheckCircle2,
  RefreshCw,
  AlertTriangle,
  UploadCloud,
  FileText,
  Users,
  Check,
} from 'lucide-react';
import { useLanguage } from '@/lib/i18n/context';

export interface UserImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function UserImportModal({ isOpen, onClose, onSuccess }: UserImportModalProps) {
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

  const { language, t } = useLanguage();
  const isEn = language === 'en';

  const [importFile, setImportFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleClose = () => {
    setImportFile(null);
    setImportResult(null);
    onClose();
  };

  const handleDownloadTemplate = async () => {
    try {
      const res = await fetch('/api/users/import');
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'Mau_Import_Nhan_Su.xlsx';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        alert(isEn ? 'Failed to download template' : 'Tải file mẫu thất bại');
      }
    } catch {
      alert(isEn ? 'Network error while downloading template' : 'Lỗi kết nối khi tải file mẫu');
    }
  };

  const handleUploadExcel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importFile) {
      alert(isEn ? 'Please select an Excel file' : 'Vui lòng chọn file Excel');
      return;
    }

    setIsImporting(true);
    setImportResult(null);
    try {
      const formDataUpload = new FormData();
      formDataUpload.append('file', importFile);

      const res = await fetch('/api/users/import', {
        method: 'POST',
        body: formDataUpload,
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setImportResult(data);
        if (onSuccess) onSuccess();
      } else {
        alert(data.error || (isEn ? 'Import failed' : 'Import thất bại'));
      }
    } catch {
      alert(isEn ? 'Network error while importing' : 'Lỗi kết nối khi import dữ liệu');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/10 rounded-xl">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">
                {isEn ? 'Import Employees / Users from Excel' : 'Nạp Dữ Liệu Nhân Sự & Người Dùng Từ Excel'}
              </h3>
              <p className="text-xs text-indigo-100 mt-0.5">
                {isEn ? 'Bulk create or update employee records via .xlsx spreadsheet' : 'Tạo mới hoặc cập nhật hàng loạt danh sách nhân viên qua file Excel'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Step 1: Download Template */}
          <div className="p-4 bg-indigo-50/70 border border-indigo-100 rounded-xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Download className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-xs">
                  {isEn ? '1. Download standard Excel template' : '1. Tải file Excel mẫu chuẩn'}
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {isEn ? 'Contains required columns: Full Name, Email, Company, Department, Position, Phone' : 'Đầy đủ cột: Họ Tên, Email, Công Ty Quản Lý, Phòng Ban, Vị Trí, Số Điện Thoại'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="px-3 py-1.5 bg-white border border-indigo-200 hover:bg-indigo-50 text-indigo-700 font-bold text-xs rounded-xl shadow-2xs transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isEn ? 'Download .xlsx' : 'Tải File Mẫu'}</span>
            </button>
          </div>

          {/* Step 2: Upload File */}
          <form onSubmit={handleUploadExcel} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">
                {isEn ? '2. Select your filled Excel file to import' : '2. Chọn file Excel đã điền thông tin nhân sự'}
              </label>
              <div
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-2 ${
                  importFile
                    ? 'border-indigo-500 bg-indigo-50/30'
                    : 'border-slate-300 hover:border-indigo-400 bg-slate-50/60 hover:bg-indigo-50/20'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setImportFile(e.target.files[0]);
                      setImportResult(null);
                    }
                  }}
                />
                {importFile ? (
                  <>
                    <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
                      <FileText className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">{importFile.name}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {(importFile.size / 1024).toFixed(1)} KB • {isEn ? 'Click to change file' : 'Nhấp để đổi file khác'}
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center">
                      <UploadCloud className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-700">
                        {isEn ? 'Click or drag file here to upload' : 'Nhấp để chọn file hoặc kéo thả file vào đây'}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {isEn ? 'Supports .xlsx, .xls format' : 'Hỗ trợ định dạng .xlsx, .xls'}
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Result summary banner */}
            {importResult && (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 animate-in fade-in">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>{importResult.message}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 pt-1 text-center text-xs">
                  <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-lg">
                    <span className="text-[10px] text-emerald-700 block font-semibold">{isEn ? 'New Added' : 'Tạo mới'}</span>
                    <span className="text-base font-extrabold text-emerald-700">+{importResult.importedCount}</span>
                  </div>
                  <div className="p-2 bg-blue-50 border border-blue-200 rounded-lg">
                    <span className="text-[10px] text-blue-700 block font-semibold">{isEn ? 'Updated' : 'Cập nhật'}</span>
                    <span className="text-base font-extrabold text-blue-700">{importResult.updatedCount}</span>
                  </div>
                  <div className="p-2 bg-slate-100 border border-slate-200 rounded-lg">
                    <span className="text-[10px] text-slate-600 block font-semibold">{isEn ? 'Failed' : 'Lỗi'}</span>
                    <span className="text-base font-extrabold text-slate-700">{importResult.failedCount}</span>
                  </div>
                </div>

                {importResult.errors?.length > 0 && (
                  <div className="mt-2 max-h-32 overflow-y-auto text-[11px] space-y-1 p-2 bg-rose-50 border border-rose-200 rounded-lg text-rose-800">
                    <p className="font-bold">{isEn ? 'Errors:' : 'Chi tiết dòng lỗi:'}</p>
                    {importResult.errors.map((err: any, idx: number) => (
                      <p key={idx}>• Dòng {err.row}: {err.error} {err.email ? `(${err.email})` : ''}</p>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                {isEn ? 'Close' : 'Đóng'}
              </button>
              <button
                type="submit"
                disabled={!importFile || isImporting}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
              >
                {isImporting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>{isEn ? 'Importing...' : 'Đang xử lý dữ liệu...'}</span>
                  </>
                ) : (
                  <>
                    <UploadCloud className="w-4 h-4" />
                    <span>{isEn ? 'Start Import' : 'Bắt Đầu Import'}</span>
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
