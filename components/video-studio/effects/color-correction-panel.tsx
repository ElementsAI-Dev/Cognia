'use client';

/**
 * ColorCorrectionPanel - Color grading and correction controls
 * 
 * Features:
 * - Basic adjustments (brightness, contrast, saturation)
 * - Color wheels (shadows, midtones, highlights)
 * - Curves editor
 * - Color lookup tables (LUTs)
 * - White balance
 * - Presets
 */

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Palette,
  Sun,
  Contrast,
  Droplets,
  Thermometer,
  RotateCcw,
  Eye,
  EyeOff,
  Sparkles,
  SlidersHorizontal,
} from 'lucide-react';

export interface ColorCorrectionSettings {
  enabled: boolean;
  // Basic adjustments
  brightness: number;
  contrast: number;
  saturation: number;
  exposure: number;
  gamma: number;
  // White balance
  temperature: number;
  tint: number;
  // HSL
  hue: number;
  // Shadows/Midtones/Highlights
  shadowsLift: number;
  shadowsGain: number;
  midtonesLift: number;
  midtonesGain: number;
  highlightsLift: number;
  highlightsGain: number;
  // Color tint
  shadowsTint: string;
  midtonesTint: string;
  highlightsTint: string;
  // Vignette
  vignetteAmount: number;
  vignetteSize: number;
  // LUT
  lutId: string | null;
  lutIntensity: number;
}

export interface ColorCorrectionPanelProps {
  settings: ColorCorrectionSettings;
  onSettingsChange: (settings: Partial<ColorCorrectionSettings>) => void;
  onReset: () => void;
  presets?: { id: string; name: string; settings: Partial<ColorCorrectionSettings> }[];
  onApplyPreset?: (presetId: string) => void;
  className?: string;
}

const LUT_OPTIONS = [
  { id: 'none', name: 'None' },
  { id: 'cinematic-warm', name: 'Cinematic Warm' },
  { id: 'cinematic-cool', name: 'Cinematic Cool' },
  { id: 'vintage', name: 'Vintage Film' },
  { id: 'noir', name: 'Film Noir' },
  { id: 'teal-orange', name: 'Teal & Orange' },
  { id: 'vibrant', name: 'Vibrant' },
  { id: 'muted', name: 'Muted' },
  { id: 'high-contrast', name: 'High Contrast' },
  { id: 'low-contrast', name: 'Low Contrast' },
];

const DEFAULT_PRESETS = [
  {
    id: 'reset',
    name: 'Reset',
    settings: {
      brightness: 0,
      contrast: 0,
      saturation: 0,
      exposure: 0,
      gamma: 1,
      temperature: 0,
      tint: 0,
      hue: 0,
    },
  },
  {
    id: 'warm',
    name: 'Warm',
    settings: { temperature: 20, saturation: 10 },
  },
  {
    id: 'cool',
    name: 'Cool',
    settings: { temperature: -20, saturation: 5 },
  },
  {
    id: 'high-contrast',
    name: 'High Contrast',
    settings: { contrast: 30, saturation: 10 },
  },
  {
    id: 'cinematic',
    name: 'Cinematic',
    settings: { contrast: 15, saturation: -10, shadowsLift: -5, highlightsGain: 5 },
  },
  {
    id: 'vintage',
    name: 'Vintage',
    settings: { saturation: -20, contrast: -10, temperature: 10, vignetteAmount: 30 },
  },
];

const DEFAULT_SETTINGS: ColorCorrectionSettings = {
  enabled: true,
  brightness: 0,
  contrast: 0,
  saturation: 0,
  exposure: 0,
  gamma: 1,
  temperature: 0,
  tint: 0,
  hue: 0,
  shadowsLift: 0,
  shadowsGain: 0,
  midtonesLift: 0,
  midtonesGain: 0,
  highlightsLift: 0,
  highlightsGain: 0,
  shadowsTint: '#000000',
  midtonesTint: '#808080',
  highlightsTint: '#ffffff',
  vignetteAmount: 0,
  vignetteSize: 50,
  lutId: null,
  lutIntensity: 100,
};

