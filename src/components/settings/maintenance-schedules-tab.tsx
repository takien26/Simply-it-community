'use client';

import { useLanguage } from '@/lib/i18n/context';
import { useState, useEffect } from 'react';
import {
  Calendar,
  Plus,
  Clock,
  Wrench,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Zap,
  Trash2,
  Edit2,
  Laptop,
  Layers,
  User,
  ToggleLeft,
  ToggleRight,
  X,
  Save,
} from 'lucide-react';

const FREQUENCY_MAP: Record<string, string> = {
  MONTHLY: 'Hàng tháng (1 tháng/lần)',
  QUARTERLY: 'Hàng quý (3 tháng/lần)',
  SEMI_ANNUAL: 'Định kỳ 6 tháng/lần',
  ANNUAL: 'Hàng năm (12 tháng/lần)',
};

const TYPE_MAP: Record<string, string> = {
  REPAIR: 'Sửa chữa phần cứng',
  UPGRADE: 'Nâng cấp linh kiện',
  INSPECTION: 'Kiểm tra định kỳ',
  CLEANING: 'Vệ sinh máy & tra keo tản nhiệt',
  SOFTWARE_UPDATE: 'Cập nhật phần mềm & vá lỗi',
  REPLACEMENT: 'Thay thế phụ tùng định kỳ',
  OTHER: 'Khác',
};

