'use client';

import { useState, useEffect } from 'react';
import { ShieldAlert, ArrowRight, X } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/context';
import { openUserProfileModal } from '@/components/common/UserProfileSecurityModal';

export function DefaultPasswordBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const { language } = useLanguage();
  const isEn = language === 'en';
  const isJa = language === 'ja';

  useEffect(() => {
    // Check if dismissed in this session
    if (typeof window !== 'undefined' && sessionStorage.getItem('simply:dismiss-default-pwd-banner')) {
      return;
    }

    async function checkPasswordStatus() {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const json = await res.json();
          if (json?.data?.isDefaultPassword) {
            setShowBanner(true);
          }
        }
      } catch {}
    }

    checkPasswordStatus();

    const handlePasswordChanged = () => {
      setShowBanner(false);
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('simply:dismiss-default-pwd-banner', 'true');
      }
    };

    window.addEventListener('simply:password-changed', handlePasswordChanged);
    return () => {
      window.removeEventListener('simply:password-changed', handlePasswordChanged);
    };
  }, []);

  const handleDismiss = () => {
    setShowBanner(false);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('simply:dismiss-default-pwd-banner', 'true');
    }
  };

  if (!showBanner) return null;

  const title = isJa
    ? '重要なセキュリティ警告 (Production Checklist)'
    : isEn
    ? 'Important Security Notice (Production Checklist)'
    : 'Lưu ý bảo mật quan trọng (Production Checklist)';

  const badge = isJa
    ? '初期デフォルトパスワード'
    : isEn
    ? 'Default Password'
    : 'Mật khẩu mặc định';

  const desc = isJa ? (
    <>
      管理者アカウントは初期デフォルトパスワード (<code className="font-mono bg-amber-100/80 px-1 py-0.2 rounded text-amber-950 font-semibold">Admin@123</code>) を使用しています。不正侵入を防ぐため、直ちに新しいパスワードへ変更してください。
    </>
  ) : isEn ? (
    <>
      Your administrator account is currently using the initial default password (<code className="font-mono bg-amber-100/80 px-1 py-0.2 rounded text-amber-950 font-semibold">Admin@123</code>). Please change your password immediately to prevent unauthorized system access.
    </>
  ) : (
    <>
      Tài khoản quản trị viên của bạn đang sử dụng mật khẩu khởi tạo ban đầu (<code className="font-mono bg-amber-100/80 px-1 py-0.2 rounded text-amber-950 font-semibold">Admin@123</code>). Vui lòng cập nhật mật khẩu mới ngay để ngăn ngừa nguy cơ xâm nhập hệ thống khi vận hành.
    </>
  );

  const actionText = isJa
    ? '今すぐパスワードを変更'
    : isEn
    ? 'Change Password Now'
    : 'Đổi mật khẩu ngay';

  const dismissTitle = isJa
    ? '通知を非表示'
    : isEn
    ? 'Dismiss notification'
    : 'Tạm ẩn thông báo';

  return (
    <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50/90 p-3.5 sm:p-4 text-amber-900 shadow-sm backdrop-blur-sm transition-all duration-200">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-start sm:items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div>
            <div className="text-sm font-semibold flex items-center gap-2 flex-wrap">
              <span>{title}</span>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-amber-200 text-amber-900">
                {badge}
              </span>
            </div>
            <p className="text-xs text-amber-800/90 mt-0.5 leading-relaxed">
              {desc}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end shrink-0">
          <button
            type="button"
            onClick={() => openUserProfileModal({ tab: 'password' })}
            className="inline-flex items-center gap-1.5 rounded-lg bg-amber-700 hover:bg-amber-800 text-white px-3 py-1.5 text-xs font-medium shadow-sm transition-colors cursor-pointer"
          >
            <span>{actionText}</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={handleDismiss}
            className="rounded-lg p-1.5 text-amber-700 hover:bg-amber-200/60 transition-colors cursor-pointer"
            title={dismissTitle}
            aria-label={dismissTitle}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
