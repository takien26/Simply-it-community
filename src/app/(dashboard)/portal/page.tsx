'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Laptop,
  Key,
  LifeBuoy,
  Plus,
  AlertTriangle,
  Clock,
  CheckCircle2,
  FileText,
  Copy,
  Check,
  Building,
  User,
  ExternalLink,
  ChevronRight,
  RefreshCw,
  Phone,
  Mail,
  ShieldCheck,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';
import AssetHandoverModal from '@/components/assets/asset-handover-modal';
import { useLanguage } from '@/lib/i18n/context';
import CreateTicketModal from '@/components/tickets/CreateTicketModal';
import { PWAInstallPrompt } from '@/components/common/PWAInstallPrompt';

export default function EmployeePortalPage() {
  const { t: tr, language } = useLanguage();
  const isEn = language === 'en';
  const [data, setData] = useState<{
    user: any;
    assets: any[];
    licenses: any[];
    tickets: any[];
    stats: {
      totalAssets: number;
      totalLicenses: number;
      openTickets: number;
      resolvedTickets: number;
      totalTickets: number;
    };
  } | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Ticket creation modal state
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [selectedAssetForTicket, setSelectedAssetForTicket] = useState<string>('');
  const [initialTicketTitle, setInitialTicketTitle] = useState<string>('');

  // Handover modal state
  const [selectedAssetForHandover, setSelectedAssetForHandover] = useState<any>(null);
  const [isHandoverModalOpen, setIsHandoverModalOpen] = useState(false);

  // Copy serial feedback
  const [copiedSerial, setCopiedSerial] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/portal/my-assets');
      if (!res.ok) throw new Error(isEn ? 'Failed to load employee portal data' : 'Không thể tải dữ liệu cổng nhân viên');
      const json = await res.json();
      if (json.success) {
        setData(json);
      } else {
        throw new Error(json.error || (isEn ? 'An error occurred' : 'Có lỗi xảy ra'));
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || (isEn ? 'Server connection error' : 'Lỗi kết nối máy chủ'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCopySerial = (serial: string) => {
    if (!serial) return;
    navigator.clipboard.writeText(serial);
    setCopiedSerial(serial);
    setTimeout(() => setCopiedSerial(null), 2000);
  };

  const openTicketForAsset = (asset: any) => {
    setSelectedAssetForTicket(asset.id);
    setInitialTicketTitle(`[${isEn ? 'Issue' : 'Sự cố'}] ${asset.name} (${asset.assetTag})`);
    setIsTicketModalOpen(true);
  };

  const openGeneralTicket = () => {
    setSelectedAssetForTicket('');
    setInitialTicketTitle('');
    setIsTicketModalOpen(true);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-2.5 text-slate-500">
        <RefreshCw className="w-7 h-7 animate-spin text-blue-600" />
        <p className="text-xs sm:text-sm font-medium">
          {isEn ? 'Loading your assigned devices & licenses...' : 'Đang tải thông tin thiết bị & bản quyền của bạn...'}
        </p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 max-w-xl mx-auto text-center mt-10 bg-white rounded-2xl border border-slate-200 shadow-sm">
        <div className="w-12 h-12 rounded-xl bg-red-50 border border-red-200 text-red-600 flex items-center justify-center mx-auto mb-3">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-900 mb-1.5">
          {isEn ? 'Unable to load information' : 'Không thể tải thông tin'}
        </h2>
        <p className="text-xs text-slate-600 mb-4">{error || (isEn ? 'Please check your connection or log in again.' : 'Vui lòng kiểm tra lại kết nối hoặc đăng nhập lại.')}</p>
        <button
          onClick={loadData}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-xs transition-colors cursor-pointer shadow-xs"
        >
          {isEn ? 'Try Again' : 'Thử lại'}
        </button>
      </div>
    );
  }

  const { user, assets, licenses, tickets, stats } = data;

  return (
    <div className="p-3 sm:p-5 lg:p-6 max-w-6xl mx-auto space-y-5 animate-in fade-in duration-300">
      {/* Hero Welcome Card - Compact & Balanced */}
      <div className="relative overflow-hidden rounded-2xl bg-white border border-slate-200/90 shadow-xs p-4 sm:p-5 space-y-3.5">
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 sm:gap-4">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center text-xl sm:text-2xl font-extrabold shadow-sm shadow-blue-500/20 border border-blue-100 shrink-0">
              {user.fullName ? user.fullName.charAt(0).toUpperCase() : 'U'}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-0.5">
                <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                  {isEn ? 'Welcome' : 'Xin chào'}, {user.fullName}!
                </h1>
                <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  <span>{user.role?.name || (isEn ? 'Staff' : 'Nhân viên')}</span>
                </span>
              </div>
              <div className="text-xs text-slate-600 flex items-center gap-2.5 flex-wrap">
                <span className="flex items-center gap-1 font-medium text-slate-700">
                  <Mail className="w-3 h-3 text-slate-400" />
                  <span>{user.email}</span>
                </span>
                {user.department && (
                  <>
                    <span className="text-slate-300">•</span>
                    <span className="px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 font-medium text-[11px] flex items-center gap-1">
                      <Building className="w-2.5 h-2.5 text-slate-400" />
                      <span>{user.department}</span>
                    </span>
                  </>
                )}
                {user.phone && (
                  <>
                    <span className="text-slate-300">•</span>
                    <span className="text-slate-500 flex items-center gap-1 text-[11px]">
                      <Phone className="w-2.5 h-2.5 text-slate-400" />
                      <span>{user.phone}</span>
                    </span>
                  </>
                )}
              </div>
              <p className="text-[11px] text-slate-500 mt-1 font-normal">
                {isEn
                  ? 'Employee self-service portal: Look up assigned devices, software licenses, and submit IT tickets 24/7.'
                  : 'Cổng tự phục vụ nhân viên: Tra cứu thiết bị, bản quyền phần mềm và gửi yêu cầu IT nhanh chóng 24/7.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={openGeneralTicket}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 hover:from-amber-600 hover:to-red-600 text-white font-bold text-xs shadow-sm shadow-orange-500/20 hover:shadow-orange-500/30 transition-all transform active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
            >
              <LifeBuoy className="w-4 h-4 animate-pulse" />
              <span>{isEn ? 'Report Issue / Request IT Help' : 'Báo hỏng / Yêu cầu IT hỗ trợ'}</span>
            </button>
            <Link
              href="/tickets?create=true"
              className="hidden sm:flex px-3 py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-slate-900 font-semibold text-xs border border-slate-200 items-center gap-1 transition-all cursor-pointer shadow-2xs"
              title={isEn ? 'Open in Tickets page' : 'Mở trực tiếp trên trang Tickets'}
            >
              <ExternalLink className="w-3.5 h-3.5 text-blue-600" />
              <span>Tickets ↗</span>
            </Link>
          </div>
        </div>

        {/* Quick Stats Grid - Scaled Down ~20% */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 pt-3.5 border-t border-slate-100">
          <div className="bg-slate-50/70 hover:bg-slate-50 border border-slate-200/80 rounded-xl p-3 flex items-center justify-between transition-all shadow-2xs">
            <div>
              <p className="text-[10px] sm:text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                {isEn ? 'Assigned Devices' : 'Thiết bị đang giữ'}
              </p>
              <p className="text-base sm:text-lg font-bold text-slate-900 mt-0.5">
                {stats.totalAssets} <span className="text-[11px] font-normal text-slate-500">{isEn ? (stats.totalAssets === 1 ? 'device' : 'devices') : 'máy'}</span>
              </p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 shadow-2xs">
              <Laptop className="w-4 h-4" />
            </div>
          </div>

          <div className="bg-slate-50/70 hover:bg-slate-50 border border-slate-200/80 rounded-xl p-3 flex items-center justify-between transition-all shadow-2xs">
            <div>
              <p className="text-[10px] sm:text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                {isEn ? 'Software Licenses' : 'Bản quyền phần mềm'}
              </p>
              <p className="text-base sm:text-lg font-bold text-slate-900 mt-0.5">
                {stats.totalLicenses} <span className="text-[11px] font-normal text-slate-500">{isEn ? (stats.totalLicenses === 1 ? 'license' : 'licenses') : 'gói'}</span>
              </p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 shadow-2xs">
              <Key className="w-4 h-4" />
            </div>
          </div>

          <div className="bg-slate-50/70 hover:bg-slate-50 border border-slate-200/80 rounded-xl p-3 flex items-center justify-between transition-all shadow-2xs">
            <div>
              <p className="text-[10px] sm:text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                {isEn ? 'Pending IT Tickets' : 'Phiếu IT đang xử lý'}
              </p>
              <p className="text-base sm:text-lg font-bold text-purple-700 mt-0.5">
                {stats.openTickets} <span className="text-[11px] font-normal text-purple-600">{isEn ? (stats.openTickets === 1 ? 'ticket' : 'tickets') : 'phiếu'}</span>
              </p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center shrink-0 shadow-2xs">
              <Clock className="w-4 h-4" />
            </div>
          </div>

          <div className="bg-slate-50/70 hover:bg-slate-50 border border-slate-200/80 rounded-xl p-3 flex items-center justify-between transition-all shadow-2xs">
            <div>
              <p className="text-[10px] sm:text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                {isEn ? 'Resolved Tickets' : 'Phiếu đã hoàn thành'}
              </p>
              <p className="text-base sm:text-lg font-bold text-emerald-700 mt-0.5">
                {stats.resolvedTickets} <span className="text-[11px] font-normal text-emerald-600">{isEn ? (stats.resolvedTickets === 1 ? 'ticket' : 'tickets') : 'phiếu'}</span>
              </p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 shadow-2xs">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
        </div>
      </div>

      {/* Section 1: Assigned Assets */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center shadow-2xs">
              <Laptop className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900">
                {isEn ? 'Company Devices Assigned to You' : 'Thiết Bị Công Ty Đang Giao Bạn Giữ'}
              </h2>
              <p className="text-[11px] text-slate-500">
                {isEn ? 'Hardware and peripherals handed over to you for work duties' : 'Danh sách máy tính, thiết bị ngoại vi được bàn giao phục vụ công việc'}
              </p>
            </div>
          </div>
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs">
            {assets.length} {isEn ? (assets.length === 1 ? 'device' : 'devices') : 'thiết bị'}
          </span>
        </div>

        {assets.length === 0 ? (
          <div className="p-6 rounded-xl bg-white border border-dashed border-slate-300 text-center text-slate-500 shadow-2xs">
            <Laptop className="w-8 h-8 mx-auto mb-1.5 text-slate-400" />
            <p className="text-xs sm:text-sm font-semibold text-slate-700">
              {isEn ? 'No devices are currently assigned to your account in the system.' : 'Hiện bạn chưa có thiết bị nào được bàn giao trong hệ thống.'}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {isEn ? 'If you have a company machine but it is not listed here, please contact IT support.' : 'Nếu bạn đang giữ máy nhưng chưa thấy, vui lòng liên hệ phòng IT.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-3.5">
            {assets.map((item) => {
              const asset = item.asset;
              const specs = asset.specs || {};
              return (
                <div
                  key={item.id}
                  className="group relative rounded-xl bg-white border border-slate-200 hover:border-blue-300 hover:shadow-sm transition-all p-3.5 shadow-xs flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    {/* Top Tag & Status */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-2 py-0.5 rounded-md text-[11px] font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200">
                        {asset.assetTag}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <span>{isEn ? 'In Use' : 'Đang sử dụng'}</span>
                      </span>
                    </div>

                    {/* Title & Brand */}
                    <div>
                      <h3 className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1">
                        {asset.name}
                      </h3>
                      <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                        {asset.brand} {asset.model ? `• ${asset.model}` : ''}
                      </p>
                    </div>

                    {/* Serial Number with Copy */}
                    {asset.serialNumber && (
                      <div className="flex items-center justify-between text-[11px] bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
                        <span className="text-slate-500 font-medium">Serial:</span>
                        <div className="flex items-center gap-1 font-mono font-bold text-slate-800">
                          <span>{asset.serialNumber}</span>
                          <button
                            type="button"
                            onClick={() => handleCopySerial(asset.serialNumber)}
                            className="p-0.5 hover:text-blue-600 transition-colors cursor-pointer"
                            title={isEn ? 'Copy Serial' : 'Sao chép Serial'}
                          >
                            {copiedSerial === asset.serialNumber ? (
                              <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Copy className="w-3 h-3 text-slate-400" />
                            )}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Specs Pills */}
                    {Object.keys(specs).length > 0 && (
                      <div className="space-y-1 pt-0.5">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          {isEn ? 'Specs:' : 'Cấu hình:'}
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(specs).map(([key, val]) => {
                            if (!val || typeof val !== 'string') return null;
                            return (
                              <span
                                key={key}
                                className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200"
                              >
                                {val}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Handover Date & Location */}
                    <div className="text-[11px] text-slate-600 space-y-0.5 pt-1.5 border-t border-slate-100">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">{isEn ? 'Handover Date:' : 'Ngày bàn giao:'}</span>
                        <span className="text-slate-800 font-medium">
                          {item.assignedAt ? formatDate(item.assignedAt) : 'N/A'}
                        </span>
                      </div>
                      {asset.location && (
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">{isEn ? 'Location:' : 'Vị trí:'}</span>
                          <span className="text-slate-800 font-medium">{asset.location.name}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="grid grid-cols-2 gap-2 mt-3 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => openTicketForAsset(asset)}
                      className="px-2 py-1.5 rounded-lg bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <LifeBuoy className="w-3.5 h-3.5 text-orange-600" />
                      <span>{isEn ? 'Report Issue' : 'Báo hỏng'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedAssetForHandover(asset);
                        setIsHandoverModalOpen(true);
                      }}
                      className="px-2 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <FileText className="w-3.5 h-3.5 text-blue-600" />
                      <span>{isEn ? 'Handover Slip' : 'In biên bản'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Section 2: Assigned Licenses */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center shadow-2xs">
              <Key className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900">
                {isEn ? 'Allocated Software Licenses' : 'Bản Quyền Phần Mềm Được Cấp'}
              </h2>
              <p className="text-[11px] text-slate-500">
                {isEn ? 'Software products and license keys assigned to your user account' : 'Các phần mềm và license công ty gán cho tài khoản của bạn'}
              </p>
            </div>
          </div>
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs">
            {licenses.length} {isEn ? (licenses.length === 1 ? 'license' : 'licenses') : 'gói'}
          </span>
        </div>

        {licenses.length === 0 ? (
          <div className="p-6 rounded-xl bg-white border border-dashed border-slate-300 text-center text-slate-500 shadow-2xs">
            <Key className="w-8 h-8 mx-auto mb-1.5 text-slate-400" />
            <p className="text-xs sm:text-sm font-semibold text-slate-700">
              {isEn ? 'No software licenses are currently assigned to your account.' : 'Hiện bạn chưa có bản quyền phần mềm nào được gán.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-3.5">
            {licenses.map((item) => {
              const lic = item.license;
              return (
                <div
                  key={item.id}
                  className="rounded-xl bg-white border border-slate-200 p-3.5 shadow-xs space-y-2 hover:border-amber-300 transition-all"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                      {lic.licenseType || 'SUBSCRIPTION'}
                    </span>
                    <span className="text-[11px] text-slate-500 font-medium">
                      {isEn ? 'Assigned:' : 'Gán ngày:'} {item.assignedAt ? formatDate(item.assignedAt) : 'N/A'}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900 line-clamp-1">{lic.name}</h3>
                    {lic.vendor?.name && <p className="text-[11px] text-slate-500 font-medium mt-0.5">{lic.vendor.name}</p>}
                  </div>

                  {lic.expiryDate && (
                    <div className="text-[11px] flex items-center justify-between text-slate-700 bg-amber-50/60 px-2.5 py-1 rounded-lg border border-amber-200">
                      <span className="text-slate-500 font-medium">{isEn ? 'Expiry Date:' : 'Hạn sử dụng:'}</span>
                      <span className="font-bold text-amber-800">{formatDate(lic.expiryDate)}</span>
                    </div>
                  )}

                  {item.notes && (
                    <p className="text-[11px] text-slate-500 italic">
                      {isEn ? 'Notes:' : 'Ghi chú:'} {item.notes}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Section 3: My Recent Tickets */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-purple-50 border border-purple-200 text-purple-700 flex items-center justify-center shadow-2xs">
              <LifeBuoy className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900">
                {isEn ? 'Your IT Support Requests' : 'Yêu Cầu Hỗ Trợ IT Của Bạn'}
              </h2>
              <p className="text-[11px] text-slate-500">
                {isEn ? 'History and resolution progress of your technical assistance tickets' : 'Lịch sử và tiến độ giải quyết các yêu cầu hỗ trợ kỹ thuật'}
              </p>
            </div>
          </div>
          <Link
            href="/tickets"
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors"
          >
            <span>{isEn ? 'View all tickets' : 'Xem tất cả phiếu'}</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {tickets.length === 0 ? (
          <div className="p-6 rounded-xl bg-white border border-dashed border-slate-300 text-center text-slate-500 shadow-2xs">
            <LifeBuoy className="w-8 h-8 mx-auto mb-1.5 text-slate-400" />
            <p className="text-xs sm:text-sm font-semibold text-slate-700">
              {isEn ? 'You have not submitted any support tickets yet.' : 'Bạn chưa gửi yêu cầu hỗ trợ nào.'}
            </p>
            <button
              onClick={openGeneralTicket}
              className="mt-2.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isEn ? 'Create first support request' : 'Tạo yêu cầu hỗ trợ đầu tiên'}</span>
            </button>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl bg-white border border-slate-200 shadow-xs">
            <div className="divide-y divide-slate-100">
              {tickets.map((t) => {
                const statusBadge =
                  t.status === 'OPEN'
                    ? { label: isEn ? 'Open' : 'Mới tiếp nhận', bg: 'bg-blue-50 text-blue-700 border-blue-200' }
                    : t.status === 'IN_PROGRESS'
                    ? { label: isEn ? 'In Progress' : 'Đang xử lý', bg: 'bg-amber-50 text-amber-700 border-amber-200' }
                    : t.status === 'WAITING'
                    ? { label: isEn ? 'Pending' : 'Chờ phản hồi', bg: 'bg-purple-50 text-purple-700 border-purple-200' }
                    : { label: isEn ? 'Resolved' : 'Đã hoàn thành', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' };

                return (
                  <div
                    key={t.id}
                    className="p-3 sm:p-3.5 hover:bg-slate-50/80 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-bold text-blue-600">{t.ticketNumber}</span>
                        <span className={`px-2 py-0.2 rounded-full text-[10px] font-bold border ${statusBadge.bg}`}>
                          {statusBadge.label}
                        </span>
                        <span className="text-[11px] text-slate-400">• {formatDate(t.createdAt)}</span>
                      </div>
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900">{t.title}</h4>
                      {t.asset && (
                        <p className="text-[11px] text-slate-500 flex items-center gap-1 font-medium">
                          <Laptop className="w-3 h-3 text-slate-400" />
                          <span>{isEn ? 'Device:' : 'Thiết bị:'} {t.asset.name} ({t.asset.assetTag})</span>
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                      {t.assignedTo ? (
                        <span className="text-[11px] font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200 flex items-center gap-1">
                          <User className="w-2.5 h-2.5 text-slate-400" />
                          <span>IT: {t.assignedTo.fullName}</span>
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">
                          {isEn ? 'Unassigned' : 'Chưa gán IT'}
                        </span>
                      )}

                      <Link
                        href={`/tickets?id=${t.id}`}
                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-colors shadow-2xs"
                        title={isEn ? 'View ticket details' : 'Xem chi tiết ticket'}
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 5. Mobile App / PWA Installation Section */}
      <PWAInstallPrompt className="mt-8" />

      {/* Shared Unified Ticket Creation Modal */}
      <CreateTicketModal
        isOpen={isTicketModalOpen}
        onClose={() => {
          setIsTicketModalOpen(false);
          setSelectedAssetForTicket('');
          setInitialTicketTitle('');
        }}
        currentUser={user}
        userAssets={assets.map((a) => a.asset)}
        initialAssetId={selectedAssetForTicket}
        initialTitle={initialTicketTitle}
        onSuccess={() => {
          loadData();
        }}
      />

      {/* Asset Handover Modal */}
      {selectedAssetForHandover && (
        <AssetHandoverModal
          isOpen={isHandoverModalOpen}
          onClose={() => {
            setIsHandoverModalOpen(false);
            setSelectedAssetForHandover(null);
          }}
          asset={selectedAssetForHandover}
          initialMode="HANDOVER"
        />
      )}
    </div>
  );
}
