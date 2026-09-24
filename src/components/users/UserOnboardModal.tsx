'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  UserPlus,
  Laptop,
  Key,
  Building,
  MapPin,
  CheckCircle2,
  Printer,
  Loader2,
  Search,
  Plus,
  Trash2,
  Sparkles,
  AlertTriangle,
  Check,
} from 'lucide-react';
import { CombinedHandoverModal } from './CombinedHandoverModal';
import { useLanguage } from '@/lib/i18n/context';
import { ONBOARDING_PRESET_KITS, matchKitToInventory, OnboardingPresetKit } from '@/lib/onboarding-kits';

export interface UserOnboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableAssets: any[];
  availableLicenses: any[];
  companies: string[];
  locations: any[];
  roles: any[];
  onSuccess?: () => void;
}

export const UserOnboardModal: React.FC<UserOnboardModalProps> = ({
  isOpen,
  onClose,
  availableAssets = [],
  availableLicenses = [],
  companies = [],
  locations = [],
  roles = [],
  onSuccess,
}) => {
  const { t } = useLanguage();
  const [submitting, setSubmitting] = useState(false);
  const [completedData, setCompletedData] = useState<any | null>(null);
  const [isHandoverModalOpen, setIsHandoverModalOpen] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    position: '',
    department: 'Ban Công Nghệ Thông Tin (IT / CNTT)',
    companyName: companies[0] || '',
    phone: '',
    locationId: locations[0]?.id || '',
    roleId: roles[0]?.id || '',
    password: 'User@123',
    handoverNotes: 'Cấp phát trang thiết bị & tài nguyên làm việc ban đầu cho nhân sự mới',
  });

  // Selected Equipment Bundle
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([]);
  const [assetSearch, setAssetSearch] = useState('');

  // Selected Licenses
  const [selectedLicenseIds, setSelectedLicenseIds] = useState<string[]>([]);

  // Smart Onboarding Kit State
  const [activeKitId, setActiveKitId] = useState<string | null>(null);
  const [kitMatchStatus, setKitMatchStatus] = useState<{ isFullyAvailable: boolean; missingItems: string[]; kitName: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setCompletedData(null);
      setSelectedAssetIds([]);
      setSelectedLicenseIds([]);
      setActiveKitId(null);
      setKitMatchStatus(null);
    }
  }, [isOpen]);

  const handleSelectKit = (kit: OnboardingPresetKit) => {
    setActiveKitId(kit.id);
    const match = matchKitToInventory(kit, availableAssets, availableLicenses);
    setSelectedAssetIds(match.matchedAssetIds);
    setSelectedLicenseIds(match.matchedLicenseIds);
    setKitMatchStatus({
      isFullyAvailable: match.isFullyAvailable,
      missingItems: match.missingItems,
      kitName: kit.name.vi,
    });
  };

  if (!isOpen) return null;

  const handleAddAsset = (assetId: string) => {
    if (!selectedAssetIds.includes(assetId)) {
      setSelectedAssetIds([...selectedAssetIds, assetId]);
    }
  };

  const handleRemoveAsset = (assetId: string) => {
    setSelectedAssetIds(selectedAssetIds.filter((id) => id !== assetId));
  };

  const handleToggleLicense = (licId: string) => {
    if (selectedLicenseIds.includes(licId)) {
      setSelectedLicenseIds(selectedLicenseIds.filter((id) => id !== licId));
    } else {
      setSelectedLicenseIds([...selectedLicenseIds, licId]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName.trim() || !formData.email.trim()) {
      alert(t('users.onboard.err_required', 'Vui lòng nhập Họ tên và Email nhân sự.'));
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch('/api/users/onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          assignAssetIds: selectedAssetIds,
          assignLicenseIds: selectedLicenseIds,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setCompletedData(json.data);
        onSuccess?.();
      } else {
        alert(json.error || t('users.onboard.err_fail', 'Tiếp nhận nhân sự mới thất bại.'));
      }
    } catch (err: any) {
      alert(err?.message || 'Lỗi kết nối máy chủ.');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredAvailableAssets = availableAssets.filter((a) => {
    if (selectedAssetIds.includes(a.id)) return false;
    if (!assetSearch.trim()) return true;
    const q = assetSearch.toLowerCase().trim();
    return (
      a.name?.toLowerCase().includes(q) ||
      a.assetTag?.toLowerCase().includes(q) ||
      a.serialNumber?.toLowerCase().includes(q) ||
      a.brand?.toLowerCase().includes(q)
    );
  });

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-3xl w-full max-h-[92vh] flex flex-col border border-slate-200 dark:border-slate-800 overflow-hidden animate-in zoom-in-95">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-indigo-900 via-purple-900 to-slate-900 text-white shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-indigo-500/30 border border-indigo-400/30 flex items-center justify-center text-lg">
                🚀
              </div>
              <div>
                <h3 className="font-bold text-sm text-white">
                  {t('users.onboard.modal_title', 'Tiếp Nhận Nhân Sự & Cấp Phát Thiết Bị Mới (1-Click Onboard)')}
                </h3>
                <p className="text-xs text-indigo-200">
                  {t('users.onboard.modal_subtitle', 'Tạo hồ sơ • Cấp phát gói máy tính & màn hình • Gán bản quyền • Xuất biên bản bàn giao')}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="text-white/60 hover:text-white p-1.5 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {completedData ? (
              /* Màn hình thành công */
              <div className="space-y-4 py-4 text-center animate-in fade-in">
                <div className="p-5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700 rounded-2xl space-y-2">
                  <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
                  <h4 className="font-black text-base text-emerald-950 dark:text-emerald-200">
                    {t('users.onboard.success_title', 'Tiếp Nhận Nhân Sự Thành Công!')}
                  </h4>
                  <p className="text-xs text-emerald-800 dark:text-emerald-300 max-w-md mx-auto">
                    {t('users.onboard.success_desc', 'Hồ sơ nhân sự {name} đã được khởi tạo. Đã cấp phát {assets} thiết bị và {licenses} bản quyền phần mềm.')
                      .replace('{name}', completedData.user?.fullName || '')
                      .replace('{assets}', String(completedData.assignedAssets?.length || 0))
                      .replace('{licenses}', String(completedData.assignedLicenses?.length || 0))}
                  </p>
                </div>

                <div className="pt-2 flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsHandoverModalOpen(true)}
                    className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md cursor-pointer transition-transform hover:scale-102"
                  >
                    <Printer className="w-4 h-4" />
                    <span>{t('users.onboard.export_handover_btn', '🖨️ Xuất / In Biên Bản Bàn Giao Thiết Bị (A4)')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold cursor-pointer"
                  >
                    {t('users.onboard.close', 'Đóng')}
                  </button>
                </div>
              </div>
            ) : (
              /* Form tiếp nhận */
              <form id="onboard-form" onSubmit={handleSubmit} className="space-y-5">
                {/* Bước 1: Thông tin cơ bản */}
                <div className="space-y-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-indigo-900 dark:text-indigo-400 flex items-center gap-1.5">
                    <span>{t('users.onboard.step1_title', '1. Thông Tin Nhân Sự Mới')}</span>
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        {t('users.onboard.fullname', 'Họ và tên nhân sự')} <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder={t('users.onboard.fullname_placeholder', 'VD: Nguyễn Văn An')}
                        value={formData.fullName}
                        onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                        className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        {t('users.onboard.email', 'Email công vụ')} <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="email"
                        required
                        placeholder={t('users.onboard.email_placeholder', 'VD: an.nguyen@abc.com')}
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        {t('users.onboard.company', 'Công ty thành viên')}
                      </label>
                      <select
                        value={formData.companyName}
                        onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                        className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                      >
                        {companies.map((c) => (
                          <option key={c} value={c}>
                            🏢 {c}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        {t('users.onboard.department', 'Phòng ban / Bộ phận')}
                      </label>
                      <input
                        type="text"
                        placeholder={t('users.onboard.department_placeholder', 'VD: Khối Kinh Doanh, IT...')}
                        value={formData.department}
                        onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                        className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        {t('users.onboard.position', 'Chức vụ / Vị trí')}
                      </label>
                      <input
                        type="text"
                        placeholder={t('users.onboard.position_placeholder', 'VD: Chuyên viên Kinh doanh')}
                        value={formData.position}
                        onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                        className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        {t('users.onboard.location', 'Chi nhánh / Vị trí làm việc')}
                      </label>
                      <select
                        value={formData.locationId}
                        onChange={(e) => setFormData({ ...formData, locationId: e.target.value })}
                        className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                      >
                        {locations.map((loc) => (
                          <option key={loc.id} value={loc.id}>
                            📍 {loc.name} {loc.floor ? `(Tầng ${loc.floor})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* 🌟 SMART ONBOARDING KITS (Bộ Trang Bị Mẫu Tự Động So Khớp Kho) */}
                <div className="p-3.5 bg-gradient-to-r from-indigo-50/70 via-blue-50/50 to-purple-50/60 dark:from-indigo-950/40 dark:to-slate-900 rounded-2xl border border-indigo-200/80 dark:border-indigo-800 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-indigo-600" />
                      <span>Gói Cấp Phát Mẫu (Smart Onboarding Kits) — 1-Click Tự Động Chọn Kho</span>
                    </span>
                    <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold hidden sm:inline">
                      Tự khớp máy tính & license phù hợp
                    </span>
                  </div>

                  {/* Danh sách 5 Kit Chips */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {ONBOARDING_PRESET_KITS.map((kit) => {
                      const isSelected = activeKitId === kit.id;
                      return (
                        <button
                          key={kit.id}
                          type="button"
                          onClick={() => handleSelectKit(kit)}
                          className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-indigo-600 text-white border-indigo-700 shadow-xs font-bold'
                              : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-800 hover:border-indigo-300'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm">{kit.icon}</span>
                            {isSelected && <Check className="w-3.5 h-3.5" />}
                          </div>
                          <p className="text-[11px] font-bold mt-1 line-clamp-1">{kit.name.vi}</p>
                        </button>
                      );
                    })}
                  </div>

                  {/* Trạng thái so khớp tồn kho thông minh */}
                  {kitMatchStatus && (
                    <div className={`p-3 rounded-xl border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 animate-in fade-in ${
                      kitMatchStatus.isFullyAvailable
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                        : 'bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-700'
                    }`}>
                      <div className="flex items-center gap-2">
                        {kitMatchStatus.isFullyAvailable ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                        )}
                        <span>
                          {kitMatchStatus.isFullyAvailable
                            ? `🟢 Kho hiện CÓ ĐỦ toàn bộ thiết bị & license theo tiêu chuẩn "${kitMatchStatus.kitName}". Đã tự động tích chọn sẵn sàng xuất kho!`
                            : `⚠️ Kho hiện THIẾU theo tiêu chuẩn "${kitMatchStatus.kitName}": ${kitMatchStatus.missingItems.join(', ')}.`}
                        </span>
                      </div>

                      {!kitMatchStatus.isFullyAvailable && (
                        <a
                          href={`/tickets?create=true&title=${encodeURIComponent(`[ĐỀ XUẤT MUA SẮM ONBOARDING] Tiếp nhận ${formData.fullName || 'nhân sự mới'} - Thiếu ${kitMatchStatus.missingItems.join(', ')}`)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 shrink-0 whitespace-nowrap shadow-xs"
                        >
                          <span>🛒 Đề xuất mua bổ sung</span>
                        </a>
                      )}
                    </div>
                  )}
                </div>

                {/* Bước 2: Chọn Combo Thiết Bị Cấp Phát từ Kho */}
                <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-indigo-900 dark:text-indigo-400 flex items-center gap-1.5">
                      <Laptop className="w-4 h-4 text-blue-600" />
                      <span>
                        {t('users.onboard.step2_title', '2. Cấp Phát Combo Thiết Bị Làm Việc ({count} máy đã chọn)')
                          .replace('{count}', String(selectedAssetIds.length))}
                      </span>
                    </span>
                  </div>

                  {/* Thiết bị đã chọn */}
                  {selectedAssetIds.length > 0 && (
                    <div className="space-y-1.5 p-3 bg-blue-50/50 dark:bg-blue-950/30 rounded-xl border border-blue-200 dark:border-blue-800">
                      <span className="text-[10px] font-bold text-blue-700 dark:text-blue-300 uppercase block">
                        {t('users.onboard.selected_assets_heading', 'Danh sách thiết bị sẽ xuất kho bàn giao:')}
                      </span>
                      {selectedAssetIds.map((id) => {
                        const item = availableAssets.find((a) => a.id === id);
                        if (!item) return null;
                        return (
                          <div
                            key={id}
                            className="flex items-center justify-between p-2 bg-white dark:bg-slate-900 rounded-lg border border-blue-200/60 dark:border-blue-800 text-xs"
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-indigo-900 dark:text-indigo-300">
                                [{item.assetTag}]
                              </span>
                              <span className="font-bold text-slate-800 dark:text-white">
                                {item.name}
                              </span>
                              <span className="text-[11px] text-slate-400 font-mono">
                                ({item.brand} {item.model || ''} - SN: {item.serialNumber || '—'})
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveAsset(id)}
                              className="text-rose-600 hover:text-rose-800 p-1 rounded hover:bg-rose-50 cursor-pointer"
                              title={t('users.onboard.remove_asset_tip', 'Bỏ thiết bị này')}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Chọn thêm từ kho */}
                  <div className="space-y-2">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder={t('users.onboard.search_assets_placeholder', 'Tìm kiếm máy tính, màn hình có sẵn trong kho theo tên, tag, serial...')}
                        value={assetSearch}
                        onChange={(e) => setAssetSearch(e.target.value)}
                        className="w-full pl-8 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <div className="max-h-36 overflow-y-auto space-y-1 border border-slate-200 dark:border-slate-800 rounded-xl p-2 bg-slate-50/50 dark:bg-slate-800/30">
                      {filteredAvailableAssets.length === 0 ? (
                        <p className="text-[11px] text-slate-400 italic p-2 text-center">
                          {t('users.onboard.no_assets_available', 'Không còn thiết bị phù hợp trong kho sẵn sàng.')}
                        </p>
                      ) : (
                        filteredAvailableAssets.slice(0, 10).map((asset) => (
                          <div
                            key={asset.id}
                            className="flex items-center justify-between p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 text-xs hover:border-indigo-300"
                          >
                            <div>
                              <span className="font-mono font-bold text-indigo-700 dark:text-indigo-400">
                                [{asset.assetTag}]
                              </span>{' '}
                              <span className="font-bold text-slate-800 dark:text-slate-200">
                                {asset.name}
                              </span>{' '}
                              <span className="text-[11px] text-slate-400">
                                ({asset.brand} {asset.model || ''})
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleAddAsset(asset.id)}
                              className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                            >
                              <Plus className="w-3 h-3" />
                              <span>{t('users.onboard.btn_select', 'Chọn')}</span>
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {/* Bước 3: Cấp Phát Bản Quyền Phần Mềm */}
                <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-xs font-bold uppercase tracking-wider text-indigo-900 dark:text-indigo-400 flex items-center gap-1.5">
                    <Key className="w-4 h-4 text-purple-600" />
                    <span>
                      {t('users.onboard.step3_title', '3. Cấp Phát Bản Quyền Phần Mềm Khởi Tạo ({count} gói đã chọn)')
                        .replace('{count}', String(selectedLicenseIds.length))}
                    </span>
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {availableLicenses.slice(0, 6).map((lic) => {
                      const isSelected = selectedLicenseIds.includes(lic.id);
                      return (
                        <label
                          key={lic.id}
                          className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-purple-50 dark:bg-purple-950/40 border-purple-400 text-purple-900 dark:text-purple-200'
                              : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleLicense(lic.id)}
                              className="rounded text-purple-600 focus:ring-purple-500 cursor-pointer"
                            />
                            <div className="min-w-0">
                              <span className="font-bold text-xs truncate block">{lic.name}</span>
                              <span className="text-[10px] text-slate-400">
                                {lic.licenseType || 'SUBSCRIPTION'} • {t('users.onboard.available_seats', 'License khả dụng: {seats}').replace('{seats}', String(Math.max(0, (lic.totalSeats || 1) - (lic.usedSeats || 0))))}
                              </span>
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </form>
            )}
          </div>

          {/* Footer */}
          {!completedData && (
            <div className="flex items-center justify-between px-6 py-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 shrink-0">
              <span className="text-[11px] text-slate-400">
                {t('users.onboard.footer_tip', 'Sau khi bấm tiếp nhận, bạn có thể in ngay Biên bản bàn giao.')}
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={onClose}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 cursor-pointer"
                >
                  {t('users.onboard.cancel', 'Hủy')}
                </button>
                <button
                  type="submit"
                  form="onboard-form"
                  disabled={submitting}
                  className="px-5 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <span>🚀</span>}
                  <span>{submitting ? t('users.onboard.submitting', 'Đang Tiếp Nhận...') : t('users.onboard.submit_btn', 'Tiếp Nhận & Cấp Phát Ngay')}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Combined Handover Modal Popup */}
      {completedData && isHandoverModalOpen && (
        <CombinedHandoverModal
          isOpen={isHandoverModalOpen}
          onClose={() => setIsHandoverModalOpen(false)}
          mode="ONBOARDING"
          user={completedData.user}
          executor={completedData.executor}
          assets={completedData.assignedAssets || []}
          licenses={completedData.assignedLicenses || []}
          notes={formData.handoverNotes}
        />
      )}
    </>
  );
};
