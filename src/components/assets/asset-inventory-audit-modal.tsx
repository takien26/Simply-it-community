'use client';

import { useLanguage } from '@/lib/i18n/context';

import { useState, useEffect, useRef } from 'react';
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
  FileSpreadsheet,
  Camera,
  Check,
  Tag,
  ShieldCheck,
  History,
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';

interface AssetInventoryAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  assets: any[];
  locations: any[];
  users: any[];
  onAssetUpdated: () => void;
}

export default function AssetInventoryAuditModal({
  isOpen,
  onClose,
  assets,
  locations,
  users,
  onAssetUpdated,
}: AssetInventoryAuditModalProps) {
  const { language } = useLanguage();
  const isEn = language === 'en';
  const [scanInput, setScanInput] = useState('');
  const [matchedAsset, setMatchedAsset] = useState<any>(null);
  const [auditList, setAuditList] = useState<Array<{ asset: any; auditedAt: Date; condition: string; locationName: string; note: string }>>([]);
  const [isAuditing, setIsAuditing] = useState(false);

  // Form edit for matched asset
  const [auditCondition, setAuditCondition] = useState('GOOD');
  const [auditStatus, setAuditStatus] = useState('IN_USE');
  const [auditLocationId, setAuditLocationId] = useState('');
  const [auditNote, setAuditNote] = useState('Đã kiểm kê tem QR thực tế');

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Search asset by tag, serial, or name
  const handleSearchAsset = (query: string) => {
    const q = query.trim().toLowerCase();
    if (!q) {
      setMatchedAsset(null);
      return;
    }

    // Try clean QR url if scanned from full URL
    let cleanQuery = q;
    if (cleanQuery.includes('/assets/')) {
      cleanQuery = cleanQuery.split('/assets/')[1].split('?')[0].split('/')[0];
    }

    const found = assets.find(
      (a) =>
        a.assetTag?.toLowerCase() === cleanQuery ||
        a.serialNumber?.toLowerCase() === cleanQuery ||
        a.id?.toLowerCase() === cleanQuery ||
        a.name?.toLowerCase().includes(cleanQuery)
    );

    if (found) {
      setMatchedAsset(found);
      setAuditCondition(found.condition || 'GOOD');
      setAuditStatus(found.status || 'IN_USE');
      setAuditLocationId(found.locationId || '');
      setAuditNote(`Kiểm kê thực tế ngày ${new Date().toLocaleDateString('vi-VN')} - Tem QR nguyên vẹn`);
    } else {
      setMatchedAsset(null);
    }
  };

  const handleConfirmAudit = async () => {
    if (!matchedAsset) return;
    setIsAuditing(true);

    try {
      const res = await fetch(`/api/assets/${matchedAsset.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          condition: auditCondition,
          status: auditStatus,
          locationId: auditLocationId || null,
          notes: matchedAsset.notes
            ? `${matchedAsset.notes}\n[Kiểm kê ${new Date().toLocaleDateString('vi-VN')}]: ${auditNote}`
            : `[Kiểm kê ${new Date().toLocaleDateString('vi-VN')}]: ${auditNote}`,
        }),
      });

      if (res.ok) {
        const locObj = locations.find((l) => l.id === auditLocationId);
        setAuditList((prev) => [
          {
            asset: matchedAsset,
            auditedAt: new Date(),
            condition: auditCondition,
            locationName: locObj?.name || 'Vị trí hiện tại',
            note: auditNote,
          },
          ...prev,
        ]);

        onAssetUpdated();
        setScanInput('');
        setMatchedAsset(null);
        setTimeout(() => inputRef.current?.focus(), 50);
      } else {
        alert('Cập nhật kiểm kê thất bại');
      }
    } catch {
      alert('Lỗi kết nối khi cập nhật kiểm kê');
    } finally {
      setIsAuditing(false);
    }
  };

  // Export Audit Session Report to CSV
  const handleExportCSV = () => {
    if (auditList.length === 0) return;
    let csv = '\uFEFFMã Tag,Tên Thiết Bị,Serial,Tình Trạng Thực Tế,Vị Trí,Thời Gian Kiểm Kê,Ghi Chú\n';
    auditList.forEach((item) => {
      csv += `"${item.asset.assetTag}","${item.asset.name}","${item.asset.serialNumber || ''}","${item.condition}","${item.locationName}","${item.auditedAt.toLocaleString('vi-VN')}","${item.note}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Bao_Cao_Kiem_Ke_QR_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const activeAssignee = matchedAsset?.assignments?.find((a: any) => !a.returnedAt)?.user || matchedAsset?.assignedTo;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full flex flex-col max-h-[92vh] border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-indigo-900 via-purple-900 to-slate-900 text-white shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
              <QrCode className="w-5 h-5 text-indigo-300" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Kiểm Kê Tài Sản Bằng Quét Mã QR / Barcode</h3>
              <p className="text-xs text-indigo-200">
                Sử dụng máy quét mã vạch, camera hoặc nhập mã Tag để xác thực thực tế tài sản
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-300 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Scanner Input Box */}
          <div className="p-4 bg-gradient-to-br from-indigo-50/80 to-purple-50/50 border border-indigo-200/80 rounded-2xl space-y-3">
            <label className="block text-xs font-bold text-indigo-950 uppercase tracking-wider flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Search className="w-4 h-4 text-indigo-600" />
                <span>Quét mã QR hoặc Nhập Mã Tag / Serial:</span>
              </span>
              <span className="text-[11px] font-normal text-indigo-700 bg-indigo-100/70 px-2 py-0.5 rounded-full">
                Sẵn sàng nhận tín hiệu máy quét
              </span>
            </label>

            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                value={scanInput}
                onChange={(e) => {
                  setScanInput(e.target.value);
                  handleSearchAsset(e.target.value);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSearchAsset(scanInput);
                  }
                }}
                placeholder="Đặt con trỏ vào đây và bấm máy quét QR (hoặc gõ ví dụ: IT-LAP-001)..."
                className="w-full pl-4 pr-10 py-3 bg-white border-2 border-indigo-300 rounded-xl text-sm font-mono font-bold text-indigo-950 outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100 shadow-inner"
              />
              {scanInput && (
                <button
                  type="button"
                  onClick={() => {
                    setScanInput('');
                    setMatchedAsset(null);
                    inputRef.current?.focus();
                  }}
                  className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Matched Asset Details & Verification Box */}
          {matchedAsset ? (
            <div className="p-5 bg-white border-2 border-emerald-300 rounded-2xl shadow-sm space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center space-x-2">
                  <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-mono font-bold">
                    {matchedAsset.assetTag}
                  </span>
                  <h4 className="font-bold text-slate-900 text-sm">{matchedAsset.name}</h4>
                </div>
                <span className="text-xs text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Tìm thấy khớp 100%</span>
                </span>
              </div>

              {/* Asset Meta Info */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 block font-bold">{isEn ? 'Current Assignee' : 'Người đang sử dụng'}</span>
                  <span className="font-bold text-slate-900 truncate block">
                    {activeAssignee ? `👤 ${activeAssignee.fullName}` : '📦 Chưa cấp phát (Kho)'}
                  </span>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 block font-bold">Vị trí hiện tại</span>
                  <span className="font-bold text-slate-900 truncate block">
                    📍 {matchedAsset.location?.name || 'Chưa thiết lập'}
                  </span>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 block font-bold">Số Serial</span>
                  <span className="font-mono text-slate-800 truncate block">
                    {matchedAsset.serialNumber || 'Chưa có'}
                  </span>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 block font-bold">Thương hiệu / Model</span>
                  <span className="font-semibold text-slate-800 truncate block">
                    {matchedAsset.brand || ''} {matchedAsset.model || ''}
                  </span>
                </div>
              </div>

              {/* Audit Controls */}
              <div className="pt-2 border-t border-slate-100 space-y-3">
                <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Cập nhật kết quả kiểm kê thực tế:
                </h5>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Tình trạng thực tế:</label>
                    <select
                      value={auditCondition}
                      onChange={(e) => setAuditCondition(e.target.value)}
                      className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="NEW">Mới (NEW)</option>
                      <option value="GOOD">Tốt (GOOD)</option>
                      <option value="FAIR">Bình thường (FAIR)</option>
                      <option value="POOR">Xuống cấp (POOR)</option>
                      <option value="BROKEN">Hỏng hóc (BROKEN)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Trạng thái:</label>
                    <select
                      value={auditStatus}
                      onChange={(e) => setAuditStatus(e.target.value)}
                      className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="IN_USE">Đang sử dụng</option>
                      <option value="AVAILABLE">Sẵn sàng trong kho</option>
                      <option value="MAINTENANCE">Đang bảo trì / sửa chữa</option>
                      <option value="RETIRED">Thanh lý / Ngừng sử dụng</option>
                      <option value="LOST">Thất lạc</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Vị trí kiểm kê:</label>
                    <select
                      value={auditLocationId}
                      onChange={(e) => setAuditLocationId(e.target.value)}
                      className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="">-- Giữ nguyên vị trí --</option>
                      {locations.map((loc) => (
                        <option key={loc.id} value={loc.id}>
                          {loc.name} {loc.building ? `(${loc.building})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Ghi chú kiểm kê:</label>
                  <input
                    type="text"
                    value={auditNote}
                    onChange={(e) => setAuditNote(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={handleConfirmAudit}
                    disabled={isAuditing}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-1.5 cursor-pointer transition-all"
                  >
                    <Check className="w-4 h-4" />
                    <span>✓ Xác Nhận Đã Kiểm Kê Thiết Bị Này</span>
                  </button>
                </div>
              </div>
            </div>
          ) : scanInput ? (
            <div className="p-6 bg-slate-50 border border-dashed border-slate-300 rounded-2xl text-center space-y-1">
              <p className="text-xs font-bold text-slate-700">Không tìm thấy thiết bị khớp với mã: "{scanInput}"</p>
              <p className="text-[11px] text-slate-400">Vui lòng kiểm tra lại mã tem QR hoặc mã serial của thiết bị</p>
            </div>
          ) : null}

          {/* Audited Session History */}
          <div className="space-y-3 pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <History className="w-4 h-4 text-purple-600" />
                <span>Tiến độ đợt kiểm kê ({auditList.length} thiết bị đã quét)</span>
              </h4>

              {auditList.length > 0 && (
                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="px-3 py-1 bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-purple-600" />
                  <span>Xuất File Báo Cáo (CSV)</span>
                </button>
              )}
            </div>

            {auditList.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-4 text-center bg-slate-50 rounded-xl border border-slate-200">
                Chưa có thiết bị nào được quét trong phiên làm việc này. Hãy quét mã QR đầu tiên!
              </p>
            ) : (
              <div className="max-h-48 overflow-y-auto space-y-1.5 border border-slate-200 rounded-xl p-2 bg-slate-50">
                {auditList.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 bg-white rounded-lg border border-slate-200 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center space-x-2">
                      <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-[10px]">
                        {idx + 1}
                      </span>
                      <span className="font-mono font-bold text-purple-700 bg-purple-50 px-1.5 py-0.2 rounded">
                        {item.asset.assetTag}
                      </span>
                      <span className="font-bold text-slate-900">{item.asset.name}</span>
                      <span className="text-[10px] text-slate-400">• {item.locationName}</span>
                    </div>

                    <div className="flex items-center space-x-2 text-[11px]">
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full font-bold">
                        {item.condition}
                      </span>
                      <span className="text-slate-400 font-mono">
                        {item.auditedAt.toLocaleTimeString('vi-VN')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-slate-100 bg-slate-50 rounded-b-3xl shrink-0">
          <div className="text-xs text-slate-500">
            Tổng cộng: <strong className="text-purple-700">{auditList.length}</strong> thiết bị đã được kiểm kê thành công
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 border border-slate-300 bg-white hover:bg-slate-50 rounded-xl text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
          >
            Đóng (Esc)
          </button>
        </div>
      </div>
    </div>
  );
}
