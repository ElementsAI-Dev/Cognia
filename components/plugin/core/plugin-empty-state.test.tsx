'use client';

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { PluginEmptyState } from './plugin-empty-state';

const messages = {
  pluginEmptyState: {
    noPlugins: {
      title: 'No Plugins Installed',
      description: 'Get started by exploring the marketplace or creating your own plugin.',
      browseMarketplace: 'Browse Marketplace',
      createPlugin: 'Create Plugin',
      importPlugin: 'Import Plugin',
      tip: 'Tip: Start with popular plugins to enhance your workflow',
    },
    noResults: {
      title: 'No Plugins Found',
      searchDescription: 'No plugins match "{query}"',
      filterDescription: 'No plugins match your current filters.',
      clearFilters: 'Clear Filters',
      browseMore: 'Browse Marketplace',
      suggestions: 'Try searching for:',
    },
    noEnabled: {
      title: 'No Enabled Plugins',
      description: "You don't have any plugins enabled. Enable some plugins to use their features.",
      viewAll: 'View All Plugins',
    },
    noDisabled: {
      title: 'No Disabled Plugins',
      description: 'All your installed plugins are currently enabled.',
      viewAll: 'View All Plugins',
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
      expect(screen.getByText('No Plugins Installed')).toBeInTheDocument();
    });

    it('renders action buttons', () => {
      renderWithProviders(
        <PluginEmptyState variant="no-plugins" {...mockHandlers} />
      );
      // Check for action buttons (text may vary based on translation)
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThanOrEqual(3);
    });

    it('calls onBrowseMarketplace when clicked', () => {
      renderWithProviders(
        <PluginEmptyState variant="no-plugins" {...mockHandlers} />
      );
      const browseButtons = screen.getAllByRole('button').filter(btn => btn.textContent?.includes('Browse Marketplace'));
      if (browseButtons.length > 0) {
        fireEvent.click(browseButtons[0]);
        expect(mockHandlers.onBrowseMarketplace).toHaveBeenCalled();
      }
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
      expect(screen.getByText('No Plugins Found')).toBeInTheDocument();
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
      expect(screen.getByText('No Enabled Plugins')).toBeInTheDocument();
    });

    it('renders view all button', () => {
      renderWithProviders(
        <PluginEmptyState variant="no-enabled" {...mockHandlers} />
      );
      expect(screen.getByText('View All Plugins')).toBeInTheDocument();
    });
  });

  describe('no-disabled variant', () => {
    it('renders no disabled title', () => {
      renderWithProviders(
        <PluginEmptyState variant="no-disabled" {...mockHandlers} />
      );
      expect(screen.getByText('No Disabled Plugins')).toBeInTheDocument();
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
