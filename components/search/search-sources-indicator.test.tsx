'use client';

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { SearchSourcesIndicator } from './search-sources-indicator';
import type { Source } from '@/types/core/message';

const mockSources: Source[] = [
  {
    id: 'search-0',
    title: 'TypeScript Documentation',
    url: 'https://typescriptlang.org/docs',
    snippet: 'TypeScript is a strongly typed programming language...',
    relevance: 0.95,
  },
  {
    id: 'search-1',
    title: 'React Official Docs',
    url: 'https://react.dev/learn',
    snippet: 'React lets you build user interfaces...',
    relevance: 0.88,
  },
  {
    id: 'search-2',
    title: 'Next.js Guide',
    url: 'https://nextjs.org/docs',
    snippet: 'Next.js is a React framework for production...',
    relevance: 0.82,
  },
];

describe('SearchSourcesIndicator', () => {
  it('renders nothing when sources is empty', () => {
    const { container } = render(<SearchSourcesIndicator sources={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when sources is undefined', () => {
    const { container } = render(
      <SearchSourcesIndicator sources={undefined as unknown as Source[]} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders source count badge', () => {
    render(<SearchSourcesIndicator sources={mockSources} />);
    expect(screen.getByText('3 web sources')).toBeInTheDocument();
  });

  it('renders singular "source" for single source', () => {
    render(<SearchSourcesIndicator sources={[mockSources[0]]} />);
    expect(screen.getByText('1 web source')).toBeInTheDocument();
  });

  it('expands to show source list on click', () => {
    render(<SearchSourcesIndicator sources={mockSources} />);

    // Sources should not be in the DOM initially (Collapsible removes content)
    expect(screen.queryByText('TypeScript Documentation')).not.toBeInTheDocument();

    // Click to expand
    fireEvent.click(screen.getByText('3 web sources'));

    // Sources should now be in the DOM
    expect(screen.getByText('TypeScript Documentation')).toBeInTheDocument();
    expect(screen.getByText('React Official Docs')).toBeInTheDocument();
    expect(screen.getByText('Next.js Guide')).toBeInTheDocument();
  });

  it('renders source URLs as links', () => {
    render(<SearchSourcesIndicator sources={mockSources} />);
    fireEvent.click(screen.getByText('3 web sources'));

    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(3);
    expect(links[0]).toHaveAttribute('href', 'https://typescriptlang.org/docs');
    expect(links[0]).toHaveAttribute('target', '_blank');
    expect(links[0]).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('extracts and displays domain names', () => {
    render(<SearchSourcesIndicator sources={mockSources} />);
    fireEvent.click(screen.getByText('3 web sources'));

    expect(screen.getByText('typescriptlang.org')).toBeInTheDocument();
    expect(screen.getByText('react.dev')).toBeInTheDocument();
    expect(screen.getByText('nextjs.org')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <SearchSourcesIndicator sources={mockSources} className="my-custom-class" />
    );
    expect(container.querySelector('.my-custom-class')).toBeInTheDocument();
  });

  it('collapses on second click', () => {
    render(<SearchSourcesIndicator sources={mockSources} />);

    // Expand
    fireEvent.click(screen.getByText('3 web sources'));
    expect(screen.getByText('TypeScript Documentation')).toBeInTheDocument();

    // Collapse
    fireEvent.click(screen.getByText('3 web sources'));
    expect(screen.queryByText('TypeScript Documentation')).not.toBeInTheDocument();
  });
});
