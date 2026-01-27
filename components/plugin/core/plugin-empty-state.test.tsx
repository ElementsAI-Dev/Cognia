'use client';

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { PluginEmptyState } from './plugin-empty-state';

const messages = {
  pluginEmptyState: {
    noPlugins: {
      title: 'No plugins installed',
      description: 'Get started by browsing the marketplace',
      browseMarketplace: 'Browse Marketplace',
      createPlugin: 'Create Plugin',
      importPlugin: 'Import Plugin',
      tip: 'Tip: Start with popular plugins',
    },
    noResults: {
      title: 'No results found',
      searchDescription: 'No plugins match "{query}"',
      filterDescription: 'No plugins match your filters',
      clearFilters: 'Clear Filters',
      browseMore: 'Browse More',
      suggestions: 'Try these searches:',
    },
    noEnabled: {
      title: 'No enabled plugins',
      description: 'Enable some plugins to get started',
      viewAll: 'View All',
    },
    noDisabled: {
      title: 'No disabled plugins',
      description: 'All plugins are currently enabled',
      viewAll: 'View All',
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

describe('PluginEmptyState', () => {
  const mockHandlers = {
    onCreatePlugin: jest.fn(),
    onBrowseMarketplace: jest.fn(),
    onImportPlugin: jest.fn(),
    onClearFilters: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('no-plugins variant', () => {
    it('renders no plugins title', () => {
      renderWithProviders(
        <PluginEmptyState variant="no-plugins" {...mockHandlers} />
      );
      expect(screen.getByText('No plugins installed')).toBeInTheDocument();
    });

    it('renders action buttons', () => {
      renderWithProviders(
        <PluginEmptyState variant="no-plugins" {...mockHandlers} />
      );
      expect(screen.getByText('Browse Marketplace')).toBeInTheDocument();
      expect(screen.getByText('Create Plugin')).toBeInTheDocument();
      expect(screen.getByText('Import Plugin')).toBeInTheDocument();
    });

    it('calls onBrowseMarketplace when clicked', () => {
      renderWithProviders(
        <PluginEmptyState variant="no-plugins" {...mockHandlers} />
      );
      fireEvent.click(screen.getByText('Browse Marketplace'));
      expect(mockHandlers.onBrowseMarketplace).toHaveBeenCalled();
    });

    it('calls onCreatePlugin when clicked', () => {
      renderWithProviders(
        <PluginEmptyState variant="no-plugins" {...mockHandlers} />
      );
      fireEvent.click(screen.getByText('Create Plugin'));
      expect(mockHandlers.onCreatePlugin).toHaveBeenCalled();
    });

    it('calls onImportPlugin when clicked', () => {
      renderWithProviders(
        <PluginEmptyState variant="no-plugins" {...mockHandlers} />
      );
      fireEvent.click(screen.getByText('Import Plugin'));
      expect(mockHandlers.onImportPlugin).toHaveBeenCalled();
    });
  });

  describe('no-results variant', () => {
    it('renders no results title', () => {
      renderWithProviders(
        <PluginEmptyState variant="no-results" {...mockHandlers} />
      );
      expect(screen.getByText('No results found')).toBeInTheDocument();
    });

    it('shows search query in description', () => {
      renderWithProviders(
        <PluginEmptyState
          variant="no-results"
          searchQuery="test"
          {...mockHandlers}
        />
      );
      expect(screen.getByText(/test/)).toBeInTheDocument();
    });

    it('renders clear filters button', () => {
      renderWithProviders(
        <PluginEmptyState variant="no-results" {...mockHandlers} />
      );
      expect(screen.getByText('Clear Filters')).toBeInTheDocument();
    });

    it('calls onClearFilters when clicked', () => {
      renderWithProviders(
        <PluginEmptyState variant="no-results" {...mockHandlers} />
      );
      fireEvent.click(screen.getByText('Clear Filters'));
      expect(mockHandlers.onClearFilters).toHaveBeenCalled();
    });
  });

  describe('no-enabled variant', () => {
    it('renders no enabled title', () => {
      renderWithProviders(
        <PluginEmptyState variant="no-enabled" {...mockHandlers} />
      );
      expect(screen.getByText('No enabled plugins')).toBeInTheDocument();
    });

    it('renders view all button', () => {
      renderWithProviders(
        <PluginEmptyState variant="no-enabled" {...mockHandlers} />
      );
      expect(screen.getByText('View All')).toBeInTheDocument();
    });
  });

  describe('no-disabled variant', () => {
    it('renders no disabled title', () => {
      renderWithProviders(
        <PluginEmptyState variant="no-disabled" {...mockHandlers} />
      );
      expect(screen.getByText('No disabled plugins')).toBeInTheDocument();
    });
  });

  it('applies custom className', () => {
    const { container } = renderWithProviders(
      <PluginEmptyState
        variant="no-plugins"
        className="custom-class"
        {...mockHandlers}
      />
    );
    expect(container.firstChild).toHaveClass('custom-class');
  });
});
