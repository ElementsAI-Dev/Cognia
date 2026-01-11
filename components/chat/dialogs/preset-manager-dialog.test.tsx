/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { PresetManagerDialog } from './preset-manager-dialog';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      managePresets: 'Manage Presets',
      manageDescription: 'Create and manage your presets',
      editPreset: 'Edit Preset',
      createPreset: 'Create Preset',
      editDescription: 'Configure preset settings',
      allPresets: 'All Presets',
      edit: 'Edit',
      create: 'Create',
      new: 'New',
      aiGeneratePreset: 'AI Generate Preset',
      noPresetsFound: 'No presets found',
      basicInfo: 'Basic Info',
      name: 'Name',
      iconColor: 'Icon & Color',
      description: 'Description',
      modelConfig: 'Model Configuration',
      provider: 'Provider',
      model: 'Model',
      mode: 'Mode',
      auto: 'Auto',
      modeChat: 'Chat',
      modeAgent: 'Agent',
      modeResearch: 'Research',
      temperature: 'Temperature',
      features: 'Features',
      webSearch: 'Web Search',
      webSearchDesc: 'Enable web search',
      thinkingMode: 'Thinking Mode',
      thinkingModeDesc: 'Enable thinking mode',
      systemPrompt: 'System Prompt',
      aiOptimize: 'AI Optimize',
      builtinPrompts: 'Built-in Prompts',
      aiGenerate: 'AI Generate',
      add: 'Add',
      noBuiltinPrompts: 'No built-in prompts',
      cancel: 'Cancel',
      savePreset: 'Save Preset',
    };
    return translations[key] || key;
  },
}));

// Mock stores
const mockPresets = [
  {
    id: '1',
    name: 'Test Preset',
    description: 'A test preset',
    icon: '💬',
    color: '#3B82F6',
    provider: 'openai',
    model: 'gpt-4o',
    mode: 'chat',
    systemPrompt: 'You are a helpful assistant.',
    builtinPrompts: [],
    temperature: 0.7,
    webSearchEnabled: false,
    thinkingEnabled: false,
    isDefault: true,
  },
];

jest.mock('@/stores', () => ({
  usePresetStore: (selector: (state: unknown) => unknown) => {
    const state = {
      presets: mockPresets,
      createPreset: jest.fn((input: unknown) => ({ id: '2', ...input as object })),
      updatePreset: jest.fn(),
      deletePreset: jest.fn(),
      duplicatePreset: jest.fn(() => ({ id: '3', name: 'Copy of Test Preset' })),
      getPreset: jest.fn(() => mockPresets[0]),
    };
    return selector ? selector(state) : state;
  },
  useSettingsStore: (selector: (state: unknown) => unknown) => {
    const state = {
      providerSettings: {
        openai: { apiKey: 'test-key' },
      },
    };
    return selector ? selector(state) : state;
  },
}));

// Mock types
jest.mock('@/types/content/preset', () => ({
  PRESET_COLORS: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444'],
  PRESET_ICONS: ['💬', '🤖', '📝', '🎯'],
}));

jest.mock('@/types/provider', () => ({
  PROVIDERS: {
    openai: { name: 'OpenAI', models: [] },
    anthropic: { name: 'Anthropic', models: [] },
  },
}));

// Mock nanoid
jest.mock('nanoid', () => ({
  nanoid: () => 'test-id',
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

jest.mock('@/components/ui/input', () => ({
  Input: ({ value, onChange, placeholder, ...props }: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input value={value} onChange={onChange} placeholder={placeholder} {...props} />
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

jest.mock('@/components/ui/switch', () => ({
  Switch: ({ checked, onCheckedChange }: { checked: boolean; onCheckedChange: (v: boolean) => void }) => (
    <input type="checkbox" checked={checked} onChange={(e) => onCheckedChange(e.target.checked)} data-testid="switch" />
  ),
}));

jest.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <div data-testid="tabs" data-value={value}>{children}</div>
  ),
  TabsContent: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <div data-testid={`tab-${value}`}>{children}</div>
  ),
  TabsList: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsTrigger: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <button data-value={value}>{children}</button>
  ),
}));

jest.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('@/components/ui/select', () => ({
  Select: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <div data-value={value}>{children}</div>
  ),
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectValue: () => <span />,
}));

jest.mock('@/components/ui/slider', () => ({
  Slider: ({ value }: { value: number[] }) => (
    <input type="range" value={value[0]} readOnly data-testid="slider" />
  ),
}));

