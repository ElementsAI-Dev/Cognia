/**
 * Tauri Log Bridge
 * 
 * Bridges Rust backend logs to the frontend unified logging system.
 * Listens for log events emitted from Tauri and forwards them to lib/logger.
 */

import { loggers, logContext, type LogLevel } from '@/lib/logger';
import { isTauri } from '@/lib/utils';

/**
 * Tauri log event payload structure
 */
export interface TauriLogEvent {
  /** Log level from Rust (DEBUG, INFO, WARN, ERROR) */
  level: string;
  /** Module/target that produced the log */
  target: string;
  /** Log message content */
  message: string;
  /** ISO timestamp when log was created */
  timestamp: string;
  /** Optional trace ID for request correlation */
  traceId?: string;
  /** Optional additional data */
  data?: Record<string, unknown>;
}

/**
 * Map Rust log levels to unified logger levels
 */
function mapLogLevel(rustLevel: string): LogLevel {
  const level = rustLevel.toUpperCase();
  switch (level) {
    case 'TRACE':
      return 'trace';
    case 'DEBUG':
      return 'debug';
    case 'INFO':
      return 'info';
    case 'WARN':
    case 'WARNING':
      return 'warn';
    case 'ERROR':
      return 'error';
    default:
      return 'info';
  }
}

/**
 * Parse target to extract module name
 * e.g., "app_lib::mcp::transport" -> "mcp:transport"
 */
function parseTarget(target: string): string {
  // Remove app_lib prefix if present
  let moduleName = target.replace(/^app_lib::/, '');
  // Convert :: to : for consistency with frontend modules
  moduleName = moduleName.replace(/::/g, ':');
  return moduleName;
}

// Track if bridge is initialized
let isInitialized = false;
let unlistenFn: (() => void) | null = null;

/**
 * Initialize the Tauri log bridge
 * Call this once during app initialization (only in Tauri environment)
 */
export async function initTauriLogBridge(): Promise<void> {
  if (!isTauri() || isInitialized) {
    return;
  }

  try {
    const { listen } = await import('@tauri-apps/api/event');

    // Listen for log events from Rust backend
    unlistenFn = await listen<TauriLogEvent>('log://message', (event) => {
      const { level, target, message, timestamp, traceId, data } = event.payload;
      
      const logLevel = mapLogLevel(level);
      const moduleName = parseTarget(target);
      
      // Create context with Tauri-specific metadata
      const logData: Record<string, unknown> = {
        source: 'tauri',
        target,
        tauriTimestamp: timestamp,
        ...data,
      };

      // Set trace ID if provided
      if (traceId) {
        logContext.setTraceId(traceId);
      }

      // Route to appropriate logger based on module
      const logger = loggers.native.child(moduleName);
      
      switch (logLevel) {
        case 'trace':
          logger.trace(message, logData);
          break;
        case 'debug':
          logger.debug(message, logData);
          break;
        case 'info':
          logger.info(message, logData);
          break;
        case 'warn':
          logger.warn(message, logData);
          break;
        case 'error':
          logger.error(message, undefined, logData);
          break;
        default:
          logger.info(message, logData);
      }

      // Clear trace ID after logging
      if (traceId) {
        logContext.clearTraceId();
      }
    });

    isInitialized = true;
    loggers.native.info('Tauri log bridge initialized');
  } catch (error) {
    loggers.native.error('Failed to initialize Tauri log bridge', error as Error);
  }
}

/**
 * Cleanup the Tauri log bridge
 * Call this during app cleanup/unmount
 */
export async function cleanupTauriLogBridge(): Promise<void> {
  if (unlistenFn) {
    unlistenFn();
    unlistenFn = null;
  }
  isInitialized = false;
}

/**
 * Check if bridge is currently active
 */
export function isTauriLogBridgeActive(): boolean {
  return isInitialized;
}

/**
 * Manually forward a Tauri log event
 * Useful for testing or when events come from other sources
 */
export function forwardTauriLog(event: TauriLogEvent): void {
  const { level, target, message, timestamp, traceId, data } = event;
  
  const logLevel = mapLogLevel(level);
  const moduleName = parseTarget(target);
  
  const logData: Record<string, unknown> = {
    source: 'tauri',
    target,
    tauriTimestamp: timestamp,
    ...data,
  };

  if (traceId) {
    logContext.setTraceId(traceId);
  }

  const logger = loggers.native.child(moduleName);
  
  switch (logLevel) {
    case 'trace':
      logger.trace(message, logData);
      break;
    case 'debug':
      logger.debug(message, logData);
      break;
    case 'info':
      logger.info(message, logData);
      break;
    case 'warn':
      logger.warn(message, logData);
      break;
    case 'error':
      logger.error(message, undefined, logData);
      break;
  }

  if (traceId) {
    logContext.clearTraceId();
  }
}
