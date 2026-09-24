'use client';

import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/lib/i18n/context';
import {
  Activity,
  Cpu,
  HardDrive,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Clock,
  WifiOff,
  Ticket,
  Save,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sliders,
  Check,
} from 'lucide-react';

interface AlertPolicy {
  id?: string;
  metric: string;
  enabled: boolean;
  warningThreshold: number | null;
  criticalThreshold: number | null;
  clearThreshold: number | null;
  sustainedMinutes: number;
  autoCreateTicket: boolean;
  ticketPriority: string;
  description?: string | null;
}

const METRIC_METADATA: Record<
  string,
  {
    nameVi: string;
    nameEn: string;
    descVi: string;
    descEn: string;
    unit: string;
    icon: any;
    color: string;
    isBinary?: boolean;
    binaryNoteVi?: string;
    binaryNoteEn?: string;
  }
> = {
  CPU: {
    nameVi: 'Tải CPU Thiết Bị',
    nameEn: 'CPU Load & Utilization',
    descVi: 'Cảnh báo khi mức sử dụng CPU duy trì ở mức cao liên tục',
    descEn: 'Trigger alerts when CPU utilization sustains at high levels',
    unit: '%',
    icon: Cpu,
    color: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
  },
  RAM: {
    nameVi: 'Bộ Nhớ RAM',
    nameEn: 'Memory (RAM) Usage',
    descVi: 'Cảnh báo khi RAM bị quá tải làm máy tính chậm, treo ứng dụng',
    descEn: 'Trigger alerts when RAM consumption nears exhaustion',
    unit: '%',
    icon: Activity,
    color: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
  },
  STORAGE: {
    nameVi: 'Dung Lượng Phân Vùng Ổ Đĩa (C:\\)',
    nameEn: 'Disk Storage (Drive C:\\)',
    descVi: 'Cảnh báo khi ổ đĩa cài đặt hệ điều hành sắp hết dung lượng',
    descEn: 'Alert when system OS drive free space runs out',
    unit: '%',
    icon: HardDrive,
    color: 'text-purple-500 bg-purple-500/10 border-purple-500/20',
  },
  DISK: {
    nameVi: 'Dung Lượng Phân Vùng Ổ Đĩa (C:\\)',
    nameEn: 'Disk Storage (Drive C:\\)',
    descVi: 'Cảnh báo khi ổ đĩa cài đặt hệ điều hành sắp hết dung lượng',
    descEn: 'Alert when system OS drive free space runs out',
    unit: '%',
    icon: HardDrive,
    color: 'text-purple-500 bg-purple-500/10 border-purple-500/20',
  },
  DEFENDER: {
    nameVi: 'Cập Nhật Mẫu Virus Windows Defender',
    nameEn: 'Windows Defender Signatures Age',
    descVi: 'Cảnh báo khi chữ ký diệt virus đã quá hạn chưa được cập nhật',
    descEn: 'Alert when antivirus signatures have not been updated for days',
    unit: 'ngày / days',
    icon: ShieldAlert,
    color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
  },
  DEFENDER_OUTDATED: {
    nameVi: 'Cập Nhật Mẫu Virus Windows Defender',
    nameEn: 'Windows Defender Signatures Age',
    descVi: 'Cảnh báo khi chữ ký diệt virus đã quá hạn chưa được cập nhật',
    descEn: 'Alert when antivirus signatures have not been updated for days',
    unit: 'ngày / days',
    icon: ShieldAlert,
    color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
  },
  FIREWALL: {
    nameVi: 'Tường Lửa Windows Firewall',
    nameEn: 'Windows Firewall Status',
    descVi: 'Cảnh báo khi Firewall bị tắt (Domain, Private hoặc Public profile)',
    descEn: 'Alert when Windows Firewall is disabled on any profile',
    unit: '',
    icon: Shield,
    color: 'text-rose-500 bg-rose-500/10 border-rose-500/20',
    isBinary: true,
    binaryNoteVi: 'Tự động kích hoạt cảnh báo CRITICAL nếu Firewall bị tắt',
    binaryNoteEn: 'Automatically triggers CRITICAL alert if Firewall is disabled',
  },
  FIREWALL_DISABLED: {
    nameVi: 'Tường Lửa Windows Firewall',
    nameEn: 'Windows Firewall Status',
    descVi: 'Cảnh báo khi Firewall bị tắt (Domain, Private hoặc Public profile)',
    descEn: 'Alert when Windows Firewall is disabled on any profile',
    unit: '',
    icon: Shield,
    color: 'text-rose-500 bg-rose-500/10 border-rose-500/20',
    isBinary: true,
    binaryNoteVi: 'Tự động kích hoạt cảnh báo CRITICAL nếu Firewall bị tắt',
    binaryNoteEn: 'Automatically triggers CRITICAL alert if Firewall is disabled',
  },
  BITLOCKER: {
    nameVi: 'Mã Hóa Ổ Cứng BitLocker',
    nameEn: 'BitLocker Drive Encryption',
    descVi: 'Cảnh báo khi ổ đĩa hệ thống (C:\\) chưa được mã hóa bảo vệ dữ liệu',
    descEn: 'Alert when OS drive C:\\ is not fully encrypted',
    unit: '',
    icon: ShieldCheck,
    color: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/20',
    isBinary: true,
    binaryNoteVi: 'Kích hoạt cảnh báo WARNING nếu ổ đĩa C:\\ chưa được bảo vệ bằng BitLocker',
    binaryNoteEn: 'Triggers WARNING alert if system drive C:\\ is unencrypted',
  },
  BITLOCKER_UNENCRYPTED: {
    nameVi: 'Mã Hóa Ổ Cứng BitLocker',
    nameEn: 'BitLocker Drive Encryption',
    descVi: 'Cảnh báo khi ổ đĩa hệ thống (C:\\) chưa được mã hóa bảo vệ dữ liệu',
    descEn: 'Alert when OS drive C:\\ is not fully encrypted',
    unit: '',
    icon: ShieldCheck,
    color: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/20',
    isBinary: true,
    binaryNoteVi: 'Kích hoạt cảnh báo WARNING nếu ổ đĩa C:\\ chưa được bảo vệ bằng BitLocker',
    binaryNoteEn: 'Triggers WARNING alert if system drive C:\\ is unencrypted',
  },
  BATTERY: {
    nameVi: 'Độ Chai Pin Laptop (Battery Health)',
    nameEn: 'Laptop Battery Health Degradation',
    descVi: 'Cảnh báo khi dung lượng pin tối đa bị chai xuống dưới ngưỡng an toàn',
    descEn: 'Alert when laptop full charge battery health falls below threshold',
    unit: '%',
    icon: Activity,
    color: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
  },
  PENDING_REBOOT: {
    nameVi: 'Khởi Động Lại Chờ Cập Nhật (Pending Reboot)',
    nameEn: 'Pending Reboot & Windows Updates',
    descVi: 'Cảnh báo khi máy tính có bản cập nhật mới đang chờ khởi động lại nhiều ngày',
    descEn: 'Alert when PC has updates pending reboot for excessive days',
    unit: 'ngày / days',
    icon: Clock,
    color: 'text-cyan-500 bg-cyan-500/10 border-cyan-500/20',
  },
  UPTIME_EXCESSIVE: {
    nameVi: 'Thời Gian Bật Máy Liên Tục (Uptime)',
    nameEn: 'Continuous System Uptime',
    descVi: 'Cảnh báo nhắc nhở khởi động lại khi máy mở liên tục nhiều tuần gây lag',
    descEn: 'Prompt restart when PC runs continuously for weeks without reboot',
    unit: 'ngày / days',
    icon: Clock,
    color: 'text-cyan-500 bg-cyan-500/10 border-cyan-500/20',
  },
  AGENT_OFFLINE: {
    nameVi: 'Mất Kết Nối Heartbeat (Thiết Bị Offline)',
    nameEn: 'Heartbeat Offline Detection',
    descVi: 'Cảnh báo khi thiết bị không gửi báo cáo định kỳ về máy chủ',
    descEn: 'Alert when device stops reporting health heartbeats to server',
    unit: 'phút / mins',
    icon: WifiOff,
    color: 'text-slate-500 bg-slate-500/10 border-slate-500/20',
  },
  OFFLINE: {
    nameVi: 'Mất Kết Nối Heartbeat (Thiết Bị Offline)',
    nameEn: 'Heartbeat Offline Detection',
    descVi: 'Cảnh báo khi thiết bị không gửi báo cáo định kỳ về máy chủ',
    descEn: 'Alert when device stops reporting health heartbeats to server',
    unit: 'phút / mins',
    icon: WifiOff,
    color: 'text-slate-500 bg-slate-500/10 border-slate-500/20',
  },
};

