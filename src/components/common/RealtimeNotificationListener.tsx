'use client';

import React, { useEffect, useState } from 'react';
import { Bell, CheckCircle2, AlertTriangle, Sparkles, X } from 'lucide-react';

interface ToastItem {
  id: string;
  type: string;
  title: string;
  message: string;
  timestamp: string;
}

export function RealtimeNotificationListener() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    let eventSource: EventSource | null = null;
    let reconnectTimer: any = null;

    const connectSSE = () => {
      try {
        eventSource = new EventSource('/api/realtime/events');

        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'CONNECTED') return;

            // Dispatch global event for pages to update instantly without full page reload
            window.dispatchEvent(
              new CustomEvent('app:realtime-event', { detail: data })
            );

            // Add floating toast
            const newToast: ToastItem = {
              id: `toast-${Date.now()}-${Math.random()}`,
              type: data.type,
              title: data.title || 'Thông báo mới',
              message: data.message || '',
              timestamp: new Date().toLocaleTimeString('vi-VN'),
            };

            setToasts((prev) => [newToast, ...prev.slice(0, 3)]);

            // Auto dismiss after 5s
            setTimeout(() => {
              setToasts((prev) => prev.filter((t) => t.id !== newToast.id));
            }, 5000);
          } catch (err) {
            console.error('Error parsing SSE data:', err);
          }
        };

        eventSource.onerror = () => {
          if (eventSource) {
            eventSource.close();
            eventSource = null;
          }
          // Reconnect after 5 seconds
          clearTimeout(reconnectTimer);
          reconnectTimer = setTimeout(connectSSE, 5000);
        };
      } catch (err) {
        console.error('Error connecting to SSE:', err);
      }
    };

    connectSSE();

    return () => {
      clearTimeout(reconnectTimer);
      if (eventSource) {
        eventSource.close();
      }
    };
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="pointer-events-auto bg-slate-950/95 text-white p-3.5 rounded-2xl shadow-2xl border border-slate-700/80 flex items-start justify-between gap-3 animate-in fade-in slide-in-from-bottom-5"
        >
          <div className="flex items-start gap-2.5">
            <div className="p-1.5 rounded-xl bg-blue-600/80 text-white shrink-0 mt-0.5 shadow-sm">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-xs text-white">{t.title}</span>
                <span className="text-[10px] text-slate-400 font-mono">({t.timestamp})</span>
              </div>
              <p className="text-[11px] text-slate-300 mt-0.5 line-clamp-2">{t.message}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setToasts((prev) => prev.filter((item) => item.id !== t.id))}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
