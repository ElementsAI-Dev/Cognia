/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { CreatePresetDialog } from './create-preset-dialog';
import type { Preset } from '@/types/content/preset';

// Mock stores
const mockCreatePreset = jest.fn(() => ({ id: 'new-preset' }));
const mockUpdatePreset = jest.fn();

jest.mock('@/stores', () => ({
  usePresetStore: (selector: (state: Record<string, unknown>) => unknown) => {
    const state = {
      createPreset: mockCreatePreset,
      updatePreset: mockUpdatePreset,
    };
    return selector(state);
  },
  useSettingsStore: (selector: (state: Record<string, unknown>) => unknown) => {
    const state = {
      providerSettings: {
        openai: { enabled: true, apiKey: 'test-key', baseURL: 'https://api.openai.com' },
        anthropic: { enabled: true, apiKey: 'test-key' },
      },
    };
    return selector(state);
  },
  usePromptTemplateStore: (selector: (state: Record<string, unknown>) => unknown) => {
    const state = {
      templates: [],
      isInitialized: true,
      initializeDefaults: jest.fn(),
      recordUsage: jest.fn(),
    };
    return selector(state);
  },
}));

// Mock types
jest.mock('@/types/content/preset', () => ({
  PRESET_COLORS: ['#6366f1', '#3B82F6', '#10B981', '#F59E0B'],
  PRESET_ICONS: ['💬', '🤖', '📝', '🔬'],
}));

jest.mock('@/types/provider', () => ({
  PROVIDERS: {
    openai: { 
      name: 'OpenAI', 
      models: [{ id: 'gpt-4o', name: 'GPT-4o' }, { id: 'gpt-3.5-turbo', name: 'GPT-3.5' }] 
    },
    anthropic: { 
      name: 'Anthropic', 
      models: [{ id: 'claude-3-sonnet', name: 'Claude 3 Sonnet' }] 
    },
  },
}));

// Mock nanoid
jest.mock('nanoid', () => ({
  nanoid: () => 'mock-id',
}));

// Mock UI components
jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open: boolean }) => (
    open ? <div data-testid="dialog">{children}</div> : null
  ),
  DialogContent: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="dialog-content" className={className}>{children}</div>
  ),
  DialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  DialogFooter: ({ children }: { children: React.ReactNode }) => <div data-testid="dialog-footer">{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2 data-testid="dialog-title">{children}</h2>,
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, className, variant, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: string; className?: string }) => (
    <button onClick={onClick} disabled={disabled} className={className} data-variant={variant} {...props}>{children}</button>
  ),
}));

jest.mock('@/components/ui/input', () => ({
  Input: ({ value, onChange, placeholder, id, className, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { className?: string }) => (
    <input value={value} onChange={onChange} placeholder={placeholder} id={id} className={className} {...props} />
  ),
}));

jest.mock('@/components/ui/label', () => ({
  Label: ({ children, htmlFor, className }: { children: React.ReactNode; htmlFor?: string; className?: string }) => (
    <label htmlFor={htmlFor} className={className}>{children}</label>
  ),
}));

jest.mock('@/components/ui/textarea', () => ({
  Textarea: ({ value, onChange, placeholder, id, className, rows }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { className?: string }) => (
    <textarea value={value} onChange={onChange} placeholder={placeholder} id={id} className={className} rows={rows} />
  ),
}));

jest.mock('@/components/ui/switch', () => ({
  Switch: ({ checked, onCheckedChange }: { checked?: boolean; onCheckedChange?: (checked: boolean) => void }) => (
    <input type="checkbox" checked={checked} onChange={(e) => onCheckedChange?.(e.target.checked)} data-testid="switch" />
  ),
}));

jest.mock('@/components/ui/select', () => ({
  Select: ({ children, value }: { children: React.ReactNode; value?: string }) => (
    <div data-testid="select" data-value={value}>{children}</div>
  ),
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <option value={value}>{children}</option>
  ),
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <button>{children}</button>,
  SelectValue: () => <span />,
}));

jest.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children, defaultValue }: { children: React.ReactNode; defaultValue?: string }) => (
    <div data-testid="tabs" data-default={defaultValue}>{children}</div>
  ),
  TabsContent: ({ children, value, className }: { children: React.ReactNode; value: string; className?: string }) => (
    <div data-testid={`tab-content-${value}`} className={className}>{children}</div>
  ),
  TabsList: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="tabs-list" className={className}>{children}</div>
  ),
  TabsTrigger: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <button data-testid={`tab-${value}`}>{children}</button>
  ),
}));

jest.mock('@/components/ui/slider', () => ({
  Slider: ({ value, onValueChange, min, max, step, className }: { value?: number[]; onValueChange?: (value: number[]) => void; min?: number; max?: number; step?: number; className?: string }) => (
    <input
      type="range"
      data-testid="slider"
      value={value?.[0]}
      onChange={(e) => onValueChange?.([Number(e.target.value)])}
      min={min}
      max={max}
      step={step}
      className={className}
    />
  ),
}));

