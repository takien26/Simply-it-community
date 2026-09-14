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
import { SecondaryPasswordModal } from '@/components/common/SecondaryPasswordModal';
import { useLanguage } from '@/lib/i18n/context';
import {
  PasswordItem,
  FolderNode,
  renderFolderIcon,
  parseFolderDisplay,
  evaluatePasswordStrength,
  FolderModal,
  PasswordDetailModal,
  PasswordGeneratorModal,
  KeePassImportModal,
  PasswordFormModal,
} from '@/components/passwords';

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
  const [formModalConfig, setFormModalConfig] = useState<{
    isOpen: boolean;
    mode: 'create' | 'edit';
    item?: PasswordItem | null;
  }>({ isOpen: false, mode: 'create' });
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isGeneratorModalOpen, setIsGeneratorModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedPassword, setSelectedPassword] = useState<PasswordItem | null>(null);

  // Folder Modal State
  const [folderModalConfig, setFolderModalConfig] = useState<{
    isOpen: boolean;
    oldPath?: string;
    parentPath?: string;
    initialName?: string;
    initialIcon?: string;
  }>({ isOpen: false });

  const openCreateFolder = (parentPath = '') => {
    setFolderModalConfig({
      isOpen: true,
      parentPath,
      oldPath: '',
      initialName: '',
      initialIcon: '📁',
    });
  };

  const openEditFolder = (oldPath: string, name: string, icon = '📁') => {
    setFolderModalConfig({
      isOpen: true,
      parentPath: '',
      oldPath,
      initialName: name,
      initialIcon: icon,
    });
  };

  const handleOpenAdd = () => {
    setFormModalConfig({ isOpen: true, mode: 'create', item: null });
  };

  const handleOpenEdit = (item: PasswordItem) => {
    setFormModalConfig({ isOpen: true, mode: 'edit', item });
  };

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
        setFormModalConfig({ isOpen: false, mode: 'create' });
        setIsDetailModalOpen(false);
        setIsGeneratorModalOpen(false);
        setIsImportModalOpen(false);
        setFolderModalConfig({ isOpen: false });
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
            onClick={() => openCreateFolder('')}
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
            onClick={() => setIsImportModalOpen(true)}
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
            onClick={handleOpenAdd}
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
              onClick={() => openCreateFolder('')}
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
                              openCreateFolder(node.fullPath);
                            }}
                            title="Thêm thư mục con"
                            className={`p-0.5 rounded cursor-pointer ${isSelected ? 'text-white hover:bg-indigo-700' : 'text-slate-400 hover:text-indigo-600 hover:bg-slate-200'}`}
                          >
                            <Plus className="w-2.5 h-2.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              openEditFolder(node.fullPath, node.name, node.iconStr || '📁');
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
                  if (contextMenu.targetFolder) setSelectedGroupPath(contextMenu.targetFolder);
                  handleOpenAdd();
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
                  openCreateFolder(contextMenu.targetFolder || '');
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
                  openEditFolder(contextMenu.targetFolder || '', parsed.name, parsed.icon || '📁');
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
                  handleOpenAdd();
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
                  openCreateFolder('');
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
      <FolderModal
        isOpen={folderModalConfig.isOpen}
        onClose={() => setFolderModalConfig({ isOpen: false })}
        oldPath={folderModalConfig.oldPath}
        parentPath={folderModalConfig.parentPath}
        initialName={folderModalConfig.initialName}
        initialIcon={folderModalConfig.initialIcon}
        onSuccess={(toastMsg, newFullPath, expandPath) => {
          showToast(toastMsg);
          if (newFullPath && selectedGroupPath === folderModalConfig.oldPath) {
            setSelectedGroupPath(newFullPath);
          }
          if (expandPath) {
            setExpandedFolders((prev) => new Set([...Array.from(prev), expandPath]));
          }
          loadData();
        }}
      />

      {/* DETAIL MODAL */}
      <PasswordDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        password={selectedPassword}
        onEdit={handleOpenEdit}
        onCopyText={handleCopy}
      />

      {/* PASSWORD GENERATOR MODAL */}
      <PasswordGeneratorModal
        isOpen={isGeneratorModalOpen}
        onClose={() => setIsGeneratorModalOpen(false)}
        onCopyText={handleCopy}
      />

      {/* MODAL: IMPORT KEEPASS FILE */}
      <KeePassImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={(msg) => {
          if (msg) showToast(msg);
          loadData();
        }}
      />

      {/* MODAL: ADD / EDIT PASSWORD */}
      <PasswordFormModal
        isOpen={formModalConfig.isOpen}
        onClose={() => setFormModalConfig({ isOpen: false, mode: 'create' })}
        mode={formModalConfig.mode}
        item={formModalConfig.item}
        defaultGroupName={selectedGroupPath !== 'ALL' ? selectedGroupPath : undefined}
        folderTree={folderTree}
        onSuccess={(savedItem, isEdit) => {
          showToast(
            isEdit
              ? '✅ Đã cập nhật mật khẩu thành công'
              : `✅ Đã thêm tài khoản mật khẩu "${savedItem.title}"`
          );
          if (isEdit && selectedPassword?.id === savedItem.id) {
            setSelectedPassword(savedItem);
          }
          loadData();
        }}
      />

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
