import React, { createContext, useContext, useState, useCallback, useMemo, useEffect, ReactNode } from 'react';
import { translations, type TranslationKey, type Language } from '../i18n';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string;
}

// Exported so provider-independent consumers (e.g. the top-level ErrorBoundary,
// which sits OUTSIDE the provider) can read it safely via useContext without the
// throwing `useLanguage` hook.
export const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const STORAGE_KEY = 'primo_language';
const DEFAULT_LANGUAGE: Language = 'it';

// Escape regex metacharacters so a var name is matched literally.
function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function readInitialLanguage(): Language {
  if (typeof window === 'undefined') return DEFAULT_LANGUAGE;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === 'en' || stored === 'it') return stored;
  } catch {
    // localStorage can throw in private modes or when disabled — fall through.
  }
  return DEFAULT_LANGUAGE;
}

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>(readInitialLanguage);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, language);
    } catch {
      // ignore — choice will just not persist this session.
    }
    // Keep <html lang> synced to the active locale at the language source, so
    // it's correct on every route/state — including loading skeletons and any
    // page that doesn't call useSeo. Idempotent with useSeo's own set (which
    // also writes documentElement.lang), so the redundancy is harmless.
    if (typeof document !== 'undefined') {
      document.documentElement.lang = language;
    }
  }, [language]);

  const t = useCallback((key: TranslationKey, vars?: Record<string, string | number>) => {
    let result = translations[language][key] || key;
    if (vars) {
      // Pluralization token: {{name|singular|plural}} picks a form by the numeric
      // var `name`. Both IT and EN use the simple one/other rule (1 → singular,
      // everything else incl. 0 → plural), so "1 articolo" / "0 articoli".
      result = result.replace(
        /\{\{(\w+)\|([^|{}]*)\|([^{}]*)\}\}/g,
        (_m, name, one, other) => (Number(vars[name]) === 1 ? one : other)
      );
      Object.entries(vars).forEach(([k, v]) => {
        // Global regex + function replacer: replaces ALL occurrences and bypasses
        // `$`-pattern interpretation in the value (so values containing `$` are safe).
        result = result.replace(
          new RegExp('\\{\\{' + escapeRegExp(k) + '\\}\\}', 'g'),
          () => String(v)
        );
      });
    }
    return result;
  }, [language]);

  const value = useMemo(() => ({ language, setLanguage, t }), [language, t]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
