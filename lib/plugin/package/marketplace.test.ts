/**
 * PluginMarketplace Tests
 */

import {
  PluginMarketplace,
  getPluginMarketplace,
  resetPluginMarketplace,
  usePluginMarketplace,
} from './marketplace';

// Mock fetch
global.fetch = jest.fn();
const mockFetch = global.fetch as jest.Mock;

// Mock proxyFetch to delegate to global.fetch
jest.mock('@/lib/network/proxy-fetch', () => ({
  proxyFetch: (...args: unknown[]) => (global.fetch as jest.MockedFunction<typeof fetch>)(...args as Parameters<typeof fetch>),
}));

describe('PluginMarketplace', () => {
  let marketplace: PluginMarketplace;

  beforeEach(() => {
    resetPluginMarketplace();
    marketplace = new PluginMarketplace();
    jest.clearAllMocks();
  });

  describe('Plugin Search', () => {
    it('should search plugins by query', async () => {
      const mockResults = {
        plugins: [
          { id: 'chat-plugin', name: 'Chat Enhancement', version: '1.0.0' },
        ],
        total: 1,
        hasMore: false,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResults),
      });

      const result = await marketplace.searchPlugins({ query: 'chat' });

      expect(mockFetch).toHaveBeenCalled();
      expect(result.plugins).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should search with category filter', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ plugins: [], total: 0, hasMore: false }),
      });

      await marketplace.searchPlugins({ 
        query: 'test', 
        category: 'productivity' 
      });

      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).toContain('category=productivity');
    });

    it('should handle search errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const result = await marketplace.searchPlugins({ query: 'test' });

      expect(result.plugins).toEqual([]);
      expect(result.total).toBe(0);
      
      consoleSpy.mockRestore();
    });
  });

  describe('Featured Plugins', () => {
    it('should fetch featured plugins', async () => {
      const mockPlugins = {
        plugins: [
          { id: 'plugin-1', name: 'Plugin 1', version: '1.0.0' },
          { id: 'plugin-2', name: 'Plugin 2', version: '2.0.0' },
        ],
        total: 2,
        hasMore: false,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockPlugins),
      });

      const result = await marketplace.getFeaturedPlugins();

      expect(mockFetch).toHaveBeenCalled();
      expect(result).toHaveLength(2);
    });
  });

  describe('Plugin Details', () => {
    it('should fetch plugin details', async () => {
      const mockPlugin = {
        id: 'test-plugin',
        name: 'Test Plugin',
        version: '1.0.0',
        description: 'A test plugin',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockPlugin),
      });

      const result = await marketplace.getPlugin('test-plugin');

      expect(result).toBeDefined();
      expect(result?.id).toBe('test-plugin');
    });

    it('should return null for non-existent plugin', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      const result = await marketplace.getPlugin('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('Version Management', () => {
    it('should fetch available versions', async () => {
      const mockVersions = [
        { version: '1.0.0', publishedAt: new Date(), downloadUrl: 'url1' },
        { version: '1.1.0', publishedAt: new Date(), downloadUrl: 'url2' },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockVersions),
      });

      const result = await marketplace.getVersions('test-plugin');

      expect(result).toHaveLength(2);
      expect(result[0].version).toBe('1.0.0');
    });

    it('should return empty array on error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const result = await marketplace.getVersions('test-plugin');

      expect(result).toEqual([]);
      
      consoleSpy.mockRestore();
    });
  });

  describe('Categories', () => {
    it('should fetch categories', async () => {
      const mockCategories = [
        { id: 'productivity', name: 'Productivity', count: 10 },
        { id: 'ai', name: 'AI', count: 5 },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockCategories),
      });

      const result = await marketplace.getCategories();

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('productivity');
    });
  });

  describe('Dependency Resolution', () => {
    it('should resolve plugin dependencies', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          id: 'main-plugin',
          manifest: { dependencies: {} },
        }),
      });

      const result = await marketplace.resolveDependencies('main-plugin');

      expect(result.resolved).toBeDefined();
      expect(result.missing).toBeDefined();
    });

    it('should report missing plugin', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      const result = await marketplace.resolveDependencies('non-existent');

      expect(result.resolved).toBe(false);
      expect(result.missing).toContain('non-existent');
    });
  });

  describe('Installation', () => {
    it('should install plugin with progress callback', async () => {
      const progressUpdates: string[] = [];
      
      // Setup progress listener
      marketplace.onInstallProgress('test-plugin', (progress) => {
        progressUpdates.push(progress.stage);
      });

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ id: 'test-plugin', manifest: {} }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([{ version: '1.0.0', downloadUrl: 'url' }]),
        });

      const result = await marketplace.installPlugin('test-plugin');

      expect(result.success).toBeDefined();
    });

    it('should emit progress events in web environment', async () => {
      const stages: string[] = [];

      marketplace.onInstallProgress('web-plugin', (progress) => {
        stages.push(progress.stage);
      });

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ id: 'web-plugin', name: 'Web Plugin', manifest: {} }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([{ version: '1.0.0', downloadUrl: 'url' }]),
        });

      await marketplace.installPlugin('web-plugin');

      // Web environment: should reach complete stage (no Tauri)
      expect(stages).toContain('complete');
    });
  });

  describe('Cache', () => {
    it('should cache API responses', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ id: 'cached-plugin', name: 'Cached' }),
      });

      // First call hits API
      await marketplace.getPlugin('cached-plugin');
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Second call should use cache (no additional fetch)
      await marketplace.getPlugin('cached-plugin');
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should clear cache', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ id: 'cached-plugin', name: 'Cached' }),
      });

      await marketplace.getPlugin('cached-plugin');
      expect(mockFetch).toHaveBeenCalledTimes(1);

      marketplace.clearCache();

      await marketplace.getPlugin('cached-plugin');
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('Popular and Recent Plugins', () => {
    it('should fetch popular plugins', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ plugins: [{ id: 'popular' }], total: 1, hasMore: false }),
      });

      const result = await marketplace.getPopularPlugins(5);

      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).toContain('sort=downloads');
      expect(result).toHaveLength(1);
    });

    it('should fetch recent plugins', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ plugins: [{ id: 'recent' }], total: 1, hasMore: false }),
      });

      const result = await marketplace.getRecentPlugins(5);

      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).toContain('sort=updated');
      expect(result).toHaveLength(1);
    });
  });

  describe('Singleton', () => {
    it('should return the same instance', () => {
      const instance1 = getPluginMarketplace();
      const instance2 = getPluginMarketplace();
      
      expect(instance1).toBe(instance2);
    });

    it('should reset singleton on reset call', () => {
      const instance1 = getPluginMarketplace();
      resetPluginMarketplace();
      const instance2 = getPluginMarketplace();
      
      expect(instance1).not.toBe(instance2);
    });

    it('should provide hook for accessing marketplace', () => {
      const result = usePluginMarketplace();
      expect(result).toBeInstanceOf(PluginMarketplace);
    });
  });
});
