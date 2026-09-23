'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { QuickLink } from '@/components/common/QuickLink';
import { DocumentQuickPreviewModal } from '@/components/documents/document-quick-preview-modal';
import { useLanguage } from '@/lib/i18n/context';
import {
  Calendar,
  Cpu,
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  Laptop,
  Plus,
  FileText,
  Layers,
  Edit2,
  Terminal,
  Search,
  CheckCircle2,
  Check,
  Key,
  ArrowLeftRight,
  Wrench,
  DollarSign,
  Eye,
  Link as LinkIcon,
  Clock,
  QrCode,
  Edit,
  X,
  Calculator,
  RefreshCw,
  TrendingUp,
  Building,
  Barcode,
  Printer,
  Activity,
} from 'lucide-react';
import AssetHandoverModal from './asset-handover-modal';
import { calculateAssetHealth } from '@/lib/asset-health';
import {
  formatCurrency,
  formatDate,
  getRemainingTimeText,
  numberToVietnameseWords,
  numberToForeignCurrencyWords,
} from '@/lib/utils';
import {
  formatPrice,
  getCategoryFields,
  getFriendlySpecLabel,
} from './types';
import { AssetTimeline360 } from './AssetTimeline360';

export interface AssetDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  asset: any | null;
  categories?: any[];
  licenses?: any[];
  selectedCurrency?: string;
  language?: string;
  exchangeRatesMap?: Record<string, number>;
  onOpenEdit: (asset: any, tab?: 'general' | 'specs' | 'finance' | 'licenses') => void;
  onOpenTransfer: (asset: any) => void;
  onOpenMaintenance: (asset: any) => void;
  onPrintQr: (asset: any) => void;
  onOpenScript?: () => void;
  onReload?: () => void;
}

