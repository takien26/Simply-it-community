'use client';

import { useLanguage } from '@/lib/i18n/context';
import { useState, useEffect, useMemo } from 'react';
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
  Search,
  Check,
  Tag,
  Sparkles,
} from 'lucide-react';

const FREQUENCY_MAP: Record<string, string> = {
  DAILY: 'Hàng ngày',
  WEEKLY: 'Hàng tuần',
  MONTHLY: 'Hàng tháng',
  QUARTERLY: 'Hàng quý (3 tháng)',
  SEMI_ANNUAL: '6 tháng/lần',
  ANNUAL: 'Hàng năm',
};

const TYPE_MAP: Record<string, string> = {
  REPAIR: 'Sửa chữa phần cứng',
  UPGRADE: 'Nâng cấp linh kiện',
  INSPECTION: 'Kiểm tra & Rà soát định kỳ',
  CLEANING: 'Vệ sinh máy & tra keo tản nhiệt',
  SOFTWARE_UPDATE: 'Cập nhật phần mềm & vá lỗi',
  REPLACEMENT: 'Thay thế phụ tùng định kỳ',
  OTHER: 'Bảo trì chung',
};

const DAY_LABELS: { day: number; label: string; full: string }[] = [
  { day: 1, label: 'T2', full: 'Thứ 2' },
  { day: 2, label: 'T3', full: 'Thứ 3' },
  { day: 3, label: 'T4', full: 'Thứ 4' },
  { day: 4, label: 'T5', full: 'Thứ 5' },
  { day: 5, label: 'T6', full: 'Thứ 6' },
  { day: 6, label: 'T7', full: 'Thứ 7' },
  { day: 0, label: 'CN', full: 'Chủ nhật' },
];

