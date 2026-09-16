'use client';

import { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '@/lib/i18n/context';
import { fetchWithSwr, invalidateClientCache, useAutoRefresh, triggerDataRefresh } from '@/lib/client-cache';
import {
  Boxes,
  Plus,
  Search,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  History,
  Trash2,
  Edit2,
  Package,
  Layers,
  Building,
  DollarSign,
  Loader2,
  X,
  Check,
  Save,
  ShieldAlert,
  Laptop,
  User as UserIcon,
  ChevronRight,
  Wrench,
  Cpu,
  CheckCircle2,
  Clock,
  Sparkles,
  MapPin,
  ExternalLink,
  Tag,
  FileText,
  SlidersHorizontal,
} from 'lucide-react';

interface SparePart {
  id: string;
  name: string;
  sku?: string;
  categoryId?: string;
  category?: { id: string; name: string };
  quantity: number;
  minStock: number;
  unit: string;
  unitPrice?: number;
  currency: string;
  vendorId?: string;
  vendor?: { id: string; name: string };
  locationId?: string;
  location?: { id: string; name: string };
  notes?: string;
  _count?: { transactions: number };
}

export default function SparePartsPage() {
  const { language } = useLanguage();
  const isEn = language === 'en';

  const [parts, setParts] = useState<SparePart[]>([]);
  const [stats, setStats] = useState<any>({ totalItems: 0, totalQuantity: 0, lowStockCount: 0, totalValue: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [lowStockFilter, setLowStockFilter] = useState(false);

  // Quick-View Drawer state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerPart, setDrawerPart] = useState<SparePart | null>(null);
  const [drawerHistory, setDrawerHistory] = useState<any[]>([]);
  const [drawerHistoryLoading, setDrawerHistoryLoading] = useState(false);

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isStockActionOpen, setIsStockActionOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [selectedPart, setSelectedPart] = useState<SparePart | null>(null);
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Stock action form state
  const [actionType, setActionType] = useState<'IN' | 'OUT'>('IN');
  const [actionQty, setActionQty] = useState('1');
  const [actionNote, setActionNote] = useState('');
  const [submittingAction, setSubmittingAction] = useState(false);

  // Smart Stock-Out destination state
  const [exportTarget, setExportTarget] = useState<'ASSET' | 'USER' | 'OTHER'>('ASSET');
  const [assetSearch, setAssetSearch] = useState('');
  const [assetResults, setAssetResults] = useState<any[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<any | null>(null);
  const [searchingAssets, setSearchingAssets] = useState(false);

  const [userSearch, setUserSearch] = useState('');
  const [userResults, setUserResults] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [searchingUsers, setSearchingUsers] = useState(false);

  const [maintenanceType, setMaintenanceType] = useState<'UPGRADE' | 'REPLACEMENT' | 'REPAIR' | 'OTHER'>('UPGRADE');
  const [createMaintenanceLog, setCreateMaintenanceLog] = useState(true);

  // Create form state
  const [formName, setFormName] = useState('');
  const [formSku, setFormSku] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formQty, setFormQty] = useState('0');
  const [formMinStock, setFormMinStock] = useState('5');
  const [formUnit, setFormUnit] = useState('cái');
  const [formPrice, setFormPrice] = useState('');
  const [formVendor, setFormVendor] = useState('');
  const [formLocation, setFormLocation] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [creating, setCreating] = useState(false);

  // Edit form state
  const [editId, setEditId] = useState('');
  const [editName, setEditName] = useState('');
  const [editSku, setEditSku] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editMinStock, setEditMinStock] = useState('5');
  const [editUnit, setEditUnit] = useState('cái');
  const [editPrice, setEditPrice] = useState('');
  const [editVendor, setEditVendor] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [updating, setUpdating] = useState(false);

  // Dropdowns
  const [categories, setCategories] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);

  // ESC key listener to close active modals & drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isStockActionOpen) setIsStockActionOpen(false);
        else if (isHistoryOpen) setIsHistoryOpen(false);
        else if (isEditOpen) setIsEditOpen(false);
        else if (isCreateOpen) setIsCreateOpen(false);
        else if (isDrawerOpen) setIsDrawerOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isStockActionOpen, isHistoryOpen, isEditOpen, isCreateOpen, isDrawerOpen]);

  useEffect(() => {
    loadParts();
    loadDropdowns();
  }, [loadParts]);

  // Debounced search for Assets in Stock-Out Modal
  useEffect(() => {
    if (!assetSearch.trim() || selectedAsset) {
      setAssetResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearchingAssets(true);
      try {
        const res = await fetch(`/api/assets?search=${encodeURIComponent(assetSearch.trim())}&pageSize=8`);
        const data = await res.json();
        if (data.assets) setAssetResults(data.assets);
      } catch (e) {
        console.error(e);
      } finally {
        setSearchingAssets(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [assetSearch, selectedAsset]);

  // Debounced search for Users in Stock-Out Modal
  useEffect(() => {
    if (!userSearch.trim() || selectedUser) {
      setUserResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearchingUsers(true);
      try {
        const res = await fetch(`/api/users?search=${encodeURIComponent(userSearch.trim())}&status=active`);
        const data = await res.json();
        if (data.users) setUserResults(data.users.slice(0, 8));
      } catch (e) {
        console.error(e);
      } finally {
        setSearchingUsers(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [userSearch, selectedUser]);

  const loadParts = useCallback(async (forceFresh = false) => {
    try {
      if (forceFresh) {
        invalidateClientCache('/api/spare-parts');
      }
      const query = lowStockFilter ? '?lowStock=true' : '';
      await fetchWithSwr<any>(`/api/spare-parts${query}`, (data) => {
        if (data && data.success) {
          setParts(data.spareParts || []);
          if (data.stats) setStats(data.stats);
          setLoading(false);
          // Refresh drawer part if open
          if (drawerPart) {
            const fresh = (data.spareParts || []).find((p: SparePart) => p.id === drawerPart.id);
            if (fresh) setDrawerPart(fresh);
          }
        }
      }, 30000, forceFresh);
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  }, [lowStockFilter, drawerPart]);

  // Connect Professional Auto-Refresh & Instant Reactive Sync
  const { isRefreshing: isAutoRefreshing, refreshNow } = useAutoRefresh({
    onRefresh: loadParts,
    scope: 'spare-parts',
  });

  const loadDropdowns = async () => {
    try {
      const [catRes, venRes, locRes] = await Promise.all([
        fetch('/api/categories').then((r) => r.json()),
        fetch('/api/vendors').then((r) => r.json()),
        fetch('/api/locations').then((r) => r.json()),
      ]);
      if (catRes.categories) setCategories(catRes.categories);
      if (venRes.vendors) setVendors(venRes.vendors);
      if (locRes.locations) setLocations(locRes.locations);
    } catch (e) {
      console.error(e);
    }
  };

  // Open Quick-View Drawer
  const openDrawer = (part: SparePart) => {
    setDrawerPart(part);
    setIsDrawerOpen(true);
    loadDrawerHistory(part.id);
  };

  const loadDrawerHistory = async (partId: string) => {
    setDrawerHistoryLoading(true);
    try {
      const res = await fetch(`/api/spare-parts/${partId}/transactions`);
      const data = await res.json();
      if (data.success) {
        setDrawerHistory(data.transactions || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setDrawerHistoryLoading(false);
    }
  };

  // Open Stock Action (In / Out)
  const openStockAction = (part: SparePart, type: 'IN' | 'OUT') => {
    setSelectedPart(part);
    setActionType(type);
    setActionQty('1');
    setActionNote('');
    // Reset smart stock-out targets
    setExportTarget('ASSET');
    setSelectedAsset(null);
    setAssetSearch('');
    setAssetResults([]);
    setSelectedUser(null);
    setUserSearch('');
    setUserResults([]);
    setMaintenanceType('UPGRADE');
    setCreateMaintenanceLog(true);
    setIsStockActionOpen(true);
  };

  // Open Edit Modal
  const openEditModal = (part: SparePart) => {
    setEditId(part.id);
    setEditName(part.name);
    setEditSku(part.sku || '');
    setEditCategory(part.categoryId || '');
    setEditMinStock(String(part.minStock || 5));
    setEditUnit(part.unit || 'cái');
    setEditPrice(part.unitPrice ? String(part.unitPrice) : '');
    setEditVendor(part.vendorId || '');
    setEditLocation(part.locationId || '');
    setEditNotes(part.notes || '');
    setIsEditOpen(true);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editId || !editName.trim()) return;

    setUpdating(true);
    try {
      const res = await fetch(`/api/spare-parts/${editId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName.trim(),
          sku: editSku.trim() || undefined,
          categoryId: editCategory || undefined,
          minStock: parseInt(editMinStock) || 5,
          unit: editUnit.trim() || 'cái',
          unitPrice: editPrice ? parseFloat(editPrice) : undefined,
          vendorId: editVendor || undefined,
          locationId: editLocation || undefined,
          notes: editNotes.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setIsEditOpen(false);
        invalidateClientCache('/api/spare-parts');
        triggerDataRefresh('spare-parts');
        await loadParts(true);
        if (drawerPart && drawerPart.id === editId) {
          setDrawerPart({
            ...drawerPart,
            name: editName.trim(),
            sku: editSku.trim() || undefined,
            categoryId: editCategory || undefined,
            category: categories.find((c) => c.id === editCategory),
            minStock: parseInt(editMinStock) || 5,
            unit: editUnit.trim() || 'cái',
            unitPrice: editPrice ? parseFloat(editPrice) : undefined,
            vendorId: editVendor || undefined,
            vendor: vendors.find((v) => v.id === editVendor),
            locationId: editLocation || undefined,
            location: locations.find((l) => l.id === editLocation),
            notes: editNotes.trim() || undefined,
          });
        }
      } else {
        alert(data.error || (isEn ? 'Failed to update spare part' : 'Lỗi cập nhật phụ tùng'));
      }
    } catch (e: any) {
      alert(e.message || (isEn ? 'Connection error' : 'Lỗi kết nối'));
    } finally {
      setUpdating(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    setCreating(true);
    try {
      const res = await fetch('/api/spare-parts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName.trim(),
          sku: formSku.trim() || undefined,
          categoryId: formCategory || undefined,
          quantity: parseInt(formQty) || 0,
          minStock: parseInt(formMinStock) || 5,
          unit: formUnit.trim() || (isEn ? 'pcs' : 'cái'),
          unitPrice: formPrice ? parseFloat(formPrice) : undefined,
          vendorId: formVendor || undefined,
          locationId: formLocation || undefined,
          notes: formNotes.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setIsCreateOpen(false);
        resetCreateForm();
        invalidateClientCache('/api/spare-parts');
        triggerDataRefresh('spare-parts');
        await loadParts(true);
      } else {
        alert(data.error || (isEn ? 'Failed to create spare part' : 'Lỗi thêm phụ tùng'));
      }
    } catch (e: any) {
      alert(e.message || (isEn ? 'Connection error' : 'Lỗi kết nối'));
    } finally {
      setCreating(false);
    }
  };

  const handleStockAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPart) return;

    const qty = parseInt(actionQty);
    if (!qty || qty <= 0) {
      alert(isEn ? 'Quantity must be greater than 0' : 'Số lượng phải lớn hơn 0');
      return;
    }

    if (actionType === 'OUT' && qty > selectedPart.quantity) {
      alert(
        isEn
          ? `Cannot dispense more than in stock (${selectedPart.quantity} ${selectedPart.unit})`
          : `Không thể xuất nhiều hơn số lượng tồn kho (${selectedPart.quantity} ${selectedPart.unit})`
      );
      return;
    }

    // Compose formatted note with target details
    let targetDesc = '';
    let assetIdParam = undefined;

    if (actionType === 'OUT') {
      if (exportTarget === 'ASSET' && selectedAsset) {
        assetIdParam = selectedAsset.id;
        const currentAssignee = selectedAsset.assignments?.[0]?.user;
        const assigneeText = currentAssignee ? ` - Người dùng: ${currentAssignee.fullName} (${currentAssignee.department || 'N/A'})` : '';
        targetDesc = `[Thiết bị: ${selectedAsset.assetTag || selectedAsset.name}] ${selectedAsset.name}${assigneeText}`;
      } else if (exportTarget === 'USER' && selectedUser) {
        targetDesc = `[Cấp phát nhân sự] ${selectedUser.fullName} (${selectedUser.department || selectedUser.email || 'N/A'})`;
      } else if (exportTarget === 'OTHER') {
        targetDesc = `[Xuất hủy / Hao hụt / Khác]`;
      }
    }

    const fullNoteParts = [targetDesc, actionNote.trim()].filter(Boolean);
    const fullNote = fullNoteParts.join(' | ');

    setSubmittingAction(true);
    try {
      const res = await fetch(`/api/spare-parts/${selectedPart.id}/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: actionType,
          quantity: qty,
          note: fullNote || undefined,
          assetId: assetIdParam,
          createMaintenanceLog: actionType === 'OUT' && exportTarget === 'ASSET' && !!selectedAsset && createMaintenanceLog,
          maintenanceType: maintenanceType,
          targetDescription: targetDesc,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setIsStockActionOpen(false);
        setActionQty('1');
        setActionNote('');
        invalidateClientCache('/api/spare-parts');
        triggerDataRefresh('spare-parts');
        await loadParts(true);
        if (drawerPart && drawerPart.id === selectedPart.id) {
          loadDrawerHistory(selectedPart.id);
        }
      } else {
        alert(data.error || (isEn ? 'Transaction failed' : 'Lỗi thực hiện giao dịch'));
      }
    } catch (e: any) {
      alert(e.message || (isEn ? 'Action failed' : 'Lỗi thực hiện'));
    } finally {
      setSubmittingAction(false);
    }
  };

  const loadHistoryModal = async (part: SparePart) => {
    setSelectedPart(part);
    setIsHistoryOpen(true);
    setHistoryLoading(true);
    try {
      const res = await fetch(`/api/spare-parts/${part.id}/transactions`);
      const data = await res.json();
      if (data.success) {
        setHistoryList(data.transactions || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    const confirmMsg = isEn
      ? `Are you sure you want to remove "${name}" from inventory?`
      : `Bạn có chắc chắn muốn xóa phụ tùng "${name}" khỏi kho?`;
    if (!confirm(confirmMsg)) return;

    // 0ms Optimistic removal
    setParts((prev) => prev.filter((p) => p.id !== id));
    if (drawerPart?.id === id) setIsDrawerOpen(false);
    if (editId === id) setIsEditOpen(false);

    try {
      const res = await fetch(`/api/spare-parts/${id}`, { method: 'DELETE' });
      if (res.ok) {
        invalidateClientCache('/api/spare-parts');
        triggerDataRefresh('spare-parts');
        await loadParts(true);
      } else {
        await loadParts(true);
      }
    } catch {
      await loadParts(true);
    }
  };

  const resetCreateForm = () => {
    setFormName('');
    setFormSku('');
    setFormCategory('');
    setFormQty('0');
    setFormMinStock('5');
    setFormUnit(isEn ? 'pcs' : 'cái');
    setFormPrice('');
    setFormVendor('');
    setFormLocation('');
    setFormNotes('');
  };

  const filteredParts = parts.filter((p) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      (p.sku && p.sku.toLowerCase().includes(q)) ||
      (p.category && p.category.name.toLowerCase().includes(q)) ||
      (p.vendor && p.vendor.name.toLowerCase().includes(q)) ||
      (p.location && p.location.name.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2.5 tracking-tight">
            <Boxes className="w-7 h-7 text-indigo-600" />
            <span>{isEn ? 'Spare Parts & IT Inventory' : 'Quản Lý Kho Phụ Tùng & Linh Kiện'}</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {isEn
              ? 'Track RAM, SSD, network cables, adapters, keyboards and get automated low stock warnings'
              : 'Theo dõi tồn kho RAM, SSD, cáp mạng, adapter, bàn phím và tự động cảnh báo khi dưới mức tối thiểu'}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsCreateOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/25 flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>{isEn ? 'Add Spare Part' : 'Thêm Phụ Tùng Mới'}</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{isEn ? 'Total Items' : 'Tổng Mặt Hàng'}</p>
            <p className="text-xl font-black text-slate-800 mt-0.5">{stats.totalItems}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Boxes className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{isEn ? 'Total Quantity' : 'Tổng Số Lượng Tồn'}</p>
            <p className="text-xl font-black text-slate-800 mt-0.5">{stats.totalQuantity}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-rose-200/80 shadow-xs flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{isEn ? 'Low / Below Min' : 'Sắp Hết / Dưới Ngưỡng'}</p>
            <p className="text-xl font-black text-rose-600 mt-0.5">{stats.lowStockCount}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-emerald-200/80 shadow-xs flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{isEn ? 'Total Value' : 'Tổng Giá Trị Kho'}</p>
            <p className="text-lg font-black text-emerald-700 mt-0.5">
              {Number(stats.totalValue).toLocaleString(isEn ? 'en-US' : 'vi-VN')} đ
            </p>
          </div>
        </div>
      </div>

      {/* Filter bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={isEn ? "Search by spare part name, SKU..." : "Tìm theo tên linh kiện, mã SKU..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 outline-none focus:bg-white focus:border-indigo-500 transition-all"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setLowStockFilter(!lowStockFilter)}
            className={`px-3 py-2 rounded-xl text-xs font-bold border transition-colors flex items-center gap-1.5 cursor-pointer ${
              lowStockFilter
                ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>{isEn ? `Low stock only (${stats.lowStockCount})` : `Chỉ xem hàng sắp hết (${stats.lowStockCount})`}</span>
          </button>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        {loading && parts.length === 0 ? (
          <div className="p-12 text-center">
            <Loader2 className="w-7 h-7 text-indigo-600 animate-spin mx-auto mb-2" />
            <p className="text-xs text-slate-400">{isEn ? 'Loading inventory data...' : 'Đang tải dữ liệu kho phụ tùng...'}</p>
          </div>
        ) : filteredParts.length === 0 ? (
          <div className="p-12 text-center">
            <Boxes className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-700">{isEn ? 'No spare parts in inventory' : 'Không có linh kiện nào trong kho'}</p>
            <p className="text-xs text-slate-400 mt-1">
              {isEn
                ? 'Click "+ Add Spare Part" to start managing replacement components.'
                : 'Nhấn "Thêm Phụ Tùng Mới" để bắt đầu quản lý tồn kho linh kiện thay thế.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">{isEn ? 'Part / Component Name' : 'Tên Phụ Tùng / Linh Kiện'}</th>
                  <th className="px-4 py-3.5">{isEn ? 'SKU Code' : 'Mã SKU'}</th>
                  <th className="px-4 py-3.5">{isEn ? 'Category' : 'Danh mục'}</th>
                  <th className="px-4 py-3.5">{isEn ? 'Stock Qty' : 'Số lượng Tồn'}</th>
                  <th className="px-4 py-3.5">{isEn ? 'Unit Price' : 'Đơn giá'}</th>
                  <th className="px-4 py-3.5">{isEn ? 'Supplier' : 'Nhà cung cấp'}</th>
                  <th className="px-4 py-3.5">{isEn ? 'Location' : 'Vị trí lưu'}</th>
                  <th className="px-4 py-3.5 text-right">{isEn ? 'Actions' : 'Thao tác'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredParts.map((p) => {
                  const isLow = p.quantity <= p.minStock;
                  return (
                    <tr
                      key={p.id}
                      onClick={() => openDrawer(p)}
                      className="hover:bg-indigo-50/40 cursor-pointer transition-colors group"
                      title={isEn ? "Click to view details & history" : "Bấm để xem chi tiết & lịch sử"}
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                            {p.name}
                          </span>
                        </div>
                        {p.notes && <p className="text-[10px] text-slate-400 font-normal mt-0.5 line-clamp-1">{p.notes}</p>}
                      </td>
                      <td className="px-4 py-3.5 font-mono text-indigo-700 font-semibold">{p.sku || '—'}</td>
                      <td className="px-4 py-3.5 text-slate-600">{p.category?.name || '—'}</td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <span className={`font-black text-sm ${isLow ? 'text-rose-600' : 'text-slate-800'}`}>
                            {p.quantity} {p.unit}
                          </span>
                          {isLow && (
                            <span className="text-[10px] font-bold bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                              <span>{isEn ? `Min: ${p.minStock}` : `Tối thiểu: ${p.minStock}`}</span>
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 font-semibold text-slate-700">
                        {p.unitPrice ? `${Number(p.unitPrice).toLocaleString(isEn ? 'en-US' : 'vi-VN')} ${p.currency}` : '—'}
                      </td>
                      <td className="px-4 py-3.5 text-slate-600">{p.vendor?.name || '—'}</td>
                      <td className="px-4 py-3.5 text-slate-600">{p.location?.name || '—'}</td>
                      <td className="px-4 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Quick In/Out Buttons */}
                          <button
                            type="button"
                            onClick={() => openStockAction(p, 'IN')}
                            className="px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold text-[11px] flex items-center gap-1 cursor-pointer transition-all"
                            title={isEn ? "Restock inventory" : "Nhập thêm vào kho"}
                          >
                            <ArrowDownRight className="w-3.5 h-3.5" />
                            <span>{isEn ? 'Stock In' : 'Nhập'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => openStockAction(p, 'OUT')}
                            className="px-2.5 py-1.5 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 font-bold text-[11px] flex items-center gap-1 cursor-pointer transition-all"
                            title={isEn ? "Dispense part to asset/user" : "Xuất kho cho máy / người dùng"}
                          >
                            <ArrowUpRight className="w-3.5 h-3.5" />
                            <span>{isEn ? 'Stock Out' : 'Xuất'}</span>
                          </button>

                          {/* Quick Edit */}
                          <button
                            type="button"
                            onClick={() => openEditModal(p)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 cursor-pointer transition-colors"
                            title={isEn ? "Edit" : "Chỉnh sửa"}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* History */}
                          <button
                            type="button"
                            onClick={() => loadHistoryModal(p)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer transition-colors"
                            title={isEn ? "Transaction history" : "Lịch sử xuất nhập"}
                          >
                            <History className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete */}
                          <button
                            type="button"
                            onClick={() => handleDelete(p.id, p.name)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer transition-colors"
                            title={isEn ? "Delete" : "Xóa"}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* 🚀 QUICK-VIEW DRAWER (SLIDE-OVER BÊN PHẢI)               */}
      {/* ======================================================== */}
      {isDrawerOpen && drawerPart && (
        <div className="fixed inset-0 z-50 overflow-hidden animate-in fade-in duration-200">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-slate-950/40 backdrop-blur-xs transition-opacity"
            onClick={() => setIsDrawerOpen(false)}
          />

          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-md md:max-w-lg bg-white shadow-2xl border-l border-slate-200 flex flex-col animate-in slide-in-from-right duration-300">
              {/* Drawer Header */}
              <div className="p-5 border-b border-slate-100 flex items-start justify-between bg-slate-50/50">
                <div className="space-y-1 pr-4">
                  <div className="flex flex-wrap items-center gap-2">
                    {drawerPart.sku && (
                      <span className="px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800 text-[11px] font-mono font-bold">
                        {drawerPart.sku}
                      </span>
                    )}
                    {drawerPart.category && (
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-semibold">
                        {drawerPart.category.name}
                      </span>
                    )}
                  </div>
                  <h2 className="text-lg font-black text-slate-900 leading-snug">{drawerPart.name}</h2>
                </div>

                <button
                  type="button"
                  onClick={() => setIsDrawerOpen(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Quick Action Toolbar inside Drawer */}
              <div className="px-5 py-3 bg-white border-b border-slate-100 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-1">
                  <button
                    type="button"
                    onClick={() => openStockAction(drawerPart, 'IN')}
                    className="flex-1 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95"
                  >
                    <ArrowDownRight className="w-4 h-4" />
                    <span>{isEn ? 'Restock In' : 'Nhập Kho'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => openStockAction(drawerPart, 'OUT')}
                    className="flex-1 px-3 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-sm flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95"
                  >
                    <ArrowUpRight className="w-4 h-4" />
                    <span>{isEn ? 'Dispense Out' : 'Xuất Kho'}</span>
                  </button>
                </div>

                <div className="flex items-center gap-1 border-l border-slate-200 pl-2">
                  <button
                    type="button"
                    onClick={() => openEditModal(drawerPart)}
                    className="p-2 rounded-xl text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 cursor-pointer transition-colors"
                    title={isEn ? 'Edit details' : 'Sửa thông tin'}
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(drawerPart.id, drawerPart.name)}
                    className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer transition-colors"
                    title={isEn ? 'Delete part' : 'Xóa phụ tùng'}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Drawer Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs">
                {/* Stock Level Card */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100/60 border border-slate-200/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      {isEn ? 'Stock Level' : 'Trạng thái tồn kho'}
                    </span>
                    {drawerPart.quantity <= drawerPart.minStock ? (
                      <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 font-bold text-[10px] flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        <span>{isEn ? 'Low Stock Alert' : 'Cảnh báo sắp hết'}</span>
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-bold text-[10px] flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>{isEn ? 'In Stock' : 'Tồn kho an toàn'}</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-baseline justify-between">
                    <div>
                      <span className="text-3xl font-black text-slate-900">{drawerPart.quantity}</span>
                      <span className="text-sm font-bold text-slate-500 ml-1.5">{drawerPart.unit}</span>
                    </div>
                    <span className="text-xs font-semibold text-slate-500">
                      {isEn ? `Min required: ${drawerPart.minStock}` : `Ngưỡng tối thiểu: ${drawerPart.minStock}`} {drawerPart.unit}
                    </span>
                  </div>

                  {/* Stock health bar */}
                  <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        drawerPart.quantity <= drawerPart.minStock ? 'bg-rose-500' : 'bg-emerald-500'
                      }`}
                      style={{
                        width: `${Math.min(100, Math.max(5, (drawerPart.quantity / Math.max(drawerPart.minStock * 2, 1)) * 100))}%`,
                      }}
                    />
                  </div>

                  {/* Value row */}
                  <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-slate-600">
                    <span>{isEn ? 'Estimated Total Value:' : 'Tổng giá trị kho:'}</span>
                    <span className="font-bold text-slate-900">
                      {Number((drawerPart.unitPrice || 0) * drawerPart.quantity).toLocaleString(isEn ? 'en-US' : 'vi-VN')} {drawerPart.currency || 'VND'}
                    </span>
                  </div>
                </div>

                {/* Storage & Metadata Specs */}
                <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2.5">
                  <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-indigo-600" />
                    <span>{isEn ? 'Specifications & Location' : 'Thông tin Lưu trữ & Nhà cung cấp'}</span>
                  </h4>

                  <div className="grid grid-cols-2 gap-3 pt-1 text-slate-600">
                    <div className="p-2.5 bg-slate-50 rounded-xl space-y-0.5">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">{isEn ? 'Unit Price' : 'Đơn giá nhập'}</p>
                      <p className="font-bold text-slate-800">
                        {drawerPart.unitPrice ? `${Number(drawerPart.unitPrice).toLocaleString(isEn ? 'en-US' : 'vi-VN')} ${drawerPart.currency || 'VND'}` : '—'}
                      </p>
                    </div>

                    <div className="p-2.5 bg-slate-50 rounded-xl space-y-0.5">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">{isEn ? 'Storage Location' : 'Vị trí lưu kho'}</p>
                      <p className="font-bold text-slate-800 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        <span>{drawerPart.location?.name || '—'}</span>
                      </p>
                    </div>

                    <div className="p-2.5 bg-slate-50 rounded-xl space-y-0.5 col-span-2">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">{isEn ? 'Supplier / Vendor' : 'Nhà cung cấp'}</p>
                      <p className="font-bold text-slate-800 flex items-center gap-1">
                        <Building className="w-3 h-3 text-slate-400" />
                        <span>{drawerPart.vendor?.name || '—'}</span>
                      </p>
                    </div>
                  </div>

                  {drawerPart.notes && (
                    <div className="p-2.5 bg-slate-50 rounded-xl space-y-0.5">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">{isEn ? 'Notes / Specs' : 'Ghi chú & Thông số kỹ thuật'}</p>
                      <p className="text-slate-700 whitespace-pre-wrap">{drawerPart.notes}</p>
                    </div>
                  )}
                </div>

                {/* History Timeline in Drawer */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                      <History className="w-3.5 h-3.5 text-indigo-600" />
                      <span>{isEn ? 'Transaction History' : 'Lịch Sử Xuất / Nhập Linh Kiện'}</span>
                    </h4>
                    <span className="text-[11px] text-slate-400">({drawerHistory.length} giao dịch)</span>
                  </div>

                  {drawerHistoryLoading ? (
                    <div className="p-6 text-center">
                      <Loader2 className="w-5 h-5 animate-spin text-indigo-600 mx-auto" />
                    </div>
                  ) : drawerHistory.length === 0 ? (
                    <div className="p-6 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-400 text-xs">
                      {isEn ? 'No transaction records yet' : 'Chưa có lịch sử xuất nhập nào'}
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100 bg-white rounded-2xl border border-slate-200 overflow-hidden">
                      {drawerHistory.map((tx) => (
                        <div key={tx.id} className="p-3 hover:bg-slate-50/80 transition-colors space-y-1.5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span
                                className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                                  tx.type === 'IN' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                                }`}
                              >
                                {tx.type === 'IN' ? '+' : '-'}
                              </span>
                              <span className="font-bold text-slate-800">
                                {tx.type === 'IN' ? (isEn ? 'Stock In' : 'Nhập kho') : (isEn ? 'Stock Out' : 'Xuất kho')}: {Math.abs(tx.quantity)} {drawerPart.unit}
                              </span>
                            </div>

                            <span className="text-[11px] text-slate-400">
                              {new Date(tx.createdAt).toLocaleDateString(isEn ? 'en-US' : 'vi-VN')}
                            </span>
                          </div>

                          {/* Target details (Asset / User) */}
                          {tx.asset && (
                            <div className="ml-8 flex flex-wrap items-center gap-1.5 text-[11px]">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-semibold border border-blue-100">
                                <Laptop className="w-3 h-3" />
                                <span>{tx.asset.assetTag ? `[${tx.asset.assetTag}] ` : ''}{tx.asset.name}</span>
                              </span>
                              {tx.asset.assignments?.[0]?.user && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium">
                                  <UserIcon className="w-3 h-3 text-slate-400" />
                                  <span>{tx.asset.assignments[0].user.fullName}</span>
                                </span>
                              )}
                            </div>
                          )}

                          {tx.note && (
                            <p className="ml-8 text-[11px] text-slate-500 italic bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
                              {tx.note}
                            </p>
                          )}

                          <div className="ml-8 text-[10px] text-slate-400 flex items-center justify-between">
                            <span>{isEn ? 'Operator:' : 'Thực hiện bởi:'} {tx.performedBy?.fullName || 'IT Staff'}</span>
                            <span>{new Date(tx.createdAt).toLocaleTimeString(isEn ? 'en-US' : 'vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 🚀 MODAL: SMART STOCK ACTION (IN / OUT THÔNG MINH)       */}
      {/* ======================================================== */}
      {isStockActionOpen && selectedPart && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full p-6 space-y-4 border border-slate-200 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                  {actionType === 'IN' ? (
                    <>
                      <ArrowDownRight className="w-5 h-5 text-emerald-600" />
                      <span>{isEn ? '📥 Restock Part' : '📥 Nhập Thêm Vào Kho'}</span>
                    </>
                  ) : (
                    <>
                      <ArrowUpRight className="w-5 h-5 text-amber-600" />
                      <span>{isEn ? '📤 Dispense Spare Part' : '📤 Xuất Kho Sử Dụng'}</span>
                    </>
                  )}
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {isEn ? 'Part:' : 'Linh kiện:'} <strong className="text-slate-800">{selectedPart.name}</strong> ({selectedPart.sku || 'N/A'})
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsStockActionOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Current stock status banner */}
            <div className="p-3 bg-slate-50 rounded-2xl flex items-center justify-between text-xs border border-slate-100">
              <div>
                <span className="text-slate-400 font-semibold">{isEn ? 'Current Stock:' : 'Tồn kho hiện có:'}</span>
                <span className="ml-1.5 font-black text-slate-800 text-sm">
                  {selectedPart.quantity} {selectedPart.unit}
                </span>
              </div>
              <div>
                <span className="text-slate-400 font-semibold">{isEn ? 'Unit Price:' : 'Đơn giá:'}</span>
                <span className="ml-1.5 font-bold text-slate-800">
                  {selectedPart.unitPrice ? `${Number(selectedPart.unitPrice).toLocaleString(isEn ? 'en-US' : 'vi-VN')} ${selectedPart.currency || 'VND'}` : '—'}
                </span>
              </div>
            </div>

            <form onSubmit={handleStockAction} className="space-y-4 text-xs">
              {/* Quantity */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {isEn
                    ? `Quantity to ${actionType === 'IN' ? 'restock' : 'dispense'} (${selectedPart.unit})`
                    : `Số lượng ${actionType === 'IN' ? 'nhập thêm' : 'xuất dùng'} (${selectedPart.unit})`}{' '}
                  <span className="text-rose-500">*</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max={actionType === 'OUT' ? selectedPart.quantity : undefined}
                    required
                    value={actionQty}
                    onChange={(e) => setActionQty(e.target.value)}
                    className="w-32 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-base text-slate-900 focus:bg-white focus:border-indigo-500"
                  />
                  {actionType === 'OUT' && (
                    <div className="flex items-center gap-1.5 text-slate-500">
                      <button
                        type="button"
                        onClick={() => setActionQty('1')}
                        className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 font-semibold text-[11px] cursor-pointer"
                      >
                        1
                      </button>
                      <button
                        type="button"
                        onClick={() => setActionQty('2')}
                        className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 font-semibold text-[11px] cursor-pointer"
                      >
                        2
                      </button>
                      {selectedPart.quantity > 0 && (
                        <button
                          type="button"
                          onClick={() => setActionQty(String(selectedPart.quantity))}
                          className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 font-bold text-[11px] cursor-pointer"
                        >
                          {isEn ? 'All' : 'Tất cả'} ({selectedPart.quantity})
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* ====================================================== */}
              {/* SMART STOCK-OUT DESTINATION SELECTOR                   */}
              {/* ====================================================== */}
              {actionType === 'OUT' && (
                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <label className="block font-bold text-slate-800 text-xs">
                    {isEn ? 'Dispense Target & Purpose:' : 'Mục đích & Đối tượng nhận linh kiện:'} <span className="text-rose-500">*</span>
                  </label>

                  {/* Target Choice Tabs */}
                  <div className="grid grid-cols-3 gap-2 bg-slate-100 p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => {
                        setExportTarget('ASSET');
                        setSelectedUser(null);
                      }}
                      className={`py-2 px-2 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                        exportTarget === 'ASSET'
                          ? 'bg-white text-indigo-700 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Laptop className="w-3.5 h-3.5" />
                      <span>{isEn ? 'For Asset/PC' : 'Cho Thiết bị'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setExportTarget('USER');
                        setSelectedAsset(null);
                      }}
                      className={`py-2 px-2 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                        exportTarget === 'USER'
                          ? 'bg-white text-indigo-700 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <UserIcon className="w-3.5 h-3.5" />
                      <span>{isEn ? 'For Employee' : 'Cho Nhân sự'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setExportTarget('OTHER');
                        setSelectedAsset(null);
                        setSelectedUser(null);
                      }}
                      className={`py-2 px-2 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                        exportTarget === 'OTHER'
                          ? 'bg-white text-indigo-700 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>{isEn ? 'Scrap / Other' : 'Xuất hủy / Khác'}</span>
                    </button>
                  </div>

                  {/* TAB 1: ASSET SELECTION */}
                  {exportTarget === 'ASSET' && (
                    <div className="space-y-2.5 p-3.5 bg-indigo-50/40 rounded-2xl border border-indigo-100">
                      {selectedAsset ? (
                        <div className="p-3 bg-white rounded-xl border border-indigo-200 shadow-xs flex items-center justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded-md bg-indigo-600 text-white font-mono font-bold text-[11px]">
                                {selectedAsset.assetTag || 'NO-TAG'}
                              </span>
                              <span className="font-bold text-slate-900 text-xs">{selectedAsset.name}</span>
                            </div>
                            <p className="text-[11px] text-slate-500">
                              Model: <span className="text-slate-700 font-semibold">{selectedAsset.model || 'N/A'}</span>
                              {selectedAsset.serialNumber && ` | SN: ${selectedAsset.serialNumber}`}
                            </p>
                            {selectedAsset.assignments?.[0]?.user && (
                              <p className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                                <UserIcon className="w-3 h-3 text-emerald-600" />
                                <span>{isEn ? 'Assigned to:' : 'Đang giao cho:'} {selectedAsset.assignments[0].user.fullName} {selectedAsset.assignments[0].user.department ? `(${selectedAsset.assignments[0].user.department})` : ''}</span>
                              </p>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => setSelectedAsset(null)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer transition-colors"
                            title={isEn ? 'Change asset' : 'Chọn máy khác'}
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="relative">
                          <label className="block font-semibold text-slate-700 mb-1">
                            {isEn ? 'Search and select receiving device / asset:' : 'Tìm kiếm & chọn thiết bị nhận linh kiện:'}
                          </label>
                          <div className="relative">
                            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                              type="text"
                              placeholder={isEn ? "Type asset name, tag (e.g. LP-001), serial, model..." : "Gõ tên máy, mã tài sản (LP-...), serial, model..."}
                              value={assetSearch}
                              onChange={(e) => setAssetSearch(e.target.value)}
                              className="w-full pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-medium text-xs"
                            />
                            {searchingAssets && (
                              <Loader2 className="w-4 h-4 text-indigo-600 animate-spin absolute right-3 top-1/2 -translate-y-1/2" />
                            )}
                          </div>

                          {/* Autocomplete Asset Dropdown */}
                          {assetResults.length > 0 && (
                            <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-48 overflow-y-auto z-20 divide-y divide-slate-100">
                              {assetResults.map((a) => (
                                <div
                                  key={a.id}
                                  onClick={() => {
                                    setSelectedAsset(a);
                                    setAssetResults([]);
                                    setAssetSearch('');
                                  }}
                                  className="p-2.5 hover:bg-indigo-50/70 cursor-pointer transition-colors space-y-0.5"
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="font-bold text-slate-900 text-xs">
                                      {a.assetTag ? `[${a.assetTag}] ` : ''}{a.name}
                                    </span>
                                    <span className="text-[10px] text-slate-400 font-mono">{a.model}</span>
                                  </div>
                                  {a.assignments?.[0]?.user && (
                                    <p className="text-[11px] text-slate-500 flex items-center gap-1">
                                      <UserIcon className="w-3 h-3 text-slate-400" />
                                      <span>{a.assignments[0].user.fullName} {a.assignments[0].user.department ? `(${a.assignments[0].user.department})` : ''}</span>
                                    </p>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Maintenance Type */}
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <div>
                          <label className="block font-semibold text-slate-700 mb-1">
                            {isEn ? 'Maintenance / Action Type' : 'Loại nâng cấp / sửa chữa'}
                          </label>
                          <select
                            value={maintenanceType}
                            onChange={(e: any) => setMaintenanceType(e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none font-semibold text-xs cursor-pointer"
                          >
                            <option value="UPGRADE">🚀 Nâng cấp cấu hình (RAM/SSD)</option>
                            <option value="REPLACEMENT">🔄 Thay thế linh kiện hỏng</option>
                            <option value="REPAIR">🔧 Sửa chữa khắc phục sự cố</option>
                            <option value="OTHER">📌 Khác</option>
                          </select>
                        </div>

                        <div className="flex items-center pt-5">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={createMaintenanceLog}
                              onChange={(e) => setCreateMaintenanceLog(e.target.checked)}
                              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 cursor-pointer"
                            />
                            <span className="text-[11px] font-bold text-slate-700">
                              {isEn ? 'Record in Asset Maintenance Log' : 'Lưu vào Nhật ký bảo trì máy'}
                            </span>
                          </label>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 2: USER SELECTION */}
                  {exportTarget === 'USER' && (
                    <div className="space-y-2.5 p-3.5 bg-blue-50/40 rounded-2xl border border-blue-100">
                      {selectedUser ? (
                        <div className="p-3 bg-white rounded-xl border border-blue-200 shadow-xs flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0">
                              {selectedUser.fullName?.charAt(0) || 'U'}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900 text-xs">{selectedUser.fullName}</p>
                              <p className="text-[11px] text-slate-500">
                                {selectedUser.department || 'Phòng ban N/A'} {selectedUser.email ? `• ${selectedUser.email}` : ''}
                              </p>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => setSelectedUser(null)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="relative">
                          <label className="block font-semibold text-slate-700 mb-1">
                            {isEn ? 'Search and select receiving employee:' : 'Tìm kiếm & chọn nhân viên nhận phụ kiện:'}
                          </label>
                          <div className="relative">
                            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                              type="text"
                              placeholder={isEn ? "Type employee name, department, email..." : "Gõ tên nhân viên, phòng ban, email..."}
                              value={userSearch}
                              onChange={(e) => setUserSearch(e.target.value)}
                              className="w-full pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-medium text-xs"
                            />
                            {searchingUsers && (
                              <Loader2 className="w-4 h-4 text-indigo-600 animate-spin absolute right-3 top-1/2 -translate-y-1/2" />
                            )}
                          </div>

                          {/* Autocomplete User Dropdown */}
                          {userResults.length > 0 && (
                            <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-48 overflow-y-auto z-20 divide-y divide-slate-100">
                              {userResults.map((u) => (
                                <div
                                  key={u.id}
                                  onClick={() => {
                                    setSelectedUser(u);
                                    setUserResults([]);
                                    setUserSearch('');
                                  }}
                                  className="p-2.5 hover:bg-blue-50/70 cursor-pointer transition-colors flex items-center justify-between"
                                >
                                  <div>
                                    <p className="font-bold text-slate-900 text-xs">{u.fullName}</p>
                                    <p className="text-[11px] text-slate-500">{u.department || '—'} • {u.email}</p>
                                  </div>
                                  <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 3: SCRAP / OTHER */}
                  {exportTarget === 'OTHER' && (
                    <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-amber-900 text-xs space-y-1">
                      <p className="font-bold">⚠️ Xuất hủy, hao hụt hoặc trả hàng nhà cung cấp</p>
                      <p className="text-[11px] text-amber-700">
                        Linh kiện sẽ được giảm tồn kho với lý do hỏng hóc hoặc thanh lý. Vui lòng điền chi tiết ở ô ghi chú bên dưới.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Note / Purpose */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {actionType === 'IN'
                    ? (isEn ? 'Note / Restock Source / Invoice #' : 'Ghi chú nguồn nhập / Số hóa đơn')
                    : (isEn ? 'Detailed reason / Purpose of use' : 'Ghi chú chi tiết / Lý do xuất')}
                </label>
                <input
                  type="text"
                  placeholder={
                    actionType === 'IN'
                      ? (isEn ? "e.g. Restocked from Phong Vu invoice #1234..." : "VD: Nhập thêm đợt 2 từ Phong Vũ, hóa đơn #1234...")
                      : (isEn ? "e.g. Upgrade RAM from 8GB to 16GB due to slow performance..." : "VD: Nâng cấp RAM lên 16GB phục vụ chạy máy ảo, máy chạy chậm...")
                  }
                  value={actionNote}
                  onChange={(e) => setActionNote(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-indigo-500"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsStockActionOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  {isEn ? 'Cancel' : 'Hủy'}
                </button>

                <button
                  type="submit"
                  disabled={submittingAction}
                  className={`px-5 py-2 rounded-xl text-white font-bold shadow-md cursor-pointer flex items-center gap-1.5 transition-all ${
                    actionType === 'IN'
                      ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                      : 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/20'
                  }`}
                >
                  {submittingAction && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>
                    {actionType === 'IN'
                      ? (isEn ? 'Confirm Restock' : 'Xác Nhận Nhập Kho')
                      : (isEn ? 'Confirm Stock Out' : 'Xác Nhận Xuất Kho')}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 🚀 MODAL: FULL TRANSACTION HISTORY                       */}
      {/* ======================================================== */}
      {isHistoryOpen && selectedPart && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 space-y-4 border border-slate-200 animate-in fade-in zoom-in-95 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-base text-slate-900">{isEn ? 'Inventory Transaction History' : 'Lịch Sử Xuất Nhập Kho Chi Tiết'}</h3>
                <p className="text-[11px] text-slate-400">{selectedPart.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setIsHistoryOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {historyLoading ? (
              <div className="p-8 text-center">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-600 mx-auto" />
              </div>
            ) : historyList.length === 0 ? (
              <p className="p-6 text-center text-xs text-slate-400">{isEn ? 'No transaction records found' : 'Chưa có giao dịch xuất nhập nào'}</p>
            ) : (
              <div className="divide-y divide-slate-100 text-xs">
                {historyList.map((tx) => (
                  <div key={tx.id} className="py-3 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                            tx.type === 'IN' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {tx.type === 'IN' ? '+' : '-'}
                        </span>
                        <div>
                          <p className="font-bold text-slate-800">
                            {tx.type === 'IN' ? (isEn ? 'Stock In' : 'Nhập kho') : (isEn ? 'Stock Out' : 'Xuất kho')}: {Math.abs(tx.quantity)} {selectedPart.unit}
                          </p>
                        </div>
                      </div>

                      <div className="text-right text-[11px] text-slate-400">
                        <p>{new Date(tx.createdAt).toLocaleDateString(isEn ? 'en-US' : 'vi-VN')}</p>
                        <p>{tx.performedBy?.fullName || 'IT Staff'}</p>
                      </div>
                    </div>

                    {/* Target details */}
                    {tx.asset && (
                      <div className="ml-9 flex flex-wrap items-center gap-1.5 text-[11px]">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-semibold border border-blue-100">
                          <Laptop className="w-3 h-3" />
                          <span>{tx.asset.assetTag ? `[${tx.asset.assetTag}] ` : ''}{tx.asset.name}</span>
                        </span>
                        {tx.asset.assignments?.[0]?.user && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium">
                            <UserIcon className="w-3 h-3 text-slate-400" />
                            <span>{tx.asset.assignments[0].user.fullName}</span>
                          </span>
                        )}
                      </div>
                    )}

                    {tx.note && (
                      <p className="ml-9 text-[11px] text-slate-500 italic bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100">
                        {tx.note}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 🚀 MODAL: EDIT PART                                      */}
      {/* ======================================================== */}
      {isEditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 space-y-5 border border-slate-200 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-indigo-600" />
                <span>{isEn ? 'Edit Spare Part & Component' : 'Chỉnh Sửa Thông Tin Phụ Tùng'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsEditOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEdit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {isEn ? 'Part / Component Name' : 'Tên phụ tùng / Linh kiện'} <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-indigo-500 font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{isEn ? 'SKU Code / Inventory Code' : 'Mã SKU / Mã kho'}</label>
                  <input
                    type="text"
                    value={editSku}
                    onChange={(e) => setEditSku(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-indigo-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">{isEn ? 'Category' : 'Danh mục'}</label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-indigo-500 font-semibold cursor-pointer"
                  >
                    <option value="">{isEn ? '-- Select category --' : '-- Chọn danh mục --'}</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{isEn ? 'Minimum Threshold' : 'Ngưỡng tối thiểu cảnh báo'}</label>
                  <input
                    type="number"
                    min="1"
                    value={editMinStock}
                    onChange={(e) => setEditMinStock(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">{isEn ? 'Unit' : 'Đơn vị tính'}</label>
                  <input
                    type="text"
                    value={editUnit}
                    onChange={(e) => setEditUnit(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">{isEn ? 'Estimated Unit Cost (VND)' : 'Đơn giá nhập (VND)'}</label>
                <input
                  type="number"
                  value={editPrice}
                  onChange={(e) => setEditPrice(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{isEn ? 'Supplier / Vendor' : 'Nhà cung cấp'}</label>
                  <select
                    value={editVendor}
                    onChange={(e) => setEditVendor(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none font-semibold cursor-pointer"
                  >
                    <option value="">{isEn ? '-- Select Vendor --' : '-- Chọn NCC --'}</option>
                    {vendors.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">{isEn ? 'Storage Location' : 'Vị trí lưu kho'}</label>
                  <select
                    value={editLocation}
                    onChange={(e) => setEditLocation(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none font-semibold cursor-pointer"
                  >
                    <option value="">{isEn ? '-- Select Location --' : '-- Chọn vị trí --'}</option>
                    {locations.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">{isEn ? 'Notes' : 'Ghi chú'}</label>
                <textarea
                  rows={2}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  {isEn ? 'Cancel' : 'Hủy'}
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl font-bold shadow-md shadow-indigo-600/20 flex items-center gap-1.5 cursor-pointer"
                >
                  {updating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{isEn ? 'Save Changes' : 'Lưu Thay Đổi'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 🚀 MODAL: CREATE PART                                    */}
      {/* ======================================================== */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 space-y-5 border border-slate-200 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-900">{isEn ? 'Add New Spare Part & Component' : 'Thêm Phụ Tùng & Linh Kiện Mới'}</h3>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {isEn ? 'Part / Component Name' : 'Tên phụ tùng / Linh kiện'} <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder={isEn ? "e.g. RAM DDR4 16GB Kingston 3200MHz..." : "VD: RAM DDR4 16GB Kingston 3200MHz..."}
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-indigo-500 font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{isEn ? 'SKU Code / Inventory Code' : 'Mã SKU / Mã kho'}</label>
                  <input
                    type="text"
                    placeholder="VD: RAM-DDR4-16G"
                    value={formSku}
                    onChange={(e) => setFormSku(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-indigo-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">{isEn ? 'Category' : 'Danh mục'}</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-indigo-500 font-semibold cursor-pointer"
                  >
                    <option value="">{isEn ? '-- Select category --' : '-- Chọn danh mục --'}</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{isEn ? 'Initial Stock' : 'Số lượng ban đầu'}</label>
                  <input
                    type="number"
                    min="0"
                    value={formQty}
                    onChange={(e) => setFormQty(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">{isEn ? 'Minimum Threshold' : 'Ngưỡng tối thiểu'}</label>
                  <input
                    type="number"
                    min="1"
                    value={formMinStock}
                    onChange={(e) => setFormMinStock(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">{isEn ? 'Unit' : 'Đơn vị tính'}</label>
                  <input
                    type="text"
                    placeholder={isEn ? "pcs, meter, set..." : "cái, mét, bộ..."}
                    value={formUnit}
                    onChange={(e) => setFormUnit(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">{isEn ? 'Estimated Unit Cost (VND)' : 'Đơn giá nhập dự tính (VND)'}</label>
                <input
                  type="number"
                  placeholder="VD: 850000"
                  value={formPrice}
                  onChange={(e) => setFormPrice(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{isEn ? 'Supplier / Vendor' : 'Nhà cung cấp'}</label>
                  <select
                    value={formVendor}
                    onChange={(e) => setFormVendor(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none font-semibold cursor-pointer"
                  >
                    <option value="">{isEn ? '-- Select Vendor --' : '-- Chọn NCC --'}</option>
                    {vendors.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">{isEn ? 'Storage Location' : 'Vị trí lưu kho'}</label>
                  <select
                    value={formLocation}
                    onChange={(e) => setFormLocation(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none font-semibold cursor-pointer"
                  >
                    <option value="">{isEn ? '-- Select Location --' : '-- Chọn vị trí --'}</option>
                    {locations.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">{isEn ? 'Notes' : 'Ghi chú'}</label>
                <textarea
                  rows={2}
                  placeholder={isEn ? "Additional specifications, shelf/bin position..." : "Ghi chú thêm về thông số, vị trí ngăn tủ..."}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  {isEn ? 'Cancel' : 'Hủy'}
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl font-bold shadow-md shadow-indigo-600/20 flex items-center gap-1.5 cursor-pointer"
                >
                  {creating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{isEn ? 'Save Spare Part' : 'Lưu Phụ Tùng'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