export function HealthAlertPoliciesTab() {
  const { language } = useLanguage();
  const isEn = language === 'en';

  const [policies, setPolicies] = useState<AlertPolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchPolicies = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const res = await fetch('/api/health/policies');
      const data = await res.json();
      if (data.policies) {
        setPolicies(data.policies);
      }
    } catch (err: any) {
      console.error('Failed to load health policies:', err);
      setErrorMsg(err?.message || 'Failed to load policies');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPolicies();
  }, []);

  const handleUpdatePolicy = (metric: string, field: keyof AlertPolicy, value: any) => {
    setPolicies((prev) =>
      prev.map((p) => {
        if (p.metric === metric) {
          return { ...p, [field]: value };
        }
        return p;
      })
    );
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setErrorMsg(null);
      const res = await fetch('/api/health/policies', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ policies }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save policies');
      }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      console.error('Error saving policies:', err);
      setErrorMsg(err?.message || 'Error saving policies');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-4">
        <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
        <p className="text-sm text-slate-500 font-medium">
          {isEn ? 'Loading IT Health policies...' : 'Đang tải chính sách giám sát IT Health...'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-3xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-200 text-xs font-semibold">
              <Sliders className="w-3.5 h-3.5" />
              <span>{isEn ? 'SIMPLY IT Health Alert Engine' : 'Quy Chuẩn Giám Sát IT Health v4'}</span>
            </div>
            <h2 className="text-xl font-bold tracking-tight text-white">
              {isEn ? 'Device Health & Metric Alert Policies' : 'Chính Sách Cảnh Báo Sức Khỏe Thiết Bị'}
            </h2>
            <p className="text-xs text-blue-200/80 max-w-2xl leading-relaxed">
              {isEn
                ? 'Server-side evaluation engine. Thresholds, hysteresis auto-resolve, and automated ITSM ticket creation for Windows devices running SIMPLY IT Agent.'
                : 'Động cơ đánh giá ngưỡng tập trung trên Máy Chủ. Tự động kiểm tra duy trì (Sustained Check), cơ chế hồi trễ (Hysteresis Auto-Resolve) và tự tạo Ticket ITSM cho kỹ thuật viên.'}
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={fetchPolicies}
              className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-medium transition-colors flex items-center gap-1.5 border border-white/10"
              title={isEn ? 'Refresh' : 'Tải lại'}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{isEn ? 'Reload' : 'Tải lại'}</span>
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white text-xs font-bold transition-all shadow-md flex items-center gap-2 disabled:opacity-50"
            >
              {saving ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : saveSuccess ? (
                <Check className="w-4 h-4" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>{saveSuccess ? (isEn ? 'Saved!' : 'Đã lưu!') : isEn ? 'Save Changes' : 'Lưu Thay Đổi'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Success Notification */}
      {saveSuccess && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 rounded-2xl flex items-center gap-3 text-xs font-semibold animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>
            {isEn
              ? 'Alert policies updated successfully. New thresholds apply immediately on incoming reports.'
              : 'Đã cập nhật các chính sách cảnh báo thành công. Mọi ngưỡng mới sẽ áp dụng tức thì cho các báo cáo gửi lên.'}
          </span>
        </div>
      )}

      {/* Error Notification */}
      {errorMsg && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-400 rounded-2xl flex items-center gap-3 text-xs font-semibold">
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Policies Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {policies.map((policy) => {
          const meta = METRIC_METADATA[policy.metric] || {
            nameVi: policy.metric,
            nameEn: policy.metric,
            descVi: policy.description || '',
            descEn: policy.description || '',
            unit: '',
            icon: Activity,
            color: 'text-slate-500 bg-slate-500/10 border-slate-500/20',
          };
          const Icon = meta.icon;

          return (
            <div
              key={policy.metric}
              className={`rounded-2xl border transition-all p-5 flex flex-col justify-between space-y-4 ${
                policy.enabled
                  ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm'
                  : 'bg-slate-50 dark:bg-slate-950/40 border-slate-200/60 dark:border-slate-800/40 opacity-70'
              }`}
            >
              {/* Card Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center border shrink-0 ${meta.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">
                      {isEn ? meta.nameEn : meta.nameVi}
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                      {isEn ? meta.descEn : meta.descVi}
                    </p>
                  </div>
                </div>

                {/* Enable/Disable Toggle */}
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={policy.enabled}
                    onChange={(e) => handleUpdatePolicy(policy.metric, 'enabled', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-slate-600 peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {/* Threshold Fields */}
              <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                {meta.isBinary ? (
                  <div className="p-3 bg-slate-100 dark:bg-slate-800/50 rounded-xl text-xs text-slate-600 dark:text-slate-300 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                    <span>{isEn ? meta.binaryNoteEn : meta.binaryNoteVi}</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {/* Warning Threshold */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                        {isEn ? 'Warning' : 'Cảnh Báo'}
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          value={policy.warningThreshold ?? ''}
                          onChange={(e) =>
                            handleUpdatePolicy(
                              policy.metric,
                              'warningThreshold',
                              e.target.value === '' ? null : Number(e.target.value)
                            )
                          }
                          disabled={!policy.enabled}
                          className="w-full px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
                        />
                        {meta.unit && (
                          <span className="absolute right-2 top-1.5 text-[10px] text-slate-400 font-medium">
                            {meta.unit}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Critical Threshold */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">
                        {isEn ? 'Critical' : 'Nghiêm Trọng'}
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          value={policy.criticalThreshold ?? ''}
                          onChange={(e) =>
                            handleUpdatePolicy(
                              policy.metric,
                              'criticalThreshold',
                              e.target.value === '' ? null : Number(e.target.value)
                            )
                          }
                          disabled={!policy.enabled}
                          className="w-full px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-rose-200 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-950/20 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-rose-500"
                        />
                        {meta.unit && (
                          <span className="absolute right-2 top-1.5 text-[10px] text-slate-400 font-medium">
                            {meta.unit}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Clear (Hysteresis) Threshold */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                        {isEn ? 'Clear (Auto)' : 'Tự Hồi Phục'}
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          value={policy.clearThreshold ?? ''}
                          onChange={(e) =>
                            handleUpdatePolicy(
                              policy.metric,
                              'clearThreshold',
                              e.target.value === '' ? null : Number(e.target.value)
                            )
                          }
                          disabled={!policy.enabled}
                          className="w-full px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/50 dark:bg-emerald-950/20 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                        {meta.unit && (
                          <span className="absolute right-2 top-1.5 text-[10px] text-slate-400 font-medium">
                            {meta.unit}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Sustained & Ticket Settings */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
                  {/* Sustained Duration */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                      {isEn ? 'Sustained Time (Min)' : 'Thời Gian Duy Trì (Phút)'}
                    </label>
                    <select
                      value={policy.sustainedMinutes}
                      onChange={(e) =>
                        handleUpdatePolicy(policy.metric, 'sustainedMinutes', Number(e.target.value))
                      }
                      disabled={!policy.enabled}
                      className="w-full px-2.5 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none"
                    >
                      <option value={0}>{isEn ? '0 min (Immediate)' : '0 phút (Tức thì)'}</option>
                      <option value={5}>{isEn ? '5 minutes' : '5 phút'}</option>
                      <option value={15}>{isEn ? '15 minutes' : '15 phút'}</option>
                      <option value={30}>{isEn ? '30 minutes' : '30 phút'}</option>
                      <option value={60}>{isEn ? '60 minutes' : '60 phút'}</option>
                    </select>
                  </div>

                  {/* Auto Create Ticket */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase flex items-center justify-between">
                      <span>{isEn ? 'Auto Create Ticket' : 'Tự Động Tạo Ticket'}</span>
                      <input
                        type="checkbox"
                        checked={policy.autoCreateTicket}
                        onChange={(e) =>
                          handleUpdatePolicy(policy.metric, 'autoCreateTicket', e.target.checked)
                        }
                        disabled={!policy.enabled}
                        className="rounded text-blue-600 focus:ring-0 cursor-pointer"
                      />
                    </label>
                    <select
                      value={policy.ticketPriority}
                      onChange={(e) =>
                        handleUpdatePolicy(policy.metric, 'ticketPriority', e.target.value)
                      }
                      disabled={!policy.enabled || !policy.autoCreateTicket}
                      className="w-full px-2.5 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none disabled:opacity-40"
                    >
                      <option value="LOW">{isEn ? 'Low Priority' : 'Độ ưu tiên Thấp'}</option>
                      <option value="MEDIUM">{isEn ? 'Medium Priority' : 'Độ ưu tiên Trung bình'}</option>
                      <option value="HIGH">{isEn ? 'High Priority' : 'Độ ưu tiên Cao'}</option>
                      <option value="URGENT">{isEn ? 'Urgent Priority' : 'Độ ưu tiên Khẩn cấp'}</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
