/**
 * useAgentTrace - Hook for managing agent trace data
 *
 * Provides reactive access to agent trace records with filtering,
 * pagination, and CRUD operations.
 */

import { useState, useCallback, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import Dexie from 'dexie';
import { db, type DBAgentTrace } from '@/lib/db';
import { agentTraceRepository } from '@/lib/db/repositories/agent-trace-repository';
import type { LineAttribution } from '@/lib/db/repositories/agent-trace-repository';
import { useSettingsStore } from '@/stores/settings';
import type { AgentTraceEventType, AgentTraceRecord } from '@/types/agent-trace';

export interface UseAgentTraceOptions {
  /** Filter by session ID */
  sessionId?: string;
  /** Filter by file path (partial match) */
  filePath?: string;
  /** Filter by VCS revision */
  vcsRevision?: string;
  /** Filter by event type */
  eventType?: AgentTraceEventType;
  /** Maximum number of records to return */
  limit?: number;
  /** Enable auto-refresh */
  autoRefresh?: boolean;
}

// Re-export LineAttribution for external consumers
export type { LineAttribution };

export interface UseAgentTraceReturn {
  /** List of trace records */
  traces: DBAgentTrace[];
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  error: string | null;
  /** Total count of records */
  totalCount: number;
  /** Whether agent trace is enabled in settings */
  isEnabled: boolean;
  /** Refresh traces */
  refresh: () => void;
  /** Get a single trace by ID */
  getById: (id: string) => Promise<AgentTraceRecord | null>;
  /** Delete a trace by ID */
  deleteTrace: (id: string) => Promise<void>;
  /** Delete traces by session ID */
  deleteBySession: (sessionId: string) => Promise<number>;
  /** Delete traces older than N days */
  deleteOlderThan: (days: number) => Promise<number>;
  /** Clear all traces */
  clearAll: () => Promise<void>;
  /** Export traces as JSON */
  exportAsJson: () => string;
  /** Export traces as JSONL */
  exportAsJsonl: () => string;
  /** Find attribution for a specific line (per spec section 6.5) */
  findLineAttribution: (filePath: string, lineNumber: number, vcsRevision?: string) => Promise<LineAttribution | null>;
  /** Find attribution using git blame + agent trace lookup (per spec section 6.5) */
  findLineAttributionWithBlame: (filePath: string, lineNumber: number) => Promise<{
    blameInfo: import('@/lib/native/git').GitBlameLineInfo | null;
    traceAttribution: LineAttribution | null;
  }>;
  /** Export as spec-compliant merged record */
  exportAsSpecRecord: () => Promise<AgentTraceRecord | null>;
}

export function useAgentTrace(options: UseAgentTraceOptions = {}): UseAgentTraceReturn {
  const { sessionId, filePath, vcsRevision, eventType, limit = 200 } = options;

  const [refreshTick, setRefreshTick] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Get settings
  const isEnabled = useSettingsStore((state) => state.agentTraceSettings.enabled);

  // Trimmed filter values
  const trimmedSessionId = sessionId?.trim() || '';
  const trimmedFilePath = filePath?.trim().toLowerCase() || '';
  const trimmedVcsRevision = vcsRevision?.trim() || '';

  // Query traces with live updates
  const queryResult = useLiveQuery(
    async () => {
      try {
        if (trimmedSessionId) {
          return db.agentTraces
            .where('[sessionId+timestamp]')
            .between([trimmedSessionId, Dexie.minKey], [trimmedSessionId, Dexie.maxKey])
            .reverse()
            .limit(limit)
            .toArray();
        }
        if (trimmedVcsRevision) {
          return db.agentTraces
            .where('[vcsRevision+timestamp]')
            .between([trimmedVcsRevision, Dexie.minKey], [trimmedVcsRevision, Dexie.maxKey])
            .reverse()
            .limit(limit)
            .toArray();
        }
        return db.agentTraces.orderBy('timestamp').reverse().limit(limit).toArray();
      } catch (err) {
        console.error('Failed to query agent traces:', err);
        return [];
      }
    },
    [trimmedSessionId, trimmedVcsRevision, limit, refreshTick],
    [] as DBAgentTrace[]
  );

  // Filter by file path if provided
  const traces = useMemo(() => {
    if (!trimmedFilePath && !eventType && !trimmedVcsRevision) return queryResult;

    return queryResult.filter((trace) => {
      let parsed: AgentTraceRecord | null = null;
      const getRecord = () => {
        if (parsed) return parsed;
        try {
          parsed = JSON.parse(trace.record) as AgentTraceRecord;
          return parsed;
        } catch {
          return null;
        }
      };

      if (trimmedVcsRevision) {
        const revision = trace.vcsRevision || getRecord()?.vcs?.revision;
        if (revision !== trimmedVcsRevision) return false;
      }

      if (trimmedFilePath) {
        const filePaths = trace.filePaths ?? [];
        const matchesIndexed = filePaths.some((path) => path.toLowerCase().includes(trimmedFilePath));
        if (!matchesIndexed) {
          const record = getRecord();
          const recordPaths = record?.files?.map((file) => file.path?.toLowerCase() || '') ?? [];
          if (!recordPaths.some((path) => path.includes(trimmedFilePath))) {
            return false;
          }
        }
      }

      if (eventType) {
        const record = getRecord();
        if (!record || record.eventType !== eventType) return false;
      }

      return true;
    });
  }, [queryResult, trimmedFilePath, eventType, trimmedVcsRevision]);

  // Get total count
  const totalCount = useLiveQuery(
    async () => db.agentTraces.count(),
    [refreshTick],
    0
  );

  // Refresh function
  const refresh = useCallback(() => {
    setRefreshTick((t) => t + 1);
  }, [setRefreshTick]);

  // Get by ID
  const getById = useCallback(async (id: string): Promise<AgentTraceRecord | null> => {
    try {
      return await agentTraceRepository.getById(id);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to get trace';
      setError(message);
      return null;
    }
  }, [setError]);

  // Delete single trace
  const deleteTrace = useCallback(async (id: string): Promise<void> => {
    try {
      await agentTraceRepository.delete(id);
      refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete trace';
      setError(message);
      throw err;
    }
  }, [refresh, setError]);

  // Delete by session
  const deleteBySession = useCallback(async (sessionIdToDelete: string): Promise<number> => {
    try {
      const toDelete = await db.agentTraces
        .where('[sessionId+timestamp]')
        .between([sessionIdToDelete, Dexie.minKey], [sessionIdToDelete, Dexie.maxKey])
        .toArray();

      const ids = toDelete.map((t) => t.id);
      await db.agentTraces.bulkDelete(ids);
      refresh();
      return ids.length;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete traces by session';
      setError(message);
      throw err;
    }
  }, [refresh, setError]);

  // Delete older than N days
  const deleteOlderThan = useCallback(async (days: number): Promise<number> => {
    try {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);

      const toDelete = await db.agentTraces
        .where('timestamp')
        .below(cutoff)
        .toArray();

      const ids = toDelete.map((t) => t.id);
      await db.agentTraces.bulkDelete(ids);
      refresh();
      return ids.length;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete old traces';
      setError(message);
      throw err;
    }
  }, [refresh, setError]);

  // Clear all traces
  const clearAll = useCallback(async (): Promise<void> => {
    try {
      await agentTraceRepository.clear();
      refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to clear traces';
      setError(message);
      throw err;
    }
  }, [refresh, setError]);

  // Export as JSON
  const exportAsJson = useCallback((): string => {
    const records = traces.map((t) => {
      try {
        return JSON.parse(t.record);
      } catch {
        return { id: t.id, error: 'Failed to parse record' };
      }
    });
    return JSON.stringify(records, null, 2);
  }, [traces]);

  // Export as JSONL
  const exportAsJsonl = useCallback((): string => {
    return traces
      .map((t) => {
        try {
          return JSON.stringify(JSON.parse(t.record));
        } catch {
          return JSON.stringify({ id: t.id, error: 'Failed to parse record' });
        }
      })
      .join('\n');
  }, [traces]);

  // Find attribution for a specific line (per spec section 6.5)
  const findLineAttribution = useCallback(
    async (
      filePathToFind: string,
      lineNumber: number,
      vcsRevision?: string
    ): Promise<LineAttribution | null> => {
      try {
        return await agentTraceRepository.findByLineNumber(
          filePathToFind,
          lineNumber,
          vcsRevision
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to find line attribution';
        setError(message);
        return null;
      }
    },
    [setError]
  );

  // Export as spec-compliant merged record
  const exportAsSpecRecord = useCallback(async (): Promise<AgentTraceRecord | null> => {
    try {
      return await agentTraceRepository.exportAsSpecRecord({
        sessionId: trimmedSessionId || undefined,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to export spec record';
      setError(message);
      return null;
    }
  }, [trimmedSessionId, setError]);

  // Find attribution using git blame + agent trace (per spec section 6.5)
  const findLineAttributionWithBlame = useCallback(
    async (filePathToFind: string, lineNumber: number) => {
      try {
        return await agentTraceRepository.findLineAttributionWithBlame(filePathToFind, lineNumber);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to find line attribution with blame';
        setError(message);
        return { blameInfo: null, traceAttribution: null };
      }
    },
    [setError]
  );

  return {
    traces,
    isLoading: queryResult === undefined,
    error,
    totalCount: totalCount ?? 0,
    isEnabled,
    refresh,
    getById,
    deleteTrace,
    deleteBySession,
    deleteOlderThan,
    clearAll,
    exportAsJson,
    exportAsJsonl,
    findLineAttribution,
    findLineAttributionWithBlame,
    exportAsSpecRecord,
  };
}

export default useAgentTrace;
