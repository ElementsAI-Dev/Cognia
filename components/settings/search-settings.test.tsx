/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { SearchSettings } from './search-settings';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock stores
jest.mock('@/stores', () => ({
  useSettingsStore: (selector: (state: Record<string, unknown>) => unknown) => {
    const state = {
      searchProviders: {
        tavily: { apiKey: '', enabled: false },
        perplexity: { apiKey: '', enabled: false },
      },
      setSearchProviderApiKey: jest.fn(),
      setSearchProviderEnabled: jest.fn(),
      searchEnabled: false,
      setSearchEnabled: jest.fn(),
      searchMaxResults: 5,
      setSearchMaxResults: jest.fn(),
      searchFallbackEnabled: true,
      setSearchFallbackEnabled: jest.fn(),
    };
    return selector(state);
  },
}));

// Mock search types
jest.mock('@/types/search', () => ({
  SEARCH_PROVIDERS: {
    tavily: {
      name: 'Tavily',
      description: 'AI-powered search',
      apiKeyPlaceholder: 'tvly-xxx',
      docsUrl: 'https://tavily.com',
      features: { aiAnswer: true },
    },
    perplexity: {
      name: 'Perplexity',
      description: 'Perplexity search',
      apiKeyPlaceholder: 'pplx-xxx',
      docsUrl: 'https://perplexity.ai',
      features: { aiAnswer: true },
    },
  },
  validateApiKey: () => true,
}));

// Mock UI components
jest.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div data-testid="card">{children}</div>,
  CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  CardHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: React.ReactNode }) => <h3>{children}</h3>,
}));

jest.mock('@/components/ui/input', () => ({
  Input: ({ value, onChange, placeholder }: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input value={value} onChange={onChange} placeholder={placeholder} data-testid="input" />
  ),
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button onClick={onClick} disabled={disabled}>{children}</button>
  ),
}));

jest.mock('@/components/ui/label', () => ({
  Label: ({ children }: { children: React.ReactNode }) => <label>{children}</label>,
}));

jest.mock('@/components/ui/switch', () => ({
  Switch: ({ checked, onCheckedChange }: { checked?: boolean; onCheckedChange?: (v: boolean) => void }) => (
    <button role="switch" aria-checked={checked} onClick={() => onCheckedChange?.(!checked)} data-testid="switch">Switch</button>
  ),
}));

jest.mock('@/components/ui/slider', () => ({
  Slider: ({ value, onValueChange }: { value?: number[]; onValueChange?: (v: number[]) => void }) => (
    <input type="range" data-testid="slider" value={value?.[0]} onChange={(e) => onValueChange?.([Number(e.target.value)])} />
  ),
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span data-testid="badge">{children}</span>,
}));

jest.mock('@/components/ui/collapsible', () => ({
  Collapsible: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CollapsibleContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CollapsibleTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe('SearchSettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<SearchSettings />);
    expect(screen.getAllByTestId('card').length).toBeGreaterThan(0);
  });

  it('displays search settings title', () => {
    render(<SearchSettings />);
    expect(screen.getByText('title')).toBeInTheDocument();
  });

  it('displays enable search switch', () => {
    render(<SearchSettings />);
    expect(screen.getByText('enableSearch')).toBeInTheDocument();
  });

  it('displays max results slider', () => {
    render(<SearchSettings />);
    expect(screen.getByTestId('slider')).toBeInTheDocument();
  });

  it('displays provider names', () => {
    render(<SearchSettings />);
    expect(screen.getAllByText('Tavily').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Perplexity').length).toBeGreaterThan(0);
  });

  it('displays fallback switch', () => {
    render(<SearchSettings />);
    expect(screen.getAllByTestId('switch').length).toBeGreaterThan(0);
  });
});
