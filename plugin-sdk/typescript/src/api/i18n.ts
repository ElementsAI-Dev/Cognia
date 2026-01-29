/**
 * Enhanced Internationalization API
 *
 * @description Type-safe internationalization utilities for plugins.
 * Provides typed translation keys, pluralization, and locale management.
 */

/**
 * Supported locales
 */
export type SupportedLocale = 'en' | 'en-US' | 'en-GB' | 'zh' | 'zh-CN' | 'zh-TW' | 'ja' | 'ko' | 'es' | 'fr' | 'de' | 'pt' | 'ru' | 'ar';

/**
 * Translation parameters
 */
export type TranslationParams = Record<string, string | number | boolean>;

/**
 * Plural forms
 */
export interface PluralForms {
  zero?: string;
  one: string;
  two?: string;
  few?: string;
  many?: string;
  other: string;
}

/**
 * Translation value (can be string or plural forms)
 */
export type TranslationValue = string | PluralForms;

/**
 * Translation dictionary
 */
export type TranslationDictionary = Record<string, TranslationValue>;

/**
 * Locale configuration
 */
export interface LocaleConfig {
  /** Locale code */
  locale: SupportedLocale;
  /** Display name */
  displayName: string;
  /** Native name */
  nativeName: string;
  /** Text direction */
  direction: 'ltr' | 'rtl';
  /** Date format pattern */
  dateFormat: string;
  /** Number format options */
  numberFormat: Intl.NumberFormatOptions;
}

/**
 * Translation options
 */
export interface TranslationOptions {
  /** Default value if key not found */
  defaultValue?: string;
  /** Count for pluralization */
  count?: number;
  /** Context for contextual translations */
  context?: string;
  /** Interpolation parameters */
  params?: TranslationParams;
}

/**
 * I18n loading options
 */
export interface I18nLoadOptions {
  /** Fallback locale if translation not found */
  fallbackLocale?: SupportedLocale;
  /** Whether to load translations lazily */
  lazy?: boolean;
  /** Base path for translation files */
  basePath?: string;
}

/**
 * Create typed translations helper
 *
 * @remarks
 * Creates a type-safe translation function from a translations object.
 *
 * @example
 * ```typescript
 * const translations = {
 *   en: {
 *     'greeting': 'Hello, {name}!',
 *     'items': { one: '{count} item', other: '{count} items' },
 *   },
 *   'zh-CN': {
 *     'greeting': '你好，{name}！',
 *     'items': { one: '{count} 个项目', other: '{count} 个项目' },
 *   },
 * };
 *
 * // In component
 * const { t } = useTypedTranslations(translations);
 * t('greeting', { name: 'World' }); // Type-safe key
 * t('items', { count: 5 }); // Pluralization
 * ```
 */
export interface TypedTranslationsConfig<T extends Record<string, TranslationValue>> {
  /** Translations by locale */
  translations: Record<SupportedLocale, T>;
  /** Default locale */
  defaultLocale: SupportedLocale;
  /** Fallback locale */
  fallbackLocale?: SupportedLocale;
}

/**
 * Enhanced I18n API for plugins
 *
 * @remarks
 * Provides enhanced internationalization features including:
 * - Type-safe translation keys
 * - Pluralization support
 * - Parameter interpolation
 * - Locale detection and switching
 * - RTL support
 *
 * @example
 * ```typescript
 * // Basic usage
 * const message = context.i18n.t('welcome.message', { name: 'User' });
 *
 * // Pluralization
 * const itemsText = context.i18n.t('items.count', { count: 5 });
 *
 * // Get current locale
 * const locale = context.i18n.getLocale();
 *
 * // Switch locale
 * context.i18n.setLocale('zh-CN');
 *
 * // Listen for locale changes
 * context.i18n.onLocaleChange((locale) => {
 *   console.log('Locale changed to:', locale);
 * });
 * ```
 */
export interface PluginI18nAPI {
  /**
   * Translate a key
   *
   * @param key - Translation key
   * @param options - Translation options
   * @returns Translated string
   */
  t(key: string, options?: TranslationOptions): string;

