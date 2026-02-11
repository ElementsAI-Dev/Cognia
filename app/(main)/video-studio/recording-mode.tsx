'use client';

/**
 * RecordingModeContent - Recording mode UI for Video Studio
 *
 * Renders the recording mode content area including:
 * - Video preview with zoom controls
 * - Playback controls
 * - Trim & export controls
 * - Empty state with keyboard shortcuts
 * - Trim and delete dialogs
 */

import { useEffect } from 'react';
import {
  Download,
  Loader2,
  Clock,
  Film,
  Monitor,
  Scissors,
  HardDrive,
  Circle,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { formatDuration } from '@/lib/utils';
import {
  VideoPreview,
  PlaybackControls,
  ZoomControls,
  VideoTrimmer,
  DeleteConfirmDialog,
} from '@/components/video-studio';
import type { UseRecordingModeReturn } from '@/hooks/video-studio/use-recording-mode';

interface RecordingModeContentProps {
  rec: UseRecordingModeReturn;
  tEditor: (key: string, values?: Record<string, unknown>) => string;
}

export function RecordingModeContent({ rec, tEditor }: RecordingModeContentProps) {
  // Keyboard shortcuts for video playback
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!rec.selectedRecording) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch (e.key) {
        case ' ':
        case 'k':
          e.preventDefault();
          rec.togglePlay();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          if (rec.videoRef.current) {
            const newTime = Math.max(0, rec.currentTime / 1000 - 5);
            rec.handleSeek(newTime);
          }
          break;
        case 'ArrowRight':
          e.preventDefault();
          if (rec.videoRef.current) {
            const newTime = Math.min(rec.videoDuration / 1000, rec.currentTime / 1000 + 5);
            rec.handleSeek(newTime);
          }
          break;
        case 'ArrowUp':
          e.preventDefault();
          rec.handleVolumeChange(Math.min(1, rec.volume + 0.1));
          break;
        case 'ArrowDown':
          e.preventDefault();
          rec.handleVolumeChange(Math.max(0, rec.volume - 0.1));
          break;
        case 'm':
        case 'M':
          e.preventDefault();
          rec.setIsMuted(!rec.isMuted);
          break;
        case '+':
        case '=':
          e.preventDefault();
          rec.setZoomLevel((prev) => Math.min(3, prev + 0.25));
          break;
        case '-':
          e.preventDefault();
          rec.setZoomLevel((prev) => Math.max(0.5, prev - 0.25));
          break;
        case '0':
          e.preventDefault();
          rec.setZoomLevel(1);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [rec]);

  return (
    <>
      {rec.selectedRecording ? (
        <>
          {/* Video Preview */}
          <div className="flex-1 relative bg-black">
            <VideoPreview
              src={`file://${rec.selectedRecording.file_path}`}
              currentTime={rec.currentTime / 1000}
              isPlaying={rec.isPlaying}
              volume={rec.volume}
              muted={rec.isMuted}
              onTimeUpdate={(time: number) => rec.setCurrentTime(time * 1000)}
              onDurationChange={(dur: number) => rec.setVideoDuration(dur * 1000)}
              onPlayingChange={rec.setIsPlaying}
              onVolumeChange={rec.handleVolumeChange}
              onMutedChange={rec.setIsMuted}
              className="w-full h-full"
            />

            {/* Zoom Controls */}
            <div className="absolute top-4 right-4">
              <ZoomControls
                zoom={rec.zoomLevel}
                minZoom={0.5}
                maxZoom={3}
                step={0.25}
                onZoomChange={rec.setZoomLevel}
                compact
              />
            </div>

            {/* Video info overlay */}
            <div className="absolute bottom-4 left-4 bg-black/50 backdrop-blur-sm rounded-lg px-3 py-2">
              <p className="text-white text-sm font-medium">
                {rec.selectedRecording.width}×{rec.selectedRecording.height} •{' '}
                {rec.selectedRecording.mode}
              </p>
            </div>
          </div>

          {/* Playback Controls & Trim */}
          <div className="border-t bg-background p-4 space-y-4">
            <PlaybackControls
              isPlaying={rec.isPlaying}
              currentTime={rec.currentTime / 1000}
              duration={rec.videoDuration / 1000}
              volume={rec.volume}
              muted={rec.isMuted}
              showVolumeControl
              showSkipControls
              onPlayPause={rec.togglePlay}
              onSeek={rec.handleSeek}
              onVolumeChange={rec.handleVolumeChange}
              onMutedChange={rec.setIsMuted}
            />

            {/* Trim & Export Controls */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="flex items-center gap-4 text-xs sm:text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Monitor className="h-4 w-4" />
                  {rec.selectedRecording.width}×{rec.selectedRecording.height}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {formatDuration(rec.selectedRecording.duration_ms)}
                </span>
                <span className="flex items-center gap-1">
                  <HardDrive className="h-4 w-4" />
                  {rec.formatFileSize(rec.selectedRecording.file_size)}
                </span>
              </div>

              <div className="flex items-center gap-2 justify-end">
                <Button variant="outline" size="sm" onClick={() => rec.setShowTrimDialog(true)}>
                  <Scissors className="h-4 w-4 mr-2" />
                  {tEditor('trim') || 'Trim'}
                </Button>

                <Select
                  value={rec.exportFormat}
                  onValueChange={(v) => rec.setExportFormat(v as 'mp4' | 'webm' | 'gif')}
                >
                  <SelectTrigger className="w-24 h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mp4">MP4</SelectItem>
                    <SelectItem value="webm">WebM</SelectItem>
                    <SelectItem value="gif">GIF</SelectItem>
                  </SelectContent>
                </Select>

                {(rec.exportState.isExporting || rec.exportState.message) && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Progress value={rec.exportState.progress} className="w-16 h-1.5" />
                    <span>{rec.exportState.progress}%</span>
                    {rec.exportState.message && (
                      <span className="max-w-40 truncate">{rec.exportState.message}</span>
                    )}
                    {rec.exportState.isExporting && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={rec.handleCancelExport}
                        className="h-6 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <X className="h-3 w-3 mr-1" />
                        {tEditor('cancel') || 'Cancel'}
                      </Button>
                    )}
                  </div>
                )}

                <Button
                  onClick={rec.handleExportRecording}
                  disabled={rec.isLoading || rec.exportState.isExporting}
                >
                  {rec.isLoading || rec.exportState.isExporting ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4 mr-2" />
                  )}
                  {tEditor('export') || 'Export'}
                </Button>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          <div className="text-center max-w-md px-4">
            <Film className="h-16 w-16 mx-auto mb-4 opacity-30" />
            {rec.filteredHistory.length === 0 ? (
              <>
                <h2 className="text-lg font-medium mb-2">
                  {tEditor('noRecordings') || 'No recordings yet'}
                </h2>
                <p className="text-sm mb-4">
                  {tEditor('startRecordingHint') ||
                    'Start a new screen recording to get started'}
                </p>
                {rec.isRecordingAvailable && (
                  <Button
                    onClick={() => rec.startFullscreen(rec.selectedMonitor ?? 0)}
                    className="bg-red-500 hover:bg-red-600 text-white"
                  >
                    <Circle className="h-4 w-4 mr-2 fill-current" />
                    {tEditor('startRecording') || 'Start Recording'}
                  </Button>
                )}
              </>
            ) : (
              <>
                <h2 className="text-lg font-medium mb-2">
                  {tEditor('noVideoSelected') || 'No video selected'}
                </h2>
                <p className="text-sm">
                  {tEditor('selectFromSidebar') || 'Select a recording from the sidebar'}
                </p>
              </>
            )}

            {/* Keyboard shortcuts hint */}
            <div className="mt-6 pt-4 border-t border-border/50">
              <p className="text-xs text-muted-foreground/70 mb-2">
                {tEditor('keyboardShortcuts') || 'Keyboard Shortcuts'}
              </p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground/60">
                <span>
                  <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">Space</kbd>{' '}
                  Play/Pause
                </span>
                <span>
                  <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">←/→</kbd> Skip
                  5s
                </span>
                <span>
                  <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">↑/↓</kbd>{' '}
                  Volume
                </span>
                <span>
                  <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">M</kbd> Mute
                </span>
                <span>
                  <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">+/-</kbd> Zoom
                </span>
                <span>
                  <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">0</kbd> Reset
                  Zoom
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Trim Dialog */}
      <Dialog open={rec.showTrimDialog} onOpenChange={rec.setShowTrimDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{tEditor('trimVideo') || 'Trim Video'}</DialogTitle>
            <DialogDescription>
              {tEditor('trimDescription') || 'Adjust the start and end points to trim your video'}
            </DialogDescription>
          </DialogHeader>
          {rec.selectedRecording && (
            <VideoTrimmer
              sourceUrl={`file://${rec.selectedRecording.file_path}`}
              duration={rec.videoDuration / 1000}
              inPoint={rec.trimStartTime / 1000}
              outPoint={rec.trimEndTime / 1000}
              onInPointChange={() => {}}
              onOutPointChange={() => {}}
              onConfirm={rec.handleTrimConfirm}
              onCancel={() => rec.setShowTrimDialog(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        open={rec.showDeleteDialog}
        onOpenChange={rec.setShowDeleteDialog}
        onConfirm={rec.confirmDelete}
        isLoading={rec.isLoading}
        title={tEditor('deleteRecording') || 'Delete Recording'}
        description={
          tEditor('deleteConfirmation') ||
          'Are you sure you want to delete this recording? This action cannot be undone.'
        }
        cancelText={tEditor('cancel') || 'Cancel'}
        deleteText={tEditor('delete') || 'Delete'}
      />
    </>
  );
}
