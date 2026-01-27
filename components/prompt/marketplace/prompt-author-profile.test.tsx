/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { PromptAuthorProfile } from './prompt-author-profile';
import type { PromptAuthor, MarketplacePrompt } from '@/types/content/prompt-marketplace';

// Mock UI components
jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open: boolean }) => 
    open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button onClick={onClick} {...props}>{children}</button>
  ),
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span data-testid="badge">{children}</span>,
}));

jest.mock('@/components/ui/avatar', () => ({
  Avatar: ({ children }: { children: React.ReactNode }) => <div data-testid="avatar">{children}</div>,
  AvatarImage: ({ src, alt }: { src?: string; alt?: string }) => <img src={src} alt={alt} />,
  AvatarFallback: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

jest.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock PromptMarketplaceCard
jest.mock('./prompt-marketplace-card', () => ({
  PromptMarketplaceCard: ({ prompt, onViewDetail }: { prompt: { name: string }; onViewDetail?: (p: unknown) => void }) => (
    <div data-testid="prompt-card" onClick={() => onViewDetail?.(prompt)}>
      {prompt.name}
    </div>
  ),
}));

describe('PromptAuthorProfile', () => {
  const mockAuthor: PromptAuthor = {
    id: 'author-1',
    name: 'Test Author',
    avatar: 'https://example.com/avatar.jpg',
    verified: true,
    promptCount: 5,
    totalDownloads: 1000,
  };

  const mockPrompts: MarketplacePrompt[] = [
    {
      id: 'prompt-1',
      name: 'Prompt One',
      description: 'First prompt',
      content: 'Content 1',
      category: 'writing',
      author: mockAuthor,
      stats: { downloads: 500, weeklyDownloads: 50, favorites: 100, shares: 20, views: 5000, averageRating: 4.5 },
      rating: { average: 4.5, count: 50, distribution: { 1: 0, 2: 2, 3: 5, 4: 13, 5: 30 } },
      qualityTier: 'verified',
      tags: ['test'],
      variables: [],
      targets: [],
      source: 'marketplace',
      version: '1.0.0',
      versions: [],
      reviewCount: 20,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'prompt-2',
      name: 'Prompt Two',
      description: 'Second prompt',
      content: 'Content 2',
      category: 'coding',
      author: mockAuthor,
      stats: { downloads: 300, weeklyDownloads: 30, favorites: 50, shares: 10, views: 3000, averageRating: 4.2 },
      rating: { average: 4.2, count: 30, distribution: { 1: 1, 2: 2, 3: 4, 4: 10, 5: 13 } },
      qualityTier: 'community',
      tags: ['coding'],
      variables: [],
      targets: [],
      source: 'marketplace',
      version: '1.0.0',
      versions: [],
      reviewCount: 15,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const defaultProps = {
    author: mockAuthor,
    prompts: mockPrompts,
    open: true,
    onOpenChange: jest.fn(),
    onViewPrompt: jest.fn(),
    onInstall: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders when open', () => {
    render(<PromptAuthorProfile {...defaultProps} />);
    expect(screen.getByTestId('dialog')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(<PromptAuthorProfile {...defaultProps} open={false} />);
    expect(screen.queryByTestId('dialog')).not.toBeInTheDocument();
  });

  it('renders prompt cards', () => {
    render(<PromptAuthorProfile {...defaultProps} />);
    const promptCards = screen.getAllByTestId('prompt-card');
    expect(promptCards.length).toBe(2);
  });

  it('renders back button', () => {
    render(<PromptAuthorProfile {...defaultProps} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('handles author without prompts', () => {
    render(<PromptAuthorProfile {...defaultProps} prompts={[]} />);
    // Check that empty state message is shown
    expect(screen.getByText(/no prompts/i)).toBeInTheDocument();
  });
});