  /**
   * Translate with parameters (shorthand)
   *
   * @param key - Translation key
   * @param params - Interpolation parameters
   */
  t(key: string, params: TranslationParams): string;

  /**
   * Check if a translation key exists
   *
   * @param key - Translation key
   * @param locale - Optional locale to check
   */
  exists(key: string, locale?: SupportedLocale): boolean;

  /**
   * Get current locale
   */
  getLocale(): SupportedLocale;

  /**
   * Set current locale
   *
   * @param locale - Locale to set
   */
  setLocale(locale: SupportedLocale): void;

  /**
   * Get all available locales
   */
  getAvailableLocales(): SupportedLocale[];

  /**
   * Get locale configuration
   *
   * @param locale - Optional locale (defaults to current)
   */
  getLocaleConfig(locale?: SupportedLocale): LocaleConfig;

  /**
   * Check if current locale is RTL
   */
  isRTL(): boolean;

  /**
   * Listen for locale changes
   *
   * @param handler - Handler called when locale changes
   * @returns Unsubscribe function
   */
  onLocaleChange(handler: (locale: SupportedLocale) => void): () => void;

  /**
   * Load translations for a locale
   *
   * @param locale - Locale to load
   * @param translations - Translation dictionary
   */
  loadTranslations(locale: SupportedLocale, translations: TranslationDictionary): void;

  /**
   * Load translations from a URL
   *
   * @param locale - Locale to load
   * @param url - URL to load from
   */
  loadTranslationsFromUrl(locale: SupportedLocale, url: string): Promise<void>;

  /**
   * Get all translations for current locale
   */
  getTranslations(): TranslationDictionary;

  /**
   * Format a number according to locale
   *
   * @param value - Number to format
   * @param options - Intl.NumberFormat options
   */
  formatNumber(value: number, options?: Intl.NumberFormatOptions): string;

  /**
   * Format a date according to locale
   *
   * @param date - Date to format
   * @param options - Intl.DateTimeFormat options
   */
  formatDate(date: Date, options?: Intl.DateTimeFormatOptions): string;

  /**
   * Format relative time
   *
   * @param value - Value
   * @param unit - Time unit
   */
  formatRelativeTime(value: number, unit: Intl.RelativeTimeFormatUnit): string;

  /**
   * Get plural form for a count
   *
   * @param count - Count value
   * @returns Plural category
   */
  getPluralForm(count: number): Intl.LDMLPluralRule;

  /**
   * Create a scoped translator
   *
   * @param prefix - Key prefix
   * @returns Scoped translation function
   *
   * @example
   * ```typescript
   * const ts = context.i18n.scope('settings.panel');
   * ts('title'); // Translates 'settings.panel.title'
   * ts('description'); // Translates 'settings.panel.description'
   * ```
   */
  scope(prefix: string): (key: string, options?: TranslationOptions) => string;
}

/**
 * Create typed translations helper
 */
export function createTypedTranslations<T extends Record<string, TranslationValue>>(
  config: TypedTranslationsConfig<T>
): {
  t: <K extends keyof T>(key: K, params?: TranslationParams) => string;
  locale: SupportedLocale;
  setLocale: (locale: SupportedLocale) => void;
} {
  let currentLocale = config.defaultLocale;

  const interpolate = (template: string, params?: TranslationParams): string => {
    if (!params) return template;
    return template.replace(/\{(\w+)\}/g, (_, key) => String(params[key] ?? `{${key}}`));
  };

  const t = <K extends keyof T>(key: K, params?: TranslationParams): string => {
    const translations = config.translations[currentLocale] || config.translations[config.fallbackLocale || config.defaultLocale];
    const value = translations[key as string];

    if (!value) {
      return String(key);
    }

    if (typeof value === 'string') {
      return interpolate(value, params);
    }

    // Handle plural forms
    const count = params?.count ?? 0;
    const pluralRules = new Intl.PluralRules(currentLocale);
    const pluralForm = pluralRules.select(count as number);
    const template = (value as PluralForms)[pluralForm] || (value as PluralForms).other;

    return interpolate(template, params);
  };

  return {
    t,
    get locale() {
      return currentLocale;
    },
    setLocale: (locale: SupportedLocale) => {
      currentLocale = locale;
    },
  };
}
