'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '@/lib/i18n/context';
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

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isStockActionOpen, setIsStockActionOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [selectedPart, setSelectedPart] = useState<SparePart | null>(null);
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Stock action form
  const [actionType, setActionType] = useState<'IN' | 'OUT'>('IN');
  const [actionQty, setActionQty] = useState('1');
  const [actionNote, setActionNote] = useState('');
  const [submittingAction, setSubmittingAction] = useState(false);

  // Create form
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

  // Dropdowns
  const [categories, setCategories] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);

  useEffect(() => {
    loadParts();
    loadDropdowns();
  }, [lowStockFilter]);

  const loadParts = async () => {
    setLoading(true);
    try {
      const query = lowStockFilter ? '?lowStock=true' : '';
      const res = await fetch(`/api/spare-parts${query}`);
      const data = await res.json();
      if (data.success) {
        setParts(data.spareParts);
        if (data.stats) setStats(data.stats);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

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
        loadParts();
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
      alert(isEn ? `Cannot dispense more than in stock (${selectedPart.quantity} ${selectedPart.unit})` : `Không thể xuất nhiều hơn số lượng tồn kho (${selectedPart.quantity} ${selectedPart.unit})`);
      return;
    }

    setSubmittingAction(true);
    try {
      const res = await fetch(`/api/spare-parts/${selectedPart.id}/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: actionType,
          quantity: qty,
          note: actionNote.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setIsStockActionOpen(false);
        setActionQty('1');
        setActionNote('');
        loadParts();
      } else {
        alert(data.error || (isEn ? 'Transaction failed' : 'Lỗi thực hiện giao dịch'));
      }
    } catch (e: any) {
      alert(e.message || (isEn ? 'Action failed' : 'Lỗi thực hiện'));
    } finally {
      setSubmittingAction(false);
    }
  };

  const loadHistory = async (part: SparePart) => {
    setSelectedPart(part);
    setIsHistoryOpen(true);
    setHistoryLoading(true);
    try {
      const res = await fetch(`/api/spare-parts/${part.id}/transactions`);
      const data = await res.json();
      if (data.success) {
        setHistoryList(data.transactions);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    const confirmMsg = isEn ? `Are you sure you want to remove "${name}" from inventory?` : `Bạn có chắc muốn xóa phụ tùng "${name}" khỏi kho?`;
    if (!confirm(confirmMsg)) return;
    try {
      const res = await fetch(`/api/spare-parts/${id}`, { method: 'DELETE' });
      if (res.ok) loadParts();
    } catch {}
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
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchName = p.name.toLowerCase().includes(q);
      const matchSku = p.sku?.toLowerCase().includes(q);
      if (!matchName && !matchSku) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <Boxes className="w-7 h-7 text-indigo-600" />
            <span>{isEn ? 'Spare Parts & Consumables Management' : 'Quản Lý Kho Phụ Tùng & Linh Kiện'}</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {isEn
              ? 'Track inventory of RAM, SSD, network cables, adapters, keyboards with automated minimum threshold alerts'
              : 'Theo dõi tồn kho RAM, SSD, cáp mạng, adapter, bàn phím và tự động cảnh báo khi dưới mức tối thiểu'}
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            resetCreateForm();
            setIsCreateOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 transition-all cursor-pointer hover:scale-105 active:scale-95 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>{isEn ? '+ Add Spare Part' : 'Thêm Phụ Tùng Mới'}</span>
        </button>
      </div>

      {/* Stats Summary */}
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
        {loading ? (
          <div className="p-12 text-center">
            <Loader2 className="w-7 h-7 text-indigo-600 animate-spin mx-auto mb-2" />
            <p className="text-xs text-slate-400">{isEn ? 'Loading inventory data...' : 'Đang tải dữ liệu kho phụ tùng...'}</p>
          </div>
        ) : filteredParts.length === 0 ? (
          <div className="p-12 text-center">
            <Boxes className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-700">{isEn ? 'No spare parts in inventory' : 'Không có linh kiện nào trong kho'}</p>
            <p className="text-xs text-slate-400 mt-1">
              {isEn ? 'Click "+ Add Spare Part" to start managing replacement components.' : 'Nhấn "Thêm Phụ Tùng Mới" để bắt đầu quản lý tồn kho linh kiện thay thế.'}
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
                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-5 py-3.5 font-bold text-slate-900">
                        {p.name}
                        {p.notes && <p className="text-[10px] text-slate-400 font-normal mt-0.5">{p.notes}</p>}
                      </td>
                      <td className="px-4 py-3.5 font-mono text-indigo-700 font-semibold">{p.sku || '—'}</td>
                      <td className="px-4 py-3.5 text-slate-600">{p.category?.name || '—'}</td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <span className={`font-black text-sm ${isLow ? 'text-rose-600' : 'text-slate-800'}`}>
                            {p.quantity} {p.unit}
                          </span>
                          {isLow && (
                            <span className="text-[10px] font-bold bg-rose-100 text-rose-700 px-1.5 py-0.2 rounded flex items-center gap-0.5">
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
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Quick In/Out Buttons */}
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedPart(p);
                              setActionType('IN');
                              setIsStockActionOpen(true);
                            }}
                            className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold text-[11px] flex items-center gap-0.5 cursor-pointer"
                            title={isEn ? "Restock inventory" : "Nhập thêm vào kho"}
                          >
                            <ArrowDownRight className="w-3.5 h-3.5" />
                            <span>{isEn ? 'Stock In' : 'Nhập'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setSelectedPart(p);
                              setActionType('OUT');
                              setIsStockActionOpen(true);
                            }}
                            className="p-1.5 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 font-bold text-[11px] flex items-center gap-0.5 cursor-pointer"
                            title={isEn ? "Dispense part" : "Xuất dùng phụ tùng"}
                          >
                            <ArrowUpRight className="w-3.5 h-3.5" />
                            <span>{isEn ? 'Stock Out' : 'Xuất'}</span>
                          </button>

                          {/* History */}
                          <button
                            type="button"
                            onClick={() => loadHistory(p)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                            title={isEn ? "Transaction history" : "Lịch sử xuất nhập"}
                          >
                            <History className="w-4 h-4" />
                          </button>

                          {/* Delete */}
                          <button
                            type="button"
                            onClick={() => handleDelete(p.id, p.name)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                            title={isEn ? "Delete" : "Xóa"}
                          >
                            <Trash2 className="w-4 h-4" />
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

      {/* MODAL: STOCK IN / OUT */}
      {isStockActionOpen && selectedPart && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-900">
                {actionType === 'IN' ? (isEn ? '📥 Restock Part' : '📥 Nhập Thêm Vào Kho') : (isEn ? '📤 Dispense Part' : '📤 Xuất Kho Sử Dụng')}
              </h3>
              <button
                type="button"
                onClick={() => setIsStockActionOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl text-xs space-y-1">
              <p><strong>{isEn ? 'Part:' : 'Linh kiện:'}</strong> {selectedPart.name}</p>
              <p><strong>{isEn ? 'Current stock:' : 'Tồn kho hiện tại:'}</strong> {selectedPart.quantity} {selectedPart.unit}</p>
            </div>

            <form onSubmit={handleStockAction} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {isEn ? `Quantity to ${actionType === 'IN' ? 'restock' : 'dispense'} (${selectedPart.unit})` : `Số lượng ${actionType === 'IN' ? 'nhập thêm' : 'xuất dùng'} (${selectedPart.unit})`} <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  max={actionType === 'OUT' ? selectedPart.quantity : undefined}
                  required
                  value={actionQty}
                  onChange={(e) => setActionQty(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-base text-slate-900 focus:bg-white focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">{isEn ? 'Note / Purpose of use' : 'Ghi chú / Mục đích sử dụng'}</label>
                <input
                  type="text"
                  placeholder={isEn ? "e.g. RAM upgrade for accounting laptop DELL-0023..." : "VD: Thay thế RAM cho laptop DELL-0023 của phòng Kế toán..."}
                  value={actionNote}
                  onChange={(e) => setActionNote(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
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
                  className={`px-5 py-2 rounded-xl text-white font-bold shadow-md cursor-pointer flex items-center gap-1.5 ${
                    actionType === 'IN' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20' : 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/20'
                  }`}
                >
                  {submittingAction && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{actionType === 'IN' ? (isEn ? 'Confirm Stock In' : 'Xác Nhận Nhập Kho') : (isEn ? 'Confirm Stock Out' : 'Xác Nhận Xuất Kho')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: TRANSACTION HISTORY */}
      {isHistoryOpen && selectedPart && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 space-y-4 border border-slate-200 animate-in fade-in zoom-in-95 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-base text-slate-900">{isEn ? 'Inventory Transaction History' : 'Lịch Sử Xuất Nhập Kho'}</h3>
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
                  <div key={tx.id} className="py-2.5 flex items-center justify-between gap-3">
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
                        {tx.note && <p className="text-[11px] text-slate-500">{tx.note}</p>}
                      </div>
                    </div>
                    <div className="text-right text-[11px] text-slate-400">
                      <p>{new Date(tx.createdAt).toLocaleDateString(isEn ? 'en-US' : 'vi-VN')}</p>
                      <p>{tx.performedBy?.fullName}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: CREATE PART */}
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
