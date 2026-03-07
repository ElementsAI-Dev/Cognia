'use client';

import { useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { RotateCcw, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { CameraMotion } from '@/types/video-studio/types';
import { DEFAULT_CAMERA_MOTION } from '@/types/video-studio/types';
import { CAMERA_PRESETS } from '../constants';

export interface CameraMotionControlsProps {
  motion: CameraMotion;
  onMotionChange: (motion: CameraMotion) => void;
  className?: string;
}

const AXES: Array<{ key: keyof CameraMotion; label: string; negLabel: string; posLabel: string }> = [
  { key: 'horizontal', label: 'Horizontal', negLabel: 'Left', posLabel: 'Right' },
  { key: 'vertical', label: 'Vertical', negLabel: 'Down', posLabel: 'Up' },
  { key: 'pan', label: 'Pan', negLabel: 'Left', posLabel: 'Right' },
  { key: 'tilt', label: 'Tilt', negLabel: 'Down', posLabel: 'Up' },
  { key: 'zoom', label: 'Zoom', negLabel: 'Out', posLabel: 'In' },
  { key: 'roll', label: 'Roll', negLabel: 'CCW', posLabel: 'CW' },
];

export function cameraMotionToPrompt(motion: CameraMotion): string {
  const parts: string[] = [];

  if (Math.abs(motion.pan) > 10) {
    const dir = motion.pan > 0 ? 'right' : 'left';
    const intensity = Math.abs(motion.pan) > 60 ? 'dramatically' : Math.abs(motion.pan) > 30 ? 'smoothly' : 'slightly';
    parts.push(`the camera ${intensity} pans ${dir}`);
  }
  if (Math.abs(motion.tilt) > 10) {
    const dir = motion.tilt > 0 ? 'up' : 'down';
    const intensity = Math.abs(motion.tilt) > 60 ? 'dramatically' : Math.abs(motion.tilt) > 30 ? 'smoothly' : 'slightly';
    parts.push(`tilts ${intensity} ${dir}`);
  }
  if (Math.abs(motion.zoom) > 10) {
    const dir = motion.zoom > 0 ? 'in' : 'out';
    const intensity = Math.abs(motion.zoom) > 60 ? 'dramatically' : Math.abs(motion.zoom) > 30 ? 'smoothly' : 'slightly';
    parts.push(`zooms ${intensity} ${dir}`);
  }
  if (Math.abs(motion.horizontal) > 10) {
    const dir = motion.horizontal > 0 ? 'right' : 'left';
    parts.push(`dollies ${dir}`);
  }
  if (Math.abs(motion.vertical) > 10) {
    const dir = motion.vertical > 0 ? 'up' : 'down';
    parts.push(`cranes ${dir}`);
  }
  if (Math.abs(motion.roll) > 10) {
    const dir = motion.roll > 0 ? 'clockwise' : 'counter-clockwise';
    parts.push(`rolls ${dir}`);
  }

  if (parts.length === 0) return '';
  return `. Camera motion: ${parts.join(', ')}`;
}

export function CameraMotionControls({
  motion,
  onMotionChange,
  className,
}: CameraMotionControlsProps) {
  const t = useTranslations('videoGeneration');

  const handleAxisChange = useCallback(
    (key: keyof CameraMotion, value: number) => {
      onMotionChange({ ...motion, [key]: value });
    },
    [motion, onMotionChange]
  );

  const handleReset = useCallback(() => {
    onMotionChange(DEFAULT_CAMERA_MOTION);
  }, [onMotionChange]);

  const isDefault = useMemo(
    () => Object.values(motion).every((v) => v === 0),
    [motion]
  );

  const activePreset = useMemo(
    () => CAMERA_PRESETS.find((p) => JSON.stringify(p.motion) === JSON.stringify(motion)),
    [motion]
  );

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2 text-sm font-medium">
          <Video className="h-4 w-4" />
          {t('cameraMotion') || 'Camera Motion'}
        </Label>
        {!isDefault && (
          <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={handleReset}>
            <RotateCcw className="h-3 w-3 mr-1" />
            Reset
          </Button>
        )}
      </div>

      {/* Presets */}
      <div className="flex flex-wrap gap-1">
        {CAMERA_PRESETS.map((preset) => (
          <Tooltip key={preset.id}>
            <TooltipTrigger asChild>
              <button
                type="button"
                className={cn(
                  'px-2 py-1 rounded-lg text-xs transition-all border',
                  activePreset?.id === preset.id
                    ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                    : 'bg-secondary/30 border-transparent hover:bg-secondary/50 text-muted-foreground hover:text-foreground'
                )}
                onClick={() => onMotionChange(preset.motion)}
              >
                <span className="mr-1">{preset.icon}</span>
                {preset.label}
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom">{preset.label}</TooltipContent>
          </Tooltip>
        ))}
      </div>

      {/* Axis Sliders */}
      <div className="space-y-2">
        {AXES.map((axis) => (
          <div key={axis.key} className="space-y-1">
            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
              <span>{axis.negLabel}</span>
              <span className="font-medium text-foreground/80">{axis.label}</span>
              <span>{axis.posLabel}</span>
            </div>
            <Slider
              value={[motion[axis.key]]}
              onValueChange={([v]) => handleAxisChange(axis.key, v)}
              min={-100}
              max={100}
              step={5}
              className="py-0"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
