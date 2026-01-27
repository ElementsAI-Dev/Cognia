'use client';

/**
 * VideoTransitions - Panel for managing video transitions
 * Features:
 * - Transition type selection
 * - Duration control
 * - Preview of transition
 * - Plugin-registered transitions
 */

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, Play, Info } from 'lucide-react';
import { getMediaRegistry } from '@/lib/plugin/api/media-api';
import type { VideoTransitionDefinition } from '@/lib/plugin/api/media-api';

export interface VideoTransitionsProps {
  selectedTransitionId: string | null;
  transitionDuration: number;
  onTransitionSelect: (transitionId: string | null) => void;
  onDurationChange: (duration: number) => void;
  onPreview: (transitionId: string) => void;
  onApply: () => void;
  onCancel: () => void;
  className?: string;
}

// Built-in transition definitions
const BUILTIN_TRANSITIONS: VideoTransitionDefinition[] = [
  {
    id: 'fade',
    name: 'Fade',
    description: 'Smooth fade between clips',
    icon: '🌅',
    minDuration: 0.1,
    maxDuration: 5,
    defaultDuration: 1,
    render: (from, to, progress) => {
      const canvas = new OffscreenCanvas(from.width, from.height);
      const ctx = canvas.getContext('2d');
      if (!ctx) return from;

      ctx.putImageData(from, 0, 0);
      ctx.globalAlpha = progress;
      ctx.putImageData(to, 0, 0);

      return ctx.getImageData(0, 0, canvas.width, canvas.height);
    },
  },
  {
    id: 'dissolve',
    name: 'Dissolve',
    description: 'Cross dissolve transition',
    icon: '✨',
    minDuration: 0.2,
    maxDuration: 5,
    defaultDuration: 1.5,
    render: (from, to, progress) => {
      const data = new Uint8ClampedArray(from.data.length);
      for (let i = 0; i < from.data.length; i += 4) {
        data[i] = Math.round(from.data[i] * (1 - progress) + to.data[i] * progress);
        data[i + 1] = Math.round(from.data[i + 1] * (1 - progress) + to.data[i + 1] * progress);
        data[i + 2] = Math.round(from.data[i + 2] * (1 - progress) + to.data[i + 2] * progress);
        data[i + 3] = 255;
      }
      return new ImageData(data, from.width, from.height);
    },
  },
  {
    id: 'wipe-left',
    name: 'Wipe Left',
    description: 'Wipe transition from right to left',
    icon: '◀️',
    minDuration: 0.2,
    maxDuration: 3,
    defaultDuration: 0.8,
    render: (from, to, progress) => {
      const data = new Uint8ClampedArray(from.data.length);
      const threshold = from.width * progress;
      for (let y = 0; y < from.height; y++) {
        for (let x = 0; x < from.width; x++) {
          const i = (y * from.width + x) * 4;
          const useSecond = x < threshold;
          const src = useSecond ? to : from;
          data[i] = src.data[i];
          data[i + 1] = src.data[i + 1];
          data[i + 2] = src.data[i + 2];
          data[i + 3] = src.data[i + 3];
        }
      }
      return new ImageData(data, from.width, from.height);
    },
  },
  {
    id: 'wipe-right',
    name: 'Wipe Right',
    description: 'Wipe transition from left to right',
    icon: '▶️',
    minDuration: 0.2,
    maxDuration: 3,
    defaultDuration: 0.8,
    render: (from, to, progress) => {
      const data = new Uint8ClampedArray(from.data.length);
      const threshold = from.width * (1 - progress);
      for (let y = 0; y < from.height; y++) {
        for (let x = 0; x < from.width; x++) {
          const i = (y * from.width + x) * 4;
          const useSecond = x > threshold;
          const src = useSecond ? to : from;
          data[i] = src.data[i];
          data[i + 1] = src.data[i + 1];
          data[i + 2] = src.data[i + 2];
          data[i + 3] = src.data[i + 3];
        }
      }
      return new ImageData(data, from.width, from.height);
    },
  },
  {
    id: 'slide-left',
    name: 'Slide Left',
    description: 'Slide transition from right to left',
    icon: '⬅️',
    minDuration: 0.2,
    maxDuration: 2,
    defaultDuration: 0.5,
    render: (from, to, progress) => {
      const canvas = new OffscreenCanvas(from.width, from.height);
      const ctx = canvas.getContext('2d');
      if (!ctx) return from;

      const offset = from.width * progress;
      
      const fromCanvas = new OffscreenCanvas(from.width, from.height);
      const fromCtx = fromCanvas.getContext('2d');
      if (fromCtx) {
        fromCtx.putImageData(from, 0, 0);
        ctx.drawImage(fromCanvas, -offset, 0);
      }

      const toCanvas = new OffscreenCanvas(to.width, to.height);
      const toCtx = toCanvas.getContext('2d');
      if (toCtx) {
        toCtx.putImageData(to, 0, 0);
        ctx.drawImage(toCanvas, from.width - offset, 0);
      }

      return ctx.getImageData(0, 0, canvas.width, canvas.height);
    },
  },
  {
    id: 'zoom-in',
    name: 'Zoom In',
    description: 'Zoom transition into the next clip',
    icon: '🔍',
    minDuration: 0.3,
    maxDuration: 2,
    defaultDuration: 0.7,
    render: (from, to, progress) => {
      const canvas = new OffscreenCanvas(from.width, from.height);
      const ctx = canvas.getContext('2d');
      if (!ctx) return from;

      // Draw from clip
      const fromCanvas = new OffscreenCanvas(from.width, from.height);
      const fromCtx = fromCanvas.getContext('2d');
      if (fromCtx) {
        fromCtx.putImageData(from, 0, 0);
        ctx.globalAlpha = 1 - progress;
        const scale = 1 + progress * 0.5;
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.scale(scale, scale);
        ctx.translate(-canvas.width / 2, -canvas.height / 2);
        ctx.drawImage(fromCanvas, 0, 0);
        ctx.setTransform(1, 0, 0, 1, 0, 0);
      }

      // Draw to clip
      const toCanvas = new OffscreenCanvas(to.width, to.height);
      const toCtx = toCanvas.getContext('2d');
      if (toCtx) {
        toCtx.putImageData(to, 0, 0);
        ctx.globalAlpha = progress;
        ctx.drawImage(toCanvas, 0, 0);
      }

      return ctx.getImageData(0, 0, canvas.width, canvas.height);
    },
  },
  {
    id: 'blur',
    name: 'Blur',
    description: 'Blur transition between clips',
    icon: '🌫️',
    minDuration: 0.3,
    maxDuration: 3,
    defaultDuration: 1,
    render: (from, to, progress) => {
      const data = new Uint8ClampedArray(from.data.length);
      const blurProgress = progress < 0.5 ? progress * 2 : (1 - progress) * 2;
      const _useSecond = progress >= 0.5;

      for (let i = 0; i < from.data.length; i += 4) {
        const src = progress < 0.5 ? from : to;
        data[i] = src.data[i];
        data[i + 1] = src.data[i + 1];
        data[i + 2] = src.data[i + 2];
        data[i + 3] = Math.round(255 * (1 - blurProgress * 0.3));
      }
      return new ImageData(data, from.width, from.height);
    },
  },
];

