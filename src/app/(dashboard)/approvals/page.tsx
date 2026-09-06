'use client';

import { useState, useEffect } from 'react';
import {
  ClipboardCheck,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  Laptop,
  Key,
  Shield,
  RefreshCw,
  AlertCircle,
  FileText,
  User,
  ArrowRight,
  PackageCheck,
  Check,
  X,
  Loader2,
  ChevronRight,
} from 'lucide-react';
import { useLanguage } from '@/lib/i18n/context';

interface ApprovalRequest {
  id: string;
  code: string;
  type: string;
  status: string;
  title: string;
  description?: string;
  justification?: string;
  estimatedCost?: number;
  currency: string;
  quantity: number;
  requesterId: string;
  requester?: { id: string; fullName: string; email: string; department?: string; position?: string };
  managerId?: string;
  manager?: { id: string; fullName: string; email: string };
  managerApprovedAt?: string;
  managerNote?: string;
  itApproverId?: string;
  itApprover?: { id: string; fullName: string; email: string };
  itApprovedAt?: string;
  itNote?: string;
  rejectedBy?: string;
  rejectedAt?: string;
  rejectedReason?: string;
  deliveredAt?: string;
  createdAt: string;
}

const TYPE_CONFIG: Record<string, { labelVi: string; labelEn: string; icon: any; color: string }> = {
  NEW_DEVICE: { labelVi: 'Thiết bị mới', labelEn: 'New Hardware Device', icon: Laptop, color: 'bg-blue-100 text-blue-800 border-blue-200' },
  SOFTWARE_LICENSE: { labelVi: 'Bản quyền phần mềm', labelEn: 'Software License', icon: Key, color: 'bg-purple-100 text-purple-800 border-purple-200' },
  DEVICE_REPLACEMENT: { labelVi: 'Thay thế thiết bị hỏng', labelEn: 'Device Replacement', icon: RefreshCw, color: 'bg-amber-100 text-amber-800 border-amber-200' },
  ACCESS_REQUEST: { labelVi: 'Quyền truy cập hệ thống', labelEn: 'Access Privilege', icon: Shield, color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  OTHER: { labelVi: 'Khác', labelEn: 'Other Request', icon: FileText, color: 'bg-slate-100 text-slate-800 border-slate-200' },
};

const STATUS_CONFIG: Record<string, { labelVi: string; labelEn: string; badge: string; icon: any }> = {
  DRAFT: { labelVi: 'Bản nháp', labelEn: 'Draft', badge: 'bg-slate-100 text-slate-700 border-slate-200', icon: Clock },
  PENDING_MANAGER: { labelVi: 'Chờ Cấp trên duyệt', labelEn: 'Pending Manager', badge: 'bg-amber-100 text-amber-800 border-amber-200', icon: Clock },
  PENDING_IT: { labelVi: 'Chờ IT xác nhận', labelEn: 'Pending IT Admin', badge: 'bg-indigo-100 text-indigo-800 border-indigo-200', icon: Clock },
  APPROVED: { labelVi: 'Đã phê duyệt', labelEn: 'Approved', badge: 'bg-emerald-100 text-emerald-800 border-emerald-200', icon: CheckCircle2 },
  REJECTED: { labelVi: 'Bị từ chối', labelEn: 'Rejected', badge: 'bg-rose-100 text-rose-800 border-rose-200', icon: XCircle },
  IN_PROCUREMENT: { labelVi: 'Đang mua sắm', labelEn: 'In Procurement', badge: 'bg-blue-100 text-blue-800 border-blue-200', icon: RefreshCw },
  DELIVERED: { labelVi: 'Đã bàn giao', labelEn: 'Delivered', badge: 'bg-teal-100 text-teal-800 border-teal-200', icon: PackageCheck },
  CANCELLED: { labelVi: 'Đã hủy', labelEn: 'Cancelled', badge: 'bg-slate-100 text-slate-500 border-slate-200', icon: XCircle },
};

export default function ApprovalsPage() {
  const { language, t } = useLanguage();
  const isEn = language === 'en';
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Modal states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedApproval, setSelectedApproval] = useState<ApprovalRequest | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Form states for creation
  const [formType, setFormType] = useState('NEW_DEVICE');
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formJustification, setFormJustification] = useState('');
  const [formCost, setFormCost] = useState('');
  const [formQty, setFormQty] = useState('1');
  const [creating, setCreating] = useState(false);

  // Action states
  const [actionNote, setActionNote] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [formManagerId, setFormManagerId] = useState('');

  useEffect(() => {
    loadCurrentUser();
    loadApprovals();
    loadUsers();
  }, []);

  const loadCurrentUser = async () => {
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      if (data.success) {
        setCurrentUser(data.data);
      }
    } catch {}
  };

  const loadUsers = async () => {
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      if (data.success && Array.isArray(data.users)) {
        setUsersList(data.users);
      }
    } catch {}
  };

  const loadApprovals = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/approvals');
      const data = await res.json();
      if (data.success) {
        setApprovals(data.approvals);
      }
    } catch (e) {
      console.error('Error loading approvals:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return;

    setCreating(true);
    try {
      const res = await fetch('/api/approvals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: formType,
          title: formTitle.trim(),
          description: formDesc.trim() || undefined,
          justification: formJustification.trim() || undefined,
          estimatedCost: formCost ? Number(formCost) : undefined,
          quantity: Number(formQty) || 1,
          managerId: formManagerId || undefined,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setIsCreateOpen(false);
        // Reset form
        setFormTitle('');
        setFormDesc('');
        setFormJustification('');
        setFormCost('');
        setFormQty('1');
        loadApprovals();
      } else {
        alert(data.error || (language === 'en' ? 'Failed to create request' : 'Tạo yêu cầu thất bại'));
      }
    } catch (e: any) {
      alert(e.message || (language === 'en' ? 'Connection error' : 'Lỗi kết nối'));
    } finally {
      setCreating(false);
    }
  };

  const handleApprove = async (id: string) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/approvals/${id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: actionNote }),
      });
      const data = await res.json();
      if (data.success) {
        setIsDetailOpen(false);
        setActionNote('');
        loadApprovals();
      } else {
        alert(data.error || (language === 'en' ? 'Approval failed' : 'Phê duyệt thất bại'));
      }
    } catch (e: any) {
      alert(e.message || (language === 'en' ? 'Approval error' : 'Lỗi phê duyệt'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (id: string) => {
    if (!actionNote.trim()) {
      alert(language === 'en' ? 'Please provide a rejection reason!' : 'Vui lòng cung cấp lý do từ chối yêu cầu!');
      return;
    }
    setActionLoading(true);
    try {
      const res = await fetch(`/api/approvals/${id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: actionNote }),
      });
      const data = await res.json();
      if (data.success) {
        setIsDetailOpen(false);
        setActionNote('');
        loadApprovals();
      } else {
        alert(data.error || (language === 'en' ? 'Rejection failed' : 'Từ chối thất bại'));
      }
    } catch (e: any) {
      alert(e.message || (language === 'en' ? 'Rejection error' : 'Lỗi từ chối'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkDelivered = async (id: string) => {
    const confirmMsg = language === 'en'
      ? 'Confirm delivery & handover of hardware/license to requester?'
      : 'Xác nhận đã bàn giao thiết bị / bản quyền cho người yêu cầu?';
    if (!confirm(confirmMsg)) return;

    setActionLoading(true);
    try {
      const res = await fetch(`/api/approvals/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'DELIVERED' }),
      });
      const data = await res.json();
      if (data.success) {
        setIsDetailOpen(false);
        loadApprovals();
      }
    } catch {} finally {
      setActionLoading(false);
    }
  };

  const getTypeInfo = (type: string) => {
    const cfg = TYPE_CONFIG[type] || TYPE_CONFIG.OTHER;
    return {
      ...cfg,
      label: language === 'en' ? cfg.labelEn : cfg.labelVi,
    };
  };

  const getStatusInfo = (status: string) => {
    const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.DRAFT;
    return {
      ...cfg,
      label: language === 'en' ? cfg.labelEn : cfg.labelVi,
    };
  };

  const filteredApprovals = approvals.filter((a) => {
    if (statusFilter !== 'ALL' && a.status !== statusFilter) return false;
    if (typeFilter !== 'ALL' && a.type !== typeFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchCode = a.code.toLowerCase().includes(q);
      const matchTitle = a.title.toLowerCase().includes(q);
      const matchRequester = a.requester?.fullName.toLowerCase().includes(q);
      if (!matchCode && !matchTitle && !matchRequester) return false;
    }
    return true;
  });

  const stats = {
    pendingManager: approvals.filter((a) => a.status === 'PENDING_MANAGER').length,
    pendingIT: approvals.filter((a) => a.status === 'PENDING_IT').length,
    approved: approvals.filter((a) => a.status === 'APPROVED' || a.status === 'IN_PROCUREMENT').length,
    delivered: approvals.filter((a) => a.status === 'DELIVERED').length,
  };

  const isAdmin = currentUser?.role?.name === 'Admin' || currentUser?.roleName === 'Admin' || currentUser?.role?.name === 'Asset Manager';

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <ClipboardCheck className="w-7 h-7 text-blue-600" />
            <span>{t('approvals.title', 'Quy Trình Phê Duyệt & Cấp Phát')}</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {t('approvals.subtitle', 'Yêu cầu cấp phát thiết bị, phần mềm bản quyền và quy trình xét duyệt nhiều cấp (Cấp trên → IT Admin)')}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsCreateOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/20 transition-all cursor-pointer hover:scale-105 active:scale-95 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>{t('approvals.create_btn', 'Tạo Yêu Cầu Mới')}</span>
        </button>
      </div>

      {/* Stats Counter Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-amber-200/80 shadow-xs flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{t('approvals.stat_pending_manager', 'Chờ Cấp Trên Duyệt')}</p>
            <p className="text-xl font-black text-slate-800 mt-0.5">{stats.pendingManager}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-indigo-200/80 shadow-xs flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{t('approvals.stat_pending_it', 'Chờ IT Xác Nhận')}</p>
            <p className="text-xl font-black text-slate-800 mt-0.5">{stats.pendingIT}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-emerald-200/80 shadow-xs flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{t('approvals.stat_approved', 'Đã Phê Duyệt')}</p>
            <p className="text-xl font-black text-slate-800 mt-0.5">{stats.approved}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-teal-200/80 shadow-xs flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
            <PackageCheck className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{t('approvals.stat_delivered', 'Đã Bàn Giao')}</p>
            <p className="text-xl font-black text-slate-800 mt-0.5">{stats.delivered}</p>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={t('approvals.search_placeholder', 'Tìm theo mã AR, tiêu đề, người yêu cầu...')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 outline-none focus:bg-white focus:border-blue-500 transition-all"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:bg-white focus:border-blue-500 cursor-pointer"
          >
            <option value="ALL">{t('approvals.filter_all_status', 'Tất cả trạng thái')}</option>
            <option value="PENDING_MANAGER">{language === 'en' ? 'Pending Manager' : 'Chờ Cấp trên duyệt'}</option>
            <option value="PENDING_IT">{language === 'en' ? 'Pending IT Admin' : 'Chờ IT xác nhận'}</option>
            <option value="APPROVED">{language === 'en' ? 'Approved' : 'Đã phê duyệt'}</option>
            <option value="DELIVERED">{language === 'en' ? 'Delivered' : 'Đã bàn giao'}</option>
            <option value="REJECTED">{language === 'en' ? 'Rejected' : 'Bị từ chối'}</option>
          </select>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:bg-white focus:border-blue-500 cursor-pointer"
          >
            <option value="ALL">{t('approvals.filter_all_types', 'Tất cả loại yêu cầu')}</option>
            <option value="NEW_DEVICE">{language === 'en' ? 'New Device' : 'Thiết bị mới'}</option>
            <option value="SOFTWARE_LICENSE">{language === 'en' ? 'Software License' : 'Bản quyền phần mềm'}</option>
            <option value="DEVICE_REPLACEMENT">{language === 'en' ? 'Device Replacement' : 'Thay thế thiết bị'}</option>
            <option value="ACCESS_REQUEST">{language === 'en' ? 'System Access' : 'Quyền truy cập'}</option>
          </select>
        </div>
      </div>

      {/* Approvals List */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-12 text-center">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-2" />
            <p className="text-xs text-slate-400 font-medium">{t('approvals.loading', 'Đang tải danh sách yêu cầu phê duyệt...')}</p>
          </div>
        ) : filteredApprovals.length === 0 ? (
          <div className="p-12 text-center">
            <ClipboardCheck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-bold text-slate-700">{t('approvals.no_requests', 'Không có yêu cầu phê duyệt nào')}</p>
            <p className="text-xs text-slate-400 mt-1">{t('approvals.no_requests_desc', 'Nhấn "Tạo Yêu Cầu Mới" để gửi yêu cầu cấp phát thiết bị hoặc bản quyền.')}</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredApprovals.map((req) => {
              const typeCfg = getTypeInfo(req.type);
              const statusCfg = getStatusInfo(req.status);
              const TypeIcon = typeCfg.icon;

              return (
                <div
                  key={req.id}
                  onClick={() => {
                    setSelectedApproval(req);
                    setIsDetailOpen(true);
                  }}
                  className="p-4 sm:p-5 hover:bg-slate-50/80 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer group"
                >
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                      <TypeIcon className="w-5 h-5 text-slate-600 group-hover:text-blue-600" />
                    </div>

                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                          {req.code}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${typeCfg.color}`}>
                          {typeCfg.label}
                        </span>
                        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border flex items-center gap-1 ${statusCfg.badge}`}>
                          <span>{statusCfg.label}</span>
                        </span>
                      </div>

                      <h3 className="font-bold text-slate-800 text-sm truncate group-hover:text-blue-600 transition-colors">
                        {req.title}
                      </h3>

                      <div className="flex items-center gap-3 text-[11px] text-slate-400 flex-wrap">
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          <strong className="text-slate-600">{req.requester?.fullName || (language === 'en' ? 'Employee' : 'Nhân viên')}</strong>
                          {req.requester?.department && ` (${req.requester.department})`}
                        </span>
                        <span>•</span>
                        <span>{new Date(req.createdAt).toLocaleDateString(language === 'en' ? 'en-GB' : 'vi-VN')}</span>
                        {req.estimatedCost && (
                          <>
                            <span>•</span>
                            <span className="font-semibold text-slate-700">
                              {Number(req.estimatedCost).toLocaleString(language === 'en' ? 'en-US' : 'vi-VN')} {req.currency}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
                    {/* Action pill indicator */}
                    {req.status === 'PENDING_MANAGER' && (
                      <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                        {t('approvals.need_manager_action', 'Cần Cấp Trên Duyệt')}
                      </span>
                    )}
                    {req.status === 'PENDING_IT' && (
                      <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-200">
                        {t('approvals.need_it_action', 'Cần IT Xác Nhận')}
                      </span>
                    )}
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL: CREATE APPROVAL REQUEST */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 space-y-5 border border-slate-200 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">{t('approvals.modal_create_title', 'Tạo Yêu Cầu Phê Duyệt')}</h3>
                  <p className="text-[11px] text-slate-400">{t('approvals.modal_create_sub', 'Gửi yêu cầu cấp phát thiết bị hoặc phần mềm')}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4 text-xs">
              {/* Type */}
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">
                  {t('approvals.field_type', 'Loại yêu cầu')} <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(TYPE_CONFIG).map(([key, cfg]) => {
                    const isSelected = formType === key;
                    const Icon = cfg.icon;
                    const label = language === 'en' ? cfg.labelEn : cfg.labelVi;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setFormType(key)}
                        className={`p-2.5 rounded-xl border text-left flex items-center gap-2 transition-all cursor-pointer ${
                          isSelected
                            ? 'border-blue-600 bg-blue-50/70 text-blue-700 font-bold'
                            : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <Icon className="w-4 h-4 shrink-0" />
                        <span className="truncate">{label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">
                  {t('approvals.field_title', 'Tiêu đề yêu cầu')} <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder={t('approvals.field_title_placeholder', 'VD: Cấp mới laptop Dell Latitude 5540 cho nhân sự mới...')}
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-blue-500 font-semibold"
                />
              </div>

              {/* Justification / Reason */}
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">
                  {t('approvals.field_reason', 'Lý do cần cấp phát & Mục đích sử dụng')}
                </label>
                <textarea
                  rows={3}
                  placeholder={t('approvals.field_reason_placeholder', 'Nêu rõ lý do cần thiết, vị trí công việc, dự án áp dụng...')}
                  value={formJustification}
                  onChange={(e) => setFormJustification(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-blue-500 resize-none"
                />
              </div>

              {/* Quantity & Estimated Cost */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">{t('approvals.field_quantity', 'Số lượng')}</label>
                  <input
                    type="number"
                    min="1"
                    value={formQty}
                    onChange={(e) => setFormQty(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-blue-500 font-semibold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">{t('approvals.field_cost', 'Dự toán chi phí (VND)')}</label>
                  <input
                    type="number"
                    placeholder="VD: 25000000"
                    value={formCost}
                    onChange={(e) => setFormCost(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-blue-500 font-semibold"
                  />
                </div>
              </div>

              {/* Direct Manager Selector */}
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">
                  {t('approvals.field_manager', 'Cấp trên trực tiếp duyệt (nếu có)')}
                </label>
                <select
                  value={formManagerId}
                  onChange={(e) => setFormManagerId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-blue-500 font-semibold text-slate-800 cursor-pointer"
                >
                  <option value="">{t('approvals.field_manager_direct_it', 'Gửi thẳng cho Quản trị viên IT')}</option>
                  {usersList.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.fullName} ({u.department || u.email})
                    </option>
                  ))}
                </select>
              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  {t('common.cancel', 'Hủy')}
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl font-bold shadow-md shadow-blue-600/20 cursor-pointer flex items-center gap-1.5"
                >
                  {creating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{t('approvals.submit_btn', 'Gửi Yêu Cầu')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DETAIL / APPROVE / REJECT */}
      {isDetailOpen && selectedApproval && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full p-6 space-y-5 border border-slate-200 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                    {selectedApproval.code}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getStatusInfo(selectedApproval.status).badge}`}>
                    {getStatusInfo(selectedApproval.status).label}
                  </span>
                </div>
                <h3 className="font-bold text-base text-slate-900 mt-1">{selectedApproval.title}</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsDetailOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Approval Stepper Timeline */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t('approvals.timeline_title', 'Tiến trình xét duyệt')}</p>
              <div className="grid grid-cols-3 gap-2 text-xs text-center">
                {/* Step 1 */}
                <div className={`p-2.5 rounded-xl border ${selectedApproval.managerApprovedAt || !selectedApproval.managerId ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-white border-slate-200 text-slate-500'}`}>
                  <p className="font-bold text-[11px]">{t('approvals.step_manager', '1. Cấp Trên')}</p>
                  <p className="text-[10px] mt-0.5 font-medium">
                    {selectedApproval.managerApprovedAt
                      ? (language === 'en' ? '✅ Approved' : '✅ Đã duyệt')
                      : selectedApproval.managerId
                      ? (language === 'en' ? '⏳ Pending' : '⏳ Chờ duyệt')
                      : (language === 'en' ? 'Skipped' : 'Bỏ qua')}
                  </p>
                </div>

                {/* Step 2 */}
                <div className={`p-2.5 rounded-xl border ${selectedApproval.itApprovedAt ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : selectedApproval.status === 'PENDING_IT' ? 'bg-indigo-50 border-indigo-200 text-indigo-800' : 'bg-white border-slate-200 text-slate-500'}`}>
                  <p className="font-bold text-[11px]">{t('approvals.step_it', '2. IT Admin')}</p>
                  <p className="text-[10px] mt-0.5 font-medium">
                    {selectedApproval.itApprovedAt
                      ? (language === 'en' ? '✅ Approved' : '✅ Đã duyệt')
                      : selectedApproval.status === 'PENDING_IT'
                      ? (language === 'en' ? '⏳ Pending IT' : '⏳ Chờ IT duyệt')
                      : (language === 'en' ? 'Pending' : 'Chưa đến')}
                  </p>
                </div>

                {/* Step 3 */}
                <div className={`p-2.5 rounded-xl border ${selectedApproval.status === 'DELIVERED' ? 'bg-teal-50 border-teal-200 text-teal-800' : 'bg-white border-slate-200 text-slate-500'}`}>
                  <p className="font-bold text-[11px]">{t('approvals.step_delivery', '3. Bàn Giao')}</p>
                  <p className="text-[10px] mt-0.5 font-medium">
                    {selectedApproval.status === 'DELIVERED'
                      ? (language === 'en' ? '✅ Completed' : '✅ Hoàn tất')
                      : (language === 'en' ? 'Not yet delivered' : 'Chưa bàn giao')}
                  </p>
                </div>
              </div>
            </div>

            {/* Info details */}
            <div className="space-y-2 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl space-y-1.5">
                <p><strong>{t('approvals.requester', 'Người yêu cầu')}:</strong> {selectedApproval.requester?.fullName} ({selectedApproval.requester?.email})</p>
                {selectedApproval.requester?.department && <p><strong>{t('approvals.department', 'Phòng ban')}:</strong> {selectedApproval.requester.department}</p>}
                <p><strong>{t('approvals.field_quantity', 'Số lượng')}:</strong> {selectedApproval.quantity}</p>
                {selectedApproval.estimatedCost && (
                  <p><strong>{t('approvals.estimated_budget', 'Dự toán')}:</strong> {Number(selectedApproval.estimatedCost).toLocaleString(language === 'en' ? 'en-US' : 'vi-VN')} {selectedApproval.currency}</p>
                )}
                {selectedApproval.justification && (
                  <p className="pt-1 text-slate-600"><strong>{t('approvals.reason', 'Lý do')}:</strong> {selectedApproval.justification}</p>
                )}
              </div>

              {/* Notes from Approvers */}
              {selectedApproval.managerNote && (
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900">
                  <p className="font-bold">{t('approvals.note_manager', 'Ghi chú Cấp trên')}:</p>
                  <p className="mt-0.5">{selectedApproval.managerNote}</p>
                </div>
              )}

              {selectedApproval.itNote && (
                <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-200 text-indigo-900">
                  <p className="font-bold">{t('approvals.note_it', 'Ghi chú IT Admin')}:</p>
                  <p className="mt-0.5">{selectedApproval.itNote}</p>
                </div>
              )}

              {selectedApproval.rejectedReason && (
                <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-rose-900">
                  <p className="font-bold">{t('approvals.reason_rejected', 'Lý do từ chối')}:</p>
                  <p className="mt-0.5">{selectedApproval.rejectedReason}</p>
                </div>
              )}
            </div>

            {/* Action Buttons for Approver */}
            {(selectedApproval.status === 'PENDING_MANAGER' || selectedApproval.status === 'PENDING_IT') && (
              <div className="pt-3 border-t border-slate-100 space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {t('approvals.action_note_label', 'Ghi chú / Ý kiến phê duyệt hoặc Lý do từ chối:')}
                  </label>
                  <input
                    type="text"
                    placeholder={t('approvals.action_note_placeholder', 'Nhập ghi chú hoặc lý do nếu từ chối...')}
                    value={actionNote}
                    onChange={(e) => setActionNote(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:border-blue-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => handleReject(selectedApproval.id)}
                    disabled={actionLoading}
                    className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>{t('approvals.reject_btn', 'Từ Chối')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleApprove(selectedApproval.id)}
                    disabled={actionLoading}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    <span>{t('approvals.approve_btn', 'Phê Duyệt')}</span>
                  </button>
                </div>
              </div>
            )}

            {/* IT Admin Mark as Delivered button */}
            {selectedApproval.status === 'APPROVED' && isAdmin && (
              <div className="pt-3 border-t border-slate-100 flex justify-end">
                <button
                  type="button"
                  onClick={() => handleMarkDelivered(selectedApproval.id)}
                  disabled={actionLoading}
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-md shadow-teal-600/20 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <PackageCheck className="w-4 h-4" />
                  <span>{t('approvals.confirm_delivery_btn', 'Xác Nhận Đã Bàn Giao Thiết Bị / Bản Quyền')}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