export function MaintenanceSchedulesTab() {
  const { language } = useLanguage();
  const isEn = language === 'en';
  const [schedules, setSchedules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningNow, setRunningNow] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formFreq, setFormFreq] = useState('QUARTERLY');
  const [formType, setFormType] = useState('CLEANING');
  const [formTargetType, setFormTargetType] = useState<'ALL' | 'ASSET' | 'CATEGORY'>('ALL');
  const [formAssetId, setFormAssetId] = useState('');
  const [formCategoryId, setFormCategoryId] = useState('');
  const [formPriority, setFormPriority] = useState('MEDIUM');
  const [formAssignToId, setFormAssignToId] = useState('');
  const [formNextRun, setFormNextRun] = useState('');
  const [saving, setSaving] = useState(false);

  // Dropdown lists
  const [assetsList, setAssetsList] = useState<any[]>([]);
  const [categoriesList, setCategoriesList] = useState<any[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);

  useEffect(() => {
    loadSchedules();
    loadDropdowns();
  }, []);

  const loadSchedules = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/maintenance-schedules');
      const data = await res.json();
      if (data.success) {
        setSchedules(data.schedules);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadDropdowns = async () => {
    try {
      const [assetsRes, catsRes, usersRes] = await Promise.all([
        fetch('/api/assets?pageSize=100').then((r) => r.json()),
        fetch('/api/categories').then((r) => r.json()),
        fetch('/api/users').then((r) => r.json()),
      ]);

      if (assetsRes.data) setAssetsList(assetsRes.data);
      if (catsRes.categories) setCategoriesList(catsRes.categories);
      if (usersRes.users) setUsersList(usersRes.users);
    } catch {}
  };

  const handleRunNow = async () => {
    setRunningNow(true);
    setToast(null);
    try {
      const res = await fetch('/api/cron/maintenance', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setToast({
          type: 'success',
          message: `Đã chạy quét lịch bảo trì: Xử lý ${data.processedCount} lịch, tạo ${data.ticketsCreated} ticket bảo trì mới!`,
        });
        loadSchedules();
      } else {
        setToast({ type: 'error', message: data.error || 'Lỗi khi kích hoạt lịch' });
      }
    } catch (e: any) {
      setToast({ type: 'error', message: e.message });
    } finally {
      setRunningNow(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    setSaving(true);
    try {
      const payload = {
        name: formName.trim(),
        description: formDesc.trim() || undefined,
        frequency: formFreq,
        maintenanceType: formType,
        assetId: formTargetType === 'ASSET' ? formAssetId || null : null,
        categoryId: formTargetType === 'CATEGORY' ? formCategoryId || null : null,
        ticketPriority: formPriority,
        assignToId: formAssignToId || null,
        nextRunAt: formNextRun ? new Date(formNextRun).toISOString() : undefined,
      };

      const url = editingId ? `/api/maintenance-schedules/${editingId}` : '/api/maintenance-schedules';
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        setIsModalOpen(false);
        resetForm();
        loadSchedules();
        setToast({ type: 'success', message: editingId ? 'Đã cập nhật lịch bảo trì!' : 'Đã tạo lịch bảo trì mới thành công!' });
      } else {
        setToast({ type: 'error', message: data.error || 'Lưu thất bại' });
      }
    } catch (e: any) {
      setToast({ type: 'error', message: e.message });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (item: any) => {
    try {
      const res = await fetch(`/api/maintenance-schedules/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !item.isActive }),
      });
      if (res.ok) {
        setSchedules((prev) =>
          prev.map((s) => (s.id === item.id ? { ...s, isActive: !s.isActive } : s))
        );
      }
    } catch {}
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Bạn có chắc muốn xóa lịch bảo trì "${name}"?`)) return;
    try {
      const res = await fetch(`/api/maintenance-schedules/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setSchedules((prev) => prev.filter((s) => s.id !== id));
      }
    } catch {}
  };

  const resetForm = () => {
    setEditingId(null);
    setFormName('');
    setFormDesc('');
    setFormFreq('QUARTERLY');
    setFormType('CLEANING');
    setFormTargetType('ALL');
    setFormAssetId('');
    setFormCategoryId('');
    setFormPriority('MEDIUM');
    setFormAssignToId('');
    setFormNextRun('');
  };

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toast && (
        <div
          className={`p-4 rounded-2xl flex items-center gap-3 animate-in fade-in ${
            toast.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <span className="text-sm font-medium">{toast.message}</span>
        </div>
      )}

      {/* Header Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-base">{isEn ? 'Periodic Asset Maintenance Schedules' : 'Lịch Bảo Trì Thiết Bị Định Kỳ'}</h3>
            <p className="text-xs text-slate-500">{isEn ? 'Automatically create IT helpdesk tickets when periodic inspection, cleaning or parts replacement is due' : 'Tự động tạo Ticket hỗ trợ kỹ thuật khi đến hạn vệ sinh, kiểm tra, thay phụ tùng'}</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={handleRunNow}
            disabled={runningNow}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            {runningNow ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5 text-amber-600" />}
            <span>{isEn ? '⚡ Scan & Trigger Now' : '⚡ Quét & Kích Hoạt Ngay'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              resetForm();
              setIsModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{isEn ? '+ Add Maintenance Schedule' : 'Thêm Lịch Bảo Trì'}</span>
          </button>
        </div>
      </div>

      {/* Schedules List */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-12 text-center">
            <Loader2 className="w-7 h-7 text-blue-600 animate-spin mx-auto mb-2" />
            <p className="text-xs text-slate-400">{isEn ? 'Loading maintenance schedules...' : 'Đang tải danh sách lịch bảo trì...'}</p>
          </div>
        ) : schedules.length === 0 ? (
          <div className="p-12 text-center">
            <Wrench className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-700">{isEn ? 'No maintenance schedules configured yet' : 'Chưa có lịch bảo trì định kỳ nào'}</p>
            <p className="text-xs text-slate-400 mt-1">{isEn ? 'Create schedules for the system to automatically send reminders and generate periodic tickets for IT technicians.' : 'Tạo lịch để hệ thống tự động nhắc nhở và tạo ticket định kỳ cho KTV IT.'}</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {schedules.map((s) => {
              const targetLabel = s.asset
                ? `[${s.asset.assetTag}] ${s.asset.name}`
                : s.category
                ? `Tất cả thuộc: ${s.category.name}`
                : (isEn ? 'All assets' : 'Toàn bộ thiết bị');

              const nextRunFormatted = new Date(s.nextRunAt).toLocaleDateString('vi-VN');
              const isDue = new Date(s.nextRunAt) <= new Date();

              return (
                <div key={s.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 transition-colors">
                  <div className="flex items-start gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 mt-0.5">
                      <Wrench className="w-5 h-5" />
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-bold text-slate-800 text-sm">{s.name}</h4>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                          {FREQUENCY_MAP[s.frequency] || s.frequency}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                          {TYPE_MAP[s.maintenanceType] || s.maintenanceType}
                        </span>
                      </div>

                      <p className="text-xs text-slate-500 flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-slate-700">{isEn ? 'Applies to:' : 'Áp dụng:'} {targetLabel}</span>
                        {s.assignTo && (
                          <>
                            <span>•</span>
                            <span>KTV phụ trách: <strong>{s.assignTo.fullName}</strong></span>
                          </>
                        )}
                      </p>

                      <div className="flex items-center gap-2 text-[11px]">
                        <span className="text-slate-400">Lần chạy tiếp theo:</span>
                        <span className={`font-bold ${isDue ? 'text-rose-600' : 'text-slate-700'}`}>
                          {nextRunFormatted} {isDue && '(Đã đến hạn)'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-center">
                    {/* Toggle Active */}
                    <button
                      type="button"
                      onClick={() => handleToggleActive(s)}
                      className="flex items-center gap-1 text-xs font-semibold text-slate-600 cursor-pointer"
                      title={s.isActive ? 'Đang kích hoạt' : 'Đang tạm dừng'}
                    >
                      {s.isActive ? (
                        <ToggleRight className="w-6 h-6 text-emerald-600" />
                      ) : (
                        <ToggleLeft className="w-6 h-6 text-slate-400" />
                      )}
                    </button>

                    {/* Delete */}
                    <button
                      type="button"
                      onClick={() => handleDelete(s.id, s.name)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer transition-colors"
                      title="Xóa lịch"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL: ADD / EDIT SCHEDULE */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 space-y-5 border border-slate-200 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">
                    {editingId ? 'Chỉnh Sửa Lịch Bảo Trì' : 'Tạo Lịch Bảo Trì Định Kỳ Mới'}
                  </h3>
                  <p className="text-[11px] text-slate-400">Thiết lập chu kỳ nhắc việc và tự động tạo ticket</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Tên lịch bảo trì <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: Vệ sinh laptop & tra keo tản nhiệt định kỳ Q3..."
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-blue-500 font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tần suất chu kỳ</label>
                  <select
                    value={formFreq}
                    onChange={(e) => setFormFreq(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-blue-500 font-semibold cursor-pointer"
                  >
                    <option value="MONTHLY">Hàng tháng (1 tháng/lần)</option>
                    <option value="QUARTERLY">Hàng quý (3 tháng/lần)</option>
                    <option value="SEMI_ANNUAL">6 tháng/lần</option>
                    <option value="ANNUAL">Hàng năm (12 tháng/lần)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Loại hình bảo trì</label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-blue-500 font-semibold cursor-pointer"
                  >
                    <option value="CLEANING">Vệ sinh & tra keo tản nhiệt</option>
                    <option value="INSPECTION">Kiểm tra định kỳ</option>
                    <option value="UPGRADE">Nâng cấp linh kiện</option>
                    <option value="SOFTWARE_UPDATE">Cập nhật phần mềm</option>
                    <option value="REPAIR">Sửa chữa phần cứng</option>
                    <option value="OTHER">Khác</option>
                  </select>
                </div>
              </div>

              {/* Target Selector */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Phạm vi áp dụng</label>
                <div className="flex gap-2 mb-2">
                  <button
                    type="button"
                    onClick={() => setFormTargetType('ALL')}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer ${
                      formTargetType === 'ALL' ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-200 text-slate-600'
                    }`}
                  >
                    Toàn bộ
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormTargetType('CATEGORY')}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer ${
                      formTargetType === 'CATEGORY' ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-200 text-slate-600'
                    }`}
                  >
                    Theo Danh mục
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormTargetType('ASSET')}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer ${
                      formTargetType === 'ASSET' ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-200 text-slate-600'
                    }`}
                  >
                    Thiết bị cụ thể
                  </button>
                </div>

                {formTargetType === 'CATEGORY' && (
                  <select
                    value={formCategoryId}
                    onChange={(e) => setFormCategoryId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none font-semibold text-slate-800 cursor-pointer"
                  >
                    <option value="">-- Chọn danh mục thiết bị --</option>
                    {categoriesList.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                )}

                {formTargetType === 'ASSET' && (
                  <select
                    value={formAssetId}
                    onChange={(e) => setFormAssetId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none font-semibold text-slate-800 cursor-pointer"
                  >
                    <option value="">-- Chọn thiết bị --</option>
                    {assetsList.map((a) => (
                      <option key={a.id} value={a.id}>
                        [{a.assetTag}] {a.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Assignee & Priority */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">KTV phụ trách mặc định</label>
                  <select
                    value={formAssignToId}
                    onChange={(e) => setFormAssignToId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none font-semibold text-slate-800 cursor-pointer"
                  >
                    <option value="">Tự động phân tuyến (Routing)</option>
                    {usersList.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.fullName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Mức ưu tiên Ticket</label>
                  <select
                    value={formPriority}
                    onChange={(e) => setFormPriority(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none font-semibold text-slate-800 cursor-pointer"
                  >
                    <option value="LOW">P4 - Thấp (48h)</option>
                    <option value="MEDIUM">P3 - Trung bình (24h)</option>
                    <option value="HIGH">P2 - Cao (8h)</option>
                  </select>
                </div>
              </div>

              {/* Next Run Date */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Ngày bắt đầu chạy (để trống sẽ tính tự động từ hôm nay)
                </label>
                <input
                  type="date"
                  value={formNextRun}
                  onChange={(e) => setFormNextRun(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none font-semibold text-slate-800"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 font-semibold hover:bg-slate-50 cursor-pointer"
                >{isEn ? 'Cancel' : 'Hủy'}</button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl font-bold shadow-md shadow-blue-600/20 cursor-pointer flex items-center gap-1.5"
                >
                  {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingId ? 'Cập Nhật Lịch' : 'Tạo Lịch Bảo Trì'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}