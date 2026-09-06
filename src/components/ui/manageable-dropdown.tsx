'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Search,
  PlusCircle,
  Edit2,
  Trash2,
  Check,
  ChevronDown,
  X,
  Plus,
} from 'lucide-react';

export interface DropdownItem {
  id: string;
  name: string;
  subtitle?: string;
  icon?: React.ReactNode;
}

export interface ManageableDropdownProps {
  label?: string;
  placeholder?: string;
  items: DropdownItem[];
  selectedValue?: string;
  onSelect: (value: string) => void;
  onAdd?: (name: string) => Promise<void> | void;
  onQuickAddClick?: () => void;
  onEdit?: (id: string, newName: string) => Promise<void> | void;
  onDelete?: (id: string, name: string) => Promise<void> | void;
  icon?: React.ReactNode;
  themeColor?: 'blue' | 'indigo' | 'purple' | 'amber' | 'emerald' | 'slate';
  allowEmpty?: boolean;
  emptyLabel?: string;
  searchPlaceholder?: string;
  className?: string;
}

export function ManageableDropdown({
  label,
  placeholder = '-- Chọn mục --',
  items,
  selectedValue,
  onSelect,
  onAdd,
  onQuickAddClick,
  onEdit,
  onDelete,
  icon,
  themeColor = 'indigo',
  allowEmpty = true,
  emptyLabel = '-- Không chọn / Bỏ liên kết --',
  searchPlaceholder = 'Tìm kiếm nhanh...',
  className = '',
}: ManageableDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const addInputRef = useRef<HTMLInputElement>(null);

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
  }, [isOpen, isAdding, editingId]);

  useEffect(() => {
    if (isAdding && addInputRef.current) {
      setTimeout(() => addInputRef.current?.focus(), 50);
    }
  }, [isAdding]);

  const filteredItems = items.filter((i) => {
    const text = `${i.name} ${i.subtitle || ''}`.toLowerCase();
    return text.includes(searchTerm.toLowerCase());
  });

  const handleSaveNew = async () => {
    const trimmed = newItemName.trim();
    if (!trimmed || !onAdd) return;
    await onAdd(trimmed);
    onSelect(trimmed);
    setNewItemName('');
    setIsAdding(false);
    setIsOpen(false);
  };

  const handleSaveEdit = async (id: string) => {
    const trimmed = editingName.trim();
    if (!trimmed || !onEdit) return;
    await onEdit(id, trimmed);
    setEditingId(null);
  };

  const ringFocusColor =
    themeColor === 'purple'
      ? 'focus:ring-purple-500'
      : themeColor === 'blue'
      ? 'focus:ring-blue-500'
      : themeColor === 'amber'
      ? 'focus:ring-amber-500'
      : themeColor === 'emerald'
      ? 'focus:ring-emerald-500'
      : themeColor === 'slate'
      ? 'focus:ring-slate-500'
      : 'focus:ring-indigo-500';

  const quickAddBtnColor =
    themeColor === 'amber'
      ? 'text-amber-700 hover:text-amber-900 bg-amber-100 hover:bg-amber-200 border-amber-300'
      : themeColor === 'emerald'
      ? 'text-emerald-700 hover:text-emerald-900 bg-emerald-100 hover:bg-emerald-200 border-emerald-300'
      : themeColor === 'purple'
      ? 'text-purple-700 hover:text-purple-900 bg-purple-100 hover:bg-purple-200 border-purple-300'
      : 'text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 border-indigo-200';

  return (
    <div className={`relative w-full ${className}`} ref={containerRef}>
      {label && (
        <div className="flex items-center justify-between mb-1">
          <label className="block text-xs font-bold text-slate-700 flex items-center gap-1">
            {icon}
            <span>{label}</span>
          </label>
          {onQuickAddClick ? (
            <button
              type="button"
              onClick={onQuickAddClick}
              className={`text-[11px] font-bold px-2 py-0.5 rounded-lg border flex items-center gap-0.5 cursor-pointer transition-colors ${quickAddBtnColor}`}
            >
              <Plus className="w-3 h-3" /> <span>+ Thêm mới</span>
            </button>
          ) : onAdd ? (
            <button
              type="button"
              onClick={() => {
                setIsOpen(true);
                setIsAdding(true);
              }}
              className="text-[11px] text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5 font-semibold cursor-pointer hover:underline"
            >
              <PlusCircle className="w-3 h-3" /> Thêm nhanh
            </button>
          ) : null}
        </div>
      )}

      {/* Select trigger button */}
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          setSearchTerm('');
        }}
        className={`w-full min-h-[42px] px-3 py-2 bg-slate-50 hover:bg-slate-100/80 border border-slate-300 rounded-xl text-xs font-medium text-left flex items-center justify-between transition-colors outline-none focus:bg-white focus:ring-2 ${ringFocusColor} cursor-pointer`}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-2">
          {selectedItem ? (
            <>
              {selectedItem.icon && <div className="shrink-0">{selectedItem.icon}</div>}
              <div className="min-w-0 flex-1">
                <div className="font-bold text-xs text-slate-900 truncate leading-snug">
                  {selectedItem.name}
                </div>
                {selectedItem.subtitle && (
                  <div className="text-[10px] text-slate-500 font-mono truncate leading-tight mt-0.5">
                    {selectedItem.subtitle}
                  </div>
                )}
              </div>
            </>
          ) : selectedValue ? (
            <span className="font-semibold text-slate-900 truncate text-xs">{selectedValue}</span>
          ) : (
            <span className="text-slate-400 font-normal truncate text-xs">{placeholder}</span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {allowEmpty && selectedItem && (
            <span
              onClick={(e) => {
                e.stopPropagation();
                onSelect('');
              }}
              title="Bỏ chọn"
              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer mr-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </span>
          )}
          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {/* Dropdown popup */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100 flex flex-col max-h-72">
          {/* Search Box */}
          <div className="p-2 border-b border-slate-100 bg-slate-50/70 shrink-0">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={async (e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (filteredItems.length === 1) {
                      onSelect(filteredItems[0].id || filteredItems[0].name);
                      setIsOpen(false);
                      setSearchTerm('');
                    } else if (searchTerm.trim() && onAdd) {
                      const name = searchTerm.trim();
                      await onAdd(name);
                      onSelect(name);
                      setSearchTerm('');
                      setIsOpen(false);
                    }
                  }
                }}
                placeholder={searchPlaceholder}
                className="w-full pl-8 pr-7 py-1.5 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Quick Add Inline Form */}
          {isAdding && onAdd && (
            <div className="p-2.5 bg-indigo-50/80 border-b border-indigo-100 shrink-0 space-y-2">
              <p className="text-[11px] font-bold text-indigo-900 flex items-center gap-1">
                <Plus className="w-3 h-3 text-indigo-600" /> Thêm mục mới:
              </p>
              <div className="flex items-center gap-1.5">
                <input
                  ref={addInputRef}
                  type="text"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSaveNew();
                    }
                  }}
                  placeholder="Nhập tên..."
                  className="flex-1 p-1.5 bg-white border border-indigo-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                />
                <button
                  type="button"
                  onClick={handleSaveNew}
                  className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Lưu
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsAdding(false);
                    setNewItemName('');
                  }}
                  className="px-2 py-1.5 text-slate-600 hover:bg-slate-200/60 rounded-lg text-xs cursor-pointer"
                >
                  Hủy
                </button>
              </div>
            </div>
          )}

          {/* Items List */}
          <div className="overflow-y-auto flex-1 p-1 divide-y divide-slate-50">
            {/* Quick add option if search term has no match */}
            {searchTerm.trim() && !items.some((i) => i.name.toLowerCase() === searchTerm.trim().toLowerCase()) && onAdd && (
              <button
                type="button"
                onClick={async () => {
                  const name = searchTerm.trim();
                  await onAdd(name);
                  onSelect(name);
                  setSearchTerm('');
                  setIsOpen(false);
                }}
                className="w-full my-1 p-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-xl flex items-center justify-between border border-dashed border-indigo-300 transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-1.5 truncate">
                  <Plus className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <span className="truncate">Tạo mới & Chọn: "{searchTerm.trim()}"</span>
                </span>
                <span className="text-[10px] bg-indigo-600 text-white px-1.5 py-0.5 rounded font-normal shrink-0">Enter ↵</span>
              </button>
            )}

            {allowEmpty && (
              <button
                type="button"
                onClick={() => {
                  onSelect('');
                  setIsOpen(false);
                }}
                className={`w-full p-2 text-left text-xs rounded-xl flex items-center justify-between hover:bg-slate-100 transition-colors cursor-pointer ${
                  !selectedValue ? 'bg-indigo-50/60 text-indigo-900 font-bold' : 'text-slate-500 italic'
                }`}
              >
                <span>{emptyLabel}</span>
                {!selectedValue && <Check className="w-3.5 h-3.5 text-indigo-600" />}
              </button>
            )}

            {filteredItems.length === 0 && !searchTerm.trim() ? (
              <div className="p-4 text-center text-xs text-slate-400">
                Chưa có dữ liệu nào
              </div>
            ) : filteredItems.length === 0 && searchTerm.trim() && !onAdd ? (
              <div className="p-4 text-center text-xs text-slate-400">
                Không tìm thấy kết quả phù hợp
              </div>
            ) : (
              filteredItems.map((item) => {
                const isSelected = item.id === selectedValue || item.name === selectedValue;

                if (editingId === item.id && onEdit) {
                  return (
                    <div key={item.id} className="p-2 bg-amber-50/70 rounded-xl space-y-1.5">
                      <div className="flex items-center gap-1.5">
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
                          className="flex-1 p-1.5 bg-white border border-amber-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-amber-500 font-medium"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(item.id)}
                          className="px-2.5 py-1 bg-amber-600 text-white rounded-lg text-xs font-semibold cursor-pointer hover:bg-amber-700"
                        >
                          Lưu
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="px-2 py-1 text-slate-600 hover:bg-slate-200 rounded-lg text-xs cursor-pointer"
                        >
                          Hủy
                        </button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={item.id}
                    className={`group w-full p-2 rounded-xl flex items-center justify-between hover:bg-slate-100 transition-colors cursor-pointer ${
                      isSelected ? 'bg-indigo-50/80 text-indigo-900 font-bold' : 'text-slate-800 font-medium'
                    }`}
                    onClick={() => {
                      onSelect(item.id || item.name);
                      setIsOpen(false);
                    }}
                  >
                    <div className="flex items-start gap-2.5 min-w-0 flex-1 pr-2 py-0.5">
                      <div className="mt-0.5 shrink-0">
                        {item.icon || <span className="text-sm">📌</span>}
                      </div>
                      <div className="min-w-0 flex-1 text-left">
                        <div className={`text-xs truncate leading-snug ${isSelected ? 'font-bold text-indigo-950' : 'font-semibold text-slate-900'}`}>
                          {item.name}
                        </div>
                        {item.subtitle && (
                          <div className="text-[10px] text-slate-500 font-mono truncate mt-0.5">
                            {item.subtitle}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-1 shrink-0">
                      {isSelected && <Check className="w-4 h-4 text-indigo-600 mr-1 shrink-0" />}

                      {onEdit && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingId(item.id);
                            setEditingName(item.name);
                          }}
                          title="Sửa tên mục này"
                          className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-md transition-all cursor-pointer"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                      )}

                      {onDelete && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`Bạn có chắc muốn xóa "${item.name}"?`)) {
                              onDelete(item.id, item.name);
                            }
                          }}
                          title="Xóa mục này"
                          className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-all cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
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
