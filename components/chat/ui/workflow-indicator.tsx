'use client';

/**
 * WorkflowIndicator - Shows the currently selected/running workflow above chat input
 * Provides a clear visual indicator and controls for the active workflow
 */

import { useTranslations } from 'next-intl';
import { Workflow, X, Loader2, CheckCircle2, XCircle, Play, Pause } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

export type WorkflowStatus = 'idle' | 'running' | 'paused' | 'completed' | 'failed';

export interface WorkflowIndicatorProps {
  /** Workflow name */
  name: string;
  /** Workflow icon (emoji or component) */
  icon?: string;
  /** Current status */
  status: WorkflowStatus;
  /** Progress percentage (0-100) */
  progress?: number;
  /** Current step description */
  currentStep?: string;
  /** Callback to cancel/dismiss the workflow */
  onCancel?: () => void;
  /** Callback to pause the workflow */
  onPause?: () => void;
  /** Callback to resume the workflow */
  onResume?: () => void;
  /** Additional className */
  className?: string;
}

export function WorkflowIndicator({
  name,
  icon = '🔄',
  status,
  progress = 0,
  currentStep,
  onCancel,
  onPause,
  onResume,
  className,
}: WorkflowIndicatorProps) {
  const t = useTranslations('workflowEditor');

  const statusConfig: Record<WorkflowStatus, { color: string; icon: React.ReactNode; label: string }> = {
    idle: {
      color: 'bg-muted text-muted-foreground',
      icon: <Workflow className="h-3.5 w-3.5" />,
      label: t('ready') || 'Ready',
    },
    running: {
      color: 'bg-blue-500/10 text-blue-500 border-blue-500/30',
      icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />,
      label: t('running') || 'Running',
    },
    paused: {
      color: 'bg-amber-500/10 text-amber-500 border-amber-500/30',
      icon: <Pause className="h-3.5 w-3.5" />,
      label: t('paused') || 'Paused',
    },
    completed: {
      color: 'bg-green-500/10 text-green-500 border-green-500/30',
      icon: <CheckCircle2 className="h-3.5 w-3.5" />,
      label: t('completed') || 'Completed',
    },
    failed: {
      color: 'bg-red-500/10 text-red-500 border-red-500/30',
      icon: <XCircle className="h-3.5 w-3.5" />,
      label: t('failed') || 'Failed',
    },
  };

  const config = statusConfig[status];

  return (
    <div
      className={cn(
        'mx-auto max-w-3xl px-4 mb-2',
        className
      )}
    >
      <div
        className={cn(
          'flex items-center gap-3 rounded-lg border px-3 py-2 transition-all',
          config.color
        )}
      >
        {/* Workflow Icon */}
        <span className="text-lg shrink-0">{icon}</span>

        {/* Workflow Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm truncate">{name}</span>
            <Badge variant="outline" className="text-xs shrink-0">
              {config.icon}
              <span className="ml-1">{config.label}</span>
            </Badge>
          </div>
          
          {/* Progress and current step */}
          {(status === 'running' || status === 'paused') && (
            <div className="mt-1.5 space-y-1">
              {currentStep && (
                <p className="text-xs text-muted-foreground truncate">
                  {currentStep}
                </p>
              )}
              {progress > 0 && (
                <Progress value={progress} className="h-1" />
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          {status === 'running' && onPause && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={onPause}
            >
              <Pause className="h-3.5 w-3.5" />
            </Button>
          )}
          
          {status === 'paused' && onResume && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={onResume}
            >
              <Play className="h-3.5 w-3.5" />
            </Button>
          )}
          
          {onCancel && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 hover:bg-destructive/10 hover:text-destructive"
              onClick={onCancel}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export default WorkflowIndicator;
