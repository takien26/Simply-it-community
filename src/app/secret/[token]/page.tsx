'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import {
  ShieldAlert,
  ShieldCheck,
  Lock,
  Unlock,
  Copy,
  Check,
  Eye,
  EyeOff,
  Flame,
  AlertTriangle,
  Loader2,
  KeyRound,
  FileText,
  User,
} from 'lucide-react';

export default function SecretSharePage() {
  const params = useParams();
  const token = params?.token as string;

  const [loading, setLoading] = useState(true);
  const [revealing, setRevealing] = useState(false);
  const [metadata, setMetadata] = useState<{
    exists: boolean;
    hasPassphrase: boolean;
    expiresAt: string;
    maxViews: number;
  } | null>(null);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isBurned, setIsBurned] = useState(false);

  // Passphrase input
  const [passphrase, setPassphrase] = useState('');
  const [passphraseError, setPassphraseError] = useState<string | null>(null);

  // Decrypted Secret result
  const [secretData, setSecretData] = useState<{
    title: string;
    username?: string;
    password?: string;
    notes?: string;
    createdByName?: string;
    createdAt?: string;
  } | null>(null);

  const [showPassword, setShowPassword] = useState(true);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // 1. Initial Peek to inspect status
  useEffect(() => {
    if (!token) return;

    fetch(`/api/passwords/share/${token}?peek=true`)
      .then(async (res) => {
        const data = await res.json();
        if (res.ok && data.exists) {
          setMetadata(data);
        } else {
          setIsBurned(true);
          setErrorMsg(data.error || 'Liên kết không tồn tại hoặc đã bị tiêu hủy.');
        }
      })
      .catch(() => {
        setIsBurned(true);
        setErrorMsg('Không thể kết nối đến máy chủ.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [token]);

  // 2. Reveal Secret
  const handleReveal = async () => {
    if (!token) return;
    setRevealing(true);
    setPassphraseError(null);

    try {
      const url = `/api/passwords/share/${token}${
        passphrase ? `?passphrase=${encodeURIComponent(passphrase)}` : ''
      }`;
      const res = await fetch(url);
      const data = await res.json();

      if (res.ok && data.success) {
        setSecretData(data.secret);
        setIsBurned(data.burned);
      } else if (data.incorrectPassphrase || data.requiresPassphrase) {
        setPassphraseError(data.error);
      } else {
        setIsBurned(true);
        setErrorMsg(data.error || 'Liên kết đã hết hạn hoặc đã bị tiêu hủy.');
      }
    } catch {
      setErrorMsg('Lỗi kết nối khi mở dữ liệu bí mật.');
    } finally {
      setRevealing(false);
    }
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-rose-500 selection:text-white">
      {/* Top Bar */}
      <header className="border-b border-slate-800/80 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-rose-600 to-orange-500 flex items-center justify-center shadow-lg shadow-rose-950">
            <Lock className="w-4 h-4 text-white" />
          </div>
          <span className="font-extrabold text-sm tracking-wide text-white">
            SIMPLY IT <span className="text-rose-500 font-semibold">• Vault Send</span>
          </span>
        </div>
        <div className="flex items-center gap-1 text-[11px] text-slate-400 font-mono bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-full">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>AES-256-GCM End-to-End Encrypted</span>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-lg">
          {loading ? (
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-10 text-center space-y-3">
              <Loader2 className="w-8 h-8 text-rose-500 animate-spin mx-auto" />
              <p className="text-sm font-semibold text-slate-300">Đang kiểm tra tính hợp lệ của liên kết...</p>
            </div>
          ) : isBurned && !secretData ? (
            /* Burned or Expired State */
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-8 text-center space-y-4 shadow-2xl animate-in zoom-in-95">
              <div className="w-16 h-16 rounded-3xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
                <Flame className="w-8 h-8 text-rose-500 animate-pulse" />
              </div>
              <div className="space-y-2">
                <h2 className="text-lg font-bold text-white">Bí Mật Đã Bị Tiêu Hủy</h2>
                <p className="text-xs text-slate-400 leading-relaxed max-w-sm mx-auto">
                  {errorMsg ||
                    'Liên kết này không tồn tại, đã hết thời gian hiệu lực, hoặc đã được mở xem trước đó và bị xóa vĩnh viễn khỏi máy chủ theo cơ chế tự hủy.'}
                </p>
              </div>
              <div className="pt-2 text-[11px] text-slate-500 italic">
                Nếu bạn vẫn cần thông tin này, vui lòng liên hệ bộ phận IT để được tạo một liên kết bảo mật mới.
              </div>
            </div>
          ) : !secretData ? (
            /* Ready to Reveal Form */
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-7 space-y-5 shadow-2xl animate-in zoom-in-95">
              <div className="text-center space-y-2">
                <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
                  <Lock className="w-7 h-7 text-amber-400" />
                </div>
                <h2 className="text-base font-bold text-white">Bạn Nhận Được 1 Thông Tin Bí Mật</h2>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Thông tin này được chia sẻ an toàn từ Bộ phận CNTT. Sau khi bạn mở xem, dữ liệu sẽ <strong>tự hủy vĩnh viễn</strong>.
                </p>
              </div>

              {/* Warning Banner */}
              <div className="p-3 bg-rose-950/40 border border-rose-900/60 rounded-2xl flex items-start gap-2.5 text-xs text-rose-200">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-bold text-rose-300">Cơ chế tự hủy dùng 1 lần (Burn on view)</p>
                  <p className="text-[11px] text-rose-300/80">
                    Bí mật sẽ bị xóa ngay lập tức khỏi hệ thống sau khi bạn nhấn nút bên dưới. Hãy chuẩn bị sẵn sàng để sao chép thông tin.
                  </p>
                </div>
              </div>

              {/* Passphrase Input if required */}
              {metadata?.hasPassphrase && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                    <span>Mật khẩu phụ (Passphrase do người gửi cấp)</span>
                  </label>
                  <input
                    type="password"
                    value={passphrase}
                    onChange={(e) => setPassphrase(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleReveal();
                    }}
                    placeholder="Nhập mật khẩu phụ bảo vệ..."
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500 font-mono"
                  />
                  {passphraseError && (
                    <p className="text-[11px] text-rose-400 font-semibold">{passphraseError}</p>
                  )}
                </div>
              )}

              {/* Action Button */}
              <button
                type="button"
                onClick={handleReveal}
                disabled={revealing}
                className="w-full py-3 px-4 bg-gradient-to-r from-rose-600 to-orange-600 hover:from-rose-500 hover:to-orange-500 text-white rounded-2xl font-bold text-xs transition-all shadow-lg shadow-rose-950/60 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {revealing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Đang giải mã và tiêu hủy trên máy chủ...</span>
                  </>
                ) : (
                  <>
                    <Unlock className="w-4 h-4" />
                    <span>🔓 Mở Xem Bí Mật Ngay</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            /* Secret Revealed Successfully */
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-7 space-y-5 shadow-2xl animate-in zoom-in-95">
              {/* Burned Notice Banner */}
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <Flame className="w-4 h-4 text-rose-400 shrink-0" />
                  <span className="font-bold text-rose-300">
                    Bí mật đã được xóa vĩnh viễn khỏi máy chủ!
                  </span>
                </div>
                <span className="text-[10px] text-rose-400 font-mono bg-rose-950/60 px-2 py-0.5 rounded-full border border-rose-800">
                  BURNED 🔥
                </span>
              </div>

              {/* Title & Creator */}
              <div className="border-b border-slate-800 pb-3">
                <h3 className="text-base font-extrabold text-white">{secretData.title}</h3>
                {secretData.createdByName && (
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Gửi bởi: <strong className="text-slate-300">{secretData.createdByName}</strong>
                  </p>
                )}
              </div>

              {/* Username Field */}
              {secretData.username && (
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                    <User className="w-3 h-3 text-blue-400" />
                    <span>Tài khoản / Username</span>
                  </label>
                  <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl p-2.5">
                    <span className="font-mono text-xs text-white flex-1 truncate select-all">
                      {secretData.username}
                    </span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(secretData.username!, 'username')}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      {copiedField === 'username' ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-400 font-bold">Đã chép</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Chép</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Password / Secret Field */}
              {secretData.password && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                      <KeyRound className="w-3 h-3 text-rose-400" />
                      <span>Mật khẩu / Nội dung bí mật</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      <span>{showPassword ? 'Ẩn' : 'Hiện'}</span>
                    </button>
                  </div>
                  <div className="flex items-center gap-2 bg-slate-950 border border-rose-900/40 rounded-xl p-2.5 ring-1 ring-rose-500/20">
                    <span className="font-mono text-xs text-rose-300 font-bold flex-1 truncate select-all">
                      {showPassword ? secretData.password : '••••••••••••••••••••'}
                    </span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(secretData.password!, 'password')}
                      className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer shadow-xs"
                    >
                      {copiedField === 'password' ? (
                        <>
                          <Check className="w-3 h-3 text-white" />
                          <span>Đã chép</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Sao chép</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Additional Notes Field */}
              {secretData.notes && (
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                    <FileText className="w-3 h-3 text-cyan-400" />
                    <span>Ghi chú hướng dẫn đi kèm</span>
                  </label>
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 relative group">
                    <p className="text-xs text-slate-300 whitespace-pre-wrap font-mono leading-relaxed select-all">
                      {secretData.notes}
                    </p>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(secretData.notes!, 'notes')}
                      className="mt-2 text-[10.5px] text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
                    >
                      {copiedField === 'notes' ? (
                        <span className="text-emerald-400 font-bold flex items-center gap-1">
                          <Check className="w-3 h-3" /> Đã sao chép ghi chú
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <Copy className="w-3 h-3" /> Sao chép ghi chú
                        </span>
                      )}
                    </button>
                  </div>
                </div>
              )}

              <div className="pt-2 text-center">
                <p className="text-[11px] text-slate-500 italic">
                  ⚠️ Hãy sao chép và lưu trữ thông tin này vào nơi an toàn trước khi đóng trình duyệt. Nếu tải lại trang, thông tin sẽ biến mất hoàn toàn.
                </p>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 px-6 py-3 text-center text-[11px] text-slate-500">
        SIMPLY IT Community • Tính năng chia sẻ bí mật mã hóa tự hủy dùng 1 lần
      </footer>
    </div>
  );
}
