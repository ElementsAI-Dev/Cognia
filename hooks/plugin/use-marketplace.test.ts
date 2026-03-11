/**
 * Tests for useMarketplace hook
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useMarketplace } from './use-marketplace';
import { usePluginMarketplaceStore } from '@/stores/plugin/plugin-marketplace-store';

const mockSearchPluginsStrict = jest.fn();
const mockInstallPlugin = jest.fn();
const mockUpdatePlugin = jest.fn();
const mockGetVersions = jest.fn();
const mockCheckForUpdates = jest.fn();
const mockClearCache = jest.fn();
const mockScanPlugins = jest.fn();
const mockPluginStoreState = {
  plugins: {},
  scanPlugins: mockScanPlugins,
};

jest.mock('@/lib/plugin', () => ({
  getPluginMarketplace: jest.fn(() => ({
    searchPluginsStrict: mockSearchPluginsStrict,
    installPlugin: mockInstallPlugin,
    updatePlugin: mockUpdatePlugin,
    getVersions: mockGetVersions,
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
      latestVersion: '1.0.0',
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
  ],
}));

jest.mock('@/stores/plugin', () => ({
  usePluginStore: jest.fn((selector?: (state: typeof mockPluginStoreState) => unknown) =>
    selector ? selector(mockPluginStoreState) : mockPluginStoreState
  ),
}));

const API_PLUGIN = {
  id: 'api-plugin-1',
  name: 'API Plugin',
  description: 'From API',
  author: 'API Author',
  version: '1.0.0',
  latestVersion: '1.2.0',
  manifest: { type: 'tool', capabilities: ['chat'] },
  rating: 4.0,
  ratingCount: 10,
  downloads: 100,
  updatedAt: new Date('2026-03-10T00:00:00Z'),
  publishedAt: new Date('2026-03-10T00:00:00Z'),
  tags: [],
  categories: [],
  featured: false,
  verified: true,
};

describe('useMarketplace', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSearchPluginsStrict.mockReset();
    mockInstallPlugin.mockReset();
    mockUpdatePlugin.mockReset();
    mockGetVersions.mockReset();
    mockCheckForUpdates.mockReset();
    mockClearCache.mockReset();
    mockScanPlugins.mockReset();
    act(() => {
      usePluginMarketplaceStore.getState().reset();
    });
  });

  it('loads remote plugins without fallback when API returns empty list', async () => {
    mockSearchPluginsStrict.mockResolvedValueOnce({
      plugins: [],
      total: 0,
      hasMore: false,
    });

    const { result } = renderHook(() => useMarketplace({ useMockData: false }));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.plugins).toHaveLength(0);
    expect(result.current.sourceMode).toBe('remote');
    expect(result.current.isUsingMockData).toBe(false);
  });

  it('enters fallback mode with typed category on fetch failure', async () => {
    mockSearchPluginsStrict.mockRejectedValueOnce({
      category: 'network',
      message: 'Network timeout',
      retryable: true,
    });

    const { result } = renderHook(() => useMarketplace({ useMockData: false }));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.sourceMode).toBe('fallback-mock');
    expect(result.current.errorCategory).toBe('network');
    expect(result.current.plugins).toHaveLength(1);
    expect(result.current.isUsingMockData).toBe(true);
  });

  it('persists canonical discovery state and resets page on sort change', async () => {
    mockSearchPluginsStrict.mockResolvedValue({
      plugins: [API_PLUGIN],
      total: 1,
      hasMore: false,
    });

    const { result } = renderHook(() => useMarketplace({ useMockData: false }));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.setPage(3);
    });
    expect(result.current.page).toBe(3);

    act(() => {
      result.current.setSortBy('rating');
    });
    expect(result.current.sortBy).toBe('rating');
    expect(result.current.page).toBe(1);
  });

  it('returns unsupported_env and error state for install failures', async () => {
    mockSearchPluginsStrict.mockResolvedValue({
      plugins: [API_PLUGIN],
      total: 1,
      hasMore: false,
    });
    mockInstallPlugin.mockResolvedValueOnce({
      success: false,
      error: 'Plugin installation requires the Cognia desktop app',
      errorCategory: 'unsupported_env',
      retryable: false,
    });

    const { result } = renderHook(() => useMarketplace({ useMockData: false }));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    let installResult:
      | { success: boolean; error?: string; errorCategory?: string; retryable?: boolean }
      | undefined;
    await act(async () => {
      installResult = await result.current.installPlugin('api-plugin-1');
    });

    expect(installResult?.success).toBe(false);
    expect(installResult?.errorCategory).toBe('unsupported_env');
    expect(result.current.getOperationStage('api-plugin-1')).toBe('error');
    expect(result.current.getOperationError('api-plugin-1').category).toBe('unsupported_env');
  });

  it('supports update operation and version metadata loading', async () => {
    mockSearchPluginsStrict.mockResolvedValue({
      plugins: [API_PLUGIN],
      total: 1,
      hasMore: false,
    });
    mockGetVersions.mockResolvedValueOnce([
      {
        version: '1.2.0',
        downloadUrl: 'https://example.com/plugin-1.2.0.zip',
        publishedAt: new Date('2026-03-10T00:00:00Z'),
      },
    ]);
    mockUpdatePlugin.mockResolvedValueOnce({ success: true });

    const { result } = renderHook(() => useMarketplace({ useMockData: false }));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    let versions: Array<{ version: string }>;
    await act(async () => {
      versions = await result.current.getVersions('api-plugin-1');
    });

    expect(versions!).toHaveLength(1);
    expect(versions![0].version).toBe('1.2.0');

    await act(async () => {
      await result.current.updatePlugin('api-plugin-1', '1.2.0');
    });

    expect(mockUpdatePlugin).toHaveBeenCalledWith('api-plugin-1', '1.2.0');
  });

  it('invokes cache and updates helpers', async () => {
    mockSearchPluginsStrict.mockResolvedValue({
      plugins: [API_PLUGIN],
      total: 1,
      hasMore: false,
    });
    mockCheckForUpdates.mockResolvedValueOnce([]);

    const { result } = renderHook(() => useMarketplace({ useMockData: false }));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      const updates = await result.current.checkForUpdates();
      expect(updates).toEqual([]);
    });
    expect(mockCheckForUpdates).toHaveBeenCalled();

    act(() => {
      result.current.clearCache();
    });
    expect(mockClearCache).toHaveBeenCalled();
  });
});
