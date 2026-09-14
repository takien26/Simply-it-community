'use client';

import React, { useState, useEffect } from 'react';
import { KeyRound, X, Copy, Check, ExternalLink, Edit2 } from 'lucide-react';
import { PasswordItem } from './types';
import { useLanguage } from '@/lib/i18n/context';

interface PasswordDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  password: PasswordItem | null;
  onEdit: (item: PasswordItem) => void;
  onCopyText?: (text: string, fieldId: string, label: string) => void;
}

export function PasswordDetailModal({
  isOpen,
  onClose,
  password,
  onEdit,
  onCopyText,
}: PasswordDetailModalProps) {
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

  const { language, t, isEn, isJa } = useLanguage();
  const txt = (vi: string, en: string, ja: string) => isJa ? ja : (isEn ? en : vi);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  if (!isOpen || !password) return null;

  const handleCopy = (text: string, fieldId: string, label: string) => {
    if (onCopyText) {
      onCopyText(text, fieldId, label);
    } else {
      navigator.clipboard.writeText(text);
    }
    setCopiedField(fieldId);
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full flex flex-col border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-indigo-50 to-purple-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-xs">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <span className="font-mono text-[10px] font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded">
                📁 {password.groupName || 'Root'}
              </span>
              <h3 className="font-bold text-base text-slate-900 leading-snug mt-0.5">{password.title}</h3>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 text-xs">
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-500 uppercase">{txt('Tên đăng nhập:', 'Username:', 'ユーザー名:')}</span>
              <button
                type="button"
                onClick={() => handleCopy(password.username || '', 'd_user', txt('Tên đăng nhập', 'Username', 'ユーザー名'))}
                className="text-indigo-600 font-bold flex items-center gap-1 hover:underline cursor-pointer"
              >
                {copiedField === 'd_user' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedField === 'd_user' ? txt('Đã copy', 'Copied', 'コピー完了') : txt('Copy', 'Copy', 'コピー')}</span>
              </button>
            </div>
            <p className="font-mono font-bold text-sm text-slate-900">{password.username || '—'}</p>
          </div>

          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-500 uppercase">{txt('Mật khẩu bảo mật:', 'Secure Password:', 'パスワード:')}</span>
              <button
                type="button"
                onClick={() => handleCopy(password.password, 'd_pass', txt('Mật khẩu', 'Password', 'パスワード'))}
                className="text-indigo-600 font-bold flex items-center gap-1 hover:underline cursor-pointer"
              >
                {copiedField === 'd_pass' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedField === 'd_pass' ? txt('Đã copy', 'Copied', 'コピー完了') : txt('Copy mật khẩu', 'Copy Password', 'パスワードをコピー')}</span>
              </button>
            </div>
            <p className="font-mono font-black text-base text-indigo-950 bg-white p-2.5 border border-slate-200 rounded-xl break-all">
              {password.password}
            </p>
          </div>

          {password.url && (
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-500 uppercase">{txt('Đường dẫn truy cập / IP:', 'Access URL / IP:', 'アクセスURL / IP:')}</span>
                <button
                  type="button"
                  onClick={() => handleCopy(password.url || '', 'd_url', txt('Đường dẫn / IP', 'URL / IP', 'URL / IP'))}
                  className="text-indigo-600 font-bold flex items-center gap-1 hover:underline cursor-pointer"
                >
                  {copiedField === 'd_url' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedField === 'd_url' ? txt('Đã copy', 'Copied', 'コピー完了') : txt('Copy URL/IP', 'Copy URL/IP', 'URL/IPをコピー')}</span>
                </button>
              </div>
              <div className="flex items-center justify-between gap-2 bg-white p-2.5 border border-slate-200 rounded-xl">
                <span className="font-mono text-xs font-bold text-indigo-950 truncate flex-1">{password.url}</span>
                <a
                  href={password.url.startsWith('http') || password.url.startsWith('ssh') ? password.url : `https://${password.url}`}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer shrink-0"
                  title={txt('Mở liên kết', 'Open Link', 'リンクを開く')}
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
          )}

          {password.notes && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase">{txt('Ghi chú & Hướng dẫn:', 'Notes & Instructions:', '備考・指示:')}</span>
              <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">{password.notes}</p>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                onClose();
                onEdit(password);
              }}
              className="px-4 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl font-bold flex items-center gap-1 cursor-pointer"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>{txt('Sửa thông tin', 'Edit Details', '情報を編集')}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold cursor-pointer"
            >
              {txt('Đóng (ESC)', 'Close (ESC)', '閉じる (ESC)')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
