/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { SourcesDisplay, InlineSourceCitation, SourcesSummary, type WebSource } from './sources-display';

// Mock ai-elements components
jest.mock('@/components/ai-elements/sources', () => ({
  Sources: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="sources" className={className}>{children}</div>
  ),
  SourcesTrigger: ({ children, count }: { children: React.ReactNode; count: number }) => (
    <div data-testid="sources-trigger" data-count={count}>{children}</div>
  ),
  SourcesContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="sources-content">{children}</div>
  ),
  Source: ({ children, href, title }: { children: React.ReactNode; href: string; title: string }) => (
    <a data-testid="source" href={href} title={title}>{children}</a>
  ),
}));

jest.mock('@/components/ai-elements/inline-citation', () => ({
  InlineCitation: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <span data-testid="inline-citation" className={className}>{children}</span>
  ),
  InlineCitationText: ({ children }: { children: React.ReactNode }) => (
    <span data-testid="citation-text">{children}</span>
  ),
  InlineCitationCard: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="citation-card">{children}</div>
  ),
  InlineCitationCardTrigger: ({ sources }: { sources: string[] }) => (
    <span data-testid="citation-trigger" data-sources={sources.join(',')} />
  ),
  InlineCitationCardBody: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="citation-body">{children}</div>
  ),
  InlineCitationCarousel: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="citation-carousel">{children}</div>
  ),
  InlineCitationCarouselContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="carousel-content">{children}</div>
  ),
  InlineCitationCarouselItem: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="carousel-item">{children}</div>
  ),
  InlineCitationCarouselHeader: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="carousel-header">{children}</div>
  ),
  InlineCitationCarouselIndex: () => <span data-testid="carousel-index" />,
  InlineCitationCarouselPrev: () => <button data-testid="carousel-prev" />,
  InlineCitationCarouselNext: () => <button data-testid="carousel-next" />,
  InlineCitationSource: ({ title, url, description }: { title: string; url: string; description: string }) => (
    <div data-testid="citation-source" data-title={title} data-url={url}>{description}</div>
  ),
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span data-testid="badge">{children}</span>,
}));

jest.mock('@/components/ui/hover-card', () => ({
  HoverCard: ({ children }: { children: React.ReactNode }) => <div data-testid="hover-card">{children}</div>,
  HoverCardTrigger: ({ children, asChild: _asChild }: { children: React.ReactNode; asChild?: boolean }) => (
    <div data-testid="hover-card-trigger">{children}</div>
  ),
  HoverCardContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="hover-card-content">{children}</div>
  ),
}));

jest.mock('@/components/ui/avatar', () => ({
  Avatar: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="avatar" className={className}>{children}</div>
  ),
  AvatarFallback: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <span data-testid="avatar-fallback" className={className}>{children}</span>
  ),
}));

const createMockSource = (id: string, title: string, url: string, score: number): WebSource => ({
  id,
  title,
  url,
  content: `Content for ${title}`,
  score,
  publishedDate: '2024-01-01',
});

