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

  // Time series data with appropriate granularity
  const timeSeries = useMemo(() => {
    // Use minute granularity for 1h, hour for 24h, day for longer periods
    const granularity = timeRange === '1h' ? 'minute' : timeRange === '24h' ? 'hour' : 'day';
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

    // Calculate real latency from records with latency data
    const recordsWithLatency = filteredRecords.filter(r => r.latency !== undefined && r.latency > 0);
    const latencies = recordsWithLatency.map(r => r.latency!).sort((a, b) => a - b);
    
    const avgLatency = latencies.length > 0 
      ? latencies.reduce((sum, l) => sum + l, 0) / latencies.length
      : 0;

    // Calculate real latency percentiles
    const getPercentile = (arr: number[], p: number): number => {
      if (arr.length === 0) return 0;
      const index = Math.ceil((p / 100) * arr.length) - 1;
      return arr[Math.max(0, index)];
    };

    const p50 = getPercentile(latencies, 50);
    const p90 = getPercentile(latencies, 90);
    const p99 = getPercentile(latencies, 99);

    // Calculate real error rate
    const errorRecords = filteredRecords.filter(r => r.status === 'error' || r.status === 'timeout');
    const errorRate = filteredRecords.length > 0 
      ? (errorRecords.length / filteredRecords.length) * 100
      : 0;

    return {
      totalRequests: statistics.totalRequests,
      totalTokens: statistics.totalTokens,
      totalCost: statistics.totalCost,
      averageLatency: avgLatency,
      errorRate,
      requestsByProvider,
      requestsByModel,
      tokensByProvider,
      costByProvider,
      latencyPercentiles: {
        p50,
        p90,
        p99,
      },
    };
  }, [statistics, providerBreakdown, modelBreakdown, filteredRecords]);

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
