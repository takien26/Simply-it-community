import { EnterpriseFeatureLock } from '@/components/common/EnterpriseFeatureLock';
'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useLanguage } from '@/lib/i18n/context';
import {
  ClipboardCheck,
  Search,
  CheckCircle2,
  AlertTriangle,
  X,
  Laptop,
  User,
  MapPin,
  Calendar,
  Building,
  RotateCcw,
  Save,
  FileSpreadsheet,
  Camera,
  Check,
  Tag,
  ShieldCheck,
  History,
  Plus,
  Play,
  CheckCheck,
  AlertOctagon,
  ArrowRight,
  Filter,
  Download,
  Upload,
  RefreshCw,
  Clock,
  Sparkles,
  Layers,
  ChevronRight,
  SlidersHorizontal,
  FileText,
  Trash2,
  HelpCircle,
  Eye,
  CameraOff,
  Maximize2,
  CheckCircle,
  ImageIcon,
  ZoomIn,
  ArrowLeft,
  ChevronDown,
  ListFilter,
  FolderCheck,
  Loader2,
  ExternalLink,
  QrCode,
  Copy,
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import QRCode from 'qrcode';

// ==================== INTERFACES & TYPES ====================
export type AuditStatus = 'PENDING' | 'MATCHED' | 'MISMATCH_LOCATION_USER' | 'DAMAGED_OR_LOST';

export interface AuditItem {
  id: string; // matches asset id
  assetTag: string;
  name: string;
  brand?: string;
  model?: string;
  serialNumber?: string;
  categoryName?: string;
  categoryIcon?: string;
  companyName?: string;

  // System State (Before Audit)
  systemUserId?: string;
  systemUserName?: string;
  systemUserDepartment?: string;
  systemLocationId?: string;
  systemLocationName?: string;
  systemCondition: string;
  systemStatus: string;

  // Actual State (Recorded during Audit)
  auditStatus: AuditStatus;
  actualUserId?: string;
  actualUserName?: string;
  actualUserDepartment?: string;
  actualLocationId?: string;
  actualLocationName?: string;
  actualCondition: string;
  actualStatus: string;
  actualNotes: string;
  actualPhotoUrl?: string | null;
  auditedAt?: string | null;
  auditedBy?: string | null;
}

export interface AuditSession {
  id: string;
  title: string;
  selectedCompanies?: string[];
  companyName?: string;
  responsiblePerson?: string;
  locationId?: string;
  categoryId?: string;
  scope?: string;
  createdAt: string;
  targetDate?: string;
  status: 'ACTIVE' | 'COMPLETED';
  notes?: string;
  totalAssets: number;
  auditedCount?: number;
  items: AuditItem[];
}

export default function AssetsAuditPage() {
  const { language, t } = useLanguage();
  const isEn = language === 'en';
  const [isEnterprise, setIsEnterprise] = useState<boolean | null>(null);
  const [activeModules, setActiveModules] = useState<string[]>([]);
  const isModActive = (mod: string) => Boolean(isEnterprise) && (activeModules.length === 0 || activeModules.includes(mod) || activeModules.includes('*'));

  const fetchLicense = () => {
    fetch('/api/license')
      .then((res) => res.json())
      .then((data) => {
        if (data && data.isEnterprise) {
          setIsEnterprise(true);
          setActiveModules(Array.isArray(data.modules) ? data.modules : []);
        } else {
          setIsEnterprise(false);
          setActiveModules([]);
        }
      })
      .catch(() => setIsEnterprise(false));
  };

  useEffect(() => {
    fetchLicense();
    const handleUpdate = () => fetchLicense();
    window.addEventListener('simply:license-updated', handleUpdate);
    return () => window.removeEventListener('simply:license-updated', handleUpdate);
  }, []);


  // Navigation mode: 'CAMPAIGNS' (list of all audit batches) vs 'WORKSPACE' (active scanning workspace)
  const [viewMode, setViewMode] = useState<'CAMPAIGNS' | 'WORKSPACE'>('CAMPAIGNS');

  // Master Data
  const [assets, setAssets] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [companies, setCompanies] = useState<string[]>([
    'Công ty Cổ phần Tập đoàn ABC',
    'Công ty TNHH MTV Công Nghệ ABC',
    'Chi nhánh Miền Bắc (Hà Nội)',
    'Chi nhánh Miền Nam (TP.HCM)',
  ]);
  const [loadingMasterData, setLoadingMasterData] = useState(true);

  // Server IP & Settings integration for mobile camera scanning on port 3443
  const [serverUrlSetting, setServerUrlSetting] = useState('');
  const [mobileHost, setMobileHost] = useState('');
  const [generatedMobileUrl, setGeneratedMobileUrl] = useState('');
  const [isSavingServerSetting, setIsSavingServerSetting] = useState(false);
  const [savedSettingToast, setSavedSettingToast] = useState(false);

  // Campaigns list from API
  const [campaigns, setCampaigns] = useState<AuditSession[]>([]);
  const [campaignsLoading, setCampaignsLoading] = useState(true);
  const [campaignSearch, setCampaignSearch] = useState('');
  const [campaignStatusFilter, setCampaignStatusFilter] = useState<'ALL' | 'ACTIVE' | 'COMPLETED'>('ALL');

  // Active Audit Session
  const [currentSession, setCurrentSession] = useState<AuditSession | null>(null);

  // Modals & Sheets
  const [isNewSessionModalOpen, setIsNewSessionModalOpen] = useState(false);
  const [isFinalizeModalOpen, setIsFinalizeModalOpen] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareQrDataUrl, setShareQrDataUrl] = useState('');
  const [copiedShareLink, setCopiedShareLink] = useState(false);

  // Photo Lightbox Modal
  const [lightboxPhotoUrl, setLightboxPhotoUrl] = useState<string | null>(null);
  const [lightboxItem, setLightboxItem] = useState<AuditItem | null>(null);

  // New Session Form State
  const [newSessionTitle, setNewSessionTitle] = useState('Đợt kiểm kê tài sản Q3/2026');
  const [newSessionTargetDate, setNewSessionTargetDate] = useState(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [newSessionCompanies, setNewSessionCompanies] = useState<string[]>([]);
  const [newSessionLocationId, setNewSessionLocationId] = useState('ALL');
  const [newSessionCategoryId, setNewSessionCategoryId] = useState('ALL');
  const [newSessionNotes, setNewSessionNotes] = useState('Kiểm tra đối soát toàn bộ thiết bị văn phòng, laptop nhân sự.');
  const [newSessionResponsible, setNewSessionResponsible] = useState('IT Lead / Quản trị viên');
  const [isSubmittingNewCampaign, setIsSubmittingNewCampaign] = useState(false);

  // Scanner & Active Audit Card State
  const [searchQuery, setSearchQuery] = useState('');
  const [activeAuditingItem, setActiveAuditingItem] = useState<AuditItem | null>(null);

  // Audit Verification Card Form
  const [cardStatus, setCardStatus] = useState<AuditStatus>('MATCHED');
  const [cardActualUserId, setCardActualUserId] = useState('');
  const [cardActualLocationId, setCardActualLocationId] = useState('');
  const [cardActualCondition, setCardActualCondition] = useState('GOOD');
  const [cardActualNotes, setCardActualNotes] = useState('');
  const [cardPhotoUrl, setCardPhotoUrl] = useState<string | null>(null);
  const [isSavingAuditItem, setIsSavingAuditItem] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  // Searchable User and Location Dropdown State
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [userSearchText, setUserSearchText] = useState('');
  const [locationDropdownOpen, setLocationDropdownOpen] = useState(false);
  const [locationSearchText, setLocationSearchText] = useState('');
  const [isDraggingPhoto, setIsDraggingPhoto] = useState(false);

  // ESC key listener to close active modals & dropdowns
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (lightboxPhotoUrl) setLightboxPhotoUrl(null);
        else if (isShareModalOpen) setIsShareModalOpen(false);
        else if (isFinalizeModalOpen) setIsFinalizeModalOpen(false);
        else if (isNewSessionModalOpen) setIsNewSessionModalOpen(false);
        else if (userDropdownOpen) setUserDropdownOpen(false);
        else if (locationDropdownOpen) setLocationDropdownOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxPhotoUrl, isShareModalOpen, isFinalizeModalOpen, isNewSessionModalOpen, userDropdownOpen, locationDropdownOpen]);

  // Table Filter & Search
  const [tableFilterTab, setTableFilterTab] = useState<'ALL' | 'MATCHED' | 'MISMATCH' | 'PENDING'>('ALL');
  const [tableSearch, setTableSearch] = useState('');
  const [tableCompanyFilter, setTableCompanyFilter] = useState('');

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const userDropdownRef = useRef<HTMLDivElement>(null);
  const locationDropdownRef = useRef<HTMLDivElement>(null);

  // Helper to extract hostname from any URL string
  const extractHostname = (urlStr: string) => {
    if (!urlStr || !urlStr.trim()) return '';
    try {
      let clean = urlStr.trim();
      if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
        clean = 'http://' + clean;
      }
      const parsed = new URL(clean);
      return parsed.hostname || '';
    } catch {
      return urlStr.trim().replace(/^https?:\/\//, '').split(':')[0].split('/')[0] || '';
    }
  };

  // Helper to build full mobile audit URL (HTTPS & Port 3443)
  const resolveMobileUrl = (sessionId: string, targetHost?: string) => {
    let host = targetHost !== undefined ? targetHost.trim() : (mobileHost.trim() || '');

    // 1. If not explicitly specified, try to parse from serverUrlSetting
    if (!host && serverUrlSetting.trim()) {
      host = extractHostname(serverUrlSetting);
    }

    // 2. If host is still empty or localhost, fallback to current window location hostname if on LAN
    if ((!host || host === 'localhost' || host === '127.0.0.1') && typeof window !== 'undefined' && window.location.hostname) {
      if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
        host = window.location.hostname;
      }
    }

    // 3. Fallback to window.location.hostname or localhost
    if (!host) {
      host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
    }

    // Default port is fixed to 3443 with HTTPS as requested
    return `https://${host}:3443/assets/audit?session=${sessionId}`;
  };

  // Helper to generate QR data URL
  const generateAndSetQr = async (url: string) => {
    try {
      const qrData = await QRCode.toDataURL(url, { width: 300, margin: 2 });
      setShareQrDataUrl(qrData);
    } catch (e) {
      console.error('Failed to generate QR code for mobile share:', e);
    }
  };

  // Close dropdowns on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (userDropdownRef.current && !userDropdownRef.current.contains(e.target as Node)) {
        setUserDropdownOpen(false);
      }
      if (locationDropdownRef.current && !locationDropdownRef.current.contains(e.target as Node)) {
        setLocationDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Global Clipboard Paste (Ctrl+V) listener for quick condition photo addition
  useEffect(() => {
    const handleWindowPaste = (e: ClipboardEvent) => {
      if (!activeAuditingItem) return;
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            e.preventDefault();
            uploadPhotoFile(file);
            break;
          }
        }
      }
    };
    window.addEventListener('paste', handleWindowPaste);
    return () => window.removeEventListener('paste', handleWindowPaste);
  }, [activeAuditingItem]);

  // ==================== LOAD MASTER DATA & SETTINGS ====================
  const loadMasterData = async () => {
    setLoadingMasterData(true);
    try {
      const [assetsRes, locationsRes, categoriesRes, usersRes, companiesRes, settingsRes] = await Promise.all([
        fetch('/api/assets?pageSize=500').then((r) => r.json()).catch(() => ({ assets: [] })),
        fetch('/api/locations').then((r) => r.json()).catch(() => ({ data: [] })),
        fetch('/api/categories').then((r) => r.json()).catch(() => ({ data: [] })),
        fetch('/api/users').then((r) => r.json()).catch(() => ({ data: [] })),
        fetch('/api/companies').then((r) => r.json()).catch(() => ({ data: [] })),
        fetch('/api/settings').then((r) => r.json()).catch(() => ({ data: [] })),
      ]);

      if (assetsRes.success || assetsRes.assets) {
        setAssets(assetsRes.assets || assetsRes.data || []);
      }
      if (locationsRes.success || locationsRes.data) {
        setLocations(locationsRes.data || locationsRes.locations || []);
      }
      if (categoriesRes.success || categoriesRes.data) {
        setCategories(categoriesRes.data || categoriesRes.categories || []);
      }
      if (usersRes.success || usersRes.data) {
        setUsers(usersRes.data || usersRes.users || []);
      }
      if (companiesRes.success && Array.isArray(companiesRes.data) && companiesRes.data.length > 0) {
        setCompanies(companiesRes.data);
      }
      if (settingsRes.success && Array.isArray(settingsRes.data)) {
        const sUrl = settingsRes.data.find((s: any) => s.key === 'app.server_url')?.value;
        if (sUrl && typeof sUrl === 'string') {
          setServerUrlSetting(sUrl);
          const parsedHost = extractHostname(sUrl);
          if (parsedHost) {
            setMobileHost(parsedHost);
          }
        }
      }
    } catch (error) {
      console.error('Failed to load audit master data:', error);
    } finally {
      setLoadingMasterData(false);
    }
  };

  // ==================== LOAD CAMPAIGNS ====================
  const loadCampaigns = async () => {
    setCampaignsLoading(true);
    try {
      const res = await fetch('/api/audit-campaigns');
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setCampaigns(data.data);
        // If current session is set, refresh it from updated campaign list
        if (currentSession) {
          const matched = data.data.find((c: AuditSession) => c.id === currentSession.id);
          if (matched) {
            setCurrentSession(matched);
          }
        }
      }
    } catch (error) {
      console.error('Failed to load audit campaigns:', error);
    } finally {
      setCampaignsLoading(false);
    }
  };

  useEffect(() => {
    loadMasterData();
    loadCampaigns();

    // Check Local Storage for active session
    const saved = localStorage.getItem('simply_it_current_audit_session');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.id) {
          setCurrentSession(parsed);
          // If query param specifies session, auto-open workspace
          const params = new URLSearchParams(window.location.search);
          if (params.get('session') || params.get('campaignId')) {
            setViewMode('WORKSPACE');
          }
        }
      } catch {
        console.error('Failed to parse saved audit session');
      }
    }
  }, []);

  // Sync session back to localStorage
  useEffect(() => {
    if (currentSession) {
      localStorage.setItem('simply_it_current_audit_session', JSON.stringify(currentSession));
    }
  }, [currentSession]);

  // ==================== METRICS ====================
  const metrics = useMemo(() => {
    if (!currentSession || !currentSession.items) {
      return { total: 0, audited: 0, remaining: 0, mismatches: 0, percent: 0, matched: 0, damaged: 0 };
    }

    const total = currentSession.items.length;
    const audited = currentSession.items.filter((i) => i.auditStatus !== 'PENDING').length;
    const remaining = total - audited;
    const matched = currentSession.items.filter((i) => i.auditStatus === 'MATCHED').length;
    const mismatches = currentSession.items.filter(
      (i) => i.auditStatus === 'MISMATCH_LOCATION_USER' || i.auditStatus === 'DAMAGED_OR_LOST'
    ).length;
    const damaged = currentSession.items.filter((i) => i.auditStatus === 'DAMAGED_OR_LOST').length;
    const percent = total > 0 ? Math.round((audited / total) * 100) : 0;

    return { total, audited, remaining, mismatches, percent, matched, damaged };
  }, [currentSession]);

  // Overall campaign metrics across all campaigns
  const overallCampaignMetrics = useMemo(() => {
    const totalCampaigns = campaigns.length;
    const activeCampaigns = campaigns.filter((c) => c.status === 'ACTIVE').length;
    const completedCampaigns = campaigns.filter((c) => c.status === 'COMPLETED').length;
    const totalAuditedAssets = campaigns.reduce((acc, c) => acc + (c.auditedCount || 0), 0);

    return { totalCampaigns, activeCampaigns, completedCampaigns, totalAuditedAssets };
  }, [campaigns]);

  // Filtered campaigns for list view
  const filteredCampaigns = useMemo(() => {
    return campaigns.filter((c) => {
      // Status filter
      if (campaignStatusFilter !== 'ALL' && c.status !== campaignStatusFilter) {
        return false;
      }
      // Search query
      if (campaignSearch.trim()) {
        const q = campaignSearch.toLowerCase();
        const matchTitle = c.title?.toLowerCase().includes(q);
        const matchResp = c.responsiblePerson?.toLowerCase().includes(q);
        const matchNotes = c.notes?.toLowerCase().includes(q);
        const matchComp = c.companyName?.toLowerCase().includes(q) || c.selectedCompanies?.some((sc) => sc.toLowerCase().includes(q));
        if (!matchTitle && !matchResp && !matchNotes && !matchComp) return false;
      }
      return true;
    });
  }, [campaigns, campaignStatusFilter, campaignSearch]);

  // Filtered users for searchable dropdown
  const filteredDropdownUsers = useMemo(() => {
    if (!userSearchText.trim()) return users.slice(0, 30);
    const q = userSearchText.toLowerCase();
    return users.filter(
      (u) =>
        u.fullName?.toLowerCase().includes(q) ||
        u.department?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q)
    ).slice(0, 30);
  }, [users, userSearchText]);

  // Filtered locations for searchable dropdown
  const filteredDropdownLocations = useMemo(() => {
    if (!locationSearchText.trim()) return locations.slice(0, 30);
    const q = locationSearchText.toLowerCase();
    return locations.filter(
      (loc) =>
        loc.name?.toLowerCase().includes(q) ||
        loc.building?.toLowerCase().includes(q) ||
        loc.floor?.toLowerCase().includes(q)
    ).slice(0, 30);
  }, [locations, locationSearchText]);

  // ==================== CREATE NEW CAMPAIGN ====================
  const handleStartNewCampaign = async () => {
    if (!newSessionTitle.trim()) {
      alert('Vui lòng nhập tên đợt kiểm kê');
      return;
    }

    setIsSubmittingNewCampaign(true);
    try {
      const selectedScope = newSessionCompanies.length > 0 ? newSessionCompanies : ['ALL'];

      const res = await fetch('/api/audit-campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newSessionTitle.trim(),
          companyNames: selectedScope,
          locationId: newSessionLocationId,
          categoryId: newSessionCategoryId,
          targetDate: newSessionTargetDate,
          responsiblePerson: newSessionResponsible,
          notes: newSessionNotes,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Lỗi khởi tạo đợt kiểm kê');
      }

      const newCampaign: AuditSession = data.data;

      // Update state
      setCampaigns((prev) => [newCampaign, ...prev]);
      setCurrentSession(newCampaign);
      setIsNewSessionModalOpen(false);
      setViewMode('WORKSPACE');

      // Generate Share QR pointing to HTTPS:3443
      try {
        const shareUrl = resolveMobileUrl(newCampaign.id);
        setGeneratedMobileUrl(shareUrl);
        await generateAndSetQr(shareUrl);
      } catch (e) {
        console.error('Failed to generate QR code for mobile share:', e);
      }
    } catch (error: any) {
      console.error('Create campaign error:', error);
      alert(error.message || 'Không thể tạo đợt kiểm kê. Vui lòng thử lại.');
    } finally {
      setIsSubmittingNewCampaign(false);
    }
  };

  // ==================== DELETE CAMPAIGN ====================
  const handleDeleteCampaign = async (campaignId: string, title: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Bạn có chắc chắn muốn xóa đợt kiểm kê "${title}" không? Hành động này không thể hoàn tác.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/audit-campaigns/${campaignId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setCampaigns((prev) => prev.filter((c) => c.id !== campaignId));
        if (currentSession?.id === campaignId) {
          setCurrentSession(null);
          localStorage.removeItem('simply_it_current_audit_session');
          setViewMode('CAMPAIGNS');
        }
      } else {
        alert(data.error || 'Lỗi khi xóa đợt kiểm kê');
      }
    } catch (err) {
      console.error('Delete campaign error:', err);
      alert('Không thể kết nối đến máy chủ để xóa');
    }
  };

  // ==================== OPEN CAMPAIGN WORKSPACE ====================
  const handleOpenCampaignWorkspace = async (campaign: AuditSession) => {
    setCurrentSession(campaign);
    setViewMode('WORKSPACE');
    setActiveAuditingItem(null);
    setSearchQuery('');

    // Fetch fresh state from API
    try {
      const res = await fetch(`/api/audit-campaigns/${campaign.id}`);
      const data = await res.json();
      if (data.success && data.data) {
        setCurrentSession(data.data);
      }
    } catch {}
  };

  // ==================== SELECT ASSET FOR AUDIT ====================
  const handleSelectAssetForAudit = (item: AuditItem) => {
    setActiveAuditingItem(item);
    setCardStatus(item.auditStatus === 'PENDING' ? 'MATCHED' : item.auditStatus);
    setCardActualUserId(item.actualUserId || item.systemUserId || '');
    setCardActualLocationId(item.actualLocationId || item.systemLocationId || '');
    setCardActualCondition(item.actualCondition || item.systemCondition || 'GOOD');
    setCardActualNotes(item.actualNotes || '');
    setCardPhotoUrl(item.actualPhotoUrl || null);
    setIsCameraActive(false);
    setUserDropdownOpen(false);
    setLocationDropdownOpen(false);
  };

  // ==================== SEARCH / SCAN DISPATCHER ====================
  const handleSearchOrScan = (code: string) => {
    if (!currentSession || !code.trim()) return;
    const q = code.trim().toLowerCase();

    // Clean if URL
    let clean = q;
    if (clean.includes('/assets/')) {
      clean = clean.split('/assets/')[1].split('?')[0].split('/')[0];
    }

    const found = currentSession.items.find(
      (i) =>
        i.assetTag.toLowerCase() === clean ||
        (i.serialNumber && i.serialNumber.toLowerCase() === clean) ||
        i.id.toLowerCase() === clean ||
        i.name.toLowerCase().includes(clean)
    );

    if (found) {
      handleSelectAssetForAudit(found);
      setSearchQuery('');
    } else {
      alert(`Không tìm thấy thiết bị mang mã [${code}] trong đợt kiểm kê này! Vui lòng kiểm tra lại.`);
    }
  };

  // ==================== UPLOAD CONDITION PHOTO (FILE/BLOB) ====================
  const uploadPhotoFile = async (file: File) => {
    if (!file || !file.type.startsWith('image/')) {
      alert('Vui lòng chỉ tải lên hoặc dán tệp hình ảnh (JPG, PNG, WebP, GIF...)');
      return;
    }
    setIsUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('category', 'audit_photo');

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (res.ok && data.success && data.url) {
        setCardPhotoUrl(data.url);
      } else {
        alert(data.error || 'Không thể tải ảnh lên');
      }
    } catch (err) {
      console.error('Condition photo upload error:', err);
      alert('Lỗi kết nối khi tải ảnh hiện trạng');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleUploadConditionPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadPhotoFile(file);
    }
    if (e.target) e.target.value = '';
  };

  // ==================== SAVE VERIFICATION RESULT ====================
  const handleSaveAndNext = async () => {
    if (!currentSession || !activeAuditingItem) return;
    setIsSavingAuditItem(true);

    const actualUserObj = users.find((u) => u.id === cardActualUserId);
    const actualLocObj = locations.find((l) => l.id === cardActualLocationId);

    const updatedItem: AuditItem = {
      ...activeAuditingItem,
      auditStatus: cardStatus,
      actualUserId: cardActualUserId || undefined,
      actualUserName: actualUserObj?.fullName || (cardActualUserId ? 'Nhân sự' : 'Chưa cấp phát (Trong kho)'),
      actualUserDepartment: actualUserObj?.department || '',
      actualLocationId: cardActualLocationId || undefined,
      actualLocationName: actualLocObj?.name || 'Kho thiết bị IT',
      actualCondition: cardActualCondition,
      actualNotes: cardActualNotes,
      actualPhotoUrl: cardPhotoUrl,
      auditedAt: new Date().toISOString(),
      auditedBy: 'KTV Kiểm kê',
    };

    const nextItems = currentSession.items.map((it) => (it.id === updatedItem.id ? updatedItem : it));
    const nextAuditedCount = nextItems.filter((i) => i.auditStatus !== 'PENDING').length;

    const nextSession: AuditSession = {
      ...currentSession,
      items: nextItems,
      auditedCount: nextAuditedCount,
    };

    setCurrentSession(nextSession);

    // Save item verification directly to backend API
    try {
      await fetch(`/api/audit-campaigns/${currentSession.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'VERIFY_ITEM',
          itemUpdate: {
            assetId: updatedItem.id,
            assetTag: updatedItem.assetTag,
            auditStatus: updatedItem.auditStatus,
            actualUserId: updatedItem.actualUserId,
            actualUserName: updatedItem.actualUserName,
            actualLocationId: updatedItem.actualLocationId,
            actualLocationName: updatedItem.actualLocationName,
            actualCondition: updatedItem.actualCondition,
            actualNotes: updatedItem.actualNotes,
            actualPhotoUrl: updatedItem.actualPhotoUrl,
          },
        }),
      });

      // Update campaigns in-memory list
      setCampaigns((prev) =>
        prev.map((c) => (c.id === currentSession.id ? { ...c, auditedCount: nextAuditedCount, items: nextItems } : c))
      );
    } catch (err) {
      console.warn('Backend sync warning (saved locally):', err);
    }

    setIsSavingAuditItem(false);
    setActiveAuditingItem(null);
    setSearchQuery('');

    // Focus back on search input
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 100);
  };

  // ==================== CAMERA QR SCANNER TOGGLE ====================
  const toggleCamera = async () => {
    if (isCameraActive) {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
      }
      setIsCameraActive(false);
    } else {
      setIsCameraActive(true);
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment' },
          });
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play();
          }
        }
      } catch (err) {
        console.warn('Camera access error:', err);
      }
    }
  };

  // ==================== FINALIZE & SYNC TO MASTER DATABASE ====================
  const handleFinalizeAudit = async () => {
    if (!currentSession) return;

    try {
      // 1. Sync mismatched items to Asset table in database
      const changedItems = currentSession.items.filter(
        (i) => i.auditStatus === 'MATCHED' || i.auditStatus === 'MISMATCH_LOCATION_USER' || i.auditStatus === 'DAMAGED_OR_LOST'
      );

      for (const item of changedItems) {
        await fetch(`/api/assets/${item.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            condition: item.actualCondition,
            locationId: item.actualLocationId || null,
            notes: `[Kiểm kê ${new Date().toLocaleDateString('vi-VN')}]: ${item.actualNotes || 'Đã đối soát thực tế'}`,
          }),
        }).catch(() => {});
      }

      // 2. Call FINALIZE action on audit campaign
      await fetch(`/api/audit-campaigns/${currentSession.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'FINALIZE',
        }),
      }).catch(() => {});

      const finalizedSession: AuditSession = {
        ...currentSession,
        status: 'COMPLETED',
      };

      setCurrentSession(finalizedSession);
      setCampaigns((prev) => prev.map((c) => (c.id === currentSession.id ? finalizedSession : c)));

      setIsFinalizeModalOpen(false);
      alert('🎉 Đã chốt đợt kiểm kê thành công! Dữ liệu tình trạng, ảnh hiện trạng và vị trí thực tế đã được lưu vào hệ thống.');
    } catch (error) {
      console.error('Finalize audit failed:', error);
      alert('Chốt đợt kiểm kê thất bại. Vui lòng thử lại.');
    }
  };

  // ==================== EXPORT EXCEL / CSV REPORT ====================
  const handleExportReport = () => {
    if (!currentSession || currentSession.items.length === 0) return;

    let csv = '\uFEFFMã Tag,Tên Thiết Bị,Công Ty,Serial,Người Dùng Hệ Thống,Người Dùng Thực Tế,Vị Trí Hệ Thống,Vị Trí Thực Tế,Tình Trạng,Trạng Thái Đối Soát,Ảnh Hiện Trạng,Thời Gian Kiểm Kê,Ghi Chú Thực Tế\n';

    currentSession.items.forEach((item) => {
      const statusLabel =
        item.auditStatus === 'MATCHED'
          ? 'KHỚP (OK)'
          : item.auditStatus === 'MISMATCH_LOCATION_USER'
          ? 'SAI LỆCH (Vị trí / Người dùng)'
          : item.auditStatus === 'DAMAGED_OR_LOST'
          ? 'BÁO HỎNG / THẤT THOÁT'
          : 'CHƯA KIỂM';

      const photoLink = item.actualPhotoUrl ? (typeof window !== 'undefined' ? window.location.origin + item.actualPhotoUrl : item.actualPhotoUrl) : '';

      csv += `"${item.assetTag}","${item.name}","${item.companyName || ''}","${item.serialNumber || ''}","${item.systemUserName || ''}","${item.actualUserName || ''}","${item.systemLocationName || ''}","${item.actualLocationName || ''}","${item.actualCondition}","${statusLabel}","${photoLink}","${item.auditedAt ? new Date(item.auditedAt).toLocaleString('vi-VN') : ''}","${item.actualNotes || ''}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Bao-Cao-Kiem-Ke-${currentSession.title.replace(/[\s/]/g, '-')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // ==================== OPEN MOBILE SHARE MODAL ====================
  const openShareModal = async (hostOverride?: string) => {
    if (!currentSession) return;
    const initialHost = hostOverride !== undefined
      ? hostOverride
      : (mobileHost || extractHostname(serverUrlSetting) || (typeof window !== 'undefined' ? window.location.hostname : 'localhost'));
    setMobileHost(initialHost);
    const url = resolveMobileUrl(currentSession.id, initialHost);
    setGeneratedMobileUrl(url);
    await generateAndSetQr(url);
    setIsShareModalOpen(true);
  };

  // Helper to save chosen IP back into app.server_url in Settings
  const handleSaveHostToSettings = async () => {
    if (!mobileHost.trim()) return;
    setIsSavingServerSetting(true);
    try {
      const newServerUrl = `http://${mobileHost.trim()}:3000`;
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'app.server_url', value: newServerUrl }),
      });
      if (res.ok) {
        setServerUrlSetting(newServerUrl);
        setSavedSettingToast(true);
        setTimeout(() => setSavedSettingToast(false), 3000);
      }
    } catch (e) {
      console.error('Save server_url error:', e);
    } finally {
      setIsSavingServerSetting(false);
    }
  };

  // Filtered items in reconciliation table
  const displayItems = useMemo(() => {
    if (!currentSession) return [];

    return currentSession.items.filter((item) => {
      // Tab Filter
      if (tableFilterTab === 'MATCHED' && item.auditStatus !== 'MATCHED') return false;
      if (tableFilterTab === 'MISMATCH' && item.auditStatus !== 'MISMATCH_LOCATION_USER' && item.auditStatus !== 'DAMAGED_OR_LOST') return false;
      if (tableFilterTab === 'PENDING' && item.auditStatus !== 'PENDING') return false;

      // Company Filter
      if (tableCompanyFilter && item.companyName !== tableCompanyFilter) return false;

      // Search query
      if (tableSearch.trim()) {
        const s = tableSearch.toLowerCase();
        return (
          item.assetTag.toLowerCase().includes(s) ||
          item.name.toLowerCase().includes(s) ||
          (item.serialNumber && item.serialNumber.toLowerCase().includes(s)) ||
          (item.systemUserName && item.systemUserName.toLowerCase().includes(s)) ||
          (item.actualUserName && item.actualUserName.toLowerCase().includes(s))
        );
      }

      return true;
    });
  }, [currentSession, tableFilterTab, tableCompanyFilter, tableSearch]);

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Hidden File Input for Condition Photo Capture */}
      <input
        type="file"
        ref={photoInputRef}
        accept="image/*"
        capture="environment"
        onChange={handleUploadConditionPhoto}
        className="hidden"
      />

      {/* ==================== 1. MAIN HEADER & SWITCH BAR ==================== */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="p-2 bg-gradient-to-tr from-blue-600 to-indigo-600 text-white rounded-2xl shadow-xs">
              <ClipboardCheck className="w-5 h-5" />
            </span>
            <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
              {isEn ? 'Asset Audit & Physical Inventory' : 'Quản Lý & Kiểm Kê Tài Sản'}
            </h1>

            {/* View Mode Pills */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 ml-2">
              <button
                type="button"
                onClick={() => setViewMode('CAMPAIGNS')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  viewMode === 'CAMPAIGNS'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FolderCheck className="w-3.5 h-3.5 text-indigo-600" />
                <span>{isEn ? 'Campaigns' : 'Danh Sách Đợt'} ({campaigns.length})</span>
              </button>
              {currentSession && (
                <button
                  type="button"
                  onClick={() => setViewMode('WORKSPACE')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    viewMode === 'WORKSPACE'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Camera className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{isEn ? 'Active Workspace' : 'Không Gian Quét Đang Mở'}</span>
                </button>
              )}
            </div>
          </div>
          <p className="text-xs text-slate-500">
            {isEn ? 'Manage inventory campaigns, capture physical condition photos, camera QR scanning & automatic reconciliation.' : 'Quản lý danh sách các đợt kiểm kê, chụp ảnh hiện trạng thực tế, quét QR camera & đối soát sai lệch tự động.'}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {viewMode === 'WORKSPACE' && (
            <button
              type="button"
              onClick={() => setViewMode('CAMPAIGNS')}
              className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold border border-slate-200 shadow-xs flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
            >
              <ArrowLeft className="w-4 h-4 text-slate-500" />
              <span>&larr; {isEn ? 'All Campaigns' : 'Tất Cả Các Đợt'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              setNewSessionCompanies(companies);
              setIsNewSessionModalOpen(true);
            }}
            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-2 cursor-pointer transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>{isEn ? '+ New Audit Campaign' : 'Tạo Đợt Kiểm Kê Mới'}</span>
          </button>

          {viewMode === 'WORKSPACE' && currentSession && (
            <>
              <button
                type="button"
                onClick={() => openShareModal()}
                className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold border border-indigo-200 flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
                title="Mở link kiểm kê trên điện thoại qua cổng HTTPS 3443 để sử dụng Camera"
              >
                <QrCode className="w-4 h-4 text-indigo-600" />
                <span>{isEn ? '📱 Mobile Scanner (Port 3443)' : '📱 Mở Trên Di Động (Port 3443)'}</span>
              </button>
              <button
                type="button"
                onClick={handleExportReport}
                className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold border border-slate-200 shadow-xs flex items-center gap-1.5 cursor-pointer transition-all"
              >
                <Download className="w-4 h-4 text-emerald-600" />
                <span>Xuất Báo Cáo</span>
              </button>

              {currentSession.status === 'ACTIVE' && (
                <button
                  type="button"
                  onClick={() => setIsFinalizeModalOpen(true)}
                  className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-2 cursor-pointer transition-all active:scale-95"
                >
                  <CheckCheck className="w-4 h-4" />
                  <span>Chốt Đợt Kiểm Kê</span>
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ==================== VIEW 1: CAMPAIGNS LIST & SEARCH ==================== */}
      {/* ========================================================================= */}
      {viewMode === 'CAMPAIGNS' && (
        <div className="space-y-5">
          {/* Active Campaign Banner (if any) */}
          {currentSession && (
            <div className="bg-gradient-to-r from-blue-50 via-indigo-50/50 to-slate-50 p-4 sm:p-5 rounded-2xl border border-indigo-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold text-base shadow-xs shrink-0 animate-pulse">
                  ⚡
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-sm sm:text-base text-slate-900">
                      Đang thực hiện kiểm kê: {currentSession.title}
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                      {currentSession.status === 'ACTIVE' ? 'Đang mở' : 'Đã chốt'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Tiến độ: <strong className="text-slate-900">{metrics.audited}/{metrics.total}</strong> thiết bị ({metrics.percent}%) • Phụ trách: {currentSession.responsiblePerson || 'KTV IT'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleOpenCampaignWorkspace(currentSession)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <span>Tiếp Tục Quét &rarr;</span>
              </button>
            </div>
          )}

          {/* Quick Metrics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase">Tổng số đợt</span>
                <Layers className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-slate-900 font-mono">{overallCampaignMetrics.totalCampaigns}</span>
                <span className="text-xs text-slate-400">đợt lưu</span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-600 uppercase">Đang diễn ra</span>
                <Clock className="w-4 h-4 text-amber-600" />
              </div>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-amber-600 font-mono">{overallCampaignMetrics.activeCampaigns}</span>
                <span className="text-xs text-amber-600/80">đang kiểm</span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-600 uppercase">Đã hoàn thành</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-emerald-600 font-mono">{overallCampaignMetrics.completedCampaigns}</span>
                <span className="text-xs text-emerald-600/80">đã chốt</span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-600 uppercase">Tổng máy đã kiểm</span>
                <Laptop className="w-4 h-4 text-blue-600" />
              </div>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-blue-600 font-mono">{overallCampaignMetrics.totalAuditedAssets}</span>
                <span className="text-xs text-blue-600/80">thiết bị</span>
              </div>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative w-full md:w-96">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Tìm kiếm đợt kiểm kê theo tên, người phụ trách, ghi chú..."
                value={campaignSearch}
                onChange={(e) => setCampaignSearch(e.target.value)}
                className="w-full pl-10 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 placeholder:text-slate-400 outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
              />
              {campaignSearch && (
                <button
                  type="button"
                  onClick={() => setCampaignSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 shrink-0 w-full md:w-auto overflow-x-auto">
              <button
                type="button"
                onClick={() => setCampaignStatusFilter('ALL')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                  campaignStatusFilter === 'ALL'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Tất cả ({campaigns.length})
              </button>
              <button
                type="button"
                onClick={() => setCampaignStatusFilter('ACTIVE')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                  campaignStatusFilter === 'ACTIVE'
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                🟢 Đang thực hiện ({campaigns.filter((c) => c.status === 'ACTIVE').length})
              </button>
              <button
                type="button"
                onClick={() => setCampaignStatusFilter('COMPLETED')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                  campaignStatusFilter === 'COMPLETED'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                ✓ Đã hoàn thành ({campaigns.filter((c) => c.status === 'COMPLETED').length})
              </button>
            </div>
          </div>

          {/* Campaigns Cards Grid */}
          {campaignsLoading ? (
            <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-2 shadow-xs">
              <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mx-auto" />
              <p className="text-xs text-slate-500">Đang tải danh sách các đợt kiểm kê...</p>
            </div>
          ) : filteredCampaigns.length === 0 ? (
            <div className="bg-white p-12 rounded-2xl border border-dashed border-slate-200 text-center space-y-3 shadow-xs">
              <FolderCheck className="w-12 h-12 text-slate-300 mx-auto" />
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-800">Không tìm thấy đợt kiểm kê nào phù hợp</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  {campaignSearch
                    ? 'Hãy thử tìm với từ khóa khác hoặc xóa bộ lọc.'
                    : 'Chưa có đợt kiểm kê nào. Bấm nút bên dưới để tạo đợt mới.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setNewSessionCompanies(companies);
                  setIsNewSessionModalOpen(true);
                }}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Tạo Đợt Mới</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCampaigns.map((camp) => {
                const total = camp.totalAssets || (camp.items ? camp.items.length : 0);
                const audited = camp.auditedCount !== undefined ? camp.auditedCount : (camp.items ? camp.items.filter((i) => i.auditStatus !== 'PENDING').length : 0);
                const pct = total > 0 ? Math.round((audited / total) * 100) : 0;
                const isCompleted = camp.status === 'COMPLETED';

                // Photos count in campaign
                const photoCount = camp.items ? camp.items.filter((i) => Boolean(i.actualPhotoUrl)).length : 0;

                return (
                  <div
                    key={camp.id}
                    onClick={() => handleOpenCampaignWorkspace(camp)}
                    className="bg-white hover:border-indigo-300 border border-slate-200 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between gap-4"
                  >
                    {/* Header */}
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10.5px] font-bold border ${
                            isCompleted
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}
                        >
                          {isCompleted ? '✓ Đã hoàn tất & chốt' : '🟢 Đang thực hiện'}
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono">
                          {formatDate(camp.createdAt)}
                        </span>
                      </div>

                      <h3 className="text-base font-extrabold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1" title={camp.title}>
                        {camp.title}
                      </h3>

                      {camp.notes && (
                        <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                          {camp.notes}
                        </p>
                      )}
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1.5 bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500 font-medium">Tiến độ đối soát</span>
                        <span className="font-extrabold text-slate-900 font-mono">
                          {audited}/{total} ({pct}%)
                        </span>
                      </div>
                      <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            isCompleted ? 'bg-emerald-500' : 'bg-gradient-to-r from-blue-600 to-indigo-600'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>

                      {/* Photo Badge if photos exist */}
                      {photoCount > 0 && (
                        <div className="pt-1 flex items-center gap-1.5 text-[11px] text-emerald-700 font-semibold">
                          <ImageIcon className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Đã chụp {photoCount} ảnh hiện trạng thực tế</span>
                        </div>
                      )}
                    </div>

                    {/* Footer Info & Actions */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
                      <div className="min-w-0">
                        <p className="text-slate-500 text-[11px] truncate">
                          👤 {camp.responsiblePerson || 'IT Team'}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => handleDeleteCampaign(camp.id, camp.title, e)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Xóa đợt kiểm kê"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>

                        <span className="px-3 py-1.5 bg-indigo-50 group-hover:bg-indigo-600 text-indigo-700 group-hover:text-white rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-1">
                          <span>{isCompleted ? 'Xem Báo Cáo' : 'Vào Quét'}</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* ==================== VIEW 2: ACTIVE AUDIT WORKSPACE ===================== */}
      {/* ========================================================================= */}
      {viewMode === 'WORKSPACE' && currentSession && (
        <div className="space-y-5">
          {/* Top Real-time Progress Bar & KPI Cards */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-sm sm:text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <span>📋 {currentSession.title}</span>
                  <span className="text-xs font-normal text-slate-400">
                    (Khởi tạo: {formatDate(currentSession.createdAt)})
                  </span>
                </h2>
                <div className="flex items-center gap-1.5 text-xs text-indigo-600 mt-1 flex-wrap">
                  <span className="font-semibold text-slate-600">Phạm vi công ty:</span>
                  {currentSession.selectedCompanies && currentSession.selectedCompanies.length > 0 && !currentSession.selectedCompanies.includes('ALL') ? (
                    currentSession.selectedCompanies.map((c, i) => (
                      <span key={i} className="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded-md text-[11px] text-slate-700">
                        {c}
                      </span>
                    ))
                  ) : (
                    <span className="px-2 py-0.5 bg-indigo-50 rounded-md border border-indigo-200 font-bold text-[11px] text-indigo-700">
                      Toàn bộ Tập đoàn (Đa Doanh Nghiệp)
                    </span>
                  )}
                  {currentSession.responsiblePerson && (
                    <span className="text-slate-500 text-xs ml-2">
                      • Phụ trách: <strong className="text-slate-700">{currentSession.responsiblePerson}</strong>
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500">Tiến độ đợt kiểm kê:</span>
                <span className="text-lg font-black text-indigo-600 font-mono">{metrics.percent}%</span>
              </div>
            </div>

            {/* Visual Gradient Progress Bar */}
            <div className="space-y-1.5">
              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500 transition-all duration-500 shadow-2xs"
                  style={{ width: `${metrics.percent}%` }}
                />
              </div>
            </div>

            {/* 4 Live Metrics Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    Tổng cần kiểm
                  </span>
                  <span className="text-xl sm:text-2xl font-black text-slate-900 font-mono">{metrics.total}</span>
                  <span className="text-[10px] text-slate-400 block">thiết bị trong đợt</span>
                </div>
                <div className="w-10 h-10 rounded-xl bg-white text-blue-600 border border-blue-200 flex items-center justify-center font-bold shadow-xs">
                  <Layers className="w-5 h-5" />
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider block">
                    Đã kiểm kê
                  </span>
                  <span className="text-xl sm:text-2xl font-black text-emerald-600 font-mono">{metrics.audited}</span>
                  <span className="text-[10px] text-emerald-600/70 block">({metrics.percent}% hoàn tất)</span>
                </div>
                <div className="w-10 h-10 rounded-xl bg-white text-emerald-600 border border-emerald-200 flex items-center justify-center font-bold shadow-xs">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wider block">
                    Còn lại (Chờ quét)
                  </span>
                  <span className="text-xl sm:text-2xl font-black text-amber-600 font-mono">{metrics.remaining}</span>
                  <span className="text-[10px] text-slate-400 block">máy chưa quét</span>
                </div>
                <div className="w-10 h-10 rounded-xl bg-white text-amber-600 border border-amber-200 flex items-center justify-center font-bold shadow-xs">
                  <Clock className="w-5 h-5" />
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="text-[11px] font-bold text-rose-600 uppercase tracking-wider block">
                    Sai lệch / Báo hỏng
                  </span>
                  <span className="text-xl sm:text-2xl font-black text-rose-600 font-mono">{metrics.mismatches}</span>
                  <span className="text-[10px] text-rose-600/70 block">cần điều chuyển / xử lý</span>
                </div>
                <div className="w-10 h-10 rounded-xl bg-white text-rose-600 border border-rose-200 flex items-center justify-center font-bold shadow-xs">
                  <AlertTriangle className="w-5 h-5" />
                </div>
              </div>
            </div>
          </div>

          {/* Real-time Scanning & Verification Interface (if active) */}
          {currentSession.status === 'ACTIVE' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Left Column: Scanner & Search (5/12 cols) */}
              <div className="lg:col-span-5 space-y-4">
                <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                      <Camera className="w-4 h-4 text-indigo-600" />
                      <span>Quét tem QR / Tìm máy</span>
                    </span>
                    <button
                      type="button"
                      onClick={toggleCamera}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                        isCameraActive
                          ? 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                          : 'bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100'
                      }`}
                    >
                      {isCameraActive ? <CameraOff className="w-3.5 h-3.5" /> : <Camera className="w-3.5 h-3.5" />}
                      <span>{isCameraActive ? 'Tắt Camera' : 'Bật Camera Quét'}</span>
                    </button>
                  </div>

                  {/* Camera Video Viewfinder */}
                  {isCameraActive && (
                    <div className="relative rounded-2xl overflow-hidden bg-black border-2 border-indigo-500/50 aspect-video shadow-lg animate-in zoom-in-95 duration-150">
                      <video ref={videoRef} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 border-2 border-indigo-400/40 pointer-events-none flex items-center justify-center">
                        <div className="w-48 h-48 border-2 border-dashed border-emerald-400 rounded-2xl animate-pulse flex items-center justify-center">
                          <span className="text-[10px] font-bold text-white bg-black/70 px-2 py-0.5 rounded-md">
                            Đưa mã QR vào khung
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Manual Search Bar */}
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold text-slate-700">
                      Gõ Mã Tag, Số Serial hoặc Tên máy:
                    </label>
                    <div className="relative flex items-center">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3.5" />
                      <input
                        ref={searchInputRef}
                        type="text"
                        placeholder="VD: ABC-0001, Dell Latitude, 5CG123..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && searchQuery.trim()) {
                            handleSearchOrScan(searchQuery);
                          }
                        }}
                        className="w-full pl-10 pr-24 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 placeholder:text-slate-400 outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => handleSearchOrScan(searchQuery)}
                        disabled={!searchQuery.trim()}
                        className="absolute right-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-lg text-xs font-bold transition-all cursor-pointer"
                      >
                        Tìm & Quét
                      </button>
                    </div>
                  </div>

                  {/* Quick Pick List: 10 Machines waiting for verification */}
                  <div className="pt-2 border-t border-slate-100 space-y-1.5">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                      Hoặc chọn nhanh máy chưa kiểm:
                    </span>
                    <div className="max-h-44 overflow-y-auto space-y-1.5 pr-1">
                      {currentSession.items
                        .filter((i) => i.auditStatus === 'PENDING')
                        .slice(0, 10)
                        .map((item) => (
                          <div
                            key={item.id}
                            onClick={() => handleSelectAssetForAudit(item)}
                            className="p-2.5 bg-slate-50 hover:bg-indigo-50/70 border border-slate-200 hover:border-indigo-200 rounded-xl flex items-center justify-between cursor-pointer transition-all group"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className="w-7 h-7 rounded-lg bg-white border border-slate-200 text-slate-600 flex items-center justify-center text-xs shrink-0">
                                {item.categoryIcon || '💻'}
                              </span>
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-slate-900 truncate group-hover:text-indigo-600">
                                  [{item.assetTag}] {item.name}
                                </p>
                                <p className="text-[10.5px] text-slate-500 truncate">
                                  👤 {item.systemUserName} • 📍 {item.systemLocationName}
                                </p>
                              </div>
                            </div>
                            <span className="text-[10px] bg-white border border-slate-200 text-slate-600 group-hover:bg-indigo-600 group-hover:border-indigo-600 group-hover:text-white px-2 py-0.5 rounded-md font-mono shrink-0 transition-colors">
                              Quét &rarr;
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Actual State Verification Card (7/12 cols) */}
              <div className="lg:col-span-7">
                {activeAuditingItem ? (
                  <div className="bg-white p-5 rounded-2xl border border-indigo-200 shadow-md space-y-4 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-mono font-black shrink-0">
                          [{activeAuditingItem.assetTag}]
                        </span>
                        <div className="min-w-0">
                          <h3 className="text-sm sm:text-base font-extrabold text-slate-900 truncate">
                            {activeAuditingItem.name}
                          </h3>
                          <p className="text-[11px] text-slate-500 truncate">
                            Serial: {activeAuditingItem.serialNumber || '—'} • Đơn vị: {activeAuditingItem.companyName || '—'}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setActiveAuditingItem(null)}
                        className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    {/* System State Banner */}
                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                          Người dùng lưu trên hệ thống:
                        </span>
                        <p className="font-bold text-indigo-700 mt-0.5 flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-indigo-600" />
                          <span>{activeAuditingItem.systemUserName}</span>
                        </p>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                          Vị trí lưu trên hệ thống:
                        </span>
                        <p className="font-bold text-slate-800 mt-0.5 flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-slate-500" />
                          <span>{activeAuditingItem.systemLocationName}</span>
                        </p>
                      </div>
                    </div>

                    {/* 1. Real Status Selection Buttons */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-800">
                        1. Xác nhận hiện trạng thiết bị (*):
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        {/* Option 1: Matched / OK */}
                        <button
                          type="button"
                          onClick={() => {
                            setCardStatus('MATCHED');
                            setCardActualUserId(activeAuditingItem.systemUserId || '');
                            setCardActualLocationId(activeAuditingItem.systemLocationId || '');
                          }}
                          className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                            cardStatus === 'MATCHED'
                              ? 'bg-emerald-50 border-emerald-500 text-emerald-950 ring-2 ring-emerald-500/20'
                              : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-white'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs flex items-center gap-1.5">
                              <span>🟢 Khớp thông tin</span>
                            </span>
                            {cardStatus === 'MATCHED' && <Check className="w-4 h-4 text-emerald-600" />}
                          </div>
                          <p className="text-[10.5px] text-slate-500">
                            Đúng người dùng & đúng vị trí thực tế
                          </p>
                        </button>

                        {/* Option 2: Mismatched User / Location */}
                        <button
                          type="button"
                          onClick={() => setCardStatus('MISMATCH_LOCATION_USER')}
                          className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                            cardStatus === 'MISMATCH_LOCATION_USER'
                              ? 'bg-amber-50 border-amber-500 text-amber-950 ring-2 ring-amber-500/20'
                              : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-white'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs flex items-center gap-1.5">
                              <span>🟡 Thừa / Thất lạc</span>
                            </span>
                            {cardStatus === 'MISMATCH_LOCATION_USER' && <Check className="w-4 h-4 text-amber-600" />}
                          </div>
                          <p className="text-[10.5px] text-slate-500">
                            Người khác đang cầm hoặc đã đổi phòng
                          </p>
                        </button>

                        {/* Option 3: Broken / Lost */}
                        <button
                          type="button"
                          onClick={() => setCardStatus('DAMAGED_OR_LOST')}
                          className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                            cardStatus === 'DAMAGED_OR_LOST'
                              ? 'bg-rose-50 border-rose-500 text-rose-950 ring-2 ring-rose-500/20'
                              : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-white'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs flex items-center gap-1.5">
                              <span>🔴 Hỏng hóc / Cần thay thế</span>
                            </span>
                            {cardStatus === 'DAMAGED_OR_LOST' && <Check className="w-4 h-4 text-rose-600" />}
                          </div>
                          <p className="text-[10.5px] text-slate-500">
                            Máy hỏng nặng, mất tích hoặc mất tem
                          </p>
                        </button>
                      </div>
                    </div>

                    {/* SEARCHABLE USER & LOCATION (UPGRADED WITH LIVE SEARCH) */}
                    {cardStatus === 'MISMATCH_LOCATION_USER' && (
                      <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-2xl space-y-3 animate-in fade-in">
                        <span className="text-xs font-bold text-amber-800 flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>Chọn lại Nhân sự & Vị trí thực tế tại hiện trường:</span>
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                          {/* Searchable User Dropdown */}
                          <div className="relative" ref={userDropdownRef}>
                            <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center justify-between">
                              <span>Nhân sự thực tế đang giữ máy:</span>
                              <span className="text-[10px] text-amber-600 font-semibold">(Có tìm kiếm)</span>
                            </label>
                            <button
                              type="button"
                              onClick={() => {
                                setUserDropdownOpen((prev) => !prev);
                                setUserSearchText('');
                              }}
                              className="w-full p-2.5 bg-white border border-slate-200 hover:border-amber-400 rounded-xl text-xs font-semibold text-slate-900 outline-none flex items-center justify-between transition-colors text-left cursor-pointer shadow-xs"
                            >
                              <div className="flex items-center gap-2 truncate">
                                <User className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                                <span className="truncate">
                                  {cardActualUserId
                                    ? users.find((u) => u.id === cardActualUserId)?.fullName || 'Nhân viên'
                                    : '-- Thu về kho (Chưa ai giữ) --'}
                                </span>
                                {cardActualUserId && (
                                  <span className="text-[10.5px] text-slate-500 truncate">
                                    {users.find((u) => u.id === cardActualUserId)?.department ? `(${users.find((u) => u.id === cardActualUserId)?.department})` : ''}
                                  </span>
                                )}
                              </div>
                              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform ${userDropdownOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {/* Dropdown Popup */}
                            {userDropdownOpen && (
                              <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 p-2 space-y-1.5 animate-in fade-in zoom-in-95 duration-150">
                                <div className="relative">
                                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                                  <input
                                    type="text"
                                    autoFocus
                                    placeholder="Gõ tên hoặc phòng ban..."
                                    value={userSearchText}
                                    onChange={(e) => setUserSearchText(e.target.value)}
                                    className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:bg-white focus:border-amber-500"
                                  />
                                </div>
                                <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
                                  <div
                                    onClick={() => {
                                      setCardActualUserId('');
                                      setUserDropdownOpen(false);
                                    }}
                                    className={`p-2 rounded-xl text-xs flex items-center gap-2 cursor-pointer transition-colors ${
                                      !cardActualUserId ? 'bg-amber-500 text-white font-bold' : 'hover:bg-slate-50 text-slate-700'
                                    }`}
                                  >
                                    <span>📦</span>
                                    <span>-- Thu về kho (Chưa ai giữ) --</span>
                                  </div>
                                  {filteredDropdownUsers.map((u) => (
                                    <div
                                      key={u.id}
                                      onClick={() => {
                                        setCardActualUserId(u.id);
                                        setUserDropdownOpen(false);
                                      }}
                                      className={`p-2 rounded-xl text-xs flex items-center justify-between cursor-pointer transition-colors ${
                                        cardActualUserId === u.id
                                          ? 'bg-amber-500 text-white font-bold'
                                          : 'hover:bg-slate-50 text-slate-700'
                                      }`}
                                    >
                                      <div className="min-w-0">
                                        <p className="font-bold truncate">👤 {u.fullName}</p>
                                        <p className="text-[10.5px] opacity-75 truncate">{u.department || 'Nhân sự'}</p>
                                      </div>
                                      {cardActualUserId === u.id && <Check className="w-3.5 h-3.5 shrink-0" />}
                                    </div>
                                  ))}
                                  {filteredDropdownUsers.length === 0 && (
                                    <p className="text-[11px] text-slate-400 p-2 text-center">Không tìm thấy nhân viên phù hợp</p>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Searchable Location Dropdown */}
                          <div className="relative" ref={locationDropdownRef}>
                            <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center justify-between">
                              <span>Ghi nhận vị trí thực tế:</span>
                              <span className="text-[10px] text-amber-600 font-semibold">(Có tìm kiếm)</span>
                            </label>
                            <button
                              type="button"
                              onClick={() => {
                                setLocationDropdownOpen((prev) => !prev);
                                setLocationSearchText('');
                              }}
                              className="w-full p-2.5 bg-white border border-slate-200 hover:border-amber-400 rounded-xl text-xs font-semibold text-slate-900 outline-none flex items-center justify-between transition-colors text-left cursor-pointer shadow-xs"
                            >
                              <div className="flex items-center gap-2 truncate">
                                <MapPin className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                                <span className="truncate">
                                  {cardActualLocationId
                                    ? locations.find((l) => l.id === cardActualLocationId)?.name || 'Vị trí'
                                    : '-- Kho thiết bị IT --'}
                                </span>
                                {cardActualLocationId && (
                                  <span className="text-[10.5px] text-slate-500 truncate">
                                    {locations.find((l) => l.id === cardActualLocationId)?.building ? `(${locations.find((l) => l.id === cardActualLocationId)?.building})` : ''}
                                  </span>
                                )}
                              </div>
                              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform ${locationDropdownOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {/* Dropdown Popup */}
                            {locationDropdownOpen && (
                              <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 p-2 space-y-1.5 animate-in fade-in zoom-in-95 duration-150">
                                <div className="relative">
                                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                                  <input
                                    type="text"
                                    autoFocus
                                    placeholder="Gõ tên phòng, kho, tòa nhà..."
                                    value={locationSearchText}
                                    onChange={(e) => setLocationSearchText(e.target.value)}
                                    className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:bg-white focus:border-amber-500"
                                  />
                                </div>
                                <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
                                  <div
                                    onClick={() => {
                                      setCardActualLocationId('');
                                      setLocationDropdownOpen(false);
                                    }}
                                    className={`p-2 rounded-xl text-xs flex items-center gap-2 cursor-pointer transition-colors ${
                                      !cardActualLocationId ? 'bg-amber-500 text-white font-bold' : 'hover:bg-slate-50 text-slate-700'
                                    }`}
                                  >
                                    <span>📍</span>
                                    <span>-- Kho thiết bị IT --</span>
                                  </div>
                                  {filteredDropdownLocations.map((loc) => (
                                    <div
                                      key={loc.id}
                                      onClick={() => {
                                        setCardActualLocationId(loc.id);
                                        setLocationDropdownOpen(false);
                                      }}
                                      className={`p-2 rounded-xl text-xs flex items-center justify-between cursor-pointer transition-colors ${
                                        cardActualLocationId === loc.id
                                          ? 'bg-amber-500 text-white font-bold'
                                          : 'hover:bg-slate-50 text-slate-700'
                                      }`}
                                    >
                                      <div className="min-w-0">
                                        <p className="font-bold truncate">📍 {loc.name}</p>
                                        <p className="text-[10.5px] opacity-75 truncate">{loc.building ? `${loc.building} • ` : ''}{loc.floor || ''}</p>
                                      </div>
                                      {cardActualLocationId === loc.id && <Check className="w-3.5 h-3.5 shrink-0" />}
                                    </div>
                                  ))}
                                  {filteredDropdownLocations.length === 0 && (
                                    <p className="text-[11px] text-slate-400 p-2 text-center">Không tìm thấy vị trí phù hợp</p>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Condition & Notes */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Tình trạng vật lý thực tế:
                        </label>
                        <select
                          value={cardActualCondition}
                          onChange={(e) => setCardActualCondition(e.target.value)}
                          className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 outline-none focus:bg-white focus:border-indigo-500"
                        >
                          <option value="NEW">Mới 100%</option>
                          <option value="GOOD">Tốt (Đang hoạt động ổn định)</option>
                          <option value="FAIR">Bình thường (Trầy xước nhẹ)</option>
                          <option value="POOR">Kém / Cần bảo dưỡng</option>
                          <option value="BROKEN">Hỏng hóc / Không lên nguồn</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Ghi chú thực tế (Actual Notes):
                        </label>
                        <input
                          type="text"
                          placeholder="VD: Máy trầy xước góc, thiếu sạc zin, bàn giao cho NV mới..."
                          value={cardActualNotes}
                          onChange={(e) => setCardActualNotes(e.target.value)}
                          className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:bg-white focus:border-indigo-500"
                        />
                      </div>
                    </div>

                    {/* 2. PHYSICAL CONDITION PHOTO UPLOAD SECTION (DRAG & DROP, PASTE CTRL+V, CAMERA) */}
                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        setIsDraggingPhoto(true);
                      }}
                      onDragLeave={() => setIsDraggingPhoto(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setIsDraggingPhoto(false);
                        const file = e.dataTransfer.files?.[0];
                        if (file) {
                          uploadPhotoFile(file);
                        }
                      }}
                      className={`p-3.5 rounded-2xl border transition-all duration-200 space-y-2.5 ${
                        isDraggingPhoto
                          ? 'bg-indigo-50/80 border-indigo-400 ring-4 ring-indigo-500/20 scale-[1.01]'
                          : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                          <Camera className="w-3.5 h-3.5 text-indigo-600" />
                          <span>2. Ảnh chụp hiện trạng thiết bị thực tế:</span>
                        </label>
                        <div className="flex items-center gap-2">
                          <span className="text-[10.5px] text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200 hidden sm:inline-flex items-center gap-1">
                            <span>📋 Hỗ trợ Ctrl+V & Kéo thả ảnh</span>
                          </span>
                          {cardPhotoUrl && (
                            <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                              ✓ Đã có ảnh
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                        {cardPhotoUrl ? (
                          <div className="flex items-center gap-3 bg-white p-2.5 rounded-xl border border-slate-200 flex-1 shadow-xs">
                            <div className="relative group/thumb shrink-0">
                              <img
                                src={cardPhotoUrl}
                                alt="Xem trước"
                                className="w-16 h-16 object-cover rounded-lg border border-slate-200"
                              />
                              <div
                                onClick={() => {
                                  setLightboxPhotoUrl(cardPhotoUrl);
                                  setLightboxItem(activeAuditingItem);
                                }}
                                className="absolute inset-0 bg-black/40 opacity-0 group-hover/thumb:opacity-100 rounded-lg flex items-center justify-center text-white cursor-pointer transition-opacity"
                              >
                                <ZoomIn className="w-4 h-4" />
                              </div>
                            </div>
                            <div className="min-w-0 flex-1 text-xs">
                              <p className="font-bold text-slate-900 truncate">Ảnh hiện trạng thiết bị</p>
                              <p className="text-[11px] text-slate-500 truncate">
                                {isDraggingPhoto ? '👉 Thả tệp vào đây để đổi ảnh!' : 'Dán Ctrl+V hoặc kéo ảnh khác vào để thay thế'}
                              </p>
                              <div className="flex items-center gap-2 mt-1.5">
                                <button
                                  type="button"
                                  onClick={() => photoInputRef.current?.click()}
                                  className="text-[11px] text-indigo-600 hover:text-indigo-700 font-bold underline cursor-pointer"
                                >
                                  Chụp lại / Đổi ảnh
                                </button>
                                <span className="text-slate-300">•</span>
                                <button
                                  type="button"
                                  onClick={() => setCardPhotoUrl(null)}
                                  className="text-[11px] text-rose-600 hover:text-rose-700 font-bold cursor-pointer"
                                >
                                  Xóa ảnh
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div
                            onClick={() => photoInputRef.current?.click()}
                            className={`flex-1 py-4 px-4 bg-white hover:bg-slate-50 border-2 border-dashed rounded-2xl text-xs font-bold text-indigo-600 flex flex-col sm:flex-row items-center justify-center gap-2.5 transition-all cursor-pointer group ${
                              isDraggingPhoto ? 'border-emerald-500 bg-emerald-50/50 text-emerald-700' : 'border-indigo-200 hover:border-indigo-400'
                            }`}
                          >
                            {isUploadingPhoto ? (
                              <div className="flex items-center gap-2">
                                <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
                                <span>Đang tải và xử lý ảnh...</span>
                              </div>
                            ) : (
                              <>
                                <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform shrink-0">
                                  <Camera className="w-4 h-4" />
                                </div>
                                <div className="text-center sm:text-left">
                                  <p className="text-slate-900 text-xs font-bold flex items-center gap-1.5 justify-center sm:justify-start">
                                    <span>📸 Bấm chụp ảnh / Chọn file</span>
                                    <span className="text-indigo-600">• Kéo thả ảnh</span>
                                    <span className="text-amber-600">• Dán Ctrl+V</span>
                                  </p>
                                  <p className="text-[10.5px] text-slate-500 font-normal mt-0.5">
                                    Chụp từ Camera điện thoại hoặc sao chép ảnh từ Zalo / Snipping Tool dán vào trực tiếp
                                  </p>
                                </div>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Save & Continue Button */}
                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => setActiveAuditingItem(null)}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer transition-colors"
                      >
                        Bỏ Qua
                      </button>
                      <button
                        type="button"
                        disabled={isSavingAuditItem}
                        onClick={handleSaveAndNext}
                        className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all"
                      >
                        {isSavingAuditItem ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Check className="w-4 h-4 stroke-[3]" />
                        )}
                        <span>Lưu & Quét Tiếp Máy Khác</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white p-12 rounded-2xl border border-dashed border-slate-200 text-center space-y-2 shadow-xs">
                    <Tag className="w-10 h-10 text-slate-300 mx-auto" />
                    <h4 className="text-sm font-bold text-slate-700">Chưa chọn thiết bị nào để xác nhận thực tế</h4>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                      Hãy quét tem QR, nhập mã tag hoặc chọn một máy từ danh sách bên trái để mở thẻ xác nhận và chụp ảnh hiện trạng.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ==================== AUDIT RECONCILIATION SUMMARY TABLE ==================== */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              {/* Tabs */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setTableFilterTab('ALL')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    tableFilterTab === 'ALL'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Tất cả ({currentSession.items.length})
                </button>

                <button
                  type="button"
                  onClick={() => setTableFilterTab('MATCHED')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    tableFilterTab === 'MATCHED'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  🟢 Khớp ({currentSession.items.filter((i) => i.auditStatus === 'MATCHED').length})
                </button>

                <button
                  type="button"
                  onClick={() => setTableFilterTab('MISMATCH')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    tableFilterTab === 'MISMATCH'
                      ? 'bg-amber-500 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  🟡 Sai lệch ({currentSession.items.filter((i) => i.auditStatus === 'MISMATCH_LOCATION_USER' || i.auditStatus === 'DAMAGED_OR_LOST').length})
                </button>

                <button
                  type="button"
                  onClick={() => setTableFilterTab('PENDING')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    tableFilterTab === 'PENDING'
                      ? 'bg-slate-700 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  ⚪ Chưa kiểm ({currentSession.items.filter((i) => i.auditStatus === 'PENDING').length})
                </button>
              </div>

              {/* Filter inputs */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Lọc trong bảng..."
                    value={tableSearch}
                    onChange={(e) => setTableSearch(e.target.value)}
                    className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:bg-white focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>

            {/* Reconciliation Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50/80 text-slate-500 uppercase tracking-wider font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-3">Mã Tag & Thiết Bị</th>
                    <th className="p-3 text-center">Ảnh Hiện Trạng</th>
                    <th className="p-3">Công Ty / Đơn Vị</th>
                    <th className="p-3">Hệ Thống (System)</th>
                    <th className="p-3">Thực Tế (Actual)</th>
                    <th className="p-3 text-center">Đối Soát</th>
                    <th className="p-3">Ghi Chú</th>
                    <th className="p-3 text-right">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {displayItems.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400">
                        Không có thiết bị nào trong danh mục đối soát này.
                      </td>
                    </tr>
                  ) : (
                    displayItems.map((item) => {
                      const isMismatched = item.auditStatus === 'MISMATCH_LOCATION_USER';
                      const isDamaged = item.auditStatus === 'DAMAGED_OR_LOST';
                      const isMatched = item.auditStatus === 'MATCHED';
                      const isPending = item.auditStatus === 'PENDING';

                      return (
                        <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                          {/* Tag & Name */}
                          <td className="p-3 min-w-[180px]">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded text-[11px]">
                                [{item.assetTag}]
                              </span>
                              <span className="font-bold text-slate-900 truncate max-w-[140px]" title={item.name}>
                                {item.name}
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-400 block mt-0.5">
                              Serial: {item.serialNumber || '—'}
                            </span>
                          </td>

                          {/* Condition Photo Column (NEW FEATURE) */}
                          <td className="p-3 text-center min-w-[90px]">
                            {item.actualPhotoUrl ? (
                              <div
                                onClick={() => {
                                  setLightboxPhotoUrl(item.actualPhotoUrl || null);
                                  setLightboxItem(item);
                                }}
                                className="relative group inline-block cursor-pointer"
                                title="Bấm xem ảnh to"
                              >
                                <img
                                  src={item.actualPhotoUrl}
                                  alt="Hiện trạng"
                                  className="w-10 h-10 object-cover rounded-lg border border-slate-200 group-hover:border-indigo-500 transition-colors shadow-2xs mx-auto"
                                />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 rounded-lg flex items-center justify-center text-white transition-opacity">
                                  <ZoomIn className="w-3.5 h-3.5" />
                                </div>
                              </div>
                            ) : (
                              <span className="text-slate-400 text-[11px] italic">—</span>
                            )}
                          </td>

                          {/* Company */}
                          <td className="p-3 text-slate-600 font-medium max-w-[140px] truncate" title={item.companyName}>
                            {item.companyName || '—'}
                          </td>

                          {/* System User & Location */}
                          <td className="p-3 min-w-[160px]">
                            <p className="font-semibold text-slate-800">👤 {item.systemUserName}</p>
                            <p className="text-[10.5px] text-slate-400">📍 {item.systemLocationName}</p>
                          </td>

                          {/* Actual User & Location */}
                          <td className="p-3 min-w-[160px]">
                            {isPending ? (
                              <span className="text-slate-400 italic">Chờ quét tại chỗ...</span>
                            ) : (
                              <div>
                                <p
                                  className={`font-semibold ${
                                    item.actualUserName !== item.systemUserName
                                      ? 'text-amber-700 font-bold'
                                      : 'text-emerald-700'
                                  }`}
                                >
                                  👤 {item.actualUserName}
                                </p>
                                <p
                                  className={`text-[10.5px] ${
                                    item.actualLocationName !== item.systemLocationName
                                      ? 'text-amber-700 font-bold'
                                      : 'text-slate-500'
                                  }`}
                                >
                                  📍 {item.actualLocationName}
                                </p>
                              </div>
                            )}
                          </td>

                          {/* Audit Status Badge */}
                          <td className="p-3 text-center">
                            {isMatched && (
                              <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full font-bold text-[10.5px] inline-flex items-center gap-1">
                                <span>🟢 Khớp</span>
                              </span>
                            )}
                            {isMismatched && (
                              <span className="px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full font-bold text-[10.5px] inline-flex items-center gap-1">
                                <span>🟡 Sai lệch</span>
                              </span>
                            )}
                            {isDamaged && (
                              <span className="px-2.5 py-1 bg-rose-50 text-rose-700 border border-rose-200 rounded-full font-bold text-[10.5px] inline-flex items-center gap-1">
                                <span>🔴 Hỏng / Mất</span>
                              </span>
                            )}
                            {isPending && (
                              <span className="px-2.5 py-1 bg-slate-100 text-slate-600 border border-slate-200 rounded-full font-semibold text-[10.5px]">
                                ⚪ Chờ kiểm
                              </span>
                            )}
                          </td>

                          {/* Notes */}
                          <td className="p-3 text-slate-700 max-w-[160px] truncate" title={item.actualNotes}>
                            {item.actualNotes ? (
                              <span>📝 {item.actualNotes}</span>
                            ) : (
                              <span className="text-slate-400 italic">—</span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="p-3 text-right space-x-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleSelectAssetForAudit(item)}
                              className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white rounded-lg text-[11px] font-bold cursor-pointer transition-colors border border-indigo-200 hover:border-indigo-600"
                            >
                              {isPending ? 'Quét ngay' : 'Sửa lại'}
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
        </div>
      )}

      {/* ========================================================================= */}
      {/* ==================== MODAL: CREATE NEW AUDIT CAMPAIGN =================== */}
      {/* ========================================================================= */}
      {isNewSessionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80">
              <div className="flex items-center gap-2.5">
                <span className="p-2 bg-gradient-to-tr from-blue-600 to-indigo-600 text-white rounded-xl shadow-xs">
                  <Plus className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">Tạo Đợt Kiểm Kê Tài Sản Mới</h3>
                  <p className="text-[11px] text-slate-500">Khởi tạo chiến dịch quét mã QR và đối soát hiện trường</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsNewSessionModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Campaign Title */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tên đợt kiểm kê (*):
                </label>
                <input
                  type="text"
                  placeholder="VD: Kiểm kê quý 1/2025 - Khối Văn Phòng Hội Sở..."
                  value={newSessionTitle}
                  onChange={(e) => setNewSessionTitle(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 outline-none focus:bg-white focus:border-indigo-500"
                />
              </div>

              {/* Multi-Company Selection */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <span>🏢 Phạm vi Doanh nghiệp / Công ty áp dụng (*):</span>
                    <span className="text-[10px] text-indigo-600 font-semibold">
                      (Đã chọn {newSessionCompanies.length}/{companies.length})
                    </span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      if (newSessionCompanies.length === companies.length) {
                        setNewSessionCompanies([]);
                      } else {
                        setNewSessionCompanies([...companies]);
                      }
                    }}
                    className="text-[11px] font-bold text-indigo-600 hover:underline cursor-pointer"
                  >
                    {newSessionCompanies.length === companies.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả công ty'}
                  </button>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-1.5 max-h-40 overflow-y-auto">
                  {companies.map((comp) => {
                    const isChecked = newSessionCompanies.includes(comp);
                    return (
                      <div
                        key={comp}
                        onClick={() => {
                          setNewSessionCompanies((prev) =>
                            isChecked ? prev.filter((c) => c !== comp) : [...prev, comp]
                          );
                        }}
                        className={`p-2 rounded-xl flex items-center justify-between cursor-pointer transition-colors ${
                          isChecked
                            ? 'bg-indigo-50/80 border border-indigo-200 text-indigo-900 font-bold'
                            : 'hover:bg-slate-100 text-slate-600 border border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-4 h-4 rounded-md flex items-center justify-center border ${
                              isChecked ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 bg-white'
                            }`}
                          >
                            {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                          <span className="text-xs">🏢 {comp}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Filters: Location & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Khu vực / Phòng ban:
                  </label>
                  <select
                    value={newSessionLocationId}
                    onChange={(e) => setNewSessionLocationId(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:bg-white focus:border-indigo-500"
                  >
                    <option value="ALL">Tất cả các vị trí</option>
                    {locations.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        📍 {loc.name} {loc.building ? `(${loc.building})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Loại thiết bị:
                  </label>
                  <select
                    value={newSessionCategoryId}
                    onChange={(e) => setNewSessionCategoryId(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:bg-white focus:border-indigo-500"
                  >
                    <option value="ALL">Tất cả loại tài sản</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.icon || '📦'} {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Target Date & Responsible Person */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Hạn chốt dự kiến:
                  </label>
                  <input
                    type="date"
                    value={newSessionTargetDate}
                    onChange={(e) => setNewSessionTargetDate(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:bg-white focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Người phụ trách chính:
                  </label>
                  <input
                    type="text"
                    value={newSessionResponsible}
                    onChange={(e) => setNewSessionResponsible(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:bg-white focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Ghi chú mục tiêu đợt kiểm kê:
                </label>
                <input
                  type="text"
                  placeholder="Mục đích, KTV phối hợp, lưu ý hiện trường..."
                  value={newSessionNotes}
                  onChange={(e) => setNewSessionNotes(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:bg-white focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-100 bg-slate-50/80">
              <button
                type="button"
                onClick={() => setIsNewSessionModalOpen(false)}
                className="px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold cursor-pointer shadow-xs"
              >{isEn ? 'Cancel' : 'Hủy'}</button>
              <button
                type="button"
                disabled={isSubmittingNewCampaign}
                onClick={handleStartNewCampaign}
                className="px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                {isSubmittingNewCampaign ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Play className="w-3.5 h-3.5 fill-current" />
                )}
                <span>Khởi Tạo & Bắt Đầu Kiểm Kê</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ==================== MODAL: PHOTO LIGHTBOX PREVIEW ===================== */}
      {/* ========================================================================= */}
      {lightboxPhotoUrl && (
        <div
          onClick={() => setLightboxPhotoUrl(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white border border-slate-200 rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl text-xs space-y-3 p-5"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-emerald-600" />
                <span className="font-extrabold text-sm text-slate-900">
                  Ảnh Hiện Trạng Thực Tế [{lightboxItem?.assetTag || 'Thiết bị'}]
                </span>
              </div>
              <button
                type="button"
                onClick={() => setLightboxPhotoUrl(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* High-res image */}
            <div className="rounded-2xl overflow-hidden bg-slate-100 max-h-[70vh] flex items-center justify-center border border-slate-200">
              <img
                src={lightboxPhotoUrl}
                alt="Ảnh hiện trạng chi tiết"
                className="max-h-[68vh] w-auto object-contain mx-auto"
              />
            </div>

            {/* Item Meta info */}
            {lightboxItem && (
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 grid grid-cols-2 gap-2 text-slate-700">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Thiết bị:</span>
                  <span className="font-bold text-slate-900">[{lightboxItem.assetTag}] {lightboxItem.name}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Tình trạng thực tế:</span>
                  <span className="font-bold text-emerald-600">{lightboxItem.actualCondition}</span>
                </div>
                {lightboxItem.actualNotes && (
                  <div className="col-span-2">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Ghi chú hiện trường:</span>
                    <span className="text-slate-600">{lightboxItem.actualNotes}</span>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <a
                href={lightboxPhotoUrl}
                target="_blank"
                rel="noreferrer"
                className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-slate-200"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Mở trong tab mới</span>
              </a>
              <button
                type="button"
                onClick={() => setLightboxPhotoUrl(null)}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold cursor-pointer shadow-xs"
              >{isEn ? 'Close' : 'Đóng'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ==================== MODAL: SHARE ON MOBILE VIA QR ===================== */}
      {/* ========================================================================= */}
      {isShareModalOpen && currentSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-md w-full border border-slate-200 shadow-2xl p-6 text-center space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-slate-900 font-extrabold text-sm">
                <QrCode className="w-4 h-4 text-indigo-600" />
                <span>Mở Chiến Dịch Trên Điện Thoại</span>
              </div>
              <button
                type="button"
                onClick={() => setIsShareModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* HTTPS 3443 Camera Badge */}
            <div className="p-3 bg-indigo-50 rounded-2xl border border-indigo-100 text-left space-y-1">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                <span className="text-[11px] font-bold text-indigo-900 font-mono">
                  🔒 Cổng HTTPS 3443 (Tự động kích hoạt Camera điện thoại)
                </span>
              </div>
              <p className="text-[10.5px] text-slate-600 leading-relaxed">
                Trình duyệt trên điện thoại (Safari/Chrome) bắt buộc kết nối bảo mật <strong>HTTPS:3443</strong> để mở Camera quét mã QR và chụp ảnh hiện trạng thiết bị.
              </p>
            </div>

            {/* Server IP / Host Configuration */}
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 text-left space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <label className="font-bold text-slate-700 flex items-center gap-1">
                  <span>🌐 Địa chỉ IP Server:</span>
                  {serverUrlSetting && (
                    <span className="text-slate-400 font-normal truncate max-w-[130px]" title={serverUrlSetting}>
                      (Gốc: {serverUrlSetting})
                    </span>
                  )}
                </label>
                <button
                  type="button"
                  onClick={() => {
                    const currentHost = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
                    setMobileHost(currentHost);
                    const newUrl = resolveMobileUrl(currentSession.id, currentHost);
                    setGeneratedMobileUrl(newUrl);
                    generateAndSetQr(newUrl);
                  }}
                  className="text-indigo-600 hover:text-indigo-700 font-bold underline text-[10.5px] cursor-pointer"
                >
                  Lấy IP máy hiện tại
                </button>
              </div>
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  placeholder="VD: 192.168.1.50 hoặc simply-it.company.local"
                  value={mobileHost}
                  onChange={(e) => {
                    const newHost = e.target.value;
                    setMobileHost(newHost);
                    const newUrl = resolveMobileUrl(currentSession.id, newHost);
                    setGeneratedMobileUrl(newUrl);
                    generateAndSetQr(newUrl);
                  }}
                  className="flex-1 p-2 bg-white border border-slate-200 rounded-xl text-xs font-mono text-slate-900 outline-none focus:border-indigo-500 shadow-2xs"
                />
              </div>
              <p className="text-[10px] text-slate-500">
                💡 Nếu quét QR từ iPhone/Android, đảm bảo điện thoại kết nối chung mạng Wi-Fi và nhập đúng IP LAN của máy tính.
              </p>
            </div>

            {/* QR Code Container */}
            <div className="space-y-1">
              <p className="text-xs text-slate-600 font-medium">
                Dùng Camera điện thoại hoặc Zalo quét mã QR bên dưới:
              </p>
              {shareQrDataUrl ? (
                <div className="p-3 bg-white rounded-2xl inline-block shadow-md mx-auto border-2 border-indigo-100">
                  <img src={shareQrDataUrl} alt="Mobile Audit QR" className="w-56 h-56 mx-auto object-contain" />
                </div>
              ) : (
                <div className="w-56 h-56 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto text-slate-400 text-xs">
                  Đang tạo mã QR...
                </div>
              )}
            </div>

            {/* Generated Link URL Display */}
            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-left">
              <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">
                Đường dẫn trực tiếp (HTTPS :3443):
              </span>
              <p className="text-[11px] font-mono text-emerald-700 break-all select-all font-semibold">
                {generatedMobileUrl || resolveMobileUrl(currentSession.id)}
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const urlToCopy = generatedMobileUrl || resolveMobileUrl(currentSession.id);
                    navigator.clipboard.writeText(urlToCopy);
                    setCopiedShareLink(true);
                    setTimeout(() => setCopiedShareLink(false), 2500);
                  }}
                  className="flex-1 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-xs transition-all active:scale-95"
                >
                  {copiedShareLink ? <Check className="w-4 h-4 text-emerald-200" /> : <Tag className="w-4 h-4" />}
                  <span>{copiedShareLink ? '✅ Đã sao chép link!' : 'Sao chép Link kiểm kê'}</span>
                </button>

                <a
                  href={generatedMobileUrl || resolveMobileUrl(currentSession.id)}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3.5 py-2.5 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-slate-200 shadow-xs"
                  title="Mở thử trong tab mới để kiểm tra kết nối HTTPS"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Mở tab mới</span>
                </a>
              </div>

              <button
                type="button"
                onClick={() => setIsShareModalOpen(false)}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 rounded-xl text-xs font-bold cursor-pointer transition-colors"
              >{isEn ? 'Close' : 'Đóng'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ==================== MODAL: FINALIZE CONFIRMATION ====================== */}
      {/* ========================================================================= */}
      {isFinalizeModalOpen && currentSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-md w-full border border-slate-200 shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150 text-xs">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto shadow-xs">
              <CheckCheck className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-extrabold text-slate-900">Xác Nhận Chốt Đợt Kiểm Kê</h3>
              <p className="text-slate-500">
                Bạn đã kiểm kê <strong className="text-slate-800">{metrics.audited}/{metrics.total}</strong> thiết bị ({metrics.percent}%).
              </p>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 text-slate-700">
              <div className="flex items-center justify-between">
                <span>🟢 Khớp hoàn toàn:</span>
                <span className="font-bold text-emerald-600 font-mono">
                  {currentSession.items.filter((i) => i.auditStatus === 'MATCHED').length} máy
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>🟡 Sai lệch vị trí / người dùng:</span>
                <span className="font-bold text-amber-600 font-mono">
                  {currentSession.items.filter((i) => i.auditStatus === 'MISMATCH_LOCATION_USER').length} máy
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>🔴 Hỏng / Thất thoát:</span>
                <span className="font-bold text-rose-600 font-mono">
                  {currentSession.items.filter((i) => i.auditStatus === 'DAMAGED_OR_LOST').length} máy
                </span>
              </div>
              <div className="flex items-center justify-between border-t border-slate-200 pt-1.5">
                <span>⚪ Chưa kiểm kê:</span>
                <span className="font-bold text-slate-500 font-mono">
                  {currentSession.items.filter((i) => i.auditStatus === 'PENDING').length} máy
                </span>
              </div>
            </div>

            <p className="text-[11px] text-amber-800 bg-amber-50 p-2.5 rounded-xl border border-amber-200 leading-relaxed">
              ⚠️ Khi chốt, hệ thống sẽ tự động đồng bộ vị trí, tình trạng thực tế và ghi chú vào Hồ sơ Tài sản gốc.
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsFinalizeModalOpen(false)}
                className="px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold cursor-pointer shadow-xs"
              >{isEn ? 'Cancel' : 'Hủy'}</button>
              <button
                type="button"
                onClick={handleFinalizeAudit}
                className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1.5 transition-all active:scale-95"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>Đồng Ý Chốt & Đồng Bộ</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
