'use client';

/**
 * LoggerProvider - React Context wrapper for the unified logging system
 * 
 * This provider integrates with the unified logger system at @/lib/logger
 * and provides React hooks for easy access to logging functions.
 * 
 * @deprecated For new code, prefer importing directly from @/lib/logger
 */

import { createContext, useContext, useCallback, ReactNode, useState, useMemo, useEffect } from 'react';
import type { AppLogLevel, LogEntry, LoggerConfig, LogTransport } from '@/types';
import { LOG_LEVEL_PRIORITY } from '@/types';
import {
  loggers,
  IndexedDBTransport,
  updateLoggerConfig,
  addTransport as addUnifiedTransport,
  removeTransport as removeUnifiedTransport,
  type StructuredLogEntry,
  type LogLevel as UnifiedLogLevel,
} from '@/lib/logger';

// Re-export types for backward compatibility
export type { AppLogLevel, LogEntry, LoggerConfig, LogTransport } from '@/types';

// Alias for backward compatibility
export type LogLevel = AppLogLevel;

// Logger context value
interface LoggerContextValue {
  // Logging functions
  debug: (message: string, data?: unknown, context?: Record<string, unknown>) => void;
  info: (message: string, data?: unknown, context?: Record<string, unknown>) => void;
  warn: (message: string, data?: unknown, context?: Record<string, unknown>) => void;
  error: (message: string, error?: Error | unknown, context?: Record<string, unknown>) => void;
  fatal: (message: string, error?: Error | unknown, context?: Record<string, unknown>) => void;

  // Log management
  getLogs: (filter?: { level?: LogLevel; since?: Date; limit?: number }) => Promise<LogEntry[]>;
  clearLogs: () => Promise<void>;
  exportLogs: (format?: 'json' | 'text') => Promise<string>;

  // Configuration
  config: LoggerConfig;
  updateConfig: (config: Partial<LoggerConfig>) => void;
  addTransport: (transport: LogTransport) => void;
  removeTransport: (name: string) => void;

  // Statistics
  getStats: () => { total: number; byLevel: Record<LogLevel, number> };
}

// Create context
const LoggerContext = createContext<LoggerContextValue | undefined>(undefined);

// Default configuration
const DEFAULT_CONFIG: LoggerConfig = {
  minLevel: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  enableConsole: true,
  enableStorage: true,
  enableRemote: false,
  maxStorageEntries: 1000,
  includeStackTrace: process.env.NODE_ENV === 'development',
};

// Convert StructuredLogEntry to legacy LogEntry format
function convertToLegacyEntry(entry: StructuredLogEntry): LogEntry {
  return {
    id: entry.id,
    timestamp: new Date(entry.timestamp),
    level: entry.level as AppLogLevel,
    message: entry.message,
    data: entry.data,
    context: entry.data as Record<string, unknown> | undefined,
    stack: entry.stack,
    sessionId: entry.sessionId,
  };
}

interface LoggerProviderProps {
  children: ReactNode;
  /** Custom logger configuration */
  config?: Partial<LoggerConfig>;
  /** Custom transports to add */
  transports?: LogTransport[];
  /** Session ID for log tracking */
  sessionId?: string;
}

/**
 * Logger Provider Component
 * Now delegates to unified logger system while maintaining backward compatibility
 */
