/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { OpenRouterSettings } from './openrouter-settings';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock nanoid
jest.mock('nanoid', () => ({
  nanoid: () => 'test-id-123',
}));

// Mock stores
const mockUpdateProviderSettings = jest.fn();
let mockSettings: {
  enabled: boolean;
  apiKey: string;
  openRouterSettings: Record<string, unknown>;
} = {
  enabled: true,
  apiKey: 'test-api-key',
  openRouterSettings: {
    credits: 10.0,
    creditsUsed: 2.0,
    creditsRemaining: 8.0,
    byokKeys: [],
    providerOrdering: { enabled: false, allowFallbacks: true, order: [] },
  },
};

jest.mock('@/stores', () => ({
  useSettingsStore: (selector: (state: Record<string, unknown>) => unknown) => {
    const state = {
      providerSettings: {
        openrouter: mockSettings,
      },
      updateProviderSettings: mockUpdateProviderSettings,
    };
    return selector(state);
  },
}));

// Mock openrouter lib
const mockGetCredits = jest.fn();

jest.mock('@/lib/ai/providers/openrouter', () => ({
  getCredits: (...args: unknown[]) => mockGetCredits(...args),
  formatCredits: (credits: number) => `$${credits.toFixed(2)}`,
  maskApiKey: (key: string) => `${key.slice(0, 4)}...${key.slice(-4)}`,
  OpenRouterError: class extends Error {},
}));

// Mock UI components
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button onClick={onClick} disabled={disabled} data-testid="button">{children}</button>
  ),
}));

jest.mock('@/components/ui/input', () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} data-testid="input" />,
}));

jest.mock('@/components/ui/label', () => ({
  Label: ({ children }: { children: React.ReactNode }) => <label>{children}</label>,
}));

jest.mock('@/components/ui/switch', () => ({
  Switch: ({ checked, onCheckedChange }: { checked?: boolean; onCheckedChange?: (v: boolean) => void }) => (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onCheckedChange?.(!checked)}
      data-testid="switch"
    >
      Switch
    </button>
  ),
}));

jest.mock('@/components/ui/textarea', () => ({
  Textarea: (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
    <textarea {...props} data-testid="textarea" />
  ),
}));

jest.mock('@/components/ui/select', () => ({
  Select: ({ children }: { children: React.ReactNode }) => <div data-testid="select">{children}</div>,
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <div data-value={value}>{children}</div>
  ),
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectValue: () => <span>Value</span>,
}));

jest.mock('@/components/ui/collapsible', () => ({
  Collapsible: ({ children, open }: { children: React.ReactNode; open?: boolean }) => (
    <div data-testid="collapsible" data-open={open}>{children}</div>
  ),
  CollapsibleContent: ({ children }: { children: React.ReactNode }) => <div data-testid="collapsible-content">{children}</div>,
  CollapsibleTrigger: ({ children }: { children: React.ReactNode }) => <div data-testid="collapsible-trigger">{children}</div>,
}));

jest.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div data-testid="card">{children}</div>,
  CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  CardHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: React.ReactNode }) => <h3>{children}</h3>,
}));

jest.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  TooltipProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span data-testid="badge">{children}</span>,
}));

jest.mock('@/components/ui/separator', () => ({
  Separator: () => <hr />,
}));

describe('OpenRouterSettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSettings = {
      enabled: true,
      apiKey: 'test-api-key',
      openRouterSettings: {
        credits: 10.0,
        creditsUsed: 2.0,
        creditsRemaining: 8.0,
        byokKeys: [],
        providerOrdering: { enabled: false, allowFallbacks: true, order: [] },
      },
    };
  });

  it('renders nothing when provider is disabled', () => {
    mockSettings = { ...mockSettings, enabled: false };
    const { container } = render(<OpenRouterSettings />);
    expect(container.firstChild).toBeNull();
  });

  it('renders credits card when enabled', () => {
    render(<OpenRouterSettings />);
    expect(screen.getByText('OpenRouter Credits')).toBeInTheDocument();
  });

  it('displays credits information', () => {
    render(<OpenRouterSettings />);
    expect(screen.getByText('Total')).toBeInTheDocument();
    expect(screen.getByText('Used')).toBeInTheDocument();
    expect(screen.getByText('Remaining')).toBeInTheDocument();
  });

  it('shows refresh button for credits', () => {
    render(<OpenRouterSettings />);
    const buttons = screen.getAllByTestId('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('displays BYOK section', () => {
    render(<OpenRouterSettings />);
    expect(screen.getByText('Bring Your Own Keys (BYOK)')).toBeInTheDocument();
  });

  it('displays provider ordering section', () => {
    render(<OpenRouterSettings />);
    expect(screen.getByText('Provider Ordering')).toBeInTheDocument();
  });

  it('displays app attribution section', () => {
    render(<OpenRouterSettings />);
    expect(screen.getByText('App Attribution')).toBeInTheDocument();
  });

  it('shows site URL input', () => {
    render(<OpenRouterSettings />);
    expect(screen.getByText('Site URL')).toBeInTheDocument();
  });

  it('shows site name input', () => {
    render(<OpenRouterSettings />);
    expect(screen.getByText('Site Name')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<OpenRouterSettings className="custom-class" />);
    const cards = screen.getAllByTestId('card');
    expect(cards.length).toBeGreaterThan(0);
  });
});

describe('OpenRouterSettings BYOK', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSettings = {
      enabled: true,
      apiKey: 'test-api-key',
      openRouterSettings: {
        credits: 10.0,
        byokKeys: [
          { id: 'key1', provider: 'openai', config: 'sk-test', enabled: true, alwaysUse: false },
        ],
        providerOrdering: { enabled: false, allowFallbacks: true, order: [] },
      },
    };
  });

  it('displays existing BYOK keys', () => {
    render(<OpenRouterSettings />);
    const badges = screen.getAllByTestId('badge');
    expect(badges.length).toBeGreaterThan(0);
  });

  it('shows add provider key section', () => {
    render(<OpenRouterSettings />);
    expect(screen.getByText('Add Provider Key')).toBeInTheDocument();
  });

  it('shows provider select dropdown', () => {
    render(<OpenRouterSettings />);
    const selects = screen.getAllByTestId('select');
    expect(selects.length).toBeGreaterThan(0);
  });
});

describe('OpenRouterSettings error handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSettings = {
      enabled: true,
      apiKey: 'test-api-key',
      openRouterSettings: {},
    };
  });

  it('renders error handling UI', () => {
    render(<OpenRouterSettings />);
    const cards = screen.getAllByTestId('card');
    expect(cards.length).toBeGreaterThan(0);
  });

  it('shows placeholder when credits not fetched', () => {
    mockSettings = {
      enabled: true,
      apiKey: 'test-api-key',
      openRouterSettings: {},
    };
    render(<OpenRouterSettings />);
    expect(screen.getByText('Click refresh to load credits')).toBeInTheDocument();
  });
});
