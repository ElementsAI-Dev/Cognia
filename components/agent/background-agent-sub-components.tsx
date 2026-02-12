'use client';

/**
 * Background agent sub-components extracted from background-agent-panel.tsx
 * - AgentLogsViewer: Displays agent execution logs with filtering
 * - PerformanceStatsCard: Shows performance metrics
 * - ResultPreview: Quick result preview for completed agents
 */

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import {
  ChevronRight,
  Clock,
  BarChart3,
  Eye,
  Zap,
  TrendingUp,
  Activity,
  Terminal,
} from 'lucide-react';
import { cn, formatDurationShort, formatTimeFromDate } from '@/lib/utils';
import { LOG_LEVEL_CONFIG } from '@/lib/agent';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import type {
  BackgroundAgent,
  BackgroundAgentLog,
} from '@/types/agent/background-agent';
import type { PerformanceStats } from '@/types/agent/component-types';

export type { PerformanceStats } from '@/types/agent/component-types';

// Agent logs viewer component
export function AgentLogsViewer({
  logs,
  maxHeight = 300,
}: {
  logs: BackgroundAgentLog[];
  maxHeight?: number;
}) {
  const t = useTranslations('agent');
  const [filter, setFilter] = useState<string>('all');
  const [_autoScroll, _setAutoScroll] = useState(true);

  const filteredLogs = useMemo(() => {
    if (filter === 'all') return logs;
    return logs.filter((log) => log.level === filter);
  }, [logs, filter]);

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 bg-muted/40 supports-[backdrop-filter]:bg-muted/30 border-b">
        <div className="flex items-center gap-2">
          <Terminal className="h-4 w-4" />
          <span className="text-sm font-medium">{t('logs')}</span>
          <Badge variant="outline" className="text-[10px]">
            {logs.length}
          </Badge>
        </div>
        <div className="flex items-center gap-1">
          {['all', 'info', 'warn', 'error'].map((level) => (
            <Button
              key={level}
              variant={filter === level ? 'secondary' : 'ghost'}
              size="sm"
              className="h-6 text-xs px-2"
              onClick={() => setFilter(level)}
            >
              {level}
            </Button>
          ))}
        </div>
      </div>
      <ScrollArea style={{ height: maxHeight }}>
        <div className="p-2 space-y-1 font-mono text-xs">
          <>
            {filteredLogs.map((log, idx) => {
              const config = LOG_LEVEL_CONFIG[log.level] || LOG_LEVEL_CONFIG.info;
              const LogIcon = config.icon;
              return (
                <div
                  key={log.id || idx}
                  className="flex items-start gap-2 py-1 px-2 rounded hover:bg-muted/50 transition-opacity"
                >
                  <LogIcon className={cn('h-3.5 w-3.5 mt-0.5 shrink-0', config.color)} />
                  <span className="text-muted-foreground shrink-0">
                    {formatTimeFromDate(log.timestamp)}
                  </span>
                  {log.mcpServerId && (
                    <Badge variant="outline" className="text-[9px] h-4 px-1 shrink-0">
                      {log.mcpServerName || log.mcpServerId}
                    </Badge>
                  )}
                  <span className="flex-1 break-all">{log.message}</span>
                </div>
              );
            })}
          </>
          {filteredLogs.length === 0 && (
            <div className="text-center py-4 text-muted-foreground">{t('noLogs')}</div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

// Performance statistics component
export function PerformanceStatsCard({ stats }: { stats: PerformanceStats }) {
  const t = useTranslations('agent');
  return (
    <div className="border rounded-lg p-4 space-y-4">
      <div className="flex items-center gap-2">
        <BarChart3 className="h-4 w-4" />
        <span className="text-sm font-medium">{t('performanceStats')}</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Activity className="h-3 w-3" />
            <span>{t('tasks')}</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-semibold">{stats.completedTasks}</span>
            <span className="text-xs text-muted-foreground">/ {stats.totalTasks}</span>
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <TrendingUp className="h-3 w-3" />
            <span>{t('successRate')}</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span
              className={cn(
                'text-lg font-semibold',
                stats.successRate >= 80
                  ? 'text-green-500'
                  : stats.successRate >= 50
                    ? 'text-yellow-500'
                    : 'text-destructive'
              )}
            >
              {stats.successRate.toFixed(1)}%
            </span>
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>{t('avgDuration')}</span>
          </div>
          <div className="text-lg font-semibold">{formatDurationShort(stats.averageDuration)}</div>
        </div>

        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Zap className="h-3 w-3" />
            <span>{t('toolCalls')}</span>
          </div>
          <div className="text-lg font-semibold">{stats.toolCallsTotal}</div>
        </div>
      </div>

      <div className="pt-2 border-t">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">{t('subAgentsActive')}</span>
          <span className="font-medium">{stats.activeSubAgents}</span>
        </div>
        {stats.tokenUsage > 0 && (
          <div className="flex items-center justify-between text-xs mt-1">
            <span className="text-muted-foreground">{t('tokenUsage')}</span>
            <span className="font-medium">{stats.tokenUsage.toLocaleString()}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// Quick result preview component
export function ResultPreview({ agent }: { agent: BackgroundAgent }) {
  const [expanded, setExpanded] = useState(false);
  const t = useTranslations('agent');
  const hasResult = agent.status === 'completed' && agent.result;

  if (!hasResult) return null;

  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        className="flex items-center justify-between w-full px-3 py-2 bg-green-50 dark:bg-green-950/30 border-b hover:bg-green-100 dark:hover:bg-green-950/50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <Eye className="h-4 w-4 text-green-600" />
          <span className="text-sm font-medium text-green-700 dark:text-green-400">
            {t('resultPreview')}
          </span>
        </div>
        <ChevronRight
          className={cn('h-4 w-4 text-green-600 transition-transform', expanded && 'rotate-90')}
        />
      </button>
      {expanded && (
        <div className="overflow-hidden transition-all">
          <div className="p-3 text-sm max-h-48 overflow-auto">
            {typeof agent.result === 'string' ? (
              <p className="whitespace-pre-wrap">{agent.result}</p>
            ) : (
              <pre className="text-xs overflow-auto">{JSON.stringify(agent.result, null, 2)}</pre>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
