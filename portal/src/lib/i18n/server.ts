import { cookies } from 'next/headers';
import { messages } from './messages';
import { createTranslator } from './translator';
import { dateFnsLocale, normalizeLocale } from './locale';
import { LOCALE_COOKIE } from './types';

export async function getServerI18n() {
  const cookieStore = await cookies();
  const locale = normalizeLocale(cookieStore.get(LOCALE_COOKIE)?.value);
  return {
    locale,
    t: createTranslator(messages[locale]),
    dateLocale: dateFnsLocale(locale),
  };
}
