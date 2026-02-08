'use client';

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { SearchSuggestions } from './search-suggestions';

describe('SearchSuggestions', () => {
  const defaultProps = {
    searchHistory: ['react', 'tailwind', 'typescript'],
    onSelect: jest.fn(),
    onClearHistory: jest.fn(),
    visible: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders nothing when not visible', () => {
    const { container } = render(
      <SearchSuggestions {...defaultProps} visible={false} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when search history is empty', () => {
    const { container } = render(
      <SearchSuggestions {...defaultProps} searchHistory={[]} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders recent searches header', () => {
    render(<SearchSuggestions {...defaultProps} />);
    expect(screen.getByText('Recent searches')).toBeInTheDocument();
  });

  it('renders clear history button', () => {
    render(<SearchSuggestions {...defaultProps} />);
    expect(screen.getByText('Clear')).toBeInTheDocument();
  });

  it('renders search history items', () => {
    render(<SearchSuggestions {...defaultProps} />);
    expect(screen.getByText('react')).toBeInTheDocument();
    expect(screen.getByText('tailwind')).toBeInTheDocument();
    expect(screen.getByText('typescript')).toBeInTheDocument();
  });

  it('calls onSelect when history item clicked', () => {
    render(<SearchSuggestions {...defaultProps} />);
    fireEvent.click(screen.getByText('react'));
    expect(defaultProps.onSelect).toHaveBeenCalledWith('react');
  });

  it('calls onClearHistory when clear button clicked', () => {
    render(<SearchSuggestions {...defaultProps} />);
    fireEvent.click(screen.getByText('Clear'));
    expect(defaultProps.onClearHistory).toHaveBeenCalled();
  });

  it('renders popular suggestion buttons', () => {
    render(<SearchSuggestions {...defaultProps} />);
    expect(screen.getByText('AI tools')).toBeInTheDocument();
    expect(screen.getByText('Code analysis')).toBeInTheDocument();
    expect(screen.getByText('Themes')).toBeInTheDocument();
    expect(screen.getByText('Git')).toBeInTheDocument();
  });

  it('calls onSelect when popular suggestion clicked', () => {
    render(<SearchSuggestions {...defaultProps} />);
    fireEvent.click(screen.getByText('AI tools'));
    expect(defaultProps.onSelect).toHaveBeenCalledWith('AI tools');
  });

  it('limits displayed history to 8 items', () => {
    const longHistory = Array.from({ length: 15 }, (_, i) => `term-${i}`);
    render(<SearchSuggestions {...defaultProps} searchHistory={longHistory} />);
    expect(screen.getByText('term-0')).toBeInTheDocument();
    expect(screen.getByText('term-7')).toBeInTheDocument();
    expect(screen.queryByText('term-8')).not.toBeInTheDocument();
  });
});
