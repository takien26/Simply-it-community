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
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt', flag: '🇻🇳' },
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
import viPasswords from './vi/passwords.json';
import viDocuments from './vi/documents.json';
import viCategories from './vi/categories.json';
import viSpareParts from './vi/spare_parts.json';
import viFloorMaps from './vi/floor_maps.json';
import viIncidents from './vi/incidents.json';
import viKb from './vi/kb.json';
import viChatbot from './vi/chatbot.json';

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
import enPasswords from './en/passwords.json';
import enDocuments from './en/documents.json';
import enCategories from './en/categories.json';
import enSpareParts from './en/spare_parts.json';
import enFloorMaps from './en/floor_maps.json';
import enIncidents from './en/incidents.json';
import enKb from './en/kb.json';
import enChatbot from './en/chatbot.json';

// Import Japanese Modules
import jaCommon from './ja/common.json';
import jaAuth from './ja/auth.json';
import jaAssets from './ja/assets.json';
import jaLicenses from './ja/licenses.json';
import jaServices from './ja/services.json';
import jaTickets from './ja/tickets.json';
import jaDashboard from './ja/dashboard.json';
import jaUsers from './ja/users.json';
import jaSettings from './ja/settings.json';
import jaPortal from './ja/portal.json';
import jaApprovals from './ja/approvals.json';
import jaPasswords from './ja/passwords.json';
import jaDocuments from './ja/documents.json';
import jaCategories from './ja/categories.json';
import jaSpareParts from './ja/spare_parts.json';
import jaFloorMaps from './ja/floor_maps.json';
import jaIncidents from './ja/incidents.json';
import jaKb from './ja/kb.json';
import jaChatbot from './ja/chatbot.json';

function buildDictionary(...modules: Record<string, any>[]): Record<string, string> {
  const merged: Record<string, string> = {};
  for (const mod of modules) {
    if (!mod) continue;
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
    viApprovals,
    viPasswords,
    viDocuments,
    viCategories,
    viSpareParts,
    viFloorMaps,
    viIncidents,
    viKb,
    viChatbot
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
    enApprovals,
    enPasswords,
    enDocuments,
    enCategories,
    enSpareParts,
    enFloorMaps,
    enIncidents,
    enKb,
    enChatbot
  ),
  ja: buildDictionary(
    jaCommon,
    jaAuth,
    jaAssets,
    jaLicenses,
    jaServices,
    jaTickets,
    jaDashboard,
    jaUsers,
    jaSettings,
    jaPortal,
    jaApprovals,
    jaPasswords,
    jaDocuments,
    jaCategories,
    jaSpareParts,
    jaFloorMaps,
    jaIncidents,
    jaKb,
    jaChatbot
  ),
};
