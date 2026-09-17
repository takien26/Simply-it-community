'use client';

import React, { useState, useEffect } from 'react';
import {
  Cloud,
  X,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Save,
  Plug,
  ExternalLink,
  ShieldAlert,
  DollarSign,
  Users,
  Copy,
  Check,
  FileSpreadsheet,
  Layers,
  Sparkles,
  Info,
  Laptop,
  Zap,
  ArrowRightLeft,
} from 'lucide-react';
import { ReconciliationReport, CloudAssignedUser } from '@/lib/license-connectors/types';
import { formatPrice } from './types';
import ExcelJS from 'exceljs';

export interface LicenseIntegrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  isEn?: boolean;
}

export function LicenseIntegrationModal({
  isOpen,
  onClose,
  isEn = false,
}: LicenseIntegrationModalProps) {
  const [activeProvider, setActiveProvider] = useState<'m365' | 'google' | 'adobe'>('m365');
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [report, setReport] = useState<ReconciliationReport | null>(null);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [assigningFifo, setAssigningFifo] = useState(false);
  const [autoAssignResult, setAutoAssignResult] = useState<any | null>(null);

  // Form states
  const [m365Config, setM365Config] = useState({
    tenantId: '',
    clientId: '',
    clientSecret: '',
    clientSecretMasked: '',
    hasSecret: false,
    isDemoMode: false,
    autoSyncEnabled: false,
  });

  const [googleConfig, setGoogleConfig] = useState({
    serviceAccountEmail: '',
    adminEmail: '',
    isDemoMode: true,
  });

  const [adobeConfig, setAdobeConfig] = useState({
    clientId: '',
    orgId: '',
    isDemoMode: true,
  });

  // Tải cấu hình khi mở modal
  useEffect(() => {
    if (!isOpen) return;
    const loadConfig = async () => {
      try {
        setLoadingConfig(true);
        const res = await fetch('/api/licenses/integrations');
        if (res.ok) {
          const data = await res.json();
          if (data.m365) setM365Config(data.m365);
          if (data.google) setGoogleConfig(data.google);
          if (data.adobe) setAdobeConfig(data.adobe);
        }
      } catch (err) {
        console.error('Lỗi khi tải cấu hình tích hợp:', err);
      } finally {
        setLoadingConfig(false);
      }
    };
    loadConfig();
  }, [isOpen]);

  if (!isOpen) return null;

  // 1. Lưu cấu hình
  const handleSaveConfig = async () => {
    try {
      setSavingConfig(true);
      setTestResult(null);
      const res = await fetch('/api/licenses/integrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          m365: m365Config,
          google: googleConfig,
          adobe: adobeConfig,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setTestResult({ success: true, message: 'Đã lưu cấu hình tích hợp thành công!' });
      } else {
        setTestResult({ success: false, message: data.error || 'Lỗi lưu cấu hình' });
      }
    } catch (err: any) {
      setTestResult({ success: false, message: err?.message || 'Lỗi kết nối' });
    } finally {
      setSavingConfig(false);
    }
  };

  // 2. Kiểm tra kết nối
  const handleTestConnection = async () => {
    try {
      setTestingConnection(true);
      setTestResult(null);
      const res = await fetch(`/api/licenses/integrations/${activeProvider}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(m365Config),
      });
      const data = await res.json();
      setTestResult({
        success: Boolean(data.success),
        message: data.message || (data.success ? 'Kết nối thành công!' : 'Kết nối thất bại'),
      });
    } catch (err: any) {
      setTestResult({ success: false, message: err?.message || 'Không thể kiểm tra kết nối' });
    } finally {
      setTestingConnection(false);
    }
  };

  // 3. Chạy đồng bộ & Đối soát
  const handleSyncAndReconcile = async () => {
    try {
      setSyncing(true);
      setTestResult(null);
      const res = await fetch(`/api/licenses/integrations/${activeProvider}/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(m365Config),
      });
      const data = await res.json();
      if (res.ok) {
        setReport(data);
      } else {
        setTestResult({ success: false, message: data.error || 'Lỗi khi đồng bộ dữ liệu' });
      }
    } catch (err: any) {
      setTestResult({ success: false, message: err?.message || 'Không thể đồng bộ' });
    } finally {
      setSyncing(false);
    }
  };

  // Tự động khớp công ty & phân bổ vào các đợt theo FIFO
  const handleAutoAssign = async (dryRun: boolean = false) => {
    try {
      setAssigningFifo(true);
      setAutoAssignResult(null);
      const res = await fetch(`/api/licenses/integrations/${activeProvider}/auto-assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dryRun, autoReclaim: true }),
      });
      const data = await res.json();
      if (res.ok) {
        setAutoAssignResult(data);
        // Tự động chạy lại sync để cập nhật lại số lượng đối soát thời gian thực
        handleSyncAndReconcile();
      } else {
        alert(data.error || 'Lỗi khi tự động phân bổ.');
      }
    } catch (err: any) {
      alert(err?.message || 'Không thể thực hiện phân bổ.');
    } finally {
      setAssigningFifo(false);
    }
  };

  // 4. Xuất Excel Báo cáo Đối Soát
  const handleExportReconciliationExcel = async () => {
    if (!report) return;
    try {
      const wb = new ExcelJS.Workbook();
      wb.creator = 'Simply IT Cloud Integration Hub';

      // Sheet 1: Đối soát SKU
      const ws1 = wb.addWorksheet('Đối Soát Gói Cloud');
      ws1.columns = [
        { header: 'STT', key: 'stt', width: 6 },
        { header: 'Tên Gói Cloud', key: 'name', width: 32 },
        { header: 'Mã SKU', key: 'sku', width: 26 },
        { header: 'Tổng Mua Trên Cloud', key: 'total', width: 22 },
        { header: 'Đã Gán Trên Cloud', key: 'consumed', width: 20 },
        { header: 'Còn Trống Trên Cloud', key: 'available', width: 22 },
        { header: 'Ghi Nhận Trong Simply IT', key: 'local', width: 25 },
        { header: 'Chênh Lệch', key: 'diff', width: 15 },
        { header: 'Đơn Giá Ước Tính/Tháng', key: 'price', width: 22 },
      ];
      ws1.getRow(1).font = { bold: true };

      report.skus.forEach((s, idx) => {
        const matchDisc = report.discrepancies.find((d) => d.skuName === s.displayName);
        ws1.addRow({
          stt: idx + 1,
          name: s.displayName,
          sku: s.skuPartNumber,
          total: s.totalPrepaid,
          consumed: s.consumed,
          available: s.available,
          local: matchDisc?.localConsumed || 0,
          diff: matchDisc?.diff || 0,
          price: s.unitPriceEstimate || 0,
        });
      });

      // Sheet 2: Danh sách tài khoản lãng phí
      const ws2 = wb.addWorksheet('Tài Khoản Lãng Phí');
      ws2.columns = [
        { header: 'STT', key: 'stt', width: 6 },
        { header: 'Họ Và Tên', key: 'name', width: 25 },
        { header: 'Email', key: 'email', width: 28 },
        { header: 'Phòng Ban', key: 'dept', width: 20 },
        { header: 'Gói Đang Gán', key: 'sku', width: 32 },
        { header: 'Trạng Thái Tài Khoản', key: 'status', width: 24 },
        { header: 'Số Ngày Không Đăng Nhập', key: 'inactive', width: 26 },
        { header: 'Thời Điểm Online Cuối', key: 'lastSign', width: 24 },
        { header: 'Đề Xuất Hành Động', key: 'action', width: 30 },
      ];
      ws2.getRow(1).font = { bold: true };

      report.dormantUsers.forEach((u, idx) => {
        ws2.addRow({
          stt: idx + 1,
          name: u.displayName,
          email: u.email,
          dept: u.department || '—',
          sku: u.assignedSkuNames.join(', '),
          status: u.accountEnabled ? 'Đang bật' : 'ĐÃ BỊ KHÓA (Disabled)',
          inactive: `${u.daysInactive} ngày`,
          lastSign: u.lastSignInDate ? new Date(u.lastSignInDate).toLocaleString('vi-VN') : 'Chưa có log',
          action: !u.accountEnabled ? 'THU HỒI NGAY (Đã nghỉ việc)' : 'Xem xét thu hồi (>45 ngày)',
        });
      });

      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Bao_Cao_Doi_Soat_${report.provider.toUpperCase()}_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert('Không thể xuất file Excel đối soát.');
    }
  };

  // Copy toàn bộ email tài khoản lãng phí để gửi cho IT Support thu hồi
  const handleCopyDormantEmails = () => {
    if (!report?.dormantUsers || report.dormantUsers.length === 0) return;
    const emails = report.dormantUsers.map((u) => u.email).filter(Boolean).join('\n');
    navigator.clipboard.writeText(emails);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-4xl w-full flex flex-col max-h-[92vh] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-base text-slate-900 dark:text-white flex items-center gap-2">
                <span>{isEn ? 'Cloud License Integration Hub' : 'Cổng Tích Hợp & Đồng Bộ Bản Quyền Đám Mây'}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-extrabold uppercase">
                  v2.0
                </span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {isEn
                  ? 'Connect directly via Cloud APIs to reconcile seats and reclaim dormant licenses'
                  : 'Kết nối trực tiếp qua API đám mây để đối soát số lượng và thu hồi license lãng phí'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Provider Tabs */}
        <div className="px-6 pt-3 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2 bg-slate-50/30 dark:bg-slate-800/20 shrink-0">
          <button
            type="button"
            onClick={() => {
              setActiveProvider('m365');
              setTestResult(null);
            }}
            className={`px-4 py-2.5 rounded-t-2xl text-xs font-black transition-all flex items-center gap-2 border-b-2 cursor-pointer ${
              activeProvider === 'm365'
                ? 'border-blue-600 text-blue-600 bg-white dark:bg-slate-900 shadow-2xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span className="text-sm">🟦</span>
            <span>Microsoft 365 (Graph API)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveProvider('google');
              setTestResult(null);
            }}
            className={`px-4 py-2.5 rounded-t-2xl text-xs font-black transition-all flex items-center gap-2 border-b-2 cursor-pointer ${
              activeProvider === 'google'
                ? 'border-blue-600 text-blue-600 bg-white dark:bg-slate-900 shadow-2xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span className="text-sm">🟥</span>
            <span>Google Workspace</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveProvider('adobe');
              setTestResult(null);
            }}
            className={`px-4 py-2.5 rounded-t-2xl text-xs font-black transition-all flex items-center gap-2 border-b-2 cursor-pointer ${
              activeProvider === 'adobe'
                ? 'border-blue-600 text-blue-600 bg-white dark:bg-slate-900 shadow-2xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span className="text-sm">🟪</span>
            <span>Adobe Creative Cloud</span>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Form Cấu Hình Provider */}
          {activeProvider === 'm365' && (
            <div className="bg-slate-50/70 dark:bg-slate-800/40 p-5 rounded-3xl border border-slate-200 dark:border-slate-700 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Plug className="w-3.5 h-3.5 text-blue-600" />
                    <span>Cấu hình kết nối Microsoft Graph API:</span>
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Tạo App Registration trong Microsoft Entra ID (Azure AD) với quyền <code>Directory.Read.All</code> và <code>Organization.Read.All</code>
                  </p>
                </div>

                <label className="inline-flex items-center gap-2 cursor-pointer bg-white dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
                  <input
                    type="checkbox"
                    checked={m365Config.isDemoMode}
                    onChange={(e) => setM365Config({ ...m365Config, isDemoMode: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                  />
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Chế độ Thử nghiệm (Simulation Mode)
                  </span>
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                    Tenant ID (Directory ID):
                  </label>
                  <input
                    type="text"
                    placeholder="VD: 8a7c1234-xxxx-xxxx..."
                    value={m365Config.tenantId}
                    onChange={(e) => setM365Config({ ...m365Config, tenantId: e.target.value })}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                    Client ID (Application ID):
                  </label>
                  <input
                    type="text"
                    placeholder="VD: 5f9e4321-xxxx-xxxx..."
                    value={m365Config.clientId}
                    onChange={(e) => setM365Config({ ...m365Config, clientId: e.target.value })}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                    Client Secret:
                  </label>
                  <input
                    type="password"
                    placeholder={m365Config.hasSecret ? '••••••••••••••••' : 'Nhập client secret...'}
                    value={m365Config.clientSecret}
                    onChange={(e) => setM365Config({ ...m365Config, clientSecret: e.target.value })}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Status banner nếu có */}
              {testResult && (
                <div
                  className={`p-3 rounded-2xl text-xs font-bold flex items-center gap-2 animate-in fade-in ${
                    testResult.success
                      ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200'
                      : 'bg-rose-50 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200'
                  }`}
                >
                  {testResult.success ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
                  <span>{testResult.message}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSaveConfig}
                    disabled={savingConfig}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{savingConfig ? 'Đang lưu...' : 'Lưu Cấu Hình'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleTestConnection}
                    disabled={testingConnection}
                    className="px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Plug className="w-3.5 h-3.5" />
                    <span>{testingConnection ? 'Đang kiểm tra...' : 'Kiểm Tra Kết Nối'}</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleSyncAndReconcile}
                  disabled={syncing}
                  className="px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 flex items-center gap-2 cursor-pointer disabled:opacity-50 hover:scale-102 active:scale-98 transition-all"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
                  <span>{syncing ? 'Đang Kéo Dữ Liệu & Đối Soát...' : '⚡ Đồng Bộ & Đối Soát Ngay'}</span>
                </button>
              </div>
            </div>
          )}

          {activeProvider === 'google' && (
            <div className="bg-slate-50/70 dark:bg-slate-800/40 p-5 rounded-3xl border border-slate-200 dark:border-slate-700 space-y-4">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Plug className="w-3.5 h-3.5 text-rose-600" />
                <span>Cấu hình Google Workspace Admin SDK:</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Service Account Email:</label>
                  <input
                    type="text"
                    placeholder="simply-itam@project.iam.gserviceaccount.com"
                    value={googleConfig.serviceAccountEmail}
                    onChange={(e) => setGoogleConfig({ ...googleConfig, serviceAccountEmail: e.target.value })}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 rounded-xl text-xs outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Admin Email (Ủy quyền):</label>
                  <input
                    type="text"
                    placeholder="admin@congty.com"
                    value={googleConfig.adminEmail}
                    onChange={(e) => setGoogleConfig({ ...googleConfig, adminEmail: e.target.value })}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 rounded-xl text-xs outline-none"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={handleSyncAndReconcile}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Đồng Bộ Thử Nghiệm Google Workspace</span>
              </button>
            </div>
          )}

          {activeProvider === 'adobe' && (
            <div className="bg-slate-50/70 dark:bg-slate-800/40 p-5 rounded-3xl border border-slate-200 dark:border-slate-700 space-y-4">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Plug className="w-3.5 h-3.5 text-purple-600" />
                <span>Cấu hình Adobe Admin Console API:</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Client ID (API Key):</label>
                  <input
                    type="text"
                    placeholder="Nhập Adobe Client ID..."
                    value={adobeConfig.clientId}
                    onChange={(e) => setAdobeConfig({ ...adobeConfig, clientId: e.target.value })}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 rounded-xl text-xs outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Organization ID:</label>
                  <input
                    type="text"
                    placeholder="xxxx@AdobeOrg"
                    value={adobeConfig.orgId}
                    onChange={(e) => setAdobeConfig({ ...adobeConfig, orgId: e.target.value })}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 rounded-xl text-xs outline-none"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={handleSyncAndReconcile}
                className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Đồng Bộ Thử Nghiệm Adobe Creative Cloud</span>
              </button>
            </div>
          )}

          {/* BÁO CÁO ĐỐI SOÁT (RECONCILIATION DASHBOARD) */}
          {report && (
            <div className="space-y-5 animate-in fade-in duration-200 pt-2 border-t border-slate-100 dark:border-slate-800">
              {/* Report Header Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-2xl">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black uppercase tracking-wider text-indigo-900 dark:text-indigo-200">
                      Báo Cáo Đối Soát: {report.providerName}
                    </span>
                    {report.isDemoMode && (
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-200 font-extrabold">
                        MÔ PHỎNG (DEMO)
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-indigo-700 dark:text-indigo-300 mt-0.5">
                    Thời điểm đồng bộ: {new Date(report.syncedAt).toLocaleString('vi-VN')}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleExportReconciliationExcel}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>Xuất Excel Báo Cáo</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAutoAssign(false)}
                    disabled={assigningFifo}
                    className="px-3.5 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md shadow-purple-500/20 disabled:opacity-50 transition-all hover:scale-102 active:scale-98"
                    title="Tự động so khớp nhân sự với công ty trong Cài đặt và phân bổ vào các đợt mua theo cơ chế FIFO (Hạn gần nhất lấp trước)"
                  >
                    <Zap className={`w-3.5 h-3.5 ${assigningFifo ? 'animate-spin' : ''}`} />
                    <span>{assigningFifo ? 'Đang Phân Bổ FIFO...' : '⚡ Khớp Công Ty & Phân Bổ Đợt (FIFO)'}</span>
                  </button>
                </div>
              </div>

              {/* Thông báo kết quả tự động phân bổ nếu vừa chạy */}
              {autoAssignResult && (
                <div className="p-4 bg-emerald-50/90 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700 rounded-2xl text-xs space-y-2 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>{autoAssignResult.message}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setAutoAssignResult(null)}
                      className="text-emerald-600 hover:text-emerald-800 text-[11px] font-bold cursor-pointer"
                    >
                      ✕ Đóng
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 font-semibold text-[11px]">
                    <div className="p-2 bg-white/70 dark:bg-slate-900/70 rounded-xl border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300">
                      🏢 Đúng công ty nhân sự: <strong>{autoAssignResult.stats?.selfAssignedCount || 0}</strong> ghế
                    </div>
                    <div className="p-2 bg-white/70 dark:bg-slate-900/70 rounded-xl border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300">
                      🔄 Mượn chéo (khi cty hết quota): <strong>{autoAssignResult.stats?.crossAssignedCount || 0}</strong> ghế
                    </div>
                    <div className="p-2 bg-white/70 dark:bg-slate-900/70 rounded-xl border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300">
                      ♻️ Giải phóng (nhân sự nghỉ việc): <strong>{autoAssignResult.stats?.reclaimedCount || 0}</strong> ghế
                    </div>
                  </div>
                </div>
              )}

              {/* 4 Metric Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tổng Mua Trên Cloud</p>
                  <h4 className="text-lg font-black text-slate-900 dark:text-white mt-0.5">
                    {report.totalCloudSeats} <span className="text-xs font-normal text-slate-400">ghế</span>
                  </h4>
                  <p className="text-[10px] text-slate-500 mt-0.5">Đã gán: {report.totalCloudConsumed} ghế</p>
                </div>

                <div className="p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sổ Sách Simply IT</p>
                  <h4 className="text-lg font-black text-slate-900 dark:text-white mt-0.5">
                    {report.totalLocalConsumed} <span className="text-xs font-normal text-slate-400">ghế gán</span>
                  </h4>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Lệch:{' '}
                    <span className={report.totalCloudConsumed !== report.totalLocalConsumed ? 'text-amber-600 font-bold' : 'text-emerald-600 font-bold'}>
                      {report.totalCloudConsumed - report.totalLocalConsumed} ghế
                    </span>
                  </p>
                </div>

                <div className="p-3.5 bg-amber-50/70 dark:bg-amber-950/40 rounded-2xl border border-amber-200 dark:border-amber-800 shadow-2xs">
                  <p className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
                    Tài Khoản Lãng Phí (Dormant)
                  </p>
                  <h4 className="text-lg font-black text-amber-700 dark:text-amber-300 mt-0.5">
                    {report.dormantUsers.length} <span className="text-xs font-normal">tài khoản</span>
                  </h4>
                  <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5">Đã khóa hoặc {'>'}45 ngày không đăng nhập</p>
                </div>

                <div className="p-3.5 bg-emerald-50/70 dark:bg-emerald-950/40 rounded-2xl border border-emerald-200 dark:border-emerald-800 shadow-2xs">
                  <p className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                    Tiết Kiệm Tiềm Năng
                  </p>
                  <h4 className="text-lg font-black text-emerald-700 dark:text-emerald-300 mt-0.5">
                    {formatPrice(report.estimatedPotentialSavings, 'VND')}
                  </h4>
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5">Ước tính / tháng nếu thu hồi</p>
                </div>
              </div>

              {/* Bảng Danh Sách Tài Khoản Lãng Phí (Ngủ Đông) */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden">
                <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-amber-600" />
                    <h5 className="font-bold text-xs text-slate-900 dark:text-white uppercase tracking-wider">
                      Danh Sách Tài Khoản Đề Xuất Thu Hồi Ngay ({report.dormantUsers.length})
                    </h5>
                  </div>
                  {report.dormantUsers.length > 0 && (
                    <button
                      type="button"
                      onClick={handleCopyDormantEmails}
                      className="text-[11px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
                    >
                      {copiedEmail ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedEmail ? 'Đã copy email!' : 'Copy danh sách email'}</span>
                    </button>
                  )}
                </div>

                {report.dormantUsers.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400">
                    🎉 Không phát hiện tài khoản nào bị bỏ phí hoặc ngủ đông!
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-400 text-[10px] font-black uppercase border-b border-slate-100 dark:border-slate-800">
                        <tr>
                          <th className="py-2.5 px-4">Nhân Sự</th>
                          <th className="py-2.5 px-3">Gói Bản Quyền</th>
                          <th className="py-2.5 px-3 text-center">Trạng Thái Cloud</th>
                          <th className="py-2.5 px-3 text-center">Không Đăng Nhập</th>
                          <th className="py-2.5 px-4 text-right">Lý Do Đề Xuất Thu Hồi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                        {report.dormantUsers.map((u) => (
                          <tr key={u.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                            <td className="py-2.5 px-4">
                              <p className="font-bold text-slate-900 dark:text-white">{u.displayName}</p>
                              <p className="text-[10px] text-slate-400">{u.email} {u.department ? `• ${u.department}` : ''}</p>
                            </td>
                            <td className="py-2.5 px-3 font-semibold text-blue-600 dark:text-blue-400">
                              {u.assignedSkuNames.join(', ')}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              {u.accountEnabled ? (
                                <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 font-bold">
                                  Bật
                                </span>
                              ) : (
                                <span className="text-[10px] px-2 py-0.5 rounded-md bg-rose-100 dark:bg-rose-950/60 text-rose-700 font-bold">
                                  ĐÃ BỊ KHÓA
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-center text-amber-700 dark:text-amber-400 font-bold">
                              {u.daysInactive} ngày
                            </td>
                            <td className="py-2.5 px-4 text-right">
                              {!u.accountEnabled ? (
                                <span className="text-[10.5px] font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/50 px-2 py-0.5 rounded-lg">
                                  Nhân viên đã nghỉ việc (Tài khoản bị khóa)
                                </span>
                              ) : (
                                <span className="text-[10.5px] font-bold text-amber-700 bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded-lg">
                                  Không sử dụng {'>'}45 ngày
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Bảng Chi Tiết Từng Gói SKU Cloud */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden">
                <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                  <h5 className="font-bold text-xs text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                    <Layers className="w-4 h-4 text-indigo-600" />
                    <span>Chi Tiết Đối Soát Hạn Mức Từng Gói (SKUs)</span>
                  </h5>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-400 text-[10px] font-black uppercase border-b border-slate-100 dark:border-slate-800">
                      <tr>
                        <th className="py-2.5 px-4">Gói Bản Quyền Cloud</th>
                        <th className="py-2.5 px-3 text-center">Tổng Mua (Cloud)</th>
                        <th className="py-2.5 px-3 text-center">Đã Gán (Cloud)</th>
                        <th className="py-2.5 px-3 text-center">Còn Trống</th>
                        <th className="py-2.5 px-3 text-center">Ghi Nhận ITAM</th>
                        <th className="py-2.5 px-4 text-center">Trạng Thái Đối Soát</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                      {report.skus.map((s) => {
                        const disc = report.discrepancies.find((d) => d.skuName === s.displayName);
                        const isMatch = !disc || disc.diff === 0;

                        return (
                          <tr key={s.skuId} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                            <td className="py-2.5 px-4">
                              <p className="font-bold text-slate-900 dark:text-white">{s.displayName}</p>
                              <p className="text-[10px] text-slate-400 font-mono">{s.skuPartNumber}</p>
                            </td>
                            <td className="py-2.5 px-3 text-center font-bold text-slate-900 dark:text-white">
                              {s.totalPrepaid}
                            </td>
                            <td className="py-2.5 px-3 text-center font-bold text-blue-600">
                              {s.consumed}
                            </td>
                            <td className="py-2.5 px-3 text-center font-bold text-emerald-600">
                              {s.available}
                            </td>
                            <td className="py-2.5 px-3 text-center font-bold text-slate-700 dark:text-slate-300">
                              {disc?.localConsumed || 0}
                            </td>
                            <td className="py-2.5 px-4 text-center">
                              {isMatch ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-1 rounded-full">
                                  <CheckCircle2 className="w-3 h-3" />
                                  <span>Khớp 100%</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-50 dark:bg-amber-950/50 px-2.5 py-1 rounded-full">
                                  <AlertTriangle className="w-3 h-3" />
                                  <span>Lệch {disc?.diff > 0 ? `+${disc.diff}` : disc?.diff} ghế</span>
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Sticky Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/60 shrink-0">
          <div className="text-[11px] text-slate-400">
            <span>Hỗ trợ: Microsoft Graph API v1.0 • Chuẩn bảo mật OAuth2 Client Credentials</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
