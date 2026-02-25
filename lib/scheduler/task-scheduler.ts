/**
 * Task Scheduler Service
 * Core service for managing scheduled tasks execution
 */

import { nanoid } from 'nanoid';
import {
  type ScheduledTask,
  type TaskExecution,
  type TaskExecutionLog,
  type TaskExecutionConfig,
  type CreateScheduledTaskInput,
  type UpdateScheduledTaskInput,
  type ScheduledTaskStatus,
  DEFAULT_EXECUTION_CONFIG,
  DEFAULT_NOTIFICATION_CONFIG,
} from '@/types/scheduler';
import { getNextCronTime } from './cron-parser';
import { schedulerDb } from './scheduler-db';
import { notifyTaskEvent } from './notification-integration';
import { emitSchedulerEvent } from './event-integration';
import { SchedulerError } from './errors';
import { isLeaderTab, startLeaderElection, stopLeaderElection, onLeaderChange } from './tab-lock';
import { loggers } from '@/lib/logger';
import { getPluginLifecycleHooks } from '@/lib/plugin';

// Logger
const log = loggers.app;

// Task executor registry
type TaskExecutor = (
  task: ScheduledTask,
  execution: TaskExecution
) => Promise<{ success: boolean; output?: Record<string, unknown>; error?: string }>;

const executors: Map<string, TaskExecutor> = new Map();

/**
 * Register a task executor for a specific task type
 */
export function registerTaskExecutor(taskType: string, executor: TaskExecutor): void {
  executors.set(taskType, executor);
  log.info(`Registered executor for task type: ${taskType}`);
}

/**
 * Unregister a task executor
 */
export function unregisterTaskExecutor(taskType: string): void {
  executors.delete(taskType);
  log.info(`Unregistered executor for task type: ${taskType}`);
}

/**
 * Task Scheduler class
 */
const EXECUTION_CHANNEL_NAME = 'cognia-scheduler-executions';

export type ExecutionStatusEvent = {
  type: 'execution-update';
  taskId: string;
  executionId: string;
  status: TaskExecution['status'];
  taskName: string;
  duration?: number;
  error?: string;
};

class TaskSchedulerImpl {
  private timers: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private runningExecutions: Map<string, TaskExecution> = new Map();
  private isInitialized = false;
  private checkInterval: ReturnType<typeof setInterval> | null = null;
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;
  private leaderUnsubscribe: (() => void) | null = null;
  private visibilityHandler: (() => void) | null = null;
  private executionChannel: BroadcastChannel | null = null;

  /**
   * Initialize the scheduler
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    log.info('Initializing task scheduler...');

    try {
      // Start leader election — only the leader tab will execute scheduled tasks
      await startLeaderElection();
      this.leaderUnsubscribe = onLeaderChange((isLeader) => {
        if (isLeader) {
          log.info('This tab became leader — scheduling all active tasks');
          this.scheduleAllActiveTasks().catch((err) => {
            log.error('Error scheduling tasks after becoming leader:', err);
          });
        } else {
          log.info('This tab lost leadership — unscheduling all tasks');
          this.unscheduleAllTasks();
        }
      });

      // Load all active tasks and schedule them (only if leader)
      if (isLeaderTab()) {
        await this.scheduleAllActiveTasks();
      }

      // Start periodic check for missed tasks
      this.startPeriodicCheck();

      // Start auto-cleanup for old executions (runs every 24 hours)
      this.startAutoCleanup();

      // Initialize BroadcastChannel for real-time execution status updates
      try {
        this.executionChannel = new BroadcastChannel(EXECUTION_CHANNEL_NAME);
      } catch {
        log.warn('BroadcastChannel not available for execution status updates');
      }

      // Visibility-aware scheduling: catch up on missed tasks when tab becomes visible
      if (typeof document !== 'undefined') {
        this.visibilityHandler = () => {
          if (!document.hidden && isLeaderTab()) {
            log.debug('Tab became visible — checking for missed tasks');
            this.checkMissedTasks().catch((err) => {
              log.error('Error checking missed tasks on visibility change:', err);
            });
          }
        };
        document.addEventListener('visibilitychange', this.visibilityHandler);
      }

      this.isInitialized = true;
      log.info('Task scheduler initialized successfully');
    } catch (error) {
      log.error('Failed to initialize task scheduler:', error);
      throw SchedulerError.initFailed(
        error instanceof Error ? error.message : String(error),
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Schedule all active tasks (called on init and when becoming leader)
   */
  private async scheduleAllActiveTasks(): Promise<void> {
    const tasks = await schedulerDb.getTasksByStatus('active');
    log.info(`Found ${tasks.length} active tasks to schedule`);
    for (const task of tasks) {
      await this.scheduleTask(task);
    }
  }

