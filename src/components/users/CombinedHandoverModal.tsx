'use client';

import React, { useRef } from 'react';
import {
  X,
  Printer,
  FileText,
  Building,
  User,
  Calendar,
  Shield,
  CheckCircle2,
  Barcode,
  Key,
  Laptop,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';

export interface CombinedHandoverModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'ONBOARDING' | 'OFFBOARDING';
  user: {
    fullName: string;
    email: string;
    department?: string | null;
    position?: string | null;
    companyName?: string | null;
  };
  executor?: {
    fullName: string;
  };
  assets: Array<{
    id: string;
    assetTag: string;
    name: string;
    brand?: string | null;
    model?: string | null;
    serialNumber?: string | null;
    condition?: string | null;
  }>;
  licenses?: Array<{
    id: string;
    name: string;
    licenseType?: string | null;
    licenseKey?: string | null;
  }>;
  notes?: string;
}

export const CombinedHandoverModal: React.FC<CombinedHandoverModalProps> = ({
  isOpen,
  onClose,
  mode,
  user,
  executor,
  assets,
  licenses = [],
  notes,
}) => {
  const printRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const isOffboarding = mode === 'OFFBOARDING';
  const companyName = user.companyName || 'TẬP ĐOÀN DOANH NGHIỆP';
  const today = new Date();
  const docNumber = `BB${isOffboarding ? 'TH' : 'BG'}-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}/${user.email?.split('@')[0]?.toUpperCase() || 'IT'}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
      {/* Container - hide from print */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col border border-slate-200 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 print:p-0 print:border-none print:shadow-none print:max-w-none print:w-full">
        {/* Modal Header Toolbar (Hidden when printing) */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 shrink-0 print:hidden">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h3 className="font-bold text-sm text-slate-800 dark:text-white">
              {isOffboarding
                ? 'Biên Bản Thu Hồi & Bàn Giao Tài Sản (Nghỉ Việc)'
                : 'Biên Bản Bàn Giao Thiết Bị & Tài Nguyên IT (Tiếp Nhận)'}
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>In Biên Bản (Ctrl + P)</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-200/50 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Body */}
        <div
          ref={printRef}
          className="flex-1 overflow-y-auto p-8 sm:p-12 text-slate-900 bg-white space-y-6 text-sm leading-relaxed print:p-0 print:overflow-visible print:text-black"
        >
          {/* Header Quốc Hiệu / Công Ty */}
          <div className="grid grid-cols-2 gap-4 pb-4 border-b-2 border-slate-900">
            <div>
              <p className="font-bold uppercase tracking-wider text-xs">{companyName}</p>
              <p className="font-extrabold uppercase text-xs text-indigo-900">BAN CÔNG NGHỆ THÔNG TIN</p>
              <p className="text-xs text-slate-500 font-mono mt-1">Số: {docNumber}</p>
            </div>
            <div className="text-center">
              <p className="font-bold text-xs uppercase">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
              <p className="font-semibold text-xs text-slate-700">Độc lập - Tự do - Hạnh phúc</p>
              <p className="text-xs text-slate-500 italic mt-1">
                Ngày {today.getDate()} tháng {today.getMonth() + 1} năm {today.getFullYear()}
              </p>
            </div>
          </div>

          {/* Tiêu đề biên bản */}
          <div className="text-center py-2 space-y-1">
            <h1 className="font-black text-xl tracking-wide uppercase text-slate-900">
              {isOffboarding
                ? 'BIÊN BẢN THU HỒI & HOÀN TRẢ TRANG THIẾT BỊ CNTT'
                : 'BIÊN BẢN BÀN GIAO TRANG THIẾT BỊ & BẢN QUYỀN CNTT'}
            </h1>
            <p className="text-xs text-slate-500 italic">
              {isOffboarding
                ? '(V/v: Chấm dứt hợp đồng lao động / Bàn giao tài sản trước khi nghỉ việc)'
                : '(V/v: Cấp phát trang thiết bị & công cụ làm việc cho nhân sự mới)'}
            </p>
          </div>

          {/* Thành phần tham gia */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 p-4 bg-slate-50 rounded-2xl border border-slate-200">
            <div className="space-y-1">
              <h4 className="font-bold text-xs uppercase tracking-wider text-indigo-900 pb-1 border-b border-slate-200">
                {isOffboarding ? 'BÊN TIẾP NHẬN THU HỒI (BÊN A):' : 'BÊN BÀN GIAO (BÊN A):'}
              </h4>
              <p className="text-xs">
                Đại diện: <strong>{executor?.fullName || 'Đại diện Bộ phận IT'}</strong>
              </p>
              <p className="text-xs">Bộ phận: <strong>Ban Công Nghệ Thông Tin</strong></p>
              <p className="text-xs">Đơn vị: <strong>{companyName}</strong></p>
            </div>

            <div className="space-y-1">
              <h4 className="font-bold text-xs uppercase tracking-wider text-indigo-900 pb-1 border-b border-slate-200">
                {isOffboarding ? 'BÊN BÀN GIAO HOÀN TRẢ (BÊN B):' : 'BÊN TIẾP NHẬN SỬ DỤNG (BÊN B):'}
              </h4>
              <p className="text-xs">
                Họ và tên: <strong>{user.fullName}</strong>
              </p>
              <p className="text-xs">
                Phòng ban: <strong>{user.department || '—'}</strong> • Chức vụ: <strong>{user.position || 'Nhân viên'}</strong>
              </p>
              <p className="text-xs">
                Email công vụ: <strong>{user.email}</strong>
              </p>
            </div>
          </div>

          {/* Danh mục 1: Trang thiết bị phần cứng */}
          <div className="space-y-2">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
              <span>1. Danh mục trang thiết bị phần cứng ({assets.length} thiết bị):</span>
            </h3>

            {assets.length === 0 ? (
              <p className="text-xs text-slate-400 italic bg-slate-50 p-3 rounded-xl border border-slate-200">
                Không phát sinh bàn giao thiết bị phần cứng.
              </p>
            ) : (
              <table className="w-full text-left text-xs border-collapse border border-slate-300">
                <thead>
                  <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                    <th className="p-2 border-r border-slate-300 w-10 text-center">STT</th>
                    <th className="p-2 border-r border-slate-300">Mã Tài Sản</th>
                    <th className="p-2 border-r border-slate-300">Tên Thiết Bị / Model</th>
                    <th className="p-2 border-r border-slate-300">Số Serial (S/N)</th>
                    <th className="p-2 border-r border-slate-300 text-center">Tình Trạng</th>
                    <th className="p-2">Phụ Kiện Đi Kèm</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {assets.map((item, idx) => (
                    <tr key={item.id}>
                      <td className="p-2 border-r border-slate-200 text-center font-mono">{idx + 1}</td>
                      <td className="p-2 border-r border-slate-200 font-mono font-bold text-indigo-900">
                        {item.assetTag}
                      </td>
                      <td className="p-2 border-r border-slate-200 font-medium">
                        {item.name} {item.brand ? `(${item.brand} ${item.model || ''})` : ''}
                      </td>
                      <td className="p-2 border-r border-slate-200 font-mono text-slate-700">
                        {item.serialNumber || '—'}
                      </td>
                      <td className="p-2 border-r border-slate-200 text-center font-medium">
                        {item.condition === 'NEW' ? 'Mới 100%' : item.condition === 'GOOD' ? 'Tốt (Ổn định)' : 'Bình thường'}
                      </td>
                      <td className="p-2 text-slate-600">
                        Sạc/Adapter, Chuột, Túi
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Danh mục 2: Bản quyền phần mềm & Tài khoản */}
          {licenses.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                <span>2. Danh mục tài khoản & bản quyền phần mềm ({licenses.length} bản quyền):</span>
              </h3>

              <table className="w-full text-left text-xs border-collapse border border-slate-300">
                <thead>
                  <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                    <th className="p-2 border-r border-slate-300 w-10 text-center">STT</th>
                    <th className="p-2 border-r border-slate-300">Tên Gói Phần Mềm / Bản Quyền</th>
                    <th className="p-2 border-r border-slate-300">Phân Loại</th>
                    <th className="p-2">Ghi Chú Trạng Thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {licenses.map((lic, idx) => (
                    <tr key={lic.id}>
                      <td className="p-2 border-r border-slate-200 text-center font-mono">{idx + 1}</td>
                      <td className="p-2 border-r border-slate-200 font-bold text-slate-800">
                        {lic.name}
                      </td>
                      <td className="p-2 border-r border-slate-200 text-slate-600">
                        {lic.licenseType || 'SUBSCRIPTION'}
                      </td>
                      <td className="p-2 text-slate-600">
                        {isOffboarding ? 'Đã giải phóng ghế bản quyền về kho' : 'Đã kích hoạt cấp phát cho nhân sự'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Điều khoản & Cam kết */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5 text-xs text-slate-700">
            <h4 className="font-bold uppercase tracking-wider text-slate-900">3. Điều khoản & Cam kết trách nhiệm:</h4>
            {isOffboarding ? (
              <ul className="list-disc list-inside space-y-1 text-slate-600">
                <li>Bên hoàn trả (Bên B) đã bàn giao đầy đủ toàn bộ thiết bị, phụ kiện và dữ liệu công việc liên quan.</li>
                <li>Bộ phận CNTT (Bên A) đã kiểm tra thực tế: Thiết bị hoạt động bình thường, tem nguyên vẹn, không biến dạng vật lý.</li>
                <li>Dữ liệu nhạy cảm của doanh nghiệp đã được bảo toàn; các tài khoản hệ thống (Email, M365, VPN) đã bị vô hiệu hóa an toàn.</li>
                <li>Kể từ ngày ký biên bản này, Bên B hoàn tất toàn bộ nghĩa vụ quản trị tài sản đối với các danh mục trên.</li>
              </ul>
            ) : (
              <ul className="list-disc list-inside space-y-1 text-slate-600">
                <li>Bên nhận (Bên B) có trách nhiệm bảo quản và sử dụng đúng mục đích công việc của Công ty.</li>
                <li>Không tự ý tháo mở máy, thay đổi linh kiện hoặc cài đặt các phần mềm bẻ khóa / không có bản quyền.</li>
                <li>Khi phát sinh sự cố kỹ thuật, báo ngay cho Bộ phận CNTT qua hệ thống Helpdesk để được hỗ trợ.</li>
                <li>Khi chuyển công tác hoặc thôi việc, Bên B có nghĩa vụ hoàn trả nguyên trạng toàn bộ danh mục trên cho Bộ phận CNTT.</li>
              </ul>
            )}
          </div>

          {notes && (
            <p className="text-xs text-slate-600 italic">
              <strong>Ghi chú bổ sung:</strong> {notes}
            </p>
          )}

          {/* Chữ ký các bên */}
          <div className="grid grid-cols-3 gap-4 pt-8 text-center text-xs">
            <div className="space-y-16">
              <div>
                <p className="font-bold uppercase tracking-wider text-slate-800">
                  {isOffboarding ? 'NGƯỜI HOÀN TRẢ' : 'ĐẠI DIỆN BÀN GIAO (IT)'}
                </p>
                <p className="text-[11px] text-slate-400 italic">(Ký và ghi rõ họ tên)</p>
              </div>
              <p className="font-bold text-slate-800">
                {isOffboarding ? user.fullName : (executor?.fullName || 'IT Admin')}
              </p>
            </div>

            <div className="space-y-16">
              <div>
                <p className="font-bold uppercase tracking-wider text-slate-800">
                  {isOffboarding ? 'ĐẠI DIỆN TIẾP NHẬN (IT)' : 'NGƯỜI TIẾP NHẬN'}
                </p>
                <p className="text-[11px] text-slate-400 italic">(Ký và ghi rõ họ tên)</p>
              </div>
              <p className="font-bold text-slate-800">
                {isOffboarding ? (executor?.fullName || 'IT Admin') : user.fullName}
              </p>
            </div>

            <div className="space-y-16">
              <div>
                <p className="font-bold uppercase tracking-wider text-slate-800">LÃNH ĐẠO PHÊ DUYỆT</p>
                <p className="text-[11px] text-slate-400 italic">(Ký và ghi rõ họ tên)</p>
              </div>
              <p className="font-bold text-slate-400 italic">....................................</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
