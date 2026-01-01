/**
 * Locale Detector Tests
 */

import { LocaleDetector, localeDetector } from './locale-detector';
import { geolocationService } from './geolocation';

// Mock the geolocation service
jest.mock('./geolocation', () => ({
  geolocationService: {
    isSupported: jest.fn(),
    checkPermissions: jest.fn(),
    getCurrentPosition: jest.fn(),
  },
}));

// Mock fetch for reverse geocoding
global.fetch = jest.fn();

describe('LocaleDetector', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localeDetector.clearCache();
    
    // Default mock implementations
    (geolocationService.isSupported as jest.Mock).mockReturnValue(true);
    (geolocationService.checkPermissions as jest.Mock).mockResolvedValue({
      location: 'granted',
      coarseLocation: 'granted',
    });
  });

  describe('getInstance', () => {
    it('should return a singleton instance', () => {
      const instance1 = LocaleDetector.getInstance();
      const instance2 = LocaleDetector.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('getBrowserLocale', () => {
    it('should return navigator.language', () => {
      Object.defineProperty(navigator, 'language', {
        value: 'zh-CN',
        configurable: true,
      });
      Object.defineProperty(navigator, 'languages', {
        value: ['zh-CN', 'en'],
        configurable: true,
      });

      expect(localeDetector.getBrowserLocale()).toBe('zh-CN');
    });

    it('should return "en" when navigator is not available', () => {
      const originalNavigator = global.navigator;
      // @ts-expect-error - Testing undefined navigator
      delete global.navigator;
      
      expect(localeDetector.getBrowserLocale()).toBe('en');
      
      global.navigator = originalNavigator;
    });
  });

  describe('getCountryByCode', () => {
    it('should return country info for valid code', () => {
      const china = localeDetector.getCountryByCode('CN');
      
      expect(china).toEqual({
        code: 'CN',
        name: 'China',
        locale: 'zh-CN',
        timezone: 'Asia/Shanghai',
        currency: 'CNY',
        languages: ['zh-CN', 'zh'],
      });
    });

    it('should return null for invalid code', () => {
      const invalid = localeDetector.getCountryByCode('XX');
      expect(invalid).toBeNull();
    });

    it('should be case insensitive', () => {
      const us = localeDetector.getCountryByCode('us');
      expect(us?.code).toBe('US');
    });
  });

  describe('getAllCountries', () => {
    it('should return an array of all countries', () => {
      const countries = localeDetector.getAllCountries();
      
      expect(Array.isArray(countries)).toBe(true);
      expect(countries.length).toBeGreaterThan(0);
      expect(countries.some(c => c.code === 'CN')).toBe(true);
      expect(countries.some(c => c.code === 'US')).toBe(true);
    });
  });

  describe('detectLocale', () => {
    it('should detect locale from geolocation when available', async () => {
      (geolocationService.getCurrentPosition as jest.Mock).mockResolvedValue({
        coords: {
          latitude: 39.9042,
          longitude: 116.4074,
          accuracy: 10,
        },
        timestamp: Date.now(),
      });

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          address: {
            country_code: 'cn',
            country: 'China',
          },
        }),
      });

      const result = await localeDetector.detectLocale(true);

      expect(result.detectedLocale).toBe('zh-CN');
      expect(result.confidence).toBe('high');
      expect(result.source).toBe('geolocation');
      expect(result.country?.code).toBe('CN');
    });

    it('should fall back to browser locale when geolocation fails', async () => {
      (geolocationService.checkPermissions as jest.Mock).mockResolvedValue({
        location: 'denied',
        coarseLocation: 'denied',
      });

      Object.defineProperty(navigator, 'language', {
        value: 'en-US',
        configurable: true,
      });
      Object.defineProperty(navigator, 'languages', {
        value: ['en-US'],
        configurable: true,
      });

      const result = await localeDetector.detectLocale(true);

      expect(result.source).toBe('browser');
      expect(result.browserLocale).toBe('en-US');
    });

    it('should use cached result when not forcing refresh', async () => {
      // First call - populate cache
      (geolocationService.getCurrentPosition as jest.Mock).mockResolvedValue({
        coords: { latitude: 35.6762, longitude: 139.6503, accuracy: 10 },
        timestamp: Date.now(),
      });

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          address: { country_code: 'jp' },
        }),
      });

      await localeDetector.detectLocale(true);

      // Second call - should use cache
      (geolocationService.getCurrentPosition as jest.Mock).mockClear();

      const result = await localeDetector.detectLocale(false);

      expect(geolocationService.getCurrentPosition).not.toHaveBeenCalled();
      expect(result.country?.code).toBe('JP');
    });

    it('should estimate country from coordinates when reverse geocoding fails', async () => {
      (geolocationService.getCurrentPosition as jest.Mock).mockResolvedValue({
        coords: {
          latitude: 39.9042, // Beijing coordinates
          longitude: 116.4074,
          accuracy: 10,
        },
        timestamp: Date.now(),
      });

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
      });

      const result = await localeDetector.detectLocale(true);

      // Should estimate China from coordinates
      expect(result.country?.code).toBe('CN');
    });

    it('should return browser locale with low confidence when all methods fail', async () => {
      (geolocationService.isSupported as jest.Mock).mockReturnValue(false);

      Object.defineProperty(navigator, 'language', {
        value: 'fr-FR',
        configurable: true,
      });
      Object.defineProperty(navigator, 'languages', {
        value: ['fr-FR'],
        configurable: true,
      });

      const result = await localeDetector.detectLocale(true);

      expect(result.browserLocale).toBe('fr-FR');
      expect(result.source).toBe('browser');
    });
  });

  describe('clearCache', () => {
    it('should clear the cached locale info', async () => {
      // Populate cache
      (geolocationService.getCurrentPosition as jest.Mock).mockResolvedValue({
        coords: { latitude: 40.7128, longitude: -74.006, accuracy: 10 },
        timestamp: Date.now(),
      });

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          address: { country_code: 'us' },
        }),
      });

      await localeDetector.detectLocale(true);
      
      // Clear cache
      localeDetector.clearCache();

      // Next call should fetch again
      await localeDetector.detectLocale(false);

      expect(geolocationService.getCurrentPosition).toHaveBeenCalledTimes(2);
    });
  });
});
