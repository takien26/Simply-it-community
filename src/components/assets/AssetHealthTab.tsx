'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/lib/i18n/context';
import {
  Activity,
  Cpu,
  HardDrive,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Clock,
  Battery,
  BatteryCharging,
  Wifi,
  WifiOff,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
  Ticket,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface AssetHealthTabProps {
  assetId: string;
  assetName?: string;
}

export function AssetHealthTab({ assetId, assetName }: AssetHealthTabProps) {
  const { language } = useLanguage();
  const isEn = language === 'en';

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  const fetchHealth = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/assets/${assetId}/health`);
      if (!res.ok) {
        throw new Error(`Failed to load health data (${res.status})`);
      }
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      console.error('Error fetching asset health:', err);
      setError(err?.message || 'Failed to fetch asset health');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (assetId) {
      fetchHealth();
    }
  }, [assetId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-3">
        <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
        <p className="text-xs text-slate-500 font-medium">
          {isEn ? 'Reading live telemetry from agent...' : 'Đang lấy dữ liệu đo lường trực tiếp từ Agent...'}
        </p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-500 mx-auto flex items-center justify-center border border-rose-100">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <div>
          <h4 className="font-bold text-sm text-slate-800">
            {isEn ? 'No Health Telemetry Available' : 'Chưa Có Dữ Liệu IT Health'}
          </h4>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            {isEn
              ? 'This device has not yet reported health data via SIMPLY IT Agent v4 (-Mode Health). Ensure the scheduled task is running.'
              : 'Thiết bị này chưa gửi báo cáo sức khỏe qua SIMPLY IT Agent v4 (-Mode Health). Hãy đảm bảo Scheduled Task trên máy trạm đang hoạt động.'}
          </p>
        </div>
        <button
          onClick={fetchHealth}
          className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>{isEn ? 'Retry' : 'Thử lại'}</span>
        </button>
      </div>
    );
  }

  const { health, activeAlerts = [], recentAlerts = [] } = data;

  if (!health) {
    return (
      <div className="p-8 text-center space-y-3 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
        <Activity className="w-8 h-8 text-slate-400 mx-auto" />
        <p className="text-xs text-slate-500">
          {isEn
            ? 'No health record found for this asset. Deploy SIMPLY IT Agent to begin monitoring.'
            : 'Chưa có bản ghi sức khỏe cho thiết bị này. Hãy cài đặt SIMPLY IT Agent để bắt đầu giám sát tự động.'}
        </p>
      </div>
    );
  }

  // Format status badge
  const statusColors: Record<string, { bg: string; text: string; border: string; labelVi: string; labelEn: string }> = {
    HEALTHY: {
      bg: 'bg-emerald-500/10',
      text: 'text-emerald-700 dark:text-emerald-400',
      border: 'border-emerald-500/30',
      labelVi: 'KHỎE MẠNH / TỐT',
      labelEn: 'HEALTHY',
    },
    WARNING: {
      bg: 'bg-amber-500/10',
      text: 'text-amber-700 dark:text-amber-400',
      border: 'border-amber-500/30',
      labelVi: 'CẢNH BÁO / WARNING',
      labelEn: 'WARNING',
    },
    CRITICAL: {
      bg: 'bg-rose-500/10',
      text: 'text-rose-700 dark:text-rose-400',
      border: 'border-rose-500/30',
      labelVi: 'NGHIÊM TRỌNG / CRITICAL',
      labelEn: 'CRITICAL',
    },
    OFFLINE: {
      bg: 'bg-slate-500/10',
      text: 'text-slate-700 dark:text-slate-400',
      border: 'border-slate-500/30',
      labelVi: 'MẤT KẾT NỐI (OFFLINE)',
      labelEn: 'OFFLINE',
    },
  };

  const currentStatus = statusColors[health.status] || statusColors.HEALTHY;
  const security = health.security || {};
  const battery = health.battery || null;
  const disks = Array.isArray(health.disks) ? health.disks : [];

  // Helper for progress bar color
  const getUsageColor = (pct: number) => {
    if (pct >= 90) return 'bg-rose-500';
    if (pct >= 75) return 'bg-amber-500';
    return 'bg-blue-600';
  };

  // Format uptime text
  const formatUptime = (seconds: number) => {
    if (!seconds) return '0h';
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (days > 0) return `${days}d ${hours}h ${mins}m`;
    return `${hours}h ${mins}m`;
  };

  return (
    <div className="space-y-6">
      {/* Top Health Status Bar */}
      <div className="p-4 rounded-2xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${currentStatus.bg} ${currentStatus.border}`}>
              <Activity className={`w-6 h-6 ${currentStatus.text}`} />
            </div>
            <span
              className={`absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-slate-900 ${
                health.status === 'HEALTHY'
                  ? 'bg-emerald-500'
                  : health.status === 'WARNING'
                  ? 'bg-amber-500'
                  : health.status === 'CRITICAL'
                  ? 'bg-rose-500'
                  : 'bg-slate-400'
              }`}
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${currentStatus.bg} ${currentStatus.text} ${currentStatus.border}`}>
                {isEn ? currentStatus.labelEn : currentStatus.labelVi}
              </span>
              {activeAlerts.length > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500 text-white">
                  {activeAlerts.length} {isEn ? 'alert(s)' : 'cảnh báo'}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {isEn ? 'Last Heartbeat Report: ' : 'Báo cáo gần nhất: '}
              <span className="font-semibold text-slate-700 dark:text-slate-200">
                {health.lastReportAt ? new Date(health.lastReportAt).toLocaleString() : 'N/A'}
              </span>
            </p>
          </div>
        </div>

        <button
          onClick={fetchHealth}
          className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>{isEn ? 'Refresh Telemetry' : 'Làm mới'}</span>
        </button>
      </div>

      {/* Active Alerts Banner */}
      {activeAlerts.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>{isEn ? 'Active Health Incidents & Alerts' : 'Cảnh Báo Sức Khỏe Đang Kích Hoạt'}</span>
          </h4>

          <div className="space-y-2">
            {activeAlerts.map((alert: any) => (
              <div
                key={alert.id}
                className="p-3.5 rounded-xl border border-rose-300 dark:border-rose-900/60 bg-rose-50/70 dark:bg-rose-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
              >
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-rose-600 text-white flex items-center justify-center shrink-0 font-bold text-xs mt-0.5">
                    !
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-rose-900 dark:text-rose-200">
                        {alert.title}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.2 rounded bg-rose-200 text-rose-800">
                        {alert.severity}
                      </span>
                    </div>
                    <p className="text-xs text-rose-800 dark:text-rose-300 mt-0.5">
                      {alert.message}
                    </p>
                    <p className="text-[10px] text-rose-600/80 mt-1">
                      {isEn ? 'Triggered at: ' : 'Thời điểm kích hoạt: '}
                      {new Date(alert.triggeredAt).toLocaleString()}
                    </p>
                  </div>
                </div>

                {alert.ticketId && (
                  <Link
                    href={`/tickets`}
                    className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold inline-flex items-center gap-1 shrink-0 transition-colors shadow-2xs"
                  >
                    <Ticket className="w-3.5 h-3.5" />
                    <span>{isEn ? 'View Ticket' : 'Xem Ticket ITSM'}</span>
                    <ExternalLink className="w-3 h-3 ml-0.5" />
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* CPU Metric */}
        <div className="p-4 rounded-2xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-blue-500" />
              <span>CPU Load</span>
            </span>
            <span className="text-sm font-black text-slate-800 dark:text-slate-100 font-mono">
              {health.cpuUsagePercent != null ? `${health.cpuUsagePercent}%` : 'N/A'}
            </span>
          </div>

          <div className="space-y-1">
            <div className="w-full h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${getUsageColor(
                  health.cpuUsagePercent || 0
                )}`}
                style={{ width: `${Math.min(health.cpuUsagePercent || 0, 100)}%` }}
              />
            </div>
            <p className="text-[10px] text-slate-400">
              {health.cpuUsagePercent != null && health.cpuUsagePercent >= 90
                ? isEn ? 'High CPU utilization' : 'Tải CPU cao liên tục'
                : isEn ? 'Normal operating range' : 'Mức hoạt động bình thường'}
            </p>
          </div>
        </div>

        {/* RAM Metric */}
        <div className="p-4 rounded-2xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-indigo-500" />
              <span>Memory (RAM)</span>
            </span>
            <span className="text-sm font-black text-slate-800 dark:text-slate-100 font-mono">
              {health.ramUsagePercent != null ? `${health.ramUsagePercent}%` : 'N/A'}
            </span>
          </div>

          <div className="space-y-1">
            <div className="w-full h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${getUsageColor(
                  health.ramUsagePercent || 0
                )}`}
                style={{ width: `${Math.min(health.ramUsagePercent || 0, 100)}%` }}
              />
            </div>
            <p className="text-[10px] text-slate-400 font-mono">
              {health.ramUsedGb != null && health.ramTotalGb != null
                ? `${health.ramUsedGb} GB / ${health.ramTotalGb} GB`
                : 'N/A'}
            </p>
          </div>
        </div>

        {/* System Uptime */}
        <div className="p-4 rounded-2xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-cyan-500" />
              <span>{isEn ? 'System Uptime' : 'Thời Gian Bật'}</span>
            </span>
            <span className="text-sm font-black text-slate-800 dark:text-slate-100 font-mono">
              {formatUptime(health.uptimeSeconds || 0)}
            </span>
          </div>

          <div className="space-y-0.5">
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              {isEn ? 'Last Boot: ' : 'Khởi động: '}
              <span className="font-semibold text-slate-700 dark:text-slate-200">
                {health.lastBootTime ? new Date(health.lastBootTime).toLocaleString() : 'N/A'}
              </span>
            </p>
            {health.uptimeSeconds > 14 * 86400 && (
              <span className="inline-block text-[10px] text-amber-600 font-bold">
                ⚠️ {isEn ? 'Reboot recommended' : 'Nên khởi động lại máy'}
              </span>
            )}
          </div>
        </div>

        {/* Battery Health (if available) */}
        <div className="p-4 rounded-2xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase flex items-center gap-1.5">
              {battery?.isCharging ? (
                <BatteryCharging className="w-4 h-4 text-emerald-500" />
              ) : (
                <Battery className="w-4 h-4 text-amber-500" />
              )}
              <span>{isEn ? 'Battery' : 'Pin Laptop'}</span>
            </span>
            <span className="text-sm font-black text-slate-800 dark:text-slate-100 font-mono">
              {battery ? `${battery.estimatedChargeRemaining || 0}%` : 'N/A (Desktop)'}
            </span>
          </div>

          <div className="space-y-0.5">
            {battery ? (
              <>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  {isEn ? 'Status: ' : 'Trạng thái: '}
                  <span className="font-semibold text-slate-700 dark:text-slate-200">
                    {battery.batteryStatus || (battery.isCharging ? 'Charging' : 'Discharging')}
                  </span>
                </p>
                {battery.healthPercent && (
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    {isEn ? 'Battery Health: ' : 'Độ chai pin: '}
                    <span className="font-semibold text-slate-700 dark:text-slate-200">
                      {battery.healthPercent}%
                    </span>
                  </p>
                )}
              </>
            ) : (
              <p className="text-[10px] text-slate-400">
                {isEn ? 'AC Power / No battery detected' : 'Nguồn điện trực tiếp'}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Storage Disks Section */}
      <div className="p-5 rounded-2xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-2">
          <HardDrive className="w-4 h-4 text-purple-500" />
          <span>{isEn ? 'Storage Drives & Partitions' : 'Phân Vùng Ổ Đĩa Lưu Trữ'}</span>
        </h4>

        {disks.length === 0 ? (
          <p className="text-xs text-slate-400">
            {isEn ? 'No disk storage telemetry reported.' : 'Chưa có thông tin ổ đĩa lưu trữ.'}
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {disks.map((d: any) => {
              const usedPct = d.usedPercent ?? (d.totalGb && d.freeGb ? Math.round(((d.totalGb - d.freeGb) / d.totalGb) * 100) : 0);
              return (
                <div
                  key={d.driveLetter}
                  className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black font-mono px-2 py-0.5 rounded bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-800 dark:text-slate-100">
                      {d.driveLetter}
                    </span>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200 font-mono">
                      {usedPct}% {isEn ? 'Used' : 'Đã dùng'}
                    </span>
                  </div>

                  <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${getUsageColor(usedPct)}`}
                      style={{ width: `${Math.min(usedPct, 100)}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                    <span>
                      {isEn ? 'Free: ' : 'Còn trống: '}
                      {d.freeGb} GB
                    </span>
                    <span>
                      {isEn ? 'Total: ' : 'Tổng: '}
                      {d.totalGb} GB
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Security Shields Grid */}
      <div className="p-5 rounded-2xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-2">
          <Shield className="w-4 h-4 text-emerald-500" />
          <span>{isEn ? 'Endpoint Security & Compliance Shields' : 'Lá Chắn Bảo Mật & Tuân Thủ Thiết Bị'}</span>
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {/* Windows Defender */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-start gap-3">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                security.defender?.enabled
                  ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                  : 'bg-rose-500/10 text-rose-600 border border-rose-500/20'
              }`}
            >
              {security.defender?.enabled ? (
                <ShieldCheck className="w-5 h-5" />
              ) : (
                <ShieldAlert className="w-5 h-5" />
              )}
            </div>
            <div className="space-y-1">
              <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Windows Defender
              </h5>
              <div className="flex items-center gap-1.5">
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    security.defender?.enabled
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  {security.defender?.enabled
                    ? isEn ? 'Real-Time Protection ON' : 'Bật Bảo Vệ Thời Gian Thực'
                    : isEn ? 'Protection Disabled' : 'Đang Bị Tắt'}
                </span>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                {isEn ? 'Signature Age: ' : 'Mẫu virus: '}
                {security.defender?.signatureAgeDays != null
                  ? `${security.defender.signatureAgeDays} ${isEn ? 'day(s) old' : 'ngày trước'}`
                  : 'N/A'}
              </p>
            </div>
          </div>

          {/* Windows Firewall */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-start gap-3">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                security.firewall?.allProfilesEnabled
                  ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                  : 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
              }`}
            >
              {security.firewall?.allProfilesEnabled ? (
                <ShieldCheck className="w-5 h-5" />
              ) : (
                <ShieldAlert className="w-5 h-5" />
              )}
            </div>
            <div className="space-y-1">
              <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Windows Firewall
              </h5>
              <div className="flex items-center gap-1.5">
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    security.firewall?.allProfilesEnabled
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {security.firewall?.allProfilesEnabled
                    ? isEn ? 'All Profiles Active' : 'Đang Bật Toàn Bộ'
                    : isEn ? 'Partial / Disabled' : 'Tắt Một Phần Hoặc Toàn Bộ'}
                </span>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                Domain: {security.firewall?.domainProfile ? 'ON' : 'OFF'} • Private:{' '}
                {security.firewall?.privateProfile ? 'ON' : 'OFF'}
              </p>
            </div>
          </div>

          {/* BitLocker Drive Encryption */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-start gap-3">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                security.bitlocker?.protectionStatus === 'ON' ||
                security.bitlocker?.protectionStatus === 'PROTECTION ON' ||
                security.bitlocker?.osDriveEncrypted
                  ? 'bg-indigo-500/10 text-indigo-600 border border-indigo-500/20'
                  : 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
              }`}
            >
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                BitLocker Encryption
              </h5>
              <div className="flex items-center gap-1.5">
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    security.bitlocker?.protectionStatus === 'ON' ||
                    security.bitlocker?.osDriveEncrypted
                      ? 'bg-indigo-100 text-indigo-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {security.bitlocker?.protectionStatus === 'ON' ||
                  security.bitlocker?.osDriveEncrypted
                    ? isEn ? 'Drive C: Encrypted' : 'Ổ C: Đã Mã Hóa'
                    : isEn ? 'Unencrypted / Protection Off' : 'Chưa Mã Hóa'}
                </span>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                {isEn ? 'Status: ' : 'Trạng thái: '}
                {security.bitlocker?.protectionStatus || 'Off'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Alert History Section */}
      {recentAlerts.length > 0 && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="w-full p-4 flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
          >
            <span>
              {isEn ? 'Recent Health Alerts Log' : 'Nhật Ký Cảnh Báo Sức Khỏe Gần Đây'} ({recentAlerts.length})
            </span>
            {showHistory ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showHistory && (
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
              {recentAlerts.map((a: any) => (
                <div
                  key={a.id}
                  className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-xs flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        a.status === 'TRIGGERED'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {a.status}
                    </span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {a.title}
                    </span>
                    <span className="text-slate-400">• {a.message}</span>
                  </div>

                  <span className="text-[10px] text-slate-400 shrink-0">
                    {new Date(a.triggeredAt).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
