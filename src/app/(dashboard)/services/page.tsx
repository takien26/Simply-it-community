'use client';

import { useLanguage } from '@/lib/i18n/context';
import { QuickLink } from '@/components/common/QuickLink';
import Link from 'next/link';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { fetchWithSwr } from '@/lib/client-cache';
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
      });

      // 2. Fetch Assets with SWR Cache
      fetchWithSwr<any>('/api/assets?pageSize=300', (assetsRes) => {
        if (assetsRes && (assetsRes.success || assetsRes.data)) {
          setAssets(assetsRes.data || assetsRes.assets || []);
        }
      });

      // 3. Fetch Master Data with SWR Cache
      fetchWithSwr<any>('/api/master-data', (masterRes) => {
        if (masterRes?.data) {
          const md = masterRes.data;
          if (md.vendors) setVendors(md.vendors);
          if (md.locations) setLocations(md.locations);
          if (md.companies) setCompanies(md.companies);
          if (md.users) setUsers(md.users);
        }
      });
    } catch (err) {
      console.error('Failed to load services data:', err);
      setLoading(false);
    }
  }, [search, selectedType, selectedStatus, selectedVendor, selectedCompany]);

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

      {/* DETAIL MODAL WITH FULL PAYMENT HISTORY TABLE */}
      {isDetailModalOpen && selectedService && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-3 sm:p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-5xl w-full flex flex-col max-h-[92vh] border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-purple-50 to-indigo-50 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-600 text-white flex items-center justify-center shadow-xs text-lg font-bold">
                  🌐
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-purple-700 bg-purple-100/70 px-2 py-0.5 rounded-md">
                      {selectedService.serviceCode}
                    </span>
                    {renderStatusBadge(selectedService.status, selectedService.renewalDate)}
                  </div>
                  <h3 className="font-extrabold text-base text-slate-900 leading-snug mt-0.5">{selectedService.name}</h3>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setIsDetailModalOpen(false);
                    handleOpenEdit(selectedService);
                  }}
                  className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Sửa</span>
                </button>
                <button
                  onClick={() => setIsDetailModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto space-y-5 text-xs flex-1">
              {/* Specs and Key Info Cards */}
              {(() => {
                const rawCost = Number(selectedService.cost) || 0;
                const rawCurr = (selectedService.currency || 'VND').toUpperCase();
                const rate = selectedService.specs?.exchangeRate || exchangeRatesMap[rawCurr] || 1;
                const inVnd = rawCost * rate;
                const convertedCost = convertCurrency(rawCost, rawCurr, selectedCurrency);
                const isDual = rawCost > 0 && rawCurr !== selectedCurrency.toUpperCase();

                // Tính chi phí dự toán 1 năm (Annual cost)
                const pCount = selectedService.specs?.billingPeriodCount || (selectedService.billingCycle === 'ANNUAL' ? 1 : selectedService.billingCycle === 'QUARTERLY' ? 3 : selectedService.billingCycle === 'SEMI_ANNUAL' ? 6 : selectedService.billingCycle === 'BIENNIAL' ? 2 : selectedService.billingCycle === 'TRIENNIAL' ? 3 : 1);
                const pUnit = selectedService.specs?.billingPeriodUnit || (['ANNUAL', 'BIENNIAL', 'TRIENNIAL'].includes(selectedService.billingCycle) ? 'YEAR' : selectedService.billingCycle === 'ONE_TIME' ? 'ONE_TIME' : 'MONTH');
                let annualFactor = 12;
                if (pUnit === 'MONTH') annualFactor = 12 / (pCount || 1);
                else if (pUnit === 'YEAR') annualFactor = 1 / (pCount || 1);
                else if (pUnit === 'DAY') annualFactor = 365 / (pCount || 1);
                else if (pUnit === 'ONE_TIME') annualFactor = 1;
                const annualCost = convertedCost * annualFactor;

                const totalPaid = (Array.isArray(selectedService.specs?.paymentHistory)
                  ? selectedService.specs.paymentHistory
                  : []
                ).reduce((acc: number, p: PaymentRecord) => acc + (Number(p.amount) || 0), 0);

                const assignedUser = users.find((u) => u.id === selectedService.specs?.assignedUserId);
                const assignedAsset = assets.find((a) => a.id === selectedService.specs?.assignedAssetId);

                return (
                  <>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {/* Card 1: Trạng thái */}
                      <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl space-y-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{isEn ? 'Status' : 'Trạng thái'}</span>
                        <div className="mt-0.5">
                          {renderStatusBadge(selectedService.status, selectedService.renewalDate)}
                        </div>
                        <span className="text-[10px] text-slate-500 block truncate">
                          Loại: {DEFAULT_SERVICE_TYPES.find((t) => t.value === selectedService.serviceType)?.label || selectedService.serviceType}
                        </span>
                      </div>

                      {/* Card 2: Chu kỳ & Hạn gia hạn */}
                      <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl space-y-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{isEn ? 'Next Renewal Date' : 'Hạn gia hạn tiếp theo'}</span>
                        <p className="text-sm font-black text-purple-700 dark:text-purple-300 font-mono">
                          {selectedService.renewalDate ? new Date(selectedService.renewalDate).toLocaleDateString('vi-VN') : 'Vĩnh viễn'}
                        </p>
                        <span className="text-[10px] text-slate-500 block">
                          Chu kỳ: {selectedService.specs?.billingPeriodCount
                            ? `${selectedService.specs.billingPeriodCount} ${selectedService.specs.billingPeriodUnit === 'YEAR' ? 'Năm' : 'Tháng'} / lần`
                            : selectedService.billingCycle}
                        </span>
                      </div>

                      {/* Card 3: Công ty & Đối tác / Phụ trách (Không dùng truncate) */}
                      <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl space-y-1 flex flex-col justify-between">
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                            Công ty & Phụ trách
                          </span>
                          <p className="text-xs font-bold text-indigo-950 dark:text-indigo-200 whitespace-normal break-words leading-snug">
                            🏢 {selectedService.companyName || 'Công ty chung'}
                          </p>
                        </div>
                        <div className="text-[10.5px] text-slate-500 whitespace-normal break-words leading-tight space-y-0.5 pt-1 border-t border-slate-200/60">
                          {assignedUser && (
                            <span className="block text-indigo-700 dark:text-indigo-300 font-semibold truncate">
                              👤 {assignedUser.fullName}
                            </span>
                          )}
                          {assignedAsset && (
                            <span className="block text-blue-700 dark:text-blue-300 font-mono font-semibold truncate">
                              💻 [{assignedAsset.assetTag}] {assignedAsset.name}
                            </span>
                          )}
                          {!assignedUser && !assignedAsset && (
                            selectedService.vendor ? (
                              <div className="flex items-start gap-1">
                                <span className="text-slate-400 shrink-0">Đối tác:</span>
                                <QuickLink
                                  type="vendor"
                                  id={selectedService.vendor.id || selectedService.vendor.name}
                                  label={selectedService.vendor.name}
                                  icon="🏢"
                                  showIcon={false}
                                  multiline
                                  maxLines={3}
                                  className="font-bold text-indigo-700 dark:text-indigo-300 text-[10.5px] leading-snug line-clamp-3 break-words"
                                />
                              </div>
                            ) : (
                              <span className="text-slate-400 italic">Đối tác: —</span>
                            )
                          )}
                        </div>
                      </div>

                      {/* Card 4: Chi phí chu kỳ (Dual-Currency) */}
                      <div className="p-3.5 bg-purple-50/60 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 rounded-2xl space-y-1 flex flex-col justify-between">
                        <div>
                          <span className="text-[10px] font-bold text-purple-700 dark:text-purple-300 uppercase tracking-wider block mb-0.5">
                            Chi phí mỗi kỳ
                          </span>
                          <p className="text-sm font-black text-purple-950 dark:text-purple-200 font-mono">
                            {rawCost > 0 ? formatPrice(convertedCost, selectedCurrency) : 'Trọn gói'}
                          </p>
                          {isDual && (
                            <p className="text-[10.5px] font-bold text-emerald-700 dark:text-emerald-400 block font-mono">
                              Gốc: {formatPrice(rawCost, rawCurr)}
                            </p>
                          )}
                        </div>
                        <div className="pt-1 border-t border-purple-200/60 space-y-0.5">
                          <span className="text-[10px] text-purple-800/80 dark:text-purple-300 block">
                            Dự toán năm: <strong>{formatPrice(annualCost, selectedCurrency)}</strong>
                          </span>
                          <span className="text-[9.5px] text-slate-400 block font-mono">
                            (Tỷ giá quy đổi ngày 25/08/2026)
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* THANH CHỈ SỐ TÀI CHÍNH & CHI PHÍ DỊCH VỤ */}
                    <div className="p-4 bg-gradient-to-r from-purple-50/80 via-indigo-50/70 to-blue-50/80 dark:from-slate-800/80 dark:to-slate-800/50 border border-purple-200/80 dark:border-purple-900/60 rounded-2xl space-y-3">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <span className="text-xs font-extrabold text-purple-950 dark:text-purple-200 uppercase tracking-wider flex items-center gap-1.5">
                          <DollarSign className="w-4 h-4 text-purple-600" />
                          <span>Chỉ Số Tài Chính & Chi Phí Tích Lũy</span>
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-200/80 text-purple-950 dark:bg-purple-900 dark:text-purple-200">
                          Hạch toán dịch vụ IT
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                        <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-purple-100 dark:border-slate-800 shadow-2xs">
                          <span className="text-[9.5px] font-bold text-slate-400 uppercase block">1. Giá kỳ gốc</span>
                          <span className="text-xs font-black text-slate-900 dark:text-white font-mono block mt-0.5 truncate">
                            {formatPrice(rawCost, rawCurr)}
                          </span>
                        </div>

                        <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-purple-100 dark:border-slate-800 shadow-2xs">
                          <span className="text-[9.5px] font-bold text-slate-400 uppercase block">2. Tỷ giá hạch toán</span>
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 font-mono block mt-0.5 truncate">
                            1 {rawCurr} = {new Intl.NumberFormat('vi-VN').format(rate)} đ
                          </span>
                        </div>

                        <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-purple-100 dark:border-slate-800 shadow-2xs">
                          <span className="text-[9.5px] font-bold text-purple-600 uppercase block">3. Giá mỗi kỳ ({selectedCurrency})</span>
                          <span className="text-xs font-black text-purple-900 dark:text-purple-300 font-mono block mt-0.5 truncate">
                            {formatPrice(convertedCost, selectedCurrency)}
                          </span>
                        </div>

                        <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-indigo-100 dark:border-slate-800 shadow-2xs">
                          <span className="text-[9.5px] font-bold text-indigo-600 uppercase block">4. Dự toán 1 Năm</span>
                          <span className="text-xs font-black text-indigo-900 dark:text-indigo-300 font-mono block mt-0.5 truncate">
                            {formatPrice(annualCost, selectedCurrency)}
                          </span>
                        </div>

                        <div className="col-span-2 sm:col-span-1 p-2.5 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800 shadow-2xs">
                          <span className="text-[9.5px] font-bold text-emerald-700 uppercase block">5. Đã đóng lũy kế</span>
                          <span className="text-xs font-black text-emerald-900 dark:text-emerald-300 font-mono block mt-0.5 truncate">
                            {formatPrice(totalPaid, 'VND')}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* KHỐI BÁO CÁO ĐỊNH GIÁ & HẠCH TOÁN CHI TIẾT */}
                    <div className="p-4 bg-gradient-to-r from-purple-50/70 to-indigo-50/70 border border-purple-200/80 rounded-2xl space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-purple-950 flex items-center gap-1.5 uppercase tracking-wider">
                          <DollarSign className="w-3.5 h-3.5 text-purple-600" />
                          <span>Chứng từ & Định giá chu kỳ dịch vụ</span>
                        </span>
                        <span className="text-[10px] font-extrabold bg-purple-200/80 text-purple-900 px-2 py-0.5 rounded-full">
                          Đa Tiền Tệ Hạch Toán
                        </span>
                      </div>

                      {/* Đọc số tiền bằng chữ tiếng Việt */}
                      {rawCost > 0 && (
                        <div className="p-2.5 bg-purple-100/50 border border-purple-200 rounded-xl text-xs text-purple-950 font-medium italic">
                          <span>✍️ Bằng chữ: <strong>{numberToVietnameseWords(inVnd)}</strong></span>
                        </div>
                      )}

                      {/* Dòng Quy đổi nhanh theo Tiền tệ ưu tiên */}
                      <div className="p-2.5 bg-white/90 dark:bg-slate-900 rounded-xl border border-purple-200/60 space-y-0.5">
                        <div className="flex items-center justify-between text-purple-900 dark:text-purple-200 font-semibold text-[11px]">
                          <span>⚡ Quy đổi theo Tiền tệ ưu tiên [{selectedCurrency}]:</span>
                          <span className="font-black font-mono">{formatPrice(convertedCost, selectedCurrency)}</span>
                        </div>
                        <p className="text-[10px] text-slate-500 font-mono">
                          (Tỷ giá hạch toán: 1 {rawCurr} = {new Intl.NumberFormat('vi-VN').format(rate)} VND)
                        </p>
                      </div>

                      {/* Mốc thời gian tham chiếu tỷ giá & Ghi chú đối soát */}
                      <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-[10.5px] text-slate-600">
                        <div className="flex items-center gap-1.5 text-slate-700 font-semibold">
                          <Clock className="w-3.5 h-3.5 text-purple-600" />
                          <span>🕒 Tỷ giá tham chiếu hạch toán cập nhật: 25/08/2026 (Theo Vietcombank / Tỷ giá hạch toán)</span>
                        </div>
                        <div className="text-slate-500">
                          💡 Tỷ giá cố định phục vụ đối soát tài chính và tính khấu hao dồn tích.
                        </div>
                      </div>

                      {/* Hóa đơn & Hợp đồng đính kèm tự động */}
                      {(selectedService.invoiceNumber || selectedService.contractNumber) && (
                        <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-purple-200/80 flex items-center justify-between gap-2 text-xs flex-wrap">
                          <div className="flex items-center gap-3 flex-wrap">
                            {selectedService.invoiceNumber && (
                              <span className="flex items-center gap-1 font-mono text-slate-700 dark:text-slate-300">
                                <Receipt className="w-3.5 h-3.5 text-purple-600" />
                                <span>HĐ: <strong>{selectedService.invoiceNumber}</strong></span>
                              </span>
                            )}
                            {selectedService.contractNumber && (
                              <span className="flex items-center gap-1 font-mono text-slate-700 dark:text-slate-300">
                                <FileText className="w-3.5 h-3.5 text-purple-600" />
                                <span>Hợp đồng: <strong>{selectedService.contractNumber}</strong></span>
                              </span>
                            )}
                          </div>
                          <Link
                            href={`/documents?search=${encodeURIComponent(selectedService.invoiceNumber || selectedService.contractNumber || '')}`}
                            className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 rounded-lg text-[10.5px] font-bold flex items-center gap-1 transition-colors"
                          >
                            <FileText className="w-3 h-3" />
                            <span>Xem Kho Chứng Từ</span>
                          </Link>
                        </div>
                      )}
                    </div>

                    {/* LỊCH SỬ THANH TOÁN (HỖ TRỢ NGOẠI TỆ & KỲ CƯỚC TỪ NGÀY ĐẾN NGÀY) */}
                    {(() => {
                      const effectivePayments = getEffectiveServicePayments(selectedService);
                      const nextBatchNumber = effectivePayments.length + 1;

                      return (
                        <div className="p-4 bg-gradient-to-r from-purple-50/70 via-indigo-50/60 to-blue-50/70 rounded-2xl border border-purple-200/80 space-y-3 shadow-2xs">
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-xs">
                                <Receipt className="w-3.5 h-3.5" />
                              </div>
                              <div>
                                <h4 className="text-xs font-black text-purple-950 uppercase tracking-wider">
                                  Lịch Sử Các Đợt Thanh Toán Cước ({effectivePayments.length})
                                </h4>
                                <p className="text-[10.5px] text-purple-700/80">
                                  Theo dõi các đợt đóng tiền cước dịch vụ định kỳ & gia hạn
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              {/* Cumulative spent badge */}
                              <div className="px-3 py-1 bg-white border border-purple-300 rounded-xl shadow-2xs text-right">
                                <span className="text-[10px] font-bold text-slate-500 block uppercase">Tổng tiền đã thanh toán:</span>
                                <span className="text-xs font-black text-purple-900 font-mono">
                                  {formatCurrency(
                                    effectivePayments.reduce((acc: number, p: PaymentRecord) => acc + (Number(p.amount) || 0), 0)
                                  )}
                                </span>
                              </div>

                              <button
                                type="button"
                                onClick={() => {
                                  const cur = selectedService.currency || 'VND';
                                  const curObj = currencies.find((c) => c.code === cur);
                                  const rate = curObj ? curObj.rateToVnd : (exchangeRatesMap[cur] || 1);

                                  const startStr = selectedService.renewalDate
                                    ? new Date(selectedService.renewalDate).toISOString().split('T')[0]
                                    : (selectedService.startDate ? new Date(selectedService.startDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);

                                  const pCount = selectedService.specs?.billingPeriodCount || 1;
                                  const pUnit = selectedService.specs?.billingPeriodUnit || 'MONTH';
                                  const nextEnd = calculateNextRenewalDate(startStr, pCount, pUnit) || '';

                                  const sFormatted = new Date(startStr).toLocaleDateString('vi-VN');
                                  const eFormatted = nextEnd ? new Date(nextEnd).toLocaleDateString('vi-VN') : '';

                                  setPaymentForm({
                                    paymentDate: new Date().toISOString().split('T')[0],
                                    amount: selectedService.cost ? String(selectedService.cost) : '',
                                    currency: cur,
                                    exchangeRate: rate,
                                    period: `Đợt ${nextBatchNumber}: Kỳ từ ${sFormatted}${eFormatted ? ` đến ${eFormatted}` : ''}`,
                                    periodStartDate: startStr,
                                    periodEndDate: nextEnd,
                                    invoiceNumber: selectedService.invoiceNumber || '',
                                    contractNumber: selectedService.contractNumber || '',
                                    status: 'PAID',
                                    notes: '',
                                  });
                                  setIsAddPaymentModalOpen(true);
                                }}
                                className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-2xs cursor-pointer transition-colors"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>+ Ghi nhận đợt thanh toán (Đợt {nextBatchNumber})</span>
                              </button>
                            </div>
                          </div>

                          {/* Table of Payment Records */}
                          <div className="overflow-x-auto rounded-xl border border-purple-200/80 bg-white shadow-2xs">
                            <table className="w-full text-left text-xs border-collapse">
                              <thead className="bg-purple-100/50 text-[10px] font-bold text-purple-900 uppercase tracking-wider border-b border-purple-200/80">
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
                              <tbody className="divide-y divide-purple-100/60">
                                {effectivePayments.length === 0 ? (
                                  <tr>
                                    <td colSpan={7} className="py-6 text-center text-xs text-slate-400 italic">
                                      Chưa có dữ liệu đợt thanh toán nào được ghi nhận. Bấm nút <strong>"+ Ghi nhận đợt thanh toán"</strong> ở trên để thêm!
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
                                      <tr key={p.id} className="hover:bg-purple-50/50 transition-colors">
                                        <td className="py-2 px-3 font-mono font-bold text-slate-800">
                                          {p.paymentDate ? new Date(p.paymentDate).toLocaleDateString('vi-VN') : '—'}
                                        </td>
                                        <td className="py-2 px-3">
                                          <div className="space-y-0.5">
                                            <span className="font-mono font-black text-purple-900 block">
                                              {formatPrice(convertedAmt, selectedCurrency)}
                                            </span>
                                            {isDual && (
                                              <span className="text-[10px] font-bold text-emerald-700 block font-mono">
                                                Gốc: {formatPrice(rawAmt, pCur)}
                                              </span>
                                            )}
                                            <span className="text-[9px] text-slate-400 block font-mono">
                                              (Tỷ giá: {p.paymentDate ? new Date(p.paymentDate).toLocaleDateString('vi-VN') : '25/08/2026'})
                                            </span>
                                          </div>
                                        </td>
                                        <td className="py-2 px-3 font-medium text-slate-700 min-w-[150px]">
                                          <span className="font-semibold text-slate-900 block">{p.period || 'Kỳ cước'}</span>
                                          {p.periodStartDate && p.periodEndDate && (
                                            <span className="text-[10px] text-slate-500 font-mono block mt-0.5">
                                              📅 {new Date(p.periodStartDate).toLocaleDateString('vi-VN')} → {new Date(p.periodEndDate).toLocaleDateString('vi-VN')}
                                            </span>
                                          )}
                                        </td>
                                        <td className="py-2 px-3 font-mono text-[11px] text-slate-600">
                                          {p.invoiceNumber || p.contractNumber ? (
                                            <Link
                                              href={`/documents?search=${encodeURIComponent(p.invoiceNumber || p.contractNumber || '')}`}
                                              className="text-purple-600 hover:text-purple-800 hover:underline font-mono text-[11px] font-bold"
                                              title="Xem tài liệu trong kho chứng từ"
                                            >
                                              {p.invoiceNumber || p.contractNumber}
                                            </Link>
                                          ) : (
                                            <span className="text-slate-400 italic">—</span>
                                          )}
                                        </td>
                                        <td className="py-2 px-3">
                                          <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.2 rounded-md text-[10px] font-bold">
                                            <Check className="w-3 h-3" />
                                            <span>{p.status === 'PAID' ? 'Đã thanh toán' : 'Chờ xử lý'}</span>
                                          </span>
                                        </td>
                                        <td className="py-2 px-3 text-slate-500 text-[11px] truncate max-w-[180px]">
                                          {p.notes || '—'}
                                        </td>
                                        <td className="py-2 px-2 text-right">
                                          <button
                                            type="button"
                                            onClick={() => handleDeletePaymentRecord(selectedService.id, p.id)}
                                            title="Xóa đợt thanh toán này"
                                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded cursor-pointer transition-colors"
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
                      );
                    })()}

                    {/* Quick Renew Section */}
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                      <h4 className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                        <RotateCcw className="w-3.5 h-3.5 text-purple-600" />
                        <span>Gia Hạn Nhanh Dịch Vụ:</span>
                      </h4>
                      <div className="flex items-center gap-2 flex-wrap pt-1">
                        {[
                          { label: '+ 1 Tháng', months: 1 },
                          { label: '+ 3 Tháng (Quý)', months: 3 },
                          { label: '+ 6 Tháng', months: 6 },
                          { label: '+ 1 Năm (12T)', months: 12 },
                          { label: '+ 2 Năm (24T)', months: 24 },
                        ].map((chip) => (
                          <button
                            key={chip.months}
                            type="button"
                            onClick={() => handleQuickRenew(selectedService, chip.months)}
                            className="px-3 py-1.5 bg-white hover:bg-purple-600 hover:text-white border border-purple-200 rounded-xl text-xs font-bold text-purple-700 transition-all cursor-pointer shadow-2xs"
                          >
                            {chip.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD NEW PAYMENT RECORD (HỖ TRỢ NGOẠI TỆ & KỲ CƯỚC TỪ NGÀY ĐẾN NGÀY) */}
      {isAddPaymentModalOpen && selectedService && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-3 sm:p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-3xl w-full flex flex-col max-h-[92vh] border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-slate-800/80 dark:to-slate-800/40 shrink-0">
              <h3 className="font-bold text-sm text-purple-950 dark:text-purple-200 flex items-center gap-2">
                <span className="p-1.5 bg-purple-600 text-white rounded-xl shadow-xs">
                  <Receipt className="w-4 h-4" />
                </span>
                <span>Ghi Nhận Đợt Thanh Toán Mới</span>
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

              {/* Row 2: Phạm vi kỳ cước (Từ ngày nào đến ngày nào) */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl space-y-2.5">
                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-purple-600" />
                  <span>Kỳ Cước Áp Dụng / Phạm Vi Gia Hạn</span>
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Kỳ cước từ ngày:
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
                      Kỳ cước đến ngày:
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
                    Tên / Nhãn kỳ cước (Gợi ý tự động hoặc nhập tùy chỉnh):
                  </label>
                  <input
                    type="text"
                    placeholder="VD: Kỳ 1 năm 2026 hoặc Kỳ tháng 08/2026..."
                    value={paymentForm.period}
                    onChange={(e) => setPaymentForm({ ...paymentForm, period: e.target.value })}
                    className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              {/* Row 3: Khối Tài Chính & Ngoại Tệ (Dual-Currency) */}
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
                    placeholder="VD: HĐ-VT-2026"
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
                  <span>💾 Lưu Đợt Thanh Toán</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD SERVICE (WITH FLEXIBLE NUMBER + UNIT AND PRESET CHIPS) */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-3 sm:p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full flex flex-col max-h-[92vh] border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-t-3xl shrink-0">
              <h3 className="font-bold text-base text-slate-900 flex items-center space-x-2">
                <span className="p-1.5 bg-purple-600 text-white rounded-xl shadow-xs">
                  <Globe className="w-4 h-4" />
                </span>
                <span>Thêm Mới Gói Dịch Vụ IT & Thuê Bao</span>
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-white/80 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleCreateSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* Row 1: Code & Name */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Mã dịch vụ (*)</label>
                  <input
                    type="text"
                    required
                    placeholder="VD: SVC-NET-001"
                    value={formData.serviceCode}
                    onChange={(e) => setFormData({ ...formData, serviceCode: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono outline-none focus:bg-white focus:ring-2 focus:ring-purple-500 uppercase font-bold"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Tên gói dịch vụ (*)</label>
                  <input
                    type="text"
                    required
                    placeholder="VD: Đường truyền Internet FTTH Viettel Pro 500Mbps..."
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 outline-none focus:bg-white focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              {/* Row 2: Type, Status, Flexible Billing Cycle */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                <div className="sm:col-span-4">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Loại dịch vụ (*)</label>
                  <select
                    value={formData.serviceType}
                    onChange={(e) => setFormData({ ...formData, serviceType: e.target.value as any })}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    {DEFAULT_SERVICE_TYPES.filter((t) => t.value !== 'ALL').map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-3">
                  <label className="block text-xs font-bold text-slate-700 mb-1">{isEn ? 'Status' : 'Trạng thái'}</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="ACTIVE">🟢 Đang hoạt động</option>
                    <option value="PENDING_RENEWAL">⚠️ Sắp đến hạn</option>
                    <option value="EXPIRED">🔴 Đã quá hạn</option>
                    <option value="SUSPENDED">⏸️ Tạm ngưng</option>
                  </select>
                </div>

                {/* FLEXIBLE NUMBER + UNIT BILLING CYCLE */}
                <div className="sm:col-span-5 space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Chu kỳ thanh toán (Điền số & chọn đơn vị)
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min="1"
                      value={formData.periodCount}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10) || 1;
                        const nextRen = calculateNextRenewalDate(formData.startDate, val, formData.periodUnit);
                        const cEnum = mapCycleEnum(val, formData.periodUnit);
                        setFormData({
                          ...formData,
                          periodCount: val,
                          billingCycle: cEnum as any,
                          renewalDate: nextRen || formData.renewalDate,
                        });
                      }}
                      className="w-16 p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 text-center outline-none focus:ring-2 focus:ring-purple-500"
                    />

                    <select
                      value={formData.periodUnit}
                      onChange={(e) => {
                        const u = e.target.value as any;
                        const nextRen = calculateNextRenewalDate(formData.startDate, formData.periodCount, u);
                        const cEnum = mapCycleEnum(formData.periodCount, u);
                        setFormData({
                          ...formData,
                          periodUnit: u,
                          billingCycle: cEnum as any,
                          renewalDate: nextRen || formData.renewalDate,
                        });
                      }}
                      className="flex-1 p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="MONTH">Tháng (tháng / lần)</option>
                      <option value="YEAR">Năm (năm / lần)</option>
                      <option value="DAY">Ngày (ngày / lần)</option>
                      <option value="ONE_TIME">Trọn gói (1 lần)</option>
                    </select>
                  </div>

                  {/* PRESET CHIPS GỢI Ý NHANH */}
                  <div className="flex items-center gap-1 overflow-x-auto pt-0.5">
                    <span className="text-[10px] font-bold text-slate-400 shrink-0">Gợi ý:</span>
                    {[
                      { label: '1T', count: 1, unit: 'MONTH' as const },
                      { label: '3T (Quý)', count: 3, unit: 'MONTH' as const },
                      { label: '6T', count: 6, unit: 'MONTH' as const },
                      { label: '1 Năm', count: 1, unit: 'YEAR' as const },
                      { label: '2 Năm', count: 2, unit: 'YEAR' as const },
                      { label: '3 Năm', count: 3, unit: 'YEAR' as const },
                    ].map((chip) => (
                      <button
                        key={chip.label}
                        type="button"
                        onClick={() => applyCycleChip(false, chip.count, chip.unit)}
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                          formData.periodCount === chip.count && formData.periodUnit === chip.unit
                            ? 'bg-purple-100 text-purple-900 border-purple-300'
                            : 'bg-white text-slate-600 hover:bg-slate-50 border-slate-200'
                        }`}
                      >
                        {chip.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Row 3: Multi-Currency Pricing + Rates + Dates */}
              <div className="p-4 bg-gradient-to-r from-purple-50/80 to-indigo-50/80 border border-purple-200 rounded-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-purple-950 flex items-center gap-1.5 uppercase tracking-wider">
                    <DollarSign className="w-4 h-4 text-purple-600" />
                    <span>1. Định Giá Cước Chu Kỳ Hóa Đơn Gốc (Ngoại tệ)</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsAddCurrencyModalOpen(true)}
                    className="text-[11px] font-bold text-purple-600 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Thêm đồng tiền mới</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-start">
                  <div className="sm:col-span-4">
                    <label className="block text-xs font-bold text-slate-700 mb-1">Loại tiền tệ hóa đơn (*)</label>
                    <select
                      value={formData.currency || 'VND'}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === '__ADD_NEW__') {
                          setIsAddCurrencyModalOpen(true);
                          return;
                        }
                        const curObj = currencies.find((c) => c.code === val);
                        setFormData({
                          ...formData,
                          currency: val,
                          exchangeRate: curObj ? curObj.rateToVnd : (exchangeRatesMap[val] || 1),
                        });
                      }}
                      className="w-full p-2.5 bg-white border border-purple-200 rounded-xl text-xs font-bold text-purple-900 outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer shadow-2xs"
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
                      label="Giá cước chu kỳ hóa đơn gốc (*)"
                      value={formData.cost}
                      onChange={(val) => setFormData({ ...formData, cost: val })}
                      currency={formData.currency || 'VND'}
                      currencyName={currencies.find((c) => c.code === (formData.currency || 'VND'))?.name}
                      exchangeRate={formData.exchangeRate || exchangeRatesMap[formData.currency || 'VND'] || 1}
                      placeholder="VD: 100"
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Tỷ giá (1 {formData.currency || 'VND'} = ? VNĐ)
                    </label>
                    <input
                      type="number"
                      disabled={(formData.currency || 'VND').toUpperCase() === 'VND'}
                      value={formData.exchangeRate || exchangeRatesMap[formData.currency || 'VND'] || 1}
                      onChange={(e) => {
                        const r = parseFloat(e.target.value) || 1;
                        setFormData({ ...formData, exchangeRate: r });
                      }}
                      className="w-full p-2.5 bg-white disabled:bg-slate-100 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-800 outline-none focus:ring-2 focus:ring-purple-500 shadow-2xs"
                    />
                  </div>
                </div>

                {/* KHỐI 2: Ô GIÁ TIỀN QUY CHUẨN VNĐ RIÊNG & BẰNG CHỮ RÕ RÀNG */}
                {(() => {
                  const numVal = Number(String(formData.cost).replace(/\D/g, '')) || 0;
                  const curr = formData.currency || 'VND';
                  const rate = formData.exchangeRate || exchangeRatesMap[curr] || 1;
                  const inVnd = curr === 'VND' ? numVal : numVal * rate;

                  return (
                    <div className="p-3.5 bg-white rounded-2xl border border-emerald-200 shadow-xs space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-extrabold text-emerald-800 flex items-center gap-1.5 uppercase tracking-wide">
                          <span>🇻🇳 2. Giá Cước Quy Chuẩn VNĐ (Mỗi Kỳ)</span>
                        </span>
                        <span className="font-mono text-xs font-black text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200">
                          {formatPrice(inVnd, 'VND')}
                        </span>
                      </div>

                      {inVnd > 0 && (
                        <div className="text-[11px] text-emerald-900 bg-emerald-50/80 border border-emerald-200/60 rounded-xl px-3 py-2 flex items-start gap-1.5 font-medium">
                          <span className="text-emerald-700 font-bold shrink-0">
                            ✍️ Giá chuẩn VNĐ bằng chữ:
                          </span>
                          <span className="italic font-bold">{numberToVietnameseWords(inVnd)}</span>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Ghi chú mốc thời gian tham chiếu tỷ giá (1 dòng nhỏ) */}
                <div className="p-2 bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/80 rounded-xl flex items-center gap-1.5 text-[10.5px] text-amber-900 dark:text-amber-200 font-medium">
                  <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span>Tỷ giá tham chiếu hạch toán cập nhật: 25/08/2026 (Theo Vietcombank / Tỷ giá hạch toán)</span>
                </div>

                {/* Dates */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-purple-200/50">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Ngày bắt đầu sử dụng</label>
                    <input
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => {
                        const newStart = e.target.value;
                        const nextRen = calculateNextRenewalDate(newStart, formData.periodCount, formData.periodUnit);
                        setFormData({
                          ...formData,
                          startDate: newStart,
                          renewalDate: nextRen || formData.renewalDate,
                        });
                      }}
                      className="w-full p-2 bg-white border border-slate-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-purple-500 font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Ngày gia hạn kế tiếp (Tự động tính)
                    </label>
                    <input
                      type="date"
                      value={formData.renewalDate}
                      onChange={(e) => setFormData({ ...formData, renewalDate: e.target.value })}
                      className="w-full p-2 bg-purple-50/80 border border-purple-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-purple-500 font-bold text-purple-900"
                    />
                  </div>
                </div>
              </div>

              {/* Row 4: Account Number, IP, Specs */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Mã thuê bao / Khách hàng</label>
                  <input
                    type="text"
                    placeholder="VD: HNI_FTTH_588291..."
                    value={formData.accountNumber}
                    onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-purple-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">IP Tĩnh / Cấu hình mạng</label>
                  <input
                    type="text"
                    placeholder="VD: 115.78.22.105 / 29"
                    value={formData.ipStatic}
                    onChange={(e) => setFormData({ ...formData, ipStatic: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-purple-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Băng thông / Thông số</label>
                  <input
                    type="text"
                    placeholder="VD: 500 Mbps, 8 vCPU 32GB RAM..."
                    value={formData.bandwidth}
                    onChange={(e) => setFormData({ ...formData, bandwidth: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              {/* Row 5: Vendor, Company, Location */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <ManageableDropdown
                    label="Nhà cung cấp / Đối tác"
                    placeholder="-- Chọn nhà cung cấp --"
                    icon={<Handshake className="w-3.5 h-3.5 text-emerald-600" />}
                    items={vendorDropdownItems}
                    selectedValue={formData.vendorId}
                    onSelect={(val) => setFormData({ ...formData, vendorId: val })}
                    onAdd={handleAddVendor}
                    onEdit={handleEditVendor}
                    onDelete={handleDeleteVendor}
                    allowEmpty={true}
                    emptyLabel="-- Chưa chọn đối tác --"
                    themeColor="blue"
                  />
                </div>

                <div>
                  <ManageableDropdown
                    label="Công ty / Chi nhánh quản lý"
                    placeholder="-- Chọn công ty --"
                    icon={<Building2 className="w-3.5 h-3.5 text-indigo-600" />}
                    items={companyDropdownItems}
                    selectedValue={formData.companyName}
                    onSelect={(val) => setFormData({ ...formData, companyName: val })}
                    onAdd={handleAddCompany}
                    onEdit={handleEditCompany}
                    onDelete={handleDeleteCompany}
                    allowEmpty={true}
                    emptyLabel="-- Chưa chọn công ty --"
                    themeColor="indigo"
                  />
                </div>

                <div>
                  <ManageableDropdown
                    label="Vị trí / Địa điểm lắp đặt"
                    placeholder="-- Chọn địa điểm --"
                    icon={<Building2 className="w-3.5 h-3.5 text-blue-600" />}
                    items={locationDropdownItems}
                    selectedValue={formData.locationId}
                    onSelect={(val) => setFormData({ ...formData, locationId: val })}
                    onAdd={handleAddLocation}
                    onEdit={handleEditLocation}
                    onDelete={handleDeleteLocation}
                    allowEmpty={true}
                    emptyLabel="-- Chưa chọn vị trí --"
                    themeColor="blue"
                  />
                </div>
              </div>

              {/* Row 6: Gán Người Phụ Trách & Thiết Bị Liên Quan */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    👤 Nhân viên / IT phụ trách dịch vụ:
                  </label>
                  <select
                    value={formData.assignedUserId}
                    onChange={(e) => setFormData({ ...formData, assignedUserId: e.target.value })}
                    className="w-full p-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer shadow-2xs"
                  >
                    <option value="">-- Chưa gán người phụ trách --</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        👤 {u.fullName} ({u.department || 'Nhân sự'}) - {u.email}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    💻 Thiết bị / Máy chủ kết nối:
                  </label>
                  <select
                    value={formData.assignedAssetId}
                    onChange={(e) => setFormData({ ...formData, assignedAssetId: e.target.value })}
                    className="w-full p-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer shadow-2xs"
                  >
                    <option value="">-- Chưa gán thiết bị/máy chủ --</option>
                    {assets.map((a) => (
                      <option key={a.id} value={a.id}>
                        💻 [{a.assetTag}] {a.name} ({a.brand || ''} {a.model || ''})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 7: Hotline Support Contact */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Hotline / Đầu mối hỗ trợ kỹ thuật nhà mạng</label>
                <input
                  type="text"
                  placeholder="VD: 18008119 - KTV phụ trách: Anh Hùng Viettel 0988.xxx.xxx"
                  value={formData.contactSupport}
                  onChange={(e) => setFormData({ ...formData, contactSupport: e.target.value })}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* Row 8: Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Ghi chú thêm</label>
                <textarea
                  rows={2}
                  placeholder="Ghi chú về cam kết chất lượng SLA, vị trí tủ rack, mật khẩu PPPoE nếu có..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* Footer Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Hủy (ESC)
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
                >
                  💾 Lưu Dịch Vụ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT SERVICE */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-3 sm:p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full flex flex-col max-h-[92vh] border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-amber-50 to-orange-50 rounded-t-3xl shrink-0">
              <h3 className="font-bold text-base text-slate-900 flex items-center space-x-2">
                <span className="p-1.5 bg-amber-500 text-white rounded-xl shadow-xs">
                  <Edit2 className="w-4 h-4" />
                </span>
                <span>Cập Nhật Thông Tin Dịch Vụ IT</span>
              </h3>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-white/80 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleUpdateSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* Row 1: Code & Name */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Mã dịch vụ (*)</label>
                  <input
                    type="text"
                    required
                    value={editFormData.serviceCode}
                    onChange={(e) => setEditFormData({ ...editFormData, serviceCode: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono outline-none focus:bg-white focus:ring-2 focus:ring-amber-500 uppercase font-bold"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Tên gói dịch vụ (*)</label>
                  <input
                    type="text"
                    required
                    value={editFormData.name}
                    onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 outline-none focus:bg-white focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              {/* Row 2: Type, Status, Flexible Billing Cycle */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                <div className="sm:col-span-4">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Loại dịch vụ (*)</label>
                  <select
                    value={editFormData.serviceType}
                    onChange={(e) => setEditFormData({ ...editFormData, serviceType: e.target.value as any })}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    {DEFAULT_SERVICE_TYPES.filter((t) => t.value !== 'ALL').map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-3">
                  <label className="block text-xs font-bold text-slate-700 mb-1">{isEn ? 'Status' : 'Trạng thái'}</label>
                  <select
                    value={editFormData.status}
                    onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value as any })}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="ACTIVE">🟢 Đang hoạt động</option>
                    <option value="PENDING_RENEWAL">⚠️ Sắp đến hạn</option>
                    <option value="EXPIRED">🔴 Đã quá hạn</option>
                    <option value="SUSPENDED">⏸️ Tạm ngưng</option>
                    <option value="TERMINATED">⏹️ Đã dừng / Hủy</option>
                  </select>
                </div>

                {/* FLEXIBLE BILLING PERIOD INPUT */}
                <div className="sm:col-span-5 space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Chu kỳ thanh toán (Điền số & chọn đơn vị)
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min="1"
                      value={editFormData.periodCount}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10) || 1;
                        const nextRen = calculateNextRenewalDate(editFormData.startDate, val, editFormData.periodUnit);
                        const cEnum = mapCycleEnum(val, editFormData.periodUnit);
                        setEditFormData({
                          ...editFormData,
                          periodCount: val,
                          billingCycle: cEnum as any,
                          renewalDate: nextRen || editFormData.renewalDate,
                        });
                      }}
                      className="w-16 p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 text-center outline-none focus:ring-2 focus:ring-amber-500"
                    />

                    <select
                      value={editFormData.periodUnit}
                      onChange={(e) => {
                        const u = e.target.value as any;
                        const nextRen = calculateNextRenewalDate(editFormData.startDate, editFormData.periodCount, u);
                        const cEnum = mapCycleEnum(editFormData.periodCount, u);
                        setEditFormData({
                          ...editFormData,
                          periodUnit: u,
                          billingCycle: cEnum as any,
                          renewalDate: nextRen || editFormData.renewalDate,
                        });
                      }}
                      className="flex-1 p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      <option value="MONTH">Tháng (tháng / lần)</option>
                      <option value="YEAR">Năm (năm / lần)</option>
                      <option value="DAY">Ngày (ngày / lần)</option>
                      <option value="ONE_TIME">Trọn gói (1 lần)</option>
                    </select>
                  </div>

                  {/* PRESET CHIPS GỢI Ý NHANH */}
                  <div className="flex items-center gap-1 overflow-x-auto pt-0.5">
                    <span className="text-[10px] font-bold text-slate-400 shrink-0">Gợi ý:</span>
                    {[
                      { label: '1T', count: 1, unit: 'MONTH' as const },
                      { label: '3T (Quý)', count: 3, unit: 'MONTH' as const },
                      { label: '6T', count: 6, unit: 'MONTH' as const },
                      { label: '1 Năm', count: 1, unit: 'YEAR' as const },
                      { label: '2 Năm', count: 2, unit: 'YEAR' as const },
                      { label: '3 Năm', count: 3, unit: 'YEAR' as const },
                    ].map((chip) => (
                      <button
                        key={chip.label}
                        type="button"
                        onClick={() => applyCycleChip(true, chip.count, chip.unit)}
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                          editFormData.periodCount === chip.count && editFormData.periodUnit === chip.unit
                            ? 'bg-amber-100 text-amber-900 border-amber-300 font-bold'
                            : 'bg-white text-slate-600 hover:bg-slate-50 border-slate-200'
                        }`}
                      >
                        {chip.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Row 3: Multi-Currency Pricing + Rates + Dates */}
              <div className="p-4 bg-gradient-to-r from-amber-50/80 to-orange-50/80 border border-amber-200 rounded-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-950 flex items-center gap-1.5 uppercase tracking-wider">
                    <DollarSign className="w-4 h-4 text-amber-600" />
                    <span>1. Định Giá Cước Chu Kỳ Hóa Đơn Gốc (Ngoại tệ)</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsAddCurrencyModalOpen(true)}
                    className="text-[11px] font-bold text-amber-600 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Thêm đồng tiền mới</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-start">
                  <div className="sm:col-span-4">
                    <label className="block text-xs font-bold text-slate-700 mb-1">Loại tiền tệ hóa đơn (*)</label>
                    <select
                      value={editFormData.currency || 'VND'}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === '__ADD_NEW__') {
                          setIsAddCurrencyModalOpen(true);
                          return;
                        }
                        const curObj = currencies.find((c) => c.code === val);
                        setEditFormData({
                          ...editFormData,
                          currency: val,
                          exchangeRate: curObj ? curObj.rateToVnd : (exchangeRatesMap[val] || 1),
                        });
                      }}
                      className="w-full p-2.5 bg-white border border-amber-200 rounded-xl text-xs font-bold text-amber-950 outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer shadow-2xs"
                    >
                      {currencies.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.flag} {c.code} - {c.name} ({c.symbol})
                        </option>
                      ))}
                      <option value="__ADD_NEW__" className="text-amber-600 font-bold">
                        ➕ Thêm đồng tiền khác...
                      </option>
                    </select>
                  </div>

                  <div className="sm:col-span-5">
                    <CurrencyInput
                      label="Giá cước chu kỳ hóa đơn gốc (*)"
                      value={editFormData.cost}
                      onChange={(val) => setEditFormData({ ...editFormData, cost: val })}
                      currency={editFormData.currency || 'VND'}
                      currencyName={currencies.find((c) => c.code === (editFormData.currency || 'VND'))?.name}
                      exchangeRate={editFormData.exchangeRate || exchangeRatesMap[editFormData.currency || 'VND'] || 1}
                      placeholder="VD: 100"
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Tỷ giá (1 {editFormData.currency || 'VND'} = ? VNĐ)
                    </label>
                    <input
                      type="number"
                      disabled={(editFormData.currency || 'VND').toUpperCase() === 'VND'}
                      value={editFormData.exchangeRate || exchangeRatesMap[editFormData.currency || 'VND'] || 1}
                      onChange={(e) => {
                        const r = parseFloat(e.target.value) || 1;
                        setEditFormData({ ...editFormData, exchangeRate: r });
                      }}
                      className="w-full p-2.5 bg-white disabled:bg-slate-100 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-800 outline-none focus:ring-2 focus:ring-amber-500 shadow-2xs"
                    />
                  </div>
                </div>

                {/* KHỐI 2: Ô GIÁ TIỀN QUY CHUẨN VNĐ RIÊNG & BẰNG CHỮ RÕ RÀNG */}
                {(() => {
                  const numVal = Number(String(editFormData.cost).replace(/\D/g, '')) || 0;
                  const curr = editFormData.currency || 'VND';
                  const rate = editFormData.exchangeRate || exchangeRatesMap[curr] || 1;
                  const inVnd = curr === 'VND' ? numVal : numVal * rate;

                  return (
                    <div className="p-3.5 bg-white rounded-2xl border border-emerald-200 shadow-xs space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-extrabold text-emerald-800 flex items-center gap-1.5 uppercase tracking-wide">
                          <span>🇻🇳 2. Giá Cước Quy Chuẩn VNĐ (Mỗi Kỳ)</span>
                        </span>
                        <span className="font-mono text-xs font-black text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200">
                          {formatPrice(inVnd, 'VND')}
                        </span>
                      </div>

                      {inVnd > 0 && (
                        <div className="text-[11px] text-emerald-900 bg-emerald-50/80 border border-emerald-200/60 rounded-xl px-3 py-2 flex items-start gap-1.5 font-medium">
                          <span className="text-emerald-700 font-bold shrink-0">
                            ✍️ Giá chuẩn VNĐ bằng chữ:
                          </span>
                          <span className="italic font-bold">{numberToVietnameseWords(inVnd)}</span>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Ghi chú mốc thời gian tham chiếu tỷ giá */}
                <div className="p-2.5 bg-white/80 border border-amber-200 rounded-xl space-y-0.5 text-[11px] text-slate-600">
                  <div className="flex items-center gap-1.5 font-semibold text-amber-900">
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                    <span>🕒 Tỷ giá tham chiếu hạch toán cập nhật: 25/08/2026 (Theo Vietcombank / Tỷ giá hạch toán)</span>
                  </div>
                  <div className="text-[10.5px] text-slate-500 italic">
                    💡 Tỷ giá được cố định tại thời điểm ghi nhận hóa đơn dịch vụ để phục vụ đối soát tài chính chính xác.
                  </div>
                </div>

                {/* Dates */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-amber-200/50">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Ngày bắt đầu sử dụng</label>
                    <input
                      type="date"
                      value={editFormData.startDate}
                      onChange={(e) => {
                        const newStart = e.target.value;
                        const nextRen = calculateNextRenewalDate(newStart, editFormData.periodCount, editFormData.periodUnit);
                        setEditFormData({
                          ...editFormData,
                          startDate: newStart,
                          renewalDate: nextRen || editFormData.renewalDate,
                        });
                      }}
                      className="w-full p-2 bg-white border border-slate-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-amber-500 font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Ngày gia hạn kế tiếp (Tự động tính)
                    </label>
                    <input
                      type="date"
                      value={editFormData.renewalDate}
                      onChange={(e) => setEditFormData({ ...editFormData, renewalDate: e.target.value })}
                      className="w-full p-2 bg-amber-50/80 border border-amber-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-amber-500 font-bold text-amber-950"
                    />
                  </div>
                </div>
              </div>

              {/* Row 4: Account Number, IP, Specs */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Mã thuê bao / Khách hàng</label>
                  <input
                    type="text"
                    value={editFormData.accountNumber}
                    onChange={(e) => setEditFormData({ ...editFormData, accountNumber: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-amber-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">IP Tĩnh / Cấu hình mạng</label>
                  <input
                    type="text"
                    value={editFormData.ipStatic}
                    onChange={(e) => setEditFormData({ ...editFormData, ipStatic: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-amber-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Băng thông / Thông số</label>
                  <input
                    type="text"
                    value={editFormData.bandwidth}
                    onChange={(e) => setEditFormData({ ...editFormData, bandwidth: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              {/* Row 5: Vendor, Company, Location */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <ManageableDropdown
                    label="Nhà cung cấp / Đối tác"
                    placeholder="-- Chọn nhà cung cấp --"
                    icon={<Handshake className="w-3.5 h-3.5 text-emerald-600" />}
                    items={vendorDropdownItems}
                    selectedValue={editFormData.vendorId}
                    onSelect={(val) => setEditFormData({ ...editFormData, vendorId: val })}
                    onAdd={handleAddVendor}
                    onEdit={handleEditVendor}
                    onDelete={handleDeleteVendor}
                    allowEmpty={true}
                    emptyLabel="-- Chưa chọn đối tác --"
                    themeColor="blue"
                  />
                </div>

                <div>
                  <ManageableDropdown
                    label="Công ty / Chi nhánh quản lý"
                    placeholder="-- Chọn công ty --"
                    icon={<Building2 className="w-3.5 h-3.5 text-indigo-600" />}
                    items={companyDropdownItems}
                    selectedValue={editFormData.companyName}
                    onSelect={(val) => setEditFormData({ ...editFormData, companyName: val })}
                    onAdd={handleAddCompany}
                    onEdit={handleEditCompany}
                    onDelete={handleDeleteCompany}
                    allowEmpty={true}
                    emptyLabel="-- Chưa chọn công ty --"
                    themeColor="indigo"
                  />
                </div>

                <div>
                  <ManageableDropdown
                    label="Vị trí / Địa điểm lắp đặt"
                    placeholder="-- Chọn địa điểm --"
                    icon={<Building2 className="w-3.5 h-3.5 text-blue-600" />}
                    items={locationDropdownItems}
                    selectedValue={editFormData.locationId}
                    onSelect={(val) => setEditFormData({ ...editFormData, locationId: val })}
                    onAdd={handleAddLocation}
                    onEdit={handleEditLocation}
                    onDelete={handleDeleteLocation}
                    allowEmpty={true}
                    emptyLabel="-- Chưa chọn vị trí --"
                    themeColor="blue"
                  />
                </div>
              </div>

              {/* Row 6: Gán Người Phụ Trách & Thiết Bị Liên Quan */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    👤 Nhân viên / IT phụ trách dịch vụ:
                  </label>
                  <select
                    value={editFormData.assignedUserId}
                    onChange={(e) => setEditFormData({ ...editFormData, assignedUserId: e.target.value })}
                    className="w-full p-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer shadow-2xs"
                  >
                    <option value="">-- Chưa gán người phụ trách --</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        👤 {u.fullName} ({u.department || 'Nhân sự'}) - {u.email}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    💻 Thiết bị / Máy chủ kết nối:
                  </label>
                  <select
                    value={editFormData.assignedAssetId}
                    onChange={(e) => setEditFormData({ ...editFormData, assignedAssetId: e.target.value })}
                    className="w-full p-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer shadow-2xs"
                  >
                    <option value="">-- Chưa gán thiết bị/máy chủ --</option>
                    {assets.map((a) => (
                      <option key={a.id} value={a.id}>
                        💻 [{a.assetTag}] {a.name} ({a.brand || ''} {a.model || ''})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 6: Hotline Support Contact */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Hotline / Đầu mối hỗ trợ kỹ thuật nhà mạng</label>
                <input
                  type="text"
                  value={editFormData.contactSupport}
                  onChange={(e) => setEditFormData({ ...editFormData, contactSupport: e.target.value })}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Row 7: Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Ghi chú thêm</label>
                <textarea
                  rows={2}
                  value={editFormData.notes}
                  onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Footer Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Hủy (ESC)
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
                >
                  💾 Lưu Cập Nhật
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* MODAL: IMPORT EXCEL FOR IT SERVICES */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-3 sm:p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full flex flex-col border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-purple-50 to-indigo-50">
              <h3 className="font-bold text-sm text-purple-950 flex items-center gap-2">
                <span className="p-1.5 bg-purple-600 text-white rounded-xl shadow-xs">
                  <Download className="w-3.5 h-3.5 rotate-180" />
                </span>
                <span>Import Danh Sách Dịch Vụ IT & Thuê Bao Từ Excel</span>
              </h3>
              <button onClick={() => setIsImportModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              {/* Step 1: Download Template */}
              <div className="p-4 bg-purple-50/70 border border-purple-200 rounded-2xl flex items-center justify-between gap-3">
                <div>
                  <h4 className="font-bold text-purple-950 text-xs">Bước 1: Tải file mẫu chuẩn</h4>
                  <p className="text-[11px] text-purple-700 mt-0.5">Sử dụng file Excel mẫu để điền các thông tin dịch vụ, nhà mạng, IP tĩnh và chi phí</p>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs flex items-center gap-1 shrink-0 shadow-2xs cursor-pointer transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Tải File Mẫu</span>
                </button>
              </div>

              {/* Step 2: Upload File */}
              <form onSubmit={handleUploadExcel} className="space-y-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">Bước 2: Chọn file Excel (.xlsx) đã điền dữ liệu (*)</label>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="p-6 border-2 border-dashed border-purple-300 hover:border-purple-500 bg-slate-50/70 hover:bg-purple-50/40 rounded-2xl flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors"
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".xlsx, .xls"
                      className="hidden"
                      onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                    />
                    <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center">
                      <FileText className="w-5 h-5" />
                    </div>
                    {importFile ? (
                      <p className="font-bold text-purple-900 text-xs">{importFile.name} ({(importFile.size / 1024).toFixed(1)} KB)</p>
                    ) : (
                      <div className="text-center">
                        <p className="font-bold text-slate-700">Bấm để chọn file hoặc kéo thả file Excel vào đây</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">Hỗ trợ định dạng .xlsx tiêu chuẩn</p>
                      </div>
                    )}
                  </div>
                </div>

                {importResult && (
                  <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl space-y-1">
                    <p className="font-bold flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>{importResult.message}</span>
                    </p>
                    {importResult.errors?.length > 0 && (
                      <div className="text-[11px] text-rose-700 pt-1 border-t border-emerald-200/60">
                        <p className="font-bold">Một số lỗi:</p>
                        <ul className="list-disc pl-4 space-y-0.5 font-mono text-[10px]">
                          {importResult.errors.map((err: string, idx: number) => (
                            <li key={idx}>{err}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsImportModalOpen(false)}
                    className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                  >
                    Đóng (ESC)
                  </button>
                  <button
                    type="submit"
                    disabled={!importFile || isImporting}
                    className="px-5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {isImporting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    <span>{isImporting ? 'Đang Import...' : 'Tiến Hành Import'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

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
