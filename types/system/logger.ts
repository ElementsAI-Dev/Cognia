/**
 * Logger Types
 * Types for centralized logging system
 */

// Log levels (renamed to avoid conflict with MCP LogLevel)
export type AppLogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

// Log entry structure
export interface LogEntry {
  id: string;
  timestamp: Date;
  level: AppLogLevel;
  message: string;
  data?: unknown;
  context?: Record<string, unknown>;
  stack?: string;
  userId?: string;
  sessionId?: string;
}

// Logger configuration
export interface LoggerConfig {
  minLevel: AppLogLevel;
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

// Log level priority (higher = more severe)
export const LOG_LEVEL_PRIORITY: Record<AppLogLevel, number> = {
  trace: 0,
  debug: 1,
  info: 2,
  warn: 3,
  error: 4,
  fatal: 5,
};

// Default logger configuration
export const DEFAULT_LOGGER_CONFIG: LoggerConfig = {
  minLevel: 'info' as AppLogLevel,
  enableConsole: true,
  enableStorage: false,
  enableRemote: false,
  maxStorageEntries: 1000,
  includeStackTrace: true,
};
