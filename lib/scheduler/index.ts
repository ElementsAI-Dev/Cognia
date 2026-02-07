/**
 * Scheduler Module
 * Exports all scheduler-related functions and types
 */

// Core scheduler
export {
  getTaskScheduler,
  initTaskScheduler,
  stopTaskScheduler,
  registerTaskExecutor,
  unregisterTaskExecutor,
  type TaskSchedulerImpl,
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
} from './executors';

// Script Executor
export {
  executeScript,
  validateScript,
  getScriptTemplate,
  getSupportedLanguages,
} from './script-executor';

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
  
  console.info('[Scheduler] Scheduler system initialized');
}

/**
 * Stop the complete scheduler system
 * Should be called on application shutdown
 */
export async function stopSchedulerSystem(): Promise<void> {
  const { stopTaskScheduler } = await import('./task-scheduler');
  stopTaskScheduler();
  console.info('[Scheduler] Scheduler system stopped');
}
