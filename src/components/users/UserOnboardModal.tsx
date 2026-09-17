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
} from 'lucide-react';
import { CombinedHandoverModal } from './CombinedHandoverModal';

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

  useEffect(() => {
    if (isOpen) {
      setCompletedData(null);
      setSelectedAssetIds([]);
      setSelectedLicenseIds([]);
    }
  }, [isOpen]);

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
      alert('Vui lòng nhập Họ tên và Email nhân sự.');
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
        alert(json.error || 'Tiếp nhận nhân sự mới thất bại.');
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
                  Tiếp Nhận Nhân Sự & Cấp Phát Thiết Bị Mới (1-Click Onboard)
                </h3>
                <p className="text-xs text-indigo-200">
                  Tạo hồ sơ • Cấp phát gói máy tính & màn hình • Gán bản quyền • Xuất biên bản bàn giao
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
                    Tiếp Nhận Nhân Sự Thành Công!
                  </h4>
                  <p className="text-xs text-emerald-800 dark:text-emerald-300 max-w-md mx-auto">
                    Hồ sơ nhân sự <strong>{completedData.user?.fullName}</strong> đã được khởi tạo.
                    Đã cấp phát <strong>{completedData.assignedAssets?.length || 0}</strong> thiết bị và{' '}
                    <strong>{completedData.assignedLicenses?.length || 0}</strong> bản quyền phần mềm.
                  </p>
                </div>

                <div className="pt-2 flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsHandoverModalOpen(true)}
                    className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md cursor-pointer transition-transform hover:scale-102"
                  >
                    <Printer className="w-4 h-4" />
                    <span>🖨️ Xuất / In Biên Bản Bàn Giao Thiết Bị (A4)</span>
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold cursor-pointer"
                  >
                    Đóng
                  </button>
                </div>
              </div>
            ) : (
              /* Form tiếp nhận */
              <form id="onboard-form" onSubmit={handleSubmit} className="space-y-5">
                {/* Bước 1: Thông tin cơ bản */}
                <div className="space-y-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-indigo-900 dark:text-indigo-400 flex items-center gap-1.5">
                    <span>1. Thông Tin Nhân Sự Mới</span>
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Họ và tên nhân sự <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="VD: Nguyễn Văn An"
                        value={formData.fullName}
                        onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                        className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Email công vụ <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="email"
                        required
                        placeholder="VD: an.nguyen@abc.com"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Công ty thành viên
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
                        Phòng ban / Bộ phận
                      </label>
                      <input
                        type="text"
                        placeholder="VD: Khối Kinh Doanh, IT..."
                        value={formData.department}
                        onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                        className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Chức vụ / Vị trí
                      </label>
                      <input
                        type="text"
                        placeholder="VD: Chuyên viên Kinh doanh"
                        value={formData.position}
                        onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                        className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Chi nhánh / Vị trí làm việc
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

                {/* Bước 2: Chọn Combo Thiết Bị Cấp Phát từ Kho */}
                <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-indigo-900 dark:text-indigo-400 flex items-center gap-1.5">
                      <Laptop className="w-4 h-4 text-blue-600" />
                      <span>2. Cấp Phát Combo Thiết Bị Làm Việc ({selectedAssetIds.length} máy đã chọn)</span>
                    </span>
                  </div>

                  {/* Thiết bị đã chọn */}
                  {selectedAssetIds.length > 0 && (
                    <div className="space-y-1.5 p-3 bg-blue-50/50 dark:bg-blue-950/30 rounded-xl border border-blue-200 dark:border-blue-800">
                      <span className="text-[10px] font-bold text-blue-700 dark:text-blue-300 uppercase block">
                        Danh sách thiết bị sẽ xuất kho bàn giao:
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
                              title="Bỏ thiết bị này"
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
                        placeholder="Tìm kiếm máy tính, màn hình có sẵn trong kho theo tên, tag, serial..."
                        value={assetSearch}
                        onChange={(e) => setAssetSearch(e.target.value)}
                        className="w-full pl-8 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <div className="max-h-36 overflow-y-auto space-y-1 border border-slate-200 dark:border-slate-800 rounded-xl p-2 bg-slate-50/50 dark:bg-slate-800/30">
                      {filteredAvailableAssets.length === 0 ? (
                        <p className="text-[11px] text-slate-400 italic p-2 text-center">
                          Không còn thiết bị phù hợp trong kho sẵn sàng.
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
                              <span>Chọn</span>
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
                    <span>3. Cấp Phát Bản Quyền Phần Mềm Khởi Tạo ({selectedLicenseIds.length} gói đã chọn)</span>
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
                                {lic.licenseType || 'SUBSCRIPTION'} • Ghế trống:{' '}
                                {Math.max(0, (lic.totalSeats || 1) - (lic.usedSeats || 0))}
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
                Sau khi bấm tiếp nhận, bạn có thể in ngay Biên bản bàn giao.
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={onClose}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  form="onboard-form"
                  disabled={submitting}
                  className="px-5 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <span>🚀</span>}
                  <span>{submitting ? 'Đang Tiếp Nhận...' : 'Tiếp Nhận & Cấp Phát Ngay'}</span>
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
