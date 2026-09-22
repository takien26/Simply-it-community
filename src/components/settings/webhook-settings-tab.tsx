'use client';

import { useLanguage } from '@/lib/i18n/context';
import { useState, useEffect } from 'react';
import {
  Webhook,
  Plus,
  Send,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ToggleLeft,
  ToggleRight,
  X,
  MessageSquare,
  Globe,
  Radio,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Copy,
  ExternalLink,
  Check,
  BookOpen,
} from 'lucide-react';

const PROVIDER_MAP: Record<string, { label: string; icon: string; color: string }> = {
  telegram: { label: 'Telegram Bot', icon: '✈️', color: 'text-sky-600 bg-sky-50 border-sky-200' },
  teams: { label: 'Microsoft Teams', icon: '🟦', color: 'text-indigo-600 bg-indigo-50 border-indigo-200' },
  slack: { label: 'Slack', icon: '🟩', color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  zalo: { label: 'Zalo OA / ZNS', icon: '🔵', color: 'text-blue-600 bg-blue-50 border-blue-200' },
  custom: { label: 'Custom HTTP Webhook', icon: '🌐', color: 'text-slate-600 bg-slate-50 border-slate-200' },
};

const AVAILABLE_EVENTS = [
  { id: 'ticket.created', label: 'Ticket mới được tạo' },
  { id: 'ticket.urgent', label: 'Ticket khẩn cấp (P1 Urgent)' },
  { id: 'approval.pending', label: 'Yêu cầu phê duyệt mới' },
  { id: 'license.expiring', label: 'Bản quyền phần mềm sắp hết hạn' },
  { id: 'maintenance.due', label: 'Lịch bảo trì đến hạn' },
];

export function WebhookSettingsTab() {
  const { language } = useLanguage();
  const isEn = language === 'en';
  const [webhooks, setWebhooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Interactive Guide State
  const [showGuide, setShowGuide] = useState(false);
  const [activeGuideTab, setActiveGuideTab] = useState<'telegram' | 'teams' | 'slack' | 'zalo'>('telegram');
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formProvider, setFormProvider] = useState('telegram');
  const [formUrl, setFormUrl] = useState('');
  const [formEvents, setFormEvents] = useState<string[]>(['ticket.created', 'ticket.urgent', 'approval.pending']);
  const [saving, setSaving] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);

  // Telegram quick builder helper
  const [tgToken, setTgToken] = useState('');
  const [tgChatId, setTgChatId] = useState('');

  useEffect(() => {
    loadWebhooks();
  }, []);

  const loadWebhooks = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/webhooks');
      const data = await res.json();
      if (data.success) {
        setWebhooks(data.webhooks);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formUrl.trim()) return;

    setSaving(true);
    try {
      const payload = {
        name: formName.trim(),
        provider: formProvider,
        webhookUrl: formUrl.trim(),
        events: formEvents,
      };

      const res = await fetch('/api/webhooks', {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingId ? { id: editingId, ...payload } : payload),
      });

      const data = await res.json();
      if (data.success) {
        setIsModalOpen(false);
        resetForm();
        loadWebhooks();
        setToast({ type: 'success', message: 'Đã lưu cấu hình Webhook thành công!' });
      } else {
        setToast({ type: 'error', message: data.error || 'Lưu thất bại' });
      }
    } catch (e: any) {
      setToast({ type: 'error', message: e.message });
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async (hook: any) => {
    setTestingId(hook.id);
    setToast(null);
    try {
      const res = await fetch('/api/webhooks/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          webhookUrl: hook.webhookUrl,
          provider: hook.provider,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setToast({ type: 'success', message: `Kiểm tra kết nối "${hook.name}" thành công!` });
      } else {
        setToast({ type: 'error', message: data.error || 'Kiểm tra thất bại' });
      }
    } catch (e: any) {
      setToast({ type: 'error', message: e.message });
    } finally {
      setTestingId(null);
    }
  };

  const handleToggleActive = async (hook: any) => {
    try {
      const res = await fetch('/api/webhooks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: hook.id, isActive: !hook.isActive }),
      });
      if (res.ok) {
        setWebhooks((prev) =>
          prev.map((h) => (h.id === hook.id ? { ...h, isActive: !h.isActive } : h))
        );
      }
    } catch {}
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Bạn có chắc muốn xóa Webhook "${name}"?`)) return;
    try {
      const res = await fetch(`/api/webhooks?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setWebhooks((prev) => prev.filter((h) => h.id !== id));
      }
    } catch {}
  };

  const handleEdit = (hook: any) => {
    setEditingId(hook.id);
    setFormName(hook.name);
    setFormProvider(hook.provider || 'telegram');
    setFormUrl(hook.webhookUrl);
    setFormEvents(Array.isArray(hook.events) ? hook.events : ['ticket.created', 'ticket.urgent']);

    if (hook.provider === 'telegram' || hook.webhookUrl.includes('api.telegram.org')) {
      const tokenMatch = hook.webhookUrl.match(/bot([^/]+)\/sendMessage/);
      const chatMatch = hook.webhookUrl.match(/chat_id=([^&]+)/);
      setTgToken(tokenMatch ? tokenMatch[1] : '');
      setTgChatId(chatMatch ? chatMatch[1] : '');
    } else {
      setTgToken('');
      setTgChatId('');
    }

    setIsModalOpen(true);
  };

  const resetForm = () => {
    setEditingId(null);
    setFormName('');
    setFormProvider('telegram');
    setFormUrl('');
    setFormEvents(['ticket.created', 'ticket.urgent', 'approval.pending']);
    setTgToken('');
    setTgChatId('');
  };

  // Sync Telegram builder to formUrl
  const updateTelegramUrl = (token: string, chatId: string) => {
    setTgToken(token);
    setTgChatId(chatId);
    if (token.trim() && chatId.trim()) {
      setFormUrl(`https://api.telegram.org/bot${token.trim()}/sendMessage?chat_id=${chatId.trim()}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast */}
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

      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <Webhook className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-base">
              {isEn ? 'Webhook & Multi-Channel Bot Integrations' : 'Tích Hợp Webhook & Bot Thông Báo Đa Kênh'}
            </h3>
            <p className="text-xs text-slate-500">
              {isEn
                ? 'Automatically dispatch alerts for urgent P1 tickets or approvals to Telegram, Microsoft Teams, Slack, Zalo OA'
                : 'Tự động gửi cảnh báo tức thời khi có Ticket khẩn cấp (P1), Yêu cầu duyệt mới qua Telegram Bot, MS Teams, Slack, Zalo OA'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => setShowGuide(!showGuide)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            <BookOpen className="w-4 h-4 text-purple-600" />
            <span>{showGuide ? (isEn ? 'Hide Guide' : 'Đóng Hướng Dẫn') : (isEn ? 'Setup Guide' : '📖 Sách Hướng Dẫn')}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              resetForm();
              setIsModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-sm transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{isEn ? '+ Add Webhook' : 'Thêm Webhook / Bot'}</span>
          </button>
        </div>
      </div>

      {/* INTERACTIVE STEP-BY-STEP SETUP GUIDE */}
      {showGuide && (
        <div className="bg-gradient-to-br from-slate-900 to-slate-950 text-white rounded-2xl p-6 shadow-xl border border-slate-800 space-y-5 animate-in fade-in zoom-in-95">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl">📚</span>
                <h4 className="font-extrabold text-sm sm:text-base text-white">
                  {isEn ? 'Step-by-Step Multi-Channel Integration Guide' : 'Cẩm Nang Tích Hợp Thông Báo Đa Kênh Từng Bước'}
                </h4>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {isEn
                  ? 'Follow the steps below to connect your favorite chat platform in under 2 minutes.'
                  : 'Làm theo từng bước dưới đây để kết nối Bot nhận thông báo sự cố IT chỉ trong 2 phút.'}
              </p>
            </div>

            {/* Guide Tabs */}
            <div className="flex items-center gap-1.5 bg-slate-800/80 p-1 rounded-xl border border-slate-700/60 overflow-x-auto max-w-full">
              {[
                { key: 'telegram', label: 'Telegram Bot', icon: '✈️' },
                { key: 'teams', label: 'MS Teams', icon: '🟦' },
                { key: 'slack', label: 'Slack', icon: '🟩' },
                { key: 'zalo', label: 'Zalo / Custom', icon: '🔵' },
              ].map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveGuideTab(tab.key as any)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                    activeGuideTab === tab.key
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                  }`}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* TAB 1: TELEGRAM BOT */}
          {activeGuideTab === 'telegram' && (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/60 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-sky-400">
                    <span className="w-5 h-5 rounded-full bg-sky-500/20 text-sky-300 flex items-center justify-center text-[11px]">1</span>
                    <span>Tạo Bot với @BotFather</span>
                  </div>
                  <p className="text-slate-300 leading-relaxed">
                    Mở ứng dụng Telegram, tìm kiếm <b>@BotFather</b> (tài khoản có tick xanh chính chủ). Gõ lệnh:
                  </p>
                  <div className="bg-slate-950 p-2.5 rounded-lg font-mono text-emerald-400 flex items-center justify-between">
                    <span>/newbot</span>
                    <button
                      type="button"
                      onClick={() => handleCopy('/newbot')}
                      className="text-slate-400 hover:text-white"
                    >
                      {copiedText === '/newbot' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <p className="text-slate-400 text-[11px]">
                    Đặt tên cho Bot (VD: <i>SimplyIT Alert Bot</i>) và Username (kết thúc bằng <i>_bot</i>, VD: <i>simply_it_alert_bot</i>). Bạn sẽ nhận được <b>HTTP API Token</b> (dạng <code>7123456789:AAHq_...</code>).
                  </p>
                </div>

                <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/60 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-sky-400">
                    <span className="w-5 h-5 rounded-full bg-sky-500/20 text-sky-300 flex items-center justify-center text-[11px]">2</span>
                    <span>Lấy Chat ID (Nhóm hoặc Cá nhân)</span>
                  </div>
                  <p className="text-slate-300 leading-relaxed">
                    Tạo một nhóm Telegram cho đội IT Support, thêm bot bạn vừa tạo vào nhóm và gửi 1 tin nhắn bất kỳ (VD: <code>/start</code> hoặc <code>test</code>).
                  </p>
                  <p className="text-slate-300">
                    Để lấy Chat ID nhanh nhất, mở đường link sau trên trình duyệt (thay YOUR_TOKEN bằng token của bạn):
                  </p>
                  <div className="bg-slate-950 p-2 rounded-lg font-mono text-sky-300 break-all text-[10.5px]">
                    https://api.telegram.org/bot&lt;TOKEN&gt;/getUpdates
                  </div>
                  <p className="text-slate-400 text-[11px]">
                    Tìm trường <code>"chat":&#123;"id": -1001234567890&#125;</code> (ID nhóm thường bắt đầu bằng dấu trừ <code>-100...</code>).
                  </p>
                </div>
              </div>

              <div className="bg-sky-950/40 border border-sky-800/60 p-3.5 rounded-xl flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <span className="font-bold text-sky-300">Định dạng URL chuẩn cho SIMPLY IT:</span>
                  <div className="font-mono text-emerald-300 text-[11px] mt-0.5">
                    https://api.telegram.org/bot&lt;TOKEN&gt;/sendMessage?chat_id=&lt;CHAT_ID&gt;
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowGuide(false);
                    resetForm();
                    setFormProvider('telegram');
                    setIsModalOpen(true);
                  }}
                  className="px-3.5 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg font-bold text-xs cursor-pointer shrink-0"
                >
                  🚀 Tạo Ngay Bằng Trình Tự Động
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: MS TEAMS */}
          {activeGuideTab === 'teams' && (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/60 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-indigo-400">
                    <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-300 flex items-center justify-center text-[11px]">1</span>
                    <span>Mở Kênh Teams</span>
                  </div>
                  <p className="text-slate-300">
                    Mở Microsoft Teams, vào Kênh (Channel) IT Support cần nhận cảnh báo sự cố.
                  </p>
                </div>

                <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/60 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-indigo-400">
                    <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-300 flex items-center justify-center text-[11px]">2</span>
                    <span>Thêm Incoming Webhook</span>
                  </div>
                  <p className="text-slate-300">
                    Bấm dấu <b>...</b> ở góc phải kênh &gt; Chọn <b>Connectors</b> (hoặc <b>Workflows</b>) &gt; Tìm <b>Incoming Webhook</b> &gt; Bấm Add/Configure.
                  </p>
                </div>

                <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/60 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-indigo-400">
                    <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-300 flex items-center justify-center text-[11px]">3</span>
                    <span>Copy URL &amp; Lưu</span>
                  </div>
                  <p className="text-slate-300">
                    Đặt tên cho Webhook (VD: <i>SIMPLY IT Alert</i>) &gt; Bấm Create &gt; Sao chép URL Webhook (dạng <code>https://*.webhook.office.com/...</code>).
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: SLACK */}
          {activeGuideTab === 'slack' && (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/60 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-emerald-400">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center text-[11px]">1</span>
                    <span>Tạo Slack App</span>
                  </div>
                  <p className="text-slate-300">
                    Truy cập <b>api.slack.com/apps</b> &gt; Bấm <b>Create New App</b> &gt; Chọn <i>From scratch</i> &gt; Chọn Workspace của bạn.
                  </p>
                </div>

                <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/60 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-emerald-400">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center text-[11px]">2</span>
                    <span>Bật Incoming Webhooks</span>
                  </div>
                  <p className="text-slate-300">
                    Trong menu bên trái chọn <b>Incoming Webhooks</b> &gt; Bật nút toggle sang <b>ON</b>.
                  </p>
                </div>

                <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/60 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-emerald-400">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center text-[11px]">3</span>
                    <span>Chọn Kênh &amp; Lấy URL</span>
                  </div>
                  <p className="text-slate-300">
                    Bấm <b>Add New Webhook to Workspace</b> &gt; Chọn kênh (VD: <code>#it-alerts</code>) &gt; Copy Webhook URL (dạng <code>https://hooks.slack.com/services/...</code>).
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: ZALO OA / CUSTOM HTTP */}
          {activeGuideTab === 'zalo' && (
            <div className="space-y-4 text-xs">
              <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/60 space-y-2">
                <div className="flex items-center gap-2 font-bold text-blue-400">
                  <Globe className="w-4 h-4" />
                  <span>Cấu trúc Payload JSON gửi tới Webhook Endpoint</span>
                </div>
                <p className="text-slate-300">
                  Hệ thống SIMPLY IT sẽ gửi phương thức <code>POST</code> tới URL bạn cung cấp kèm Payload JSON tiêu chuẩn:
                </p>
                <div className="bg-slate-950 p-3 rounded-xl font-mono text-emerald-400 text-[11px] overflow-x-auto">
                  {`{
  "event": "ticket.urgent",
  "timestamp": "2026-09-20T08:00:00.000Z",
  "data": {
    "ticketNumber": "TK-2026-0088",
    "title": "Hỏng switch tầng 3",
    "priority": "URGENT (P1 Khẩn Cấp)",
    "creator": "Nguyễn Văn A",
    "link": "http://localhost:3001/tickets"
  }
}`}
                </div>
                <p className="text-slate-400 text-[11px]">
                  Bạn có thể dùng Cloudflare Workers, AWS Lambda hoặc Middleware Server để nhận JSON này và gửi ZNS qua Zalo OA API.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Webhooks List */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-12 text-center">
            <Loader2 className="w-7 h-7 text-purple-600 animate-spin mx-auto mb-2" />
            <p className="text-xs text-slate-400">{isEn ? 'Loading webhooks list...' : 'Đang tải danh sách webhook...'}</p>
          </div>
        ) : webhooks.length === 0 ? (
          <div className="p-12 text-center">
            <Webhook className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-700">{isEn ? 'No webhooks configured yet' : 'Chưa có Webhook nào được cấu hình'}</p>
            <p className="text-xs text-slate-400 mt-1">
              {isEn
                ? 'Connect Telegram Bot, Teams or Zalo so the IT team receives incident alerts immediately.'
                : 'Kết nối Telegram Bot, MS Teams hoặc Zalo để đội ngũ IT nhận thông báo sự cố ngay lập tức.'}
            </p>
            <button
              type="button"
              onClick={() => setShowGuide(true)}
              className="mt-3.5 px-4 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-1.5 cursor-pointer"
            >
              <BookOpen className="w-4 h-4" />
              <span>{isEn ? 'View Setup Guide' : 'Xem Hướng Dẫn Tích Hợp Nhanh'}</span>
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {webhooks.map((h) => {
              const prov = PROVIDER_MAP[h.provider] || PROVIDER_MAP.custom;
              const eventsList = Array.isArray(h.events) ? h.events : [];

              return (
                <div key={h.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 transition-colors">
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 mt-0.5 text-lg">
                      {prov.icon}
                    </div>

                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-bold text-slate-800 text-sm truncate">{h.name}</h4>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${prov.color}`}>
                          {prov.label}
                        </span>
                      </div>

                      <p className="text-[11px] font-mono text-slate-400 truncate max-w-md">
                        {h.webhookUrl}
                      </p>

                      <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                        {eventsList.map((ev: string) => (
                          <span key={ev} className="text-[9.5px] font-semibold px-2 py-0.2 rounded-md bg-slate-100 text-slate-600">
                            {ev}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 self-end sm:self-center shrink-0">
                    {/* Test Button */}
                    <button
                      type="button"
                      onClick={() => handleTest(h)}
                      disabled={testingId === h.id}
                      className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1 cursor-pointer transition-colors"
                      title={isEn ? 'Send test message' : 'Gửi tin nhắn test'}
                    >
                      {testingId === h.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5 text-purple-600" />}
                      <span>{isEn ? 'Test' : 'Gửi Thử'}</span>
                    </button>

                    {/* Edit Button */}
                    <button
                      type="button"
                      onClick={() => handleEdit(h)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-purple-600 hover:bg-purple-50 cursor-pointer"
                      title={isEn ? 'Edit' : 'Chỉnh sửa'}
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>

                    {/* Toggle Active */}
                    <button
                      type="button"
                      onClick={() => handleToggleActive(h)}
                      className="cursor-pointer"
                      title={isEn ? (h.isActive ? 'Active' : 'Inactive') : (h.isActive ? 'Bật' : 'Tắt')}
                    >
                      {h.isActive ? (
                        <ToggleRight className="w-6 h-6 text-emerald-600" />
                      ) : (
                        <ToggleLeft className="w-6 h-6 text-slate-400" />
                      )}
                    </button>

                    {/* Delete */}
                    <button
                      type="button"
                      onClick={() => handleDelete(h.id, h.name)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                      title={isEn ? 'Delete' : 'Xóa'}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL: ADD / EDIT WEBHOOK */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 space-y-5 border border-slate-200 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-900">
                {editingId ? (isEn ? 'Edit Webhook' : 'Chỉnh Sửa Webhook') : (isEn ? 'New Webhook Configuration' : 'Cấu Hình Webhook Mới')}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {isEn ? 'Webhook / Channel Name' : 'Tên Webhook / Kênh tiếp nhận'} <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder={isEn ? 'e.g. IT Support Channel - Telegram...' : 'VD: Nhóm IT Support P1 - Telegram...'}
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-purple-500 font-semibold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">{isEn ? 'Platform / Application' : 'Nền tảng / Ứng dụng'}</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {Object.entries(PROVIDER_MAP).map(([key, cfg]) => {
                    const isSelected = formProvider === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => {
                          setFormProvider(key);
                          if (key === 'telegram' && tgToken && tgChatId) {
                            setFormUrl(`https://api.telegram.org/bot${tgToken.trim()}/sendMessage?chat_id=${tgChatId.trim()}`);
                          }
                        }}
                        className={`p-2 rounded-xl border text-left flex items-center gap-1.5 transition-all cursor-pointer ${
                          isSelected
                            ? 'border-purple-600 bg-purple-50/70 text-purple-800 font-bold'
                            : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <span className="text-base">{cfg.icon}</span>
                        <span className="truncate text-xs">{cfg.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* TELEGRAM HELPER BUILDER */}
              {formProvider === 'telegram' && (
                <div className="p-3 bg-sky-50/80 border border-sky-200 rounded-2xl space-y-2.5 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sky-900 flex items-center gap-1">
                      <span>✈️</span> Trình hỗ trợ tạo Telegram Bot URL
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowGuide(true)}
                      className="text-sky-700 hover:underline text-[11px] font-semibold"
                    >
                      Xem hướng dẫn lấy Token
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-0.5">Bot Token</label>
                      <input
                        type="text"
                        placeholder="7123456789:AAHq_..."
                        value={tgToken}
                        onChange={(e) => updateTelegramUrl(e.target.value, tgChatId)}
                        className="w-full px-2.5 py-1.5 bg-white border border-sky-200 rounded-lg outline-none font-mono text-[10.5px]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-0.5">Chat ID (Nhóm hoặc User)</label>
                      <input
                        type="text"
                        placeholder="-1001234567890"
                        value={tgChatId}
                        onChange={(e) => updateTelegramUrl(tgToken, e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-sky-200 rounded-lg outline-none font-mono text-[10.5px]"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Webhook URL <span className="text-rose-500">*</span>
                </label>
                <input
                  type="url"
                  required
                  placeholder={
                    formProvider === 'telegram'
                      ? 'https://api.telegram.org/bot<TOKEN>/sendMessage?chat_id=<CHAT_ID>'
                      : formProvider === 'teams'
                      ? 'https://company.webhook.office.com/webhookb2/...'
                      : formProvider === 'slack'
                      ? 'https://hooks.slack.com/services/...'
                      : 'https://api.mycompany.com/webhook'
                  }
                  value={formUrl}
                  onChange={(e) => setFormUrl(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-purple-500 font-mono text-[11px]"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1.5">
                  {isEn ? 'Trigger Events' : 'Sự kiện kích hoạt gửi tin nhắn'}
                </label>
                <div className="space-y-1.5 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  {AVAILABLE_EVENTS.map((ev) => {
                    const isChecked = formEvents.includes(ev.id);
                    return (
                      <label key={ev.id} className="flex items-center gap-2 cursor-pointer py-1">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormEvents([...formEvents, ev.id]);
                            } else {
                              setFormEvents(formEvents.filter((id) => id !== ev.id));
                            }
                          }}
                          className="rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                        />
                        <span className="text-xs text-slate-700 font-medium">{ev.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  {isEn ? 'Cancel' : 'Hủy'}
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-xl font-bold shadow-md shadow-purple-600/20 flex items-center gap-1.5 cursor-pointer"
                >
                  {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{isEn ? 'Save Webhook' : 'Lưu Webhook'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}