export const AssetDetailModal: React.FC<AssetDetailModalProps> = ({
  isOpen,
  onClose,
  asset: initialAsset,
  categories = [],
  licenses = [],
  selectedCurrency = 'VND',
  language = 'vi',
  exchangeRatesMap = {},
  onOpenEdit,
  onOpenTransfer,
  onOpenMaintenance,
  onPrintQr,
  onOpenScript,
  onReload,
}) => {
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

  const [selectedDetailAsset, setSelectedDetailAsset] = useState<any>(initialAsset);
  const [isDocPreviewOpen, setIsDocPreviewOpen] = useState(false);
  const [detailSoftwareSearch, setDetailSoftwareSearch] = useState('');
  const [detailSoftwareFilter, setDetailSoftwareFilter] = useState<'ALL' | 'MATCHED' | 'UNMANAGED' | 'CRACK' | 'OTHER'>('ALL');
  const [detailMaintenanceLogs, setDetailMaintenanceLogs] = useState<any[]>([]);
  const [isUpdatingDepreciation, setIsUpdatingDepreciation] = useState(false);
  const [mainTab, setMainTab] = useState<'details' | 'timeline'>('details');
  const [isHandoverModalOpen, setIsHandoverModalOpen] = useState(false);
  const [handoverMode, setHandoverMode] = useState<'HANDOVER' | 'RETURN'>('HANDOVER');

  const { language: ctxLang } = useLanguage();
  const activeLang = language || ctxLang || 'vi';
  const isEn = activeLang === 'en';
  const isJa = activeLang === 'ja';
  const isVi = activeLang === 'vi';
  const txt = (vi: string, en: string, ja: string) => isJa ? ja : (isEn ? en : vi);
  const formatDateI18n = (d?: string | null) => {
    if (!d) return '—';
    const dateObj = new Date(d);
    if (isNaN(dateObj.getTime())) return d;
    return dateObj.toLocaleDateString(isJa ? 'ja-JP' : (isEn ? 'en-US' : 'vi-VN'));
  };

  useEffect(() => {
    setSelectedDetailAsset(initialAsset);
  }, [initialAsset]);

  useEffect(() => {
    if (isOpen && selectedDetailAsset?.id) {
      setDetailMaintenanceLogs([]);
      setDetailSoftwareSearch('');
      setDetailSoftwareFilter('ALL');

      Promise.all([
        fetch(`/api/assets/${selectedDetailAsset.id}/maintenance`).then((r) => r.json()).catch(() => null),
        fetch(`/api/assets/${selectedDetailAsset.id}`).then((r) => r.json()).catch(() => null),
      ]).then(([maintData, assetData]) => {
        if (maintData?.success && Array.isArray(maintData.data)) {
          setDetailMaintenanceLogs(maintData.data);
        }
        if (assetData?.data) {
          setSelectedDetailAsset(assetData.data);
        }
      });
    }
  }, [isOpen, selectedDetailAsset?.id]);

  const convertCurrency = (amount: number, fromCurr: string, toCurr: string = 'VND') => {
    if (!amount) return 0;
    if (fromCurr === toCurr) return amount;
    const fromRate = exchangeRatesMap[fromCurr] || 1;
    const toRate = exchangeRatesMap[toCurr] || 1;
    const inVnd = amount * fromRate;
    return inVnd / toRate;
  };

  const handleUpdateDepreciationMonths = async (newMonths: number) => {
    if (!selectedDetailAsset?.id) return;
    try {
      setIsUpdatingDepreciation(true);
      const currentSpecs = (selectedDetailAsset.specs || {}) as Record<string, any>;
      const res = await fetch(`/api/assets/${selectedDetailAsset.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          specs: {
            ...currentSpecs,
            depreciationMonths: newMonths,
          },
        }),
      });
      const data = await res.json();
      if (res.ok && data.data) {
        setSelectedDetailAsset(data.data);
        onReload?.();
      }
    } catch (err) {
      console.error('Failed to update depreciation months:', err);
    } finally {
      setIsUpdatingDepreciation(false);
    }
  };

  const handleQuickCreateAndAssignLicenseForDetail = async (name: string, key?: string, type?: string) => {
    if (!selectedDetailAsset) return;
    try {
      const res = await fetch('/api/licenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          licenseKey: key ? (key.startsWith('****-') ? key : `****-${key}`) : null,
          licenseType: type === 'OEM' ? 'OEM' : type === 'Subscription' ? 'SUBSCRIPTION' : 'PERPETUAL',
          totalSeats: 1,
          assignedAssetIds: [selectedDetailAsset.id],
          notes: txt(`Tạo từ danh mục quét của máy ${selectedDetailAsset.assetTag || ''} (${selectedDetailAsset.name || ''})`, `Created from scanned software of ${selectedDetailAsset.assetTag || ''} (${selectedDetailAsset.name || ''})`, `端末 ${selectedDetailAsset.assetTag || ''} (${selectedDetailAsset.name || ''}) のスキャン一覧から作成`),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        alert(txt(`🎉 Đã thêm thành công License "${name}" vào Kho và gán cho máy tính này!`, `🎉 Successfully added license "${name}" to repository and assigned to this computer!`, `🎉 ライセンス「${name}」を保管庫に追加し、このPCに割り当てました！`));
        const resAsset = await fetch(`/api/assets/${selectedDetailAsset.id}`);
        const assetData = await resAsset.json();
        if (assetData.data) {
          setSelectedDetailAsset(assetData.data);
        }
        onReload?.();
      } else {
        alert(txt(`❌ Không thể tạo: ${data.error || 'Lỗi server'}`, `❌ Failed to create: ${data.error || 'Server error'}`, `❌ 作成に失敗しました: ${data.error || 'サーバーエラー'}`));
      }
    } catch (err: any) {
      alert(txt(`❌ Lỗi kết nối: ${err?.message || err}`, `❌ Connection error: ${err?.message || err}`, `❌ 接続エラー: ${err?.message || err}`));
    }
  };

  const handleQuickAssignLicenseForDetail = async (licenseId: string, licenseName: string) => {
    if (!selectedDetailAsset) return;
    try {
      const res = await fetch(`/api/licenses/${licenseId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assetId: selectedDetailAsset.id,
          notes: txt(`Gán trực tiếp từ danh mục phần mềm máy ${selectedDetailAsset.assetTag || ''}`, `Directly assigned from software list of ${selectedDetailAsset.assetTag || ''}`, `端末 ${selectedDetailAsset.assetTag || ''} のソフト一覧から直接割当`),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        alert(txt(`🎉 Đã gán License "${licenseName}" vào máy này thành công!`, `🎉 Successfully assigned license "${licenseName}" to this computer!`, `🎉 ライセンス「${licenseName}」をこのPCに割り当てました！`));
        const resAsset = await fetch(`/api/assets/${selectedDetailAsset.id}`);
        const assetData = await resAsset.json();
        if (assetData.data) {
          setSelectedDetailAsset(assetData.data);
        }
        onReload?.();
      } else {
        alert(txt(`❌ Không thể gán: ${data.error || 'Lỗi server'}`, `❌ Failed to assign: ${data.error || 'Server error'}`, `❌ 割り当てに失敗しました: ${data.error || 'サーバーエラー'}`));
      }
    } catch (err: any) {
      alert(txt(`❌ Lỗi kết nối: ${err?.message || err}`, `❌ Connection error: ${err?.message || err}`, `❌ 接続エラー: ${err?.message || err}`));
    }
  };

  if (!isOpen || !selectedDetailAsset) return null;

  return (
    <>
      {(() => {
const activeAssignment = selectedDetailAsset.assignments?.find((a: any) => !a.returnedAt);
        const specs = selectedDetailAsset.specs || {};
        const warrantyInfo = selectedDetailAsset.warrantyExpiry ? getRemainingTimeText(selectedDetailAsset.warrantyExpiry) : null;
        const health = selectedDetailAsset.health || calculateAssetHealth(selectedDetailAsset);

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-3 sm:p-4">
            <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full flex flex-col max-h-[92vh] border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              {/* Modal Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-t-3xl shrink-0">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2.5 py-0.5 bg-blue-500/30 text-blue-200 border border-blue-400/30 rounded-lg text-xs font-mono font-bold">
                      [{selectedDetailAsset.assetTag}]
                    </span>
                    <h3 className="font-bold text-base text-white truncate max-w-lg">
                      {selectedDetailAsset.name}
                    </h3>
                    {selectedDetailAsset.category?.name && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/10 text-white/90 border border-white/20">
                        {selectedDetailAsset.category.name}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-blue-200 flex items-center gap-2 flex-wrap">
                    <span>{selectedDetailAsset.brand} {selectedDetailAsset.model || ''}</span>
                    {selectedDetailAsset.serialNumber ? (
                      <span className="font-mono text-slate-200 bg-white/10 px-2 py-0.5 rounded border border-white/20 text-[11px] flex items-center gap-1">
                        <Barcode className="w-3 h-3 text-blue-300" />
                        <span>SN: {selectedDetailAsset.serialNumber}</span>
                      </span>
                    ) : (
                      <span className="font-mono text-amber-200 bg-amber-500/20 px-2 py-0.5 rounded border border-amber-400/30 text-[11px] font-medium">
                        SN: {txt('Chưa thiết lập', 'Not configured', '未設定')}
                      </span>
                    )}
                    {selectedDetailAsset.companyName && (
                      <span className="text-[11px] text-slate-300">
                        • 🏢 {selectedDetailAsset.companyName}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => onClose()}
                  className="text-white/70 hover:text-white p-1.5 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Tab Switcher: Thông Tin Chi Tiết vs Vòng Đời 360° */}
              <div className="flex items-center gap-2 px-6 pt-2.5 pb-2 bg-slate-100/90 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 shrink-0">
                <button
                  type="button"
                  onClick={() => setMainTab('details')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    mainTab === 'details'
                      ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-400 shadow-2xs border border-slate-200 dark:border-slate-700'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 hover:bg-white/60'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>{txt('Thông Tin Chi Tiết & Khấu Hao', 'Specifications & Financials', '仕様・減価償却詳細')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMainTab('timeline')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    mainTab === 'timeline'
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 hover:bg-white/60'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>🌟 {txt('Vòng Đời 360° (Lifecycle Journey)', '360° Lifecycle Journey', '360° ライフサイクル履歴')}</span>
                </button>
              </div>

              {/* Scrollable Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {mainTab === 'timeline' ? (
                  <AssetTimeline360
                    assetId={selectedDetailAsset.id}
                    asset={selectedDetailAsset}
                  />
                ) : (
                  <>
                    {/* 💡 Cảnh Báo Khuyến Nghị Thay Thế / Mua Mới */}
                    {health.recommendReplacement && (
                      <div className="p-4 bg-gradient-to-r from-rose-500/10 via-amber-500/10 to-orange-500/10 border-2 border-rose-300 dark:border-rose-700 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center font-black shrink-0 shadow-xs">
                            💡
                          </div>
                          <div className="space-y-0.5">
                            <h4 className="text-xs font-black uppercase tracking-wider text-rose-950 dark:text-rose-200">
                              {txt('Khuyến Nghị Thay Thế / Mua Mới Thiết Bị', 'Device Replacement Recommended', '機器更新・買い替え推奨')}
                            </h4>
                            <p className="text-[11.5px] text-rose-900 dark:text-rose-300 leading-relaxed">
                              {health.recommendationReason?.[isVi ? 'vi' : 'en'] || health.recommendationReason?.vi}
                            </p>
                          </div>
                        </div>

                        <Link
                          href={`/tickets?create=true&title=${encodeURIComponent(`[ĐỀ XUẤT THAY THẾ] Mua máy mới thay thế ${selectedDetailAsset.assetTag} (${selectedDetailAsset.name})`)}`}
                          className="px-3.5 py-2 bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-700 hover:to-amber-700 text-white rounded-xl text-xs font-black shadow-xs transition-all flex items-center gap-1.5 shrink-0 self-end sm:self-auto cursor-pointer"
                        >
                          <span>🛒 {txt('Tạo Đề Xuất Mua Mới', 'Request Replacement', '買い替え申請')}</span>
                        </Link>
                      </div>
                    )}

                    {/* 🩺 CHỈ SỐ SỨC KHỎE THIẾT BỊ (ASSET HEALTH SCORE - ITAM) */}
                    <div className="p-4 bg-gradient-to-r from-slate-50 via-indigo-50/30 to-blue-50/40 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                            <Activity className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                                {txt('Chỉ Số Sức Khỏe Thiết Bị (Health Score)', 'Asset Health Score & Reliability', '機器健全度スコア')}
                              </h4>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${health.badgeClass}`}>
                                {health.ratingLabel[isVi ? 'vi' : 'en']}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500">
                              {txt('Đánh giá thông minh dựa trên Tuổi thọ, Tình trạng, Tần suất sự cố và Tỷ lệ chi phí sửa chữa', 'Evaluated from Lifecycle, Condition, Breakdown frequency and Repair cost ratio', '耐用年数・状態・故障頻度・修理費比率に基づくスマート評価')}
                            </p>
                          </div>
                        </div>

                        {/* Điểm tổng hợp 0-100 */}
                        <div className="flex items-baseline gap-1 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
                          <span className={`text-xl sm:text-2xl font-black font-mono ${health.color}`}>
                            {health.healthScore}
                          </span>
                          <span className="text-xs font-bold text-slate-400">/ 100</span>
                        </div>
                      </div>

                      {/* 4 Tiêu chí phân rã */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                        <div className="p-2.5 bg-white rounded-xl border border-slate-100 shadow-2xs space-y-0.5">
                          <span className="text-[10px] font-bold text-slate-400 uppercase block">
                            📅 {txt('Tuổi Thọ', 'Lifecycle Age', '使用月数')}
                          </span>
                          <span className="text-xs font-black text-slate-800">
                            {health.metrics.ageMonths} {txt('tháng', 'months', 'ヶ月')}
                          </span>
                          <span className="text-[10px] text-slate-500 font-semibold block">
                            ({health.breakdown.ageScore}/30 {txt('điểm', 'pts', '点')})
                          </span>
                        </div>

                        <div className="p-2.5 bg-white rounded-xl border border-slate-100 shadow-2xs space-y-0.5">
                          <span className="text-[10px] font-bold text-slate-400 uppercase block">
                            🛠️ {txt('Tình Trạng', 'Condition', '機器状態')}
                          </span>
                          <span className="text-xs font-black text-slate-800">
                            {selectedDetailAsset.condition || 'GOOD'}
                          </span>
                          <span className="text-[10px] text-slate-500 font-semibold block">
                            ({health.breakdown.conditionScore}/25 {txt('điểm', 'pts', '点')})
                          </span>
                        </div>

                        <div className="p-2.5 bg-white rounded-xl border border-slate-100 shadow-2xs space-y-0.5">
                          <span className="text-[10px] font-bold text-slate-400 uppercase block">
                            ⚡ {txt('Sự Cố Đã Gặp', 'Breakdowns', '故障回数')}
                          </span>
                          <span className="text-xs font-black text-slate-800">
                            {health.metrics.breakdownCount} {txt('lần', 'times', '回')}
                          </span>
                          <span className="text-[10px] text-slate-500 font-semibold block">
                            ({health.breakdown.breakdownScore}/25 {txt('điểm', 'pts', '点')})
                          </span>
                        </div>

                        <div className="p-2.5 bg-white rounded-xl border border-slate-100 shadow-2xs space-y-0.5">
                          <span className="text-[10px] font-bold text-slate-400 uppercase block">
                            💰 {txt('Tỷ Lệ Sửa/Mua', 'Repair/Cost Ratio', '修理費比率')}
                          </span>
                          <span className="text-xs font-black text-slate-800 font-mono">
                            {Math.round(health.metrics.costToPurchaseRatio * 100)}%
                          </span>
                          <span className="text-[10px] text-slate-500 font-semibold block">
                            ({health.breakdown.costRatioScore}/20 {txt('điểm', 'pts', '点')})
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* 5 Overview KPI Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                  {/* Trạng thái */}
                  <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{txt('Trạng thái', 'Status', 'ステータス')}</span>
                    <div>
                      {selectedDetailAsset.status === 'AVAILABLE' && (
                        <span className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">● {txt('Sẵn sàng', 'Ready', '在庫・準備完了')}</span>
                      )}
                      {selectedDetailAsset.status === 'IN_USE' && (
                        <span className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">● {txt('Đang sử dụng', 'In Use', '利用中')}</span>
                      )}
                      {selectedDetailAsset.status === 'MAINTENANCE' && (
                        <span className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">● {txt('Đang bảo trì', 'In Maintenance', 'メンテナンス中')}</span>
                      )}
                      {selectedDetailAsset.status === 'RETIRED' && (
                        <span className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">● {txt('Đã thanh lý', 'Disposed', '廃棄・除籍済')}</span>
                      )}
                      {!['AVAILABLE', 'IN_USE', 'MAINTENANCE', 'RETIRED'].includes(selectedDetailAsset.status) && (
                        <span className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">● {selectedDetailAsset.status}</span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 font-medium">
                      {selectedDetailAsset.condition === 'NEW' && txt('Tình trạng: Mới 100%', 'Condition: Brand New (100%)', '状態: 新品 (100%)')}
                      {selectedDetailAsset.condition === 'GOOD' && txt('Tình trạng: Tốt (Hoạt động ổn định)', 'Condition: Good (Stable)', '状態: 良好 (安定稼働)')}
                      {selectedDetailAsset.condition === 'FAIR' && txt('Tình trạng: Bình thường (Khá)', 'Condition: Fair', '状態: 普通')}
                      {selectedDetailAsset.condition === 'POOR' && txt('Tình trạng: Cần bảo trì', 'Condition: Needs Maintenance', '状態: 要メンテナンス')}
                      {selectedDetailAsset.condition === 'BROKEN' && txt('Tình trạng: Hỏng hóc', 'Condition: Broken / Faulty', '状態: 故障・破損')}
                      {!['NEW', 'GOOD', 'FAIR', 'POOR', 'BROKEN'].includes(selectedDetailAsset.condition) && (selectedDetailAsset.condition ? `${txt('Tình trạng:', 'Condition:', '状態:')} ${selectedDetailAsset.condition}` : txt('Tình trạng: —', 'Condition: —', '状態: —'))}
                    </p>
                  </div>

                  {/* Cấp phát hiện tại */}
                  <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{txt('Đang cấp phát cho', 'Currently Assigned To', '現在の割り当て先')}</span>
                    {activeAssignment?.user ? (
                      <div className="space-y-0.5">
                        <QuickLink
                          type="user"
                          id={activeAssignment.user.id}
                          label={activeAssignment.user.fullName}
                          subLabel={activeAssignment.user.department}
                          icon="👤"
                          className="text-xs font-bold text-slate-900 truncate"
                        />
                      </div>
                    ) : (
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md inline-block">
                        {txt('Kho thiết bị (Sẵn sàng)', 'IT Inventory (Ready to deploy)', 'IT機器在庫 (出庫可能)')}
                      </span>
                    )}
                  </div>

                  {/* Công ty & Vị trí */}
                  <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-1.5 flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                        {txt('Công ty & Vị trí', 'Company & Location', '会社・設置場所')}
                      </span>
                      <p className="text-xs font-bold text-indigo-950 dark:text-indigo-200 whitespace-normal break-words leading-snug">
                        🏢 {selectedDetailAsset.companyName || txt('Công ty chung', 'General Company', '共通企業')}
                      </p>
                    </div>
                    <div className="space-y-1 pt-1 border-t border-slate-200/60">
                      <p className="text-[10.5px] text-slate-500 whitespace-normal break-words leading-tight flex items-start gap-1">
                        <span>📍</span>
                        <span className="font-medium">{selectedDetailAsset.location?.name || txt('Kho thiết bị IT', 'IT Storage / Inventory', 'IT機器倉庫')}</span>
                      </p>
                      {(selectedDetailAsset.vendor?.name || selectedDetailAsset.specs?.vendorName) && (
                        <p className="text-[10px] text-blue-700 dark:text-blue-400 whitespace-normal break-words leading-tight flex items-center gap-1 font-medium">
                          <span>🏷️</span>
                          <span className="truncate">{txt('NCC:', 'Vendor:', '仕入先:')} {selectedDetailAsset.vendor?.name || selectedDetailAsset.specs?.vendorName}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Chi phí mua sắm & Khấu hao tóm tắt */}
                  {(() => {
                    const rawPrice = Number(selectedDetailAsset.purchasePrice) || 0;
                    const rawCurr = (selectedDetailAsset.purchaseCurrency || 'VND').toUpperCase();
                    const convertedPrice = convertCurrency(rawPrice, rawCurr, selectedCurrency);
                    const isDual = rawPrice > 0 && rawCurr !== selectedCurrency.toUpperCase();

                    const catName = (selectedDetailAsset.category?.name || '').toLowerCase();
                    const defaultMonths =
                      catName.includes('server') || catName.includes('máy chủ') || catName.includes('switch') || catName.includes('router') || catName.includes('mạng')
                        ? 60
                        : 36;
                    const totalMonths = Number(selectedDetailAsset.specs?.depreciationMonths) || defaultMonths;
                    const pDate = selectedDetailAsset.purchaseDate ? new Date(selectedDetailAsset.purchaseDate) : (selectedDetailAsset.createdAt ? new Date(selectedDetailAsset.createdAt) : new Date());
                    const now = new Date();
                    const diffM = Math.max(0, (now.getFullYear() - pDate.getFullYear()) * 12 + (now.getMonth() - pDate.getMonth()));
                    const depRatio = Math.min(1, Math.max(0, diffM / totalMonths));
                    const remainingValue = Math.max(0, convertedPrice * (1 - depRatio));
                    const depPercent = Math.min(100, Math.round(depRatio * 100));

                    return (
                      <div className="p-3.5 bg-blue-50/60 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-2xl space-y-1 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="text-[10px] font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wider block">
                              {txt('Chi phí mua sắm', 'Purchase Cost', '購入費用')}
                            </span>
                            {rawPrice > 0 && (
                              <span className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded ${depPercent >= 100 ? 'bg-rose-100 text-rose-700' : 'bg-blue-100 text-blue-700'}`}>
                                KH {depPercent}%
                              </span>
                            )}
                          </div>
                          {rawPrice > 0 ? (
                            <div className="space-y-0.5">
                              <p className="text-sm font-black text-blue-950 dark:text-blue-200 font-mono">
                                {formatPrice(convertedPrice, selectedCurrency)}
                              </p>
                              <div className="flex items-center justify-between text-[10px] font-medium">
                                <span className="text-emerald-700 dark:text-emerald-400 font-mono">
                                  {txt('Còn lại:', 'Net Val:', '残存:')} {formatPrice(remainingValue, selectedCurrency)}
                                </span>
                              </div>
                              {isDual && (
                                <p className="text-[9.5px] font-bold text-slate-500 block font-mono">
                                  {txt('Gốc:', 'Orig:', '原価:')} {formatPrice(rawPrice, rawCurr)}
                                </p>
                              )}
                            </div>
                          ) : (
                            <p className="text-xs font-bold text-slate-400 italic">{txt('0 đ / Miễn phí', '0 / Free', '無料')}</p>
                          )}
                        </div>
                        <div className="pt-1 border-t border-blue-200/60 space-y-0.5 text-[9.5px] text-slate-500 dark:text-slate-400">
                          {selectedDetailAsset.contractNumber && (
                            <span className="block truncate">{txt('HĐ:', 'Contract:', '契約:')} {selectedDetailAsset.contractNumber}</span>
                          )}
                          {selectedDetailAsset.invoiceNumber && (
                            <span className="block truncate">{txt('HĐơn:', 'Invoice:', '請求書:')} {selectedDetailAsset.invoiceNumber}</span>
                          )}
                          {!selectedDetailAsset.contractNumber && !selectedDetailAsset.invoiceNumber && (
                            <span className="block italic text-slate-400">{txt('Không có số HĐ/HĐơn', 'No Contract / Invoice No.', '契約・請求書番号なし')}</span>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Card 5: Ngày Mua & Hạn Bảo Hành */}
                  <div className="p-3.5 bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-2xl space-y-1.5 flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider block mb-1 flex items-center justify-between">
                        <span>{txt('Ngày Mua & Bảo Hành', 'Purchase & Warranty', '購入日・保証期間')}</span>
                        <Calendar className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                      </span>
                      <div className="space-y-1 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 dark:text-slate-400 text-[10.5px]">{txt('Ngày mua:', 'Purchase Date:', '購入日:')}</span>
                          <span className="font-bold text-indigo-950 dark:text-indigo-200 font-mono">
                            {selectedDetailAsset.purchaseDate ? formatDate(selectedDetailAsset.purchaseDate) : (selectedDetailAsset.createdAt ? formatDate(selectedDetailAsset.createdAt) : '—')}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 dark:text-slate-400 text-[10.5px]">{txt('Bảo hành:', 'Warranty:', '保証:')}</span>
                          {warrantyInfo ? (
                            <span className={`text-[9.5px] font-bold px-1.5 py-0.2 rounded-full ${warrantyInfo.badgeClass}`}>
                              {warrantyInfo.text}
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400 italic">{txt('Không có BH', 'No Warranty', '保証なし')}</span>
                          )}
                        </div>
                        {selectedDetailAsset.warrantyExpiry && (
                          <div className="text-[9.5px] text-slate-500 dark:text-slate-400 text-right font-mono">
                            {txt('Hạn:', 'Exp:', '期限:')} {formatDateI18n(selectedDetailAsset.warrantyExpiry)}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="pt-1 border-t border-indigo-200/60 text-[9.5px] text-slate-400 flex items-center justify-between">
                      <span>{txt('Ngày thêm:', 'Added on:', '登録日:')}</span>
                      <span className="font-mono">{selectedDetailAsset.createdAt ? formatDate(selectedDetailAsset.createdAt) : '—'}</span>
                    </div>
                  </div>
                </div>

                {/* ======================================================================== */}
                {/* THEO DÕI KHẤU HAO RIÊNG THIẾT BỊ NÀY (INDIVIDUAL ASSET DEPRECIATION) */}
                {/* ======================================================================== */}
                {(() => {
                  const rawPrice = Number(selectedDetailAsset.purchasePrice) || 0;
                  const rawCurr = (selectedDetailAsset.purchaseCurrency || 'VND').toUpperCase();
                  const rate = selectedDetailAsset.exchangeRate || exchangeRatesMap[rawCurr] || 1;
                  const convertedPrice = convertCurrency(rawPrice, rawCurr, selectedCurrency);
                  const isDual = rawPrice > 0 && rawCurr !== selectedCurrency.toUpperCase();

                  const catName = (selectedDetailAsset.category?.name || '').toLowerCase();
                  const defaultMonths =
                    catName.includes('server') || catName.includes('máy chủ') || catName.includes('switch') || catName.includes('router') || catName.includes('mạng')
                      ? 60
                      : 36;
                  const totalMonths = Number(selectedDetailAsset.specs?.depreciationMonths) || defaultMonths;

                  const purchaseDate = selectedDetailAsset.purchaseDate
                    ? new Date(selectedDetailAsset.purchaseDate)
                    : (selectedDetailAsset.createdAt ? new Date(selectedDetailAsset.createdAt) : new Date());
                  const now = new Date();
                  const elapsedMonths = Math.max(0, (now.getFullYear() - purchaseDate.getFullYear()) * 12 + (now.getMonth() - purchaseDate.getMonth()));
                  const depRatio = Math.min(1, Math.max(0, elapsedMonths / totalMonths));
                  const accumulatedDepreciation = convertedPrice * depRatio;
                  const remainingValue = Math.max(0, convertedPrice - accumulatedDepreciation);
                  const monthlyDepreciation = totalMonths > 0 ? convertedPrice / totalMonths : 0;
                  const depPercent = Math.min(100, Math.round(depRatio * 100));
                  const remainingMonths = Math.max(0, totalMonths - elapsedMonths);

                  const projectedEndDate = new Date(purchaseDate);
                  projectedEndDate.setMonth(projectedEndDate.getMonth() + totalMonths);

                  const isFullyDepreciated = elapsedMonths >= totalMonths && rawPrice > 0;

                  return (
                    <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-5 shadow-xl border border-indigo-800/60 relative overflow-hidden">
                      {/* Background glowing accent */}
                      <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />

                      <div className="relative z-10 space-y-4">
                        {/* Header: Title + Period Selector */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
                          <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-2xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-300">
                              <Calculator className="w-5 h-5" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-extrabold text-sm text-white tracking-wide">
                                  {txt('Khấu Hao', 'Depreciation', '減価償却')}
                                </h4>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  isFullyDepreciated
                                    ? 'bg-rose-500/30 text-rose-300 border border-rose-500/40'
                                    : depPercent >= 75
                                    ? 'bg-amber-500/30 text-amber-300 border border-amber-500/40'
                                    : 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/40'
                                }`}>
                                  {isFullyDepreciated
                                    ? txt('Đã hết khấu hao', 'Fully Depreciated', '償却完了')
                                    : txt(`Đang khấu hao (${depPercent}%)`, `Depreciating (${depPercent}%)`, `償却中 (${depPercent}%)`)}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-300">
                                {txt(
                                  `Phương pháp đường thẳng (TT 45/2013/TT-BTC) • Chu kỳ ${totalMonths} tháng`,
                                  `Straight-line method • Period: ${totalMonths} months`,
                                  `定額法 • 償却期間 ${totalMonths}ヶ月`
                                )}
                              </p>
                            </div>
                          </div>

                          {/* Dynamic Period Dropdown for this individual machine */}
                          <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-2xl border border-white/15 backdrop-blur-xs">
                            <span className="text-[11px] font-bold text-slate-300 whitespace-nowrap">
                              {txt('Khung khấu hao:', 'Period:', '償却枠:')}
                            </span>
                            <select
                              value={totalMonths}
                              disabled={isUpdatingDepreciation}
                              onChange={(e) => handleUpdateDepreciationMonths(Number(e.target.value))}
                              className="bg-slate-800 text-white text-xs font-bold px-2 py-1 rounded-xl border border-white/20 outline-none cursor-pointer hover:bg-slate-700 transition-colors"
                              title={txt('Thay đổi số tháng khấu hao riêng cho thiết bị này', 'Change depreciation period for this machine', 'この端末の減価償却月数を変更')}
                            >
                              <option value={12}>12 {txt('tháng (1 năm)', 'months (1 yr)', 'ヶ月 (1年)')}</option>
                              <option value={24}>24 {txt('tháng (2 năm)', 'months (2 yrs)', 'ヶ月 (2年)')}</option>
                              <option value={36}>36 {txt('tháng (3 năm - Mặc định)', 'months (3 yrs - Default)', 'ヶ月 (3年 - 標準)')}</option>
                              <option value={48}>48 {txt('tháng (4 năm)', 'months (4 yrs)', 'ヶ月 (4年)')}</option>
                              <option value={60}>60 {txt('tháng (5 năm)', 'months (5 yrs)', 'ヶ月 (5年)')}</option>
                            </select>
                            {isUpdatingDepreciation && (
                              <RefreshCw className="w-3.5 h-3.5 text-blue-300 animate-spin" />
                            )}
                          </div>
                        </div>

                        {/* Visual Progress Bar */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-300 font-medium flex items-center gap-1.5">
                              <span>{txt('Tiến độ khấu hao theo thời gian:', 'Time Depreciation Progress:', '償却進捗状況:')}</span>
                              <strong className="text-white font-mono">{elapsedMonths} / {totalMonths} {txt('tháng', 'months', 'ヶ月')}</strong>
                              <span className="text-slate-400">({remainingMonths > 0 ? txt(`còn ${remainingMonths} tháng`, `${remainingMonths} mos left`, `残り${remainingMonths}ヶ月`) : txt('đã trích hết', 'finished', '償却完了')})</span>
                            </span>
                            <span className={`font-black font-mono text-sm ${
                              depPercent >= 100 ? 'text-rose-400' : depPercent >= 75 ? 'text-amber-400' : 'text-emerald-400'
                            }`}>
                              {depPercent}%
                            </span>
                          </div>

                          <div className="w-full bg-white/15 h-3.5 rounded-full overflow-hidden p-0.5 border border-white/20 relative shadow-inner">
                            <div
                              className={`h-full rounded-full transition-all duration-500 shadow-sm ${
                                depPercent >= 100
                                  ? 'bg-gradient-to-r from-amber-500 to-rose-500'
                                  : depPercent >= 75
                                  ? 'bg-gradient-to-r from-blue-500 to-amber-500'
                                  : 'bg-gradient-to-r from-blue-500 via-cyan-400 to-emerald-400'
                              }`}
                              style={{ width: `${Math.min(100, Math.max(depPercent, 2))}%` }}
                            />
                          </div>

                          <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono pt-0.5">
                            <span>{txt('Bắt đầu:', 'Start:', '開始:')} {formatDate(purchaseDate)}</span>
                            <span>{txt('Dự kiến hoàn thành:', 'Projected End:', '完了予定:')} {formatDate(projectedEndDate)}</span>
                          </div>
                        </div>

                        {/* 5 Financial Metric Cards for this Individual Machine */}
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                          {/* Card 1: Nguyên giá */}
                          <div className="p-3 bg-white/10 hover:bg-white/15 transition-colors rounded-2xl border border-white/10 backdrop-blur-xs">
                            <span className="text-[9.5px] font-bold text-slate-300 uppercase block tracking-wider">
                              {txt('1. Nguyên giá mua', '1. Original Cost', '1. 取得原価')}
                            </span>
                            {rawPrice > 0 ? (
                              <div className="mt-1">
                                <span className="text-sm font-black text-white font-mono block truncate">
                                  {formatPrice(convertedPrice, selectedCurrency)}
                                </span>
                                {isDual && (
                                  <span className="text-[10px] text-emerald-300 block font-mono">
                                    Gốc: {formatPrice(rawPrice, rawCurr)}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs text-slate-400 italic mt-1 block">{txt('Chưa có giá', 'No price set', '未設定')}</span>
                            )}
                          </div>

                          {/* Card 2: Mức trích / tháng */}
                          <div className="p-3 bg-white/10 hover:bg-white/15 transition-colors rounded-2xl border border-white/10 backdrop-blur-xs">
                            <span className="text-[9.5px] font-bold text-blue-300 uppercase block tracking-wider">
                              {txt('2. Trích mỗi tháng', '2. Monthly Rate', '2. 月次償却額')}
                            </span>
                            <div className="mt-1">
                              <span className="text-sm font-black text-blue-200 font-mono block truncate">
                                {rawPrice > 0 ? formatPrice(monthlyDepreciation, selectedCurrency) : '—'}
                              </span>
                              <span className="text-[10px] text-slate-300 block font-mono">
                                {totalMonths > 0 ? `1/${totalMonths} ${txt('giá trị', 'value', '額')}` : '—'}
                              </span>
                            </div>
                          </div>

                          {/* Card 3: Lũy kế đã khấu hao */}
                          <div className="p-3 bg-white/10 hover:bg-white/15 transition-colors rounded-2xl border border-white/10 backdrop-blur-xs">
                            <span className="text-[9.5px] font-bold text-amber-300 uppercase block tracking-wider">
                              {txt('3. Đã khấu hao', '3. Accumulated', '3. 累積償却額')}
                            </span>
                            <div className="mt-1">
                              <span className="text-sm font-black text-amber-300 font-mono block truncate">
                                {rawPrice > 0 ? formatPrice(accumulatedDepreciation, selectedCurrency) : '—'}
                              </span>
                              <span className="text-[10px] text-amber-200/80 block font-mono">
                                {depPercent}% {txt('nguyên giá', 'of cost', '原価比')}
                              </span>
                            </div>
                          </div>

                          {/* Card 4: Giá trị còn lại (Sổ sách) */}
                          <div className="p-3 bg-emerald-500/20 hover:bg-emerald-500/25 transition-colors rounded-2xl border border-emerald-400/30 backdrop-blur-xs">
                            <span className="text-[9.5px] font-bold text-emerald-300 uppercase block tracking-wider">
                              {txt('4. Giá trị còn lại', '4. Net Book Value', '4. 残存簿価')}
                            </span>
                            <div className="mt-1">
                              <span className="text-sm font-black text-emerald-200 font-mono block truncate">
                                {rawPrice > 0 ? formatPrice(remainingValue, selectedCurrency) : '—'}
                              </span>
                              <span className="text-[10px] text-emerald-300/90 block font-mono">
                                {Math.max(0, 100 - depPercent)}% {txt('còn lại', 'remaining', '残額')}
                              </span>
                            </div>
                          </div>

                          {/* Card 5: Tỷ giá hạch toán */}
                          <div className="col-span-2 sm:col-span-1 p-3 bg-white/10 hover:bg-white/15 transition-colors rounded-2xl border border-white/10 backdrop-blur-xs">
                            <span className="text-[9.5px] font-bold text-slate-300 uppercase block tracking-wider">
                              {txt('5. Tỷ giá / Tiền tệ', '5. FX Rate / Curr', '5. 為替・通貨')}
                            </span>
                            <div className="mt-1">
                              <span className="text-xs font-bold text-slate-200 font-mono block truncate">
                                1 {rawCurr} = {new Intl.NumberFormat(isJa ? 'ja-JP' : (isEn ? 'en-US' : 'vi-VN')).format(rate)}
                              </span>
                              <span className="text-[10px] text-slate-400 block truncate">
                                {txt('Tiền tệ xem:', 'Display:', '表示:')} {selectedCurrency}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Actionable lifecycle guidance banner */}
                        <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex items-start gap-2.5 text-xs">
                          <div className="shrink-0 mt-0.5">
                            {isFullyDepreciated ? (
                              <span className="text-base">🔔</span>
                            ) : depPercent >= 75 ? (
                              <span className="text-base">⏳</span>
                            ) : (
                              <span className="text-base">💡</span>
                            )}
                          </div>
                          <div className="space-y-0.5 flex-1">
                            {rawPrice <= 0 ? (
                              <p className="text-slate-300">
                                {txt(
                                  'Thiết bị chưa được nhập giá mua. Hãy nhấp nút "Sửa tài sản" để cập nhật giá và hóa đơn mua sắm để tự động kích hoạt số liệu khấu hao.',
                                  'This asset does not have a purchase price. Click "Edit Asset" to enter purchase price and invoice details to enable depreciation metrics.',
                                  'この機器には購入価格が設定されていません。「編集」をクリックして購入額を入力すると、減価償却データが有効になります。'
                                )}
                              </p>
                            ) : isFullyDepreciated ? (
                              <p className="text-amber-200 font-medium">
                                {txt(
                                  `Máy tính đã hoàn tất chu kỳ khấu hao kỹ thuật (${elapsedMonths}/${totalMonths} tháng). Thiết bị đã hết giá trị sổ sách kế toán. Khuyến nghị bộ phận IT lập kế hoạch kiểm định phần cứng để gia hạn sử dụng hoặc lập tờ trình thanh lý / thay thế máy mới.`,
                                  `This device has reached the end of its depreciation lifecycle (${elapsedMonths}/${totalMonths} months). Net book value is zero. IT department is recommended to evaluate performance for extension or schedule replacement/disposal.`,
                                  `この端末は償却期間(${elapsedMonths}/${totalMonths}ヶ月)を満了しました。残存簿価は0です。継続利用の点検または新規更新・除籍の計画を推奨します。`
                                )}
                              </p>
                            ) : depPercent >= 75 ? (
                              <p className="text-amber-100">
                                {txt(
                                  `Thiết bị đã trích khấu hao ${depPercent}%. Chỉ còn ${remainingMonths} tháng nữa là hết chu kỳ. Chuẩn bị kế hoạch dự trù ngân sách thiết bị thay thế cho nhân sự nếu cần.`,
                                  `Asset is ${depPercent}% depreciated with ${remainingMonths} months remaining in its lifecycle. Prepare future replacement budget if needed.`,
                                  `減価償却が${depPercent}%進行しており、残り${remainingMonths}ヶ月です。必要に応じて更新予算の準備をご検討ください。`
                                )}
                              </p>
                            ) : (
                              <p className="text-emerald-200">
                                {txt(
                                  `Thiết bị đang hoạt động ổn định trong vòng đời hữu ích (đã khấu hao ${depPercent}% sau ${elapsedMonths} tháng). Dự kiến hoàn thành khấu hao vào ngày ${formatDate(projectedEndDate)}.`,
                                  `Asset is operating within its optimal useful life (${depPercent}% depreciated over ${elapsedMonths} months). Projected depreciation completion date: ${formatDate(projectedEndDate)}.`,
                                  `資産は標準耐用期間内で正常稼働中です (${elapsedMonths}ヶ月で${depPercent}%償却)。償却完了予定日: ${formatDate(projectedEndDate)}。`
                                )}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Thông số kỹ thuật & Cấu hình chi tiết (Đồng bộ nhãn với Form Thêm/Sửa) */}
                {/* THÔNG SỐ KỸ THUẬT CHI TIẾT */}
                {(() => {
                  const rawSpecs = (selectedDetailAsset.specs || {}) as Record<string, any>;
                  const catFields = getCategoryFields(categories, selectedDetailAsset.categoryId);

                  const SPECIAL_KEYS = new Set([
                    'installedsoftware',
                    'hardwarechangealert',
                    'crackdetection',
                    'oslicense',
                    'officelicense',
                    'licensereconciliation',
                    'licensematches',
                    'unmanagedcommercialapps',
                    'licensematchalerts',
                    'billingperiodcount',
                    'billingperiodunit',
                    'paymenthistory',
                    'software',
                    'exchangerate',
                    'assignedlicenseids',
                    'depreciationmonths',
                    'lastscannedat',
                    'lastscannedhost',
                    'autoscanned',
                    'autodiscovered',
                    'source',
                  ]);

                  const normalizedEntries: Array<{ key: string; label: string; value: string }> = [];
                  const seenLabels = new Set<string>();

                  // 1. Process category defined fields first
                  for (const f of catFields) {
                    const cleanKey = f.key.toLowerCase().replace(/[^a-z0-9]/g, '');
                    if (SPECIAL_KEYS.has(cleanKey)) continue;

                    const v = rawSpecs[f.key] ?? rawSpecs[f.key.toLowerCase()] ?? rawSpecs[f.label];
                    if (v !== undefined && v !== null && typeof v !== 'object' && String(v).trim() !== '') {
                      normalizedEntries.push({
                        key: f.key,
                        label: f.label,
                        value: String(v),
                      });
                      seenLabels.add(f.label.toLowerCase());
                      seenLabels.add(f.key.toLowerCase());
                    }
                  }

                  // 2. Process extra dynamic fields from AI / Custom
                  for (const [k, v] of Object.entries(rawSpecs)) {
                    if (v === undefined || v === null || typeof v === 'object' || Array.isArray(v) || String(v).trim() === '') continue;
                    const cleanKey = k.toLowerCase().replace(/[^a-z0-9]/g, '');
                    if (SPECIAL_KEYS.has(cleanKey)) continue;

                    const label = getFriendlySpecLabel(k, selectedDetailAsset.categoryId, categories);

                    // De-duplicate synonym fields if same label or value already rendered
                    if (seenLabels.has(label.toLowerCase()) || seenLabels.has(cleanKey)) continue;

                    // If processor has same value as cpu, skip
                    if (cleanKey === 'processor' && (rawSpecs.cpu || rawSpecs.CPU)) continue;
                    if (cleanKey === 'screensize' && (rawSpecs.display || rawSpecs.screen)) continue;
                    if (cleanKey === 'ssd' && (rawSpecs.storage || rawSpecs.STORAGE)) continue;

                    normalizedEntries.push({
                      key: k,
                      label,
                      value: String(v),
                    });
                    seenLabels.add(label.toLowerCase());
                    seenLabels.add(cleanKey);
                  }

                  const hwAlert = rawSpecs.hardwareChangeAlert;
                  const crack = rawSpecs.crackDetection;
                  const osLic = rawSpecs.osLicense;
                  const officeLic = rawSpecs.officeLicense;

                  return (
                    <div className="space-y-4">
                      {/* Grid thông số phần cứng cơ bản (Không bị [object Object]) */}
                      <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                            <Cpu className="w-4 h-4 text-blue-600" />
                            <span>{txt('Thông số kỹ thuật & Cấu hình chi tiết:', 'Hardware Specifications & Details:', 'ハードウェア仕様・構成詳細:')}</span>
                          </h4>
                          <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                            {normalizedEntries.length} {txt('thông số', 'specs', '項目')}
                          </span>
                        </div>

                        {normalizedEntries.length > 0 ? (
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                            {normalizedEntries.map((item) => (
                              <div key={item.key} className="p-3 bg-white border border-slate-200 rounded-xl space-y-1 shadow-2xs hover:border-blue-300 transition-colors">
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block truncate" title={item.label}>
                                  {item.label}
                                </span>
                                <p className="text-xs font-bold text-slate-900 break-words leading-relaxed">{item.value}</p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-400 italic">{txt('Chưa nhập thông số cấu hình cụ thể.', 'No specific specifications entered.', '構成仕様は登録されていません。')}</p>
                        )}
                      </div>

                      {/* ⚠️ CẢNH BÁO THAY ĐỔI CẤU HÌNH PHẦN CỨNG (NẾU CÓ) */}
                      {hwAlert && (
                        <div className="p-4 bg-amber-50 border-2 border-amber-300 rounded-2xl space-y-1.5 animate-in fade-in">
                          <div className="flex items-center gap-2 font-black text-xs text-amber-900 uppercase tracking-wider">
                            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                            <span>{txt('Cảnh Báo Thay Đổi Linh Kiện Phần Cứng (Hardware Tamper / Change)', 'Hardware Tamper / Change Detected Alert', 'ハードウェア構成変更・改ざん警告')}</span>
                          </div>
                          <p className="text-xs font-bold text-amber-800 leading-relaxed">
                            {hwAlert}
                          </p>
                          <p className="text-[11px] text-amber-600">
                            {txt('Hệ thống phát hiện cấu hình thực tế máy trạm vừa quét có sự thay đổi so với thông số ban đầu.', 'Actual configuration scanned from workstation differs from initial baseline specs.', 'スキャンされた構成と初期登録スペックの差異が検出されました。')}
                          </p>
                        </div>
                      )}

                      {/* 🛡️ CẢNH BÁO AN NINH: PHÁT HIỆN CÔNG CỤ CRACK / BẺ KHÓA (NẾU CÓ) */}
                      {(crack?.hasSuspect || (Array.isArray(crack?.detectedTools) && crack.detectedTools.length > 0)) && (
                        <div className="p-4 bg-rose-50 border-2 border-rose-300 rounded-2xl space-y-2.5 animate-in fade-in">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 font-black text-xs text-rose-900 uppercase tracking-wider">
                              <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                              <span>{txt('Cảnh Báo An Ninh: Phát Hiện Công Cụ Bẻ Khóa / Crack / KMS', 'Security Alert: Crack / HackTool / KMS Detected', 'セキュリティ警告: 不正ツール・クラック・KMS検出')}</span>
                            </div>
                            <span className="text-[10px] font-extrabold bg-rose-200 text-rose-900 px-2.5 py-0.5 rounded-full">
                              {txt('Vi phạm chính sách', 'Policy Violation', 'ポリシー違反')}
                            </span>
                          </div>
                          {Array.isArray(crack?.detectedTools) && crack.detectedTools.length > 0 && (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-[11px] font-bold text-rose-800">{txt('Công cụ phát hiện:', 'Detected Tool:', '検出ツール:')}</span>
                              {crack.detectedTools.map((tool: string, tIdx: number) => (
                                <span key={tIdx} className="font-mono text-[11px] font-bold bg-white text-rose-700 px-2.5 py-0.5 rounded-lg border border-rose-300 shadow-2xs">
                                  {tool}
                                </span>
                              ))}
                            </div>
                          )}
                          {Array.isArray(crack?.warnings) && crack.warnings.length > 0 && (
                            <ul className="list-disc list-inside space-y-0.5 text-xs text-rose-800 font-medium">
                              {crack.warnings.map((w: string, wIdx: number) => (
                                <li key={wIdx}>{w}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )}

                      {/* 📋 KẾT QUẢ QUÉT BẢN QUYỀN OS & OFFICE */}
                      {(osLic || officeLic || rawSpecs.lastScannedAt) && (
                        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                              <ShieldCheck className="w-4 h-4 text-indigo-600" />
                              <span>{txt('Bản Quyền Hệ Điều Hành & Office (Quét Tự Động)', 'OS & Office Licenses (Auto Scanned)', 'OS & Officeライセンス (自動スキャン)')}</span>
                            </h4>
                            {rawSpecs.lastScannedAt && (
                              <span className="text-[10.5px] text-slate-500 font-medium">
                                {txt('Quét lúc:', 'Scanned at:', 'スキャン日時:')} {new Date(rawSpecs.lastScannedAt).toLocaleString(isJa ? 'ja-JP' : (isEn ? 'en-US' : 'vi-VN'))}
                              </span>
                            )}
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                            {/* Windows Card */}
                            <div className="p-3.5 bg-white border border-slate-200 rounded-xl space-y-2.5 shadow-2xs">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-slate-800 flex items-center gap-1.5">
                                  <Laptop className="w-3.5 h-3.5 text-blue-600" />
                                  <span>{txt('Hệ Điều Hành Windows', 'Windows Operating System', 'Windows OS')}</span>
                                </span>
                                {osLic?.isKmsCrack ? (
                                  <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 text-[10px] font-black">
                                    {txt('KMS Lậu / Crack', 'Pirated KMS / Crack', '不正KMS / クラック')}
                                  </span>
                                ) : osLic?.status === 'Licensed' ? (
                                  <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-black">
                                    🟢 {txt('Đã kích hoạt', 'Activated', 'ライセンス認証済')} ({osLic.channel || txt('Bản quyền', 'Licensed', '正規版')})
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-bold">
                                    {osLic?.status || txt('Chưa phát hiện', 'Not detected', '未検出')}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs font-bold text-slate-900 truncate">
                                {osLic?.name || rawSpecs.os || 'Windows OS'}
                              </p>
                              <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                                <span>{txt('Kênh:', 'Channel:', 'チャネル:')} <b className="text-slate-700">{osLic?.channel || 'OEM / Retail'}</b></span>
                                {osLic?.partialKey && (
                                  <span className="font-mono font-bold text-blue-600">Key: ****-{osLic.partialKey}</span>
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={() => handleQuickCreateAndAssignLicenseForDetail(osLic?.name || 'Windows 11 Pro', osLic?.partialKey, osLic?.channel)}
                                className="w-full py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl font-bold text-[11px] transition-colors flex items-center justify-center gap-1.5 cursor-pointer border border-blue-200"
                              >
                                <Plus className="w-3 h-3" />
                                <span>+ {txt('Đưa Windows Vào Kho License & Gán', 'Add Windows to License Repo & Assign', 'Windowsをライセンス保管庫に追加・割当')}</span>
                              </button>
                            </div>

                            {/* Office Card */}
                            <div className="p-3.5 bg-white border border-slate-200 rounded-xl space-y-2.5 shadow-2xs">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-slate-800 flex items-center gap-1.5">
                                  <FileText className="w-3.5 h-3.5 text-orange-600" />
                                  <span>Microsoft Office</span>
                                </span>
                                {officeLic?.status === 'Licensed' ? (
                                  <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-black">
                                    🟢 {officeLic.channel === 'Subscription' ? txt('O365 Bản quyền', 'O365 Licensed', 'O365サブスク') : txt('Kích hoạt', 'Activated', '認証済')}
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-bold">
                                    {officeLic?.status || txt('Chưa phát hiện', 'Not detected', '未検出')}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs font-bold text-slate-900 truncate">
                                {officeLic?.name || txt('Chưa cài đặt Office hoặc phiên bản web', 'Office not installed or web version', 'Office未インストールまたはWeb版')}
                              </p>
                              <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                                <span>{txt('Kênh:', 'Channel:', 'チャネル:')} <b className="text-slate-700">{officeLic?.channel || txt('Chưa rõ', 'Unknown', '不明')}</b></span>
                                {officeLic?.partialKey && (
                                  <span className="font-mono font-bold text-orange-600">Key: ****-{officeLic.partialKey}</span>
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={() => handleQuickCreateAndAssignLicenseForDetail(officeLic?.name || 'Microsoft Office', officeLic?.partialKey, officeLic?.channel)}
                                className="w-full py-1.5 bg-orange-50 hover:bg-orange-100 text-orange-700 rounded-xl font-bold text-[11px] transition-colors flex items-center justify-center gap-1.5 cursor-pointer border border-orange-200"
                              >
                                <Plus className="w-3 h-3" />
                                <span>+ {txt('Đưa Office Vào Kho License & Gán', 'Add Office to License Repo & Assign', 'Officeをライセンス保管庫に追加・割当')}</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* 📦 DANH MỤC PHẦN MỀM ĐANG CÀI ĐẶT TRÊN MÁY (INTERACTIVE SOFTWARE EXPLORER) */}
                {(() => {
                  const rawSpecs = (selectedDetailAsset.specs || {}) as Record<string, any>;
                  const installedSw: any[] = Array.isArray(rawSpecs.installedSoftware) ? rawSpecs.installedSoftware : [];
                  const licMatches: any[] = Array.isArray(rawSpecs.licenseMatches) ? rawSpecs.licenseMatches : [];
                  const unmanagedApps: any[] = Array.isArray(rawSpecs.unmanagedCommercialApps) ? rawSpecs.unmanagedCommercialApps : [];
                  const crack = rawSpecs.crackDetection;
                  const assignedLicIds = (selectedDetailAsset.licenseAssignments || []).map((la: any) => la.licenseId || la.license?.id);

                  // Classify each software item
                  const classifiedSoftware = installedSw.map((sw: any) => {
                    const swName = (sw.name || '').trim();
                    const isCrack =
                      crack?.detectedTools?.some((t: string) => t.toLowerCase().includes(swName.toLowerCase()) || swName.toLowerCase().includes(t.toLowerCase())) ||
                      /kms|crack|patch|activator|loader|keygen|repack/i.test(swName);

                    const matchedFromWarehouse = licenses.find((lic: any) => {
                      const licClean = lic.name.toLowerCase().replace(/[^a-z0-9]/g, '');
                      const swClean = swName.toLowerCase().replace(/[^a-z0-9]/g, '');
                      if (licClean.length < 3) return false;
                      return swClean.includes(licClean) || licClean.includes(swClean);
                    });

                    const isMatched = Boolean(matchedFromWarehouse);
                    const isAssigned = matchedFromWarehouse && assignedLicIds.includes(matchedFromWarehouse.id);

                    const isCommercialUnmanaged =
                      !isMatched &&
                      !isCrack &&
                      (unmanagedApps.some((u: any) => u.name?.toLowerCase() === swName.toLowerCase()) ||
                       /office|photoshop|autocad|adobe|illustrator|premiere|acrobat|corel|revit|solidworks|sketchup|lumion|3ds\s*max|maya|jetbrains|intellij|webstorm|pycharm|vmware|winrar|teamviewer|anydesk|camtasia|foxit/i.test(swName));

                    const category: 'CRACK' | 'MATCHED' | 'UNMANAGED' | 'OTHER' = isCrack
                      ? 'CRACK'
                      : isMatched
                      ? 'MATCHED'
                      : isCommercialUnmanaged
                      ? 'UNMANAGED'
                      : 'OTHER';

                    return {
                      ...sw,
                      category,
                      isMatched,
                      isAssigned,
                      matchedLicense: matchedFromWarehouse,
                      isCommercialUnmanaged,
                      isCrack,
                    };
                  });

                  // Filter by category and search term
                  const filteredSoftware = classifiedSoftware.filter((item) => {
                    if (detailSoftwareFilter === 'MATCHED' && !item.isMatched) return false;
                    if (detailSoftwareFilter === 'UNMANAGED' && !item.isCommercialUnmanaged) return false;
                    if (detailSoftwareFilter === 'CRACK' && !item.isCrack) return false;
                    if (detailSoftwareFilter === 'OTHER' && item.category !== 'OTHER') return false;

                    if (detailSoftwareSearch.trim()) {
                      const q = detailSoftwareSearch.toLowerCase();
                      const matchName = item.name?.toLowerCase().includes(q);
                      const matchPub = item.publisher?.toLowerCase().includes(q);
                      const matchVer = item.version?.toLowerCase().includes(q);
                      if (!matchName && !matchPub && !matchVer) return false;
                    }
                    return true;
                  });

                  const matchedCount = classifiedSoftware.filter((s) => s.isMatched).length;
                  const unmanagedCount = classifiedSoftware.filter((s) => s.isCommercialUnmanaged).length;
                  const crackCount = classifiedSoftware.filter((s) => s.isCrack).length;
                  const otherCount = classifiedSoftware.filter((s) => s.category === 'OTHER').length;

                  return (
                    <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-4 shadow-2xs">
                      {/* Header */}
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100 flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700">
                            <Layers className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                              <span>{txt('Danh Mục Phần Mềm Đang Cài Đặt Trên Máy', 'Installed Software Catalog', 'インストール済みソフトウェア一覧')}</span>
                              <span className="text-blue-600 bg-blue-50 px-2 py-0.2 rounded-full border border-blue-200 text-[10.5px]">
                                {installedSw.length} {txt('phần mềm', 'software', '件')}
                              </span>
                            </h4>
                            <p className="text-[11px] text-slate-400">
                              {txt('Kiểm kê chi tiết phần mềm quét từ máy trạm, đối soát trùng khớp kho License và cảnh báo crack', 'Detailed software inventory scanned from workstation, cross-referenced with license repository and crack alert', '端末からスキャンしたソフトウェア一覧、ライセンス照合およびクラック警告')}
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            onClose(); onOpenEdit(selectedDetailAsset, 'licenses');
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>{txt('Chỉnh Sửa & Gán Bản Quyền Toàn Diện', 'Manage & Assign Licenses', 'ライセンス一括管理・割当')}</span>
                        </button>
                      </div>

                      {installedSw.length === 0 ? (
                        <div className="text-center py-8 bg-slate-50 border border-dashed border-slate-200 rounded-xl space-y-2">
                          <p className="text-xs font-bold text-slate-700">{txt('Chưa có danh mục phần mềm quét từ máy trạm này', 'No software inventory scanned from this workstation yet', 'この端末からスキャンされたソフトウェア一覧はありません')}</p>
                          <p className="text-[11px] text-slate-400 max-w-md mx-auto">
                            {txt('Hãy chạy lệnh PowerShell (Agent PS1) trên máy này để tự động kiểm kê phần mềm đã cài đặt, đối soát license và phát hiện công cụ crack.', 'Run PowerShell agent command (PS1) on this machine to auto-audit installed software, match licenses, and detect potential cracks.', 'このPCでPowerShellエージェントを実行して、インストール済みソフトを自動収集・ライセンス突合・クラック検出を行ってください。')}
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              onClose(); onOpenScript?.();
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                          >
                            <Terminal className="w-3.5 h-3.5" />
                            <span>{txt('Xem Lệnh Quét Máy Trạm', 'View Scan Command', 'スキャンコマンドを表示')}</span>
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {/* Filter Pills & Search Box */}
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            {/* Category Filter Pills */}
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {[
                                { id: 'ALL', label: txt('Tất cả', 'All', 'すべて'), count: installedSw.length },
                                { id: 'MATCHED', label: txt('🟢 Khớp Kho License', '🟢 Matched License Repo', '🟢 保管庫と一致'), count: matchedCount },
                                { id: 'UNMANAGED', label: txt('🟠 Thương mại chưa lưu', '🟠 Unmanaged Commercial', '🟠 未登録商用'), count: unmanagedCount },
                                { id: 'CRACK', label: txt('🔴 Nghi vấn Crack', '🔴 Suspected Crack', '🔴 クラックの疑い'), count: crackCount },
                                { id: 'OTHER', label: txt('⚪ Tiện ích / Khác', '⚪ Utilities / Other', '⚪ その他'), count: otherCount },
                              ].map((tab) => (
                                <button
                                  key={tab.id}
                                  type="button"
                                  onClick={() => setDetailSoftwareFilter(tab.id as any)}
                                  className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                                    detailSoftwareFilter === tab.id
                                      ? tab.id === 'MATCHED'
                                        ? 'bg-emerald-600 text-white shadow-xs'
                                        : tab.id === 'UNMANAGED'
                                        ? 'bg-amber-600 text-white shadow-xs'
                                        : tab.id === 'CRACK'
                                        ? 'bg-rose-600 text-white shadow-xs'
                                        : 'bg-blue-600 text-white shadow-xs'
                                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                                  }`}
                                >
                                  <span>{tab.label}</span>
                                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                                    detailSoftwareFilter === tab.id ? 'bg-white/20 text-white' : 'bg-white text-slate-600'
                                  }`}>
                                    {tab.count}
                                  </span>
                                </button>
                              ))}
                            </div>

                            {/* Search Input */}
                            <div className="relative min-w-[240px] max-w-xs flex-1">
                              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                              <input
                                type="text"
                                placeholder={txt('Tìm phần mềm, nhà phát triển...', 'Search software, developer...', 'ソフトウェア、開発元を検索...')}
                                value={detailSoftwareSearch}
                                onChange={(e) => setDetailSoftwareSearch(e.target.value)}
                                className="w-full pl-8 pr-7 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                              />
                              {detailSoftwareSearch && (
                                <button
                                  type="button"
                                  onClick={() => setDetailSoftwareSearch('')}
                                  className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Software List Items */}
                          <div className="max-h-96 overflow-y-auto rounded-xl border border-slate-200 divide-y divide-slate-100">
                            {filteredSoftware.length === 0 ? (
                              <div className="p-6 text-center text-xs text-slate-400 italic">
                                {txt('Không tìm thấy phần mềm nào phù hợp với bộ lọc tìm kiếm.', 'No software matching search criteria.', '検索条件に一致するソフトウェアが見つかりません。')}
                              </div>
                            ) : (
                              filteredSoftware.map((sw: any, idx: number) => {
                                return (
                                  <div
                                    key={idx}
                                    className={`p-3 transition-colors flex items-center justify-between gap-3 ${
                                      sw.isCrack
                                        ? 'bg-rose-50/50 hover:bg-rose-50'
                                        : sw.isMatched
                                        ? 'bg-emerald-50/30 hover:bg-emerald-50/60'
                                        : sw.isCommercialUnmanaged
                                        ? 'bg-amber-50/30 hover:bg-amber-50/60'
                                        : 'hover:bg-slate-50'
                                    }`}
                                  >
                                    {/* Left Info */}
                                    <div className="space-y-1 min-w-0 flex-1">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-bold text-xs text-slate-900 break-words">
                                          {sw.name}
                                        </span>

                                        {/* Status Badge */}
                                        {sw.isCrack && (
                                          <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 border border-rose-300 text-[10px] font-black inline-flex items-center gap-1">
                                            <ShieldAlert className="w-3 h-3" />
                                            <span>{txt('Bẻ khóa / Nghi vấn Crack', 'Cracked / Suspected Crack', 'クラック / 不正ツールの疑い')}</span>
                                          </span>
                                        )}

                                        {sw.isMatched && (
                                          <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-black inline-flex items-center gap-1">
                                            <CheckCircle2 className="w-3 h-3" />
                                            <span>{txt('Khớp với Kho License', 'Matched with License Repo', 'ライセンス保管庫と一致')}</span>
                                          </span>
                                        )}

                                        {sw.isCommercialUnmanaged && (
                                          <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-bold inline-flex items-center gap-1">
                                            <span>{txt('Thương mại (Chưa lưu kho)', 'Commercial (Not in Repo)', '商用ソフト (未登録)')}</span>
                                          </span>
                                        )}

                                        {!sw.isCrack && !sw.isMatched && !sw.isCommercialUnmanaged && (
                                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-medium">
                                            {txt('Tiện ích / Khác', 'Utility / Other', 'ユーティリティ・その他')}
                                          </span>
                                        )}
                                      </div>

                                      {/* Meta: Publisher, Version, Install Date */}
                                      <div className="text-[11px] text-slate-400 flex items-center gap-2 flex-wrap">
                                        <span>🏢 {sw.publisher || txt('Nhà phát triển không xác định', 'Unknown Publisher', '開発元不明')}</span>
                                        {sw.version && <span>• v{sw.version}</span>}
                                        {sw.installDate && <span>• {txt('Ngày cài:', 'Install Date:', 'インストール日:')} {sw.installDate}</span>}
                                      </div>

                                      {/* Matched License Detail Note */}
                                      {sw.isMatched && sw.matchedLicense && (
                                        <div className="text-[11px] text-emerald-800 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200 inline-block">
                                          {txt('Trùng khớp với License:', 'Matched with License:', '一致するライセンス:')} <strong>{sw.matchedLicense.name}</strong> ({sw.matchedLicense.licenseType || txt('Vĩnh viễn', 'Perpetual', '無期限')})
                                          {' — '}{txt('Ghế:', 'Seats:', 'シート:')} <strong>{sw.matchedLicense.usedSeats || 0}/{sw.matchedLicense.totalSeats || 1}</strong>
                                        </div>
                                      )}
                                    </div>

                                    {/* Right Action Buttons */}
                                    <div className="shrink-0 flex items-center gap-2">
                                      {sw.isMatched && sw.matchedLicense && (
                                        sw.isAssigned ? (
                                          <span className="px-3 py-1 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold inline-flex items-center gap-1">
                                            <Check className="w-3.5 h-3.5" />
                                            <span>{txt('Đã gán vào máy', 'Assigned to Machine', 'このPCに割当済')}</span>
                                          </span>
                                        ) : (
                                          <button
                                            type="button"
                                            onClick={() => handleQuickAssignLicenseForDetail(sw.matchedLicense.id, sw.matchedLicense.name)}
                                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs inline-flex items-center gap-1 cursor-pointer"
                                          >
                                            <Key className="w-3.5 h-3.5" />
                                            <span>{txt('Gán License Vào Máy', 'Assign License to Machine', 'このPCにライセンス割当')}</span>
                                          </button>
                                        )
                                      )}

                                      {sw.isCommercialUnmanaged && (
                                        <button
                                          type="button"
                                          onClick={() => handleQuickCreateAndAssignLicenseForDetail(sw.name, undefined, 'COMMERCIAL')}
                                          className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs inline-flex items-center gap-1 cursor-pointer"
                                        >
                                          <Plus className="w-3.5 h-3.5" />
                                          <span>+ {txt('Đưa Vào Kho License', 'Add to License Repo', 'ライセンス保管庫に追加')}</span>
                                        </button>
                                      )}

                                      {!sw.isMatched && !sw.isCommercialUnmanaged && !sw.isCrack && (
                                        <button
                                          type="button"
                                          onClick={() => handleQuickCreateAndAssignLicenseForDetail(sw.name, undefined, 'FREEWARE')}
                                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-semibold transition-colors inline-flex items-center gap-1 cursor-pointer"
                                          title={txt('Lưu phần mềm này vào kho License để theo dõi', 'Save this software to License repo for tracking', 'このソフトウェアを保管庫に保存して追跡')}
                                        >
                                          <Plus className="w-3 h-3" />
                                          <span>{txt('Lưu License', 'Save License', 'ライセンス保存')}</span>
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* 🔄 LỊCH SỬ ĐIỀU CHUYỂN & BÀN GIAO NHÂN SỰ */}
                <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-2xs">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-700">
                        <ArrowLeftRight className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                          {txt('Lịch Sử Điều Chuyển & Bàn Giao Nhân Sự', 'Assignment & Handover History', '機器受渡・異動履歴')} ({selectedDetailAsset.assignments?.length || 0})
                        </h4>
                        <p className="text-[11px] text-slate-400">{txt('Theo dõi toàn bộ lịch sử luân chuyển thiết bị qua các nhân sự và chi nhánh', 'Track device allocation history across users and branches', 'ユーザーや支店間の機器受渡・異動履歴を追跡')}</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        onOpenTransfer(selectedDetailAsset);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
                    >
                      <ArrowLeftRight className="w-3.5 h-3.5" />
                      <span>{txt('Thực Hiện Điều Chuyển Mới', 'Transfer / Handover Asset', '新規受渡・異動を実行')}</span>
                    </button>
                  </div>

                  {(!selectedDetailAsset.assignments || selectedDetailAsset.assignments.length === 0) ? (
                    <div className="text-center py-6 bg-slate-50 border border-dashed border-slate-200 rounded-xl space-y-1">
                      <p className="text-xs font-semibold text-slate-700">{txt('Thiết bị chưa có lịch sử bàn giao nào', 'No handover history found for this device', 'この機器の受渡履歴はありません')}</p>
                      <p className="text-[11px] text-slate-400">{txt('Thiết bị đang nằm trong kho sẵn sàng hoặc chưa được ghi nhận cấp phát.', 'Device is in storage ready to deploy or has not been handed over.', '機器は倉庫で待機中か、割り当て記録がありません。')}</p>
                    </div>
                  ) : (
                    <div className="relative pl-6 space-y-3.5 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-indigo-100">
                      {selectedDetailAsset.assignments.map((asg: any, idx: number) => {
                        const isCurrent = !asg.returnedAt;

                        return (
                          <div key={asg.id} className="relative group">
                            {/* Dot Indicator */}
                            <div className={`absolute -left-6 top-1 w-3 h-3 rounded-full border-2 ${
                              isCurrent
                                ? 'bg-emerald-500 border-white ring-4 ring-emerald-100'
                                : 'bg-slate-300 border-white ring-2 ring-slate-100'
                            }`} />

                            <div className={`p-3.5 rounded-xl border transition-all space-y-1.5 ${
                              isCurrent
                                ? 'bg-indigo-50/50 border-indigo-200 shadow-2xs'
                                : 'bg-slate-50 border-slate-200/80 hover:bg-slate-100/70'
                            }`}>
                              <div className="flex items-center justify-between gap-2 flex-wrap">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-xs text-slate-900 flex items-center gap-1">
                                    <span>👤</span>
                                    <span>{asg.user?.fullName || txt('Nhân viên', 'Employee', '従業員')}</span>
                                  </span>
                                  {asg.user?.department && (
                                    <span className="text-[10px] text-slate-500 bg-white px-1.5 py-0.2 rounded border border-slate-200 font-medium">
                                      {asg.user.department}
                                    </span>
                                  )}
                                  {isCurrent ? (
                                    <span className="text-[9px] font-bold px-2 py-0.2 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                                      🟢 {txt('Đang giữ thiết bị', 'Currently Holding', '現在利用中')}
                                    </span>
                                  ) : (
                                    <span className="text-[9px] font-semibold px-2 py-0.2 rounded-full bg-slate-200 text-slate-700">
                                      {txt('Đã hoàn trả / Chuyển giao', 'Returned / Transferred', '返却済 / 移管済')}
                                    </span>
                                  )}
                                </div>

                                <div className="text-[11px] font-mono text-slate-500">
                                  <span>{new Date(asg.assignedAt).toLocaleDateString('vi-VN')}</span>
                                  <span> → </span>
                                  <span>{asg.returnedAt ? formatDateI18n(asg.returnedAt) : txt('Hiện tại', 'Present', '現在')}</span>
                                </div>
                              </div>

                              {asg.notes && (
                                <p className="text-xs text-slate-600 bg-white/80 p-2 rounded-lg border border-slate-200/60 leading-relaxed">
                                  📝 {asg.notes}
                                </p>
                              )}

                              <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                                <span>{txt('Người phụ trách bàn giao:', 'Handed Over By:', '受渡担当者:')} <b className="text-slate-600">{asg.assignedBy?.fullName || 'IT Admin'}</b></span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>


                {/* 🛠️ LỊCH SỬ SỬA CHỮA & NÂNG CẤP LINH KIỆN */}
                <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-2xs">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
                        <Wrench className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                          {txt('Lịch Sử Sửa Chữa & Nâng Cấp Linh Kiện', 'Maintenance & Upgrade History', '修理・部品アップグレード履歴')} ({detailMaintenanceLogs.length})
                        </h4>
                        <p className="text-[11px] text-slate-400">{txt('Theo dõi toàn bộ lịch sử bảo trì, thay thế linh kiện và chi phí', 'Track maintenance, spare part replacements, and costs', '保守・部品交換および発生費用の追跡')}</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        onOpenMaintenance(selectedDetailAsset);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{txt('Thêm Bản Ghi Sửa Chữa / Nâng Cấp', '+ Add Maintenance / Upgrade Log', '+ 修理・アップグレード記録追加')}</span>
                    </button>
                  </div>

                  {detailMaintenanceLogs.length === 0 ? (
                    <div className="text-center py-6 bg-slate-50 border border-dashed border-slate-200 rounded-xl space-y-1">
                      <p className="text-xs font-semibold text-slate-700">{txt('Thiết bị chưa có lịch sử sửa chữa hoặc nâng cấp nào', 'No maintenance or upgrade logs yet', '修理やアップグレードの記録はありません')}</p>
                      <p className="text-[11px] text-slate-400">{txt('Bấm nút "Thêm Bản Ghi" ở góc trên để ghi chú lần sửa chữa hoặc nâng cấp linh kiện mới.', 'Click "+ Add Log" above to record a new repair or upgrade.', '上の「+ 修理・アップグレード記録追加」ボタンから登録してください。')}</p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {detailMaintenanceLogs.map((log: any) => {
                        const typeBadge =
                          log.type === 'UPGRADE'
                            ? { label: txt('🚀 Nâng cấp', '🚀 Upgrade', '🚀 アップグレード'), bg: 'bg-emerald-50 text-emerald-800 border-emerald-200' }
                            : log.type === 'REPAIR'
                            ? { label: txt('🔧 Sửa chữa', '🔧 Repair', '🔧 修理'), bg: 'bg-rose-50 text-rose-800 border-rose-200' }
                            : log.type === 'REPLACEMENT'
                            ? { label: txt('🔄 Thay thế', '🔄 Replace', '🔄 部品交換'), bg: 'bg-blue-50 text-blue-800 border-blue-200' }
                            : log.type === 'CLEANING'
                            ? { label: txt('🧼 Vệ sinh', '🧼 Clean', '🧼 クリーニング'), bg: 'bg-teal-50 text-teal-800 border-teal-200' }
                            : { label: log.type || txt('Bảo trì', 'Maintenance', '定期点検'), bg: 'bg-slate-100 text-slate-800 border-slate-200' };

                        return (
                          <div
                            key={log.id}
                            className="p-3.5 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-xl transition-all space-y-2"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="space-y-0.5 min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${typeBadge.bg}`}>
                                    {typeBadge.label}
                                  </span>
                                  <h5 className="text-xs font-bold text-slate-900 truncate">
                                    {log.title}
                                  </h5>
                                </div>
                                {log.description && (
                                  <p className="text-xs text-slate-600 leading-relaxed pt-0.5">
                                    {log.description}
                                  </p>
                                )}
                              </div>

                              {log.cost !== null && log.cost !== undefined && Number(log.cost) > 0 && (
                                <div className="text-right shrink-0">
                                  <span className="text-xs font-black text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-lg">
                                    {formatCurrency(Number(log.cost))}
                                  </span>
                                </div>
                              )}
                            </div>

                            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-200/60 flex-wrap gap-2">
                              <div className="flex items-center gap-3">
                                <span>📅 {txt('Ngày thực hiện:', 'Date Performed:', '実施日:')} <b className="text-slate-700">{formatDateI18n(log.performedAt)}</b></span>
                                {log.performedBy && (
                                  <span>👤 {txt('Thực hiện:', 'Performed By:', '実施者:')} <b className="text-slate-700">{log.performedBy.fullName || log.performedBy.name}</b></span>
                                )}
                                {log.vendor && (
                                  <span>🏢 {txt('Đối tác:', 'Vendor:', 'ベンダー:')} <b className="text-slate-700">{log.vendor.name}</b></span>
                                )}
                              </div>

                              {log.notes && (
                                <span className="italic text-slate-500 truncate max-w-xs" title={log.notes}>
                                  📝 {log.notes}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>



                {/* Danh Sách Bản Quyền & License Đang Cài Đặt Trên Máy */}
                {(() => {
                  const assignedLics = selectedDetailAsset.licenseAssignments?.filter((la: any) => !la.revokedAt) || [];
                  return (
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                          <Key className="w-3.5 h-3.5 text-purple-600" />
                          <span>{txt('Bản quyền phần mềm cài trên máy', 'Software Licenses Assigned', '割当済みソフトウェアライセンス')} ({assignedLics.length})</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            onClose(); onOpenEdit(selectedDetailAsset, 'licenses');
                          }}
                          className="text-[11px] text-purple-600 hover:text-purple-800 font-bold hover:underline cursor-pointer"
                        >
                          + {txt('Gán thêm / Sửa bản quyền', 'Assign / Edit Licenses', 'ライセンス割当・編集')}
                        </button>
                      </div>
                      {assignedLics.length === 0 ? (
                        <p className="text-xs text-slate-400 italic bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                          {txt('Chưa có bản quyền phần mềm nào được gán vào thiết bị này.', 'No software licenses assigned to this device yet.', 'この機器に割り当てられたソフトウェアライセンスはありません。')}
                        </p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {assignedLics.map((la: any) => {
                            const lic = la.license;
                            if (!lic) return null;
                            return (
                              <div key={la.id || lic.id} className="p-2.5 bg-purple-50/50 dark:bg-purple-950/40 rounded-xl border border-purple-200 dark:border-purple-800 flex items-center justify-between gap-2">
                                <QuickLink
                                  type="license"
                                  id={lic.id}
                                  label={lic.name}
                                  icon="🔑"
                                  className="font-bold text-purple-900 dark:text-purple-300 text-xs truncate"
                                />
                                <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded text-[9.5px] font-bold shrink-0">
                                  {lic.licenseType || 'PERPETUAL'}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Thông tin Chứng từ & Tài chính Đa Tiền Tệ */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Hợp đồng / Hóa đơn & Tài chính */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      {txt('Chứng từ & Định giá mua sắm', 'Documentation & Purchase Valuation', '証憑・購入評価')}
                    </span>
                    
                    <div className="space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">{txt('Số Hợp Đồng:', 'Contract No.:', '契約番号:')}</span>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-slate-800">{selectedDetailAsset.contractNumber || '—'}</span>
                          {selectedDetailAsset.contractNumber && (
                            <button
                              type="button"
                              onClick={() => setIsDocPreviewOpen(true)}
                              className="text-blue-600 hover:text-blue-800 text-[10px] font-bold flex items-center gap-0.5 cursor-pointer"
                              title={txt('Xem nhanh hợp đồng', 'Preview contract', '契約書プレビュー')}
                            >
                              <Eye className="w-3 h-3" />
                              <span>Xem</span>
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">{txt('Số Hóa Đơn:', 'Invoice No.:', '請求書番号:')}</span>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono font-bold text-slate-800">{selectedDetailAsset.invoiceNumber || '—'}</span>
                          {(selectedDetailAsset.invoiceNumber || selectedDetailAsset.contractNumber || selectedDetailAsset.invoiceUrl) && (
                            <button
                              type="button"
                              onClick={() => setIsDocPreviewOpen(true)}
                              className="px-1.5 py-0.5 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded text-[9.5px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                              title={txt('Bấm để xem nhanh chứng từ ngay tại màn hình này', 'Preview document right on this screen', 'この画面で証憑をプレビュー')}
                            >
                              <Eye className="w-3 h-3" />
                              <span>Xem nhanh</span>
                            </button>
                          )}
                          {selectedDetailAsset.invoiceUrl && (
                            <a
                              href={selectedDetailAsset.invoiceUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 rounded text-[9.5px] font-bold flex items-center gap-1 transition-colors"
                              title={txt('Mở link hóa đơn online', 'Open online invoice link', 'オンライン請求書を開く')}
                            >
                              <LinkIcon className="w-3 h-3" />
                              <span>Link</span>
                            </a>
                          )}
                          <a
                            href={`/documents?search=${encodeURIComponent(selectedDetailAsset.invoiceNumber || selectedDetailAsset.contractNumber || selectedDetailAsset.assetTag || '')}`}
                            target="_blank"
                            rel="noreferrer"
                            className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded text-[9.5px] font-bold flex items-center gap-1 transition-colors"
                            title={txt('Tra cứu trong kho chứng từ ở tab mới', 'Search in Document Archive in new tab', '新しいタブで証憑アーカイブを開く')}
                          >
                            <span>📄 {txt('Kho hồ sơ', 'Document Archive', '証憑アーカイブ')}</span>
                          </a>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">{txt('Nhà cung cấp:', 'Vendor:', 'サプライヤー:')}</span>
                        <span className="font-semibold text-slate-800">{selectedDetailAsset.vendor ? <QuickLink type='vendor' id={selectedDetailAsset.vendor.id || selectedDetailAsset.vendor.name} label={selectedDetailAsset.vendor.name} showIcon={false} className='font-bold text-blue-700' /> : '—'}</span>
                      </div>

                      {/* Chi tiết Giá gốc & Quy đổi */}
                      {(() => {
                        const rawPrice = Number(selectedDetailAsset.purchasePrice) || 0;
                        const rawCurr = (selectedDetailAsset.purchaseCurrency || 'VND').toUpperCase();
                        const rate = selectedDetailAsset.exchangeRate || exchangeRatesMap[rawCurr] || 1;
                        const priceInVnd = rawPrice * rate;
                        const convertedPrice = convertCurrency(rawPrice, rawCurr, selectedCurrency);
                        const wordsVnd = priceInVnd > 0 ? numberToVietnameseWords(priceInVnd) : '';

                        if (rawPrice <= 0) return null;

                        return (
                          <div className="pt-2 border-t border-slate-100 space-y-2">
                            <div className="p-3 bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/80 rounded-xl space-y-1.5">
                              <div className="flex items-center justify-between">
                                <span className="text-slate-600 font-semibold">{txt('Giá hóa đơn gốc:', 'Original Invoice Price:', '元請求額:')}</span>
                                <span className="font-black text-blue-950 dark:text-blue-200 font-mono">
                                  {formatPrice(rawPrice, rawCurr)}
                                </span>
                              </div>

                              {/* Đọc số tiền bằng chữ */}
                              {wordsVnd && (
                                <p className="text-[11px] font-bold text-purple-700 dark:text-purple-300 italic pt-0.5">
                                  ✍️ {txt('Bằng chữ:', 'In words:', '金額（文字表記）:')} {wordsVnd} {!isVi && '(VND)'}
                                </p>
                              )}

                              {/* Dòng Quy đổi nhanh theo Tiền tệ ưu tiên */}
                              <div className="p-2 bg-white/90 dark:bg-slate-900 rounded-lg border border-blue-200/60 space-y-0.5">
                                <div className="flex items-center justify-between text-blue-900 dark:text-blue-200 font-semibold text-[11px]">
                                  <span>⚡ {txt('Quy đổi', 'Converted to', '換算')} [{selectedCurrency}]:</span>
                                  <span className="font-black font-mono">{formatPrice(convertedPrice, selectedCurrency)}</span>
                                </div>
                                <p className="text-[10px] text-slate-500 font-mono">
                                  ({txt('Tỷ giá hạch toán:', 'Accounting FX Rate:', '会計為替レート:')} 1 {rawCurr} = {new Intl.NumberFormat(isJa ? 'ja-JP' : (isEn ? 'en-US' : 'vi-VN')).format(rate)} VND)
                                </p>
                              </div>
                            </div>

                            {/* Ghi chú mốc thời gian quy đổi */}
                            <div className="p-2 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800 text-[10.5px] text-slate-600 dark:text-slate-400 flex items-center gap-1.5 font-medium">
                              <Clock className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                              <span>{txt('Tỷ giá tham chiếu hạch toán cập nhật: 25/08/2026 (Theo Vietcombank / Tỷ giá hạch toán)', 'Reference FX rate updated: 25/08/2026 (Vietcombank / Accounting Rate)', '会計基準為替レート更新: 2026/08/25 (Vietcombank / 会計レート)')}</span>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Ghi chú */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-1.5 flex flex-col">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{txt('Ghi chú quản lý', 'Management Notes', '管理メモ')}</span>
                    <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-xl font-normal leading-relaxed flex-1 min-h-[80px]">
                      {selectedDetailAsset.notes || txt('Không có ghi chú nào cho thiết bị này.', 'No notes recorded for this asset.', 'この機器の管理メモはありません。')}
                    </p>
                  </div>
                </div>
                  </>
                )}
              </div>

              {/* Modal Sticky Footer with Quick Actions & Edit Button */}
              <div className="flex items-center justify-between px-6 py-3.5 border-t border-slate-100 bg-slate-50/70 rounded-b-3xl shrink-0">
                {/* Left quick actions */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onOpenTransfer(selectedDetailAsset);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs"
                  >
                    <ArrowLeftRight className="w-3.5 h-3.5 text-indigo-600" />
                    <span>🔄 {txt('Điều Chuyển Nhân Sự', 'Transfer / Handover', '機器受渡・異動')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onOpenMaintenance(selectedDetailAsset);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs"
                  >
                    <Wrench className="w-3.5 h-3.5 text-amber-600" />
                    <span>🛠️ {txt('Sửa Chữa / Nâng Cấp', 'Maintenance / Upgrade', '修理・点検')} ({selectedDetailAsset._count?.maintenanceLogs || 0})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onPrintQr(selectedDetailAsset);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs"
                  >
                    <QrCode className="w-3.5 h-3.5 text-indigo-600" />
                    <span>🖨️ In Tem QR</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setHandoverMode('HANDOVER');
                      setIsHandoverModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs"
                    title={txt('In biên bản bàn giao / thu hồi thiết bị chuẩn mực A4', 'Print standard A4 handover/return form', 'A4受渡・返却書印刷')}
                  >
                    <Printer className="w-3.5 h-3.5 text-blue-600" />
                    <span>🖨️ {txt('In Biên Bản A4', 'Print Handover A4', 'In Biên Bản A4')}</span>
                  </button>
                </div>

                {/* Right buttons */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onClose(); onOpenEdit(selectedDetailAsset);
                    }}
                    className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs flex items-center gap-1.5"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    <span>✏️ {txt('Sửa Thông Tin Tài Sản', 'Edit Asset Info', '資産情報編集')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onClose()}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    {txt('Đóng (ESC)', 'Close (ESC)', '閉じる (ESC)')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

{/* ==================== MODAL: XEM NHANH CHỨNG TỪ TÀI SẢN ==================== */}
      {selectedDetailAsset && (
        <DocumentQuickPreviewModal
          isOpen={isDocPreviewOpen}
          onClose={() => setIsDocPreviewOpen(false)}
          title={`${selectedDetailAsset.assetTag || ''} - ${selectedDetailAsset.name || ''}`}
          subtitle={txt('Tài sản / Thiết bị', 'Asset / Device', '資産・機器')}
          entityType="asset"
          entityId={selectedDetailAsset.id}
          invoiceNumber={selectedDetailAsset.invoiceNumber}
          contractNumber={selectedDetailAsset.contractNumber}
          directUrl={selectedDetailAsset.invoiceUrl}
          initialDocuments={selectedDetailAsset.documents || []}
          onUpdateDirectUrl={async (newUrl) => {
            const res = await fetch(`/api/assets/${selectedDetailAsset.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ invoiceUrl: newUrl }),
            });
            if (res.ok) {
              const updated = await res.json();
              setSelectedDetailAsset(updated.data);
              onReload?.();
            }
          }}
          themeColor="blue"
        />
      )}

      {/* ==================== MODAL: IN BIÊN BẢN BÀN GIAO / THU HỒI A4 ==================== */}
      {selectedDetailAsset && isHandoverModalOpen && (
        <AssetHandoverModal
          isOpen={isHandoverModalOpen}
          onClose={() => setIsHandoverModalOpen(false)}
          asset={selectedDetailAsset}
          initialMode={handoverMode}
          previousUser={selectedDetailAsset.assignments?.find((a: any) => !a.returnedAt)?.user}
        />
      )}
    </>
  );
};
