/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { PromptPreviewDialog } from './prompt-preview-dialog';
import type { MarketplacePrompt } from '@/types/content/prompt-marketplace';

// Mock settings store
jest.mock('@/stores/settings', () => ({
  useSettingsStore: (selector: (state: Record<string, unknown>) => unknown) => {
    const state = {
      settings: {
        ai: {
          defaultProvider: 'openai',
          defaultModel: 'gpt-4',
        },
      },
    };
    return selector(state);
  },
}));

// Mock UI components
jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open: boolean }) => 
    open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button onClick={onClick} disabled={disabled} {...props}>{children}</button>
  ),
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span data-testid="badge">{children}</span>,
}));

jest.mock('@/components/ui/input', () => ({
  Input: ({ value, onChange, placeholder }: { value?: string; onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void; placeholder?: string }) => (
    <input value={value} onChange={onChange} placeholder={placeholder} data-testid="input" />
  ),
}));

jest.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('@/components/ui/separator', () => ({
  Separator: () => <hr />,
}));

describe('PromptPreviewDialog', () => {
  const mockPrompt: MarketplacePrompt = {
    id: 'prompt-1',
    name: 'Test Prompt',
    description: 'A test prompt for previewing',
    content: 'Hello {{name}}, welcome to {{place}}!',
    category: 'writing',
    author: { id: 'user-1', name: 'Test Author', avatar: '' },
    stats: { downloads: 100, weeklyDownloads: 20, favorites: 50, shares: 10, views: 1000, averageRating: 4.5 },
    rating: { average: 4.5, count: 20, distribution: { 1: 0, 2: 0, 3: 2, 4: 5, 5: 13 } },
    qualityTier: 'verified',
    tags: ['test', 'greeting'],
    variables: [
      { name: 'name', description: 'User name', type: 'text', required: true },
      { name: 'place', description: 'Location', type: 'text', required: false, defaultValue: 'the app' },
    ],
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
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders dialog when open', () => {
    render(<PromptPreviewDialog {...defaultProps} />);
    expect(screen.getByTestId('dialog')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(<PromptPreviewDialog {...defaultProps} open={false} />);
    expect(screen.queryByTestId('dialog')).not.toBeInTheDocument();
  });

  it('does not render when prompt is null', () => {
    render(<PromptPreviewDialog {...defaultProps} prompt={null} />);
    expect(screen.queryByTestId('dialog')).not.toBeInTheDocument();
  });

  it('renders dialog content', () => {
    render(<PromptPreviewDialog {...defaultProps} />);
    // Dialog should render some content
    expect(screen.getByRole('tablist')).toBeInTheDocument();
  });

  it('renders tabs for navigation', () => {
    render(<PromptPreviewDialog {...defaultProps} />);
    // Check that tabs are rendered
    const tablist = screen.getByRole('tablist');
    expect(tablist).toBeInTheDocument();
  });

  it('renders tab panels', () => {
    render(<PromptPreviewDialog {...defaultProps} />);
    // Check that tab panels are rendered
    const tabs = screen.getAllByRole('tab');
    expect(tabs.length).toBeGreaterThan(0);
  });
});
