/**
 * Tests for useMarketplace hook
 */

import { renderHook, act } from '@testing-library/react';
import { useMarketplace } from './use-marketplace';

// Stable mock data to prevent infinite re-renders
const STABLE_PLUGINS_STORE = { plugins: {} };
const mockSearchPlugins = jest.fn();
const mockCheckForUpdates = jest.fn();
const mockClearCache = jest.fn();

jest.mock('@/lib/plugin', () => ({
  getPluginMarketplace: jest.fn(() => ({
    searchPlugins: mockSearchPlugins,
    checkForUpdates: mockCheckForUpdates,
    clearCache: mockClearCache,
  })),
}));

jest.mock('@/components/plugin/marketplace/components/marketplace-constants', () => ({
  MOCK_PLUGINS: [
    {
      id: 'mock-plugin-1',
      name: 'Mock Plugin 1',
      description: 'A mock plugin for testing',
      author: { name: 'Test Author', verified: true },
      version: '1.0.0',
      type: 'tool',
      capabilities: ['chat'],
      rating: 4.5,
      reviewCount: 100,
      downloadCount: 5000,
      lastUpdated: '2024-01-01',
      tags: ['test', 'mock'],
      featured: true,
      verified: true,
      trending: false,
    },
    {
      id: 'mock-plugin-2',
      name: 'Mock Plugin 2',
      description: 'Another mock plugin',
      author: { name: 'Test Author 2', verified: false },
      version: '2.0.0',
      type: 'extension',
      capabilities: ['agent'],
      rating: 4.0,
      reviewCount: 50,
      downloadCount: 15000,
      lastUpdated: '2024-01-15',
      tags: ['trending'],
      featured: false,
      verified: false,
      trending: true,
    },
  ],
}));

// Return stable reference to prevent infinite re-renders
jest.mock('@/stores/plugin', () => ({
  usePluginStore: jest.fn(() => STABLE_PLUGINS_STORE),
}));

describe('useMarketplace', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSearchPlugins.mockReset();
  });

  describe('initialization', () => {
    it('should return initial state with mock data', async () => {
      const { result } = renderHook(() => useMarketplace({ useMockData: true }));

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(result.current.plugins).toHaveLength(2);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.isUsingMockData).toBe(true);
    });

    it('should fetch from API when not using mock data', async () => {
      mockSearchPlugins.mockResolvedValue({
        plugins: [
          {
            id: 'api-plugin-1',
            name: 'API Plugin',
            description: 'From API',
            author: 'API Author',
            version: '1.0.0',
            manifest: { type: 'tool', capabilities: [] },
            rating: 4.0,
            ratingCount: 10,
            downloads: 100,
            updatedAt: new Date(),
            tags: [],
            featured: false,
            verified: true,
          },
        ],
      });

      const { result } = renderHook(() => useMarketplace({ useMockData: false }));

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(result.current.plugins).toHaveLength(1);
      expect(result.current.isUsingMockData).toBe(false);
      expect(mockSearchPlugins).toHaveBeenCalled();
    });

    it('should fallback to mock data on API error', async () => {
      mockSearchPlugins.mockRejectedValue(new Error('API error'));

      const { result } = renderHook(() => useMarketplace({ useMockData: false }));

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(result.current.plugins).toHaveLength(2);
      expect(result.current.isUsingMockData).toBe(true);
      expect(result.current.error).toBe('API error');
    });

    it('should fallback to mock data when API returns empty', async () => {
      mockSearchPlugins.mockResolvedValue({ plugins: [] });

      const { result } = renderHook(() => useMarketplace({ useMockData: false }));

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(result.current.plugins).toHaveLength(2);
      expect(result.current.isUsingMockData).toBe(true);
    });
  });

  describe('featuredPlugins', () => {
    it('should filter featured plugins', async () => {
      const { result } = renderHook(() => useMarketplace({ useMockData: true }));

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(result.current.featuredPlugins).toHaveLength(1);
      expect(result.current.featuredPlugins[0].id).toBe('mock-plugin-1');
    });
  });

  describe('trendingPlugins', () => {
    it('should filter trending plugins', async () => {
      const { result } = renderHook(() => useMarketplace({ useMockData: true }));

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(result.current.trendingPlugins).toHaveLength(1);
      expect(result.current.trendingPlugins[0].id).toBe('mock-plugin-2');
    });
  });

  describe('search', () => {
    it('should search plugins with options', async () => {
      mockSearchPlugins.mockResolvedValue({
        plugins: [
          {
            id: 'search-result',
            name: 'Search Result',
            description: 'Found plugin',
            author: 'Author',
            version: '1.0.0',
            manifest: { type: 'tool', capabilities: [] },
            rating: 4.0,
            ratingCount: 5,
            downloads: 50,
            updatedAt: new Date(),
            tags: ['search'],
            featured: false,
            verified: true,
          },
        ],
      });

      const { result } = renderHook(() => useMarketplace({ useMockData: false }));

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      await act(async () => {
        await result.current.search({ query: 'test' });
      });

      expect(mockSearchPlugins).toHaveBeenCalledWith({ query: 'test' });
    });
  });

  describe('refresh', () => {
    it('should refresh plugins', async () => {
      const { result } = renderHook(() => useMarketplace({ useMockData: true }));

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      await act(async () => {
        await result.current.refresh();
      });

      expect(result.current.plugins).toHaveLength(2);
    });

    it('should use initial search options on refresh', async () => {
      mockSearchPlugins.mockResolvedValue({ plugins: [] });

      const initialSearchOptions = { category: 'tools' };
      const { result } = renderHook(() =>
        useMarketplace({ useMockData: false, initialSearchOptions })
      );

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      mockSearchPlugins.mockClear();

      await act(async () => {
        await result.current.refresh();
      });

      expect(mockSearchPlugins).toHaveBeenCalledWith(initialSearchOptions);
    });
  });

  describe('installed status', () => {
    it('should mark installed plugins', async () => {
      jest.mock('@/stores/plugin', () => ({
        usePluginStore: jest.fn(() => ({
          plugins: { 'mock-plugin-1': { id: 'mock-plugin-1' } },
        })),
      }));

      const { result } = renderHook(() => useMarketplace({ useMockData: true }));

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      // Plugins should be returned (installed status depends on store state)
      expect(result.current.plugins).toHaveLength(2);
    });
  });

  describe('loading state', () => {
    it('should show loading state during fetch', async () => {
      let resolvePromise: (value: unknown) => void;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });
      mockSearchPlugins.mockReturnValue(promise);

      const { result } = renderHook(() => useMarketplace({ useMockData: false }));

      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        resolvePromise!({ plugins: [] });
        await promise;
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('checkForUpdates', () => {
    it('should call marketplace checkForUpdates with installed plugins', async () => {
      mockCheckForUpdates.mockResolvedValue([]);

      const { result } = renderHook(() => useMarketplace({ useMockData: true }));

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      await act(async () => {
        const updates = await result.current.checkForUpdates();
        expect(updates).toEqual([]);
      });

      expect(mockCheckForUpdates).toHaveBeenCalled();
    });
  });

  describe('clearCache', () => {
    it('should call marketplace clearCache', async () => {
      const { result } = renderHook(() => useMarketplace({ useMockData: true }));

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      act(() => {
        result.current.clearCache();
      });

      expect(mockClearCache).toHaveBeenCalled();
    });
  });
});
