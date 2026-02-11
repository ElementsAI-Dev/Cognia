'use client';

/**
 * AgentTeamAnalytics - Execution analytics panel for agent teams
 *
 * Features:
 * - Token usage breakdown per teammate (bar chart)
 * - Task duration comparison
 * - Token budget progress bar + warning
 * - Team execution timeline summary
 * - Success/failure rate statistics
 */

import { useMemo } from 'react';
import { useTeamTeammates, useTeamTasks } from '@/hooks/agent/use-team-data';
import { useTranslations } from 'next-intl';
import {
  Zap,
  Timer,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  BarChart3,
  TrendingUp,
  Users,
  Clock,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useAgentTeamStore } from '@/stores/agent/agent-team-store';
import { cn } from '@/lib/utils';
import type { AgentTeammate, AgentTeamTask } from '@/types/agent/agent-team';

// ============================================================================
// Types
// ============================================================================

interface AgentTeamAnalyticsProps {
  teamId: string;
  className?: string;
}

// ============================================================================
// Helpers
// ============================================================================

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  if (ms < 3600000) return `${(ms / 60000).toFixed(1)}m`;
  return `${(ms / 3600000).toFixed(1)}h`;
}

function formatTokens(count: number): string {
  if (count < 1000) return count.toString();
  if (count < 1000000) return `${(count / 1000).toFixed(1)}K`;
  return `${(count / 1000000).toFixed(2)}M`;
}

// ============================================================================
// Component
// ============================================================================

