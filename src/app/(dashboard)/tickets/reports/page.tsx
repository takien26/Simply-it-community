'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/lib/i18n/context';
import {
  LifeBuoy,
  BarChart3,
  TrendingUp,
  Download,
  Printer,
  RotateCcw,
  Search,
  Filter,
  Calendar,
  Building,
  Users,
  User as UserIcon,
  Shield,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Layers,
  ChevronRight,
  ChevronDown,
  ArrowUpRight,
  ArrowDownRight,
  ExternalLink,
  Laptop,
  Check,
  X,
  FileSpreadsheet,
  FileText,
  HelpCircle,
  Sparkles,
  RefreshCw,
  Eye,
} from 'lucide-react';

interface ReportData {
  summary: {
    totalTickets: number;
    openTickets: number;
    inProgressTickets: number;
    waitingTickets: number;
    resolvedTickets: number;
    closedTickets: number;
    onTimeSlaCount: number;
    breachedSlaCount: number;
    slaComplianceRate: number;
    avgResolutionHours: number;
    aiAutoRoutedCount: number;
    totalActualSpentMinutes?: number;
    totalActualSpentHours?: number;
    avgCsatRating?: number;
    csatSatisfactionRate?: number;
    totalRatedTickets?: number;
    chronicAssetsCount?: number;
  };
  incidentsSummary: {
    totalIncidents: number;
    criticalIncidents: number;
    resolvedIncidents: number;
    recentIncidents: Array<{
      id: string;
      incidentNumber: string;
      title: string;
      severity: string;
      status: string;
      startedAt: string;
      resolvedAt?: string | null;
      team?: { name: string } | null;
    }>;
  };
  priorityStats: Record<string, number>;
  categoryStats: Array<{
    category: string;
    count: number;
    percentage: number;
    avgHours: number;
  }>;
  companyStats: Array<{
    companyName: string;
    total: number;
    resolved: number;
    breachedSla: number;
    resolutionRate: number;
    topRequesters: Array<{
      id: string;
      fullName: string;
      department: string;
      count: number;
    }>;
  }>;
  teamStats: Array<{
    teamId: string;
    teamName: string;
    teamCode: string;
    total: number;
    resolved: number;
    onTimeSla: number;
    breachedSla: number;
    slaRate: number;
    avgHours: number;
    technicians: Array<{
      userId: string;
      fullName: string;
      email: string;
      total: number;
      resolved: number;
      onTimeSla: number;
    }>;
  }>;
  technicianStats: Array<{
    userId: string;
    fullName: string;
    email: string;
    department: string;
    total: number;
    resolved: number;
    onTimeSla: number;
    breachedSla: number;
    slaRate: number;
    avgHours: number;
    actualSpentMinutes?: number;
    actualSpentHours?: number;
    avgRating?: number | null;
    ratedCount?: number;
  }>;
  topFaultyAssets?: Array<{
    id: string;
    assetTag: string;
    name: string;
    brand?: string | null;
    model?: string | null;
    ticketCount: number;
    openCount: number;
    latestTicketTitle?: string;
    companyName?: string | null;
  }>;
  trendStats: Array<{
    date: string;
    created: number;
    resolved: number;
    breached: number;
  }>;
  filterOptions: {
    companies: string[];
    teams: Array<{ id: string; name: string; code: string; companyScope?: string | null }>;
    technicians: Array<{ id: string; fullName: string; email: string; department?: string | null }>;
    allUsers: Array<{ id: string; fullName: string; email: string; department?: string | null }>;
  };
  tickets: Array<{
    id: string;
    ticketNumber: string;
    title: string;
    description: string;
    category: string;
    priority: string;
    status: string;
    companyName?: string | null;
    dueDate?: string | null;
    slaDeadline?: string | null;
    resolvedAt?: string | null;
    createdAt: string;
    isAutoRouted?: boolean;
    createdBy: {
      id: string;
      fullName: string;
      email: string;
      department?: string | null;
    };
    assignedTo?: {
      id: string;
      fullName: string;
      email: string;
      department?: string | null;
    } | null;
    team?: {
      id: string;
      name: string;
      code: string;
    } | null;
    asset?: {
      id: string;
      assetTag: string;
      name: string;
    } | null;
    incident?: {
      id: string;
      incidentNumber: string;
      title: string;
      severity: string;
    } | null;
  }>;
}

const getCategoryName = (cat: string, lang: string) => {
  if (lang === 'ja') {
    const mapJa: Record<string, string> = {
      HARDWARE: 'ハードウェア',
      SOFTWARE: 'ソフトウェア',
      NETWORK: 'ネットワーク＆回線',
      LICENSE: 'ライセンス',
      ACCESS_REQUEST: 'アクセス権限申請',
      OTHER: 'その他',
    };
    return mapJa[cat] || cat;
  }
  if (lang === 'en') {
    const mapEn: Record<string, string> = {
      HARDWARE: 'Hardware',
      SOFTWARE: 'Software',
      NETWORK: 'Network & Internet',
      LICENSE: 'License & Software',
      ACCESS_REQUEST: 'Access Request',
      OTHER: 'Other',
    };
    return mapEn[cat] || cat;
  }
  const mapVi: Record<string, string> = {
    HARDWARE: 'Phần Cứng',
    SOFTWARE: 'Phần Mềm',
    NETWORK: 'Mạng & Internet',
    LICENSE: 'Bản Quyền / License',
    ACCESS_REQUEST: 'Quyền Truy Cập',
    OTHER: 'Khác',
  };
  return mapVi[cat] || cat;
};

