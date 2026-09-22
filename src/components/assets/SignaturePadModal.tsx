'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { X, RotateCcw, Check, PenTool } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/context';

interface SignaturePadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (signatureDataUrl: string) => void;
  signerRole: string;
  signerName: string;
}

export default function SignaturePadModal({
  isOpen,
  onClose,
  onSave,
  signerRole,
  signerName,
}: SignaturePadModalProps) {
  const { language } = useLanguage();
  const isEn = language === 'en';

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [inkColor, setInkColor] = useState<'#1d4ed8' | '#0f172a'>('#1d4ed8'); // Default signature blue

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  }, []);

  // Initialize high-DPI canvas
  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;

      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(dpr, dpr);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = inkColor;
      }
      setHasDrawn(false);
    }, 50);

    return () => clearTimeout(timer);
  }, [isOpen, inkColor]);

  if (!isOpen) return null;

  const getCanvasCoords = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(e.pointerId);
    setIsDrawing(true);
    setHasDrawn(true);

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.strokeStyle = inkColor;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const coords = getCanvasCoords(e);
    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const coords = getCanvasCoords(e);
    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) {
      try {
        canvas.releasePointerCapture(e.pointerId);
      } catch {
        // Ignore if pointer capture already lost
      }
    }
  };

  const handleConfirm = () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasDrawn) return;
    const dataUrl = canvas.toDataURL('image/png');
    onSave(dataUrl);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in zoom-in-95">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
              <PenTool className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-sm">
                {isEn ? 'Digital Signature' : 'Ký Tên Điện Tử'}
              </h3>
              <p className="text-[11px] text-blue-100">
                {signerRole}: <strong className="text-white">{signerName || (isEn ? 'Signer' : 'Người ký')}</strong>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>{isEn ? 'Sign with your finger, mouse, or stylus below:' : 'Ký bằng ngón tay, chuột hoặc bút cảm ứng vào khung dưới:'}</span>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-semibold">{isEn ? 'Ink:' : 'Mực:'}</span>
              <button
                type="button"
                onClick={() => setInkColor('#1d4ed8')}
                className={`w-5 h-5 rounded-full bg-blue-700 transition-transform ${inkColor === '#1d4ed8' ? 'ring-2 ring-blue-400 scale-110' : 'opacity-60'}`}
                title={isEn ? 'Blue Ink' : 'Mực xanh'}
              />
              <button
                type="button"
                onClick={() => setInkColor('#0f172a')}
                className={`w-5 h-5 rounded-full bg-slate-900 transition-transform ${inkColor === '#0f172a' ? 'ring-2 ring-slate-400 scale-110' : 'opacity-60'}`}
                title={isEn ? 'Black Ink' : 'Mực đen'}
              />
            </div>
          </div>

          {/* Canvas Signature Box */}
          <div className="relative border-2 border-dashed border-slate-300 rounded-2xl bg-slate-50/60 overflow-hidden select-none touch-none h-48">
            <canvas
              ref={canvasRef}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              className="w-full h-full cursor-crosshair touch-none"
              style={{ touchAction: 'none' }}
            />

            {!hasDrawn && (
              <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center text-slate-300 text-xs">
                <PenTool className="w-6 h-6 mb-1 opacity-50" />
                <span>{isEn ? 'Draw signature here' : 'Ký tên tại đây'}</span>
              </div>
            )}

            {/* Baseline guideline */}
            <div className="absolute bottom-10 left-8 right-8 border-b border-slate-200 pointer-events-none" />
          </div>

          <p className="text-[11px] text-slate-400 text-center italic">
            {isEn
              ? 'By confirming, you certify this digital signature is legally valid for this handover record.'
              : 'Bằng việc xác nhận, bạn đồng ý chữ ký điện tử này được gắn liền với biên bản giao nhận tài sản.'}
          </p>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <button
            type="button"
            onClick={clearCanvas}
            disabled={!hasDrawn}
            className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 disabled:opacity-40 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{isEn ? 'Clear' : 'Ký lại'}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              {isEn ? 'Cancel' : 'Hủy'}
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!hasDrawn}
              className="px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-40 rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>{isEn ? 'Apply Signature' : 'Xác Nhận Chữ Ký'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
