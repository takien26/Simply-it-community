'use client';

import React, { useState } from 'react';
import {
  AlertTriangle,
  X,
  Zap,
  CheckCircle2,
  Loader2,
  UserX,
  Wrench,
  ExternalLink,
  ShieldAlert,
  Calendar,
  Building2,
  Monitor,
  User as UserIcon,
  Tag,
  DollarSign,
  AlertCircle,
  Info,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { QuickLink } from '@/components/common/QuickLink';

export interface WastefulSeatItem {
  assignmentId: string;
  licenseId: string;
  licenseName: string;
  licenseKey?: string;
  licenseType?: string;
  licenseRef?: any;
  assignedAt?: string | Date;
  user?: {
    id?: string;
    fullName?: string;
    email?: string;
    department?: string;
    isActive?: boolean;
  };
  asset?: {
    id?: string;
    assetTag?: string;
    name?: string;
    status?: string;
  };
  wasteReason: string;
  wasteReasonBadge?: string;
  costPerSeatVnd: number;
}

export interface ZombieLicensesModalProps {
  isOpen: boolean;
  onClose: () => void;
  wastefulSeats: WastefulSeatItem[];
  selectedCurrency: string;
  exchangeRatesMap?: Record<string, number>;
  formatPrice: (amount: number, currency?: string) => string;
  onViewLicense: (licenseRef: any) => void;
  onReclaimSuccess: () => Promise<void> | void;
  isEn?: boolean;
}

export function ZombieLicensesModal({
  isOpen,
  onClose,
  wastefulSeats,
  selectedCurrency,
  exchangeRatesMap = {},
  formatPrice,
  onViewLicense,
  onReclaimSuccess,
  isEn = false,
}: ZombieLicensesModalProps) {
  const [reclaimingId, setReclaimingId] = useState<string | null>(null);
  const [isReclaimingAll, setIsReclaimingAll] = useState(false);

  if (!isOpen) return null;

  const currentRate = exchangeRatesMap[selectedCurrency] || 1;
  const totalSavingsVnd = wastefulSeats.reduce((acc, s) => acc + (s.costPerSeatVnd || 0), 0);
  const totalSavingsFormatted = formatPrice(totalSavingsVnd / currentRate, selectedCurrency);

  const handleReclaimSingle = async (seat: WastefulSeatItem) => {
    const targetName = seat.user?.fullName || (seat.asset ? `[${seat.asset.assetTag}] ${seat.asset.name}` : 'ghế này');
    const confirmMsg = isEn
      ? `Are you sure you want to reclaim license seat "${seat.licenseName}" from "${targetName}"?\nThis seat will be returned to the license pool immediately.`
      : `Bạn có chắc chắn muốn thu hồi ghế bản quyền "${seat.licenseName}" đang cấp cho "${targetName}" không?\nGhế sẽ được hoàn trả về kho bản quyền để cấp phát lại.`;

    if (!confirm(confirmMsg)) return;

    setReclaimingId(seat.assignmentId);
    try {
      const res = await fetch('/api/licenses/reclaim-waste', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignmentIds: [seat.assignmentId] }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        await onReclaimSuccess();
      } else {
        alert(data.error || (isEn ? 'Failed to reclaim seat' : 'Thu hồi ghế thất bại'));
      }
    } catch (err: any) {
      alert(err?.message || (isEn ? 'Connection error' : 'Lỗi kết nối khi thu hồi'));
    } finally {
      setReclaimingId(null);
    }
  };

  const handleReclaimAll = async () => {
    if (wastefulSeats.length === 0) return;

    const confirmMsg = isEn
      ? `Are you sure you want to reclaim all ${wastefulSeats.length} wasted license seats?\nThis will immediately free up seats assigned to deactivated staff or decommissioned/maintenance devices.`
      : `Bạn có chắc chắn muốn thu hồi toàn bộ ${wastefulSeats.length} ghế bản quyền lãng phí không?\nThao tác này sẽ giải phóng ghế cấp cho nhân sự đã nghỉ việc hoặc thiết bị đang bảo trì/hỏng.`;

    if (!confirm(confirmMsg)) return;

    setIsReclaimingAll(true);
    try {
      const res = await fetch('/api/licenses/reclaim-waste', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignmentIds: wastefulSeats.map((s) => s.assignmentId) }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        await onReclaimSuccess();
        onClose();
      } else {
        alert(data.error || (isEn ? 'Failed to reclaim all seats' : 'Thu hồi toàn bộ thất bại'));
      }
    } catch (err: any) {
      alert(err?.message || (isEn ? 'Connection error' : 'Lỗi kết nối khi thu hồi'));
    } finally {
      setIsReclaimingAll(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-amber-300 dark:border-amber-700/80 overflow-hidden">
        {/* ================= HEADER ================= */}
        <div className="bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-rose-500/15 p-5 border-b border-amber-200 dark:border-amber-800/60 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-bold shadow-md shrink-0 mt-0.5">
              <AlertTriangle className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-black tracking-wider uppercase text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/80 px-2.5 py-0.5 rounded-full border border-amber-300 dark:border-amber-800">
                  {isEn ? 'Zombie Licenses Detection' : 'Phát Hiện Bản Quyền Lãng Phí (Zombie Licenses)'}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 text-xs font-black">
                  {wastefulSeats.length} {isEn ? 'seats' : 'ghế'}
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white mt-1">
                {isEn ? 'Wasted Software License Seats' : 'Chi Tiết Ghế Bản Quyền Cần Thu Hồi'}
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                {isEn
                  ? 'Software seats currently assigned to resigned employees or decommissioned/maintenance devices.'
                  : 'Ghế bản quyền đang cấp cho nhân sự thôi việc hoặc thiết bị ngừng sử dụng / đang sửa chữa.'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title={isEn ? 'Close' : 'Đóng'}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ================= SAVINGS SUMMARY BAR ================= */}
        <div className="px-5 py-3 bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200/80 dark:border-amber-800/40 flex items-center justify-between flex-wrap gap-2 text-xs">
          <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200">
            <DollarSign className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{isEn ? 'Potential cost recovery:' : 'Tiết kiệm tiềm năng sau khi thu hồi:'}</span>
            <strong className="text-rose-600 dark:text-rose-400 font-mono font-black text-sm">
              {totalSavingsFormatted}
            </strong>
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            {isEn ? '1-click reclaim to release seat quota' : 'Thu hồi 1-chạm giúp giải phóng quota bản quyền'}
          </span>
        </div>

        {/* ================= CONTENT BODY ================= */}
        <div className="overflow-y-auto p-4 sm:p-5 space-y-3.5 flex-1">
          {wastefulSeats.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                {isEn ? 'No Wasted Seats Found' : 'Không Có Ghế Bản Quyền Bị Lãng Phí'}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                {isEn
                  ? 'All software licenses are currently assigned to active employees and operational devices.'
                  : 'Toàn bộ bản quyền hiện tại đều đang được cấp phát cho nhân sự đang làm việc và thiết bị hoạt động bình thường.'}
              </p>
            </div>
          ) : (
            wastefulSeats.map((seat, idx) => {
              const isUserWaste = seat.user && seat.user.isActive === false;
              const isAssetWaste = seat.asset && ['MAINTENANCE', 'RETIRED', 'LOST'].includes(seat.asset.status || '');
              const costFormatted = formatPrice(seat.costPerSeatVnd / currentRate, selectedCurrency);
              const isCurrentReclaiming = reclaimingId === seat.assignmentId;

              return (
                <div
                  key={seat.assignmentId || idx}
                  className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 hover:border-amber-300 dark:hover:border-amber-600 transition-all flex flex-col md:flex-row md:items-center justify-between gap-3.5 shadow-2xs"
                >
                  {/* Left: Info */}
                  <div className="space-y-2 min-w-0 flex-1">
                    {/* Top: License name + Badges */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                        <Tag className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                        {seat.licenseName}
                      </span>

                      {seat.licenseType && (
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                          {seat.licenseType}
                        </span>
                      )}

                      {/* Waste reason badge */}
                      <span className={`px-2.5 py-0.5 rounded-full text-[10.5px] font-black flex items-center gap-1 ${
                        seat.wasteReasonBadge || 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                      }`}>
                        {isUserWaste ? <UserX className="w-3 h-3" /> : <Wrench className="w-3 h-3" />}
                        {seat.wasteReason}
                      </span>
                    </div>

                    {/* Middle: Assigned entity details */}
                    <div className="text-xs text-slate-600 dark:text-slate-300 flex items-center gap-2.5 flex-wrap">
                      {seat.user ? (
                        <div className="flex items-center gap-1.5">
                          <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            {seat.user.fullName}
                          </span>
                          {seat.user.email && (
                            <span className="text-slate-400 font-mono text-[11px]">
                              ({seat.user.email})
                            </span>
                          )}
                          {seat.user.department && (
                            <span className="px-1.5 py-0.2 rounded-md bg-slate-200 dark:bg-slate-700 text-[10px] text-slate-700 dark:text-slate-300">
                              {seat.user.department}
                            </span>
                          )}
                        </div>
                      ) : null}

                      {seat.asset ? (
                        <div className="flex items-center gap-1.5">
                          <Monitor className="w-3.5 h-3.5 text-slate-400" />
                          <span className="font-semibold text-purple-700 dark:text-purple-300">
                            [{seat.asset.assetTag}] {seat.asset.name}
                          </span>
                          <span className="px-1.5 py-0.2 rounded-md bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 text-[10px] font-bold">
                            {seat.asset.status}
                          </span>
                        </div>
                      ) : null}
                    </div>

                    {/* Bottom: Date & Estimated Cost */}
                    <div className="text-[11px] text-slate-400 dark:text-slate-400 flex items-center gap-3.5 flex-wrap">
                      {seat.assignedAt && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {isEn ? 'Assigned on:' : 'Ngày cấp:'} {formatDate(seat.assignedAt)}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <DollarSign className="w-3 h-3 text-emerald-500" />
                        {isEn ? 'Seat Cost:' : 'Chi phí ghế:'}{' '}
                        <strong className="text-slate-700 dark:text-slate-200 font-mono font-bold">
                          {costFormatted}
                        </strong>
                      </span>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                    <button
                      type="button"
                      onClick={() => onViewLicense(seat.licenseRef)}
                      className="px-3 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700/80 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                      title={isEn ? 'View full license details' : 'Xem thông tin chi tiết bản quyền'}
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>{isEn ? 'View' : 'Xem'}</span>
                    </button>

                    <button
                      type="button"
                      disabled={isCurrentReclaiming || isReclaimingAll}
                      onClick={() => handleReclaimSingle(seat)}
                      className="px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-60"
                      title={isEn ? 'Reclaim this specific seat' : 'Thu hồi ghế này ngay lập tức'}
                    >
                      {isCurrentReclaiming ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Zap className="w-3.5 h-3.5" />
                      )}
                      <span>{isEn ? 'Reclaim' : 'Thu hồi ghế'}</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* ================= FOOTER ================= */}
        <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-[11.5px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Info className="w-4 h-4 text-amber-500 shrink-0" />
            <span>
              {isEn
                ? 'Reclaiming frees up seat quota to assign to other staff without deleting the license.'
                : 'Thu hồi ghế sẽ hoàn lại quota để gán cho nhân sự/máy khác, không làm xóa bản quyền.'}
            </span>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            {wastefulSeats.length > 0 && (
              <button
                type="button"
                disabled={isReclaimingAll || !!reclaimingId}
                onClick={handleReclaimAll}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-60"
              >
                {isReclaimingAll ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Zap className="w-3.5 h-3.5" />
                )}
                <span>
                  {isEn
                    ? `Reclaim All (${wastefulSeats.length})`
                    : `⚡ Thu hồi tất cả (${wastefulSeats.length} ghế)`}
                </span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 border border-slate-300 dark:border-slate-600 transition-all cursor-pointer"
            >
              {isEn ? 'Close' : 'Đóng'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
