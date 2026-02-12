/**
 * Time Range Utilities
 *
 * Shared time range conversion and projection functions.
 */

import type { TimeRange } from '@/types/observability';
import type { AnalyticsPeriod } from '@/lib/ai/usage-analytics';

/**
 * Convert TimeRange to AnalyticsPeriod
 */
export function timeRangeToPeriod(timeRange: TimeRange): AnalyticsPeriod {
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
 * Get projection multiplier for estimating monthly cost from a time range
 */
export function getProjectionMultiplier(timeRange: TimeRange): number {
  switch (timeRange) {
    case '1h':
      return 24 * 30; // 1 hour to 1 month
    case '24h':
      return 30; // 1 day to 1 month
    case '7d':
      return 4.3; // 1 week to 1 month
    case '30d':
      return 1; // Already 1 month
    default:
      return 1;
  }
}
