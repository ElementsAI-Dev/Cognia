/**
 * usePerformanceMetrics - Hook for surfacing agent execution performance data
 *
 * Reads from the globalMetricsCollector singleton to provide reactive
 * performance metrics for the observability dashboard.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  globalMetricsCollector,
  type AgentMetrics,
  type MetricsSummary,
} from '@/lib/ai/agent/performance-metrics';

export interface UsePerformanceMetricsReturn {
  /** Aggregated summary statistics */
  summary: MetricsSummary;
  /** Currently active (in-progress) agent executions */
  activeExecutions: AgentMetrics[];
  /** Recent completed execution history */
  history: AgentMetrics[];
  /** Whether there is any data */
  hasData: boolean;
  /** Force a refresh */
  refresh: () => void;
  /** Clear all collected metrics */
  clearMetrics: () => void;
}

/**
 * Hook that polls the global MetricsCollector for agent performance data.
 *
 * @param refreshInterval - Polling interval in milliseconds (default 5000)
 * @param historyLimit - Maximum number of history entries to return (default 20)
 */
export function usePerformanceMetrics(
  refreshInterval = 5000,
  historyLimit = 20
): UsePerformanceMetricsReturn {
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => {
    setTick((prev) => prev + 1);
  }, []);

  const clearMetrics = useCallback(() => {
    globalMetricsCollector.clear();
    refresh();
  }, [refresh]);

  useEffect(() => {
    const interval = setInterval(refresh, refreshInterval);
    return () => clearInterval(interval);
  }, [refresh, refreshInterval]);

  const summary = useMemo<MetricsSummary>(
    () => globalMetricsCollector.getSummary(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tick]
  );

  const activeExecutions = useMemo<AgentMetrics[]>(
    () => globalMetricsCollector.getActiveExecutions(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tick]
  );

  const history = useMemo<AgentMetrics[]>(
    () => globalMetricsCollector.getHistory(historyLimit),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tick, historyLimit]
  );

  const hasData = summary.totalExecutions > 0 || activeExecutions.length > 0;

  return {
    summary,
    activeExecutions,
    history,
    hasData,
    refresh,
    clearMetrics,
  };
}
