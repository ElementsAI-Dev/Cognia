'use client';

/**
 * Recording Settings Panel
 *
 * Provides UI for configuring screen recording settings including
 * video format, codec, quality, audio, cursor, and hardware acceleration info.
 */

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import {
  Settings,
  Monitor,
  Mic,
  Volume2,
  MousePointer2,
  Timer,
  Cpu,
  HardDrive,
  Info,
  RotateCcw,
  Zap,
  AlertTriangle,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn, formatBytes } from '@/lib/utils';
import { useScreenRecordingStore } from '@/stores/media';
import { FFmpegStatus } from './ffmpeg-status';
import type { RecordingConfig } from '@/lib/native/screen-recording';

// ============== Preset Definitions ==============

export interface RecordingPreset {
  id: string;
  icon: React.ReactNode;
  config: Partial<RecordingConfig>;
}

const RECORDING_PRESETS: RecordingPreset[] = [
  {
    id: 'meeting',
    icon: <Monitor className="h-4 w-4" />,
    config: {
      format: 'mp4',
      codec: 'h264',
      frame_rate: 30,
      quality: 70,
      bitrate: 0,
      capture_system_audio: true,
      capture_microphone: true,
      show_cursor: true,
      highlight_clicks: false,
      countdown_seconds: 3,
    },
  },
  {
    id: 'tutorial',
    icon: <MousePointer2 className="h-4 w-4" />,
    config: {
      format: 'mp4',
      codec: 'h264',
      frame_rate: 30,
      quality: 85,
      bitrate: 0,
      capture_system_audio: false,
      capture_microphone: true,
      show_cursor: true,
      highlight_clicks: true,
      countdown_seconds: 3,
    },
  },
  {
    id: 'gaming',
    icon: <Zap className="h-4 w-4" />,
    config: {
      format: 'mp4',
      codec: 'h264',
      frame_rate: 60,
      quality: 90,
      bitrate: 0,
      capture_system_audio: true,
      capture_microphone: false,
      show_cursor: false,
      highlight_clicks: false,
      countdown_seconds: 3,
    },
  },
  {
    id: 'presentation',
    icon: <Monitor className="h-4 w-4" />,
    config: {
      format: 'mp4',
      codec: 'h264',
      frame_rate: 24,
      quality: 75,
      bitrate: 0,
      capture_system_audio: true,
      capture_microphone: true,
      show_cursor: true,
      highlight_clicks: true,
      countdown_seconds: 5,
    },
  },
];

// ============== Component ==============

interface RecordingSettingsPanelProps {
  className?: string;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function RecordingSettingsPanel({
  className,
  trigger,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: RecordingSettingsPanelProps) {
  const t = useTranslations('screenRecording.config');
  const tPresets = useTranslations('screenRecording.presets');
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;

  const {
    config,
    ffmpegAvailable,
    ffmpegInfo,
    ffmpegVersionOk,
    hardwareAcceleration,
    storageStats,
    storageUsagePercent,
    isStorageExceeded,
    updateConfig,
    refreshStorageStats,
    runStorageCleanup,
  } = useScreenRecordingStore();

  const [localConfig, setLocalConfig] = useState<RecordingConfig | null>(
    () => (open && config ? { ...config } : null)
  );

  const handleOpenChange = useCallback(
    (v: boolean) => {
      if (v && config) {
        setLocalConfig({ ...config });
      }
      if (controlledOnOpenChange) controlledOnOpenChange(v);
      if (!isControlled) setInternalOpen(v);
    },
    [controlledOnOpenChange, isControlled, config]
  );

  const updateField = useCallback(
    <K extends keyof RecordingConfig>(key: K, value: RecordingConfig[K]) => {
      setLocalConfig((prev) => (prev ? { ...prev, [key]: value } : prev));
    },
    []
  );

  const handleSave = useCallback(async () => {
    if (localConfig) {
      await updateConfig(localConfig);
      handleOpenChange(false);
    }
  }, [localConfig, updateConfig, handleOpenChange]);

  const handleApplyPreset = useCallback(
    (preset: RecordingPreset) => {
      setLocalConfig((prev) => (prev ? { ...prev, ...preset.config } : prev));
    },
    []
  );

  const handleReset = useCallback(() => {
    if (config) {
      setLocalConfig({ ...config });
    }
  }, [config]);

  const hwAccelLabels = hardwareAcceleration
    ? [
        hardwareAcceleration.nvidia && 'NVIDIA NVENC',
        hardwareAcceleration.intel_qsv && 'Intel QSV',
        hardwareAcceleration.amd_amf && 'AMD AMF',
        hardwareAcceleration.vaapi && 'VAAPI',
      ].filter(Boolean)
    : [];

  if (!localConfig) return null;

  const defaultTrigger = (
    <Button variant="ghost" size="sm" className={className}>
      <Settings className="h-4 w-4 mr-2" />
      {t('title')}
    </Button>
  );

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>{trigger || defaultTrigger}</SheetTrigger>
      <SheetContent className="w-full sm:max-w-lg p-0">
        <SheetHeader className="px-6 pt-6 pb-2">
          <SheetTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            {t('title')}
          </SheetTitle>
          <SheetDescription>
            {t('description')}
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-10rem)] px-6">
          <div className="space-y-6 pb-6">
            {/* Presets */}
            <section>
              <Label className="text-sm font-medium mb-3 block">
                {tPresets('title')}
              </Label>
              <div className="grid grid-cols-2 gap-2">
                {RECORDING_PRESETS.map((preset) => (
                  <Button
                    key={preset.id}
                    variant="outline"
                    size="sm"
                    className="justify-start gap-2 h-auto py-2"
                    onClick={() => handleApplyPreset(preset)}
                  >
                    {preset.icon}
                    <span>{tPresets(preset.id)}</span>
                  </Button>
                ))}
              </div>
            </section>

