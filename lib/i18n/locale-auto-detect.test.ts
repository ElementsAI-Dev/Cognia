/**
 * Locale Auto-Detect Tests
 */

import {
  autoDetectLocale,
  getBrowserLocale,
  getSystemTimezone,
  initializeLocale,
} from './locale-auto-detect';
import { localeDetector } from '@/lib/geolocation/locale-detector';

// Mock the locale detector
jest.mock('@/lib/geolocation/locale-detector', () => ({
  localeDetector: {
    detectLocale: jest.fn(),
  },
}));

describe('locale-auto-detect', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('autoDetectLocale', () => {
    it('should return detected locale from geolocation', async () => {
      (localeDetector.detectLocale as jest.Mock).mockResolvedValue({
        detectedLocale: 'zh-CN',
        confidence: 'high',
        source: 'geolocation',
        country: {
          code: 'CN',
          name: 'China',
          timezone: 'Asia/Shanghai',
        },
      });

      const result = await autoDetectLocale();

      expect(result.locale).toBe('zh-CN');
      expect(result.confidence).toBe('high');
      expect(result.source).toBe('geolocation');
      expect(result.country).toBe('China');
      expect(result.timezone).toBe('Asia/Shanghai');
    });

    it('should map unsupported locales to supported ones', async () => {
      (localeDetector.detectLocale as jest.Mock).mockResolvedValue({
        detectedLocale: 'zh-Hans-CN',
        confidence: 'high',
        source: 'geolocation',
        country: null,
      });

      const result = await autoDetectLocale();

      expect(result.locale).toBe('zh-CN');
    });

    it('should map English variants to en', async () => {
      (localeDetector.detectLocale as jest.Mock).mockResolvedValue({
        detectedLocale: 'en-GB',
        confidence: 'medium',
        source: 'browser',
        country: null,
      });

      const result = await autoDetectLocale();

      expect(result.locale).toBe('en');
    });

    it('should default to en for unsupported locales', async () => {
      (localeDetector.detectLocale as jest.Mock).mockResolvedValue({
        detectedLocale: 'fr-FR',
        confidence: 'low',
        source: 'browser',
        country: null,
      });

      const result = await autoDetectLocale();

      expect(result.locale).toBe('en');
    });

    it('should handle detection failure gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      (localeDetector.detectLocale as jest.Mock).mockRejectedValue(
        new Error('Detection failed')
      );

      Object.defineProperty(navigator, 'language', {
        value: 'en-US',
        configurable: true,
      });

      const result = await autoDetectLocale();

      expect(result.locale).toBe('en');
      expect(result.confidence).toBe('low');
      expect(result.source).toBe('default');
      
      consoleSpy.mockRestore();
    });
  });

  describe('getBrowserLocale', () => {
    it('should return mapped browser locale', () => {
      Object.defineProperty(navigator, 'language', {
        value: 'zh-CN',
        configurable: true,
      });

      const result = getBrowserLocale();

      expect(result).toBe('zh-CN');
    });

    it('should map English variants to en', () => {
      Object.defineProperty(navigator, 'language', {
        value: 'en-AU',
        configurable: true,
      });

      const result = getBrowserLocale();

      expect(result).toBe('en');
    });

    it('should return en when navigator is not available', () => {
      const originalNavigator = global.navigator;
      // @ts-expect-error - Testing undefined navigator
      delete global.navigator;

      const result = getBrowserLocale();

      expect(result).toBe('en');

      global.navigator = originalNavigator;
    });
  });

  describe('getSystemTimezone', () => {
    it('should return system timezone', () => {
      const result = getSystemTimezone();

      // Should be a valid timezone string
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should return UTC when Intl is not available', () => {
      const originalIntl = global.Intl;
      // @ts-expect-error - Testing undefined Intl
      delete global.Intl;

      const result = getSystemTimezone();

      expect(result).toBe('UTC');

      global.Intl = originalIntl;
    });
  });

  describe('initializeLocale', () => {
    it('should return current locale if already set', async () => {
      const result = await initializeLocale('zh-CN');

      expect(result).toBe('zh-CN');
      expect(localeDetector.detectLocale).not.toHaveBeenCalled();
    });

    it('should detect locale when current is null', async () => {
      (localeDetector.detectLocale as jest.Mock).mockResolvedValue({
        detectedLocale: 'zh-CN',
        confidence: 'high',
        source: 'geolocation',
        country: null,
      });

      const result = await initializeLocale(null);

      expect(result).toBe('zh-CN');
      expect(localeDetector.detectLocale).toHaveBeenCalled();
    });

    it('should call callback with detection result', async () => {
      const callback = jest.fn();

      (localeDetector.detectLocale as jest.Mock).mockResolvedValue({
        detectedLocale: 'zh-CN',
        confidence: 'high',
        source: 'geolocation',
        country: { name: 'China', timezone: 'Asia/Shanghai' },
      });

      await initializeLocale(null, callback);

      expect(callback).toHaveBeenCalledWith({
        locale: 'zh-CN',
        confidence: 'high',
        source: 'geolocation',
        country: 'China',
        timezone: 'Asia/Shanghai',
      });
    });
  });
});
