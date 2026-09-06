'use client';

import { useState } from 'react';
import { X, Check, Crown, Sparkles, Shield, Building2, Phone, Mail, Send, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/context';

interface EnterpriseUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  featureRequested?: string;
}

export function EnterpriseUpgradeModal({ isOpen, onClose, featureRequested }: EnterpriseUpgradeModalProps) {
  const { language } = useLanguage();
  const isEn = language === 'en';

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [message, setMessage] = useState(
    featureRequested
      ? (isEn ? `Interested in Enterprise Edition with: ${featureRequested}` : `Tôi quan tâm đến gói Enterprise với tính năng: ${featureRequested}`)
      : ''
  );
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[92vh] overflow-y-auto bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Hero */}
        <div className="p-8 pb-6 border-b border-slate-100 dark:border-slate-800 bg-linear-to-br from-indigo-900 via-blue-900 to-slate-900 text-white rounded-t-3xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 text-xs font-bold uppercase tracking-wider mb-3">
              <Crown className="w-3.5 h-3.5" />
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
        <div className="p-6 sm:p-8 space-y-8">
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
              <div className="absolute -top-3 right-6 px-3 py-0.5 rounded-full bg-linear-to-r from-amber-500 to-indigo-600 text-white text-[11px] font-black uppercase tracking-wider shadow-xs">
                {isEn ? 'Recommended' : 'Khuyên Dùng'}
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
                    <span>Enterprise Edition</span>
                    <Crown className="w-4 h-4 text-amber-500 fill-amber-500" />
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

          {/* Contact Form or Success State */}
          <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
            {submitted ? (
              <div className="py-6 text-center space-y-3">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
                <h4 className="text-base font-bold text-slate-900 dark:text-white">
                  {isEn ? 'Thank you! Your request has been received.' : 'Cảm ơn bạn! Yêu cầu tư vấn đã được ghi nhận.'}
                </h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  {isEn
                    ? 'Our solution consultant will contact you shortly to schedule an Enterprise demo and share pricing.'
                    : 'Đội ngũ tư vấn giải pháp sẽ liên hệ lại với bạn trong vòng 24 giờ làm việc để tư vấn và cung cấp giấy phép Enterprise.'}
                </p>
                <button
                  type="button"
                  onClick={onClose}
                  className="mt-2 px-6 py-2 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold cursor-pointer"
                >
                  {isEn ? 'Close Window' : 'Đóng cửa sổ'}
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-indigo-600" />
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    {isEn ? 'Request Enterprise Demo & Quotation' : 'Đăng Ký Tư Vấn & Nhận Báo Giá Bản Enterprise'}
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                      {isEn ? 'Full Name' : 'Họ và tên'} *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="VD: Nguyễn Văn A"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                      {isEn ? 'Work Email' : 'Email công việc'} *
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="name@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                      {isEn ? 'Phone / Zalo' : 'Số điện thoại / Zalo'} *
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="0987.xxx.xxx"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                      {isEn ? 'Company Name' : 'Tên Doanh nghiệp'} *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Công ty Cổ phần ABC"
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                    {isEn ? 'Requirements / Notes' : 'Nhu cầu cụ thể'}
                  </label>
                  <textarea
                    rows={2}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder={isEn ? 'Tell us about your team size or specific integration needs...' : 'Mô tả quy mô thiết bị hoặc yêu cầu tích hợp cụ thể...'}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      <span>contact@simplyit.io</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <span>Hotline: (+84) 988.888.xxx</span>
                    </span>
                  </div>

                  <button
                    type="submit"
                    className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-linear-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{isEn ? 'Submit Enterprise Request' : 'Gửi Yêu Cầu Tư Vấn Enterprise'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
