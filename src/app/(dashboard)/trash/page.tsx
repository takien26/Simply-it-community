'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '@/lib/i18n/context';
import {
  Trash2,
  RotateCcw,
  Search,
  Settings2,
  AlertTriangle,
  Clock,
  Laptop,
  Users,
  Key,
  LifeBuoy,
  FileText,
  Boxes,
  CheckCircle2,
  X,
  Loader2,
  RefreshCw,
  ShieldAlert,
} from 'lucide-react';

interface TrashItemRecord {
  id: string;
  entityType: string;
  entityId: string;
  entityName: string;
  entityCode?: string | null;
  dataSnapshot: any;
  deletedById?: string | null;
  deletedByName?: string | null;
  deletedAt: string;
  expiresAt: string;
}

export default function TrashPage() {
  const { language } = useLanguage();
  const isEn = language === 'en';

  const [items, setItems] = useState<TrashItemRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState('ALL');
  const [stats, setStats] = useState<any>({
    total: 0,
    expiringSoon: 0,
    retentionDays: 30,
    byType: {},
  });

  // Modal Settings State
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [retentionDaysInput, setRetentionDaysInput] = useState<number>(30);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // Loading actions state
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [isEmptyingTrash, setIsEmptyingTrash] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const url = new URL('/api/trash', window.location.origin);
      if (selectedType !== 'ALL') url.searchParams.set('type', selectedType);
      if (search.trim()) url.searchParams.set('search', search.trim());

      const res = await fetch(url.toString());
      const json = await res.json();
      if (json.success) {
        setItems(json.data || []);
        if (json.stats) {
          setStats(json.stats);
          setRetentionDaysInput(json.stats.retentionDays || 30);
        }
      }
    } catch (e) {
      console.error('Failed to load trash data', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedType, search]);

  // Restore item
  const handleRestore = async (item: TrashItemRecord) => {
    if (!confirm(isEn ? `Restore "${item.entityName}" back to active database?` : `Khôi phục "${item.entityName}" về hệ thống hoạt động bình thường?`)) return;

    setActionLoadingId(item.id);
    try {
      const res = await fetch(`/api/trash/${item.id}/restore`, { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        setItems((prev) => prev.filter((i) => i.id !== item.id));
        setStats((prev: any) => ({ ...prev, total: Math.max(0, prev.total - 1) }));
      } else {
        alert(json.error || 'Khôi phục thất bại');
      }
    } catch {
      alert('Lỗi kết nối khi khôi phục');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Permanently delete item
  const handleDeletePermanently = async (item: TrashItemRecord) => {
    if (!confirm(isEn ? `WARNING: Permanently delete "${item.entityName}"? This action CANNOT be undone!` : `⚠️ CẢNH BÁO: Xóa vĩnh viễn "${item.entityName}"? Dữ liệu sẽ KHÔNG THỂ phục hồi!`)) return;

    setActionLoadingId(item.id);
    try {
      const res = await fetch(`/api/trash/${item.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        setItems((prev) => prev.filter((i) => i.id !== item.id));
        setStats((prev: any) => ({ ...prev, total: Math.max(0, prev.total - 1) }));
      } else {
        alert(json.error || 'Xóa vĩnh viễn thất bại');
      }
    } catch {
      alert('Lỗi kết nối');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Empty trash
  const handleEmptyTrash = async (onlyExpired: boolean = false) => {
    const confirmMsg = onlyExpired
      ? (isEn ? 'Permanently delete all items that have exceeded retention days?' : 'Xóa vĩnh viễn tất cả các mục đã hết hạn lưu trữ?')
      : (isEn ? '⚠️ WARNING: Empty ENTIRE Recycle Bin? All deleted items will be lost permanently!' : '⚠️ CẢNH BÁO NGUY HIỂM: Bạn có chắc chắn muốn DỌN SẠCH THÙNG RÁC? Toàn bộ dữ liệu trong thùng rác sẽ bị xóa vĩnh viễn!');

    if (!confirm(confirmMsg)) return;

    setIsEmptyingTrash(true);
    try {
      const res = await fetch('/api/trash/empty', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ onlyExpired }),
      });
      const json = await res.json();
      if (json.success) {
        loadData();
      } else {
        alert(json.error || 'Thao tác thất bại');
      }
    } catch {
      alert('Lỗi kết nối');
    } finally {
      setIsEmptyingTrash(false);
    }
  };

  // Save retention settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);
    try {
      const res = await fetch('/api/trash/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ retentionDays: retentionDaysInput }),
      });
      const json = await res.json();
      if (json.success) {
        setStats((prev: any) => ({ ...prev, retentionDays: json.retentionDays }));
        setIsSettingsModalOpen(false);
        loadData();
      } else {
        alert(json.error || 'Lưu cài đặt thất bại');
      }
    } catch {
      alert('Lỗi kết nối');
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Helper remaining days
  const getDaysRemaining = (expiresAtStr: string) => {
    const diffMs = new Date(expiresAtStr).getTime() - Date.now();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Type badge helper
  const renderTypeBadge = (type: string) => {
    switch (type) {
      case 'ASSET':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-blue-100 text-blue-800 text-[11px] font-bold border border-blue-200">
            <Laptop className="w-3 h-3" />
            <span>{isEn ? 'Asset' : 'Thiết bị'}</span>
          </span>
        );
      case 'USER':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-purple-100 text-purple-800 text-[11px] font-bold border border-purple-200">
            <Users className="w-3 h-3" />
            <span>{isEn ? 'User' : 'Nhân sự'}</span>
          </span>
        );
      case 'LICENSE':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-100 text-amber-800 text-[11px] font-bold border border-amber-200">
            <Key className="w-3 h-3" />
            <span>{isEn ? 'License' : 'Bản quyền'}</span>
          </span>
        );
      case 'TICKET':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-cyan-100 text-cyan-800 text-[11px] font-bold border border-cyan-200">
            <LifeBuoy className="w-3 h-3" />
            <span>{isEn ? 'Ticket' : 'Phiếu hỗ trợ'}</span>
          </span>
        );
      case 'DOCUMENT':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-800 text-[11px] font-bold border border-emerald-200">
            <FileText className="w-3 h-3" />
            <span>{isEn ? 'Document' : 'Tài liệu'}</span>
          </span>
        );
      case 'SPARE_PART':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-indigo-100 text-indigo-800 text-[11px] font-bold border border-indigo-200">
            <Boxes className="w-3 h-3" />
            <span>{isEn ? 'Spare Part' : 'Linh kiện'}</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-100 text-slate-800 text-[11px] font-bold">
            <span>{type}</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-slate-100 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                {isEn ? 'Recycle Bin & Data Recovery' : 'Thùng Rác & Khôi Phục Dữ Liệu'}
              </h1>
              <p className="text-xs text-slate-500">
                {isEn
                  ? `Safely retain deleted items for ${stats.retentionDays} days before permanent deletion`
                  : `Lưu trữ an toàn các mục đã xóa trong ${stats.retentionDays} ngày trước khi tự động xóa vĩnh viễn`}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Cài đặt thời gian lưu */}
          <button
            type="button"
            onClick={() => setIsSettingsModalOpen(true)}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold shadow-2xs flex items-center gap-1.5 cursor-pointer transition-all"
            title={isEn ? 'Configure retention days' : 'Cài đặt số ngày lưu trữ trong thùng rác'}
          >
            <Settings2 className="w-4 h-4 text-purple-600" />
            <span>{isEn ? `Retention: ${stats.retentionDays}d` : `Lưu: ${stats.retentionDays} ngày`}</span>
          </button>

          {/* Dọn sạch thùng rác */}
          <button
            type="button"
            disabled={items.length === 0 || isEmptyingTrash}
            onClick={() => handleEmptyTrash(false)}
            className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-1.5 cursor-pointer transition-all"
            title={isEn ? 'Empty all items in trash permanently' : 'Dọn sạch toàn bộ thùng rác ngay lập tức'}
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{isEmptyingTrash ? (isEn ? 'Emptying...' : 'Đang dọn...') : (isEn ? 'Empty Trash' : 'Dọn Sạch Thùng Rác')}</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">{isEn ? 'Total in Trash' : 'Tổng mục đã xóa'}</span>
            <Trash2 className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            {stats.total}
          </div>
          <span className="text-[10.5px] text-slate-400 mt-0.5 block">{isEn ? 'Awaiting restore or purge' : 'Đang chờ xử lý'}</span>
        </div>

        <div className="p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">{isEn ? 'Expiring Soon' : 'Sắp hết hạn (<7 ngày)'}</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-amber-600 mt-1">
            {stats.expiringSoon}
          </div>
          <span className="text-[10.5px] text-slate-400 mt-0.5 block">{isEn ? 'Will be purged automatically' : 'Sắp bị xóa vĩnh viễn'}</span>
        </div>

        <div className="p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">{isEn ? 'Retention Policy' : 'Chính sách lưu trữ'}</span>
            <Clock className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl font-black text-purple-600 mt-1">
            {stats.retentionDays} <span className="text-xs font-bold text-slate-400">{isEn ? 'days' : 'ngày'}</span>
          </div>
          <span className="text-[10.5px] text-slate-400 mt-0.5 block">{isEn ? 'Default: 30 days' : 'Mặc định: 30 ngày'}</span>
        </div>

        <div className="p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">{isEn ? 'Devices & Licenses' : 'Thiết bị & Bản quyền'}</span>
            <ShieldAlert className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-black text-blue-600 mt-1">
            {(stats.byType?.ASSET || 0) + (stats.byType?.LICENSE || 0)}
          </div>
          <span className="text-[10.5px] text-slate-400 mt-0.5 block">
            {stats.byType?.ASSET || 0} {isEn ? 'devices' : 'máy'} • {stats.byType?.LICENSE || 0} {isEn ? 'lic' : 'bản quyền'}
          </span>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-2.5">
        {/* Search */}
        <div className="relative w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
          <input
            type="text"
            placeholder={isEn ? 'Search by item name, tag, code, or deleter...' : 'Tìm kiếm theo tên mục, mã tài sản, người thực hiện xóa...'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-8 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-purple-500 font-medium text-slate-800 dark:text-slate-100 placeholder:text-slate-400"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 text-xs p-0.5 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Categories Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 text-xs">
          {[
            { key: 'ALL', label: isEn ? 'All Items' : 'Tất cả', icon: Trash2 },
            { key: 'ASSET', label: isEn ? 'Devices' : '💻 Thiết bị', count: stats.byType?.ASSET },
            { key: 'USER', label: isEn ? 'Users' : '👤 Nhân sự', count: stats.byType?.USER },
            { key: 'LICENSE', label: isEn ? 'Licenses' : '🔑 Bản quyền', count: stats.byType?.LICENSE },
            { key: 'TICKET', label: isEn ? 'Tickets' : '🎫 Phiếu hỗ trợ', count: stats.byType?.TICKET },
            { key: 'DOCUMENT', label: isEn ? 'Documents' : '📄 Tài liệu', count: stats.byType?.DOCUMENT },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setSelectedType(tab.key)}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all border cursor-pointer shrink-0 flex items-center gap-1.5 ${
                selectedType === tab.key
                  ? 'bg-slate-900 border-slate-900 text-white shadow-2xs'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
              }`}
            >
              <span>{tab.label}</span>
              {tab.count !== undefined && tab.count > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                  selectedType === tab.key ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden">
        <table className="w-full table-fixed text-left text-xs border-collapse">
          <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-500 uppercase tracking-wider select-none">
            <tr>
              <th className="py-3 px-3 w-[34%]">{isEn ? 'ITEM & CODE' : 'TÊN MỤC & MÃ ĐỐI TƯỢNG'}</th>
              <th className="py-3 px-3 w-[16%]">{isEn ? 'TYPE' : 'PHÂN LOẠI'}</th>
              <th className="py-3 px-3 w-[20%]">{isEn ? 'DELETED BY / AT' : 'NGƯỜI XÓA & THỜI ĐIỂM'}</th>
              <th className="py-3 px-3 w-[15%]">{isEn ? 'RETENTION' : 'THỜI HẠN CÒN LẠI'}</th>
              <th className="py-3 px-3 text-right w-[15%]">{isEn ? 'ACTIONS' : 'THAO TÁC'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {loading ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-slate-400">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-purple-600" />
                  <span>{isEn ? 'Loading recycle bin...' : 'Đang tải danh sách thùng rác...'}</span>
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-14 text-center text-slate-400">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-2">
                    <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                  </div>
                  <div className="font-bold text-slate-700 dark:text-slate-300 text-sm">
                    {isEn ? 'Recycle bin is clean!' : 'Thùng rác hoàn toàn sạch sẽ!'}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {isEn ? 'No deleted items awaiting recovery or purge.' : 'Không có mục nào bị xóa đang chờ khôi phục.'}
                  </p>
                </td>
              </tr>
            ) : (
              items.map((item) => {
                const daysLeft = getDaysRemaining(item.expiresAt);
                const isUrgent = daysLeft <= 3;

                return (
                  <tr key={item.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors">
                    {/* Cột 1: Tên mục & Mã */}
                    <td className="py-3 px-3">
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 dark:text-white truncate text-xs" title={item.entityName}>
                          {item.entityName}
                        </div>
                        {item.entityCode && (
                          <div className="text-[11px] font-mono text-slate-400 truncate mt-0.5">
                            {item.entityCode}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Cột 2: Phân loại */}
                    <td className="py-3 px-3">
                      {renderTypeBadge(item.entityType)}
                    </td>

                    {/* Cột 3: Người xóa & Thời điểm */}
                    <td className="py-3 px-3 text-xs">
                      <div className="text-slate-700 dark:text-slate-300 font-medium truncate">
                        {item.deletedByName || (isEn ? 'Administrator' : 'Quản trị viên')}
                      </div>
                      <div className="text-[10.5px] text-slate-400 mt-0.5">
                        {new Date(item.deletedAt).toLocaleString('vi-VN')}
                      </div>
                    </td>

                    {/* Cột 4: Thời hạn còn lại */}
                    <td className="py-3 px-3">
                      {daysLeft <= 0 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-rose-100 text-rose-800 text-[10.5px] font-bold border border-rose-200">
                          ⚠️ {isEn ? 'Expired' : 'Đã hết hạn'}
                        </span>
                      ) : (
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10.5px] font-bold border ${
                          isUrgent
                            ? 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse'
                            : daysLeft <= 7
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}>
                          <Clock className="w-3 h-3" />
                          <span>{isEn ? `${daysLeft}d left` : `Còn ${daysLeft} ngày`}</span>
                        </span>
                      )}
                    </td>

                    {/* Cột 5: Thao tác */}
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Nút Khôi phục */}
                        <button
                          type="button"
                          disabled={actionLoadingId === item.id}
                          onClick={() => handleRestore(item)}
                          className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer disabled:opacity-50"
                          title={isEn ? 'Restore to original system' : 'Khôi phục về trạng thái bình thường'}
                        >
                          <RotateCcw className={`w-3.5 h-3.5 text-emerald-600 ${actionLoadingId === item.id ? 'animate-spin' : ''}`} />
                          <span>{isEn ? 'Restore' : 'Khôi phục'}</span>
                        </button>

                        {/* Nút Xóa vĩnh viễn */}
                        <button
                          type="button"
                          disabled={actionLoadingId === item.id}
                          onClick={() => handleDeletePermanently(item)}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg border border-transparent hover:border-rose-200 transition-all cursor-pointer"
                          title={isEn ? 'Delete permanently' : 'Xóa vĩnh viễn'}
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

      {/* Modal Cài Đặt Số Ngày Lưu Trữ (Retention Settings Modal) */}
      {isSettingsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 w-full max-w-md space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                  <Clock className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  {isEn ? 'Trash Retention Settings' : 'Cài Đặt Thời Gian Lưu Thùng Rác'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsSettingsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  {isEn ? 'Retention period before automatic permanent purge:' : 'Thời gian lưu trữ trước khi hệ thống tự động xóa vĩnh viễn:'}
                </label>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {[7, 14, 30, 60, 90, 180].map((days) => (
                    <button
                      key={days}
                      type="button"
                      onClick={() => setRetentionDaysInput(days)}
                      className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center ${
                        retentionDaysInput === days
                          ? 'bg-purple-600 border-purple-600 text-white shadow-sm'
                          : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-purple-50'
                      }`}
                    >
                      {days} {isEn ? 'days' : 'ngày'} {days === 30 ? (isEn ? '(Default)' : '(Mặc định)') : ''}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 font-medium">{isEn ? 'Or custom days:' : 'Hoặc số ngày tùy chỉnh:'}</span>
                  <input
                    type="number"
                    min="1"
                    max="365"
                    value={retentionDaysInput}
                    onChange={(e) => setRetentionDaysInput(parseInt(e.target.value, 10) || 30)}
                    className="w-24 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <span className="text-xs text-slate-500">{isEn ? 'days' : 'ngày'}</span>
                </div>
              </div>

              <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-2xl text-xs text-blue-800 dark:text-blue-300 leading-relaxed">
                💡 <strong>{isEn ? 'Notice:' : 'Cơ chế hoạt động:'}</strong> {isEn
                  ? 'Items in trash will be automatically purged by background worker once they exceed this threshold. You can restore them anytime during this window.'
                  : 'Mỗi khi xóa tài sản, nhân sự hoặc bản quyền, hệ thống sẽ lưu an toàn trong Thùng rác. Hết số ngày cấu hình trên, hệ thống sẽ tự động dọn dẹp sạch sẽ.'}
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsSettingsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
                >
                  {isEn ? 'Cancel' : 'Hủy'}
                </button>
                <button
                  type="submit"
                  disabled={isSavingSettings}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isSavingSettings && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{isSavingSettings ? (isEn ? 'Saving...' : 'Đang lưu...') : (isEn ? 'Save Configuration' : 'Lưu Cấu Hình')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
