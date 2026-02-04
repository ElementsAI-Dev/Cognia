/**
 * useGeocoding Hook Tests
 */

import { renderHook, act } from '@testing-library/react';
import { useGeocoding } from './use-geocoding';

const mockSearchAddress = jest.fn();
const mockReverseGeocode = jest.fn();
const mockCancelPendingRequest = jest.fn();

jest.mock('@/lib/geolocation/geocoding', () => ({
  geocodingService: {
    searchAddress: (...args: unknown[]) => mockSearchAddress(...args),
    reverseGeocode: (...args: unknown[]) => mockReverseGeocode(...args),
    cancelPendingRequest: () => mockCancelPendingRequest(),
  },
}));

describe('useGeocoding', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('searchAddress', () => {
    it('returns empty array for empty query', async () => {
      const { result } = renderHook(() => useGeocoding());

      let results;
      await act(async () => {
        results = await result.current.searchAddress('');
      });

      expect(results).toEqual([]);
      expect(mockSearchAddress).not.toHaveBeenCalled();
    });

    it('searches address and returns results', async () => {
      const mockResults = [
        {
          position: { latitude: 39.9042, longitude: 116.4074 },
          address: {
            formattedAddress: 'Beijing, China',
            city: 'Beijing',
            country: 'China',
          },
          displayName: 'Beijing, China',
        },
      ];

      mockSearchAddress.mockResolvedValue(mockResults);

      const { result } = renderHook(() => useGeocoding());

      let results;
      await act(async () => {
        results = await result.current.searchAddress('Beijing');
      });

      expect(mockSearchAddress).toHaveBeenCalledWith('Beijing', {});
      expect(results).toEqual(mockResults);
    });

    it('handles search error', async () => {
      mockSearchAddress.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useGeocoding());

      await act(async () => {
        await result.current.searchAddress('Test');
      });

      expect(result.current.error).toBe('Network error');
    });

    it('passes options to geocoding service', async () => {
      mockSearchAddress.mockResolvedValue([]);

      const { result } = renderHook(() =>
        useGeocoding({ language: 'zh', countryCode: 'CN', limit: 10 })
      );

      await act(async () => {
        await result.current.searchAddress('Test');
      });

      expect(mockSearchAddress).toHaveBeenCalledWith('Test', {
        language: 'zh',
        countryCode: 'CN',
        limit: 10,
      });
    });
  });

  describe('reverseGeocode', () => {
    it('returns address detail for valid position', async () => {
      const mockAddress = {
        formattedAddress: 'Tiananmen Square, Beijing, China',
        street: 'Chang An Avenue',
        city: 'Beijing',
        country: 'China',
      };

      mockReverseGeocode.mockResolvedValue(mockAddress);

      const { result } = renderHook(() => useGeocoding());

      let address;
      await act(async () => {
        address = await result.current.reverseGeocode({
          latitude: 39.9042,
          longitude: 116.4074,
        });
      });

      expect(address).toEqual(mockAddress);
    });

    it('handles reverse geocode error', async () => {
      mockReverseGeocode.mockRejectedValue(new Error('Geocoding failed'));

      const { result } = renderHook(() => useGeocoding());

      await act(async () => {
        await result.current.reverseGeocode({
          latitude: 39.9042,
          longitude: 116.4074,
        });
      });

      expect(result.current.error).toBe('Geocoding failed');
    });
  });

  describe('clearError', () => {
    it('clears error state', async () => {
      mockSearchAddress.mockRejectedValue(new Error('Test error'));

      const { result } = renderHook(() => useGeocoding());

      await act(async () => {
        await result.current.searchAddress('Test');
      });

      expect(result.current.error).toBe('Test error');

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('cleanup', () => {
    it('cancels pending request on unmount', () => {
      const { unmount } = renderHook(() => useGeocoding());

      unmount();

      expect(mockCancelPendingRequest).toHaveBeenCalled();
    });
  });
});
