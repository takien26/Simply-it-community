'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  KeyRound,
  ArrowUp,
  ArrowDown,
  Move,
  Plus,
  Search,
  Copy,
  Check,
  Eye,
  EyeOff,
  Folder,
  FolderOpen,
  FolderPlus,
  ChevronRight,
  ChevronDown,
  Star,
  ExternalLink,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Download,
  Upload,
  RefreshCw,
  Edit2,
  Trash2,
  X,
  Server,
  Database,
  Wifi,
  Cloud,
  Mail,
  Lock,
  Building2,
  FileText,
  Dices,
  Layers,
  Globe,
  CheckCircle2,
  MoreVertical,
  Sparkles,
  MapPin,
  Laptop,
  Image as ImageIcon,
  Smile,
} from 'lucide-react';
import * as kdbxweb from 'kdbxweb';
import { SecondaryPasswordModal } from '@/components/common/SecondaryPasswordModal';
import { useLanguage } from '@/lib/i18n/context';

interface PasswordItem {
  id: string;
  title: string;
  username: string | null;
  password: string;
  url: string | null;
  category: string;
  groupName: string | null;
  assetId: string | null;
  serviceId: string | null;
  vendorId: string | null;
  isFavorite: boolean;
  totpSecret: string | null;
  notes: string | null;
  asset?: { id: string; assetTag: string; name: string } | null;
  service?: { id: string; serviceCode: string; name: string } | null;
  vendor?: { id: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
}

interface FolderNode {
  id: string;
  name: string;
  fullPath: string;
  iconStr?: string;
  count: number;
  totalCount: number;
  children: FolderNode[];
}

const POPULAR_ICONS = [
  { emoji: '📁', label: 'Thư mục chung' },
  { emoji: '🏢', label: 'Văn phòng / Trụ sở' },
  { emoji: '🏭', label: 'Nhà máy / Xí nghiệp' },
  { emoji: '🏬', label: 'Chi nhánh / Cửa hàng' },
  { emoji: '📍', label: 'Địa điểm / Vị trí' },
  { emoji: '🖥️', label: 'Máy chủ / Server' },
  { emoji: '🗄️', label: 'Cơ sở dữ liệu / Database' },
  { emoji: '☁️', label: 'Đám mây / Cloud' },
  { emoji: '🌐', label: 'Mạng / Router / Firewall' },
  { emoji: '📡', label: 'WiFi / Thiết bị mạng' },
  { emoji: '📹', label: 'Camera / An ninh' },
  { emoji: '🛡️', label: 'Bảo mật / Admin Root' },
  { emoji: '🔒', label: 'Khóa bảo vệ VIP' },
  { emoji: '🔑', label: 'Chìa khóa truy cập' },
  { emoji: '✉️', label: 'Email / Microsoft 365' },
  { emoji: '💻', label: 'Máy tính cá nhân / PC' },
  { emoji: '📱', label: 'Thiết bị di động' },
  { emoji: '⚙️', label: 'Hệ thống / ERP' },
  { emoji: '⚡', label: 'Hạ tầng điện / UPS' },
  { emoji: '🖨️', label: 'Máy in / Scan' },
  { emoji: '📦', label: 'Kho thiết bị / Package' },
  { emoji: '🚀', label: 'Dự án / Triển khai' },
  { emoji: '🔌', label: 'Cổng kết nối / Switch' },
  { emoji: '🏷️', label: 'Nhãn định danh / Tag' },
];

const DEFAULT_ROOT_FOLDERS = [
  {
    name: '🏢 Văn Phòng Trụ Sở Chính',
    subgroups: ['🌐 Mạng & Firewall Trụ Sở', '📹 Camera & Kiểm Soát Ra Vào', '🖥️ Máy Chủ Ứng Dụng Nội Bộ', '📡 WiFi & Switch Core'],
  },
  {
    name: '🏭 Chi Nhánh / Nhà Máy',
    subgroups: ['🌐 VPN & Router Chi Nhánh', '📹 Hệ Thống Camera Giám Sát', '⚙️ Thiết Bị Chấm Công & Tổng Đài'],
  },
  {
    name: '🖥️ Máy Chủ & Hạ Tầng (Servers)',
    subgroups: ['🐧 Máy chủ Linux / Ubuntu', '🪟 Máy chủ Windows Server', '🐳 Ảo hóa & Docker Cluster'],
  },
  {
    name: '🗄️ Cơ Sở Dữ Liệu (Databases)',
    subgroups: ['🐘 PostgreSQL Master/Slave', '🐬 MySQL & MariaDB', '🗃️ MS SQL Server & Oracle', '⚡ Redis & Cache Cluster'],
  },
  {
    name: '☁️ Điện Toán Đám Mây (Cloud Services)',
    subgroups: ['🟠 Amazon Web Services (AWS)', '🔵 Microsoft Azure Cloud', '🔴 Google Cloud (GCP)', '🌐 Cloud VPS / Hosting'],
  },
  {
    name: '✉️ Email & Dịch Vụ SaaS',
    subgroups: ['🟦 Microsoft 365 / Entra ID', '🟥 Google Workspace', '🟩 Phần Mềm ERP & HRM'],
  },
];

function renderFolderIcon(iconStr?: string) {
  if (!iconStr) return <Folder className="w-3.5 h-3.5 text-indigo-600 shrink-0" />;
  if (iconStr.startsWith('http') || iconStr.startsWith('data:image')) {
    return <img src={iconStr} alt="icon" className="w-3.5 h-3.5 object-contain rounded shrink-0" />;
  }
  return <span className="text-sm leading-none shrink-0">{iconStr}</span>;
}

function parseFolderDisplay(fullFolderName: string): { icon: string; name: string } {
  const trimmed = fullFolderName.trim();
  const spaceIdx = trimmed.indexOf(' ');
  if (spaceIdx > 0 && spaceIdx <= 4) {
    const possibleIcon = trimmed.slice(0, spaceIdx);
    const restName = trimmed.slice(spaceIdx + 1).trim();
    return { icon: possibleIcon, name: restName };
  }
  if (trimmed.startsWith('data:image') || trimmed.startsWith('http')) {
    const parts = trimmed.split(' ');
    return { icon: parts[0], name: parts.slice(1).join(' ') };
  }
  return { icon: '📁', name: trimmed };
}


function buildRecursiveFolderTree(
  passwordsList: PasswordItem[],
  customFolders: string[] = [],
  folderOrder: string[] = []
): FolderNode[] {
  const rootNodes: FolderNode[] = [];
  const safePasswords = Array.isArray(passwordsList) ? passwordsList : [];
  const safeCustom = Array.isArray(customFolders) ? customFolders : [];
  const safeOrder = Array.isArray(folderOrder) ? folderOrder : [];

  function getOrCreateNode(parentChildren: FolderNode[], segName: string, fullPath: string): FolderNode {
    const parsed = parseFolderDisplay(segName);
    let node = parentChildren.find((n) => n.name === parsed.name || n.fullPath === fullPath);
    if (!node) {
      node = {
        id: fullPath,
        name: parsed.name,
        fullPath: fullPath,
        iconStr: parsed.icon,
        count: 0,
        totalCount: 0,
        children: [],
      };
      parentChildren.push(node);
    }
    return node;
  }

  // 1. Process custom folders
  safeCustom.forEach((fullFld) => {
    if (!fullFld) return;
    const segments = fullFld.split(' / ').map((s) => s.trim()).filter(Boolean);
    if (segments.length === 0) return;
    let currentChildren = rootNodes;
    let currentPath = '';

    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      currentPath = currentPath ? `${currentPath} / ${seg}` : seg;
      const node = getOrCreateNode(currentChildren, seg, currentPath);
      currentChildren = node.children;
    }
  });

  // 2. Count items per group path
  const pathCounts = new Map<string, number>();
  safePasswords.forEach((item) => {
    const rawGroup = (item.groupName || 'Mặc định').trim();
    pathCounts.set(rawGroup, (pathCounts.get(rawGroup) || 0) + 1);
  });

  // 3. Populate tree with items
  pathCounts.forEach((count, rawPath) => {
    const segments = rawPath.split(' / ').map((s) => s.trim()).filter(Boolean);
    if (segments.length === 0) return;
    let currentChildren = rootNodes;
    let currentPath = '';

    const visitedNodes: FolderNode[] = [];

    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      currentPath = currentPath ? `${currentPath} / ${seg}` : seg;
      const node = getOrCreateNode(currentChildren, seg, currentPath);
      visitedNodes.push(node);
      currentChildren = node.children;
    }

    if (visitedNodes.length > 0) {
      visitedNodes[visitedNodes.length - 1].count += count;
    }
    visitedNodes.forEach((n) => {
      n.totalCount += count;
    });
  });

  // 4. Sort nodes at every level according to folderOrder
  const getOrder = (p: string) => {
    const idx = safeOrder.indexOf(p);
    return idx === -1 ? 999999 : idx;
  };

  const sortRecursive = (nodes: FolderNode[]) => {
    nodes.sort((a, b) => getOrder(a.fullPath) - getOrder(b.fullPath));
    nodes.forEach((n) => {
      if (n.children && n.children.length > 0) sortRecursive(n.children);
    });
  };

  sortRecursive(rootNodes);
  return rootNodes;
}

function evaluatePasswordStrength(pass: string): { score: number; label: string; color: string; bg: string } {
  if (!pass) return { score: 0, label: 'Chưa nhập', color: 'text-slate-400', bg: 'bg-slate-200' };
  let score = 0;
  if (pass.length >= 8) score += 20;
  if (pass.length >= 12) score += 20;
  if (pass.length >= 16) score += 10;
  if (/[A-Z]/.test(pass)) score += 15;
  if (/[a-z]/.test(pass)) score += 15;
  if (/[0-9]/.test(pass)) score += 10;
  if (/[^A-Za-z0-9]/.test(pass)) score += 10;

  if (score < 40) return { score, label: 'Yếu', color: 'text-rose-600', bg: 'bg-rose-500' };
  if (score < 70) return { score, label: 'Trung bình', color: 'text-amber-600', bg: 'bg-amber-500' };
  if (score < 90) return { score, label: 'Mạnh', color: 'text-emerald-600', bg: 'bg-emerald-500' };
  return { score: 100, label: 'Rất mạnh', color: 'text-indigo-600', bg: 'bg-indigo-600' };
}

function generateSecurePassword(options: {
  length: number;
  useUpper: boolean;
  useLower: boolean;
  useDigits: boolean;
  useSymbols: boolean;
  avoidAmbiguous: boolean;
}): string {
  let upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let lower = 'abcdefghijklmnopqrstuvwxyz';
  let digits = '0123456789';
  let symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';

  if (options.avoidAmbiguous) {
    upper = upper.replace(/[IO]/g, '');
    lower = lower.replace(/[lo]/g, '');
    digits = digits.replace(/[01]/g, '');
    symbols = symbols.replace(/[|]/g, '');
  }

  let charset = '';
  if (options.useUpper) charset += upper;
  if (options.useLower) charset += lower;
  if (options.useDigits) charset += digits;
  if (options.useSymbols) charset += symbols;

  if (!charset) charset = lower + digits;

  let password = '';
  const array = new Uint32Array(options.length);
  window.crypto.getRandomValues(array);
  for (let i = 0; i < options.length; i++) {
    password += charset[array[i] % charset.length];
  }
  return password;
}

