'use client';

/**
 * AudioTrackControls - Individual audio track control component
 * 
 * Features:
 * - Gain/volume adjustment
 * - Fade in/out controls
 * - Audio normalization
 * - Noise reduction toggle
 * - EQ presets
 */

import { useState, useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Volume2,
  TrendingUp,
  TrendingDown,
  Waves,
  Sliders,
  ChevronDown,
  ChevronUp,
  RotateCcw,
} from 'lucide-react';

export interface AudioTrackSettings {
  gain: number;
  fadeInDuration: number;
  fadeOutDuration: number;
  normalize: boolean;
  noiseReduction: boolean;
  noiseReductionLevel: number;
  eqPreset: string;
  compressor: boolean;
  compressorThreshold: number;
  compressorRatio: number;
}

export interface AudioTrackControlsProps {
  trackId: string;
  trackName: string;
  settings: AudioTrackSettings;
  duration: number;
  onSettingsChange: (settings: Partial<AudioTrackSettings>) => void;
  onReset: () => void;
  className?: string;
}


const DEFAULT_SETTINGS: AudioTrackSettings = {
  gain: 1,
  fadeInDuration: 0,
  fadeOutDuration: 0,
  normalize: false,
  noiseReduction: false,
  noiseReductionLevel: 0.5,
  eqPreset: 'flat',
  compressor: false,
  compressorThreshold: -24,
  compressorRatio: 4,
};

