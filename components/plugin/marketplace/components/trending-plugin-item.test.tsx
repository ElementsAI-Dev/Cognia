'use client';

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { TrendingPluginItem } from './trending-plugin-item';
import type { MarketplacePlugin } from './marketplace-types';

const mockPlugin: MarketplacePlugin = {
  id: 'test-plugin',
  name: 'Test Plugin',
  description: 'A test plugin',
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

describe('TrendingPluginItem', () => {
  it('renders plugin name', () => {
    render(<TrendingPluginItem plugin={mockPlugin} />);
    expect(screen.getByText('Test Plugin')).toBeInTheDocument();
  });

  it('renders rating', () => {
    render(<TrendingPluginItem plugin={mockPlugin} />);
    expect(screen.getByText('4.5')).toBeInTheDocument();
  });

  it('renders download count', () => {
    render(<TrendingPluginItem plugin={mockPlugin} />);
    expect(screen.getByText('25k')).toBeInTheDocument();
  });

  it('renders verified badge when verified', () => {
    const { container } = render(<TrendingPluginItem plugin={mockPlugin} />);
    const verifiedIcon = container.querySelector('.text-blue-500');
    expect(verifiedIcon).toBeInTheDocument();
  });

  it('does not render verified badge when not verified', () => {
    const { container } = render(
      <TrendingPluginItem plugin={{ ...mockPlugin, verified: false }} />
    );
    const verifiedIcon = container.querySelector('.text-blue-500');
    expect(verifiedIcon).not.toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const onClick = jest.fn();
    render(<TrendingPluginItem plugin={mockPlugin} onClick={onClick} />);
    fireEvent.click(screen.getByText('Test Plugin'));
    expect(onClick).toHaveBeenCalled();
  });

  it('renders flame icon', () => {
    const { container } = render(<TrendingPluginItem plugin={mockPlugin} />);
    const flameIcon = container.querySelector('.text-orange-500');
    expect(flameIcon).toBeInTheDocument();
  });

  it('has minimum width class', () => {
    const { container } = render(<TrendingPluginItem plugin={mockPlugin} />);
    expect(container.firstChild).toHaveClass('min-w-[260px]');
  });
});
