/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { PromptSelfOptimizerDialog } from './prompt-self-optimizer-dialog';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock the prompt optimizer hook
jest.mock('@/hooks/ai/use-prompt-optimizer', () => ({
  usePromptOptimizer: () => ({
    isAnalyzing: false,
    isOptimizing: false,
    analysisResult: null,
    suggestions: [],
    error: null,
    analyze: jest.fn().mockResolvedValue({ success: true, suggestions: [] }),
    optimize: jest.fn().mockResolvedValue({ success: true, optimizedContent: 'optimized prompt' }),
    reset: jest.fn(),
    getConfig: jest.fn().mockReturnValue({ provider: 'openai', model: 'gpt-4o' }),
  }),
}));

// Mock prompt optimizer utilities (synchronous functions)
jest.mock('@/lib/ai/prompts/prompt-self-optimizer', () => ({
  suggestBestPractices: jest.fn().mockReturnValue([]),
  quickAnalyze: jest.fn().mockReturnValue({ clarity: 50, specificity: 50, structureQuality: 50, overallScore: 50 }),
  compareOptimization: jest.fn().mockReturnValue([]),
}));

// Mock UI components
jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open?: boolean }) => 
    open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => 
    <div data-testid="dialog-content">{children}</div>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => 
    <p data-testid="dialog-description">{children}</p>,
  DialogFooter: ({ children }: { children: React.ReactNode }) => 
    <div data-testid="dialog-footer">{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => 
    <div data-testid="dialog-header">{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => 
    <h2 data-testid="dialog-title">{children}</h2>,
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button onClick={onClick} disabled={disabled} {...props}>{children}</button>
  ),
}));

jest.mock('@/components/ui/textarea', () => ({
  Textarea: (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea {...props} />,
}));

jest.mock('@/components/ui/label', () => ({
  Label: ({ children }: { children: React.ReactNode }) => <label>{children}</label>,
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

jest.mock('@/components/ui/switch', () => ({
  Switch: ({ checked, onCheckedChange }: { checked?: boolean; onCheckedChange?: (checked: boolean) => void }) => (
    <button role="switch" aria-checked={checked} onClick={() => onCheckedChange?.(!checked)} />
  ),
}));

jest.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('@/components/ui/separator', () => ({
  Separator: () => <hr />,
}));

jest.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div data-testid="card">{children}</div>,
  CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  CardHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: React.ReactNode }) => <h3>{children}</h3>,
}));

jest.mock('@/components/ui/checkbox', () => ({
  Checkbox: ({ checked, onCheckedChange }: { checked?: boolean; onCheckedChange?: (checked: boolean) => void }) => (
    <input type="checkbox" checked={checked} onChange={(e) => onCheckedChange?.(e.target.checked)} />
  ),
}));

jest.mock('@/components/ai-elements/loader', () => ({
  Loader: () => <div data-testid="loader">Loading...</div>,
}));

describe('PromptSelfOptimizerDialog', () => {
  const mockTemplate = {
    id: 'template-1',
    title: 'Test Template',
    name: 'Test Template',
    content: 'Initial prompt text',
    category: 'general',
    variables: [],
    tags: [],
    source: 'user' as const,
    usageCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const defaultProps = {
    open: true,
    onOpenChange: jest.fn(),
    template: mockTemplate,
    onApply: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders when open is true', () => {
    render(<PromptSelfOptimizerDialog {...defaultProps} />);
    
    expect(screen.getByTestId('dialog')).toBeInTheDocument();
  });

  it('does not render when open is false', () => {
    render(<PromptSelfOptimizerDialog {...defaultProps} open={false} />);
    
    expect(screen.queryByTestId('dialog')).not.toBeInTheDocument();
  });

  it('displays dialog title', () => {
    render(<PromptSelfOptimizerDialog {...defaultProps} />);
    
    expect(screen.getByTestId('dialog-title')).toBeInTheDocument();
  });

  it('displays original prompt content in analyze tab', () => {
    render(<PromptSelfOptimizerDialog {...defaultProps} />);
    
    const matches = screen.getAllByText('Initial prompt text');
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });

  it('has tabs for different views', () => {
    render(<PromptSelfOptimizerDialog {...defaultProps} />);
    
    expect(screen.getByRole('tablist')).toBeInTheDocument();
  });

  it('renders three tab triggers', () => {
    render(<PromptSelfOptimizerDialog {...defaultProps} />);
    
    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(3);
    expect(tabs[0]).toHaveAttribute('data-value', 'analyze');
    expect(tabs[1]).toHaveAttribute('data-value', 'suggestions');
    expect(tabs[2]).toHaveAttribute('data-value', 'compare');
  });

  it('displays action buttons in footer', () => {
    render(<PromptSelfOptimizerDialog {...defaultProps} />);
    
    expect(screen.getByTestId('dialog-footer')).toBeInTheDocument();
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('renders quick analysis scores', () => {
    render(<PromptSelfOptimizerDialog {...defaultProps} />);
    
    // quickAnalyze mock returns 50 for all scores
    const scores = screen.getAllByText('50');
    expect(scores.length).toBeGreaterThanOrEqual(4);
  });

  it('renders cancel button in footer', () => {
    render(<PromptSelfOptimizerDialog {...defaultProps} />);
    
    expect(screen.getByText('cancel')).toBeInTheDocument();
  });
});
