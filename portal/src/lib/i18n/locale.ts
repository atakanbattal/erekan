import { de, enUS, es, fr, tr } from 'date-fns/locale';
import type { Locale } from './types';
import { DEFAULT_LOCALE, LOCALES } from './types';

export function isLocale(value: string | undefined | null): value is Locale {
  return !!value && (LOCALES as readonly string[]).includes(value);
}

export function normalizeLocale(value: string | undefined | null): Locale {
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

export function dateFnsLocale(locale: Locale) {
  const map = { tr, en: enUS, de, es, fr } as const;
  return map[locale];
}

export const LOCALE_FLAGS: Record<Locale, string> = {
  tr: '🇹🇷',
  en: '🇬🇧',
  de: '🇩🇪',
  es: '🇪🇸',
  fr: '🇫🇷',
};

export const LOCALE_LABELS: Record<Locale, string> = {
  tr: 'TR',
  en: 'EN',
  de: 'DE',
  es: 'ES',
  fr: 'FR',
};

export const LOCALE_NAMES: Record<Locale, string> = {
  tr: 'Türkçe',
  en: 'English',
  de: 'Deutsch',
  es: 'Español',
  fr: 'Français',
};
