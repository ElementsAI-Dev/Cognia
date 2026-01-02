/**
 * Geolocation Service
 * Provides unified geolocation API for Web and Tauri
 */

import {
  GeolocationPosition,
  GeolocationError,
  GeolocationErrorCode,
  GeolocationOptions,
  GeolocationPermissionStatus,
  PermissionState,
} from '@/types/geolocation';

const isTauri = (): boolean => {
  return typeof window !== 'undefined' && '__TAURI__' in window;
};

const DEFAULT_OPTIONS: GeolocationOptions = {
  enableHighAccuracy: false,
  timeout: 10000,
  maximumAge: 300000,
};

export class GeolocationService {
  private static instance: GeolocationService;
  private watchId: number | null = null;
  private tauriWatchId: number | null = null;

  private constructor() {}

  static getInstance(): GeolocationService {
    if (!GeolocationService.instance) {
      GeolocationService.instance = new GeolocationService();
    }
    return GeolocationService.instance;
  }

  async checkPermissions(): Promise<GeolocationPermissionStatus> {
    if (isTauri()) {
      return this.checkTauriPermissions();
    }
    return this.checkWebPermissions();
  }

  private async checkTauriPermissions(): Promise<GeolocationPermissionStatus> {
    try {
      const { checkPermissions } = await import('@tauri-apps/plugin-geolocation');
      const result = await checkPermissions();
      return {
        location: result.location as PermissionState,
        coarseLocation: result.coarseLocation as PermissionState,
      };
    } catch (error) {
      console.warn('Failed to check Tauri geolocation permissions:', error);
      return {
        location: 'prompt',
        coarseLocation: 'prompt',
      };
    }
  }

  private async checkWebPermissions(): Promise<GeolocationPermissionStatus> {
    if (!navigator.permissions) {
      return {
        location: 'prompt',
        coarseLocation: 'prompt',
      };
    }

    try {
      const result = await navigator.permissions.query({ name: 'geolocation' });
      const state = result.state as PermissionState;
      return {
        location: state,
        coarseLocation: state,
      };
    } catch {
      return {
        location: 'prompt',
        coarseLocation: 'prompt',
      };
    }
  }

  async requestPermissions(): Promise<GeolocationPermissionStatus> {
    if (isTauri()) {
      return this.requestTauriPermissions();
    }
    return this.requestWebPermissions();
  }

  private async requestTauriPermissions(): Promise<GeolocationPermissionStatus> {
    try {
      const { requestPermissions } = await import('@tauri-apps/plugin-geolocation');
      const result = await requestPermissions(['location', 'coarseLocation']);
      return {
        location: result.location as PermissionState,
        coarseLocation: result.coarseLocation as PermissionState,
      };
    } catch (error) {
      console.warn('Failed to request Tauri geolocation permissions:', error);
      return {
        location: 'denied',
        coarseLocation: 'denied',
      };
    }
  }

  private async requestWebPermissions(): Promise<GeolocationPermissionStatus> {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve({
          location: 'denied',
          coarseLocation: 'denied',
        });
        return;
      }

