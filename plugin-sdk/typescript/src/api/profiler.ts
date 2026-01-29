/**
 * Performance Profiler API
 *
 * @description Performance monitoring and profiling utilities for plugins.
 * Provides detailed metrics, tracing, and performance analysis tools.
 */

/**
 * Performance sample with timing data
 */
export interface PerformanceSample {
  /** Sample name */
  name: string;
  /** Start time (high-resolution) */
  startTime: number;
  /** End time (high-resolution) */
  endTime: number;
  /** Duration in milliseconds */
  duration: number;
  /** Memory usage at sample time */
  memory?: MemoryUsage;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Memory usage information
 */
export interface MemoryUsage {
  /** Used heap size in bytes */
  usedHeapSize: number;
  /** Total heap size in bytes */
  totalHeapSize: number;
  /** Heap size limit in bytes */
  heapSizeLimit: number;
  /** External memory usage in bytes */
  external?: number;
}

/**
 * Performance bucket for aggregated metrics
 */
export interface PerformanceBucket {
  /** Bucket name (e.g., 'tool:search', 'hook:onAgentStep') */
  name: string;
  /** Number of samples */
  count: number;
  /** Total duration */
  totalDuration: number;
  /** Average duration */
  avgDuration: number;
  /** Minimum duration */
  minDuration: number;
  /** Maximum duration */
  maxDuration: number;
  /** 50th percentile (median) */
  p50: number;
  /** 95th percentile */
  p95: number;
  /** 99th percentile */
  p99: number;
}

/**
 * Performance report
 */
export interface PerformanceReport {
  /** Plugin ID */
  pluginId: string;
  /** Report generation time */
  generatedAt: Date;
  /** Report duration (ms) */
  duration: number;
  /** Total samples collected */
  totalSamples: number;
  /** Aggregated buckets */
  buckets: PerformanceBucket[];
  /** Memory snapshots */
  memorySnapshots: Array<{ timestamp: number; usage: MemoryUsage }>;
  /** Slow operations detected */
  slowOperations: SlowOperationEntry[];
}

/**
 * Slow operation entry
 */
export interface SlowOperationEntry {
  /** Operation name */
  name: string;
  /** Duration in milliseconds */
  duration: number;
  /** Threshold that was exceeded */
  threshold: number;
  /** Timestamp */
  timestamp: number;
  /** Stack trace if available */
  stack?: string;
}

/**
 * Profiler configuration
 */
export interface ProfilerConfig {
  /** Enable automatic profiling */
  enabled: boolean;
  /** Sample rate (0-1, default 1.0) */
  sampleRate: number;
  /** Maximum samples to keep */
  maxSamples: number;
  /** Slow operation threshold (ms) */
  slowThreshold: number;
  /** Enable memory tracking */
  trackMemory: boolean;
  /** Memory snapshot interval (ms) */
  memorySnapshotInterval: number;
}

/**
 * Performance Profiler API
 *
 * @remarks
 * Provides performance monitoring, tracing, and analysis tools
 * for understanding and optimizing plugin performance.
 *
 * @example
 * ```typescript
 * // Start profiling
 * context.profiler.start();
 *
 * // Profile a function
 * const result = await context.profiler.profile('fetchData', async () => {
 *   return await fetchData();
 * });
 *
 * // Get metrics
 * const report = context.profiler.generateReport();
 * console.log('Average fetch time:', report.buckets.find(b => b.name === 'fetchData')?.avgDuration);
 *
 * // Monitor slow operations
 * context.profiler.onSlowOperation((op) => {
 *   console.warn(`Slow: ${op.name} took ${op.duration}ms`);
 * });
 * ```
 */
export interface PluginProfilerAPI {
  /**
   * Start profiling session
   */
  start(): void;

  /**
   * Stop profiling session
   */
  stop(): void;

  /**
   * Check if profiler is active
   */
  isActive(): boolean;

  /**
   * Configure profiler
   *
   * @param config - Partial configuration to update
   */
  configure(config: Partial<ProfilerConfig>): void;

  /**
   * Get current configuration
   */
  getConfig(): ProfilerConfig;

  /**
   * Profile a function execution
   *
   * @param name - Profile name
   * @param fn - Function to profile
   * @param metadata - Optional metadata
   * @returns Function result
   */
  profile<T>(
    name: string,
    fn: () => T | Promise<T>,
    metadata?: Record<string, unknown>
  ): Promise<T>;

  /**
   * Start a manual timing
   *
   * @param name - Timer name
   * @returns Function to stop timing
   */
  startTiming(name: string): () => PerformanceSample;

  /**
   * Record a performance sample manually
   *
   * @param sample - Sample data
   */
  recordSample(sample: PerformanceSample): void;

  /**
   * Get all recorded samples
   *
   * @param name - Optional filter by name
   * @param limit - Maximum samples to return
   */
  getSamples(name?: string, limit?: number): PerformanceSample[];

  /**
   * Clear all recorded samples
   */
  clearSamples(): void;

  /**
   * Get aggregated metrics for a name
   *
   * @param name - Metric name
   */
  getMetrics(name: string): PerformanceBucket | null;

  /**
   * Get all aggregated metrics
   */
  getAllMetrics(): PerformanceBucket[];

  /**
   * Generate a performance report
   */
  generateReport(): PerformanceReport;

  /**
   * Export report as JSON
   */
  exportReport(): string;

  /**
   * Get current memory usage
   */
  getMemoryUsage(): MemoryUsage | null;

  /**
   * Take a memory snapshot
   */
  takeMemorySnapshot(): void;

  /**
   * Get memory snapshots
   */
  getMemorySnapshots(): Array<{ timestamp: number; usage: MemoryUsage }>;

  /**
   * Monitor for slow operations
   *
   * @param handler - Handler called when slow operation detected
   * @returns Unsubscribe function
   */
  onSlowOperation(handler: (entry: SlowOperationEntry) => void): () => void;

  /**
   * Set slow operation threshold
   *
   * @param threshold - Threshold in milliseconds
   */
  setSlowThreshold(threshold: number): void;

  /**
   * Get slow operations
   */
  getSlowOperations(): SlowOperationEntry[];

  /**
   * Mark a performance timeline event
   *
   * @param name - Event name
   * @param detail - Optional detail data
   */
  mark(name: string, detail?: unknown): void;

  /**
   * Measure between two marks
   *
   * @param name - Measurement name
   * @param startMark - Start mark name
   * @param endMark - End mark name
   */
  measureBetween(name: string, startMark: string, endMark: string): number | null;
}
