'use client';

import { useLanguage } from '@/lib/i18n/context';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  QrCode,
  Check,
  X,
  Laptop,
  Building,
  MapPin,
  Calendar,
  Layers,
  Copy,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  Smartphone,
  Info,
  CheckCircle2
} from 'lucide-react';
import QRCode from 'qrcode';

interface AssetAuditCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedAssetIds?: string[];
  totalFilteredAssets?: number;
  currentCompanyFilter?: string;
  currentLocationFilter?: string;
  currentCategoryFilter?: string;
  companies?: string[];
  locations?: any[];
  categories?: any[];
  onCreated?: (campaign: any) => void;
}

export function AssetAuditCreateModal({
  isOpen,
  onClose,
  selectedAssetIds = [],
  totalFilteredAssets = 0,
  currentCompanyFilter = 'ALL',
  currentLocationFilter = 'ALL',
  currentCategoryFilter = 'ALL',
  companies = [],
  locations = [],
  categories = [],
  onCreated,
}: AssetAuditCreateModalProps) {
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

  const { language } = useLanguage();
  const txt = (vi: string, en: string, ja?: string) => {
    if (language === 'ja') return ja || en;
    if (language === 'en') return en;
    return vi;
  };
  const isEn = language === 'en';
  const [scopeType, setScopeType] = useState<'SELECTED' | 'FILTER' | 'CUSTOM'>(
    selectedAssetIds.length > 0 ? 'SELECTED' : 'FILTER'
  );

  const [title, setTitle] = useState('');
  const [companyName, setCompanyName] = useState('ALL');
  const [locationId, setLocationId] = useState('ALL');
  const [categoryId, setCategoryId] = useState('ALL');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // QR Code & Link Info
  const [scanUrl, setScanUrl] = useState('http://localhost:3000/scan');
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      const isHttps = window.location.protocol === 'https:';
      const httpsUrl = `https://${hostname}:3443/scan`;
      const currentUrl = `${window.location.origin}/scan`;
      const urlToUse = isHttps ? currentUrl : httpsUrl;
      setScanUrl(urlToUse);

      QRCode.toDataURL(urlToUse, {
        width: 220,
        margin: 1.5,
        color: { dark: '#0f172a', light: '#ffffff' },
      }).then(setQrDataUrl).catch(() => {});
    }

    // Default title
    const month = new Date().getMonth() + 1;
    const year = new Date().getFullYear();
    const quarter = Math.ceil(month / 3);
    setTitle(txt(`Kiểm kê tài sản Q${quarter}/${year} - Đợt ${new Date().getDate()}/${month}`, `Asset Audit Q${quarter}/${year} - Round ${new Date().getDate()}/${month}`, `棚卸・資産点検 Q${quarter}/${year} - 第${new Date().getDate()}/${month}回`));

    if (selectedAssetIds.length > 0) {
      setScopeType('SELECTED');
    } else {
      setScopeType('FILTER');
      setCompanyName(currentCompanyFilter);
      setLocationId(currentLocationFilter);
      setCategoryId(currentCategoryFilter);
    }
  }, [isOpen, selectedAssetIds.length, currentCompanyFilter, currentLocationFilter, currentCategoryFilter]);

  if (!isOpen) return null;

  const handleCopyLink = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(scanUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    try {
      let payload: any = {
        title: title.trim(),
        notes: notes.trim(),
      };

      if (scopeType === 'SELECTED') {
        payload.assetIds = selectedAssetIds;
      } else if (scopeType === 'FILTER') {
        payload.companyName = currentCompanyFilter;
        payload.locationId = currentLocationFilter;
        payload.categoryId = currentCategoryFilter;
      } else {
        payload.companyName = companyName;
        payload.locationId = locationId;
        payload.categoryId = categoryId;
      }

      const res = await fetch('/api/audit-campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        if (onCreated) onCreated(data.data);
        onClose();
        window.location.href = '/scan';
      } else {
        alert(data.error || txt('Lỗi khởi tạo đợt kiểm kê', 'Failed to initialize audit round', '棚卸セッションの作成に失敗しました'));
      }
    } catch (err) {
      console.error(err);
      alert(txt('Lỗi kết nối khi tạo đợt kiểm kê', 'Connection error creating audit round', '棚卸作成の通信エラー'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden animate-in zoom-in-95 duration-200 my-8">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-100 bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white ring-2 ring-white/30">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-extrabold text-base leading-snug">{txt('Khởi Tạo Đợt Kiểm Kê Tài Sản', 'Create Asset Audit Session', '新規棚卸セッション作成')}</h3>
              <p className="text-xs text-blue-100 mt-0.5">
                {txt('Thiết lập đợt kiểm kê & cấp mã QR để Kỹ thuật viên quét bằng điện thoại', 'Set up audit session & generate QR code for mobile scanner', '棚卸セッションを設定し、スマホ端末スキャン用QRコードを発行')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
            title={isEn ? 'Close' : 'Đóng'}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-12 gap-6 max-h-[80vh] overflow-y-auto">
          {/* Left Column: Form Setup (7 cols) */}
          <form onSubmit={handleSubmit} className="md:col-span-7 space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {txt('Tên Đợt Kiểm Kê (*):', 'Audit Session Name (*):', '棚卸セッション名 (*):')}
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={txt('VD: Kiểm kê định kỳ Q3/2026 - Tòa nhà A', 'e.g. Periodic Audit Q3/2026 - Building A', '例：定期棚卸 2026Q3 - 本社A棟')}
                className="w-full bg-slate-50 border border-slate-300 focus:border-blue-500 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-semibold outline-none transition-colors"
              />
            </div>

            {/* Scope Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                {txt('Phạm Vi Thiết Bị Kiểm Kê:', 'Audit Device Scope:', '棚卸対象範囲:')}
              </label>
              <div className="grid grid-cols-1 gap-2">
                {selectedAssetIds.length > 0 && (
                  <label className={`p-3 rounded-2xl border flex items-start gap-2.5 cursor-pointer transition-all ${
                    scopeType === 'SELECTED'
                      ? 'bg-blue-50/80 border-blue-500 text-blue-900 ring-1 ring-blue-400'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}>
                    <input
                      type="radio"
                      name="scopeType"
                      checked={scopeType === 'SELECTED'}
                      onChange={() => setScopeType('SELECTED')}
                      className="mt-0.5"
                    />
                    <div>
                      <span className="text-xs font-bold block">
                        {txt('Các thiết bị đang tick chọn', 'Selected assets', '選択中のデバイス')} ({selectedAssetIds.length})
                      </span>
                      <span className="text-[11px] text-slate-500">
                        {txt(`Chỉ gom ${selectedAssetIds.length} thiết bị bạn vừa chọn trong bảng vào đợt kiểm kê.`, `Only include ${selectedAssetIds.length} assets selected from the table.`, `テーブルで選択した${selectedAssetIds.length}台のみを棚卸対象にします。`)}
                      </span>
                    </div>
                  </label>
                )}

                <label className={`p-3 rounded-2xl border flex items-start gap-2.5 cursor-pointer transition-all ${
                  scopeType === 'FILTER'
                    ? 'bg-blue-50/80 border-blue-500 text-blue-900 ring-1 ring-blue-400'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}>
                  <input
                    type="radio"
                    name="scopeType"
                    checked={scopeType === 'FILTER'}
                    onChange={() => setScopeType('FILTER')}
                    className="mt-0.5"
                  />
                  <div>
                    <span className="text-xs font-bold block">
                      {txt('Toàn bộ theo bộ lọc hiện tại', 'All assets matching current filter', '現在のフィルタに一致する全デバイス')} ({totalFilteredAssets})
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {txt('Gom tất cả tài sản đang hiển thị trên màn hình Tài sản vào đợt này.', 'Include all assets currently shown in the Asset table.', '画面に表示中のすべての資産を対象にします。')}
                    </span>
                  </div>
                </label>

                <label className={`p-3 rounded-2xl border flex items-start gap-2.5 cursor-pointer transition-all ${
                  scopeType === 'CUSTOM'
                    ? 'bg-blue-50/80 border-blue-500 text-blue-900 ring-1 ring-blue-400'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}>
                  <input
                    type="radio"
                    name="scopeType"
                    checked={scopeType === 'CUSTOM'}
                    onChange={() => setScopeType('CUSTOM')}
                    className="mt-0.5"
                  />
                  <div>
                    <span className="text-xs font-bold block">{txt('Tùy chọn Công ty / Phòng ban', 'Custom Company / Department', '会社・部門で絞り込み')}</span>
                    <span className="text-[11px] text-slate-500">
                      {txt('Tự cấu hình chi tiết Công ty, Vị trí hoặc Loại máy cụ thể bên dưới.', 'Configure specific Company, Location or Category below.', '会社、設置場所、カテゴリを個別に設定します。')}
                    </span>
                  </div>
                </label>
              </div>
            </div>

            {/* Custom scope dropdowns */}
            {scopeType === 'CUSTOM' && (
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5 text-xs animate-in fade-in">
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">{txt('Công ty:', 'Company:', '会社:')}</label>
                  <select
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs"
                  >
                    <option value="ALL">{txt('-- Tất cả công ty --', '-- All companies --', '-- すべての会社 --')}</option>
                    {companies.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">{txt('Vị trí / Phòng ban:', 'Location / Department:', '設置場所 / 部署:')}</label>
                  <select
                    value={locationId}
                    onChange={(e) => setLocationId(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs"
                  >
                    <option value="ALL">{txt('-- Tất cả vị trí --', '-- All locations --', '-- すべての場所 --')}</option>
                    {locations.map((l) => (
                      <option key={l.id} value={l.id}>{l.name} ({l.building || 'Tòa nhà'})</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {txt('Ghi Chú & Mục Tiêu Đợt Kiểm Kê:', 'Notes & Audit Objectives:', '備考・点検目的:')}
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={txt('VD: Đối soát hiện trạng tài sản trước kỳ quyết toán...', 'e.g. Reconciliation before financial closing...', '例：期末決算前の実地資産確認...')}
                className="w-full bg-slate-50 border border-slate-300 focus:border-blue-500 rounded-xl p-2.5 text-xs text-slate-800 outline-none resize-none"
              />
            </div>

            <div className="pt-2 flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer"
              >{isEn ? 'Close' : 'Đóng'}</button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold rounded-xl text-xs shadow-md shadow-blue-500/30 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isSubmitting ? txt('Đang khởi tạo...', 'Creating...', '作成中...') : txt('Tạo Đợt & Bắt Đầu Quét Ngay', 'Create & Start Scanning', '作成してスキャン開始')}</span>
              </button>
            </div>
          </form>

          {/* Right Column: QR Code & Mobile Instructions (5 cols) */}
          <div className="md:col-span-5 bg-gradient-to-b from-slate-50 to-blue-50/40 p-4 rounded-2xl border border-blue-100 flex flex-col items-center justify-between text-center">
            <div className="w-full flex flex-col items-center">
              <div className="flex items-center gap-1.5 text-blue-700 font-bold text-xs mb-2">
                <Smartphone className="w-4 h-4" />
                <span>{txt('Quét Mã Mở App Điện Thoại', 'Scan QR on Mobile', 'スマホでスキャン')}</span>
              </div>

              {/* QR Image */}
              <div className="p-2.5 bg-white rounded-2xl shadow-md border border-slate-200/80 mb-3">
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt="Scan URL QR"
                    className="w-36 h-36 object-contain rounded-lg"
                  />
                ) : (
                  <div className="w-36 h-36 bg-slate-100 flex items-center justify-center rounded-lg">
                    <QrCode className="w-10 h-10 text-slate-400 animate-pulse" />
                  </div>
                )}
              </div>

              <p className="text-[11px] text-slate-600 leading-snug px-1">
                {txt('Kỹ thuật viên chỉ cần bật camera điện thoại quét mã QR ở trên để vào ngay trang Quét kiểm kê!', 'Technicians simply open mobile camera to scan QR above and start auditing!', 'スマートフォンのカメラで上記QRをスキャンして棚卸を開始できます！')}
              </p>
            </div>

            {/* URL Link copy */}
            <div className="w-full mt-3 pt-3 border-t border-slate-200/80">
              <div className="bg-white border border-slate-200 rounded-xl p-1.5 flex items-center justify-between gap-1 shadow-2xs">
                <span className="font-mono text-[10px] text-slate-600 truncate pl-1">
                  {scanUrl}
                </span>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-bold shrink-0 flex items-center gap-1 cursor-pointer transition-colors"
                  title={txt('Sao chép đường dẫn', 'Copy link', 'リンクをコピー')}
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? txt('Đã chép', 'Copied', 'コピー完了') : txt('Chép', 'Copy', 'コピー')}</span>
                </button>
              </div>

              <Link
                href="/scan"
                target="_blank"
                className="mt-2 text-[11px] text-blue-600 hover:text-blue-800 font-bold flex items-center justify-center gap-1 transition-colors"
              >
                <span>{txt('Mở màn hình Quét QR trên tab mới', 'Open Mobile Scanner in New Tab', '別タブでスキャナーを開く')}</span>
                <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
