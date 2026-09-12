'use client';

import React, { useState } from 'react';
import { Clock, X, Save, Loader2 } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/context';

export interface SlaExtensionModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticket: any;
  onSuccess: (updatedTicket: any) => void;
}

export function SlaExtensionModal({
  isOpen,
  onClose,
  ticket,
  onSuccess,
}: SlaExtensionModalProps) {
  const { language } = useLanguage();
  const isEn = language === 'en';

  const [extHours, setExtHours] = useState(8);
  const [extReason, setExtReason] = useState('');
  const [extending, setExtending] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen || !ticket) return null;

  const handleExtend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!extReason.trim()) {
      alert(isEn ? 'Please provide a specific reason' : 'Vui lòng cung cấp lý do gia hạn cụ thể');
      return;
    }

    try {
      setExtending(true);
      const res = await fetch(`/api/tickets/${ticket.id}/extend-sla`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          extensionHours: extHours,
          reason: extReason.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMsg(`✅ ${data.message || (isEn ? 'SLA extended successfully' : 'Gia hạn SLA thành công')}`);
        setTimeout(() => {
          setSuccessMsg('');
          setExtReason('');
          onClose();
          onSuccess(data.data);
        }, 1500);
      } else {
        alert(data.error || (isEn ? 'Failed to extend SLA' : 'Gia hạn SLA thất bại'));
      }
    } catch {
      alert(isEn ? 'Connection error requesting SLA extension' : 'Lỗi kết nối khi xin gia hạn SLA');
    } finally {
      setExtending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-5 space-y-4 border border-slate-200 animate-in fade-in zoom-in-95 text-xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-100 text-amber-800 rounded-xl">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900">
                {isEn ? 'Request SLA Extension' : 'Xin Gia Hạn Thời Gian SLA'}
              </h3>
              <p className="text-[10.5px] text-slate-500">
                {isEn
                  ? 'Extend resolution deadline when issue is more complex than expected'
                  : 'Gia hạn thời hạn xử lý khi case thực tế phức tạp hơn mô tả ban đầu'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {successMsg && (
          <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl font-bold animate-in fade-in">
            {successMsg}
          </div>
        )}

        <form onSubmit={handleExtend} className="space-y-3">
          <div>
            <label className="font-bold text-slate-700 block mb-1">
              {isEn ? 'Additional hours requested (*)' : 'Số giờ xin gia hạn thêm (*)'}
            </label>
            <select
              value={extHours}
              onChange={(e) => setExtHours(Number(e.target.value))}
              className="w-full p-2.5 border border-slate-300 rounded-xl bg-slate-50 font-bold text-slate-800 outline-none"
            >
              <option value={4}>{isEn ? '+ 4 Hours (Half work day)' : '+ 4 Giờ (Nửa ngày làm việc)'}</option>
              <option value={8}>{isEn ? '+ 8 Hours (1 Work day)' : '+ 8 Giờ (1 Ngày làm việc)'}</option>
              <option value={24}>{isEn ? '+ 24 Hours (1 Full day)' : '+ 24 Giờ (1 Ngày đêm)'}</option>
              <option value={48}>{isEn ? '+ 48 Hours (2 Work days)' : '+ 48 Giờ (2 Ngày làm việc)'}</option>
              <option value={72}>{isEn ? '+ 72 Hours (3 Work days)' : '+ 72 Giờ (3 Ngày làm việc)'}</option>
            </select>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">
              {isEn ? 'Specific justification reason (*)' : 'Lý do giải trình cụ thể (*)'}
            </label>
            <textarea
              required
              rows={3}
              value={extReason}
              onChange={(e) => setExtReason(e.target.value)}
              placeholder={
                isEn
                  ? 'e.g. Hard drive bad sector requires spare part order, server requires off-hours maintenance...'
                  : 'VD: Lỗi ổ cứng hỏng bad sector cần đặt linh kiện mới, máy chủ cần bảo trì ngoài giờ...'
              }
              className="w-full p-2.5 border border-slate-300 rounded-xl resize-none font-medium outline-none focus:ring-2 focus:ring-amber-500"
            />
            <span className="text-[10px] text-slate-400 mt-0.5 block">
              🛡️ {isEn
                ? 'Note: Extension justifications are logged in the SLA Audit Report for transparency.'
                : 'Lưu ý: Lý do gia hạn được lưu lại trong Báo cáo Kiểm toán SLA để IT Lead theo dõi minh bạch.'}
            </span>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 border border-slate-200 text-slate-600 rounded-xl font-semibold hover:bg-slate-50 cursor-pointer"
            >
              {isEn ? 'Cancel' : 'Hủy'}
            </button>
            <button
              type="submit"
              disabled={extending || !extReason.trim()}
              className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-xl font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              {extending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              <span>{isEn ? 'Confirm Extension' : 'Xác Nhận Gia Hạn'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
