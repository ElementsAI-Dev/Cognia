'use client';

/**
 * SpeedControls - Playback speed and time remapping controls
 * 
 * Features:
 * - Speed multiplier slider
 * - Speed presets
 * - Time remapping curve editor
 * - Reverse playback
 * - Frame blending options
 */

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Gauge,
  Play,
  RotateCcw,
  Layers,
  ArrowLeftRight,
} from 'lucide-react';

export type FrameBlendingMode = 'none' | 'frame-sampling' | 'frame-blending' | 'optical-flow';

export interface SpeedSettings {
  speed: number;
  reverse: boolean;
  maintainPitch: boolean;
  frameBlending: FrameBlendingMode;
  rampEnabled: boolean;
  rampCurve: { time: number; speed: number }[];
}

export interface SpeedControlsProps {
  settings: SpeedSettings;
  onSettingsChange: (settings: Partial<SpeedSettings>) => void;
  duration: number;
  onReset: () => void;
  className?: string;
}

const SPEED_PRESETS = [
  { value: 0.1, label: '0.1x' },
  { value: 0.25, label: '0.25x' },
  { value: 0.5, label: '0.5x' },
  { value: 0.75, label: '0.75x' },
  { value: 1, label: '1x' },
  { value: 1.25, label: '1.25x' },
  { value: 1.5, label: '1.5x' },
  { value: 2, label: '2x' },
  { value: 3, label: '3x' },
  { value: 4, label: '4x' },
];

const FRAME_BLENDING_OPTIONS: { value: FrameBlendingMode; labelKey: string; descKey: string }[] = [
  { value: 'none', labelKey: 'frameBlending.none', descKey: 'frameBlending.noneDesc' },
  { value: 'frame-sampling', labelKey: 'frameBlending.frameSampling', descKey: 'frameBlending.frameSamplingDesc' },
  { value: 'frame-blending', labelKey: 'frameBlending.frameBlending', descKey: 'frameBlending.frameBlendingDesc' },
  { value: 'optical-flow', labelKey: 'frameBlending.opticalFlow', descKey: 'frameBlending.opticalFlowDesc' },
];

const DEFAULT_SETTINGS: SpeedSettings = {
  speed: 1,
  reverse: false,
  maintainPitch: true,
  frameBlending: 'frame-blending',
  rampEnabled: false,
  rampCurve: [],
};

