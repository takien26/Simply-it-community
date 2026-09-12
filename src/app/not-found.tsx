// src/app/not-found.tsx
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      <h1 className="text-6xl font-extrabold text-blue-600 mb-2">404</h1>
      <h2 className="text-xl font-bold text-slate-800 mb-2">Không tìm thấy trang</h2>
      <p className="text-sm text-slate-500 mb-6 max-w-md">
        Trang bạn đang tìm kiếm không tồn tại hoặc đã được chuyển sang đường dẫn khác.
      </p>
      <Link
        href="/"
        className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-600/20"
      >
        Quay về Trang chủ
      </Link>
    </div>
  );
}
