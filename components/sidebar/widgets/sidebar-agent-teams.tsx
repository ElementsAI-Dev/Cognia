'use client';

/**
 * SidebarAgentTeams - Agent team status widget for sidebar
 *
 * Follows the same pattern as SidebarBackgroundTasks.
 * Shows active teams, their progress, and teammate counts.
 * Clicking opens the AgentTeamPanelSheet.
 */

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Users, ChevronRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useAgentTeamStore } from '@/stores/agent/agent-team-store';
import { cn } from '@/lib/utils';
import { LoadingSpinner } from '@/components/ui/loading-states';

interface SidebarAgentTeamsProps {
  className?: string;
  collapsed?: boolean;
}

export function SidebarAgentTeams({ className, collapsed }: SidebarAgentTeamsProps) {
  const t = useTranslations('agentTeam');
  const teams = useAgentTeamStore((state) => state.teams);
  const teammates = useAgentTeamStore((state) => state.teammates);
  const isPanelOpen = useAgentTeamStore((state) => state.isPanelOpen);
  const setIsPanelOpen = useAgentTeamStore((state) => state.setIsPanelOpen);

  const allTeams = useMemo(() => Object.values(teams), [teams]);

  const stats = useMemo(() => {
    const active = allTeams.filter(
      (t) => t.status === 'executing' || t.status === 'planning' || t.status === 'paused'
    );
    const completed = allTeams.filter((t) => t.status === 'completed');
    const failed = allTeams.filter((t) => t.status === 'failed');

    // Calculate average progress across all active teams' teammates
    let totalProgress = 0;
    let totalTeammates = 0;
    for (const team of active) {
      for (const tmId of team.teammateIds) {
        const tm = teammates[tmId];
        if (tm) {
          totalProgress += tm.progress;
          totalTeammates++;
        }
      }
    }
    const avgProgress = totalTeammates > 0 ? Math.round(totalProgress / totalTeammates) : 0;

    return {
      active: active.length,
      completed: completed.length,
      failed: failed.length,
      avgProgress,
      total: allTeams.length,
    };
  }, [allTeams, teammates]);

  const hasActivity = stats.active > 0;

  if (!hasActivity && allTeams.length === 0) {
    return null;
  }

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={() => setIsPanelOpen(true)}
            className={cn(
              'flex items-center justify-center w-full p-2 rounded-md',
              'text-muted-foreground hover:text-foreground hover:bg-accent/50',
              'transition-colors relative',
              className
            )}
          >
            <div className="relative">
              {stats.active > 0 ? (
                <LoadingSpinner size="sm" className="text-primary" />
              ) : (
                <Users className="h-4 w-4" />
              )}
              {stats.active > 0 && (
                <span className="absolute -top-1 -right-1 h-3.5 w-3.5 bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
                  {stats.active}
                </span>
              )}
            </div>
          </button>
        </TooltipTrigger>
        <TooltipContent side="right">
          <div className="text-sm">
            <p className="font-medium">{t('title')}</p>
            {stats.active > 0 && (
              <p className="text-muted-foreground">
                {stats.active} {t('status.executing').toLowerCase()}
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <button
      onClick={() => setIsPanelOpen(true)}
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
          {stats.active > 0 ? (
            <LoadingSpinner size="sm" className="text-primary" />
          ) : (
            <Users className="h-4 w-4 text-indigo-500" />
          )}
          <span className="text-xs font-medium">{t('title')}</span>
          {stats.active > 0 && (
            <Badge variant="default" className="h-4 px-1 text-[10px] animate-pulse">
              {stats.active}
            </Badge>
          )}
        </div>
        <ChevronRight className="h-3 w-3 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
      </div>

      {/* Progress bar for active teams */}
      {stats.active > 0 && (
        <div className="mb-2">
          <Progress value={stats.avgProgress} className="h-1.5" />
        </div>
      )}

      {/* Status summary */}
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        {stats.active > 0 && (
          <span className="flex items-center gap-1">
            <LoadingSpinner size="sm" className="h-3 w-3" />
            {stats.active}
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

export default SidebarAgentTeams;
