/**
 * Geocoding Service Tests
 */

import { geocodingService, GeocodingService } from './geocoding';

const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('GeocodingService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getInstance', () => {
    it('returns singleton instance', () => {
      const instance1 = GeocodingService.getInstance();
      const instance2 = GeocodingService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('searchAddress', () => {
    it('returns empty array for empty query', async () => {
      const results = await geocodingService.searchAddress('');
      expect(results).toEqual([]);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('returns empty array for whitespace-only query', async () => {
      const results = await geocodingService.searchAddress('   ');
      expect(results).toEqual([]);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('searches address and returns results', async () => {
      const mockResults = [
        {
          place_id: 12345,
          lat: '39.9042',
          lon: '116.4074',
          display_name: 'Beijing, China',
          type: 'city',
          importance: 0.9,
          address: {
            city: 'Beijing',
            country: 'China',
            country_code: 'cn',
          },
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResults),
      });

      const results = await geocodingService.searchAddress('Beijing');

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(results).toHaveLength(1);
      expect(results[0].position.latitude).toBe(39.9042);
      expect(results[0].position.longitude).toBe(116.4074);
      expect(results[0].displayName).toBe('Beijing, China');
      expect(results[0].address.city).toBe('Beijing');
      expect(results[0].address.countryCode).toBe('CN');
    });

    it('handles search with options', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      });

      await geocodingService.searchAddress('Test', {
        language: 'zh',
        countryCode: 'CN',
        limit: 10,
      });

      const callUrl = mockFetch.mock.calls[0][0];
      expect(callUrl).toContain('accept-language=zh');
      expect(callUrl).toContain('countrycodes=CN');
      expect(callUrl).toContain('limit=10');
    });

    it('throws error on failed request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      await expect(geocodingService.searchAddress('Test')).rejects.toThrow(
        'Geocoding request failed: 500'
      );
    });

    it('returns empty array on abort', async () => {
      const abortError = new Error('Aborted');
      abortError.name = 'AbortError';
      mockFetch.mockRejectedValueOnce(abortError);

      const results = await geocodingService.searchAddress('Test');
      expect(results).toEqual([]);
    });
  });

  describe('reverseGeocode', () => {
    it('returns address detail for valid position', async () => {
      const mockResult = {
        place_id: 12345,
        display_name: 'Tiananmen Square, Beijing, China',
        address: {
          road: 'Chang An Avenue',
          city: 'Beijing',
          country: 'China',
          country_code: 'cn',
          postcode: '100000',
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResult),
      });

      const result = await geocodingService.reverseGeocode({
        latitude: 39.9042,
        longitude: 116.4074,
      });

      expect(result).not.toBeNull();
      expect(result?.formattedAddress).toBe('Tiananmen Square, Beijing, China');
      expect(result?.street).toBe('Chang An Avenue');
      expect(result?.city).toBe('Beijing');
      expect(result?.countryCode).toBe('CN');
    });

    it('returns null for 404 response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      const result = await geocodingService.reverseGeocode({
        latitude: 0,
        longitude: 0,
      });

      expect(result).toBeNull();
    });

    it('returns null when address is missing', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ place_id: 12345 }),
      });

      const result = await geocodingService.reverseGeocode({
        latitude: 39.9042,
        longitude: 116.4074,
      });

      expect(result).toBeNull();
    });

    it('throws error on non-404 failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      await expect(
        geocodingService.reverseGeocode({ latitude: 39.9042, longitude: 116.4074 })
      ).rejects.toThrow('Reverse geocoding failed: 500');
    });

    it('returns null on abort', async () => {
      const abortError = new Error('Aborted');
      abortError.name = 'AbortError';
      mockFetch.mockRejectedValueOnce(abortError);

      const result = await geocodingService.reverseGeocode({
        latitude: 39.9042,
        longitude: 116.4074,
      });

      expect(result).toBeNull();
    });
  });

  describe('cancelPendingRequest', () => {
    it('cancels pending request', async () => {
      const abortError = new Error('Aborted');
      abortError.name = 'AbortError';
      mockFetch.mockRejectedValueOnce(abortError);

      const results = await geocodingService.searchAddress('Test');
      expect(results).toEqual([]);
    });

    it('can be called safely when no request pending', () => {
      expect(() => geocodingService.cancelPendingRequest()).not.toThrow();
    });
  });
});
