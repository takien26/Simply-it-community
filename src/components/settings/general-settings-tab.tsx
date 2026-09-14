'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  CheckCircle2,
  Palette,
  Globe,
  ChevronDown,
  Check,
  Trash2,
  Laptop,
  Upload,
  Loader2,
  QrCode,
  Bell,
  Database,
  Sparkles,
  Save,
  RotateCcw,
  Sliders,
  FolderOpen,
  Copy,
  Zap,
  Download,
} from 'lucide-react';

interface GeneralSettingsTabProps {
  isEn: boolean;
  language: string;
  setLanguage: (lang: any) => void;
  supportedLanguages: any[];
  settings: any[];
  getSettingValue: (key: string) => string;
  handleChange: (key: string, value: string) => void;
  handleSaveSettings: (e: React.FormEvent) => void;
  saved: boolean;
  loadAll: () => void;
}

export function GeneralSettingsTab({
  isEn,
  language,
  setLanguage,
  supportedLanguages,
  settings,
  getSettingValue,
  handleChange,
  handleSaveSettings,
  saved,
  loadAll,
}: GeneralSettingsTabProps) {
  const [isLangDropdownOpen, setIsLangDropdownOpen] = useState(false);
  const langDropdownRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderBrowserRef = useRef<HTMLInputElement>(null);
  const backupInputRef = useRef<HTMLInputElement>(null);

  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [sampleDataStats, setSampleDataStats] = useState<any>(null);
  const [loadingSampleData, setLoadingSampleData] = useState(false);
  const [sampleToast, setSampleToast] = useState<string | null>(null);

  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [backupToast, setBackupToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [testingPath, setTestingPath] = useState(false);
  const [pathTestResult, setPathTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [copiedBackupDir, setCopiedBackupDir] = useState(false);
  const [isDownloadingZip, setIsDownloadingZip] = useState(false);
  const [zipBackupStatus, setZipBackupStatus] = useState<{
    uploadsSizeFormatted: string;
    uploadsCount: number;
    lastBackupAt: string | null;
  } | null>(null);

  const [autoBackupConfig, setAutoBackupConfig] = useState({
    autoEnabled: true,
    frequency: 'DAILY',
    time: '02:00',
    directory: 'C:\\IT_Backups',
    syncUploads: true,
    retentionDays: 30,
    lastRun: null as string | null,
  });

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (langDropdownRef.current && !langDropdownRef.current.contains(e.target as Node)) {
        setIsLangDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadSampleStats = async () => {
    try {
      const res = await fetch('/api/system/sample-data');
      const data = await res.json();
      if (data.success) setSampleDataStats(data.stats);
    } catch {}
  };

  const loadZipBackupStatus = async () => {
    try {
      const res = await fetch('/api/system/backup/status');
      const data = await res.json();
      if (data.success && data.status) {
        setZipBackupStatus(data.status);
      }
    } catch {}
  };

  const loadAutoBackupData = async () => {
    loadZipBackupStatus();
    try {
      const res = await fetch('/api/system/backup/auto');
      const data = await res.json();
      if (data.success && data.config) {
        setAutoBackupConfig(data.config);
      }
    } catch {}
  };

  useEffect(() => {
    loadSampleStats();
    loadAutoBackupData();
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingLogo(true);
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        if (data.url) {
          handleChange('app.logo', data.url);
        }
      } else {
        const err = await res.json();
        alert(err.error || 'Tải ảnh thất bại');
      }
    } catch {
      alert('Lỗi kết nối khi tải ảnh');
    } finally {
      setUploadingLogo(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleCopyBackupDir = () => {
    if (navigator?.clipboard && autoBackupConfig.directory) {
      navigator.clipboard.writeText(autoBackupConfig.directory);
      setCopiedBackupDir(true);
      setTimeout(() => setCopiedBackupDir(false), 2500);
    }
  };

  const handleBrowseFolder = async () => {
    try {
      if (typeof window !== 'undefined' && 'showDirectoryPicker' in window) {
        // @ts-ignore
        const dirHandle = await (window as any).showDirectoryPicker();
        if (dirHandle && dirHandle.name) {
          const pickedName = dirHandle.name;
          const current = autoBackupConfig.directory || 'C:\\IT_Backups';
          const sep = current.includes('/') ? '/' : '\\';
          const newPath = current.includes(sep)
            ? `${current.substring(0, current.lastIndexOf(sep))}${sep}${pickedName}`
            : `C:\\${pickedName}`;
          setAutoBackupConfig((prev) => ({ ...prev, directory: newPath }));
          setPathTestResult(null);
          return;
        }
      }
    } catch {}
    folderBrowserRef.current?.click();
  };

  const handleFolderSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const firstFile = files[0];
      const relPath = firstFile.webkitRelativePath || '';
      if (relPath) {
        const topFolder = relPath.split('/')[0];
        const newPath = `C:\\${topFolder}`;
        setAutoBackupConfig((prev) => ({ ...prev, directory: newPath }));
        setPathTestResult(null);
      }
    }
  };

  const handleTestBackupPath = async () => {
    setTestingPath(true);
    setPathTestResult(null);
    try {
      const res = await fetch('/api/system/backup/auto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'TEST_PATH', directory: autoBackupConfig.directory }),
      });
      const data = await res.json();
      setPathTestResult({ success: res.ok, message: data.message || data.error });
    } catch {
      setPathTestResult({ success: false, message: 'Lỗi kết nối kiểm tra đường dẫn' });
    } finally {
      setTestingPath(false);
    }
  };

  const handleToggleAutoBackup = async () => {
    const nextState = !autoBackupConfig.autoEnabled;
    const updatedConfig = { ...autoBackupConfig, autoEnabled: nextState };
    setAutoBackupConfig(updatedConfig);
    try {
      const res = await fetch('/api/system/backup/auto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'SAVE_CONFIG', config: updatedConfig }),
      });
      const data = await res.json();
      if (res.ok) {
        setBackupToast({
          message: nextState ? '✅ Đã BẬT tính năng tự động sao lưu định kỳ!' : '⚪ Đã TẮT tính năng tự động sao lưu!',
          type: 'success',
        });
      }
    } catch {
      setBackupToast({ message: 'Lỗi lưu trạng thái tự động sao lưu', type: 'error' });
    } finally {
      setTimeout(() => setBackupToast(null), 3500);
    }
  };

  const handleRunBackupNowToDir = async () => {
    setIsBackingUp(true);
    try {
      const res = await fetch('/api/system/backup/auto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'RUN_NOW' }),
      });
      const data = await res.json();
      if (res.ok) {
        setBackupToast({ message: data.message || 'Đã tạo bản sao lưu thành công!', type: 'success' });
        loadAutoBackupData();
      } else {
        setBackupToast({ message: data.error || 'Lỗi sao lưu', type: 'error' });
      }
    } catch {
      setBackupToast({ message: 'Lỗi kết nối khi chạy sao lưu', type: 'error' });
    } finally {
      setIsBackingUp(false);
      setTimeout(() => setBackupToast(null), 5000);
    }
  };

  const handleDownloadBackup = async () => {
    setIsBackingUp(true);
    try {
      const res = await fetch('/api/system/backup');
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ITSM_Backup_${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        setBackupToast({ message: 'Đã xuất file sao lưu hệ thống thành công!', type: 'success' });
      } else {
        setBackupToast({ message: 'Không thể tạo bản sao lưu dữ liệu', type: 'error' });
      }
    } catch {
      setBackupToast({ message: 'Lỗi kết nối khi sao lưu dữ liệu', type: 'error' });
    } finally {
      setIsBackingUp(false);
      setTimeout(() => setBackupToast(null), 4000);
    }
  };

  const handleRestoreFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm('CẢNH BÁO: Bạn có chắc chắn muốn phục hồi dữ liệu từ file này? Thao tác này sẽ ghi đè và cập nhật cấu hình hệ thống.')) {
      if (backupInputRef.current) backupInputRef.current.value = '';
      return;
    }

    setIsRestoring(true);
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      const res = await fetch('/api/system/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(json),
      });

      const data = await res.json();
      if (res.ok) {
        setBackupToast({ message: data.message || 'Phục hồi dữ liệu thành công!', type: 'success' });
        setTimeout(() => window.location.reload(), 1500);
      } else {
        setBackupToast({ message: data.error || 'Phục hồi thất bại', type: 'error' });
      }
    } catch {
      setBackupToast({ message: 'File sao lưu không hợp lệ hoặc lỗi kết nối', type: 'error' });
    } finally {
      setIsRestoring(false);
      if (backupInputRef.current) backupInputRef.current.value = '';
      setTimeout(() => setBackupToast(null), 4000);
    }
  };

  const handleDownloadZipBackup = async () => {
    setIsDownloadingZip(true);
    try {
      const link = document.createElement('a');
      link.href = '/api/system/backup/download';
      link.setAttribute('download', '');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setTimeout(() => {
        loadZipBackupStatus();
        setIsDownloadingZip(false);
      }, 5000);
    } catch (err) {
      console.error(err);
      setIsDownloadingZip(false);
      alert('Không thể tải gói sao lưu. Vui lòng thử lại.');
    }
  };

  const handleSeedSampleData = async () => {
    if (!confirm('Bạn có muốn tạo bộ dữ liệu mẫu (Tài sản, Bản quyền, Dịch vụ, Ticket, Mật khẩu KeePass) để tham khảo không?')) return;
    setLoadingSampleData(true);
    try {
      const res = await fetch('/api/system/sample-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'SEED' }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSampleToast(data.message);
        setTimeout(() => setSampleToast(null), 5000);
        loadSampleStats();
        loadAutoBackupData();
        loadAll();
      } else {
        alert(data.error || 'Tạo dữ liệu mẫu thất bại');
      }
    } catch {
      alert('Lỗi kết nối khi tạo dữ liệu mẫu');
    } finally {
      setLoadingSampleData(false);
    }
  };

  const handleClearSampleData = async () => {
    if (!confirm('Bạn có chắc chắn muốn XÓA SẠCH toàn bộ dữ liệu mẫu không? (Dữ liệu thật của bạn sẽ được giữ nguyên an toàn 100%)')) return;
    setLoadingSampleData(true);
    try {
      const res = await fetch('/api/system/sample-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'CLEAR' }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSampleToast(data.message);
        setTimeout(() => setSampleToast(null), 5000);
        loadSampleStats();
        loadAll();
      } else {
        alert(data.error || 'Xóa dữ liệu mẫu thất bại');
      }
    } catch {
      alert('Lỗi kết nối khi xóa dữ liệu mẫu');
    } finally {
      setLoadingSampleData(false);
    }
  };

  const currentLogo = getSettingValue('app.logo');
  const currentPrimaryColor = getSettingValue('app.primary_color') || '#2563EB';

  return (
    <form onSubmit={handleSaveSettings} className="space-y-6">
      {saved && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-semibold rounded-2xl flex items-center space-x-2 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          <span>{isEn ? 'System settings have been updated successfully!' : 'Cài đặt hệ thống đã được cập nhật thành công!'}</span>
        </div>
      )}

      {/* Logo & Branding Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
        <div className="flex items-center space-x-2 text-slate-900 font-bold text-base pb-3 border-b border-slate-100">
          <Palette className="w-5 h-5 text-blue-600" />
          <span>{isEn ? 'Brand Logo & Platform Identity' : 'Tùy biến Logo & Nhận diện Thương hiệu'}</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">{isEn ? 'Application Display Name' : 'Tên ứng dụng hiển thị'}</label>
            <input
              type="text"
              placeholder={isEn ? 'e.g., IT Asset Hub, Simply IT...' : 'VD: Quản lý tài sản, IT Asset Hub...'}
              value={getSettingValue('app.name')}
              onChange={(e) => handleChange('app.name', e.target.value)}
              className="w-full p-2.5 border border-slate-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-slate-800"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {language === 'en' ? 'Company / Organization Name' : 'Tên công ty / Doanh nghiệp'}
            </label>
            <input
              type="text"
              placeholder={isEn ? 'e.g., TechCorp Ltd, ABC Corporation...' : 'VD: Công ty TechCorp, ABC Corporation...'}
              value={getSettingValue('app.company_name')}
              onChange={(e) => handleChange('app.company_name', e.target.value)}
              className="w-full p-2.5 border border-slate-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-slate-800"
            />
          </div>

          {/* SYSTEM LANGUAGE SETTING */}
          <div className="md:col-span-2 pt-2 border-t border-slate-100">
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
              <Globe className="w-4 h-4 text-blue-600" />
              <span>{language === 'en' ? 'Default System Language' : 'Ngôn ngữ mặc định của hệ thống'}</span>
            </label>
            <p className="text-[11px] text-slate-500 mb-2">
              {language === 'en'
                ? 'Select primary language for the entire platform interface and login screen'
                : 'Chọn ngôn ngữ giao diện chính cho hệ thống và màn hình đăng nhập'}
            </p>
            <div className="relative max-w-md" ref={langDropdownRef}>
              {(() => {
                const currentLangCode = getSettingValue('app.language') || language;
                const selectedLang = supportedLanguages.find((l) => l.code === currentLangCode) || supportedLanguages[0];

                return (
                  <>
                    <button
                      type="button"
                      onClick={() => setIsLangDropdownOpen(!isLangDropdownOpen)}
                      className="w-full p-2.5 bg-white border border-slate-300 hover:border-slate-400 rounded-xl text-xs font-bold text-slate-800 flex items-center justify-between shadow-2xs focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="text-xl shrink-0">{selectedLang.flag}</span>
                        <div className="text-left">
                          <span className="text-slate-900 font-bold">{selectedLang.nativeName}</span>
                          {selectedLang.name !== selectedLang.nativeName && (
                            <span className="text-[11px] text-slate-500 font-normal ml-1.5">({selectedLang.name})</span>
                          )}
                        </div>
                      </div>
                      <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${isLangDropdownOpen ? 'rotate-180 text-blue-600' : ''}`} />
                    </button>

                    {isLangDropdownOpen && (
                      <div className="absolute left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-1.5 space-y-1 animate-in fade-in zoom-in-95 duration-100">
                        {supportedLanguages.map((lang) => {
                          const isSelected = lang.code === selectedLang.code;
                          return (
                            <button
                              key={lang.code}
                              type="button"
                              onClick={() => {
                                handleChange('app.language', lang.code);
                                setLanguage(lang.code as any);
                                setIsLangDropdownOpen(false);
                              }}
                              className={`w-full px-3 py-2 rounded-lg text-xs flex items-center justify-between transition-colors cursor-pointer ${
                                isSelected
                                  ? 'bg-blue-50 text-blue-700 font-bold'
                                  : 'hover:bg-slate-50 text-slate-700 font-medium'
                              }`}
                            >
                              <div className="flex items-center gap-2.5">
                                <span className="text-lg shrink-0">{lang.flag}</span>
                                <span>{lang.nativeName}</span>
                                {lang.name !== lang.nativeName && (
                                  <span className="text-[11px] text-slate-400">({lang.name})</span>
                                )}
                              </div>
                              {isSelected && <Check className="w-4 h-4 text-blue-600 shrink-0" />}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        </div>

        {/* LOGO UPLOAD & PICKER SECTION */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold text-slate-800">
              {isEn ? 'Brand Logo (Upload image or paste URL)' : 'Logo Thương hiệu (Tải ảnh từ máy tính hoặc dán URL)'}
            </label>
            {currentLogo && (
              <button
                type="button"
                onClick={() => handleChange('app.logo', '')}
                className="text-[11px] text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3 h-3" />
                <span>{isEn ? 'Reset logo (Use default)' : 'Xóa logo (Dùng icon mặc định)'}</span>
              </button>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            {/* Live Preview Box (Sidebar Style) */}
            <div className="flex items-center gap-3 p-3 bg-slate-900 text-white rounded-xl border border-slate-800 shrink-0">
              {currentLogo ? (
                <div className="w-12 h-12 rounded-lg bg-slate-800 flex items-center justify-center overflow-hidden border border-slate-700 shrink-0">
                  <img
                    src={currentLogo}
                    alt="Logo Preview"
                    className="w-full h-full object-contain p-1"
                    onError={(e) => {
                      (e.target as any).style.display = 'none';
                    }}
                  />
                </div>
              ) : (
                <div
                  style={{ backgroundColor: currentPrimaryColor }}
                  className="w-12 h-12 rounded-lg flex items-center justify-center shadow-md shrink-0"
                >
                  <Laptop className="w-6 h-6 text-white" />
                </div>
              )}
              <div className="text-xs">
                <p className="font-bold text-white leading-tight">{getSettingValue('app.name') || 'IT Asset Hub'}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">{getSettingValue('app.company_name') || 'Công ty TechCorp'}</p>
                <span className="text-[9px] text-emerald-400 font-mono">{isEn ? '● Sidebar Preview' : '● Xem trước Sidebar'}</span>
              </div>
            </div>

            {/* Upload & Path Controls */}
            <div className="flex-1 space-y-2 w-full">
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/png,image/jpeg,image/svg+xml,image/webp,image/gif,image/x-icon"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="logo-file-picker"
                />
                <label
                  htmlFor="logo-file-picker"
                  className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl cursor-pointer flex items-center gap-1.5 shadow-2xs transition-colors shrink-0"
                >
                  {uploadingLogo ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                  <span>{uploadingLogo ? (isEn ? 'Uploading...' : 'Đang tải lên...') : (isEn ? '📂 Choose image file' : '📂 Chọn file ảnh từ máy tính')}</span>
                </label>

                <input
                  type="text"
                  placeholder={isEn ? 'Or paste URL: https://example.com/logo.png' : 'Hoặc dán URL: https://example.com/logo.png'}
                  value={currentLogo}
                  onChange={(e) => handleChange('app.logo', e.target.value)}
                  className="flex-1 p-2 bg-white border border-slate-300 rounded-xl text-xs font-mono outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <p className="text-[11px] text-slate-500">
                {isEn
                  ? '💡 Supported formats: PNG, JPG, SVG, WebP, ICO (Recommended: 1:1 square or transparent background).'
                  : '💡 Hỗ trợ các định dạng ảnh: PNG, JPG, SVG, WebP, ICO (Kích thước đề xuất: vuông hoặc tỉ lệ 1:1 hoặc chữ nhật nhỏ, nền trong suốt).'}
              </p>
            </div>
          </div>
        </div>

        {/* COLOR PICKER */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">{isEn ? 'Primary Accent Color' : 'Màu chủ đạo giao diện (Primary Color)'}</label>
          <div className="flex items-center space-x-3">
            <input
              type="color"
              value={currentPrimaryColor}
              onChange={(e) => handleChange('app.primary_color', e.target.value)}
              className="w-10 h-10 rounded-xl border border-slate-300 cursor-pointer p-0.5"
            />
            <input
              type="text"
              value={currentPrimaryColor}
              onChange={(e) => handleChange('app.primary_color', e.target.value)}
              className="w-36 p-2.5 border border-slate-300 rounded-xl text-sm font-mono outline-none uppercase font-semibold text-slate-800"
            />
            {/* Preset Colors */}
            <div className="flex items-center gap-1.5">
              {['#2563EB', '#4F46E5', '#7C3AED', '#059669', '#DC2626', '#EA580C', '#0F172A'].map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => handleChange('app.primary_color', c)}
                  style={{ backgroundColor: c }}
                  className="w-6 h-6 rounded-lg border-2 border-white shadow-2xs hover:scale-110 transition-transform cursor-pointer"
                  title={c}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Server IP & QR Code Scanner URL Configuration Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-2 text-slate-900 font-bold text-base">
            <QrCode className="w-5 h-5 text-indigo-600" />
            <span>{isEn ? 'Server IP / Domain & Mobile QR Scan Link' : 'Cấu hình Server IP / Cổng & Link Quét Mã QR Code'}</span>
          </div>
          <button
            type="button"
            onClick={() => {
              if (typeof window !== 'undefined') {
                handleChange('app.server_url', window.location.origin);
              }
            }}
            className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100 transition-colors flex items-center space-x-1 cursor-pointer"
          >
            <span>{isEn ? '🌐 Auto-detect current server URL' : '🌐 Tự động lấy URL máy chủ hiện tại'}</span>
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {isEn
                ? 'Server Address / LAN IP & Port (e.g. http://192.168.1.15:3000 or https://it.mycompany.com)'
                : 'Địa chỉ Server / IP Mạng LAN & Port (VD: http://192.168.1.15:3000 hoặc https://it.mycompany.com)'}
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="http://192.168.1.100:3000"
                value={getSettingValue('app.server_url')}
                onChange={(e) => handleChange('app.server_url', e.target.value)}
                className="flex-1 p-2.5 border border-slate-300 rounded-xl text-sm font-mono outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              {isEn ? (
                <>💡 <strong>Guide:</strong> When scanning a device QR code with a mobile device, this URL redirects to the asset details view. You can update this domain or IP anytime.</>
              ) : (
                <>💡 <strong>Hướng dẫn:</strong> Khi quét mã QR dán trên máy tính bằng điện thoại, link sẽ trỏ về địa chỉ IP này để mở thẳng trang xem chi tiết thiết bị. Bạn có thể đổi IP máy chủ hoặc tên miền bất kỳ lúc nào tại đây.</>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Notification & AI Settings */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center space-x-2 text-slate-900 font-bold text-base pb-3 border-b border-slate-100">
          <Bell className="w-5 h-5 text-amber-600" />
          <span>{isEn ? 'Expiry Reminders & AI Threshold' : 'Cảnh báo nhắc hạn & Cấu hình AI'}</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              {isEn ? 'License Expiry Notice (days)' : 'Nhắc License trước (ngày)'}
            </label>
            <input
              type="number"
              value={getSettingValue('notification.license_expiry_days')}
              onChange={(e) => handleChange('notification.license_expiry_days', e.target.value)}
              className="w-full p-2.5 border border-slate-300 rounded-xl text-sm outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              {isEn ? 'Warranty Expiry Notice (days)' : 'Nhắc bảo hành trước (ngày)'}
            </label>
            <input
              type="number"
              value={getSettingValue('notification.warranty_expiry_days')}
              onChange={(e) => handleChange('notification.warranty_expiry_days', e.target.value)}
              className="w-full p-2.5 border border-slate-300 rounded-xl text-sm outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              {isEn ? 'AI Auto-Save Confidence (0.0 - 1.0)' : 'Ngưỡng tự lưu AI (0.0 - 1.0)'}
            </label>
            <input
              type="text"
              value={getSettingValue('ai.auto_save_threshold')}
              onChange={(e) => handleChange('ai.auto_save_threshold', e.target.value)}
              className="w-full p-2.5 border border-slate-300 rounded-xl text-sm outline-none font-mono"
            />
          </div>
        </div>
      </div>

      {/* SAMPLE DATA MANAGEMENT CARD */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">{isEn ? 'Sample & Demo Data Management' : 'Dữ Liệu Mẫu & Demo (Sample Data Management)'}</h3>
              <p className="text-xs text-slate-500">{isEn ? 'Generate realistic sample dataset for evaluation and clear cleanly anytime' : 'Tạo bộ dữ liệu mẫu thực tế để người dùng mới dễ dàng trải nghiệm và xóa sạch bất kỳ lúc nào'}</p>
            </div>
          </div>

          {sampleToast && (
            <div className="px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold rounded-xl animate-in fade-in flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{sampleToast}</span>
            </div>
          )}
        </div>

        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-center">
            <div className="p-2.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">{isEn ? 'Assets' : 'Tài sản'}</span>
              <span className="text-sm font-extrabold text-indigo-600">{sampleDataStats?.sampleAssets ?? 0} mẫu</span>
            </div>
            <div className="p-2.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">{isEn ? 'Licenses' : 'Bản quyền'}</span>
              <span className="text-sm font-extrabold text-purple-600">{sampleDataStats?.sampleLicenses ?? 0} mẫu</span>
            </div>
            <div className="p-2.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">{isEn ? 'IT Services' : 'Dịch vụ IT'}</span>
              <span className="text-sm font-extrabold text-emerald-600">{sampleDataStats?.sampleServices ?? 0} mẫu</span>
            </div>
            <div className="p-2.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">{isEn ? 'IT Tickets' : 'Ticket IT'}</span>
              <span className="text-sm font-extrabold text-rose-600">{sampleDataStats?.sampleTickets ?? 0} mẫu</span>
            </div>
            <div className="p-2.5 bg-white rounded-xl border border-slate-200 shadow-2xs col-span-2 sm:col-span-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">{isEn ? 'Vault Credentials' : 'Pass KeePass'}</span>
              <span className="text-sm font-extrabold text-amber-600">{sampleDataStats?.samplePasswords ?? 0} mẫu</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <p className="text-xs text-slate-600">
              💡 <strong>Gợi ý:</strong> Bộ dữ liệu mẫu bao gồm: Laptop Dell XPS, MacBook Pro, Switch Cisco, VMware ESXi, Bản quyền Office 365, Tên miền, Ticket mẫu và cây thư mục KeePass chuẩn.
            </p>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                disabled={loadingSampleData}
                onClick={handleSeedSampleData}
                className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer disabled:opacity-50"
              >
                {loadingSampleData ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 text-amber-300" />}
                <span>{isEn ? '+ Load Sample Data' : '+ Nạp Dữ Liệu Mẫu'}</span>
              </button>

              <button
                type="button"
                disabled={loadingSampleData || (sampleDataStats?.totalSampleItems === 0)}
                onClick={handleClearSampleData}
                className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                title={isEn ? 'Delete all sample records prefixed with [SAMPLE]' : 'Xóa toàn bộ các bản ghi mẫu có tiền tố [MẪU]'}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isEn ? 'Clear Sample Data' : 'Xóa Dữ Liệu Mẫu'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* SYSTEM BACKUP & RESTORE CARD WITH SCHEDULE & DIRECTORY SYNC */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
        {/* Card Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div className="flex items-center space-x-3">
            <div className="w-11 h-11 rounded-2xl bg-purple-50 flex items-center justify-center text-purple-600 shadow-2xs border border-purple-100">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">{isEn ? 'Automated Backup & Directory Sync' : 'Sao Lưu & Phục Hồi Dữ Liệu Tự Động (Auto-Backup & Sync)'}</h3>
              <p className="text-xs text-slate-500">{isEn ? 'Scheduled automated backups (Daily/Weekly/Monthly), custom directory storage, and file replication' : 'Tự động sao lưu định kỳ (Ngày/Tuần/Tháng), chỉ định thư mục lưu trữ và tự động đồng bộ file Hóa đơn / Hợp đồng mới'}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadBackup}
              disabled={isBackingUp}
              className="px-3.5 py-2 bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
              title="Tải ngay file snapshot JSON về máy tính"
            >
              <Save className="w-3.5 h-3.5 text-purple-600" />
              <span>{isEn ? '📥 Download Snapshot' : '📥 Tải Snapshot'}</span>
            </button>

            <input
              ref={backupInputRef}
              type="file"
              accept=".json"
              onChange={handleRestoreFile}
              className="hidden"
            />

            <button
              type="button"
              onClick={() => backupInputRef.current?.click()}
              disabled={isRestoring}
              className="px-3.5 py-2 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              title="Phục hồi cơ sở dữ liệu từ file backup"
            >
              {isRestoring ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5 text-slate-600" />}
              <span>{isRestoring ? (isEn ? 'Restoring...' : 'Đang phục hồi...') : (isEn ? '📤 Restore Snapshot' : '📤 Phục Hồi')}</span>
            </button>
          </div>
        </div>

        {backupToast && (
          <div
            className={`p-3.5 border rounded-xl text-xs font-semibold flex items-center space-x-2 animate-in fade-in ${
              backupToast.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            <span>{backupToast.type === 'success' ? '✅' : '⚠️'}</span>
            <span>{backupToast.message}</span>
          </div>
        )}

        {/* SECTION 1: SCHEDULE & DESTINATION FOLDER CONFIGURATION */}
        <div className="bg-slate-50/80 p-5 rounded-2xl border border-slate-200 space-y-4">
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Sliders className="w-4 h-4 text-purple-600" />
              <span>{isEn ? '1. Scheduled Backup Configuration & Target Directory' : '1. Cấu Hình Tự Động Sao Lưu Định Kỳ & Thư Mục Máy Chủ'}</span>
            </span>
            <button
              type="button"
              onClick={handleToggleAutoBackup}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full border transition-all cursor-pointer font-bold text-xs shadow-2xs ${
                autoBackupConfig.autoEnabled
                  ? 'bg-purple-600 hover:bg-purple-700 border-purple-700 text-white'
                  : 'bg-slate-200 hover:bg-slate-300 border-slate-300 text-slate-700'
              }`}
            >
              <span className={`w-2.5 h-2.5 rounded-full transition-colors ${autoBackupConfig.autoEnabled ? 'bg-emerald-300 animate-pulse' : 'bg-slate-400'}`} />
              <span>{autoBackupConfig.autoEnabled ? (isEn ? 'AUTO-BACKUP ON' : 'BẬT SAO LƯU TỰ ĐỘNG') : (isEn ? 'AUTO-BACKUP OFF' : 'ĐÃ TẮT SAO LƯU TỰ ĐỘNG')}</span>
            </button>
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            {/* Frequency */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">{isEn ? 'Backup Frequency:' : 'Tần suất sao lưu:'}</label>
              <select
                value={autoBackupConfig.frequency}
                onChange={(e) => setAutoBackupConfig({ ...autoBackupConfig, frequency: e.target.value })}
                disabled={!autoBackupConfig.autoEnabled}
                className="w-full p-2 bg-white border border-slate-300 rounded-xl font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 cursor-pointer"
              >
                <option value="DAILY">{isEn ? 'Daily' : 'Hàng ngày'}</option>
                <option value="WEEKLY">{isEn ? 'Weekly' : 'Hàng tuần'}</option>
                <option value="MONTHLY">{isEn ? 'Monthly' : 'Hàng tháng'}</option>
              </select>
            </div>

            {/* Time of Day */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">{isEn ? 'Scheduled Run Time:' : 'Thời gian chạy sao lưu:'}</label>
              <input
                type="time"
                value={autoBackupConfig.time}
                onChange={(e) => setAutoBackupConfig({ ...autoBackupConfig, time: e.target.value })}
                disabled={!autoBackupConfig.autoEnabled}
                className="w-full p-2 bg-white border border-slate-300 rounded-xl font-bold font-mono text-slate-800 outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
              />
            </div>

            {/* Retention */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">{isEn ? 'Retention (Days):' : 'Lưu trữ tối đa (ngày):'}</label>
              <input
                type="number"
                min="1"
                max="365"
                value={autoBackupConfig.retentionDays}
                onChange={(e) => setAutoBackupConfig({ ...autoBackupConfig, retentionDays: parseInt(e.target.value, 10) || 30 })}
                disabled={!autoBackupConfig.autoEnabled}
                className="w-full p-2 bg-white border border-slate-300 rounded-xl font-bold text-slate-800 outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
              />
            </div>
          </div>

          {/* Storage Path / Network Directory */}
          <div className="space-y-1.5 pt-1">
            <label className="block text-[11px] font-bold text-slate-700 flex items-center justify-between">
              <span>{isEn ? 'Backup Storage Directory:' : 'Thư mục lưu trữ sao lưu:'}</span>
              <span className="text-[10px] text-slate-400 font-normal">File sẽ tự động ghi rõ ngày giờ: ITSM_Backup_YYYY-MM-DD_HH-mm-ss.json</span>
            </label>

            <input
              ref={folderBrowserRef}
              type="file"
              {...({ webkitdirectory: '', directory: '' } as any)}
              onChange={handleFolderSelected}
              className="hidden"
            />

            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              <div className="relative flex-1 min-w-[200px]">
                <input
                  type="text"
                  value={autoBackupConfig.directory}
                  onChange={(e) => {
                    setAutoBackupConfig({ ...autoBackupConfig, directory: e.target.value });
                    setPathTestResult(null);
                  }}
                  placeholder="Ví dụ: C:\\IT_Backups hoặc \\\\192.168.1.50\\backups\\itsm"
                  className="w-full pl-3 pr-20 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-800 outline-none focus:ring-2 focus:ring-purple-500 shadow-2xs"
                />
                <button
                  type="button"
                  onClick={handleCopyBackupDir}
                  className="absolute right-2 top-2 px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer border border-slate-200"
                  title="Sao chép đường dẫn này"
                >
                  <Copy className="w-3 h-3 text-slate-600" />
                  <span>{copiedBackupDir ? 'Đã chép!' : 'Copy'}</span>
                </button>
              </div>

              {/* Browse Folder Button */}
              <button
                type="button"
                onClick={handleBrowseFolder}
                className="px-3.5 py-2.5 bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 shadow-2xs"
                title="Mở hộp thoại chọn thư mục lưu trữ"
              >
                <FolderOpen className="w-4 h-4 text-purple-600" />
                <span>{isEn ? 'Browse Folder' : 'Chọn Thư Mục'}</span>
              </button>

              {/* Test Path Button */}
              <button
                type="button"
                onClick={handleTestBackupPath}
                disabled={testingPath}
                className="px-3.5 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shrink-0 shadow-2xs"
                title="Kiểm tra xem máy chủ có quyền ghi vào thư mục này không"
              >
                {testingPath ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />}
                <span>{isEn ? 'Test Path' : 'Kiểm tra đường dẫn'}</span>
              </button>
            </div>

            {pathTestResult && (
              <div className={`p-2.5 rounded-xl text-xs font-medium flex items-center gap-1.5 ${pathTestResult.success ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'}`}>
                <span>{pathTestResult.success ? '✅' : '❌'}</span>
                <span>{pathTestResult.message}</span>
              </div>
            )}
          </div>

          {/* Auto Sync New Uploads Checkbox */}
          <div className="p-3 bg-purple-50/60 rounded-xl border border-purple-100 flex items-start gap-2.5">
            <input
              type="checkbox"
              id="syncUploadsCheck"
              checked={autoBackupConfig.syncUploads}
              onChange={(e) => setAutoBackupConfig({ ...autoBackupConfig, syncUploads: e.target.checked })}
              className="mt-0.5 rounded border-purple-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
            />
            <label htmlFor="syncUploadsCheck" className="text-xs text-purple-950 cursor-pointer leading-relaxed">
              {isEn ? (
                <><strong>Auto-sync new attachments & invoices:</strong> When new PDF/Word/scanned images are uploaded, automatically replicate a copy to <code>{autoBackupConfig.directory}/uploads/</code>.</>
              ) : (
                <><strong>Tự động đồng bộ file Hóa đơn & Hợp đồng mới tải lên:</strong> Khi có file PDF/Word/Ảnh scan mới, hệ thống tự động sao chép ngay một bản lưu vào thư mục <code>{autoBackupConfig.directory}/uploads/</code>.</>
              )}
            </label>
          </div>

          {/* Save Config and Manual Trigger Buttons */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-200/80 flex-wrap gap-2">
            <div className="text-[11px] text-slate-500">
              {autoBackupConfig.lastRun ? (
                <span>{isEn ? 'Last backup: ' : 'Lần sao lưu gần nhất: '}<strong>{new Date(autoBackupConfig.lastRun).toLocaleString(isEn ? 'en-US' : 'vi-VN')}</strong></span>
              ) : (
                <span>{isEn ? 'No automated backups executed yet' : 'Chưa thực hiện sao lưu tự động lần nào'}</span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleRunBackupNowToDir}
                disabled={isBackingUp}
                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
                title="Tạo ngay một bản sao lưu và đồng bộ toàn bộ file vào thư mục lưu trữ"
              >
                {isBackingUp ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                <span>{isEn ? '⚡ Backup Now' : '⚡ Sao Lưu Ngay'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 1-CLICK FULL BACKUP (DATABASE + UPLOADS ZIP) */}
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white p-6 rounded-2xl border border-indigo-500/40 shadow-xl space-y-4 relative overflow-hidden">
        <div className="absolute -right-12 -bottom-12 w-48 h-48 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-indigo-800/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center shrink-0">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <span>{isEn ? '1-Click Full System Backup' : 'Sao Lưu Toàn Bộ Hệ Thống 1-Click'}</span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                  {isEn ? 'Database + Attachments Vault (.ZIP)' : 'Cơ Sở Dữ Liệu + Thư Mục Ảnh (.ZIP)'}
                </span>
              </h3>
              <p className="text-xs text-slate-300">
                {isEn
                  ? 'Download a compressed .ZIP archive containing clean PostgreSQL dump and complete photo/attachments directory (public/uploads)'
                  : 'Tải ngay gói file nén .ZIP chứa toàn bộ cơ sở dữ liệu (PostgreSQL Clean Dump) và toàn bộ kho ảnh hiện trạng, hóa đơn (public/uploads) về máy tính'}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3">
            <p className="text-xs text-slate-400 font-medium">{isEn ? 'Photo & Attachment Vault:' : 'Kho ảnh & Tài liệu đính kèm:'}</p>
            <p className="text-sm font-bold text-indigo-300 mt-0.5">
              {zipBackupStatus?.uploadsSizeFormatted || '35.8 MB'} ({zipBackupStatus?.uploadsCount || 20} tệp tin)
            </p>
          </div>
          <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3">
            <p className="text-xs text-slate-400 font-medium">{isEn ? 'Database:' : 'Cơ sở dữ liệu:'}</p>
            <p className="text-sm font-bold text-emerald-400 mt-0.5">
              PostgreSQL 18 (Clean SQL Dump)
            </p>
          </div>
          <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3">
            <p className="text-xs text-slate-400 font-medium">{isEn ? 'Last backup download:' : 'Lần tải sao lưu gần nhất:'}</p>
            <p className="text-sm font-bold text-amber-300 mt-0.5">
              {zipBackupStatus?.lastBackupAt
                ? new Date(zipBackupStatus.lastBackupAt).toLocaleString(isEn ? 'en-US' : 'vi-VN')
                : (isEn ? 'Ready for backup' : 'Sẵn sàng sao lưu')}
            </p>
          </div>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-slate-400">
            {isEn
              ? '💡 The .ZIP archive can be safely backed up to Google Drive, external hard drives, or used to restore the system anytime.'
              : '💡 Gói file .ZIP có thể lưu trữ an toàn định kỳ vào Google Drive, ổ cứng ngoài hoặc dùng khôi phục hệ thống khi cần.'}
          </p>

          <button
            type="button"
            onClick={handleDownloadZipBackup}
            disabled={isDownloadingZip}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold text-xs shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2 transition-all transform active:scale-95 disabled:opacity-50 cursor-pointer shrink-0"
            title="Tải gói nén .ZIP gồm toàn bộ cơ sở dữ liệu và thư mục ảnh hiện trạng"
          >
            {isDownloadingZip ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{isEn ? 'Compressing & preparing ZIP...' : 'Đang nén & chuẩn bị gói ZIP...'}</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>{isEn ? 'Download Full Backup (.ZIP)' : 'Tải Gói Sao Lưu Toàn Bộ (.ZIP)'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* COMPACT FIXED BOTTOM FLOATING BAR FOR GENERAL SETTINGS */}
      <div className="fixed bottom-3 right-6 z-50 bg-slate-900/95 backdrop-blur-md text-white py-2 px-4 rounded-full shadow-2xl border border-slate-700/80 flex items-center gap-3 transition-all hover:shadow-blue-500/20">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-xs border border-blue-400/30">
            ⚙️
          </span>
          <span className="text-xs font-medium text-slate-200 hidden sm:inline">
            {saved ? (isEn ? '✅ Settings saved' : '✅ Đã lưu cài đặt') : (isEn ? 'General Settings' : 'Cài đặt chung')}
          </span>
        </div>

        {saved && (
          <span className="text-xs text-emerald-400 font-bold flex items-center gap-1 animate-in fade-in">
            <Check className="w-3.5 h-3.5 text-emerald-400" />
            <span>{isEn ? 'Saved!' : 'Đã lưu!'}</span>
          </span>
        )}

        <button
          type="submit"
          className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-full text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer hover:scale-105 active:scale-95"
        >
          <Save className="w-3.5 h-3.5" />
          <span>Lưu Cài Đặt</span>
        </button>
      </div>
    </form>
  );
}
