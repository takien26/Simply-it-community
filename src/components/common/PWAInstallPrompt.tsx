'use client';

import { useState, useEffect } from 'react';
import { Download, X, Smartphone, Sparkles, PlusSquare, Share } from 'lucide-react';

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    try {
      const dismissed = localStorage.getItem('pwa_prompt_dismissed');
      if (dismissed) {
        setIsDismissed(true);
        return;
      }
    } catch {}

    // Check if running as standalone app already
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      Boolean((window.navigator as any)?.standalone) ||
      document.referrer.includes('android-app://');

    if (isStandalone) return;

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    if (isIosDevice) {
      const timer = setTimeout(() => setShowPrompt(true), 3000);
      return () => clearTimeout(timer);
    }

    // Android / Chrome beforeinstallprompt event
    const handleBeforeInstall = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    try {
      localStorage.setItem('pwa_prompt_dismissed', 'true');
    } catch {}
  };

  if (!showPrompt || isDismissed) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 md:left-auto md:right-6 md:bottom-6 md:max-w-sm z-50 bg-slate-900/95 text-white backdrop-blur-xl border border-blue-500/40 p-4 rounded-3xl shadow-2xl animate-in fade-in slide-in-from-bottom-5 duration-300">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shrink-0 shadow-md shadow-blue-500/30 ring-2 ring-white/20">
            <img
              src="/logo-icon.png"
              alt="Logo"
              className="w-7 h-7 object-contain rounded-lg"
              onError={(e) => {
                (e.target as any).style.display = 'none';
              }}
            />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-xs text-white">Cài Đặt Ứng Dụng SIMPLY IT</span>
              <span className="bg-blue-500/30 text-blue-300 text-[9px] font-bold px-1.5 py-0.2 rounded-full border border-blue-400/30">
                App Mobile
              </span>
            </div>
            <p className="text-[11px] text-slate-300 mt-0.5 leading-snug">
              Cài app vào điện thoại để quét mã QR và kiểm kê thiết bị siêu nhanh!
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleDismiss}
          className="text-slate-400 hover:text-white p-1 rounded-lg shrink-0 cursor-pointer"
          title="Đóng thông báo"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="mt-3 pt-2.5 border-t border-slate-800 flex items-center justify-between gap-2">
        {isIOS ? (
          <div className="flex items-center gap-1.5 text-[11px] text-amber-300 bg-amber-950/50 border border-amber-800/60 px-3 py-1.5 rounded-xl w-full">
            <Share className="w-3.5 h-3.5 shrink-0" />
            <span>
              Bấm nút <strong>Chia sẻ (Share)</strong> rồi chọn{' '}
              <strong>&quot;Thêm vào MH chính&quot;</strong>
            </span>
          </div>
        ) : (
          <>
            <button
              type="button"
              onClick={handleDismiss}
              className="px-3 py-1.5 text-xs text-slate-400 hover:text-white font-medium cursor-pointer"
            >
              Để sau
            </button>
            <button
              type="button"
              onClick={handleInstallClick}
              className="flex-1 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-xl text-xs shadow-md shadow-blue-600/30 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Cài Đặt App Ngay</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
}
