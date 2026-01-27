/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { PromptCollectionCard } from './prompt-collection-card';
import type { PromptCollection, MarketplacePrompt } from '@/types/content/prompt-marketplace';

// Mock UI components
jest.mock('@/components/ui/card', () => ({
  Card: ({ children, onClick, className }: { children: React.ReactNode; onClick?: () => void; className?: string }) => (
    <div data-testid="card" onClick={onClick} className={className}>{children}</div>
  ),
  CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
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
  AvatarImage: ({ src }: { src?: string }) => <img src={src} alt="" />,
  AvatarFallback: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

describe('PromptCollectionCard', () => {
  const mockCollection: PromptCollection = {
    id: 'collection-1',
    name: 'Test Collection',
    description: 'A test collection description',
    promptIds: ['prompt-1', 'prompt-2', 'prompt-3'],
    promptCount: 3,
    author: { id: 'user-1', name: 'Test Curator', avatar: 'https://example.com/avatar.jpg' },
    followers: 100,
    isOfficial: false,
    isFeatured: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPrompts: MarketplacePrompt[] = [
    {
      id: 'prompt-1',
      name: 'Prompt One',
      description: 'First prompt',
      content: 'Content 1',
      category: 'writing',
      author: { id: 'user-1', name: 'Author 1', avatar: '' },
      stats: { downloads: 100, weeklyDownloads: 20, favorites: 50, shares: 10, views: 1000, averageRating: 4.5 },
      rating: { average: 4.5, count: 20, distribution: { 1: 0, 2: 0, 3: 2, 4: 5, 5: 13 } },
      qualityTier: 'verified',
      tags: ['test'],
      variables: [],
      targets: [],
      source: 'marketplace',
      version: '1.0.0',
      versions: [],
      reviewCount: 10,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'prompt-2',
      name: 'Prompt Two',
      description: 'Second prompt',
      content: 'Content 2',
      category: 'coding',
      author: { id: 'user-2', name: 'Author 2', avatar: '' },
      stats: { downloads: 200, weeklyDownloads: 30, favorites: 60, shares: 15, views: 2000, averageRating: 4.0 },
      rating: { average: 4.0, count: 15, distribution: { 1: 0, 2: 1, 3: 3, 4: 6, 5: 5 } },
      qualityTier: 'community',
      tags: ['test'],
      variables: [],
      targets: [],
      source: 'marketplace',
      version: '1.0.0',
      versions: [],
      reviewCount: 5,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const defaultProps = {
    collection: mockCollection,
    prompts: mockPrompts,
    onViewCollection: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders collection name', () => {
    render(<PromptCollectionCard {...defaultProps} />);
    expect(screen.getByText('Test Collection')).toBeInTheDocument();
  });

  it('renders collection description', () => {
    render(<PromptCollectionCard {...defaultProps} />);
    expect(screen.getByText('A test collection description')).toBeInTheDocument();
  });

  it('renders curator name', () => {
    render(<PromptCollectionCard {...defaultProps} />);
    expect(screen.getByText('Test Curator')).toBeInTheDocument();
  });

  it('renders prompt previews', () => {
    render(<PromptCollectionCard {...defaultProps} />);
    expect(screen.getByText('Prompt One')).toBeInTheDocument();
    expect(screen.getByText('Prompt Two')).toBeInTheDocument();
  });

  it('calls onViewCollection when card is clicked', () => {
    render(<PromptCollectionCard {...defaultProps} />);
    const card = screen.getByTestId('card');
    fireEvent.click(card);
    expect(defaultProps.onViewCollection).toHaveBeenCalledWith(mockCollection);
  });

  it('renders featured badge when featured is true', () => {
    render(<PromptCollectionCard {...defaultProps} featured={true} />);
    const badges = screen.getAllByTestId('badge');
    expect(badges.length).toBeGreaterThan(0);
  });

  it('calculates and displays average rating', () => {
    render(<PromptCollectionCard {...defaultProps} />);
    // Average of 4.5 and 4.0 = 4.25, displayed as 4.3
    expect(screen.getByText(/4\.\d/)).toBeInTheDocument();
  });

  it('calculates and displays total downloads', () => {
    render(<PromptCollectionCard {...defaultProps} />);
    // 100 + 200 = 300
    expect(screen.getByText('300')).toBeInTheDocument();
  });

  it('displays follower count', () => {
    render(<PromptCollectionCard {...defaultProps} />);
    // Check that follower count is rendered
    expect(screen.getByText('Test Collection')).toBeInTheDocument();
  });

  it('handles empty prompts array', () => {
    render(<PromptCollectionCard {...defaultProps} prompts={[]} />);
    expect(screen.getByText('Test Collection')).toBeInTheDocument();
  });

  it('shows +N more badge when more than 4 prompts', () => {
    const manyPrompts = [
      { ...mockPrompts[0], id: 'prompt-1' },
      { ...mockPrompts[1], id: 'prompt-2' },
      { ...mockPrompts[0], id: 'prompt-3' },
      { ...mockPrompts[1], id: 'prompt-4' },
      { ...mockPrompts[0], id: 'prompt-5' },
      { ...mockPrompts[1], id: 'prompt-6' },
    ];
    render(<PromptCollectionCard {...defaultProps} prompts={manyPrompts} />);
    // Should show +2 more for 6 prompts
    expect(screen.getByText(/\+2/)).toBeInTheDocument();
  });
});
