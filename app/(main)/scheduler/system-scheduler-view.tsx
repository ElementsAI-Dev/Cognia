'use client';

import { useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import {
  Activity,
  AlertTriangle,
  Pause,
  Play,
  Settings,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import type {
  SystemTask,
  SystemTaskAction,
  SystemTaskTrigger,
  SchedulerCapabilities,
} from '@/types/scheduler';

export interface SystemSchedulerViewProps {
  capabilities: SchedulerCapabilities | null;
  isAvailable: boolean;
  isElevated: boolean;
  systemTasks: SystemTask[];
  loading: boolean;
  error: string | null;
  onRunNow: (taskId: string) => Promise<void>;
  onToggle: (task: SystemTask) => Promise<void>;
  onEdit: (taskId: string) => void;
  onDelete: (taskId: string) => void;
  onRequestElevation: () => void;
}

export function SystemSchedulerView({
  capabilities,
  isAvailable,
  isElevated,
  systemTasks,
  loading,
  error,
  onRunNow,
  onToggle,
  onEdit,
  onDelete,
  onRequestElevation,
}: SystemSchedulerViewProps) {
  const t = useTranslations('scheduler');

  const sortedSystemTasks = useMemo(
    () => [...systemTasks].sort((a, b) => a.name.localeCompare(b.name)),
    [systemTasks]
  );

  const formatSystemTrigger = useCallback(
    (trigger: SystemTaskTrigger) => {
      switch (trigger.type) {
        case 'cron':
          return `${t('systemCronExpression') || 'Cron'}: ${trigger.expression}`;
        case 'interval':
          return `${t('intervalSeconds') || 'Interval'}: ${trigger.seconds}s`;
        case 'once':
          return `${t('systemRunAt') || 'Run At'}: ${trigger.run_at}`;
        case 'on_boot':
          return `${t('triggerOnBoot') || 'On Boot'}: ${trigger.delay_seconds || 0}s`;
        case 'on_logon':
          return `${t('triggerOnLogon') || 'On Logon'}${trigger.user ? ` (${trigger.user})` : ''}`;
        case 'on_event':
          return `${t('triggerOnEvent') || 'On Event'}: ${trigger.source} (${trigger.event_id})`;
        default:
          return t('systemTrigger') || 'Trigger';
      }
    },
    [t]
  );

  const formatSystemAction = useCallback(
    (action: SystemTaskAction) => {
      switch (action.type) {
        case 'execute_script':
          return `${t('actionScript') || 'Script'}: ${action.language}`;
        case 'run_command':
          return `${t('actionCommand') || 'Command'}: ${action.command}`;
        case 'launch_app':
          return `${t('actionApp') || 'App'}: ${action.path}`;
        default:
          return t('systemAction') || 'Action';
      }
    },
    [t]
  );

  if (!isAvailable) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-center">
        <div className="max-w-[280px]">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/50">
            <Settings className="h-8 w-8 text-muted-foreground/40" />
          </div>
          <h3 className="text-base font-medium">{t('systemSchedulerUnavailable') || 'System scheduler is unavailable'}</h3>
          {capabilities?.can_elevate && (
            <Button
              size="sm"
              variant="outline"
              className="mt-4 gap-1.5"
              onClick={onRequestElevation}
            >
              {t('requestElevation') || 'Request Elevation'}
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="space-y-3 p-4 sm:p-6">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="outline" className="capitalize">
            {isElevated ? t('runLevelAdmin') || 'Administrator' : t('runLevelUser') || 'User'}
          </Badge>
          <span>{t('systemSchedulerDescription') || 'Manage OS-level scheduled tasks'}</span>
        </div>
        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
            {error}
          </div>
        )}
        {sortedSystemTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/50">
              <Settings className="h-7 w-7 text-muted-foreground/40" />
            </div>
            <p className="text-sm text-muted-foreground">{t('noSystemTasks') || 'No system tasks'}</p>
          </div>
        ) : (
          sortedSystemTasks.map((task) => (
            <Card key={task.id} className="overflow-hidden border-border/50 transition-all hover:-translate-y-0.5 hover:shadow-md">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <div className={`h-2 w-2 shrink-0 rounded-full ${
                        task.status === 'disabled' ? 'bg-gray-400' : 'bg-green-500'
                      }`} />
                      <span className="truncate text-sm font-medium">{task.name}</span>
                    </div>
                    {task.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2 pl-4">{task.description}</p>
                    )}
                    <div className="flex flex-wrap gap-x-3 gap-y-1 pl-4 text-[11px] text-muted-foreground">
                      <span>{formatSystemTrigger(task.trigger)}</span>
                      <span>{formatSystemAction(task.action)}</span>
                    </div>
                  </div>
                  <Badge variant="outline" className={`shrink-0 capitalize ${
                    task.status === 'disabled' ? 'text-gray-500' : 'text-green-500'
                  }`}>
                    {task.status}
                  </Badge>
                </div>
                {task.metadata_state === 'degraded' && (
                  <div className="ml-4 flex items-center gap-1 rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[11px] text-amber-600">
                    <AlertTriangle className="h-3 w-3" />
                    {t('metadataDegraded') || 'Limited metadata; editing may be restricted'}
                  </div>
                )}
                <div className="flex flex-wrap gap-1.5 pl-4">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => onRunNow(task.id)} disabled={loading}>
                          <Play className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>{t('runNow') || 'Run Now'}</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => onToggle(task)} disabled={loading}>
                          {task.status === 'disabled' ? <Activity className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>{task.status === 'disabled' ? t('enableTask') || 'Enable' : t('disableTask') || 'Disable'}</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0"
                          onClick={() => onEdit(task.id)}
                          disabled={task.metadata_state === 'degraded'}
                        >
                          <Settings className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        {task.metadata_state === 'degraded'
                          ? (t('metadataDegradedEditHint') || 'Task metadata is incomplete')
                          : (t('edit') || 'Edit')}
                      </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={() => onDelete(task.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>{t('delete') || 'Delete'}</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </ScrollArea>
  );
}
