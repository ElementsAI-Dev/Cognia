/**
 * Core Logger
 * Unified logging implementation with dynamic runtime-state transport support.
 */

import type {
  Logger,
  LogLevel,
  StructuredLogEntry,
  Transport,
  UnifiedLoggerConfig,
} from './types';
import { DEFAULT_UNIFIED_CONFIG, LEVEL_PRIORITY } from './types';
import { logContext } from './context';
import { logSampler } from './sampling';
import { createConsoleTransport } from './transports/console-transport';
import { redactStructuredLogEntry } from './redaction';

interface LoggerRuntimeState {
  config: UnifiedLoggerConfig;
  transports: Map<string, Transport>;
  initialized: boolean;
}

const runtimeState: LoggerRuntimeState = {
  config: cloneConfig(DEFAULT_UNIFIED_CONFIG),
  transports: new Map<string, Transport>(),
  initialized: false,
};

/**
 * Generate unique log entry ID.
 */
function generateLogId(): string {
  return `log-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Get source location (dev only).
 */
function getSourceLocation(): { file?: string; line?: number; function?: string } | undefined {
  if (process.env.NODE_ENV !== 'development') {
    return undefined;
  }

  try {
    const err = new Error();
    const stack = err.stack?.split('\n');
    if (!stack || stack.length < 5) {
      return undefined;
    }

    const callerLine = stack[5];
    const match = callerLine.match(/at\s+(.+?)\s+\((.+?):(\d+):\d+\)/);
    if (!match) {
      return undefined;
    }

    return {
      function: match[1],
      file: match[2],
      line: Number.parseInt(match[3], 10),
    };
  } catch {
    return undefined;
  }
}

function cloneConfig(config: UnifiedLoggerConfig): UnifiedLoggerConfig {
  return {
    ...config,
    redaction: {
      ...config.redaction,
      redactKeys: [...config.redaction.redactKeys],
      redactPatterns: [...config.redaction.redactPatterns],
    },
  };
}

function mergeConfig(
  current: UnifiedLoggerConfig,
  updates?: Partial<UnifiedLoggerConfig>
): UnifiedLoggerConfig {
  if (!updates) {
    return cloneConfig(current);
  }

  return {
    ...current,
    ...updates,
    redaction: updates.redaction
      ? {
          ...current.redaction,
          ...updates.redaction,
          redactKeys: updates.redaction.redactKeys
            ? [...updates.redaction.redactKeys]
            : [...current.redaction.redactKeys],
          redactPatterns: updates.redaction.redactPatterns
            ? [...updates.redaction.redactPatterns]
            : [...current.redaction.redactPatterns],
        }
      : {
          ...current.redaction,
          redactKeys: [...current.redaction.redactKeys],
          redactPatterns: [...current.redaction.redactPatterns],
        },
  };
}

function ensureInitialized(): void {
  if (runtimeState.initialized) {
    syncBuiltinTransports();
    return;
  }
  runtimeState.initialized = true;
  syncBuiltinTransports();
}

function syncBuiltinTransports(): void {
  if (runtimeState.config.enableConsole) {
    if (!runtimeState.transports.has('console')) {
      runtimeState.transports.set('console', createConsoleTransport());
    }
  } else {
    runtimeState.transports.delete('console');
  }
}

function normalizeUnknown(value: unknown, depth = 0): unknown {
  if (value === null || value === undefined) {
    return value;
  }

  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    typeof value === 'bigint'
  ) {
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack,
    };
  }

  if (depth >= 10) {
    return '[MaxDepthReached]';
  }

  if (Array.isArray(value)) {
    return value.map((item) => normalizeUnknown(item, depth + 1));
  }

  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      out[key] = normalizeUnknown(nested, depth + 1);
    }
    return out;
  }

  return String(value);
}

function normalizeEntry(entry: StructuredLogEntry): StructuredLogEntry {
  return {
    ...entry,
    message: String(entry.message ?? ''),
    data:
      entry.data === undefined
        ? undefined
        : (normalizeUnknown(entry.data) as Record<string, unknown>),
  };
}

function dispatchEntry(entry: StructuredLogEntry): void {
  const transports = [...runtimeState.transports.values()];
  for (const transport of transports) {
    try {
      void transport.log(entry);
    } catch (error) {
      console.error(`Transport ${transport.name} failed:`, error);
    }
  }
}

/**
 * Core logger implementation.
 * Reads config/transports dynamically from global runtime state.
 */
class CoreLogger implements Logger {
  private readonly module: string;
  private readonly additionalContext: Record<string, unknown>;
  private currentTraceId?: string;

  constructor(module: string, additionalContext?: Record<string, unknown>) {
    this.module = module;
    this.additionalContext = additionalContext ? { ...additionalContext } : {};
  }

  child(subModule: string): Logger {
    return new CoreLogger(`${this.module}:${subModule}`, this.additionalContext);
  }

  withContext(context: Record<string, unknown>): Logger {
    return new CoreLogger(this.module, {
      ...this.additionalContext,
      ...context,
    });
  }

  setTraceId(traceId: string): void {
    this.currentTraceId = traceId;
  }

  private log(level: LogLevel, message: string, data?: Record<string, unknown>, error?: Error): void {
    ensureInitialized();
    const config = runtimeState.config;

    if (LEVEL_PRIORITY[level] < LEVEL_PRIORITY[config.minLevel]) {
      return;
    }

    if (!logSampler.shouldLog(this.module, level)) {
      return;
    }

    const globalContext = logContext.context;
    const mergedData = {
      ...globalContext,
      ...this.additionalContext,
      ...(data || {}),
    };

    const entry: StructuredLogEntry = {
      id: generateLogId(),
      timestamp: new Date().toISOString(),
      level,
      message,
      module: this.module,
      traceId: this.currentTraceId || logContext.traceId,
      sessionId: logContext.sessionId,
      data: Object.keys(mergedData).length > 0 ? mergedData : undefined,
    };

    if (config.includeStackTrace && error) {
      entry.stack = error.stack;
    }

    if (config.includeSource) {
      entry.source = getSourceLocation();
    }

    // normalize -> redact -> dispatch
    const normalized = normalizeEntry(entry);
    const redacted = redactStructuredLogEntry(normalized, config.redaction);
    dispatchEntry(redacted);
  }

  trace(message: string, data?: Record<string, unknown>): void {
    this.log('trace', message, data);
  }

  debug(message: string, data?: Record<string, unknown>): void {
    this.log('debug', message, data);
  }

  info(message: string, data?: Record<string, unknown>): void {
    this.log('info', message, data);
  }

  warn(message: string, data?: Record<string, unknown>): void {
    this.log('warn', message, data);
  }

  error(message: string, error?: Error | unknown, data?: Record<string, unknown>): void {
    const err = error instanceof Error ? error : undefined;
    const errorData =
      error instanceof Error
        ? {
            errorName: error.name,
            errorMessage: error.message,
            ...data,
          }
        : error !== undefined
          ? {
              error,
              ...data,
            }
          : data;
    this.log('error', message, errorData, err);
  }

  fatal(message: string, error?: Error | unknown, data?: Record<string, unknown>): void {
    const err = error instanceof Error ? error : undefined;
    const errorData =
      error instanceof Error
        ? {
            errorName: error.name,
            errorMessage: error.message,
            ...data,
          }
        : error !== undefined
          ? {
              error,
              ...data,
            }
          : data;
    this.log('fatal', message, errorData, err);
  }
}

/**
 * Initialize the logging system.
 */
export function initLogger(config?: Partial<UnifiedLoggerConfig>, transports?: Transport[]): void {
  runtimeState.config = mergeConfig(cloneConfig(DEFAULT_UNIFIED_CONFIG), config);

  if (transports) {
    runtimeState.transports = new Map(transports.map((transport) => [transport.name, transport]));
  }

  runtimeState.initialized = true;
  syncBuiltinTransports();
}

/**
 * Add a transport to the global logger.
 */
export function addTransport(transport: Transport): void {
  ensureInitialized();
  runtimeState.transports.set(transport.name, transport);
}

/**
 * Remove a transport from the global logger.
 */
export function removeTransport(name: string): void {
  ensureInitialized();
  const transport = runtimeState.transports.get(name);
  if (transport?.close) {
    void transport.close();
  }
  runtimeState.transports.delete(name);
}

/**
 * Get a registered transport by name.
 */
export function getTransport<T extends Transport = Transport>(name: string): T | undefined {
  ensureInitialized();
  return runtimeState.transports.get(name) as T | undefined;
}

/**
 * Get all registered transports.
 */
export function getTransports(): Transport[] {
  ensureInitialized();
  return [...runtimeState.transports.values()];
}

/**
 * Update global configuration.
 * Changes are immediately applied to all existing logger instances.
 */
export function updateLoggerConfig(config: Partial<UnifiedLoggerConfig>): void {
  ensureInitialized();
  runtimeState.config = mergeConfig(runtimeState.config, config);
  syncBuiltinTransports();
}

/**
 * Get current configuration.
 */
export function getLoggerConfig(): UnifiedLoggerConfig {
  ensureInitialized();
  return cloneConfig(runtimeState.config);
}

/**
 * Create a logger for a specific module.
 */
export function createLogger(module: string): Logger {
  ensureInitialized();
  return new CoreLogger(module);
}

/**
 * Flush all transports.
 */
export async function flushLogs(): Promise<void> {
  ensureInitialized();
  await Promise.all(
    [...runtimeState.transports.values()]
      .filter((transport) => transport.flush)
      .map((transport) => transport.flush!())
  );
}

/**
 * Shutdown logging system.
 */
export async function shutdownLogger(): Promise<void> {
  if (!runtimeState.initialized) {
    return;
  }

  await flushLogs();
  await Promise.all(
    [...runtimeState.transports.values()]
      .filter((transport) => transport.close)
      .map((transport) => transport.close!())
  );

  runtimeState.transports.clear();
  runtimeState.config = cloneConfig(DEFAULT_UNIFIED_CONFIG);
  runtimeState.initialized = false;
}
