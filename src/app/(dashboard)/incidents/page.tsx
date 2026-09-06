'use client';

import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/lib/i18n/context';
import {
  AlertTriangle,
  Flame,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  RotateCcw,
  Shield,
  Layers,
  Building,
  User as UserIcon,
  MessageSquare,
  LifeBuoy,
  X,
  ExternalLink,
  ChevronRight,
  Send,
  Loader2,
  Check,
  BrainCircuit,
  Wrench,
  AlertCircle,
  TrendingUp,
} from 'lucide-react';

interface Incident {
  id: string;
  incidentNumber: string;
  title: string;
  description: string;
  severity: 'CRITICAL_P1' | 'HIGH_P2' | 'MEDIUM_P3' | 'LOW_P4';
  status: 'INVESTIGATING' | 'IDENTIFIED' | 'MONITORING' | 'RESOLVED' | 'CLOSED';
  impact?: string | null;
  affectedServices: string[];
  affectedLocations: string[];
  workaround?: string | null;
  resolutionNotes?: string | null;
  startedAt: string;
  resolvedAt?: string | null;
  createdAt: string;
  createdBy: { id: string; fullName: string; email: string; avatarUrl?: string | null };
  assignedTo?: { id: string; fullName: string; email: string; avatarUrl?: string | null } | null;
  team?: { id: string; name: string; code: string } | null;
  problem?: { id: string; problemNumber: string; title: string; status: string; rootCause?: string | null } | null;
  tickets: Array<{
    id: string;
    ticketNumber: string;
    title: string;
    status: string;
    priority: string;
    createdBy?: { fullName: string };
  }>;
  updates: Array<{
    id: string;
    content: string;
    statusChange?: string | null;
    createdAt: string;
    user: { id: string; fullName: string; avatarUrl?: string | null };
  }>;
  _count?: { tickets: number; updates: number };
}

const SEVERITY_CONFIG: Record<string, { labelVi: string; labelEn: string; bg: string; text: string; border: string; icon: any }> = {
  CRITICAL_P1: {
    labelVi: 'P1 - Khẩn cấp (Toàn hệ thống)',
    labelEn: 'P1 - Critical (Entire System)',
    bg: 'bg-rose-500/15',
    text: 'text-rose-600 dark:text-rose-400',
    border: 'border-rose-500/30',
    icon: Flame,
  },
  HIGH_P2: {
    labelVi: 'P2 - Nghiêm trọng (Phòng ban/Dịch vụ)',
    labelEn: 'P2 - Major (Department / Service)',
    bg: 'bg-orange-500/15',
    text: 'text-orange-600 dark:text-orange-400',
    border: 'border-orange-500/30',
    icon: AlertTriangle,
  },
  MEDIUM_P3: {
    labelVi: 'P3 - Trung bình (Nhóm User)',
    labelEn: 'P3 - Medium (User Group)',
    bg: 'bg-amber-500/15',
    text: 'text-amber-600 dark:text-amber-400',
    border: 'border-amber-500/30',
    icon: AlertCircle,
  },
  LOW_P4: {
    labelVi: 'P4 - Thấp (Ảnh hưởng nhỏ)',
    labelEn: 'P4 - Low (Minor Impact)',
    bg: 'bg-slate-500/15',
    text: 'text-slate-600 dark:text-slate-400',
    border: 'border-slate-500/30',
    icon: Clock,
  },
};

const STATUS_CONFIG: Record<string, { labelVi: string; labelEn: string; bg: string; text: string; border: string }> = {
  INVESTIGATING: {
    labelVi: 'Đang điều tra & khoanh vùng',
    labelEn: 'Investigating & Isolating',
    bg: 'bg-rose-500/15',
    text: 'text-rose-600 dark:text-rose-400',
    border: 'border-rose-500/30',
  },
  IDENTIFIED: {
    labelVi: 'Đã xác định & đang khôi phục',
    labelEn: 'Identified & Recovering',
    bg: 'bg-amber-500/15',
    text: 'text-amber-600 dark:text-amber-400',
    border: 'border-amber-500/30',
  },
  MONITORING: {
    labelVi: 'Đã có Workaround / Theo dõi',
    labelEn: 'Workaround / Monitoring',
    bg: 'bg-blue-500/15',
    text: 'text-blue-600 dark:text-blue-400',
    border: 'border-blue-500/30',
  },
  RESOLVED: {
    labelVi: 'Đã khôi phục hoàn toàn',
    labelEn: 'Fully Restored',
    bg: 'bg-emerald-500/15',
    text: 'text-emerald-600 dark:text-emerald-400',
    border: 'border-emerald-500/30',
  },
  CLOSED: {
    labelVi: 'Đã đóng sự cố',
    labelEn: 'Incident Closed',
    bg: 'bg-slate-500/15',
    text: 'text-slate-600 dark:text-slate-400',
    border: 'border-slate-500/30',
  },
};

