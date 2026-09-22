'use client';

import { useLanguage } from '@/lib/i18n/context';
import { useState, useEffect, useRef } from 'react';
import {
  X,
  Printer,
  FileText,
  CheckCircle2,
  User,
  Shield,
  Calendar,
  Building,
  Check,
  Plus,
  Trash2,
  Sparkles,
  Download,
  Eye,
  Loader2,
  PenTool,
  Search,
  PackageCheck,
  Layers,
  FileSpreadsheet,
} from 'lucide-react';
import SignaturePadModal from './SignaturePadModal';
import { formatDate } from '@/lib/utils';

interface BulkAssetHandoverModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedAssets: any[];
  allAvailableAssets?: any[];
  users?: any[];
  onComplete: () => void;
}

const DEFAULT_TERMS = [
  'Bên nhận đã kiểm tra thực tế và xác nhận tất cả các thiết bị nêu trên hoạt động tốt, đầy đủ phụ kiện.'.normalize('NFC'),
  'Người sử dụng có trách nhiệm bảo quản tài sản, sử dụng đúng mục đích công việc, không tự ý tháo lắp, thay đổi linh kiện hoặc cài đặt phần mềm không hợp lệ.'.normalize('NFC'),
  'Khi thiết bị phát sinh sự cố, hỏng hóc hoặc cần nâng cấp, người sử dụng phải thông báo ngay cho Bộ phận CNTT để xử lý.'.normalize('NFC'),
  'Trường hợp chấm dứt hợp đồng lao động hoặc chuyển đổi vị trí công tác, người sử dụng có nghĩa vụ hoàn trả đầy đủ các thiết bị và phụ kiện cho Bộ phận CNTT.'.normalize('NFC'),
];

