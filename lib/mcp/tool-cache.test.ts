/**
 * Tests for MCP Tool Cache
 */

import {
  ToolCacheManager,
  getToolCacheManager,
  destroyToolCacheManager,
  createCachedGetAllTools,
} from './tool-cache';
import type { McpTool } from '@/types/mcp';

describe('MCP Tool Cache', () => {
  const mockTool: McpTool = {
    name: 'test_tool',
    description: 'A test tool',
    inputSchema: { type: 'object', properties: {} },
  };

  const mockTools = [
    { serverId: 'server1', tool: mockTool },
    { serverId: 'server2', tool: { ...mockTool, name: 'tool2' } },
  ];

  describe('ToolCacheManager', () => {
    let cache: ToolCacheManager;

    beforeEach(() => {
      cache = new ToolCacheManager({ ttl: 5000 });
    });

    afterEach(() => {
      cache.destroy();
    });

    it('should cache and retrieve tools', () => {
      cache.set('all', mockTools);
      const cached = cache.get('all');

      expect(cached).toEqual(mockTools);
    });

    it('should return null for non-existent keys', () => {
      expect(cache.get('nonexistent')).toBeNull();
    });

    it('should invalidate cache', () => {
      cache.set('all', mockTools);
      cache.invalidate();

      expect(cache.get('all')).toBeNull();
    });

    it('should invalidate specific server cache', () => {
      cache.set('all', mockTools);
      cache.invalidateServer('server1');

      expect(cache.get('all')).toBeNull();
    });

    it('should return cache stats', () => {
      cache.set('all', mockTools);
      const stats = cache.getStats();

      expect(stats.size).toBe(1);
      expect(stats.enabled).toBe(true);
    });

    it('should respect TTL', async () => {
      const shortTtlCache = new ToolCacheManager({ ttl: 50 });
      shortTtlCache.set('all', mockTools);

      // Wait for TTL to expire
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(shortTtlCache.get('all')).toBeNull();
      shortTtlCache.destroy();
    });

    it('should enforce max size', () => {
      const smallCache = new ToolCacheManager({ maxSize: 2 });

      smallCache.set('key1', mockTools);
      smallCache.set('key2', mockTools);
      smallCache.set('key3', mockTools); // Should evict key1

      expect(smallCache.get('key1')).toBeNull();
      expect(smallCache.get('key2')).toEqual(mockTools);
      expect(smallCache.get('key3')).toEqual(mockTools);

      smallCache.destroy();
    });

    it('should disable caching when configured', () => {
      const disabledCache = new ToolCacheManager({ enabled: false });

      disabledCache.set('all', mockTools);
      expect(disabledCache.get('all')).toBeNull();

      disabledCache.destroy();
    });

    it('should update configuration', () => {
      cache.configure({ enabled: false });

      const stats = cache.getStats();
      expect(stats.enabled).toBe(false);
    });
  });

  describe('Global cache manager', () => {
    afterEach(() => {
      destroyToolCacheManager();
    });

    it('should create singleton instance', () => {
      const manager1 = getToolCacheManager();
      const manager2 = getToolCacheManager();

      expect(manager1).toBe(manager2);
    });

    it('should destroy and recreate instance', () => {
      const manager1 = getToolCacheManager();
      destroyToolCacheManager();
      const manager2 = getToolCacheManager();

      expect(manager1).not.toBe(manager2);
    });
  });

  describe('createCachedGetAllTools', () => {
    afterEach(() => {
      destroyToolCacheManager();
    });

    it('should cache getAllTools results', async () => {
      const getAllTools = jest.fn().mockResolvedValue(mockTools);
      const cachedGetAllTools = createCachedGetAllTools(getAllTools);

      // First call should invoke the original function
      const result1 = await cachedGetAllTools();
      expect(getAllTools).toHaveBeenCalledTimes(1);
      expect(result1).toEqual(mockTools);

      // Second call should use cache
      const result2 = await cachedGetAllTools();
      expect(getAllTools).toHaveBeenCalledTimes(1);
      expect(result2).toEqual(mockTools);
    });

    it('should fetch fresh data after invalidation', async () => {
      const getAllTools = jest.fn().mockResolvedValue(mockTools);
      const cachedGetAllTools = createCachedGetAllTools(getAllTools);

      await cachedGetAllTools();
      expect(getAllTools).toHaveBeenCalledTimes(1);

      getToolCacheManager().invalidate();

      await cachedGetAllTools();
      expect(getAllTools).toHaveBeenCalledTimes(2);
    });
  });
});
