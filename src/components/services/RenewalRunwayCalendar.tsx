'use client';

import React, { useState, useMemo, useCallback } from 'react';
import {
  Calendar,
  DollarSign,
  TrendingUp,
  AlertCircle,
  Download,
  Building2,
  ChevronRight,
  RefreshCw,
  ExternalLink,
  Flame,
  Globe,
  Wifi,
  Cloud,
  Shield,
  Mail,
  PhoneCall,
  Wrench,
  Server,
  Layers,
  KeyRound,
  CheckCircle2,
  Clock,
  Filter,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { ITServiceItem } from './types';
import { useLanguage } from '@/lib/i18n/context';

// ==================== MÀU SẮC & CẤU HÌNH PHÂN LOẠI ====================
export const RUNWAY_CATEGORIES: Record<
  string,
  { label: string; color: string; icon: any; stackKey: string }
> = {
  INTERNET: {
    label: 'Internet & Cáp quang',
    color: '#2563eb', // Blue-600
    icon: Wifi,
    stackKey: 'INTERNET',
  },
  CLOUD_HOSTING: {
    label: 'Cloud VPS & Máy chủ',
    color: '#4f46e5', // Indigo-600
    icon: Cloud,
    stackKey: 'CLOUD_HOSTING',
  },
  DOMAIN_SSL: {
    label: 'Tên miền & SSL',
    color: '#059669', // Emerald-600
    icon: Shield,
    stackKey: 'DOMAIN_SSL',
  },
  EMAIL_COMMUNICATION: {
    label: 'Email & SaaS',
    color: '#0891b2', // Cyan-600
    icon: Mail,
    stackKey: 'EMAIL_COMMUNICATION',
  },
  TELECOM_VOIP: {
    label: 'Tổng đài & Thoại VoIP',
    color: '#9333ea', // Purple-600
    icon: PhoneCall,
    stackKey: 'TELECOM_VOIP',
  },
  MAINTENANCE_SLA: {
    label: 'Bảo trì SLA',
    color: '#d97706', // Amber-600
    icon: Wrench,
    stackKey: 'MAINTENANCE_SLA',
  },
  SOFTWARE_SAAS: {
    label: 'Thuê bao phần mềm (SaaS)',
    color: '#e11d48', // Rose-600
    icon: Server,
    stackKey: 'SOFTWARE_SAAS',
  },
  LICENSES: {
    label: 'Bản quyền & License',
    color: '#c026d3', // Fuchsia-600
    icon: KeyRound,
    stackKey: 'LICENSES',
  },
  OTHER: {
    label: 'Dịch vụ IT khác',
    color: '#64748b', // Slate-500
    icon: Layers,
    stackKey: 'OTHER',
  },
};

export interface DuePaymentItem {
  id: string;
  code: string;
  name: string;
  category: string;
  categoryLabel: string;
  categoryColor: string;
  vendorName: string;
  companyName: string;
  contractNumber?: string;
  dueDate: string;
  billingCycle: string;
  amount: number; // Đã quy đổi về selectedCurrency
  rawCost: number;
  rawCurrency: string;
  isLicense?: boolean;
  originalItem: any;
}

export interface MonthData {
  index: number;
  year: number;
  month: number; // 0-11
  label: string; // T10/26
  fullLabel: string; // Tháng 10/2026
  key: string; // 2026-10
  total: number;
  INTERNET: number;
  CLOUD_HOSTING: number;
  DOMAIN_SSL: number;
  EMAIL_COMMUNICATION: number;
  TELECOM_VOIP: number;
  MAINTENANCE_SLA: number;
  SOFTWARE_SAAS: number;
  LICENSES: number;
  OTHER: number;
  items: DuePaymentItem[];
}

interface RenewalRunwayCalendarProps {
  services: ITServiceItem[];
  licenses?: any[];
  companies?: string[];
  selectedCurrency: string;
  exchangeRatesMap: Record<string, number>;
  convertCurrency: (
    amount: number,
    fromCurrency?: string,
    toCurrency?: string,
    recordedHistoricalRate?: number
  ) => number;
  formatPrice: (amount: number, currency?: string) => string;
  onSelectService?: (service: ITServiceItem) => void;
  onQuickRenew?: (service: ITServiceItem, months: number) => void;
  isEn?: boolean;
}

export function RenewalRunwayCalendar({
  services,
  licenses = [],
  companies = [],
  selectedCurrency,
  exchangeRatesMap,
  convertCurrency,
  formatPrice,
  onSelectService,
  onQuickRenew,
  isEn = false,
}: RenewalRunwayCalendarProps) {
  const { t, language, isEn: ctxIsEn, isJa } = useLanguage();
  const effectiveIsEn = isEn || ctxIsEn;

  // Resolved localized category definitions
  const localizedCategories = useMemo(() => {
    return {
      INTERNET: {
        ...RUNWAY_CATEGORIES.INTERNET,
        label: t('services.runway.cat_internet', RUNWAY_CATEGORIES.INTERNET.label),
      },
      CLOUD_HOSTING: {
        ...RUNWAY_CATEGORIES.CLOUD_HOSTING,
        label: t('services.runway.cat_cloud', RUNWAY_CATEGORIES.CLOUD_HOSTING.label),
      },
      DOMAIN_SSL: {
        ...RUNWAY_CATEGORIES.DOMAIN_SSL,
        label: t('services.runway.cat_domain', RUNWAY_CATEGORIES.DOMAIN_SSL.label),
      },
      EMAIL_COMMUNICATION: {
        ...RUNWAY_CATEGORIES.EMAIL_COMMUNICATION,
        label: t('services.runway.cat_email', RUNWAY_CATEGORIES.EMAIL_COMMUNICATION.label),
      },
      TELECOM_VOIP: {
        ...RUNWAY_CATEGORIES.TELECOM_VOIP,
        label: t('services.runway.cat_telecom', RUNWAY_CATEGORIES.TELECOM_VOIP.label),
      },
      MAINTENANCE_SLA: {
        ...RUNWAY_CATEGORIES.MAINTENANCE_SLA,
        label: t('services.runway.cat_maintenance', RUNWAY_CATEGORIES.MAINTENANCE_SLA.label),
      },
      SOFTWARE_SAAS: {
        ...RUNWAY_CATEGORIES.SOFTWARE_SAAS,
        label: t('services.runway.cat_saas', RUNWAY_CATEGORIES.SOFTWARE_SAAS.label),
      },
      LICENSES: {
        ...RUNWAY_CATEGORIES.LICENSES,
        label: t('services.runway.cat_licenses', RUNWAY_CATEGORIES.LICENSES.label),
      },
      OTHER: {
        ...RUNWAY_CATEGORIES.OTHER,
        label: t('services.runway.cat_other', RUNWAY_CATEGORIES.OTHER.label),
      },
    };
  }, [t]);

  // Filters State
  const [selectedCompany, setSelectedCompany] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [includeLicenses, setIncludeLicenses] = useState<boolean>(true);
  const [selectedMonthIndex, setSelectedMonthIndex] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // ==================== THUẬT TOÁN DỰ PHÓNG DÒNG TIỀN 12 THÁNG ====================
  const monthlyProjection = useMemo(() => {
    const now = new Date();
    const months: MonthData[] = [];

    // Tạo danh sách 12 tháng liên tiếp
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const year = d.getFullYear();
      const month = d.getMonth();
      const monthStr = String(month + 1).padStart(2, '0');
      const label = isJa
        ? `${month + 1}月`
        : effectiveIsEn
        ? `M${month + 1}/${String(year).slice(-2)}`
        : `T${month + 1}/${String(year).slice(-2)}`;
      const fullLabel = isJa
        ? `${year}年${month + 1}月`
        : effectiveIsEn
        ? `${d.toLocaleString('en-US', { month: 'short' })} ${year}`
        : `Tháng ${month + 1}/${year}`;

      months.push({
        index: i,
        year,
        month,
        label,
        fullLabel,
        key: `${year}-${monthStr}`,
        total: 0,
        INTERNET: 0,
        CLOUD_HOSTING: 0,
        DOMAIN_SSL: 0,
        EMAIL_COMMUNICATION: 0,
        TELECOM_VOIP: 0,
        MAINTENANCE_SLA: 0,
        SOFTWARE_SAAS: 0,
        LICENSES: 0,
        OTHER: 0,
        items: [],
      });
    }

    // 1. Phân bổ Dịch vụ IT (ITService)
    services.forEach((svc) => {
      if (svc.status === 'TERMINATED') return;
      if (selectedCompany !== 'ALL' && svc.companyName !== selectedCompany) return;
      if (selectedCategory !== 'ALL' && svc.serviceType !== selectedCategory) return;

      const rawCost = Number(svc.cost) || 0;
      if (rawCost <= 0) return;

      const cur = (svc.currency || 'VND').toUpperCase();
      const costInTarget = convertCurrency(
        rawCost,
        cur,
        selectedCurrency,
        svc.specs?.exchangeRate
      );

      const categoryKey = svc.serviceType in localizedCategories ? svc.serviceType : 'OTHER';
      const catConfig = localizedCategories[categoryKey as keyof typeof localizedCategories] || localizedCategories.OTHER;

      // Xác định ngày mốc gia hạn
      const baseDate = svc.renewalDate
        ? new Date(svc.renewalDate)
        : svc.startDate
        ? new Date(svc.startDate)
        : now;

      const baseYear = baseDate.getFullYear();
      const baseMonth = baseDate.getMonth();

      // Kiểm tra sự xuất hiện trong từng tháng của 12 tháng tiếp theo
      months.forEach((m) => {
        let isDueInMonth = false;
        let dueDateStr = svc.renewalDate || '';

        const cycle = svc.billingCycle;
        const periodCount = svc.specs?.billingPeriodCount;
        const periodUnit = svc.specs?.billingPeriodUnit;

        if (periodUnit === 'MONTH' && periodCount && periodCount > 0) {
          const diffMonths = (m.year - baseYear) * 12 + (m.month - baseMonth);
          if (diffMonths >= 0 && diffMonths % periodCount === 0) {
            isDueInMonth = true;
          }
        } else if (periodUnit === 'YEAR' && periodCount && periodCount > 0) {
          const diffYears = m.year - baseYear;
          if (diffYears >= 0 && m.month === baseMonth && diffYears % periodCount === 0) {
            isDueInMonth = true;
          }
        } else {
          switch (cycle) {
            case 'MONTHLY':
              // Hàng tháng xuất hiện trong cả 12 tháng
              isDueInMonth = true;
              break;

            case 'QUARTERLY': {
              // Hàng quý (3 tháng/lần)
              const diffMonths = (m.year - baseYear) * 12 + (m.month - baseMonth);
              if (diffMonths % 3 === 0) isDueInMonth = true;
              break;
            }

            case 'SEMI_ANNUAL': {
              // 6 tháng/lần
              const diffMonths = (m.year - baseYear) * 12 + (m.month - baseMonth);
              if (diffMonths % 6 === 0) isDueInMonth = true;
              break;
            }

            case 'ANNUAL': {
              // Hàng năm (rơi vào đúng tháng baseMonth)
              if (m.month === baseMonth) isDueInMonth = true;
              break;
            }

            case 'BIENNIAL': {
              // 2 năm / lần
              const diffYears = m.year - baseYear;
              if (m.month === baseMonth && diffYears >= 0 && diffYears % 2 === 0) {
                isDueInMonth = true;
              }
              break;
            }

            case 'TRIENNIAL': {
              // 3 năm / lần
              const diffYears = m.year - baseYear;
              if (m.month === baseMonth && diffYears >= 0 && diffYears % 3 === 0) {
                isDueInMonth = true;
              }
              break;
            }

            case 'ONE_TIME': {
              // Thanh toán 1 lần: chỉ rơi vào đúng tháng và năm
              if (m.year === baseYear && m.month === baseMonth) {
                isDueInMonth = true;
              }
              break;
            }

            default:
              if (m.month === baseMonth) isDueInMonth = true;
              break;
          }
        }

        if (isDueInMonth) {
          (m as any)[categoryKey] = ((m as any)[categoryKey] || 0) + costInTarget;
          m.total += costInTarget;

          // Sinh ngày cụ thể trong tháng nếu không có renewalDate
          if (!dueDateStr) {
            const day = Math.min(baseDate.getDate(), 28);
            dueDateStr = `${m.year}-${String(m.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          }

          m.items.push({
            id: svc.id,
            code: svc.serviceCode,
            name: svc.name,
            category: categoryKey,
            categoryLabel: catConfig.label,
            categoryColor: catConfig.color,
            vendorName: svc.vendor?.name || t('services.runway.default_vendor', 'Nhà mạng / Đối tác'),
            companyName: svc.companyName || t('services.runway.default_company', 'Tập đoàn'),
            contractNumber: svc.contractNumber || svc.accountNumber || '—',
            dueDate: dueDateStr,
            billingCycle: svc.billingCycle,
            amount: costInTarget,
            rawCost,
            rawCurrency: cur,
            isLicense: false,
            originalItem: svc,
          });
        }
      });
    });

    // 2. Phân bổ Bản quyền phần mềm (SaaS Licenses) nếu được bật
    if (includeLicenses && licenses.length > 0 && (selectedCategory === 'ALL' || selectedCategory === 'LICENSES')) {
      licenses.forEach((lic) => {
        if (lic.status === 'EXPIRED' || lic.status === 'SUSPENDED') return;
        if (selectedCompany !== 'ALL' && lic.companyName !== selectedCompany) return;
        if (lic.licenseType === 'PERPETUAL' && !lic.expiryDate) return; // Vĩnh viễn không có phí duy trì định kỳ

        const rawCost = Number(lic.purchasePrice) || 0;
        if (rawCost <= 0) return;

        const cur = (lic.purchaseCurrency || 'VND').toUpperCase();
        const costInTarget = convertCurrency(rawCost, cur, selectedCurrency);
        const catConfig = localizedCategories.LICENSES;

        if (lic.expiryDate) {
          const exp = new Date(lic.expiryDate);
          months.forEach((m) => {
            // Rơi vào tháng hết hạn
            if (m.year === exp.getFullYear() && m.month === exp.getMonth()) {
              m.LICENSES += costInTarget;
              m.total += costInTarget;

              m.items.push({
                id: lic.id,
                code: `LIC-${lic.id.slice(0, 6).toUpperCase()}`,
                name: lic.name,
                category: 'LICENSES',
                categoryLabel: catConfig.label,
                categoryColor: catConfig.color,
                vendorName: lic.vendor?.name || t('services.runway.default_lic_vendor', 'Nhà phát triển / Hãng phần mềm'),
                companyName: lic.companyName || t('services.runway.default_company', 'Tập đoàn'),
                contractNumber: lic.contractNumber || lic.licenseKey?.slice(0, 10) || '—',
                dueDate: lic.expiryDate.split('T')[0],
                billingCycle: 'ANNUAL (Subscription)',
                amount: costInTarget,
                rawCost,
                rawCurrency: cur,
                isLicense: true,
                originalItem: lic,
              });
            }
          });
        }
      });
    }

    // Sắp xếp các khoản chi trong từng tháng theo số tiền giảm dần
    months.forEach((m) => {
      m.items.sort((a, b) => b.amount - a.amount);
    });

    return months;
  }, [
    services,
    licenses,
    companies,
    selectedCompany,
    selectedCategory,
    includeLicenses,
    selectedCurrency,
    convertCurrency,
    effectiveIsEn,
    isJa,
    localizedCategories,
    t,
  ]);

  // ==================== TÍNH TOÁN CÁC CHỈ SỐ KPI TỔNG ====================
  const kpiStats = useMemo(() => {
    let grandTotal = 0;
    let peakMonth: MonthData | null = null;
    let totalItemsCount = 0;

    monthlyProjection.forEach((m) => {
      grandTotal += m.total;
      totalItemsCount += m.items.length;
      if (!peakMonth || m.total > peakMonth.total) {
        peakMonth = m;
      }
    });

    const monthlyAverage = grandTotal / 12;

    return {
      grandTotal,
      monthlyAverage,
      peakMonth: peakMonth || monthlyProjection[0],
      totalItemsCount,
    };
  }, [monthlyProjection]);

  // Tháng đang được chọn để khoan sâu
  const activeMonth = monthlyProjection[selectedMonthIndex] || monthlyProjection[0];

  // Lọc tìm kiếm trong tháng đang chọn
  const filteredActiveItems = useMemo(() => {
    if (!searchQuery.trim()) return activeMonth.items;
    const q = searchQuery.toLowerCase();
    return activeMonth.items.filter(
      (it) =>
        it.name.toLowerCase().includes(q) ||
        it.code.toLowerCase().includes(q) ||
        it.vendorName.toLowerCase().includes(q) ||
        it.contractNumber?.toLowerCase().includes(q)
    );
  }, [activeMonth, searchQuery]);

  // ==================== XUẤT BẢNG DỰ TOÁN EXCEL 12 THÁNG ====================
  const handleExportRunwayExcel = useCallback(async () => {
    setIsExporting(true);
    try {
      const ExcelJS = await import('exceljs');
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'Simply IT Asset Management';
      workbook.created = new Date();

      // Sheet 1: Ma trận dòng tiền 12 tháng theo nhóm dịch vụ
      const matrixSheet = workbook.addWorksheet(t('services.runway.excel_sheet_matrix', 'Du_Toan_12_Thang'));
      matrixSheet.columns = [
        { header: t('services.runway.excel_cat_header', 'Nhóm Dịch Vụ / Thuê Bao'), key: 'category', width: 28 },
        ...monthlyProjection.map((m) => ({
          header: m.fullLabel,
          key: m.key,
          width: 18,
        })),
        { header: t('services.runway.excel_annual_total', 'Tổng Cả Năm'), key: 'annualTotal', width: 22 },
      ];

      // Header style
      matrixSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      matrixSheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4338CA' }, // Indigo-700
      };

      // Đổ từng dòng nhóm dịch vụ
      Object.keys(localizedCategories).forEach((catKey) => {
        const cat = localizedCategories[catKey as keyof typeof localizedCategories];
        const rowData: any = { category: cat.label };
        let catYearTotal = 0;

        monthlyProjection.forEach((m) => {
          const val = (m as any)[catKey] || 0;
          rowData[m.key] = val;
          catYearTotal += val;
        });

        rowData.annualTotal = catYearTotal;
        const row = matrixSheet.addRow(rowData);
        row.getCell('category').font = { bold: true };
      });

      // Dòng Tổng Cộng
      const totalRowData: any = { category: t('services.runway.excel_total_row', '=== TỔNG CHI PHÍ THÁNG ===') };
      monthlyProjection.forEach((m) => {
        totalRowData[m.key] = m.total;
      });
      totalRowData.annualTotal = kpiStats.grandTotal;
      const totalRow = matrixSheet.addRow(totalRowData);
      totalRow.font = { bold: true, color: { argb: 'FF1E1B4B' } };
      totalRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E7FF' }, // Indigo-100
      };

      // Sheet 2: Danh sách chi tiết các khoản thanh toán
      const itemSheet = workbook.addWorksheet(t('services.runway.excel_sheet_items', 'Chi_Tiet_Cac_Khoan_Chi'));
      itemSheet.columns = [
        { header: t('services.runway.col_month_header', 'Tháng'), key: 'month', width: 15 },
        { header: t('services.runway.col_service_code', 'Mã Dịch Vụ'), key: 'code', width: 16 },
        { header: t('services.runway.col_service_name', 'Tên Gói Dịch Vụ / License'), key: 'name', width: 35 },
        { header: t('services.runway.col_category', 'Phân Loại'), key: 'categoryLabel', width: 22 },
        { header: t('services.runway.col_vendor', 'Đối Tác / Nhà Cung Cấp'), key: 'vendorName', width: 25 },
        { header: t('services.runway.col_company', 'Công Ty Quản Lý'), key: 'companyName', width: 25 },
        { header: t('services.runway.col_contract', 'Số Hợp Đồng / Thuê Bao'), key: 'contractNumber', width: 22 },
        { header: t('services.runway.col_due_date', 'Hạn Gia Hạn'), key: 'dueDate', width: 16 },
        { header: `${t('services.runway.col_amount', 'Số Tiền')} (${selectedCurrency})`, key: 'amount', width: 20 },
        { header: t('services.runway.col_raw_price', 'Tiền Gốc Ban Đầu'), key: 'rawPrice', width: 20 },
      ];

      itemSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      itemSheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF065F46' }, // Emerald-800
      };

      monthlyProjection.forEach((m) => {
        m.items.forEach((it) => {
          itemSheet.addRow({
            month: m.fullLabel,
            code: it.code,
            name: it.name,
            categoryLabel: it.categoryLabel,
            vendorName: it.vendorName,
            companyName: it.companyName,
            contractNumber: it.contractNumber,
            dueDate: it.dueDate,
            amount: it.amount,
            rawPrice: `${new Intl.NumberFormat('vi-VN').format(it.rawCost)} ${it.rawCurrency}`,
          });
        });
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Du_Toan_Chi_Phi_IT_12_Thang_${new Date().toISOString().split('T')[0]}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Export Runway Excel error:', e);
      alert(t('services.runway.excel_err', 'Không thể xuất file Excel dự toán.'));
    } finally {
      setIsExporting(false);
    }
  }, [monthlyProjection, kpiStats, selectedCurrency, localizedCategories, t]);

  // Formatter rút gọn số tiền trên trục Y (ví dụ 10tr, 100tr, 1.2tỷ)
  const formatCompactYAxis = (val: number) => {
    if (val === 0) return '0';
    if (selectedCurrency === 'VND') {
      if (val >= 1000000000) return `${(val / 1000000000).toFixed(1)} tỷ`;
      if (val >= 1000000) return `${Math.round(val / 1000000)} tr`;
      if (val >= 1000) return `${Math.round(val / 1000)} k`;
      return String(val);
    }
    if (val >= 1000000) return `$${(val / 1000000).toFixed(1)}M`;
    if (val >= 1000) return `$${Math.round(val / 1000)}K`;
    return `$${val}`;
  };

  // Custom Tooltip trên biểu đồ cột
  const CustomChartTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const monthData: MonthData = payload[0]?.payload;
      if (!monthData) return null;

      return (
        <div className="bg-slate-900/95 backdrop-blur-md text-white p-3.5 rounded-2xl shadow-xl border border-slate-700/80 text-xs min-w-[240px] z-50">
          <div className="flex items-center justify-between border-b border-slate-700/80 pb-2 mb-2">
            <strong className="text-sm font-bold text-indigo-300">
              📅 {monthData.fullLabel}
            </strong>
            <span className="text-[10.5px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
              {monthData.items.length} {t('services.runway.tooltip_unit', 'khoản')}
            </span>
          </div>

          <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
            {Object.keys(localizedCategories).map((catKey) => {
              const val = (monthData as any)[catKey] || 0;
              if (val <= 0) return null;
              const cat = localizedCategories[catKey as keyof typeof localizedCategories];

              return (
                <div key={catKey} className="flex items-center justify-between gap-2 text-[11px]">
                  <span className="flex items-center gap-1.5 text-slate-300">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: cat.color }}
                    />
                    <span>{cat.label}</span>
                  </span>
                  <span className="font-mono font-bold text-white">
                    {formatPrice(val, selectedCurrency)}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="border-t border-slate-700/80 pt-2 mt-2 flex items-center justify-between font-bold">
            <span className="text-slate-300">{t('services.runway.tooltip_total', 'Tổng tháng:')}</span>
            <span className="text-emerald-400 text-sm font-mono font-extrabold">
              {formatPrice(monthData.total, selectedCurrency)}
            </span>
          </div>
          <p className="text-[9.5px] text-slate-400 text-center mt-1 italic">
            {t('services.runway.tooltip_hint', '💡 Nhấp vào cột để xem chi tiết khoản chi')}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-5">
      {/* 1. TOP 4 EXECUTIVE KPI BADGES */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* KPI 1: Tổng chi phí dự toán 12 tháng */}
        <div className="p-4 bg-gradient-to-br from-indigo-50 via-white to-blue-50/40 dark:from-slate-800 dark:to-slate-900 border border-indigo-200/80 dark:border-indigo-900/50 rounded-2xl shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider">
              {t('services.runway.kpi_12m_title', 'Dự toán dòng tiền 12 tháng')}
            </span>
            <span className="p-2 rounded-xl bg-indigo-600 text-white shadow-2xs">
              <DollarSign className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-slate-900 dark:text-white font-mono tracking-tight">
              {formatPrice(kpiStats.grandTotal, selectedCurrency)}
            </div>
            <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-indigo-600" />
              <span>
                {t('services.runway.kpi_12m_desc', 'Tổng chi phí định kỳ dự kiến cả năm')}
              </span>
            </p>
          </div>
        </div>

        {/* KPI 2: Tháng cao điểm ngân sách (Peak Month) */}
        <div className="p-4 bg-gradient-to-br from-rose-50 via-white to-amber-50/40 dark:from-slate-800 dark:to-slate-900 border border-rose-200/80 dark:border-rose-900/50 rounded-2xl shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider flex items-center gap-1">
              <Flame className="w-3.5 h-3.5 text-rose-600 animate-pulse" />
              <span>{t('services.runway.kpi_peak_title', 'Tháng cao điểm nhất')}</span>
            </span>
            <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 font-bold text-[10.5px]">
              {kpiStats.grandTotal > 0
                ? t('services.runway.kpi_peak_pct', '{pct}% cả năm').replace('{pct}', String(Math.round((kpiStats.peakMonth.total / kpiStats.grandTotal) * 100)))
                : '0%'}
            </span>
          </div>
          <div className="mt-2">
            <div className="text-lg font-black text-rose-700 dark:text-rose-300">
              {kpiStats.peakMonth.fullLabel}
            </div>
            <div className="text-base font-extrabold text-slate-900 dark:text-white font-mono">
              {formatPrice(kpiStats.peakMonth.total, selectedCurrency)}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {t('services.runway.kpi_peak_desc', 'Cần chuẩn bị hạn mức tiền mặt chi trả')}
            </p>
          </div>
        </div>

        {/* KPI 3: Chi phí trung bình / tháng (Monthly Run-rate) */}
        <div className="p-4 bg-gradient-to-br from-emerald-50 via-white to-cyan-50/40 dark:from-slate-800 dark:to-slate-900 border border-emerald-200/80 dark:border-emerald-900/50 rounded-2xl shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
              {t('services.runway.kpi_avg_title', 'Chi phí trung bình / Tháng')}
            </span>
            <span className="p-2 rounded-xl bg-emerald-600 text-white shadow-2xs">
              <Calendar className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-emerald-800 dark:text-emerald-300 font-mono tracking-tight">
              {formatPrice(kpiStats.monthlyAverage, selectedCurrency)}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              {t('services.runway.kpi_avg_desc', 'Tốc độ tiêu thụ ngân sách vận hành IT')}
            </p>
          </div>
        </div>

        {/* KPI 4: Tổng số lượt thanh toán & gia hạn */}
        <div className="p-4 bg-gradient-to-br from-purple-50 via-white to-indigo-50/40 dark:from-slate-800 dark:to-slate-900 border border-purple-200/80 dark:border-purple-900/50 rounded-2xl shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-purple-700 dark:text-purple-400 uppercase tracking-wider">
              {t('services.runway.kpi_events_title', 'Lượt gia hạn định kỳ')}
            </span>
            <span className="p-2 rounded-xl bg-purple-600 text-white shadow-2xs">
              <CheckCircle2 className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-purple-800 dark:text-purple-300 font-mono">
              {kpiStats.totalItemsCount}{' '}
              <span className="text-sm font-bold text-slate-500">
                {t('services.runway.kpi_events_unit', 'lượt chi trả')}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              {services.length} {t('services.runway.kpi_events_services', 'dịch vụ')}
              {includeLicenses ? ` + ${licenses.length} ${t('services.runway.kpi_events_licenses', 'bản quyền')}` : ''}
            </p>
          </div>
        </div>
      </div>

      {/* 2. FILTER TOOLBAR & EXPORT ACTION */}
      <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Lọc theo Công ty */}
          <div className="flex items-center gap-1.5">
            <Building2 className="w-4 h-4 text-slate-400" />
            <select
              value={selectedCompany}
              onChange={(e) => setSelectedCompany(e.target.value)}
              className="py-1.5 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="ALL">
                {t('services.runway.filter_all_companies', '🏢 Tất cả công ty thành viên')}
              </option>
              {companies.map((c) => (
                <option key={c} value={c}>
                  🏢 {c}
                </option>
              ))}
            </select>
          </div>

          {/* Lọc theo Nhóm dịch vụ */}
          <div className="flex items-center gap-1.5">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="py-1.5 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="ALL">
                {t('services.runway.filter_all_categories', '🌐 Tất cả nhóm dịch vụ')}
              </option>
              {Object.keys(localizedCategories).map((k) => (
                <option key={k} value={k}>
                  {localizedCategories[k as keyof typeof localizedCategories].label}
                </option>
              ))}
            </select>
          </div>

          {/* Toggle gộp Bản quyền License */}
          <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer bg-slate-50 dark:bg-slate-800/60 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 transition-colors">
            <input
              type="checkbox"
              checked={includeLicenses}
              onChange={(e) => setIncludeLicenses(e.target.checked)}
              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
            />
            <span className="flex items-center gap-1">
              <KeyRound className="w-3.5 h-3.5 text-purple-600" />
              <span>{t('services.runway.filter_include_licenses', 'Gộp cả Bản quyền SaaS')}</span>
            </span>
          </label>
        </div>

        {/* Nút Xuất Excel Dự Toán */}
        <button
          type="button"
          onClick={handleExportRunwayExcel}
          disabled={isExporting}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer disabled:opacity-50"
        >
          {isExporting ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Download className="w-3.5 h-3.5" />
          )}
          <span>{t('services.runway.btn_export_excel', 'Xuất Dự Toán Dòng Tiền (Excel)')}</span>
        </button>
      </div>

      {/* 3. INTERACTIVE STACKED BAR CHART */}
      <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-pulse" />
              <span>{t('services.runway.chart_title', 'Biểu Đồ Dự Báo Dòng Tiền 12 Tháng Tới (Xếp Chồng Theo Nhóm Dịch Vụ)')}</span>
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {t('services.runway.chart_subtitle', 'Trực quan hóa chi phí đáo hạn từng tháng. Nhấp vào cột để xem chi tiết từng hợp đồng.')}
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
            <span>{t('services.runway.display_currency', 'Tiền tệ hiển thị:')}</span>
            <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-mono font-bold text-xs border border-slate-200 dark:border-slate-700">
              {selectedCurrency}
            </span>
          </div>
        </div>

        {/* Vùng vẽ biểu đồ */}
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={monthlyProjection}
              margin={{ top: 15, right: 10, left: 10, bottom: 20 }}
              onClick={(state) => {
                if (state && state.activeTooltipIndex !== undefined) {
                  setSelectedMonthIndex(state.activeTooltipIndex);
                }
              }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }}
                axisLine={{ stroke: '#cbd5e1' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: '#64748b' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={formatCompactYAxis}
              />
              <Tooltip content={<CustomChartTooltip />} />
              <Legend
                verticalAlign="top"
                align="right"
                wrapperStyle={{ paddingBottom: '10px', fontSize: '11px' }}
              />

              {/* Các thanh xếp chồng theo nhóm dịch vụ */}
              <Bar dataKey="INTERNET" stackId="a" fill={RUNWAY_CATEGORIES.INTERNET.color} name={localizedCategories.INTERNET.label} radius={[0, 0, 0, 0]} />
              <Bar dataKey="CLOUD_HOSTING" stackId="a" fill={RUNWAY_CATEGORIES.CLOUD_HOSTING.color} name={localizedCategories.CLOUD_HOSTING.label} />
              <Bar dataKey="DOMAIN_SSL" stackId="a" fill={RUNWAY_CATEGORIES.DOMAIN_SSL.color} name={localizedCategories.DOMAIN_SSL.label} />
              <Bar dataKey="EMAIL_COMMUNICATION" stackId="a" fill={RUNWAY_CATEGORIES.EMAIL_COMMUNICATION.color} name={localizedCategories.EMAIL_COMMUNICATION.label} />
              <Bar dataKey="TELECOM_VOIP" stackId="a" fill={RUNWAY_CATEGORIES.TELECOM_VOIP.color} name={localizedCategories.TELECOM_VOIP.label} />
              <Bar dataKey="MAINTENANCE_SLA" stackId="a" fill={RUNWAY_CATEGORIES.MAINTENANCE_SLA.color} name={localizedCategories.MAINTENANCE_SLA.label} />
              <Bar dataKey="SOFTWARE_SAAS" stackId="a" fill={RUNWAY_CATEGORIES.SOFTWARE_SAAS.color} name={localizedCategories.SOFTWARE_SAAS.label} />
              {includeLicenses && (
                <Bar dataKey="LICENSES" stackId="a" fill={RUNWAY_CATEGORIES.LICENSES.color} name={localizedCategories.LICENSES.label} />
              )}
              <Bar dataKey="OTHER" stackId="a" fill={RUNWAY_CATEGORIES.OTHER.color} name={localizedCategories.OTHER.label} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* 4. CHỌN NHANH 12 THÁNG DẠNG CAROUSEL / MINI CARDS */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {t('services.runway.select_month', 'Chọn tháng để xem chi tiết hợp đồng:')}
            </span>
            <span className="text-[11px] text-slate-400">
              {t('services.runway.showing_month', 'Đang xem:')}{' '}
              <strong className="text-indigo-600 font-bold">{activeMonth.fullLabel}</strong>
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-12 gap-2">
            {monthlyProjection.map((m, idx) => {
              const isSelected = idx === selectedMonthIndex;
              const isPeak = m.key === kpiStats.peakMonth.key;

              return (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => setSelectedMonthIndex(idx)}
                  className={`p-2 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'bg-indigo-600 text-white border-indigo-700 shadow-md ring-2 ring-indigo-300'
                      : isPeak
                      ? 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800 hover:bg-rose-100/70 text-slate-800 dark:text-slate-200'
                      : 'bg-slate-50 dark:bg-slate-800/70 border-slate-200 dark:border-slate-700 hover:bg-slate-100 text-slate-800 dark:text-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className={`text-[10px] font-bold ${isSelected ? 'text-indigo-200' : 'text-slate-500'}`}>
                      {m.label}
                    </span>
                    {isPeak && !isSelected && (
                      <span className="text-[9px] px-1 py-0.2 rounded bg-rose-200 text-rose-800 font-bold">
                        {t('services.runway.peak_badge', 'Peak')}
                      </span>
                    )}
                  </div>
                  <div className="mt-1">
                    <div
                      className={`font-mono text-xs font-bold truncate ${
                        isSelected ? 'text-white' : 'text-slate-900 dark:text-white'
                      }`}
                    >
                      {formatCompactYAxis(m.total)}
                    </div>
                    <span
                      className={`text-[9.5px] block ${
                        isSelected ? 'text-indigo-200' : 'text-slate-400'
                      }`}
                    >
                      {m.items.length} {t('services.runway.items_unit', 'mục')}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 5. DRILL-DOWN TABLE: CHI TIẾT TỪNG KHOẢN CHI TRONG THÁNG ĐƯỢC CHỌN */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xs overflow-hidden">
        {/* Header của bảng chi tiết */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-50/60 dark:bg-slate-800/40">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-2">
                <span>📋</span>
                <span>
                  {t('services.runway.table_title', 'Chi Tiết Các Khoản Cần Thanh Toán Trong {month}').replace('{month}', activeMonth.fullLabel)}
                </span>
              </h3>
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 font-mono font-bold text-xs">
                {formatPrice(activeMonth.total, selectedCurrency)}
              </span>
              <span className="text-xs text-slate-500 font-medium">
                ({activeMonth.items.length} {t('services.runway.table_services_count', 'dịch vụ & hợp đồng')})
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {t('services.runway.table_subtitle', 'Danh sách chi tiết từng gói cước, số hợp đồng, nhà mạng và hạn thanh toán chính xác.')}
            </p>
          </div>

          {/* Ô tìm kiếm nhanh trong tháng */}
          <div className="w-full sm:w-64 relative">
            <input
              type="text"
              placeholder={t('services.runway.search_placeholder', 'Lọc gói cước trong tháng...')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <span className="absolute left-2.5 top-2 text-slate-400 text-xs">🔍</span>
          </div>
        </div>

        {/* Bảng dữ liệu */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse min-w-[850px]">
            <thead className="bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-700 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="py-2.5 px-3 min-w-[160px]">
                  {t('services.runway.col_code_name', 'MÃ & TÊN DỊCH VỤ / LICENSE')}
                </th>
                <th className="py-2.5 px-2.5 min-w-[130px]">{t('services.runway.col_category', 'PHÂN LOẠI')}</th>
                <th className="py-2.5 px-2.5 min-w-[140px]">{t('services.runway.col_vendor', 'ĐỐI TÁC / NHÀ MẠNG')}</th>
                <th className="py-2.5 px-2.5 min-w-[130px]">{t('services.runway.col_company', 'CÔNG TY QUẢN LÝ')}</th>
                <th className="py-2.5 px-2.5 min-w-[100px]">{t('services.runway.col_cycle', 'CHU KỲ')}</th>
                <th className="py-2.5 px-2.5 min-w-[105px]">{t('services.runway.col_due_date', 'HẠN GIA HẠN')}</th>
                <th className="py-2.5 px-2.5 text-right min-w-[120px]">{t('services.runway.col_amount', 'SỐ TIỀN CẦN CHI')}</th>
                <th className="py-2.5 px-3 text-right min-w-[100px]">{t('services.runway.col_actions', 'THAO TÁC')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredActiveItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <div className="text-2xl mb-1">🎉</div>
                    <p className="font-bold text-xs">
                      {t('services.runway.empty_title', 'Không có khoản thanh toán nào cần chi trả trong tháng này.')}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredActiveItems.map((it) => {
                  const Icon =
                    it.category in localizedCategories
                      ? (localizedCategories[it.category as keyof typeof localizedCategories] as any).icon
                      : Layers;

                  return (
                    <tr
                      key={`${it.id}-${it.dueDate}`}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* Mã & Tên */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <span
                            className="p-1.5 rounded-lg text-white shrink-0"
                            style={{ backgroundColor: it.categoryColor }}
                          >
                            <Icon className="w-3.5 h-3.5" />
                          </span>
                          <div className="min-w-0">
                            <div className="font-bold text-slate-900 dark:text-white truncate max-w-[200px]">
                              {it.name}
                            </div>
                            <div className="text-[10.5px] font-mono text-slate-400 flex items-center gap-1.5">
                              <span>[{it.code}]</span>
                              {it.contractNumber && it.contractNumber !== '—' && (
                                <span>• {t('services.runway.contract_abbr', 'HĐ')}: {it.contractNumber}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Phân loại */}
                      <td className="py-3 px-2.5">
                        <span
                          className="px-2 py-0.5 rounded-md text-[10.5px] font-bold border truncate inline-block max-w-[120px]"
                          style={{
                            color: it.categoryColor,
                            borderColor: `${it.categoryColor}40`,
                            backgroundColor: `${it.categoryColor}15`,
                          }}
                        >
                          {it.categoryLabel}
                        </span>
                      </td>

                      {/* Đối tác */}
                      <td className="py-3 px-2.5 text-slate-700 dark:text-slate-300 font-medium truncate max-w-[140px]">
                        {it.vendorName}
                      </td>

                      {/* Công ty */}
                      <td className="py-3 px-2.5 text-slate-600 dark:text-slate-400 text-[11px] truncate max-w-[130px]">
                        {it.companyName}
                      </td>

                      {/* Chu kỳ */}
                      <td className="py-3 px-2.5">
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono text-[10.5px]">
                          {it.billingCycle}
                        </span>
                      </td>

                      {/* Ngày đến hạn */}
                      <td className="py-3 px-2.5">
                        <span className="font-mono text-slate-800 dark:text-slate-200 font-medium">
                          {it.dueDate}
                        </span>
                      </td>

                      {/* Số tiền */}
                      <td className="py-3 px-2.5 text-right font-mono">
                        <div className="font-extrabold text-slate-900 dark:text-white text-xs">
                          {formatPrice(it.amount, selectedCurrency)}
                        </div>
                        {it.rawCurrency !== selectedCurrency && (
                          <div className="text-[10px] text-slate-400">
                            ≈ {new Intl.NumberFormat('vi-VN').format(it.rawCost)} {it.rawCurrency}
                          </div>
                        )}
                      </td>

                      {/* Thao tác */}
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {!it.isLicense && onSelectService && (
                            <button
                              type="button"
                              onClick={() => onSelectService(it.originalItem)}
                              className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-[11px] font-bold transition-colors cursor-pointer"
                            >
                              {t('services.runway.btn_view', 'Xem')}
                            </button>
                          )}
                          {!it.isLicense && onQuickRenew && (
                            <button
                              type="button"
                              onClick={() => onQuickRenew(it.originalItem, 12)}
                              className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-[11px] font-bold transition-colors cursor-pointer"
                              title={t('services.runway.btn_renew_tooltip', 'Gia hạn nhanh 1 năm')}
                            >
                              {t('services.runway.btn_renew', 'Gia hạn')}
                            </button>
                          )}
                        </div>
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
}
export default RenewalRunwayCalendar;
