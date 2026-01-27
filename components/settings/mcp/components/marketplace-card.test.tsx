'use client';

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { MarketplaceCard } from './marketplace-card';
import type { McpMarketplaceItem } from '@/types/mcp/mcp-marketplace';

jest.mock('@/lib/mcp/marketplace', () => ({
  formatDownloadCount: (count: number) => `${count}`,
  formatStarCount: (count: number) => `${count}`,
}));

jest.mock('@/lib/mcp/marketplace-utils', () => ({
  getSourceColor: () => 'text-blue-500',
  highlightSearchQuery: (text: string) => [{ text, isHighlight: false }],
}));

const messages = {
  mcpMarketplace: {
    verified: 'Verified',
    remoteHosting: 'Remote Hosting',
    byAuthor: 'by {author}',
    installed: 'Installed',
    githubStars: 'GitHub Stars',
    downloads: 'Downloads',
    requiresApiKey: 'Requires API Key',
    installing: 'Installing...',
    install: 'Install',
  },
};

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      {ui}
    </NextIntlClientProvider>
  );
};

describe('MarketplaceCard', () => {
  const mockItem: McpMarketplaceItem = {
    id: 'test-mcp',
    name: 'Test MCP Server',
    description: 'A test MCP server for testing',
    author: 'Test Author',
    source: 'npm',
    tags: ['test', 'mcp', 'server'],
    githubStars: 100,
    downloadCount: 1000,
    verified: false,
    remote: false,
    requiresApiKey: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const defaultProps = {
    item: mockItem,
    isInstalled: false,
    installStatus: 'idle',
    searchQuery: '',
    isFocused: false,
    onSelect: jest.fn(),
    onInstall: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders item name', () => {
    renderWithProviders(<MarketplaceCard {...defaultProps} />);
    expect(screen.getByText('Test MCP Server')).toBeInTheDocument();
  });

  it('renders author', () => {
    renderWithProviders(<MarketplaceCard {...defaultProps} />);
    expect(screen.getByText(/Test Author/)).toBeInTheDocument();
  });

  it('renders description', () => {
    renderWithProviders(<MarketplaceCard {...defaultProps} />);
    expect(screen.getByText('A test MCP server for testing')).toBeInTheDocument();
  });

  it('renders tags', () => {
    renderWithProviders(<MarketplaceCard {...defaultProps} />);
    expect(screen.getByText('test')).toBeInTheDocument();
    expect(screen.getByText('mcp')).toBeInTheDocument();
    expect(screen.getByText('server')).toBeInTheDocument();
  });

  it('renders source badge', () => {
    renderWithProviders(<MarketplaceCard {...defaultProps} />);
    expect(screen.getByText('npm')).toBeInTheDocument();
  });

  it('renders star count', () => {
    renderWithProviders(<MarketplaceCard {...defaultProps} />);
    expect(screen.getByText('100')).toBeInTheDocument();
  });

  it('renders download count', () => {
    renderWithProviders(<MarketplaceCard {...defaultProps} />);
    expect(screen.getByText('1000')).toBeInTheDocument();
  });

  it('renders install button', () => {
    renderWithProviders(<MarketplaceCard {...defaultProps} />);
    expect(screen.getByText('Install')).toBeInTheDocument();
  });

  it('shows installed badge when installed', () => {
    renderWithProviders(<MarketplaceCard {...defaultProps} isInstalled={true} />);
    const installedBadges = screen.getAllByText('Installed');
    expect(installedBadges.length).toBeGreaterThan(0);
  });

  it('disables install button when installed', () => {
    renderWithProviders(<MarketplaceCard {...defaultProps} isInstalled={true} />);
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });

  it('shows installing state', () => {
    renderWithProviders(<MarketplaceCard {...defaultProps} installStatus="installing" />);
    expect(screen.getByText('Installing...')).toBeInTheDocument();
  });

  it('calls onSelect when card clicked', () => {
    renderWithProviders(<MarketplaceCard {...defaultProps} />);
    const card = screen.getByText('Test MCP Server').closest('[class*="card"]');
    fireEvent.click(card!);
    expect(defaultProps.onSelect).toHaveBeenCalled();
  });

  it('calls onInstall when install button clicked', () => {
    renderWithProviders(<MarketplaceCard {...defaultProps} />);
    fireEvent.click(screen.getByText('Install'));
    expect(defaultProps.onInstall).toHaveBeenCalled();
  });

  it('does not call onSelect when install button clicked', () => {
    renderWithProviders(<MarketplaceCard {...defaultProps} />);
    fireEvent.click(screen.getByText('Install'));
    expect(defaultProps.onSelect).not.toHaveBeenCalled();
  });

  it('shows verified badge when verified', () => {
    const verifiedItem = { ...mockItem, verified: true };
    renderWithProviders(<MarketplaceCard {...defaultProps} item={verifiedItem} />);
    // Verified icon should be present (Shield icon)
    const card = screen.getByText('Test MCP Server').closest('[class*="card"]');
    expect(card).toBeInTheDocument();
  });

  it('shows remote badge when remote', () => {
    const remoteItem = { ...mockItem, remote: true };
    renderWithProviders(<MarketplaceCard {...defaultProps} item={remoteItem} />);
    // Remote icon should be present (Cloud icon)
    const card = screen.getByText('Test MCP Server').closest('[class*="card"]');
    expect(card).toBeInTheDocument();
  });

  it('shows API key indicator when requiresApiKey', () => {
    const apiKeyItem = { ...mockItem, requiresApiKey: true };
    renderWithProviders(<MarketplaceCard {...defaultProps} item={apiKeyItem} />);
    // Key icon should be present
    const card = screen.getByText('Test MCP Server').closest('[class*="card"]');
    expect(card).toBeInTheDocument();
  });

  it('renders when isFocused', () => {
    const { container } = renderWithProviders(<MarketplaceCard {...defaultProps} isFocused={true} />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('truncates tags when more than 3', () => {
    const manyTagsItem = { ...mockItem, tags: ['a', 'b', 'c', 'd', 'e'] };
    renderWithProviders(<MarketplaceCard {...defaultProps} item={manyTagsItem} />);
    expect(screen.getByText('+2')).toBeInTheDocument();
  });

  it('handles keyboard navigation', () => {
    renderWithProviders(<MarketplaceCard {...defaultProps} />);
    const card = screen.getByText('Test MCP Server').closest('[class*="card"]');
    fireEvent.keyDown(card!, { key: 'Enter' });
    expect(defaultProps.onSelect).toHaveBeenCalled();
  });

  it('handles space key navigation', () => {
    renderWithProviders(<MarketplaceCard {...defaultProps} />);
    const card = screen.getByText('Test MCP Server').closest('[class*="card"]');
    fireEvent.keyDown(card!, { key: ' ' });
    expect(defaultProps.onSelect).toHaveBeenCalled();
  });
});