export function SpeedControls({
  settings,
  onSettingsChange,
  duration,
  onReset,
  className,
}: SpeedControlsProps) {
  const t = useTranslations('speedControls');
  const [customSpeed, setCustomSpeed] = useState(settings.speed.toString());

  const handleSpeedChange = useCallback(
    (value: number[]) => {
      const speed = value[0];
      onSettingsChange({ speed });
      setCustomSpeed(speed.toString());
    },
    [onSettingsChange]
  );

  const handleCustomSpeedChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setCustomSpeed(value);
      const num = parseFloat(value);
      if (!isNaN(num) && num >= 0.1 && num <= 10) {
        onSettingsChange({ speed: num });
      }
    },
    [onSettingsChange]
  );

  const handlePresetClick = useCallback(
    (speed: number) => {
      onSettingsChange({ speed });
      setCustomSpeed(speed.toString());
    },
    [onSettingsChange]
  );

  const toggleReverse = useCallback(() => {
    onSettingsChange({ reverse: !settings.reverse });
  }, [settings.reverse, onSettingsChange]);

  const calculateNewDuration = () => {
    if (settings.speed === 0) return duration;
    return duration / settings.speed;
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.round((seconds % 1) * 100);
    return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  return (
    <div className={cn('flex flex-col gap-4 p-4 bg-background border rounded-lg', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-medium flex items-center gap-2">
          <Gauge className="h-4 w-4" />
          {t('title')}
        </h3>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onReset}>
              <RotateCcw className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t('resetToDefault')}</TooltipContent>
        </Tooltip>
      </div>

      {/* Speed slider */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm">{t('playbackSpeed')}</Label>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              value={customSpeed}
              onChange={handleCustomSpeedChange}
              className="w-20 h-7 text-sm text-center"
              min={0.1}
              max={10}
              step={0.05}
            />
            <span className="text-sm text-muted-foreground">x</span>
          </div>
        </div>

        <div className="relative">
          <Slider
            value={[settings.speed]}
            onValueChange={handleSpeedChange}
            min={0.1}
            max={4}
            step={0.05}
          />
          <div className="flex justify-between mt-1">
            <span className="text-xs text-muted-foreground">0.1x</span>
            <span className="text-xs text-muted-foreground">1x</span>
            <span className="text-xs text-muted-foreground">4x</span>
          </div>
        </div>

        {/* Speed presets */}
        <ToggleGroup
          type="single"
          value={settings.speed.toString()}
          onValueChange={(value) => value && handlePresetClick(parseFloat(value))}
          className="flex flex-wrap gap-1"
        >
          {SPEED_PRESETS.map((preset) => (
            <ToggleGroupItem
              key={preset.value}
              value={preset.value.toString()}
              size="sm"
              className="h-7 text-xs px-2"
            >
              {preset.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      {/* Duration info */}
      <div className="p-3 bg-muted/50 rounded-lg space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{t('originalDuration')}</span>
          <span className="font-mono">{formatDuration(duration)}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{t('newDuration')}</span>
          <span className="font-mono font-medium">{formatDuration(calculateNewDuration())}</span>
        </div>
        {settings.speed !== 1 && (
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{t('change')}</span>
            <span className={settings.speed > 1 ? 'text-green-500' : 'text-orange-500'}>
              {settings.speed > 1 ? '-' : '+'}
              {Math.abs(Math.round((1 - 1 / settings.speed) * 100))}%
            </span>
          </div>
        )}
      </div>

      {/* Reverse */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ArrowLeftRight className="h-4 w-4 text-muted-foreground" />
          <Label className="text-sm">{t('reversePlayback')}</Label>
        </div>
        <Switch checked={settings.reverse} onCheckedChange={toggleReverse} />
      </div>

      {/* Maintain pitch */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Play className="h-4 w-4 text-muted-foreground" />
          <Label className="text-sm">{t('maintainAudioPitch')}</Label>
        </div>
        <Switch
          checked={settings.maintainPitch}
          onCheckedChange={(checked) => onSettingsChange({ maintainPitch: checked })}
        />
      </div>

      {/* Frame blending */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-muted-foreground" />
          <Label className="text-sm">{t('frameInterpolation')}</Label>
        </div>
        <Select
          value={settings.frameBlending}
          onValueChange={(v) => onSettingsChange({ frameBlending: v as FrameBlendingMode })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FRAME_BLENDING_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                <div>
                  <div>{t(option.labelKey)}</div>
                  <div className="text-xs text-muted-foreground">{t(option.descKey)}</div>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Speed ramp toggle */}
      <div className="flex items-center justify-between pt-2 border-t">
        <div>
          <Label className="text-sm">{t('speedRamping')}</Label>
          <p className="text-xs text-muted-foreground">{t('speedRampingDescription')}</p>
        </div>
        <Switch
          checked={settings.rampEnabled}
          onCheckedChange={(checked) => onSettingsChange({ rampEnabled: checked })}
        />
      </div>

      {settings.rampEnabled && (
        <div className="p-3 bg-muted/30 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <Label className="text-xs">{t('speedCurve')}</Label>
            <Button variant="outline" size="sm" className="h-6 text-xs">
              {t('editCurve')}
            </Button>
          </div>
          <div className="h-16 bg-muted rounded flex items-center justify-center">
            <span className="text-xs text-muted-foreground">
              {t('editCurveHint')}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export { DEFAULT_SETTINGS as DEFAULT_SPEED_SETTINGS };
export default SpeedControls;
