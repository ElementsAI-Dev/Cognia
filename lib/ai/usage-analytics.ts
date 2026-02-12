/**
 * Usage Analytics Utilities
 * 
 * Functions for analyzing token usage patterns, calculating statistics,
 * and generating insights from usage data.
 */

import type { UsageRecord } from '@/types/system/usage';
import { formatCost as _internalFormatCost } from '@/lib/observability';

/**
 * Time period for analytics aggregation
 */
export type AnalyticsPeriod = 'hour' | 'day' | 'week' | 'month' | 'all';

/**
 * Usage statistics summary
 */
export interface UsageStatistics {
  totalTokens: number;
  totalCost: number;
  totalRequests: number;
  averageTokensPerRequest: number;
  averageCostPerRequest: number;
  inputTokens: number;
  outputTokens: number;
  inputOutputRatio: number;
}

/**
 * Model usage breakdown
 */
export interface ModelUsageBreakdown {
  model: string;
  tokens: number;
  cost: number;
  requests: number;
  percentage: number;
}

/**
 * Provider usage breakdown
 */
export interface ProviderUsageBreakdown {
  provider: string;
  tokens: number;
  cost: number;
  requests: number;
  percentage: number;
}

/**
 * Time series data point
 */
export interface TimeSeriesDataPoint {
  timestamp: number;
  date: string;
  tokens: number;
  cost: number;
  requests: number;
}

/**
 * Usage trend analysis
 */
export interface UsageTrend {
  period: AnalyticsPeriod;
  dataPoints: TimeSeriesDataPoint[];
  totalTokens: number;
  totalCost: number;
  averageDaily: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  percentChange: number;
}

/**
 * Cost efficiency metrics
 */
export interface CostEfficiencyMetrics {
  costPerKToken: number;
  tokensPerDollar: number;
  mostEfficientModel: string | null;
  leastEfficientModel: string | null;
  potentialSavings: number;
}

/**
 * Calculate basic usage statistics
 */
export function calculateUsageStatistics(records: UsageRecord[]): UsageStatistics {
  if (records.length === 0) {
    return {
      totalTokens: 0,
      totalCost: 0,
      totalRequests: 0,
      averageTokensPerRequest: 0,
      averageCostPerRequest: 0,
      inputTokens: 0,
      outputTokens: 0,
      inputOutputRatio: 0,
    };
  }

  const totalTokens = records.reduce((sum, r) => sum + (r.tokens?.total || 0), 0);
  const totalCost = records.reduce((sum, r) => sum + (r.cost || 0), 0);
  const inputTokens = records.reduce((sum, r) => sum + (r.tokens?.prompt || 0), 0);
  const outputTokens = records.reduce((sum, r) => sum + (r.tokens?.completion || 0), 0);

  return {
    totalTokens,
    totalCost,
    totalRequests: records.length,
    averageTokensPerRequest: totalTokens / records.length,
    averageCostPerRequest: totalCost / records.length,
    inputTokens,
    outputTokens,
    inputOutputRatio: outputTokens > 0 ? inputTokens / outputTokens : 0,
  };
}

/**
 * Get usage breakdown by model
 */
export function getModelUsageBreakdown(records: UsageRecord[]): ModelUsageBreakdown[] {
  const modelMap = new Map<string, { tokens: number; cost: number; requests: number }>();

  for (const record of records) {
    const model = record.model || 'unknown';
    const existing = modelMap.get(model) || { tokens: 0, cost: 0, requests: 0 };
    modelMap.set(model, {
      tokens: existing.tokens + (record.tokens?.total || 0),
      cost: existing.cost + (record.cost || 0),
      requests: existing.requests + 1,
    });
  }

  const totalTokens = records.reduce((sum, r) => sum + (r.tokens?.total || 0), 0);
  
  return Array.from(modelMap.entries())
    .map(([model, data]) => ({
      model,
      tokens: data.tokens,
      cost: data.cost,
      requests: data.requests,
      percentage: totalTokens > 0 ? (data.tokens / totalTokens) * 100 : 0,
    }))
    .sort((a, b) => b.tokens - a.tokens);
}

/**
 * Get usage breakdown by provider
 */
export function getProviderUsageBreakdown(records: UsageRecord[]): ProviderUsageBreakdown[] {
  const providerMap = new Map<string, { tokens: number; cost: number; requests: number }>();

  for (const record of records) {
    const provider = record.provider || 'unknown';
    const existing = providerMap.get(provider) || { tokens: 0, cost: 0, requests: 0 };
    providerMap.set(provider, {
      tokens: existing.tokens + (record.tokens?.total || 0),
      cost: existing.cost + (record.cost || 0),
      requests: existing.requests + 1,
    });
  }

  const totalTokens = records.reduce((sum, r) => sum + (r.tokens?.total || 0), 0);
  
  return Array.from(providerMap.entries())
    .map(([provider, data]) => ({
      provider,
      tokens: data.tokens,
      cost: data.cost,
      requests: data.requests,
      percentage: totalTokens > 0 ? (data.tokens / totalTokens) * 100 : 0,
    }))
    .sort((a, b) => b.tokens - a.tokens);
}

