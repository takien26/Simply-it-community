'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Laptop,
  QrCode,
  LifeBuoy,
  Settings,
} from 'lucide-react';

export function MobileBottomNav() {
  const pathname = usePathname();

  const navs = [
    { label: 'Tổng quan', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Tài sản', href: '/assets', icon: Laptop },
    { label: 'Quét QR', href: '/scan', icon: QrCode, isSpecial: true },
    { label: 'Ticket IT', href: '/tickets', icon: LifeBuoy },
    { label: 'Cài đặt', href: '/settings', icon: Settings },
  ];

  return (
    <nav aria-label="Mobile Navigation" className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-lg border-t border-slate-200/90 px-2 py-1 shadow-2xl pb-safe">
      <div className="flex items-center justify-around max-w-md mx-auto relative">
        {navs.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== '/dashboard' && pathname?.startsWith(item.href));

          if (item.isSpecial) {
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center -mt-5 group shrink-0"
              >
                <div
                  className={
                    'w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-all transform active:scale-95 ' +
                    (isActive
                      ? 'bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-blue-500/40 ring-4 ring-white'
                      : 'bg-gradient-to-tr from-blue-600 to-purple-600 text-white shadow-blue-500/30 ring-4 ring-white')
                  }
                >
                  <QrCode className="w-6 h-6 text-white animate-pulse" />
                </div>
                <span className="text-[10px] font-black text-blue-600 mt-1 tracking-tight">
                  Quét QR
                </span>
              </Link>
            );
          }

          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={
                'flex flex-col items-center py-1 px-2.5 rounded-xl transition-all ' +
                (isActive
                  ? 'text-blue-600 font-bold'
                  : 'text-slate-500 hover:text-slate-800 font-medium')
              }
            >
              <Icon
                className={
                  'w-5 h-5 transition-transform ' +
                  (isActive ? 'scale-110 stroke-[2.5]' : 'stroke-[1.75]')
                }
              />
              <span className="text-[10px] mt-0.5 tracking-tight truncate max-w-[58px]">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
