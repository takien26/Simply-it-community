'use client';
import {
  ServiceDetailModal,
  ServicePaymentModal,
  ServiceImportModal,
  ServiceFormModal,
} from '@/components/services';


import { useLanguage } from '@/lib/i18n/context';
import { QuickLink } from '@/components/common/QuickLink';
import Link from 'next/link';
import { DocumentQuickPreviewModal } from '@/components/documents/document-quick-preview-modal';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { fetchWithSwr, invalidateClientCache, useAutoRefresh } from '@/lib/client-cache';
import { getStoredBaseCurrency, getStoredCurrencies, convertCurrencyAmount } from '@/lib/currency-store';
import {
  Globe,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Flame,
  FileText,
  Building2,
  Handshake,
  Calendar,
  DollarSign,
  Download,
  Filter,
  RotateCcw,
  Edit2,
  Trash2,
  Eye,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  X,
  Server,
  Shield,
  Wifi,
  Cloud,
  Mail,
  PhoneCall,
  Phone,
  Wrench,
  Layers,
  Sparkles,
  Paperclip,
  Check,
  RefreshCw,
  CreditCard,
  Receipt,
  History,
  Tag,
  AlertCircle,
  MoreVertical,
  FolderOpen,
  Link as LinkIcon,
} from 'lucide-react';
import { ManageableDropdown } from '@/components/ui/manageable-dropdown';
import { CurrencyInput } from '@/components/ui/currency-input';
import { formatCurrency, formatDate, numberToVietnameseWords, numberToForeignCurrencyWords } from '@/lib/utils';

interface PaymentRecord {
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

interface CurrencyConfig {
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

interface ITServiceItem {
  id: string;
  serviceCode: string;
  name: string;
  serviceType: 'INTERNET' | 'CLOUD_HOSTING' | 'DOMAIN_SSL' | 'EMAIL_COMMUNICATION' | 'MAINTENANCE_SLA' | 'TELECOM_VOIP' | 'SOFTWARE_SAAS' | 'OTHER';
  status: 'ACTIVE' | 'PENDING_RENEWAL' | 'SUSPENDED' | 'TERMINATED' | 'EXPIRED';
  billingCycle: 'MONTHLY' | 'QUARTERLY' | 'SEMI_ANNUAL' | 'ANNUAL' | 'BIENNIAL' | 'TRIENNIAL' | 'ONE_TIME';
  cost: number | string | null;
  currency: string;
  startDate: string | null;
  renewalDate: string | null;
  expiryDate: string | null;
  accountNumber: string | null;
  contractNumber: string | null;
  invoiceNumber: string | null;
  vendorId: string | null;
  companyName: string | null;
  locationId: string | null;
  contactSupport: string | null;
  specs: any;
  contractUrl: string | null;
  notes: string | null;
  vendor?: { id: string; name: string; phone?: string; email?: string } | null;
  location?: { id: string; name: string; building?: string; floor?: string } | null;
  documents?: Array<{ id: string; title: string; type: string; fileUrl: string; fileName: string; amount?: number }> | null;
  createdBy?: { id: string; fullName: string; email: string } | null;
  createdAt: string;
  updatedAt: string;
}

const DEFAULT_SERVICE_TYPES: { value: string; label: string; icon: any; color: string }[] = [
  { value: 'ALL', label: 'Tất cả loại dịch vụ', icon: Globe, color: 'text-slate-600' },
  { value: 'INTERNET', label: 'Đường truyền Internet / Cáp quang', icon: Wifi, color: 'text-blue-600' },
  { value: 'CLOUD_HOSTING', label: 'Máy chủ Cloud / VPS / Hosting', icon: Cloud, color: 'text-indigo-600' },
  { value: 'DOMAIN_SSL', label: 'Tên miền & Chứng chỉ SSL', icon: Shield, color: 'text-emerald-600' },
  { value: 'EMAIL_COMMUNICATION', label: 'Email doanh nghiệp & SaaS', icon: Mail, color: 'text-cyan-600' },
  { value: 'TELECOM_VOIP', label: 'Tổng đài ảo VoIP & Thoại', icon: PhoneCall, color: 'text-purple-600' },
  { value: 'MAINTENANCE_SLA', label: 'Bảo trì SLA & Hỗ trợ kỹ thuật', icon: Wrench, color: 'text-amber-600' },
  { value: 'SOFTWARE_SAAS', label: 'Phần mềm thuê bao (SaaS)', icon: Server, color: 'text-rose-600' },
  { value: 'OTHER', label: 'Dịch vụ IT khác', icon: Layers, color: 'text-slate-600' },
];


function getServiceTypeLabel(value: string, lang: string): string {
  if (lang === 'en') {
    switch (value) {
      case 'ALL': return 'All Service Categories';
      case 'INTERNET': return 'Internet Circuits / FTTH';
      case 'CLOUD_HOSTING': return 'Cloud Servers / VPS / Hosting';
      case 'DOMAIN_SSL': return 'Domains & SSL Certificates';
      case 'EMAIL_COMMUNICATION': return 'Corporate Email & SaaS';
      case 'TELECOM_VOIP': return 'Cloud VoIP & SIP Trunking';
      case 'MAINTENANCE_SLA': return 'SLA Maintenance & Support';
      case 'SOFTWARE_SAAS': return 'SaaS Software Subscriptions';
      case 'OTHER': return 'Other IT Services';
      default: return value;
    }
  }
  const found = DEFAULT_SERVICE_TYPES.find((t) => t.value === value);
  return found ? found.label : value;
}

function getBillingCycleLabel(value: string, lang: string): string {
  if (lang === 'en') {
    switch (value) {
      case 'MONTHLY': return 'Monthly (1 Month)';
      case 'QUARTERLY': return 'Quarterly (3 Months)';
      case 'SEMI_ANNUAL': return 'Semi-Annual (6 Months)';
      case 'ANNUAL': return 'Annual (12 Months)';
      case 'BIENNIAL': return 'Biennial (2 Years)';
      case 'TRIENNIAL': return 'Triennial (3 Years)';
      case 'ONE_TIME': return 'One-time Payment';
      default: return value;
    }
  }
  const found = BILLING_CYCLES.find((b) => b.value === value);
  return found ? found.label : value;
}

const BILLING_CYCLES: { value: string; label: string }[] = [
  { value: 'MONTHLY', label: 'Hàng tháng (1 tháng / lần)' },
  { value: 'QUARTERLY', label: 'Hàng quý (3 tháng / lần)' },
  { value: 'SEMI_ANNUAL', label: '6 tháng / lần' },
  { value: 'ANNUAL', label: 'Hàng năm (12 tháng / lần)' },
  { value: 'BIENNIAL', label: '2 năm / lần' },
  { value: 'TRIENNIAL', label: '3 năm / lần' },
  { value: 'ONE_TIME', label: 'Trọn gói / Thanh toán 1 lần' },
];

// Helper to auto-calculate renewal date
function calculateNextRenewalDate(
  startDateStr: string | null | undefined,
  count: number,
  unit: 'MONTH' | 'YEAR' | 'DAY' | 'ONE_TIME'
): string {
  if (!startDateStr || unit === 'ONE_TIME' || count <= 0) return '';
  const d = new Date(startDateStr);
  if (isNaN(d.getTime())) return '';

  if (unit === 'MONTH') {
    d.setMonth(d.getMonth() + count);
  } else if (unit === 'YEAR') {
    d.setFullYear(d.getFullYear() + count);
  } else if (unit === 'DAY') {
    d.setDate(d.getDate() + count);
  }
  return d.toISOString().split('T')[0];
}

// Helper to map count + unit to billingCycle enum
function mapCycleEnum(count: number, unit: 'MONTH' | 'YEAR' | 'DAY' | 'ONE_TIME'): string {
  if (unit === 'ONE_TIME') return 'ONE_TIME';
  if (unit === 'YEAR') {
    if (count === 1) return 'ANNUAL';
    if (count === 2) return 'BIENNIAL';
    if (count === 3) return 'TRIENNIAL';
    return 'ANNUAL';
  }
  if (unit === 'MONTH') {
    if (count === 1) return 'MONTHLY';
    if (count === 3) return 'QUARTERLY';
    if (count === 6) return 'SEMI_ANNUAL';
    if (count === 12) return 'ANNUAL';
    if (count === 24) return 'BIENNIAL';
    if (count === 36) return 'TRIENNIAL';
    return 'MONTHLY';
  }
  return 'MONTHLY';
}

export default function ServicesPage() {
    const { language, t } = useLanguage();
  const isEn = language === 'en';
  const [services, setServices] = useState<ITServiceItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Dynamic Currencies & Multi-Currency State
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

  const convertCurrency = useCallback(
    (
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
    },
    [exchangeRatesMap]
  );

  const formatPrice = useCallback(
    (amount: number, currency: string = 'VND'): string => {
      if (amount === null || amount === undefined || isNaN(amount)) return '—';
      const cur = currency.toUpperCase();
      if (cur === 'VND') {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Math.round(amount));
      } else if (cur === 'USD') {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
      } else if (cur === 'EUR') {
        return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(amount);
      }
      return new Intl.NumberFormat('vi-VN').format(amount) + ` ${cur}`;
    },
    []
  );

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
  const [activeDropdownServiceId, setActiveDropdownServiceId] = useState<string | null>(null);