/**
 * Filter records by time period
 */
export function filterRecordsByPeriod(
  records: UsageRecord[],
  period: AnalyticsPeriod
): UsageRecord[] {
  if (period === 'all') return records;

  const now = Date.now();
  const periodMs: Record<Exclude<AnalyticsPeriod, 'all'>, number> = {
    hour: 60 * 60 * 1000,
    day: 24 * 60 * 60 * 1000,
    week: 7 * 24 * 60 * 60 * 1000,
    month: 30 * 24 * 60 * 60 * 1000,
  };

  const cutoff = now - periodMs[period];
  
  return records.filter(r => {
    const timestamp = r.createdAt instanceof Date 
      ? r.createdAt.getTime() 
      : new Date(r.createdAt).getTime();
    return timestamp >= cutoff;
  });
}

/** Time series granularity options */
export type TimeSeriesGranularity = 'minute' | 'hour' | 'day';

/**
 * Generate time series data for usage trends
 */
export function generateUsageTimeSeries(
  records: UsageRecord[],
  period: AnalyticsPeriod = 'week',
  granularity: TimeSeriesGranularity = 'day'
): TimeSeriesDataPoint[] {
  const filteredRecords = filterRecordsByPeriod(records, period);
  const dataMap = new Map<string, TimeSeriesDataPoint>();

  const getDateKey = (timestamp: number): string => {
    const date = new Date(timestamp);
    if (granularity === 'minute') {
      // Format: YYYY-MM-DDTHH:MM
      return date.toISOString().slice(0, 16);
    }
    if (granularity === 'hour') {
      return date.toISOString().slice(0, 13) + ':00';
    }
    return date.toISOString().slice(0, 10);
  };

  for (const record of filteredRecords) {
    const timestamp = record.createdAt instanceof Date 
      ? record.createdAt.getTime() 
      : new Date(record.createdAt).getTime();
    const dateKey = getDateKey(timestamp);

    const existing = dataMap.get(dateKey) || {
      timestamp: new Date(dateKey).getTime(),
      date: dateKey,
      tokens: 0,
      cost: 0,
      requests: 0,
    };

    dataMap.set(dateKey, {
      ...existing,
      tokens: existing.tokens + (record.tokens?.total || 0),
      cost: existing.cost + (record.cost || 0),
      requests: existing.requests + 1,
    });
  }

  return Array.from(dataMap.values()).sort((a, b) => a.timestamp - b.timestamp);
}

/**
 * Analyze usage trend
 */
export function analyzeUsageTrend(
  records: UsageRecord[],
  period: AnalyticsPeriod = 'week'
): UsageTrend {
  const dataPoints = generateUsageTimeSeries(records, period);
  const totalTokens = dataPoints.reduce((sum, p) => sum + p.tokens, 0);
  const totalCost = dataPoints.reduce((sum, p) => sum + p.cost, 0);
  const averageDaily = dataPoints.length > 0 ? totalTokens / dataPoints.length : 0;

  // Calculate trend by comparing first half to second half
  let trend: UsageTrend['trend'] = 'stable';
  let percentChange = 0;

  if (dataPoints.length >= 2) {
    const midpoint = Math.floor(dataPoints.length / 2);
    const firstHalf = dataPoints.slice(0, midpoint);
    const secondHalf = dataPoints.slice(midpoint);

    const firstHalfAvg = firstHalf.reduce((sum, p) => sum + p.tokens, 0) / firstHalf.length;
    const secondHalfAvg = secondHalf.reduce((sum, p) => sum + p.tokens, 0) / secondHalf.length;

    if (firstHalfAvg > 0) {
      percentChange = ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100;
      
      if (percentChange > 10) {
        trend = 'increasing';
      } else if (percentChange < -10) {
        trend = 'decreasing';
      }
    }
  }

  return {
    period,
    dataPoints,
    totalTokens,
    totalCost,
    averageDaily,
    trend,
    percentChange,
  };
}

/**
 * Calculate cost efficiency metrics
 */
export function calculateCostEfficiency(records: UsageRecord[]): CostEfficiencyMetrics {
  const totalTokens = records.reduce((sum, r) => sum + (r.tokens?.total || 0), 0);
  const totalCost = records.reduce((sum, r) => sum + (r.cost || 0), 0);

  // Calculate per-model efficiency
  const modelEfficiency = new Map<string, { tokens: number; cost: number }>();
  
  for (const record of records) {
    const model = record.model || 'unknown';
    const existing = modelEfficiency.get(model) || { tokens: 0, cost: 0 };
    modelEfficiency.set(model, {
      tokens: existing.tokens + (record.tokens?.total || 0),
      cost: existing.cost + (record.cost || 0),
    });
  }

  // Find most and least efficient models
  let mostEfficientModel: string | null = null;
  let leastEfficientModel: string | null = null;
  let bestEfficiency = Infinity;
  let worstEfficiency = 0;

  for (const [model, data] of modelEfficiency) {
    if (data.tokens > 0 && data.cost > 0) {
      const efficiency = data.cost / (data.tokens / 1000); // cost per K tokens
      if (efficiency < bestEfficiency) {
        bestEfficiency = efficiency;
        mostEfficientModel = model;
      }
      if (efficiency > worstEfficiency) {
        worstEfficiency = efficiency;
        leastEfficientModel = model;
      }
    }
  }

  // Calculate potential savings if all usage used most efficient model
  let potentialSavings = 0;
  if (mostEfficientModel && bestEfficiency < Infinity) {
    const idealCost = (totalTokens / 1000) * bestEfficiency;
    potentialSavings = Math.max(0, totalCost - idealCost);
  }

  return {
    costPerKToken: totalTokens > 0 ? (totalCost / totalTokens) * 1000 : 0,
    tokensPerDollar: totalCost > 0 ? totalTokens / totalCost : 0,
    mostEfficientModel,
    leastEfficientModel,
    potentialSavings,
  };
}

