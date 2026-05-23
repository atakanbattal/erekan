import type { Locale, Messages } from '../types';
import { tr } from './tr';
import { en } from './en';
import { de } from './de';
import { es } from './es';
import { fr } from './fr';

export const messages: Record<Locale, Messages> = { tr, en, de, es, fr };

export { tr, en, de, es, fr };
export type { Messages };
