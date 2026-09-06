'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Language, dictionaries } from './dictionaries';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, fallback?: string) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  language: 'vi',
  setLanguage: () => {},
  t: (key: string, fallback?: string) => fallback || key,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('vi');

  // Load language preference on mount
  useEffect(() => {
    try {
      // 1. Try localStorage
      const savedLang = localStorage.getItem('simply_lang') as Language;
      if (savedLang === 'vi' || savedLang === 'en') {
        setLanguageState(savedLang);
        document.documentElement.lang = savedLang;
        return;
      }

      // 2. Try cookie
      const match = document.cookie.match(/app_lang=(vi|en)/);
      if (match && (match[1] === 'vi' || match[1] === 'en')) {
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
            if (langSetting?.value === 'en' || langSetting?.value === 'vi') {
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
      if (e?.detail?.language && (e.detail.language === 'vi' || e.detail.language === 'en')) {
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

  const t = useCallback(
    (key: string, fallback?: string): string => {
      const dict = dictionaries[language] || dictionaries.vi;
      if (dict && dict[key] !== undefined) {
        return dict[key];
      }
      return fallback !== undefined ? fallback : key;
    },
    [language]
  );

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
