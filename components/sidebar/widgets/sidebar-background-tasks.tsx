'use client';

/**
 * SidebarBackgroundTasks - Background agent tasks widget for sidebar
 */

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Bot, ChevronRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useBackgroundAgentStore } from '@/stores';
import { cn } from '@/lib/utils';
import { LoadingSpinner } from '@/components/ui/loading-states';

interface SidebarBackgroundTasksProps {
  className?: string;
  collapsed?: boolean;
}

export function SidebarBackgroundTasks({ className, collapsed }: SidebarBackgroundTasksProps) {
  const t = useTranslations('sidebar');
  const agents = useBackgroundAgentStore((state) => state.agents);
  const isPanelOpen = useBackgroundAgentStore((state) => state.isPanelOpen);
  const openPanel = useBackgroundAgentStore((state) => state.openPanel);
  const getRunningAgents = useBackgroundAgentStore((state) => state.getRunningAgents);
  const getUnreadNotificationCount = useBackgroundAgentStore(
    (state) => state.getUnreadNotificationCount
  );

  const runningAgents = useMemo(() => getRunningAgents(), [getRunningAgents]);
  const unreadCount = useMemo(() => getUnreadNotificationCount(), [getUnreadNotificationCount]);
  const allAgents = useMemo(() => Object.values(agents), [agents]);

  // Calculate stats
  const stats = useMemo(() => {
    const running = runningAgents.length;
    const completed = allAgents.filter((a) => a.status === 'completed').length;
    const failed = allAgents.filter((a) => a.status === 'failed').length;
    const queued = allAgents.filter((a) => a.status === 'queued').length;

    // Calculate average progress of running agents
    const avgProgress =
      running > 0 ? runningAgents.reduce((sum, a) => sum + (a.progress || 0), 0) / running : 0;

    return { running, completed, failed, queued, avgProgress };
  }, [runningAgents, allAgents]);

  const hasActivity = stats.running > 0 || stats.queued > 0 || unreadCount > 0;

  if (!hasActivity && allAgents.length === 0) {
    return null;
  }

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={() => openPanel()}
            className={cn(
              'flex items-center justify-center w-full p-2 rounded-md',
              'text-muted-foreground hover:text-foreground hover:bg-accent/50',
              'transition-colors relative',
              className
            )}
          >
            <div className="relative">
              {stats.running > 0 ? (
                <LoadingSpinner size="sm" className="text-primary" />
              ) : (
                <Bot className="h-4 w-4" />
              )}
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 h-3.5 w-3.5 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </div>
          </button>
        </TooltipTrigger>
        <TooltipContent side="right">
          <div className="text-sm">
            <p className="font-medium">{t('backgroundTasks') || 'Background Tasks'}</p>
            {stats.running > 0 && (
              <p className="text-muted-foreground">
                {t('tasksRunning', { count: stats.running }) || `${stats.running} running`}
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <button
      onClick={() => openPanel()}
      className={cn(
        'w-full text-left px-3 py-2 rounded-lg border border-border/50',
        'bg-card/30 supports-[backdrop-filter]:bg-card/20 backdrop-blur-sm',
        'hover:bg-accent/50 hover:border-accent transition-colors group',
        isPanelOpen && 'bg-accent/50 border-accent',
        className
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {stats.running > 0 ? (
            <LoadingSpinner size="sm" className="text-primary" />
          ) : (
            <Bot className="h-4 w-4 text-blue-500" />
          )}
          <span className="text-xs font-medium">{t('backgroundTasks') || 'Background Tasks'}</span>
          {unreadCount > 0 && (
            <Badge variant="destructive" className="h-4 px-1 text-[10px]">
              {unreadCount}
            </Badge>
          )}
        </div>
        <ChevronRight className="h-3 w-3 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
      </div>

      {/* Progress bar for running tasks */}
      {stats.running > 0 && (
        <div className="mb-2">
          <Progress value={stats.avgProgress} className="h-1.5" />
        </div>
      )}

      {/* Status summary */}
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        {stats.running > 0 && (
          <span className="flex items-center gap-1">
            <LoadingSpinner size="sm" className="h-3 w-3" />
            {stats.running}
          </span>
        )}
        {stats.queued > 0 && (
          <span className="flex items-center gap-1 text-amber-500">
            {stats.queued} {t('queued') || 'queued'}
          </span>
        )}
        {stats.completed > 0 && (
          <span className="flex items-center gap-1 text-green-500">
            <CheckCircle2 className="h-3 w-3" />
            {stats.completed}
          </span>
        )}
        {stats.failed > 0 && (
          <span className="flex items-center gap-1 text-destructive">
            <AlertCircle className="h-3 w-3" />
            {stats.failed}
          </span>
        )}
      </div>
    </button>
  );
}

export default SidebarBackgroundTasks;
