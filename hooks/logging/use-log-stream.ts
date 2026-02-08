/**
 * useLogStream Hook
 * 
 * Provides real-time log streaming from IndexedDB storage.
 * Supports filtering, grouping by trace ID, and auto-refresh.
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  IndexedDBTransport,
  type StructuredLogEntry,
  type LogLevel,
  type LogFilter,
} from '@/lib/logger';

export interface LogStreamOptions {
  /** Enable auto-refresh polling */
  autoRefresh?: boolean;
  /** Refresh interval in milliseconds */
  refreshInterval?: number;
  /** Maximum number of logs to keep in memory */
  maxLogs?: number;
  /** Filter by log level */
  level?: LogLevel | 'all';
  /** Filter by module name */
  module?: string;
  /** Filter by trace ID */
  traceId?: string;
  /** Search query for message content */
  searchQuery?: string;
  /** Use regex for search query */
  useRegex?: boolean;
  /** Filter by tags */
  tags?: string[];
  /** Group logs by trace ID */
  groupByTraceId?: boolean;
}

export interface LogStreamResult {
  /** Current logs */
  logs: StructuredLogEntry[];
  /** Logs grouped by trace ID (if groupByTraceId is true) */
  groupedLogs: Map<string, StructuredLogEntry[]>;
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  error: Error | null;
  /** Manually refresh logs */
  refresh: () => Promise<void>;
  /** Clear all logs */
  clearLogs: () => Promise<void>;
  /** Export logs as JSON or text */
  exportLogs: (format?: 'json' | 'text') => string;
  /** Log statistics */
  stats: {
    total: number;
    byLevel: Record<LogLevel, number>;
    byModule: Record<string, number>;
    oldestEntry?: Date;
    newestEntry?: Date;
  };
  /** Log rate (logs per minute, averaged over recent window) */
  logRate: number;
}

const DEFAULT_OPTIONS: LogStreamOptions = {
  autoRefresh: false,
  refreshInterval: 2000,
  maxLogs: 1000,
  level: 'all',
  useRegex: false,
  groupByTraceId: false,
};

/**
 * Hook for streaming logs from IndexedDB with real-time updates
 */
