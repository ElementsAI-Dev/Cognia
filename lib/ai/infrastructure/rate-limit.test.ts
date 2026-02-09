/**
 * Rate Limiting Tests
 */

import {
  createFixedWindowRateLimiter,
  createSlidingWindowRateLimiter,
  createTokenBucketRateLimiter,
  createCompositeRateLimiter,
  createProviderRateLimiter,
  withRateLimit,
  RateLimitError,
  PROVIDER_RATE_LIMITS,
  recordRetryAfter,
  isProviderRetryBlocked,
  parseRetryAfterHeader,
} from './rate-limit';

describe('Rate Limiting', () => {
  describe('Fixed Window Rate Limiter', () => {
    it('should allow requests within limit', async () => {
      const limiter = createFixedWindowRateLimiter({ limit: 3, windowSeconds: 60 });
      
      const result1 = await limiter.limit('user1');
      const result2 = await limiter.limit('user1');
      const result3 = await limiter.limit('user1');
      
      expect(result1.success).toBe(true);
      expect(result1.remaining).toBe(2);
      expect(result2.success).toBe(true);
      expect(result2.remaining).toBe(1);
      expect(result3.success).toBe(true);
      expect(result3.remaining).toBe(0);
    });

    it('should block requests over limit', async () => {
      const limiter = createFixedWindowRateLimiter({ limit: 2, windowSeconds: 60 });
      
      await limiter.limit('user1');
      await limiter.limit('user1');
      const result = await limiter.limit('user1');
      
      expect(result.success).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.retryAfter).toBeDefined();
    });

    it('should track different identifiers separately', async () => {
      const limiter = createFixedWindowRateLimiter({ limit: 1, windowSeconds: 60 });
      
      const result1 = await limiter.limit('user1');
      const result2 = await limiter.limit('user2');
      
      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
    });

    it('should reset after calling reset', async () => {
      const limiter = createFixedWindowRateLimiter({ limit: 1, windowSeconds: 60 });
      
      await limiter.limit('user1');
      await limiter.reset('user1');
      const result = await limiter.limit('user1');
      
      expect(result.success).toBe(true);
    });

    it('should return correct status', async () => {
      const limiter = createFixedWindowRateLimiter({ limit: 3, windowSeconds: 60 });
      
      await limiter.limit('user1');
      const status = await limiter.getStatus('user1');
      
      expect(status.success).toBe(true);
      expect(status.remaining).toBe(2);
      expect(status.limit).toBe(3);
    });
  });

  describe('Sliding Window Rate Limiter', () => {
    it('should allow requests within limit', async () => {
      const limiter = createSlidingWindowRateLimiter({ limit: 3, windowSeconds: 60 });
      
      const result1 = await limiter.limit('user1');
      const result2 = await limiter.limit('user1');
      
      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
    });

    it('should block requests over limit', async () => {
      const limiter = createSlidingWindowRateLimiter({ limit: 2, windowSeconds: 60 });
      
      await limiter.limit('user1');
      await limiter.limit('user1');
      const result = await limiter.limit('user1');
      
      expect(result.success).toBe(false);
    });
  });

  describe('Token Bucket Rate Limiter', () => {
    it('should allow burst requests', async () => {
      const limiter = createTokenBucketRateLimiter({ maxTokens: 5, refillRate: 1 });
      
      // Should allow 5 rapid requests
      const results = await Promise.all([
        limiter.limit('user1'),
        limiter.limit('user1'),
        limiter.limit('user1'),
        limiter.limit('user1'),
        limiter.limit('user1'),
      ]);
      
      expect(results.every(r => r.success)).toBe(true);
    });

    it('should block after bucket is empty', async () => {
      const limiter = createTokenBucketRateLimiter({ maxTokens: 2, refillRate: 0.1 });
      
      await limiter.limit('user1');
      await limiter.limit('user1');
      const result = await limiter.limit('user1');
      
      expect(result.success).toBe(false);
    });
  });

  describe('Composite Rate Limiter', () => {
    it('should combine multiple limiters', async () => {
      const limiter1 = createFixedWindowRateLimiter({ limit: 10, windowSeconds: 60 });
      const limiter2 = createFixedWindowRateLimiter({ limit: 2, windowSeconds: 60 });
      const composite = createCompositeRateLimiter([limiter1, limiter2]);
      
      await composite.limit('user1');
      await composite.limit('user1');
      const result = await composite.limit('user1');
      
      // Should be blocked by limiter2 (stricter limit)
      expect(result.success).toBe(false);
    });
  });

  describe('Provider Rate Limiter', () => {
    it('should use provider-specific limits', () => {
      expect(PROVIDER_RATE_LIMITS.openai).toBeDefined();
      expect(PROVIDER_RATE_LIMITS.anthropic).toBeDefined();
      expect(PROVIDER_RATE_LIMITS.groq.limit).toBe(30);
    });

    it('should create limiter for provider', async () => {
      const limiter = createProviderRateLimiter('openai');
      const result = await limiter.limit('user1');
      
      expect(result.success).toBe(true);
      expect(result.limit).toBe(PROVIDER_RATE_LIMITS.openai.limit);
    });
  });

  describe('withRateLimit', () => {
    it('should execute operation when under limit', async () => {
      const limiter = createFixedWindowRateLimiter({ limit: 5, windowSeconds: 60 });
      
      const result = await withRateLimit(limiter, 'user1', async () => 'success');
      
      expect(result).toBe('success');
    });

    it('should throw RateLimitError when over limit', async () => {
      const limiter = createFixedWindowRateLimiter({ limit: 1, windowSeconds: 60 });
      
      await withRateLimit(limiter, 'user1', async () => 'first');
      
      await expect(
        withRateLimit(limiter, 'user1', async () => 'second')
      ).rejects.toThrow(RateLimitError);
    });

    it('should include retry info in RateLimitError', async () => {
      const limiter = createFixedWindowRateLimiter({ limit: 1, windowSeconds: 60 });
      
      await limiter.limit('user1');
      
      try {
        await withRateLimit(limiter, 'user1', async () => 'test');
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(RateLimitError);
        expect((error as RateLimitError).result.retryAfter).toBeDefined();
      }
    });
  });

  describe('Retry-After support', () => {
    describe('recordRetryAfter', () => {
      it('should block provider for specified duration', () => {
        recordRetryAfter('retry-test', 30);
        const status = isProviderRetryBlocked('retry-test');

        expect(status.blocked).toBe(true);
        expect(status.retryAfterSeconds).toBeLessThanOrEqual(30);
        expect(status.retryAfterSeconds).toBeGreaterThan(0);
      });

      it('should unblock provider after duration expires', async () => {
        recordRetryAfter('expire-test', 0.1); // 100ms
        
        expect(isProviderRetryBlocked('expire-test').blocked).toBe(true);
        
        await new Promise(resolve => setTimeout(resolve, 150));
        
        expect(isProviderRetryBlocked('expire-test').blocked).toBe(false);
      });
    });

    describe('isProviderRetryBlocked', () => {
      it('should return not blocked for unknown providers', () => {
        const status = isProviderRetryBlocked('unknown-provider');
        expect(status.blocked).toBe(false);
        expect(status.retryAfterSeconds).toBeUndefined();
      });
    });

    describe('parseRetryAfterHeader', () => {
      it('should parse numeric seconds', () => {
        expect(parseRetryAfterHeader('120')).toBe(120);
        expect(parseRetryAfterHeader('0')).toBe(0);
        expect(parseRetryAfterHeader('30')).toBe(30);
      });

      it('should parse HTTP-date format', () => {
        const futureDate = new Date(Date.now() + 60000);
        const result = parseRetryAfterHeader(futureDate.toUTCString());
        
        expect(result).not.toBeNull();
        expect(result!).toBeGreaterThan(0);
        expect(result!).toBeLessThanOrEqual(61);
      });

      it('should return null for invalid values', () => {
        expect(parseRetryAfterHeader('invalid')).toBeNull();
        expect(parseRetryAfterHeader('')).toBeNull();
      });

      it('should return 0 for past dates', () => {
        const pastDate = new Date(Date.now() - 60000);
        const result = parseRetryAfterHeader(pastDate.toUTCString());
        
        expect(result).toBe(0);
      });
    });
  });
});
