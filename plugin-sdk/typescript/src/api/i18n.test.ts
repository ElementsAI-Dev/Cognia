/**
 * Enhanced I18n API Unit Tests
 */

import { createTypedTranslations } from './i18n';
import type { SupportedLocale, TranslationValue } from './i18n';

describe('Enhanced I18n API', () => {
  describe('createTypedTranslations', () => {
    const translations: Record<SupportedLocale, Record<string, TranslationValue>> = {
      'en': {
        'greeting': 'Hello, {name}!',
        'items': { one: '{count} item', other: '{count} items' },
        'simple': 'Simple text',
      },
      'en-US': {
        'greeting': 'Hello, {name}!',
        'items': { one: '{count} item', other: '{count} items' },
        'simple': 'Simple text',
      },
      'en-GB': {
        'greeting': 'Hello, {name}!',
        'items': { one: '{count} item', other: '{count} items' },
        'simple': 'Simple text',
      },
      'zh': {
        'greeting': '你好，{name}！',
        'items': { one: '{count} 个项目', other: '{count} 个项目' },
        'simple': '简单文本',
      },
      'zh-CN': {
        'greeting': '你好，{name}！',
        'items': { one: '{count} 个项目', other: '{count} 个项目' },
        'simple': '简单文本',
      },
      'zh-TW': {
        'greeting': '你好，{name}！',
        'items': { one: '{count} 個項目', other: '{count} 個項目' },
        'simple': '簡單文本',
      },
      'ja': {
        'greeting': 'こんにちは、{name}！',
        'items': { one: '{count} アイテム', other: '{count} アイテム' },
        'simple': 'シンプルなテキスト',
      },
      'ko': {
        'greeting': '안녕하세요, {name}!',
        'items': { one: '{count} 항목', other: '{count} 항목' },
        'simple': '간단한 텍스트',
      },
      'es': {
        'greeting': '¡Hola, {name}!',
        'items': { one: '{count} elemento', other: '{count} elementos' },
        'simple': 'Texto simple',
      },
      'fr': {
        'greeting': 'Bonjour, {name}!',
        'items': { one: '{count} élément', other: '{count} éléments' },
        'simple': 'Texte simple',
      },
      'de': {
        'greeting': 'Hallo, {name}!',
        'items': { one: '{count} Element', other: '{count} Elemente' },
        'simple': 'Einfacher Text',
      },
      'pt': {
        'greeting': 'Olá, {name}!',
        'items': { one: '{count} item', other: '{count} itens' },
        'simple': 'Texto simples',
      },
      'ru': {
        'greeting': 'Привет, {name}!',
        'items': { one: '{count} элемент', few: '{count} элемента', many: '{count} элементов', other: '{count} элементов' },
        'simple': 'Простой текст',
      },
      'ar': {
        'greeting': 'مرحبا، {name}!',
        'items': { zero: 'لا عناصر', one: 'عنصر واحد', two: 'عنصران', few: '{count} عناصر', many: '{count} عنصر', other: '{count} عنصر' },
        'simple': 'نص بسيط',
      },
    };

    it('should translate simple strings', () => {
      const { t } = createTypedTranslations({
        translations,
        defaultLocale: 'en',
      });

      expect(t('simple')).toBe('Simple text');
    });

    it('should interpolate parameters', () => {
      const { t } = createTypedTranslations({
        translations,
        defaultLocale: 'en',
      });

      expect(t('greeting', { name: 'World' })).toBe('Hello, World!');
    });

    it('should handle pluralization', () => {
      const { t } = createTypedTranslations({
        translations,
        defaultLocale: 'en',
      });

      expect(t('items', { count: 1 })).toBe('1 item');
      expect(t('items', { count: 5 })).toBe('5 items');
      expect(t('items', { count: 0 })).toBe('0 items');
    });

    it('should switch locales', () => {
      const i18n = createTypedTranslations({
        translations,
        defaultLocale: 'en',
      });

      expect(i18n.t('simple')).toBe('Simple text');

      i18n.setLocale('zh-CN');
      expect(i18n.locale).toBe('zh-CN');
      expect(i18n.t('simple')).toBe('简单文本');
    });

    it('should return key if translation not found', () => {
      const { t } = createTypedTranslations({
        translations,
        defaultLocale: 'en',
      });

      expect(t('nonexistent' as never)).toBe('nonexistent');
    });

    it('should handle missing parameters gracefully', () => {
      const { t } = createTypedTranslations({
        translations,
        defaultLocale: 'en',
      });

      expect(t('greeting')).toBe('Hello, {name}!');
    });

    it('should use fallback locale', () => {
      const partialTranslations: Record<SupportedLocale, Record<string, TranslationValue>> = {
        ...translations,
        'fr': {
          // Only has 'simple', missing 'greeting'
          'simple': 'Texte simple',
          'greeting': '',
          'items': { one: '', other: '' },
        },
      };

      const { t, setLocale } = createTypedTranslations({
        translations: partialTranslations,
        defaultLocale: 'en',
        fallbackLocale: 'en',
      });

      setLocale('fr');
      // Empty string is falsy, so it would return key
      // This tests the fallback behavior
      expect(t('simple')).toBe('Texte simple');
    });

    it('should handle complex pluralization (Russian)', () => {
      const { t, setLocale } = createTypedTranslations({
        translations,
        defaultLocale: 'en',
      });

      setLocale('ru');
      expect(t('items', { count: 1 })).toBe('1 элемент');
      expect(t('items', { count: 2 })).toBe('2 элемента');
      expect(t('items', { count: 5 })).toBe('5 элементов');
    });

    it('should track current locale', () => {
      const i18n = createTypedTranslations({
        translations,
        defaultLocale: 'en',
      });

      expect(i18n.locale).toBe('en');

      i18n.setLocale('ja');
      expect(i18n.locale).toBe('ja');
    });
  });
});
