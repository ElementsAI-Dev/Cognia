/**
 * Map Types
 * Type definitions for map visualization and location services
 */

import type { LatLngExpression, LatLngBoundsExpression } from 'leaflet';

export type { LatLngExpression, LatLngBoundsExpression };

export interface MapPosition {
  latitude: number;
  longitude: number;
  zoom?: number;
}

export interface MapMarker {
  id: string;
  position: MapPosition;
  title?: string;
  description?: string;
  icon?: MapMarkerIcon;
  draggable?: boolean;
}

export interface MapMarkerIcon {
  url: string;
  size?: [number, number];
  anchor?: [number, number];
}

export interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface MapViewState {
  center: MapPosition;
  zoom: number;
  bounds?: MapBounds;
}

export interface AddressDetail {
  formattedAddress: string;
  street?: string;
  houseNumber?: string;
  district?: string;
  city?: string;
  county?: string;
  state?: string;
  province?: string;
  country: string;
  countryCode?: string;
  postcode?: string;
}

export interface GeocodingResult {
  position: MapPosition;
  address: AddressDetail;
  displayName: string;
  importance?: number;
  placeId?: string;
  type?: string;
}

export interface MapContainerProps {
  center?: MapPosition;
  zoom?: number;
  markers?: MapMarker[];
  showCurrentLocation?: boolean;
  showControls?: boolean;
  showScale?: boolean;
  onLocationChange?: (position: MapPosition) => void;
  onMarkerClick?: (marker: MapMarker) => void;
  onMapClick?: (position: MapPosition) => void;
  onBoundsChange?: (bounds: MapBounds) => void;
  className?: string;
  style?: React.CSSProperties;
}

export interface LocationMarkerProps {
  position: MapPosition;
  accuracy?: number;
  showAccuracyCircle?: boolean;
  pulseAnimation?: boolean;
}

export interface MapControlsProps {
  showZoom?: boolean;
  showLocate?: boolean;
  showFullscreen?: boolean;
  onLocateClick?: () => void;
  position?: 'topleft' | 'topright' | 'bottomleft' | 'bottomright';
}

export interface AddressSearchProps {
  placeholder?: string;
  onSelect?: (result: GeocodingResult) => void;
  onSearch?: (query: string) => void;
  className?: string;
  maxResults?: number;
}

export interface UseMapLocationOptions {
  enableHighAccuracy?: boolean;
  watchPosition?: boolean;
  autoCenter?: boolean;
}

export interface UseMapLocationReturn {
  position: MapPosition | null;
  accuracy: number | null;
  loading: boolean;
  error: string | null;
  locate: () => Promise<MapPosition | null>;
  clearError: () => void;
}

export interface UseGeocodingOptions {
  language?: string;
  countryCode?: string;
  limit?: number;
}

export interface UseGeocodingReturn {
  loading: boolean;
  error: string | null;
  searchAddress: (query: string) => Promise<GeocodingResult[]>;
  reverseGeocode: (position: MapPosition) => Promise<AddressDetail | null>;
  clearError: () => void;
}

export const DEFAULT_MAP_CENTER: MapPosition = {
  latitude: 39.9042,
  longitude: 116.4074,
  zoom: 13,
};

export const DEFAULT_ZOOM = 13;
export const MIN_ZOOM = 1;
export const MAX_ZOOM = 18;
