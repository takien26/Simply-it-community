'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Laptop,
  CheckCircle2,
  Clock,
  Wrench,
  User,
  MapPin,
  Building,
  FileText,
  Receipt,
  Calendar,
  ShieldCheck,
  Cpu,
  ArrowLeft,
  Loader2,
  Copy,
  ExternalLink,
  QrCode,
  Tag,
  Camera,
  Plus,
  Send,
  AlertCircle,
  Smartphone,
  ChevronDown,
  ChevronUp,
  X,
  Sparkles,
  Check,
} from 'lucide-react';
import { formatCurrency, formatDate, getRemainingTimeText } from '@/lib/utils';
import Link from 'next/link';

export default function AssetScanPage() {
  const params = useParams();
  const router = useRouter();
  const idOrTag = (params?.id as string) || '';

  const [asset, setAsset] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [companyName, setCompanyName] = useState('Công ty');
  const [appName, setAppName] = useState('IT Asset Hub');
  const [currentUser, setCurrentUser] = useState<any>(null);

  // 📱 Mobile On-Site Mode States (👑 Enterprise)
  const [isCreateTicketOpen, setIsCreateTicketOpen] = useState(false);
  const [newTicketTitle, setNewTicketTitle] = useState('');
  const [newTicketDesc, setNewTicketDesc] = useState('');
  const [newTicketPriority, setNewTicketPriority] = useState('MEDIUM');
  const [uploadedPhotos, setUploadedPhotos] = useState<Array<{ url: string; name: string }>>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [submittingTicket, setSubmittingTicket] = useState(false);
  const [updatingAssetStatus, setUpdatingAssetStatus] = useState(false);
  const [statusSuccessMsg, setStatusSuccessMsg] = useState('');
  const [ticketSuccessMsg, setTicketSuccessMsg] = useState('');
  const [quickResolvingId, setQuickResolvingId] = useState<string | null>(null);
  const [quickResolveNotes, setQuickResolveNotes] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Load Settings
    fetch('/api/settings')
      .then((r) => r.json())
      .then((res) => {
        if (res.success && Array.isArray(res.data)) {
          const c = res.data.find((s: any) => s.key === 'app.company_name');
          const a = res.data.find((s: any) => s.key === 'app.name');
          if (c?.value) setCompanyName(c.value);
          if (a?.value) setAppName(a.value);
        }
      })
      .catch(() => {});

    // Check Current User Auth
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((res) => {
        if (res.success && res.data) setCurrentUser(res.data);
      })
      .catch(() => {});

    if (!idOrTag) return;
    setLoading(true);
    fetch(`/api/scan/${encodeURIComponent(idOrTag)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setAsset(data.data);
        } else {
          setError(data.error || 'Không tìm thấy thiết bị');
        }
      })
      .catch(() => setError('Lỗi kết nối tra cứu thiết bị'))
      .finally(() => setLoading(false));
  }, [idOrTag]);

  const handleCopySummary = () => {
    if (!asset) return;
    const summary = `Công ty: ${companyName}\nMã: ${asset.assetTag}\nTên: ${asset.name}\nSerial: ${asset.serialNumber || '—'}\nTrạng thái: ${asset.status}`;
    navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Quick Asset Status Update (👑 Enterprise)
  const handleUpdateAssetStatus = async (newStatus: string) => {
    if (!asset || updatingAssetStatus) return;
    try {
      setUpdatingAssetStatus(true);
      const res = await fetch(`/api/assets/${asset.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setAsset((prev: any) => ({ ...prev, status: newStatus }));
        setStatusSuccessMsg(`Đã chuyển trạng thái sang: ${newStatus === 'MAINTENANCE' ? 'Đang bảo trì 🔧' : newStatus === 'AVAILABLE' ? 'Sẵn sàng trong kho ✅' : 'Đang sử dụng 💻'}`);
        setTimeout(() => setStatusSuccessMsg(''), 3000);
      } else {
        const d = await res.json();
        alert(d.error || 'Cập nhật trạng thái thất bại');
      }
    } catch {
      alert('Lỗi kết nối khi cập nhật trạng thái');
    } finally {
      setUpdatingAssetStatus(false);
    }
  };

  // Camera Photo Capture & Upload (👑 Enterprise)
  const handleCapturePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingPhoto(true);
      const fd = new FormData();
      fd.append('file', file);
      fd.append('category', 'ticket');
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: fd,
      });
      const d = await res.json();
      if (d.url) {
        setUploadedPhotos((prev) => [...prev, { url: d.url, name: file.name }]);
      } else {
        alert(d.error || 'Lỗi tải ảnh lên');
      }
    } catch {
      alert('Lỗi kết nối khi tải ảnh');
    } finally {
      setUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Quick On-Site Ticket Creation (👑 Enterprise)
  const handleCreateOnSiteTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTicketTitle.trim() || submittingTicket) return;
    try {
      setSubmittingTicket(true);
      const res = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTicketTitle.trim(),
          description: newTicketDesc.trim() || `Sự cố phát hiện tại chỗ cho thiết bị ${asset.name} (${asset.assetTag}).`,
          priority: newTicketPriority,
          status: 'OPEN',
          assetId: asset.id,
          category: 'HARDWARE',
          attachmentUrls: uploadedPhotos.length > 0 ? uploadedPhotos : null,
        }),
      });
      const d = await res.json();
      if (res.ok) {
        setTicketSuccessMsg('✅ Đã tạo Ticket xử lý tại chỗ thành công!');
        setIsCreateTicketOpen(false);
        setNewTicketTitle('');
        setNewTicketDesc('');
        setUploadedPhotos([]);
        // Reload asset tickets
        fetch(`/api/scan/${encodeURIComponent(idOrTag)}`)
          .then((r) => r.json())
          .then((data) => {
            if (data.success) setAsset(data.data);
          });
        setTimeout(() => setTicketSuccessMsg(''), 4000);
      } else {
        alert(d.error || 'Tạo ticket thất bại');
      }
    } catch {
      alert('Lỗi kết nối khi tạo ticket');
    } finally {
      setSubmittingTicket(false);
    }
  };

  // Quick Resolve Ticket On-Site (👑 Enterprise)
  const handleQuickResolveTicket = async (ticketId: string) => {
    if (submittingTicket) return;
    try {
      setSubmittingTicket(true);
      const res = await fetch(`/api/tickets/${ticketId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'RESOLVED',
          resolutionNotes: quickResolveNotes.trim() || 'Đã kiểm tra và khắc phục sự cố thành công tại hiện trường.',
        }),
      });
      if (res.ok) {
        setQuickResolvingId(null);
        setQuickResolveNotes('');
        setTicketSuccessMsg('✅ Đã đóng Ticket tại chỗ thành công!');
        // Reload asset tickets
        fetch(`/api/scan/${encodeURIComponent(idOrTag)}`)
          .then((r) => r.json())
          .then((data) => {
            if (data.success) setAsset(data.data);
          });
        setTimeout(() => setTicketSuccessMsg(''), 4000);
      } else {
        const d = await res.json();
        alert(d.error || 'Đóng ticket thất bại');
      }
    } catch {
      alert('Lỗi kết nối khi đóng ticket');
    } finally {
      setSubmittingTicket(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-200 text-center max-w-sm w-full space-y-4">
          <Loader2 className="w-10 h-10 text-blue-600 animate-spin mx-auto" />
          <h2 className="text-base font-bold text-slate-800">Đang đọc thông tin thiết bị...</h2>
          <p className="text-xs text-slate-400">Vui lòng chờ trong giây lát</p>
        </div>
      </div>
    );
  }

  if (error || !asset) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-200 text-center max-w-sm w-full space-y-4">
          <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto text-2xl font-bold">
            ⚠️
          </div>
          <h2 className="text-lg font-bold text-slate-900">Không tìm thấy thiết bị</h2>
          <p className="text-xs text-slate-500">{error || 'Mã tài sản này không tồn tại trong hệ thống'}</p>
          <Link
            href="/assets"
            className="inline-flex items-center space-x-1.5 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Về danh sách tài sản</span>
          </Link>
        </div>
      </div>
    );
  }

  const assignedUser = asset.assignments?.[0]?.user;
  const warrantyInfo = asset.warrantyExpiry ? getRemainingTimeText(asset.warrantyExpiry) : null;
  const specs = asset.specs && typeof asset.specs === 'object' ? asset.specs : {};
  const specEntries = Object.entries(specs);

  return (
    <div className="min-h-screen bg-slate-100 py-6 px-4 flex justify-center">
      <div className="max-w-xl w-full space-y-4">
        {/* Top Bar Navigation */}
        <div className="flex items-center justify-between">
          <Link
            href="/assets"
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Về phần mềm quản lý</span>
          </Link>

          <button
            type="button"
            onClick={handleCopySummary}
            className="inline-flex items-center space-x-1 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-blue-700 shadow-2xs hover:bg-blue-50 transition-colors"
          >
            {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Đã sao chép' : 'Sao chép thông tin'}</span>
          </button>
        </div>

        {/* Main Profile Card */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden space-y-5 p-5 sm:p-6">
          {/* Header Banner */}
          <div className="flex items-start justify-between gap-3 pb-4 border-b border-slate-100">
            <div className="space-y-1">
              <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                  🏢 {companyName}
                </span>
                <span className="font-mono text-sm font-extrabold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-lg">
                  {asset.assetTag}
                </span>
                <span
                  className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                    asset.status === 'AVAILABLE'
                      ? 'bg-emerald-100 text-emerald-700'
                      : asset.status === 'IN_USE'
                      ? 'bg-blue-100 text-blue-700'
                      : asset.status === 'MAINTENANCE'
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {asset.status === 'AVAILABLE' && 'Sẵn sàng trong kho'}
                  {asset.status === 'IN_USE' && 'Đang sử dụng'}
                  {asset.status === 'MAINTENANCE' && 'Đang bảo trì'}
                  {asset.status === 'RETIRED' && 'Đã thanh lý'}
                </span>
              </div>
              <h1 className="text-xl font-extrabold text-slate-900 leading-snug">{asset.name}</h1>
              <p className="text-xs text-slate-500 flex items-center space-x-1.5">
                <span>{asset.category?.icon || '📦'} {asset.category?.name || 'Thiết bị'}</span>
                {asset.brand && <span>• Thương hiệu: <strong>{asset.brand}</strong></span>}
                {asset.model && <span>• Model: <strong>{asset.model}</strong></span>}
              </p>
            </div>
          </div>

          {/* Toast Notification Messages */}
          {statusSuccessMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-semibold flex items-center justify-between animate-in fade-in">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                {statusSuccessMsg}
              </span>
              <button type="button" onClick={() => setStatusSuccessMsg('')} className="text-emerald-500 hover:text-emerald-700">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {ticketSuccessMsg && (
            <div className="p-3 bg-blue-50 border border-blue-200 text-blue-800 rounded-2xl text-xs font-semibold flex items-center justify-between animate-in fade-in">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                {ticketSuccessMsg}
              </span>
              <button type="button" onClick={() => setTicketSuccessMsg('')} className="text-blue-500 hover:text-blue-700">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* 📱 MOBILE ON-SITE IT OPERATIONS (👑 Enterprise) */}
          <div className="p-4 bg-linear-to-br from-indigo-50/70 via-slate-50 to-blue-50/50 border border-indigo-200/80 rounded-2xl space-y-3 shadow-2xs">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-xs font-bold shadow-xs">
                  📱
                </div>
                <div>
                  <h3 className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                    <span>Thao Tác Kỹ Thuật Viên Tại Chỗ</span>
                    <span className="px-1.5 py-0.2 rounded-sm bg-indigo-100 text-indigo-700 font-extrabold text-[9px] border border-indigo-200">
                      👑 On-site
                    </span>
                  </h3>
                </div>
              </div>

              {/* Quick Status Buttons */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {asset.status !== 'MAINTENANCE' && (
                  <button
                    type="button"
                    onClick={() => handleUpdateAssetStatus('MAINTENANCE')}
                    disabled={updatingAssetStatus}
                    className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-[11px] font-bold shadow-2xs transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <Wrench className="w-3 h-3" />
                    <span>Báo bảo trì</span>
                  </button>
                )}
                {asset.status !== 'AVAILABLE' && (
                  <button
                    type="button"
                    onClick={() => handleUpdateAssetStatus('AVAILABLE')}
                    disabled={updatingAssetStatus}
                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold shadow-2xs transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <Check className="w-3 h-3" />
                    <span>Trả về kho</span>
                  </button>
                )}
                {asset.status !== 'IN_USE' && (
                  <button
                    type="button"
                    onClick={() => handleUpdateAssetStatus('IN_USE')}
                    disabled={updatingAssetStatus}
                    className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[11px] font-bold shadow-2xs transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <Laptop className="w-3 h-3" />
                    <span>Bàn giao dùng</span>
                  </button>
                )}
              </div>
            </div>

            {/* Quick Ticket Action Bar */}
            <div className="pt-2 border-t border-indigo-100 flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                🎫 Sự cố & Ticket liên quan ({asset.tickets?.length || 0})
              </span>
              <button
                type="button"
                onClick={() => setIsCreateTicketOpen(!isCreateTicketOpen)}
                className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold rounded-lg shadow-2xs transition-colors flex items-center gap-1 cursor-pointer"
              >
                {isCreateTicketOpen ? <X className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                <span>{isCreateTicketOpen ? 'Đóng form' : 'Báo hỏng tại chỗ'}</span>
              </button>
            </div>

            {/* Quick Ticket Creation Form with Camera Support */}
            {isCreateTicketOpen && (
              <form onSubmit={handleCreateOnSiteTicket} className="p-3 bg-white rounded-xl border border-indigo-200 space-y-2.5 shadow-xs animate-in fade-in">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-indigo-900 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-indigo-600" />
                    Tạo Ticket Sự Cố Nhanh
                  </span>
                  <span className="text-[10px] text-slate-400">Mã máy: {asset.assetTag}</span>
                </div>

                {/* Quick Symptom Chips */}
                <div className="flex flex-wrap gap-1">
                  {[
                    'Kẹt giấy / Hỏng mực',
                    'Không lên nguồn / Màn hình đen',
                    'Chạy chậm / Treo máy',
                    'Mất kết nối mạng / WiFi',
                    'Hỏng bàn phím / Chuột',
                  ].map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => setNewTicketTitle(chip)}
                      className="px-2 py-0.5 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-600 rounded-md text-[10px] font-medium transition-colors cursor-pointer border border-slate-200"
                    >
                      {chip}
                    </button>
                  ))}
                </div>

                <div>
                  <input
                    type="text"
                    value={newTicketTitle}
                    onChange={(e) => setNewTicketTitle(e.target.value)}
                    placeholder="Tiêu đề sự cố (VD: Máy in kẹt giấy khay 2...)"
                    required
                    className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-indigo-500 font-semibold text-slate-800"
                  />
                </div>

                <div>
                  <textarea
                    value={newTicketDesc}
                    onChange={(e) => setNewTicketDesc(e.target.value)}
                    rows={2}
                    placeholder="Mô tả hiện tượng chi tiết tại chỗ (tùy chọn)..."
                    className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-indigo-500 text-slate-700 resize-none"
                  />
                </div>

                <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
                  <div className="flex items-center gap-2">
                    <select
                      value={newTicketPriority}
                      onChange={(e) => setNewTicketPriority(e.target.value)}
                      className="px-2 py-1 text-[11px] font-bold bg-slate-50 border border-slate-200 rounded-lg text-slate-700"
                    >
                      <option value="LOW">Thấp (Low)</option>
                      <option value="MEDIUM">Bình thường (Medium)</option>
                      <option value="HIGH">Cao (High)</option>
                      <option value="URGENT">Khẩn cấp (Urgent)</option>
                    </select>

                    {/* Camera Capture Trigger */}
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      ref={fileInputRef}
                      onChange={handleCapturePhoto}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingPhoto}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-semibold border border-slate-200 flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      {uploadingPhoto ? <Loader2 className="w-3 h-3 animate-spin text-blue-600" /> : <Camera className="w-3 h-3 text-blue-600" />}
                      <span>{uploadingPhoto ? 'Đang tải...' : 'Chụp ảnh'}</span>
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={submittingTicket || !newTicketTitle.trim()}
                    className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[11px] font-bold shadow-xs transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    {submittingTicket ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                    <span>Gửi Ticket Ngay</span>
                  </button>
                </div>

                {/* Uploaded Photos Preview */}
                {uploadedPhotos.length > 0 && (
                  <div className="flex items-center gap-2 pt-1 overflow-x-auto">
                    {uploadedPhotos.map((photo, idx) => (
                      <div key={idx} className="relative w-12 h-12 rounded-lg overflow-hidden border border-slate-200 shrink-0">
                        <img src={photo.url} alt="Attached" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setUploadedPhotos((prev) => prev.filter((_, i) => i !== idx))}
                          className="absolute top-0.5 right-0.5 w-4 h-4 bg-rose-600 text-white rounded-full flex items-center justify-center text-[9px]"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </form>
            )}

            {/* List of Asset Tickets */}
            {asset.tickets && asset.tickets.length > 0 ? (
              <div className="space-y-2 pt-1">
                {asset.tickets.map((t: any) => {
                  const isOpen = t.status === 'OPEN' || t.status === 'IN_PROGRESS' || t.status === 'WAITING';
                  return (
                    <div
                      key={t.id}
                      className={`p-3 rounded-xl border text-xs space-y-1.5 transition-all ${
                        isOpen
                          ? 'bg-amber-50/60 border-amber-200 shadow-2xs'
                          : 'bg-white border-slate-200 text-slate-700'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-mono font-extrabold text-[11px] text-blue-700">
                              #{t.ticketNumber}
                            </span>
                            <span
                              className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded-sm ${
                                t.status === 'OPEN'
                                  ? 'bg-blue-100 text-blue-800'
                                  : t.status === 'IN_PROGRESS'
                                  ? 'bg-indigo-100 text-indigo-800'
                                  : t.status === 'RESOLVED' || t.status === 'CLOSED'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {t.status}
                            </span>
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.2 rounded-sm ${
                                t.priority === 'URGENT'
                                  ? 'bg-rose-100 text-rose-800 font-black'
                                  : t.priority === 'HIGH'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {t.priority}
                            </span>
                          </div>
                          <p className="font-bold text-slate-900 text-xs leading-snug">{t.title}</p>
                        </div>

                        <Link
                          href={`/tickets?id=${t.id}`}
                          className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-[10px] font-bold text-slate-700 shrink-0 transition-colors flex items-center gap-0.5"
                        >
                          <span>Xem</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </Link>
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-100">
                        <span>👤 IT: <strong>{t.assignedTo?.fullName || 'Chưa nhận'}</strong></span>
                        <span>{formatDate(t.createdAt)}</span>
                      </div>

                      {/* On-Site Quick Resolve Action for Open Ticket */}
                      {isOpen && (
                        <div className="pt-1.5 border-t border-amber-200/70">
                          {quickResolvingId === t.id ? (
                            <div className="space-y-1.5 bg-white p-2.5 rounded-lg border border-emerald-300 animate-in fade-in">
                              <span className="text-[10px] font-bold text-emerald-800 block">
                                Ghi chú kết quả xử lý tại chỗ:
                              </span>
                              <input
                                type="text"
                                value={quickResolveNotes}
                                onChange={(e) => setQuickResolveNotes(e.target.value)}
                                placeholder="VD: Đã tháo kẹt giấy và vệ sinh trục lăn..."
                                className="w-full px-2 py-1 text-xs bg-slate-50 border border-slate-200 rounded-md text-slate-800 font-medium"
                              />
                              <div className="flex items-center justify-end gap-1.5 pt-0.5">
                                <button
                                  type="button"
                                  onClick={() => setQuickResolvingId(null)}
                                  className="px-2 py-0.5 text-[10px] text-slate-500 hover:bg-slate-100 rounded-md font-medium"
                                >
                                  Hủy
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleQuickResolveTicket(t.id)}
                                  disabled={submittingTicket}
                                  className="px-2.5 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-[10px] font-bold flex items-center gap-1 shadow-2xs cursor-pointer"
                                >
                                  {submittingTicket ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <CheckCircle2 className="w-2.5 h-2.5" />}
                                  <span>Xác nhận đóng ticket</span>
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setQuickResolvingId(t.id);
                                setQuickResolveNotes('Đã kiểm tra và xử lý thành công tại hiện trường.');
                              }}
                              className="w-full py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                            >
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>⚡ Khắc phục xong (Đóng ticket tại chỗ)</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-[11px] text-slate-400 italic pt-1">
                Chưa có sự cố nào được ghi nhận cho thiết bị này.
              </p>
            )}
          </div>

          {/* Assigned Holder Section */}
          <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-2xl space-y-1">
            <div className="text-[11px] font-bold uppercase tracking-wider text-blue-900 flex items-center space-x-1.5">
              <User className="w-3.5 h-3.5 text-blue-600" />
              <span>Người đang giữ / Quản lý thiết bị:</span>
            </div>
            {assignedUser ? (
              <div className="pt-1 flex items-center justify-between">
                <div>
                  <div className="text-sm font-bold text-slate-900">{assignedUser.fullName}</div>
                  <div className="text-xs text-blue-700">
                    {assignedUser.department || 'Nhân viên'} • {assignedUser.email}
                  </div>
                </div>
                <span className="text-[11px] bg-blue-600 text-white font-semibold px-2.5 py-1 rounded-lg">
                  Đang sử dụng
                </span>
              </div>
            ) : (
              <p className="text-xs text-slate-500 font-medium italic pt-1">
                Thiết bị hiện chưa gán cho cá nhân nào (Đang sẵn sàng trong kho IT)
              </p>
            )}
          </div>

          {/* Key Specs & Hardware Parameters */}
          <div className="space-y-2.5">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-1.5">
              <Cpu className="w-4 h-4 text-indigo-600" />
              <span>Thông số kỹ thuật & Cấu hình:</span>
            </h3>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="text-slate-400 block text-[10px]">Số Serial (SN)</span>
                <strong className="text-slate-900 font-mono">{asset.serialNumber || '—'}</strong>
              </div>

              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="text-slate-400 block text-[10px]">Vị trí đặt</span>
                <strong className="text-slate-900">{asset.location?.name || 'Kho IT'}</strong>
              </div>

              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="text-slate-400 block text-[10px]">Nhà cung cấp</span>
                <strong className="text-slate-900">{asset.vendor?.name || '—'}</strong>
              </div>

              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="text-slate-400 block text-[10px]">Tình trạng vật lý</span>
                <strong className="text-slate-900">
                  {asset.condition === 'NEW' && 'Mới 100%'}
                  {asset.condition === 'GOOD' && 'Tốt (Good)'}
                  {asset.condition === 'FAIR' && 'Trung bình'}
                  {asset.condition === 'POOR' && 'Kém'}
                  {asset.condition === 'BROKEN' && 'Hỏng'}
                </strong>
              </div>

              {specEntries.map(([k, v]: [string, any]) => (
                <div key={k} className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">{k}</span>
                  <strong className="text-slate-900">{String(v)}</strong>
                </div>
              ))}
            </div>
          </div>

          {/* Financial & Warranty Details */}
          <div className="p-4 bg-slate-50/90 border border-slate-200 rounded-2xl space-y-3">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Hợp đồng, Hóa đơn & Thời hạn bảo hành:</span>
            </h3>

            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <div className="space-y-0.5">
                <span className="text-slate-400 text-[10px] flex items-center">
                  <FileText className="w-3 h-3 mr-1 text-slate-400" /> Số Hợp Đồng
                </span>
                <span className="font-mono font-bold text-slate-800">{asset.contractNumber || '—'}</span>
              </div>

              <div className="space-y-0.5">
                <span className="text-slate-400 text-[10px] flex items-center">
                  <Receipt className="w-3 h-3 mr-1 text-slate-400" /> Số Hóa Đơn
                </span>
                <span className="font-mono font-bold text-slate-800">{asset.invoiceNumber || '—'}</span>
              </div>

              <div className="space-y-0.5">
                <span className="text-slate-400 text-[10px]">Ngày mua hàng</span>
                <span className="font-semibold text-slate-800">
                  {asset.purchaseDate ? formatDate(asset.purchaseDate) : '—'}
                </span>
              </div>

              <div className="space-y-0.5">
                <span className="text-slate-400 text-[10px]">Giá mua ban đầu</span>
                <span className="font-mono font-bold text-emerald-700">
                  {asset.purchasePrice ? formatCurrency(Number(asset.purchasePrice)) : '—'}
                </span>
              </div>
            </div>

            {/* Smart Warranty Banner */}
            {asset.warrantyExpiry && (
              <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-500">Hạn bảo hành: </span>
                  <strong>{formatDate(asset.warrantyExpiry)}</strong>
                </div>
                {warrantyInfo && (
                  <span className={`px-2.5 py-0.5 rounded-full font-semibold text-[11px] ${warrantyInfo.badgeClass}`}>
                    {warrantyInfo.text}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Maintenance & Repair History Timeline */}
          {asset.maintenanceLogs && asset.maintenanceLogs.length > 0 && (
            <div className="space-y-2.5">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-1.5">
                <Wrench className="w-4 h-4 text-indigo-600" />
                <span>Lịch sử sửa chữa & bảo trì ({asset.maintenanceLogs.length}):</span>
              </h3>

              <div className="space-y-2">
                {asset.maintenanceLogs.map((log: any) => (
                  <div key={log.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
                    <div className="flex items-center justify-between font-bold text-slate-900">
                      <span className="text-indigo-700">[{log.type}] {log.title}</span>
                      <span className="font-mono text-emerald-700">
                        {log.cost ? formatCurrency(Number(log.cost)) : 'Miễn phí'}
                      </span>
                    </div>
                    {log.description && <p className="text-slate-600 text-[11px]">{log.description}</p>}
                    <div className="flex items-center justify-between text-slate-400 text-[10px] pt-1 border-t border-slate-100">
                      <span>👤 IT sửa: <strong>{log.performedBy?.fullName || 'IT Staff'}</strong></span>
                      <span>{formatDate(log.performedAt)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="text-center text-slate-400 text-[11px] py-2">
          Hệ thống Quản lý Tài sản IT • Quét mã QR Tra cứu nhanh
        </div>
      </div>
    </div>
  );
}