export function LoggerProvider({
  children,
  config: userConfig = {},
  transports: _userTransports = [],
  sessionId: _sessionId,
}: LoggerProviderProps) {
  const [config, setConfig] = useState<LoggerConfig>({ ...DEFAULT_CONFIG, ...userConfig });
  const [stats, setStats] = useState({ total: 0, byLevel: {} as Record<LogLevel, number> });
  
  // Initialize IndexedDB transport for log retrieval
  const [indexedDBTransport] = useState(() => new IndexedDBTransport());

  // Session ID is passed to log entries directly via the unified logger context
  // The unified logger uses its own session management

  // Sync config with unified logger
  useEffect(() => {
    updateLoggerConfig({
      minLevel: config.minLevel as UnifiedLogLevel,
      includeStackTrace: config.includeStackTrace,
      includeSource: process.env.NODE_ENV === 'development',
    });
  }, [config]);

  // Core logging function using unified logger
  const log = useCallback(
    (level: LogLevel, message: string, data?: unknown, context?: Record<string, unknown>) => {
      // Check if we should log this level
      if (LOG_LEVEL_PRIORITY[level] < LOG_LEVEL_PRIORITY[config.minLevel]) {
        return;
      }
      
      const combinedData = { 
        ...context, 
        ...(typeof data === 'object' && data !== null && !(data instanceof Error) 
          ? data as Record<string, unknown> 
          : data !== undefined && !(data instanceof Error) 
            ? { value: data } 
            : {}) 
      };
      
      switch (level) {
        case 'debug':
          loggers.app.debug(message, combinedData);
          break;
        case 'info':
          loggers.app.info(message, combinedData);
          break;
        case 'warn':
          loggers.app.warn(message, combinedData);
          break;
        case 'error':
          loggers.app.error(message, data instanceof Error ? data : undefined, combinedData);
          break;
        case 'fatal':
          loggers.app.fatal(message, data instanceof Error ? data : undefined, combinedData);
          break;
      }

      // Update stats
      setStats((prev) => ({
        total: prev.total + 1,
        byLevel: {
          ...prev.byLevel,
          [level]: (prev.byLevel[level] || 0) + 1,
        },
      }));
    },
    [config.minLevel]
  );

  // Convenience methods
  const debug = useCallback(
    (message: string, data?: unknown, context?: Record<string, unknown>) => {
      log('debug', message, data, context);
    },
    [log]
  );

  const info = useCallback(
    (message: string, data?: unknown, context?: Record<string, unknown>) => {
      log('info', message, data, context);
    },
    [log]
  );

  const warn = useCallback(
    (message: string, data?: unknown, context?: Record<string, unknown>) => {
      log('warn', message, data, context);
    },
    [log]
  );

  const error = useCallback(
    (message: string, err?: Error | unknown, context?: Record<string, unknown>) => {
      log('error', message, err, context);
    },
    [log]
  );

  const fatal = useCallback(
    (message: string, err?: Error | unknown, context?: Record<string, unknown>) => {
      log('fatal', message, err, context);
    },
    [log]
  );

  // Log management - now using IndexedDB transport from unified logger
  const getLogs = useCallback(
    async (filter?: { level?: LogLevel; since?: Date; limit?: number }): Promise<LogEntry[]> => {
      const structuredLogs = await indexedDBTransport.getLogs({
        level: filter?.level as UnifiedLogLevel,
        limit: filter?.limit,
      });
      
      let logs = structuredLogs.map(convertToLegacyEntry);

      if (filter?.since) {
        logs = logs.filter((l) => l.timestamp >= filter.since!);
      }

      return logs;
    },
    [indexedDBTransport]
  );

  const clearLogs = useCallback(async () => {
    await indexedDBTransport.clear();
    setStats({ total: 0, byLevel: {} as Record<LogLevel, number> });
  }, [indexedDBTransport]);

  const exportLogs = useCallback(
    async (format: 'json' | 'text' = 'json'): Promise<string> => {
      const logs = await getLogs();

      if (format === 'json') {
        return JSON.stringify(logs, null, 2);
      }

      return logs
        .map(
          (l) =>
            `[${l.timestamp.toISOString()}] [${l.level.toUpperCase()}] ${l.message}${
              l.data ? ` ${JSON.stringify(l.data)}` : ''
            }`
        )
        .join('\n');
    },
    [getLogs]
  );

  // Configuration management
  const updateConfig = useCallback((updates: Partial<LoggerConfig>) => {
    setConfig((prev) => ({ ...prev, ...updates }));
  }, []);

  const addTransport = useCallback((transport: LogTransport) => {
    // Wrap legacy transport for unified logger
    addUnifiedTransport({
      name: transport.name,
      log: (entry) => {
        transport.log(convertToLegacyEntry(entry));
      },
    });
  }, []);

  const removeTransport = useCallback((name: string) => {
    removeUnifiedTransport(name);
  }, []);

  const getStats = useCallback(() => {
    return stats;
  }, [stats]);

  const value = useMemo(
    (): LoggerContextValue => ({
      debug,
      info,
      warn,
      error,
      fatal,
      getLogs,
      clearLogs,
      exportLogs,
      config,
      updateConfig,
      addTransport,
      removeTransport,
      getStats,
    }),
    [
      debug,
      info,
      warn,
      error,
      fatal,
      getLogs,
      clearLogs,
      exportLogs,
      config,
      updateConfig,
      addTransport,
      removeTransport,
      getStats,
    ]
  );

  return <LoggerContext.Provider value={value}>{children}</LoggerContext.Provider>;
}

/**
 * Hook to access logger
 */
export function useLogger(): LoggerContextValue {
  const context = useContext(LoggerContext);
  if (!context) {
    throw new Error('useLogger must be used within LoggerProvider');
  }
  return context;
}

/**
 * Hook for quick logging without full context
 */
export function useLog() {
  const { debug, info, warn, error, fatal } = useLogger();

  return {
    debug,
    info,
    warn,
    error,
    fatal,
    log: info, // Alias for convenience
  };
}

export default LoggerProvider;
