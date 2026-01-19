'use client';

/**
 * ExportDialog - Video export settings dialog
 * 
 * Features:
 * - Format selection (MP4, WebM, MOV, GIF)
 * - Resolution and quality settings
 * - Codec options
 * - Audio settings
 * - Export presets
 */

import { useState, useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Download,
  Film,
  Music,
  Settings2,
  Zap,
  HardDrive,
} from 'lucide-react';

export interface ExportSettings {
  format: 'mp4' | 'webm' | 'mov' | 'gif';
  resolution: '480p' | '720p' | '1080p' | '4k' | 'custom';
  customWidth?: number;
  customHeight?: number;
  fps: number;
  quality: 'low' | 'medium' | 'high' | 'ultra';
  bitrate?: number;
  codec: string;
  includeAudio: boolean;
  audioCodec: string;
  audioBitrate: number;
  audioSampleRate: number;
  preset: string;
  outputPath?: string;
  filename: string;
}

export interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectName: string;
  duration: number;
  onExport: (settings: ExportSettings) => void;
  className?: string;
}

const FORMAT_OPTIONS = [
  { value: 'mp4', label: 'MP4 (H.264)', description: 'Best compatibility' },
  { value: 'webm', label: 'WebM (VP9)', description: 'Web optimized' },
  { value: 'mov', label: 'MOV (ProRes)', description: 'Professional editing' },
  { value: 'gif', label: 'GIF', description: 'Animated image' },
];

const RESOLUTION_OPTIONS = [
  { value: '480p', label: '480p', width: 854, height: 480 },
  { value: '720p', label: '720p HD', width: 1280, height: 720 },
  { value: '1080p', label: '1080p Full HD', width: 1920, height: 1080 },
  { value: '4k', label: '4K Ultra HD', width: 3840, height: 2160 },
  { value: 'custom', label: 'Custom', width: 0, height: 0 },
];

const QUALITY_OPTIONS = [
  { value: 'low', label: 'Low', description: 'Smaller file size' },
  { value: 'medium', label: 'Medium', description: 'Balanced' },
  { value: 'high', label: 'High', description: 'Better quality' },
  { value: 'ultra', label: 'Ultra', description: 'Maximum quality' },
];

const PRESETS = [
  { value: 'youtube', label: 'YouTube', format: 'mp4', resolution: '1080p', quality: 'high' },
  { value: 'instagram', label: 'Instagram', format: 'mp4', resolution: '1080p', quality: 'high' },
  { value: 'tiktok', label: 'TikTok', format: 'mp4', resolution: '1080p', quality: 'high' },
  { value: 'twitter', label: 'Twitter/X', format: 'mp4', resolution: '720p', quality: 'medium' },
  { value: 'web', label: 'Web', format: 'webm', resolution: '720p', quality: 'medium' },
  { value: 'archive', label: 'Archive', format: 'mov', resolution: '4k', quality: 'ultra' },
  { value: 'custom', label: 'Custom', format: 'mp4', resolution: '1080p', quality: 'high' },
];

const DEFAULT_SETTINGS: ExportSettings = {
  format: 'mp4',
  resolution: '1080p',
  fps: 30,
  quality: 'high',
  codec: 'h264',
  includeAudio: true,
  audioCodec: 'aac',
  audioBitrate: 192,
  audioSampleRate: 48000,
  preset: 'custom',
  filename: 'export',
};

