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
} from 'lucide-react';

const PROVIDER_MAP: Record<string, { label: string; icon: string; color: string }> = {
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

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formProvider, setFormProvider] = useState('teams');
  const [formUrl, setFormUrl] = useState('');
  const [formEvents, setFormEvents] = useState<string[]>(['ticket.created', 'ticket.urgent']);
  const [saving, setSaving] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);

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

  const resetForm = () => {
    setEditingId(null);
    setFormName('');
    setFormProvider('teams');
    setFormUrl('');
    setFormEvents(['ticket.created', 'ticket.urgent']);
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
            <h3 className="font-bold text-slate-800 text-base">{isEn ? 'Webhook Integrations & Multi-Channel Dispatch' : 'Tích Hợp Webhook & Thông Báo Đa Kênh'}</h3>
            <p className="text-xs text-slate-500">{isEn ? 'Automatically dispatch alerts for urgent tickets or approval requests to Zalo OA, Microsoft Teams, Slack' : 'Tự động bắn thông báo khi có Ticket khẩn cấp hoặc Yêu cầu phê duyệt vào Zalo OA, Microsoft Teams, Slack'}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            resetForm();
            setIsModalOpen(true);
          }}
          className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-sm transition-colors cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>{isEn ? '+ Add Webhook' : 'Thêm Webhook'}</span>
        </button>
      </div>

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
            <p className="text-xs text-slate-400 mt-1">{isEn ? 'Connect Teams or Zalo so the IT team receives incident alerts immediately.' : 'Kết nối Teams hoặc Zalo để đội ngũ IT nhận thông báo sự cố ngay lập tức.'}</p>
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

      {/* MODAL: ADD WEBHOOK */}
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
                  placeholder={isEn ? 'e.g. IT Support Channel - Teams...' : 'VD: Kênh IT Support - Teams...'}
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-purple-500 font-semibold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">{isEn ? 'Platform / Application' : 'Nền tảng / Ứng dụng'}</label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(PROVIDER_MAP).map(([key, cfg]) => {
                    const isSelected = formProvider === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setFormProvider(key)}
                        className={`p-2.5 rounded-xl border text-left flex items-center gap-2 transition-all cursor-pointer ${
                          isSelected
                            ? 'border-purple-600 bg-purple-50/70 text-purple-800 font-bold'
                            : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <span className="text-base">{cfg.icon}</span>
                        <span className="truncate">{cfg.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Webhook URL <span className="text-rose-500">*</span>
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://company.webhook.office.com/webhookb2/..."
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
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 font-semibold hover:bg-slate-50"
                >{isEn ? 'Cancel' : 'Hủy'}</button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-xl font-bold shadow-md shadow-purple-600/20 flex items-center gap-1.5"
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