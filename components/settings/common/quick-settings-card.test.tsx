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
        openai: { enabled: true, apiKey: 'test-key' },
      },
      defaultProvider: 'openai',
      theme: 'dark',
      colorTheme: 'default',
      defaultTemperature: 0.7,
      searchEnabled: true,
      enableFileTools: true,
      enableWebSearch: false,
      customShortcuts: {},
    };
    return selector(state);
  },
}));

// Mock providers
jest.mock('@/types/provider', () => ({
  PROVIDERS: {
    openai: { name: 'OpenAI' },
  },
}));

// Mock UI components
jest.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div data-testid="card">{children}</div>,
  CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: React.ReactNode }) => <h3>{children}</h3>,
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span data-testid="badge">{children}</span>,
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

  it('displays Providers count', () => {
    render(<QuickSettingsCard />);
    expect(screen.getByText('Providers')).toBeInTheDocument();
    expect(screen.getByText('1 configured')).toBeInTheDocument();
  });

  it('displays Default provider', () => {
    render(<QuickSettingsCard />);
    expect(screen.getByText('Default')).toBeInTheDocument();
    expect(screen.getByText('OpenAI')).toBeInTheDocument();
  });

  it('displays Theme info', () => {
    render(<QuickSettingsCard />);
    expect(screen.getByText('Theme')).toBeInTheDocument();
    expect(screen.getByText('dark / default')).toBeInTheDocument();
  });

  it('displays Temperature value', () => {
    render(<QuickSettingsCard />);
    expect(screen.getByText('Temperature')).toBeInTheDocument();
    expect(screen.getByText('0.7')).toBeInTheDocument();
  });

  it('displays Search status', () => {
    render(<QuickSettingsCard />);
    expect(screen.getByText('Search')).toBeInTheDocument();
    expect(screen.getByText('Enabled')).toBeInTheDocument();
  });

  it('displays Tools count', () => {
    render(<QuickSettingsCard />);
    expect(screen.getByText('Tools')).toBeInTheDocument();
    expect(screen.getByText('1 active')).toBeInTheDocument();
  });
});
