/**
 * Tool Cache - Unit Tests
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { ToolCache } from './tool-cache';

describe('ToolCache', () => {
  let cache: ToolCache;

  beforeEach(() => {
    cache = new ToolCache();
  });

  afterEach(() => {
    cache.clear();
  });

  describe('Basic Operations', () => {
    it('should cache a tool result', () => {
      const toolName = 'test_tool';
      const args = { query: 'test' };
      const result = { success: true, data: 'test data' };

      cache.set(toolName, args, result);

      const cached = cache.get(toolName, args);
      expect(cached).toEqual(result);
    });

    it('should return null for non-existent cache entry', () => {
      const cached = cache.get('nonexistent', { query: 'test' });
      expect(cached).toBeNull();
    });

    it('should clear all cache entries', () => {
      cache.set('tool1', { query: 'test1' }, { result: 'data1' });
      cache.set('tool2', { query: 'test2' }, { result: 'data2' });

      cache.clear();

      expect(cache.get('tool1', { query: 'test1' })).toBeNull();
      expect(cache.get('tool2', { query: 'test2' })).toBeNull();
    });

    it('should invalidate cache for a specific tool', () => {
      cache.set('tool1', { query: 'test1' }, { result: 'data1' });
      cache.set('tool2', { query: 'test2' }, { result: 'data2' });

      cache.invalidate('tool1');

      expect(cache.get('tool1', { query: 'test1' })).toBeNull();
      expect(cache.get('tool2', { query: 'test2' })).toEqual({ result: 'data2' });
    });
  });

  describe('TTL (Time To Live)', () => {
    it('should expire cache entries after TTL', async () => {
      const cacheWithShortTTL = new ToolCache({
        maxEntries: 100,
        ttl: 100, // 100ms
        enabled: true,
      });

      const toolName = 'test_tool';
      const args = { query: 'test' };
      const result = { success: true, data: 'test data' };

      cacheWithShortTTL.set(toolName, args, result);

      // Should be available immediately
      expect(cacheWithShortTTL.get(toolName, args)).toEqual(result);

      // Wait for TTL to expire
      await new Promise(resolve => setTimeout(resolve, 150));

      // Should be expired
      expect(cacheWithShortTTL.get(toolName, args)).toBeNull();
    });

    it('should not expire entries when TTL is 0', async () => {
      const cacheWithNoTTL = new ToolCache({
        maxEntries: 100,
        ttl: 0, // No expiration
        enabled: true,
      });

      const toolName = 'test_tool';
      const args = { query: 'test' };
      const result = { success: true, data: 'test data' };

      cacheWithNoTTL.set(toolName, args, result);

      // Wait longer than would expire with a TTL
      await new Promise(resolve => setTimeout(resolve, 150));

      // Should still be available
      expect(cacheWithNoTTL.get(toolName, args)).toEqual(result);
    });
  });

  describe('LRU Eviction', () => {
    it('should evict least recently used entries when cache is full', () => {
      const smallCache = new ToolCache({
        maxEntries: 2,
        ttl: 0,
        enabled: true,
      });

      smallCache.set('tool1', { query: 'test1' }, { result: 'data1' });
      smallCache.set('tool2', { query: 'test2' }, { result: 'data2' });

      // Access tool1 to make it more recently used
      smallCache.get('tool1', { query: 'test1' });

      // Add a third entry - should evict tool2
      smallCache.set('tool3', { query: 'test3' }, { result: 'data3' });

      expect(smallCache.get('tool1', { query: 'test1' })).toEqual({ result: 'data1' });
      expect(smallCache.get('tool2', { query: 'test2' })).toBeNull();
      expect(smallCache.get('tool3', { query: 'test3' })).toEqual({ result: 'data3' });
    });

    it('should update access time on get', () => {
      const cache = new ToolCache({
        maxEntries: 2,
        ttl: 0,
        enabled: true,
      });

      cache.set('tool1', { query: 'test1' }, { result: 'data1' });
      cache.set('tool2', { query: 'test2' }, { result: 'data2' });

      const stats1 = cache.getStats();
      expect(stats1.totalHits).toBe(0);

      cache.get('tool1', { query: 'test1' });

      const stats2 = cache.getStats();
      expect(stats2.totalHits).toBe(1);
    });
  });

  describe('Cache Statistics', () => {
    it('should track cache statistics correctly', () => {
      cache.set('tool1', { query: 'test1' }, { result: 'data1' });
      cache.set('tool2', { query: 'test2' }, { result: 'data2' });

      // Create a cache hit
      cache.get('tool1', { query: 'test1' });
      // Create a cache miss
      cache.get('nonexistent', { query: 'test' });

      const stats = cache.getStats();

      expect(stats.size).toBe(2);
      expect(stats.maxEntries).toBe(100);
      expect(stats.totalHits).toBe(1);
      expect(stats.totalMisses).toBe(1);
      expect(stats.hitRate).toBe(0.5);
    });

    it('should calculate hit rate correctly', () => {
      cache.set('tool1', { query: 'test1' }, { result: 'data1' });

      // 3 hits, 1 miss
      cache.get('tool1', { query: 'test1' });
      cache.get('tool1', { query: 'test1' });
      cache.get('tool1', { query: 'test1' });
      cache.get('nonexistent', { query: 'test' });

      const stats = cache.getStats();
      expect(stats.hitRate).toBe(0.75);
    });
  });

  describe('Cache Key Generation', () => {
    it('should generate consistent cache keys for same arguments', () => {
      const args1 = { query: 'test', limit: 10 };
      const args2 = { limit: 10, query: 'test' }; // Different order

      cache.set('tool', args1, { result: 'data' });
      const cached = cache.get('tool', args2);

      expect(cached).toEqual({ result: 'data' });
    });

    it('should generate different cache keys for different arguments', () => {
      cache.set('tool', { query: 'test1' }, { result: 'data1' });
      cache.set('tool', { query: 'test2' }, { result: 'data2' });

      const cached1 = cache.get('tool', { query: 'test1' });
      const cached2 = cache.get('tool', { query: 'test2' });

      expect(cached1).toEqual({ result: 'data1' });
      expect(cached2).toEqual({ result: 'data2' });
    });

    it('should handle complex nested arguments', () => {
      const complexArgs = {
        query: 'test',
        filters: [
          { type: 'date', value: '2024-01-01' },
          { type: 'text', value: 'example' },
        ],
        options: { caseSensitive: false },
      };

      cache.set('tool', complexArgs, { result: 'data' });
      const cached = cache.get('tool', complexArgs);

      expect(cached).toEqual({ result: 'data' });
    });
  });

  describe('Configuration', () => {
    it('should respect disabled cache configuration', () => {
      const disabledCache = new ToolCache({
        enabled: false,
      });

      disabledCache.set('tool', { query: 'test' }, { result: 'data' });

      expect(disabledCache.get('tool', { 'query': 'test' })).toBeNull();
    });

    it('should update configuration dynamically', () => {
      cache.set('tool', { query: 'test' }, { result: 'data' });

      expect(cache.get('tool', { query: 'test' })).toEqual({ result: 'data' });

      // Disable cache
      cache.updateConfig({ enabled: false });

      expect(cache.get('tool', { query: 'test' })).toBeNull();

      // Re-enable
      cache.updateConfig({ enabled: true });

      // Cache should be cleared when disabled
      expect(cache.get('tool', { query: 'test' })).toBeNull();
    });

    it('should update maxEntries configuration', () => {
      const cache = new ToolCache({
        maxEntries: 5,
      });

      // Fill cache to max
      for (let i = 0; i < 5; i++) {
        cache.set(`tool${i}`, { query: `test${i}` }, { result: `data${i}` });
      }

      expect(cache.getStats().size).toBe(5);

      // Reduce max entries
      cache.updateConfig({ maxEntries: 2 });

      // Should have evicted some entries
      expect(cache.getStats().size).toBeLessThanOrEqual(2);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty arguments', () => {
      cache.set('tool', {}, { result: 'data' });
      const cached = cache.get('tool', {});

      expect(cached).toEqual({ result: 'data' });
    });

    it('should handle null and undefined values in arguments', () => {
      cache.set('tool', { value: null, optional: undefined }, { result: 'data' });
      const cached = cache.get('tool', { value: null, optional: undefined });

      expect(cached).toEqual({ result: 'data' });
    });

    it('should handle large result objects', () => {
      const largeResult = {
        data: 'x'.repeat(10000),
        nested: {
          level1: {
            level2: {
              level3: 'deeply nested data',
            },
          },
        },
        array: Array(100).fill({ id: 'item' }),
      };

      cache.set('tool', { query: 'test' }, largeResult);
      const cached = cache.get('tool', { query: 'test' });

      expect(cached).toEqual(largeResult);
    });
  });
});
