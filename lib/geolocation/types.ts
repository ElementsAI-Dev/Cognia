/**
 * Geolocation Types
 */

export interface GeolocationCoordinates {
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude: number | null;
  altitudeAccuracy: number | null;
  heading: number | null;
  speed: number | null;
}

export interface GeolocationPosition {
  coords: GeolocationCoordinates;
  timestamp: number;
}

export interface GeolocationError {
  code: GeolocationErrorCode;
  message: string;
}

export enum GeolocationErrorCode {
  PERMISSION_DENIED = 1,
  POSITION_UNAVAILABLE = 2,
  TIMEOUT = 3,
  NOT_SUPPORTED = 4,
}

export interface GeolocationOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
}

export type PermissionState = 'granted' | 'denied' | 'prompt';

export interface GeolocationPermissionStatus {
  location: PermissionState;
  coarseLocation: PermissionState;
}

export interface CountryInfo {
  code: string;
  name: string;
  locale: string;
  timezone: string;
  currency: string;
  languages: string[];
}

export interface LocaleInfo {
  country: CountryInfo | null;
  detectedLocale: string;
  browserLocale: string;
  systemLocale: string | null;
  confidence: 'high' | 'medium' | 'low';
  source: 'geolocation' | 'browser' | 'system' | 'default';
}
