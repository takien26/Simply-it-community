'use client';

import { QuickLink } from '@/components/common/QuickLink';
import { DocumentQuickPreviewModal } from '@/components/documents/document-quick-preview-modal';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/lib/i18n/context';
import { fetchWithSwr, invalidateClientCache, useAutoRefresh, triggerDataRefresh } from '@/lib/client-cache';
import { getStoredBaseCurrency, getStoredCurrencies, convertCurrencyAmount } from '@/lib/currency-store';
import {
  Sparkles,
  Plus,
  Search,
  Laptop,
  Filter,
  Wrench,
  ArrowLeftRight,
  UserCheck,
  History,
  Trash2,
  Edit,
  Edit2,
  X,
  Loader2,
  Save,
  Trash,
  User,
  Building,
  Building2,
  MapPin,
  Tag,
  PlusCircle,
  Cpu,
  Sliders,
  CheckCircle2,
  FileSpreadsheet,
  FileText,
  Receipt,
  QrCode,
  Printer,
  ShieldCheck,
  Calendar,
  ExternalLink,
  ChevronDown,
  Check,
  RotateCcw,
  TrendingDown,
  Key,
  DollarSign,
  Coins,
  Terminal,
  Copy,
  MoreHorizontal,
  MoreVertical,
  AlertTriangle,
  Crown,
  Zap,
  CheckCircle,
  Download,
  Layers,
  ShieldAlert,
  Info,
  Clock,
  Globe,
  Eye,
  FolderOpen,
  Link as LinkIcon,
} from 'lucide-react';
import { formatCurrency, formatDate, getRemainingTimeText, numberToVietnameseWords, numberToForeignCurrencyWords } from '@/lib/utils';
import CurrencyInput from '@/components/ui/currency-input';
import WarrantyInput from '@/components/ui/warranty-input';
import AssetQrModal from '@/components/assets/asset-qr-modal';
import BatchQrPrintModal from '@/components/assets/batch-qr-print-modal';
import AssetHandoverModal from '@/components/assets/asset-handover-modal';
import AssetInventoryAuditModal from '@/components/assets/asset-inventory-audit-modal';
import { AssetAuditCreateModal } from '@/components/assets/AssetAuditCreateModal';
import {
  AssetDetailModal,
  AssetTransferModal,
  AssetMaintenanceModal,
  AssetAddModal,
  AssetEditModal,
} from '@/components/assets';

// ==================== CONFIG & FREEMIUM QUOTA ====================
const isProPlan = false;
const MAX_FREE_AGENTS = 20;

export interface CurrencyConfig {
  code: string;
  name: string;
  symbol: string;
  rateToVnd: number;
  flag: string;
}

const DEFAULT_CURRENCIES: CurrencyConfig[] = [
  { code: 'VND', name: 'Việt Nam Đồng', symbol: '₫', rateToVnd: 1, flag: '🇻🇳' },
  { code: 'USD', name: 'Đô la Mỹ', symbol: '$', rateToVnd: 25400, flag: '🇺🇸' },
  { code: 'EUR', name: 'Đồng Euro', symbol: '€', rateToVnd: 27500, flag: '🇪🇺' },
  { code: 'JPY', name: 'Yên Nhật', symbol: '¥', rateToVnd: 165, flag: '🇯🇵' },
  { code: 'SGD', name: 'Đô la Singapore', symbol: 'S$', rateToVnd: 19200, flag: '🇸🇬' },
  { code: 'CNY', name: 'Nhân dân tệ', symbol: '¥', rateToVnd: 3550, flag: '🇨🇳' },
  { code: 'KRW', name: 'Won Hàn Quốc', symbol: '₩', rateToVnd: 18.5, flag: '🇰🇷' },
  { code: 'GBP', name: 'Bảng Anh', symbol: '£', rateToVnd: 32800, flag: '🇬🇧' },
  { code: 'AUD', name: 'Đô la Úc', symbol: 'A$', rateToVnd: 16800, flag: '🇦🇺' },
  { code: 'THB', name: 'Baht Thái', symbol: '฿', rateToVnd: 720, flag: '🇹🇭' },
  { code: 'CAD', name: 'Đô la Canada', symbol: 'C$', rateToVnd: 18500, flag: '🇨🇦' },
];

interface CustomFieldDef {
  key: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'date' | 'boolean';
  placeholder?: string;
  required?: boolean;
  options?: string[];
}

function renderCategoryIcon(icon?: string, className = 'w-4 h-4') {
  if (!icon) return <span>📦</span>;
  if (
    icon.startsWith('http://') ||
    icon.startsWith('https://') ||
    icon.startsWith('/uploads/') ||
    icon.startsWith('data:image/') ||
    icon.startsWith('/images/')
  ) {
    return <img src={icon} alt="icon" className={`${className} object-contain rounded inline-block`} />;
  }
  return <span className="inline-block">{icon}</span>;
}

// Interactive Manageable Dropdown Component (Select, Add, Edit/Rename, Delete)
interface ManageableItem {
  id: string;
  name: string;
  icon?: string | React.ReactNode;
  subText?: string;
}

interface ManageableDropdownProps {
  label: string;
  placeholder?: string;
  items: ManageableItem[];
  selectedValue: string;
  onSelect: (value: string) => void;
  onAdd: (name: string) => Promise<void> | void;
  onEdit: (id: string, newName: string) => Promise<void> | void;
  onDelete: (id: string, name: string) => Promise<void> | void;
  icon?: React.ReactNode;
  themeColor?: 'blue' | 'indigo' | 'purple' | 'slate';
  allowEmpty?: boolean;
  emptyLabel?: string;
}

