/**
 * i18n Configuration
 */

export const locales = ['en', 'zh-CN'] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'en';

export const localeNames: Record<Locale, string> = {
  'en': 'English',
  'zh-CN': '简体中文',
};

export const localeFlags: Record<Locale, string> = {
  'en': '🇺🇸',
  'zh-CN': '🇨🇳',
};
