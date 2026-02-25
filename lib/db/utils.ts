/**
 * Database Utilities
 */

import { loggers } from '@/lib/logger';

const log = loggers.store;

const DEFAULT_MAX_RETRIES = 5;
const DEFAULT_BASE_DELAY = 100; // ms
const DEFAULT_MAX_DELAY = 2000; // ms

export interface RetryOptions {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
}

/**
 * Executes a function with exponential backoff retry logic for specific Dexie/IndexedDB errors.
 * Specifically targets "Another write batch or compaction is already active" which is a transient LevelDB error.
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  operationName: string = 'Database operation',
  options?: RetryOptions
): Promise<T> {
  const maxRetries = options?.maxRetries ?? DEFAULT_MAX_RETRIES;
  const baseDelay = options?.baseDelay ?? DEFAULT_BASE_DELAY;
  const maxDelay = options?.maxDelay ?? DEFAULT_MAX_DELAY;
  let lastError: unknown;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // key error check: "Another write batch or compaction is already active"
      // Also checking for "LockContention" or "TransactionInactiveError" which can be transient
      const isTransientError = 
        errorMessage.includes('Another write batch or compaction is already active') ||
        errorMessage.includes('LockContention') || 
        (typeof error === 'object' && error !== null && 'name' in error && (
          (error as { name: string }).name === 'TransactionInactiveError' || 
          (error as { name: string }).name === 'DatabaseClosedError'
        ));

      if (!isTransientError) {
        throw error;
      }

      // Calculate delay with exponential backoff and jitter
      const delay = Math.min(
        baseDelay * Math.pow(2, attempt) + Math.random() * 50, 
        maxDelay
      );

      log.warn(
        `${operationName} failed (attempt ${attempt + 1}/${maxRetries}): ${errorMessage}. Retrying in ${delay.toFixed(0)}ms...`
      );

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}
