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

  it('renders custom stats when provided', () => {
    const customStats = {
      totalPlugins: 42,
      totalDownloads: 2500000,
      totalDevelopers: 99,
      weeklyNewPlugins: 7,
    };
    render(<MarketplaceStatsBar stats={customStats} />);
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('2.5M')).toBeInTheDocument();
    expect(screen.getByText('99')).toBeInTheDocument();
    expect(screen.getByText('+7')).toBeInTheDocument();
  });

  it('formats downloads in k for thousands', () => {
    const stats = {
      totalPlugins: 1,
      totalDownloads: 5000,
      totalDevelopers: 1,
      weeklyNewPlugins: 0,
    };
    render(<MarketplaceStatsBar stats={stats} />);
    expect(screen.getByText('5k')).toBeInTheDocument();
  });
});
