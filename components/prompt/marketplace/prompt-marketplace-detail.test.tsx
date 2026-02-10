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
  useFormatter: () => ({
    dateTime: (_date: Date) => '2024-01-01',
    relativeTime: (_date: Date) => '2 days ago',
  }),
}));

// Mock store
jest.mock('@/stores/prompt/prompt-marketplace-store', () => ({
  usePromptMarketplaceStore: (selector: (state: Record<string, unknown>) => unknown) => {
    const state = {
      isPromptInstalled: jest.fn().mockReturnValue(false),
      isFavorite: jest.fn().mockReturnValue(false),
      addToFavorites: jest.fn(),
      removeFromFavorites: jest.fn(),
      installPrompt: jest.fn().mockResolvedValue(undefined),
      uninstallPrompt: jest.fn(),
      recordView: jest.fn(),
      fetchPromptReviews: jest.fn().mockResolvedValue([]),
      submitReview: jest.fn().mockResolvedValue(undefined),
      markReviewHelpful: jest.fn().mockResolvedValue(undefined),
      userActivity: {
        installed: [],
        favorites: [],
        reviewed: [],
        recentlyViewed: [],
      },
    };
    return selector(state);
  },
}));

// Mock sonner toast
jest.mock('@/components/ui/sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock PromptPreviewDialog to avoid nested dependencies
jest.mock('./prompt-preview-dialog', () => ({
  PromptPreviewDialog: () => <div data-testid="preview-dialog">Preview</div>,
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

  // Layout: stats row uses grid instead of flex+separator
  it('renders stats in a grid layout', () => {
    const { container } = render(<PromptMarketplaceDetail {...defaultProps} />);
    const statsGrid = container.querySelector('.grid.grid-cols-2');
    expect(statsGrid).toBeInTheDocument();
    expect(statsGrid?.className).toContain('sm:grid-cols-4');
  });

  it('does not render separators in stats row', () => {
    const { container } = render(<PromptMarketplaceDetail {...defaultProps} />);
    const separators = container.querySelectorAll('[data-testid="separator"]');
    expect(separators).toHaveLength(0);
  });

  it('displays rating stat', () => {
    render(<PromptMarketplaceDetail {...defaultProps} />);
    const ratingElements = screen.getAllByText('4.5');
    expect(ratingElements.length).toBeGreaterThanOrEqual(1);
  });

  it('displays download count', () => {
    render(<PromptMarketplaceDetail {...defaultProps} />);
    expect(screen.getByText('100')).toBeInTheDocument();
  });

  it('displays favorites count', () => {
    render(<PromptMarketplaceDetail {...defaultProps} />);
    expect(screen.getByText('50')).toBeInTheDocument();
  });

  it('displays views count', () => {
    render(<PromptMarketplaceDetail {...defaultProps} />);
    expect(screen.getByText('1.0K')).toBeInTheDocument();
  });

  it('displays success rate when available', () => {
    const promptWithSuccess = {
      ...mockPrompt,
      stats: { ...mockPrompt.stats, successRate: 0.95 },
    };
    const { container } = render(
      <PromptMarketplaceDetail {...defaultProps} prompt={promptWithSuccess} />
    );
    expect(screen.getByText('95%')).toBeInTheDocument();
    // Success rate element should exist with col-span classes
    const allCells = container.querySelectorAll('.text-center.p-2');
    const successCell = Array.from(allCells).find((el) => el.className.includes('col-span-2'));
    expect(successCell).toBeTruthy();
  });
});
