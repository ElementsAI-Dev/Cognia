/**
 * Locale Auto-Detection
 * Integrates geolocation with i18n for automatic locale detection
 */

import { localeDetector } from '@/lib/geolocation/locale-detector';
import { locales, type Locale } from './config';

export interface AutoDetectResult {
  locale: Locale;
  confidence: 'high' | 'medium' | 'low';
  source: 'geolocation' | 'browser' | 'system' | 'default';
  country?: string;
  timezone?: string;
}

const LOCALE_MAPPING: Record<string, Locale> = {
  'zh-CN': 'zh-CN',
  'zh-Hans': 'zh-CN',
  'zh-Hans-CN': 'zh-CN',
  'zh': 'zh-CN',
  'en-US': 'en',
  'en-GB': 'en',
  'en-AU': 'en',
  'en-CA': 'en',
  'en-NZ': 'en',
  'en-IE': 'en',
  'en-ZA': 'en',
  'en-SG': 'en',
  'en': 'en',
};

function mapToSupportedLocale(detectedLocale: string): Locale {
  const normalized = detectedLocale.replace('_', '-');
  
  if (LOCALE_MAPPING[normalized]) {
    return LOCALE_MAPPING[normalized];
  }
  
  const langCode = normalized.split('-')[0];
  if (LOCALE_MAPPING[langCode]) {
    return LOCALE_MAPPING[langCode];
  }
  
  if (locales.includes(normalized as Locale)) {
    return normalized as Locale;
  }
  
  return 'en';
}

export async function autoDetectLocale(): Promise<AutoDetectResult> {
  try {
    const localeInfo = await localeDetector.detectLocale();
    
    const mappedLocale = mapToSupportedLocale(localeInfo.detectedLocale);
    
    return {
      locale: mappedLocale,
      confidence: localeInfo.confidence,
      source: localeInfo.source,
      country: localeInfo.country?.name,
      timezone: localeInfo.country?.timezone,
    };
  } catch (error) {
    console.warn('Failed to auto-detect locale:', error);
    
    const browserLocale = typeof navigator !== 'undefined' 
      ? navigator.language 
      : 'en';
    
    return {
      locale: mapToSupportedLocale(browserLocale),
      confidence: 'low',
      source: 'default',
    };
  }
}

export function getBrowserLocale(): Locale {
  if (typeof navigator === 'undefined') {
    return 'en';
  }
  
  const browserLocale = navigator.language;
  return mapToSupportedLocale(browserLocale);
}

export function getSystemTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return 'UTC';
  }
}

export async function initializeLocale(
  currentLocale: Locale | null,
  onLocaleDetected?: (result: AutoDetectResult) => void
): Promise<Locale> {
  if (currentLocale) {
    return currentLocale;
  }
  
  const result = await autoDetectLocale();
  
  if (onLocaleDetected) {
    onLocaleDetected(result);
  }
  
  return result.locale;
}
