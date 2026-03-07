/**
 * @jest-environment jsdom
 */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { PromptMarketplaceDetail } from './prompt-marketplace-detail';
import type { MarketplacePrompt } from '@/types/content/prompt-marketplace';

const mockInstallPrompt = jest.fn();
const mockUninstallPrompt = jest.fn();
const mockAddToFavorites = jest.fn();
const mockRemoveFromFavorites = jest.fn();
const mockSubmitReview = jest.fn();
const mockMarkReviewHelpful = jest.fn();
const mockFetchPromptReviews = jest.fn();

const storeState = {
  isPromptInstalled: () => false,
  isFavorite: () => false,
  addToFavorites: mockAddToFavorites,
  removeFromFavorites: mockRemoveFromFavorites,
  installPrompt: mockInstallPrompt,
  uninstallPrompt: mockUninstallPrompt,
  fetchPromptReviews: mockFetchPromptReviews,
  submitReview: mockSubmitReview,
  markReviewHelpful: mockMarkReviewHelpful,
  reviews: {
    'prompt-1': [
      {
        id: 'review-1',
        authorId: 'user-2',
        authorName: 'Reviewer',
        rating: 4,
        content: 'Useful',
        helpful: 2,
        createdAt: new Date(),
      },
    ],
  },
  userActivity: {
    reviewed: [],
  },
};

jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
  useFormatter: () => ({
    dateTime: () => '2025-01-01',
    relativeTime: () => '1d',
  }),
}));

jest.mock('@/stores/prompt/prompt-marketplace-store', () => ({
  usePromptMarketplaceStore: (selector: (state: typeof storeState) => unknown) => selector(storeState),
}));

jest.mock('@/components/ui/sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('./prompt-preview-dialog', () => ({
  PromptPreviewDialog: () => <div>preview-dialog</div>,
}));

jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open: boolean }) => (open ? <div>{children}</div> : null),
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
}));

jest.mock('@/components/ui/alert-dialog', () => ({
  AlertDialog: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogTitle: ({ children }: { children: React.ReactNode }) => <h3>{children}</h3>,
  AlertDialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  AlertDialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogCancel: ({ children }: { children: React.ReactNode }) => <button>{children}</button>,
  AlertDialogAction: ({
    children,
    onClick,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
  }) => <button onClick={onClick}>{children}</button>,
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  ),
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

jest.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsList: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsTrigger: ({ children }: { children: React.ReactNode }) => <button>{children}</button>,
  TabsContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('@/components/ui/textarea', () => ({
  Textarea: (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea {...props} />,
}));

jest.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const prompt: MarketplacePrompt = {
  id: 'prompt-1',
  name: 'Prompt One',
  description: 'Description',
  content: 'Prompt content',
  category: 'chat',
  tags: ['tag-1'],
  variables: [],
  targets: ['chat'],
  author: { id: 'author-1', name: 'Author 1' },
  source: 'marketplace',
  qualityTier: 'community',
  version: '1.0.0',
  versions: [],
  stats: { downloads: 10, weeklyDownloads: 2, favorites: 1, shares: 0, views: 5 },
  rating: { average: 4.5, count: 2, distribution: { 1: 0, 2: 0, 3: 0, 4: 1, 5: 1 } },
  reviewCount: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('PromptMarketplaceDetail interactions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockInstallPrompt.mockResolvedValue(undefined);
    mockSubmitReview.mockResolvedValue(undefined);
    mockMarkReviewHelpful.mockResolvedValue(undefined);
  });

  it('installs prompt from detail footer action', async () => {
    render(<PromptMarketplaceDetail prompt={prompt} open onOpenChange={() => undefined} />);
    fireEvent.click(screen.getByText('installPrompt'));

    await waitFor(() => {
      expect(mockInstallPrompt).toHaveBeenCalledWith(prompt);
    });
  });

  it('marks review as helpful from reviews list', async () => {
    render(<PromptMarketplaceDetail prompt={prompt} open onOpenChange={() => undefined} />);
    fireEvent.click(screen.getByText('helpful (2)'));

    await waitFor(() => {
      expect(mockMarkReviewHelpful).toHaveBeenCalledWith('review-1');
    });
  });
});
