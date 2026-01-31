'use client';

import Link from 'next/link';
import {
  ArrowLeft,
  Sparkles,
  Film,
  Disc,
  Clock,
  Monitor,
  Loader2,
  Pause,
  Play,
  Square,
  Circle,
  X,
  RefreshCw,
  PanelLeftClose,
  PanelLeft,
  Scissors,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { StudioMode } from '@/types/video-studio/types';

interface MonitorInfo {
  index: number;
  name?: string;
  is_primary?: boolean;
}

export interface VideoStudioHeaderProps {
  studioMode: StudioMode;
  onStudioModeChange: (mode: StudioMode) => void;
  showSidebar: boolean;
  onToggleSidebar: () => void;
  // Recording props
  isRecordingAvailable?: boolean;
  isRecording?: boolean;
  isPaused?: boolean;
  isCountdown?: boolean;
  isProcessing?: boolean;
  recordingDuration?: number;
  monitors?: MonitorInfo[];
  selectedMonitor?: number | null;
  onSelectMonitor?: (index: number) => void;
  onStartRecording?: () => void;
  onPauseRecording?: () => void;
  onResumeRecording?: () => void;
  onStopRecording?: () => void;
  onCancelRecording?: () => void;
  onRefreshHistory?: () => void;
  formatRecordingDuration?: (ms: number) => string;
  // Translations
  t: (key: string) => string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tEditor: (key: string, values?: any) => string;
  tGen: (key: string) => string;
}

export function VideoStudioHeader({
  studioMode,
  onStudioModeChange,
  showSidebar,
  onToggleSidebar,
  isRecordingAvailable = false,
  isRecording = false,
  isPaused = false,
  isCountdown = false,
  isProcessing = false,
  recordingDuration = 0,
  monitors = [],
  selectedMonitor,
  onSelectMonitor,
  onStartRecording,
  onPauseRecording,
  onResumeRecording,
  onStopRecording,
  onCancelRecording,
  onRefreshHistory,
  formatRecordingDuration,
  t,
  tEditor,
  tGen,
}: VideoStudioHeaderProps) {
  return (
    <header className="flex items-center justify-between border-b px-2 sm:px-4 py-2 shrink-0">
      <div className="flex items-center gap-2 sm:gap-4">
        <Link href="/">
          <Button variant="ghost" size="sm" className="px-2 sm:px-3">
            <ArrowLeft className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">{t('back')}</span>
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 sm:h-7 sm:w-7 rounded-md bg-linear-to-br from-blue-500 to-purple-500 flex items-center justify-center">
            <Film className="h-3 w-3 sm:h-4 sm:w-4 text-white" />
          </div>
          <h1 className="font-semibold text-sm sm:text-base">{t('title')}</h1>
        </div>

        {/* Mode Selector */}
        <div className="hidden sm:flex items-center gap-1 ml-4 bg-muted rounded-lg p-1">
          <Button
            variant={studioMode === 'recording' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onStudioModeChange('recording')}
            className="h-7"
          >
            <Disc className="h-3 w-3 mr-1" />
            {tEditor('recording')}
          </Button>
          <Button
            variant={studioMode === 'ai-generation' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onStudioModeChange('ai-generation')}
            className="h-7"
          >
            <Sparkles className="h-3 w-3 mr-1" />
            {tGen('aiGeneration')}
          </Button>
          <Button
            variant={studioMode === 'editor' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onStudioModeChange('editor')}
            className="h-7"
          >
            <Scissors className="h-3 w-3 mr-1" />
            {t('editor')}
          </Button>
        </div>
      </div>

      <Separator orientation="vertical" className="h-6 hidden sm:block" />

      {/* Recording Controls (only in recording mode and when available) */}
      {studioMode === 'recording' && isRecordingAvailable && (
        <div className="flex items-center gap-2">
          {/* Monitor Selection */}
          {!isRecording && monitors.length > 1 && onSelectMonitor && (
            <Select
              value={selectedMonitor?.toString() ?? '0'}
              onValueChange={(v) => onSelectMonitor(parseInt(v))}
            >
              <SelectTrigger className="w-32 h-8 text-xs">
                <Monitor className="h-3 w-3 mr-1" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {monitors.map((monitor) => (
                  <SelectItem key={monitor.index} value={monitor.index.toString()}>
                    {monitor.is_primary
                      ? tEditor('primaryMonitor')
                      : tEditor('monitor', { index: monitor.index + 1 })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Recording Status */}
          {isRecording && formatRecordingDuration && (
            <div className="flex items-center gap-2 px-2 py-1 bg-red-500/10 border border-red-500/20 rounded-md">
              <Disc className={cn('h-3 w-3 text-red-500', !isPaused && 'animate-pulse')} />
              <span className="text-xs font-medium text-red-500">
                {formatRecordingDuration(recordingDuration)}
              </span>
            </div>
          )}

          {isCountdown && (
            <div className="flex items-center gap-2 px-2 py-1 bg-yellow-500/10 border border-yellow-500/20 rounded-md">
              <Clock className="h-3 w-3 text-yellow-500 animate-pulse" />
              <span className="text-xs font-medium text-yellow-500">
                {tEditor('countdown')}
              </span>
            </div>
          )}

          {isProcessing && (
            <div className="flex items-center gap-2 px-2 py-1 bg-blue-500/10 border border-blue-500/20 rounded-md">
              <Loader2 className="h-3 w-3 text-blue-500 animate-spin" />
              <span className="text-xs font-medium text-blue-500">
                {tEditor('processing')}
              </span>
            </div>
          )}

          {/* Start Recording */}
          {!isRecording && !isCountdown && !isProcessing && onStartRecording && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="default"
                  size="sm"
                  className="bg-red-500 hover:bg-red-600 text-white"
                  onClick={onStartRecording}
                >
                  <Circle className="h-3 w-3 mr-1 fill-current" />
                  <span className="hidden sm:inline">{tEditor('startRecording')}</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {tEditor('startRecordingTooltip')}
              </TooltipContent>
            </Tooltip>
          )}

          {/* Pause/Resume */}
          {isRecording && !isPaused && onPauseRecording && (
            <Button variant="outline" size="sm" onClick={onPauseRecording}>
              <Pause className="h-3 w-3 mr-1" />
              <span className="hidden sm:inline">{tEditor('pause')}</span>
            </Button>
          )}

          {isRecording && isPaused && onResumeRecording && (
            <Button variant="outline" size="sm" onClick={onResumeRecording}>
              <Play className="h-3 w-3 mr-1" />
              <span className="hidden sm:inline">{tEditor('resume')}</span>
            </Button>
          )}

          {/* Stop Recording */}
          {isRecording && onStopRecording && onCancelRecording && (
            <>
              <Button variant="destructive" size="sm" onClick={onStopRecording}>
                <Square className="h-3 w-3 mr-1 fill-current" />
                <span className="hidden sm:inline">{tEditor('stop')}</span>
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onCancelRecording}>
                <X className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      )}

      <div className="flex items-center gap-2">
        {studioMode === 'recording' && onRefreshHistory && (
          <Button variant="ghost" size="icon" onClick={onRefreshHistory}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        )}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={onToggleSidebar}>
              {showSidebar ? (
                <PanelLeftClose className="h-4 w-4" />
              ) : (
                <PanelLeft className="h-4 w-4" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {showSidebar ? t('hideSidebar') : t('showSidebar')}
          </TooltipContent>
        </Tooltip>
      </div>
    </header>
  );
}
