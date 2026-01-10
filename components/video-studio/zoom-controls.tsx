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
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';

export interface ZoomControlsProps {
  zoom: number;
  minZoom?: number;
  maxZoom?: number;
  step?: number;
  showFitToView?: boolean;
  showZoomValue?: boolean;
  compact?: boolean;
  vertical?: boolean;
  onZoomChange: (zoom: number) => void;
  onFitToView?: () => void;
  className?: string;
}

export function ZoomControls({
  zoom,
  minZoom = 0.1,
  maxZoom = 10,
  step = 0.25,
  showFitToView = true,
  showZoomValue = true,
  compact = false,
  vertical = false,
  onZoomChange,
  onFitToView,
  className,
}: ZoomControlsProps) {
  // Handle zoom in
  const handleZoomIn = useCallback(() => {
    const newZoom = Math.min(maxZoom, zoom + step);
    onZoomChange(newZoom);
  }, [zoom, maxZoom, step, onZoomChange]);

  // Handle zoom out
  const handleZoomOut = useCallback(() => {
    const newZoom = Math.max(minZoom, zoom - step);
    onZoomChange(newZoom);
  }, [zoom, minZoom, step, onZoomChange]);

  // Handle zoom reset (100%)
  const handleZoomReset = useCallback(() => {
    onZoomChange(1);
  }, [onZoomChange]);

  // Format zoom as percentage
  const zoomPercent = Math.round(zoom * 100);

  const buttonSize = compact ? 'icon' : 'default';
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
          Zoom Out
        </TooltipContent>
      </Tooltip>

      {showZoomValue && (
        <button
          className={cn(
            'text-xs text-muted-foreground hover:bg-accent rounded py-1 transition-colors',
            compact ? 'min-w-[40px] px-1' : 'min-w-[50px] px-2'
          )}
          onClick={handleZoomReset}
          title="Reset to 100%"
        >
          {zoomPercent}%
        </button>
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
          Zoom In
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
            Fit to View
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}
