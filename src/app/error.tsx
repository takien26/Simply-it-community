'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Unhandled app error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <div className="max-w-md w-full text-center space-y-6 p-8 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800">
        <div className="w-16 h-16 mx-auto rounded-full bg-rose-100 dark:bg-rose-950/50 flex items-center justify-center text-rose-600 dark:text-rose-400">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold">Đã xảy ra lỗi không mong muốn</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Hệ thống gặp sự cố khi tải trang này. Bạn có thể thử tải lại hoặc quay về trang chủ.
          </p>
          {error.digest && (
            <p className="text-xs font-mono text-slate-400">Mã lỗi: {error.digest}</p>
          )}
          {error?.message && (
            <div className="text-left bg-rose-50 dark:bg-rose-950/40 p-3 rounded-xl border border-rose-200 dark:border-rose-900 text-xs font-mono text-rose-600 dark:text-rose-400 max-h-48 overflow-auto whitespace-pre-wrap">
              <strong>Chi tiết lỗi:</strong> {error.message}
              {error.stack && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-[10px] text-slate-400">Chi tiết Stack trace</summary>
                  <div className="mt-1 text-[10px] text-slate-500 whitespace-pre-wrap">{error.stack}</div>
                </details>
              )}
            </div>
          )}
        </div>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            type="button"
            onClick={() => reset()}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm transition-colors cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Thử lại</span>
          </button>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 font-medium text-sm transition-colors"
          >
            <Home className="w-4 h-4" />
            <span>Về Dashboard</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
