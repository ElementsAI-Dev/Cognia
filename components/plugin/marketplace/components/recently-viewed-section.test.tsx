'use client';

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { RecentlyViewedSection } from './recently-viewed-section';
import type { MarketplacePlugin } from './marketplace-types';

const mockPlugins: MarketplacePlugin[] = [
  {
    id: 'plugin-1',
    name: 'Plugin One',
    description: 'First plugin',
    version: '1.0.0',
    author: { name: 'Author 1', verified: true },
    type: 'frontend',
    capabilities: ['tools'],
    tags: ['test'],
    rating: 4.5,
    reviewCount: 10,
    downloadCount: 1000,
    verified: true,
    featured: false,
    trending: false,
    lastUpdated: '2024-01-15',
    installed: false,
  },
  {
    id: 'plugin-2',
    name: 'Plugin Two',
    description: 'Second plugin',
    version: '2.0.0',
    author: { name: 'Author 2', verified: false },
    type: 'python',
    capabilities: ['components'],
    tags: ['demo'],
    rating: 3.8,
    reviewCount: 5,
    downloadCount: 500,
    verified: false,
    featured: false,
    trending: false,
    lastUpdated: '2024-01-10',
    installed: false,
  },
];

describe('RecentlyViewedSection', () => {
  const onViewDetails = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders nothing when plugins array is empty', () => {
    const { container } = render(
      <RecentlyViewedSection plugins={[]} onViewDetails={onViewDetails} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders section title', () => {
    render(<RecentlyViewedSection plugins={mockPlugins} onViewDetails={onViewDetails} />);
    expect(screen.getByText('Recently Viewed')).toBeInTheDocument();
  });

  it('renders plugin count', () => {
    render(<RecentlyViewedSection plugins={mockPlugins} onViewDetails={onViewDetails} />);
    expect(screen.getByText('(2)')).toBeInTheDocument();
  });

  it('renders plugin names', () => {
    render(<RecentlyViewedSection plugins={mockPlugins} onViewDetails={onViewDetails} />);
    expect(screen.getByText('Plugin One')).toBeInTheDocument();
    expect(screen.getByText('Plugin Two')).toBeInTheDocument();
  });

  it('renders author names', () => {
    render(<RecentlyViewedSection plugins={mockPlugins} onViewDetails={onViewDetails} />);
    expect(screen.getByText('Author 1')).toBeInTheDocument();
    expect(screen.getByText('Author 2')).toBeInTheDocument();
  });

  it('renders ratings', () => {
    render(<RecentlyViewedSection plugins={mockPlugins} onViewDetails={onViewDetails} />);
    expect(screen.getByText('4.5')).toBeInTheDocument();
    expect(screen.getByText('3.8')).toBeInTheDocument();
  });

  it('calls onViewDetails when plugin card clicked', () => {
    render(<RecentlyViewedSection plugins={mockPlugins} onViewDetails={onViewDetails} />);
    fireEvent.click(screen.getByText('Plugin One'));
    expect(onViewDetails).toHaveBeenCalledWith(mockPlugins[0]);
  });

  it('renders verified icon for verified plugins', () => {
    const { container } = render(
      <RecentlyViewedSection plugins={mockPlugins} onViewDetails={onViewDetails} />
    );
    const verifiedIcons = container.querySelectorAll('.text-blue-500');
    expect(verifiedIcons.length).toBeGreaterThan(0);
  });
});
