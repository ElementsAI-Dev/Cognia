'use client';

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { PluginMarketplace } from './plugin-marketplace';

jest.mock('@/stores/plugin', () => ({
  usePluginStore: () => ({
    plugins: {},
  }),
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
    onInstall: jest.fn().mockResolvedValue(undefined),
    onViewDetails: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
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
});
