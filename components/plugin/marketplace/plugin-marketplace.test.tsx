'use client';

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { PluginMarketplace } from './plugin-marketplace';

const mockSetViewMode = jest.fn();
const mockUseMarketplace = jest.fn();

jest.mock('@/stores/plugin', () => ({
  usePluginStore: () => ({
    plugins: {},
  }),
}));

jest.mock('@/stores/plugin/plugin-marketplace-store', () => ({
  usePluginMarketplaceStore: () => ({
    viewMode: 'grid',
    setViewMode: mockSetViewMode,
    searchHistory: [],
    addSearchHistory: jest.fn(),
    clearSearchHistory: jest.fn(),
    recentlyViewed: [],
    favorites: {},
  }),
}));

jest.mock('@/hooks/plugin/use-marketplace', () => ({
  useMarketplace: () => mockUseMarketplace(),
}));

const messages = {
  pluginMarketplace: {
    featured: {
      title: 'Featured Plugins',
    },
    favorites: {
      title: 'My Favorites',
    },
    trending: {
      title: 'Trending',
      viewAll: 'View All',
    },
    collectionsSection: {
      title: 'Collections',
    },
    recentlyViewed: {
      title: 'Recently Viewed',
    },
    search: {
      placeholder: 'Search plugins...',
      recentSearches: 'Recent searches',
      clearHistory: 'Clear',
    },
    sort: {
      popular: 'Popular',
      rating: 'Rating',
      recent: 'Recent',
      downloads: 'Downloads',
    },
    filters: {
      title: 'Filters',
      category: 'Category',
      sortBy: 'Sort by',
      clearAll: 'Clear all filters',
    },
    stats: {
      plugins: 'Plugins',
      downloads: 'Downloads',
      developers: 'Developers',
      thisWeek: 'This Week',
    },
    empty: {
      noResults: 'No plugins found',
      noMatch: 'No plugins match "{query}".',
      noFilters: 'No plugins available.',
      clearSearch: 'Clear Search',
      refresh: 'Refresh',
      popularSearches: 'Popular searches:',
    },
    error: {
      retry: 'Retry',
    },
    results: {
      count: '{count} plugins found',
      loadMore: 'Load More',
    },
  },
};

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      {ui}
    </NextIntlClientProvider>
  );
};

describe('PluginMarketplace', () => {
  const mockHandlers = {
    onViewDetails: jest.fn(),
  };

  const basePlugin = {
    id: 'plugin-1',
    name: 'Plugin One',
    description: 'Test plugin',
    author: { name: 'Author', verified: true },
    version: '1.0.0',
    latestVersion: '1.0.0',
    type: 'tool',
    capabilities: ['tools'],
    rating: 4.5,
    reviewCount: 10,
    downloadCount: 1000,
    lastUpdated: '2026-03-10',
    tags: ['test'],
    featured: true,
    trending: true,
    verified: true,
    installed: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseMarketplace.mockReturnValue({
      plugins: [basePlugin],
      featuredPlugins: [basePlugin],
      trendingPlugins: [basePlugin],
      isLoading: false,
      error: null,
      sourceMode: 'remote',
      sourceErrorCategory: undefined,
      sourceErrorMessage: undefined,
      query: '',
      sortBy: 'popular',
      categoryFilter: 'all',
      quickFilter: 'all',
      setQuery: jest.fn(),
      setSortBy: jest.fn(),
      setCategoryFilter: jest.fn(),
      setQuickFilter: jest.fn(),
      setPage: jest.fn(),
      page: 1,
      refresh: jest.fn(),
      installPlugin: jest.fn().mockResolvedValue({ success: true }),
      updatePlugin: jest.fn().mockResolvedValue({ success: true }),
      retryPluginOperation: jest.fn().mockResolvedValue({ success: true }),
      getVersions: jest.fn().mockResolvedValue([]),
      getInstallProgress: jest.fn(),
      getOperationError: jest.fn().mockReturnValue({}),
      isFavorite: jest.fn().mockReturnValue(false),
      toggleFavorite: jest.fn(),
    });
  });

  it('renders marketplace', () => {
    renderWithProviders(<PluginMarketplace {...mockHandlers} />);
    expect(screen.getByText('Featured Plugins')).toBeInTheDocument();
  });

  it('renders trending section', () => {
    renderWithProviders(<PluginMarketplace {...mockHandlers} />);
    expect(screen.getByText('Trending')).toBeInTheDocument();
  });

  it('renders search input', () => {
    renderWithProviders(<PluginMarketplace {...mockHandlers} />);
    const searchInputs = screen.getAllByPlaceholderText(/search/i);
    expect(searchInputs.length).toBeGreaterThan(0);
  });

  it('filters plugins on search', () => {
    renderWithProviders(<PluginMarketplace {...mockHandlers} />);
    const searchInputs = screen.getAllByPlaceholderText(/search/i);
    fireEvent.change(searchInputs[0], { target: { value: 'code' } });
    expect(searchInputs[0]).toHaveValue('code');
  });

  it('renders view mode toggle', () => {
    renderWithProviders(<PluginMarketplace {...mockHandlers} />);
    const gridButtons = screen.getAllByRole('button');
    expect(gridButtons.length).toBeGreaterThan(0);
  });

  it('renders collections section', () => {
    renderWithProviders(<PluginMarketplace {...mockHandlers} />);
    expect(screen.getByText('Collections')).toBeInTheDocument();
  });

  it('renders quick filters', () => {
    renderWithProviders(<PluginMarketplace {...mockHandlers} />);
    expect(screen.getAllByText('All').length).toBeGreaterThan(0);
  });

  it('applies custom className', () => {
    const { container } = renderWithProviders(
      <PluginMarketplace {...mockHandlers} className="custom-class" />
    );
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('respects canonical source filter when rendering plugin results', () => {
    mockUseMarketplace.mockReturnValue({
      plugins: [
        { ...basePlugin, id: 'market', name: 'Market Plugin', source: 'marketplace' },
        { ...basePlugin, id: 'dev', name: 'Dev Plugin', source: 'dev', featured: false, trending: false },
      ],
      featuredPlugins: [],
      trendingPlugins: [],
      isLoading: false,
      error: null,
      sourceMode: 'remote',
      sourceErrorCategory: undefined,
      sourceErrorMessage: undefined,
      query: '',
      sortBy: 'popular',
      categoryFilter: 'all',
      quickFilter: 'all',
      sourceFilter: 'dev',
      compatibilityFilter: 'all',
      setQuery: jest.fn(),
      setSortBy: jest.fn(),
      setCategoryFilter: jest.fn(),
      setQuickFilter: jest.fn(),
      setSourceFilter: jest.fn(),
      setCompatibilityFilter: jest.fn(),
      setPage: jest.fn(),
      page: 1,
      refresh: jest.fn(),
      installPlugin: jest.fn().mockResolvedValue({ success: true }),
      updatePlugin: jest.fn().mockResolvedValue({ success: true }),
      retryPluginOperation: jest.fn().mockResolvedValue({ success: true }),
      getVersions: jest.fn().mockResolvedValue([]),
      getInstallProgress: jest.fn(),
      getOperationError: jest.fn().mockReturnValue({}),
      isFavorite: jest.fn().mockReturnValue(false),
      toggleFavorite: jest.fn(),
    });

    renderWithProviders(<PluginMarketplace {...mockHandlers} />);

    expect(screen.getByText('Dev Plugin')).toBeInTheDocument();
    expect(screen.queryByText('Market Plugin')).not.toBeInTheDocument();
  });
});
