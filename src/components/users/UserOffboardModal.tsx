'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  AlertTriangle,
  Laptop,
  Key,
  Ticket,
  UserCheck,
  CheckCircle2,
  Printer,
  Loader2,
  Building,
  Calendar,
  Barcode,
  ArrowRightLeft,
  ShieldAlert,
} from 'lucide-react';
import { CombinedHandoverModal } from './CombinedHandoverModal';

export interface UserOffboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  onSuccess?: () => void;
}

export const UserOffboardModal: React.FC<UserOffboardModalProps> = ({
  isOpen,
  onClose,
  userId,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [previewData, setPreviewData] = useState<any | null>(null);

  // Selections
  const [selectedAssetIds, setSelectedAssetIds] = useState<Set<string>>(new Set());
  const [selectedLicenseIds, setSelectedLicenseIds] = useState<Set<string>>(new Set());
  const [transferTicketToUserId, setTransferTicketToUserId] = useState<string>('');
  const [closeRemainingTickets, setCloseRemainingTickets] = useState(true);
  const [notes, setNotes] = useState('Chấm dứt hợp đồng lao động / Bàn giao tài sản đầy đủ');

  // Success summary & Handover Modal state
  const [completedSummary, setCompletedSummary] = useState<any | null>(null);
  const [isHandoverModalOpen, setIsHandoverModalOpen] = useState(false);

  useEffect(() => {
    if (isOpen && userId) {
      setLoading(true);
      setCompletedSummary(null);
      fetch(`/api/users/${userId}/offboard-preview`)
        .then((r) => r.json())
        .then((res) => {
          if (res.success && res.data) {
            setPreviewData(res.data);
            // Mặc định chọn thu hồi tất cả thiết bị và license
            const assetSet = new Set<string>((res.data.assets || []).map((a: any) => a.id));
            const licSet = new Set<string>((res.data.licenses || []).map((l: any) => l.id));
            setSelectedAssetIds(assetSet);
            setSelectedLicenseIds(licSet);

            if (res.data.itStaff?.length > 0) {
              setTransferTicketToUserId(res.data.itStaff[0].id);
            }
          }
        })
        .catch((err) => console.error('Failed to load offboard preview:', err))
        .finally(() => setLoading(false));
    }
  }, [isOpen, userId]);

  if (!isOpen) return null;

  const handleToggleAsset = (id: string) => {
    const next = new Set(selectedAssetIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedAssetIds(next);
  };

  const handleToggleLicense = (id: string) => {
    const next = new Set(selectedLicenseIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedLicenseIds(next);
  };

  const handleConfirmOffboard = async () => {
    if (!previewData?.user) return;
    try {
      setSubmitting(true);
      const res = await fetch(`/api/users/${userId}/offboard`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          revokeAssetIds: Array.from(selectedAssetIds),
          revokeLicenseIds: Array.from(selectedLicenseIds),
          transferTicketToUserId: transferTicketToUserId || null,
          closeRemainingTickets,
          notes,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setCompletedSummary(json.summary);
        onSuccess?.();
      } else {
        alert(json.error || 'Thủ tục thôi việc thất bại.');
      }
    } catch (err: any) {
      alert(err?.message || 'Lỗi kết nối khi thực hiện thôi việc.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col border border-slate-200 dark:border-slate-800 overflow-hidden animate-in zoom-in-95">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-rose-900 via-slate-900 to-slate-900 text-white shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-rose-500/20 border border-rose-400/30 flex items-center justify-center text-lg">
                🛑
              </div>
              <div>
                <h3 className="font-bold text-sm text-white">
                  Quy Trình Nghỉ Việc & Thu Hồi Tài Sản (1-Click Offboard)
                </h3>
                <p className="text-xs text-rose-200">
                  Thu hồi thiết bị về kho • Giải phóng license • Chuyển giao ticket • Khóa tài khoản
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

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {loading ? (
              <div className="py-16 text-center text-slate-400 space-y-3">
                <Loader2 className="w-7 h-7 mx-auto animate-spin text-rose-500" />
                <p className="text-xs font-semibold">Đang tra cứu tài nguyên 360° của nhân sự...</p>
              </div>
            ) : completedSummary ? (
              /* Màn hình sau khi hoàn tất thành công */
              <div className="space-y-4 py-4 animate-in fade-in">
                <div className="p-5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700 rounded-2xl text-center space-y-2">
                  <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
                  <h4 className="font-black text-base text-emerald-950 dark:text-emerald-200">
                    Đã Hoàn Tất Thủ Tục Nghỉ Việc Thành Công!
                  </h4>
                  <p className="text-xs text-emerald-800 dark:text-emerald-300 max-w-md mx-auto">
                    Tài khoản của nhân sự <strong>{completedSummary.user?.fullName}</strong> đã bị vô hiệu hóa.
                    Toàn bộ tài sản được chọn đã hoàn trả về kho sẵn sàng và license đã được giải phóng.
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">Thiết bị thu hồi</span>
                    <strong className="text-base font-black text-slate-900 dark:text-white">
                      {completedSummary.revokedAssets?.length || 0}
                    </strong>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">License giải phóng</span>
                    <strong className="text-base font-black text-slate-900 dark:text-white">
                      {completedSummary.revokedLicenses?.length || 0}
                    </strong>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">Ticket xử lý</span>
                    <strong className="text-base font-black text-slate-900 dark:text-white">
                      {completedSummary.transferredTicketsCount || 0}
                    </strong>
                  </div>
                </div>

                {/* Nút in biên bản thu hồi */}
                <div className="pt-3 flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsHandoverModalOpen(true)}
                    className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md cursor-pointer transition-transform hover:scale-102"
                  >
                    <Printer className="w-4 h-4" />
                    <span>🖨️ Xuất / In Biên Bản Thu Hồi Đa Tài Sản (A4)</span>
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
              /* Màn hình thiết lập Offboard */
              <>
                {/* Thông tin nhân sự */}
                {previewData?.user && (
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                          {previewData.user.fullName}
                        </span>
                        <span className="text-[11px] font-mono text-slate-400">
                          ({previewData.user.email})
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {previewData.user.department || 'Chưa có phòng ban'} • {previewData.user.position || 'Nhân viên'}
                        {previewData.user.companyName ? ` • 🏢 ${previewData.user.companyName}` : ''}
                      </p>
                    </div>

                    <span className="px-2.5 py-1 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-300 text-[11px] font-bold">
                      Sắp chuyển Nghỉ việc
                    </span>
                  </div>
                )}

                {/* Danh mục Thiết bị đang giữ */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Laptop className="w-4 h-4 text-blue-600" />
                      <span>1. Thiết bị phần cứng đang giữ ({previewData?.assets?.length || 0})</span>
                    </span>
                    {previewData?.assets?.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          if (selectedAssetIds.size === previewData.assets.length) {
                            setSelectedAssetIds(new Set());
                          } else {
                            setSelectedAssetIds(new Set(previewData.assets.map((a: any) => a.id)));
                          }
                        }}
                        className="text-[11px] text-indigo-600 font-bold hover:underline cursor-pointer"
                      >
                        {selectedAssetIds.size === previewData.assets.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                      </button>
                    )}
                  </div>

                  {(!previewData?.assets || previewData.assets.length === 0) ? (
                    <p className="text-xs text-slate-400 italic bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                      ✓ Nhân sự không giữ thiết bị phần cứng nào.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {previewData.assets.map((asset: any) => {
                        const isChecked = selectedAssetIds.has(asset.id);
                        return (
                          <label
                            key={asset.id}
                            className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 cursor-pointer ${
                              isChecked
                                ? 'bg-blue-50/60 dark:bg-blue-950/40 border-blue-300 dark:border-blue-700'
                                : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 opacity-60'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleToggleAsset(asset.id)}
                                className="rounded text-rose-600 focus:ring-rose-500 cursor-pointer"
                              />
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-mono text-xs font-bold text-indigo-900 dark:text-indigo-300">
                                    [{asset.assetTag}]
                                  </span>
                                  <span className="font-bold text-xs text-slate-900 dark:text-white">
                                    {asset.name}
                                  </span>
                                  {asset.serialNumber && (
                                    <span className="text-[10px] font-mono text-slate-400">
                                      SN: {asset.serialNumber}
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] text-slate-500">
                                  {asset.brand} {asset.model || ''} • Tình trạng: {asset.condition || 'GOOD'}
                                </p>
                              </div>
                            </div>

                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                              Thu hồi về kho
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Danh mục Bản quyền đang cấp */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Key className="w-4 h-4 text-purple-600" />
                      <span>2. Bản quyền phần mềm đang cấp ({previewData?.licenses?.length || 0})</span>
                    </span>
                    {previewData?.licenses?.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          if (selectedLicenseIds.size === previewData.licenses.length) {
                            setSelectedLicenseIds(new Set());
                          } else {
                            setSelectedLicenseIds(new Set(previewData.licenses.map((l: any) => l.id)));
                          }
                        }}
                        className="text-[11px] text-indigo-600 font-bold hover:underline cursor-pointer"
                      >
                        {selectedLicenseIds.size === previewData.licenses.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                      </button>
                    )}
                  </div>

                  {(!previewData?.licenses || previewData.licenses.length === 0) ? (
                    <p className="text-xs text-slate-400 italic bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                      ✓ Nhân sự không được gán bản quyền phần mềm nào.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {previewData.licenses.map((lic: any) => {
                        const isChecked = selectedLicenseIds.has(lic.id);
                        return (
                          <label
                            key={lic.id}
                            className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 cursor-pointer ${
                              isChecked
                                ? 'bg-purple-50/60 dark:bg-purple-950/40 border-purple-300 dark:border-purple-700'
                                : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 opacity-60'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleToggleLicense(lic.id)}
                                className="rounded text-purple-600 focus:ring-purple-500 cursor-pointer"
                              />
                              <div>
                                <span className="font-bold text-xs text-slate-900 dark:text-white">
                                  {lic.name}
                                </span>
                                <p className="text-[11px] text-slate-500">
                                  {lic.licenseType || 'SUBSCRIPTION'} {lic.companyName ? `• Công ty: ${lic.companyName}` : ''}
                                </p>
                              </div>
                            </div>

                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-100 text-purple-800">
                              Giải phóng ghế (+1 Quota)
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Xử lý Tickets đang mở */}
                {previewData?.tickets?.length > 0 && (
                  <div className="space-y-2 p-3.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-2xl">
                    <span className="text-xs font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                      <Ticket className="w-4 h-4 text-amber-600" />
                      <span>3. Vé hỗ trợ (Ticket) đang mở phụ trách ({previewData.tickets.length})</span>
                    </span>

                    <p className="text-[11px] text-amber-800 dark:text-amber-300">
                      Nhân sự đang phụ trách {previewData.tickets.length} ticket chưa hoàn tất. Vui lòng chọn kỹ thuật viên nhận bàn giao:
                    </p>

                    <div className="pt-1">
                      <select
                        value={transferTicketToUserId}
                        onChange={(e) => setTransferTicketToUserId(e.target.value)}
                        className="w-full text-xs font-semibold bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 rounded-xl p-2 outline-none"
                      >
                        {previewData.itStaff?.map((st: any) => (
                          <option key={st.id} value={st.id}>
                            Chuyển giao cho: {st.fullName} ({st.department || 'IT'})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {/* Ghi chú */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Ghi chú biên bản bàn giao & thu hồi:
                  </label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-rose-500"
                    placeholder="Ghi chú lý do thôi việc, bàn giao linh kiện..."
                  />
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          {!completedSummary && (
            <div className="flex items-center justify-between px-6 py-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 shrink-0">
              <span className="text-[11px] text-slate-400">
                Nhân sự sẽ bị khóa đăng nhập ngay sau khi xác nhận.
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
                  type="button"
                  disabled={submitting}
                  onClick={handleConfirmOffboard}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <span>🛑</span>}
                  <span>{submitting ? 'Đang Xử Lý Thu Hồi...' : 'Xác Nhận Nghỉ Việc & Thu Hồi'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Combined Handover Modal Popup */}
      {completedSummary && isHandoverModalOpen && (
        <CombinedHandoverModal
          isOpen={isHandoverModalOpen}
          onClose={() => setIsHandoverModalOpen(false)}
          mode="OFFBOARDING"
          user={completedSummary.user}
          executor={completedSummary.executor}
          assets={completedSummary.revokedAssets || []}
          licenses={completedSummary.revokedLicenses || []}
          notes={completedSummary.notes}
        />
      )}
    </>
  );
};
