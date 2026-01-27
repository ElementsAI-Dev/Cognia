'use client';

/**
 * ProjectSettingsPanel - Video project settings and properties
 * 
 * Features:
 * - Resolution and frame rate
 * - Aspect ratio
 * - Background color
 * - Audio settings
 * - Proxy settings
 * - Auto-save configuration
 */

import { useState, useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Settings,
  Monitor,
  Film,
  Volume2,
  Palette,
  Save,
  RotateCcw,
  HardDrive,
  Clock,
} from 'lucide-react';

export type AspectRatio = '16:9' | '4:3' | '1:1' | '9:16' | '21:9' | 'custom';
export type FrameRate = 23.976 | 24 | 25 | 29.97 | 30 | 50 | 59.94 | 60;

export interface ProjectSettings {
  name: string;
  width: number;
  height: number;
  aspectRatio: AspectRatio;
  frameRate: FrameRate;
  backgroundColor: string;
  audioSampleRate: number;
  audioChannels: 1 | 2;
  useProxy: boolean;
  proxyResolution: '1/2' | '1/4' | '1/8';
  autoSave: boolean;
  autoSaveInterval: number;
  workingColorSpace: 'srgb' | 'rec709' | 'rec2020';
}

export interface ProjectSettingsPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: ProjectSettings;
  onSettingsChange: (settings: Partial<ProjectSettings>) => void;
  onSave: () => void;
  onReset: () => void;
  className?: string;
}


const DEFAULT_SETTINGS: ProjectSettings = {
  name: 'Untitled Project',
  width: 1920,
  height: 1080,
  aspectRatio: '16:9',
  frameRate: 30,
  backgroundColor: '#000000',
  audioSampleRate: 48000,
  audioChannels: 2,
  useProxy: false,
  proxyResolution: '1/2',
  autoSave: true,
  autoSaveInterval: 5,
  workingColorSpace: 'rec709',
};