const getPriorityInfo = (pri: string, lang: string) => {
  const map: Record<string, { labelVi: string; labelEn: string; labelJa: string; color: string; badge: string }> = {
    URGENT: { labelVi: 'Khẩn cấp', labelEn: 'Urgent', labelJa: '緊急', color: 'text-rose-600', badge: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950 dark:text-rose-300' },
    HIGH: { labelVi: 'Cao', labelEn: 'High', labelJa: '高', color: 'text-amber-600', badge: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300' },
    MEDIUM: { labelVi: 'Trung bình', labelEn: 'Medium', labelJa: '中', color: 'text-blue-600', badge: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300' },
    LOW: { labelVi: 'Thấp', labelEn: 'Low', labelJa: '低', color: 'text-slate-600', badge: 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300' },
  };
  const info = map[pri] || map.LOW;
  return {
    label: lang === 'ja' ? info.labelJa : (lang === 'en' ? info.labelEn : info.labelVi),
    color: info.color,
    badge: info.badge,
  };
};

const getStatusInfo = (status: string, lang: string) => {
  const map: Record<string, { labelVi: string; labelEn: string; labelJa: string; badge: string }> = {
    OPEN: { labelVi: 'Mới tạo', labelEn: 'Open', labelJa: '新規受付', badge: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300' },
    IN_PROGRESS: { labelVi: 'Đang xử lý', labelEn: 'In Progress', labelJa: '対応中', badge: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300' },
    WAITING: { labelVi: 'Chờ phản hồi', labelEn: 'Waiting', labelJa: '返信待ち', badge: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300' },
    RESOLVED: { labelVi: 'Đã giải quyết', labelEn: 'Resolved', labelJa: '解決済み', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300' },
    CLOSED: { labelVi: 'Đã đóng', labelEn: 'Closed', labelJa: '完了', badge: 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300' },
  };
  const info = map[status] || map.OPEN;
  return {
    label: lang === 'ja' ? info.labelJa : (lang === 'en' ? info.labelEn : info.labelVi),
    badge: info.badge,
  };
};

export default function TicketReportsPage() {
  const { language, t, isEn, isJa } = useLanguage();

  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Active Tab
  const [activeTab, setActiveTab] = useState<'overview' | 'executive' | 'company' | 'team' | 'incidents' | 'tickets'>('executive');

  // Filter States
  const [timeRange, setTimeRange] = useState<string>('this_month');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [selectedCompany, setSelectedCompany] = useState<string>('ALL');
  const [selectedRequester, setSelectedRequester] = useState<string>('ALL');
  const [selectedTeam, setSelectedTeam] = useState<string>('ALL');
  const [selectedTechnician, setSelectedTechnician] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedPriority, setSelectedPriority] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  // Ticket Explorer Search
  const [tableSearch, setTableSearch] = useState<string>('');

  // Selected Company for Drilldown
  const [expandedCompany, setExpandedCompany] = useState<string | null>(null);

  // Fetch Report Data
  const fetchReportData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      params.set('timeRange', timeRange);
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      if (selectedCompany !== 'ALL') params.set('companyName', selectedCompany);
      if (selectedRequester !== 'ALL') params.set('requesterId', selectedRequester);
      if (selectedTeam !== 'ALL') params.set('teamId', selectedTeam);
      if (selectedTechnician !== 'ALL') params.set('assignedToId', selectedTechnician);
      if (selectedCategory !== 'ALL') params.set('category', selectedCategory);
      if (selectedPriority !== 'ALL') params.set('priority', selectedPriority);
      if (selectedStatus !== 'ALL') params.set('status', selectedStatus);

      const res = await fetch(`/api/tickets/reports?${params.toString()}`);
      const result = await res.json();

      if (result.success && result.data) {
        setData(result.data);
      } else {
        setError(result.error || (isEn ? 'Failed to load report data' : 'Không thể tải dữ liệu báo cáo'));
      }
    } catch (err: any) {
      setError(err.message || (isEn ? 'Server connection error' : 'Lỗi kết nối máy chủ'));
    } finally {
      setLoading(false);
    }
  }, [
    timeRange,
    startDate,
    endDate,
    selectedCompany,
    selectedRequester,
    selectedTeam,
    selectedTechnician,
    selectedCategory,
    selectedPriority,
    selectedStatus,
    isEn,
  ]);

  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

  // Reset Filters
  const handleResetFilters = () => {
    setTimeRange('this_month');
    setStartDate('');
    setEndDate('');
    setSelectedCompany('ALL');
    setSelectedRequester('ALL');
    setSelectedTeam('ALL');
    setSelectedTechnician('ALL');
    setSelectedCategory('ALL');
    setSelectedPriority('ALL');
    setSelectedStatus('ALL');
    setTableSearch('');
  };

  // Filtered Requester options based on selected company
  const availableRequesters = useMemo(() => {
    if (!data?.filterOptions?.allUsers) return [];
    return data.filterOptions.allUsers;
  }, [data]);

  // Filtered Table Tickets
  const filteredTickets = useMemo(() => {
    if (!data?.tickets) return [];
    if (!tableSearch.trim()) return data.tickets;

    const term = tableSearch.toLowerCase();
    return data.tickets.filter((t) => {
      return (
        t.ticketNumber.toLowerCase().includes(term) ||
        t.title.toLowerCase().includes(term) ||
        (t.companyName && t.companyName.toLowerCase().includes(term)) ||
        (t.createdBy?.fullName && t.createdBy.fullName.toLowerCase().includes(term)) ||
        (t.assignedTo?.fullName && t.assignedTo.fullName.toLowerCase().includes(term)) ||
        (t.team?.name && t.team.name.toLowerCase().includes(term)) ||
        (t.asset?.name && t.asset.name.toLowerCase().includes(term)) ||
        (t.asset?.assetTag && t.asset.assetTag.toLowerCase().includes(term))
      );
    });
  }, [data, tableSearch]);

  // Export to Excel (Lazy loaded)
  const handleExportExcel = async () => {
    if (!data) return;

    try {
      const ExcelJS = await import('exceljs');
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'SIMPLY IT Platform';
      workbook.created = new Date();

      // Sheet 1: Overview & KPIs
      const wsOverview = workbook.addWorksheet(isEn ? 'Overview & KPIs' : 'Tổng Quan & KPIs');
      wsOverview.columns = [
        { header: isEn ? 'Operational Metric' : 'Chỉ Số Vận Hành', key: 'metric', width: 35 },
        { header: isEn ? 'Value' : 'Giá Trị', key: 'value', width: 25 },
      ];

      wsOverview.addRow({ metric: isEn ? 'Total recorded tickets' : 'Tổng số Ticket ghi nhận', value: data.summary.totalTickets });
      wsOverview.addRow({ metric: isEn ? 'Open tickets' : 'Ticket đang mở (Open)', value: data.summary.openTickets });
      wsOverview.addRow({ metric: isEn ? 'In progress tickets' : 'Ticket đang xử lý (In Progress)', value: data.summary.inProgressTickets });
      wsOverview.addRow({ metric: isEn ? 'Waiting tickets' : 'Ticket chờ phản hồi (Waiting)', value: data.summary.waitingTickets });
      wsOverview.addRow({ metric: isEn ? 'Resolved tickets' : 'Ticket đã giải quyết (Resolved)', value: data.summary.resolvedTickets });
      wsOverview.addRow({ metric: isEn ? 'Closed tickets' : 'Ticket đã đóng (Closed)', value: data.summary.closedTickets });
      wsOverview.addRow({ metric: isEn ? 'SLA compliance rate (%)' : 'Tỷ lệ đạt SLA (%)', value: `${data.summary.slaComplianceRate}%` });
      wsOverview.addRow({ metric: isEn ? 'SLA breached count' : 'Số ticket vi phạm quá hạn SLA', value: data.summary.breachedSlaCount });
      wsOverview.addRow({ metric: isEn ? 'Average resolution time (MTTR)' : 'Thời gian xử lý trung bình (MTTR)', value: `${data.summary.avgResolutionHours} ${isEn ? 'Hours' : 'Giờ'}` });
      wsOverview.addRow({ metric: isEn ? 'AI auto-routed tickets' : 'Số ticket AI tự động phân luồng', value: data.summary.aiAutoRoutedCount });
      wsOverview.addRow({ metric: isEn ? 'Total incidents' : 'Tổng số sự cố Incident', value: data.incidentsSummary.totalIncidents });
      wsOverview.addRow({ metric: isEn ? 'Critical incidents (P1/P2)' : 'Sự cố khẩn cấp (P1/P2)', value: data.incidentsSummary.criticalIncidents });

      // Sheet 2: Ticket Details
      const wsTickets = workbook.addWorksheet(isEn ? 'Ticket Details' : 'Chi Tiết Tickets');
      wsTickets.columns = [
        { header: isEn ? 'Ticket ID' : 'Mã Ticket', key: 'ticketNumber', width: 16 },
        { header: isEn ? 'Title' : 'Tiêu Đề', key: 'title', width: 35 },
        { header: isEn ? 'Company' : 'Công Ty', key: 'companyName', width: 25 },
        { header: isEn ? 'Requester' : 'Người Gửi', key: 'requester', width: 22 },
        { header: isEn ? 'Department' : 'Phòng Ban', key: 'department', width: 20 },
        { header: isEn ? 'Assigned Team' : 'Team Phụ Trách', key: 'team', width: 22 },
        { header: isEn ? 'Assignee (IT)' : 'Người Xử Lý (IT)', key: 'assignee', width: 22 },
        { header: isEn ? 'Category' : 'Danh Mục', key: 'category', width: 18 },
        { header: isEn ? 'Priority' : 'Mức Độ Ưu Tiên', key: 'priority', width: 15 },
        { header: isEn ? 'Status' : 'Trạng Thái', key: 'status', width: 16 },
        { header: isEn ? 'Related Asset' : 'Thiết Bị Liên Quan', key: 'asset', width: 22 },
        { header: isEn ? 'Created At' : 'Ngày Tạo', key: 'createdAt', width: 18 },
        { header: isEn ? 'SLA Deadline' : 'Hạn SLA', key: 'slaDeadline', width: 18 },
        { header: isEn ? 'Resolved At' : 'Ngày Giải Quyết', key: 'resolvedAt', width: 18 },
      ];

      data.tickets.forEach((t) => {
        wsTickets.addRow({
          ticketNumber: t.ticketNumber,
          title: t.title,
          companyName: t.companyName || (isEn ? 'General' : 'Công ty chung'),
          requester: t.createdBy?.fullName || 'N/A',
          department: t.createdBy?.department || 'N/A',
          team: t.team?.name || (isEn ? 'Unassigned' : 'Chưa phân team'),
          assignee: t.assignedTo?.fullName || (isEn ? 'Unassigned' : 'Chưa gán'),
          category: getCategoryName(t.category, language),
          priority: getPriorityInfo(t.priority, language).label,
          status: getStatusInfo(t.status, language).label,
          asset: t.asset ? `[${t.asset.assetTag}] ${t.asset.name}` : '—',
          createdAt: new Date(t.createdAt).toLocaleString(isEn ? 'en-US' : 'vi-VN'),
          slaDeadline: t.slaDeadline ? new Date(t.slaDeadline).toLocaleString(isEn ? 'en-US' : 'vi-VN') : '—',
          resolvedAt: t.resolvedAt ? new Date(t.resolvedAt).toLocaleString(isEn ? 'en-US' : 'vi-VN') : '—',
        });
      });

      // Sheet 3: Company & Staff Breakdown
      const wsCompany = workbook.addWorksheet(isEn ? 'By Company' : 'Theo Công Ty');
      wsCompany.columns = [
        { header: isEn ? 'Company Name' : 'Tên Công Ty', key: 'companyName', width: 30 },
        { header: isEn ? 'Total Tickets' : 'Tổng Ticket', key: 'total', width: 15 },
        { header: isEn ? 'Resolved' : 'Đã Xử Lý Xong', key: 'resolved', width: 18 },
        { header: isEn ? 'SLA Breached' : 'Vi Phạm SLA', key: 'breachedSla', width: 16 },
        { header: isEn ? 'Resolution Rate (%)' : 'Tỷ Lệ Giải Quyết (%)', key: 'rate', width: 20 },
      ];

      data.companyStats.forEach((c) => {
        wsCompany.addRow({
          companyName: c.companyName,
          total: c.total,
          resolved: c.resolved,
          breachedSla: c.breachedSla,
          rate: `${c.resolutionRate}%`,
        });
      });

      // Sheet 4: IT Team Report
      const wsTeams = workbook.addWorksheet(isEn ? 'By IT Team' : 'Theo Team IT');
      wsTeams.columns = [
        { header: isEn ? 'Team Code' : 'Mã Team', key: 'teamCode', width: 15 },
        { header: isEn ? 'Team Name' : 'Tên Team IT', key: 'teamName', width: 28 },
        { header: isEn ? 'Total Received' : 'Tổng Nhận', key: 'total', width: 15 },
        { header: isEn ? 'Resolved' : 'Đã Hoàn Tất', key: 'resolved', width: 16 },
        { header: isEn ? 'On Time SLA' : 'Đúng Hạn SLA', key: 'onTimeSla', width: 16 },
        { header: isEn ? 'Breached SLA' : 'Trễ Hạn SLA', key: 'breachedSla', width: 15 },
        { header: isEn ? 'SLA Rate (%)' : 'Tỷ Lệ SLA (%)', key: 'slaRate', width: 16 },
        { header: isEn ? 'Avg Hours' : 'Thời Gian TB (Giờ)', key: 'avgHours', width: 20 },
      ];

      data.teamStats.forEach((team) => {
        wsTeams.addRow({
          teamCode: team.teamCode,
          teamName: team.teamName,
          total: team.total,
          resolved: team.resolved,
          onTimeSla: team.onTimeSla,
          breachedSla: team.breachedSla,
          slaRate: `${team.slaRate}%`,
          avgHours: team.avgHours,
        });
      });

      // Sheet 5: Technician Report
      const wsTech = workbook.addWorksheet(isEn ? 'By Technician' : 'Theo Kỹ Thuật Viên IT');
      wsTech.columns = [
        { header: isEn ? 'IT Staff Name' : 'Họ và Tên IT', key: 'fullName', width: 25 },
        { header: 'Email', key: 'email', width: 28 },
        { header: isEn ? 'Department' : 'Phòng Ban', key: 'department', width: 20 },
        { header: isEn ? 'Total Tickets' : 'Tổng Ticket', key: 'total', width: 15 },
        { header: isEn ? 'Resolved' : 'Đã Giải Quyết', key: 'resolved', width: 16 },
        { header: isEn ? 'Met SLA' : 'Đạt SLA', key: 'onTimeSla', width: 15 },
        { header: isEn ? 'Breached SLA' : 'Vi Phạm SLA', key: 'breachedSla', width: 15 },
        { header: isEn ? 'SLA Rate (%)' : 'Tỷ Lệ SLA (%)', key: 'slaRate', width: 16 },
        { header: isEn ? 'Avg Hours' : 'Thời Gian TB (Giờ)', key: 'avgHours', width: 20 },
      ];

      data.technicianStats.forEach((tech) => {
        wsTech.addRow({
          fullName: tech.fullName,
          email: tech.email,
          department: tech.department,
          total: tech.total,
          resolved: tech.resolved,
          onTimeSla: tech.onTimeSla,
          breachedSla: tech.breachedSla,
          slaRate: `${tech.slaRate}%`,
          avgHours: tech.avgHours,
        });
      });

      // Generate Buffer and Download
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `IT_Support_Report_${new Date().toISOString().split('T')[0]}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (e: any) {
      alert((isEn ? 'Error exporting Excel: ' : 'Lỗi xuất file Excel: ') + e.message);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* ==================== 1. TOP HEADER ==================== */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/60 flex items-center justify-center text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <span>{isJa ? 'ITSMダッシュボード＆テクニカルサポートレポート' : (isEn ? 'ITSM Dashboard & Technical Support Reports' : 'Dashboard & Báo Cáo Hỗ Trợ Kỹ Thuật')}</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 font-bold border border-blue-200 dark:border-blue-800">
                  ITSM Analytics
                </span>
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isJa
                  ? '多角的な分析: チケット全体、インシデント、ITチーム実績、グループ会社別集計'
                  : (isEn
                  ? 'Multi-dimensional analytics: All Tickets, Incidents, IT Team Performance & Corporate Entities'
                  : 'Thống kê đa chiều: Toàn bộ Ticket, Sự cố Incidents, Hiệu suất Team IT & Từng Công ty thành viên')}
              </p>
            </div>
          </div>
        </div>

        {/* Top Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/tickets"
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <LifeBuoy className="w-3.5 h-3.5" />
            <span>{isJa ? 'チケット一覧' : (isEn ? 'Ticket List' : 'Danh Sách Ticket')}</span>
          </Link>

          <button
            type="button"
            onClick={fetchReportData}
            disabled={loading}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors flex items-center gap-1.5 cursor-pointer"
            title={isEn ? "Refresh data" : "Làm mới dữ liệu"}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>{isJa ? '更新' : (isEn ? 'Refresh' : 'Làm Mới')}</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors flex items-center gap-1.5 cursor-pointer"
            title={isEn ? "Print or save as PDF" : "In hoặc lưu PDF"}
          >
            <Printer className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
            <span>{isJa ? '印刷' : (isEn ? 'Print Report' : 'In Báo Cáo')}</span>
          </button>

          <button
            type="button"
            onClick={handleExportExcel}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 transition-all flex items-center gap-2 cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>{isJa ? 'Excelエクスポート (.xlsx)' : (isEn ? 'Export Full Excel (.xlsx)' : 'Xuất Excel Đầy Đủ (.xlsx)')}</span>
          </button>
        </div>
      </div>

      {/* ==================== 2. ADVANCED MULTI-DIMENSIONAL FILTERS ==================== */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-blue-600" />
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 dark:text-white">
              {isJa ? '詳細分析フィルター' : (isEn ? 'Multi-Dimensional Analytics Filters' : 'Bộ Lọc Phân Tích Đa Chiều')}
            </h3>
          </div>
          <button
            type="button"
            onClick={handleResetFilters}
            className="text-xs font-bold text-slate-500 hover:text-blue-600 flex items-center gap-1 cursor-pointer transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            <span>{isJa ? 'デフォルトに戻す' : (isEn ? 'Reset Defaults' : 'Khôi Phục Mặc Định')}</span>
          </button>
        </div>

        {/* Quick Time Range Selector */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-bold text-slate-500 mr-1 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" /> {isJa ? '集計期間:' : (isEn ? 'Time range:' : 'Thời gian:')}
          </span>
          {[
            { id: 'today', labelVi: 'Hôm nay', labelEn: 'Today', labelJa: '今日' },
            { id: 'this_week', labelVi: 'Tuần này', labelEn: 'This Week', labelJa: '今週' },
            { id: 'this_month', labelVi: 'Tháng này', labelEn: 'This Month', labelJa: '今月' },
            { id: 'this_quarter', labelVi: 'Quý này', labelEn: 'This Quarter', labelJa: '今四半期' },
            { id: 'this_year', labelVi: 'Năm nay', labelEn: 'This Year', labelJa: '今年' },
            { id: 'all', labelVi: 'Tất cả', labelEn: 'All Time', labelJa: '全期間' },
            { id: 'custom', labelVi: 'Tùy chỉnh', labelEn: 'Custom', labelJa: 'カスタム' },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTimeRange(item.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                timeRange === item.id
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {isJa ? item.labelJa : (isEn ? item.labelEn : item.labelVi)}
            </button>
          ))}

          {timeRange === 'custom' && (
            <div className="flex items-center gap-1.5 ml-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-2.5 py-1 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
              />
              <span className="text-xs text-slate-400">{isEn ? 'to' : 'đến'}</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-2.5 py-1 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
              />
            </div>
          )}
        </div>

        {/* Dropdowns Grid (6 Filter Columns) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 pt-1">
          {/* 1. Lọc theo Công Ty */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1">
              <Building className="w-3 h-3 text-blue-500" />
              <span>{isJa ? '対象会社' : (isEn ? 'Company' : 'Công Ty Hỗ Trợ')}</span>
            </label>
            <select
              value={selectedCompany}
              onChange={(e) => {
                setSelectedCompany(e.target.value);
                setSelectedRequester('ALL');
              }}
              className="w-full text-xs py-1.5 px-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="ALL">{isJa ? '🏢 すべての会社' : (isEn ? '🏢 All Companies' : '🏢 Tất cả Công ty')}</option>
              {data?.filterOptions?.companies.map((comp) => (
                <option key={comp} value={comp}>
                  {comp}
                </option>
              ))}
            </select>
          </div>

          {/* 2. Lọc theo Nhân Sự Công Ty */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1">
              <UserIcon className="w-3 h-3 text-cyan-500" />
              <span>{isJa ? '申請者' : (isEn ? 'Requester' : 'Nhân Sự Yêu Cầu')}</span>
            </label>
            <select
              value={selectedRequester}
              onChange={(e) => setSelectedRequester(e.target.value)}
              className="w-full text-xs py-1.5 px-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="ALL">{isJa ? '👤 すべての申請者' : (isEn ? '👤 All Requesters' : '👤 Tất cả nhân sự')}</option>
              {availableRequesters.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.fullName} {u.department ? `(${u.department})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* 3. Lọc theo Team IT Phụ Trách */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1">
              <Users className="w-3 h-3 text-purple-500" />
              <span>{isJa ? '担当ITチーム' : (isEn ? 'Assigned IT Team' : 'Team IT Phụ Trách')}</span>
            </label>
            <select
              value={selectedTeam}
              onChange={(e) => setSelectedTeam(e.target.value)}
              className="w-full text-xs py-1.5 px-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="ALL">{isJa ? '👥 すべてのチーム' : (isEn ? '👥 All IT Teams' : '👥 Tất cả Team IT')}</option>
              {data?.filterOptions?.teams.map((t) => (
                <option key={t.id} value={t.id}>
                  [{t.code}] {t.name}
                </option>
              ))}
            </select>
          </div>

          {/* 4. Lọc theo Kỹ Thuật Viên Xử Lý */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1">
              <Shield className="w-3 h-3 text-indigo-500" />
              <span>{isJa ? '対応技術員' : (isEn ? 'IT Technician' : 'Kỹ Thuật Viên IT')}</span>
            </label>
            <select
              value={selectedTechnician}
              onChange={(e) => setSelectedTechnician(e.target.value)}
              className="w-full text-xs py-1.5 px-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="ALL">{isJa ? '🛡️ すべての技術員' : (isEn ? '🛡️ All Technicians' : '🛡️ Tất cả kỹ thuật viên')}</option>
              {data?.filterOptions?.technicians.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.fullName} ({u.email})
                </option>
              ))}
            </select>
          </div>

          {/* 5. Lọc theo Danh Mục */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1">
              <Layers className="w-3 h-3 text-amber-500" />
              <span>{isJa ? 'カテゴリー' : (isEn ? 'Category' : 'Phân Loại Sự Cố')}</span>
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full text-xs py-1.5 px-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="ALL">{isJa ? '📁 すべてのカテゴリ' : (isEn ? '📁 All Categories' : '📁 Tất cả danh mục')}</option>
              {['HARDWARE', 'SOFTWARE', 'NETWORK', 'LICENSE', 'ACCESS_REQUEST', 'OTHER'].map((catKey) => (
                <option key={catKey} value={catKey}>
                  {getCategoryName(catKey, language)}
                </option>
              ))}
            </select>
          </div>

          {/* 6. Lọc theo Mức Độ Ưu Tiên */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1">
              <Flame className="w-3 h-3 text-rose-500" />
              <span>{isJa ? '優先度' : (isEn ? 'Priority Level' : 'Mức Độ Ưu Tiên')}</span>
            </label>
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="w-full text-xs py-1.5 px-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="ALL">{isJa ? '⚡ すべての優先度' : (isEn ? '⚡ All Priorities' : '⚡ Tất cả ưu tiên')}</option>
              {['URGENT', 'HIGH', 'MEDIUM', 'LOW'].map((pKey) => (
                <option key={pKey} value={pKey}>
                  {getPriorityInfo(pKey, language).label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ==================== 3. EXECUTIVE KPI METRICS (8 TILES) ==================== */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {/* Tile 1: Tổng Tickets */}
        <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500 uppercase">{isJa ? '総チケット' : (isEn ? 'Total' : 'Tổng Vé')}</span>
            <div className="w-6 h-6 rounded-lg bg-blue-50 dark:bg-blue-950 flex items-center justify-center text-blue-600">
              <LifeBuoy className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl font-black text-slate-900 dark:text-white font-mono">
            {data?.summary.totalTickets || 0}
          </div>
          <div className="text-[9px] text-slate-400 font-medium">{isJa ? '期間内' : (isEn ? 'Tickets' : 'Trong kỳ')}</div>
        </div>

        {/* Tile 2: Đang Xử Lý & Chờ */}
        <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase">{isJa ? '対応中' : (isEn ? 'Active' : 'Đang Làm')}</span>
            <div className="w-6 h-6 rounded-lg bg-amber-50 dark:bg-amber-950 flex items-center justify-center text-amber-600">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl font-black text-amber-600 dark:text-amber-400 font-mono">
            {(data?.summary.openTickets || 0) + (data?.summary.inProgressTickets || 0) + (data?.summary.waitingTickets || 0)}
          </div>
          <div className="text-[9px] text-slate-400 font-medium">
            {data?.summary.openTickets || 0} {isJa ? '新規' : (isEn ? 'New' : 'Mới')} • {data?.summary.inProgressTickets || 0} {isJa ? '着手' : (isEn ? 'Active' : 'Làm')}
          </div>
        </div>

        {/* Tile 3: Đã Hoàn Tất */}
        <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase">{isJa ? '解決済み' : (isEn ? 'Resolved' : 'Đã Xử Lý')}</span>
            <div className="w-6 h-6 rounded-lg bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
            {(data?.summary.resolvedTickets || 0) + (data?.summary.closedTickets || 0)}
          </div>
          <div className="text-[9px] text-slate-400 font-medium">
            {isJa ? '完了率:' : (isEn ? 'Rate:' : 'Tỷ lệ:')} {data?.summary.totalTickets
              ? Math.round((((data.summary.resolvedTickets + data.summary.closedTickets) / data.summary.totalTickets) * 100))
              : 0}%
          </div>
        </div>

        {/* Tile 4: Tỷ Lệ Đạt SLA */}
        <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 uppercase">SLA</span>
            <div className="w-6 h-6 rounded-lg bg-purple-50 dark:bg-purple-950 flex items-center justify-center text-purple-600">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl font-black text-purple-600 dark:text-purple-400 font-mono">
            {data?.summary.slaComplianceRate || 100}%
          </div>
          <div className="text-[9px] text-rose-500 font-bold">
            {data?.summary.breachedSlaCount || 0} {isJa ? '件 期限超過' : (isEn ? 'breached' : 'trễ hạn')}
          </div>
        </div>

        {/* Tile 5: MTTR (Thời gian xử lý TB) */}
        <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-cyan-600 dark:text-cyan-400 uppercase">MTTR</span>
            <div className="w-6 h-6 rounded-lg bg-cyan-50 dark:bg-cyan-950 flex items-center justify-center text-cyan-600">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl font-black text-cyan-600 dark:text-cyan-400 font-mono">
            {data?.summary.avgResolutionHours || 0}h
          </div>
          <div className="text-[9px] text-slate-400 font-medium">{isJa ? '時間/件' : (isEn ? 'Hours/ticket' : 'Giờ/ticket')}</div>
        </div>

        {/* Tile 6: Giờ Công Thực Tế (Time Tracking) */}
        <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase">{isJa ? '実作業工数' : (isEn ? 'Work Hours' : 'Giờ Công')}</span>
            <div className="w-6 h-6 rounded-lg bg-amber-50 dark:bg-amber-950 flex items-center justify-center text-amber-600">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl font-black text-amber-600 dark:text-amber-400 font-mono">
            {data?.summary.totalActualSpentHours || 0}h
          </div>
          <div className="text-[9px] text-slate-400 font-medium">{data?.summary.totalActualSpentMinutes || 0} {isJa ? '分 記録' : (isEn ? 'mins logged' : 'phút ghi nhận')}</div>
        </div>

        {/* Tile 7: Đánh Giá CSAT */}
        <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-yellow-600 dark:text-yellow-400 uppercase">CSAT</span>
            <div className="w-6 h-6 rounded-lg bg-yellow-50 dark:bg-yellow-950 flex items-center justify-center text-yellow-600">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl font-black text-yellow-600 dark:text-yellow-400 font-mono">
            {data?.summary.avgCsatRating || 5.0}★
          </div>
          <div className="text-[9px] text-slate-400 font-medium">{data?.summary.csatSatisfactionRate || 100}% {isJa ? '満足' : (isEn ? 'satisfied' : 'hài lòng')}</div>
        </div>

        {/* Tile 8: AI Auto-Routed */}
        <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase">{isJa ? 'AI自動振分' : (isEn ? 'AI Routed' : 'AI Định Tuyến')}</span>
            <div className="w-6 h-6 rounded-lg bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center text-indigo-600">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl font-black text-indigo-600 dark:text-indigo-400 font-mono">
            {data?.summary.aiAutoRoutedCount || 0}
          </div>
          <div className="text-[9px] text-indigo-500 font-semibold">{isJa ? '自動化' : (isEn ? 'Automated' : 'Tự động hóa')}</div>
        </div>
      </div>

      {/* ==================== 4. NAVIGATION TABS ==================== */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-2 overflow-x-auto pb-1">
        {[
          { id: 'executive', labelVi: '👑 Báo Cáo & KPI Lãnh Đạo', labelEn: '👑 Executive Briefing & KPI', labelJa: '👑 エグゼクティブKPIサマリー', icon: Sparkles },
          { id: 'overview', labelVi: '📊 Tổng Quan & Phân Loại', labelEn: '📊 Overview & Breakdown', labelJa: '📊 概要＆カテゴリ分析', icon: BarChart3 },
          { id: 'company', labelVi: '🏢 Báo Cáo Theo Công Ty & Nhân Sự', labelEn: '🏢 By Company & Staff', labelJa: '🏢 会社・社員別レポート', icon: Building, badge: data?.companyStats.length },
          { id: 'team', labelVi: '👥 Báo Cáo Theo Team IT & Nhân Viên', labelEn: '👥 By IT Team & Tech', labelJa: '👥 ITチーム・技術員別', icon: Users, badge: data?.teamStats.length },
          { id: 'incidents', labelVi: '⚠️ Sự Cố & Vấn Đề (Incidents)', labelEn: '⚠️ Major Incidents', labelJa: '⚠️ 重大インシデント', icon: AlertTriangle, badge: data?.incidentsSummary.totalIncidents },
          { id: 'tickets', labelVi: '📋 Danh Sách Chi Tiết Tickets', labelEn: '📋 Ticket Explorer', labelJa: '📋 チケット詳細エクスプローラー', icon: LifeBuoy, badge: data?.tickets.length },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2.5 font-extrabold text-xs rounded-2xl transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            <span>{isJa ? tab.labelJa : (isEn ? tab.labelEn : tab.labelVi)}</span>
            {tab.badge !== undefined && tab.badge > 0 && (
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                  activeTab === tab.id ? 'bg-white text-blue-700' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ==================== TAB 0: EXECUTIVE BRIEFING (👑 Enterprise) ==================== */}
      {activeTab === 'executive' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* Executive Summary Card (Premium Dark Gradient, Crisp High-Contrast Typography) */}
          <div className="bg-slate-900 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-7 rounded-3xl border border-indigo-500/40 shadow-2xl space-y-5">
            <div className="flex items-center justify-between flex-wrap gap-4 border-b border-indigo-800/50 pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="p-2 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-white font-black text-sm shadow-md">👑</span>
                  <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white drop-shadow-xs">
                    {isJa
                      ? 'IT運用サマリー＆SLAパフォーマンス分析'
                      : (isEn ? 'Executive IT Operations & SLA Briefing' : 'Báo Cáo Tóm Tắt Vận Hành IT & Đánh Giá KPI')}
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/40 text-[10px] font-extrabold uppercase tracking-wider">
                    Enterprise
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-indigo-200 font-medium max-w-3xl leading-relaxed">
                  {isJa
                    ? '総合パフォーマンススコア、SLA達成ベンチマーク、再発障害機器、および実作業工数の集計。'
                    : (isEn
                    ? 'Synthesized performance score, SLA compliance benchmark, chronic asset defects, and resource time tracking.'
                    : 'Báo cáo tổng hợp hiệu suất, mức độ đạt SLA cam kết, thiết bị hỏng kinh niên và thời lượng làm việc thực tế.')}
                </p>
              </div>

              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-extrabold rounded-2xl shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-2 cursor-pointer hover:scale-102 active:scale-98"
              >
                <Printer className="w-4 h-4" />
                <span>{isJa ? 'レポートを印刷' : (isEn ? 'Print Executive Report' : 'In Báo Cáo Giao Ban')}</span>
              </button>
            </div>

            {/* 4 Main Executive Focus Blocks */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* SLA Benchmark */}
              <div className="p-4 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/15 space-y-2 backdrop-blur-md transition-all">
                <div className="text-[11px] font-extrabold text-indigo-200 flex items-center justify-between">
                  <span>{isJa ? 'SLA達成率ベンチマーク' : (isEn ? 'SLA COMPLIANCE RATE' : 'TỶ LỆ ĐẠT SLA CAM KẾT')}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-indigo-500/40 text-indigo-100 font-bold border border-indigo-400/30">
                    {isJa ? '目標 ≥95%' : (isEn ? 'Target ≥95%' : 'Mục tiêu ≥95%')}
                  </span>
                </div>
                <div className="text-3xl font-black font-mono text-emerald-400">
                  {data?.summary.slaComplianceRate || 100}%
                </div>
                <div className="text-[11px] text-slate-200 font-medium">
                  {data?.summary.onTimeSlaCount || 0} {isJa ? '件 期限内' : (isEn ? 'on-time' : 'vé đúng hạn')} • <span className="text-rose-400 font-bold">{data?.summary.breachedSlaCount || 0} {isJa ? '件 期限超過' : (isEn ? 'breached' : 'vé trễ hạn')}</span>
                </div>
              </div>

              {/* MTTR */}
              <div className="p-4 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/15 space-y-2 backdrop-blur-md transition-all">
                <div className="text-[11px] font-extrabold text-cyan-200 flex items-center justify-between">
                  <span>{isJa ? 'MTTR (平均解決時間)' : (isEn ? 'MTTR (AVG RESOLUTION)' : 'MTTR (THỜI GIAN XỬ LÝ TB)')}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-cyan-500/40 text-cyan-100 font-bold border border-cyan-400/30">
                    {isJa ? '基準 <4h' : (isEn ? 'Standard <4h' : 'Chuẩn <4h')}
                  </span>
                </div>
                <div className="text-3xl font-black font-mono text-cyan-300">
                  {data?.summary.avgResolutionHours || 0}h
                </div>
                <div className="text-[11px] text-slate-200 font-medium">
                  {(data?.summary.avgResolutionHours || 0) <= 4
                    ? (isJa ? '✅ 迅速対応基準を達成' : (isEn ? '✅ Fast response met standard' : '✅ Đạt chuẩn phản ứng nhanh'))
                    : (isJa ? '⚠️ 解決時間の短縮が必要' : (isEn ? '⚠️ Needs resolution optimization' : '⚠️ Cần rút ngắn thời gian xử lý'))}
                </div>
              </div>

              {/* Time Spent */}
              <div className="p-4 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/15 space-y-2 backdrop-blur-md transition-all">
                <div className="text-[11px] font-extrabold text-amber-200 flex items-center justify-between">
                  <span>{isJa ? 'IT作業総工数 (実績ログ)' : (isEn ? 'TOTAL IT WORK HOURS' : 'TỔNG GIỜ CÔNG IT (LOG WORK)')}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-500/40 text-amber-100 font-bold border border-amber-400/30">
                    {isJa ? '工数追跡' : (isEn ? 'Time Tracking' : 'Ghi nhận giờ')}
                  </span>
                </div>
                <div className="text-3xl font-black font-mono text-amber-300">
                  {data?.summary.totalActualSpentHours || 0}h
                </div>
                <div className="text-[11px] text-slate-200 font-medium">
                  {isJa
                    ? `技術員による記録累計 ${data?.summary.totalActualSpentMinutes || 0}分`
                    : (isEn
                    ? `Total ${data?.summary.totalActualSpentMinutes || 0} mins logged by technicians`
                    : `Tổng ${data?.summary.totalActualSpentMinutes || 0} phút kỹ thuật viên ghi nhận`)}
                </div>
              </div>

              {/* CSAT Rating */}
              <div className="p-4 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/15 space-y-2 backdrop-blur-md transition-all">
                <div className="text-[11px] font-extrabold text-rose-200 flex items-center justify-between">
                  <span>{isJa ? '顧客満足度評価 (CSAT)' : (isEn ? 'CSAT SATISFACTION SCORE' : 'ĐÁNH GIÁ HÀI LÒNG (CSAT)')}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-rose-500/40 text-rose-100 font-bold border border-rose-400/30">
                    {isJa ? '利用者評価' : (isEn ? 'Users / Staff' : 'Khách hàng')}
                  </span>
                </div>
                <div className="text-3xl font-black font-mono text-yellow-300">
                  {data?.summary.avgCsatRating || 5.0} <span className="text-base text-slate-200 font-normal">/ 5.0 ⭐</span>
                </div>
                <div className="text-[11px] text-slate-200 font-medium">
                  {data?.summary.csatSatisfactionRate || 100}% {isJa ? '満足' : (isEn ? 'satisfied' : 'hài lòng')} ({data?.summary.totalRatedTickets || 0} {isJa ? '件の投票' : (isEn ? 'ratings' : 'lượt bầu')})
                </div>
              </div>
            </div>
          </div>

          {/* Section: Chronic Faulty Assets & Top Tech Performers */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Box 1: Chronic Faulty Assets (Top Thiết Bị Hay Hỏng Vặt Nhất) */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  <span>{isJa ? '再発障害・故障頻発デバイス Top' : (isEn ? 'Top Chronic Faulty Assets' : 'Top Thiết Bị Hay Phát Sinh Sự Cố Nhất')}</span>
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300 text-xs font-bold border border-rose-200 dark:border-rose-800">
                  {data?.topFaultyAssets?.length || 0} {isJa ? '台' : (isEn ? 'devices' : 'thiết bị')}
                </span>
              </div>

              {data?.topFaultyAssets && data.topFaultyAssets.length > 0 ? (
                <div className="space-y-2.5">
                  {data.topFaultyAssets.map((asset, idx) => (
                    <div
                      key={asset.id}
                      className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/60 flex items-start justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="w-5 h-5 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 font-extrabold text-[10px] flex items-center justify-center">
                            #{idx + 1}
                          </span>
                          <span className="font-mono font-extrabold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950 px-2 py-0.2 rounded-md border border-blue-200 dark:border-blue-800">
                            {asset.assetTag}
                          </span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">{asset.name}</span>
                          {asset.companyName && (
                            <span className="text-[10px] text-slate-500">🏢 {asset.companyName}</span>
                          )}
                        </div>
                        {asset.latestTicketTitle && (
                          <p className="text-[11px] text-slate-500 line-clamp-1 italic">
                            {isJa ? '直近のインシデント' : (isEn ? 'Latest issue' : 'Sự cố gần nhất')}: &quot;{asset.latestTicketTitle}&quot;
                          </p>
                        )}
                      </div>

                      <div className="text-right shrink-0">
                        <span className="px-2 py-0.5 rounded-lg bg-rose-600 text-white font-extrabold text-xs">
                          {asset.ticketCount} {isEn ? 'tickets' : 'lần lỗi'}
                        </span>
                        {asset.openCount > 0 && (
                          <div className="text-[10px] text-amber-600 font-bold pt-1">
                            {asset.openCount} {isEn ? 'still open' : 'đang sửa'}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-slate-400 text-xs italic">
                  {isJa ? 'この集計期間において再発障害機器は検出されませんでした。' : (isEn ? 'No recurring device faults detected in this period.' : 'Chưa phát hiện thiết bị nào bị lỗi lặp lại trong kỳ này.')}
                </div>
              )}
            </div>

            {/* Box 2: Top Technician Performers (Xếp Hạng Kỹ Thuật Viên IT) */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-emerald-600" />
                  <span>{isEn ? 'Top IT Technicians Performance' : 'Xếp Hạng Hiệu Suất Kỹ Thuật Viên IT'}</span>
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 text-xs font-bold border border-emerald-200 dark:border-emerald-800">
                  {data?.technicianStats.length || 0} nhân sự
                </span>
              </div>

              <div className="space-y-2.5">
                {data?.technicianStats.slice(0, 6).map((tech, idx) => (
                  <div
                    key={tech.userId}
                    className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/60 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-extrabold text-[10px] flex items-center justify-center">
                        #{idx + 1}
                      </span>
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white">{tech.fullName}</div>
                        <div className="text-[10px] text-slate-500">
                          {tech.department || 'IT Support'} • {tech.email}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-right">
                      <div>
                        <div className="font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
                          {tech.resolved}/{tech.total}
                        </div>
                        <div className="text-[10px] text-slate-400">{isEn ? 'Resolved' : 'Đã xử lý'}</div>
                      </div>

                      <div>
                        <div className="font-extrabold text-purple-600 dark:text-purple-400 font-mono">
                          {tech.slaRate}%
                        </div>
                        <div className="text-[10px] text-slate-400">SLA</div>
                      </div>

                      {tech.actualSpentHours !== undefined && tech.actualSpentHours > 0 && (
                        <div>
                          <div className="font-extrabold text-amber-600 dark:text-amber-400 font-mono">
                            {tech.actualSpentHours}h
                          </div>
                          <div className="text-[10px] text-slate-400">{isJa ? '実工数' : (isEn ? 'Work log' : 'Giờ công')}</div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== TAB 1: OVERVIEW & BREAKDOWNS ==================== */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 animate-in fade-in duration-150">
          {/* Box 1: Phân bổ theo Danh mục sự cố */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-600" />
                <span>{isJa ? 'カテゴリ別インシデント分布' : (isEn ? 'Breakdown by Incident Category' : 'Phân Bổ Theo Danh Mục Sự Cố')}</span>
              </h3>
              <span className="text-xs text-slate-400">
                {data?.categoryStats.length || 0} {isJa ? 'カテゴリ' : (isEn ? 'categories' : 'danh mục')}
              </span>
            </div>

            <div className="space-y-3">
              {data?.categoryStats.map((cat) => (
                <div key={cat.category} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-slate-800 dark:text-slate-200">
                      {getCategoryName(cat.category, language)}
                    </span>
                    <span className="text-slate-500 font-mono">
                      {cat.count} {isJa ? '件' : (isEn ? 'tickets' : 'ticket')} ({cat.percentage}%) • {isJa ? '平均:' : (isEn ? 'Avg:' : 'TB:')} {cat.avgHours}h
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all duration-500"
                      style={{ width: `${cat.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Box 2: Phân bổ theo Mức độ ưu tiên & SLA */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Flame className="w-4 h-4 text-rose-600" />
                <span>{isJa ? '緊急度・優先度別分布' : (isEn ? 'Urgency & Priority Distribution' : 'Mức Độ Khẩn Cấp & Ưu Tiên')}</span>
              </h3>
              <span className="text-xs text-slate-400">{isJa ? '4段階の優先度' : (isEn ? '4 priority tiers' : '4 cấp độ ưu tiên')}</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {['URGENT', 'HIGH', 'MEDIUM', 'LOW'].map((pKey) => {
                const count = data?.priorityStats[pKey] || 0;
                const total = data?.summary.totalTickets || 1;
                const pct = Math.round((count / total) * 100);
                const info = getPriorityInfo(pKey, language);

                return (
                  <div key={pKey} className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-black ${info.color}`}>{info.label}</span>
                      <span className="text-xs font-mono font-bold text-slate-500">{pct}%</span>
                    </div>
                    <div className="text-xl font-black font-mono text-slate-900 dark:text-white">{count}</div>
                    <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                      <div className={`h-full rounded-full ${pKey === 'URGENT' ? 'bg-rose-500' : pKey === 'HIGH' ? 'bg-amber-500' : 'bg-blue-500'}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ==================== TAB 2: COMPANY & EMPLOYEE BREAKDOWN ==================== */}
      {activeTab === 'company' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                  <Building className="w-5 h-5 text-blue-600" />
                  <span>{isJa ? 'グループ会社別パフォーマンスレポート' : (isEn ? 'Performance Report by Member Company' : 'Báo Cáo Hiệu Suất Theo Từng Công Ty Thành Viên')}</span>
                </h3>
                <p className="text-xs text-slate-500">
                  {isJa
                    ? '法人ごとのチケット受付数および申請上位者の詳細集計'
                    : (isEn
                    ? 'Detailed breakdown of ticket volume and top requesters per corporate entity'
                    : 'Thống kê chi tiết khối lượng yêu cầu và top nhân sự gửi ticket của từng đơn vị')}
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 dark:bg-slate-800/80 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="py-3 px-3">{isJa ? '会社名' : (isEn ? 'Company Name' : 'Tên Công Ty')}</th>
                    <th className="py-3 px-3 text-center">{isJa ? '総チケット数' : (isEn ? 'Total Tickets' : 'Tổng Ticket')}</th>
                    <th className="py-3 px-3 text-center">{isJa ? '解決済み' : (isEn ? 'Resolved' : 'Đã Xử Lý Xong')}</th>
                    <th className="py-3 px-3 text-center">{isJa ? '完了率' : (isEn ? 'Resolution Rate' : 'Tỷ Lệ Hoàn Thành')}</th>
                    <th className="py-3 px-3 text-center">{isJa ? 'SLA超過' : (isEn ? 'SLA Breached' : 'Vi Phạm SLA')}</th>
                    <th className="py-3 px-3 text-right">{isJa ? '操作' : (isEn ? 'Actions' : 'Thao Tác')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {data?.companyStats.map((comp) => {
                    const isExpanded = expandedCompany === comp.companyName;
                    return (
                      <React.Fragment key={comp.companyName}>
                        <tr className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors group">
                          <td className="py-3 px-3 font-bold text-slate-900 dark:text-white text-xs">
                            🏢 {comp.companyName}
                          </td>
                          <td className="py-3 px-3 text-center font-mono font-bold text-slate-900 dark:text-white">
                            {comp.total}
                          </td>
                          <td className="py-3 px-3 text-center font-mono font-bold text-emerald-600">
                            {comp.resolved}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <div className="inline-flex items-center gap-1.5">
                              <div className="w-16 h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${comp.resolutionRate}%` }} />
                              </div>
                              <span className="font-mono font-bold text-slate-700 dark:text-slate-300 text-[11px]">
                                {comp.resolutionRate}%
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-3 text-center font-mono font-bold text-rose-500">
                            {comp.breachedSla > 0 ? (isEn ? `${comp.breachedSla} tickets` : `${comp.breachedSla} ticket`) : '—'}
                          </td>
                          <td className="py-3 px-3 text-right">
                            <button
                              type="button"
                              onClick={() => setExpandedCompany(isExpanded ? null : comp.companyName)}
                              className="px-2.5 py-1 text-xs font-bold text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded-lg cursor-pointer transition-colors inline-flex items-center gap-1"
                            >
                              <span>{isExpanded ? (isJa ? '閉じる' : (isEn ? 'Hide Staff' : 'Ẩn Nhân Sự')) : (isJa ? '社員を見る' : (isEn ? 'View Staff' : 'Xem Nhân Sự'))}</span>
                              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                            </button>
                          </td>
                        </tr>

                        {/* Expandable Top Requesters of this company */}
                        {isExpanded && (
                          <tr>
                            <td colSpan={6} className="bg-slate-50/80 dark:bg-slate-800/40 p-4 border-y border-blue-100 dark:border-blue-900/50">
                              <div className="space-y-2">
                                <div className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                                  <Users className="w-3.5 h-3.5 text-blue-600" />
                                  <span>
                                    {isJa
                                      ? `${comp.companyName} の最多申請社員 Top:`
                                      : (isEn
                                      ? `Top Requesters in ${comp.companyName}:`
                                      : `Top Nhân Sự Gửi Yêu Cầu Nhiều Nhất Thuộc ${comp.companyName}:`)}
                                  </span>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                                  {comp.topRequesters.map((req) => (
                                    <div key={req.id} className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                                      <div className="space-y-0.5">
                                        <div className="font-bold text-xs text-slate-900 dark:text-white">👤 {req.fullName}</div>
                                        <div className="text-[10px] text-slate-400">{isJa ? '部署:' : (isEn ? 'Dept:' : 'Phòng:')} {req.department}</div>
                                      </div>
                                      <span className="font-mono font-black text-xs px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                        {req.count} {isJa ? '件' : (isEn ? 'tickets' : 'ticket')}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==================== TAB 3: TEAM & TECHNICIAN PERFORMANCE ==================== */}
      {activeTab === 'team' && (
        <div className="space-y-5 animate-in fade-in duration-150">
          {/* Section 1: Team IT Stats */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-600" />
                <span>{isJa ? 'ITサポートチーム別運用実績' : (isEn ? 'Operational Performance by IT Support Team' : 'Hiệu Suất Vận Hành Từng Team IT (Support Teams)')}</span>
              </h3>
              <p className="text-xs text-slate-500">
                {isJa
                  ? 'チームごとの受付件数、解決率、およびSLA遵守状況'
                  : (isEn
                  ? 'Ticket volume, resolution rate and SLA compliance by team'
                  : 'Khối lượng ticket tiếp nhận, tỷ lệ giải quyết và tuân thủ cam kết SLA theo đội nhóm')}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {data?.teamStats.map((team) => (
                <div key={team.teamId} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-700 pb-2">
                    <div>
                      <h4 className="font-extrabold text-xs text-slate-900 dark:text-white">{team.teamName}</h4>
                      <span className="font-mono text-[10px] text-slate-400">Code: {team.teamCode}</span>
                    </div>
                    <span className="text-xs font-black px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-mono">
                      {team.total} {isJa ? '件' : (isEn ? 'Tickets' : 'Ticket')}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="p-2 bg-white dark:bg-slate-900 rounded-xl">
                      <span className="text-[10px] text-slate-400 block">{isJa ? '完了' : (isEn ? 'Done' : 'Đã Xong')}</span>
                      <span className="font-mono font-bold text-emerald-600">{team.resolved}</span>
                    </div>
                    <div className="p-2 bg-white dark:bg-slate-900 rounded-xl">
                      <span className="text-[10px] text-slate-400 block">{isJa ? 'SLA達成' : (isEn ? 'SLA Met' : 'Đạt SLA')}</span>
                      <span className="font-mono font-bold text-purple-600">{team.slaRate}%</span>
                    </div>
                    <div className="p-2 bg-white dark:bg-slate-900 rounded-xl">
                      <span className="text-[10px] text-slate-400 block">MTTR</span>
                      <span className="font-mono font-bold text-cyan-600">{team.avgHours}h</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 2: Technician KPIs */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <Shield className="w-5 h-5 text-indigo-600" />
                <span>{isJa ? 'IT技術員別生産性＆KPI指標' : (isEn ? 'Productivity & KPI Metrics by IT Technician' : 'Năng Suất & Chỉ Số KPI Từng Kỹ Thuật Viên IT')}</span>
              </h3>
              <p className="text-xs text-slate-500">
                {isJa
                  ? '技術員ごとの担当業務量、対応スピード、および完了品質の評価'
                  : (isEn
                  ? 'Workload evaluation, turnaround speed and completion quality per technician'
                  : 'Đánh giá khối lượng công việc, tốc độ xử lý và chất lượng hoàn thành của từng cá nhân')}
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 dark:bg-slate-800/80 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="py-3 px-3">{isJa ? '技術員' : (isEn ? 'Technician' : 'Kỹ Thuật Viên')}</th>
                    <th className="py-3 px-3">{isJa ? 'メール＆部署' : (isEn ? 'Email & Department' : 'Email & Phòng Ban')}</th>
                    <th className="py-3 px-3 text-center">{isJa ? '総担当件数' : (isEn ? 'Assigned Total' : 'Tổng Tiếp Nhận')}</th>
                    <th className="py-3 px-3 text-center">{isJa ? '完了数' : (isEn ? 'Completed' : 'Đã Hoàn Tất')}</th>
                    <th className="py-3 px-3 text-center">{isJa ? 'SLA達成率' : (isEn ? 'SLA Compliance' : 'Tỷ Lệ Đạt SLA')}</th>
                    <th className="py-3 px-3 text-center">{isJa ? '平均時間 (MTTR)' : (isEn ? 'Avg Time (MTTR)' : 'Thời Gian TB (MTTR)')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {data?.technicianStats.map((tech) => (
                    <tr key={tech.userId} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="py-3 px-3 font-bold text-slate-900 dark:text-white text-xs">
                        🛡️ {tech.fullName}
                      </td>
                      <td className="py-3 px-3 text-slate-500">
                        <div>{tech.email}</div>
                        <div className="text-[10px] text-slate-400">{tech.department}</div>
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-bold text-slate-900 dark:text-white">
                        {tech.total}
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-bold text-emerald-600">
                        {tech.resolved}
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-bold text-purple-600">
                        {tech.slaRate}%
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-bold text-cyan-600">
                        {tech.avgHours} {isJa ? '時間' : (isEn ? 'Hours' : 'Giờ')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==================== TAB 4: INCIDENTS & PROBLEMS ==================== */}
      {activeTab === 'incidents' && (
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4 animate-in fade-in duration-150">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
                <span>{isJa ? '重大システムインシデント＆障害レポート' : (isEn ? 'System Major Incidents & Problems Report' : 'Báo Cáo Sự Cố Hệ Thống (Major Incidents & Problems)')}</span>
              </h3>
              <p className="text-xs text-slate-500">
                {isJa
                  ? '広範囲に影響を及ぼすP1/P2インシデントと復旧状況の追跡'
                  : (isEn
                  ? 'Tracking P1/P2 widespread incidents and recovery progress'
                  : 'Theo dõi các sự cố P1/P2 ảnh hưởng diện rộng và tiến độ khắc phục')}
              </p>
            </div>
            <Link
              href="/incidents"
              className="px-3 py-1.5 rounded-xl text-xs font-bold text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950 flex items-center gap-1 cursor-pointer"
            >
              <span>{isJa ? 'インシデント管理を開く' : (isEn ? 'View Incident Management' : 'Xem Quản Lý Sự Cố')}</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="py-3 px-3">{isJa ? '障害番号' : (isEn ? 'Incident ID' : 'Mã Sự Cố')}</th>
                  <th className="py-3 px-3">{isJa ? '件名＆内容' : (isEn ? 'Title & Description' : 'Tiêu Đề & Nội Dung')}</th>
                  <th className="py-3 px-3 text-center">{isJa ? '重大度' : (isEn ? 'Severity' : 'Mức Độ')}</th>
                  <th className="py-3 px-3 text-center">{isJa ? 'ステータス' : (isEn ? 'Status' : 'Trạng Thái')}</th>
                  <th className="py-3 px-3">{isJa ? '対応チーム' : (isEn ? 'Handling Team' : 'Team Xử Lý')}</th>
                  <th className="py-3 px-3 text-right">{isJa ? '発生日時' : (isEn ? 'Started At' : 'Thời Điểm Bắt Đầu')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {data?.incidentsSummary.recentIncidents.map((inc) => (
                  <tr key={inc.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="py-3 px-3 font-mono font-black text-rose-600">
                      {inc.incidentNumber}
                    </td>
                    <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">
                      {inc.title}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-50 text-rose-700 border border-rose-200">
                        {inc.severity}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                        {inc.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-600 dark:text-slate-400">
                      {inc.team?.name || (isJa ? '共通' : (isEn ? 'General' : 'Chung'))}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-slate-500 text-[11px]">
                      {new Date(inc.startedAt).toLocaleString(isEn ? 'en-US' : 'vi-VN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==================== TAB 5: TICKETS EXPLORER ==================== */}
      {activeTab === 'tickets' && (
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4 animate-in fade-in duration-150">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <LifeBuoy className="w-5 h-5 text-blue-600" />
                <span>
                  {isJa
                    ? `チケット詳細エクスプローラー (${filteredTickets.length} 件)`
                    : (isEn
                    ? `Detailed Ticket Explorer (${filteredTickets.length} records)`
                    : `Danh Sách Chi Tiết Toàn Bộ Ticket (${filteredTickets.length} bản ghi)`)}
                </span>
              </h3>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder={isJa ? "チケット番号、件名、会社名で検索..." : (isEn ? "Search ticket ID, title, company..." : "Tìm mã ticket, tiêu đề, công ty...")}
                value={tableSearch}
                onChange={(e) => setTableSearch(e.target.value)}
                className="w-full pl-8.5 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse min-w-[1000px]">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="py-2.5 px-2.5 min-w-[90px]">{isJa ? 'チケット番号' : (isEn ? 'TICKET ID' : 'MÃ TICKET')}</th>
                  <th className="py-2.5 px-2.5 min-w-[180px]">{isJa ? '件名＆内容' : (isEn ? 'TITLE & DETAILS' : 'TIÊU ĐỀ & NỘI DUNG')}</th>
                  <th className="py-2.5 px-2 min-w-[130px]">{isJa ? '会社＆申請者' : (isEn ? 'COMPANY & REQUESTER' : 'CÔNG TY & NGƯỜI GỬI')}</th>
                  <th className="py-2.5 px-2 min-w-[120px]">{isJa ? 'チーム＆担当者' : (isEn ? 'TEAM & ASSIGNEE' : 'TEAM & NGƯỜI XỬ LÝ')}</th>
                  <th className="py-2.5 px-2 min-w-[95px]">{isJa ? 'カテゴリ' : (isEn ? 'CATEGORY' : 'DANH MỤC')}</th>
                  <th className="py-2.5 px-2 min-w-[80px]">{isJa ? '優先度' : (isEn ? 'PRIORITY' : 'ƯU TIÊN')}</th>
                  <th className="py-2.5 px-2 min-w-[85px]">{isJa ? 'ステータス' : (isEn ? 'STATUS' : 'TRẠNG THÁI')}</th>
                  <th className="py-2.5 px-2 min-w-[100px]">{isJa ? 'SLA期限' : (isEn ? 'SLA DEADLINE' : 'HẠN SLA')}</th>
                  <th className="py-2.5 px-2 min-w-[90px] text-right">{isJa ? '作成日' : (isEn ? 'CREATED AT' : 'NGÀY TẠO')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredTickets.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="py-2.5 px-2.5">
                      <span className="font-mono font-black text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950 px-1.5 py-0.2 rounded text-[10px]">
                        {t.ticketNumber}
                      </span>
                    </td>
                    <td className="py-2.5 px-2.5">
                      <div className="font-bold text-slate-900 dark:text-white line-clamp-1">{t.title}</div>
                      <div className="text-[10px] text-slate-400 line-clamp-1">{t.description}</div>
                    </td>
                    <td className="py-2.5 px-2">
                      <div className="font-bold text-slate-800 dark:text-slate-200 line-clamp-1">
                        🏢 {t.companyName || (isEn ? 'General' : 'Công ty chung')}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        👤 {t.createdBy?.fullName}
                      </div>
                    </td>
                    <td className="py-2.5 px-2">
                      <div className="font-bold text-purple-700 dark:text-purple-400 text-[10.5px]">
                        {t.team?.name || (isJa ? 'チーム未定' : (isEn ? 'Unassigned' : 'Chưa phân team'))}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {t.assignedTo ? `🛡️ ${t.assignedTo.fullName}` : (isJa ? '担当未定' : (isEn ? 'Unassigned' : 'Chưa gán'))}
                      </div>
                    </td>
                    <td className="py-2.5 px-2">
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {getCategoryName(t.category, language)}
                      </span>
                    </td>
                    <td className="py-2.5 px-2">
                      <span className={`text-[9.5px] font-bold px-1.5 py-0.2 rounded-full border ${getPriorityInfo(t.priority, language).badge}`}>
                        {getPriorityInfo(t.priority, language).label}
                      </span>
                    </td>
                    <td className="py-2.5 px-2">
                      <span className={`text-[9.5px] font-bold px-1.5 py-0.2 rounded-full border ${getStatusInfo(t.status, language).badge}`}>
                        {getStatusInfo(t.status, language).label}
                      </span>
                    </td>
                    <td className="py-2.5 px-2 font-mono text-[10px] text-slate-500">
                      {t.slaDeadline ? new Date(t.slaDeadline).toLocaleDateString(isEn ? 'en-US' : 'vi-VN') : '—'}
                    </td>
                    <td className="py-2.5 px-2 text-right font-mono text-[10px] text-slate-500">
                      {new Date(t.createdAt).toLocaleDateString(isEn ? 'en-US' : 'vi-VN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
