import type { Locale } from './types';
import { LOCALE_COOKIE, LOCALE_STORAGE_KEY } from './types';

export function setLocaleCookie(locale: Locale) {
  document.cookie = `${LOCALE_COOKIE}=${locale};path=/;max-age=31536000;SameSite=Lax`;
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    /* ignore */
  }
}

export function readStoredLocale(): Locale | null {
  try {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (stored === 'tr' || stored === 'en' || stored === 'de' || stored === 'es' || stored === 'fr') {
      return stored;
    }
  } catch {
    /* ignore */
  }
  return null;
}