export function VideoTransitions({
  selectedTransitionId,
  transitionDuration,
  onTransitionSelect,
  onDurationChange,
  onPreview,
  onApply,
  onCancel,
  className,
}: VideoTransitionsProps) {
  const t = useTranslations('transitions');
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // Get all available transitions (built-in + plugins)
  const getAllTransitions = useCallback((): VideoTransitionDefinition[] => {
    const pluginTransitions = getMediaRegistry().getAllTransitions();
    return [...BUILTIN_TRANSITIONS, ...pluginTransitions];
  }, []);

  const transitions = getAllTransitions();
  const selectedTransition = transitions.find((t) => t.id === selectedTransitionId);

  // Handle transition selection
  const handleSelect = useCallback(
    (transition: VideoTransitionDefinition) => {
      onTransitionSelect(transition.id);
      onDurationChange(transition.defaultDuration);
    },
    [onTransitionSelect, onDurationChange]
  );

  // Get transition bounds
  const getMinDuration = () => selectedTransition?.minDuration || 0.1;
  const getMaxDuration = () => selectedTransition?.maxDuration || 5;

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">{t('title')}</h3>
        <div className="flex items-center gap-2">
          {selectedTransitionId && (
            <Button variant="ghost" size="sm" onClick={() => onTransitionSelect(null)}>
              {t('clear')}
            </Button>
          )}
        </div>
      </div>

      {/* Transition grid */}
      <ScrollArea className="h-[250px] sm:h-[300px]">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-1">
          {transitions.map((transition) => {
            const isSelected = selectedTransitionId === transition.id;
            const isHovered = hoveredId === transition.id;
            const isPlugin = transition.id.includes(':');

            return (
              <Card
                key={transition.id}
                className={cn(
                  'cursor-pointer transition-all',
                  isSelected && 'ring-2 ring-primary',
                  isHovered && !isSelected && 'ring-1 ring-muted-foreground/50'
                )}
                onMouseEnter={() => setHoveredId(transition.id)}
                onMouseLeave={() => setHoveredId(null)}
                onClick={() => handleSelect(transition)}
              >
                <CardContent className="p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xl">{transition.icon || '🎬'}</span>
                    <div className="flex items-center gap-1">
                      {isPlugin && (
                        <Badge variant="secondary" className="text-xs">
                          {t('plugin')}
                        </Badge>
                      )}
                      {isSelected && <Check className="h-4 w-4 text-primary" />}
                    </div>
                  </div>
                  <h4 className="text-sm font-medium truncate">{transition.name}</h4>
                  {isHovered && transition.description && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {transition.description}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </ScrollArea>

      {/* Selected transition settings */}
      {selectedTransition && (
        <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">{selectedTransition.icon || '🎬'}</span>
              <div>
                <h4 className="font-medium">{selectedTransition.name}</h4>
                <p className="text-xs text-muted-foreground">
                  {selectedTransition.description}
                </p>
              </div>
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => onPreview(selectedTransition.id)}
                >
                  <Play className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('preview')}</TooltipContent>
            </Tooltip>
          </div>

          {/* Duration slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>{t('duration')}</Label>
              <span className="text-sm font-mono">{transitionDuration.toFixed(1)}s</span>
            </div>
            <Slider
              value={[transitionDuration]}
              onValueChange={([value]) => onDurationChange(value)}
              min={getMinDuration()}
              max={getMaxDuration()}
              step={0.1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{getMinDuration()}s</span>
              <span>{getMaxDuration()}s</span>
            </div>
          </div>

          {/* Additional parameters would go here */}
          {selectedTransition.parameters && selectedTransition.parameters.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Info className="h-3 w-3" />
                <span>{t('additionalSettings')}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onCancel}>
          {t('cancel')}
        </Button>
        <Button onClick={onApply} disabled={!selectedTransitionId}>
          {t('apply')}
        </Button>
      </div>
    </div>
  );
}

export default VideoTransitions;