export function useLogStream(options: LogStreamOptions = {}): LogStreamResult {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  const [logs, setLogs] = useState<StructuredLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  // Use ref for transport to avoid recreating on each render
  const transportRef = useRef<IndexedDBTransport | null>(null);
  
  // Initialize transport
  useEffect(() => {
    transportRef.current = new IndexedDBTransport();
    return () => {
      transportRef.current = null;
    };
  }, []);

  // Fetch logs from IndexedDB
  const fetchLogs = useCallback(async () => {
    if (!transportRef.current) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      const filter: LogFilter = {
        limit: opts.maxLogs,
      };
      
      if (opts.level && opts.level !== 'all') {
        filter.level = opts.level;
      }
      
      if (opts.module) {
        filter.module = opts.module;
      }
      
      if (opts.traceId) {
        filter.traceId = opts.traceId;
      }
      
      let fetchedLogs = await transportRef.current.getLogs(filter);
      
      // Apply search filter (client-side)
      if (opts.searchQuery) {
        if (opts.useRegex) {
          try {
            const regex = new RegExp(opts.searchQuery, 'i');
            fetchedLogs = fetchedLogs.filter(log =>
              regex.test(log.message) ||
              regex.test(log.module) ||
              (log.traceId && regex.test(log.traceId)) ||
              (log.data && regex.test(JSON.stringify(log.data)))
            );
          } catch {
            // Invalid regex, fall back to literal search
            const query = opts.searchQuery.toLowerCase();
            fetchedLogs = fetchedLogs.filter(log =>
              log.message.toLowerCase().includes(query)
            );
          }
        } else {
          const query = opts.searchQuery.toLowerCase();
          fetchedLogs = fetchedLogs.filter(log => 
            log.message.toLowerCase().includes(query) ||
            log.module.toLowerCase().includes(query) ||
            (log.traceId && log.traceId.toLowerCase().includes(query)) ||
            (log.data && JSON.stringify(log.data).toLowerCase().includes(query))
          );
        }
      }

      // Apply tag filter (client-side)
      if (opts.tags && opts.tags.length > 0) {
        fetchedLogs = fetchedLogs.filter(log =>
          log.tags && opts.tags!.some(tag => log.tags!.includes(tag))
        );
      }
      
      setLogs(fetchedLogs);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch logs'));
    } finally {
      setIsLoading(false);
    }
  }, [opts.maxLogs, opts.level, opts.module, opts.traceId, opts.searchQuery, opts.useRegex, opts.tags]);

  // Initial fetch
  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Auto-refresh polling
  useEffect(() => {
    if (!opts.autoRefresh) return;
    
    const interval = setInterval(fetchLogs, opts.refreshInterval);
    return () => clearInterval(interval);
  }, [opts.autoRefresh, opts.refreshInterval, fetchLogs]);

  // Group logs by trace ID
  const groupedLogs = useCallback(() => {
    if (!opts.groupByTraceId) return new Map();
    
    const groups = new Map<string, StructuredLogEntry[]>();
    
    for (const log of logs) {
      const traceId = log.traceId || 'no-trace';
      const existing = groups.get(traceId) || [];
      existing.push(log);
      groups.set(traceId, existing);
    }
    
    return groups;
  }, [logs, opts.groupByTraceId]);

  // Clear all logs
  const clearLogs = useCallback(async () => {
    if (!transportRef.current) return;
    
    try {
      await transportRef.current.clear();
      setLogs([]);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to clear logs'));
    }
  }, []);

  // Export logs
  const exportLogs = useCallback((format: 'json' | 'text' = 'json'): string => {
    if (format === 'json') {
      return JSON.stringify(logs, null, 2);
    }
    
    return logs.map(log => {
      const timestamp = new Date(log.timestamp).toISOString();
      const level = log.level.toUpperCase().padEnd(5);
      const moduleName = log.module.padEnd(15);
      const trace = log.traceId ? `[${log.traceId.slice(0, 8)}]` : '';
      return `${timestamp} ${level} ${moduleName} ${trace} ${log.message}`;
    }).join('\n');
  }, [logs]);

  // Calculate statistics
  const stats = useCallback(() => {
    const byLevel: Record<string, number> = {};
    const byModule: Record<string, number> = {};
    let oldest: Date | undefined;
    let newest: Date | undefined;
    
    for (const log of logs) {
      byLevel[log.level] = (byLevel[log.level] || 0) + 1;
      byModule[log.module] = (byModule[log.module] || 0) + 1;
      
      const ts = new Date(log.timestamp);
      if (!oldest || ts < oldest) oldest = ts;
      if (!newest || ts > newest) newest = ts;
    }
    
    return {
      total: logs.length,
      byLevel: byLevel as Record<LogLevel, number>,
      byModule,
      oldestEntry: oldest,
      newestEntry: newest,
    };
  }, [logs]);

  // Calculate log rate (logs per minute in the last 5 minutes)
  const logRate = useMemo(() => {
    if (logs.length < 2) return 0;
    const now = Date.now();
    const fiveMinAgo = now - 5 * 60 * 1000;
    const recentLogs = logs.filter(l => new Date(l.timestamp).getTime() >= fiveMinAgo);
    if (recentLogs.length === 0) return 0;
    
    const oldest = Math.min(...recentLogs.map(l => new Date(l.timestamp).getTime()));
    const spanMinutes = Math.max((now - oldest) / (1000 * 60), 1 / 60);
    return Math.round(recentLogs.length / spanMinutes);
  }, [logs]);

  return {
    logs,
    groupedLogs: groupedLogs(),
    isLoading,
    error,
    refresh: fetchLogs,
    clearLogs,
    exportLogs,
    stats: stats(),
    logRate,
  };
}

/**
 * Hook for getting unique module names from logs
 */
export function useLogModules(): string[] {
  const [modules, setModules] = useState<string[]>([]);
  
  useEffect(() => {
    const transport = new IndexedDBTransport();
    
    const fetchModuleNames = async () => {
      try {
        const logs = await transport.getLogs({ limit: 1000 });
        const uniqueModules = [...new Set(logs.map(l => l.module))].sort();
        setModules(uniqueModules);
      } catch {
        // Ignore errors
      }
    };
    
    fetchModuleNames();
  }, []);
  
  return modules;
}

export default useLogStream;
