/**
 * Debug API
 *
 * @description Development and debugging utilities for plugin development.
 * Provides tracing, breakpoints, performance monitoring, and logging.
 */

/**
 * Log level for debug messages
 */
export type DebugLogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error';

/**
 * Debug log entry
 */
export interface DebugLogEntry {
  /** Log level */
  level: DebugLogLevel;
  /** Log message */
  message: string;
  /** Timestamp */
  timestamp: number;
  /** Additional data */
  data?: unknown;
  /** Source location (file:line) */
  source?: string;
  /** Stack trace if available */
  stack?: string;
}

/**
 * Performance trace entry
 */
export interface TraceEntry {
  /** Trace name/label */
  name: string;
  /** Start time (performance.now()) */
  startTime: number;
  /** End time (performance.now()) */
  endTime?: number;
  /** Duration in milliseconds */
  duration?: number;
  /** Nested traces */
  children?: TraceEntry[];
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Performance metrics
 */
export interface PerformanceMetrics {
  /** Plugin ID */
  pluginId: string;
  /** Total execution time (ms) */
  totalTime: number;
  /** Number of tool calls */
  toolCallCount: number;
  /** Average tool call duration (ms) */
  avgToolCallDuration: number;
  /** Number of hook invocations */
  hookInvocationCount: number;
  /** Average hook duration (ms) */
  avgHookDuration: number;
  /** Memory usage (bytes) */
  memoryUsage?: number;
  /** All trace entries */
  traces: TraceEntry[];
}

/**
 * Breakpoint definition
 */
export interface Breakpoint {
  /** Breakpoint ID */
  id: string;
  /** Type of breakpoint */
  type: 'hook' | 'tool' | 'event' | 'custom';
  /** Target name (hook name, tool name, etc.) */
  target: string;
  /** Condition expression (optional) */
  condition?: string;
  /** Whether breakpoint is enabled */
  enabled: boolean;
  /** Hit count */
  hitCount: number;
}

/**
 * Debug session state
 */
export interface DebugSession {
  /** Session ID */
  id: string;
  /** Plugin ID */
  pluginId: string;
  /** Session start time */
  startedAt: Date;
  /** Whether session is active */
  active: boolean;
  /** Current breakpoints */
  breakpoints: Breakpoint[];
  /** Captured logs */
  logs: DebugLogEntry[];
  /** Performance metrics */
  metrics: PerformanceMetrics;
}

/**
 * Slow operation alert
 */
export interface SlowOperation {
  /** Operation type */
  type: 'tool' | 'hook' | 'ipc' | 'custom';
  /** Operation name */
  name: string;
  /** Duration in milliseconds */
  duration: number;
  /** Threshold that was exceeded */
  threshold: number;
  /** Timestamp */
  timestamp: number;
  /** Additional context */
  context?: Record<string, unknown>;
}

/**
 * Debug API for plugin development
 *
 * @remarks
 * Provides development tools for debugging, performance monitoring,
 * and troubleshooting plugins during development.
 *
 * @example
 * ```typescript
 * // Start a debug session
 * context.debug.startSession();
 *
 * // Add a breakpoint
 * context.debug.setBreakpoint('hook', 'onAgentStep');
 *
 * // Trace performance
 * const endTrace = context.debug.startTrace('myOperation');
 * await doSomething();
 * endTrace();
 *
 * // Measure a function
 * const result = await context.debug.measure('fetchData', async () => {
 *   return await fetchData();
 * });
 *
 * // Get metrics
 * const metrics = context.debug.getMetrics();
 * console.log('Total time:', metrics.totalTime);
 *
 * // Monitor slow operations
 * context.debug.onSlowOperation(1000, (op) => {
 *   console.warn(`Slow operation: ${op.name} took ${op.duration}ms`);
 * });
 * ```
 */
export interface PluginDebugAPI {
  /**
   * Start a debug session
   *
   * @returns Session ID
   */
  startSession(): string;

  /**
   * End the current debug session
   */
  endSession(): void;

  /**
   * Get current debug session
   *
   * @returns Current session or null
   */
  getSession(): DebugSession | null;

  /**
   * Check if debug mode is active
   *
   * @returns Whether debug mode is active
   */
  isActive(): boolean;

  /**
   * Set a breakpoint
   *
   * @param type - Breakpoint type
   * @param target - Target name
   * @param condition - Optional condition expression
   * @returns Breakpoint ID
   */
  setBreakpoint(
    type: Breakpoint['type'],
    target: string,
    condition?: string
  ): string;

  /**
   * Remove a breakpoint
   *
   * @param breakpointId - Breakpoint ID to remove
   */
  removeBreakpoint(breakpointId: string): void;

  /**
   * Enable/disable a breakpoint
   *
   * @param breakpointId - Breakpoint ID
   * @param enabled - Whether to enable or disable
   */
  toggleBreakpoint(breakpointId: string, enabled: boolean): void;

  /**
   * Get all breakpoints
   *
   * @returns Array of breakpoints
   */
  getBreakpoints(): Breakpoint[];

  /**
   * Clear all breakpoints
   */
  clearBreakpoints(): void;

  /**
   * Start a performance trace
   *
   * @param name - Trace name/label
   * @param metadata - Optional metadata
   * @returns Function to end the trace
   */
  startTrace(name: string, metadata?: Record<string, unknown>): () => void;

  /**
   * Measure execution time of a function
   *
   * @param name - Measurement name
   * @param fn - Function to measure
   * @returns Result of the function
   */
  measure<T>(name: string, fn: () => T | Promise<T>): Promise<T>;

  /**
   * Get performance metrics
   *
   * @returns Performance metrics for this plugin
   */
  getMetrics(): PerformanceMetrics;

  /**
   * Reset performance metrics
   */
  resetMetrics(): void;

  /**
   * Log a debug message
   *
   * @param level - Log level
   * @param message - Log message
   * @param data - Optional additional data
   */
  log(level: DebugLogLevel, message: string, data?: unknown): void;

  /**
   * Get captured logs
   *
   * @param level - Optional level filter
   * @param limit - Maximum number of logs to return
   * @returns Array of log entries
   */
  getLogs(level?: DebugLogLevel, limit?: number): DebugLogEntry[];

  /**
   * Clear captured logs
   */
  clearLogs(): void;

  /**
   * Monitor for slow operations
   *
   * @param threshold - Duration threshold in ms
   * @param handler - Handler called when slow operation is detected
   * @returns Unsubscribe function
   */
  onSlowOperation(
    threshold: number,
    handler: (operation: SlowOperation) => void
  ): () => void;

  /**
   * Capture a snapshot of current state
   *
   * @param label - Snapshot label
   * @returns Snapshot data
   */
  captureSnapshot(label: string): {
    label: string;
    timestamp: number;
    metrics: PerformanceMetrics;
    logs: DebugLogEntry[];
  };

  /**
   * Export debug data for analysis
   *
   * @returns Debug data as JSON string
   */
  exportData(): string;

  /**
   * Assert a condition (throws in debug mode)
   *
   * @param condition - Condition to assert
   * @param message - Error message if assertion fails
   */
  assert(condition: boolean, message: string): void;

  /**
   * Time a block of code with console.time-like API
   *
   * @param label - Timer label
   */
  time(label: string): void;

  /**
   * End a timer and log the duration
   *
   * @param label - Timer label
   */
  timeEnd(label: string): void;

  /**
   * Log current memory usage
   */
  logMemory(): void;
}
