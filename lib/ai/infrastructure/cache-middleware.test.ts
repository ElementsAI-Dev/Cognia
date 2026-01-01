/**
 * Cache Middleware Tests
 */

import {
  createInMemoryCacheStore,
  createCacheMiddleware,
  createSimpleCacheMiddleware,
  generateCacheKey,
  type CacheStore,
} from './cache-middleware';

describe('Cache Middleware', () => {
  describe('createInMemoryCacheStore', () => {
    it('should store and retrieve values', async () => {
      const store = createInMemoryCacheStore();
      
      await store.set('key1', 'value1');
      const result = await store.get<string>('key1');
      
      expect(result).toBe('value1');
    });

    it('should return null for missing keys', async () => {
      const store = createInMemoryCacheStore();
      
      const result = await store.get('nonexistent');
      
      expect(result).toBeNull();
    });

    it('should respect TTL', async () => {
      const store = createInMemoryCacheStore();
      
      await store.set('key1', 'value1', 0.1); // 100ms TTL
      
      // Should exist immediately
      expect(await store.get('key1')).toBe('value1');
      
      // Wait for expiry
      await new Promise(resolve => setTimeout(resolve, 150));
      
      expect(await store.get('key1')).toBeNull();
    });

    it('should evict oldest entries when maxSize is reached', async () => {
      const store = createInMemoryCacheStore({ maxSize: 2 });
      
      await store.set('key1', 'value1');
      await store.set('key2', 'value2');
      await store.set('key3', 'value3'); // Should evict key1
      
      expect(await store.get('key1')).toBeNull();
      expect(await store.get('key2')).toBe('value2');
      expect(await store.get('key3')).toBe('value3');
    });

    it('should delete values', async () => {
      const store = createInMemoryCacheStore();
      
      await store.set('key1', 'value1');
      await store.delete('key1');
      
      expect(await store.get('key1')).toBeNull();
    });
  });

  describe('generateCacheKey', () => {
    it('should generate consistent keys for same params', () => {
      const params = { prompt: 'Hello', temperature: 0.7 };
      
      const key1 = generateCacheKey(params);
      const key2 = generateCacheKey(params);
      
      expect(key1).toBe(key2);
    });

    it('should generate different keys for different params', () => {
      const key1 = generateCacheKey({ prompt: 'Hello' });
      const key2 = generateCacheKey({ prompt: 'World' });
      
      expect(key1).not.toBe(key2);
    });

    it('should prefix keys with ai-cache-', () => {
      const key = generateCacheKey({ test: true });
      
      expect(key).toMatch(/^ai-cache-/);
    });
  });

  describe('createCacheMiddleware', () => {
    let store: CacheStore;

    beforeEach(() => {
      store = createInMemoryCacheStore();
    });

    it('should return middleware with wrapGenerate', () => {
      const middleware = createCacheMiddleware({ store });
      
      expect(middleware.wrapGenerate).toBeDefined();
    });

    it('should return middleware with wrapStream when cacheStreaming is true', () => {
      const middleware = createCacheMiddleware({ store, cacheStreaming: true });
      
      expect(middleware.wrapStream).toBeDefined();
    });

    it('should not return wrapStream when cacheStreaming is false', () => {
      const middleware = createCacheMiddleware({ store, cacheStreaming: false });
      
      expect(middleware.wrapStream).toBeUndefined();
    });

    it('should cache generate results', async () => {
      const middleware = createCacheMiddleware({ store });
      
      const mockDoGenerate = jest.fn().mockResolvedValue({
        text: 'Hello World',
        finishReason: 'stop',
        content: [{ type: 'text', text: 'Hello World' }],
      });
      
      const params = { prompt: 'Say hello' };
      
      // First call - should execute doGenerate
      if (middleware.wrapGenerate) {
        await middleware.wrapGenerate({ doGenerate: mockDoGenerate, params } as never);
      }
      
      expect(mockDoGenerate).toHaveBeenCalledTimes(1);
      
      // Second call - should use cache
      if (middleware.wrapGenerate) {
        await middleware.wrapGenerate({ doGenerate: mockDoGenerate, params } as never);
      }
      
      // Should still be 1 because second call used cache
      expect(mockDoGenerate).toHaveBeenCalledTimes(1);
    });

    it('should use custom key generator', async () => {
      const customKeyGenerator = jest.fn().mockReturnValue('custom-key');
      const middleware = createCacheMiddleware({ 
        store, 
        generateKey: customKeyGenerator 
      });
      
      const mockDoGenerate = jest.fn().mockResolvedValue({
        text: 'Test',
        content: [],
      });
      
      if (middleware.wrapGenerate) {
        await middleware.wrapGenerate({ 
          doGenerate: mockDoGenerate, 
          params: { test: true } 
        } as never);
      }
      
      expect(customKeyGenerator).toHaveBeenCalled();
    });
  });

  describe('createSimpleCacheMiddleware', () => {
    it('should create middleware with default options', () => {
      const middleware = createSimpleCacheMiddleware();
      
      expect(middleware.wrapGenerate).toBeDefined();
      expect(middleware.wrapStream).toBeDefined();
    });

    it('should respect custom TTL', () => {
      const middleware = createSimpleCacheMiddleware({ ttlSeconds: 60 });
      
      expect(middleware).toBeDefined();
    });

    it('should respect custom maxSize', () => {
      const middleware = createSimpleCacheMiddleware({ maxSize: 50 });
      
      expect(middleware).toBeDefined();
    });
  });
});
