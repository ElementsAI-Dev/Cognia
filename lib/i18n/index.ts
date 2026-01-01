/**
 * I18n module - exports internationalization utilities
 */

export { I18nProvider } from './provider';
export { locales, type Locale, defaultLocale, localeNames, localeFlags } from './config';
export {
  autoDetectLocale,
  getBrowserLocale,
  getSystemTimezone,
  initializeLocale,
  type AutoDetectResult,
} from './locale-auto-detect';
