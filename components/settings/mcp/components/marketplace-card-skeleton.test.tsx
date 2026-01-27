'use client';

import React from 'react';
import { render } from '@testing-library/react';
import { MarketplaceCardSkeleton } from './marketplace-card-skeleton';

describe('MarketplaceCardSkeleton', () => {
  it('renders without crashing', () => {
    const { container } = render(<MarketplaceCardSkeleton />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('renders div elements', () => {
    const { container } = render(<MarketplaceCardSkeleton />);
    const divs = container.querySelectorAll('div');
    expect(divs.length).toBeGreaterThan(0);
  });

  it('has expected structure', () => {
    const { container } = render(<MarketplaceCardSkeleton />);
    expect(container.innerHTML).toBeTruthy();
  });
});
