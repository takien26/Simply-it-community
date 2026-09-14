'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '@/lib/i18n/context';
import {
  ChevronDown,
  Search,
  Plus,
  PlusCircle,
  Edit2,
  Trash2,
  Check,
  X,
} from 'lucide-react';

export interface ManageableItem {
  id: string;
  name: string;
  icon?: string | React.ReactNode;
  description?: string;
}

export interface ManageableDropdownProps {
  label: string;
  placeholder?: string;
  items: ManageableItem[];
  selectedValue: string;
  onSelect: (val: string) => void;
  onAdd: (name: string) => Promise<void> | void;
  onEdit: (id: string, newName: string) => Promise<void> | void;
  onDelete: (id: string, name: string) => Promise<void> | void;
  icon?: React.ReactNode;
  themeColor?: 'blue' | 'indigo' | 'purple' | 'slate';
  allowEmpty?: boolean;
  emptyLabel?: string;
}

export function ManageableDropdown({
  label,
  placeholder,
  items,
  selectedValue,
  onSelect,
  onAdd,
  onEdit,
  onDelete,
  icon,
  themeColor = 'blue',
  allowEmpty = true,
  emptyLabel,
}: ManageableDropdownProps) {
  const { language } = useLanguage();
  const txt = (vi: string, en: string, ja?: string) => {
    if (language === 'ja') return ja || en;
    if (language === 'en') return en;
    return vi;
  };
  const isEn = language === 'en';
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const addInputRef = useRef<HTMLInputElement>(null);

  const resolvedPlaceholder = placeholder || txt('-- Chọn mục --', '-- Select item --', '-- 項目を選択 --');
  const resolvedEmptyLabel = emptyLabel || txt('-- Không chọn --', '-- None --', '-- 選択なし --');

  const selectedItem = items.find((i) => i.id === selectedValue || i.name === selectedValue);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setIsAdding(false);
        setEditingId(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && searchInputRef.current && !isAdding && !editingId) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isAdding && addInputRef.current) {
      setTimeout(() => addInputRef.current?.focus(), 50);
    }
  }, [isAdding]);

  const filteredItems = items.filter((i) =>
    i.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSaveNew = async () => {
    const trimmed = newItemName.trim();
    if (!trimmed) return;
    await onAdd(trimmed);
    setNewItemName('');
    setIsAdding(false);
  };

  const handleSaveEdit = async (id: string) => {
    const trimmed = editingName.trim();
    if (!trimmed) return;
    await onEdit(id, trimmed);
    setEditingId(null);
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      <div className="flex items-center justify-between mb-1">
        <label className="block text-xs font-bold text-slate-700 flex items-center gap-1">
          {icon}
          <span>{label}</span>
        </label>
        <button
          type="button"
          onClick={() => {
            setIsOpen(true);
            setIsAdding(true);
          }}
          className="text-[11px] text-blue-600 hover:underline flex items-center gap-0.5 font-semibold cursor-pointer"
        >
          <PlusCircle className="w-3 h-3" /> {txt('Thêm nhanh', 'Quick add', 'クイック追加')}
        </button>
      </div>

      {/* Select trigger button */}
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          setIsAdding(false);
          setEditingId(null);
        }}
        className="w-full flex items-center justify-between p-2.5 bg-white border border-slate-300 rounded-xl text-sm font-medium text-slate-800 outline-none focus:ring-2 focus:ring-blue-500 text-left cursor-pointer transition-all"
      >
        <span className="truncate flex items-center gap-1.5">
          {selectedItem ? (
            <>
              {selectedItem.icon && <span>{selectedItem.icon}</span>}
              <span className="font-semibold">{selectedItem.name}</span>
            </>
          ) : (
            <span className="text-slate-400 font-normal">{resolvedPlaceholder}</span>
          )}
        </span>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Popover list with inline edit and delete */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-1 w-full min-w-[240px] bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 p-2 space-y-2 animate-in fade-in duration-150">
          {/* Search box & Add toggle */}
          <div className="flex items-center gap-1.5">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder={txt('Tìm kiếm...', 'Search...', '検索...')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            {!isAdding && (
              <button
                type="button"
                onClick={() => setIsAdding(true)}
                className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors shrink-0"
              >
                <Plus className="w-3 h-3" />
                <span>{txt('Thêm', 'Add', '追加')}</span>
              </button>
            )}
          </div>

          {/* Inline Add Input Box */}
          {isAdding && (
            <div className="p-2 bg-blue-50 border border-blue-200 rounded-xl space-y-1.5">
              <p className="text-[11px] font-bold text-blue-900">{txt('Nhập tên mục mới:', 'Enter new item name:', '新しい項目名を入力:')}</p>
              <div className="flex gap-1">
                <input
                  ref={addInputRef}
                  type="text"
                  placeholder={txt('Nhập tên...', 'Enter name...', '名前を入力...')}
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSaveNew();
                    }
                  }}
                  className="flex-1 p-1.5 bg-white border border-blue-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={handleSaveNew}
                  className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold cursor-pointer"
                >{txt('Lưu', 'Save', '保存')}</button>
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs cursor-pointer"
                >
                  {txt('Hủy', 'Cancel', 'キャンセル')}
                </button>
              </div>
            </div>
          )}

          {/* Items list with hover edit/delete */}
          <div className="max-h-52 overflow-y-auto space-y-0.5 divide-y divide-slate-100">
            {allowEmpty && (
              <div
                className="px-2 py-1.5 rounded-lg text-xs text-slate-400 italic hover:bg-slate-50 cursor-pointer"
                onClick={() => {
                  onSelect('');
                  setIsOpen(false);
                }}
              >
                {resolvedEmptyLabel}
              </div>
            )}

            {filteredItems.length === 0 ? (
              <div className="p-2.5 text-center text-xs text-slate-400">{txt('Không tìm thấy mục nào', 'No items found', '項目が見つかりません')}</div>
            ) : (
              filteredItems.map((item) => {
                const isSelected = item.id === selectedValue || item.name === selectedValue;
                const isCurrentlyEditing = editingId === item.id;

                if (isCurrentlyEditing) {
                  return (
                    <div key={item.id} className="p-1.5 bg-amber-50 border border-amber-300 rounded-xl space-y-1">
                      <div className="text-[10px] font-bold text-amber-900">{txt('Chỉnh sửa tên:', 'Edit name:', '名前を編集:')}</div>
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleSaveEdit(item.id);
                            }
                          }}
                          className="flex-1 p-1 bg-white border border-amber-300 rounded text-xs outline-none focus:ring-1 focus:ring-amber-500"
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(item.id)}
                          className="p-1 bg-emerald-600 text-white rounded hover:bg-emerald-700 cursor-pointer"
                          title={txt('Lưu sửa', 'Save edit', '変更を保存')}
                        >
                          <Check className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="p-1 bg-slate-200 text-slate-700 rounded hover:bg-slate-300 cursor-pointer"
                          title={txt('Hủy', 'Cancel', 'キャンセル')}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={item.id}
                    className={`flex items-center justify-between px-2 py-1.5 rounded-lg text-xs transition-colors group cursor-pointer ${
                      isSelected
                        ? 'bg-blue-100/90 text-blue-950 font-bold'
                        : 'hover:bg-blue-50/70 text-slate-800'
                    }`}
                    onClick={() => {
                      onSelect(item.id || item.name);
                      setIsOpen(false);
                    }}
                  >
                    <div className="flex items-center gap-1.5 truncate flex-1 pr-1">
                      {item.icon && <span className="shrink-0">{item.icon}</span>}
                      <span className="truncate">{item.name}</span>
                    </div>

                    {/* Action buttons on hover */}
                    <div
                      className="flex items-center gap-0.5 opacity-80 group-hover:opacity-100 shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(item.id);
                          setEditingName(item.name);
                        }}
                        title={txt('Sửa tên mục này', 'Edit this item', 'この項目を編集')}
                        className="p-1 text-slate-400 hover:text-blue-600 hover:bg-white rounded transition-colors cursor-pointer"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(txt(`Bạn có chắc chắn muốn xóa "${item.name}" khỏi danh sách?`, `Are you sure you want to delete "${item.name}" from the list?`, `"${item.name}" を一覧から削除してもよろしいですか？`))) {
                            onDelete(item.id, item.name);
                          }
                        }}
                        title={txt('Xóa mục này', 'Delete this item', 'この項目を削除')}
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-white rounded transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
