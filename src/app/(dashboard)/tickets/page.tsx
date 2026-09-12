'use client';

import { QuickLink } from '@/components/common/QuickLink';
import { MaintenanceSchedulesTab } from '@/components/settings/maintenance-schedules-tab';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/lib/i18n/context';
import {
  LifeBuoy,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Flame,
  MessageSquare,
  Laptop,
  Send,
  Loader2,
  Trash2,
  X,
  User as UserIcon,
  Filter,
  RotateCcw,
  Sparkles,
  Calendar,
  Building,
  Check,
  Shield,
  Layers,
  ChevronDown,
  ChevronUp,
  Paperclip,
  Image as ImageIcon,
  FileText,
  Download,
  Eye,
  ExternalLink,
  Save,
  BrainCircuit,
  Wrench,
  BarChart3,
  Zap,
  Star,
  BookOpen,
  GitMerge,
  CheckSquare,
  Square,
} from 'lucide-react';

interface Ticket {
  id: string;
  ticketNumber: string;
  title: string;
  description: string;
  category: 'HARDWARE' | 'SOFTWARE' | 'LICENSE' | 'ACCESS_REQUEST' | 'NETWORK' | 'OTHER';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  status: 'OPEN' | 'IN_PROGRESS' | 'WAITING' | 'RESOLVED' | 'CLOSED';
  createdById: string;
  assignedToId?: string | null;
  assetId?: string | null;
  customAssetName?: string | null;
  dueDate?: string | null;
  resolvedAt?: string | null;
  resolutionNotes?: string | null;
  attachmentUrls?: Array<{ url: string; name: string; size?: number; type?: string }> | null;
  rating?: number | null;
  ratingComment?: string | null;
  ratedAt?: string | null;
  actualSpentMinutes?: number;
  teamId?: string | null;
  queueId?: string | null;
  incidentId?: string | null;
  mergedIntoTicketId?: string | null;
  mergedIntoTicket?: { id: string; ticketNumber: string; title: string; status: string } | null;
  mergedTickets?: Array<{ id: string; ticketNumber: string; title: string; status: string; createdAt: string; createdBy?: { id: string; fullName: string } }> | null;
  companyName?: string | null;
  overrideReason?: string | null;
  reassignmentCount?: number | null;
  isAutoRouted?: boolean;
  routedByRule?: string | null;
  team?: { id: string; name: string; code: string } | null;
  queue?: { id: string; name: string; code: string } | null;
  incident?: { id: string; incidentNumber: string; title: string; severity: string; status: string } | null;
  createdAt: string;
  updatedAt: string;
  createdBy: {
    id: string;
    fullName: string;
    email: string;
    department?: string | null;
    avatarUrl?: string | null;
  };
  assignedTo?: {
    id: string;
    fullName: string;
    email: string;
    department?: string | null;
    avatarUrl?: string | null;
  } | null;
  asset?: {
    id: string;
    assetTag: string;
    name: string;
    status: string;
  } | null;
  comments: Array<{
    id: string;
    content: string;
    isInternal: boolean;
    spentMinutes?: number | null;
    createdAt: string;
    user: {
      id: string;
      fullName: string;
      email: string;
      role?: { name: string };
    };
  }>;
}

interface SearchableOption {
  value: string;
  label: string;
  subLabel?: string;
  icon?: string | React.ReactNode;
  badge?: string;
}

interface SearchableDropdownProps {
  label: string;
  value: string;
  options: SearchableOption[];
  onChange: (value: string) => void;
  searchPlaceholder?: string;
  icon?: React.ReactNode;
  highlightColor?: string;
}

