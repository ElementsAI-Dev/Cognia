'use client';

/**
 * TaskList - Display list of scheduled tasks
 */

import { useMemo } from 'react';
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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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

interface TaskListProps {
  tasks: ScheduledTask[];
  selectedTaskId: string | null;
  onSelect: (taskId: string) => void;
  onPause: (taskId: string) => void;
  onResume: (taskId: string) => void;
  onRunNow: (taskId: string) => void;
  onDelete: (taskId: string) => void;
  isLoading?: boolean;
}

const taskTypeIcons: Record<ScheduledTaskType, React.ReactNode> = {
  workflow: <Workflow className="h-4 w-4" />,
  agent: <Bot className="h-4 w-4" />,
  sync: <Database className="h-4 w-4" />,
  backup: <Archive className="h-4 w-4" />,
  custom: <Cog className="h-4 w-4" />,
  plugin: <Cog className="h-4 w-4" />,
};

const statusConfig: Record<ScheduledTaskStatus, { label: string; color: string; icon: React.ReactNode }> = {
  active: { label: 'Active', color: 'bg-green-500/10 text-green-500', icon: <CheckCircle className="h-3 w-3" /> },
  paused: { label: 'Paused', color: 'bg-yellow-500/10 text-yellow-500', icon: <Pause className="h-3 w-3" /> },
  disabled: { label: 'Disabled', color: 'bg-gray-500/10 text-gray-500', icon: <XCircle className="h-3 w-3" /> },
  expired: { label: 'Expired', color: 'bg-red-500/10 text-red-500', icon: <XCircle className="h-3 w-3" /> },
};

export function TaskList({
  tasks,
  selectedTaskId,
  onSelect,
  onPause,
  onResume,
  onRunNow,
  onDelete,
  isLoading,
}: TaskListProps) {
  const t = useTranslations('scheduler');

  const formatNextRun = (date: Date | undefined): string => {
    if (!date) return t('noSchedule') || 'No schedule';
    
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    
    if (diff < 0) return t('overdue') || 'Overdue';
    if (diff < 60000) return t('lessThanMinute') || 'Less than a minute';
    if (diff < 3600000) {
      const minutes = Math.floor(diff / 60000);
      return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`;
    }
    if (diff < 86400000) {
      const hours = Math.floor(diff / 3600000);
      return `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
    }
    
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const sortedTasks = useMemo(() => {
    return [...tasks].sort((a, b) => {
      // Active tasks first
      if (a.status === 'active' && b.status !== 'active') return -1;
      if (a.status !== 'active' && b.status === 'active') return 1;
      
      // Then by next run time
      if (a.nextRunAt && b.nextRunAt) {
        return a.nextRunAt.getTime() - b.nextRunAt.getTime();
      }
      if (a.nextRunAt) return -1;
      if (b.nextRunAt) return 1;
      
      return 0;
    });
  }, [tasks]);

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Calendar className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-medium">{t('noTasks') || 'No scheduled tasks'}</h3>
        <p className="text-sm text-muted-foreground mt-1">
          {t('noTasksDescription') || 'Create a scheduled task to automate your workflows'}
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="space-y-2 p-1">
        {sortedTasks.map((task) => {
          const status = statusConfig[task.status];
          const isSelected = task.id === selectedTaskId;

          return (
            <Card
              key={task.id}
              className={cn(
                'cursor-pointer transition-colors hover:bg-accent/50',
                isSelected && 'ring-2 ring-primary'
              )}
              onClick={() => onSelect(task.id)}
            >
              <CardHeader className="p-3 pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">
                      {taskTypeIcons[task.type]}
                    </span>
                    <CardTitle className="text-sm font-medium">
                      {task.name}
                    </CardTitle>
                  </div>
                  <div className="flex items-center gap-1">
                    <Badge variant="outline" className={cn('text-xs', status.color)}>
                      {status.icon}
                      <span className="ml-1">{status.label}</span>
                    </Badge>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                          <Cog className="h-3.5 w-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
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
                </div>
                {task.description && (
                  <CardDescription className="text-xs line-clamp-1 mt-1">
                    {task.description}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="p-3 pt-0">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>{formatNextRun(task.nextRunAt)}</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        {task.nextRunAt
                          ? task.nextRunAt.toLocaleString()
                          : t('noScheduledRun') || 'No scheduled run'}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <div className="flex items-center gap-2">
                    <span className="text-green-500">{task.successCount} ✓</span>
                    <span className="text-red-500">{task.failureCount} ✗</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </ScrollArea>
  );
}

export default TaskList;
