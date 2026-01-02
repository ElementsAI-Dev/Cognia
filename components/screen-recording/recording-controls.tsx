'use client';

/**
 * Recording Controls Component
 * 
 * Provides UI for controlling screen recording
 */

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import {
  Video,
  VideoOff,
  Pause,
  Play,
  Square,
  Circle,
  Monitor,
  AppWindow,
  Maximize2,
  Settings,
  AlertCircle,
  Check,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import {
  useScreenRecordingStore,
  useIsRecording,
  type RecordingMode,
} from '@/stores/media';
import { formatDuration, type RecordingRegion } from '@/lib/native/screen-recording';
import { isTauri } from '@/lib/native/utils';
import { RegionSelector } from './region-selector';

interface RecordingControlsProps {
  compact?: boolean;
  showSettings?: boolean;
  className?: string;
}

export function RecordingControls({
  compact = false,
  showSettings = true,
  className,
}: RecordingControlsProps) {
  const t = useTranslations('screenRecording');
  const [showModeMenu, setShowModeMenu] = useState(false);
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [showRegionSelector, setShowRegionSelector] = useState(false);

  const {
    status,
    duration,
    monitors,
    selectedMode,
    selectedMonitor,
    ffmpegAvailable,
    isLoading,
    isInitialized,
    error,
    initialize,
    startRecording,
    pause,
    resume,
    stop,
    cancel,
    updateDuration,
    setSelectedMonitor,
    clearError,
  } = useScreenRecordingStore();

  const isRecording = useIsRecording();

  // Initialize on mount
  useEffect(() => {
    if (isTauri() && !isInitialized) {
      initialize();
    }
  }, [initialize, isInitialized]);

  // Update duration while recording
  useEffect(() => {
    if (status !== 'Recording') return;
    
    const interval = setInterval(() => {
      updateDuration();
    }, 100);

    return () => clearInterval(interval);
  }, [status, updateDuration]);

  // Show error dialog based on error state
  const errorDialogOpen = showErrorDialog || !!error;

  const handleStartRecording = useCallback(async (mode: RecordingMode, region?: RecordingRegion) => {
    setShowModeMenu(false);
    
    if (mode === 'region' && !region) {
      // Show region selector for user to draw the area
      setShowRegionSelector(true);
      return;
    }
    
    await startRecording(mode, {
      monitorIndex: selectedMonitor ?? undefined,
      region,
    });
  }, [startRecording, selectedMonitor]);

  const handleRegionSelected = useCallback(async (region: RecordingRegion) => {
    setShowRegionSelector(false);
    await startRecording('region', { region });
  }, [startRecording]);

  const handleRegionCancel = useCallback(() => {
    setShowRegionSelector(false);
  }, []);

  const handleStopRecording = useCallback(async () => {
    await stop();
  }, [stop]);

  const handleTogglePause = useCallback(async () => {
    if (status === 'Paused') {
      await resume();
    } else {
      await pause();
    }
  }, [status, pause, resume]);

  const handleCancel = useCallback(async () => {
    await cancel();
  }, [cancel]);

  // Not available in web
  if (!isTauri()) {
    return null;
  }

  // Not initialized yet
  if (!isInitialized) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // FFmpeg not available
  if (!ffmpegAvailable) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size={compact ? 'icon' : 'sm'}
            className={cn('text-muted-foreground', className)}
            disabled
          >
            <VideoOff className="h-4 w-4" />
            {!compact && <span className="ml-2">{t('unavailable')}</span>}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{t('ffmpegRequired')}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  // Recording in progress
  if (isRecording) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        {/* Recording indicator */}
        <Badge 
          variant="destructive" 
          className="flex items-center gap-1.5 animate-pulse"
        >
          <Circle className="h-2 w-2 fill-current" />
          {status === 'Countdown' ? (
            t('countdown')
          ) : status === 'Paused' ? (
            t('paused')
          ) : (
            formatDuration(duration)
          )}
        </Badge>

        {/* Pause/Resume button */}
        {status !== 'Countdown' && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleTogglePause}
                disabled={isLoading}
              >
                {status === 'Paused' ? (
                  <Play className="h-4 w-4" />
                ) : (
                  <Pause className="h-4 w-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {status === 'Paused' ? t('resume') : t('pause')}
            </TooltipContent>
          </Tooltip>
        )}

        {/* Stop button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="destructive"
              size="icon"
              className="h-8 w-8"
              onClick={handleStopRecording}
              disabled={isLoading || status === 'Countdown'}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Square className="h-4 w-4" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t('stop')}</TooltipContent>
        </Tooltip>

        {/* Cancel button */}
        {status === 'Countdown' && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={handleCancel}
              >
                <VideoOff className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('cancel')}</TooltipContent>
          </Tooltip>
        )}
      </div>
    );
  }

  // Idle state - show start recording button
  return (
    <>
      <div className={cn('flex items-center gap-2', className)}>
        <DropdownMenu open={showModeMenu} onOpenChange={setShowModeMenu}>
          <DropdownMenuTrigger asChild>
            <Button
              variant={compact ? 'ghost' : 'outline'}
              size={compact ? 'icon' : 'sm'}
              className={compact ? 'h-8 w-8' : ''}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Video className="h-4 w-4" />
              )}
              {!compact && <span className="ml-2">{t('record')}</span>}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>{t('selectMode')}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            
            {/* Fullscreen */}
            <DropdownMenuItem
              onClick={() => handleStartRecording('fullscreen')}
              className="flex items-center gap-2"
            >
              <Monitor className="h-4 w-4" />
              <div className="flex flex-col">
                <span>{t('fullscreen')}</span>
                <span className="text-xs text-muted-foreground">
                  {monitors.find(m => m.index === selectedMonitor)?.name || t('primaryMonitor')}
                </span>
              </div>
              {selectedMode === 'fullscreen' && (
                <Check className="h-4 w-4 ml-auto" />
              )}
            </DropdownMenuItem>

            {/* Window */}
            <DropdownMenuItem
              onClick={() => handleStartRecording('window')}
              className="flex items-center gap-2"
            >
              <AppWindow className="h-4 w-4" />
              <span>{t('window')}</span>
              {selectedMode === 'window' && (
                <Check className="h-4 w-4 ml-auto" />
              )}
            </DropdownMenuItem>

            {/* Region */}
            <DropdownMenuItem
              onClick={() => handleStartRecording('region')}
              className="flex items-center gap-2"
            >
              <Maximize2 className="h-4 w-4" />
              <span>{t('region')}</span>
              {selectedMode === 'region' && (
                <Check className="h-4 w-4 ml-auto" />
              )}
            </DropdownMenuItem>

            {/* Monitor selection */}
            {monitors.length > 1 && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-xs">
                  {t('selectMonitor')}
                </DropdownMenuLabel>
                {monitors.map((monitor) => (
                  <DropdownMenuItem
                    key={monitor.index}
                    onClick={() => setSelectedMonitor(monitor.index)}
                    className="flex items-center gap-2"
                  >
                    <Monitor className="h-4 w-4" />
                    <span>{monitor.name}</span>
                    {monitor.is_primary && (
                      <Badge variant="secondary" className="text-[10px] h-4">
                        {t('primary')}
                      </Badge>
                    )}
                    {selectedMonitor === monitor.index && (
                      <Check className="h-4 w-4 ml-auto" />
                    )}
                  </DropdownMenuItem>
                ))}
              </>
            )}

            {showSettings && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  <span>{t('settings')}</span>
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Region selector overlay */}
      {showRegionSelector && (
        <RegionSelector
          onSelect={handleRegionSelected}
          onCancel={handleRegionCancel}
        />
      )}

      {/* Error dialog */}
      <Dialog open={errorDialogOpen} onOpenChange={(open) => {
        setShowErrorDialog(open);
        if (!open) clearError();
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              {t('error')}
            </DialogTitle>
            <DialogDescription>{error}</DialogDescription>
          </DialogHeader>
          <div className="flex justify-end">
            <Button
              variant="outline"
              onClick={() => {
                setShowErrorDialog(false);
                clearError();
              }}
            >
              {t('ok')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default RecordingControls;
