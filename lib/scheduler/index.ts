/**
 * Scheduler Module
 * Exports all scheduler-related functions and types
 */

import { loggers } from '@/lib/logger';

const log = loggers.app;

// Core scheduler
export {
  getTaskScheduler,
  createTaskScheduler,
  initTaskScheduler,
  stopTaskScheduler,
  registerTaskExecutor,
  unregisterTaskExecutor,
  type TaskSchedulerImpl,
  type ExecutionStatusEvent,
} from './task-scheduler';

// Cron parser utilities
export {
  parseCronExpression,
  validateCronExpression,
  getNextCronTime,
  getNextCronTimes,
  describeCronExpression,
  formatCronExpression,
  matchesCronExpression,
} from './cron-parser';

// Database
export { schedulerDb, SchedulerDatabase } from './scheduler-db';

// Notifications
export { notifyTaskEvent, testNotificationChannel } from './notification-integration';

// Executors
export {
  registerBuiltinExecutors,
  registerCustomTaskHandler,
  unregisterCustomTaskHandler,
  executeScriptTask,
  cancelPluginTaskExecution,
  getActivePluginTaskCount,
  isPluginTaskExecutionActive,
} from './executors';

// Script Executor
export {
  executeScript,
  validateScript,
  getScriptTemplate,
  getSupportedLanguages,
} from './script-executor';

// Errors
export { SchedulerError, type SchedulerErrorCode } from './errors';

// Tab lock (multi-tab leader election)
export { isLeaderTab, startLeaderElection, stopLeaderElection, onLeaderChange, getTabId } from './tab-lock';

// Format utilities
export { formatDuration, formatRelativeTime, formatNextRun } from './format-utils';

// Task templates
export {
  TASK_TEMPLATES,
  TEMPLATE_CATEGORIES,
  getTemplatesByCategory,
  getTemplateById,
  type TaskTemplate,
  type TaskTemplateCategory,
} from './task-templates';

// Event Integration
export {
  emitSchedulerEvent,
  createEventData,
  isValidEventType,
  type SchedulerEventType,
  type SchedulerEventData,
} from './event-integration';

/**
 * Initialize the complete scheduler system
 * Should be called on application startup
 */
export async function initSchedulerSystem(): Promise<void> {
  const { registerBuiltinExecutors } = await import('./executors');
  const { initTaskScheduler } = await import('./task-scheduler');
  
  // Register built-in executors first
  registerBuiltinExecutors();
  
  // Initialize the scheduler
  await initTaskScheduler();
  
  log.info('[Scheduler] Scheduler system initialized');
}

/**
 * Stop the complete scheduler system
 * Should be called on application shutdown
 */
export async function stopSchedulerSystem(): Promise<void> {
  const { stopTaskScheduler } = await import('./task-scheduler');
  stopTaskScheduler();
  log.info('[Scheduler] Scheduler system stopped');
}