export function ExportDialog({
  open,
  onOpenChange,
  projectName,
  duration,
  onExport,
  className,
}: ExportDialogProps) {
  const [settings, setSettings] = useState<ExportSettings>({
    ...DEFAULT_SETTINGS,
    filename: projectName.replace(/[^a-zA-Z0-9-_]/g, '_'),
  });
  const [activeTab, setActiveTab] = useState('video');

  const updateSettings = useCallback((updates: Partial<ExportSettings>) => {
    setSettings((prev) => ({ ...prev, ...updates }));
  }, []);

  const handlePresetChange = useCallback((presetValue: string) => {
    const preset = PRESETS.find((p) => p.value === presetValue);
    if (preset) {
      updateSettings({
        preset: presetValue,
        format: preset.format as ExportSettings['format'],
        resolution: preset.resolution as ExportSettings['resolution'],
        quality: preset.quality as ExportSettings['quality'],
      });
    }
  }, [updateSettings]);

  const estimatedFileSize = useMemo(() => {
    const resOption = RESOLUTION_OPTIONS.find((r) => r.value === settings.resolution);
    const width = settings.customWidth || resOption?.width || 1920;
    const height = settings.customHeight || resOption?.height || 1080;
    
    const qualityMultiplier = {
      low: 0.5,
      medium: 1,
      high: 2,
      ultra: 4,
    }[settings.quality];

    const baseBitrate = (width * height * settings.fps * qualityMultiplier) / 10000;
    const videoBits = baseBitrate * duration * 1000;
    const audioBits = settings.includeAudio ? settings.audioBitrate * duration * 1000 : 0;
    const totalBytes = (videoBits + audioBits) / 8;

    if (totalBytes > 1024 * 1024 * 1024) {
      return `~${(totalBytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
    }
    return `~${(totalBytes / (1024 * 1024)).toFixed(0)} MB`;
  }, [settings, duration]);

  const handleExport = useCallback(() => {
    onExport(settings);
    onOpenChange(false);
  }, [settings, onExport, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn('max-w-2xl', className)}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export Video
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Preset selector */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Preset
            </Label>
            <Select value={settings.preset} onValueChange={handlePresetChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRESETS.map((preset) => (
                  <SelectItem key={preset.value} value={preset.value}>
                    {preset.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Filename */}
          <div className="space-y-2">
            <Label>Filename</Label>
            <div className="flex gap-2">
              <Input
                value={settings.filename}
                onChange={(e) => updateSettings({ filename: e.target.value })}
                placeholder="Enter filename"
                className="flex-1"
              />
              <span className="flex items-center text-muted-foreground">
                .{settings.format}
              </span>
            </div>
          </div>

          {/* Tabs for detailed settings */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="video" className="flex items-center gap-1">
                <Film className="h-3 w-3" />
                Video
              </TabsTrigger>
              <TabsTrigger value="audio" className="flex items-center gap-1">
                <Music className="h-3 w-3" />
                Audio
              </TabsTrigger>
              <TabsTrigger value="advanced" className="flex items-center gap-1">
                <Settings2 className="h-3 w-3" />
                Advanced
              </TabsTrigger>
            </TabsList>

            <TabsContent value="video" className="space-y-4 mt-4">
              {/* Format */}
              <div className="space-y-2">
                <Label>Format</Label>
                <Select
                  value={settings.format}
                  onValueChange={(v) => updateSettings({ format: v as ExportSettings['format'] })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FORMAT_OPTIONS.map((format) => (
                      <SelectItem key={format.value} value={format.value}>
                        <div>
                          <span>{format.label}</span>
                          <span className="text-xs text-muted-foreground ml-2">
                            {format.description}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Resolution */}
              <div className="space-y-2">
                <Label>Resolution</Label>
                <Select
                  value={settings.resolution}
                  onValueChange={(v) => updateSettings({ resolution: v as ExportSettings['resolution'] })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RESOLUTION_OPTIONS.map((res) => (
                      <SelectItem key={res.value} value={res.value}>
                        {res.label}
                        {res.width > 0 && (
                          <span className="text-xs text-muted-foreground ml-2">
                            ({res.width}x{res.height})
                          </span>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {settings.resolution === 'custom' && (
                  <div className="flex gap-2 mt-2">
                    <Input
                      type="number"
                      value={settings.customWidth || ''}
                      onChange={(e) => updateSettings({ customWidth: parseInt(e.target.value) })}
                      placeholder="Width"
                      className="w-24"
                    />
                    <span className="flex items-center">×</span>
                    <Input
                      type="number"
                      value={settings.customHeight || ''}
                      onChange={(e) => updateSettings({ customHeight: parseInt(e.target.value) })}
                      placeholder="Height"
                      className="w-24"
                    />
                  </div>
                )}
              </div>

              {/* FPS */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Frame Rate</Label>
                  <span className="text-sm text-muted-foreground">{settings.fps} fps</span>
                </div>
                <Slider
                  value={[settings.fps]}
                  onValueChange={(v) => updateSettings({ fps: v[0] })}
                  min={15}
                  max={60}
                  step={1}
                />
              </div>

              {/* Quality */}
              <div className="space-y-2">
                <Label>Quality</Label>
                <div className="grid grid-cols-4 gap-2">
                  {QUALITY_OPTIONS.map((quality) => (
                    <Button
                      key={quality.value}
                      variant={settings.quality === quality.value ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => updateSettings({ quality: quality.value as ExportSettings['quality'] })}
                    >
                      {quality.label}
                    </Button>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="audio" className="space-y-4 mt-4">
              {/* Include Audio */}
              <div className="flex items-center justify-between">
                <Label>Include Audio</Label>
                <Switch
                  checked={settings.includeAudio}
                  onCheckedChange={(checked) => updateSettings({ includeAudio: checked })}
                />
              </div>

              {settings.includeAudio && (
                <>
                  {/* Audio Bitrate */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Audio Bitrate</Label>
                      <span className="text-sm text-muted-foreground">
                        {settings.audioBitrate} kbps
                      </span>
                    </div>
                    <Slider
                      value={[settings.audioBitrate]}
                      onValueChange={(v) => updateSettings({ audioBitrate: v[0] })}
                      min={64}
                      max={320}
                      step={32}
                    />
                  </div>

                  {/* Sample Rate */}
                  <div className="space-y-2">
                    <Label>Sample Rate</Label>
                    <Select
                      value={settings.audioSampleRate.toString()}
                      onValueChange={(v) => updateSettings({ audioSampleRate: parseInt(v) })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="44100">44.1 kHz</SelectItem>
                        <SelectItem value="48000">48 kHz</SelectItem>
                        <SelectItem value="96000">96 kHz</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
            </TabsContent>

            <TabsContent value="advanced" className="space-y-4 mt-4">
              <div className="text-sm text-muted-foreground">
                Advanced encoding options for fine-tuned control.
              </div>

              {/* Video Codec */}
              <div className="space-y-2">
                <Label>Video Codec</Label>
                <Select
                  value={settings.codec}
                  onValueChange={(v) => updateSettings({ codec: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="h264">H.264 (AVC)</SelectItem>
                    <SelectItem value="h265">H.265 (HEVC)</SelectItem>
                    <SelectItem value="vp9">VP9</SelectItem>
                    <SelectItem value="av1">AV1</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Custom Bitrate */}
              <div className="space-y-2">
                <Label>Custom Video Bitrate (optional)</Label>
                <Input
                  type="number"
                  value={settings.bitrate || ''}
                  onChange={(e) =>
                    updateSettings({ bitrate: e.target.value ? parseInt(e.target.value) : undefined })
                  }
                  placeholder="Auto"
                />
                <p className="text-xs text-muted-foreground">
                  Leave empty for automatic bitrate based on quality settings
                </p>
              </div>
            </TabsContent>
          </Tabs>

          {/* Estimated file size */}
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div className="flex items-center gap-2">
              <HardDrive className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Estimated Size</span>
            </div>
            <span className="font-medium">{estimatedFileSize}</span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ExportDialog;
