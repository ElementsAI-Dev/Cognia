/**
 * useAgentTraceAsLogs — Hook that reads agent trace data and returns
 * it as StructuredLogEntry[] for unified display in LogPanel.
 *
 * Merges two sources:
 * 1. Live events from useAgentTraceStore (real-time)
 * 2. Persisted records from Dexie via useAgentTrace (history)
 */

import { useMemo } from 'react';
import type { StructuredLogEntry } from '@/lib/logger';
import { useAgentTraceStore } from '@/stores/agent-trace';
import { useAgentTrace } from '@/hooks/agent-trace/use-agent-trace';
import {
  agentTraceEventToLogEntry,
  dbAgentTraceToLogEntry,
} from '@/lib/agent-trace/log-adapter';

const EMPTY_EVENTS: never[] = [];

export interface UseAgentTraceLogsOptions {
  /** Whether to enable agent trace log integration */
  enabled?: boolean;
  /** Maximum number of logs to return */
  maxLogs?: number;
  /** Whether to include persisted history from Dexie */
  includeHistory?: boolean;
}

export interface UseAgentTraceLogsReturn {
  /** Converted log entries from agent trace */
  logs: StructuredLogEntry[];
  /** Loading state (only applies when includeHistory is true) */
  isLoading: boolean;
  /** Error state */
  error: Error | null;
}

/**
 * Hook that reads agent trace events (live + persisted) and converts
 * them to StructuredLogEntry format for display in LogPanel.
 */
export function useAgentTraceAsLogs(
  options: UseAgentTraceLogsOptions = {}
): UseAgentTraceLogsReturn {
  const { enabled = false, maxLogs = 200, includeHistory = true } = options;

  // Live events from in-memory store (use stable empty ref when disabled)
  const recentEvents = useAgentTraceStore((s) => (enabled ? s.recentEvents : EMPTY_EVENTS));

  // Persisted records from Dexie
  const {
    traces: dbTraces,
    isLoading,
    error: traceError,
  } = useAgentTrace({
    limit: enabled && includeHistory ? maxLogs : 0,
  });

  // Convert live events to StructuredLogEntry
  const liveLogs = useMemo(() => {
    if (!enabled) return [];
    return recentEvents.map(agentTraceEventToLogEntry);
  }, [enabled, recentEvents]);

  // Convert persisted records to StructuredLogEntry
  const historyLogs = useMemo(() => {
    if (!enabled || !includeHistory || !dbTraces.length) return [];
    return dbTraces
      .map(dbAgentTraceToLogEntry)
      .filter((entry): entry is StructuredLogEntry => entry !== null);
  }, [enabled, includeHistory, dbTraces]);

  // Merge, deduplicate by id, sort by timestamp descending, and limit
  const mergedLogs = useMemo(() => {
    if (!enabled) return [];

    const seen = new Set<string>();
    const combined: StructuredLogEntry[] = [];

    // Live events first (more recent)
    for (const entry of liveLogs) {
      if (!seen.has(entry.id)) {
        seen.add(entry.id);
        combined.push(entry);
      }
    }

    // Then history
    for (const entry of historyLogs) {
      if (!seen.has(entry.id)) {
        seen.add(entry.id);
        combined.push(entry);
      }
    }

    combined.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    return combined.slice(0, maxLogs);
  }, [enabled, liveLogs, historyLogs, maxLogs]);

  return {
    logs: mergedLogs,
    isLoading: enabled && includeHistory ? isLoading : false,
    error: traceError ? new Error(traceError) : null,
  };
}

export default useAgentTraceAsLogs;
