'use client';

import { QuickLink } from '@/components/common/QuickLink';
import Link from 'next/link';
import { useLanguage } from '@/lib/i18n/context';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { fetchWithSwr } from '@/lib/client-cache';
import { getStoredBaseCurrency, getStoredCurrencies, convertCurrencyAmount } from '@/lib/currency-store';
import {
  Eye,
  Copy,
  Plus,
  Search,
  Key,
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
  Crown,
  Zap,
  MoreVertical,
  ExternalLink,
  Users,
  CheckCircle2,
  Download,
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
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  // Active Dropdown Action Menu
  const [activeDropdownLicenseId, setActiveDropdownLicenseId] = useState<string | null>(null);

  // Modals & Sheets
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingLicenseId, setEditingLicenseId] = useState<string | null>(null);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [activeLicense, setActiveLicense] = useState<any>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedDetailLicense, setSelectedDetailLicense] = useState<any>(null);

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
  const loadData = useCallback(async (forceMaster = false) => {
    try {
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
      });

      // 2. Fetch Assets with SWR Cache
      fetchWithSwr<any>('/api/assets?pageSize=300', (assetRes) => {
        if (assetRes && (assetRes.success || assetRes.data)) {
          setAssets(assetRes.data || assetRes.assets || []);
        }
      });

      // 3. Fetch Master Data with SWR Cache
      fetchWithSwr<any>('/api/master-data', (masterRes) => {
        if (masterRes?.data) {
          const md = masterRes.data;
          if (md.vendors) setVendors(md.vendors);
          if (md.users) setUsers(md.users);
          if (md.companies) setCompanies(md.companies);
        }
      });
    } catch (error) {
      console.error('Failed to load license data:', error);
      setLoading(false);
    }
  }, []);

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

    const now = new Date();
    const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    licenses.forEach((lic) => {
      totalSeats += lic.totalSeats || 1;
      usedSeats += lic.usedSeats || lic.assignments?.filter((a: any) => !a.revokedAt)?.length || 0;

      const rawPrice = Number(lic.purchasePrice) || 0;
      const cur = lic.purchaseCurrency || 'VND';
      const recordedRate = Number((lic as any).exchangeRate || (lic as any).specs?.exchangeRate);
      const effectiveRate = recordedRate && recordedRate > 0 ? recordedRate : (exchangeRatesMap[cur] || 1);
      const inVnd = rawPrice * effectiveRate;
      totalCostVnd += inVnd;

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
    };
  }, [licenses, selectedCurrency, exchangeRatesMap]);

  // ==================== FILTERED LICENSES ====================
  const filteredLicenses = useMemo(() => {
    const now = new Date();
    const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 1000);

    return licenses.filter((lic) => {
      // Search
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchName = lic.name?.toLowerCase().includes(q);
        const matchKey = lic.licenseKey?.toLowerCase().includes(q);
        const matchVendor = lic.vendor?.name?.toLowerCase().includes(q);
        const matchCompany = lic.companyName?.toLowerCase().includes(q);
        if (!matchName && !matchKey && !matchVendor && !matchCompany) return false;
      }

      // Type Filter
      if (selectedType && lic.licenseType !== selectedType) return false;

      // Status Filter
      if (selectedStatus && lic.status !== selectedStatus) return false;

      // Company Filter
      if (selectedCompany && lic.companyName !== selectedCompany) return false;

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
  }, [licenses, search, selectedType, selectedStatus, selectedCompany, selectedVendor, selectedExpiryFilter]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedType, selectedStatus, selectedCompany, selectedVendor, selectedExpiryFilter]);

  const totalFilteredLicenses = filteredLicenses.length;
  const totalPages = Math.max(1, Math.ceil(totalFilteredLicenses / pageSize));
  const paginatedLicenses = useMemo(() => {
    return filteredLicenses.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  }, [filteredLicenses, currentPage, pageSize]);

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
      licenseKey: lic.licenseKey || '',
      licenseType: lic.licenseType || 'PERPETUAL',
      totalSeats: lic.totalSeats || 1,
      purchaseDate: lic.purchaseDate ? new Date(lic.purchaseDate).toISOString().split('T')[0] : '',
      expiryDate: lic.expiryDate ? new Date(lic.expiryDate).toISOString().split('T')[0] : '',
      purchasePrice: lic.purchasePrice ? String(lic.purchasePrice) : '',
      purchaseCurrency: cur,
      exchangeRate: savedRate,
      companyName: lic.companyName || '',
      vendorId: lic.vendorId || '',
      contractNumber: lic.contractNumber || '',
      invoiceNumber: lic.invoiceNumber || '',
      contractUrl: lic.contractUrl || '',
      notes: lic.notes || '',
      pairs: initialPairs,
    });
    setModalActiveTab('general');
    setIsEditModalOpen(true);
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
          pairs: formData.pairs || [],
          specs: {
            paymentHistory: initialPaymentHistory,
          },
        }),
      });

      if (res.ok) {
        setIsAddModalOpen(false);
        loadData();
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
        loadData();
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
        loadData();
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
        loadData();
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
    if (!confirm(`Bạn có chắc chắn muốn xóa bản quyền "${name}"? Thao tác này không thể hoàn tác.`)) return;

    try {
      const res = await fetch(`/api/licenses/${id}`, { method: 'DELETE' });
      if (res.ok) {
        loadData();
      } else {
        const err = await res.json();
        alert(err.error || 'Xóa bản quyền thất bại');
      }
    } catch {
      alert('Lỗi kết nối khi xóa');
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
        loadData();
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
        loadData();
      }
    } catch {
      alert('Lỗi kết nối');
    }
  };

    // Export filtered licenses to rich Excel
  const handleExportExcel = async () => {
    if (filteredLicenses.length === 0) {
      alert('Không có bản quyền nào trong danh sách lọc để xuất');
      return;
    }
    try {
      const ExcelJS = await import('exceljs');
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Danh Sách Bản Quyền License', {
        views: [{ showGridLines: true }],
      });

      sheet.mergeCells('A1:L1');
      const titleCell = sheet.getCell('A1');
      titleCell.value = 'DANH SÁCH BẢN QUYỀN PHẦN MỀM & LICENSE IT';
      titleCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
      titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF6B21A8' } };
      titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
      sheet.getRow(1).height = 35;

      sheet.mergeCells('A2:L2');
      const subCell = sheet.getCell('A2');
      const filterCompanyText = selectedCompany ? ` | Công ty: ${selectedCompany}` : '';
      subCell.value = `Thời gian xuất: ${new Date().toLocaleString('vi-VN')} | Tổng số lượng: ${filteredLicenses.length} gói bản quyền lọc${filterCompanyText}`;
      subCell.font = { name: 'Arial', size: 10, italic: true, color: { argb: 'FF475569' } };
      subCell.alignment = { vertical: 'middle', horizontal: 'center' };
      sheet.getRow(2).height = 20;

      sheet.addRow([]);

      const headers = [
        'STT',
        'Tên Phần Mềm / Bản Quyền',
        'License Key / Mã Bản Quyền',
        'Loại License',
        'Trạng Thái',
        'Tổng Seats',
        'Đã Cấp',
        'Còn Trống',
        'Công Ty Quản Lý',
        'Người / Thiết Bị Sử Dụng (Kèm Phòng Ban)',
        'Hạn Sử Dụng',
        'Nhà Cung Cấp / Đối Tác',
      ];

      const headerRow = sheet.addRow(headers);
      headerRow.height = 26;
      headerRow.eachCell((cell) => {
        cell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF9333EA' } };
        cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
          bottom: { style: 'medium', color: { argb: 'FF581C87' } },
        };
      });

      filteredLicenses.forEach((lic, index) => {
        const activeAssignments = lic.assignments?.filter((a: any) => !a.revokedAt) || [];
        const used = lic.usedSeats || activeAssignments.length || 0;
        const remainingSeats = Math.max(0, (lic.totalSeats || 1) - used);

        const assignedTargets = activeAssignments
          .map((a: any) => {
            if (a.user) {
              const dept = a.user.department ? ` (${a.user.department})` : '';
              return `${a.user.fullName}${dept}`;
            }
            if (a.asset) {
              return `[Thiết bị: ${a.asset.assetTag} - ${a.asset.name}]`;
            }
            return '';
          })
          .filter(Boolean)
          .join('; ');

        let expiryText = 'Vĩnh viễn (Perpetual)';
        if (lic.expiryDate) {
          const isExp = new Date(lic.expiryDate).getTime() < Date.now();
          expiryText = `${new Date(lic.expiryDate).toLocaleDateString('vi-VN')}${isExp ? ' [ĐÃ HẾT HẠN]' : ''}`;
        }

        const row = sheet.addRow([
          index + 1,
          lic.name,
          lic.licenseKey || '—',
          lic.licenseType || 'PERPETUAL',
          lic.status === 'ACTIVE' ? 'Đang hoạt động' : lic.status === 'EXPIRED' ? 'Hết hạn' : lic.status,
          lic.totalSeats || 1,
          used,
          remainingSeats,
          lic.companyName || 'Toàn tập đoàn',
          assignedTargets || 'Chưa gán',
          expiryText,
          lic.vendor?.name || '—',
        ]);

        row.height = 24;
        row.alignment = { vertical: 'middle' };
        row.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
        row.getCell(4).alignment = { vertical: 'middle', horizontal: 'center' };
        row.getCell(5).alignment = { vertical: 'middle', horizontal: 'center' };
        row.getCell(6).alignment = { vertical: 'middle', horizontal: 'center' };
        row.getCell(7).alignment = { vertical: 'middle', horizontal: 'center' };
        row.getCell(8).alignment = { vertical: 'middle', horizontal: 'center' };
        row.getCell(11).alignment = { vertical: 'middle', horizontal: 'center' };

        if (index % 2 === 1) {
          row.eachCell((c) => {
            c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFAF5FF' } };
          });
        }
      });

      sheet.columns = [
        { width: 6 },
        { width: 32 },
        { width: 28 },
        { width: 16 },
        { width: 16 },
        { width: 12 },
        { width: 12 },
        { width: 12 },
        { width: 25 },
        { width: 38 },
        { width: 20 },
        { width: 25 },
      ];

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Danh_Sach_License_IT_${new Date().toISOString().split('T')[0]}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export licenses error:', err);
      alert('Xuất file Excel thất bại');
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
            onClick={handleExportExcel}
            className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-2xl text-xs font-bold border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 cursor-pointer transition-all"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            <span className="hidden sm:inline">{t('assets.export_excel', 'Xuất Excel')}</span>
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
          {/* Ô Tìm Kiếm */}
          <div className="lg:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
            <input
              type="text"
              placeholder={language === 'en' ? 'Search by software name, key, vendor...' : 'Tìm theo tên phần mềm, license key, NCC...'}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-semibold text-slate-800 dark:text-white placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* Loại */}
          <div>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-700 dark:text-slate-300 outline-none cursor-pointer"
            >
              <option value="">{language === 'en' ? '-- Type: All --' : '-- Loại: Tất cả --'}</option>
              <option value="PERPETUAL">{language === 'en' ? 'Perpetual' : 'Vĩnh viễn (Perpetual)'}</option>
              <option value="SUBSCRIPTION">{language === 'en' ? 'Subscription' : 'Thuê bao (Subscription)'}</option>
              <option value="OEM">{language === 'en' ? 'OEM (Pre-installed)' : 'OEM đi kèm máy'}</option>
              <option value="TRIAL">{language === 'en' ? 'Trial' : 'Dùng thử (Trial)'}</option>
              <option value="OPEN_SOURCE">{language === 'en' ? 'Open Source' : 'Mã nguồn mở'}</option>
            </select>
          </div>

          {/* Công ty */}
          <div>
            <select
              value={selectedCompany}
              onChange={(e) => setSelectedCompany(e.target.value)}
              className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-700 dark:text-slate-300 outline-none cursor-pointer"
            >
              <option value="">{language === 'en' ? '-- Company: All --' : '-- Công ty: Tất cả --'}</option>
              {companies.map((c) => (
                <option key={c} value={c}>
                  🏢 {c}
                </option>
              ))}
            </select>
          </div>

          {/* Nhà Cung Cấp */}
          <div>
            <select
              value={selectedVendor}
              onChange={(e) => setSelectedVendor(e.target.value)}
              className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-700 dark:text-slate-300 outline-none cursor-pointer"
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
              className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-700 dark:text-slate-300 outline-none cursor-pointer"
            >
              <option value="ALL">{language === 'en' ? '-- Expiry: All --' : '-- Hạn: Tất cả --'}</option>
              <option value="VALID">{language === 'en' ? '🟢 Active / Valid' : '🟢 Còn hạn sử dụng'}</option>
              <option value="EXPIRING">{language === 'en' ? '🟡 Expiring Soon (< 30d)' : '🟡 Sắp hết hạn (30 ngày)'}</option>
              <option value="EXPIRED">{language === 'en' ? '🔴 Expired' : '🔴 Đã hết hạn'}</option>
            </select>
          </div>
        </div>
      </div>

      {/* ==================== 4. BẢNG DỮ LIỆU DUAL-CURRENCY ==================== */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse min-w-[900px]">
            <thead className="bg-slate-50/90 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-700 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="py-2 px-2.5 sticky left-0 z-20 bg-slate-50 dark:bg-slate-800 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.06)] min-w-[155px]">{language === 'en' ? 'LICENSE NAME & KEY' : 'TÊN BẢN QUYỀN & KEY'}</th>
                <th className="py-2 px-2 min-w-[110px]">{language === 'en' ? 'TYPE & COMPANY' : 'LOẠI & CÔNG TY'}</th>
                <th className="py-2 px-2 min-w-[100px]">{language === 'en' ? 'SEATS ALLOCATION' : 'PHÂN BỐ SEATS'}</th>
                <th className="py-2 px-2 min-w-[95px]">{language === 'en' ? 'COST' : 'ĐỊNH GIÁ'} ({selectedCurrency})</th>
                <th className="py-2 px-2 min-w-[90px]">{language === 'en' ? 'EXPIRY' : 'HẠN DÙNG'}</th>
                <th className="py-2 px-2 min-w-[120px] max-w-[200px]">{language === 'en' ? 'VENDOR' : 'NHÀ CUNG CẤP'}</th>
                <th className="py-2 px-1.5 text-right sticky right-0 z-20 bg-slate-50 dark:bg-slate-800 shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.06)] min-w-[110px]">{language === 'en' ? 'ACTIONS' : 'THAO TÁC'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
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
                    <td className="py-2.5 px-2 text-right">
                      <div className="h-5 w-16 bg-slate-200 dark:bg-slate-800 rounded-lg ml-auto" />
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
                paginatedLicenses.map((lic) => {
                  const used = lic.usedSeats || lic.assignments?.filter((a: any) => !a.revokedAt)?.length || 0;
                  const total = lic.totalSeats || 1;
                  const seatPercent = Math.min(100, Math.round((used / total) * 100));

                  const rawPrice = Number(lic.purchasePrice) || 0;
                  const origCurr = lic.purchaseCurrency || 'VND';
                  const convertedDisplayPrice = convertCurrency(rawPrice, origCurr, selectedCurrency);

                  const isExpired = lic.expiryDate && new Date(lic.expiryDate) < new Date();
                  const isExpiring =
                    lic.expiryDate &&
                    !isExpired &&
                    new Date(lic.expiryDate) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

                  return (
                    <tr
                      key={lic.id}
                      onClick={() => {
                        setSelectedDetailLicense(lic);
                        setIsDetailModalOpen(true);
                      }}
                      className="hover:bg-purple-50/40 dark:hover:bg-purple-950/30 transition-all group cursor-pointer"
                      title="Nhấp vào dòng để xem nhanh chi tiết bản quyền"
                    >
                      {/* Name & Key (Sticky Left - 2 lines) */}
                      <td className="py-2 px-2.5 sticky left-0 z-10 bg-white dark:bg-slate-900 group-hover:bg-purple-50/90 dark:group-hover:bg-slate-800/90 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.06)] transition-colors min-w-[155px]">
                        <div className="flex items-start gap-1.5">
                          <span className="font-extrabold text-slate-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors text-[11px] leading-snug line-clamp-2">
                            {lic.name}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedDetailLicense(lic);
                              setIsDetailModalOpen(true);
                            }}
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/40 rounded cursor-pointer shrink-0 mt-0.5"
                            title="Xem nhanh chi tiết"
                          >
                            <Eye className="w-3 h-3" />
                          </button>
                        </div>
                        {lic.licenseKey ? (
                          <div className="flex items-center gap-1 mt-0.5">
                            <code className="px-1 py-0.2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono text-[9.5px] rounded border border-slate-200 dark:border-slate-700 truncate max-w-[120px]">
                              {lic.licenseKey}
                            </code>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopyKey(lic.licenseKey, lic.id);
                              }}
                              className="text-slate-400 hover:text-purple-600 p-0.5 rounded cursor-pointer shrink-0"
                              title="Sao chép key"
                            >
                              {copiedKeyId === lic.id ? (
                                <Check className="w-2.8 h-2.8 text-emerald-600 stroke-[3]" />
                              ) : (
                                <Copy className="w-2.8 h-2.8" />
                              )}
                            </button>
                          </div>
                        ) : (
                          <span className="text-[9px] text-slate-400 italic block mt-0.5">Không có Key</span>
                        )}
                      </td>

                      {/* Type & Company (2 lines) */}
                      <td className="py-2 px-2 min-w-[110px]">
                        <span className="px-1.5 py-0.2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-[9px] rounded border border-slate-200 dark:border-slate-700 inline-block leading-tight">
                          {lic.licenseType || 'PERPETUAL'}
                        </span>
                        <span className="text-[9.5px] text-slate-500 block mt-0.5 leading-tight line-clamp-2 font-medium" title={lic.companyName || 'Toàn tập đoàn'}>
                          🏢 {lic.companyName || 'Toàn tập đoàn'}
                        </span>
                      </td>

                      {/* Seats Progress Bar */}
                      <td className="py-2 px-2 min-w-[100px]">
                        <div className="flex items-center justify-between text-[10px] font-bold mb-0.5">
                          <span className={used >= total ? 'text-rose-600' : 'text-slate-800 dark:text-slate-200'}>
                            {used}/{total}
                          </span>
                          <span className="text-[9px] font-mono text-slate-400">{seatPercent}%</span>
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
                      </td>

                      {/* Dual-Currency Pricing */}
                      <td className="py-2 px-2 min-w-[95px]">
                        {rawPrice > 0 ? (
                          <div className="space-y-0.5">
                            <span className="font-extrabold text-slate-900 dark:text-white font-mono text-[11px] block leading-tight">
                              {formatPrice(convertedDisplayPrice, selectedCurrency)}
                            </span>
                            {origCurr !== selectedCurrency && (
                              <span className="text-[8.5px] text-slate-400 block font-mono leading-tight">
                                Gốc: {formatPrice(rawPrice, origCurr)}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-[9.5px]">Miễn phí</span>
                        )}
                      </td>

                      {/* Expiry Date */}
                      <td className="py-2 px-2 min-w-[90px]">
                        {lic.expiryDate ? (
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
                              <span>{formatDate(lic.expiryDate)}</span>
                            </span>
                            <span className="text-[8.5px] text-slate-400 block font-mono">
                              {getRemainingTimeText(lic.expiryDate).text}
                            </span>
                          </div>
                        ) : (
                          <span className="px-1.5 py-0.2 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded font-bold text-[9px]">
                            ♾️ Vô hạn
                          </span>
                        )}
                      </td>

                      {/* Vendor (2-3 lines) */}
                      <td className="py-2 px-2 min-w-[120px] max-w-[200px] text-slate-700 dark:text-slate-300 font-medium text-[10px] leading-snug" onClick={(e) => e.stopPropagation()}>
                        {lic.vendor ? (
                          <QuickLink
                            type="vendor"
                            id={lic.vendor.id || lic.vendor.name}
                            label={lic.vendor.name}
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

                      {/* Actions (Sticky Right - All Icons Direct) */}
                      <td
                        className="py-2 px-1.5 text-right sticky right-0 z-10 bg-white dark:bg-slate-900 group-hover:bg-purple-50/90 dark:group-hover:bg-slate-800/90 shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.06)] transition-colors min-w-[110px]"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-end gap-1 shrink-0">
                          {/* 1. Sửa */}
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(lic)}
                            title="Chỉnh sửa hồ sơ bản quyền"
                            className="p-1 text-blue-600 dark:text-blue-400 hover:bg-blue-100/70 dark:hover:bg-blue-950 rounded-md transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* 2. Cấp phát */}
                          <button
                            type="button"
                            onClick={() => handleOpenAssign(lic)}
                            title="Cấp phát & quản lý phân bổ seats"
                            className="p-1 text-purple-600 dark:text-purple-400 hover:bg-purple-100/70 dark:hover:bg-purple-950 rounded-md transition-colors cursor-pointer"
                          >
                            <Users className="w-3.5 h-3.5" />
                          </button>

                          {/* 3. Xem chi tiết */}
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedDetailLicense(lic);
                              setIsDetailModalOpen(true);
                            }}
                            title="Xem chi tiết bản quyền"
                            className="p-1 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100/70 dark:hover:bg-indigo-950 rounded-md transition-colors cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* 4. Xóa */}
                          <button
                            type="button"
                            onClick={() => handleDeleteLicense(lic.id, lic.name)}
                            title="Xóa bản quyền này"
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

      {/* ==================== MODAL 1: THÊM MỚI / SỬA BẢN QUYỀN (4 TABS) ==================== */}
      {(isAddModalOpen || isEditModalOpen) && (() => {
        const isEditing = isEditModalOpen;
        const currentForm = isEditing ? editFormData : formData;
        const setCurrentForm = isEditing ? setEditFormData : setFormData;
        const handleSubmit = isEditing ? handleSaveEdit : handleSaveAdd;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
            <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-6xl w-full flex flex-col max-h-[92vh] border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-900 text-white rounded-t-3xl shrink-0">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="p-1.5 bg-purple-600 text-white rounded-xl shadow-xs shrink-0">
                    <Key className="w-4 h-4" />
                  </span>
                  <h3 className="font-extrabold text-sm text-white">
                    {isEditing ? `Chỉnh Sửa Bản Quyền: ${currentForm.name}` : 'Thêm Bản Quyền Phần Mềm Mới'}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (isEditing) setIsEditModalOpen(false);
                    else setIsAddModalOpen(false);
                  }}
                  className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* 4 TABS Navigation */}
              <div className="flex items-center px-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 shrink-0 overflow-x-auto">
                {(() => {
                  const pairs = currentForm.pairs || [];
                  const usedCount = calculateAssignedSeats(pairs);
                  const totalCount = Number(currentForm.totalSeats) || 1;

                  const tabList = [
                    { key: 'general', label: '1. Thông tin chung', icon: Key },
                    { key: 'finance', label: '2. Tài chính & Hợp đồng', icon: DollarSign },
                    { key: 'settings', label: '3. Ghi chú & Cảnh báo', icon: ShieldCheck },
                    {
                      key: 'assignees',
                      label: '4. Phân Bổ & Gán Sử Dụng',
                      icon: Users,
                      badge: `${usedCount}/${totalCount}`,
                    },
                  ];

                  return tabList.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = modalActiveTab === tab.key;
                    return (
                      <button
                        key={tab.key}
                        type="button"
                        onClick={() => setModalActiveTab(tab.key as any)}
                        className={`flex items-center gap-2 py-3 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer shrink-0 ${
                          isActive
                            ? 'border-purple-600 text-purple-600 dark:text-purple-400 bg-white dark:bg-slate-800/80 shadow-2xs'
                            : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span>{tab.label}</span>
                        {tab.badge && (
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10.5px] font-mono font-bold ${
                              usedCount > totalCount
                                ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                                : usedCount === totalCount
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                : 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300'
                            }`}
                          >
                            {tab.badge}
                          </span>
                        )}
                      </button>
                    );
                  });
                })()}
              </div>

              {/* Body */}
              <form id="license-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
                {/* TAB 1: THÔNG TIN CHUNG */}
                {modalActiveTab === 'general' && (
                  <div className="space-y-4 animate-in fade-in duration-100">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Tên phần mềm (*):
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="VD: Microsoft 365 Business Standard, Adobe CC..."
                          value={currentForm.name}
                          onChange={(e) => setCurrentForm({ ...currentForm, name: e.target.value })}
                          className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          License Key / Serial:
                        </label>
                        <input
                          type="text"
                          placeholder="XXXXX-XXXXX-XXXXX-XXXXX"
                          value={currentForm.licenseKey}
                          onChange={(e) => setCurrentForm({ ...currentForm, licenseKey: e.target.value })}
                          className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Loại bản quyền (*):
                        </label>
                        <select
                          value={currentForm.licenseType}
                          onChange={(e) => setCurrentForm({ ...currentForm, licenseType: e.target.value })}
                          className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold outline-none cursor-pointer"
                        >
                          <option value="PERPETUAL">{language === 'en' ? 'Perpetual' : 'Vĩnh viễn (Perpetual)'}</option>
                          <option value="SUBSCRIPTION">Thuê bao định kỳ (Subscription)</option>
                          <option value="OEM">OEM (Đi kèm phần cứng máy)</option>
                          <option value="TRIAL">{language === 'en' ? 'Trial' : 'Dùng thử (Trial)'}</option>
                          <option value="OPEN_SOURCE">Mã nguồn mở (Open Source)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Tổng số Seats (Số người / máy tối đa) (*):
                        </label>
                        <input
                          type="number"
                          min={1}
                          required
                          value={currentForm.totalSeats}
                          onChange={(e) => setCurrentForm({ ...currentForm, totalSeats: e.target.value })}
                          className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-black outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                    </div>

                    {/* Section: Đơn vị & Nhà cung cấp */}
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl space-y-3">
                      <span className="text-xs font-extrabold text-slate-800 dark:text-white uppercase tracking-wider block">
                        Đơn vị & Nhà cung cấp
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Công ty quản lý:
                          </label>
                          <select
                            value={currentForm.companyName}
                            onChange={(e) => setCurrentForm({ ...currentForm, companyName: e.target.value })}
                            className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs outline-none cursor-pointer"
                          >
                            <option value="">-- Toàn tập đoàn / Chung --</option>
                            {companies.map((c) => (
                              <option key={c} value={c}>
                                🏢 {c}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Nhà cung cấp / Đối tác bán lẻ:
                          </label>
                          <select
                            value={currentForm.vendorId}
                            onChange={(e) => setCurrentForm({ ...currentForm, vendorId: e.target.value })}
                            className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs outline-none cursor-pointer"
                          >
                            <option value="">-- Chọn nhà cung cấp --</option>
                            {vendors.map((v) => (
                              <option key={v.id} value={v.id}>
                                🤝 {v.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 2: TÀI CHÍNH & HỢP ĐỒNG */}
                {modalActiveTab === 'finance' && (
                  <div className="space-y-4 animate-in fade-in duration-100">
                    <div className="p-4 bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 rounded-2xl space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-extrabold text-purple-950 dark:text-purple-200 uppercase tracking-wide flex items-center gap-1.5">
                          <DollarSign className="w-4 h-4 text-purple-600" />
                          <span>1. Định giá & Tiền tệ hóa đơn gốc (Ngoại tệ)</span>
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

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-start">
                        {/* Giá mua hóa đơn gốc with dot separators & foreign words */}
                        <div>
                          <CurrencyInput
                            label="Giá mua hóa đơn gốc (*)"
                            value={currentForm.purchasePrice}
                            onChange={(val) => setCurrentForm({ ...currentForm, purchasePrice: val })}
                            currency={currentForm.purchaseCurrency || 'VND'}
                            currencyName={currencies.find((c) => c.code === (currentForm.purchaseCurrency || 'VND'))?.name}
                            exchangeRate={currentForm.exchangeRate || exchangeRatesMap[currentForm.purchaseCurrency || 'VND'] || 1}
                            placeholder="VD: 1.000"
                          />
                        </div>

                        {/* Loại tiền tệ gốc */}
                        <div>
                          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                            Loại tiền tệ gốc
                          </label>
                          <select
                            value={currentForm.purchaseCurrency || 'VND'}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === '__ADD_NEW__') {
                                setIsAddCurrencyModalOpen(true);
                                return;
                              }
                              const found = currencies.find((c) => c.code === val);
                              setCurrentForm({
                                ...currentForm,
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
                            <option value="__ADD_NEW__" className="text-purple-600 font-bold">
                              ➕ Thêm đồng tiền khác...
                            </option>
                          </select>
                        </div>

                        {/* Tỷ giá quy đổi cơ sở */}
                        <div>
                          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                            Tỷ giá hạch toán (1 {currentForm.purchaseCurrency || 'VND'} = ? VNĐ)
                          </label>
                          <input
                            type="number"
                            value={currentForm.exchangeRate || exchangeRatesMap[currentForm.purchaseCurrency || 'VND'] || 1}
                            onChange={(e) => setCurrentForm({ ...currentForm, exchangeRate: Number(e.target.value) })}
                            className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono font-bold outline-none"
                          />
                        </div>
                      </div>

                      {/* KHỐI 2: Ô GIÁ TIỀN QUY CHUẨN VNĐ RIÊNG & BẰNG CHỮ RÕ RÀNG */}
                      {(() => {
                        const numVal = Number(String(currentForm.purchasePrice).replace(/\D/g, '')) || 0;
                        const curr = currentForm.purchaseCurrency || 'VND';
                        const rate = currentForm.exchangeRate || exchangeRatesMap[curr] || 1;
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

                      {/* AI & Rate Reference Timestamp (1 dòng nhỏ gọn) */}
                      <div className="p-2 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 rounded-xl flex items-center gap-1.5 text-[10.5px] text-purple-900 dark:text-purple-200 font-medium">
                        <Clock className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 shrink-0" />
                        <span>Tỷ giá tham chiếu hạch toán cập nhật: 25/08/2026 (Theo Vietcombank / Tỷ giá hạch toán)</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Ngày mua / kích hoạt:
                        </label>
                        <input
                          type="date"
                          value={currentForm.purchaseDate}
                          onChange={(e) => setCurrentForm({ ...currentForm, purchaseDate: e.target.value })}
                          className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Hạn hết hạn (Để trống nếu Vô thời hạn):
                        </label>
                        <input
                          type="date"
                          value={currentForm.expiryDate}
                          onChange={(e) => setCurrentForm({ ...currentForm, expiryDate: e.target.value })}
                          className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Số Hợp Đồng / PO:
                        </label>
                        <input
                          type="text"
                          placeholder="VD: HD-MS-2026-01"
                          value={currentForm.contractNumber}
                          onChange={(e) => setCurrentForm({ ...currentForm, contractNumber: e.target.value })}
                          className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Link chứng từ / Hợp đồng đính kèm:
                        </label>
                        <input
                          type="text"
                          placeholder="https://... đường dẫn file hợp đồng"
                          value={currentForm.contractUrl}
                          onChange={(e) => setCurrentForm({ ...currentForm, contractUrl: e.target.value })}
                          className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs outline-none"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 3: GHI CHÚ & CẢNH BÁO */}
                {modalActiveTab === 'settings' && (
                  <div className="space-y-4 animate-in fade-in duration-100">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Ghi chú nội bộ quản trị:
                      </label>
                      <textarea
                        rows={4}
                        placeholder="Ghi chú về tài khoản admin quản lý, email đăng ký, hotline hỗ trợ của hãng..."
                        value={currentForm.notes}
                        onChange={(e) => setCurrentForm({ ...currentForm, notes: e.target.value })}
                        className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs outline-none"
                      />
                    </div>
                  </div>
                )}

                {/* TAB 4: PHÂN BỔ & GÁN SỬ DỤNG */}
                {modalActiveTab === 'assignees' && (() => {
                  const pairs = currentForm.pairs || [];
                  const usedCount = calculateAssignedSeats(pairs);
                  const totalCount = Number(currentForm.totalSeats) || 1;
                  const remainingCount = Math.max(0, totalCount - usedCount);
                  const isOverLimit = usedCount > totalCount;
                  const isFull = usedCount === totalCount;

                  const handleAddPair = () => {
                    const newPairs = [
                      ...pairs,
                      {
                        userId: '',
                        assetId: '',
                        assignedAt: new Date().toISOString().split('T')[0],
                        notes: '',
                      },
                    ];
                    setCurrentForm({ ...currentForm, pairs: newPairs });
                  };

                  const handleRemovePair = (index: number) => {
                    const newPairs = pairs.filter((_: any, idx: number) => idx !== index);
                    setCurrentForm({ ...currentForm, pairs: newPairs });
                  };

                  const handleUpdatePair = (index: number, field: string, value: any) => {
                    const newPairs = [...pairs];
                    newPairs[index] = { ...newPairs[index], [field]: value };

                    // Auto switch userId when assetId is selected, or clear if unassigned
                    if (field === 'assetId') {
                      if (value) {
                        const selectedAsset = assets.find((a) => a.id === value);
                        const activeAsg = selectedAsset?.assignments?.find((a: any) => !a.returnedAt);
                        const foundUserId = activeAsg?.user?.id || (selectedAsset as any)?.userId || '';
                        newPairs[index].userId = foundUserId || '';
                      } else {
                        newPairs[index].userId = '';
                      }
                    }

                    setCurrentForm({ ...currentForm, pairs: newPairs });
                  };

                  return (
                    <div className="space-y-4 animate-in fade-in duration-100">
                      {/* Quota Header Card */}
                      <div className={`p-4 rounded-2xl border transition-all ${
                        isOverLimit
                          ? 'bg-rose-50/80 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800'
                          : isFull
                          ? 'bg-amber-50/80 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800'
                          : 'bg-purple-50/70 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800'
                      }`}>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white flex items-center gap-1.5">
                                <Users className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                                <span>Hạn mức Seats Bản Quyền:</span>
                              </span>
                              <span className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-black ${
                                isOverLimit
                                  ? 'bg-rose-600 text-white'
                                  : isFull
                                  ? 'bg-amber-500 text-white'
                                  : 'bg-emerald-600 text-white'
                              }`}>
                                Đã gán: {usedCount} / {totalCount} Seats
                              </span>
                              <span className="text-xs text-slate-600 dark:text-slate-300 font-semibold">
                                (Còn trống: <strong className={remainingCount === 0 ? 'text-rose-600' : 'text-emerald-600'}>{remainingCount}</strong> seats)
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">
                              💡 1 Người dùng có thể gán nhiều Thiết bị khác nhau. Hệ thống tự động nhận diện thiết bị & nhân sự sở hữu.
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={handleAddPair}
                            className="px-3.5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm flex items-center justify-center gap-1.5 cursor-pointer shrink-0 active:scale-95 transition-all"
                          >
                            <UserPlus className="w-3.5 h-3.5" />
                            <span>+ Thêm Cấp Phát / Gán Mới</span>
                          </button>
                        </div>

                        {isOverLimit && (
                          <div className="mt-2.5 p-2.5 bg-rose-100/80 dark:bg-rose-900/40 rounded-xl border border-rose-300 dark:border-rose-800 text-[11px] text-rose-800 dark:text-rose-200 font-bold flex items-center gap-1.5">
                            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                            <span>Cảnh báo: Số lượng cấp phát ({usedCount}) đã vượt quá tổng số Seats tối đa ({totalCount})! Hãy tăng tổng số seats ở Tab 1 hoặc gỡ bớt người dùng.</span>
                          </div>
                        )}
                      </div>

                      {/* Bảng Danh Sách Gán (Assignees Table) */}
                      <div className="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden bg-white dark:bg-slate-900 shadow-2xs">
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-[11px] uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                                <th className="p-3 pl-4 min-w-[220px]">💻 Chọn Thiết Bị</th>
                                <th className="p-3 min-w-[200px]">👤 Người Sử Dụng</th>
                                <th className="p-3 min-w-[160px]">📅 Ngày Gán & Trạng Thái</th>
                                <th className="p-3 pr-4 text-center w-16">Thao Tác</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                              {pairs.length === 0 ? (
                                <tr>
                                  <td colSpan={4} className="p-8 text-center text-slate-400 space-y-2">
                                    <Users className="w-7 h-7 mx-auto text-slate-300 dark:text-slate-600" />
                                    <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                                      Chưa có thiết bị hoặc nhân sự nào được phân bổ cho bản quyền này
                                    </p>
                                    <button
                                      type="button"
                                      onClick={handleAddPair}
                                      className="px-3 py-1.5 bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 rounded-xl text-xs font-bold hover:bg-purple-100 cursor-pointer"
                                    >
                                      + Thêm lượt cấp phát đầu tiên
                                    </button>
                                  </td>
                                </tr>
                              ) : (
                                pairs.map((pair: any, idx: number) => {
                                  // Exclude assets already selected in OTHER rows of this license
                                  const alreadySelectedAssetIds = new Set(
                                    pairs.filter((p: any, i: number) => i !== idx && p.assetId).map((p: any) => p.assetId)
                                  );
                                  const availableAssets = assets.filter((a) => !alreadySelectedAssetIds.has(a.id) || a.id === pair.assetId);

                                  return (
                                    <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                                      {/* Cột 1: Thiết Bị */}
                                      <td className="p-2.5 pl-4">
                                        <select
                                          value={pair.assetId || ''}
                                          onChange={(e) => handleUpdatePair(idx, 'assetId', e.target.value)}
                                          className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
                                        >
                                          <option value="">-- Không gán theo thiết bị cụ thể --</option>
                                          {availableAssets.map((a) => {
                                            const currentHolder = a.assignments?.find((asg: any) => !asg.returnedAt)?.user;
                                            return (
                                              <option key={a.id} value={a.id}>
                                                💻 [{a.assetTag}] {a.name} ({a.brand || ''}) {currentHolder ? `• Đang dùng: ${currentHolder.fullName}` : '• (Trong kho)'}
                                              </option>
                                            );
                                          })}
                                        </select>
                                      </td>

                                      {/* Cột 2: Người Sử Dụng */}
                                      <td className="p-2.5">
                                        <select
                                          value={pair.userId || ''}
                                          onChange={(e) => handleUpdatePair(idx, 'userId', e.target.value)}
                                          className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
                                        >
                                          <option value="">-- Không gán theo nhân sự cụ thể --</option>
                                          {users.map((u) => (
                                            <option key={u.id} value={u.id}>
                                              👤 {u.fullName} {u.department ? `(${u.department})` : ''}
                                            </option>
                                          ))}
                                        </select>
                                      </td>

                                      {/* Cột 3: Ngày Gán & Trạng Thái */}
                                      <td className="p-2.5">
                                        <div className="flex items-center gap-2">
                                          <input
                                            type="date"
                                            value={pair.assignedAt ? pair.assignedAt.split('T')[0] : ''}
                                            onChange={(e) => handleUpdatePair(idx, 'assignedAt', e.target.value)}
                                            className="p-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none font-mono"
                                          />
                                          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-md text-[10px] font-bold shrink-0">
                                            🟢 Đang hoạt động
                                          </span>
                                        </div>
                                      </td>

                                      {/* Cột 4: Thao Tác (Xóa) */}
                                      <td className="p-2.5 pr-4 text-center">
                                        <button
                                          type="button"
                                          onClick={() => handleRemovePair(idx)}
                                          className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/60 rounded-xl transition-colors cursor-pointer"
                                          title="Xóa dòng gán này"
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </button>
                                      </td>
                                    </tr>
                                  );
                                })
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </form>

              {/* Footer */}
              <div className="flex items-center justify-between px-6 py-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 rounded-b-3xl shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    if (isEditing) setIsEditModalOpen(false);
                    else setIsAddModalOpen(false);
                  }}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 cursor-pointer"
                >
                  Hủy (Esc)
                </button>

                <button
                  type="submit"
                  form="license-form"
                  className="px-5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>{isEditing ? 'Lưu Thay Đổi' : 'Tạo Bản Quyền'}</span>
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ==================== MODAL 2: CẤP PHÁT & THU HỒI SEATS (SPLIT-VIEW 2 CỘT) ==================== */}
      {isAssignModalOpen && activeLicense && (() => {
        const assignments = activeLicense.assignments?.filter((a: any) => !a.revokedAt) || [];
        const used = assignments.length;
        const total = activeLicense.totalSeats || 1;
        const remaining = Math.max(0, total - used);

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
            <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-5xl w-full flex flex-col max-h-[92vh] border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-900 text-white rounded-t-3xl shrink-0">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="p-1.5 bg-purple-600 text-white rounded-xl shadow-xs shrink-0">
                    <Users className="w-4 h-4" />
                  </span>
                  <div>
                    <h3 className="font-extrabold text-sm text-white">
                      Phân Bổ & Thu Hồi Seats: {activeLicense.name}
                    </h3>
                    <p className="text-xs text-slate-400">
                      Đã cấp: <strong className="text-white">{used}/{total}</strong> seats • Còn trống:{' '}
                      <strong className="text-emerald-400">{remaining}</strong> seats
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAssignModalOpen(false)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Split-View Body */}
              <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left Column (5/12): Form cấp phát mới */}
                <div className="lg:col-span-5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl p-4.5 space-y-3.5 flex flex-col justify-between">
                  <div className="space-y-3">
                    <h4 className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-200 dark:border-slate-700 pb-2">
                      <UserPlus className="w-3.5 h-3.5 text-purple-600" />
                      <span>Cấp phát seat cho người dùng / máy mới:</span>
                    </h4>

                    {/* Cảnh báo nếu cấp vượt hạn mức nhưng VẪN CHO PHÉP CẤP */}
                    {used >= total && (
                      <div className="p-3 bg-amber-50/90 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 rounded-2xl text-xs text-amber-900 dark:text-amber-200 font-medium space-y-1 animate-in fade-in">
                        <p className="font-bold flex items-center gap-1.5 text-amber-800 dark:text-amber-300">
                          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                          <span>Cảnh báo: Bản quyền đã đạt/vượt hạn mức ({used}/{total} Seats)</span>
                        </p>
                        <p className="text-[11px] text-amber-700 dark:text-amber-300">
                          💡 Hệ thống vẫn cho phép bạn cấp phát thêm seat (Over-allocated) và tự động ghi nhận cảnh báo trên hệ thống.
                        </p>
                      </div>
                    )}

                    <form id="assign-seat-form" onSubmit={handleAssignSeat} className="space-y-3">
                      {/* Hướng dẫn gán linh hoạt */}
                      <div className="p-2 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 rounded-xl text-[11px] text-purple-900 dark:text-purple-200">
                        <span>💡 Cho phép gán cho <b>Nhân viên</b>, gán vào <b>Máy tính</b>, hoặc gán cả hai.</span>
                      </div>

                      {/* Chọn Máy tính / Thiết bị (Kèm ô tìm kiếm & lọc máy chưa gán) */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                            💻 Thiết bị cài đặt bản quyền:
                          </label>
                          {assignAssetId && (
                            <button
                              type="button"
                              onClick={() => {
                                setAssignAssetId('');
                                setAssignUserId('');
                              }}
                              className="text-[10.5px] font-bold text-rose-500 hover:underline cursor-pointer"
                            >
                              ✕ Bỏ chọn máy
                            </button>
                          )}
                        </div>

                        {/* Ô tìm kiếm thiết bị */}
                        <div className="relative">
                          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                          <input
                            type="text"
                            placeholder="🔍 Gõ mã tag, tên máy, model, người đang dùng..."
                            value={assignAssetSearch}
                            onChange={(e) => setAssignAssetSearch(e.target.value)}
                            className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-purple-500 placeholder:text-slate-400 text-slate-800 dark:text-white font-medium"
                          />
                        </div>

                        {(() => {
                          const assignedAssetIdsInLic = new Set(
                            assignments.filter((a: any) => a.assetId).map((a: any) => a.assetId)
                          );
                          const availableAssetsForAssign = assets.filter((a) => {
                            if (assignedAssetIdsInLic.has(a.id)) return false;
                            if (!assignAssetSearch.trim()) return true;
                            const q = assignAssetSearch.toLowerCase();
                            const currentHolder = a.assignments?.find((asg: any) => !asg.returnedAt)?.user;
                            return (
                              (a.assetTag || '').toLowerCase().includes(q) ||
                              (a.name || '').toLowerCase().includes(q) ||
                              (a.brand || '').toLowerCase().includes(q) ||
                              (a.model || '').toLowerCase().includes(q) ||
                              (currentHolder?.fullName || '').toLowerCase().includes(q)
                            );
                          });

                          return (
                            <select
                              size={Math.min(5, Math.max(3, availableAssetsForAssign.length + 1))}
                              value={assignAssetId}
                              onChange={(e) => {
                                const newAId = e.target.value;
                                setAssignAssetId(newAId);
                                if (newAId) {
                                  const selectedA = assets.find((a) => a.id === newAId);
                                  const holder = selectedA?.assignments?.find((asg: any) => !asg.returnedAt)?.user;
                                  if (holder) {
                                    // Tự đổi sang người đang sở hữu thiết bị đó
                                    setAssignUserId(holder.id);
                                  } else {
                                    // Thiết bị chưa gán ai (trong kho) -> tự động bỏ trống
                                    setAssignUserId('');
                                  }
                                } else {
                                  setAssignUserId('');
                                }
                              }}
                              className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer overflow-y-auto"
                            >
                              <option value="">-- Không gán theo thiết bị (Chỉ gán người dùng) --</option>
                              {availableAssetsForAssign.map((a) => {
                                const currentHolder = a.assignments?.find((asg: any) => !asg.returnedAt)?.user;
                                return (
                                  <option key={a.id} value={a.id} className="py-1">
                                    💻 [{a.assetTag}] {a.name} ({a.brand || ''}) {currentHolder ? `• Đang dùng: ${currentHolder.fullName}` : '• (Trong kho / Chưa gán)'}
                                  </option>
                                );
                              })}
                            </select>
                          );
                        })()}
                      </div>

                      {/* Chọn Nhân sự (Kèm ô tìm kiếm) */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                            👤 Nhân viên nhận bản quyền:
                          </label>
                          {assignUserId && (
                            <button
                              type="button"
                              onClick={() => setAssignUserId('')}
                              className="text-[10.5px] font-bold text-rose-500 hover:underline cursor-pointer"
                            >
                              ✕ Bỏ chọn nhân viên
                            </button>
                          )}
                        </div>

                        {/* Ô tìm kiếm nhân sự */}
                        <div className="relative">
                          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                          <input
                            type="text"
                            placeholder="🔍 Gõ tên nhân viên, phòng ban, email..."
                            value={assignUserSearch}
                            onChange={(e) => setAssignUserSearch(e.target.value)}
                            className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-purple-500 placeholder:text-slate-400 text-slate-800 dark:text-white font-medium"
                          />
                        </div>

                        {(() => {
                          const filteredUsers = users.filter((u) => {
                            if (!assignUserSearch.trim()) return true;
                            const q = assignUserSearch.toLowerCase();
                            return (
                              (u.fullName || '').toLowerCase().includes(q) ||
                              (u.email || '').toLowerCase().includes(q) ||
                              (u.department || '').toLowerCase().includes(q)
                            );
                          });

                          return (
                            <select
                              size={Math.min(5, Math.max(3, filteredUsers.length + 1))}
                              value={assignUserId}
                              onChange={(e) => setAssignUserId(e.target.value)}
                              className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer overflow-y-auto"
                            >
                              <option value="">-- Không gán theo nhân viên (Chỉ gán máy tính) --</option>
                              {filteredUsers.map((u) => (
                                <option key={u.id} value={u.id} className="py-1">
                                  👤 {u.fullName} {u.department ? `(${u.department})` : ''} - {u.email}
                                </option>
                              ))}
                            </select>
                          );
                        })()}
                      </div>

                      {/* Ghi chú */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Ghi chú cấp phát:
                        </label>
                        <textarea
                          rows={2}
                          placeholder="Ghi chú mục đích sử dụng..."
                          value={assignNotes}
                          onChange={(e) => setAssignNotes(e.target.value)}
                          className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                    </form>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      form="assign-seat-form"
                      disabled={isSubmittingAssign}
                      className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-95"
                    >
                      {isSubmittingAssign ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      )}
                      <span>Xác Nhận Cấp Phát Seat</span>
                    </button>
                  </div>
                </div>

                {/* Right Column (7/12): Danh sách người đang giữ */}
                <div className="lg:col-span-7 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-purple-600" />
                      <span>Danh sách nhân sự & thiết bị đang sử dụng ({assignments.length}):</span>
                    </h4>
                  </div>

                  {assignments.length === 0 ? (
                    <div className="text-center py-16 bg-slate-50 dark:bg-slate-800/30 border border-dashed border-slate-200 dark:border-slate-700 rounded-2xl space-y-1.5">
                      <Users className="w-8 h-8 text-slate-300 mx-auto" />
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Chưa có seat nào được cấp phát
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Chọn nhân sự ở cột bên trái để phân bổ seat đầu tiên.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
                      {assignments.map((asg: any) => (
                        <div
                          key={asg.id}
                          className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xs flex items-center justify-between gap-3"
                        >
                          <div className="space-y-0.5 flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              {asg.user?.id ? (
                                <QuickLink
                                  type="user"
                                  id={asg.user.id}
                                  label={asg.user.fullName}
                                  subLabel={asg.user.department}
                                  icon="👤"
                                  className="font-bold text-xs text-slate-900 dark:text-white truncate"
                                />
                              ) : (
                                <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
                                  👤 {asg.user?.fullName || 'Chưa gán User'}
                                </span>
                              )}
                            </div>

                            <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-3">
                              {asg.asset && (
                                <span className="inline-flex items-center gap-1">
                                  <span className="text-slate-400 text-xs">💻 Máy:</span>
                                  <QuickLink
                                    type="asset"
                                    id={asg.asset.id}
                                    label={`[${asg.asset.assetTag}] ${asg.asset.name}`}
                                    showIcon={false}
                                    className="font-bold text-blue-700 text-xs"
                                  />
                                </span>
                              )}
                              <span>📅 Ngày gán: {formatDate(asg.assignedAt)}</span>
                            </div>
                          </div>

                          <button
                            type="button"
                            disabled={revokingAssignmentId === asg.id}
                            onClick={() => handleRevokeSeat(asg.id)}
                            className="px-2.5 py-1 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded-xl text-xs font-bold cursor-pointer transition-colors shrink-0 flex items-center gap-1"
                          >
                            {revokingAssignmentId === asg.id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <RotateCcw className="w-3 h-3" />
                            )}
                            <span>Thu hồi</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Sticky Footer */}
              <div className="flex items-center justify-end px-6 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 rounded-b-3xl shrink-0">
                <button
                  type="button"
                  onClick={() => setIsAssignModalOpen(false)}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Đóng (Esc)
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ==================== MODAL 3: XEM CHI TIẾT LICENSE ==================== */}
      {isDetailModalOpen && selectedDetailLicense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-3xl w-full flex flex-col max-h-[92vh] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-xs">
            {/* Header (Fixed Top) */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <span className="p-2.5 bg-gradient-to-tr from-purple-600 to-indigo-600 text-white rounded-2xl shadow-xs shrink-0">
                  <Key className="w-5 h-5" />
                </span>
                <div className="min-w-0">
                  <h3 className="text-base font-black text-slate-900 dark:text-white leading-snug truncate">
                    {selectedDetailLicense.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5 text-slate-500 dark:text-slate-400">
                    <span className="font-bold text-purple-700 dark:text-purple-300">
                      {selectedDetailLicense.licenseType}
                    </span>
                    <span>•</span>
                    <span className="font-mono truncate">{selectedDetailLicense.licenseKey ? `Key: ${selectedDetailLicense.licenseKey}` : 'Không có Key'}</span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsDetailModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* 4 Header Top Cards */}
              {(() => {
                const rawPrice = Number(selectedDetailLicense.purchasePrice) || 0;
                const rawCurr = (selectedDetailLicense.purchaseCurrency || 'VND').toUpperCase();
                const rate = selectedDetailLicense.exchangeRate || exchangeRatesMap[rawCurr] || 1;
                const convertedPrice = convertCurrency(rawPrice, rawCurr, selectedCurrency);
                const isDual = rawPrice > 0 && rawCurr !== selectedCurrency.toUpperCase();
                const used = selectedDetailLicense.usedSeats || selectedDetailLicense.assignments?.length || 0;
                const total = selectedDetailLicense.totalSeats || 1;
                const percent = Math.min(100, Math.round((used / total) * 100));

                return (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {/* Card 1: Trạng thái */}
                    <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{isEn ? 'Status' : 'Trạng thái'}</span>
                      <div>
                        {selectedDetailLicense.status === 'ACTIVE' ? (
                          <span className="px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            🟢 Đang hoạt động
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            🔴 Hết hạn / Tạm dừng
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-500 block truncate">
                        Loại: {selectedDetailLicense.licenseType}
                      </span>
                    </div>

                    {/* Card 2: Phân bổ Seats */}
                    <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-1.5">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Phân bổ Seats</span>
                      <p className="text-xs font-black text-slate-900 dark:text-white font-mono flex items-center gap-1.5">
                        <span>{used} / {total} Seats</span>
                        {used > total && (
                          <span className="px-1.5 py-0.2 bg-rose-100 text-rose-700 rounded-md text-[9.5px] font-bold">
                            + {used - total} dư
                          </span>
                        )}
                      </p>
                      <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${used > total ? 'bg-rose-500' : 'bg-purple-600'}`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>

                    {/* Card 3: Công ty & Nhà cung cấp (Không dùng truncate) */}
                    <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-1 flex flex-col justify-between">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                          Công ty & Nhà cung cấp
                        </span>
                        <p className="text-xs font-bold text-indigo-950 dark:text-indigo-200 whitespace-normal break-words leading-snug">
                          🏢 {selectedDetailLicense.companyName || 'Công ty chung'}
                        </p>
                      </div>
                      <div className="text-[10.5px] text-slate-500 whitespace-normal break-words leading-tight pt-1 border-t border-slate-200/60 flex items-center gap-1">
                        <span>Đối tác:</span>
                        {selectedDetailLicense.vendor ? (
                          <QuickLink
                            type="vendor"
                            id={selectedDetailLicense.vendor.id || selectedDetailLicense.vendor.name}
                            label={selectedDetailLicense.vendor.name}
                            icon="🏢"
                            showIcon={false}
                            multiline
                            maxLines={3}
                            className="font-bold text-purple-700 dark:text-purple-300 text-[10.5px] leading-snug line-clamp-3 break-words"
                          />
                        ) : (
                          <span className="text-slate-400 italic">Chưa chọn</span>
                        )}
                      </div>
                    </div>

                    {/* Card 4: Chi phí mua sắm (Dual-Currency) */}
                    <div className="p-3.5 bg-purple-50/60 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 rounded-2xl space-y-1 flex flex-col justify-between">
                      <div>
                        <span className="text-[10px] font-bold text-purple-700 dark:text-purple-300 uppercase tracking-wider block mb-0.5">
                          Chi phí mua sắm
                        </span>
                        {rawPrice > 0 ? (
                          <div className="space-y-0.5">
                            <p className="text-sm font-black text-purple-950 dark:text-purple-200 font-mono">
                              {formatPrice(convertedPrice, selectedCurrency)}
                            </p>
                            {isDual && (
                              <p className="text-[10.5px] font-bold text-emerald-700 dark:text-emerald-400 block font-mono">
                                Gốc: {formatPrice(rawPrice, rawCurr)}
                              </p>
                            )}
                          </div>
                        ) : (
                          <p className="text-xs font-bold text-slate-400">Miễn phí / OEM</p>
                        )}
                      </div>
                      <div className="pt-1 border-t border-purple-200/60 space-y-0.5">
                        <span className="text-[10px] text-purple-800/80 dark:text-purple-300 block">
                          Đơn giá: <strong>{formatPrice(rawPrice > 0 ? convertedPrice / total : 0, selectedCurrency)}</strong> / seat
                        </span>
                        <span className="text-[9.5px] text-slate-400 block font-mono">
                          (Tỷ giá quy đổi ngày 25/08/2026)
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* BẢNG CHỈ SỐ TÀI CHÍNH & KHẤU HAO */}
              {(() => {
                const rawPrice = Number(selectedDetailLicense.purchasePrice) || 0;
                const rawCurr = (selectedDetailLicense.purchaseCurrency || 'VND').toUpperCase();
                const rate = selectedDetailLicense.exchangeRate || exchangeRatesMap[rawCurr] || 1;
                const convertedPrice = convertCurrency(rawPrice, rawCurr, selectedCurrency);

                if (rawPrice <= 0) return null;

                const purchaseDate = selectedDetailLicense.purchaseDate ? new Date(selectedDetailLicense.purchaseDate) : null;
                const now = new Date();
                const totalMonths = 12;
                let usedMonths = 0;
                if (purchaseDate) {
                  usedMonths = Math.max(0, (now.getFullYear() - purchaseDate.getFullYear()) * 12 + (now.getMonth() - purchaseDate.getMonth()));
                }
                const depRatio = Math.min(1, Math.max(0, usedMonths / totalMonths));
                const accumulatedDepreciation = convertedPrice * depRatio;
                const remainingValue = Math.max(0, convertedPrice - accumulatedDepreciation);

                return (
                  <div className="p-4 bg-purple-50/50 dark:bg-purple-950/30 border border-purple-200/60 dark:border-purple-800/60 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-purple-950 dark:text-purple-200 flex items-center gap-1.5 uppercase tracking-wider text-xs">
                        <DollarSign className="w-4 h-4 text-purple-600" />
                        <span>Chỉ số tài chính & Khấu hao bản quyền</span>
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-200/80 text-purple-950 dark:bg-purple-900 dark:text-purple-200">
                        Khung khấu hao {totalMonths} tháng
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                      <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-purple-100 dark:border-slate-800 shadow-2xs">
                        <span className="text-[9.5px] font-bold text-slate-400 uppercase block">1. Nguyên giá gốc</span>
                        <span className="text-xs font-black text-slate-900 dark:text-white font-mono block mt-0.5 truncate">
                          {formatPrice(rawPrice, rawCurr)}
                        </span>
                      </div>

                      <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-purple-100 dark:border-slate-800 shadow-2xs">
                        <span className="text-[9.5px] font-bold text-slate-400 uppercase block">2. Tỷ giá hạch toán</span>
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300 font-mono block mt-0.5 truncate">
                          1 {rawCurr} = {new Intl.NumberFormat('vi-VN').format(rate)} đ
                        </span>
                      </div>

                      <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-purple-100 dark:border-slate-800 shadow-2xs">
                        <span className="text-[9.5px] font-bold text-purple-600 uppercase block">3. Giá quy đổi ({selectedCurrency})</span>
                        <span className="text-xs font-black text-purple-900 dark:text-purple-300 font-mono block mt-0.5 truncate">
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

              {/* Chi tiết Tài chính & Định giá Hóa đơn */}
              {(() => {
                const rawPrice = Number(selectedDetailLicense.purchasePrice) || 0;
                const rawCurr = (selectedDetailLicense.purchaseCurrency || 'VND').toUpperCase();
                const rate = selectedDetailLicense.exchangeRate || exchangeRatesMap[rawCurr] || 1;
                const priceInVnd = rawPrice * rate;
                const convertedPrice = convertCurrency(rawPrice, rawCurr, selectedCurrency);
                const wordsVnd = priceInVnd > 0 ? numberToVietnameseWords(priceInVnd) : '';

                if (rawPrice <= 0) return null;

                return (
                  <div className="p-4 bg-purple-50/70 dark:bg-purple-950/40 border border-purple-200/80 dark:border-purple-800/80 rounded-2xl space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-purple-950 dark:text-purple-200 flex items-center gap-1.5 uppercase tracking-wider text-xs">
                        <DollarSign className="w-4 h-4 text-purple-600" />
                        <span>Chứng từ & Định giá mua sắm bản quyền</span>
                      </span>
                      <span className="font-mono font-bold text-purple-700 dark:text-purple-300">
                        {formatPrice(rawPrice, rawCurr)}
                      </span>
                    </div>

                    {/* Đọc số tiền bằng chữ */}
                    {wordsVnd && (
                      <p className="text-[11px] font-bold text-purple-700 dark:text-purple-300 italic">
                        ✍️ Bằng chữ: {wordsVnd}
                      </p>
                    )}

                    {/* Dòng Quy đổi nhanh theo Tiền tệ ưu tiên */}
                    <div className="p-2.5 bg-white/90 dark:bg-slate-900 rounded-xl border border-purple-200/60 space-y-0.5">
                      <div className="flex items-center justify-between text-purple-900 dark:text-purple-200 font-semibold text-[11px]">
                        <span>⚡ Quy đổi theo Tiền tệ ưu tiên [{selectedCurrency}]:</span>
                        <span className="font-black font-mono">{formatPrice(convertedPrice, selectedCurrency)}</span>
                      </div>
                      <p className="text-[10px] text-slate-500 font-mono">
                        (Tỷ giá hạch toán: 1 {rawCurr} = {new Intl.NumberFormat('vi-VN').format(rate)} VND)
                      </p>
                    </div>

                    <div className="p-2 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800 text-[10.5px] text-slate-600 dark:text-slate-400 flex items-center gap-1.5 font-medium">
                      <Clock className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 shrink-0" />
                      <span>Tỷ giá tham chiếu hạch toán cập nhật: 25/08/2026 (Theo Vietcombank / Tỷ giá hạch toán)</span>
                    </div>

                    {/* Hóa đơn & Hợp đồng đính kèm tự động */}
                    {(selectedDetailLicense.invoiceNumber || selectedDetailLicense.contractNumber) && (
                      <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-purple-200/80 flex items-center justify-between gap-2 text-xs flex-wrap">
                        <div className="flex items-center gap-3 flex-wrap">
                          {selectedDetailLicense.invoiceNumber && (
                            <span className="flex items-center gap-1 font-mono text-slate-700 dark:text-slate-300">
                              <Receipt className="w-3.5 h-3.5 text-purple-600" />
                              <span>HĐ: <strong>{selectedDetailLicense.invoiceNumber}</strong></span>
                            </span>
                          )}
                          {selectedDetailLicense.contractNumber && (
                            <span className="flex items-center gap-1 font-mono text-slate-700 dark:text-slate-300">
                              <FileText className="w-3.5 h-3.5 text-purple-600" />
                              <span>Hợp đồng: <strong>{selectedDetailLicense.contractNumber}</strong></span>
                            </span>
                          )}
                        </div>
                        <Link
                          href={`/documents?search=${encodeURIComponent(selectedDetailLicense.invoiceNumber || selectedDetailLicense.contractNumber || '')}`}
                          className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 rounded-lg text-[10.5px] font-bold flex items-center gap-1 transition-colors"
                        >
                          <FileText className="w-3 h-3" />
                          <span>Xem Kho Chứng Từ</span>
                        </Link>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* DANH SÁCH NHÂN SỰ & THIẾT BỊ ĐƯỢC CẤP PHÁT (Nhìn nhanh phân bổ) */}
              {(() => {
                const assignments = selectedDetailLicense.assignments?.filter((a: any) => !a.revokedAt) || [];
                const total = selectedDetailLicense.totalSeats || 1;
                const isOver = assignments.length > total;

                return (
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                          <Users className="w-4 h-4 text-purple-600" />
                          <span>Danh sách nhân sự & thiết bị được cấp phát ({assignments.length} / {total} Seats)</span>
                        </span>
                        {isOver && (
                          <span className="px-2 py-0.5 bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 rounded-full text-[10.5px] font-bold">
                            ⚠️ Cấp vượt hạn mức (+{assignments.length - total})
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setIsDetailModalOpen(false);
                          handleOpenAssign(selectedDetailLicense);
                        }}
                        className="text-[11px] font-bold text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>+ Quản lý cấp phát</span>
                      </button>
                    </div>

                    {assignments.length === 0 ? (
                      <div className="text-center py-6 bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 space-y-1">
                        <Users className="w-6 h-6 text-slate-300 mx-auto" />
                        <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
                          Chưa có nhân sự hoặc thiết bị nào được cấp phát seat
                        </p>
                        <p className="text-[10.5px] text-slate-400">
                          Bấm &quot;Cấp Phát / Thu Hồi Seats&quot; để bắt đầu phân bổ license cho nhân viên hoặc máy tính.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                        {assignments.map((asg: any, index: number) => {
                          const assetHolder = asg.asset?.assignments?.find((a: any) => !a.returnedAt)?.user;
                          const displayUser = asg.user || assetHolder;

                          return (
                            <div
                              key={asg.id || index}
                              className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs"
                            >
                              <div className="space-y-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  {displayUser ? (
                                    <QuickLink
                                      type="user"
                                      id={displayUser.id}
                                      label={displayUser.fullName}
                                      subLabel={displayUser.department}
                                      icon="👤"
                                      className="font-bold text-xs text-slate-900 dark:text-white"
                                    />
                                  ) : (
                                    <span className="text-xs font-semibold text-slate-400 italic">
                                      ⚪ Chưa gán nhân sự (Chỉ gán máy trong kho)
                                    </span>
                                  )}

                                  <span className="px-2 py-0.2 bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-md text-[10px] font-bold">
                                    🟢 Đang hoạt động
                                  </span>
                                </div>

                                <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-3 flex-wrap">
                                  {asg.asset ? (
                                    <span className="inline-flex items-center gap-1">
                                      <span className="text-slate-400 text-xs">💻 Máy:</span>
                                      <QuickLink
                                        type="asset"
                                        id={asg.asset.id}
                                        label={`[${asg.asset.assetTag}] ${asg.asset.name}`}
                                        icon="💻"
                                        showIcon={false}
                                        className="font-bold text-purple-700 dark:text-purple-300 text-xs"
                                      />
                                    </span>
                                  ) : (
                                    <span className="text-slate-400 italic">💻 Chưa gắn máy tính cụ thể</span>
                                  )}
                                  <span>📅 Ngày gán: {formatDate(asg.assignedAt)}</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* KHUNG GIA HẠN & LỊCH SỬ THANH TOÁN (CHO BẢN QUYỀN KHÔNG VĨNH VIỄN) */}
              {((selectedDetailLicense.licenseType && selectedDetailLicense.licenseType !== 'PERPETUAL') || !!selectedDetailLicense.expiryDate) && (() => {
                const effectivePayments = getEffectiveLicensePayments(selectedDetailLicense);
                const nextBatchNumber = effectivePayments.length + 1;

                return (
                  <div className="space-y-3">
                    {/* Khung Lịch Sử Thanh Toán / Gia Hạn */}
                    <div className="p-4 bg-gradient-to-r from-purple-50/70 via-indigo-50/60 to-blue-50/70 dark:from-slate-800/70 dark:to-slate-800/50 rounded-2xl border border-purple-200/80 dark:border-purple-800/60 space-y-3 shadow-2xs">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-xs">
                            <Receipt className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <h4 className="text-xs font-black text-purple-950 dark:text-purple-200 uppercase tracking-wider">
                              Lịch Sử Thanh Toán & Gia Hạn Bản Quyền ({effectivePayments.length})
                            </h4>
                            <p className="text-[10.5px] text-purple-700/80 dark:text-purple-300">
                              Theo dõi các đợt thanh toán cước gia hạn bản quyền phần mềm
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {/* Cumulative payment badge */}
                          <div className="px-3 py-1 bg-white dark:bg-slate-900 border border-purple-300 dark:border-purple-700 rounded-xl shadow-2xs text-right">
                            <span className="text-[9.5px] font-bold text-slate-500 block uppercase">Tổng tiền đã thanh toán:</span>
                            <span className="text-xs font-black text-purple-900 dark:text-purple-200 font-mono">
                              {formatCurrency(
                                effectivePayments.reduce((acc: number, p: PaymentRecord) => acc + (Number(p.amount) || 0), 0)
                              )}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              const cur = (selectedDetailLicense.purchaseCurrency || 'VND').toUpperCase();
                              const curObj = currencies.find((c) => c.code === cur);
                              const rate = curObj ? curObj.rateToVnd : (exchangeRatesMap[cur] || 1);

                              const startStr = selectedDetailLicense.expiryDate
                                ? new Date(selectedDetailLicense.expiryDate).toISOString().split('T')[0]
                                : (selectedDetailLicense.purchaseDate ? new Date(selectedDetailLicense.purchaseDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);

                              const baseDate = new Date(startStr);
                              const nextEnd = new Date(baseDate);
                              nextEnd.setFullYear(nextEnd.getFullYear() + 1);
                              const endStr = nextEnd.toISOString().split('T')[0];

                              const sFormatted = new Date(startStr).toLocaleDateString('vi-VN');
                              const eFormatted = nextEnd.toLocaleDateString('vi-VN');

                              setPaymentForm({
                                paymentDate: new Date().toISOString().split('T')[0],
                                amount: selectedDetailLicense.purchasePrice ? String(selectedDetailLicense.purchasePrice) : '',
                                currency: cur,
                                exchangeRate: rate,
                                period: `Đợt ${nextBatchNumber}: Kỳ từ ${sFormatted} đến ${eFormatted}`,
                                periodStartDate: startStr,
                                periodEndDate: endStr,
                                invoiceNumber: selectedDetailLicense.invoiceNumber || '',
                                contractNumber: selectedDetailLicense.contractNumber || '',
                                status: 'PAID',
                                notes: '',
                              });
                              setIsAddPaymentModalOpen(true);
                            }}
                            className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-2xs cursor-pointer transition-colors"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>+ Ghi nhận đợt thanh toán / gia hạn (Đợt {nextBatchNumber})</span>
                          </button>
                        </div>
                      </div>

                      {/* Table of Payment Records */}
                      <div className="overflow-x-auto rounded-xl border border-purple-200/80 dark:border-purple-800/80 bg-white dark:bg-slate-900 shadow-2xs">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead className="bg-purple-100/50 dark:bg-purple-950/60 text-[10px] font-bold text-purple-900 dark:text-purple-200 uppercase tracking-wider border-b border-purple-200/80 dark:border-purple-800/80">
                            <tr>
                              <th className="py-2.5 px-3">Ngày Thanh Toán</th>
                              <th className="py-2.5 px-3">Số Tiền & Ngoại Tệ</th>
                              <th className="py-2.5 px-3">Kỳ Áp Dụng / Thời Gian</th>
                              <th className="py-2.5 px-3">Số Hóa Đơn / Hợp Đồng</th>
                              <th className="py-2.5 px-3">Trạng Thái</th>
                              <th className="py-2.5 px-3">Ghi Chú</th>
                              <th className="py-2.5 px-2 text-right">{isEn ? 'Delete' : 'Xóa'}</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-purple-100/60 dark:divide-slate-800">
                            {effectivePayments.length === 0 ? (
                              <tr>
                                <td colSpan={7} className="py-6 text-center text-xs text-slate-400 italic">
                                  Chưa có dữ liệu đợt thanh toán nào được ghi nhận. Bấm nút <strong>&quot;+ Ghi nhận đợt thanh toán / gia hạn&quot;</strong> ở trên để thêm!
                                </td>
                              </tr>
                            ) : (
                              effectivePayments.map((p: PaymentRecord) => {
                                const pCur = (p.currency || 'VND').toUpperCase();
                                const rawAmt = p.originalAmount !== undefined ? p.originalAmount : (Number(p.amount) || 0);
                                const inVnd = Number(p.amount) || (rawAmt * (p.exchangeRate || exchangeRatesMap[pCur] || 1));
                                const convertedAmt = convertCurrency(inVnd, 'VND', selectedCurrency);
                                const isDual = pCur !== 'VND' && pCur !== selectedCurrency.toUpperCase();

                                return (
                                  <tr key={p.id} className="hover:bg-purple-50/50 dark:hover:bg-slate-800/50 transition-colors">
                                    <td className="py-2 px-3 font-mono font-bold text-slate-800 dark:text-slate-200">
                                      {p.paymentDate ? formatDate(p.paymentDate) : '—'}
                                    </td>
                                    <td className="py-2 px-3">
                                      <div className="space-y-0.5">
                                        <span className="font-mono font-black text-purple-900 dark:text-purple-200 block">
                                          {formatPrice(convertedAmt, selectedCurrency)}
                                        </span>
                                        {isDual && (
                                          <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 block font-mono">
                                            Gốc: {formatPrice(rawAmt, pCur)}
                                          </span>
                                        )}
                                        <span className="text-[9px] text-slate-400 block font-mono">
                                          (Tỷ giá: {p.paymentDate ? formatDate(p.paymentDate) : '25/08/2026'})
                                        </span>
                                      </div>
                                    </td>
                                    <td className="py-2 px-3 font-medium text-slate-700 dark:text-slate-300 min-w-[150px]">
                                      <span className="font-semibold text-slate-900 dark:text-white block">{p.period || 'Kỳ gia hạn'}</span>
                                      {p.periodStartDate && p.periodEndDate && (
                                        <span className="text-[10px] text-slate-500 font-mono block mt-0.5">
                                          📅 {formatDate(p.periodStartDate)} → {formatDate(p.periodEndDate)}
                                        </span>
                                      )}
                                    </td>
                                    <td className="py-2 px-3 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                                      {p.invoiceNumber || p.contractNumber || '—'}
                                    </td>
                                    <td className="py-2 px-3">
                                      <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 px-2 py-0.2 rounded-md text-[10px] font-bold">
                                        <Check className="w-3 h-3" />
                                        <span>{p.status === 'PAID' ? 'Đã thanh toán' : 'Chờ xử lý'}</span>
                                      </span>
                                    </td>
                                    <td className="py-2 px-3 text-slate-500 dark:text-slate-400 text-[11px] truncate max-w-[180px]">
                                      {p.notes || '—'}
                                    </td>
                                    <td className="py-2 px-2 text-right">
                                      <button
                                        type="button"
                                        onClick={() => handleDeletePaymentRecord(selectedDetailLicense.id, p.id)}
                                        title="Xóa đợt thanh toán này"
                                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800 rounded cursor-pointer transition-colors"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Quick Renew Section */}
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl space-y-2">
                      <h4 className="font-bold text-xs text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                        <RotateCcw className="w-3.5 h-3.5 text-purple-600" />
                        <span>Gia Hạn Nhanh Bản Quyền:</span>
                      </h4>
                      <div className="flex items-center gap-2 flex-wrap pt-1">
                        {[
                          { label: '+ 1 Tháng', months: 1 },
                          { label: '+ 3 Tháng (Quý)', months: 3 },
                          { label: '+ 6 Tháng', months: 6 },
                          { label: '+ 1 Năm (12T)', months: 12 },
                          { label: '+ 2 Năm (24T)', months: 24 },
                          { label: '+ 3 Năm (36T)', months: 36 },
                        ].map((chip) => (
                          <button
                            key={chip.months}
                            type="button"
                            onClick={() => handleQuickRenew(selectedDetailLicense, chip.months)}
                            className="px-3 py-1.5 bg-white dark:bg-slate-900 hover:bg-purple-600 hover:text-white dark:hover:bg-purple-600 border border-purple-200 dark:border-purple-800 rounded-xl text-xs font-bold text-purple-700 dark:text-purple-300 transition-all cursor-pointer shadow-2xs active:scale-95"
                          >
                            {chip.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {selectedDetailLicense.notes && (
                <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700">
                  <span className="text-[10.5px] font-bold text-slate-400 block mb-1">Ghi chú:</span>
                  <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                    {selectedDetailLicense.notes}
                  </p>
                </div>
              )}
            </div>

            {/* Sticky Footer */}
            <div className="flex items-center justify-between px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90 rounded-b-3xl shrink-0">
              <button
                type="button"
                onClick={() => {
                  setIsDetailModalOpen(false);
                  handleOpenAssign(selectedDetailLicense);
                }}
                className="px-4 py-2 bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/60 dark:hover:bg-purple-900 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
              >
                <Users className="w-3.5 h-3.5" />
                <span>Cấp Phát / Thu Hồi Seats</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsDetailModalOpen(false);
                    handleOpenEdit(selectedDetailLicense);
                  }}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1.5 active:scale-95"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Sửa Thông Tin</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsDetailModalOpen(false)}
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold cursor-pointer active:scale-95"
                >
                  Đóng (Esc)
                </button>
              </div>
            </div>
          </div>
        </div>
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
    </div>
  );
}