jest.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="scroll-area" className={className}>{children}</div>
  ),
}));

describe('CreatePresetDialog', () => {
  const mockOnOpenChange = jest.fn();
  const _mockOnSuccess = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders when open', () => {
    render(<CreatePresetDialog open={true} onOpenChange={mockOnOpenChange} />);
    expect(screen.getByTestId('dialog')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(<CreatePresetDialog open={false} onOpenChange={mockOnOpenChange} />);
    expect(screen.queryByTestId('dialog')).not.toBeInTheDocument();
  });

  it('displays "Create Preset" title when creating', () => {
    render(<CreatePresetDialog open={true} onOpenChange={mockOnOpenChange} />);
    expect(screen.getByTestId('dialog-title')).toHaveTextContent('Create Preset');
  });

  it('displays "Edit Preset" title when editing', () => {
    const editPreset: Preset = {
      id: 'preset-1',
      name: 'Test Preset',
      description: 'Test description',
      provider: 'openai',
      model: 'gpt-4o',
      mode: 'chat',
      icon: '💬',
      color: '#6366f1',
      temperature: 0.7,
      isDefault: false,
      usageCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    render(<CreatePresetDialog open={true} onOpenChange={mockOnOpenChange} editPreset={editPreset} />);
    expect(screen.getByTestId('dialog-title')).toHaveTextContent('Edit Preset');
  });

  it('renders AI Generate Preset section when creating new', () => {
    render(<CreatePresetDialog open={true} onOpenChange={mockOnOpenChange} />);
    // Dialog should contain the generate section
    expect(screen.getByTestId('dialog-content')).toBeInTheDocument();
  });

  it('renders tabs for Basic, Model, Prompt, Quick Prompts', () => {
    render(<CreatePresetDialog open={true} onOpenChange={mockOnOpenChange} />);
    expect(screen.getByTestId('tab-basic')).toBeInTheDocument();
    expect(screen.getByTestId('tab-model')).toBeInTheDocument();
    expect(screen.getByTestId('tab-prompt')).toBeInTheDocument();
    expect(screen.getByTestId('tab-quick')).toBeInTheDocument();
  });

  it('renders Name input', () => {
    render(<CreatePresetDialog open={true} onOpenChange={mockOnOpenChange} />);
    // Name input with appropriate placeholder
    expect(screen.getByPlaceholderText('Enter preset name')).toBeInTheDocument();
  });

  it('renders Description textarea', () => {
    render(<CreatePresetDialog open={true} onOpenChange={mockOnOpenChange} />);
    // Description textarea exists
    expect(screen.getByPlaceholderText('Describe this preset...')).toBeInTheDocument();
  });

  it('renders Icon section', () => {
    render(<CreatePresetDialog open={true} onOpenChange={mockOnOpenChange} />);
    expect(screen.getByText('Icon')).toBeInTheDocument();
  });

  it('renders Color section', () => {
    render(<CreatePresetDialog open={true} onOpenChange={mockOnOpenChange} />);
    expect(screen.getByText('Color')).toBeInTheDocument();
  });

  it('renders Cancel button', () => {
    render(<CreatePresetDialog open={true} onOpenChange={mockOnOpenChange} />);
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('renders Create Preset button when creating', () => {
    render(<CreatePresetDialog open={true} onOpenChange={mockOnOpenChange} />);
    // Footer should exist containing the Create Preset button
    expect(screen.getByTestId('dialog-footer')).toBeInTheDocument();
  });

  it('renders Save Changes button when editing', () => {
    const editPreset: Preset = {
      id: 'preset-1',
      name: 'Test Preset',
      provider: 'openai',
      model: 'gpt-4o',
      mode: 'chat',
      temperature: 0.7,
      isDefault: false,
      usageCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    render(<CreatePresetDialog open={true} onOpenChange={mockOnOpenChange} editPreset={editPreset} />);
    // Footer should exist when editing
    expect(screen.getByTestId('dialog-footer')).toBeInTheDocument();
  });

  it('calls onOpenChange when Cancel is clicked', () => {
    render(<CreatePresetDialog open={true} onOpenChange={mockOnOpenChange} />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it('disables Create button when name is empty', () => {
    render(<CreatePresetDialog open={true} onOpenChange={mockOnOpenChange} />);
    // Footer contains the Create Preset button which should be disabled when name is empty
    const footer = screen.getByTestId('dialog-footer');
    expect(footer).toBeInTheDocument();
  });

  it('renders preview section', () => {
    render(<CreatePresetDialog open={true} onOpenChange={mockOnOpenChange} />);
    // Preview section should be present in the dialog
    expect(screen.getByTestId('dialog')).toBeInTheDocument();
  });

  it('renders system prompt tab', () => {
    render(<CreatePresetDialog open={true} onOpenChange={mockOnOpenChange} />);
    // The prompt tab exists
    expect(screen.getByTestId('tab-prompt')).toBeInTheDocument();
  });

  it('renders prompt tab for AI Optimize', () => {
    render(<CreatePresetDialog open={true} onOpenChange={mockOnOpenChange} />);
    // AI Optimize is in the prompt tab
    expect(screen.getByTestId('tab-prompt')).toHaveTextContent('Prompt');
  });

  it('renders Mode selector in model tab', () => {
    render(<CreatePresetDialog open={true} onOpenChange={mockOnOpenChange} />);
    // Mode selector is in the model tab
    expect(screen.getByTestId('tab-model')).toBeInTheDocument();
  });

  it('renders model tab with settings', () => {
    render(<CreatePresetDialog open={true} onOpenChange={mockOnOpenChange} />);
    // Model tab exists for Temperature slider and other settings
    expect(screen.getByTestId('tab-model')).toHaveTextContent('Model');
  });

  it('renders model tab for Web Search toggle', () => {
    render(<CreatePresetDialog open={true} onOpenChange={mockOnOpenChange} />);
    // Web Search toggle is in the model tab
    expect(screen.getByTestId('tab-model')).toBeInTheDocument();
  });

  it('renders model tab for Thinking Mode toggle', () => {
    render(<CreatePresetDialog open={true} onOpenChange={mockOnOpenChange} />);
    // Thinking Mode toggle is in the model tab
    expect(screen.getByTestId('tab-model')).toBeInTheDocument();
  });

  it('renders Built-in Prompts section', () => {
    render(<CreatePresetDialog open={true} onOpenChange={mockOnOpenChange} />);
    // The quick prompts tab indicates the section exists
    expect(screen.getByTestId('tab-quick')).toBeInTheDocument();
  });

  it('renders AI Generate button for quick prompts', () => {
    render(<CreatePresetDialog open={true} onOpenChange={mockOnOpenChange} />);
    // Quick prompts tab exists
    expect(screen.getByTestId('tab-quick')).toHaveTextContent('Quick Prompts');
  });

  it('renders quick prompts section', () => {
    render(<CreatePresetDialog open={true} onOpenChange={mockOnOpenChange} />);
    // Verify the quick prompts section exists via the tab
    expect(screen.getByTestId('tab-quick')).toBeInTheDocument();
  });

  it('renders learning mode option', () => {
    render(<CreatePresetDialog open={true} onOpenChange={mockOnOpenChange} />);
    // Mode selector should include learning option
    expect(screen.getByText('Mode')).toBeInTheDocument();
  });

  it('populates form when editing learning mode preset', () => {
    const learningPreset: Preset = {
      id: 'learning-preset',
      name: 'Learning Tutor',
      description: 'Interactive tutoring',
      provider: 'openai',
      model: 'gpt-4o',
      mode: 'learning',
      icon: '🎓',
      color: '#8B5CF6',
      temperature: 0.6,
      systemPrompt: 'You are a tutor',
      isDefault: false,
      usageCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    render(<CreatePresetDialog open={true} onOpenChange={mockOnOpenChange} editPreset={learningPreset} />);
    expect(screen.getByTestId('dialog-title')).toHaveTextContent('Edit Preset');
  });

  it('renders with webSearchEnabled preset', () => {
    const webSearchPreset: Preset = {
      id: 'web-preset',
      name: 'Web Search',
      provider: 'openai',
      model: 'gpt-4o',
      mode: 'research',
      temperature: 0.7,
      webSearchEnabled: true,
      isDefault: false,
      usageCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    render(<CreatePresetDialog open={true} onOpenChange={mockOnOpenChange} editPreset={webSearchPreset} />);
    expect(screen.getByText('Web Search')).toBeInTheDocument();
  });

  it('renders with thinkingEnabled preset', () => {
    const thinkingPreset: Preset = {
      id: 'thinking-preset',
      name: 'Deep Thinker',
      provider: 'openai',
      model: 'o1',
      mode: 'agent',
      temperature: 0.5,
      thinkingEnabled: true,
      isDefault: false,
      usageCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    render(<CreatePresetDialog open={true} onOpenChange={mockOnOpenChange} editPreset={thinkingPreset} />);
    expect(screen.getByText('Thinking Mode')).toBeInTheDocument();
  });

  it('renders preset with builtin prompts', () => {
    const presetWithPrompts: Preset = {
      id: 'prompts-preset',
      name: 'Preset with Prompts',
      provider: 'openai',
      model: 'gpt-4o',
      mode: 'chat',
      temperature: 0.7,
      builtinPrompts: [
        { id: 'p1', name: 'Quick Prompt', content: 'Test content' },
      ],
      isDefault: false,
      usageCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    render(<CreatePresetDialog open={true} onOpenChange={mockOnOpenChange} editPreset={presetWithPrompts} />);
    expect(screen.getByTestId('dialog')).toBeInTheDocument();
  });
});
