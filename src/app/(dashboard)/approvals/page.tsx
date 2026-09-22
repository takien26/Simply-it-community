'use client';

import { useState, useEffect, useRef } from 'react';
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
  ChevronDown,
  Sparkles,
  Building2,
  Send,
  Paperclip,
  ImageIcon,
  Trash2,
  ExternalLink,
  File,
  UploadCloud,
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
  requester?: { id: string; fullName: string; email: string; department?: string; position?: string; managerId?: string };
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

  // ESC key listener to close active modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isCreateOpen) setIsCreateOpen(false);
        else if (isDetailOpen) setIsDetailOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCreateOpen, isDetailOpen]);

  // Form states for creation
  const [formType, setFormType] = useState('NEW_DEVICE');
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formJustification, setFormJustification] = useState('');
  const [formCost, setFormCost] = useState('');
  const [formQty, setFormQty] = useState('1');
  const [creating, setCreating] = useState(false);
  const [formManagerId, setFormManagerId] = useState('');
  const [managerSearch, setManagerSearch] = useState('');
  const [isManagerDropdownOpen, setIsManagerDropdownOpen] = useState(false);

  // Attachment & AI states
  const [attachments, setAttachments] = useState<Array<{ url: string; name: string; size?: number; type?: string }>>([]);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [aiParsingQuote, setAiParsingQuote] = useState(false);
  const isPastingRef = useRef(false);

  // Helper to parse attachments from description string
  const parseAttachments = (desc?: string) => {
    if (!desc) return { cleanDesc: '', attachments: [] };
    const match = desc.match(/<!-- ATTACHMENTS_JSON:\s*([\s\S]*?)\s*-->/);
    if (!match) return { cleanDesc: desc, attachments: [] };
    try {
      const atts = JSON.parse(match[1]);
      const clean = desc.replace(/<!-- ATTACHMENTS_JSON:\s*([\s\S]*?)\s*-->/, '').trim();
      return { cleanDesc: clean, attachments: Array.isArray(atts) ? atts : [] };
    } catch {
      return { cleanDesc: desc, attachments: [] };
    }
  };

  // Action states
  const [actionNote, setActionNote] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [usersList, setUsersList] = useState<any[]>([]);

  // IT Forwarding states
  const [isForwardOpen, setIsForwardOpen] = useState(false);
  const [forwardManagerId, setForwardManagerId] = useState('');
  const [forwardNote, setForwardNote] = useState('');

  useEffect(() => {
    loadCurrentUser();
    loadApprovals();
    loadUsers();
  }, []);

  const handleOpenCreate = () => {
    setIsCreateOpen(true);
    setManagerSearch('');
    setIsManagerDropdownOpen(false);
    setAttachments([]);
    loadUsers();
    if (currentUser?.managerId) {
      setFormManagerId(currentUser.managerId);
    } else {
      setFormManagerId('');
    }
  };

  // AI Quote Parsing
  const runAiQuoteParse = async (fileUrl: string) => {
    setAiParsingQuote(true);
    try {
      const res = await fetch('/api/approvals/ai-parse-quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileUrl, text: formJustification }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        if (data.data.title && !formTitle.trim()) {
          setFormTitle(data.data.title);
        }
        if (data.data.estimatedCost) {
          setFormCost(String(data.data.estimatedCost));
        }
        if (data.data.quantity) {
          setFormQty(String(data.data.quantity));
        }
        if (data.data.justification && !formJustification.trim()) {
          setFormJustification(data.data.justification);
        }
        if (data.data.type && TYPE_CONFIG[data.data.type]) {
          setFormType(data.data.type);
        }
      } else {
        alert(data.error || (language === 'en' ? 'AI could not extract quote details' : 'AI không trích xuất được thông tin báo giá.'));
      }
    } catch (err: any) {
      alert(err.message || (language === 'en' ? 'AI connection error' : 'Lỗi kết nối AI'));
    } finally {
      setAiParsingQuote(false);
    }
  };

  // Clipboard Paste Handler for Ctrl + V screenshots
  const handlePasteImage = async (e: React.ClipboardEvent) => {
    if (isPastingRef.current) return;

    const items = e.clipboardData?.items;
    if (!items) return;

    let imageItem: DataTransferItem | null = null;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type && items[i].type.startsWith('image/')) {
        imageItem = items[i];
        break;
      }
    }
    if (!imageItem) return;

    e.preventDefault();
    const file = imageItem.getAsFile();
    if (!file) return;

    isPastingRef.current = true;
    setTimeout(() => {
      isPastingRef.current = false;
    }, 600);

    const formData = new FormData();
    const customName = `quote_screenshot_${Date.now()}.png`;
    formData.append('file', file, customName);
    formData.append('category', 'approvals');

    setUploadingFile(true);
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (res.ok && data.url) {
        const newAtt = { url: data.url, name: data.originalName || customName, size: file.size, type: file.type || 'image/png' };
        setAttachments((prev) => [...prev, newAtt]);
        if (!formTitle.trim()) {
          runAiQuoteParse(data.url);
        }
      } else {
        alert(data.error || (language === 'en' ? 'Failed to upload pasted image' : 'Dán ảnh thất bại'));
      }
    } catch {
      alert(language === 'en' ? 'Connection error uploading screenshot' : 'Lỗi kết nối khi tải ảnh dán');
    } finally {
      setUploadingFile(false);
    }
  };

  // File Upload Handlers
  const handleUploadFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploadingFile(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append('file', file);
        formData.append('category', 'approvals');
        const res = await fetch('/api/upload', { method: 'POST', body: formData });
        const data = await res.json();
        if (res.ok && data.url) {
          const newAtt = { url: data.url, name: data.originalName || file.name, size: file.size, type: file.type };
          setAttachments((prev) => [...prev, newAtt]);
          if (!formTitle.trim()) {
            runAiQuoteParse(data.url);
          }
        }
      }
    } catch {
      alert(language === 'en' ? 'Connection error uploading files' : 'Lỗi kết nối khi tải file');
    } finally {
      setUploadingFile(false);
      e.target.value = '';
    }
  };

  const loadCurrentUser = async () => {
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      if (data.success) {
        setCurrentUser(data.data);
        if (data.data?.managerId && !formManagerId) {
          setFormManagerId(data.data.managerId);
        }
      }
    } catch {}
  };

  const loadUsers = async () => {
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      let list: any[] = [];
      if (Array.isArray(data.data)) {
        list = data.data;
      } else if (Array.isArray(data.users)) {
        list = data.users;
      } else if (Array.isArray(data)) {
        list = data;
      }

      // If empty or failed, fallback to master-data
      if (list.length === 0) {
        const mdRes = await fetch('/api/master-data');
        const md = await mdRes.json();
        if (Array.isArray(md.users)) list = md.users;
      }

      setUsersList(list);
    } catch (e) {
      console.error('Error loading users:', e);
    }
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
          attachments: attachments.length > 0 ? attachments : undefined,
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
        setAttachments([]);
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

  const handleRemoveAttachment = (idx: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleDropFiles = async (e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer?.files;
    if (!files || files.length === 0) return;
    setUploadingFile(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append('file', file);
        formData.append('category', 'approvals');
        const res = await fetch('/api/upload', { method: 'POST', body: formData });
        const data = await res.json();
        if (res.ok && data.url) {
          const newAtt = { url: data.url, name: data.originalName || file.name, size: file.size, type: file.type };
          setAttachments((prev) => [...prev, newAtt]);
          if (!formTitle.trim()) {
            runAiQuoteParse(data.url);
          }
        }
      }
    } catch {
      alert(language === 'en' ? 'Connection error uploading files' : 'Lỗi kết nối khi tải file');
    } finally {
      setUploadingFile(false);
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

  const handleForwardToManager = async (id: string) => {
    if (!forwardManagerId) {
      alert(language === 'en' ? 'Please select a manager to forward to!' : 'Vui lòng chọn Cấp trên phê duyệt!');
      return;
    }
    setActionLoading(true);
    try {
      const res = await fetch(`/api/approvals/${id}/forward`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          managerId: forwardManagerId,
          note: forwardNote.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setIsForwardOpen(false);
        setIsDetailOpen(false);
        setForwardNote('');
        setForwardManagerId('');
        loadApprovals();
      } else {
        alert(data.error || (language === 'en' ? 'Forwarding failed' : 'Chuyển tiếp thất bại'));
      }
    } catch (e: any) {
      alert(e.message || (language === 'en' ? 'Forwarding error' : 'Lỗi chuyển tiếp'));
    } finally {
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

  const userRole = currentUser?.role?.name || currentUser?.roleName || '';
  const isAdmin = userRole === 'Super Admin' || userRole === 'Admin' || userRole === 'Asset Manager';

  // Manager combobox filtering & grouping
  const eligibleManagers = usersList.filter(
    (u) => u.id !== currentUser?.id && u.id !== currentUser?.userId
  );

  const filteredManagers = eligibleManagers.filter((u) => {
    if (!managerSearch.trim()) return true;
    const term = managerSearch.toLowerCase().trim();
    return (
      (u.fullName && u.fullName.toLowerCase().includes(term)) ||
      (u.email && u.email.toLowerCase().includes(term)) ||
      (u.department && u.department.toLowerCase().includes(term)) ||
      (u.position && u.position.toLowerCase().includes(term))
    );
  });

  const selectedManager =
    usersList.find((u) => u.id === formManagerId) ||
    (currentUser?.manager?.id === formManagerId ? currentUser.manager : null);
  const isAutoDetectedManager = Boolean(currentUser?.managerId && currentUser.managerId === formManagerId);

  const deptManagers = filteredManagers.filter(
    (u) => currentUser?.department && u.department && u.department.toLowerCase() === currentUser.department.toLowerCase()
  );
  const otherManagers = filteredManagers.filter(
    (u) => !currentUser?.department || !u.department || u.department.toLowerCase() !== currentUser.department.toLowerCase()
  );

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
          onClick={handleOpenCreate}
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
            <button
              type="button"
              onClick={handleOpenCreate}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/20 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t('approvals.create_btn', 'Tạo Yêu Cầu Mới')}</span>
            </button>
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
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4"
          onPaste={handlePasteImage}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full p-6 sm:p-7 space-y-5 border border-slate-200 animate-in fade-in zoom-in-95 max-h-[92vh] overflow-y-auto"
            onPaste={handlePasteImage}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-base sm:text-lg text-slate-900">
                      {t('approvals.modal_create_title', 'Tạo Yêu Cầu Phê Duyệt')}
                    </h3>
                    <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                      <Sparkles className="w-3 h-3 text-indigo-500" />
                      {language === 'en' ? 'Ctrl+V & AI Quote Parser' : 'Hỗ trợ dán ảnh & AI đọc báo giá'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    {t('approvals.modal_create_sub', 'Gửi yêu cầu cấp phát thiết bị hoặc phần mềm bản quyền')}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-xs">
                {/* LEFT COLUMN: Request Information & Attachments (lg:col-span-7) */}
                <div className="lg:col-span-7 space-y-4">
                  {/* Type */}
                  <div>
                    <label className="block font-bold text-slate-700 mb-1.5">
                      {t('approvals.field_type', 'Loại yêu cầu')} <span className="text-rose-500">*</span>
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
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
                                ? 'border-blue-600 bg-blue-50/80 text-blue-700 font-bold ring-2 ring-blue-500/10 shadow-xs'
                                : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                            }`}
                          >
                            <Icon className="w-4 h-4 shrink-0" />
                            <span className="truncate text-xs">{label}</span>
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
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-blue-500 font-semibold text-slate-800"
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
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-blue-500 resize-none text-slate-800"
                    />
                  </div>

                  {/* Dropzone & Ctrl+V area for Quote / Images */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="block font-bold text-slate-700 text-xs">
                        {language === 'en' ? 'Attachments & Quotation Proof' : 'Đính kèm báo giá & Tài liệu liên quan'}
                      </label>
                      <span className="text-[11px] text-slate-400">
                        {language === 'en' ? 'Drag & drop or Ctrl+V anywhere' : 'Kéo thả hoặc Ctrl+V dán nhanh'}
                      </span>
                    </div>

                    {/* Drag Drop Area */}
                    <div
                      onDrop={handleDropFiles}
                      onDragOver={(e) => e.preventDefault()}
                      className="relative border-2 border-dashed border-slate-200 hover:border-blue-400 bg-slate-50/70 hover:bg-blue-50/30 rounded-2xl p-4 text-center transition-all group"
                    >
                      <input
                        type="file"
                        id="approval-file-upload"
                        multiple
                        onChange={handleUploadFiles}
                        className="hidden"
                      />
                      <label
                        htmlFor="approval-file-upload"
                        className="flex flex-col items-center justify-center cursor-pointer space-y-1.5"
                      >
                        <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                          <UploadCloud className="w-5 h-5" />
                        </div>
                        <p className="text-xs font-bold text-slate-700">
                          {language === 'en'
                            ? 'Click to upload or drag & drop files here'
                            : 'Bấm chọn tệp hoặc kéo thả file báo giá vào đây'}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          {language === 'en'
                            ? 'Support Images (PNG, JPG), PDF, Office. You can also press Ctrl + V to paste screenshots.'
                            : 'Hỗ trợ PNG, JPG, PDF, Excel, Word. Bạn cũng có thể bấm Ctrl + V để dán ảnh chụp màn hình.'}
                        </p>
                      </label>

                      {uploadingFile && (
                        <div className="absolute inset-0 bg-white/90 rounded-2xl flex items-center justify-center gap-2 text-blue-600 font-bold text-xs backdrop-blur-xs">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>{language === 'en' ? 'Uploading files...' : 'Đang tải tệp lên...'}</span>
                        </div>
                      )}

                      {aiParsingQuote && (
                        <div className="absolute inset-0 bg-white/90 rounded-2xl flex items-center justify-center gap-2 text-indigo-700 font-bold text-xs backdrop-blur-xs">
                          <Sparkles className="w-4 h-4 text-indigo-500 animate-pulse" />
                          <span>{language === 'en' ? 'AI reading quotation & specs...' : 'AI đang đọc báo giá & trích xuất thông số...'}</span>
                        </div>
                      )}
                    </div>

                    {/* Attachment preview list */}
                    {attachments.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 px-1">
                          <span>{language === 'en' ? `Attached (${attachments.length})` : `Tệp đã đính kèm (${attachments.length})`}</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {attachments.map((att, idx) => {
                            const isImg = att.type?.startsWith('image/') || /\.(png|jpe?g|webp|gif)$/i.test(att.url);
                            return (
                              <div
                                key={idx}
                                className="flex items-center gap-2.5 p-2 bg-slate-50 border border-slate-200 rounded-xl hover:border-slate-300 transition-all group"
                              >
                                {isImg ? (
                                  <div className="w-10 h-10 rounded-lg bg-slate-200 overflow-hidden shrink-0 border border-slate-200">
                                    <img src={att.url} alt={att.name} className="w-full h-full object-cover" />
                                  </div>
                                ) : (
                                  <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                                    <File className="w-5 h-5" />
                                  </div>
                                )}
                                <div className="min-w-0 flex-1 text-left">
                                  <p className="text-xs font-semibold text-slate-800 truncate" title={att.name}>
                                    {att.name}
                                  </p>
                                  <div className="flex items-center gap-2 text-[10px] text-slate-400">
                                    {att.size && <span>{(att.size / 1024).toFixed(0)} KB</span>}
                                    <a
                                      href={att.url}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-blue-600 hover:underline inline-flex items-center gap-0.5"
                                    >
                                      <span>Xem</span>
                                      <ExternalLink className="w-2.5 h-2.5" />
                                    </a>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                  {isImg && (
                                    <button
                                      type="button"
                                      onClick={() => runAiQuoteParse(att.url)}
                                      disabled={aiParsingQuote}
                                      title={language === 'en' ? 'AI scan this quote' : 'AI quét báo giá này'}
                                      className="p-1 rounded-lg text-indigo-600 hover:bg-indigo-50 cursor-pointer disabled:opacity-50"
                                    >
                                      <Sparkles className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveAttachment(idx)}
                                    title={language === 'en' ? 'Remove' : 'Xóa file'}
                                    className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* RIGHT COLUMN: Quantity, Cost, Smart Approver Routing & Rules (lg:col-span-5) */}
                <div className="lg:col-span-5 space-y-4 bg-slate-50/50 p-4.5 rounded-2xl border border-slate-100">
                  {/* Quantity & Estimated Cost */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1.5">
                        {t('approvals.field_quantity', 'Số lượng')} <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={formQty}
                        onChange={(e) => setFormQty(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-500 font-semibold text-slate-800"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1.5">
                        {t('approvals.field_cost', 'Dự toán (VND)')}
                      </label>
                      <input
                        type="number"
                        placeholder="VD: 25000000"
                        value={formCost}
                        onChange={(e) => setFormCost(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-500 font-semibold text-slate-800"
                      />
                    </div>
                  </div>

                  {/* Smart Direct Manager Selector */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="block font-bold text-slate-700 text-xs">
                        {t('approvals.field_manager', 'Cấp trên trực tiếp duyệt')}
                      </label>
                      {isAutoDetectedManager && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                          <Sparkles className="w-3 h-3 text-blue-500" />
                          {language === 'en' ? 'Auto-detected' : 'Tự động nhận diện'}
                        </span>
                      )}
                    </div>

                    {/* Selected Manager Trigger Box */}
                    <div className="relative">
                      <div
                        onClick={() => setIsManagerDropdownOpen(!isManagerDropdownOpen)}
                        className={`w-full p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                          isManagerDropdownOpen
                            ? 'border-blue-500 ring-2 ring-blue-500/20 bg-white'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        {formManagerId && selectedManager ? (
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center shrink-0 border border-blue-200">
                              {(selectedManager.fullName || 'QL').slice(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0 text-left">
                              <p className="text-xs font-bold text-slate-800 truncate flex items-center gap-1.5">
                                <span>{selectedManager.fullName}</span>
                                {selectedManager.id === currentUser?.managerId && (
                                  <span className="text-[9px] bg-blue-100 text-blue-700 px-1.5 py-0.2 rounded font-bold">Sếp trực tiếp</span>
                                )}
                              </p>
                              <p className="text-[10px] text-slate-500 truncate">
                                {selectedManager.department ? `${selectedManager.department} • ` : ''}
                                {selectedManager.position || selectedManager.email}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2.5 min-w-0 text-left">
                            <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center shrink-0">
                              <Shield className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="text-xs font-bold text-slate-700">
                                {t('approvals.field_manager_direct_it', 'Gửi thẳng cho Quản trị viên IT')}
                              </p>
                              <p className="text-[10px] text-slate-400">
                                {language === 'en' ? 'Bypass manager (Urgent / Minor)' : 'Bỏ qua cấp trên (Cần gấp, linh kiện nhỏ)'}
                              </p>
                            </div>
                          </div>
                        )}

                        <div className="flex items-center gap-1.5 shrink-0 text-slate-400">
                          <span className="text-[11px] font-semibold text-blue-600 hover:underline">
                            {isManagerDropdownOpen ? (language === 'en' ? 'Close' : 'Đóng') : (language === 'en' ? 'Change' : 'Chọn/Đổi')}
                          </span>
                          <ChevronDown className={`w-4 h-4 transition-transform ${isManagerDropdownOpen ? 'rotate-180' : ''}`} />
                        </div>
                      </div>

                      {/* Dropdown Menu with Search */}
                      {isManagerDropdownOpen && (
                        <div className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-2xl shadow-xl border border-slate-200 z-50 p-2 space-y-2 animate-in fade-in zoom-in-95">
                          {/* Search Input */}
                          <div className="relative">
                            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                              type="text"
                              autoFocus
                              value={managerSearch}
                              onChange={(e) => setManagerSearch(e.target.value)}
                              placeholder={language === 'en' ? 'Search by name, email, department...' : 'Gõ họ tên, email, phòng ban, chức danh...'}
                              className="w-full pl-8.5 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:border-blue-500 font-medium"
                            />
                            {managerSearch && (
                              <button
                                type="button"
                                onClick={() => setManagerSearch('')}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>

                          {/* Options list */}
                          <div className="max-h-56 overflow-y-auto space-y-1">
                            {/* Option: Direct IT */}
                            <button
                              type="button"
                              onClick={() => {
                                setFormManagerId('');
                                setIsManagerDropdownOpen(false);
                              }}
                              className={`w-full p-2 rounded-xl text-left flex items-center justify-between transition-colors cursor-pointer ${
                                !formManagerId ? 'bg-blue-50/80 text-blue-900 font-bold border border-blue-200' : 'hover:bg-slate-50 text-slate-700'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                                  <Shield className="w-3.5 h-3.5" />
                                </div>
                                <div>
                                  <p className="text-xs font-bold">{t('approvals.field_manager_direct_it', 'Gửi thẳng cho Quản trị viên IT')}</p>
                                  <p className="text-[10px] text-slate-500">{language === 'en' ? 'Suitable for urgent replacements / accessories' : 'Thích hợp cho đổi phụ kiện, chuột/phím, cần gấp'}</p>
                                </div>
                              </div>
                              {!formManagerId && <Check className="w-4 h-4 text-blue-600 shrink-0" />}
                            </button>

                            {/* Group: Same Department */}
                            {deptManagers.length > 0 && (
                              <div className="pt-1.5">
                                <p className="text-[10px] font-bold text-slate-400 px-2 py-0.5 uppercase tracking-wider flex items-center gap-1">
                                  <Building2 className="w-3 h-3" />
                                  <span>{language === 'en' ? 'Same Department' : 'Cùng phòng ban'} ({currentUser?.department})</span>
                                </p>
                                {deptManagers.map((u) => {
                                  const isSelected = formManagerId === u.id;
                                  const isProfileManager = u.id === currentUser?.managerId;
                                  return (
                                    <button
                                      key={u.id}
                                      type="button"
                                      onClick={() => {
                                        setFormManagerId(u.id);
                                        setIsManagerDropdownOpen(false);
                                      }}
                                      className={`w-full p-2 rounded-xl text-left flex items-center justify-between transition-colors cursor-pointer ${
                                        isSelected ? 'bg-blue-50 text-blue-900 font-bold border border-blue-200' : 'hover:bg-slate-50 text-slate-700'
                                      }`}
                                    >
                                      <div className="flex items-center gap-2 min-w-0">
                                        <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 text-[10px] font-bold flex items-center justify-center shrink-0">
                                          {(u.fullName || 'NV').slice(0, 2).toUpperCase()}
                                        </div>
                                        <div className="min-w-0">
                                          <p className="text-xs font-semibold truncate flex items-center gap-1.5">
                                            <span>{u.fullName}</span>
                                            {isProfileManager && (
                                              <span className="text-[9px] bg-blue-100 text-blue-700 px-1 py-0.2 rounded font-bold">Cấp trên của bạn</span>
                                            )}
                                          </p>
                                          <p className="text-[10px] text-slate-400 truncate">
                                            {u.position ? `${u.position} • ` : ''}{u.email}
                                          </p>
                                        </div>
                                      </div>
                                      {isSelected && <Check className="w-4 h-4 text-blue-600 shrink-0" />}
                                    </button>
                                  );
                                })}
                              </div>
                            )}

                            {/* Group: Other Managers/Users */}
                            {otherManagers.length > 0 && (
                              <div className="pt-1.5">
                                <p className="text-[10px] font-bold text-slate-400 px-2 py-0.5 uppercase tracking-wider">
                                  {deptManagers.length > 0 ? (language === 'en' ? 'Other Staff / Leaders' : 'Nhân sự / Quản lý khác') : (language === 'en' ? 'All Staff / Leaders' : 'Tất cả nhân sự / Cấp quản lý')}
                                </p>
                                {otherManagers.map((u) => {
                                  const isSelected = formManagerId === u.id;
                                  const isProfileManager = u.id === currentUser?.managerId;
                                  return (
                                    <button
                                      key={u.id}
                                      type="button"
                                      onClick={() => {
                                        setFormManagerId(u.id);
                                        setIsManagerDropdownOpen(false);
                                      }}
                                      className={`w-full p-2 rounded-xl text-left flex items-center justify-between transition-colors cursor-pointer ${
                                        isSelected ? 'bg-blue-50 text-blue-900 font-bold border border-blue-200' : 'hover:bg-slate-50 text-slate-700'
                                      }`}
                                    >
                                      <div className="flex items-center gap-2 min-w-0">
                                        <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 text-[10px] font-bold flex items-center justify-center shrink-0">
                                          {(u.fullName || 'NV').slice(0, 2).toUpperCase()}
                                        </div>
                                        <div className="min-w-0">
                                          <p className="text-xs font-semibold truncate flex items-center gap-1.5">
                                            <span>{u.fullName}</span>
                                            {isProfileManager && (
                                              <span className="text-[9px] bg-blue-100 text-blue-700 px-1 py-0.2 rounded font-bold">Cấp trên của bạn</span>
                                            )}
                                          </p>
                                          <p className="text-[10px] text-slate-400 truncate">
                                            {u.department ? `${u.department} • ` : ''}{u.position || u.email}
                                          </p>
                                        </div>
                                      </div>
                                      {isSelected && <Check className="w-4 h-4 text-blue-600 shrink-0" />}
                                    </button>
                                  );
                                })}
                              </div>
                            )}

                            {filteredManagers.length === 0 && (
                              <div className="py-4 text-center text-xs text-slate-400">
                                {language === 'en' ? 'No matching staff found' : 'Không tìm thấy nhân sự phù hợp'}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Guidance / Warnings */}
                    {isAutoDetectedManager && (
                      <div className="flex items-center gap-1.5 text-[11px] text-blue-700 bg-blue-50/80 px-3 py-1.5 rounded-xl border border-blue-100">
                        <Sparkles className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                        <span>Hệ thống tự động điền Cấp trên trực tiếp từ hồ sơ. Bạn vẫn có thể bấm đổi người khác hoặc gửi thẳng IT nếu cần.</span>
                      </div>
                    )}

                    {(formType === 'NEW_DEVICE' || formType === 'SOFTWARE_LICENSE') && !formManagerId && (
                      <div className="flex items-start gap-2 text-[11px] text-amber-800 bg-amber-50 px-3 py-2 rounded-xl border border-amber-200">
                        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <strong className="font-bold">Khuyến nghị chọn Cấp trên phê duyệt:</strong> Với thiết bị mới hoặc bản quyền có phí, IT Admin có thể sẽ chuyển tiếp lại cho Cấp trên của bạn duyệt ngân sách trước khi xuất kho.
                        </div>
                      </div>
                    )}

                    {(formType === 'NEW_DEVICE' || formType === 'SOFTWARE_LICENSE') && formManagerId && (
                      <div className="flex items-center gap-2 text-[11px] text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>Yêu cầu sẽ chuyển tới Cấp trên để duyệt ngân sách trước, sau đó IT tiến hành chuẩn bị & bàn giao.</span>
                      </div>
                    )}
                  </div>

                  {/* 3-Step Approval Process Card */}
                  <div className="pt-2 border-t border-slate-200/60">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                      {language === 'en' ? 'Standard 3-Step Approval Workflow' : 'Quy trình xét duyệt chuẩn'}
                    </p>
                    <div className="space-y-2 text-xs">
                      <div className="flex items-center gap-2.5 p-2 bg-white rounded-xl border border-slate-200">
                        <div className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 font-bold text-[10px] flex items-center justify-center shrink-0">
                          1
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-800">
                            {formManagerId ? (language === 'en' ? 'Direct Manager Approval' : 'Cấp trên duyệt ngân sách') : (language === 'en' ? 'Direct IT Route (Bypassed)' : 'Gửi thẳng IT (Bỏ qua cấp trên)')}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {formManagerId ? (selectedManager?.fullName || 'Người quản lý') : 'IT Admin tiếp nhận trực tiếp'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 p-2 bg-white rounded-xl border border-slate-200">
                        <div className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-800 font-bold text-[10px] flex items-center justify-center shrink-0">
                          2
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-800">{language === 'en' ? 'IT Admin Verification' : 'IT Admin thẩm định kỹ thuật'}</p>
                          <p className="text-[10px] text-slate-400">{language === 'en' ? 'Technical feasibility & procurement' : 'Kiểm tra kho & xuất mua sắm'}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 p-2 bg-white rounded-xl border border-slate-200">
                        <div className="w-5 h-5 rounded-full bg-teal-100 text-teal-800 font-bold text-[10px] flex items-center justify-center shrink-0">
                          3
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-800">{language === 'en' ? 'Delivery & Handover' : 'Bàn giao thiết bị / bản quyền'}</p>
                          <p className="text-[10px] text-slate-400">{language === 'en' ? 'Assigned to requester asset list' : 'Cập nhật tài sản vào tài khoản nhân viên'}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  {t('common.cancel', 'Hủy')}
                </button>
                <button
                  type="submit"
                  disabled={creating || uploadingFile}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl font-bold shadow-md shadow-blue-600/20 cursor-pointer flex items-center gap-2 transition-all"
                >
                  {creating && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>{t('approvals.submit_btn', 'Gửi Yêu Cầu Phê Duyệt')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DETAIL / APPROVE / REJECT */}
      {isDetailOpen && selectedApproval && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full p-6 sm:p-7 space-y-5 border border-slate-200 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
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
                <h3 className="font-bold text-base sm:text-lg text-slate-900 mt-1">{selectedApproval.title}</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsDetailOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer transition-colors"
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
            <div className="space-y-3 text-xs">
              <div className="p-3.5 bg-slate-50 rounded-2xl space-y-1.5 border border-slate-100">
                <p><strong>{t('approvals.requester', 'Người yêu cầu')}:</strong> {selectedApproval.requester?.fullName} ({selectedApproval.requester?.email})</p>
                {selectedApproval.requester?.department && <p><strong>{t('approvals.department', 'Phòng ban')}:</strong> {selectedApproval.requester.department}</p>}
                <p>
                  <strong>{language === 'en' ? 'Approving Manager' : 'Cấp trên phê duyệt'}:</strong>{' '}
                  {selectedApproval.manager ? (
                    <span className="font-semibold text-slate-800">{selectedApproval.manager.fullName} ({selectedApproval.manager.email})</span>
                  ) : (
                    <span className="text-slate-500 italic">
                      {language === 'en' ? 'Route directly to IT (Bypassed manager)' : 'Gửi thẳng IT (Không qua Cấp trên)'}
                    </span>
                  )}
                </p>
                <p><strong>{t('approvals.field_quantity', 'Số lượng')}:</strong> {selectedApproval.quantity}</p>
                {selectedApproval.estimatedCost && (
                  <p><strong>{t('approvals.estimated_budget', 'Dự toán')}:</strong> {Number(selectedApproval.estimatedCost).toLocaleString(language === 'en' ? 'en-US' : 'vi-VN')} {selectedApproval.currency}</p>
                )}
                {selectedApproval.justification && (
                  <p className="pt-1 text-slate-600"><strong>{t('approvals.reason', 'Lý do')}:</strong> {selectedApproval.justification}</p>
                )}
              </div>

              {/* Attachments & Full Description in Detail Modal */}
              {(() => {
                const { cleanDesc, attachments: attList } = parseAttachments(selectedApproval.description);
                return (
                  <>
                    {cleanDesc && (
                      <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 text-slate-700">
                        <p className="font-bold mb-1">{t('approvals.description', 'Mô tả chi tiết')}:</p>
                        <p className="text-slate-600 whitespace-pre-line">{cleanDesc}</p>
                      </div>
                    )}

                    {attList.length > 0 && (
                      <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-2.5">
                        <p className="font-bold text-slate-800 flex items-center gap-1.5">
                          <Paperclip className="w-4 h-4 text-blue-600" />
                          <span>{language === 'en' ? `Attachments & Quotes (${attList.length})` : `Tài liệu & Báo giá đính kèm (${attList.length})`}</span>
                        </p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
                          {attList.map((att: any, idx: number) => {
                            const isImg = att.type?.startsWith('image/') || /\.(png|jpe?g|webp|gif)$/i.test(att.url);
                            return (
                              <a
                                key={idx}
                                href={att.url}
                                target="_blank"
                                rel="noreferrer"
                                className="group block p-2.5 bg-white rounded-xl border border-slate-200 hover:border-blue-400 hover:shadow-sm transition-all text-left"
                              >
                                {isImg ? (
                                  <div className="w-full h-24 rounded-lg bg-slate-100 overflow-hidden mb-1.5 border border-slate-100 flex items-center justify-center">
                                    <img src={att.url} alt={att.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                                  </div>
                                ) : (
                                  <div className="w-full h-24 rounded-lg bg-blue-50 text-blue-600 flex flex-col items-center justify-center mb-1.5 border border-blue-100">
                                    <File className="w-7 h-7 mb-1" />
                                    <span className="text-[10px] font-bold uppercase">{att.name.split('.').pop() || 'FILE'}</span>
                                  </div>
                                )}
                                <p className="text-[11px] font-bold text-slate-700 truncate group-hover:text-blue-600 flex items-center gap-1">
                                  <span className="truncate">{att.name}</span>
                                  <ExternalLink className="w-3 h-3 shrink-0 text-slate-400 group-hover:text-blue-600" />
                                </p>
                                {att.size && (
                                  <p className="text-[10px] text-slate-400">
                                    {(att.size / 1024).toFixed(0)} KB
                                  </p>
                                )}
                              </a>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}

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
                  <p className="mt-0.5 whitespace-pre-line">{selectedApproval.itNote}</p>
                </div>
              )}

              {selectedApproval.rejectedReason && (
                <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-rose-900">
                  <p className="font-bold">{t('approvals.reason_rejected', 'Lý do từ chối')}:</p>
                  <p className="mt-0.5">{selectedApproval.rejectedReason}</p>
                </div>
              )}
            </div>

            {/* IT Admin Forward Panel */}
            {selectedApproval.status === 'PENDING_IT' && isAdmin && isForwardOpen && (
              <div className="p-4 bg-amber-50/90 border border-amber-300 rounded-2xl space-y-3 animate-in fade-in">
                <div className="flex items-center justify-between pb-2 border-b border-amber-200">
                  <div className="flex items-center gap-2 text-amber-950 font-bold text-xs">
                    <Send className="w-4 h-4 text-amber-600" />
                    <span>{language === 'en' ? 'Forward to Direct Manager for budget approval' : 'Chuyển tiếp cho Cấp trên của nhân sự duyệt ngân sách'}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsForwardOpen(false)}
                    className="text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    {language === 'en' ? 'Select Manager / Dept Head' : 'Chọn Cấp trên / Trưởng bộ phận phê duyệt'} <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={forwardManagerId}
                    onChange={(e) => setForwardManagerId(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:border-amber-500 cursor-pointer"
                  >
                    <option value="">-- {language === 'en' ? 'Select Manager' : 'Chọn Cấp trên'} --</option>
                    {usersList
                      .filter((u) => u.id !== selectedApproval.requesterId)
                      .map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.fullName} ({u.department || u.email}) {u.position ? ` - ${u.position}` : ''}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    {language === 'en' ? 'IT Coordinator Note' : 'Ghi chú điều phối IT gửi Cấp trên'}
                  </label>
                  <input
                    type="text"
                    placeholder={language === 'en' ? 'e.g. Please confirm budget approval before IT prepares equipment...' : 'VD: Nhờ anh/chị xác nhận ngân sách phòng ban trước khi IT xuất kho mua sắm...'}
                    value={forwardNote}
                    onChange={(e) => setForwardNote(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-amber-500"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsForwardOpen(false)}
                    className="px-3.5 py-1.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                  >
                    {language === 'en' ? 'Cancel' : 'Hủy'}
                  </button>
                  <button
                    type="button"
                    disabled={actionLoading || !forwardManagerId}
                    onClick={() => handleForwardToManager(selectedApproval.id)}
                    className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    {actionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>{language === 'en' ? 'Confirm Forward' : 'Xác Nhận Chuyển Duyệt'}</span>
                  </button>
                </div>
              </div>
            )}

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

                <div className="flex items-center justify-between gap-2 flex-wrap">
                  {selectedApproval.status === 'PENDING_IT' && isAdmin && !isForwardOpen && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsForwardOpen(true);
                        setForwardManagerId(selectedApproval.requester?.managerId || '');
                      }}
                      disabled={actionLoading}
                      className="px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <ArrowRight className="w-3.5 h-3.5 text-amber-600" />
                      <span>{language === 'en' ? 'Forward to Manager' : 'Chuyển Cấp Trên Duyệt'}</span>
                    </button>
                  )}

                  <div className="flex items-center gap-2 ml-auto">
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
