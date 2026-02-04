/**
 * useMapLocation Hook
 * Integrates geolocation service with map visualization
 */

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import type {
  MapPosition,
  UseMapLocationOptions,
  UseMapLocationReturn,
} from '@/types/map';
import { useGeolocation } from '@/hooks/network/use-geolocation';

const DEFAULT_OPTIONS: UseMapLocationOptions = {
  enableHighAccuracy: false,
  watchPosition: false,
  autoCenter: true,
};

export function useMapLocation(
  options: UseMapLocationOptions = {}
): UseMapLocationReturn {
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };

  const [manualPosition, setManualPosition] = useState<MapPosition | null>(null);
  const [manualAccuracy, setManualAccuracy] = useState<number | null>(null);
  const [manualError, setManualError] = useState<string | null>(null);
  const isMounted = useRef(true);

  const {
    position: geoPosition,
    error: geoError,
    loading,
    getCurrentPosition,
  } = useGeolocation({
    enableHighAccuracy: mergedOptions.enableHighAccuracy,
    watch: mergedOptions.watchPosition,
    immediate: false,
  });

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const position = useMemo<MapPosition | null>(() => {
    if (manualPosition) {
      return manualPosition;
    }
    if (geoPosition) {
      return {
        latitude: geoPosition.coords.latitude,
        longitude: geoPosition.coords.longitude,
      };
    }
    return null;
  }, [manualPosition, geoPosition]);

  const accuracy = useMemo<number | null>(() => {
    if (manualAccuracy !== null) {
      return manualAccuracy;
    }
    return geoPosition?.coords.accuracy ?? null;
  }, [manualAccuracy, geoPosition]);

  const error = useMemo<string | null>(() => {
    if (manualError) {
      return manualError;
    }
    return geoError?.message ?? null;
  }, [manualError, geoError]);

  const locate = useCallback(async (): Promise<MapPosition | null> => {
    setManualError(null);

    try {
      const result = await getCurrentPosition();

      if (result && isMounted.current) {
        const newPosition: MapPosition = {
          latitude: result.coords.latitude,
          longitude: result.coords.longitude,
        };
        setManualPosition(newPosition);
        setManualAccuracy(result.coords.accuracy);
        return newPosition;
      }
      return null;
    } catch (err) {
      if (isMounted.current) {
        const message = err instanceof Error ? err.message : 'Location unavailable';
        setManualError(message);
      }
      return null;
    }
  }, [getCurrentPosition]);

  const clearError = useCallback(() => {
    setManualError(null);
  }, []);

  return {
    position,
    accuracy,
    loading,
    error,
    locate,
    clearError,
  };
}

export default useMapLocation;
