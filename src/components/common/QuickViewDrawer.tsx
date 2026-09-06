'use client';

import React, { useEffect } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import {
  X,
  ExternalLink,
  Laptop,
  Key,
  Cloud,
  Ticket,
  User as UserIcon,
  Phone,
  Mail,
  Building2,
  Globe,
  MapPin,
  AlertTriangle,
  Tag,
  FileText,
  Receipt,
  Layers,
  CheckCircle2,
  ShieldCheck,
} from 'lucide-react';
import { useQuickViewStore, QuickViewEntityType } from '@/lib/quick-view-store';
import { useLanguage } from '@/lib/i18n/context';
import { QuickLink } from '@/components/common/QuickLink';
import { formatCurrency, formatDate } from '@/lib/utils';

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to fetch quick view data');
  }
  return res.json();
};

export const QuickViewDrawer: React.FC = () => {
  const { isOpen, entityType, entityId, closeQuickView } = useQuickViewStore();
  const { language } = useLanguage();
  const isEn = language === 'en';

  const shouldFetch = isOpen && !!entityType && !!entityId;
  const swrKey = shouldFetch ? `/api/v1/quick-view?type=${entityType}&id=${encodeURIComponent(entityId)}` : null;

  const { data: resp, error, isLoading } = useSWR(swrKey, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60000,
  });

  const data = resp?.data;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        closeQuickView();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeQuickView]);

  if (!isOpen) return null;

  const getDetailUrl = (type: QuickViewEntityType, id: string) => {
    switch (type) {
      case 'user':
        return `/users?id=${id}`;
      case 'asset':
        return `/assets?id=${id}`;
      case 'license':
        return `/licenses?id=${id}`;
      case 'service':
        return `/services?id=${id}`;
      case 'ticket':
        return `/tickets?id=${id}`;
      case 'vendor':
        return `/vendors?id=${id}`;
      default:
        return '#';
    }
  };

  const getEntityTitle = () => {
    switch (entityType) {
      case 'user':
        return { label: 'Xem Nhanh Nhân Sự', icon: <UserIcon className="w-4 h-4 text-blue-600" />, badge: 'Nhân Sự & Quyền' };
      case 'asset':
        return { label: 'Xem Nhanh Thiết Bị', icon: <Laptop className="w-4 h-4 text-indigo-600" />, badge: 'Phần Cứng IT' };
      case 'license':
        return { label: 'Xem Nhanh Bản Quyền', icon: <Key className="w-4 h-4 text-purple-600" />, badge: 'Phần Mềm & Key' };
      case 'service':
        return { label: 'Xem Nhanh Dịch Vụ', icon: <Cloud className="w-4 h-4 text-emerald-600" />, badge: 'Hạ Tầng & Thuê Bao' };
      case 'ticket':
        return { label: 'Xem Nhanh Phiếu Hỗ Trợ', icon: <Ticket className="w-4 h-4 text-amber-600" />, badge: 'IT Service Ticket' };
      case 'vendor':
        return { label: 'Xem Nhanh Nhà Cung Cấp', icon: <Building2 className="w-4 h-4 text-cyan-600" />, badge: 'Đối Tác & Vendor' };
      default:
        return { label: 'Chi Tiết Đối Tượng', icon: <Tag className="w-4 h-4 text-slate-600" />, badge: 'Hệ Thống' };
    }
  };

  const entityMeta = getEntityTitle();

  return (
    <div className="fixed inset-0 z-[9999] overflow-hidden">
      <div
        onClick={closeQuickView}
        className="fixed inset-0 bg-slate-950/40 backdrop-blur-[2px] transition-opacity duration-300 ease-out animate-in fade-in"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-[420px] sm:max-w-[460px] bg-white shadow-2xl border-l border-slate-200 flex flex-col transition-transform duration-300 ease-out animate-in slide-in-from-right">
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between gap-3 bg-gradient-to-r from-slate-50 via-blue-50/20 to-indigo-50/10 shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-2xl bg-white shadow-xs border border-slate-200/80 flex items-center justify-center shrink-0">
                {entityMeta.icon}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                    {entityMeta.badge}
                  </span>
                </div>
                <h3 className="font-extrabold text-sm text-slate-900 truncate leading-snug mt-0.5">
                  {entityMeta.label}
                </h3>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {entityType && entityId && (
                <Link
                  href={getDetailUrl(entityType, entityId)}
                  onClick={closeQuickView}
                  title={isEn ? 'Open Full View' : 'Mở toàn màn hình'}
                  className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                </Link>
              )}
              <button
                type="button"
                onClick={closeQuickView}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                title={isEn ? 'Close (Esc)' : 'Đóng (Esc)'}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Drawer Body */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-xs">
            {isLoading && (
              <div className="space-y-4 animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-slate-200" />
                  <div className="space-y-2 flex-1">
                    <div className="h-4 bg-slate-200 rounded w-3/4" />
                    <div className="h-3 bg-slate-200 rounded w-1/2" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="h-16 bg-slate-100 rounded-xl" />
                  <div className="h-16 bg-slate-100 rounded-xl" />
                </div>
                <div className="h-28 bg-slate-100 rounded-2xl" />
                <div className="h-36 bg-slate-100 rounded-2xl" />
              </div>
            )}

            {!isLoading && error && (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 space-y-2 text-center">
                <AlertTriangle className="w-8 h-8 text-rose-500 mx-auto" />
                <p className="font-bold">{error.message || (isEn ? 'Unable to load quick view data.' : 'Không thể tải dữ liệu xem nhanh.')}</p>
                <p className="text-[11px] text-rose-600">{isEn ? 'Please check your permissions or entity ID.' : 'Vui lòng kiểm tra lại quyền truy cập hoặc ID đối tượng.'}</p>
              </div>
            )}

            {!isLoading && data && (
              <>
                {/* 1. USER */}
                {entityType === 'user' && (
                  <div className="space-y-4">
                    <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-50/60 to-indigo-50/40 border border-blue-200/80 flex items-center gap-3.5">
                      <div className="w-14 h-14 rounded-2xl bg-white shadow-sm border border-blue-200 flex items-center justify-center font-black text-lg text-blue-700 shrink-0 overflow-hidden">
                        {data.avatarUrl ? (
                          <img src={data.avatarUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          data.fullName?.charAt(0) || '👤'
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="font-black text-sm text-slate-900 truncate">{data.fullName}</h4>
                          <span className={`px-2 py-0.2 text-[10px] font-bold rounded-full border ${data.isActive ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-slate-200 text-slate-600 border-slate-300'}`}>
                            {isEn ? (data.isActive ? 'Active' : 'Locked') : (data.isActive ? 'Hoạt động' : 'Tạm khóa')}
                          </span>
                        </div>
                        <p className="text-[11px] text-blue-700 font-bold mt-0.5">{data.roleName}</p>
                        <p className="text-[10.5px] text-slate-500 truncate">{data.department || isEn ? 'No Department Assigned' : 'Chưa gán phòng ban'}</p>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2 text-[11px]">
                      <div className="flex items-center gap-2 text-slate-700">
                        <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="font-medium truncate">{data.email}</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-700">
                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="font-medium">{data.phone || isEn ? 'No Phone Updated' : 'Chưa cập nhật SĐT'}</span>
                      </div>
                    </div>

                    {/* KPI GÁN THIẾT BỊ VÀ GÁN LICENSE */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-3 rounded-2xl bg-indigo-50/70 border border-indigo-100 text-center">
                        <span className="text-[10px] text-slate-500 font-bold uppercase block">{isEn ? '💻 Assigned Devices' : '💻 Thiết bị giữ'}</span>
                        <span className="text-xl font-black text-indigo-700">{data.assignedAssetsCount || 0}</span>
                      </div>
                      <div className="p-3 rounded-2xl bg-purple-50/70 border border-purple-100 text-center">
                        <span className="text-[10px] text-slate-500 font-bold uppercase block">{isEn ? '🔑 Assigned Licenses' : '🔑 License giữ'}</span>
                        <span className="text-xl font-black text-purple-700">{data.assignedLicensesCount || 0}</span>
                      </div>
                    </div>

                    {/* DANH SÁCH LICENSE ĐANG GÁN CHO NHÂN SỰ */}
                    {data.assignedLicenses && data.assignedLicenses.length > 0 && (
                      <div className="space-y-2">
                        <h5 className="font-bold text-slate-800 text-xs flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <Key className="w-3.5 h-3.5 text-purple-600" />
                            <span>{isEn ? 'Allocated Software Licenses' : 'Bản quyền License đang cấp'} ({data.assignedLicenses.length}):</span>
                          </span>
                        </h5>
                        <div className="space-y-1.5">
                          {data.assignedLicenses.map((lic: any) => (
                            <div key={lic.id} className="p-2.5 bg-purple-50/40 rounded-xl border border-purple-200/80 flex items-center justify-between gap-2">
                              <div className="min-w-0">
                                <QuickLink
                                  type="license"
                                  id={lic.id}
                                  label={lic.name}
                                  icon="🔑"
                                  className="font-bold text-purple-900 text-xs"
                                />
                                <span className="text-[10px] text-slate-500 block">Loại: {lic.licenseType}</span>
                              </div>
                              <span className="px-2 py-0.5 bg-purple-100 text-purple-800 rounded text-[9px] font-bold shrink-0">
                                Đang dùng
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* DANH SÁCH THIẾT BỊ ĐANG GÁN */}
                    {data.assignedAssets && data.assignedAssets.length > 0 && (
                      <div className="space-y-2">
                        <h5 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                          <Laptop className="w-3.5 h-3.5 text-blue-600" />
                          <span>{isEn ? 'Assigned Devices' : 'Thiết bị đang bàn giao'} ({data.assignedAssets.length}):</span>
                        </h5>
                        <div className="space-y-1.5">
                          {data.assignedAssets.map((ast: any) => (
                            <div key={ast.id} className="p-2.5 bg-white rounded-xl border border-slate-200 flex items-center justify-between gap-2">
                              <div className="min-w-0">
                                <QuickLink
                                  type="asset"
                                  id={ast.id}
                                  label={`[${ast.assetTag}] ${ast.name}`}
                                  icon="💻"
                                  showIcon={false}
                                  className="font-mono font-bold text-blue-700 text-xs"
                                />
                                {ast.brand && (
                                  <span className="text-[10px] text-slate-400 block">{ast.brand} {ast.model || ''}</span>
                                )}
                              </div>
                              <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[9.5px] font-semibold shrink-0">
                                {ast.status}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 2. ASSET */}
                {entityType === 'asset' && (
                  <div className="space-y-4">
                    <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-50/60 to-blue-50/40 border border-indigo-200/80 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-black text-xs px-2.5 py-0.5 rounded-lg bg-indigo-600 text-white shadow-xs">
                          {data.assetTag}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full font-bold text-[10px] bg-white border border-indigo-200 text-indigo-800">
                          {data.status}
                        </span>
                      </div>
                      <h4 className="font-extrabold text-sm text-slate-900 leading-snug">{data.name}</h4>
                      <p className="text-[11px] text-slate-500">
                        {data.brand} {data.model ? `• Model: ${data.model}` : ''} {data.serialNumber ? `• S/N: ${data.serialNumber}` : ''}
                      </p>
                    </div>

                    {/* KPI GÁN LICENSE CHO MÁY */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-3 rounded-2xl bg-purple-50/70 border border-purple-100 text-center">
                        <span className="text-[10px] text-slate-500 font-bold uppercase block">{isEn ? '🔑 Installed Licenses' : '🔑 Bản quyền cài máy'}</span>
                        <span className="text-xl font-black text-purple-700">{data.assignedLicensesCount || 0}</span>
                      </div>
                      <div className="p-3 rounded-2xl bg-blue-50/70 border border-blue-100 text-center">
                        <span className="text-[10px] text-slate-500 font-bold uppercase block">{isEn ? '👤 Current User' : '👤 Người sử dụng'}</span>
                        <span className="text-xs font-black text-blue-900 mt-1 block truncate">
                          {data.currentUser ? data.currentUser.fullName : isEn ? 'In Storage' : 'Trong kho'}
                        </span>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2 text-[11px]">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">{isEn ? 'Category:' : 'Danh mục:'}</span>
                        <span className="font-bold text-slate-800">{data.categoryIcon} {data.categoryName}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">{isEn ? 'Assigned To:' : 'Người đang dùng:'}</span>
                        {data.currentUser ? (
                          <QuickLink
                            type="user"
                            id={data.currentUser.id}
                            label={data.currentUser.fullName}
                            icon="👤"
                            className="font-bold text-blue-700 text-[11px]"
                          />
                        ) : (
                          <span className="text-slate-400 italic">{isEn ? 'In Storage (Unassigned)' : 'Đang trong kho (Chưa bàn giao)'}</span>
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">{isEn ? 'Location:' : 'Vị trí:'}</span>
                        <span className="font-bold text-slate-800">{data.locationName}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">{isEn ? 'Vendor:' : 'Nhà cung cấp:'}</span>
                        {data.vendorName ? (
                          <QuickLink
                            type="vendor"
                            id={data.vendorId || data.vendorName}
                            label={data.vendorName}
                            icon="🏢"
                            showIcon={false}
                            className="font-bold text-slate-800 text-[11px]"
                          />
                        ) : (
                          <span className="text-slate-400 italic">—</span>
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">{isEn ? 'Warranty:' : 'Hạn bảo hành:'}</span>
                        <span className="font-semibold text-slate-700">{data.warrantyExpiry ? formatDate(data.warrantyExpiry) : '—'}</span>
                      </div>

                      {/* TỰ ĐỘNG LINK HÓA ĐƠN & HỢP ĐỒNG */}
                      {(data.invoiceNumber || data.contractNumber) && (
                        <div className="pt-2 border-t border-slate-200/80 space-y-1.5">
                          {data.invoiceNumber && (
                            <div className="flex items-center justify-between">
                              <span className="text-slate-400 flex items-center gap-1">
                                <Receipt className="w-3 h-3 text-blue-600" />
                                <span>{isEn ? 'Invoice No:' : 'Số Hóa Đơn:'}</span>
                              </span>
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono font-bold text-slate-800">{data.invoiceNumber}</span>
                                {data.matchedInvoiceDoc ? (
                                  <a
                                    href={data.matchedInvoiceDoc.fileUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="px-2 py-0.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-md text-[9.5px] font-bold flex items-center gap-1 transition-colors"
                                    title="Bấm để xem file hóa đơn đã tự động liên kết"
                                  >
                                    <FileText className="w-2.5 h-2.5" />
                                    <span>{isEn ? 'View Invoice' : 'Xem Hóa Đơn'}</span>
                                  </a>
                                ) : null}
                              </div>
                            </div>
                          )}

                          {data.contractNumber && (
                            <div className="flex items-center justify-between">
                              <span className="text-slate-400 flex items-center gap-1">
                                <FileText className="w-3 h-3 text-indigo-600" />
                                <span>{isEn ? 'Contract No:' : 'Số Hợp Đồng:'}</span>
                              </span>
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono font-bold text-slate-800">{data.contractNumber}</span>
                                {data.matchedContractDoc ? (
                                  <a
                                    href={data.matchedContractDoc.fileUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="px-2 py-0.5 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-md text-[9.5px] font-bold flex items-center gap-1 transition-colors"
                                    title="Bấm để xem file hợp đồng đã tự động liên kết"
                                  >
                                    <FileText className="w-2.5 h-2.5" />
                                    <span>{isEn ? 'View Contract' : 'Xem HĐ'}</span>
                                  </a>
                                ) : null}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {data.purchasePrice && (
                        <div className="flex items-center justify-between pt-1.5 border-t border-slate-200">
                          <span className="text-slate-400">{isEn ? 'Purchase Cost:' : 'Nguyên giá:'}</span>
                          <span className="font-extrabold text-emerald-700">{formatCurrency(data.purchasePrice, data.purchaseCurrency)}</span>
                        </div>
                      )}
                    </div>

                    {/* DANH SÁCH BẢN QUYỀN GÁN TRÊN THIẾT BỊ NÀY */}
                    {data.assignedLicenses && data.assignedLicenses.length > 0 && (
                      <div className="space-y-2">
                        <h5 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                          <Key className="w-3.5 h-3.5 text-purple-600" />
                          <span>{isEn ? 'Installed Licenses on Device' : 'Bản quyền License cài trên máy'} ({data.assignedLicenses.length}):</span>
                        </h5>
                        <div className="space-y-1.5">
                          {data.assignedLicenses.map((lic: any) => (
                            <div key={lic.id} className="p-2.5 bg-purple-50/40 rounded-xl border border-purple-200/80 flex items-center justify-between gap-2">
                              <div className="min-w-0">
                                <QuickLink
                                  type="license"
                                  id={lic.id}
                                  label={lic.name}
                                  icon="🔑"
                                  className="font-bold text-purple-900 text-xs"
                                />
                                <span className="text-[10px] text-slate-500 block">Loại: {lic.licenseType}</span>
                              </div>
                              <span className="px-2 py-0.5 bg-purple-100 text-purple-800 rounded text-[9px] font-bold shrink-0">
                                Đang cài đặt
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* LỊCH SỬ KIỂM KÊ & ĐỐI SOÁT HIỆN TRƯỜNG */}
                    <div className="space-y-2 pt-2 border-t border-slate-200">
                      <div className="flex items-center justify-between">
                        <h5 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                          <ShieldCheck className="w-4 h-4 text-emerald-600" />
                          <span>{isEn ? 'Audit & Inspection History:' : 'Lịch Sử Kiểm Kê Đối Soát Định Kỳ:'}</span>
                        </h5>
                        <Link
                          href="/scan"
                          className="text-[10px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-0.5"
                        >
                          <span>{isEn ? 'Scan QR' : 'Quét QR'}</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </Link>
                      </div>

                      {data.auditHistory && data.auditHistory.length > 0 ? (
                        <div className="space-y-2">
                          {data.auditHistory.map((audit: any, idx: number) => (
                            <div
                              key={idx}
                              className="p-3 bg-emerald-50/50 rounded-2xl border border-emerald-200/80 text-xs space-y-1.5"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-bold text-emerald-950 truncate">
                                  {audit.campaignTitle || isEn ? 'Asset Audit' : 'Đợt kiểm kê tài sản'}
                                </span>
                                <span
                                  className={`px-2 py-0.5 rounded-full font-bold text-[9px] border shrink-0 ${
                                    audit.auditStatus === 'MATCHED'
                                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                      : audit.auditStatus === 'MISMATCH'
                                      ? 'bg-amber-100 text-amber-800 border-amber-300'
                                      : 'bg-rose-100 text-rose-800 border-rose-300'
                                  }`}
                                >
                                  {audit.auditStatus === 'MATCHED'
                                    ? isEn ? '✓ Matched' : '✓ Khớp đúng'
                                    : audit.auditStatus === 'MISMATCH'
                                    ? isEn ? '⚠ Mismatch' : '⚠ Lệch thông tin'
                                    : isEn ? '✕ Damaged/Lost' : '✕ Hỏng/Mất'}
                                </span>
                              </div>

                              <div className="grid grid-cols-2 gap-1 text-[11px] text-slate-600">
                                <div>
                                  <span className="text-slate-400">{isEn ? 'Time:' : 'Thời gian:'}</span>{' '}
                                  <strong className="text-slate-800">
                                    {audit.auditedAt
                                      ? new Date(audit.auditedAt).toLocaleString('vi-VN', {
                                          day: '2-digit',
                                          month: '2-digit',
                                          year: 'numeric',
                                          hour: '2-digit',
                                          minute: '2-digit',
                                        })
                                      : isEn ? 'Recent' : 'Gần đây'}
                                  </strong>
                                </div>
                                <div>
                                  <span className="text-slate-400">{isEn ? 'Auditor:' : 'Người kiểm:'}</span>{' '}
                                  <strong className="text-slate-800">{audit.auditedBy || 'IT Staff'}</strong>
                                </div>
                              </div>

                              {audit.actualNotes && (
                                <p className="text-[11px] text-slate-700 bg-white/70 p-1.5 rounded-lg border border-emerald-100 italic">
                                  &quot;{audit.actualNotes}&quot;
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : data.recentMaintenance &&
                        data.recentMaintenance.filter((m: any) => m.type === 'INSPECTION').length > 0 ? (
                        <div className="space-y-2">
                          {data.recentMaintenance
                            .filter((m: any) => m.type === 'INSPECTION')
                            .map((m: any) => (
                              <div
                                key={m.id}
                                className="p-3 bg-blue-50/50 rounded-2xl border border-blue-200/80 text-xs space-y-1"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-bold text-blue-950">{m.title}</span>
                                  <span className="text-[10px] text-slate-500 font-medium">
                                    {formatDate(m.performedAt)}
                                  </span>
                                </div>
                                {m.description && (
                                  <p className="text-[11px] text-slate-700">{m.description}</p>
                                )}
                              </div>
                            ))}
                        </div>
                      ) : (
                        <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-center text-slate-400 text-xs">
                          {isEn ? 'No audit history for this device.' : 'Chưa có lịch sử kiểm kê cho thiết bị này.'}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 3. LICENSE */}
                {entityType === 'license' && (
                  <div className="space-y-4">
                    <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-50/70 to-indigo-50/40 border border-purple-200/80 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="px-2.5 py-0.5 rounded-lg bg-purple-600 text-white font-bold text-[10px]">
                          {data.licenseType}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full font-bold text-[10px] bg-white border border-purple-200 text-purple-800">
                          {data.status}
                        </span>
                      </div>
                      <h4 className="font-extrabold text-sm text-slate-900 leading-snug">{data.name}</h4>
                      {data.licenseKey && (
                        <p className="font-mono text-xs text-purple-900 bg-purple-100/80 px-2 py-1 rounded-md">
                          Key: {data.licenseKey}
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-center">
                        <span className="text-[10px] text-slate-500 font-bold uppercase block">{isEn ? 'Used / Total Seats' : 'Đã dùng / Tổng Seat'}</span>
                        <span className="text-base font-black text-slate-900">{data.usedSeats} / {data.totalSeats}</span>
                      </div>
                      <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-center">
                        <span className="text-[10px] text-slate-500 font-bold uppercase block">{isEn ? 'Expiry Date' : 'Hạn bản quyền'}</span>
                        <span className="text-xs font-black text-slate-800 mt-1 block">
                          {data.expiryDate ? formatDate(data.expiryDate) : isEn ? 'Perpetual' : 'Vĩnh viễn'}
                        </span>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2 text-[11px]">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">{isEn ? 'Vendor:' : 'Nhà cung cấp:'}</span>
                        {data.vendorName ? (
                          <QuickLink
                            type="vendor"
                            id={data.vendorId || data.vendorName}
                            label={data.vendorName}
                            icon="🏢"
                            showIcon={false}
                            className="font-bold text-slate-800 text-[11px]"
                          />
                        ) : (
                          <span className="text-slate-400 italic">—</span>
                        )}
                      </div>

                      {/* TỰ ĐỘNG LINK HÓA ĐƠN & HỢP ĐỒNG */}
                      {(data.invoiceNumber || data.contractNumber) && (
                        <div className="pt-2 border-t border-slate-200/80 space-y-1.5">
                          {data.invoiceNumber && (
                            <div className="flex items-center justify-between">
                              <span className="text-slate-400 flex items-center gap-1">
                                <Receipt className="w-3 h-3 text-blue-600" />
                                <span>{isEn ? 'Invoice No:' : 'Số Hóa Đơn:'}</span>
                              </span>
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono font-bold text-slate-800">{data.invoiceNumber}</span>
                                {data.matchedInvoiceDoc ? (
                                  <a
                                    href={data.matchedInvoiceDoc.fileUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="px-2 py-0.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-md text-[9.5px] font-bold flex items-center gap-1"
                                    title="Xem file hóa đơn tự động liên kết"
                                  >
                                    <FileText className="w-2.5 h-2.5" />
                                    <span>{isEn ? 'View Contract' : 'Xem HĐ'}</span>
                                  </a>
                                ) : null}
                              </div>
                            </div>
                          )}

                          {data.contractNumber && (
                            <div className="flex items-center justify-between">
                              <span className="text-slate-400 flex items-center gap-1">
                                <FileText className="w-3 h-3 text-indigo-600" />
                                <span>{isEn ? 'Contract No:' : 'Số Hợp Đồng:'}</span>
                              </span>
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono font-bold text-slate-800">{data.contractNumber}</span>
                                {data.matchedContractDoc ? (
                                  <a
                                    href={data.matchedContractDoc.fileUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="px-2 py-0.5 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-md text-[9.5px] font-bold flex items-center gap-1"
                                    title="Xem file hợp đồng tự động liên kết"
                                  >
                                    <FileText className="w-2.5 h-2.5" />
                                    <span>{isEn ? 'View Contract' : 'Xem HĐ'}</span>
                                  </a>
                                ) : null}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 4. SERVICE */}
                {entityType === 'service' && (
                  <div className="space-y-4">
                    <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50/70 to-teal-50/40 border border-emerald-200/80 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-xs px-2.5 py-0.5 rounded-lg bg-emerald-600 text-white">
                          {data.serviceCode}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full font-bold text-[10px] bg-white border border-emerald-200 text-emerald-800">
                          {data.status}
                        </span>
                      </div>
                      <h4 className="font-extrabold text-sm text-slate-900 leading-snug">{data.name}</h4>
                      <p className="text-[11px] text-emerald-900 font-medium">
                        Loại: {data.serviceType} • Quản lý: {data.companyName || 'Tập đoàn ABC'}
                      </p>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2 text-[11px]">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">{isEn ? 'Service Cost:' : 'Chi phí gói:'}</span>
                        <span className="font-extrabold text-emerald-700">{formatCurrency(data.cost, data.currency)} / {data.billingCycle}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">{isEn ? 'Vendor / Partner:' : 'Nhà cung cấp / Đối tác:'}</span>
                        {data.vendorName ? (
                          <QuickLink
                            type="vendor"
                            id={data.vendorId || data.vendorName}
                            label={data.vendorName}
                            icon="🏢"
                            showIcon={false}
                            className="font-bold text-slate-800 text-[11px]"
                          />
                        ) : (
                          <span className="text-slate-400 italic">—</span>
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">{isEn ? 'Next Renewal:' : 'Hạn gia hạn tiếp theo:'}</span>
                        <span className="font-bold text-amber-700">{data.renewalDate ? formatDate(data.renewalDate) : '—'}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">{isEn ? 'Support Hotline:' : 'Hotline hỗ trợ:'}</span>
                        <span className="font-bold text-blue-700">{data.contactSupport || '—'}</span>
                      </div>

                      {/* TỰ ĐỘNG LINK HÓA ĐƠN & HỢP ĐỒNG */}
                      {(data.invoiceNumber || data.contractNumber) && (
                        <div className="pt-2 border-t border-slate-200/80 space-y-1.5">
                          {data.invoiceNumber && (
                            <div className="flex items-center justify-between">
                              <span className="text-slate-400 flex items-center gap-1">
                                <Receipt className="w-3 h-3 text-blue-600" />
                                <span>{isEn ? 'Invoice No:' : 'Số Hóa Đơn:'}</span>
                              </span>
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono font-bold text-slate-800">{data.invoiceNumber}</span>
                                {data.matchedInvoiceDoc ? (
                                  <a
                                    href={data.matchedInvoiceDoc.fileUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="px-2 py-0.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-md text-[9.5px] font-bold flex items-center gap-1"
                                    title="Xem file hóa đơn tự động liên kết"
                                  >
                                    <FileText className="w-2.5 h-2.5" />
                                    <span>{isEn ? 'View Invoice' : 'Xem Hóa Đơn'}</span>
                                  </a>
                                ) : null}
                              </div>
                            </div>
                          )}

                          {data.contractNumber && (
                            <div className="flex items-center justify-between">
                              <span className="text-slate-400 flex items-center gap-1">
                                <FileText className="w-3 h-3 text-indigo-600" />
                                <span>{isEn ? 'Contract No:' : 'Số Hợp Đồng:'}</span>
                              </span>
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono font-bold text-slate-800">{data.contractNumber}</span>
                                {data.matchedContractDoc ? (
                                  <a
                                    href={data.matchedContractDoc.fileUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="px-2 py-0.5 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-md text-[9.5px] font-bold flex items-center gap-1"
                                    title="Xem file hợp đồng tự động liên kết"
                                  >
                                    <FileText className="w-2.5 h-2.5" />
                                    <span>{isEn ? 'View Contract' : 'Xem HĐ'}</span>
                                  </a>
                                ) : null}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 5. TICKET */}
                {entityType === 'ticket' && (
                  <div className="space-y-4">
                    <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-50/70 to-blue-50/40 border border-amber-200/80 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-xs px-2.5 py-0.5 rounded-lg bg-blue-600 text-white">
                          {data.ticketNumber}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full font-bold text-[10px] bg-amber-100 text-amber-900 border border-amber-200">
                          {data.priority}
                        </span>
                      </div>
                      <h4 className="font-extrabold text-sm text-slate-900 leading-snug">{data.title}</h4>
                      <p className="text-[11px] text-slate-500">
                        {isEn ? 'Requester:' : 'Người gửi:'} <strong>{data.createdBy?.fullName}</strong> ({data.createdBy?.department || 'Staff'})
                      </p>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2 text-[11px]">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">{isEn ? 'Status:' : 'Trạng thái:'}</span>
                        <span className="font-bold text-blue-700">{data.status}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">{isEn ? 'Assigned IT:' : 'IT Tiếp nhận:'}</span>
                        <span className="font-bold text-slate-800">{data.assignedTo?.fullName || isEn ? 'Unassigned' : 'Chưa phân công'}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">{isEn ? 'SLA Deadline:' : 'Hạn SLA:'}</span>
                        <span className="font-semibold text-slate-700">{data.slaDeadline ? formatDate(data.slaDeadline) : '—'}</span>
                      </div>
                      {data.asset && (
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">{isEn ? 'Device:' : 'Thiết bị:'}</span>
                          <QuickLink
                            type="asset"
                            id={data.asset.id}
                            label={`[${data.asset.assetTag}] ${data.asset.name}`}
                            className="font-bold text-indigo-700 text-[11px]"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 6. VENDOR */}
                {entityType === 'vendor' && (
                  <div className="space-y-4">
                    <div className="p-4 rounded-2xl bg-gradient-to-br from-cyan-50/70 to-blue-50/40 border border-cyan-200/80 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs px-2.5 py-0.5 rounded-lg bg-cyan-600 text-white">
                          {isEn ? '🏢 IT Partner' : '🏢 Đối Tác IT'}
                        </span>
                        <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] ${data.isActive ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-slate-200 text-slate-600'}`}>
                          {isEn ? (data.isActive ? 'Active Partner' : 'Inactive') : (data.isActive ? 'Đang hợp tác' : 'Tạm ngưng')}
                        </span>
                      </div>
                      <h4 className="font-extrabold text-sm text-slate-900 leading-snug">{data.name}</h4>
                      {data.contactPerson && (
                        <p className="text-[11px] text-slate-600">
                          {isEn ? 'Contact Person:' : 'Đầu mối liên hệ:'} <strong>{data.contactPerson}</strong>
                        </p>
                      )}
                    </div>

                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2 text-[11px]">
                      {data.phone && (
                        <div className="flex items-center gap-2 text-slate-700">
                          <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="font-bold text-blue-700">{data.phone}</span>
                        </div>
                      )}
                      {data.email && (
                        <div className="flex items-center gap-2 text-slate-700">
                          <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="font-medium truncate">{data.email}</span>
                        </div>
                      )}
                      {data.website && (
                        <div className="flex items-center gap-2 text-slate-700">
                          <Globe className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <a href={data.website} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline truncate">
                            {data.website}
                          </a>
                        </div>
                      )}
                      {data.address && (
                        <div className="flex items-start gap-2 text-slate-700">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                          <span className="font-medium leading-relaxed">{data.address}</span>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div className="p-2.5 rounded-2xl bg-indigo-50/60 border border-indigo-100 text-center">
                        <span className="text-[9.5px] text-slate-500 font-bold block">{isEn ? 'Devices' : 'Thiết bị'}</span>
                        <span className="text-base font-black text-indigo-700">{data.totalAssets || 0}</span>
                      </div>
                      <div className="p-2.5 rounded-2xl bg-purple-50/60 border border-purple-100 text-center">
                        <span className="text-[9.5px] text-slate-500 font-bold block">License</span>
                        <span className="text-base font-black text-purple-700">{data.totalLicenses || 0}</span>
                      </div>
                      <div className="p-2.5 rounded-2xl bg-amber-50/60 border border-amber-100 text-center">
                        <span className="text-[9.5px] text-slate-500 font-bold block">{isEn ? 'Maintenance' : 'Bảo trì'}</span>
                        <span className="text-base font-black text-amber-700">{data.totalMaintenance || 0}</span>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer CTA */}
          {entityType && entityId && (
            <div className="p-4 border-t border-slate-200 bg-slate-50/90 flex items-center justify-between gap-3 shrink-0">
              <span className="text-[10px] text-slate-400 font-medium">{isEn ? 'View all detailed information' : 'Xem toàn bộ thông tin'}</span>
              <Link
                href={getDetailUrl(entityType, entityId)}
                onClick={closeQuickView}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 hover:scale-[1.02] active:scale-[0.98]"
              >
                <span>{isEn ? 'Open Details Page' : 'Xem Trang Chi Tiết'}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
