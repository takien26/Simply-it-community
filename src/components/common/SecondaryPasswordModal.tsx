'use client';

import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/lib/i18n/context';
import {
  Lock,
  KeyRound,
  ShieldCheck,
  Eye,
  EyeOff,
  AlertTriangle,
  X,
  Check,
  RotateCcw,
  Sparkles,
  HelpCircle,
  Shield,
  Key,
} from 'lucide-react';

interface SecondaryPasswordModalProps {
  isOpen: boolean;
  onClose?: () => void;
  onSuccess: () => void;
  mode?: 'verify' | 'set' | 'change' | 'forgot';
}

export const SecondaryPasswordModal: React.FC<SecondaryPasswordModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  mode = 'verify',
}) => {
  const [currentMode, setCurrentMode] = useState<'verify' | 'set' | 'change' | 'forgot'>(mode);
  const [password, setPassword] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [primaryPassword, setPrimaryPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [rememberSession, setRememberSession] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showPrimaryPassword, setShowPrimaryPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasSecondaryPassword, setHasSecondaryPassword] = useState<boolean | null>(null);
  const { language } = useLanguage();
  const isEn = language === 'en';

  // Check user secondary password status on open
  useEffect(() => {
    if (isOpen) {
      setErrorMsg('');
      setPassword('');
      setCurrentPassword('');
      setPrimaryPassword('');
      setNewPassword('');
      setConfirmPassword('');
      fetch('/api/auth/secondary-password')
        .then((r) => r.json())
        .then((d) => {
          if (d.success) {
            setHasSecondaryPassword(d.hasSecondaryPassword);
            if (!d.hasSecondaryPassword) {
              setCurrentMode('set');
            } else {
              setCurrentMode(mode);
            }
          }
        })
        .catch(() => {});
    }
  }, [isOpen, mode]);

  if (!isOpen) return null;

  // 1. VERIFY SECONDARY PASSWORD
  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setErrorMsg(isEn ? 'Please enter secondary password' : 'Vui lòng nhập mật khẩu cấp 2');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/auth/secondary-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'verify',
          secondaryPassword: password.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        if (rememberSession) {
          sessionStorage.setItem('simply_sec_pw_unlocked', 'true');
          sessionStorage.setItem('simply_sec_pw_time', String(Date.now()));
        }
        onSuccess();
      } else {
        if (data.needSetup) {
          setCurrentMode('set');
          setErrorMsg(isEn ? 'Your account does not have a secondary password yet. Please set it up now.' : 'Tài khoản của bạn chưa có Mật khẩu cấp 2. Vui lòng thiết lập ngay.');
        } else {
          setErrorMsg(data.error || (isEn ? 'Incorrect secondary password!' : 'Mật khẩu cấp 2 không chính xác!'));
        }
      }
    } catch {
      setErrorMsg(isEn ? 'Server connection error. Please try again.' : 'Lỗi kết nối máy chủ. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  // 2. SET OR CHANGE SECONDARY PASSWORD
  const handleSetOrChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (currentMode === 'change' && !currentPassword.trim()) {
      setErrorMsg(isEn ? 'Please enter current secondary password' : 'Vui lòng nhập mật khẩu cấp 2 hiện tại');
      return;
    }
    if (!newPassword.trim() || newPassword.trim().length < 4) {
      setErrorMsg(isEn ? 'New secondary password must be at least 4 characters' : 'Mật khẩu cấp 2 mới phải có ít nhất 4 ký tự');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg(isEn ? 'Password confirmation does not match' : 'Mật khẩu xác nhận không khớp');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/auth/secondary-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: currentMode === 'change' ? 'change' : 'set',
          currentSecondaryPassword: currentPassword.trim(),
          newSecondaryPassword: newPassword.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        sessionStorage.setItem('simply_sec_pw_unlocked', 'true');
        sessionStorage.setItem('simply_sec_pw_time', String(Date.now()));
        onSuccess();
      } else {
        setErrorMsg(data.error || 'Thao tác thất bại');
      }
    } catch {
      setErrorMsg(isEn ? 'Server connection error. Please try again.' : 'Lỗi kết nối máy chủ. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  // 3. FORGOT PASSWORD: RESET WITH LOGIN PASSWORD
  const handleForgotReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!primaryPassword.trim()) {
      setErrorMsg(isEn ? 'Please enter your account login password' : 'Vui lòng nhập Mật khẩu đăng nhập tài khoản của bạn');
      return;
    }
    if (!newPassword.trim() || newPassword.trim().length < 4) {
      setErrorMsg(isEn ? 'New secondary password must be at least 4 characters' : 'Mật khẩu cấp 2 mới phải có ít nhất 4 ký tự');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg(isEn ? 'Password confirmation does not match' : 'Mật khẩu xác nhận không khớp');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/auth/secondary-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reset-with-login-password',
          primaryPassword: primaryPassword.trim(),
          newSecondaryPassword: newPassword.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        sessionStorage.setItem('simply_sec_pw_unlocked', 'true');
        sessionStorage.setItem('simply_sec_pw_time', String(Date.now()));
        onSuccess();
      } else {
        setErrorMsg(data.error || (isEn ? 'Primary password authentication failed' : 'Xác thực mật khẩu chính thất bại'));
      }
    } catch {
      setErrorMsg(isEn ? 'Server connection error. Please try again.' : 'Lỗi kết nối máy chủ. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header with gradient and shield icon */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-blue-900 via-indigo-900 to-purple-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-blue-300 shadow-inner">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="px-2 py-0.5 rounded-full bg-blue-500/30 text-blue-200 border border-blue-400/30 text-[10px] font-extrabold uppercase tracking-wider">{isEn ? 'Secondary Security' : 'Bảo Mật Cấp 2'}</span>
              </div>
              <h3 className="font-extrabold text-base text-white mt-0.5">
                {currentMode === 'verify' && (isEn ? 'Verify Secondary Password' : 'Xác Thực Mật Khẩu Cấp 2')}
                {currentMode === 'set' && (isEn ? 'Set Secondary Password' : 'Thiết Lập Mật Khẩu Cấp 2')}
                {currentMode === 'change' && (isEn ? 'Change Secondary Password' : 'Đổi Mật Khẩu Cấp 2')}
                {currentMode === 'forgot' && (isEn ? 'Recover Secondary Password' : 'Khôi Phục Mật Khẩu Cấp 2')}
              </h3>
            </div>
          </div>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded-2xl text-rose-700 dark:text-rose-300 text-xs font-bold flex items-center gap-2 animate-in fade-in">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* 1. MODE: VERIFY */}
          {currentMode === 'verify' && (
            <form onSubmit={handleVerify} className="space-y-4">
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                {isEn ? 'Enter your dedicated secondary password to unlock and manage IT password credentials safely.' : 'Nhập Mật khẩu cấp 2 riêng của tài khoản bạn để mở khóa và quản lý kho mật khẩu IT an toàn.'}
              </p>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                  <span>Mật khẩu cấp 2 (*)</span>
                  <button
                    type="button"
                    onClick={() => setCurrentMode('change')}
                    className="text-[11px] text-blue-600 hover:text-blue-700 font-semibold hover:underline cursor-pointer"
                  >{isEn ? 'Change secondary password' : 'Đổi mật khẩu cấp 2'}</button>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    autoFocus
                    required
                    placeholder={isEn ? 'Enter your secondary password...' : 'Nhập mật khẩu cấp 2 của bạn...'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-mono outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Remember in session checkbox */}
              <label className="flex items-center gap-2 cursor-pointer p-2.5 bg-blue-50/60 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900 rounded-2xl">
                <input
                  type="checkbox"
                  checked={rememberSession}
                  onChange={(e) => setRememberSession(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded cursor-pointer accent-blue-600"
                />
                <span className="text-xs font-bold text-blue-950 dark:text-blue-200">{isEn ? 'Remember secondary password for this session' : 'Ghi nhớ mật khẩu cấp 2 trong phiên làm việc này'}</span>
              </label>

              {/* Forgot link */}
              <div className="p-3 bg-amber-50/70 dark:bg-amber-950/40 rounded-2xl border border-amber-200/80 dark:border-amber-800/60 text-xs flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-amber-900 dark:text-amber-200 font-medium text-[11.5px]">
                  <HelpCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>{isEn ? 'Forgot secondary password?' : 'Quên mật khẩu cấp 2?'}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setCurrentMode('forgot')}
                  className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-[11px] cursor-pointer shrink-0 shadow-2xs transition-colors"
                >{isEn ? 'Recover Now' : 'Khôi phục ngay'}</button>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                {onClose && (
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                  >{isEn ? 'Cancel' : 'Hủy'}</button>
                )}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-2xl text-xs font-bold shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>{isLoading ? (isEn ? 'Verifying...' : 'Đang xác thực...') : (isEn ? 'Unlock Password Vault' : 'Mở Khóa Kho Mật Khẩu')}</span>
                </button>
              </div>
            </form>
          )}

          {/* 2. MODE: SET OR CHANGE */}
          {(currentMode === 'set' || currentMode === 'change') && (
            <form onSubmit={handleSetOrChange} className="space-y-3.5">
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                {currentMode === 'set'
                  ? isEn ? 'Your account does not have a secondary password. Please set one up to protect your credentials.' : 'Tài khoản của bạn chưa có Mật khẩu cấp 2. Hãy tạo một mật khẩu cấp 2 riêng để bảo vệ các mật khẩu của bạn.'
                  : isEn ? 'Change secondary password for your account.' : 'Đổi mật khẩu cấp 2 của riêng tài khoản bạn.'}
              </p>

              {currentMode === 'change' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">{isEn ? 'Current Secondary Password (*)' : 'Mật khẩu cấp 2 hiện tại (*)'}</label>
                  <div className="relative">
                    <input
                      type={showCurrentPassword ? 'text' : 'password'}
                      required
                      placeholder={isEn ? 'Enter old secondary password...' : 'Nhập mật khẩu cấp 2 cũ...'}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full pl-3.5 pr-10 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-mono outline-none font-bold"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                    >
                      {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">{isEn ? 'New Secondary Password (Min 4 chars) (*)' : 'Mật khẩu cấp 2 mới (Tối thiểu 4 ký tự) (*)'}</label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    placeholder={isEn ? 'Enter new secondary password...' : 'Nhập mật khẩu cấp 2 mới...'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full pl-3.5 pr-10 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-mono outline-none font-bold"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">{isEn ? 'Confirm New Secondary Password (*)' : 'Xác nhận lại mật khẩu cấp 2 mới (*)'}</label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    placeholder={isEn ? 'Re-enter new secondary password...' : 'Nhập lại mật khẩu cấp 2 mới...'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-3.5 pr-10 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-mono outline-none font-bold"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between gap-2">
                {hasSecondaryPassword && (
                  <button
                    type="button"
                    onClick={() => setCurrentMode('verify')}
                    className="text-xs font-bold text-slate-600 hover:underline cursor-pointer"
                  >{isEn ? 'Back to Verify' : 'Quay lại Xác thực'}</button>
                )}
                <div className="flex items-center gap-2 ml-auto">
                  {onClose && (
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                    >{isEn ? 'Cancel' : 'Hủy'}</button>
                  )}
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-2xl text-xs font-bold shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>{isLoading ? (isEn ? 'Saving...' : 'Đang lưu...') : (currentMode === 'set' ? (isEn ? 'Create Secondary Password' : 'Tạo Mật Khẩu Cấp 2') : (isEn ? 'Save New Password' : 'Lưu Mật Khẩu Mới'))}</span>
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* 3. MODE: FORGOT / SELF RESET */}
          {currentMode === 'forgot' && (
            <form onSubmit={handleForgotReset} className="space-y-3.5">
              <div className="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-2xl border border-blue-200 dark:border-blue-800 text-xs text-blue-900 dark:text-blue-200">
                {isEn ? '💡 Self Recovery: Enter your account login password to verify your identity and reset your secondary password immediately.' : '💡 Tự Khôi Phục: Nhập Mật khẩu đăng nhập tài khoản của bạn để xác minh danh tính và tạo lại Mật khẩu cấp 2 mới ngay lập tức.'}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">{isEn ? 'Your Account Login Password (*)' : 'Mật khẩu đăng nhập tài khoản của bạn (*)'}</label>
                <div className="relative">
                  <input
                    type={showPrimaryPassword ? 'text' : 'password'}
                    required
                    placeholder={isEn ? 'Enter login password...' : 'Nhập mật khẩu đăng nhập...'}
                    value={primaryPassword}
                    onChange={(e) => setPrimaryPassword(e.target.value)}
                    className="w-full pl-3.5 pr-10 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-mono outline-none font-bold"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPrimaryPassword(!showPrimaryPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    {showPrimaryPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">{isEn ? 'NEW Secondary Password to Set (*)' : 'Mật khẩu cấp 2 MỚI muốn đặt (*)'}</label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    placeholder={isEn ? 'Minimum 4 characters...' : 'Tối thiểu 4 ký tự...'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full pl-3.5 pr-10 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-mono outline-none font-bold"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">{isEn ? 'Confirm NEW Secondary Password (*)' : 'Xác nhận lại Mật khẩu cấp 2 MỚI (*)'}</label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    placeholder={isEn ? 'Re-enter new secondary password...' : 'Nhập lại mật khẩu cấp 2 mới...'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-3.5 pr-10 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-mono outline-none font-bold"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentMode('verify')}
                  className="text-xs font-bold text-slate-600 hover:underline cursor-pointer"
                >{isEn ? 'Back' : 'Quay lại'}</button>
                <div className="flex items-center gap-2 ml-auto">
                  {onClose && (
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                    >{isEn ? 'Cancel' : 'Hủy'}</button>
                  )}
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="px-5 py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white rounded-2xl text-xs font-bold shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>{isLoading ? (isEn ? 'Verifying...' : 'Đang xác thực...') : (isEn ? 'Recover & Unlock' : 'Khôi Phục & Mở Khóa')}</span>
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
