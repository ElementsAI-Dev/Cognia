'use client';

/**
 * AgentCard - Card component for displaying a background agent in the panel
 * Extracted from background-agent-panel.tsx for maintainability
 */

import { useTranslations } from 'next-intl';
import {
  Play,
  Pause,
  StopCircle,
  Trash2,
  ChevronRight,
  Download,
} from 'lucide-react';
import { cn, formatDurationShort, formatTimeFromDate } from '@/lib/utils';
import { BACKGROUND_AGENT_STATUS_CONFIG } from '@/lib/agent';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { BackgroundAgent } from '@/types/agent/background-agent';

export interface AgentCardProps {
  agent: BackgroundAgent;
  isSelected: boolean;
  onSelect: () => void;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onCancel: () => void;
  onDelete: () => void;
  onExport?: (format: 'json' | 'md') => void;
}

export function AgentCard({
  agent,
  isSelected,
  onSelect,
  onStart,
  onPause,
  onResume,
  onCancel,
  onDelete,
  onExport,
}: AgentCardProps) {
  const t = useTranslations('agent');
  const config = BACKGROUND_AGENT_STATUS_CONFIG[agent.status];
  const Icon = config.icon;
  const isRunning = agent.status === 'running';
  const isPaused = agent.status === 'paused';
  const isIdle = agent.status === 'idle';
  const isCompleted = ['completed', 'failed', 'cancelled', 'timeout'].includes(agent.status);

  return (
    <div
      className={cn(
        'p-3 rounded-lg border cursor-pointer transition-all',
        'bg-card/30 supports-[backdrop-filter]:bg-card/20 backdrop-blur-sm',
        'hover:border-primary/50 hover:shadow-sm',
        isSelected && 'border-primary bg-primary/5',
        isRunning && 'border-primary/50 shadow-sm'
      )}
      onClick={onSelect}
    >
      <div className="flex items-start gap-3">
        {/* Status icon */}
        <div
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
            isRunning && 'bg-primary/10',
            isCompleted && agent.status === 'completed' && 'bg-green-50 dark:bg-green-950',
            isCompleted && agent.status !== 'completed' && 'bg-destructive/10'
          )}
        >
          <Icon className={cn('h-5 w-5', config.color, isRunning && 'animate-spin')} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h4 className="font-medium text-sm truncate">{agent.name}</h4>
            <Badge variant="outline" className="text-[10px] shrink-0">
              {config.label}
            </Badge>
          </div>

          {/* Task preview */}
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {agent.task.slice(0, 50)}...
          </p>

          {/* Progress */}
          {isRunning && (
            <div className="mt-2">
              <Progress value={agent.progress} className="h-1" />
              <div className="flex items-center justify-between mt-1">
                <span className="text-[10px] text-muted-foreground">{agent.progress}%</span>
                <span className="text-[10px] text-muted-foreground">
                  {agent.subAgents.filter((sa) => sa.status === 'completed').length}/
                  {agent.subAgents.length} {t('subAgents')}
                </span>
              </div>
            </div>
          )}

          {/* Time info */}
          <div className="flex items-center gap-2 mt-2 text-[10px] text-muted-foreground">
            {agent.startedAt && <span>{t('started', { time: formatTimeFromDate(agent.startedAt) })}</span>}
            {agent.completedAt && agent.startedAt && (
              <span>
                {t('durationValue', { value: formatDurationShort(agent.completedAt.getTime() - agent.startedAt.getTime()) })}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-1 mt-2 pt-2 border-t">
        {isIdle && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={(e) => {
                  e.stopPropagation();
                  onStart();
                }}
              >
                <Play className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('start')}</TooltipContent>
          </Tooltip>
        )}

        {isRunning && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={(e) => {
                  e.stopPropagation();
                  onPause();
                }}
              >
                <Pause className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('pause')}</TooltipContent>
          </Tooltip>
        )}

        {isPaused && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={(e) => {
                  e.stopPropagation();
                  onResume();
                }}
              >
                <Play className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('resume')}</TooltipContent>
          </Tooltip>
        )}

        {(isRunning || isPaused || agent.status === 'queued') && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  onCancel();
                }}
              >
                <StopCircle className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('cancel')}</TooltipContent>
          </Tooltip>
        )}

        {isCompleted && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('delete')}</TooltipContent>
          </Tooltip>
        )}

        {onExport && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={(e) => e.stopPropagation()}
              >
                <Download className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onExport('json')}>
                {t('exportJson')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onExport('md')}>
                {t('exportMarkdown')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </div>
    </div>
  );
}
