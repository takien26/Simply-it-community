'use client';

import { useState, useEffect, useRef } from 'react';
import { RotateCcw, X, Check, Loader2, Trash2 } from 'lucide-react';
import { triggerDataRefresh, invalidateClientCache } from '@/lib/client-cache';
import { useLanguage } from '@/lib/i18n/context';

export interface TrashUndoToastDetail {
  name: string;
  code?: string;
  trashItemId?: string;
  retentionDays?: number;
  onUndo?: () => void;
}

export function showTrashUndoToast(detail: TrashUndoToastDetail) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('simply-trash-deleted', { detail }));
  }
}

export function TrashUndoToast() {
  const { language } = useLanguage();
  const isEn = language === 'en';

  const [current, setCurrent] = useState<TrashUndoToastDetail | null>(null);
  const [isUndoing, setIsUndoing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleTrashEvent = (e: Event) => {
      const customEvent = e as CustomEvent<TrashUndoToastDetail>;
      if (!customEvent.detail) return;

      if (timerRef.current) clearTimeout(timerRef.current);

      setCurrent(customEvent.detail);
      setIsUndoing(false);
      setIsSuccess(false);

      // Auto dismiss after 4 seconds (tắt nhanh gọn, không vướng màn hình)
      timerRef.current = setTimeout(() => {
        setCurrent(null);
      }, 4000);
    };

    window.addEventListener('simply-trash-deleted', handleTrashEvent);
    return () => {
      window.removeEventListener('simply-trash-deleted', handleTrashEvent);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  if (!current) return null;

  const handleUndo = async () => {
    if (!current.trashItemId || isUndoing) return;

    setIsUndoing(true);
    try {
      const res = await fetch(`/api/trash/${current.trashItemId}/restore`, {
        method: 'POST',
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setIsSuccess(true);
        // Clear all caches
        invalidateClientCache('/api/assets');
        invalidateClientCache('/api/users');
        invalidateClientCache('/api/licenses');
        invalidateClientCache('/api/trash');

        // Trigger reactive refresh
        triggerDataRefresh('assets');
        triggerDataRefresh('users');
        triggerDataRefresh('licenses');
        triggerDataRefresh('trash');

        if (current.onUndo) {
          try {
            current.onUndo();
          } catch {}
        }

        // Close after success feedback
        setTimeout(() => {
          setCurrent(null);
          setIsSuccess(false);
        }, 1200);
      } else {
        alert(data.error || (isEn ? 'Restore failed' : 'Khôi phục không thành công'));
        setIsUndoing(false);
      }
    } catch {
      alert(isEn ? 'Connection error during undo' : 'Lỗi kết nối khi hoàn tác');
      setIsUndoing(false);
    }
  };

  return (
    <div className="fixed bottom-5 right-5 z-[99999] animate-in slide-in-from-bottom-5 fade-in duration-200">
      <style
        dangerouslySetInnerHTML={{
          __html: `@keyframes simply-toast-shrink { from { width: 100%; } to { width: 0%; } }`,
        }}
      />
      <div className="relative overflow-hidden bg-slate-950/95 text-white border border-slate-700/80 shadow-2xl rounded-2xl p-3.5 max-w-md flex items-center gap-3.5 backdrop-blur-md pb-4">
        {/* Countdown Progress Bar */}
        {!isSuccess && !isUndoing && (
          <div className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-slate-800/80 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-indigo-500"
              style={{
                animation: 'simply-toast-shrink 4s linear forwards',
              }}
            />
          </div>
        )}

        {/* Icon */}
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 font-bold ${
          isSuccess ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
        }`}>
          {isSuccess ? <Check className="w-5 h-5 animate-in zoom-in-50" /> : <Trash2 className="w-4 h-4" />}
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          {isSuccess ? (
            <div>
              <p className="text-xs font-bold text-emerald-400">
                {isEn ? 'Restored successfully!' : 'Khôi phục thành công!'}
              </p>
              <p className="text-[11px] text-slate-300 truncate">
                {isEn ? `Restored "${current.name}" back to system.` : `Đã phục hồi "${current.name}" về hệ thống.`}
              </p>
            </div>
          ) : (
            <div>
              <p className="text-[11px] font-medium text-slate-400 flex items-center gap-1.5">
                <span>{isEn ? 'Moved to Trash' : 'Đã chuyển vào Thùng rác'}</span>
                <span className="text-[10px] px-1.5 py-0.2 bg-slate-800 text-slate-300 rounded font-semibold">
                  {isEn ? `Kept for ${current.retentionDays || 30} days` : `Lưu ${current.retentionDays || 30} ngày`}
                </span>
              </p>
              <p className="text-xs font-bold text-white truncate mt-0.5" title={current.name}>
                {current.code ? `[${current.code}] ` : ''}{current.name}
              </p>
            </div>
          )}
        </div>

        {/* Action Button */}
        {!isSuccess && current.trashItemId && (
          <button
            type="button"
            disabled={isUndoing}
            onClick={handleUndo}
            className="px-3 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-1.5 shrink-0 cursor-pointer transition-all hover:scale-102 active:scale-98 disabled:opacity-50"
          >
            {isUndoing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <RotateCcw className="w-3.5 h-3.5" />
            )}
            <span>{isUndoing ? (isEn ? 'Restoring...' : 'Đang hoàn...') : (isEn ? 'Undo' : 'Hoàn tác')}</span>
          </button>
        )}

        {/* Close Button */}
        <button
          type="button"
          onClick={() => setCurrent(null)}
          className="p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
