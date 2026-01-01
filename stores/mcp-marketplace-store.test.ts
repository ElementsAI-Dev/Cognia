/**
 * Tests for MCP Marketplace Store
 */

import { useMcpMarketplaceStore } from './mcp-marketplace-store';
import { act } from '@testing-library/react';
import type { McpMarketplaceItem, McpMarketplaceCatalog } from '@/types/mcp-marketplace';

// Mock the marketplace API
jest.mock('@/lib/mcp/marketplace', () => ({
  fetchMcpMarketplace: jest.fn(),
  downloadMcpServer: jest.fn(),
  filterMarketplaceItems: jest.fn((items, filters) => {
    let filtered = [...items];
    if (filters.search) {
      const query = filters.search.toLowerCase();
      filtered = filtered.filter(
        (item: McpMarketplaceItem) =>
          item.name.toLowerCase().includes(query) ||
          item.description.toLowerCase().includes(query)
      );
    }
    if (filters.source && filters.source !== 'all') {
      filtered = filtered.filter((item: McpMarketplaceItem) => item.source === filters.source);
    }
    return filtered;
  }),
  getUniqueTags: jest.fn((items) => {
    const tags = new Set<string>();
    items.forEach((item: McpMarketplaceItem) => item.tags.forEach((tag: string) => tags.add(tag)));
    return Array.from(tags).sort();
  }),
}));

// Mock the marketplace-utils for caching
jest.mock('@/lib/mcp/marketplace-utils', () => ({
  getCachedDetails: jest.fn(),
  setCachedDetails: jest.fn(),
}));

import { fetchMcpMarketplace, downloadMcpServer } from '@/lib/mcp/marketplace';
import { getCachedDetails, setCachedDetails } from '@/lib/mcp/marketplace-utils';

const mockGetCachedDetails = getCachedDetails as jest.MockedFunction<typeof getCachedDetails>;
const mockSetCachedDetails = setCachedDetails as jest.MockedFunction<typeof setCachedDetails>;

const mockFetchMcpMarketplace = fetchMcpMarketplace as jest.MockedFunction<typeof fetchMcpMarketplace>;
const mockDownloadMcpServer = downloadMcpServer as jest.MockedFunction<typeof downloadMcpServer>;

// Helper to create mock marketplace item
const createMockItem = (id: string, source: 'cline' | 'smithery' | 'glama' = 'cline'): McpMarketplaceItem => ({
  mcpId: id,
  name: `Test Server ${id}`,
  author: 'test-author',
  description: `Description for ${id}`,
  githubUrl: `https://github.com/test/${id}`,
  githubStars: 100,
  downloadCount: 50,
  tags: ['test', 'mock'],
  requiresApiKey: false,
  source,
});

// Helper to create mock catalog
const createMockCatalog = (items: McpMarketplaceItem[]): McpMarketplaceCatalog => ({
  items,
  source: 'all',
  totalCount: items.length,
});

