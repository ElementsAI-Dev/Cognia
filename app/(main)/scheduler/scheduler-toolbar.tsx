'use client';

/**
 * SchedulerToolbar - Stats overview, search, filter chips, and bulk/quick actions
 */

import { useTranslations } from 'next-intl';
import {
  Search,
  X,
  Trash2,
  CheckSquare,
  Pause,
  Play,
  Workflow,
  Database,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  BackupScheduleDialog,
  StatsOverview,
  WorkflowScheduleDialog,
} from '@/components/scheduler';
import type {
  ScheduledTask,
  ScheduledTaskStatus,
  TaskFilter,
  TaskExecution,
  TaskStatistics,
} from '@/types/scheduler';
import type { SchedulerStatus } from '@/stores/scheduler/scheduler-store';

interface SchedulerToolbarProps {
  tasks: ScheduledTask[];
  statistics: TaskStatistics | null;
  activeTasks: ScheduledTask[];
  pausedTasks: ScheduledTask[];
  upcomingTasks: ScheduledTask[];
  recentExecutions: TaskExecution[];
  schedulerStatus: SchedulerStatus;
  searchQuery: string;
  statusFilter: 'all' | ScheduledTaskStatus;
  isSelectMode: boolean;
  selectedTaskIds: Set<string>;
  onSearchQueryChange: (query: string) => void;
  onStatusFilterChange: (status: 'all' | ScheduledTaskStatus) => void;
  onClearFilter: () => void;
  onSetFilter: (filter: Partial<TaskFilter>) => void;
  onSelectTask: (taskId: string | null) => void;
  onToggleSelectMode: () => void;
  onBulkPause: () => void;
  onBulkResume: () => void;
  onBulkDelete: () => void;
  onRefresh: () => void;
}

export function SchedulerToolbar({
  tasks,
  statistics,
  activeTasks,
  pausedTasks,
  upcomingTasks,
  recentExecutions,
  schedulerStatus,
  searchQuery,
  statusFilter,
  isSelectMode,
  selectedTaskIds,
  onSearchQueryChange,
  onStatusFilterChange,
  onClearFilter,
  onSetFilter,
  onSelectTask,
  onToggleSelectMode,
  onBulkPause,
  onBulkResume,
  onBulkDelete,
  onRefresh,
}: SchedulerToolbarProps) {
  const t = useTranslations('scheduler');

  return (
    <div className="space-y-4 px-4 py-4 sm:px-6">
      {/* Stats Overview */}
      <StatsOverview
        statistics={statistics}
        activeTasks={activeTasks}
        pausedTasks={pausedTasks}
        upcomingTasks={upcomingTasks}
        recentExecutions={recentExecutions}
        schedulerStatus={schedulerStatus}
        onSelectTask={onSelectTask}
      />

      {/* Search + Filter + Quick Actions */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            placeholder={t('searchTasks') || 'Search tasks...'}
            className="h-8 pl-9 pr-8 text-sm"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => { onSearchQueryChange(''); onClearFilter(); }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Status Filter Chips */}
        <div className="flex items-center gap-1">
          {([
            { key: 'all', label: t('all') || 'All', count: tasks.length },
            { key: 'active', label: t('activeTasks') || 'Active', count: activeTasks.length },
            { key: 'paused', label: t('pausedTasks') || 'Paused', count: pausedTasks.length },
          ] as const).map((chip) => (
            <button
              key={chip.key}
              type="button"
              onClick={() => {
                onStatusFilterChange(chip.key);
                if (chip.key === 'all') {
                  onClearFilter();
                } else {
                  onSetFilter({ status: chip.key });
                }
              }}
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-all ${
                statusFilter === chip.key
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-muted/60 text-muted-foreground hover:bg-muted'
              }`}
            >
              {chip.label}
              {chip.count > 0 && (
                <span className={`ml-0.5 rounded-full px-1.5 py-0.5 text-[10px] ${
                  statusFilter === chip.key ? 'bg-primary-foreground/20' : 'bg-background'
                }`}>
                  {chip.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Bulk / Quick Actions */}
        <div className="ml-auto flex items-center gap-1.5">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={isSelectMode ? 'default' : 'ghost'}
                  size="sm"
                  className="h-7 gap-1.5 text-xs"
                  onClick={onToggleSelectMode}
                >
                  <CheckSquare className="h-3.5 w-3.5" />
                  <span className="hidden lg:inline">{isSelectMode ? t('cancelSelect') || 'Cancel' : t('bulkSelect') || 'Select'}</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('bulkSelectTooltip') || 'Toggle multi-select mode'}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          {isSelectMode && selectedTaskIds.size > 0 && (
            <>
              <Badge variant="secondary" className="h-6 px-2 text-xs">
                {selectedTaskIds.size} {t('selected') || 'selected'}
              </Badge>
              <Button variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={onBulkPause}>
                <Pause className="h-3 w-3" />
                {t('bulkPause') || 'Pause'}
              </Button>
              <Button variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={onBulkResume}>
                <Play className="h-3 w-3" />
                {t('bulkResume') || 'Resume'}
              </Button>
              <Button variant="destructive" size="sm" className="h-7 gap-1 text-xs" onClick={onBulkDelete}>
                <Trash2 className="h-3 w-3" />
                {t('bulkDelete') || 'Delete'}
              </Button>
            </>
          )}
          <WorkflowScheduleDialog
            workflowId="default"
            workflowName="Workflow"
            trigger={
              <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs text-muted-foreground hover:text-foreground">
                <Workflow className="h-3.5 w-3.5" />
                <span className="hidden lg:inline">{t('scheduleWorkflowAction') || 'Workflow'}</span>
              </Button>
            }
            onScheduled={() => onRefresh()}
          />
          <BackupScheduleDialog
            trigger={
              <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs text-muted-foreground hover:text-foreground">
                <Database className="h-3.5 w-3.5" />
                <span className="hidden lg:inline">{t('scheduleBackup') || 'Backup'}</span>
              </Button>
            }
            onScheduled={() => onRefresh()}
          />
        </div>
      </div>
    </div>
  );
}
