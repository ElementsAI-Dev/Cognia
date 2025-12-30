/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProviderSettings } from './provider-settings';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock stores
const mockUpdateProviderSettings = jest.fn();
const mockUpdateCustomProvider = jest.fn();
const mockAddApiKey = jest.fn();
const mockRemoveApiKey = jest.fn();
const mockSetApiKeyRotation = jest.fn();
const mockResetApiKeyStats = jest.fn();

jest.mock('@/stores', () => ({
  useSettingsStore: (selector: (state: Record<string, unknown>) => unknown) => {
    const state = {
      providerSettings: {
        openai: { apiKey: 'test-key', enabled: true },
        anthropic: { apiKey: '', enabled: false },
        google: { apiKey: '', enabled: false },
        ollama: { enabled: true, baseURL: 'http://localhost:11434' },
      },
      customProviders: {},
      updateProviderSettings: mockUpdateProviderSettings,
      updateCustomProvider: mockUpdateCustomProvider,
      addApiKey: mockAddApiKey,
      removeApiKey: mockRemoveApiKey,
      setApiKeyRotation: mockSetApiKeyRotation,
      resetApiKeyStats: mockResetApiKeyStats,
    };
    return selector(state);
  },
}));

// Mock provider types
jest.mock('@/types/provider', () => ({
  PROVIDERS: {
    openai: {
      id: 'openai',
      name: 'OpenAI',
      models: [{ id: 'gpt-4', name: 'GPT-4' }],
      defaultModel: 'gpt-4',
      category: 'flagship',
    },
    anthropic: {
      id: 'anthropic',
      name: 'Anthropic',
      models: [{ id: 'claude-3', name: 'Claude 3' }],
      defaultModel: 'claude-3',
      category: 'flagship',
    },
    ollama: {
      id: 'ollama',
      name: 'Ollama',
      models: [{ id: 'llama3', name: 'Llama 3' }],
      defaultModel: 'llama3',
      category: 'local',
    },
  },
}));

// Mock API test
jest.mock('@/lib/ai/api-test', () => ({
  testProviderConnection: jest.fn().mockResolvedValue({ success: true, latency_ms: 100 }),
}));

// Mock API key rotation
jest.mock('@/lib/ai/api-key-rotation', () => ({
  maskApiKey: (key: string) => key ? `${key.slice(0, 4)}...${key.slice(-4)}` : '',
}));

// Mock child components
jest.mock('./custom-provider-dialog', () => ({
  CustomProviderDialog: () => <div data-testid="custom-provider-dialog" />,
}));

jest.mock('./oauth-login-button', () => ({
  OAuthLoginButton: () => null,
}));

jest.mock('./provider-import-export', () => ({
  ProviderImportExport: () => <div data-testid="provider-import-export" />,
}));

jest.mock('./provider-health-status', () => ({
  ProviderHealthStatus: () => <div data-testid="provider-health-status" />,
}));

jest.mock('./ollama-model-manager', () => ({
  OllamaModelManager: () => <div data-testid="ollama-model-manager" />,
}));

// Mock UI components
jest.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div data-testid="card">{children}</div>,
  CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  CardHeader: ({ children, className }: { children: React.ReactNode; className?: string }) => <div className={className}>{children}</div>,
  CardTitle: ({ children }: { children: React.ReactNode }) => <h3>{children}</h3>,
}));

jest.mock('@/components/ui/input', () => ({
  Input: ({ value, onChange, placeholder, id, disabled, type }: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input value={value} onChange={onChange} placeholder={placeholder} id={id} disabled={disabled} type={type} data-testid={id || 'input'} />
  ),
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, variant }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: string }) => (
    <button onClick={onClick} disabled={disabled} data-variant={variant}>{children}</button>
  ),
}));

jest.mock('@/components/ui/switch', () => ({
  Switch: ({ checked, onCheckedChange, disabled }: { checked?: boolean; onCheckedChange?: (v: boolean) => void; disabled?: boolean }) => (
    <button role="switch" aria-checked={checked} onClick={() => !disabled && onCheckedChange?.(!checked)} disabled={disabled} data-testid="switch">Switch</button>
  ),
}));

jest.mock('@/components/ui/label', () => ({
  Label: ({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) => (
    <label htmlFor={htmlFor}>{children}</label>
  ),
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span data-testid="badge">{children}</span>,
}));

jest.mock('@/components/ui/progress', () => ({
  Progress: ({ value }: { value: number }) => <div data-testid="progress" data-value={value} />,
}));

jest.mock('@/components/ui/alert', () => ({
  Alert: ({ children }: { children: React.ReactNode }) => <div role="alert">{children}</div>,
  AlertDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  AlertTitle: ({ children }: { children: React.ReactNode }) => <h4>{children}</h4>,
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
  SelectValue: () => <span>Value</span>,
}));

jest.mock('@/components/ui/collapsible', () => ({
  Collapsible: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CollapsibleContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CollapsibleTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('@/lib/utils', () => ({
  cn: (...args: string[]) => args.filter(Boolean).join(' '),
}));

describe('ProviderSettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders provider settings component', () => {
    render(<ProviderSettings />);
    expect(screen.getByText('title')).toBeInTheDocument();
  });

  it('displays security alert', () => {
    render(<ProviderSettings />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('securityTitle')).toBeInTheDocument();
  });

  it('displays OpenAI provider', () => {
    render(<ProviderSettings />);
    expect(screen.getByText('OpenAI')).toBeInTheDocument();
  });

  it('displays Anthropic provider', () => {
    render(<ProviderSettings />);
    expect(screen.getByText('Anthropic')).toBeInTheDocument();
  });

  it('displays Ollama provider', () => {
    render(<ProviderSettings />);
    expect(screen.getByText('Ollama')).toBeInTheDocument();
  });

  it('displays Test All Providers button', () => {
    render(<ProviderSettings />);
    expect(screen.getByText('Test All Providers')).toBeInTheDocument();
  });

  it('displays custom providers section', () => {
    render(<ProviderSettings />);
    expect(screen.getByText('customProviders')).toBeInTheDocument();
  });

  it('displays add provider button', () => {
    render(<ProviderSettings />);
    expect(screen.getByText('addProvider')).toBeInTheDocument();
  });

  it('renders provider import/export component', () => {
    render(<ProviderSettings />);
    expect(screen.getByTestId('provider-import-export')).toBeInTheDocument();
  });

  it('renders custom provider dialog', () => {
    render(<ProviderSettings />);
    expect(screen.getByTestId('custom-provider-dialog')).toBeInTheDocument();
  });

  it('displays configured providers count', () => {
    render(<ProviderSettings />);
    expect(screen.getByText(/provider.*configured/i)).toBeInTheDocument();
  });

  it('renders switches for providers', () => {
    render(<ProviderSettings />);
    const switches = screen.getAllByRole('switch');
    expect(switches.length).toBeGreaterThan(0);
  });

  it('toggles provider enabled state', () => {
    render(<ProviderSettings />);
    const switches = screen.getAllByRole('switch');
    fireEvent.click(switches[0]);
    expect(mockUpdateProviderSettings).toHaveBeenCalled();
  });
});