export function AgentTeamAnalytics({ teamId, className }: AgentTeamAnalyticsProps) {
  const t = useTranslations('agentTeam');

  const team = useAgentTeamStore((s) => s.teams[teamId]);

  const teammates = useTeamTeammates(teamId);
  const tasks = useTeamTasks(teamId);

  // Compute analytics
  const analytics = useMemo(() => {
    const totalTokens = team?.totalTokenUsage?.totalTokens || 0;
    const promptTokens = team?.totalTokenUsage?.promptTokens || 0;
    const completionTokens = team?.totalTokenUsage?.completionTokens || 0;
    const tokenBudget = team?.config?.tokenBudget || 0;
    const budgetUsedPercent = tokenBudget > 0 ? Math.min(100, (totalTokens / tokenBudget) * 100) : 0;
    const budgetRemaining = tokenBudget > 0 ? Math.max(0, tokenBudget - totalTokens) : 0;

    const completedTasks = tasks.filter(t => t.status === 'completed');
    const failedTasks = tasks.filter(t => t.status === 'failed');
    const cancelledTasks = tasks.filter(t => t.status === 'cancelled');
    const retriedTasks = tasks.filter(t => (t.retryCount ?? 0) > 0);
    const successRate = tasks.length > 0
      ? Math.round((completedTasks.length / tasks.length) * 100)
      : 0;

    const taskDurations = completedTasks
      .filter(t => t.actualDuration)
      .map(t => ({ title: t.title, duration: t.actualDuration! }))
      .sort((a, b) => b.duration - a.duration);

    const avgDuration = taskDurations.length > 0
      ? taskDurations.reduce((sum, t) => sum + t.duration, 0) / taskDurations.length
      : 0;

    const totalDuration = team?.totalDuration || 0;

    // Per-teammate token breakdown
    const teammateTokens = teammates
      .filter(tm => tm.tokenUsage.totalTokens > 0)
      .map(tm => ({
        name: tm.name,
        role: tm.role,
        tokens: tm.tokenUsage.totalTokens,
        prompt: tm.tokenUsage.promptTokens,
        completion: tm.tokenUsage.completionTokens,
        tasksCompleted: tm.completedTaskIds.length,
        percent: totalTokens > 0 ? Math.round((tm.tokenUsage.totalTokens / totalTokens) * 100) : 0,
      }))
      .sort((a, b) => b.tokens - a.tokens);

    // Max token for bar scaling
    const maxTeammateTokens = teammateTokens.length > 0
      ? Math.max(...teammateTokens.map(t => t.tokens))
      : 1;

    return {
      totalTokens,
      promptTokens,
      completionTokens,
      tokenBudget,
      budgetUsedPercent,
      budgetRemaining,
      completedTasks: completedTasks.length,
      failedTasks: failedTasks.length,
      cancelledTasks: cancelledTasks.length,
      retriedTasks: retriedTasks.length,
      totalTasks: tasks.length,
      successRate,
      taskDurations,
      avgDuration,
      totalDuration,
      teammateTokens,
      maxTeammateTokens,
    };
  }, [team, teammates, tasks]);

  if (!team) return null;

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center gap-2">
        <BarChart3 className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">
          {t('analytics.title') || 'Analytics'}
        </span>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 gap-2">
        <StatCard
          icon={<Zap className="h-3.5 w-3.5 text-yellow-500" />}
          label={t('analytics.totalTokens') || 'Total Tokens'}
          value={formatTokens(analytics.totalTokens)}
          sublabel={`${formatTokens(analytics.promptTokens)} prompt / ${formatTokens(analytics.completionTokens)} completion`}
        />
        <StatCard
          icon={<Timer className="h-3.5 w-3.5 text-blue-500" />}
          label={t('analytics.totalDuration') || 'Duration'}
          value={formatDuration(analytics.totalDuration)}
          sublabel={`avg ${formatDuration(analytics.avgDuration)} / task`}
        />
        <StatCard
          icon={<CheckCircle2 className="h-3.5 w-3.5 text-green-500" />}
          label={t('analytics.successRate') || 'Success Rate'}
          value={`${analytics.successRate}%`}
          sublabel={`${analytics.completedTasks}/${analytics.totalTasks} tasks`}
        />
        <StatCard
          icon={<Users className="h-3.5 w-3.5 text-indigo-500" />}
          label={t('analytics.teammates') || 'Teammates'}
          value={`${teammates.length}`}
          sublabel={`${analytics.teammateTokens.length} active`}
        />
      </div>

      {/* Token Budget */}
      {analytics.tokenBudget > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium flex items-center gap-1">
              <Zap className="h-3 w-3" />
              {t('analytics.tokenBudget') || 'Token Budget'}
            </span>
            <span className={cn(
              'text-muted-foreground',
              analytics.budgetUsedPercent > 80 && 'text-orange-500',
              analytics.budgetUsedPercent > 95 && 'text-destructive'
            )}>
              {formatTokens(analytics.totalTokens)} / {formatTokens(analytics.tokenBudget)}
            </span>
          </div>
          <Progress
            value={analytics.budgetUsedPercent}
            className={cn(
              'h-2',
              analytics.budgetUsedPercent > 80 && '[&>div]:bg-orange-500',
              analytics.budgetUsedPercent > 95 && '[&>div]:bg-destructive'
            )}
          />
          {analytics.budgetUsedPercent > 80 && (
            <div className="flex items-center gap-1 text-[10px] text-orange-500">
              <AlertTriangle className="h-3 w-3" />
              {analytics.budgetRemaining > 0
                ? `${formatTokens(analytics.budgetRemaining)} tokens remaining`
                : 'Budget exceeded!'
              }
            </div>
          )}
        </div>
      )}

      {/* Failure/Retry Stats */}
      {(analytics.failedTasks > 0 || analytics.retriedTasks > 0 || analytics.cancelledTasks > 0) && (
        <div className="flex flex-wrap gap-2">
          {analytics.failedTasks > 0 && (
            <Badge variant="outline" className="text-[10px] text-destructive border-destructive/30 gap-1">
              <XCircle className="h-3 w-3" />
              {analytics.failedTasks} failed
            </Badge>
          )}
          {analytics.retriedTasks > 0 && (
            <Badge variant="outline" className="text-[10px] text-orange-500 border-orange-500/30 gap-1">
              <TrendingUp className="h-3 w-3" />
              {analytics.retriedTasks} retried
            </Badge>
          )}
          {analytics.cancelledTasks > 0 && (
            <Badge variant="outline" className="text-[10px] text-muted-foreground gap-1">
              {analytics.cancelledTasks} cancelled
            </Badge>
          )}
        </div>
      )}

      <Separator />

      {/* Token Usage per Teammate (horizontal bar chart) */}
      {analytics.teammateTokens.length > 0 && (
        <div className="space-y-2">
          <span className="text-xs font-medium text-muted-foreground">
            {t('analytics.tokensByTeammate') || 'Tokens by Teammate'}
          </span>
          <div className="space-y-1.5">
            {analytics.teammateTokens.map((tm) => (
              <Tooltip key={tm.name}>
                <TooltipTrigger asChild>
                  <div className="space-y-0.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="truncate max-w-[60%]">
                        {tm.name}
                        {tm.role === 'lead' && (
                          <span className="text-muted-foreground ml-1">(lead)</span>
                        )}
                      </span>
                      <span className="text-muted-foreground">
                        {formatTokens(tm.tokens)} ({tm.percent}%)
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all',
                          tm.role === 'lead' ? 'bg-indigo-500/70' : 'bg-primary/70'
                        )}
                        style={{ width: `${(tm.tokens / analytics.maxTeammateTokens) * 100}%` }}
                      />
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right" className="text-xs">
                  <div>
                    <p className="font-medium">{tm.name}</p>
                    <p>Prompt: {formatTokens(tm.prompt)}</p>
                    <p>Completion: {formatTokens(tm.completion)}</p>
                    <p>Tasks: {tm.tasksCompleted}</p>
                  </div>
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        </div>
      )}

      {/* Task Duration Comparison */}
      {analytics.taskDurations.length > 0 && (
        <>
          <Separator />
          <div className="space-y-2">
            <span className="text-xs font-medium text-muted-foreground">
              {t('analytics.taskDurations') || 'Task Durations'}
            </span>
            <div className="space-y-1">
              {analytics.taskDurations.slice(0, 8).map((td, i) => {
                const maxDuration = analytics.taskDurations[0]?.duration || 1;
                return (
                  <div key={i} className="flex items-center gap-2 text-[11px]">
                    <Clock className="h-3 w-3 text-muted-foreground shrink-0" />
                    <span className="truncate flex-1 max-w-[50%]">{td.title}</span>
                    <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-blue-500/60"
                        style={{ width: `${(td.duration / maxDuration) * 100}%` }}
                      />
                    </div>
                    <span className="text-muted-foreground shrink-0 w-12 text-right">
                      {formatDuration(td.duration)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ============================================================================
// StatCard
// ============================================================================

function StatCard({
  icon,
  label,
  value,
  sublabel,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sublabel?: string;
}) {
  return (
    <div className="rounded-lg border bg-card/50 p-2.5 space-y-1">
      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="text-lg font-semibold leading-none">{value}</div>
      {sublabel && (
        <div className="text-[10px] text-muted-foreground">{sublabel}</div>
      )}
    </div>
  );
}

export type { AgentTeamAnalyticsProps };
