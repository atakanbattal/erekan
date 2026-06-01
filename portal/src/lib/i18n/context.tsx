'use client';

import { createContext, useContext, useMemo, useCallback, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { Locale } from './types';
import { messages } from './messages';
import { createTranslator, type Translator } from './translator';
import { dateFnsLocale, normalizeLocale } from './locale';
import { readStoredLocale, setLocaleCookie } from './client';

interface I18nContextValue {
  locale: Locale;
  t: Translator;
  dateLocale: ReturnType<typeof dateFnsLocale>;
  setLocale: (locale: Locale) => void;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({
  initialLocale,
  children,
}: {
  initialLocale: Locale;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  useEffect(() => {
    const stored = readStoredLocale();
    if (!stored) {
      setLocaleCookie(initialLocale);
      return;
    }
    if (stored !== initialLocale) {
      setLocaleCookie(stored);
      setLocaleState(stored);
    }
  }, [initialLocale]);

  const setLocale = useCallback(
    (next: Locale) => {
      setLocaleCookie(next);
      setLocaleState(next);
      router.refresh();
    },
    [router]
  );

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      t: createTranslator(messages[locale]),
      dateLocale: dateFnsLocale(locale),
      setLocale,
    }),
    [locale, setLocale]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}

export function useOptionalI18n() {
  return useContext(I18nContext);
}
