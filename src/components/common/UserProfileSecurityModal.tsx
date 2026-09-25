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
  Globe,
  Sparkles,
  CheckCheck,
} from 'lucide-react';
import { useLanguage } from '@/lib/i18n/context';
import { Language } from '@/lib/i18n/locales';

export interface OpenProfileModalDetail {
  tab?: 'profile' | 'password' | 'security';
}

export function openUserProfileModal(detail?: OpenProfileModalDetail) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('simply:open-profile-modal', { detail }));
  }
}

function getPasswordStrength(password: string) {
  if (!password) return { score: 0, labelVi: '', labelEn: '', labelJa: '', color: '', text: '' };
  let score = 0;
  if (password.length >= 6) score++;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/\d/.test(password) || /[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 1) {
    return { score: 1, labelVi: 'Yếu', labelEn: 'Weak', labelJa: '弱い', color: 'bg-rose-500', text: 'text-rose-500' };
  }
  if (score <= 3) {
    return { score: 2, labelVi: 'Trung bình', labelEn: 'Fair', labelJa: '普通', color: 'bg-amber-500', text: 'text-amber-500' };
  }
  return { score: 3, labelVi: 'Mạnh & An toàn', labelEn: 'Strong', labelJa: '強力', color: 'bg-emerald-500', text: 'text-emerald-500' };
}

const LANGUAGES_CONFIG = [
  { code: 'vi' as Language, label: 'Tiếng Việt', sub: 'Việt Nam', flag: '🇻🇳' },
  { code: 'en' as Language, label: 'English', sub: 'Global', flag: '🇬🇧' },
  { code: 'ja' as Language, label: '日本語', sub: 'Japanese', flag: '🇯🇵' },
];

