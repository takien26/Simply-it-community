'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Language, dictionaries, SUPPORTED_LANGUAGES, LanguageMeta } from './dictionaries';

export interface TranslationParams {
  [key: string]: string | number | boolean;
}

export type TranslateFn = {
  (key: string, fallback?: string): string;
  (key: string, params: TranslationParams, fallback?: string): string;
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: TranslateFn;
  supportedLanguages: LanguageMeta[];
}

const LanguageContext = createContext<LanguageContextType>({
  language: 'vi',
  setLanguage: () => {},
  t: ((key: string, paramsOrFallback?: any, maybeFallback?: string) => {
    if (typeof paramsOrFallback === 'string') return paramsOrFallback;
    if (typeof maybeFallback === 'string') return maybeFallback;
    return key;
  }) as TranslateFn,
  supportedLanguages: SUPPORTED_LANGUAGES,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('vi');

  // Load language preference on mount
  useEffect(() => {
    try {
      const validCodes = SUPPORTED_LANGUAGES.map((l) => l.code);

      // 1. Try localStorage
      const savedLang = localStorage.getItem('simply_lang') as Language;
      if (savedLang && validCodes.includes(savedLang)) {
        setLanguageState(savedLang);
        document.documentElement.lang = savedLang;
        return;
      }

      // 2. Try cookie
      const match = document.cookie.match(/app_lang=([a-z]{2})/);
      if (match && validCodes.includes(match[1])) {
        const cookieLang = match[1] as Language;
        setLanguageState(cookieLang);
        document.documentElement.lang = cookieLang;
        return;
      }

      // 3. Fallback to system settings default if available
      fetch('/api/settings')
        .then((res) => res.json())
        .then((data) => {
          if (data.success && Array.isArray(data.data)) {
            const langSetting = data.data.find(
              (s: any) => s.key === 'app.language' || s.key === 'app.default_language'
            );
            if (langSetting?.value && validCodes.includes(langSetting.value)) {
              setLanguageState(langSetting.value as Language);
              document.documentElement.lang = langSetting.value;
            }
          }
        })
        .catch(() => {});
    } catch {}
  }, []);

  // Listen to custom cross-component language change events
  useEffect(() => {
    const handleLangChange = (e: any) => {
      const validCodes = SUPPORTED_LANGUAGES.map((l) => l.code);
      if (e?.detail?.language && validCodes.includes(e.detail.language)) {
        setLanguageState(e.detail.language);
      }
    };
    window.addEventListener('app:language-change', handleLangChange);
    return () => window.removeEventListener('app:language-change', handleLangChange);
  }, []);

  const setLanguage = useCallback((newLang: Language) => {
    setLanguageState(newLang);
    try {
      localStorage.setItem('simply_lang', newLang);
      document.cookie = `app_lang=${newLang}; path=/; max-age=31536000`;
      document.documentElement.lang = newLang;
      window.dispatchEvent(
        new CustomEvent('app:language-change', { detail: { language: newLang } })
      );
    } catch {}
  }, []);

  const t: TranslateFn = useCallback(
    (key: string, paramsOrFallback?: TranslationParams | string, maybeFallback?: string): string => {
      let params: TranslationParams | undefined;
      let fallbackStr: string | undefined;

      if (typeof paramsOrFallback === 'string') {
        fallbackStr = paramsOrFallback;
      } else if (paramsOrFallback && typeof paramsOrFallback === 'object') {
        params = paramsOrFallback;
        fallbackStr = maybeFallback;
      }

      if (!key || typeof key !== 'string') return fallbackStr || '';

      // Normalize key (support both "module:key" and "module.key")
      const normalizedKeyDot = key.includes(':') ? key.replace(':', '.') : key;
      const normalizedKeyColon = key.includes('.') ? key.replace('.', ':') : key;

      // Multi-tier Fallback: Current language -> English -> Vietnamese -> fallbackStr -> key
      const currentDict = dictionaries[language] || {};
      const enDict = dictionaries['en'] || {};
      const viDict = dictionaries['vi'] || {};

      let template =
        currentDict[key] ??
        currentDict[normalizedKeyDot] ??
        currentDict[normalizedKeyColon] ??
        enDict[key] ??
        enDict[normalizedKeyDot] ??
        enDict[normalizedKeyColon] ??
        viDict[key] ??
        viDict[normalizedKeyDot] ??
        viDict[normalizedKeyColon] ??
        fallbackStr ??
        key;

      // Interpolate parameters: {count}, {{count}}, {name}, etc.
      if (params && typeof template === 'string') {
        for (const [pKey, pVal] of Object.entries(params)) {
          template = template
            .replace(new RegExp(`\\{\\{?${pKey}\\}?\\}`, 'g'), String(pVal));
        }
      }

      return template;
    },
    [language]
  );

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, supportedLanguages: SUPPORTED_LANGUAGES }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}

export { SUPPORTED_LANGUAGES };
export type { Language, LanguageMeta };
