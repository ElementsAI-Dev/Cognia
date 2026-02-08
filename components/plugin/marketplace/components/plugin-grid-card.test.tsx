'use client';

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PluginGridCard } from './plugin-grid-card';
import type { MarketplacePlugin } from './marketplace-types';

const mockPlugin: MarketplacePlugin = {
  id: 'test-plugin',
  name: 'Test Plugin',
  description: 'A test plugin description',
  version: '1.0.0',
  author: { name: 'Test Author', verified: false },
  type: 'frontend',
  capabilities: ['tools'],
  tags: ['test'],
  rating: 4.5,
  reviewCount: 50,
  downloadCount: 25000,
  verified: true,
  featured: false,
  trending: true,
  lastUpdated: '2024-01-15',
  installed: false,
};

describe('PluginGridCard', () => {
  const mockHandlers = {
    onInstall: jest.fn().mockResolvedValue(undefined),
    onViewDetails: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders plugin name', () => {
    render(<PluginGridCard plugin={mockPlugin} {...mockHandlers} />);
    expect(screen.getByText('Test Plugin')).toBeInTheDocument();
  });

  it('renders author name', () => {
    render(<PluginGridCard plugin={mockPlugin} {...mockHandlers} />);
    expect(screen.getByText('Test Author')).toBeInTheDocument();
  });

  it('renders description', () => {
    render(<PluginGridCard plugin={mockPlugin} {...mockHandlers} />);
    expect(screen.getByText('A test plugin description')).toBeInTheDocument();
  });

  it('renders trending badge when trending', () => {
    render(<PluginGridCard plugin={mockPlugin} {...mockHandlers} />);
    expect(screen.getByText('Hot')).toBeInTheDocument();
  });

  it('does not render trending badge when not trending', () => {
    render(
      <PluginGridCard
        plugin={{ ...mockPlugin, trending: false }}
        {...mockHandlers}
      />
    );
    expect(screen.queryByText('Hot')).not.toBeInTheDocument();
  });

  it('renders rating', () => {
    render(<PluginGridCard plugin={mockPlugin} {...mockHandlers} />);
    expect(screen.getByText('4.5')).toBeInTheDocument();
  });

  it('renders download count', () => {
    render(<PluginGridCard plugin={mockPlugin} {...mockHandlers} />);
    expect(screen.getByText('25k')).toBeInTheDocument();
  });

  it('renders install button', () => {
    render(<PluginGridCard plugin={mockPlugin} {...mockHandlers} />);
    expect(screen.getByText('Install')).toBeInTheDocument();
  });

  it('calls onInstall when install clicked', async () => {
    render(<PluginGridCard plugin={mockPlugin} {...mockHandlers} />);
    fireEvent.click(screen.getByText('Install'));
    await waitFor(() => {
      expect(mockHandlers.onInstall).toHaveBeenCalledWith('test-plugin');
    });
  });

  it('calls onViewDetails when card clicked', () => {
    render(<PluginGridCard plugin={mockPlugin} {...mockHandlers} />);
    fireEvent.click(screen.getByText('Test Plugin'));
    expect(mockHandlers.onViewDetails).toHaveBeenCalledWith(mockPlugin);
  });

  it('shows installed state', () => {
    render(
      <PluginGridCard
        plugin={{ ...mockPlugin, installed: true }}
        {...mockHandlers}
      />
    );
    expect(screen.getByText('Installed')).toBeInTheDocument();
  });

  it('disables install button when installed', () => {
    render(
      <PluginGridCard
        plugin={{ ...mockPlugin, installed: true }}
        {...mockHandlers}
      />
    );
    expect(screen.getByRole('button', { name: /installed/i })).toBeDisabled();
  });

  it('renders unfilled heart when not favorite', () => {
    const { container } = render(
      <PluginGridCard plugin={mockPlugin} {...mockHandlers} isFavorite={false} />
    );
    const heart = container.querySelector('.lucide-heart');
    expect(heart).toBeInTheDocument();
    expect(heart).not.toHaveClass('fill-red-500');
  });

  it('renders filled heart when favorite', () => {
    const { container } = render(
      <PluginGridCard plugin={mockPlugin} {...mockHandlers} isFavorite={true} />
    );
    const heart = container.querySelector('.lucide-heart');
    expect(heart).toBeInTheDocument();
    expect(heart).toHaveClass('fill-red-500');
  });

  it('calls onToggleFavorite when heart clicked', () => {
    const onToggleFavorite = jest.fn();
    const { container } = render(
      <PluginGridCard
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
