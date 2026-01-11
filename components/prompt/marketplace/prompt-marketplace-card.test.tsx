/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { PromptMarketplaceCard } from './prompt-marketplace-card';
import type { MarketplacePrompt } from '@/types/content/prompt-marketplace';

// Mock store
jest.mock('@/stores/prompt/prompt-marketplace-store', () => ({
  usePromptMarketplaceStore: (selector: (state: Record<string, unknown>) => unknown) => {
    const state = {
      isPromptInstalled: jest.fn().mockReturnValue(false),
      isFavorite: jest.fn().mockReturnValue(false),
      addToFavorites: jest.fn(),
      removeFromFavorites: jest.fn(),
      installPrompt: jest.fn(),
      recordView: jest.fn(),
    };
    return selector(state);
  },
}));

// Mock UI components
jest.mock('@/components/ui/card', () => ({
  Card: ({ children, onClick, className }: { children: React.ReactNode; onClick?: () => void; className?: string }) => (
    <div data-testid="card" onClick={onClick} className={className}>{children}</div>
  ),
  CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button onClick={onClick} disabled={disabled} {...props}>{children}</button>
  ),
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span data-testid="badge">{children}</span>,
}));

jest.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe('PromptMarketplaceCard', () => {
  const mockPrompt: MarketplacePrompt = {
    id: 'prompt-1',
    name: 'Test Prompt',
    description: 'A test prompt description',
    content: 'Test content',
    category: 'writing',
    author: { id: 'user-1', name: 'Test Author', avatar: '' },
    stats: { downloads: 100, weeklyDownloads: 20, favorites: 50, shares: 10, views: 1000, averageRating: 4.5 },
    rating: { average: 4.5, count: 20, distribution: { 1: 0, 2: 0, 3: 2, 4: 5, 5: 13 } },
    qualityTier: 'verified',
    tags: ['test', 'example'],
    variables: [],
    targets: [],
    source: 'marketplace',
    version: '1.0.0',
    versions: [],
    reviewCount: 10,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const defaultProps = {
    prompt: mockPrompt,
    onViewDetail: jest.fn(),
    onInstall: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders prompt title', () => {
    render(<PromptMarketplaceCard {...defaultProps} />);
    expect(screen.getByText('Test Prompt')).toBeInTheDocument();
  });

  it('renders prompt description', () => {
    render(<PromptMarketplaceCard {...defaultProps} />);
    expect(screen.getByText('A test prompt description')).toBeInTheDocument();
  });

  it('renders author name', () => {
    render(<PromptMarketplaceCard {...defaultProps} />);
    expect(screen.getByText('Test Author')).toBeInTheDocument();
  });

  it('renders rating', () => {
    render(<PromptMarketplaceCard {...defaultProps} />);
    expect(screen.getByText(/4.5/)).toBeInTheDocument();
  });

  it('calls onViewDetail when card is clicked', () => {
    render(<PromptMarketplaceCard {...defaultProps} />);
    
    const card = screen.getByTestId('card');
    fireEvent.click(card);
    
    expect(defaultProps.onViewDetail).toHaveBeenCalledWith(mockPrompt);
  });

  it('renders in compact mode', () => {
    render(<PromptMarketplaceCard {...defaultProps} compact />);
    expect(screen.getByTestId('card')).toBeInTheDocument();
  });

  it('displays tags as badges', () => {
    render(<PromptMarketplaceCard {...defaultProps} />);
    const badges = screen.getAllByTestId('badge');
    expect(badges.length).toBeGreaterThan(0);
  });
});
