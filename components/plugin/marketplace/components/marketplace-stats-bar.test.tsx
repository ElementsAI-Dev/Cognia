'use client';

import React from 'react';
import { render, screen } from '@testing-library/react';
import { MarketplaceStatsBar } from './marketplace-stats-bar';

describe('MarketplaceStatsBar', () => {
  it('renders stats bar', () => {
    const { container } = render(<MarketplaceStatsBar />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('renders plugins stat', () => {
    render(<MarketplaceStatsBar />);
    expect(screen.getByText('Plugins')).toBeInTheDocument();
  });

  it('renders downloads stat', () => {
    render(<MarketplaceStatsBar />);
    expect(screen.getByText('Downloads')).toBeInTheDocument();
  });

  it('renders developers stat', () => {
    render(<MarketplaceStatsBar />);
    expect(screen.getByText('Developers')).toBeInTheDocument();
  });

  it('renders this week stat', () => {
    render(<MarketplaceStatsBar />);
    expect(screen.getByText('This Week')).toBeInTheDocument();
  });

  it('renders grid layout', () => {
    const { container } = render(<MarketplaceStatsBar />);
    const grid = container.querySelector('.grid');
    expect(grid).toBeInTheDocument();
  });

  it('renders 4 stat cards', () => {
    const { container } = render(<MarketplaceStatsBar />);
    const statCards = container.querySelectorAll('.rounded-xl');
    expect(statCards.length).toBe(4);
  });
});