export function ColorCorrectionPanel({
  settings,
  onSettingsChange,
  onReset,
  presets = DEFAULT_PRESETS,
  onApplyPreset,
  className,
}: ColorCorrectionPanelProps) {
  const t = useTranslations('colorCorrection');
  const [activeTab, setActiveTab] = useState('basic');

  const handleSliderChange = useCallback(
    (key: keyof ColorCorrectionSettings, value: number[]) => {
      onSettingsChange({ [key]: value[0] });
    },
    [onSettingsChange]
  );

  const formatValue = (value: number, suffix = '') => {
    const sign = value > 0 ? '+' : '';
    return `${sign}${value}${suffix}`;
  };

  return (
    <div className={cn('flex flex-col h-full bg-background border rounded-lg', className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b">
        <h3 className="font-medium flex items-center gap-2">
          <Palette className="h-4 w-4" />
          {t('title')}
        </h3>
        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => onSettingsChange({ enabled: !settings.enabled })}
              >
                {settings.enabled ? (
                  <Eye className="h-4 w-4" />
                ) : (
                  <EyeOff className="h-4 w-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{settings.enabled ? t('disable') : t('enable')}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onReset}>
                <RotateCcw className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('resetAll')}</TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Presets */}
      <div className="p-3 border-b">
        <Label className="text-xs text-muted-foreground mb-2 block">{t('presets')}</Label>
        <div className="flex flex-wrap gap-1">
          {presets.map((preset) => (
            <Button
              key={preset.id}
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => onApplyPreset?.(preset.id) || onSettingsChange(preset.settings)}
            >
              {preset.name}
            </Button>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-4 mx-3 mt-3">
          <TabsTrigger value="basic" className="text-xs">
            <SlidersHorizontal className="h-3 w-3 mr-1" />
            {t('tabs.basic')}
          </TabsTrigger>
          <TabsTrigger value="color" className="text-xs">
            <Thermometer className="h-3 w-3 mr-1" />
            {t('tabs.color')}
          </TabsTrigger>
          <TabsTrigger value="tone" className="text-xs">
            <Contrast className="h-3 w-3 mr-1" />
            {t('tabs.tone')}
          </TabsTrigger>
          <TabsTrigger value="effects" className="text-xs">
            <Sparkles className="h-3 w-3 mr-1" />
            {t('tabs.effects')}
          </TabsTrigger>
        </TabsList>

        <ScrollArea className="flex-1">
          <div className="p-3">
            <TabsContent value="basic" className="mt-0 space-y-4">
              {/* Brightness */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-1 text-sm">
                    <Sun className="h-3 w-3" />
                    {t('brightness')}
                  </Label>
                  <span className="text-xs text-muted-foreground">
                    {formatValue(settings.brightness)}
                  </span>
                </div>
                <Slider
                  value={[settings.brightness]}
                  onValueChange={(v) => handleSliderChange('brightness', v)}
                  min={-100}
                  max={100}
                  step={1}
                  disabled={!settings.enabled}
                />
              </div>

              {/* Contrast */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-1 text-sm">
                    <Contrast className="h-3 w-3" />
                    {t('contrast')}
                  </Label>
                  <span className="text-xs text-muted-foreground">
                    {formatValue(settings.contrast)}
                  </span>
                </div>
                <Slider
                  value={[settings.contrast]}
                  onValueChange={(v) => handleSliderChange('contrast', v)}
                  min={-100}
                  max={100}
                  step={1}
                  disabled={!settings.enabled}
                />
              </div>

              {/* Saturation */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-1 text-sm">
                    <Droplets className="h-3 w-3" />
                    {t('saturation')}
                  </Label>
                  <span className="text-xs text-muted-foreground">
                    {formatValue(settings.saturation)}
                  </span>
                </div>
                <Slider
                  value={[settings.saturation]}
                  onValueChange={(v) => handleSliderChange('saturation', v)}
                  min={-100}
                  max={100}
                  step={1}
                  disabled={!settings.enabled}
                />
              </div>

              {/* Exposure */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">{t('exposure')}</Label>
                  <span className="text-xs text-muted-foreground">
                    {formatValue(settings.exposure)} EV
                  </span>
                </div>
                <Slider
                  value={[settings.exposure]}
                  onValueChange={(v) => handleSliderChange('exposure', v)}
                  min={-3}
                  max={3}
                  step={0.1}
                  disabled={!settings.enabled}
                />
              </div>

              {/* Gamma */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">{t('gamma')}</Label>
                  <span className="text-xs text-muted-foreground">
                    {settings.gamma.toFixed(2)}
                  </span>
                </div>
                <Slider
                  value={[settings.gamma]}
                  onValueChange={(v) => handleSliderChange('gamma', v)}
                  min={0.1}
                  max={3}
                  step={0.01}
                  disabled={!settings.enabled}
                />
              </div>
            </TabsContent>

            <TabsContent value="color" className="mt-0 space-y-4">
              {/* Temperature */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-1 text-sm">
                    <Thermometer className="h-3 w-3" />
                    {t('temperature')}
                  </Label>
                  <span className="text-xs text-muted-foreground">
                    {formatValue(settings.temperature)}
                  </span>
                </div>
                <div className="relative">
                  <div className="absolute inset-0 rounded bg-gradient-to-r from-blue-400 via-white to-orange-400 opacity-20" />
                  <Slider
                    value={[settings.temperature]}
                    onValueChange={(v) => handleSliderChange('temperature', v)}
                    min={-100}
                    max={100}
                    step={1}
                    disabled={!settings.enabled}
                    className="relative"
                  />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{t('cool')}</span>
                  <span>{t('warm')}</span>
                </div>
              </div>

              {/* Tint */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">{t('tint')}</Label>
                  <span className="text-xs text-muted-foreground">
                    {formatValue(settings.tint)}
                  </span>
                </div>
                <div className="relative">
                  <div className="absolute inset-0 rounded bg-gradient-to-r from-green-400 via-white to-pink-400 opacity-20" />
                  <Slider
                    value={[settings.tint]}
                    onValueChange={(v) => handleSliderChange('tint', v)}
                    min={-100}
                    max={100}
                    step={1}
                    disabled={!settings.enabled}
                    className="relative"
                  />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{t('green')}</span>
                  <span>{t('magenta')}</span>
                </div>
              </div>

              {/* Hue */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">{t('hueShift')}</Label>
                  <span className="text-xs text-muted-foreground">
                    {formatValue(settings.hue)}°
                  </span>
                </div>
                <div className="relative">
                  <div className="absolute inset-0 rounded bg-gradient-to-r from-red-500 via-yellow-500 via-green-500 via-cyan-500 via-blue-500 via-purple-500 to-red-500 opacity-30" />
                  <Slider
                    value={[settings.hue]}
                    onValueChange={(v) => handleSliderChange('hue', v)}
                    min={-180}
                    max={180}
                    step={1}
                    disabled={!settings.enabled}
                    className="relative"
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="tone" className="mt-0 space-y-4">
              {/* Shadows */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">{t('shadows')}</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <Label className="text-xs">{t('lift')}</Label>
                      <span className="text-xs text-muted-foreground">
                        {formatValue(settings.shadowsLift)}
                      </span>
                    </div>
                    <Slider
                      value={[settings.shadowsLift]}
                      onValueChange={(v) => handleSliderChange('shadowsLift', v)}
                      min={-50}
                      max={50}
                      step={1}
                      disabled={!settings.enabled}
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <Label className="text-xs">{t('gain')}</Label>
                      <span className="text-xs text-muted-foreground">
                        {formatValue(settings.shadowsGain)}
                      </span>
                    </div>
                    <Slider
                      value={[settings.shadowsGain]}
                      onValueChange={(v) => handleSliderChange('shadowsGain', v)}
                      min={-50}
                      max={50}
                      step={1}
                      disabled={!settings.enabled}
                    />
                  </div>
                </div>
              </div>

              {/* Midtones */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">{t('midtones')}</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <Label className="text-xs">{t('lift')}</Label>
                      <span className="text-xs text-muted-foreground">
                        {formatValue(settings.midtonesLift)}
                      </span>
                    </div>
                    <Slider
                      value={[settings.midtonesLift]}
                      onValueChange={(v) => handleSliderChange('midtonesLift', v)}
                      min={-50}
                      max={50}
                      step={1}
                      disabled={!settings.enabled}
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <Label className="text-xs">{t('gain')}</Label>
                      <span className="text-xs text-muted-foreground">
                        {formatValue(settings.midtonesGain)}
                      </span>
                    </div>
                    <Slider
                      value={[settings.midtonesGain]}
                      onValueChange={(v) => handleSliderChange('midtonesGain', v)}
                      min={-50}
                      max={50}
                      step={1}
                      disabled={!settings.enabled}
                    />
                  </div>
                </div>
              </div>

              {/* Highlights */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">{t('highlights')}</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <Label className="text-xs">{t('lift')}</Label>
                      <span className="text-xs text-muted-foreground">
                        {formatValue(settings.highlightsLift)}
                      </span>
                    </div>
                    <Slider
                      value={[settings.highlightsLift]}
                      onValueChange={(v) => handleSliderChange('highlightsLift', v)}
                      min={-50}
                      max={50}
                      step={1}
                      disabled={!settings.enabled}
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <Label className="text-xs">{t('gain')}</Label>
                      <span className="text-xs text-muted-foreground">
                        {formatValue(settings.highlightsGain)}
                      </span>
                    </div>
                    <Slider
                      value={[settings.highlightsGain]}
                      onValueChange={(v) => handleSliderChange('highlightsGain', v)}
                      min={-50}
                      max={50}
                      step={1}
                      disabled={!settings.enabled}
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="effects" className="mt-0 space-y-4">
              {/* LUT */}
              <div className="space-y-2">
                <Label className="text-sm">{t('colorLut')}</Label>
                <Select
                  value={settings.lutId || 'none'}
                  onValueChange={(v) => onSettingsChange({ lutId: v === 'none' ? null : v })}
                  disabled={!settings.enabled}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LUT_OPTIONS.map((lut) => (
                      <SelectItem key={lut.id} value={lut.id}>
                        {lut.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {settings.lutId && (
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <Label className="text-xs">{t('intensity')}</Label>
                      <span className="text-xs text-muted-foreground">
                        {settings.lutIntensity}%
                      </span>
                    </div>
                    <Slider
                      value={[settings.lutIntensity]}
                      onValueChange={(v) => handleSliderChange('lutIntensity', v)}
                      min={0}
                      max={100}
                      step={1}
                      disabled={!settings.enabled}
                    />
                  </div>
                )}
              </div>

              {/* Vignette */}
              <div className="space-y-2">
                <Label className="text-sm">{t('vignette')}</Label>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <Label className="text-xs">{t('amount')}</Label>
                      <span className="text-xs text-muted-foreground">
                        {settings.vignetteAmount}%
                      </span>
                    </div>
                    <Slider
                      value={[settings.vignetteAmount]}
                      onValueChange={(v) => handleSliderChange('vignetteAmount', v)}
                      min={0}
                      max={100}
                      step={1}
                      disabled={!settings.enabled}
                    />
                  </div>

                  {settings.vignetteAmount > 0 && (
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <Label className="text-xs">{t('size')}</Label>
                        <span className="text-xs text-muted-foreground">
                          {settings.vignetteSize}%
                        </span>
                      </div>
                      <Slider
                        value={[settings.vignetteSize]}
                        onValueChange={(v) => handleSliderChange('vignetteSize', v)}
                        min={0}
                        max={100}
                        step={1}
                        disabled={!settings.enabled}
                      />
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
          </div>
        </ScrollArea>
      </Tabs>
    </div>
  );
}

export { DEFAULT_SETTINGS as DEFAULT_COLOR_CORRECTION_SETTINGS };
export default ColorCorrectionPanel;
