/**
 * Plugin Scheduler API
 *
 * @description Provides scheduled task management capabilities for plugins.
 * Plugins can create, manage, and execute scheduled tasks using cron expressions,
 * intervals, or one-time triggers.
 */

// =============================================================================
// Task Trigger Types
// =============================================================================

/**
 * Cron-based trigger for recurring tasks
 *
 * @example
 * ```typescript
 * { type: 'cron', expression: '0 9 * * *' } // Daily at 9am
 * { type: 'cron', expression: '0 0 * * 0', timezone: 'America/New_York' } // Weekly on Sunday
 * ```
 */
export interface CronTrigger {
  type: 'cron';
  /** Cron expression (5 or 6 fields) */
  expression: string;
  /** Timezone (IANA format, defaults to local) */
  timezone?: string;
}

/**
 * Interval-based trigger for recurring tasks
 *
 * @example
 * ```typescript
 * { type: 'interval', seconds: 3600 } // Every hour
 * { type: 'interval', seconds: 300, startImmediately: true } // Every 5 minutes, run once immediately
 * ```
 */
export interface IntervalTrigger {
  type: 'interval';
  /** Interval in seconds */
  seconds: number;
  /** Whether to run immediately on registration */
  startImmediately?: boolean;
}

/**
 * One-time trigger for tasks that run once
 *
 * @example
 * ```typescript
 * { type: 'once', runAt: new Date('2024-12-31T23:59:59Z') }
 * ```
 */
export interface OnceTrigger {
  type: 'once';
  /** When to run the task (ISO 8601 string or Date) */
  runAt: Date | string;
}

/**
 * Event-based trigger for tasks that respond to system events
 *
 * @example
 * ```typescript
 * { type: 'event', eventType: 'session:create' }
 * { type: 'event', eventType: 'project:update', eventSource: 'project-123' }
 * ```
 */
export interface EventTrigger {
  type: 'event';
  /** Event type to listen for */
  eventType: string;
  /** Optional event source filter */
  eventSource?: string;
}

/**
 * Union of all trigger types
 */
export type PluginTaskTrigger = CronTrigger | IntervalTrigger | OnceTrigger | EventTrigger;

// =============================================================================
// Task Status & Result Types
// =============================================================================

/**
 * Task status
 */
export type PluginTaskStatus = 'active' | 'paused' | 'disabled' | 'completed' | 'error';

/**
 * Task execution status
 */
export type PluginTaskExecutionStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'timeout';

/**
 * Result returned from task handler execution
 */
export interface PluginTaskResult {
  /** Whether the task succeeded */
  success: boolean;
  /** Output data from the task */
  output?: Record<string, unknown>;
  /** Error message if failed */
  error?: string;
  /** Metrics from execution */
  metrics?: {
    duration?: number;
    itemsProcessed?: number;
    [key: string]: unknown;
  };
}

// =============================================================================
// Task Context
// =============================================================================

/**
 * Context provided to task handlers during execution
 */
export interface PluginTaskContext {
  /** Task ID */
  taskId: string;
  /** Execution ID */
  executionId: string;
  /** Plugin ID */
  pluginId: string;
  /** Task name */
  taskName: string;
  /** Scheduled run time */
  scheduledAt: Date;
  /** Actual start time */
  startedAt: Date;
  /** Attempt number (1-based, for retries) */
  attemptNumber: number;
  /** Abort signal for cancellation */
  signal: AbortSignal;
  /** Report progress */
  reportProgress: (progress: number, message?: string) => void;
  /** Log a message */
  log: (level: 'debug' | 'info' | 'warn' | 'error', message: string, data?: Record<string, unknown>) => void;
}

// =============================================================================
// Task Handler
// =============================================================================

