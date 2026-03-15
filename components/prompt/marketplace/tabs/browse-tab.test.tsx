/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowseTab } from './browse-tab';
import type { MarketplacePrompt } from '@/types/content/prompt-marketplace';

jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button onClick={onClick} {...props}>
      {children}
    </button>
  ),
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

jest.mock('@/components/ui/skeleton', () => ({
  Skeleton: ({ className }: { className?: string }) => <div data-testid="skeleton" className={className} />,
}));

jest.mock('@/components/ui/empty', () => ({
  Empty: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  EmptyMedia: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  EmptyTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  EmptyDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  EmptyContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const mockPromptMarketplaceCard = jest.fn(
  ({ prompt, featured }: { prompt: MarketplacePrompt; featured?: boolean }) => (
    <div data-testid={`prompt-card-${prompt.id}`} data-featured={featured ? 'true' : 'false'}>
      {prompt.name}
    </div>
  )
);

jest.mock('../prompt-marketplace-card', () => ({
  PromptMarketplaceCard: (props: Record<string, unknown>) =>
    mockPromptMarketplaceCard(props as { prompt: MarketplacePrompt; featured?: boolean }),
}));

describe('BrowseTab', () => {
  const prompt: MarketplacePrompt = {
    id: 'prompt-1',
    name: 'Prompt One',
    description: 'Prompt description',
    content: 'Prompt content',
    category: 'writing',
    tags: ['tag'],
    variables: [],
    targets: ['chat'],
    author: { id: 'author-1', name: 'Author One' },
    source: 'marketplace',
    qualityTier: 'official',
    version: '1.0.0',
    versions: [],
    stats: { downloads: 100, weeklyDownloads: 20, favorites: 10, shares: 5, views: 500 },
    rating: { average: 4.8, count: 32, distribution: { 1: 0, 2: 0, 3: 1, 4: 4, 5: 27 } },
    reviewCount: 10,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const defaultProps = {
    featuredPrompts: [prompt],
    trendingPrompts: [prompt],
    displayPrompts: [prompt],
    paginatedPrompts: [prompt],
    hasActiveFilters: false,
    hasMorePrompts: false,
    isLoading: false,
    gridClasses: 'grid-cols-fixed',
    viewMode: 'grid' as const,
    onViewDetail: jest.fn(),
    onInstall: jest.fn(),
    onLoadMore: jest.fn(),
    onClearFilters: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all browse sections inside a single root container', () => {
    render(<BrowseTab {...defaultProps} />);

    const root = screen.getByTestId('prompt-marketplace-browse-tab-root');

    expect(root).toContainElement(screen.getByTestId('prompt-marketplace-section-featured'));
    expect(root).toContainElement(screen.getByTestId('prompt-marketplace-section-trending'));
    expect(root).toContainElement(screen.getByTestId('prompt-marketplace-section-results'));
  });

  it('uses container-aware grid wrappers for each browse section', () => {
    render(<BrowseTab {...defaultProps} />);

    expect(screen.getByTestId('prompt-marketplace-featured-grid')).toHaveClass('prompt-marketplace-card-grid');
    expect(screen.getByTestId('prompt-marketplace-trending-grid')).toHaveClass('prompt-marketplace-card-grid');
    expect(screen.getByTestId('prompt-marketplace-results-grid')).toHaveClass('prompt-marketplace-card-grid');
  });
});
