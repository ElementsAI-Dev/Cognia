/**
 * Observability Data Hook
 *
 * Aggregates data from usage store and provides computed metrics
 * for the observability dashboard.
 */

import { useMemo, useCallback } from 'react';
import { useUsageStore } from '@/stores';
import {
  calculateUsageStatistics,
  getModelUsageBreakdown,
  getProviderUsageBreakdown,
  generateUsageTimeSeries,
  analyzeUsageTrend,
  calculateCostEfficiency,
  getUsageRecommendations,
  getDailyUsageSummary,
  filterRecordsByPeriod,
  type AnalyticsPeriod,
  type UsageStatistics,
  type ModelUsageBreakdown,
  type ProviderUsageBreakdown,
  type TimeSeriesDataPoint,
  type UsageTrend,
  type CostEfficiencyMetrics,
} from '@/lib/ai/usage-analytics';
import type { MetricsData, TimeRange } from '@/components/observability/observability-dashboard';

/**
 * Convert TimeRange to AnalyticsPeriod
 */
function timeRangeToPeriod(timeRange: TimeRange): AnalyticsPeriod {
  switch (timeRange) {
    case '1h':
      return 'hour';
    case '24h':
      return 'day';
    case '7d':
      return 'week';
    case '30d':
      return 'month';
    default:
      return 'week';
  }
}

/**
 * Observability data returned by the hook
 */
export interface ObservabilityData {
  // Core statistics
  statistics: UsageStatistics;
  metricsData: MetricsData;

  // Breakdowns
  modelBreakdown: ModelUsageBreakdown[];
  providerBreakdown: ProviderUsageBreakdown[];

  // Time series
  timeSeries: TimeSeriesDataPoint[];
  trend: UsageTrend;

  // Efficiency
  efficiency: CostEfficiencyMetrics;

  // Recommendations
  recommendations: string[];

  // Daily summary
  dailySummary: {
    today: UsageStatistics;
    yesterday: UsageStatistics;
    thisWeek: UsageStatistics;
    thisMonth: UsageStatistics;
  };

  // Status
  hasData: boolean;
  recordCount: number;
}

/**
 * Hook for observability data
 */
export function useObservabilityData(timeRange: TimeRange = '24h'): ObservabilityData {
  const records = useUsageStore((state) => state.records);
  const period = timeRangeToPeriod(timeRange);

  // Filter records by time range
  const filteredRecords = useMemo(() => {
    return filterRecordsByPeriod(records, period);
  }, [records, period]);

  // Calculate statistics
  const statistics = useMemo(() => {
    return calculateUsageStatistics(filteredRecords);
  }, [filteredRecords]);

  // Model breakdown
  const modelBreakdown = useMemo(() => {
    return getModelUsageBreakdown(filteredRecords);
  }, [filteredRecords]);

  // Provider breakdown
  const providerBreakdown = useMemo(() => {
    return getProviderUsageBreakdown(filteredRecords);
  }, [filteredRecords]);

  // Time series data
  const timeSeries = useMemo(() => {
    const granularity = timeRange === '1h' ? 'hour' : 'day';
    return generateUsageTimeSeries(records, period, granularity);
  }, [records, period, timeRange]);

  // Usage trend
  const trend = useMemo(() => {
    return analyzeUsageTrend(records, period);
  }, [records, period]);

  // Cost efficiency
  const efficiency = useMemo(() => {
    return calculateCostEfficiency(filteredRecords);
  }, [filteredRecords]);

  // Recommendations
  const recommendations = useMemo(() => {
    return getUsageRecommendations(filteredRecords);
  }, [filteredRecords]);

  // Daily summary
  const dailySummary = useMemo(() => {
    return getDailyUsageSummary(records);
  }, [records]);

  // Convert to MetricsData format for compatibility
  const metricsData = useMemo((): MetricsData => {
    const requestsByProvider: Record<string, number> = {};
    const requestsByModel: Record<string, number> = {};
    const tokensByProvider: Record<string, number> = {};
    const costByProvider: Record<string, number> = {};

    for (const p of providerBreakdown) {
      requestsByProvider[p.provider] = p.requests;
      tokensByProvider[p.provider] = p.tokens;
      costByProvider[p.provider] = p.cost;
    }

    for (const m of modelBreakdown) {
      requestsByModel[m.model] = m.requests;
    }

    // Calculate latency percentiles (approximation from available data)
    const avgLatency = statistics.totalRequests > 0 ? 500 : 0; // Placeholder

    return {
      totalRequests: statistics.totalRequests,
      totalTokens: statistics.totalTokens,
      totalCost: statistics.totalCost,
      averageLatency: avgLatency,
      errorRate: 0, // Would need error tracking
      requestsByProvider,
      requestsByModel,
      tokensByProvider,
      costByProvider,
      latencyPercentiles: {
        p50: avgLatency * 0.8,
        p90: avgLatency * 1.5,
        p99: avgLatency * 2,
      },
    };
  }, [statistics, providerBreakdown, modelBreakdown]);

  return {
    statistics,
    metricsData,
    modelBreakdown,
    providerBreakdown,
    timeSeries,
    trend,
    efficiency,
    recommendations,
    dailySummary,
    hasData: records.length > 0,
    recordCount: filteredRecords.length,
  };
}

/**
 * Hook for observability actions
 */
export function useObservabilityActions() {
  const clearUsageRecords = useUsageStore((state) => state.clearUsageRecords);
  const clearRecordsBefore = useUsageStore((state) => state.clearRecordsBefore);

  const clearAllData = useCallback(() => {
    clearUsageRecords();
  }, [clearUsageRecords]);

  const clearOldData = useCallback(
    (daysToKeep: number) => {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
      clearRecordsBefore(cutoffDate);
    },
    [clearRecordsBefore]
  );

  return {
    clearAllData,
    clearOldData,
  };
}
