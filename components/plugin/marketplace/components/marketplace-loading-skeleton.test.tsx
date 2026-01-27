'use client';

import React from 'react';
import { render } from '@testing-library/react';
import { MarketplaceLoadingSkeleton } from './marketplace-loading-skeleton';

describe('MarketplaceLoadingSkeleton', () => {
  it('renders grid skeleton by default', () => {
    const { container } = render(<MarketplaceLoadingSkeleton viewMode="grid" />);
    const grid = container.querySelector('.grid');
    expect(grid).toBeInTheDocument();
  });

  it('renders 8 skeleton cards in grid mode', () => {
    const { container } = render(<MarketplaceLoadingSkeleton viewMode="grid" />);
    const cards = container.querySelectorAll('.animate-pulse');
    expect(cards.length).toBe(8);
  });

  it('renders list skeleton in list mode', () => {
    const { container } = render(<MarketplaceLoadingSkeleton viewMode="list" />);
    const listItems = container.querySelectorAll('.animate-pulse');
    expect(listItems.length).toBe(5);
  });

  it('renders skeleton elements in grid cards', () => {
    const { container } = render(<MarketplaceLoadingSkeleton viewMode="grid" />);
    const skeletons = container.querySelectorAll('[class*="Skeleton"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('renders skeleton elements in list items', () => {
    const { container } = render(<MarketplaceLoadingSkeleton viewMode="list" />);
    const items = container.querySelectorAll('.flex.items-center');
    expect(items.length).toBeGreaterThan(0);
  });
});
