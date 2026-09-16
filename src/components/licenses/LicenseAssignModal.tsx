'use client';

import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Search,
  Check,
  RotateCcw,
  Loader2,
  AlertTriangle,
  X,
} from 'lucide-react';
import { useLanguage } from '@/lib/i18n/context';
import { QuickLink } from '@/components/common/QuickLink';
import { formatDate } from '@/lib/utils';

export interface LicenseAssignModalProps {
  isOpen: boolean;
  onClose: () => void;
  license: any;
  users?: any[];
  assets?: any[];
  onSuccess?: () => void;
}

export function LicenseAssignModal({
  isOpen,
  onClose,
  license: activeLicense,
  users = [],
  assets = [],
  onSuccess,
}: LicenseAssignModalProps) {
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

  const [assignUserId, setAssignUserId] = useState('');
  const [assignAssetId, setAssignAssetId] = useState('');
  const [assignNotes, setAssignNotes] = useState('');
  const [assignUserSearch, setAssignUserSearch] = useState('');
  const [assignAssetSearch, setAssignAssetSearch] = useState('');
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [isSubmittingAssign, setIsSubmittingAssign] = useState(false);
  const [revokingAssignmentId, setRevokingAssignmentId] = useState<string | null>(null);

  if (!isOpen || !activeLicense) return null;

  const batches = activeLicense.batches || [];
  const hasBatches = batches.length > 1;

  const assignments = activeLicense.assignments?.filter((a: any) => !a.revokedAt) || [];
  const used = assignments.length;
  const total = activeLicense.totalSeats || 1;
  const remaining = Math.max(0, total - used);

  const setIsAssignModalOpen = (open: boolean) => {
    if (!open) onClose();
  };

  const handleAssignSeat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeLicense) return;
    if (!assignUserId && !assignAssetId) {
      alert('Vui lòng chọn ít nhất 1 Nhân sự hoặc 1 Thiết bị để cấp phát seat!');
      return;
    }

    setIsSubmittingAssign(true);
    try {
      const res = await fetch(`/api/licenses/${activeLicense.id}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: assignUserId || null,
          assetId: assignAssetId || null,
          notes: assignNotes,
          batchId: selectedBatchId || undefined,
        }),
      });

      if (res.ok) {
        setAssignUserId('');
        setAssignAssetId('');
        setAssignNotes('');
        if (onSuccess) onSuccess();
      } else {
        const err = await res.json();
        alert(err.error || 'Cấp phát license thất bại');
      }
    } catch {
      alert('Lỗi kết nối khi cấp phát');
    } finally {
      setIsSubmittingAssign(false);
    }
  };

  const handleRevokeSeat = async (assignmentId: string) => {
    if (!activeLicense || !assignmentId) return;
    if (!confirm('Bạn có chắc chắn muốn thu hồi bản quyền của người dùng/thiết bị này?')) return;

    setRevokingAssignmentId(assignmentId);
    try {
      const res = await fetch(`/api/licenses/${activeLicense.id}/revoke`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignmentId }),
      });

      if (res.ok) {
        if (onSuccess) onSuccess();
      } else {
        const err = await res.json();
        alert(err.error || 'Thu hồi thất bại');
      }
    } catch {
      alert('Lỗi kết nối khi thu hồi');
    } finally {
      setRevokingAssignmentId(null);
    }
  };

  return (

          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
            <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-5xl w-full flex flex-col max-h-[92vh] border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-900 text-white rounded-t-3xl shrink-0">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="p-1.5 bg-purple-600 text-white rounded-xl shadow-xs shrink-0">
                    <Users className="w-4 h-4" />
                  </span>
                  <div>
                    <h3 className="font-extrabold text-sm text-white">
                      Phân Bổ & Thu Hồi Seats: {activeLicense.name}
                    </h3>
                    <p className="text-xs text-slate-400">
                      Đã cấp: <strong className="text-white">{used}/{total}</strong> seats • Còn trống:{' '}
                      <strong className="text-emerald-400">{remaining}</strong> seats
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAssignModalOpen(false)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Split-View Body */}
              <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left Column (5/12): Form cấp phát mới */}
                <div className="lg:col-span-5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl p-4.5 space-y-3.5 flex flex-col justify-between">
                  <div className="space-y-3">
                    <h4 className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-200 dark:border-slate-700 pb-2">
                      <UserPlus className="w-3.5 h-3.5 text-purple-600" />
                      <span>Cấp phát seat cho người dùng / máy mới:</span>
                    </h4>

                    {/* Cảnh báo nếu cấp vượt hạn mức nhưng VẪN CHO PHÉP CẤP */}
                    {used >= total && (
                      <div className="p-3 bg-amber-50/90 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 rounded-2xl text-xs text-amber-900 dark:text-amber-200 font-medium space-y-1 animate-in fade-in">
                        <p className="font-bold flex items-center gap-1.5 text-amber-800 dark:text-amber-300">
                          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                          <span>Cảnh báo: Bản quyền đã đạt/vượt hạn mức ({used}/{total} Seats)</span>
                        </p>
                        <p className="text-[11px] text-amber-700 dark:text-amber-300">
                          💡 Hệ thống vẫn cho phép bạn cấp phát thêm seat (Over-allocated) và tự động ghi nhận cảnh báo trên hệ thống.
                        </p>
                      </div>
                    )}

                    <form id="assign-seat-form" onSubmit={handleAssignSeat} className="space-y-3">
                      {/* Lựa chọn Đợt mua cấp phát (nếu có nhiều đợt) */}
                      {hasBatches && (
                        <div className="space-y-1.5 p-3 bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-2xl">
                          <label className="text-xs font-bold text-indigo-950 dark:text-indigo-200 flex items-center justify-between">
                            <span className="flex items-center gap-1.5">
                              <span>📦 Chọn Đợt Cấp Phát:</span>
                            </span>
                            <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-normal">
                              ({batches.length} đợt mua khả dụng)
                            </span>
                          </label>
                          <select
                            value={selectedBatchId}
                            onChange={(e) => setSelectedBatchId(e.target.value)}
                            className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs cursor-pointer"
                          >
                            <option value="">✨ Tự động (FIFO) - Ưu tiên đợt sắp hết hạn trước</option>
                            {batches.map((b: any, idx: number) => {
                              const bActive = b.assignments?.filter((a: any) => !a.revokedAt)?.length || 0;
                              const bTotal = b.totalSeats || 1;
                              const bRem = Math.max(0, bTotal - bActive);
                              const expStr = b.expiryDate ? formatDate(b.expiryDate) : 'Vĩnh viễn';
                              const label = b.contractNumber || b.invoiceNumber || `HĐ-${idx + 1}`;
                              return (
                                <option key={b.id} value={b.id}>
                                  Đợt {idx + 1}: {label} · Trống {bRem}/{bTotal} seats · Hạn: {expStr}
                                </option>
                              );
                            })}
                          </select>
                        </div>
                      )}

                      {/* Hướng dẫn gán linh hoạt */}
                      <div className="p-2 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 rounded-xl text-[11px] text-purple-900 dark:text-purple-200">
                        <span>💡 Cho phép gán cho <b>Nhân viên</b>, gán vào <b>Máy tính</b>, hoặc gán cả hai.</span>
                      </div>

                      {/* Chọn Máy tính / Thiết bị (Kèm ô tìm kiếm & lọc máy chưa gán) */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                            💻 Thiết bị cài đặt bản quyền:
                          </label>
                          {assignAssetId && (
                            <button
                              type="button"
                              onClick={() => {
                                setAssignAssetId('');
                                setAssignUserId('');
                              }}
                              className="text-[10.5px] font-bold text-rose-500 hover:underline cursor-pointer"
                            >
                              ✕ Bỏ chọn máy
                            </button>
                          )}
                        </div>

                        {/* Ô tìm kiếm thiết bị */}
                        <div className="relative">
                          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                          <input
                            type="text"
                            placeholder="🔍 Gõ mã tag, tên máy, model, người đang dùng..."
                            value={assignAssetSearch}
                            onChange={(e) => setAssignAssetSearch(e.target.value)}
                            className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-purple-500 placeholder:text-slate-400 text-slate-800 dark:text-white font-medium"
                          />
                        </div>

                        {(() => {
                          const assignedAssetIdsInLic = new Set(
                            assignments.filter((a: any) => a.assetId).map((a: any) => a.assetId)
                          );
                          const availableAssetsForAssign = assets.filter((a: any) => {
                            if (assignedAssetIdsInLic.has(a.id)) return false;
                            if (!assignAssetSearch.trim()) return true;
                            const q = assignAssetSearch.toLowerCase();
                            const currentHolder = a.assignments?.find((asg: any) => !asg.returnedAt)?.user;
                            return (
                              (a.assetTag || '').toLowerCase().includes(q) ||
                              (a.name || '').toLowerCase().includes(q) ||
                              (a.brand || '').toLowerCase().includes(q) ||
                              (a.model || '').toLowerCase().includes(q) ||
                              (currentHolder?.fullName || '').toLowerCase().includes(q)
                            );
                          });

                          return (
                            <select
                              size={Math.min(5, Math.max(3, availableAssetsForAssign.length + 1))}
                              value={assignAssetId}
                              onChange={(e) => {
                                const newAId = e.target.value;
                                setAssignAssetId(newAId);
                                if (newAId) {
                                  const selectedA = assets.find((a) => a.id === newAId);
                                  const holder = selectedA?.assignments?.find((asg: any) => !asg.returnedAt)?.user;
                                  if (holder) {
                                    // Tự đổi sang người đang sở hữu thiết bị đó
                                    setAssignUserId(holder.id);
                                  } else {
                                    // Thiết bị chưa gán ai (trong kho) -> tự động bỏ trống
                                    setAssignUserId('');
                                  }
                                } else {
                                  setAssignUserId('');
                                }
                              }}
                              className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer overflow-y-auto"
                            >
                              <option value="">-- Không gán theo thiết bị (Chỉ gán người dùng) --</option>
                              {availableAssetsForAssign.map((a: any) => {
                                const currentHolder = a.assignments?.find((asg: any) => !asg.returnedAt)?.user;
                                return (
                                  <option key={a.id} value={a.id} className="py-1">
                                    💻 [{a.assetTag}] {a.name} ({a.brand || ''}) {currentHolder ? `• Đang dùng: ${currentHolder.fullName}` : '• (Trong kho / Chưa gán)'}
                                  </option>
                                );
                              })}
                            </select>
                          );
                        })()}
                      </div>

                      {/* Chọn Nhân sự (Kèm ô tìm kiếm) */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                            👤 Nhân viên nhận bản quyền:
                          </label>
                          {assignUserId && (
                            <button
                              type="button"
                              onClick={() => setAssignUserId('')}
                              className="text-[10.5px] font-bold text-rose-500 hover:underline cursor-pointer"
                            >
                              ✕ Bỏ chọn nhân viên
                            </button>
                          )}
                        </div>

                        {/* Ô tìm kiếm nhân sự */}
                        <div className="relative">
                          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                          <input
                            type="text"
                            placeholder="🔍 Gõ tên nhân viên, phòng ban, email..."
                            value={assignUserSearch}
                            onChange={(e) => setAssignUserSearch(e.target.value)}
                            className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-purple-500 placeholder:text-slate-400 text-slate-800 dark:text-white font-medium"
                          />
                        </div>

                        {(() => {
                          const filteredUsers = users.filter((u: any) => {
                            if (!assignUserSearch.trim()) return true;
                            const q = assignUserSearch.toLowerCase();
                            return (
                              (u.fullName || '').toLowerCase().includes(q) ||
                              (u.email || '').toLowerCase().includes(q) ||
                              (u.department || '').toLowerCase().includes(q)
                            );
                          });

                          return (
                            <select
                              size={Math.min(5, Math.max(3, filteredUsers.length + 1))}
                              value={assignUserId}
                              onChange={(e) => setAssignUserId(e.target.value)}
                              className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer overflow-y-auto"
                            >
                              <option value="">-- Không gán theo nhân viên (Chỉ gán máy tính) --</option>
                              {filteredUsers.map((u: any) => (
                                <option key={u.id} value={u.id} className="py-1">
                                  👤 {u.fullName} {u.department ? `(${u.department})` : ''} - {u.email}
                                </option>
                              ))}
                            </select>
                          );
                        })()}
                      </div>

                      {/* Ghi chú */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Ghi chú cấp phát:
                        </label>
                        <textarea
                          rows={2}
                          placeholder="Ghi chú mục đích sử dụng..."
                          value={assignNotes}
                          onChange={(e) => setAssignNotes(e.target.value)}
                          className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                    </form>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      form="assign-seat-form"
                      disabled={isSubmittingAssign}
                      className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-95"
                    >
                      {isSubmittingAssign ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      )}
                      <span>Xác Nhận Cấp Phát Seat</span>
                    </button>
                  </div>
                </div>

                {/* Right Column (7/12): Danh sách người đang giữ */}
                <div className="lg:col-span-7 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-purple-600" />
                      <span>Danh sách nhân sự & thiết bị đang sử dụng ({assignments.length}):</span>
                    </h4>
                  </div>

                  {assignments.length === 0 ? (
                    <div className="text-center py-16 bg-slate-50 dark:bg-slate-800/30 border border-dashed border-slate-200 dark:border-slate-700 rounded-2xl space-y-1.5">
                      <Users className="w-8 h-8 text-slate-300 mx-auto" />
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Chưa có seat nào được cấp phát
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Chọn nhân sự ở cột bên trái để phân bổ seat đầu tiên.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
                      {assignments.map((asg: any) => (
                        <div
                          key={asg.id}
                          className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xs flex items-center justify-between gap-3"
                        >
                          <div className="space-y-0.5 flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              {asg.user?.id ? (
                                <QuickLink
                                  type="user"
                                  id={asg.user.id}
                                  label={asg.user.fullName}
                                  subLabel={asg.user.department}
                                  icon="👤"
                                  className="font-bold text-xs text-slate-900 dark:text-white truncate"
                                />
                              ) : (
                                <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
                                  👤 {asg.user?.fullName || 'Chưa gán User'}
                                </span>
                              )}
                            </div>

                            <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-3">
                              {asg.asset && (
                                <span className="inline-flex items-center gap-1">
                                  <span className="text-slate-400 text-xs">💻 Máy:</span>
                                  <QuickLink
                                    type="asset"
                                    id={asg.asset.id}
                                    label={`[${asg.asset.assetTag}] ${asg.asset.name}`}
                                    showIcon={false}
                                    className="font-bold text-blue-700 text-xs"
                                  />
                                </span>
                              )}
                              <span>📅 Ngày gán: {formatDate(asg.assignedAt)}</span>
                            </div>
                          </div>

                          <button
                            type="button"
                            disabled={revokingAssignmentId === asg.id}
                            onClick={() => handleRevokeSeat(asg.id)}
                            className="px-2.5 py-1 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded-xl text-xs font-bold cursor-pointer transition-colors shrink-0 flex items-center gap-1"
                          >
                            {revokingAssignmentId === asg.id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <RotateCcw className="w-3 h-3" />
                            )}
                            <span>Thu hồi</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Sticky Footer */}
              <div className="flex items-center justify-end px-6 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 rounded-b-3xl shrink-0">
                <button
                  type="button"
                  onClick={() => setIsAssignModalOpen(false)}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Đóng (Esc)
                </button>
              </div>
            </div>
          </div>
        
  );
}