  /**
   * Unschedule all tasks (called when losing leadership)
   */
  private unscheduleAllTasks(): void {
    for (const taskId of this.timers.keys()) {
      this.unscheduleTask(taskId);
    }
  }

  /**
   * Start periodic check for tasks that might have been missed
   */
  private startPeriodicCheck(): void {
    // Check every minute for any missed tasks
    this.checkInterval = setInterval(() => {
      this.checkMissedTasks().catch((err) => {
        log.error('Error checking missed tasks:', err);
      });
    }, 60000);
  }

  /**
   * Start auto-cleanup for old execution records
   * Runs every 24 hours to clean up executions older than 30 days
   */
  private startAutoCleanup(): void {
    const CLEANUP_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours
    const MAX_AGE_DAYS = 30;

    // Run initial cleanup
    this.cleanupOldExecutions(MAX_AGE_DAYS).catch((err) => {
      log.error('Error in initial cleanup:', err);
    });

    // Schedule periodic cleanup
    this.cleanupInterval = setInterval(() => {
      this.cleanupOldExecutions(MAX_AGE_DAYS).catch((err) => {
        log.error('Error in auto-cleanup:', err);
      });
    }, CLEANUP_INTERVAL);
  }

  /**
   * Clean up old execution records
   */
  private async cleanupOldExecutions(maxAgeDays: number): Promise<void> {
    try {
      const deleted = await schedulerDb.cleanupOldExecutions(maxAgeDays);
      if (deleted > 0) {
        log.info(`Auto-cleanup: Removed ${deleted} old execution records`);
      }
    } catch (error) {
      log.error('Failed to cleanup old executions:', error);
    }
  }

  /**
   * Check and run any missed tasks
   */
  private async checkMissedTasks(): Promise<void> {
    const tasks = await schedulerDb.getTasksByStatus('active');
    const now = new Date();

    for (const task of tasks) {
      if (task.nextRunAt && task.nextRunAt < now) {
        const missedBy = now.getTime() - task.nextRunAt.getTime();
        
        // Only run if missed by less than the check interval (1 minute) 
        // to avoid running very old tasks
        if (missedBy < 60000 && task.config.runMissedOnStartup) {
          log.warn(`Task ${task.name} was missed, running now`);
          await this.executeTask(task);
        } else {
          // Just update the next run time
          await this.updateNextRunTime(task);
        }
      }
    }
  }

  /**
   * Stop the scheduler
   */
  stop(): void {
    log.info('Stopping task scheduler...');

    // Stop leader election
    if (this.leaderUnsubscribe) {
      this.leaderUnsubscribe();
      this.leaderUnsubscribe = null;
    }
    stopLeaderElection();

    // Remove visibility handler
    if (this.visibilityHandler && typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.visibilityHandler);
      this.visibilityHandler = null;
    }

    // Clear all timers
    for (const [taskId, timer] of this.timers) {
      clearTimeout(timer);
      log.debug(`Cleared timer for task: ${taskId}`);
    }
    this.timers.clear();

