import type { tr } from './messages/tr';

export const LOCALES = ['tr', 'en', 'de', 'es', 'fr'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'tr';
export const LOCALE_STORAGE_KEY = 'armaweld-lang';
export const LOCALE_COOKIE = 'armaweld-lang';

type DeepString<T> = {
  [K in keyof T]: T[K] extends string ? string : DeepString<T[K]>;
};

export type Messages = DeepString<typeof tr>;
