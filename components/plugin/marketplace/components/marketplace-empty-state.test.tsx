'use client';

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MarketplaceEmptyState } from './marketplace-empty-state';

describe('MarketplaceEmptyState', () => {
  const onClear = jest.fn();
  const onRefresh = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders no plugins found title', () => {
    render(<MarketplaceEmptyState searchQuery="" onClear={onClear} />);
    expect(screen.getByText('No plugins found')).toBeInTheDocument();
  });

  it('shows search query in description', () => {
    render(<MarketplaceEmptyState searchQuery="test" onClear={onClear} />);
    expect(screen.getByText(/test/)).toBeInTheDocument();
  });

  it('shows filter message when no search query', () => {
    render(<MarketplaceEmptyState searchQuery="" onClear={onClear} />);
    expect(screen.getByText(/no plugins available with the current filters/i)).toBeInTheDocument();
  });

  it('renders clear search button when search query exists', () => {
    render(<MarketplaceEmptyState searchQuery="test" onClear={onClear} />);
    expect(screen.getByText('Clear Search')).toBeInTheDocument();
  });

  it('does not render clear button when no search query', () => {
    render(<MarketplaceEmptyState searchQuery="" onClear={onClear} />);
    expect(screen.queryByText('Clear Search')).not.toBeInTheDocument();
  });

  it('calls onClear when clear button clicked', () => {
    render(<MarketplaceEmptyState searchQuery="test" onClear={onClear} />);
    fireEvent.click(screen.getByText('Clear Search'));
    expect(onClear).toHaveBeenCalled();
  });

  it('renders refresh button', () => {
    render(<MarketplaceEmptyState searchQuery="" onClear={onClear} />);
    expect(screen.getByText('Refresh')).toBeInTheDocument();
  });

  it('calls onRefresh when refresh button clicked', () => {
    render(<MarketplaceEmptyState searchQuery="" onClear={onClear} onRefresh={onRefresh} />);
    fireEvent.click(screen.getByText('Refresh'));
    expect(onRefresh).toHaveBeenCalled();
  });

  it('renders popular search suggestions', () => {
    render(<MarketplaceEmptyState searchQuery="" onClear={onClear} />);
    expect(screen.getByText('Popular searches:')).toBeInTheDocument();
    expect(screen.getByText('AI tools')).toBeInTheDocument();
    expect(screen.getByText('Code analysis')).toBeInTheDocument();
    expect(screen.getByText('Themes')).toBeInTheDocument();
  });

  it('calls onSearch when popular search button clicked', () => {
    const onSearch = jest.fn();
    render(<MarketplaceEmptyState searchQuery="" onClear={onClear} onSearch={onSearch} />);
    fireEvent.click(screen.getByText('AI tools'));
    expect(onSearch).toHaveBeenCalledWith('AI tools');
  });
});
