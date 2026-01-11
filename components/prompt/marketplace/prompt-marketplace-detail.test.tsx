/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { PromptMarketplaceDetail } from './prompt-marketplace-detail';
import type { MarketplacePrompt } from '@/types/content/prompt-marketplace';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

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
jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open?: boolean }) => 
    open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => 
    <div data-testid="dialog-content">{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => 
    <div data-testid="dialog-header">{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => 
    <h2 data-testid="dialog-title">{children}</h2>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => 
    <p>{children}</p>,
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button onClick={onClick} {...props}>{children}</button>
  ),
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span data-testid="badge">{children}</span>,
}));

jest.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsList: ({ children }: { children: React.ReactNode }) => <div role="tablist">{children}</div>,
  TabsTrigger: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <button role="tab" data-value={value}>{children}</button>
  ),
}));

jest.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe('PromptMarketplaceDetail', () => {
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
    open: true,
    onOpenChange: jest.fn(),
    onInstall: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders when open is true', () => {
    render(<PromptMarketplaceDetail {...defaultProps} />);
    expect(screen.getByTestId('dialog')).toBeInTheDocument();
  });

  it('does not render when open is false', () => {
    render(<PromptMarketplaceDetail {...defaultProps} open={false} />);
    expect(screen.queryByTestId('dialog')).not.toBeInTheDocument();
  });

  it('displays prompt title', () => {
    render(<PromptMarketplaceDetail {...defaultProps} />);
    expect(screen.getByText('Test Prompt')).toBeInTheDocument();
  });

  it('displays author name', () => {
    render(<PromptMarketplaceDetail {...defaultProps} />);
    expect(screen.getByText('Test Author')).toBeInTheDocument();
  });

  it('displays prompt description', () => {
    render(<PromptMarketplaceDetail {...defaultProps} />);
    expect(screen.getByText('A test prompt description')).toBeInTheDocument();
  });

  it('displays prompt content', () => {
    render(<PromptMarketplaceDetail {...defaultProps} />);
    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  it('displays tags', () => {
    render(<PromptMarketplaceDetail {...defaultProps} />);
    const badges = screen.getAllByTestId('badge');
    expect(badges.length).toBeGreaterThan(0);
  });

  it('has tabs for different sections', () => {
    render(<PromptMarketplaceDetail {...defaultProps} />);
    expect(screen.getByRole('tablist')).toBeInTheDocument();
  });
});