    // Clear periodic check
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }

    // Clear auto-cleanup
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    // Close execution channel
    try {
      this.executionChannel?.close();
    } catch { /* ignore */ }
    this.executionChannel = null;

    this.isInitialized = false;
    log.info('Task scheduler stopped');
  }

  /**
   * Broadcast execution status change via BroadcastChannel
   */
  private broadcastExecutionStatus(execution: TaskExecution): void {
    try {
      this.executionChannel?.postMessage({
        type: 'execution-update',
        taskId: execution.taskId,
        executionId: execution.id,
        status: execution.status,
        taskName: execution.taskName,
        duration: execution.duration,
        error: execution.error,
      } satisfies ExecutionStatusEvent);
    } catch { /* channel closed or unavailable */ }
  }

  /**
   * Create a new scheduled task
   */
  async createTask(input: CreateScheduledTaskInput): Promise<ScheduledTask> {
    const now = new Date();
    
    const task: ScheduledTask = {
      id: nanoid(),
      name: input.name,
      description: input.description,
      type: input.type,
      trigger: input.trigger,
      payload: input.payload,
      config: { ...DEFAULT_EXECUTION_CONFIG, ...input.config },
      notification: { ...DEFAULT_NOTIFICATION_CONFIG, ...input.notification },
      status: 'active',
      tags: input.tags,
      runCount: 0,
      successCount: 0,
      failureCount: 0,
      createdAt: now,
      updatedAt: now,
    };

    // Calculate next run time
    task.nextRunAt = this.calculateNextRunTime(task);

    // Save to database
    await schedulerDb.createTask(task);
    log.info(`Created task: ${task.name} (${task.id})`);

    // Schedule if active
    if (task.status === 'active') {
      await this.scheduleTask(task);
    }

    return task;
  }

  /**
   * Update an existing task
   */
  async updateTask(taskId: string, input: UpdateScheduledTaskInput): Promise<ScheduledTask | null> {
    const task = await schedulerDb.getTask(taskId);
    if (!task) {
      log.warn(`Task not found: ${taskId}`);
      return null;
    }

    // Update fields
    const updatedTask: ScheduledTask = {
      ...task,
      ...(input.name !== undefined && { name: input.name }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.trigger && { trigger: { ...task.trigger, ...input.trigger } }),
      ...(input.payload && { payload: { ...task.payload, ...input.payload } }),
      ...(input.config && { config: { ...task.config, ...input.config } }),
      ...(input.notification && { notification: { ...task.notification, ...input.notification } }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.tags !== undefined && { tags: input.tags }),
      updatedAt: new Date(),
    };

    // Recalculate next run time if trigger changed
    if (input.trigger) {
      updatedTask.nextRunAt = this.calculateNextRunTime(updatedTask);
    }

    // Save to database
    await schedulerDb.updateTask(updatedTask);
    log.info(`Updated task: ${updatedTask.name} (${taskId})`);

    // Reschedule
    this.unscheduleTask(taskId);
    if (updatedTask.status === 'active') {
      await this.scheduleTask(updatedTask);
    }

    return updatedTask;
  }

  /**
   * Delete a task
   */
  async deleteTask(taskId: string): Promise<boolean> {
    this.unscheduleTask(taskId);
    const deleted = await schedulerDb.deleteTask(taskId);
    if (deleted) {
      log.info(`Deleted task: ${taskId}`);
    }
    return deleted;
  }

  /**
   * Get a task by ID
   */
  async getTask(taskId: string): Promise<ScheduledTask | null> {
    return schedulerDb.getTask(taskId);
  }

  /**
   * Get all tasks
   */
  async getAllTasks(): Promise<ScheduledTask[]> {
    return schedulerDb.getAllTasks();
  }

  /**
   * Pause a task
   */
  async pauseTask(taskId: string): Promise<boolean> {
    const task = await schedulerDb.getTask(taskId);
    if (!task) return false;

    this.unscheduleTask(taskId);
    await schedulerDb.updateTask({ ...task, status: 'paused', updatedAt: new Date() });
    log.info(`Paused task: ${task.name} (${taskId})`);
    return true;
  }

  /**
   * Resume a task
   */
  async resumeTask(taskId: string): Promise<boolean> {
    const task = await schedulerDb.getTask(taskId);
    if (!task || task.status !== 'paused') return false;

    const updatedTask = {
      ...task,
      status: 'active' as ScheduledTaskStatus,
      nextRunAt: this.calculateNextRunTime(task),
      updatedAt: new Date(),
    };
    await schedulerDb.updateTask(updatedTask);
    await this.scheduleTask(updatedTask);
    log.info(`Resumed task: ${task.name} (${taskId})`);
    return true;
  }

  /**
   * Run a task immediately
   */
  async runTaskNow(taskId: string): Promise<TaskExecution | null> {
    const task = await schedulerDb.getTask(taskId);
    if (!task) {
      log.warn(`Task not found for immediate run: ${taskId}`);
      return null;
    }

    return this.executeTask(task);
  }

  /**
   * Get task executions
   */
  async getTaskExecutions(taskId: string, limit: number = 50): Promise<TaskExecution[]> {
    return schedulerDb.getTaskExecutions(taskId, limit);
  }

  /**
   * Schedule a task for execution
   */
  private async scheduleTask(task: ScheduledTask): Promise<void> {
    if (task.status !== 'active') return;

    const nextRun = task.nextRunAt || this.calculateNextRunTime(task);
    if (!nextRun) {
      log.warn(`Could not calculate next run time for task: ${task.name}`);
      return;
    }

    const delay = nextRun.getTime() - Date.now();
    
    if (delay <= 0) {
      // Run immediately if the scheduled time has passed
      log.debug(`Task ${task.name} is overdue, running now`);
      this.executeTask(task).catch((err) => {
        log.error(`Error executing overdue task ${task.name}:`, err);
      });
      return;
    }

    // Clear existing timer
    this.unscheduleTask(task.id);

    // For long delays (> 60s), use polling to avoid browser timer throttling
    // and setTimeout drift on background tabs. For short delays, use
    // direct setTimeout for better precision.
    const DRIFT_THRESHOLD_MS = 60_000;

    if (delay > DRIFT_THRESHOLD_MS) {
      const targetTime = nextRun.getTime();
      const timer = setInterval(() => {
        const remaining = targetTime - Date.now();
        if (remaining <= 0) {
          clearInterval(timer);
          this.timers.delete(task.id);
          this.executeTask(task).catch((err) => {
            log.error(`Error executing scheduled task ${task.name}:`, err);
          });
        } else if (remaining <= DRIFT_THRESHOLD_MS) {
          // Switch to precise setTimeout for the final stretch
          clearInterval(timer);
          const finalTimer = setTimeout(() => {
            this.timers.delete(task.id);
            this.executeTask(task).catch((err) => {
              log.error(`Error executing scheduled task ${task.name}:`, err);
            });
          }, remaining);
          this.timers.set(task.id, finalTimer);
        }
      }, DRIFT_THRESHOLD_MS);
      this.timers.set(task.id, timer);
    } else {
      const timer = setTimeout(() => {
        this.timers.delete(task.id);
        this.executeTask(task).catch((err) => {
          log.error(`Error executing scheduled task ${task.name}:`, err);
        });
      }, delay);
      this.timers.set(task.id, timer);
    }

    log.debug(`Scheduled task ${task.name} for ${nextRun.toISOString()} (in ${Math.round(delay / 1000)}s)`);
  }

  /**
   * Unschedule a task
   */
  private unscheduleTask(taskId: string): void {
    const timer = this.timers.get(taskId);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(taskId);
      log.debug(`Unscheduled task: ${taskId}`);
    }
  }

  /**
   * Execute a task
   */
  private async executeTask(task: ScheduledTask, retryAttempt: number = 0): Promise<TaskExecution> {
    const executionId = nanoid();
    const startTime = new Date();

    // Check for concurrent execution
    if (!task.config.allowConcurrent && this.runningExecutions.has(task.id)) {
      log.warn(`Task ${task.name} is already running, skipping`);
      const skippedExecution: TaskExecution = {
        id: executionId,
        taskId: task.id,
        taskName: task.name,
        taskType: task.type,
        status: 'skipped',
        retryAttempt,
        startedAt: startTime,
        completedAt: startTime,
        duration: 0,
        logs: [this.createLog('info', 'Skipped: concurrent execution not allowed')],
      };
      await schedulerDb.createExecution(skippedExecution);
      return skippedExecution;
    }

    // Create execution record
    const execution: TaskExecution = {
      id: executionId,
      taskId: task.id,
      taskName: task.name,
      taskType: task.type,
      status: 'running',
      input: task.payload,
      retryAttempt,
      startedAt: startTime,
      logs: [this.createLog('info', `Starting task execution (attempt ${retryAttempt + 1})`)],
    };

    this.runningExecutions.set(task.id, execution);
    await schedulerDb.createExecution(execution);
    this.broadcastExecutionStatus(execution);

    // Notify start
    if (task.notification.onStart) {
      await notifyTaskEvent(task, execution, 'start');
    }

    // Dispatch plugin hook for task start
    try {
      getPluginLifecycleHooks().dispatchOnScheduledTaskStart(task.id, executionId);
    } catch { /* plugin system may not be initialized */ }

    log.info(`Executing task: ${task.name} (execution: ${executionId})`);

    try {
      // Get executor
      const executor = executors.get(task.type);
      if (!executor) {
        throw SchedulerError.executorNotFound(task.type);
      }

      // Execute with timeout
      const result = await this.executeWithTimeout(
        () => executor(task, execution),
        task.config.timeout
      );

      // Update execution
      execution.status = result.success ? 'completed' : 'failed';
      execution.output = result.output;
      execution.error = result.error;
      execution.completedAt = new Date();
      execution.duration = execution.completedAt.getTime() - startTime.getTime();
      execution.logs.push(
        this.createLog(
          result.success ? 'info' : 'error',
          result.success ? 'Task completed successfully' : `Task failed: ${result.error}`
        )
      );

      // Update task statistics
      await this.updateTaskStats(task, execution);

      // Notify completion
      if (result.success && task.notification.onComplete) {
        await notifyTaskEvent(task, execution, 'complete');
      } else if (!result.success && task.notification.onError) {
        await notifyTaskEvent(task, execution, 'error');
      }

      // Emit scheduler events for event-triggered task chaining
      const eventType = result.success
        ? (`${task.type}:completed` as const)
        : undefined;
      if (eventType) {
        emitSchedulerEvent(
          eventType === 'workflow:completed' || eventType === 'agent:completed'
            || eventType === 'backup:completed' || eventType === 'sync:completed'
            ? eventType
            : 'custom',
          { taskId: task.id, taskName: task.name, executionId: execution.id, output: result.output },
          task.type
        ).catch((err) => log.error('Failed to emit post-execution event:', err));
      }

      // Dispatch plugin hooks for completion/failure
      try {
        if (result.success) {
          getPluginLifecycleHooks().dispatchOnScheduledTaskComplete(task.id, executionId, { success: true, output: result.output });
        } else {
          getPluginLifecycleHooks().dispatchOnScheduledTaskError(task.id, executionId, new Error(result.error || 'Unknown error'));
        }
      } catch { /* plugin system may not be initialized */ }

      log.info(`Task ${task.name} ${result.success ? 'completed' : 'failed'} in ${execution.duration}ms`);

      // Trigger dependent tasks on success
      if (result.success) {
        this.triggerDependentTasks(task.id).catch((err) => {
          log.error('Failed to trigger dependent tasks:', err);
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      execution.status = 'failed';
      execution.error = errorMessage;
      execution.completedAt = new Date();
      execution.duration = execution.completedAt.getTime() - startTime.getTime();
      execution.logs.push(this.createLog('error', `Execution error: ${errorMessage}`));

      log.error(`Task ${task.name} failed with error:`, error);

      // Dispatch plugin hook for error
      try {
        getPluginLifecycleHooks().dispatchOnScheduledTaskError(task.id, executionId, new Error(errorMessage));
      } catch { /* plugin system may not be initialized */ }

      // Notify error
      if (task.notification.onError) {
        await notifyTaskEvent(task, execution, 'error');
      }

      // Handle retry with exponential backoff + jitter
      if (retryAttempt < task.config.maxRetries) {
        const delay = this.calculateRetryDelay(task.config, retryAttempt);
        execution.logs.push(
          this.createLog('info', `Scheduling retry ${retryAttempt + 1}/${task.config.maxRetries} in ${Math.round(delay / 1000)}s`)
        );
        
        setTimeout(() => {
          this.executeTask(task, retryAttempt + 1).catch((err) => {
            log.error(`Retry failed for task ${task.name}:`, err);
          });
        }, delay);
      }

      // Update task statistics
      await this.updateTaskStats(task, execution);
    } finally {
      this.runningExecutions.delete(task.id);
      await schedulerDb.updateExecution(execution);
      this.broadcastExecutionStatus(execution);

      // Schedule next run
      await this.updateNextRunTime(task);
    }

    return execution;
  }

  /**
   * Execute a function with timeout using AbortController
   */
  private async executeWithTimeout<T>(
    fn: () => Promise<T>,
    timeoutMs: number
  ): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const result = await Promise.race([
        fn(),
        new Promise<never>((_resolve, reject) => {
          controller.signal.addEventListener('abort', () => {
            reject(SchedulerError.executionTimeout('task', timeoutMs));
          });
        }),
      ]);
      return result;
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Update task statistics after execution
   */
  private async updateTaskStats(task: ScheduledTask, execution: TaskExecution): Promise<void> {
    const updates: Partial<ScheduledTask> = {
      runCount: task.runCount + 1,
      lastRunAt: execution.startedAt,
      updatedAt: new Date(),
    };

    if (execution.status === 'completed') {
      updates.successCount = task.successCount + 1;
      updates.lastError = undefined;
    } else if (execution.status === 'failed') {
      updates.failureCount = task.failureCount + 1;
      updates.lastError = execution.error;
    }

    await schedulerDb.updateTask({ ...task, ...updates });
  }

  /**
   * Update the next run time for a task and reschedule
   */
  private async updateNextRunTime(task: ScheduledTask): Promise<void> {
    const nextRunAt = this.calculateNextRunTime(task);
    
    if (nextRunAt) {
      await schedulerDb.updateTask({
        ...task,
        nextRunAt,
        updatedAt: new Date(),
      });

      // Reschedule
      if (task.status === 'active') {
        await this.scheduleTask({ ...task, nextRunAt });
      }
    } else if (task.trigger.type === 'once') {
      // One-time task completed, mark as expired
      await schedulerDb.updateTask({
        ...task,
        status: 'expired',
        updatedAt: new Date(),
      });
    }
  }

  /**
   * Calculate the next run time for a task
   */
  private calculateNextRunTime(task: ScheduledTask): Date | undefined {
    const trigger = task.trigger;
    const now = new Date();

    switch (trigger.type) {
      case 'cron':
        if (trigger.cronExpression) {
          return getNextCronTime(trigger.cronExpression, now, trigger.timezone) || undefined;
        }
        break;

      case 'interval':
        if (trigger.intervalMs && trigger.intervalMs > 0) {
          const baseTime = task.lastRunAt || task.createdAt;
          const nextTime = new Date(baseTime.getTime() + trigger.intervalMs);
          return nextTime > now ? nextTime : new Date(now.getTime() + trigger.intervalMs);
        }
        break;

      case 'once':
        if (trigger.runAt && trigger.runAt > now) {
          return trigger.runAt;
        }
        break;

      case 'event':
        // Event-based tasks don't have a scheduled time
        return undefined;
    }

    return undefined;
  }

  /**
   * Calculate retry delay using exponential backoff with jitter
   * Formula: min(baseDelay * 2^attempt + random_jitter, maxDelay)
   */
  private calculateRetryDelay(config: TaskExecutionConfig, attempt: number): number {
    const baseDelay = config.retryDelay;
    const maxDelay = config.maxRetryDelay || 60000;
    const exponentialDelay = baseDelay * Math.pow(2, attempt);
    // Add random jitter (0-25% of exponential delay) to prevent thundering herd
    const jitter = Math.random() * exponentialDelay * 0.25;
    return Math.min(exponentialDelay + jitter, maxDelay);
  }

  /**
   * Create a log entry
   */
  private createLog(level: TaskExecutionLog['level'], message: string, data?: unknown): TaskExecutionLog {
    return {
      id: nanoid(),
      timestamp: new Date(),
      level,
      message,
      data,
    };
  }

  /** Track task IDs currently being triggered via dependency chain to detect cycles */
  private dependencyChainVisited: Set<string> = new Set();

  /**
   * Trigger tasks that depend on the completed task.
   * Includes cycle detection to prevent infinite loops.
   */
  private async triggerDependentTasks(completedTaskId: string): Promise<void> {
    // Cycle detection: if this task is already in the chain, abort
    if (this.dependencyChainVisited.has(completedTaskId)) {
      log.warn(`Dependency cycle detected at task ${completedTaskId}, aborting chain`);
      return;
    }

    this.dependencyChainVisited.add(completedTaskId);

    try {
      const activeTasks = await schedulerDb.getTasksByStatus('active');
      const dependentTasks = activeTasks.filter(
        (t) => t.trigger.dependsOn && t.trigger.dependsOn.includes(completedTaskId)
      );

      for (const depTask of dependentTasks) {
        // Skip if this dependent task is already in the chain (another cycle check)
        if (this.dependencyChainVisited.has(depTask.id)) {
          log.warn(`Skipping task "${depTask.name}" to prevent dependency cycle`);
          continue;
        }

        const allDepsComplete = await this.checkAllDependenciesComplete(depTask);
        if (allDepsComplete) {
          log.info(`All dependencies met for task "${depTask.name}", triggering execution`);
          this.executeTask(depTask).catch((err) => {
            log.error(`Error executing dependent task ${depTask.name}:`, err);
          });
        }
      }
    } catch (error) {
      log.error('Error checking dependent tasks:', error);
    } finally {
      this.dependencyChainVisited.delete(completedTaskId);
    }
  }

  /**
   * Check if all dependency tasks have completed successfully (most recent execution)
   */
  private async checkAllDependenciesComplete(task: ScheduledTask): Promise<boolean> {
    const deps = task.trigger.dependsOn;
    if (!deps || deps.length === 0) return true;

    for (const depTaskId of deps) {
      const depTask = await schedulerDb.getTask(depTaskId);
      if (!depTask) return false;
      if (!depTask.lastRunAt) return false;

      const executions = await schedulerDb.getTaskExecutions(depTaskId, 1);
      if (executions.length === 0) return false;

      const lastExec = executions[0];
      if (lastExec.status !== 'completed') return false;
    }
    return true;
  }

  /**
   * Trigger an event-based task
   */
  async triggerEventTask(eventType: string, eventSource?: string, payload?: Record<string, unknown>): Promise<void> {
    // Use targeted query instead of loading all tasks
    const eventTasks = await schedulerDb.getActiveEventTasks(eventType);
    
    for (const task of eventTasks) {
      if (!task.trigger.eventSource || task.trigger.eventSource === eventSource) {
        log.info(`Event ${eventType} triggered task: ${task.name}`);
        
        // Merge event payload with task payload
        const mergedPayload = { ...task.payload, event: { type: eventType, source: eventSource, data: payload } };
        const taskWithPayload = { ...task, payload: mergedPayload };
        
        this.executeTask(taskWithPayload).catch((err) => {
          log.error(`Error executing event-triggered task ${task.name}:`, err);
        });
      }
    }
  }

  /**
   * Export all tasks as a JSON-serializable object (excludes execution history)
   */
  async exportTasks(taskIds?: string[]): Promise<{ version: number; exportedAt: string; tasks: ScheduledTask[] }> {
    let tasks: ScheduledTask[];
    if (taskIds && taskIds.length > 0) {
      const allTasks = await schedulerDb.getAllTasks();
      tasks = allTasks.filter((t) => taskIds.includes(t.id));
    } else {
      tasks = await schedulerDb.getAllTasks();
    }

    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      tasks,
    };
  }

  /**
   * Import tasks from an exported JSON object
   * @param mode 'merge' keeps existing tasks, 'replace' deletes all before import
   */
  async importTasks(
    data: { version: number; tasks: ScheduledTask[] },
    mode: 'merge' | 'replace' = 'merge'
  ): Promise<{ imported: number; skipped: number; errors: string[] }> {
    const result = { imported: 0, skipped: 0, errors: [] as string[] };

    if (!data?.version || !Array.isArray(data.tasks)) {
      result.errors.push('Invalid import format: missing version or tasks array');
      return result;
    }

    if (mode === 'replace') {
      const existingTasks = await schedulerDb.getAllTasks();
      for (const task of existingTasks) {
        this.unscheduleTask(task.id);
        await schedulerDb.deleteTask(task.id);
      }
    }

    for (const task of data.tasks) {
      try {
        if (!task.name || !task.type || !task.trigger) {
          result.errors.push(`Skipped invalid task: ${task.name || task.id || 'unknown'}`);
          result.skipped++;
          continue;
        }

        if (mode === 'merge') {
          const existing = await schedulerDb.getTask(task.id);
          if (existing) {
            result.skipped++;
            continue;
          }
        }

        const importedTask: ScheduledTask = {
          ...task,
          createdAt: new Date(task.createdAt),
          updatedAt: new Date(),
          lastRunAt: undefined,
          nextRunAt: undefined,
          runCount: 0,
          successCount: 0,
          failureCount: 0,
          lastError: undefined,
          status: 'active',
        };

        importedTask.nextRunAt = this.calculateNextRunTime(importedTask);
        await schedulerDb.createTask(importedTask);

        if (importedTask.status === 'active' && isLeaderTab()) {
          await this.scheduleTask(importedTask);
        }

        result.imported++;
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        result.errors.push(`Failed to import task "${task.name}": ${msg}`);
      }
    }

    log.info(`Import complete: ${result.imported} imported, ${result.skipped} skipped, ${result.errors.length} errors`);
    return result;
  }

  /**
   * Get scheduler status
   */
  getStatus(): { initialized: boolean; scheduledCount: number; runningCount: number } {
    return {
      initialized: this.isInitialized,
      scheduledCount: this.timers.size,
      runningCount: this.runningExecutions.size,
    };
  }
}

// Singleton instance
let schedulerInstance: TaskSchedulerImpl | null = null;

/**
 * Create a new task scheduler instance (factory pattern).
 * Useful for testing or creating isolated scheduler instances.
 */
export function createTaskScheduler(): TaskSchedulerImpl {
  return new TaskSchedulerImpl();
}

/**
 * Get the task scheduler singleton instance.
 * Creates one if it doesn't exist yet.
 */
export function getTaskScheduler(): TaskSchedulerImpl {
  if (!schedulerInstance) {
    schedulerInstance = createTaskScheduler();
  }
  return schedulerInstance;
}

/**
 * Initialize the task scheduler
 */
export async function initTaskScheduler(): Promise<void> {
  const scheduler = getTaskScheduler();
  await scheduler.initialize();
}

/**
 * Stop the task scheduler
 */
export function stopTaskScheduler(): void {
  if (schedulerInstance) {
    schedulerInstance.stop();
  }
}

export { TaskSchedulerImpl };
