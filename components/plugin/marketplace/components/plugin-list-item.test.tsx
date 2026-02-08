'use client';

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PluginListItem } from './plugin-list-item';
import type { MarketplacePlugin } from './marketplace-types';

const mockPlugin: MarketplacePlugin = {
  id: 'test-plugin',
  name: 'Test Plugin',
  description: 'A test plugin description',
  version: '1.0.0',
  author: { name: 'Test Author', verified: false },
  type: 'frontend',
  capabilities: ['tools', 'components'],
  tags: ['test'],
  rating: 4.5,
  reviewCount: 50,
  downloadCount: 25000,
  verified: true,
  featured: true,
  trending: true,
  lastUpdated: '2024-01-15',
  installed: false,
};

describe('PluginListItem', () => {
  const mockHandlers = {
    onInstall: jest.fn().mockResolvedValue(undefined),
    onViewDetails: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders plugin name', () => {
    render(<PluginListItem plugin={mockPlugin} {...mockHandlers} />);
    expect(screen.getByText('Test Plugin')).toBeInTheDocument();
  });

  it('renders description', () => {
    render(<PluginListItem plugin={mockPlugin} {...mockHandlers} />);
    expect(screen.getByText('A test plugin description')).toBeInTheDocument();
  });

  it('renders trending badge when trending', () => {
    render(<PluginListItem plugin={mockPlugin} {...mockHandlers} />);
    expect(screen.getByText('Hot')).toBeInTheDocument();
  });

  it('renders featured badge when featured', () => {
    render(<PluginListItem plugin={mockPlugin} {...mockHandlers} />);
    expect(screen.getByText('Featured')).toBeInTheDocument();
  });

  it('renders rating', () => {
    render(<PluginListItem plugin={mockPlugin} {...mockHandlers} />);
    const ratings = screen.getAllByText('4.5');
    expect(ratings.length).toBeGreaterThan(0);
  });

  it('renders download count', () => {
    render(<PluginListItem plugin={mockPlugin} {...mockHandlers} />);
    const downloads = screen.getAllByText('25k');
    expect(downloads.length).toBeGreaterThan(0);
  });

  it('calls onInstall when install clicked', async () => {
    render(<PluginListItem plugin={mockPlugin} {...mockHandlers} />);
    const installBtn = screen.getByRole('button', { name: /install/i });
    fireEvent.click(installBtn);
    await waitFor(() => {
      expect(mockHandlers.onInstall).toHaveBeenCalledWith('test-plugin');
    });
  });

  it('calls onViewDetails when row clicked', () => {
    render(<PluginListItem plugin={mockPlugin} {...mockHandlers} />);
    fireEvent.click(screen.getByText('Test Plugin'));
    expect(mockHandlers.onViewDetails).toHaveBeenCalledWith(mockPlugin);
  });

  it('shows installed state', () => {
    render(
      <PluginListItem
        plugin={{ ...mockPlugin, installed: true }}
        {...mockHandlers}
      />
    );
    expect(screen.getByText('Installed')).toBeInTheDocument();
  });

  it('renders verified badge', () => {
    const { container } = render(
      <PluginListItem plugin={mockPlugin} {...mockHandlers} />
    );
    const verifiedIcon = container.querySelector('.text-blue-500');
    expect(verifiedIcon).toBeInTheDocument();
  });

  it('renders capability badges', () => {
    render(<PluginListItem plugin={mockPlugin} {...mockHandlers} />);
    expect(screen.getByText('tools')).toBeInTheDocument();
    expect(screen.getByText('components')).toBeInTheDocument();
  });

  it('renders unfilled heart when not favorite', () => {
    const { container } = render(
      <PluginListItem plugin={mockPlugin} {...mockHandlers} isFavorite={false} />
    );
    const heart = container.querySelector('.lucide-heart');
    expect(heart).toBeInTheDocument();
    expect(heart).not.toHaveClass('fill-red-500');
  });

  it('renders filled heart when favorite', () => {
    const { container } = render(
      <PluginListItem plugin={mockPlugin} {...mockHandlers} isFavorite={true} />
    );
    const heart = container.querySelector('.lucide-heart');
    expect(heart).toBeInTheDocument();
    expect(heart).toHaveClass('fill-red-500');
  });

  it('calls onToggleFavorite when heart clicked', () => {
    const onToggleFavorite = jest.fn();
    const { container } = render(
      <PluginListItem
        plugin={mockPlugin}
        {...mockHandlers}
        isFavorite={false}
        onToggleFavorite={onToggleFavorite}
      />
    );
    const heartButton = container.querySelector('.lucide-heart')?.closest('button');
    expect(heartButton).toBeInTheDocument();
    fireEvent.click(heartButton!);
    expect(onToggleFavorite).toHaveBeenCalledWith('test-plugin');
  });
});
