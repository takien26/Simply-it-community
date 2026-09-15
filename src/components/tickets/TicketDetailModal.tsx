'use client';

import React, { useState, useRef, useMemo } from 'react';
import Link from 'next/link';
import {
  LifeBuoy,
  X,
  Sparkles,
  Loader2,
  FileText,
  Clock,
  Star,
  Paperclip,
  Send,
  GitMerge,
  BrainCircuit,
  Zap,
  Trash2,
  Download,
  BookOpen,
  MessageSquare,
  ChevronDown,
  AlertTriangle,
} from 'lucide-react';
import { useLanguage } from '@/lib/i18n/context';
import { QuickLink } from '@/components/common/QuickLink';

export interface TicketDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedTicket: any;
  currentUser: any;
  isITStaffOrAdmin: boolean;
  itUsers: any[];
  users?: any[];
  incidentsList?: any[];
  tickets?: any[];
  slaConfig?: { urgentHours: number; highHours: number; mediumHours: number; lowHours: number };
  onTicketUpdated?: (updatedTicket: any) => void;
  onUpdateStatus?: (ticketId: string, newStatus: string) => Promise<void> | void;
  onUpdateAssignee?: (ticketId: string, assignedToId: string) => Promise<void> | void;
  onLinkIncident?: (incidentId: string | null) => Promise<void> | void;
  onOpenMergeModal?: () => void;
  onOpenConvertToKbModal?: () => void;
  onOpenSlaExtModal?: () => void;
  onPreviewImage?: (url: string) => void;
  onSelectTicket?: (ticket: any) => void;
}

