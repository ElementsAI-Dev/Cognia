'use client';

/**
 * useUsageAnalytics Hook
 * 
 * A hook for accessing and analyzing usage data with real-time updates
 */

import { useMemo, useCallback } from 'react';
import { useUsageStore } from '@/stores/system/usage-store';
import {
  calculateUsageStatistics,
  getModelUsageBreakdown,
  getProviderUsageBreakdown,
  analyzeUsageTrend,
  calculateCostEfficiency,
  getDailyUsageSummary,
  getTopSessionsByUsage,
  getUsageRecommendations,
  filterRecordsByPeriod,
  type AnalyticsPeriod,
  type UsageStatistics,
  type ModelUsageBreakdown,
  type ProviderUsageBreakdown,
  type UsageTrend,
  type CostEfficiencyMetrics,
} from '@/lib/ai/usage-analytics';

export interface UseUsageAnalyticsOptions {
  period?: AnalyticsPeriod;
  sessionId?: string;
  providerId?: string;
}

export interface UseUsageAnalyticsReturn {
  statistics: UsageStatistics;
  modelBreakdown: ModelUsageBreakdown[];
  providerBreakdown: ProviderUsageBreakdown[];
  trend: UsageTrend;
  efficiency: CostEfficiencyMetrics;
  dailySummary: {
    today: UsageStatistics;
    yesterday: UsageStatistics;
    thisWeek: UsageStatistics;
    thisMonth: UsageStatistics;
  };
  topSessions: Array<{ sessionId: string; tokens: number; cost: number; requests: number }>;
  recommendations: string[];
  recordCount: number;
  isLoading: boolean;
  refresh: () => void;
}

/**
 * Hook for accessing usage analytics data
 */
export function useUsageAnalytics(
  options: UseUsageAnalyticsOptions = {}
): UseUsageAnalyticsReturn {
  const { period = 'week', sessionId, providerId } = options;
  
  const records = useUsageStore((state) => state.records);
  
  const filteredRecords = useMemo(() => {
    let filtered = filterRecordsByPeriod(records, period);
    
    if (sessionId) {
      filtered = filtered.filter(r => r.sessionId === sessionId);
    }
    
    if (providerId) {
      filtered = filtered.filter(r => r.provider === providerId);
    }
    
    return filtered;
  }, [records, period, sessionId, providerId]);

  const statistics = useMemo(
    () => calculateUsageStatistics(filteredRecords),
    [filteredRecords]
  );

  const modelBreakdown = useMemo(
    () => getModelUsageBreakdown(filteredRecords),
    [filteredRecords]
  );

  const providerBreakdown = useMemo(
    () => getProviderUsageBreakdown(filteredRecords),
    [filteredRecords]
  );

  const trend = useMemo(
    () => analyzeUsageTrend(filteredRecords, period),
    [filteredRecords, period]
  );

  const efficiency = useMemo(
    () => calculateCostEfficiency(filteredRecords),
    [filteredRecords]
  );

  const dailySummary = useMemo(
    () => getDailyUsageSummary(records),
    [records]
  );

  const topSessions = useMemo(
    () => getTopSessionsByUsage(filteredRecords, 10),
    [filteredRecords]
  );

  const recommendations = useMemo(
    () => getUsageRecommendations(filteredRecords),
    [filteredRecords]
  );

  const refresh = useCallback(() => {
    // Force re-render by triggering state update
    // The store will handle any necessary refresh logic
  }, []);

  return {
    statistics,
    modelBreakdown,
    providerBreakdown,
    trend,
    efficiency,
    dailySummary,
    topSessions,
    recommendations,
    recordCount: filteredRecords.length,
    isLoading: false,
    refresh,
  };
}

/**
 * Hook for getting quick usage summary
 */
export function useUsageSummary() {
  const { statistics, trend, dailySummary } = useUsageAnalytics({ period: 'month' });
  
  return {
    totalTokens: statistics.totalTokens,
    totalCost: statistics.totalCost,
    totalRequests: statistics.totalRequests,
    todayTokens: dailySummary.today.totalTokens,
    todayCost: dailySummary.today.totalCost,
    trend: trend.trend,
    percentChange: trend.percentChange,
  };
}

/**
 * Hook for session-specific analytics
 */
export function useSessionAnalytics(sessionId: string) {
  return useUsageAnalytics({ sessionId, period: 'all' });
}

/**
 * Hook for provider-specific analytics
 */
export function useProviderAnalytics(providerId: string, period: AnalyticsPeriod = 'month') {
  return useUsageAnalytics({ providerId, period });
}

export default useUsageAnalytics;
