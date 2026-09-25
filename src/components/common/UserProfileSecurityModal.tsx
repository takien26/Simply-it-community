'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  User as UserIcon,
  KeyRound,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Laptop,
  Building2,
  Briefcase,
  Mail,
  Phone,
  Clock,
  Loader2,
  Check,
  Info,
} from 'lucide-react';
import { useLanguage } from '@/lib/i18n/context';

export interface OpenProfileModalDetail {
  tab?: 'profile' | 'password' | 'security';
}

export function openUserProfileModal(detail?: OpenProfileModalDetail) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('simply:open-profile-modal', { detail }));
  }
}

export function UserProfileSecurityModal() {
  const { language } = useLanguage();
  const isEn = language === 'en';
  const isJa = language === 'ja';

  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'password' | 'security'>('profile');
  const [userData, setUserData] = useState<any>(null);
  const [loadingUser, setLoadingUser] = useState(false);

  // Password form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submittingPassword, setSubmittingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

  const fetchUserData = async () => {
    setLoadingUser(true);
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const json = await res.json();
        if (json?.data) {
          setUserData(json.data);
        }
      }
    } catch (err) {
      console.error('Failed to load user profile:', err);
    } finally {
      setLoadingUser(false);
    }
  };

  useEffect(() => {
    const handleOpen = (e: Event) => {
      const customEvent = e as CustomEvent<OpenProfileModalDetail>;
      if (customEvent?.detail?.tab) {
        setActiveTab(customEvent.detail.tab);
      } else {
        setActiveTab('profile');
      }
      setPasswordError(null);
      setPasswordSuccess(null);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setIsOpen(true);
      fetchUserData();
    };

    window.addEventListener('simply:open-profile-modal', handleOpen);
    return () => {
      window.removeEventListener('simply:open-profile-modal', handleOpen);
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  if (!isOpen) return null;

  const authProvider: 'LOCAL' | 'SSO' | 'LDAP' = userData?.authProvider || 'LOCAL';
  const isDefaultPassword = userData?.isDefaultPassword === true;

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (!currentPassword || !newPassword) {
      setPasswordError(
        isJa
          ? '現在のパスワードと新しいパスワードを入力してください。'
          : isEn
          ? 'Please enter both current and new password.'
          : 'Vui lòng nhập đầy đủ mật khẩu hiện tại và mật khẩu mới.'
      );
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError(
        isJa
          ? '新しいパスワードは6文字以上である必要があります。'
          : isEn
          ? 'New password must be at least 6 characters long.'
          : 'Mật khẩu mới phải có tối thiểu 6 ký tự.'
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError(
        isJa
          ? '新しいパスワードと確認用パスワードが一致しません。'
          : isEn
          ? 'New password and confirmation do not match.'
          : 'Mật khẩu mới và xác nhận mật khẩu không khớp nhau.'
      );
      return;
    }

    if (currentPassword === newPassword) {
      setPasswordError(
        isJa
          ? '新しいパスワードは現在のパスワードと異なる必要があります。'
          : isEn
          ? 'New password cannot be the same as current password.'
          : 'Mật khẩu mới không được trùng với mật khẩu hiện tại.'
      );
      return;
    }

    setSubmittingPassword(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        setPasswordError(json?.error || 'Đổi mật khẩu thất bại');
      } else {
        setPasswordSuccess(
          json?.message ||
            (isJa
              ? 'パスワードが正常に変更されました！'
              : isEn
              ? 'Password changed successfully!'
              : 'Đổi mật khẩu thành công! Mật khẩu mới đã được cập nhật.')
        );
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');

        // Notify app and dismiss banner
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('simply:dismiss-default-pwd-banner', 'true');
          window.dispatchEvent(new CustomEvent('simply:password-changed'));
        }

        // Refresh user profile state
        fetchUserData();
      }
    } catch {
      setPasswordError(
        isJa
          ? '通信エラーが発生しました。接続を確認してください。'
          : isEn
          ? 'Network error. Please check your connection.'
          : 'Lỗi kết nối máy chủ. Vui lòng thử lại.'
      );
    } finally {
      setSubmittingPassword(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
      >
        {/* Header with User Info Card */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white relative shrink-0">
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="absolute top-4 right-4 p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-700/60 transition-colors cursor-pointer"
            title="Đóng (Esc)"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3.5 sm:gap-4 pr-8">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-extrabold text-lg sm:text-xl shadow-lg border border-white/20 shrink-0">
              {userData?.fullName?.charAt(0) || <UserIcon className="w-6 h-6" />}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-extrabold text-white truncate">
                  {userData?.fullName || (isEn ? 'Loading user...' : 'Đang tải người dùng...')}
                </h3>

                {/* Identity Provider Badge */}
                {authProvider === 'SSO' ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-500/20 text-blue-300 border border-blue-400/40">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                    Microsoft 365 (SSO)
                  </span>
                ) : authProvider === 'LDAP' ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-500/20 text-purple-300 border border-purple-400/40">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
                    Windows Domain (LDAP)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/40">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    Local Account
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 sm:gap-3 text-xs text-slate-300 mt-1 flex-wrap font-mono">
                <span className="truncate">{userData?.email || 'user@simplyit.local'}</span>
                <span className="text-slate-500">•</span>
                <span className="text-amber-400 font-bold">{userData?.role?.name || 'Administrator'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-200 bg-slate-50/80 px-4 pt-2 gap-2 shrink-0 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`flex items-center gap-2 px-3.5 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'profile'
                ? 'border-blue-600 text-blue-600 bg-white rounded-t-xl shadow-xs'
                : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-t-xl'
            }`}
          >
            <UserIcon className="w-4 h-4" />
            <span>{isJa ? '基本情報' : isEn ? 'Profile Info' : 'Thông tin cá nhân'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('password')}
            className={`flex items-center gap-2 px-3.5 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap relative ${
              activeTab === 'password'
                ? 'border-blue-600 text-blue-600 bg-white rounded-t-xl shadow-xs'
                : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-t-xl'
            }`}
          >
            <KeyRound className="w-4 h-4" />
            <span>{isJa ? 'パスワード変更' : isEn ? 'Change Password' : 'Đổi mật khẩu'}</span>
            {isDefaultPassword && (
              <span className="w-2 h-2 rounded-full bg-amber-500 ring-2 ring-white animate-ping" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('security')}
            className={`flex items-center gap-2 px-3.5 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'security'
                ? 'border-blue-600 text-blue-600 bg-white rounded-t-xl shadow-xs'
                : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-t-xl'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>{isJa ? 'セキュリティ状態' : isEn ? 'Security & Sessions' : 'Bảo mật & Phiên'}</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
          {loadingUser && !userData ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-2 text-slate-500">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              <p className="text-xs">{isEn ? 'Loading information...' : 'Đang tải thông tin...'}</p>
            </div>
          ) : null}

          {/* TAB 1: PROFILE INFO */}
          {activeTab === 'profile' && userData && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                  <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1.5">
                    <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                    <span>{isJa ? '氏名' : isEn ? 'Full Name' : 'Họ và tên'}</span>
                  </span>
                  <p className="text-sm font-bold text-slate-900">{userData.fullName || '—'}</p>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                  <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span>Email</span>
                  </span>
                  <p className="text-sm font-bold text-slate-900 font-mono truncate">{userData.email || '—'}</p>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                  <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-slate-400" />
                    <span>{isJa ? '所属部門' : isEn ? 'Department' : 'Phòng ban'}</span>
                  </span>
                  <p className="text-sm font-bold text-slate-900">{userData.department || '—'}</p>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                  <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                    <span>{isJa ? '役職' : isEn ? 'Position' : 'Chức vụ'}</span>
                  </span>
                  <p className="text-sm font-bold text-slate-900">{userData.position || '—'}</p>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                  <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{isJa ? '電話番号' : isEn ? 'Phone' : 'Số điện thoại'}</span>
                  </span>
                  <p className="text-sm font-bold text-slate-900 font-mono">{userData.phone || '—'}</p>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                  <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                    <span>{isJa ? 'システム権限' : isEn ? 'Assigned Role' : 'Vai trò / Nhóm quyền'}</span>
                  </span>
                  <p className="text-sm font-bold text-blue-600">{userData.role?.name || 'Administrator'}</p>
                </div>
              </div>

              {userData.manager && (
                <div className="p-3.5 bg-blue-50/60 rounded-xl border border-blue-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                      {userData.manager.fullName?.charAt(0) || 'M'}
                    </div>
                    <div>
                      <p className="text-[11px] text-blue-700 font-medium">{isEn ? 'Direct Manager' : 'Quản lý trực tiếp'}</p>
                      <p className="text-xs font-bold text-slate-900">{userData.manager.fullName}</p>
                    </div>
                  </div>
                  <span className="text-xs text-slate-500 font-mono">{userData.manager.email}</span>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: CHANGE PASSWORD */}
          {activeTab === 'password' && (
            <div className="space-y-4">
              {/* CASE 1: LOCAL ACCOUNT */}
              {authProvider === 'LOCAL' && (
                <form onSubmit={handleChangePassword} className="space-y-4">
                  {isDefaultPassword && (
                    <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 flex items-start gap-2.5 text-amber-900 text-xs">
                      <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold block">
                          {isJa
                            ? '初期パスワードの変更が必要です'
                            : isEn
                            ? 'Default password change recommended'
                            : 'Đang dùng mật khẩu khởi tạo ban đầu (Admin@123)'}
                        </span>
                        <p className="text-[11px] text-amber-800/90 mt-0.5">
                          {isJa
                            ? 'セキュリティ強化のため、今すぐ固有の安全なパスワードに変更してください。変更後は警告バナーが自動的に非表示になります。'
                            : isEn
                            ? 'Please update to a secure personal password. Once changed, the warning banner will immediately disappear.'
                            : 'Vui lòng đổi sang mật khẩu an toàn riêng của bạn. Ngay sau khi đổi thành công, biểu ngữ cảnh báo trên hệ thống sẽ tự động biến mất vĩnh viễn.'}
                        </p>
                      </div>
                    </div>
                  )}

                  {passwordError && (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-semibold flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>{passwordError}</span>
                    </div>
                  )}

                  {passwordSuccess && (
                    <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-semibold flex items-center gap-2.5">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                      <div>
                        <span className="font-bold block">{passwordSuccess}</span>
                        <span className="text-[11px] text-emerald-700 font-normal">
                          {isEn ? 'Your credentials are now secured.' : 'Mật khẩu mới đã được lưu vào hệ thống an toàn.'}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="space-y-3.5">
                    {/* Current Password */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        {isJa ? '現在のパスワード' : isEn ? 'Current Password' : 'Mật khẩu hiện tại'} <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type={showCurrent ? 'text' : 'password'}
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full pl-9.5 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-mono text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrent(!showCurrent)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* New Password */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        {isJa ? '新しいパスワード' : isEn ? 'New Password' : 'Mật khẩu mới'} <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type={showNew ? 'text' : 'password'}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full pl-9.5 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-mono text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                          required
                          minLength={6}
                        />
                        <button
                          type="button"
                          onClick={() => setShowNew(!showNew)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">
                        {isEn ? 'Minimum 6 characters. Use letters, numbers & symbols.' : 'Tối thiểu 6 ký tự. Nên kết hợp chữ hoa, chữ thường, số và ký tự đặc biệt.'}
                      </p>
                    </div>

                    {/* Confirm New Password */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        {isJa ? '新しいパスワードの確認' : isEn ? 'Confirm New Password' : 'Xác nhận mật khẩu mới'} <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <CheckCircle2 className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type={showConfirm ? 'text' : 'password'}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full pl-9.5 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-mono text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                          required
                          minLength={6}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirm(!showConfirm)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsOpen(false)}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                      {isEn ? 'Cancel' : 'Hủy bỏ'}
                    </button>

                    <button
                      type="submit"
                      disabled={submittingPassword}
                      className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {submittingPassword ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Check className="w-4 h-4" />
                      )}
                      <span>
                        {submittingPassword
                          ? isEn
                            ? 'Updating...'
                            : 'Đang lưu...'
                          : isEn
                          ? 'Update Password'
                          : 'Lưu thay đổi mật khẩu'}
                      </span>
                    </button>
                  </div>
                </form>
              )}

              {/* CASE 2: SSO ACCOUNT (MICROSOFT 365 / GOOGLE) */}
              {authProvider === 'SSO' && (
                <div className="p-4 sm:p-5 bg-blue-50/60 border border-blue-200 rounded-2xl space-y-4">
                  <div className="flex items-start gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-md">
                      <Laptop className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-sm text-blue-950">
                        {isJa
                          ? 'Microsoft 365 (SSO) アカウントで管理されています'
                          : isEn
                          ? 'Managed by Microsoft 365 / SSO'
                          : 'Tài khoản SSO Doanh Nghiệp (Microsoft 365 / Entra ID)'}
                      </h4>
                      <p className="text-xs text-blue-800/90 mt-1 leading-relaxed">
                        {isJa
                          ? 'あなたのアカウントは組織のMicrosoft 365シングルサインオンで認証されています。Simply ITはログインパスワードを直接保持していません。'
                          : isEn
                          ? 'Your account is authenticated via your organization Microsoft 365 Single Sign-On. Simply IT does not store your login password.'
                          : 'Tài khoản của bạn đăng nhập qua Single Sign-On (SSO). Mật khẩu được quản lý và bảo vệ bởi dịch vụ Microsoft 365 của cơ quan/doanh nghiệp. Simply IT không trực tiếp lưu trữ hay thay đổi mật khẩu này.'}
                      </p>
                    </div>
                  </div>

                  <div className="p-3 bg-white/80 rounded-xl border border-blue-100 text-xs text-slate-700 space-y-2">
                    <p className="font-bold text-slate-900 flex items-center gap-1.5">
                      <Info className="w-3.5 h-3.5 text-blue-600" />
                      <span>{isEn ? 'How to change your password:' : 'Hướng dẫn đổi mật khẩu:'}</span>
                    </p>
                    <ol className="list-decimal list-inside space-y-1 text-[11.5px] text-slate-600 pl-1">
                      <li>
                        {isEn
                          ? 'Click the button below to open Microsoft My Account portal.'
                          : 'Bấm nút bên dưới để mở trang Quản lý tài khoản Microsoft (My Account).'}
                      </li>
                      <li>
                        {isEn
                          ? 'Navigate to "Security info" or "Password" section to update.'
                          : 'Chọn mục "Bảo mật & Mật khẩu" (Security info / Password) để đổi.'}
                      </li>
                      <li>
                        {isEn
                          ? 'Your new password will take effect immediately upon next login.'
                          : 'Mật khẩu mới sẽ tự động có hiệu lực ngay ở lần đăng nhập Simply IT kế tiếp.'}
                      </li>
                    </ol>
                  </div>

                  <a
                    href="https://myaccount.microsoft.com/"
                    target="_blank"
                    rel="noreferrer noopener"
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer"
                  >
                    <span>
                      {isJa
                        ? 'Microsoft アカウント管理ページを開く'
                        : isEn
                        ? 'Open Microsoft My Account Portal'
                        : 'Mở trang quản lý tài khoản Microsoft ↗'}
                    </span>
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              )}

              {/* CASE 3: LDAP / ACTIVE DIRECTORY DOMAIN */}
              {authProvider === 'LDAP' && (
                <div className="p-4 sm:p-5 bg-purple-50/60 border border-purple-200 rounded-2xl space-y-4">
                  <div className="flex items-start gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-purple-700 text-white flex items-center justify-center shrink-0 shadow-md">
                      <Shield className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-sm text-purple-950">
                        {isJa
                          ? 'Windows ドメイン (LDAP / Active Directory) アカウント'
                          : isEn
                          ? 'Windows Active Directory / LDAP Domain Account'
                          : 'Tài khoản Windows Domain Controller (LDAP / AD)'}
                      </h4>
                      <p className="text-xs text-purple-800/90 mt-1 leading-relaxed">
                        {isJa
                          ? 'このアカウントのパスワードは社内のWindows Server Active Directoryドメインコントローラーで集中管理されています。'
                          : isEn
                          ? 'This account password is centrally managed by your corporate Windows Server Active Directory Domain Controller.'
                          : 'Mật khẩu của tài khoản này được đồng bộ và xác thực tập trung từ hệ thống máy chủ thư mục Active Directory (AD DS) của doanh nghiệp.'}
                      </p>
                    </div>
                  </div>

                  <div className="p-3.5 bg-white/90 rounded-xl border border-purple-100 text-xs text-slate-700 space-y-2.5">
                    <p className="font-bold text-slate-900 flex items-center gap-1.5">
                      <Laptop className="w-4 h-4 text-purple-600" />
                      <span>{isEn ? 'Instructions to change your domain password:' : 'Các bước đổi mật khẩu Domain:'}</span>
                    </p>
                    <div className="space-y-2 text-[11.5px] text-slate-700 pl-1">
                      <div className="flex items-start gap-2">
                        <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-700 font-bold flex items-center justify-center text-[10px] shrink-0">1</span>
                        <span>
                          Trên máy tính Windows kết nối mạng nội bộ công ty (hoặc qua VPN), nhấn tổ hợp phím{' '}
                          <kbd className="px-1.5 py-0.5 bg-slate-200 border border-slate-300 rounded font-mono font-bold text-slate-800 text-[10px]">
                            Ctrl + Alt + Del
                          </kbd>
                        </span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-700 font-bold flex items-center justify-center text-[10px] shrink-0">2</span>
                        <span>
                          Chọn <strong>Đổi mật khẩu (Change a password)</strong>, nhập mật khẩu cũ và mật khẩu mới.
                        </span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-700 font-bold flex items-center justify-center text-[10px] shrink-0">3</span>
                        <span>
                          Sau khi Windows xác nhận thành công, mật khẩu mới sẽ tự động đồng bộ ngay lập tức cho Simply IT.
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: SECURITY & SESSIONS */}
          {activeTab === 'security' && (
            <div className="space-y-4">
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
                <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>{isJa ? 'アカウント保護レベル' : isEn ? 'Account Protection Level' : 'Mức độ bảo vệ tài khoản'}</span>
                </span>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600">{isEn ? 'Authentication Type:' : 'Phương thức xác thực:'}</span>
                  <span className="font-bold text-slate-900">{authProvider}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600">{isEn ? 'Password Status:' : 'Trạng thái mật khẩu:'}</span>
                  {isDefaultPassword ? (
                    <span className="text-amber-600 font-bold flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>{isEn ? 'Default Password' : 'Đang dùng mật khẩu mặc định'}</span>
                    </span>
                  ) : (
                    <span className="text-emerald-600 font-bold flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" />
                      <span>{isEn ? 'Secure (Changed)' : 'An toàn (Đã đổi mật khẩu)'}</span>
                    </span>
                  )}
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-2 text-xs">
                <span className="font-bold text-slate-900 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-blue-600" />
                  <span>{isEn ? 'Current Session' : 'Phiên đăng nhập hiện tại'}</span>
                </span>
                <p className="text-[11.5px] text-slate-600">
                  {isEn
                    ? 'Authenticated via HttpOnly JWT Cookie with secure same-site protection.'
                    : 'Phiên làm việc được bảo vệ bằng HttpOnly JWT Cookie, mã hóa chống tấn công XSS và CSRF.'}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