export function ProjectSettingsPanel({
  open,
  onOpenChange,
  settings,
  onSettingsChange,
  onSave,
  onReset,
  className,
}: ProjectSettingsPanelProps) {
  const t = useTranslations('projectSettings');
  const tCommon = useTranslations('common');
  const [localSettings, setLocalSettings] = useState(settings);

  const resolutionPresets = useMemo(() => [
    { label: t('resolutions.4kUhd'), width: 3840, height: 2160 },
    { label: t('resolutions.2kQhd'), width: 2560, height: 1440 },
    { label: t('resolutions.1080pHd'), width: 1920, height: 1080 },
    { label: t('resolutions.720pHd'), width: 1280, height: 720 },
    { label: t('resolutions.480pSd'), width: 854, height: 480 },
    { label: t('resolutions.instagramSquare'), width: 1080, height: 1080 },
    { label: t('resolutions.instagramStory'), width: 1080, height: 1920 },
    { label: t('resolutions.tiktok'), width: 1080, height: 1920 },
    { label: t('resolutions.youtubeShorts'), width: 1080, height: 1920 },
  ], [t]);

  const frameRates = useMemo((): { value: FrameRate; label: string }[] => [
    { value: 23.976, label: t('frameRates.23976') },
    { value: 24, label: t('frameRates.24') },
    { value: 25, label: t('frameRates.25') },
    { value: 29.97, label: t('frameRates.2997') },
    { value: 30, label: t('frameRates.30') },
    { value: 50, label: t('frameRates.50') },
    { value: 59.94, label: t('frameRates.5994') },
    { value: 60, label: t('frameRates.60') },
  ], [t]);

  const aspectRatios = useMemo((): { value: AspectRatio; label: string }[] => [
    { value: '16:9', label: t('aspectRatios.16:9') },
    { value: '4:3', label: t('aspectRatios.4:3') },
    { value: '1:1', label: t('aspectRatios.1:1') },
    { value: '9:16', label: t('aspectRatios.9:16') },
    { value: '21:9', label: t('aspectRatios.21:9') },
    { value: 'custom', label: t('aspectRatios.custom') },
  ], [t]);

  const sampleRates = useMemo(() => [
    { value: 44100, label: t('sampleRates.44100') },
    { value: 48000, label: t('sampleRates.48000') },
    { value: 96000, label: t('sampleRates.96000') },
  ], [t]);

  const handleSettingChange = useCallback(
    <K extends keyof ProjectSettings>(key: K, value: ProjectSettings[K]) => {
      setLocalSettings((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const handleResolutionPreset = useCallback(
    (preset: { width: number; height: number }) => {
      setLocalSettings((prev) => ({
        ...prev,
        width: preset.width,
        height: preset.height,
      }));
    },
    []
  );

  const handleAspectRatioChange = useCallback(
    (ratio: AspectRatio) => {
      const newWidth = localSettings.width;
      let newHeight = localSettings.height;

      if (ratio !== 'custom') {
        const [w, h] = ratio.split(':').map(Number);
        newHeight = Math.round(newWidth / (w / h));
      }

      setLocalSettings((prev) => ({
        ...prev,
        aspectRatio: ratio,
        height: newHeight,
      }));
    },
    [localSettings.width, localSettings.height]
  );

  const handleSave = useCallback(() => {
    onSettingsChange(localSettings);
    onSave();
  }, [localSettings, onSettingsChange, onSave]);

  const handleReset = useCallback(() => {
    setLocalSettings(DEFAULT_SETTINGS);
    onReset();
  }, [onReset]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn('max-w-2xl max-h-[80vh]', className)}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            {t('title')}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[500px] pr-4">
          <div className="space-y-6">
            {/* Project name */}
            <div className="space-y-2">
              <Label>{t('projectName')}</Label>
              <Input
                value={localSettings.name}
                onChange={(e) => handleSettingChange('name', e.target.value)}
                placeholder={t('projectNamePlaceholder')}
              />
            </div>

            {/* Video settings */}
            <div className="space-y-4">
              <h4 className="font-medium flex items-center gap-2">
                <Monitor className="h-4 w-4" />
                {t('videoSettings')}
              </h4>

              {/* Resolution presets */}
              <div className="space-y-2">
                <Label>{t('resolutionPresets')}</Label>
                <div className="flex flex-wrap gap-1">
                  {resolutionPresets.map((preset) => (
                    <Button
                      key={preset.label}
                      variant={
                        localSettings.width === preset.width &&
                        localSettings.height === preset.height
                          ? 'secondary'
                          : 'outline'
                      }
                      size="sm"
                      className="text-xs"
                      onClick={() => handleResolutionPreset(preset)}
                    >
                      {preset.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Custom resolution */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('width')}</Label>
                  <Input
                    type="number"
                    value={localSettings.width}
                    onChange={(e) => handleSettingChange('width', parseInt(e.target.value))}
                    min={1}
                    max={7680}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('height')}</Label>
                  <Input
                    type="number"
                    value={localSettings.height}
                    onChange={(e) => handleSettingChange('height', parseInt(e.target.value))}
                    min={1}
                    max={4320}
                  />
                </div>
              </div>

              {/* Aspect ratio */}
              <div className="space-y-2">
                <Label>{t('aspectRatio')}</Label>
                <Select
                  value={localSettings.aspectRatio}
                  onValueChange={(v) => handleAspectRatioChange(v as AspectRatio)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {aspectRatios.map((ratio) => (
                      <SelectItem key={ratio.value} value={ratio.value}>
                        {ratio.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Frame rate */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Film className="h-4 w-4" />
                  {t('frameRate')}
                </Label>
                <Select
                  value={localSettings.frameRate.toString()}
                  onValueChange={(v) => handleSettingChange('frameRate', parseFloat(v) as FrameRate)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {frameRates.map((rate) => (
                      <SelectItem key={rate.value} value={rate.value.toString()}>
                        {rate.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Background color */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Palette className="h-4 w-4" />
                  {t('backgroundColor')}
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="color"
                    value={localSettings.backgroundColor}
                    onChange={(e) => handleSettingChange('backgroundColor', e.target.value)}
                    className="w-12 h-8 p-1"
                  />
                  <Input
                    value={localSettings.backgroundColor}
                    onChange={(e) => handleSettingChange('backgroundColor', e.target.value)}
                    className="flex-1"
                  />
                </div>
              </div>

              {/* Color space */}
              <div className="space-y-2">
                <Label>{t('colorSpace')}</Label>
                <Select
                  value={localSettings.workingColorSpace}
                  onValueChange={(v) =>
                    handleSettingChange('workingColorSpace', v as 'srgb' | 'rec709' | 'rec2020')
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="srgb">{t('colorSpaces.srgb')}</SelectItem>
                    <SelectItem value="rec709">{t('colorSpaces.rec709')}</SelectItem>
                    <SelectItem value="rec2020">{t('colorSpaces.rec2020')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Audio settings */}
            <div className="space-y-4">
              <h4 className="font-medium flex items-center gap-2">
                <Volume2 className="h-4 w-4" />
                {t('audioSettings')}
              </h4>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('sampleRate')}</Label>
                  <Select
                    value={localSettings.audioSampleRate.toString()}
                    onValueChange={(v) => handleSettingChange('audioSampleRate', parseInt(v))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {sampleRates.map((rate) => (
                        <SelectItem key={rate.value} value={rate.value.toString()}>
                          {rate.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>{t('channels')}</Label>
                  <Select
                    value={localSettings.audioChannels.toString()}
                    onValueChange={(v) => handleSettingChange('audioChannels', parseInt(v) as 1 | 2)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">{t('mono')}</SelectItem>
                      <SelectItem value="2">{t('stereo')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Performance settings */}
            <div className="space-y-4">
              <h4 className="font-medium flex items-center gap-2">
                <HardDrive className="h-4 w-4" />
                {t('performance')}
              </h4>

              <div className="flex items-center justify-between">
                <div>
                  <Label>{t('useProxy')}</Label>
                  <p className="text-xs text-muted-foreground">
                    {t('proxyDescription')}
                  </p>
                </div>
                <Switch
                  checked={localSettings.useProxy}
                  onCheckedChange={(checked) => handleSettingChange('useProxy', checked)}
                />
              </div>

              {localSettings.useProxy && (
                <div className="space-y-2 pl-4">
                  <Label>{t('proxyResolution')}</Label>
                  <Select
                    value={localSettings.proxyResolution}
                    onValueChange={(v) =>
                      handleSettingChange('proxyResolution', v as '1/2' | '1/4' | '1/8')
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1/2">{t('proxyOptions.half')}</SelectItem>
                      <SelectItem value="1/4">{t('proxyOptions.quarter')}</SelectItem>
                      <SelectItem value="1/8">{t('proxyOptions.eighth')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Auto-save settings */}
            <div className="space-y-4">
              <h4 className="font-medium flex items-center gap-2">
                <Clock className="h-4 w-4" />
                {t('autoSave')}
              </h4>

              <div className="flex items-center justify-between">
                <div>
                  <Label>{t('enableAutoSave')}</Label>
                  <p className="text-xs text-muted-foreground">
                    {t('autoSaveDescription')}
                  </p>
                </div>
                <Switch
                  checked={localSettings.autoSave}
                  onCheckedChange={(checked) => handleSettingChange('autoSave', checked)}
                />
              </div>

              {localSettings.autoSave && (
                <div className="space-y-2 pl-4">
                  <Label>{t('saveInterval')}</Label>
                  <Input
                    type="number"
                    value={localSettings.autoSaveInterval}
                    onChange={(e) =>
                      handleSettingChange('autoSaveInterval', parseInt(e.target.value))
                    }
                    min={1}
                    max={60}
                  />
                </div>
              )}
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="flex items-center justify-between">
          <Button variant="outline" onClick={handleReset}>
            <RotateCcw className="h-4 w-4 mr-2" />
            {t('resetToDefaults')}
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {tCommon('cancel')}
            </Button>
            <Button onClick={handleSave}>
              <Save className="h-4 w-4 mr-2" />
              {t('saveSettings')}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export { DEFAULT_SETTINGS as DEFAULT_PROJECT_SETTINGS };
export default ProjectSettingsPanel;
