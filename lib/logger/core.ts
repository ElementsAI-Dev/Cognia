/**
 * Core Logger
 * Unified logging implementation with transport support
 */

import type { 
  Logger, 
  LogLevel, 
  StructuredLogEntry, 
  Transport, 
  UnifiedLoggerConfig 
} from './types';
import { LEVEL_PRIORITY, DEFAULT_UNIFIED_CONFIG } from './types';
import { logContext } from './context';
import { logSampler } from './sampling';

/**
 * Generate unique log entry ID
 */
function generateLogId(): string {
  return `log-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Get source location (dev only)
 */
function getSourceLocation(): { file?: string; line?: number; function?: string } | undefined {
  if (process.env.NODE_ENV !== 'development') {
    return undefined;
  }

  try {
    const err = new Error();
    const stack = err.stack?.split('\n');
    if (!stack || stack.length < 5) return undefined;

    // Skip: Error, generateLogId, log method, createEntry, actual caller
    const callerLine = stack[5];
    const match = callerLine.match(/at\s+(.+?)\s+\((.+?):(\d+):\d+\)/);
    
    if (match) {
      return {
        function: match[1],
        file: match[2],
        line: parseInt(match[3], 10),
      };
    }
  } catch {
    // Ignore errors in source location extraction
  }

  return undefined;
}

/**
 * Core logger implementation
 */
class CoreLogger implements Logger {
  private module: string;
  private config: UnifiedLoggerConfig;
  private transports: Transport[];
  private additionalContext: Record<string, unknown> = {};
  private currentTraceId?: string;

  constructor(
    module: string,
    config: UnifiedLoggerConfig,
    transports: Transport[],
    additionalContext?: Record<string, unknown>
  ) {
    this.module = module;
    this.config = config;
    this.transports = transports;
    if (additionalContext) {
      this.additionalContext = additionalContext;
    }
  }

  /**
   * Create a child logger with a sub-module name
   */
  child(subModule: string): Logger {
    return new CoreLogger(
      `${this.module}:${subModule}`,
      this.config,
      this.transports,
      this.additionalContext
    );
  }

  /**
   * Create a logger with additional context
   */
  withContext(context: Record<string, unknown>): Logger {
    return new CoreLogger(
      this.module,
      this.config,
      this.transports,
      { ...this.additionalContext, ...context }
    );
  }

  /**
   * Set trace ID for this logger instance
   */
  setTraceId(traceId: string): void {
    this.currentTraceId = traceId;
  }

  /**
   * Core log method
   */
  private log(
    level: LogLevel,
    message: string,
    data?: Record<string, unknown>,
    error?: Error
  ): void {
    // Check level threshold
    if (LEVEL_PRIORITY[level] < LEVEL_PRIORITY[this.config.minLevel]) {
      return;
    }

    // Check sampling
    if (!logSampler.shouldLog(this.module, level)) {
      return;
    }

    // Create structured entry
    const entry: StructuredLogEntry = {
      id: generateLogId(),
      timestamp: new Date().toISOString(),
      level,
      message,
      module: this.module,
      traceId: this.currentTraceId || logContext.traceId,
      sessionId: logContext.sessionId,
      data: data ? { ...this.additionalContext, ...data } : 
            Object.keys(this.additionalContext).length > 0 ? this.additionalContext : undefined,
    };

    // Add stack trace for errors
    if (this.config.includeStackTrace && error instanceof Error) {
      entry.stack = error.stack;
    }

    // Add source location in development
    if (this.config.includeSource) {
      entry.source = getSourceLocation();
    }

    // Send to all transports
    for (const transport of this.transports) {
      try {
        transport.log(entry);
      } catch (err) {
        // Fallback to console if transport fails
        console.error(`Transport ${transport.name} failed:`, err);
      }
    }
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
    const errorData = error instanceof Error 
      ? { errorName: error.name, errorMessage: error.message, ...data }
      : error 
        ? { error, ...data }
        : data;
    this.log('error', message, errorData, err);
  }

  fatal(message: string, error?: Error | unknown, data?: Record<string, unknown>): void {
    const err = error instanceof Error ? error : undefined;
    const errorData = error instanceof Error 
      ? { errorName: error.name, errorMessage: error.message, ...data }
      : error 
        ? { error, ...data }
        : data;
    this.log('fatal', message, errorData, err);
  }
}

/**
 * Logger factory state
 */
let globalConfig: UnifiedLoggerConfig = DEFAULT_UNIFIED_CONFIG;
let globalTransports: Transport[] = [];
let initialized = false;

/**
 * Initialize the logging system
 */
export function initLogger(
  config?: Partial<UnifiedLoggerConfig>,
  transports?: Transport[]
): void {
  globalConfig = { ...DEFAULT_UNIFIED_CONFIG, ...config };
  
  if (transports) {
    globalTransports = transports;
  }
  
  initialized = true;
}

/**
 * Add a transport to the global logger
 */
export function addTransport(transport: Transport): void {
  if (!globalTransports.find(t => t.name === transport.name)) {
    globalTransports.push(transport);
  }
}

/**
 * Remove a transport from the global logger
 */
export function removeTransport(name: string): void {
  globalTransports = globalTransports.filter(t => t.name !== name);
}

/**
 * Update global configuration
 */
export function updateLoggerConfig(config: Partial<UnifiedLoggerConfig>): void {
  globalConfig = { ...globalConfig, ...config };
}

/**
 * Get current configuration
 */
export function getLoggerConfig(): UnifiedLoggerConfig {
  return { ...globalConfig };
}

/**
 * Create a logger for a specific module
 */
export function createLogger(module: string): Logger {
  // Auto-initialize with defaults if not initialized
  if (!initialized) {
    // Import at top level to avoid require()
    import('./transports/console-transport').then(({ createConsoleTransport }) => {
      if (globalTransports.length === 0) {
        globalTransports = [createConsoleTransport()];
      }
    });
    initialized = true;
  }
  
  return new CoreLogger(module, globalConfig, globalTransports);
}

/**
 * Flush all transports
 */
export async function flushLogs(): Promise<void> {
  await Promise.all(
    globalTransports
      .filter(t => t.flush)
      .map(t => t.flush!())
  );
}

/**
 * Shutdown logging system
 */
export async function shutdownLogger(): Promise<void> {
  await flushLogs();
  await Promise.all(
    globalTransports
      .filter(t => t.close)
      .map(t => t.close!())
  );
  globalTransports = [];
  initialized = false;
}