/**
 * Task handler function signature
 *
 * @example
 * ```typescript
 * const myHandler: PluginTaskHandler = async (args, context) => {
 *   context.log('info', 'Starting task...');
 *   context.reportProgress(0, 'Initializing');
 *
 *   // Do work...
 *   const result = await processData(args.source);
 *
 *   context.reportProgress(100, 'Complete');
 *   return { success: true, output: { processed: result.count } };
 * };
 * ```
 */
export type PluginTaskHandler = (
  args: Record<string, unknown>,
  context: PluginTaskContext
) => Promise<PluginTaskResult>;

// =============================================================================
// Scheduled Task Definition
// =============================================================================

/**
 * Scheduled task representation
 */
export interface PluginScheduledTask {
  /** Unique task ID */
  id: string;
  /** Plugin that owns this task */
  pluginId: string;
  /** Task name */
  name: string;
  /** Task description */
  description?: string;
  /** Trigger configuration */
  trigger: PluginTaskTrigger;
  /** Handler name (registered via registerHandler) */
  handler: string;
  /** Arguments to pass to handler */
  handlerArgs?: Record<string, unknown>;
  /** Current status */
  status: PluginTaskStatus;
  /** Last execution time */
  lastRunAt?: Date;
  /** Next scheduled run time */
  nextRunAt?: Date;
  /** Total run count */
  runCount: number;
  /** Last run result */
  lastResult?: PluginTaskResult;
  /** Task metadata */
  metadata?: Record<string, unknown>;
  /** Creation time */
  createdAt: Date;
  /** Last update time */
  updatedAt: Date;
  /** Retry configuration */
  retry?: {
    /** Maximum retry attempts */
    maxAttempts: number;
    /** Delay between retries in seconds */
    delaySeconds: number;
    /** Exponential backoff multiplier */
    backoffMultiplier?: number;
  };
  /** Timeout in seconds */
  timeout?: number;
  /** Tags for organization */
  tags?: string[];
}

/**
 * Task execution record
 */
export interface PluginTaskExecution {
  /** Execution ID */
  id: string;
  /** Task ID */
  taskId: string;
  /** Plugin ID */
  pluginId: string;
  /** Execution status */
  status: PluginTaskExecutionStatus;
  /** Scheduled run time */
  scheduledAt: Date;
  /** Actual start time */
  startedAt?: Date;
  /** Completion time */
  completedAt?: Date;
  /** Duration in milliseconds */
  duration?: number;
  /** Result */
  result?: PluginTaskResult;
  /** Attempt number */
  attemptNumber: number;
  /** Error details if failed */
  error?: {
    message: string;
    stack?: string;
  };
  /** Progress logs */
  logs?: Array<{
    timestamp: Date;
    level: 'debug' | 'info' | 'warn' | 'error';
    message: string;
    data?: Record<string, unknown>;
  }>;
}

// =============================================================================
// Input Types
// =============================================================================

/**
 * Input for creating a new scheduled task
 */
