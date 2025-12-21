/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { ChatSettings } from './chat-settings';

// Mock stores
jest.mock('@/stores', () => ({
  useSettingsStore: (selector: (state: Record<string, unknown>) => unknown) => {
    const state = {
      defaultTemperature: 0.7,
      setDefaultTemperature: jest.fn(),
      defaultMaxTokens: 4096,
      setDefaultMaxTokens: jest.fn(),
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
    };
    return selector(state);
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
    expect(screen.getByText('Default Provider')).toBeInTheDocument();
  });

  it('displays generation parameters section', () => {
    render(<ChatSettings />);
    expect(screen.getByText('Generation Parameters')).toBeInTheDocument();
  });

  it('displays temperature setting', () => {
    render(<ChatSettings />);
    expect(screen.getByText(/Temperature:/)).toBeInTheDocument();
  });

  it('displays max response length setting', () => {
    render(<ChatSettings />);
    expect(screen.getByText(/Max Response Length:/)).toBeInTheDocument();
  });

  it('displays context and history section', () => {
    render(<ChatSettings />);
    expect(screen.getByText('Context & History')).toBeInTheDocument();
  });

  it('displays display options section', () => {
    render(<ChatSettings />);
    expect(screen.getByText('Display Options')).toBeInTheDocument();
  });

  it('displays auto-generate titles toggle', () => {
    render(<ChatSettings />);
    expect(screen.getByText('Auto-generate Titles')).toBeInTheDocument();
  });

  it('displays show model name toggle', () => {
    render(<ChatSettings />);
    expect(screen.getByText('Show Model Name')).toBeInTheDocument();
  });

  it('displays markdown rendering toggle', () => {
    render(<ChatSettings />);
    expect(screen.getByText('Markdown Rendering')).toBeInTheDocument();
  });
});