  useEffect(() => {
    const handleGlobalClick = () => setActiveDropdownServiceId(null);
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, []);

  // Master Data
  const [vendors, setVendors] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [companies, setCompanies] = useState<string[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [customServiceTypes, setCustomServiceTypes] = useState<Array<{ value: string; label: string }>>([]);

  // Dynamically calculate statistics for active services with multi-currency conversion
  const filteredStats = useMemo(() => {
    let total = services.length;
    let active = 0;
    let expiringSoon = 0;
    let expired = 0;
    let totalYearlyCostVnd = 0;
    let totalMonthlyCostVnd = 0;

    const now = new Date();
    const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    for (const s of services) {
      if (s.status === 'ACTIVE') {
        active++;
        const rawCost = Number(s.cost) || 0;
        const cur = (s.currency || 'VND').toUpperCase();
        const recordedRate = Number((s as any).exchangeRate || s.specs?.exchangeRate);
        const rate = recordedRate && recordedRate > 0 ? recordedRate : (exchangeRatesMap[cur] || 1);
        const costVnd = rawCost * rate;

        let monthlyVnd = 0;
        const count = s.specs?.billingPeriodCount || 1;
        const unit = s.specs?.billingPeriodUnit;

        if (unit === 'YEAR') {
          monthlyVnd = count > 0 ? costVnd / (count * 12) : costVnd / 12;
        } else if (unit === 'MONTH') {
          monthlyVnd = count > 0 ? costVnd / count : costVnd;
        } else if (unit === 'ONE_TIME') {
          monthlyVnd = 0;
        } else {
          switch (s.billingCycle) {
            case 'MONTHLY': monthlyVnd = costVnd; break;
            case 'QUARTERLY': monthlyVnd = costVnd / 3; break;
            case 'SEMI_ANNUAL': monthlyVnd = costVnd / 6; break;
            case 'ANNUAL': monthlyVnd = costVnd / 12; break;
            case 'BIENNIAL': monthlyVnd = costVnd / 24; break;
            case 'TRIENNIAL': monthlyVnd = costVnd / 36; break;
            case 'ONE_TIME': monthlyVnd = 0; break;
            default: monthlyVnd = costVnd; break;
          }
        }

        totalMonthlyCostVnd += monthlyVnd;
        totalYearlyCostVnd += monthlyVnd * 12;
      } else if (s.status === 'EXPIRED') {
        expired++;
      }

      if (s.renewalDate) {
        const renDate = new Date(s.renewalDate);
        if (renDate <= thirtyDaysLater && renDate >= now && s.status === 'ACTIVE') {
          expiringSoon++;
        }
      }
    }

    const targetRate = exchangeRatesMap[selectedCurrency.toUpperCase()] || 1;
    const totalMonthlyCost = totalMonthlyCostVnd / targetRate;
    const totalYearlyCost = totalYearlyCostVnd / targetRate;

    return { total, active, expiringSoon, expired, totalMonthlyCost, totalYearlyCost };
  }, [services, selectedCurrency, exchangeRatesMap]);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedVendor, setSelectedVendor] = useState('ALL');
  const [selectedCompany, setSelectedCompany] = useState('ALL');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedService, setSelectedService] = useState<ITServiceItem | null>(null);
  const [isDocPreviewOpen, setIsDocPreviewOpen] = useState(false);

  // Auto-open Detail Modal if URL contains ?id=... or ?serviceCode=...
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const targetId = params.get('id') || params.get('serviceCode') || params.get('code');
    if (!targetId) return;

    if (services.length > 0) {
      const found = services.find(
        (s: any) =>
          s.id === targetId ||
          s.serviceCode?.toLowerCase() === targetId.toLowerCase() ||
          s.name?.toLowerCase() === targetId.toLowerCase()
      );
      if (found) {
        setSelectedService(found);
        setIsDetailModalOpen(true);
        return;
      }
    }

