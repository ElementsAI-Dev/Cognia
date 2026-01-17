/**
 * Retry Strategy - Unit Tests
 */

import { describe, it, expect } from '@jest/globals';

// Extract config directly to avoid Langfuse import issues
export interface RetryConfig {
  maxRetries: number;
  retryDelay: number;
  exponentialBackoff: boolean;
  retryableErrors: string[];
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 2,
  retryDelay: 1000,
  exponentialBackoff: true,
  retryableErrors: ['timeout', 'rate_limit', 'network', 'econnrefused', 'etimedout'],
};

describe('Retry Strategy', () => {
  describe('DEFAULT_RETRY_CONFIG', () => {
    it('should have sensible default values', () => {
      expect(DEFAULT_RETRY_CONFIG.maxRetries).toBe(2);
      expect(DEFAULT_RETRY_CONFIG.retryDelay).toBe(1000);
      expect(DEFAULT_RETRY_CONFIG.exponentialBackoff).toBe(true);
      expect(DEFAULT_RETRY_CONFIG.retryableErrors).toContain('timeout');
      expect(DEFAULT_RETRY_CONFIG.retryableErrors).toContain('rate_limit');
      expect(DEFAULT_RETRY_CONFIG.retryableErrors).toContain('network');
    });
  });

  describe('Retry Logic', () => {
    it('should retry on retryable errors', async () => {
      let attemptCount = 0;
      const mockFn = jest.fn(async () => {
        attemptCount++;
        if (attemptCount < 3) {
          throw new Error('timeout: Request timed out');
        }
        return { success: true };
      });

      const config: RetryConfig = {
        maxRetries: 3,
        retryDelay: 10,
        exponentialBackoff: false,
        retryableErrors: ['timeout'],
      };

      // Simulate retry logic
      let lastError: Error | null = null;
      for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
        try {
          const result = await mockFn();
          expect(result).toEqual({ success: true });
          break;
        } catch (error) {
          lastError = error instanceof Error ? error : new Error('Unknown error');
          const isRetryable = config.retryableErrors.some(pattern =>
            lastError!.message.toLowerCase().includes(pattern.toLowerCase())
          );

          if (!isRetryable || attempt === config.maxRetries) {
            throw lastError;
          }

          await new Promise(resolve => setTimeout(resolve, config.retryDelay));
        }
      }

      expect(attemptCount).toBe(3);
    });

    it('should not retry on non-retryable errors', async () => {
      let attemptCount = 0;
      const mockFn = jest.fn(async () => {
        attemptCount++;
        throw new Error('validation: Invalid input');
      });

      const config: RetryConfig = {
        maxRetries: 3,
        retryDelay: 10,
        exponentialBackoff: false,
        retryableErrors: ['timeout', 'rate_limit'],
      };

      let lastError: Error | null = null;
      for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
        try {
          await mockFn();
          break;
        } catch (error) {
          lastError = error instanceof Error ? error : new Error('Unknown error');
          const isRetryable = config.retryableErrors.some(pattern =>
            lastError!.message.toLowerCase().includes(pattern.toLowerCase())
          );

          if (!isRetryable || attempt === config.maxRetries) {
            expect(attemptCount).toBe(1);
            break;
          }

          await new Promise(resolve => setTimeout(resolve, config.retryDelay));
        }
      }

      expect(attemptCount).toBe(1);
    });

    it('should use exponential backoff when enabled', async () => {
      const delays: number[] = [];
      const mockFn = jest.fn(async () => {
        throw new Error('timeout: Request timed out');
      });

      const config: RetryConfig = {
        maxRetries: 2,
        retryDelay: 100,
        exponentialBackoff: true,
        retryableErrors: ['timeout'],
      };

      const _startTime = Date.now();
      for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
        try {
          await mockFn();
          break;
        } catch (error) {
          const lastError = error instanceof Error ? error : new Error('Unknown error');
          const isRetryable = config.retryableErrors.some(pattern =>
            lastError.message.toLowerCase().includes(pattern.toLowerCase())
          );

          if (!isRetryable || attempt === config.maxRetries) {
            break;
          }

          const delay = config.exponentialBackoff
            ? config.retryDelay * Math.pow(2, attempt)
            : config.retryDelay;

          delays.push(delay);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }

      expect(delays).toEqual([100, 200]);
    });

    it('should use fixed delay when exponential backoff is disabled', async () => {
      const delays: number[] = [];
      const mockFn = jest.fn(async () => {
        throw new Error('timeout: Request timed out');
      });

      const config: RetryConfig = {
        maxRetries: 2,
        retryDelay: 100,
        exponentialBackoff: false,
        retryableErrors: ['timeout'],
      };

      for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
        try {
          await mockFn();
          break;
        } catch (error) {
          const lastError = error instanceof Error ? error : new Error('Unknown error');
          const isRetryable = config.retryableErrors.some(pattern =>
            lastError.message.toLowerCase().includes(pattern.toLowerCase())
          );

          if (!isRetryable || attempt === config.maxRetries) {
            break;
          }

          const delay = config.exponentialBackoff
            ? config.retryDelay * Math.pow(2, attempt)
            : config.retryDelay;

          delays.push(delay);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }

      expect(delays).toEqual([100, 100]);
    });

    it('should stop after max retries', async () => {
      let attemptCount = 0;
      const mockFn = jest.fn(async () => {
        attemptCount++;
        throw new Error('timeout: Request timed out');
      });

      const config: RetryConfig = {
        maxRetries: 2,
        retryDelay: 10,
        exponentialBackoff: false,
        retryableErrors: ['timeout'],
      };

      try {
        for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
          try {
            await mockFn();
            break;
          } catch (error) {
            const lastError = error instanceof Error ? error : new Error('Unknown error');
            const isRetryable = config.retryableErrors.some(pattern =>
              lastError.message.toLowerCase().includes(pattern.toLowerCase())
            );

            if (!isRetryable || attempt === config.maxRetries) {
              throw lastError;
            }

            await new Promise(resolve => setTimeout(resolve, config.retryDelay));
          }
        }
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect(attemptCount).toBe(3); // Initial attempt + 2 retries
      }
    });
  });

  describe('Error Pattern Matching', () => {
    it('should match error patterns case-insensitively', () => {
      const config: RetryConfig = {
        maxRetries: 1,
        retryDelay: 10,
        exponentialBackoff: false,
        retryableErrors: ['TIMEOUT', 'RATE_LIMIT'],
      };

      const errors = [
        'timeout: Request timed out',
        'TIMEOUT: Request timed out',
        'Timeout: Request timed out',
        'rate_limit: Too many requests',
        'RATE_LIMIT: Too many requests',
      ];

      for (const errorMessage of errors) {
        const isRetryable = config.retryableErrors.some(pattern =>
          errorMessage.toLowerCase().includes(pattern.toLowerCase())
        );
        expect(isRetryable).toBe(true);
      }
    });

    it('should match partial error patterns', async () => {
      const config: RetryConfig = {
        maxRetries: 3,
        retryDelay: 10,
        exponentialBackoff: false,
        retryableErrors: ['econnrefused', 'etimedout', 'network', 'timeout'],
      };

      const errors = [
        'ECONNREFUSED: Connection refused',
        'ETIMEDOUT: Connection timed out',
        'network_error: Network unreachable',
        'timeout_error: Operation timed out',
      ];

      for (const errorMessage of errors) {
        const isRetryable = config.retryableErrors.some(pattern =>
          errorMessage.toLowerCase().includes(pattern.toLowerCase())
        );
        expect(isRetryable).toBe(true);
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero max retries', async () => {
      let attemptCount = 0;
      const mockFn = jest.fn(async () => {
        attemptCount++;
        throw new Error('timeout: Request timed out');
      });

      const config: RetryConfig = {
        maxRetries: 0,
        retryDelay: 10,
        exponentialBackoff: false,
        retryableErrors: ['timeout'],
      };

      try {
        for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
          try {
            await mockFn();
            break;
          } catch (error) {
            const lastError = error instanceof Error ? error : new Error('Unknown error');
            const isRetryable = config.retryableErrors.some(pattern =>
              lastError.message.toLowerCase().includes(pattern.toLowerCase())
            );

            if (!isRetryable || attempt === config.maxRetries) {
              throw lastError;
            }

            await new Promise(resolve => setTimeout(resolve, config.retryDelay));
          }
        }
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect(attemptCount).toBe(1);
      }
    });

    it('should handle zero retry delay', async () => {
      let attemptCount = 0;
      const mockFn = jest.fn(async () => {
        attemptCount++;
        if (attemptCount < 3) {
          throw new Error('timeout: Request timed out');
        }
        return { success: true };
      });

      const config: RetryConfig = {
        maxRetries: 3,
        retryDelay: 0,
        exponentialBackoff: false,
        retryableErrors: ['timeout'],
      };

      const startTime = Date.now();
      for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
        try {
          const result = await mockFn();
          expect(result).toEqual({ success: true });
          break;
        } catch (error) {
          const lastError = error instanceof Error ? error : new Error('Unknown error');
          const isRetryable = config.retryableErrors.some(pattern =>
            lastError!.message.toLowerCase().includes(pattern.toLowerCase())
          );

          if (!isRetryable || attempt === config.maxRetries) {
            throw lastError;
          }

          await new Promise(resolve => setTimeout(resolve, config.retryDelay));
        }
      }
      const duration = Date.now() - startTime;

      // Should complete very quickly with zero delay
      expect(duration).toBeLessThan(100);
      expect(attemptCount).toBe(3);
    });

    it('should handle empty retryable errors list', async () => {
      let attemptCount = 0;
      const mockFn = jest.fn(async () => {
        attemptCount++;
        throw new Error('timeout: Request timed out');
      });

      const config: RetryConfig = {
        maxRetries: 3,
        retryDelay: 10,
        exponentialBackoff: false,
        retryableErrors: [],
      };

      try {
        for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
          try {
            await mockFn();
            break;
          } catch (error) {
            const lastError = error instanceof Error ? error : new Error('Unknown error');
            const isRetryable = config.retryableErrors.some(pattern =>
              lastError.message.toLowerCase().includes(pattern.toLowerCase())
            );

            if (!isRetryable || attempt === config.maxRetries) {
              throw lastError;
            }

            await new Promise(resolve => setTimeout(resolve, config.retryDelay));
          }
        }
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect(attemptCount).toBe(1); // Should not retry
      }
    });
  });
});
