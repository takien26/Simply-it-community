'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import {
  QrCode,
  Search,
  CheckCircle2,
  AlertTriangle,
  X,
  Laptop,
  User,
  MapPin,
  Calendar,
  Building,
  RotateCcw,
  Save,
  Camera,
  Check,
  Tag,
  ShieldCheck,
  History,
  Plus,
  ArrowRight,
  Filter,
  RefreshCw,
  Clock,
  Sparkles,
  Layers,
  ChevronRight,
  SlidersHorizontal,
  FileText,
  Trash2,
  Eye,
  CameraOff,
  Video,
  Maximize2,
  CheckCircle,
  AlertOctagon,
  Download,
  Share2,
  HelpCircle,
  ChevronDown,
  Image as ImageIcon,
  Smartphone,
  Info,
  Lock,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

interface AuditCampaignItem {
  id: string;
  assetTag: string;
  name: string;
  brand?: string;
  model?: string;
  serialNumber?: string;
  companyName?: string;
  categoryName?: string;
  categoryIcon?: string;
  locationId?: string;
  locationName?: string;
  systemUserId?: string;
  systemUserName?: string;
  systemDepartment?: string;
  systemCondition?: string;
  systemStatus?: string;
  isAudited: boolean;
  auditStatus: 'PENDING' | 'MATCHED' | 'MISMATCH' | 'DAMAGED_LOST';
  actualUserId?: string;
  actualUserName?: string;
  actualLocationId?: string;
  actualLocationName?: string;
  actualCondition?: string;
  actualNotes?: string;
  auditedAt?: string | null;
  auditedBy?: string | null;
}

interface AuditCampaign {
  id: string;
  title: string;
  companyName?: string;
  locationId?: string;
  categoryId?: string;
  notes?: string;
  targetDate?: string | null;
  responsiblePerson?: string;
  status: 'ACTIVE' | 'COMPLETED';
  createdAt: string;
  totalAssets: number;
  auditedCount: number;
  items: AuditCampaignItem[];
}

