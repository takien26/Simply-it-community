'use client';
import {
  LicenseDetailModal,
  LicenseAssignModal,
  LicenseFormModal,
  CrossCompanyMatrix,
  LicenseIntegrationModal,
  ZombieLicensesModal,
} from '@/components/licenses';
import { LicenseGroup, groupLicenses } from '@/components/licenses/types';
import { exportConglomerateExcel, exportSingleLicenseExcel } from '@/components/licenses/license-excel-export';


import { QuickLink } from '@/components/common/QuickLink';
import Link from 'next/link';
import { useLanguage } from '@/lib/i18n/context';
import { DocumentQuickPreviewModal } from '@/components/documents/document-quick-preview-modal';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { fetchWithSwr, invalidateClientCache, useAutoRefresh, triggerDataRefresh } from '@/lib/client-cache';
import { showTrashUndoToast } from '@/components/common/TrashUndoToast';
import { getStoredBaseCurrency, getStoredCurrencies, convertCurrencyAmount } from '@/lib/currency-store';
import {
  Eye,
  Crown,
  Copy,
  Plus,
  Search,
  Key,
  Cloud,
  ArrowRightLeft,
  Trash2,
  Edit2,
  AlertTriangle,
  CheckCircle,
  Clock,
  X,
  Loader2,
  Building2,
  Save,
  FileSpreadsheet,
  User,
  Laptop,
  UserPlus,
  RotateCcw,
  Check,
  ShieldCheck,
  Tag,
  FileText,
  Receipt,
  Filter,
  ChevronDown,
  Layers,
  Calendar,
  DollarSign,
  PackagePlus,
  Package,
  ChevronRight,
  Zap,
  MoreVertical,
  ExternalLink,
  Users,
  CheckCircle2,
  Download,
  FolderOpen,
  Link as LinkIcon,
  Unlink,
} from 'lucide-react';
import { formatCurrency, formatDate, getRemainingTimeText, numberToVietnameseWords, numberToForeignCurrencyWords } from '@/lib/utils';
import CurrencyInput from '@/components/ui/currency-input';

// ==================== CONFIG & DUAL-CURRENCY ====================
export interface CurrencyConfig {
  code: string;
  name: string;
  symbol: string;
  rateToVnd: number;
  flag: string;
}

export interface PaymentRecord {
  id: string;
  paymentDate: string;
  amount: number;
  originalAmount?: number;
  currency?: string;
  exchangeRate?: number;
  period: string;
  periodStartDate?: string;
  periodEndDate?: string;
  invoiceNumber?: string;
  contractNumber?: string;
  status: 'PAID' | 'PENDING';
  notes?: string;
  createdAt?: string;
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

export default function LicensesPage() {
    const { language, t } = useLanguage();
  const isEn = language === 'en';
  // Master Data
  const [licenses, setLicenses] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [companies, setCompanies] = useState<string[]>([
    'Công ty Cổ phần Tập đoàn ABC',
    'Công ty TNHH MTV Công Nghệ ABC',
    'Chi nhánh Miền Bắc (Hà Nội)',
    'Chi nhánh Miền Nam (TP.HCM)',
  ]);
  const [loading, setLoading] = useState(true);
  const [activeMainTab, setActiveMainTab] = useState<'LIST' | 'MATRIX'>('LIST');
  const [isIntegrationModalOpen, setIsIntegrationModalOpen] = useState(false);

  // Dynamic Currencies & Exchange Rates
  const [currencies, setCurrencies] = useState<CurrencyConfig[]>(DEFAULT_CURRENCIES);
  const [isAddCurrencyModalOpen, setIsAddCurrencyModalOpen] = useState(false);
  const [newCurrencyCode, setNewCurrencyCode] = useState('');
  const [newCurrencyName, setNewCurrencyName] = useState('');
  const [newCurrencyRate, setNewCurrencyRate] = useState('');
  const [newCurrencySymbol, setNewCurrencySymbol] = useState('');
  const [newCurrencyFlag, setNewCurrencyFlag] = useState('🌐');

  // Quick Payment / Renewal Modal State for Non-Perpetual Licenses
  const [isAddPaymentModalOpen, setIsAddPaymentModalOpen] = useState(false);
  const [paymentForm, setPaymentForm] = useState<{
    paymentDate: string;
    amount: string;
    currency: string;
    exchangeRate: number;
    period: string;
    periodStartDate: string;
    periodEndDate: string;
    invoiceNumber: string;
    contractNumber: string;
    status: 'PAID' | 'PENDING';
    notes: string;
  }>({
    paymentDate: new Date().toISOString().split('T')[0],
    amount: '',
    currency: 'VND',
    exchangeRate: 1,
    period: '',
    periodStartDate: '',
    periodEndDate: '',
    invoiceNumber: '',
    contractNumber: '',
    status: 'PAID',
    notes: '',
  });

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

  // Base Currency Preferences (Synced with Settings)
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

  // Filters & Search
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedCompany, setSelectedCompany] = useState('');
  const [selectedVendor, setSelectedVendor] = useState('');
  const [selectedExpiryFilter, setSelectedExpiryFilter] = useState<'ALL' | 'VALID' | 'EXPIRING' | 'EXPIRED'>('ALL');
  const [showWastefulOnly, setShowWastefulOnly] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  // Active Dropdown Action Menu
  const [activeDropdownLicenseId, setActiveDropdownLicenseId] = useState<string | null>(null);

  // Batch Selection & Merge Groups
  const [selectedGroupIds, setSelectedGroupIds] = useState<Set<string>>(new Set());
  const [isMergeModalOpen, setIsMergeModalOpen] = useState(false);
  const [mergeMasterId, setMergeMasterId] = useState<string>('');
  const [isMerging, setIsMerging] = useState(false);

  const handleToggleSelectAll = () => {
    if (selectedGroupIds.size === paginatedGroups.length) {
      setSelectedGroupIds(new Set());
    } else {
      setSelectedGroupIds(new Set(paginatedGroups.map((g) => g.id)));
    }
  };

