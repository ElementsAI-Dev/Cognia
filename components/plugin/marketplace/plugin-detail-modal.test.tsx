'use client';

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { PluginDetailModal } from './plugin-detail-modal';
import type { MarketplacePlugin } from './plugin-marketplace';

const messages = {
  pluginDetail: {
    install: 'Install',
    installed: 'Installed',
    installing: 'Installing...',
    tabs: {
      overview: 'Overview',
      reviews: 'Reviews',
      changelog: 'Changelog',
    },
    overview: {
      description: 'Description',
      capabilities: 'Capabilities',
      tags: 'Tags',
      version: 'Version',
      type: 'Type',
      lastUpdated: 'Last Updated',
      license: 'License',
      links: 'Links',
      requirements: 'Requirements',
    },
    reviews: {
      title: 'Reviews',
      writeReview: 'Write Review',
    },
    changelog: {
      title: 'Changelog',
    },
  },
};

const mockPlugin: MarketplacePlugin = {
  id: 'test-plugin',
  name: 'Test Plugin',
  description: 'A test plugin for testing',
  version: '1.0.0',
  author: { name: 'Test Author', verified: true },
  type: 'frontend',
  capabilities: ['tools', 'components'],
  tags: ['test', 'demo'],
  rating: 4.5,
  reviewCount: 100,
  downloadCount: 50000,
  verified: true,
  featured: false,
  trending: false,
  lastUpdated: '2024-01-15',
  installed: false,
};

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      {ui}
    </NextIntlClientProvider>
  );
};

describe('PluginDetailModal', () => {
  const mockHandlers = {
    onOpenChange: jest.fn(),
    onInstall: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders nothing when plugin is null', () => {
    const { container } = renderWithProviders(
      <PluginDetailModal plugin={null} open={true} {...mockHandlers} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders plugin name', () => {
    renderWithProviders(
      <PluginDetailModal plugin={mockPlugin} open={true} {...mockHandlers} />
    );
    expect(screen.getAllByText('Test Plugin').length).toBeGreaterThan(0);
  });

  it('renders author name', () => {
    renderWithProviders(
      <PluginDetailModal plugin={mockPlugin} open={true} {...mockHandlers} />
    );
    expect(screen.getByText('Test Author')).toBeInTheDocument();
  });

  it('renders install button', () => {
    renderWithProviders(
      <PluginDetailModal plugin={mockPlugin} open={true} {...mockHandlers} />
    );
    expect(screen.getByRole('button', { name: /install/i })).toBeInTheDocument();
  });

  it('shows installed state', () => {
    renderWithProviders(
      <PluginDetailModal
        plugin={{ ...mockPlugin, installed: true }}
        open={true}
        {...mockHandlers}
      />
    );
    expect(screen.getByText('Installed')).toBeInTheDocument();
  });

  it('calls onInstall when install clicked', async () => {
    renderWithProviders(
      <PluginDetailModal plugin={mockPlugin} open={true} {...mockHandlers} />
    );
    fireEvent.click(screen.getByRole('button', { name: /install/i }));
    await waitFor(() => {
      expect(mockHandlers.onInstall).toHaveBeenCalledWith('test-plugin');
    });
  });

  it('renders tabs', () => {
    renderWithProviders(
      <PluginDetailModal plugin={mockPlugin} open={true} {...mockHandlers} />
    );
    expect(screen.getByText('Overview')).toBeInTheDocument();
    expect(screen.getByText('Reviews')).toBeInTheDocument();
    expect(screen.getByText('Changelog')).toBeInTheDocument();
  });

  it('renders plugin description', () => {
    renderWithProviders(
      <PluginDetailModal plugin={mockPlugin} open={true} {...mockHandlers} />
    );
    expect(screen.getByText('A test plugin for testing')).toBeInTheDocument();
  });

  it('renders capabilities badges', () => {
    renderWithProviders(
      <PluginDetailModal plugin={mockPlugin} open={true} {...mockHandlers} />
    );
    expect(screen.getByText('tools')).toBeInTheDocument();
    expect(screen.getByText('components')).toBeInTheDocument();
  });

  it('renders rating', () => {
    renderWithProviders(
      <PluginDetailModal plugin={mockPlugin} open={true} {...mockHandlers} />
    );
    expect(screen.getByText('4.5')).toBeInTheDocument();
  });

  it('renders download count', () => {
    renderWithProviders(
      <PluginDetailModal plugin={mockPlugin} open={true} {...mockHandlers} />
    );
    expect(screen.getByText('50k')).toBeInTheDocument();
  });

  it('renders as dialog variant', () => {
    renderWithProviders(
      <PluginDetailModal
        plugin={mockPlugin}
        open={true}
        variant="dialog"
        {...mockHandlers}
      />
    );
    expect(screen.getAllByText('Test Plugin').length).toBeGreaterThan(0);
  });
});
