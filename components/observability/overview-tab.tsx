'use client';

/**
 * OverviewTab - Overview tab content for the observability dashboard
 *
 * Displays usage trend charts, token breakdown, latency distribution,
 * recommendations, efficiency metrics, performance metrics, session analytics,
 * and provider distribution.
 */

import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { RecommendationsPanel } from './recommendations-panel';
import { SessionAnalyticsPanel } from './session-analytics-panel';
import { EfficiencyMetricsCard } from './efficiency-metrics-card';
import { PerformanceMetricsPanel } from './performance-metrics-panel';
import {
  UsageTrendChart,
  ProviderChart,
  ModelChart,
  TokenBreakdownChart,
  LatencyDistributionChart,
  EfficiencyRadarChart,
} from './charts';
import { calculateEfficiencyScores, formatTokens, formatCost } from '@/lib/observability';
import type { MetricsData, SessionData } from '@/types/observability';
import type { UsageStatistics, TimeSeriesDataPoint, CostEfficiencyMetrics, ProviderUsageBreakdown, ModelUsageBreakdown } from '@/lib/ai/usage-analytics';
import type { MetricsSummary, AgentMetrics } from '@/lib/ai/agent/performance-metrics';

interface OverviewTabProps {
  statistics: UsageStatistics;
  metricsData: MetricsData;
  timeSeries: TimeSeriesDataPoint[];
  recommendations: string[];
  efficiency: CostEfficiencyMetrics;
  providerBreakdown: ProviderUsageBreakdown[];
  perfSummary: MetricsSummary;
  perfHistory: AgentMetrics[];
  perfActiveExecutions: AgentMetrics[];
  hasPerfData: boolean;
  topSessions: SessionData[];
  dailySummary?: {
    today: UsageStatistics;
    yesterday: UsageStatistics;
    thisWeek: UsageStatistics;
    thisMonth: UsageStatistics;
  };
  modelBreakdown?: ModelUsageBreakdown[];
  onClearPerfMetrics?: () => void;
  onRefreshPerfMetrics?: () => void;
}

export function OverviewTab({
  statistics,
  metricsData,
  timeSeries,
  recommendations,
  efficiency,
  providerBreakdown,
  perfSummary,
  perfHistory,
  perfActiveExecutions,
  hasPerfData,
  topSessions,
  dailySummary,
  modelBreakdown,
  onClearPerfMetrics,
  onRefreshPerfMetrics,
}: OverviewTabProps) {
  const t = useTranslations('observability.dashboard');
  const providerChartData = providerBreakdown.map((p) => ({
    provider: p.provider,
    tokens: p.tokens,
    cost: p.cost,
    requests: p.requests,
    percentage: p.percentage,
  }));

  return (
    <div className="space-y-4">
      {/* Main charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <UsageTrendChart data={timeSeries} height={260} />
          {/* Secondary charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TokenBreakdownChart
              data={{
                inputTokens: statistics.inputTokens,
                outputTokens: statistics.outputTokens,
              }}
              height={200}
            />
            <LatencyDistributionChart
              data={metricsData.latencyPercentiles}
              averageLatency={metricsData.averageLatency}
              height={180}
            />
          </div>
        </div>
        {/* Sidebar */}
        <div className="space-y-4">
          <RecommendationsPanel recommendations={recommendations} />
          <EfficiencyRadarChart
            data={calculateEfficiencyScores({
              costPerKToken: efficiency.costPerKToken,
              averageLatency: metricsData.averageLatency,
              errorRate: metricsData.errorRate / 100,
              tokensPerDollar: efficiency.tokensPerDollar,
              totalRequests: statistics.totalRequests,
            })}
            height={220}
          />
          <EfficiencyMetricsCard metrics={efficiency} />
          <PerformanceMetricsPanel
            summary={perfSummary}
            history={perfHistory}
            activeExecutions={perfActiveExecutions}
            hasData={hasPerfData}
            onClear={onClearPerfMetrics}
            onRefresh={onRefreshPerfMetrics}
          />
          {topSessions.length > 0 && (
            <SessionAnalyticsPanel sessions={topSessions} maxSessions={5} />
          )}
        </div>
      </div>
      {/* Daily comparison card */}
      {dailySummary && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{t('dailyComparison') || 'Daily Comparison'}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="space-y-1">
                <span className="text-muted-foreground">{t('today') || 'Today'}</span>
                <div className="font-medium">{formatTokens(dailySummary.today.totalTokens)} tokens</div>
                <div className="text-xs text-muted-foreground">{formatCost(dailySummary.today.totalCost)}</div>
              </div>
              <div className="space-y-1">
                <span className="text-muted-foreground">{t('yesterday') || 'Yesterday'}</span>
                <div className="font-medium">{formatTokens(dailySummary.yesterday.totalTokens)} tokens</div>
                <div className="text-xs text-muted-foreground">{formatCost(dailySummary.yesterday.totalCost)}</div>
              </div>
              <div className="space-y-1">
                <span className="text-muted-foreground">{t('thisWeek') || 'This Week'}</span>
                <div className="font-medium">{formatTokens(dailySummary.thisWeek.totalTokens)} tokens</div>
                <div className="text-xs text-muted-foreground">{formatCost(dailySummary.thisWeek.totalCost)}</div>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-1">
                  <span className="text-muted-foreground">{t('trend') || 'Trend'}</span>
                  {dailySummary.today.totalTokens > dailySummary.yesterday.totalTokens ? (
                    <TrendingUp className="h-3 w-3 text-orange-500" />
                  ) : dailySummary.today.totalTokens < dailySummary.yesterday.totalTokens ? (
                    <TrendingDown className="h-3 w-3 text-green-500" />
                  ) : (
                    <Minus className="h-3 w-3 text-muted-foreground" />
                  )}
                </div>
                <div className="font-medium">
                  {dailySummary.yesterday.totalTokens > 0
                    ? `${(((dailySummary.today.totalTokens - dailySummary.yesterday.totalTokens) / dailySummary.yesterday.totalTokens) * 100).toFixed(1)}%`
                    : '—'}
                </div>
                <div className="text-xs text-muted-foreground">{t('vsYesterday') || 'vs yesterday'}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Provider distribution */}
      {providerChartData.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ProviderChart data={providerChartData} dataKey="tokens" height={220} />
          <ProviderChart data={providerChartData} dataKey="cost" height={220} />
        </div>
      )}

      {/* Model breakdown */}
      {modelBreakdown && modelBreakdown.length > 0 && (
        <ModelChart data={modelBreakdown} dataKey="requests" height={200} />
      )}
    </div>
  );
}
