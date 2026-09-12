'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Laptop, Lock, Mail, AlertCircle, Globe } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/context';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { language, setLanguage, t, supportedLanguages } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [ssoEnabled, setSsoEnabled] = useState(false);

  useEffect(() => {
    // Check SSO Status
    fetch('/api/auth/sso/status')
      .then((res) => res.json())
      .then((data) => {
        if (data?.ms365?.enabled) {
          setSsoEnabled(true);
        }
      })
      .catch(() => {});

    // Check error params from SSO callback
    const errParam = searchParams.get('error');
    if (errParam) {
      if (errParam === 'sso_disabled') {
        setError(
          language === 'en'
            ? 'Microsoft 365 login is currently disabled in Settings.'
            : 'Tính năng đăng nhập Microsoft 365 hiện đang tắt trong Cài đặt.'
        );
      } else if (errParam === 'sso_misconfigured') {
        setError(
          language === 'en'
            ? 'Microsoft 365 SSO is missing Client ID or Secret.'
            : 'Cấu hình Microsoft 365 SSO chưa đầy đủ Client ID / Secret.'
        );
      } else if (errParam === 'user_disabled') {
        setError(
          language === 'en'
            ? 'Your account has been deactivated / marked as resigned. Access denied.'
            : 'Tài khoản của bạn đã nghỉ việc hoặc bị vô hiệu hóa. Không thể đăng nhập vào hệ thống.'
        );
      } else {
        setError(
          language === 'en'
            ? 'Microsoft 365 login failed. Please try again or use email/password.'
            : 'Đăng nhập Microsoft 365 thất bại. Vui lòng thử lại hoặc dùng email/mật khẩu.'
        );
      }
    }
  }, [searchParams, language]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || t('auth.failed', 'Đăng nhập thất bại'));
        return;
      }

      window.location.href = '/dashboard';
    } catch {
      setError(t('auth.error_generic', 'Có lỗi xảy ra. Vui lòng thử lại.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-950 to-blue-950 p-4 relative">
      {/* Top Bar Quick Language Switcher */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6 flex items-center gap-1.5 bg-slate-900/80 backdrop-blur-md p-1.5 rounded-2xl border border-slate-700/60 shadow-xl">
        <Globe className="w-4 h-4 text-slate-400 ml-1.5 shrink-0" />
        {supportedLanguages.map((lang) => (
          <button
            key={lang.code}
            type="button"
            onClick={() => setLanguage(lang.code as any)}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              language === lang.code
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>{lang.flag}</span>
            <span className="hidden sm:inline">{lang.nativeName}</span>
          </button>
        ))}
      </div>

      <div className="max-w-md w-full p-8 bg-white rounded-3xl shadow-2xl border border-slate-200 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-2xl bg-white p-2 flex items-center justify-center mx-auto shadow-xl border border-slate-100">
            <img src="/logo-icon.png" alt="SIMPLY IT" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            {t('auth.system_title', 'SIMPLY IT')}
          </h1>
          <p className="text-xs text-blue-600 font-bold">
            {t('auth.system_slogan', 'Do Less — Achieve More')}
          </p>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            {t('auth.system_desc', 'Hệ thống Quản trị Tài sản, Dịch vụ & Ticket ITSM Doanh nghiệp')}
          </p>
        </div>

        {error && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl flex items-start gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Microsoft 365 SSO Button (if enabled) */}
        {ssoEnabled && (
          <div className="space-y-4">
            <a
              href="/api/auth/sso/ms365/login"
              className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 border border-slate-300 hover:border-slate-400 rounded-xl shadow-2xs text-xs font-bold text-slate-800 bg-white hover:bg-slate-50 transition-all group"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 21 21">
                <rect x="1" y="1" width="9" height="9" fill="#f25022"/>
                <rect x="11" y="1" width="9" height="9" fill="#7fba00"/>
                <rect x="1" y="11" width="9" height="9" fill="#00a4ef"/>
                <rect x="11" y="11" width="9" height="9" fill="#ffb900"/>
              </svg>
              <span>{t('auth.sso_btn', 'Đăng nhập bằng Microsoft 365 (SSO)')}</span>
            </a>

            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-slate-200"></div>
              <span className="flex-shrink mx-3 text-slate-400 text-[11px] font-semibold uppercase">
                {language === 'en' ? 'Or local account' : 'Hoặc tài khoản cục bộ'}
              </span>
              <div className="flex-grow border-t border-slate-200"></div>
            </div>
          </div>
        )}

        {/* Local Credentials Form */}
        <form className="space-y-4 text-xs" onSubmit={handleSubmit}>
          <div className="space-y-3">
            <div>
              <label htmlFor="email" className="block font-bold text-slate-700 mb-1">
                {t('auth.email_label', 'Tài khoản / Email / Tên miền LDAP')}
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  id="email"
                  type="text"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                  placeholder={language === 'en' ? 'admin@company.com or LDAP username' : 'admin@company.com hoặc username LDAP'}
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block font-bold text-slate-700 mb-1">
                {t('auth.password_label', 'Mật khẩu')}
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="••••••••"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-xl shadow-md text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-colors cursor-pointer"
          >
            {loading ? t('auth.signing_in', 'Đang đăng nhập...') : t('auth.signin_btn', 'Đăng nhập vào Hệ Thống')}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center text-white text-xs">Đang tải...</div>}>
      <LoginForm />
    </Suspense>
  );
}
