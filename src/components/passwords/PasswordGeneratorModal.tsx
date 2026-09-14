'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Dices, X, RefreshCw, Check, Copy } from 'lucide-react';
import { evaluatePasswordStrength, generateSecurePassword } from './types';
import { useLanguage } from '@/lib/i18n/context';

interface PasswordGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCopyText?: (text: string, fieldId: string, label: string) => void;
}

export function PasswordGeneratorModal({
  isOpen,
  onClose,
  onCopyText,
}: PasswordGeneratorModalProps) {
  // ESC key listener to close modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const { language } = useLanguage();
  const isEn = language === 'en';
  const [genLength, setGenLength] = useState(16);
  const [genUpper, setGenUpper] = useState(true);
  const [genLower, setGenLower] = useState(true);
  const [genDigits, setGenDigits] = useState(true);
  const [genSymbols, setGenSymbols] = useState(true);
  const [genAvoidAmbiguous, setGenAvoidAmbiguous] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [copied, setCopied] = useState(false);

  const handleRegenerate = useCallback(() => {
    const newPass = generateSecurePassword({
      length: genLength,
      useUpper: genUpper,
      useLower: genLower,
      useDigits: genDigits,
      useSymbols: genSymbols,
      avoidAmbiguous: genAvoidAmbiguous,
    });
    setGeneratedPassword(newPass);
    setCopied(false);
  }, [genLength, genUpper, genLower, genDigits, genSymbols, genAvoidAmbiguous]);

  useEffect(() => {
    if (isOpen) {
      handleRegenerate();
    }
  }, [isOpen, handleRegenerate]);

  if (!isOpen) return null;

  const handleCopy = () => {
    if (onCopyText) {
      onCopyText(generatedPassword, 'gen_pass', 'Mật khẩu ngẫu nhiên');
    } else {
      navigator.clipboard.writeText(generatedPassword);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const strength = evaluatePasswordStrength(generatedPassword);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-slate-200 animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
            <Dices className="w-5 h-5 text-purple-600" />
            <span>Bộ Sinh Mật Khẩu Ngẫu Nhiên</span>
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 bg-purple-50/70 border border-purple-200 rounded-2xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-purple-900 uppercase">Mật khẩu được tạo:</span>
            <span className={`text-[10px] font-bold ${strength.color}`}>
              {strength.label}
            </span>
          </div>
          <p className="font-mono font-black text-lg text-purple-950 bg-white p-3 border border-purple-200 rounded-xl break-all select-all text-center">
            {generatedPassword}
          </p>
          <div className="flex items-center justify-center gap-2 pt-1">
            <button
              type="button"
              onClick={handleRegenerate}
              className="px-3 py-1.5 bg-white hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-xl text-xs font-bold flex items-center gap-1 shadow-2xs cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Tạo lại</span>
            </button>
            <button
              type="button"
              onClick={handleCopy}
              className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-2xs cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Đã sao chép!' : 'Sao chép'}</span>
            </button>
          </div>
        </div>

        <div className="space-y-3 text-xs">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-bold text-slate-700">Độ dài mật khẩu: {genLength} ký tự</label>
            </div>
            <input
              type="range"
              min="8"
              max="48"
              value={genLength}
              onChange={(e) => setGenLength(parseInt(e.target.value, 10))}
              className="w-full accent-purple-600 cursor-pointer"
            />
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <label className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer">
              <input
                type="checkbox"
                checked={genUpper}
                onChange={(e) => setGenUpper(e.target.checked)}
                className="w-4 h-4 text-purple-600 rounded"
              />
              <span className="font-semibold text-slate-700">Chữ in hoa (A-Z)</span>
            </label>

            <label className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer">
              <input
                type="checkbox"
                checked={genLower}
                onChange={(e) => setGenLower(e.target.checked)}
                className="w-4 h-4 text-purple-600 rounded"
              />
              <span className="font-semibold text-slate-700">{isEn ? 'Lowercase (a-z)' : 'Chữ thường (a-z)'}</span>
            </label>

            <label className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer">
              <input
                type="checkbox"
                checked={genDigits}
                onChange={(e) => setGenDigits(e.target.checked)}
                className="w-4 h-4 text-purple-600 rounded"
              />
              <span className="font-semibold text-slate-700">{isEn ? 'Numbers (0-9)' : 'Chữ số (0-9)'}</span>
            </label>

            <label className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer">
              <input
                type="checkbox"
                checked={genSymbols}
                onChange={(e) => setGenSymbols(e.target.checked)}
                className="w-4 h-4 text-purple-600 rounded"
              />
              <span className="font-semibold text-slate-700">{isEn ? 'Special Symbols (!@#$)' : 'Ký tự đặc biệt (!@#$)'}</span>
            </label>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
          >
            {isEn ? 'Close' : 'Đóng'}
          </button>
        </div>
      </div>
    </div>
  );
}
