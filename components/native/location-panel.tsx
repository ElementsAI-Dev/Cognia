'use client';

/**
 * LocationPanel Component
 * Provides map visualization and geolocation functionality
 */

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { MapPin, Search, Navigation, Copy, Check, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { MapContainer, AddressSearch } from '@/components/map';
import { useMapLocation } from '@/hooks/map';
import type { MapPosition, GeocodingResult, MapMarker } from '@/types/map';

interface LocationPanelProps {
  className?: string;
}

export function LocationPanel({ className }: LocationPanelProps) {
  const t = useTranslations('map');
  const { position, accuracy, loading, error, locate, clearError } = useMapLocation({
    enableHighAccuracy: true,
  });

  const [selectedLocation, setSelectedLocation] = useState<MapPosition | null>(null);
  const [markers, setMarkers] = useState<MapMarker[]>([]);
  const [copied, setCopied] = useState(false);

  const handleLocate = useCallback(async () => {
    clearError();
    const pos = await locate();
    if (pos) {
      setSelectedLocation(pos);
    }
  }, [locate, clearError]);

  const handleAddressSelect = useCallback((result: GeocodingResult) => {
    setSelectedLocation(result.position);
    setMarkers([
      {
        id: 'search-result',
        position: result.position,
        title: result.displayName,
        description: result.address.formattedAddress,
      },
    ]);
  }, []);

  const handleMapClick = useCallback((pos: MapPosition) => {
    setSelectedLocation(pos);
    setMarkers([
      {
        id: 'clicked',
        position: pos,
        title: `${pos.latitude.toFixed(6)}, ${pos.longitude.toFixed(6)}`,
      },
    ]);
  }, []);

  const handleCopyCoordinates = useCallback(async () => {
    if (selectedLocation) {
      const text = `${selectedLocation.latitude.toFixed(6)}, ${selectedLocation.longitude.toFixed(6)}`;
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [selectedLocation]);

  const displayPosition = selectedLocation || position;

  return (
    <div className={cn('flex h-full flex-col gap-4 p-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">{t('currentLocation')}</h2>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleLocate}
          disabled={loading}
          className="gap-2"
        >
          <Navigation className={cn('h-4 w-4', loading && 'animate-pulse')} />
          {loading ? t('locating') : t('locateMe')}
        </Button>
      </div>

      {/* Error display */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Address Search */}
      <div className="flex items-center gap-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <AddressSearch
          placeholder={t('searchPlaceholder')}
          onSelect={handleAddressSelect}
          className="flex-1"
        />
      </div>

      {/* Map */}
      <div className="relative flex-1 min-h-[300px] rounded-lg border overflow-hidden">
        <MapContainer
          center={displayPosition ?? undefined}
          zoom={displayPosition ? 15 : 13}
          markers={markers}
          showCurrentLocation
          showControls
          onMapClick={handleMapClick}
          className="h-full w-full"
        />
      </div>

      {/* Location Info Card */}
      {displayPosition && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              {t('currentLocation')}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleCopyCoordinates}
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </CardTitle>
            <CardDescription>
              {accuracy && `${t('accuracy')}: ±${Math.round(accuracy)}m`}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">{t('latitude')}:</span>
                <span className="ml-2 font-mono">{displayPosition.latitude.toFixed(6)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">{t('longitude')}:</span>
                <span className="ml-2 font-mono">{displayPosition.longitude.toFixed(6)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default LocationPanel;