describe('useMcpMarketplaceStore', () => {
  beforeEach(() => {
    // Reset store state
    useMcpMarketplaceStore.setState({
      catalog: null,
      filters: {
        search: '',
        tags: [],
        sortBy: 'popular',
        source: 'all',
      },
      isLoading: false,
      error: null,
      lastFetched: null,
      sourceCatalogs: {
        cline: null,
        smithery: null,
        glama: null,
        all: null,
      },
      sourceLastFetched: {
        cline: null,
        smithery: null,
        glama: null,
        all: null,
      },
      installingItems: new Map(),
      installErrors: new Map(),
      selectedItem: null,
      downloadDetails: null,
      isLoadingDetails: false,
      smitheryApiKey: null,
      favorites: new Set(),
      currentPage: 1,
      itemsPerPage: 24,
      viewMode: 'grid',
      showFavoritesOnly: false,
    });
    jest.clearAllMocks();
  });

  describe('initial state', () => {
    it('has correct initial state', () => {
      const state = useMcpMarketplaceStore.getState();
      expect(state.catalog).toBeNull();
      expect(state.filters.search).toBe('');
      expect(state.filters.source).toBe('all');
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.smitheryApiKey).toBeNull();
    });
  });

  describe('fetchCatalog', () => {
    it('fetches marketplace catalog successfully', async () => {
      const mockItems = [
        createMockItem('server-1'),
        createMockItem('server-2'),
      ];
      const mockCatalog = createMockCatalog(mockItems);
      mockFetchMcpMarketplace.mockResolvedValueOnce(mockCatalog);

      await act(async () => {
        await useMcpMarketplaceStore.getState().fetchCatalog();
      });

      const state = useMcpMarketplaceStore.getState();
      expect(state.catalog).toEqual(mockCatalog);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.lastFetched).not.toBeNull();
    });

    it('handles fetch error gracefully', async () => {
      mockFetchMcpMarketplace.mockRejectedValueOnce(new Error('Network error'));

      await act(async () => {
        await useMcpMarketplaceStore.getState().fetchCatalog();
      });

      const state = useMcpMarketplaceStore.getState();
      expect(state.catalog).toBeNull();
      expect(state.isLoading).toBe(false);
      expect(state.error).toBe('Network error');
    });

    it('uses cache when not forcing refresh', async () => {
      const mockItems = [createMockItem('server-1')];
      const mockCatalog = createMockCatalog(mockItems);

      // Set up cached state
      useMcpMarketplaceStore.setState({
        catalog: mockCatalog,
        lastFetched: Date.now(),
      });

      await act(async () => {
        await useMcpMarketplaceStore.getState().fetchCatalog(false);
      });

      // Should not call fetch because cache is valid
      expect(mockFetchMcpMarketplace).not.toHaveBeenCalled();
    });

    it('forces refresh when specified', async () => {
      const mockItems = [createMockItem('server-1')];
      const mockCatalog = createMockCatalog(mockItems);
      mockFetchMcpMarketplace.mockResolvedValueOnce(mockCatalog);

      // Set up cached state
      useMcpMarketplaceStore.setState({
        catalog: mockCatalog,
        lastFetched: Date.now(),
      });

      await act(async () => {
        await useMcpMarketplaceStore.getState().fetchCatalog(true);
      });

      expect(mockFetchMcpMarketplace).toHaveBeenCalled();
    });
  });

  describe('setFilters', () => {
    it('updates search filter', () => {
      act(() => {
        useMcpMarketplaceStore.getState().setFilters({ search: 'test query' });
      });

      const state = useMcpMarketplaceStore.getState();
      expect(state.filters.search).toBe('test query');
    });

    it('updates source filter', () => {
      act(() => {
        useMcpMarketplaceStore.getState().setFilters({ source: 'smithery' });
      });

      const state = useMcpMarketplaceStore.getState();
      expect(state.filters.source).toBe('smithery');
    });

    it('updates tags filter', () => {
      act(() => {
        useMcpMarketplaceStore.getState().setFilters({ tags: ['database', 'api'] });
      });

      const state = useMcpMarketplaceStore.getState();
      expect(state.filters.tags).toEqual(['database', 'api']);
    });

    it('updates verified filter', () => {
      act(() => {
        useMcpMarketplaceStore.getState().setFilters({ verified: true });
      });

      const state = useMcpMarketplaceStore.getState();
      expect(state.filters.verified).toBe(true);
    });

    it('updates remote filter', () => {
      act(() => {
        useMcpMarketplaceStore.getState().setFilters({ remote: true });
      });

      const state = useMcpMarketplaceStore.getState();
      expect(state.filters.remote).toBe(true);
    });
  });

  describe('resetFilters', () => {
    it('resets all filters to default', () => {
      // Set some filters
      useMcpMarketplaceStore.setState({
        filters: {
          search: 'test',
          tags: ['tag1'],
          sortBy: 'stars',
          source: 'smithery',
          verified: true,
          remote: true,
        },
      });

      act(() => {
        useMcpMarketplaceStore.getState().resetFilters();
      });

      const state = useMcpMarketplaceStore.getState();
      expect(state.filters.search).toBe('');
      expect(state.filters.tags).toEqual([]);
      expect(state.filters.sortBy).toBe('popular');
      expect(state.filters.source).toBe('all');
    });
  });

  describe('selectItem', () => {
    it('selects an item', () => {
      const item = createMockItem('test-server');

      act(() => {
        useMcpMarketplaceStore.getState().selectItem(item);
      });

      const state = useMcpMarketplaceStore.getState();
      expect(state.selectedItem).toEqual(item);
      expect(state.downloadDetails).toBeNull();
    });

    it('clears selection when null', () => {
      const item = createMockItem('test-server');
      useMcpMarketplaceStore.setState({ selectedItem: item });

      act(() => {
        useMcpMarketplaceStore.getState().selectItem(null);
      });

      const state = useMcpMarketplaceStore.getState();
      expect(state.selectedItem).toBeNull();
    });
  });

  describe('fetchItemDetails', () => {
    it('fetches item details successfully', async () => {
      const mockDetails = {
        mcpId: 'test-server',
        githubUrl: 'https://github.com/test/server',
        name: 'Test Server',
        author: 'test',
        description: 'Test description',
        readmeContent: '# README',
        requiresApiKey: false,
      };
      mockGetCachedDetails.mockReturnValueOnce(null);
      mockDownloadMcpServer.mockResolvedValueOnce(mockDetails);

      let result;
      await act(async () => {
        result = await useMcpMarketplaceStore.getState().fetchItemDetails('test-server');
      });

      expect(result).toEqual(mockDetails);
      const state = useMcpMarketplaceStore.getState();
      expect(state.downloadDetails).toEqual(mockDetails);
      expect(state.isLoadingDetails).toBe(false);
      expect(mockSetCachedDetails).toHaveBeenCalledWith('test-server', mockDetails);
    });

    it('returns cached details without API call', async () => {
      const cachedDetails = {
        mcpId: 'cached-server',
        githubUrl: 'https://github.com/test/cached',
        name: 'Cached Server',
        author: 'test',
        description: 'Cached description',
        readmeContent: '# Cached README',
        requiresApiKey: false,
      };
      mockGetCachedDetails.mockReturnValueOnce(cachedDetails);

      let result;
      await act(async () => {
        result = await useMcpMarketplaceStore.getState().fetchItemDetails('cached-server');
      });

      expect(result).toEqual(cachedDetails);
      expect(mockDownloadMcpServer).not.toHaveBeenCalled();
      const state = useMcpMarketplaceStore.getState();
      expect(state.downloadDetails).toEqual(cachedDetails);
      expect(state.isLoadingDetails).toBe(false);
    });

    it('does not cache details with errors', async () => {
      const errorDetails = {
        mcpId: 'error-server',
        githubUrl: 'https://github.com/test/error',
        name: 'Error Server',
        author: 'test',
        description: 'Error description',
        readmeContent: '',
        requiresApiKey: false,
        error: 'Failed to fetch',
      };
      mockGetCachedDetails.mockReturnValueOnce(null);
      mockDownloadMcpServer.mockResolvedValueOnce(errorDetails);

      await act(async () => {
        await useMcpMarketplaceStore.getState().fetchItemDetails('error-server');
      });

      expect(mockSetCachedDetails).not.toHaveBeenCalled();
    });
  });

  describe('setInstallStatus', () => {
    it('sets installation status', () => {
      act(() => {
        useMcpMarketplaceStore.getState().setInstallStatus('test-server', 'installing');
      });

      const state = useMcpMarketplaceStore.getState();
      expect(state.installingItems.get('test-server')).toBe('installing');
    });

    it('sets installation error', () => {
      act(() => {
        useMcpMarketplaceStore.getState().setInstallStatus('test-server', 'error', 'Install failed');
      });

      const state = useMcpMarketplaceStore.getState();
      expect(state.installingItems.get('test-server')).toBe('error');
      expect(state.installErrors.get('test-server')).toBe('Install failed');
    });

    it('clears error when status changes', () => {
      useMcpMarketplaceStore.setState({
        installingItems: new Map([['test-server', 'error']]),
        installErrors: new Map([['test-server', 'Previous error']]),
      });

      act(() => {
        useMcpMarketplaceStore.getState().setInstallStatus('test-server', 'installed');
      });

      const state = useMcpMarketplaceStore.getState();
      expect(state.installingItems.get('test-server')).toBe('installed');
      expect(state.installErrors.has('test-server')).toBe(false);
    });
  });

  describe('setSmitheryApiKey', () => {
    it('sets Smithery API key', () => {
      act(() => {
        useMcpMarketplaceStore.getState().setSmitheryApiKey('test-api-key');
      });

      const state = useMcpMarketplaceStore.getState();
      expect(state.smitheryApiKey).toBe('test-api-key');
    });

    it('clears Smithery API key', () => {
      useMcpMarketplaceStore.setState({ smitheryApiKey: 'existing-key' });

      act(() => {
        useMcpMarketplaceStore.getState().setSmitheryApiKey(null);
      });

      const state = useMcpMarketplaceStore.getState();
      expect(state.smitheryApiKey).toBeNull();
    });
  });

  describe('getFilteredItems', () => {
    it('returns empty array when no catalog', () => {
      const result = useMcpMarketplaceStore.getState().getFilteredItems();
      expect(result).toEqual([]);
    });

    it('returns filtered items when catalog exists', () => {
      const mockItems = [
        createMockItem('server-1'),
        createMockItem('server-2'),
      ];
      useMcpMarketplaceStore.setState({
        catalog: createMockCatalog(mockItems),
      });

      const result = useMcpMarketplaceStore.getState().getFilteredItems();
      expect(result.length).toBe(2);
    });
  });

  describe('getSourceCount', () => {
    it('returns 0 when no catalog', () => {
      const result = useMcpMarketplaceStore.getState().getSourceCount('cline');
      expect(result).toBe(0);
    });

    it('returns count for specific source', () => {
      const mockItems = [
        createMockItem('server-1', 'cline'),
        createMockItem('server-2', 'cline'),
        createMockItem('server-3', 'smithery'),
      ];
      useMcpMarketplaceStore.setState({
        catalog: createMockCatalog(mockItems),
      });

      expect(useMcpMarketplaceStore.getState().getSourceCount('cline')).toBe(2);
      expect(useMcpMarketplaceStore.getState().getSourceCount('smithery')).toBe(1);
      expect(useMcpMarketplaceStore.getState().getSourceCount('glama')).toBe(0);
    });

    it('returns total count for all sources', () => {
      const mockItems = [
        createMockItem('server-1', 'cline'),
        createMockItem('server-2', 'smithery'),
        createMockItem('server-3', 'glama'),
      ];
      useMcpMarketplaceStore.setState({
        catalog: createMockCatalog(mockItems),
      });

      expect(useMcpMarketplaceStore.getState().getSourceCount('all')).toBe(3);
    });
  });

  describe('getInstallStatus', () => {
    it('returns not_installed for unknown items', () => {
      const result = useMcpMarketplaceStore.getState().getInstallStatus('unknown-server');
      expect(result).toBe('not_installed');
    });

    it('returns correct status for known items', () => {
      useMcpMarketplaceStore.setState({
        installingItems: new Map([['test-server', 'installed']]),
      });

      const result = useMcpMarketplaceStore.getState().getInstallStatus('test-server');
      expect(result).toBe('installed');
    });
  });

  describe('isItemInstalled', () => {
    it('returns false for not installed items', () => {
      const result = useMcpMarketplaceStore.getState().isItemInstalled('unknown-server');
      expect(result).toBe(false);
    });

    it('returns true for installed items', () => {
      useMcpMarketplaceStore.setState({
        installingItems: new Map([['test-server', 'installed']]),
      });

      const result = useMcpMarketplaceStore.getState().isItemInstalled('test-server');
      expect(result).toBe(true);
    });
  });

  describe('clearError', () => {
    it('clears error state', () => {
      useMcpMarketplaceStore.setState({ error: 'Some error' });

      act(() => {
        useMcpMarketplaceStore.getState().clearError();
      });

      const state = useMcpMarketplaceStore.getState();
      expect(state.error).toBeNull();
    });
  });

  describe('favorites', () => {
    it('toggles favorite on', () => {
      act(() => {
        useMcpMarketplaceStore.getState().toggleFavorite('server-1');
      });

      const state = useMcpMarketplaceStore.getState();
      expect(state.favorites.has('server-1')).toBe(true);
    });

    it('toggles favorite off', () => {
      useMcpMarketplaceStore.setState({
        favorites: new Set(['server-1']),
      });

      act(() => {
        useMcpMarketplaceStore.getState().toggleFavorite('server-1');
      });

      const state = useMcpMarketplaceStore.getState();
      expect(state.favorites.has('server-1')).toBe(false);
    });

    it('isFavorite returns correct value', () => {
      useMcpMarketplaceStore.setState({
        favorites: new Set(['server-1', 'server-2']),
      });

      expect(useMcpMarketplaceStore.getState().isFavorite('server-1')).toBe(true);
      expect(useMcpMarketplaceStore.getState().isFavorite('server-2')).toBe(true);
      expect(useMcpMarketplaceStore.getState().isFavorite('server-3')).toBe(false);
    });

    it('getFavoritesCount returns correct count', () => {
      useMcpMarketplaceStore.setState({
        favorites: new Set(['server-1', 'server-2', 'server-3']),
      });

      expect(useMcpMarketplaceStore.getState().getFavoritesCount()).toBe(3);
    });

    it('setShowFavoritesOnly toggles filter and resets page', () => {
      useMcpMarketplaceStore.setState({ currentPage: 3 });

      act(() => {
        useMcpMarketplaceStore.getState().setShowFavoritesOnly(true);
      });

      const state = useMcpMarketplaceStore.getState();
      expect(state.showFavoritesOnly).toBe(true);
      expect(state.currentPage).toBe(1);
    });

    it('filters items by favorites when showFavoritesOnly is true', () => {
      const mockItems = [
        createMockItem('server-1'),
        createMockItem('server-2'),
        createMockItem('server-3'),
      ];
      useMcpMarketplaceStore.setState({
        catalog: createMockCatalog(mockItems),
        favorites: new Set(['server-1', 'server-3']),
        showFavoritesOnly: true,
      });

      const result = useMcpMarketplaceStore.getState().getFilteredItems();
      expect(result.length).toBe(2);
      expect(result.map(i => i.mcpId)).toEqual(['server-1', 'server-3']);
    });
  });

  describe('pagination', () => {
    it('setCurrentPage updates page', () => {
      act(() => {
        useMcpMarketplaceStore.getState().setCurrentPage(5);
      });

      expect(useMcpMarketplaceStore.getState().currentPage).toBe(5);
    });

    it('setItemsPerPage updates items per page and resets to page 1', () => {
      useMcpMarketplaceStore.setState({ currentPage: 3 });

      act(() => {
        useMcpMarketplaceStore.getState().setItemsPerPage(12);
      });

      const state = useMcpMarketplaceStore.getState();
      expect(state.itemsPerPage).toBe(12);
      expect(state.currentPage).toBe(1);
    });

    it('getPaginatedItems returns correct slice', () => {
      const mockItems = Array.from({ length: 30 }, (_, i) => 
        createMockItem(`server-${i + 1}`)
      );
      useMcpMarketplaceStore.setState({
        catalog: createMockCatalog(mockItems),
        itemsPerPage: 10,
        currentPage: 2,
      });

      const result = useMcpMarketplaceStore.getState().getPaginatedItems();
      expect(result.length).toBe(10);
      expect(result[0].mcpId).toBe('server-11');
      expect(result[9].mcpId).toBe('server-20');
    });

    it('getTotalPages calculates correctly', () => {
      const mockItems = Array.from({ length: 25 }, (_, i) => 
        createMockItem(`server-${i + 1}`)
      );
      useMcpMarketplaceStore.setState({
        catalog: createMockCatalog(mockItems),
        itemsPerPage: 10,
      });

      expect(useMcpMarketplaceStore.getState().getTotalPages()).toBe(3);
    });

    it('setFilters resets currentPage to 1', () => {
      useMcpMarketplaceStore.setState({ currentPage: 5 });

      act(() => {
        useMcpMarketplaceStore.getState().setFilters({ search: 'test' });
      });

      expect(useMcpMarketplaceStore.getState().currentPage).toBe(1);
    });
  });

  describe('viewMode', () => {
    it('setViewMode updates view mode', () => {
      expect(useMcpMarketplaceStore.getState().viewMode).toBe('grid');

      act(() => {
        useMcpMarketplaceStore.getState().setViewMode('list');
      });

      expect(useMcpMarketplaceStore.getState().viewMode).toBe('list');
    });

    it('toggles back to grid', () => {
      useMcpMarketplaceStore.setState({ viewMode: 'list' });

      act(() => {
        useMcpMarketplaceStore.getState().setViewMode('grid');
      });

      expect(useMcpMarketplaceStore.getState().viewMode).toBe('grid');
    });
  });
});