export function UserProfileSecurityModal() {
  const { language, setLanguage, isEn, isJa } = useLanguage();

  const txt = (viText: string, enText: string, jaText?: string) => {
    if (isJa) return jaText || enText;
    if (isEn) return enText;
    return viText;
  };

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

  const pwdStrength = getPasswordStrength(newPassword);

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
        txt(
          'Vui lòng nhập đầy đủ mật khẩu hiện tại và mật khẩu mới.',
          'Please enter both current and new password.',
          '現在のパスワードと新しいパスワードを入力してください。'
        )
      );
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError(
        txt(
          'Mật khẩu mới phải có tối thiểu 6 ký tự.',
          'New password must be at least 6 characters long.',
          '新しいパスワードは6文字以上である必要があります。'
        )
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError(
        txt(
          'Mật khẩu mới và xác nhận mật khẩu không khớp nhau.',
          'New password and confirmation do not match.',
          '新しいパスワードと確認用パスワードが一致しません。'
        )
      );
      return;
    }

    if (currentPassword === newPassword) {
      setPasswordError(
        txt(
          'Mật khẩu mới không được trùng với mật khẩu hiện tại.',
          'New password cannot be the same as current password.',
          '新しいパスワードは現在のパスワードと異なる必要があります。'
        )
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
        setPasswordError(json?.error || txt('Đổi mật khẩu thất bại', 'Failed to change password', 'パスワードの変更に失敗しました'));
      } else {
        setPasswordSuccess(
          json?.message ||
            txt(
              'Đổi mật khẩu thành công! Mật khẩu mới đã được cập nhật.',
              'Password changed successfully! Your new password has been updated.',
              'パスワードが正常に変更されました！'
            )
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
        txt(
          'Lỗi kết nối máy chủ. Vui lòng kiểm tra lại đường truyền mạng.',
          'Network connection error. Please check your network.',
          '通信エラーが発生しました。接続を確認してください。'
        )
      );
    } finally {
      setSubmittingPassword(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
      >
        {/* Header with User Info Card */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 text-white relative shrink-0 border-b border-white/10">
          {/* Top action row: Language Picker & Close button */}
          <div className="absolute top-3.5 right-3.5 flex items-center gap-1.5 z-10">
            {/* Quick Language Switcher Pills */}
            <div className="flex items-center bg-white/10 backdrop-blur-md rounded-xl p-0.5 border border-white/15">
              {LANGUAGES_CONFIG.map((lang) => {
                const isActive = language === lang.code;
                return (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => setLanguage(lang.code)}
                    title={lang.label}
                    className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-300 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <span>{lang.flag}</span>
                    <span className="text-[11px] uppercase tracking-wider">{lang.code}</span>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/15 transition-colors cursor-pointer"
              title={txt('Đóng (Esc)', 'Close (Esc)', '閉じる (Esc)')}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center gap-3.5 sm:gap-4 pr-32 sm:pr-36 pt-1">
            <div className="w-13 h-13 sm:w-15 sm:h-15 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center text-white font-black text-xl sm:text-2xl shadow-xl border-2 border-white/25 shrink-0 select-none">
              {userData?.fullName?.charAt(0) || <UserIcon className="w-7 h-7" />}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-black text-white truncate tracking-tight">
                  {userData?.fullName || txt('Đang tải người dùng...', 'Loading user...', '読み込み中...')}
                </h3>

                {/* Identity Provider Badge */}
                {authProvider === 'SSO' ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-500/20 text-blue-300 border border-blue-400/40">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                    Microsoft 365 (SSO)
                  </span>
                ) : authProvider === 'LDAP' ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-500/20 text-purple-300 border border-purple-400/40">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
                    Windows Domain (LDAP)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/40">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    Local Account
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 sm:gap-3 text-xs text-slate-300 mt-1 flex-wrap font-mono">
                <span className="truncate">{userData?.email || 'user@company.com'}</span>
                <span className="text-slate-500">•</span>
                <span className="text-amber-300 font-bold bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-400/20">
                  {userData?.role?.name || 'Administrator'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 px-4 pt-2 gap-2 shrink-0 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap rounded-t-xl ${
              activeTab === 'profile'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-800 shadow-xs'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/50'
            }`}
          >
            <UserIcon className="w-4 h-4" />
            <span>{txt('Thông tin cá nhân', 'Profile Info', '基本情報')}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('password')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap relative rounded-t-xl ${
              activeTab === 'password'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-800 shadow-xs'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/50'
            }`}
          >
            <KeyRound className="w-4 h-4" />
            <span>{txt('Đổi mật khẩu', 'Change Password', 'パスワード変更')}</span>
            {isDefaultPassword && (
              <span className="w-2 h-2 rounded-full bg-amber-500 ring-2 ring-white dark:ring-slate-900 animate-ping" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('security')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap rounded-t-xl ${
              activeTab === 'security'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-800 shadow-xs'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/50'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>{txt('Bảo mật & Phiên', 'Security & Sessions', 'セキュリティ状態')}</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
          {loadingUser && !userData ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-2 text-slate-500">
              <Loader2 className="w-7 h-7 animate-spin text-blue-600" />
              <p className="text-xs font-medium">{txt('Đang tải thông tin tài khoản...', 'Loading account information...', 'アカウント情報を読み込み中...')}</p>
            </div>
          ) : null}

          {/* TAB 1: PROFILE INFO */}
          {activeTab === 'profile' && userData && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-1">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5 uppercase tracking-wider">
                    <UserIcon className="w-3.5 h-3.5 text-blue-500" />
                    <span>{txt('Họ và tên', 'Full Name', '氏名')}</span>
                  </span>
                  <p className="text-sm font-extrabold text-slate-900 dark:text-white">{userData.fullName || '—'}</p>
                </div>

                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-1">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5 uppercase tracking-wider">
                    <Mail className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Email</span>
                  </span>
                  <p className="text-sm font-bold text-slate-900 dark:text-white font-mono truncate">{userData.email || '—'}</p>
                </div>

                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-1">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5 uppercase tracking-wider">
                    <Building2 className="w-3.5 h-3.5 text-purple-500" />
                    <span>{txt('Phòng ban', 'Department', '所属部門')}</span>
                  </span>
                  <p className="text-sm font-extrabold text-slate-900 dark:text-white">{userData.department || '—'}</p>
                </div>

                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-1">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5 uppercase tracking-wider">
                    <Briefcase className="w-3.5 h-3.5 text-amber-500" />
                    <span>{txt('Chức vụ', 'Position', '役職')}</span>
                  </span>
                  <p className="text-sm font-extrabold text-slate-900 dark:text-white">{userData.position || '—'}</p>
                </div>

                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-1">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5 uppercase tracking-wider">
                    <Phone className="w-3.5 h-3.5 text-emerald-500" />
                    <span>{txt('Số điện thoại', 'Phone', '電話番号')}</span>
                  </span>
                  <p className="text-sm font-bold text-slate-900 dark:text-white font-mono">{userData.phone || '—'}</p>
                </div>

                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-1">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5 uppercase tracking-wider">
                    <ShieldCheck className="w-3.5 h-3.5 text-teal-500" />
                    <span>{txt('Vai trò / Nhóm quyền', 'Assigned Role', 'システム権限')}</span>
                  </span>
                  <p className="text-sm font-extrabold text-blue-600 dark:text-blue-400">{userData.role?.name || 'Administrator'}</p>
                </div>
              </div>

              {userData.manager && (
                <div className="p-3.5 bg-blue-50/70 dark:bg-blue-950/30 rounded-2xl border border-blue-100 dark:border-blue-900/50 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-md">
                      {userData.manager.fullName?.charAt(0) || 'M'}
                    </div>
                    <div>
                      <p className="text-[11px] text-blue-700 dark:text-blue-400 font-semibold uppercase tracking-wider">{txt('Quản lý trực tiếp', 'Direct Manager', '直属の上長')}</p>
                      <p className="text-xs font-bold text-slate-900 dark:text-white">{userData.manager.fullName}</p>
                    </div>
                  </div>
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">{userData.manager.email}</span>
                </div>
              )}

              {/* Dedicated Language Selector Card in Profile */}
              <div className="p-4 bg-gradient-to-br from-slate-50 to-blue-50/40 dark:from-slate-800/60 dark:to-slate-800/30 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-blue-600/10 text-blue-600 dark:text-blue-400">
                      <Globe className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                        {txt('Ngôn ngữ giao diện', 'Display Language', '表示言語設定')}
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {txt(
                          'Chọn ngôn ngữ ưu tiên khi làm việc trên Simply IT',
                          'Select your preferred language across Simply IT',
                          'Simply ITで使用する優先言語を選択してください'
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2.5 pt-1">
                  {LANGUAGES_CONFIG.map((lang) => {
                    const isSelected = language === lang.code;
                    return (
                      <button
                        key={lang.code}
                        type="button"
                        onClick={() => setLanguage(lang.code)}
                        className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer relative ${
                          isSelected
                            ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20 ring-2 ring-blue-500/30'
                            : 'bg-white dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-slate-800'
                        }`}
                      >
                        <span className="text-xl">{lang.flag}</span>
                        <span className="text-xs font-extrabold">{lang.label}</span>
                        <span className={`text-[10px] ${isSelected ? 'text-blue-100' : 'text-slate-400 dark:text-slate-500'}`}>
                          {lang.sub}
                        </span>
                        {isSelected && (
                          <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-white text-blue-600 flex items-center justify-center">
                            <CheckCheck className="w-3 h-3" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: CHANGE PASSWORD */}
          {activeTab === 'password' && (
            <div className="space-y-4">
              {/* CASE 1: LOCAL ACCOUNT */}
              {authProvider === 'LOCAL' && (
                <form onSubmit={handleChangePassword} className="space-y-4">
                  {isDefaultPassword && (
                    <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 rounded-2xl border border-amber-200 dark:border-amber-800/60 flex items-start gap-3 text-amber-900 dark:text-amber-200 text-xs">
                      <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-extrabold block text-amber-950 dark:text-amber-200">
                          {txt(
                            'Đang dùng mật khẩu khởi tạo ban đầu (Admin@123)',
                            'Default password change recommended (Admin@123)',
                            '初期パスワードの変更が必要です (Admin@123)'
                          )}
                        </span>
                        <p className="text-[11.5px] text-amber-800 dark:text-amber-300/90 mt-0.5 leading-relaxed">
                          {txt(
                            'Để đảm bảo an toàn tối đa cho hệ thống, vui lòng đổi sang mật khẩu an toàn riêng của bạn. Ngay sau khi đổi thành công, biểu ngữ cảnh báo sẽ tự động biến mất.',
                            'For optimal security, please update to a secure personal password. Once saved, the warning banner will automatically disappear.',
                            'セキュリティ強化のため、今すぐ安全なパスワードに変更してください。変更後は警告バナーが自動的に非表示になります。'
                          )}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Error Notification */}
                  {passwordError && (
                    <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 rounded-2xl text-xs text-rose-800 dark:text-rose-200 font-semibold flex items-center justify-between gap-2.5 animate-in fade-in duration-150">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                        <span>{passwordError}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setPasswordError(null)}
                        className="p-1 rounded-lg text-rose-600 hover:bg-rose-100 dark:hover:bg-rose-900/50 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {/* Success Notification with close button */}
                  {passwordSuccess && (
                    <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl text-xs text-emerald-800 dark:text-emerald-200 font-semibold flex items-start justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-200 shadow-xs">
                      <div className="flex items-start gap-2.5">
                        <div className="w-7 h-7 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                          <CheckCircle2 className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="font-extrabold text-sm block text-emerald-900 dark:text-emerald-100">{passwordSuccess}</span>
                          <span className="text-[11.5px] text-emerald-700 dark:text-emerald-300 font-normal block mt-0.5">
                            {txt(
                              'Mật khẩu mới đã được đồng bộ vào hệ thống. Các phiên làm việc tiếp theo sẽ yêu cầu mật khẩu mới.',
                              'Your credentials have been securely updated. Subsequent sign-ins will require your new password.',
                              '新しいパスワードが安全に保存されました。次回のログイン時より有効となります。'
                            )}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setPasswordSuccess(null)}
                        className="p-1 rounded-lg text-emerald-600 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 cursor-pointer"
                        title={txt('Đóng thông báo', 'Dismiss', '閉じる')}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  <div className="space-y-4">
                    {/* Current Password Field */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        {txt('Mật khẩu hiện tại', 'Current Password', '現在のパスワード')} <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none flex items-center justify-center">
                          <Lock className="w-4 h-4" />
                        </div>
                        <input
                          type={showCurrent ? 'text' : 'password'}
                          value={currentPassword}
                          onChange={(e) => {
                            setCurrentPassword(e.target.value);
                            if (passwordSuccess) setPasswordSuccess(null);
                            if (passwordError) setPasswordError(null);
                          }}
                          placeholder={txt('Nhập mật khẩu hiện tại...', 'Enter current password...', '現在のパスワードを入力...')}
                          className="w-full pl-10 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-xs"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrent(!showCurrent)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer p-1"
                        >
                          {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* New Password Field */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                          {txt('Mật khẩu mới', 'New Password', '新しいパスワード')} <span className="text-rose-500">*</span>
                        </label>
                        {newPassword && (
                          <span className={`text-[11px] font-extrabold ${pwdStrength.text}`}>
                            {txt(pwdStrength.labelVi, pwdStrength.labelEn, pwdStrength.labelJa)}
                          </span>
                        )}
                      </div>
                      <div className="relative">
                        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none flex items-center justify-center">
                          <KeyRound className="w-4 h-4" />
                        </div>
                        <input
                          type={showNew ? 'text' : 'password'}
                          value={newPassword}
                          onChange={(e) => {
                            setNewPassword(e.target.value);
                            if (passwordSuccess) setPasswordSuccess(null);
                            if (passwordError) setPasswordError(null);
                          }}
                          placeholder={txt('Nhập mật khẩu mới (tối thiểu 6 ký tự)...', 'Enter new password (min 6 characters)...', '新しいパスワードを入力 (6文字以上)...')}
                          className="w-full pl-10 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-xs"
                          required
                          minLength={6}
                        />
                        <button
                          type="button"
                          onClick={() => setShowNew(!showNew)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer p-1"
                        >
                          {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>

                      {/* Password strength meter bar */}
                      {newPassword.length > 0 && (
                        <div className="mt-2 space-y-1">
                          <div className="grid grid-cols-3 gap-1.5 h-1.5">
                            <div className={`rounded-full transition-all duration-300 ${pwdStrength.score >= 1 ? pwdStrength.color : 'bg-slate-200 dark:bg-slate-700'}`} />
                            <div className={`rounded-full transition-all duration-300 ${pwdStrength.score >= 2 ? pwdStrength.color : 'bg-slate-200 dark:bg-slate-700'}`} />
                            <div className={`rounded-full transition-all duration-300 ${pwdStrength.score >= 3 ? pwdStrength.color : 'bg-slate-200 dark:bg-slate-700'}`} />
                          </div>
                        </div>
                      )}

                      <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1.5">
                        {txt(
                          'Tối thiểu 6 ký tự. Khuyên dùng kết hợp chữ hoa, chữ thường, chữ số và ký tự đặc biệt.',
                          'Minimum 6 characters. Recommended: mix upper & lowercase, digits and symbols.',
                          '6文字以上。大文字、小文字、数字、特殊文字の組み合わせを推奨します。'
                        )}
                      </p>
                    </div>

                    {/* Confirm New Password Field */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                          {txt('Xác nhận mật khẩu mới', 'Confirm New Password', '新しいパスワードの確認')} <span className="text-rose-500">*</span>
                        </label>
                        {confirmPassword && newPassword && (
                          <span className={`text-[11px] font-bold ${newPassword === confirmPassword ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
                            {newPassword === confirmPassword
                              ? txt('✓ Khớp mật khẩu', '✓ Passwords match', '✓ 一致しています')
                              : txt('✗ Chưa khớp', '✗ Does not match', '✗ 一致しません')}
                          </span>
                        )}
                      </div>
                      <div className="relative">
                        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none flex items-center justify-center">
                          <CheckCircle2 className="w-4 h-4" />
                        </div>
                        <input
                          type={showConfirm ? 'text' : 'password'}
                          value={confirmPassword}
                          onChange={(e) => {
                            setConfirmPassword(e.target.value);
                            if (passwordSuccess) setPasswordSuccess(null);
                            if (passwordError) setPasswordError(null);
                          }}
                          placeholder={txt('Nhập lại mật khẩu mới...', 'Re-enter new password...', '新しいパスワードを再入力...')}
                          className="w-full pl-10 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-xs"
                          required
                          minLength={6}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirm(!showConfirm)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer p-1"
                        >
                          {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 flex justify-end gap-2.5 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => setIsOpen(false)}
                      className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      {txt('Hủy bỏ', 'Cancel', 'キャンセル')}
                    </button>

                    <button
                      type="submit"
                      disabled={submittingPassword || !currentPassword || !newPassword || !confirmPassword}
                      className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs sm:text-sm shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {submittingPassword ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Check className="w-4 h-4" />
                      )}
                      <span>
                        {submittingPassword
                          ? txt('Đang lưu thay đổi...', 'Saving changes...', '更新中...')
                          : txt('Lưu thay đổi mật khẩu', 'Save Password Changes', 'パスワード変更を保存')}
                      </span>
                    </button>
                  </div>
                </form>
              )}

              {/* CASE 2: SSO ACCOUNT (MICROSOFT 365 / GOOGLE) */}
              {authProvider === 'SSO' && (
                <div className="p-4 sm:p-5 bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/60 rounded-2xl space-y-4">
                  <div className="flex items-start gap-3.5">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md">
                      <Laptop className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-sm text-blue-950 dark:text-blue-100">
                        {txt(
                          'Tài khoản SSO Doanh Nghiệp (Microsoft 365 / Entra ID)',
                          'Managed by Microsoft 365 / Single Sign-On',
                          'Microsoft 365 (SSO) アカウントで管理されています'
                        )}
                      </h4>
                      <p className="text-xs text-blue-800 dark:text-blue-300/90 mt-1 leading-relaxed">
                        {txt(
                          'Tài khoản của bạn đăng nhập qua Single Sign-On (SSO). Mật khẩu được quản lý và bảo vệ bởi dịch vụ Microsoft 365 của cơ quan/doanh nghiệp. Simply IT không trực tiếp lưu trữ hay thay đổi mật khẩu này.',
                          'Your account is authenticated via your organization Microsoft 365 Single Sign-On. Simply IT does not store your login password.',
                          'あなたのアカウントは組織のMicrosoft 365シングルサインオンで認証されています。Simply ITはログインパスワードを直接保持していません。'
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="p-3.5 bg-white dark:bg-slate-800 rounded-xl border border-blue-100 dark:border-blue-900/40 text-xs text-slate-700 dark:text-slate-300 space-y-2">
                    <p className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Info className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                      <span>{txt('Hướng dẫn đổi mật khẩu Microsoft:', 'How to change your password:', 'パスワード変更の手順:')}</span>
                    </p>
                    <ol className="list-decimal list-inside space-y-1.5 text-[11.5px] text-slate-600 dark:text-slate-400 pl-1">
                      <li>
                        {txt(
                          'Bấm nút bên dưới để mở trang Quản lý tài khoản Microsoft (My Account).',
                          'Click the button below to open Microsoft My Account portal.',
                          '下のボタンをクリックしてMicrosoftアカウント管理ポータルを開きます。'
                        )}
                      </li>
                      <li>
                        {txt(
                          'Chọn mục "Bảo mật & Mật khẩu" (Security info / Password) để đổi.',
                          'Navigate to "Security info" or "Password" section to update.',
                          '「セキュリティ情報」または「パスワード」セクションに移動して更新します。'
                        )}
                      </li>
                      <li>
                        {txt(
                          'Mật khẩu mới sẽ tự động có hiệu lực ngay ở lần đăng nhập Simply IT kế tiếp.',
                          'Your new password will take effect immediately upon next login.',
                          '次回Simply ITへのログイン時より新しいパスワードが有効になります。'
                        )}
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
                      {txt(
                        'Mở trang quản lý tài khoản Microsoft ↗',
                        'Open Microsoft My Account Portal ↗',
                        'Microsoft アカウント管理ページを開く ↗'
                      )}
                    </span>
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              )}

              {/* CASE 3: LDAP / ACTIVE DIRECTORY DOMAIN */}
              {authProvider === 'LDAP' && (
                <div className="p-4 sm:p-5 bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900/60 rounded-2xl space-y-4">
                  <div className="flex items-start gap-3.5">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md">
                      <Shield className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-sm text-purple-950 dark:text-purple-100">
                        {txt(
                          'Tài khoản Windows Domain Controller (LDAP / AD)',
                          'Windows Active Directory / LDAP Domain Account',
                          'Windows ドメイン (LDAP / Active Directory) アカウント'
                        )}
                      </h4>
                      <p className="text-xs text-purple-800 dark:text-purple-300/90 mt-1 leading-relaxed">
                        {txt(
                          'Mật khẩu của tài khoản này được đồng bộ và xác thực tập trung từ hệ thống máy chủ thư mục Active Directory (AD DS) của doanh nghiệp.',
                          'This account password is centrally managed by your corporate Windows Server Active Directory Domain Controller.',
                          'このアカウントのパスワードは社内のWindows Server Active Directoryドメインコントローラーで集中管理されています。'
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="p-3.5 bg-white dark:bg-slate-800 rounded-xl border border-purple-100 dark:border-purple-900/40 text-xs text-slate-700 dark:text-slate-300 space-y-2.5">
                    <p className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Laptop className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                      <span>{txt('Các bước đổi mật khẩu Domain:', 'Instructions to change your domain password:', 'ドメインパスワード変更の手順:')}</span>
                    </p>
                    <div className="space-y-2 text-[11.5px] text-slate-700 dark:text-slate-300 pl-1">
                      <div className="flex items-start gap-2">
                        <span className="w-5 h-5 rounded-full bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 font-bold flex items-center justify-center text-[10px] shrink-0">1</span>
                        <span>
                          {txt(
                            'Trên máy tính Windows kết nối mạng nội bộ công ty (hoặc qua VPN), nhấn tổ hợp phím ',
                            'On a Windows PC connected to your company network (or via VPN), press ',
                            '社内ネットワーク (またはVPN) に接続されたWindows PCで、'
                          )}
                          <kbd className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded font-mono font-bold text-slate-800 dark:text-slate-200 text-[10px]">
                            Ctrl + Alt + Del
                          </kbd>
                          {isJa ? ' キーを押します。' : ''}
                        </span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="w-5 h-5 rounded-full bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 font-bold flex items-center justify-center text-[10px] shrink-0">2</span>
                        <span>
                          {txt(
                            'Chọn Đổi mật khẩu (Change a password), nhập mật khẩu cũ và mật khẩu mới.',
                            'Select Change a password, enter your old password and new password.',
                            '「パスワードの変更」を選択し、現在のパスワードと新しいパスワードを入力します。'
                          )}
                        </span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="w-5 h-5 rounded-full bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 font-bold flex items-center justify-center text-[10px] shrink-0">3</span>
                        <span>
                          {txt(
                            'Sau khi Windows xác nhận thành công, mật khẩu mới sẽ tự động đồng bộ ngay lập tức cho Simply IT.',
                            'Once confirmed by Windows, your new password will automatically sync with Simply IT.',
                            'Windowsで更新が完了すると、Simply ITにも即時に自動同期されます。'
                          )}
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
              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-3">
                <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5 uppercase tracking-wider">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>{txt('Mức độ bảo vệ tài khoản', 'Account Protection Level', 'アカウント保護レベル')}</span>
                </span>
                <div className="flex items-center justify-between text-xs py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-600 dark:text-slate-400">{txt('Phương thức xác thực:', 'Authentication Type:', '認証方式:')}</span>
                  <span className="font-extrabold text-slate-900 dark:text-white">{authProvider}</span>
                </div>
                <div className="flex items-center justify-between text-xs py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-600 dark:text-slate-400">{txt('Trạng thái mật khẩu:', 'Password Status:', 'パスワード状態:')}</span>
                  {isDefaultPassword ? (
                    <span className="text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>{txt('Mật khẩu mặc định (Cần đổi)', 'Default Password (Needs update)', '初期パスワード (変更推奨)')}</span>
                    </span>
                  ) : (
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" />
                      <span>{txt('An toàn (Đã đổi mật khẩu riêng)', 'Secure (Custom password set)', '安全 (変更済み)')}</span>
                    </span>
                  )}
                </div>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-2 text-xs">
                <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 uppercase tracking-wider">
                  <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span>{txt('Phiên đăng nhập hiện tại', 'Current Active Session', '現在のセッション')}</span>
                </span>
                <p className="text-[11.5px] text-slate-600 dark:text-slate-400 leading-relaxed">
                  {txt(
                    'Phiên làm việc được bảo vệ bằng HttpOnly JWT Cookie, mã hóa qua đường truyền SSL/TLS, ngăn chặn tuyệt đối các hình thức tấn công XSS và đánh cắp phiên (Session Hijacking).',
                    'Your session is protected via HttpOnly JWT Cookie with secure SSL/TLS transmission, actively mitigating XSS and session hijacking threats.',
                    'セッションはHttpOnly JWT CookieとSSL/TLS暗号化により保護されており、XSSやセッション乗っ取りから安全に防御されています。'
                  )}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
