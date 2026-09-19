'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ShieldAlert, ArrowRight, X } from 'lucide-react';

export function DefaultPasswordBanner() {
  const [showBanner, setShowBanner] = useState(false);

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
  }, []);

  const handleDismiss = () => {
    setShowBanner(false);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('simply:dismiss-default-pwd-banner', 'true');
    }
  };

  if (!showBanner) return null;

  return (
    <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50/90 p-3.5 sm:p-4 text-amber-900 shadow-sm backdrop-blur-sm transition-all duration-200">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-start sm:items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div>
            <div className="text-sm font-semibold flex items-center gap-2">
              <span>Lưu ý bảo mật quan trọng (Production Checklist)</span>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-amber-200 text-amber-900">
                Mật khẩu mặc định
              </span>
            </div>
            <p className="text-xs text-amber-800/90 mt-0.5">
              Tài khoản quản trị viên của bạn đang sử dụng mật khẩu khởi tạo ban đầu (<code className="font-mono bg-amber-100/80 px-1 py-0.2 rounded text-amber-950 font-semibold">Admin@123</code>). Vui lòng cập nhật mật khẩu mới ngay để ngăn ngừa nguy cơ xâm nhập hệ thống khi vận hành.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end shrink-0">
          <Link
            href="/users"
            className="inline-flex items-center gap-1.5 rounded-lg bg-amber-700 hover:bg-amber-800 text-white px-3 py-1.5 text-xs font-medium shadow-sm transition-colors"
          >
            <span>Đổi mật khẩu ngay</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
          <button
            onClick={handleDismiss}
            className="rounded-lg p-1.5 text-amber-700 hover:bg-amber-200/60 transition-colors"
            title="Tạm ẩn thông báo"
            aria-label="Tạm ẩn thông báo"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