export interface CreatePluginTaskInput {
  /** Task name */
  name: string;
  /** Task description */
  description?: string;
  /** Trigger configuration */
  trigger: PluginTaskTrigger;
  /** Handler name */
  handler: string;
  /** Arguments to pass to handler */
  handlerArgs?: Record<string, unknown>;
  /** Whether task is enabled on creation */
  enabled?: boolean;
  /** Retry configuration */
  retry?: {
    maxAttempts: number;
    delaySeconds: number;
    backoffMultiplier?: number;
  };
  /** Timeout in seconds */
  timeout?: number;
  /** Tags for organization */
  tags?: string[];
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Input for updating an existing scheduled task
 */
export interface UpdatePluginTaskInput {
  /** Task name */
  name?: string;
  /** Task description */
  description?: string;
  /** Trigger configuration */
  trigger?: PluginTaskTrigger;
  /** Handler name */
  handler?: string;
  /** Arguments to pass to handler */
  handlerArgs?: Record<string, unknown>;
  /** Retry configuration */
  retry?: {
    maxAttempts: number;
    delaySeconds: number;
    backoffMultiplier?: number;
  };
  /** Timeout in seconds */
  timeout?: number;
  /** Tags for organization */
  tags?: string[];
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Filter for listing tasks
 */
export interface PluginTaskFilter {
  /** Filter by status */
  status?: PluginTaskStatus | PluginTaskStatus[];
  /** Filter by handler */
  handler?: string;
  /** Filter by tags (any match) */
  tags?: string[];
  /** Filter by name (partial match) */
  name?: string;
  /** Include only tasks with errors */
  hasErrors?: boolean;
  /** Limit number of results */
  limit?: number;
  /** Offset for pagination */
  offset?: number;
}

// =============================================================================
// Scheduler API
// =============================================================================

/**
 * Plugin Scheduler API
 *
 * @remarks
 * Provides comprehensive scheduled task management for plugins.
 *
 * @example
 * ```typescript
 * // In plugin activation
 * export default definePlugin({
 *   activate(context: PluginContext): PluginHooks {
 *     // Register a task handler
 *     context.scheduler.registerHandler('daily_sync', async (args, taskContext) => {
 *       taskContext.log('info', 'Starting daily sync...');
 *       taskContext.reportProgress(0, 'Connecting to API');
 *
 *       const result = await syncData(args.apiUrl);
 *
 *       taskContext.reportProgress(100, 'Sync complete');
 *       return { success: true, output: { synced: result.count } };
 *     });
 *
 *     // Create a scheduled task
 *     context.scheduler.createTask({
 *       name: 'Daily Data Sync',
 *       description: 'Sync data from external API every day at 6am',
 *       trigger: { type: 'cron', expression: '0 6 * * *' },
 *       handler: 'daily_sync',
 *       handlerArgs: { apiUrl: 'https://api.example.com' },
 *     });
 *
 *     return {
 *       onScheduledTaskComplete: (taskId, executionId, result) => {
 *         context.logger.info(`Task ${taskId} completed:`, result);
 *       },
 *     };
 *   },
 * });
 * ```
 */
export interface PluginSchedulerAPI {
  // -------------------------------------------------------------------------
  // Task Management
  // -------------------------------------------------------------------------

  /**
   * Create a new scheduled task
   *
   * @param input - Task creation input
   * @returns Created task
   */
  createTask: (input: CreatePluginTaskInput) => Promise<PluginScheduledTask>;

  /**
   * Update an existing scheduled task
   *
   * @param taskId - Task ID to update
   * @param input - Update input
   * @returns Updated task or null if not found
   */
  updateTask: (taskId: string, input: UpdatePluginTaskInput) => Promise<PluginScheduledTask | null>;

  /**
   * Delete a scheduled task
   *
   * @param taskId - Task ID to delete
   * @returns True if deleted, false if not found
   */
  deleteTask: (taskId: string) => Promise<boolean>;

  /**
   * Get a specific scheduled task
   *
   * @param taskId - Task ID
   * @returns Task or null if not found
   */
  getTask: (taskId: string) => Promise<PluginScheduledTask | null>;

  /**
   * List scheduled tasks for this plugin
   *
   * @param filter - Optional filter
   * @returns Array of tasks
   */
  listTasks: (filter?: PluginTaskFilter) => Promise<PluginScheduledTask[]>;

  // -------------------------------------------------------------------------
  // Task Control
  // -------------------------------------------------------------------------

  /**
   * Pause a scheduled task (stops future executions)
   *
   * @param taskId - Task ID to pause
   * @returns True if paused, false if not found
   */
  pauseTask: (taskId: string) => Promise<boolean>;

  /**
   * Resume a paused task
   *
   * @param taskId - Task ID to resume
   * @returns True if resumed, false if not found
   */
  resumeTask: (taskId: string) => Promise<boolean>;

  /**
   * Run a task immediately (out of schedule)
   *
   * @param taskId - Task ID to run
   * @param args - Optional override arguments
   * @returns Execution ID
   */
  runTaskNow: (taskId: string, args?: Record<string, unknown>) => Promise<string>;