function SearchableDropdown({
  label,
  value,
  options,
  onChange,
  searchPlaceholder,
  icon,
}: SearchableDropdownProps) {
  const { language } = useLanguage();
  const isEn = language === 'en';
    const effectivePlaceholder = searchPlaceholder || (language === 'en' ? 'Quick search...' : 'Tìm nhanh...');
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const selectedOption = options.find((o) => o.value === value);

  const filteredOptions = useMemo(() => {
    if (!searchTerm.trim()) return options;
    const q = searchTerm.toLowerCase();
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(q) ||
        (o.subLabel && o.subLabel.toLowerCase().includes(q))
    );
  }, [options, searchTerm]);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          setSearchTerm('');
        }}
        className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-between gap-1.5 transition-all border ${
          value
            ? 'bg-blue-50/80 border-blue-300 text-blue-800 shadow-2xs'
            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
        }`}
      >
        <div className="flex items-center gap-1.5 min-w-0 truncate">
          {icon && <span className="shrink-0 text-slate-500">{icon}</span>}
          <span className="truncate">
            {selectedOption ? (
              <span className="font-bold">{selectedOption.label}</span>
            ) : (
              <span className="text-slate-600">{label}</span>
            )}
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {value && (
            <span
              onClick={(e) => {
                e.stopPropagation();
                onChange('');
              }}
              className="p-0.5 hover:bg-blue-200 rounded-full text-blue-600 hover:text-blue-900 cursor-pointer"
              title={language === 'en' ? 'Clear selection' : 'Xóa lựa chọn'}
            >
              <X className="w-3 h-3" />
            </span>
          )}
          <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {/* Floating Popover with Search Input */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-1 w-64 sm:w-72 bg-white rounded-xl shadow-xl border border-slate-200 z-50 p-2 space-y-1.5 animate-in fade-in zoom-in-95">
          {/* Internal Search Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              ref={inputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={effectivePlaceholder}
              className="w-full pl-8 pr-7 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:bg-white focus:ring-1 focus:ring-blue-500 font-medium"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Options List */}
          <div className="max-h-52 overflow-y-auto space-y-0.5 pr-1">
            {/* Clear / All Option */}
            <button
              type="button"
              onClick={() => {
                onChange('');
                setIsOpen(false);
              }}
              className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between transition-colors ${
                !value ? 'bg-blue-50 text-blue-700 font-bold' : 'hover:bg-slate-50 text-slate-600'
              }`}
            >
              <span className="italic">-- {label} --</span>
              {!value && <Check className="w-3.5 h-3.5 text-blue-600" />}
            </button>

            {filteredOptions.length === 0 ? (
              <div className="text-center py-4 text-xs text-slate-400 italic">
                {language === 'en' ? 'No matching results found' : 'Không tìm thấy kết quả phù hợp'}
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      onChange(opt.value);
                      setIsOpen(false);
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between transition-colors ${
                      isSelected
                        ? 'bg-blue-600 text-white font-bold shadow-2xs'
                        : 'hover:bg-slate-100 text-slate-800'
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center gap-1.5 truncate">
                        {opt.icon && <span>{opt.icon}</span>}
                        <span className="truncate">{opt.label}</span>
                      </div>
                      {opt.subLabel && (
                        <p className={`text-[10px] truncate ${isSelected ? 'text-blue-100' : 'text-slate-400'}`}>
                          {opt.subLabel}
                        </p>
                      )}
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
                  </button>
                );
              })
            )}
          </div>

          {/* Footer Item Count */}
          <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-100 flex items-center justify-between px-1">
            <span>{filteredOptions.length} {language === 'en' ? 'options' : 'lựa chọn'}</span>
            {value && (
              <button
                type="button"
                onClick={() => {
                  onChange('');
                  setIsOpen(false);
                }}
                className="text-rose-600 hover:underline font-semibold"
              >
                {language === 'en' ? 'Reset' : 'Đặt lại'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const CATEGORY_MAP: Record<string, { label: string; icon: string; color: string }> = {
  HARDWARE: { label: 'Hardware', icon: '💻', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  SOFTWARE: { label: 'Software', icon: '💿', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  LICENSE: { label: 'License', icon: '🔑', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  ACCESS_REQUEST: { label: 'Access Request', icon: '🛡️', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  NETWORK: { label: 'Network & Internet', icon: '🌐', color: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
  OTHER: { label: 'Other', icon: '📌', color: 'bg-slate-50 text-slate-700 border-slate-200' },
};

const PRIORITY_MAP: Record<string, { label: string; icon: any; badge: string }> = {
  URGENT: { label: 'Urgent', icon: Flame, badge: 'bg-rose-100 text-rose-800 border-rose-200' },
  HIGH: { label: 'High', icon: AlertTriangle, badge: 'bg-orange-100 text-orange-800 border-orange-200' },
  MEDIUM: { label: 'Medium', icon: Clock, badge: 'bg-amber-100 text-amber-800 border-amber-200' },
  LOW: { label: 'Low', icon: CheckCircle2, badge: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
};

const STATUS_MAP: Record<string, { label: string; badge: string; dot: string }> = {
  OPEN: { label: 'Open', badge: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-500' },
  IN_PROGRESS: { label: 'In Progress', badge: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' },
  WAITING: { label: 'Awaiting Response', badge: 'bg-purple-50 text-purple-700 border-purple-200', dot: 'bg-purple-500' },
  RESOLVED: { label: 'Resolved', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  CLOSED: { label: 'Closed', badge: 'bg-slate-100 text-slate-700 border-slate-200', dot: 'bg-slate-500' },
};
function getCategoryLabel(category: string, lang: string) {
  if (lang === 'en') {
    switch (category) {
      case 'HARDWARE': return 'Hardware';
      case 'SOFTWARE': return 'Software';
      case 'LICENSE': return 'License';
      case 'ACCESS_REQUEST': return 'Access Request';
      case 'NETWORK': return 'Network & Internet';
      default: return 'Other';
    }
  }
  switch (category) {
    case 'HARDWARE': return 'Phần cứng';
    case 'SOFTWARE': return 'Phần mềm';
    case 'LICENSE': return 'License / Bản quyền';
    case 'ACCESS_REQUEST': return 'Cấp quyền truy cập';
    case 'NETWORK': return 'Mạng & Internet';
    default: return 'Khác';
  }
}

function getPriorityLabel(priority: string, lang: string) {
  if (lang === 'en') {
    switch (priority) {
      case 'URGENT': return 'Urgent';
      case 'HIGH': return 'High';
      case 'MEDIUM': return 'Medium';
      case 'LOW': return 'Low';
      default: return priority;
    }
  }
  switch (priority) {
    case 'URGENT': return 'Khẩn cấp';
    case 'HIGH': return 'Cao';
    case 'MEDIUM': return 'Trung bình';
    case 'LOW': return 'Thấp';
    default: return priority;
  }
}

function getStatusLabel(status: string, lang: string) {
  if (lang === 'en') {
    switch (status) {
      case 'OPEN': return 'Open';
      case 'IN_PROGRESS': return 'In Progress';
      case 'WAITING': return 'Pending Response';
      case 'RESOLVED': return 'Resolved';
      case 'CLOSED': return 'Closed';
      default: return status;
    }
  }
  switch (status) {
    case 'OPEN': return 'Mới mở';
    case 'IN_PROGRESS': return 'Đang xử lý';
    case 'WAITING': return 'Chờ phản hồi';
    case 'RESOLVED': return 'Đã giải quyết';
    case 'CLOSED': return 'Đã đóng';
    default: return status;
  }
}


// ==================== TIME TRACKING FORMATTER ====================
function formatSpentTime(minutes?: number | null, isEnLang = false) {
  if (!minutes || minutes <= 0) return isEnLang ? '0m' : '0 phút';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0 && m > 0) return isEnLang ? `${h}h ${m}m` : `${h} giờ ${m} phút`;
  if (h > 0) return isEnLang ? `${h}h` : `${h} giờ`;
  return isEnLang ? `${m}m` : `${m} phút`;
}

// ==================== SLA RULES & TIMELINE CALCULATOR ====================
function getTicketSLA(
  ticket: Ticket,
  slaConfig?: { urgentHours: number; highHours: number; mediumHours: number; lowHours: number },
  lang?: string
) {
  const isEn = lang === 'en';
  const createdAt = new Date(ticket.createdAt);

  const config = slaConfig || { urgentHours: 4, highHours: 24, mediumHours: 48, lowHours: 72 };
  let slaHours = config.mediumHours;
  if (ticket.priority === 'URGENT') slaHours = config.urgentHours;
  else if (ticket.priority === 'HIGH') slaHours = config.highHours;
  else if (ticket.priority === 'MEDIUM') slaHours = config.mediumHours;
  else if (ticket.priority === 'LOW') slaHours = config.lowHours;

  const deadline = (ticket as any).slaDeadline
    ? new Date((ticket as any).slaDeadline)
    : new Date(createdAt.getTime() + slaHours * 60 * 60 * 1000);

  const now = new Date();
  const isResolved = ticket.status === 'RESOLVED' || ticket.status === 'CLOSED';
  const isWaiting = ticket.status === 'WAITING' || !!(ticket as any).slaPausedAt;
  const isExtended = !!(ticket as any).isSlaExtended;

  // Actual resolved time if ticket is resolved/closed
  const resolvedAtDate = (ticket as any).resolvedAt ? new Date((ticket as any).resolvedAt) : null;

  let statusText = '';
  let badgeClass = '';
  let icon = '⏱️';
  let isOverdue = false;
  let isWarning = false;

  if (isResolved) {
    // If ticket is resolved/closed, compare resolvedAtDate with deadline!
    const effectiveDoneTime = resolvedAtDate || new Date(ticket.updatedAt || ticket.createdAt);
    const completionDiffMs = deadline.getTime() - effectiveDoneTime.getTime();
    const completionDiffMins = Math.round(Math.abs(completionDiffMs) / (1000 * 60));
    const completionDiffHours = Math.floor(completionDiffMins / 60);
    const remainingMins = completionDiffMins % 60;
    const timeStr =
      completionDiffHours > 0
        ? `${completionDiffHours}h ${remainingMins > 0 ? `${remainingMins}m` : ''}`
        : isEn ? `${completionDiffMins} min` : `${completionDiffMins} phút`;

    if (completionDiffMs < 0) {
      // Overdue at completion!
      statusText = isEn ? `Completed Late (${timeStr})` : `Hoàn thành trễ hạn (${timeStr})`;
      badgeClass = 'bg-rose-100 text-rose-800 border-rose-300 font-bold';
      icon = '❌';
      isOverdue = true;
    } else {
      // Met SLA on time!
      statusText = isEn ? 'Completed On Time' : 'Đã hoàn thành đúng hạn';
      badgeClass = 'bg-emerald-50 text-emerald-700 border-emerald-200 font-bold';
      icon = '✅';
      isOverdue = false;
    }
  } else if (isWaiting) {
    statusText = isEn ? '⏸️ SLA Paused (Awaiting Response)' : '⏸️ SLA Đang Tạm Dừng (Chờ phản hồi)';
    badgeClass = 'bg-purple-100 text-purple-800 border-purple-300 font-bold';
    icon = '⏸️';
  } else {
    const diffMs = deadline.getTime() - now.getTime();
    const diffHours = Math.round(diffMs / (1000 * 60 * 60));
    const diffMins = Math.round(diffMs / (1000 * 60));

    if (diffMs < 0) {
      const overdueMins = Math.abs(diffMins);
      const overdueHours = Math.floor(overdueMins / 60);
      const remMins = overdueMins % 60;
      const overdueStr = overdueHours > 0 ? `${overdueHours}h ${remMins > 0 ? `${remMins}m` : ''}` : isEn ? `${overdueMins} min` : `${overdueMins} phút`;
      statusText = isEn ? `Overdue ${overdueStr}` : `Đã quá hạn ${overdueStr}`;
      badgeClass = 'bg-rose-100 text-rose-800 border-rose-300 animate-pulse font-bold';
      icon = '🚨';
      isOverdue = true;
    } else if (diffHours <= 4) {
      statusText = isEn
        ? `Expiring Soon (${diffMins > 60 ? `${Math.floor(diffMins / 60)}h ${diffMins % 60}m` : `${diffMins} min`} left)`
        : `Sắp quá hạn (còn ${diffMins > 60 ? `${Math.floor(diffMins / 60)}h ${diffMins % 60}m` : `${diffMins} phút`})`;
      badgeClass = 'bg-amber-100 text-amber-800 border-amber-300 animate-pulse font-bold';
      icon = '⚠️';
      isWarning = true;
    } else {
      statusText = isEn ? `${diffHours}h remaining` : `Còn ${diffHours} giờ`;
      badgeClass = 'bg-blue-50 text-blue-700 border-blue-200 font-semibold';
      icon = '⏱️';
    }
  }

  return {
    createdAtFormatted: createdAt.toLocaleString(isEn ? 'en-US' : 'vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }),
    deadlineFormatted: deadline.toLocaleString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }),
    resolvedAtFormatted: resolvedAtDate
      ? resolvedAtDate.toLocaleString(isEn ? 'en-US' : 'vi-VN', {
          hour: '2-digit',
          minute: '2-digit',
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        })
      : null,
    slaHours,
    statusText,
    badgeClass,
    icon,
    isWaiting,
    isExtended,
    isOverdue,
    isWarning,
  };
}

export default function TicketsPage() {
  const { language, t } = useLanguage();
  const isEn = language === 'en';
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [stats, setStats] = useState<{
    total: number;
    open: number;
    inProgress: number;
    waiting: number;
    resolved: number;
    urgent: number;
    csatAverage?: string;
    csatCount?: number;
  }>({ total: 0, open: 0, inProgress: 0, waiting: 0, resolved: 0, urgent: 0, csatAverage: '5.0', csatCount: 0 });
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [myAssets, setMyAssets] = useState<any[]>([]);

  // Main View Mode (ALL vs MY_TICKETS vs ASSIGNED_TO_ME)
  const [scopeMode, setScopeMode] = useState<'ALL' | 'MINE' | 'ASSIGNED'>('ALL');

  // Filters
  const [search, setSearch] = useState('');
  const [activeChip, setActiveChip] = useState<'ALL' | 'OPEN' | 'IN_PROGRESS' | 'URGENT' | 'RESOLVED'>('ALL');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [creatorFilter, setCreatorFilter] = useState('');
  const [assigneeFilter, setAssigneeFilter] = useState('');
  const [assetFilter, setAssetFilter] = useState('');

  // Modals & Drawers
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // IT Escalation & Internal Assistance State
  const [escalateToId, setEscalateToId] = useState('');
  const [escalateNote, setEscalateNote] = useState('');
  const [escalateSending, setEscalateSending] = useState(false);
  const [escalateSuccessMsg, setEscalateSuccessMsg] = useState('');

  // New Ticket Form
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newRequesterId, setNewRequesterId] = useState('');
  const [isRequesterDropdownOpen, setIsRequesterDropdownOpen] = useState(false);
  const [requesterSearchTerm, setRequesterSearchTerm] = useState('');
  const requesterDropdownRef = useRef<HTMLDivElement>(null);
  const requesterInputRef = useRef<HTMLInputElement>(null);
  const [newCategory, setNewCategory] = useState<string>('HARDWARE');
  const [newPriority, setNewPriority] = useState<string>('MEDIUM');
  const [newAssetId, setNewAssetId] = useState('');
  const [customAssetName, setCustomAssetName] = useState('');
  const [assignSuccessMsg, setAssignSuccessMsg] = useState('');
  const [newAssignedToId, setNewAssignedToId] = useState('');
  const [newStatus, setNewStatus] = useState<string>('OPEN');
  const [newDueDate, setNewDueDate] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // AI Diagnostic State
  const [isAiAnalyzing, setIsAiAnalyzing] = useState(false);
  const [aiDiagnostic, setAiDiagnostic] = useState<any>(null);
  const lastAnalyzedTextRef = useRef('');
  const aiDebounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // SLA Extension Request State
  const [isSlaExtModalOpen, setIsSlaExtModalOpen] = useState(false);
  const [extHours, setExtHours] = useState(8);
  const [extReason, setExtReason] = useState('');
  const [extendingSla, setExtendingSla] = useState(false);
  const [slaExtSuccessMsg, setSlaExtSuccessMsg] = useState('');

  // New Comment
  const [commentText, setCommentText] = useState('');
  const [isInternalComment, setIsInternalComment] = useState(false);
  const [sendingComment, setSendingComment] = useState(false);

  // Canned Responses (⚡ Quick Reply) State
  const [cannedResponses, setCannedResponses] = useState<any[]>([]);
  const [isCannedMenuOpen, setIsCannedMenuOpen] = useState(false);
  const [loadingCanned, setLoadingCanned] = useState(false);
  const [isCreatingCanned, setIsCreatingCanned] = useState(false);
  const [newCannedTitle, setNewCannedTitle] = useState('');
  const [newCannedShortcut, setNewCannedShortcut] = useState('');
  const [newCannedContent, setNewCannedContent] = useState('');
  const [savingCanned, setSavingCanned] = useState(false);

  // Convert to KB Article Modal State
  const [isConvertToKbOpen, setIsConvertToKbOpen] = useState(false);
  const [convertingToKb, setConvertingToKb] = useState(false);
  const [kbArticleTitle, setKbArticleTitle] = useState('');
  const [kbArticleContent, setKbArticleContent] = useState('');
  const [kbTeamScope, setKbTeamScope] = useState('PUBLIC');
  const [availableSupportTeams, setAvailableSupportTeams] = useState<any[]>([]);

  // CSAT Rating State
  const [submittingRating, setSubmittingRating] = useState(false);
  const [ratingHover, setRatingHover] = useState(0);
  const [selectedRating, setSelectedRating] = useState(5);
  const [ratingFeedback, setRatingFeedback] = useState('');

  // Inline Create Modal KB Suggestions State
  const [inlineKbSuggestions, setInlineKbSuggestions] = useState<any[]>([]);

  // SLA Setup State
  const [isSlaModalOpen, setIsSlaModalOpen] = useState(false);
  const [slaConfig, setSlaConfig] = useState({ urgentHours: 4, highHours: 24, mediumHours: 48, lowHours: 72 });
  const [savingSla, setSavingSla] = useState(false);

  // Attachments State
  const [newTicketAttachments, setNewTicketAttachments] = useState<Array<{ url: string; name: string; size?: number; type?: string }>>([]);
  const [uploadingTicketFile, setUploadingTicketFile] = useState(false);
  const [commentAttachments, setCommentAttachments] = useState<Array<{ url: string; name: string; size?: number; type?: string }>>([]);
  const [uploadingCommentFile, setUploadingCommentFile] = useState(false);
  const [previewImageModal, setPreviewImageModal] = useState<string | null>(null);
  const isPastingRef = useRef(false);

  // 🔀 Ticket Merge & Broadcast State (👑 Enterprise)
  const [isMergeModalOpen, setIsMergeModalOpen] = useState(false);
  const [mergeTargetTicketId, setMergeTargetTicketId] = useState('');
  const [mergeSearchTerm, setMergeSearchTerm] = useState('');
  const [mergeReason, setMergeReason] = useState('Trùng lặp nội dung yêu cầu');
  const [mergingTicket, setMergingTicket] = useState(false);
  const [mergeSuccessMsg, setMergeSuccessMsg] = useState('');
  const [broadcastToMerged, setBroadcastToMerged] = useState(true);

  // 🚨 Incident Linking State (👑 Enterprise)
  const [incidentsList, setIncidentsList] = useState<any[]>([]);
  const [isIncidentMenuOpen, setIsIncidentMenuOpen] = useState(false);
  const [linkingIncident, setLinkingIncident] = useState(false);

  // 📋 Bulk Actions State (👑 Enterprise)
  const [selectedTicketIds, setSelectedTicketIds] = useState<string[]>([]);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  // ⏱️ Time Tracking State (👑 Enterprise)
  const [spentMinutesInput, setSpentMinutesInput] = useState('');

  // 📅 Recurring Maintenance Schedules State (👑 Enterprise)
  const [isRecurringModalOpen, setIsRecurringModalOpen] = useState(false);

  const isAdmin = useMemo(() => {
    if (!currentUser) return false;
    const roleName = currentUser.role?.name || currentUser.roleName || '';
    return roleName.toLowerCase().includes('admin') || roleName.toLowerCase().includes('quản trị');
  }, [currentUser]);

  const isITStaffOrAdmin = useMemo(() => {
    if (!currentUser) return false;
    const roleName = (currentUser.role?.name || currentUser.roleName || '').toLowerCase();
    const dept = (currentUser.department || '').toLowerCase();
    return (
      roleName.includes('admin') ||
      roleName.includes('quản trị') ||
      roleName.includes('manager') ||
      roleName.includes('it') ||
      roleName.includes('support') ||
      roleName.includes('kỹ thuật') ||
      dept.includes('it') ||
      dept.includes('kỹ thuật') ||
      dept.includes('công nghệ')
    );
  }, [currentUser]);

  const loadRequesterAssets = async (targetUserId: string) => {
    if (!targetUserId) {
      setMyAssets([]);
      return;
    }
    try {
      const res = await fetch(`/api/users/${targetUserId}`);
      if (res.ok) {
        const uDetail = await res.json();
        if (uDetail.assetAssignments) {
          const active = uDetail.assetAssignments
            .filter((aa: any) => !aa.returnedAt)
            .map((aa: any) => aa.asset);
          setMyAssets(active);
          if (active.length > 0) {
            setNewAssetId(active[0].id);
          } else {
            setNewAssetId('');
          }
        }
      }
    } catch (e) {
      console.error('Error loading requester assets:', e);
    }
  };

  const selectedSla = useMemo(() => {
    return selectedTicket ? getTicketSLA(selectedTicket, slaConfig, language) : null;
  }, [selectedTicket, slaConfig, language]);

  // Clipboard Paste Handler for direct Ctrl + V screenshot pasting (de-duplicated)
  const handlePasteImage = async (
    e: React.ClipboardEvent,
    target: 'ticket' | 'comment'
  ) => {
    e.stopPropagation();
    if (isPastingRef.current) return;

    const items = e.clipboardData?.items;
    if (!items) return;

    // Find the first image item in clipboard
    let imageItem: DataTransferItem | null = null;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type && items[i].type.startsWith('image/')) {
        imageItem = items[i];
        break; // Stop at first image to avoid duplicates from multi-format clipboard items
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
    const customName = `screenshot_${Date.now()}.png`;
    formData.append('file', file, customName);
    formData.append('category', target === 'ticket' ? 'ticket' : 'ticket_comment');

    if (target === 'ticket') {
      setUploadingTicketFile(true);
    } else {
      setUploadingCommentFile(true);
    }

    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (res.ok && data.url) {
        const newAtt = {
          url: data.url,
          name: data.originalName || customName,
          size: file.size,
          type: file.type || 'image/png',
        };
        if (target === 'ticket') {
          setNewTicketAttachments((prev) => [...prev, newAtt]);
        } else {
          setCommentAttachments((prev) => [...prev, newAtt]);
        }
      } else {
        alert(data.error || 'Dán ảnh thất bại');
      }
    } catch {
      alert('Lỗi kết nối khi tải ảnh dán');
    } finally {
      if (target === 'ticket') {
        setUploadingTicketFile(false);
      } else {
        setUploadingCommentFile(false);
      }
    }
  };

  // File Upload Handlers
  const handleUploadTicketFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploadingTicketFile(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append('file', file);
        formData.append('category', 'ticket');
        const res = await fetch('/api/upload', { method: 'POST', body: formData });
        const data = await res.json();
        if (res.ok && data.url) {
          setNewTicketAttachments((prev) => [
            ...prev,
            { url: data.url, name: data.originalName || file.name, size: file.size, type: file.type },
          ]);
        } else {
          alert(data.error || 'Tải file thất bại');
        }
      }
    } catch {
      alert('Lỗi kết nối khi tải file');
    } finally {
      setUploadingTicketFile(false);
      e.target.value = '';
    }
  };

  const handleUploadCommentFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploadingCommentFile(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append('file', file);
        formData.append('category', 'ticket_comment');
        const res = await fetch('/api/upload', { method: 'POST', body: formData });
        const data = await res.json();
        if (res.ok && data.url) {
          setCommentAttachments((prev) => [
            ...prev,
            { url: data.url, name: data.originalName || file.name, size: file.size, type: file.type },
          ]);
        } else {
          alert(data.error || 'Tải file thất bại');
        }
      }
    } catch {
      alert('Lỗi kết nối khi tải file');
    } finally {
      setUploadingCommentFile(false);
      e.target.value = '';
    }
  };

  // Load Data
  const loadData = async () => {
    try {
      setLoading(true);
      const [ticketsRes, usersRes, assetsRes, meRes, settingsRes, incidentsRes] = await Promise.all([
        fetch('/api/tickets'),
        fetch('/api/users'),
        fetch('/api/assets?pageSize=1000'),
        fetch('/api/auth/me'),
        fetch('/api/settings'),
        fetch('/api/incidents').catch(() => ({ ok: false, json: async () => [] } as any)),
      ]);

      if (incidentsRes && incidentsRes.ok) {
        try {
          const incData = await incidentsRes.json();
          setIncidentsList(Array.isArray(incData) ? incData : (incData.incidents || []));
        } catch {}
      }

      if (settingsRes.ok) {
        const sData = await settingsRes.json();
        if (sData.success && Array.isArray(sData.data)) {
          const uHours = Number(sData.data.find((s: any) => s.key === 'sla.urgent_hours')?.value || 4);
          const hHours = Number(sData.data.find((s: any) => s.key === 'sla.high_hours')?.value || 24);
          const mHours = Number(sData.data.find((s: any) => s.key === 'sla.medium_hours')?.value || 48);
          const lHours = Number(sData.data.find((s: any) => s.key === 'sla.low_hours')?.value || 72);
          setSlaConfig({ urgentHours: uHours, highHours: hHours, mediumHours: mHours, lowHours: lHours });
        }
      }

      if (ticketsRes.ok) {
        const data = await ticketsRes.json();
        const ticketList = data.tickets || [];
        setTickets(ticketList);
        if (data.stats) setStats(data.stats);

        // Auto open detail modal if id in URL
        if (typeof window !== 'undefined') {
          const params = new URLSearchParams(window.location.search);
          const targetId = params.get('id');
          if (targetId) {
            const found = ticketList.find((t: any) => t.id === targetId);
            if (found) {
              setSelectedTicket(found);
              setIsDetailModalOpen(true);
            }
          }
        }
      }

      if (usersRes.ok) {
        const u = await usersRes.json();
        const userList = Array.isArray(u) ? u : u.data || u.users || [];
        setUsers(userList);
      }

      if (assetsRes.ok) {
        const a = await assetsRes.json();
        const assetList = Array.isArray(a) ? a : a.data || a.assets || [];
        setAssets(assetList);
      }

      if (meRes.ok) {
        const meData = await meRes.json();
        if (meData.success && meData.data) {
          setCurrentUser(meData.data);
          setNewRequesterId((prev) => prev || meData.data.id);
          if (meData.data.id) {
            const userAssetsRes = await fetch(`/api/users/${meData.data.id}`);
            if (userAssetsRes.ok) {
              const uDetail = await userAssetsRes.json();
              if (uDetail.assetAssignments) {
                setMyAssets(uDetail.assetAssignments.map((aa: any) => aa.asset));
              }
            }
          }
        }
      }
    } catch (err) {
      console.error('Failed to load tickets data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);


  // Helper to open ticket by ID (instant open from notification)
  const openTicketById = useCallback(async (id: string) => {
    if (!id) return;
    // 1. Try finding in current tickets state
    const found = tickets.find((t) => t.id === id);
    if (found) {
      setSelectedTicket(found);
      setIsDetailModalOpen(true);
      return;
    }
    // 2. Fetch directly from API
    try {
      const res = await fetch(`/api/tickets/${id}`);
      if (res.ok) {
        const tData = await res.json();
        if (tData && tData.id) {
          setSelectedTicket(tData);
          setIsDetailModalOpen(true);
        }
      }
    } catch {}
  }, [tickets]);

  // Instant notification event listener (even when already on /tickets)
  useEffect(() => {
    function handleNotifEvent(e: any) {
      if (e.detail?.type === 'TICKET' && e.detail?.id) {
        openTicketById(e.detail.id);
      }
    }
    window.addEventListener('app:open-notification', handleNotifEvent);
    return () => window.removeEventListener('app:open-notification', handleNotifEvent);
  }, [openTicketById]);

  // URL query param check on load or change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const queryId = params.get('id');
      if (queryId) {
        openTicketById(queryId);
      }
    }
  }, [openTicketById]);

  // Global ESC key listener to close any active modal
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (isRequesterDropdownOpen) setIsRequesterDropdownOpen(false);
        if (isCreateModalOpen) setIsCreateModalOpen(false);
        if (isDetailModalOpen) setIsDetailModalOpen(false);
        if (selectedTicket) setSelectedTicket(null);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isRequesterDropdownOpen, isCreateModalOpen, isDetailModalOpen, selectedTicket]);

  // Click outside listener for Searchable Requester dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        requesterDropdownRef.current &&
        !requesterDropdownRef.current.contains(event.target as Node)
      ) {
        setIsRequesterDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto focus input when requester dropdown opens
  useEffect(() => {
    if (isRequesterDropdownOpen && requesterInputRef.current) {
      setTimeout(() => requesterInputRef.current?.focus(), 50);
    }
  }, [isRequesterDropdownOpen]);

  // Filter users specifically belonging to IT / Technical support
  const itUsers = useMemo(() => {
    return users.filter((u) => {
      const roleName = (u.role?.name || '').toLowerCase();
      const dept = (u.department || '').toLowerCase();
      const pos = (u.position || '').toLowerCase();
      const email = (u.email || '').toLowerCase();
      return (
        roleName.includes('admin') ||
        roleName.includes('manager') ||
        roleName.includes('it') ||
        roleName.includes('support') ||
        roleName.includes('kỹ thuật') ||
        roleName.includes('helpdesk') ||
        dept.includes('it') ||
        dept.includes('cntt') ||
        dept.includes('kỹ thuật') ||
        dept.includes('ky thuat') ||
        dept.includes('công nghệ') ||
        dept.includes('cong nghe') ||
        dept.includes('support') ||
        pos.includes('it') ||
        pos.includes('kỹ thuật') ||
        pos.includes('admin') ||
        email.includes('admin') ||
        email.includes('it@')
      );
    });
  }, [users]);

  // Options for Searchable Dropdowns
  const creatorOptions: SearchableOption[] = useMemo(() => {
    return users.map((u) => ({
      value: u.id,
      label: u.fullName,
      subLabel: u.department ? `${isEn ? 'Dept' : 'Phòng ban'}: ${u.department}` : u.email,
      icon: '👤',
    }));
  }, [users]);

  // Selected requester user object & filtered list for searchable selector
  const selectedRequesterUser = useMemo(() => {
    if (!newRequesterId) return currentUser;
    if (newRequesterId === currentUser?.id) return currentUser;
    return users.find((u) => u.id === newRequesterId) || currentUser;
  }, [newRequesterId, currentUser, users]);

  const filteredRequesterUsers = useMemo(() => {
    if (!requesterSearchTerm.trim()) return users;
    const q = requesterSearchTerm.toLowerCase();
    return users.filter(
      (u) =>
        (u.fullName || '').toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q) ||
        (u.department || '').toLowerCase().includes(q) ||
        (u.phone || '').toLowerCase().includes(q)
    );
  }, [users, requesterSearchTerm]);

  const itAssigneeOptions: SearchableOption[] = useMemo(() => {
    const opts: SearchableOption[] = [
      { value: 'UNASSIGNED', label: isEn ? 'Unassigned' : 'Chưa phân công IT', subLabel: isEn ? 'New ticket, not yet assigned' : 'Ticket mới chưa gán', icon: '⚪' },
    ];
    itUsers.forEach((u) => {
      opts.push({
        value: u.id,
        label: u.fullName,
        subLabel: `${u.role?.name || (isEn ? 'Technician' : 'Kỹ thuật viên')} - ${u.department || 'IT'}`,
        icon: '👨‍💻',
      });
    });
    return opts;
  }, [itUsers, isEn]);

  const assetOptions: SearchableOption[] = useMemo(() => {
    return assets.map((a) => ({
      value: a.id,
      label: `[${a.assetTag}] ${a.name}`,
      subLabel: `SN: ${a.serialNumber || '—'} | ${a.status === 'AVAILABLE' ? (isEn ? 'In Stock' : 'Trong kho') : (isEn ? 'In Use' : 'Đang sử dụng')}`,
      icon: '💻',
    }));
  }, [assets]);

  const categoryOptions: SearchableOption[] = [
    { value: 'HARDWARE', label: isEn ? 'Hardware' : 'Phần cứng', icon: '💻' },
    { value: 'SOFTWARE', label: isEn ? 'Software' : 'Phần mềm', icon: '💿' },
    { value: 'LICENSE', label: isEn ? 'License' : 'License / Bản quyền', icon: '🔑' },
    { value: 'ACCESS_REQUEST', label: isEn ? 'Access Request' : 'Cấp quyền truy cập', icon: '🛡️' },
    { value: 'NETWORK', label: isEn ? 'Network & Internet' : 'Mạng & Internet', icon: '🌐' },
    { value: 'OTHER', label: isEn ? 'Other' : 'Khác', icon: '📌' },
  ];

  const priorityOptions: SearchableOption[] = [
    { value: 'URGENT', label: isEn ? 'Urgent (Work Stopped)' : 'Khẩn cấp (Dừng công việc)', icon: '🔥' },
    { value: 'HIGH', label: isEn ? 'High (Resolve within 24h)' : 'Cao (Xử lý trong 24h)', icon: '🔴' },
    { value: 'MEDIUM', label: isEn ? 'Medium (Within the week)' : 'Trung bình (Trong tuần)', icon: '🟡' },
    { value: 'LOW', label: isEn ? 'Low (Not urgent)' : 'Thấp (Không gấp)', icon: '🟢' },
  ];

  const statusOptions: SearchableOption[] = [
    { value: 'OPEN', label: isEn ? 'Open' : 'Mới mở', icon: '🟡' },
    { value: 'IN_PROGRESS', label: isEn ? 'In Progress' : 'Đang xử lý', icon: '🔵' },
    { value: 'WAITING', label: isEn ? 'Awaiting Response' : 'Chờ phản hồi', icon: '🟣' },
    { value: 'RESOLVED', label: isEn ? 'Resolved' : 'Đã giải quyết', icon: '🟢' },
    { value: 'CLOSED', label: isEn ? 'Closed' : 'Đã đóng', icon: '⚪' },
  ];

  const resetAllFilters = () => {
    setSearch('');
    setActiveChip('ALL');
    setCategoryFilter('');
    setPriorityFilter('');
    setStatusFilter('');
    setCreatorFilter('');
    setAssigneeFilter('');
    setAssetFilter('');
  };

  const hasActiveFilters = Boolean(
    search || categoryFilter || priorityFilter || statusFilter || creatorFilter || assigneeFilter || assetFilter || activeChip !== 'ALL'
  );

  // Filter logic
  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      // Scope Mode
      if (scopeMode === 'MINE' && currentUser && t.createdById !== currentUser.id) return false;
      if (scopeMode === 'ASSIGNED' && currentUser && t.assignedToId !== currentUser.id) return false;

      // Status chip filter
      if (activeChip === 'OPEN' && t.status !== 'OPEN') return false;
      if (activeChip === 'IN_PROGRESS' && t.status !== 'IN_PROGRESS') return false;
      if (activeChip === 'URGENT' && t.priority !== 'URGENT') return false;
      if (activeChip === 'RESOLVED' && t.status !== 'RESOLVED' && t.status !== 'CLOSED') return false;

      // Dropdown filters
      if (statusFilter && t.status !== statusFilter) return false;
      if (categoryFilter && t.category !== categoryFilter) return false;
      if (priorityFilter && t.priority !== priorityFilter) return false;
      if (creatorFilter && t.createdById !== creatorFilter) return false;

      // Assignee filter
      if (assigneeFilter === 'UNASSIGNED') {
        if (t.assignedToId) return false;
      } else if (assigneeFilter && t.assignedToId !== assigneeFilter) {
        return false;
      }

      if (assetFilter && t.assetId !== assetFilter) return false;

      // Search keyword
      if (search) {
        const q = search.toLowerCase();
        const matchNum = t.ticketNumber.toLowerCase().includes(q);
        const matchTitle = t.title.toLowerCase().includes(q);
        const matchDesc = t.description.toLowerCase().includes(q);
        const matchCreator = (t.createdBy?.fullName || '').toLowerCase().includes(q) || (t.createdBy?.email || '').toLowerCase().includes(q);
        const matchAssignee = (t.assignedTo?.fullName || '').toLowerCase().includes(q);
        const matchAsset = (t.asset?.assetTag || '').toLowerCase().includes(q) || (t.asset?.name || '').toLowerCase().includes(q);
        if (!matchNum && !matchTitle && !matchDesc && !matchCreator && !matchAssignee && !matchAsset) {
          return false;
        }
      }
      return true;
    });
  }, [tickets, scopeMode, currentUser, activeChip, statusFilter, categoryFilter, priorityFilter, creatorFilter, assigneeFilter, assetFilter, search]);

  // AI Analyze Ticket Handler with Auto-Analysis Support
  const triggerAiAnalysis = async (titleVal?: string, descVal?: string, isAuto: boolean = false) => {
    const t = (titleVal !== undefined ? titleVal : newTitle).trim();
    const d = (descVal !== undefined ? descVal : newDesc).trim();
    const rawText = d ? `${t}\n${d}` : t;

    if (!rawText || rawText.length < 5) {
      if (!isAuto) alert('Vui lòng nhập tiêu đề hoặc mô tả sự cố trước khi bấm Phân tích AI');
      return;
    }

    if (isAuto && rawText === lastAnalyzedTextRef.current) {
      return; // Skip duplicate auto analysis for same content
    }

    try {
      setIsAiAnalyzing(true);
      lastAnalyzedTextRef.current = rawText;
      const res = await fetch('/api/tickets/ai-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: rawText, userId: newRequesterId || currentUser?.id }),
      });
      const data = await res.json();
      if (res.ok && data.success && data.data) {
        setAiDiagnostic(data.data);
        if (!isAuto && (!t || t.length < 10)) {
          setNewTitle(data.data.suggestedTitle || t);
        }
        if (data.data.category) setNewCategory(data.data.category);
        if (data.data.priority) setNewPriority(data.data.priority);
        if (data.data.matchedAssetId && !newAssetId) setNewAssetId(data.data.matchedAssetId);
      } else if (!isAuto) {
        alert(data.error || 'Phân tích AI không thành công');
      }
    } catch {
      if (!isAuto) alert('Lỗi kết nối phân tích AI');
    } finally {
      setIsAiAnalyzing(false);
    }
  };

  const handleAiAnalyzeTicket = () => {
    triggerAiAnalysis(newTitle, newDesc, false);
  };

  const handleTitleChange = (val: string) => {
    setNewTitle(val);
    if (aiDebounceTimerRef.current) clearTimeout(aiDebounceTimerRef.current);

    // Ticket Deflection: Auto-suggest KB articles
    if (val.trim().length >= 3) {
      fetch(`/api/kb?search=${encodeURIComponent(val.trim())}`)
        .then((r) => r.json())
        .then((res) => {
          if (res.success && Array.isArray(res.data)) {
            setInlineKbSuggestions(res.data.slice(0, 3));
          }
        })
        .catch(() => {});
    } else {
      setInlineKbSuggestions([]);
    }

    if (val.trim().length >= 6) {
      aiDebounceTimerRef.current = setTimeout(() => {
        triggerAiAnalysis(val, newDesc, true);
      }, 700);
    }
  };

  const fetchCannedResponses = async () => {
    if (cannedResponses.length > 0) return;
    try {
      setLoadingCanned(true);
      const res = await fetch('/api/canned-responses');
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setCannedResponses(data.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingCanned(false);
    }
  };

  const handleSelectCannedResponse = (cr: any) => {
    setCommentText((prev) => (prev.trim() ? `${prev}\n\n${cr.content}` : cr.content));
    setIsCannedMenuOpen(false);
  };

  const handleCreateCannedResponse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCannedTitle.trim() || !newCannedContent.trim()) return;
    try {
      setSavingCanned(true);
      const res = await fetch('/api/canned-responses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newCannedTitle.trim(),
          shortcut: newCannedShortcut.trim() ? (newCannedShortcut.startsWith('/') ? newCannedShortcut.trim() : `/${newCannedShortcut.trim()}`) : null,
          content: newCannedContent.trim(),
          category: 'SUPPORT',
        }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        setCannedResponses((prev) => [...prev, data.data]);
        setNewCannedTitle('');
        setNewCannedShortcut('');
        setNewCannedContent('');
        setIsCreatingCanned(false);
      } else {
        alert(data.error || 'Lỗi thêm mẫu trả lời');
      }
    } catch (err: any) {
      alert(err.message || 'Lỗi thêm mẫu trả lời');
    } finally {
      setSavingCanned(false);
    }
  };

  const handleDeleteCannedResponse = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm(isEn ? 'Delete this canned reply template?' : 'Bạn có chắc chắn muốn xóa mẫu câu này không?')) return;
    try {
      const res = await fetch(`/api/canned-responses?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setCannedResponses((prev) => prev.filter((item) => item.id !== id));
      } else {
        alert(data.error || 'Lỗi xóa mẫu câu');
      }
    } catch (err: any) {
      alert(err.message || 'Lỗi xóa mẫu câu');
    }
  };

  const handleRateTicket = async (ticketId: string, ratingStars: number, feedbackText: string) => {
    try {
      setSubmittingRating(true);
      const res = await fetch(`/api/tickets/${ticketId}/rate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating: ratingStars, comment: feedbackText }),
      });
      const data = await res.json();
      if (data.success) {
        if (selectedTicket && selectedTicket.id === ticketId) {
          setSelectedTicket((prev: any) => ({
            ...prev,
            rating: ratingStars,
            ratingComment: feedbackText,
            ratedAt: new Date().toISOString(),
          }));
        }
        setTickets((prev: any[]) =>
          prev.map((t) =>
            t.id === ticketId
              ? { ...t, rating: ratingStars, ratingComment: feedbackText, ratedAt: new Date().toISOString() }
              : t
          )
        );
        alert(isEn ? 'Thank you for your rating!' : 'Cảm ơn bạn đã gửi đánh giá chất lượng phục vụ!');
      } else {
        alert(data.error || 'Lỗi gửi đánh giá');
      }
    } catch (err: any) {
      alert(err.message || 'Lỗi gửi đánh giá');
    } finally {
      setSubmittingRating(false);
    }
  };

  const handleOpenConvertToKb = () => {
    if (!selectedTicket) return;
    setKbArticleTitle(`[Hướng dẫn xử lý] ${selectedTicket.title}`);
    const solution = selectedTicket.resolutionNotes || (
      selectedTicket.comments?.length > 0
        ? selectedTicket.comments.map((c: any) => c.content).join('\n\n')
        : 'Sự cố đã được kiểm tra và xử lý thành công theo quy trình kỹ thuật.'
    );
    setKbArticleContent(`## 1. Hiện tượng & Vấn đề sự cố\n${selectedTicket.description}\n\n## 2. Các bước xử lý / Khắc phục\n${solution}`);
    setKbTeamScope('PUBLIC');
    setIsConvertToKbOpen(true);

    if (availableSupportTeams.length === 0) {
      fetch('/api/support-teams')
        .then((r) => r.json())
        .then((res) => {
          if (res.success && Array.isArray(res.data)) {
            setAvailableSupportTeams(res.data);
          }
        })
        .catch(() => {});
    }
  };

  const handleSubmitConvertToKb = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !kbArticleTitle.trim()) return;

    try {
      setConvertingToKb(true);
      const res = await fetch(`/api/tickets/${selectedTicket.id}/convert-to-kb`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customTitle: kbArticleTitle.trim(),
          customContent: kbArticleContent,
          teamScope: kbTeamScope,
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert(isEn ? 'Published to Knowledge Base successfully!' : 'Đã đóng góp giải pháp vào Thư viện Tri thức (KB) thành công!');
        setIsConvertToKbOpen(false);
      } else {
        alert(data.error || 'Lỗi xuất bản bài viết');
      }
    } catch (err: any) {
      alert(err.message || 'Lỗi xuất bản bài viết');
    } finally {
      setConvertingToKb(false);
    }
  };

  const handleDescChange = (val: string) => {
    setNewDesc(val);
    if (aiDebounceTimerRef.current) clearTimeout(aiDebounceTimerRef.current);
    if (val.trim().length >= 8) {
      aiDebounceTimerRef.current = setTimeout(() => {
        triggerAiAnalysis(newTitle, val, true);
      }, 800);
    }
  };

  // SLA Extension Handler
  const handleExtendSla = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !extReason.trim()) {
      alert('Vui lòng cung cấp lý do gia hạn cụ thể');
      return;
    }

    try {
      setExtendingSla(true);
      const res = await fetch(`/api/tickets/${selectedTicket.id}/extend-sla`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ extensionHours: extHours, reason: extReason.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSlaExtSuccessMsg(`✅ ${data.message}`);
        setSelectedTicket((prev: any) => ({ ...prev, ...data.data }));
        setTickets((prev) => prev.map((t) => (t.id === selectedTicket.id ? { ...t, ...data.data } : t)));
        setTimeout(() => {
          setIsSlaExtModalOpen(false);
          setSlaExtSuccessMsg('');
          setExtReason('');
        }, 2000);
      } else {
        alert(data.error || 'Gia hạn SLA thất bại');
      }
    } catch {
      alert('Lỗi kết nối khi xin gia hạn SLA');
    } finally {
      setExtendingSla(false);
    }
  };

  // Create Ticket
  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDesc.trim()) return;

    try {
      setSubmitting(true);
      const res = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle.trim(),
          description: newDesc.trim(),
          category: newCategory,
          priority: newPriority,
          status: newStatus || 'OPEN',
          requesterId: newRequesterId || currentUser?.id,
          createdById: newRequesterId || currentUser?.id,
          assetId: newAssetId || null,
          customAssetName: customAssetName?.trim() || null,
          assignedToId: newAssignedToId || null,
          dueDate: newDueDate || null,
          attachmentUrls: newTicketAttachments.length > 0 ? newTicketAttachments : null,
          aiAnalysis: aiDiagnostic || null,
        }),
      });

      if (res.ok) {
        setIsCreateModalOpen(false);
        setNewTitle('');
        setNewDesc('');
        setNewRequesterId(currentUser?.id || '');
        setNewAssetId('');
        setCustomAssetName('');
        setNewAssignedToId(isITStaffOrAdmin && currentUser?.id ? currentUser.id : '');
        setNewStatus('OPEN');
        setNewDueDate('');
        setAiDiagnostic(null);
        lastAnalyzedTextRef.current = '';
        setNewTicketAttachments([]);
        loadData();
      } else {
        const err = await res.json();
        alert(err.error || 'Tạo ticket thất bại');
      }
    } catch {
      alert('Lỗi kết nối khi tạo ticket');
    } finally {
      setSubmitting(false);
    }
  };

  // Update Status
  const handleUpdateStatus = async (ticketId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/tickets/${ticketId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        const updated = await res.json();
        setTickets((prev) => prev.map((t) => (t.id === ticketId ? { ...t, ...updated } : t)));
        if (selectedTicket && selectedTicket.id === ticketId) {
          setSelectedTicket((prev: any) => ({ ...prev, ...updated }));
        }
        setAssignSuccessMsg('✅ Đã cập nhật phân công IT thành công!');
        setTimeout(() => setAssignSuccessMsg(''), 3000);
      }
    } catch {
      alert('Lỗi cập nhật trạng thái');
    }
  };

  // Update Assignee
  const handleUpdateAssignee = async (ticketId: string, assignedToId: string) => {
    try {
      const res = await fetch(`/api/tickets/${ticketId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignedToId: assignedToId || null }),
      });
      if (res.ok) {
        const updated = await res.json();
        setTickets((prev) => prev.map((t) => (t.id === ticketId ? { ...t, ...updated } : t)));
        if (selectedTicket && selectedTicket.id === ticketId) {
          setSelectedTicket((prev: any) => ({ ...prev, ...updated }));
        }
      }
    } catch {
      alert('Lỗi phân công IT');
    }
  };

  // Add Comment
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !commentText.trim()) return;

    const parsedSpent = spentMinutesInput && !isNaN(Number(spentMinutesInput)) && Number(spentMinutesInput) > 0
      ? Math.round(Number(spentMinutesInput))
      : undefined;

    try {
      setSendingComment(true);
      const res = await fetch(`/api/tickets/${selectedTicket.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: commentText.trim(),
          isInternal: isInternalComment,
          attachmentUrls: commentAttachments.length > 0 ? commentAttachments : null,
          broadcastToMerged: isInternalComment ? false : broadcastToMerged,
          spentMinutes: parsedSpent,
        }),
      });

      if (res.ok) {
        const newC = await res.json();
        const incMinutes = parsedSpent || 0;
        setSelectedTicket((prev: any) => ({
          ...prev,
          actualSpentMinutes: (prev?.actualSpentMinutes || 0) + incMinutes,
          comments: [...(prev?.comments || []), newC],
        }));
        setTickets((prev) =>
          prev.map((t) =>
            t.id === selectedTicket.id
              ? {
                  ...t,
                  actualSpentMinutes: (t.actualSpentMinutes || 0) + incMinutes,
                  comments: [...(t.comments || []), newC],
                }
              : t
          )
        );
        setCommentText('');
        setCommentAttachments([]);
        setSpentMinutesInput('');
      } else {
        const err = await res.json();
        alert(err.error || 'Gửi bình luận thất bại');
      }
    } catch {
      alert('Lỗi kết nối khi gửi bình luận');
    } finally {
      setSendingComment(false);
    }
  };

  // 🔀 Merge Ticket Action (👑 Enterprise)
  const handleMergeTicket = async () => {
    if (!selectedTicket || !mergeTargetTicketId) {
      alert(isEn ? 'Please select target ticket to merge into' : 'Vui lòng chọn ticket đích cần gộp vào');
      return;
    }
    if (selectedTicket.id === mergeTargetTicketId) {
      alert(isEn ? 'Cannot merge a ticket into itself' : 'Không thể gộp ticket vào chính nó');
      return;
    }

    try {
      setMergingTicket(true);
      const res = await fetch(`/api/tickets/${selectedTicket.id}/merge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetTicketId: mergeTargetTicketId,
          reason: mergeReason.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setMergeSuccessMsg(data.message);
        setTimeout(() => {
          setMergeSuccessMsg('');
          setIsMergeModalOpen(false);
          setMergeTargetTicketId('');
          setMergeSearchTerm('');
        }, 1500);

        loadData();
        setSelectedTicket((prev: any) => ({
          ...prev,
          status: 'CLOSED',
          mergedIntoTicketId: mergeTargetTicketId,
        }));
      } else {
        alert(data.error || 'Lỗi khi gộp ticket');
      }
    } catch {
      alert('Lỗi kết nối khi gộp ticket');
    } finally {
      setMergingTicket(false);
    }
  };

  // 🚨 Link / Unlink Incident Action (👑 Enterprise)
  const handleLinkIncident = async (incidentId: string | null) => {
    if (!selectedTicket) return;
    try {
      setLinkingIncident(true);
      const res = await fetch(`/api/tickets/${selectedTicket.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ incidentId }),
      });

      if (res.ok) {
        const updated = await res.json();
        setSelectedTicket((prev: any) => ({ ...prev, incident: updated.incident, incidentId: updated.incidentId }));
        setTickets((prev) => prev.map((t) => t.id === selectedTicket.id ? { ...t, incident: updated.incident, incidentId: updated.incidentId } : t));
        setIsIncidentMenuOpen(false);
      } else {
        const err = await res.json();
        alert(err.error || 'Lỗi liên kết sự cố');
      }
    } catch {
      alert('Lỗi kết nối khi liên kết sự cố');
    } finally {
      setLinkingIncident(false);
    }
  };

  // 📋 Bulk Selection & Actions
  const handleToggleSelectTicket = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedTicketIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllTickets = () => {
    if (selectedTicketIds.length === filteredTickets.length) {
      setSelectedTicketIds([]);
    } else {
      setSelectedTicketIds(filteredTickets.map((t) => t.id));
    }
  };

  const handleBulkClose = async () => {
    if (selectedTicketIds.length === 0) return;
    const confirmMsg = isEn
      ? `Are you sure you want to close ${selectedTicketIds.length} selected tickets?`
      : `Bạn có chắc chắn muốn đóng ${selectedTicketIds.length} ticket đã chọn?`;
    if (!confirm(confirmMsg)) return;

    try {
      setBulkActionLoading(true);
      await Promise.all(
        selectedTicketIds.map((id) =>
          fetch(`/api/tickets/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'CLOSED', resolutionNotes: 'Đóng hàng loạt bởi kỹ thuật viên IT' }),
          })
        )
      );
      setSelectedTicketIds([]);
      await loadData();
    } catch {
      alert('Lỗi khi đóng hàng loạt ticket');
    } finally {
      setBulkActionLoading(false);
    }
  };

  // Send Internal IT Escalation / Assistance Request
  const handleSendEscalation = async () => {
    if (!selectedTicket || (!escalateToId && !escalateNote.trim())) return;
    try {
      setEscalateSending(true);
      const targetUser = users.find((u) => u.id === escalateToId);
      const mentionText = targetUser ? `@${targetUser.fullName} (${targetUser.role?.name || 'IT'})` : '';
      const fullContent = `🚨 [YÊU CẦU HỖ TRỢ NỘI BỘ IT]\n${mentionText ? `👉 Kính nhờ: ${mentionText}\n` : ''}📝 Nội dung: ${escalateNote.trim() || 'Nhờ đồng nghiệp hỗ trợ xử lý sự cố này.'}`;

      const res = await fetch(`/api/tickets/${selectedTicket.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: fullContent,
          isInternal: true, // Chỉ nội bộ IT thấy
        }),
      });

      if (res.ok) {
        const newC = await res.json();
        setSelectedTicket((prev: any) => ({
          ...prev,
          comments: [...(prev.comments || []), newC],
        }));
        setTickets((prev) =>
          prev.map((t) =>
            t.id === selectedTicket.id
              ? { ...t, comments: [...(t.comments || []), newC] }
              : t
          )
        );
        setEscalateNote('');
        setEscalateToId('');
        setEscalateSuccessMsg('✅ Đã gửi yêu cầu hỗ trợ nội bộ thành công!');
        setTimeout(() => setEscalateSuccessMsg(''), 4000);
      } else {
        alert('Gửi yêu cầu hỗ trợ thất bại');
      }
    } catch {
      alert('Lỗi kết nối khi gửi yêu cầu');
    } finally {
      setEscalateSending(false);
    }
  };

  // Delete Ticket
  const handleDeleteTicket = async (ticketId: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa ticket này?')) return;
    try {
      const res = await fetch(`/api/tickets/${ticketId}`, { method: 'DELETE' });
      if (res.ok) {
        if (selectedTicket?.id === ticketId) setIsDetailModalOpen(false);
        loadData();
      } else {
        alert('Xóa ticket thất bại');
      }
    } catch {
      alert('Lỗi kết nối khi xóa');
    }
  };

  // Save SLA Config (Chỉ Admin mới có quyền)
  const handleSaveSlaConfig = async () => {
    if (!isAdmin) {
      alert('Chỉ có Quản trị viên (Admin) mới có quyền thiết lập Quy chuẩn SLA.');
      return;
    }
    try {
      setSavingSla(true);
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settings: [
            { key: 'sla.urgent_hours', value: String(slaConfig.urgentHours), group: 'sla', label: 'SLA Khẩn cấp (giờ)' },
            { key: 'sla.high_hours', value: String(slaConfig.highHours), group: 'sla', label: 'SLA Mức cao (giờ)' },
            { key: 'sla.medium_hours', value: String(slaConfig.mediumHours), group: 'sla', label: 'SLA Trung bình (giờ)' },
            { key: 'sla.low_hours', value: String(slaConfig.lowHours), group: 'sla', label: 'SLA Mức thấp (giờ)' },
          ],
        }),
      });

      if (res.ok) {
        setIsSlaModalOpen(false);
        alert('✅ Đã lưu cấu hình quy chuẩn SLA thành công!');
        loadData();
      } else {
        alert('Lưu quy chuẩn SLA thất bại');
      }
    } catch {
      alert('Lỗi kết nối khi lưu cấu hình SLA');
    } finally {
      setSavingSla(false);
    }
  };

  return (
    <div className="space-y-3 pb-8">
      {/* Header Banner */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3.5 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-10 h-10 bg-gradient-to-tr from-blue-600 to-indigo-600 text-white rounded-xl shadow-xs flex items-center justify-center shrink-0">
            <LifeBuoy className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base font-bold text-slate-900 leading-tight">{isEn ? 'IT Support Center' : 'Trung Tâm Tiếp Nhận & Xử Lý Ticket IT'}</h1>
              <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-[10px] font-bold shrink-0">
                Self-Service 24/7
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
              {isEn ? 'Submit requests and track hardware, software, license, and access issues' : 'Gửi yêu cầu và theo dõi xử lý sự cố phần cứng, phần mềm, cấp phát bản quyền license và quyền truy cập'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap shrink-0">
          {/* Main Scope Switcher */}
          <div className="flex items-center bg-slate-100/90 p-1 rounded-xl border border-slate-200/80 text-xs shrink-0">
            <button
              type="button"
              onClick={() => setScopeMode('ALL')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                scopeMode === 'ALL' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {isEn ? '🌐 All' : '🌐 Tất cả'}
            </button>
            <button
              type="button"
              onClick={() => setScopeMode('MINE')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                scopeMode === 'MINE' ? 'bg-white text-blue-700 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {isEn ? '👤 Mine' : '👤 Của tôi'}
            </button>
            <button
              type="button"
              onClick={() => setScopeMode('ASSIGNED')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                scopeMode === 'ASSIGNED' ? 'bg-white text-indigo-700 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {isEn ? '👨‍💻 My Assignments' : '👨‍💻 Việc tôi phụ trách'}
            </button>
          </div>

          <Link
            href="/tickets/reports"
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 border border-slate-300 dark:border-slate-700"
            title={isEn ? 'View Dashboard & Multi-dimensional Support Reports' : 'Xem Dashboard & Báo Cáo Phân Tích Hỗ Trợ Đa Chiều'}
          >
            <BarChart3 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>{isEn ? 'Reports & Analytics' : 'Báo Cáo & Thống Kê'}</span>
          </Link>

          {isITStaffOrAdmin && (
            <button
              type="button"
              onClick={() => setIsRecurringModalOpen(true)}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 shadow-2xs hover:scale-[1.02] active:scale-[0.98]"
              title={isEn ? 'Manage Recurring Maintenance Schedules & Auto-Ticket Engine (Enterprise)' : 'Quản lý lịch bảo trì định kỳ & tự động sinh Ticket (Enterprise)'}
            >
              <Calendar className="w-3.5 h-3.5 text-amber-600" />
              <span>{isEn ? 'Recurring Tasks' : 'Lịch định kỳ'}</span>
              <span className="text-[9.5px] bg-amber-200 text-amber-900 px-1 py-0.2 rounded font-black">👑</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              if (currentUser?.id) {
                setNewRequesterId(currentUser.id);
                loadRequesterAssets(currentUser.id);
              }
              setNewTitle('');
              setNewDesc('');
              setAiDiagnostic(null);
              lastAnalyzedTextRef.current = '';
              // Auto-assign to current IT technician if creator is IT
              if (isITStaffOrAdmin && currentUser?.id) {
                setNewAssignedToId(currentUser.id);
              } else {
                setNewAssignedToId('');
              }
              setNewStatus('OPEN');
              setIsCreateModalOpen(true);
            }}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer shrink-0 hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{isEn ? '+ Create Ticket' : 'Tạo Ticket Mới'}</span>
          </button>
        </div>
      </div>

      {/* KPI Quick Filter Chips Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-0.5 text-xs">
        <button
          type="button"
          onClick={() => setActiveChip('ALL')}
          className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all shrink-0 cursor-pointer ${
            activeChip === 'ALL'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <span>{isEn ? '📦 All' : '📦 Tất cả'}</span>
          <span className={`px-2 py-0.2 rounded-full text-[10px] font-bold ${activeChip === 'ALL' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-700'}`}>
            {stats.total}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveChip('OPEN')}
          className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all shrink-0 cursor-pointer ${
            activeChip === 'OPEN'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white text-blue-700 border border-blue-200 hover:bg-blue-50/60'
          }`}
        >
          <span>{isEn ? '🟡 Open' : '🟡 Mới mở'}</span>
          <span className={`px-2 py-0.2 rounded-full text-[10px] font-bold ${activeChip === 'OPEN' ? 'bg-blue-700 text-white' : 'bg-blue-100 text-blue-800'}`}>
            {stats.open}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveChip('IN_PROGRESS')}
          className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all shrink-0 cursor-pointer ${
            activeChip === 'IN_PROGRESS'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'bg-white text-amber-700 border border-amber-200 hover:bg-amber-50/60'
          }`}
        >
          <span>{isEn ? '🔵 In Progress' : '🔵 Đang xử lý'}</span>
          <span className={`px-2 py-0.2 rounded-full text-[10px] font-bold ${activeChip === 'IN_PROGRESS' ? 'bg-amber-700 text-white' : 'bg-amber-100 text-amber-800'}`}>
            {stats.inProgress}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveChip('URGENT')}
          className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all shrink-0 cursor-pointer ${
            activeChip === 'URGENT'
              ? 'bg-rose-600 text-white shadow-xs'
              : 'bg-white text-rose-700 border border-rose-200 hover:bg-rose-50/60'
          }`}
        >
          <span>{isEn ? '🔥 Urgent' : '🔥 Khẩn cấp'}</span>
          <span className={`px-2 py-0.2 rounded-full text-[10px] font-bold ${activeChip === 'URGENT' ? 'bg-rose-700 text-white' : 'bg-rose-100 text-rose-800'}`}>
            {stats.urgent}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveChip('RESOLVED')}
          className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all shrink-0 cursor-pointer ${
            activeChip === 'RESOLVED'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-white text-emerald-700 border border-emerald-200 hover:bg-emerald-50/60'
          }`}
        >
          <span>{isEn ? '🟢 Done' : '🟢 Đã xong'}</span>
          <span className={`px-2 py-0.2 rounded-full text-[10px] font-bold ${activeChip === 'RESOLVED' ? 'bg-emerald-700 text-white' : 'bg-emerald-100 text-emerald-800'}`}>
            {stats.resolved}
          </span>
        </button>

        {/* CSAT Metric Pill */}
        <div className="ml-auto hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50/90 border border-amber-200/90 text-amber-900 font-bold text-xs shrink-0 shadow-2xs" title={isEn ? `Average CSAT score from ${stats.csatCount || 0} reviews` : `Điểm hài lòng trung bình từ ${stats.csatCount || 0} lượt đánh giá`}>
          <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
          <span>CSAT:</span>
          <span className="font-black text-amber-700">{stats.csatAverage || '5.0'} / 5</span>
          <span className="text-[10.5px] font-normal text-amber-800/80">({stats.csatCount || 0} {isEn ? 'ratings' : 'đánh giá'})</span>
        </div>
      </div>

      {/* Searchable Multi-Filter Toolbar */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3 text-xs">
        {/* Global Search Bar */}
        <div className="relative w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={isEn ? 'Search by ticket #, title, requester, IT assignee, device name or serial...' : 'Tìm theo mã TK, tiêu đề sự cố, tên người gửi, IT xử lý, tên máy tính hoặc số serial...'}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50/80 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
          />
        </div>

        {/* Searchable Filters Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
          {/* Filter 1: Category */}
          <SearchableDropdown
            label={isEn ? 'Category' : 'Loại sự cố'}
            value={categoryFilter}
            options={categoryOptions}
            onChange={setCategoryFilter}
            searchPlaceholder={isEn ? 'Search category...' : 'Tìm loại sự cố...'}
          />

          {/* Filter 2: Priority */}
          <SearchableDropdown
            label={isEn ? 'Priority' : 'Mức ưu tiên'}
            value={priorityFilter}
            options={priorityOptions}
            onChange={setPriorityFilter}
            searchPlaceholder={isEn ? 'Search priority...' : 'Tìm mức độ...'}
          />

          {/* Filter 3: Status */}
          <SearchableDropdown
            label={isEn ? 'Status' : 'Trạng thái'}
            value={statusFilter}
            options={statusOptions}
            onChange={setStatusFilter}
            searchPlaceholder={isEn ? 'Search status...' : 'Tìm trạng thái...'}
          />

          {/* Filter 4: Creator (Searchable User List) */}
          <SearchableDropdown
            label={isEn ? `Requester (${users.length})` : `Người gửi (${users.length})`}
            value={creatorFilter}
            options={creatorOptions}
            onChange={setCreatorFilter}
            searchPlaceholder={isEn ? '🔍 Search employee name...' : '🔍 Tìm tên nhân viên...'}
          />

          {/* Filter 5: Assignee (Searchable IT Staff List) */}
          <SearchableDropdown
            label={isEn ? 'IT Assignee' : 'IT phụ trách'}
            value={assigneeFilter}
            options={itAssigneeOptions}
            onChange={setAssigneeFilter}
            searchPlaceholder={isEn ? '🔍 Search IT technician...' : '🔍 Tìm kỹ thuật viên IT...'}
          />

          {/* Filter 6: Asset (Searchable Equipment List) */}
          <SearchableDropdown
            label={isEn ? `Device (${assets.length})` : `Thiết bị (${assets.length})`}
            value={assetFilter}
            options={assetOptions}
            onChange={setAssetFilter}
            searchPlaceholder={isEn ? '🔍 Search device code or name...' : '🔍 Tìm mã hoặc tên máy...'}
          />
        </div>

        {/* Reset Filters Status Row */}
        {hasActiveFilters && (
          <div className="flex items-center justify-between pt-1.5 border-t border-slate-100 text-[11px]">
            <span className="text-slate-500">
              {isEn ? 'Showing' : 'Đang lọc hiển thị'} <strong>{filteredTickets.length}</strong> / {tickets.length} {isEn ? 'ticket(s)' : 'ticket'}
            </span>
            <button
              type="button"
              onClick={resetAllFilters}
              className="text-rose-600 hover:text-rose-700 font-bold flex items-center gap-1 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>{isEn ? 'Clear all filters' : 'Xóa toàn bộ bộ lọc'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Enterprise High-Density Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table-fixed w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/90 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-2.5 w-[36px] text-center">
                  <input
                    type="checkbox"
                    checked={filteredTickets.length > 0 && selectedTicketIds.length === filteredTickets.length}
                    onChange={handleSelectAllTickets}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 cursor-pointer"
                  />
                </th>
                <th className="py-3 px-3.5 w-[24%]">{isEn ? 'TICKET & TITLE' : 'Mã & Tiêu Đề Sự Cố'}</th>
                <th className="py-3 px-3 w-[13%]">{isEn ? 'CATEGORY' : 'Phân Loại'}</th>
                <th className="py-3 px-2.5 w-[10%]">{isEn ? 'PRIORITY' : 'Mức Độ'}</th>
                <th className="py-3 px-2.5 w-[10%]">{isEn ? 'STATUS' : 'Trạng Thái'}</th>
                <th className="py-3 px-3 w-[19%]">{isEn ? 'SLA DEADLINE' : 'Hạn SLA & Tiến Độ'}</th>
                <th className="py-3 px-3 w-[15%]">{isEn ? 'REQUESTER & IT' : 'Người Gửi & IT'}</th>
                <th className="py-3 px-2.5 w-[9%] text-right whitespace-nowrap">{isEn ? 'ACTIONS' : 'Thao Tác'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
                    <span className="font-semibold text-xs text-slate-500">{isEn ? 'Loading tickets...' : 'Đang tải danh sách ticket...'}</span>
                  </td>
                </tr>
              ) : filteredTickets.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-slate-400 space-y-2">
                    <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto text-xl font-bold">
                      🎫
                    </div>
                    <p className="font-bold text-slate-700 text-sm">{isEn ? 'No tickets found' : 'Không tìm thấy ticket nào'}</p>
                    <p className="text-xs text-slate-400">{isEn ? 'No support requests match the current filters.' : 'Không có yêu cầu hỗ trợ nào phù hợp với bộ lọc hiện tại.'}</p>
                    {hasActiveFilters && (
                      <button
                        type="button"
                        onClick={resetAllFilters}
                        className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-xl text-xs hover:underline font-bold inline-flex items-center gap-1 cursor-pointer"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>{isEn ? 'Clear filters' : 'Xóa bộ lọc'}</span>
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                filteredTickets.map((t) => {
                  const cat = CATEGORY_MAP[t.category] || CATEGORY_MAP.OTHER;
                  const pri = PRIORITY_MAP[t.priority] || PRIORITY_MAP.MEDIUM;
                  const sta = STATUS_MAP[t.status] || STATUS_MAP.OPEN;
                  const PriIcon = pri.icon;
                  const sla = getTicketSLA(t, slaConfig, language);

                  return (
                    <tr
                      key={t.id}
                      className={`transition-colors group cursor-pointer ${
                        selectedTicketIds.includes(t.id) ? 'bg-blue-50/70' : 'hover:bg-blue-50/40'
                      }`}
                      onClick={() => {
                        setSelectedTicket(t);
                        setIsDetailModalOpen(true);
                      }}
                    >
                      {/* Checkbox chọn hàng */}
                      <td className="py-3 px-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedTicketIds.includes(t.id)}
                          onChange={(e) => handleToggleSelectTicket(t.id, e as any)}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 cursor-pointer"
                        />
                      </td>

                      {/* Mã & Tiêu Đề Sự Cố (2 DÒNG RÕ RÀNG) */}
                      <td className="py-3 px-3.5">
                        <div className="space-y-1.5">
                          {/* Dòng 1: Mã Ticket + Sự cố + Gộp + Team + Thiết bị + Số bình luận */}
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-mono font-bold text-[10.5px] px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-800 border border-slate-200/80 shrink-0">
                              {t.ticketNumber}
                            </span>
                            {t.mergedIntoTicketId && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-300 font-bold text-[10px] shrink-0" title={isEn ? 'Merged ticket' : 'Đã gộp vào ticket khác'}>
                                <span>🔀 Đã gộp</span>
                              </span>
                            )}
                            {t.mergedTickets && t.mergedTickets.length > 0 && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-300 font-bold text-[10px] shrink-0" title={isEn ? `${t.mergedTickets.length} child tickets merged into this` : `Đã gộp ${t.mergedTickets.length} ticket con`}>
                                <span>🔗 +{t.mergedTickets.length} gộp</span>
                              </span>
                            )}
                            {t.incident && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200/80 font-bold text-[10px] shrink-0" title={isEn ? `Belongs to Incident: ${t.incident.incidentNumber} - ${t.incident.title}` : `Thuộc Sự cố: ${t.incident.incidentNumber} - ${t.incident.title}`}>
                                <span>🚨 {t.incident.incidentNumber}</span>
                              </span>
                            )}
                            {t.team && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200/80 font-semibold text-[10px] shrink-0" title={isEn ? `Routed to Team: ${t.team.name}` : `Phân tuyến đến Team: ${t.team.name}`}>
                                <span>🏢 {t.team.name}</span>
                              </span>
                            )}
                            {t.asset ? (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200/60 font-semibold text-[10px] truncate max-w-[160px]" title={`[${t.asset.assetTag}] ${t.asset.name}`}>
                                <Laptop className="w-2.5 h-2.5 text-blue-600 shrink-0" />
                                <span className="truncate">[{t.asset.assetTag}] {t.asset.name}</span>
                              </span>
                            ) : t.customAssetName ? (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200/60 font-semibold text-[10px] truncate max-w-[160px]" title={t.customAssetName}>
                                <span>🔧 {t.customAssetName}</span>
                              </span>
                            ) : null}
                            <span className="inline-flex items-center gap-1 text-[10px] text-slate-500 bg-slate-100/80 px-1.5 py-0.5 rounded font-medium shrink-0">
                              <MessageSquare className="w-2.5 h-2.5 text-slate-400" />
                              <span>{t.comments?.length || 0}</span>
                            </span>
                            {t.actualSpentMinutes && t.actualSpentMinutes > 0 ? (
                              <span
                                className="inline-flex items-center gap-1 text-[10px] text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-1.5 py-0.5 rounded font-bold shrink-0"
                                title={isEn ? `Logged work time: ${formatSpentTime(t.actualSpentMinutes, isEn)}` : `Thời gian xử lý: ${formatSpentTime(t.actualSpentMinutes, isEn)}`}
                              >
                                <Clock className="w-2.5 h-2.5 text-emerald-600" />
                                <span>{formatSpentTime(t.actualSpentMinutes, isEn)}</span>
                              </span>
                            ) : null}
                            {t.rating ? (
                              <span
                                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200/90 font-bold text-[10px] shrink-0"
                                title={`Đánh giá CSAT: ${t.rating}/5 sao - ${t.ratingComment || 'Không có nhận xét'}`}
                              >
                                <Star className="w-2.5 h-2.5 text-amber-500 fill-amber-500" />
                                <span>{t.rating}/5</span>
                              </span>
                            ) : null}
                          </div>

                          {/* Dòng 2: Tiêu Đề Sự Cố (Cho phép ngắt 2 dòng đọc rõ ràng) */}
                          <div
                            className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors text-xs leading-snug line-clamp-2"
                            title={t.title}
                          >
                            {t.title}
                          </div>
                        </div>
                      </td>

                      {/* Phân Loại */}
                      <td className="py-3 px-3">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-semibold border ${cat.color} whitespace-nowrap shadow-2xs`}>
                          <span>{cat.icon}</span>
                          <span>{getCategoryLabel(t.category, language)}</span>
                        </span>
                      </td>

                      {/* Mức Độ */}
                      <td className="py-3 px-2.5">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold border ${pri.badge} whitespace-nowrap shadow-2xs`}>
                          <PriIcon className="w-3 h-3" />
                          <span>{getPriorityLabel(t.priority, language)}</span>
                        </span>
                      </td>

                      {/* Trạng Thái */}
                      <td className="py-3 px-2.5">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold border ${sta.badge} whitespace-nowrap shadow-2xs`}>
                          <span className={`w-2 h-2 rounded-full ${sta.dot} ${t.status === 'OPEN' || t.status === 'IN_PROGRESS' ? 'animate-pulse' : ''}`} />
                          <span>{getStatusLabel(t.status, language)}</span>
                        </span>
                      </td>

                      {/* Hạn SLA & Tiến Độ */}
                      <td className="py-3 px-3">
                        <div className="space-y-1 text-[10.5px]">
                          <div className="flex items-center gap-1 text-slate-600 font-medium">
                            <span className="text-slate-400">{isEn ? '🕒 Started:' : '🕒 Bắt đầu:'}</span>
                            <span className="font-semibold text-slate-800">{sla.createdAtFormatted}</span>
                          </div>
                          <div className="flex items-center gap-1 text-slate-700">
                            <span className="text-slate-400">{isEn ? '🎯 SLA Deadline:' : '🎯 Hạn SLA:'}</span>
                            <span className="font-bold text-slate-900">{sla.deadlineFormatted} ({sla.slaHours}h)</span>
                          </div>
                          <div>
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] font-bold border shadow-2xs ${sla.badgeClass}`}>
                              <span>{sla.icon}</span>
                              <span>{sla.statusText}</span>
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Người Gửi & IT Phụ Trách */}
                      <td className="py-3 px-3 text-[11px]" onClick={(e) => e.stopPropagation()}>
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-slate-400 text-[10px]">{isEn ? 'From:' : 'Gửi:'}</span>
                            {t.createdBy?.id ? (
                              <QuickLink
                                type="user"
                                id={t.createdBy.id}
                                label={t.createdBy.fullName}
                                showIcon={false}
                                className="font-bold text-slate-900 text-[11px]"
                              />
                            ) : (
                              <span className="font-bold text-slate-900 truncate">{t.createdBy?.fullName || '—'}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-slate-400 text-[10px]">IT:</span>
                            {t.assignedTo?.id ? (
                              <QuickLink
                                type="user"
                                id={t.assignedTo.id}
                                label={t.assignedTo.fullName}
                                icon="👨‍💻"
                                showIcon={true}
                                className="font-bold text-indigo-700 text-[11px]"
                              />
                            ) : (
                              <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-medium italic text-[10px] border border-slate-200/60">
                                {isEn ? 'Unassigned' : 'Chưa phân công'}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Thao Tác */}
                      <td className="py-3 px-2.5 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setSelectedTicket(t);
                              setIsDetailModalOpen(true);
                            }}
                            title={isEn ? 'View details & discuss' : 'Xem chi tiết & trao đổi'}
                            className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-[11px] font-bold inline-flex items-center gap-1 transition-all shadow-2xs cursor-pointer shrink-0"
                          >
                            <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
                            <span>{isEn ? 'Discuss' : 'Trao đổi'}</span>
                          </button>
                          <button
                            onClick={() => handleDeleteTicket(t.id)}
                            title={isEn ? 'Delete ticket' : 'Xóa ticket'}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer shrink-0"
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
      </div>

      {/* MODAL 1: CHI TIẾT TICKET & TRAO ĐỔI (INTERACTIVE THREAD - WIDE & SPACIOUS) */}
      {isDetailModalOpen && selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-7xl w-[96vw] flex flex-col max-h-[94vh] border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-start justify-between gap-3 bg-gradient-to-r from-slate-50 via-blue-50/30 to-indigo-50/20">
              <div className="space-y-1.5 min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono font-black text-xs px-2.5 py-0.5 rounded-lg bg-blue-600 text-white shadow-xs">
                    {selectedTicket.ticketNumber}
                  </span>
                  <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-lg border ${STATUS_MAP[selectedTicket.status]?.badge || 'bg-slate-100 text-slate-700'}`}>
                    {getStatusLabel(selectedTicket.status, language)}
                  </span>
                  <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-lg border ${PRIORITY_MAP[selectedTicket.priority]?.badge || 'bg-slate-100 text-slate-700'}`}>
                    {getPriorityLabel(selectedTicket.priority, language)}
                  </span>
                  <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-700 border border-slate-200">
                    {getCategoryLabel(selectedTicket.category, language)}
                  </span>
                </div>
                <h2 className="text-base sm:text-lg font-extrabold text-slate-900 leading-snug tracking-tight">
                  {selectedTicket.title}
                </h2>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {/* 🔀 Merge Ticket Button (👑 Enterprise) */}
                {isITStaffOrAdmin && !selectedTicket.mergedIntoTicketId && selectedTicket.status !== 'CLOSED' && (
                  <button
                    type="button"
                    onClick={() => {
                      setMergeTargetTicketId('');
                      setMergeSearchTerm('');
                      setMergeReason('Trùng lặp nội dung yêu cầu');
                      setIsMergeModalOpen(true);
                    }}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-xs border border-amber-300 transition-colors cursor-pointer"
                    title={isEn ? 'Merge this duplicate ticket into a main ticket' : 'Gộp ticket trùng lặp này vào ticket chính'}
                  >
                    <GitMerge className="w-3.5 h-3.5 text-amber-600" />
                    <span className="hidden sm:inline">{isEn ? 'Merge' : 'Gộp Ticket'}</span>
                    <span className="text-[10px] bg-amber-200 text-amber-900 px-1 py-0.2 rounded font-black">👑</span>
                  </button>
                )}

                {/* 🚨 Link Major Incident Button (👑 Enterprise) */}
                {isITStaffOrAdmin && (
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIsIncidentMenuOpen(!isIncidentMenuOpen)}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl font-bold text-xs border transition-colors cursor-pointer ${
                        selectedTicket.incidentId
                          ? 'bg-rose-50 text-rose-700 border-rose-300 hover:bg-rose-100'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                      title={isEn ? 'Link to Major Incident' : 'Liên kết với Sự cố lớn'}
                    >
                      <span className="text-xs">🚨</span>
                      <span className="hidden sm:inline">
                        {selectedTicket.incident
                          ? selectedTicket.incident.incidentNumber
                          : isEn
                          ? 'Link Incident'
                          : 'Sự cố'}
                      </span>
                      <span className="text-[10px] bg-rose-200 text-rose-900 px-1 py-0.2 rounded font-black">👑</span>
                    </button>

                    {isIncidentMenuOpen && (
                      <div className="absolute right-0 mt-1.5 w-72 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 z-50 animate-in fade-in zoom-in-95 space-y-1">
                        <div className="px-2 py-1 font-bold text-slate-800 text-xs border-b border-slate-100 flex items-center justify-between">
                          <span>{isEn ? 'Link to Major Incident' : 'Liên kết với Sự cố'}</span>
                          <span className="text-[10px] text-slate-400">👑 Enterprise</span>
                        </div>
                        {selectedTicket.incidentId && (
                          <button
                            type="button"
                            onClick={() => handleLinkIncident(null)}
                            disabled={linkingIncident}
                            className="w-full text-left px-2 py-1.5 text-xs text-rose-600 hover:bg-rose-50 rounded-lg font-semibold flex items-center gap-2 cursor-pointer"
                          >
                            <span>❌</span>
                            <span>{isEn ? 'Unlink current incident' : 'Gỡ liên kết sự cố hiện tại'}</span>
                          </button>
                        )}
                        <div className="max-h-48 overflow-y-auto space-y-1 pt-1">
                          {incidentsList.length === 0 ? (
                            <p className="text-slate-400 text-center py-3 text-xs italic">
                              {isEn ? 'No active incidents found.' : 'Không có sự cố nào đang mở.'}
                            </p>
                          ) : (
                            incidentsList.map((inc) => (
                              <button
                                key={inc.id}
                                type="button"
                                onClick={() => handleLinkIncident(inc.id)}
                                disabled={linkingIncident}
                                className={`w-full text-left p-2 rounded-xl text-xs transition-colors cursor-pointer flex flex-col gap-0.5 ${
                                  selectedTicket.incidentId === inc.id
                                    ? 'bg-rose-50 border border-rose-200 text-rose-800 font-bold'
                                    : 'hover:bg-slate-50 text-slate-700'
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-mono font-bold text-rose-600">[{inc.incidentNumber}]</span>
                                  <span className="text-[10px] font-bold px-1.5 rounded bg-slate-100 text-slate-600">{inc.severity}</span>
                                </div>
                                <span className="truncate text-slate-800 font-medium">{inc.title}</span>
                              </button>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleOpenConvertToKb}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs border border-indigo-200 transition-colors cursor-pointer"
                  title={isEn ? 'Convert Ticket to Knowledge Base Article' : 'Chuyển thành bài viết Thư viện Hướng dẫn (KB)'}
                >
                  <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
                  <span className="hidden sm:inline">{isEn ? 'Save to KB' : 'Lưu vào KB'}</span>
                  <span className="text-[10px] bg-indigo-200/80 text-indigo-900 px-1 py-0.2 rounded font-black">👑</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsDetailModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors cursor-pointer shrink-0"
                  title={isEn ? 'Close modal' : 'Đóng modal'}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body (Scrollable with 2-Column Wide Layout) */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1 text-xs">
              {/* Alert Banner: Merged Into Ticket */}
              {selectedTicket.mergedIntoTicket && (
                <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-2xl flex items-center justify-between gap-3 text-amber-950 animate-in fade-in">
                  <div className="flex items-center gap-2 min-w-0">
                    <GitMerge className="w-4 h-4 text-amber-600 shrink-0" />
                    <span className="font-bold text-xs truncate">
                      {isEn ? 'This ticket was merged into main ticket:' : 'Ticket này đã được gộp vào ticket chính:'}{' '}
                      <span className="font-mono text-blue-700 underline cursor-pointer" onClick={() => {
                        const target = tickets.find((t) => t.id === selectedTicket.mergedIntoTicket?.id);
                        if (target) setSelectedTicket(target);
                      }}>
                        #{selectedTicket.mergedIntoTicket.ticketNumber} - {selectedTicket.mergedIntoTicket.title}
                      </span>
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const target = tickets.find((t) => t.id === selectedTicket.mergedIntoTicket?.id);
                      if (target) setSelectedTicket(target);
                    }}
                    className="px-2.5 py-1 bg-amber-200 hover:bg-amber-300 text-amber-950 font-bold rounded-lg text-xs transition-colors shrink-0 cursor-pointer"
                  >
                    {isEn ? 'View root ticket ↗' : 'Xem ticket gốc ↗'}
                  </button>
                </div>
              )}

              {/* Info Banner: Merged Child Tickets */}
              {selectedTicket.mergedTickets && selectedTicket.mergedTickets.length > 0 && (
                <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-2xl space-y-1.5 text-indigo-950 animate-in fade-in">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 font-bold text-xs">
                      <GitMerge className="w-4 h-4 text-indigo-600 shrink-0" />
                      <span>{isEn ? `🔗 Merged child tickets (${selectedTicket.mergedTickets.length}):` : `🔗 Đã gộp ${selectedTicket.mergedTickets.length} ticket con liên quan:`}</span>
                    </div>
                    <span className="text-[10px] bg-indigo-200/80 text-indigo-900 px-1.5 py-0.5 rounded font-black">👑 Enterprise Broadcast</span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap pt-0.5">
                    {selectedTicket.mergedTickets.map((child) => (
                      <button
                        key={child.id}
                        type="button"
                        onClick={() => {
                          const target = tickets.find((t) => t.id === child.id);
                          if (target) setSelectedTicket(target);
                        }}
                        className="px-2.5 py-1 bg-white border border-indigo-200 hover:border-indigo-400 rounded-xl text-xs font-semibold text-indigo-800 shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
                        title={child.title}
                      >
                        <span className="font-mono font-black text-indigo-600">#{child.ticketNumber}</span>
                        <span className="truncate max-w-[140px] text-slate-700">{child.title}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Info Banner: Linked Incident */}
              {selectedTicket.incident && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-between gap-3 text-rose-950 animate-in fade-in">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-base shrink-0">🚨</span>
                    <div className="text-xs truncate">
                      <span className="font-bold text-rose-800">{isEn ? 'Major Incident:' : 'Sự cố trọng yếu:'}</span>{' '}
                      <span className="font-mono font-black text-rose-700">[{selectedTicket.incident.incidentNumber}]</span>{' '}
                      <span className="font-semibold text-slate-800">{selectedTicket.incident.title}</span>
                    </div>
                  </div>
                  {isITStaffOrAdmin && (
                    <button
                      type="button"
                      onClick={() => handleLinkIncident(null)}
                      disabled={linkingIncident}
                      className="px-2.5 py-1 text-rose-700 hover:text-rose-900 bg-rose-100 hover:bg-rose-200 rounded-lg font-bold text-xs transition-colors shrink-0 cursor-pointer"
                      title={isEn ? 'Unlink from incident' : 'Gỡ khỏi sự cố'}
                    >
                      {isEn ? 'Unlink' : 'Gỡ liên kết'}
                    </button>
                  )}
                </div>
              )}

              {/* Meta Grid Banner */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 p-3.5 rounded-2xl bg-slate-50/90 border border-slate-200/80 text-[11.5px]">
                <div className="space-y-0.5">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">{isEn ? 'Requester' : 'Người yêu cầu'}</span>
                  {selectedTicket.createdBy?.id ? (
                    <QuickLink
                      type="user"
                      id={selectedTicket.createdBy.id}
                      label={selectedTicket.createdBy.fullName || (isEn ? 'User' : 'Người dùng')}
                      avatarUrl={selectedTicket.createdBy.avatarUrl}
                      icon="👤"
                      className="font-bold text-slate-900 text-xs"
                    />
                  ) : (
                    <div className="font-bold text-slate-900 flex items-center gap-1.5 truncate">
                      <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] shrink-0 font-extrabold">👤</span>
                      <span className="truncate">{selectedTicket.createdBy?.fullName || (isEn ? 'User' : 'Người dùng')}</span>
                    </div>
                  )}
                  <span className="text-[10px] text-slate-400 block truncate">{selectedTicket.createdBy?.email}</span>
                </div>

                <div className="space-y-0.5">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">{isEn ? 'IT Assignee' : 'IT Phụ trách'}</span>
                  {selectedTicket.assignedTo?.id ? (
                    <QuickLink
                      type="user"
                      id={selectedTicket.assignedTo.id}
                      label={selectedTicket.assignedTo.fullName}
                      avatarUrl={selectedTicket.assignedTo.avatarUrl}
                      icon="👨‍💻"
                      className="font-bold text-blue-700 text-xs"
                    />
                  ) : (
                    <div className="font-semibold text-slate-400 italic text-xs">{isEn ? 'Unassigned' : 'Chưa phân công'}</div>
                  )}
                  <span className="text-[10px] text-slate-400 block truncate">{selectedTicket.assignedTo?.email || (isEn ? 'Pending assignment' : 'Đang chờ điều phối')}</span>
                </div>

                <div className="space-y-0.5">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">{isEn ? 'Category & Company' : 'Phân loại & Công ty'}</span>
                  <div className="font-bold text-slate-800 truncate">
                    {CATEGORY_MAP[selectedTicket.category]?.label}
                  </div>
                  <span className="text-[10px] text-slate-500 block truncate">🏢 {selectedTicket.companyName || selectedTicket.createdBy?.department || (isEn ? 'ABC Corp' : 'Tập đoàn ABC')}</span>
                </div>

                <div className="space-y-0.5">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">{isEn ? 'Incident Device' : 'Thiết bị sự cố'}</span>
                  {selectedTicket.asset ? (
                    <QuickLink
                      type="asset"
                      id={selectedTicket.asset.id}
                      label={`[${selectedTicket.asset.assetTag}] ${selectedTicket.asset.name}`}
                      icon="💻"
                      className="font-bold text-blue-700 text-xs"
                    />
                  ) : selectedTicket.customAssetName ? (
                    <div className="font-bold text-amber-800 flex items-center gap-1 truncate" title={selectedTicket.customAssetName}>
                      <span className="truncate">🔧 {selectedTicket.customAssetName}</span>
                    </div>
                  ) : (
                    <span className="text-slate-400 italic">{isEn ? 'Not selected' : 'Không chọn'}</span>
                  )}
                  <span className="text-[10px] text-slate-400 block">
                    {selectedTicket.asset?.status ? `${isEn ? 'Status:' : 'Trạng thái:'} ${selectedTicket.asset.status}` : (isEn ? 'Unassigned device' : 'Thiết bị tự do')}
                  </span>
                </div>

                <div className="space-y-0.5">
                  <div className="flex items-center gap-1">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">{isEn ? 'Logged Time' : 'Thời gian xử lý'}</span>
                    <span className="text-[9px] bg-amber-100 text-amber-900 px-1 py-0.2 rounded font-black">👑</span>
                  </div>
                  <div className="font-extrabold text-slate-800 text-xs flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className={selectedTicket.actualSpentMinutes && selectedTicket.actualSpentMinutes > 0 ? 'text-emerald-700' : 'text-slate-700'}>
                      {formatSpentTime(selectedTicket.actualSpentMinutes, isEn)}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 block truncate">
                    {selectedTicket.actualSpentMinutes && selectedTicket.actualSpentMinutes > 0
                      ? (isEn ? `Total: ${selectedTicket.actualSpentMinutes} mins` : `Tổng: ${selectedTicket.actualSpentMinutes} phút`)
                      : (isEn ? 'Not logged yet' : 'Chưa ghi nhận')}
                  </span>
                </div>
              </div>

              {/* SLA & Tiến Độ Thời Gian Bar */}
              {selectedSla && (
                <div className="p-3.5 rounded-2xl bg-gradient-to-r from-blue-50/60 via-indigo-50/40 to-slate-50 border border-blue-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[11.5px]">
                  <div className="flex items-center gap-5 flex-wrap">
                    <div className="space-y-0.5">
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">{isEn ? '🕒 Opened:' : '🕒 Mở ticket:'}</span>
                      <span className="font-bold text-slate-900">{selectedSla.createdAtFormatted}</span>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">{isEn ? '🎯 Standard SLA:' : '🎯 Hạn SLA chuẩn:'}</span>
                      <span className="font-bold text-slate-900">{selectedSla.deadlineFormatted} ({selectedSla.slaHours}h)</span>
                    </div>
                    {(selectedTicket as any).isSlaExtended && (
                      <span className="px-2.5 py-0.5 rounded-lg bg-amber-100 text-amber-900 border border-amber-300 font-extrabold text-[10px] inline-flex items-center gap-1">
                        <span>⏱️</span>
                        <span>{isEn ? 'SLA Extended' : 'Đã Gia Hạn SLA'}</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`px-3 py-1 rounded-xl text-xs font-black border inline-flex items-center gap-1.5 shadow-2xs ${selectedSla.badgeClass}`}>
                      <span>{selectedSla.icon}</span>
                      <span>{selectedSla.statusText}</span>
                    </span>

                    {isITStaffOrAdmin && selectedTicket.status !== 'RESOLVED' && selectedTicket.status !== 'CLOSED' && (
                      <button
                        type="button"
                        onClick={() => setIsSlaExtModalOpen(true)}
                        className="px-3 py-1 bg-white hover:bg-amber-50 text-amber-800 border border-amber-300 rounded-xl text-xs font-bold shadow-2xs cursor-pointer flex items-center gap-1.5 transition-all hover:scale-[1.02]"
                      >
                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                        <span>{isEn ? 'Request SLA Extension' : 'Xin Gia Hạn SLA'}</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* ROW 1: TICKET CONTEXT & TECHNICAL DIAGNOSTICS (2-COLUMN BALANCED WORKSPACE) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                {/* Left Column (7/12 cols): Issue Description & Attachments & Routing */}
                <div className="lg:col-span-7 space-y-4">
                  {/* Description Card */}
                  <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2">
                    <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-blue-600" />
                      <span>{isEn ? 'Incident Description & Requirements:' : 'Mô tả chi tiết sự cố & Yêu cầu:'}</span>
                    </h4>
                    <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-100 text-slate-800 leading-relaxed whitespace-pre-wrap font-medium text-[11.5px]">
                      {selectedTicket.description}
                    </div>

                    {/* Initial Attachments */}
                    {Array.isArray(selectedTicket.attachmentUrls) && (selectedTicket.attachmentUrls as any[]).length > 0 && (
                      <div className="pt-2 border-t border-slate-100 space-y-2">
                        <span className="text-[11px] font-bold text-blue-900 flex items-center gap-1">
                          <Paperclip className="w-3.5 h-3.5 text-blue-600" />
                          <span>{isEn ? 'Attachments & Images' : 'Tệp & Hình ảnh đính kèm'} ({(selectedTicket.attachmentUrls as any[]).length}):</span>
                        </span>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {(selectedTicket.attachmentUrls as any[]).map((att: any, aIdx: number) => {
                            const isImg = /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(att.url) || /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(att.name || '');
                            return (
                              <div
                                key={aIdx}
                                className="bg-slate-50 p-2 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between space-y-1.5 group"
                              >
                                <div className="flex items-center gap-1.5 truncate">
                                  {isImg ? (
                                    <img
                                      src={att.url}
                                      alt={att.name || (isEn ? 'Attachment image' : 'Ảnh đính kèm')}
                                      onClick={() => setPreviewImageModal(att.url)}
                                      className="w-full h-24 object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity border border-slate-200"
                                    />
                                  ) : (
                                    <div className="w-full h-16 rounded-lg bg-white flex items-center justify-center text-blue-600 border border-slate-200">
                                      <FileText className="w-7 h-7" />
                                    </div>
                                  )}
                                </div>
                                <div className="flex items-center justify-between gap-1 pt-1 border-t border-slate-200 text-[10px]">
                                  <span className="font-semibold text-slate-700 truncate" title={att.name}>{att.name || (isEn ? 'Attachment' : 'Tệp đính kèm')}</span>
                                  <a
                                    href={att.url}
                                    download={att.name || 'file'}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="p-1 text-blue-600 hover:bg-blue-100 rounded-md"
                                    title={isEn ? 'Download' : 'Tải xuống'}
                                  >
                                    <Download className="w-3.5 h-3.5" />
                                  </a>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 🤖 BẢNG MINH BẠCH PHÂN TUYẾN TỰ ĐỘNG (ROUTING TRANSPARENCY) */}
                  <div className="p-3.5 rounded-2xl bg-gradient-to-br from-indigo-50/80 via-purple-50/40 to-slate-50 border border-indigo-200/80 space-y-2.5 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="p-1.5 rounded-lg bg-indigo-600 text-white">
                          <BrainCircuit className="w-3.5 h-3.5" />
                        </span>
                        <div>
                          <h5 className="font-bold text-slate-900 text-xs">{isEn ? 'Transparent Routing Path' : 'Minh Bạch Phân Tuyến (Routing Path)'}</h5>
                          <p className="text-[10px] text-slate-500">{isEn ? 'Auto-routed based on user context & category' : 'Tự động định tuyến dựa trên ngữ cảnh người dùng & danh mục'}</p>
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 rounded-md font-bold text-[9.5px] border ${
                        selectedTicket.isAutoRouted
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-purple-50 text-purple-700 border-purple-200'
                      }`}>
                        {selectedTicket.isAutoRouted ? (isEn ? '🤖 Auto-routed' : '🤖 Tự động phân tuyến') : (isEn ? '✍️ Manual assignment' : '✍️ Phân công thủ công')}
                      </span>
                    </div>

                    {/* Visual Path */}
                    <div className="p-2.5 bg-white rounded-xl border border-indigo-100 flex items-center gap-1.5 flex-wrap text-[11px]">
                      <span className="font-bold text-slate-500">{isEn ? 'Path:' : 'Đường dẫn:'}</span>
                      <span className="px-2 py-0.5 rounded bg-slate-100 font-semibold">{selectedTicket.companyName || selectedTicket.createdBy?.department || (isEn ? 'Enterprise' : 'Tập đoàn')}</span>
                      <span className="text-slate-400">➔</span>
                      <span className="px-2 py-0.5 rounded bg-slate-100 font-semibold">{getCategoryLabel(selectedTicket.category, language)}</span>
                      <span className="text-slate-400">➔</span>
                      <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 font-bold">Team: {selectedTicket.team?.name || (isEn ? 'Unassigned' : 'Chưa gán')}</span>
                      <span className="text-slate-400">➔</span>
                      <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-800 font-bold">Queue: {selectedTicket.queue?.name || 'Default Queue'}</span>
                      <span className="text-slate-400">➔</span>
                      <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">Assignee: {selectedTicket.assignedTo?.fullName || (isEn ? 'Pending pickup' : 'Chờ tiếp nhận')}</span>
                    </div>

                    {selectedTicket.routedByRule && (
                      <div className="text-[11px] text-indigo-900 font-medium">
                        {isEn ? '🎯 Applied Rule:' : '🎯 Rule áp dụng:'} <strong>"{selectedTicket.routedByRule}"</strong>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Column (5/12 cols): AI Diagnostic & IT Assistance */}
                <div className="lg:col-span-5 space-y-4">
                  {/* AI Diagnostic Summary Box for Technician if available */}
                  {(selectedTicket as any).aiAnalysis && (
                    <div className="p-3.5 bg-gradient-to-br from-purple-50 to-indigo-50/50 rounded-2xl border border-purple-200 text-xs space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-purple-900 flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                          <span>{isEn ? 'AI Technical Diagnostic' : 'Chẩn Đoán Kỹ Thuật AI (Diagnostic)'}</span>
                        </span>
                        <span className="text-[10px] bg-purple-200/80 text-purple-900 px-2 py-0.5 rounded-md font-bold">
                          Gemini AI
                        </span>
                      </div>
                      <p className="text-purple-950 font-medium text-[11px] leading-relaxed">
                        {(selectedTicket as any).aiAnalysis.diagnosticSummary}
                      </p>
                      {Array.isArray((selectedTicket as any).aiAnalysis.suggestedSteps) && (
                        <div className="pt-1.5 border-t border-purple-200/80 space-y-1">
                          <span className="font-bold text-[10.5px] text-purple-900">{isEn ? 'Initial resolution suggestion:' : 'Gợi ý xử lý ban đầu:'}</span>
                          <ul className="list-disc list-inside text-[10.5px] text-purple-900 space-y-0.5">
                            {(selectedTicket as any).aiAnalysis.suggestedSteps.map((step: string, sIdx: number) => (
                              <li key={sIdx}>{step}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 🛡️ KHU VỰC HỖ TRỢ NỘI BỘ IT (CHỈ IT & QUẢN LÝ THẤY) */}
                  {isITStaffOrAdmin && (
                    <div className="p-3.5 rounded-2xl bg-gradient-to-br from-amber-50/80 via-amber-50/40 to-indigo-50/50 border border-amber-200/80 space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-lg bg-amber-500 text-white flex items-center justify-center text-xs font-bold shadow-2xs">
                            🛡️
                          </div>
                          <div>
                            <h5 className="font-bold text-slate-900 text-xs">{isEn ? 'Escalate / Request IT Help' : 'Nhờ Thêm IT / Cấp Trên (Escalation)'}</h5>
                            <p className="text-[10px] text-amber-800">{isEn ? 'Visible to IT team only' : 'Chỉ hiển thị với đội ngũ IT'}</p>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded-md bg-amber-200/80 text-amber-900 font-bold text-[9px] border border-amber-300">
                          🔒 IT Only
                        </span>
                      </div>

                      {escalateSuccessMsg && (
                        <div className="p-2 bg-emerald-100 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-bold animate-in fade-in">
                          {escalateSuccessMsg}
                        </div>
                      )}

                      <div className="space-y-2">
                        <div>
                          <select
                            value={escalateToId}
                            onChange={(e) => setEscalateToId(e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-white border border-amber-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
                          >
                            <option value="">{isEn ? '-- Select IT / Manager --' : '-- Chọn IT / Quản lý --'}</option>
                            {itUsers.map((u) => (
                              <option key={u.id} value={u.id}>
                                👨‍💻 {u.fullName} ({u.role?.name || 'IT'})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            value={escalateNote}
                            onChange={(e) => setEscalateNote(e.target.value)}
                            placeholder={isEn ? 'Technical notes for assistance...' : 'Ghi chú kỹ thuật cần hỗ trợ...'}
                            className="flex-1 px-3 py-1.5 bg-white border border-amber-200 rounded-xl text-xs text-slate-800 outline-none focus:ring-1 focus:ring-amber-500 font-medium"
                          />
                          <button
                            type="button"
                            onClick={handleSendEscalation}
                            disabled={escalateSending || (!escalateToId && !escalateNote.trim())}
                            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer shrink-0 flex items-center gap-1"
                          >
                            {escalateSending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <span>{isEn ? '⚡ Send' : '⚡ Gửi'}</span>}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* ⭐ ĐÁNH GIÁ CHẤT LƯỢNG CSAT (1-Click CSAT Feedback - 👑 Enterprise - FULL WIDTH) */}
              {(selectedTicket.status === 'RESOLVED' || selectedTicket.status === 'CLOSED') && (
                <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-50/90 via-orange-50/40 to-slate-50 border border-amber-200/90 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-xl bg-amber-500 text-white flex items-center justify-center text-xs font-black shadow-xs">
                        ⭐
                      </div>
                      <div>
                        <h5 className="font-bold text-slate-900 text-xs">
                          {isEn ? 'Customer Satisfaction Survey (CSAT)' : 'Đánh Giá Chất Lượng Dịch Vụ (CSAT)'}
                        </h5>
                        <p className="text-[10px] text-slate-500">
                          {isEn ? 'How satisfied are you with the resolution?' : 'Bạn có hài lòng với kết quả xử lý của IT không?'}
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] bg-amber-200/80 text-amber-900 font-extrabold px-2 py-0.5 rounded-md border border-amber-300">
                      👑 Enterprise
                    </span>
                  </div>

                  {selectedTicket.rating ? (
                    <div className="p-3 bg-white/90 rounded-xl border border-amber-200 space-y-1.5 text-xs">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`w-4 h-4 ${
                                star <= (selectedTicket.rating || 0)
                                  ? 'text-amber-500 fill-amber-500'
                                  : 'text-slate-200'
                              }`}
                            />
                          ))}
                        </div>
                        <span className="font-extrabold text-amber-900">{selectedTicket.rating}/5 sao</span>
                        {selectedTicket.ratedAt && (
                          <span className="text-[10px] text-slate-400">
                            • {new Date(selectedTicket.ratedAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      {selectedTicket.ratingComment && (
                        <p className="text-slate-700 italic bg-amber-50/50 p-2 rounded-lg border border-amber-100/70 text-[11px]">
                          "{selectedTicket.ratingComment}"
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="p-3 bg-white/90 rounded-xl border border-amber-200 space-y-2.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-700">{isEn ? 'Rating:' : 'Chấm điểm:'}</span>
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              type="button"
                              onMouseEnter={() => setRatingHover(star)}
                              onMouseLeave={() => setRatingHover(0)}
                              onClick={() => setSelectedRating(star)}
                              className="p-1 hover:scale-125 transition-transform cursor-pointer"
                            >
                              <Star
                                className={`w-5 h-5 ${
                                  star <= (ratingHover || selectedRating)
                                    ? 'text-amber-500 fill-amber-500'
                                    : 'text-slate-300'
                                }`}
                              />
                            </button>
                          ))}
                        </div>
                        <span className="font-bold text-xs text-amber-800">
                          {ratingHover || selectedRating} / 5 {isEn ? 'Stars' : 'Sao'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={ratingFeedback}
                          onChange={(e) => setRatingFeedback(e.target.value)}
                          placeholder={isEn ? 'Optional feedback for technician...' : 'Nhận xét thêm về sự hỗ trợ (tùy chọn)...'}
                          className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:bg-white focus:ring-1 focus:ring-amber-500 font-medium"
                        />
                        <button
                          type="button"
                          disabled={submittingRating}
                          onClick={() => handleRateTicket(selectedTicket.id, selectedRating, ratingFeedback)}
                          className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer shrink-0 flex items-center gap-1"
                        >
                          {submittingRating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Star className="w-3.5 h-3.5 fill-white" />}
                          <span>{isEn ? 'Submit' : 'Gửi'}</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 💬 KHU VỰC TRAO ĐỔI & BÌNH LUẬN FULL-WIDTH (SPACIOUS & EXPANSIVE) */}
              <div className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-white border border-slate-200/90 shadow-2xs space-y-3.5">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="p-2 rounded-xl bg-blue-50 text-blue-600">
                      <MessageSquare className="w-5 h-5" />
                    </span>
                    <div>
                      <h4 className="font-black text-slate-900 text-sm sm:text-base flex items-center gap-2">
                        <span>{isEn ? 'Discussion & Activity History' : 'Trao Đổi & Lịch Sử Xử Lý'}</span>
                        <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-xs font-extrabold">
                          {selectedTicket.comments?.filter((c) => isITStaffOrAdmin || !c.isInternal).length || 0}
                        </span>
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        {isEn ? 'Full-width collaborative workspace between IT and Requester' : 'Không gian làm việc & trao đổi trực tiếp giữa Người dùng và Đội ngũ Kỹ thuật'}
                      </p>
                    </div>
                  </div>

                  {isITStaffOrAdmin && (
                    <span className="text-[10.5px] font-semibold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200/80 flex items-center gap-1">
                      <span>🔒</span>
                      <span className="hidden sm:inline">{isEn ? 'Supports internal notes' : 'Hỗ trợ ghi chú nội bộ IT'}</span>
                    </span>
                  )}
                </div>

                {/* Messages Container (Full-Width, Spacious Feed) */}
                <div className="space-y-3 min-h-[220px] max-h-[380px] overflow-y-auto p-3 sm:p-4 bg-slate-50/70 rounded-2xl border border-slate-100/90">
                  {(() => {
                    const visibleComments = selectedTicket.comments?.filter((c) => isITStaffOrAdmin || !c.isInternal) || [];
                    return visibleComments.length === 0 ? (
                      <div className="py-10 text-center space-y-2">
                        <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-500 mx-auto flex items-center justify-center text-xl shadow-2xs">
                          💬
                        </div>
                        <p className="text-slate-500 font-bold text-xs sm:text-sm">
                          {isEn ? 'No comments or updates yet.' : 'Chưa có bình luận hay trao đổi nào.'}
                        </p>
                        <p className="text-slate-400 text-xs max-w-md mx-auto">
                          {isEn ? 'Send a response below to start communicating with the requester or IT technician.' : 'Gửi tin nhắn hoặc phản hồi bên dưới để bắt đầu trao đổi với người yêu cầu hoặc kỹ thuật viên.'}
                        </p>
                      </div>
                    ) : (
                      visibleComments.map((c) => {
                        const isRequesterMsg = c.user?.id === selectedTicket.createdById;
                        return (
                          <div
                            key={c.id}
                            className={`p-3.5 sm:p-4 rounded-2xl text-xs space-y-2 transition-all ${
                              c.isInternal
                                ? 'bg-amber-50/90 border-2 border-amber-300 text-amber-950 shadow-2xs'
                                : isRequesterMsg
                                ? 'bg-white border border-blue-200/80 shadow-2xs'
                                : 'bg-white border border-slate-200 shadow-2xs text-slate-800'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2 text-xs flex-wrap">
                              <div className="flex items-center gap-2 min-w-0">
                                <div className={`w-7 h-7 rounded-xl flex items-center justify-center font-black text-xs shrink-0 shadow-2xs ${
                                  c.isInternal
                                    ? 'bg-amber-500 text-white'
                                    : isRequesterMsg
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-indigo-600 text-white'
                                }`}>
                                  {c.isInternal ? '🔒' : isRequesterMsg ? '👤' : '👨‍💻'}
                                </div>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-extrabold text-slate-900 text-xs sm:text-[13px]">
                                    {c.user?.fullName || c.user?.email || (isEn ? 'User' : 'Người dùng')}
                                  </span>
                                  {isRequesterMsg && (
                                    <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-bold text-[10px] border border-blue-200">
                                      {isEn ? 'Requester' : 'Người gửi'}
                                    </span>
                                  )}
                                  {!isRequesterMsg && !c.isInternal && (
                                    <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-bold text-[10px] border border-indigo-200">
                                      {isEn ? 'IT Support' : 'Kỹ thuật IT'}
                                    </span>
                                  )}
                                  {c.isInternal && (
                                    <span className="px-2 py-0.5 bg-amber-200 text-amber-900 rounded-md font-black text-[10px] border border-amber-300 inline-flex items-center gap-1">
                                      <span>🔒</span>
                                      <span>{isEn ? 'IT Internal Only' : 'Nội bộ IT (Chỉ IT thấy)'}</span>
                                    </span>
                                  )}
                                  {c.spentMinutes && c.spentMinutes > 0 && (
                                    <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 font-extrabold text-[10px] inline-flex items-center gap-1 shadow-2xs">
                                      <Clock className="w-3 h-3 text-emerald-600" />
                                      <span>+{formatSpentTime(c.spentMinutes, isEn)}</span>
                                    </span>
                                  )}
                                </div>
                              </div>
                              <span className="text-[11px] text-slate-400 font-medium shrink-0">
                                {new Date(c.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} • {new Date(c.createdAt).toLocaleDateString('vi-VN')}
                              </span>
                            </div>

                            <p className="whitespace-pre-wrap leading-relaxed text-slate-800 font-medium text-xs sm:text-[13px] pl-9">
                              {c.content}
                            </p>

                            {/* Comment Attachments */}
                            {Array.isArray((c as any).attachmentUrls) && ((c as any).attachmentUrls as any[]).length > 0 && (
                              <div className="pt-2 pl-9 flex items-center gap-2.5 flex-wrap">
                                {((c as any).attachmentUrls as any[]).map((att: any, caIdx: number) => {
                                  const isImg = /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(att.url) || /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(att.name || '');
                                  return isImg ? (
                                    <img
                                      key={caIdx}
                                      src={att.url}
                                      alt={att.name || (isEn ? 'Image' : 'Hình ảnh')}
                                      onClick={() => setPreviewImageModal(att.url)}
                                      className="w-20 h-20 sm:w-28 sm:h-28 object-cover rounded-xl border border-slate-200 shadow-2xs cursor-pointer hover:scale-105 transition-transform"
                                    />
                                  ) : (
                                    <a
                                      key={caIdx}
                                      href={att.url}
                                      download={att.name || 'file'}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
                                    >
                                      <FileText className="w-4 h-4 text-blue-600" />
                                      <span className="max-w-[150px] truncate">{att.name || 'File'}</span>
                                      <Download className="w-3.5 h-3.5 text-slate-500" />
                                    </a>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })
                    );
                  })()}
                </div>

                {/* New Comment Input Box (Full-Width, Spacious & Rich) */}
                <form onSubmit={handleAddComment} className="space-y-2.5 pt-2 border-t border-slate-100">
                  <div className="space-y-2">
                    <textarea
                      rows={3}
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      onPaste={(e) => handlePasteImage(e, 'comment')}
                      placeholder={isEn ? "Write a response, resolution update, or paste screenshot directly (Ctrl + V)..." : "Nhập câu trả lời, tiến độ xử lý hoặc dán ảnh chụp màn hình trực tiếp (Ctrl + V)..."}
                      className="w-full px-4 py-3 bg-slate-50/80 border border-slate-200 rounded-2xl text-xs sm:text-sm text-slate-800 outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 resize-y font-medium leading-relaxed"
                    />

                    {/* Comment Attachments Preview */}
                    {commentAttachments.length > 0 && (
                      <div className="flex items-center gap-2 flex-wrap p-2 bg-blue-50/50 rounded-xl border border-blue-100">
                        {commentAttachments.map((att, attIdx) => (
                          <span key={attIdx} className="px-2.5 py-1 bg-white text-blue-700 border border-blue-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-2xs">
                            <FileText className="w-3.5 h-3.5" />
                            <span className="max-w-[150px] truncate">{att.name}</span>
                            <button type="button" onClick={() => setCommentAttachments(prev => prev.filter((_, i) => i !== attIdx))} className="text-rose-500 hover:text-rose-700 font-bold ml-1">×</button>
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                        <label className="cursor-pointer px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 border border-slate-200" title={isEn ? 'Attach file/image' : 'Đính kèm file/ảnh'}>
                          <Paperclip className="w-4 h-4 text-blue-600" />
                          <span>{isEn ? 'Attach files' : 'Đính kèm tệp / ảnh'}</span>
                          <input type="file" multiple onChange={handleUploadCommentFiles} className="hidden" />
                        </label>

                        {isITStaffOrAdmin && (
                          <label className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100/80 border border-amber-200 rounded-xl text-xs font-bold text-amber-900 cursor-pointer transition-colors">
                            <input
                              type="checkbox"
                              checked={isInternalComment}
                              onChange={(e) => setIsInternalComment(e.target.checked)}
                              className="rounded border-amber-300 text-amber-600 focus:ring-amber-500 w-3.5 h-3.5 cursor-pointer"
                            />
                            <span>{isEn ? '🔒 Internal Note (IT only)' : '🔒 Ghi chú nội bộ (Chỉ IT thấy)'}</span>
                          </label>
                        )}

                        {/* ⏱️ Log Work / Spent Time (👑 Enterprise) */}
                        {isITStaffOrAdmin && (
                          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100/90 hover:bg-slate-200/80 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 transition-colors" title={isEn ? 'Log time spent working on this ticket' : 'Ghi nhận thời gian xử lý ticket'}>
                            <Clock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                            <span className="text-[11px] shrink-0">{isEn ? 'Time spent:' : 'Thời gian:'}</span>
                            <input
                              type="number"
                              min="1"
                              step="5"
                              placeholder="30"
                              value={spentMinutesInput}
                              onChange={(e) => setSpentMinutesInput(e.target.value)}
                              className="w-14 px-1.5 py-0.5 bg-white border border-slate-300 rounded-lg text-xs font-extrabold text-slate-900 text-center outline-none focus:ring-1 focus:ring-blue-500"
                            />
                            <span className="text-[10.5px] text-slate-500">{isEn ? 'min' : 'phút'}</span>
                            <span className="text-[9px] bg-amber-100 text-amber-900 px-1 py-0.2 rounded font-black">👑</span>
                          </div>
                        )}

                        {/* 📢 Broadcast to Merged Tickets (👑 Enterprise) */}
                        {isITStaffOrAdmin && selectedTicket.mergedTickets && selectedTicket.mergedTickets.length > 0 && !isInternalComment && (
                          <label className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100/80 border border-indigo-200 rounded-xl text-xs font-bold text-indigo-900 cursor-pointer transition-colors" title={isEn ? "Broadcast this response to all merged child tickets" : "Đồng bộ phản hồi này đến toàn bộ ticket con đã gộp"}>
                            <input
                              type="checkbox"
                              checked={broadcastToMerged}
                              onChange={(e) => setBroadcastToMerged(e.target.checked)}
                              className="rounded border-indigo-300 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 cursor-pointer"
                            />
                            <span>📢 {isEn ? `Broadcast (${selectedTicket.mergedTickets.length})` : `Đồng bộ tới ${selectedTicket.mergedTickets.length} ticket đã gộp`}</span>
                          </label>
                        )}

                        {/* ⚡ Quick Reply / Canned Responses (👑 Enterprise) */}
                        {isITStaffOrAdmin && (
                          <div className="relative">
                            <button
                              type="button"
                              onClick={() => {
                                setIsCannedMenuOpen(!isCannedMenuOpen);
                                fetchCannedResponses();
                              }}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold transition-colors cursor-pointer"
                              title={isEn ? 'Canned Templates (Quick Reply)' : 'Mẫu câu trả lời nhanh (Canned Response)'}
                            >
                              <Zap className="w-3.5 h-3.5 text-amber-600 fill-amber-500" />
                              <span>{isEn ? 'Quick Reply' : 'Mẫu câu trả lời'}</span>
                              <span className="text-[9.5px] bg-amber-200 text-amber-900 px-1 py-0.2 rounded font-black">👑</span>
                            </button>

                            {isCannedMenuOpen && (
                              <div className="absolute left-0 bottom-full mb-2 w-96 max-h-[32rem] overflow-y-auto bg-white rounded-2xl shadow-2xl border border-slate-200 p-3 z-50 space-y-2.5 animate-in fade-in">
                                <div className="pb-2 border-b border-slate-100 flex items-center justify-between">
                                  <div className="flex items-center gap-1.5">
                                    <span className="p-1 rounded-lg bg-amber-100 text-amber-800 font-bold text-xs">⚡</span>
                                    <span className="font-extrabold text-slate-800 text-xs">{isEn ? 'Canned Quick Replies' : 'Mẫu câu trả lời nhanh'}</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() => setIsCreatingCanned(!isCreatingCanned)}
                                      className="px-2 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-[10.5px] font-bold transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                                      title={isEn ? 'Create new canned response' : 'Tạo thêm mẫu mới'}
                                    >
                                      <span>{isCreatingCanned ? '−' : '+'}</span>
                                      <span>{isCreatingCanned ? (isEn ? 'Close' : 'Đóng') : (isEn ? 'New' : 'Thêm mẫu')}</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setIsCannedMenuOpen(false);
                                        setIsCreatingCanned(false);
                                      }}
                                      className="text-slate-400 hover:text-slate-600 font-bold p-1 text-sm leading-none cursor-pointer"
                                    >
                                      ×
                                    </button>
                                  </div>
                                </div>

                                {/* Form tạo thêm mẫu mới */}
                                {isCreatingCanned ? (
                                  <form onSubmit={handleCreateCannedResponse} className="p-2.5 bg-amber-50/60 rounded-xl border border-amber-200/80 space-y-2 text-xs">
                                    <div className="font-bold text-amber-900 text-[11px] flex items-center gap-1">
                                      <span>✍️</span>
                                      <span>{isEn ? 'Create New Quick Reply Template' : 'Tạo thêm mẫu trả lời nhanh'}</span>
                                    </div>
                                    <div>
                                      <input
                                        type="text"
                                        required
                                        value={newCannedTitle}
                                        onChange={(e) => setNewCannedTitle(e.target.value)}
                                        placeholder={isEn ? 'Template title (e.g. Ask for remote access)' : 'Tiêu đề mẫu (VD: Yêu cầu mở UltraViewer)'}
                                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 outline-none focus:ring-1 focus:ring-amber-500"
                                      />
                                    </div>
                                    <div>
                                      <input
                                        type="text"
                                        value={newCannedShortcut}
                                        onChange={(e) => setNewCannedShortcut(e.target.value)}
                                        placeholder={isEn ? 'Shortcut (e.g. /ultra)' : 'Phím tắt (VD: /ultra)'}
                                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono text-slate-800 outline-none focus:ring-1 focus:ring-amber-500"
                                      />
                                    </div>
                                    <div>
                                      <textarea
                                        rows={3}
                                        required
                                        value={newCannedContent}
                                        onChange={(e) => setNewCannedContent(e.target.value)}
                                        placeholder={isEn ? 'Template content to insert into comment...' : 'Nội dung phản hồi soạn sẵn để chèn vào bình luận...'}
                                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 outline-none focus:ring-1 focus:ring-amber-500 leading-relaxed resize-none"
                                      />
                                    </div>
                                    <div className="flex items-center justify-end gap-1.5 pt-1">
                                      <button
                                        type="button"
                                        onClick={() => setIsCreatingCanned(false)}
                                        className="px-2.5 py-1 text-slate-500 hover:text-slate-700 text-xs font-medium cursor-pointer"
                                      >
                                        {isEn ? 'Cancel' : 'Hủy'}
                                      </button>
                                      <button
                                        type="submit"
                                        disabled={savingCanned || !newCannedTitle.trim() || !newCannedContent.trim()}
                                        className="px-3 py-1 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1 shadow-2xs cursor-pointer"
                                      >
                                        {savingCanned ? <Loader2 className="w-3 h-3 animate-spin" /> : <span>✓</span>}
                                        <span>{isEn ? 'Save Template' : 'Lưu mẫu'}</span>
                                      </button>
                                    </div>
                                  </form>
                                ) : null}

                                {/* Danh sách mẫu câu */}
                                <div className="space-y-1.5 max-h-56 overflow-y-auto pr-0.5">
                                  {loadingCanned ? (
                                    <div className="p-4 text-center text-slate-400 text-xs">Đang tải danh sách mẫu câu...</div>
                                  ) : cannedResponses.length === 0 ? (
                                    <div className="p-4 text-center text-slate-400 text-xs">Chưa có mẫu câu nào. Hãy bấm "+ Thêm mẫu" để tạo.</div>
                                  ) : (
                                    cannedResponses.map((cr) => (
                                      <div
                                        key={cr.id}
                                        className="group relative flex items-start justify-between gap-1 p-2 rounded-xl hover:bg-amber-50/70 border border-slate-100 hover:border-amber-200 transition-colors"
                                      >
                                        <button
                                          type="button"
                                          onClick={() => handleSelectCannedResponse(cr)}
                                          className="flex-1 text-left cursor-pointer min-w-0"
                                        >
                                          <div className="font-bold text-slate-800 group-hover:text-amber-900 flex items-center justify-between gap-1">
                                            <span className="truncate">{cr.title}</span>
                                            {cr.shortcut && <span className="text-[9.5px] font-mono text-slate-500 bg-slate-100 group-hover:bg-amber-100 px-1.5 py-0.2 rounded shrink-0">{cr.shortcut}</span>}
                                          </div>
                                          <div className="text-[10.5px] text-slate-500 group-hover:text-slate-700 line-clamp-2 mt-0.5 leading-relaxed">{cr.content}</div>
                                        </button>
                                        <button
                                          type="button"
                                          onClick={(e) => handleDeleteCannedResponse(e, cr.id)}
                                          className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all shrink-0 cursor-pointer"
                                          title={isEn ? 'Delete template' : 'Xóa mẫu này'}
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    ))
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      <button
                        type="submit"
                        disabled={sendingComment || (!commentText.trim() && commentAttachments.length === 0)}
                        className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs sm:text-sm font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer shrink-0 ml-auto"
                      >
                        {sendingComment ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        <span>{isEn ? 'Send Response' : 'Gửi phản hồi'}</span>
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>

            {/* Modal Fixed Footer: Fast Status Actions & Assignee */}
            <div className="p-3 sm:p-4 bg-slate-50/90 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              {isITStaffOrAdmin ? (
                <>
                  {/* Quick Status Buttons for IT */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-bold text-slate-700 text-[11px] mr-1">{isEn ? 'Quick update:' : 'Cập nhật nhanh:'}</span>
                    {(['OPEN', 'IN_PROGRESS', 'WAITING', 'RESOLVED', 'CLOSED'] as const).map((st) => {
                      const isActive = selectedTicket.status === st;
                      return (
                        <button
                          key={st}
                          type="button"
                          onClick={() => handleUpdateStatus(selectedTicket.id, st)}
                          className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                            isActive
                              ? 'bg-blue-600 text-white shadow-xs font-extrabold ring-2 ring-blue-400/40'
                              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                          }`}
                        >
                          {getStatusLabel(st, language)}
                        </button>
                      );
                    })}
                  </div>

                  {/* Assign IT dropdown & Close button */}
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-xl border border-slate-200">
                      <span className="text-[10.5px] font-bold text-slate-600">{isEn ? 'Assign:' : 'Phân công:'}</span>
                      <select
                        value={selectedTicket.assignedToId || ''}
                        onChange={(e) => handleUpdateAssignee(selectedTicket.id, e.target.value)}
                        className="bg-transparent text-xs font-bold text-blue-700 outline-none cursor-pointer"
                      >
                        <option value="">{isEn ? '-- Unassigned --' : '-- Chưa phân công --'}</option>
                        {itUsers.map((u) => (
                          <option key={u.id} value={u.id}>
                            👨‍💻 {u.fullName} {u.id === currentUser?.id ? (isEn ? '(Me)' : '(Tôi)') : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsDetailModalOpen(false)}
                      className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl font-bold transition-colors cursor-pointer"
                    >{isEn ? 'Close' : 'Đóng'}</button>
                  </div>
                </>
              ) : (
                <>
                  {/* Simple Status Display for Normal User */}
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-500 font-medium">{isEn ? 'Processing status:' : 'Trạng thái xử lý:'}</span>
                    <span className={`px-2.5 py-1 rounded-xl text-xs font-bold border ${STATUS_MAP[selectedTicket.status]?.badge || 'bg-slate-100'}`}>
                      {STATUS_MAP[selectedTicket.status]?.label}
                    </span>
                    {selectedTicket.assignedTo && (
                      <span className="text-[11px] text-slate-600 font-semibold flex items-center gap-1 ml-2">
                        <span>{isEn ? '👨‍💻 IT Technician:' : '👨‍💻 Kỹ thuật viên phụ trách:'}</span>
                        <strong className="text-blue-700">{selectedTicket.assignedTo.fullName}</strong>
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsDetailModalOpen(false)}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-colors cursor-pointer shadow-xs ml-auto"
                  >{isEn ? 'Close' : 'Đóng'}</button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: TẠO TICKET MỚI (FOR ALL USERS) */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full p-5 sm:p-6 space-y-4 border border-slate-200 max-h-[92vh] overflow-y-auto animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-blue-100 text-blue-700 rounded-lg">
                  <LifeBuoy className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">{isEn ? 'Submit IT Support Request / Create Ticket' : 'Gửi Yêu Cầu Hỗ Trợ IT / Tạo Ticket'}</h3>
                  <p className="text-[10px] text-slate-500">{isEn ? 'Supports direct screenshot paste (Ctrl + V)' : 'Hỗ trợ dán trực tiếp ảnh chụp màn hình (Ctrl + V)'}</p>
                </div>
              </div>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTicket} className="space-y-3.5 text-xs">
              {/* 1. Người yêu cầu / Người gặp sự cố (Cho phép IT sửa / tạo hộ) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-slate-700 flex items-center gap-1.5">
                    <UserIcon className="w-3.5 h-3.5 text-blue-600" />
                    <span>{isEn ? 'Requester / Affected Person' : 'Người yêu cầu / Người gặp sự cố'}</span>
                    <span className="text-rose-500">*</span>
                  </label>
                  {isITStaffOrAdmin && newRequesterId && newRequesterId !== currentUser?.id && (
                    <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-full font-bold text-[10px] flex items-center gap-1">
                      <span>📝</span>
                      <span>{isEn ? 'IT creating on behalf of user' : 'IT đang tạo hộ người dùng'}</span>
                    </span>
                  )}
                </div>

                {isITStaffOrAdmin ? (
                  <div className="relative" ref={requesterDropdownRef}>
                    {/* Trigger Button */}
                    <button
                      type="button"
                      onClick={() => {
                        setIsRequesterDropdownOpen(!isRequesterDropdownOpen);
                        setRequesterSearchTerm('');
                      }}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50/80 hover:bg-slate-100/90 font-semibold text-slate-900 flex items-center justify-between transition-all cursor-pointer text-left"
                    >
                      <div className="flex items-center gap-2 min-w-0 pr-2">
                        <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-[10px] shrink-0">
                          👤
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 text-xs truncate">
                            {selectedRequesterUser?.id === currentUser?.id
                              ? `Chính tôi (${selectedRequesterUser?.fullName || selectedRequesterUser?.email}) [Mặc định]`
                              : selectedRequesterUser?.fullName || 'Chọn nhân viên'}
                          </p>
                          <p className="text-[10px] text-slate-400 truncate">
                            {selectedRequesterUser?.email} {selectedRequesterUser?.department ? `• ${selectedRequesterUser?.department}` : ''}
                          </p>
                        </div>
                      </div>
                      <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${isRequesterDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {/* Searchable Dropdown Popup */}
                    {isRequesterDropdownOpen && (
                      <div className="absolute left-0 top-full mt-1.5 w-full bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 p-2.5 space-y-2 animate-in fade-in zoom-in-95">
                        {/* Search Input */}
                        <div className="relative">
                          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            ref={requesterInputRef}
                            type="text"
                            value={requesterSearchTerm}
                            onChange={(e) => setRequesterSearchTerm(e.target.value)}
                            placeholder={isEn ? '🔍 Type name, email, or department to filter...' : '🔍 Gõ tên, email hoặc phòng ban để lọc nhanh...'}
                            className="w-full pl-8 pr-7 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 font-medium text-slate-900"
                          />
                          {requesterSearchTerm && (
                            <button
                              type="button"
                              onClick={() => setRequesterSearchTerm('')}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </div>

                        {/* List Options */}
                        <div className="max-h-56 overflow-y-auto space-y-1 pr-1">
                          {/* Option 1: Current User (Chính tôi) */}
                          {currentUser && (
                            <button
                              type="button"
                              onClick={() => {
                                setNewRequesterId(currentUser.id);
                                loadRequesterAssets(currentUser.id);
                                setIsRequesterDropdownOpen(false);
                                setRequesterSearchTerm('');
                              }}
                              className={`w-full text-left p-2 rounded-xl text-xs flex items-center justify-between transition-colors cursor-pointer ${
                                newRequesterId === currentUser.id
                                  ? 'bg-blue-600 text-white font-bold shadow-xs'
                                  : 'hover:bg-blue-50/70 text-slate-800 border border-blue-100'
                              }`}
                            >
                              <div className="min-w-0 pr-2">
                                <div className="font-bold flex items-center gap-1.5 truncate">
                                  <span>👤</span>
                                  <span>{isEn ? `Myself (${currentUser.fullName || currentUser.email}) [Default]` : `Chính tôi (${currentUser.fullName || currentUser.email}) [Mặc định]`}</span>
                                </div>
                                <p className={`text-[10px] truncate ${newRequesterId === currentUser.id ? 'text-blue-100' : 'text-slate-400'}`}>
                                  {currentUser.email} {currentUser.department ? `• ${currentUser.department}` : ''}
                                </p>
                              </div>
                              {newRequesterId === currentUser.id && <Check className="w-4 h-4 shrink-0" />}
                            </button>
                          )}

                          <div className="px-1 py-0.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                            <span>{isEn ? 'Employee List (Create on behalf)' : 'Danh sách nhân viên (Tạo hộ)'}</span>
                            <span>{filteredRequesterUsers.filter((u) => u.id !== currentUser?.id).length} {isEn ? 'people' : 'người'}</span>
                          </div>

                          {/* Filtered Employees */}
                          {filteredRequesterUsers.filter((u) => u.id !== currentUser?.id).length === 0 ? (
                            <div className="text-center py-4 text-xs text-slate-400 italic">
                              {isEn ? `No employee matched "${requesterSearchTerm}"` : `Không tìm thấy nhân viên nào khớp với "${requesterSearchTerm}"`}
                            </div>
                          ) : (
                            filteredRequesterUsers
                              .filter((u) => u.id !== currentUser?.id)
                              .map((u) => {
                                const isSelected = newRequesterId === u.id;
                                return (
                                  <button
                                    key={u.id}
                                    type="button"
                                    onClick={() => {
                                      setNewRequesterId(u.id);
                                      loadRequesterAssets(u.id);
                                      setIsRequesterDropdownOpen(false);
                                      setRequesterSearchTerm('');
                                    }}
                                    className={`w-full text-left p-2 rounded-xl text-xs flex items-center justify-between transition-colors cursor-pointer ${
                                      isSelected
                                        ? 'bg-blue-600 text-white font-bold shadow-xs'
                                        : 'hover:bg-slate-100 text-slate-800'
                                    }`}
                                  >
                                    <div className="min-w-0 pr-2">
                                      <div className="font-bold flex items-center gap-1.5 truncate">
                                        <span>👤</span>
                                        <span className="truncate">{u.fullName}</span>
                                      </div>
                                      <p className={`text-[10px] truncate ${isSelected ? 'text-blue-100' : 'text-slate-400'}`}>
                                        {u.email} {u.department ? `• ${u.department}` : ''}
                                      </p>
                                    </div>
                                    {isSelected && <Check className="w-4 h-4 shrink-0" />}
                                  </button>
                                );
                              })
                          )}
                        </div>
                      </div>
                    )}
                    <p className="text-[10px] text-slate-400 mt-0.5 italic">
                      {isEn ? '💡 You have IT permissions: Click to search & create ticket on behalf of an employee who cannot submit it.' : '💡 Bạn có quyền IT: Bấm vào để gõ tìm nhanh nhân viên cần tạo ticket hộ khi họ không thể tự gửi.'}
                    </p>
                  </div>
                ) : (
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 bg-blue-100 text-blue-700 rounded-lg flex items-center justify-center font-bold text-xs">
                        👤
                      </div>
                      <div>
                        <p className="font-bold text-slate-800 text-xs">{currentUser?.fullName || (isEn ? 'User' : 'Người dùng')}</p>
                        <p className="text-[10px] text-slate-400">{currentUser?.email} {currentUser?.department ? `• ${currentUser?.department}` : ''}</p>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-[10px] font-bold">
                      Người gửi
                    </span>
                  </div>
                )}
              </div>

              {/* 2. Tiêu đề sự cố / yêu cầu (Auto AI trigger on finish) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-slate-700">
                    {isEn ? 'Incident / Request Title' : 'Tiêu đề sự cố / yêu cầu'} <span className="text-rose-500">*</span>
                  </label>
                  {isAiAnalyzing && (
                    <span className="text-[10.5px] text-purple-600 font-bold animate-pulse flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-purple-600 animate-spin" />
                      <span>{isEn ? 'AI is analyzing automatically...' : 'AI đang tự động phân tích...'}</span>
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  onBlur={() => triggerAiAnalysis(newTitle, newDesc, true)}
                  placeholder={isEn ? 'e.g., Computer Windows crash, blue screen of death unable to work...' : 'VD: Máy tính bị lỗi window, bị màn hình xanh ko sử dụng đc...'}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-slate-900 bg-white"
                />
                <p className="text-[10px] text-slate-400 mt-0.5">
                  🤖 <em>{isEn ? 'AI will automatically detect the issue type as soon as you enter the title.' : 'AI sẽ tự động nhận diện loại sự cố ngay khi bạn nhập xong tiêu đề.'}</em>
                </p>

                {/* 💡 Gợi ý giải pháp tự sửa từ Thư viện KB (Ticket Deflection - 👑 Enterprise) */}
                {inlineKbSuggestions.length > 0 && (
                  <div className="p-3 bg-gradient-to-r from-blue-50/80 via-indigo-50/40 to-white rounded-xl border border-blue-200/80 space-y-2 mt-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-bold text-blue-900 text-xs">
                        <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                        <span>{isEn ? '💡 Suggested self-help solutions from Knowledge Base:' : '💡 Bài viết hướng dẫn có thể giúp bạn tự xử lý ngay:'}</span>
                      </div>
                      <span className="text-[9.5px] bg-blue-100 text-blue-800 font-bold px-1.5 py-0.5 rounded">
                        Deflection ⚡
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      {inlineKbSuggestions.map((kb: any) => (
                        <div
                          key={kb.id}
                          className="p-2 bg-white/95 rounded-lg border border-blue-100 hover:border-blue-300 transition-colors shadow-2xs"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-800 text-[11.5px] line-clamp-1">{kb.title}</span>
                            <span className="text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded font-semibold shrink-0">
                              {kb.category || 'KB'}
                            </span>
                          </div>
                          {kb.notes && (
                            <p className="text-[10.5px] text-slate-500 line-clamp-2 mt-0.5 leading-relaxed">
                              {kb.notes}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* 3. Phân loại & Mức độ ưu tiên (AI tự động chọn) */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">{isEn ? 'Request Category' : 'Loại yêu cầu'}</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full px-2.5 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white font-medium cursor-pointer"
                  >
                    <option value="HARDWARE">{isEn ? '💻 Hardware' : '💻 Phần cứng'}</option>
                    <option value="SOFTWARE">{isEn ? '💿 Software' : '💿 Phần mềm'}</option>
                    <option value="LICENSE">{isEn ? '🔑 License' : '🔑 License / Bản quyền'}</option>
                    <option value="ACCESS_REQUEST">{isEn ? '🛡️ Access Request' : '🛡️ Cấp quyền truy cập'}</option>
                    <option value="NETWORK">{isEn ? '🌐 Network & Internet' : '🌐 Mạng & Internet'}</option>
                    <option value="OTHER">{isEn ? '📌 Other' : '📌 Khác'}</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">{isEn ? 'Priority Level' : 'Mức độ ưu tiên'}</label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value)}
                    className="w-full px-2.5 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white font-medium cursor-pointer"
                  >
                    <option value="LOW">{isEn ? '🟢 Low (No impact)' : '🟢 Thấp (Không ảnh hưởng)'}</option>
                    <option value="MEDIUM">{isEn ? '🟡 Medium (Within the week)' : '🟡 Trung bình (Trong tuần)'}</option>
                    <option value="HIGH">{isEn ? '🔴 High (Urgent)' : '🔴 Cao (Cần xử lý gấp)'}</option>
                    <option value="URGENT">{isEn ? '🔥 Urgent (Work stopped)' : '🔥 Khẩn cấp (Dừng công việc)'}</option>
                  </select>
                </div>
              </div>

              {/* 4. IT Assignee & Initial Status (Chỉ hiển thị cho người thuộc IT) */}
              {isITStaffOrAdmin && (
                <div className="p-3 bg-gradient-to-r from-blue-50/70 via-indigo-50/50 to-slate-50 border border-blue-200/80 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-blue-900 flex items-center gap-1.5">
                      <span>👨‍💻</span>
                      <span>{isEn ? 'For IT Staff (Auto-assignment & Initial Status)' : 'Dành cho Nhân sự IT (Tự động gán & Cập nhật trạng thái)'}</span>
                    </span>
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full font-bold text-[9px]">
                      🔒 IT & Admin
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {/* IT Assignee */}
                    <div>
                      <label className="font-bold text-slate-700 block mb-1 text-xs">
                        {isEn ? 'IT Assignee' : 'IT tiếp nhận & phụ trách'}
                      </label>
                      <select
                        value={newAssignedToId}
                        onChange={(e) => setNewAssignedToId(e.target.value)}
                        className="w-full px-2.5 py-2 border border-blue-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white font-semibold text-xs text-slate-900 cursor-pointer"
                      >
                        <option value="">{isEn ? '-- Auto-dispatch (Unassigned) --' : '-- Tự động phân phối (Chưa gán) --'}</option>
                        {itUsers.map((u) => {
                          const isMe = u.id === currentUser?.id;
                          return (
                            <option key={u.id} value={u.id}>
                              👨‍💻 {u.fullName} {isMe ? (isEn ? '★ (Myself)' : '★ (Chính tôi)') : `(${u.role?.name || u.department || 'IT'})`}
                            </option>
                          );
                        })}
                      </select>
                      <p className="text-[9.5px] text-blue-600 font-medium mt-0.5">
                        {newAssignedToId === currentUser?.id
                          ? (isEn ? '✨ Automatically assigned to you.' : '✨ Đã tự động gán chính bạn là người tiếp nhận.')
                          : newAssignedToId
                          ? (isEn ? '👉 Assigned to selected IT technician.' : '👉 Đã chọn phân công cho IT viên trên.')
                          : (isEn ? '⚡ Unassigned (Will route via automated dispatch).' : '⚡ Chưa gán người nhận (Sẽ qua luồng tự động phân tuyến).')}
                      </p>
                    </div>

                    {/* Initial Ticket Status */}
                    <div>
                      <label className="font-bold text-slate-700 block mb-1 text-xs">
                        {isEn ? 'Initial Processing Status' : 'Trạng thái xử lý ban đầu'}
                      </label>
                      <select
                        value={newStatus}
                        onChange={(e) => setNewStatus(e.target.value)}
                        className="w-full px-2.5 py-2 border border-blue-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white font-semibold text-xs text-slate-900 cursor-pointer"
                      >
                        <option value="OPEN">{isEn ? '🟡 Open (Pending)' : '🟡 Mới tạo (Chờ xử lý)'}</option>
                        <option value="IN_PROGRESS">{isEn ? '🔵 In Progress (Start immediately)' : '🔵 Đang xử lý (Bắt đầu làm ngay)'}</option>
                        <option value="WAITING">{isEn ? '🟠 Waiting (Feedback / Spare parts)' : '🟠 Chờ phản hồi / Chờ linh kiện'}</option>
                        <option value="RESOLVED">{isEn ? '🟢 Resolved (Completed on-site)' : '🟢 Đã hoàn thành (Xong ngay tại chỗ)'}</option>
                        <option value="CLOSED">{isEn ? '🔘 Closed (Ticket closed)' : '🔘 Đã đóng (Hoàn tất đóng ticket)'}</option>
                      </select>
                      <p className="text-[9.5px] text-slate-500 font-medium mt-0.5">
                        {newStatus === 'RESOLVED'
                          ? (isEn ? '🎉 Ticket will be recorded as resolved upon creation!' : '🎉 Ticket sẽ được ghi nhận đã xử lý xong ngay khi tạo!')
                          : newStatus === 'IN_PROGRESS'
                          ? (isEn ? '🚀 Immediately move to In Progress status.' : '🚀 Chuyển ngay sang trạng thái đang tiến hành xử lý.')
                          : (isEn ? '📋 Ticket is in Open status awaiting standard workflow.' : '📋 Ticket ở trạng thái mở mới chờ xử lý theo quy trình.')}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* 5. Mô tả chi tiết (Auto AI trigger on finish) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-slate-700">
                    {isEn ? 'Detailed Description / Requirements' : 'Mô tả chi tiết hiện tượng / yêu cầu'} <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleAiAnalyzeTicket}
                    disabled={isAiAnalyzing || (!newDesc.trim() && !newTitle.trim())}
                    className="px-2.5 py-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 text-white rounded-lg text-[11px] font-bold inline-flex items-center gap-1 shadow-2xs transition-all cursor-pointer"
                  >
                    {isAiAnalyzing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3 text-amber-300" />}
                    <span>{isAiAnalyzing ? (isEn ? 'Analyzing...' : 'Đang phân tích...') : (isEn ? '✨ AI Diagnostic' : '✨ Phân Tích Bằng AI')}</span>
                  </button>
                </div>
                <textarea
                  required
                  rows={3}
                  value={newDesc}
                  onChange={(e) => handleDescChange(e.target.value)}
                  onBlur={() => triggerAiAnalysis(newTitle, newDesc, true)}
                  onPaste={(e) => handlePasteImage(e, 'ticket')}
                  placeholder={isEn ? 'Describe specific symptoms in detail. You can take a screenshot and press Ctrl + V to paste directly here...' : 'Mô tả cụ thể triệu chứng lỗi. Bạn có thể chụp ảnh màn hình rồi bấm Ctrl + V để dán trực tiếp vào đây...'}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none font-medium bg-white"
                />
              </div>

              {/* 6. AI Diagnostic Output Card if triggered */}
              {aiDiagnostic && (
                <div className="p-3 bg-purple-50/80 border border-purple-200 rounded-2xl space-y-2 text-xs animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-purple-900 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                      <span>{isEn ? 'AI Automatically Classified:' : 'AI Đã Tự Động Phân Loại:'}</span>
                    </span>
                    <span className="text-[10px] px-2 py-0.5 bg-purple-200 text-purple-900 rounded-full font-bold">
                      {aiDiagnostic.serviceName || (isEn ? 'IT Service' : 'Dịch vụ CNTT')}
                    </span>
                  </div>
                  <p className="text-purple-950 font-medium text-[11px] leading-relaxed">
                    {aiDiagnostic.diagnosticSummary}
                  </p>
                  {aiDiagnostic.matchedAssetName && (
                    <div className="text-[11px] text-blue-800 font-bold bg-white/80 p-1.5 rounded-lg border border-purple-200 flex items-center gap-1">
                      <span>💻</span>
                      <span>{isEn ? 'Related detected device:' : 'Thiết bị nhận diện liên quan:'} <strong>{aiDiagnostic.matchedAssetName}</strong></span>
                    </div>
                  )}
                </div>
              )}

              {/* 7. Quick Asset Selector for User's Active Devices */}
              {myAssets && myAssets.length > 0 && (
                <div className="p-2.5 bg-blue-50/60 rounded-2xl border border-blue-200 space-y-1.5">
                  <label className="text-[11px] font-bold text-blue-950 block">
                    {isEn ? '💻 Requester devices (Click to select):' : '💻 Thiết bị của người yêu cầu (Bấm để chọn nhanh):'}
                  </label>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {myAssets.map((dev: any) => (
                      <button
                        key={dev.id}
                        type="button"
                        onClick={() => setNewAssetId(newAssetId === dev.id ? '' : dev.id)}
                        className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold border transition-all cursor-pointer ${
                          newAssetId === dev.id
                            ? 'bg-blue-600 text-white border-blue-600 font-bold shadow-2xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-blue-100/60'
                        }`}
                      >
                        [{dev.assetTag || 'AST'}] {dev.name || dev.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Prominent Image & File Attachment Box with Paste Hint */}
              <div className="p-3 bg-gradient-to-br from-blue-50/70 via-indigo-50/40 to-slate-50 border-2 border-dashed border-blue-200 rounded-xl space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                      <ImageIcon className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                        <span>{isEn ? 'Images & Attachments' : 'Hình ảnh & tệp đính kèm'} ({newTicketAttachments.length})</span>
                        {uploadingTicketFile && <span className="text-[10px] text-blue-600 font-normal animate-pulse">({isEn ? '⚡ Uploading...' : '⚡ Đang tải ảnh...'})</span>}
                      </p>
                      <p className="text-[10px] text-slate-500">
                        📋 <strong>{isEn ? 'Tip:' : 'Mẹo:'}</strong> {isEn ? 'Press' : 'Nhấn'} <strong>Ctrl + V</strong> {isEn ? 'to paste screenshots directly!' : 'để dán ảnh chụp màn hình trực tiếp!'}
                      </p>
                    </div>
                  </div>

                  <label className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors shrink-0 self-start sm:self-center">
                    {uploadingTicketFile ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                    <span>{uploadingTicketFile ? (isEn ? 'Uploading...' : 'Đang tải...') : (isEn ? '+ Choose file / image' : '+ Chọn file / ảnh')}</span>
                    <input
                      type="file"
                      multiple
                      accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.log,.zip,.rar"
                      onChange={handleUploadTicketFiles}
                      className="hidden"
                      disabled={uploadingTicketFile}
                    />
                  </label>
                </div>

                {/* Attachment Preview Grid */}
                {newTicketAttachments.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 border-t border-blue-100">
                    {newTicketAttachments.map((att, idx) => {
                      const isImg = /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(att.url) || /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(att.name);
                      return (
                        <div
                          key={idx}
                          className="flex items-center justify-between gap-1.5 p-1.5 bg-white rounded-lg border border-slate-200 shadow-2xs text-[11px]"
                        >
                          <div className="flex items-center gap-1.5 truncate">
                            {isImg ? (
                              <img src={att.url} alt={att.name} className="w-8 h-8 object-cover rounded border border-slate-100 shrink-0" />
                            ) : (
                              <div className="w-8 h-8 rounded bg-slate-100 text-blue-600 flex items-center justify-center shrink-0">
                                <FileText className="w-4 h-4" />
                              </div>
                            )}
                            <span className="font-semibold text-slate-700 truncate" title={att.name}>{att.name}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setNewTicketAttachments((prev) => prev.filter((_, i) => i !== idx))}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded cursor-pointer shrink-0"
                            title={isEn ? 'Delete file' : 'Xóa tệp'}
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-3 py-1.5 border border-slate-200 text-slate-600 rounded-lg font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
                >{isEn ? 'Cancel' : 'Hủy'}</button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{isEn ? 'Submit Support Request' : 'Gửi Yêu Cầu Hỗ Trợ'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: XIN GIA HẠN THỜI GIAN SLA (SLA EXTENSION WITH REASON AUDIT) */}
      {isSlaExtModalOpen && selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-5 space-y-4 border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-100 text-amber-800 rounded-xl">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">{language === 'en' ? 'Request SLA Extension' : 'Xin Gia Hạn Thời Gian SLA'}</h3>
                  <p className="text-[10.5px] text-slate-500">{language === 'en' ? 'Extend resolution deadline when the real issue is more complex than initial description' : 'Gia hạn thời hạn xử lý khi case thực tế phức tạp hơn mô tả ban đầu'}</p>
                </div>
              </div>
              <button onClick={() => setIsSlaExtModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {slaExtSuccessMsg && (
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold animate-in fade-in">
                {slaExtSuccessMsg}
              </div>
            )}

            <form onSubmit={handleExtendSla} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">{language === 'en' ? 'Additional hours requested (*)' : 'Số giờ xin gia hạn thêm (*)'}</label>
                <select
                  value={extHours}
                  onChange={(e) => setExtHours(Number(e.target.value))}
                  className="w-full p-2.5 border border-slate-300 rounded-xl bg-slate-50 font-bold text-slate-800 outline-none"
                >
                  <option value={4}>{language === 'en' ? '+ 4 Hours (Half work day)' : '+ 4 Giờ (Nửa ngày làm việc)'}</option>
                  <option value={8}>{language === 'en' ? '+ 8 Hours (1 Work day)' : '+ 8 Giờ (1 Ngày làm việc)'}</option>
                  <option value={24}>{language === 'en' ? '+ 24 Hours (1 Full day)' : '+ 24 Giờ (1 Ngày đêm)'}</option>
                  <option value={48}>{language === 'en' ? '+ 48 Hours (2 Work days)' : '+ 48 Giờ (2 Ngày làm việc)'}</option>
                  <option value={72}>{language === 'en' ? '+ 72 Hours (3 Work days)' : '+ 72 Giờ (3 Ngày làm việc)'}</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">{language === 'en' ? 'Specific justification reason (*)' : 'Lý do giải trình cụ thể (*)'}</label>
                <textarea
                  required
                  rows={3}
                  value={extReason}
                  onChange={(e) => setExtReason(e.target.value)}
                  placeholder={language === 'en' ? 'e.g. Hard drive bad sector requires spare part order, server requires off-hours maintenance...' : 'VD: Lỗi ổ cứng hỏng bad sector cần đặt linh kiện mới, máy chủ cần bảo trì ngoài giờ...'}
                  className="w-full p-2.5 border border-slate-300 rounded-xl resize-none font-medium outline-none focus:ring-2 focus:ring-amber-500"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  🛡️ {language === 'en' ? 'Note: Extension justifications are logged in the SLA Audit Report for IT Lead transparency.' : 'Lưu ý: Lý do gia hạn được lưu lại trong Báo cáo Kiểm toán SLA để IT Lead theo dõi minh bạch.'}
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsSlaExtModalOpen(false)}
                  className="px-3.5 py-1.5 border border-slate-200 text-slate-600 rounded-xl font-semibold hover:bg-slate-50 cursor-pointer"
                >{isEn ? 'Cancel' : 'Hủy'}</button>
                <button
                  type="submit"
                  disabled={extendingSla || !extReason.trim()}
                  className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-xl font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  {extendingSla ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  <span>{language === 'en' ? 'Confirm Extension' : 'Xác Nhận Gia Hạn'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* IMAGE LIGHTBOX PREVIEW MODAL */}
      {previewImageModal && (
        <div
          onClick={() => setPreviewImageModal(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 cursor-pointer animate-in fade-in"
        >
          <div className="relative max-w-4xl max-h-[90vh] bg-transparent" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setPreviewImageModal(null)}
              className="absolute -top-10 right-0 text-white hover:text-slate-300 p-1.5 rounded-full bg-white/10"
            >
              <X className="w-6 h-6" />
            </button>
            <img
              src={previewImageModal}
              alt={isEn ? 'Enlarged image' : 'Ảnh phóng to'}
              className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl border border-white/20"
            />
          </div>
        </div>
      )}

      {/* CONVERT TICKET TO KNOWLEDGE BASE MODAL (👑 Enterprise) */}
      {isConvertToKbOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-xl w-full p-5 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-indigo-50 text-indigo-700">
                  <BookOpen className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
                    <span>{isEn ? 'Convert Ticket to Knowledge Base Article' : 'Đóng Góp Giải Pháp Vào Thư Viện Hướng Dẫn (KB)'}</span>
                    <span className="text-[10px] bg-indigo-100 text-indigo-800 font-black px-1.5 py-0.5 rounded">👑 Enterprise</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    {isEn ? 'Save this resolution as a reusable guide for the IT team & users' : 'Lưu giải pháp xử lý sự cố này thành cẩm nang tra cứu cho toàn công ty'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsConvertToKbOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitConvertToKb} className="space-y-3.5 flex-1 overflow-y-auto pr-1 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  {isEn ? 'Article Title (*)' : 'Tiêu đề bài viết (*)'}
                </label>
                <input
                  type="text"
                  required
                  value={kbArticleTitle}
                  onChange={(e) => setKbArticleTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  {isEn ? 'Audience & IT Team Scope (*)' : 'Phạm vi hiển thị & Phân quyền riêng cho Team IT (*)'}
                </label>
                <select
                  value={kbTeamScope}
                  onChange={(e) => setKbTeamScope(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white cursor-pointer"
                >
                  <option value="PUBLIC">{isEn ? '🌐 Public (All employees & users across enterprise)' : '🌐 Công khai (Toàn bộ nhân viên & người dùng)'}</option>
                  <option value="INTERNAL_IT">{isEn ? '🔒 All IT Teams (General IT internal only)' : '🔒 Toàn bộ đội ngũ IT (Nội bộ kỹ thuật chung)'}</option>
                  
                  <optgroup label={isEn ? "── Specific IT Teams ──" : "── Phân quyền riêng cho từng Team IT ──"}>
                    <option value="IT-HELPDESK">🔒 Team Helpdesk / Hỗ trợ người dùng (IT-HELPDESK)</option>
                    <option value="IT-NET">🔒 Team Hạ tầng mạng & Máy chủ (IT-NET)</option>
                    <option value="IT-APP">🔒 Team Phần mềm & Ứng dụng ERP (IT-APP)</option>
                    <option value="IT-SEC">🔒 Team An toàn thông tin & Bảo mật (IT-SEC)</option>
                    {availableSupportTeams && availableSupportTeams.length > 0 && availableSupportTeams.map((t: any) => {
                      if (['IT-HELPDESK', 'IT-NET', 'IT-APP', 'IT-SEC'].includes(t.code)) return null;
                      return (
                        <option key={t.id} value={t.code || t.id}>
                          🔒 {t.name} ({t.code})
                        </option>
                      );
                    })}
                  </optgroup>
                </select>
                <p className="text-[10px] text-slate-400 mt-1 italic">
                  💡 {isEn ? 'Selecting a specific IT team will restrict visibility to members of that technical team.' : 'Chọn riêng một team IT sẽ giới hạn bài viết chỉ dành cho các kỹ thuật viên thuộc team đó tra cứu.'}
                </p>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  {isEn ? 'Solution Content (Markdown formatted)' : 'Nội dung hướng dẫn xử lý (Định dạng Markdown)'}
                </label>
                <textarea
                  rows={8}
                  required
                  value={kbArticleContent}
                  onChange={(e) => setKbArticleContent(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsConvertToKbOpen(false)}
                  className="px-3.5 py-1.5 border border-slate-200 text-slate-600 rounded-xl font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  {isEn ? 'Cancel' : 'Hủy'}
                </button>
                <button
                  type="submit"
                  disabled={convertingToKb || !kbArticleTitle.trim()}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  {convertingToKb ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <BookOpen className="w-3.5 h-3.5" />}
                  <span>{isEn ? 'Publish Article' : 'Xuất Bản Vào Thư Viện'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MERGE TICKET MODAL (👑 Enterprise) */}
      {isMergeModalOpen && selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-xl w-full p-5 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-amber-50 text-amber-700">
                  <GitMerge className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
                    <span>{isEn ? 'Merge Duplicate Ticket' : 'Gộp Ticket Trùng Lặp'}</span>
                    <span className="text-[10px] bg-amber-100 text-amber-800 font-black px-1.5 py-0.5 rounded">👑 Enterprise</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    {isEn ? `Merge #${selectedTicket.ticketNumber} into a primary root ticket` : `Gộp ticket #${selectedTicket.ticketNumber} vào một ticket gốc để tập trung xử lý`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsMergeModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {mergeSuccessMsg ? (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 font-bold text-center space-y-1">
                <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-600" />
                <p>{mergeSuccessMsg}</p>
              </div>
            ) : (
              <div className="space-y-3.5 flex-1 overflow-y-auto pr-1 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <span className="text-slate-500 font-semibold">{isEn ? 'Source ticket (Will be closed & linked):' : 'Ticket nguồn (Sẽ được đóng & trỏ về ticket chính):'}</span>
                  <div className="font-bold text-slate-900">
                    <span className="font-mono text-blue-600">#{selectedTicket.ticketNumber}</span> - {selectedTicket.title}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {isEn ? 'Requester:' : 'Người yêu cầu:'} {selectedTicket.createdBy?.fullName}
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    {isEn ? 'Select Primary Target Ticket (*):' : 'Chọn Ticket Gốc Nhận Gộp (*):'}
                  </label>
                  <div className="relative mb-2">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={mergeSearchTerm}
                      onChange={(e) => setMergeSearchTerm(e.target.value)}
                      placeholder={isEn ? 'Search by ticket # or title...' : 'Tìm theo mã #TK-... hoặc tiêu đề ticket...'}
                      className="w-full pl-8.5 pr-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div className="max-h-48 overflow-y-auto space-y-1.5 border border-slate-200 rounded-xl p-2 bg-slate-50/50">
                    {(() => {
                      const candidateTickets = tickets.filter(
                        (t) =>
                          t.id !== selectedTicket.id &&
                          !t.mergedIntoTicketId &&
                          t.status !== 'CLOSED' &&
                          (mergeSearchTerm.trim() === '' ||
                            t.ticketNumber.toLowerCase().includes(mergeSearchTerm.toLowerCase()) ||
                            t.title.toLowerCase().includes(mergeSearchTerm.toLowerCase()))
                      );

                      if (candidateTickets.length === 0) {
                        return (
                          <p className="text-slate-400 text-center py-4 italic">
                            {isEn ? 'No eligible open tickets found.' : 'Không tìm thấy ticket nào khả dụng để gộp vào.'}
                          </p>
                        );
                      }

                      return candidateTickets.map((cand) => (
                        <label
                          key={cand.id}
                          className={`p-2.5 rounded-xl border transition-all flex items-start gap-2.5 cursor-pointer ${
                            mergeTargetTicketId === cand.id
                              ? 'bg-amber-50/90 border-amber-400 text-amber-950 font-bold shadow-2xs'
                              : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                          }`}
                        >
                          <input
                            type="radio"
                            name="mergeTarget"
                            value={cand.id}
                            checked={mergeTargetTicketId === cand.id}
                            onChange={() => setMergeTargetTicketId(cand.id)}
                            className="mt-0.5 text-amber-600 focus:ring-amber-500 cursor-pointer"
                          />
                          <div className="space-y-0.5 min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-1">
                              <span className="font-mono text-blue-700 font-extrabold text-[11px]">#{cand.ticketNumber}</span>
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-semibold">{cand.status}</span>
                            </div>
                            <p className="truncate text-xs font-semibold text-slate-800">{cand.title}</p>
                            <span className="text-[10px] text-slate-400 block">{cand.createdBy?.fullName} • {new Date(cand.createdAt).toLocaleDateString('vi-VN')}</span>
                          </div>
                        </label>
                      ));
                    })()}
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    {isEn ? 'Reason for merging:' : 'Lý do gộp ticket:'}
                  </label>
                  <input
                    type="text"
                    value={mergeReason}
                    onChange={(e) => setMergeReason(e.target.value)}
                    placeholder={isEn ? 'e.g. Duplicate issue reported by user' : 'Ví dụ: Trùng lặp sự cố mạng tầng 3'}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsMergeModalOpen(false)}
                    className="px-3.5 py-1.5 border border-slate-200 text-slate-600 rounded-xl font-semibold hover:bg-slate-50 cursor-pointer"
                  >
                    {isEn ? 'Cancel' : 'Hủy'}
                  </button>
                  <button
                    type="button"
                    onClick={handleMergeTicket}
                    disabled={mergingTicket || !mergeTargetTicketId}
                    className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-xl font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    {mergingTicket ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <GitMerge className="w-3.5 h-3.5" />}
                    <span>{isEn ? 'Confirm & Merge' : 'Xác Nhận Gộp'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* FLOATING BULK ACTIONS BAR (👑 Enterprise) */}
      {selectedTicketIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-4 animate-in slide-in-from-bottom-5">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-black">
              {selectedTicketIds.length}
            </span>
            <span className="text-xs font-bold text-slate-200">
              {isEn ? 'tickets selected' : 'ticket đã chọn'}
            </span>
          </div>
          <div className="h-4 w-px bg-slate-700" />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleBulkClose}
              disabled={bulkActionLoading}
              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              {bulkActionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
              <span>{isEn ? 'Bulk Close' : 'Đóng hàng loạt'}</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedTicketIds([])}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
            >
              {isEn ? 'Deselect All' : 'Bỏ chọn'}
            </button>
          </div>
        </div>
      )}

      {/* RECURRING MAINTENANCE SCHEDULES MODAL (👑 Enterprise) */}
      {isRecurringModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in">
          <div className="relative w-full max-w-5xl my-8 bg-slate-50 rounded-3xl shadow-2xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-4 sm:p-5 bg-white border-b border-slate-200 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-amber-500 text-white font-black text-sm">📅</span>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-slate-900 text-base">
                      {isEn ? 'Recurring Maintenance & Automatic Task Engine' : 'Lịch Tác Vụ & Ticket Bảo Trì Định Kỳ'}
                    </h3>
                    <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300 font-extrabold text-[10px]">
                      👑 Enterprise
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    {isEn ? 'Automatically generate IT helpdesk tickets for periodic maintenance, checkups, and servicing' : 'Hệ thống tự động sinh Ticket theo chu kỳ (Hàng tháng / Quý / Năm) phân công cho IT'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsRecurringModalOpen(false);
                  loadData();
                }}
                className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 font-bold transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 sm:p-6 overflow-y-auto flex-1">
              <MaintenanceSchedulesTab />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
