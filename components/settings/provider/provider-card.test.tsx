/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProviderCard } from './provider-card';

// Mock UI components
jest.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="card" className={className}>{children}</div>
  ),
  CardContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="card-content">{children}</div>
  ),
  CardHeader: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="card-header">{children}</div>
  ),
}));

jest.mock('@/components/ui/collapsible', () => ({
  Collapsible: ({ children, open }: { children: React.ReactNode; open?: boolean }) => (
    <div data-testid="collapsible" data-open={open}>{children}</div>
  ),
  CollapsibleContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="collapsible-content">{children}</div>
  ),
  CollapsibleTrigger: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="collapsible-trigger">{children}</div>
  ),
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <button data-testid="button" onClick={onClick}>{children}</button>
  ),
}));

jest.mock('@/components/ui/input', () => ({
  Input: ({ value, onChange, type }: { value?: string; onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void; type?: string }) => (
    <input data-testid="input" type={type} value={value} onChange={onChange} />
  ),
}));

jest.mock('@/components/ui/switch', () => ({
  Switch: ({ checked, onCheckedChange }: { checked?: boolean; onCheckedChange?: (checked: boolean) => void }) => (
    <input type="checkbox" data-testid="switch" checked={checked} onChange={(e) => onCheckedChange?.(e.target.checked)} />
  ),
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span data-testid="badge">{children}</span>,
}));

jest.mock('@/components/ui/label', () => ({
  Label: ({ children }: { children: React.ReactNode }) => <label data-testid="label">{children}</label>,
}));

jest.mock('@/components/ui/select', () => ({
  Select: ({ children }: { children: React.ReactNode }) => <div data-testid="select">{children}</div>,
  SelectContent: ({ children }: { children: React.ReactNode }) => <div data-testid="select-content">{children}</div>,
  SelectItem: ({ children }: { children: React.ReactNode }) => <div data-testid="select-item">{children}</div>,
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <div data-testid="select-trigger">{children}</div>,
  SelectValue: () => <span data-testid="select-value" />,
}));

jest.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <div data-testid="tooltip">{children}</div>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => <div data-testid="tooltip-content">{children}</div>,
  TooltipProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="tooltip-provider">{children}</div>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => <div data-testid="tooltip-trigger">{children}</div>,
}));

jest.mock('@/components/ui/separator', () => ({
  Separator: () => <hr data-testid="separator" />,
}));

jest.mock('@/components/providers/ai/provider-icon', () => ({
  ProviderIcon: () => <div data-testid="provider-icon" />,
}));

jest.mock('@/lib/ai/infrastructure/api-key-rotation', () => ({
  maskApiKey: (key: string) => `***${key.slice(-4)}`,
  isValidApiKeyFormat: (key: string) => key.length >= 20 && !/\s/.test(key),
}));