/**
 * Get top N sessions by token usage
 */
export function getTopSessionsByUsage(
  records: UsageRecord[],
  limit: number = 10
): Array<{ sessionId: string; tokens: number; cost: number; requests: number }> {
  const sessionMap = new Map<string, { tokens: number; cost: number; requests: number }>();

  for (const record of records) {
    const sessionId = record.sessionId || 'unknown';
    const existing = sessionMap.get(sessionId) || { tokens: 0, cost: 0, requests: 0 };
    sessionMap.set(sessionId, {
      tokens: existing.tokens + (record.tokens?.total || 0),
      cost: existing.cost + (record.cost || 0),
      requests: existing.requests + 1,
    });
  }

  return Array.from(sessionMap.entries())
    .map(([sessionId, data]) => ({ sessionId, ...data }))
    .sort((a, b) => b.tokens - a.tokens)
    .slice(0, limit);
}

/**
 * Calculate daily usage summary
 */
export function getDailyUsageSummary(records: UsageRecord[]): {
  today: UsageStatistics;
  yesterday: UsageStatistics;
  thisWeek: UsageStatistics;
  thisMonth: UsageStatistics;
} {
  const todayStart = new Date().setHours(0, 0, 0, 0);
  const yesterdayStart = todayStart - 24 * 60 * 60 * 1000;
  const weekStart = todayStart - 7 * 24 * 60 * 60 * 1000;
  const monthStart = todayStart - 30 * 24 * 60 * 60 * 1000;

  const getTimestamp = (record: UsageRecord): number => {
    return record.createdAt instanceof Date 
      ? record.createdAt.getTime() 
      : new Date(record.createdAt).getTime();
  };

  const todayRecords = records.filter(r => getTimestamp(r) >= todayStart);
  const yesterdayRecords = records.filter(r => {
    const ts = getTimestamp(r);
    return ts >= yesterdayStart && ts < todayStart;
  });
  const weekRecords = records.filter(r => getTimestamp(r) >= weekStart);
  const monthRecords = records.filter(r => getTimestamp(r) >= monthStart);

  return {
    today: calculateUsageStatistics(todayRecords),
    yesterday: calculateUsageStatistics(yesterdayRecords),
    thisWeek: calculateUsageStatistics(weekRecords),
    thisMonth: calculateUsageStatistics(monthRecords),
  };
}

// Re-export canonical formatting functions from @/lib/observability
export { formatCost, formatTokens } from '@/lib/observability';

/**
 * Get usage recommendations based on patterns
 */
export function getUsageRecommendations(
  records: UsageRecord[]
): string[] {
  const recommendations: string[] = [];
  
  if (records.length === 0) {
    return ['No usage data available for analysis.'];
  }

  const stats = calculateUsageStatistics(records);
  const modelBreakdown = getModelUsageBreakdown(records);
  const efficiency = calculateCostEfficiency(records);
  const trend = analyzeUsageTrend(records, 'week');

  // Check input/output ratio
  if (stats.inputOutputRatio > 5) {
    recommendations.push(
      'High input to output ratio detected. Consider summarizing context or using shorter prompts.'
    );
  }

  // Check for expensive model usage
  const expensiveModels = modelBreakdown.filter(m => 
    m.model.includes('opus') || m.model.includes('gpt-4-turbo')
  );
  if (expensiveModels.length > 0 && expensiveModels[0].percentage > 50) {
    recommendations.push(
      'Consider using more cost-effective models like GPT-4o-mini or Claude Haiku for simpler tasks.'
    );
  }

  // Check potential savings
  if (efficiency.potentialSavings > 1) {
    recommendations.push(
      `Potential savings of ${_internalFormatCost(efficiency.potentialSavings)} by optimizing model selection.`
    );
  }

  // Check usage trend
  if (trend.trend === 'increasing' && trend.percentChange > 50) {
    recommendations.push(
      `Usage increased by ${trend.percentChange.toFixed(0)}% this period. Consider setting budget alerts.`
    );
  }

  // Check average cost
  if (stats.averageCostPerRequest > 0.1) {
    recommendations.push(
      'Average cost per request is high. Consider optimizing prompts or using streaming.'
    );
  }

  if (recommendations.length === 0) {
    recommendations.push('Usage patterns look healthy. Keep up the good work!');
  }

  return recommendations;
}