export const CATEGORY_MAP: Record<string, { label: string; icon: string; color: string }> = {
  HARDWARE: { label: 'Phần cứng', icon: '💻', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  SOFTWARE: { label: 'Phần mềm', icon: '💿', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  NETWORK: { label: 'Mạng & Internet', icon: '🌐', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  PRINTER: { label: 'Máy in & Thiết bị VP', icon: '🖨️', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  ACCESS: { label: 'Tài khoản & Phân quyền', icon: '🔑', color: 'bg-rose-50 text-rose-700 border-rose-200' },
  EMAIL: { label: 'Email & Hòm thư', icon: '✉️', color: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
  BACKUP: { label: 'Sao lưu & Phục hồi', icon: '💾', color: 'bg-teal-50 text-teal-700 border-teal-200' },
  SECURITY: { label: 'Bảo mật & Virus', icon: '🛡️', color: 'bg-red-50 text-red-700 border-red-200' },
  CONSULTING: { label: 'Tư vấn & Hướng dẫn', icon: '💡', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  ERP: { label: 'Hệ thống ERP / CRM', icon: '📊', color: 'bg-orange-50 text-orange-700 border-orange-200' },
  OTHER: { label: 'Khác', icon: '❓', color: 'bg-slate-50 text-slate-700 border-slate-200' },
};

export const PRIORITY_MAP: Record<string, { label: string; icon: any; badge: string }> = {
  LOW: { label: 'Thấp', icon: Clock, badge: 'bg-slate-100 text-slate-600 border-slate-200' },
  MEDIUM: { label: 'Trung bình', icon: Clock, badge: 'bg-blue-50 text-blue-700 border-blue-200' },
  HIGH: { label: 'Cao', icon: Clock, badge: 'bg-amber-50 text-amber-700 border-amber-200' },
  URGENT: { label: 'Khẩn cấp', icon: AlertTriangle, badge: 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse' },
};

export const STATUS_MAP: Record<string, { label: string; badge: string; dot: string }> = {
  OPEN: { label: 'Mới mở', badge: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-500' },
  IN_PROGRESS: { label: 'Đang xử lý', badge: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500 animate-ping' },
  PENDING_VENDOR: { label: 'Chờ Hãng/NCC', badge: 'bg-purple-50 text-purple-700 border-purple-200', dot: 'bg-purple-500' },
  RESOLVED: { label: 'Đã giải quyết', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  CLOSED: { label: 'Đã đóng', badge: 'bg-slate-100 text-slate-700 border-slate-200', dot: 'bg-slate-400' },
};

export function getStatusLabel(status: string, lang: string) {
  if (lang === 'ja') {
    switch (status) {
      case 'OPEN': return '未対応 (新規)';
      case 'IN_PROGRESS': return '対応中';
      case 'PENDING_VENDOR': return 'ベンダー確認待ち';
      case 'RESOLVED': return '解決済み';
      case 'CLOSED': return '完了 (クローズ)';
      default: return status;
    }
  }
  if (lang === 'en') {
    switch (status) {
      case 'OPEN': return 'Open';
      case 'IN_PROGRESS': return 'In Progress';
      case 'PENDING_VENDOR': return 'Pending Vendor';
      case 'RESOLVED': return 'Resolved';
      case 'CLOSED': return 'Closed';
      default: return status;
    }
  }
  return STATUS_MAP[status]?.label || status;
}

export function getPriorityLabel(priority: string, lang: string) {
  if (lang === 'ja') {
    switch (priority) {
      case 'LOW': return '低';
      case 'MEDIUM': return '中';
      case 'HIGH': return '高';
      case 'URGENT': return '緊急';
      default: return priority;
    }
  }
  if (lang === 'en') {
    switch (priority) {
      case 'LOW': return 'Low';
      case 'MEDIUM': return 'Medium';
      case 'HIGH': return 'High';
      case 'URGENT': return 'Urgent';
      default: return priority;
    }
  }
  return PRIORITY_MAP[priority]?.label || priority;
}

export function getCategoryLabel(category: string, lang: string) {
  if (lang === 'ja') {
    switch (category) {
      case 'HARDWARE': return 'ハードウェア';
      case 'SOFTWARE': return 'ソフトウェア';
      case 'NETWORK': return 'ネットワーク・回線';
      case 'PRINTER': return 'プリンター・OA機器';
      case 'ACCESS': return 'アカウント・権限';
      case 'EMAIL': return 'メール・アドレス';
      case 'BACKUP': return 'バックアップ・復旧';
      case 'SECURITY': return 'セキュリティ・ウイルス';
      case 'CONSULTING': return '問い合わせ・相談';
      case 'ERP': return 'ERP / 基幹システム';
      default: return 'その他';
    }
  }
  if (lang === 'en') {
    switch (category) {
      case 'HARDWARE': return 'Hardware';
      case 'SOFTWARE': return 'Software';
      case 'NETWORK': return 'Network & Internet';
      case 'PRINTER': return 'Printer & Office Devices';
      case 'ACCESS': return 'Account & Permissions';
      case 'EMAIL': return 'Email & Mailbox';
      case 'BACKUP': return 'Backup & Restore';
      case 'SECURITY': return 'Security & Antivirus';
      case 'CONSULTING': return 'Consulting & Guidance';
      case 'ERP': return 'ERP / CRM System';
      default: return 'Other';
    }
  }
  return CATEGORY_MAP[category]?.label || category;
}

export function formatSpentTime(minutes?: number | null, langOrIsEn?: boolean | string): string {
  if (!minutes || minutes <= 0) return '0m';
  const isEn = langOrIsEn === true || langOrIsEn === 'en';
  const isJa = langOrIsEn === 'ja';
  const isVi = !isEn && !isJa;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (isJa) {
    if (h > 0 && m > 0) return `${h}時間 ${m}分`;
    if (h > 0) return `${h}時間`;
    return `${m}分`;
  }
  if (h > 0 && m > 0) return (!isVi ? `${h}h ${m}m` : `${h} giờ ${m} phút`);
  if (h > 0) return (!isVi ? `${h}h` : `${h} giờ`);
  return (!isVi ? `${m}m` : `${m} phút`);
}

export function getTicketSLA(
  ticket: any,
  slaConfig?: { urgentHours: number; highHours: number; mediumHours: number; lowHours: number },
  lang?: string
) {
  const isEn = lang === 'en';
  const isJa = lang === 'ja';
  const isVi = lang === 'vi' || (!isEn && !isJa);
  const txt = (vi: string, en: string, ja: string) => isJa ? ja : (isEn ? en : vi);
  const createdAt = new Date(ticket.createdAt);

  const config = slaConfig || { urgentHours: 4, highHours: 24, mediumHours: 48, lowHours: 72 };
  let slaHours = config.mediumHours;
  if (ticket.priority === 'URGENT') slaHours = config.urgentHours;
  else if (ticket.priority === 'HIGH') slaHours = config.highHours;
  else if (ticket.priority === 'MEDIUM') slaHours = config.mediumHours;
  else if (ticket.priority === 'LOW') slaHours = config.lowHours;

  const deadline = ticket.slaDeadline
    ? new Date(ticket.slaDeadline)
    : new Date(createdAt.getTime() + slaHours * 60 * 60 * 1000);

  const now = new Date();
  const isResolved = ticket.status === 'RESOLVED' || ticket.status === 'CLOSED';
  const isWaiting = ticket.status === 'WAITING' || !!ticket.slaPausedAt;
  const isExtended = !!ticket.isSlaExtended;

  const resolvedAtDate = ticket.resolvedAt ? new Date(ticket.resolvedAt) : null;

  let statusText = '';
  let badgeClass = '';
  let icon = '⏱️';
  let isOverdue = false;
  let isWarning = false;

  if (isResolved) {
    const effectiveDoneTime = resolvedAtDate || new Date(ticket.updatedAt || ticket.createdAt);
    const completionDiffMs = deadline.getTime() - effectiveDoneTime.getTime();
    const completionDiffMins = Math.round(Math.abs(completionDiffMs) / (1000 * 60));
    const completionDiffHours = Math.floor(completionDiffMins / 60);
    const remainingMins = completionDiffMins % 60;
    const timeStr =
      completionDiffHours > 0
        ? `${completionDiffHours}h ${remainingMins > 0 ? `${remainingMins}m` : ''}`
        : txt(`${completionDiffMins} phút`, `${completionDiffMins} min`, `${completionDiffMins}分`);

    if (completionDiffMs < 0) {
      statusText = txt(`Hoàn thành trễ hạn (${timeStr})`, `Completed Late (${timeStr})`, `完了 (遅延: ${timeStr})`);
      badgeClass = 'bg-rose-100 text-rose-800 border-rose-300 font-bold';
      icon = '❌';
      isOverdue = true;
    } else {
      statusText = txt('Đã hoàn thành đúng hạn', 'Completed On Time', '期限内完了');
      badgeClass = 'bg-emerald-50 text-emerald-700 border-emerald-200 font-bold';
      icon = '✅';
      isOverdue = false;
    }
  } else if (isWaiting) {
    statusText = txt('⏸️ SLA Đang Tạm Dừng (Chờ phản hồi)', '⏸️ SLA Paused (Awaiting Response)', '⏸️ SLA一時停止中 (回答待ち)');
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
      const overdueStr = overdueHours > 0 ? `${overdueHours}h ${remMins > 0 ? `${remMins}m` : ''}` : txt(`${overdueMins} phút`, `${overdueMins} min`, `${overdueMins}分`);
      statusText = txt(`Đã quá hạn ${overdueStr}`, `Overdue ${overdueStr}`, `SLA超過 ${overdueStr}`);
      badgeClass = 'bg-rose-100 text-rose-800 border-rose-300 animate-pulse font-bold';
      icon = '🚨';
      isOverdue = true;
    } else if (diffHours <= 4) {
      statusText = txt(
        `Sắp quá hạn (còn ${diffMins > 60 ? `${Math.floor(diffMins / 60)}h ${diffMins % 60}m` : `${diffMins} phút`})`,
        `Expiring Soon (${diffMins > 60 ? `${Math.floor(diffMins / 60)}h ${diffMins % 60}m` : `${diffMins} min`} left)`,
        `SLA期限間近 (残り ${diffMins > 60 ? `${Math.floor(diffMins / 60)}時間 ${diffMins % 60}分` : `${diffMins}分`})`
      );
      badgeClass = 'bg-amber-100 text-amber-800 border-amber-300 animate-pulse font-bold';
      icon = '⚠️';
      isWarning = true;
    } else {
      statusText = txt(`Còn ${diffHours} giờ`, `${diffHours}h remaining`, `残り ${diffHours}時間`);
      badgeClass = 'bg-blue-50 text-blue-700 border-blue-200 font-semibold';
      icon = '⏱️';
    }
  }

  return {
    createdAtFormatted: createdAt.toLocaleString((!isVi ? 'en-US' : 'vi-VN'), {
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
      ? resolvedAtDate.toLocaleString((!isVi ? 'en-US' : 'vi-VN'), {
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

export function TicketDetailModal({
  isOpen,
  onClose,
  selectedTicket: initialTicket,
  currentUser,
  isITStaffOrAdmin,
  itUsers,
  users = [],
  incidentsList = [],
  tickets = [],
  slaConfig,
  onTicketUpdated,
  onUpdateStatus: propUpdateStatus,
  onUpdateAssignee: propUpdateAssignee,
  onLinkIncident: propLinkIncident,
  onOpenMergeModal,
  onOpenConvertToKbModal,
  onOpenSlaExtModal,
  onPreviewImage,
  onSelectTicket,
}: TicketDetailModalProps) {
  const { language, t, isEn, isJa, isVi } = useLanguage();
  const txt = (vi: string, en: string, ja?: string) => isJa ? (ja || en) : (isEn ? en : vi);
  const formatDateI18n = (d?: string | null) => {
    if (!d) return '—';
    const dateObj = new Date(d);
    if (isNaN(dateObj.getTime())) return d;
    return dateObj.toLocaleDateString(isJa ? 'ja-JP' : ((!isVi ? 'en-US' : 'vi-VN')));
  };

  const [selectedTicket, setSelectedTicket] = useState<any>(initialTicket);

  React.useEffect(() => {
    setSelectedTicket(initialTicket);
  }, [initialTicket]);

  // ESC key listener to close modal
  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Comments state
  const [commentText, setCommentText] = useState('');
  const [isInternalComment, setIsInternalComment] = useState(false);
  const [sendingComment, setSendingComment] = useState(false);
  const [spentMinutesInput, setSpentMinutesInput] = useState('');
  const [broadcastToMerged, setBroadcastToMerged] = useState(false);
  const [commentAttachments, setCommentAttachments] = useState<any[]>([]);
  const [uploadingCommentFile, setUploadingCommentFile] = useState(false);
  const isPastingRef = useRef(false);

  // Canned Responses state
  const [cannedResponses, setCannedResponses] = useState<any[]>([]);
  const [isCannedMenuOpen, setIsCannedMenuOpen] = useState(false);
  const [loadingCanned, setLoadingCanned] = useState(false);
  const [isCreatingCanned, setIsCreatingCanned] = useState(false);
  const [newCannedTitle, setNewCannedTitle] = useState('');
  const [newCannedShortcut, setNewCannedShortcut] = useState('');
  const [newCannedContent, setNewCannedContent] = useState('');
  const [savingCanned, setSavingCanned] = useState(false);

  // CSAT Rating state
  const [submittingRating, setSubmittingRating] = useState(false);
  const [ratingHover, setRatingHover] = useState(0);
  const [selectedRating, setSelectedRating] = useState(5);
  const [ratingFeedback, setRatingFeedback] = useState('');

  // IT Escalation state
  const [escalateToId, setEscalateToId] = useState('');
  const [escalateNote, setEscalateNote] = useState('');
  const [escalateSending, setEscalateSending] = useState(false);
  const [escalateSuccessMsg, setEscalateSuccessMsg] = useState('');

  // Incident linking state
  const [linkingIncident, setLinkingIncident] = useState(false);
  const [isIncidentMenuOpen, setIsIncidentMenuOpen] = useState(false);

  const selectedSla = useMemo(() => {
    return selectedTicket ? getTicketSLA(selectedTicket, slaConfig, language) : null;
  }, [selectedTicket, slaConfig, language]);

  if (!isOpen || !selectedTicket) return null;

  // Handlers
  const handleUpdateStatus = async (ticketId: string, newStatus: string) => {
    if (propUpdateStatus) {
      await propUpdateStatus(ticketId, newStatus);
      return;
    }
    try {
      const res = await fetch(`/api/tickets/${ticketId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        const updated = await res.json();
        setSelectedTicket((prev: any) => ({ ...prev, ...updated }));
        if (onTicketUpdated) onTicketUpdated(updated);
      }
    } catch {
      alert('Lỗi cập nhật trạng thái');
    }
  };

  const handleUpdateAssignee = async (ticketId: string, assignedToId: string) => {
    if (propUpdateAssignee) {
      await propUpdateAssignee(ticketId, assignedToId);
      return;
    }
    try {
      const res = await fetch(`/api/tickets/${ticketId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignedToId: assignedToId || null }),
      });
      if (res.ok) {
        const updated = await res.json();
        setSelectedTicket((prev: any) => ({ ...prev, ...updated }));
        if (onTicketUpdated) onTicketUpdated(updated);
      }
    } catch {
      alert('Lỗi phân công IT');
    }
  };

  const handleLinkIncident = async (incidentId: string | null) => {
    if (propLinkIncident) {
      await propLinkIncident(incidentId);
      return;
    }
    try {
      setLinkingIncident(true);
      const res = await fetch(`/api/tickets/${selectedTicket.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ incidentId }),
      });
      if (res.ok) {
        const updated = await res.json();
        setSelectedTicket((prev: any) => ({ ...prev, incidentId, incident: updated.incident }));
        if (onTicketUpdated) onTicketUpdated(updated);
      }
    } catch {
      alert('Lỗi kết nối sự cố');
    } finally {
      setLinkingIncident(false);
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
        const updated = {
          ...selectedTicket,
          rating: ratingStars,
          ratingComment: feedbackText,
          ratedAt: new Date().toISOString(),
        };
        setSelectedTicket(updated);
        if (onTicketUpdated) onTicketUpdated(updated);
        alert((!isVi ? 'Thank you for your rating!' : 'Cảm ơn bạn đã gửi đánh giá chất lượng phục vụ!'));
      } else {
        alert(data.error || 'Lỗi gửi đánh giá');
      }
    } catch (err: any) {
      alert(err.message || 'Lỗi gửi đánh giá');
    } finally {
      setSubmittingRating(false);
    }
  };

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
        const updated = {
          ...selectedTicket,
          actualSpentMinutes: (selectedTicket?.actualSpentMinutes || 0) + incMinutes,
          comments: [...(selectedTicket?.comments || []), newC],
        };
        setSelectedTicket(updated);
        if (onTicketUpdated) onTicketUpdated(updated);
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

  const handleSendEscalation = async () => {
    if (!selectedTicket || (!escalateToId && !escalateNote.trim())) return;
    try {
      setEscalateSending(true);
      const targetUser = itUsers.find((u) => u.id === escalateToId);
      const mentionText = targetUser ? `@${targetUser.fullName} (${targetUser.role?.name || 'IT'})` : '';
      const fullContent = `🚨 [YÊU CẦU HỖ TRỢ NỘI BỘ IT]\n${mentionText ? `👉 Kính nhờ: ${mentionText}\n` : ''}📝 Nội dung: ${escalateNote.trim() || 'Nhờ đồng nghiệp hỗ trợ xử lý sự cố này.'}`;

      const res = await fetch(`/api/tickets/${selectedTicket.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: fullContent,
          isInternal: true,
        }),
      });

      if (res.ok) {
        const newC = await res.json();
        const updated = {
          ...selectedTicket,
          comments: [...(selectedTicket.comments || []), newC],
        };
        setSelectedTicket(updated);
        if (onTicketUpdated) onTicketUpdated(updated);
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

  const fetchCannedResponses = async () => {
    if (cannedResponses.length > 0) return;
    try {
      setLoadingCanned(true);
      const res = await fetch('/api/canned-responses');
      const data = await res.json();
      if (res.ok && data.data) {
        setCannedResponses(data.data);
      }
    } catch {
      // ignore
    } finally {
      setLoadingCanned(false);
    }
  };

  const handleSelectCannedResponse = (cr: any) => {
    setCommentText((prev) => (prev ? `${prev}\n${cr.content}` : cr.content));
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
        }),
      });
      const data = await res.json();
      if (res.ok && data.data) {
        setCannedResponses((prev) => [...prev, data.data]);
        setNewCannedTitle('');
        setNewCannedShortcut('');
        setNewCannedContent('');
        setIsCreatingCanned(false);
      } else {
        alert(data.error || 'Tạo mẫu thất bại');
      }
    } catch {
      alert('Lỗi kết nối khi tạo mẫu');
    } finally {
      setSavingCanned(false);
    }
  };

  const handleDeleteCannedResponse = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm((!isVi ? 'Delete this canned reply template?' : 'Bạn có chắc chắn muốn xóa mẫu câu này không?'))) return;
    try {
      const res = await fetch(`/api/canned-responses?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setCannedResponses((prev) => prev.filter((item) => item.id !== id));
      }
    } catch {
      alert('Lỗi xóa mẫu câu');
    }
  };

  const handlePasteImage = async (e: React.ClipboardEvent, target: 'ticket' | 'comment' = 'comment') => {
    e.stopPropagation();
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
    const customName = `screenshot_${Date.now()}.png`;
    formData.append('file', file, customName);
    formData.append('category', 'ticket_comment');

    setUploadingCommentFile(true);

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
        setCommentAttachments((prev) => [...prev, newAtt]);
      } else {
        alert(data.error || 'Dán ảnh thất bại');
      }
    } catch {
      alert('Lỗi kết nối khi tải ảnh dán');
    } finally {
      setUploadingCommentFile(false);
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

  const setIsDetailModalOpen = (open?: boolean) => {
    if (!open) onClose();
  };
  const setIsMergeModalOpen = (_?: boolean) => {
    if (onOpenMergeModal) onOpenMergeModal();
  };
  const setIsConvertToKbOpen = (_?: boolean) => {
    if (onOpenConvertToKbModal) onOpenConvertToKbModal();
  };
  const setIsSlaExtModalOpen = (_?: boolean) => {
    if (onOpenSlaExtModal) onOpenSlaExtModal();
  };
  const setPreviewImageModal = (url: string | null) => {
    if (url && onPreviewImage) onPreviewImage(url);
  };

  return (

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
                    onClick={() => setIsMergeModalOpen(true)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs border border-slate-300 transition-colors cursor-pointer"
                    title={txt('Gộp ticket trùng lặp này vào ticket chính', 'Merge this duplicate ticket into a main ticket', '重複チケットを親チケットに統合')}
                  >
                    <GitMerge className="w-3.5 h-3.5 text-slate-600" />
                    <span className="hidden sm:inline">{txt('Gộp Ticket', 'Merge', '統合')}</span>
                    
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
                      title={txt('Liên kết với Sự cố lớn', 'Link to Major Incident', '重大インシデントに関連付け')}
                    >
                      <span className="text-xs">🚨</span>
                      <span className="hidden sm:inline">
                        {selectedTicket.incident
                          ? selectedTicket.incident.incidentNumber
                          : (!isVi ? 'Link Incident' : 'Sự cố')}
                      </span>
                      
                    </button>

                    {isIncidentMenuOpen && (
                      <div className="absolute right-0 mt-1.5 w-72 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 z-50 animate-in fade-in zoom-in-95 space-y-1">
                        <div className="px-2 py-1 font-bold text-slate-800 text-xs border-b border-slate-100 flex items-center justify-between">
                          <span>{txt('Liên kết với Sự cố', 'Link to Major Incident', '重大インシデントに関連付け')}</span>
                          
                        </div>
                        {selectedTicket.incidentId && (
                          <button
                            type="button"
                            onClick={() => handleLinkIncident(null)}
                            disabled={linkingIncident}
                            className="w-full text-left px-2 py-1.5 text-xs text-rose-600 hover:bg-rose-50 rounded-lg font-semibold flex items-center gap-2 cursor-pointer"
                          >
                            <span>❌</span>
                            <span>{txt('Gỡ liên kết sự cố hiện tại', 'Unlink current incident', 'インシデント連携を解除')}</span>
                          </button>
                        )}
                        <div className="max-h-48 overflow-y-auto space-y-1 pt-1">
                          {incidentsList.length === 0 ? (
                            <p className="text-slate-400 text-center py-3 text-xs italic">
                              {txt('Không có sự cố nào đang mở.', 'No active incidents found.', 'オープン中のインシデントはありません。')}
                            </p>
                          ) : (
                            incidentsList.map((inc: any) => (
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
                  onClick={() => setIsConvertToKbOpen(true)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs border border-indigo-200 transition-colors cursor-pointer"
                  title={txt('Chuyển thành bài viết Thư viện Hướng dẫn (KB)', 'Convert Ticket to Knowledge Base Article', 'ナレッジベース記事に変換')}
                >
                  <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
                  <span className="hidden sm:inline">{txt('Lưu vào KB', 'Save to KB', 'ナレッジ化')}</span>
                  
                </button>
                <button
                  type="button"
                  onClick={() => setIsDetailModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors cursor-pointer shrink-0"
                  title={txt('Đóng modal', 'Close modal', '閉じる')}
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
                      {(!isVi ? 'This ticket was merged into main ticket:' : 'Ticket này đã được gộp vào ticket chính:')}{' '}
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
                    {(!isVi ? 'View root ticket ↗' : 'Xem ticket gốc ↗')}
                  </button>
                </div>
              )}

              {/* Info Banner: Merged Child Tickets */}
              {selectedTicket.mergedTickets && selectedTicket.mergedTickets.length > 0 && (
                <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-2xl space-y-1.5 text-indigo-950 animate-in fade-in">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 font-bold text-xs">
                      <GitMerge className="w-4 h-4 text-indigo-600 shrink-0" />
                      <span>{(!isVi ? `🔗 Merged child tickets (${selectedTicket.mergedTickets.length}):` : `🔗 Đã gộp ${selectedTicket.mergedTickets.length} ticket con liên quan:`)}</span>
                    </div>
                    
                  </div>
                  <div className="flex items-center gap-2 flex-wrap pt-0.5">
                    {selectedTicket.mergedTickets.map((child: any) => (
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
                      <span className="font-bold text-rose-800">{(!isVi ? 'Major Incident:' : 'Sự cố trọng yếu:')}</span>{' '}
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
                      title={(!isVi ? 'Unlink from incident' : 'Gỡ khỏi sự cố')}
                    >
                      {(!isVi ? 'Unlink' : 'Gỡ liên kết')}
                    </button>
                  )}
                </div>
              )}

              {/* Meta Grid Banner */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 p-3.5 rounded-2xl bg-slate-50/90 border border-slate-200/80 text-[11.5px]">
                <div className="space-y-0.5">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">{txt('Người yêu cầu', 'Requester', '依頼者')}</span>
                  {selectedTicket.createdBy?.id ? (
                    <QuickLink
                      type="user"
                      id={selectedTicket.createdBy.id}
                      label={selectedTicket.createdBy.fullName || txt('Người dùng', 'User', 'ユーザー')}
                      avatarUrl={selectedTicket.createdBy.avatarUrl}
                      icon="👤"
                      className="font-bold text-slate-900 text-xs"
                    />
                  ) : (
                    <div className="font-bold text-slate-900 flex items-center gap-1.5 truncate">
                      <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] shrink-0 font-extrabold">👤</span>
                      <span className="truncate">{selectedTicket.createdBy?.fullName || txt('Người dùng', 'User', 'ユーザー')}</span>
                    </div>
                  )}
                  <span className="text-[10px] text-slate-400 block truncate">{selectedTicket.createdBy?.email}</span>
                </div>

                <div className="space-y-0.5">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">{txt('IT Phụ trách', 'IT Assignee', '担当IT')}</span>
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
                    <div className="font-semibold text-slate-400 italic text-xs">{txt('Chưa phân công', 'Unassigned', '未割り当て')}</div>
                  )}
                  <span className="text-[10px] text-slate-400 block truncate">{selectedTicket.assignedTo?.email || txt('Đang chờ điều phối', 'Pending assignment', '配分待ち')}</span>
                </div>

                <div className="space-y-0.5">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">{txt('Phân loại & Công ty', 'Category & Company', 'カテゴリ・会社')}</span>
                  <div className="font-bold text-slate-800 truncate">
                    {CATEGORY_MAP[selectedTicket.category]?.label}
                  </div>
                  <span className="text-[10px] text-slate-500 block truncate">🏢 {selectedTicket.companyName || selectedTicket.createdBy?.department || ((!isVi ? 'ABC Corp' : 'Tập đoàn ABC'))}</span>
                </div>

                <div className="space-y-0.5">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">{txt('Thiết bị sự cố', 'Incident Device', '対象機器')}</span>
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
                    <span className="text-slate-400 italic">{txt('Không chọn', 'Not selected', '未選択')}</span>
                  )}
                  <span className="text-[10px] text-slate-400 block">
                    {selectedTicket.asset?.status ? `${(!isVi ? 'Status:' : 'Trạng thái:')} ${selectedTicket.asset.status}` : ((!isVi ? 'Unassigned device' : 'Thiết bị tự do'))}
                  </span>
                </div>

                <div className="space-y-0.5">
                  <div className="flex items-center gap-1">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">{(!isVi ? 'Logged Time' : 'Thời gian xử lý')}</span>
                    
                  </div>
                  <div className="font-extrabold text-slate-800 text-xs flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className={selectedTicket.actualSpentMinutes && selectedTicket.actualSpentMinutes > 0 ? 'text-emerald-700' : 'text-slate-700'}>
                      {formatSpentTime(selectedTicket.actualSpentMinutes, isEn)}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 block truncate">
                    {selectedTicket.actualSpentMinutes && selectedTicket.actualSpentMinutes > 0
                      ? ((!isVi ? `Total: ${selectedTicket.actualSpentMinutes} mins` : `Tổng: ${selectedTicket.actualSpentMinutes} phút`))
                      : ((!isVi ? 'Not logged yet' : 'Chưa ghi nhận'))}
                  </span>
                </div>
              </div>

              {/* SLA & Tiến Độ Thời Gian Bar */}
              {selectedSla && (
                <div className="p-3.5 rounded-2xl bg-gradient-to-r from-blue-50/60 via-indigo-50/40 to-slate-50 border border-blue-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[11.5px]">
                  <div className="flex items-center gap-5 flex-wrap">
                    <div className="space-y-0.5">
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">{(!isVi ? '🕒 Opened:' : '🕒 Mở ticket:')}</span>
                      <span className="font-bold text-slate-900">{selectedSla.createdAtFormatted}</span>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">{(!isVi ? '🎯 Standard SLA:' : '🎯 Hạn SLA chuẩn:')}</span>
                      <span className="font-bold text-slate-900">{selectedSla.deadlineFormatted} ({selectedSla.slaHours}h)</span>
                    </div>
                    {(selectedTicket as any).isSlaExtended && (
                      <span className="px-2.5 py-0.5 rounded-lg bg-amber-100 text-amber-900 border border-amber-300 font-extrabold text-[10px] inline-flex items-center gap-1">
                        <span>⏱️</span>
                        <span>{(!isVi ? 'SLA Extended' : 'Đã Gia Hạn SLA')}</span>
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
                        <span>{(!isVi ? 'Request SLA Extension' : 'Xin Gia Hạn SLA')}</span>
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
                      <span>{(!isVi ? 'Incident Description & Requirements:' : 'Mô tả chi tiết sự cố & Yêu cầu:')}</span>
                    </h4>
                    <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-100 text-slate-800 leading-relaxed whitespace-pre-wrap font-medium text-[11.5px]">
                      {selectedTicket.description}
                    </div>

                    {/* Initial Attachments */}
                    {Array.isArray(selectedTicket.attachmentUrls) && (selectedTicket.attachmentUrls as any[]).length > 0 && (
                      <div className="pt-2 border-t border-slate-100 space-y-2">
                        <span className="text-[11px] font-bold text-blue-900 flex items-center gap-1">
                          <Paperclip className="w-3.5 h-3.5 text-blue-600" />
                          <span>{(!isVi ? 'Attachments & Images' : 'Tệp & Hình ảnh đính kèm')} ({(selectedTicket.attachmentUrls as any[]).length}):</span>
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
                                      alt={att.name || ((!isVi ? 'Attachment image' : 'Ảnh đính kèm'))}
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
                                  <span className="font-semibold text-slate-700 truncate" title={att.name}>{att.name || ((!isVi ? 'Attachment' : 'Tệp đính kèm'))}</span>
                                  <a
                                    href={att.url}
                                    download={att.name || 'file'}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="p-1 text-blue-600 hover:bg-blue-100 rounded-md"
                                    title={(!isVi ? 'Download' : 'Tải xuống')}
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
                          <h5 className="font-bold text-slate-900 text-xs">{(!isVi ? 'Transparent Routing Path' : 'Minh Bạch Phân Tuyến (Routing Path)')}</h5>
                          <p className="text-[10px] text-slate-500">{(!isVi ? 'Auto-routed based on user context & category' : 'Tự động định tuyến dựa trên ngữ cảnh người dùng & danh mục')}</p>
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 rounded-md font-bold text-[9.5px] border ${
                        selectedTicket.isAutoRouted
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-purple-50 text-purple-700 border-purple-200'
                      }`}>
                        {selectedTicket.isAutoRouted ? ((!isVi ? '🤖 Auto-routed' : '🤖 Tự động phân tuyến')) : ((!isVi ? '✍️ Manual assignment' : '✍️ Phân công thủ công'))}
                      </span>
                    </div>

                    {/* Visual Path */}
                    <div className="p-2.5 bg-white rounded-xl border border-indigo-100 flex items-center gap-1.5 flex-wrap text-[11px]">
                      <span className="font-bold text-slate-500">{(!isVi ? 'Path:' : 'Đường dẫn:')}</span>
                      <span className="px-2 py-0.5 rounded bg-slate-100 font-semibold">{selectedTicket.companyName || selectedTicket.createdBy?.department || ((!isVi ? 'Enterprise' : 'Tập đoàn'))}</span>
                      <span className="text-slate-400">➔</span>
                      <span className="px-2 py-0.5 rounded bg-slate-100 font-semibold">{getCategoryLabel(selectedTicket.category, language)}</span>
                      <span className="text-slate-400">➔</span>
                      <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 font-bold">Team: {selectedTicket.team?.name || ((!isVi ? 'Unassigned' : 'Chưa gán'))}</span>
                      <span className="text-slate-400">➔</span>
                      <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-800 font-bold">Queue: {selectedTicket.queue?.name || 'Default Queue'}</span>
                      <span className="text-slate-400">➔</span>
                      <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">Assignee: {selectedTicket.assignedTo?.fullName || ((!isVi ? 'Pending pickup' : 'Chờ tiếp nhận'))}</span>
                    </div>

                    {selectedTicket.routedByRule && (
                      <div className="text-[11px] text-indigo-900 font-medium">
                        {(!isVi ? '🎯 Applied Rule:' : '🎯 Rule áp dụng:')} <strong>"{selectedTicket.routedByRule}"</strong>
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
                          <span>{(!isVi ? 'AI Technical Diagnostic' : 'Chẩn Đoán Kỹ Thuật AI (Diagnostic)')}</span>
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
                          <span className="font-bold text-[10.5px] text-purple-900">{(!isVi ? 'Initial resolution suggestion:' : 'Gợi ý xử lý ban đầu:')}</span>
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
                            <h5 className="font-bold text-slate-900 text-xs">{(!isVi ? 'Escalate / Request IT Help' : 'Nhờ Thêm IT / Cấp Trên (Escalation)')}</h5>
                            <p className="text-[10px] text-amber-800">{(!isVi ? 'Visible to IT team only' : 'Chỉ hiển thị với đội ngũ IT')}</p>
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
                            <option value="">{(!isVi ? '-- Select IT / Manager --' : '-- Chọn IT / Quản lý --')}</option>
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
                            placeholder={(!isVi ? 'Technical notes for assistance...' : 'Ghi chú kỹ thuật cần hỗ trợ...')}
                            className="flex-1 px-3 py-1.5 bg-white border border-amber-200 rounded-xl text-xs text-slate-800 outline-none focus:ring-1 focus:ring-amber-500 font-medium"
                          />
                          <button
                            type="button"
                            onClick={handleSendEscalation}
                            disabled={escalateSending || (!escalateToId && !escalateNote.trim())}
                            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer shrink-0 flex items-center gap-1"
                          >
                            {escalateSending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <span>{(!isVi ? '⚡ Send' : '⚡ Gửi')}</span>}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* ⭐ ĐÁNH GIÁ CHẤT LƯỢNG CSAT (1-Click CSAT Feedback - 👑 Enterprise - FULL WIDTH) */}
              {(selectedTicket.status === 'RESOLVED' || selectedTicket.status === 'CLOSED') && (
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-xl bg-amber-500 text-white flex items-center justify-center text-xs font-black shadow-xs">
                        ⭐
                      </div>
                      <div>
                        <h5 className="font-bold text-slate-900 text-xs">
                          {(!isVi ? 'Customer Satisfaction Survey (CSAT)' : 'Đánh Giá Chất Lượng Dịch Vụ (CSAT)')}
                        </h5>
                        <p className="text-[10px] text-slate-500">
                          {(!isVi ? 'How satisfied are you with the resolution?' : 'Bạn có hài lòng với kết quả xử lý của IT không?')}
                        </p>
                      </div>
                    </div>
                    
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
                        <span className="text-xs font-bold text-slate-700">{(!isVi ? 'Rating:' : 'Chấm điểm:')}</span>
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
                          {ratingHover || selectedRating} / 5 {(!isVi ? 'Stars' : 'Sao')}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={ratingFeedback}
                          onChange={(e) => setRatingFeedback(e.target.value)}
                          placeholder={(!isVi ? 'Optional feedback for technician...' : 'Nhận xét thêm về sự hỗ trợ (tùy chọn)...')}
                          className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:bg-white focus:ring-1 focus:ring-amber-500 font-medium"
                        />
                        <button
                          type="button"
                          disabled={submittingRating}
                          onClick={() => handleRateTicket(selectedTicket.id, selectedRating, ratingFeedback)}
                          className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer shrink-0 flex items-center gap-1"
                        >
                          {submittingRating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Star className="w-3.5 h-3.5 fill-white" />}
                          <span>{(!isVi ? 'Submit' : 'Gửi')}</span>
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
                        <span>{(!isVi ? 'Discussion & Activity History' : 'Trao Đổi & Lịch Sử Xử Lý')}</span>
                        <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-xs font-extrabold">
                          {selectedTicket.comments?.filter((c: any) => isITStaffOrAdmin || !c.isInternal).length || 0}
                        </span>
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        {(!isVi ? 'Full-width collaborative workspace between IT and Requester' : 'Không gian làm việc & trao đổi trực tiếp giữa Người dùng và Đội ngũ Kỹ thuật')}
                      </p>
                    </div>
                  </div>

                  {isITStaffOrAdmin && (
                    <span className="text-[10.5px] font-semibold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200/80 flex items-center gap-1">
                      <span>🔒</span>
                      <span className="hidden sm:inline">{(!isVi ? 'Supports internal notes' : 'Hỗ trợ ghi chú nội bộ IT')}</span>
                    </span>
                  )}
                </div>

                {/* Messages Container (Full-Width, Spacious Feed) */}
                <div className="space-y-3 min-h-[220px] max-h-[380px] overflow-y-auto p-3 sm:p-4 bg-slate-50/70 rounded-2xl border border-slate-100/90">
                  {(() => {
                    const visibleComments = selectedTicket.comments?.filter((c: any) => isITStaffOrAdmin || !c.isInternal) || [];
                    return visibleComments.length === 0 ? (
                      <div className="py-10 text-center space-y-2">
                        <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-500 mx-auto flex items-center justify-center text-xl shadow-2xs">
                          💬
                        </div>
                        <p className="text-slate-500 font-bold text-xs sm:text-sm">
                          {(!isVi ? 'No comments or updates yet.' : 'Chưa có bình luận hay trao đổi nào.')}
                        </p>
                        <p className="text-slate-400 text-xs max-w-md mx-auto">
                          {(!isVi ? 'Send a response below to start communicating with the requester or IT technician.' : 'Gửi tin nhắn hoặc phản hồi bên dưới để bắt đầu trao đổi với người yêu cầu hoặc kỹ thuật viên.')}
                        </p>
                      </div>
                    ) : (
                      visibleComments.map((c: any) => {
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
                                    {c.user?.fullName || c.user?.email || ((!isVi ? 'User' : 'Người dùng'))}
                                  </span>
                                  {isRequesterMsg && (
                                    <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-bold text-[10px] border border-blue-200">
                                      {(!isVi ? 'Requester' : 'Người gửi')}
                                    </span>
                                  )}
                                  {!isRequesterMsg && !c.isInternal && (
                                    <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-bold text-[10px] border border-indigo-200">
                                      {(!isVi ? 'IT Support' : 'Kỹ thuật IT')}
                                    </span>
                                  )}
                                  {c.isInternal && (
                                    <span className="px-2 py-0.5 bg-amber-200 text-amber-900 rounded-md font-black text-[10px] border border-amber-300 inline-flex items-center gap-1">
                                      <span>🔒</span>
                                      <span>{(!isVi ? 'IT Internal Only' : 'Nội bộ IT (Chỉ IT thấy)')}</span>
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
                                      alt={att.name || ((!isVi ? 'Image' : 'Hình ảnh'))}
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
                      placeholder={(!isVi ? "Write a response, resolution update, or paste screenshot directly (Ctrl + V)..." : "Nhập câu trả lời, tiến độ xử lý hoặc dán ảnh chụp màn hình trực tiếp (Ctrl + V)...")}
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
                        <label className="cursor-pointer px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 border border-slate-200" title={(!isVi ? 'Attach file/image' : 'Đính kèm file/ảnh')}>
                          <Paperclip className="w-4 h-4 text-blue-600" />
                          <span>{(!isVi ? 'Attach files' : 'Đính kèm tệp / ảnh')}</span>
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
                            <span>{txt('🔒 Ghi chú nội bộ (Chỉ IT thấy)', '🔒 Internal Note (IT only)', '🔒 内部メモ (ITのみ)')}</span>
                          </label>
                        )}

                        {/* ⏱️ Log Work / Spent Time (👑 Enterprise) */}
                        {isITStaffOrAdmin && (
                          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100/90 hover:bg-slate-200/80 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 transition-colors" title={(!isVi ? 'Log time spent working on this ticket' : 'Ghi nhận thời gian xử lý ticket')}>
                            <Clock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                            <span className="text-[11px] shrink-0">{(!isVi ? 'Time spent:' : 'Thời gian:')}</span>
                            <input
                              type="number"
                              min="1"
                              step="5"
                              placeholder="30"
                              value={spentMinutesInput}
                              onChange={(e) => setSpentMinutesInput(e.target.value)}
                              className="w-14 px-1.5 py-0.5 bg-white border border-slate-300 rounded-lg text-xs font-extrabold text-slate-900 text-center outline-none focus:ring-1 focus:ring-blue-500"
                            />
                            <span className="text-[10.5px] text-slate-500">{(!isVi ? 'min' : 'phút')}</span>
                            
                          </div>
                        )}

                        {/* 📢 Broadcast to Merged Tickets (👑 Enterprise) */}
                        {isITStaffOrAdmin && selectedTicket.mergedTickets && selectedTicket.mergedTickets.length > 0 && !isInternalComment && (
                          <label className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100/80 border border-indigo-200 rounded-xl text-xs font-bold text-indigo-900 cursor-pointer transition-colors" title={(!isVi ? "Broadcast this response to all merged child tickets" : "Đồng bộ phản hồi này đến toàn bộ ticket con đã gộp")}>
                            <input
                              type="checkbox"
                              checked={broadcastToMerged}
                              onChange={(e) => setBroadcastToMerged(e.target.checked)}
                              className="rounded border-indigo-300 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 cursor-pointer"
                            />
                            <span>📢 {(!isVi ? `Broadcast (${selectedTicket.mergedTickets.length})` : `Đồng bộ tới ${selectedTicket.mergedTickets.length} ticket đã gộp`)}</span>
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
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 text-xs font-bold transition-colors cursor-pointer"
                              title={(!isVi ? 'Canned Templates (Quick Reply)' : 'Mẫu câu trả lời nhanh (Canned Response)')}
                            >
                              <Zap className="w-3.5 h-3.5 text-slate-600" />
                              <span>{(!isVi ? 'Quick Reply' : 'Mẫu câu trả lời')}</span>
                              
                            </button>

                            {isCannedMenuOpen && (
                              <div className="absolute left-0 bottom-full mb-2 w-96 max-h-[32rem] overflow-y-auto bg-white rounded-2xl shadow-2xl border border-slate-200 p-3 z-50 space-y-2.5 animate-in fade-in">
                                <div className="pb-2 border-b border-slate-100 flex items-center justify-between">
                                  <div className="flex items-center gap-1.5">
                                    <span className="p-1 rounded-lg bg-amber-100 text-amber-800 font-bold text-xs">⚡</span>
                                    <span className="font-extrabold text-slate-800 text-xs">{(!isVi ? 'Canned Quick Replies' : 'Mẫu câu trả lời nhanh')}</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() => setIsCreatingCanned(!isCreatingCanned)}
                                      className="px-2 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-[10.5px] font-bold transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                                      title={(!isVi ? 'Create new canned response' : 'Tạo thêm mẫu mới')}
                                    >
                                      <span>{isCreatingCanned ? '−' : '+'}</span>
                                      <span>{isCreatingCanned ? ((!isVi ? 'Close' : 'Đóng')) : ((!isVi ? 'New' : 'Thêm mẫu'))}</span>
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
                                      <span>{(!isVi ? 'Create New Quick Reply Template' : 'Tạo thêm mẫu trả lời nhanh')}</span>
                                    </div>
                                    <div>
                                      <input
                                        type="text"
                                        required
                                        value={newCannedTitle}
                                        onChange={(e) => setNewCannedTitle(e.target.value)}
                                        placeholder={(!isVi ? 'Template title (e.g. Ask for remote access)' : 'Tiêu đề mẫu (VD: Yêu cầu mở UltraViewer)')}
                                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 outline-none focus:ring-1 focus:ring-amber-500"
                                      />
                                    </div>
                                    <div>
                                      <input
                                        type="text"
                                        value={newCannedShortcut}
                                        onChange={(e) => setNewCannedShortcut(e.target.value)}
                                        placeholder={(!isVi ? 'Shortcut (e.g. /ultra)' : 'Phím tắt (VD: /ultra)')}
                                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono text-slate-800 outline-none focus:ring-1 focus:ring-amber-500"
                                      />
                                    </div>
                                    <div>
                                      <textarea
                                        rows={3}
                                        required
                                        value={newCannedContent}
                                        onChange={(e) => setNewCannedContent(e.target.value)}
                                        placeholder={(!isVi ? 'Template content to insert into comment...' : 'Nội dung phản hồi soạn sẵn để chèn vào bình luận...')}
                                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 outline-none focus:ring-1 focus:ring-amber-500 leading-relaxed resize-none"
                                      />
                                    </div>
                                    <div className="flex items-center justify-end gap-1.5 pt-1">
                                      <button
                                        type="button"
                                        onClick={() => setIsCreatingCanned(false)}
                                        className="px-2.5 py-1 text-slate-500 hover:text-slate-700 text-xs font-medium cursor-pointer"
                                      >
                                        {(!isVi ? 'Cancel' : 'Hủy')}
                                      </button>
                                      <button
                                        type="submit"
                                        disabled={savingCanned || !newCannedTitle.trim() || !newCannedContent.trim()}
                                        className="px-3 py-1 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1 shadow-2xs cursor-pointer"
                                      >
                                        {savingCanned ? <Loader2 className="w-3 h-3 animate-spin" /> : <span>✓</span>}
                                        <span>{(!isVi ? 'Save Template' : 'Lưu mẫu')}</span>
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
                                          title={(!isVi ? 'Delete template' : 'Xóa mẫu này')}
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
                        <span>{(!isVi ? 'Send Response' : 'Gửi phản hồi')}</span>
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
                    <span className="font-bold text-slate-700 text-[11px] mr-1">{(!isVi ? 'Quick update:' : 'Cập nhật nhanh:')}</span>
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
                      <span className="text-[10.5px] font-bold text-slate-600">{(!isVi ? 'Assign:' : 'Phân công:')}</span>
                      <select
                        value={selectedTicket.assignedToId || ''}
                        onChange={(e) => handleUpdateAssignee(selectedTicket.id, e.target.value)}
                        className="bg-transparent text-xs font-bold text-blue-700 outline-none cursor-pointer"
                      >
                        <option value="">{(!isVi ? '-- Unassigned --' : '-- Chưa phân công --')}</option>
                        {itUsers.map((u) => (
                          <option key={u.id} value={u.id}>
                            👨‍💻 {u.fullName} {u.id === currentUser?.id ? ((!isVi ? '(Me)' : '(Tôi)')) : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsDetailModalOpen(false)}
                      className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl font-bold transition-colors cursor-pointer"
                    >{(!isVi ? 'Close' : 'Đóng')}</button>
                  </div>
                </>
              ) : (
                <>
                  {/* Simple Status Display for Normal User */}
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-500 font-medium">{(!isVi ? 'Processing status:' : 'Trạng thái xử lý:')}</span>
                    <span className={`px-2.5 py-1 rounded-xl text-xs font-bold border ${STATUS_MAP[selectedTicket.status]?.badge || 'bg-slate-100'}`}>
                      {STATUS_MAP[selectedTicket.status]?.label}
                    </span>
                    {selectedTicket.assignedTo && (
                      <span className="text-[11px] text-slate-600 font-semibold flex items-center gap-1 ml-2">
                        <span>{(!isVi ? '👨‍💻 IT Technician:' : '👨‍💻 Kỹ thuật viên phụ trách:')}</span>
                        <strong className="text-blue-700">{selectedTicket.assignedTo.fullName}</strong>
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsDetailModalOpen(false)}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-colors cursor-pointer shadow-xs ml-auto"
                  >{(!isVi ? 'Close' : 'Đóng')}</button>
                </>
              )}
            </div>
          </div>
        </div>
      
  );
}