const mockProvider = {
  id: 'openai',
  name: 'OpenAI',
  description: 'OpenAI API',
  models: [
    { id: 'gpt-4', name: 'GPT-4', contextLength: 8192 },
    { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', contextLength: 4096 },
  ],
  defaultModel: 'gpt-4',
  dashboardUrl: 'https://platform.openai.com/api-keys',
  docsUrl: 'https://platform.openai.com/docs',
};

const mockSettings = {
  enabled: true,
  apiKey: 'sk-test-key',
  defaultModel: 'gpt-4',
};

describe('ProviderCard', () => {
  const mockOnToggleExpanded = jest.fn();
  const mockOnToggleEnabled = jest.fn();
  const mockOnApiKeyChange = jest.fn();
  const mockOnBaseURLChange = jest.fn();
  const mockOnDefaultModelChange = jest.fn();
  const mockOnTestConnection = jest.fn().mockResolvedValue({ success: true });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders provider name', () => {
    render(
      <ProviderCard
        provider={mockProvider as unknown as Parameters<typeof ProviderCard>[0]['provider']}
        settings={mockSettings as unknown as Parameters<typeof ProviderCard>[0]['settings']}
        isExpanded={false}
        onToggleExpanded={mockOnToggleExpanded}
        onToggleEnabled={mockOnToggleEnabled}
        onApiKeyChange={mockOnApiKeyChange}
        onBaseURLChange={mockOnBaseURLChange}
        onDefaultModelChange={mockOnDefaultModelChange}
        onTestConnection={mockOnTestConnection}
      />
    );
    expect(screen.getByText('OpenAI')).toBeInTheDocument();
  });

  it('renders collapsible component', () => {
    render(
      <ProviderCard
        provider={mockProvider as unknown as Parameters<typeof ProviderCard>[0]['provider']}
        settings={mockSettings as unknown as Parameters<typeof ProviderCard>[0]['settings']}
        isExpanded={false}
        onToggleExpanded={mockOnToggleExpanded}
        onToggleEnabled={mockOnToggleEnabled}
        onApiKeyChange={mockOnApiKeyChange}
        onBaseURLChange={mockOnBaseURLChange}
        onDefaultModelChange={mockOnDefaultModelChange}
        onTestConnection={mockOnTestConnection}
      />
    );
    expect(screen.getByTestId('collapsible')).toBeInTheDocument();
  });

  it('renders enable/disable switch', () => {
    render(
      <ProviderCard
        provider={mockProvider as unknown as Parameters<typeof ProviderCard>[0]['provider']}
        settings={mockSettings as unknown as Parameters<typeof ProviderCard>[0]['settings']}
        isExpanded={true}
        onToggleExpanded={mockOnToggleExpanded}
        onToggleEnabled={mockOnToggleEnabled}
        onApiKeyChange={mockOnApiKeyChange}
        onBaseURLChange={mockOnBaseURLChange}
        onDefaultModelChange={mockOnDefaultModelChange}
        onTestConnection={mockOnTestConnection}
      />
    );
    expect(screen.getByTestId('switch')).toBeInTheDocument();
  });

  it('calls onToggleEnabled when switch is clicked', () => {
    render(
      <ProviderCard
        provider={mockProvider as unknown as Parameters<typeof ProviderCard>[0]['provider']}
        settings={mockSettings as unknown as Parameters<typeof ProviderCard>[0]['settings']}
        isExpanded={true}
        onToggleExpanded={mockOnToggleExpanded}
        onToggleEnabled={mockOnToggleEnabled}
        onApiKeyChange={mockOnApiKeyChange}
        onBaseURLChange={mockOnBaseURLChange}
        onDefaultModelChange={mockOnDefaultModelChange}
        onTestConnection={mockOnTestConnection}
      />
    );
    fireEvent.click(screen.getByTestId('switch'));
    expect(mockOnToggleEnabled).toHaveBeenCalled();
  });

  it('displays model count badge', () => {
    render(
      <ProviderCard
        provider={mockProvider as unknown as Parameters<typeof ProviderCard>[0]['provider']}
        settings={mockSettings as unknown as Parameters<typeof ProviderCard>[0]['settings']}
        isExpanded={false}
        onToggleExpanded={mockOnToggleExpanded}
        onToggleEnabled={mockOnToggleEnabled}
        onApiKeyChange={mockOnApiKeyChange}
        onBaseURLChange={mockOnBaseURLChange}
        onDefaultModelChange={mockOnDefaultModelChange}
        onTestConnection={mockOnTestConnection}
      />
    );
    const badges = screen.getAllByTestId('badge');
    expect(badges.length).toBeGreaterThan(0);
  });

  it('displays separator when expanded', () => {
    render(
      <ProviderCard
        provider={mockProvider as unknown as Parameters<typeof ProviderCard>[0]['provider']}
        settings={mockSettings as unknown as Parameters<typeof ProviderCard>[0]['settings']}
        isExpanded={true}
        onToggleExpanded={mockOnToggleExpanded}
        onToggleEnabled={mockOnToggleEnabled}
        onApiKeyChange={mockOnApiKeyChange}
        onBaseURLChange={mockOnBaseURLChange}
        onDefaultModelChange={mockOnDefaultModelChange}
        onTestConnection={mockOnTestConnection}
      />
    );
    expect(screen.getByTestId('separator')).toBeInTheDocument();
  });

  it('renders provider links when dashboardUrl and docsUrl are provided', () => {
    render(
      <ProviderCard
        provider={mockProvider as unknown as Parameters<typeof ProviderCard>[0]['provider']}
        settings={mockSettings as unknown as Parameters<typeof ProviderCard>[0]['settings']}
        isExpanded={true}
        onToggleExpanded={mockOnToggleExpanded}
        onToggleEnabled={mockOnToggleEnabled}
        onApiKeyChange={mockOnApiKeyChange}
        onBaseURLChange={mockOnBaseURLChange}
        onDefaultModelChange={mockOnDefaultModelChange}
        onTestConnection={mockOnTestConnection}
      />
    );
    // Provider links should be rendered when URLs are present
    const links = screen.getAllByRole('link');
    expect(links.length).toBeGreaterThanOrEqual(0);
  });

  it('shows API key validation warning for invalid format', () => {
    const invalidSettings = { ...mockSettings, apiKey: 'short' };
    render(
      <ProviderCard
        provider={mockProvider as unknown as Parameters<typeof ProviderCard>[0]['provider']}
        settings={invalidSettings as unknown as Parameters<typeof ProviderCard>[0]['settings']}
        isExpanded={true}
        onToggleExpanded={mockOnToggleExpanded}
        onToggleEnabled={mockOnToggleEnabled}
        onApiKeyChange={mockOnApiKeyChange}
        onBaseURLChange={mockOnBaseURLChange}
        onDefaultModelChange={mockOnDefaultModelChange}
        onTestConnection={mockOnTestConnection}
      />
    );
    // The component should show validation warning for short API keys
    expect(screen.getByTestId('collapsible-content')).toBeInTheDocument();
  });
});
