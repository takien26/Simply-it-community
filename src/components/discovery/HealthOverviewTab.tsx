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
  WifiOff,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Search,
  ExternalLink,
  Ticket,
  Sliders,
  Filter,
  Eye,
  Laptop,
} from 'lucide-react';

interface HealthOverviewTabProps {
  onSelectAsset?: (asset: any) => void;
}

export function HealthOverviewTab({ onSelectAsset }: HealthOverviewTabProps) {
  const { language } = useLanguage();
  const isEn = language === 'en';

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'CRITICAL' | 'WARNING' | 'OFFLINE' | 'HEALTHY'>('ALL');

  const fetchOverview = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/health/overview');
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error('Failed to load health overview:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-16 space-y-4">
        <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
        <p className="text-xs text-slate-500 font-medium">
          {isEn ? 'Loading fleet health telemetry...' : 'Đang tải dữ liệu giám sát sức khỏe toàn bộ thiết bị...'}
        </p>
      </div>
    );
  }

  const kpis = data?.kpis || {
    totalMonitored: 0,
    healthy: 0,
    warning: 0,
    critical: 0,
    offline: 0,
    activeAlertsCount: 0,
  };

  const devices: any[] = data?.devices || [];
  const activeAlerts: any[] = data?.activeAlerts || [];

  const filteredDevices = devices.filter((dev) => {
    if (statusFilter !== 'ALL' && dev.status !== statusFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchTag = dev.asset?.assetTag?.toLowerCase().includes(q);
      const matchName = dev.asset?.name?.toLowerCase().includes(q);
      const matchHost = dev.asset?.hostname?.toLowerCase().includes(q);
      const matchUser = dev.asset?.user?.fullName?.toLowerCase().includes(q);
      return matchTag || matchName || matchHost || matchUser;
    }
    return true;
  });

  const getUsageColor = (pct: number) => {
    if (pct >= 90) return 'bg-rose-500';
    if (pct >= 75) return 'bg-amber-500';
    return 'bg-blue-600';
  };

  const formatUptime = (seconds: number) => {
    if (!seconds) return '0h';
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    if (days > 0) return `${days}d ${hours}h`;
    return `${hours}h`;
  };

  return (
    <div className="space-y-6">
      {/* Top KPIs Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Monitored */}
        <div
          onClick={() => setStatusFilter('ALL')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            statusFilter === 'ALL'
              ? 'bg-blue-50/50 dark:bg-blue-950/20 border-blue-400 dark:border-blue-800 shadow-xs'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
          }`}
        >
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            {isEn ? 'Total Monitored' : 'Thiết Bị Giám Sát'}
          </span>
          <div className="flex items-center justify-between mt-1">
            <span className="text-xl font-black text-slate-900 dark:text-slate-100 font-mono">
              {kpis.totalMonitored}
            </span>
            <Activity className="w-4 h-4 text-blue-500" />
          </div>
        </div>

        {/* Healthy */}
        <div
          onClick={() => setStatusFilter('HEALTHY')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            statusFilter === 'HEALTHY'
              ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-400 dark:border-emerald-800 shadow-xs'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
          }`}
        >
          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
            {isEn ? 'Healthy' : 'Khỏe Mạnh'}
          </span>
          <div className="flex items-center justify-between mt-1">
            <span className="text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
              {kpis.healthy}
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
        </div>

        {/* Warning */}
        <div
          onClick={() => setStatusFilter('WARNING')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            statusFilter === 'WARNING'
              ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-400 dark:border-amber-800 shadow-xs'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
          }`}
        >
          <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
            {isEn ? 'Warning' : 'Cảnh Báo'}
          </span>
          <div className="flex items-center justify-between mt-1">
            <span className="text-xl font-black text-amber-600 dark:text-amber-400 font-mono">
              {kpis.warning}
            </span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
        </div>

        {/* Critical */}
        <div
          onClick={() => setStatusFilter('CRITICAL')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            statusFilter === 'CRITICAL'
              ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-400 dark:border-rose-800 shadow-xs'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
          }`}
        >
          <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">
            {isEn ? 'Critical' : 'Nghiêm Trọng'}
          </span>
          <div className="flex items-center justify-between mt-1">
            <span className="text-xl font-black text-rose-600 dark:text-rose-400 font-mono">
              {kpis.critical}
            </span>
            <ShieldAlert className="w-4 h-4 text-rose-500" />
          </div>
        </div>

        {/* Offline */}
        <div
          onClick={() => setStatusFilter('OFFLINE')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            statusFilter === 'OFFLINE'
              ? 'bg-slate-100 dark:bg-slate-800 border-slate-400 dark:border-slate-600 shadow-xs'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
          }`}
        >
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            {isEn ? 'Offline' : 'Mất Kết Nối'}
          </span>
          <div className="flex items-center justify-between mt-1">
            <span className="text-xl font-black text-slate-600 dark:text-slate-400 font-mono">
              {kpis.offline}
            </span>
            <WifiOff className="w-4 h-4 text-slate-400" />
          </div>
        </div>

        {/* Active Alerts */}
        <div className="p-4 rounded-2xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
            {isEn ? 'Active Alerts' : 'Cảnh Báo Mở'}
          </span>
          <div className="flex items-center justify-between mt-1">
            <span className="text-xl font-black text-purple-600 dark:text-purple-400 font-mono">
              {kpis.activeAlertsCount}
            </span>
            <Ticket className="w-4 h-4 text-purple-500" />
          </div>
        </div>
      </div>

      {/* Active Incidents Banner */}
      {activeAlerts.length > 0 && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/20 border border-rose-300 dark:border-rose-900/60 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-rose-800 dark:text-rose-300 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              <span>
                {isEn ? 'Active Incidents Requiring Attention' : 'Sự Cố IT Health Cần Chú Ý'} ({activeAlerts.length})
              </span>
            </h4>
            <Link
              href="/tickets"
              className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1"
            >
              <span>{isEn ? 'View All Tickets' : 'Xem Tất Cả Ticket'}</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {activeAlerts.slice(0, 4).map((alert: any) => (
              <div
                key={alert.id}
                className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/40 text-xs flex items-center justify-between gap-3 shadow-2xs"
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 shrink-0">
                    {alert.severity}
                  </span>
                  <div className="truncate">
                    <span className="font-bold text-slate-800 dark:text-slate-100">
                      [{alert.asset?.assetTag || 'Device'}] {alert.title}
                    </span>
                    <p className="text-[11px] text-slate-500 truncate">{alert.message}</p>
                  </div>
                </div>

                {alert.ticketId && (
                  <Link
                    href="/tickets"
                    className="px-2.5 py-1 rounded bg-rose-50 hover:bg-rose-100 text-rose-700 text-[11px] font-bold shrink-0 transition-colors"
                  >
                    Ticket
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder={
              isEn ? 'Search by Tag, Device Name, Hostname, User...' : 'Tìm theo Mã, Tên máy, Hostname, Người dùng...'
            }
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchOverview}
            className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>{isEn ? 'Refresh' : 'Làm mới'}</span>
          </button>
        </div>
      </div>

      {/* Monitored Devices Fleet Table */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900 shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">{isEn ? 'Device / Asset' : 'Thiết Bị / Mã Tài Sản'}</th>
                <th className="py-3 px-4">{isEn ? 'Status' : 'Trạng Thái'}</th>
                <th className="py-3 px-4">{isEn ? 'CPU Load' : 'Tải CPU'}</th>
                <th className="py-3 px-4">{isEn ? 'RAM Usage' : 'Bộ Nhớ RAM'}</th>
                <th className="py-3 px-4">{isEn ? 'Drive C:' : 'Ổ C:'}</th>
                <th className="py-3 px-4">{isEn ? 'Security Shields' : 'Lá Chắn Bảo Mật'}</th>
                <th className="py-3 px-4">{isEn ? 'Uptime' : 'Bật Máy'}</th>
                <th className="py-3 px-4">{isEn ? 'Last Report' : 'Báo Cáo'}</th>
                <th className="py-3 px-4 text-right">{isEn ? 'Action' : 'Hành Động'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredDevices.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    {isEn ? 'No devices found matching filter.' : 'Không tìm thấy thiết bị nào phù hợp bộ lọc.'}
                  </td>
                </tr>
              ) : (
                filteredDevices.map((dev: any) => {
                  const asset = dev.asset || {};
                  const disks = Array.isArray(dev.disks) ? dev.disks : [];
                  const cDrive = disks.find((d: any) => d.driveLetter === 'C:') || disks[0];
                  const security = dev.security || {};

                  return (
                    <tr
                      key={dev.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* Device & Tag */}
                      <td className="py-3 px-4">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                              [{asset.assetTag || 'N/A'}]
                            </span>
                            <span className="font-bold text-slate-800 dark:text-slate-100">
                              {asset.name}
                            </span>
                          </div>
                          <div className="text-[10.5px] text-slate-400 flex items-center gap-2">
                            <span>Host: {asset.hostname || 'N/A'}</span>
                            {asset.user?.fullName && (
                              <span>• 👤 {asset.user.fullName}</span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                            dev.status === 'HEALTHY'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : dev.status === 'WARNING'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : dev.status === 'CRITICAL'
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : 'bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                        >
                          {dev.status}
                        </span>
                      </td>

                      {/* CPU */}
                      <td className="py-3 px-4">
                        <div className="w-24 space-y-1">
                          <div className="flex justify-between text-[10px] font-mono">
                            <span>{dev.cpuUsagePercent ?? 0}%</span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${getUsageColor(dev.cpuUsagePercent || 0)}`}
                              style={{ width: `${Math.min(dev.cpuUsagePercent || 0, 100)}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* RAM */}
                      <td className="py-3 px-4">
                        <div className="w-24 space-y-1">
                          <div className="flex justify-between text-[10px] font-mono">
                            <span>{dev.ramUsagePercent ?? 0}%</span>
                            <span className="text-slate-400">{dev.ramTotalGb ? `${dev.ramTotalGb}G` : ''}</span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${getUsageColor(dev.ramUsagePercent || 0)}`}
                              style={{ width: `${Math.min(dev.ramUsagePercent || 0, 100)}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Disk C */}
                      <td className="py-3 px-4">
                        {cDrive ? (
                          <div className="w-24 space-y-1">
                            <div className="flex justify-between text-[10px] font-mono">
                              <span>{cDrive.usedPercent ?? 0}%</span>
                              <span className="text-slate-400">{cDrive.freeGb}G free</span>
                            </div>
                            <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${getUsageColor(cDrive.usedPercent || 0)}`}
                                style={{ width: `${Math.min(cDrive.usedPercent || 0, 100)}%` }}
                              />
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400">N/A</span>
                        )}
                      </td>

                      {/* Security Shields */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          {/* Defender */}
                          <span
                            title={`Defender: ${security.defender?.enabled ? 'Active' : 'Disabled'}`}
                            className={`p-1 rounded ${
                              security.defender?.enabled
                                ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30'
                                : 'text-rose-600 bg-rose-50 dark:bg-rose-950/30'
                            }`}
                          >
                            <Shield className="w-3.5 h-3.5" />
                          </span>

                          {/* Firewall */}
                          <span
                            title={`Firewall: ${security.firewall?.allProfilesEnabled ? 'Active' : 'Warning'}`}
                            className={`p-1 rounded ${
                              security.firewall?.allProfilesEnabled
                                ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30'
                                : 'text-amber-600 bg-amber-50 dark:bg-amber-950/30'
                            }`}
                          >
                            <ShieldCheck className="w-3.5 h-3.5" />
                          </span>

                          {/* BitLocker */}
                          <span
                            title={`BitLocker: ${security.bitlocker?.protectionStatus || 'Off'}`}
                            className={`p-1 rounded ${
                              security.bitlocker?.protectionStatus === 'ON' || security.bitlocker?.osDriveEncrypted
                                ? 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/30'
                                : 'text-slate-400 bg-slate-100 dark:bg-slate-800'
                            }`}
                          >
                            <ShieldAlert className="w-3.5 h-3.5" />
                          </span>
                        </div>
                      </td>

                      {/* Uptime */}
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-600 dark:text-slate-300">
                        {formatUptime(dev.uptimeSeconds || 0)}
                      </td>

                      {/* Last Report */}
                      <td className="py-3 px-4 text-[10.5px] text-slate-400">
                        {dev.lastReportAt ? new Date(dev.lastReportAt).toLocaleTimeString() : 'N/A'}
                      </td>

                      {/* Action */}
                      <td className="py-3 px-4 text-right">
                        {onSelectAsset ? (
                          <button
                            onClick={() => onSelectAsset(asset)}
                            className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold inline-flex items-center gap-1 transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>{isEn ? 'View' : 'Chi tiết'}</span>
                          </button>
                        ) : (
                          <Link
                            href={`/assets`}
                            className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold inline-flex items-center gap-1 transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>{isEn ? 'View' : 'Chi tiết'}</span>
                          </Link>
                        )}
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
  );
}
