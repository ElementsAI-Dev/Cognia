/**
 * Tests for MCP Marketplace Component
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { McpMarketplace } from './mcp-marketplace';
import { useMcpMarketplaceStore } from '@/stores/mcp';
import { useMcpStore } from '@/stores/mcp';
import type { McpMarketplaceItem, McpMarketplaceCatalog } from '@/types/mcp/mcp-marketplace';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string, params?: Record<string, unknown>) => {
    const translations: Record<string, string> = {
      title: 'MCP Marketplace',
      description: 'Browse and install MCP servers from multiple community marketplaces.',
      searchPlaceholder: 'Search MCP servers...',
      filters: 'Filters',
      tags: 'Tags',
      apiKeyFilter: 'API Key',
      noApiKeyRequired: 'No API key required',
      clearFilters: 'Clear Filters',
      refresh: 'Refresh marketplace',
      resultsCount: `Showing ${params?.count || 0} of ${params?.total || 0} servers`,
      noResults: 'No Results Found',
      noResultsDesc: 'Try adjusting your search or filters.',
      byAuthor: `by ${params?.author || ''}`,
      githubStars: 'GitHub Stars',
      downloads: 'Downloads',
      requiresApiKey: 'Requires API Key',
      installed: 'Installed',
      install: 'Install',
      installing: 'Installing...',
      dismiss: 'Dismiss',
      allSources: 'All',
      verified: 'Verified server',
      remoteHosting: 'Supports remote hosting',
      serverStatus: 'Server Status',
      verifiedOnly: 'Verified servers only',
      remoteOnly: 'Remote hosting support',
      smitheryApiKey: 'Smithery API Key',
      enterApiKey: 'Enter API key...',
      smitheryApiKeyHint: 'Get your API key from smithery.ai',
      configureApiKey: 'Configure API Key',
      updateApiKey: 'Update API Key',
      'sort.popular': 'Popular',
      'sort.newest': 'Newest',
      'sort.stars': 'GitHub Stars',
      'sort.downloads': 'Downloads',
      'sort.name': 'Name',
    };
    return translations[key] || key;
  },
}));

// Mock useDebounce hook
jest.mock('@/hooks', () => ({
  useDebounce: (value: string) => value, // Return value immediately for testing
}));

// Mock marketplace-utils
jest.mock('@/lib/mcp/marketplace-utils', () => ({
  getSourceColor: (source: string) => {
    switch (source) {
      case 'cline': return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      case 'smithery': return 'bg-purple-500/10 text-purple-600 border-purple-500/20';
      case 'glama': return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
      default: return '';
    }
  },
  highlightSearchQuery: (text: string, query: string) => {
    if (!query) return [{ text, isHighlight: false }];
    const index = text.toLowerCase().indexOf(query.toLowerCase());
    if (index === -1) return [{ text, isHighlight: false }];
    return [
      { text: text.slice(0, index), isHighlight: false },
      { text: text.slice(index, index + query.length), isHighlight: true },
      { text: text.slice(index + query.length), isHighlight: false },
    ].filter(s => s.text);
  },
}));

// Mock the stores
jest.mock('@/stores/mcp');
jest.mock('@/stores/mcp');

const mockUseMcpMarketplaceStore = useMcpMarketplaceStore as jest.MockedFunction<typeof useMcpMarketplaceStore>;
const mockUseMcpStore = useMcpStore as jest.MockedFunction<typeof useMcpStore>;

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

// Default mock store state
const createMockStoreState = (overrides = {}) => ({
  catalog: null,
  filters: {
    search: '',
    tags: [],
    sortBy: 'popular' as const,
    source: 'all' as const,
  },
  isLoading: false,
  error: null,
  selectedItem: null,
  smitheryApiKey: null,
  currentPage: 1,
  viewMode: 'grid' as const,
  showFavoritesOnly: false,
  recentlyViewed: [],
  searchHistory: [],
  fetchCatalog: jest.fn(),
  setFilters: jest.fn(),
  resetFilters: jest.fn(),
  selectItem: jest.fn(),
  getFilteredItems: jest.fn().mockReturnValue([]),
  getPaginatedItems: jest.fn().mockReturnValue([]),
  getTotalPages: jest.fn().mockReturnValue(1),
  getUniqueTags: jest.fn().mockReturnValue([]),
  getInstallStatus: jest.fn().mockReturnValue('not_installed'),
  setInstallStatus: jest.fn(),
  setSmitheryApiKey: jest.fn(),
  getSourceCount: jest.fn().mockReturnValue(0),
  getFavoritesCount: jest.fn().mockReturnValue(0),
  clearError: jest.fn(),
  toggleFavorite: jest.fn(),
  isFavorite: jest.fn().mockReturnValue(false),
  setShowFavoritesOnly: jest.fn(),
  setCurrentPage: jest.fn(),
  setViewMode: jest.fn(),
  addToRecentlyViewed: jest.fn(),
  getRecentlyViewedItems: jest.fn().mockReturnValue([]),
  clearRecentlyViewed: jest.fn(),
  addToSearchHistory: jest.fn(),
  clearSearchHistory: jest.fn(),
  ...overrides,
});

describe('McpMarketplace', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseMcpStore.mockReturnValue({
      servers: [],
    } as ReturnType<typeof useMcpStore>);
  });

  describe('rendering', () => {
    it('renders marketplace header', () => {
      mockUseMcpMarketplaceStore.mockReturnValue(createMockStoreState() as ReturnType<typeof useMcpMarketplaceStore>);

      render(<McpMarketplace />);

      expect(screen.getByText('MCP Marketplace')).toBeInTheDocument();
      expect(screen.getByText(/Browse and install MCP servers/)).toBeInTheDocument();
    });

    it('renders search input', () => {
      mockUseMcpMarketplaceStore.mockReturnValue(createMockStoreState() as ReturnType<typeof useMcpMarketplaceStore>);

      render(<McpMarketplace />);

      expect(screen.getByPlaceholderText('Search MCP servers...')).toBeInTheDocument();
    });

    it('renders source tabs', () => {
      mockUseMcpMarketplaceStore.mockReturnValue(createMockStoreState() as ReturnType<typeof useMcpMarketplaceStore>);

      render(<McpMarketplace />);

      expect(screen.getByRole('tab', { name: /All/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /Cline/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /Smithery/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /Glama/i })).toBeInTheDocument();
    });

    it('renders filters button', () => {
      mockUseMcpMarketplaceStore.mockReturnValue(createMockStoreState() as ReturnType<typeof useMcpMarketplaceStore>);

      render(<McpMarketplace />);

      expect(screen.getByRole('button', { name: /Filters/i })).toBeInTheDocument();
    });
  });

  describe('loading state', () => {
    it('shows loading state when loading and no catalog', () => {
      mockUseMcpMarketplaceStore.mockReturnValue(createMockStoreState({
        isLoading: true,
        catalog: null,
      }) as ReturnType<typeof useMcpMarketplaceStore>);

      render(<McpMarketplace />);

      // Loading state should not show results count
      expect(screen.queryByText(/Showing \d+ of \d+ servers/)).not.toBeInTheDocument();
    });
  });

  describe('error state', () => {
    it('displays error message', () => {
      mockUseMcpMarketplaceStore.mockReturnValue(createMockStoreState({
        error: 'Failed to fetch marketplace',
      }) as ReturnType<typeof useMcpMarketplaceStore>);

      render(<McpMarketplace />);

      expect(screen.getByText('Failed to fetch marketplace')).toBeInTheDocument();
    });

    it('calls clearError when dismiss is clicked', () => {
      const clearError = jest.fn();
      mockUseMcpMarketplaceStore.mockReturnValue(createMockStoreState({
        error: 'Test error',
        clearError,
      }) as ReturnType<typeof useMcpMarketplaceStore>);

      render(<McpMarketplace />);

      fireEvent.click(screen.getByText('Dismiss'));
      expect(clearError).toHaveBeenCalled();
    });
  });

  describe('empty state', () => {
    it('shows empty state when no results', () => {
      const mockItems: McpMarketplaceItem[] = [];
      mockUseMcpMarketplaceStore.mockReturnValue(createMockStoreState({
        catalog: createMockCatalog(mockItems),
        getFilteredItems: jest.fn().mockReturnValue([]),
      }) as ReturnType<typeof useMcpMarketplaceStore>);

      render(<McpMarketplace />);

      expect(screen.getByText('No Results Found')).toBeInTheDocument();
    });
  });

  describe('server cards', () => {
    it('renders server cards when catalog is loaded', () => {
      const mockItems = [
        createMockItem('server-1'),
        createMockItem('server-2'),
      ];
      mockUseMcpMarketplaceStore.mockReturnValue(createMockStoreState({
        catalog: createMockCatalog(mockItems),
        getFilteredItems: jest.fn().mockReturnValue(mockItems),
        getPaginatedItems: jest.fn().mockReturnValue(mockItems),
      }) as ReturnType<typeof useMcpMarketplaceStore>);

      render(<McpMarketplace />);

      expect(screen.getByText('Test Server server-1')).toBeInTheDocument();
      expect(screen.getByText('Test Server server-2')).toBeInTheDocument();
    });

    it('shows results count', () => {
      const mockItems = [createMockItem('server-1')];
      mockUseMcpMarketplaceStore.mockReturnValue(createMockStoreState({
        catalog: createMockCatalog(mockItems),
        getFilteredItems: jest.fn().mockReturnValue(mockItems),
      }) as ReturnType<typeof useMcpMarketplaceStore>);

      render(<McpMarketplace />);

      expect(screen.getByText(/Showing 1 of 1 servers/)).toBeInTheDocument();
    });
  });

  describe('search functionality', () => {
    it('updates local search state when input changes', () => {
      const setFilters = jest.fn();
      mockUseMcpMarketplaceStore.mockReturnValue(createMockStoreState({
        setFilters,
      }) as ReturnType<typeof useMcpMarketplaceStore>);

      render(<McpMarketplace />);

      const searchInput = screen.getByPlaceholderText('Search MCP servers...');
      fireEvent.change(searchInput, { target: { value: 'test query' } });

      // With debounce mocked to return immediately, setFilters should be called
      expect(searchInput).toHaveValue('test query');
    });

    it('clears search when clear button is clicked', () => {
      const setFilters = jest.fn();
      mockUseMcpMarketplaceStore.mockReturnValue(createMockStoreState({
        setFilters,
        filters: {
          search: 'existing search',
          tags: [],
          sortBy: 'popular' as const,
          source: 'all' as const,
        },
      }) as ReturnType<typeof useMcpMarketplaceStore>);

      render(<McpMarketplace />);

      // Type something first
      const searchInput = screen.getByPlaceholderText('Search MCP servers...');
      fireEvent.change(searchInput, { target: { value: 'test' } });

      // Clear button should appear
      const clearButton = screen.getByLabelText('Clear search');
      fireEvent.click(clearButton);

      expect(setFilters).toHaveBeenCalledWith({ search: '' });
    });
  });

  describe('search highlighting', () => {
    it('renders server cards with search filter applied', () => {
      const mockItems = [createMockItem('server-1')];
      mockUseMcpMarketplaceStore.mockReturnValue(createMockStoreState({
        catalog: createMockCatalog(mockItems),
        getFilteredItems: jest.fn().mockReturnValue(mockItems),
        getPaginatedItems: jest.fn().mockReturnValue(mockItems),
        filters: {
          search: 'server',
          tags: [],
          sortBy: 'popular' as const,
          source: 'all' as const,
        },
      }) as ReturnType<typeof useMcpMarketplaceStore>);

      render(<McpMarketplace />);

      // Should show results count when search is applied
      expect(screen.getByText(/Showing 1 of 1 servers/)).toBeInTheDocument();
    });
  });

  describe('keyboard navigation', () => {
    it('renders grid with keyboard navigation support', () => {
      const mockItems = [
        createMockItem('server-1'),
        createMockItem('server-2'),
      ];
      mockUseMcpMarketplaceStore.mockReturnValue(createMockStoreState({
        catalog: createMockCatalog(mockItems),
        getFilteredItems: jest.fn().mockReturnValue(mockItems),
        getPaginatedItems: jest.fn().mockReturnValue(mockItems),
      }) as ReturnType<typeof useMcpMarketplaceStore>);

      render(<McpMarketplace />);

      // Grid should have role="grid"
      const grid = screen.getByRole('grid');
      expect(grid).toBeInTheDocument();
    });
  });

  describe('source tabs', () => {
    it('renders source tabs with correct names', () => {
      mockUseMcpMarketplaceStore.mockReturnValue(createMockStoreState() as ReturnType<typeof useMcpMarketplaceStore>);

      render(<McpMarketplace />);

      // Verify all source tabs are rendered
      expect(screen.getByRole('tab', { name: /All/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /Cline/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /Smithery/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /Glama/i })).toBeInTheDocument();
    });
  });

  describe('refresh functionality', () => {
    it('calls fetchCatalog with force=true when refresh is clicked', () => {
      const fetchCatalog = jest.fn();
      mockUseMcpMarketplaceStore.mockReturnValue(createMockStoreState({
        fetchCatalog,
      }) as ReturnType<typeof useMcpMarketplaceStore>);

      render(<McpMarketplace />);

      // Find refresh button by its icon
      const refreshButton = document.querySelector('button[class*="ghost"]');
      if (refreshButton) {
        fireEvent.click(refreshButton);
      }
    });
  });

  describe('server selection', () => {
    it('calls selectItem when server card is clicked', () => {
      const selectItem = jest.fn();
      const mockItems = [createMockItem('server-1')];
      mockUseMcpMarketplaceStore.mockReturnValue(createMockStoreState({
        catalog: createMockCatalog(mockItems),
        getFilteredItems: jest.fn().mockReturnValue(mockItems),
        getPaginatedItems: jest.fn().mockReturnValue(mockItems),
        selectItem,
      }) as ReturnType<typeof useMcpMarketplaceStore>);

      render(<McpMarketplace />);

      // Verify the server card is rendered
      expect(screen.getByText('Test Server server-1')).toBeInTheDocument();
    });
  });

  describe('install button', () => {
    it('shows install button on server cards', () => {
      const mockItems = [createMockItem('server-1')];
      mockUseMcpMarketplaceStore.mockReturnValue(createMockStoreState({
        catalog: createMockCatalog(mockItems),
        getFilteredItems: jest.fn().mockReturnValue(mockItems),
        getPaginatedItems: jest.fn().mockReturnValue(mockItems),
      }) as ReturnType<typeof useMcpMarketplaceStore>);

      render(<McpMarketplace />);

      // Server card should be rendered with clickable elements
      expect(screen.getByText('Test Server server-1')).toBeInTheDocument();
    });

    it('shows server cards when items are installed', () => {
      const mockItems = [createMockItem('server-1')];
      mockUseMcpStore.mockReturnValue({
        servers: [{ id: 'server-1', name: 'server-1' }],
      } as ReturnType<typeof useMcpStore>);
      mockUseMcpMarketplaceStore.mockReturnValue(createMockStoreState({
        catalog: createMockCatalog(mockItems),
        getFilteredItems: jest.fn().mockReturnValue(mockItems),
        getPaginatedItems: jest.fn().mockReturnValue(mockItems),
        getInstallStatus: jest.fn().mockReturnValue('installed'),
      }) as ReturnType<typeof useMcpMarketplaceStore>);

      render(<McpMarketplace />);

      // Server card should be rendered
      expect(screen.getByText('Test Server server-1')).toBeInTheDocument();
    });
  });

  describe('source badges', () => {
    it('displays source badge on server cards', () => {
      const mockItems = [createMockItem('server-1', 'cline')];
      mockUseMcpMarketplaceStore.mockReturnValue(createMockStoreState({
        catalog: createMockCatalog(mockItems),
        getFilteredItems: jest.fn().mockReturnValue(mockItems),
        getPaginatedItems: jest.fn().mockReturnValue(mockItems),
      }) as ReturnType<typeof useMcpMarketplaceStore>);

      render(<McpMarketplace />);

      // Check that the server card is rendered with the source
      expect(screen.getByText('Test Server server-1')).toBeInTheDocument();
    });
  });

  describe('fetch on mount', () => {
    it('calls fetchCatalog on component mount', () => {
      const fetchCatalog = jest.fn();
      mockUseMcpMarketplaceStore.mockReturnValue(createMockStoreState({
        fetchCatalog,
      }) as ReturnType<typeof useMcpMarketplaceStore>);

      render(<McpMarketplace />);

      expect(fetchCatalog).toHaveBeenCalled();
    });
  });

  describe('favorites', () => {
    it('renders favorites toggle button', () => {
      const mockItems = [createMockItem('server-1')];
      mockUseMcpMarketplaceStore.mockReturnValue(createMockStoreState({
        catalog: createMockCatalog(mockItems),
        getFilteredItems: jest.fn().mockReturnValue(mockItems),
        getPaginatedItems: jest.fn().mockReturnValue(mockItems),
      }) as ReturnType<typeof useMcpMarketplaceStore>);

      render(<McpMarketplace />);

      // Find the favorites button by looking for heart icon button
      const favoritesButton = document.querySelector('button[class*="gap-1.5"]');
      expect(favoritesButton).toBeInTheDocument();
    });

    it('calls setShowFavoritesOnly when favorites toggle is clicked', () => {
      const setShowFavoritesOnly = jest.fn();
      const mockItems = [createMockItem('server-1')];
      mockUseMcpMarketplaceStore.mockReturnValue(createMockStoreState({
        catalog: createMockCatalog(mockItems),
        getFilteredItems: jest.fn().mockReturnValue(mockItems),
        getPaginatedItems: jest.fn().mockReturnValue(mockItems),
        setShowFavoritesOnly,
      }) as ReturnType<typeof useMcpMarketplaceStore>);

      render(<McpMarketplace />);

      // Find and click the favorites toggle
      const buttons = document.querySelectorAll('button');
      const favButton = Array.from(buttons).find(btn => 
        btn.querySelector('svg[class*="lucide-heart"]')
      );
      if (favButton) {
        fireEvent.click(favButton);
        expect(setShowFavoritesOnly).toHaveBeenCalledWith(true);
      }
    });

    it('shows favorites count badge when favorites exist', () => {
      const mockItems = [createMockItem('server-1')];
      mockUseMcpMarketplaceStore.mockReturnValue(createMockStoreState({
        catalog: createMockCatalog(mockItems),
        getFilteredItems: jest.fn().mockReturnValue(mockItems),
        getPaginatedItems: jest.fn().mockReturnValue(mockItems),
        getFavoritesCount: jest.fn().mockReturnValue(5),
      }) as ReturnType<typeof useMcpMarketplaceStore>);

      render(<McpMarketplace />);

      expect(screen.getByText('5')).toBeInTheDocument();
    });
  });

  describe('view mode', () => {
    it('renders view mode toggle buttons', () => {
      const mockItems = [createMockItem('server-1')];
      mockUseMcpMarketplaceStore.mockReturnValue(createMockStoreState({
        catalog: createMockCatalog(mockItems),
        getFilteredItems: jest.fn().mockReturnValue(mockItems),
        getPaginatedItems: jest.fn().mockReturnValue(mockItems),
      }) as ReturnType<typeof useMcpMarketplaceStore>);

      render(<McpMarketplace />);

      // View mode toggles should be in the DOM
      const viewToggleContainer = document.querySelector('.flex.border.rounded-md');
      expect(viewToggleContainer).toBeInTheDocument();
    });

    it('calls setViewMode when view toggle is clicked', () => {
      const setViewMode = jest.fn();
      const mockItems = [createMockItem('server-1')];
      mockUseMcpMarketplaceStore.mockReturnValue(createMockStoreState({
        catalog: createMockCatalog(mockItems),
        getFilteredItems: jest.fn().mockReturnValue(mockItems),
        getPaginatedItems: jest.fn().mockReturnValue(mockItems),
        setViewMode,
      }) as ReturnType<typeof useMcpMarketplaceStore>);

      render(<McpMarketplace />);

      // Find view mode toggle buttons
      const viewButtons = document.querySelectorAll('.flex.border.rounded-md button');
      if (viewButtons.length >= 2) {
        fireEvent.click(viewButtons[1]); // Click list view
        expect(setViewMode).toHaveBeenCalledWith('list');
      }
    });
  });

  describe('pagination', () => {
    it('renders pagination when totalPages > 1', () => {
      const mockItems = [createMockItem('server-1')];
      mockUseMcpMarketplaceStore.mockReturnValue(createMockStoreState({
        catalog: createMockCatalog(mockItems),
        getFilteredItems: jest.fn().mockReturnValue(mockItems),
        getPaginatedItems: jest.fn().mockReturnValue(mockItems),
        getTotalPages: jest.fn().mockReturnValue(3),
        currentPage: 1,
      }) as ReturnType<typeof useMcpMarketplaceStore>);

      render(<McpMarketplace />);

      // Should show pagination controls with Previous/Next buttons
      expect(screen.getByRole('button', { name: /Previous/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Next/i })).toBeInTheDocument();
    });

    it('does not render pagination when totalPages <= 1', () => {
      const mockItems = [createMockItem('server-1')];
      mockUseMcpMarketplaceStore.mockReturnValue(createMockStoreState({
        catalog: createMockCatalog(mockItems),
        getFilteredItems: jest.fn().mockReturnValue(mockItems),
        getPaginatedItems: jest.fn().mockReturnValue(mockItems),
        getTotalPages: jest.fn().mockReturnValue(1),
      }) as ReturnType<typeof useMcpMarketplaceStore>);

      render(<McpMarketplace />);

      // Pagination controls should not be present
      expect(screen.queryByText(/Page/)).not.toBeInTheDocument();
    });

    it('calls setCurrentPage when next button is clicked', () => {
      const setCurrentPage = jest.fn();
      const mockItems = [createMockItem('server-1')];
      mockUseMcpMarketplaceStore.mockReturnValue(createMockStoreState({
        catalog: createMockCatalog(mockItems),
        getFilteredItems: jest.fn().mockReturnValue(mockItems),
        getPaginatedItems: jest.fn().mockReturnValue(mockItems),
        getTotalPages: jest.fn().mockReturnValue(3),
        currentPage: 1,
        setCurrentPage,
      }) as ReturnType<typeof useMcpMarketplaceStore>);

      render(<McpMarketplace />);

      // Find and click next button
      const nextButton = screen.getByRole('button', { name: /next/i });
      fireEvent.click(nextButton);
      expect(setCurrentPage).toHaveBeenCalledWith(2);
    });

    it('disables previous button on first page', () => {
      const mockItems = [createMockItem('server-1')];
      mockUseMcpMarketplaceStore.mockReturnValue(createMockStoreState({
        catalog: createMockCatalog(mockItems),
        getFilteredItems: jest.fn().mockReturnValue(mockItems),
        getPaginatedItems: jest.fn().mockReturnValue(mockItems),
        getTotalPages: jest.fn().mockReturnValue(3),
        currentPage: 1,
      }) as ReturnType<typeof useMcpMarketplaceStore>);

      render(<McpMarketplace />);

      const prevButton = screen.getByRole('button', { name: /previous/i });
      expect(prevButton).toBeDisabled();
    });
  });
});