export function MaintenanceSchedulesTab() {
  const { language } = useLanguage();
  const isEn = language === 'en';
  const [schedules, setSchedules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningNow, setRunningNow] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formFreq, setFormFreq] = useState('DAILY');
  const [formType, setFormType] = useState('INSPECTION');
  const [formTargetType, setFormTargetType] = useState<'ALL' | 'ASSET' | 'CATEGORY'>('ALL');
  const [formAssetId, setFormAssetId] = useState('');
  const [formCategoryId, setFormCategoryId] = useState('');
  const [formPriority, setFormPriority] = useState('MEDIUM');
  const [formAssignToId, setFormAssignToId] = useState('');
  const [formNextRun, setFormNextRun] = useState('');
  const [formAutoTicket, setFormAutoTicket] = useState(true);
  const [saving, setSaving] = useState(false);

  // Veeam-style Smart Scheduling Options
  const [repeatMode, setRepeatMode] = useState<'EVERY_DAY' | 'WEEKDAYS' | 'SELECTED_DAYS' | 'MONTHLY_DAY'>('WEEKDAYS');
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5]); // Default: Mon-Fri
  const [monthlyDay, setMonthlyDay] = useState<number>(1);
  const [runTime, setRunTime] = useState<string>('08:00');

  // Asset Search in Modal
  const [assetSearchTerm, setAssetSearchTerm] = useState('');
  const [isAssetDropdownOpen, setIsAssetDropdownOpen] = useState(false);

  // Dropdown data lists
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
        fetch('/api/assets?pageSize=300').then((r) => r.json()).catch(() => ({})),
        fetch('/api/categories').then((r) => r.json()).catch(() => ({})),
        fetch('/api/users').then((r) => r.json()).catch(() => ({})),
      ]);

      if (assetsRes?.data) setAssetsList(assetsRes.data);
      if (catsRes?.data) setCategoriesList(catsRes.data);
      else if (catsRes?.categories) setCategoriesList(catsRes.categories);

      if (usersRes?.data) setUsersList(usersRes.data);
      else if (usersRes?.users) setUsersList(usersRes.users);
    } catch (e) {
      console.error('Error loading dropdown lists:', e);
    }
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
          message: `Đã quét và kích hoạt bảo trì: Xử lý ${data.processedCount} lịch, tự động tạo ${data.ticketsCreated} ticket bảo trì mới!`,
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

  const toggleDay = (day: number) => {
    setSelectedDays((prev) => {
      const exists = prev.includes(day);
      if (exists) {
        if (prev.length === 1) return prev; // Keep at least one day selected
        return prev.filter((d) => d !== day);
      } else {
        return [...prev, day].sort((a, b) => a - b);
      }
    });
  };

  const setWeekdayPreset = () => {
    setRepeatMode('WEEKDAYS');
    setSelectedDays([1, 2, 3, 4, 5]);
  };

  const setEverydayPreset = () => {
    setRepeatMode('EVERY_DAY');
    setSelectedDays([0, 1, 2, 3, 4, 5, 6]);
  };

  const setAlternatingDaysPreset = (days: number[]) => {
    setRepeatMode('SELECTED_DAYS');
    setSelectedDays(days);
  };

  // Filter assets matching search query
  const filteredAssets = useMemo(() => {
    if (!assetSearchTerm.trim()) return assetsList.slice(0, 30);
    const term = assetSearchTerm.toLowerCase();
    return assetsList
      .filter((a) => {
        return (
          a.name?.toLowerCase().includes(term) ||
          a.assetTag?.toLowerCase().includes(term) ||
          a.serialNumber?.toLowerCase().includes(term) ||
          a.model?.toLowerCase().includes(term) ||
          a.assignedUser?.fullName?.toLowerCase().includes(term) ||
          a.location?.name?.toLowerCase().includes(term)
        );
      })
      .slice(0, 40);
  }, [assetsList, assetSearchTerm]);

  // Selected asset object
  const selectedAsset = useMemo(() => {
    return assetsList.find((a) => a.id === formAssetId);
  }, [assetsList, formAssetId]);

  // Sort IT users to top
  const sortedUsers = useMemo(() => {
    return [...usersList].sort((a, b) => {
      const isAIt =
        a.role?.name?.toLowerCase().includes('it') ||
        a.role?.name?.toLowerCase().includes('admin') ||
        a.department?.toLowerCase().includes('it');
      const isBIt =
        b.role?.name?.toLowerCase().includes('it') ||
        b.role?.name?.toLowerCase().includes('admin') ||
        b.department?.toLowerCase().includes('it');
      if (isAIt && !isBIt) return -1;
      if (!isAIt && isBIt) return 1;
      return (a.fullName || '').localeCompare(b.fullName || '');
    });
  }, [usersList]);

  // Humanized Veeam Schedule text generator
  const getScheduleSummary = (schedule: any) => {
    const config = schedule.scheduleConfig;
    const timeStr = config?.runTime ? ` lúc ${config.runTime}` : '';

    if (config?.repeatMode === 'WEEKDAYS') {
      return `Ngày làm việc (Thứ 2 - Thứ 6)${timeStr}`;
    }
    if (config?.repeatMode === 'EVERY_DAY') {
      return `Mỗi ngày${timeStr}`;
    }
    if (config?.repeatMode === 'SELECTED_DAYS' && config?.selectedDays?.length) {
      const days = config.selectedDays
        .map((d: number) => {
          const item = DAY_LABELS.find((dl) => dl.day === d);
          return item ? item.label : '';
        })
        .filter(Boolean)
        .join(', ');
      return `Các thứ: ${days}${timeStr}`;
    }
    if (config?.monthlyDay) {
      return `Ngày ${config.monthlyDay} hàng tháng${timeStr}`;
    }
    if (config?.runTime) {
      return `${FREQUENCY_MAP[schedule.frequency] || schedule.frequency}${timeStr}`;
    }
    return FREQUENCY_MAP[schedule.frequency] || schedule.frequency;
  };

  const handleEdit = (schedule: any) => {
    setEditingId(schedule.id);
    setFormName(schedule.name || '');
    setFormDesc(schedule.cleanDescription || schedule.description || '');
    setFormFreq(schedule.frequency || 'DAILY');
    setFormType(schedule.maintenanceType || 'INSPECTION');
    setFormPriority(schedule.ticketPriority || 'MEDIUM');
    setFormAssignToId(schedule.assignToId || '');
    setFormAutoTicket(schedule.autoCreateTicket !== false);

    if (schedule.assetId) {
      setFormTargetType('ASSET');
      setFormAssetId(schedule.assetId);
      setFormCategoryId('');
    } else if (schedule.categoryId) {
      setFormTargetType('CATEGORY');
      setFormCategoryId(schedule.categoryId);
      setFormAssetId('');
    } else {
      setFormTargetType('ALL');
      setFormAssetId('');
      setFormCategoryId('');
    }

    if (schedule.nextRunAt) {
      setFormNextRun(new Date(schedule.nextRunAt).toISOString().split('T')[0]);
    } else {
      setFormNextRun('');
    }

    if (schedule.scheduleConfig) {
      setRepeatMode(schedule.scheduleConfig.repeatMode || 'WEEKDAYS');
      setSelectedDays(schedule.scheduleConfig.selectedDays || [1, 2, 3, 4, 5]);
      setMonthlyDay(schedule.scheduleConfig.monthlyDay || 1);
      setRunTime(schedule.scheduleConfig.runTime || '08:00');
    } else {
      setRepeatMode(schedule.frequency === 'DAILY' ? 'WEEKDAYS' : 'SELECTED_DAYS');
      setSelectedDays([1, 2, 3, 4, 5]);
      setMonthlyDay(1);
      setRunTime('08:00');
    }

    setAssetSearchTerm('');
    setIsAssetDropdownOpen(false);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    setSaving(true);
    try {
      const scheduleConfig = {
        repeatMode,
        selectedDays: repeatMode === 'SELECTED_DAYS' || repeatMode === 'WEEKDAYS' || repeatMode === 'EVERY_DAY' ? selectedDays : undefined,
        monthlyDay: formFreq === 'MONTHLY' ? monthlyDay : undefined,
        runTime,
      };

      const payload = {
        name: formName.trim(),
        description: formDesc.trim() || undefined,
        frequency: formFreq,
        maintenanceType: formType,
        assetId: formTargetType === 'ASSET' ? formAssetId || null : null,
        categoryId: formTargetType === 'CATEGORY' ? formCategoryId || null : null,
        ticketPriority: formPriority,
        assignToId: formAssignToId || null,
        autoCreateTicket: formAutoTicket,
        nextRunAt: formNextRun ? new Date(`${formNextRun}T${runTime || '08:00'}:00`).toISOString() : undefined,
        scheduleConfig,
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
        setToast({
          type: 'success',
          message: editingId ? 'Đã cập nhật lịch bảo trì thành công!' : 'Đã tạo lịch bảo trì định kỳ mới thành công!',
        });
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
        setToast({ type: 'success', message: `Đã xóa lịch bảo trì "${name}"!` });
      }
    } catch {}
  };

  const resetForm = () => {
    setEditingId(null);
    setFormName('');
    setFormDesc('');
    setFormFreq('DAILY');
    setFormType('INSPECTION');
    setFormTargetType('ALL');
    setFormAssetId('');
    setFormCategoryId('');
    setFormPriority('MEDIUM');
    setFormAssignToId('');
    setFormNextRun('');
    setFormAutoTicket(true);
    setRepeatMode('WEEKDAYS');
    setSelectedDays([1, 2, 3, 4, 5]);
    setMonthlyDay(1);
    setRunTime('08:00');
    setAssetSearchTerm('');
    setIsAssetDropdownOpen(false);
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
          <span className="text-sm font-medium flex-1">{toast.message}</span>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 shadow-2xs">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-slate-900 text-base">
                {isEn ? 'Periodic Asset Maintenance Schedules' : 'Lịch Bảo Trì & Kiểm Tra Định Kỳ'}
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700">
                {schedules.length} lịch
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {isEn
                ? 'Automated Veeam-style scheduling engine with IT assignment & instant Helpdesk ticketing'
                : 'Lịch định kỳ thông minh chuẩn Veeam (chọn thứ trong tuần, giờ chạy, KTV phụ trách, tìm kiếm thiết bị)'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={handleRunNow}
            disabled={runningNow}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs"
            title="Quét toàn bộ lịch bảo trì và kích hoạt ticket ngay lập tức nếu đến hạn"
          >
            {runningNow ? (
              <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
            ) : (
              <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
            )}
            <span>{isEn ? 'Scan & Run Now' : 'Quét & Kích Hoạt Ngay'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              resetForm();
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{isEn ? 'New Schedule' : 'Thêm Lịch Bảo Trì Mới'}</span>
          </button>
        </div>
      </div>

      {/* Schedules List */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-16 text-center">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
            <p className="text-xs text-slate-400 font-medium">
              {isEn ? 'Loading maintenance schedules...' : 'Đang tải danh sách lịch bảo trì...'}
            </p>
          </div>
        ) : schedules.length === 0 ? (
          <div className="p-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
              <Wrench className="w-7 h-7" />
            </div>
            <p className="text-sm font-bold text-slate-700">
              {isEn ? 'No maintenance schedules configured yet' : 'Chưa có lịch bảo trì định kỳ nào'}
            </p>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              {isEn
                ? 'Create a schedule to automatically remind and dispatch periodic tasks to IT technicians.'
                : 'Tạo lịch để hệ thống tự động quét và phân công nhiệm vụ bảo trì định kỳ cho KTV IT.'}
            </p>
            <button
              type="button"
              onClick={() => {
                resetForm();
                setIsModalOpen(true);
              }}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tạo Lịch Đầu Tiên</span>
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {schedules.map((s) => {
              const targetLabel = s.asset
                ? `[${s.asset.assetTag}] ${s.asset.name}`
                : s.category
                ? `Danh mục: ${s.category.name}`
                : isEn
                ? 'All assets'
                : 'Toàn bộ thiết bị';

              const nextRunDate = new Date(s.nextRunAt);
              const isDue = nextRunDate <= new Date();
              const nextRunFormatted = nextRunDate.toLocaleDateString('vi-VN', {
                weekday: 'short',
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
              });
              const scheduleSummary = getScheduleSummary(s);

              return (
                <div
                  key={s.id}
                  className={`p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 transition-colors ${
                    s.isActive ? 'hover:bg-slate-50/80' : 'bg-slate-50/40 opacity-70 hover:opacity-100'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 mt-0.5 ${
                        s.isActive ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-400'
                      }`}
                    >
                      <Wrench className="w-5 h-5" />
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <h4 className="font-bold text-slate-900 text-sm">{s.name}</h4>

                        {/* Veeam Smart Schedule Badge */}
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200">
                          <Clock className="w-3 h-3 text-indigo-500" />
                          <span>{scheduleSummary}</span>
                        </span>

                        {/* Maintenance Type Badge */}
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700">
                          {TYPE_MAP[s.maintenanceType] || s.maintenanceType}
                        </span>

                        {/* Priority Badge */}
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            s.ticketPriority === 'URGENT'
                              ? 'bg-rose-100 text-rose-700'
                              : s.ticketPriority === 'HIGH'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {s.ticketPriority}
                        </span>
                      </div>

                      {/* Scope & Assignee Row */}
                      <div className="text-xs text-slate-500 flex items-center gap-3 flex-wrap">
                        <span className="flex items-center gap-1.5 font-medium text-slate-700">
                          {s.asset ? (
                            <Laptop className="w-3.5 h-3.5 text-blue-600" />
                          ) : s.category ? (
                            <Layers className="w-3.5 h-3.5 text-amber-600" />
                          ) : (
                            <Tag className="w-3.5 h-3.5 text-slate-400" />
                          )}
                          <span>{targetLabel}</span>
                        </span>

                        <span>•</span>

                        {/* IT Technician */}
                        <span className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span>
                            KTV phụ trách:{' ' }
                            {s.assignTo ? (
                              <strong className="text-slate-800 font-bold">{s.assignTo.fullName}</strong>
                            ) : (
                              <span className="italic text-slate-400">Tự động phân tuyến (Routing)</span>
                            )}
                          </span>
                        </span>
                      </div>

                      {/* Execution Details & Due Status */}
                      <div className="flex items-center gap-3 text-[11px] pt-0.5">
                        <span className="text-slate-400">Khởi chạy tiếp theo:</span>
                        <span
                          className={`font-bold flex items-center gap-1 ${
                            isDue ? 'text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200' : 'text-slate-700'
                          }`}
                        >
                          {nextRunFormatted}
                          {s.scheduleConfig?.runTime && ` (${s.scheduleConfig.runTime})`}
                          {isDue && ' — ĐÃ ĐẾN HẠN'}
                        </span>

                        {s.lastRunAt && (
                          <span className="text-slate-400">
                            • Lần chạy trước:{' ' }
                            {new Date(s.lastRunAt).toLocaleDateString('vi-VN')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 self-end lg:self-center shrink-0">
                    {/* Toggle Active */}
                    <button
                      type="button"
                      onClick={() => handleToggleActive(s)}
                      className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-xl text-slate-600 hover:bg-slate-100 cursor-pointer transition-colors"
                      title={s.isActive ? 'Đang kích hoạt' : 'Đang tạm dừng'}
                    >
                      {s.isActive ? (
                        <>
                          <ToggleRight className="w-6 h-6 text-emerald-600" />
                          <span className="text-emerald-700 text-[11px] font-bold">Kích hoạt</span>
                        </>
                      ) : (
                        <>
                          <ToggleLeft className="w-6 h-6 text-slate-400" />
                          <span className="text-slate-400 text-[11px]">Tạm dừng</span>
                        </>
                      )}
                    </button>

                    {/* Edit Button */}
                    <button
                      type="button"
                      onClick={() => handleEdit(s)}
                      className="p-2 rounded-xl text-slate-500 hover:text-blue-600 hover:bg-blue-50 cursor-pointer transition-colors"
                      title="Chỉnh sửa lịch"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>

                    {/* Delete Button */}
                    <button
                      type="button"
                      onClick={() => handleDelete(s.id, s.name)}
                      className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer transition-colors"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full p-6 space-y-5 border border-slate-200 animate-in fade-in zoom-in-95 max-h-[92vh] overflow-y-auto my-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">
                    {editingId ? 'Chỉnh Sửa Lịch Bảo Trì Định Kỳ' : 'Thiết Lập Lịch Bảo Trì Định Kỳ Mới'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Chu kỳ thông minh kiểu Veeam Backup, phân công KTV và phạm vi thiết bị
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              {/* Quick Template Presets (Only on Add) */}
              {!editingId && (
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      <span>Mẫu Tác Vụ Định Kỳ Phổ Biến (1 chạm điền mẫu):</span>
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setFormName('Kiểm tra sao lưu & Backup Server');
                        setFormFreq('DAILY');
                        setRepeatMode('WEEKDAYS');
                        setSelectedDays([1, 2, 3, 4, 5]);
                        setRunTime('08:00');
                        setFormType('INSPECTION');
                        setFormPriority('HIGH');
                        setFormDesc('Rà soát trạng thái các bản ghi sao lưu tự động hàng ngày trên Veeam/NAS/Cloud.');
                      }}
                      className="px-2.5 py-1 bg-white hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 rounded-lg text-[11px] font-semibold border border-slate-200 shadow-2xs transition-colors cursor-pointer"
                    >
                      💾 Backup T2-T6
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setFormName('Kiểm tra nhiệt độ & phòng máy chủ (Server Room)');
                        setFormFreq('DAILY');
                        setRepeatMode('EVERY_DAY');
                        setSelectedDays([0, 1, 2, 3, 4, 5, 6]);
                        setRunTime('08:30');
                        setFormType('INSPECTION');
                        setFormPriority('HIGH');
                        setFormDesc('Kiểm tra điều hòa phòng Server, nhiệt độ tủ rack, đèn cảnh báo UPS và bình cứu hỏa.');
                      }}
                      className="px-2.5 py-1 bg-white hover:bg-blue-50 hover:text-blue-700 text-slate-700 rounded-lg text-[11px] font-semibold border border-slate-200 shadow-2xs transition-colors cursor-pointer"
                    >
                      🏢 Phòng Server mỗi ngày
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setFormName('Quét mã độc & rà soát an toàn thông tin');
                        setFormFreq('WEEKLY');
                        setRepeatMode('SELECTED_DAYS');
                        setSelectedDays([5]); // Thứ 6
                        setRunTime('17:00');
                        setFormType('INSPECTION');
                        setFormPriority('MEDIUM');
                        setFormDesc('Quét mã độc hệ thống, kiểm tra bản cập nhật Windows Update và log đăng nhập bất thường.');
                      }}
                      className="px-2.5 py-1 bg-white hover:bg-purple-50 hover:text-purple-700 text-slate-700 rounded-lg text-[11px] font-semibold border border-slate-200 shadow-2xs transition-colors cursor-pointer"
                    >
                      🛡️ Quét virus Thứ 6
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setFormName('Bảo dưỡng máy in & kiểm tra mực in văn phòng');
                        setFormFreq('WEEKLY');
                        setRepeatMode('SELECTED_DAYS');
                        setSelectedDays([1]); // Thứ 2
                        setRunTime('08:30');
                        setFormType('INSPECTION');
                        setFormPriority('MEDIUM');
                        setFormDesc('Kiểm tra lượng mực tồn, khay giấy, vệ sinh gương quét và cụm sấy các máy in các tầng.');
                      }}
                      className="px-2.5 py-1 bg-white hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 rounded-lg text-[11px] font-semibold border border-slate-200 shadow-2xs transition-colors cursor-pointer"
                    >
                      🖨️ Máy in Thứ 2
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setFormName('Vệ sinh máy tính & tra keo tản nhiệt định kỳ');
                        setFormFreq('QUARTERLY');
                        setRepeatMode('MONTHLY_DAY');
                        setMonthlyDay(1);
                        setRunTime('09:00');
                        setFormType('CLEANING');
                        setFormPriority('MEDIUM');
                        setFormDesc('Thổi bụi case máy trạm, vệ sinh quạt tản nhiệt CPU/GPU và tra keo tản nhiệt mới.');
                      }}
                      className="px-2.5 py-1 bg-white hover:bg-amber-50 hover:text-amber-700 text-slate-700 rounded-lg text-[11px] font-semibold border border-slate-200 shadow-2xs transition-colors cursor-pointer"
                    >
                      🔧 Bảo dưỡng máy tính theo Quý
                    </button>
                  </div>
                </div>
              )}

              {/* Basic Details: Name & Type */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">
                    Tên lịch bảo trì <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="VD: Kiểm tra sao lưu dữ liệu hàng ngày / Vệ sinh máy tính định kỳ..."
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-blue-500 font-semibold text-slate-800"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Loại hình bảo trì</label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-blue-500 font-semibold cursor-pointer text-slate-800"
                  >
                    <option value="INSPECTION">Kiểm tra & Rà soát</option>
                    <option value="CLEANING">Vệ sinh máy & keo tản nhiệt</option>
                    <option value="SOFTWARE_UPDATE">Cập nhật phần mềm & vá lỗi</option>
                    <option value="UPGRADE">Nâng cấp linh kiện</option>
                    <option value="REPAIR">Sửa chữa phần cứng</option>
                    <option value="REPLACEMENT">Thay thế phụ tùng</option>
                    <option value="OTHER">Bảo trì chung</option>
                  </select>
                </div>
              </div>

              {/* ---------------- VEEAM-STYLE SMART SCHEDULER SECTION ---------------- */}
              <div className="p-4 bg-indigo-50/50 border border-indigo-200/80 rounded-2xl space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-indigo-600" />
                    <span className="font-bold text-indigo-950 text-xs uppercase tracking-wider">
                      Tần Suất & Lịch Thực Hiện (Veeam Scheduler)
                    </span>
                  </div>
                  <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-100/70 px-2 py-0.5 rounded-md">
                    Smart Engine
                  </span>
                </div>

                {/* Primary Frequency & Execution Time */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Chu kỳ lặp chính</label>
                    <select
                      value={formFreq}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormFreq(val);
                        if (val === 'DAILY') setRepeatMode('WEEKDAYS');
                        else if (val === 'WEEKLY') setRepeatMode('SELECTED_DAYS');
                        else if (val === 'MONTHLY') setRepeatMode('MONTHLY_DAY');
                      }}
                      className="w-full px-3 py-2 bg-white border border-indigo-200 rounded-xl outline-none focus:border-indigo-500 font-semibold text-slate-800 cursor-pointer"
                    >
                      <option value="DAILY">Hàng ngày (Daily)</option>
                      <option value="WEEKLY">Hàng tuần (Weekly)</option>
                      <option value="MONTHLY">Hàng tháng (Monthly)</option>
                      <option value="QUARTERLY">Hàng quý (3 tháng/lần)</option>
                      <option value="SEMI_ANNUAL">6 tháng/lần</option>
                      <option value="ANNUAL">Hàng năm (12 tháng/lần)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Giờ chạy trong ngày (Run at)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="time"
                        value={runTime}
                        onChange={(e) => setRunTime(e.target.value)}
                        className="px-3 py-1.5 bg-white border border-indigo-200 rounded-xl outline-none font-bold text-indigo-900 w-32 text-center"
                      />
                      <div className="flex gap-1 flex-wrap">
                        {['08:00', '12:00', '17:30', '22:00'].map((t) => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => setRunTime(t)}
                            className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer ${
                              runTime === t
                                ? 'bg-indigo-600 text-white border-indigo-600'
                                : 'bg-white text-slate-600 border-indigo-200 hover:bg-indigo-50'
                            }`}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Day-of-week selection for Daily & Weekly (Veeam style) */}
                {(formFreq === 'DAILY' || formFreq === 'WEEKLY') && (
                  <div className="space-y-2 pt-1 border-t border-indigo-100">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <label className="font-bold text-slate-700 text-[11px]">
                        Chọn các ngày chạy trong tuần (Days of Week):
                      </label>
                      {/* Presets */}
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={setWeekdayPreset}
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold border cursor-pointer ${
                            repeatMode === 'WEEKDAYS'
                              ? 'bg-indigo-600 text-white border-indigo-600'
                              : 'bg-white text-indigo-700 border-indigo-200 hover:bg-indigo-50'
                          }`}
                        >
                          T2 - T6 (Ngày làm việc)
                        </button>
                        <button
                          type="button"
                          onClick={() => setAlternatingDaysPreset([1, 3, 5])}
                          className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-white text-indigo-700 border border-indigo-200 hover:bg-indigo-50 cursor-pointer"
                        >
                          T2, T4, T6
                        </button>
                        <button
                          type="button"
                          onClick={() => setAlternatingDaysPreset([2, 4, 6])}
                          className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-white text-indigo-700 border border-indigo-200 hover:bg-indigo-50 cursor-pointer"
                        >
                          T3, T5, T7
                        </button>
                        <button
                          type="button"
                          onClick={setEverydayPreset}
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold border cursor-pointer ${
                            repeatMode === 'EVERY_DAY'
                              ? 'bg-indigo-600 text-white border-indigo-600'
                              : 'bg-white text-indigo-700 border-indigo-200 hover:bg-indigo-50'
                          }`}
                        >
                          Cả tuần
                        </button>
                      </div>
                    </div>

                    {/* Day Chips */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {DAY_LABELS.map(({ day, label, full }) => {
                        const isSelected = selectedDays.includes(day);
                        return (
                          <button
                            key={day}
                            type="button"
                            onClick={() => {
                              setRepeatMode('SELECTED_DAYS');
                              toggleDay(day);
                            }}
                            className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                              isSelected
                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                                : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'
                            }`}
                            title={full}
                          >
                            {isSelected ? <Check className="w-3.5 h-3.5" /> : null}
                            <span>{label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Day of Month selection for Monthly */}
                {formFreq === 'MONTHLY' && (
                  <div className="space-y-1.5 pt-1 border-t border-indigo-100">
                    <label className="block font-bold text-slate-700 text-[11px]">
                      Chọn ngày trong tháng (Day of Month)
                    </label>
                    <div className="flex items-center gap-2 flex-wrap">
                      <select
                        value={monthlyDay}
                        onChange={(e) => setMonthlyDay(parseInt(e.target.value, 10))}
                        className="px-3 py-1.5 bg-white border border-indigo-200 rounded-xl outline-none font-bold text-indigo-900 cursor-pointer"
                      >
                        {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                          <option key={d} value={d}>
                            Ngày {d} hàng tháng
                          </option>
                        ))}
                      </select>
                      <span className="text-[11px] text-slate-500">
                        (Khởi chạy vào ngày đã chọn lúc {runTime})
                      </span>
                    </div>
                  </div>
                )}

                {/* Live Preview Bar */}
                <div className="p-2.5 bg-white rounded-xl border border-indigo-100 flex items-center gap-2 text-indigo-900 text-xs">
                  <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span className="font-semibold">
                    Lịch thực hiện: Lúc <strong>{runTime}</strong>{' ' }
                    {repeatMode === 'WEEKDAYS' && 'các ngày làm việc từ Thứ 2 đến Thứ 6'}
                    {repeatMode === 'EVERY_DAY' && 'tất cả các ngày trong tuần'}
                    {repeatMode === 'SELECTED_DAYS' &&
                      `các ngày: ${selectedDays
                        .map((d) => DAY_LABELS.find((dl) => dl.day === d)?.label)
                        .filter(Boolean)
                        .join(', ')}`}
                    {formFreq === 'MONTHLY' && `ngày ${monthlyDay} hàng tháng`}
                    {formFreq === 'QUARTERLY' && 'định kỳ mỗi 3 tháng'}
                    {formFreq === 'SEMI_ANNUAL' && 'định kỳ mỗi 6 tháng'}
                    {formFreq === 'ANNUAL' && 'định kỳ hàng năm'}
                  </span>
                </div>
              </div>

              {/* ---------------- SCOPE & ASSET/CATEGORY SELECTOR ---------------- */}
              <div className="space-y-3 p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                <label className="block font-bold text-slate-800 text-xs uppercase tracking-wider">
                  Phạm Vi Áp Dụng Thiết Bị
                </label>

                {/* Scope Switcher Buttons */}
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setFormTargetType('ALL');
                      setFormAssetId('');
                      setFormCategoryId('');
                    }}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      formTargetType === 'ALL'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Tag className="w-3.5 h-3.5" />
                    <span>Toàn bộ thiết bị</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setFormTargetType('CATEGORY');
                      setFormAssetId('');
                    }}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      formTargetType === 'CATEGORY'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Theo Danh mục</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setFormTargetType('ASSET');
                      setFormCategoryId('');
                    }}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      formTargetType === 'ASSET'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Laptop className="w-3.5 h-3.5" />
                    <span>Thiết bị cụ thể</span>
                  </button>
                </div>

                {/* CATEGORY SELECTOR (Loaded from AssetCategory Table) */}
                {formTargetType === 'CATEGORY' && (
                  <div className="space-y-1 pt-1">
                    <label className="block font-bold text-slate-700">
                      Chọn danh mục thiết bị từ cơ sở dữ liệu:
                    </label>
                    <select
                      value={formCategoryId}
                      onChange={(e) => setFormCategoryId(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl outline-none font-semibold text-slate-800 cursor-pointer focus:border-blue-500"
                    >
                      <option value="">-- Chọn danh mục thiết bị --</option>
                      {categoriesList.map((c) => {
                        const count = c._count?.assets ?? c.assetCount ?? 0;
                        return (
                          <option key={c.id} value={c.id}>
                            {c.icon || '📦'} {c.name} {count > 0 ? `(${count} thiết bị)` : ''}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                )}

                {/* SEARCHABLE ASSET SELECTOR */}
                {formTargetType === 'ASSET' && (
                  <div className="space-y-2 pt-1">
                    <label className="block font-bold text-slate-700">
                      Tìm kiếm & Chọn thiết bị cụ thể:
                    </label>

                    {/* Selected Asset Display Card */}
                    {selectedAsset ? (
                      <div className="p-3 bg-white border border-blue-200 rounded-xl flex items-center justify-between gap-3 shadow-2xs">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                            <Laptop className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-blue-700">[{selectedAsset.assetTag}]</span>
                              <span className="font-bold text-slate-900">{selectedAsset.name}</span>
                            </div>
                            <p className="text-[11px] text-slate-500">
                              {selectedAsset.model && `Model: ${selectedAsset.model} • `}
                              {selectedAsset.location?.name && `Vị trí: ${selectedAsset.location.name} • `}
                              {selectedAsset.status && `Trạng thái: ${selectedAsset.status}`}
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setFormAssetId('');
                            setIsAssetDropdownOpen(true);
                          }}
                          className="px-2.5 py-1.5 text-xs text-rose-600 hover:bg-rose-50 rounded-lg font-bold border border-rose-200 cursor-pointer transition-colors"
                        >
                          Đổi thiết bị
                        </button>
                      </div>
                    ) : (
                      /* Search Input & Dropdown */
                      <div className="relative">
                        <div className="relative">
                          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            placeholder="Nhập mã tài sản, tên thiết bị, serial hoặc người sử dụng..."
                            value={assetSearchTerm}
                            onChange={(e) => {
                              setAssetSearchTerm(e.target.value);
                              setIsAssetDropdownOpen(true);
                            }}
                            onFocus={() => setIsAssetDropdownOpen(true)}
                            className="w-full pl-9 pr-8 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-500 font-medium text-slate-800"
                          />
                          {assetSearchTerm && (
                            <button
                              type="button"
                              onClick={() => setAssetSearchTerm('')}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>

                        {/* Search Dropdown Results */}
                        {isAssetDropdownOpen && (
                          <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl z-30 max-h-56 overflow-y-auto divide-y divide-slate-100">
                            {filteredAssets.length === 0 ? (
                              <div className="p-4 text-center text-xs text-slate-400">
                                Không tìm thấy thiết bị nào khớp với từ khóa "{assetSearchTerm}"
                              </div>
                            ) : (
                              filteredAssets.map((a) => (
                                <button
                                  key={a.id}
                                  type="button"
                                  onClick={() => {
                                    setFormAssetId(a.id);
                                    setIsAssetDropdownOpen(false);
                                    setAssetSearchTerm('');
                                  }}
                                  className="w-full p-3 text-left hover:bg-blue-50/70 flex items-center justify-between gap-2 transition-colors cursor-pointer"
                                >
                                  <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 shrink-0">
                                      <Laptop className="w-4 h-4" />
                                    </div>
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <span className="font-bold text-blue-700 text-xs">
                                          [{a.assetTag}]
                                        </span>
                                        <span className="font-bold text-slate-800 text-xs">
                                          {a.name}
                                        </span>
                                      </div>
                                      <div className="text-[11px] text-slate-400 flex items-center gap-2">
                                        {a.serialNumber && <span>SN: {a.serialNumber}</span>}
                                        {a.assignedUser?.fullName && (
                                          <span>• Người dùng: {a.assignedUser.fullName}</span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                                    {a.status}
                                  </span>
                                </button>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* ---------------- IT ASSIGNMENT & TICKET SETTINGS ---------------- */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Assign to IT Technician */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    KTV IT Phụ trách thực hiện
                  </label>
                  <select
                    value={formAssignToId}
                    onChange={(e) => setFormAssignToId(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none font-semibold text-slate-800 cursor-pointer focus:bg-white focus:border-blue-500"
                  >
                    <option value="">-- Tự động phân tuyến (Routing) --</option>
                    {sortedUsers.map((u) => {
                      const roleName = u.role?.name || '';
                      const isIT =
                        roleName.toLowerCase().includes('it') ||
                        roleName.toLowerCase().includes('admin') ||
                        u.department?.toLowerCase().includes('it');
                      return (
                        <option key={u.id} value={u.id}>
                          {isIT ? '🛡️ ' : '👤 '}
                          {u.fullName} {roleName ? `[${roleName}]` : ''}{' ' }
                          {u.department ? `- ${u.department}` : ''}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Priority */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Mức ưu tiên Ticket
                  </label>
                  <select
                    value={formPriority}
                    onChange={(e) => setFormPriority(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none font-semibold text-slate-800 cursor-pointer focus:bg-white focus:border-blue-500"
                  >
                    <option value="LOW">P4 - Thấp (48h xử lý)</option>
                    <option value="MEDIUM">P3 - Trung bình (24h xử lý)</option>
                    <option value="HIGH">P2 - Cao (8h xử lý)</option>
                    <option value="URGENT">P1 - Khẩn cấp (4h xử lý)</option>
                  </select>
                </div>
              </div>

              {/* Start Date & Auto Create Ticket Switch */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Ngày bắt đầu khởi chạy (Tùy chọn)
                  </label>
                  <input
                    type="date"
                    value={formNextRun}
                    onChange={(e) => setFormNextRun(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none font-semibold text-slate-800 focus:bg-white focus:border-blue-500"
                  />
                </div>

                <div className="flex items-center gap-2.5 pt-4">
                  <input
                    type="checkbox"
                    id="autoCreateTicketCheckbox"
                    checked={formAutoTicket}
                    onChange={(e) => setFormAutoTicket(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 cursor-pointer"
                  />
                  <label htmlFor="autoCreateTicketCheckbox" className="font-bold text-slate-700 cursor-pointer">
                    Tự động tạo Ticket hỗ trợ khi đến hạn
                  </label>
                </div>
              </div>

              {/* Description / Instructions */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Mô tả & Hướng dẫn các bước cho KTV (Checklist)
                </label>
                <textarea
                  rows={2}
                  placeholder="Ghi chú các hạng mục cần rà soát, vị trí đặt thiết bị, lưu ý an toàn..."
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-blue-500 font-medium text-slate-800"
                />
              </div>

              {/* Modal Buttons */}
              <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 font-semibold hover:bg-slate-50 cursor-pointer transition-colors"
                >
                  {isEn ? 'Cancel' : 'Hủy'}
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl font-bold shadow-md shadow-blue-600/20 cursor-pointer flex items-center gap-2 transition-all"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>{editingId ? 'Cập Nhật Lịch Bảo Trì' : 'Lưu & Khởi Tạo Lịch'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
