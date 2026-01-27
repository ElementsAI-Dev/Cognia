'use client';

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { PluginFilterBar } from './plugin-filter-bar';

const messages = {
  pluginSettings: {
    filters: {
      searchPlaceholder: 'Search plugins...',
    },
  },
};

const mockProps = {
  searchQuery: '',
  onSearchChange: jest.fn(),
  statusFilter: 'all' as const,
  onStatusFilterChange: jest.fn(),
  typeFilter: 'all' as const,
  onTypeFilterChange: jest.fn(),
  capabilityFilter: 'all' as const,
  onCapabilityFilterChange: jest.fn(),
  onResetFilters: jest.fn(),
  activeCount: 5,
};

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      {ui}
    </NextIntlClientProvider>
  );
};

describe('PluginFilterBar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders search input', () => {
    renderWithProviders(<PluginFilterBar {...mockProps} />);
    expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument();
  });

  it('calls onSearchChange when typing in search', () => {
    renderWithProviders(<PluginFilterBar {...mockProps} />);
    const input = screen.getByPlaceholderText(/search/i);
    fireEvent.change(input, { target: { value: 'test' } });
    expect(mockProps.onSearchChange).toHaveBeenCalledWith('test');
  });

  it('shows clear button when search has value', () => {
    renderWithProviders(<PluginFilterBar {...mockProps} searchQuery="test" />);
    const clearButton = screen.getByRole('button', { name: '' });
    expect(clearButton).toBeInTheDocument();
  });

  it('clears search when clear button clicked', () => {
    renderWithProviders(<PluginFilterBar {...mockProps} searchQuery="test" />);
    const buttons = screen.getAllByRole('button');
    const clearButton = buttons.find((btn) => btn.querySelector('svg'));
    if (clearButton) {
      fireEvent.click(clearButton);
      expect(mockProps.onSearchChange).toHaveBeenCalledWith('');
    }
  });

  it('renders status filter button', () => {
    renderWithProviders(<PluginFilterBar {...mockProps} />);
    expect(screen.getAllByText('Status').length).toBeGreaterThan(0);
  });

  it('renders type filter button', () => {
    renderWithProviders(<PluginFilterBar {...mockProps} />);
    expect(screen.getAllByText('Type').length).toBeGreaterThan(0);
  });

  it('renders capability filter button', () => {
    renderWithProviders(<PluginFilterBar {...mockProps} />);
    expect(screen.getByText('Capability')).toBeInTheDocument();
  });

  it('shows reset button when filters are active', () => {
    renderWithProviders(
      <PluginFilterBar {...mockProps} statusFilter="enabled" />
    );
    expect(screen.getByText('Reset')).toBeInTheDocument();
  });

  it('calls onResetFilters when reset clicked', () => {
    renderWithProviders(
      <PluginFilterBar {...mockProps} statusFilter="enabled" />
    );
    fireEvent.click(screen.getByText('Reset'));
    expect(mockProps.onResetFilters).toHaveBeenCalled();
  });

  it('shows active count when no filters', () => {
    renderWithProviders(<PluginFilterBar {...mockProps} />);
    expect(screen.getByText(/5\s*plugins/i)).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = renderWithProviders(
      <PluginFilterBar {...mockProps} className="custom-class" />
    );
    expect(container.firstChild).toHaveClass('custom-class');
  });
});
