/**
 * Tests for Tool Execution Middleware
 */

import {
  withMiddleware,
  applyMiddlewareToTools,
  resetRateLimit,
  getRateLimitStatus,
  getToolCacheStats,
  clearToolCache,
  invalidateToolCache,
} from './tool-middleware';
import { globalToolCache } from './tool-cache';

// Reset state before each test
beforeEach(() => {
  clearToolCache();
  resetRateLimit();
});

describe('withMiddleware - caching', () => {
  it('caches results for cacheable tools', async () => {
    let callCount = 0;
    const mockFn = async (args: { expr: string }) => {
      callCount++;
      return { success: true, result: args.expr };
    };

    const wrapped = withMiddleware('calculator', mockFn, { cacheable: true });

    const result1 = await wrapped({ expr: '2+2' });
    const result2 = await wrapped({ expr: '2+2' });

    expect(result1).toEqual({ success: true, result: '2+2' });
    expect(result2).toEqual({ success: true, result: '2+2' });
    expect(callCount).toBe(1); // Second call served from cache
  });

  it('does not cache non-cacheable tools', async () => {
    let callCount = 0;
    const mockFn = async (args: { cmd: string }) => {
      callCount++;
      return { success: true, output: args.cmd };
    };

    const wrapped = withMiddleware('shell_execute', mockFn, { cacheable: false });

    await wrapped({ cmd: 'ls' });
    await wrapped({ cmd: 'ls' });

    expect(callCount).toBe(2);
  });

  it('does not cache failed results', async () => {
    let callCount = 0;
    const mockFn = async () => {
      callCount++;
      return { success: false, error: 'fail' };
    };

    const wrapped = withMiddleware('calculator', mockFn, { cacheable: true });

    await wrapped({});
    await wrapped({});

    expect(callCount).toBe(2);
  });

  it('uses different cache keys for different args', async () => {
    let callCount = 0;
    const mockFn = async (args: { expr: string }) => {
      callCount++;
      return { success: true, result: args.expr };
    };

    const wrapped = withMiddleware('calculator', mockFn, { cacheable: true });

    await wrapped({ expr: '2+2' });
    await wrapped({ expr: '3+3' });

    expect(callCount).toBe(2);
  });
});

describe('withMiddleware - retry', () => {
  it('retries on transient errors', async () => {
    let callCount = 0;
    const mockFn = async () => {
      callCount++;
      if (callCount < 3) {
        throw new Error('503 Service Unavailable');
      }
      return { success: true, data: 'ok' };
    };

    const wrapped = withMiddleware('web_search', mockFn, {
      retriable: true,
      retryConfig: { maxRetries: 3, initialDelayMs: 10, maxDelayMs: 50, backoffMultiplier: 2, jitter: false },
    });

    const result = await wrapped({});
    expect(result).toEqual({ success: true, data: 'ok' });
    expect(callCount).toBe(3);
  });

  it('does not retry non-retriable errors', async () => {
    let callCount = 0;
    const mockFn = async () => {
      callCount++;
      throw new Error('Invalid input');
    };

    const wrapped = withMiddleware('web_search', mockFn, {
      retriable: true,
      retryConfig: { maxRetries: 3, initialDelayMs: 10, maxDelayMs: 50, backoffMultiplier: 2, jitter: false },
    });

    await expect(wrapped({})).rejects.toThrow('Invalid input');
    expect(callCount).toBe(1);
  });

  it('exhausts retries and throws', async () => {
    let callCount = 0;
    const mockFn = async () => {
      callCount++;
      throw new Error('Network error: fetch failed');
    };

    const wrapped = withMiddleware('web_search', mockFn, {
      retriable: true,
      retryConfig: { maxRetries: 2, initialDelayMs: 10, maxDelayMs: 50, backoffMultiplier: 2, jitter: false },
    });

    await expect(wrapped({})).rejects.toThrow('fetch failed');
    expect(callCount).toBe(3); // 1 initial + 2 retries
  });

  it('retries on result-based failures', async () => {
    let callCount = 0;
    const mockFn = async () => {
      callCount++;
      if (callCount < 2) {
        return { success: false, error: '429 Too Many Requests' };
      }
      return { success: true, data: 'ok' };
    };

    const wrapped = withMiddleware('web_search', mockFn, {
      retriable: true,
      retryConfig: { maxRetries: 3, initialDelayMs: 10, maxDelayMs: 50, backoffMultiplier: 2, jitter: false },
    });

    const result = await wrapped({});
    expect(result).toEqual({ success: true, data: 'ok' });
    expect(callCount).toBe(2);
  });

  it('does not retry for non-retriable tools', async () => {
    let callCount = 0;
    const mockFn = async () => {
      callCount++;
      throw new Error('503 error');
    };

    const wrapped = withMiddleware('calculator', mockFn, { retriable: false });

    await expect(wrapped({})).rejects.toThrow('503 error');
    expect(callCount).toBe(1);
  });
});

describe('withMiddleware - rate limiting', () => {
  it('rate limits tools in the same group', async () => {
    const mockFn = async () => ({ success: true });

    const wrapped = withMiddleware('web_search', mockFn, {
      rateLimitGroup: 'test_group',
      rateLimitConfig: { maxCallsPerWindow: 3, windowMs: 60000 },
    });

    await wrapped({});
    await wrapped({});
    await wrapped({});
    const result = await wrapped({});

    // 4th call should be rate limited
    expect(result).toEqual(expect.objectContaining({
      success: false,
      error: expect.stringContaining('Rate limit'),
    }));
  });

  it('does not rate limit tools without a group', async () => {
    let callCount = 0;
    const mockFn = async (args: { i: number }) => {
      callCount++;
      return { success: true, i: args.i };
    };

    const wrapped = withMiddleware('calculator', mockFn, {
      rateLimitGroup: undefined,
      cacheable: false,
    });

    for (let i = 0; i < 50; i++) {
      await wrapped({ i });
    }

    expect(callCount).toBe(50);
  });
});

