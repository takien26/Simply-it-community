'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Lock,
  Link as LinkIcon,
  Copy,
  Check,
  Flame,
  Clock,
  Shield,
  Eye,
  EyeOff,
  KeyRound,
  FileText,
  User,
  AlertTriangle,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import { useLanguage } from '@/lib/i18n/context';

interface OneTimeSecretModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: {
    title?: string | null;
    username?: string | null;
    password?: string | null;
    notes?: string | null;
  };
}

export default function OneTimeSecretModal({
  isOpen,
  onClose,
  initialData,
}: OneTimeSecretModalProps) {
  const { language } = useLanguage();
  const isEn = language === 'en';

  const [title, setTitle] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [notes, setNotes] = useState('');
  const [expiresInHours, setExpiresInHours] = useState('24');
  const [maxViews, setMaxViews] = useState('1');
  const [passphrase, setPassphrase] = useState('');
  const [showPassphrase, setShowPassphrase] = useState(false);

  const [loading, setLoading] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setTitle(initialData?.title ? `Bí mật: ${initialData.title}` : '');
      setUsername(initialData?.username || '');
      setPassword(initialData?.password || '');
      setNotes(initialData?.notes || '');
      setExpiresInHours('24');
      setMaxViews('1');
      setPassphrase('');
      setGeneratedLink(null);
      setCopied(false);
      setErrorMsg(null);
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim() && !notes.trim()) {
      setErrorMsg(isEn ? 'Please enter a password or secret text' : 'Vui lòng nhập mật khẩu hoặc nội dung cần gửi');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/passwords/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          username,
          password,
          notes,
          expiresInHours: Number(expiresInHours) || 24,
          maxViews: Number(maxViews) || 1,
          passphrase: passphrase.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        const fullUrl = `${window.location.origin}${data.shareUrl}`;
        setGeneratedLink(fullUrl);
      } else {
        setErrorMsg(data.error || (isEn ? 'Failed to create secret link' : 'Không thể tạo liên kết bí mật'));
      }
    } catch {
      setErrorMsg(isEn ? 'Connection error' : 'Lỗi kết nối máy chủ');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = () => {
    if (!generatedLink) return;
    navigator.clipboard.writeText(generatedLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in zoom-in-95">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-rose-600 via-rose-500 to-orange-500 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
              <Flame className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-sm">
                {isEn ? 'One-Time Self-Destructing Secret Link' : 'Chia Sẻ Mật Khẩu Tự Hủy Dùng 1 Lần'}
              </h3>
              <p className="text-[11px] text-rose-100">
                {isEn ? 'Burn on view • End-to-end encrypted' : 'Tự hủy sau khi xem • Mã hóa AES-256 an toàn tuyệt đối'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          {generatedLink ? (
            /* Result State: Link Created */
            <div className="space-y-5 animate-in fade-in">
              <div className="text-center space-y-1.5">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto shadow-xs">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-slate-800 text-sm">
                  {isEn ? 'Secret Link Created Successfully!' : 'Đã Tạo Liên Kết Bí Mật Thành Công!'}
                </h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  {isEn
                    ? 'Send this link to the recipient. Once opened, it will permanently self-destruct from the database.'
                    : 'Gửi liên kết dưới đây cho người nhận. Ngay khi người nhận mở xem, dữ liệu sẽ tự động xóa vĩnh viễn khỏi hệ thống.'}
                </p>
              </div>

              {/* Share URL Box */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={generatedLink}
                    className="w-full bg-white px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:outline-none select-all"
                  />
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shrink-0 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>{isEn ? 'Copied' : 'Đã chép'}</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>{isEn ? 'Copy Link' : 'Sao chép'}</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-amber-500" />
                    <span>{isEn ? `Valid for ${expiresInHours}h` : `Hiệu lực tối đa: ${expiresInHours} giờ`}</span>
                  </span>
                  <span className="flex items-center gap-1 font-bold text-rose-600">
                    <Flame className="w-3 h-3" />
                    <span>{isEn ? `Burn after ${maxViews} view` : `Tự hủy sau ${maxViews} lần xem`}</span>
                  </span>
                </div>
              </div>

              {passphrase && (
                <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-center justify-between">
                  <span>Mật khẩu phụ cần gửi kèm: <strong className="font-mono bg-white px-1.5 py-0.5 rounded border border-amber-300">{passphrase}</strong></span>
                  <button
                    type="button"
                    onClick={() => navigator.clipboard.writeText(passphrase)}
                    className="text-[10px] text-blue-700 font-bold hover:underline"
                  >
                    Chép pass
                  </button>
                </div>
              )}

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setGeneratedLink(null)}
                  className="flex-1 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors cursor-pointer"
                >
                  {isEn ? 'Create Another Secret' : 'Tạo thêm bí mật khác'}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2 text-xs font-bold text-white bg-slate-800 hover:bg-slate-900 rounded-xl transition-colors cursor-pointer"
                >
                  {isEn ? 'Done / Close' : 'Hoàn tất & Đóng'}
                </button>
              </div>
            </div>
          ) : (
            /* Creation Form */
            <form onSubmit={handleGenerate} className="space-y-3.5">
              {errorMsg && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-semibold flex items-center gap-2 animate-in fade-in">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Title */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isEn ? 'Description / Title' : 'Tiêu đề bí mật'}
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={isEn ? 'e.g. WiFi Guest Password, Temporary DB Root...' : 'VD: Mật khẩu WiFi Khách, Pass reset tạm thời...'}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-rose-500 outline-none"
                />
              </div>

              {/* Username (optional) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isEn ? 'Username / Account (Optional)' : 'Tên tài khoản / Email (Nếu có)'}
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={isEn ? 'admin@company.com' : 'admin@company.com'}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-rose-500 outline-none font-mono"
                />
              </div>

              {/* Password / Secret */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isEn ? 'Secret Password / Content' : 'Mật khẩu / Nội dung bí mật'} <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={isEn ? 'Enter password to share securely...' : 'Nhập mật khẩu cần chia sẻ an toàn...'}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-rose-500 outline-none font-mono font-bold text-rose-600"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isEn ? 'Additional Notes / Instructions (Optional)' : 'Ghi chú / Hướng dẫn gửi kèm (Tùy chọn)'}
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={isEn ? 'Instructions on where to log in, port number...' : 'VD: Đăng nhập tại link internal.corp, đổi mật khẩu sau 1h...'}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-rose-500 outline-none resize-none"
                />
              </div>

              {/* Expiration & Max Views */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    <Clock className="w-3 h-3 inline mr-1 text-slate-400" />
                    {isEn ? 'Expiration' : 'Hạn hiệu lực'}
                  </label>
                  <select
                    value={expiresInHours}
                    onChange={(e) => setExpiresInHours(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-xl text-xs bg-white text-slate-800"
                  >
                    <option value="1">1 {isEn ? 'hour' : 'giờ'}</option>
                    <option value="12">12 {isEn ? 'hours' : 'giờ'}</option>
                    <option value="24">24 {isEn ? 'hours (1 day)' : 'giờ (1 ngày)'}</option>
                    <option value="72">3 {isEn ? 'days' : 'ngày'}</option>
                    <option value="168">7 {isEn ? 'days' : 'ngày'}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    <Flame className="w-3 h-3 inline mr-1 text-rose-500" />
                    {isEn ? 'Self-Destruct (Burn)' : 'Cơ chế tự hủy'}
                  </label>
                  <select
                    value={maxViews}
                    onChange={(e) => setMaxViews(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-xl text-xs bg-white text-slate-800"
                  >
                    <option value="1">🔥 {isEn ? 'Burn after 1 view' : 'Tự hủy sau 1 lần xem'}</option>
                    <option value="2">2 {isEn ? 'views' : 'lần xem'}</option>
                    <option value="3">3 {isEn ? 'views' : 'lần xem'}</option>
                    <option value="5">5 {isEn ? 'views' : 'lần xem'}</option>
                  </select>
                </div>
              </div>

              {/* Optional Passphrase */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                  <span>
                    <KeyRound className="w-3 h-3 inline mr-1 text-slate-400" />
                    {isEn ? 'Passphrase Protection (Optional)' : 'Mật khẩu phụ bảo vệ (Tùy chọn)'}
                  </span>
                  <span className="text-[10px] text-slate-400 font-normal">
                    {isEn ? 'Recipient must know this to open' : 'Người nhận phải nhập pass này mới mở được'}
                  </span>
                </label>
                <div className="relative">
                  <input
                    type={showPassphrase ? 'text' : 'password'}
                    value={passphrase}
                    onChange={(e) => setPassphrase(e.target.value)}
                    placeholder={isEn ? 'Leave empty if not required' : 'Bỏ trống nếu không yêu cầu'}
                    className="w-full pl-3 pr-8 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-rose-500 outline-none font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassphrase(!showPassphrase)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                  >
                    {showPassphrase ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  {isEn ? 'Cancel' : 'Hủy'}
                </button>

                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-gradient-to-r from-rose-600 to-orange-600 hover:from-rose-500 hover:to-orange-500 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>{isEn ? 'Encrypting...' : 'Đang mã hóa...'}</span>
                    </>
                  ) : (
                    <>
                      <LinkIcon className="w-3.5 h-3.5" />
                      <span>{isEn ? 'Generate Secret Link' : '🔗 Tạo Link Bí Mật'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
