/**
 * Database Utils Tests
 */

import { withRetry } from './utils';
import { loggers } from '@/lib/logger';

describe('db/utils', () => {
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.useFakeTimers();
    warnSpy = jest.spyOn(loggers.store, 'warn').mockImplementation();
  });

  afterEach(() => {
    jest.useRealTimers();
    warnSpy.mockRestore();
  });

  describe('withRetry', () => {
    it('should return result on successful first attempt', async () => {
      const operation = jest.fn().mockResolvedValue('success');

      const result = await withRetry(operation, 'Test operation');

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should retry on transient error and succeed', async () => {
      const transientError = new Error('Another write batch or compaction is already active');
      const operation = jest
        .fn()
        .mockRejectedValueOnce(transientError)
        .mockResolvedValue('success');

      const promise = withRetry(operation, 'Test operation');
      await jest.advanceTimersByTimeAsync(200);
      const result = await promise;

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should retry on LockContention error', async () => {
      const lockError = new Error('LockContention: resource is locked');
      const operation = jest
        .fn()
        .mockRejectedValueOnce(lockError)
        .mockResolvedValue('success');

      const promise = withRetry(operation, 'Test operation');
      await jest.advanceTimersByTimeAsync(200);
      const result = await promise;

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should throw immediately on non-transient errors', async () => {
      const permanentError = new Error('Permanent error');
      const operation = jest.fn().mockRejectedValue(permanentError);

      await expect(withRetry(operation, 'Test operation')).rejects.toThrow('Permanent error');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should attempt operation multiple times on transient errors', async () => {
      const transientError = new Error('LockContention');
      // Mock operation that fails twice then succeeds
      const operation = jest
        .fn()
        .mockRejectedValueOnce(transientError)
        .mockRejectedValueOnce(transientError)
        .mockResolvedValue('success');

      const promise = withRetry(operation, 'Test operation');
      
      // Advance timers to allow retries
      await jest.runAllTimersAsync();

      const result = await promise;
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should work with different return types', async () => {
      const numberOp = jest.fn().mockResolvedValue(42);
      const objectOp = jest.fn().mockResolvedValue({ key: 'value' });
      const arrayOp = jest.fn().mockResolvedValue([1, 2, 3]);

      expect(await withRetry(numberOp, 'Number')).toBe(42);
      expect(await withRetry(objectOp, 'Object')).toEqual({ key: 'value' });
      expect(await withRetry(arrayOp, 'Array')).toEqual([1, 2, 3]);
    });

    it('should handle null and undefined results', async () => {
      const nullOp = jest.fn().mockResolvedValue(null);
      const undefinedOp = jest.fn().mockResolvedValue(undefined);

      expect(await withRetry(nullOp, 'Null')).toBeNull();
      expect(await withRetry(undefinedOp, 'Undefined')).toBeUndefined();
    });

    it('should log warning on retry', async () => {
      const transientError = new Error('LockContention');
      const operation = jest
        .fn()
        .mockRejectedValueOnce(transientError)
        .mockResolvedValue('success');

      const promise = withRetry(operation, 'Test operation');
      await jest.advanceTimersByTimeAsync(200);
      await promise;

      expect(warnSpy).toHaveBeenCalled();
      expect(warnSpy.mock.calls[0][0]).toContain('Test operation failed');
    });

    it('should respect custom maxRetries option', async () => {
      const transientError = new Error('LockContention');
      const operation = jest.fn().mockRejectedValue(transientError);

      let caughtError: Error | undefined;
      const promise = withRetry(operation, 'Custom retries', { maxRetries: 2 }).catch((e) => {
        caughtError = e as Error;
      });
      await jest.runAllTimersAsync();
      await promise;

      expect(caughtError?.message).toBe('LockContention');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should respect custom maxRetries=1 (no retry)', async () => {
      const transientError = new Error('LockContention');
      const operation = jest.fn().mockRejectedValue(transientError);

      let caughtError: Error | undefined;
      const promise = withRetry(operation, 'Single attempt', { maxRetries: 1 }).catch((e) => {
        caughtError = e as Error;
      });
      await jest.runAllTimersAsync();
      await promise;

      expect(caughtError?.message).toBe('LockContention');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should use default options when none provided', async () => {
      const transientError = new Error('LockContention');
      const operation = jest.fn().mockRejectedValue(transientError);

      let caughtError: Error | undefined;
      const promise = withRetry(operation, 'Default options').catch((e) => {
        caughtError = e as Error;
      });
      await jest.runAllTimersAsync();
      await promise;

      expect(caughtError?.message).toBe('LockContention');
      // Default maxRetries is 5
      expect(operation).toHaveBeenCalledTimes(5);
    });
  });
});