describe('SourcesDisplay', () => {
  const mockSources: WebSource[] = [
    createMockSource('1', 'Source One', 'https://example.com/one', 0.95),
    createMockSource('2', 'Source Two', 'https://example.com/two', 0.85),
    createMockSource('3', 'Source Three', 'https://example.com/three', 0.75),
  ];

  it('renders without crashing', () => {
    render(<SourcesDisplay sources={mockSources} />);
    expect(screen.getByTestId('sources')).toBeInTheDocument();
  });

  it('returns null when sources is empty', () => {
    const { container } = render(<SourcesDisplay sources={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('returns null when sources is undefined', () => {
    const { container } = render(<SourcesDisplay sources={undefined as unknown as WebSource[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('displays correct source count', () => {
    render(<SourcesDisplay sources={mockSources} />);
    expect(screen.getByTestId('sources-trigger')).toHaveAttribute('data-count', '3');
  });

  it('displays singular "source" for single source', () => {
    render(<SourcesDisplay sources={[mockSources[0]]} />);
    expect(screen.getByTestId('sources-trigger')).toHaveAttribute('data-count', '1');
  });

  it('renders all source items', () => {
    render(<SourcesDisplay sources={mockSources} />);
    expect(screen.getAllByTestId('source')).toHaveLength(3);
  });

  it('displays source titles', () => {
    render(<SourcesDisplay sources={mockSources} />);
    // Titles appear in both trigger and hover card content
    expect(screen.getAllByText('Source One').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Source Two').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Source Three').length).toBeGreaterThan(0);
  });

  it('displays relevance scores in hover card', () => {
    render(<SourcesDisplay sources={mockSources} />);
    // Relevance scores are now in hover card content
    expect(screen.getAllByText('95% relevant').length).toBeGreaterThan(0);
    expect(screen.getAllByText('85% relevant').length).toBeGreaterThan(0);
  });

  it('displays source content preview in hover card', () => {
    render(<SourcesDisplay sources={mockSources} />);
    // Content is now in hover card content
    expect(screen.getByText('Content for Source One')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<SourcesDisplay sources={mockSources} className="custom-class" />);
    expect(screen.getByTestId('sources')).toHaveClass('custom-class');
  });

  it('displays source index numbers in avatars', () => {
    render(<SourcesDisplay sources={mockSources} />);
    // Index numbers are in avatar fallback
    expect(screen.getAllByTestId('avatar-fallback').length).toBe(3);
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('extracts hostname from URL', () => {
    render(<SourcesDisplay sources={mockSources} />);
    expect(screen.getAllByText('example.com').length).toBeGreaterThan(0);
  });
});

describe('InlineSourceCitation', () => {
  const mockSources: WebSource[] = [
    createMockSource('1', 'Source One', 'https://example.com/one', 0.95),
  ];

  it('renders text when sources is empty', () => {
    render(<InlineSourceCitation text="Test text" sources={[]} />);
    expect(screen.getByText('Test text')).toBeInTheDocument();
  });

  it('renders inline citation with sources', () => {
    render(<InlineSourceCitation text="Cited text" sources={mockSources} />);
    expect(screen.getByTestId('inline-citation')).toBeInTheDocument();
  });

  it('displays citation text', () => {
    render(<InlineSourceCitation text="Cited text" sources={mockSources} />);
    expect(screen.getByText('Cited text')).toBeInTheDocument();
  });

  it('renders carousel for multiple sources', () => {
    const multipleSources = [
      createMockSource('1', 'Source One', 'https://example.com/one', 0.95),
      createMockSource('2', 'Source Two', 'https://example.com/two', 0.85),
    ];
    render(<InlineSourceCitation text="Text" sources={multipleSources} />);
    expect(screen.getByTestId('citation-carousel')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<InlineSourceCitation text="Text" sources={mockSources} className="custom-class" />);
    expect(screen.getByTestId('inline-citation')).toHaveClass('custom-class');
  });
});

describe('SourcesSummary', () => {
  const mockSources: WebSource[] = [
    createMockSource('1', 'Source One', 'https://example.com/one', 0.95),
  ];

  it('renders without crashing', () => {
    render(<SourcesSummary sources={mockSources} />);
    expect(screen.getByTestId('sources')).toBeInTheDocument();
  });

  it('displays answer section when answer is provided', () => {
    render(<SourcesSummary sources={mockSources} answer="This is the answer" />);
    expect(screen.getByText('This is the answer')).toBeInTheDocument();
  });

  it('displays response time when provided', () => {
    render(<SourcesSummary sources={mockSources} answer="Answer" responseTime={1500} />);
    expect(screen.getByText('1.50s')).toBeInTheDocument();
  });

  it('displays Web Search Answer label', () => {
    render(<SourcesSummary sources={mockSources} answer="Answer" />);
    expect(screen.getByText('Web Search Answer')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <SourcesSummary sources={mockSources} className="custom-class" />
    );
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('renders SourcesDisplay component', () => {
    render(<SourcesSummary sources={mockSources} />);
    expect(screen.getByTestId('sources')).toBeInTheDocument();
  });
});
