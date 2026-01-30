/**
 * Logger Types
 * Unified type definitions for the logging system
 */

// Re-export from central types for backward compatibility
export type { AppLogLevel, LogEntry, LoggerConfig, LogTransport } from '@/types/system/logger';
export { LOG_LEVEL_PRIORITY, DEFAULT_LOGGER_CONFIG } from '@/types/system/logger';

/**
 * Extended log levels with trace support
 */
export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

/**
 * Log level priority mapping (higher = more severe)
 */
export const LEVEL_PRIORITY: Record<LogLevel, number> = {
  trace: 0,
  debug: 1,
  info: 2,
  warn: 3,
  error: 4,
  fatal: 5,
};

/**
 * Structured log entry with full context
 */
export interface StructuredLogEntry {
  /** Unique log entry ID */
  id: string;
  /** ISO timestamp */
  timestamp: string;
  /** Log level */
  level: LogLevel;
  /** Log message */
  message: string;
  /** Module/component name */
  module: string;
  /** Trace ID for request correlation */
  traceId?: string;
  /** Session ID */
  sessionId?: string;
  /** Additional structured data */
  data?: Record<string, unknown>;
  /** Error stack trace */
  stack?: string;
  /** Source file and line (dev only) */
  source?: {
    file?: string;
    line?: number;
    function?: string;
  };
  /** Tags for filtering */
  tags?: string[];
}

/**
 * Logger configuration with advanced options
 */
export interface UnifiedLoggerConfig {
  /** Minimum log level to output */
  minLevel: LogLevel;
  /** Enable console output */
  enableConsole: boolean;
  /** Enable localStorage/IndexedDB storage */
  enableStorage: boolean;
  /** Enable remote log shipping */
  enableRemote: boolean;
  /** Remote endpoint URL */
  remoteEndpoint?: string;
  /** Maximum entries to store locally */
  maxStorageEntries: number;
  /** Include stack traces for errors */
  includeStackTrace: boolean;
  /** Include source location (dev only) */
  includeSource: boolean;
  /** Sampling configuration by module */
  sampling?: Record<string, number>;
  /** Buffer size for batch operations */
  bufferSize: number;
  /** Flush interval in milliseconds */
  flushInterval: number;
}

/**
 * Default unified logger configuration
 */
export const DEFAULT_UNIFIED_CONFIG: UnifiedLoggerConfig = {
  minLevel: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  enableConsole: true,
  enableStorage: true,
  enableRemote: false,
  maxStorageEntries: 5000,
  includeStackTrace: true,
  includeSource: process.env.NODE_ENV === 'development',
  bufferSize: 100,
  flushInterval: 1000,
};

/**
 * Transport interface for log output
 */
export interface Transport {
  /** Transport name for identification */
  name: string;
  /** Log a single entry */
  log(entry: StructuredLogEntry): void | Promise<void>;
  /** Flush buffered entries */
  flush?(): void | Promise<void>;
  /** Close and cleanup */
  close?(): void | Promise<void>;
}

/**
 * Logger instance interface
 */
export interface Logger {
  trace(message: string, data?: Record<string, unknown>): void;
  debug(message: string, data?: Record<string, unknown>): void;
  info(message: string, data?: Record<string, unknown>): void;
  warn(message: string, data?: Record<string, unknown>): void;
  error(message: string, error?: Error | unknown, data?: Record<string, unknown>): void;
  fatal(message: string, error?: Error | unknown, data?: Record<string, unknown>): void;
  child(module: string): Logger;
  withContext(context: Record<string, unknown>): Logger;
  setTraceId(traceId: string): void;
}

/**
 * Log filter options
 */
export interface LogFilter {
  level?: LogLevel;
  module?: string;
  traceId?: string;
  since?: Date;
  until?: Date;
  search?: string;
  tags?: string[];
  limit?: number;
  offset?: number;
}

/**
 * Log statistics
 */
export interface LogStats {
  total: number;
  byLevel: Record<LogLevel, number>;
  byModule: Record<string, number>;
  oldestEntry?: Date;
  newestEntry?: Date;
}
