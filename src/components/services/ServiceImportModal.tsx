'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Download,
  X,
  FileText,
  CheckCircle2,
  RefreshCw,
  Check,
  AlertTriangle,
} from 'lucide-react';
import { useLanguage } from '@/lib/i18n/context';

export interface ServiceImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function ServiceImportModal({ isOpen, onClose, onSuccess }: ServiceImportModalProps) {
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

  const setIsImportModalOpen = (open: boolean) => {
    if (!open) {
      setImportFile(null);
      setImportResult(null);
      onClose();
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const res = await fetch('/api/services/import');
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'Mau_Import_DichVu_IT_Va_ThueBao.xlsx';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        alert('Tải file mẫu thất bại');
      }
    } catch {
      alert('Lỗi kết nối khi tải file mẫu');
    }
  };

  const handleUploadExcel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importFile) {
      alert('Vui lòng chọn file Excel');
      return;
    }

    setIsImporting(true);
    setImportResult(null);
    try {
      const formDataUpload = new FormData();
      formDataUpload.append('file', importFile);

      const res = await fetch('/api/services/import', {
        method: 'POST',
        body: formDataUpload,
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setImportResult(data);
        if (onSuccess) onSuccess();
      } else {
        alert(data.error || 'Import thất bại');
      }
    } catch {
      alert('Lỗi kết nối khi import');
    } finally {
      setIsImporting(false);
    }
  };

  return (

        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-3 sm:p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full flex flex-col border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-purple-50 to-indigo-50">
              <h3 className="font-bold text-sm text-purple-950 flex items-center gap-2">
                <span className="p-1.5 bg-purple-600 text-white rounded-xl shadow-xs">
                  <Download className="w-3.5 h-3.5 rotate-180" />
                </span>
                <span>Import Danh Sách Dịch Vụ IT & Thuê Bao Từ Excel</span>
              </h3>
              <button onClick={() => setIsImportModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              {/* Step 1: Download Template */}
              <div className="p-4 bg-purple-50/70 border border-purple-200 rounded-2xl flex items-center justify-between gap-3">
                <div>
                  <h4 className="font-bold text-purple-950 text-xs">Bước 1: Tải file mẫu chuẩn</h4>
                  <p className="text-[11px] text-purple-700 mt-0.5">Sử dụng file Excel mẫu để điền các thông tin dịch vụ, nhà mạng, IP tĩnh và chi phí</p>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs flex items-center gap-1 shrink-0 shadow-2xs cursor-pointer transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Tải File Mẫu</span>
                </button>
              </div>

              {/* Step 2: Upload File */}
              <form onSubmit={handleUploadExcel} className="space-y-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">Bước 2: Chọn file Excel (.xlsx) đã điền dữ liệu (*)</label>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="p-6 border-2 border-dashed border-purple-300 hover:border-purple-500 bg-slate-50/70 hover:bg-purple-50/40 rounded-2xl flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors"
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".xlsx, .xls"
                      className="hidden"
                      onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                    />
                    <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center">
                      <FileText className="w-5 h-5" />
                    </div>
                    {importFile ? (
                      <p className="font-bold text-purple-900 text-xs">{importFile.name} ({(importFile.size / 1024).toFixed(1)} KB)</p>
                    ) : (
                      <div className="text-center">
                        <p className="font-bold text-slate-700">Bấm để chọn file hoặc kéo thả file Excel vào đây</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">Hỗ trợ định dạng .xlsx tiêu chuẩn</p>
                      </div>
                    )}
                  </div>
                </div>

                {importResult && (
                  <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl space-y-1">
                    <p className="font-bold flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>{importResult.message}</span>
                    </p>
                    {importResult.errors?.length > 0 && (
                      <div className="text-[11px] text-rose-700 pt-1 border-t border-emerald-200/60">
                        <p className="font-bold">Một số lỗi:</p>
                        <ul className="list-disc pl-4 space-y-0.5 font-mono text-[10px]">
                          {importResult.errors.map((err: string, idx: number) => (
                            <li key={idx}>{err}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsImportModalOpen(false)}
                    className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                  >
                    Đóng (ESC)
                  </button>
                  <button
                    type="submit"
                    disabled={!importFile || isImporting}
                    className="px-5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {isImporting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    <span>{isImporting ? 'Đang Import...' : 'Tiến Hành Import'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
  );
}
