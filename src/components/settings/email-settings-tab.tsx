'use client';

import { useLanguage } from '@/lib/i18n/context';
import { useState, useEffect, useRef } from 'react';
import {
  Mail,
  Server,
  Key,
  Shield,
  Save,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Send,
  FileText,
  ToggleLeft,
  ToggleRight,
  Eye,
  EyeOff,
  Download,
  Upload,
  Sparkles,
  Bold,
  Italic,
  Code,
  LayoutTemplate,
  HelpCircle,
  Link as LinkIcon,
  Table as TableIcon,
  Check,
} from 'lucide-react';

function getTemplateVariablesMap(isEn: boolean): Record<
  string,
  { tag: string; label: string; desc: string; sample: string }[]
> {
  return {
    'ticket.created': [
      { tag: '{{ticketNumber}}', label: isEn ? 'Ticket Number' : 'Mã Ticket', desc: isEn ? 'Unique identifier of the ticket' : 'Mã số ticket được tạo', sample: 'TK-2026-0012' },
      { tag: '{{title}}', label: isEn ? 'Title' : 'Tiêu đề', desc: isEn ? 'Incident / request title' : 'Tiêu đề sự cố / yêu cầu', sample: 'Màn hình Dell bị chớp nháy liên tục' },
      { tag: '{{description}}', label: isEn ? 'Description' : 'Mô tả', desc: isEn ? 'Detailed incident content' : 'Nội dung chi tiết sự cố', sample: 'Máy tính phòng Kế toán bật không lên nguồn...' },
      { tag: '{{priority}}', label: isEn ? 'Priority' : 'Mức ưu tiên', desc: isEn ? 'Priority level (P1-P4)' : 'Mức độ ưu tiên (P1-P4)', sample: 'HIGH' },
      { tag: '{{creatorName}}', label: isEn ? 'Creator' : 'Người tạo', desc: isEn ? 'Name of request creator' : 'Họ tên người tạo yêu cầu', sample: 'Nguyễn Văn An' },
      { tag: '{{recipientName}}', label: isEn ? 'Recipient' : 'Người nhận', desc: isEn ? 'Recipient name' : 'Họ tên người nhận email', sample: 'Trần Thị Bích' },
      { tag: '{{slaDeadline}}', label: isEn ? 'SLA Deadline' : 'Hạn SLA', desc: isEn ? 'Agreed completion deadline' : 'Thời hạn hoàn thành cam kết', sample: '17:00 30/08/2026' },
      { tag: '{{link}}', label: isEn ? 'Ticket URL' : 'Link Ticket', desc: isEn ? 'Link to view ticket' : 'Đường dẫn xem ticket', sample: 'http://localhost:3000/tickets' },
    ],
    'ticket.assigned': [
      { tag: '{{ticketNumber}}', label: isEn ? 'Ticket Number' : 'Mã Ticket', desc: isEn ? 'Unique identifier of the ticket' : 'Mã số ticket', sample: 'TK-2026-0012' },
      { tag: '{{title}}', label: isEn ? 'Title' : 'Tiêu đề', desc: isEn ? 'Incident title' : 'Tiêu đề sự cố', sample: 'Cài đặt phần mềm MISA' },
      { tag: '{{priority}}', label: isEn ? 'Priority' : 'Mức ưu tiên', desc: isEn ? 'Priority level' : 'Mức độ ưu tiên', sample: 'MEDIUM' },
      { tag: '{{creatorName}}', label: isEn ? 'Reporter' : 'Người báo', desc: isEn ? 'Name of reporter' : 'Người báo sự cố', sample: 'Phạm Minh Đức' },
      { tag: '{{assigneeName}}', label: isEn ? 'Assignee' : 'KTV phụ trách', desc: isEn ? 'Assigned technician name' : 'Tên KTV được giao', sample: 'Lê Hoàng IT' },
      { tag: '{{slaDeadline}}', label: isEn ? 'SLA Deadline' : 'Hạn SLA', desc: isEn ? 'Resolution deadline' : 'Thời hạn giải quyết', sample: '12:00 29/08/2026' },
      { tag: '{{link}}', label: isEn ? 'Ticket URL' : 'Link Ticket', desc: isEn ? 'Link to process ticket' : 'Đường dẫn xử lý', sample: 'http://localhost:3000/tickets' },
    ],
    'ticket.resolved': [
      { tag: '{{ticketNumber}}', label: isEn ? 'Ticket Number' : 'Mã Ticket', desc: isEn ? 'Unique identifier of the ticket' : 'Mã số ticket', sample: 'TK-2026-0012' },
      { tag: '{{title}}', label: isEn ? 'Title' : 'Tiêu đề', desc: isEn ? 'Request title' : 'Tiêu đề yêu cầu', sample: 'Lỗi không vào được mạng' },
      { tag: '{{resolutionNote}}', label: isEn ? 'Resolution Note' : 'Ghi chú giải pháp', desc: isEn ? 'Technician resolution details' : 'Cách KTV đã xử lý', sample: 'Đã bấm lại đầu mạng và cấp IP mới.' },
      { tag: '{{resolvedBy}}', label: isEn ? 'Resolved By' : 'KTV xử lý', desc: isEn ? 'Completed by technician' : 'Người hoàn thành', sample: 'Lê Hoàng IT' },
      { tag: '{{resolvedAt}}', label: isEn ? 'Resolved At' : 'Thời gian xong', desc: isEn ? 'Resolution timestamp' : 'Thời điểm giải quyết', sample: '14:30 29/08/2026' },
      { tag: '{{link}}', label: isEn ? 'Ticket URL' : 'Link Ticket', desc: isEn ? 'Link to review ticket' : 'Đường dẫn xem lại', sample: 'http://localhost:3000/tickets' },
    ],
    'license.expiring': [
      { tag: '{{licenseName}}', label: isEn ? 'License Name' : 'Tên License', desc: isEn ? 'Software license title' : 'Tên bản quyền phần mềm', sample: 'Microsoft 365 Business' },
      { tag: '{{vendorName}}', label: isEn ? 'Vendor / Publisher' : 'Nhà cung cấp', desc: isEn ? 'Distributor / provider' : 'Đơn vị phân phối', sample: 'FPT Telecom' },
      { tag: '{{daysRemaining}}', label: isEn ? 'Days Remaining' : 'Số ngày còn', desc: isEn ? 'Days until expiration' : 'Số ngày tới hạn', sample: '15' },
      { tag: '{{expiryDate}}', label: isEn ? 'Expiry Date' : 'Ngày hết hạn', desc: isEn ? 'Official expiry date' : 'Ngày hết hạn chính thức', sample: '15/09/2026' },
      { tag: '{{totalSeats}}', label: isEn ? 'Total Seats' : 'Số Seats', desc: isEn ? 'Number of seats/licenses' : 'Số lượng license', sample: '50' },
      { tag: '{{link}}', label: isEn ? 'Renewal URL' : 'Link gia hạn', desc: isEn ? 'Link to check and renew' : 'Đường dẫn kiểm tra', sample: 'http://localhost:3000/licenses' },
    ],
    'approval.pending': [
      { tag: '{{approvalCode}}', label: isEn ? 'Request Code' : 'Mã phiếu', desc: isEn ? 'Approval request ID' : 'Mã phiếu yêu cầu', sample: 'AR-2026-0008' },
      { tag: '{{approvalType}}', label: isEn ? 'Request Type' : 'Loại yêu cầu', desc: isEn ? 'New issue / replacement' : 'Cấp mới / Đổi máy', sample: 'Cấp mới thiết bị' },
      { tag: '{{requesterName}}', label: isEn ? 'Requester' : 'Người yêu cầu', desc: isEn ? 'Staff member making request' : 'Nhân viên đề xuất', sample: 'Nguyễn Thị Hoa' },
      { tag: '{{title}}', label: isEn ? 'Details' : 'Chi tiết', desc: isEn ? 'Proposed equipment details' : 'Tên thiết bị đề xuất', sample: 'Laptop Dell XPS 15 32GB RAM' },
      { tag: '{{justification}}', label: isEn ? 'Justification' : 'Lý do', desc: isEn ? 'Purpose / reason for request' : 'Mục đích sử dụng', sample: 'Phục vụ dựng video 4K...' },
      { tag: '{{approverName}}', label: isEn ? 'Approver' : 'Người duyệt', desc: isEn ? 'Designated approving manager' : 'Quản lý duyệt phiếu', sample: 'Trần Văn Giám Đốc' },
      { tag: '{{link}}', label: isEn ? 'Approval URL' : 'Link duyệt', desc: isEn ? 'Link to approve or reject' : 'Đường dẫn phê duyệt', sample: 'http://localhost:3000/approvals' },
    ],
    'service.created': [
      { tag: '{{serviceName}}', label: isEn ? 'Service Name' : 'Tên Dịch Vụ', desc: isEn ? 'Requested IT service' : 'Tên dịch vụ IT được yêu cầu', sample: 'Cài đặt Adobe Premiere 2026' },
      { tag: '{{serviceCategory}}', label: isEn ? 'Category' : 'Nhóm dịch vụ', desc: isEn ? 'Software / Network / Email' : 'Phần mềm / Mạng / Email', sample: 'Phần mềm chuyên dụng' },
      { tag: '{{requesterName}}', label: isEn ? 'Requester' : 'Người yêu cầu', desc: isEn ? 'Staff member requesting service' : 'Nhân viên đề xuất dịch vụ', sample: 'Hoàng Minh Tuấn' },
      { tag: '{{department}}', label: isEn ? 'Department' : 'Phòng ban', desc: isEn ? 'Working department' : 'Phòng ban công tác', sample: 'Phòng Truyền Thông' },
      { tag: '{{urgency}}', label: isEn ? 'Urgency' : 'Độ khẩn', desc: isEn ? 'Priority / urgency of request' : 'Mức độ ưu tiên yêu cầu', sample: 'Gấp trong ngày' },
      { tag: '{{notes}}', label: isEn ? 'Notes' : 'Ghi chú', desc: isEn ? 'Service request notes' : 'Chi tiết yêu cầu dịch vụ', sample: 'Cần license bản quyền để xử lý video sự kiện công ty' },
      { tag: '{{recipientName}}', label: isEn ? 'Recipient' : 'Người nhận', desc: isEn ? 'IT Support Technician' : 'Kỹ thuật viên IT', sample: 'Đội Hỗ Trợ IT' },
      { tag: '{{link}}', label: isEn ? 'Service URL' : 'Link dịch vụ', desc: isEn ? 'Link to view service' : 'Đường dẫn xem dịch vụ', sample: 'http://localhost:3000/services' },
    ],
    'subscription.expiring': [
      { tag: '{{serviceName}}', label: isEn ? 'Subscription Name' : 'Tên Thuê Bao', desc: isEn ? 'Service / subscription contract' : 'Tên dịch vụ / hợp đồng thuê bao', sample: 'Internet Leased Line VNPT 200Mbps' },
      { tag: '{{providerName}}', label: isEn ? 'Provider' : 'Nhà cung cấp', desc: isEn ? 'Service provider' : 'Đơn vị cung cấp dịch vụ', sample: 'VNPT Telecom Chi Nhánh Hà Nội' },
      { tag: '{{contractNumber}}', label: isEn ? 'Contract Number' : 'Số hợp đồng', desc: isEn ? 'Contract identifier' : 'Mã số hợp đồng ký kết', sample: 'HĐ-2026/VNPT-088' },
      { tag: '{{recurringAmount}}', label: isEn ? 'Recurring Cost' : 'Chi phí định kỳ', desc: isEn ? 'Periodic payment amount' : 'Số tiền thanh toán mỗi kỳ', sample: '12.500.000 đ / Tháng' },
      { tag: '{{expiryDate}}', label: isEn ? 'Due Date' : 'Ngày tới hạn', desc: isEn ? 'Payment or renewal due date' : 'Hạn thanh toán hoặc kết thúc hợp đồng', sample: '15/09/2026' },
      { tag: '{{daysRemaining}}', label: isEn ? 'Days Remaining' : 'Số ngày còn lại', desc: isEn ? 'Days left until expiration' : 'Thời gian còn lại tới hạn', sample: '10' },
      { tag: '{{link}}', label: isEn ? 'Subscription URL' : 'Link thuê bao', desc: isEn ? 'Link to manage subscription' : 'Đường dẫn quản lý thuê bao', sample: 'http://localhost:3000/services' },
    ],
  };
}