function ManageableDropdown({
  label,
  placeholder = '-- Chọn mục --',
  items,
  selectedValue,
  onSelect,
  onAdd,
  onEdit,
  onDelete,
  icon,
  themeColor = 'blue',
  allowEmpty = true,
  emptyLabel = '-- Không chọn --',
}: ManageableDropdownProps) {
  const { language } = useLanguage();
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
          <PlusCircle className="w-3 h-3" /> Thêm nhanh
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
            <span className="text-slate-400 font-normal">{placeholder}</span>
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
                placeholder={isEn ? 'Search...' : 'Tìm kiếm...'}
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
                <span>Thêm</span>
              </button>
            )}
          </div>

          {/* Inline Add Input Box */}
          {isAdding && (
            <div className="p-2 bg-blue-50 border border-blue-200 rounded-xl space-y-1.5">
              <p className="text-[11px] font-bold text-blue-900">Nhập tên mục mới:</p>
              <div className="flex gap-1">
                <input
                  ref={addInputRef}
                  type="text"
                  placeholder="Nhập tên..."
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
                >
                  Lưu
                </button>
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs cursor-pointer"
                >{isEn ? 'Cancel' : 'Hủy'}</button>
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
                {emptyLabel}
              </div>
            )}

            {filteredItems.length === 0 ? (
              <div className="p-2.5 text-center text-xs text-slate-400">Không tìm thấy mục nào</div>
            ) : (
              filteredItems.map((item) => {
                const isSelected = item.id === selectedValue || item.name === selectedValue;
                const isCurrentlyEditing = editingId === item.id;

                if (isCurrentlyEditing) {
                  return (
                    <div key={item.id} className="p-1.5 bg-amber-50 border border-amber-300 rounded-xl space-y-1">
                      <div className="text-[10px] font-bold text-amber-900">Chỉnh sửa tên:</div>
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
                          title="Lưu sửa"
                        >
                          <Check className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="p-1 bg-slate-200 text-slate-700 rounded hover:bg-slate-300 cursor-pointer"
                          title={isEn ? 'Cancel' : 'Hủy'}
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
                        title="Sửa tên mục này"
                        className="p-1 text-slate-400 hover:text-blue-600 hover:bg-white rounded transition-colors cursor-pointer"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`Bạn có chắc chắn muốn xóa "${item.name}" khỏi danh sách?`)) {
                            onDelete(item.id, item.name);
                          }
                        }}
                        title="Xóa mục này"
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

export default function AssetsPage() {
  const { language, t } = useLanguage();
  const isEn = language === 'en';
  const [assets, setAssets] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [companies, setCompanies] = useState<string[]>([
    'Công ty Cổ phần Tập đoàn ABC',
    'Công ty TNHH MTV Công Nghệ ABC',
    'Chi nhánh Miền Bắc (Hà Nội)',
    'Chi nhánh Miền Nam (TP.HCM)',
  ]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedCompany, setSelectedCompany] = useState('');
  const [selectedSource, setSelectedSource] = useState<'ALL' | 'MANUAL' | 'AUTO_SCAN'>('ALL');
  const [selectedWarranty, setSelectedWarranty] = useState<'ALL' | 'VALID' | 'EXPIRING' | 'EXPIRED'>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  // Dynamic Currencies & Exchange Rates
  const [currencies, setCurrencies] = useState<CurrencyConfig[]>(DEFAULT_CURRENCIES);
  const [isAddCurrencyModalOpen, setIsAddCurrencyModalOpen] = useState(false);
  const [newCurrencyCode, setNewCurrencyCode] = useState('');
  const [newCurrencyName, setNewCurrencyName] = useState('');
  const [newCurrencyRate, setNewCurrencyRate] = useState('');
  const [newCurrencySymbol, setNewCurrencySymbol] = useState('');
  const [newCurrencyFlag, setNewCurrencyFlag] = useState('🌐');

  // Rates map
  const exchangeRatesMap = useMemo(() => {
    const map: Record<string, number> = {};
    currencies.forEach((c) => {
      map[c.code.toUpperCase()] = c.rateToVnd;
    });
    return map;
  }, [currencies]);

  const convertCurrency = (
    amount: number,
    fromCurrency: string = 'VND',
    toCurrency: string = 'VND',
    recordedHistoricalRate?: number
  ): number => {
    if (!amount || isNaN(amount)) return 0;
    const f = fromCurrency.toUpperCase();
    const t = toCurrency.toUpperCase();
    if (f === t) return amount;

    if (recordedHistoricalRate && !isNaN(recordedHistoricalRate) && recordedHistoricalRate > 0) {
      const inVnd = amount * recordedHistoricalRate;
      const toRate = exchangeRatesMap[t] || 1;
      return inVnd / toRate;
    }

    const fromRate = exchangeRatesMap[f] || 1;
    const toRate = exchangeRatesMap[t] || 1;
    const inVnd = amount * fromRate;
    return inVnd / toRate;
  };

  const formatPrice = (amount: number, currency: string = 'VND'): string => {
    if (amount === null || amount === undefined || isNaN(amount)) return '—';
    if (currency === 'VND') {
      return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Math.round(amount));
    } else if (currency === 'USD') {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
    } else if (currency === 'EUR') {
      return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(amount);
    }
    return new Intl.NumberFormat('vi-VN').format(amount) + ` ${currency}`;
  };

  // Currency Preferences (Synced with Settings)
  const [selectedCurrency, setSelectedCurrency] = useState<string>('VND');

  useEffect(() => {
    setSelectedCurrency(getStoredBaseCurrency());
    const handleCurrencyChange = (e: any) => {
      if (e.detail?.baseCurrency) {
        setSelectedCurrency(e.detail.baseCurrency);
      }
    };
    window.addEventListener('app-currency-changed', handleCurrencyChange);
    return () => window.removeEventListener('app-currency-changed', handleCurrencyChange);
  }, []);

  // Searchable Category & Custom Fields Dropdown Popover
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [categorySearchTerm, setCategorySearchTerm] = useState('');
  const categoryDropdownRef = useRef<HTMLDivElement>(null);

  // Modals & Popups
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isMaintenanceModalOpen, setIsMaintenanceModalOpen] = useState(false);
  const [selectedQrAsset, setSelectedQrAsset] = useState<any>(null);
  const [selectedHandoverAsset, setSelectedHandoverAsset] = useState<any>(null);
  const [handoverModalMode, setHandoverModalMode] = useState<'HANDOVER' | 'RETURN'>('HANDOVER');
  const [handoverPreviousUser, setHandoverPreviousUser] = useState<any>(null);
  const [isInventoryAuditOpen, setIsInventoryAuditOpen] = useState(false);
  const [isAuditCampaignCreateOpen, setIsAuditCampaignCreateOpen] = useState(false);
  const [isScriptModalOpen, setIsScriptModalOpen] = useState(false);
  const [agentServerUrl, setAgentServerUrl] = useState<string>('');
  const [isPricingModalOpen, setIsPricingModalOpen] = useState(false);
  const [activeDropdownAssetId, setActiveDropdownAssetId] = useState<string | null>(null);
  const [copiedScript, setCopiedScript] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);

  // Right-Click Context Menu State
  const [contextMenu, setContextMenu] = useState<{
    isOpen: boolean;
    x: number;
    y: number;
    asset: any | null;
  }>({
    isOpen: false,
    x: 0,
    y: 0,
    asset: null,
  });

  // Auto dismiss context menu on click outside, scroll, or escape key
  useEffect(() => {
    if (!contextMenu.isOpen) return;
    const handleClick = () => setContextMenu((prev) => ({ ...prev, isOpen: false }));
    const handleScroll = () => setContextMenu((prev) => ({ ...prev, isOpen: false }));
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setContextMenu((prev) => ({ ...prev, isOpen: false }));
    };

    window.addEventListener('click', handleClick);
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('click', handleClick);
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [contextMenu.isOpen]);

  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then(data => {
        const url = data?.data?.find((s: any) => s.key === 'app.server_url')?.value;
        setAgentServerUrl(url || (typeof window !== 'undefined' ? window.location.origin : ''));
      })
      .catch(() => {
        if (typeof window !== 'undefined') setAgentServerUrl(window.location.origin);
      });
  }, []);

  const [transferUserSearch, setTransferUserSearch] = useState('');
  const [isTransferUserDropdownOpen, setIsTransferUserDropdownOpen] = useState(false);
  const [isQuickAddUserOpen, setIsQuickAddUserOpen] = useState(false);
  const [quickAddUserName, setQuickAddUserName] = useState('');
  const [quickAddUserEmail, setQuickAddUserEmail] = useState('');
  const [quickAddUserDept, setQuickAddUserDept] = useState('');
  const [quickAddingUser, setQuickAddingUser] = useState(false);
  const [isBatchPrintOpen, setIsBatchPrintOpen] = useState(false);

  // Transfer Modal State
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transferAsset, setTransferAsset] = useState<any>(null);
  const [transferHistory, setTransferHistory] = useState<any[]>([]);
  const [transferForm, setTransferForm] = useState<{
    actionType: 'TRANSFER' | 'RETURN';
    toUserId: string;
    transferDate: string;
    condition: string;
    locationId: string;
    companyName: string;
    notes: string;
  }>({
    actionType: 'TRANSFER',
    toUserId: '',
    transferDate: new Date().toISOString().split('T')[0],
    condition: 'GOOD',
    locationId: '',
    companyName: '',
    notes: '',
  });
  const [transferError, setTransferError] = useState('');
  const [isSubmittingTransfer, setIsSubmittingTransfer] = useState(false);
  const [activeAsset, setActiveAsset] = useState<any>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Auto-open Detail Modal if URL contains ?id=... or ?assetTag=... or ?tag=...
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const targetId = params.get('id') || params.get('assetTag') || params.get('tag');
    if (!targetId) return;

    if (assets.length > 0) {
      const found = assets.find(
        (a: any) =>
          a.id === targetId ||
          a.assetTag?.toLowerCase() === targetId.toLowerCase() ||
          a.serialNumber?.toLowerCase() === targetId.toLowerCase()
      );
      if (found) {
        setSelectedDetailAsset(found);
        setIsDetailModalOpen(true);
        return;
      }
    }

    fetch(`/api/assets/${encodeURIComponent(targetId)}`)
      .then((r) => r.json())
      .then((res) => {
        const item = res.data || res.asset;
        if (item) {
          setSelectedDetailAsset(item);
          setIsDetailModalOpen(true);
        }
      })
      .catch(() => {});
  }, [assets]);

  const [selectedDetailAsset, setSelectedDetailAsset] = useState<any>(null);
  const [isDocPreviewOpen, setIsDocPreviewOpen] = useState(false);
  const [detailSoftwareSearch, setDetailSoftwareSearch] = useState('');
  const [detailSoftwareFilter, setDetailSoftwareFilter] = useState<'ALL' | 'MATCHED' | 'UNMANAGED' | 'CRACK' | 'OTHER'>('ALL');
  const [detailMaintenanceLogs, setDetailMaintenanceLogs] = useState<any[]>([]);
  const [editingAssetId, setEditingAssetId] = useState<string | null>(null);
  const [editingAsset, setEditingAsset] = useState<any>(null);

  // Global ESC Key Listener to close any open modal
  useEffect(() => {
    function handleGlobalKeyDownAssets(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setIsAddModalOpen(false);
        setIsEditModalOpen(false);
        setIsDetailModalOpen(false);
        setIsTransferModalOpen(false);
        setIsMaintenanceModalOpen(false);
        setIsAddCurrencyModalOpen(false);
        setSelectedQrAsset(null);
        setIsBatchPrintOpen(false);
        setIsCategoryDropdownOpen(false);
      }
    }
    window.addEventListener('keydown', handleGlobalKeyDownAssets);
    return () => window.removeEventListener('keydown', handleGlobalKeyDownAssets);
  }, []);

  // Modal 4-Tab State
  const [modalActiveTab, setModalActiveTab] = useState<'general' | 'specs' | 'finance' | 'licenses'>('general');
  const [licenses, setLicenses] = useState<any[]>([]);
  const [selectedLicenseIds, setSelectedLicenseIds] = useState<string[]>([]);
  const [newLicForm, setNewLicForm] = useState({
    name: '',
    licenseKey: '',
    licenseType: 'PERPETUAL',
    totalSeats: 1,
  });
  const [isSubmittingNewLic, setIsSubmittingNewLic] = useState(false);
  const [showAdminAddLicForm, setShowAdminAddLicForm] = useState(false);
  const [qrLabelSize, setQrLabelSize] = useState<'50x30' | '40x20' | 'A4'>('50x30');

  // Pro Upgrade Form State
  const [upgradeForm, setUpgradeForm] = useState<{
    fullName: string;
    phone: string;
    company: string;
    submitted: boolean;
  }>({
    fullName: '',
    phone: '',
    company: '',
    submitted: false,
  });

  const [maintenanceLogs, setMaintenanceLogs] = useState<any[]>([]);
  const [aiLookupLoading, setAiLookupLoading] = useState(false);
  const aiLookupCacheRef = useRef<Map<string, any>>(new Map());
  const [aiLookupStatus, setAiLookupStatus] = useState<string | null>(null);

  // Add Form State
  const [formData, setFormData] = useState<any>({
    name: '',
    assetTag: '',
    categoryId: '',
    brand: '',
    model: '',
    serialNumber: '',
    status: 'AVAILABLE',
    condition: 'NEW',
    purchaseDate: new Date().toISOString().split('T')[0],
    purchasePrice: '',
    purchaseCurrency: 'VND',
    exchangeRate: 1,
    depreciationMonths: 36,
    warrantyExpiry: '',
    companyName: '',
    vendorId: '',
    locationId: '',
    contractNumber: '',
    invoiceNumber: '',
    invoiceUrl: '',
    assignedUserId: '',
    specs: {},
    notes: '',
  });

  // Edit Form State
  const [editFormData, setEditFormData] = useState<any>({
    purchaseCurrency: 'VND',
    exchangeRate: 1,
    depreciationMonths: 36,
    specs: {},
  });

  // Maintenance Form State
  const [maintenanceForm, setMaintenanceForm] = useState<any>({
    type: 'REPAIR',
    title: '',
    description: '',
    cost: '',
    costCurrency: 'VND',
    performedAt: new Date().toISOString().split('T')[0],
    performedById: '',
    vendorId: '',
    notes: '',
  });

  const isMasterLoadedRef = useRef(false);

  const loadData = useCallback(async (forceFresh = false) => {
    try {
      if (forceFresh) {
        invalidateClientCache('/api/assets');
      }
      await Promise.all([
        // 1. Fetch Assets with SWR Cache (0ms instant render)
        fetchWithSwr<any>('/api/assets?pageSize=1000', (assetsRes) => {
          if (assetsRes) {
            const list = Array.isArray(assetsRes) ? assetsRes : assetsRes.data || assetsRes.assets || [];
            setAssets(list);
            setLoading(false);
          }
        }, 30000, forceFresh),

        // 2. Fetch Master Data with SWR Cache (0ms instant render)
        fetchWithSwr<any>('/api/master-data', (masterRes) => {
          if (masterRes?.data) {
            const md = masterRes.data;
            if (md.categories) setCategories(md.categories);
            if (md.locations) setLocations(md.locations);
            if (md.vendors) setVendors(md.vendors);
            if (md.users) setUsers(md.users);
            if (md.companies) setCompanies(md.companies);
          }
        }, 60000, forceFresh),

        // 3. Fetch Licenses with SWR Cache
        fetchWithSwr<any>('/api/licenses', (licRes) => {
          if (licRes && (licRes.success || licRes.data || licRes.licenses)) {
            setLicenses(licRes.data || licRes.licenses || []);
          }
        }, 30000, forceFresh),
      ]);
    } catch (error) {
      console.error('Failed to load assets data:', error);
      setLoading(false);
    }
  }, []);

  // Connect Professional Auto-Refresh & Instant Reactive Sync
  const { isRefreshing: isAutoRefreshing, refreshNow } = useAutoRefresh({
    onRefresh: loadData,
    scope: 'assets',
  });

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Quick Create User for Transfer / Assign modal
  const handleQuickCreateUser = async () => {
    if (!quickAddUserName.trim() || !quickAddUserEmail.trim()) return;
    setQuickAddingUser(true);
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: quickAddUserName.trim(),
          email: quickAddUserEmail.trim(),
          department: quickAddUserDept.trim() || 'Nhân sự',
          roleName: 'Staff',
        }),
      });
      const data = await res.json();
      if (data.success && data.user) {
        setUsers((prev) => [data.user, ...prev]);
        setTransferForm((prev) => ({ ...prev, toUserId: data.user.id }));
        setIsQuickAddUserOpen(false);
        setQuickAddUserName('');
        setQuickAddUserEmail('');
        setQuickAddUserDept('');
      } else {
        alert(data.error || 'Lỗi khi tạo nhân viên nhanh');
      }
    } catch {
      alert('Lỗi kết nối khi tạo nhân viên');
    } finally {
      setQuickAddingUser(false);
    }
  };

  // Global ESC Key Listener to close any open modal
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (isTransferModalOpen) setIsTransferModalOpen(false);
        if (isDetailModalOpen) setIsDetailModalOpen(false);
        if (isAddModalOpen) setIsAddModalOpen(false);
        if (isEditModalOpen) setIsEditModalOpen(false);
        if (isMaintenanceModalOpen) setIsMaintenanceModalOpen(false);
        if (selectedQrAsset) setSelectedQrAsset(null);
        if (isBatchPrintOpen) setIsBatchPrintOpen(false);
        if (isScriptModalOpen) setIsScriptModalOpen(false);
        if (isPricingModalOpen) setIsPricingModalOpen(false);
        setActiveDropdownAssetId(null);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAddModalOpen, isEditModalOpen, isMaintenanceModalOpen, selectedQrAsset, isBatchPrintOpen, isScriptModalOpen, isPricingModalOpen]);

  // Click outside listener for category dropdown and action dropdowns
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(event.target as Node)) {
        setIsCategoryDropdownOpen(false);
      }
      const target = event.target as HTMLElement;
      if (!target.closest('.asset-actions-dropdown-container')) {
        setActiveDropdownAssetId(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Helper to find custom fields for current selected category
  const getCategoryFields = (categoryId: string): CustomFieldDef[] => {
    const cat = categories.find((c) => c.id === categoryId);
    if (cat && Array.isArray(cat.customFields)) {
      return cat.customFields;
    }
    return [];
  };
  // Helper to map any spec key to unified Vietnamese label
  const getFriendlySpecLabel = (rawKey: string, categoryId?: string): string => {
    if (!rawKey) return '';
    const cleanKey = rawKey.trim().toLowerCase().replace(/[^a-z0-9]/g, '');

    // 1. Check defined category fields
    if (categoryId) {
      const catFields = getCategoryFields(categoryId);
      const matched = catFields.find((f) => f.key.toLowerCase().replace(/[^a-z0-9]/g, '') === cleanKey);
      if (matched) return matched.label;
    }

    // 2. Dictionary of standard and AI-extracted fields
    const DICTIONARY: Record<string, string> = {
      cpu: 'CPU / Vi xử lý',
      processor: 'CPU / Vi xử lý',
      chip: 'CPU / Vi xử lý',
      ram: 'Dung lượng RAM',
      memory: 'Dung lượng RAM',
      storage: 'Ổ cứng / SSD',
      ssd: 'Ổ cứng / SSD',
      hdd: 'Ổ cứng / HDD',
      rom: 'Bộ nhớ trong',
      display: 'Kích thước màn hình',
      screensize: 'Kích thước màn hình',
      screen: 'Màn hình',
      resolution: 'Độ phân giải',
      refreshrate: 'Tần số quét màn hình',
      os: 'Hệ điều hành',
      operatingsystem: 'Hệ điều hành',
      computername: 'Tên máy tính',
      hostname: 'Tên máy tính',
      color: 'Màu sắc',
      material: 'Chất liệu vỏ',
      includedaccessories: 'Phụ kiện đi kèm',
      accessories: 'Phụ kiện đi kèm',
      gpu: 'Card đồ họa (GPU)',
      graphics: 'Card đồ họa (GPU)',
      graphicscard: 'Card đồ họa (GPU)',
      battery: 'Dung lượng Pin',
      weight: 'Trọng lượng',
      ipaddress: 'Địa chỉ IP',
      ip: 'Địa chỉ IP',
      macaddress: 'Địa chỉ MAC',
      mac: 'Địa chỉ MAC',
      ports: 'Cổng kết nối',
      paneltype: 'Loại tấm nền',
      printspeed: 'Tốc độ in',
      papersize: 'Khổ giấy in',
      bandwidth: 'Băng thông',
    };

    if (DICTIONARY[cleanKey]) return DICTIONARY[cleanKey];

    // Fallback: Title case formatting
    return rawKey
      .replace(/([A-Z])/g, ' $1')
      .replace(/_/g, ' ')
      .trim()
      .toUpperCase();
  };


  // Company Handlers (Add, Edit, Delete)
  const handleAddCompany = async (name: string) => {
    try {
      const res = await fetch('/api/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (res.ok) {
        setCompanies((prev) => Array.from(new Set([...prev, name])));
        if (isAddModalOpen) setFormData((prev: any) => ({ ...prev, companyName: name }));
        if (isEditModalOpen) setEditFormData((prev: any) => ({ ...prev, companyName: name }));
      }
    } catch {
      console.error('Không thể thêm công ty');
    }
  };

  const handleEditCompany = async (oldName: string, newName: string) => {
    try {
      const res = await fetch('/api/companies', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldName, newName }),
      });
      if (res.ok) {
        setCompanies((prev) => prev.map((c) => (c === oldName ? newName : c)));
        if (formData.companyName === oldName) setFormData((prev: any) => ({ ...prev, companyName: newName }));
        if (editFormData.companyName === oldName) setEditFormData((prev: any) => ({ ...prev, companyName: newName }));
        await loadData();
      }
    } catch {
      console.error('Không thể cập nhật công ty');
    }
  };

  const handleDeleteCompany = async (name: string) => {
    try {
      const res = await fetch(`/api/companies?name=${encodeURIComponent(name)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setCompanies((prev) => prev.filter((c) => c !== name));
        if (formData.companyName === name) setFormData((prev: any) => ({ ...prev, companyName: '' }));
        if (editFormData.companyName === name) setEditFormData((prev: any) => ({ ...prev, companyName: '' }));
        invalidateClientCache('/api/master-data');
        triggerDataRefresh('master-data');
      }
    } catch {
      console.error('Không thể xóa công ty');
    }
  };

  // Category Handlers (Add, Edit, Delete)
  const handleAddCategory = async (name: string) => {
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, icon: '📦' }),
      });
      const data = await res.json();
      if (res.ok) {
        setCategories((prev) => [...prev, data.data]);
        if (isAddModalOpen) setFormData((prev: any) => ({ ...prev, categoryId: data.data.id }));
        if (isEditModalOpen) setEditFormData((prev: any) => ({ ...prev, categoryId: data.data.id }));
        invalidateClientCache('/api/master-data');
        triggerDataRefresh('master-data');
      }
    } catch {
      console.error('Không thể thêm danh mục');
    }
  };

  const handleEditCategory = async (id: string, newName: string) => {
    try {
      const res = await fetch(`/api/categories/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName }),
      });
      if (res.ok) {
        setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, name: newName } : c)));
        invalidateClientCache('/api/master-data');
        triggerDataRefresh('master-data');
        await loadData(true);
      }
    } catch {
      console.error('Không thể sửa danh mục');
    }
  };

  const handleDeleteCategory = async (id: string) => {
    try {
      setCategories((prev) => prev.filter((c) => c.id !== id));
      if (formData.categoryId === id) setFormData((prev: any) => ({ ...prev, categoryId: '' }));
      if (editFormData.categoryId === id) setEditFormData((prev: any) => ({ ...prev, categoryId: '' }));
      const res = await fetch(`/api/categories/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        invalidateClientCache('/api/master-data');
        triggerDataRefresh('master-data');
      } else {
        console.error(data.error || 'Không thể xóa danh mục');
        await loadData(true);
      }
    } catch {
      console.error('Không thể xóa danh mục');
      await loadData(true);
    }
  };

  // Location Handlers (Add, Edit, Delete)
  const handleAddLocation = async (name: string) => {
    try {
      const res = await fetch('/api/locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (res.ok) {
        setLocations((prev) => [...prev, data.data]);
        if (isAddModalOpen) setFormData((prev: any) => ({ ...prev, locationId: data.data.id }));
        if (isEditModalOpen) setEditFormData((prev: any) => ({ ...prev, locationId: data.data.id }));
        invalidateClientCache('/api/master-data');
        triggerDataRefresh('master-data');
      }
    } catch {
      console.error('Không thể thêm vị trí');
    }
  };

  const handleEditLocation = async (id: string, newName: string) => {
    try {
      const res = await fetch(`/api/locations/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName }),
      });
      if (res.ok) {
        setLocations((prev) => prev.map((l) => (l.id === id ? { ...l, name: newName } : l)));
        invalidateClientCache('/api/master-data');
        triggerDataRefresh('master-data');
        await loadData(true);
      }
    } catch {
      console.error('Không thể sửa vị trí');
    }
  };

  const handleDeleteLocation = async (id: string) => {
    try {
      setLocations((prev) => prev.filter((l) => l.id !== id));
      if (formData.locationId === id) setFormData((prev: any) => ({ ...prev, locationId: '' }));
      if (editFormData.locationId === id) setEditFormData((prev: any) => ({ ...prev, locationId: '' }));
      const res = await fetch(`/api/locations/${id}`, { method: 'DELETE' });
      if (res.ok) {
        invalidateClientCache('/api/master-data');
        triggerDataRefresh('master-data');
      } else {
        await loadData(true);
      }
    } catch {
      console.error('Không thể xóa vị trí');
      await loadData(true);
    }
  };

  // Vendor Handlers (Add, Edit, Delete)
  const handleAddVendor = async (name: string) => {
    try {
      const res = await fetch('/api/vendors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (res.ok) {
        setVendors((prev) => [...prev, data.data]);
        if (isAddModalOpen) setFormData((prev: any) => ({ ...prev, vendorId: data.data.id }));
        if (isEditModalOpen) setEditFormData((prev: any) => ({ ...prev, vendorId: data.data.id }));
        invalidateClientCache('/api/master-data');
        triggerDataRefresh('master-data');
      }
    } catch {
      console.error('Không thể thêm nhà cung cấp');
    }
  };

  const handleEditVendor = async (id: string, newName: string) => {
    try {
      const res = await fetch(`/api/vendors/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName }),
      });
      if (res.ok) {
        setVendors((prev) => prev.map((v) => (v.id === id ? { ...v, name: newName } : v)));
        invalidateClientCache('/api/master-data');
        triggerDataRefresh('master-data');
        await loadData(true);
      }
    } catch {
      console.error('Không thể sửa nhà cung cấp');
    }
  };

  const handleDeleteVendor = async (id: string) => {
    try {
      setVendors((prev) => prev.filter((v) => v.id !== id));
      if (formData.vendorId === id) setFormData((prev: any) => ({ ...prev, vendorId: '' }));
      if (editFormData.vendorId === id) setEditFormData((prev: any) => ({ ...prev, vendorId: '' }));
      const res = await fetch(`/api/vendors/${id}`, { method: 'DELETE' });
      if (res.ok) {
        invalidateClientCache('/api/master-data');
        triggerDataRefresh('master-data');
      } else {
        await loadData(true);
      }
    } catch {
      console.error('Không thể xóa nhà cung cấp');
      await loadData(true);
    }
  };

  // Realtime AI Auto-Lookup and Smart Category Auto-Correction
  const handleAiLookupModel = async (modelName: string, isEdit: boolean = false) => {
    if (!modelName || modelName.trim().length < 2) return;

    const cacheKey = modelName.trim().toLowerCase();
    const currentCatId = isEdit ? editFormData.categoryId : formData.categoryId;

    if (aiLookupCacheRef.current.has(cacheKey)) {
      const cachedData = aiLookupCacheRef.current.get(cacheKey);
      const { brand, specs, matchedCategoryId, matchedCategoryName, warrantyMonths } = cachedData;
      const updateFn = isEdit ? setEditFormData : setFormData;
      const effectiveCatId = matchedCategoryId || currentCatId;
      const displayCategoryName = matchedCategoryName || 'Danh mục';

      updateFn((prev: any) => {
        let autoExpiry = prev.warrantyExpiry;
        if (warrantyMonths && Number(warrantyMonths) > 0 && prev.purchaseDate) {
          const pDate = new Date(prev.purchaseDate);
          pDate.setMonth(pDate.getMonth() + Number(warrantyMonths));
          autoExpiry = pDate.toISOString().split('T')[0];
        }

        return {
          ...prev,
          categoryId: effectiveCatId,
          brand: prev.brand || brand || '',
          warrantyExpiry: autoExpiry || prev.warrantyExpiry,
          specs: { ...(prev.specs || {}), ...(specs || {}) },
        };
      });

      setAiLookupStatus(`⚡ Đã áp dụng tức thì thông số cho "${modelName}"!`);
      setTimeout(() => setAiLookupStatus(null), 2500);
      return;
    }

    setAiLookupLoading(true);
    setAiLookupStatus(`⚡ Đang dùng AI phân tích & xác thực danh mục thiết bị cho "${modelName}"...`);

    try {
      const currentCatId = isEdit ? editFormData.categoryId : formData.categoryId;

      const res = await fetch('/api/ai/lookup-model', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modelName,
          currentCategoryId: currentCatId,
        }),
      });

      const json = await res.json();
      if (json.success && json.data) {
        aiLookupCacheRef.current.set(cacheKey, json.data);
        const { brand, name, specs, matchedCategoryId, matchedCategoryName, warrantyMonths } = json.data;
        const updateFn = isEdit ? setEditFormData : setFormData;

        const effectiveCatId = matchedCategoryId || currentCatId;
        const definedCatFields = getCategoryFields(effectiveCatId);

        const isCategoryChanged = matchedCategoryId && matchedCategoryId !== currentCatId;
        const targetCategoryObj = categories.find((c) => c.id === effectiveCatId);
        const displayCategoryName = targetCategoryObj?.name || matchedCategoryName || 'Danh mục phù hợp';

        const SYNONYM_MAP: Record<string, string> = {
          processor: 'cpu',
          chip: 'cpu',
          vixuly: 'cpu',
          cpu: 'cpu',
          memory: 'ram',
          bonhoram: 'ram',
          ram: 'ram',
          storage: 'storage',
          ssd: 'storage',
          hdd: 'storage',
          rom: 'storage',
          ocung: 'storage',
          display: 'screen',
          screensize: 'screen',
          manhinh: 'screen',
          screen: 'screen',
          sizeinch: 'size_inch',
          os: 'os',
          operatingsystem: 'os',
          hedieuhanh: 'os',
          tenmaytinh: 't_n_m_y_t_nh',
          computername: 't_n_m_y_t_nh',
          hostname: 't_n_m_y_t_nh',
          tnmytnh: 't_n_m_y_t_nh',
          refreshrate: 'refresh_rate',
          tansoquyet: 'refresh_rate',
          mausac: 'color',
          color: 'color',
          chatlieu: 'material',
          material: 'material',
          carddohoa: 'gpu',
          vga: 'gpu',
          gpu: 'gpu',
          accessories: 'includedAccessories',
          phukien: 'includedAccessories',
        };

        updateFn((prev: any) => {
          const currentSpecs: Record<string, any> = { ...(prev.specs || {}) };

          if (specs && typeof specs === 'object') {
            Object.entries(specs).forEach(([rawKey, val]) => {
              if (val === undefined || val === null || String(val).trim() === '') return;

              const cleanRaw = rawKey.toLowerCase().replace(/[^a-z0-9]/g, '');
              const mappedKey = SYNONYM_MAP[cleanRaw] || rawKey;

              const matchedField = definedCatFields.find((f) => {
                const fClean = f.key.toLowerCase().replace(/[^a-z0-9]/g, '');
                return fClean === cleanRaw || fClean === mappedKey.toLowerCase().replace(/[^a-z0-9]/g, '');
              });

              if (matchedField) {
                if (matchedField.type === 'select' && Array.isArray(matchedField.options) && matchedField.options.length > 0) {
                  const valStr = String(val).toLowerCase();
                  const bestOption = matchedField.options.find((opt) => valStr.includes(opt.toLowerCase()) || opt.toLowerCase().includes(valStr));
                  currentSpecs[matchedField.key] = bestOption || matchedField.options[0];
                } else {
                  currentSpecs[matchedField.key] = val;
                }

                if (rawKey !== matchedField.key) delete currentSpecs[rawKey];
                if (cleanRaw !== matchedField.key) delete currentSpecs[cleanRaw];
                if (mappedKey !== matchedField.key) delete currentSpecs[mappedKey];
              } else {
                currentSpecs[mappedKey] = val;
                if (rawKey !== mappedKey) delete currentSpecs[rawKey];
              }
            });

            ['processor', 'PROCESSOR', 'chip'].forEach((k) => { if (k !== 'cpu') delete currentSpecs[k]; });
            ['memory', 'MEMORY', 'bonhoram'].forEach((k) => { if (k !== 'ram') delete currentSpecs[k]; });
            ['ssd', 'SSD', 'rom', 'hdd'].forEach((k) => { if (k !== 'storage') delete currentSpecs[k]; });
            ['display', 'DISPLAY', 'screen_size'].forEach((k) => { if (k !== 'screen') delete currentSpecs[k]; });
            ['operatingsystem', 'OPERATINGSYSTEM'].forEach((k) => { if (k !== 'os') delete currentSpecs[k]; });
            ['computerName', 'hostname', 'tenmaytinh'].forEach((k) => { if (k !== 't_n_m_y_t_nh') delete currentSpecs[k]; });
          }

          let autoExpiry = prev.warrantyExpiry;
          if (warrantyMonths && Number(warrantyMonths) > 0 && prev.purchaseDate) {
            const pDate = new Date(prev.purchaseDate);
            pDate.setMonth(pDate.getMonth() + Number(warrantyMonths));
            autoExpiry = pDate.toISOString().split('T')[0];
          }

          return {
            ...prev,
            categoryId: effectiveCatId,
            brand: prev.brand && prev.brand.trim() !== '' ? prev.brand : (brand || prev.brand || ''),
            name: prev.name && prev.name.trim() !== '' ? prev.name : (name || prev.name || ''),
            warrantyExpiry: autoExpiry || prev.warrantyExpiry,
            specs: currentSpecs,
          };
        });

        if (isCategoryChanged) {
          setAiLookupStatus(`🎯 AI đã tự động chuyển đúng danh mục sang "${displayCategoryName}" & điền đầy đủ cấu hình!`);
        } else {
          setAiLookupStatus(`✨ AI đã xác thực danh mục "${displayCategoryName}" & tự động điền toàn bộ thông số!`);
        }

        setTimeout(() => setAiLookupStatus(null), 5500);
      } else {
        setAiLookupStatus(null);
      }
    } catch (err) {
      console.error('AI Lookup error:', err);
      setAiLookupStatus(null);
    } finally {
      setAiLookupLoading(false);
    }
  };

  // Smart Auto-Lookup Debounce when typing in Model field
  useEffect(() => {
    if (!isAddModalOpen || !formData.model || formData.model.trim().length < 3) return;
    const timer = setTimeout(() => {
      handleAiLookupModel(formData.model, false);
    }, 800);
    return () => clearTimeout(timer);
  }, [formData.model, isAddModalOpen]);

  useEffect(() => {
    if (!isEditModalOpen || !editFormData.model || editFormData.model.trim().length < 3) return;
    const timer = setTimeout(() => {
      handleAiLookupModel(editFormData.model, true);
    }, 800);
    return () => clearTimeout(timer);
  }, [editFormData.model, isEditModalOpen]);

  // Asset CRUD Handlers
  const handleCreateAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        purchaseDate: formData.purchaseDate || new Date().toISOString().split('T')[0],
        assignedLicenseIds: selectedLicenseIds,
        purchaseCurrency: formData.purchaseCurrency || 'VND',
        exchangeRate: formData.exchangeRate || exchangeRatesMap[formData.purchaseCurrency || 'VND'] || 1,
        specs: {
          ...(formData.specs || {}),
          exchangeRate: formData.exchangeRate || exchangeRatesMap[formData.purchaseCurrency || 'VND'] || 1,
          assignedLicenseIds: selectedLicenseIds,
        },
      };

      const res = await fetch('/api/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        setIsAddModalOpen(false);
        setFormData({
          name: '',
          assetTag: '',
          categoryId: categories[0]?.id || '',
          brand: '',
          model: '',
          serialNumber: '',
          status: 'AVAILABLE',
          condition: 'NEW',
          purchaseDate: new Date().toISOString().split('T')[0],
          purchasePrice: '',
          purchaseCurrency: 'VND',
          exchangeRate: 1,
          warrantyExpiry: '',
          companyName: '',
          vendorId: '',
          locationId: '',
          contractNumber: '',
          invoiceNumber: '',
          assignedUserId: '',
          specs: {},
          notes: '',
        });
        invalidateClientCache('/api/assets');
        triggerDataRefresh('assets');
        await loadData(true);
      } else {
        alert(`❌ ${data.error || 'Tạo tài sản thất bại'}`);
      }
    } catch (err: any) {
      alert(`❌ Lỗi kết nối khi tạo tài sản: ${err?.message || err}`);
    }
  };

  const openTransferModal = async (asset: any) => {
    setTransferAsset(asset);
    const activeAsg = asset.assignments?.find((a: any) => a.returnedAt === null);

    setTransferForm({
      actionType: 'TRANSFER',
      toUserId: '',
      transferDate: new Date().toISOString().split('T')[0],
      condition: asset.condition || 'GOOD',
      locationId: asset.locationId || '',
      companyName: asset.companyName || '',
      notes: '',
    });
    setTransferUserSearch('');
    setIsTransferUserDropdownOpen(false);
    setIsQuickAddUserOpen(false);
    setTransferError('');
    setIsTransferModalOpen(true);
    setTransferHistory([]);

    try {
      const res = await fetch(`/api/assets/${asset.id}/transfer`);
      const data = await res.json();
      if (data.success && data.data) {
        setTransferHistory(data.data.history || []);
      }
    } catch {
      console.error('Failed to load transfer history');
    }
  };

  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferAsset) return;

    if (transferForm.actionType === 'TRANSFER' && !transferForm.toUserId) {
      setTransferError('Vui lòng chọn nhân sự mới tiếp nhận thiết bị (*)');
      return;
    }

    setIsSubmittingTransfer(true);
    setTransferError('');
    try {
      const res = await fetch(`/api/assets/${transferAsset.id}/transfer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toUserId: transferForm.actionType === 'TRANSFER' ? transferForm.toUserId : '',
          transferDate: transferForm.transferDate,
          condition: transferForm.condition,
          locationId: transferForm.locationId,
          companyName: transferForm.companyName,
          notes: transferForm.notes,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        const autoPdf = (document.getElementById('auto-pdf-handover') as HTMLInputElement)?.checked;
        const currentTargetAsset = transferAsset;
        const currentAction = transferForm.actionType;
        const prevUser = currentTargetAsset?.assignments?.find((a: any) => !a.returnedAt)?.user || currentTargetAsset?.assignedTo;

        setIsTransferModalOpen(false);
        invalidateClientCache('/api/assets');
        triggerDataRefresh('assets');
        await loadData(true);

        // Refresh detail asset if opened
        if (selectedDetailAsset?.id === currentTargetAsset.id && data.data) {
          setSelectedDetailAsset(data.data);
        }

        // Auto trigger Handover or Return modal if checked
        if (autoPdf && currentTargetAsset) {
          const updatedAsset = data.data || currentTargetAsset;
          if (currentAction === 'RETURN') {
            setHandoverModalMode('RETURN');
            setHandoverPreviousUser(prevUser);
            setSelectedHandoverAsset(updatedAsset);
          } else {
            setHandoverModalMode('HANDOVER');
            setHandoverPreviousUser(null);
            setSelectedHandoverAsset(updatedAsset);
          }
        }
      } else {
        setTransferError(data.error || 'Điều chuyển thất bại');
      }
    } catch {
      setTransferError('Lỗi kết nối khi điều chuyển');
    } finally {
      setIsSubmittingTransfer(false);
    }
  };

  const handleQuickCreateAndAssignLicenseForDetail = async (name: string, key?: string, type?: string) => {
    if (!selectedDetailAsset) return;
    try {
      const res = await fetch('/api/licenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          licenseKey: key ? (key.startsWith('****-') ? key : `****-${key}`) : null,
          licenseType: type === 'OEM' ? 'OEM' : type === 'Subscription' ? 'SUBSCRIPTION' : 'PERPETUAL',
          totalSeats: 1,
          assignedAssetIds: [selectedDetailAsset.id],
          notes: `Tạo từ danh mục quét của máy ${selectedDetailAsset.assetTag || ''} (${selectedDetailAsset.name || ''})`,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        alert(`🎉 Đã thêm thành công License "${name}" vào Kho và gán cho máy tính này!`);
        const resAsset = await fetch(`/api/assets/${selectedDetailAsset.id}`);
        const assetData = await resAsset.json();
        if (assetData.data) {
          setSelectedDetailAsset(assetData.data);
        }
        await loadData();
      } else {
        alert(`❌ Không thể tạo: ${data.error || 'Lỗi server'}`);
      }
    } catch (err: any) {
      alert(`❌ Lỗi kết nối: ${err?.message || err}`);
    }
  };

  const handleQuickAssignLicenseForDetail = async (licenseId: string, licenseName: string) => {
    if (!selectedDetailAsset) return;
    try {
      const res = await fetch(`/api/licenses/${licenseId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assetId: selectedDetailAsset.id,
          notes: `Gán trực tiếp từ danh mục phần mềm máy ${selectedDetailAsset.assetTag || ''}`,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        alert(`🎉 Đã gán License "${licenseName}" vào máy này thành công!`);
        const resAsset = await fetch(`/api/assets/${selectedDetailAsset.id}`);
        const assetData = await resAsset.json();
        if (assetData.data) {
          setSelectedDetailAsset(assetData.data);
        }
        await loadData();
      } else {
        alert(`❌ Không thể gán: ${data.error || 'Lỗi server'}`);
      }
    } catch (err: any) {
      alert(`❌ Lỗi kết nối: ${err?.message || err}`);
    }
  };

  const handleOpenDetail = async (asset: any) => {
    setSelectedDetailAsset(asset);
    setIsDetailModalOpen(true);
    setDetailMaintenanceLogs([]);
    setDetailSoftwareSearch('');
    setDetailSoftwareFilter('ALL');
    try {
      const [maintRes, assetRes] = await Promise.all([
        fetch(`/api/assets/${asset.id}/maintenance`),
        fetch(`/api/assets/${asset.id}`),
      ]);
      const data = await maintRes.json();
      if (data.success && Array.isArray(data.data)) {
        setDetailMaintenanceLogs(data.data);
      }
      const assetData = await assetRes.json();
      if (assetData.data) {
        setSelectedDetailAsset(assetData.data);
      }
    } catch {
      console.error('Failed to load asset maintenance logs');
    }
  };

  const handleOpenEdit = (asset: any, tab: 'general' | 'specs' | 'finance' | 'licenses' = 'general') => {
    setEditingAsset(asset);
    setEditingAssetId(asset.id);
    const activeAssignment = asset.assignments?.find((a: any) => a.returnedAt === null);

    const assetLicenses = asset.licenseAssignments?.map((la: any) => la.licenseId) || asset.specs?.assignedLicenseIds || [];
    setSelectedLicenseIds(assetLicenses);

    const rawCurr = (asset.purchaseCurrency || 'VND').toUpperCase() as 'VND' | 'USD' | 'EUR';
    const savedRate = asset.specs?.exchangeRate || asset.exchangeRate || exchangeRatesMap[rawCurr] || 1;

    setEditFormData({
      name: asset.name || '',
      assetTag: asset.assetTag || '',
      categoryId: asset.categoryId || '',
      brand: asset.brand || '',
      model: asset.model || '',
      serialNumber: asset.serialNumber || '',
      status: asset.status || 'AVAILABLE',
      condition: asset.condition || 'NEW',
      purchaseDate: asset.purchaseDate ? asset.purchaseDate.split('T')[0] : '',
      purchasePrice: asset.purchasePrice || '',
      purchaseCurrency: rawCurr,
      exchangeRate: savedRate,
      depreciationMonths: asset.specs?.depreciationMonths || 36,
      warrantyExpiry: asset.warrantyExpiry ? asset.warrantyExpiry.split('T')[0] : '',
      companyName: asset.companyName || '',
      vendorId: asset.vendorId || '',
      locationId: asset.locationId || '',
      contractNumber: asset.contractNumber || '',
      invoiceNumber: asset.invoiceNumber || '',
      invoiceUrl: asset.invoiceUrl || '',
      assignedUserId: activeAssignment?.user?.id || '',
      specs: asset.specs || {},
      notes: asset.notes || '',
      source: asset.source || 'MANUAL',
      isAutoScanned:
        asset.source === 'AUTO_SCAN' ||
        asset.source === 'AGENT_PS1' ||
        asset.specs?.autoScanned ||
        asset.notes?.includes('PowerShell'),
    });
    setModalActiveTab('general');
    setIsEditModalOpen(true);
  };

  const handleAdminCreateAndAssignLicense = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newLicForm.name.trim()) {
      alert('Vui lòng nhập tên phần mềm / license (*)');
      return;
    }
    setIsSubmittingNewLic(true);
    try {
      const res = await fetch('/api/licenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newLicForm.name.trim(),
          licenseKey: newLicForm.licenseKey.trim() || null,
          licenseType: newLicForm.licenseType || 'PERPETUAL',
          totalSeats: Number(newLicForm.totalSeats) || 1,
          assignedAssetIds: editingAssetId ? [editingAssetId] : [],
          notes: `Quản trị viên thêm trực tiếp từ modal tài sản ${editFormData.assetTag || ''}`,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        alert(`🎉 Đã thêm thành công License "${newLicForm.name}" vào Kho và gán cho thiết bị này!`);
        setNewLicForm({ name: '', licenseKey: '', licenseType: 'PERPETUAL', totalSeats: 1 });
        setShowAdminAddLicForm(false);
        if (data.data?.id) {
          setSelectedLicenseIds((prev) => [...prev, data.data.id]);
        }
        await loadData();
      } else {
        alert(`❌ Không thể tạo: ${data.error || 'Lỗi hệ thống'}`);
      }
    } catch (err: any) {
      alert(`❌ Lỗi kết nối: ${err?.message || err}`);
    } finally {
      setIsSubmittingNewLic(false);
    }
  };

  const handleQuickAddLicenseFromModal = async (name: string, key?: string, type?: string) => {
    try {
      const res = await fetch('/api/licenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          licenseKey: key ? (key.startsWith('****-') ? key : `****-${key}`) : null,
          licenseType: type === 'OEM' ? 'OEM' : type === 'Subscription' ? 'SUBSCRIPTION' : 'PERPETUAL',
          totalSeats: 1,
          assignedAssetIds: editingAssetId ? [editingAssetId] : [],
          notes: `Tạo từ thông số quét của máy ${editFormData.assetTag || ''} (${editFormData.name || ''})`,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        alert(`🎉 Đã thêm thành công License "${name}" vào Kho và gán cho máy tính này!`);
        if (data.data?.id) {
          setSelectedLicenseIds((prev) => [...prev, data.data.id]);
        }
        await loadData();
      } else {
        alert(`❌ Không thể tạo: ${data.error || 'Lỗi server'}`);
      }
    } catch (err: any) {
      alert(`❌ Lỗi kết nối: ${err?.message || err}`);
    }
  };

  const handleUpdateAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAssetId) return;

    try {
      const payload = {
        ...editFormData,
        assignedLicenseIds: selectedLicenseIds,
        purchaseCurrency: editFormData.purchaseCurrency || 'VND',
        exchangeRate: editFormData.exchangeRate || exchangeRatesMap[editFormData.purchaseCurrency || 'VND'] || 1,
        specs: {
          ...(editFormData.specs || {}),
          exchangeRate: editFormData.exchangeRate || exchangeRatesMap[editFormData.purchaseCurrency || 'VND'] || 1,
          assignedLicenseIds: selectedLicenseIds,
          depreciationMonths: editFormData.depreciationMonths || 36,
        },
      };

      const res = await fetch(`/api/assets/${editingAssetId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setIsEditModalOpen(false);
        setEditingAssetId(null);
        invalidateClientCache('/api/assets');
        triggerDataRefresh('assets');
        await loadData(true);
      } else {
        const errorData = await res.json().catch(() => ({}));
        alert(`❌ ${errorData.error || 'Cập nhật tài sản thất bại'}`);
      }
    } catch (err: any) {
      alert(`❌ Lỗi kết nối khi cập nhật tài sản: ${err?.message || err}`);
    }
  };

  const handleDeleteAsset = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa tài sản này?')) return;
    // 0ms Optimistic removal
    setAssets((prev) => prev.filter((a) => a.id !== id));
    if (selectedDetailAsset?.id === id) setIsDetailModalOpen(false);
    if (editingAssetId === id) setIsEditModalOpen(false);

    try {
      const res = await fetch(`/api/assets/${id}`, { method: 'DELETE' });
      if (res.ok) {
        invalidateClientCache('/api/assets');
        triggerDataRefresh('assets');
        await loadData(true);
      } else {
        const errorData = await res.json().catch(() => ({}));
        alert(`❌ ${errorData.error || 'Xóa tài sản thất bại'}`);
        await loadData(true);
      }
    } catch {
      console.error('Xóa thất bại');
      await loadData(true);
    }
  };

  const openMaintenance = async (asset: any) => {
    setActiveAsset(asset);
    setMaintenanceForm({
      type: 'UPGRADE',
      title: '',
      description: '',
      cost: '',
      performedAt: new Date().toISOString().split('T')[0],
      performedById: '',
      vendorId: '',
      notes: '',
    });
    setIsMaintenanceModalOpen(true);
    try {
      const res = await fetch(`/api/assets/${asset.id}/maintenance`);
      const data = await res.json();
      if (data.success) setMaintenanceLogs(data.data);
    } catch {
      console.error('Failed to load logs');
    }
  };

  const handleSaveMaintenance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeAsset) return;
    try {
      const res = await fetch(`/api/assets/${activeAsset.id}/maintenance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(maintenanceForm),
      });
      if (res.ok) {
        setMaintenanceForm({ type: 'UPGRADE', title: '', description: '', cost: '', performedAt: new Date().toISOString().split('T')[0], performedById: '', vendorId: '', notes: '' });
        const logsRes = await fetch(`/api/assets/${activeAsset.id}/maintenance`).then((r) => r.json());
        if (logsRes.success) {
          setMaintenanceLogs(logsRes.data);
          setDetailMaintenanceLogs(logsRes.data);
        }
        invalidateClientCache('/api/assets');
        triggerDataRefresh('assets');
        await loadData(true);
      }
    } catch {
      console.error('Lỗi khi lưu bảo trì');
    }
  };

  const handleDeleteMaintenance = async (logId: string) => {
    if (!confirm('Bạn có chắc muốn xóa bản ghi bảo trì này?')) return;
    if (!activeAsset) return;
    try {
      const res = await fetch(`/api/assets/${activeAsset.id}/maintenance/${logId}`, { method: 'DELETE' });
      if (res.ok) {
        const logsRes = await fetch(`/api/assets/${activeAsset.id}/maintenance`).then((r) => r.json());
        if (logsRes.success) {
          setMaintenanceLogs(logsRes.data);
          setDetailMaintenanceLogs(logsRes.data);
        }
        invalidateClientCache('/api/assets');
        triggerDataRefresh('assets');
        await loadData(true);
      }
    } catch {
      console.error('Lỗi khi xóa bản ghi bảo trì');
    }
  };

  // ==================== AUTO-SCANNED AGENTS QUOTA & FINANCIAL KPIS ====================
  const autoScannedAssetsCount = useMemo(() => {
    return assets.filter(
      (a) =>
        a.source === 'AUTO_SCAN' ||
        a.source === 'AGENT_PS1' ||
        a.isAutoScanned ||
        a.specs?.autoScanned ||
        a.specs?.source === 'AGENT_PS1' ||
        a.notes?.includes('PowerShell') ||
        a.notes?.includes('Auto-Scan') ||
        a.notes?.includes('Agent')
    ).length;
  }, [assets]);

  // Filter assets in memory with search, company, category, status, source, and warranty
  const displayAssets = useMemo(() => {
    return assets.filter((a) => {
      // Search filter
      if (search.trim()) {
        const s = search.toLowerCase();
        const tagMatch = a.assetTag?.toLowerCase().includes(s);
        const nameMatch = a.name?.toLowerCase().includes(s);
        const snMatch = a.serialNumber?.toLowerCase().includes(s);
        const brandMatch = a.brand?.toLowerCase().includes(s);
        const modelMatch = a.model?.toLowerCase().includes(s);
        const companyMatch = a.companyName?.toLowerCase().includes(s);
        const contractMatch = a.contractNumber?.toLowerCase().includes(s);
        const invoiceMatch = a.invoiceNumber?.toLowerCase().includes(s);
        const specsMatch = a.specs ? JSON.stringify(a.specs).toLowerCase().includes(s) : false;
        if (!tagMatch && !nameMatch && !snMatch && !brandMatch && !modelMatch && !companyMatch && !contractMatch && !invoiceMatch && !specsMatch) {
          return false;
        }
      }

      // Company filter
      if (selectedCompany && a.companyName !== selectedCompany) return false;

      // Category filter
      if (selectedCategory && a.categoryId !== selectedCategory) return false;

      // Status filter
      if (selectedStatus && a.status !== selectedStatus) return false;

      // Source filter
      const isAuto =
        a.source === 'AUTO_SCAN' ||
        a.source === 'AGENT_PS1' ||
        a.isAutoScanned ||
        a.specs?.autoScanned ||
        a.specs?.source === 'AGENT_PS1' ||
        a.notes?.includes('PowerShell') ||
        a.notes?.includes('Auto-Scan') ||
        a.notes?.includes('Agent');

      if (selectedSource === 'MANUAL' && isAuto) return false;
      if (selectedSource === 'AUTO_SCAN' && !isAuto) return false;

      // Warranty filter
      if (selectedWarranty !== 'ALL') {
        if (!a.warrantyExpiry) {
          if (selectedWarranty !== 'EXPIRED') return false;
        } else {
          const exp = new Date(a.warrantyExpiry).getTime();
          const now = Date.now();
          const thirtyDays = 30 * 24 * 60 * 60 * 1000;
          if (selectedWarranty === 'VALID' && exp < now) return false;
          if (selectedWarranty === 'EXPIRING' && (exp < now || exp > now + thirtyDays)) return false;
          if (selectedWarranty === 'EXPIRED' && exp >= now) return false;
        }
      }

      return true;
    });
  }, [assets, search, selectedCompany, selectedCategory, selectedStatus, selectedSource, selectedWarranty]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedCompany, selectedCategory, selectedStatus, selectedSource, selectedWarranty]);

  const totalFilteredAssets = displayAssets.length;
  const totalPages = Math.max(1, Math.ceil(totalFilteredAssets / pageSize));
  const paginatedAssets = useMemo(() => {
    return displayAssets.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  }, [displayAssets, currentPage, pageSize]);

  // Export filtered assets to formatted Excel
  const handleExportExcel = async () => {
    if (displayAssets.length === 0) {
      alert('Không có tài sản nào trong danh sách lọc để xuất');
      return;
    }
    try {
      const ExcelJS = await import('exceljs');
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Danh Sách Tài Sản IT', {
        views: [{ showGridLines: true }],
      });

      // Title
      sheet.mergeCells('A1:O1');
      const titleCell = sheet.getCell('A1');
      titleCell.value = 'DANH SÁCH TÀI SẢN & THIẾT BỊ CÔNG NGHỆ THÔNG TIN';
      titleCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
      titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } };
      titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
      sheet.getRow(1).height = 35;

      // Subtitle
      sheet.mergeCells('A2:O2');
      const subCell = sheet.getCell('A2');
      const filterCompanyText = selectedCompany ? ` | Công ty: ${selectedCompany}` : '';
      const filterCatText = selectedCategory ? ` | Danh mục: ${categories.find((c) => c.id === selectedCategory)?.name || ''}` : '';
      subCell.value = `Thời gian xuất: ${new Date().toLocaleString('vi-VN')} | Tổng số lượng: ${displayAssets.length} {isEn ? (displayAssets.length === 1 ? 'device' : 'devices') : 'thiết bị'} lọc${filterCompanyText}${filterCatText}`;
      subCell.font = { name: 'Arial', size: 10, italic: true, color: { argb: 'FF475569' } };
      subCell.alignment = { vertical: 'middle', horizontal: 'center' };
      sheet.getRow(2).height = 20;

      sheet.addRow([]);

      // Headers
      const headers = [
        'STT',
        'Mã Tài Sản',
        'Tên Thiết Bị & Model',
        'Danh Mục',
        'Số Serial',
        'Trạng Thái',
        'Tình Trạng',
        'Công Ty Quản Lý',
        'Người Đang Giữ / Sử Dụng',
        'Phòng Ban Người Dùng',
        'Vị Trí / Kho',
        'Nguyên Giá Mua (VND)',
        'Hạn Bảo Hành',
        'Số Hợp Đồng / Hóa Đơn',
        'Cấu Hình Chi Tiết (Specs)',
      ];

      const headerRow = sheet.addRow(headers);
      headerRow.height = 26;
      headerRow.eachCell((cell) => {
        cell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } };
        cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
          bottom: { style: 'medium', color: { argb: 'FF1E3A8A' } },
        };
      });

      const statusMap: Record<string, string> = {
        AVAILABLE: 'Sẵn sàng trong kho',
        IN_USE: 'Đang sử dụng',
        MAINTENANCE: 'Đang bảo trì',
        RETIRED: 'Đã thanh lý',
        LOST: 'Thất lạc / Mất',
      };

      const conditionMap: Record<string, string> = {
        NEW: 'Mới 100%',
        GOOD: 'Tốt (Đang dùng tốt)',
        FAIR: 'Trung bình (Cũ)',
        POOR: 'Kém (Cần sửa/nâng cấp)',
        BROKEN: 'Hỏng hóc',
      };

      displayAssets.forEach((asset, index) => {
        const assignedUser = asset.assignments?.[0]?.user;
        const holderName = assignedUser ? assignedUser.fullName : 'Sẵn sàng trong kho';
        const holderDept = assignedUser?.department || (assignedUser ? 'Nhân sự' : 'Kho IT');

        const specsObj = asset.specs && typeof asset.specs === 'object' ? asset.specs : {};
        const specsText = Object.entries(specsObj)
          .filter(([k]) => !['autoScanned', 'source', 'paymentHistory'].includes(k))
          .map(([k, v]) => `${k}: ${v}`)
          .join(', ');

        const contractInvoice = [asset.contractNumber, asset.invoiceNumber].filter(Boolean).join(' / ') || '—';

        let warrantyText = 'Không có BH';
        if (asset.warrantyExpiry) {
          warrantyText = new Date(asset.warrantyExpiry).toLocaleDateString('vi-VN');
        }

        const row = sheet.addRow([
          index + 1,
          asset.assetTag,
          `${asset.name}${asset.brand || asset.model ? ` (${[asset.brand, asset.model].filter(Boolean).join(' - ')})` : ''}`,
          asset.category?.name || 'Chưa phân loại',
          asset.serialNumber || '—',
          statusMap[asset.status] || asset.status,
          conditionMap[asset.condition] || asset.condition,
          asset.companyName || '—',
          holderName,
          holderDept,
          asset.location?.name || 'Kho IT',
          asset.purchasePrice ? Number(asset.purchasePrice) : 0,
          warrantyText,
          contractInvoice,
          specsText || '—',
        ]);

        row.height = 24;
        row.alignment = { vertical: 'middle' };
        row.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
        row.getCell(2).alignment = { vertical: 'middle', horizontal: 'center' };
        row.getCell(5).alignment = { vertical: 'middle', horizontal: 'center' };
        row.getCell(6).alignment = { vertical: 'middle', horizontal: 'center' };
        row.getCell(7).alignment = { vertical: 'middle', horizontal: 'center' };
        row.getCell(12).numFmt = '#,##0 "₫"';
        row.getCell(13).alignment = { vertical: 'middle', horizontal: 'center' };

        if (index % 2 === 1) {
          row.eachCell((c) => {
            c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
          });
        }
      });

      sheet.columns = [
        { width: 6 },
        { width: 14 },
        { width: 32 },
        { width: 20 },
        { width: 18 },
        { width: 20 },
        { width: 18 },
        { width: 25 },
        { width: 24 },
        { width: 22 },
        { width: 20 },
        { width: 18 },
        { width: 15 },
        { width: 22 },
        { width: 35 },
      ];

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Danh_Sach_Tai_San_IT_${new Date().toISOString().split('T')[0]}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export error:', err);
      alert('Xuất file Excel thất bại');
    }
  };



  // Financial KPI Metrics (Linear Depreciation & Dual Currency Calculation)
  const financialStats = useMemo(() => {
    let totalOriginal = 0;
    let totalDepreciation = 0;
    const now = new Date();

    displayAssets.forEach((asset) => {
      const rawPrice = Number(asset.purchasePrice) || 0;
      const rawCurr = asset.purchaseCurrency || 'VND';
      const recordedRate = Number((asset as any).exchangeRate || (asset as any).specs?.exchangeRate);
      const priceInSelected = convertCurrency(rawPrice, rawCurr, selectedCurrency, recordedRate);
      totalOriginal += priceInSelected;

      if (rawPrice > 0) {
        const catName = (asset.category?.name || '').toLowerCase();
        const usefulLifeMonths =
          Number((asset as any).specs?.depreciationMonths) ||
          (catName.includes('server') ||
          catName.includes('máy chủ') ||
          catName.includes('switch') ||
          catName.includes('router') ||
          catName.includes('mạng')
            ? 60
            : 36);

        if (asset.purchaseDate) {
          const purchaseDate = new Date(asset.purchaseDate);
          const diffMonths = Math.max(
            0,
            (now.getFullYear() - purchaseDate.getFullYear()) * 12 +
              (now.getMonth() - purchaseDate.getMonth())
          );
          const depreciationRatio = Math.min(1, diffMonths / usefulLifeMonths);
          const assetDeprec = priceInSelected * depreciationRatio;
          totalDepreciation += Math.min(priceInSelected, assetDeprec);
        } else {
          const deprecRatio = asset.condition === 'NEW' ? 0 : 0.25;
          totalDepreciation += priceInSelected * deprecRatio;
        }
      }
    });

    const remainingValue = Math.max(0, totalOriginal - totalDepreciation);

    return {
      totalCount: displayAssets.length,
      pendingCount: displayAssets.filter((a) => a.status === 'PENDING').length,
      availableCount: displayAssets.filter((a) => a.status === 'AVAILABLE').length,
      inUseCount: displayAssets.filter((a) => a.status === 'IN_USE').length,
      maintenanceCount: displayAssets.filter((a) => a.status === 'MAINTENANCE').length,
      totalOriginalPrice: totalOriginal,
      totalDepreciation: totalDepreciation,
      remainingValue: remainingValue,
      depreciationPercent: totalOriginal > 0 ? Math.round((totalDepreciation / totalOriginal) * 100) : 0,
    };
  }, [displayAssets, selectedCurrency]);

  const hasActiveFilters =
    Boolean(search) ||
    Boolean(selectedCompany) ||
    Boolean(selectedCategory) ||
    Boolean(selectedStatus) ||
    selectedSource !== 'ALL' ||
    selectedWarranty !== 'ALL';

  const resetAllFilters = () => {
    setSearch('');
    setSelectedCompany('');
    setSelectedCategory('');
    setSelectedStatus('');
    setSelectedSource('ALL');
    setSelectedWarranty('ALL');
  };

  const isQuotaFull = autoScannedAssetsCount >= MAX_FREE_AGENTS;

  return (
    <div className="space-y-5 animate-in fade-in">
      {/* ==================== 1. TOP BAR: TITLE, ACTIONS, FREEMIUM QUOTA & CURRENCY ==================== */}
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3 pb-2 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <span className="p-2 rounded-2xl bg-blue-600 text-white shadow-xs">
              <Laptop className="w-5 h-5" />
            </span>
            <span>{isEn ? 'IT Asset & Hardware Management' : 'Quản Lý Danh Mục Tài Sản IT'}</span>
            <span className="text-xs font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 px-2.5 py-0.5 rounded-full border border-blue-200 dark:border-blue-800">
              {displayAssets.length} {isEn ? (displayAssets.length === 1 ? 'device' : 'devices') : 'thiết bị'}
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {isEn ? 'Track device lifecycle, financial depreciation, smart warranty, GPO agent scans, and QR barcode printing' : 'Theo dõi vòng đời thiết bị, khấu hao tài chính, bảo hành thông minh, quét Agent GPO và in tem QR'}
          </p>
        </div>

        {/* Right Action Tools */}
        <div className="flex items-center gap-2 flex-wrap justify-start xl:justify-end">



          {/* SCRIPT PS1 / GPO DOWNLOAD BUTTON */}
          <button
            type="button"
            onClick={() => setIsScriptModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-xs font-bold rounded-xl border border-indigo-200 dark:border-indigo-800 shadow-2xs transition-all cursor-pointer shrink-0"
            title={isEn ? 'Download PowerShell script to auto-scan computers and deploy via Active Directory GPO' : 'Lấy Script PowerShell tự động quét máy tính và deploy qua Active Directory GPO'}
          >
            <Terminal className="w-3.5 h-3.5 text-indigo-600" />
            <span>{isEn ? 'Download Agent / Script PS1' : 'Tải Agent / Script PS1'}</span>
          </button>

          

          {/* QR AUDIT BUTTON */}
          <Link
            href="/scan"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer shrink-0"
            title={isEn ? 'Open Mobile QR Inventory Scanner' : 'Mở ứng dụng Quét QR kiểm kê di động'}
          >
            <QrCode className="w-3.5 h-3.5 text-white" />
            <span>{language === 'en' ? '📱 Scan QR Mobile' : '📱 Quét QR Mobile'}</span>
          </Link>

          {/* BATCH PRINT QR */}
          <button
            type="button"
            onClick={() => setIsBatchPrintOpen(true)}
            className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold rounded-xl shadow-2xs transition-all border border-blue-200 cursor-pointer shrink-0"
          >
            <Printer className="w-3.5 h-3.5 text-blue-600" />
            <span>{language === 'en' ? 'Batch Print QR' : 'In Tem Hàng Loạt'}</span>
          </button>

          {/* EXCEL EXPORT */}
          <button
            type="button"
            onClick={handleExportExcel}
            className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl shadow-2xs transition-all shrink-0 cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>{t('assets.export_excel', 'Xuất Excel')}</span>
          </button>

          {/* ADD NEW ASSET BUTTON */}
          <button
            type="button"
            onClick={() => {
              const firstCat = categories[0]?.id || '';
              setFormData({
                name: '',
                assetTag: '',
                categoryId: firstCat,
                brand: '',
                model: '',
                serialNumber: '',
                status: 'AVAILABLE',
                condition: 'NEW',
                purchaseDate: new Date().toISOString().split('T')[0],
                purchasePrice: '',
                purchaseCurrency: 'VND',
                exchangeRate: 1,
                depreciationMonths: 36,
                warrantyExpiry: '',
                companyName: companies[0] || '',
                vendorId: '',
                locationId: locations[0]?.id || '',
                contractNumber: '',
                invoiceNumber: '',
                invoiceUrl: '',
                assignedUserId: '',
                specs: {},
                notes: '',
              });
              setSelectedLicenseIds([]);
              setModalActiveTab('general');
              setIsAddModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t('assets.add_btn', 'Thêm Tài Sản Mới')}</span>
          </button>
        </div>
      </div>

      {/* ==================== 2. DYNAMIC FINANCIAL KPI CARDS ==================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* KPI 1: TỔNG SỐ LƯỢNG */}
        <div className="p-4 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between pb-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{language === 'en' ? 'Total Devices' : 'Tổng Thiết Bị'}</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 dark:text-white">{financialStats.totalCount}</span>
            <span className="text-xs text-slate-400">{language === 'en' ? 'filtered devices' : 'thiết bị lọc'}</span>
          </div>
          <div className="flex items-center gap-1.5 mt-2 text-[10.5px] font-bold flex-wrap">
            {financialStats.pendingCount > 0 && (
              <span
                onClick={() => setSelectedStatus(selectedStatus === 'PENDING' ? '' : 'PENDING')}
                className={`px-2 py-0.5 rounded-full cursor-pointer transition-all ${
                  selectedStatus === 'PENDING'
                    ? 'bg-amber-500 text-white ring-2 ring-amber-400 font-extrabold'
                    : 'bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200 animate-pulse'
                }`}
                title={isEn ? 'Click to filter devices pending approval' : 'Bấm để lọc các thiết bị đang chờ duyệt'}
              >
                🟠 {financialStats.pendingCount} {isEn ? 'pending' : 'chờ duyệt'}
              </span>
            )}
            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full">
              🟢 {financialStats.availableCount} {isEn ? 'available' : 'sẵn sàng'}
            </span>
            <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-full">
              🔵 {financialStats.inUseCount} {isEn ? 'in use' : 'đang dùng'}
            </span>
          </div>
        </div>

        {/* KPI 2: TỔNG NGUYÊN GIÁ */}
        <div className="p-4 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between pb-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{language === 'en' ? 'Total Purchase Value' : 'Tổng Nguyên Giá Mua'}</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-black text-slate-900 dark:text-white truncate">
            {formatPrice(financialStats.totalOriginalPrice, selectedCurrency)}
          </div>
          <div className="text-[10.5px] text-slate-400 mt-2 flex items-center gap-1">
            <span>{isEn ? 'Initial purchase cost across all assets' : 'Chi phí đầu tư ban đầu toàn bộ tài sản'}</span>
          </div>
        </div>

        {/* KPI 3: KHẤU HAO DỒN TÍCH */}
        <div className="p-4 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between pb-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{language === 'en' ? 'Depreciation Total' : 'Khấu Hao Dồn Tích'}</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-black text-amber-700 dark:text-amber-400 truncate">
            {formatPrice(financialStats.totalDepreciation, selectedCurrency)}
          </div>
          <div className="flex items-center gap-2 mt-2">
            <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-500 rounded-full transition-all"
                style={{ width: `${Math.min(100, financialStats.depreciationPercent)}%` }}
              />
            </div>
            <span className="text-[10.5px] font-bold text-amber-700 shrink-0">
              {financialStats.depreciationPercent}%
            </span>
          </div>
        </div>

        {/* KPI 4: GIÁ TRỊ CÒN LẠI (BOOK VALUE) */}
        <div className="p-4 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between pb-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{language === 'en' ? 'Net Book Value' : 'Giá Trị Còn Lại (Book Value)'}</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-black text-emerald-700 dark:text-emerald-400 truncate">
            {formatPrice(financialStats.remainingValue, selectedCurrency)}
          </div>
          <div className="text-[10.5px] text-emerald-700 font-bold mt-2 flex items-center gap-1">
            <span>{isEn ? '✓ Current net book value in operation' : '✓ Giá trị tài sản thực tế còn vận hành'}</span>
          </div>
        </div>
      </div>

      {/* ==================== 3. ADVANCED FILTER & SEARCH BAR ==================== */}
      <div className="bg-white dark:bg-slate-900 p-3.5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-2.5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2">
          {/* SEARCH INPUT */}
          <div className="lg:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder={t('assets.search_placeholder', '🔍 Tìm tên thiết bị, mã Tag, Serial, thương hiệu, HĐ...')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-7 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs outline-none focus:ring-2 focus:ring-blue-500 font-medium"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* FILTER: CÔNG TY */}
          <div>
            <select
              value={selectedCompany}
              onChange={(e) => setSelectedCompany(e.target.value)}
              className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-semibold text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer truncate"
            >
              <option value="">{language === 'en' ? '🏢 Company (All)' : '🏢 Công ty (Tất cả)'}</option>
              {companies.map((c) => (
                <option key={c} value={c}>
                  🏢 {c}
                </option>
              ))}
            </select>
          </div>

          {/* FILTER: DANH MỤC POPOVER */}
          <div className="relative" ref={categoryDropdownRef}>
            <button
              type="button"
              onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
              className={`w-full py-2 px-3 border rounded-2xl text-xs font-semibold flex items-center justify-between gap-1.5 cursor-pointer transition-all ${
                selectedCategory
                  ? 'border-blue-400 bg-blue-50 text-blue-900 ring-2 ring-blue-200'
                  : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              <div className="flex items-center gap-1.5 truncate">
                {(() => {
                  const selCat = categories.find((c) => c.id === selectedCategory);
                  if (selCat) {
                    return (
                      <>
                        <span>{renderCategoryIcon(selCat.icon, 'w-3.5 h-3.5')}</span>
                        <span className="truncate">{selCat.name}</span>
                      </>
                    );
                  }
                  return (
                    <>
                      <span>📦</span>
                      <span className="truncate">{language === 'en' ? 'Categories (All)' : 'Danh mục (Tất cả)'}</span>
                    </>
                  );
                })()}
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            </button>

            {/* Dropdown Popover */}
            {isCategoryDropdownOpen && (
              <div className="absolute left-0 top-full mt-1.5 z-40 w-72 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-3xl shadow-xl p-2 space-y-1.5 animate-in fade-in zoom-in-95 duration-100">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
                  <input
                    type="text"
                    autoFocus
                    placeholder={isEn ? 'Search categories...' : 'Tìm nhanh danh mục...'}
                    value={categorySearchTerm}
                    onChange={(e) => setCategorySearchTerm(e.target.value)}
                    className="w-full pl-8 pr-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div className="max-h-52 overflow-y-auto space-y-0.5 pr-0.5">
                  <div
                    onClick={() => {
                      setSelectedCategory('');
                      setIsCategoryDropdownOpen(false);
                      setCategorySearchTerm('');
                    }}
                    className={`flex items-center justify-between px-2.5 py-2 rounded-xl text-xs cursor-pointer ${
                      !selectedCategory ? 'bg-blue-600 text-white font-bold' : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span>{isEn ? '📦 All devices' : '📦 Tất cả thiết bị'}</span>
                    <span className="text-[10px] opacity-80">{assets.length}</span>
                  </div>
                  {categories
                    .filter((c) => !categorySearchTerm || c.name.toLowerCase().includes(categorySearchTerm.toLowerCase()))
                    .map((cat) => (
                      <div
                        key={cat.id}
                        onClick={() => {
                          setSelectedCategory(cat.id);
                          setIsCategoryDropdownOpen(false);
                          setCategorySearchTerm('');
                        }}
                        className={`flex items-center justify-between px-2.5 py-2 rounded-xl text-xs cursor-pointer ${
                          selectedCategory === cat.id ? 'bg-blue-600 text-white font-bold' : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span>{renderCategoryIcon(cat.icon, 'w-3.5 h-3.5')}</span>
                          <span className="truncate">{cat.name}</span>
                        </div>
                        <span className="text-[10px] opacity-80">{assets.filter((a) => a.categoryId === cat.id).length}</span>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>

          {/* FILTER: TRẠNG THÁI */}
          <div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className={`w-full py-2 px-3 border rounded-2xl text-xs font-bold outline-none cursor-pointer ${
                selectedStatus === 'PENDING'
                  ? 'bg-amber-100 dark:bg-amber-950/60 border-amber-400 text-amber-900 dark:text-amber-200 ring-2 ring-amber-300'
                  : selectedStatus
                  ? 'bg-blue-50 dark:bg-blue-950/50 border-blue-300 text-blue-900 dark:text-blue-200'
                  : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
              }`}
            >
              <option value="">{language === 'en' ? '● Status (All)' : '● Trạng thái (Tất cả)'}</option>
              <option value="PENDING">{language === 'en' ? '🟠 Pending Approval' : '🟠 Đang chờ duyệt'}</option>
              <option value="AVAILABLE">{language === 'en' ? '🟢 Available (In Stock)' : '🟢 Sẵn sàng'}</option>
              <option value="IN_USE">{language === 'en' ? '🔵 In Use' : '🔵 Đang dùng'}</option>
              <option value="MAINTENANCE">{language === 'en' ? '🟡 Maintenance' : '🟡 Bảo trì'}</option>
              <option value="RETIRED">{language === 'en' ? '⚪ Retired / Disposed' : '⚪ Thanh lý'}</option>
            </select>
          </div>

          {/* FILTER: NGUỒN TÀI SẢN (SOURCE) */}
          <div>
            <select
              value={selectedSource}
              onChange={(e) => setSelectedSource(e.target.value as any)}
              className={`w-full py-2 px-3 border rounded-2xl text-xs font-bold outline-none cursor-pointer ${
                selectedSource !== 'ALL'
                  ? 'bg-indigo-50 border-indigo-300 text-indigo-900 ring-2 ring-indigo-200'
                  : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
              }`}
            >
              <option value="ALL">{isEn ? '🔌 Source: All' : '🔌 Nguồn: Tất cả'}</option>
              <option value="MANUAL">{isEn ? '✍️ Manual Entry' : '✍️ Tạo thủ công'}</option>
              <option value="AUTO_SCAN">{isEn ? '🤖 PS1 / GPO Agent' : '🤖 Quét từ PS1 / GPO'}</option>
            </select>
          </div>
        </div>

        {/* SECONDARY FILTER ROW: WARRANTY & RESET */}
        <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800 flex-wrap gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            {/* QUICK FILTER: MÁY THU THẬP QUA FILE / AGENT */}
            <button
              type="button"
              onClick={() => setSelectedSource(selectedSource === 'AUTO_SCAN' ? 'ALL' : 'AUTO_SCAN')}
              className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                selectedSource === 'AUTO_SCAN'
                  ? 'bg-emerald-600 text-white shadow-xs ring-2 ring-emerald-300'
                  : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
              }`}
              title="Bấm để lọc nhanh các máy tính thu thập qua script/file tự động"
            >
              <span>🖥️ Thu Thập Qua File / Scan</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                selectedSource === 'AUTO_SCAN' ? 'bg-white text-emerald-800' : 'bg-emerald-200 text-emerald-900'
              }`}>
                {autoScannedAssetsCount}
              </span>
            </button>

            <span className="text-[11px] font-bold text-slate-400">{language === 'en' ? 'Warranty Filter:' : 'Lọc nhanh bảo hành:'}</span>
            {[
              { id: 'ALL', label: isEn ? 'All' : 'Tất cả' },
              { id: 'VALID', label: isEn ? '🛡️ In Warranty' : '🛡️ Còn bảo hành' },
              { id: 'EXPIRING', label: isEn ? '⚠️ Expiring (< 30 days)' : '⚠️ Sắp hết (< 30 ngày)' },
              { id: 'EXPIRED', label: isEn ? '❌ Expired' : '❌ Đã hết bảo hành' },
            ].map((w) => (
              <button
                key={w.id}
                type="button"
                onClick={() => setSelectedWarranty(w.id as any)}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  selectedWarranty === w.id
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                }`}
              >
                {w.label}
              </button>
            ))}
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetAllFilters}
              className="inline-flex items-center gap-1 px-3 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>{isEn ? 'Clear filters' : 'Xóa bộ lọc'}</span>
            </button>
          )}
        </div>
      </div>

      {/* ==================== 4. ASSET DATA TABLE (DUAL-CURRENCY & STICKY COLUMNS) ==================== */}
      {(() => {
        const activeCategoryFields = selectedCategory ? getCategoryFields(selectedCategory) : [];
        const isCustomView = selectedCategory && activeCategoryFields.length > 0;
        const selectedCatObj = categories.find((c) => c.id === selectedCategory);

        return (
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden">
            {isCustomView && (
              <div className="px-5 py-2.5 bg-blue-50/90 dark:bg-blue-950/40 border-b border-blue-100 dark:border-blue-900 flex items-center justify-between">
                <span className="text-xs font-extrabold text-blue-950 dark:text-blue-200 flex items-center gap-2">
                  {renderCategoryIcon(selectedCatObj?.icon, 'w-4 h-4')}
                  <span>{isEn ? 'Specialized View:' : 'Chế độ xem chuyên biệt:'} {selectedCatObj?.name} ({activeCategoryFields.length} {isEn ? 'extended spec fields' : 'trường cấu hình mở rộng'})</span>
                </span>
                <button
                  onClick={() => setSelectedCategory('')}
                  className="text-xs text-blue-700 dark:text-blue-300 hover:underline font-bold cursor-pointer"
                >
                  {isEn ? '← Back to all' : '← Trở về xem tất cả'}
                </button>
              </div>
            )}

            <div className="w-full overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse min-w-[920px]">
                <thead className="bg-slate-50/90 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-700 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  <tr>
                    {/* Sticky Left Column: MÃ TÀI SẢN */}
                    <th className="py-2 px-2 sticky left-0 z-20 bg-slate-50 dark:bg-slate-800 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.06)] min-w-[85px]">{isEn ? 'ASSET TAG' : 'MÃ TÀI SẢN'}</th>
                    <th className="py-2 px-2 min-w-[150px]">{isEn ? 'DEVICE & MODEL' : 'TÊN THIẾT BỊ & MODEL'}</th>
                    <th className="py-2 px-1.5 min-w-[115px]">{isEn ? 'COMPANY & LOCATION' : 'CÔNG TY & VỊ TRÍ'}</th>
                    <th className="py-2 px-1.5 min-w-[95px]">{isEn ? 'CATEGORY' : 'DANH MỤC'}</th>
                    <th className="py-2 px-1.5 min-w-[90px]">{isEn ? 'COST' : 'NGUYÊN GIÁ'} ({selectedCurrency})</th>
                    <th className="py-2 px-1.5 min-w-[95px]">{isEn ? 'WARRANTY & DATE' : 'BẢO HÀNH & NGÀY MUA'}</th>
                    <th className="py-2 px-1.5 min-w-[75px]">{isEn ? 'STATUS' : 'TRẠNG THÁI'}</th>
                    <th className="py-2 px-1.5 min-w-[90px]">{isEn ? 'ASSIGNED TO' : 'NGƯỜI GIỮ'}</th>
                    {/* Sticky Right Column: Actions */}
                    <th className="py-2 px-2 text-right sticky right-0 z-20 bg-slate-50 dark:bg-slate-800 shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.06)] min-w-[145px]">{isEn ? 'ACTIONS' : 'THAO TÁC'}</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {/* SKELETON LOADING STATE */}
                  {loading ? (
                    Array.from({ length: 6 }).map((_, idx) => (
                      <tr key={idx} className="animate-pulse">
                        <td className="py-2.5 px-2 sticky left-0 bg-white dark:bg-slate-900">
                          <div className="h-3.5 bg-slate-200 dark:bg-slate-800 rounded-md w-16" />
                        </td>
                        <td className="py-2.5 px-2">
                          <div className="space-y-1">
                            <div className="h-3.5 bg-slate-200 dark:bg-slate-800 rounded-md w-32" />
                            <div className="h-2.5 bg-slate-100 dark:bg-slate-800/60 rounded-md w-20" />
                          </div>
                        </td>
                        <td className="py-2.5 px-1.5">
                          <div className="h-3.5 bg-slate-200 dark:bg-slate-800 rounded-md w-24" />
                        </td>
                        <td className="py-2.5 px-1.5">
                          <div className="h-3.5 bg-slate-200 dark:bg-slate-800 rounded-md w-16" />
                        </td>
                        <td className="py-2.5 px-1.5">
                          <div className="h-3.5 bg-slate-200 dark:bg-slate-800 rounded-md w-16" />
                        </td>
                        <td className="py-2.5 px-1.5">
                          <div className="h-3.5 bg-slate-200 dark:bg-slate-800 rounded-md w-14" />
                        </td>
                        <td className="py-2.5 px-1.5">
                          <div className="h-3.5 bg-slate-200 dark:bg-slate-800 rounded-full w-14" />
                        </td>
                        <td className="py-2.5 px-1.5">
                          <div className="h-3.5 bg-slate-200 dark:bg-slate-800 rounded-md w-20" />
                        </td>
                        <td className="py-2.5 px-2 text-right">
                          <div className="h-5 bg-slate-200 dark:bg-slate-800 rounded-lg w-28 ml-auto" />
                        </td>
                      </tr>
                    ))
                  ) : displayAssets.length === 0 ? (
                    /* EMPTY STATE */
                    <tr>
                      <td colSpan={9} className="py-12 text-center">
                        <div className="max-w-sm mx-auto space-y-2.5">
                          <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
                            <Search className="w-5 h-5" />
                          </div>
                          <div className="space-y-0.5">
                            <h4 className="font-extrabold text-xs text-slate-800 dark:text-slate-200">
                              Không tìm thấy tài sản nào phù hợp
                            </h4>
                            <p className="text-[11px] text-slate-400">
                              Thử điều chỉnh từ khóa tìm kiếm hoặc bấm nút bên dưới để khôi phục bộ lọc.
                            </p>
                          </div>
                          {hasActiveFilters && (
                            <button
                              type="button"
                              onClick={resetAllFilters}
                              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer inline-flex items-center gap-1"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>Xóa Tất Cả Bộ Lọc</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    /* DATA ROWS */
                    paginatedAssets.map((asset) => {
                      const assignedUser = asset.assignments?.find((a: any) => a.returnedAt === null)?.user;
                      const warrantyInfo = asset.warrantyExpiry ? getRemainingTimeText(asset.warrantyExpiry) : null;
                      const rawPrice = Number(asset.purchasePrice) || 0;
                      const rawCurr = asset.purchaseCurrency || 'VND';
                      const convertedPrice = convertCurrency(rawPrice, rawCurr, selectedCurrency);
                      const isDual = rawPrice > 0 && rawCurr.toUpperCase() !== selectedCurrency.toUpperCase();
                      const isAutoScanned = asset.source === 'AUTO_SCAN' || asset.source === 'AGENT_PS1' || asset.isAutoScanned;

                      return (
                        <tr
                          key={asset.id}
                          onClick={() => handleOpenDetail(asset)}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            const menuWidth = 230;
                            const menuHeight = 360;
                            const x = Math.min(e.clientX, window.innerWidth - menuWidth - 12);
                            const y = Math.min(e.clientY, window.innerHeight - menuHeight - 12);
                            setContextMenu({
                              isOpen: true,
                              x: Math.max(12, x),
                              y: Math.max(12, y),
                              asset,
                            });
                          }}
                          className="hover:bg-blue-50/50 dark:hover:bg-slate-800/40 transition-colors group cursor-pointer"
                          title="Nhấp vào để xem chi tiết • Nhấp chuột phải để mở menu thao tác nhanh"
                        >
                          {/* STICKY COLUMN: MÃ TÀI SẢN (2 DÒNG GỌN GÀNG) */}
                          <td className="py-2 px-2 sticky left-0 z-10 bg-white dark:bg-slate-900 group-hover:bg-blue-50/90 dark:group-hover:bg-slate-800/90 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.06)] transition-colors">
                            <div className="space-y-0.5">
                              <span className="font-mono font-black text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 px-1.5 py-0.2 rounded text-[10px] inline-block whitespace-nowrap leading-tight">
                                {asset.assetTag}
                              </span>
                              {isAutoScanned && (
                                <span className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[8px] font-extrabold block w-fit leading-none" title="Máy tính được quét tự động qua script PS1">
                                  <span>🤖</span>
                                  <span>{Array.isArray(asset.specs?.installedSoftware) ? `${asset.specs.installedSoftware.length} apps` : 'Scan'}</span>
                                </span>
                              )}
                            </div>
                          </td>

                          {/* TÊN THIẾT BỊ & MODEL (2-3 DÒNG GỌN GÀNG) */}
                          <td className="py-2 px-2">
                            <div className="font-bold text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors text-[11px] leading-snug line-clamp-2" title={asset.name}>
                              {asset.name}
                            </div>
                            <div className="text-[9.5px] text-slate-400 mt-0.5 leading-tight line-clamp-2">
                              {asset.brand && <span className="font-semibold text-slate-600 dark:text-slate-400">{asset.brand} </span>}
                              {asset.model && <span>• {asset.model} </span>}
                              {asset.serialNumber && <span className="font-mono text-slate-500">• SN: {asset.serialNumber}</span>}
                            </div>
                          </td>

                          {/* CÔNG TY & VỊ TRÍ (2 DÒNG GỌN GÀNG) */}
                          <td className="py-2 px-1.5">
                            <div className="space-y-0.5">
                              <span className="font-bold text-slate-800 dark:text-slate-200 text-[10.5px] leading-tight line-clamp-2 block" title={asset.companyName || 'Công ty chung'}>
                                {asset.companyName || 'Tập đoàn ABC'}
                              </span>
                              <span className="text-[9px] text-slate-400 block line-clamp-1" title={asset.location?.name || 'Kho IT'}>
                                📍 {asset.location?.name || 'Kho IT'}
                              </span>
                            </div>
                          </td>

                          {/* DANH MỤC (2-3 DÒNG GỌN GÀNG KHI DÀI) */}
                          <td className="py-2 px-1.5">
                            <div className="inline-flex items-start gap-1 text-[9.5px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded-md leading-tight max-w-[125px]">
                              <span className="shrink-0 mt-0.5">{renderCategoryIcon(asset.category?.icon, 'w-2.8 h-2.8')}</span>
                              <span className="break-words line-clamp-3">{asset.category?.name || 'Khác'}</span>
                            </div>
                          </td>

                          {/* NGUYÊN GIÁ & KHẤU HAO (DUAL-CURRENCY & NET BOOK VALUE) */}
                          <td className="py-2 px-1.5">
                            {rawPrice > 0 ? (
                              <div className="space-y-0.5">
                                <div className="font-black text-slate-900 dark:text-white text-[11px] font-mono leading-tight">
                                  {formatPrice(convertedPrice, selectedCurrency)}
                                </div>
                                {(() => {
                                  const catName = (asset.category?.name || '').toLowerCase();
                                  const usefulMonths = Number((asset as any).specs?.depreciationMonths) ||
                                    (catName.includes('server') || catName.includes('máy chủ') || catName.includes('switch') || catName.includes('router') || catName.includes('mạng') ? 60 : 36);
                                  let depRatio = 0;
                                  const now = new Date();
                                  if (asset.purchaseDate) {
                                    const pDate = new Date(asset.purchaseDate);
                                    const diff = Math.max(0, (now.getFullYear() - pDate.getFullYear()) * 12 + (now.getMonth() - pDate.getMonth()));
                                    depRatio = Math.min(1, diff / usefulMonths);
                                  } else {
                                    depRatio = asset.condition === 'NEW' ? 0 : 0.25;
                                  }
                                  const remaining = Math.max(0, convertedPrice * (1 - depRatio));
                                  const depPercent = Math.min(100, Math.round(depRatio * 100));
                                  return (
                                    <div className="text-[8.5px] leading-tight space-y-0.5" title={`${isEn ? 'Remaining Value' : 'Giá trị còn lại'}: ${formatPrice(remaining, selectedCurrency)} (${usefulMonths} ${isEn ? 'months' : 'tháng'} - ${depPercent}%)`}>
                                      <div className="flex items-center gap-1">
                                        <span className={`font-bold ${depPercent >= 100 ? 'text-rose-600 dark:text-rose-400' : depPercent >= 75 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                          CL: {formatPrice(remaining, selectedCurrency)}
                                        </span>
                                        <span className="text-[8px] text-slate-400 font-mono">({depPercent}%)</span>
                                      </div>
                                      {isDual && (
                                        <div className="text-[8px] text-slate-400 font-mono">
                                          Gốc: {formatPrice(rawPrice, rawCurr)}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })()}
                              </div>
                            ) : (
                              <span className="text-slate-400 italic text-[9.5px]">—</span>
                            )}
                          </td>

                          {/* BẢO HÀNH & NGÀY MUA */}
                          <td className="py-2 px-1.5">
                            <div className="space-y-0.5">
                              {asset.warrantyExpiry ? (
                                <>
                                  {warrantyInfo && (
                                    <span className={`inline-block font-bold px-1.5 py-0.2 rounded text-[8.5px] leading-tight ${warrantyInfo.badgeClass}`}>
                                      {warrantyInfo.text}
                                    </span>
                                  )}
                                  <div className="text-slate-400 text-[9px] font-mono leading-tight">
                                    Hạn: {formatDate(asset.warrantyExpiry)}
                                  </div>
                                </>
                              ) : (
                                <span className="text-slate-400 italic text-[9px]">Không có BH</span>
                              )}
                              <div className="text-[9px] text-blue-600 dark:text-blue-400 font-semibold font-mono leading-tight pt-0.5">
                                📅 Mua: {formatDate(asset.purchaseDate || asset.createdAt)}
                              </div>
                            </div>
                          </td>

                          {/* TRẠNG THÁI */}
                          <td className="py-2 px-1.5">
                            <span
                              className={`inline-flex items-center text-[9px] font-bold px-1.5 py-0.2 rounded-full whitespace-nowrap ${
                                asset.status === 'PENDING'
                                  ? 'bg-amber-100 text-amber-900 border border-amber-300 ring-1 ring-amber-400/40 animate-pulse'
                                  : asset.status === 'AVAILABLE'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : asset.status === 'IN_USE'
                                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                  : asset.status === 'MAINTENANCE'
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                  : 'bg-slate-100 text-slate-600 border border-slate-200'
                              }`}
                            >
                              {asset.status === 'PENDING' && '🟠 Chờ duyệt'}
                              {asset.status === 'AVAILABLE' && '● Sẵn sàng'}
                              {asset.status === 'IN_USE' && '● Đang dùng'}
                              {asset.status === 'MAINTENANCE' && '● Bảo trì'}
                              {asset.status === 'RETIRED' && '● Đã thanh lý'}
                            </span>
                          </td>

                          {/* NGƯỜI GIỮ */}
                          <td className="py-2 px-1.5">
                            {assignedUser ? (
                              <span className="font-bold text-slate-800 dark:text-slate-200 text-[10px] block line-clamp-2 leading-tight" title={assignedUser.fullName}>
                                👤 {assignedUser.fullName}
                              </span>
                            ) : (
                              <span className="text-slate-400 italic text-[9.5px]">Trong kho</span>
                            )}
                          </td>

                          {/* STICKY COLUMN: THAO TÁC (HIỆN TOÀN BỘ ICON TRỰC TIẾP TRÊN DÒNG) */}
                          <td
                            className="py-2 px-2 text-right sticky right-0 z-10 bg-white dark:bg-slate-900 group-hover:bg-blue-50/90 dark:group-hover:bg-slate-800/90 shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.06)] transition-colors min-w-[145px]"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex items-center justify-end gap-1 shrink-0">
                              {/* 1. Sửa */}
                              <button
                                type="button"
                                onClick={() => handleOpenEdit(asset)}
                                title="Chỉnh sửa thông số & phê duyệt"
                                className="p-1 text-blue-600 dark:text-blue-400 hover:bg-blue-100/70 dark:hover:bg-blue-950 rounded-md transition-colors cursor-pointer"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>

                              {/* 2. Cấp phát */}
                              <button
                                type="button"
                                onClick={() => openTransferModal(asset)}
                                title="Cấp phát & điều chuyển nhân sự"
                                className="p-1 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100/70 dark:hover:bg-indigo-950 rounded-md transition-colors cursor-pointer"
                              >
                                <ArrowLeftRight className="w-3.5 h-3.5" />
                              </button>

                              {/* 3. In biên bản bàn giao */}
                              <button
                                type="button"
                                onClick={() => setSelectedHandoverAsset(asset)}
                                title="In biên bản bàn giao PDF"
                                className="p-1 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100/70 dark:hover:bg-emerald-950 rounded-md transition-colors cursor-pointer"
                              >
                                <FileText className="w-3.5 h-3.5" />
                              </button>

                              {/* 4. In mã QR tem nhãn */}
                              <button
                                type="button"
                                onClick={() => setSelectedQrAsset(asset)}
                                title="In mã QR & nhãn tem"
                                className="p-1 text-cyan-600 dark:text-cyan-400 hover:bg-cyan-100/70 dark:hover:bg-cyan-950 rounded-md transition-colors cursor-pointer"
                              >
                                <QrCode className="w-3.5 h-3.5" />
                              </button>

                              {/* 5. Bảo trì / Sửa chữa */}
                              <button
                                type="button"
                                onClick={() => openMaintenance(asset)}
                                title="Bảo trì / Sửa chữa"
                                className="p-1 text-amber-600 dark:text-amber-400 hover:bg-amber-100/70 dark:hover:bg-amber-950 rounded-md transition-colors cursor-pointer"
                              >
                                <Wrench className="w-3.5 h-3.5" />
                              </button>

                              {/* 6. Xóa */}
                              <button
                                type="button"
                                onClick={() => handleDeleteAsset(asset.id)}
                                title="Xóa tài sản này"
                                className="p-1 text-rose-500 dark:text-rose-400 hover:bg-rose-100/70 dark:hover:bg-rose-950 rounded-md transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalFilteredAssets > pageSize && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 text-xs shrink-0">
                <div className="text-slate-500 font-medium">
                  Hiển thị <span className="font-bold text-slate-900 dark:text-white">{Math.min(totalFilteredAssets, (currentPage - 1) * pageSize + 1)}</span> - <span className="font-bold text-slate-900 dark:text-white">{Math.min(totalFilteredAssets, currentPage * pageSize)}</span> trên <span className="font-bold text-blue-600 dark:text-blue-400">{totalFilteredAssets}</span> thiết bị
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-700 font-bold transition-all shadow-xs cursor-pointer"
                  >
                    ← Trước
                  </button>
                  <span className="px-2.5 py-1 font-bold text-slate-800 dark:text-slate-200">
                    Trang {currentPage} / {totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-700 font-bold transition-all shadow-xs cursor-pointer"
                  >
                    Sau →
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })()}
      {/* ==================== MODAL: EDIT / APPROVE ASSET ==================== */}
      <AssetEditModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingAsset(null);
          setEditingAssetId(null);
        }}
        asset={editingAsset}
        initialTab={modalActiveTab}
        categories={categories}
        companies={companies}
        locations={locations}
        vendors={vendors}
        users={users}
        licenses={licenses}
        currencies={currencies}
        exchangeRatesMap={exchangeRatesMap}
        onAddCategory={handleAddCategory}
        onEditCategory={handleEditCategory}
        onDeleteCategory={handleDeleteCategory}
        onAddCompany={handleAddCompany}
        onEditCompany={handleEditCompany}
        onDeleteCompany={handleDeleteCompany}
        onAddLocation={handleAddLocation}
        onEditLocation={handleEditLocation}
        onDeleteLocation={handleDeleteLocation}
        onAddVendor={handleAddVendor}
        onEditVendor={handleEditVendor}
        onDeleteVendor={handleDeleteVendor}
        onOpenAddCurrency={() => setIsAddCurrencyModalOpen(true)}
        onOpenMaintenance={(a) => openMaintenance(a)}
        onSuccess={loadData}
      />

      {/* ==================== MODAL: ASSET DETAIL OVERVIEW ==================== */}
      <AssetDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        asset={selectedDetailAsset}
        categories={categories}
        licenses={licenses}
        selectedCurrency={selectedCurrency}
        language={language}
        exchangeRatesMap={exchangeRatesMap}
        onOpenEdit={(a, tab) => handleOpenEdit(a, tab || 'general')}
        onOpenTransfer={(a) => openTransferModal(a)}
        onOpenMaintenance={(a) => openMaintenance(a)}
        onPrintQr={(a) => setSelectedQrAsset(a)}
        onOpenScript={() => setIsScriptModalOpen(true)}
        onReload={loadData}
      />

      {/* ==================== MODAL: TRANSFER / REASSIGN ASSET ==================== */}
      <AssetTransferModal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
        asset={transferAsset}
        users={users}
        locations={locations}
        companies={companies}
        onUserCreated={(u) => setUsers((prev) => [...prev, u])}
        onSuccess={async (asset, actionType) => {
          setIsTransferModalOpen(false);
          await loadData();
          setSelectedHandoverAsset(asset);
          setHandoverModalMode(actionType === 'RECLAIM' ? 'RETURN' : 'HANDOVER');
          
        }}
      />

      {/* ==================== MODAL: ADD NEW ASSET ==================== */}
      <AssetAddModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        categories={categories}
        companies={companies}
        locations={locations}
        vendors={vendors}
        users={users}
        licenses={licenses}
        currencies={currencies}
        exchangeRatesMap={exchangeRatesMap}
        onAddCategory={handleAddCategory}
        onEditCategory={handleEditCategory}
        onDeleteCategory={handleDeleteCategory}
        onAddCompany={handleAddCompany}
        onEditCompany={handleEditCompany}
        onDeleteCompany={handleDeleteCompany}
        onAddLocation={handleAddLocation}
        onEditLocation={handleEditLocation}
        onDeleteLocation={handleDeleteLocation}
        onAddVendor={handleAddVendor}
        onEditVendor={handleEditVendor}
        onDeleteVendor={handleDeleteVendor}
        onOpenAddCurrency={() => setIsAddCurrencyModalOpen(true)}
        onSuccess={loadData}
      />

      {/* ==================== MODAL: MAINTENANCE SPLIT-VIEW ==================== */}
      <AssetMaintenanceModal
        isOpen={isMaintenanceModalOpen}
        onClose={() => setIsMaintenanceModalOpen(false)}
        asset={activeAsset}
        users={users}
        currencies={currencies}
        onSuccess={loadData}
      />

      {/* Asset QR Print Modal */}
      {selectedQrAsset && (
        <AssetQrModal
          isOpen={!!selectedQrAsset}
          onClose={() => setSelectedQrAsset(null)}
          asset={selectedQrAsset}
        />
      )}

      {/* Batch QR Print Modal */}
      {isBatchPrintOpen && (
        <BatchQrPrintModal
          isOpen={isBatchPrintOpen}
          onClose={() => setIsBatchPrintOpen(false)}
          assets={displayAssets}
        />
      )}

      {/* Asset Handover Printable Modal */}
      {selectedHandoverAsset && (
        <AssetHandoverModal
          isOpen={!!selectedHandoverAsset}
          onClose={() => {
            setSelectedHandoverAsset(null);
            setHandoverPreviousUser(null);
          }}
          asset={selectedHandoverAsset}
          initialMode={handoverModalMode}
          previousUser={handoverPreviousUser}
        />
      )}

      {/* Asset Inventory QR Audit Modal */}
      {isInventoryAuditOpen && (
        <AssetInventoryAuditModal
          isOpen={isInventoryAuditOpen}
          onClose={() => setIsInventoryAuditOpen(false)}
          assets={assets}
          locations={locations}
          users={users}
          onAssetUpdated={loadData}
        />
      )}

      {/* Asset Audit Campaign & Mobile QR Access Modal */}
      {isAuditCampaignCreateOpen && (
        <AssetAuditCreateModal
          isOpen={isAuditCampaignCreateOpen}
          onClose={() => setIsAuditCampaignCreateOpen(false)}
          selectedAssetIds={[]}
          totalFilteredAssets={displayAssets.length}
          currentCompanyFilter={selectedCompany || 'ALL'}
          currentLocationFilter="ALL"
          currentCategoryFilter={selectedCategory || 'ALL'}
          companies={companies}
          locations={locations}
          categories={categories}
          onCreated={loadData}
        />
      )}

      {/* ==================== 5. SCRIPT PS1 & GPO MODAL ==================== */}
      {isScriptModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full flex flex-col max-h-[92vh] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/60 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-xs">
                  <Terminal className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                    PowerShell Agent Auto-Discovery (.ps1)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Tự động quét cấu hình phần cứng, serial, Windows, RAM, CPU và gửi lên Simply IT qua GPO
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsScriptModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              {/* Server URL from Settings */}
              <div className="p-3 bg-blue-50/80 dark:bg-slate-800/80 border border-blue-200/80 dark:border-blue-800 rounded-2xl flex items-center gap-2">
                <Globe className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                <span className="text-[11px] text-slate-600 dark:text-slate-400">Server URL (từ Cài đặt):</span>
                <code className="text-[11px] font-bold text-blue-900 dark:text-blue-300 font-mono">{agentServerUrl || '...'}</code>
              </div>

              {/* 1-liner Quick Copy with Dynamic Server URL */}
              {(() => {
                const cleanServerUrl = (agentServerUrl || 'http://localhost:3000').replace(/\/+$/, '');
                const fetchBase = typeof window !== 'undefined' ? window.location.origin : cleanServerUrl;
                const oneLiner = `powershell -ExecutionPolicy Bypass -Command "iex (irm '${fetchBase}/api/scripts/agent?serverUrl=${encodeURIComponent(cleanServerUrl)}')"` ;
                return (
                  <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wide flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5 text-amber-400" />
                        <span>Lệnh chạy 1-dòng tự động (One-Liner PowerShell):</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(oneLiner);
                          setCopiedScript(true);
                          setTimeout(() => setCopiedScript(false), 2500);
                        }}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg font-bold text-slate-200 flex items-center gap-1 cursor-pointer"
                      >
                        {copiedScript ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedScript ? 'Đã sao chép!' : 'Sao chép'}</span>
                      </button>
                    </div>
                    <code className="block p-2.5 bg-slate-900 rounded-xl font-mono text-[11px] text-emerald-300 break-all select-all leading-relaxed">
                      {oneLiner}
                    </code>
                  </div>
                );
              })()}

              {/* Script Download Section with Embedded Custom IP */}
              {(() => {
                const cleanServerUrl = (agentServerUrl || 'http://localhost:3000').replace(/\/+$/, '');
                const fetchBase = typeof window !== 'undefined' ? window.location.origin : cleanServerUrl;
                const handleDownloadDynamicBat = () => {
                  const batContent = `@echo off\r\n:: SIMPLY IT Auto-Scan Runner\r\n:: Server: ${cleanServerUrl}\r\npowershell -ExecutionPolicy Bypass -WindowStyle Hidden -Command "iex (irm '${fetchBase}/api/scripts/agent?serverUrl=${encodeURIComponent(cleanServerUrl)}')"\r\n`;
                  const blob = new Blob([batContent], { type: 'application/x-bat' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'run_auto_scan.bat';
                  a.click();
                  URL.revokeObjectURL(url);
                };

                return (
                  <div className="space-y-2.5">
                    {/* Option 1: PS1 Download */}
                    <div className="p-3.5 bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-2xl flex items-center justify-between gap-3">
                      <div>
                        <span className="font-bold text-indigo-950 dark:text-indigo-200 text-xs">
                          1. Tải Script Thu Thập (get_system_info.ps1)
                        </span>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          Đã nhúng sẵn Endpoint: <code className="text-indigo-700 dark:text-indigo-300 font-bold">{cleanServerUrl}/api/auto-scan/collect</code>
                        </p>
                        <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1 font-semibold">
                          ⚠️ Không double-click! Mở PowerShell và chạy: <code className="bg-amber-100 dark:bg-amber-900/50 px-1 rounded">powershell -ExecutionPolicy Bypass -File get_system_info.ps1</code>
                        </p>
                      </div>

                      <a
                        href={`/api/scripts/agent?serverUrl=${encodeURIComponent(cleanServerUrl)}`}
                        download="get_system_info.ps1"
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-md cursor-pointer shrink-0 transition-all active:scale-95"
                      >
                        <Download className="w-4 h-4" />
                        <span>Tải Script (.ps1)</span>
                      </a>
                    </div>

                    {/* Option 2: BAT Runner Download */}
                    <div className="p-3.5 bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex items-center justify-between gap-3">
                      <div>
                        <span className="font-bold text-emerald-950 dark:text-emerald-200 text-xs">
                          2. Tải File Chạy Tự Động (run_auto_scan.bat)
                        </span>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          Chạy ngầm ẩn cửa sổ CMD, double-click là tự động gửi dữ liệu lên <code className="text-emerald-700 dark:text-emerald-300 font-bold">{cleanServerUrl}</code>.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={handleDownloadDynamicBat}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-md cursor-pointer shrink-0 transition-all active:scale-95"
                      >
                        <Download className="w-4 h-4" />
                        <span>Tải File Chạy (.bat)</span>
                      </button>
                    </div>
                  </div>
                );
              })()}

              {/* 3 Steps GPO Guide */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
                <span className="font-bold text-slate-900 dark:text-white">🚀 Hướng dẫn 3 bước triển khai qua Group Policy (GPO):</span>
                <ol className="list-decimal list-inside space-y-1.5 text-[11.5px] text-slate-600 dark:text-slate-400 leading-relaxed">
                  <li>Mở <strong>Group Policy Management</strong> trên máy chủ Domain Controller.</li>
                  <li>Tạo GPO mới: <code>Deploy-SimplyIT-Agent</code> liên kết vào OU phòng ban.</li>
                  <li>Vào <strong>Computer Configuration &rarr; Windows Settings &rarr; Scripts (Startup/Shutdown)</strong> và cấu hình chạy script tự động khi nhân viên bật máy.</li>
                </ol>
              </div>
            </div>

            <div className="flex justify-end px-6 py-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/60 shrink-0">
              <button
                type="button"
                onClick={() => setIsScriptModalOpen(false)}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold cursor-pointer"
              >{isEn ? 'Close' : 'Đóng'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== 6. PRO / ENTERPRISE UPGRADE MODAL ==================== */}
      {isPricingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full flex flex-col max-h-[92vh] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-6 bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-900 text-white text-center relative shrink-0">
              <div className="w-12 h-12 rounded-3xl bg-amber-400/20 text-amber-300 flex items-center justify-center mx-auto mb-2.5">
                <Crown className="w-6 h-6" />
              </div>
              <h3 className="font-black text-lg">Nâng Cấp Simply IT PRO</h3>
              <p className="text-xs text-purple-200 mt-1">
                Bạn đang dùng bản Free (Tối đa 20 thiết bị Auto-Scan)
              </p>
              <button
                type="button"
                onClick={() => setIsPricingModalOpen(false)}
                className="absolute right-4 top-4 text-purple-300 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs overflow-y-auto">
              {/* 3 Core Pro Features */}
              <div className="space-y-2.5">
                <div className="p-3 bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-2xl flex items-start gap-3">
                  <Zap className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white">Auto-Scan Không Giới Hạn</span>
                    <p className="text-[11px] text-slate-500">Mở rộng quét hàng nghìn máy tính, laptop không hạn chế hạn mức.</p>
                  </div>
                </div>

                <div className="p-3 bg-purple-50/70 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 rounded-2xl flex items-start gap-3">
                  <Building2 className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white">Triển Khai Tự Động GPO & InTune</span>
                    <p className="text-[11px] text-slate-500">Đồng bộ Active Directory tự động phân loại phòng ban và người dùng.</p>
                  </div>
                </div>

                <div className="p-3 bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-2xl flex items-start gap-3">
                  <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white">Cảnh Báo Thay Đổi Phần Cứng Real-time</span>
                    <p className="text-[11px] text-slate-500">Thông báo tức thì khi nhân sự nâng cấp hoặc tháo bớt RAM, ổ cứng.</p>
                  </div>
                </div>
              </div>

              {/* Quick Contact Form */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2.5">
                <span className="font-bold text-slate-900 dark:text-white block">
                  Đăng ký dùng thử PRO 14 ngày hoặc báo giá doanh nghiệp:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Họ và tên của bạn (*)"
                    value={upgradeForm.fullName}
                    onChange={(e) => setUpgradeForm({ ...upgradeForm, fullName: e.target.value })}
                    className="p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs outline-none"
                  />
                  <input
                    type="text"
                    placeholder="Số điện thoại / Zalo (*)"
                    value={upgradeForm.phone}
                    onChange={(e) => setUpgradeForm({ ...upgradeForm, phone: e.target.value })}
                    className="p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs outline-none font-semibold"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 px-6 py-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/60 shrink-0">
              <button
                type="button"
                onClick={() => setIsPricingModalOpen(false)}
                className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-xl font-bold text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                Để sau
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!upgradeForm.phone.trim()) {
                    alert('Vui lòng nhập Số điện thoại hoặc Zalo để chúng tôi kích hoạt dùng thử!');
                    return;
                  }
                  alert('Cảm ơn bạn! Đội ngũ Simply IT đã ghi nhận yêu cầu kích hoạt bản PRO và sẽ liên hệ trong 15 phút.');
                  setIsPricingModalOpen(false);
                }}
                className="px-5 py-2 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-700 hover:to-pink-700 text-white rounded-xl font-bold shadow-md cursor-pointer flex items-center gap-1.5"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Dùng Thử PRO 14 Ngày</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== MODAL: THÊM ĐỒNG TIỀN MỚI ==================== */}
      {isAddCurrencyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-900 text-white rounded-t-3xl">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-blue-600 text-white rounded-xl shadow-xs">
                  <DollarSign className="w-4 h-4" />
                </span>
                <h3 className="font-extrabold text-sm text-white">Thêm Loại Tiền Tệ Mới</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddCurrencyModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Cờ / Icon
                  </label>
                  <input
                    type="text"
                    placeholder="🇨🇭"
                    value={newCurrencyFlag}
                    onChange={(e) => setNewCurrencyFlag(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-center text-base outline-none"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Mã tiền tệ (ISO) (*)
                  </label>
                  <input
                    type="text"
                    placeholder="VD: CHF, HKD, TWD..."
                    value={newCurrencyCode}
                    onChange={(e) => setNewCurrencyCode(e.target.value.toUpperCase())}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono font-bold outline-none uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Tên đầy đủ của đồng tiền (*)
                </label>
                <input
                  type="text"
                  placeholder="VD: Franc Thụy Sĩ, Đô la Hồng Kông..."
                  value={newCurrencyName}
                  onChange={(e) => setNewCurrencyName(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Ký hiệu
                  </label>
                  <input
                    type="text"
                    placeholder="VD: Fr, HK$, NT$..."
                    value={newCurrencySymbol}
                    onChange={(e) => setNewCurrencySymbol(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Tỷ giá sang VND (*)
                  </label>
                  <input
                    type="number"
                    placeholder="VD: 28900"
                    value={newCurrencyRate}
                    onChange={(e) => setNewCurrencyRate(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono font-bold outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 px-6 py-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 rounded-b-3xl">
              <button
                type="button"
                onClick={() => setIsAddCurrencyModalOpen(false)}
                className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer"
              >{isEn ? 'Cancel' : 'Hủy'}</button>
              <button
                type="button"
                onClick={() => {
                  if (!newCurrencyCode.trim() || !newCurrencyName.trim() || !newCurrencyRate) {
                    alert('Vui lòng nhập đầy đủ Mã tiền tệ, Tên và Tỷ giá quy đổi!');
                    return;
                  }
                  const code = newCurrencyCode.trim().toUpperCase();
                  const rate = Number(newCurrencyRate) || 1;
                  const newCurr: CurrencyConfig = {
                    code,
                    name: newCurrencyName.trim(),
                    symbol: newCurrencySymbol.trim() || code,
                    rateToVnd: rate,
                    flag: newCurrencyFlag.trim() || '🌐',
                  };

                  setCurrencies((prev) => {
                    const filtered = prev.filter((c) => c.code !== code);
                    return [...filtered, newCurr];
                  });

                  if (isAddModalOpen) {
                    setFormData((prev: any) => ({
                      ...prev,
                      purchaseCurrency: code,
                      exchangeRate: rate,
                    }));
                  } else if (isEditModalOpen) {
                    setEditFormData((prev: any) => ({
                      ...prev,
                      purchaseCurrency: code,
                      exchangeRate: rate,
                    }));
                  }

                  setIsAddCurrencyModalOpen(false);
                  setNewCurrencyCode('');
                  setNewCurrencyName('');
                  setNewCurrencyRate('');
                  setNewCurrencySymbol('');
                }}
                className="px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>Lưu Đồng Tiền</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RIGHT-CLICK CONTEXT MENU */}
      {contextMenu.isOpen && contextMenu.asset && (
        <div
          style={{ left: `${contextMenu.x}px`, top: `${contextMenu.y}px` }}
          className="fixed z-50 w-60 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 py-1.5 text-xs text-slate-700 dark:text-slate-200 animate-in fade-in zoom-in-95 duration-150 select-none overflow-hidden"
          onClick={(e) => e.stopPropagation()}
          onContextMenu={(e) => e.preventDefault()}
        >
          {/* Header with Asset Tag & Name */}
          <div className="px-3.5 py-2 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <span className="font-mono font-black text-blue-600 dark:text-blue-400 text-[11px] block truncate">
                {contextMenu.asset.assetTag}
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block truncate" title={contextMenu.asset.name}>
                {contextMenu.asset.name}
              </span>
            </div>
            <span className="shrink-0 text-[9.5px] px-1.5 py-0.5 rounded-full font-bold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
              Thao tác
            </span>
          </div>

          <div className="p-1.5 space-y-0.5">
            {/* 1. Xem chi tiết */}
            <button
              type="button"
              onClick={() => {
                const a = contextMenu.asset;
                setContextMenu((prev) => ({ ...prev, isOpen: false }));
                handleOpenDetail(a);
              }}
              className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-950/60 hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-left cursor-pointer group"
            >
              <Search className="w-3.5 h-3.5 text-blue-500 group-hover:scale-110 transition-transform shrink-0" />
              <span className="font-medium">Xem chi tiết thiết bị</span>
            </button>

            {/* 2. Sửa */}
            <button
              type="button"
              onClick={() => {
                const a = contextMenu.asset;
                setContextMenu((prev) => ({ ...prev, isOpen: false }));
                handleOpenEdit(a);
              }}
              className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-left cursor-pointer group"
            >
              <Edit className="w-3.5 h-3.5 text-blue-600 group-hover:scale-110 transition-transform shrink-0" />
              <span className="font-medium">Chỉnh sửa thông số</span>
            </button>

            {/* 3. Cấp phát & điều chuyển */}
            <button
              type="button"
              onClick={() => {
                const a = contextMenu.asset;
                setContextMenu((prev) => ({ ...prev, isOpen: false }));
                openTransferModal(a);
              }}
              className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-950/60 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors text-left cursor-pointer group"
            >
              <ArrowLeftRight className="w-3.5 h-3.5 text-indigo-500 group-hover:scale-110 transition-transform shrink-0" />
              <span className="font-medium">Cấp phát & điều chuyển</span>
            </button>

            <div className="my-1 border-t border-slate-100 dark:border-slate-800" />

            {/* 4. In biên bản bàn giao PDF */}
            <button
              type="button"
              onClick={() => {
                const a = contextMenu.asset;
                setContextMenu((prev) => ({ ...prev, isOpen: false }));
                setSelectedHandoverAsset(a);
              }}
              className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-950/60 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors text-left cursor-pointer group"
            >
              <FileText className="w-3.5 h-3.5 text-emerald-500 group-hover:scale-110 transition-transform shrink-0" />
              <span className="font-medium">In biên bản bàn giao (PDF)</span>
            </button>

            {/* 5. In tem nhãn QR Code */}
            <button
              type="button"
              onClick={() => {
                const a = contextMenu.asset;
                setContextMenu((prev) => ({ ...prev, isOpen: false }));
                setSelectedQrAsset(a);
              }}
              className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl hover:bg-cyan-50 dark:hover:bg-cyan-950/60 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors text-left cursor-pointer group"
            >
              <QrCode className="w-3.5 h-3.5 text-cyan-500 group-hover:scale-110 transition-transform shrink-0" />
              <span className="font-medium">In mã QR & tem nhãn</span>
            </button>

            {/* 6. Bảo trì / Sửa chữa */}
            <button
              type="button"
              onClick={() => {
                const a = contextMenu.asset;
                setContextMenu((prev) => ({ ...prev, isOpen: false }));
                openMaintenance(a);
              }}
              className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl hover:bg-amber-50 dark:hover:bg-amber-950/60 hover:text-amber-600 dark:hover:text-amber-400 transition-colors text-left cursor-pointer group"
            >
              <Wrench className="w-3.5 h-3.5 text-amber-500 group-hover:scale-110 transition-transform shrink-0" />
              <span className="font-medium">Bảo trì / Sửa chữa</span>
            </button>

            <div className="my-1 border-t border-slate-100 dark:border-slate-800" />

            {/* 7. Sao chép Asset Tag */}
            <button
              type="button"
              onClick={() => {
                if (contextMenu.asset?.assetTag) {
                  navigator.clipboard.writeText(contextMenu.asset.assetTag);
                }
                setContextMenu((prev) => ({ ...prev, isOpen: false }));
              }}
              className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors text-left cursor-pointer group"
            >
              <Copy className="w-3.5 h-3.5 text-slate-400 group-hover:scale-110 transition-transform shrink-0" />
              <span className="font-medium">Sao chép mã tài sản</span>
            </button>

            {/* 8. Xóa thiết bị */}
            <button
              type="button"
              onClick={() => {
                const id = contextMenu.asset.id;
                setContextMenu((prev) => ({ ...prev, isOpen: false }));
                handleDeleteAsset(id);
              }}
              className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/60 text-rose-600 dark:text-rose-400 transition-colors text-left cursor-pointer group"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-500 group-hover:scale-110 transition-transform shrink-0" />
              <span className="font-medium">Xóa thiết bị này</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
