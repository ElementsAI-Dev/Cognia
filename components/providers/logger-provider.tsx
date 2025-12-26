'use client';

/**
 * LoggerProvider - Centralized logging system with multiple log levels and outputs
 * Provides structured logging capabilities to the entire application
 */

import { createContext, useContext, useCallback, ReactNode, useState, useMemo } from 'react';

// Log levels
export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

// Log entry structure
export interface LogEntry {
  id: string;
  timestamp: Date;
  level: LogLevel;
  message: string;
  data?: unknown;
  context?: Record<string, unknown>;
  stack?: string;
  userId?: string;
  sessionId?: string;
}

// Logger configuration
export interface LoggerConfig {
  minLevel: LogLevel;
  enableConsole: boolean;
  enableStorage: boolean;
  enableRemote: boolean;
  remoteEndpoint?: string;
  maxStorageEntries: number;
  includeStackTrace: boolean;
}

// Log transport interface
export interface LogTransport {
  name: string;
  log: (entry: LogEntry) => void | Promise<void>;
  flush?: () => void | Promise<void>;
}

// Logger context value
interface LoggerContextValue {
  // Logging functions
  debug: (message: string, data?: unknown, context?: Record<string, unknown>) => void;
  info: (message: string, data?: unknown, context?: Record<string, unknown>) => void;
  warn: (message: string, data?: unknown, context?: Record<string, unknown>) => void;
  error: (message: string, error?: Error | unknown, context?: Record<string, unknown>) => void;
  fatal: (message: string, error?: Error | unknown, context?: Record<string, unknown>) => void;

  // Log management
  getLogs: (filter?: { level?: LogLevel; since?: Date; limit?: number }) => LogEntry[];
  clearLogs: () => void;
  exportLogs: (format?: 'json' | 'text') => string;

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

// Log level priority (higher = more severe)
const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  fatal: 4,
};

// Default configuration
const DEFAULT_CONFIG: LoggerConfig = {
  minLevel: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  enableConsole: true,
  enableStorage: true,
  enableRemote: false,
  maxStorageEntries: 1000,
  includeStackTrace: process.env.NODE_ENV === 'development',
};

// Console transport (colors)
const consoleTransport: LogTransport = {
  name: 'console',
  log: (entry) => {
    const consoleMethod = {
      debug: console.debug,
      info: console.info,
      warn: console.warn,
      error: console.error,
      fatal: console.error,
    }[entry.level];

    const timestamp = entry.timestamp.toISOString();
    const prefix = `[${timestamp}] [${entry.level.toUpperCase()}]`;

    if (entry.data) {
      consoleMethod(prefix, entry.message, entry.data);
    } else {
      consoleMethod(prefix, entry.message);
    }

    if (entry.stack) {
      console.debug(entry.stack);
    }
  },
};

// Local storage transport
class StorageTransport implements LogTransport {
  name = 'storage';
  private storageKey = 'app-logs';
  private maxEntries: number;

  constructor(maxEntries: number = 1000) {
    this.maxEntries = maxEntries;
  }

  log(entry: LogEntry): void {
    try {
      const stored = localStorage.getItem(this.storageKey);
      const logs: LogEntry[] = stored ? JSON.parse(stored) : [];

      // Add new entry
      logs.push(entry);

      // Trim if exceeds max entries
      if (logs.length > this.maxEntries) {
        logs.splice(0, logs.length - this.maxEntries);
      }

      localStorage.setItem(this.storageKey, JSON.stringify(logs));
    } catch (error) {
      console.error('Failed to store log:', error);
    }
  }

  getLogs(): LogEntry[] {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (!stored) return [];
      const logs = JSON.parse(stored);
      // Convert timestamp strings back to Date objects
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return logs.map((log: any) => ({
        ...log,
        timestamp: new Date(log.timestamp),
      }));
    } catch {
      return [];
    }
  }

  clearLogs(): void {
    localStorage.removeItem(this.storageKey);
  }

  setMaxEntries(maxEntries: number): void {
    this.maxEntries = maxEntries;
  }
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
 */
export function LoggerProvider({
  children,
  config: userConfig = {},
  transports: userTransports = [],
  sessionId,
}: LoggerProviderProps) {
  const [config, setConfig] = useState<LoggerConfig>({ ...DEFAULT_CONFIG, ...userConfig });
  
  // Initialize storage transport once using useState initializer (safe pattern)
  const [storageTransport] = useState(() => new StorageTransport(config.maxStorageEntries));
  
  // Track custom transports added via addTransport
  const [customTransports, setCustomTransports] = useState<LogTransport[]>([]);
  
  // Compute all transports based on config
  const transports = useMemo(() => {
    const result: LogTransport[] = [consoleTransport, ...userTransports, ...customTransports];
    if (config.enableStorage) {
      storageTransport.setMaxEntries(config.maxStorageEntries);
      if (!result.find((t) => t.name === 'storage')) {
        result.push(storageTransport);
      }
    }
    // Filter out duplicates by name
    const seen = new Set<string>();
    return result.filter((t) => {
      if (seen.has(t.name)) return false;
      seen.add(t.name);
      return true;
    });
  }, [config.enableStorage, config.maxStorageEntries, storageTransport, userTransports, customTransports]);
  
  const [stats, setStats] = useState({ total: 0, byLevel: {} as Record<LogLevel, number> });

  // Core logging function
  const log = useCallback(
    (level: LogLevel, message: string, data?: unknown, context?: Record<string, unknown>) => {
      // Check if we should log this level
      if (LOG_LEVEL_PRIORITY[level] < LOG_LEVEL_PRIORITY[config.minLevel]) {
        return;
      }

      const entry: LogEntry = {
        id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date(),
        level,
        message,
        data,
        context,
        sessionId,
      };

      // Add stack trace for errors if enabled
      if (
        config.includeStackTrace &&
        (level === 'error' || level === 'fatal') &&
        data instanceof Error
      ) {
        entry.stack = data.stack;
      }

      // Send to all transports
      transports.forEach((transport) => {
        try {
          transport.log(entry);
        } catch (error) {
          console.error(`Transport ${transport.name} failed:`, error);
        }
      });

      // Update stats
      setStats((prev) => ({
        total: prev.total + 1,
        byLevel: {
          ...prev.byLevel,
          [level]: (prev.byLevel[level] || 0) + 1,
        },
      }));
    },
    [config, transports, sessionId]
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

  // Log management
  const getLogs = useCallback(
    (filter?: { level?: LogLevel; since?: Date; limit?: number }): LogEntry[] => {
      let logs = storageTransport.getLogs();

      if (filter?.level) {
        logs = logs.filter((l) => l.level === filter.level);
      }

      if (filter?.since) {
        logs = logs.filter((l) => l.timestamp >= filter.since!);
      }

      if (filter?.limit) {
        logs = logs.slice(-filter.limit);
      }

      return logs;
    },
    [storageTransport]
  );

  const clearLogs = useCallback(() => {
    storageTransport.clearLogs();
    setStats({ total: 0, byLevel: {} as Record<LogLevel, number> });
  }, [storageTransport]);

  const exportLogs = useCallback(
    (format: 'json' | 'text' = 'json'): string => {
      const logs = getLogs();

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
    setCustomTransports((prev) => {
      if (prev.find((t) => t.name === transport.name)) {
        return prev;
      }
      return [...prev, transport];
    });
  }, []);

  const removeTransport = useCallback((name: string) => {
    setCustomTransports((prev) => prev.filter((t) => t.name !== name));
  }, []);

  const getStats = useCallback(() => {
    return stats;
  }, [stats]);

  const value: LoggerContextValue = {
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
  };

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