function getLocalizedTemplateName(code: string, originalName: string, isEn: boolean): string {
  if (!isEn) return originalName;
  const map: Record<string, string> = {
    'ticket.created': 'New Ticket Created',
    'ticket.assigned': 'Ticket Assigned',
    'ticket.resolved': 'Ticket Resolved',
    'license.expiring': 'License Expiry Alert',
    'approval.pending': 'Equipment Approval Request',
    'service.created': 'New IT Service Request',
    'subscription.expiring': 'Subscription Expiry Alert',
  };
  return map[code] || originalName;
}

export function EmailSettingsTab() {
  const { language } = useLanguage();
  const isEn = language === 'en';
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [smtpConfig, setSmtpConfig] = useState({
    host: '',
    port: '587',
    secure: false,
    user: '',
    password: '',
    fromName: 'SIMPLY IT',
    fromEmail: '',
    enabled: true,
  });

  const [testEmail, setTestEmail] = useState('');
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [templateSaving, setTemplateSaving] = useState(false);

  // Advanced editor states
  const [editorMode, setEditorMode] = useState<'EDIT' | 'PREVIEW'>('EDIT');
  const [importingWord, setImportingWord] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bodyTextareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    loadEmailData();
  }, []);

  const loadEmailData = async () => {
    setLoading(true);
    try {
      // 1. Fetch system settings
      const resSettings = await fetch('/api/settings');
      const dataSettings = await resSettings.json();

      if (dataSettings.success && Array.isArray(dataSettings.settings)) {
        const map = new Map(dataSettings.settings.map((s: any) => [s.key, s.value]));
        setSmtpConfig({
          host: (map.get('email.smtp_host') as string) || '',
          port: (map.get('email.smtp_port') as string) || '587',
          secure: map.get('email.smtp_secure') === 'true',
          user: (map.get('email.smtp_user') as string) || '',
          password: (map.get('email.smtp_password') as string) || '',
          fromName: (map.get('email.from_name') as string) || 'SIMPLY IT Support',
          fromEmail: (map.get('email.from_email') as string) || '',
          enabled: map.get('email.enabled') !== 'false',
        });
      }

      // 2. Fetch email templates
      const resTemplates = await fetch('/api/email/templates');
      const dataTemplates = await resTemplates.json();
      if (dataTemplates.success && Array.isArray(dataTemplates.templates)) {
        setTemplates(dataTemplates.templates);
        if (dataTemplates.templates.length > 0) {
          setSelectedTemplate(dataTemplates.templates[0]);
        }
      }
    } catch (e: any) {
      console.error(e);
      setToast({ type: 'error', message: 'Không thể tải cấu hình email' });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSmtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setToast(null);

    try {
      const payload = [
        { key: 'email.smtp_host', value: smtpConfig.host },
        { key: 'email.smtp_port', value: smtpConfig.port },
        { key: 'email.smtp_secure', value: String(smtpConfig.secure) },
        { key: 'email.smtp_user', value: smtpConfig.user },
        { key: 'email.smtp_password', value: smtpConfig.password },
        { key: 'email.from_name', value: smtpConfig.fromName },
        { key: 'email.from_email', value: smtpConfig.fromEmail },
        { key: 'email.enabled', value: String(smtpConfig.enabled) },
      ];

      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: payload }),
      });

      const data = await res.json();
      if (data.success) {
        setToast({ type: 'success', message: 'Đã lưu cấu hình máy chủ SMTP thành công!' });
      } else {
        setToast({ type: 'error', message: data.error || 'Lưu cấu hình thất bại' });
      }
    } catch (e: any) {
      setToast({ type: 'error', message: e.message });
    } finally {
      setSaving(false);
    }
  };

  const handleTestSmtp = async () => {
    if (!testEmail || !testEmail.includes('@')) {
      setToast({ type: 'error', message: 'Vui lòng nhập địa chỉ email hợp lệ để nhận thư thử nghiệm' });
      return;
    }

    setTesting(true);
    setToast(null);

    try {
      const res = await fetch('/api/email/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testEmail }),
      });

      const data = await res.json();
      if (data.success) {
        setToast({ type: 'success', message: `Đã gửi email thử nghiệm thành công tới ${testEmail}! Hãy kiểm tra hộp thư.` });
      } else {
        setToast({ type: 'error', message: data.error || 'Kiểm tra kết nối thất bại' });
      }
    } catch (e: any) {
      setToast({ type: 'error', message: e.message });
    } finally {
      setTesting(false);
    }
  };

  const handleSaveTemplate = async () => {
    if (!selectedTemplate) return;
    setTemplateSaving(true);
    setToast(null);

    try {
      const res = await fetch('/api/email/templates', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedTemplate.id,
          subject: selectedTemplate.subject,
          bodyHtml: selectedTemplate.bodyHtml,
          isActive: selectedTemplate.isActive,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setTemplates((prev) =>
          prev.map((t) => (t.id === selectedTemplate.id ? selectedTemplate : t))
        );
        setToast({ type: 'success', message: `Đã lưu mẫu email "${selectedTemplate.name}" thành công!` });
      } else {
        setToast({ type: 'error', message: data.error || 'Lưu mẫu thất bại' });
      }
    } catch (e: any) {
      setToast({ type: 'error', message: e.message });
    } finally {
      setTemplateSaving(false);
    }
  };

  // 1-Click Variable Tag Inserter into Textarea
  const insertVariable = (tag: string) => {
    if (!bodyTextareaRef.current || !selectedTemplate) return;
    const textarea = bodyTextareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = selectedTemplate.bodyHtml || '';
    const newText = text.substring(0, start) + tag + text.substring(end);

    setSelectedTemplate({ ...selectedTemplate, bodyHtml: newText });

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + tag.length, start + tag.length);
    }, 50);
  };

  // Quick HTML snippet inserter
  const insertHtmlSnippet = (snippet: string) => {
    if (!bodyTextareaRef.current || !selectedTemplate) return;
    const textarea = bodyTextareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = selectedTemplate.bodyHtml || '';
    const newText = text.substring(0, start) + snippet + text.substring(end);

    setSelectedTemplate({ ...selectedTemplate, bodyHtml: newText });
    setTimeout(() => {
      textarea.focus();
    }, 50);
  };

  // Download Word Document Template
  const handleDownloadWord = () => {
    if (!selectedTemplate) return;
    const url = `/api/email/templates/export-word?code=${selectedTemplate.code}`;
    window.open(url, '_blank');
  };

  // Import from Word Document (.docx / .html)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedTemplate) return;

    setImportingWord(true);
    setToast(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/email/templates/import-word', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (data.success && data.html) {
        setSelectedTemplate({
          ...selectedTemplate,
          subject: data.subject || selectedTemplate.subject,
          bodyHtml: data.html,
        });
        setToast({
          type: 'success',
          message: `Đã nạp mẫu từ file Word "${file.name}" thành công! Bạn có thể xem trước hoặc nhấn Lưu.`,
        });
      } else {
        setToast({ type: 'error', message: data.error || 'Không thể đọc file Word' });
      }
    } catch (err: any) {
      setToast({ type: 'error', message: err.message || 'Lỗi khi tải file' });
    } finally {
      setImportingWord(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Generate simulated live preview HTML
  const generatePreviewHtml = () => {
    if (!selectedTemplate) return '';
    let rendered = selectedTemplate.bodyHtml || '';

    // First replace link in href attribute
    rendered = rendered.replace(/href="{{\s*(link|approvalLink)\s*}}"/g, 'href="http://localhost:3000" target="_blank"');

    const vars = getTemplateVariablesMap(isEn)[selectedTemplate.code] || [];
    vars.forEach((v) => {
      if (v.tag === '{{link}}' || v.tag === '{{approvalLink}}') {
        const regex = new RegExp(v.tag.replace(/[{}]/g, '\\$&'), 'g');
        rendered = rendered.replace(regex, `<span style="color: #4f46e5; font-weight: 600; text-decoration: underline;">${v.sample}</span>`);
      } else {
        const regex = new RegExp(v.tag.replace(/[{}]/g, '\\$&'), 'g');
        rendered = rendered.replace(regex, `<span style="background-color: #E0E7FF; color: #3730A3; padding: 1px 6px; border-radius: 6px; font-weight: bold;">${v.sample}</span>`);
      }
    });

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #F8FAFC; margin: 0; padding: 20px; color: #334155; }
          .email-card { max-width: 600px; margin: 0 auto; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
          .email-header { background: linear-gradient(135deg, #1E40AF 0%, #3B82F6 100%); padding: 24px; text-align: center; color: #FFFFFF; }
          .email-body { padding: 30px 24px; line-height: 1.6; font-size: 14px; }
          .email-footer { background: #F1F5F9; padding: 16px 24px; text-align: center; font-size: 12px; color: #64748B; border-top: 1px solid #E2E8F0; }
          .highlight-box { background: #EFF6FF; border: 1px solid #BFDBFE; border-left: 4px solid #2563EB; border-radius: 8px; padding: 14px 16px; margin: 16px 0; }
          .highlight-box p { margin: 6px 0; font-size: 13.5px; }
          .btn { display: inline-block; background-color: #2563EB; color: #FFFFFF !important; text-decoration: none; padding: 10px 22px; border-radius: 8px; font-weight: bold; font-size: 13px; margin: 16px 0; }
          table { width: 100%; border-collapse: collapse; margin: 16px 0; }
          th, td { padding: 8px 12px; border: 1px solid #E2E8F0; font-size: 13px; }
          th { background-color: #F8FAFC; text-align: left; }
        </style>
      </head>
      <body>
        <div class="email-card">
          <div class="email-header">
            <h2 style="margin: 0; font-size: 20px; font-weight: 800; letter-spacing: -0.5px;">SIMPLY IT MANAGEMENT</h2>
            <p style="margin: 4px 0 0; font-size: 12px; opacity: 0.9;">Hệ Thống Quản Trị & Hỗ Trợ Kỹ Thuật CNTT</p>
          </div>
          <div class="email-body">
            ${rendered}
          </div>
          <div class="email-footer">
            <p style="margin: 0;">Email này được gửi tự động từ hệ thống <strong>SIMPLY IT</strong>. Vui lòng không trả lời trực tiếp email này.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  };

  const currentVariables = selectedTemplate
    ? getTemplateVariablesMap(isEn)[selectedTemplate.code] || [
        { tag: '{{recipientName}}', label: 'Người nhận', desc: 'Tên người nhận', sample: 'Nguyễn Văn A' },
        { tag: '{{title}}', label: 'Tiêu đề', desc: 'Tiêu đề thông báo', sample: 'Thông báo sự cố' },
        { tag: '{{link}}', label: 'Đường dẫn', desc: 'Link xem chi tiết', sample: 'http://localhost:3000' },
      ]
    : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast alert */}
      {toast && (
        <div
          className={`p-4 rounded-2xl flex items-center gap-3 animate-in fade-in ${
            toast.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <span className="text-sm font-medium">{toast.message}</span>
        </div>
      )}

      {/* Main Grid: SMTP Config + Test */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* SMTP Settings Form (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Server className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-base">{isEn ? 'SMTP Server Configuration' : 'Cấu hình Máy chủ SMTP'}</h3>
                <p className="text-xs text-slate-500">{isEn ? 'Configure server connection for automated outbound system emails' : 'Cấu hình kết nối để gửi email tự động từ hệ thống'}</p>
              </div>
            </div>

            {/* Toggle Enable */}
            <button
              type="button"
              onClick={() => setSmtpConfig((p) => ({ ...p, enabled: !p.enabled }))}
              className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer"
            >
              {smtpConfig.enabled ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-emerald-700">{isEn ? 'Enabled' : 'Đang bật'}</span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-slate-300" />
                  <span className="text-slate-500">{isEn ? 'Disabled' : 'Đang tắt'}</span>
                </>
              )}
            </button>
          </div>

          <form onSubmit={handleSaveSmtp} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Host */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  {isEn ? 'SMTP Server (Host)' : 'Máy chủ SMTP (Host)'} <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="VD: smtp.gmail.com"
                  value={smtpConfig.host}
                  onChange={(e) => setSmtpConfig({ ...smtpConfig, host: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:border-blue-500 outline-none"
                />
              </div>

              {/* Port */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  {isEn ? 'Port' : 'Cổng (Port)'} <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="587 hoặc 465"
                  value={smtpConfig.port}
                  onChange={(e) => setSmtpConfig({ ...smtpConfig, port: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:border-blue-500 outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Username */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  {isEn ? 'Login Account (Email)' : 'Tài khoản đăng nhập (Email)'} <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="your-email@company.com"
                  value={smtpConfig.user}
                  onChange={(e) => setSmtpConfig({ ...smtpConfig, user: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:border-blue-500 outline-none"
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  {isEn ? 'App Password' : 'Mật khẩu ứng dụng (App Password)'} <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder={isEn ? '16-character app password' : 'Mật khẩu ứng dụng 16 ký tự'}
                    value={smtpConfig.password}
                    onChange={(e) => setSmtpConfig({ ...smtpConfig, password: e.target.value })}
                    className="w-full pl-3.5 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:border-blue-500 outline-none font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* From Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  {isEn ? 'Sender Name' : 'Tên người gửi (Sender Name)'}
                </label>
                <input
                  type="text"
                  placeholder="VD: SIMPLY IT Support Team"
                  value={smtpConfig.fromName}
                  onChange={(e) => setSmtpConfig({ ...smtpConfig, fromName: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:border-blue-500 outline-none"
                />
              </div>

              {/* From Email */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  {isEn ? 'From Email Address' : 'Email người gửi (From Email)'}
                </label>
                <input
                  type="email"
                  placeholder="no-reply@company.com"
                  value={smtpConfig.fromEmail}
                  onChange={(e) => setSmtpConfig({ ...smtpConfig, fromEmail: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:border-blue-500 outline-none"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition-colors cursor-pointer"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {isEn ? 'Save SMTP Configuration' : 'Lưu Cấu Hình SMTP'}
              </button>
            </div>
          </form>
        </div>

        {/* Test Email Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4 flex flex-col justify-between">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-slate-800 text-sm">{isEn ? 'Test Connection' : 'Kiểm tra Kết nối'}</h4>
              <p className="text-[11px] text-slate-400">{isEn ? 'Send a test email to verify' : 'Gửi thử 1 email kiểm tra'}</p>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {isEn ? 'Send test email to:' : 'Gửi email thử nghiệm đến:'}
              </label>
              <input
                type="email"
                placeholder="your.email@company.com"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:border-blue-500 outline-none"
              />
            </div>

            <button
              type="button"
              onClick={handleTestSmtp}
              disabled={testing}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {isEn ? 'Test & Send Email' : 'Kiểm Tra & Gửi Thử'}
            </button>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-[11px] text-slate-500 space-y-1.5">
              <p className="font-semibold text-slate-700">💡 {isEn ? 'Gmail SMTP Guide:' : 'Hướng dẫn Gmail SMTP:'}</p>
              <p>{isEn ? '1. Enable 2-Step Verification on Google Account.' : '1. Bật xác thực 2 bước trên Google Account.'}</p>
              <p>{isEn ? '2. Generate an ' : '2. Tạo '}<strong>App Password</strong> {isEn ? '(16-character password).' : '(Mật khẩu ứng dụng 16 chữ số).'}</p>
              <p>{isEn ? '3. Set Host: ' : '3. Điền Host: '}<code className="text-blue-600">smtp.gmail.com</code>, Port: <code className="text-blue-600">587</code>.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Hidden File Input for Word Upload */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept=".docx,.doc,.html,.htm"
        className="hidden"
      />

      {/* Email Templates Section */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-base">{isEn ? 'Automated Notification Email Templates' : 'Mẫu Email Thông Báo Tự Động'}</h3>
              <p className="text-xs text-slate-500">{isEn ? 'Customize subject lines and email body dispatched for each event' : 'Tùy chỉnh tiêu đề và nội dung email được gửi cho từng sự kiện'}</p>
            </div>
          </div>

          {/* Quick Word Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleDownloadWord}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-bold transition-all border border-blue-200 cursor-pointer shadow-2xs hover:scale-105 active:scale-95"
              title="Tải về file Word chứa mẫu hướng dẫn và bảng tra cứu biến"
            >
              <Download className="w-4 h-4 text-blue-600" />
              <span>{isEn ? 'Download Word Template (.docx)' : 'Tải Mẫu Hướng Dẫn Word (.docx)'}</span>
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={importingWord}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold transition-all border border-indigo-200 cursor-pointer shadow-2xs hover:scale-105 active:scale-95"
              title="Tải lên file Word (.docx) để tự động chuyển thành mẫu email HTML"
            >
              {importingWord ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4 text-indigo-600" />}
              <span>{isEn ? 'Upload Word File (.docx)' : 'Tải Lên File Word (.docx)'}</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Template List */}
          <div className="space-y-2">
            {templates.map((tmpl) => {
              const isSelected = selectedTemplate?.id === tmpl.id;
              return (
                <button
                  key={tmpl.id}
                  type="button"
                  onClick={() => {
                    setSelectedTemplate(tmpl);
                    setEditorMode('EDIT');
                  }}
                  className={`w-full text-left p-3.5 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50/60 shadow-xs'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <p className={`text-xs font-bold ${isSelected ? 'text-blue-700' : 'text-slate-800'}`}>
                      {getLocalizedTemplateName(tmpl.code, tmpl.name, isEn)}
                    </p>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        tmpl.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {tmpl.isActive ? (isEn ? 'On' : 'Bật') : (isEn ? 'Off' : 'Tắt')}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 truncate mt-1">{tmpl.code}</p>
                </button>
              );
            })}
          </div>

          {/* Template Editor & Live Preview */}
          {selectedTemplate && (
            <div className="lg:col-span-2 space-y-4 bg-slate-50/50 p-5 rounded-2xl border border-slate-200">
              {/* Header with Switch & Mode Switcher */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200">
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">{getLocalizedTemplateName(selectedTemplate.code, selectedTemplate.name, isEn)}</h4>
                  <p className="text-[11px] text-slate-400">{isEn ? 'Code:' : 'Mã:'} {selectedTemplate.code}</p>
                </div>

                <div className="flex items-center gap-3">
                  {/* Mode Pills */}
                  <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs">
                    <button
                      type="button"
                      onClick={() => setEditorMode('EDIT')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        editorMode === 'EDIT'
                          ? 'bg-blue-600 text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {isEn ? 'Edit' : 'Chỉnh Sửa'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditorMode('PREVIEW')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                        editorMode === 'PREVIEW'
                          ? 'bg-blue-600 text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>{isEn ? 'Live Preview' : 'Xem Trước Thực Tế'}</span>
                    </button>
                  </div>

                  {/* Active Toggle */}
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedTemplate({ ...selectedTemplate, isActive: !selectedTemplate.isActive })
                    }
                    className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer"
                  >
                    {selectedTemplate.isActive ? (
                      <ToggleRight className="w-6 h-6 text-emerald-600" />
                    ) : (
                      <ToggleLeft className="w-6 h-6 text-slate-400" />
                    )}
                    <span>{selectedTemplate.isActive ? (isEn ? 'On' : 'Bật') : (isEn ? 'Off' : 'Tắt')}</span>
                  </button>
                </div>
              </div>

              {editorMode === 'EDIT' ? (
                <>
                  {/* Subject Input */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      {isEn ? 'Email Subject' : 'Tiêu đề Email (Subject)'}
                    </label>
                    <input
                      type="text"
                      value={selectedTemplate.subject}
                      onChange={(e) =>
                        setSelectedTemplate({ ...selectedTemplate, subject: e.target.value })
                      }
                      className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:border-blue-500 outline-none"
                    />
                  </div>

                  {/* Variable Insertion Chips */}
                  <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                        <span>{isEn ? 'Insert Dynamic Tags (Click to insert directly into content):' : 'Chèn Thẻ Biến Tự Động (Nhấn vào để chèn ngay vào nội dung):'}</span>
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      {currentVariables.map((v) => (
                        <button
                          key={v.tag}
                          type="button"
                          onClick={() => insertVariable(v.tag)}
                          className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 hover:text-blue-800 border border-blue-200 rounded-lg text-[11px] font-semibold transition-all cursor-pointer flex items-center gap-1 hover:scale-105 active:scale-95"
                          title={`${v.desc} (VD: ${v.sample})`}
                        >
                          <span className="text-blue-500 font-bold">+</span>
                          <span>{v.label}</span>
                          <span className="text-[9.5px] font-mono opacity-60">({v.tag})</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Formatting Toolbar */}
                  <div className="flex items-center gap-1.5 flex-wrap bg-white p-2 rounded-xl border border-slate-200">
                    <span className="text-[11px] font-bold text-slate-400 px-1">{isEn ? 'Quick Insert:' : 'Chèn nhanh:'}</span>

                    <button
                      type="button"
                      onClick={() => insertHtmlSnippet('<strong>Văn bản in đậm</strong>')}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-bold text-slate-700 cursor-pointer flex items-center gap-1"
                    >
                      <Bold className="w-3 h-3" />
                      <span>{isEn ? 'Bold' : 'Đậm'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => insertHtmlSnippet('<em>Văn bản in nghiêng</em>')}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-bold text-slate-700 cursor-pointer flex items-center gap-1"
                    >
                      <Italic className="w-3 h-3" />
                      <span>{isEn ? 'Italic' : 'Nghiêng'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        insertHtmlSnippet(
                          `<div class="highlight-box">\n  <p><strong>Thông tin quan trọng:</strong> Nội dung chi tiết tại đây...</p>\n</div>`
                        )
                      }
                      className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-bold cursor-pointer flex items-center gap-1"
                    >
                      <LayoutTemplate className="w-3 h-3" />
                      <span>{isEn ? 'Highlight Box' : 'Khung Nổi Bật'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        insertHtmlSnippet(
                          `<p style="text-align: center; margin: 20px 0;"><a class="btn" href="{{link}}">Xem Chi Tiết Trên Hệ Thống →</a></p>`
                        )
                      }
                      className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold cursor-pointer flex items-center gap-1"
                    >
                      <LinkIcon className="w-3 h-3" />
                      <span>{isEn ? 'CTA Button' : 'Nút Bấm CTA'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        insertHtmlSnippet(
                          `<table>\n  <tr><th>Thuộc tính</th><th>{isEn ? 'Details' : 'Chi tiết'}</th></tr>\n  <tr><td>Mã số</td><td>{{ticketNumber}}</td></tr>\n</table>`
                        )
                      }
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold cursor-pointer flex items-center gap-1"
                    >
                      <TableIcon className="w-3 h-3" />
                      <span>{isEn ? 'Data Table' : 'Bảng Dữ Liệu'}</span>
                    </button>
                  </div>

                  {/* Body Textarea */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      {isEn ? 'HTML Content (Body)' : 'Nội dung HTML (Body)'}
                    </label>
                    <textarea
                      ref={bodyTextareaRef}
                      rows={10}
                      value={selectedTemplate.bodyHtml}
                      onChange={(e) =>
                        setSelectedTemplate({ ...selectedTemplate, bodyHtml: e.target.value })
                      }
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:border-blue-500 outline-none resize-y leading-relaxed"
                    />
                  </div>
                </>
              ) : (
                /* LIVE PREVIEW MODE */
                <div className="space-y-3">
                  <div className="p-3 bg-blue-50 rounded-xl border border-blue-200 text-xs text-blue-800 flex items-center justify-between">
                    <span className="font-semibold">
                      {isEn ? '👁️ Live preview of the email recipient interface:' : '👁️ Xem trước giao diện email thực tế người nhận sẽ nhìn thấy:'}
                    </span>
                    <span className="text-[11px] bg-white px-2 py-0.5 rounded-md font-mono text-blue-700 font-bold border border-blue-200">
                      {isEn ? 'Subject:' : 'Tiêu đề:'} {selectedTemplate.subject}
                    </span>
                  </div>

                  <div className="border border-slate-300 rounded-2xl overflow-hidden bg-white shadow-xs">
                    <iframe
                      srcDoc={generatePreviewHtml()}
                      title="Email Live Preview"
                      className="w-full h-[460px] border-0"
                    />
                  </div>
                </div>
              )}

              {/* Save Footer Bar */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                <span className="text-[11px] text-slate-400">
                  {isEn ? 'Tip: Download the Word template to edit in MS Word, then re-upload for optimal styling!' : 'Mẹo: Tải file Word về soạn thảo, sau đó tải lên lại để có định dạng đẹp nhất!'}
                </span>
                <button
                  type="button"
                  onClick={handleSaveTemplate}
                  disabled={templateSaving}
                  className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md shadow-blue-600/20 hover:scale-105 active:scale-95"
                >
                  {templateSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>{isEn ? 'Save Email Template' : 'Lưu Mẫu Email'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}