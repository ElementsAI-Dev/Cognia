/**
 * Unit tests for retry utility
 */

import {
  withRetry,
  withTimeout,
  isRetryableError,
  calculateDelay,
  sleep,
  createCircuitBreaker,
  DEFAULT_RETRY_CONFIG,
  NETWORK_RETRY_CONFIG,
  AGENT_RETRY_CONFIG,
} from './retry';

describe('retry utility', () => {
  describe('isRetryableError', () => {
    it('should identify retryable errors by message', () => {
      expect(isRetryableError(new Error('Connection timeout'))).toBe(true);
      expect(isRetryableError(new Error('Rate limit exceeded'))).toBe(true);
      expect(isRetryableError(new Error('Error 429: Too many requests'))).toBe(true);
      expect(isRetryableError(new Error('Error 503: Service unavailable'))).toBe(true);
      expect(isRetryableError(new Error('Network error'))).toBe(true);
      expect(isRetryableError(new Error('ECONNRESET'))).toBe(true);
      expect(isRetryableError(new Error('fetch failed'))).toBe(true);
    });

    it('should not identify non-retryable errors', () => {
      expect(isRetryableError(new Error('Invalid input'))).toBe(false);
      expect(isRetryableError(new Error('Not found'))).toBe(false);
      expect(isRetryableError(new Error('Unauthorized'))).toBe(false);
    });

    it('should use custom retryable patterns', () => {
      const config = { retryableErrors: ['custom_error'] };
      expect(isRetryableError(new Error('custom_error occurred'), config)).toBe(true);
      expect(isRetryableError(new Error('timeout'), config)).toBe(false);
    });
  });

  describe('calculateDelay', () => {
    it('should calculate exponential backoff', () => {
      const config = {
        initialDelay: 1000,
        backoffStrategy: 'exponential' as const,
        backoffMultiplier: 2,
        jitter: false,
      };

      expect(calculateDelay(0, config)).toBe(1000);
      expect(calculateDelay(1, config)).toBe(2000);
      expect(calculateDelay(2, config)).toBe(4000);
      expect(calculateDelay(3, config)).toBe(8000);
    });

    it('should calculate linear backoff', () => {
      const config = {
        initialDelay: 1000,
        backoffStrategy: 'linear' as const,
        backoffMultiplier: 2,
        jitter: false,
      };

      expect(calculateDelay(0, config)).toBe(1000);
      expect(calculateDelay(1, config)).toBe(3000);
      expect(calculateDelay(2, config)).toBe(5000);
    });

    it('should calculate constant delay', () => {
      const config = {
        initialDelay: 1000,
        backoffStrategy: 'constant' as const,
        jitter: false,
      };

      expect(calculateDelay(0, config)).toBe(1000);
      expect(calculateDelay(1, config)).toBe(1000);
      expect(calculateDelay(5, config)).toBe(1000);
    });

    it('should respect maxDelay', () => {
      const config = {
        initialDelay: 1000,
        maxDelay: 5000,
        backoffStrategy: 'exponential' as const,
        backoffMultiplier: 2,
        jitter: false,
      };

      expect(calculateDelay(10, config)).toBe(5000);
    });

    it('should add jitter when enabled', () => {
      const config = {
        initialDelay: 1000,
        backoffStrategy: 'constant' as const,
        jitter: true,
        maxJitter: 500,
      };

      const delay = calculateDelay(0, config);
      expect(delay).toBeGreaterThanOrEqual(1000);
      expect(delay).toBeLessThanOrEqual(1500);
    });
  });

  describe('sleep', () => {
    it('should sleep for specified duration', async () => {
      const start = Date.now();
      await sleep(100);
      const elapsed = Date.now() - start;
      expect(elapsed).toBeGreaterThanOrEqual(95);
      expect(elapsed).toBeLessThan(200);
    });
  });

  describe('withRetry', () => {
    it('should succeed on first attempt', async () => {
      const operation = jest.fn().mockResolvedValue('success');

      const result = await withRetry(operation, { maxRetries: 3 });

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should retry on retryable error and succeed', async () => {
      const operation = jest
        .fn()
        .mockRejectedValueOnce(new Error('timeout'))
        .mockRejectedValueOnce(new Error('timeout'))
        .mockResolvedValue('success');

      const result = await withRetry(operation, {
        maxRetries: 3,
        initialDelay: 10,
        jitter: false,
      });

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should throw after max retries exceeded', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('timeout'));

      await expect(
        withRetry(operation, {
          maxRetries: 2,
          initialDelay: 10,
          jitter: false,
        })
      ).rejects.toThrow('timeout');

      expect(operation).toHaveBeenCalledTimes(3); // initial + 2 retries
    });

    it('should not retry non-retryable errors', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Invalid input'));

      await expect(
        withRetry(operation, { maxRetries: 3, initialDelay: 10 })
      ).rejects.toThrow('Invalid input');

      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should call onRetry callback', async () => {
      const onRetry = jest.fn();
      const operation = jest
        .fn()
        .mockRejectedValueOnce(new Error('timeout'))
        .mockResolvedValue('success');

      await withRetry(operation, {
        maxRetries: 3,
        initialDelay: 10,
        jitter: false,
        onRetry,
      });

      expect(onRetry).toHaveBeenCalledTimes(1);
      expect(onRetry).toHaveBeenCalledWith(expect.any(Error), 1, 10);
    });
  });

  describe('withTimeout', () => {
    it('should resolve if operation completes before timeout', async () => {
      const operation = new Promise((resolve) =>
        setTimeout(() => resolve('success'), 50)
      );

      const result = await withTimeout(operation, 200);
      expect(result).toBe('success');
    });

    it('should reject if operation times out', async () => {
      const operation = new Promise((resolve) =>
        setTimeout(() => resolve('success'), 500)
      );

      await expect(withTimeout(operation, 50)).rejects.toThrow(
        'Operation timed out after 50ms'
      );
    });
  });

  describe('createCircuitBreaker', () => {
    it('should allow operations when circuit is closed', async () => {
      const operation = jest.fn().mockResolvedValue('success');
      const breaker = createCircuitBreaker(operation);

      const result = await breaker.execute();
      expect(result).toBe('success');
      expect(breaker.getState().isOpen).toBe(false);
    });

    it('should open circuit after failure threshold', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('fail'));
      const onOpen = jest.fn();
      const breaker = createCircuitBreaker(operation, {
        failureThreshold: 3,
        onOpen,
      });

      // Fail 3 times
      for (let i = 0; i < 3; i++) {
        try {
          await breaker.execute();
        } catch {
          // expected
        }
      }

      expect(breaker.getState().isOpen).toBe(true);
      expect(breaker.getState().failures).toBe(3);
      expect(onOpen).toHaveBeenCalled();
    });

    it('should reject when circuit is open', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('fail'));
      const breaker = createCircuitBreaker(operation, {
        failureThreshold: 1,
        resetTimeout: 10000,
      });

      // Open the circuit
      try {
        await breaker.execute();
      } catch {
        // expected
      }

      // Should reject immediately
      await expect(breaker.execute()).rejects.toThrow('Circuit breaker is open');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should reset on successful operation', async () => {
      let callCount = 0;
      const operation = jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount < 3) {
          return Promise.reject(new Error('fail'));
        }
        return Promise.resolve('success');
      });

      const onClose = jest.fn();
      const breaker = createCircuitBreaker(operation, {
        failureThreshold: 5,
        onClose,
      });

      // Fail twice
      try {
        await breaker.execute();
      } catch {
        // expected
      }
      try {
        await breaker.execute();
      } catch {
        // expected
      }

      expect(breaker.getState().failures).toBe(2);

      // Succeed
      await breaker.execute();

      expect(breaker.getState().failures).toBe(0);
      expect(onClose).toHaveBeenCalled();
    });

    it('should reset state manually', () => {
      const operation = jest.fn().mockRejectedValue(new Error('fail'));
      const breaker = createCircuitBreaker(operation);

      breaker.reset();

      const state = breaker.getState();
      expect(state.failures).toBe(0);
      expect(state.isOpen).toBe(false);
    });
  });

  describe('default configurations', () => {
    it('should have valid DEFAULT_RETRY_CONFIG', () => {
      expect(DEFAULT_RETRY_CONFIG.maxRetries).toBe(3);
      expect(DEFAULT_RETRY_CONFIG.initialDelay).toBe(1000);
      expect(DEFAULT_RETRY_CONFIG.backoffStrategy).toBe('exponential');
    });

    it('should have valid NETWORK_RETRY_CONFIG', () => {
      expect(NETWORK_RETRY_CONFIG.maxRetries).toBe(5);
      expect(NETWORK_RETRY_CONFIG.retryableErrors).toContain('connection refused');
    });

    it('should have valid AGENT_RETRY_CONFIG', () => {
      expect(AGENT_RETRY_CONFIG.maxRetries).toBe(2);
      expect(AGENT_RETRY_CONFIG.maxDelay).toBe(60000);
      expect(AGENT_RETRY_CONFIG.retryableErrors).toContain('overloaded');
    });
  });
});
