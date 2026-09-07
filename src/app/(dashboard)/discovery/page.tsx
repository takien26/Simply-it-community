import { EnterpriseFeatureLock } from '@/components/common/EnterpriseFeatureLock';
'use client';

import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/lib/i18n/context';
import {
  Wifi,
  Search,
  RefreshCw,
  Plus,
  Server,
  Laptop,
  Printer,
  Camera,
  Network,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Layers,
  Copy,
  Download,
  Terminal,
  Cpu,
  HardDrive,
  ShieldCheck,
  Activity,
  ExternalLink,
  ChevronRight,
  Zap,
  Eye,
  X,
  Loader2,
  HelpCircle,
  FileCode,
  Radio,
  Boxes,
  ScanLine,
} from 'lucide-react';

interface DiscoveredDevice {
  ipAddress: string;
  macAddress: string;
  hostname: string;
  vendor: string;
  model?: string;
  os?: string;
  openPorts: number[];
  deviceType: string;
  responseTimeMs: number;
  status: string;
  lastSeen: string;
  matchedAsset?: {
    id: string;
    assetTag: string;
    name: string;
    status: string;
  } | null;
}

interface AgentReport {
  assetId: string;
  assetTag: string;
  name: string;
  brand: string;
  model: string;
  serialNumber: string;
  categoryName?: string;
  assignedTo?: string;
  department?: string;
  hostname: string;
  ipAddress?: string;
  macAddress?: string;
  cpu?: string;
  ram?: string;
  storage?: string;
  os?: string;
  lastScannedAt: string;
  hardwareChangeAlert?: string;
  installedSoftwareCount: number;
  installedSoftware: Array<{
    name: string;
    version?: string;
    publisher?: string;
    installDate?: string;
  }>;
}

