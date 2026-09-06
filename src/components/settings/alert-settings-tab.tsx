'use client';

import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/lib/i18n/context';
import {
  Bell,
  Send,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Mail,
  MessageSquare,
  Shield,
  Key,
  Globe,
  Laptop,
  Check,
  Zap,
  HelpCircle,
  ExternalLink,
} from 'lucide-react';

export function AlertSettingsTab() {
  const { language } = useLanguage();
  const isEn = language === 'en';
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Alert Settings States
  const [telegramEnabled, setTelegramEnabled] = useState(false);
  const [telegramBotToken, setTelegramBotToken] = useState('');
  const [telegramChatId, setTelegramChatId] = useState('');

  const [zaloEnabled, setZaloEnabled] = useState(false);
  const [zaloWebhookUrl, setZaloWebhookUrl] = useState('');

  const [emailEnabled, setEmailEnabled] = useState(false);
  const [emailRecipients, setEmailRecipients] = useState('');

  const [thresholdDays, setThresholdDays] = useState('30');
  const [thresholdUrgentDays, setThresholdUrgentDays] = useState('7');

  // Test & Scan States
  const [testingTelegram, setTestingTelegram] = useState(false);
  const [testTelegramResult, setTestTelegramResult] = useState<{ success: boolean; message: string } | null>(null);

  const [testingZalo, setTestingZalo] = useState(false);
  const [testZaloResult, setTestZaloResult] = useState<{ success: boolean; message: string } | null>(null);

  const [testingEmail, setTestingEmail] = useState(false);
  const [testEmailResult, setTestEmailResult] = useState<{ success: boolean; message: string } | null>(null);

  const [scanningNow, setScanningNow] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);
  const [lastScanTime, setLastScanTime] = useState<string | null>(null);

  // Load Settings
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/settings');
      const data = await res.json();
      const settingsList = Array.isArray(data) ? data : data.data || [];

      const map = new Map<string, string>(settingsList.map((s: any) => [s.key, String(s.value ?? '')]));

      setTelegramEnabled(map.get('alert.telegram_enabled') === 'true');
      setTelegramBotToken(map.get('alert.telegram_bot_token') || '');
      setTelegramChatId(map.get('alert.telegram_chat_id') || '');

      setZaloEnabled(map.get('alert.zalo_enabled') === 'true');
      setZaloWebhookUrl(map.get('alert.zalo_webhook_url') || '');

      setEmailEnabled(map.get('alert.email_enabled') === 'true');
      setEmailRecipients(map.get('alert.email_recipients') || '');

      setThresholdDays(map.get('alert.threshold_days') || '30');
      setThresholdUrgentDays(map.get('alert.threshold_urgent_days') || '7');

      // Load last scan status
      const scanRes = await fetch('/api/cron/alert-scanner');
      const scanData = await scanRes.json();
      if (scanData.success) {
        setLastScanTime(scanData.lastScanTime);
        setScanResult(scanData.lastScanResult || scanData.currentPreview);
      }
    } catch (e) {
      console.error('Failed to load alert settings:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    try {
      setSaving(true);
      setSaveSuccess(false);

      const settings = [
        { key: 'alert.telegram_enabled', value: String(telegramEnabled), group: 'alert' },
        { key: 'alert.telegram_bot_token', value: telegramBotToken, group: 'alert' },
        { key: 'alert.telegram_chat_id', value: telegramChatId, group: 'alert' },
        { key: 'alert.zalo_enabled', value: String(zaloEnabled), group: 'alert' },
        { key: 'alert.zalo_webhook_url', value: zaloWebhookUrl, group: 'alert' },
        { key: 'alert.email_enabled', value: String(emailEnabled), group: 'alert' },
        { key: 'alert.email_recipients', value: emailRecipients, group: 'alert' },
        { key: 'alert.threshold_days', value: thresholdDays, group: 'alert' },
        { key: 'alert.threshold_urgent_days', value: thresholdUrgentDays, group: 'alert' },
      ];

      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings }),
      });

      if (res.ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        alert('Lưu cài đặt thất bại');
      }
    } catch {
      alert('Lỗi kết nối khi lưu cài đặt');
    } finally {
      setSaving(false);
    }
  };

  const handleTestTelegram = async () => {
    setTestingTelegram(true);
    setTestTelegramResult(null);
    try {
      const res = await fetch('/api/cron/alert-scanner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'test_telegram',
          botToken: telegramBotToken,
          chatId: telegramChatId,
        }),
      });
      const data = await res.json();
      setTestTelegramResult({
        success: data.success,
        message: data.success ? data.message : data.error || 'Thử nghiệm thất bại',
      });
    } catch {
      setTestTelegramResult({ success: false, message: 'Lỗi kết nối server' });
    } finally {
      setTestingTelegram(false);
    }
  };

  const handleTestZalo = async () => {
    setTestingZalo(true);
    setTestZaloResult(null);
    try {
      const res = await fetch('/api/cron/alert-scanner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'test_zalo',
          webhookUrl: zaloWebhookUrl,
        }),
      });
      const data = await res.json();
      setTestZaloResult({
        success: data.success,
        message: data.success ? data.message : data.error || 'Thử nghiệm thất bại',
      });
    } catch {
      setTestZaloResult({ success: false, message: 'Lỗi kết nối server' });
    } finally {
      setTestingZalo(false);
    }
  };

  const handleTestEmail = async () => {
    setTestingEmail(true);
    setTestEmailResult(null);
    try {
      const firstEmail = emailRecipients.split(',')[0]?.trim();
      if (!firstEmail) {
        setTestEmailResult({ success: false, message: 'Vui lòng nhập ít nhất 1 email nhận' });
        setTestingEmail(false);
        return;
      }
      const res = await fetch('/api/cron/alert-scanner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'test_email',
          email: firstEmail,
        }),
      });
      const data = await res.json();
      setTestEmailResult({
        success: data.success,
        message: data.success ? data.message : data.error || 'Gửi email thất bại',
      });
    } catch {
      setTestEmailResult({ success: false, message: 'Lỗi kết nối server' });
    } finally {
      setTestingEmail(false);
    }
  };

  const handleRunScanNow = async () => {
    setScanningNow(true);
    try {
      const res = await fetch('/api/cron/alert-scanner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'run_scan' }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        setScanResult(data.data);
        setLastScanTime(new Date().toISOString());
        alert(`✅ Quét & Bắn thông báo hoàn tất!\nTổng cộng: ${data.data.totalExpiring} mục sắp đến hạn.`);
      } else {
        alert(data.error || 'Quét thất bại');
      }
    } catch {
      alert('Lỗi kết nối khi quét');
    } finally {
      setScanningNow(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-500 flex items-center justify-center gap-2">
        <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />
        <span>Đang tải cấu hình cảnh báo...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Action */}
      <div className="p-5 bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-800 rounded-3xl text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-white text-xs font-bold flex items-center gap-1 backdrop-blur-xs">
              <Zap className="w-3.5 h-3.5 text-amber-300" /> {isEn ? 'Periodic Auto-Scan' : 'Tự Động Định Kỳ'}
            </span>
            <span className="text-xs text-blue-200">
              {isEn ? 'Scans IT Services • Software Licenses • Asset Warranties' : 'Quét Dịch vụ IT • Bản quyền phần mềm • Bảo hành máy móc'}
            </span>
          </div>
          <h2 className="text-xl font-black">{isEn ? 'Multi-Channel Expiry & Renewal Alerts' : 'Cảnh Báo Hết Hạn & Gia Hạn Đa Kênh'}</h2>
          <p className="text-xs text-blue-100 max-w-2xl">
            {isEn ? 'Automatically track 7-30 day thresholds and trigger instant notifications to Telegram, Zalo and IT Email.' : 'Tự động theo dõi các mốc thời hạn 7 - 30 ngày và bắn thông báo tức thời tới Telegram Bot, Zalo Group và Email của Ban CNTT.'}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            disabled={scanningNow}
            onClick={handleRunScanNow}
            className="px-5 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-900 rounded-2xl font-bold text-xs shadow-lg transition-all flex items-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${scanningNow ? 'animate-spin' : ''}`} />
            <span>{scanningNow ? (isEn ? 'Scanning & Dispatching...' : 'Đang Quét & Bắn...') : (isEn ? '⚡ Scan & Dispatch Alerts Now' : '⚡ Quét & Bắn Thông Báo Ngay')}</span>
          </button>
        </div>
      </div>

      {/* Grid: Settings Form & Live Scan Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Channels Configuration (7 cols) */}
        <div className="lg:col-span-7 space-y-5">

          {/* 1. Telegram Bot Card */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 flex items-center justify-center font-bold">
                  <Send className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">{isEn ? 'Telegram Alert Bot' : 'Telegram Bot Thông Báo'}</h3>
                  <p className="text-[11px] text-slate-500">{isEn ? 'Send alerts directly to IT group or private chat' : 'Gửi trực tiếp vào nhóm IT hoặc tin nhắn riêng'}</p>
                </div>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={telegramEnabled}
                  onChange={(e) => setTelegramEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-600"></div>
              </label>
            </div>

            {telegramEnabled && (
              <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Telegram Bot Token:
                  </label>
                  <input
                    type="text"
                    placeholder="VD: 123456789:ABCdefGHIjklMNOpqrSTUvwxYZ..."
                    value={telegramBotToken}
                    onChange={(e) => setTelegramBotToken(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono outline-none focus:ring-2 focus:ring-sky-500"
                  />
                  <span className="text-[10.5px] text-slate-400 block">
                    Tạo miễn phí qua <strong>@BotFather</strong> trên Telegram.
                  </span>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Telegram Chat ID / Group ID:
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="VD: -1001234567890 (nhóm) hoặc 987654321 (cá nhân)"
                      value={telegramChatId}
                      onChange={(e) => setTelegramChatId(e.target.value)}
                      className="flex-1 p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono outline-none focus:ring-2 focus:ring-sky-500"
                    />
                    <button
                      type="button"
                      disabled={testingTelegram || !telegramBotToken || !telegramChatId}
                      onClick={handleTestTelegram}
                      className="px-3.5 py-2.5 bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer disabled:opacity-50"
                    >
                      {testingTelegram ? 'Đang gửi...' : 'Gửi Thử Nghiệm'}
                    </button>
                  </div>
                  <span className="text-[10.5px] text-slate-400 block">
                    Thêm Bot vào nhóm rồi lấy Chat ID qua <strong>@userinfobot</strong> hoặc <strong>@getidsbot</strong>.
                  </span>
                </div>

                {testTelegramResult && (
                  <div className={`p-2.5 rounded-xl text-xs flex items-center gap-2 ${testTelegramResult.success ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
                    {testTelegramResult.success ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
                    <span>{testTelegramResult.message}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 2. Zalo / Webhook Card */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center font-bold">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Zalo / Custom Webhook</h3>
                  <p className="text-[11px] text-slate-500">{isEn ? 'Dispatch JSON payloads to Zalo OA, Lark, Slack or internal server' : 'Bắn tin JSON tới Zalo OA, Lark, Slack hoặc server nội bộ'}</p>
                </div>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={zaloEnabled}
                  onChange={(e) => setZaloEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {zaloEnabled && (
              <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Webhook URL nhận thông báo:
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="url"
                      placeholder="https://openapi.zalo.me/... hoặc https://webhook.site/..."
                      value={zaloWebhookUrl}
                      onChange={(e) => setZaloWebhookUrl(e.target.value)}
                      className="flex-1 p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      disabled={testingZalo || !zaloWebhookUrl}
                      onClick={handleTestZalo}
                      className="px-3.5 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer disabled:opacity-50"
                    >
                      {testingZalo ? 'Đang gửi...' : 'Gửi Thử Nghiệm'}
                    </button>
                  </div>
                </div>

                {testZaloResult && (
                  <div className={`p-2.5 rounded-xl text-xs flex items-center gap-2 ${testZaloResult.success ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
                    {testZaloResult.success ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
                    <span>{testZaloResult.message}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 3. Email Alert Card */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 flex items-center justify-center font-bold">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">{isEn ? 'Scheduled Report Email (SMTP)' : 'Email Báo Cáo Định Kỳ (SMTP)'}</h3>
                  <p className="text-[11px] text-slate-500">{isEn ? 'Deliver structured digest reports to IT administrator mailbox' : 'Gửi bảng tổng hợp đẹp mắt vào hộp thư người quản trị IT'}</p>
                </div>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={emailEnabled}
                  onChange={(e) => setEmailEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
              </label>
            </div>

            {emailEnabled && (
              <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Danh sách Email nhận cảnh báo (ngăn cách bằng dấu phẩy):
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="admin@company.com, it-lead@company.com"
                      value={emailRecipients}
                      onChange={(e) => setEmailRecipients(e.target.value)}
                      className="flex-1 p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <button
                      type="button"
                      disabled={testingEmail || !emailRecipients}
                      onClick={handleTestEmail}
                      className="px-3.5 py-2.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer disabled:opacity-50"
                    >
                      {testingEmail ? 'Đang gửi...' : 'Gửi Thử Nghiệm'}
                    </button>
                  </div>
                  <span className="text-[10.5px] text-slate-400 block">
                    Sử dụng cấu hình SMTP máy chủ gửi mail trong tab <strong>Cấu hình Email & SMTP</strong>.
                  </span>
                </div>

                {testEmailResult && (
                  <div className={`p-2.5 rounded-xl text-xs flex items-center gap-2 ${testEmailResult.success ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
                    {testEmailResult.success ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
                    <span>{testEmailResult.message}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 4. Threshold Settings Card */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>{isEn ? '⏱️ Expiry Threshold Notice Intervals' : '⏱️ Ngưỡng Thời Gian Cảnh Báo Trước'}</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {isEn ? 'Standard alert notice (days before):' : 'Cảnh báo thông thường (trước số ngày):'}
                </label>
                <input
                  type="number"
                  min={1}
                  max={90}
                  value={thresholdDays}
                  onChange={(e) => setThresholdDays(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-[10.5px] text-slate-400 block">{isEn ? 'Default: 30 days' : 'Mặc định: 30 ngày'}</span>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {isEn ? 'URGENT alert notice 🚨 (days before):' : 'Cảnh báo KHẨN CẤP 🚨 (trước số ngày):'}
                </label>
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={thresholdUrgentDays}
                  onChange={(e) => setThresholdUrgentDays(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-rose-500 text-rose-600"
                />
                <span className="text-[10.5px] text-slate-400 block">{isEn ? 'Default: 7 days' : 'Mặc định: 7 ngày'}</span>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={saving}
              onClick={handleSaveSettings}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              <span>{saving ? (isEn ? 'Saving...' : 'Đang lưu...') : (isEn ? 'Save Alert Settings' : 'Lưu Cấu Hình Cảnh Báo')}</span>
            </button>

            {saveSuccess && (
              <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> Đã lưu thành công!
              </span>
            )}
          </div>
        </div>

        {/* Right Column: Live Scan Dashboard (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Bell className="w-4 h-4 text-blue-600" />
                <span>{isEn ? 'Recent Scan Status' : 'Trạng Thái Quét Gần Nhất'}</span>
              </h3>
              {lastScanTime && (
                <span className="text-[10px] text-slate-400 font-mono">
                  {new Date(lastScanTime).toLocaleTimeString('vi-VN')} {new Date(lastScanTime).toLocaleDateString('vi-VN')}
                </span>
              )}
            </div>

            {scanResult ? (
              <div className="space-y-4">
                {/* Stats row */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/60 dark:border-slate-700">
                    <span className="text-lg font-black text-slate-800 dark:text-white block">
                      {scanResult.totalExpiring || 0}
                    </span>
                    <span className="text-[10px] text-slate-500 font-bold block">{isEn ? 'Total Monitored' : 'Tổng cần theo dõi'}</span>
                  </div>

                  <div className="p-3 bg-rose-50 dark:bg-rose-950/40 rounded-2xl border border-rose-200 dark:border-rose-800">
                    <span className="text-lg font-black text-rose-600 dark:text-rose-400 block">
                      {scanResult.criticalCount || 0}
                    </span>
                    <span className="text-[10px] text-rose-700 dark:text-rose-300 font-bold block">{isEn ? 'Urgent (≤ 7d)' : 'Khẩn cấp (≤ 7d)'}</span>
                  </div>

                  <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-2xl border border-amber-200 dark:border-amber-800">
                    <span className="text-lg font-black text-amber-600 dark:text-amber-400 block">
                      {scanResult.warningCount || 0}
                    </span>
                    <span className="text-[10px] text-amber-700 dark:text-amber-300 font-bold block">{isEn ? 'Upcoming (≤ 15d)' : 'Sắp đến (≤ 15d)'}</span>
                  </div>
                </div>

                {/* Items List */}
                <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
                  {/* Services */}
                  {scanResult.services?.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                        <Globe className="w-3.5 h-3.5 text-blue-600" />
                        <span>{isEn ? `IT Services / Telecom (${scanResult.services.length})` : `Dịch vụ IT / Đường truyền (${scanResult.services.length})`}</span>
                      </span>
                      {scanResult.services.map((s: any) => (
                        <div key={s.id} className="p-2.5 bg-slate-50 dark:bg-slate-800/80 rounded-xl text-xs flex items-center justify-between gap-2 border border-slate-200/60 dark:border-slate-700">
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 dark:text-white truncate">
                              [{s.codeOrTag}] {s.name}
                            </p>
                            <span className="text-[10px] text-slate-400 block truncate">
                              Đối tác: {s.vendorName} • Hạn: {s.expiryDate}
                            </span>
                          </div>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${s.daysRemaining <= 7 ? 'bg-rose-100 text-rose-700 border border-rose-200' : 'bg-amber-100 text-amber-700 border border-amber-200'}`}>
                            {s.daysRemaining <= 0 ? (isEn ? 'Due!' : 'Đến hạn!') : `${s.daysRemaining} ${isEn ? 'days' : 'ngày'}`}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Licenses */}
                  {scanResult.licenses?.length > 0 && (
                    <div className="space-y-1 pt-2">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                        <Key className="w-3.5 h-3.5 text-purple-600" />
                        <span>{isEn ? `Software Licenses (${scanResult.licenses.length})` : `Bản quyền phần mềm (${scanResult.licenses.length})`}</span>
                      </span>
                      {scanResult.licenses.map((l: any) => (
                        <div key={l.id} className="p-2.5 bg-slate-50 dark:bg-slate-800/80 rounded-xl text-xs flex items-center justify-between gap-2 border border-slate-200/60 dark:border-slate-700">
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 dark:text-white truncate">
                              {l.name}
                            </p>
                            <span className="text-[10px] text-slate-400 block truncate">
                              Đối tác: {l.vendorName} • Hạn: {l.expiryDate}
                            </span>
                          </div>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${l.daysRemaining <= 7 ? 'bg-rose-100 text-rose-700 border border-rose-200' : 'bg-amber-100 text-amber-700 border border-amber-200'}`}>
                            {l.daysRemaining <= 0 ? (isEn ? 'Expired!' : 'Hết hạn!') : `${l.daysRemaining} ${isEn ? 'days' : 'ngày'}`}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Warranties */}
                  {scanResult.warranties?.length > 0 && (
                    <div className="space-y-1 pt-2">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                        <Laptop className="w-3.5 h-3.5 text-indigo-600" />
                        <span>{isEn ? `Hardware Warranties (${scanResult.warranties.length})` : `Bảo hành phần cứng (${scanResult.warranties.length})`}</span>
                      </span>
                      {scanResult.warranties.map((w: any) => (
                        <div key={w.id} className="p-2.5 bg-slate-50 dark:bg-slate-800/80 rounded-xl text-xs flex items-center justify-between gap-2 border border-slate-200/60 dark:border-slate-700">
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 dark:text-white truncate">
                              [{w.codeOrTag}] {w.name}
                            </p>
                            <span className="text-[10px] text-slate-400 block truncate">
                              Người giữ: {w.assignedTo} • Hạn: {w.expiryDate}
                            </span>
                          </div>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${w.daysRemaining <= 7 ? 'bg-rose-100 text-rose-700 border border-rose-200' : 'bg-amber-100 text-amber-700 border border-amber-200'}`}>
                            {w.daysRemaining <= 0 ? (isEn ? 'Expired!' : 'Hết BH!') : `${w.daysRemaining} ${isEn ? 'days' : 'ngày'}`}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {scanResult.totalExpiring === 0 && (
                    <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 text-slate-400 text-xs">
                      {isEn ? `🎉 Great! No IT services, licenses or devices are expiring within the next ${thresholdDays} days.` : `🎉 Tuyệt vời! Hiện tại không có dịch vụ, license hoặc thiết bị nào sắp hết hạn trong vòng ${thresholdDays} ngày tới.`}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-slate-400 text-xs">
                {isEn ? 'No recent scan data. Click ⚡ Scan & Dispatch Alerts Now above to run an inspection.' : 'Chưa có dữ liệu quét gần đây. Bấm nút ⚡ Quét & Bắn Thông Báo Ngay ở góc trên để chạy quét.'}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}