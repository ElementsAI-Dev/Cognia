/**
 * Tests for Translation utilities
 */

import {
  SUPPORTED_LANGUAGES,
  getLanguageName,
  getNativeLanguageName,
  type LanguageCode,
} from './translate';

describe('SUPPORTED_LANGUAGES', () => {
  it('contains English', () => {
    const english = SUPPORTED_LANGUAGES.find((l) => l.code === 'en');
    expect(english).toBeDefined();
    expect(english?.name).toBe('English');
  });

  it('contains Chinese', () => {
    const chinese = SUPPORTED_LANGUAGES.find((l) => l.code === 'zh');
    expect(chinese).toBeDefined();
    expect(chinese?.name).toBe('Chinese');
  });

  it('contains Traditional Chinese', () => {
    const traditionalChinese = SUPPORTED_LANGUAGES.find((l) => l.code === 'zh-TW');
    expect(traditionalChinese).toBeDefined();
    expect(traditionalChinese?.name).toBe('Traditional Chinese');
  });

  it('contains Japanese', () => {
    const japanese = SUPPORTED_LANGUAGES.find((l) => l.code === 'ja');
    expect(japanese).toBeDefined();
    expect(japanese?.name).toBe('Japanese');
    expect(japanese?.nativeName).toBe('日本語');
  });

  it('contains Korean', () => {
    const korean = SUPPORTED_LANGUAGES.find((l) => l.code === 'ko');
    expect(korean).toBeDefined();
    expect(korean?.name).toBe('Korean');
    expect(korean?.nativeName).toBe('한국어');
  });

  it('contains Spanish', () => {
    const spanish = SUPPORTED_LANGUAGES.find((l) => l.code === 'es');
    expect(spanish).toBeDefined();
    expect(spanish?.name).toBe('Spanish');
    expect(spanish?.nativeName).toBe('Español');
  });

  it('contains French', () => {
    const french = SUPPORTED_LANGUAGES.find((l) => l.code === 'fr');
    expect(french).toBeDefined();
    expect(french?.name).toBe('French');
    expect(french?.nativeName).toBe('Français');
  });

  it('contains German', () => {
    const german = SUPPORTED_LANGUAGES.find((l) => l.code === 'de');
    expect(german).toBeDefined();
    expect(german?.name).toBe('German');
    expect(german?.nativeName).toBe('Deutsch');
  });

  it('contains all expected languages', () => {
    expect(SUPPORTED_LANGUAGES.length).toBeGreaterThanOrEqual(15);
  });

  it('each language has code, name, and nativeName', () => {
    SUPPORTED_LANGUAGES.forEach((lang) => {
      expect(lang.code).toBeDefined();
      expect(lang.name).toBeDefined();
      expect(lang.nativeName).toBeDefined();
      expect(lang.code.length).toBeGreaterThan(0);
      expect(lang.name.length).toBeGreaterThan(0);
      expect(lang.nativeName.length).toBeGreaterThan(0);
    });
  });

  it('has unique codes', () => {
    const codes = SUPPORTED_LANGUAGES.map((l) => l.code);
    const uniqueCodes = new Set(codes);
    expect(uniqueCodes.size).toBe(codes.length);
  });
});

describe('getLanguageName', () => {
  it('returns correct name for English', () => {
    expect(getLanguageName('en')).toBe('English');
  });

  it('returns correct name for Chinese', () => {
    expect(getLanguageName('zh')).toBe('Chinese');
  });

  it('returns correct name for Japanese', () => {
    expect(getLanguageName('ja')).toBe('Japanese');
  });

  it('returns correct name for Korean', () => {
    expect(getLanguageName('ko')).toBe('Korean');
  });

  it('returns correct name for Spanish', () => {
    expect(getLanguageName('es')).toBe('Spanish');
  });

  it('returns correct name for French', () => {
    expect(getLanguageName('fr')).toBe('French');
  });

  it('returns correct name for German', () => {
    expect(getLanguageName('de')).toBe('German');
  });

  it('returns correct name for Traditional Chinese', () => {
    expect(getLanguageName('zh-TW')).toBe('Traditional Chinese');
  });

  it('returns code for unknown language', () => {
    expect(getLanguageName('xx' as LanguageCode)).toBe('xx');
  });
});

describe('getNativeLanguageName', () => {
  it('returns correct native name for English', () => {
    expect(getNativeLanguageName('en')).toBe('English');
  });

  it('returns correct native name for Chinese', () => {
    expect(getNativeLanguageName('zh')).toBe('中文');
  });

  it('returns correct native name for Japanese', () => {
    expect(getNativeLanguageName('ja')).toBe('日本語');
  });

  it('returns correct native name for Korean', () => {
    expect(getNativeLanguageName('ko')).toBe('한국어');
  });

  it('returns correct native name for Spanish', () => {
    expect(getNativeLanguageName('es')).toBe('Español');
  });

  it('returns correct native name for French', () => {
    expect(getNativeLanguageName('fr')).toBe('Français');
  });

  it('returns correct native name for German', () => {
    expect(getNativeLanguageName('de')).toBe('Deutsch');
  });

  it('returns correct native name for Russian', () => {
    expect(getNativeLanguageName('ru')).toBe('Русский');
  });

  it('returns correct native name for Arabic', () => {
    expect(getNativeLanguageName('ar')).toBe('العربية');
  });

  it('returns correct native name for Hindi', () => {
    expect(getNativeLanguageName('hi')).toBe('हिन्दी');
  });

  it('returns code for unknown language', () => {
    expect(getNativeLanguageName('xx' as LanguageCode)).toBe('xx');
  });
});
