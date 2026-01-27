'use client';

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FeaturedPluginCard } from './featured-plugin-card';
import type { MarketplacePlugin } from './marketplace-types';

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
    expect(screen.getByText('+1')).toBeInTheDocument();
  });
});
