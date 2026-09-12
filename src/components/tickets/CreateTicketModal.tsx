'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import {
  LifeBuoy,
  X,
  Sparkles,
  Loader2,
  ImageIcon,
  FileText,
  Plus,
  Check,
  ChevronDown,
  Search,
  ExternalLink,
} from 'lucide-react';
import { useLanguage } from '@/lib/i18n/context';

export interface CreateTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: any;
  onSuccess?: (ticket?: any) => void;
  initialAssetId?: string;
  initialTitle?: string;
  initialCategory?: string;
  initialPriority?: string;
  initialDescription?: string;
  userAssets?: any[];
}

export default function CreateTicketModal({
  isOpen,
  onClose,
  currentUser,
  onSuccess,
  initialAssetId = '',
  initialTitle = '',
  initialCategory = 'HARDWARE',
  initialPriority = 'MEDIUM',
  initialDescription = '',
  userAssets,
}: CreateTicketModalProps) {
  const { language, t } = useLanguage();

  const isITStaffOrAdmin = useMemo(() => {
    const roleName = currentUser?.role?.name || '';
    return roleName === 'Admin' || roleName === 'IT Support' || roleName === 'Asset Manager';
  }, [currentUser]);

  // Form states
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription);
  const [category, setCategory] = useState(initialCategory);
  const [priority, setPriority] = useState(initialPriority);
  const [status, setStatus] = useState('OPEN');
  const [requesterId, setRequesterId] = useState(currentUser?.id || '');
  const [assignedToId, setAssignedToId] = useState('');
  const [assetId, setAssetId] = useState(initialAssetId);
  const [customAssetName, setCustomAssetName] = useState('');
  const [attachments, setAttachments] = useState<Array<{ url: string; name: string; size?: number; type?: string }>>([]);

  // UI & loading states
  const [submitting, setSubmitting] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [isAiAnalyzing, setIsAiAnalyzing] = useState(false);
  const [aiDiagnostic, setAiDiagnostic] = useState<any>(null);
  const [kbSuggestions, setKbSuggestions] = useState<any[]>([]);

  // Users and Assets lists
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [itUsers, setItUsers] = useState<any[]>([]);
  const [availableAssets, setAvailableAssets] = useState<any[]>(userAssets || []);
  const [isRequesterDropdownOpen, setIsRequesterDropdownOpen] = useState(false);
  const [requesterSearchTerm, setRequesterSearchTerm] = useState('');

  // Refs
  const requesterDropdownRef = useRef<HTMLDivElement>(null);
  const requesterInputRef = useRef<HTMLInputElement>(null);
  const aiDebounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastAnalyzedTextRef = useRef<string>('');
  const isPastingRef = useRef<boolean>(false);

  // Initialize or reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setTitle(initialTitle);
      setDescription(initialDescription);
      setCategory(initialCategory);
      setPriority(initialPriority);
      setStatus('OPEN');
      setRequesterId(currentUser?.id || '');
      setAssetId(initialAssetId);
      setCustomAssetName('');
      setAttachments([]);
      setAiDiagnostic(null);
      lastAnalyzedTextRef.current = '';

      if (isITStaffOrAdmin && currentUser?.id) {
        setAssignedToId(currentUser.id);
      } else {
        setAssignedToId('');
      }
    }
  }, [isOpen, initialAssetId, initialTitle, initialCategory, initialPriority, initialDescription, currentUser, isITStaffOrAdmin]);

  // Load IT users and all users if IT/Admin
  useEffect(() => {
    if (!isOpen) return;

    if (isITStaffOrAdmin) {
      fetch('/api/users?limit=200')
        .then((r) => r.json())
        .then((res) => {
          const list = res.data || res.users || [];
          setAllUsers(list);
          const itList = list.filter(
            (u: any) =>
              u.role?.name === 'Admin' ||
              u.role?.name === 'IT Support' ||
              u.role?.name === 'Asset Manager' ||
              (u.department || '').toLowerCase().includes('it') ||
              (u.department || '').toLowerCase().includes('cntt')
          );
          setItUsers(itList);
        })
        .catch(() => {});
    }

    // Load assets for requester
    loadRequesterAssets(requesterId || currentUser?.id);
  }, [isOpen, isITStaffOrAdmin, requesterId, currentUser]);

  const loadRequesterAssets = (userId?: string) => {
    if (!userId) return;
    fetch(`/api/assets?assignedToId=${userId}&limit=50`)
      .then((r) => r.json())
      .then((res) => {
        const list = res.data || res.assets || [];
        setAvailableAssets(list);
      })
      .catch(() => {
        if (userAssets && userAssets.length > 0) {
          setAvailableAssets(userAssets);
        }
      });
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (requesterDropdownRef.current && !requesterDropdownRef.current.contains(e.target as Node)) {
        setIsRequesterDropdownOpen(false);
      }
    };
    if (isRequesterDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isRequesterDropdownOpen]);

  // AI Diagnostic Trigger
  const triggerAiAnalysis = async (titleVal?: string, descVal?: string, isAuto: boolean = false) => {
    const tVal = (titleVal !== undefined ? titleVal : title).trim();
    const dVal = (descVal !== undefined ? descVal : description).trim();
    const rawText = dVal ? `${tVal}\n${dVal}` : tVal;

    if (!rawText || rawText.length < 5) {
      if (!isAuto) alert(language === 'en' ? 'Please enter a title or description before analyzing' : 'Vui lòng nhập tiêu đề hoặc mô tả sự cố trước khi bấm Phân tích AI');
      return;
    }

    if (isAuto && rawText === lastAnalyzedTextRef.current) return;

    try {
      setIsAiAnalyzing(true);
      lastAnalyzedTextRef.current = rawText;
      const res = await fetch('/api/tickets/ai-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: rawText, userId: requesterId || currentUser?.id }),
      });
      const data = await res.json();
      if (res.ok && data.success && data.data) {
        setAiDiagnostic(data.data);
        if (!isAuto && (!tVal || tVal.length < 10)) {
          setTitle(data.data.suggestedTitle || tVal);
        }
        if (data.data.category) setCategory(data.data.category);
        if (data.data.priority) setPriority(data.data.priority);
        if (data.data.matchedAssetId && !assetId) setAssetId(data.data.matchedAssetId);
      } else if (!isAuto) {
        alert(data.error || (language === 'en' ? 'AI Analysis failed' : 'Phân tích AI không thành công'));
      }
    } catch {
      if (!isAuto) alert(language === 'en' ? 'AI connection error' : 'Lỗi kết nối phân tích AI');
    } finally {
      setIsAiAnalyzing(false);
    }
  };

  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (aiDebounceTimerRef.current) clearTimeout(aiDebounceTimerRef.current);

    // Ticket Deflection: Auto-suggest KB articles
    if (val.trim().length >= 3) {
      fetch(`/api/kb?search=${encodeURIComponent(val.trim())}`)
        .then((r) => r.json())
        .then((res) => {
          if (res.success && Array.isArray(res.data)) {
            setKbSuggestions(res.data.slice(0, 3));
          }
        })
        .catch(() => {});
    } else {
      setKbSuggestions([]);
    }

    if (val.trim().length >= 6) {
      aiDebounceTimerRef.current = setTimeout(() => {
        triggerAiAnalysis(val, description, true);
      }, 700);
    }
  };

  const handleDescChange = (val: string) => {
    setDescription(val);
    if (aiDebounceTimerRef.current) clearTimeout(aiDebounceTimerRef.current);
    if (val.trim().length >= 8) {
      aiDebounceTimerRef.current = setTimeout(() => {
        triggerAiAnalysis(title, val, true);
      }, 800);
    }
  };

  // Clipboard Paste Handler for Ctrl + V screenshots
  const handlePasteImage = async (e: React.ClipboardEvent) => {
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
    formData.append('category', 'ticket');

    setUploadingFile(true);
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (res.ok && data.url) {
        setAttachments((prev) => [
          ...prev,
          { url: data.url, name: data.originalName || customName, size: file.size, type: file.type || 'image/png' },
        ]);
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
        formData.append('category', 'ticket');
        const res = await fetch('/api/upload', { method: 'POST', body: formData });
        const data = await res.json();
        if (res.ok && data.url) {
          setAttachments((prev) => [
            ...prev,
            { url: data.url, name: data.originalName || file.name, size: file.size, type: file.type },
          ]);
        } else {
          alert(data.error || (language === 'en' ? 'File upload failed' : 'Tải file thất bại'));
        }
      }
    } catch {
      alert(language === 'en' ? 'Connection error uploading files' : 'Lỗi kết nối khi tải file');
    } finally {
      setUploadingFile(false);
      e.target.value = '';
    }
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;

    try {
      setSubmitting(true);
      const res = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          category,
          priority,
          status: status || 'OPEN',
          requesterId: requesterId || currentUser?.id,
          createdById: requesterId || currentUser?.id,
          assetId: assetId || null,
          customAssetName: customAssetName?.trim() || null,
          assignedToId: assignedToId || null,
          attachmentUrls: attachments.length > 0 ? attachments : null,
          aiAnalysis: aiDiagnostic || null,
        }),
      });

      if (res.ok) {
        const newTicket = await res.json();
        onClose();
        if (onSuccess) onSuccess(newTicket);
      } else {
        const err = await res.json();
        alert(err.error || (language === 'en' ? 'Failed to create ticket' : 'Tạo ticket thất bại'));
      }
    } catch {
      alert(language === 'en' ? 'Connection error creating ticket' : 'Lỗi kết nối khi tạo ticket');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedRequesterUser = useMemo(() => {
    if (!requesterId) return currentUser;
    if (requesterId === currentUser?.id) return currentUser;
    return allUsers.find((u) => u.id === requesterId) || currentUser;
  }, [requesterId, currentUser, allUsers]);

  const filteredRequesterUsers = useMemo(() => {
    if (!requesterSearchTerm.trim()) return allUsers;
    const q = requesterSearchTerm.toLowerCase();
    return allUsers.filter(
      (u) =>
        (u.fullName || '').toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q) ||
        (u.department || '').toLowerCase().includes(q) ||
        (u.phone || '').toLowerCase().includes(q)
    );
  }, [allUsers, requesterSearchTerm]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl max-w-3xl sm:max-w-4xl w-full p-5 sm:p-6 space-y-4 border border-slate-200 max-h-[92vh] overflow-y-auto animate-in fade-in zoom-in-95">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-100 text-blue-700 rounded-xl shadow-xs">
              <LifeBuoy className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-slate-900">
                  {t('tickets.create_modal_title', 'Gửi Yêu Cầu Hỗ Trợ IT / Tạo Ticket')}
                </h3>
                <Link
                  href="/tickets"
                  onClick={onClose}
                  className="hidden sm:inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100 transition-colors"
                  title="Chuyển sang màn hình quản lý ticket tập trung"
                >
                  <span>{language === 'en' ? 'Open in Tickets' : 'Mở trang Tickets'}</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
              <p className="text-xs text-slate-500">
                {t('tickets.create_modal_subtitle', 'Hỗ trợ dán trực tiếp ảnh chụp màn hình (Ctrl + V)')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* 1. Requester Section (IT can create on behalf) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="font-bold text-slate-700 text-xs flex items-center gap-1.5">
                <span>👤</span>
                <span>{language === 'en' ? 'Requester / Affected Employee' : 'Người yêu cầu / Người gặp sự cố'}</span>
                <span className="text-rose-500">*</span>
              </label>
              {isITStaffOrAdmin && requesterId && requesterId !== currentUser?.id && (
                <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-full font-bold text-[10px] flex items-center gap-1">
                  <span>📝</span>
                  <span>{language === 'en' ? 'Creating on behalf' : 'IT đang tạo hộ người dùng'}</span>
                </span>
              )}
            </div>

            {isITStaffOrAdmin ? (
              <div className="relative" ref={requesterDropdownRef}>
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
                          ? `${language === 'en' ? 'Myself' : 'Chính tôi'} (${selectedRequesterUser?.fullName || selectedRequesterUser?.email}) [${language === 'en' ? 'Default' : 'Mặc định'}]`
                          : selectedRequesterUser?.fullName || (language === 'en' ? 'Select employee' : 'Chọn nhân viên')}
                      </p>
                      <p className="text-[10px] text-slate-400 truncate">
                        {selectedRequesterUser?.email} {selectedRequesterUser?.department ? `• ${selectedRequesterUser?.department}` : ''}
                      </p>
                    </div>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${isRequesterDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {isRequesterDropdownOpen && (
                  <div className="absolute left-0 top-full mt-1.5 w-full bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 p-2.5 space-y-2 animate-in fade-in zoom-in-95">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        ref={requesterInputRef}
                        type="text"
                        value={requesterSearchTerm}
                        onChange={(e) => setRequesterSearchTerm(e.target.value)}
                        placeholder={language === 'en' ? 'Type name, email or department...' : '🔍 Gõ tên, email hoặc phòng ban để lọc nhanh...'}
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

                    <div className="max-h-52 overflow-y-auto space-y-1 pr-1">
                      {currentUser && (
                        <button
                          type="button"
                          onClick={() => {
                            setRequesterId(currentUser.id);
                            loadRequesterAssets(currentUser.id);
                            setIsRequesterDropdownOpen(false);
                            setRequesterSearchTerm('');
                          }}
                          className={`w-full text-left p-2 rounded-xl text-xs flex items-center justify-between transition-colors cursor-pointer ${
                            requesterId === currentUser.id
                              ? 'bg-blue-600 text-white font-bold shadow-xs'
                              : 'hover:bg-blue-50/70 text-slate-800 border border-blue-100'
                          }`}
                        >
                          <div className="min-w-0 pr-2">
                            <div className="font-bold flex items-center gap-1.5 truncate">
                              <span>👤</span>
                              <span>{language === 'en' ? 'Myself' : 'Chính tôi'} ({currentUser.fullName || currentUser.email})</span>
                            </div>
                            <p className={`text-[10px] truncate ${requesterId === currentUser.id ? 'text-blue-100' : 'text-slate-400'}`}>
                              {currentUser.email} {currentUser.department ? `• ${currentUser.department}` : ''}
                            </p>
                          </div>
                          {requesterId === currentUser.id && <Check className="w-4 h-4 shrink-0" />}
                        </button>
                      )}

                      <div className="px-1 py-0.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                        <span>{language === 'en' ? 'Employee Directory' : 'Danh sách nhân viên (Tạo hộ)'}</span>
                        <span>{filteredRequesterUsers.filter((u) => u.id !== currentUser?.id).length}</span>
                      </div>

                      {filteredRequesterUsers
                        .filter((u) => u.id !== currentUser?.id)
                        .map((u) => {
                          const isSelected = requesterId === u.id;
                          return (
                            <button
                              key={u.id}
                              type="button"
                              onClick={() => {
                                setRequesterId(u.id);
                                loadRequesterAssets(u.id);
                                setIsRequesterDropdownOpen(false);
                                setRequesterSearchTerm('');
                              }}
                              className={`w-full text-left p-2 rounded-xl text-xs flex items-center justify-between transition-colors cursor-pointer ${
                                isSelected ? 'bg-blue-600 text-white font-bold shadow-xs' : 'hover:bg-slate-100 text-slate-800'
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
                        })}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 bg-blue-100 text-blue-700 rounded-lg flex items-center justify-center font-bold text-xs">
                    👤
                  </div>
                  <div>
                    <p className="font-bold text-slate-800 text-xs">{currentUser?.fullName || currentUser?.email || 'Người dùng'}</p>
                    <p className="text-[10px] text-slate-400">{currentUser?.email} {currentUser?.department ? `• ${currentUser?.department}` : ''}</p>
                  </div>
                </div>
                <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-[10px] font-bold">
                  {language === 'en' ? 'Sender' : 'Người gửi'}
                </span>
              </div>
            )}
          </div>

          {/* 2. Issue Title (Auto AI trigger on finish) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-bold text-slate-700 text-xs">
                {language === 'en' ? 'Issue / Request Title' : 'Tiêu đề sự cố / yêu cầu'} <span className="text-rose-500">*</span>
              </label>
              {isAiAnalyzing && (
                <span className="text-[10.5px] text-purple-600 font-bold animate-pulse flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-purple-600 animate-spin" />
                  <span>{language === 'en' ? 'AI auto-analyzing...' : 'AI đang tự động phân tích...'}</span>
                </span>
              )}
            </div>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              onBlur={() => triggerAiAnalysis(title, description, true)}
              placeholder={language === 'en' ? 'e.g. Computer blue screen error, cannot connect to office WiFi...' : 'VD: Máy tính bị lỗi windows, bị màn hình xanh ko sử dụng đc...'}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-slate-900 bg-white text-xs"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              🤖 <em>{language === 'en' ? 'AI will automatically detect issue category and priority once you finish typing.' : 'AI sẽ tự động nhận diện loại sự cố ngay khi bạn nhập xong tiêu đề.'}</em>
            </p>

            {/* Ticket Deflection: KB Suggestions Box */}
            {kbSuggestions.length > 0 && (
              <div className="mt-2 p-3 bg-amber-50/90 border border-amber-200 rounded-xl space-y-1.5 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 font-bold text-amber-900 text-xs">
                    <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>{language === 'en' ? 'Suggested Solutions from Knowledge Base:' : '💡 Gợi ý giải pháp tự khắc phục từ Thư viện (KB):'}</span>
                  </span>
                  <span className="text-[10px] text-amber-700 font-bold px-1.5 py-0.2 bg-amber-100 rounded-md">
                    {kbSuggestions.length} {language === 'en' ? 'articles' : 'bài viết'}
                  </span>
                </div>
                <div className="space-y-1">
                  {kbSuggestions.map((item) => (
                    <a
                      key={item.id}
                      href={`/kb?search=${encodeURIComponent(item.title)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between p-2 bg-white hover:bg-amber-100/60 rounded-lg border border-amber-100 text-xs font-semibold text-slate-800 transition-colors group"
                    >
                      <span className="truncate pr-2">📖 {item.title}</span>
                      <span className="text-[10px] text-blue-600 group-hover:underline shrink-0 flex items-center gap-0.5">
                        <span>{language === 'en' ? 'Read Guide' : 'Xem ngay'}</span>
                        <span>➔</span>
                      </span>
                    </a>
                  ))}
                </div>
                <p className="text-[10px] text-amber-700 italic">
                  {language === 'en'
                    ? 'If any of these guides resolve your problem, you can skip submitting this ticket.'
                    : 'Nếu bài viết trên đã giải quyết được sự cố, bạn có thể không cần gửi Ticket nữa để tiết kiệm thời gian.'}
                </p>
              </div>
            )}
          </div>

          {/* 3. Category & Priority */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1 text-xs">
                {language === 'en' ? 'Request Category' : 'Loại yêu cầu'}
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white font-medium text-xs cursor-pointer text-slate-800"
              >
                <option value="HARDWARE">💻 {language === 'en' ? 'Hardware' : 'Phần cứng'}</option>
                <option value="SOFTWARE">💿 {language === 'en' ? 'Software' : 'Phần mềm'}</option>
                <option value="LICENSE">🔑 {language === 'en' ? 'License' : 'License / Bản quyền'}</option>
                <option value="ACCESS_REQUEST">🛡️ {language === 'en' ? 'Access Permission' : 'Cấp quyền truy cập'}</option>
                <option value="NETWORK">🌐 {language === 'en' ? 'Network & Internet' : 'Mạng & Internet'}</option>
                <option value="OTHER">📌 {language === 'en' ? 'Other' : 'Khác'}</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1 text-xs">
                {language === 'en' ? 'Priority Level' : 'Mức độ ưu tiên'}
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white font-medium text-xs cursor-pointer text-slate-800"
              >
                <option value="LOW">🟢 {language === 'en' ? 'Low (Can wait)' : 'Thấp (Không ảnh hưởng)'}</option>
                <option value="MEDIUM">🟡 {language === 'en' ? 'Medium (Normal)' : 'Trung bình (Trong tuần)'}</option>
                <option value="HIGH">🔴 {language === 'en' ? 'High (Urgent support)' : 'Cao (Cần xử lý gấp)'}</option>
                <option value="URGENT">🔥 {language === 'en' ? 'Urgent (Work stoppage)' : 'Khẩn cấp (Dừng công việc)'}</option>
              </select>
            </div>
          </div>

          {/* 4. IT Assignee & Initial Status (Only for IT Staff / Admin) */}
          {isITStaffOrAdmin && (
            <div className="p-3 bg-gradient-to-r from-blue-50/70 via-indigo-50/50 to-slate-50 border border-blue-200/80 rounded-2xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-blue-900 flex items-center gap-1.5">
                  <span>👨‍💻</span>
                  <span>{language === 'en' ? 'IT Staff Assignment & Status Controls' : 'Dành cho Nhân sự IT (Tự động gán & Cập nhật trạng thái)'}</span>
                </span>
                <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full font-bold text-[9px]">
                  🔒 IT & Admin
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1 text-[11px]">
                    {language === 'en' ? 'Assigned IT Technician' : 'IT tiếp nhận & phụ trách'}
                  </label>
                  <select
                    value={assignedToId}
                    onChange={(e) => setAssignedToId(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-blue-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white font-semibold text-xs text-slate-900 cursor-pointer"
                  >
                    <option value="">-- {language === 'en' ? 'Auto Routing (Unassigned)' : 'Tự động phân phối (Chưa gán)'} --</option>
                    {itUsers.map((u) => {
                      const isMe = u.id === currentUser?.id;
                      return (
                        <option key={u.id} value={u.id}>
                          👨‍💻 {u.fullName} {isMe ? (language === 'en' ? '★ (Myself)' : '★ (Chính tôi)') : `(${u.role?.name || u.department || 'IT'})`}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1 text-[11px]">
                    {language === 'en' ? 'Initial Ticket Status' : 'Trạng thái xử lý ban đầu'}
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-blue-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white font-semibold text-xs text-slate-900 cursor-pointer"
                  >
                    <option value="OPEN">🟡 {language === 'en' ? 'Open (Pending)' : 'Mới tạo (Chờ xử lý)'}</option>
                    <option value="IN_PROGRESS">🔵 {language === 'en' ? 'In Progress' : 'Đang xử lý (Bắt đầu làm ngay)'}</option>
                    <option value="WAITING">🟠 {language === 'en' ? 'Waiting response / parts' : 'Chờ phản hồi / Chờ linh kiện'}</option>
                    <option value="RESOLVED">🟢 {language === 'en' ? 'Resolved on the spot' : 'Đã hoàn thành (Xong ngay tại chỗ)'}</option>
                    <option value="CLOSED">🔘 {language === 'en' ? 'Closed' : 'Đã đóng (Hoàn tất đóng ticket)'}</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* 5. Detailed Description with Ctrl + V screenshot pasting */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-bold text-slate-700 text-xs">
                {language === 'en' ? 'Detailed Description of Problem / Request' : 'Mô tả chi tiết hiện tượng / yêu cầu'} <span className="text-rose-500">*</span>
              </label>
              <button
                type="button"
                onClick={() => triggerAiAnalysis(title, description, false)}
                disabled={isAiAnalyzing || (!description.trim() && !title.trim())}
                className="px-2.5 py-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 text-white rounded-lg text-[11px] font-bold inline-flex items-center gap-1 shadow-2xs transition-all cursor-pointer"
              >
                {isAiAnalyzing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3 text-amber-300" />}
                <span>{isAiAnalyzing ? (language === 'en' ? 'Analyzing...' : 'Đang phân tích...') : (language === 'en' ? '✨ Analyze with AI' : '✨ Phân Tích Bằng AI')}</span>
              </button>
            </div>
            <textarea
              required
              rows={3}
              value={description}
              onChange={(e) => handleDescChange(e.target.value)}
              onBlur={() => triggerAiAnalysis(title, description, true)}
              onPaste={handlePasteImage}
              placeholder={language === 'en' ? 'Describe the issue details. You can take a screenshot and press Ctrl + V to paste directly here...' : 'Mô tả cụ thể triệu chứng lỗi. Bạn có thể chụp ảnh màn hình rồi bấm Ctrl + V để dán trực tiếp vào đây...'}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none font-medium bg-white text-xs text-slate-900"
            />
          </div>

          {/* 6. AI Diagnostic Output Card if triggered */}
          {aiDiagnostic && (
            <div className="p-3 bg-purple-50/80 border border-purple-200 rounded-2xl space-y-1.5 text-xs animate-in fade-in">
              <div className="flex items-center justify-between">
                <span className="font-bold text-purple-900 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                  <span>{language === 'en' ? 'AI Diagnostic Summary:' : 'AI Đã Tự Động Phân Loại:'}</span>
                </span>
                <span className="text-[10px] px-2 py-0.5 bg-purple-200 text-purple-900 rounded-full font-bold">
                  {aiDiagnostic.serviceName || 'IT Service'}
                </span>
              </div>
              <p className="text-purple-950 font-medium text-[11px] leading-relaxed">
                {aiDiagnostic.diagnosticSummary}
              </p>
              {aiDiagnostic.matchedAssetName && (
                <div className="text-[11px] text-blue-800 font-bold bg-white/80 p-1.5 rounded-lg border border-purple-200 flex items-center gap-1">
                  <span>💻</span>
                  <span>{language === 'en' ? 'Detected Device:' : 'Thiết bị nhận diện liên quan:'} <strong>{aiDiagnostic.matchedAssetName}</strong></span>
                </div>
              )}
            </div>
          )}

          {/* 7. Quick Asset Selector for User's Active Devices */}
          {availableAssets && availableAssets.length > 0 && (
            <div className="p-2.5 bg-blue-50/60 rounded-2xl border border-blue-200 space-y-1.5">
              <label className="text-[11px] font-bold text-blue-950 block">
                💻 {language === 'en' ? 'Requester Devices (Click to select quickly):' : 'Thiết bị của người yêu cầu (Bấm để chọn nhanh):'}
              </label>
              <div className="flex items-center gap-1.5 flex-wrap">
                {availableAssets.map((dev: any) => {
                  const targetAsset = dev.asset || dev;
                  const isSelected = assetId === targetAsset.id;
                  return (
                    <button
                      key={targetAsset.id}
                      type="button"
                      onClick={() => setAssetId(isSelected ? '' : targetAsset.id)}
                      className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-blue-600 text-white border-blue-600 font-bold shadow-2xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-blue-100/60'
                      }`}
                    >
                      [{targetAsset.assetTag || 'AST'}] {targetAsset.name} {targetAsset.serialNumber ? `(${targetAsset.serialNumber})` : ''}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 8. Image & File Attachment Box with Paste Hint */}
          <div className="p-3 bg-gradient-to-br from-blue-50/70 via-indigo-50/40 to-slate-50 border-2 border-dashed border-blue-200 rounded-xl space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                  <ImageIcon className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                    <span>{language === 'en' ? `Images & Attachments (${attachments.length})` : `Hình ảnh & tệp đính kèm (${attachments.length})`}</span>
                    {uploadingFile && <span className="text-[10px] text-blue-600 font-normal animate-pulse">({language === 'en' ? 'Uploading...' : '⚡ Đang tải ảnh...'})</span>}
                  </p>
                  <p className="text-[10px] text-slate-500">
                    📋 <strong>{language === 'en' ? 'Tip:' : 'Mẹo:'}</strong> {language === 'en' ? 'Press Ctrl + V to paste screenshots directly!' : 'Nhấn Ctrl + V để dán ảnh chụp màn hình trực tiếp!'}
                  </p>
                </div>
              </div>

              <label className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors shrink-0 self-start sm:self-center">
                {uploadingFile ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                <span>{uploadingFile ? (language === 'en' ? 'Uploading...' : 'Đang tải...') : (language === 'en' ? 'Select files / images' : 'Chọn file / ảnh')}</span>
                <input
                  type="file"
                  multiple
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.log,.zip,.rar"
                  onChange={handleUploadFiles}
                  className="hidden"
                  disabled={uploadingFile}
                />
              </label>
            </div>

            {/* Attachment Preview Grid */}
            {attachments.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 border-t border-blue-100">
                {attachments.map((att, idx) => {
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
                        onClick={() => setAttachments((prev) => prev.filter((_, i) => i !== idx))}
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded cursor-pointer shrink-0"
                        title={language === 'en' ? 'Delete file' : 'Xóa tệp'}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-semibold hover:bg-slate-50 transition-colors cursor-pointer text-xs"
            >
              {language === 'en' ? 'Cancel' : 'Hủy'}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs text-xs"
            >
              {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{language === 'en' ? 'Submit Support Request' : 'Gửi Yêu Cầu Hỗ Trợ'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