export function AudioTrackControls({
  trackId: _trackId,
  trackName,
  settings,
  duration,
  onSettingsChange,
  onReset,
  className,
}: AudioTrackControlsProps) {
  const t = useTranslations('audioTrack');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const eqPresets = useMemo(() => [
    { value: 'flat', label: t('eqPresets.flat') },
    { value: 'voice', label: t('eqPresets.voice') },
    { value: 'music', label: t('eqPresets.music') },
    { value: 'bass-boost', label: t('eqPresets.bassBoost') },
    { value: 'treble-boost', label: t('eqPresets.trebleBoost') },
    { value: 'podcast', label: t('eqPresets.podcast') },
    { value: 'cinematic', label: t('eqPresets.cinematic') },
  ], [t]);

  const handleGainChange = useCallback(
    (value: number[]) => {
      onSettingsChange({ gain: value[0] });
    },
    [onSettingsChange]
  );

  const handleFadeInChange = useCallback(
    (value: number[]) => {
      onSettingsChange({ fadeInDuration: value[0] });
    },
    [onSettingsChange]
  );

  const handleFadeOutChange = useCallback(
    (value: number[]) => {
      onSettingsChange({ fadeOutDuration: value[0] });
    },
    [onSettingsChange]
  );

  const formatGain = (value: number) => {
    if (value === 0) return '-∞ dB';
    const db = 20 * Math.log10(value);
    return `${db >= 0 ? '+' : ''}${db.toFixed(1)} dB`;
  };

  const formatTime = (seconds: number) => {
    if (seconds < 1) return `${Math.round(seconds * 1000)}ms`;
    return `${seconds.toFixed(1)}s`;
  };

  const maxFadeDuration = Math.min(duration / 2, 10);

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Volume2 className="h-4 w-4" />
          <span className="font-medium text-sm">{trackName}</span>
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onReset}>
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t('resetToDefaults')}</TooltipContent>
        </Tooltip>
      </div>

      {/* Gain control */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm">{t('gain')}</Label>
          <span className="text-xs text-muted-foreground font-mono">
            {formatGain(settings.gain)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Slider
            value={[settings.gain]}
            onValueChange={handleGainChange}
            min={0}
            max={2}
            step={0.01}
            className="flex-1"
          />
        </div>
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{t('gainLabels.minusInfinity')}</span>
          <span>{t('gainLabels.zero')}</span>
          <span>{t('gainLabels.plusSix')}</span>
        </div>
      </div>

      {/* Fade controls */}
      <div className="grid grid-cols-2 gap-4">
        {/* Fade In */}
        <div className="space-y-2">
          <div className="flex items-center gap-1">
            <TrendingUp className="h-3 w-3" />
            <Label className="text-xs">{t('fadeIn')}</Label>
          </div>
          <Slider
            value={[settings.fadeInDuration]}
            onValueChange={handleFadeInChange}
            min={0}
            max={maxFadeDuration}
            step={0.1}
          />
          <span className="text-xs text-muted-foreground">
            {formatTime(settings.fadeInDuration)}
          </span>
        </div>

        {/* Fade Out */}
        <div className="space-y-2">
          <div className="flex items-center gap-1">
            <TrendingDown className="h-3 w-3" />
            <Label className="text-xs">{t('fadeOut')}</Label>
          </div>
          <Slider
            value={[settings.fadeOutDuration]}
            onValueChange={handleFadeOutChange}
            min={0}
            max={maxFadeDuration}
            step={0.1}
          />
          <span className="text-xs text-muted-foreground">
            {formatTime(settings.fadeOutDuration)}
          </span>
        </div>
      </div>

      {/* Quick toggles */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Waves className="h-4 w-4" />
            <Label className="text-sm">{t('normalizeAudio')}</Label>
          </div>
          <Switch
            checked={settings.normalize}
            onCheckedChange={(checked) => onSettingsChange({ normalize: checked })}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sliders className="h-4 w-4" />
            <Label className="text-sm">{t('noiseReduction')}</Label>
          </div>
          <Switch
            checked={settings.noiseReduction}
            onCheckedChange={(checked) => onSettingsChange({ noiseReduction: checked })}
          />
        </div>

        {settings.noiseReduction && (
          <div className="pl-6 space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">{t('reductionLevel')}</Label>
              <span className="text-xs text-muted-foreground">
                {Math.round(settings.noiseReductionLevel * 100)}%
              </span>
            </div>
            <Slider
              value={[settings.noiseReductionLevel]}
              onValueChange={(v) => onSettingsChange({ noiseReductionLevel: v[0] })}
              min={0}
              max={1}
              step={0.05}
            />
          </div>
        )}
      </div>

      {/* EQ Preset */}
      <div className="space-y-2">
        <Label className="text-sm">{t('eqPreset')}</Label>
        <Select
          value={settings.eqPreset}
          onValueChange={(value) => onSettingsChange({ eqPreset: value })}
        >
          <SelectTrigger className="h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {eqPresets.map((preset) => (
              <SelectItem key={preset.value} value={preset.value}>
                {preset.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Advanced settings */}
      <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full justify-between h-8">
            <span className="text-xs">{t('advancedSettings')}</span>
            {showAdvanced ? (
              <ChevronUp className="h-3 w-3" />
            ) : (
              <ChevronDown className="h-3 w-3" />
            )}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-4 pt-2">
          {/* Compressor */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm">{t('compressor')}</Label>
              <Switch
                checked={settings.compressor}
                onCheckedChange={(checked) => onSettingsChange({ compressor: checked })}
              />
            </div>

            {settings.compressor && (
              <div className="space-y-3 pl-2">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">{t('threshold')}</Label>
                    <Input
                      type="number"
                      value={settings.compressorThreshold}
                      onChange={(e) =>
                        onSettingsChange({ compressorThreshold: parseFloat(e.target.value) })
                      }
                      className="h-6 w-16 text-xs"
                      min={-60}
                      max={0}
                    />
                  </div>
                  <Slider
                    value={[settings.compressorThreshold]}
                    onValueChange={(v) => onSettingsChange({ compressorThreshold: v[0] })}
                    min={-60}
                    max={0}
                    step={1}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">{t('ratio')}</Label>
                    <span className="text-xs text-muted-foreground">
                      {settings.compressorRatio}:1
                    </span>
                  </div>
                  <Slider
                    value={[settings.compressorRatio]}
                    onValueChange={(v) => onSettingsChange({ compressorRatio: v[0] })}
                    min={1}
                    max={20}
                    step={0.5}
                  />
                </div>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

export { DEFAULT_SETTINGS as DEFAULT_AUDIO_TRACK_SETTINGS };
export default AudioTrackControls;
