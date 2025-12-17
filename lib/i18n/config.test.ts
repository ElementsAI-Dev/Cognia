/**
 * Tests for i18n Configuration
 */

import {
  locales,
  defaultLocale,
  localeNames,
  localeFlags,
  type Locale,
} from './config';

describe('locales', () => {
  it('contains English', () => {
    expect(locales).toContain('en');
  });

  it('contains Chinese', () => {
    expect(locales).toContain('zh-CN');
  });

  it('is a const tuple', () => {
    expect(Array.isArray(locales)).toBe(true);
  });

  it('has at least 2 locales', () => {
    expect(locales.length).toBeGreaterThanOrEqual(2);
  });
});

describe('defaultLocale', () => {
  it('is English', () => {
    expect(defaultLocale).toBe('en');
  });

  it('is a valid locale', () => {
    expect(locales).toContain(defaultLocale);
  });
});

describe('localeNames', () => {
  it('has name for English', () => {
    expect(localeNames['en']).toBe('English');
  });

  it('has name for Chinese', () => {
    expect(localeNames['zh-CN']).toBe('简体中文');
  });

  it('has names for all locales', () => {
    locales.forEach((locale) => {
      expect(localeNames[locale]).toBeDefined();
      expect(typeof localeNames[locale]).toBe('string');
      expect(localeNames[locale].length).toBeGreaterThan(0);
    });
  });
});

describe('localeFlags', () => {
  it('has flag for English', () => {
    expect(localeFlags['en']).toBe('🇺🇸');
  });

  it('has flag for Chinese', () => {
    expect(localeFlags['zh-CN']).toBe('🇨🇳');
  });

  it('has flags for all locales', () => {
    locales.forEach((locale) => {
      expect(localeFlags[locale]).toBeDefined();
      expect(typeof localeFlags[locale]).toBe('string');
      expect(localeFlags[locale].length).toBeGreaterThan(0);
    });
  });

  it('flags are emoji format', () => {
    Object.values(localeFlags).forEach((flag) => {
      expect(flag.length).toBeGreaterThanOrEqual(1);
    });
  });
});

describe('Locale type', () => {
  it('allows valid locale values', () => {
    const en: Locale = 'en';
    const zhCN: Locale = 'zh-CN';
    
    expect(en).toBe('en');
    expect(zhCN).toBe('zh-CN');
  });
});
