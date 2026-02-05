'use client';

/**
 * MCPProgressIndicator - Real-time progress display for MCP tool calls
 * Integrates with MCP progress notifications
 */

import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, Clock } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Loader } from '@/components/ai-elements/loader';
import { cn } from '@/lib/utils';

export interface MCPProgressIndicatorProps {
  /** Current state of the tool call */
  state: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  /** Progress value (0-100), undefined for indeterminate */
  progress?: number;
  /** Progress message from MCP notification */
  message?: string;
  /** Start time for elapsed time calculation */
  startedAt?: Date;
  /** End time for duration calculation */
  endedAt?: Date;
  /** Whether to show elapsed time */
  showElapsedTime?: boolean;
  /** Compact mode */
  compact?: boolean;
  className?: string;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  const mins = Math.floor(ms / 60000);
  const secs = Math.floor((ms % 60000) / 1000);
  return `${mins}m ${secs}s`;
}

const stateConfig = {
  pending: {
    icon: Clock,
    color: 'text-muted-foreground',
    bgColor: 'bg-muted/50',
    label: 'Pending',
    useLoader: false,
  },
  running: {
    icon: null,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 dark:bg-blue-950/30',
    label: 'Running',
    useLoader: true,
  },
  completed: {
    icon: CheckCircle,
    color: 'text-green-600',
    bgColor: 'bg-green-50 dark:bg-green-950/30',
    label: 'Completed',
    useLoader: false,
  },
  failed: {
    icon: XCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-50 dark:bg-red-950/30',
    label: 'Failed',
    useLoader: false,
  },
  cancelled: {
    icon: XCircle,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50 dark:bg-orange-950/30',
    label: 'Cancelled',
    useLoader: false,
  },
};

export function MCPProgressIndicator({
  state,
  progress,
  message,
  startedAt,
  endedAt,
  showElapsedTime = true,
  compact = false,
  className,
}: MCPProgressIndicatorProps) {
  const [elapsedTime, setElapsedTime] = useState(0);
  const config = stateConfig[state];

  // Live elapsed time counter
  useEffect(() => {
    if (state !== 'running' || !startedAt || !showElapsedTime) {
      return;
    }

    const startTime = startedAt.getTime();

    const interval = setInterval(() => {
      setElapsedTime(Date.now() - startTime);
    }, 100);

    return () => clearInterval(interval);
  }, [state, startedAt, showElapsedTime]);

  // Calculate final duration if ended
  const displayTime = endedAt && startedAt
    ? endedAt.getTime() - startedAt.getTime()
    : elapsedTime;

  const isIndeterminate = state === 'running' && progress === undefined;

  const renderIcon = () => {
    if (config.useLoader) {
      return <Loader size={16} variant="spin" className={config.color} />;
    }
    if (config.icon) {
      const Icon = config.icon;
      return <Icon className={cn('h-4 w-4', config.color)} />;
    }
    return null;
  };

  if (compact) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        {renderIcon()}
        {showElapsedTime && displayTime > 0 && (
          <span className="text-xs font-mono text-muted-foreground">
            {formatDuration(displayTime)}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {renderIcon()}
          <span className={cn('text-sm font-medium', config.color)}>
            {config.label}
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {progress !== undefined && state === 'running' && (
            <span className="font-mono">{Math.round(progress)}%</span>
          )}
          {showElapsedTime && displayTime > 0 && (
            <span className="font-mono">{formatDuration(displayTime)}</span>
          )}
        </div>
      </div>

      {state === 'running' && (
        <Progress
          value={isIndeterminate ? undefined : progress}
          className={cn(
            'h-1.5',
            isIndeterminate && '[&>div]:animate-pulse'
          )}
        />
      )}

      {message && (
        <p className="text-xs text-muted-foreground animate-pulse">
          {message}
        </p>
      )}
    </div>
  );
}
