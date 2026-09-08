'use client';

import { QuickLink } from '@/components/common/QuickLink';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/lib/i18n/context';
import { fetchWithSwr } from '@/lib/client-cache';
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
} from 'lucide-react';
import { formatCurrency, formatDate, getRemainingTimeText, numberToVietnameseWords, numberToForeignCurrencyWords } from '@/lib/utils';
import CurrencyInput from '@/components/ui/currency-input';
import WarrantyInput from '@/components/ui/warranty-input';
import AssetQrModal from '@/components/assets/asset-qr-modal';
import BatchQrPrintModal from '@/components/assets/batch-qr-print-modal';
import AssetHandoverModal from '@/components/assets/asset-handover-modal';
import AssetInventoryAuditModal from '@/components/assets/asset-inventory-audit-modal';
import { AssetAuditCreateModal } from '@/components/assets/AssetAuditCreateModal';

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
  const [agentServerUrl, setAgentServerUrl] = useState<string>('http://localhost:3000');
  const [isPricingModalOpen, setIsPricingModalOpen] = useState(false);
  const [activeDropdownAssetId, setActiveDropdownAssetId] = useState<string | null>(null);
  const [copiedScript, setCopiedScript] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('simply_agent_server_url');
      if (saved) {
        setAgentServerUrl(saved);
      } else {
        setAgentServerUrl(window.location.origin);
      }
    }
  }, []);

  const handleServerUrlChange = (newUrl: string) => {
    setAgentServerUrl(newUrl);
    try {
      localStorage.setItem('simply_agent_server_url', newUrl);
    } catch {}
  };
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
  const [detailMaintenanceLogs, setDetailMaintenanceLogs] = useState<any[]>([]);
  const [editingAssetId, setEditingAssetId] = useState<string | null>(null);

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
    purchaseDate: '',
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

  const loadData = async (forceMaster = false) => {
    try {
      // 1. Fetch Assets with SWR Cache (0ms instant render)
      fetchWithSwr<any>('/api/assets?pageSize=1000', (assetsRes) => {
        if (assetsRes) {
          const list = Array.isArray(assetsRes) ? assetsRes : assetsRes.data || assetsRes.assets || [];
          setAssets(list);
          setLoading(false);
        }
      });

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
      });

      // 3. Fetch Licenses with SWR Cache
      fetchWithSwr<any>('/api/licenses', (licRes) => {
        if (licRes && (licRes.success || licRes.data || licRes.licenses)) {
          setLicenses(licRes.data || licRes.licenses || []);
        }
      });
    } catch (error) {
      console.error('Failed to load assets data:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

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
        await loadData();
      }
    } catch {
      console.error('Không thể sửa danh mục');
    }
  };

  const handleDeleteCategory = async (id: string) => {
    try {
      const res = await fetch(`/api/categories/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        setCategories((prev) => prev.filter((c) => c.id !== id));
        if (formData.categoryId === id) setFormData((prev: any) => ({ ...prev, categoryId: '' }));
        if (editFormData.categoryId === id) setEditFormData((prev: any) => ({ ...prev, categoryId: '' }));
      } else {
        console.error(data.error || 'Không thể xóa danh mục');
      }
    } catch {
      console.error('Không thể xóa danh mục');
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
        await loadData();
      }
    } catch {
      console.error('Không thể sửa vị trí');
    }
  };

  const handleDeleteLocation = async (id: string) => {
    try {
      const res = await fetch(`/api/locations/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setLocations((prev) => prev.filter((l) => l.id !== id));
        if (formData.locationId === id) setFormData((prev: any) => ({ ...prev, locationId: '' }));
        if (editFormData.locationId === id) setEditFormData((prev: any) => ({ ...prev, locationId: '' }));
      }
    } catch {
      console.error('Không thể xóa vị trí');
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
        await loadData();
      }
    } catch {
      console.error('Không thể sửa nhà cung cấp');
    }
  };

  const handleDeleteVendor = async (id: string) => {
    try {
      const res = await fetch(`/api/vendors/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setVendors((prev) => prev.filter((v) => v.id !== id));
        if (formData.vendorId === id) setFormData((prev: any) => ({ ...prev, vendorId: '' }));
        if (editFormData.vendorId === id) setEditFormData((prev: any) => ({ ...prev, vendorId: '' }));
      }
    } catch {
      console.error('Không thể xóa nhà cung cấp');
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
          purchaseDate: '',
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
        loadData();
      } else {
        console.error(data.error || 'Tạo tài sản thất bại');
      }
    } catch {
      console.error('Lỗi kết nối');
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
        setTransferUserSearch('');
        setTransferForm((prev) => ({ ...prev, toUserId: '' }));
        await loadData();

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

  const handleOpenDetail = async (asset: any) => {
    setSelectedDetailAsset(asset);
    setIsDetailModalOpen(true);
    setDetailMaintenanceLogs([]);
    try {
      const res = await fetch(`/api/assets/${asset.id}/maintenance`);
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setDetailMaintenanceLogs(data.data);
      }
    } catch {
      console.error('Failed to load asset maintenance logs');
    }
  };

  const handleOpenEdit = (asset: any) => {
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
        loadData();
      } else {
        const errorData = await res.json().catch(() => ({}));
        console.error(errorData.error || 'Cập nhật tài sản thất bại');
      }
    } catch {
      console.error('Lỗi kết nối');
    }
  };

  const handleDeleteAsset = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa tài sản này?')) return;
    try {
      const res = await fetch(`/api/assets/${id}`, { method: 'DELETE' });
      if (res.ok) loadData();
    } catch {
      console.error('Xóa thất bại');
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
        loadData();
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
        loadData();
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
          catName.includes('server') ||
          catName.includes('máy chủ') ||
          catName.includes('switch') ||
          catName.includes('router') ||
          catName.includes('mạng')
            ? 60
            : 36;

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
                purchaseDate: '',
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
                    <th className="py-2 px-1.5 min-w-[80px]">{isEn ? 'WARRANTY' : 'BẢO HÀNH'}</th>
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
                          className="hover:bg-blue-50/50 dark:hover:bg-slate-800/40 transition-colors group cursor-pointer"
                          title="Nhấp đúp hoặc nhấp vào hàng để xem đầy đủ chi tiết thiết bị"
                        >
                          {/* STICKY COLUMN: MÃ TÀI SẢN (2 DÒNG GỌN GÀNG) */}
                          <td className="py-2 px-2 sticky left-0 z-10 bg-white dark:bg-slate-900 group-hover:bg-blue-50/90 dark:group-hover:bg-slate-800/90 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.06)] transition-colors">
                            <div className="space-y-0.5">
                              <span className="font-mono font-black text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 px-1.5 py-0.2 rounded text-[10px] inline-block whitespace-nowrap leading-tight">
                                {asset.assetTag}
                              </span>
                              {isAutoScanned && (
                                <span className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[8px] font-extrabold block w-fit leading-none">
                                  <span>🤖</span>
                                  <span>PS1</span>
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

                          {/* NGUYÊN GIÁ (DUAL-CURRENCY) */}
                          <td className="py-2 px-1.5">
                            {rawPrice > 0 ? (
                              <div className="space-y-0.5">
                                <div className="font-black text-slate-900 dark:text-white text-[11px] font-mono leading-tight">
                                  {formatPrice(convertedPrice, selectedCurrency)}
                                </div>
                                {isDual && (
                                  <div className="text-[8.5px] text-slate-400 font-mono leading-tight">
                                    Gốc: {formatPrice(rawPrice, rawCurr)}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-400 italic text-[9.5px]">—</span>
                            )}
                          </td>

                          {/* BẢO HÀNH */}
                          <td className="py-2 px-1.5">
                            {asset.warrantyExpiry ? (
                              <div className="space-y-0.5">
                                {warrantyInfo && (
                                  <span className={`inline-block font-bold px-1.5 py-0.2 rounded text-[8.5px] leading-tight ${warrantyInfo.badgeClass}`}>
                                    {warrantyInfo.text}
                                  </span>
                                )}
                                <div className="text-slate-400 text-[9px] font-mono leading-tight">
                                  {formatDate(asset.warrantyExpiry)}
                                </div>
                              </div>
                            ) : (
                              <span className="text-slate-400 italic text-[9px]">Không có BH</span>
                            )}
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

      {/* ==================== MODAL: EDIT / APPROVE ASSET (4 TABS) ==================== */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-3 sm:p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-6xl w-full flex flex-col max-h-[92vh] border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/60 shrink-0">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-xs bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 px-2 py-0.5 rounded-lg border border-blue-200 dark:border-blue-800">
                    [{editFormData.assetTag || 'TAG'}]
                  </span>
                  <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                    <Laptop className="w-4 h-4 text-blue-600" />
                    <span>Cập Nhật & Phê Duyệt Tài Sản</span>
                  </h3>
                  {editFormData.isAutoScanned && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[10px] font-extrabold">
                      <span>🤖 Quét từ PS1</span>
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 truncate max-w-xl">
                  {editFormData.name || 'Thiết bị'} {editFormData.brand ? `• ${editFormData.brand}` : ''} {editFormData.model ? `• ${editFormData.model}` : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal 4-Tabs Navigation */}
            <div className="flex items-center gap-1 px-6 pt-2 pb-0 bg-slate-50/50 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-700 overflow-x-auto shrink-0">
              <button
                type="button"
                onClick={() => setModalActiveTab('general')}
                className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  modalActiveTab === 'general'
                    ? 'border-blue-600 text-blue-700 dark:text-blue-400 bg-white dark:bg-slate-900 rounded-t-xl shadow-2xs'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                }`}
              >
                <Tag className="w-3.5 h-3.5" />
                <span>1. Thông tin chung</span>
              </button>

              <button
                type="button"
                onClick={() => setModalActiveTab('specs')}
                className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  modalActiveTab === 'specs'
                    ? 'border-blue-600 text-blue-700 dark:text-blue-400 bg-white dark:bg-slate-900 rounded-t-xl shadow-2xs'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                }`}
              >
                <Cpu className="w-3.5 h-3.5" />
                <span>2. Cấu hình phần cứng</span>
                {editFormData.isAutoScanned && (
                  <span className="px-1.5 py-0.2 bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 rounded text-[9px] font-extrabold">
                    Auto-Fill
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setModalActiveTab('finance')}
                className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  modalActiveTab === 'finance'
                    ? 'border-blue-600 text-blue-700 dark:text-blue-400 bg-white dark:bg-slate-900 rounded-t-xl shadow-2xs'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                }`}
              >
                <DollarSign className="w-3.5 h-3.5" />
                <span>3. Tài chính & Bảo hành</span>
              </button>

              <button
                type="button"
                onClick={() => setModalActiveTab('licenses')}
                className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  modalActiveTab === 'licenses'
                    ? 'border-blue-600 text-blue-700 dark:text-blue-400 bg-white dark:bg-slate-900 rounded-t-xl shadow-2xs'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>4. Bản quyền & License</span>
                {selectedLicenseIds.length > 0 && (
                  <span className="px-1.5 py-0.2 bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 rounded-full text-[9.5px] font-extrabold">
                    {selectedLicenseIds.length}
                  </span>
                )}
              </button>
            </div>

            {/* Modal Form Content */}
            <form
              id="edit-asset-form"
              onSubmit={(e) => {
                editFormData.specs = {
                  ...(editFormData.specs || {}),
                  assignedLicenseIds: selectedLicenseIds,
                  depreciationMonths: editFormData.depreciationMonths || 36,
                };
                handleUpdateAsset(e);
              }}
              className="flex-1 overflow-y-auto p-6 space-y-4"
            >
              {/* AI Lookup Notification Banner */}
              {aiLookupStatus && (
                <div className="p-3 bg-purple-50 dark:bg-purple-950/60 border border-purple-300 dark:border-purple-800 rounded-2xl flex items-center gap-2 text-xs font-bold text-purple-900 dark:text-purple-200 animate-in fade-in zoom-in-95 duration-150">
                  <Sparkles className="w-4 h-4 text-purple-600 animate-pulse shrink-0" />
                  <span>{aiLookupStatus}</span>
                </div>
              )}

              {/* TAB 1: THÔNG TIN CHUNG */}
              {modalActiveTab === 'general' && (
                <div className="space-y-4 animate-in fade-in duration-100">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Mã Tag */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Mã Tài Sản (Tag) (*)
                      </label>
                      <input
                        type="text"
                        required
                        value={editFormData.assetTag}
                        onChange={(e) => setEditFormData({ ...editFormData, assetTag: e.target.value.toUpperCase() })}
                        className="w-full p-2.5 bg-blue-50/50 dark:bg-slate-800 border border-blue-300 dark:border-blue-700 rounded-xl text-xs font-mono font-bold text-blue-950 dark:text-blue-300 outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                      />
                    </div>

                    {/* Tên thiết bị */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Tên thiết bị (*)
                      </label>
                      <input
                        type="text"
                        required
                        value={editFormData.name}
                        onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                        className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    {/* Danh mục */}
                    <div>
                      <ManageableDropdown
                        label="Danh mục (*)"
                        placeholder="-- Chọn danh mục --"
                        items={categories.map((c) => ({ id: c.id, name: c.name, icon: renderCategoryIcon(c.icon, 'w-4 h-4') }))}
                        selectedValue={editFormData.categoryId}
                        onSelect={(id) => setEditFormData((prev: any) => ({ ...prev, categoryId: id }))}
                        onAdd={handleAddCategory}
                        onEdit={handleEditCategory}
                        onDelete={handleDeleteCategory}
                        allowEmpty={false}
                      />
                    </div>
                  </div>

                  {/* Brand, Model, Serial */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Thương hiệu
                      </label>
                      <input
                        type="text"
                        placeholder="Dell, HP, Lenovo, Apple..."
                        value={editFormData.brand}
                        onChange={(e) => setEditFormData({ ...editFormData, brand: e.target.value })}
                        className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs outline-none"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Model</label>
                        <button
                          type="button"
                          onClick={() => handleAiLookupModel(editFormData.model, true)}
                          disabled={aiLookupLoading || !editFormData.model?.trim()}
                          className="text-[10px] font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 dark:bg-purple-950 dark:text-purple-300 border border-purple-200 dark:border-purple-800 px-2 py-0.5 rounded-lg flex items-center gap-1 cursor-pointer disabled:opacity-40"
                        >
                          {aiLookupLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3 text-purple-600" />}
                          <span>AI Tra Cứu Specs</span>
                        </button>
                      </div>
                      <input
                        type="text"
                        placeholder="VD: Latitude 5540, ThinkPad T14..."
                        value={editFormData.model}
                        onChange={(e) => setEditFormData({ ...editFormData, model: e.target.value })}
                        className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Số Serial (SN) (*)
                      </label>
                      <input
                        type="text"
                        placeholder="SN123456789..."
                        value={editFormData.serialNumber}
                        onChange={(e) => setEditFormData({ ...editFormData, serialNumber: e.target.value })}
                        className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono outline-none"
                      />
                    </div>
                  </div>

                  {/* Section: Đơn vị & Người sử dụng */}
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl space-y-3">
                    <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wide flex items-center gap-1.5">
                      <Building2 className="w-4 h-4 text-blue-600" />
                      <span>Đơn vị & Người sử dụng</span>
                    </span>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <ManageableDropdown
                          label="Công ty quản lý (*)"
                          placeholder="-- Chọn công ty --"
                          icon={<Building2 className="w-3.5 h-3.5 text-indigo-600" />}
                          items={companies.map((c) => ({ id: c, name: c }))}
                          selectedValue={editFormData.companyName}
                          onSelect={(name) => setEditFormData((prev: any) => ({ ...prev, companyName: name }))}
                          onAdd={handleAddCompany}
                          onEdit={handleEditCompany}
                          onDelete={(id, name) => handleDeleteCompany(name)}
                          allowEmpty={true}
                          emptyLabel="-- Chưa phân công ty --"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Người đang sử dụng:
                        </label>
                        <select
                          value={editFormData.assignedUserId || ''}
                          onChange={(e) => setEditFormData({ ...editFormData, assignedUserId: e.target.value })}
                          className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                        >
                          <option value="">-- Trong kho IT (Chưa cấp phát) --</option>
                          {users.map((u) => (
                            <option key={u.id} value={u.id}>
                              👤 {u.fullName} {u.companyName ? `[${u.companyName}]` : ''} ({u.department || 'Staff'})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Vị trí, Trạng thái, Tình trạng */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <ManageableDropdown
                        label="Vị trí đặt"
                        placeholder="-- Chọn vị trí --"
                        icon={<MapPin className="w-3.5 h-3.5 text-blue-600" />}
                        items={locations.map((l) => ({ id: l.id, name: l.name }))}
                        selectedValue={editFormData.locationId}
                        onSelect={(id) => setEditFormData((prev: any) => ({ ...prev, locationId: id }))}
                        onAdd={handleAddLocation}
                        onEdit={handleEditLocation}
                        onDelete={handleDeleteLocation}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">{isEn ? 'Status' : 'Trạng thái'}</label>
                      <select
                        value={editFormData.status}
                        onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
                        className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold outline-none cursor-pointer"
                      >
                        <option value="PENDING">🟠 PENDING (Đang chờ duyệt)</option>
                        <option value="AVAILABLE">🟢 AVAILABLE (Sẵn sàng)</option>
                        <option value="IN_USE">🔵 IN_USE (Đang dùng)</option>
                        <option value="MAINTENANCE">🟡 MAINTENANCE (Bảo trì)</option>
                        <option value="RETIRED">⚪ RETIRED (Thanh lý)</option>
                        <option value="LOST">🔴 LOST (Mất)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Tình trạng vật lý
                      </label>
                      <select
                        value={editFormData.condition}
                        onChange={(e) => setEditFormData({ ...editFormData, condition: e.target.value })}
                        className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs outline-none cursor-pointer"
                      >
                        <option value="NEW">Mới 100% (New)</option>
                        <option value="GOOD">Tốt (Good)</option>
                        <option value="FAIR">Bình thường (Fair)</option>
                        <option value="POOR">Cũ / Xuống cấp (Poor)</option>
                        <option value="BROKEN">Hỏng hóc (Broken)</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: CẤU HÌNH PHẦN CỨNG (AUTO-FILL TỪ SCRIPT) */}
              {modalActiveTab === 'specs' && (
                <div className="space-y-4 animate-in fade-in duration-100">
                  <div className="p-3 bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-2xl flex items-start gap-2.5 text-xs text-indigo-950 dark:text-indigo-200">
                    <Zap className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">
                        {editFormData.isAutoScanned
                          ? 'Thông số được tự động đồng bộ từ PowerShell Script / GPO.'
                          : 'Cấu hình phần cứng & Thông số kỹ thuật chi tiết.'}
                      </span>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Bạn có thể đối chiếu và chỉnh sửa trực tiếp các thông số trước khi phê duyệt lưu kho.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* OS */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Hệ điều hành (OS)
                      </label>
                      <input
                        type="text"
                        placeholder="Windows 11 Pro, macOS Sonoma, Ubuntu..."
                        value={editFormData.specs?.os || editFormData.specs?.operatingSystem || ''}
                        onChange={(e) =>
                          setEditFormData((prev: any) => ({
                            ...prev,
                            specs: { ...prev.specs, os: e.target.value },
                          }))
                        }
                        className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs outline-none"
                      />
                    </div>

                    {/* Hostname */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Tên máy tính (Hostname)
                      </label>
                      <input
                        type="text"
                        placeholder="DESKTOP-IT892, MACBOOK-PRO..."
                        value={editFormData.specs?.hostname || editFormData.specs?.computerName || ''}
                        onChange={(e) =>
                          setEditFormData((prev: any) => ({
                            ...prev,
                            specs: { ...prev.specs, hostname: e.target.value },
                          }))
                        }
                        className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono outline-none"
                      />
                    </div>

                    {/* CPU */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Vi xử lý (CPU)
                      </label>
                      <input
                        type="text"
                        placeholder="Intel Core i7-1365U, Apple M3 Pro..."
                        value={editFormData.specs?.cpu || editFormData.specs?.processor || ''}
                        onChange={(e) =>
                          setEditFormData((prev: any) => ({
                            ...prev,
                            specs: { ...prev.specs, cpu: e.target.value },
                          }))
                        }
                        className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs outline-none"
                      />
                    </div>

                    {/* RAM */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Dung lượng RAM
                      </label>
                      <input
                        type="text"
                        placeholder="16GB DDR5 5600MHz..."
                        value={editFormData.specs?.ram || (editFormData.specs?.ramGb ? `${editFormData.specs?.ramGb} GB` : '')}
                        onChange={(e) =>
                          setEditFormData((prev: any) => ({
                            ...prev,
                            specs: { ...prev.specs, ram: e.target.value },
                          }))
                        }
                        className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs outline-none"
                      />
                    </div>

                    {/* GPU */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Card đồ họa (GPU)
                      </label>
                      <input
                        type="text"
                        placeholder="Intel Iris Xe, NVIDIA RTX 4060..."
                        value={editFormData.specs?.gpu || editFormData.specs?.graphics || ''}
                        onChange={(e) =>
                          setEditFormData((prev: any) => ({
                            ...prev,
                            specs: { ...prev.specs, gpu: e.target.value },
                          }))
                        }
                        className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs outline-none"
                      />
                    </div>

                    {/* Storage */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Ổ cứng (Storage)
                      </label>
                      <input
                        type="text"
                        placeholder="512GB NVMe PCIe Gen 4..."
                        value={editFormData.specs?.storage || editFormData.specs?.ssd || ''}
                        onChange={(e) =>
                          setEditFormData((prev: any) => ({
                            ...prev,
                            specs: { ...prev.specs, storage: e.target.value },
                          }))
                        }
                        className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs outline-none"
                      />
                    </div>

                    {/* IP Address */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Địa chỉ IP
                      </label>
                      <input
                        type="text"
                        placeholder="192.168.1.105"
                        value={editFormData.specs?.ipAddress || editFormData.specs?.ip || ''}
                        onChange={(e) =>
                          setEditFormData((prev: any) => ({
                            ...prev,
                            specs: { ...prev.specs, ipAddress: e.target.value },
                          }))
                        }
                        className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono outline-none"
                      />
                    </div>

                    {/* MAC Address */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Địa chỉ MAC
                      </label>
                      <input
                        type="text"
                        placeholder="A4:BB:6D:88:99:01"
                        value={editFormData.specs?.macAddress || editFormData.specs?.mac || ''}
                        onChange={(e) =>
                          setEditFormData((prev: any) => ({
                            ...prev,
                            specs: { ...prev.specs, macAddress: e.target.value },
                          }))
                        }
                        className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono outline-none"
                      />
                    </div>

                    {/* Antivirus */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Bảo mật / Antivirus
                      </label>
                      <input
                        type="text"
                        placeholder="Windows Defender, Kaspersky..."
                        value={editFormData.specs?.antivirus || ''}
                        onChange={(e) =>
                          setEditFormData((prev: any) => ({
                            ...prev,
                            specs: { ...prev.specs, antivirus: e.target.value },
                          }))
                        }
                        className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs outline-none"
                      />
                    </div>
                  </div>

                  {/* Extra Category Custom Fields if any */}
                  {(() => {
                    const definedFields = getCategoryFields(editFormData.categoryId);
                    if (definedFields.length === 0) return null;

                    return (
                      <div className="pt-2 border-t border-slate-200 dark:border-slate-700 space-y-2">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          Thông số mở rộng theo danh mục ({definedFields.length} trường):
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {definedFields.map((field) => {
                            const val = editFormData.specs?.[field.key] ?? '';
                            return (
                              <div key={field.key}>
                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                  {field.label}
                                </label>
                                <input
                                  type="text"
                                  value={val}
                                  onChange={(e) =>
                                    setEditFormData((prev: any) => ({
                                      ...prev,
                                      specs: { ...prev.specs, [field.key]: e.target.value },
                                    }))
                                  }
                                  className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs outline-none"
                                />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* TAB 3: TÀI CHÍNH & BẢO HÀNH */}
              {modalActiveTab === 'finance' && (
                <div className="space-y-4 animate-in fade-in duration-100">
                  {/* Hợp đồng & Hóa đơn */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                        <FileText className="w-3.5 h-3.5 text-blue-600" />
                        <span>Số Hợp Đồng (Contract No.)</span>
                      </label>
                      <input
                        type="text"
                        placeholder="VD: HĐ-2026/08/IT-DELL"
                        value={editFormData.contractNumber}
                        onChange={(e) => setEditFormData({ ...editFormData, contractNumber: e.target.value })}
                        className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                        <Receipt className="w-3.5 h-3.5 text-blue-600" />
                        <span>Số Hóa Đơn (Invoice No.)</span>
                      </label>
                      <input
                        type="text"
                        placeholder="VD: HD-0089421"
                        value={editFormData.invoiceNumber}
                        onChange={(e) => setEditFormData({ ...editFormData, invoiceNumber: e.target.value })}
                        className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono outline-none"
                      />
                    </div>
                  </div>

                  {/* Giá mua gốc + Loại tiền tệ + Tỷ giá quy đổi */}
                  <div className="p-4 bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-2xl space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-blue-950 dark:text-blue-200 uppercase tracking-wide flex items-center gap-1.5">
                        <DollarSign className="w-4 h-4 text-blue-600" />
                        <span>1. Định giá & Tiền tệ hóa đơn gốc (Ngoại tệ)</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsAddCurrencyModalOpen(true)}
                        className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Thêm đồng tiền mới</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-start">
                      {/* Giá mua hóa đơn gốc with dot separators & foreign words */}
                      <div>
                        <CurrencyInput
                          label="Giá mua hóa đơn gốc (*)"
                          value={editFormData.purchasePrice}
                          onChange={(val) => setEditFormData({ ...editFormData, purchasePrice: val })}
                          currency={editFormData.purchaseCurrency || 'VND'}
                          currencyName={currencies.find((c) => c.code === (editFormData.purchaseCurrency || 'VND'))?.name}
                          exchangeRate={editFormData.exchangeRate || exchangeRatesMap[editFormData.purchaseCurrency || 'VND'] || 1}
                          placeholder="VD: 1.000"
                        />
                      </div>

                      {/* Loại tiền tệ gốc */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Loại tiền tệ gốc
                        </label>
                        <select
                          value={editFormData.purchaseCurrency || 'VND'}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === '__ADD_NEW__') {
                              setIsAddCurrencyModalOpen(true);
                              return;
                            }
                            const found = currencies.find((c) => c.code === val);
                            setEditFormData({
                              ...editFormData,
                              purchaseCurrency: val,
                              exchangeRate: found ? found.rateToVnd : exchangeRatesMap[val] || 1,
                            });
                          }}
                          className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold outline-none cursor-pointer"
                        >
                          {currencies.map((c) => (
                            <option key={c.code} value={c.code}>
                              {c.flag} {c.code} ({c.name})
                            </option>
                          ))}
                          <option value="__ADD_NEW__" className="text-blue-600 font-bold">
                            ➕ Thêm đồng tiền khác...
                          </option>
                        </select>
                      </div>

                      {/* Tỷ giá quy đổi cơ sở */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Tỷ giá hạch toán (1 {editFormData.purchaseCurrency || 'VND'} = ? VNĐ)
                        </label>
                        <input
                          type="number"
                          value={editFormData.exchangeRate || exchangeRatesMap[editFormData.purchaseCurrency || 'VND'] || 1}
                          onChange={(e) => setEditFormData({ ...editFormData, exchangeRate: Number(e.target.value) })}
                          className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono font-bold outline-none"
                        />
                      </div>
                    </div>

                    {/* KHỐI 2: Ô GIÁ TIỀN QUY CHUẨN VNĐ RIÊNG & BẰNG CHỮ RÕ RÀNG */}
                    {(() => {
                      const numVal = Number(String(editFormData.purchasePrice).replace(/\D/g, '')) || 0;
                      const curr = editFormData.purchaseCurrency || 'VND';
                      const rate = editFormData.exchangeRate || exchangeRatesMap[curr] || 1;
                      const inVnd = curr === 'VND' ? numVal : numVal * rate;

                      return (
                        <div className="p-3.5 bg-white dark:bg-slate-800/90 rounded-2xl border border-emerald-200 dark:border-emerald-800/80 shadow-xs space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-extrabold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5 uppercase tracking-wide">
                              <span>🇻🇳 2. Giá Tiền Quy Chuẩn VNĐ (Hạch Toán Kế Toán)</span>
                            </span>
                            <span className="font-mono text-xs font-black text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-xl border border-emerald-200 dark:border-emerald-800">
                              {formatPrice(inVnd, 'VND')}
                            </span>
                          </div>

                          {inVnd > 0 && (
                            <div className="text-[11px] text-emerald-900 dark:text-emerald-200 bg-emerald-50/80 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/60 rounded-xl px-3 py-2 flex items-start gap-1.5 font-medium">
                              <span className="text-emerald-700 dark:text-emerald-400 font-bold shrink-0">
                                ✍️ Giá chuẩn VNĐ bằng chữ:
                              </span>
                              <span className="italic font-bold">{numberToVietnameseWords(inVnd)}</span>
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* AI & Rate Reference Timestamp (1 dòng nhỏ) */}
                    <div className="p-2 bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-800/80 rounded-xl flex items-center gap-1.5 text-[10.5px] text-blue-900 dark:text-blue-200 font-medium">
                      <Clock className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                      <span>Tỷ giá tham chiếu hạch toán cập nhật: 25/08/2026 (Theo Vietcombank / Tỷ giá hạch toán)</span>
                    </div>
                  </div>

                  {/* Ngày mua, Hạn bảo hành, Số tháng khấu hao */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Ngày mua hàng
                      </label>
                      <input
                        type="date"
                        value={editFormData.purchaseDate}
                        onChange={(e) => setEditFormData({ ...editFormData, purchaseDate: e.target.value })}
                        className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">{isEn ? 'Warranty Expiration' : 'Hạn bảo hành'}</label>
                      <input
                        type="date"
                        value={editFormData.warrantyExpiry}
                        onChange={(e) => setEditFormData({ ...editFormData, warrantyExpiry: e.target.value })}
                        className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Thời gian khấu hao (Tháng)
                      </label>
                      <select
                        value={editFormData.depreciationMonths || 36}
                        onChange={(e) => setEditFormData({ ...editFormData, depreciationMonths: Number(e.target.value) })}
                        className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold outline-none cursor-pointer"
                      >
                        <option value={12}>12 tháng (1 năm)</option>
                        <option value={24}>24 tháng (2 năm)</option>
                        <option value={36}>36 tháng (3 năm - Mặc định)</option>
                        <option value={60}>60 tháng (5 năm)</option>
                      </select>
                    </div>
                  </div>

                  {/* Nhà cung cấp & Đường dẫn hóa đơn */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <ManageableDropdown
                        label="Nhà cung cấp"
                        placeholder="-- Chọn nhà cung cấp --"
                        icon={<Building className="w-3.5 h-3.5 text-blue-600" />}
                        items={vendors.map((v) => ({ id: v.id, name: v.name }))}
                        selectedValue={editFormData.vendorId}
                        onSelect={(id) => setEditFormData((prev: any) => ({ ...prev, vendorId: id }))}
                        onAdd={handleAddVendor}
                        onEdit={handleEditVendor}
                        onDelete={handleDeleteVendor}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Chứng từ / Hóa đơn đính kèm (URL/File)
                      </label>
                      <input
                        type="text"
                        placeholder="https://... hoặc đường dẫn file hóa đơn PDF"
                        value={editFormData.invoiceUrl || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, invoiceUrl: e.target.value })}
                        className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs outline-none"
                      />
                    </div>
                  </div>

                  {/* Ghi chú */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Ghi chú mua hàng / Bảo hành
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Ghi chú về tình trạng mua, phụ kiện, số hotline bảo hành..."
                      value={editFormData.notes}
                      onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                      className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs outline-none"
                    />
                  </div>
                </div>
              )}

              {/* TAB 4: BẢN QUYỀN & LICENSE */}
              {modalActiveTab === 'licenses' && (() => {
                const specs = (editFormData.specs || {}) as Record<string, any>;
                const osLic = specs.osLicense;
                const officeLic = specs.officeLicense;
                const crack = specs.crackDetection;
                const licMatches = Array.isArray(specs.licenseMatches) ? specs.licenseMatches : [];
                const installedSw = Array.isArray(specs.installedSoftware) ? specs.installedSoftware : [];

                return (
                  <div className="space-y-4 animate-in fade-in duration-100">
                    {/* Header Banner */}
                    <div className="p-3 bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-2xl flex items-start justify-between gap-2.5 text-xs text-blue-950 dark:text-blue-200">
                      <div className="flex items-start gap-2.5">
                        <Layers className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold">Quản Lý & Gán Bản Quyền Phần Mềm (Software & License)</span>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            Kiểm tra bản quyền OS/Office đã quét từ máy trạm, đối soát với kho License và gán ghế sử dụng.
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowAdminAddLicForm((prev) => !prev)}
                        className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition-colors shrink-0 shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>{showAdminAddLicForm ? 'Đóng Form' : '+ Quản Trị Viên Thêm License'}</span>
                      </button>
                    </div>

                    {/* ADMIN DIRECT LICENSE CREATION FORM */}
                    {showAdminAddLicForm && (
                      <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-900 rounded-2xl border-2 border-blue-300 dark:border-blue-700 space-y-3 animate-in fade-in">
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-xs text-blue-950 dark:text-blue-200 uppercase tracking-wider flex items-center gap-1.5">
                            <Key className="w-3.5 h-3.5 text-blue-600" />
                            <span>Thêm Nhanh License Mới Vào Kho & Gán Ngay Vào Máy Này</span>
                          </span>
                          <span className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold">Tự quản trị viên thêm</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 text-xs">
                          <div className="sm:col-span-2">
                            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                              Tên Phần Mềm / License (*):
                            </label>
                            <input
                              type="text"
                              placeholder="VD: AutoCAD 2024, Adobe Photoshop, Office 365..."
                              value={newLicForm.name}
                              onChange={(e) => setNewLicForm({ ...newLicForm, name: e.target.value })}
                              className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                              Product Key (Tùy chọn):
                            </label>
                            <input
                              type="text"
                              placeholder="VD: XXXXX-XXXXX..."
                              value={newLicForm.licenseKey}
                              onChange={(e) => setNewLicForm({ ...newLicForm, licenseKey: e.target.value })}
                              className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                              Số Ghế (Seats):
                            </label>
                            <input
                              type="number"
                              min={1}
                              value={newLicForm.totalSeats}
                              onChange={(e) => setNewLicForm({ ...newLicForm, totalSeats: Math.max(1, parseInt(e.target.value) || 1) })}
                              className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                            />
                          </div>
                        </div>
                        <div className="flex items-center justify-between pt-1">
                          <div className="flex items-center gap-2">
                            <label className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Loại bản quyền:</label>
                            {['PERPETUAL', 'SUBSCRIPTION', 'OEM'].map((t) => (
                              <button
                                key={t}
                                type="button"
                                onClick={() => setNewLicForm({ ...newLicForm, licenseType: t })}
                                className={`px-2.5 py-1 rounded-lg text-[10.5px] font-bold transition-all ${
                                  newLicForm.licenseType === t
                                    ? 'bg-blue-600 text-white shadow-2xs'
                                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                                }`}
                              >
                                {t === 'PERPETUAL' ? 'Vĩnh viễn' : t === 'SUBSCRIPTION' ? 'Thuê bao' : 'Theo máy OEM'}
                              </button>
                            ))}
                          </div>
                          <button
                            type="button"
                            disabled={isSubmittingNewLic || !newLicForm.name.trim()}
                            onClick={() => handleAdminCreateAndAssignLicense()}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>{isSubmittingNewLic ? 'Đang thêm...' : 'Lưu Vào Kho & Gán Ngay'}</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* SECTION 1: KẾT QUẢ QUÉT BẢN QUYỀN TỪ MÁY TRẠM (AGENT PS1) */}
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <ShieldCheck className="w-4 h-4 text-indigo-600" />
                          <span className="font-bold text-xs text-slate-900 dark:text-white uppercase tracking-wider">
                            Bản Quyền Đã Quét Từ Thiết Bị (Agent PS1)
                          </span>
                        </div>
                        {specs.lastScannedAt && (
                          <span className="text-[10.5px] text-slate-400 font-medium">
                            Quét lúc: {new Date(specs.lastScannedAt).toLocaleString('vi-VN')}
                          </span>
                        )}
                      </div>

                      {/* Cảnh báo Crack / Bẻ khóa (Nếu có) */}
                      {crack?.hasSuspect && (
                        <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl space-y-1.5 text-xs text-rose-950 dark:text-rose-200">
                          <div className="flex items-center gap-2 font-bold text-rose-800 dark:text-rose-300">
                            <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                            <span>Cảnh Báo: Phát hiện dấu hiệu Bẻ khóa / Can thiệp bản quyền</span>
                          </div>
                          <ul className="list-disc list-inside space-y-0.5 text-[11.5px] text-rose-800 dark:text-rose-300 pl-1">
                            {crack.warnings.map((w: string, wIdx: number) => (
                              <li key={wIdx}>{w}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Grid 2 Card OS & Office License */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        {/* Windows OS License */}
                        <div className="p-3 rounded-xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                              <Laptop className="w-3.5 h-3.5 text-blue-600" />
                              Bản Quyền Windows
                            </span>
                            {osLic?.isKmsCrack ? (
                              <span className="px-2 py-0.5 rounded bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 text-[10px] font-bold">
                                KMS Lậu / Crack
                              </span>
                            ) : osLic?.status === 'Licensed' ? (
                              <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold">
                                Đã kích hoạt ({osLic.channel || 'Bản quyền'})
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-bold">
                                {osLic?.status || 'Chưa phát hiện'}
                              </span>
                            )}
                          </div>
                          <div className="text-[11.5px] text-slate-800 dark:text-slate-200 font-semibold truncate">
                            {osLic?.name || specs.os || editFormData.os || 'Windows OS'}
                          </div>
                          <div className="text-[10.5px] text-slate-500 dark:text-slate-400 flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
                            <span>Kênh: <strong>{osLic?.channel || 'OEM / Retail'}</strong></span>
                            {osLic?.partialKey && (
                              <span className="font-mono">Key: ****-{osLic.partialKey}</span>
                            )}
                          </div>
                          {osLic && (
                            <button
                              type="button"
                              onClick={() => handleQuickAddLicenseFromModal(osLic.name || 'Windows 11 Pro', osLic.partialKey, osLic.channel)}
                              className="w-full py-1.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-lg font-bold text-[11px] transition-colors flex items-center justify-center gap-1 cursor-pointer border border-blue-200 dark:border-blue-800"
                            >
                              <Plus className="w-3 h-3" />
                              <span>Đưa Windows Này Vào Kho License</span>
                            </button>
                          )}
                        </div>

                        {/* MS Office License */}
                        <div className="p-3 rounded-xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                              <FileText className="w-3.5 h-3.5 text-orange-600" />
                              Bản Quyền MS Office
                            </span>
                            {officeLic?.status === 'Licensed' ? (
                              <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold">
                                {officeLic.channel === 'Subscription' ? 'O365 Bản quyền' : 'Kích hoạt'}
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-bold">
                                {officeLic?.status || 'Chưa phát hiện'}
                              </span>
                            )}
                          </div>
                          <div className="text-[11.5px] text-slate-800 dark:text-slate-200 font-semibold truncate">
                            {officeLic?.name || 'Chưa cài đặt Office hoặc phiên bản web'}
                          </div>
                          <div className="text-[10.5px] text-slate-500 dark:text-slate-400 flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
                            <span>Kênh: <strong>{officeLic?.channel || 'Chưa rõ'}</strong></span>
                            {officeLic?.partialKey && (
                              <span className="font-mono">Key: ****-{officeLic.partialKey}</span>
                            )}
                          </div>
                          {officeLic && (
                            <button
                              type="button"
                              onClick={() => handleQuickAddLicenseFromModal(officeLic.name || 'Microsoft Office 365', officeLic.partialKey, officeLic.channel)}
                              className="w-full py-1.5 bg-orange-50 hover:bg-orange-100 dark:bg-orange-950/60 dark:hover:bg-orange-900 text-orange-700 dark:text-orange-300 rounded-lg font-bold text-[11px] transition-colors flex items-center justify-center gap-1 cursor-pointer border border-orange-200 dark:border-orange-800"
                            >
                              <Plus className="w-3 h-3" />
                              <span>Đưa Office Này Vào Kho License</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* License Matches Alert (Unassigned) */}
                      {licMatches.some((m: any) => m.matchStatus === 'UNASSIGNED_MATCH') && (
                        <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl space-y-2 text-xs text-amber-950 dark:text-amber-200">
                          <div className="flex items-center gap-2 font-bold text-amber-800 dark:text-amber-300">
                            <Key className="w-4 h-4 text-amber-600 shrink-0" />
                            <span>Phát hiện phần mềm trên máy trùng với License trong kho (Chưa gán):</span>
                          </div>
                          <div className="space-y-1.5">
                            {licMatches
                              .filter((m: any) => m.matchStatus === 'UNASSIGNED_MATCH')
                              .map((m: any, mIdx: number) => (
                                <div key={mIdx} className="bg-white/80 dark:bg-slate-900/80 p-2.5 rounded-lg border border-amber-200 dark:border-amber-800 flex items-center justify-between gap-2">
                                  <div>
                                    <div className="font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                                      <span>{m.softwareName}</span>
                                      <span className="text-amber-700 dark:text-amber-400 font-normal">→ Kho:</span>
                                      <span className="text-blue-700 dark:text-blue-300 font-bold">{m.licenseName}</span>
                                    </div>
                                    <div className="text-[10.5px] text-slate-500 dark:text-slate-400">
                                      Ghế trống khả dụng: <strong className="text-emerald-600">{m.availableSeats} / {m.seats}</strong>
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (!selectedLicenseIds.includes(m.licenseId)) {
                                        setSelectedLicenseIds((prev) => [...prev, m.licenseId]);
                                      }
                                    }}
                                    className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-xs transition-colors shrink-0 shadow-xs cursor-pointer flex items-center gap-1"
                                  >
                                    <Check className="w-3 h-3" />
                                    <span>{selectedLicenseIds.includes(m.licenseId) ? 'Đã chọn gán' : 'Chọn Gán Vào Máy'}</span>
                                  </button>
                                </div>
                              ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* SECTION 2: DANH SÁCH LICENSE TRONG KHO HỆ THỐNG */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                          <Key className="w-3.5 h-3.5 text-blue-600" />
                          <span>Kho License Của Hệ Thống ({licenses.length})</span>
                        </span>
                        <span className="text-[11px] text-slate-400">
                          Đã chọn gán: <strong className="text-blue-600 dark:text-blue-400">{selectedLicenseIds.length}</strong> License
                        </span>
                      </div>

                      {licenses.length === 0 ? (
                        <div className="text-center py-8 bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-700 rounded-2xl space-y-2">
                          <Layers className="w-7 h-7 text-slate-300 mx-auto" />
                          <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                            Chưa có bản quyền phần mềm nào trong kho
                          </p>
                          <p className="text-[11px] text-slate-400 max-w-md mx-auto">
                            Bạn có thể nhấn các nút <strong>"+ Đưa vào Kho License"</strong> ở phần quét phía trên để tự động đưa Windows/Office vào kho, hoặc bấm <strong>"Tạo Mới License"</strong> để thêm thủ công.
                          </p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-60 overflow-y-auto pr-1">
                          {licenses.map((lic) => {
                            const isAssigned = selectedLicenseIds.includes(lic.id);
                            return (
                              <div
                                key={lic.id}
                                onClick={() => {
                                  setSelectedLicenseIds((prev) =>
                                    isAssigned ? prev.filter((id) => id !== lic.id) : [...prev, lic.id]
                                  );
                                }}
                                className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-start justify-between gap-3 ${
                                  isAssigned
                                    ? 'bg-blue-50 dark:bg-blue-950/50 border-blue-300 dark:border-blue-700 ring-2 ring-blue-200 dark:ring-blue-900'
                                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                                }`}
                              >
                                <div className="space-y-1 flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-xs text-slate-900 dark:text-white">{lic.name}</span>
                                    <span className="text-[10px] font-bold px-1.5 py-0.2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded">
                                      {lic.licenseType || 'PERPETUAL'}
                                    </span>
                                  </div>
                                  <div className="text-[10.5px] text-slate-400 flex items-center gap-2">
                                    <span>Seats: {lic.usedSeats || 0}/{lic.totalSeats || 1}</span>
                                    {lic.expiryDate && (
                                      <span>• Hạn: {new Date(lic.expiryDate).toLocaleDateString('vi-VN')}</span>
                                    )}
                                  </div>
                                </div>

                                <div className={`w-5 h-5 rounded-lg flex items-center justify-center border transition-colors ${
                                  isAssigned
                                    ? 'bg-blue-600 text-white border-blue-600'
                                    : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900'
                                }`}>
                                  {isAssigned && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* SECTION 3: DANH SÁCH PHẦN MỀM ĐÃ QUÉT TRÊN MÁY */}
                    {installedSw.length > 0 && (
                      <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                            <Layers className="w-3.5 h-3.5 text-indigo-600" />
                            <span>Phần mềm & Ứng dụng đã cài đặt trên máy ({installedSw.length})</span>
                          </span>
                        </div>
                        <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                          {installedSw.map((sw: any, sIdx: number) => {
                            const isCommercial =
                              sw.name?.toLowerCase().includes('office') ||
                              sw.name?.toLowerCase().includes('photoshop') ||
                              sw.name?.toLowerCase().includes('autocad') ||
                              sw.name?.toLowerCase().includes('adobe');

                            return (
                              <div key={sIdx} className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800/60 flex items-center justify-between gap-2 text-xs">
                                <div>
                                  <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                                    <span>{sw.name}</span>
                                    {isCommercial && (
                                      <span className="px-1.5 py-0.2 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 text-[9px] font-bold">
                                        Cần License
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[10px] text-slate-400">
                                    {sw.publisher || 'Nhà phát triển không xác định'} {sw.version ? `· v${sw.version}` : ''}
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleQuickAddLicenseFromModal(sw.name, undefined, isCommercial ? 'COMMERCIAL' : 'PERPETUAL')}
                                  className="px-2 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-[10.5px] font-semibold transition-colors shrink-0 flex items-center gap-1 cursor-pointer"
                                >
                                  <Plus className="w-2.5 h-2.5" />
                                  <span>Thêm vào Kho</span>
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </form>

            {/* Modal Sticky Footer */}
            <div className="flex items-center justify-between gap-2 px-6 py-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/60 rounded-b-3xl shrink-0">
              <div className="flex items-center gap-2">
                {editingAssetId && (
                  <button
                    type="button"
                    onClick={() => {
                      const currentAsset = assets.find((a) => a.id === editingAssetId);
                      if (currentAsset) openMaintenance(currentAsset);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    <Wrench className="w-3.5 h-3.5 text-amber-600" />
                    <span>Lịch Sử Sửa Chữa</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 cursor-pointer"
                >
                  Hủy (Esc)
                </button>
                <button
                  type="submit"
                  form="edit-asset-form"
                  className="px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Phê Duyệt & Lưu Tài Sản</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      
      {/* MODAL: ASSET DETAIL OVERVIEW */}
      {isDetailModalOpen && selectedDetailAsset && (() => {
        const activeAssignment = selectedDetailAsset.assignments?.find((a: any) => !a.returnedAt);
        const specs = selectedDetailAsset.specs || {};
        const warrantyInfo = selectedDetailAsset.warrantyExpiry ? getRemainingTimeText(selectedDetailAsset.warrantyExpiry) : null;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-3 sm:p-4">
            <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full flex flex-col max-h-[92vh] border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              {/* Modal Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-t-3xl shrink-0">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 bg-blue-500/30 text-blue-200 border border-blue-400/30 rounded-lg text-xs font-mono font-bold">
                      [{selectedDetailAsset.assetTag}]
                    </span>
                    <h3 className="font-bold text-base text-white truncate max-w-lg">
                      {selectedDetailAsset.name}
                    </h3>
                  </div>
                  <p className="text-xs text-blue-200 flex items-center gap-2">
                    <span>{selectedDetailAsset.brand} {selectedDetailAsset.model || ''}</span>
                    {selectedDetailAsset.serialNumber && (
                      <span className="font-mono text-slate-300">• SN: {selectedDetailAsset.serialNumber}</span>
                    )}
                  </p>
                </div>
                <button
                  onClick={() => setIsDetailModalOpen(false)}
                  className="text-white/70 hover:text-white p-1.5 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* 4 Overview KPI Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {/* Trạng thái */}
                  <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{isEn ? 'Status' : 'Trạng thái'}</span>
                    <div>
                      {selectedDetailAsset.status === 'AVAILABLE' && (
                        <span className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">● Sẵn sàng</span>
                      )}
                      {selectedDetailAsset.status === 'IN_USE' && (
                        <span className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">● Đang sử dụng</span>
                      )}
                      {selectedDetailAsset.status === 'MAINTENANCE' && (
                        <span className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">● Đang bảo trì</span>
                      )}
                      {selectedDetailAsset.status === 'RETIRED' && (
                        <span className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">● Đã thanh lý</span>
                      )}
                      {!['AVAILABLE', 'IN_USE', 'MAINTENANCE', 'RETIRED'].includes(selectedDetailAsset.status) && (
                        <span className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">● {selectedDetailAsset.status}</span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 font-medium">
                      {selectedDetailAsset.condition === 'NEW' && 'Tình trạng: Mới 100%'}
                      {selectedDetailAsset.condition === 'GOOD' && 'Tình trạng: Tốt (Hoạt động ổn định)'}
                      {selectedDetailAsset.condition === 'FAIR' && 'Tình trạng: Bình thường (Khá)'}
                      {selectedDetailAsset.condition === 'POOR' && 'Tình trạng: Cần bảo trì'}
                      {selectedDetailAsset.condition === 'BROKEN' && 'Tình trạng: Hỏng hóc'}
                      {!['NEW', 'GOOD', 'FAIR', 'POOR', 'BROKEN'].includes(selectedDetailAsset.condition) && (selectedDetailAsset.condition ? `Tình trạng: ${selectedDetailAsset.condition}` : 'Tình trạng: —')}
                    </p>
                  </div>

                  {/* Cấp phát hiện tại */}
                  <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Đang cấp phát cho</span>
                    {activeAssignment?.user ? (
                      <div className="space-y-0.5">
                        <QuickLink
                          type="user"
                          id={activeAssignment.user.id}
                          label={activeAssignment.user.fullName}
                          subLabel={activeAssignment.user.department}
                          icon="👤"
                          className="text-xs font-bold text-slate-900 truncate"
                        />
                      </div>
                    ) : (
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md inline-block">
                        Kho thiết bị (Sẵn sàng)
                      </span>
                    )}
                  </div>

                  {/* Công ty & Vị trí (Không dùng truncate, hiển thị trọn vẹn tên công ty) */}
                  <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-1.5 flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                        Công ty & Vị trí
                      </span>
                      <p className="text-xs font-bold text-indigo-950 dark:text-indigo-200 whitespace-normal break-words leading-snug">
                        🏢 {selectedDetailAsset.companyName || 'Công ty chung'}
                      </p>
                    </div>
                    <p className="text-[10.5px] text-slate-500 whitespace-normal break-words leading-tight flex items-start gap-1 pt-1 border-t border-slate-200/60">
                      <span>📍</span>
                      <span className="font-medium">{selectedDetailAsset.location?.name || 'Kho thiết bị IT'}</span>
                    </p>
                  </div>

                  {/* Giá mua & Bảo hành (Dual-Currency tự động theo Tiền tệ ưu tiên) */}
                  {(() => {
                    const rawPrice = Number(selectedDetailAsset.purchasePrice) || 0;
                    const rawCurr = (selectedDetailAsset.purchaseCurrency || 'VND').toUpperCase();
                    const convertedPrice = convertCurrency(rawPrice, rawCurr, selectedCurrency);
                    const isDual = rawPrice > 0 && rawCurr !== selectedCurrency.toUpperCase();

                    return (
                      <div className="p-3.5 bg-blue-50/60 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-2xl space-y-1 flex flex-col justify-between">
                        <div>
                          <span className="text-[10px] font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wider block mb-0.5">
                            Chi phí mua sắm
                          </span>
                          {rawPrice > 0 ? (
                            <div className="space-y-0.5">
                              <p className="text-sm font-black text-blue-950 dark:text-blue-200 font-mono">
                                {formatPrice(convertedPrice, selectedCurrency)}
                              </p>
                              {isDual && (
                                <p className="text-[10.5px] font-bold text-emerald-700 dark:text-emerald-400 block font-mono">
                                  Gốc: {formatPrice(rawPrice, rawCurr)}
                                </p>
                              )}
                            </div>
                          ) : (
                            <p className="text-xs font-bold text-slate-400 italic">0 đ / Miễn phí</p>
                          )}
                        </div>
                        <div className="pt-1 border-t border-blue-200/60 space-y-0.5">
                          {warrantyInfo ? (
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full inline-block ${warrantyInfo.badgeClass}`}>
                              {warrantyInfo.text}
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400">Không có hạn BH</span>
                          )}
                          <span className="text-[9.5px] text-slate-400 block font-mono">
                            (Tỷ giá quy đổi ngày 25/08/2026)
                          </span>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Thông số kỹ thuật & Cấu hình chi tiết (Đồng bộ nhãn với Form Thêm/Sửa) */}
                {(() => {
                  const rawSpecs: Record<string, any> = selectedDetailAsset.specs || {};
                  const catFields = getCategoryFields(selectedDetailAsset.categoryId);

                  // Process and normalize spec entries, eliminating duplicates like cpu & processor with identical values
                  const normalizedEntries: Array<{ key: string; label: string; value: string }> = [];
                  const seenLabels = new Set<string>();

                  // 1. Process category defined fields first
                  for (const f of catFields) {
                    const v = rawSpecs[f.key] ?? rawSpecs[f.key.toLowerCase()] ?? rawSpecs[f.label];
                    if (v !== undefined && v !== null && String(v).trim() !== '') {
                      normalizedEntries.push({
                        key: f.key,
                        label: f.label,
                        value: String(v),
                      });
                      seenLabels.add(f.label.toLowerCase());
                      seenLabels.add(f.key.toLowerCase());
                    }
                  }

                  // 2. Process extra dynamic fields from AI / Custom
                  for (const [k, v] of Object.entries(rawSpecs)) {
                    if (v === undefined || v === null || String(v).trim() === '') continue;
                    if (['billingperiodcount', 'billingperiodunit', 'paymenthistory'].includes(k.toLowerCase())) continue;

                    const label = getFriendlySpecLabel(k, selectedDetailAsset.categoryId);
                    const cleanKey = k.toLowerCase().replace(/[^a-z0-9]/g, '');

                    // De-duplicate synonym fields if same label or value already rendered
                    if (seenLabels.has(label.toLowerCase()) || seenLabels.has(cleanKey)) continue;

                    // If processor has same value as cpu, skip
                    if (cleanKey === 'processor' && (rawSpecs.cpu || rawSpecs.CPU)) continue;
                    if (cleanKey === 'screensize' && (rawSpecs.display || rawSpecs.screen)) continue;
                    if (cleanKey === 'ssd' && (rawSpecs.storage || rawSpecs.STORAGE)) continue;

                    normalizedEntries.push({
                      key: k,
                      label,
                      value: String(v),
                    });
                    seenLabels.add(label.toLowerCase());
                    seenLabels.add(cleanKey);
                  }

                  return (
                    <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                          <Cpu className="w-4 h-4 text-blue-600" />
                          <span>Thông số kỹ thuật & Cấu hình chi tiết:</span>
                        </h4>
                        <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                          {normalizedEntries.length} thông số
                        </span>
                      </div>

                      {normalizedEntries.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                          {normalizedEntries.map((item) => (
                            <div key={item.key} className="p-3 bg-white border border-slate-200 rounded-xl space-y-1 shadow-2xs hover:border-blue-300 transition-colors">
                              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block truncate" title={item.label}>
                                {item.label}
                              </span>
                              <p className="text-xs font-bold text-slate-900 break-words leading-relaxed">{item.value}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 italic">Chưa nhập thông số cấu hình cụ thể.</p>
                      )}
                    </div>
                  );
                })()}

                
                
                {/* 🔄 LỊCH SỬ ĐIỀU CHUYỂN & BÀN GIAO NHÂN SỰ */}
                <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-2xs">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-700">
                        <ArrowLeftRight className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                          Lịch Sử Điều Chuyển & Bàn Giao Nhân Sự ({selectedDetailAsset.assignments?.length || 0})
                        </h4>
                        <p className="text-[11px] text-slate-400">Theo dõi toàn bộ lịch sử luân chuyển thiết bị qua các nhân sự và chi nhánh</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        openTransferModal(selectedDetailAsset);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
                    >
                      <ArrowLeftRight className="w-3.5 h-3.5" />
                      <span>Thực Hiện Điều Chuyển Mới</span>
                    </button>
                  </div>

                  {(!selectedDetailAsset.assignments || selectedDetailAsset.assignments.length === 0) ? (
                    <div className="text-center py-6 bg-slate-50 border border-dashed border-slate-200 rounded-xl space-y-1">
                      <p className="text-xs font-semibold text-slate-700">Thiết bị chưa có lịch sử bàn giao nào</p>
                      <p className="text-[11px] text-slate-400">Thiết bị đang nằm trong kho sẵn sàng hoặc chưa được ghi nhận cấp phát.</p>
                    </div>
                  ) : (
                    <div className="relative pl-6 space-y-3.5 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-indigo-100">
                      {selectedDetailAsset.assignments.map((asg: any, idx: number) => {
                        const isCurrent = !asg.returnedAt;

                        return (
                          <div key={asg.id} className="relative group">
                            {/* Dot Indicator */}
                            <div className={`absolute -left-6 top-1 w-3 h-3 rounded-full border-2 ${
                              isCurrent
                                ? 'bg-emerald-500 border-white ring-4 ring-emerald-100'
                                : 'bg-slate-300 border-white ring-2 ring-slate-100'
                            }`} />

                            <div className={`p-3.5 rounded-xl border transition-all space-y-1.5 ${
                              isCurrent
                                ? 'bg-indigo-50/50 border-indigo-200 shadow-2xs'
                                : 'bg-slate-50 border-slate-200/80 hover:bg-slate-100/70'
                            }`}>
                              <div className="flex items-center justify-between gap-2 flex-wrap">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-xs text-slate-900 flex items-center gap-1">
                                    <span>👤</span>
                                    <span>{asg.user?.fullName || 'Nhân viên'}</span>
                                  </span>
                                  {asg.user?.department && (
                                    <span className="text-[10px] text-slate-500 bg-white px-1.5 py-0.2 rounded border border-slate-200 font-medium">
                                      {asg.user.department}
                                    </span>
                                  )}
                                  {isCurrent ? (
                                    <span className="text-[9px] font-bold px-2 py-0.2 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                                      🟢 Đang giữ thiết bị
                                    </span>
                                  ) : (
                                    <span className="text-[9px] font-semibold px-2 py-0.2 rounded-full bg-slate-200 text-slate-700">
                                      Đã hoàn trả / Chuyển giao
                                    </span>
                                  )}
                                </div>

                                <div className="text-[11px] font-mono text-slate-500">
                                  <span>{new Date(asg.assignedAt).toLocaleDateString('vi-VN')}</span>
                                  <span> → </span>
                                  <span>{asg.returnedAt ? new Date(asg.returnedAt).toLocaleDateString('vi-VN') : 'Hiện tại'}</span>
                                </div>
                              </div>

                              {asg.notes && (
                                <p className="text-xs text-slate-600 bg-white/80 p-2 rounded-lg border border-slate-200/60 leading-relaxed">
                                  📝 {asg.notes}
                                </p>
                              )}

                              <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                                <span>Người phụ trách bàn giao: <b className="text-slate-600">{asg.assignedBy?.fullName || 'IT Admin'}</b></span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>


                {/* 🛠️ LỊCH SỬ SỬA CHỮA & NÂNG CẤP LINH KIỆN */}
                <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-2xs">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
                        <Wrench className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                          Lịch Sử Sửa Chữa & Nâng Cấp Linh Kiện ({detailMaintenanceLogs.length})
                        </h4>
                        <p className="text-[11px] text-slate-400">Theo dõi toàn bộ lịch sử bảo trì, thay thế linh kiện và chi phí</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        openMaintenance(selectedDetailAsset);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Thêm Bản Ghi Sửa Chữa / Nâng Cấp</span>
                    </button>
                  </div>

                  {detailMaintenanceLogs.length === 0 ? (
                    <div className="text-center py-6 bg-slate-50 border border-dashed border-slate-200 rounded-xl space-y-1">
                      <p className="text-xs font-semibold text-slate-700">Thiết bị chưa có lịch sử sửa chữa hoặc nâng cấp nào</p>
                      <p className="text-[11px] text-slate-400">Bấm nút "Thêm Bản Ghi" ở góc trên để ghi chú lần sửa chữa hoặc nâng cấp linh kiện mới.</p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {detailMaintenanceLogs.map((log: any) => {
                        const typeBadge =
                          log.type === 'UPGRADE'
                            ? { label: '🚀 Nâng cấp', bg: 'bg-emerald-50 text-emerald-800 border-emerald-200' }
                            : log.type === 'REPAIR'
                            ? { label: '🔧 Sửa chữa', bg: 'bg-rose-50 text-rose-800 border-rose-200' }
                            : log.type === 'REPLACEMENT'
                            ? { label: '🔄 Thay thế', bg: 'bg-blue-50 text-blue-800 border-blue-200' }
                            : log.type === 'CLEANING'
                            ? { label: '🧼 Vệ sinh', bg: 'bg-teal-50 text-teal-800 border-teal-200' }
                            : { label: log.type || 'Bảo trì', bg: 'bg-slate-100 text-slate-800 border-slate-200' };

                        return (
                          <div
                            key={log.id}
                            className="p-3.5 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-xl transition-all space-y-2"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="space-y-0.5 min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${typeBadge.bg}`}>
                                    {typeBadge.label}
                                  </span>
                                  <h5 className="text-xs font-bold text-slate-900 truncate">
                                    {log.title}
                                  </h5>
                                </div>
                                {log.description && (
                                  <p className="text-xs text-slate-600 leading-relaxed pt-0.5">
                                    {log.description}
                                  </p>
                                )}
                              </div>

                              {log.cost !== null && log.cost !== undefined && Number(log.cost) > 0 && (
                                <div className="text-right shrink-0">
                                  <span className="text-xs font-black text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-lg">
                                    {formatCurrency(Number(log.cost))}
                                  </span>
                                </div>
                              )}
                            </div>

                            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-200/60 flex-wrap gap-2">
                              <div className="flex items-center gap-3">
                                <span>📅 Ngày thực hiện: <b className="text-slate-700">{log.performedAt ? new Date(log.performedAt).toLocaleDateString('vi-VN') : '—'}</b></span>
                                {log.performedBy && (
                                  <span>👤 Thực hiện: <b className="text-slate-700">{log.performedBy.fullName || log.performedBy.name}</b></span>
                                )}
                                {log.vendor && (
                                  <span>🏢 Đối tác: <b className="text-slate-700">{log.vendor.name}</b></span>
                                )}
                              </div>

                              {log.notes && (
                                <span className="italic text-slate-500 truncate max-w-xs" title={log.notes}>
                                  📝 {log.notes}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>


                {/* THANH CHỈ SỐ TÀI CHÍNH & KHẤU HAO DỒN TÍCH */}
                {(() => {
                  const rawPrice = Number(selectedDetailAsset.purchasePrice) || 0;
                  const rawCurr = (selectedDetailAsset.purchaseCurrency || 'VND').toUpperCase();
                  const rate = selectedDetailAsset.exchangeRate || exchangeRatesMap[rawCurr] || 1;
                  const priceInVnd = rawPrice * rate;
                  const convertedPrice = convertCurrency(rawPrice, rawCurr, selectedCurrency);

                  if (rawPrice <= 0) return null;

                  // Tính khấu hao đường thẳng (Giả định 36 tháng cho thiết bị CNTT)
                  const purchaseDate = selectedDetailAsset.purchaseDate ? new Date(selectedDetailAsset.purchaseDate) : new Date();
                  const now = new Date();
                  const diffMonths = Math.max(0, (now.getFullYear() - purchaseDate.getFullYear()) * 12 + (now.getMonth() - purchaseDate.getMonth()));
                  const totalMonths = 36;
                  const depRatio = Math.min(1, Math.max(0, diffMonths / totalMonths));
                  const accumulatedDepreciation = convertedPrice * depRatio;
                  const remainingValue = Math.max(0, convertedPrice - accumulatedDepreciation);

                  return (
                    <div className="p-4 bg-gradient-to-r from-blue-50/80 via-indigo-50/70 to-purple-50/80 dark:from-slate-800/80 dark:to-slate-800/50 border border-blue-200/80 dark:border-blue-900/60 rounded-2xl space-y-3">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <span className="text-xs font-extrabold text-blue-950 dark:text-blue-200 uppercase tracking-wider flex items-center gap-1.5">
                          <DollarSign className="w-4 h-4 text-blue-600" />
                          <span>Chỉ Số Tài Chính & Khấu Hao Dồn Tích</span>
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-200/80 text-blue-950 dark:bg-blue-900 dark:text-blue-200">
                          Khung khấu hao 36 tháng
                        </span>
                      </div>

                      {/* 5-Step Pipeline Card Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                        <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-blue-100 dark:border-slate-800 shadow-2xs">
                          <span className="text-[9.5px] font-bold text-slate-400 uppercase block">1. Nguyên giá gốc</span>
                          <span className="text-xs font-black text-slate-900 dark:text-white font-mono block mt-0.5 truncate">
                            {formatPrice(rawPrice, rawCurr)}
                          </span>
                        </div>

                        <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-blue-100 dark:border-slate-800 shadow-2xs">
                          <span className="text-[9.5px] font-bold text-slate-400 uppercase block">2. Tỷ giá hạch toán</span>
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 font-mono block mt-0.5 truncate">
                            1 {rawCurr} = {new Intl.NumberFormat('vi-VN').format(rate)} đ
                          </span>
                        </div>

                        <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-blue-100 dark:border-slate-800 shadow-2xs">
                          <span className="text-[9.5px] font-bold text-blue-600 uppercase block">3. Giá quy đổi ({selectedCurrency})</span>
                          <span className="text-xs font-black text-blue-900 dark:text-blue-300 font-mono block mt-0.5 truncate">
                            {formatPrice(convertedPrice, selectedCurrency)}
                          </span>
                        </div>

                        <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-amber-100 dark:border-slate-800 shadow-2xs">
                          <span className="text-[9.5px] font-bold text-amber-600 uppercase block">4. Khấu hao ({Math.round(depRatio * 100)}%)</span>
                          <span className="text-xs font-black text-amber-700 dark:text-amber-400 font-mono block mt-0.5 truncate">
                            {formatPrice(accumulatedDepreciation, selectedCurrency)}
                          </span>
                        </div>

                        <div className="col-span-2 sm:col-span-1 p-2.5 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800 shadow-2xs">
                          <span className="text-[9.5px] font-bold text-emerald-700 uppercase block">5. Giá trị còn lại</span>
                          <span className="text-xs font-black text-emerald-900 dark:text-emerald-300 font-mono block mt-0.5 truncate">
                            {formatPrice(remainingValue, selectedCurrency)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Danh Sách Bản Quyền & License Đang Cài Đặt Trên Máy */}
                {(() => {
                  const assignedLics = selectedDetailAsset.licenseAssignments?.filter((la: any) => !la.revokedAt) || [];
                  return (
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                          <Key className="w-3.5 h-3.5 text-purple-600" />
                          <span>Bản quyền phần mềm cài trên máy ({assignedLics.length})</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setIsDetailModalOpen(false);
                            handleOpenEdit(selectedDetailAsset);
                            setModalActiveTab('licenses');
                          }}
                          className="text-[11px] text-purple-600 hover:text-purple-800 font-bold hover:underline cursor-pointer"
                        >
                          + Gán thêm / Sửa bản quyền
                        </button>
                      </div>
                      {assignedLics.length === 0 ? (
                        <p className="text-xs text-slate-400 italic bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                          Chưa có bản quyền phần mềm nào được gán vào thiết bị này.
                        </p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {assignedLics.map((la: any) => {
                            const lic = la.license;
                            if (!lic) return null;
                            return (
                              <div key={la.id || lic.id} className="p-2.5 bg-purple-50/50 dark:bg-purple-950/40 rounded-xl border border-purple-200 dark:border-purple-800 flex items-center justify-between gap-2">
                                <QuickLink
                                  type="license"
                                  id={lic.id}
                                  label={lic.name}
                                  icon="🔑"
                                  className="font-bold text-purple-900 dark:text-purple-300 text-xs truncate"
                                />
                                <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded text-[9.5px] font-bold shrink-0">
                                  {lic.licenseType || 'PERPETUAL'}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Thông tin Chứng từ & Tài chính Đa Tiền Tệ */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Hợp đồng / Hóa đơn & Tài chính */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      Chứng từ & Định giá mua sắm
                    </span>
                    
                    <div className="space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Số Hợp Đồng:</span>
                        <span className="font-mono font-bold text-slate-800">{selectedDetailAsset.contractNumber || '—'}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Số Hóa Đơn:</span>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-slate-800">{selectedDetailAsset.invoiceNumber || '—'}</span>
                          {selectedDetailAsset.invoiceNumber && (
                            <Link
                              href={`/documents?search=${encodeURIComponent(selectedDetailAsset.invoiceNumber)}`}
                              className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded text-[9.5px] font-bold flex items-center gap-1 transition-colors"
                              title="Tra cứu hóa đơn trong kho chứng từ"
                            >
                              <span>📄 Kho hồ sơ</span>
                            </Link>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Nhà cung cấp:</span>
                        <span className="font-semibold text-slate-800">{selectedDetailAsset.vendor ? <QuickLink type='vendor' id={selectedDetailAsset.vendor.id || selectedDetailAsset.vendor.name} label={selectedDetailAsset.vendor.name} showIcon={false} className='font-bold text-blue-700' /> : '—'}</span>
                      </div>

                      {/* Chi tiết Giá gốc & Quy đổi */}
                      {(() => {
                        const rawPrice = Number(selectedDetailAsset.purchasePrice) || 0;
                        const rawCurr = (selectedDetailAsset.purchaseCurrency || 'VND').toUpperCase();
                        const rate = selectedDetailAsset.exchangeRate || exchangeRatesMap[rawCurr] || 1;
                        const priceInVnd = rawPrice * rate;
                        const convertedPrice = convertCurrency(rawPrice, rawCurr, selectedCurrency);
                        const wordsVnd = priceInVnd > 0 ? numberToVietnameseWords(priceInVnd) : '';

                        if (rawPrice <= 0) return null;

                        return (
                          <div className="pt-2 border-t border-slate-100 space-y-2">
                            <div className="p-3 bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/80 rounded-xl space-y-1.5">
                              <div className="flex items-center justify-between">
                                <span className="text-slate-600 font-semibold">Giá hóa đơn gốc:</span>
                                <span className="font-black text-blue-950 dark:text-blue-200 font-mono">
                                  {formatPrice(rawPrice, rawCurr)}
                                </span>
                              </div>

                              {/* Đọc số tiền bằng chữ */}
                              {wordsVnd && (
                                <p className="text-[11px] font-bold text-purple-700 dark:text-purple-300 italic pt-0.5">
                                  ✍️ Bằng chữ: {wordsVnd}
                                </p>
                              )}

                              {/* Dòng Quy đổi nhanh theo Tiền tệ ưu tiên */}
                              <div className="p-2 bg-white/90 dark:bg-slate-900 rounded-lg border border-blue-200/60 space-y-0.5">
                                <div className="flex items-center justify-between text-blue-900 dark:text-blue-200 font-semibold text-[11px]">
                                  <span>⚡ Quy đổi [{selectedCurrency}]:</span>
                                  <span className="font-black font-mono">{formatPrice(convertedPrice, selectedCurrency)}</span>
                                </div>
                                <p className="text-[10px] text-slate-500 font-mono">
                                  (Tỷ giá hạch toán: 1 {rawCurr} = {new Intl.NumberFormat('vi-VN').format(rate)} VND)
                                </p>
                              </div>
                            </div>

                            {/* Ghi chú mốc thời gian quy đổi */}
                            <div className="p-2 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800 text-[10.5px] text-slate-600 dark:text-slate-400 flex items-center gap-1.5 font-medium">
                              <Clock className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                              <span>Tỷ giá tham chiếu hạch toán cập nhật: 25/08/2026 (Theo Vietcombank / Tỷ giá hạch toán)</span>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Ghi chú */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-1.5 flex flex-col">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Ghi chú quản lý</span>
                    <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-xl font-normal leading-relaxed flex-1 min-h-[80px]">
                      {selectedDetailAsset.notes || 'Không có ghi chú nào cho thiết bị này.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Modal Sticky Footer with Quick Actions & Edit Button */}
              <div className="flex items-center justify-between px-6 py-3.5 border-t border-slate-100 bg-slate-50/70 rounded-b-3xl shrink-0">
                {/* Left quick actions */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      openTransferModal(selectedDetailAsset);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs"
                  >
                    <ArrowLeftRight className="w-3.5 h-3.5 text-indigo-600" />
                    <span>🔄 Điều Chuyển Nhân Sự</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      openMaintenance(selectedDetailAsset);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs"
                  >
                    <Wrench className="w-3.5 h-3.5 text-amber-600" />
                    <span>🛠️ Sửa Chữa / Nâng Cấp ({selectedDetailAsset._count?.maintenanceLogs || 0})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedQrAsset(selectedDetailAsset);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs"
                  >
                    <QrCode className="w-3.5 h-3.5 text-indigo-600" />
                    <span>🖨️ In Tem QR</span>
                  </button>
                </div>

                {/* Right buttons */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsDetailModalOpen(false);
                      handleOpenEdit(selectedDetailAsset);
                    }}
                    className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs flex items-center gap-1.5"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    <span>✏️ Sửa Thông Tin Tài Sản</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsDetailModalOpen(false)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    Đóng (ESC)
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}


      
      {/* ==================== MODAL: TRANSFER / REASSIGN ASSET ==================== */}
      {isTransferModalOpen && transferAsset && (() => {
        const currentActiveAssignment = transferAsset.assignments?.find((a: any) => a.returnedAt === null);

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
            <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-5xl w-full flex flex-col max-h-[92vh] border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              {/* Modal Header (1 Line Slim) */}
              <div className="flex items-center justify-between px-6 py-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-900 text-white rounded-t-3xl shrink-0">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="px-2 py-0.5 bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 rounded-lg text-xs font-mono font-bold shrink-0">
                    [{transferAsset.assetTag}]
                  </span>
                  <h3 className="font-bold text-sm text-white truncate">
                    Điều chuyển & Bàn giao thiết bị
                  </h3>
                  <span className="text-slate-400 text-xs truncate hidden sm:inline">
                    • {transferAsset.name} {transferAsset.brand ? `(${transferAsset.brand})` : ''}
                  </span>
                </div>
                <button
                  onClick={() => setIsTransferModalOpen(false)}
                  className="text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {/* Current Holder Status Banner */}
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl flex items-center justify-between gap-3 text-xs">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Người đang giữ hiện tại:</span>
                    {currentActiveAssignment?.user ? (
                      <p className="font-bold text-slate-900 dark:text-white text-xs flex items-center gap-1.5 mt-0.5">
                        <span>👤 {currentActiveAssignment.user.fullName}</span>
                        <span className="text-[11px] text-slate-500 font-normal">({currentActiveAssignment.user.department || 'Nhân sự'})</span>
                      </p>
                    ) : (
                      <p className="font-bold text-emerald-700 dark:text-emerald-400 text-xs mt-0.5">
                        🟢 Đang trong kho IT (Chưa cấp phát)
                      </p>
                    )}
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Vị trí:</span>
                    <span className="font-medium text-slate-700 dark:text-slate-300">{transferAsset.location?.name || 'Kho thiết bị'}</span>
                  </div>
                </div>

                {/* Transfer Form */}
                <form id="transfer-asset-form" onSubmit={handleTransferSubmit} className="space-y-3.5">
                  {/* Inline Error Message */}
                  {transferError && (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-700 flex items-center gap-2 animate-in fade-in">
                      <span>⚠️</span>
                      <span>{transferError}</span>
                    </div>
                  )}

                  {/* Action Selector: 2 Clean Options */}
                  <div className="p-1 bg-slate-100 dark:bg-slate-800 rounded-xl flex gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setTransferForm((prev) => ({ ...prev, actionType: 'TRANSFER', toUserId: '' }));
                        setTransferUserSearch('');
                        setIsTransferUserDropdownOpen(false);
                        setTransferError('');
                      }}
                      className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        transferForm.actionType === 'TRANSFER'
                          ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-400 shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                      }`}
                    >
                      <UserCheck className="w-4 h-4 text-indigo-600" />
                      <span>Bàn giao nhân sự</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setTransferForm((prev) => ({ ...prev, actionType: 'RETURN', toUserId: '' }));
                        setTransferUserSearch('');
                        setIsTransferUserDropdownOpen(false);
                        setTransferError('');
                      }}
                      className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        transferForm.actionType === 'RETURN'
                          ? 'bg-white dark:bg-slate-900 text-rose-700 dark:text-rose-400 shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                      }`}
                    >
                      <RotateCcw className="w-4 h-4 text-rose-600" />
                      <span>Thu hồi về kho</span>
                    </button>
                  </div>

                  {/* If Action is Transfer -> Target User Selection */}
                  {transferForm.actionType === 'TRANSFER' && (
                    <div className="p-3 bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 rounded-2xl space-y-2 relative">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-bold text-indigo-950 dark:text-indigo-200 flex items-center gap-1">
                          <User className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Nhân sự tiếp nhận (*):</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => setIsQuickAddUserOpen(!isQuickAddUserOpen)}
                          className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 bg-white dark:bg-slate-800 px-2 py-0.5 rounded-lg border border-indigo-200 dark:border-indigo-700 shadow-2xs transition-colors cursor-pointer flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" />
                          <span>{isQuickAddUserOpen ? 'Đóng' : '+ Thêm nhân sự'}</span>
                        </button>
                      </div>

                      {/* Quick Add User Inline Box */}
                      {isQuickAddUserOpen && (
                        <div className="p-3 bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-700 rounded-xl space-y-2 text-xs shadow-sm animate-in fade-in">
                          <p className="font-bold text-indigo-900 dark:text-indigo-200 text-xs">Thêm nhanh nhân sự:</p>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <input
                              type="text"
                              placeholder="Họ và tên (*)"
                              value={quickAddUserName}
                              onChange={(e) => setQuickAddUserName(e.target.value)}
                              className="p-2 border border-slate-300 dark:border-slate-600 rounded-lg text-xs outline-none bg-white dark:bg-slate-900"
                            />
                            <input
                              type="email"
                              placeholder="Email công vụ (*)"
                              value={quickAddUserEmail}
                              onChange={(e) => setQuickAddUserEmail(e.target.value)}
                              className="p-2 border border-slate-300 dark:border-slate-600 rounded-lg text-xs outline-none bg-white dark:bg-slate-900"
                            />
                            <input
                              type="text"
                              placeholder="Phòng ban"
                              value={quickAddUserDept}
                              onChange={(e) => setQuickAddUserDept(e.target.value)}
                              className="p-2 border border-slate-300 dark:border-slate-600 rounded-lg text-xs outline-none bg-white dark:bg-slate-900"
                            />
                          </div>
                          <div className="flex justify-end gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => setIsQuickAddUserOpen(false)}
                              className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-semibold"
                            >{isEn ? 'Cancel' : 'Hủy'}</button>
                            <button
                              type="button"
                              disabled={quickAddingUser || !quickAddUserName.trim() || !quickAddUserEmail.trim()}
                              onClick={handleQuickCreateUser}
                              className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold shadow-2xs flex items-center gap-1 cursor-pointer"
                            >
                              {quickAddingUser ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                              <span>Lưu & Chọn</span>
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Search Input Box */}
                      <div className="relative">
                        <div className="flex items-center gap-2 p-2 bg-white dark:bg-slate-900 border border-indigo-300 dark:border-indigo-700 rounded-xl focus-within:ring-2 focus-within:ring-indigo-500 shadow-2xs">
                          <Search className="w-4 h-4 text-indigo-500 shrink-0 ml-1" />
                          <input
                            type="text"
                            placeholder="Gõ tìm kiếm nhân viên, email, phòng ban..."
                            value={transferUserSearch}
                            onChange={(e) => {
                              setTransferUserSearch(e.target.value);
                              setIsTransferUserDropdownOpen(true);
                            }}
                            onFocus={() => setIsTransferUserDropdownOpen(true)}
                            className="w-full text-xs font-semibold text-slate-800 dark:text-white outline-none bg-transparent"
                          />
                          {transferForm.toUserId && (
                            <button
                              type="button"
                              onClick={() => {
                                setTransferForm((prev: any) => ({ ...prev, toUserId: '' }));
                                setTransferUserSearch('');
                              }}
                              className="p-1 text-slate-400 hover:text-slate-600 rounded-full"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        {/* Selected User Badge */}
                        {transferForm.toUserId && (() => {
                          const selectedU = users.find((u: any) => u.id === transferForm.toUserId);
                          if (!selectedU) return null;
                          return (
                            <div className="mt-1.5 p-2 bg-indigo-100/70 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 rounded-xl text-xs flex items-center justify-between text-indigo-950 dark:text-indigo-200 font-semibold">
                              <div className="flex items-center gap-2">
                                <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-bold">
                                  {selectedU.fullName?.charAt(0) || 'U'}
                                </span>
                                <div>
                                  <p className="font-bold leading-tight">{selectedU.fullName}</p>
                                  <p className="text-[10px] text-indigo-700 dark:text-indigo-400">{selectedU.department || 'Nhân sự'} • {selectedU.email}</p>
                                </div>
                              </div>
                              <span className="text-[10px] bg-emerald-600 text-white px-2 py-0.5 rounded-full font-bold">
                                ✓ Đã chọn
                              </span>
                            </div>
                          );
                        })()}

                        {/* Filtered Dropdown List */}
                        {isTransferUserDropdownOpen && (
                          <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl z-50 max-h-56 overflow-y-auto p-1.5 space-y-1">
                            {users
                              .filter((u: any) => {
                                if (!transferUserSearch.trim()) return true;
                                const s = transferUserSearch.toLowerCase();
                                return (
                                  u.fullName?.toLowerCase().includes(s) ||
                                  u.email?.toLowerCase().includes(s) ||
                                  u.department?.toLowerCase().includes(s)
                                );
                              })
                              .map((u: any) => {
                                const isSelected = transferForm.toUserId === u.id;
                                return (
                                  <div
                                    key={u.id}
                                    onClick={() => {
                                      setTransferForm((prev: any) => ({ ...prev, toUserId: u.id }));
                                      setTransferUserSearch(u.fullName);
                                      setIsTransferUserDropdownOpen(false);
                                    }}
                                    className={`p-2 rounded-xl text-xs flex items-center justify-between cursor-pointer transition-colors ${
                                      isSelected
                                        ? 'bg-indigo-50 dark:bg-indigo-950 text-indigo-900 dark:text-indigo-200 font-bold border border-indigo-200 dark:border-indigo-800'
                                        : 'hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2">
                                      <span className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center justify-center text-[10px] font-bold">
                                        {u.fullName?.charAt(0) || 'U'}
                                      </span>
                                      <div>
                                        <p className="font-bold leading-tight">{u.fullName}</p>
                                        <p className="text-[10px] text-slate-500">{u.department || 'Nhân sự'} • {u.email}</p>
                                      </div>
                                    </div>
                                    {isSelected && <Check className="w-4 h-4 text-indigo-600" />}
                                  </div>
                                );
                              })}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Transfer Details (Date, Condition, Location, Company) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Ngày thực hiện (*)
                      </label>
                      <input
                        type="date"
                        required
                        value={transferForm.transferDate}
                        onChange={(e) => setTransferForm((prev) => ({ ...prev, transferDate: e.target.value }))}
                        className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Tình trạng máy
                      </label>
                      <select
                        value={transferForm.condition}
                        onChange={(e) => setTransferForm((prev) => ({ ...prev, condition: e.target.value }))}
                        className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                      >
                        <option value="NEW">Mới 100%</option>
                        <option value="GOOD">Tốt (Ổn định)</option>
                        <option value="FAIR">Bình thường</option>
                        <option value="POOR">Kém / Cần bảo dưỡng</option>
                        <option value="BROKEN">Hỏng hóc</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Vị trí mới
                      </label>
                      <select
                        value={transferForm.locationId}
                        onChange={(e) => setTransferForm((prev) => ({ ...prev, locationId: e.target.value }))}
                        className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                      >
                        <option value="">-- Giữ nguyên vị trí --</option>
                        {locations.map((loc) => (
                          <option key={loc.id} value={loc.id}>
                            📍 {loc.name} {loc.building ? `(${loc.building})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Công ty quản lý mới
                      </label>
                      <select
                        value={transferForm.companyName}
                        onChange={(e) => setTransferForm((prev) => ({ ...prev, companyName: e.target.value }))}
                        className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                      >
                        <option value="">-- Giữ nguyên công ty --</option>
                        {companies.map((c) => (
                          <option key={c} value={c}>
                            🏢 {c}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Lý do bàn giao */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Lý do & Ghi chú bàn giao
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Lý do bàn giao / thu hồi, ghi chú tình trạng máy, phụ kiện bàn giao..."
                      value={transferForm.notes}
                      onChange={(e) => setTransferForm((prev) => ({ ...prev, notes: e.target.value }))}
                      className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  {/* Checkbox: Tự động xuất biên bản bàn giao PDF */}
                  <div className="p-2.5 bg-blue-50/60 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-xl flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="auto-pdf-handover"
                      defaultChecked={true}
                      className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                    />
                    <label htmlFor="auto-pdf-handover" className="text-xs font-bold text-blue-950 dark:text-blue-200 cursor-pointer flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-blue-600" />
                      <span>Tự động xuất Biên bản bàn giao (PDF) sau khi lưu</span>
                    </label>
                  </div>
                </form>

                {/* History */}
                {transferHistory.length > 0 && (
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700 space-y-2">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                      <History className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Lịch sử các lần trước ({transferHistory.length}):</span>
                    </span>
                    <div className="max-h-32 overflow-y-auto space-y-1.5 pr-1">
                      {transferHistory.map((h: any) => (
                        <div key={h.id} className="p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs flex items-center justify-between">
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            👤 {h.user?.fullName} <span className="text-[10px] text-slate-400 font-normal">({h.user?.department || 'Staff'})</span>
                          </span>
                          <span className="text-[10px] font-mono text-slate-400">
                            {new Date(h.assignedAt).toLocaleDateString('vi-VN')}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Sticky Footer */}
              <div className="flex items-center justify-between px-6 py-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/60 rounded-b-3xl shrink-0">
                <button
                  type="button"
                  onClick={() => setIsTransferModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 cursor-pointer"
                >
                  Đóng (Esc)
                </button>

                <button
                  type="submit"
                  form="transfer-asset-form"
                  disabled={isSubmittingTransfer}
                  className="px-5 py-2 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                >
                  {isSubmittingTransfer ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                  <span>Lưu điều chuyển</span>
                </button>
              </div>
            </div>
          </div>
        );
      })()}


      {/* ==================== MODAL: ADD NEW ASSET (4 TABS) ==================== */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-3 sm:p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-4xl w-full flex flex-col max-h-[92vh] border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/60 shrink-0">
              <div className="space-y-0.5">
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                  <Laptop className="w-4 h-4 text-blue-600" />
                  <span>Thêm Mới Tài Sản IT</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Khai báo cấu hình, đơn vị sử dụng, chứng từ mua sắm và bản quyền phần mềm
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal 4-Tabs Navigation */}
            <div className="flex items-center gap-1 px-6 pt-2 pb-0 bg-slate-50/50 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-700 overflow-x-auto shrink-0">
              <button
                type="button"
                onClick={() => setModalActiveTab('general')}
                className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  modalActiveTab === 'general'
                    ? 'border-blue-600 text-blue-700 dark:text-blue-400 bg-white dark:bg-slate-900 rounded-t-xl shadow-2xs'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                }`}
              >
                <Tag className="w-3.5 h-3.5" />
                <span>1. Thông tin chung</span>
              </button>

              <button
                type="button"
                onClick={() => setModalActiveTab('specs')}
                className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  modalActiveTab === 'specs'
                    ? 'border-blue-600 text-blue-700 dark:text-blue-400 bg-white dark:bg-slate-900 rounded-t-xl shadow-2xs'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                }`}
              >
                <Cpu className="w-3.5 h-3.5" />
                <span>2. Cấu hình phần cứng</span>
              </button>

              <button
                type="button"
                onClick={() => setModalActiveTab('finance')}
                className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  modalActiveTab === 'finance'
                    ? 'border-blue-600 text-blue-700 dark:text-blue-400 bg-white dark:bg-slate-900 rounded-t-xl shadow-2xs'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                }`}
              >
                <DollarSign className="w-3.5 h-3.5" />
                <span>3. Tài chính & Bảo hành</span>
              </button>

              <button
                type="button"
                onClick={() => setModalActiveTab('licenses')}
                className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  modalActiveTab === 'licenses'
                    ? 'border-blue-600 text-blue-700 dark:text-blue-400 bg-white dark:bg-slate-900 rounded-t-xl shadow-2xs'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>4. Bản quyền & License</span>
                {selectedLicenseIds.length > 0 && (
                  <span className="px-1.5 py-0.2 bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 rounded-full text-[9.5px] font-extrabold">
                    {selectedLicenseIds.length}
                  </span>
                )}
              </button>
            </div>

            {/* Modal Form Content */}
            <form
              id="add-asset-form"
              onSubmit={(e) => {
                formData.specs = {
                  ...(formData.specs || {}),
                  assignedLicenseIds: selectedLicenseIds,
                  depreciationMonths: formData.depreciationMonths || 36,
                };
                handleCreateAsset(e);
              }}
              className="flex-1 overflow-y-auto p-6 space-y-4"
            >
              {/* AI Lookup Notification Banner */}
              {aiLookupStatus && (
                <div className="p-3 bg-purple-50 dark:bg-purple-950/60 border border-purple-300 dark:border-purple-800 rounded-2xl flex items-center gap-2 text-xs font-bold text-purple-900 dark:text-purple-200 animate-in fade-in zoom-in-95 duration-150">
                  <Sparkles className="w-4 h-4 text-purple-600 animate-pulse shrink-0" />
                  <span>{aiLookupStatus}</span>
                </div>
              )}

              {/* TAB 1: THÔNG TIN CHUNG */}
              {modalActiveTab === 'general' && (
                <div className="space-y-4 animate-in fade-in duration-100">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Mã Tag */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Mã Tag (Trống = Tự sinh)
                      </label>
                      <input
                        type="text"
                        placeholder="Tự tạo (VD: IT-LAP-0001)"
                        value={formData.assetTag}
                        onChange={(e) => setFormData({ ...formData, assetTag: e.target.value.toUpperCase() })}
                        className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-blue-900 dark:text-blue-300 outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                      />
                    </div>

                    {/* Tên thiết bị */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Tên thiết bị (*)
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="VD: Laptop Dell Latitude 5540..."
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    {/* Danh mục */}
                    <div>
                      <ManageableDropdown
                        label="Danh mục (*)"
                        placeholder="-- Chọn danh mục --"
                        items={categories.map((c) => ({ id: c.id, name: c.name, icon: renderCategoryIcon(c.icon, 'w-4 h-4') }))}
                        selectedValue={formData.categoryId}
                        onSelect={(id) => setFormData((prev: any) => ({ ...prev, categoryId: id }))}
                        onAdd={handleAddCategory}
                        onEdit={handleEditCategory}
                        onDelete={handleDeleteCategory}
                        allowEmpty={false}
                      />
                    </div>
                  </div>

                  {/* Brand, Model, Serial */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Thương hiệu
                      </label>
                      <input
                        type="text"
                        placeholder="Dell, HP, Lenovo, Apple..."
                        value={formData.brand}
                        onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                        className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs outline-none"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Model</label>
                        <button
                          type="button"
                          onClick={() => handleAiLookupModel(formData.model, false)}
                          disabled={aiLookupLoading || !formData.model?.trim()}
                          className="text-[10px] font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 dark:bg-purple-950 dark:text-purple-300 border border-purple-200 dark:border-purple-800 px-2 py-0.5 rounded-lg flex items-center gap-1 cursor-pointer disabled:opacity-40"
                        >
                          {aiLookupLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3 text-purple-600" />}
                          <span>AI Tra Cứu Specs</span>
                        </button>
                      </div>
                      <input
                        type="text"
                        placeholder="VD: Latitude 5540, IdeaPad Slim 3..."
                        value={formData.model}
                        onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                        className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Số Serial (SN) (*)
                      </label>
                      <input
                        type="text"
                        placeholder="SN123456789..."
                        value={formData.serialNumber}
                        onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
                        className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono outline-none"
                      />
                    </div>
                  </div>

                  {/* Section: Đơn vị & Người sử dụng */}
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl space-y-3">
                    <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wide flex items-center gap-1.5">
                      <Building2 className="w-4 h-4 text-blue-600" />
                      <span>Đơn vị & Người sử dụng</span>
                    </span>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <ManageableDropdown
                          label="Công ty quản lý (*)"
                          placeholder="-- Chọn công ty --"
                          icon={<Building2 className="w-3.5 h-3.5 text-indigo-600" />}
                          items={companies.map((c) => ({ id: c, name: c }))}
                          selectedValue={formData.companyName}
                          onSelect={(name) => setFormData((prev: any) => ({ ...prev, companyName: name }))}
                          onAdd={handleAddCompany}
                          onEdit={handleEditCompany}
                          onDelete={(id, name) => handleDeleteCompany(name)}
                          allowEmpty={true}
                          emptyLabel="-- Chưa phân công ty --"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Người đang sử dụng:
                        </label>
                        <select
                          value={formData.assignedUserId || ''}
                          onChange={(e) => setFormData({ ...formData, assignedUserId: e.target.value })}
                          className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                        >
                          <option value="">-- Trong kho IT (Chưa cấp phát) --</option>
                          {users.map((u) => (
                            <option key={u.id} value={u.id}>
                              👤 {u.fullName} {u.companyName ? `[${u.companyName}]` : ''} ({u.department || 'Staff'})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Vị trí, Trạng thái, Tình trạng */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <ManageableDropdown
                        label="Vị trí đặt"
                        placeholder="-- Chọn vị trí --"
                        icon={<MapPin className="w-3.5 h-3.5 text-blue-600" />}
                        items={locations.map((l) => ({ id: l.id, name: l.name }))}
                        selectedValue={formData.locationId}
                        onSelect={(id) => setFormData((prev: any) => ({ ...prev, locationId: id }))}
                        onAdd={handleAddLocation}
                        onEdit={handleEditLocation}
                        onDelete={handleDeleteLocation}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">{isEn ? 'Status' : 'Trạng thái'}</label>
                      <select
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                        className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold outline-none cursor-pointer"
                      >
                        <option value="AVAILABLE">🟢 AVAILABLE (Sẵn sàng)</option>
                        <option value="PENDING">🟠 PENDING (Đang chờ duyệt)</option>
                        <option value="IN_USE">🔵 IN_USE (Đang dùng)</option>
                        <option value="MAINTENANCE">🟡 MAINTENANCE (Bảo trì)</option>
                        <option value="RETIRED">⚪ RETIRED (Thanh lý)</option>
                        <option value="LOST">🔴 LOST (Mất)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Tình trạng vật lý
                      </label>
                      <select
                        value={formData.condition}
                        onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                        className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs outline-none cursor-pointer"
                      >
                        <option value="NEW">Mới 100% (New)</option>
                        <option value="GOOD">Tốt (Good)</option>
                        <option value="FAIR">Bình thường (Fair)</option>
                        <option value="POOR">Cũ / Xuống cấp (Poor)</option>
                        <option value="BROKEN">Hỏng hóc (Broken)</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: CẤU HÌNH PHẦN CỨNG */}
              {modalActiveTab === 'specs' && (
                <div className="space-y-4 animate-in fade-in duration-100">
                  <div className="p-3 bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-2xl flex items-start gap-2.5 text-xs text-blue-950 dark:text-blue-200">
                    <Cpu className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">Cấu hình phần cứng & Thông số kỹ thuật chi tiết</span>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Nhập các thông số kỹ thuật chính xác để quản lý và theo dõi cấu hình máy trạm.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* OS */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Hệ điều hành (OS)
                      </label>
                      <input
                        type="text"
                        placeholder="Windows 11 Pro, macOS Sonoma..."
                        value={formData.specs?.os || ''}
                        onChange={(e) =>
                          setFormData((prev: any) => ({
                            ...prev,
                            specs: { ...prev.specs, os: e.target.value },
                          }))
                        }
                        className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs outline-none"
                      />
                    </div>

                    {/* Hostname */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Tên máy tính (Hostname)
                      </label>
                      <input
                        type="text"
                        placeholder="DESKTOP-IT892, MACBOOK-PRO..."
                        value={formData.specs?.hostname || ''}
                        onChange={(e) =>
                          setFormData((prev: any) => ({
                            ...prev,
                            specs: { ...prev.specs, hostname: e.target.value },
                          }))
                        }
                        className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono outline-none"
                      />
                    </div>

                    {/* CPU */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Vi xử lý (CPU)
                      </label>
                      <input
                        type="text"
                        placeholder="Intel Core i7-1365U, Apple M3 Pro..."
                        value={formData.specs?.cpu || ''}
                        onChange={(e) =>
                          setFormData((prev: any) => ({
                            ...prev,
                            specs: { ...prev.specs, cpu: e.target.value },
                          }))
                        }
                        className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs outline-none"
                      />
                    </div>

                    {/* RAM */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Dung lượng RAM
                      </label>
                      <input
                        type="text"
                        placeholder="16GB DDR5 5600MHz..."
                        value={formData.specs?.ram || ''}
                        onChange={(e) =>
                          setFormData((prev: any) => ({
                            ...prev,
                            specs: { ...prev.specs, ram: e.target.value },
                          }))
                        }
                        className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs outline-none"
                      />
                    </div>

                    {/* GPU */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Card đồ họa (GPU)
                      </label>
                      <input
                        type="text"
                        placeholder="Intel Iris Xe, NVIDIA RTX 4060..."
                        value={formData.specs?.gpu || ''}
                        onChange={(e) =>
                          setFormData((prev: any) => ({
                            ...prev,
                            specs: { ...prev.specs, gpu: e.target.value },
                          }))
                        }
                        className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs outline-none"
                      />
                    </div>

                    {/* Storage */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Ổ cứng (Storage)
                      </label>
                      <input
                        type="text"
                        placeholder="512GB NVMe PCIe Gen 4..."
                        value={formData.specs?.storage || ''}
                        onChange={(e) =>
                          setFormData((prev: any) => ({
                            ...prev,
                            specs: { ...prev.specs, storage: e.target.value },
                          }))
                        }
                        className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs outline-none"
                      />
                    </div>

                    {/* IP Address */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Địa chỉ IP
                      </label>
                      <input
                        type="text"
                        placeholder="192.168.1.105"
                        value={formData.specs?.ipAddress || ''}
                        onChange={(e) =>
                          setFormData((prev: any) => ({
                            ...prev,
                            specs: { ...prev.specs, ipAddress: e.target.value },
                          }))
                        }
                        className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono outline-none"
                      />
                    </div>

                    {/* MAC Address */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Địa chỉ MAC
                      </label>
                      <input
                        type="text"
                        placeholder="A4:BB:6D:88:99:01"
                        value={formData.specs?.macAddress || ''}
                        onChange={(e) =>
                          setFormData((prev: any) => ({
                            ...prev,
                            specs: { ...prev.specs, macAddress: e.target.value },
                          }))
                        }
                        className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono outline-none"
                      />
                    </div>

                    {/* Antivirus */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Bảo mật / Antivirus
                      </label>
                      <input
                        type="text"
                        placeholder="Windows Defender, Kaspersky..."
                        value={formData.specs?.antivirus || ''}
                        onChange={(e) =>
                          setFormData((prev: any) => ({
                            ...prev,
                            specs: { ...prev.specs, antivirus: e.target.value },
                          }))
                        }
                        className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs outline-none"
                      />
                    </div>
                  </div>

                  {/* Extra Category Custom Fields if any */}
                  {(() => {
                    const definedFields = getCategoryFields(formData.categoryId);
                    if (definedFields.length === 0) return null;

                    return (
                      <div className="pt-2 border-t border-slate-200 dark:border-slate-700 space-y-2">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          Thông số mở rộng theo danh mục ({definedFields.length} trường):
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {definedFields.map((field) => {
                            const val = formData.specs?.[field.key] ?? '';
                            return (
                              <div key={field.key}>
                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                  {field.label}
                                </label>
                                <input
                                  type="text"
                                  value={val}
                                  onChange={(e) =>
                                    setFormData((prev: any) => ({
                                      ...prev,
                                      specs: { ...prev.specs, [field.key]: e.target.value },
                                    }))
                                  }
                                  className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs outline-none"
                                />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* TAB 3: TÀI CHÍNH & BẢO HÀNH */}
              {modalActiveTab === 'finance' && (
                <div className="space-y-4 animate-in fade-in duration-100">
                  {/* Hợp đồng & Hóa đơn */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                        <FileText className="w-3.5 h-3.5 text-blue-600" />
                        <span>Số Hợp Đồng (Contract No.)</span>
                      </label>
                      <input
                        type="text"
                        placeholder="VD: HĐ-2026/08/IT-DELL"
                        value={formData.contractNumber}
                        onChange={(e) => setFormData({ ...formData, contractNumber: e.target.value })}
                        className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                        <Receipt className="w-3.5 h-3.5 text-blue-600" />
                        <span>Số Hóa Đơn (Invoice No.)</span>
                      </label>
                      <input
                        type="text"
                        placeholder="VD: HD-0089421"
                        value={formData.invoiceNumber}
                        onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
                        className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono outline-none"
                      />
                    </div>
                  </div>

                  {/* Giá mua gốc + Loại tiền tệ + Tỷ giá quy đổi */}
                  <div className="p-4 bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-2xl space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-blue-950 dark:text-blue-200 uppercase tracking-wide flex items-center gap-1.5">
                        <DollarSign className="w-4 h-4 text-blue-600" />
                        <span>1. Định giá & Tiền tệ hóa đơn gốc (Ngoại tệ)</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsAddCurrencyModalOpen(true)}
                        className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Thêm đồng tiền mới</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-start">
                      {/* Giá mua hóa đơn gốc with dot separators & foreign words */}
                      <div>
                        <CurrencyInput
                          label="Giá mua hóa đơn gốc (*)"
                          value={formData.purchasePrice}
                          onChange={(val) => setFormData({ ...formData, purchasePrice: val })}
                          currency={formData.purchaseCurrency || 'VND'}
                          currencyName={currencies.find((c) => c.code === (formData.purchaseCurrency || 'VND'))?.name}
                          exchangeRate={formData.exchangeRate || exchangeRatesMap[formData.purchaseCurrency || 'VND'] || 1}
                          placeholder="VD: 1.000"
                        />
                      </div>

                      {/* Loại tiền tệ gốc */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Loại tiền tệ gốc
                        </label>
                        <select
                          value={formData.purchaseCurrency || 'VND'}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === '__ADD_NEW__') {
                              setIsAddCurrencyModalOpen(true);
                              return;
                            }
                            const found = currencies.find((c) => c.code === val);
                            setFormData({
                              ...formData,
                              purchaseCurrency: val,
                              exchangeRate: found ? found.rateToVnd : exchangeRatesMap[val] || 1,
                            });
                          }}
                          className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold outline-none cursor-pointer"
                        >
                          {currencies.map((c) => (
                            <option key={c.code} value={c.code}>
                              {c.flag} {c.code} ({c.name})
                            </option>
                          ))}
                          <option value="__ADD_NEW__" className="text-blue-600 font-bold">
                            ➕ Thêm đồng tiền khác...
                          </option>
                        </select>
                      </div>

                      {/* Tỷ giá quy đổi cơ sở */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Tỷ giá hạch toán (1 {formData.purchaseCurrency || 'VND'} = ? VNĐ)
                        </label>
                        <input
                          type="number"
                          value={formData.exchangeRate || exchangeRatesMap[formData.purchaseCurrency || 'VND'] || 1}
                          onChange={(e) => setFormData({ ...formData, exchangeRate: Number(e.target.value) })}
                          className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono font-bold outline-none"
                        />
                      </div>
                    </div>

                    {/* KHỐI 2: Ô GIÁ TIỀN QUY CHUẨN VNĐ RIÊNG & BẰNG CHỮ RÕ RÀNG */}
                    {(() => {
                      const numVal = Number(String(formData.purchasePrice).replace(/\D/g, '')) || 0;
                      const curr = formData.purchaseCurrency || 'VND';
                      const rate = formData.exchangeRate || exchangeRatesMap[curr] || 1;
                      const inVnd = curr === 'VND' ? numVal : numVal * rate;

                      return (
                        <div className="p-3.5 bg-white dark:bg-slate-800/90 rounded-2xl border border-emerald-200 dark:border-emerald-800/80 shadow-xs space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-extrabold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5 uppercase tracking-wide">
                              <span>🇻🇳 2. Giá Tiền Quy Chuẩn VNĐ (Hạch Toán Kế Toán)</span>
                            </span>
                            <span className="font-mono text-xs font-black text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-xl border border-emerald-200 dark:border-emerald-800">
                              {formatPrice(inVnd, 'VND')}
                            </span>
                          </div>

                          {inVnd > 0 && (
                            <div className="text-[11px] text-emerald-900 dark:text-emerald-200 bg-emerald-50/80 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/60 rounded-xl px-3 py-2 flex items-start gap-1.5 font-medium">
                              <span className="text-emerald-700 dark:text-emerald-400 font-bold shrink-0">
                                ✍️ Giá chuẩn VNĐ bằng chữ:
                              </span>
                              <span className="italic font-bold">{numberToVietnameseWords(inVnd)}</span>
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* AI & Rate Reference Timestamp */}
                    <div className="p-2.5 bg-blue-100/70 dark:bg-blue-950/60 rounded-xl border border-blue-200/80 dark:border-blue-800/80 text-[11px] text-blue-900 dark:text-blue-200 space-y-0.5">
                      <p className="font-bold flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                        <span>Tỷ giá tham chiếu hạch toán cập nhật: 25/08/2026 (Theo Vietcombank / Tỷ giá hạch toán)</span>
                      </p>
                      <p className="text-blue-700 dark:text-blue-300">
                        💡 Tỷ giá được cố định tại thời điểm ghi nhận hóa đơn tài sản để phục vụ đối soát tài chính chính xác.
                      </p>
                    </div>
                  </div>

                  {/* Ngày mua, Hạn bảo hành, Số tháng khấu hao */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Ngày mua hàng
                      </label>
                      <input
                        type="date"
                        value={formData.purchaseDate}
                        onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
                        className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">{isEn ? 'Warranty Expiration' : 'Hạn bảo hành'}</label>
                      <input
                        type="date"
                        value={formData.warrantyExpiry}
                        onChange={(e) => setFormData({ ...formData, warrantyExpiry: e.target.value })}
                        className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Thời gian khấu hao (Tháng)
                      </label>
                      <select
                        value={formData.depreciationMonths || 36}
                        onChange={(e) => setFormData({ ...formData, depreciationMonths: Number(e.target.value) })}
                        className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold outline-none cursor-pointer"
                      >
                        <option value={12}>12 tháng (1 năm)</option>
                        <option value={24}>24 tháng (2 năm)</option>
                        <option value={36}>36 tháng (3 năm - Mặc định)</option>
                        <option value={60}>60 tháng (5 năm)</option>
                      </select>
                    </div>
                  </div>

                  {/* Nhà cung cấp & Đường dẫn hóa đơn */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <ManageableDropdown
                        label="Nhà cung cấp"
                        placeholder="-- Chọn nhà cung cấp --"
                        icon={<Building className="w-3.5 h-3.5 text-blue-600" />}
                        items={vendors.map((v) => ({ id: v.id, name: v.name }))}
                        selectedValue={formData.vendorId}
                        onSelect={(id) => setFormData((prev: any) => ({ ...prev, vendorId: id }))}
                        onAdd={handleAddVendor}
                        onEdit={handleEditVendor}
                        onDelete={handleDeleteVendor}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Chứng từ / Hóa đơn đính kèm (URL/File)
                      </label>
                      <input
                        type="text"
                        placeholder="https://... hoặc đường dẫn file hóa đơn PDF"
                        value={formData.invoiceUrl || ''}
                        onChange={(e) => setFormData({ ...formData, invoiceUrl: e.target.value })}
                        className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs outline-none"
                      />
                    </div>
                  </div>

                  {/* Ghi chú */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Ghi chú mua hàng / Bảo hành
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Ghi chú về tình trạng mua, phụ kiện, số hotline bảo hành..."
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs outline-none"
                    />
                  </div>
                </div>
              )}

              {/* TAB 4: BẢN QUYỀN & LICENSE */}
              {modalActiveTab === 'licenses' && (
                <div className="space-y-4 animate-in fade-in duration-100">
                  <div className="p-3 bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-2xl flex items-start gap-2.5 text-xs text-blue-950 dark:text-blue-200">
                    <Layers className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">Gán bản quyền phần mềm khả dụng vào thiết bị này</span>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Tích chọn phần mềm để tự động theo dõi số seat sử dụng và quản lý chi phí bản quyền.
                      </p>
                    </div>
                  </div>

                  {licenses.length === 0 ? (
                    <div className="text-center py-10 bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-700 rounded-2xl space-y-2">
                      <Layers className="w-8 h-8 text-slate-300 mx-auto" />
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Chưa có bản quyền phần mềm nào trong hệ thống
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Bạn có thể thêm License mới tại trang Quản lý Bản quyền.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {licenses.map((lic) => {
                        const isAssigned = selectedLicenseIds.includes(lic.id);
                        return (
                          <div
                            key={lic.id}
                            onClick={() => {
                              setSelectedLicenseIds((prev) =>
                                isAssigned ? prev.filter((id) => id !== lic.id) : [...prev, lic.id]
                              );
                            }}
                            className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-start justify-between gap-3 ${
                              isAssigned
                                ? 'bg-blue-50 dark:bg-blue-950/50 border-blue-300 dark:border-blue-700 ring-2 ring-blue-200 dark:ring-blue-900'
                                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                            }`}
                          >
                            <div className="space-y-1 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-xs text-slate-900 dark:text-white">{lic.name}</span>
                                <span className="text-[10px] font-bold px-1.5 py-0.2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded">
                                  {lic.licenseType || 'PERPETUAL'}
                                </span>
                              </div>
                              <div className="text-[10.5px] text-slate-400 flex items-center gap-2">
                                <span>Seats: {lic.usedSeats || 0}/{lic.totalSeats || 1}</span>
                                {lic.expiryDate && (
                                  <span>• Hạn: {new Date(lic.expiryDate).toLocaleDateString('vi-VN')}</span>
                                )}
                              </div>
                            </div>

                            <div className={`w-5 h-5 rounded-lg flex items-center justify-center border transition-colors ${
                              isAssigned
                                ? 'bg-blue-600 text-white border-blue-600'
                                : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900'
                            }`}>
                              {isAssigned && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </form>

            {/* Modal Sticky Footer */}
            <div className="flex items-center justify-between gap-2 px-6 py-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/60 rounded-b-3xl shrink-0">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 cursor-pointer"
              >
                Hủy (Esc)
              </button>

              <button
                type="submit"
                form="add-asset-form"
                className="px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tạo & Lưu Tài Sản</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== MODAL: MAINTENANCE SPLIT-VIEW (2 COLUMNS) ==================== */}
      {isMaintenanceModalOpen && activeAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-3 sm:p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-6xl w-full flex flex-col max-h-[92vh] border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-900 text-white rounded-t-3xl shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="p-1.5 bg-amber-500 text-slate-950 rounded-xl shadow-xs shrink-0">
                  <Wrench className="w-4 h-4 font-bold" />
                </span>
                <div>
                  <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
                    <span>Nhật Ký Bảo Trì & Sửa Chữa</span>
                    <span className="font-mono text-xs bg-amber-500/20 text-amber-300 border border-amber-400/30 px-2 py-0.2 rounded-md">
                      [{activeAsset.assetTag}]
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 truncate">
                    {activeAsset.name} {activeAsset.brand ? `• ${activeAsset.brand}` : ''} {activeAsset.model ? `• ${activeAsset.model}` : ''}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsMaintenanceModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Split-View Body (2 Columns) */}
            <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column (5/12): Add Record Form */}
              <div className="lg:col-span-5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl p-4.5 space-y-3.5 flex flex-col justify-between">
                <div className="space-y-3">
                  <h4 className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-200 dark:border-slate-700 pb-2">
                    <Plus className="w-3.5 h-3.5 text-amber-600" />
                    <span>Ghi nhận lần sửa chữa / nâng cấp mới:</span>
                  </h4>

                  <form id="maintenance-form" onSubmit={handleSaveMaintenance} className="space-y-3">
                    {/* Loại hoạt động */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Loại hoạt động (*)
                      </label>
                      <select
                        value={maintenanceForm.type}
                        onChange={(e) => setMaintenanceForm({ ...maintenanceForm, type: e.target.value })}
                        className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
                      >
                        <option value="UPGRADE">🚀 Nâng cấp phần cứng (RAM/SSD)</option>
                        <option value="REPAIR">🔧 Sửa chữa, thay thế linh kiện</option>
                        <option value="CLEANING">🧼 Vệ sinh, tra keo tản nhiệt</option>
                        <option value="SOFTWARE_UPDATE">💻 Cài đặt lại HĐH / Phần mềm</option>
                        <option value="INSPECTION">🔍 Kiểm tra, đánh giá định kỳ</option>
                        <option value="OTHER">📝 Ghi chú kỹ thuật khác</option>
                      </select>
                    </div>

                    {/* Tiêu đề */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Nội dung / Tiêu đề (*)
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="VD: Thay bàn phím mới, Nâng cấp RAM 16GB..."
                        value={maintenanceForm.title}
                        onChange={(e) => setMaintenanceForm({ ...maintenanceForm, title: e.target.value })}
                        className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-amber-500 font-medium"
                      />
                    </div>

                    {/* Chi phí + Loại tiền tệ */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Chi phí thực hiện
                        </label>
                        <input
                          type="number"
                          placeholder="VD: 850000"
                          value={maintenanceForm.cost}
                          onChange={(e) => setMaintenanceForm({ ...maintenanceForm, cost: e.target.value })}
                          className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono font-bold outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Tiền tệ
                        </label>
                        <select
                          value={maintenanceForm.costCurrency || 'VND'}
                          onChange={(e) => setMaintenanceForm({ ...maintenanceForm, costCurrency: e.target.value })}
                          className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold outline-none cursor-pointer"
                        >
                          <option value="VND">🇻🇳 VND</option>
                          <option value="USD">🇺🇸 USD</option>
                          <option value="EUR">🇪🇺 EUR</option>
                        </select>
                      </div>
                    </div>

                    {/* Ngày thực hiện & Người thực hiện */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Ngày thực hiện (*)
                        </label>
                        <input
                          type="date"
                          required
                          value={maintenanceForm.performedAt}
                          onChange={(e) => setMaintenanceForm({ ...maintenanceForm, performedAt: e.target.value })}
                          className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Kỹ thuật viên
                        </label>
                        <select
                          value={maintenanceForm.performedById}
                          onChange={(e) => setMaintenanceForm({ ...maintenanceForm, performedById: e.target.value })}
                          className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs outline-none text-slate-700 dark:text-slate-300 cursor-pointer"
                        >
                          <option value="">-- IT nội bộ --</option>
                          {users.map((u) => (
                            <option key={u.id} value={u.id}>
                              👤 {u.fullName}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Chi tiết ghi chú */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Ghi chú chi tiết linh kiện / sửa chữa
                      </label>
                      <textarea
                        rows={2}
                        placeholder="Ghi chú linh kiện tháo ra, serial linh kiện mới, đơn vị sửa..."
                        value={maintenanceForm.description}
                        onChange={(e) => setMaintenanceForm({ ...maintenanceForm, description: e.target.value })}
                        className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-amber-500 font-normal"
                      />
                    </div>
                  </form>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    form="maintenance-form"
                    className="w-full py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Lưu Phiếu Bảo Trì</span>
                  </button>
                </div>
              </div>

              {/* Right Column (7/12): History Timeline List */}
              <div className="lg:col-span-7 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                    <History className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Lịch sử sửa chữa & bảo dưỡng ({maintenanceLogs.length}):</span>
                  </h4>
                  {maintenanceLogs.length > 0 && (
                    <span className="text-[11px] font-mono font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 px-2 py-0.5 rounded-lg">
                      Tổng: {formatCurrency(maintenanceLogs.reduce((sum, l) => sum + (Number(l.cost) || 0), 0))}
                    </span>
                  )}
                </div>

                {maintenanceLogs.length === 0 ? (
                  <div className="text-center py-16 bg-slate-50 dark:bg-slate-800/30 border border-dashed border-slate-200 dark:border-slate-700 rounded-2xl space-y-1.5">
                    <Wrench className="w-8 h-8 text-slate-300 mx-auto" />
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Chưa có lịch sử bảo trì nào</p>
                    <p className="text-[11px] text-slate-400">Điền form bên trái để ghi nhận đợt bảo trì đầu tiên.</p>
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
                    {maintenanceLogs.map((log) => {
                      const logTypeConfig = (() => {
                        switch (log.type) {
                          case 'UPGRADE':
                            return { label: 'Nâng cấp', badge: 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800', icon: '🚀' };
                          case 'REPAIR':
                            return { label: 'Sửa chữa', badge: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800', icon: '🔧' };
                          case 'CLEANING':
                            return { label: 'Bảo dưỡng', badge: 'bg-cyan-100 text-cyan-800 border-cyan-200 dark:bg-cyan-950 dark:text-cyan-300 dark:border-cyan-800', icon: '🧼' };
                          case 'SOFTWARE_UPDATE':
                            return { label: 'Cài phần mềm', badge: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800', icon: '💻' };
                          case 'INSPECTION':
                            return { label: 'Kiểm tra', badge: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800', icon: '🔍' };
                          default:
                            return { label: 'Ghi chú', badge: 'bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700', icon: '📝' };
                        }
                      })();

                      return (
                        <div
                          key={log.id}
                          className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xs space-y-1.5"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className={`text-[10px] font-bold px-2 py-0.2 rounded-md border flex items-center gap-1 ${logTypeConfig.badge}`}>
                                <span>{logTypeConfig.icon}</span>
                                <span>{logTypeConfig.label}</span>
                              </span>
                              <span className="font-bold text-xs text-slate-900 dark:text-white">{log.title}</span>
                            </div>

                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-mono text-slate-400">
                                📅 {new Date(log.performedAt).toLocaleDateString('vi-VN')}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleDeleteMaintenance(log.id)}
                                className="text-slate-300 hover:text-rose-600 p-0.5 rounded cursor-pointer transition-colors"
                                title="Xóa phiếu"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {log.description && (
                            <p className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/60 p-2 rounded-xl">
                              {log.description}
                            </p>
                          )}

                          <div className="flex items-center justify-between text-[10.5px] text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-700/60">
                            <span>
                              KTV: <strong className="text-slate-700 dark:text-slate-300">{log.performedBy?.fullName || 'IT'}</strong>
                            </span>
                            <span className="font-bold font-mono text-amber-700 dark:text-amber-400">
                              {log.cost ? formatPrice(Number(log.cost), log.costCurrency || 'VND') : 'Miễn phí'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Sticky Footer */}
            <div className="flex items-center justify-end px-6 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/60 rounded-b-3xl shrink-0">
              <button
                type="button"
                onClick={() => setIsMaintenanceModalOpen(false)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Đóng (Esc)
              </button>
            </div>
          </div>
        </div>
      )}

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
              {/* 0. SERVER IP / DOMAIN CONFIGURATION */}
              <div className="p-4 bg-gradient-to-r from-blue-50/90 via-indigo-50/70 to-slate-50 dark:bg-slate-800/80 border border-blue-200/90 dark:border-blue-800 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span className="font-extrabold text-xs text-slate-900 dark:text-white uppercase tracking-wide">
                      Địa Chỉ Máy Chủ / Server URL Nhận Dữ Liệu
                    </span>
                  </div>
                  <span className="text-[11px] text-blue-700 dark:text-blue-300 font-bold bg-blue-100 dark:bg-blue-900/60 px-2.5 py-0.5 rounded-full shadow-2xs">
                    ⚡ Tự động nhúng vào Script
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="relative">
                    <input
                      type="text"
                      value={agentServerUrl}
                      onChange={(e) => handleServerUrlChange(e.target.value)}
                      placeholder="Ví dụ: http://192.168.1.100:3000 hoặc https://it.company.com"
                      className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl font-mono text-xs font-bold text-blue-900 dark:text-blue-300 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-inner"
                    />
                  </div>

                  {/* Quick Preset Buttons */}
                  <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                    <span className="text-[10.5px] text-slate-500 font-medium">Gợi ý chọn nhanh:</span>
                    <button
                      type="button"
                      onClick={() => handleServerUrlChange('http://localhost:3000')}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                        agentServerUrl === 'http://localhost:3000'
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                          : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      💻 Localhost (127.0.0.1:3000)
                    </button>

                    {typeof window !== 'undefined' && window.location.origin !== 'http://localhost:3000' && (
                      <button
                        type="button"
                        onClick={() => handleServerUrlChange(window.location.origin)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                          agentServerUrl === window.location.origin
                            ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                            : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        🌐 IP Máy Chủ Đang Truy Cập ({window.location.host})
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        const host = typeof window !== 'undefined' && window.location.hostname !== 'localhost' ? window.location.hostname : '192.168.1.100';
                        handleServerUrlChange(`http://${host}:3000`);
                      }}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 cursor-pointer"
                    >
                      📶 Mạng Nội Bộ (LAN IP:3000)
                    </button>
                  </div>
                </div>
              </div>

              {/* 1-liner Quick Copy with Dynamic Server URL */}
              {(() => {
                const cleanServerUrl = (agentServerUrl || 'http://localhost:3000').replace(/\/+$/, '');
                const oneLiner = `powershell -ExecutionPolicy Bypass -Command "iex (irm '${cleanServerUrl}/api/scripts/agent')"` ;
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
                const handleDownloadDynamicBat = () => {
                  const batContent = `@echo off\r\n:: SIMPLY IT Auto-Scan Runner\r\n:: Server: ${cleanServerUrl}\r\npowershell -ExecutionPolicy Bypass -WindowStyle Hidden -Command "iex (irm '${cleanServerUrl}/api/scripts/agent')"\r\n`;
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
    </div>
  );
}