export default function IncidentsPage() {
  const { language } = useLanguage();
  const isEn = language === 'en';

  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [stats, setStats] = useState({ total: 0, active: 0, p1Critical: 0, p2Major: 0, resolved: 0 });
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isCreateProblemModalOpen, setIsCreateProblemModalOpen] = useState(false);

  // Form states for creating incident
  const [createForm, setCreateForm] = useState({
    title: '',
    description: '',
    severity: 'MEDIUM_P3',
    impact: '',
    affectedServices: '',
    affectedLocations: '',
    workaround: '',
    teamId: '',
    ticketIds: [] as string[],
  });

  // Form for Problem creation from incident
  const [problemForm, setProblemForm] = useState({
    title: '',
    description: '',
    priority: 'HIGH',
    rootCause: '',
    permanentSolution: '',
    workaround: '',
  });

  // Timeline note input
  const [timelineNote, setTimelineNote] = useState('');
  const [isSubmittingUpdate, setIsSubmittingUpdate] = useState(false);

  // Auxiliary data for dropdowns
  const [teams, setTeams] = useState<Array<{ id: string; name: string }>>([]);
  const [unlinkedTickets, setUnlinkedTickets] = useState<Array<{ id: string; ticketNumber: string; title: string; priority: string }>>([]);

  const loadData = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (search) queryParams.set('search', search);
      if (selectedSeverity !== 'ALL') queryParams.set('severity', selectedSeverity);
      if (selectedStatus !== 'ALL') queryParams.set('status', selectedStatus);

      const [incRes, teamsRes, ticketsRes] = await Promise.all([
        fetch(`/api/incidents?${queryParams.toString()}`).then((r) => r.json()),
        fetch('/api/support-teams').then((r) => r.json()).catch(() => ({ data: [] })),
        fetch('/api/tickets?status=OPEN&unlinkedIncident=true').then((r) => r.json()).catch(() => ({ tickets: [] })),
      ]);

      if (incRes.success) {
        setIncidents(incRes.data);
        if (incRes.stats) setStats(incRes.stats);
      }
      if (teamsRes.success) setTeams(teamsRes.data);
      if (ticketsRes.tickets) setUnlinkedTickets(ticketsRes.tickets);
    } catch (error) {
      console.error('Error loading incidents:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedSeverity, selectedStatus, search]);

  const handleCreateIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/incidents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...createForm,
          affectedServices: createForm.affectedServices.split(',').map((s) => s.trim()).filter(Boolean),
          affectedLocations: createForm.affectedLocations.split(',').map((s) => s.trim()).filter(Boolean),
        }),
      });
      if (res.ok) {
        setIsCreateModalOpen(false);
        setCreateForm({
          title: '',
          description: '',
          severity: 'MEDIUM_P3',
          impact: '',
          affectedServices: '',
          affectedLocations: '',
          workaround: '',
          teamId: '',
          ticketIds: [],
        });
        loadData();
      }
    } catch (err) {
      console.error('Failed to create incident:', err);
    }
  };

  const handleUpdateStatus = async (newStatus: string) => {
    if (!selectedIncident) return;
    try {
      const res = await fetch(`/api/incidents/${selectedIncident.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        const updated = await fetch(`/api/incidents/${selectedIncident.id}`).then((r) => r.json());
        if (updated.success) {
          setSelectedIncident(updated.data);
        }
        loadData();
      }
    } catch (err) {
      console.error('Error updating status:', err);
    }
  };

  const handleAddTimelineNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIncident || !timelineNote.trim()) return;
    setIsSubmittingUpdate(true);
    try {
      const res = await fetch(`/api/incidents/${selectedIncident.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updateNote: timelineNote }),
      });
      if (res.ok) {
        setTimelineNote('');
        const updated = await fetch(`/api/incidents/${selectedIncident.id}`).then((r) => r.json());
        if (updated.success) {
          setSelectedIncident(updated.data);
        }
      }
    } catch (err) {
      console.error('Error adding timeline note:', err);
    } finally {
      setIsSubmittingUpdate(false);
    }
  };

  const handleOpenCreateProblem = () => {
    if (!selectedIncident) return;
    setProblemForm({
      title: `[RCA] ${selectedIncident.title}`,
      description: isEn
        ? `Root cause analysis arising from Incident ${selectedIncident.incidentNumber}.\nImpact Scope: ${selectedIncident.impact || 'N/A'}\nDetails: ${selectedIncident.description}`
        : `Vấn đề gốc phát sinh từ Sự cố ${selectedIncident.incidentNumber}.\nPhạm vi ảnh hưởng: ${selectedIncident.impact || 'N/A'}\nChi tiết sự cố: ${selectedIncident.description}`,
      priority: selectedIncident.severity === 'CRITICAL_P1' ? 'CRITICAL' : 'HIGH',
      rootCause: '',
      permanentSolution: '',
      workaround: selectedIncident.workaround || '',
    });
    setIsCreateProblemModalOpen(true);
  };

  const handleSaveProblem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIncident) return;
    try {
      const res = await fetch('/api/problems', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...problemForm,
          incidentIds: [selectedIncident.id],
        }),
      });
      if (res.ok) {
        const data = await res.json();
        // Link problem to current incident
        await fetch(`/api/incidents/${selectedIncident.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            problemId: data.data.id,
            updateNote: isEn
              ? `Initiated Problem ${data.data.problemNumber} for Root Cause Analysis (RCA).`
              : `Đã khởi tạo Problem ${data.data.problemNumber} để tìm nguyên nhân gốc (Root Cause).`,
          }),
        });
        setIsCreateProblemModalOpen(false);
        const updated = await fetch(`/api/incidents/${selectedIncident.id}`).then((r) => r.json());
        if (updated.success) setSelectedIncident(updated.data);
        loadData();
      }
    } catch (err) {
      console.error('Error creating problem:', err);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header & KPI Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-gradient-to-br from-rose-500 to-orange-600 text-white shadow-md shadow-rose-500/20">
              <AlertTriangle className="w-5 h-5" />
            </span>
            <span>{isEn ? 'Incident Management' : 'Quản Lý Sự Cố (Incident Management)'}</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {isEn
              ? 'Rapid coordination and restoration of widespread service disruptions • Bundle related tickets'
              : 'Điều phối và khôi phục nhanh chóng các sự cố gián đoạn dịch vụ diện rộng • Gom nhiều Ticket liên quan'}
          </p>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-orange-600 hover:from-rose-700 hover:to-orange-700 text-white text-xs font-bold shadow-lg shadow-rose-500/25 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>{isEn ? '+ Declare Incident' : 'Khai Báo Sự Cố Mới'}</span>
        </button>
      </div>

      {/* KPI Cards Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>{isEn ? 'Total Incidents' : 'Tổng sự cố'}</span>
            <Layers className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-2">{stats.total}</div>
        </div>

        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 shadow-xs">
          <div className="flex items-center justify-between text-rose-700 dark:text-rose-400 text-xs font-bold">
            <span>{isEn ? 'P1 - Critical (Active)' : 'P1 - Khẩn cấp (Active)'}</span>
            <Flame className="w-4 h-4 text-rose-600 animate-pulse" />
          </div>
          <div className="text-2xl font-black text-rose-700 dark:text-rose-400 mt-2">{stats.p1Critical}</div>
        </div>

        <div className="p-4 rounded-2xl bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-900/50 shadow-xs">
          <div className="flex items-center justify-between text-orange-700 dark:text-orange-400 text-xs font-bold">
            <span>{isEn ? 'P2 - Major' : 'P2 - Nghiêm trọng'}</span>
            <AlertTriangle className="w-4 h-4 text-orange-600" />
          </div>
          <div className="text-2xl font-black text-orange-700 dark:text-orange-400 mt-2">{stats.p2Major}</div>
        </div>

        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 shadow-xs">
          <div className="flex items-center justify-between text-amber-700 dark:text-amber-400 text-xs font-bold">
            <span>{isEn ? 'In Progress' : 'Đang xử lý'}</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-amber-700 dark:text-amber-400 mt-2">{stats.active}</div>
        </div>

        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 shadow-xs">
          <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-400 text-xs font-bold">
            <span>{isEn ? 'Recovered' : 'Đã khôi phục'}</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-700 dark:text-emerald-400 mt-2">{stats.resolved}</div>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center md:justify-between gap-3 shadow-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={isEn ? "Search by incident ID (INC-...), title, impact scope..." : "Tìm theo mã sự cố (INC-...), tiêu đề, phạm vi ảnh hưởng..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-rose-500"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Severity Filter */}
          <select
            value={selectedSeverity}
            onChange={(e) => setSelectedSeverity(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-rose-500"
          >
            <option value="ALL">{isEn ? 'All Severities' : 'Mọi mức độ'}</option>
            <option value="CRITICAL_P1">{isEn ? 'P1 - Critical' : 'P1 - Khẩn cấp'}</option>
            <option value="HIGH_P2">{isEn ? 'P2 - Major' : 'P2 - Nghiêm trọng'}</option>
            <option value="MEDIUM_P3">{isEn ? 'P3 - Medium' : 'P3 - Trung bình'}</option>
            <option value="LOW_P4">{isEn ? 'P4 - Low' : 'P4 - Thấp'}</option>
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-rose-500"
          >
            <option value="ALL">{isEn ? 'All Statuses' : 'Mọi trạng thái'}</option>
            <option value="INVESTIGATING">{isEn ? 'Investigating' : 'Đang điều tra'}</option>
            <option value="IDENTIFIED">{isEn ? 'Identified' : 'Đã xác định'}</option>
            <option value="MONITORING">{isEn ? 'Monitoring' : 'Đang theo dõi'}</option>
            <option value="RESOLVED">{isEn ? 'Resolved' : 'Đã khôi phục'}</option>
            <option value="CLOSED">{isEn ? 'Closed' : 'Đã đóng'}</option>
          </select>

          <button
            onClick={() => {
              setSearch('');
              setSelectedSeverity('ALL');
              setSelectedStatus('ALL');
            }}
            className="p-2 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer"
            title={isEn ? "Reset filters" : "Làm mới bộ lọc"}
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Incidents List Grid */}
      {loading ? (
        <div className="p-12 text-center text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-rose-500" />
          <span>{isEn ? 'Loading incidents...' : 'Đang tải danh sách sự cố...'}</span>
        </div>
      ) : incidents.length === 0 ? (
        <div className="p-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl text-center">
          <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800 dark:text-white">
            {isEn ? 'No active incidents needing attention' : 'Không có sự cố nào cần xử lý'}
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            {isEn ? 'IT infrastructure and services are operating normally.' : 'Hạ tầng và các dịch vụ IT hiện đang vận hành ổn định.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {incidents.map((incident) => {
            const sev = SEVERITY_CONFIG[incident.severity] || SEVERITY_CONFIG.MEDIUM_P3;
            const sta = STATUS_CONFIG[incident.status] || STATUS_CONFIG.INVESTIGATING;
            const SevIcon = sev.icon;
            const sevLabel = isEn ? sev.labelEn : sev.labelVi;
            const staLabel = isEn ? sta.labelEn : sta.labelVi;

            return (
              <div
                key={incident.id}
                onClick={() => {
                  setSelectedIncident(incident);
                  setIsDetailModalOpen(true);
                }}
                className="group p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-rose-400 dark:hover:border-rose-500/50 rounded-3xl transition-all shadow-xs hover:shadow-lg cursor-pointer flex flex-col md:flex-row md:items-center md:justify-between gap-4"
              >
                <div className="space-y-2 flex-1">
                  {/* Badge Row */}
                  <div className="flex items-center gap-2 flex-wrap text-xs">
                    <span className="font-mono font-black text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg">
                      {incident.incidentNumber}
                    </span>

                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-bold border ${sev.bg} ${sev.text} ${sev.border}`}>
                      <SevIcon className="w-3.5 h-3.5" />
                      <span>{sevLabel}</span>
                    </span>

                    <span className={`px-2.5 py-0.5 rounded-full font-semibold border ${sta.bg} ${sta.text} ${sta.border}`}>
                      {staLabel}
                    </span>

                    {incident.problem && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold bg-purple-50 text-purple-700 border border-purple-200">
                        <BrainCircuit className="w-3.5 h-3.5" />
                        <span>Problem: {incident.problem.problemNumber}</span>
                      </span>
                    )}
                  </div>

                  {/* Title & Description */}
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">
                      {incident.title}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5">
                      {incident.description}
                    </p>
                  </div>

                  {/* Impact & Meta Info */}
                  <div className="flex items-center gap-4 text-[11px] text-slate-400 flex-wrap">
                    {incident.impact && (
                      <span><strong>{isEn ? 'Scope:' : 'Phạm vi:'}</strong> {incident.impact}</span>
                    )}
                    {incident.team && (
                      <span><strong>Team:</strong> {incident.team.name}</span>
                    )}
                    {incident.assignedTo && (
                      <span><strong>{isEn ? 'Assignee:' : 'Người xử lý:'}</strong> {incident.assignedTo.fullName}</span>
                    )}
                    <span><strong>{isEn ? 'Started:' : 'Thời gian bắt đầu:'}</strong> {new Date(incident.startedAt).toLocaleString(isEn ? 'en-US' : 'vi-VN')}</span>
                  </div>
                </div>

                {/* Right side stats */}
                <div className="flex items-center gap-3 shrink-0 self-start md:self-center border-t md:border-t-0 pt-3 md:pt-0 border-slate-100 dark:border-slate-800">
                  <div className="text-center px-3 py-1.5 bg-slate-50 dark:bg-slate-800/70 rounded-2xl border border-slate-200/60 dark:border-slate-700">
                    <div className="text-xs text-slate-400 font-medium">{isEn ? 'Bundled' : 'Ticket gom'}</div>
                    <div className="text-base font-black text-purple-700 dark:text-purple-400">
                      {incident.tickets?.length || incident._count?.tickets || 0}
                    </div>
                  </div>

                  <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-rose-500 group-hover:translate-x-1 transition-all" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Khai Báo Sự Cố Mới */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-5xl w-full max-h-[92vh] flex flex-col border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-rose-50/50 dark:bg-rose-950/20">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-rose-600 text-white">
                  <AlertTriangle className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">
                    {isEn ? 'Declare New Incident' : 'Khai Báo Sự Cố Mới (Incident)'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {isEn ? 'Objective: Restore disrupted services as quickly as possible' : 'Mục tiêu: Khôi phục dịch vụ gián đoạn càng nhanh càng tốt'}
                  </p>
                </div>
              </div>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateIncident} className="p-6 overflow-y-auto space-y-4 flex-1">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {isEn ? 'Incident Title (*)' : 'Tiêu Đề Sự Cố (*)'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={isEn ? "e.g. Total network outage on 3rd floor, ERP system inaccessible..." : "VD: Mất kết nối mạng toàn Tầng 3, Hệ thống ERP không thể truy cập..."}
                  value={createForm.title}
                  onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl text-xs outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {isEn ? 'Severity Level' : 'Mức Độ Sự Cố (Severity)'}
                  </label>
                  <select
                    value={createForm.severity}
                    onChange={(e) => setCreateForm({ ...createForm, severity: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl text-xs outline-none focus:ring-2 focus:ring-rose-500"
                  >
                    <option value="CRITICAL_P1">{isEn ? 'P1 - Critical (Company-wide / Core system)' : 'P1 - Khẩn cấp (Toàn công ty / Hệ thống trọng yếu)'}</option>
                    <option value="HIGH_P2">{isEn ? 'P2 - Major (Department / Core service)' : 'P2 - Nghiêm trọng (Toàn phòng ban / Dịch vụ chính)'}</option>
                    <option value="MEDIUM_P3">{isEn ? 'P3 - Medium (User group)' : 'P3 - Trung bình (Nhóm người dùng)'}</option>
                    <option value="LOW_P4">{isEn ? 'P4 - Low (Minor impact, workaround available)' : 'P4 - Thấp (Ảnh hưởng nhỏ, có phương án thay thế)'}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {isEn ? 'Assigned IT Team' : 'Team IT Phụ Trách'}
                  </label>
                  <select
                    value={createForm.teamId}
                    onChange={(e) => setCreateForm({ ...createForm, teamId: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl text-xs outline-none focus:ring-2 focus:ring-rose-500"
                  >
                    <option value="">{isEn ? '-- Select IT Team --' : '-- Chọn Team IT xử lý --'}</option>
                    {teams.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {isEn ? 'Detailed Description (*)' : 'Mô Tả Chi Tiết Hiện Tượng (*)'}
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder={isEn ? "Describe symptoms, starting time, observed error logs..." : "Mô tả hiện tượng sự cố, thời điểm bắt đầu, các triệu chứng ghi nhận được..."}
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl text-xs outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {isEn ? 'Impact Scope' : 'Phạm Vi Ảnh Hưởng (Impact Scope)'}
                  </label>
                  <input
                    type="text"
                    placeholder={isEn ? "e.g. Building A - Floor 3, Hai Phong Warehouse..." : "VD: Tòa nhà A - Tầng 3, Kho hàng Hải Phòng..."}
                    value={createForm.impact}
                    onChange={(e) => setCreateForm({ ...createForm, impact: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl text-xs outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {isEn ? 'Temporary Workaround' : 'Biện Pháp Khôi Phục Tạm (Workaround)'}
                  </label>
                  <input
                    type="text"
                    placeholder={isEn ? "e.g. Switch to backup WAN line, reboot core switch..." : "VD: Chuyển hướng sang đường truyền Backup, khởi động lại Switch..."}
                    value={createForm.workaround}
                    onChange={(e) => setCreateForm({ ...createForm, workaround: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl text-xs outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
              </div>

              {/* Bundle unlinked tickets */}
              {unlinkedTickets.length > 0 && (
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    {isEn ? 'Bundle Related Tickets into This Incident (Optional)' : 'Gom Các Ticket Liên Quan Vào Sự Cố Này (Tùy chọn)'}
                  </label>
                  <div className="max-h-36 overflow-y-auto space-y-1.5">
                    {unlinkedTickets.map((t) => (
                      <label key={t.id} className="flex items-center gap-2 p-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs cursor-pointer hover:bg-rose-50/50">
                        <input
                          type="checkbox"
                          checked={createForm.ticketIds.includes(t.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setCreateForm({ ...createForm, ticketIds: [...createForm.ticketIds, t.id] });
                            } else {
                              setCreateForm({ ...createForm, ticketIds: createForm.ticketIds.filter((id) => id !== t.id) });
                            }
                          }}
                        />
                        <span className="font-mono font-bold text-slate-600 dark:text-slate-400">{t.ticketNumber}:</span>
                        <span className="truncate flex-1 text-slate-800 dark:text-slate-200">{t.title}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 cursor-pointer"
                >
                  {isEn ? 'Cancel' : 'Hủy'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-rose-600 to-orange-600 hover:from-rose-700 hover:to-orange-700 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer"
                >
                  {isEn ? 'Create Incident & Activate' : 'Tạo Sự Cố & Kích Hoạt'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Chi Tiết Sự Cố */}
      {isDetailModalOpen && selectedIncident && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-6xl w-full max-h-[92vh] flex flex-col border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
              <div className="flex items-center gap-3">
                <span className="font-mono font-black text-sm px-2.5 py-1 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900">
                  {selectedIncident.incidentNumber}
                </span>
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white line-clamp-1">
                    {selectedIncident.title}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                    <span>{isEn ? 'Started:' : 'Bắt đầu:'} {new Date(selectedIncident.startedAt).toLocaleString(isEn ? 'en-US' : 'vi-VN')}</span>
                    {selectedIncident.team && <span>• Team: <strong>{selectedIncident.team.name}</strong></span>}
                  </div>
                </div>
              </div>
              <button onClick={() => setIsDetailModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {/* Status Action Buttons Bar */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl space-y-2">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  {isEn ? 'Update Incident Status' : 'Chuyển Trạng Thái Sự Cố'}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {(['INVESTIGATING', 'IDENTIFIED', 'MONITORING', 'RESOLVED', 'CLOSED'] as const).map((st) => {
                    const cfg = STATUS_CONFIG[st];
                    const isActive = selectedIncident.status === st;
                    const lbl = isEn ? cfg.labelEn : cfg.labelVi;
                    return (
                      <button
                        key={st}
                        onClick={() => handleUpdateStatus(st)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                          isActive
                            ? `${cfg.bg} ${cfg.text} ${cfg.border} ring-2 ring-rose-500/30`
                            : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {lbl}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Problem Quick Action Banner */}
              <div className="p-4 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950/30 dark:to-indigo-950/30 border border-purple-200 dark:border-purple-800/50 rounded-2xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="text-xs font-black text-purple-900 dark:text-purple-300 flex items-center gap-1.5">
                    <BrainCircuit className="w-4 h-4 text-purple-600" />
                    <span>{isEn ? 'Root Cause Management (Problem & RCA)' : 'Quản Lý Nguyên Nhân Gốc (Problem & Root Cause)'}</span>
                  </div>
                  <p className="text-xs text-purple-700 dark:text-purple-400">
                    {selectedIncident.problem
                      ? (isEn
                          ? `Linked to Problem ${selectedIncident.problem.problemNumber}: ${selectedIncident.problem.title}`
                          : `Đã liên kết với Problem ${selectedIncident.problem.problemNumber}: ${selectedIncident.problem.title}`)
                      : (isEn
                          ? 'Recurring or critical incident? Create a Problem to analyze Root Cause & prevent recurrence.'
                          : 'Sự cố tái diễn hoặc nghiêm trọng? Tạo Problem để phân tích Root Cause & ngăn ngừa tái phát.')}
                  </p>
                </div>

                {!selectedIncident.problem && (
                  <button
                    onClick={handleOpenCreateProblem}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-md shrink-0 flex items-center gap-1.5 cursor-pointer"
                  >
                    <BrainCircuit className="w-4 h-4" />
                    <span>{isEn ? '+ Create Problem from Incident' : '+ Tạo Problem từ Sự Cố Này'}</span>
                  </button>
                )}
              </div>

              {/* Description & Workaround Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl space-y-1.5">
                  <div className="text-xs font-bold text-slate-400 uppercase">{isEn ? 'Incident Description' : 'Mô tả hiện tượng'}</div>
                  <p className="text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap">{selectedIncident.description}</p>
                </div>

                <div className="p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl space-y-1.5">
                  <div className="text-xs font-bold text-amber-600 uppercase flex items-center gap-1">
                    <Wrench className="w-3.5 h-3.5" />
                    <span>{isEn ? 'Temporary Workaround' : 'Biện pháp tạm thời (Workaround)'}</span>
                  </div>
                  <p className="text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap">
                    {selectedIncident.workaround || (isEn ? 'No temporary workaround set yet' : 'Chưa thiết lập phương án tạm thời')}
                  </p>
                </div>
              </div>

              {/* Linked Tickets Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2">
                    <LifeBuoy className="w-4 h-4 text-purple-600" />
                    <span>{isEn ? `Related Tickets (${selectedIncident.tickets?.length || 0})` : `Các Ticket Liên Quan (${selectedIncident.tickets?.length || 0})`}</span>
                  </h4>
                </div>

                {selectedIncident.tickets?.length === 0 ? (
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl text-xs text-slate-400 text-center">
                    {isEn ? 'No individual tickets bundled into this incident yet.' : 'Chưa có Ticket cá nhân nào được gom vào sự cố này.'}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {selectedIncident.tickets.map((t) => (
                      <div key={t.id} className="p-3 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-between text-xs">
                        <div>
                          <span className="font-mono font-bold text-purple-700 dark:text-purple-400">{t.ticketNumber}</span>: {t.title}
                          <div className="text-[10px] text-slate-400">{isEn ? 'Requester:' : 'Người báo:'} {t.createdBy?.fullName || 'N/A'}</div>
                        </div>
                        <span className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-700 border border-slate-200 text-[10px] font-bold">
                          {t.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Progress Timeline & Update Note */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <Clock className="w-4 h-4 text-rose-600" />
                  <span>{isEn ? 'Recovery Progress Timeline' : 'Nhật Ký Tiến Độ Khôi Phục (Timeline)'}</span>
                </h4>

                <form onSubmit={handleAddTimelineNote} className="flex gap-2">
                  <input
                    type="text"
                    placeholder={isEn ? "Add progress update, tried mitigation..." : "Ghi chú tiến độ mới, biện pháp vừa thử nghiệm..."}
                    value={timelineNote}
                    onChange={(e) => setTimelineNote(e.target.value)}
                    className="flex-1 p-2.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl text-xs outline-none focus:ring-2 focus:ring-rose-500"
                  />
                  <button
                    type="submit"
                    disabled={isSubmittingUpdate || !timelineNote.trim()}
                    className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{isEn ? 'Send' : 'Gửi'}</span>
                  </button>
                </form>

                <div className="space-y-2 max-h-56 overflow-y-auto">
                  {selectedIncident.updates?.map((u) => (
                    <div key={u.id} className="p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 rounded-xl text-xs space-y-1">
                      <div className="flex items-center justify-between text-slate-400 text-[11px]">
                        <span className="font-bold text-slate-700 dark:text-slate-300">{u.user?.fullName || (isEn ? 'System' : 'Hệ thống')}</span>
                        <span>{new Date(u.createdAt).toLocaleString(isEn ? 'en-US' : 'vi-VN')}</span>
                      </div>
                      <p className="text-slate-800 dark:text-slate-200">{u.content}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Tạo Problem từ Incident */}
      {isCreateProblemModalOpen && selectedIncident && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col border border-purple-200 dark:border-purple-800 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-purple-100 dark:border-purple-900 bg-purple-50/70 dark:bg-purple-950/30">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-purple-600 text-white">
                  <BrainCircuit className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="font-bold text-base text-purple-950 dark:text-white">
                    {isEn ? 'Create Problem — Root Cause Analysis' : 'Tạo Problem — Phân Tích Nguyên Nhân Gốc'}
                  </h3>
                  <p className="text-xs text-purple-600">
                    {isEn ? 'From Incident: ' : 'Từ Sự Cố: '}{selectedIncident.incidentNumber}
                  </p>
                </div>
              </div>
              <button onClick={() => setIsCreateProblemModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProblem} className="p-6 overflow-y-auto space-y-4 flex-1">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {isEn ? 'Problem Title (*)' : 'Tiêu Đề Problem (*)'}
                </label>
                <input
                  type="text"
                  required
                  value={problemForm.title}
                  onChange={(e) => setProblemForm({ ...problemForm, title: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl text-xs outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {isEn ? 'Root Cause Analysis (RCA)' : 'Phân Tích Nguyên Nhân Gốc (Root Cause Analysis - RCA)'}
                </label>
                <textarea
                  rows={3}
                  placeholder={isEn ? "Why did this happen? Hardware failure, configuration, firmware, ISP or overload?..." : "Tại sao sự cố này xảy ra? Lỗi do phần cứng, cấu hình, firmware, nhà mạng hay quá tải?..."}
                  value={problemForm.rootCause}
                  onChange={(e) => setProblemForm({ ...problemForm, rootCause: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl text-xs outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {isEn ? 'Permanent Solution' : 'Giải Pháp Khắc Phục Triệt Để Lâu Dài (Permanent Solution)'}
                </label>
                <textarea
                  rows={3}
                  placeholder={isEn ? "Need hardware replacement, topology redesign, bandwidth upgrade, or policy update?..." : "Cần nâng cấp thiết bị, thay đổi sơ đồ mạng, mua thêm gói băng thông, hay cập nhật chính sách?..."}
                  value={problemForm.permanentSolution}
                  onChange={(e) => setProblemForm({ ...problemForm, permanentSolution: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl text-xs outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateProblemModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 cursor-pointer"
                >
                  {isEn ? 'Cancel' : 'Hủy'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer"
                >
                  {isEn ? 'Confirm Problem Creation' : 'Xác Nhận Tạo Problem'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
