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

import { useState, useCallback } from 'react';
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

const RESOLUTION_PRESETS = [
  { label: '4K UHD', width: 3840, height: 2160 },
  { label: '2K QHD', width: 2560, height: 1440 },
  { label: '1080p HD', width: 1920, height: 1080 },
  { label: '720p HD', width: 1280, height: 720 },
  { label: '480p SD', width: 854, height: 480 },
  { label: 'Instagram Square', width: 1080, height: 1080 },
  { label: 'Instagram Story', width: 1080, height: 1920 },
  { label: 'TikTok', width: 1080, height: 1920 },
  { label: 'YouTube Shorts', width: 1080, height: 1920 },
];

const FRAME_RATES: { value: FrameRate; label: string }[] = [
  { value: 23.976, label: '23.976 fps (Film)' },
  { value: 24, label: '24 fps (Cinema)' },
  { value: 25, label: '25 fps (PAL)' },
  { value: 29.97, label: '29.97 fps (NTSC)' },
  { value: 30, label: '30 fps' },
  { value: 50, label: '50 fps (PAL HFR)' },
  { value: 59.94, label: '59.94 fps (NTSC HFR)' },
  { value: 60, label: '60 fps' },
];

const ASPECT_RATIOS: { value: AspectRatio; label: string }[] = [
  { value: '16:9', label: '16:9 (Widescreen)' },
  { value: '4:3', label: '4:3 (Standard)' },
  { value: '1:1', label: '1:1 (Square)' },
  { value: '9:16', label: '9:16 (Vertical)' },
  { value: '21:9', label: '21:9 (Ultrawide)' },
  { value: 'custom', label: 'Custom' },
];

const SAMPLE_RATES = [
  { value: 44100, label: '44.1 kHz' },
  { value: 48000, label: '48 kHz' },
  { value: 96000, label: '96 kHz' },
];

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
  const [localSettings, setLocalSettings] = useState(settings);

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
            Project Settings
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[500px] pr-4">
          <div className="space-y-6">
            {/* Project name */}
            <div className="space-y-2">
              <Label>Project Name</Label>
              <Input
                value={localSettings.name}
                onChange={(e) => handleSettingChange('name', e.target.value)}
                placeholder="Project name"
              />
            </div>

            {/* Video settings */}
            <div className="space-y-4">
              <h4 className="font-medium flex items-center gap-2">
                <Monitor className="h-4 w-4" />
                Video Settings
              </h4>

              {/* Resolution presets */}
              <div className="space-y-2">
                <Label>Resolution Presets</Label>
                <div className="flex flex-wrap gap-1">
                  {RESOLUTION_PRESETS.map((preset) => (
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
                  <Label>Width (px)</Label>
                  <Input
                    type="number"
                    value={localSettings.width}
                    onChange={(e) => handleSettingChange('width', parseInt(e.target.value))}
                    min={1}
                    max={7680}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Height (px)</Label>
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
                <Label>Aspect Ratio</Label>
                <Select
                  value={localSettings.aspectRatio}
                  onValueChange={(v) => handleAspectRatioChange(v as AspectRatio)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ASPECT_RATIOS.map((ratio) => (
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
                  Frame Rate
                </Label>
                <Select
                  value={localSettings.frameRate.toString()}
                  onValueChange={(v) => handleSettingChange('frameRate', parseFloat(v) as FrameRate)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FRAME_RATES.map((rate) => (
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
                  Background Color
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
                <Label>Working Color Space</Label>
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
                    <SelectItem value="srgb">sRGB</SelectItem>
                    <SelectItem value="rec709">Rec. 709</SelectItem>
                    <SelectItem value="rec2020">Rec. 2020</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Audio settings */}
            <div className="space-y-4">
              <h4 className="font-medium flex items-center gap-2">
                <Volume2 className="h-4 w-4" />
                Audio Settings
              </h4>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Sample Rate</Label>
                  <Select
                    value={localSettings.audioSampleRate.toString()}
                    onValueChange={(v) => handleSettingChange('audioSampleRate', parseInt(v))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SAMPLE_RATES.map((rate) => (
                        <SelectItem key={rate.value} value={rate.value.toString()}>
                          {rate.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Channels</Label>
                  <Select
                    value={localSettings.audioChannels.toString()}
                    onValueChange={(v) => handleSettingChange('audioChannels', parseInt(v) as 1 | 2)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Mono</SelectItem>
                      <SelectItem value="2">Stereo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Performance settings */}
            <div className="space-y-4">
              <h4 className="font-medium flex items-center gap-2">
                <HardDrive className="h-4 w-4" />
                Performance
              </h4>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Use Proxy Media</Label>
                  <p className="text-xs text-muted-foreground">
                    Use lower resolution proxies for smoother editing
                  </p>
                </div>
                <Switch
                  checked={localSettings.useProxy}
                  onCheckedChange={(checked) => handleSettingChange('useProxy', checked)}
                />
              </div>

              {localSettings.useProxy && (
                <div className="space-y-2 pl-4">
                  <Label>Proxy Resolution</Label>
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
                      <SelectItem value="1/2">1/2 Resolution</SelectItem>
                      <SelectItem value="1/4">1/4 Resolution</SelectItem>
                      <SelectItem value="1/8">1/8 Resolution</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Auto-save settings */}
            <div className="space-y-4">
              <h4 className="font-medium flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Auto-Save
              </h4>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Enable Auto-Save</Label>
                  <p className="text-xs text-muted-foreground">
                    Automatically save project at regular intervals
                  </p>
                </div>
                <Switch
                  checked={localSettings.autoSave}
                  onCheckedChange={(checked) => handleSettingChange('autoSave', checked)}
                />
              </div>

              {localSettings.autoSave && (
                <div className="space-y-2 pl-4">
                  <Label>Save Interval (minutes)</Label>
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
            Reset to Defaults
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              <Save className="h-4 w-4 mr-2" />
              Save Settings
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export { DEFAULT_SETTINGS as DEFAULT_PROJECT_SETTINGS };
export default ProjectSettingsPanel;
