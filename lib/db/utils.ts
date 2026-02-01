/**
 * Database Utilities
 */

import { loggers } from '@/lib/logger';

const log = loggers.store;

const MAX_RETRIES = 5;
const BASE_DELAY = 100; // ms

/**
 * Executes a function with exponential backoff retry logic for specific Dexie/IndexedDB errors.
 * Specifically targets "Another write batch or compaction is already active" which is a transient LevelDB error.
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  operationName: string = 'Database operation'
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
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
        BASE_DELAY * Math.pow(2, attempt) + Math.random() * 50, 
        2000 // Max delay of 2s
      );

      log.warn(
        `${operationName} failed (attempt ${attempt + 1}/${MAX_RETRIES}): ${errorMessage}. Retrying in ${delay.toFixed(0)}ms...`
      );

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}
