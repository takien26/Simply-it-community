'use client';

import { useEffect, useState } from 'react';
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