  const handleUnlinkBatch = async (batchId: string, batchName: string) => {
    if (!confirm(`Bạn có chắc chắn muốn tách "${batchName}" thành một gói bản quyền độc lập riêng biệt?`)) return;
    try {
      const res = await fetch(`/api/licenses/${batchId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parentLicenseId: null }),
      });
      if (res.ok) {
        invalidateClientCache('/api/licenses');
        triggerDataRefresh('licenses');
        await loadData(true);
      } else {
        const err = await res.json();
        alert(err.error || 'Tách gói thất bại');
      }
    } catch {
      alert('Lỗi kết nối khi tách gói bản quyền');
    }
  };

  const handleConfirmBatchMerge = async () => {
    if (!mergeMasterId) return;
    setIsMerging(true);
    try {
      const memberIds = Array.from(selectedGroupIds);
      const res = await fetch('/api/licenses/batch-merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetMasterId: mergeMasterId,
          memberLicenseIds: memberIds,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setIsMergeModalOpen(false);
        setSelectedGroupIds(new Set());
        setExpandedGroupIds((prev) => new Set([...prev, mergeMasterId]));
        invalidateClientCache('/api/licenses');
        triggerDataRefresh('licenses');
        await loadData(true);
      } else {
        const err = await res.json();
        alert(err.error || 'Gom nhóm thất bại');
      }
    } catch {
      alert('Lỗi kết nối khi gom nhóm bản quyền');
    } finally {
      setIsMerging(false);
    }
  };

  // Active Sub-table Tab: 'companies' | 'batches'
  const [subTableTabs, setSubTableTabs] = useState<Record<string, 'companies' | 'batches'>>({});
  const setGroupSubTab = (groupId: string, tab: 'companies' | 'batches') => {
    setSubTableTabs((prev) => ({ ...prev, [groupId]: tab }));
  };

  // Quick Rename Batch Name (Tùy chỉnh tên đợt mua ví dụ theo ngày)
  const handleRenameBatch = async (batchId: string, currentName: string) => {
    const newName = window.prompt(
      'Nhập tên / ký hiệu mới cho đợt mua này (ví dụ: Đợt mua ngày 15/08/2025, Gói bổ sung Q3...):',
      currentName
    );
    if (newName === null) return;
    const trimmed = newName.trim();
    try {
      const res = await fetch(`/api/licenses/${batchId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batchName: trimmed || null }),
      });
      if (res.ok) {
        invalidateClientCache('/api/licenses');
        triggerDataRefresh('licenses');
        await loadData(true);
      } else {
        alert('Đổi tên đợt mua thất bại');
      }
    } catch {
      alert('Lỗi kết nối khi đổi tên đợt mua');
    }
  };

  // Company Assignees Modal
  const [isCompanyAssigneesOpen, setIsCompanyAssigneesOpen] = useState(false);
  const [viewingCompanyStat, setViewingCompanyStat] = useState<{ group: LicenseGroup; companyStat: any } | null>(null);

  const handleOpenAddBatchForCompany = (group: LicenseGroup, targetCompany: string) => {
    const master = group.masterLicense;
    const nextBatchNum = group.batches.length + 1;
    const todayFormatted = new Date().toLocaleDateString('vi-VN');
    setFormData({
      batchName: `Đợt ${nextBatchNum} - Ngày ${todayFormatted}`,

      name: group.name,
      licenseKey: '',
      licenseType: group.licenseType || 'SUBSCRIPTION',
      totalSeats: 10,
      purchaseDate: new Date().toISOString().split('T')[0],
      expiryDate: master.expiryDate ? new Date(master.expiryDate).toISOString().split('T')[0] : '',
      purchasePrice: '',
      purchaseCurrency: master.purchaseCurrency || selectedCurrency,
      exchangeRate: exchangeRatesMap[master.purchaseCurrency || selectedCurrency] || 1,
      companyName: targetCompany || group.companyName || companies[0] || '',
      vendorId: master.vendorId || '',
      contractNumber: '',
      invoiceNumber: '',
      contractUrl: '',
      notes: `Mua bổ sung Đợt ${nextBatchNum} cho ${targetCompany}`,
      pairs: [],
      parentLicenseId: group.id,
    });
    setIsAddModalOpen(true);
  };

  // Multi-batch Expandable Groups
  const [expandedGroupIds, setExpandedGroupIds] = useState<Set<string>>(new Set());
  const toggleGroupExpand = (groupId: string) => {
    setExpandedGroupIds((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  };

  // Modals & Sheets
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingLicenseId, setEditingLicenseId] = useState<string | null>(null);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [activeLicense, setActiveLicense] = useState<any>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedDetailLicense, setSelectedDetailLicense] = useState<any>(null);
  const [isDocPreviewOpen, setIsDocPreviewOpen] = useState(false);

  // Auto-open Detail Modal if URL contains ?id=... or ?licenseId=...
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const targetId = params.get('id') || params.get('licenseId');
    if (!targetId) return;

    if (licenses.length > 0) {
      const found = licenses.find(
        (l: any) => l.id === targetId || l.name?.toLowerCase() === targetId.toLowerCase()
      );
      if (found) {
        setSelectedDetailLicense(found);
        setIsDetailModalOpen(true);
        return;
      }
    }

    fetch(`/api/licenses/${encodeURIComponent(targetId)}`)
      .then((r) => r.json())
      .then((res) => {
        const item = res.data || res.license;
        if (item) {
          setSelectedDetailLicense(item);
          setIsDetailModalOpen(true);
        }
      })
      .catch(() => {});
  }, [licenses]);

  const [isPricingModalOpen, setIsPricingModalOpen] = useState(false);

  // 4-Tab Modal State
  const [modalActiveTab, setModalActiveTab] = useState<'general' | 'finance' | 'settings' | 'assignees'>('general');
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);

  // Context Menu State for Right-Click on rows
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    group: LicenseGroup;
  } | null>(null);

  // Close context menu on window click, escape or scroll
  useEffect(() => {
    const handleCloseContextMenu = () => setContextMenu(null);
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setContextMenu(null);
    };
    window.addEventListener('click', handleCloseContextMenu);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', handleCloseContextMenu, true);
    return () => {
      window.removeEventListener('click', handleCloseContextMenu);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', handleCloseContextMenu, true);
    };
  }, []);

  // Helper to count unique assigned seats
  const calculateAssignedSeats = (pairs: Array<{ userId?: string; assetId?: string }>): number => {
    if (!Array.isArray(pairs) || pairs.length === 0) return 0;
    const valid = pairs.filter((p) => Boolean((p.userId && p.userId.trim() !== '') || (p.assetId && p.assetId.trim() !== '')));
    const seen = new Set<string>();
    let count = 0;
    for (const p of valid) {
      const u = p.userId ? p.userId.trim() : '';
      const a = p.assetId ? p.assetId.trim() : '';
      const key = `${u}_${a}`;
      if (!seen.has(key)) {
        seen.add(key);
        count++;
      }
    }
    return count;
  };

  // Add Form State
  const [formData, setFormData] = useState<any>({
    name: '',
    licenseKey: '',
    licenseType: 'PERPETUAL',
    totalSeats: 1,
    purchaseDate: '',
    expiryDate: '',
    purchasePrice: '',
    purchaseCurrency: 'VND',
    exchangeRate: 1,
    companyName: '',
    vendorId: '',
    contractNumber: '',
    invoiceNumber: '',
    contractUrl: '',
    notes: '',
    pairs: [],
  });

  // Edit Form State
  const [editFormData, setEditFormData] = useState<any>({
    name: '',
    licenseKey: '',
    licenseType: 'PERPETUAL',
    totalSeats: 1,
    purchaseDate: '',
    expiryDate: '',
    purchasePrice: '',
    purchaseCurrency: 'VND',
    exchangeRate: 1,
    companyName: '',
    vendorId: '',
    contractNumber: '',
    invoiceNumber: '',
    contractUrl: '',
    notes: '',
    pairs: [],
  });

  // Assignment Split-View State
  const [assignUserId, setAssignUserId] = useState('');
  const [assignAssetId, setAssignAssetId] = useState('');
  const [assignAssetSearch, setAssignAssetSearch] = useState('');
  const [assignUserSearch, setAssignUserSearch] = useState('');
  const [assignNotes, setAssignNotes] = useState('');
  const [isSubmittingAssign, setIsSubmittingAssign] = useState(false);
  const [revokingAssignmentId, setRevokingAssignmentId] = useState<string | null>(null);
  const [isReclaimingAllWaste, setIsReclaimingAllWaste] = useState(false);
  const [isWasteModalOpen, setIsWasteModalOpen] = useState(false);

  // Helper kiểm tra ghế lãng phí: Nhân viên nghỉ việc hoặc Thiết bị hỏng/bảo trì/thanh lý
  const isAssignmentWasteful = useCallback((a: any) => {
    if (!a || a.revokedAt) return false;
    if (a.user && a.user.isActive === false) return true;
    if (a.asset && ['MAINTENANCE', 'RETIRED', 'LOST'].includes(a.asset.status)) return true;
    return false;
  }, []);

  // Thu hồi nhanh toàn bộ ghế lãng phí
  const handleReclaimAllWaste = async () => {
    const confirmMsg = language === 'en'
      ? `Are you sure you want to reclaim all wasted seats from resigned employees or decommissioned/maintenance devices?`
      : `Bạn có chắc chắn muốn thu hồi toàn bộ ghế bản quyền cấp cho nhân viên đã nghỉ việc hoặc thiết bị ngừng sử dụng/đang sửa chữa không?`;

    if (!confirm(confirmMsg)) return;

    setIsReclaimingAllWaste(true);
    try {
      const res = await fetch('/api/licenses/reclaim-waste', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert(
          language === 'en'
            ? `✅ Successfully reclaimed ${data.reclaimedCount} license seats!`
            : `✅ Đã thu hồi thành công ${data.reclaimedCount} ghế bản quyền!`
        );
        invalidateClientCache('/api/licenses');
        triggerDataRefresh('licenses');
        await loadData(true);
      } else {
        alert(data.error || 'Thu hồi thất bại');
      }
    } catch {
      alert('Lỗi kết nối khi thu hồi');
    } finally {
      setIsReclaimingAllWaste(false);
    }
  };

  // Upgrade Form State
  const [upgradeForm, setUpgradeForm] = useState({
    fullName: '',
    phone: '',
    submitted: false,
  });

  // Close modals on ESC
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setIsAddModalOpen(false);
        setIsEditModalOpen(false);
        setIsAssignModalOpen(false);
        setIsDetailModalOpen(false);
        setIsPricingModalOpen(false);
        setIsAddCurrencyModalOpen(false);
        setActiveDropdownLicenseId(null);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close dropdown menu on click outside
  useEffect(() => {
    function handleClickOutside() {
      setActiveDropdownLicenseId(null);
    }
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  const isMasterLoadedRef = useRef(false);

  // Load Data
  const loadData = useCallback(async (forceFresh = false) => {
    try {
      if (forceFresh) {
        invalidateClientCache('/api/licenses');
      }
      await Promise.all([
        // 1. Fetch Licenses with SWR Cache (0ms instant render)
        fetchWithSwr<any>('/api/licenses?pageSize=300', (licRes) => {
          if (licRes && (licRes.success || licRes.data || licRes.licenses)) {
            const list = licRes.data || licRes.licenses || [];
            setLicenses(list);
            setLoading(false);

            setActiveLicense((prev: any) => {
              if (!prev) return null;
              return list.find((l: any) => l.id === prev.id) || prev;
            });

            setSelectedDetailLicense((prev: any) => {
              if (!prev) return null;
              return list.find((l: any) => l.id === prev.id) || prev;
            });
          }
        }, 30000, forceFresh),

        // 2. Fetch Assets with SWR Cache
        fetchWithSwr<any>('/api/assets?pageSize=300', (assetRes) => {
          if (assetRes && (assetRes.success || assetRes.data)) {
            setAssets(assetRes.data || assetRes.assets || []);
          }
        }, 30000, forceFresh),

        // 3. Fetch Master Data with SWR Cache
        fetchWithSwr<any>('/api/master-data', (masterRes) => {
          if (masterRes?.data) {
            const md = masterRes.data;
            if (md.vendors) setVendors(md.vendors);
            if (md.users) setUsers(md.users);
            if (md.companies) setCompanies(md.companies);
          }
        }, 60000, forceFresh),
      ]);
    } catch (error) {
      console.error('Failed to load license data:', error);
      setLoading(false);
    }
  }, []);

  // Connect Professional Auto-Refresh & Instant Reactive Sync
  const { isRefreshing: isAutoRefreshing, refreshNow } = useAutoRefresh({
    onRefresh: loadData,
    scope: 'licenses',
  });

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ==================== KPI METRICS CALCULATION ====================
  const kpis = useMemo(() => {
    const totalCount = licenses.length;
    let totalSeats = 0;
    let usedSeats = 0;
    let totalCostVnd = 0;
    let expiringCount = 0;
    let expiredCount = 0;
    let inactiveSeatsCount = 0;
    let inactivePotentialSavings = 0;

    const now = new Date();
    const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const seenWasteAssignmentIds = new Set<string>();

    licenses.forEach((lic) => {
      totalSeats += lic.totalSeats || 1;
      usedSeats += lic.usedSeats || lic.assignments?.filter((a: any) => !a.revokedAt)?.length || 0;

      const rawPrice = Number(lic.purchasePrice) || 0;
      const cur = lic.purchaseCurrency || 'VND';
      const recordedRate = Number((lic as any).exchangeRate || (lic as any).specs?.exchangeRate);
      const effectiveRate = recordedRate && recordedRate > 0 ? recordedRate : (exchangeRatesMap[cur] || 1);
      const inVnd = rawPrice * effectiveRate;
      totalCostVnd += inVnd;

      const licSeats = lic.totalSeats || 1;
      const costPerSeatVnd = licSeats > 0 ? inVnd / licSeats : 0;

      // Count inactive in direct assignments
      (lic.assignments || []).forEach((a: any) => {
        if (isAssignmentWasteful(a) && a.id && !seenWasteAssignmentIds.has(a.id)) {
          seenWasteAssignmentIds.add(a.id);
          inactiveSeatsCount++;
          inactivePotentialSavings += costPerSeatVnd;
        }
      });

      // Count inactive in child batches
      (lic.batches || []).forEach((b: any) => {
        const bSeats = b.totalSeats || 1;
        const bPrice = Number(b.purchasePrice) || 0;
        const bCur = b.purchaseCurrency || cur;
        const bRate = b.exchangeRate || exchangeRatesMap[bCur] || 1;
        const bCostPerSeat = bSeats > 0 ? (bPrice * bRate) / bSeats : costPerSeatVnd;

        (b.assignments || []).forEach((ba: any) => {
          if (isAssignmentWasteful(ba) && ba.id && !seenWasteAssignmentIds.has(ba.id)) {
            seenWasteAssignmentIds.add(ba.id);
            inactiveSeatsCount++;
            inactivePotentialSavings += bCostPerSeat;
          }
        });
      });

      if (lic.expiryDate) {
        const exp = new Date(lic.expiryDate);
        if (exp < now) {
          expiredCount++;
        } else if (exp <= thirtyDaysLater) {
          expiringCount++;
        }
      }
    });

    const targetRate = exchangeRatesMap[selectedCurrency] || 1;
    const totalCostInSelected = totalCostVnd / targetRate;
    const availableSeats = Math.max(0, totalSeats - usedSeats);

    return {
      totalCount,
      totalSeats,
      usedSeats,
      availableSeats,
      totalCost: totalCostInSelected,
      expiringCount,
      expiredCount,
      inactiveSeatsCount,
      inactivePotentialSavings,
    };
  }, [licenses, selectedCurrency, exchangeRatesMap, isAssignmentWasteful]);

  // ==================== WASTEFUL / ZOMBIE SEATS LIST ====================
  const wastefulSeatsList = useMemo(() => {
    const list: Array<{
      assignmentId: string;
      licenseId: string;
      licenseName: string;
      licenseKey?: string;
      licenseType?: string;
      licenseRef: any;
      assignedAt?: string | Date;
      user?: any;
      asset?: any;
      wasteReason: string;
      wasteReasonBadge?: string;
      costPerSeatVnd: number;
    }> = [];
    const seenAssignmentIds = new Set<string>();

    licenses.forEach((lic) => {
      const rawPrice = Number(lic.purchasePrice) || 0;
      const cur = lic.purchaseCurrency || 'VND';
      const recordedRate = Number((lic as any).exchangeRate || (lic as any).specs?.exchangeRate);
      const effectiveRate = recordedRate && recordedRate > 0 ? recordedRate : (exchangeRatesMap[cur] || 1);
      const inVnd = rawPrice * effectiveRate;
      const licSeats = lic.totalSeats || 1;
      const costPerSeatVnd = licSeats > 0 ? inVnd / licSeats : 0;

      // Direct assignments
      (lic.assignments || []).forEach((a: any) => {
        if (isAssignmentWasteful(a) && a.id && !seenAssignmentIds.has(a.id)) {
          seenAssignmentIds.add(a.id);
          let reason = '';
          let badge = 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border-rose-300';
          if (a.user && a.user.isActive === false) {
            reason = language === 'en'
              ? 'Employee resigned / Account deactivated'
              : 'Nhân sự đã thôi việc / Khóa tài khoản';
            badge = 'bg-rose-100 text-rose-700 dark:bg-rose-950/70 dark:text-rose-300 border border-rose-200 dark:border-rose-800';
          } else if (a.asset && ['MAINTENANCE', 'RETIRED', 'LOST'].includes(a.asset.status)) {
            const st = a.asset.status;
            reason = language === 'en'
              ? `Device status: ${st}`
              : (st === 'MAINTENANCE' ? 'Thiết bị đang bảo dưỡng/sửa chữa' : st === 'RETIRED' ? 'Thiết bị đã thanh lý/hủy' : 'Thiết bị thất lạc/mất');
            badge = st === 'MAINTENANCE'
              ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
              : 'bg-rose-100 text-rose-700 dark:bg-rose-950/70 dark:text-rose-300 border border-rose-200 dark:border-rose-800';
          }

          list.push({
            assignmentId: a.id,
            licenseId: lic.id,
            licenseName: lic.name,
            licenseKey: lic.licenseKey,
            licenseType: lic.licenseType || lic.type,
            licenseRef: lic,
            assignedAt: a.assignedAt,
            user: a.user,
            asset: a.asset,
            wasteReason: reason,
            wasteReasonBadge: badge,
            costPerSeatVnd,
          });
        }
      });

      // Child batch assignments
      (lic.batches || []).forEach((b: any) => {
        const bSeats = b.totalSeats || 1;
        const bPrice = Number(b.purchasePrice) || 0;
        const bCur = b.purchaseCurrency || cur;
        const bRate = b.exchangeRate || exchangeRatesMap[bCur] || 1;
        const bCostPerSeat = bSeats > 0 ? (bPrice * bRate) / bSeats : costPerSeatVnd;

        (b.assignments || []).forEach((ba: any) => {
          if (isAssignmentWasteful(ba) && ba.id && !seenAssignmentIds.has(ba.id)) {
            seenAssignmentIds.add(ba.id);
            let reason = '';
            let badge = 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border-rose-300';
            if (ba.user && ba.user.isActive === false) {
              reason = language === 'en'
                ? 'Employee resigned / Account deactivated'
                : 'Nhân sự đã thôi việc / Khóa tài khoản';
              badge = 'bg-rose-100 text-rose-700 dark:bg-rose-950/70 dark:text-rose-300 border border-rose-200 dark:border-rose-800';
            } else if (ba.asset && ['MAINTENANCE', 'RETIRED', 'LOST'].includes(ba.asset.status)) {
              const st = ba.asset.status;
              reason = language === 'en'
                ? `Device status: ${st}`
                : (st === 'MAINTENANCE' ? 'Thiết bị đang bảo dưỡng/sửa chữa' : st === 'RETIRED' ? 'Thiết bị đã thanh lý/hủy' : 'Thiết bị thất lạc/mất');
              badge = st === 'MAINTENANCE'
                ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                : 'bg-rose-100 text-rose-700 dark:bg-rose-950/70 dark:text-rose-300 border border-rose-200 dark:border-rose-800';
            }

            list.push({
              assignmentId: ba.id,
              licenseId: lic.id,
              licenseName: `${lic.name} (Lô ${b.batchNumber || b.id.slice(0, 6)})`,
              licenseKey: b.licenseKey || lic.licenseKey,
              licenseType: lic.licenseType || lic.type,
              licenseRef: lic,
              assignedAt: ba.assignedAt,
              user: ba.user,
              asset: ba.asset,
              wasteReason: reason,
              wasteReasonBadge: badge,
              costPerSeatVnd: bCostPerSeat,
            });
          }
        });
      });
    });

    return list;
  }, [licenses, language, exchangeRatesMap, isAssignmentWasteful]);

  // ==================== FILTERED LICENSES ====================
  const filteredLicenses = useMemo(() => {
    const now = new Date();
    const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 1000);

    return licenses.filter((lic) => {
      // Inactive / Zombie Wasteful Filter
      if (showWastefulOnly) {
        const hasDirectWaste = (lic.assignments || []).some((a: any) => isAssignmentWasteful(a));
        const hasBatchWaste = (lic.batches || []).some((b: any) =>
          (b.assignments || []).some((ba: any) => isAssignmentWasteful(ba))
        );
        if (!hasDirectWaste && !hasBatchWaste) return false;
      }

      // Search (Master + Batches + Assigned Staff/Computers + Contracts/Invoices)
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const matchSelf =
          lic.name?.toLowerCase().includes(q) ||
          lic.licenseKey?.toLowerCase().includes(q) ||
          lic.vendor?.name?.toLowerCase().includes(q) ||
          lic.companyName?.toLowerCase().includes(q) ||
          lic.contractNumber?.toLowerCase().includes(q) ||
          lic.invoiceNumber?.toLowerCase().includes(q) ||
          lic.notes?.toLowerCase().includes(q);

        if (!matchSelf) {
          // Check child batches
          const matchBatch = Array.isArray(lic.batches) && lic.batches.some((b: any) =>
            b.name?.toLowerCase().includes(q) ||
            b.specs?.batchName?.toLowerCase().includes(q) ||
            b.specs?.batchLabel?.toLowerCase().includes(q) ||
            b.contractNumber?.toLowerCase().includes(q) ||
            b.invoiceNumber?.toLowerCase().includes(q) ||
            b.companyName?.toLowerCase().includes(q) ||
            b.vendor?.name?.toLowerCase().includes(q) ||
            b.notes?.toLowerCase().includes(q) ||
            (Array.isArray(b.assignments) && b.assignments.some((a: any) =>
              a.user?.fullName?.toLowerCase().includes(q) ||
              a.user?.email?.toLowerCase().includes(q) ||
              a.user?.department?.toLowerCase().includes(q) ||
              a.user?.companyName?.toLowerCase().includes(q) ||
              a.asset?.assetTag?.toLowerCase().includes(q) ||
              a.asset?.name?.toLowerCase().includes(q)
            ))
          );

          // Check direct assignments
          const matchAssignment = Array.isArray(lic.assignments) && lic.assignments.some((a: any) =>
            a.user?.fullName?.toLowerCase().includes(q) ||
            a.user?.email?.toLowerCase().includes(q) ||
            a.user?.department?.toLowerCase().includes(q) ||
            a.user?.companyName?.toLowerCase().includes(q) ||
            a.asset?.assetTag?.toLowerCase().includes(q) ||
            a.asset?.name?.toLowerCase().includes(q)
          );

          if (!matchBatch && !matchAssignment) return false;
        }
      }

      // Type Filter
      if (selectedType && lic.licenseType !== selectedType) return false;

      // Status Filter
      if (selectedStatus && lic.status !== selectedStatus) return false;

      // Company Filter (Smart Conglomerate Filter: matches if company bought batch OR has users using it)
      if (selectedCompany) {
        const matchesSelf = lic.companyName === selectedCompany;
        const matchesBatch = lic.batches?.some((b: any) => b.companyName === selectedCompany);
        const matchesUser = lic.assignments?.some(
          (a: any) => a.user?.companyName === selectedCompany || a.asset?.companyName === selectedCompany
        );
        if (!matchesSelf && !matchesBatch && !matchesUser) return false;
      }

      // Vendor Filter
      if (selectedVendor && lic.vendorId !== selectedVendor) return false;

      // Expiry Filter
      if (selectedExpiryFilter !== 'ALL') {
        if (!lic.expiryDate) {
          if (selectedExpiryFilter !== 'VALID') return false;
        } else {
          const exp = new Date(lic.expiryDate);
          if (selectedExpiryFilter === 'EXPIRED' && exp >= now) return false;
          if (selectedExpiryFilter === 'EXPIRING' && (exp < now || exp > thirtyDaysLater)) return false;
          if (selectedExpiryFilter === 'VALID' && exp < now) return false;
        }
      }

      return true;
    });
  }, [licenses, search, selectedType, selectedStatus, selectedCompany, selectedVendor, selectedExpiryFilter, showWastefulOnly]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedType, selectedStatus, selectedCompany, selectedVendor, selectedExpiryFilter, showWastefulOnly]);

  // Multi-batch Intelligent Grouping
  const groupedLicenses = useMemo(() => {
    return groupLicenses(filteredLicenses, convertCurrency, selectedCurrency);
  }, [filteredLicenses, convertCurrency, selectedCurrency]);

  // List of active companies across conglomerate for Quick Filter Chips (SAM Conglomerate Edition)
  const conglomerateCompanies = useMemo(() => {
    const map = new Map<string, number>();
    licenses.forEach((lic) => {
      const related = new Set<string>();
      if (lic.companyName) related.add(lic.companyName.trim());
      if (Array.isArray(lic.batches)) {
        lic.batches.forEach((b: any) => {
          if (b.companyName) related.add(b.companyName.trim());
        });
      }
      if (Array.isArray(lic.assignments)) {
        lic.assignments.forEach((a: any) => {
          if (a.user?.companyName) related.add(a.user.companyName.trim());
          if (a.asset?.companyName) related.add(a.asset.companyName.trim());
        });
      }
      related.forEach((c) => {
        map.set(c, (map.get(c) || 0) + 1);
      });
    });

    companies.forEach((c) => {
      if (c && !map.has(c.trim())) {
        map.set(c.trim(), 0);
      }
    });

    return Array.from(map.entries())
      .filter(([name]) => Boolean(name))
      .sort((a, b) => b[1] - a[1]);
  }, [licenses, companies]);

  const totalFilteredLicenses = groupedLicenses.length;
  const totalPages = Math.max(1, Math.ceil(totalFilteredLicenses / pageSize));
  const paginatedGroups = useMemo(() => {
    return groupedLicenses.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  }, [groupedLicenses, currentPage, pageSize]);

  // ==================== ACTION HANDLERS ====================
  const handleCopyKey = (key: string, id: string) => {
    if (!key) return;
    navigator.clipboard.writeText(key);
    setCopiedKeyId(id);
    setTimeout(() => setCopiedKeyId(null), 2000);
  };

  const handleOpenAdd = () => {
    setFormData({
      name: '',
      licenseKey: '',
      licenseType: 'PERPETUAL',
      totalSeats: 1,
      purchaseDate: new Date().toISOString().split('T')[0],
      expiryDate: '',
      purchasePrice: '',
      purchaseCurrency: selectedCurrency,
      exchangeRate: exchangeRatesMap[selectedCurrency] || 1,
      companyName: companies[0] || '',
      vendorId: '',
      contractNumber: '',
      invoiceNumber: '',
      contractUrl: '',
      notes: '',
      pairs: [],
    });
    setModalActiveTab('general');
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (lic: any) => {
    setEditingLicenseId(lic.id);
    const cur = lic.purchaseCurrency || 'VND';
    const savedRate = (lic as any).exchangeRate || (lic as any).specs?.exchangeRate || exchangeRatesMap[cur] || 1;
    const initialPairs = (lic.assignments || [])
      .filter((a: any) => !a.revokedAt)
      .map((a: any) => ({
        id: a.id,
        userId: a.userId || a.user?.id || '',
        assetId: a.assetId || a.asset?.id || '',
        assignedAt: a.assignedAt ? new Date(a.assignedAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        notes: a.notes || '',
      }));

    setEditFormData({
      name: lic.name || '',
      batchName: (lic as any).specs?.batchName || (lic as any).specs?.batchLabel || '',
      licenseKey: lic.licenseKey || '',
      licenseType: lic.licenseType || 'PERPETUAL',
      totalSeats: lic.totalSeats || 1,
      purchaseDate: lic.purchaseDate ? new Date(lic.purchaseDate).toISOString().split('T')[0] : '',
      expiryDate: lic.expiryDate ? new Date(lic.expiryDate).toISOString().split('T')[0] : '',
      purchasePrice: lic.purchasePrice ? String(lic.purchasePrice) : '',
      purchaseCurrency: cur,
      exchangeRate: savedRate,
      companyName: lic.companyName || '',
      vendorId: lic.vendorId || lic.vendor?.id || '',
      contractNumber: lic.contractNumber || '',
      invoiceNumber: lic.invoiceNumber || '',
      contractUrl: lic.contractUrl || '',
      notes: lic.notes || '',
      pairs: initialPairs,
    });
    setModalActiveTab('general');
    setIsEditModalOpen(true);
  };

  const handleOpenAddBatch = (group: LicenseGroup) => {
    const master = group.masterLicense;
    const nextBatchNum = group.batches.length + 1;
    const todayFormatted = new Date().toLocaleDateString('vi-VN');
    setFormData({
      batchName: `Đợt ${nextBatchNum} - Ngày ${todayFormatted}`,

      name: group.name,
      licenseKey: '',
      licenseType: group.licenseType || 'SUBSCRIPTION',
      totalSeats: 10,
      purchaseDate: new Date().toISOString().split('T')[0],
      expiryDate: master.expiryDate ? new Date(master.expiryDate).toISOString().split('T')[0] : '',
      purchasePrice: '',
      purchaseCurrency: master.purchaseCurrency || selectedCurrency,
      exchangeRate: exchangeRatesMap[master.purchaseCurrency || selectedCurrency] || 1,
      companyName: group.companyName || companies[0] || '',
      vendorId: master.vendorId || '',
      contractNumber: '',
      invoiceNumber: '',
      contractUrl: '',
      notes: `Mua bổ sung Đợt ${nextBatchNum} cho gói ${group.name}`,
      pairs: [],
      parentLicenseId: group.id,
    });
    setIsAddModalOpen(true);
  };

  const handleOpenAssign = (lic: any) => {
    setActiveLicense(lic);
    setAssignUserId('');
    setAssignAssetId('');
    setAssignAssetSearch('');
    setAssignUserSearch('');
    setAssignNotes('');
    setIsAssignModalOpen(true);
  };

  // Submit Add
  const handleSaveAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let initialPaymentHistory: PaymentRecord[] = [];
      const priceNum = Number(formData.purchasePrice) || 0;
      if (priceNum > 0 || formData.purchaseDate) {
        const cur = (formData.purchaseCurrency || 'VND').toUpperCase();
        const rate = formData.exchangeRate || exchangeRatesMap[cur] || 1;
        const inVnd = cur === 'VND' ? priceNum : priceNum * rate;
        const pDate = formData.purchaseDate ? new Date(formData.purchaseDate).toLocaleDateString('vi-VN') : '';
        const eDate = formData.expiryDate ? new Date(formData.expiryDate).toLocaleDateString('vi-VN') : '';

        initialPaymentHistory = [
          {
            id: `pay_initial_${Date.now()}`,
            paymentDate: formData.purchaseDate || new Date().toISOString().split('T')[0],
            amount: inVnd,
            originalAmount: priceNum,
            currency: cur,
            exchangeRate: rate,
            period: `Đợt 1: Thanh toán mua mới ban đầu${eDate ? ` (Hạn dùng: ${eDate})` : ''}`,
            periodStartDate: formData.purchaseDate || undefined,
            periodEndDate: formData.expiryDate || undefined,
            invoiceNumber: formData.invoiceNumber || undefined,
            contractNumber: formData.contractNumber || undefined,
            status: 'PAID',
            notes: 'Tự động ghi nhận Đợt 1 khi mua bản quyền',
            createdAt: new Date().toISOString(),
          },
        ];
      }

      const res = await fetch('/api/licenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          purchaseCurrency: formData.purchaseCurrency || 'VND',
          exchangeRate: formData.exchangeRate || exchangeRatesMap[formData.purchaseCurrency || 'VND'] || 1,
          totalSeats: Number(formData.totalSeats) || 1,
          purchasePrice: formData.purchasePrice ? Number(formData.purchasePrice) : null,
          purchaseDate: formData.purchaseDate ? new Date(formData.purchaseDate).toISOString() : null,
          expiryDate: formData.expiryDate ? new Date(formData.expiryDate).toISOString() : null,
          batchName: formData.batchName || undefined,
          pairs: formData.pairs || [],
          specs: {
            paymentHistory: initialPaymentHistory,
            batchName: formData.batchName || undefined,
          },
        }),
      });

      if (res.ok) {
        setIsAddModalOpen(false);
        invalidateClientCache('/api/licenses');
        triggerDataRefresh('licenses');
        await loadData(true);
      } else {
        const err = await res.json();
        alert(err.error || 'Thêm bản quyền thất bại');
      }
    } catch {
      alert('Lỗi kết nối khi lưu bản quyền');
    }
  };

  // Submit Edit
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLicenseId) return;

    try {
      const res = await fetch(`/api/licenses/${editingLicenseId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...editFormData,
          batchName: editFormData.batchName !== undefined ? editFormData.batchName : undefined,
          purchaseCurrency: editFormData.purchaseCurrency || 'VND',
          exchangeRate: editFormData.exchangeRate || exchangeRatesMap[editFormData.purchaseCurrency || 'VND'] || 1,
          totalSeats: Number(editFormData.totalSeats) || 1,
          purchasePrice: editFormData.purchasePrice ? Number(editFormData.purchasePrice) : null,
          purchaseDate: editFormData.purchaseDate ? new Date(editFormData.purchaseDate).toISOString() : null,
          expiryDate: editFormData.expiryDate ? new Date(editFormData.expiryDate).toISOString() : null,
          pairs: editFormData.pairs || [],
        }),
      });

      if (res.ok) {
        setIsEditModalOpen(false);
        invalidateClientCache('/api/licenses');
        triggerDataRefresh('licenses');
        await loadData(true);
      } else {
        const err = await res.json();
        alert(err.error || 'Cập nhật bản quyền thất bại');
      }
    } catch {
      alert('Lỗi kết nối khi cập nhật');
    }
  };

  // Submit Assign Seat
  const handleAssignSeat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeLicense) return;
    if (!assignUserId && !assignAssetId) {
      alert('Vui lòng chọn ít nhất 1 Nhân sự hoặc 1 Thiết bị để cấp phát seat!');
      return;
    }

    setIsSubmittingAssign(true);
    try {
      const res = await fetch(`/api/licenses/${activeLicense.id}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: assignUserId || null,
          assetId: assignAssetId || null,
          notes: assignNotes,
        }),
      });

      if (res.ok) {
        setAssignUserId('');
        setAssignAssetId('');
        setAssignNotes('');
        invalidateClientCache('/api/licenses');
        triggerDataRefresh('licenses');
        await loadData(true);
      } else {
        const err = await res.json();
        alert(err.error || 'Cấp phát license thất bại');
      }
    } catch {
      alert('Lỗi kết nối khi cấp phát');
    } finally {
      setIsSubmittingAssign(false);
    }
  };

  // Revoke Seat
  const handleRevokeSeat = async (assignmentId: string) => {
    if (!activeLicense || !assignmentId) return;
    if (!confirm('Bạn có chắc chắn muốn thu hồi bản quyền của người dùng/thiết bị này?')) return;

    setRevokingAssignmentId(assignmentId);
    try {
      const res = await fetch(`/api/licenses/${activeLicense.id}/revoke`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignmentId }),
      });

      if (res.ok) {
        invalidateClientCache('/api/licenses');
        triggerDataRefresh('licenses');
        await loadData(true);
      } else {
        const err = await res.json();
        alert(err.error || 'Thu hồi thất bại');
      }
    } catch {
      alert('Lỗi kết nối khi thu hồi');
    } finally {
      setRevokingAssignmentId(null);
    }
  };

  // Delete License
  const handleDeleteLicense = async (id: string, name: string) => {
    if (!confirm(`Bạn có chắc chắn muốn chuyển bản quyền "${name}" vào Thùng rác? (Có thể khôi phục trong 30 ngày)`)) return;

    // 0ms Optimistic removal
    setLicenses((prev) => prev.filter((l) => l.id !== id));
    if (selectedDetailLicense?.id === id) setSelectedDetailLicense(null);
    if (activeLicense?.id === id) setActiveLicense(null);
    if (editingLicenseId === id) setIsEditModalOpen(false);

    try {
      const res = await fetch(`/api/licenses/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        invalidateClientCache('/api/licenses');
        invalidateClientCache('/api/trash');
        triggerDataRefresh('licenses');
        triggerDataRefresh('trash');

        // Show Instant Undo Toast
        showTrashUndoToast({
          name: name || 'Bản quyền',
          trashItemId: data?.trashItemId,
          onUndo: async () => {
            loadData(true);
          },
        });

        await loadData(true);
      } else {
        alert(data.error || 'Xóa bản quyền thất bại');
        await loadData(true);
      }
    } catch {
      alert('Lỗi kết nối khi xóa');
      await loadData(true);
    }
  };

  // Helper: Retrieve effective payment history, auto-generating Batch 1 if missing
  const getEffectiveLicensePayments = (lic: any): PaymentRecord[] => {
    if (Array.isArray(lic?.specs?.paymentHistory) && lic.specs.paymentHistory.length > 0) {
      return lic.specs.paymentHistory;
    }
    // Fallback: Generate Initial Batch 1 from license's base data
    const rawPrice = Number(lic?.purchasePrice) || 0;
    if (rawPrice <= 0 && !lic?.purchaseDate) return [];

    const cur = (lic?.purchaseCurrency || 'VND').toUpperCase();
    const rate = lic?.exchangeRate || exchangeRatesMap[cur] || 1;
    const inVnd = cur === 'VND' ? rawPrice : rawPrice * rate;
    const pDate = lic?.purchaseDate ? new Date(lic.purchaseDate).toLocaleDateString('vi-VN') : 'Ban đầu';
    const eDate = lic?.expiryDate ? new Date(lic.expiryDate).toLocaleDateString('vi-VN') : '';

    return [
      {
        id: `pay_initial_${lic?.id}`,
        paymentDate: lic?.purchaseDate ? new Date(lic.purchaseDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        amount: inVnd,
        originalAmount: rawPrice,
        currency: cur,
        exchangeRate: rate,
        period: `Đợt 1: Thanh toán mua mới ban đầu${eDate ? ` (Hạn dùng: ${eDate})` : ''}`,
        periodStartDate: lic?.purchaseDate ? new Date(lic.purchaseDate).toISOString().split('T')[0] : undefined,
        periodEndDate: lic?.expiryDate ? new Date(lic.expiryDate).toISOString().split('T')[0] : undefined,
        invoiceNumber: lic?.invoiceNumber || undefined,
        contractNumber: lic?.contractNumber || undefined,
        status: 'PAID',
        notes: 'Tự động ghi nhận Đợt 1 khi mua bản quyền',
        createdAt: lic?.createdAt || new Date().toISOString(),
      },
    ];
  };

  // Quick Renew License (Auto calculates new expiry and records payment as Đợt 2, Đợt 3...)
  const handleQuickRenew = async (lic: any, monthsToAdd: number) => {
    const baseDate = lic.expiryDate ? new Date(lic.expiryDate) : new Date();
    const newExpiry = new Date(baseDate);
    newExpiry.setMonth(newExpiry.getMonth() + monthsToAdd);

    const rawPrice = Number(lic.purchasePrice) || 0;
    const cur = (lic.purchaseCurrency || 'VND').toUpperCase();
    const rate = exchangeRatesMap[cur] || 1;
    const inVnd = cur === 'VND' ? rawPrice : rawPrice * rate;

    const fromDateStr = baseDate.toISOString().split('T')[0];
    const toDateStr = newExpiry.toISOString().split('T')[0];

    const currentHistory = getEffectiveLicensePayments(lic);
    const nextBatchNumber = currentHistory.length + 1;

    const newRecord: PaymentRecord = {
      id: `pay_${Date.now()}`,
      paymentDate: new Date().toISOString().split('T')[0],
      amount: inVnd,
      originalAmount: rawPrice,
      currency: cur,
      exchangeRate: rate,
      period: `Đợt ${nextBatchNumber}: Gia hạn thêm ${monthsToAdd} tháng (Hạn dùng mới: ${newExpiry.toLocaleDateString('vi-VN')})`,
      periodStartDate: fromDateStr,
      periodEndDate: toDateStr,
      status: 'PAID',
      notes: `Tự động ghi nhận Đợt ${nextBatchNumber} khi gia hạn thêm ${monthsToAdd} tháng`,
      createdAt: new Date().toISOString(),
    };

    try {
      const res = await fetch(`/api/licenses/${lic.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expiryDate: toDateStr,
          status: 'ACTIVE',
          specs: {
            ...(lic.specs || {}),
            paymentHistory: [newRecord, ...currentHistory],
          },
        }),
      });

      if (res.ok) {
        const updated = await res.json();
        setSelectedDetailLicense(updated.data);
        loadData();
      } else {
        alert('Gia hạn bản quyền thất bại');
      }
    } catch {
      alert('Lỗi kết nối khi gia hạn bản quyền');
    }
  };

  // Add / Save New Payment Record to License
  const handleSavePaymentRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDetailLicense) return;

    const rawAmount = parseFloat(String(paymentForm.amount).replace(/[^0-9.-]+/g, '')) || 0;
    if (rawAmount <= 0) {
      alert('Vui lòng nhập số tiền thanh toán hợp lệ (> 0)');
      return;
    }

    const cur = (paymentForm.currency || 'VND').toUpperCase();
    const rate = paymentForm.exchangeRate || exchangeRatesMap[cur] || 1;
    const inVnd = cur === 'VND' ? rawAmount : rawAmount * rate;

    const currentHistory = getEffectiveLicensePayments(selectedDetailLicense);
    const nextBatchNumber = currentHistory.length + 1;

    let periodStr = paymentForm.period.trim();
    if (paymentForm.periodStartDate && paymentForm.periodEndDate) {
      const s = new Date(paymentForm.periodStartDate).toLocaleDateString('vi-VN');
      const end = new Date(paymentForm.periodEndDate).toLocaleDateString('vi-VN');
      if (!periodStr) {
        periodStr = `Đợt ${nextBatchNumber}: Kỳ từ ${s} đến ${end}`;
      }
    } else if (!periodStr) {
      periodStr = `Đợt ${nextBatchNumber}: Kỳ gia hạn bản quyền`;
    }

    const newRecord: PaymentRecord = {
      id: `pay_${Date.now()}`,
      paymentDate: paymentForm.paymentDate || new Date().toISOString().split('T')[0],
      amount: inVnd,
      originalAmount: rawAmount,
      currency: cur,
      exchangeRate: rate,
      period: periodStr,
      periodStartDate: paymentForm.periodStartDate || undefined,
      periodEndDate: paymentForm.periodEndDate || undefined,
      invoiceNumber: paymentForm.invoiceNumber || undefined,
      contractNumber: paymentForm.contractNumber || undefined,
      status: paymentForm.status,
      notes: paymentForm.notes || undefined,
      createdAt: new Date().toISOString(),
    };

    const updatedHistory = [newRecord, ...currentHistory];

    try {
      const res = await fetch(`/api/licenses/${selectedDetailLicense.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expiryDate: paymentForm.periodEndDate || selectedDetailLicense.expiryDate,
          status: 'ACTIVE',
          specs: {
            ...(selectedDetailLicense.specs || {}),
            paymentHistory: updatedHistory,
          },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setSelectedDetailLicense(data.data);
        setIsAddPaymentModalOpen(false);
        setPaymentForm({
          paymentDate: new Date().toISOString().split('T')[0],
          amount: '',
          currency: 'VND',
          exchangeRate: 1,
          period: '',
          periodStartDate: '',
          periodEndDate: '',
          invoiceNumber: '',
          contractNumber: '',
          status: 'PAID',
          notes: '',
        });
        invalidateClientCache('/api/licenses');
        triggerDataRefresh('licenses');
        await loadData(true);
      } else {
        alert('Lưu lịch sử thanh toán thất bại');
      }
    } catch {
      alert('Lỗi kết nối khi lưu lịch sử thanh toán');
    }
  };

  // Delete Payment Record from License
  const handleDeletePaymentRecord = async (licenseId: string, payId: string) => {
    if (!selectedDetailLicense || !confirm('Bạn có chắc chắn muốn xóa đợt thanh toán này khỏi lịch sử?')) return;

    const currentHistory = getEffectiveLicensePayments(selectedDetailLicense);
    const updatedHistory = currentHistory.filter((p) => p.id !== payId);

    try {
      const res = await fetch(`/api/licenses/${licenseId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          specs: {
            ...(selectedDetailLicense.specs || {}),
            paymentHistory: updatedHistory,
          },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setSelectedDetailLicense(data.data);
        invalidateClientCache('/api/licenses');
        triggerDataRefresh('licenses');
        await loadData(true);
      }
    } catch {
      alert('Lỗi kết nối');
    }
  };

  // Export conglomerate license matrix to multi-sheet Excel (ServiceNow SAM Pro / Flexera One standard)
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const handleExportExcel = async () => {
    if (groupedLicenses.length === 0) {
      alert(language === 'en' ? 'No licenses to export' : 'Không có bản quyền nào trong danh sách lọc để xuất');
      return;
    }
    setIsExportingExcel(true);
    try {
      await exportConglomerateExcel({
        groupedLicenses,
        selectedCompany,
        selectedCurrency,
        companiesList: conglomerateCompanies.map(([cName]) => cName),
      });
    } catch (err) {
      console.error('Export Excel error:', err);
      alert(language === 'en' ? 'Excel export failed' : 'Xuất file Excel thất bại');
    } finally {
      setIsExportingExcel(false);
    }
  };

  // Export single software package matrix & assigned users
  const handleExportSingleLicense = async (group: LicenseGroup) => {
    try {
      await exportSingleLicenseExcel(group, selectedCurrency);
    } catch (err) {
      console.error('Export Single License Excel error:', err);
      alert(language === 'en' ? 'Excel export failed for this license' : 'Xuất file Excel cho gói này thất bại');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-3 sm:p-6 space-y-5 transition-colors">
      {/* ==================== 1. TOP HEADER & ACTION BAR ==================== */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="p-2 bg-gradient-to-br from-purple-600 to-indigo-600 text-white rounded-2xl shadow-md">
              <Key className="w-5 h-5" />
            </span>
            <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {t('licenses.title', 'Quản Lý Bản Quyền Phần Mềm & License')}
            </h1>
            <span className="px-2.5 py-0.5 bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 rounded-full text-xs font-bold font-mono">
              {filteredLicenses.length} License
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {t('licenses.subtitle', 'Theo dõi phân bổ Seats, cảnh báo gia hạn hợp đồng và định giá chi phí đa tiền tệ.')}
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">


          <button
            type="button"
            disabled={isExportingExcel}
            onClick={handleExportExcel}
            className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-2xl text-xs font-bold border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 cursor-pointer transition-all disabled:opacity-60"
            title="Xuất Báo cáo Ma trận Cân đối 3 Sheet chuẩn SAM quốc tế"
          >
            {isExportingExcel ? (
              <Loader2 className="w-4 h-4 text-purple-600 animate-spin" />
            ) : (
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            )}
            <span className="hidden sm:inline font-extrabold">
              {isExportingExcel
                ? 'Đang xuất...'
                : selectedCompany
                ? `Xuất Excel (${selectedCompany})`
                : 'Xuất Ma Trận Excel'}
            </span>
          </button>


          <button
            type="button"
            onClick={() => setIsIntegrationModalOpen(true)}
            className="px-3.5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-2xl text-xs font-bold shadow-md shadow-blue-500/20 flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
            title="Kết nối Microsoft 365, Google Workspace, Adobe CC qua Cloud API để đối soát và phát hiện license lãng phí"
          >
            <Cloud className="w-4 h-4" />
            <span className="hidden sm:inline font-extrabold">Tích Hợp Cloud M365</span>
          </button>

          <button
            type="button"
            onClick={handleOpenAdd}
            className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-2xl text-xs font-bold shadow-md shadow-purple-600/20 flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>{t('licenses.add_btn', 'Thêm Bản Quyền')}</span>
          </button>
        </div>
      </div>

      {/* ==================== VIEW SWITCHER: DANH SÁCH VS MA TRẬN BÙ TRỪ ==================== */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-100 dark:bg-slate-800/60 rounded-2xl w-fit border border-slate-200 dark:border-slate-700">
        <button
          type="button"
          onClick={() => setActiveMainTab('LIST')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeMainTab === 'LIST'
              ? 'bg-white dark:bg-slate-900 text-purple-700 dark:text-purple-300 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>{language === 'en' ? 'Licenses & Batches' : 'Danh Sách Bản Quyền & Đợt Mua'}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveMainTab('MATRIX')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeMainTab === 'MATRIX'
              ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <ArrowRightLeft className="w-3.5 h-3.5" />
          <span>{language === 'en' ? 'Cross-Company Chargeback Matrix' : 'Ma Trận Bù Trừ Đa Công Ty (Tập Đoàn)'}</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-extrabold">
            Mới
          </span>
        </button>
      </div>

      {activeMainTab === 'MATRIX' ? (
        <CrossCompanyMatrix
          licenses={licenses}
          users={users}
          companies={companies}
          selectedCurrency={selectedCurrency}
          isEn={language === 'en'}
        />
      ) : (
        <>
          {/* ==================== INACTIVE / ZOMBIE LICENSES DETECTION ALERT ==================== */}
          {kpis.inactiveSeatsCount > 0 && (
            <div
              onClick={() => setIsWasteModalOpen(true)}
              className="p-4 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-rose-500/10 border border-amber-300 dark:border-amber-700/80 hover:border-amber-400 dark:hover:border-amber-600 rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs cursor-pointer group transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-bold shadow-xs shrink-0 group-hover:scale-105 transition-transform">
                  <AlertTriangle className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-amber-950 dark:text-amber-200 flex items-center gap-2 flex-wrap">
                    <span>{language === 'en' ? 'Inactive / Zombie Licenses Detected' : 'Phát Hiện Bản Quyền Lãng Phí (Zombie Licenses)'}</span>
                    <span className="px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 text-[10px] font-black">
                      {kpis.inactiveSeatsCount} {language === 'en' ? 'seats' : 'ghế'}
                    </span>
                    <span className="text-[11px] font-medium text-amber-700/80 dark:text-amber-400 hidden md:inline">
                      {language === 'en' ? '(Click to view list ↗)' : '(Bấm để xem danh sách chi tiết ↗)'}
                    </span>
                  </h4>
                  <p className="text-[11.5px] text-amber-800 dark:text-amber-300 mt-0.5">
                    {language === 'en'
                      ? `There are ${kpis.inactiveSeatsCount} software seats currently assigned to deactivated staff or decommissioned/maintenance devices. Potential cost savings: `
                      : `Đang có ${kpis.inactiveSeatsCount} ghế bản quyền cấp cho nhân sự thôi việc hoặc thiết bị ngừng sử dụng/đang sửa chữa. Tiết kiệm tiềm năng: `}
                    <strong className="text-rose-600 dark:text-rose-400 font-mono font-bold">
                      {formatPrice(kpis.inactivePotentialSavings / (exchangeRatesMap[selectedCurrency] || 1), selectedCurrency)}
                    </strong>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 flex-wrap" onClick={(e) => e.stopPropagation()}>
                {/* Nút Xem chi tiết: mở modal liệt kê từng ghế lãng phí */}
                <button
                  type="button"
                  onClick={() => setIsWasteModalOpen(true)}
                  className="px-3.5 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs bg-amber-500 hover:bg-amber-600 text-white"
                  title={language === 'en' ? 'View details of all wasted seats' : 'Xem chi tiết danh sách từng ghế lãng phí'}
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>{language === 'en' ? `View Details (${kpis.inactiveSeatsCount})` : `👁️ Xem chi tiết (${kpis.inactiveSeatsCount} ghế)`}</span>
                </button>

                <button
                  type="button"
                  disabled={isReclaimingAllWaste}
                  onClick={handleReclaimAllWaste}
                  className="px-3.5 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs bg-rose-600 hover:bg-rose-700 text-white disabled:opacity-60"
                  title={language === 'en' ? 'Reclaim all wasted seats at once' : 'Thu hồi toàn bộ ghế lãng phí trong 1 chạm'}
                >
                  {isReclaimingAllWaste ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                  <span>{language === 'en' ? `Reclaim All` : `⚡ Thu hồi tất cả`}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowWastefulOnly(!showWastefulOnly)}
                  className={`px-3.5 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs ${
                    showWastefulOnly
                      ? 'bg-slate-900 hover:bg-slate-800 text-white'
                      : 'bg-white dark:bg-slate-900 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700 hover:bg-amber-50'
                  }`}
                >
                  <span>{showWastefulOnly ? (language === 'en' ? 'Show All Licenses' : 'Hiển thị tất cả') : (language === 'en' ? 'Filter Wasteful Only' : '🔍 Lọc bản quyền lãng phí')}</span>
                </button>
              </div>
            </div>
          )}

          {/* ==================== 2. TOP KPI BAR ĐA TIỀN TỆ ==================== */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* KPI 1: Tổng số License & Seats */}
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xs flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              {language === 'en' ? 'Total Licenses & Seats' : 'Tổng Bản Quyền & Seats'}
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-mono">
                {kpis.totalCount}
              </span>
              <span className="text-xs font-semibold text-slate-500">
                ({kpis.usedSeats}/{kpis.totalSeats} seats)
              </span>
            </div>
            <div className="w-28 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mt-1">
              <div
                className="h-full bg-purple-600 rounded-full"
                style={{ width: `${kpis.totalSeats > 0 ? (kpis.usedSeats / kpis.totalSeats) * 100 : 0}%` }}
              />
            </div>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-300 border border-purple-200 dark:border-purple-800 flex items-center justify-center font-bold">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        {/* KPI 2: Tổng Chi Phí Bản Quyền (Đa Tiền Tệ) */}
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xs flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider block">{language === 'en' ? 'Total Cost' : 'Tổng Chi Phí'} ({selectedCurrency})</span>
            <span className="text-xl sm:text-2xl font-black text-blue-700 dark:text-blue-300 font-mono">
              {formatPrice(kpis.totalCost, selectedCurrency)}
            </span>
            <span className="text-[10.5px] text-slate-400 block">
              {language === 'en' ? 'Converted at market rate' : 'Đã quy đổi theo tỷ giá niêm yết'}
            </span>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-300 border border-blue-200 dark:border-blue-800 flex items-center justify-center font-bold">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        {/* KPI 3: Cảnh Báo Hết Hạn 30 Ngày */}
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xs flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider block">{language === 'en' ? 'Expiring / Expired' : 'Sắp Hết Hạn / Quá Hạn'}</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-300 font-mono">
                {kpis.expiringCount}
              </span>
              <span className="text-xs font-bold text-rose-600 dark:text-rose-400">
                ({kpis.expiredCount} {language === 'en' ? 'expired' : 'đã hết'})
              </span>
            </div>
            <span className="text-[10.5px] text-slate-400 block">
              {language === 'en' ? 'Contract renewal needed' : 'Cần liên hệ gia hạn hợp đồng'}
            </span>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-300 border border-amber-200 dark:border-amber-800 flex items-center justify-center font-bold">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        {/* KPI 4: Seats Còn Khả Dụng */}
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xs flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">{language === 'en' ? 'Available Seats' : 'Seats Còn Trống'}</span>
            <span className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-300 font-mono">
              {kpis.availableSeats}
            </span>
            <span className="text-[10.5px] text-slate-400 block">
              {language === 'en' ? 'Ready for assignment' : 'Sẵn sàng cấp phát cho nhân sự'}
            </span>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center font-bold">
            <CheckCircle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* ==================== 3. BỘ LỌC MICROCOPY TINH GỌN ==================== */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5">
          {/* Ô Tìm Kiếm Nhanh */}
          <div className="lg:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              placeholder={language === 'en' ? '🔍 Search software, key, staff, device, contract, batch...' : '🔍 Tìm phần mềm, nhân sự, máy tính, đợt mua, HĐ, hóa đơn...'}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-7 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-semibold text-slate-800 dark:text-white placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-purple-500"
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

          {/* Công ty (Chuẩn tương đồng với Tài sản) */}
          <div>
            <select
              value={selectedCompany}
              onChange={(e) => setSelectedCompany(e.target.value)}
              className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer truncate"
            >
              <option value="">{language === 'en' ? '🏢 Company (All)' : '🏢 Công ty (Tất cả)'}</option>
              {companies.map((c) => (
                <option key={c} value={c}>
                  🏢 {c}
                </option>
              ))}
            </select>
          </div>

          {/* Loại */}
          <div>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer truncate"
            >
              <option value="">{language === 'en' ? '-- Type: All --' : '-- Loại: Tất cả --'}</option>
              <option value="PERPETUAL">{language === 'en' ? 'Perpetual' : 'Vĩnh viễn (Perpetual)'}</option>
              <option value="SUBSCRIPTION">{language === 'en' ? 'Subscription' : 'Thuê bao (Subscription)'}</option>
              <option value="OEM">{language === 'en' ? 'OEM (Pre-installed)' : 'OEM đi kèm máy'}</option>
              <option value="TRIAL">{language === 'en' ? 'Trial' : 'Dùng thử (Trial)'}</option>
              <option value="OPEN_SOURCE">{language === 'en' ? 'Open Source' : 'Mã nguồn mở'}</option>
            </select>
          </div>

          {/* Nhà Cung Cấp */}
          <div>
            <select
              value={selectedVendor}
              onChange={(e) => setSelectedVendor(e.target.value)}
              className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer truncate"
            >
              <option value="">{language === 'en' ? '-- Vendor: All --' : '-- NCC: Tất cả --'}</option>
              {vendors.map((v) => (
                <option key={v.id} value={v.id}>
                  🤝 {v.name}
                </option>
              ))}
            </select>
          </div>

          {/* Hạn Dùng */}
          <div>
            <select
              value={selectedExpiryFilter}
              onChange={(e) => setSelectedExpiryFilter(e.target.value as any)}
              className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer truncate"
            >
              <option value="ALL">{language === 'en' ? '-- Expiry: All --' : '-- Hạn: Tất cả --'}</option>
              <option value="VALID">{language === 'en' ? '🟢 Active / Valid' : '🟢 Còn hạn sử dụng'}</option>
              <option value="EXPIRING">{language === 'en' ? '🟡 Expiring Soon (< 30d)' : '🟡 Sắp hết hạn (30 ngày)'}</option>
              <option value="EXPIRED">{language === 'en' ? '🔴 Expired' : '🔴 Đã hết hạn'}</option>
            </select>
          </div>
        </div>

        {(search || selectedType || selectedCompany || selectedVendor || (selectedExpiryFilter && selectedExpiryFilter !== 'ALL')) && (
          <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
            <span className="text-[11px] font-bold text-slate-400">
              {isEn
                ? `Filtering: ${[selectedCompany && `🏢 ${selectedCompany}`, search && `"${search}"`, selectedType, selectedVendor && 'Vendor'].filter(Boolean).join(' • ')}`
                : `Đang lọc: ${[selectedCompany && `🏢 ${selectedCompany}`, search && `"${search}"`, selectedType, selectedVendor && 'NCC'].filter(Boolean).join(' • ')}`}
            </span>
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setSelectedType('');
                setSelectedCompany('');
                setSelectedVendor('');
                setSelectedExpiryFilter('ALL');
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>{language === 'en' ? 'Reset Filters' : 'Xóa bộ lọc'}</span>
            </button>
          </div>
        )}
      </div>

      {/* ==================== 4. BẢNG DỮ LIỆU DUAL-CURRENCY ==================== */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse min-w-[900px]">
            <thead className="bg-slate-50/90 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-700 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="py-2 px-2.5 sticky left-0 z-20 bg-slate-50 dark:bg-slate-800 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.06)] min-w-[175px]">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={paginatedGroups.length > 0 && selectedGroupIds.size === paginatedGroups.length}
                      onChange={handleToggleSelectAll}
                      className="rounded border-slate-300 dark:border-slate-700 text-purple-600 focus:ring-purple-500 cursor-pointer"
                      title="Chọn tất cả các gói trên trang này"
                    />
                    <span>{language === 'en' ? 'LICENSE NAME & KEY' : 'TÊN BẢN QUYỀN & KEY'}</span>
                  </div>
                </th>
                <th className="py-2 px-2.5 min-w-[140px]">{language === 'en' ? 'TYPE & COMPANY' : 'LOẠI & CÔNG TY'}</th>
                <th className="py-2 px-2.5 min-w-[210px]">{language === 'en' ? 'SEATS ALLOCATION' : 'PHÂN BỐ SEATS'}</th>
                <th className="py-2 px-2 min-w-[95px]">{language === 'en' ? 'COST' : 'ĐỊNH GIÁ'} ({selectedCurrency})</th>
                <th className="py-2 px-2 min-w-[90px]">{language === 'en' ? 'EXPIRY' : 'HẠN DÙNG'}</th>
                <th className="py-2 px-2 min-w-[120px] max-w-[200px]">{language === 'en' ? 'VENDOR' : 'NHÀ CUNG CẤP'}</th>
                <th className="py-2 px-1 text-center sticky right-0 z-20 bg-slate-50 dark:bg-slate-800 shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.06)] w-[55px]">{language === 'en' ? 'ACTIONS' : 'THAO TÁC'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading && licenses.length === 0 ? (
                // Shimmering Skeleton Loader
                Array.from({ length: 5 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="py-2.5 px-2.5">
                      <div className="h-3.5 w-32 bg-slate-200 dark:bg-slate-800 rounded-md mb-1" />
                      <div className="h-2.5 w-20 bg-slate-100 dark:bg-slate-800/60 rounded-md" />
                    </td>
                    <td className="py-2.5 px-2">
                      <div className="h-3.5 w-20 bg-slate-200 dark:bg-slate-800 rounded-md mb-1" />
                      <div className="h-2.5 w-24 bg-slate-100 dark:bg-slate-800/60 rounded-md" />
                    </td>
                    <td className="py-2.5 px-2">
                      <div className="h-3.5 w-16 bg-slate-200 dark:bg-slate-800 rounded-md mb-1" />
                      <div className="h-2 w-20 bg-slate-100 dark:bg-slate-800/60 rounded-full" />
                    </td>
                    <td className="py-2.5 px-2">
                      <div className="h-3.5 w-20 bg-slate-200 dark:bg-slate-800 rounded-md" />
                    </td>
                    <td className="py-2.5 px-2">
                      <div className="h-3.5 w-16 bg-slate-200 dark:bg-slate-800 rounded-md" />
                    </td>
                    <td className="py-2.5 px-2">
                      <div className="h-3.5 w-20 bg-slate-200 dark:bg-slate-800 rounded-md" />
                    </td>
                    <td className="py-2.5 px-2 text-center">
                      <div className="h-6 w-6 bg-slate-200 dark:bg-slate-800 rounded-lg mx-auto" />
                    </td>
                  </tr>
                ))
              ) : filteredLicenses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-slate-400 space-y-2">
                    <Key className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
                    <p className="text-xs font-bold text-slate-600 dark:text-slate-300">{language === 'en' ? 'No matching software licenses found' : 'Không tìm thấy bản quyền phần mềm nào phù hợp'}</p>
                    <button
                      type="button"
                      onClick={() => {
                        setSearch('');
                        setSelectedType('');
                        setSelectedStatus('');
                        setSelectedCompany('');
                        setSelectedVendor('');
                        setSelectedExpiryFilter('ALL');
                      }}
                      className="text-xs text-purple-600 hover:underline font-semibold cursor-pointer"
                    >
                      {language === 'en' ? 'Clear all filters' : 'Xóa tất cả bộ lọc'}
                    </button>
                  </td>
                </tr>
              ) : (
                paginatedGroups.map((group) => {
                  const masterLic = group.masterLicense;
                  const isExpanded = expandedGroupIds.has(group.id);
                  const hasBatches = group.hasMultipleBatches;
                  const total = group.totalSeats;
                  const used = group.usedSeats;
                  const remaining = group.remainingSeats;
                  const seatPercent = group.seatPercent;
                  const isExpired = group.earliestExpiry && new Date(group.earliestExpiry) < new Date();
                  const isExpiring =
                    group.earliestExpiry &&
                    !isExpired &&
                    new Date(group.earliestExpiry) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

                  return (
                    <React.Fragment key={group.id}>
                      {/* Master Row */}
                      <tr
                        onClick={() => {
                          if (hasBatches) {
                            toggleGroupExpand(group.id);
                          } else {
                            setSelectedDetailLicense(masterLic);
                            setIsDetailModalOpen(true);
                          }
                        }}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          const clickX = e.clientX;
                          const clickY = e.clientY;
                          const menuWidth = 280;
                          const menuHeight = 340;
                          const x = clickX + menuWidth > window.innerWidth ? Math.max(10, window.innerWidth - menuWidth - 15) : clickX;
                          const y = clickY + menuHeight > window.innerHeight ? Math.max(10, window.innerHeight - menuHeight - 15) : clickY;
                          setContextMenu({ x, y, group });
                        }}
                        className={`transition-all group cursor-pointer ${
                          hasBatches
                            ? isExpanded
                              ? 'bg-purple-50/60 dark:bg-purple-950/40 font-semibold'
                              : 'hover:bg-purple-50/40 dark:hover:bg-purple-950/30'
                            : 'hover:bg-purple-50/40 dark:hover:bg-purple-950/30'
                        }`}
                        title={hasBatches ? (isExpanded ? 'Bấm để thu gọn các đợt mua (Chuột phải để mở menu thao tác)' : 'Bấm để mở rộng chi tiết các đợt mua (Chuột phải để mở menu thao tác)') : 'Bấm để xem chi tiết bản quyền (Chuột phải để mở menu thao tác)'}
                      >
                        {/* Cột 1: Tên & Đợt mua (Sticky Left) */}
                        <td className="py-2.5 px-2.5 sticky left-0 z-10 bg-white dark:bg-slate-900 group-hover:bg-purple-50/90 dark:group-hover:bg-slate-800/90 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.06)] transition-colors min-w-[175px]">
                          <div className="flex items-start gap-2">
                            <input
                              type="checkbox"
                              checked={selectedGroupIds.has(group.id)}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                setSelectedGroupIds((prev) => {
                                  const next = new Set(prev);
                                  if (checked) next.add(group.id);
                                  else next.delete(group.id);
                                  return next;
                                });
                              }}
                              className="mt-1 rounded border-slate-300 dark:border-slate-700 text-purple-600 focus:ring-purple-500 cursor-pointer shrink-0"
                            />
                            {hasBatches ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleGroupExpand(group.id);
                                }}
                                className="mt-0.5 p-1 rounded-lg bg-purple-100 hover:bg-purple-200 dark:bg-purple-900/60 dark:hover:bg-purple-800 text-purple-700 dark:text-purple-300 transition-transform cursor-pointer shrink-0"
                                title={isExpanded ? 'Thu gọn đợt mua' : 'Mở rộng đợt mua'}
                              >
                                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                              </button>
                            ) : (
                              <div className="w-5 h-5 rounded-lg bg-purple-50 dark:bg-purple-950/50 text-purple-600 flex items-center justify-center shrink-0 mt-0.5">
                                <Key className="w-3 h-3" />
                              </div>
                            )}

                            <div className="min-w-0 flex-1">
                              {(() => {
                                const groupWasteSeats = wastefulSeatsList.filter(
                                  (w) => w.licenseId === group.id || group.batches?.some((b: any) => b.id === w.licenseId)
                                );
                                return (
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-extrabold text-slate-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors text-[11.5px] leading-snug">
                                      {group.name}
                                    </span>
                                    {hasBatches && (
                                      <span className="px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-extrabold text-[10px] border border-purple-200 dark:border-purple-800 shadow-2xs inline-flex items-center gap-1">
                                        <Package className="w-2.8 h-2.8 text-purple-600" />
                                        <span>{group.batches.length} đợt mua</span>
                                      </span>
                                    )}
                                    {groupWasteSeats.length > 0 && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setIsWasteModalOpen(true);
                                        }}
                                        className="px-2 py-0.5 rounded-full bg-rose-100 hover:bg-rose-200 dark:bg-rose-950/80 dark:hover:bg-rose-900 text-rose-700 dark:text-rose-300 font-extrabold text-[10px] border border-rose-300 dark:border-rose-800 shadow-2xs inline-flex items-center gap-1 cursor-pointer transition-all animate-pulse"
                                        title={language === 'en' ? `Click to inspect ${groupWasteSeats.length} wasteful seats` : `Bấm để xem chi tiết ${groupWasteSeats.length} ghế lãng phí cần thu hồi`}
                                      >
                                        <AlertTriangle className="w-2.8 h-2.8 text-rose-600" />
                                        <span>{groupWasteSeats.length} {language === 'en' ? 'zombie seats' : 'ghế lãng phí'}</span>
                                      </button>
                                    )}
                                  </div>
                                );
                              })()}

                              {/* Subtext: License Key or Batch Summary */}
                              {hasBatches ? (
                                <div className="mt-1 flex items-center gap-2 text-[10px]">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleGroupExpand(group.id);
                                    }}
                                    className="font-bold text-purple-600 dark:text-purple-400 hover:underline inline-flex items-center gap-0.5 cursor-pointer"
                                  >
                                    <span>{isExpanded ? '▲ Thu gọn danh sách đợt' : `▼ Bấm xem chi tiết ${group.batches.length} đợt mua`}</span>
                                  </button>
                                </div>
                              ) : masterLic.licenseKey ? (
                                <div className="flex items-center gap-1 mt-0.5">
                                  <code className="px-1 py-0.2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono text-[9.5px] rounded border border-slate-200 dark:border-slate-700 truncate max-w-[120px]">
                                    {masterLic.licenseKey}
                                  </code>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleCopyKey(masterLic.licenseKey, masterLic.id);
                                    }}
                                    className="text-slate-400 hover:text-purple-600 p-0.5 rounded cursor-pointer shrink-0"
                                    title="Sao chép key"
                                  >
                                    {copiedKeyId === masterLic.id ? (
                                      <Check className="w-2.8 h-2.8 text-emerald-600 stroke-[3]" />
                                    ) : (
                                      <Copy className="w-2.8 h-2.8" />
                                    )}
                                  </button>
                                </div>
                              ) : (
                                <span className="text-[9px] text-slate-400 italic block mt-0.5">1 đợt mua duy nhất</span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Cột 2: Loại License & Công ty */}
                        <td className="py-2.5 px-2.5 min-w-[140px] max-w-[190px]">
                          <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-[9.5px] rounded border border-slate-200 dark:border-slate-700 inline-block leading-tight">
                            {group.licenseType}
                          </span>
                          <div className="flex items-center gap-1.5 mt-1 font-extrabold text-purple-700 dark:text-purple-300 text-xs leading-snug" title={group.companyName || 'Toàn tập đoàn'}>
                            <Building2 className="w-3.5 h-3.5 shrink-0 text-purple-600" />
                            <span className="truncate">{group.companyName || 'Toàn tập đoàn'}</span>
                          </div>
                        </td>

                        {/* Cột 3: Phân bố Seats (Tổng hợp toàn bộ các đợt) */}
                        <td className="py-2.5 px-2.5 min-w-[210px] max-w-[320px]">
                          <div className="flex items-center justify-between text-[10.5px] font-bold mb-0.5">
                            <span className={used >= total ? 'text-rose-600' : 'text-slate-800 dark:text-slate-200'}>
                              {used}/{total} <span className="text-[9.5px] font-normal text-slate-400">seats</span>
                            </span>
                            <span className="text-[9.5px] font-mono text-slate-400">{seatPercent}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-200 dark:border-slate-700">
                            <div
                              className={`h-full rounded-full transition-all ${
                                seatPercent >= 100
                                  ? 'bg-rose-500'
                                  : seatPercent >= 80
                                  ? 'bg-amber-500'
                                  : 'bg-emerald-500'
                              }`}
                              style={{ width: `${seatPercent}%` }}
                            />
                          </div>
                          <span className="text-[9.5px] text-emerald-600 dark:text-emerald-400 font-medium block mt-0.5">
                            Còn trống: <b>{remaining}</b> seats
                          </span>

                          {/* Multi-Company Balance Preview Badges (Rộng & Rõ ràng) */}
                          {group.companyStats && group.companyStats.length > 0 && (
                            <div className="flex flex-col gap-1 mt-1.5">
                              {group.companyStats.slice(0, 3).map((cs) => {
                                const isSurplus = cs.balanceSeats > 0 && cs.purchasedSeats > 0;
                                const isDeficit = cs.balanceSeats < 0;
                                const isBorrowed = cs.purchasedSeats === 0 && cs.usedSeats > 0;
                                return (
                                  <div
                                    key={cs.companyName}
                                    className={`px-2 py-1 rounded-lg text-[10px] font-medium flex items-center justify-between gap-2 border shadow-2xs transition-colors ${
                                      isDeficit
                                        ? 'bg-rose-50/90 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                                        : isBorrowed
                                        ? 'bg-amber-50/90 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                                        : isSurplus
                                        ? 'bg-emerald-50/90 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                                        : 'bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                                    }`}
                                    title={`${cs.companyName}: Đã mua ${cs.purchasedSeats}, Dùng ${cs.usedSeats} (${
                                      isDeficit ? `Thiếu ${Math.abs(cs.balanceSeats)} seats` : isBorrowed ? `Mượn ${cs.usedSeats} seats` : isSurplus ? `Dư ${cs.balanceSeats} seats` : 'Vừa đủ'
                                    })`}
                                  >
                                    <span className="truncate max-w-[150px] font-bold" title={cs.companyName}>
                                      {cs.companyName}
                                    </span>
                                    <div className="flex items-center gap-1 shrink-0 font-mono text-[9.5px]">
                                      <span>{cs.usedSeats}/{cs.purchasedSeats}</span>
                                      {isDeficit && <span className="font-bold text-rose-600">(-{Math.abs(cs.balanceSeats)})</span>}
                                      {isBorrowed && <span className="font-bold text-amber-600">(Mượn {cs.usedSeats})</span>}
                                      {isSurplus && <span className="font-bold text-emerald-600">(+{cs.balanceSeats})</span>}
                                    </div>
                                  </div>
                                );
                              })}
                              {group.companyStats.length > 3 && (
                                <span className="text-[9px] text-slate-400 font-medium pl-1">
                                  + {group.companyStats.length - 3} công ty khác
                                </span>
                              )}
                            </div>
                          )}
                        </td>

                        {/* Cột 4: Tổng chi phí đầu tư */}
                        <td className="py-2.5 px-2 min-w-[100px]">
                          {group.totalCostInSelectedCurrency > 0 ? (
                            <div className="space-y-0.5">
                              <span className="font-extrabold text-slate-900 dark:text-white font-mono text-[11px] block leading-tight">
                                {formatPrice(group.totalCostInSelectedCurrency, selectedCurrency)}
                              </span>
                              {hasBatches && (
                                <span className="text-[8.5px] text-slate-400 block font-mono leading-tight">
                                  ({group.batches.length} đợt cộng dồn)
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400 italic text-[9.5px]">Miễn phí</span>
                          )}
                        </td>

                        {/* Cột 5: Hạn dùng gần nhất */}
                        <td className="py-2.5 px-2 min-w-[105px]">
                          {group.earliestExpiry ? (
                            <div className="space-y-0.5">
                              <span
                                className={`px-1.5 py-0.2 rounded font-bold text-[9px] border inline-flex items-center gap-0.5 ${
                                  isExpired
                                    ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                                    : isExpiring
                                    ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                                    : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                                }`}
                              >
                                <Calendar className="w-2.5 h-2.5" />
                                <span>{formatDate(group.earliestExpiry)}</span>
                              </span>
                              <span className="text-[8.5px] text-slate-400 block font-mono">
                                {hasBatches ? 'Đợt gần nhất: ' : ''}{getRemainingTimeText(group.earliestExpiry).text}
                              </span>
                            </div>
                          ) : (
                            <span className="px-1.5 py-0.2 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded font-bold text-[9px]">
                              ♾️ Vô hạn
                            </span>
                          )}
                        </td>

                        {/* Cột 6: Nhà cung cấp */}
                        <td className="py-2.5 px-2 min-w-[120px] max-w-[200px] text-slate-700 dark:text-slate-300 font-medium text-[10px] leading-snug" onClick={(e) => e.stopPropagation()}>
                          {group.vendor ? (
                            <QuickLink
                              type="vendor"
                              id={group.vendor.id || group.vendor.name}
                              label={group.vendor.name}
                              icon="🏢"
                              showIcon={false}
                              multiline
                              maxLines={3}
                              className="font-medium text-slate-700 dark:text-slate-300 text-[10px] leading-snug line-clamp-3 break-words"
                            />
                          ) : (
                            <span className="text-slate-400 italic font-normal">—</span>
                          )}
                        </td>

                        {/* Cột 7: Thao tác Master (3 Dấu Chấm giống Nhân Sự) */}
                        <td
                          className="py-2.5 px-2 text-center sticky right-0 z-10 bg-white dark:bg-slate-900 group-hover:bg-purple-50/90 dark:group-hover:bg-slate-800/90 shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.06)] transition-colors w-[55px]"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              const rect = e.currentTarget.getBoundingClientRect();
                              const menuWidth = 280;
                              const menuHeight = 340;
                              const x = Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - 10);
                              const y = Math.min(rect.bottom + 5, window.innerHeight - menuHeight - 10);
                              setContextMenu({
                                x: Math.max(10, x),
                                y: Math.max(10, y),
                                group,
                              });
                            }}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer inline-flex items-center justify-center"
                            title="Menu thao tác (hoặc nhấp chuột phải)"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>

                      {/* Expanded Sub-table: Chi tiết từng đợt mua & Cân đối theo công ty */}
                      {hasBatches && isExpanded && (
                        <tr className="bg-slate-50/70 dark:bg-slate-900/80 border-y border-purple-200 dark:border-purple-800/80 animate-in fade-in duration-200">
                          <td colSpan={7} className="p-3.5 pl-6 sm:pl-10">
                            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-purple-200 dark:border-purple-800/80 shadow-xs overflow-hidden">
                              {/* Sub-table Header with 2 Tabs */}
                              <div className="flex items-center justify-between px-4 py-2 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950/40 dark:to-indigo-950/40 border-b border-purple-100 dark:border-purple-800 flex-wrap gap-2">
                                <div className="flex items-center gap-1 bg-white/80 dark:bg-slate-900/80 p-1 rounded-xl border border-purple-200 dark:border-purple-800">
                                  <button
                                    type="button"
                                    onClick={() => setGroupSubTab(group.id, 'companies')}
                                    className={`px-3 py-1 rounded-lg font-extrabold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                                      (subTableTabs[group.id] || 'companies') === 'companies'
                                        ? 'bg-purple-600 text-white shadow-2xs'
                                        : 'text-slate-600 dark:text-slate-400 hover:text-purple-600'
                                    }`}
                                  >
                                    <Building2 className="w-3.5 h-3.5" />
                                    <span>🏢 Cân Đối Theo Công Ty ({group.companyStats.length})</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => setGroupSubTab(group.id, 'batches')}
                                    className={`px-3 py-1 rounded-lg font-extrabold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                                      (subTableTabs[group.id] || 'companies') === 'batches'
                                        ? 'bg-purple-600 text-white shadow-2xs'
                                        : 'text-slate-600 dark:text-slate-400 hover:text-purple-600'
                                    }`}
                                  >
                                    <Package className="w-3.5 h-3.5" />
                                    <span>📦 Lịch Sử Các Đợt Mua ({group.batches.length})</span>
                                  </button>
                                </div>

                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleExportSingleLicense(group)}
                                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold text-xs border border-purple-200 dark:border-slate-600 shadow-2xs transition-all cursor-pointer"
                                    title="Xuất ma trận cân đối và danh sách người dùng của riêng gói này"
                                  >
                                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                                    <span>Xuất Excel gói này</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleOpenAddBatch(group)}
                                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-2xs transition-all cursor-pointer"
                                  >
                                    <Plus className="w-3.5 h-3.5" />
                                    <span>+ Mua thêm đợt mới</span>
                                  </button>
                                </div>
                              </div>

                              {/* TAB 1: CÂN ĐỐI THEO CÔNG TY THÀNH VIÊN */}
                              {(subTableTabs[group.id] || 'companies') === 'companies' && (
                                <div className="overflow-x-auto">
                                  <table className="w-full text-left text-xs border-collapse">
                                    <thead className="bg-slate-100/80 dark:bg-slate-700/60 border-b border-slate-200 dark:border-slate-700 text-[10px] font-bold text-slate-500 uppercase">
                                      <tr>
                                        <th className="py-2.5 px-3.5">CÔNG TY THÀNH VIÊN</th>
                                        <th className="py-2.5 px-2.5">ĐỢT MUA SỞ HỮU & HỢP ĐỒNG</th>
                                        <th className="py-2.5 px-2.5 text-center">ĐÃ MUA</th>
                                        <th className="py-2.5 px-2.5 text-center">ĐANG DÙNG</th>
                                        <th className="py-2.5 px-2.5">TÌNH TRẠNG CÂN ĐỐI (DƯ / THIẾU)</th>
                                        <th className="py-2.5 px-2.5">CHI PHÍ CÔNG TY</th>
                                        <th className="py-2.5 px-3.5 text-right">THAO TÁC</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                                      {group.companyStats.map((cs) => {
                                        const isSurplus = cs.balanceSeats > 0 && cs.purchasedSeats > 0;
                                        const isDeficit = cs.balanceSeats < 0;
                                        const isBorrowed = cs.purchasedSeats === 0 && cs.usedSeats > 0;
                                        const isExact = cs.balanceSeats === 0 && cs.purchasedSeats > 0;

                                        return (
                                          <tr key={cs.companyName} className="hover:bg-purple-50/30 dark:hover:bg-purple-950/20 transition-colors">
                                            {/* Cột 1: Tên Công ty */}
                                            <td className="py-3 px-3.5">
                                              <div className="flex items-center gap-2">
                                                <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold shrink-0">
                                                  <Building2 className="w-3.5 h-3.5 text-purple-600" />
                                                </div>
                                                <div>
                                                  <span className="font-extrabold text-slate-900 dark:text-white text-xs block">
                                                    {cs.companyName}
                                                  </span>
                                                  <span className="text-[10px] text-slate-400 font-medium">
                                                    {cs.batches.length > 0 ? `${cs.batches.length} đợt mua đứng tên` : 'Chưa có đợt mua riêng'}
                                                  </span>
                                                </div>
                                              </div>
                                            </td>

                                            {/* Cột 2: Đợt mua sở hữu & Hợp đồng */}
                                            <td className="py-3 px-2.5">
                                              {cs.batches.length > 0 ? (
                                                <div className="space-y-1.5">
                                                  {cs.batches.map((b: any) => {
                                                    const bDisplayName = b.batchName || `Đợt ${b.batchNumber}`;
                                                    return (
                                                      <div key={b.batchId} className="flex items-center gap-1.5 flex-wrap">
                                                        <span className="px-1.5 py-0.2 bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 font-bold text-[9.5px] rounded border border-purple-200 dark:border-purple-800">
                                                          {bDisplayName} ({b.seats} seats)
                                                        </span>
                                                        {b.purchaseDate && (
                                                          <span className="text-[9px] text-slate-500 font-mono">
                                                            Mua: {formatDate(b.purchaseDate)}
                                                          </span>
                                                        )}
                                                        {b.expiryDate && (
                                                          <span className="text-[9px] text-slate-400 font-mono">
                                                            • Hạn: {formatDate(b.expiryDate)}
                                                          </span>
                                                        )}
                                                        {b.contractNumber && (
                                                          <span className="font-mono text-[9px] text-slate-500">
                                                            • HĐ: {b.contractNumber}
                                                          </span>
                                                        )}
                                                      </div>
                                                    );
                                                  })}
                                                </div>
                                              ) : (
                                                <span className="text-[10.5px] text-amber-600 dark:text-amber-400 italic">
                                                  Chưa mua đợt nào (Dùng chung pool Tập đoàn)
                                                </span>
                                              )}
                                            </td>

                                            {/* Cột 3: Đã mua */}
                                            <td className="py-3 px-2.5 text-center">
                                              <span className="font-extrabold font-mono text-xs text-slate-900 dark:text-white">
                                                {cs.purchasedSeats}
                                              </span>
                                              <span className="text-[10px] text-slate-400 block">seats</span>
                                            </td>

                                            {/* Cột 4: Đang dùng */}
                                            <td className="py-3 px-2.5 text-center">
                                              <span className={`font-extrabold font-mono text-xs ${isDeficit ? 'text-rose-600 font-black' : 'text-slate-900 dark:text-white'}`}>
                                                {cs.usedSeats}
                                              </span>
                                              <span className="text-[10px] text-slate-400 block">seats</span>
                                            </td>

                                            {/* Cột 5: Tình trạng Cân đối (Dư / Thiếu) */}
                                            <td className="py-3 px-2.5">
                                              {isDeficit && (
                                                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-rose-100 dark:bg-rose-950/70 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 font-bold text-[11px]">
                                                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                                                  <span>🔴 Thiếu {Math.abs(cs.balanceSeats)} seats (Dùng vượt mức)</span>
                                                </div>
                                              )}
                                              {isBorrowed && (
                                                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-100 dark:bg-amber-950/70 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 font-bold text-[11px]">
                                                  <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                                  <span>⚠️ Mượn {cs.usedSeats} seats (Dùng nhờ license)</span>
                                                </div>
                                              )}
                                              {isSurplus && (
                                                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-100 dark:bg-emerald-950/70 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 font-bold text-[11px]">
                                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                                  <span>🟢 Dư {cs.balanceSeats} seats (Thừa hạn mức)</span>
                                                </div>
                                              )}
                                              {isExact && (
                                                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-[11px]">
                                                  <span>⚪ Vừa đủ 100%</span>
                                                </div>
                                              )}
                                            </td>

                                            {/* Cột 6: Chi phí cty */}
                                            <td className="py-3 px-2.5">
                                              {cs.totalCostInSelectedCurrency > 0 ? (
                                                <span className="font-extrabold font-mono text-[11px] text-slate-900 dark:text-white">
                                                  {formatPrice(cs.totalCostInSelectedCurrency, selectedCurrency)}
                                                </span>
                                              ) : (
                                                <span className="text-slate-400 italic text-[10px]">0 ₫</span>
                                              )}
                                            </td>

                                            {/* Cột 7: Thao tác */}
                                            <td className="py-3 px-3.5 text-right">
                                              <div className="flex items-center justify-end gap-1.5">
                                                <button
                                                  type="button"
                                                  onClick={() => {
                                                    setViewingCompanyStat({ group, companyStat: cs });
                                                    setIsCompanyAssigneesOpen(true);
                                                  }}
                                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-100 hover:bg-purple-200 dark:bg-purple-950 dark:hover:bg-purple-900 text-purple-700 dark:text-purple-300 font-bold text-[10.5px] transition-colors cursor-pointer"
                                                  title={`Xem danh sách ${cs.usedSeats} nhân sự của ${cs.companyName}`}
                                                >
                                                  <Users className="w-3 h-3" />
                                                  <span>Xem {cs.usedSeats} nhân sự</span>
                                                </button>

                                                <button
                                                  type="button"
                                                  onClick={() => handleOpenAddBatchForCompany(group, cs.companyName)}
                                                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900 text-emerald-700 dark:text-emerald-300 font-bold text-[10.5px] transition-colors cursor-pointer"
                                                  title={`Mua thêm đợt mới đứng tên ${cs.companyName}`}
                                                >
                                                  <Plus className="w-3 h-3" />
                                                  <span>Mua thêm đợt</span>
                                                </button>
                                              </div>
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              )}

                              {/* TAB 2: LỊCH SỬ CÁC ĐỢT MUA HÀNG */}
                              {(subTableTabs[group.id] || 'companies') === 'batches' && (
                                <div className="overflow-x-auto">
                                  <table className="w-full text-left text-xs border-collapse">
                                    <thead className="bg-slate-100/80 dark:bg-slate-700/60 border-b border-slate-200 dark:border-slate-700 text-[10px] font-bold text-slate-500 uppercase">
                                      <tr>
                                        <th className="py-2 px-3">ĐỢT MUA & CÔNG TY SỞ HỮU</th>
                                        <th className="py-2 px-2.5">LICENSE KEY</th>
                                        <th className="py-2 px-2.5">THỜI HẠN SỬ DỤNG</th>
                                        <th className="py-2 px-2.5">SEATS CỦA ĐỢT</th>
                                        <th className="py-2 px-2.5">CHI PHÍ ĐỢT</th>
                                        <th className="py-2 px-2.5">NHÀ CUNG CẤP</th>
                                        <th className="py-2 px-3 text-right">THAO TÁC</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                                      {group.batches.map((batch: any, bIdx: number) => {
                                        const bAssignments = batch.assignments?.filter((a: any) => !a.revokedAt) || [];
                                        const bUsed = batch.usedSeats !== undefined && batch.usedSeats !== null ? batch.usedSeats : bAssignments.length;
                                        const bTotal = batch.totalSeats || 1;
                                        const bRemaining = Math.max(0, bTotal - bUsed);
                                        const bPercent = Math.min(100, Math.round((bUsed / bTotal) * 100));

                                        const bPrice = Number(batch.purchasePrice) || 0;
                                        const bCur = batch.purchaseCurrency || 'VND';
                                        const bPriceConverted = convertCurrency(bPrice, bCur, selectedCurrency);

                                        const bIsExpired = batch.expiryDate && new Date(batch.expiryDate) < new Date();
                                        const bIsExpiring =
                                          batch.expiryDate &&
                                          !bIsExpired &&
                                          new Date(batch.expiryDate) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

                                        return (
                                          <tr key={batch.id} className="hover:bg-purple-50/30 dark:hover:bg-purple-950/20 transition-colors">
                                            {/* Tên đợt & Hợp đồng */}
                                            <td className="py-2.5 px-3">
                                              {(() => {
                                                const batchDisplayName = batch.specs?.batchName || batch.specs?.batchLabel || `Đợt ${bIdx + 1}`;
                                                return (
                                                  <>
                                                    <div className="font-bold text-slate-800 dark:text-slate-200 text-xs flex items-center gap-1.5 flex-wrap">
                                                      <span className="text-purple-700 dark:text-purple-300 font-extrabold">{batchDisplayName}</span>
                                                      <button
                                                        type="button"
                                                        onClick={() => handleRenameBatch(batch.id, batchDisplayName)}
                                                        className="p-1 text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 rounded hover:bg-purple-50 dark:hover:bg-purple-950/50 cursor-pointer transition-colors"
                                                        title="Đổi tên đợt mua (VD: Đợt mua ngày 15/08/2025, Gói bổ sung Q3...)"
                                                      >
                                                        <Edit2 className="w-3 h-3" />
                                                      </button>
                                                      <span className="px-1.5 py-0.2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-normal text-[9.5px] rounded">
                                                        🏢 {batch.companyName || 'Toàn tập đoàn'}
                                                      </span>
                                                    </div>
                                                    <div className="text-[10px] text-slate-500 font-mono flex items-center gap-1.5 mt-0.5">
                                                      {batch.purchaseDate && <span>Mua: {formatDate(batch.purchaseDate)}</span>}
                                                      {batch.contractNumber && <span>• HĐ: {batch.contractNumber}</span>}
                                                      {batch.invoiceNumber && <span>• HĐĐ: {batch.invoiceNumber}</span>}
                                                      {!batch.contractNumber && !batch.invoiceNumber && !batch.purchaseDate && <span className="italic">Chưa có số HĐ</span>}
                                                    </div>
                                                  </>
                                                );
                                              })()}
                                            </td>

                                            {/* Key */}
                                            <td className="py-2.5 px-2.5">
                                              {batch.licenseKey ? (
                                                <div className="flex items-center gap-1">
                                                  <code className="px-1 py-0.2 bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-mono text-[9.5px] rounded border border-slate-200 dark:border-slate-700 truncate max-w-[130px]">
                                                    {batch.licenseKey}
                                                  </code>
                                                  <button
                                                    type="button"
                                                    onClick={() => handleCopyKey(batch.licenseKey, batch.id)}
                                                    className="text-slate-400 hover:text-purple-600 p-0.5 rounded cursor-pointer"
                                                    title="Sao chép key"
                                                  >
                                                    {copiedKeyId === batch.id ? (
                                                      <Check className="w-3 h-3 text-emerald-600 stroke-[3]" />
                                                    ) : (
                                                      <Copy className="w-3 h-3" />
                                                    )}
                                                  </button>
                                                </div>
                                              ) : (
                                                <span className="text-[9.5px] text-slate-400 italic">Không có Key</span>
                                              )}
                                            </td>

                                            {/* Thời hạn */}
                                            <td className="py-2.5 px-2.5">
                                              {batch.expiryDate ? (
                                                <div>
                                                  <span
                                                    className={`px-1.5 py-0.2 rounded font-bold text-[9px] border inline-flex items-center gap-0.5 ${
                                                      bIsExpired
                                                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                                                        : bIsExpiring
                                                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                                                        : 'bg-slate-50 text-slate-700 border-slate-200'
                                                    }`}
                                                  >
                                                    {formatDate(batch.expiryDate)}
                                                  </span>
                                                  <span className="text-[8.5px] text-slate-400 block font-mono">
                                                    {getRemainingTimeText(batch.expiryDate).text}
                                                  </span>
                                                </div>
                                              ) : (
                                                <span className="text-[9.5px] text-emerald-600 font-medium">♾️ Vô hạn</span>
                                              )}
                                            </td>

                                            {/* Seats của đợt */}
                                            <td className="py-2.5 px-2.5">
                                              <div className="flex items-center justify-between text-[10px] font-bold">
                                                <span>
                                                  {bUsed}/{bTotal}
                                                </span>
                                                <span className="text-[8.5px] text-slate-400 font-normal">
                                                  ({bRemaining > 0 ? `Trống ${bRemaining}` : 'Hết'})
                                                </span>
                                              </div>
                                              <div className="w-24 h-1 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden mt-1">
                                                <div
                                                  className={`h-full rounded-full ${
                                                    bPercent >= 100 ? 'bg-rose-500' : bPercent >= 80 ? 'bg-amber-500' : 'bg-emerald-500'
                                                  }`}
                                                  style={{ width: `${bPercent}%` }}
                                                />
                                              </div>
                                            </td>

                                            {/* Chi phí đợt */}
                                            <td className="py-2.5 px-2.5">
                                              {bPrice > 0 ? (
                                                <div>
                                                  <span className="font-extrabold text-slate-800 dark:text-slate-200 font-mono text-[11px] block">
                                                    {formatPrice(bPriceConverted, selectedCurrency)}
                                                  </span>
                                                  {bCur !== selectedCurrency && (
                                                    <span className="text-[8.5px] text-slate-400 block font-mono">
                                                      Gốc: {formatPrice(bPrice, bCur)}
                                                    </span>
                                                  )}
                                                </div>
                                              ) : (
                                                <span className="text-slate-400 italic text-[9.5px]">—</span>
                                              )}
                                            </td>

                                            {/* Nhà cung cấp đợt */}
                                            <td className="py-2.5 px-2.5 text-slate-700 dark:text-slate-300 text-[10px]">
                                              {batch.vendor?.name || '—'}
                                            </td>

                                            {/* Thao tác đợt */}
                                            <td className="py-2.5 px-3 text-right">
                                              <div className="flex items-center justify-end gap-1">
                                                {/* Tách thành gói độc lập (Unlink) */}
                                                {batch.parentLicenseId && (
                                                  <button
                                                    type="button"
                                                    onClick={() => handleUnlinkBatch(batch.id, `${group.name} - Đợt ${bIdx + 1}`)}
                                                    title={`Tách Đợt ${bIdx + 1} thành gói bản quyền độc lập riêng`}
                                                    className="p-1 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-950 rounded-md transition-colors cursor-pointer"
                                                  >
                                                    <Unlink className="w-3 h-3" />
                                                  </button>
                                                )}

                                                {/* Cấp seat riêng đợt này */}
                                                <button
                                                  type="button"
                                                  onClick={() => handleOpenAssign({ ...batch, name: `${group.name} (Đợt ${bIdx + 1})` })}
                                                  title={`Cấp phát seat thuộc Đợt ${bIdx + 1}`}
                                                  className="p-1 text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-950 rounded-md transition-colors cursor-pointer"
                                                >
                                                  <Users className="w-3 h-3" />
                                                </button>

                                                {/* Xem chi tiết đợt này */}
                                                <button
                                                  type="button"
                                                  onClick={() => {
                                                    setSelectedDetailLicense(batch);
                                                    setIsDetailModalOpen(true);
                                                  }}
                                                  title={`Xem chi tiết Đợt ${bIdx + 1}`}
                                                  className="p-1 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-950 rounded-md transition-colors cursor-pointer"
                                                >
                                                  <Eye className="w-3 h-3" />
                                                </button>

                                                {/* Sửa đợt này */}
                                                <button
                                                  type="button"
                                                  onClick={() => handleOpenEdit(batch)}
                                                  title={`Chỉnh sửa thông tin Đợt ${bIdx + 1}`}
                                                  className="p-1 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-950 rounded-md transition-colors cursor-pointer"
                                                >
                                                  <Edit2 className="w-3 h-3" />
                                                </button>

                                                {/* Xóa đợt này */}
                                                <button
                                                  type="button"
                                                  onClick={() => handleDeleteLicense(batch.id, `${group.name} - Đợt ${bIdx + 1}`)}
                                                  title={`Xóa Đợt ${bIdx + 1}`}
                                                  className="p-1 text-rose-500 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-950 rounded-md transition-colors cursor-pointer"
                                                >
                                                  <Trash2 className="w-3 h-3" />
                                                </button>
                                              </div>
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {totalFilteredLicenses > pageSize && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 text-xs shrink-0 rounded-b-2xl">
            <div className="text-slate-500 font-medium">
              Hiển thị <span className="font-bold text-slate-900 dark:text-white">{Math.min(totalFilteredLicenses, (currentPage - 1) * pageSize + 1)}</span> - <span className="font-bold text-slate-900 dark:text-white">{Math.min(totalFilteredLicenses, currentPage * pageSize)}</span> trên <span className="font-bold text-purple-600 dark:text-purple-400">{totalFilteredLicenses}</span> license
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
      </>
      )}

      {/* ==================== MODAL 1: THÊM MỚI / SỬA BẢN QUYỀN (BÓC TÁCH COMPONENT) ==================== */}
      <LicenseFormModal
        isOpen={isAddModalOpen || isEditModalOpen}
        mode={isEditModalOpen ? 'edit' : 'add'}
        onClose={() => {
          setIsAddModalOpen(false);
          setIsEditModalOpen(false);
        }}
        initialData={isEditModalOpen ? editFormData : formData}
        editingLicenseId={editingLicenseId}
        allLicenses={licenses}
        vendors={vendors}
        companies={companies}
        users={users}
        assets={assets}
        currencies={currencies}
        exchangeRatesMap={exchangeRatesMap}
        onSuccess={(savedData) => {
          invalidateClientCache('/api/licenses');
          if (savedData) {
            setLicenses((prev) => {
              const idx = prev.findIndex((l) => l.id === savedData.id);
              if (idx >= 0) {
                const next = [...prev];
                next[idx] = { ...prev[idx], ...savedData };
                return next;
              }
              return [savedData, ...prev];
            });
            setSelectedDetailLicense((prev: any) =>
              prev?.id === savedData.id ? { ...prev, ...savedData } : prev
            );
            setActiveLicense((prev: any) =>
              prev?.id === savedData.id ? { ...prev, ...savedData } : prev
            );
          }
          loadData(true);
        }}
        onOpenAddCurrency={() => setIsAddCurrencyModalOpen(true)}
      />

      {/* ==================== MODAL 2: CẤP PHÁT & THU HỒI SEATS (BÓC TÁCH COMPONENT) ==================== */}
      <LicenseAssignModal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        license={activeLicense}
        users={users}
        assets={assets}
        onSuccess={() => loadData()}
      />

      {/* ==================== MODAL 3: XEM CHI TIẾT LICENSE (BÓC TÁCH COMPONENT) ==================== */}
      <LicenseDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        license={selectedDetailLicense}
        selectedCurrency={selectedCurrency}
        currencies={currencies}
        exchangeRatesMap={exchangeRatesMap}
        formatPrice={formatPrice}
        onOpenEdit={(lic: any) => handleOpenEdit(lic)}
        onOpenAssign={(lic: any) => handleOpenAssign(lic)}
        onQuickRenew={(lic: any, months: any) => handleQuickRenew(lic, months)}
        onDeletePaymentRecord={(licId: any, payId: any) => handleDeletePaymentRecord(licId, payId)}
        onOpenDocPreview={(lic: any) => {
          setSelectedDetailLicense(lic);
          setIsDocPreviewOpen(true);
        }}
        onOpenAddPayment={(lic: any) => {
          setSelectedDetailLicense(lic);
          setIsAddPaymentModalOpen(true);
        }}
        onExportExcel={(lic: any) => {
          const foundGroup = groupedLicenses.find((g) => g.id === lic.id || g.name.toLowerCase() === (lic.name || '').toLowerCase());
          if (foundGroup) {
            handleExportSingleLicense(foundGroup);
          } else {
            handleExportSingleLicense(lic);
          }
        }}
      />

      {/* ==================== MODAL: CHI TIẾT GHẾ BẢN QUYỀN LÃNG PHÍ (ZOMBIE LICENSES) ==================== */}
      <ZombieLicensesModal
        isOpen={isWasteModalOpen}
        onClose={() => setIsWasteModalOpen(false)}
        wastefulSeats={wastefulSeatsList}
        selectedCurrency={selectedCurrency}
        exchangeRatesMap={exchangeRatesMap}
        formatPrice={formatPrice}
        isEn={language === 'en'}
        onViewLicense={(licRef: any) => {
          setSelectedDetailLicense(licRef);
          setIsDetailModalOpen(true);
          setIsWasteModalOpen(false);
        }}
        onReclaimSuccess={async () => {
          invalidateClientCache('/api/licenses');
          triggerDataRefresh('licenses');
          await loadData(true);
        }}
      />


      {/* ==================== MODAL: XEM NHANH CHỨNG TỪ ==================== */}
      {selectedDetailLicense && (
        <DocumentQuickPreviewModal
          isOpen={isDocPreviewOpen}
          onClose={() => setIsDocPreviewOpen(false)}
          title={selectedDetailLicense.name}
          subtitle="Bản quyền phần mềm"
          entityType="license"
          entityId={selectedDetailLicense.id}
          invoiceNumber={selectedDetailLicense.invoiceNumber}
          contractNumber={selectedDetailLicense.contractNumber}
          directUrl={selectedDetailLicense.contractUrl}
          initialDocuments={selectedDetailLicense.documents || []}
          onUpdateDirectUrl={async (newUrl) => {
            const res = await fetch(`/api/licenses/${selectedDetailLicense.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ contractUrl: newUrl }),
            });
            if (res.ok) {
              const updated = await res.json();
              setSelectedDetailLicense(updated.data);
              loadData();
            }
          }}
          themeColor="purple"
        />
      )}

      {/* ==================== MODAL 4: PRO UPGRADE MODAL ==================== */}
      {isPricingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full flex flex-col max-h-[92vh] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-6 bg-gradient-to-br from-purple-900 via-indigo-900 to-slate-900 text-white text-center relative shrink-0">
              <div className="w-12 h-12 rounded-3xl bg-amber-400/20 text-amber-300 flex items-center justify-center mx-auto mb-2.5">
                <Crown className="w-6 h-6" />
              </div>
              <h3 className="font-black text-lg">Nâng Cấp Simply IT PRO - Quản Lý Bản Quyền</h3>
              <p className="text-xs text-purple-200 mt-1">
                Tự động kiểm tra tuân thủ bản quyền, phát hiện phần mềm lậu và nhắc hạn hợp đồng qua Zalo/Email
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
              <div className="space-y-2.5">
                <div className="p-3 bg-purple-50/70 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 rounded-2xl flex items-start gap-3">
                  <Zap className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white">Tự Động Quét & Phát Hiện Cài Đặt Trái Phép</span>
                    <p className="text-[11px] text-slate-500">PowerShell Agent tự động đối soát phần mềm cài trên máy nhân sự so với số lượng license đã mua.</p>
                  </div>
                </div>

                <div className="p-3 bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-2xl flex items-start gap-3">
                  <Building2 className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white">Tự Động Nhắc Hạn Hợp Đồng License</span>
                    <p className="text-[11px] text-slate-500">Gửi thông báo nhắc gia hạn qua Email & Zalo tự động trước 30 - 60 ngày.</p>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2.5">
                <span className="font-bold text-slate-900 dark:text-white block">
                  Đăng ký dùng thử PRO 14 ngày:
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

            <div className="flex justify-end gap-2 px-6 py-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 shrink-0">
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
                    alert('Vui lòng nhập Số điện thoại hoặc Zalo để kích hoạt bản thử!');
                    return;
                  }
                  alert('Cảm ơn bạn! Đội ngũ Simply IT sẽ liên hệ kích hoạt bản quyền PRO trong 15 phút.');
                  setIsPricingModalOpen(false);
                }}
                className="px-5 py-2 bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 text-white rounded-xl font-bold shadow-md cursor-pointer flex items-center gap-1.5"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Kích Hoạt PRO 14 Ngày</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== MODAL 5: THÊM ĐỒNG TIỀN MỚI ==================== */}
      {isAddCurrencyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-900 text-white rounded-t-3xl">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-purple-600 text-white rounded-xl shadow-xs">
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
                className="px-5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>Lưu Đồng Tiền</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD NEW PAYMENT / RENEWAL RECORD FOR LICENSE */}
      {isAddPaymentModalOpen && selectedDetailLicense && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-3 sm:p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-3xl w-full flex flex-col max-h-[92vh] border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-slate-800/80 dark:to-slate-800/40 shrink-0">
              <h3 className="font-bold text-sm text-purple-950 dark:text-purple-200 flex items-center gap-2">
                <span className="p-1.5 bg-purple-600 text-white rounded-xl shadow-xs">
                  <Receipt className="w-4 h-4" />
                </span>
                <span>Ghi Nhận Đợt Thanh Toán / Gia Hạn Bản Quyền Mới</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsAddPaymentModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-xl hover:bg-white/80 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePaymentRecord} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 text-xs">
              {/* Row 1: Ngày thanh toán & Trạng thái */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Ngày thanh toán (*)
                  </label>
                  <input
                    type="date"
                    required
                    value={paymentForm.paymentDate}
                    onChange={(e) => setPaymentForm({ ...paymentForm, paymentDate: e.target.value })}
                    className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Trạng thái thanh toán
                  </label>
                  <select
                    value={paymentForm.status}
                    onChange={(e) => setPaymentForm({ ...paymentForm, status: e.target.value as any })}
                    className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
                  >
                    <option value="PAID">🟢 Đã thanh toán thành công</option>
                    <option value="PENDING">⏳ Đang chờ duyệt / Chưa thanh toán</option>
                  </select>
                </div>
              </div>

              {/* Row 2: Phạm vi kỳ gia hạn (Từ ngày nào đến ngày nào) */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl space-y-2.5">
                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-purple-600" />
                  <span>Phạm Vi Gia Hạn / Hạn Dùng Bản Quyền</span>
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Kỳ gia hạn từ ngày:
                    </label>
                    <input
                      type="date"
                      value={paymentForm.periodStartDate}
                      onChange={(e) => {
                        const s = e.target.value;
                        let autoPeriod = paymentForm.period;
                        if (s && paymentForm.periodEndDate) {
                          autoPeriod = `Kỳ từ ${new Date(s).toLocaleDateString('vi-VN')} đến ${new Date(paymentForm.periodEndDate).toLocaleDateString('vi-VN')}`;
                        }
                        setPaymentForm({ ...paymentForm, periodStartDate: s, period: autoPeriod });
                      }}
                      className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Hạn dùng mới (Đến ngày):
                    </label>
                    <input
                      type="date"
                      value={paymentForm.periodEndDate}
                      onChange={(e) => {
                        const end = e.target.value;
                        let autoPeriod = paymentForm.period;
                        if (paymentForm.periodStartDate && end) {
                          autoPeriod = `Kỳ từ ${new Date(paymentForm.periodStartDate).toLocaleDateString('vi-VN')} đến ${new Date(end).toLocaleDateString('vi-VN')}`;
                        }
                        setPaymentForm({ ...paymentForm, periodEndDate: end, period: autoPeriod });
                      }}
                      className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-purple-500"
                    />

                    {/* Thêm nhanh thời hạn */}
                    <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                      <span className="text-[10.5px] font-bold text-slate-400 dark:text-slate-500 mr-0.5">
                        ⚡ Thêm nhanh:
                      </span>
                      {[
                        { label: '1 tháng', months: 1 },
                        { label: '3 tháng', months: 3 },
                        { label: '6 tháng', months: 6 },
                        { label: '1 năm', months: 12 },
                        { label: '2 năm', months: 24 },
                        { label: '3 năm', months: 36 },
                      ].map((opt) => (
                        <button
                          key={opt.months}
                          type="button"
                          onClick={() => {
                            const baseStr = paymentForm.periodStartDate || new Date().toISOString().split('T')[0];
                            const d = new Date(baseStr);
                            if (!isNaN(d.getTime())) {
                              const origDay = d.getDate();
                              d.setMonth(d.getMonth() + opt.months);
                              if (d.getDate() < origDay) d.setDate(0);
                              const end = d.toISOString().split('T')[0];
                              const autoPeriod = `Kỳ từ ${new Date(baseStr).toLocaleDateString('vi-VN')} đến ${d.toLocaleDateString('vi-VN')}`;
                              setPaymentForm({ ...paymentForm, periodEndDate: end, period: autoPeriod });
                            }
                          }}
                          className="px-2 py-0.5 bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 dark:hover:bg-purple-900/80 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 rounded text-[11px] font-bold cursor-pointer transition-all active:scale-95"
                          title={`Gia hạn +${opt.label}`}
                        >
                          +{opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Tên / Nhãn kỳ gia hạn (Gợi ý tự động hoặc nhập tùy chỉnh):
                  </label>
                  <input
                    type="text"
                    placeholder="VD: Gia hạn năm 2026 hoặc Đợt thanh toán tháng 08/2026..."
                    value={paymentForm.period}
                    onChange={(e) => setPaymentForm({ ...paymentForm, period: e.target.value })}
                    className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              {/* Row 3: Khối Định Giá Thanh Toán (Multi-Currency) */}
              <div className="p-4 bg-gradient-to-r from-purple-50/80 to-indigo-50/80 dark:from-purple-950/40 dark:to-indigo-950/40 border border-purple-200 dark:border-purple-800/80 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-purple-950 dark:text-purple-200 flex items-center gap-1.5 uppercase tracking-wider">
                    <DollarSign className="w-4 h-4 text-purple-600" />
                    <span>1. Định Giá Thanh Toán Gốc (Ngoại Tệ)</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsAddCurrencyModalOpen(true)}
                    className="text-[11px] font-bold text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Thêm đồng tiền mới</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-start">
                  <div className="sm:col-span-4">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Loại tiền tệ (*)
                    </label>
                    <select
                      value={paymentForm.currency || 'VND'}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === '__ADD_NEW__') {
                          setIsAddCurrencyModalOpen(true);
                          return;
                        }
                        const curObj = currencies.find((c) => c.code === val);
                        setPaymentForm({
                          ...paymentForm,
                          currency: val,
                          exchangeRate: curObj ? curObj.rateToVnd : (exchangeRatesMap[val] || 1),
                        });
                      }}
                      className="w-full p-2.5 bg-white dark:bg-slate-800 border border-purple-200 dark:border-purple-700 rounded-xl text-xs font-bold text-purple-900 dark:text-purple-200 outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer shadow-2xs"
                    >
                      {currencies.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.flag} {c.code} - {c.name} ({c.symbol})
                        </option>
                      ))}
                      <option value="__ADD_NEW__" className="text-purple-600 font-bold">
                        ➕ Thêm đồng tiền khác...
                      </option>
                    </select>
                  </div>

                  <div className="sm:col-span-5">
                    <CurrencyInput
                      label="Số tiền thanh toán gốc (*)"
                      value={paymentForm.amount}
                      onChange={(val) => setPaymentForm({ ...paymentForm, amount: val })}
                      currency={paymentForm.currency || 'VND'}
                      currencyName={currencies.find((c) => c.code === (paymentForm.currency || 'VND'))?.name}
                      exchangeRate={paymentForm.exchangeRate || exchangeRatesMap[paymentForm.currency || 'VND'] || 1}
                      placeholder="VD: 1.000"
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Tỷ giá (1 {paymentForm.currency || 'VND'} = ? VNĐ)
                    </label>
                    <input
                      type="number"
                      disabled={(paymentForm.currency || 'VND').toUpperCase() === 'VND'}
                      value={paymentForm.exchangeRate || exchangeRatesMap[paymentForm.currency || 'VND'] || 1}
                      onChange={(e) => {
                        const r = parseFloat(e.target.value) || 1;
                        setPaymentForm({ ...paymentForm, exchangeRate: r });
                      }}
                      className="w-full p-2.5 bg-white dark:bg-slate-800 disabled:bg-slate-100 dark:disabled:bg-slate-800/50 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-purple-500 shadow-2xs"
                    />
                  </div>
                </div>

                {/* KHỐI 2: Ô GIÁ TIỀN QUY CHUẨN VNĐ */}
                {(() => {
                  const numVal = Number(String(paymentForm.amount).replace(/\D/g, '')) || 0;
                  const curr = paymentForm.currency || 'VND';
                  const rate = paymentForm.exchangeRate || exchangeRatesMap[curr] || 1;
                  const inVnd = curr === 'VND' ? numVal : numVal * rate;

                  return (
                    <div className="p-3.5 bg-white dark:bg-slate-800 rounded-2xl border border-emerald-200 dark:border-emerald-800 shadow-xs space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-extrabold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5 uppercase tracking-wide">
                          <span>🇻🇳 2. Số Tiền Quy Chuẩn VNĐ (Hạch Toán Kế Toán)</span>
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

                {/* Note nhỏ 1 dòng */}
                <div className="p-2 bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/80 rounded-xl flex items-center gap-1.5 text-[10.5px] text-amber-900 dark:text-amber-200 font-medium">
                  <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span>Tỷ giá tham chiếu hạch toán cập nhật: 25/08/2026 (Theo Vietcombank / Tỷ giá hạch toán)</span>
                </div>
              </div>

              {/* Row 4: Số hóa đơn & Số hợp đồng */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Số hóa đơn VAT / Phiếu thu
                  </label>
                  <input
                    type="text"
                    placeholder="VD: HD-2026-001"
                    value={paymentForm.invoiceNumber}
                    onChange={(e) => setPaymentForm({ ...paymentForm, invoiceNumber: e.target.value })}
                    className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-purple-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Số hợp đồng liên quan
                  </label>
                  <input
                    type="text"
                    placeholder="VD: HĐ-MS-2026"
                    value={paymentForm.contractNumber}
                    onChange={(e) => setPaymentForm({ ...paymentForm, contractNumber: e.target.value })}
                    className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-purple-500 font-mono"
                  />
                </div>
              </div>

              {/* Row 5: Ghi chú */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Ghi chú thanh toán
                </label>
                <textarea
                  rows={2}
                  placeholder="Phương thức chuyển khoản, người duyệt, ủy nhiệm chi..."
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                  className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddPaymentModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Hủy (ESC)
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl font-bold shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>💾 Lưu Đợt Thanh Toán / Gia Hạn</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
{/* ==================== FLOATING BATCH MERGE ACTION BAR ==================== */}
      {selectedGroupIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900/95 text-white dark:bg-purple-950/95 dark:text-purple-100 px-5 py-3 rounded-2xl shadow-2xl border border-purple-500/30 backdrop-blur-md flex items-center gap-4 animate-in slide-in-from-bottom-5 duration-200">
          <div className="flex items-center gap-2 text-xs font-bold">
            <span className="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center font-mono text-[11px]">
              {selectedGroupIds.size}
            </span>
            <span>Đã chọn {selectedGroupIds.size} gói bản quyền</span>
          </div>

          <div className="h-4 w-px bg-white/20" />

          {/* Xuất Excel cho các gói đã chọn */}
          <button
            type="button"
            disabled={isExportingExcel}
            onClick={async () => {
              const selectedGroups = groupedLicenses.filter((g) => selectedGroupIds.has(g.id));
              if (selectedGroups.length === 0) return;
              if (selectedGroups.length === 1) {
                await handleExportSingleLicense(selectedGroups[0]);
              } else {
                setIsExportingExcel(true);
                try {
                  await exportConglomerateExcel({
                    groupedLicenses: selectedGroups,
                    selectedCompany,
                    selectedCurrency,
                    companiesList: conglomerateCompanies.map(([cName]) => cName),
                  });
                } catch (err) {
                  console.error('Export selected Excel error:', err);
                  alert(language === 'en' ? 'Excel export failed' : 'Xuất file Excel cho các gói đã chọn thất bại');
                } finally {
                  setIsExportingExcel(false);
                }
              }
            }}
            className="px-3.5 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer bg-emerald-600 hover:bg-emerald-500 text-white shadow-md disabled:opacity-60"
            title="Xuất báo cáo Excel cho các gói bản quyền đã chọn"
          >
            {isExportingExcel ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <FileSpreadsheet className="w-3.5 h-3.5" />
            )}
            <span>Xuất Excel ({selectedGroupIds.size} gói)</span>
          </button>

          <button
            type="button"
            disabled={selectedGroupIds.size < 2}
            onClick={() => {
              const firstSelected = Array.from(selectedGroupIds)[0];
              setMergeMasterId(firstSelected);
              setIsMergeModalOpen(true);
            }}
            className={`px-3.5 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
              selectedGroupIds.size >= 2
                ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-md'
                : 'bg-slate-700 text-slate-400 cursor-not-allowed'
            }`}
            title={selectedGroupIds.size < 2 ? 'Cần chọn ít nhất 2 gói để gom nhóm' : 'Gom các gói đã chọn thành 1 nhóm'}
          >
            <Package className="w-3.5 h-3.5" />
            <span>Gom thành 1 gói ({selectedGroupIds.size} đợt)</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedGroupIds(new Set())}
            className="text-xs text-slate-400 hover:text-white px-2 py-1 cursor-pointer font-medium"
          >
            Bỏ chọn
          </button>
        </div>
      )}

      {/* ==================== MODAL: GOM NHÓM ĐỢT MUA (BATCH MERGE) ==================== */}
      {isMergeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950/40 dark:to-indigo-950/40">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-purple-600 text-white rounded-xl">
                  <Package className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">Gom Nhóm Các Đợt Mua Bản Quyền</h3>
                  <p className="text-[11px] text-slate-500">Gộp {selectedGroupIds.size} gói bản quyền thành các đợt mua của 1 gói chính</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsMergeModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-xl cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="p-3 bg-purple-50/80 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 rounded-xl text-[11.5px] text-purple-900 dark:text-purple-200 leading-relaxed">
                💡 <b>Cách thức hoạt động:</b> Gói được chọn làm <b>Bản quyền gốc</b> sẽ là dòng hiển thị tổng quan. Các gói còn lại sẽ được chuyển thành các <b>Đợt mua bổ sung</b> của gói đó. Toàn bộ thông tin seats, chi phí, hóa đơn/hợp đồng và nhân sự được gán của từng gói vẫn được bảo toàn nguyên vẹn 100%.
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                  Chọn gói làm Bản Quyền Gốc (Master):
                </label>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {Array.from(selectedGroupIds).map((id) => {
                    const grp = groupedLicenses.find((g) => g.id === id);
                    if (!grp) return null;
                    const isSelected = mergeMasterId === grp.id;
                    return (
                      <label
                        key={grp.id}
                        onClick={() => setMergeMasterId(grp.id)}
                        className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                          isSelected
                            ? 'border-purple-500 bg-purple-50/60 dark:bg-purple-950/40 ring-1 ring-purple-500'
                            : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="mergeMaster"
                          checked={isSelected}
                          onChange={() => setMergeMasterId(grp.id)}
                          className="mt-0.5 text-purple-600 focus:ring-purple-500"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="font-extrabold text-slate-900 dark:text-white text-xs">{grp.name}</span>
                            {isSelected && (
                              <span className="px-1.5 py-0.2 bg-purple-600 text-white font-bold text-[9px] rounded-full">
                                Gói gốc
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5 font-mono">
                            <span>{grp.totalSeats} seats</span>
                            <span>•</span>
                            <span>{grp.companyName || 'Toàn tập đoàn'}</span>
                            {grp.batches.length > 1 && <span>• ({grp.batches.length} đợt có sẵn)</span>}
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 px-6 py-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60">
              <button
                type="button"
                disabled={isMerging}
                onClick={() => setIsMergeModalOpen(false)}
                className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-xl font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={isMerging || !mergeMasterId}
                onClick={handleConfirmBatchMerge}
                className="px-5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl font-bold shadow-md cursor-pointer flex items-center gap-1.5"
              >
                {isMerging ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Đang gom nhóm...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Xác nhận gom nhóm</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== MODAL: XEM NHÂN SỰ THEO CÔNG TY ==================== */}
      {isCompanyAssigneesOpen && viewingCompanyStat && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950/40 dark:to-indigo-950/40 shrink-0">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-purple-600 text-white rounded-xl shadow-xs">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                    Nhân Sự Đang Dùng Bản Quyền — {viewingCompanyStat.companyStat.companyName}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {viewingCompanyStat.group.name} • {viewingCompanyStat.companyStat.assignments.length} người đang sử dụng
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCompanyAssigneesOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-xl cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-5 text-xs">
              {viewingCompanyStat.companyStat.assignments.length === 0 ? (
                <div className="text-center py-10 text-slate-400">
                  <Users className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  <p>Chưa có nhân sự nào của công ty này được cấp bản quyền</p>
                </div>
              ) : (
                <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-[10px] font-bold text-slate-500 uppercase">
                      <tr>
                        <th className="py-2 px-3">HỌ VÀ TÊN & EMAIL</th>
                        <th className="py-2 px-2.5">PHÒNG BAN</th>
                        <th className="py-2 px-2.5">THIẾT BỊ / MÁY TÍNH</th>
                        <th className="py-2 px-2.5">ĐỢT CẤP</th>
                        <th className="py-2 px-2.5">NGÀY CẤP</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {viewingCompanyStat.companyStat.assignments.map((a: any, idx: number) => (
                        <tr key={a.id || idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          <td className="py-2.5 px-3">
                            <div className="font-bold text-slate-900 dark:text-white text-xs">
                              {a.user?.fullName || '—'}
                            </div>
                            <div className="text-[10.5px] text-slate-500 font-mono">
                              {a.user?.email || '—'}
                            </div>
                          </td>
                          <td className="py-2.5 px-2.5 text-slate-600 dark:text-slate-400">
                            {a.user?.department || '—'}
                          </td>
                          <td className="py-2.5 px-2.5">
                            {a.asset ? (
                              <span className="font-mono text-purple-600 font-bold text-[10.5px]">
                                {a.asset.assetTag} {a.asset.name ? `(${a.asset.name})` : ''}
                              </span>
                            ) : (
                              <span className="text-slate-400 italic">Chưa gắn máy</span>
                            )}
                          </td>
                          <td className="py-2.5 px-2.5">
                            <span className="px-1.5 py-0.2 bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 font-bold text-[9.5px] rounded">
                              Đợt {a.batchNumber || 1}
                            </span>
                          </td>
                          <td className="py-2.5 px-2.5 text-slate-500 font-mono text-[10.5px]">
                            {a.assignedAt ? formatDate(a.assignedAt) : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setIsCompanyAssigneesOpen(false)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold text-xs cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== CONTEXT MENU (CHUỘT PHẢI TRÊN BẢN QUYỀN) ==================== */}
      {contextMenu && (
        <div
          style={{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }}
          className="fixed z-50 min-w-[270px] max-w-[320px] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-purple-200/80 dark:border-purple-800/80 py-2 px-1.5 animate-in fade-in zoom-in-95 duration-100 divide-y divide-slate-100 dark:divide-slate-800 text-left"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-3 py-2">
            <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-purple-600 dark:text-purple-400">
              <Key className="w-3 h-3" />
              <span>Thao tác bản quyền</span>
            </div>
            <div className="text-xs font-black text-slate-800 dark:text-slate-100 truncate mt-0.5" title={contextMenu.group.name}>
              {contextMenu.group.name}
            </div>
            <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-500 font-medium">
              <span>{contextMenu.group.totalSeats} seats</span>
              <span>•</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">{contextMenu.group.remainingSeats} còn trống</span>
              {contextMenu.group.hasMultipleBatches && (
                <>
                  <span>•</span>
                  <span className="text-purple-600 font-bold">{contextMenu.group.batches.length} đợt</span>
                </>
              )}
            </div>
          </div>

          {/* Body actions */}
          <div className="py-1.5 space-y-0.5">
            {/* 1. Xuất Excel riêng */}
            <button
              type="button"
              onClick={() => {
                const grp = contextMenu.group;
                setContextMenu(null);
                handleExportSingleLicense(grp);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 rounded-xl transition-colors cursor-pointer text-left"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
              <div>
                <div className="font-bold">Xuất file Excel riêng phần mềm</div>
                <div className="text-[10px] text-emerald-600/70 font-normal">Ma trận cân đối & danh sách nhân sự</div>
              </div>
            </button>

            {/* 2. Xem chi tiết & đợt mua */}
            <button
              type="button"
              onClick={() => {
                const grp = contextMenu.group;
                setContextMenu(null);
                setSelectedDetailLicense({ ...grp.masterLicense, batches: grp.batches, allAssignments: grp.allAssignments, groupTotalSeats: grp.totalSeats });
                setIsDetailModalOpen(true);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-indigo-700 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 rounded-xl transition-colors cursor-pointer text-left"
            >
              <Eye className="w-4 h-4 text-indigo-600 shrink-0" />
              <div>
                <div className="font-bold">Xem chi tiết & Quản lý đợt mua</div>
                <div className="text-[10px] text-indigo-600/70 font-normal">Hợp đồng, chứng từ, lịch sử thanh toán</div>
              </div>
            </button>

            {/* 3. Cấp phát Seats */}
            <button
              type="button"
              onClick={() => {
                const grp = contextMenu.group;
                setContextMenu(null);
                handleOpenAssign({ ...grp.masterLicense, batches: grp.batches, allAssignments: grp.allAssignments, groupTotalSeats: grp.totalSeats });
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-purple-700 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/60 rounded-xl transition-colors cursor-pointer text-left"
            >
              <Users className="w-4 h-4 text-purple-600 shrink-0" />
              <div>
                <div className="font-bold">Cấp phát & Phân bổ Seats</div>
                <div className="text-[10px] text-purple-600/70 font-normal">Gán cho Nhân sự hoặc Máy tính</div>
              </div>
            </button>

            {/* 4. Mua thêm đợt mới */}
            <button
              type="button"
              onClick={() => {
                const grp = contextMenu.group;
                setContextMenu(null);
                handleOpenAddBatch(grp);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-purple-50 dark:hover:bg-purple-950/40 rounded-xl transition-colors cursor-pointer text-left"
            >
              <PackagePlus className="w-4 h-4 text-purple-600 shrink-0" />
              <div>
                <div className="font-bold">Mua bổ sung đợt mới (Add Batch)</div>
                <div className="text-[10px] text-slate-400 font-normal">Thêm đợt mua mới cho công ty thành viên</div>
              </div>
            </button>

            {/* 5. Chỉnh sửa */}
            {!contextMenu.group.hasMultipleBatches && (
              <button
                type="button"
                onClick={() => {
                  const grp = contextMenu.group;
                  setContextMenu(null);
                  handleOpenEdit(grp.masterLicense);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/60 rounded-xl transition-colors cursor-pointer text-left"
              >
                <Edit2 className="w-4 h-4 text-blue-600 shrink-0" />
                <div>
                  <div className="font-bold">Chỉnh sửa thông tin gói</div>
                  <div className="text-[10px] text-blue-600/70 font-normal">Sửa số seats, hạn dùng, license key</div>
                </div>
              </button>
            )}
          </div>

          {/* 6. Xóa */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => {
                const grp = contextMenu.group;
                setContextMenu(null);
                handleDeleteLicense(grp.id, grp.name);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/60 rounded-xl transition-colors cursor-pointer text-left"
            >
              <Trash2 className="w-4 h-4 text-rose-500 shrink-0" />
              <div>
                <div className="font-bold">Xóa gói bản quyền</div>
                <div className="text-[10px] text-rose-500/70 font-normal">Đưa vào Thùng rác (khôi phục trong 30 ngày)</div>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* ==================== MODAL: CỔNG TÍCH HỢP CLOUD (M365, GOOGLE, ADOBE) ==================== */}
      <LicenseIntegrationModal
        isOpen={isIntegrationModalOpen}
        onClose={() => setIsIntegrationModalOpen(false)}
        isEn={language === 'en'}
      />

    </div>
  );
}