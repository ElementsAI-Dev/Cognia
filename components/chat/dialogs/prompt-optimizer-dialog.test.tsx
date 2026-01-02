/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { PromptOptimizerDialog } from './prompt-optimizer-dialog';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      title: 'Optimize Prompt',
      description: 'Improve your prompt with AI',
      style: 'Style',
      originalPrompt: 'Original Prompt',
      noPrompt: 'No prompt provided',
      optimizationStyle: 'Optimization Style',
      customInstructions: 'Custom Instructions',
      customPlaceholder: 'Enter custom instructions...',
      preserveIntent: 'Preserve Intent',
      enhanceClarity: 'Enhance Clarity',
      addContext: 'Add Context',
      useSessionModel: 'Use Session Model',
      provider: 'Provider',
      model: 'Model',
      optimizedPrompt: 'Optimized Prompt',
      optimizing: 'Optimizing...',
      optimize: 'Optimize',
      apply: 'Apply',
      settings: 'Settings',
      cancel: 'Cancel',
    };
    return translations[key] || key;
  },
}));

// Mock stores
jest.mock('@/stores', () => ({
  useSettingsStore: () => ({
    providerSettings: {
      openai: { enabled: true, apiKey: 'test-key' },
    },
  }),
  useSessionStore: () => ({
    getActiveSession: () => ({
      provider: 'openai',
      model: 'gpt-4o',
    }),
  }),
}));

// Mock AI lib
jest.mock('@/lib/ai/generation/prompt-optimizer', () => ({
  optimizePrompt: jest.fn().mockResolvedValue({
    success: true,
    optimizedPrompt: {
      optimized: 'Optimized version of the prompt',
      improvements: ['Added clarity', 'Better structure'],
    },
  }),
}));

// Mock provider types
jest.mock('@/types/provider', () => ({
  PROVIDERS: {
    openai: { name: 'OpenAI', models: [{ id: 'gpt-4o', name: 'GPT-4o' }] },
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
  DialogFooter: ({ children }: { children: React.ReactNode }) => <div data-testid="footer">{children}</div>,
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button onClick={onClick} disabled={disabled} {...props}>{children}</button>
  ),
}));

jest.mock('@/components/ui/label', () => ({
  Label: ({ children, ...props }: { children: React.ReactNode }) => <label {...props}>{children}</label>,
}));

jest.mock('@/components/ui/textarea', () => ({
  Textarea: ({ value, onChange, placeholder, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
    <textarea value={value} onChange={onChange} placeholder={placeholder} {...props} />
  ),
}));

jest.mock('@/components/ui/select', () => ({
  Select: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectValue: () => <span />,
}));

jest.mock('@/components/ui/switch', () => ({
  Switch: ({ checked, onCheckedChange, id }: { checked: boolean; onCheckedChange: (v: boolean) => void; id: string }) => (
    <input
      type="checkbox"
      id={id}
      checked={checked}
      onChange={(e) => onCheckedChange(e.target.checked)}
      data-testid={`switch-${id}`}
    />
  ),
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span data-testid="badge">{children}</span>,
}));

jest.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children }: { children: React.ReactNode }) => <div data-testid="tabs">{children}</div>,
  TabsContent: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <div data-testid={`tab-${value}`}>{children}</div>
  ),
  TabsList: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsTrigger: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <button data-value={value}>{children}</button>
  ),
}));

jest.mock('@/components/ai-elements/loader', () => ({
  Loader: () => <span data-testid="loader">Loading...</span>,
}));

describe('PromptOptimizerDialog', () => {
  const defaultProps = {
    open: true,
    onOpenChange: jest.fn(),
    initialPrompt: 'Tell me about React',
    onApply: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders when open is true', () => {
    render(<PromptOptimizerDialog {...defaultProps} />);
    expect(screen.getByTestId('dialog')).toBeInTheDocument();
  });

  it('does not render when open is false', () => {
    render(<PromptOptimizerDialog {...defaultProps} open={false} />);
    expect(screen.queryByTestId('dialog')).not.toBeInTheDocument();
  });

  it('displays dialog title', () => {
    render(<PromptOptimizerDialog {...defaultProps} />);
    expect(screen.getByText('Optimize Prompt')).toBeInTheDocument();
  });

  it('displays dialog description', () => {
    render(<PromptOptimizerDialog {...defaultProps} />);
    expect(screen.getByText('Improve your prompt with AI')).toBeInTheDocument();
  });

  it('displays original prompt', () => {
    render(<PromptOptimizerDialog {...defaultProps} />);
    expect(screen.getByText('Tell me about React')).toBeInTheDocument();
  });

  it('displays style tab', () => {
    render(<PromptOptimizerDialog {...defaultProps} />);
    expect(screen.getByText('Style')).toBeInTheDocument();
  });

  it('displays settings tab', () => {
    render(<PromptOptimizerDialog {...defaultProps} />);
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('displays style options', () => {
    render(<PromptOptimizerDialog {...defaultProps} />);
    expect(screen.getByText('Concise')).toBeInTheDocument();
    expect(screen.getByText('Detailed')).toBeInTheDocument();
    expect(screen.getByText('Creative')).toBeInTheDocument();
    expect(screen.getByText('Professional')).toBeInTheDocument();
    expect(screen.getByText('Academic')).toBeInTheDocument();
    expect(screen.getByText('Technical')).toBeInTheDocument();
    expect(screen.getByText('Custom')).toBeInTheDocument();
  });

  it('displays preserve intent toggle', () => {
    render(<PromptOptimizerDialog {...defaultProps} />);
    expect(screen.getByText('Preserve Intent')).toBeInTheDocument();
  });

  it('displays enhance clarity toggle', () => {
    render(<PromptOptimizerDialog {...defaultProps} />);
    expect(screen.getByText('Enhance Clarity')).toBeInTheDocument();
  });

  it('displays add context toggle', () => {
    render(<PromptOptimizerDialog {...defaultProps} />);
    expect(screen.getByText('Add Context')).toBeInTheDocument();
  });

  it('displays optimize button', () => {
    render(<PromptOptimizerDialog {...defaultProps} />);
    expect(screen.getByText('Optimize')).toBeInTheDocument();
  });

  it('displays cancel button', () => {
    render(<PromptOptimizerDialog {...defaultProps} />);
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('calls onOpenChange when cancel is clicked', () => {
    render(<PromptOptimizerDialog {...defaultProps} />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false);
  });

  it('disables optimize button when prompt is empty', () => {
    render(<PromptOptimizerDialog {...defaultProps} initialPrompt="" />);
    const optimizeButton = screen.getByText('Optimize').closest('button');
    expect(optimizeButton).toBeDisabled();
  });

  it('enables optimize button when prompt has content', () => {
    render(<PromptOptimizerDialog {...defaultProps} />);
    const optimizeButton = screen.getByText('Optimize').closest('button');
    expect(optimizeButton).not.toBeDisabled();
  });

  it('displays use session model toggle in settings', () => {
    render(<PromptOptimizerDialog {...defaultProps} />);
    expect(screen.getByText(/Use Session Model/)).toBeInTheDocument();
  });

  it('displays style descriptions', () => {
    render(<PromptOptimizerDialog {...defaultProps} />);
    expect(screen.getByText('Shorter and more direct')).toBeInTheDocument();
    expect(screen.getByText('More context and specificity')).toBeInTheDocument();
  });

  it('shows no prompt message when prompt is empty', () => {
    render(<PromptOptimizerDialog {...defaultProps} initialPrompt="" />);
    expect(screen.getByText('No prompt provided')).toBeInTheDocument();
  });
});
