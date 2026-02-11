'use client';

/**
 * AgentTeamResultCard - Displays agent team execution results in chat or panel
 *
 * Shows team name, status, task breakdown, teammate contributions, and final result.
 * Designed for inline display in chat messages and in the team panel.
 */

import { useMemo } from 'react';
import { useTeamTeammates, useTeamTasks } from '@/hooks/agent/use-team-data';
import { useTranslations } from 'next-intl';
import {
  Users,
  CheckCircle,
  XCircle,
  Clock,
  Brain,
  ListTodo,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useAgentTeamStore } from '@/stores/agent/agent-team-store';
import {
  TEAM_STATUS_CONFIG,
  TEAMMATE_STATUS_CONFIG,
} from '@/types/agent/agent-team';

export interface AgentTeamResultCardProps {
  teamId: string;
  className?: string;
  compact?: boolean;
  onOpenPanel?: () => void;
}

export function AgentTeamResultCard({
  teamId,
  className,
  compact = false,
  onOpenPanel,
}: AgentTeamResultCardProps) {
  const team = useAgentTeamStore((s) => s.teams[teamId]);
  const t = useTranslations('agentTeam.result');
  const [showDetails, setShowDetails] = useState(false);

  const teammates = useTeamTeammates(teamId);
  const tasks = useTeamTasks(teamId);

  const stats = useMemo(() => {
    const completedTasks = tasks.filter((t) => t.status === 'completed').length;
    const failedTasks = tasks.filter((t) => t.status === 'failed').length;
    const totalTokens = team?.totalTokenUsage?.totalTokens || 0;
    const duration = team?.totalDuration
      ? team.totalDuration < 60000
        ? `${(team.totalDuration / 1000).toFixed(1)}s`
        : `${Math.floor(team.totalDuration / 60000)}m ${Math.floor((team.totalDuration % 60000) / 1000)}s`
      : null;

    return { completedTasks, failedTasks, totalTokens, duration, totalTasks: tasks.length };
  }, [tasks, team]);

  if (!team) return null;

  const statusConfig = TEAM_STATUS_CONFIG[team.status];
  const isSuccess = team.status === 'completed';
  const isFailed = team.status === 'failed';

  return (
    <div
      className={cn(
        'rounded-lg border overflow-hidden',
        isSuccess && 'border-green-500/30 bg-green-500/5',
        isFailed && 'border-destructive/30 bg-destructive/5',
        !isSuccess && !isFailed && 'border-primary/30 bg-primary/5',
        className
      )}
    >
      {/* Header */}
      <div
        className={cn(
          'flex items-center justify-between px-3 py-2',
          isSuccess && 'bg-green-500/10',
          isFailed && 'bg-destructive/10',
          !isSuccess && !isFailed && 'bg-primary/10'
        )}
      >
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4" />
          <span className="font-medium text-sm">{team.name}</span>
          <Badge variant="outline" className={cn('text-[10px] gap-1', statusConfig.color)}>
            {isSuccess && <CheckCircle className="h-3 w-3" />}
            {isFailed && <XCircle className="h-3 w-3" />}
            {statusConfig.label}
          </Badge>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {stats.duration && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {stats.duration}
            </span>
          )}
          {onOpenPanel && (
            <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={onOpenPanel}>
              {t('viewDetails')}
            </Button>
          )}
        </div>
      </div>

      {/* Stats bar */}
      <div className="px-3 py-2 flex items-center gap-4 text-xs text-muted-foreground border-b border-border/30">
        <span className="flex items-center gap-1">
          <Users className="h-3 w-3" />
          {t('teammatesCount', { count: teammates.length })}
        </span>
        <span className="flex items-center gap-1">
          <ListTodo className="h-3 w-3" />
          {t('tasksCount', { completed: stats.completedTasks, total: stats.totalTasks })}
        </span>
        {stats.totalTokens > 0 && (
          <span className="flex items-center gap-1">
            <Brain className="h-3 w-3" />
            {t('tokensCount', { count: stats.totalTokens.toLocaleString() })}
          </span>
        )}
      </div>

      {/* Task progress */}
      {stats.totalTasks > 0 && (
        <div className="px-3 py-2 border-b border-border/30">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>{t('taskProgress')}</span>
            <span>
              {stats.completedTasks}/{stats.totalTasks}
              {stats.failedTasks > 0 && ` ${t('failedCount', { count: stats.failedTasks })}`}
            </span>
          </div>
          <Progress
            value={(stats.completedTasks / Math.max(stats.totalTasks, 1)) * 100}
            className="h-1.5"
          />
        </div>
      )}

      {/* Final result or error */}
      {(team.finalResult || team.error) && (
        <div className="px-3 py-2">
          {team.error && (
            <div className="text-sm text-destructive mb-2">
              <span className="font-medium">{t('errorLabel')}</span>
              {team.error}
            </div>
          )}
          {team.finalResult && !compact && (
            <div className="text-sm whitespace-pre-wrap">
              {team.finalResult.length > 500 ? (
                <Collapsible open={showDetails} onOpenChange={setShowDetails}>
                  <div>{team.finalResult.slice(0, 500)}...</div>
                  <CollapsibleContent>
                    <div className="mt-2">{team.finalResult.slice(500)}</div>
                  </CollapsibleContent>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-6 text-xs mt-1 gap-1">
                      {showDetails ? (
                        <>
                          <ChevronDown className="h-3 w-3" />
                          {t('showLess')}
                        </>
                      ) : (
                        <>
                          <ChevronRight className="h-3 w-3" />
                          {t('showFullResult')}
                        </>
                      )}
                    </Button>
                  </CollapsibleTrigger>
                </Collapsible>
              ) : (
                team.finalResult
              )}
            </div>
          )}
          {team.finalResult && compact && (
            <div className="text-sm text-muted-foreground line-clamp-3">
              {team.finalResult}
            </div>
          )}
        </div>
      )}

      {/* Teammate breakdown (expandable, non-compact only) */}
      {!compact && teammates.length > 0 && (
        <Collapsible>
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="w-full h-7 text-xs gap-1 rounded-none border-t border-border/30"
            >
              <Users className="h-3 w-3" />
              {t('teammateDetails', { count: teammates.length })}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="px-3 py-2 space-y-1.5 border-t border-border/30">
              {teammates.map((tm) => {
                const tmStatus = TEAMMATE_STATUS_CONFIG[tm.status];
                const tmTasks = tasks.filter(
                  (t) => t.assignedTo === tm.id || t.claimedBy === tm.id
                );
                const tmCompleted = tmTasks.filter((t) => t.status === 'completed').length;
                return (
                  <div
                    key={tm.id}
                    className="flex items-center justify-between text-xs py-1"
                  >
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={cn('text-[9px] px-1 h-4', tmStatus.color)}
                      >
                        {tm.role === 'lead' ? '★' : '•'}
                      </Badge>
                      <span className="font-medium">{tm.name}</span>
                      {tm.specialization && (
                        <span className="text-muted-foreground">({tm.specialization})</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <span>{t('tasksCount', { completed: tmCompleted, total: tmTasks.length })}</span>
                      <span>{t('tokensCount', { count: tm.tokenUsage?.totalTokens?.toLocaleString() || '0' })}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}