export default function MobileAuditScanPage() {
  const [activeTab, setActiveTab] = useState<'SCAN' | 'LIST'>('SCAN');

  const [campaigns, setCampaigns] = useState<AuditCampaign[]>([]);
  const [activeCampaign, setActiveCampaign] = useState<AuditCampaign | null>(null);
  const [locations, setLocations] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [companies, setCompanies] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const [isScanning, setIsScanning] = useState(false);
  const [scanMode, setScanMode] = useState<'CAMERA' | 'MANUAL'>('CAMERA');
  const [manualCode, setManualCode] = useState('');
  const [scanError, setScanError] = useState<string | null>(null);
  const [isDecodingFile, setIsDecodingFile] = useState(false);
  const [showPermissionGuide, setShowPermissionGuide] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<'IDLE' | 'REQUESTING' | 'GRANTED' | 'DENIED'>('IDLE');
  const [isHttpInsecure, setIsHttpInsecure] = useState(false);
  const [httpsUrl, setHttpsUrl] = useState('');

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const isStartingRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedItem, setSelectedItem] = useState<AuditCampaignItem | null>(null);
  const [auditForm, setAuditForm] = useState({
    auditStatus: 'MATCHED' as 'MATCHED' | 'MISMATCH' | 'DAMAGED_LOST',
    actualUserId: '',
    actualLocationId: '',
    actualCondition: 'GOOD',
    actualNotes: 'Khớp đúng hiện trạng',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);

  const [listFilterStatus, setListFilterStatus] = useState<'ALL' | 'UNAUDITED' | 'AUDITED'>('ALL');
  const [listSearchQuery, setListSearchQuery] = useState('');

  const [isCreateCampaignOpen, setIsCreateCampaignOpen] = useState(false);
  const [newCampaignTitle, setNewCampaignTitle] = useState('');
  const [newCampaignCompany, setNewCampaignCompany] = useState('ALL');
  const [newCampaignLocation, setNewCampaignLocation] = useState('ALL');
  const [newCampaignCategory, setNewCampaignCategory] = useState('ALL');
  const [newCampaignNotes, setNewCampaignNotes] = useState('');

  // Check Protocol & Environment
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isHttp = window.location.protocol === 'http:' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
      setIsHttpInsecure(isHttp);
      setHttpsUrl(`https://${window.location.hostname}:3443${window.location.pathname}`);
    }
  }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [campRes, locRes, usrRes, catRes, compRes] = await Promise.all([
        fetch('/api/audit-campaigns').then((r) => r.json()),
        fetch('/api/locations').then((r) => r.json()),
        fetch('/api/users').then((r) => r.json()),
        fetch('/api/categories').then((r) => r.json()),
        fetch('/api/companies').then((r) => r.json()),
      ]);

      if (campRes.success && campRes.data) {
        setCampaigns(campRes.data);
        if (campRes.data.length > 0) {
          setActiveCampaign(campRes.data[0]);
        } else {
          await createDefaultCampaign();
        }
      }

      if (locRes.success) setLocations(locRes.data || []);
      if (usrRes.success) setUsers(usrRes.data || []);
      if (catRes.success) setCategories(catRes.data || []);
      if (compRes.success) setCompanies(compRes.data || []);
    } catch (err) {
      console.error('Error loading audit data:', err);
    } finally {
      setLoading(false);
    }
  };

  const createDefaultCampaign = async () => {
    try {
      const month = new Date().getMonth() + 1;
      const year = new Date().getFullYear();
      const res = await fetch('/api/audit-campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `Kiểm Kê Tài Sản Định Kỳ T${month}/${year}`,
          companyName: 'ALL',
          locationId: 'ALL',
          categoryId: 'ALL',
          notes: 'Kiểm kê định kỳ toàn bộ tài sản và thiết bị.',
        }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        setCampaigns([data.data]);
        setActiveCampaign(data.data);
      }
    } catch (e) {
      console.error('Failed to auto create campaign:', e);
    }
  };

  useEffect(() => {
    loadInitialData();
    return () => {
      stopCamera();
    };
  }, []);

  // Request Camera Permission & Start Live Stream
  const requestCameraPermissionAndStart = async () => {
    if (isStartingRef.current || isScanning) return;
    setScanError(null);
    setShowPermissionGuide(false);
    setPermissionStatus('REQUESTING');
    isStartingRef.current = true;

    // 1. Check if browser supports mediaDevices
    if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      isStartingRef.current = false;
      setPermissionStatus('DENIED');
      setScanError(
        isHttpInsecure
          ? 'Trình duyệt di động yêu cầu kết nối bảo mật HTTPS (Cổng 3443) để kích hoạt Live Camera.'
          : 'Trình duyệt hiện tại không hỗ trợ WebRTC Camera. Bạn hãy sử dụng tính năng "📸 Chụp Ảnh Tem QR" bên dưới!'
      );
      setShowPermissionGuide(true);
      return;
    }

    try {
      // 2. Explicit user-gesture permission request
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
      });

      // Stop raw test stream tracks immediately before handing to Html5Qrcode
      stream.getTracks().forEach((track) => track.stop());
      setPermissionStatus('GRANTED');

      // 3. Mount Html5Qrcode Scanner
      const qrCodeId = 'reader-mobile-scanner';
      const element = document.getElementById(qrCodeId);
      if (!element) {
        isStartingRef.current = false;
        return;
      }

      if (html5QrCodeRef.current) {
        try {
          await html5QrCodeRef.current.stop();
        } catch {}
      }

      const scanner = new Html5Qrcode(qrCodeId, {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.EAN_13,
        ],
        verbose: false,
      });
      html5QrCodeRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 15,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          handleScanSuccess(decodedText);
        },
        () => {}
      );

      setIsScanning(true);
    } catch (err: any) {
      console.error('Camera permission or start failed:', err);
      setPermissionStatus('DENIED');
      const errMsg = String(err?.message || err || '');
      if (
        errMsg.includes('NotAllowedError') ||
        errMsg.includes('Permission') ||
        errMsg.includes('denied') ||
        errMsg.includes('dismissed')
      ) {
        setScanError('Bạn vừa từ chối hoặc trình duyệt đã khóa quyền truy cập Camera.');
        setShowPermissionGuide(true);
      } else {
        setScanError(
          isHttpInsecure
            ? 'Trình duyệt chặn Live Camera trên mạng HTTP thông thường. Hãy chuyển sang HTTPS cổng 3443 hoặc dùng nút Chụp Ảnh Tem QR.'
            : 'Không thể khởi động Live Camera. Bạn có thể sử dụng nút "📸 Chụp Ảnh Tem QR" bên dưới!'
        );
        setShowPermissionGuide(true);
      }
      setIsScanning(false);
    } finally {
      isStartingRef.current = false;
    }
  };

  const stopCamera = async () => {
    if (html5QrCodeRef.current) {
      try {
        if (isScanning) {
          await html5QrCodeRef.current.stop();
        }
        html5QrCodeRef.current = null;
      } catch (err) {
        console.error('Error stopping camera:', err);
      }
      setIsScanning(false);
      setPermissionStatus('IDLE');
    }
  };

  const handlePhotoCaptureClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    setIsDecodingFile(true);
    setScanError(null);

    try {
      let scanner = html5QrCodeRef.current;
      if (!scanner) {
        scanner = new Html5Qrcode('reader-mobile-scanner', { verbose: false });
      }

      const decodedText = await scanner.scanFile(file, true);
      if (decodedText) {
        handleScanSuccess(decodedText);
      }
    } catch (err: any) {
      console.error('File scan error:', err);
      setScanError('Không tìm thấy mã QR trong ảnh vừa chụp. Vui lòng chụp rõ tem QR hơn.');
    } finally {
      setIsDecodingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleScanSuccess = (text: string) => {
    if (!activeCampaign) return;

    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(100);
      } catch {}
    }

    let cleanCode = text.trim();
    if (cleanCode.includes('/')) {
      const parts = cleanCode.split('/');
      cleanCode = parts[parts.length - 1];
    }

    findAndSelectAsset(cleanCode);
  };

  const findAndSelectAsset = (tagOrSerial: string) => {
    if (!activeCampaign) return;
    const query = tagOrSerial.trim().toLowerCase();

    let match = activeCampaign.items.find(
      (item) =>
        item.assetTag.toLowerCase() === query ||
        (item.serialNumber && item.serialNumber.toLowerCase() === query)
    );

    if (!match) {
      match = activeCampaign.items.find(
        (item) =>
          item.assetTag.toLowerCase().includes(query) ||
          item.name.toLowerCase().includes(query) ||
          (item.serialNumber && item.serialNumber.toLowerCase().includes(query))
      );
    }

    if (match) {
      setSelectedItem(match);
      setAuditForm({
        auditStatus: match.isAudited && match.auditStatus !== 'PENDING' ? match.auditStatus : 'MATCHED',
        actualUserId: match.actualUserId || match.systemUserId || '',
        actualLocationId: match.actualLocationId || match.locationId || locations[0]?.id || '',
        actualCondition: match.actualCondition || match.systemCondition || 'GOOD',
        actualNotes: match.actualNotes || (match.isAudited ? '' : 'Khớp đúng hiện trạng'),
      });
      setScanError(null);
      stopCamera();
    } else {
      setScanError(`Không tìm thấy tài sản có mã/serial: "${tagOrSerial}" trong đợt kiểm kê này.`);
    }
  };

  const handleSaveAudit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCampaign || !selectedItem) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/audit-campaigns/${activeCampaign.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'AUDIT_ITEM',
          itemId: selectedItem.id,
          auditStatus: auditForm.auditStatus,
          actualUserId: auditForm.actualUserId || null,
          actualLocationId: auditForm.actualLocationId || null,
          actualCondition: auditForm.actualCondition,
          actualNotes: auditForm.actualNotes,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSaveSuccessMessage(`✅ Đã lưu kiểm kê thành công cho [${selectedItem.assetTag}] ${selectedItem.name}`);
        setTimeout(() => setSaveSuccessMessage(null), 3500);

        setCampaigns((prev) =>
          prev.map((c) => (c.id === activeCampaign.id ? data.data : c))
        );
        setActiveCampaign(data.data);

        setSelectedItem(null);
        setManualCode('');
      } else {
        alert(data.error || 'Lỗi khi lưu kiểm kê');
      }
    } catch (err) {
      console.error('Save audit error:', err);
      alert('Lỗi kết nối máy chủ khi lưu');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateNewCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCampaignTitle.trim()) return;

    try {
      const res = await fetch('/api/audit-campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newCampaignTitle.trim(),
          companyName: newCampaignCompany,
          locationId: newCampaignLocation,
          categoryId: newCampaignCategory,
          notes: newCampaignNotes.trim(),
        }),
      });

      const data = await res.json();
      if (data.success) {
        setCampaigns((prev) => [data.data, ...prev]);
        setActiveCampaign(data.data);
        setIsCreateCampaignOpen(false);
        setNewCampaignTitle('');
        setNewCampaignNotes('');
        alert('Tạo đợt kiểm kê thành công!');
      } else {
        alert(data.error || 'Tạo đợt thất bại');
      }
    } catch {
      alert('Lỗi kết nối khi tạo đợt');
    }
  };

  const filteredListItems = useMemo(() => {
    if (!activeCampaign) return [];
    return activeCampaign.items.filter((item) => {
      if (listFilterStatus === 'AUDITED' && !item.isAudited) return false;
      if (listFilterStatus === 'UNAUDITED' && item.isAudited) return false;
      if (listSearchQuery.trim()) {
        const q = listSearchQuery.toLowerCase();
        const tag = item.assetTag.toLowerCase();
        const name = item.name.toLowerCase();
        const sn = (item.serialNumber || '').toLowerCase();
        const user = (item.systemUserName || '').toLowerCase();
        const loc = (item.locationName || '').toLowerCase();
        if (!tag.includes(q) && !name.includes(q) && !sn.includes(q) && !user.includes(q) && !loc.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [activeCampaign, listFilterStatus, listSearchQuery]);

  const auditProgress = useMemo(() => {
    if (!activeCampaign || activeCampaign.totalAssets === 0) return 0;
    return Math.round((activeCampaign.auditedCount / activeCampaign.totalAssets) * 100);
  }, [activeCampaign]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-24">
      {/* ==================== 1. TOP HEADER & AUDIT CAMPAIGN STATUS ==================== */}
      <header className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-4 py-3 shadow-lg">
        <div className="flex items-center justify-between gap-2 max-w-2xl mx-auto">
          <div className="flex items-center gap-2">
            <Link
              href="/assets"
              className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white border border-slate-700"
            >
              <RotateCcw className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="text-sm font-black text-white flex items-center gap-1.5 leading-tight">
                <span className="p-1 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-lg text-white">
                  <QrCode className="w-4 h-4" />
                </span>
                <span>Kiểm Kê QR Di Động</span>
              </h1>
              <p className="text-[10.5px] text-slate-400 font-medium">SIMPLY IT Management Hub</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setShowPermissionGuide(true)}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-blue-400 rounded-xl border border-slate-700 transition-colors"
              title="Hướng dẫn cấp quyền Camera"
            >
              <HelpCircle className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => setIsCreateCampaignOpen(true)}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-xs font-bold rounded-xl flex items-center gap-1 shrink-0 shadow-md shadow-blue-600/30 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Đợt Mới</span>
            </button>
          </div>
        </div>

        {/* INSECURE HTTP BANNER WITH 1-TAP SWITCH */}
        {isHttpInsecure && (
          <div className="max-w-2xl mx-auto mt-2.5 p-2.5 bg-amber-950/80 border border-amber-500/50 rounded-2xl flex items-center justify-between gap-2 shadow-inner">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-amber-400 shrink-0" />
              <div className="text-[11px] text-amber-200">
                <span className="font-bold">Đang chạy HTTP thường:</span> Trình duyệt điện thoại yêu cầu kết nối bảo mật để mở Live Camera.
              </div>
            </div>
            <a
              href={httpsUrl}
              className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-[10.5px] rounded-lg shrink-0 flex items-center gap-1 shadow"
            >
              <span>Vào HTTPS (3443)</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}

        {activeCampaign && (
          <div className="max-w-2xl mx-auto mt-2.5 pt-2 border-t border-slate-800/80">
            <div className="flex items-center justify-between text-[11px] mb-1">
              <span className="text-slate-400 font-medium">
                Tiến độ: <strong className="text-white">{activeCampaign.auditedCount}</strong> / {activeCampaign.totalAssets} thiết bị
              </span>
              <span className="font-bold text-blue-400">{auditProgress}%</span>
            </div>
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${auditProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* 2 MAIN TABS */}
        <div className="max-w-2xl mx-auto mt-3 grid grid-cols-2 gap-1.5 p-1 bg-slate-950/60 rounded-xl border border-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab('SCAN')}
            className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'SCAN'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>1. Quét & Cập Nhật</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('LIST');
              stopCamera();
            }}
            className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'LIST'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>2. Danh Sách ({activeCampaign?.totalAssets || 0})</span>
          </button>
        </div>
      </header>

      {/* TOAST */}
      {saveSuccessMessage && (
        <div className="fixed top-20 left-4 right-4 z-50 max-w-md mx-auto bg-emerald-600 text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 animate-in fade-in slide-from-top-4 duration-300">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span className="text-xs font-bold leading-tight">{saveSuccessMessage}</span>
        </div>
      )}

      {/* TAB 1: SCAN */}
      {activeTab === 'SCAN' && (
        <main className="max-w-2xl mx-auto px-4 pt-4">
          {!selectedItem && (
            <div className="flex items-center justify-between mb-3 bg-slate-800/60 p-1.5 rounded-xl border border-slate-700/60 overflow-x-auto">
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setScanMode('CAMERA');
                    setScanError(null);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                    scanMode === 'CAMERA'
                      ? 'bg-blue-600 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Live Camera</span>
                </button>

                <button
                  type="button"
                  onClick={handlePhotoCaptureClick}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow transition-all cursor-pointer"
                  title="Mở ứng dụng Camera chụp ảnh tem QR nhanh"
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span>📸 Chụp Tem QR</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setScanMode('MANUAL');
                    stopCamera();
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                    scanMode === 'MANUAL'
                      ? 'bg-blue-600 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>Nhập Mã</span>
                </button>
              </div>
            </div>
          )}

          {isDecodingFile && (
            <div className="p-4 bg-blue-950/70 border border-blue-600 rounded-2xl text-center my-3 animate-pulse">
              <RefreshCw className="w-6 h-6 text-blue-400 animate-spin mx-auto mb-1.5" />
              <p className="text-xs font-bold text-blue-200">Đang nhận diện mã QR từ ảnh chụp...</p>
            </div>
          )}

          {/* LIVE CAMERA BOX */}
          {scanMode === 'CAMERA' && !selectedItem && (
            <div className="space-y-3">
              <div className="relative rounded-3xl overflow-hidden bg-black border-2 border-slate-700/80 shadow-2xl aspect-square max-w-sm mx-auto flex flex-col items-center justify-center">
                <div id="reader-mobile-scanner" className="w-full h-full" />

                {!isScanning && (
                  <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-xs flex flex-col items-center justify-center p-5 text-center z-20">
                    <div className="w-14 h-14 rounded-full bg-blue-600/30 border border-blue-500/50 flex items-center justify-center text-blue-400 mb-2.5">
                      <Camera className="w-7 h-7" />
                    </div>
                    <h4 className="font-extrabold text-sm text-white mb-1">Mở Camera Quét Tem QR</h4>
                    <p className="text-xs text-slate-300 mb-3.5 max-w-xs leading-relaxed">
                      Chọn phương thức quét phù hợp cho điện thoại của bạn:
                    </p>

                    <div className="w-full space-y-2 max-w-xs">
                      {/* BUTTON 1: EXPLICIT PERMISSION REQUEST & LIVE CAMERA */}
                      <button
                        type="button"
                        onClick={requestCameraPermissionAndStart}
                        className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 active:scale-95 text-white font-extrabold text-xs rounded-2xl shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 cursor-pointer transition-all border border-blue-400/40"
                      >
                        <Video className="w-4 h-4" />
                        <span>🔐 BẬT CAMERA & XIN QUYỀN TRÌNH DUYỆT</span>
                      </button>

                      {/* BUTTON 2: NATIVE SYSTEM CAMERA CAPTURE (100% RELIABLE EVERYWHERE) */}
                      <label className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 active:scale-95 text-white font-extrabold text-xs rounded-2xl shadow-lg shadow-emerald-500/30 flex items-center justify-center gap-2 cursor-pointer transition-all">
                        <Camera className="w-4 h-4" />
                        <span>📸 CHỤP TEM QR (MÁY ẢNH ĐIỆN THOẠI)</span>
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          onChange={handleFileChange}
                          className="hidden"
                        />
                      </label>

                      {/* BUTTON 3: PICK FROM PHOTO ALBUM */}
                      <label className="w-full py-2 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 font-bold text-[11px] rounded-xl border border-slate-700 flex items-center justify-center gap-1.5 cursor-pointer transition-all">
                        <ImageIcon className="w-3.5 h-3.5 text-blue-400" />
                        <span>Chọn Ảnh Từ Thư Viện Ảnh</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFileChange}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>
                )}

                {isScanning && (
                  <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                    <div className="w-56 h-56 border-2 border-blue-400/80 rounded-2xl relative animate-pulse shadow-lg shadow-blue-500/20">
                      <div className="absolute top-0 left-0 w-5 h-5 border-t-4 border-l-4 border-blue-500 rounded-tl" />
                      <div className="absolute top-0 right-0 w-5 h-5 border-t-4 border-r-4 border-blue-500 rounded-tr" />
                      <div className="absolute bottom-0 left-0 w-5 h-5 border-b-4 border-l-4 border-blue-500 rounded-bl" />
                      <div className="absolute bottom-0 right-0 w-5 h-5 border-b-4 border-r-4 border-blue-500 rounded-br" />
                    </div>
                    <p className="text-[11px] text-white/90 bg-black/60 px-3 py-1 rounded-full mt-4 backdrop-blur-sm">
                      Hướng camera vào mã QR dán trên thân máy
                    </p>
                  </div>
                )}
              </div>

              {isScanning && (
                <div className="flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={stopCamera}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold flex items-center gap-1.5"
                  >
                    <CameraOff className="w-3.5 h-3.5" />
                    <span>Tắt Camera</span>
                  </button>
                  <button
                    type="button"
                    onClick={handlePhotoCaptureClick}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow"
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    <span>Chụp Ảnh Tem</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* HIDDEN FILE INPUT */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileChange}
            className="hidden"
          />

          {/* SCAN ERROR / NOTIFICATION */}
          {scanError && (
            <div className="p-3.5 bg-rose-950/80 border border-rose-600/80 rounded-2xl text-rose-200 text-xs flex items-start gap-2.5 mt-3 shadow-lg">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1 space-y-1.5">
                <p className="font-bold leading-tight">{scanError}</p>
                <div className="flex items-center gap-2 flex-wrap pt-1">
                  <button
                    type="button"
                    onClick={handlePhotoCaptureClick}
                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10.5px] rounded-lg cursor-pointer"
                  >
                    📸 Mở Máy Ảnh Chụp Ngay
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowPermissionGuide(true)}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-blue-300 font-bold text-[10.5px] rounded-lg border border-slate-700 cursor-pointer"
                  >
                    ❓ Xem Cách Cấp Quyền
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* MANUAL INPUT */}
          {scanMode === 'MANUAL' && !selectedItem && (
            <div className="bg-slate-800/80 border border-slate-700/80 p-4 rounded-2xl shadow-xl">
              <label className="block text-xs font-bold text-slate-300 mb-2">
                Nhập Mã Thẻ Tài Sản hoặc Số Serial:
              </label>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (manualCode.trim()) findAndSelectAsset(manualCode);
                }}
                className="flex gap-2"
              >
                <div className="relative flex-1">
                  <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                    placeholder="VD: AST-0001 hoặc Dell Latitude..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 font-semibold outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <button
                  type="submit"
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-bold text-xs rounded-xl flex items-center gap-1 transition-all"
                >
                  <Search className="w-4 h-4" />
                  <span>Tìm</span>
                </button>
              </form>
            </div>
          )}

          {/* QUICK INSTANT SEARCH & SELECT WITHOUT SCANNING */}
          {!selectedItem && activeCampaign && (
            <div className="mt-4 bg-slate-900/90 border border-slate-800 rounded-3xl p-4 shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-extrabold text-xs text-white flex items-center gap-2">
                  <Search className="w-3.5 h-3.5 text-blue-400" />
                  <span>Hoặc Chọn Nhanh Thiết Bị Trong Đợt ({activeCampaign.items.length})</span>
                </h4>
                <span className="text-[10px] text-slate-400">Không cần quét QR</span>
              </div>

              <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
                {activeCampaign.items.slice(0, 15).map((item) => (
                  <div
                    key={item.id}
                    onClick={() => findAndSelectAsset(item.assetTag)}
                    className="p-2.5 bg-slate-800/60 hover:bg-blue-900/30 border border-slate-700/50 hover:border-blue-500/50 rounded-2xl flex items-center justify-between cursor-pointer transition-all active:scale-98"
                  >
                    <div className="space-y-0.5 truncate pr-2">
                      <div className="flex items-center gap-1.5">
                        <span className="px-1.5 py-0.5 bg-blue-950 text-blue-400 border border-blue-800 rounded text-[10px] font-mono font-bold">
                          {item.assetTag}
                        </span>
                        <span className="text-xs font-extrabold text-white truncate">{item.name}</span>
                      </div>
                      <p className="text-[10px] text-slate-400 truncate">
                        👤 {item.systemUserName || 'Trong kho'} • 📍 {item.locationName || 'Kho IT'}
                      </p>
                    </div>

                    <div className="shrink-0 flex items-center gap-1.5">
                      {item.isAudited ? (
                        <span className="px-2 py-0.5 bg-emerald-950 text-emerald-400 border border-emerald-800 rounded-full text-[9.5px] font-bold">
                          ✓ Đã duyệt
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-amber-950 text-amber-400 border border-amber-800 rounded-full text-[9.5px] font-bold">
                          ⏳ Chờ kiểm
                        </span>
                      )}
                      <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ITEM AUDIT FORM MODAL/PANEL */}
          {selectedItem && (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-start justify-between pb-3 border-b border-slate-800">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-blue-950 text-blue-400 border border-blue-800 rounded-lg text-xs font-mono font-bold">
                      {selectedItem.assetTag}
                    </span>
                    <span className="text-xs text-slate-400 font-medium">
                      SN: {selectedItem.serialNumber || '—'}
                    </span>
                  </div>
                  <h3 className="text-sm font-extrabold text-white leading-tight">
                    {selectedItem.name}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    🏢 {selectedItem.companyName || 'Công ty'} • 📦 {selectedItem.categoryName || 'Tài sản'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedItem(null)}
                  className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* SYSTEM VS ACTUAL COMPARISON */}
              <div className="grid grid-cols-2 gap-2 p-3 bg-slate-950/70 border border-slate-800 rounded-2xl text-xs">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Hồ sơ hệ thống</span>
                  <p className="font-semibold text-slate-200 truncate">
                    👤 {selectedItem.systemUserName || 'Chưa gán'}
                  </p>
                  <p className="text-[11px] text-slate-400 truncate">
                    📍 {selectedItem.locationName || 'Kho IT'}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Tình trạng: {selectedItem.systemCondition || 'Tốt'}
                  </p>
                </div>

                <div className="space-y-1 border-l border-slate-800 pl-2.5">
                  <span className="text-[10px] font-bold text-blue-400 uppercase">Trạng thái kiểm kê</span>
                  <div className="pt-0.5">
                    {selectedItem.isAudited ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-950 text-emerald-400 border border-emerald-800 rounded-full text-[10px] font-bold">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Đã kiểm kê ({selectedItem.auditStatus})</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-950 text-amber-400 border border-amber-800 rounded-full text-[10px] font-bold">
                        <Clock className="w-3 h-3" />
                        <span>Chưa kiểm kê</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* AUDIT FORM */}
              <form onSubmit={handleSaveAudit} className="space-y-3.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1.5">
                    1. Đánh giá hiện trạng kiểm kê:
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { id: 'MATCHED', label: '✅ Khớp đúng', desc: 'Đúng người & vị trí' },
                      { id: 'MISMATCH', label: '⚠️ Lệch thực tế', desc: 'Đổi người hoặc vị trí' },
                      { id: 'DAMAGED_LOST', label: '❌ Hỏng / Mất', desc: 'Cần xử lý gấp' },
                    ].map((st) => (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() =>
                          setAuditForm((prev) => ({
                            ...prev,
                            auditStatus: st.id as any,
                            actualNotes:
                              st.id === 'MATCHED'
                                ? 'Khớp đúng hiện trạng'
                                : st.id === 'MISMATCH'
                                ? 'Phát hiện thay đổi người sử dụng/vị trí'
                                : 'Thiết bị bị hỏng hóc hoặc không tìm thấy',
                          }))
                        }
                        className={`p-2 rounded-xl text-center border transition-all cursor-pointer ${
                          auditForm.auditStatus === st.id
                            ? 'bg-blue-600 text-white border-blue-400 font-extrabold shadow-md shadow-blue-600/30'
                            : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-white'
                        }`}
                      >
                        <div className="text-xs leading-tight">{st.label}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">
                      Người đang giữ thực tế:
                    </label>
                    <select
                      value={auditForm.actualUserId}
                      onChange={(e) => setAuditForm((prev) => ({ ...prev, actualUserId: e.target.value }))}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">-- Trong kho / Chưa gán --</option>
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.fullName} ({u.department || 'Nhân sự'})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">
                      Vị trí thực tế:
                    </label>
                    <select
                      value={auditForm.actualLocationId}
                      onChange={(e) => setAuditForm((prev) => ({ ...prev, actualLocationId: e.target.value }))}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {locations.map((loc) => (
                        <option key={loc.id} value={loc.id}>
                          {loc.name} {loc.building ? `(${loc.building})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">
                      Tình trạng thực tế:
                    </label>
                    <select
                      value={auditForm.actualCondition}
                      onChange={(e) => setAuditForm((prev) => ({ ...prev, actualCondition: e.target.value }))}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="NEW">Mới 100%</option>
                      <option value="GOOD">Tốt (Đang dùng tốt)</option>
                      <option value="FAIR">Trung bình (Cũ)</option>
                      <option value="POOR">Kém (Cần sửa/nâng cấp)</option>
                      <option value="BROKEN">Hỏng hóc</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">
                      Ghi chú kiểm kê:
                    </label>
                    <input
                      type="text"
                      value={auditForm.actualNotes}
                      onChange={(e) => setAuditForm((prev) => ({ ...prev, actualNotes: e.target.value }))}
                      placeholder="Ghi chú thêm..."
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedItem(null)}
                    className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-2 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 active:scale-95 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-blue-600/30 flex items-center justify-center gap-1.5"
                  >
                    {isSubmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    <span>Xác Nhận & Lưu Kiểm Kê</span>
                  </button>
                </div>
              </form>
            </div>
          )}
        </main>
      )}

      {/* TAB 2: AUDIT LIST */}
      {activeTab === 'LIST' && (
        <main className="max-w-2xl mx-auto px-4 pt-4 space-y-3">
          {/* SEARCH & STATUS FILTER */}
          <div className="bg-slate-900 border border-slate-800 p-3 rounded-2xl space-y-2">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Tìm mã tài sản, tên thiết bị, serial, người dùng..."
                value={listSearchQuery}
                onChange={(e) => setListSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto">
              {[
                { id: 'ALL', label: `Tất cả (${activeCampaign?.items.length || 0})` },
                { id: 'UNAUDITED', label: `⏳ Chưa kiểm (${activeCampaign ? activeCampaign.totalAssets - activeCampaign.auditedCount : 0})` },
                { id: 'AUDITED', label: `✓ Đã kiểm (${activeCampaign?.auditedCount || 0})` },
              ].map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setListFilterStatus(st.id as any)}
                  className={`px-3 py-1 rounded-xl text-xs font-bold shrink-0 transition-all ${
                    listFilterStatus === st.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>

          {/* LIST ITEMS */}
          <div className="space-y-2">
            {filteredListItems.length === 0 ? (
              <div className="p-8 text-center bg-slate-900/60 border border-slate-800 rounded-2xl text-slate-400 text-xs">
                Không tìm thấy thiết bị nào phù hợp
              </div>
            ) : (
              filteredListItems.map((item) => (
                <div
                  key={item.id}
                  onClick={() => {
                    findAndSelectAsset(item.assetTag);
                    setActiveTab('SCAN');
                  }}
                  className="p-3.5 bg-slate-900 border border-slate-800 hover:border-blue-500 rounded-2xl flex items-center justify-between gap-3 cursor-pointer transition-all active:scale-98"
                >
                  <div className="space-y-1 truncate flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="px-1.5 py-0.5 bg-blue-950 text-blue-400 border border-blue-800 rounded text-[10px] font-mono font-bold">
                        {item.assetTag}
                      </span>
                      <span className="text-xs font-bold text-white truncate">{item.name}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 truncate">
                      👤 {item.actualUserName || item.systemUserName || 'Trong kho'} • 📍 {item.actualLocationName || item.locationName || 'Kho IT'}
                    </p>
                    {item.isAudited && item.actualNotes && (
                      <p className="text-[10px] text-emerald-400 truncate italic">
                        💬 {item.actualNotes}
                      </p>
                    )}
                  </div>

                  <div className="shrink-0 flex items-center gap-2">
                    {item.isAudited ? (
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                          item.auditStatus === 'MATCHED'
                            ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                            : item.auditStatus === 'MISMATCH'
                            ? 'bg-amber-950 text-amber-400 border-amber-800'
                            : 'bg-rose-950 text-rose-400 border-rose-800'
                        }`}
                      >
                        {item.auditStatus === 'MATCHED' ? '✓ Khớp' : item.auditStatus === 'MISMATCH' ? '⚠️ Lệch' : '❌ Hỏng/Mất'}
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 bg-slate-800 text-slate-400 border border-slate-700 rounded-full text-[10px] font-bold">
                        Chờ duyệt
                      </span>
                    )}
                    <ChevronRight className="w-4 h-4 text-slate-500" />
                  </div>
                </div>
              ))
            )}
          </div>
        </main>
      )}

      {/* ==================== PERMISSION GUIDE MODAL ==================== */}
      {showPermissionGuide && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-5 max-w-md w-full space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-amber-400" />
                <span>Cách Cấp Quyền Camera Trên Điện Thoại</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowPermissionGuide(false)}
                className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
              <div className="p-3 bg-emerald-950/60 border border-emerald-800/80 rounded-2xl space-y-1">
                <p className="font-bold text-emerald-200">📱 Cách 1: Sử dụng máy ảnh chụp nhanh (Khuyên dùng - 100% hoạt động)</p>
                <p className="text-[11.5px] text-slate-300">
                  Bấm vào nút <strong className="text-emerald-400">"📸 Chụp Tem QR (Máy ảnh điện thoại)"</strong>. Hệ thống sẽ mở ngay ứng dụng Máy ảnh trên điện thoại để chụp và quét mã tức thì.
                </p>
              </div>

              <div className="p-3 bg-indigo-950/60 border border-indigo-800/80 rounded-2xl space-y-1">
                <p className="font-bold text-indigo-200">🔒 Cách 2: Chuyển sang HTTPS (Cổng 3443) cho Live Camera</p>
                <p className="text-[11.5px] text-slate-300">
                  Trình duyệt Safari và Chrome trên di động bắt buộc kết nối bảo mật để hiện bảng hỏi quyền Camera.
                </p>
                <a
                  href={httpsUrl}
                  className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs rounded-xl shadow"
                >
                  <span>Mở qua HTTPS: {httpsUrl}</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              <div className="p-3 bg-slate-800/60 border border-slate-700/60 rounded-2xl space-y-1">
                <p className="font-bold text-slate-200">⚙️ Cách 3: Bật lại nếu đã lỡ bấm "Chặn (Block)"</p>
                <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-400 pl-1">
                  <li><strong>Chrome:</strong> Bấm biểu tượng <strong>Cài đặt trang (hoặc Ổ khóa)</strong> trên thanh địa chỉ &rarr; Quyền &rarr; <strong>Bật Máy ảnh (Cho phép)</strong>.</li>
                  <li><strong>Safari iOS:</strong> Bấm biểu tượng <strong>aA</strong> trên thanh địa chỉ &rarr; Cài đặt trang web &rarr; <strong>Máy ảnh: Cho phép</strong>.</li>
                </ul>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowPermissionGuide(false);
                  handlePhotoCaptureClick();
                }}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl shadow cursor-pointer"
              >
                📸 Mở Chụp Ảnh Tem Ngay
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE CAMPAIGN MODAL */}
      {isCreateCampaignOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-400" />
                <span>Tạo Đợt Kiểm Kê Mới</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsCreateCampaignOpen(false)}
                className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateNewCampaign} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Tên đợt kiểm kê:
                </label>
                <input
                  type="text"
                  required
                  value={newCampaignTitle}
                  onChange={(e) => setNewCampaignTitle(e.target.value)}
                  placeholder="VD: Kiểm kê quý 3/2026..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Công ty kiểm kê:
                </label>
                <select
                  value={newCampaignCompany}
                  onChange={(e) => setNewCampaignCompany(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="ALL">Tất cả công ty</option>
                  {companies.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Vị trí / Khu vực:
                </label>
                <select
                  value={newCampaignLocation}
                  onChange={(e) => setNewCampaignLocation(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="ALL">Tất cả vị trí</option>
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name} {loc.building ? `(${loc.building})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Ghi chú đợt:
                </label>
                <textarea
                  rows={2}
                  value={newCampaignNotes}
                  onChange={(e) => setNewCampaignNotes(e.target.value)}
                  placeholder="Ghi chú mục đích, yêu cầu..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateCampaignOpen(false)}
                  className="flex-1 py-2.5 bg-slate-800 text-slate-300 font-bold text-xs rounded-xl"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="flex-2 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-blue-600/30"
                >
                  Tạo Đợt Kiểm Kê
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
