'use client';

/**
 * PerformanceMetricsPanel - Visualizes agent execution performance data
 *
 * Shows charts and stats from usePerformanceMetrics:
 * - Execution timeline with duration bars
 * - Tool call distribution
 * - Token usage breakdown
 * - Cache hit rate gauge
 * - Active executions list
 */

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import {
  Zap,
  Clock,
  Wrench,
  Database,
  AlertTriangle,
  Activity,
  RotateCcw,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { TOOLTIP_STYLE, CHART_MARGINS, CHART_COLORS, GRID_STYLE, AXIS_STYLE } from './charts';
import { cn } from '@/lib/utils';
import type { AgentMetrics, MetricsSummary } from '@/lib/ai/agent/performance-metrics';

interface PerformanceMetricsPanelProps {
  summary: MetricsSummary;
  history: AgentMetrics[];
  activeExecutions: AgentMetrics[];
  hasData: boolean;
}

const PIE_COLORS = ['#22c55e', '#ef4444']; // success, error

function ActiveExecutionsList({ executions }: { executions: AgentMetrics[] }) {
  return (
    <div className="space-y-2">
      {executions.map((exec, i) => (
        <div key={i} className="flex items-center gap-2 text-xs">
          <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
          <span className="truncate flex-1">
            {exec.steps.length} steps, {exec.toolCalls.length} tools
          </span>
          <Badge variant="outline" className="text-[10px]">
            {exec.tokenUsage.totalTokens.toLocaleString()} tokens
          </Badge>
        </div>
      ))}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  valueClass,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <Card>
      <CardContent className="p-3 flex items-center gap-3">
        {icon}
        <div>
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className={cn('text-lg font-semibold', valueClass)}>{value}</div>
        </div>
      </CardContent>
    </Card>
  );
}

export function PerformanceMetricsPanel({
  summary,
  history,
  activeExecutions,
  hasData,
}: PerformanceMetricsPanelProps) {
  const t = useTranslations('observability.dashboard');

  // Build execution duration chart data from history
  const durationChartData = useMemo(() => {
    return history
      .filter((h) => (h.totalDuration ?? 0) > 0)
      .slice(-15)
      .map((h, i) => ({
        name: `#${i + 1}`,
        duration: Math.round((h.totalDuration ?? 0) / 1000),
        steps: h.steps.length,
        tools: h.toolCalls.length,
      }));
  }, [history]);

  // Build tool call stats
  const toolCallStats = useMemo(() => {
    const toolMap = new Map<string, number>();
    for (const exec of history) {
      for (const tc of exec.toolCalls) {
        toolMap.set(tc.toolName, (toolMap.get(tc.toolName) || 0) + 1);
      }
    }
    return Array.from(toolMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, count]) => ({ name: name.length > 16 ? name.slice(0, 16) + '…' : name, count }));
  }, [history]);

  // Cache hit/miss pie data
  const cacheData = useMemo(() => {
    const hitRate = summary.cacheHitRate;
    return [
      { name: 'Hit', value: Math.round(hitRate * 100) },
      { name: 'Miss', value: Math.round((1 - hitRate) * 100) },
    ];
  }, [summary.cacheHitRate]);

  if (!hasData) {
    return (
      <Card className="flex items-center justify-center min-h-48">
        <CardContent className="text-center text-muted-foreground py-8">
          <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>{t('noPerformanceData') || 'No agent performance data yet'}</p>
          <p className="text-xs mt-1">{t('noPerformanceDataHint') || 'Run an agent task to see metrics here'}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          icon={<Zap className="h-4 w-4 text-purple-500" />}
          label={t('executions') || 'Executions'}
          value={String(summary.totalExecutions)}
        />
        <StatCard
          icon={<Clock className="h-4 w-4 text-blue-500" />}
          label={t('avgDuration') || 'Avg Duration'}
          value={summary.averageDuration > 0 ? `${(summary.averageDuration / 1000).toFixed(1)}s` : '-'}
        />
        <StatCard
          icon={<Wrench className="h-4 w-4 text-orange-500" />}
          label={t('avgToolCalls') || 'Avg Tool Calls'}
          value={summary.averageToolCalls.toFixed(1)}
        />
        <StatCard
          icon={<AlertTriangle className="h-4 w-4 text-red-500" />}
          label={t('errorRate')}
          value={`${(summary.errorRate * 100).toFixed(1)}%`}
          valueClass={summary.errorRate > 0.1 ? 'text-red-600' : 'text-green-600'}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Execution duration chart */}
        {durationChartData.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{t('executionDuration') || 'Execution Duration (s)'}</CardTitle>
            </CardHeader>
            <CardContent className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={durationChartData} margin={CHART_MARGINS.compact}>
                  <CartesianGrid {...GRID_STYLE} />
                  <XAxis dataKey="name" {...AXIS_STYLE} />
                  <YAxis {...AXIS_STYLE} />
                  <Tooltip {...TOOLTIP_STYLE} />
                  <Bar dataKey="duration" fill={CHART_COLORS.primary} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Tool call distribution */}
        {toolCallStats.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{t('toolCallDistribution') || 'Tool Call Distribution'}</CardTitle>
            </CardHeader>
            <CardContent className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={toolCallStats} layout="vertical" margin={CHART_MARGINS.withYAxis}>
                  <CartesianGrid {...GRID_STYLE} />
                  <XAxis type="number" {...AXIS_STYLE} />
                  <YAxis dataKey="name" type="category" width={100} {...AXIS_STYLE} tick={{ fontSize: 10 }} />
                  <Tooltip {...TOOLTIP_STYLE} />
                  <Bar dataKey="count" fill={CHART_COLORS.secondary} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Cache hit rate */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Database className="h-4 w-4" />
              {t('cacheHitRate') || 'Cache Hit Rate'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center h-28">
              <ResponsiveContainer width={120} height={120}>
                <PieChart>
                  <Pie
                    data={cacheData}
                    cx="50%"
                    cy="50%"
                    innerRadius={35}
                    outerRadius={50}
                    dataKey="value"
                    strokeWidth={0}
                  >
                    {cacheData.map((_entry, index) => (
                      <Cell key={index} fill={PIE_COLORS[index]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="text-center -ml-4">
                <div className="text-2xl font-bold">
                  {(summary.cacheHitRate * 100).toFixed(0)}%
                </div>
                <div className="text-xs text-muted-foreground">Hit Rate</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Retry & error stats */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <RotateCcw className="h-4 w-4" />
              {t('retryStats') || 'Retry & Error Stats'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted-foreground">{t('errorRate')}</span>
                <span className={cn(summary.errorRate > 0.1 ? 'text-red-600' : 'text-green-600')}>
                  {(summary.errorRate * 100).toFixed(1)}%
                </span>
              </div>
              <Progress value={summary.errorRate * 100} className="h-2" />
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted-foreground">{t('retryRate') || 'Retry Rate'}</span>
                <span>{(summary.retryRate * 100).toFixed(1)}%</span>
              </div>
              <Progress value={summary.retryRate * 100} className="h-2" />
            </div>
            <div className="text-xs text-muted-foreground pt-1">
              {t('avgSteps') || 'Avg Steps'}: {summary.averageSteps.toFixed(1)} |{' '}
              {t('avgTokens') || 'Avg Tokens'}: {summary.averageTokensPerExecution.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        {/* Active executions */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Activity className="h-4 w-4" />
              {t('activeExecutions') || 'Active Executions'}
              {activeExecutions.length > 0 && (
                <Badge variant="secondary" className="text-xs">{activeExecutions.length}</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activeExecutions.length === 0 ? (
              <div className="text-xs text-muted-foreground text-center py-4">
                {t('noActiveExecutions') || 'No active agent executions'}
              </div>
            ) : (
              <ScrollArea className="max-h-28">
                <ActiveExecutionsList executions={activeExecutions} />
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