export default function BulkAssetHandoverModal({
  isOpen,
  onClose,
  selectedAssets = [],
  allAvailableAssets = [],
  users = [],
  onComplete,
}: BulkAssetHandoverModalProps) {
  const { language } = useLanguage();
  const isEn = language === 'en';

  // ESC key listener
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Tab State: 'CONFIG' | 'PREVIEW'
  const [activeTab, setActiveTab] = useState<'CONFIG' | 'PREVIEW'>('CONFIG');

  // List of items in current handover batch
  const [assetList, setAssetList] = useState<any[]>([]);
  const [itemSpecs, setItemSpecs] = useState<Record<string, { condition: string; accessories: string }>>({});

  // Meta Document Info
  const [docNumber, setDocNumber] = useState('');
  const [handoverDate, setHandoverDate] = useState('');
  const [locationName, setLocationName] = useState('Văn phòng Công ty');
  const [companyName, setCompanyName] = useState('CÔNG TY CỔ PHẦN TẬP ĐOÀN');
  const [departmentName, setDepartmentName] = useState('Phòng Công Nghệ Thông Tin');

  // Giver info (Bên A - IT)
  const [giverName, setGiverName] = useState('');
  const [giverTitle, setGiverTitle] = useState('Quản trị viên IT');
  const [giverDept, setGiverDept] = useState('Bộ phận CNTT');
  const [giverPhone, setGiverPhone] = useState('');

  // Receiver info (Bên B - Nhân viên tiếp nhận)
  const [selectedUserId, setSelectedUserId] = useState('');
  const [receiverName, setReceiverName] = useState('');
  const [receiverEmail, setReceiverEmail] = useState('');
  const [receiverDept, setReceiverDept] = useState('');
  const [receiverTitle, setReceiverTitle] = useState('');
  const [receiverPhone, setReceiverPhone] = useState('');

  // Digital Signatures
  const [receiverSignature, setReceiverSignature] = useState<string | null>(null);
  const [giverSignature, setGiverSignature] = useState<string | null>(null);
  const [activeSigner, setActiveSigner] = useState<'RECEIVER' | 'GIVER' | null>(null);

  // General notes & terms
  const [terms, setTerms] = useState<string[]>(DEFAULT_TERMS);
  const [generalNotes, setGeneralNotes] = useState('');

  // Asset search & adding
  const [assetSearchTerm, setAssetSearchTerm] = useState('');
  const [isAssetDropdownOpen, setIsAssetDropdownOpen] = useState(false);

  // Submitting
  const [submitting, setSubmitting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  // Printable Iframe ref
  const printIframeRef = useRef<HTMLIFrameElement>(null);

  // Initialize data on open
  useEffect(() => {
    if (!isOpen) return;

    // Set initial assets
    setAssetList([...selectedAssets]);

    // Initialize item specs map
    const initialSpecs: Record<string, { condition: string; accessories: string }> = {};
    selectedAssets.forEach((a) => {
      initialSpecs[a.id] = {
        condition: a.condition === 'NEW' ? 'Mới 100%, hoạt động tốt' : 'Đang hoạt động tốt, nguyên vẹn',
        accessories: a.category?.name?.toLowerCase().includes('laptop')
          ? 'Củ sạc zin, Cáp nguồn, Túi xách, Chuột máy tính'
          : a.category?.name?.toLowerCase().includes('màn hình') || a.category?.name?.toLowerCase().includes('monitor')
          ? 'Cáp nguồn, Cáp HDMI/DisplayPort, Chân đế'
          : 'Đầy đủ phụ kiện theo máy',
      };
    });
    setItemSpecs(initialSpecs);

    // Auto-generate Document Number
    const d = new Date();
    const dateCode = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
    const randomCode = Math.floor(100 + Math.random() * 900);
    setDocNumber(`BBBG-${dateCode}/${randomCode}`);

    // Formatted date
    setHandoverDate(`Ngày ${d.getDate()} tháng ${d.getMonth() + 1} năm ${d.getFullYear()}`);

    // Load current user and company settings
    loadCompanySettings();
    setIsCompleted(false);
    setActiveTab('CONFIG');
    setReceiverSignature(null);
    setGiverSignature(null);
  }, [isOpen, selectedAssets]);

  const loadCompanySettings = async () => {
    try {
      // 1. Get current logged in IT user
      const userRes = await fetch('/api/auth/me');
      const userData = await userRes.json();
      if (userData.success && userData.data) {
        setGiverName(userData.data.fullName || '');
        setGiverTitle(userData.data.position || 'Quản trị viên IT');
        setGiverDept(userData.data.department || 'Bộ phận CNTT');
        setGiverPhone(userData.data.phone || '');
      }

      // 2. Get company settings
      const setRes = await fetch('/api/settings');
      const setData = await setRes.json();
      const sList = Array.isArray(setData) ? setData : setData.data || [];
      const compSetting = sList.find((s: any) => s.key === 'app.company_name');
      if (compSetting && compSetting.value) {
        setCompanyName(compSetting.value.toUpperCase());
      }
    } catch {}
  };

  // Handle user select for receiver
  const handleSelectUser = (userId: string) => {
    setSelectedUserId(userId);
    const u = users.find((item) => item.id === userId);
    if (u) {
      setReceiverName(u.fullName || '');
      setReceiverEmail(u.email || '');
      setReceiverDept(u.department || '');
      setReceiverTitle(u.position || '');
      setReceiverPhone(u.phone || '');
    } else {
      setReceiverName('');
      setReceiverEmail('');
      setReceiverDept('');
      setReceiverTitle('');
      setReceiverPhone('');
    }
  };

  // Remove asset from batch
  const handleRemoveAsset = (assetId: string) => {
    setAssetList((prev) => prev.filter((a) => a.id !== assetId));
  };

  // Add asset to batch
  const handleAddAsset = (asset: any) => {
    if (assetList.some((a) => a.id === asset.id)) return;
    setAssetList((prev) => [...prev, asset]);
    setItemSpecs((prev) => ({
      ...prev,
      [asset.id]: {
        condition: 'Đang hoạt động tốt, nguyên vẹn',
        accessories: 'Đầy đủ phụ kiện theo máy',
      },
    }));
    setIsAssetDropdownOpen(false);
    setAssetSearchTerm('');
  };

  // Update specs for a specific asset
  const handleUpdateItemSpec = (assetId: string, field: 'condition' | 'accessories', val: string) => {
    setItemSpecs((prev) => ({
      ...prev,
      [assetId]: {
        ...prev[assetId],
        [field]: val,
      },
    }));
  };

  // Submit bulk handover to server
  const handleConfirmHandover = async () => {
    if (assetList.length === 0) {
      alert(isEn ? 'Please select at least one asset' : 'Vui lòng chọn ít nhất một thiết bị để bàn giao');
      return;
    }
    if (!selectedUserId) {
      alert(isEn ? 'Please select the receiver' : 'Vui lòng chọn nhân viên tiếp nhận bàn giao');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/assets/bulk-handover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assetIds: assetList.map((a) => a.id),
          receiverId: selectedUserId,
          docNumber,
          handoverDate,
          locationName,
          notes: generalNotes,
          itemSpecs,
          receiverSignature,
          giverSignature,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setIsCompleted(true);
        setActiveTab('PREVIEW');
        onComplete();
      } else {
        alert(data.error || 'Bàn giao thất bại');
      }
    } catch (e: any) {
      alert(e.message || 'Lỗi kết nối khi bàn giao');
    } finally {
      setSubmitting(false);
    }
  };

  // Direct Print via hidden iframe
  const handlePrint = () => {
    const printContent = document.getElementById('bulk-handover-print-document');
    if (!printContent) return;

    let iframe = printIframeRef.current;
    if (!iframe) {
      iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      document.body.appendChild(iframe);
      // @ts-ignore
      printIframeRef.current = iframe;
    }

    const doc = iframe.contentWindow?.document;
    if (!doc) return;

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${docNumber} - Bien Ban Ban Giao</title>
        <meta charset="utf-8" />
        <style>
          @page { size: A4 portrait; margin: 15mm 15mm 15mm 15mm; }
          * { box-sizing: border-box; }
          body { font-family: 'Times New Roman', Times, serif; font-size: 13pt; line-height: 1.4; color: #000; margin: 0; padding: 0; }
          table { width: 100%; border-collapse: collapse; margin: 10px 0; }
          th, td { border: 1px solid #000; padding: 6px 8px; font-size: 11pt; }
          th { background-color: #f2f2f2; text-align: center; font-weight: bold; }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .font-bold { font-weight: bold; }
          .uppercase { text-transform: uppercase; }
          .italic { font-style: italic; }
          .no-border { border: none !important; }
          .signature-box { height: 75px; display: flex; align-items: center; justify-content: center; }
          .signature-img { max-height: 65px; max-width: 180px; object-fit: contain; }
        </style>
      </head>
      <body>
        ${printContent.innerHTML}
      </body>
      </html>
    `);
    doc.close();

    setTimeout(() => {
      iframe?.contentWindow?.focus();
      iframe?.contentWindow?.print();
    }, 400);
  };

  if (!isOpen) return null;

  // Filter available assets to add
  const availableToAdd = allAvailableAssets.filter(
    (a) =>
      !assetList.some((selected) => selected.id === a.id) &&
      (a.assetTag?.toLowerCase().includes(assetSearchTerm.toLowerCase()) ||
        a.name?.toLowerCase().includes(assetSearchTerm.toLowerCase()) ||
        a.serialNumber?.toLowerCase().includes(assetSearchTerm.toLowerCase()))
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-3 sm:p-5">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-5xl w-full border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95">
        
        {/* MODAL HEADER */}
        <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/20">
              <PackageCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
                  {isEn ? 'Bulk IT Asset Handover' : 'Bàn Giao Thiết Bị & Tài Sản Hàng Loạt'}
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                  {assetList.length} {isEn ? 'devices' : 'thiết bị'}
                </span>
                {isCompleted && (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{isEn ? 'Handover Completed' : 'Đã hoàn tất bàn giao'}</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {isEn
                  ? 'Generate unified handover document, sign digitally, export PDF, and update inventory in one click.'
                  : 'Lập một biên bản gộp cho nhiều thiết bị, ký chữ ký điện tử kép, xuất PDF và gán tài sản 1-click.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* TAB SWITCHER */}
            <div className="flex items-center bg-slate-200/70 dark:bg-slate-800 p-1 rounded-2xl text-xs font-bold mr-2">
              <button
                type="button"
                onClick={() => setActiveTab('CONFIG')}
                className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                  activeTab === 'CONFIG'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <span>📝 {isEn ? 'Setup & Items' : '1. Thiết lập & Danh mục'}</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('PREVIEW')}
                className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                  activeTab === 'PREVIEW'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <span>📄 {isEn ? 'Print / PDF Preview' : '2. Xem trước & In PDF (A4)'}</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* MODAL BODY */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">

          {/* ======================================================== */}
          {/* TAB 1: CONFIG & ASSET LIST */}
          {/* ======================================================== */}
          {activeTab === 'CONFIG' && (
            <div className="space-y-6 text-xs">
              {/* SECTION: RECEIVER & GIVER SETUP */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* RECEIVER BOX (BÊN B) */}
                <div className="p-4 bg-blue-50/60 dark:bg-blue-950/20 rounded-2xl border border-blue-200/80 dark:border-blue-900/50 space-y-3">
                  <div className="flex items-center justify-between pb-1.5 border-b border-blue-200/60 dark:border-blue-900/60">
                    <span className="font-extrabold text-blue-950 dark:text-blue-200 text-xs flex items-center gap-1.5">
                      <User className="w-4 h-4 text-blue-600" />
                      <span>{isEn ? 'RECEIVER (PARTY B - EMPLOYEE)' : 'NGƯỜI TIẾP NHẬN (BÊN B - NHÂN SỰ)'}</span>
                      <span className="text-rose-500">*</span>
                    </span>
                    <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                      {isEn ? 'Required' : 'Bắt buộc'}
                    </span>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      {isEn ? 'Select Employee' : 'Chọn nhân sự tiếp nhận'}
                    </label>
                    <select
                      value={selectedUserId}
                      onChange={(e) => handleSelectUser(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl font-bold text-slate-800 dark:text-white outline-none focus:border-blue-500 cursor-pointer"
                    >
                      <option value="">-- {isEn ? 'Select Employee' : 'Chọn nhân viên từ danh bạ'} --</option>
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.fullName} ({u.department || 'Chưa rõ PB'}) - {u.email}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 mb-0.5">{isEn ? 'Full Name' : 'Họ và tên'}</label>
                      <input
                        type="text"
                        value={receiverName}
                        onChange={(e) => setReceiverName(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 mb-0.5">{isEn ? 'Department' : 'Phòng ban'}</label>
                      <input
                        type="text"
                        value={receiverDept}
                        onChange={(e) => setReceiverDept(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 mb-0.5">{isEn ? 'Position' : 'Chức vụ'}</label>
                      <input
                        type="text"
                        value={receiverTitle}
                        onChange={(e) => setReceiverTitle(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 mb-0.5">{isEn ? 'Work Email' : 'Email'}</label>
                      <input
                        type="text"
                        value={receiverEmail}
                        onChange={(e) => setReceiverEmail(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                      />
                    </div>
                  </div>
                </div>

                {/* GIVER BOX (BÊN A) */}
                <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-200 dark:border-slate-700">
                    <span className="font-extrabold text-slate-800 dark:text-slate-200 text-xs flex items-center gap-1.5">
                      <Shield className="w-4 h-4 text-indigo-600" />
                      <span>{isEn ? 'GIVER (PARTY A - IT DEPARTMENT)' : 'NGƯỜI BÀN GIAO (BÊN A - BỘ PHẬN CNTT)'}</span>
                    </span>
                    <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-full">
                      IT Admin
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 mb-0.5">{isEn ? 'IT Staff Name' : 'Họ tên IT'}</label>
                      <input
                        type="text"
                        value={giverName}
                        onChange={(e) => setGiverName(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 mb-0.5">{isEn ? 'Role' : 'Chức vụ'}</label>
                      <input
                        type="text"
                        value={giverTitle}
                        onChange={(e) => setGiverTitle(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 mb-0.5">{isEn ? 'Department' : 'Bộ phận'}</label>
                      <input
                        type="text"
                        value={giverDept}
                        onChange={(e) => setGiverDept(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 mb-0.5">{isEn ? 'Phone' : 'Số điện thoại'}</label>
                      <input
                        type="text"
                        value={giverPhone}
                        onChange={(e) => setGiverPhone(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 mb-0.5">{isEn ? 'Document No.' : 'Số biên bản'}</label>
                      <input
                        type="text"
                        value={docNumber}
                        onChange={(e) => setDocNumber(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono font-bold text-blue-600"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 mb-0.5">{isEn ? 'Location' : 'Địa điểm'}</label>
                      <input
                        type="text"
                        value={locationName}
                        onChange={(e) => setLocationName(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION: ASSET INVENTORY TABLE */}
              <div className="space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                      <span>📦 {isEn ? 'Assets In This Handover Batch' : 'Danh Sách Thiết Bị Bàn Giao Hàng Loạt'}</span>
                      <span className="text-xs font-bold text-blue-600 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-md">
                        {assetList.length} món
                      </span>
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      {isEn
                        ? 'Inspect conditions and accessories for each asset. You can add or remove items.'
                        : 'Kiểm tra tình trạng và phụ kiện cho từng thiết bị trước khi ký biên bản.'}
                    </p>
                  </div>

                  {/* ADD MORE ASSET BUTTON & POPOVER */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIsAssetDropdownOpen(!isAssetDropdownOpen)}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer transition-all"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{isEn ? 'Add Asset to Batch' : 'Thêm thiết bị vào đợt này'}</span>
                    </button>

                    {isAssetDropdownOpen && (
                      <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-2.5 z-50 space-y-2 animate-in fade-in zoom-in-95">
                        <div className="relative">
                          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                          <input
                            type="text"
                            autoFocus
                            placeholder={isEn ? 'Search tag, name, serial...' : 'Tìm mã TS, tên máy, serial...'}
                            value={assetSearchTerm}
                            onChange={(e) => setAssetSearchTerm(e.target.value)}
                            className="w-full pl-8 pr-2 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:border-blue-500"
                          />
                        </div>

                        <div className="max-h-56 overflow-y-auto space-y-1">
                          {availableToAdd.slice(0, 15).map((a) => (
                            <button
                              key={a.id}
                              type="button"
                              onClick={() => handleAddAsset(a)}
                              className="w-full p-2 text-left hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-xl flex items-center justify-between group transition-colors cursor-pointer"
                            >
                              <div className="min-w-0 pr-2">
                                <p className="font-bold text-slate-800 dark:text-slate-200 truncate flex items-center gap-1.5">
                                  <span className="font-mono text-blue-600 text-[11px]">{a.assetTag}</span>
                                  <span>{a.name}</span>
                                </p>
                                <p className="text-[10px] text-slate-400 truncate">
                                  {a.model ? `${a.model} • ` : ''}{a.serialNumber ? `S/N: ${a.serialNumber}` : ''}
                                </p>
                              </div>
                              <Plus className="w-4 h-4 text-slate-400 group-hover:text-blue-600 shrink-0" />
                            </button>
                          ))}

                          {availableToAdd.length === 0 && (
                            <div className="py-4 text-center text-slate-400 text-xs">
                              {isEn ? 'No matching assets' : 'Không tìm thấy thiết bị khả dụng'}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* ASSET ITEMS LIST */}
                <div className="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden shadow-2xs">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-[10px] font-bold text-slate-500 uppercase">
                      <tr>
                        <th className="py-2.5 px-3 w-10 text-center">#</th>
                        <th className="py-2.5 px-3 w-32">{isEn ? 'Asset Tag' : 'Mã Tài Sản'}</th>
                        <th className="py-2.5 px-3">{isEn ? 'Device & Model' : 'Tên Thiết Bị & Model'}</th>
                        <th className="py-2.5 px-3 w-36">{isEn ? 'Serial (S/N)' : 'Số Serial (S/N)'}</th>
                        <th className="py-2.5 px-3 min-w-[160px]">{isEn ? 'Condition' : 'Tình Trạng'}</th>
                        <th className="py-2.5 px-3 min-w-[200px]">{isEn ? 'Accessories' : 'Phụ Kiện Đi Kèm'}</th>
                        <th className="py-2.5 px-3 w-12 text-center">{isEn ? 'Del' : 'Xóa'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {assetList.map((asset, index) => {
                        const spec = itemSpecs[asset.id] || {
                          condition: 'Đang hoạt động tốt',
                          accessories: 'Đầy đủ phụ kiện',
                        };

                        return (
                          <tr key={asset.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors">
                            <td className="py-2.5 px-3 text-center font-bold text-slate-400">{index + 1}</td>
                            <td className="py-2.5 px-3">
                              <span className="font-mono font-bold text-blue-600 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-md text-[11px]">
                                {asset.assetTag}
                              </span>
                            </td>
                            <td className="py-2.5 px-3">
                              <p className="font-bold text-slate-900 dark:text-white truncate max-w-[200px]" title={asset.name}>
                                {asset.name}
                              </p>
                              <p className="text-[10px] text-slate-400 truncate max-w-[200px]">
                                {asset.brand ? `${asset.brand} ` : ''}{asset.model || ''}
                              </p>
                            </td>
                            <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-slate-300 text-[11px]">
                              {asset.serialNumber || '—'}
                            </td>
                            <td className="py-2 px-3">
                              <input
                                type="text"
                                value={spec.condition}
                                onChange={(e) => handleUpdateItemSpec(asset.id, 'condition', e.target.value)}
                                className="w-full px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                                placeholder="VD: Mới 100%, ngoại hình đẹp..."
                              />
                            </td>
                            <td className="py-2 px-3">
                              <input
                                type="text"
                                value={spec.accessories}
                                onChange={(e) => handleUpdateItemSpec(asset.id, 'accessories', e.target.value)}
                                className="w-full px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                                placeholder="VD: Sạc zin, cáp nguồn, túi chống sốc..."
                              />
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveAsset(asset.id)}
                                title={isEn ? 'Remove from batch' : 'Xóa khỏi danh sách bàn giao'}
                                className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}

                      {assetList.length === 0 && (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-slate-400">
                            {isEn ? 'No assets selected. Click "Add Asset to Batch" above.' : 'Chưa có thiết bị nào. Bấm "Thêm thiết bị vào đợt này" ở trên.'}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* SECTION: DIGITAL SIGNATURES & CONFIRMATION */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-slate-900 dark:text-white text-xs flex items-center gap-2">
                    <PenTool className="w-4 h-4 text-blue-600" />
                    <span>{isEn ? 'Dual Digital Signatures (Legally Binding)' : 'Chữ Ký Điện Tử Kép (Bên Giao IT & Bên Nhận)'}</span>
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {isEn ? 'Sign directly on screen/tablet or via mouse' : 'Ký trực tiếp trên màn hình cảm ứng, iPad hoặc chuột'}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* GIVER SIGNATURE (BÊN A) */}
                  <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-center space-y-2">
                    <p className="font-bold text-slate-700 dark:text-slate-300 text-xs">
                      {isEn ? 'Party A (IT Department)' : 'BÊN GIAO (ĐẠI DIỆN CNTT)'}
                    </p>
                    <p className="text-[11px] text-slate-400 font-medium">{giverName || 'Quản trị viên IT'}</p>

                    <div className="h-24 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-center p-2 bg-slate-50/50 dark:bg-slate-800/50 overflow-hidden">
                      {giverSignature ? (
                        <img src={giverSignature} alt="Chữ ký Bên A" className="max-h-20 max-w-[200px] object-contain" />
                      ) : (
                        <span className="text-slate-400 text-xs italic">{isEn ? 'No signature yet' : 'Chưa có chữ ký'}</span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => setActiveSigner('GIVER')}
                      className="px-4 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 rounded-xl text-xs font-bold cursor-pointer transition-colors"
                    >
                      {giverSignature ? (isEn ? 'Change Signature' : 'Ký lại Bên A') : (isEn ? 'Sign Now (Party A)' : 'Ký tên Bên A')}
                    </button>
                  </div>

                  {/* RECEIVER SIGNATURE (BÊN B) */}
                  <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-center space-y-2">
                    <p className="font-bold text-slate-700 dark:text-slate-300 text-xs">
                      {isEn ? 'Party B (Employee Receiver)' : 'BÊN NHẬN (NHÂN VIÊN TIẾP NHẬN)'}
                    </p>
                    <p className="text-[11px] text-slate-400 font-medium">{receiverName || 'Nhân sự tiếp nhận'}</p>

                    <div className="h-24 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-center p-2 bg-slate-50/50 dark:bg-slate-800/50 overflow-hidden">
                      {receiverSignature ? (
                        <img src={receiverSignature} alt="Chữ ký Bên B" className="max-h-20 max-w-[200px] object-contain" />
                      ) : (
                        <span className="text-slate-400 text-xs italic">{isEn ? 'No signature yet' : 'Chưa có chữ ký'}</span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => setActiveSigner('RECEIVER')}
                      className="px-4 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 rounded-xl text-xs font-bold cursor-pointer transition-colors"
                    >
                      {receiverSignature ? (isEn ? 'Change Signature' : 'Ký lại Bên B') : (isEn ? 'Sign Now (Party B)' : 'Ký tên Bên B')}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 2: PRINT / PDF PREVIEW (A4 ENTERPRISE TEMPLATE) */}
          {/* ======================================================== */}
          {activeTab === 'PREVIEW' && (
            <div className="space-y-4">
              {/* ACTION TOOLBAR ABOVE PREVIEW */}
              <div className="flex items-center justify-between bg-slate-100 dark:bg-slate-800 p-3 rounded-2xl">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    📄 {isEn ? 'Standard A4 Minutes Preview' : 'Xem trước Biên bản Bàn giao A4'}
                  </span>
                  {isCompleted && (
                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 dark:bg-emerald-950 px-2.5 py-0.5 rounded-full">
                      ✓ Đã lưu vào hệ thống
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('CONFIG')}
                    className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 cursor-pointer"
                  >
                    {isEn ? '← Edit Info' : '← Sửa thông tin'}
                  </button>
                  <button
                    type="button"
                    onClick={handlePrint}
                    className="px-4 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-500/20 cursor-pointer transition-all"
                  >
                    <Printer className="w-4 h-4" />
                    <span>{isEn ? 'Print / Export to PDF' : 'In Ấn / Xuất File PDF'}</span>
                  </button>
                </div>
              </div>

              {/* DOCUMENT A4 PAGE CONTAINER */}
              <div className="bg-slate-200/60 dark:bg-slate-950 p-4 sm:p-8 rounded-2xl flex justify-center overflow-x-auto">
                <div
                  id="bulk-handover-print-document"
                  className="bg-white text-black p-8 sm:p-12 max-w-[210mm] w-full min-h-[297mm] shadow-xl text-[12pt] leading-relaxed font-serif"
                  style={{ fontFamily: "'Times New Roman', Times, serif" }}
                >
                  {/* NATIONAL HEADER */}
                  <div className="grid grid-cols-2 gap-4 pb-4 border-b border-black/10">
                    <div className="text-center">
                      <p className="font-bold text-[11pt] uppercase">{companyName}</p>
                      <p className="font-bold text-[10.5pt] uppercase underline">{departmentName}</p>
                      <p className="text-[10pt] italic mt-1">Số: {docNumber}</p>
                    </div>
                    <div className="text-center">
                      <p className="font-bold text-[11pt] uppercase">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
                      <p className="font-bold text-[11pt]">Độc lập - Tự do - Hạnh phúc</p>
                      <p className="text-[10pt] italic mt-1">{handoverDate}</p>
                    </div>
                  </div>

                  {/* DOCUMENT TITLE */}
                  <div className="text-center py-5 space-y-1">
                    <h1 className="text-[16pt] font-black uppercase tracking-tight">
                      BIÊN BẢN BÀN GIAO THIẾT BỊ VÀ TÀI SẢN CNTT
                    </h1>
                    <p className="text-[11pt] italic text-slate-600">
                      (V/v: Cấp phát trang thiết bị làm việc cho nhân sự)
                    </p>
                  </div>

                  {/* TIME & LOCATION */}
                  <div className="space-y-1 text-[11.5pt] mb-4">
                    <p>• <strong>Thời gian bàn giao:</strong> {handoverDate}</p>
                    <p>• <strong>Địa điểm bàn giao:</strong> {locationName}</p>
                  </div>

                  {/* REPRESENTATIVES */}
                  <div className="space-y-3 mb-4 text-[11.5pt]">
                    {/* PARTY A */}
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                      <p className="font-bold uppercase text-[11pt]">BÊN GIAO (BÊN A) - BỘ PHẬN CÔNG NGHỆ THÔNG TIN:</p>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-1 text-[11pt]">
                        <p>• Họ và tên: <strong>{giverName || '...................................................'}</strong></p>
                        <p>• Chức vụ: {giverTitle || 'Quản trị viên IT'}</p>
                        <p>• Bộ phận: {giverDept || 'Phòng CNTT'}</p>
                        <p>• Điện thoại: {giverPhone || '..................................'}</p>
                      </div>
                    </div>

                    {/* PARTY B */}
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                      <p className="font-bold uppercase text-[11pt]">BÊN NHẬN (BÊN B) - NHÂN VIÊN TIẾP NHẬN:</p>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-1 text-[11pt]">
                        <p>• Họ và tên: <strong>{receiverName || '...................................................'}</strong></p>
                        <p>• Chức danh: {receiverTitle || 'Nhân viên'}</p>
                        <p>• Phòng ban: <strong>{receiverDept || '..................................'}</strong></p>
                        <p>• Email: {receiverEmail || '..................................'}</p>
                      </div>
                    </div>
                  </div>

                  {/* ASSET INVENTORY TABLE */}
                  <div className="space-y-2 mb-4">
                    <p className="font-bold text-[11.5pt]">
                      I. DANH MỤC THIẾT BỊ BÀN GIAO (Tổng cộng: {assetList.length} thiết bị):
                    </p>
                    <table className="w-full text-left text-[10.5pt] border-collapse" style={{ border: '1px solid black' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#f2f2f2' }}>
                          <th style={{ border: '1px solid black', padding: '6px 4px', textAlign: 'center', width: '35px' }}>STT</th>
                          <th style={{ border: '1px solid black', padding: '6px', width: '95px', textAlign: 'center' }}>Mã Tài Sản</th>
                          <th style={{ border: '1px solid black', padding: '6px' }}>Tên Thiết Bị & Model</th>
                          <th style={{ border: '1px solid black', padding: '6px', width: '110px' }}>Số Serial (S/N)</th>
                          <th style={{ border: '1px solid black', padding: '6px', width: '130px' }}>Tình Trạng</th>
                          <th style={{ border: '1px solid black', padding: '6px' }}>Phụ Kiện Kèm Theo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {assetList.map((item, idx) => {
                          const spec = itemSpecs[item.id] || {
                            condition: 'Hoạt động tốt',
                            accessories: 'Đầy đủ',
                          };
                          return (
                            <tr key={item.id}>
                              <td style={{ border: '1px solid black', padding: '6px 4px', textAlign: 'center', fontWeight: 'bold' }}>{idx + 1}</td>
                              <td style={{ border: '1px solid black', padding: '6px', fontFamily: 'monospace', fontWeight: 'bold', textAlign: 'center' }}>
                                {item.assetTag}
                              </td>
                              <td style={{ border: '1px solid black', padding: '6px' }}>
                                <strong>{item.name}</strong>
                                {item.model && <span className="block text-[9.5pt] text-slate-600">{item.model}</span>}
                              </td>
                              <td style={{ border: '1px solid black', padding: '6px', fontFamily: 'monospace' }}>
                                {item.serialNumber || '—'}
                              </td>
                              <td style={{ border: '1px solid black', padding: '6px' }}>{spec.condition}</td>
                              <td style={{ border: '1px solid black', padding: '6px' }}>{spec.accessories}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* TERMS & RESPONSIBILITIES */}
                  <div className="space-y-1.5 mb-6 text-[10.5pt]">
                    <p className="font-bold text-[11.5pt]">II. TRÁCH NHIỆM VÀ CAM KẾT CỦA BÊN NHẬN:</p>
                    <ol className="list-decimal pl-5 space-y-1">
                      {terms.map((t, idx) => (
                        <li key={idx}>{t}</li>
                      ))}
                    </ol>
                  </div>

                  {/* SIGNATURE SECTION */}
                  <div className="grid grid-cols-2 gap-4 pt-4 text-center text-[11.5pt]">
                    <div>
                      <p className="font-bold uppercase">ĐẠI DIỆN BÊN A (NGƯỜI GIAO)</p>
                      <p className="italic text-[10pt] text-slate-500">(Ký, ghi rõ họ tên)</p>
                      <div className="h-20 flex items-center justify-center my-1">
                        {giverSignature ? (
                          <img src={giverSignature} alt="Chữ ký Bên A" className="max-h-16 max-w-[170px] object-contain" />
                        ) : (
                          <div className="h-14"></div>
                        )}
                      </div>
                      <p className="font-bold">{giverName || 'Quản trị viên IT'}</p>
                    </div>

                    <div>
                      <p className="font-bold uppercase">ĐẠI DIỆN BÊN B (NGƯỜI NHẬN)</p>
                      <p className="italic text-[10pt] text-slate-500">(Ký, ghi rõ họ tên)</p>
                      <div className="h-20 flex items-center justify-center my-1">
                        {receiverSignature ? (
                          <img src={receiverSignature} alt="Chữ ký Bên B" className="max-h-16 max-w-[170px] object-contain" />
                        ) : (
                          <div className="h-14"></div>
                        )}
                      </div>
                      <p className="font-bold">{receiverName || 'Nhân viên tiếp nhận'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            <span>{isEn ? 'Selected:' : 'Đang chọn:'} </span>
            <strong className="text-slate-900 dark:text-white">{assetList.length} {isEn ? 'assets' : 'thiết bị'}</strong>
            {receiverName && (
              <span> | {isEn ? 'Assignee:' : 'Bàn giao cho:'} <strong className="text-blue-600">{receiverName}</strong></span>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 cursor-pointer"
            >
              {isEn ? 'Close' : 'Đóng'}
            </button>

            {activeTab === 'CONFIG' ? (
              <button
                type="button"
                disabled={submitting || assetList.length === 0 || !selectedUserId}
                onClick={handleConfirmHandover}
                className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 cursor-pointer flex items-center gap-2 transition-all"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <PackageCheck className="w-4 h-4" />}
                <span>
                  {isEn
                    ? `Confirm & Handover (${assetList.length} Assets)`
                    : `Xác Nhận & Hoàn Tất Bàn Giao (${assetList.length} Thiết Bị)`}
                </span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handlePrint}
                className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-500/20 cursor-pointer flex items-center gap-2 transition-all"
              >
                <Printer className="w-4 h-4" />
                <span>{isEn ? 'Print / Export PDF' : 'In Biên Bản / Xuất PDF'}</span>
              </button>
            )}
          </div>
        </div>

        {/* DIGITAL SIGNATURE PAD POPUP */}
        {activeSigner && (
          <SignaturePadModal
            isOpen={!!activeSigner}
            onClose={() => setActiveSigner(null)}
            signerRole={
              activeSigner === 'GIVER'
                ? (isEn ? 'Party A (IT Department)' : 'Bên A (Bộ phận CNTT)')
                : (isEn ? 'Party B (Employee Receiver)' : 'Bên B (Nhân viên tiếp nhận)')
            }
            signerName={
              activeSigner === 'GIVER' ? (giverName || 'Quản trị viên IT') : (receiverName || 'Nhân sự tiếp nhận')
            }
            onSave={(signatureDataUrl) => {
              if (activeSigner === 'GIVER') setGiverSignature(signatureDataUrl);
              else setReceiverSignature(signatureDataUrl);
              setActiveSigner(null);
            }}
          />
        )}
      </div>
    </div>
  );
}