      navigator.geolocation.getCurrentPosition(
        () => {
          resolve({
            location: 'granted',
            coarseLocation: 'granted',
          });
        },
        (error) => {
          if (error.code === error.PERMISSION_DENIED) {
            resolve({
              location: 'denied',
              coarseLocation: 'denied',
            });
          } else {
            resolve({
              location: 'prompt',
              coarseLocation: 'prompt',
            });
          }
        },
        { timeout: 5000 }
      );
    });
  }

  async getCurrentPosition(
    options: GeolocationOptions = {}
  ): Promise<GeolocationPosition> {
    const mergedOptions = { ...DEFAULT_OPTIONS, ...options };

    if (isTauri()) {
      return this.getTauriPosition(mergedOptions);
    }
    return this.getWebPosition(mergedOptions);
  }

  private async getTauriPosition(
    options: GeolocationOptions
  ): Promise<GeolocationPosition> {
    try {
      const { getCurrentPosition } = await import('@tauri-apps/plugin-geolocation');
      const position = await getCurrentPosition({
        enableHighAccuracy: options.enableHighAccuracy ?? false,
        timeout: options.timeout ?? 10000,
        maximumAge: options.maximumAge ?? 300000,
      });

      return {
        coords: {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          altitude: position.coords.altitude ?? null,
          altitudeAccuracy: position.coords.altitudeAccuracy ?? null,
          heading: position.coords.heading ?? null,
          speed: position.coords.speed ?? null,
        },
        timestamp: position.timestamp,
      };
    } catch (error) {
      throw this.mapTauriError(error);
    }
  }

  private getWebPosition(
    options: GeolocationOptions
  ): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject({
          code: GeolocationErrorCode.NOT_SUPPORTED,
          message: 'Geolocation is not supported by this browser',
        } as GeolocationError);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            coords: {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
              altitude: position.coords.altitude,
              altitudeAccuracy: position.coords.altitudeAccuracy,
              heading: position.coords.heading,
              speed: position.coords.speed,
            },
            timestamp: position.timestamp,
          });
        },
        (error) => {
          reject(this.mapWebError(error));
        },
        {
          enableHighAccuracy: options.enableHighAccuracy,
          timeout: options.timeout,
          maximumAge: options.maximumAge,
        }
      );
    });
  }

  async watchPosition(
    onSuccess: (position: GeolocationPosition) => void,
    onError: (error: GeolocationError) => void,
    options: GeolocationOptions = {}
  ): Promise<void> {
    const mergedOptions = { ...DEFAULT_OPTIONS, ...options };

    if (isTauri()) {
      await this.watchTauriPosition(onSuccess, onError, mergedOptions);
    } else {
      this.watchWebPosition(onSuccess, onError, mergedOptions);
    }
  }

  private async watchTauriPosition(
    onSuccess: (position: GeolocationPosition) => void,
    onError: (error: GeolocationError) => void,
    options: GeolocationOptions
  ): Promise<void> {
    try {
      const { watchPosition } = await import('@tauri-apps/plugin-geolocation');
      this.tauriWatchId = await watchPosition(
        {
          enableHighAccuracy: options.enableHighAccuracy ?? false,
          timeout: options.timeout ?? 10000,
          maximumAge: options.maximumAge ?? 300000,
        },
        (position, error) => {
          if (error || !position) {
            onError({
              code: GeolocationErrorCode.POSITION_UNAVAILABLE,
              message: error || 'Position unavailable',
            });
            return;
          }
          onSuccess({
            coords: {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
              altitude: position.coords.altitude ?? null,
              altitudeAccuracy: position.coords.altitudeAccuracy ?? null,
              heading: position.coords.heading ?? null,
              speed: position.coords.speed ?? null,
            },
            timestamp: position.timestamp,
          });
        }
      );
    } catch (error) {
      onError(this.mapTauriError(error));
    }
  }

  private watchWebPosition(
    onSuccess: (position: GeolocationPosition) => void,
    onError: (error: GeolocationError) => void,
    options: GeolocationOptions
  ): void {
    if (!navigator.geolocation) {
      onError({
        code: GeolocationErrorCode.NOT_SUPPORTED,
        message: 'Geolocation is not supported by this browser',
      });
      return;
    }

    this.watchId = navigator.geolocation.watchPosition(
      (position) => {
        onSuccess({
          coords: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            altitude: position.coords.altitude,
            altitudeAccuracy: position.coords.altitudeAccuracy,
            heading: position.coords.heading,
            speed: position.coords.speed,
          },
          timestamp: position.timestamp,
        });
      },
      (error) => {
        onError(this.mapWebError(error));
      },
      {
        enableHighAccuracy: options.enableHighAccuracy,
        timeout: options.timeout,
        maximumAge: options.maximumAge,
      }
    );
  }

  async clearWatch(): Promise<void> {
    if (isTauri() && this.tauriWatchId !== null) {
      try {
        const { clearWatch } = await import('@tauri-apps/plugin-geolocation');
        await clearWatch(this.tauriWatchId);
        this.tauriWatchId = null;
      } catch (error) {
        console.warn('Failed to clear Tauri watch:', error);
      }
    }

    if (this.watchId !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
  }

  isSupported(): boolean {
    if (isTauri()) {
      return true;
    }
    return typeof navigator !== 'undefined' && 'geolocation' in navigator;
  }

  private mapWebError(error: globalThis.GeolocationPositionError): GeolocationError {
    const codeMap: Record<number, GeolocationErrorCode> = {
      1: GeolocationErrorCode.PERMISSION_DENIED,
      2: GeolocationErrorCode.POSITION_UNAVAILABLE,
      3: GeolocationErrorCode.TIMEOUT,
    };

    return {
      code: codeMap[error.code] || GeolocationErrorCode.POSITION_UNAVAILABLE,
      message: error.message,
    };
  }

  private mapTauriError(error: unknown): GeolocationError {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    if (errorMessage.includes('permission')) {
      return {
        code: GeolocationErrorCode.PERMISSION_DENIED,
        message: errorMessage,
      };
    }
    if (errorMessage.includes('timeout')) {
      return {
        code: GeolocationErrorCode.TIMEOUT,
        message: errorMessage,
      };
    }
    
    return {
      code: GeolocationErrorCode.POSITION_UNAVAILABLE,
      message: errorMessage,
    };
  }
}

export const geolocationService = GeolocationService.getInstance();