describe('PresetManagerDialog', () => {
  const defaultProps = {
    open: true,
    onOpenChange: jest.fn(),
    editPresetId: null,
    onPresetSelect: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders when open is true', () => {
    render(<PresetManagerDialog {...defaultProps} />);
    expect(screen.getByTestId('dialog')).toBeInTheDocument();
  });

  it('does not render when open is false', () => {
    render(<PresetManagerDialog {...defaultProps} open={false} />);
    expect(screen.queryByTestId('dialog')).not.toBeInTheDocument();
  });

  it('displays dialog title', () => {
    render(<PresetManagerDialog {...defaultProps} />);
    expect(screen.getByText('Manage Presets')).toBeInTheDocument();
  });

  it('displays tabs for list and edit', () => {
    render(<PresetManagerDialog {...defaultProps} />);
    expect(screen.getByText('All Presets')).toBeInTheDocument();
  });

  it('displays AI generate section', () => {
    render(<PresetManagerDialog {...defaultProps} />);
    expect(screen.getByText('AI Generate Preset')).toBeInTheDocument();
  });

  it('displays new button', () => {
    render(<PresetManagerDialog {...defaultProps} />);
    expect(screen.getByText('New')).toBeInTheDocument();
  });

  it('displays existing preset', () => {
    render(<PresetManagerDialog {...defaultProps} />);
    expect(screen.getByText('Test Preset')).toBeInTheDocument();
  });

  it('displays preset description', () => {
    render(<PresetManagerDialog {...defaultProps} />);
    expect(screen.getByText('A test preset')).toBeInTheDocument();
  });

  it('displays preset icon', () => {
    render(<PresetManagerDialog {...defaultProps} />);
    expect(screen.getByText('💬')).toBeInTheDocument();
  });

  it('displays default badge for default preset', () => {
    render(<PresetManagerDialog {...defaultProps} />);
    expect(screen.getByText('Default')).toBeInTheDocument();
  });

  it('displays preset mode and model', () => {
    render(<PresetManagerDialog {...defaultProps} />);
    expect(screen.getByText('chat')).toBeInTheDocument();
    expect(screen.getByText('gpt-4o')).toBeInTheDocument();
  });

  it('has search input for filtering presets', () => {
    render(<PresetManagerDialog {...defaultProps} />);
    expect(screen.getByPlaceholderText('searchPresets')).toBeInTheDocument();
  });

  it('has AI description input', () => {
    render(<PresetManagerDialog {...defaultProps} />);
    expect(screen.getByPlaceholderText('describePreset')).toBeInTheDocument();
  });

  it('handles new preset creation click', () => {
    render(<PresetManagerDialog {...defaultProps} />);
    const newButton = screen.getByText('New');
    fireEvent.click(newButton);
    // After clicking new, should show edit tab
    expect(screen.getByTestId('tab-edit')).toBeInTheDocument();
  });

  it('displays edit form in edit tab', () => {
    render(<PresetManagerDialog {...defaultProps} />);
    fireEvent.click(screen.getByText('New'));
    expect(screen.getByText('Basic Info')).toBeInTheDocument();
    expect(screen.getByText('Name')).toBeInTheDocument();
  });

  it('displays model configuration section', () => {
    render(<PresetManagerDialog {...defaultProps} />);
    fireEvent.click(screen.getByText('New'));
    expect(screen.getByText('Model Configuration')).toBeInTheDocument();
  });

  it('displays features section', () => {
    render(<PresetManagerDialog {...defaultProps} />);
    fireEvent.click(screen.getByText('New'));
    expect(screen.getByText('Features')).toBeInTheDocument();
  });

  it('displays system prompt section', () => {
    render(<PresetManagerDialog {...defaultProps} />);
    fireEvent.click(screen.getByText('New'));
    expect(screen.getByText('System Prompt')).toBeInTheDocument();
  });

  it('displays built-in prompts section', () => {
    render(<PresetManagerDialog {...defaultProps} />);
    fireEvent.click(screen.getByText('New'));
    expect(screen.getByText('Built-in Prompts')).toBeInTheDocument();
  });

  it('displays save and cancel buttons in edit mode', () => {
    render(<PresetManagerDialog {...defaultProps} />);
    fireEvent.click(screen.getByText('New'));
    expect(screen.getByText('Save Preset')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });
});
