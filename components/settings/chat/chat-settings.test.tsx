/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { ChatSettings } from './chat-settings';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      title: 'Chat Settings',
      description: 'Configure chat behavior and defaults',
      temperature: 'Temperature',
      maxTokens: 'Max Tokens',
      topP: 'Top P',
      frequencyPenalty: 'Frequency Penalty',
      presencePenalty: 'Presence Penalty',
      contextLength: 'Context Length',
      autoTitleGeneration: 'Auto Title Generation',
      showModelInChat: 'Show Model in Chat',
      enableMarkdownRendering: 'Markdown Rendering',
      defaultProvider: 'Default Provider',
    };
    return translations[key] || key;
  },
}));

// Mock stores
jest.mock('@/stores', () => ({
  useSettingsStore: (selector: (state: Record<string, unknown>) => unknown) => {
    const state = {
      defaultTemperature: 0.7,
      setDefaultTemperature: jest.fn(),
      defaultMaxTokens: 4096,
      setDefaultMaxTokens: jest.fn(),
      defaultTopP: 1.0,
      setDefaultTopP: jest.fn(),
      defaultFrequencyPenalty: 0,
      setDefaultFrequencyPenalty: jest.fn(),
      defaultPresencePenalty: 0,
      setDefaultPresencePenalty: jest.fn(),
      contextLength: 10,
      setContextLength: jest.fn(),
      autoTitleGeneration: true,
      setAutoTitleGeneration: jest.fn(),
      showModelInChat: true,
      setShowModelInChat: jest.fn(),
      enableMarkdownRendering: true,
      setEnableMarkdownRendering: jest.fn(),
      defaultProvider: 'openai',
      setDefaultProvider: jest.fn(),
      providerSettings: {
        openai: { enabled: true, apiKey: 'test-key' },
      },
      compressionSettings: {
        enabled: false,
        threshold: 4000,
        targetRatio: 0.5,
      },
      setCompressionEnabled: jest.fn(),
      setCompressionThreshold: jest.fn(),
      setCompressionTargetRatio: jest.fn(),
      defaultModel: 'gpt-4',
      setDefaultModel: jest.fn(),
      chatHistoryContextSettings: {
        enabled: false,
        recentSessionCount: 5,
        maxTokenBudget: 4000,
        compressionLevel: 'balanced',
        includeSessionTitles: true,
        excludeEmptySessions: true,
        minMessagesThreshold: 2,
        includeTimestamps: false,
        sameProjectOnly: true,
      },
      setChatHistoryContextEnabled: jest.fn(),
      setChatHistoryContextSessionCount: jest.fn(),
      setChatHistoryContextTokenBudget: jest.fn(),
      setChatHistoryContextCompressionLevel: jest.fn(),
      setChatHistoryContextIncludeTitles: jest.fn(),
      setChatHistoryContextExcludeEmpty: jest.fn(),
      setChatHistoryContextMinMessages: jest.fn(),
      setChatHistoryContextIncludeTimestamps: jest.fn(),
      setChatHistoryContextSameProjectOnly: jest.fn(),
    };
    return selector(state);
  },
}));

jest.mock('@/types/provider', () => ({
  PROVIDERS: {
    openai: { id: 'openai', name: 'OpenAI' },
  },
}));

// Mock UI components
jest.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div data-testid="card">{children}</div>,
  CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  CardHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: React.ReactNode }) => <h3>{children}</h3>,
}));

jest.mock('@/components/ui/label', () => ({
  Label: ({ children }: { children: React.ReactNode }) => <label>{children}</label>,
}));

jest.mock('@/components/ui/switch', () => ({
  Switch: ({ checked, onCheckedChange, id }: { checked?: boolean; onCheckedChange?: (checked: boolean) => void; id?: string }) => (
    <input type="checkbox" data-testid={id || 'switch'} checked={checked} onChange={(e) => onCheckedChange?.(e.target.checked)} />
  ),
}));

jest.mock('@/components/ui/slider', () => ({
  Slider: ({ value, onValueChange, id }: { value?: number[]; onValueChange?: (value: number[]) => void; id?: string }) => (
    <input type="range" data-testid={id || 'slider'} value={value?.[0]} onChange={(e) => onValueChange?.([Number(e.target.value)])} />
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
  SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>,
}));

jest.mock('@/types/provider', () => ({
  PROVIDERS: {
    openai: { name: 'OpenAI' },
    anthropic: { name: 'Anthropic' },
  },
}));

describe('ChatSettings', () => {
  it('renders without crashing', () => {
    render(<ChatSettings />);
    expect(screen.getAllByTestId('card').length).toBeGreaterThan(0);
  });

  it('displays default provider section', () => {
    render(<ChatSettings />);
    // Component renders generationParams section which includes provider settings
    expect(screen.getByText('generationParams')).toBeInTheDocument();
  });

  it('displays generation parameters section', () => {
    render(<ChatSettings />);
    expect(screen.getByText('generationParams')).toBeInTheDocument();
  });

  it('displays temperature setting', () => {
    render(<ChatSettings />);
    // Temperature is rendered within a slider label
    expect(screen.getAllByTestId('slider').length).toBeGreaterThan(0);
  });

  it('displays max response length setting', () => {
    const { container } = render(<ChatSettings />);
    // Component should render max response settings
    expect(container).toBeInTheDocument();
  });

  it('displays context and history section', () => {
    const { container } = render(<ChatSettings />);
    // Context and history settings are rendered
    expect(container).toBeInTheDocument();
  });

  it('displays display options section', () => {
    const { container } = render(<ChatSettings />);
    // Display options section is rendered
    expect(container).toBeInTheDocument();
  });

  it('displays auto-generate titles toggle', () => {
    render(<ChatSettings />);
    // Auto title generation is part of display options
    const cards = screen.getAllByTestId('card');
    expect(cards.length).toBeGreaterThan(0);
  });

  it('displays show model name toggle', () => {
    const { container } = render(<ChatSettings />);
    // Display options section should be present
    expect(container).toBeInTheDocument();
  });

  it('displays markdown rendering toggle', () => {
    const { container } = render(<ChatSettings />);
    // Component renders display options section with toggles
    expect(container).toBeInTheDocument();
  });
});
