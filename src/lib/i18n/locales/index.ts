// Modular i18n Locales Aggregator & Multi-tier Fallback Engine
// Automatically combines modular JSON namespaces into comprehensive dictionaries.

export interface LanguageMeta {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
  dir?: 'ltr' | 'rtl';
}

export const SUPPORTED_LANGUAGES: LanguageMeta[] = [
  { code: 'vi', name: 'Tiếng Việt', nativeName: 'Tiếng Việt', flag: '🇻🇳' },
  { code: 'en', name: 'English', nativeName: 'English (US)', flag: '🇬🇧' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵' },
];

export type Language = 'vi' | 'en' | 'ja' | 'zh' | 'ko' | 'fr' | 'de';

// Import Vietnamese Modules
import viCommon from './vi/common.json';
import viAuth from './vi/auth.json';
import viAssets from './vi/assets.json';
import viLicenses from './vi/licenses.json';
import viServices from './vi/services.json';
import viTickets from './vi/tickets.json';
import viDashboard from './vi/dashboard.json';
import viUsers from './vi/users.json';
import viSettings from './vi/settings.json';
import viPortal from './vi/portal.json';
import viApprovals from './vi/approvals.json';

// Import English Modules
import enCommon from './en/common.json';
import enAuth from './en/auth.json';
import enAssets from './en/assets.json';
import enLicenses from './en/licenses.json';
import enServices from './en/services.json';
import enTickets from './en/tickets.json';
import enDashboard from './en/dashboard.json';
import enUsers from './en/users.json';
import enSettings from './en/settings.json';
import enPortal from './en/portal.json';
import enApprovals from './en/approvals.json';

// Import Japanese Module (Preview)
import jaCommon from './ja/common.json';

function buildDictionary(...modules: Record<string, any>[]): Record<string, string> {
  const merged: Record<string, string> = {};
  for (const mod of modules) {
    for (const [k, v] of Object.entries(mod)) {
      if (typeof v === 'string') {
        merged[k] = v;
        // Also support namespace colon syntax: "assets:title" <-> "assets.title"
        const colonKey = k.replace('.', ':');
        if (colonKey !== k) {
          merged[colonKey] = v;
        }
      }
    }
  }
  return merged;
}

export const dictionaries: Record<string, Record<string, string>> = {
  vi: buildDictionary(
    viCommon,
    viAuth,
    viAssets,
    viLicenses,
    viServices,
    viTickets,
    viDashboard,
    viUsers,
    viSettings,
    viPortal,
    viApprovals
  ),
  en: buildDictionary(
    enCommon,
    enAuth,
    enAssets,
    enLicenses,
    enServices,
    enTickets,
    enDashboard,
    enUsers,
    enSettings,
    enPortal,
    enApprovals
  ),
  ja: buildDictionary(
    jaCommon
  ),
};