export default function DiscoveryPage() {
  const { language } = useLanguage();
  const isEn = language === 'en';
  const [isEnterprise, setIsEnterprise] = useState<boolean | null>(null);
  const [activeModules, setActiveModules] = useState<string[]>([]);
  const isModActive = (mod: string) => Boolean(isEnterprise) && (activeModules.length === 0 || activeModules.includes(mod) || activeModules.includes('*'));

  const fetchLicense = () => {
    fetch('/api/license')
      .then((res) => res.json())
      .then((data) => {
        if (data && data.isEnterprise) {
          setIsEnterprise(true);
          setActiveModules(Array.isArray(data.modules) ? data.modules : []);
        } else {
          setIsEnterprise(false);
          setActiveModules([]);
        }
      })
      .catch(() => setIsEnterprise(false));
  };

  useEffect(() => {
    fetchLicense();
    const handleUpdate = () => fetchLicense();
    window.addEventListener('simply:license-updated', handleUpdate);
    return () => window.removeEventListener('simply:license-updated', handleUpdate);
  }, []);

  const [activeTab, setActiveTab] = useState<'SCAN' | 'AGENTS' | 'AI_ENRICH' | 'GUIDE'>('SCAN');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // TAB 1: Network Scanner State
  const [subnetInput, setSubnetInput] = useState('192.168.1.0/24');
  const [ipStart, setIpStart] = useState('192.168.1.1');
  const [ipEnd, setIpEnd] = useState('192.168.1.254');
  const [scanning, setScanning] = useState(false);
  const [devices, setDevices] = useState<DiscoveredDevice[]>([]);
  const [searchDevice, setSearchDevice] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [detectedInterface, setDetectedInterface] = useState<any>(null);
  const [availableInterfaces, setAvailableInterfaces] = useState<any[]>([]);

  // TAB 2: Agent Reports State
  const [agentReports, setAgentReports] = useState<AgentReport[]>([]);
  const [loadingAgents, setLoadingAgents] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<AgentReport | null>(null);
  const [searchSoftware, setSearchSoftware] = useState('');

  // TAB 3: AI Spec Enrichment State
  const [aiModelInput, setAiModelInput] = useState('');
  const [aiBrandInput, setAiBrandInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<any>(null);

  // Quick Modal: Add Discovered Device to Assets
  const [isAddAssetModalOpen, setIsAddAssetModalOpen] = useState(false);
  const [addingDevice, setAddingDevice] = useState<DiscoveredDevice | null>(null);
  const [addAssetForm, setAddAssetForm] = useState<any>({
    name: '',
    brand: '',
    model: '',
    serialNumber: '',
    deviceType: 'Laptop',
    ipAddress: '',
    macAddress: '',
    cpu: '',
    ram: '',
    storage: '',
  });

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const safeText = (val: any, fallback = ''): string => {
    if (val === null || val === undefined) return fallback;
    if (typeof val === 'string') return val.trim() || fallback;
    if (typeof val === 'number') return String(val);
    if (Array.isArray(val)) return val.filter(Boolean).map(String).join(', ') || fallback;
    if (typeof val === 'object') {
      if (typeof val.ip === 'string') return val.ip;
      if (typeof val.IPv4 === 'string') return val.IPv4;
      const values = Object.values(val).filter((v) => typeof v === 'string' || typeof v === 'number');
      return values.length > 0 ? values.join(', ') : fallback;
    }
    return String(val);
  };

  // Auto-detect local network configuration
  const loadNetworkConfig = async () => {
    try {
      const res = await fetch('/api/discovery/scan');
      const json = await res.json();
      if (json.success && json.data) {
        if (json.data.primaryInterface) {
          const iface = json.data.primaryInterface;
          setDetectedInterface(iface);
          setSubnetInput(iface.subnet);
          setIpStart(iface.ipStart);
          setIpEnd(iface.ipEnd);
        }
        if (json.data.interfaces) {
          setAvailableInterfaces(json.data.interfaces);
        }
      }
    } catch (err) {
      console.error('Failed to load network config:', err);
    }
  };

  // Load Agent Reports
  const loadAgentReports = async () => {
    setLoadingAgents(true);
    try {
      const res = await fetch('/api/discovery/agents');
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setAgentReports(json.data);
        if (json.data.length > 0) {
          setSelectedAgent((prev) => {
            if (prev) {
              return json.data.find((d: any) => d.assetId === prev.assetId) || json.data[0];
            }
            return json.data[0];
          });
        }
      }
    } catch (err) {
      console.error('Failed to load agents:', err);
    } finally {
      setLoadingAgents(false);
    }
  };

  useEffect(() => {
    loadAgentReports();
    loadNetworkConfig();
  }, []);

  // Run Network Discovery Scan
  const handleStartScan = async () => {
    setScanning(true);
    try {
      const res = await fetch('/api/discovery/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subnet: subnetInput,
          ipStart,
          ipEnd,
        }),
      });
      const json = await res.json();
      if (json.success && json.data) {
        setDevices(json.data.devices || []);
        showToast(json.message || 'Quét mạng hoàn tất!');
      } else {
        showToast(json.error || 'Lỗi quét mạng');
      }
    } catch (err: any) {
      showToast('Lỗi kết nối API quét mạng');
    } finally {
      setScanning(false);
    }
  };

  // Run AI Spec Enrichment
  const handleRunAiEnrich = async (modelQuery?: string, brandQuery?: string) => {
    const queryModel = modelQuery || aiModelInput;
    const queryBrand = brandQuery || aiBrandInput;

    if (!queryModel.trim()) {
      showToast('Vui lòng nhập Model thiết bị');
      return;
    }

    setAiLoading(true);
    try {
      const res = await fetch('/api/discovery/ai-enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: queryModel,
          brand: queryBrand,
        }),
      });
      const json = await res.json();
      if (json.success && json.data) {
        setAiResult(json.data);
        showToast(json.message || '✨ AI đã tìm thấy thông số kỹ thuật!');
      } else {
        showToast(json.error || 'AI không tìm thấy thông số cho model này');
      }
    } catch (err) {
      showToast('Lỗi kết nối AI Engine');
    } finally {
      setAiLoading(false);
    }
  };

  // Open Add to Assets modal with AI pre-fill
  const handleOpenAddToAsset = async (dev: DiscoveredDevice) => {
    setAddingDevice(dev);
    setAddAssetForm({
      name: dev.hostname ? `Máy tính ${dev.hostname}` : `Thiết bị ${dev.model || dev.vendor}`,
      brand: dev.vendor || '',
      model: dev.model || '',
      serialNumber: `SN-${dev.macAddress.replace(/:/g, '').slice(-8)}`,
      deviceType: dev.deviceType || 'Laptop',
      ipAddress: dev.ipAddress,
      macAddress: dev.macAddress,
      cpu: '',
      ram: '',
      storage: '',
    });

    setIsAddAssetModalOpen(true);

    // Auto enrich if model available
    if (dev.model) {
      try {
        const res = await fetch('/api/discovery/ai-enrich', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: dev.model, brand: dev.vendor }),
        });
        const json = await res.json();
        if (json.success && json.data) {
          setAddAssetForm((prev: any) => ({
            ...prev,
            cpu: json.data.cpu || prev.cpu,
            ram: json.data.ram || prev.ram,
            storage: json.data.storage || prev.storage,
            deviceType: json.data.categoryName || prev.deviceType,
          }));
        }
      } catch {}
    }
  };

  // Submit new Asset from Discovery
  const handleSaveDiscoveredAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/v1/auto-scan/collect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hostname: addAssetForm.name,
          serialNumber: addAssetForm.serialNumber,
          brand: addAssetForm.brand,
          model: addAssetForm.model,
          scannedAt: new Date().toISOString(),
          specs: {
            cpu: addAssetForm.cpu,
            ram: addAssetForm.ram,
            storage: addAssetForm.storage,
            ipAddress: addAssetForm.ipAddress,
            macAddress: addAssetForm.macAddress,
            autoEnrichedByAI: true,
          },
        }),
      });

      const json = await res.json();
      if (json.success) {
        showToast(json.message || 'Đã thêm thiết bị vào kho thành công!');
        setIsAddAssetModalOpen(false);
        if (devices.length > 0) {
          handleStartScan();
        }
        loadAgentReports();
      } else {
        showToast(json.error || 'Lỗi thêm tài sản');
      }
    } catch (err: any) {
      showToast('Lỗi lưu tài sản');
    }
  };

  // Copy powershell command
  const copyPowerShellCmd = () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
    const cmd = `powershell -ExecutionPolicy Bypass -Command "Invoke-RestMethod '${origin}/scripts/simply-it-collector.ps1' -OutFile '$env:TEMP\\collector.ps1'; & '$env:TEMP\\collector.ps1' -ServerUrl '${origin}'"`;
    navigator.clipboard.writeText(cmd);
    showToast('📋 Đã sao chép lệnh PowerShell vào Clipboard!');
  };

  // Filtered devices
  const filteredDevices = devices.filter((d) => {
    const matchSearch =
      !searchDevice ||
      d.ipAddress.includes(searchDevice) ||
      d.hostname.toLowerCase().includes(searchDevice.toLowerCase()) ||
      d.vendor.toLowerCase().includes(searchDevice.toLowerCase()) ||
      d.macAddress.toLowerCase().includes(searchDevice.toLowerCase());

    if (!matchSearch) return false;
    if (filterType === 'ALL') return true;
    if (filterType === 'NEW') return d.matchedAsset === null;
    if (filterType === 'MATCHED') return d.matchedAsset !== null;
    return d.deviceType === filterType;
  });

  return (
    <div className="space-y-4 pb-12">
      {/* Toast */}
      {toastMsg && (
        <div className="fixed top-20 right-6 z-50 p-4 bg-slate-900 text-white rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-3 animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-xs font-semibold">{toastMsg}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-600 to-blue-600 text-white flex items-center justify-center shadow-md">
            <ScanLine className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-black text-slate-900">
                {isEn ? 'Device Discovery & Network Scanner' : 'Scan Thiết Bị & Khám Phá Mạng'}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-[10px] font-bold flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Network & AI
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              {isEn ? 'Scan live IP subnets, collect workstation hardware/software inventories & AI spec lookups' : 'Quét dải mạng IP thực tế, thu thập cấu hình máy trạm & AI tra cứu thông số kỹ thuật chuẩn hãng'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={copyPowerShellCmd}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            title="Sao chép lệnh PowerShell thu thập 1-click"
          >
            <Terminal className="w-3.5 h-3.5 text-indigo-600" />
            <span>{isEn ? 'Copy Workstation Scan Script' : 'Copy Lệnh Scan Máy Trạm'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('SCAN')}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Search className="w-3.5 h-3.5" />
            <span>{isEn ? 'Scan Subnet Now' : 'Quét Dải Mạng Ngay'}</span>
          </button>
        </div>
      </div>

      {/* Quick Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">{isEn ? "Discovered Devices" : "Thiết bị quét thấy"}</span>
            <ScanLine className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl font-black text-slate-900">{devices.length}</span>
            <span className="text-xs text-indigo-600 font-bold">Online</span>
          </div>
          <span className="text-[10.5px] text-slate-400">{isEn ? "On current subnet" : "Trên dải mạng hiện tại"}</span>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">{isEn ? "New Devices (Pending)" : "Thiết bị mới (Chờ thêm)"}</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl font-black text-amber-600">
              {devices.filter((d) => d.matchedAsset === null).length}
            </span>
            <span className="text-xs text-amber-700 font-semibold">{isEn ? "Pending" : "Chờ thêm"}</span>
          </div>
          <span className="text-[10.5px] text-slate-400">{isEn ? "Not yet in asset inventory" : "Chưa có trong kho tài sản"}</span>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">{isEn ? "Audited Workstations" : "Máy trạm đã scan cấu hình"}</span>
            <Laptop className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl font-black text-emerald-600">{agentReports.length}</span>
            <span className="text-xs text-emerald-700 font-semibold">{isEn ? "PCs" : "Máy tính"}</span>
          </div>
          <span className="text-[10.5px] text-slate-400">{isEn ? "Hardware & software scanned" : "Đã scan phần mềm & cấu hình"}</span>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">{isEn ? "AI Spec Lookup" : "AI Tra Cứu Model"}</span>
            <Sparkles className="w-4 h-4 text-purple-600" />
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl font-black text-purple-600">{isEn ? "Ready" : "Sẵn Sàng"}</span>
            <span className="text-xs text-purple-700 font-bold">100%</span>
          </div>
          <span className="text-[10.5px] text-slate-400">{isEn ? "Automated spec enrichment" : "Tự động bổ sung thông số"}</span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1.5 border-b border-slate-200 bg-white px-3 py-1.5 rounded-2xl shadow-2xs overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('SCAN')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'SCAN'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Search className="w-3.5 h-3.5" />
          <span>{isEn ? '1. IP Network Scanner' : '1. Quét Dải Mạng IP'}</span>
          {devices.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-white/20 text-[10px] font-mono">
              {devices.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('AGENTS');
            loadAgentReports();
          }}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'AGENTS'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Laptop className="w-3.5 h-3.5" />
          <span>{isEn ? '2. Audited Workstations' : '2. Máy Trạm Đã Kiểm Kê'}</span>
          {agentReports.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-white/20 text-[10px] font-mono">
              {agentReports.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('AI_ENRICH')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'AI_ENRICH'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
          <span>3. Tra Cứu Thông Số Model</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('GUIDE')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'GUIDE'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Terminal className="w-3.5 h-3.5" />
          <span>4. Script PowerShell & Hướng Dẫn</span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: NETWORK SUBNET SCANNER */}
      {/* ======================================================== */}
      {activeTab === 'SCAN' && (
        <div className="space-y-4">
          {/* Scan Control Panel */}
          <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs space-y-3">
            {/* Real Network Adapter Bar */}
            {detectedInterface && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-indigo-50/70 border border-indigo-100 rounded-2xl px-3.5 py-2 text-xs">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                  <span className="font-semibold text-slate-700">Card mạng máy chủ:</span>
                  <span className="font-bold text-indigo-700 bg-white px-2 py-0.5 rounded-lg border border-indigo-200">
                    {detectedInterface.name} ({detectedInterface.ip})
                  </span>
                  <span className="text-slate-500 text-[11px]">Subnet thực tế: {detectedInterface.subnet}</span>
                </div>
                <div className="flex items-center gap-2">
                  {availableInterfaces.length > 1 && (
                    <select
                      onChange={(e) => {
                        const iface = availableInterfaces.find((i) => i.name === e.target.value);
                        if (iface) {
                          setDetectedInterface(iface);
                          setSubnetInput(iface.subnet);
                          setIpStart(iface.ipStart);
                          setIpEnd(iface.ipEnd);
                        }
                      }}
                      className="px-2 py-1 bg-white border border-indigo-200 rounded-lg text-[11px] font-semibold text-slate-700 outline-none"
                    >
                      {availableInterfaces.map((i, idx) => (
                        <option key={idx} value={i.name}>
                          {i.name} - {i.ip}
                        </option>
                      ))}
                    </select>
                  )}
                  <button
                    type="button"
                    onClick={loadNetworkConfig}
                    className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-indigo-200 rounded-lg text-[11px] font-bold text-indigo-600 transition-colors cursor-pointer"
                  >
                    🔄 Dò Lại Card Mạng
                  </button>
                </div>
              </div>
            )}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3 flex-wrap flex-1">
                <div className="w-48">
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Dải Mạng (Subnet):</label>
                  <input
                    type="text"
                    value={subnetInput}
                    onChange={(e) => setSubnetInput(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 outline-none"
                    placeholder="192.168.1.0/24"
                  />
                </div>

                <div className="w-36">
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">IP Bắt Đầu:</label>
                  <input
                    type="text"
                    value={ipStart}
                    onChange={(e) => setIpStart(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 outline-none"
                  />
                </div>

                <div className="w-36">
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">IP Kết Thúc:</label>
                  <input
                    type="text"
                    value={ipEnd}
                    onChange={(e) => setIpEnd(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 outline-none"
                  />
                </div>

                <div className="pt-4">
                  <button
                    type="button"
                    onClick={handleStartScan}
                    disabled={scanning}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-2 cursor-pointer"
                  >
                    {scanning ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Đang Quét Dải IP...</span>
                      </>
                    ) : (
                      <>
                        <Search className="w-4 h-4" />
                        <span>Bắt Đầu Quét Mạng</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Quick Filters */}
              <div className="flex items-center gap-1.5 self-end sm:self-center">
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none"
                >
                  <option value="ALL">Tất cả thiết bị</option>
                  <option value="NEW">🟡 Chỉ thiết bị mới (Chưa có trong kho)</option>
                  <option value="MATCHED">🟢 Đã có trong hệ thống</option>
                  <option value="LAPTOP">💻 Máy tính / Laptop</option>
                  <option value="SWITCH">🔌 Switch / Mạng</option>
                  <option value="PRINTER">🖨️ Máy in</option>
                  <option value="CAMERA">📷 Camera</option>
                  <option value="SERVER">🖥️ Máy chủ</option>
                </select>
              </div>
            </div>

            {/* Search within scanned */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Tìm kiếm kết quả quét theo IP, Hostname, MAC Address, Hãng sản xuất..."
                value={searchDevice}
                onChange={(e) => setSearchDevice(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none text-slate-800 placeholder:text-slate-400"
              />
            </div>
          </div>

          {/* Results Table */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-xs text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Radio className="w-4 h-4 text-indigo-600 animate-pulse" />
                <span>Danh Sách Thiết Bị Khám Phá ({filteredDevices.length})</span>
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 text-[11px]">
                  <tr>
                    <th className="p-3">Địa Chỉ IP & Hostname</th>
                    <th className="p-3">Hãng (OUI Vendor) & Model</th>
                    <th className="p-3">Địa Chỉ MAC</th>
                    <th className="p-3">Loại Thiết Bị</th>
                    <th className="p-3">Cổng Dịch Vụ Mở</th>
                    <th className="p-3">Trạng Thái Hệ Thống</th>
                    <th className="p-3 text-right">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {devices.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400">
                        <Wifi className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <p className="font-semibold text-xs text-slate-600">Chưa có kết quả quét nào</p>
                        <p className="text-[11px] text-slate-400">
                          Bấm nút <strong>"Bắt Đầu Quét Mạng"</strong> để tự động dò tìm toàn bộ máy tính, máy in, switch trong dải IP.
                        </p>
                      </td>
                    </tr>
                  ) : filteredDevices.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-6 text-center text-slate-400 text-xs">
                        Không tìm thấy thiết bị phù hợp với bộ lọc.
                      </td>
                    </tr>
                  ) : (
                    filteredDevices.map((dev, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                            <div>
                              <span className="font-mono font-bold text-indigo-600 block">{dev.ipAddress}</span>
                              <span className="font-semibold text-slate-800 text-[11px]">{dev.hostname}</span>
                            </div>
                          </div>
                        </td>

                        <td className="p-3">
                          <div className="font-bold text-slate-900">{dev.vendor}</div>
                          <div className="text-[11px] text-slate-500 truncate max-w-[200px]">
                            {dev.model || dev.os || 'Chưa rõ Model'}
                          </div>
                        </td>

                        <td className="p-3 font-mono text-[11px] text-slate-600">{dev.macAddress}</td>

                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10.5px] font-bold">
                            {dev.deviceType}
                          </span>
                        </td>

                        <td className="p-3">
                          <div className="flex items-center gap-1 flex-wrap max-w-[140px]">
                            {dev.openPorts.map((p) => (
                              <span key={p} className="px-1.5 py-0.2 rounded bg-slate-200 text-slate-700 text-[9.5px] font-mono">
                                :{p}
                              </span>
                            ))}
                          </div>
                        </td>

                        <td className="p-3">
                          {dev.matchedAsset ? (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10.5px] font-bold inline-flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>[{dev.matchedAsset.assetTag}] Đã Quản Lý</span>
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10.5px] font-bold inline-flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              <span>Thiết Bị Mới</span>
                            </span>
                          )}
                        </td>

                        <td className="p-3 text-right">
                          {dev.matchedAsset ? (
                            <a
                              href={`/assets?id=${dev.matchedAsset.id}`}
                              className="px-2.5 py-1 text-slate-600 hover:text-indigo-600 rounded-lg hover:bg-slate-100 text-xs font-semibold inline-flex items-center gap-1"
                            >
                              <span>Xem Tài Sản</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleOpenAddToAsset(dev)}
                              className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white rounded-xl font-bold text-xs transition-colors inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Sparkles className="w-3.5 h-3.5" />
                              <span>+ Thêm Với AI</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: AGENT AUDIT & INSTALLED SOFTWARE */}
      {/* ======================================================== */}
      {activeTab === 'AGENTS' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Machine List (5/12 cols) */}
          <div className="lg:col-span-5 bg-white p-4 rounded-3xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-xs text-slate-900 uppercase tracking-wider">
                Máy Trạm Đã Thu Thập ({agentReports.length})
              </h3>
              <button
                type="button"
                onClick={loadAgentReports}
                disabled={loadingAgents}
                className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-100"
                title={isEn ? 'Refresh' : 'Làm mới'}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingAgents ? 'animate-spin' : ''}`} />
              </button>
            </div>

            <div className="space-y-2 max-h-[560px] overflow-y-auto pr-1">
              {agentReports.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  Chưa có máy trạm nào gửi báo cáo Agent.
                </div>
              ) : (
                agentReports.map((item) => (
                  <div
                    key={item.assetId}
                    onClick={() => setSelectedAgent(item)}
                    className={`p-3 rounded-2xl border text-xs cursor-pointer transition-all ${
                      selectedAgent?.assetId === item.assetId
                        ? 'border-indigo-500 bg-indigo-50/70 ring-2 ring-indigo-400/40'
                        : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold shrink-0 mt-0.5">
                          <Laptop className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-slate-900">{item.name}</span>
                            <span className="px-1.5 py-0.2 rounded bg-slate-200 text-slate-700 text-[10px] font-mono">
                              {item.assetTag}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            {safeText(item.brand)} {safeText(item.model)} · {safeText(item.os, 'Windows')}
                          </p>
                        </div>
                      </div>

                      <span className="px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-700 text-[10.5px] font-bold shrink-0">
                        {item.installedSoftwareCount} Phần mềm
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5 mt-2 pt-2 border-t border-slate-100 text-[10.5px] text-slate-600">
                      <div>👤 User: <strong>{safeText(item.assignedTo, 'Chưa gán')}</strong></div>
                      <div>🌐 IP: <strong className="font-mono text-indigo-600">{safeText(item.ipAddress, 'LAN')}</strong></div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Machine Details & Installed Software (7/12 cols) */}
          <div className="lg:col-span-7 bg-white p-4 rounded-3xl border border-slate-200 shadow-xs space-y-4">
            {selectedAgent ? (
              <>
                <div className="flex items-start justify-between pb-3 border-b border-slate-100">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-black text-sm text-slate-900">{selectedAgent.name}</h3>
                      <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 text-xs font-mono font-bold">
                        {selectedAgent.assetTag}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Serial BIOS: <strong>{safeText(selectedAgent.serialNumber, 'N/A')}</strong> · Quét lúc: {selectedAgent.lastScannedAt ? new Date(selectedAgent.lastScannedAt).toLocaleString('vi-VN') : 'Mới cập nhật'}
                    </p>
                  </div>

                  <a
                    href={`/assets?id=${selectedAgent.assetId}`}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-1"
                  >
                    <span>Mở Hồ Sơ Máy</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>

                {/* Hardware Specs Grid */}
                <div className="grid grid-cols-3 gap-2 text-xs bg-slate-50 p-3 rounded-2xl border border-slate-100">
                  <div>
                    <span className="text-slate-400 text-[10.5px] block font-semibold">Bộ Xử Lý (CPU)</span>
                    <span className="font-bold text-slate-800 line-clamp-1">{safeText(selectedAgent.cpu, 'Intel / AMD')}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10.5px] block font-semibold">Bộ Nhớ (RAM)</span>
                    <span className="font-bold text-slate-800">{safeText(selectedAgent.ram, 'Chưa rõ')}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10.5px] block font-semibold">Ổ Cứng (Storage)</span>
                    <span className="font-bold text-slate-800 line-clamp-1">{safeText(selectedAgent.storage, 'SSD NVMe')}</span>
                  </div>
                </div>

                {/* Installed Software List */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="font-bold text-xs text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Danh Sách Ứng Dụng & Phần Mềm ({selectedAgent.installedSoftware.length})</span>
                    </h4>

                    <input
                      type="text"
                      placeholder="Lọc phần mềm..."
                      value={searchSoftware}
                      onChange={(e) => setSearchSoftware(e.target.value)}
                      className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none w-44"
                    />
                  </div>

                  <div className="max-h-[380px] overflow-y-auto border border-slate-100 rounded-2xl divide-y divide-slate-100">
                    {selectedAgent.installedSoftware.length === 0 ? (
                      <div className="p-6 text-center text-slate-400 text-xs">
                        Máy trạm này chưa quét danh sách phần mềm hoặc chạy agent phiên bản cũ.
                      </div>
                    ) : (
                      selectedAgent.installedSoftware
                        .filter((s) => !searchSoftware || s.name.toLowerCase().includes(searchSoftware.toLowerCase()))
                        .map((sw, sIdx) => {
                          const isCommercial =
                            sw.name.toLowerCase().includes('office') ||
                            sw.name.toLowerCase().includes('photoshop') ||
                            sw.name.toLowerCase().includes('autocad') ||
                            sw.name.toLowerCase().includes('adobe');

                          return (
                            <div key={sIdx} className="p-2.5 hover:bg-slate-50 flex items-center justify-between gap-2 text-xs">
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold text-slate-900">{sw.name}</span>
                                  {isCommercial && (
                                    <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 text-[9.5px] font-bold">
                                      Cần License
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10.5px] text-slate-500">
                                  {sw.publisher || 'Nhà phát triển không xác định'} {sw.version ? `· Phiên bản: ${sw.version}` : ''}
                                </div>
                              </div>

                              {sw.installDate && (
                                <span className="text-[10px] text-slate-400 font-mono shrink-0">
                                  {sw.installDate}
                                </span>
                              )}
                            </div>
                          );
                        })
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="p-12 text-center text-slate-400 space-y-2">
                <Laptop className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="font-bold text-xs text-slate-700">Chọn một máy trạm bên trái để xem chi tiết</p>
                <p className="text-[11px] text-slate-400">
                  Xem cấu hình CPU, RAM, Ổ cứng và toàn bộ danh sách phần mềm đã cài đặt trên máy.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: AI SPEC ENRICHMENT TOOL */}
      {/* ======================================================== */}
      {activeTab === 'AI_ENRICH' && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4 max-w-3xl mx-auto">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
            <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black text-slate-900">
                AI Tra Cứu Thông Số Phần Cứng Theo Model
              </h2>
              <p className="text-xs text-slate-500">
                Nhập tên model máy tính, máy chủ, switch hoặc máy in — AI sẽ tự động điền đầy đủ cấu hình kỹ thuật chuẩn hãng.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">Model Thiết Bị (*):</label>
              <input
                type="text"
                placeholder="VD: Dell Latitude 5540, MacBook Pro 14 M3, Cisco Catalyst 9200L, ThinkPad T14..."
                value={aiModelInput}
                onChange={(e) => setAiModelInput(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Thương Hiệu (Tùy chọn):</label>
              <input
                type="text"
                placeholder="VD: Dell, Apple, Cisco, Lenovo..."
                value={aiBrandInput}
                onChange={(e) => setAiBrandInput(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] text-slate-500 font-medium">Mẫu gợi ý:</span>
              {['Dell Latitude 5540', 'MacBook Pro 14 M3', 'Cisco Catalyst 9200L', 'Canon LBP226dw'].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    setAiModelInput(m);
                    handleRunAiEnrich(m);
                  }}
                  className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10.5px] font-semibold transition-colors"
                >
                  {m}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => handleRunAiEnrich()}
              disabled={aiLoading}
              className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
            >
              {aiLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>AI Đang Tra Cứu...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Tra Cứu Thông Số</span>
                </>
              )}
            </button>
          </div>

          {/* AI Result Card */}
          {aiResult && (
            <div className="mt-4 p-4 rounded-2xl bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-200 space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md bg-purple-600 text-white font-bold text-xs">
                    {aiResult.brand || 'Hardware'}
                  </span>
                  <h3 className="font-extrabold text-sm text-slate-900">{aiResult.model}</h3>
                </div>
                <span className="text-[11px] text-purple-700 font-bold bg-white px-2 py-0.5 rounded-md border border-purple-200">
                  {aiResult.categoryName || 'Tài sản'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                {aiResult.cpu && (
                  <div className="p-2.5 rounded-xl bg-white border border-purple-100">
                    <span className="text-[10.5px] text-slate-400 font-semibold block">Bộ Xử Lý (CPU)</span>
                    <span className="font-bold text-slate-800">{aiResult.cpu}</span>
                  </div>
                )}
                {aiResult.ram && (
                  <div className="p-2.5 rounded-xl bg-white border border-purple-100">
                    <span className="text-[10.5px] text-slate-400 font-semibold block">Bộ Nhớ RAM</span>
                    <span className="font-bold text-slate-800">{aiResult.ram}</span>
                  </div>
                )}
                {aiResult.storage && (
                  <div className="p-2.5 rounded-xl bg-white border border-purple-100">
                    <span className="text-[10.5px] text-slate-400 font-semibold block">Dung Lượng Ổ Cứng</span>
                    <span className="font-bold text-slate-800">{aiResult.storage}</span>
                  </div>
                )}
                {aiResult.screen && (
                  <div className="p-2.5 rounded-xl bg-white border border-purple-100">
                    <span className="text-[10.5px] text-slate-400 font-semibold block">Màn Hình</span>
                    <span className="font-bold text-slate-800">{aiResult.screen}</span>
                  </div>
                )}
                {aiResult.powerWatts && (
                  <div className="p-2.5 rounded-xl bg-white border border-purple-100">
                    <span className="text-[10.5px] text-slate-400 font-semibold block">Công Suất Tiêu Thụ</span>
                    <span className="font-bold text-amber-600">{aiResult.powerWatts} Watts</span>
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setAddingDevice({
                      ipAddress: '',
                      macAddress: '',
                      hostname: aiResult.model,
                      vendor: aiResult.brand,
                      model: aiResult.model,
                      openPorts: [],
                      deviceType: aiResult.categoryName || 'Laptop',
                      responseTimeMs: 0,
                      status: 'AVAILABLE',
                      lastSeen: new Date().toISOString(),
                    });
                    setAddAssetForm({
                      name: `${aiResult.brand} ${aiResult.model}`,
                      brand: aiResult.brand,
                      model: aiResult.model,
                      serialNumber: `SN-${Math.floor(10000000 + Math.random() * 90000000)}`,
                      deviceType: aiResult.categoryName || 'Laptop',
                      ipAddress: '',
                      macAddress: '',
                      cpu: aiResult.cpu || '',
                      ram: aiResult.ram || '',
                      storage: aiResult.storage || '',
                    });
                    setIsAddAssetModalOpen(true);
                  }}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tạo Tài Sản Mới Với Cấu Hình Này</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 4: SCRIPT & DEPLOYMENT GUIDE */}
      {/* ======================================================== */}
      {activeTab === 'GUIDE' && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4 max-w-3xl mx-auto text-xs">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
            <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black text-slate-900">
                Hướng Dẫn Triển Khai Agent Thu Thập Tự Động
              </h2>
              <p className="text-xs text-slate-500">
                Script PowerShell siêu nhẹ thu thập Serial bo mạch chủ, CPU, RAM, Ổ cứng và toàn bộ danh sách phần mềm đã cài đặt.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="font-bold text-slate-800 text-xs">Cách 1: Chạy trực tiếp 1 dòng lệnh PowerShell trên máy tính người dùng</h3>
            <div className="p-3 bg-slate-900 text-emerald-400 font-mono text-[11px] rounded-2xl flex items-center justify-between gap-2 overflow-x-auto">
              <code>
                powershell -ExecutionPolicy Bypass -Command &quot;Invoke-RestMethod &apos;{typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}/scripts/simply-it-collector.ps1&apos; -OutFile &apos;$env:TEMP\collector.ps1&apos;; &amp; &apos;$env:TEMP\collector.ps1&apos; -ServerUrl &apos;{typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}&apos;&quot;
              </code>
              <button
                type="button"
                onClick={copyPowerShellCmd}
                className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg font-bold text-xs shrink-0 hover:bg-emerald-500 cursor-pointer"
              >
                Copy
              </button>
            </div>
          </div>

          <div className="space-y-2 pt-3 border-t border-slate-100">
            <h3 className="font-bold text-slate-800 text-xs">Cách 2: Triển khai tự động hàng loạt qua Active Directory Group Policy (GPO)</h3>
            <ol className="list-decimal list-inside space-y-1 text-slate-600">
              <li>Tải file script <a href="/scripts/simply-it-collector.ps1" className="text-indigo-600 font-bold underline" download>simply-it-collector.ps1</a> về máy chủ Domain Controller.</li>
              <li>Mở <strong>Group Policy Management Console (gpmc.msc)</strong>.</li>
              <li>Tạo một GPO mới gán vào OU chứa các máy tính người dùng: <code>Computer Configuration &gt; Policies &gt; Windows Settings &gt; Scripts (Startup/Shutdown)</code>.</li>
              <li>Thêm script khởi động PowerShell với tham số <code>-ServerUrl &quot;{typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}&quot;</code>.</li>
              <li>Mỗi khi người dùng bật máy tính, thông số phần cứng và danh sách phần mềm sẽ tự động cập nhật về hệ thống Simply IT.</li>
            </ol>
          </div>
        </div>
      )}

      {/* ==================== MODAL: ADD DISCOVERED DEVICE TO ASSETS ==================== */}
      {isAddAssetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Thêm Thiết Bị Vào Kho Tài Sản</h3>
                  <span className="text-[11px] text-slate-500">
                    AI đã tự động trích xuất thông số kỹ thuật từ Model và địa chỉ mạng
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddAssetModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveDiscoveredAsset} className="space-y-3.5">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Tên Thiết Bị (*):</label>
                <input
                  type="text"
                  required
                  value={addAssetForm.name}
                  onChange={(e) => setAddAssetForm({ ...addAssetForm, name: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-900 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Thương Hiệu:</label>
                  <input
                    type="text"
                    value={addAssetForm.brand}
                    onChange={(e) => setAddAssetForm({ ...addAssetForm, brand: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Model:</label>
                  <input
                    type="text"
                    value={addAssetForm.model}
                    onChange={(e) => setAddAssetForm({ ...addAssetForm, model: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Serial Number (*):</label>
                  <input
                    type="text"
                    required
                    value={addAssetForm.serialNumber}
                    onChange={(e) => setAddAssetForm({ ...addAssetForm, serialNumber: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-indigo-600 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Loại Thiết Bị:</label>
                  <select
                    value={addAssetForm.deviceType}
                    onChange={(e) => setAddAssetForm({ ...addAssetForm, deviceType: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold outline-none"
                  >
                    <option value="Laptop">Laptop</option>
                    <option value="Máy tính">Máy tính để bàn (PC)</option>
                    <option value="Server">Máy chủ (Server)</option>
                    <option value="Switch">Switch / Thiết bị mạng</option>
                    <option value="Máy in">Máy in</option>
                    <option value="Camera">Camera</option>
                    <option value="Thiết bị khác">Khác</option>
                  </select>
                </div>
              </div>

              {/* Specs by AI */}
              <div className="space-y-2.5 p-3 rounded-2xl bg-slate-50 border border-slate-200">
                <span className="font-bold text-indigo-700 text-[11px] block uppercase tracking-wider flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Thông Số Kỹ Thuật (Điền Tự Động Bởi AI)</span>
                </span>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-0.5">CPU:</label>
                  <input
                    type="text"
                    value={addAssetForm.cpu}
                    onChange={(e) => setAddAssetForm({ ...addAssetForm, cpu: e.target.value })}
                    className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-medium outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-0.5">RAM:</label>
                    <input
                      type="text"
                      value={addAssetForm.ram}
                      onChange={(e) => setAddAssetForm({ ...addAssetForm, ram: e.target.value })}
                      className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-medium outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-0.5">Ổ Cứng (Storage):</label>
                    <input
                      type="text"
                      value={addAssetForm.storage}
                      onChange={(e) => setAddAssetForm({ ...addAssetForm, storage: e.target.value })}
                      className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-medium outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[10.5px] text-slate-500 pt-1">
                  <div>IP: <strong className="font-mono">{addAssetForm.ipAddress || 'None'}</strong></div>
                  <div>MAC: <strong className="font-mono">{addAssetForm.macAddress || 'None'}</strong></div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddAssetModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl font-semibold text-slate-700 hover:bg-slate-50"
                >{isEn ? 'Cancel' : 'Hủy'}</button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Xác Nhận Lưu Vào Kho</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