describe('withMiddleware - disabled features', () => {
  it('skips cache when disabled', async () => {
    let callCount = 0;
    const mockFn = async () => {
      callCount++;
      return { success: true };
    };

    const wrapped = withMiddleware('calculator', mockFn, { cacheable: true }, { enableCache: false });

    await wrapped({});
    await wrapped({});

    expect(callCount).toBe(2);
  });

  it('skips retry when disabled', async () => {
    let callCount = 0;
    const mockFn = async () => {
      callCount++;
      throw new Error('503 error');
    };

    const wrapped = withMiddleware('web_search', mockFn, { retriable: true }, { enableRetry: false });

    await expect(wrapped({})).rejects.toThrow('503 error');
    expect(callCount).toBe(1);
  });

  it('skips rate limit when disabled', async () => {
    let callCount = 0;
    const mockFn = async () => {
      callCount++;
      return { success: true };
    };

    const wrapped = withMiddleware('web_search', mockFn, {
      rateLimitGroup: 'test_strict',
      rateLimitConfig: { maxCallsPerWindow: 1, windowMs: 60000 },
    }, { enableRateLimit: false });

    await wrapped({});
    await wrapped({});

    expect(callCount).toBe(2);
  });
});

describe('applyMiddlewareToTools', () => {
  it('wraps all tools in a record', async () => {
    let calc_calls = 0;
    let search_calls = 0;

    const tools = {
      calculator: {
        name: 'calculator',
        execute: async () => { calc_calls++; return { success: true }; },
      },
      web_search: {
        name: 'web_search',
        execute: async () => { search_calls++; return { success: true }; },
      },
    };

    applyMiddlewareToTools(tools);

    // Execute calculator twice - should cache second call
    await tools.calculator.execute({});
    await tools.calculator.execute({});
    expect(calc_calls).toBe(1); // Cached

    // Execute web_search twice - not cacheable
    await tools.web_search.execute({ query: 'test' });
    await tools.web_search.execute({ query: 'test2' });
    expect(search_calls).toBe(2);
  });

  it('skips entries without execute function', () => {
    const tools = {
      notATool: { name: 'test', data: 'hello' },
    };

    // Should not throw
    expect(() => applyMiddlewareToTools(tools as Record<string, unknown>)).not.toThrow();
  });
});

describe('utility functions', () => {
  it('getToolCacheStats returns stats', () => {
    const stats = getToolCacheStats();
    expect(stats).toHaveProperty('size');
    expect(stats).toHaveProperty('totalHits');
    expect(stats).toHaveProperty('totalMisses');
    expect(stats).toHaveProperty('hitRate');
  });

  it('clearToolCache clears cache', async () => {
    globalToolCache.set('test', { a: 1 }, 'result');
    expect(globalToolCache.getStats().size).toBe(1);

    clearToolCache();
    expect(globalToolCache.getStats().size).toBe(0);
  });

  it('invalidateToolCache invalidates specific tool', async () => {
    globalToolCache.set('calculator', { expr: '1+1' }, 2);
    globalToolCache.set('file_read', { path: '/test' }, 'content');
    expect(globalToolCache.getStats().size).toBe(2);

    invalidateToolCache('calculator');
    expect(globalToolCache.getStats().size).toBe(1);
    expect(globalToolCache.get('calculator', { expr: '1+1' })).toBeNull();
    expect(globalToolCache.get('file_read', { path: '/test' })).toBe('content');
  });

  it('getRateLimitStatus returns status', async () => {
    const mockFn = async () => ({ success: true });
    const wrapped = withMiddleware('web_search', mockFn, {
      rateLimitGroup: 'status_test',
      rateLimitConfig: { maxCallsPerWindow: 10, windowMs: 60000 },
    });

    await wrapped({});

    const status = getRateLimitStatus();
    expect(status.status_test).toBeDefined();
    expect(status.status_test.used).toBe(1);
    expect(status.status_test.limit).toBe(10);
  });

  it('resetRateLimit resets specific group', async () => {
    const mockFn = async () => ({ success: true });
    const wrapped = withMiddleware('web_search', mockFn, {
      rateLimitGroup: 'reset_test',
      rateLimitConfig: { maxCallsPerWindow: 10, windowMs: 60000 },
    });

    await wrapped({});
    resetRateLimit('reset_test');

    const status = getRateLimitStatus();
    expect(status.reset_test).toBeUndefined();
  });

  it('resetRateLimit resets all groups', async () => {
    const mockFn = async () => ({ success: true });
    const w1 = withMiddleware('web_search', mockFn, {
      rateLimitGroup: 'g1',
      rateLimitConfig: { maxCallsPerWindow: 10, windowMs: 60000 },
    });
    const w2 = withMiddleware('web_scraper', mockFn, {
      rateLimitGroup: 'g2',
      rateLimitConfig: { maxCallsPerWindow: 10, windowMs: 60000 },
    });

    await w1({});
    await w2({});
    resetRateLimit();

    const status = getRateLimitStatus();
    expect(Object.keys(status)).toHaveLength(0);
  });
});
