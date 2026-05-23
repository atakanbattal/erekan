import type { Messages } from './types';

export function createTranslator(messages: Messages) {
  return function t(key: string, params?: Record<string, string | number>): string {
    const parts = key.split('.');
    let value: unknown = messages;
    for (const part of parts) {
      if (value && typeof value === 'object' && part in value) {
        value = (value as Record<string, unknown>)[part];
      } else {
        return key;
      }
    }
    if (typeof value !== 'string') return key;
    if (!params) return value;
    return Object.entries(params).reduce(
      (acc, [k, v]) => acc.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v)),
      value
    );
  };
}

export type Translator = ReturnType<typeof createTranslator>;
