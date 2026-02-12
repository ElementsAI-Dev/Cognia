'use client';

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { SearchResultsIndicator } from './search-results-indicator';
import type { SearchResponse } from '@/types/search';

const mockSearchResponse: SearchResponse = {
  provider: 'tavily' as const,
  query: 'TypeScript best practices',
  answer: 'TypeScript best practices include using strict mode...',
  results: [
    {
      title: 'TypeScript Handbook',
      url: 'https://typescriptlang.org/docs/handbook',
      content: 'The TypeScript Handbook is the official guide...',
      score: 0.95,
    },
    {
      title: 'Effective TypeScript',
      url: 'https://effectivetypescript.com',
      content: 'Tips and tricks for writing better TypeScript...',
      score: 0.88,
      publishedDate: '2024-06-15',
    },
    {
      title: 'TypeScript Deep Dive',
      url: 'https://basarat.gitbook.io/typescript',
      content: 'An in-depth guide to TypeScript...',
      score: 0.82,
    },
  ],
  responseTime: 450,
};

describe('SearchResultsIndicator', () => {
  it('renders nothing when results are empty', () => {
    const { container } = render(
      <SearchResultsIndicator
        searchResponse={{ ...mockSearchResponse, results: [] }}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders source count and provider badge', () => {
    render(<SearchResultsIndicator searchResponse={mockSearchResponse} />);
    expect(screen.getByText('3 sources found')).toBeInTheDocument();
    expect(screen.getByText('tavily')).toBeInTheDocument();
  });

  it('renders response time', () => {
    render(<SearchResultsIndicator searchResponse={mockSearchResponse} />);
    expect(screen.getByText('450ms')).toBeInTheDocument();
  });

  it('expands to show sources on click', () => {
    render(<SearchResultsIndicator searchResponse={mockSearchResponse} />);

    // Click to expand
    fireEvent.click(screen.getByText('3 sources found'));

    // Sources should now be visible
    expect(screen.getByText('TypeScript Handbook')).toBeVisible();
    expect(screen.getByText('Effective TypeScript')).toBeVisible();
    expect(screen.getByText('TypeScript Deep Dive')).toBeVisible();
  });

  it('shows quick answer when expanded', () => {
    render(<SearchResultsIndicator searchResponse={mockSearchResponse} />);
    fireEvent.click(screen.getByText('3 sources found'));

    expect(
      screen.getByText(/TypeScript best practices include using strict mode/)
    ).toBeInTheDocument();
  });

  it('renders source URLs as external links', () => {
    render(<SearchResultsIndicator searchResponse={mockSearchResponse} />);
    fireEvent.click(screen.getByText('3 sources found'));

    const links = screen.getAllByRole('link');
    expect(links.length).toBeGreaterThanOrEqual(3);
    expect(links[0]).toHaveAttribute('target', '_blank');
    expect(links[0]).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('extracts domain from URLs', () => {
    render(<SearchResultsIndicator searchResponse={mockSearchResponse} />);
    fireEvent.click(screen.getByText('3 sources found'));

    expect(screen.getByText('typescriptlang.org')).toBeInTheDocument();
    expect(screen.getByText('effectivetypescript.com')).toBeInTheDocument();
  });

  it('starts expanded when defaultExpanded is true', () => {
    render(
      <SearchResultsIndicator
        searchResponse={mockSearchResponse}
        defaultExpanded={true}
      />
    );

    expect(screen.getByText('TypeScript Handbook')).toBeVisible();
  });

  it('renders without provider badge when provider is missing', () => {
    const responseNoProvider = {
      ...mockSearchResponse,
      provider: undefined,
    } as unknown as SearchResponse;
    render(
      <SearchResultsIndicator searchResponse={responseNoProvider} />
    );
    expect(screen.getByText('3 sources found')).toBeInTheDocument();
  });

  it('limits displayed results to 5 and shows overflow count', () => {
    const manyResults = {
      ...mockSearchResponse,
      results: Array.from({ length: 8 }, (_, i) => ({
        title: `Result ${i + 1}`,
        url: `https://example.com/${i}`,
        content: `Content ${i + 1}`,
        score: 0.9 - i * 0.05,
      })),
    };
    render(<SearchResultsIndicator searchResponse={manyResults} />);
    fireEvent.click(screen.getByText('8 sources found'));

    expect(screen.getByText('+3 more sources')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <SearchResultsIndicator
        searchResponse={mockSearchResponse}
        className="test-class"
      />
    );
    expect(container.querySelector('.test-class')).toBeInTheDocument();
  });
});
