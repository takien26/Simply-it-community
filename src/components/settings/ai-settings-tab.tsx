'use client';

import { useLanguage } from '@/lib/i18n/context';
import { useState, useEffect } from 'react';
import {
  Bot,
  Shield,
  Lock,
  Eye,
  EyeOff,
  KeyRound,
  Zap,
  CheckCircle2,
  Sliders,
  Sparkles,
  Server,
  Layers,
  Database,
  Cpu,
  AlertTriangle,
  UserCheck,
  ExternalLink,
  Loader2,
  RefreshCw,
  HelpCircle,
  Check,
} from 'lucide-react';

export function AICopilotSettingsTab() {
  const { language } = useLanguage();
  const isEn = language === 'en';
  const [provider, setProvider] = useState<'gemini' | 'openai'>('gemini');
  const [model, setModel] = useState('gemini-1.5-flash');
  
  // Gemini Key State
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [hasGeminiKey, setHasGeminiKey] = useState(false);
  const [maskedGeminiKey, setMaskedGeminiKey] = useState('');
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [testingGemini, setTestingGemini] = useState(false);
  const [geminiTestResult, setGeminiTestResult] = useState<{ success: boolean; message: string; model?: string } | null>(null);

  // OpenAI Key State
  const [openaiApiKey, setOpenaiApiKey] = useState('');
  const [hasOpenaiKey, setHasOpenaiKey] = useState(false);
  const [maskedOpenaiKey, setMaskedOpenaiKey] = useState('');
  const [showOpenaiKey, setShowOpenaiKey] = useState(false);
  const [testingOpenai, setTestingOpenai] = useState(false);
  const [openaiTestResult, setOpenaiTestResult] = useState<{ success: boolean; message: string; model?: string } | null>(null);

  const [strictRBAC, setStrictRBAC] = useState(true);
  const [maskSensitiveData, setMaskSensitiveData] = useState(true);
  const [allowLiveStats, setAllowLiveStats] = useState(true);

  const [loadingConfig, setLoadingConfig] = useState(true);
  const [savingKey, setSavingKey] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Load current AI configuration
  useEffect(() => {
    async function loadConfig() {
      try {
        setLoadingConfig(true);
        const res = await fetch('/api/ai/config');
        const json = await res.json();
        if (json.success) {
          if (json.provider) setProvider(json.provider);
          if (json.model) setModel(json.model);
          setHasGeminiKey(json.hasGeminiKey || false);
          setMaskedGeminiKey(json.maskedGeminiKey || '');
          setHasOpenaiKey(json.hasOpenAIKey || false);
          setMaskedOpenaiKey(json.maskedOpenAIKey || '');
        }
      } catch (err) {
        console.error('Failed to load AI config:', err);
      } finally {
        setLoadingConfig(false);
      }
    }
    loadConfig();
  }, []);

  // Test Gemini
  const handleTestGemini = async () => {
    try {
      setTestingGemini(true);
      setGeminiTestResult(null);
      const res = await fetch('/api/ai/test-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: 'gemini', apiKey: geminiApiKey.trim() || undefined }),
      });
      const data = await res.json();
      setGeminiTestResult({
        success: data.success,
        message: data.message || (data.success ? 'Kết nối Gemini thành công!' : 'Lỗi kết nối'),
        model: data.model,
      });
    } catch (err: any) {
      setGeminiTestResult({ success: false, message: err?.message || 'Lỗi kết nối máy chủ' });
    } finally {
      setTestingGemini(false);
    }
  };

  // Test OpenAI
  const handleTestOpenAI = async () => {
    try {
      setTestingOpenai(true);
      setOpenaiTestResult(null);
      const res = await fetch('/api/ai/test-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: 'openai', apiKey: openaiApiKey.trim() || undefined }),
      });
      const data = await res.json();
      setOpenaiTestResult({
        success: data.success,
        message: data.message || (data.success ? 'Kết nối OpenAI ChatGPT thành công!' : 'Lỗi kết nối'),
        model: data.model,
      });
    } catch (err: any) {
      setOpenaiTestResult({ success: false, message: err?.message || 'Lỗi kết nối máy chủ' });
    } finally {
      setTestingOpenai(false);
    }
  };

  // Save AI Config
  const handleSave = async () => {
    try {
      setSavingKey(true);
      setSavedSuccess(false);
      const res = await fetch('/api/ai/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          model,
          geminiApiKey: geminiApiKey.trim() || undefined,
          openaiApiKey: openaiApiKey.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSavedSuccess(true);
        if (geminiApiKey.trim()) {
          setHasGeminiKey(true);
          const k = geminiApiKey.trim();
          setMaskedGeminiKey(k.length <= 8 ? '••••••••' : k.slice(0, 4) + '••••••••' + k.slice(-4));
          setGeminiApiKey('');
        }
        if (openaiApiKey.trim()) {
          setHasOpenaiKey(true);
          const k = openaiApiKey.trim();
          setMaskedOpenaiKey(k.length <= 8 ? '••••••••' : k.slice(0, 4) + '••••••••' + k.slice(-4));
          setOpenaiApiKey('');
        }
        setTimeout(() => setSavedSuccess(false), 3500);
      }
    } catch (err) {
      console.error('Failed to save AI config:', err);
    } finally {
      setSavingKey(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Header Banner */}
      <div className="p-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 rounded-3xl text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center backdrop-blur-md">
              <Bot className="w-7 h-7 text-blue-300" />
            </div>
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2">
                <span>{isEn ? 'Multi-AI Provider Configuration (Google Gemini & OpenAI ChatGPT)' : 'Cấu Hình Multi-AI Provider (Google Gemini & OpenAI ChatGPT)'}</span>
                <span className="text-[11px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full font-semibold">
                  {isEn ? '2 Providers Ready' : 'Sẵn sàng 2 Nhà Cung Cấp'}
                </span>
              </h2>
              <p className="text-xs text-slate-300 mt-0.5">
                {isEn ? 'Seamlessly switch between Google Gemini and OpenAI ChatGPT for QR decoding, invoice OCR and Copilot chat' : 'Tự do chuyển đổi giữa Google Gemini và OpenAI ChatGPT để xử lý Trích xuất tem QR, OCR hóa đơn & Chat'}bot IT
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={savingKey}
            className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-blue-500/30 flex items-center gap-2 cursor-pointer transition-all active:scale-95 disabled:opacity-50"
          >
            {savingKey ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            <span>{savingKey ? (isEn ? 'Saving...' : 'Đang Lưu...') : (isEn ? 'Save All AI Configurations' : 'Lưu Toàn Bộ Cấu Hình')}</span>
          </button>
        </div>
      </div>

      {savedSuccess && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 rounded-2xl text-emerald-800 dark:text-emerald-200 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{isEn ? 'AI configuration saved successfully! Active provider has been enabled.' : 'Đã lưu thành công cấu hình AI! Hệ thống đã kích hoạt nhà cung cấp đã chọn.'}</span>
        </div>
      )}

      {/* 1. SELECT ACTIVE AI PROVIDER */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
        <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-500" />
          <span>{isEn ? 'Active Default AI Provider' : 'Chọn Nhà Cung Cấp AI Mặc Định (Active AI Provider)'}</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Option 1: Google Gemini */}
          <div
            onClick={() => {
              setProvider('gemini');
              setModel('gemini-1.5-flash');
            }}
            className={`p-4 rounded-2xl border-2 transition-all cursor-pointer ${
              provider === 'gemini'
                ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/40 ring-2 ring-blue-500/20'
                : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xl">🔷</span>
                <span className="font-extrabold text-sm text-slate-900 dark:text-white">Google Gemini AI</span>
              </div>
              {provider === 'gemini' && (
                <span className="px-2 py-0.5 bg-blue-600 text-white rounded-full text-[10px] font-extrabold">
                  {isEn ? 'Active' : 'Đang kích hoạt'}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {isEn ? 'Next-gen Google multimodal model with ultra-fast inference, large PDF/image support and cost efficiency.' : 'Mô hình thế hệ mới của Google với tốc độ cực nhanh, hỗ trợ file PDF/Ảnh lớn và giá thành tối ưu.'}
            </p>
            <div className="mt-3 flex items-center gap-2 text-[11px] font-bold text-slate-600 dark:text-slate-300">
              <span>{isEn ? 'API Key Status:' : 'Trạng thái Key:'}</span>
              {hasGeminiKey ? (
                <span className="text-emerald-600 font-bold">✓ {isEn ? 'Installed' : 'Đã cài đặt'} ({maskedGeminiKey})</span>
              ) : (
                <span className="text-amber-600 font-bold">⚠ {isEn ? 'Not configured' : 'Chưa cài đặt'}</span>
              )}
            </div>
          </div>

          {/* Option 2: OpenAI ChatGPT */}
          <div
            onClick={() => {
              setProvider('openai');
              setModel('gpt-4o-mini');
            }}
            className={`p-4 rounded-2xl border-2 transition-all cursor-pointer ${
              provider === 'openai'
                ? 'border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/40 ring-2 ring-emerald-500/20'
                : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xl">🟢</span>
                <span className="font-extrabold text-sm text-slate-900 dark:text-white">OpenAI ChatGPT</span>
              </div>
              {provider === 'openai' && (
                <span className="px-2 py-0.5 bg-emerald-600 text-white rounded-full text-[10px] font-extrabold">
                  {isEn ? 'Active' : 'Đang kích hoạt'}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {isEn ? 'Industry-leading GPT-4o & GPT-4o-mini models with deep context comprehension and precise structured extraction.' : 'Mô hình GPT-4o & GPT-4o-mini thông minh hàng đầu, hiểu ngữ cảnh tiếng Việt tự nhiên và trích xuất cấu trúc chuẩn.'}u trúc chuẩn xác.
            </p>
            <div className="mt-3 flex items-center gap-2 text-[11px] font-bold text-slate-600 dark:text-slate-300">
              <span>{isEn ? 'API Key Status:' : 'Trạng thái Key:'}</span>
              {hasOpenaiKey ? (
                <span className="text-emerald-600 font-bold">✓ {isEn ? 'Installed' : 'Đã cài đặt'} ({maskedOpenaiKey})</span>
              ) : (
                <span className="text-amber-600 font-bold">⚠ {isEn ? 'Not configured' : 'Chưa cài đặt'}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 2. CONFIGURE GOOGLE GEMINI KEY (DEFAULT & RECOMMENDED) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
            <span className="text-base">🔷</span>
            <span>{isEn ? 'Google Gemini API Key (Google AI Studio - Free & Fast)' : 'Khóa API Google Gemini (Google AI Studio - Miễn Phí & Tốc Độ Cực Nhanh)'}</span>
          </h3>
          <span className="text-xs text-slate-400">AIzaSy...</span>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              {isEn ? 'Enter new Gemini API Key (if changing):' : 'Nhập Gemini API Key mới (Nếu muốn thay đổi):'}
            </label>
            <div className="relative flex items-center">
              <input
                type={showGeminiKey ? 'text' : 'password'}
                value={geminiApiKey}
                onChange={(e) => setGeminiApiKey(e.target.value)}
                placeholder={hasGeminiKey ? (isEn ? `Currently using: ${maskedGeminiKey} (Enter to change)` : `Đang sử dụng: ${maskedGeminiKey} (Nhập để đổi mới)`) : 'AIzaSy...'}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white font-mono outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={() => setShowGeminiKey(!showGeminiKey)}
                className="absolute right-3 p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                {showGeminiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              type="button"
              onClick={handleTestGemini}
              disabled={testingGemini}
              className="px-4 py-2 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-xl text-xs font-bold border border-blue-200 dark:border-blue-800 flex items-center gap-2 cursor-pointer transition-all active:scale-95"
            >
              {testingGemini ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5 text-blue-600" />}
              <span>{isEn ? 'Test Gemini Connection' : 'Kiểm Tra Kết Nối Gemini'}</span>
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={savingKey}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer shadow-sm transition-all active:scale-95 disabled:opacity-50"
            >
              {savingKey ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
              <span>{savingKey ? (isEn ? 'Saving...' : 'Đang Lưu...') : (isEn ? 'Save Gemini Configuration' : 'Lưu Cấu Hình Gemini')}</span>
            </button>
          </div>

          {geminiTestResult && (
            <div
              className={`p-3 rounded-xl border text-xs font-medium ${
                geminiTestResult.success
                  ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 text-emerald-800 dark:text-emerald-200'
                  : 'bg-rose-50 dark:bg-rose-950/50 border-rose-300 text-rose-800 dark:text-rose-200'
              }`}
            >
              {geminiTestResult.message}
            </div>
          )}
        </div>
      </div>

      {/* 3. CONFIGURE OPENAI CHATGPT KEY */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
            <span className="text-base">🟢</span>
            <span>{isEn ? 'OpenAI API Key (ChatGPT)' : 'Khóa API OpenAI ChatGPT (OpenAI API Key)'}</span>
          </h3>
          <span className="text-xs text-slate-400">sk-proj-...</span>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              {isEn ? 'Enter new API Key (if changing):' : 'Nhập API Key mới (Nếu muốn thay đổi):'}
            </label>
            <div className="relative flex items-center">
              <input
                type={showOpenaiKey ? 'text' : 'password'}
                value={openaiApiKey}
                onChange={(e) => setOpenaiApiKey(e.target.value)}
                placeholder={hasOpenaiKey ? (isEn ? `Currently using: ${maskedOpenaiKey} (Enter to change)` : `Đang sử dụng: ${maskedOpenaiKey} (Nhập để đổi mới)`) : 'sk-proj-...'}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white font-mono outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <button
                type="button"
                onClick={() => setShowOpenaiKey(!showOpenaiKey)}
                className="absolute right-3 p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                {showOpenaiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              type="button"
              onClick={handleTestOpenAI}
              disabled={testingOpenai}
              className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 rounded-xl text-xs font-bold border border-emerald-200 dark:border-emerald-800 flex items-center gap-2 cursor-pointer transition-all active:scale-95"
            >
              {testingOpenai ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5 text-emerald-600" />}
              <span>{isEn ? 'Test OpenAI Connection' : 'Kiểm Tra Kết Nối OpenAI'}</span>
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={savingKey}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer shadow-sm transition-all active:scale-95 disabled:opacity-50"
            >
              {savingKey ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
              <span>{savingKey ? (isEn ? 'Saving...' : 'Đang Lưu...') : (isEn ? 'Save OpenAI Configuration' : 'Lưu Cấu Hình OpenAI')}</span>
            </button>
          </div>

          {openaiTestResult && (
            <div
              className={`p-3 rounded-xl border text-xs font-medium ${
                openaiTestResult.success
                  ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 text-emerald-800 dark:text-emerald-200'
                  : 'bg-rose-50 dark:bg-rose-950/50 border-rose-300 text-rose-800 dark:text-rose-200'
              }`}
            >
              {openaiTestResult.message}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Save Action Bar */}
      <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {isEn ? 'Make sure to test your API key connection before saving.' : 'Hãy kiểm tra kết nối API Key trước khi lưu để đảm bảo hệ thống hoạt động chính xác.'}
        </p>
        <button
          type="button"
          onClick={handleSave}
          disabled={savingKey}
          className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold text-xs rounded-xl shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 disabled:opacity-50"
        >
          {savingKey ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
          <span>{savingKey ? (isEn ? 'Saving...' : 'Đang Lưu...') : (isEn ? 'Save All AI Configurations' : 'Lưu Toàn Bộ Cấu Hình AI')}</span>
        </button>
      </div>
    </div>
  );
}