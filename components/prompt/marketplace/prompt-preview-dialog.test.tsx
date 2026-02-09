/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PromptPreviewDialog } from './prompt-preview-dialog';
import type { MarketplacePrompt } from '@/types/content/prompt-marketplace';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock AI SDK
const mockGenerateText = jest.fn().mockResolvedValue({ text: 'AI response text' });
jest.mock('ai', () => ({
  generateText: (...args: unknown[]) => mockGenerateText(...args),
}));

// Mock proxy client
jest.mock('@/lib/ai/core/proxy-client', () => ({
  getProxyProviderModel: jest.fn(() => 'mock-model'),
}));

// Mock sonner
jest.mock('@/components/ui/sonner', () => ({
  toast: { error: jest.fn(), success: jest.fn() },
}));

// Mock settings store — must provide defaultProvider and providerSettings as top-level state
jest.mock('@/stores/settings', () => ({
  useSettingsStore: (selector: (state: Record<string, unknown>) => unknown) => {
    const state = {
      defaultProvider: 'openai',
      providerSettings: {
        openai: {
          apiKey: 'test-key',
          baseURL: undefined,
          defaultModel: 'gpt-4o-mini',
        },
      },
    };
    return selector(state);
  },
}));

// Mock loader
jest.mock('@/components/ai-elements/loader', () => ({
  Loader: () => <span data-testid="loader">Loading...</span>,
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
  Input: ({ value, onChange, placeholder, id }: { value?: string; onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void; placeholder?: string; id?: string }) => (
    <input value={value} onChange={onChange} placeholder={placeholder} id={id} data-testid={`input-${id || 'default'}`} />
  ),
}));

jest.mock('@/components/ui/textarea', () => ({
  Textarea: ({ value, onChange, placeholder }: { value?: string; onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void; placeholder?: string }) => (
    <textarea value={value} onChange={onChange} placeholder={placeholder} data-testid="textarea" />
  ),
}));

jest.mock('@/components/ui/label', () => ({
  Label: ({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) => (
    <label htmlFor={htmlFor}>{children}</label>
  ),
}));

jest.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('@/components/ui/separator', () => ({
  Separator: () => <hr />,
}));

jest.mock('@/components/ui/select', () => ({
  Select: ({ children, onValueChange: _onValueChange, value }: { children: React.ReactNode; onValueChange?: (v: string) => void; value?: string }) => (
    <div data-testid="select" data-value={value}>{children}</div>
  ),
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>,
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <div data-testid={`select-item-${value}`}>{children}</div>
  ),
}));

jest.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children, value }: { children: React.ReactNode; value?: string }) => (
    <div data-testid="tabs" data-value={value}>{children}</div>
  ),
  TabsList: ({ children }: { children: React.ReactNode }) => <div role="tablist">{children}</div>,
  TabsTrigger: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <button role="tab" data-value={value}>{children}</button>
  ),
  TabsContent: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <div data-testid={`tab-content-${value}`}>{children}</div>
  ),
}));

jest.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TooltipTrigger: ({ children, asChild }: { children: React.ReactNode; asChild?: boolean }) =>
    asChild ? <>{children}</> : <div>{children}</div>,
}));

jest.mock('@/components/ui/empty', () => ({
  Empty: ({ children }: { children: React.ReactNode }) => <div data-testid="empty">{children}</div>,
  EmptyMedia: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  EmptyDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
}));

describe('PromptPreviewDialog', () => {
  const mockPrompt: MarketplacePrompt = {
    id: 'prompt-1',
    name: 'Test Prompt',
    description: 'A test prompt for previewing',
    content: 'Hello {{name}}, welcome to {{place}}!',
    category: 'writing',
    author: { id: 'user-1', name: 'Test Author', avatar: '' },
    stats: { downloads: 100, weeklyDownloads: 20, favorites: 50, shares: 10, views: 1000 },
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

  const mockPromptWithSelect: MarketplacePrompt = {
    ...mockPrompt,
    id: 'prompt-select',
    content: 'Write a {{tone}} email about {{topic}}',
    variables: [
      { name: 'tone', description: 'Email tone', type: 'select', options: ['Formal', 'Casual', 'Friendly'], required: true, defaultValue: 'Formal' },
      { name: 'topic', description: 'Email topic', type: 'text', required: true },
    ],
  };

  const mockPromptWithBoolean: MarketplacePrompt = {
    ...mockPrompt,
    id: 'prompt-bool',
    content: 'Generate code. Include comments: {{includeComments}}',
    variables: [
      { name: 'includeComments', description: 'Include code comments', type: 'boolean', required: false, defaultValue: 'true' },
    ],
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

  it('renders dialog content with tabs', () => {
    render(<PromptPreviewDialog {...defaultProps} />);
    expect(screen.getByRole('tablist')).toBeInTheDocument();
  });

  it('renders tabs for navigation', () => {
    render(<PromptPreviewDialog {...defaultProps} />);
    const tabs = screen.getAllByRole('tab');
    expect(tabs.length).toBeGreaterThan(0);
  });

  it('renders variable inputs for text variables', () => {
    render(<PromptPreviewDialog {...defaultProps} />);
    // Should render input for 'name' variable
    expect(screen.getByTestId('input-name')).toBeInTheDocument();
  });

  it('renders select dropdown for select-type variables', () => {
    render(<PromptPreviewDialog {...defaultProps} prompt={mockPromptWithSelect} />);
    // Should render a select component for tone variable
    const selects = screen.getAllByTestId('select');
    expect(selects.length).toBeGreaterThan(0);
  });

  it('renders boolean toggle buttons for boolean-type variables', () => {
    render(<PromptPreviewDialog {...defaultProps} prompt={mockPromptWithBoolean} />);
    // Should render True and False buttons
    expect(screen.getByText('True')).toBeInTheDocument();
    expect(screen.getByText('False')).toBeInTheDocument();
  });

  it('calls generateText when test with AI is triggered', async () => {
    // Use a prompt with no required variables so generatedPrompt is truthy
    const simplePrompt: MarketplacePrompt = {
      ...mockPrompt,
      id: 'simple',
      content: 'Hello world!',
      variables: [],
    };
    render(<PromptPreviewDialog {...defaultProps} prompt={simplePrompt} />);
    const testButtons = screen.getAllByRole('button');
    const testButton = testButtons.find((btn) => btn.textContent?.includes('testWithAI'));

    expect(testButton).toBeDefined();
    if (testButton) {
      expect(testButton).not.toBeDisabled();
      fireEvent.click(testButton);
      await waitFor(() => {
        expect(mockGenerateText).toHaveBeenCalled();
      });
    }
  });

  it('handles AI test errors gracefully', async () => {
    mockGenerateText.mockRejectedValueOnce(new Error('API error'));
    const simplePrompt: MarketplacePrompt = {
      ...mockPrompt,
      id: 'simple-err',
      content: 'Hello world!',
      variables: [],
    };
    render(<PromptPreviewDialog {...defaultProps} prompt={simplePrompt} />);
    const testButtons = screen.getAllByRole('button');
    const testButton = testButtons.find((btn) => btn.textContent?.includes('testWithAI'));

    expect(testButton).toBeDefined();
    if (testButton) {
      fireEvent.click(testButton);
      await waitFor(() => {
        expect(mockGenerateText).toHaveBeenCalled();
      });
    }
  });

  it('renders prompt name in dialog description', () => {
    render(<PromptPreviewDialog {...defaultProps} />);
    // Prompt name is rendered in DialogDescription as "{name} - fillVariables"
    expect(screen.getByText(/Test Prompt/)).toBeInTheDocument();
  });
});
