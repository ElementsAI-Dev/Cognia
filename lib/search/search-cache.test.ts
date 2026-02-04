/**
 * Tests for Search Cache
 */

import {
  SearchCache,
  generateSearchCacheKey,
  getSearchCache,
  resetSearchCache,
} from './search-cache';
import type { SearchResponse } from '@/types/search';

// Mock logger
jest.mock('@/lib/logger', () => ({
  createLogger: jest.fn(() => ({
    trace: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    fatal: jest.fn(),
  })),
}));

describe('search-cache', () => {
  const mockResponse: SearchResponse = {
    provider: 'tavily',
    query: 'test query',
    results: [
      { title: 'Result 1', url: 'https://example.com/1', content: 'Content 1', score: 0.9 },
      { title: 'Result 2', url: 'https://example.com/2', content: 'Content 2', score: 0.8 },
    ],
    responseTime: 150,
    totalResults: 2,
  };

  describe('generateSearchCacheKey', () => {
    it('should generate consistent keys for same parameters', () => {
      const key1 = generateSearchCacheKey('test query', 'tavily', { maxResults: 10 });
      const key2 = generateSearchCacheKey('test query', 'tavily', { maxResults: 10 });
      expect(key1).toBe(key2);
    });

    it('should generate different keys for different queries', () => {
      const key1 = generateSearchCacheKey('query one', 'tavily');
      const key2 = generateSearchCacheKey('query two', 'tavily');
      expect(key1).not.toBe(key2);
    });

    it('should generate different keys for different providers', () => {
      const key1 = generateSearchCacheKey('test query', 'tavily');
      const key2 = generateSearchCacheKey('test query', 'brave');
      expect(key1).not.toBe(key2);
    });

    it('should generate different keys for different options', () => {
      const key1 = generateSearchCacheKey('test query', 'tavily', { maxResults: 5 });
      const key2 = generateSearchCacheKey('test query', 'tavily', { maxResults: 10 });
      expect(key1).not.toBe(key2);
    });

    it('should normalize query case', () => {
      const key1 = generateSearchCacheKey('Test Query', 'tavily');
      const key2 = generateSearchCacheKey('test query', 'tavily');
      expect(key1).toBe(key2);
    });

    it('should handle undefined provider', () => {
      const key = generateSearchCacheKey('test query');
      expect(key).toMatch(/^search:/);
    });
  });

  describe('SearchCache', () => {
    let cache: SearchCache;

    beforeEach(() => {
      cache = new SearchCache({ maxSize: 10, defaultTTL: 1000 });
    });

    describe('get/set', () => {
      it('should store and retrieve cached response', () => {
        cache.set('test query', mockResponse, 'tavily');
        const cached = cache.get('test query', 'tavily');

        expect(cached).toEqual(mockResponse);
      });

      it('should return null for non-existent key', () => {
        const cached = cache.get('non-existent query', 'tavily');
        expect(cached).toBeNull();
      });

      it('should handle options in key generation', () => {
        cache.set('test query', mockResponse, 'tavily', { maxResults: 5 });
        
        const withOptions = cache.get('test query', 'tavily', { maxResults: 5 });
        const withoutOptions = cache.get('test query', 'tavily');

        expect(withOptions).toEqual(mockResponse);
        expect(withoutOptions).toBeNull();
      });
    });

    describe('TTL expiration', () => {
      it('should return null for expired entries', async () => {
        const shortTTLCache = new SearchCache({ defaultTTL: 50 });
        shortTTLCache.set('test query', mockResponse, 'tavily');

        // Wait for entry to expire
        await new Promise((resolve) => setTimeout(resolve, 100));

        const cached = shortTTLCache.get('test query', 'tavily');
        expect(cached).toBeNull();
      });

      it('should use news TTL for news search type', () => {
        cache.set('news query', mockResponse, 'tavily', { searchType: 'news' });
        expect(cache.has('news query', 'tavily', { searchType: 'news' })).toBe(true);
      });
    });

    describe('LRU eviction', () => {
      it('should evict oldest entries when cache is full', () => {
        const smallCache = new SearchCache({ maxSize: 3 });

        smallCache.set('query 1', { ...mockResponse, query: 'query 1' }, 'tavily');
        smallCache.set('query 2', { ...mockResponse, query: 'query 2' }, 'tavily');
        smallCache.set('query 3', { ...mockResponse, query: 'query 3' }, 'tavily');
        smallCache.set('query 4', { ...mockResponse, query: 'query 4' }, 'tavily');

        // First entry should be evicted
        expect(smallCache.get('query 1', 'tavily')).toBeNull();
        // Later entries should still exist
        expect(smallCache.get('query 4', 'tavily')).not.toBeNull();
      });

      it('should move accessed entries to end (LRU)', () => {
        const smallCache = new SearchCache({ maxSize: 3 });

        smallCache.set('query 1', { ...mockResponse, query: 'query 1' }, 'tavily');
        smallCache.set('query 2', { ...mockResponse, query: 'query 2' }, 'tavily');
        smallCache.set('query 3', { ...mockResponse, query: 'query 3' }, 'tavily');

        // Access query 1, making it recently used
        smallCache.get('query 1', 'tavily');

        // Add new entry - query 2 should be evicted (oldest unused)
        smallCache.set('query 4', { ...mockResponse, query: 'query 4' }, 'tavily');

        expect(smallCache.get('query 1', 'tavily')).not.toBeNull();
        expect(smallCache.get('query 2', 'tavily')).toBeNull();
      });
    });

    describe('has', () => {
      it('should return true for existing non-expired entry', () => {
        cache.set('test query', mockResponse, 'tavily');
        expect(cache.has('test query', 'tavily')).toBe(true);
      });

      it('should return false for non-existent entry', () => {
        expect(cache.has('non-existent', 'tavily')).toBe(false);
      });
    });

    describe('invalidate', () => {
      it('should clear all entries when no pattern provided', () => {
        cache.set('query 1', mockResponse, 'tavily');
        cache.set('query 2', mockResponse, 'brave');

        const count = cache.invalidate();

        expect(count).toBe(2);
        expect(cache.has('query 1', 'tavily')).toBe(false);
        expect(cache.has('query 2', 'brave')).toBe(false);
      });

      it('should clear entries matching pattern', () => {
        cache.set('query 1', mockResponse, 'tavily');
        cache.set('query 2', mockResponse, 'tavily');
        cache.set('query 3', mockResponse, 'brave');

        // Invalidate based on key pattern
        const count = cache.invalidate('search:');

        expect(count).toBeGreaterThan(0);
      });
    });

    describe('getStats', () => {
      it('should track hits and misses', () => {
        cache.set('test query', mockResponse, 'tavily');

        cache.get('test query', 'tavily'); // hit
        cache.get('test query', 'tavily'); // hit
        cache.get('non-existent', 'tavily'); // miss

        const stats = cache.getStats();

        expect(stats.hits).toBe(2);
        expect(stats.misses).toBe(1);
        expect(stats.hitRate).toBeCloseTo(2 / 3);
      });

      it('should report cache size', () => {
        cache.set('query 1', mockResponse, 'tavily');
        cache.set('query 2', mockResponse, 'brave');

        const stats = cache.getStats();

        expect(stats.size).toBe(2);
        expect(stats.maxSize).toBe(10);
      });
    });

    describe('resetStats', () => {
      it('should reset hit/miss counters', () => {
        cache.get('non-existent', 'tavily'); // miss

        cache.resetStats();

        const stats = cache.getStats();
        expect(stats.hits).toBe(0);
        expect(stats.misses).toBe(0);
      });
    });

    describe('clear', () => {
      it('should remove all entries', () => {
        cache.set('query 1', mockResponse, 'tavily');
        cache.set('query 2', mockResponse, 'brave');

        cache.clear();

        expect(cache.getStats().size).toBe(0);
      });
    });

    describe('cleanup', () => {
      it('should remove expired entries', async () => {
        const shortTTLCache = new SearchCache({ defaultTTL: 50 });
        shortTTLCache.set('query 1', mockResponse, 'tavily');

        await new Promise((resolve) => setTimeout(resolve, 100));

        const removed = shortTTLCache.cleanup();

        expect(removed).toBe(1);
      });
    });
  });

  describe('global cache', () => {
    beforeEach(() => {
      resetSearchCache();
    });

    it('should return singleton instance', () => {
      const cache1 = getSearchCache();
      const cache2 = getSearchCache();

      expect(cache1).toBe(cache2);
    });

    it('should reset cache', () => {
      const cache1 = getSearchCache();
      cache1.set('test', mockResponse);

      resetSearchCache();

      const cache2 = getSearchCache();
      expect(cache2.has('test')).toBe(false);
    });
  });
});
