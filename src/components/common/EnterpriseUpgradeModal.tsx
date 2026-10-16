'use client';

import { useState, useEffect } from 'react';
import { X, Check, ShieldCheck, Sparkles, Mail, Copy, ExternalLink, UserCheck } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/context';

const CONTACT_EMAIL = 'takien26@gmail.com';

interface EnterpriseUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  featureRequested?: string;
}

export function EnterpriseUpgradeModal({ isOpen, onClose, featureRequested }: EnterpriseUpgradeModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const { language } = useLanguage();
  const isEn = language === 'en';
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const subject = `[SIMPLY IT] Đăng ký tư vấn & Báo giá bản Enterprise${featureRequested ? ` - ${featureRequested}` : ''}`;
  const body = `Kính gửi tác giả Tạ Trung Kiên (SIMPLY IT),

Tôi quan tâm và muốn nhận tư vấn / báo giá bản quyền gói SIMPLY IT Enterprise${featureRequested ? ` (Tính năng quan tâm: ${featureRequested})` : ''}.

Thông tin liên hệ của tôi:
- Họ và tên: 
- Số điện thoại / Zalo: 
- Tên Doanh nghiệp: 
- Quy mô / Nhu cầu cụ thể: 

Trân trọng!`;

  const mailtoUrl = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${CONTACT_EMAIL}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  const outlookWebUrl = `https://outlook.office.com/mail/deeplink/compose?to=${CONTACT_EMAIL}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(CONTACT_EMAIL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[92vh] overflow-y-auto bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors z-10 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Hero */}
        <div className="p-8 pb-6 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-br from-indigo-900 via-blue-900 to-slate-900 text-white rounded-t-3xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-200 border border-blue-400/30 text-xs font-bold uppercase tracking-wider mb-3">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>SIMPLY IT — Enterprise Edition</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
              {isEn ? 'Upgrade to SIMPLY IT Enterprise' : 'Nâng Cấp Lên Bản SIMPLY IT Enterprise'}
            </h2>
            <p className="mt-2 text-sm text-blue-200 max-w-2xl leading-relaxed">
              {isEn
                ? 'Unlock enterprise-grade security, automated single sign-on (SSO), Active Directory synchronization, smart ITSM routing, and 24/7 dedicated support.'
                : 'Khai phóng toàn diện sức mạnh quản trị CNTT: Xác thực SSO Microsoft 365, đồng bộ Active Directory, Webhook tự động hóa đa kênh và hỗ trợ kỹ thuật chuyên sâu.'}
            </p>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-8 space-y-6">
          {/* Comparison Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Community Card */}
            <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Community Edition</h3>
                  <p className="text-xs text-slate-500">{isEn ? 'Free forever for SMBs & Teams' : 'Miễn phí vĩnh viễn cho SMBs'}</p>
                </div>
                <span className="px-3 py-1 rounded-xl text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                  {isEn ? 'Active' : 'Đang Dùng'}
                </span>
              </div>

              <div className="text-2xl font-black text-slate-900 dark:text-white">
                0đ <span className="text-xs font-normal text-slate-500">/ {isEn ? 'forever' : 'vĩnh viễn'}</span>
              </div>

              <ul className="space-y-2.5 text-xs text-slate-600 dark:text-slate-300">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{isEn ? 'Full IT Asset Management & Lifecycles' : 'Quản lý toàn diện Vòng đời Tài sản IT'}</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{isEn ? 'Software Licenses & Telecom Services' : 'Quản lý License Bản quyền & Dịch vụ VT'}</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{isEn ? 'Spare Parts Inventory & Maintenance' : 'Kho Phụ tùng & Lịch bảo trì thiết bị'}</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{isEn ? 'Employee Portal & Helpdesk Ticketing' : 'Cổng Nhân viên & Tiếp nhận Ticket'}</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{isEn ? 'QR Code Label Generator & Audit Scanner' : 'In tem QR Code & Quét kiểm kê tài sản'}</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{isEn ? 'Self-hosted via Docker container' : 'Tự vận hành cài đặt qua Docker'}</span>
                </li>
              </ul>
            </div>

            {/* Enterprise Card */}
            <div className="p-6 rounded-2xl border-2 border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/20 space-y-4 relative shadow-lg">
              <div className="absolute -top-3 right-6 px-3 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-indigo-600 text-white text-[11px] font-black uppercase tracking-wider shadow-xs">
                {isEn ? 'Recommended' : 'Khuyên Dùng'}
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
                    <span>Enterprise Edition</span>
                    <ShieldCheck className="w-4 h-4 text-indigo-600" />
                  </h3>
                  <p className="text-xs text-indigo-700/80 dark:text-indigo-400">{isEn ? 'Complete Enterprise IT Operations' : 'Doanh nghiệp & Tập đoàn đa chi nhánh'}</p>
                </div>
              </div>

              <div className="text-2xl font-black text-indigo-950 dark:text-indigo-200">
                {isEn ? 'Contact for Quote' : 'Liên hệ Báo giá'} <span className="text-xs font-normal text-slate-500">/ On-premise or Cloud</span>
              </div>

              <ul className="space-y-2.5 text-xs text-slate-700 dark:text-slate-200">
                <li className="flex items-center gap-2 font-semibold">
                  <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>{isEn ? 'Microsoft 365 / Azure AD Single Sign-On (SSO)' : 'Đăng nhập 1 chạm Microsoft 365 SSO / Azure AD'}</span>
                </li>
                <li className="flex items-center gap-2 font-semibold">
                  <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>{isEn ? 'Windows Server Active Directory / LDAP Sync' : 'Đồng bộ tài khoản Active Directory / LDAP Server'}</span>
                </li>
                <li className="flex items-center gap-2 font-semibold">
                  <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>{isEn ? 'Automated Webhooks (MS Teams, Zalo OA, Slack)' : 'Webhook Bắn tin tức thời (Teams, Zalo OA, Slack)'}</span>
                </li>
                <li className="flex items-center gap-2 font-semibold">
                  <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>{isEn ? 'Intelligent Routing & Dynamic SLA Policies' : 'Phân tuyến Ticket tự động & Cam kết SLA'}</span>
                </li>
                <li className="flex items-center gap-2 font-semibold">
                  <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>{isEn ? 'AI Copilot Assistant & OCR Invoice Scanner' : 'Trợ lý AI Copilot & OCR Hóa đơn tài liệu'}</span>
                </li>
                <li className="flex items-center gap-2 font-semibold">
                  <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>{isEn ? 'Dedicated SLA Support & Implementation' : 'Triển khai bàn giao chìa khóa trao tay & SLA 24/7'}</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Direct Contact Action Box (No form) */}
          <div className="p-6 rounded-2xl border border-indigo-200 dark:border-indigo-900/60 bg-gradient-to-br from-indigo-50/70 via-white to-blue-50/50 dark:from-slate-800/80 dark:via-slate-900 dark:to-indigo-950/30 space-y-5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-slate-800">
              <div className="space-y-1">
                <h4 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <Mail className="w-4 h-4 text-indigo-600" />
                  <span>{isEn ? 'Direct Contact for Enterprise Licensing & Demo' : 'Liên Hệ Trực Tiếp Để Nhận Báo Giá & Cấp Phép Enterprise'}</span>
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {isEn
                    ? 'Click any email method below to automatically open a pre-filled message to the author.'
                    : 'Chọn phương thức bên dưới để mở trực tiếp trình gửi thư (Outlook, Gmail...) với nội dung đã được soạn sẵn.'}
                </p>
              </div>

              <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shrink-0">
                <UserCheck className="w-4 h-4 text-indigo-600 shrink-0" />
                <div className="text-xs">
                  <span className="text-slate-400 block text-[10px] leading-none">{isEn ? 'Author & Developer' : 'Tác giả & Phát triển'}</span>
                  <strong className="text-slate-900 dark:text-white font-bold">Tạ Trung Kiên</strong>
                </div>
              </div>
            </div>

            {/* 3 Direct Email Launch Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <a
                href={mailtoUrl}
                className="px-4 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Mail className="w-4 h-4 shrink-0" />
                <span>{isEn ? 'Open Outlook / Mail App' : 'Mở Outlook / App Mail'}</span>
              </a>

              <a
                href={gmailUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <ExternalLink className="w-4 h-4 shrink-0" />
                <span>{isEn ? 'Compose via Gmail Web' : 'Gửi qua Gmail (Web)'}</span>
              </a>

              <a
                href={outlookWebUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-3 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-md shadow-sky-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <ExternalLink className="w-4 h-4 shrink-0" />
                <span>{isEn ? 'Compose via Outlook 365' : 'Gửi qua Outlook 365 (Web)'}</span>
              </a>
            </div>

            {/* Copy Email Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1 text-xs">
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                <span className="text-slate-400">{isEn ? 'Direct Email:' : 'Địa chỉ Email nhận yêu cầu:'}</span>
                <strong className="font-mono text-indigo-600 dark:text-indigo-400 select-all text-sm">{CONTACT_EMAIL}</strong>
              </div>

              <button
                type="button"
                onClick={handleCopyEmail}
                className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                <span>{copied ? (isEn ? 'Copied Email!' : 'Đã sao chép địa chỉ Email!') : (isEn ? 'Copy Email Address' : 'Sao chép địa chỉ Email')}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
