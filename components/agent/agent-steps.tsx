'use client';

/**
 * AgentSteps - Displays agent execution steps with progress and checkpoints
 */

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import {
  CheckCircle,
  Circle,
  Loader2,
  XCircle,
  Flag,
  Clock,
  Zap,
  AlertTriangle,
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Checkpoint, CheckpointTrigger } from '@/components/ai-elements/checkpoint';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface AgentStep {
  id: string;
  name: string;
  description?: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  startedAt?: Date;
  completedAt?: Date;
  isCheckpoint?: boolean;
  checkpointLabel?: string;
  priority?: 'low' | 'normal' | 'high' | 'critical';
  retryCount?: number;
}

interface AgentStepsProps {
  steps: AgentStep[];
  className?: string;
  showCheckpoints?: boolean;
  compactMode?: boolean;
}

// Priority configuration
const priorityConfig: Record<string, { color: string; icon: React.ElementType }> = {
  low: { color: 'text-muted-foreground', icon: Circle },
  normal: { color: 'text-blue-500', icon: Circle },
  high: { color: 'text-orange-500', icon: AlertTriangle },
  critical: { color: 'text-red-500', icon: Zap },
};

export function AgentSteps({
  steps,
  className,
  showCheckpoints = true,
  compactMode = false,
}: AgentStepsProps) {
  const t = useTranslations('agent');
  const completedSteps = steps.filter((s) => s.status === 'completed').length;
  const errorSteps = steps.filter((s) => s.status === 'error').length;
  const progress = steps.length > 0 ? (completedSteps / steps.length) * 100 : 0;

  // Calculate total duration
  const totalDuration = useMemo(() => {
    const completedWithTime = steps.filter((s) => s.completedAt && s.startedAt);
    if (completedWithTime.length === 0) return 0;
    return completedWithTime.reduce((sum, s) => {
      return sum + (s.completedAt!.getTime() - s.startedAt!.getTime());
    }, 0);
  }, [steps]);

  // Find checkpoint indices
  const checkpointIndices = useMemo(() => {
    return steps.reduce((acc, step, idx) => {
      if (step.isCheckpoint) acc.push(idx);
      return acc;
    }, [] as number[]);
  }, [steps]);

  return (
    <div className={cn('space-y-4', className)}>
      {/* Progress bar with stats */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-3">
            <span className="text-muted-foreground">{t('progress')}</span>
            {errorSteps > 0 && (
              <Badge variant="destructive" className="text-[10px] h-5">
                {errorSteps} {t('failed')}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-3">
            {totalDuration > 0 && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {(totalDuration / 1000).toFixed(1)}s
              </span>
            )}
            <span className="font-medium text-primary">
              {completedSteps} / {steps.length} {t('steps')}
            </span>
          </div>
        </div>
        <div className="relative">
          <Progress value={progress} className="h-2 bg-muted/50" />
          {/* Checkpoint markers on progress bar */}
          {showCheckpoints &&
            checkpointIndices.map((idx) => (
              <div
                key={idx}
                className="absolute top-1/2 -translate-y-1/2 w-1 h-3 bg-primary rounded-full"
                style={{ left: `${((idx + 1) / steps.length) * 100}%` }}
              />
            ))}
        </div>
      </div>

      {/* Step list with checkpoints */}
      <div className="space-y-2">
        {steps.map((step, index) => {
          const isAfterCheckpoint = checkpointIndices.includes(index - 1);

          return (
            <div key={step.id}>
              {/* Checkpoint separator */}
              {showCheckpoints && step.isCheckpoint && index > 0 && (
                <Checkpoint className="my-3">
                  <CheckpointTrigger>
                    <Flag className="h-3.5 w-3.5 mr-1" />
                    <span>
                      {step.checkpointLabel || `Checkpoint ${checkpointIndices.indexOf(index) + 1}`}
                    </span>
                  </CheckpointTrigger>
                </Checkpoint>
              )}

              <StepItem
                step={step}
                index={index}
                compact={compactMode}
                highlighted={isAfterCheckpoint}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface StepItemProps {
  step: AgentStep;
  index: number;
  compact?: boolean;
  highlighted?: boolean;
}

function StepItem({ step, index, compact = false, highlighted = false }: StepItemProps) {
  const statusIcons = {
    pending: <Circle className="h-4 w-4 text-muted-foreground" />,
    running: <Loader2 className="h-4 w-4 animate-spin text-primary" />,
    completed: <CheckCircle className="h-4 w-4 text-green-500" />,
    error: <XCircle className="h-4 w-4 text-destructive" />,
  };

  const duration =
    step.completedAt && step.startedAt
      ? ((step.completedAt.getTime() - step.startedAt.getTime()) / 1000).toFixed(1)
      : null;

  const priorityCfg = step.priority ? priorityConfig[step.priority] : null;

  if (compact) {
    return (
      <div
        className={cn(
          'flex items-center gap-2 rounded-lg border border-border/50 px-3 py-2 transition-all duration-200',
          'bg-card/30 supports-[backdrop-filter]:bg-card/20 backdrop-blur-sm',
          step.status === 'running' && 'border-primary/50 bg-primary/10',
          step.status === 'completed' && 'bg-muted/40',
          step.status === 'error' && 'border-destructive/50 bg-destructive/5',
          highlighted && 'ring-1 ring-primary/30'
        )}
      >
        {statusIcons[step.status]}
        <span className="text-sm truncate flex-1">{step.name}</span>
        {duration && <span className="text-[10px] text-muted-foreground">{duration}s</span>}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-xl border border-border/50 p-3 transition-all duration-200',
        'bg-card/30 supports-[backdrop-filter]:bg-card/20 backdrop-blur-sm',
        'animate-in fade-in-0 slide-in-from-left-2',
        step.status === 'running' && 'border-primary/50 bg-primary/10 shadow-sm shadow-primary/10',
        step.status === 'completed' && 'bg-muted/40',
        step.status === 'error' && 'border-destructive/50 bg-destructive/5',
        highlighted && 'ring-1 ring-primary/30'
      )}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div
        className={cn(
          'mt-0.5 flex h-6 w-6 items-center justify-center rounded-lg',
          step.status === 'running' && 'bg-primary/10',
          step.status === 'completed' && 'bg-green-500/10',
          step.status === 'error' && 'bg-destructive/10',
          step.status === 'pending' && 'bg-muted'
        )}
      >
        {statusIcons[step.status]}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded">
            Step {index + 1}
          </span>
          <span className="font-medium truncate">{step.name}</span>
          {step.isCheckpoint && (
            <Tooltip>
              <TooltipTrigger>
                <Flag className="h-3 w-3 text-primary" />
              </TooltipTrigger>
              <TooltipContent>Checkpoint</TooltipContent>
            </Tooltip>
          )}
          {priorityCfg && step.priority !== 'normal' && (
            <Tooltip>
              <TooltipTrigger>
                <priorityCfg.icon className={cn('h-3 w-3', priorityCfg.color)} />
              </TooltipTrigger>
              <TooltipContent>{step.priority} priority</TooltipContent>
            </Tooltip>
          )}
          {step.retryCount && step.retryCount > 0 && (
            <Badge variant="outline" className="text-[9px] h-4 px-1">
              Retry {step.retryCount}
            </Badge>
          )}
        </div>
        {step.description && (
          <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{step.description}</p>
        )}
        {duration && (
          <p className="mt-1 text-xs text-green-600 dark:text-green-400">
            ✓ Completed in {duration}s
          </p>
        )}
        {step.status === 'error' && <p className="mt-1 text-xs text-destructive">✗ Step failed</p>}
      </div>
    </div>
  );
}

// Export AgentStep type for use in other components
export type { AgentStep };

export default AgentSteps;