  /**
   * Cancel a running task execution
   *
   * @param executionId - Execution ID to cancel
   * @returns True if cancelled, false if not found or already completed
   */
  cancelExecution: (executionId: string) => Promise<boolean>;

  // -------------------------------------------------------------------------
  // Execution History
  // -------------------------------------------------------------------------

  /**
   * Get execution history for a task
   *
   * @param taskId - Task ID
   * @param limit - Maximum number of executions to return (default 50)
   * @returns Array of task executions
   */
  getExecutions: (taskId: string, limit?: number) => Promise<PluginTaskExecution[]>;

  /**
   * Get a specific execution
   *
   * @param executionId - Execution ID
   * @returns Execution or null if not found
   */
  getExecution: (executionId: string) => Promise<PluginTaskExecution | null>;

  /**
   * Get the latest execution for a task
   *
   * @param taskId - Task ID
   * @returns Latest execution or null if never executed
   */
  getLatestExecution: (taskId: string) => Promise<PluginTaskExecution | null>;

  // -------------------------------------------------------------------------
  // Handler Registration
  // -------------------------------------------------------------------------

  /**
   * Register a task handler
   *
   * @param name - Handler name (unique within plugin)
   * @param handler - Handler function
   * @returns Unregister function
   */
  registerHandler: (name: string, handler: PluginTaskHandler) => () => void;

  /**
   * Unregister a task handler
   *
   * @param name - Handler name to unregister
   */
  unregisterHandler: (name: string) => void;

  /**
   * Check if a handler is registered
   *
   * @param name - Handler name
   * @returns True if registered
   */
  hasHandler: (name: string) => boolean;

  /**
   * Get all registered handler names
   *
   * @returns Array of handler names
   */
  getHandlers: () => string[];
}

// =============================================================================
// Scheduler Hooks
// =============================================================================

/**
 * Scheduler-related hooks that plugins can implement
 */
export interface PluginSchedulerHooks {
  /**
   * Called when a scheduled task starts execution
   *
   * @param taskId - Task ID
   * @param executionId - Execution ID
   */
  onScheduledTaskStart?: (taskId: string, executionId: string) => void;

  /**
   * Called when a scheduled task completes successfully
   *
   * @param taskId - Task ID
   * @param executionId - Execution ID
   * @param result - Task result
   */
  onScheduledTaskComplete?: (taskId: string, executionId: string, result: PluginTaskResult) => void;

  /**
   * Called when a scheduled task fails
   *
   * @param taskId - Task ID
   * @param executionId - Execution ID
   * @param error - Error that occurred
   */
  onScheduledTaskError?: (taskId: string, executionId: string, error: Error) => void;

  /**
   * Called when a scheduled task is created
   *
   * @param task - Created task
   */
  onScheduledTaskCreate?: (task: PluginScheduledTask) => void;

  /**
   * Called when a scheduled task is updated
   *
   * @param task - Updated task
   * @param changes - What changed
   */
  onScheduledTaskUpdate?: (task: PluginScheduledTask, changes: Partial<PluginScheduledTask>) => void;

  /**
   * Called when a scheduled task is deleted
   *
   * @param taskId - Deleted task ID
   */
  onScheduledTaskDelete?: (taskId: string) => void;

  /**
   * Called when a scheduled task is paused
   *
   * @param taskId - Paused task ID
   */
  onScheduledTaskPause?: (taskId: string) => void;

  /**
   * Called when a scheduled task is resumed
   *
   * @param taskId - Resumed task ID
   */
  onScheduledTaskResume?: (taskId: string) => void;

  /**
   * Called before a scheduled task is about to run (can be cancelled)
   *
   * @param taskId - Task ID
   * @param executionId - Execution ID
   * @returns False to cancel execution
   */
  onScheduledTaskBeforeRun?: (taskId: string, executionId: string) => boolean | Promise<boolean>;
}
