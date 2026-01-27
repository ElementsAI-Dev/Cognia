/**
 * Completion Cache Tests
 */

import { CompletionCache } from './completion-cache';

describe('CompletionCache', () => {
  let cache: CompletionCache<string>;

  beforeEach(() => {
    cache = new CompletionCache<string>();
  });

  describe('constructor', () => {
    it('should create cache with default options', () => {
      const stats = cache.getStats();
      expect(stats.maxSize).toBe(100);
      expect(stats.size).toBe(0);
    });

    it('should create cache with custom options', () => {
      const customCache = new CompletionCache<string>({ maxSize: 50, ttlMs: 60000 });
      const stats = customCache.getStats();
      expect(stats.maxSize).toBe(50);
    });
  });

  describe('generateKey', () => {
    it('should generate consistent keys for same input', () => {
      const key1 = CompletionCache.generateKey('hello');
      const key2 = CompletionCache.generateKey('hello');
      expect(key1).toBe(key2);
    });

    it('should generate different keys for different inputs', () => {
      const key1 = CompletionCache.generateKey('hello');
      const key2 = CompletionCache.generateKey('world');
      expect(key1).not.toBe(key2);
    });

    it('should include context in key generation', () => {
      const key1 = CompletionCache.generateKey('hello', 'context1');
      const key2 = CompletionCache.generateKey('hello', 'context2');
      expect(key1).not.toBe(key2);
    });

    it('should generate key without context', () => {
      const key = CompletionCache.generateKey('hello');
      expect(key).toMatch(/^completion_-?\d+$/);
    });

    it('should handle empty strings', () => {
      const key = CompletionCache.generateKey('');
      expect(key).toBeDefined();
    });
  });

  describe('get/set', () => {
    it('should store and retrieve values', () => {
      cache.set('key1', 'value1');
      expect(cache.get('key1')).toBe('value1');
    });

    it('should return undefined for non-existent keys', () => {
      expect(cache.get('nonexistent')).toBeUndefined();
    });

    it('should overwrite existing values', () => {
      cache.set('key1', 'value1');
      cache.set('key1', 'value2');
      expect(cache.get('key1')).toBe('value2');
    });

    it('should increment hit count on get', () => {
      cache.set('key1', 'value1');
      cache.get('key1');
      cache.get('key1');
      cache.get('key1');
      const stats = cache.getStats();
      expect(stats.hits).toBe(3);
    });
  });

  describe('has', () => {
    it('should return true for existing keys', () => {
      cache.set('key1', 'value1');
      expect(cache.has('key1')).toBe(true);
    });

    it('should return false for non-existent keys', () => {
      expect(cache.has('nonexistent')).toBe(false);
    });
  });

  describe('delete', () => {
    it('should remove existing keys', () => {
      cache.set('key1', 'value1');
      expect(cache.delete('key1')).toBe(true);
      expect(cache.get('key1')).toBeUndefined();
    });

    it('should return false for non-existent keys', () => {
      expect(cache.delete('nonexistent')).toBe(false);
    });
  });

  describe('clear', () => {
    it('should remove all entries', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');
      cache.clear();
      expect(cache.getStats().size).toBe(0);
    });
  });

  describe('TTL expiration', () => {
    it('should return undefined for expired entries on get', () => {
      const shortTtlCache = new CompletionCache<string>({ ttlMs: 10 });
      shortTtlCache.set('key1', 'value1');
      
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          expect(shortTtlCache.get('key1')).toBeUndefined();
          resolve();
        }, 20);
      });
    });

    it('should return false for expired entries on has', () => {
      const shortTtlCache = new CompletionCache<string>({ ttlMs: 10 });
      shortTtlCache.set('key1', 'value1');
      
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          expect(shortTtlCache.has('key1')).toBe(false);
          resolve();
        }, 20);
      });
    });
  });

  describe('LRU eviction', () => {
    it('should evict oldest entries when max size is reached', () => {
      const smallCache = new CompletionCache<string>({ maxSize: 5 });
      
      for (let i = 0; i < 10; i++) {
        smallCache.set(`key${i}`, `value${i}`);
      }
      
      const stats = smallCache.getStats();
      expect(stats.size).toBeLessThanOrEqual(5);
    });

    it('should evict approximately 10% of entries on overflow', () => {
      const smallCache = new CompletionCache<string>({ maxSize: 10 });
      
      for (let i = 0; i < 10; i++) {
        smallCache.set(`key${i}`, `value${i}`);
      }
      
      expect(smallCache.getStats().size).toBe(10);
      
      smallCache.set('overflow', 'value');
      
      expect(smallCache.getStats().size).toBeLessThan(10);
    });
  });

  describe('cleanup', () => {
    it('should remove expired entries', () => {
      const shortTtlCache = new CompletionCache<string>({ ttlMs: 10 });
      shortTtlCache.set('key1', 'value1');
      shortTtlCache.set('key2', 'value2');
      
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          const removed = shortTtlCache.cleanup();
          expect(removed).toBe(2);
          expect(shortTtlCache.getStats().size).toBe(0);
          resolve();
        }, 20);
      });
    });

    it('should not remove non-expired entries', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      
      const removed = cache.cleanup();
      expect(removed).toBe(0);
      expect(cache.getStats().size).toBe(2);
    });
  });

  describe('getStats', () => {
    it('should return correct statistics', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.get('key1');
      cache.get('key1');
      
      const stats = cache.getStats();
      expect(stats.size).toBe(2);
      expect(stats.hits).toBe(2);
      expect(stats.maxSize).toBe(100);
    });

    it('should aggregate hits from all entries', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.get('key1');
      cache.get('key2');
      cache.get('key2');
      
      const stats = cache.getStats();
      expect(stats.hits).toBe(3);
    });
  });

  describe('generic types', () => {
    it('should work with object values', () => {
      const objectCache = new CompletionCache<{ text: string; tokens: number }>();
      objectCache.set('key1', { text: 'hello', tokens: 5 });
      
      const value = objectCache.get('key1');
      expect(value).toEqual({ text: 'hello', tokens: 5 });
    });

    it('should work with array values', () => {
      const arrayCache = new CompletionCache<string[]>();
      arrayCache.set('key1', ['a', 'b', 'c']);
      
      const value = arrayCache.get('key1');
      expect(value).toEqual(['a', 'b', 'c']);
    });

    it('should work with number values', () => {
      const numberCache = new CompletionCache<number>();
      numberCache.set('key1', 42);
      
      expect(numberCache.get('key1')).toBe(42);
    });
  });
});