    fetch(`/api/services/${encodeURIComponent(targetId)}`)
      .then((r) => r.json())
      .then((res) => {
        const item = res.data || res.service;
        if (item) {
          setSelectedService(item);
          setIsDetailModalOpen(true);
        }
      })
      .catch(() => {});
  }, [services]);


  // Quick Payment Modal (Adding a payment record directly)
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

  // Form State
  const initialForm = {
    serviceCode: '',
    name: '',
    serviceType: 'INTERNET',
    status: 'ACTIVE',
    billingCycle: 'MONTHLY',
    periodCount: 1,
    periodUnit: 'MONTH' as 'MONTH' | 'YEAR' | 'DAY' | 'ONE_TIME',
    cost: '',
    currency: 'VND',
    exchangeRate: 1,
    startDate: new Date().toISOString().split('T')[0],
    renewalDate: '',
    accountNumber: '',
    contractNumber: '',
    invoiceNumber: '',
    vendorId: '',
    companyName: '',
    locationId: '',
    contactSupport: '',
    assignedUserId: '',
    assignedAssetId: '',
    bandwidth: '',
    ipStatic: '',
    notes: '',
    paymentHistory: [] as PaymentRecord[],
  };

  const [formData, setFormData] = useState(initialForm);
  const [editFormData, setEditFormData] = useState(initialForm);
  const [editingId, setEditingId] = useState<string | null>(null);

  // ==================== CRUD HANDLERS CHO CÁC DROPDOWN ====================
  const handleAddVendor = async (name: string) => {
    try {
      const res = await fetch('/api/vendors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (res.ok && data.data) {
        setVendors((prev) => [...prev, data.data]);
        return data.data.id;
      }
    } catch (e) {
      console.error('Add vendor error:', e);
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
      }
    } catch (e) {
      console.error('Edit vendor error:', e);
    }
  };

  const handleDeleteVendor = async (id: string, name: string) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa đối tác "${name}" khỏi danh sách?`)) return;
    try {
      const res = await fetch(`/api/vendors/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setVendors((prev) => prev.filter((v) => v.id !== id));
      }
    } catch (e) {
      console.error('Delete vendor error:', e);
    }
  };

  // 2. Công ty / Chi nhánh quản lý (Company)
  const handleAddCompany = async (name: string) => {
    try {
      const res = await fetch('/api/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (res.ok) {
        setCompanies((prev) => (prev.includes(name) ? prev : [...prev, name]));
      }
    } catch (e) {
      console.error('Add company error:', e);
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
      }
    } catch (e) {
      console.error('Edit company error:', e);
    }
  };

  const handleDeleteCompany = async (id: string, name: string) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa công ty "${name}" khỏi danh sách?`)) return;
    try {
      const res = await fetch(`/api/companies?name=${encodeURIComponent(name)}`, { method: 'DELETE' });
      if (res.ok) {
        setCompanies((prev) => prev.filter((c) => c !== name));
      }
    } catch (e) {
      console.error('Delete company error:', e);
    }
  };

  // 3. Vị trí / Địa điểm lắp đặt (Location)
  const handleAddLocation = async (name: string) => {
    try {
      const res = await fetch('/api/locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (res.ok && data.data) {
        setLocations((prev) => [...prev, data.data]);
        return data.data.id;
      }
    } catch (e) {
      console.error('Add location error:', e);
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
      }
    } catch (e) {
      console.error('Edit location error:', e);
    }
  };

  const handleDeleteLocation = async (id: string, name: string) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa địa điểm "${name}" khỏi hệ thống?`)) return;
    try {
      const res = await fetch(`/api/locations/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setLocations((prev) => prev.filter((l) => l.id !== id));
      }
    } catch (e) {
      console.error('Delete location error:', e);
    }
  };

  const isMasterLoadedRef = useRef(false);

  // Load Data
  const loadData = useCallback(async (forceMaster = false) => {
    try {
      if (forceMaster) {
        invalidateClientCache('/api/services');
      }
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (selectedType !== 'ALL') params.append('type', selectedType);
      if (selectedStatus !== 'ALL') params.append('status', selectedStatus);
      if (selectedVendor !== 'ALL') params.append('vendorId', selectedVendor);
      if (selectedCompany !== 'ALL') params.append('companyName', selectedCompany);
      params.append('pageSize', '200');

      // 1. Fetch Services with SWR Cache (0ms instant render)
      fetchWithSwr<any>(`/api/services?${params.toString()}`, (servicesRes) => {
        if (servicesRes && (servicesRes.success || servicesRes.data)) {
          setServices(servicesRes.data || []);
          setLoading(false);
        }
      }, 30000, forceMaster);

      // 2. Fetch Assets with SWR Cache
      fetchWithSwr<any>('/api/assets?pageSize=300', (assetsRes) => {
        if (assetsRes && (assetsRes.success || assetsRes.data)) {
          setAssets(assetsRes.data || assetsRes.assets || []);
        }
      }, 30000, forceMaster);

      // 3. Fetch Master Data with SWR Cache
      fetchWithSwr<any>('/api/master-data', (masterRes) => {
        if (masterRes?.data) {
          const md = masterRes.data;
          if (md.vendors) setVendors(md.vendors);
          if (md.locations) setLocations(md.locations);
          if (md.companies) setCompanies(md.companies);
          if (md.users) setUsers(md.users);
        }
      }, 60000, forceMaster);
    } catch (err) {
      console.error('Failed to load services data:', err);
      setLoading(false);
    }
  }, [search, selectedType, selectedStatus, selectedVendor, selectedCompany]);

  // Connect Professional Auto-Refresh & Instant Reactive Sync
  const { isRefreshing: isAutoRefreshing, refreshNow } = useAutoRefresh({
    onRefresh: loadData,
    scope: 'services',
  });

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedType, selectedStatus, selectedVendor, selectedCompany]);

  const totalFilteredServices = services.length;
  const totalPages = Math.max(1, Math.ceil(totalFilteredServices / pageSize));
  const paginatedServices = useMemo(() => {
    return services.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  }, [services, currentPage, pageSize]);

  // Open Service by ID helper
  const openServiceById = useCallback(async (id: string) => {
    if (!id) return;
    try {
      const res = await fetch(`/api/services/${id}`);
      if (res.ok) {
        const sData = await res.json();
        if (sData.success && sData.data) {
          setSelectedService(sData.data);
          setIsDetailModalOpen(true);
          return;
        }
      }
    } catch {}

    const found = services.find((s) => s.id === id);
    if (found) {
      setSelectedService(found);
      setIsDetailModalOpen(true);
    }
  }, [services]);

  // Global ESC Key Listener
  useEffect(() => {
    function handleGlobalKeyDownServices(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setIsAddModalOpen(false);
        setIsEditModalOpen(false);
        setIsDetailModalOpen(false);
        setIsAddPaymentModalOpen(false);
        setIsAddCurrencyModalOpen(false);
      }
    }
    window.addEventListener('keydown', handleGlobalKeyDownServices);
    return () => window.removeEventListener('keydown', handleGlobalKeyDownServices);
  }, []);

  // Dropdown Items
  const vendorDropdownItems = vendors.map((v) => ({
    id: v.id,
    name: v.name,
    subtitle: v.phone ? `Hotline: ${v.phone}` : undefined,
    icon: <Handshake className="w-3.5 h-3.5 text-emerald-600" />,
  }));

  const locationDropdownItems = locations.map((l) => ({
    id: l.id,
    name: l.name,
    subtitle: l.building ? `${l.building} ${l.floor || ''}` : undefined,
    icon: <Building2 className="w-3.5 h-3.5 text-blue-600" />,
  }));

  const companyDropdownItems = companies.map((c) => ({
    id: c,
    name: c,
    icon: <Building2 className="w-3.5 h-3.5 text-indigo-600" />,
  }));

  // Helper for applying quick cycle chip in Form
  const applyCycleChip = (isEdit: boolean, count: number, unit: 'MONTH' | 'YEAR' | 'DAY' | 'ONE_TIME') => {
    if (isEdit) {
      const nextRenewal = calculateNextRenewalDate(editFormData.startDate, count, unit);
      const cycleEnum = mapCycleEnum(count, unit);
      setEditFormData((prev) => ({
        ...prev,
        periodCount: count,
        periodUnit: unit,
        billingCycle: cycleEnum as any,
        renewalDate: nextRenewal || prev.renewalDate,
      }));
    } else {
      const nextRenewal = calculateNextRenewalDate(formData.startDate, count, unit);
      const cycleEnum = mapCycleEnum(count, unit);
      setFormData((prev) => ({
        ...prev,
        periodCount: count,
        periodUnit: unit,
        billingCycle: cycleEnum as any,
        renewalDate: nextRenewal || prev.renewalDate,
      }));
    }
  };

  // Open Create Service Modal
  const handleOpenCreate = () => {
    const today = new Date().toISOString().split('T')[0];
    const initialRenewal = calculateNextRenewalDate(today, 1, 'MONTH');
    setFormData({
      ...initialForm,
      startDate: today,
      renewalDate: initialRenewal,
      periodCount: 1,
      periodUnit: 'MONTH',
      billingCycle: 'MONTHLY',
    });
    setIsAddModalOpen(true);
  };

  // Create Service Handler
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let initialPaymentHistory: PaymentRecord[] = [];
      const costNum = Number(formData.cost) || 0;
      if (costNum > 0 || formData.startDate) {
        const cur = (formData.currency || 'VND').toUpperCase();
        const rate = formData.exchangeRate || exchangeRatesMap[cur] || 1;
        const inVnd = cur === 'VND' ? costNum : costNum * rate;
        const sDate = formData.startDate ? new Date(formData.startDate).toLocaleDateString('vi-VN') : '';
        const rDate = formData.renewalDate ? new Date(formData.renewalDate).toLocaleDateString('vi-VN') : '';

        initialPaymentHistory = [
          {
            id: `pay_initial_${Date.now()}`,
            paymentDate: formData.startDate || new Date().toISOString().split('T')[0],
            amount: inVnd,
            originalAmount: costNum,
            currency: cur,
            exchangeRate: rate,
            period: `Đợt 1: Thanh toán khởi tạo / Mua mới ban đầu${rDate ? ` (Kỳ từ ${sDate} đến ${rDate})` : ''}`,
            periodStartDate: formData.startDate || undefined,
            periodEndDate: formData.renewalDate || undefined,
            invoiceNumber: formData.invoiceNumber || undefined,
            contractNumber: formData.contractNumber || undefined,
            status: 'PAID',
            notes: 'Tự động ghi nhận Đợt 1 khi khởi tạo dịch vụ',
            createdAt: new Date().toISOString(),
          },
        ];
      }

      const payload: any = {
        ...formData,
        currency: formData.currency || 'VND',
        specs: {
          bandwidth: formData.bandwidth || undefined,
          ipStatic: formData.ipStatic || undefined,
          billingPeriodCount: formData.periodCount,
          billingPeriodUnit: formData.periodUnit,
          paymentHistory: initialPaymentHistory,
          assignedUserId: formData.assignedUserId || undefined,
          assignedAssetId: formData.assignedAssetId || undefined,
          exchangeRate: formData.exchangeRate || 1,
        },
      };

      const res = await fetch('/api/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok) {
        setIsAddModalOpen(false);
        loadData();
      } else {
        alert(data.error || 'Thêm dịch vụ thất bại');
      }
    } catch {
      alert('Lỗi kết nối khi thêm dịch vụ');
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (svc: ITServiceItem) => {
    setEditingId(svc.id);
    const pCount = svc.specs?.billingPeriodCount || (svc.billingCycle === 'ANNUAL' ? 1 : svc.billingCycle === 'QUARTERLY' ? 3 : svc.billingCycle === 'SEMI_ANNUAL' ? 6 : svc.billingCycle === 'BIENNIAL' ? 2 : svc.billingCycle === 'TRIENNIAL' ? 3 : 1);
    const pUnit = svc.specs?.billingPeriodUnit || (['ANNUAL', 'BIENNIAL', 'TRIENNIAL'].includes(svc.billingCycle) ? 'YEAR' : svc.billingCycle === 'ONE_TIME' ? 'ONE_TIME' : 'MONTH');

    const svcCurr = svc.currency || 'VND';
    setEditFormData({
      serviceCode: svc.serviceCode,
      name: svc.name,
      serviceType: svc.serviceType,
      status: svc.status,
      billingCycle: svc.billingCycle,
      periodCount: pCount,
      periodUnit: pUnit,
      cost: svc.cost ? String(svc.cost) : '',
      currency: svcCurr,
      exchangeRate: svc.specs?.exchangeRate || exchangeRatesMap[svcCurr.toUpperCase()] || 1,
      startDate: svc.startDate ? new Date(svc.startDate).toISOString().split('T')[0] : '',
      renewalDate: svc.renewalDate ? new Date(svc.renewalDate).toISOString().split('T')[0] : '',
      accountNumber: svc.accountNumber || '',
      contractNumber: svc.contractNumber || '',
      invoiceNumber: svc.invoiceNumber || '',
      vendorId: svc.vendorId || '',
      companyName: svc.companyName || '',
      locationId: svc.locationId || '',
      contactSupport: svc.contactSupport || '',
      assignedUserId: svc.specs?.assignedUserId || '',
      assignedAssetId: svc.specs?.assignedAssetId || '',
      bandwidth: svc.specs?.bandwidth || '',
      ipStatic: svc.specs?.ipStatic || '',
      notes: svc.notes || '',
      paymentHistory: Array.isArray(svc.specs?.paymentHistory) ? svc.specs.paymentHistory : [],
    });
    setIsEditModalOpen(true);
  };

  // Update Service Handler
  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;

    try {
      const payload: any = {
        ...editFormData,
        currency: editFormData.currency || 'VND',
        specs: {
          ...(selectedService?.specs || {}),
          bandwidth: editFormData.bandwidth || undefined,
          ipStatic: editFormData.ipStatic || undefined,
          billingPeriodCount: editFormData.periodCount,
          billingPeriodUnit: editFormData.periodUnit,
          paymentHistory: editFormData.paymentHistory || [],
          assignedUserId: editFormData.assignedUserId || undefined,
          assignedAssetId: editFormData.assignedAssetId || undefined,
          exchangeRate: editFormData.exchangeRate || 1,
        },
      };

      const res = await fetch(`/api/services/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok) {
        setIsEditModalOpen(false);
        setEditingId(null);
        if (selectedService?.id === editingId) {
          setSelectedService(data.data);
        }
        loadData();
      } else {
        alert(data.error || 'Cập nhật dịch vụ thất bại');
      }
    } catch {
      alert('Lỗi kết nối khi cập nhật dịch vụ');
    }
  };

  // Delete Service Handler
  const handleDeleteService = async (id: string, name: string) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa dịch vụ "${name}"?
