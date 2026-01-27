'use client';

/**
 * RenderQueue - Batch export queue management
 * 
 * Features:
 * - Queue multiple exports
 * - Reorder queue items
 * - Priority management
 * - Status tracking for each job
 * - Pause/resume individual jobs
 */

import { useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Play,
  Pause,
  Trash2,
  MoreHorizontal,
  ChevronUp,
  ChevronDown,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  ListOrdered,
  FolderOpen,
} from 'lucide-react';

export type RenderJobStatus = 
  | 'queued'
  | 'rendering'
  | 'paused'
  | 'completed'
  | 'error'
  | 'cancelled';

export interface RenderJob {
  id: string;
  name: string;
  projectName: string;
  status: RenderJobStatus;
  progress: number;
  format: string;
  resolution: string;
  duration: number;
  estimatedTime?: number;
  outputPath?: string;
  error?: string;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
}

export interface RenderQueueProps {
  jobs: RenderJob[];
  activeJobId: string | null;
  onStartJob: (jobId: string) => void;
  onPauseJob: (jobId: string) => void;
  onResumeJob: (jobId: string) => void;
  onCancelJob: (jobId: string) => void;
  onRemoveJob: (jobId: string) => void;
  onReorderJob: (jobId: string, direction: 'up' | 'down') => void;
  onOpenOutput: (jobId: string) => void;
  onClearCompleted: () => void;
  onStartAll: () => void;
  onPauseAll: () => void;
  className?: string;
}

const STATUS_CONFIG: Record<RenderJobStatus, { icon: typeof Clock; color: string; label: string }> = {
  queued: { icon: Clock, color: 'text-muted-foreground', label: 'Queued' },
  rendering: { icon: Loader2, color: 'text-blue-500', label: 'Rendering' },
  paused: { icon: Pause, color: 'text-yellow-500', label: 'Paused' },
  completed: { icon: CheckCircle, color: 'text-green-500', label: 'Completed' },
  error: { icon: XCircle, color: 'text-red-500', label: 'Error' },
  cancelled: { icon: XCircle, color: 'text-muted-foreground', label: 'Cancelled' },
};

export function RenderQueue({
  jobs,
  activeJobId,
  onStartJob,
  onPauseJob,
  onResumeJob,
  onCancelJob,
  onRemoveJob,
  onReorderJob,
  onOpenOutput,
  onClearCompleted,
  onStartAll,
  onPauseAll,
  className,
}: RenderQueueProps) {
  const t = useTranslations('renderQueue');
  const formatDuration = useCallback((seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  const formatTime = useCallback((timestamp: number): string => {
    return new Date(timestamp).toLocaleTimeString();
  }, []);

  const queuedCount = jobs.filter((j) => j.status === 'queued').length;
  const completedCount = jobs.filter((j) => j.status === 'completed').length;
  const hasActiveJob = jobs.some((j) => j.status === 'rendering');

  return (
    <div className={cn('flex flex-col h-full bg-background border rounded-lg', className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b">
        <div className="flex items-center gap-2">
          <ListOrdered className="h-4 w-4" />
          <h3 className="font-medium">{t('title')}</h3>
          <Badge variant="secondary" className="text-xs">
            {queuedCount} {t('queued')}
          </Badge>
        </div>
        <div className="flex items-center gap-1">
          {hasActiveJob ? (
            <Button variant="outline" size="sm" onClick={onPauseAll}>
              <Pause className="h-3 w-3 mr-1" />
              {t('pauseAll')}
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={onStartAll}
              disabled={queuedCount === 0}
            >
              <Play className="h-3 w-3 mr-1" />
              {t('startAll')}
            </Button>
          )}
          {completedCount > 0 && (
            <Button variant="ghost" size="sm" onClick={onClearCompleted}>
              {t('clearCompleted')}
            </Button>
          )}
        </div>
      </div>

      {/* Job list */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-2">
          {jobs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <ListOrdered className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">{t('noJobs')}</p>
            </div>
          ) : (
            jobs.map((job, index) => {
              const statusConfig = STATUS_CONFIG[job.status];
              const StatusIcon = statusConfig.icon;
              const isActive = job.id === activeJobId;
              const canMoveUp = index > 0 && job.status === 'queued';
              const canMoveDown = index < jobs.length - 1 && job.status === 'queued';

              return (
                <div
                  key={job.id}
                  className={cn(
                    'border rounded-lg p-3 transition-colors',
                    isActive && 'ring-1 ring-primary',
                    job.status === 'error' && 'border-red-500/50'
                  )}
                >
                  {/* Job header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <StatusIcon
                          className={cn(
                            'h-4 w-4 shrink-0',
                            statusConfig.color,
                            job.status === 'rendering' && 'animate-spin'
                          )}
                        />
                        <span className="font-medium text-sm truncate">
                          {job.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <span>{job.projectName}</span>
                        <span>•</span>
                        <span>{job.format.toUpperCase()}</span>
                        <span>•</span>
                        <span>{job.resolution}</span>
                        <span>•</span>
                        <span>{formatDuration(job.duration)}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1">
                      {job.status === 'queued' && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => onStartJob(job.id)}
                            >
                              <Play className="h-3 w-3" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>{t('startNow')}</TooltipContent>
                        </Tooltip>
                      )}

                      {job.status === 'rendering' && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => onPauseJob(job.id)}
                            >
                              <Pause className="h-3 w-3" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>{t('pause')}</TooltipContent>
                        </Tooltip>
                      )}

                      {job.status === 'paused' && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => onResumeJob(job.id)}
                            >
                              <Play className="h-3 w-3" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>{t('resume')}</TooltipContent>
                        </Tooltip>
                      )}

                      {job.status === 'completed' && job.outputPath && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => onOpenOutput(job.id)}
                            >
                              <FolderOpen className="h-3 w-3" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>{t('openFile')}</TooltipContent>
                        </Tooltip>
                      )}

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <MoreHorizontal className="h-3 w-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {canMoveUp && (
                            <DropdownMenuItem onClick={() => onReorderJob(job.id, 'up')}>
                              <ChevronUp className="h-4 w-4 mr-2" />
                              {t('moveUp')}
                            </DropdownMenuItem>
                          )}
                          {canMoveDown && (
                            <DropdownMenuItem onClick={() => onReorderJob(job.id, 'down')}>
                              <ChevronDown className="h-4 w-4 mr-2" />
                              {t('moveDown')}
                            </DropdownMenuItem>
                          )}
                          {(canMoveUp || canMoveDown) && <DropdownMenuSeparator />}
                          {['queued', 'rendering', 'paused'].includes(job.status) && (
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => onCancelJob(job.id)}
                            >
                              <XCircle className="h-4 w-4 mr-2" />
                              {t('cancel')}
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => onRemoveJob(job.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            {t('remove')}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  {/* Progress bar */}
                  {['rendering', 'paused'].includes(job.status) && (
                    <div className="mt-2 space-y-1">
                      <Progress value={job.progress} className="h-1.5" />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{Math.round(job.progress)}%</span>
                        {job.estimatedTime && (
                          <span>~{formatDuration(job.estimatedTime)} {t('remaining')}</span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Error message */}
                  {job.status === 'error' && job.error && (
                    <p className="mt-2 text-xs text-red-500">{job.error}</p>
                  )}

                  {/* Completed time */}
                  {job.status === 'completed' && job.completedAt && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {t('completedAt')} {formatTime(job.completedAt)}
                    </p>
                  )}
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

export default RenderQueue;
