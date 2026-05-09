import { en } from './en';
import { it } from './it';

export type SupportedLocale = 'en' | 'it';
export const DEFAULT_LOCALE: SupportedLocale = 'en';

const translations = { en, it } as const;

export function getTranslations(lang: SupportedLocale) {
  return translations[lang];
}

export function getAlternateUrl(currentLang: SupportedLocale, base: string): string {
  const b = base.endsWith('/') ? base : base + '/';
  return currentLang === 'en' ? `${b}it/` : b;
}
