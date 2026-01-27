'use client';

/**
 * ZoomControls - Reusable zoom control component
 * 
 * Provides standardized zoom controls following patterns from:
 * - designer-toolbar
 * - mind-map-canvas
 * - video-editor page
 */

import { useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
} from 'lucide-react';

export interface ZoomControlsProps {
  zoom: number;
  minZoom?: number;
  maxZoom?: number;
  step?: number;
  onZoomChange: (zoom: number) => void;
  onFitToView?: () => void;
  showZoomValue?: boolean;
  showFitToView?: boolean;
  vertical?: boolean;
  compact?: boolean;
  className?: string;
}

export function ZoomControls({
  zoom,
  minZoom = 0.1,
  maxZoom = 10,
  step = 0.25,
  onZoomChange,
  onFitToView,
  showZoomValue = true,
  showFitToView = true,
  vertical = false,
  compact = false,
  className,
}: ZoomControlsProps) {
  const t = useTranslations('zoom');

  // Handle zoom in
  const handleZoomIn = useCallback(() => {
    onZoomChange(Math.min(zoom + step, maxZoom));
  }, [zoom, step, maxZoom, onZoomChange]);

  // Handle zoom out
  const handleZoomOut = useCallback(() => {
    onZoomChange(Math.max(zoom - step, minZoom));
  }, [zoom, step, minZoom, onZoomChange]);

  // Handle zoom reset
  const handleZoomReset = useCallback(() => {
    onZoomChange(1);
  }, [onZoomChange]);

  // Calculate zoom percentage
  const zoomPercent = Math.round(zoom * 100);

  // Determine button size based on compact mode
  const buttonSize = compact ? 'icon' : 'icon';
  const buttonClass = compact ? 'h-7 w-7' : 'h-8 w-8';
  const iconClass = compact ? 'h-3.5 w-3.5' : 'h-4 w-4';

  return (
    <div
      className={cn(
        'flex items-center gap-0.5 bg-background/80 backdrop-blur-sm rounded-lg border p-1 shadow-sm',
        vertical && 'flex-col',
        className
      )}
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size={buttonSize}
            className={buttonClass}
            onClick={handleZoomOut}
            disabled={zoom <= minZoom}
          >
            <ZoomOut className={iconClass} />
          </Button>
        </TooltipTrigger>
        <TooltipContent side={vertical ? 'left' : 'bottom'}>
          {t('zoomOut')}
        </TooltipContent>
      </Tooltip>

      {showZoomValue && (
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            'text-xs text-muted-foreground hover:bg-accent',
            compact ? 'min-w-[35px] sm:min-w-[40px] px-1 h-7' : 'min-w-[45px] sm:min-w-[50px] px-2 h-8'
          )}
          onClick={handleZoomReset}
        >
          <span className="hidden sm:inline">{zoomPercent}%</span>
          <span className="sm:hidden">{zoomPercent}</span>
        </Button>
      )}

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size={buttonSize}
            className={buttonClass}
            onClick={handleZoomIn}
            disabled={zoom >= maxZoom}
          >
            <ZoomIn className={iconClass} />
          </Button>
        </TooltipTrigger>
        <TooltipContent side={vertical ? 'left' : 'bottom'}>
          {t('zoomIn')}
        </TooltipContent>
      </Tooltip>

      {showFitToView && onFitToView && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size={buttonSize}
              className={buttonClass}
              onClick={onFitToView}
            >
              <Maximize2 className={iconClass} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side={vertical ? 'left' : 'bottom'}>
            {t('fitToView')}
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}

export default ZoomControls;
