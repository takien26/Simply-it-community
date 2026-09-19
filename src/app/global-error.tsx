'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Global application error:', error);
  }, [error]);

  return (
    <html lang="vi">
      <body className="min-h-screen flex items-center justify-center p-4 bg-slate-50 text-slate-900 font-sans">
        <div className="max-w-md w-full text-center space-y-4 p-8 bg-white rounded-2xl shadow-xl border border-slate-200">
          <h2 className="text-xl font-bold text-rose-600">Sự cố toàn hệ thống</h2>
          <p className="text-sm text-slate-600">
            Ứng dụng gặp lỗi nghiêm trọng tại tầng giao diện gốc. Vui lòng thử tải lại trang.
          </p>
          {error.digest && (
            <p className="text-xs font-mono text-slate-400">Mã sự cố: {error.digest}</p>
          )}
          <button
            type="button"
            onClick={() => reset()}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors cursor-pointer"
          >
            Tải lại ứng dụng
          </button>
        </div>
      </body>
    </html>
  );
}