            <Separator />

            {/* Video Settings */}
            <section className="space-y-4">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Monitor className="h-4 w-4" />
                {t('videoSection')}
              </Label>

              {/* Format */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">{t('format')}</Label>
                  <Select
                    value={localConfig.format}
                    onValueChange={(v) => updateField('format', v)}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mp4">MP4</SelectItem>
                      <SelectItem value="mkv">MKV</SelectItem>
                      <SelectItem value="webm">WebM</SelectItem>
                      <SelectItem value="avi">AVI</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Codec */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">{t('codec')}</Label>
                  <Select
                    value={localConfig.codec}
                    onValueChange={(v) => updateField('codec', v)}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="h264">H.264</SelectItem>
                      <SelectItem value="h265">H.265 (HEVC)</SelectItem>
                      <SelectItem value="vp9">VP9</SelectItem>
                      <SelectItem value="av1">AV1</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Frame Rate */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground">{t('frameRate')}</Label>
                  <span className="text-xs font-mono text-muted-foreground">
                    {localConfig.frame_rate} fps
                  </span>
                </div>
                <Select
                  value={String(localConfig.frame_rate)}
                  onValueChange={(v) => updateField('frame_rate', Number(v))}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 fps</SelectItem>
                    <SelectItem value="24">24 fps</SelectItem>
                    <SelectItem value="30">30 fps</SelectItem>
                    <SelectItem value="60">60 fps</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Quality */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground">{t('quality')}</Label>
                  <span className="text-xs font-mono text-muted-foreground">
                    {localConfig.quality}%
                  </span>
                </div>
                <Slider
                  value={[localConfig.quality]}
                  onValueChange={([v]) => updateField('quality', v)}
                  min={10}
                  max={100}
                  step={5}
                  className="w-full"
                />
              </div>
            </section>

            <Separator />

            {/* Audio Settings */}
            <section className="space-y-4">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Volume2 className="h-4 w-4" />
                {t('audio')}
              </Label>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm flex items-center gap-2">
                    <Volume2 className="h-3.5 w-3.5 text-muted-foreground" />
                    {t('captureSystemAudio')}
                  </Label>
                  <Switch
                    checked={localConfig.capture_system_audio}
                    onCheckedChange={(v) => updateField('capture_system_audio', v)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label className="text-sm flex items-center gap-2">
                    <Mic className="h-3.5 w-3.5 text-muted-foreground" />
                    {t('captureMicrophone')}
                  </Label>
                  <Switch
                    checked={localConfig.capture_microphone}
                    onCheckedChange={(v) => updateField('capture_microphone', v)}
                  />
                </div>
              </div>
            </section>

            <Separator />

            {/* Cursor Settings */}
            <section className="space-y-4">
              <Label className="text-sm font-medium flex items-center gap-2">
                <MousePointer2 className="h-4 w-4" />
                {t('cursor')}
              </Label>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">{t('showCursor')}</Label>
                  <Switch
                    checked={localConfig.show_cursor}
                    onCheckedChange={(v) => updateField('show_cursor', v)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label className="text-sm">{t('highlightClicks')}</Label>
                  <Switch
                    checked={localConfig.highlight_clicks}
                    onCheckedChange={(v) => updateField('highlight_clicks', v)}
                  />
                </div>
              </div>
            </section>

            <Separator />

            {/* Recording Options */}
            <section className="space-y-4">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Timer className="h-4 w-4" />
                {t('countdown')}
              </Label>

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-muted-foreground">
                      {t('countdownSeconds')}
                    </Label>
                    <span className="text-xs font-mono text-muted-foreground">
                      {localConfig.countdown_seconds}s
                    </span>
                  </div>
                  <Slider
                    value={[localConfig.countdown_seconds]}
                    onValueChange={([v]) => updateField('countdown_seconds', v)}
                    min={0}
                    max={10}
                    step={1}
                    className="w-full"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label className="text-sm">{t('showIndicator')}</Label>
                  <Switch
                    checked={localConfig.show_indicator}
                    onCheckedChange={(v) => updateField('show_indicator', v)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label className="text-sm">{t('pauseOnMinimize')}</Label>
                  <Switch
                    checked={localConfig.pause_on_minimize}
                    onCheckedChange={(v) => updateField('pause_on_minimize', v)}
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-muted-foreground">
                      {t('maxDuration')}
                    </Label>
                    <span className="text-xs font-mono text-muted-foreground">
                      {localConfig.max_duration === 0
                        ? t('maxDurationUnlimited')
                        : `${localConfig.max_duration}s`}
                    </span>
                  </div>
                  <Slider
                    value={[localConfig.max_duration]}
                    onValueChange={([v]) => updateField('max_duration', v)}
                    min={0}
                    max={3600}
                    step={60}
                    className="w-full"
                  />
                </div>
              </div>
            </section>

            <Separator />

            {/* System Info */}
            <section className="space-y-3">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Info className="h-4 w-4" />
                {t('systemInfo')}
              </Label>

              {/* FFmpeg Status */}
              <FFmpegStatus compact showWhenAvailable />

              {/* Hardware Acceleration */}
              {ffmpegAvailable && (
                <div className="rounded-lg border p-3 space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Cpu className="h-4 w-4" />
                    {t('hwAcceleration')}
                  </div>
                  {hwAccelLabels.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {hwAccelLabels.map((label) => (
                        <Badge key={String(label)} variant="secondary" className="text-xs">
                          {String(label)}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      {t('noHwAcceleration')}
                    </p>
                  )}
                </div>
              )}

              {/* FFmpeg Version Info */}
              {ffmpegInfo && (
                <div className="rounded-lg border p-3 space-y-1 text-xs text-muted-foreground">
                  {ffmpegInfo.version && (
                    <div className="flex items-center justify-between">
                      <span>FFmpeg</span>
                      <span className={cn('font-mono', !ffmpegVersionOk && 'text-amber-500')}>
                        v{ffmpegInfo.version}
                      </span>
                    </div>
                  )}
                  {ffmpegInfo.path && (
                    <div className="flex items-center justify-between">
                      <span>{t('path')}</span>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="font-mono truncate max-w-[200px]">
                            {ffmpegInfo.path}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>{ffmpegInfo.path}</TooltipContent>
                      </Tooltip>
                    </div>
                  )}
                  {ffmpegInfo.encoders.length > 0 && (
                    <div className="flex items-center justify-between">
                      <span>{t('encoders')}</span>
                      <span className="font-mono">{ffmpegInfo.encoders.length}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Storage Management */}
              <div className="rounded-lg border p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <HardDrive className="h-4 w-4" />
                    {t('storage')}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs"
                    onClick={() => refreshStorageStats()}
                  >
                    <RotateCcw className="h-3 w-3" />
                  </Button>
                </div>

                {/* Usage Bar */}
                {storageStats && (
                  <>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{t('storageUsed')}</span>
                        <span className="font-mono">
                          {Math.round(storageUsagePercent)}%
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className={cn(
                            'h-full rounded-full transition-all',
                            isStorageExceeded
                              ? 'bg-destructive'
                              : storageUsagePercent > 80
                                ? 'bg-amber-500'
                                : 'bg-primary'
                          )}
                          style={{ width: `${Math.min(storageUsagePercent, 100)}%` }}
                        />
                      </div>
                    </div>

                    {/* Breakdown */}
                    <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                      <div className="flex items-center justify-between">
                        <span>{t('recordings')}</span>
                        <span className="font-mono">
                          {formatBytes(storageStats.recordingsSize)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>{t('screenshots')}</span>
                        <span className="font-mono">
                          {formatBytes(storageStats.screenshotsSize)}
                        </span>
                      </div>
                    </div>

                    {/* Storage Exceeded Warning */}
                    {isStorageExceeded && (
                      <div className="flex items-center gap-2 text-xs text-destructive">
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                        <span>{t('storageExceeded')}</span>
                      </div>
                    )}

                    {/* Cleanup Button */}
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-xs h-7"
                      onClick={async () => {
                        const result = await runStorageCleanup();
                        if (result) {
                          await refreshStorageStats();
                        }
                      }}
                    >
                      <Trash2 className="h-3 w-3 mr-1.5" />
                      {t('cleanup')}
                    </Button>
                  </>
                )}

                {/* Save Directory */}
                <div className="pt-1 border-t">
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium">{t('saveDirectory')}: </span>
                    <span className="font-mono truncate">
                      {localConfig.save_directory || t('defaultDirectory')}
                    </span>
                  </p>
                </div>
              </div>
            </section>
          </div>
        </ScrollArea>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t px-6 py-3">
          <Button variant="ghost" size="sm" onClick={handleReset}>
            <RotateCcw className="h-4 w-4 mr-2" />
            {t('reset')}
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => handleOpenChange(false)}>
              {t('cancel')}
            </Button>
            <Button size="sm" onClick={handleSave}>
              {t('save')}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
