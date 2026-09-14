'use client';

import React, { useState, useEffect } from 'react';
import { Lock, Edit2, X, Dices } from 'lucide-react';
import { PasswordItem, FolderNode, generateSecurePassword } from './types';
import { useLanguage } from '@/lib/i18n/context';

interface PasswordFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'create' | 'edit';
  item?: PasswordItem | null;
  defaultGroupName?: string;
  folderTree: FolderNode[];
  onSuccess: (savedItem: PasswordItem, isEdit: boolean) => void;
}

const emptyForm = {
  title: '',
  groupName: '',
  username: '',
  password: '',
  url: '',
  notes: '',
  isFavorite: false,
};

export function PasswordFormModal({
  isOpen,
  onClose,
  mode,
  item,
  defaultGroupName = '',
  folderTree,
  onSuccess,
}: PasswordFormModalProps) {
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
  const [formData, setFormData] = useState(emptyForm);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && item) {
        setFormData({
          title: item.title,
          username: item.username || '',
          password: item.password,
          url: item.url || '',
          groupName: item.groupName || '🏢 Văn Phòng Trụ Sở Chính / 🌐 Mạng & Firewall Trụ Sở',
          notes: item.notes || '',
          isFavorite: item.isFavorite || false,
        });
      } else {
        setFormData({
          ...emptyForm,
          groupName: defaultGroupName || '',
        });
      }
      setIsSubmitting(false);
    }
  }, [isOpen, mode, item, defaultGroupName]);

  if (!isOpen) return null;

  const isEdit = mode === 'edit';

  const handleGenerateInlinePassword = () => {
    const newPass = generateSecurePassword({
      length: 16,
      useUpper: true,
      useLower: true,
      useDigits: true,
      useSymbols: true,
      avoidAmbiguous: false,
    });
    setFormData((prev) => ({ ...prev, password: newPass }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      if (isEdit && item) {
        const res = await fetch(`/api/passwords/${item.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
        const data = await res.json();
        if (res.ok) {
          onSuccess(data.data, true);
          onClose();
        } else {
          alert(data.error || 'Cập nhật thất bại');
        }
      } else {
        const res = await fetch('/api/passwords', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
        const data = await res.json();
        if (res.ok) {
          onSuccess(data.data, false);
          onClose();
        } else {
          alert(data.error || 'Thêm mật khẩu thất bại');
        }
      }
    } catch {
      alert('Lỗi kết nối khi lưu mật khẩu');
    } finally {
      setIsSubmitting(false);
    }
  };

  const datalistId = isEdit ? 'folder-datalist-edit' : 'folder-datalist-create';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full flex flex-col max-h-[92vh] border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95">
        <div
          className={`flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0 ${
            isEdit
              ? 'bg-gradient-to-r from-amber-50 to-orange-50'
              : 'bg-gradient-to-r from-indigo-50 to-purple-50'
          }`}
        >
          <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
            <span
              className={`p-1.5 text-white rounded-xl shadow-xs ${
                isEdit ? 'bg-amber-500' : 'bg-indigo-600'
              }`}
            >
              {isEdit ? <Edit2 className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
            </span>
            <span>
              {isEdit
                ? (isEn ? 'Update Account & Password' : 'Cập Nhật Tài Khoản & Mật Khẩu')
                : (isEn ? 'Add New Account & Password' : 'Thêm Mới Tài Khoản & Mật Khẩu')}
            </span>
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Tiêu đề / Tên dịch vụ (*) </label>
              <input
                type="text"
                required
                placeholder="VD: Root Server Ubuntu 24.04, Admin Router..."
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className={`w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:bg-white focus:ring-2 font-bold text-slate-900 ${
                  isEdit ? 'focus:ring-amber-500' : 'focus:ring-indigo-500'
                }`}
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Thư Mục</label>
              <input
                type="text"
                list={datalistId}
                placeholder="VD: 🏢 Văn Phòng Trụ Sở Chính / 🐧 Máy chủ Linux / Ubuntu"
                value={formData.groupName}
                onChange={(e) => setFormData({ ...formData, groupName: e.target.value })}
                className={`w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:bg-white focus:ring-2 font-semibold text-indigo-950 ${
                  isEdit ? 'focus:ring-amber-500' : 'focus:ring-indigo-500'
                }`}
              />
              <datalist id={datalistId}>
                {folderTree.flatMap((rg) => [rg.fullPath, ...rg.children.map((c) => c.fullPath)]).map((p) => (
                  <option key={p} value={p} />
                ))}
              </datalist>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Tên đăng nhập / Email / Username</label>
              <input
                type="text"
                placeholder="VD: administrator, root, admin@company.local..."
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                className={`w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:bg-white focus:ring-2 font-mono ${
                  isEdit ? 'focus:ring-amber-500' : 'focus:ring-indigo-500'
                }`}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-bold text-slate-700">Mật khẩu (*) </label>
                <button
                  type="button"
                  onClick={handleGenerateInlinePassword}
                  className="text-purple-600 font-bold text-[10px] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Dices className="w-3 h-3" />
                  <span>Sinh mật khẩu</span>
                </button>
              </div>
              <input
                type="text"
                required
                placeholder="Nhập hoặc tạo mật khẩu..."
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className={`w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:bg-white focus:ring-2 font-mono font-bold text-indigo-950 ${
                  isEdit ? 'focus:ring-amber-500' : 'focus:ring-indigo-500'
                }`}
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Đường dẫn đăng nhập / IP / Host / Port (URL)</label>
            <input
              type="text"
              placeholder="VD: https://portal.company.com hoặc 192.168.1.1:8443 hoặc ssh://10.0.0.15:22"
              value={formData.url}
              onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              className={`w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:bg-white focus:ring-2 font-mono ${
                isEdit ? 'focus:ring-amber-500' : 'focus:ring-indigo-500'
              }`}
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Ghi chú & Hướng dẫn bảo mật</label>
            <textarea
              rows={2}
              placeholder="Ghi chú về cổng port, tài khoản dự phòng, chu kỳ đổi mật khẩu, người quản lý..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className={`w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:bg-white focus:ring-2 ${
                isEdit ? 'focus:ring-amber-500' : 'focus:ring-indigo-500'
              }`}
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700">
              <input
                type="checkbox"
                checked={formData.isFavorite}
                onChange={(e) => setFormData({ ...formData, isFavorite: e.target.checked })}
                className="w-4 h-4 text-amber-500 rounded"
              />
              <span>⭐ Đánh dấu yêu thích (Ghim lên đầu)</span>
            </label>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              {isEn ? 'Cancel' : 'Hủy (ESC)'}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`px-5 py-2 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50 ${
                isEdit
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600'
                  : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700'
              }`}
            >
              {isSubmitting ? '...' : isEdit ? '💾 Lưu Cập Nhật' : '💾 Lưu Mật Khẩu'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
