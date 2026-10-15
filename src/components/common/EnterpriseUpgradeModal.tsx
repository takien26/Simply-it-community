'use client';

import { useState, useEffect } from 'react';
import { X, Check, ShieldCheck, Sparkles, Shield, Building2, Phone, Mail, Send, CheckCircle2, Copy, ExternalLink, Loader2 } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/context';

interface EnterpriseUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  featureRequested?: string;
}

export function EnterpriseUpgradeModal({ isOpen, onClose, featureRequested }: EnterpriseUpgradeModalProps) {
  // ESC key listener to close modal
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
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [mailtoUrl, setMailtoUrl] = useState('');
  const [gmailUrl, setGmailUrl] = useState('');
  const [copyText, setCopyText] = useState('');

  if (!isOpen) return null;

  const triggerOpenOutlook = (customMailto?: string) => {
    const url = customMailto || mailtoUrl;
    if (!url) return;
    try {
      const link = document.createElement('a');
      link.href = url;
      link.target = '_self';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch {
      window.location.href = url;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const subject = `[SIMPLY IT] Đăng ký tư vấn bản Enterprise - ${company || fullName || 'Khách hàng'}`;
    const emailBody = `Kính gửi tác giả Tạ Trung Kiên (SIMPLY IT),

Tôi quan tâm và muốn đăng ký tư vấn / nhận báo giá gói SIMPLY IT Enterprise. Dưới đây là thông tin liên hệ của tôi:

• Họ và tên: ${fullName || 'N/A'}
• Email công việc: ${email || 'N/A'}
• Số điện thoại / Zalo: ${phone || 'N/A'}
• Tên Doanh nghiệp: ${company || 'N/A'}
• Nhu cầu cụ thể:
${message || 'Quan tâm tư vấn tính năng bản Enterprise'}

Thời gian gửi: ${new Date().toLocaleString('vi-VN')}
--------------------------------------------------
Gửi từ hệ thống SIMPLY IT Management Portal`;

    const generatedMailto = `mailto:takien26@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(emailBody)}`;
    const generatedGmail = `https://mail.google.com/mail/?view=cm&fs=1&to=takien26@gmail.com&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(emailBody)}`;

    setMailtoUrl(generatedMailto);
    setGmailUrl(generatedGmail);
    setCopyText(`Tiêu đề: ${subject}\n\n${emailBody}`);

    // 1. Tự động mở Outlook / Email Client ngay lập tức
    triggerOpenOutlook(generatedMailto);

    // 2. Ghi nhận log lead vào backend (nếu có cấu hình SMTP thì backend cũng gửi thêm 1 bản)
    try {
      await fetch('/api/enterprise/consultation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, email, phone, company, message }),
      });
    } catch (err) {
      console.warn('[Enterprise Consultation] API error:', err);
    } finally {
      setLoading(false);
      setSubmitted(true);
    }
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

          {/* Contact Form or Success State */}
          <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
            {submitted ? (
              <div className="py-6 px-4 text-center space-y-4 animate-in fade-in zoom-in-95 duration-200">
                <div className="w-14 h-14 rounded-2xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 mx-auto flex items-center justify-center shadow-md">
                  <Mail className="w-7 h-7" />
                </div>

                <div className="space-y-1">
                  <h4 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                    {isEn ? 'Outlook / Email Client Triggered!' : 'Đã Kích Hoạt Mở Outlook / Ứng Dụng Mail!'}
                  </h4>
                  <p className="text-xs text-slate-500 max-w-lg mx-auto leading-relaxed">
                    {isEn
                      ? 'A pre-filled email to takien26@gmail.com has been prepared in your default mail app. Simply click "Send" in Outlook to complete.'
                      : 'Hệ thống đã tự động tạo sẵn email gửi tới tác giả (takien26@gmail.com) trên ứng dụng Outlook của bạn. Bạn chỉ cần nhấn nút "Gửi (Send)" trong Outlook.'}
                  </p>
                </div>

                {/* Quick actions box if Outlook did not open or user uses Gmail Web */}
                <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-lg mx-auto space-y-3 shadow-xs text-left">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block text-center">
                    {isEn ? 'Send Options & Fallbacks' : 'Các Lựa Chọn Gửi Thư Nhanh'}
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => triggerOpenOutlook()}
                      className="px-3.5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
                    >
                      <Mail className="w-4 h-4" />
                      <span>{isEn ? 'Open Outlook Again' : 'Mở lại Outlook'}</span>
                    </button>

                    <a
                      href={gmailUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3.5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm text-center"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>{isEn ? 'Send via Web Gmail' : 'Gửi qua Web Gmail'}</span>
                    </a>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(copyText);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 3000);
                    }}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-400" />}
                    <span>{copied ? (isEn ? 'Copied to Clipboard!' : 'Đã sao chép nội dung thư!') : (isEn ? 'Copy email text to paste in Zalo / Chat' : 'Sao chép nội dung thư để gửi Zalo / Chat')}</span>
                  </button>
                </div>

                <div className="flex items-center justify-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setSubmitted(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    {isEn ? '← Edit Info' : '← Sửa lại thông tin'}
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-5 py-2 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    {isEn ? 'Done / Close' : 'Hoàn tất & Đóng'}
                  </button>
                </div>
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
                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                    <a
                      href="mailto:takien26@gmail.com?subject=[SIMPLY%20IT]%20Dang%20ky%20tu%20van%20ban%20quyen%20Enterprise"
                      className="flex items-center gap-1.5 hover:text-blue-600 transition-colors"
                    >
                      <Mail className="w-3.5 h-3.5 text-blue-600" />
                      <span className="font-semibold text-slate-700 dark:text-slate-300">takien26@gmail.com</span>
                    </a>
                    <span className="flex items-center gap-1">
                      <span className="text-slate-400">Tác giả:</span>
                      <strong className="text-slate-700 dark:text-slate-300">Tạ Trung Kiên</strong>
                    </span>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>{isEn ? 'Processing...' : 'Đang xử lý...'}</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>{isEn ? 'Submit Enterprise Request' : 'Gửi Yêu Cầu Tư Vấn Enterprise'}</span>
                      </>
                    )}
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