Hành động này không thể hoàn tác.`)) return;
    try {
      const res = await fetch(`/api/services/${id}`, { method: 'DELETE' });
      if (res.ok) {
        loadData();
        if (selectedService?.id === id) setIsDetailModalOpen(false);
      } else {
        const data = await res.json();
        alert(data.error || 'Xóa dịch vụ thất bại');
      }
    } catch {
      alert('Lỗi kết nối');
    }
  };

  // Helper: Retrieve effective payment history, auto-generating Batch 1 if missing
  const getEffectiveServicePayments = (svc: ITServiceItem): PaymentRecord[] => {
    if (Array.isArray(svc.specs?.paymentHistory) && svc.specs.paymentHistory.length > 0) {
      return svc.specs.paymentHistory;
    }
    // Fallback: Generate Initial Batch 1 from service's base data
    const rawCost = Number(svc.cost) || 0;
    if (rawCost <= 0 && !svc.startDate) return [];

    const cur = (svc.currency || 'VND').toUpperCase();
    const rate = svc.specs?.exchangeRate || exchangeRatesMap[cur] || 1;
    const inVnd = cur === 'VND' ? rawCost : rawCost * rate;
    const sDate = svc.startDate ? new Date(svc.startDate).toLocaleDateString('vi-VN') : 'Ban đầu';
    const rDate = svc.renewalDate ? new Date(svc.renewalDate).toLocaleDateString('vi-VN') : '';

    return [
      {
        id: `pay_initial_${svc.id}`,
        paymentDate: svc.startDate ? new Date(svc.startDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        amount: inVnd,
        originalAmount: rawCost,
        currency: cur,
        exchangeRate: rate,
        period: `Đợt 1: Thanh toán khởi tạo / Mua mới ban đầu${rDate ? ` (Kỳ từ ${sDate} đến ${rDate})` : ''}`,
        periodStartDate: svc.startDate ? new Date(svc.startDate).toISOString().split('T')[0] : undefined,
        periodEndDate: svc.renewalDate ? new Date(svc.renewalDate).toISOString().split('T')[0] : undefined,
        invoiceNumber: svc.invoiceNumber || undefined,
        contractNumber: svc.contractNumber || undefined,
        status: 'PAID',
        notes: 'Tự động ghi nhận Đợt 1 từ thông tin khởi tạo ban đầu',
        createdAt: svc.createdAt || new Date().toISOString(),
      },
    ];
  };

  // Add / Save New Payment Record to Service
  const handleSavePaymentRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedService) return;

    const rawAmount = parseFloat(String(paymentForm.amount).replace(/[^0-9.-]+/g, '')) || 0;
    if (rawAmount <= 0) {
      alert('Vui lòng nhập số tiền thanh toán hợp lệ (> 0)');
      return;
    }

    const cur = (paymentForm.currency || 'VND').toUpperCase();
    const rate = paymentForm.exchangeRate || exchangeRatesMap[cur] || 1;
    const inVnd = cur === 'VND' ? rawAmount : rawAmount * rate;

    const currentHistory = getEffectiveServicePayments(selectedService);
    const nextBatchNumber = currentHistory.length + 1;

    let periodStr = paymentForm.period.trim();
    if (paymentForm.periodStartDate && paymentForm.periodEndDate) {
      const s = new Date(paymentForm.periodStartDate).toLocaleDateString('vi-VN');
      const end = new Date(paymentForm.periodEndDate).toLocaleDateString('vi-VN');
      if (!periodStr) {
        periodStr = `Đợt ${nextBatchNumber}: Kỳ từ ${s} đến ${end}`;
      }
    } else if (!periodStr) {
      periodStr = `Đợt ${nextBatchNumber}: Kỳ cước dịch vụ`;
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
      const res = await fetch(`/api/services/${selectedService.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          renewalDate: paymentForm.periodEndDate || selectedService.renewalDate,
          status: 'ACTIVE',
          specs: {
            ...(selectedService.specs || {}),
            paymentHistory: updatedHistory,
          },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setSelectedService(data.data);
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

  // Delete a Payment Record from Service
  const handleDeletePaymentRecord = async (serviceId: string, payId: string) => {
    if (!selectedService || !confirm('Bạn có chắc chắn muốn xóa đợt thanh toán này khỏi lịch sử?')) return;

    const currentHistory = getEffectiveServicePayments(selectedService);
    const updatedHistory = currentHistory.filter((p) => p.id !== payId);

    try {
      const res = await fetch(`/api/services/${serviceId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          specs: {
            ...(selectedService.specs || {}),
            paymentHistory: updatedHistory,
          },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setSelectedService(data.data);
        loadData();
      }
    } catch {
      alert('Lỗi kết nối');
    }
  };

  // Quick Renewal Handler with auto payment recording (Đợt 2, Đợt 3...)
  const handleQuickRenew = async (svc: ITServiceItem, monthsToAdd: number) => {
    const baseDate = svc.renewalDate ? new Date(svc.renewalDate) : new Date();
    const newRenewal = new Date(baseDate);
    newRenewal.setMonth(newRenewal.getMonth() + monthsToAdd);

    const costNum = Number(svc.cost) || 0;
    const cur = (svc.currency || 'VND').toUpperCase();
    const rate = svc.specs?.exchangeRate || exchangeRatesMap[cur] || 1;
    const inVnd = cur === 'VND' ? costNum : costNum * rate;

    const fromDateStr = svc.renewalDate ? new Date(svc.renewalDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
    const toDateStr = newRenewal.toISOString().split('T')[0];

    const currentHistory = getEffectiveServicePayments(svc);
    const nextBatchNumber = currentHistory.length + 1;

    const paymentRecord: PaymentRecord = {
      id: `pay_${Date.now()}`,
      paymentDate: new Date().toISOString().split('T')[0],
      amount: inVnd,
      originalAmount: costNum,
      currency: cur,
      exchangeRate: rate,
      period: `Đợt ${nextBatchNumber}: Gia hạn thêm ${monthsToAdd} tháng (Kỳ từ ${new Date(fromDateStr).toLocaleDateString('vi-VN')} đến ${newRenewal.toLocaleDateString('vi-VN')})`,
      periodStartDate: fromDateStr,
      periodEndDate: toDateStr,
      status: 'PAID',
      notes: `Tự động ghi nhận Đợt ${nextBatchNumber} khi gia hạn nhanh ${monthsToAdd} tháng`,
      createdAt: new Date().toISOString(),
    };

    try {
      const res = await fetch(`/api/services/${svc.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          renewalDate: toDateStr,
          status: 'ACTIVE',
          specs: {
            ...(svc.specs || {}),
            paymentHistory: [paymentRecord, ...currentHistory],
          },
        }),
      });

      if (res.ok) {
        const updatedData = await res.json();
        setSelectedService(updatedData.data);
        loadData();
      } else {
        alert('Gia hạn thất bại');
      }
    } catch {
      alert('Lỗi kết nối');
    }
  };

  // Download Excel Template for IT Services (Lazy loaded)
  const handleDownloadTemplate = async () => {
    const ExcelJS = await import('exceljs');
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Mau_Import_Dich_Vu');

    worksheet.columns = [
      { header: 'Mã Dịch Vụ (*)', key: 'serviceCode', width: 16 },
      { header: 'Tên Gói Dịch Vụ (*)', key: 'name', width: 35 },
      { header: 'Loại Dịch Vụ (*)', key: 'serviceType', width: 22 },
      { header: 'Giá Cước (VNĐ)', key: 'cost', width: 18 },
      { header: 'Chu Kỳ (*)', key: 'billingCycle', width: 16 },
      { header: 'Ngày Bắt Đầu (YYYY-MM-DD)', key: 'startDate', width: 22 },
      { header: 'Ngày Gia Hạn (YYYY-MM-DD)', key: 'renewalDate', width: 22 },
      { header: 'Mã Thuê Bao / Khách Hàng', key: 'accountNumber', width: 22 },
      { header: 'IP Tĩnh / Cấu Hình', key: 'ipStatic', width: 20 },
      { header: 'Băng Thông / Thông Số', key: 'bandwidth', width: 22 },
      { header: 'Nhà Cung Cấp / Đối Tác', key: 'vendorName', width: 25 },
      { header: 'Công Ty Quản Lý', key: 'companyName', width: 25 },
      { header: 'Vị Trí Lắp Đặt', key: 'locationName', width: 20 },
      { header: 'Hotline Hỗ Trợ', key: 'contactSupport', width: 25 },
      { header: 'Ghi Chú', key: 'notes', width: 30 },
    ];

    // Header styling
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF6B21A8' }, // Purple
    };

    // Add sample rows
    worksheet.addRow({
      serviceCode: 'SVC-NET-001',
      name: 'Đường truyền Internet Cáp quang FTTH Viettel Pro 500Mbps',
      serviceType: 'INTERNET',
      cost: 1500000,
      billingCycle: 'MONTHLY',
      startDate: '2025-01-01',
      renewalDate: '2026-01-01',
      accountNumber: 'HNI_FTTH_588291',
      ipStatic: '115.78.22.105 / 29',
      bandwidth: '500 Mbps Quốc tế 30 Mbps',
      vendorName: 'Viettel Telecom',
      companyName: 'Công ty Cổ phần Tập đoàn ABC',
      locationName: 'Phòng IT',
      contactSupport: '18008119 - KTV: 0988.123.456',
      notes: 'Bảo trì định kỳ hàng tháng',
    });

    worksheet.addRow({
      serviceCode: 'SVC-CLOUD-002',
      name: 'Máy chủ Cloud VPS Enterprise 8 vCPU 32GB RAM 500GB NVMe',
      serviceType: 'CLOUD_HOSTING',
      cost: 28800000,
      billingCycle: 'ANNUAL',
      startDate: '2025-01-15',
      renewalDate: '2026-01-15',
      accountNumber: 'AWS-ACC-992182',
      ipStatic: '103.142.26.88',
      bandwidth: '1 Gbps Trong nước',
      vendorName: 'FPT Smart Cloud & Software',
      companyName: 'Công ty Cổ phần Tập đoàn ABC',
      locationName: 'Phòng IT',
      contactSupport: 'support@cloud.vn - 19006600',
      notes: 'Chạy hệ thống ERP & Database',
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Mau_Import_Dich_Vu_IT.xlsx';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Submit Excel File to Import API
  const handleUploadExcel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importFile) {
      alert('Vui lòng chọn file Excel');
      return;
    }

    setIsImporting(true);
    setImportResult(null);

    try {
      const uploadData = new FormData();
      uploadData.append('file', importFile);

      const res = await fetch('/api/services/import', {
        method: 'POST',
        body: uploadData,
      });

      const data = await res.json();
      if (res.ok) {
        setImportResult(data);
        loadData();
      } else {
        alert(data.error || 'Import thất bại');
      }
    } catch {
      alert('Lỗi kết nối khi import Excel');
    } finally {
      setIsImporting(false);
    }
  };

    // Export filtered services to Excel (Lazy loaded)
  const handleExportExcel = async () => {
    if (services.length === 0) {
      alert('Không có dịch vụ IT nào trong danh sách lọc để xuất');
      return;
    }
    const ExcelJS = await import('exceljs');
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Danh Sách Dịch Vụ IT', {
      views: [{ showGridLines: true }],
    });

    // Style Title Header
    worksheet.mergeCells('A1:M1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = 'DANH SÁCH DỊCH VỤ IT, THUÊ BAO & HỢP ĐỒNG SLA';
    titleCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4C1D95' } };
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
    worksheet.getRow(1).height = 35;

    // Subtitle
    worksheet.mergeCells('A2:M2');
    const subCell = worksheet.getCell('A2');
    const filterCompanyText = selectedCompany ? ` | Công ty: ${selectedCompany}` : '';
    subCell.value = `Thời gian xuất: ${new Date().toLocaleString('vi-VN')} | Tổng số lượng: ${services.length} gói dịch vụ lọc${filterCompanyText}`;
    subCell.font = { name: 'Arial', size: 10, italic: true, color: { argb: 'FF475569' } };
    subCell.alignment = { vertical: 'middle', horizontal: 'center' };
    worksheet.getRow(2).height = 20;

    worksheet.addRow([]);

    const headers = [
      'STT',
      'Mã Dịch Vụ',
      'Tên Gói Dịch Vụ / Thuê Bao',
      'Phân Loại Dịch Vụ',
      'Trạng Thái',
      'Chu Kỳ Thanh Toán',
      'Chi Phí (VNĐ)',
      'Ngày Bắt Đầu',
      'Ngày Gia Hạn / Hết Hạn',
      'Mã Thuê Bao / IP Tĩnh',
      'Nhà Cung Cấp / Đối Tác',
      'Công Ty Quản Lý & Phòng Ban',
      'Hotline & Kỹ Thuật Hỗ Trợ',
    ];

    const headerRow = worksheet.addRow(headers);
    headerRow.height = 26;
    headerRow.eachCell((cell) => {
      cell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF6D28D9' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        bottom: { style: 'medium', color: { argb: 'FF3B0764' } },
      };
    });

    services.forEach((s, index) => {
      const typeObj = DEFAULT_SERVICE_TYPES.find((t) => t.value === s.serviceType);
      const cycleObj = BILLING_CYCLES.find((b) => b.value === s.billingCycle);

      const compDept = [s.companyName, (s.specs as any)?.department].filter(Boolean).join(' - ') || s.companyName || '—';

      const row = worksheet.addRow([
        index + 1,
        s.serviceCode,
        s.name,
        typeObj ? typeObj.label : s.serviceType,
        s.status === 'ACTIVE' ? 'Đang hoạt động' : s.status === 'PENDING_RENEWAL' ? 'Sắp đến hạn' : s.status === 'EXPIRED' ? 'Đã quá hạn' : s.status,
        cycleObj ? cycleObj.label : s.billingCycle,
        s.cost ? Number(s.cost) : 0,
        s.startDate ? new Date(s.startDate).toLocaleDateString('vi-VN') : '—',
        s.renewalDate ? new Date(s.renewalDate).toLocaleDateString('vi-VN') : 'Vĩnh viễn',
        s.accountNumber || '—',
        s.vendor?.name || '—',
        compDept,
        s.contactSupport || '—',
      ]);

      row.height = 24;
      row.alignment = { vertical: 'middle' };
      row.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
      row.getCell(2).alignment = { vertical: 'middle', horizontal: 'center' };
      row.getCell(5).alignment = { vertical: 'middle', horizontal: 'center' };
      row.getCell(6).alignment = { vertical: 'middle', horizontal: 'center' };
      row.getCell(7).numFmt = '#,##0 "₫"';
      row.getCell(8).alignment = { vertical: 'middle', horizontal: 'center' };
      row.getCell(9).alignment = { vertical: 'middle', horizontal: 'center' };

      if (index % 2 === 1) {
        row.eachCell((c) => {
          c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFAF5FF' } };
        });
      }
    });

    worksheet.columns = [
      { width: 6 },  // STT
      { width: 16 }, // Mã
      { width: 35 }, // Tên
      { width: 22 }, // Loại
      { width: 16 }, // Trạng thái
      { width: 18 }, // Chu kỳ
      { width: 18 }, // Chi phí
      { width: 15 }, // Ngày BĐ
      { width: 16 }, // Ngày GH
      { width: 22 }, // Mã TB / IP
      { width: 25 }, // Nhà CC
      { width: 28 }, // Công ty & Phòng ban
      { width: 25 }, // Hotline
    ];

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Danh_sach_Dich_vu_IT_${new Date().toISOString().split('T')[0]}.xlsx`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Status Badge Renderer
  const renderStatusBadge = (status: string, renewalDate: string | null) => {
    if (status === 'EXPIRED') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
          Đã quá hạn
        </span>
      );
    }
    if (status === 'PENDING_RENEWAL') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
          <Clock className="w-3 h-3 text-amber-500" />
          Sắp đến hạn
        </span>
      );
    }
    if (status === 'ACTIVE') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>{isEn ? 'Active' : 'Đang hoạt động'}</span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
        {status}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <span className="p-2 bg-gradient-to-tr from-purple-600 to-indigo-600 text-white rounded-2xl shadow-xs">
              <Globe className="w-5 h-5" />
            </span>
            <span>{t('services.title', 'Dịch Vụ IT, Thuê Bao & Hợp Đồng SLA')}</span>
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            {t('services.subtitle', 'Quản lý tập trung đường truyền Internet, máy chủ Cloud/VPS, tên miền SSL, hotline VoIP và lịch sử thanh toán')}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => {
              setImportFile(null);
              setImportResult(null);
              setIsImportModalOpen(true);
            }}
            className="px-3.5 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-purple-600 rotate-180" />
            <span>Import Excel</span>
          </button>

          <button
            type="button"
            onClick={handleExportExcel}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600" />
            <span>{t('assets.export_excel', 'Xuất Excel')}</span>
          </button>

          <button
            type="button"
            onClick={handleOpenCreate}
            className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{t('services.add_btn', '+ Thêm Dịch Vụ Mới')}</span>
          </button>
        </div>
      </div>

      {/* Summary Statistics Cards with Multi-Currency Selector */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">
            {language === 'en' ? 'Service Overview & KPIs' : 'Chỉ số tổng quan dịch vụ'}
          </span>

        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div className="p-4 bg-white border border-slate-200/80 rounded-2xl shadow-2xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{language === 'en' ? 'Total Subscriptions' : 'Tổng gói dịch vụ'}</p>
              <p className="text-xl font-extrabold text-slate-900">{filteredStats.total}</p>
            </div>
          </div>

          <div className="p-4 bg-white border border-slate-200/80 rounded-2xl shadow-2xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">{language === 'en' ? 'Active' : 'Đang hoạt động'}</p>
              <p className="text-xl font-extrabold text-emerald-700">{filteredStats.active}</p>
            </div>
          </div>

          <div className="p-4 bg-white border border-slate-200/80 rounded-2xl shadow-2xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">{language === 'en' ? 'Expiring Soon' : 'Sắp đến hạn gia hạn'}</p>
              <p className="text-xl font-extrabold text-amber-700">{filteredStats.expiringSoon}</p>
            </div>
          </div>

          <div className="p-4 bg-white border border-slate-200/80 rounded-2xl shadow-2xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">{language === 'en' ? 'Annual Recurring Cost' : 'Chi phí duy trì / Năm'}</p>
              <p className="text-sm font-extrabold text-blue-800 font-mono">
                {formatPrice(filteredStats.totalYearlyCost, selectedCurrency)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2.5">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder={language === 'en' ? 'Search by service code, plan name, contract #, static IP, hotline...' : 'Tìm kiếm theo mã dịch vụ, tên gói cước, số hợp đồng, IP tĩnh, hotline...'}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs outline-none focus:ring-2 focus:ring-purple-500 font-medium"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-semibold text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
            >
              {DEFAULT_SERVICE_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {getServiceTypeLabel(t.value, language)}
                </option>
              ))}
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-semibold text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
            >
              <option value="ALL">{language === 'en' ? 'All Statuses' : 'Tất cả trạng thái'}</option>
              <option value="ACTIVE">{language === 'en' ? '🟢 Active' : '🟢 Đang hoạt động'}</option>
              <option value="PENDING_RENEWAL">{language === 'en' ? '⚠️ Expiring Soon' : '⚠️ Sắp đến hạn'}</option>
              <option value="EXPIRED">{language === 'en' ? '🔴 Expired' : '🔴 Đã quá hạn'}</option>
              <option value="SUSPENDED">{language === 'en' ? '⏸️ Suspended' : '⏸️ Tạm ngưng'}</option>
            </select>

            <select
              value={selectedVendor}
              onChange={(e) => setSelectedVendor(e.target.value)}
              className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-semibold text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
            >
              <option value="ALL">{language === 'en' ? 'All Vendors / Providers' : 'Tất cả nhà mạng / đối tác'}</option>
              {vendors.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Quick Filter Row */}
        <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800 flex-wrap gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-bold text-slate-400">{language === 'en' ? 'Quick Filter:' : 'Lọc nhanh trạng thái:'}</span>
            {[
              { id: 'ALL', label: language === 'en' ? 'All' : 'Tất cả' },
              { id: 'ACTIVE', label: language === 'en' ? '🟢 Active' : '🟢 Đang hoạt động' },
              { id: 'PENDING_RENEWAL', label: language === 'en' ? '⚠️ Expiring (< 30d)' : '⚠️ Sắp đến hạn (< 30 ngày)' },
              { id: 'EXPIRED', label: language === 'en' ? '🔴 Expired' : '🔴 Đã quá hạn' },
            ].map((st) => (
              <button
                key={st.id}
                type="button"
                onClick={() => setSelectedStatus(st.id)}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  selectedStatus === st.id
                    ? 'bg-purple-600 text-white shadow-2xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>

          {(search || selectedType !== 'ALL' || selectedStatus !== 'ALL' || selectedVendor !== 'ALL') && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setSelectedType('ALL');
                setSelectedStatus('ALL');
                setSelectedVendor('ALL');
              }}
              className="inline-flex items-center gap-1 px-3 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>{language === 'en' ? 'Reset Filters' : 'Xóa bộ lọc'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Services Table View */}
      {loading ? (
        <div className="p-12 text-center text-xs text-slate-500 flex items-center justify-center space-x-2">
          <RefreshCw className="w-4 h-4 animate-spin text-purple-600" />
          <span>{language === 'en' ? 'Loading IT services...' : 'Đang tải danh sách dịch vụ IT...'}</span>
        </div>
      ) : services.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xs space-y-3">
          <div className="w-12 h-12 rounded-3xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto text-2xl">
            🌐
          </div>
          <h3 className="font-bold text-slate-800 dark:text-white text-sm">{language === 'en' ? 'No IT services found' : 'Không tìm thấy dịch vụ IT nào phù hợp'}</h3>
          <p className="text-xs text-slate-500">{language === 'en' ? 'Add internet circuits, cloud hosting, or subscriptions to start monitoring' : 'Hãy thêm đường truyền, máy chủ Cloud hoặc gói cước mới để bắt đầu theo dõi'}</p>
          <button
            type="button"
            onClick={handleOpenCreate}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer inline-flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>{language === 'en' ? 'Add First Service' : 'Thêm Dịch Vụ Đầu Tiên'}</span>
          </button>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden">
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse min-w-[900px]">
              <thead className="bg-slate-50/90 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-700 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-2 px-2.5 sticky left-0 z-20 bg-slate-50 dark:bg-slate-800 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.06)] min-w-[155px]">
                    {language === 'en' ? 'SERVICE CODE & NAME' : 'MÃ DỊCH VỤ & TÊN GÓI'}
                  </th>
                  <th className="py-2 px-2 min-w-[105px]">{language === 'en' ? 'CATEGORY' : 'PHÂN LOẠI'}</th>
                  <th className="py-2 px-2 min-w-[120px] max-w-[200px]">{language === 'en' ? 'VENDOR / CARRIER' : 'ĐỐI TÁC / NHÀ MẠNG'}</th>
                  <th className="py-2 px-2 min-w-[105px]">{language === 'en' ? 'ACCOUNT # / STATIC IP' : 'MÃ THUÊ BAO / IP'}</th>
                  <th className="py-2 px-2 min-w-[100px]">{language === 'en' ? 'COST & CYCLE' : 'CHI PHÍ & CHU KỲ'}</th>
                  <th className="py-2 px-2 min-w-[90px]">{language === 'en' ? 'RENEWAL DATE' : 'HẠN GIA HẠN'}</th>
                  <th className="py-2 px-1.5 text-right sticky right-0 z-20 bg-slate-50 dark:bg-slate-800 shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.06)] min-w-[110px]">
                    {language === 'en' ? 'ACTIONS' : 'THAO TÁC'}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {paginatedServices.map((svc) => {
                  const typeObj = DEFAULT_SERVICE_TYPES.find((t) => t.value === svc.serviceType);
                  const TypeIcon = typeObj?.icon || Globe;
                  const cycleObj = BILLING_CYCLES.find((b) => b.value === svc.billingCycle);

                  return (
                    <tr
                      key={svc.id}
                      onClick={() => {
                        setSelectedService(svc);
                        setIsDetailModalOpen(true);
                      }}
                      className="hover:bg-purple-50/40 dark:hover:bg-slate-800/40 transition-colors cursor-pointer group"
                    >
                      {/* 1. Mã & Tên (Sticky Left - 2 lines) */}
                      <td className="py-2 px-2.5 sticky left-0 z-10 bg-white dark:bg-slate-900 group-hover:bg-purple-50/90 dark:group-hover:bg-slate-800/90 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.06)] transition-colors min-w-[155px]">
                        <div className="flex items-start gap-1.5">
                          <div className="w-6 h-6 rounded-lg bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 flex items-center justify-center font-bold shrink-0 mt-0.5 border border-purple-200 dark:border-purple-800">
                            <TypeIcon className="w-3 h-3" />
                          </div>
                          <div className="min-w-0">
                            <span className="font-mono text-[9.5px] font-bold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 px-1.5 py-0.2 rounded border border-purple-200/80 dark:border-purple-800 inline-block mb-0.5 whitespace-nowrap leading-tight">
                              {svc.serviceCode}
                            </span>
                            <h4 className="font-bold text-slate-900 dark:text-white text-[11px] leading-snug group-hover:text-purple-700 dark:group-hover:text-purple-400 transition-colors line-clamp-2">
                              {svc.name}
                            </h4>
                          </div>
                        </div>
                      </td>

                      {/* 2. Phân Loại (2-3 DÒNG GỌN GÀNG KHI DÀI) */}
                      <td className="py-2 px-2 min-w-[105px]">
                        <div className="inline-flex items-start gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200/70 dark:border-slate-700 max-w-[115px] leading-tight">
                          <TypeIcon className={`w-2.5 h-2.5 shrink-0 mt-0.5 ${typeObj?.color || 'text-slate-600'}`} />
                          <span className="break-words line-clamp-3">{getServiceTypeLabel(svc.serviceType, language)}</span>
                        </div>
                      </td>

                      {/* 3. Nhà Mạng & Đối Tác (2 lines) */}
                      <td className="py-2 px-2 min-w-[120px] max-w-[200px]" onClick={(e) => e.stopPropagation()}>
                        <div className="space-y-0.5">
                          {svc.vendor ? (
                            <QuickLink
                              type="vendor"
                              id={svc.vendor.id || svc.vendor.name}
                              label={svc.vendor.name}
                              icon="🏢"
                              showIcon={false}
                              multiline
                              maxLines={3}
                              className="font-bold text-slate-800 dark:text-slate-200 text-[10.5px] leading-snug line-clamp-3 break-words"
                            />
                          ) : (
                            <span className="text-slate-400 italic font-normal text-[10.5px]">—</span>
                          )}
                          {svc.contactSupport ? (
                            <p className="text-[9px] text-slate-500 dark:text-slate-400 font-mono flex items-center gap-0.5 truncate max-w-[190px]" title={svc.contactSupport}>
                              <Phone className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
                              <span className="truncate">{svc.contactSupport}</span>
                            </p>
                          ) : null}
                        </div>
                      </td>

                      {/* 4. Mã Thuê Bao & IP Tĩnh */}
                      <td className="py-2 px-2 font-mono text-[9.5px] min-w-[105px]">
                        <div className="space-y-0.5">
                          {svc.accountNumber ? (
                            <div className="font-bold text-slate-800 dark:text-slate-200 truncate max-w-[110px]" title={svc.accountNumber}>
                              {svc.accountNumber}
                            </div>
                          ) : (
                            <span className="text-slate-400 italic text-[9px]">—</span>
                          )}
                          {svc.specs?.ipStatic && (
                            <div className="text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 border border-blue-200/80 dark:border-blue-800 px-1 py-0.2 rounded text-[9px] inline-flex items-center gap-0.5 truncate max-w-[110px]" title={svc.specs.ipStatic}>
                              <span>🌐</span>
                              <span className="truncate max-w-[90px]">{svc.specs.ipStatic}</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* 5. Chi Phí & Chu Kỳ (Dual-Currency) */}
                      <td className="py-2 px-2 whitespace-nowrap min-w-[100px]">
                        {(() => {
                          const rawCost = Number(svc.cost) || 0;
                          const rawCurr = svc.currency || 'VND';
                          const convertedCost = convertCurrency(rawCost, rawCurr, selectedCurrency);
                          const isDual = rawCost > 0 && rawCurr.toUpperCase() !== selectedCurrency.toUpperCase();

                          return (
                            <div className="space-y-0.5">
                              <div className="font-black text-slate-900 dark:text-white text-[11px] font-mono leading-tight">
                                {rawCost > 0 ? formatPrice(convertedCost, selectedCurrency) : 'Trọn gói'}
                              </div>
                              {isDual && (
                                <div className="text-[8.5px] text-slate-400 font-mono leading-tight">
                                  Gốc: {formatPrice(rawCost, rawCurr)}
                                </div>
                              )}
                              <div className="text-[9px] text-slate-500 dark:text-slate-400 font-medium">
                                {svc.specs?.billingPeriodCount
                                  ? `${svc.specs.billingPeriodCount} ${svc.specs.billingPeriodUnit === 'YEAR' ? 'Năm' : svc.specs.billingPeriodUnit === 'DAY' ? 'Ngày' : 'Tháng'} / lần`
                                  : cycleObj ? cycleObj.label : svc.billingCycle}
                              </div>
                            </div>
                          );
                        })()}
                      </td>

                      {/* 6. Hạn Gia Hạn & Trạng Thái */}
                      <td className="py-2 px-2 whitespace-nowrap min-w-[90px]">
                        <div className="space-y-0.5">
                          <div className="font-mono text-[10px] font-bold text-slate-800 dark:text-slate-200">
                            {svc.renewalDate ? new Date(svc.renewalDate).toLocaleDateString('vi-VN') : 'Vĩnh viễn'}
                          </div>
                          <div>
                            {renderStatusBadge(svc.status, svc.renewalDate)}
                          </div>
                        </div>
                      </td>

                      {/* 7. Action Buttons (Sticky Right - All Icons Direct) */}
                      <td
                        className="py-2 px-1.5 text-right sticky right-0 z-10 bg-white dark:bg-slate-900 group-hover:bg-purple-50/90 dark:group-hover:bg-slate-800/90 shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.06)] transition-colors min-w-[110px]"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-end gap-1 shrink-0">
                          {/* 1. Sửa */}
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(svc)}
                            title="Chỉnh sửa thông tin dịch vụ"
                            className="p-1 text-blue-600 dark:text-blue-400 hover:bg-blue-100/70 dark:hover:bg-blue-950 rounded-md transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* 2. Chi tiết & Lịch sử thanh toán */}
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedService(svc);
                              setIsDetailModalOpen(true);
                            }}
                            title="Xem chi tiết & lịch sử thanh toán"
                            className="p-1 text-purple-600 dark:text-purple-400 hover:bg-purple-100/70 dark:hover:bg-purple-950 rounded-md transition-colors cursor-pointer"
                          >
                            <Receipt className="w-3.5 h-3.5" />
                          </button>

                          {/* 3. Gia hạn nhanh 12 tháng */}
                          <button
                            type="button"
                            onClick={() => handleQuickRenew(svc, 12)}
                            title="Gia hạn nhanh thêm 12 tháng"
                            className="p-1 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100/70 dark:hover:bg-emerald-950 rounded-md transition-colors cursor-pointer"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>

                          {/* 4. Xóa */}
                          <button
                            type="button"
                            onClick={() => handleDeleteService(svc.id, svc.name)}
                            title="Xóa dịch vụ này"
                            className="p-1 text-rose-500 dark:text-rose-400 hover:bg-rose-100/70 dark:hover:bg-rose-950 rounded-md transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalFilteredServices > pageSize && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 text-xs shrink-0 rounded-b-2xl">
              <div className="text-slate-500 font-medium">
                Hiển thị <span className="font-bold text-slate-900 dark:text-white">{Math.min(totalFilteredServices, (currentPage - 1) * pageSize + 1)}</span> - <span className="font-bold text-slate-900 dark:text-white">{Math.min(totalFilteredServices, currentPage * pageSize)}</span> trên <span className="font-bold text-purple-600 dark:text-purple-400">{totalFilteredServices}</span> dịch vụ
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
      )}

      {/* DETAIL MODAL (BÓC TÁCH COMPONENT CHUYÊN TRÁCH) */}
      <ServiceDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        service={selectedService}
        selectedCurrency={selectedCurrency}
        users={users}
        assets={assets}
        currencies={currencies}
        exchangeRatesMap={exchangeRatesMap}
        onOpenEdit={(svc) => handleOpenEdit(svc)}
        onQuickRenew={(svc, months) => handleQuickRenew(svc, months)}
        onDeletePaymentRecord={(sId, pId) => handleDeletePaymentRecord(sId, pId)}
        onOpenDocPreview={(svc) => {
          setSelectedService(svc);
          setIsDocPreviewOpen(true);
        }}
        onOpenAddPayment={(svc) => {
          setSelectedService(svc);
          setIsAddPaymentModalOpen(true);
        }}
      />

      {/* ==================== MODAL: XEM NHANH CHỨNG TỪ DỊCH VỤ ==================== */}
      {selectedService && (
        <DocumentQuickPreviewModal
          isOpen={isDocPreviewOpen}
          onClose={() => setIsDocPreviewOpen(false)}
          title={selectedService.name}
          subtitle="Dịch vụ IT / Hạ tầng"
          entityType="service"
          entityId={selectedService.id}
          invoiceNumber={selectedService.invoiceNumber}
          contractNumber={selectedService.contractNumber}
          directUrl={selectedService.contractUrl}
          initialDocuments={selectedService.documents || []}
          onUpdateDirectUrl={async (newUrl) => {
            const res = await fetch(`/api/services/${selectedService.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ contractUrl: newUrl }),
            });
            if (res.ok) {
              const updated = await res.json();
              setSelectedService(updated.data);
              loadData();
            }
          }}
          themeColor="indigo"
        />
      )}

      {/* MODAL: ADD NEW PAYMENT RECORD (BÓC TÁCH COMPONENT CHUYÊN TRÁCH) */}
      <ServicePaymentModal
        isOpen={isAddPaymentModalOpen}
        onClose={() => setIsAddPaymentModalOpen(false)}
        service={selectedService}
        currencies={currencies}
        exchangeRatesMap={exchangeRatesMap}
        onSuccess={() => loadData()}
        onOpenAddCurrency={() => setIsAddCurrencyModalOpen(true)}
      />

      {/* MODAL: ADD & EDIT SERVICE (BÓC TÁCH COMPONENT CHUYÊN TRÁCH) */}
      <ServiceFormModal
        isOpen={isAddModalOpen || isEditModalOpen}
        mode={isEditModalOpen ? 'edit' : 'add'}
        onClose={() => {
          setIsAddModalOpen(false);
          setIsEditModalOpen(false);
        }}
        initialData={isEditModalOpen ? editFormData : formData}
        serviceId={editingId}
        vendors={vendors}
        companies={companies}
        locations={locations}
        users={users}
        assets={assets}
        currencies={currencies}
        exchangeRatesMap={exchangeRatesMap}
        onSuccess={() => loadData()}
        onOpenAddCurrency={() => setIsAddCurrencyModalOpen(true)}
        onAddVendor={handleAddVendor}
        onEditVendor={handleEditVendor}
        onDeleteVendor={handleDeleteVendor}
        onAddCompany={handleAddCompany}
        onEditCompany={handleEditCompany}
        onDeleteCompany={handleDeleteCompany}
        onAddLocation={handleAddLocation}
        onEditLocation={handleEditLocation}
        onDeleteLocation={handleDeleteLocation}
      />

      {/* MODAL: IMPORT EXCEL FOR IT SERVICES (BÓC TÁCH COMPONENT CHUYÊN TRÁCH) */}
      <ServiceImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={() => loadData()}
      />

      {/* MODAL: THÊM LOẠI TIỀN TỆ MỚI */}
      {isAddCurrencyModalOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">💰</span>
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                  Thêm Loại Tiền Tệ Mới
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddCurrencyModalOpen(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const code = newCurrencyCode.trim().toUpperCase();
                const rate = parseFloat(newCurrencyRate.replace(/,/g, ''));
                if (!code) return alert('Vui lòng nhập mã tiền tệ (VD: SGD, AUD)');
                if (!rate || isNaN(rate) || rate <= 0) return alert('Vui lòng nhập tỷ giá quy đổi sang VND hợp lệ (> 0)');
                if (currencies.some((c) => c.code === code)) return alert(`Mã tiền tệ ${code} đã tồn tại trong danh sách!`);

                const newCur: CurrencyConfig = {
                  code,
                  name: newCurrencyName.trim() || code,
                  symbol: newCurrencySymbol.trim() || code,
                  rateToVnd: rate,
                  flag: newCurrencyFlag.trim() || '🌐',
                };

                setCurrencies((prev) => [...prev, newCur]);
                setIsAddCurrencyModalOpen(false);
                setNewCurrencyCode('');
                setNewCurrencyName('');
                setNewCurrencyRate('');
                setNewCurrencySymbol('');
                setNewCurrencyFlag('🌐');
              }}
              className="space-y-3.5"
            >
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Mã tiền tệ (ISO) (*):
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="VD: CHF, HKD, TWD"
                    value={newCurrencyCode}
                    onChange={(e) => setNewCurrencyCode(e.target.value.toUpperCase())}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono font-bold uppercase text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Icon / Cờ:
                  </label>
                  <input
                    type="text"
                    placeholder="🇨🇭"
                    value={newCurrencyFlag}
                    onChange={(e) => setNewCurrencyFlag(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-center text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Tên gọi tiền tệ:
                </label>
                <input
                  type="text"
                  placeholder="VD: Franc Thụy Sĩ, Đô la Hồng Kông"
                  value={newCurrencyName}
                  onChange={(e) => setNewCurrencyName(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Ký hiệu đại diện:
                  </label>
                  <input
                    type="text"
                    placeholder="VD: Fr, HK$, NT$"
                    value={newCurrencySymbol}
                    onChange={(e) => setNewCurrencySymbol(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Tỷ giá sang VND (*):
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="VD: 28500"
                    value={newCurrencyRate}
                    onChange={(e) => setNewCurrencyRate(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-purple-600 dark:text-purple-400 outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div className="p-3 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 rounded-2xl text-[11px] text-purple-900 dark:text-purple-300">
                <span>💡 Sau khi thêm, hệ thống sẽ tự động bổ sung loại tiền này vào danh sách tỷ giá quy đổi của dịch vụ IT & hợp đồng.</span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddCurrencyModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
                >
                  Hủy (ESC)
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer"
                >
                  Thêm Tiền Tệ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
