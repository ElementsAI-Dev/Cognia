'use client';

/**
 * ExportProgress - Video export progress indicator
 * 
 * Features:
 * - Overall progress bar
 * - Current stage indicator
 * - Time remaining estimate
 * - Cancel/pause controls
 * - Error handling display
 */

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Loader2,
  CheckCircle,
  XCircle,
  Pause,
  Play,
  X,
  Film,
  Music,
  Wand2,
  HardDrive,
} from 'lucide-react';

export type ExportStage = 
  | 'preparing'
  | 'rendering'
  | 'encoding'
  | 'audio'
  | 'finalizing'
  | 'completed'
  | 'error'
  | 'cancelled';

export interface ExportProgressProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  progress: number;
  stage: ExportStage;
  currentFrame?: number;
  totalFrames?: number;
  elapsedTime: number;
  estimatedTimeRemaining?: number;
  outputPath?: string;
  error?: string;
  isPaused?: boolean;
  onPause?: () => void;
  onResume?: () => void;
  onCancel?: () => void;
  onRetry?: () => void;
  onOpenFile?: () => void;
  className?: string;
}

const STAGE_INFO: Record<ExportStage, { icon: typeof Film; label: string; color: string }> = {
  preparing: { icon: Wand2, label: 'Preparing...', color: 'text-blue-500' },
  rendering: { icon: Film, label: 'Rendering frames', color: 'text-blue-500' },
  encoding: { icon: HardDrive, label: 'Encoding video', color: 'text-purple-500' },
  audio: { icon: Music, label: 'Processing audio', color: 'text-green-500' },
  finalizing: { icon: HardDrive, label: 'Finalizing...', color: 'text-orange-500' },
  completed: { icon: CheckCircle, label: 'Export complete!', color: 'text-green-500' },
  error: { icon: XCircle, label: 'Export failed', color: 'text-red-500' },
  cancelled: { icon: XCircle, label: 'Export cancelled', color: 'text-muted-foreground' },
};

export function ExportProgress({
  open,
  onOpenChange,
  progress,
  stage,
  currentFrame,
  totalFrames,
  elapsedTime,
  estimatedTimeRemaining,
  outputPath,
  error,
  isPaused = false,
  onPause,
  onResume,
  onCancel,
  onRetry,
  onOpenFile,
  className,
}: ExportProgressProps) {
  const t = useTranslations('exportProgress');
  const Icon = STAGE_INFO[stage].icon;
  const stageColor = STAGE_INFO[stage].color;

  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    if (seconds < 3600) {
      const mins = Math.floor(seconds / 60);
      const secs = Math.round(seconds % 60);
      return `${mins}m ${secs}s`;
    }
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${mins}m`;
  };

  const progressText = useMemo(() => {
    if (stage === 'completed') return '100%';
    if (stage === 'error' || stage === 'cancelled') return '-';
    if (currentFrame && totalFrames) {
      return `${currentFrame} / ${totalFrames} frames (${Math.round(progress)}%)`;
    }
    return `${Math.round(progress)}%`;
  }, [stage, progress, currentFrame, totalFrames]);

  const isInProgress = !['completed', 'error', 'cancelled'].includes(stage);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn('max-w-md', className)}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isInProgress ? (
              <Loader2 className={cn('h-5 w-5 animate-spin', stageColor)} />
            ) : (
              <Icon className={cn('h-5 w-5', stageColor)} />
            )}
            {t('title')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Stage indicator */}
          <div className="flex items-center justify-center gap-3">
            <Icon className={cn('h-8 w-8', stageColor)} />
            <span className={cn('text-lg font-medium', stageColor)}>
              {t(`stages.${stage}`)}
            </span>
          </div>

          {/* Progress bar */}
          {isInProgress && (
            <div className="space-y-2">
              <Progress value={progress} className="h-2" />
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>{progressText}</span>
                {isPaused && <span className="text-yellow-500">{t('paused')}</span>}
              </div>
            </div>
          )}

          {/* Time info */}
          {isInProgress && (
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="space-y-1">
                <span className="text-muted-foreground">{t('elapsed')}</span>
                <p className="font-medium">{formatTime(elapsedTime)}</p>
              </div>
              {estimatedTimeRemaining !== undefined && (
                <div className="space-y-1">
                  <span className="text-muted-foreground">{t('remaining')}</span>
                  <p className="font-medium">
                    {isPaused ? '-' : formatTime(estimatedTimeRemaining)}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Error message */}
          {stage === 'error' && error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-sm text-red-500">{error}</p>
            </div>
          )}

          {/* Completed info */}
          {stage === 'completed' && outputPath && (
            <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
              <p className="text-sm text-green-600 break-all">{outputPath}</p>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex justify-end gap-2">
            {isInProgress && (
              <>
                {isPaused ? (
                  onResume && (
                    <Button variant="outline" size="sm" onClick={onResume}>
                      <Play className="h-4 w-4 mr-1" />
                      {t('resume')}
                    </Button>
                  )
                ) : (
                  onPause && (
                    <Button variant="outline" size="sm" onClick={onPause}>
                      <Pause className="h-4 w-4 mr-1" />
                      {t('pause')}
                    </Button>
                  )
                )}
                {onCancel && (
                  <Button variant="destructive" size="sm" onClick={onCancel}>
                    <X className="h-4 w-4 mr-1" />
                    {t('cancel')}
                  </Button>
                )}
              </>
            )}

            {stage === 'error' && onRetry && (
              <Button onClick={onRetry}>{t('retry')}</Button>
            )}

            {stage === 'completed' && (
              <>
                {onOpenFile && (
                  <Button variant="outline" onClick={onOpenFile}>
                    {t('openFile')}
                  </Button>
                )}
                <Button onClick={() => onOpenChange(false)}>{t('done')}</Button>
              </>
            )}

            {stage === 'cancelled' && (
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                {t('close')}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ExportProgress;
