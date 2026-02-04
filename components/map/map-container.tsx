'use client';

/**
 * MapContainer Component
 * Main map visualization component using Leaflet
 */

import { useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MapContainerProps, MapPosition, MapBounds } from '@/types/map';
import { DEFAULT_MAP_CENTER, DEFAULT_ZOOM, MIN_ZOOM, MAX_ZOOM } from '@/types/map';

function MapLoadingPlaceholder() {
  const t = useTranslations('map');

  return (
    <div className="flex h-full w-full items-center justify-center bg-muted/30">
      <div className="flex flex-col items-center gap-2">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">{t('loading')}</span>
      </div>
    </div>
  );
}

const LeafletMap = dynamic(
  () => import('./leaflet-map').then((mod) => mod.LeafletMap),
  {
    ssr: false,
    loading: () => <MapLoadingPlaceholder />,
  }
);

export function MapContainer({
  center,
  zoom = DEFAULT_ZOOM,
  markers = [],
  showCurrentLocation = false,
  showControls = true,
  showScale = true,
  onLocationChange,
  onMarkerClick,
  onMapClick,
  onBoundsChange,
  className,
  style,
}: MapContainerProps) {
  const mapCenter = useMemo<MapPosition>(
    () => center ?? DEFAULT_MAP_CENTER,
    [center]
  );

  const handleMapClick = useCallback(
    (position: MapPosition) => {
      onMapClick?.(position);
    },
    [onMapClick]
  );

  const handleBoundsChange = useCallback(
    (bounds: MapBounds) => {
      onBoundsChange?.(bounds);
    },
    [onBoundsChange]
  );

  return (
    <div
      className={cn('relative h-full w-full overflow-hidden rounded-lg', className)}
      style={style}
    >
      <LeafletMap
        center={mapCenter}
        zoom={zoom}
        minZoom={MIN_ZOOM}
        maxZoom={MAX_ZOOM}
        markers={markers}
        showCurrentLocation={showCurrentLocation}
        showControls={showControls}
        showScale={showScale}
        onLocationChange={onLocationChange}
        onMarkerClick={onMarkerClick}
        onMapClick={handleMapClick}
        onBoundsChange={handleBoundsChange}
      />
    </div>
  );
}

export default MapContainer;
