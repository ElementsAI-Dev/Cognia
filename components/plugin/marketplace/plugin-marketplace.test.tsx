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
    trending: {
      title: 'Trending',
      viewAll: 'View All',
    },
    search: {
      placeholder: 'Search plugins...',
    },
    sort: {
      popular: 'Popular',
      rating: 'Rating',
      recent: 'Recent',
      downloads: 'Downloads',
    },
    results: {
      count: '{count} plugins found',
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
    expect(screen.getByText('All')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = renderWithProviders(
      <PluginMarketplace {...mockHandlers} className="custom-class" />
    );
    expect(container.firstChild).toHaveClass('custom-class');
  });
});
