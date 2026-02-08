'use client';

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FeaturedPluginCard } from './featured-plugin-card';
import type { MarketplacePlugin } from './marketplace-types';

jest.mock('@/stores', () => ({
  useSettingsStore: () => ({
    backgroundSettings: {
      enabled: false,
      source: 'none',
    },
  }),
}));

const mockPlugin: MarketplacePlugin = {
  id: 'test-plugin',
  name: 'Test Plugin',
  description: 'A test plugin for testing purposes',
  version: '1.0.0',
  author: { name: 'Test Author', verified: true },
  type: 'frontend',
  capabilities: ['tools', 'components', 'themes'],
  tags: ['test'],
  rating: 4.5,
  reviewCount: 100,
  downloadCount: 50000,
  verified: true,
  featured: true,
  trending: false,
  lastUpdated: '2024-01-15',
  installed: false,
};

describe('FeaturedPluginCard', () => {
  const mockHandlers = {
    onInstall: jest.fn().mockResolvedValue(undefined),
    onViewDetails: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders plugin name', () => {
    render(<FeaturedPluginCard plugin={mockPlugin} {...mockHandlers} />);
    expect(screen.getByText('Test Plugin')).toBeInTheDocument();
  });

  it('renders author name', () => {
    render(<FeaturedPluginCard plugin={mockPlugin} {...mockHandlers} />);
    expect(screen.getByText('Test Author')).toBeInTheDocument();
  });

  it('renders description', () => {
    render(<FeaturedPluginCard plugin={mockPlugin} {...mockHandlers} />);
    expect(screen.getByText('A test plugin for testing purposes')).toBeInTheDocument();
  });

  it('renders featured badge', () => {
    render(<FeaturedPluginCard plugin={mockPlugin} {...mockHandlers} />);
    expect(screen.getByText('Featured')).toBeInTheDocument();
  });

  it('renders verified badge when verified', () => {
    render(<FeaturedPluginCard plugin={mockPlugin} {...mockHandlers} />);
    expect(screen.getByText('Verified')).toBeInTheDocument();
  });

  it('renders rating', () => {
    render(<FeaturedPluginCard plugin={mockPlugin} {...mockHandlers} />);
    expect(screen.getByText('4.5')).toBeInTheDocument();
  });

  it('renders review count', () => {
    render(<FeaturedPluginCard plugin={mockPlugin} {...mockHandlers} />);
    expect(screen.getByText('(100)')).toBeInTheDocument();
  });

  it('renders download count', () => {
    render(<FeaturedPluginCard plugin={mockPlugin} {...mockHandlers} />);
    expect(screen.getByText('50k')).toBeInTheDocument();
  });

  it('renders install button', () => {
    render(<FeaturedPluginCard plugin={mockPlugin} {...mockHandlers} />);
    expect(screen.getByRole('button', { name: /install/i })).toBeInTheDocument();
  });

  it('calls onInstall when install clicked', async () => {
    render(<FeaturedPluginCard plugin={mockPlugin} {...mockHandlers} />);
    fireEvent.click(screen.getByRole('button', { name: /install/i }));
    await waitFor(() => {
      expect(mockHandlers.onInstall).toHaveBeenCalledWith('test-plugin');
    });
  });

  it('calls onViewDetails when card clicked', () => {
    render(<FeaturedPluginCard plugin={mockPlugin} {...mockHandlers} />);
    fireEvent.click(screen.getByText('Test Plugin'));
    expect(mockHandlers.onViewDetails).toHaveBeenCalledWith(mockPlugin);
  });

  it('shows installed state', () => {
    render(
      <FeaturedPluginCard
        plugin={{ ...mockPlugin, installed: true }}
        {...mockHandlers}
      />
    );
    expect(screen.getByText('Installed')).toBeInTheDocument();
  });

  it('renders capability badges', () => {
    render(<FeaturedPluginCard plugin={mockPlugin} {...mockHandlers} />);
    // Check that capabilities are rendered
    const badges = screen.getAllByText(/tools|components|themes|\+/i);
    expect(badges.length).toBeGreaterThan(0);
  });

  it('renders unfilled heart when not favorite', () => {
    const { container } = render(
      <FeaturedPluginCard plugin={mockPlugin} {...mockHandlers} isFavorite={false} />
    );
    const heart = container.querySelector('.lucide-heart');
    expect(heart).toBeInTheDocument();
    expect(heart).not.toHaveClass('fill-red-500');
  });

  it('renders filled heart when favorite', () => {
    const { container } = render(
      <FeaturedPluginCard plugin={mockPlugin} {...mockHandlers} isFavorite={true} />
    );
    const heart = container.querySelector('.lucide-heart');
    expect(heart).toBeInTheDocument();
    expect(heart).toHaveClass('fill-red-500');
  });

  it('calls onToggleFavorite when heart clicked', () => {
    const onToggleFavorite = jest.fn();
    const { container } = render(
      <FeaturedPluginCard
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

  it('does not call onViewDetails when heart button clicked', () => {
    const onToggleFavorite = jest.fn();
    const { container } = render(
      <FeaturedPluginCard
        plugin={mockPlugin}
        {...mockHandlers}
        onToggleFavorite={onToggleFavorite}
      />
    );
    const heartButton = container.querySelector('.lucide-heart')?.closest('button');
    fireEvent.click(heartButton!);
    expect(mockHandlers.onViewDetails).not.toHaveBeenCalled();
  });
});
