'use client';

/**
 * LeafletMap Component
 * Internal component that renders the actual Leaflet map
 * This component should only be imported via dynamic import with ssr: false
 */

import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useTranslations } from 'next-intl';
import type { MapContainerProps, MapPosition, MapMarker, MapBounds } from '@/types/map';
import { useMapLocation } from '@/hooks/map/use-map-location';

import 'leaflet/dist/leaflet.css';

const defaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const currentLocationIcon = L.divIcon({
  className: 'current-location-marker',
  html: `<div class="relative">
    <div class="absolute -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-lg"></div>
    <div class="absolute -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-blue-500 rounded-full animate-ping opacity-75"></div>
  </div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

L.Marker.prototype.options.icon = defaultIcon;

interface LeafletMapProps extends Omit<MapContainerProps, 'className' | 'style'> {
  minZoom: number;
  maxZoom: number;
}

function MapEventHandler({
  onMapClick,
  onBoundsChange,
}: {
  onMapClick?: (position: MapPosition) => void;
  onBoundsChange?: (bounds: MapBounds) => void;
}) {
  const map = useMapEvents({
    click: (e) => {
      onMapClick?.({
        latitude: e.latlng.lat,
        longitude: e.latlng.lng,
      });
    },
    moveend: () => {
      const bounds = map.getBounds();
      onBoundsChange?.({
        north: bounds.getNorth(),
        south: bounds.getSouth(),
        east: bounds.getEast(),
        west: bounds.getWest(),
      });
    },
  });

  return null;
}

function LocateControl({
  showCurrentLocation,
  onLocationChange,
}: {
  showCurrentLocation: boolean;
  onLocationChange?: (position: MapPosition) => void;
}) {
  const t = useTranslations('map');
  const map = useMap();
  const { position, accuracy, locate } = useMapLocation();
  const hasLocatedRef = useRef(false);

  useEffect(() => {
    if (showCurrentLocation && !hasLocatedRef.current) {
      hasLocatedRef.current = true;
      locate();
    }
  }, [showCurrentLocation, locate]);

  useEffect(() => {
    if (position) {
      map.flyTo([position.latitude, position.longitude], map.getZoom());
      onLocationChange?.(position);
    }
  }, [position, map, onLocationChange]);

  if (!showCurrentLocation || !position) {
    return null;
  }

  return (
    <>
      <Marker
        position={[position.latitude, position.longitude]}
        icon={currentLocationIcon}
      >
        <Popup>
          <div className="text-sm">
            <p className="font-medium">{t('currentLocation')}</p>
            {accuracy && (
              <p className="text-muted-foreground">
                {t('accuracy')}: {Math.round(accuracy)}m
              </p>
            )}
          </div>
        </Popup>
      </Marker>
      {accuracy && accuracy > 50 && (
        <Circle
          center={[position.latitude, position.longitude]}
          radius={accuracy}
          pathOptions={{
            color: '#3b82f6',
            fillColor: '#3b82f6',
            fillOpacity: 0.1,
            weight: 1,
          }}
        />
      )}
    </>
  );
}

function MarkerLayer({
  markers,
  onMarkerClick,
}: {
  markers: MapMarker[];
  onMarkerClick?: (marker: MapMarker) => void;
}) {
  return (
    <>
      {markers.map((marker) => (
        <Marker
          key={marker.id}
          position={[marker.position.latitude, marker.position.longitude]}
          draggable={marker.draggable}
          eventHandlers={{
            click: () => onMarkerClick?.(marker),
          }}
        >
          {(marker.title || marker.description) && (
            <Popup>
              <div className="text-sm">
                {marker.title && <p className="font-medium">{marker.title}</p>}
                {marker.description && (
                  <p className="text-muted-foreground">{marker.description}</p>
                )}
              </div>
            </Popup>
          )}
        </Marker>
      ))}
    </>
  );
}

export function LeafletMap({
  center,
  zoom,
  minZoom,
  maxZoom,
  markers = [],
  showCurrentLocation = false,
  showControls = true,
  showScale: _showScale = true,
  onLocationChange,
  onMarkerClick,
  onMapClick,
  onBoundsChange,
}: LeafletMapProps) {
  const mapCenter = center ?? { latitude: 39.9042, longitude: 116.4074 };
  return (
    <MapContainer
      center={[mapCenter.latitude, mapCenter.longitude]}
      zoom={zoom}
      minZoom={minZoom}
      maxZoom={maxZoom}
      zoomControl={showControls}
      attributionControl={true}
      className="h-full w-full"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapEventHandler onMapClick={onMapClick} onBoundsChange={onBoundsChange} />
      <LocateControl
        showCurrentLocation={showCurrentLocation}
        onLocationChange={onLocationChange}
      />
      <MarkerLayer markers={markers} onMarkerClick={onMarkerClick} />
    </MapContainer>
  );
}

export default LeafletMap;
