/**
 * useGeocoding Hook
 * React hook for address search and reverse geocoding
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import type {
  AddressDetail,
  GeocodingResult,
  MapPosition,
  UseGeocodingOptions,
  UseGeocodingReturn,
} from '@/types/map';
import { geocodingService } from '@/lib/geolocation/geocoding';

export function useGeocoding(
  options: UseGeocodingOptions = {}
): UseGeocodingReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isMounted = useRef(true);
  const optionsRef = useRef(options);

  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      geocodingService.cancelPendingRequest();
    };
  }, []);

  const searchAddress = useCallback(
    async (query: string): Promise<GeocodingResult[]> => {
      if (!query.trim()) {
        return [];
      }

      if (isMounted.current) {
        setLoading(true);
        setError(null);
      }

      try {
        const results = await geocodingService.searchAddress(
          query,
          optionsRef.current
        );
        return results;
      } catch (err) {
        if (isMounted.current) {
          const message =
            err instanceof Error ? err.message : 'Address search failed';
          setError(message);
        }
        return [];
      } finally {
        if (isMounted.current) {
          setLoading(false);
        }
      }
    },
    []
  );

  const reverseGeocode = useCallback(
    async (position: MapPosition): Promise<AddressDetail | null> => {
      if (isMounted.current) {
        setLoading(true);
        setError(null);
      }

      try {
        const result = await geocodingService.reverseGeocode(
          position,
          optionsRef.current
        );
        return result;
      } catch (err) {
        if (isMounted.current) {
          const message =
            err instanceof Error ? err.message : 'Reverse geocoding failed';
          setError(message);
        }
        return null;
      } finally {
        if (isMounted.current) {
          setLoading(false);
        }
      }
    },
    []
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    loading,
    error,
    searchAddress,
    reverseGeocode,
    clearError,
  };
}

export default useGeocoding;
