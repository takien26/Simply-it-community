'use client';

import { QuickLink } from '@/components/common/QuickLink';
import { MaintenanceSchedulesTab } from '@/components/settings/maintenance-schedules-tab';
import CreateTicketModal from '@/components/tickets/CreateTicketModal';
import { TicketDetailModal } from '@/components/tickets/TicketDetailModal';
import { MergeTicketModal } from '@/components/tickets/MergeTicketModal';
import { SlaExtensionModal } from '@/components/tickets/SlaExtensionModal';
import { ConvertToKbModal } from '@/components/tickets/ConvertToKbModal';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/lib/i18n/context';
import { fetchWithSwr, invalidateClientCache, useAutoRefresh, triggerDataRefresh } from '@/lib/client-cache';
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

  

  

  const [isConvertToKbOpen, setIsConvertToKbOpen] = useState(false);

  

  // Inline Create Modal KB Suggestions State
  const [inlineKbSuggestions, setInlineKbSuggestions] = useState<any[]>([]);

  // SLA Setup State
  const [isSlaModalOpen, setIsSlaModalOpen] = useState(false);
  const [slaConfig, setSlaConfig] = useState({ urgentHours: 4, highHours: 24, mediumHours: 48, lowHours: 72 });
  const [savingSla, setSavingSla] = useState(false);

  // Attachments State
  
  
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

  

  // Load Data with SWR (0ms instant display, zero-flicker background revalidation)
  const loadData = useCallback(async (forceFresh = false) => {
    try {
      if (forceFresh) {
        invalidateClientCache('/api/tickets');
      }

      await Promise.all([
        // 1. Tickets with SWR
        fetchWithSwr<any>('/api/tickets', (data) => {
          if (data) {
            const ticketList = Array.isArray(data) ? data : data.tickets || data.data || [];
            setTickets(ticketList);
            if (data.stats) setStats(data.stats);
            setLoading(false);

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
        }, 30000, forceFresh),

        // 2. Users with SWR
        fetchWithSwr<any>('/api/users', (u) => {
          if (u) {
            const userList = Array.isArray(u) ? u : u.data || u.users || [];
            setUsers(userList);
          }
        }, 60000, forceFresh),

        // 3. Assets with SWR
        fetchWithSwr<any>('/api/assets?pageSize=1000', (a) => {
          if (a) {
            const assetList = Array.isArray(a) ? a : a.data || a.assets || [];
            setAssets(assetList);
          }
        }, 60000, forceFresh),

        // 4. Current user & incidents & settings
        (async () => {
          try {
            const [meRes, settingsRes, incidentsRes] = await Promise.all([
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
          } catch {}
        })(),
      ]);
    } catch (err) {
      console.error('Failed to load tickets data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Connect Professional Auto-Refresh & Instant Reactive Sync
  const { isRefreshing: isAutoRefreshing, refreshNow } = useAutoRefresh({
    onRefresh: loadData,
    scope: 'tickets',
  });

  useEffect(() => {
    loadData();
  }, [loadData]);


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
      invalidateClientCache('/api/tickets');
      triggerDataRefresh('tickets');
      await loadData(true);
    } catch {
      alert('Lỗi khi đóng hàng loạt ticket');
    } finally {
      setBulkActionLoading(false);
    }
  };

  // Delete Ticket
  const handleDeleteTicket = async (ticketId: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa ticket này?')) return;
    // 0ms Optimistic removal
    setTickets((prev) => prev.filter((t) => t.id !== ticketId));
    if (selectedTicket?.id === ticketId) setIsDetailModalOpen(false);

    try {
      const res = await fetch(`/api/tickets/${ticketId}`, { method: 'DELETE' });
      if (res.ok) {
        invalidateClientCache('/api/tickets');
        triggerDataRefresh('tickets');
        await loadData(true);
      } else {
        alert('Xóa ticket thất bại');
        await loadData(true);
      }
    } catch {
      alert('Lỗi kết nối khi xóa');
      await loadData(true);
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
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 border border-slate-300 dark:border-slate-700"
              title={isEn ? 'Manage Recurring Maintenance Schedules & Auto-Ticket Engine' : 'Quản lý lịch bảo trì định kỳ & tự động sinh Ticket'}
            >
              <Calendar className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
              <span>{isEn ? 'Recurring Tasks' : 'Lịch định kỳ'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
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
        <div className="hidden md:block overflow-x-auto">
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
                <th className="py-3 px-3 w-[19%]{...}">{isEn ? 'SLA DEADLINE' : 'Hạn SLA & Tiến Độ'}</th>
                <th className="py-3 px-3 w-[15%]{...}">{isEn ? 'REQUESTER & IT' : 'Người Gửi & IT'}</th>
                <th className="py-3 px-2.5 w-[9%] text-right whitespace-nowrap">{isEn ? 'ACTIONS' : 'Thao Tác'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && tickets.length === 0 ? (
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
                          <PriIcon className="w-3.5 h-3.5" />
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
                      <td className="py-3 px-3" onClick={(e) => e.stopPropagation()}>
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

        {/* Mobile Ticket Cards (Only visible on screens < 768px) */}
        <div className="md:hidden divide-y divide-slate-100">
          {loading && tickets.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
              <span className="font-semibold text-xs text-slate-500">{isEn ? 'Loading tickets...' : 'Đang tải danh sách ticket...'}</span>
            </div>
          ) : filteredTickets.length === 0 ? (
            <div className="py-12 text-center text-slate-400 space-y-2 px-4">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto text-xl font-bold">
                🎫
              </div>
              <p className="font-bold text-slate-700 text-sm">{isEn ? 'No tickets found' : 'Không tìm thấy ticket nào'}</p>
              <p className="text-xs text-slate-400">{isEn ? 'No support requests match the current filters.' : 'Không có yêu cầu hỗ trợ nào phù hợp với bộ lọc hiện tại.'}</p>
            </div>
          ) : (
            filteredTickets.map((t) => {
              const cat = CATEGORY_MAP[t.category] || CATEGORY_MAP.OTHER;
              const pri = PRIORITY_MAP[t.priority] || PRIORITY_MAP.MEDIUM;
              const sta = STATUS_MAP[t.status] || STATUS_MAP.OPEN;
              const PriIcon = pri.icon;
              const sla = getTicketSLA(t, slaConfig, language);

              return (
                <div
                  key={`m-${t.id}`}
                  onClick={() => {
                    setSelectedTicket(t);
                    setIsDetailModalOpen(true);
                  }}
                  className="p-3.5 hover:bg-slate-50 transition-colors active:bg-blue-50/50 cursor-pointer space-y-2.5"
                >
                  {/* Top Bar: Ticket Number, Status & Priority */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-bold text-xs px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 border border-slate-200">
                        {t.ticketNumber}
                      </span>
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border ${sta.badge}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${sta.dot}`} />
                        <span>{getStatusLabel(t.status, language)}</span>
                      </span>
                    </div>

                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${pri.badge}`}>
                      <PriIcon className="w-3 h-3" />
                      <span>{getPriorityLabel(t.priority, language)}</span>
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="font-bold text-slate-900 text-xs leading-snug line-clamp-2">
                    {t.title}
                  </h3>

                  {/* Category & SLA info */}
                  <div className="flex items-center justify-between gap-2 text-xs flex-wrap">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold border ${cat.color}`}>
                      <span>{cat.icon}</span>
                      <span>{getCategoryLabel(t.category, language)}</span>
                    </span>

                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold border ${sla.badgeClass}`}>
                      <span>{sla.icon}</span>
                      <span>{sla.statusText}</span>
                    </span>
                  </div>

                  {/* Footer: Requester, Assignee & Action */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                    <div className="flex items-center gap-2 truncate">
                      <span>👤 {t.createdBy?.fullName || '—'}</span>
                      <span>•</span>
                      <span className="text-indigo-600 font-medium">
                        {t.assignedTo?.fullName ? `👨‍💻 ${t.assignedTo.fullName}` : (isEn ? 'Unassigned' : 'Chưa gán IT')}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0 text-blue-600 font-bold text-xs">
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>{t.comments?.length || 0}</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* MODAL 1: CHI TIẾT TICKET & TRAO ĐỔI (BÓC TÁCH COMPONENT CHUYÊN TRÁCH) */}
      <TicketDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        selectedTicket={selectedTicket}
        currentUser={currentUser}
        isITStaffOrAdmin={isITStaffOrAdmin}
        itUsers={itUsers}
        users={users}
        incidentsList={incidentsList}
        tickets={tickets}
        slaConfig={slaConfig}
        onTicketUpdated={(updatedTicket) => {
          setSelectedTicket(updatedTicket);
          setTickets((prev) => prev.map((t) => (t.id === updatedTicket.id ? { ...t, ...updatedTicket } : t)));
          invalidateClientCache('/api/tickets');
          triggerDataRefresh('tickets');
        }}
        onUpdateStatus={handleUpdateStatus}
        onUpdateAssignee={handleUpdateAssignee}
        onLinkIncident={handleLinkIncident}
        onOpenMergeModal={() => setIsMergeModalOpen(true)}
        onOpenConvertToKbModal={() => setIsConvertToKbOpen(true)}
        onOpenSlaExtModal={() => setIsSlaExtModalOpen(true)}
        onPreviewImage={(url) => setPreviewImageModal(url)}
        onSelectTicket={(ticket) => {
          setSelectedTicket(ticket);
          setIsDetailModalOpen(true);
        }}
      />

      {/* MODAL 2: TẠO TICKET MỚI (FOR ALL USERS) */}
      <CreateTicketModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        currentUser={currentUser}
        userAssets={myAssets}
        onSuccess={() => {
          invalidateClientCache('/api/tickets');
          triggerDataRefresh('tickets');
          loadData(true);
        }}
      />

      {/* MODAL: XIN GIA HẠN THỜI GIAN SLA (SLA EXTENSION WITH REASON AUDIT) */}
      <SlaExtensionModal
        isOpen={isSlaExtModalOpen}
        onClose={() => setIsSlaExtModalOpen(false)}
        ticket={selectedTicket}
        onSuccess={(updatedTicket) => {
          setSelectedTicket(updatedTicket);
          setTickets((prev) => prev.map((t) => (t.id === updatedTicket.id ? { ...t, ...updatedTicket } : t)));
        }}
      />

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
      <ConvertToKbModal
        isOpen={isConvertToKbOpen}
        onClose={() => setIsConvertToKbOpen(false)}
        ticket={selectedTicket}
      />

      {/* MERGE TICKET MODAL (👑 Enterprise) */}
      <MergeTicketModal
        isOpen={isMergeModalOpen}
        onClose={() => setIsMergeModalOpen(false)}
        selectedTicket={selectedTicket}
        allTickets={tickets}
        onSuccess={(parentTicket, childId) => {
          setSelectedTicket(parentTicket);
          setTickets((prev) =>
            prev.map((t) => {
              if (t.id === childId) return { ...t, status: 'CLOSED', mergedIntoTicketId: parentTicket?.id };
              if (t.id === parentTicket?.id) return { ...t, ...parentTicket };
              return t;
            })
          );
        }}
      />

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

      {/* RECURRING MAINTENANCE SCHEDULES MODAL */}
      {isRecurringModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in">
          <div className="relative w-full max-w-5xl my-8 bg-slate-50 rounded-3xl shadow-2xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-4 sm:p-5 bg-white border-b border-slate-200 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">
                    {isEn ? 'Recurring Maintenance & Automatic Task Engine' : 'Lịch Tác Vụ & Ticket Bảo Trì Định Kỳ'}
                  </h3>
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
