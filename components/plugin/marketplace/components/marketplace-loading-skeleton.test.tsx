'use client';

import React from 'react';
import { render } from '@testing-library/react';
import { MarketplaceLoadingSkeleton } from './marketplace-loading-skeleton';

jest.mock('@/stores', () => ({
  useSettingsStore: () => ({
    backgroundSettings: {
      enabled: false,
      source: 'none',
    },
  }),
}));

describe('MarketplaceLoadingSkeleton', () => {
  it('renders grid skeleton by default', () => {
    const { container } = render(<MarketplaceLoadingSkeleton viewMode="grid" />);
    const grid = container.querySelector('.grid');
    expect(grid).toBeInTheDocument();
  });

  it('renders skeleton cards in grid mode', () => {
    const { container } = render(<MarketplaceLoadingSkeleton viewMode="grid" />);
    const cards = container.querySelectorAll('.animate-pulse');
    expect(cards.length).toBeGreaterThan(0);
  });

  it('renders list skeleton in list mode', () => {
    const { container } = render(<MarketplaceLoadingSkeleton viewMode="list" />);
    const listItems = container.querySelectorAll('.animate-pulse');
    expect(listItems.length).toBeGreaterThan(0);
  });

  it('renders skeleton elements in grid cards', () => {
    const { container } = render(<MarketplaceLoadingSkeleton viewMode="grid" />);
    // Check for skeleton elements using data-slot attribute
    const skeletons = container.querySelectorAll('[data-slot="skeleton"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('renders skeleton elements in list items', () => {
    const { container } = render(<MarketplaceLoadingSkeleton viewMode="list" />);
    const items = container.querySelectorAll('.flex.items-center');
    expect(items.length).toBeGreaterThan(0);
  });
});
