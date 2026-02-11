'use client';

/**
 * OverviewTab - Overview tab content for the observability dashboard
 *
 * Displays usage trend charts, token breakdown, latency distribution,
 * recommendations, efficiency metrics, performance metrics, session analytics,
 * and provider distribution.
 */

import { RecommendationsPanel } from './recommendations-panel';
import { SessionAnalyticsPanel } from './session-analytics-panel';
import { EfficiencyMetricsCard } from './efficiency-metrics-card';
import { PerformanceMetricsPanel } from './performance-metrics-panel';
import {
  UsageTrendChart,
  ProviderChart,
  TokenBreakdownChart,
  LatencyDistributionChart,
  EfficiencyRadarChart,
  calculateEfficiencyScores,
} from './charts';
import type { MetricsData } from '@/types/observability';
import type { UsageStatistics, TimeSeriesDataPoint, CostEfficiencyMetrics, ProviderUsageBreakdown } from '@/lib/ai/usage-analytics';
import type { MetricsSummary, AgentMetrics } from '@/lib/ai/agent/performance-metrics';

interface SessionData {
  sessionId: string;
  tokens: number;
  cost: number;
  requests: number;
  name?: string;
  lastActive?: Date;
}

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
}: OverviewTabProps) {
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
          />
          {topSessions.length > 0 && (
            <SessionAnalyticsPanel sessions={topSessions} maxSessions={5} />
          )}
        </div>
      </div>
      {/* Provider distribution */}
      {providerChartData.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ProviderChart data={providerChartData} dataKey="tokens" height={220} />
          <ProviderChart data={providerChartData} dataKey="cost" height={220} />
        </div>
      )}
    </div>
  );
}
