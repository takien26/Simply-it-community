'use client';

import React, { useState, useEffect, useRef } from 'react';
import { FolderPlus, X, Upload } from 'lucide-react';
import { POPULAR_ICONS, renderFolderIcon } from './types';
import { useLanguage } from '@/lib/i18n/context';

interface FolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  oldPath?: string;
  parentPath?: string;
  initialName?: string;
  initialIcon?: string;
  onSuccess: (toastMsg: string, newFullPath?: string, expandPath?: string) => void;
}

export function FolderModal({
  isOpen,
  onClose,
  oldPath = '',
  parentPath = '',
  initialName = '',
  initialIcon = '📁',
  onSuccess,
}: FolderModalProps) {
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
  const [folderInputName, setFolderInputName] = useState(initialName);
  const [selectedIcon, setSelectedIcon] = useState(initialIcon);
  const [iconMode, setIconMode] = useState<'PALETTE' | 'UPLOAD' | 'CUSTOM'>('PALETTE');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const iconUploadRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setFolderInputName(initialName);
      setSelectedIcon(initialIcon || '📁');
      setIconMode('PALETTE');
      setIsSubmitting(false);
    }
  }, [isOpen, initialName, initialIcon]);

  if (!isOpen) return null;

  const handleIconFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const base64 = uploadEvent.target?.result as string;
      if (base64) {
        setSelectedIcon(base64);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const rawName = folderInputName.trim();
    if (!rawName || isSubmitting) return;

    const iconPrefix = selectedIcon ? `${selectedIcon} ` : '📁 ';
    let cleanName = rawName.trim();
    const spaceIdx = cleanName.indexOf(' ');
    if (spaceIdx > 0 && spaceIdx <= 4) {
      cleanName = cleanName.slice(spaceIdx + 1).trim();
    }
    const finalFormattedName = `${iconPrefix}${cleanName}`;

    setIsSubmitting(true);
    try {
      if (oldPath) {
        const parts = oldPath.split(' / ');
        parts[parts.length - 1] = finalFormattedName;
        const newFullPath = parts.join(' / ');

        const res = await fetch('/api/passwords/folders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'RENAME', oldPath, newPath: newFullPath }),
        });
        if (res.ok) {
          onSuccess(`✏️ Đã đổi tên thư mục thành "${newFullPath}"`, newFullPath);
          onClose();
        } else {
          const data = await res.json().catch(() => ({}));
          alert(data.error || 'Đổi tên thư mục thất bại');
        }
      } else {
        const res = await fetch('/api/passwords/folders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'CREATE', folderName: finalFormattedName, parentPath }),
        });
        if (res.ok) {
          onSuccess(`📁 Đã tạo thư mục "${finalFormattedName}"`, undefined, parentPath || finalFormattedName);
          onClose();
        } else {
          const data = await res.json().catch(() => ({}));
          alert(data.error || 'Tạo thư mục thất bại');
        }
      }
    } catch {
      alert('Thao tác thư mục thất bại do lỗi mạng');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-slate-200 animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
            <FolderPlus className="w-4 h-4 text-indigo-600" />
            <span>
              {oldPath
                ? (isEn ? `Rename Folder "${oldPath}"` : `Sửa Thư Mục "${oldPath}"`)
                : parentPath
                ? (isEn ? `Create Folder Inside "${parentPath}"` : `Tạo Thư Mục Trong "${parentPath}"`)
                : (isEn ? 'Create New Folder' : 'Tạo Thư Mục Mới')}
            </span>
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Icon Selection with 3 Tabs */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="font-bold text-slate-700">Biểu Tượng (Icon) Thư Mục</label>
              <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-[10px] font-bold">
                <button
                  type="button"
                  onClick={() => setIconMode('PALETTE')}
                  className={`px-2 py-0.5 rounded-md cursor-pointer transition-colors ${
                    iconMode === 'PALETTE' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-500'
                  }`}
                >
                  Kho Icon
                </button>
                <button
                  type="button"
                  onClick={() => setIconMode('UPLOAD')}
                  className={`px-2 py-0.5 rounded-md cursor-pointer transition-colors ${
                    iconMode === 'UPLOAD' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-500'
                  }`}
                >
                  Tải Lên Ảnh
                </button>
                <button
                  type="button"
                  onClick={() => setIconMode('CUSTOM')}
                  className={`px-2 py-0.5 rounded-md cursor-pointer transition-colors ${
                    iconMode === 'CUSTOM' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-500'
                  }`}
                >
                  Dán Emoji
                </button>
              </div>
            </div>

            {/* Tab 1: Palette */}
            {iconMode === 'PALETTE' && (
              <div className="grid grid-cols-6 gap-1.5 p-2 bg-slate-50 border border-slate-200 rounded-2xl max-h-32 overflow-y-auto">
                {POPULAR_ICONS.map((item) => (
                  <button
                    key={item.emoji}
                    type="button"
                    onClick={() => setSelectedIcon(item.emoji)}
                    className={`p-1.5 rounded-xl text-base flex items-center justify-center transition-all cursor-pointer ${
                      selectedIcon === item.emoji
                        ? 'bg-indigo-600 text-white shadow-xs scale-110'
                        : 'hover:bg-slate-200/70 bg-white border border-slate-200'
                    }`}
                    title={item.label}
                  >
                    {item.emoji}
                  </button>
                ))}
              </div>
            )}

            {/* Tab 2: Upload File */}
            {iconMode === 'UPLOAD' && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                <input
                  ref={iconUploadRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleIconFileUpload}
                />
                <div
                  onClick={() => iconUploadRef.current?.click()}
                  className="p-3 border-2 border-dashed border-indigo-300 hover:border-indigo-500 rounded-xl flex items-center justify-center gap-2 cursor-pointer bg-white text-indigo-700 font-bold text-xs"
                >
                  <Upload className="w-4 h-4" />
                  <span>Chọn file ảnh icon (.png, .svg, .ico, .jpg)</span>
                </div>
                {selectedIcon && (selectedIcon.startsWith('data:image') || selectedIcon.startsWith('http')) && (
                  <div className="flex items-center gap-2 bg-white p-2 border border-slate-200 rounded-xl">
                    <img src={selectedIcon} alt="preview" className="w-6 h-6 object-contain rounded" />
                    <span className="text-[11px] text-slate-600 truncate flex-1">Ảnh icon đã chọn</span>
                    <button
                      type="button"
                      onClick={() => setSelectedIcon('📁')}
                      className="text-rose-500 hover:underline text-[10px] font-bold cursor-pointer"
                    >
                      {isEn ? 'Delete' : 'Xóa'}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Tab 3: Custom Text / Emoji Input */}
            {iconMode === 'CUSTOM' && (
              <div className="p-2 bg-slate-50 border border-slate-200 rounded-2xl flex items-center gap-2">
                <span className="text-sm text-slate-500">Dán ký hiệu:</span>
                <input
                  type="text"
                  placeholder="Dán bất kỳ emoji hoặc biểu tượng..."
                  value={selectedIcon}
                  onChange={(e) => setSelectedIcon(e.target.value)}
                  className="flex-1 p-2 bg-white border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                />
              </div>
            )}
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Tên Thư Mục (*)</label>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 flex items-center justify-center bg-indigo-50 border border-indigo-200 rounded-xl shrink-0">
                {renderFolderIcon(selectedIcon)}
              </div>
              <input
                type="text"
                required
                autoFocus
                placeholder="VD: Hạ Tầng Server, Camera, Kế Toán, Chi Nhánh..."
                value={folderInputName}
                onChange={(e) => setFolderInputName(e.target.value)}
                className="w-full p-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-900"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              {isEn ? 'Cancel' : 'Hủy'}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? '...' : '💾 Lưu Thư Mục'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
