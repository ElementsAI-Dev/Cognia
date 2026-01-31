/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { QuickSettingsCard } from './quick-settings-card';

// Mock stores
jest.mock('@/stores', () => ({
  useSettingsStore: (selector: (state: Record<string, unknown>) => unknown) => {
    const state = {
      providerSettings: {
        openai: { enabled: true, apiKey: 'test-key', defaultModel: 'gpt-4' },
      },
      defaultProvider: 'openai',
    };
    return selector(state);
  },
}));

// Mock providers
jest.mock('@/types/provider', () => ({
  PROVIDERS: {
    openai: {
      name: 'OpenAI',
      defaultModel: 'gpt-4',
      models: [
        { id: 'gpt-4', name: 'GPT-4', contextLength: 8192 },
        { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', contextLength: 4096 },
      ],
    },
  },
}));

// Mock UI components
jest.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="card" className={className}>{children}</div>
  ),
  CardContent: ({ children }: { children: React.ReactNode }) => <div data-testid="card-content">{children}</div>,
  CardHeader: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="card-header" className={className}>{children}</div>
  ),
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <span data-testid="badge" className={className}>{children}</span>
  ),
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <button data-testid="button" onClick={onClick}>{children}</button>
  ),
}));

jest.mock('@/components/ui/collapsible', () => ({
  Collapsible: ({ children, open }: { children: React.ReactNode; open?: boolean }) => (
    <div data-testid="collapsible" data-open={open}>{children}</div>
  ),
  CollapsibleContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="collapsible-content">{children}</div>
  ),
  CollapsibleTrigger: ({ children, asChild: _asChild }: { children: React.ReactNode; asChild?: boolean }) => (
    <div data-testid="collapsible-trigger">{children}</div>
  ),
}));

describe('QuickSettingsCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<QuickSettingsCard />);
    expect(screen.getByTestId('card')).toBeInTheDocument();
  });

  it('displays Quick Overview title', () => {
    render(<QuickSettingsCard />);
    expect(screen.getByText('Quick Overview')).toBeInTheDocument();
  });

  it('displays provider count', () => {
    render(<QuickSettingsCard />);
    // Configured provider count
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('displays model count', () => {
    render(<QuickSettingsCard />);
    // Total models from configured providers
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('displays default provider name', () => {
    render(<QuickSettingsCard />);
    expect(screen.getByText('OpenAI')).toBeInTheDocument();
  });

  it('displays default model', () => {
    render(<QuickSettingsCard />);
    expect(screen.getByText('gpt-4')).toBeInTheDocument();
  });

  it('is collapsible', () => {
    render(<QuickSettingsCard />);
    expect(screen.getByTestId('collapsible')).toBeInTheDocument();
  });
});
