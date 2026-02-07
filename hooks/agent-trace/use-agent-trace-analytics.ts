/**
 * useAgentTraceAnalytics - Hook for session-level agent trace analytics
 *
 * Provides aggregated analytics data for agent trace sessions including
 * token usage, latency, tool success rates, and timeline data.
 * Inspired by LangFuse/LangSmith session-level analytics patterns.
 */

import { useState, useCallback, useEffect } from 'react';
import { agentTraceRepository } from '@/lib/db/repositories/agent-trace-repository';
import type { SessionTraceSummary, TraceStats } from '@/lib/db/repositories/agent-trace-repository';

export interface UseAgentTraceAnalyticsOptions {
  /** Session ID to analyze */
  sessionId?: string;
  /** Auto-load stats on mount */
  autoLoad?: boolean;
}

export interface UseAgentTraceAnalyticsReturn {
  /** Session-level summary analytics */
  sessionSummary: SessionTraceSummary | null;
  /** Global trace statistics */
  stats: TraceStats | null;
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  error: string | null;
  /** Load session summary for a specific session */
  loadSessionSummary: (sessionId: string) => Promise<SessionTraceSummary | null>;
  /** Load global trace statistics */
  loadStats: () => Promise<TraceStats | null>;
  /** Refresh all data */
  refresh: () => Promise<void>;
  /** Format token count for display */
  formatTokens: (count: number) => string;
  /** Format duration for display */
  formatDuration: (ms: number) => string;
  /** Format bytes for display */
  formatBytes: (bytes: number) => string;
}

function formatTokens(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
  return String(count);
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m ${Math.floor((ms % 60_000) / 1000)}s`;
  return `${Math.floor(ms / 3_600_000)}h ${Math.floor((ms % 3_600_000) / 60_000)}m`;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function useAgentTraceAnalytics(
  options: UseAgentTraceAnalyticsOptions = {}
): UseAgentTraceAnalyticsReturn {
  const { sessionId, autoLoad = true } = options;

  const [sessionSummary, setSessionSummary] = useState<SessionTraceSummary | null>(null);
  const [stats, setStats] = useState<TraceStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSessionSummary = useCallback(async (sid: string): Promise<SessionTraceSummary | null> => {
    try {
      setIsLoading(true);
      setError(null);
      const summary = await agentTraceRepository.getSessionSummary(sid);
      setSessionSummary(summary);
      return summary;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load session summary';
      setError(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadStats = useCallback(async (): Promise<TraceStats | null> => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await agentTraceRepository.getStats();
      setStats(result);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load trace stats';
      setError(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      await loadStats();
      if (sessionId) {
        await loadSessionSummary(sessionId);
      }
    } finally {
      setIsLoading(false);
    }
  }, [sessionId, loadStats, loadSessionSummary]);

  // Auto-load on mount and when sessionId changes
  useEffect(() => {
    if (!autoLoad) return;
    void loadStats();
    if (sessionId) {
      void loadSessionSummary(sessionId);
    }
  }, [autoLoad, sessionId, loadStats, loadSessionSummary]);

  return {
    sessionSummary,
    stats,
    isLoading,
    error,
    loadSessionSummary,
    loadStats,
    refresh,
    formatTokens,
    formatDuration,
    formatBytes,
  };
}
