'use client';

/**
 * TaskList - Display list of scheduled tasks
 * Redesigned with left status border, colored type icons, and hover actions
 */

import { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useTranslations } from 'next-intl';
import {
  Clock,
  Play,
  Pause,
  Trash2,
  RefreshCw,
  CheckCircle,
  XCircle,
  Calendar,
  Workflow,
  Bot,
  Database,
  Archive,
  Cog,
  MoreHorizontal,
  Sparkles,
  MessageSquare,
  FileCode,
  TestTube,
  Plug,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { ScheduledTask, ScheduledTaskType, ScheduledTaskStatus } from '@/types/scheduler';
import { formatNextRun } from '@/lib/scheduler/format-utils';

interface TaskListProps {
  tasks: ScheduledTask[];
  selectedTaskId: string | null;
  onSelect: (taskId: string) => void;
  onPause: (taskId: string) => void;
  onResume: (taskId: string) => void;
  onRunNow: (taskId: string) => void;
  onDelete: (taskId: string) => void;
  isLoading?: boolean;
  isSelectMode?: boolean;
  selectedTaskIds?: Set<string>;
  onToggleSelect?: (taskId: string) => void;
}

const taskTypeConfig: Record<ScheduledTaskType, { icon: React.ReactNode; bg: string; color: string }> = {
  workflow: { icon: <Workflow className="h-3.5 w-3.5" />, bg: 'bg-violet-500/10', color: 'text-violet-500' },
  agent: { icon: <Bot className="h-3.5 w-3.5" />, bg: 'bg-blue-500/10', color: 'text-blue-500' },
  sync: { icon: <Database className="h-3.5 w-3.5" />, bg: 'bg-cyan-500/10', color: 'text-cyan-500' },
  backup: { icon: <Archive className="h-3.5 w-3.5" />, bg: 'bg-orange-500/10', color: 'text-orange-500' },
  custom: { icon: <Cog className="h-3.5 w-3.5" />, bg: 'bg-gray-500/10', color: 'text-gray-500' },
  plugin: { icon: <Plug className="h-3.5 w-3.5" />, bg: 'bg-emerald-500/10', color: 'text-emerald-500' },
  script: { icon: <FileCode className="h-3.5 w-3.5" />, bg: 'bg-amber-500/10', color: 'text-amber-500' },
  test: { icon: <TestTube className="h-3.5 w-3.5" />, bg: 'bg-pink-500/10', color: 'text-pink-500' },
  chat: { icon: <MessageSquare className="h-3.5 w-3.5" />, bg: 'bg-indigo-500/10', color: 'text-indigo-500' },
  'ai-generation': { icon: <Sparkles className="h-3.5 w-3.5" />, bg: 'bg-purple-500/10', color: 'text-purple-500' },
};

const statusBorderColor: Record<ScheduledTaskStatus, string> = {
  active: 'border-l-green-500',
  paused: 'border-l-yellow-500',
  disabled: 'border-l-gray-400',
  expired: 'border-l-red-500',
};

const statusDotColor: Record<ScheduledTaskStatus, string> = {
  active: 'bg-green-500',
  paused: 'bg-yellow-500',
  disabled: 'bg-gray-400',
  expired: 'bg-red-500',
};

function getStatusLabel(status: ScheduledTaskStatus, t: ReturnType<typeof useTranslations>): string {
  return t(`statuses.${status}`) || status;
}

export function TaskList({
  tasks,
  selectedTaskId,
  onSelect,
  onPause,
  onResume,
  onRunNow,
  onDelete,
  isLoading,
  isSelectMode,
  selectedTaskIds,
  onToggleSelect,
}: TaskListProps) {
  const t = useTranslations('scheduler');

  const nextRunLabels = {
    noSchedule: t('noSchedule') || 'No schedule',
    overdue: t('overdue') || 'Overdue',
    lessThanMinute: t('lessThanMinute') || '< 1 min',
  };

  // Tasks are pre-sorted by the store (active-first + nextRunAt)
  const sortedTasks = tasks;

  const parentRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: sortedTasks.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 76,
    overscan: 5,
  });

  if (tasks.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-6 py-12">
        <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5">
          <Calendar className="h-7 w-7 text-primary/40" />
        </div>
        <h3 className="text-sm font-medium">{t('noTasks') || 'No scheduled tasks'}</h3>
        <p className="mt-1 max-w-[200px] text-center text-xs text-muted-foreground">
          {t('noTasksDescription') || 'Create a task to start automating your workflows'}
        </p>
      </div>
    );
  }

  return (
    <div ref={parentRef} className="h-full overflow-auto">
      <TooltipProvider>
      <div
        className="relative p-2"
        style={{ height: `${virtualizer.getTotalSize()}px` }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const task = sortedTasks[virtualRow.index];
          const typeConfig = taskTypeConfig[task.type];
          const isSelected = task.id === selectedTaskId;

          return (
            <button
              key={task.id}
              type="button"
              ref={virtualizer.measureElement}
              data-index={virtualRow.index}
              className={cn(
                'group absolute left-2 right-2 flex w-[calc(100%-16px)] items-start gap-3 rounded-lg border border-transparent px-3 py-2.5 text-left transition-all',
                'border-l-[3px] hover:bg-accent/40',
                statusBorderColor[task.status],
                isSelected
                  ? 'bg-accent/50 border-l-primary shadow-sm'
                  : 'hover:shadow-sm'
              )}
              style={{ top: `${virtualRow.start}px` }}
              onClick={() => {
                if (isSelectMode && onToggleSelect) {
                  onToggleSelect(task.id);
                } else {
                  onSelect(task.id);
                }
              }}
            >
              {/* Checkbox or Type Icon */}
              {isSelectMode ? (
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center">
                  <div className={cn(
                    'h-4 w-4 rounded border-2 transition-colors',
                    selectedTaskIds?.has(task.id)
                      ? 'border-primary bg-primary'
                      : 'border-muted-foreground/40'
                  )}>
                    {selectedTaskIds?.has(task.id) && (
                      <svg className="h-full w-full text-primary-foreground" viewBox="0 0 16 16" fill="none">
                        <path d="M4 8l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                </div>
              ) : (
                <div className={cn(
                  'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-transform group-hover:scale-105',
                  typeConfig.bg, typeConfig.color
                )}>
                  {typeConfig.icon}
                </div>
              )}

              {/* Content */}
              <div className="min-w-0 flex-1">
                {/* Row 1: Name + Status */}
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium">{task.name}</span>
                  <div className="flex shrink-0 items-center gap-1">
                    <div className={cn('h-1.5 w-1.5 rounded-full', statusDotColor[task.status])} />
                    <span className="text-[10px] text-muted-foreground">{getStatusLabel(task.status, t)}</span>
                  </div>
                </div>

                {/* Row 2: Description or Type */}
                {task.description ? (
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">{task.description}</p>
                ) : (
                  <p className="mt-0.5 text-xs capitalize text-muted-foreground/70">{task.type}</p>
                )}

                {/* Row 3: Next run + Stats */}
                <div className="mt-1.5 flex items-center gap-3 text-[11px] text-muted-foreground">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatNextRun(task.nextRunAt, nextRunLabels)}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      {task.nextRunAt
                        ? task.nextRunAt.toLocaleString()
                        : t('noScheduledRun') || 'No scheduled run'}
                    </TooltipContent>
                  </Tooltip>
                  <span className="flex items-center gap-1">
                    <CheckCircle className="h-3 w-3 text-green-500" />
                    <span className="tabular-nums">{task.successCount}</span>
                  </span>
                  {task.failureCount > 0 && (
                    <span className="flex items-center gap-1">
                      <XCircle className="h-3 w-3 text-red-500" />
                      <span className="tabular-nums">{task.failureCount}</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Action Menu */}
              <div className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40">
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        onRunNow(task.id);
                      }}
                      disabled={isLoading}
                    >
                      <Play className="h-4 w-4 mr-2" />
                      {t('runNow') || 'Run Now'}
                    </DropdownMenuItem>
                    {task.status === 'active' ? (
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          onPause(task.id);
                        }}
                      >
                        <Pause className="h-4 w-4 mr-2" />
                        {t('pause') || 'Pause'}
                      </DropdownMenuItem>
                    ) : task.status === 'paused' ? (
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          onResume(task.id);
                        }}
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        {t('resume') || 'Resume'}
                      </DropdownMenuItem>
                    ) : null}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(task.id);
                      }}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      {t('delete') || 'Delete'}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </button>
          );
        })}
      </div>
      </TooltipProvider>
    </div>
  );
}