export default function PasswordsPage() {
  const { language, t } = useLanguage();
  const isEn = language === 'en';

  const [passwords, setPasswords] = useState<PasswordItem[]>([]);
  const [customFoldersList, setCustomFoldersList] = useState<string[]>([]);
  const [folderOrderList, setFolderOrderList] = useState<string[]>([]);
  const [dragOverTarget, setDragOverTarget] = useState<{ folderPath: string; position: 'BEFORE' | 'INSIDE' | 'AFTER' } | null>(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const [selectedGroupPath, setSelectedGroupPath] = useState<string>('ALL');
  const [favoriteOnly, setFavoriteOnly] = useState(false);

  // Expanded Tree Folders Map
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set([
      '🏢 Văn Phòng Trụ Sở Chính',
      '🏭 Chi Nhánh / Nhà Máy',
      '🖥️ Máy Chủ & Hạ Tầng (Servers)',
      '🗄️ Cơ Sở Dữ Liệu (Databases)',
      '☁️ Điện Toán Đám Mây (Cloud Services)',
      '✉️ Email & Dịch Vụ SaaS',
    ])
  );

  // Drag & Drop State
  const [sidebarWidth, setSidebarWidth] = useState<number>(320);
  const [isResizingSplitter, setIsResizingSplitter] = useState<boolean>(false);
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [draggedFolderPath, setDraggedFolderPath] = useState<string | null>(null);
  const [draggedType, setDraggedType] = useState<'ITEM' | 'FOLDER' | null>(null);

  const [dragOverFolder, setDragOverFolder] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Context Menu State
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    type: 'FOLDER' | 'ITEM' | 'EMPTY';
    targetFolder?: string;
    targetItem?: PasswordItem;
  }>({
    visible: false,
    x: 0,
    y: 0,
    type: 'EMPTY',
  });

  // Visible Passwords Set
  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isGeneratorModalOpen, setIsGeneratorModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedPassword, setSelectedPassword] = useState<PasswordItem | null>(null);

  // Folder Create/Edit Modal State
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [folderModalParentPath, setFolderModalParentPath] = useState<string>('');
  const [folderModalOldPath, setFolderModalOldPath] = useState<string>('');
  const [folderModalInputName, setFolderModalInputName] = useState<string>('');
  const [folderModalSelectedIcon, setFolderModalSelectedIcon] = useState<string>('📁');
  const [folderIconMode, setFolderIconMode] = useState<'PALETTE' | 'UPLOAD' | 'CUSTOM'>('PALETTE');
  const folderIconUploadRef = useRef<HTMLInputElement>(null);

  // Import states
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importMasterPassword, setImportMasterPassword] = useState<string>('');
  const [showImportMasterPassword, setShowImportMasterPassword] = useState<boolean>(false);
  const [importKeyFile, setImportKeyFile] = useState<File | null>(null);
  const keyFileInputRef = useRef<HTMLInputElement>(null);
  const [importGroup, setImportGroup] = useState('🏢 Văn Phòng Trụ Sở Chính / KeePass Import');
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  const [importErrorMsg, setImportErrorMsg] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Generator Options State
  const [genLength, setGenLength] = useState(16);
  const [genUpper, setGenUpper] = useState(true);
  const [genLower, setGenLower] = useState(true);
  const [genDigits, setGenDigits] = useState(true);
  const [genSymbols, setGenSymbols] = useState(true);
  const [genAvoidAmbiguous, setGenAvoidAmbiguous] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState('');

  // Form State
  const initialForm = {
    title: '',
    username: '',
    password: '',
    url: '',
    category: 'GENERAL',
    groupName: '🏢 Văn Phòng Trụ Sở Chính / 🌐 Mạng & Firewall Trụ Sở',
    assetId: '',
    serviceId: '',
    isFavorite: false,
    totpSecret: '',
    notes: '',
  };

  const [formData, setFormData] = useState(initialForm);
  const [editFormData, setEditFormData] = useState(initialForm);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Secondary Password (Mật khẩu cấp 2) Vault Lock States
  const [isVaultUnlocked, setIsVaultUnlocked] = useState<boolean>(false);
  const [isSecPwModalOpen, setIsSecPwModalOpen] = useState<boolean>(false);
  const [secPwModalMode, setSecPwModalMode] = useState<'verify' | 'set' | 'change'>('verify');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const unlocked = sessionStorage.getItem('simply_sec_pw_unlocked') === 'true';
      if (unlocked) {
        setIsVaultUnlocked(true);
      } else {
        setIsVaultUnlocked(false);
        setIsSecPwModalOpen(true);
      }
    }
  }, []);

  const handleLockVault = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('simply_sec_pw_unlocked');
    }
    setIsVaultUnlocked(false);
    setSecPwModalMode('verify');
    setIsSecPwModalOpen(true);
  };

  const handleOpenChangeSecPw = () => {
    setSecPwModalMode('change');
    setIsSecPwModalOpen(true);
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Copy to clipboard helper
  const copyToClipboard = async (text: string, label: string = 'Nội dung') => {
    if (!text) return;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.left = '-999999px';
        textarea.style.top = '-999999px';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      showToast(`📋 Đã copy ${label} vào bộ nhớ tạm`);
    } catch (err) {
      console.error('Copy failed:', err);
      showToast('❌ Không thể copy vào bộ nhớ tạm');
    }
  };

  // Robust Copy to clipboard with fallback
  const handleCopy = async (text: string, id: string, label: string = '') => {
    if (!text) return;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopiedId(id);
      if (label) showToast(`✅ Đã sao chép ${label}`);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
      window.prompt('Sao chép nội dung bên dưới:', text);
    }
  };

  // Generate new password for generator modal
  const handleRegeneratePassword = useCallback(() => {
    const newPass = generateSecurePassword({
      length: genLength,
      useUpper: genUpper,
      useLower: genLower,
      useDigits: genDigits,
      useSymbols: genSymbols,
      avoidAmbiguous: genAvoidAmbiguous,
    });
    setGeneratedPassword(newPass);
  }, [genLength, genUpper, genLower, genDigits, genSymbols, genAvoidAmbiguous]);

  useEffect(() => {
    handleRegeneratePassword();
  }, [handleRegeneratePassword]);

  // Load Data & Custom Folders
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [pRes, fldRes] = await Promise.all([
        fetch('/api/passwords').then((r) => r.json()),
        fetch('/api/passwords/folders').then((r) => r.json()).catch(() => ({ customFolders: [] })),
      ]);

      if (pRes.success) {
        setPasswords(pRes.data || []);
      }
      if (fldRes.customFolders) setCustomFoldersList(fldRes.customFolders || []);
        if (fldRes.folderOrder) setFolderOrderList(fldRes.folderOrder || []);
    } catch (err) {
      console.error('Failed to load passwords:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Global ESC Key and Click Outside Listener
  useEffect(() => {
    function handleGlobalClick(e: MouseEvent) {
      setContextMenu((prev) => (prev.visible ? { ...prev, visible: false } : prev));
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsSearchFocused(false);
      }
    }
    function handleGlobalKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setIsAddModalOpen(false);
        setIsEditModalOpen(false);
        setIsDetailModalOpen(false);
        setIsGeneratorModalOpen(false);
        setIsImportModalOpen(false);
        setIsFolderModalOpen(false);
        setIsSearchFocused(false);
        setContextMenu((prev) => ({ ...prev, visible: false }));
      }
    }
    window.addEventListener('click', handleGlobalClick);
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      window.removeEventListener('click', handleGlobalClick);
      window.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, []);

  // Toggle Folder Open/Close in Tree
  const toggleFolder = (folderPath: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderPath)) next.delete(folderPath);
      else next.add(folderPath);
      return next;
    });
  };

  // Build Multi-Level Recursive Folder Tree Structure (Identical to KeePass tree)
  const folderTree = useMemo(() => {
    return buildRecursiveFolderTree(passwords, customFoldersList, folderOrderList);
  }, [passwords, customFoldersList, folderOrderList]);

  // Universal Multi-Field Search (Searches Globally across ALL folders when query is entered)
  const filteredPasswords = useMemo(() => {
    const q = search.toLowerCase().trim();

    return passwords.filter((p) => {
      // 1. If user is actively searching -> Search GLOBALLY across ALL accounts & folders
      if (q) {
        const fullGroup = (p.groupName || '').toLowerCase();
        const matchTitle = (p.title || '').toLowerCase().includes(q);
        const matchUser = (p.username || '').toLowerCase().includes(q);
        const matchPass = (p.password || '').toLowerCase().includes(q);
        const matchUrl = (p.url || '').toLowerCase().includes(q);
        const matchGroup = fullGroup.includes(q);
        const matchNotes = (p.notes || '').toLowerCase().includes(q);
        const matchCategory = (p.category || '').toLowerCase().includes(q);

        if (!matchTitle && !matchUser && !matchPass && !matchUrl && !matchGroup && !matchNotes && !matchCategory) {
          return false;
        }

        if (favoriteOnly && !p.isFavorite) return false;
        return true;
      }

      // 2. If NOT searching -> Apply selected folder filter
      if (favoriteOnly && !p.isFavorite) return false;

      if (selectedGroupPath !== 'ALL') {
        const itemGroup = (p.groupName || '').trim().toLowerCase();
        const sel = selectedGroupPath.trim().toLowerCase();
        if (!itemGroup.includes(sel) && !sel.includes(itemGroup)) {
          return false;
        }
      }

      return true;
    });
  }, [passwords, search, favoriteOnly, selectedGroupPath]);

  // Load saved splitter width
  useEffect(() => {
    try {
      const savedW = localStorage.getItem('passwords_splitter_width');
      if (savedW) setSidebarWidth(Math.max(180, Math.min(750, parseInt(savedW))));
    } catch {}
  }, []);

  // Handle Splitter Drag to Resize Sidebar Width
  const handleStartResizeSplitter = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingSplitter(true);
    const startX = e.clientX;
    const startW = sidebarWidth;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const newW = Math.max(180, Math.min(750, startW + deltaX));
      setSidebarWidth(newW);
    };

    const onMouseUp = () => {
      setIsResizingSplitter(false);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      try {
        localStorage.setItem('passwords_splitter_width', String(sidebarWidth));
      } catch {}
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  // Handle Drag Start of a Folder
  const handleDragStartFolder = (e: React.DragEvent, folderPath: string) => {
    e.stopPropagation();
    e.dataTransfer.setData('folderPath', folderPath);
    e.dataTransfer.setData('type', 'FOLDER');
    setDraggedFolderPath(folderPath);
    setDraggedType('FOLDER');
  };

  const handleDragStartItem = (e: React.DragEvent, itemId: string) => {
    e.stopPropagation();
    e.dataTransfer.setData('itemId', itemId);
    e.dataTransfer.setData('type', 'ITEM');
    setDraggedItemId(itemId);
    setDraggedType('ITEM');
  };

  // Handle Drag Over a Folder with Before/Inside/After detection for Up/Down Reordering
  const handleDragOverFolder = (e: React.DragEvent, folderPath: string) => {
    e.preventDefault();
    e.stopPropagation();

    const rect = e.currentTarget.getBoundingClientRect();
    const offsetY = e.clientY - rect.top;
    const ratio = offsetY / rect.height;

    let position: 'BEFORE' | 'INSIDE' | 'AFTER' = 'INSIDE';
    if (ratio < 0.3) position = 'BEFORE';
    else if (ratio > 0.7) position = 'AFTER';

    setDragOverTarget({ folderPath, position });
    setDragOverFolder(folderPath);
  };

  // Move Folder Up/Down in Order
  const handleMoveFolderOrder = async (folderPath: string, direction: 'UP' | 'DOWN') => {
    // Get all sibling paths at this level
    const segs = folderPath.split(' / ');
    const parentPath = segs.length > 1 ? segs.slice(0, -1).join(' / ') : '';

    let siblings: string[] = [];
    if (!parentPath) {
      siblings = folderTree.map((n) => n.fullPath);
    } else {
      const findParent = (nodes: FolderNode[]): FolderNode | null => {
        for (const n of nodes) {
          if (n.fullPath === parentPath) return n;
          const found = findParent(n.children);
          if (found) return found;
        }
        return null;
      };
      const pNode = findParent(folderTree);
      if (pNode) siblings = pNode.children.map((c) => c.fullPath);
    }

    const idx = siblings.indexOf(folderPath);
    if (idx === -1) return;
    if (direction === 'UP' && idx === 0) return;
    if (direction === 'DOWN' && idx === siblings.length - 1) return;

    const targetIdx = direction === 'UP' ? idx - 1 : idx + 1;
    const newSiblings = [...siblings];
    const [moved] = newSiblings.splice(idx, 1);
    newSiblings.splice(targetIdx, 0, moved);

    // Merge into global folderOrderList
    const newOrder = [...folderOrderList.filter((p) => !siblings.includes(p)), ...newSiblings];
    setFolderOrderList(newOrder);

    try {
      await fetch('/api/passwords/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'REORDER', orderedPaths: newOrder }),
      });
      showToast(`↕️ Đã di chuyển "${segs[segs.length - 1]}" ${direction === 'UP' ? 'lên trên' : 'xuống dưới'}`);
    } catch {}
  };

  // Handle Drop onto a Folder (Supports: 1. Moving into folder, 2. Reordering Up/Down Before/After, 3. Moving items)
  const handleDropOnFolder = async (e: React.DragEvent, targetFolderPath: string) => {
    e.preventDefault();
    e.stopPropagation();

    const position = dragOverTarget?.position || 'INSIDE';
    setDragOverTarget(null);
    setDragOverFolder(null);

    const type = e.dataTransfer.getData('type') || draggedType;

    // CASE 1: MOVING OR REORDERING A FOLDER
    if (type === 'FOLDER') {
      const sourceFolder = e.dataTransfer.getData('folderPath') || draggedFolderPath;
      if (!sourceFolder) return;
      if (sourceFolder === targetFolderPath) return;

      // Prevent dragging parent into its own child
      if (targetFolderPath !== 'ROOT' && targetFolderPath.startsWith(sourceFolder + ' / ')) {
        alert('Không thể di chuyển thư mục cha vào thư mục con của chính nó!');
        setDraggedFolderPath(null);
        setDraggedType(null);
        return;
      }

      // SUBCASE 1A: Drop Before/After to Reorder Up/Down
      if (position === 'BEFORE' || position === 'AFTER') {
        const sourceSegs = sourceFolder.split(' / ');
        const targetSegs = targetFolderPath.split(' / ');
        const sourceParent = sourceSegs.length > 1 ? sourceSegs.slice(0, -1).join(' / ') : '';
        const targetParent = targetSegs.length > 1 ? targetSegs.slice(0, -1).join(' / ') : '';

        // If from same parent, reorder directly!
        if (sourceParent === targetParent) {
          let siblings: string[] = [];
          if (!targetParent) {
            siblings = folderTree.map((n) => n.fullPath);
          } else {
            const findParent = (nodes: FolderNode[]): FolderNode | null => {
              for (const n of nodes) {
                if (n.fullPath === targetParent) return n;
                const found = findParent(n.children);
                if (found) return found;
              }
              return null;
            };
            const pNode = findParent(folderTree);
            if (pNode) siblings = pNode.children.map((c) => c.fullPath);
          }

          const filtered = siblings.filter((p) => p !== sourceFolder);
          const targetIndex = filtered.indexOf(targetFolderPath);
          const insertIdx = position === 'BEFORE' ? targetIndex : targetIndex + 1;
          filtered.splice(Math.max(0, insertIdx), 0, sourceFolder);

          const newOrder = [...folderOrderList.filter((p) => !siblings.includes(p)), ...filtered];
          setFolderOrderList(newOrder);

          try {
            await fetch('/api/passwords/folders', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'REORDER', orderedPaths: newOrder }),
            });
            showToast(`↕️ Đã đổi thứ tự thư mục "${sourceSegs[sourceSegs.length - 1]}"`);
          } catch {}
          setDraggedFolderPath(null);
          setDraggedType(null);
          return;
        }
      }

      // SUBCASE 1B: Move into folder
      try {
        const res = await fetch('/api/passwords/folders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'MOVE',
            sourcePath: sourceFolder,
            targetParentPath: targetFolderPath,
          }),
        });

        const data = await res.json();
        if (res.ok && data.success) {
          showToast(data.message || '✅ Đã di chuyển vị trí thư mục');
          loadData();
        } else {
          alert(data.error || 'Di chuyển thư mục thất bại');
        }
      } catch {
        alert('Lỗi kết nối khi di chuyển thư mục');
      } finally {
        setDraggedFolderPath(null);
        setDraggedType(null);
      }
      return;
    }

    // CASE 2: MOVING A PASSWORD ITEM INTO A FOLDER
    const itemId = e.dataTransfer.getData('text/plain') || draggedItemId;
    if (!itemId) return;

    const item = passwords.find((p) => p.id === itemId);
    if (!item) return;

    const finalTarget = targetFolderPath === 'ROOT' ? 'Mặc định' : targetFolderPath;
    if (item.groupName === finalTarget) return;

    try {
      const res = await fetch(`/api/passwords/${itemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupName: finalTarget }),
      });

      if (res.ok) {
        setPasswords((prev) => prev.map((p) => (p.id === itemId ? { ...p, groupName: finalTarget } : p)));
        showToast(`✅ Đã chuyển "${item.title}" vào thư mục "${finalTarget}"`);
      } else {
        alert('Không thể di chuyển mật khẩu');
      }
    } catch {
      alert('Lỗi kết nối khi di chuyển');
    } finally {
      setDraggedItemId(null);
      setDraggedType(null);
    }
  };

  // Open Context Menu on Right Click
  const handleContextMenuOnFolder = (e: React.MouseEvent, folderPath: string) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      type: 'FOLDER',
      targetFolder: folderPath,
    });
  };

  const handleContextMenuOnItem = (e: React.MouseEvent, item: PasswordItem) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      type: 'ITEM',
      targetItem: item,
    });
  };

  const handleContextMenuOnTableArea = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      type: 'EMPTY',
    });
  };

  // Upload Icon Image File Handler
  const handleIconFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const base64 = uploadEvent.target?.result as string;
      if (base64) {
        setFolderModalSelectedIcon(base64);
        showToast('🖼️ Đã tải lên icon hình ảnh thành công');
      }
    };
    reader.readAsDataURL(file);
  };

  // Folder Operations: Create / Rename / Delete
  const handleSaveFolderModal = async (e: React.FormEvent) => {
    e.preventDefault();
    const rawName = folderModalInputName.trim();
    if (!rawName) return;

    const iconPrefix = folderModalSelectedIcon ? `${folderModalSelectedIcon} ` : '📁 ';
    let cleanName = rawName.trim();
    const spaceIdx = cleanName.indexOf(' ');
    if (spaceIdx > 0 && spaceIdx <= 4) {
      cleanName = cleanName.slice(spaceIdx + 1).trim();
    }
    const finalFormattedName = `${iconPrefix}${cleanName}`;

    try {
      if (folderModalOldPath) {
        const parts = folderModalOldPath.split(' / ');
        parts[parts.length - 1] = finalFormattedName;
        const newFullPath = parts.join(' / ');

        const res = await fetch('/api/passwords/folders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'RENAME', oldPath: folderModalOldPath, newPath: newFullPath }),
        });
        if (res.ok) {
          showToast(`✏️ Đã đổi tên thư mục thành "${newFullPath}"`);
          setIsFolderModalOpen(false);
          if (selectedGroupPath === folderModalOldPath) setSelectedGroupPath(newFullPath);
          loadData();
        }
      } else {
        const res = await fetch('/api/passwords/folders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'CREATE', folderName: finalFormattedName, parentPath: folderModalParentPath }),
        });
        if (res.ok) {
          showToast(`📁 Đã tạo thư mục "${finalFormattedName}"`);
          setIsFolderModalOpen(false);
          if (folderModalParentPath) {
            setExpandedFolders((prev) => new Set([...Array.from(prev), folderModalParentPath]));
          } else {
            setExpandedFolders((prev) => new Set([...Array.from(prev), finalFormattedName]));
          }
          loadData();
        }
      }
    } catch {
      alert('Thao tác thư mục thất bại');
    }
  };

  const handleDeleteFolder = async (folderPath: string) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa thư mục "${folderPath}"? Các tài khoản mật khẩu bên trong sẽ được chuyển về nhóm Mặc Định.`)) return;
    try {
      const res = await fetch('/api/passwords/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'DELETE', oldPath: folderPath }),
      });
      if (res.ok) {
        showToast(`🗑️ Đã xóa thư mục "${folderPath}"`);
        setCustomFoldersList((prev) => prev.filter((f) => f !== folderPath && !f.startsWith(folderPath + ' / ')));
        if (selectedGroupPath === folderPath || selectedGroupPath.startsWith(folderPath + ' / ')) {
          setSelectedGroupPath('ALL');
        }
        loadData();
      }
    } catch {
      alert('Xóa thư mục thất bại');
    }
  };

  // Toggle visible password
  const toggleShowPassword = (id: string) => {
    setVisiblePasswords((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Toggle Favorite
  const handleToggleFavorite = async (id: string, currentFav: boolean) => {
    try {
      const res = await fetch(`/api/passwords/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isFavorite: !currentFav }),
      });
      if (res.ok) {
        setPasswords((prev) => prev.map((p) => (p.id === id ? { ...p, isFavorite: !currentFav } : p)));
      }
    } catch (err) {
      console.error('Toggle favorite error:', err);
    }
  };

  // Create Password
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/passwords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (res.ok) {
        setIsAddModalOpen(false);
        setFormData(initialForm);
        showToast(`✅ Đã thêm tài khoản mật khẩu "${data.data.title}"`);
        loadData();
      } else {
        alert(data.error || 'Thêm mật khẩu thất bại');
      }
    } catch {
      alert('Lỗi kết nối khi thêm mật khẩu');
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (item: PasswordItem) => {
    setEditingId(item.id);
    setEditFormData({
      title: item.title,
      username: item.username || '',
      password: item.password,
      url: item.url || '',
      category: item.category,
      groupName: item.groupName || '🏢 Văn Phòng Trụ Sở Chính / 🌐 Mạng & Firewall Trụ Sở',
      assetId: item.assetId || '',
      serviceId: item.serviceId || '',
      isFavorite: item.isFavorite,
      totpSecret: item.totpSecret || '',
      notes: item.notes || '',
    });
    setIsEditModalOpen(true);
  };

  // Update Password
  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    try {
      const res = await fetch(`/api/passwords/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editFormData),
      });
      const data = await res.json();
      if (res.ok) {
        setIsEditModalOpen(false);
        setEditingId(null);
        if (selectedPassword?.id === editingId) setSelectedPassword(data.data);
        showToast('✅ Đã cập nhật mật khẩu thành công');
        loadData();
      } else {
        alert(data.error || 'Cập nhật thất bại');
      }
    } catch {
      alert('Lỗi kết nối');
    }
  };

  // Delete Password
  const handleDeletePassword = async (id: string, title: string) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa tài khoản mật khẩu "${title}"?`)) return;
    try {
      const res = await fetch(`/api/passwords/${id}`, { method: 'DELETE' });
      if (res.ok) {
        if (selectedPassword?.id === id) setIsDetailModalOpen(false);
        showToast(`🗑️ Đã xóa "${title}"`);
        loadData();
      } else {
        alert('Xóa thất bại');
      }
    } catch {
      alert('Lỗi kết nối');
    }
  };

  // Download Sample Template for KeePass/Excel (Lazy loaded)
  const handleDownloadSampleTemplate = async () => {
    const ExcelJS = await import('exceljs');
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('KeePass_Import_Template');

    worksheet.columns = [
      { header: 'Thư Mục (Group)', key: 'groupName', width: 40 },
      { header: 'Tiêu Đề / Dịch Vụ (Title) (*)', key: 'title', width: 30 },
      { header: 'Tên Đăng Nhập (Username)', key: 'username', width: 25 },
      { header: 'Mật Khẩu (Password) (*)', key: 'password', width: 25 },
      { header: 'Đường Dẫn Đăng Nhập / IP (URL)', key: 'url', width: 35 },
      { header: 'Phân Loại (Category)', key: 'category', width: 20 },
      { header: 'Ghi Chú (Notes)', key: 'notes', width: 35 },
    ];

    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4338CA' },
    };

    worksheet.addRow({
      groupName: '🏢 Văn Phòng Trụ Sở Chính / 🐧 Máy chủ Linux / Ubuntu',
      title: 'Root Server Ubuntu 24.04 Production',
      username: 'root',
      password: 'P@ssw0rd!Secure2025',
      url: 'ssh://103.142.26.88:22',
      category: 'SERVER',
      notes: 'Server chạy ERP và Postgres chính thức',
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Mau_Import_KeePass_Passwords.xlsx';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Helper function to decode XML entities
  const decodeXml = (str: string) => {
    if (!str) return '';
    return str
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&apos;/g, "'")
      .trim();
  };

  // Submit KeePass Import (Direct Browser-Side High-Speed Decryption & Streaming Save)
  const handleUploadKeePassFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importFile) {
      setImportErrorMsg('Vui lòng chọn file KeePass (.kdbx, .kbdx, .xml, .csv) hoặc Excel (.xlsx)');
      return;
    }

    const fileName = importFile.name.toLowerCase();
    const isKdbx = fileName.endsWith('.kdbx') || fileName.endsWith('.kbdx');

    if (isKdbx && !importMasterPassword && !importKeyFile) {
      setImportErrorMsg('Vui lòng nhập Mật khẩu Master Password để mở file .kdbx');
      return;
    }

    setIsImporting(true);
    setImportResult(null);
    setImportErrorMsg('');

    try {
      const extractedRows: any[] = [];

      // 1. DIRECT BROWSER-SIDE DECRYPTION FOR .KDBX FILES
      if (isKdbx) {
        const fileBuffer = await importFile.arrayBuffer();
        let keyBuffer: Uint8Array | undefined;
        if (importKeyFile) {
          keyBuffer = new Uint8Array(await importKeyFile.arrayBuffer());
        }

        const credentials = new kdbxweb.Credentials(
          kdbxweb.ProtectedValue.fromString(importMasterPassword || ''),
          keyBuffer
        );

        let db: kdbxweb.Kdbx;
        try {
          db = await kdbxweb.Kdbx.load(fileBuffer, credentials);
        } catch (kdbxErr: any) {
          const msg = (kdbxErr.message || '').toLowerCase();
          if (msg.includes('password') || msg.includes('key') || msg.includes('mac') || msg.includes('invalid') || msg.includes('hash')) {
            throw new Error('Mật khẩu Master Password không chính xác. Vui lòng kiểm tra lại mật khẩu mở file KeePass.');
          }
          throw new Error('Không thể giải mã file KDBX: ' + (kdbxErr.message || 'Sai mật khẩu hoặc file bị lỗi'));
        }

        const traverseGroup = (group: kdbxweb.KdbxGroup, parentPath: string[] = []) => {
          const groupName = group.name;
          if ((group as any).isRecycleBin || (groupName && (groupName.toLowerCase().includes('recycle') || groupName.toLowerCase().includes('thùng rác')))) {
            return;
          }

          const currentPath =
            groupName && groupName !== 'Root' && groupName !== 'Database' && groupName !== 'KeePass'
              ? [...parentPath, groupName]
              : parentPath;

          const fullGroupPath = currentPath.length > 0 ? currentPath.join(' / ') : importGroup;

          for (const entry of group.entries) {
            const getField = (key: string) => {
              const val = entry.fields.get(key);
              if (!val) return '';
              if (typeof (val as any).getText === 'function') return (val as any).getText();
              return val.toString();
            };

            const title = getField('Title');
            const username = getField('UserName');
            const password = getField('Password');
            const url = getField('URL');
            let notes = getField('Notes');
            const totp = getField('TOTP Seed') || getField('otp') || getField('totp') || '';

            const customFields: string[] = [];
            for (const [k, v] of entry.fields) {
              if (['Title', 'UserName', 'Password', 'URL', 'Notes', 'TOTP Seed', 'otp', 'totp'].includes(k)) continue;
              const valStr = typeof (v as any).getText === 'function' ? (v as any).getText() : v?.toString();
              if (valStr) customFields.push(`${k}: ${valStr}`);
            }

            if (customFields.length > 0) {
              notes = notes ? `${notes}\n\n[Thông tin mở rộng]\n${customFields.join('\n')}` : customFields.join('\n');
            }

            if (title || password || username) {
              extractedRows.push({
                title: title || 'Tài khoản KDBX',
                username: username || null,
                password: password || '123456',
                url: url || null,
                groupName: fullGroupPath,
                notes: notes || null,
                totpSecret: totp || null,
              });
            }
          }

          for (const sub of group.groups) {
            traverseGroup(sub, currentPath);
          }
        };

        traverseGroup(db.getDefaultGroup());
      }
      // 2. DIRECT BROWSER-SIDE PARSING FOR .XML FILES
      else if (fileName.endsWith('.xml')) {
        const xmlText = await importFile.text();
        const tagRegex = /<Group>|<\/Group>|<Name>([\s\S]*?)<\/Name>|<Entry>([\s\S]*?)<\/Entry>/gi;
        let match;
        const groupStack: Array<{ name: string; isNamed: boolean }> = [];

        while ((match = tagRegex.exec(xmlText)) !== null) {
          const fullTag = match[0];

          if (fullTag.startsWith('<Group>')) {
            groupStack.push({ name: '', isNamed: false });
          } else if (fullTag.startsWith('</Group>')) {
            if (groupStack.length > 0) groupStack.pop();
          } else if (match[1] !== undefined) {
            if (groupStack.length > 0 && !groupStack[groupStack.length - 1].isNamed) {
              groupStack[groupStack.length - 1].name = decodeXml(match[1]);
              groupStack[groupStack.length - 1].isNamed = true;
            }
          } else if (match[2] !== undefined) {
            const entryContent = match[2];
            const stringRegex = /<String>\s*<Key>([^<]+)<\/Key>\s*<Value[^>]*>([^<]*)<\/Value>\s*<\/String>/gi;
            let sMatch;
            const entryData: Record<string, string> = {};

            while ((sMatch = stringRegex.exec(entryContent)) !== null) {
              entryData[decodeXml(sMatch[1])] = decodeXml(sMatch[2]);
            }

            const title = entryData.Title || '';
            const username = entryData.UserName || entryData.Username || '';
            const password = entryData.Password || '';
            const url = entryData.URL || entryData.Url || '';
            const notes = entryData.Notes || '';

            const isRecycleBin = groupStack.some(
              (g) => g.name.toLowerCase().includes('recycle') || g.name.toLowerCase().includes('thùng rác')
            );

            if (!isRecycleBin && (title || password || username)) {
              const names = groupStack
                .map((g) => g.name.trim())
                .filter((n) => n && n !== 'Root' && n !== 'Database' && n !== 'KeePass');
              const fullGroupPath = names.length > 0 ? names.join(' / ') : importGroup;

              extractedRows.push({
                title: title || 'KeePass Item',
                username: username || null,
                password: password || '123456',
                url: url || null,
                groupName: fullGroupPath,
                notes: notes || null,
              });
            }
          }
        }
      }
      // 3. DIRECT PARSING FOR .CSV / .XLSX
      else if (fileName.endsWith('.csv') || fileName.endsWith('.txt')) {
        const text = await importFile.text();
        const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
        for (let i = 1; i < lines.length; i++) {
          const parts = lines[i].split(',').map((p) => p.replace(/^"|"$/g, '').trim());
          if (parts[0] || parts[1]) {
            extractedRows.push({
              title: parts[1] || parts[0],
              username: parts[2] || '',
              password: parts[3] || '123456',
              url: parts[4] || '',
              groupName: parts[0] || importGroup,
              notes: parts[5] || '',
            });
          }
        }
      }

      if (extractedRows.length === 0) {
        throw new Error('Không tìm thấy tài khoản hợp lệ nào trong file để nhập');
      }

      // SEND CLEAN EXTRACTED ARRAY TO SERVER IN CHUNKS (Guaranteed 100% success for any file size!)
      const CHUNK_SIZE = 300;
      let totalImported = 0;
      let totalGroups = new Set<string>();

      for (let i = 0; i < extractedRows.length; i += CHUNK_SIZE) {
        const chunk = extractedRows.slice(i, i + CHUNK_SIZE);
        const res = await fetch('/api/passwords/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            rows: chunk,
            defaultGroup: importGroup,
          }),
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Lỗi khi lưu dữ liệu lên server');
        }
        totalImported += (data.successCount || chunk.length);
        if (Array.isArray(data.groups)) {
          data.groups.forEach((g: string) => totalGroups.add(g));
        }
      }

      setImportResult({
        success: true,
        message: `Đã import thành công ${totalImported}/${extractedRows.length} tài khoản từ file KeePass với ${totalGroups.size} thư mục nhóm.`,
        groupsCount: totalGroups.size,
      });
      setImportErrorMsg('');
      loadData();
    } catch (err: any) {
      setImportErrorMsg(err.message || 'Lỗi nạp file KeePass');
    } finally {
      setIsImporting(false);
    }
  };

  // Export to Excel
  const handleExportExcel = () => {
    window.open('/api/passwords/export', '_blank');
  };

  return (
    <div className="space-y-3 relative" onContextMenu={handleContextMenuOnTableArea}>
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-2xl shadow-xl border border-slate-700 text-xs font-semibold flex items-center gap-2 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 pb-2.5 border-b border-slate-200">
        <div>
          <h1 className="text-lg font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <span className="p-1.5 bg-gradient-to-tr from-indigo-600 to-purple-600 text-white rounded-xl shadow-xs">
              <Lock className="w-4 h-4" />
            </span>
            <span>{isEn ? 'Password & Credentials Vault' : 'Quản Lý Tài Khoản Mật Khẩu'}</span>
          </h1>
          <p className="text-[11px] text-slate-500 font-medium">
            Quản lý theo Thư mục KeePass, hỗ trợ icon tùy chọn & tải lên icon ảnh, kéo thả di chuyển ✋
          </p>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Add Folder Button */}
          <button
            type="button"
            onClick={() => {
              setFolderModalParentPath('');
              setFolderModalOldPath('');
              setFolderModalInputName('');
              setFolderModalSelectedIcon('📁');
              setIsFolderModalOpen(true);
            }}
            className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
            title="Thêm thư mục mới với icon tùy chọn hoặc tải lên"
          >
            <FolderPlus className="w-3.5 h-3.5 text-indigo-600" />
            <span>{isEn ? '+ Add Folder' : '+ Thêm Thư Mục'}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsGeneratorModalOpen(true)}
            className="px-2.5 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-xl text-xs font-bold flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
          >
            <Dices className="w-3.5 h-3.5 text-purple-600" />
            <span>{isEn ? 'Generate Password' : 'Tạo Mật Khẩu'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setImportFile(null);
              setImportResult(null);
              setIsImportModalOpen(true);
            }}
            className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5 text-slate-600" />
            <span>{isEn ? 'Import KeePass' : 'Import KeePass'}</span>
          </button>

          {/* Buttons Mật Khẩu Cấp 2 & Khóa Kho */}
          <button
            type="button"
            onClick={handleOpenChangeSecPw}
            title="Đổi hoặc thiết lập Mật khẩu cấp 2 của riêng tài khoản bạn"
            className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
          >
            <KeyRound className="w-3.5 h-3.5 text-purple-600" />
            <span>{isEn ? 'Master Password' : 'Mật Khẩu Cấp 2'}</span>
          </button>

          <button
            type="button"
            onClick={handleLockVault}
            title="Khóa kho mật khẩu ngay lập tức"
            className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
          >
            <Lock className="w-3.5 h-3.5 text-amber-700" />
            <span>{isEn ? 'Lock Vault' : 'Khóa Kho'}</span>
          </button>

          <button
            type="button"
            onClick={handleExportExcel}
            className="px-2.5 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600" />
            <span>{isEn ? 'Export Excel' : 'Xuất Excel'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setFormData({
                ...initialForm,
                groupName: selectedGroupPath !== 'ALL' ? selectedGroupPath : initialForm.groupName,
              });
              setIsAddModalOpen(true);
            }}
            className="px-3.5 py-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{isEn ? '+ Add Password' : '+ Thêm Mật Khẩu'}</span>
          </button>
        </div>
      </div>

      {/* Main KeePass Split Pane Layout (Draggable Splitter Bar) */}
      <div className="flex flex-col md:flex-row items-stretch gap-0 bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden relative select-none">
        
        {/* LEFT PANE: KeePass Folder Tree (Resizable Width via Splitter) */}
        <div
          style={{ width: `${sidebarWidth}px` }}
          className="shrink-0 flex flex-col bg-slate-50/70 border-r border-slate-200/80 min-w-[180px] max-w-[750px]"
        >
          {/* Tree Header */}
          <div className="p-3 border-b border-slate-200 bg-slate-100/60 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <FolderOpen className="w-4 h-4 text-indigo-600" />
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">{isEn ? 'Folder Tree' : 'Cây Thư Mục'}</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setFolderModalParentPath('');
                setFolderModalOldPath('');
                setFolderModalInputName('');
                setFolderModalSelectedIcon('📁');
                setIsFolderModalOpen(true);
              }}
              className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-0.5 cursor-pointer"
            >
              <Plus className="w-3 h-3" />
              <span>Thư mục</span>
            </button>
          </div>

          {/* Root Level Filters */}
          <div className="p-2 space-y-1 border-b border-slate-200/60">
            <button
              type="button"
              onClick={() => {
                setSelectedGroupPath('ALL');
                setFavoriteOnly(false);
              }}
              onDragOver={(e) => handleDragOverFolder(e, 'ROOT')}
              onDragLeave={() => setDragOverFolder(null)}
              onDrop={(e) => handleDropOnFolder(e, 'ROOT')}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedGroupPath === 'ALL' && !favoriteOnly
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'text-slate-700 hover:bg-slate-200/60'
              }`}
            >
              <div className="flex items-center gap-2">
                <Layers className="w-3.5 h-3.5" />
                <span>{isEn ? 'All Passwords' : 'Tất cả tài khoản'}</span>
              </div>
              <span className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-md ${selectedGroupPath === 'ALL' && !favoriteOnly ? 'bg-indigo-700 text-white' : 'bg-slate-200 text-slate-600'}`}>
                {passwords.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setFavoriteOnly(!favoriteOnly)}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                favoriteOnly ? 'bg-amber-500 text-white shadow-2xs' : 'text-slate-700 hover:bg-slate-200/60'
              }`}
            >
              <div className="flex items-center gap-2">
                <Star className={`w-3.5 h-3.5 ${favoriteOnly ? 'fill-white text-white' : 'text-amber-500'}`} />
                <span>{isEn ? 'Favorites' : 'Yêu thích'}</span>
              </div>
              <span className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-md ${favoriteOnly ? 'bg-amber-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                {passwords.filter((p) => p.isFavorite).length}
              </span>
            </button>
          </div>

          {/* Tree Scrollable Container */}
          <div className="flex-1 overflow-y-auto p-2 space-y-0.5 max-h-[calc(100vh-230px)] scrollbar-thin scrollbar-thumb-slate-300">
            {folderTree.length === 0 && (
              <div className="p-4 text-center border border-dashed border-slate-200 rounded-xl bg-white/60 space-y-1.5 my-2">
                <Folder className="w-5 h-5 text-slate-400 mx-auto" />
                <p className="text-[11px] font-bold text-slate-600">Chưa có thư mục</p>
                <p className="text-[10px] text-slate-400">Import file KeePass (.kdbx) để tự động nạp cây thư mục.</p>
              </div>
            )}

            {/* Recursive Tree Node Renderer */}
            {(() => {
              const renderNode = (node: FolderNode, level: number = 0) => {
                const isSelected = selectedGroupPath === node.fullPath && !favoriteOnly;
                const isExpanded = expandedFolders.has(node.id) || selectedGroupPath === node.fullPath || (selectedGroupPath && selectedGroupPath.startsWith(node.fullPath + ' / '));
                const isDragTarget = dragOverTarget?.folderPath === node.fullPath;
                const dropPos = isDragTarget ? dragOverTarget?.position : null;
                const hasChildren = node.children.length > 0;

                return (
                  <div key={node.id} className="space-y-0.5 relative">
                    {/* Top Insert Line */}
                    {isDragTarget && dropPos === 'BEFORE' && (
                      <div className="absolute top-0 left-1 right-1 h-1 bg-indigo-600 rounded-full z-20 shadow-xs" />
                    )}

                    <div
                      onClick={() => {
                        setSelectedGroupPath(node.fullPath);
                        setFavoriteOnly(false);
                      }}
                      onContextMenu={(e) => handleContextMenuOnFolder(e, node.fullPath)}
                      onDragOver={(e) => handleDragOverFolder(e, node.fullPath)}
                      onDragLeave={() => {
                        if (dragOverTarget?.folderPath === node.fullPath) {
                          setDragOverTarget(null);
                          setDragOverFolder(null);
                        }
                      }}
                      onDrop={(e) => handleDropOnFolder(e, node.fullPath)}
                      draggable={true}
                      onDragStart={(e) => handleDragStartFolder(e, node.fullPath)}
                      style={{ paddingLeft: `${level * 14 + 6}px` }}
                      title={`${node.fullPath} (${node.totalCount} tài khoản)`}
                      className={`w-full flex items-center justify-between pr-2 py-1.5 rounded-lg text-xs transition-all cursor-pointer group relative ${
                        isDragTarget && dropPos === 'INSIDE'
                          ? 'bg-indigo-200 ring-2 ring-indigo-600 font-bold'
                          : isSelected
                          ? 'bg-indigo-600 text-white font-bold shadow-2xs'
                          : 'hover:bg-slate-200/70 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 truncate flex-1 min-w-0 pr-1">
                        {hasChildren ? (
                          <button
                            type="button"
                            onClick={(e) => toggleFolder(node.id, e)}
                            className={`p-0.5 rounded transition-colors cursor-pointer shrink-0 ${isSelected ? 'text-white/80 hover:text-white' : 'text-slate-400 hover:text-slate-700'}`}
                          >
                            {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                          </button>
                        ) : (
                          <span className="w-3.5 shrink-0" />
                        )}

                        {renderFolderIcon(node.iconStr)}
                        <span className={`truncate text-[11px] ${isSelected ? 'text-white' : 'text-slate-800 font-medium'}`}>
                          {node.name}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {/* Hover Quick Actions */}
                        <div className="hidden group-hover:flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => handleMoveFolderOrder(node.fullPath, 'UP')}
                            title="Di chuyển lên trên"
                            className={`p-0.5 rounded cursor-pointer ${isSelected ? 'text-white hover:bg-indigo-700' : 'text-slate-400 hover:text-indigo-600 hover:bg-slate-200'}`}
                          >
                            <ArrowUp className="w-2.5 h-2.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveFolderOrder(node.fullPath, 'DOWN')}
                            title="Di chuyển xuống dưới"
                            className={`p-0.5 rounded cursor-pointer ${isSelected ? 'text-white hover:bg-indigo-700' : 'text-slate-400 hover:text-indigo-600 hover:bg-slate-200'}`}
                          >
                            <ArrowDown className="w-2.5 h-2.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setFolderModalParentPath(node.fullPath);
                              setFolderModalOldPath('');
                              setFolderModalInputName('');
                              setFolderModalSelectedIcon('📁');
                              setIsFolderModalOpen(true);
                            }}
                            title="Thêm thư mục con"
                            className={`p-0.5 rounded cursor-pointer ${isSelected ? 'text-white hover:bg-indigo-700' : 'text-slate-400 hover:text-indigo-600 hover:bg-slate-200'}`}
                          >
                            <Plus className="w-2.5 h-2.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setFolderModalOldPath(node.fullPath);
                              setFolderModalParentPath('');
                              setFolderModalInputName(node.name);
                              setFolderModalSelectedIcon(node.iconStr || '📁');
                              setIsFolderModalOpen(true);
                            }}
                            title="Đổi tên & icon"
                            className={`p-0.5 rounded cursor-pointer ${isSelected ? 'text-white hover:bg-indigo-700' : 'text-slate-400 hover:text-amber-500 hover:bg-slate-200'}`}
                          >
                            <Edit2 className="w-2.5 h-2.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteFolder(node.fullPath)}
                            title="Xóa thư mục"
                            className={`p-0.5 rounded cursor-pointer ${isSelected ? 'text-white hover:bg-indigo-700' : 'text-slate-400 hover:text-rose-600 hover:bg-slate-200'}`}
                          >
                            <Trash2 className="w-2.5 h-2.5" />
                          </button>
                        </div>

                        <span className={`text-[10px] font-mono px-1 rounded ${isSelected ? 'text-indigo-100 font-bold bg-indigo-700' : 'text-slate-400 font-semibold'}`}>
                          {node.totalCount}
                        </span>
                      </div>
                    </div>

                    {/* Bottom Insert Line */}
                    {isDragTarget && dropPos === 'AFTER' && (
                      <div className="absolute bottom-0 left-1 right-1 h-1 bg-indigo-600 rounded-full z-20 shadow-xs" />
                    )}

                    {/* Children */}
                    {isExpanded && hasChildren && (
                      <div className="space-y-0.5 border-l border-slate-300/70 ml-3.5">
                        {node.children.map((child) => renderNode(child, level + 1))}
                      </div>
                    )}
                  </div>
                );
              };

              return folderTree.map((rootNode) => renderNode(rootNode, 0));
            })()}
          </div>
        </div>

        {/* VERTICAL SPLITTER DRAG BAR (KeePass Style) */}
        <div
          onMouseDown={handleStartResizeSplitter}
          title="Kéo sang trái/phải để thay đổi độ rộng cột thư mục"
          className={`w-2 relative -mx-0.5 flex items-center justify-center cursor-col-resize select-none group/splitter z-20 hover:bg-indigo-100 transition-colors ${
            isResizingSplitter ? 'bg-indigo-300' : 'bg-slate-200'
          }`}
        >
          <div className="w-[2px] h-full bg-slate-300 group-hover/splitter:bg-indigo-500" />
        </div>

        {/* RIGHT PANE: KeePass Accounts Table & Search View */}
        <div className="flex-1 flex flex-col min-w-0 bg-white">
          {/* Top Search & Breadcrumb Bar */}
          <div className="p-3 border-b border-slate-200 bg-slate-50/50 space-y-2">
            <div className="flex items-center justify-between gap-3">
              {/* Instant Search Bar */}
              <div className="relative flex-1 min-w-0">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={isEn ? "Fast search by IP, Host, Port, Folder, Username, Title..." : "Tìm kiếm siêu tốc theo IP, Host, Port, Thư mục, Username, Tiêu đề..."}
                  className="w-full pl-9 pr-8 py-2 bg-white border border-slate-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-800 shadow-2xs"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="px-3 py-1.5 bg-indigo-50 border border-indigo-200 rounded-xl text-xs font-bold text-indigo-700 font-mono shrink-0">
                {filteredPasswords.length} / {passwords.length} {isEn ? 'accounts' : 'tài khoản'}
              </div>
            </div>

            {/* Breadcrumb Navigation Path */}
            {selectedGroupPath !== 'ALL' && (
              <div className="flex items-center gap-1.5 flex-wrap text-xs text-slate-600 font-medium">
                <Folder className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <button
                  type="button"
                  onClick={() => setSelectedGroupPath('ALL')}
                  className="hover:underline text-indigo-600 cursor-pointer"
                >
                  {isEn ? 'All Folders' : 'Tất cả thư mục'}
                </button>
                {selectedGroupPath.split(' / ').map((seg, idx, arr) => {
                  const partialPath = arr.slice(0, idx + 1).join(' / ');
                  const isLast = idx === arr.length - 1;
                  return (
                    <React.Fragment key={partialPath}>
                      <ChevronRight className="w-3 h-3 text-slate-400 shrink-0" />
                      {isLast ? (
                        <span className="font-bold text-slate-900 bg-slate-200/80 px-1.5 py-0.5 rounded text-[11px]">
                          {seg}
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setSelectedGroupPath(partialPath)}
                          className="hover:underline text-slate-700 cursor-pointer text-[11px]"
                        >
                          {seg}
                        </button>
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            )}
          </div>

          {/* High-Density KeePass Table */}
          <div className="flex-1 overflow-x-auto overflow-y-auto max-h-[calc(100vh-270px)] scrollbar-thin">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="sticky top-0 z-10 bg-slate-100/95 backdrop-blur-xs text-slate-600 text-[11px] font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="w-8 px-2 py-2.5 text-center">⭐</th>
                  <th className="px-3 py-2.5">Tiêu đề (Title)</th>
                  <th className="px-3 py-2.5">Tên đăng nhập (User Name)</th>
                  <th className="px-3 py-2.5">Mật khẩu (Password)</th>
                  <th className="px-3 py-2.5">Đường dẫn / IP / Host (URL)</th>
                  <th className="px-3 py-2.5">Ghi chú (Notes)</th>
                  <th className="w-24 px-3 py-2.5 text-right">{isEn ? 'Actions' : 'Thao tác'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {filteredPasswords.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-slate-400 space-y-2">
                      <Lock className="w-8 h-8 text-slate-300 mx-auto" />
                      <p className="font-semibold text-xs text-slate-600">Không tìm thấy tài khoản nào</p>
                      <p className="text-[11px]">Bấm "+ Thêm Mật Khẩu" hoặc "Import KeePass" để nạp tài khoản.</p>
                    </td>
                  </tr>
                ) : (
                  filteredPasswords.map((item, rowIdx) => {
                    const isVisible = visiblePasswords.has(item.id);
                    const strength = evaluatePasswordStrength(item.password);

                    return (
                      <tr
                        key={item.id}
                        draggable={true}
                        onDragStart={(e) => handleDragStartItem(e, item.id)}
                        onContextMenu={(e) => handleContextMenuOnItem(e, item)}
                        onClick={() => {
                          setSelectedPassword(item);
                          setIsDetailModalOpen(true);
                        }}
                        className={`transition-colors cursor-pointer group hover:bg-indigo-50/50 ${
                          rowIdx % 2 === 1 ? 'bg-slate-50/40' : 'bg-white'
                        }`}
                      >
                        {/* Favorite Star */}
                        <td className="px-2 py-2 text-center" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => handleToggleFavorite(item.id, item.isFavorite)}
                            className="text-slate-300 hover:text-amber-500 cursor-pointer"
                          >
                            <Star
                              className={`w-3.5 h-3.5 ${
                                item.isFavorite ? 'text-amber-500 fill-amber-500' : ''
                              }`}
                            />
                          </button>
                        </td>

                        {/* Title (KeePass Key Icon) */}
                        <td className="px-3 py-2 min-w-[160px]">
                          <div className="flex items-center gap-1.5">
                            <span className="text-amber-500 shrink-0 text-sm leading-none">🔑</span>
                            <span className="font-bold text-slate-900 text-xs truncate">{item.title}</span>
                          </div>
                        </td>

                        {/* User Name */}
                        <td className="px-3 py-2 min-w-[130px]">
                          {item.username ? (
                            <div className="flex items-center gap-1.5 group/copy font-mono text-[11px] text-slate-700">
                              <span className="truncate">{item.username}</span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  copyToClipboard(item.username || '', 'Tên đăng nhập');
                                }}
                                title="Copy Username"
                                className="opacity-0 group-hover/copy:opacity-100 text-slate-400 hover:text-indigo-600 transition-opacity cursor-pointer shrink-0"
                              >
                                <Copy className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <span className="text-slate-300 text-[11px]">—</span>
                          )}
                        </td>

                        {/* Password */}
                        <td className="px-3 py-2 min-w-[150px]">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-xs font-bold text-slate-900 tracking-wider">
                              {isVisible ? item.password : '••••••••'}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleShowPassword(item.id);
                              }}
                              title={isVisible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                              className="text-slate-400 hover:text-indigo-600 cursor-pointer shrink-0"
                            >
                              {isVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                copyToClipboard(item.password, 'Mật khẩu');
                              }}
                              title="Copy Mật khẩu"
                              className="text-slate-400 hover:text-emerald-600 cursor-pointer shrink-0"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>

                        {/* URL / IP / Host */}
                        <td className="px-3 py-2 min-w-[150px]">
                          {item.url ? (
                            <div className="flex items-center gap-1.5 group/url font-mono text-[11px] text-indigo-700">
                              <span className="truncate max-w-[200px]">{item.url}</span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  copyToClipboard(item.url || '', 'Đường dẫn / IP');
                                }}
                                title="Copy IP / URL"
                                className="opacity-0 group-hover/url:opacity-100 text-slate-400 hover:text-indigo-600 cursor-pointer shrink-0"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                              <a
                                href={item.url.startsWith('http') ? item.url : `https://${item.url}`}
                                target="_blank"
                                rel="noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="opacity-0 group-hover/url:opacity-100 text-slate-400 hover:text-indigo-600 cursor-pointer shrink-0"
                              >
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            </div>
                          ) : (
                            <span className="text-slate-300 text-[11px]">—</span>
                          )}
                        </td>

                        {/* Notes */}
                        <td className="px-3 py-2 min-w-[140px] text-slate-500 text-[11px]">
                          {item.notes ? (
                            <span className="truncate block max-w-[220px]" title={item.notes}>
                              {item.notes.split('\n')[0]}
                            </span>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>

                        {/* Action Buttons */}
                        <td className="px-3 py-2 text-right">
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedPassword(item);
                                setIsDetailModalOpen(true);
                              }}
                              title={isEn ? 'View Details' : 'Xem chi tiết'}
                              className="p-1 text-slate-400 hover:text-indigo-600 rounded hover:bg-slate-100 cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenEdit(item);
                              }}
                              title={isEn ? 'Edit' : 'Chỉnh sửa'}
                              className="p-1 text-slate-400 hover:text-amber-600 rounded hover:bg-slate-100 cursor-pointer"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeletePassword(item.id, item.title);
                              }}
                              title={isEn ? 'Delete' : 'Xóa'}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-slate-100 cursor-pointer"
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
      </div>

      {/* CONTEXT MENU (RIGHT-CLICK POPUP) */}
      {contextMenu.visible && (
        <div
          className="fixed z-50 bg-white border border-slate-200 rounded-2xl shadow-2xl py-1.5 min-w-[220px] text-xs space-y-0.5 animate-in fade-in zoom-in-95 duration-100"
          style={{ top: Math.min(contextMenu.y, window.innerHeight - 250), left: Math.min(contextMenu.x, window.innerWidth - 240) }}
          onClick={(e) => e.stopPropagation()}
        >
          {contextMenu.type === 'FOLDER' && contextMenu.targetFolder && (
            <>
              <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 truncate">
                📁 {contextMenu.targetFolder}
              </div>
              <button
                type="button"
                onClick={() => {
                  setFormData({
                    ...initialForm,
                    groupName: contextMenu.targetFolder || initialForm.groupName,
                  });
                  setIsAddModalOpen(true);
                  setContextMenu((prev) => ({ ...prev, visible: false }));
                }}
                className="w-full text-left px-3 py-2 hover:bg-indigo-50 text-indigo-700 font-bold flex items-center gap-2 cursor-pointer transition-colors"
              >
                <Plus className="w-3.5 h-3.5 text-indigo-600" />
                <span>+ Thêm mật khẩu vào đây</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setFolderModalParentPath(contextMenu.targetFolder || '');
                  setFolderModalOldPath('');
                  setFolderModalInputName('');
                  setFolderModalSelectedIcon('📁');
                  setIsFolderModalOpen(true);
                  setContextMenu((prev) => ({ ...prev, visible: false }));
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-slate-50 text-slate-700 font-semibold flex items-center gap-2 cursor-pointer transition-colors"
              >
                <FolderPlus className="w-3.5 h-3.5 text-indigo-500" />
                <span>Tạo thư mục mới</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  const parts = (contextMenu.targetFolder || '').split(' / ');
                  const lastPart = parts[parts.length - 1];
                  const parsed = parseFolderDisplay(lastPart);
                  setFolderModalOldPath(contextMenu.targetFolder || '');
                  setFolderModalParentPath('');
                  setFolderModalInputName(parsed.name);
                  setFolderModalSelectedIcon(parsed.icon || '📁');
                  setIsFolderModalOpen(true);
                  setContextMenu((prev) => ({ ...prev, visible: false }));
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-amber-50 text-amber-700 font-semibold flex items-center gap-2 cursor-pointer transition-colors"
              >
                <Edit2 className="w-3.5 h-3.5 text-amber-600" />
                <span>Đổi tên & Icon thư mục</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  handleDeleteFolder(contextMenu.targetFolder || '');
                  setContextMenu((prev) => ({ ...prev, visible: false }));
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-rose-50 text-rose-600 font-semibold flex items-center gap-2 cursor-pointer border-t border-slate-100 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                <span>Xóa thư mục này</span>
              </button>
            </>
          )}

          {contextMenu.type === 'ITEM' && contextMenu.targetItem && (
            <>
              <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 truncate flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <span className="truncate">{contextMenu.targetItem.title}</span>
              </div>

              {/* Copy Password */}
              <button
                type="button"
                onClick={() => {
                  handleCopy(contextMenu.targetItem!.password, 'cm_pass', 'Mật khẩu');
                  setContextMenu((prev) => ({ ...prev, visible: false }));
                }}
                className="w-full text-left px-3 py-2 hover:bg-indigo-50 text-indigo-700 font-bold flex items-center gap-2 cursor-pointer transition-colors"
              >
                <Copy className="w-4 h-4 text-indigo-600" />
                <span>Sao chép Mật Khẩu (Password)</span>
              </button>

              {/* Copy Username */}
              {contextMenu.targetItem.username && (
                <button
                  type="button"
                  onClick={() => {
                    handleCopy(contextMenu.targetItem!.username || '', 'cm_user', 'Tên đăng nhập');
                    setContextMenu((prev) => ({ ...prev, visible: false }));
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-slate-50 text-slate-700 font-semibold flex items-center gap-2 cursor-pointer transition-colors"
                >
                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                  <span>Sao chép Tên Đăng Nhập</span>
                </button>
              )}

              {/* Copy URL / IP */}
              {contextMenu.targetItem.url && (
                <button
                  type="button"
                  onClick={() => {
                    handleCopy(contextMenu.targetItem!.url || '', 'cm_url', 'Đường dẫn / IP');
                    setContextMenu((prev) => ({ ...prev, visible: false }));
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-slate-50 text-slate-700 font-semibold flex items-center gap-2 cursor-pointer transition-colors"
                >
                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                  <span>Sao chép Đường Dẫn / IP</span>
                </button>
              )}

              {/* View Details */}
              <button
                type="button"
                onClick={() => {
                  setSelectedPassword(contextMenu.targetItem!);
                  setIsDetailModalOpen(true);
                  setContextMenu((prev) => ({ ...prev, visible: false }));
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-slate-50 text-slate-800 font-semibold flex items-center gap-2 cursor-pointer transition-colors border-t border-slate-100"
              >
                <Eye className="w-3.5 h-3.5 text-indigo-600" />
                <span>{isEn ? 'View Details' : 'Xem chi tiết'}</span>
              </button>

              {/* Open URL */}
              {contextMenu.targetItem.url && (
                <a
                  href={contextMenu.targetItem.url.startsWith('http') || contextMenu.targetItem.url.startsWith('ssh') ? contextMenu.targetItem.url : `https://${contextMenu.targetItem.url}`}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => setContextMenu((prev) => ({ ...prev, visible: false }))}
                  className="w-full text-left px-3 py-1.5 hover:bg-slate-50 text-slate-700 font-semibold flex items-center gap-2 cursor-pointer transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                  <span>Mở URL / IP trong tab mới</span>
                </a>
              )}

              {/* Edit */}
              <button
                type="button"
                onClick={() => {
                  handleOpenEdit(contextMenu.targetItem!);
                  setContextMenu((prev) => ({ ...prev, visible: false }));
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-amber-50 text-amber-700 font-semibold flex items-center gap-2 cursor-pointer transition-colors border-t border-slate-100"
              >
                <Edit2 className="w-3.5 h-3.5 text-amber-600" />
                <span>{isEn ? 'Edit Information' : 'Chỉnh sửa thông tin'}</span>
              </button>

              {/* Delete */}
              <button
                type="button"
                onClick={() => {
                  handleDeletePassword(contextMenu.targetItem!.id, contextMenu.targetItem!.title);
                  setContextMenu((prev) => ({ ...prev, visible: false }));
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-rose-50 text-rose-600 font-semibold flex items-center gap-2 cursor-pointer transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                <span>Xóa mật khẩu</span>
              </button>
            </>
          )}

          {contextMenu.type === 'EMPTY' && (
            <>
              <button
                type="button"
                onClick={() => {
                  setFormData(initialForm);
                  setIsAddModalOpen(true);
                  setContextMenu((prev) => ({ ...prev, visible: false }));
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-indigo-50 text-indigo-700 font-bold flex items-center gap-2 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-indigo-600" />
                <span>+ Thêm mật khẩu mới</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsGeneratorModalOpen(true);
                  setContextMenu((prev) => ({ ...prev, visible: false }));
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-purple-50 text-purple-700 font-semibold flex items-center gap-2 cursor-pointer"
              >
                <Dices className="w-3.5 h-3.5 text-purple-600" />
                <span>Tạo mật khẩu ngẫu nhiên</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setFolderModalParentPath('');
                  setFolderModalOldPath('');
                  setFolderModalInputName('');
                  setFolderModalSelectedIcon('📁');
                  setIsFolderModalOpen(true);
                  setContextMenu((prev) => ({ ...prev, visible: false }));
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-slate-50 text-slate-700 font-semibold flex items-center gap-2 cursor-pointer"
              >
                <FolderPlus className="w-3.5 h-3.5 text-indigo-600" />
                <span>+ Thêm thư mục</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  loadData();
                  showToast('🔄 Đã làm mới danh sách');
                  setContextMenu((prev) => ({ ...prev, visible: false }));
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-slate-50 text-slate-700 font-semibold flex items-center gap-2 cursor-pointer border-t border-slate-100"
              >
                <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
                <span>Làm mới danh sách</span>
              </button>
            </>
          )}
        </div>
      )}

      {/* FOLDER CREATE / EDIT MODAL */}
      {isFolderModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <FolderPlus className="w-4 h-4 text-indigo-600" />
                <span>
                  {folderModalOldPath
                    ? `Sửa Thư Mục "${folderModalOldPath}"`
                    : folderModalParentPath
                    ? `Tạo Thư Mục Trong "${folderModalParentPath}"`
                    : 'Tạo Thư Mục Mới'}
                </span>
              </h3>
              <button onClick={() => setIsFolderModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveFolderModal} className="space-y-4 text-xs">
              {/* Icon Selection with 3 Tabs */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-bold text-slate-700">Biểu Tượng (Icon) Thư Mục</label>
                  <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-[10px] font-bold">
                    <button
                      type="button"
                      onClick={() => setFolderIconMode('PALETTE')}
                      className={`px-2 py-0.5 rounded-md cursor-pointer transition-colors ${
                        folderIconMode === 'PALETTE' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-500'
                      }`}
                    >
                      Kho Icon
                    </button>
                    <button
                      type="button"
                      onClick={() => setFolderIconMode('UPLOAD')}
                      className={`px-2 py-0.5 rounded-md cursor-pointer transition-colors ${
                        folderIconMode === 'UPLOAD' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-500'
                      }`}
                    >
                      Tải Lên Ảnh
                    </button>
                    <button
                      type="button"
                      onClick={() => setFolderIconMode('CUSTOM')}
                      className={`px-2 py-0.5 rounded-md cursor-pointer transition-colors ${
                        folderIconMode === 'CUSTOM' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-500'
                      }`}
                    >
                      Dán Emoji
                    </button>
                  </div>
                </div>

                {/* Tab 1: Palette */}
                {folderIconMode === 'PALETTE' && (
                  <div className="grid grid-cols-6 gap-1.5 p-2 bg-slate-50 border border-slate-200 rounded-2xl max-h-32 overflow-y-auto">
                    {POPULAR_ICONS.map((item) => (
                      <button
                        key={item.emoji}
                        type="button"
                        onClick={() => setFolderModalSelectedIcon(item.emoji)}
                        className={`p-1.5 rounded-xl text-base flex items-center justify-center transition-all cursor-pointer ${
                          folderModalSelectedIcon === item.emoji
                            ? 'bg-indigo-600 text-white shadow-xs scale-110'
                            : 'hover:bg-slate-200/70 bg-white border border-slate-200'
                        }`}
                        title={item.label}
                      >
                        {item.emoji}
                      </button>
                    ))}
                  </div>
                )}

                {/* Tab 2: Upload File */}
                {folderIconMode === 'UPLOAD' && (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                    <input
                      ref={folderIconUploadRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleIconFileUpload}
                    />
                    <div
                      onClick={() => folderIconUploadRef.current?.click()}
                      className="p-3 border-2 border-dashed border-indigo-300 hover:border-indigo-500 rounded-xl flex items-center justify-center gap-2 cursor-pointer bg-white text-indigo-700 font-bold text-xs"
                    >
                      <Upload className="w-4 h-4" />
                      <span>Chọn file ảnh icon (.png, .svg, .ico, .jpg)</span>
                    </div>
                    {folderModalSelectedIcon && (folderModalSelectedIcon.startsWith('data:image') || folderModalSelectedIcon.startsWith('http')) && (
                      <div className="flex items-center gap-2 bg-white p-2 border border-slate-200 rounded-xl">
                        <img src={folderModalSelectedIcon} alt="preview" className="w-6 h-6 object-contain rounded" />
                        <span className="text-[11px] text-slate-600 truncate flex-1">Ảnh icon đã chọn</span>
                        <button
                          type="button"
                          onClick={() => setFolderModalSelectedIcon('📁')}
                          className="text-rose-500 hover:underline text-[10px] font-bold cursor-pointer"
                        >{isEn ? 'Delete' : 'Xóa'}</button>
                      </div>
                    )}
                  </div>
                )}

                {/* Tab 3: Custom Text / Emoji Input */}
                {folderIconMode === 'CUSTOM' && (
                  <div className="p-2 bg-slate-50 border border-slate-200 rounded-2xl flex items-center gap-2">
                    <span className="text-sm text-slate-500">Dán ký hiệu:</span>
                    <input
                      type="text"
                      placeholder="Dán bất kỳ emoji hoặc biểu tượng..."
                      value={folderModalSelectedIcon}
                      onChange={(e) => setFolderModalSelectedIcon(e.target.value)}
                      className="flex-1 p-2 bg-white border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Tên Thư Mục (*)</label>
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 flex items-center justify-center bg-indigo-50 border border-indigo-200 rounded-xl shrink-0">
                    {renderFolderIcon(folderModalSelectedIcon)}
                  </div>
                  <input
                    type="text"
                    required
                    autoFocus
                    placeholder="VD: Hạ Tầng Server, Camera, Kế Toán, Chi Nhánh..."
                    value={folderModalInputName}
                    onChange={(e) => setFolderModalInputName(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-900"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsFolderModalOpen(false)}
                  className="px-3 py-1.5 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >{isEn ? 'Cancel' : 'Hủy'}</button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                >
                  💾 Lưu Thư Mục
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DETAIL MODAL */}
      {isDetailModalOpen && selectedPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full flex flex-col border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-indigo-50 to-purple-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-xs">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <span className="font-mono text-[10px] font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded">
                    📁 {selectedPassword.groupName || 'Root'}
                  </span>
                  <h3 className="font-bold text-base text-slate-900 leading-snug mt-0.5">{selectedPassword.title}</h3>
                </div>
              </div>
              <button onClick={() => setIsDetailModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Tên đăng nhập:</span>
                  <button
                    type="button"
                    onClick={() => handleCopy(selectedPassword.username || '', 'd_user', 'Tên đăng nhập')}
                    className="text-indigo-600 font-bold flex items-center gap-1 hover:underline cursor-pointer"
                  >
                    {copiedId === 'd_user' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedId === 'd_user' ? 'Đã copy' : 'Copy'}</span>
                  </button>
                </div>
                <p className="font-mono font-bold text-sm text-slate-900">{selectedPassword.username || '—'}</p>
              </div>

              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Mật khẩu bảo mật:</span>
                  <button
                    type="button"
                    onClick={() => handleCopy(selectedPassword.password, 'd_pass', 'Mật khẩu')}
                    className="text-indigo-600 font-bold flex items-center gap-1 hover:underline cursor-pointer"
                  >
                    {copiedId === 'd_pass' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedId === 'd_pass' ? 'Đã copy' : 'Copy mật khẩu'}</span>
                  </button>
                </div>
                <p className="font-mono font-black text-base text-indigo-950 bg-white p-2.5 border border-slate-200 rounded-xl break-all">
                  {selectedPassword.password}
                </p>
              </div>

              {selectedPassword.url && (
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Đường dẫn truy cập / IP:</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(selectedPassword.url || '', 'd_url', 'Đường dẫn / IP')}
                      className="text-indigo-600 font-bold flex items-center gap-1 hover:underline cursor-pointer"
                    >
                      {copiedId === 'd_url' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedId === 'd_url' ? 'Đã copy' : 'Copy URL/IP'}</span>
                    </button>
                  </div>
                  <div className="flex items-center justify-between gap-2 bg-white p-2.5 border border-slate-200 rounded-xl">
                    <span className="font-mono text-xs font-bold text-indigo-950 truncate flex-1">{selectedPassword.url}</span>
                    <a
                      href={selectedPassword.url.startsWith('http') || selectedPassword.url.startsWith('ssh') ? selectedPassword.url : `https://${selectedPassword.url}`}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer shrink-0"
                      title="Mở liên kết"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              )}

              {selectedPassword.notes && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Ghi chú & Hướng dẫn:</span>
                  <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">{selectedPassword.notes}</p>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsDetailModalOpen(false);
                    handleOpenEdit(selectedPassword);
                  }}
                  className="px-4 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Sửa thông tin</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsDetailModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold cursor-pointer"
                >
                  Đóng (ESC)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PASSWORD GENERATOR MODAL */}
      {isGeneratorModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <Dices className="w-5 h-5 text-purple-600" />
                <span>Bộ Sinh Mật Khẩu Ngẫu Nhiên</span>
              </h3>
              <button onClick={() => setIsGeneratorModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 bg-purple-50/70 border border-purple-200 rounded-2xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-purple-900 uppercase">Mật khẩu được tạo:</span>
                <span className={`text-[10px] font-bold ${evaluatePasswordStrength(generatedPassword).color}`}>
                  {evaluatePasswordStrength(generatedPassword).label}
                </span>
              </div>
              <p className="font-mono font-black text-lg text-purple-950 bg-white p-3 border border-purple-200 rounded-xl break-all select-all text-center">
                {generatedPassword}
              </p>
              <div className="flex items-center justify-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleRegeneratePassword}
                  className="px-3 py-1.5 bg-white hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-xl text-xs font-bold flex items-center gap-1 shadow-2xs cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Tạo lại</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleCopy(generatedPassword, 'gen_pass', 'Mật khẩu ngẫu nhiên')}
                  className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-2xs cursor-pointer"
                >
                  {copiedId === 'gen_pass' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedId === 'gen_pass' ? 'Đã sao chép!' : 'Sao chép'}</span>
                </button>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-slate-700">Độ dài mật khẩu: {genLength} ký tự</label>
                </div>
                <input
                  type="range"
                  min="8"
                  max="48"
                  value={genLength}
                  onChange={(e) => setGenLength(parseInt(e.target.value, 10))}
                  className="w-full accent-purple-600 cursor-pointer"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <label className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer">
                  <input
                    type="checkbox"
                    checked={genUpper}
                    onChange={(e) => setGenUpper(e.target.checked)}
                    className="w-4 h-4 text-purple-600 rounded"
                  />
                  <span className="font-semibold text-slate-700">Chữ in hoa (A-Z)</span>
                </label>

                <label className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer">
                  <input
                    type="checkbox"
                    checked={genLower}
                    onChange={(e) => setGenLower(e.target.checked)}
                    className="w-4 h-4 text-purple-600 rounded"
                  />
                  <span className="font-semibold text-slate-700">{isEn ? 'Lowercase (a-z)' : 'Chữ thường (a-z)'}</span>
                </label>

                <label className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer">
                  <input
                    type="checkbox"
                    checked={genDigits}
                    onChange={(e) => setGenDigits(e.target.checked)}
                    className="w-4 h-4 text-purple-600 rounded"
                  />
                  <span className="font-semibold text-slate-700">{isEn ? 'Numbers (0-9)' : 'Chữ số (0-9)'}</span>
                </label>

                <label className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer">
                  <input
                    type="checkbox"
                    checked={genSymbols}
                    onChange={(e) => setGenSymbols(e.target.checked)}
                    className="w-4 h-4 text-purple-600 rounded"
                  />
                  <span className="font-semibold text-slate-700">{isEn ? 'Special Symbols (!@#$)' : 'Ký tự đặc biệt (!@#$)'}</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsGeneratorModalOpen(false)}
                className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >{isEn ? 'Close' : 'Đóng'}</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: IMPORT KEEPASS FILE */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full p-6 space-y-4 border border-slate-200 animate-in fade-in zoom-in-95 my-8">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 bg-gradient-to-r from-indigo-50 to-purple-50 -mx-6 -mt-6 p-6 rounded-t-3xl">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md">
                  <ShieldCheck className="w-5 h-5 text-amber-300" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-indigo-950">Import Trực Tiếp Từ KeePass</h3>
                  <p className="text-[11px] text-indigo-700">Hỗ trợ file gốc <strong>.kdbx / .kbdx</strong>, <strong>.xml</strong>, <strong>.csv</strong> & <strong>Excel</strong></p>
                </div>
              </div>
              <button onClick={() => setIsImportModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Format Badge Tips */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-1.5 text-slate-600 text-[11px]">
                <p className="font-bold text-slate-800 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Các định dạng được hỗ trợ nạp tự động:</span>
                </p>
                <ul className="list-disc list-inside space-y-1 pl-1 text-[11px] text-slate-600">
                  <li><strong className="text-indigo-700 font-mono font-bold">File gốc .kdbx (KDBX 3/4):</strong> Giữ 100% cây thư mục & mật khẩu (nhập Master Password bên dưới).</li>
                  <li><strong className="text-purple-700 font-mono font-bold">File .xml (KeePass 2.x XML):</strong> Giữ nguyên 100% cây thư mục cha/con.</li>
                  <li><strong className="text-emerald-700 font-mono font-bold">File .csv hoặc .xlsx:</strong> Nhập bảng tính tài khoản theo cột Group/Folder.</li>
                </ul>
              </div>

              <form onSubmit={handleUploadKeePassFile} className="space-y-3">
                {/* File Upload Drop Zone */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">Chọn file KeePass (.kdbx, .kbdx, .xml, .csv) (*)</label>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="p-5 border-2 border-dashed border-indigo-300 hover:border-indigo-500 bg-slate-50/70 hover:bg-indigo-50/40 rounded-2xl flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors"
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".kdbx, .kbdx, .xml, .csv, .xlsx, .xls, .txt"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0] || null;
                        setImportFile(f);
                        setImportResult(null);
                        setImportErrorMsg('');
                      }}
                    />
                    <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center shadow-xs">
                      <Lock className="w-5 h-5" />
                    </div>
                    {importFile ? (
                      <div className="text-center">
                        <p className="font-bold text-indigo-900 text-xs flex items-center justify-center gap-1">
                          <span>📄 {importFile.name}</span>
                          <span className="text-[10px] text-indigo-600 font-mono">({(importFile.size / 1024).toFixed(1)} KB)</span>
                        </p>
                        <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">✓ Đã chọn file thành công</p>
                      </div>
                    ) : (
                      <div className="text-center">
                        <p className="font-bold text-slate-700">Bấm để chọn file hoặc kéo thả file .kdbx / .xml vào đây</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">KeePass Database (.kdbx), KeePass XML (.xml), CSV, Excel (.xlsx)</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Master Password Field for .kdbx files */}
                {importFile && (importFile.name.toLowerCase().endsWith('.kdbx') || importFile.name.toLowerCase().endsWith('.kbdx')) && (
                  <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-2xl space-y-2 animate-in fade-in slide-in-from-top-2 duration-150">
                    <label className="block font-bold text-amber-950 text-xs flex items-center gap-1.5">
                      <KeyRound className="w-3.5 h-3.5 text-amber-600" />
                      <span>Mật khẩu Master Password của file KDBX (*)</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showImportMasterPassword ? 'text' : 'password'}
                        value={importMasterPassword}
                        onChange={(e) => {
                          setImportMasterPassword(e.target.value);
                          setImportErrorMsg('');
                        }}
                        placeholder="Nhập Master Password để giải mã file .kdbx..."
                        className="w-full pl-3 pr-9 py-2 bg-white border border-amber-300 rounded-xl outline-none focus:ring-2 focus:ring-amber-500 font-mono text-xs text-slate-900"
                      />
                      <button
                        type="button"
                        onClick={() => setShowImportMasterPassword(!showImportMasterPassword)}
                        className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {showImportMasterPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-[10px] text-amber-800">
                      🔒 Mật khẩu chỉ dùng để giải mã một lần trong bộ nhớ máy chủ và không được lưu lại bất kỳ đâu.
                    </p>

                    {/* Optional Key File */}
                    <div className="pt-1">
                      <label className="block font-semibold text-amber-900 text-[11px] mb-1">File Key (.key) nếu cơ sở dữ liệu có dùng:</label>
                      <input
                        ref={keyFileInputRef}
                        type="file"
                        accept=".key, .keyx, .bin"
                        className="hidden"
                        onChange={(e) => setImportKeyFile(e.target.files?.[0] || null)}
                      />
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => keyFileInputRef.current?.click()}
                          className="px-2.5 py-1 bg-white border border-amber-300 hover:bg-amber-100/50 rounded-lg text-[11px] font-semibold text-amber-900 cursor-pointer"
                        >
                          {importKeyFile ? '🔑 ' + importKeyFile.name : '+ Chọn file Key (Nếu có)'}
                        </button>
                        {importKeyFile && (
                          <button
                            type="button"
                            onClick={() => setImportKeyFile(null)}
                            className="text-rose-600 hover:underline text-[10px] cursor-pointer"
                          >
                            Xóa file key
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Default Folder Fallback */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Thư Mục Mặc Định (Nếu mục không có thư mục)</label>
                  <input
                    type="text"
                    value={importGroup}
                    onChange={(e) => setImportGroup(e.target.value)}
                    placeholder="VD: 🏢 Văn Phòng Trụ Sở Chính / KeePass Import"
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 font-semibold"
                  />
                </div>

                {importErrorMsg && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2 font-medium">
                    <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{importErrorMsg}</span>
                  </div>
                )}

                {importResult && (
                  <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl space-y-1">
                    <p className="font-bold flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>{importResult.message}</span>
                    </p>
                    {importResult.groupsCount > 0 && (
                      <p className="text-[11px] text-emerald-700 pl-5.5">
                        📁 Đã nạp và tái hiện <strong>{importResult.groupsCount}</strong> thư mục nhóm trên cây thư mục.
                      </p>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={handleDownloadSampleTemplate}
                    className="text-indigo-600 hover:underline font-semibold text-xs flex items-center gap-1"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Tải mẫu Excel</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsImportModalOpen(false)}
                      className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                    >
                      Đóng (ESC)
                    </button>
                    <button
                      type="submit"
                      disabled={!importFile || isImporting}
                      className="px-5 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                    >
                      {isImporting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                      <span>{isImporting ? 'Đang Giải Mã & Nạp...' : 'Tiến Hành Import'}</span>
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD PASSWORD */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full flex flex-col max-h-[92vh] border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-indigo-50 to-purple-50 shrink-0">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <span className="p-1.5 bg-indigo-600 text-white rounded-xl shadow-xs">
                  <Lock className="w-4 h-4" />
                </span>
                <span>Thêm Mới Tài Khoản & Mật Khẩu</span>
              </h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tiêu đề / Tên dịch vụ (*) </label>
                  <input
                    type="text"
                    required
                    placeholder="VD: Root Server Ubuntu 24.04, Admin Router..."
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Thư Mục</label>
                  <input
                    type="text"
                    list="folder-datalist"
                    placeholder="VD: 🏢 Văn Phòng Trụ Sở Chính / 🐧 Máy chủ Linux / Ubuntu"
                    value={formData.groupName}
                    onChange={(e) => setFormData({ ...formData, groupName: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 font-semibold text-indigo-950"
                  />
                  <datalist id="folder-datalist">
                    {folderTree.flatMap((rg) => [rg.fullPath, ...rg.children.map((c) => c.fullPath)]).map((p) => (
                      <option key={p} value={p} />
                    ))}
                  </datalist>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tên đăng nhập / Email / Username</label>
                  <input
                    type="text"
                    placeholder="VD: administrator, root, admin@company.local..."
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-slate-700">Mật khẩu (*) </label>
                    <button
                      type="button"
                      onClick={() => {
                        const newPass = generateSecurePassword({ length: 16, useUpper: true, useLower: true, useDigits: true, useSymbols: true, avoidAmbiguous: false });
                        setFormData({ ...formData, password: newPass });
                      }}
                      className="text-purple-600 font-bold text-[10px] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Dices className="w-3 h-3" />
                      <span>Sinh mật khẩu</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="Nhập hoặc tạo mật khẩu..."
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 font-mono font-bold text-indigo-950"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Đường dẫn đăng nhập / IP / Host / Port (URL)</label>
                <input
                  type="text"
                  placeholder="VD: https://portal.company.com hoặc 192.168.1.1:8443 hoặc ssh://10.0.0.15:22"
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Ghi chú & Hướng dẫn bảo mật</label>
                <textarea
                  rows={2}
                  placeholder="Ghi chú về cổng port, tài khoản dự phòng, chu kỳ đổi mật khẩu, người quản lý..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700">
                  <input
                    type="checkbox"
                    checked={formData.isFavorite}
                    onChange={(e) => setFormData({ ...formData, isFavorite: e.target.checked })}
                    className="w-4 h-4 text-amber-500 rounded"
                  />
                  <span>⭐ Đánh dấu yêu thích (Ghim lên đầu)</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Hủy (ESC)
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                >
                  💾 Lưu Mật Khẩu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT PASSWORD */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full flex flex-col max-h-[92vh] border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-amber-50 to-orange-50 shrink-0">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <span className="p-1.5 bg-amber-500 text-white rounded-xl shadow-xs">
                  <Edit2 className="w-4 h-4" />
                </span>
                <span>Cập Nhật Tài Khoản & Mật Khẩu</span>
              </h3>
              <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateSubmit} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tiêu đề / Tên dịch vụ (*) </label>
                  <input
                    type="text"
                    required
                    value={editFormData.title}
                    onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-amber-500 font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Thư Mục</label>
                  <input
                    type="text"
                    list="folder-datalist-edit"
                    value={editFormData.groupName}
                    onChange={(e) => setEditFormData({ ...editFormData, groupName: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-amber-500 font-semibold text-indigo-950"
                  />
                  <datalist id="folder-datalist-edit">
                    {folderTree.flatMap((rg) => [rg.fullPath, ...rg.children.map((c) => c.fullPath)]).map((p) => (
                      <option key={p} value={p} />
                    ))}
                  </datalist>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tên đăng nhập / Email / Username</label>
                  <input
                    type="text"
                    value={editFormData.username}
                    onChange={(e) => setEditFormData({ ...editFormData, username: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-amber-500 font-mono"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-slate-700">Mật khẩu (*) </label>
                    <button
                      type="button"
                      onClick={() => {
                        const newPass = generateSecurePassword({ length: 16, useUpper: true, useLower: true, useDigits: true, useSymbols: true, avoidAmbiguous: false });
                        setEditFormData({ ...editFormData, password: newPass });
                      }}
                      className="text-purple-600 font-bold text-[10px] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Dices className="w-3 h-3" />
                      <span>Sinh mật khẩu</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    value={editFormData.password}
                    onChange={(e) => setEditFormData({ ...editFormData, password: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-amber-500 font-mono font-bold text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Đường dẫn đăng nhập / IP / Host / Port (URL)</label>
                <input
                  type="text"
                  value={editFormData.url}
                  onChange={(e) => setEditFormData({ ...editFormData, url: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-amber-500 font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Ghi chú & Hướng dẫn bảo mật</label>
                <textarea
                  rows={2}
                  value={editFormData.notes}
                  onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700">
                  <input
                    type="checkbox"
                    checked={editFormData.isFavorite}
                    onChange={(e) => setEditFormData({ ...editFormData, isFavorite: e.target.checked })}
                    className="w-4 h-4 text-amber-500 rounded"
                  />
                  <span>⭐ Đánh dấu yêu thích (Ghim lên đầu)</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Hủy (ESC)
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                >
                  💾 Lưu Cập Nhật
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    
      {/* MODAL: MẬT KHẨU CẤP 2 (SECONDARY PASSWORD) */}
      <SecondaryPasswordModal
        isOpen={isSecPwModalOpen}
        mode={secPwModalMode}
        onClose={() => setIsSecPwModalOpen(false)}
        onSuccess={() => {
          setIsVaultUnlocked(true);
          setIsSecPwModalOpen(false);
          loadData();
        }}
      />
</div>
  );
}
