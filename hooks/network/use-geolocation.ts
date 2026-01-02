/**
 * useGeolocation Hook
 * React hook for accessing geolocation with unified Web/Tauri support
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  GeolocationPosition,
  GeolocationError,
  GeolocationErrorCode,
  GeolocationOptions,
  GeolocationPermissionStatus,
  LocaleInfo,
} from '@/types/geolocation';
import { geolocationService } from '@/lib/geolocation/geolocation';
import { localeDetector } from '@/lib/geolocation/locale-detector';

export interface UseGeolocationState {
  position: GeolocationPosition | null;
  error: GeolocationError | null;
  loading: boolean;
  permissionStatus: GeolocationPermissionStatus | null;
  isSupported: boolean;
}

export interface UseGeolocationOptions extends GeolocationOptions {
  watch?: boolean;
  immediate?: boolean;
}

export interface UseGeolocationReturn extends UseGeolocationState {
  getCurrentPosition: () => Promise<GeolocationPosition | null>;
  requestPermission: () => Promise<GeolocationPermissionStatus>;
  clearWatch: () => Promise<void>;
  refresh: () => Promise<void>;
}

const DEFAULT_OPTIONS: UseGeolocationOptions = {
  enableHighAccuracy: false,
  timeout: 10000,
  maximumAge: 300000,
  watch: false,
  immediate: false,
};

export function useGeolocation(
  options: UseGeolocationOptions = {}
): UseGeolocationReturn {
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };
  const [state, setState] = useState<UseGeolocationState>(() => ({
    position: null,
    error: null,
    loading: false,
    permissionStatus: null,
    isSupported: typeof window !== 'undefined' && geolocationService.isSupported(),
  }));

  const isMounted = useRef(true);
  const isWatching = useRef(false);
  const initializedRef = useRef(false);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const updateState = useCallback((updates: Partial<UseGeolocationState>) => {
    if (isMounted.current) {
      setState((prev) => ({ ...prev, ...updates }));
    }
  }, []);

  const checkPermissions = useCallback(async () => {
    try {
      const status = await geolocationService.checkPermissions();
      updateState({ permissionStatus: status });
      return status;
    } catch {
      return null;
    }
  }, [updateState]);

  const requestPermission = useCallback(async () => {
    updateState({ loading: true, error: null });
    try {
      const status = await geolocationService.requestPermissions();
      updateState({ permissionStatus: status, loading: false });
      return status;
    } catch (err) {
      const error: GeolocationError = {
        code: GeolocationErrorCode.PERMISSION_DENIED,
        message: err instanceof Error ? err.message : 'Permission request failed',
      };
      updateState({ error, loading: false });
      return { location: 'denied' as const, coarseLocation: 'denied' as const };
    }
  }, [updateState]);

  const getCurrentPosition = useCallback(async () => {
    if (!geolocationService.isSupported()) {
      const error: GeolocationError = {
        code: GeolocationErrorCode.NOT_SUPPORTED,
        message: 'Geolocation is not supported',
      };
      updateState({ error, loading: false });
      return null;
    }

    updateState({ loading: true, error: null });

    try {
      const position = await geolocationService.getCurrentPosition({
        enableHighAccuracy: mergedOptions.enableHighAccuracy,
        timeout: mergedOptions.timeout,
        maximumAge: mergedOptions.maximumAge,
      });
      updateState({ position, loading: false, error: null });
      return position;
    } catch (err) {
      const error = err as GeolocationError;
      updateState({ error, loading: false });
      return null;
    }
  }, [mergedOptions.enableHighAccuracy, mergedOptions.timeout, mergedOptions.maximumAge, updateState]);

  const startWatch = useCallback(async () => {
    if (!geolocationService.isSupported() || isWatching.current) {
      return;
    }

    isWatching.current = true;
    updateState({ loading: true, error: null });

    try {
      await geolocationService.watchPosition(
        (position) => {
          updateState({ position, loading: false, error: null });
        },
        (error) => {
          updateState({ error, loading: false });
        },
        {
          enableHighAccuracy: mergedOptions.enableHighAccuracy,
          timeout: mergedOptions.timeout,
          maximumAge: mergedOptions.maximumAge,
        }
      );
    } catch (err) {
      const error = err as GeolocationError;
      updateState({ error, loading: false });
      isWatching.current = false;
    }
  }, [mergedOptions.enableHighAccuracy, mergedOptions.timeout, mergedOptions.maximumAge, updateState]);

  const clearWatch = useCallback(async () => {
    if (isWatching.current) {
      await geolocationService.clearWatch();
      isWatching.current = false;
    }
  }, []);

  const refresh = useCallback(async () => {
    await checkPermissions();
    if (mergedOptions.watch) {
      await clearWatch();
      await startWatch();
    } else {
      await getCurrentPosition();
    }
  }, [checkPermissions, mergedOptions.watch, clearWatch, startWatch, getCurrentPosition]);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const init = async () => {
      await checkPermissions();
      if (mergedOptions.immediate) {
        if (mergedOptions.watch) {
          await startWatch();
        } else {
          await getCurrentPosition();
        }
      }
    };

    init();

    return () => {
      if (isWatching.current) {
        geolocationService.clearWatch();
        isWatching.current = false;
      }
    };
  }, [checkPermissions, getCurrentPosition, mergedOptions.immediate, mergedOptions.watch, startWatch]);

  return {
    ...state,
    getCurrentPosition,
    requestPermission,
    clearWatch,
    refresh,
  };
}

export interface UseLocaleDetectionState {
  localeInfo: LocaleInfo | null;
  loading: boolean;
  error: Error | null;
}

export interface UseLocaleDetectionReturn extends UseLocaleDetectionState {
  detectLocale: (forceRefresh?: boolean) => Promise<LocaleInfo | null>;
  getBrowserLocale: () => string;
}

export function useLocaleDetection(): UseLocaleDetectionReturn {
  const [state, setState] = useState<UseLocaleDetectionState>({
    localeInfo: null,
    loading: true,
    error: null,
  });

  const isMounted = useRef(true);
  const initializedRef = useRef(false);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const detectLocale = useCallback(async (forceRefresh = false) => {
    if (isMounted.current) {
      setState((prev) => ({ ...prev, loading: true, error: null }));
    }

    try {
      const info = await localeDetector.detectLocale(forceRefresh);
      if (isMounted.current) {
        setState({ localeInfo: info, loading: false, error: null });
      }
      return info;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to detect locale');
      if (isMounted.current) {
        setState((prev) => ({ ...prev, error, loading: false }));
      }
      return null;
    }
  }, []);

  const getBrowserLocale = useCallback(() => {
    return localeDetector.getBrowserLocale();
  }, []);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    // Wrap in IIFE to handle async initialization
    void (async () => {
      await detectLocale();
    })();
  }, [detectLocale]);

  return {
    ...state,
    detectLocale,
    getBrowserLocale,
  };
}

export default useGeolocation;
