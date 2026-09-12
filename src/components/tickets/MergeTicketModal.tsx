'use client';

import React, { useState } from 'react';
import { GitMerge, X, Search, Loader2 } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/context';

export interface MergeTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedTicket: any;
  allTickets: any[];
  onSuccess: (updatedTargetTicket: any, childTicketId: string) => void;
}

export function MergeTicketModal({
  isOpen,
  onClose,
  selectedTicket,
  allTickets,
  onSuccess,
}: MergeTicketModalProps) {
  const { language } = useLanguage();
  const isEn = language === 'en';

  const [targetTicketId, setTargetTicketId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [reason, setReason] = useState('Trùng lặp nội dung yêu cầu');
  const [merging, setMerging] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen || !selectedTicket) return null;

  const candidateTickets = allTickets.filter(
    (t) =>
      t.id !== selectedTicket.id &&
      !t.mergedIntoTicketId &&
      t.status !== 'CLOSED' &&
      (searchTerm.trim() === '' ||
        t.ticketNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.title?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleMerge = async () => {
    if (!targetTicketId) {
      alert(isEn ? 'Please select a parent ticket to merge into' : 'Vui lòng chọn ticket gốc để gộp vào');
      return;
    }

    try {
      setMerging(true);
      const res = await fetch(`/api/tickets/${selectedTicket.id}/merge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetTicketId,
          reason: reason.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMsg(data.message || (isEn ? 'Tickets merged successfully!' : 'Đã gộp ticket thành công!'));
        setTimeout(() => {
          setSuccessMsg('');
          setTargetTicketId('');
          setSearchTerm('');
          onClose();
          onSuccess(data.data?.parentTicket, selectedTicket.id);
        }, 1500);
      } else {
        alert(data.error || (isEn ? 'Failed to merge tickets' : 'Gộp ticket thất bại'));
      }
    } catch {
      alert(isEn ? 'Connection error while merging tickets' : 'Lỗi kết nối khi gộp ticket');
    } finally {
      setMerging(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-5 sm:p-6 space-y-4 border border-slate-200 animate-in fade-in zoom-in-95 text-xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-100 text-amber-800 rounded-xl">
              <GitMerge className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-bold text-sm text-slate-900">
                  {isEn ? 'Merge Ticket into Parent' : 'Gộp Ticket Vào Ticket Gốc'}
                </h3>
                <span className="text-[9.5px] bg-amber-100 text-amber-900 border border-amber-300 px-1.5 py-0.2 rounded font-black">
                  👑 Enterprise
                </span>
              </div>
              <p className="text-[10.5px] text-slate-500">
                {isEn
                  ? `Merge #${selectedTicket.ticketNumber} into another ticket as a duplicate`
                  : `Đóng #${selectedTicket.ticketNumber} và gộp vào làm ticket phụ`}
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

        {successMsg ? (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl font-bold text-center">
            {successMsg}
          </div>
        ) : (
          <div className="space-y-3.5">
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                {isEn ? 'Select Parent Ticket (to merge into):' : 'Chọn ticket gốc nhận gộp:'}
              </label>

              {/* Search box */}
              <div className="relative mb-2">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={isEn ? 'Search by #TK or title...' : 'Tìm theo mã #TK hoặc tiêu đề...'}
                  className="w-full pl-8.5 pr-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Candidates list */}
              <div className="max-h-48 overflow-y-auto space-y-1.5 border border-slate-200 rounded-xl p-2 bg-slate-50/50">
                {candidateTickets.length === 0 ? (
                  <p className="text-slate-400 text-center py-4 italic">
                    {isEn ? 'No eligible open tickets found.' : 'Không tìm thấy ticket nào khả dụng để gộp vào.'}
                  </p>
                ) : (
                  candidateTickets.map((cand) => (
                    <label
                      key={cand.id}
                      className={`p-2.5 rounded-xl border transition-all flex items-start gap-2.5 cursor-pointer ${
                        targetTicketId === cand.id
                          ? 'bg-amber-50/90 border-amber-400 text-amber-950 font-bold shadow-2xs'
                          : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                      }`}
                    >
                      <input
                        type="radio"
                        name="mergeTargetRadio"
                        value={cand.id}
                        checked={targetTicketId === cand.id}
                        onChange={() => setTargetTicketId(cand.id)}
                        className="mt-0.5 text-amber-600 focus:ring-amber-500 cursor-pointer"
                      />
                      <div className="space-y-0.5 min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-mono text-blue-700 font-extrabold text-[11px]">
                            #{cand.ticketNumber}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-semibold">
                            {cand.status}
                          </span>
                        </div>
                        <p className="truncate text-xs font-semibold text-slate-800">{cand.title}</p>
                        <span className="text-[10px] text-slate-400 block">
                          {cand.createdBy?.fullName} • {new Date(cand.createdAt).toLocaleDateString('vi-VN')}
                        </span>
                      </div>
                    </label>
                  ))
                )}
              </div>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">
                {isEn ? 'Reason for merging:' : 'Lý do gộp ticket:'}
              </label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={isEn ? 'e.g. Duplicate issue reported by user' : 'Ví dụ: Trùng lặp sự cố mạng tầng 3'}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
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
                type="button"
                onClick={handleMerge}
                disabled={merging || !targetTicketId}
                className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-xl font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                {merging ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <GitMerge className="w-3.5 h-3.5" />}
                <span>{isEn ? 'Confirm & Merge' : 'Xác Nhận Gộp'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
