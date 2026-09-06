'use client';

import { useState } from 'react';
import { Lock, Crown, Sparkles, ExternalLink, ShieldCheck, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/context';
import { EnterpriseUpgradeModal } from './EnterpriseUpgradeModal';

interface EnterpriseFeatureLockProps {
  title: string;
  titleEn: string;
  subtitle: string;
  subtitleEn: string;
  icon: string;
  tier?: 'ENTERPRISE' | 'PRO';
  bullets: string[];
  bulletsEn: string[];
  previewType: 'sso' | 'ldap' | 'webhooks' | 'routing';
}

export function EnterpriseFeatureLock({
  title,
  titleEn,
  subtitle,
  subtitleEn,
  icon,
  tier = 'ENTERPRISE',
  bullets,
  bulletsEn,
  previewType,
}: EnterpriseFeatureLockProps) {
  const { language } = useLanguage();
  const isEn = language === 'en';
  const [showModal, setShowModal] = useState(false);

  return (
    <div className="space-y-6">
      <EnterpriseUpgradeModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        featureRequested={isEn ? titleEn : title}
      />

      {/* Main Showcase Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-indigo-200/80 dark:border-indigo-900/50 bg-linear-to-br from-indigo-950 via-slate-900 to-blue-950 text-white p-6 sm:p-8 shadow-xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-72 h-72 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 text-xs font-bold uppercase tracking-wider">
              <Crown className="w-3.5 h-3.5" />
              <span>{tier === 'ENTERPRISE' ? 'SIMPLY IT Enterprise Feature' : 'SIMPLY IT Pro Feature'}</span>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-3xl p-2.5 bg-white/10 rounded-2xl backdrop-blur-xs border border-white/10">{icon}</span>
              <div>
                <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                  {isEn ? titleEn : title}
                </h2>
                <p className="text-xs sm:text-sm text-indigo-200 mt-0.5">
                  {isEn ? subtitleEn : subtitle}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed pt-1">
              {isEn
                ? 'This module is restricted in the Community Edition. Upgrade to SIMPLY IT Enterprise to enable production-ready corporate integrations and dedicated support.'
                : 'Tính năng này được thiết kế và bảo vệ độc quyền trên bản SIMPLY IT Enterprise. Nâng cấp để mở khóa toàn bộ khả năng tích hợp doanh nghiệp và chính sách hỗ trợ kỹ thuật chuyên sâu.'}
            </p>
          </div>

          <div className="shrink-0 w-full md:w-auto">
            <button
              type="button"
              onClick={() => setShowModal(true)}
              className="w-full md:w-auto px-6 py-3.5 rounded-2xl bg-linear-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition-all transform hover:-translate-y-0.5 cursor-pointer"
            >
              <Crown className="w-4 h-4" />
              <span>{isEn ? 'Unlock Enterprise' : 'Mở Khóa Bản Enterprise'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <p className="text-[10px] text-center text-indigo-300/80 mt-2">
              {isEn ? 'Includes SLA 24/7 & Custom Deployment' : 'Hỗ trợ triển khai & Cam kết SLA 24/7'}
            </p>
          </div>
        </div>

        {/* Feature Highlights Grid */}
        <div className="mt-6 pt-6 border-t border-white/10 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {(isEn ? bulletsEn : bullets).map((b, i) => (
            <div key={i} className="flex items-center gap-2 text-xs text-indigo-100 bg-white/5 px-3 py-2 rounded-xl border border-white/5">
              <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="truncate">{b}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Disabled / Frosted Glass Preview Section */}
      <div className="relative rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs overflow-hidden">
        {/* Floating Lock Badge Overlay */}
        <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[3px] z-20 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-14 h-14 rounded-2xl bg-slate-900/90 text-amber-400 border border-amber-500/30 flex items-center justify-center shadow-2xl mb-3 animate-pulse">
            <Lock className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-white mb-1">
            {isEn ? 'Enterprise Feature Locked' : 'Tính Năng Đang Được Khóa Trong Bản Community'}
          </h3>
          <p className="text-xs text-slate-200 max-w-md mb-4 leading-relaxed">
            {isEn
              ? 'To protect system integrity, this configuration panel requires an active Enterprise License Key.'
              : 'Để đảm bảo tính toàn vẹn hệ thống và bảo mật doanh nghiệp, bảng điều khiển cấu hình này yêu cầu kích hoạt bản quyền Enterprise.'}
          </p>
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="px-5 py-2.5 rounded-xl bg-white text-slate-900 font-bold text-xs hover:bg-amber-50 transition-colors shadow-md flex items-center gap-2 cursor-pointer"
          >
            <Crown className="w-4 h-4 text-amber-600" />
            <span>{isEn ? 'Request Enterprise Demo' : 'Nhận Báo Giá & Trải Nghiệm Demo'}</span>
          </button>
        </div>

        {/* Simulated Form Content underneath */}
        <div className="space-y-5 opacity-40 select-none pointer-events-none filter blur-[0.5px]">
          {previewType === 'sso' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold">🪟</div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">Microsoft 365 Single Sign-On (Azure AD)</h4>
                    <p className="text-xs text-slate-500">Tích hợp xác thực Microsoft Entra ID cho toàn bộ nhân sự</p>
                  </div>
                </div>
                <div className="w-11 h-6 bg-slate-200 rounded-full"></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <label className="text-xs font-bold text-slate-500">Application (Client) ID</label>
                  <div className="text-xs font-mono text-slate-400 mt-1">4a8b1c2d-3e4f-5a6b-7c8d-9e0f1a2b3c4d</div>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <label className="text-xs font-bold text-slate-500">Client Secret</label>
                  <div className="text-xs font-mono text-slate-400 mt-1">••••••••••••••••••••••••••••••••</div>
                </div>
              </div>
            </div>
          )}

          {previewType === 'ldap' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">🏢</div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">Active Directory / LDAP Server Sync</h4>
                    <p className="text-xs text-slate-500">Đồng bộ người dùng Windows Server Domain Controller</p>
                  </div>
                </div>
                <div className="w-11 h-6 bg-slate-200 rounded-full"></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <label className="text-xs font-bold text-slate-500">LDAP Server URL</label>
                  <div className="text-xs font-mono text-slate-400 mt-1">ldaps://dc01.company.local:636</div>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <label className="text-xs font-bold text-slate-500">Base DN</label>
                  <div className="text-xs font-mono text-slate-400 mt-1">dc=company,dc=local</div>
                </div>
              </div>
            </div>
          )}

          {previewType === 'webhooks' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center font-bold">🔔</div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">Multi-Channel Webhooks & Bot Dispatcher</h4>
                    <p className="text-xs text-slate-500">Gửi thông báo tức thời tới Microsoft Teams, Zalo OA, Slack</p>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-xl border border-indigo-200 bg-indigo-50/50 text-xs font-bold text-indigo-700">
                  🟦 MS Teams Webhook
                </div>
                <div className="p-3 rounded-xl border border-blue-200 bg-blue-50/50 text-xs font-bold text-blue-700">
                  🔵 Zalo Official Account
                </div>
                <div className="p-3 rounded-xl border border-emerald-200 bg-emerald-50/50 text-xs font-bold text-emerald-700">
                  🟩 Slack Incoming Webhook
                </div>
              </div>
            </div>
          )}

          {previewType === 'routing' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-700 flex items-center justify-center font-bold">🎯</div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">Support Org, Queues & SLA Policies</h4>
                    <p className="text-xs text-slate-500">Định tuyến ticket tự động theo chuyên môn và cam kết SLA</p>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-600">
                  Đội Hỗ trợ Phần cứng (L1)
                </div>
                <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-600">
                  Đội Hạ tầng Mạng & Server (L2)
                </div>
                <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-600">
                  Chính sách Cam kết SLA P1 / P2 / P3
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
