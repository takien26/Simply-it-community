'use client';

import { useState, useEffect } from 'react';
import { Download, Smartphone, Share, CheckCircle2, QrCode, Sparkles, Info } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/context';

export function PWAInstallPrompt({ className = '' }: { className?: string }) {
  const { language } = useLanguage();
  const isEn = language === 'en';

  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [showDesktopHelp, setShowDesktopHelp] = useState(false);

  useEffect(() => {
    // Check if running as standalone app already
    const checkStandalone =
      typeof window !== 'undefined' &&
      (window.matchMedia('(display-mode: standalone)').matches ||
        Boolean((window.navigator as any)?.standalone) ||
        document.referrer.includes('android-app://'));

    if (checkStandalone) {
      setIsStandalone(true);
      return;
    }

    // Detect iOS
    const userAgent = typeof window !== 'undefined' ? window.navigator.userAgent.toLowerCase() : '';
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    // Android / Chrome beforeinstallprompt event
    const handleBeforeInstall = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setInstalled(true);
      }
      setDeferredPrompt(null);
    } else {
      setShowDesktopHelp(true);
      setTimeout(() => setShowDesktopHelp(false), 8000);
    }
  };

  return (
    <div
      className={`rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white p-5 sm:p-6 border border-slate-700/60 shadow-lg relative overflow-hidden ${className}`}
    >
      {/* Subtle decorative glow */}
      <div className="absolute top-0 right-0 -mt-8 -mr-8 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/3 -mb-8 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
        {/* Left: Branding & Info */}
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shrink-0 shadow-md shadow-blue-500/30 ring-2 ring-white/20">
            <img
              src="/logo-icon.png"
              alt="Logo"
              className="w-8 h-8 object-contain rounded-lg"
              onError={(e) => {
                (e.target as any).style.display = 'none';
              }}
            />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-sm sm:text-base text-white">
                {isEn ? 'Install SIMPLY IT Mobile App' : 'Cài Đặt Ứng Dụng SIMPLY IT'}
              </h3>
              <span className="bg-blue-500/30 text-blue-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-blue-400/30">
                {isEn ? 'Mobile App / PWA' : 'App Mobile'}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl leading-relaxed">
              {isEn
                ? 'Install the app on your phone or computer for instant QR scanning, asset inventory, and fast support requests!'
                : 'Cài app vào điện thoại để quét mã QR và kiểm kê thiết bị siêu nhanh!'}
            </p>

            {/* Quick feature tags */}
            <div className="flex items-center gap-2 mt-2 flex-wrap text-[11px] text-slate-400">
              <span className="inline-flex items-center gap-1 bg-white/5 px-2 py-0.5 rounded-md border border-white/10">
                <QrCode className="w-3 h-3 text-blue-400" />
                {isEn ? 'Instant QR scan' : 'Quét mã QR nhanh'}
              </span>
              <span className="inline-flex items-center gap-1 bg-white/5 px-2 py-0.5 rounded-md border border-white/10">
                <Sparkles className="w-3 h-3 text-amber-400" />
                {isEn ? 'Quick IT tickets' : 'Gửi yêu cầu IT tiện lợi'}
              </span>
              <span className="inline-flex items-center gap-1 bg-white/5 px-2 py-0.5 rounded-md border border-white/10">
                <Smartphone className="w-3 h-3 text-emerald-400" />
                {isEn ? 'Native app feel' : 'Dễ dùng như app gốc'}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Action or Guidance */}
        <div className="shrink-0 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          {isStandalone || installed ? (
            <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs sm:text-sm font-semibold">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                {isEn ? 'App is installed on this device' : 'Đã cài đặt trên thiết bị này'}
              </span>
            </div>
          ) : isIOS ? (
            <div className="flex items-center gap-2 text-xs text-amber-300 bg-amber-950/60 border border-amber-700/60 px-4 py-2.5 rounded-xl max-w-sm">
              <Share className="w-4 h-4 shrink-0 text-amber-400" />
              <span>
                {isEn ? (
                  <>
                    Tap <strong>Share</strong> in Safari, then select{' '}
                    <strong>&quot;Add to Home Screen&quot;</strong>
                  </>
                ) : (
                  <>
                    Bấm nút <strong>Chia sẻ (Share)</strong> trên Safari rồi chọn{' '}
                    <strong>&quot;Thêm vào MH chính&quot;</strong>
                  </>
                )}
              </span>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleInstallClick}
              className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl text-xs sm:text-sm shadow-md shadow-blue-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
            >
              <Download className="w-4 h-4" />
              <span>{isEn ? 'Install App Now' : 'Cài Đặt App Ngay'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Desktop / Browser Help if clicked when deferredPrompt is not fired */}
      {showDesktopHelp && !isStandalone && !installed && (
        <div className="mt-3.5 pt-3 border-t border-slate-700/80 flex items-start gap-2 text-xs text-blue-200 bg-blue-950/40 p-2.5 rounded-xl animate-in fade-in duration-200">
          <Info className="w-4 h-4 shrink-0 text-blue-400 mt-0.5" />
          <span>
            {isEn
              ? 'To install, click the Install icon in your browser address bar (top right) or open your browser menu (⋮) and select "Install SIMPLY IT".'
              : 'Để cài đặt, bạn hãy nhấn vào biểu tượng Cài đặt trên thanh địa chỉ trình duyệt (góc trên bên phải) hoặc chọn Menu (⋮) > "Cài đặt SIMPLY IT".'}
          </span>
        </div>
      )}
    </div>
  );
}
