/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SetupWizard } from './setup-wizard';

// Mock settings store
const mockSetOnboardingCompleted = jest.fn();
const mockUpdateProviderSettings = jest.fn();
const mockSetDefaultProvider = jest.fn();
const mockSetTheme = jest.fn();
const mockSetLanguage = jest.fn();
const mockSetSearchProviderApiKey = jest.fn();
const mockSetSearchProviderEnabled = jest.fn();

jest.mock('@/stores', () => ({
  useSettingsStore: (selector: (state: unknown) => unknown) => {
    const state = {
      providerSettings: {
        openai: { providerId: 'openai', apiKey: '', enabled: true },
        anthropic: { providerId: 'anthropic', apiKey: '', enabled: true },
      },
      updateProviderSettings: mockUpdateProviderSettings,
      setDefaultProvider: mockSetDefaultProvider,
      setOnboardingCompleted: mockSetOnboardingCompleted,
      theme: 'system',
      setTheme: mockSetTheme,
      language: 'en',
      setLanguage: mockSetLanguage,
      searchProviders: { tavily: { apiKey: '', enabled: false } },
      setSearchProviderApiKey: mockSetSearchProviderApiKey,
      setSearchProviderEnabled: mockSetSearchProviderEnabled,
    };
    return selector(state);
  },
}));

// Mock provider types
jest.mock('@/types/provider', () => ({
  PROVIDERS: {
    openai: { name: 'OpenAI', models: [] },
    anthropic: { name: 'Anthropic', models: [] },
    google: { name: 'Google AI', models: [] },
    deepseek: { name: 'DeepSeek', models: [] },
    groq: { name: 'Groq', models: [] },
    ollama: { name: 'Ollama', models: [] },
  },
}));

// Mock MCP types
jest.mock('@/types/mcp', () => ({
  MCP_SERVER_TEMPLATES: [
    { id: 'filesystem', name: 'Filesystem', description: 'Read and write files' },
    { id: 'github', name: 'GitHub', description: 'Access GitHub repositories' },
    { id: 'memory', name: 'Memory', description: 'Persistent memory storage' },
    { id: 'puppeteer', name: 'Puppeteer', description: 'Browser automation' },
  ],
}));

// Mock API test
jest.mock('@/lib/ai/infrastructure/api-test', () => ({
  testProviderConnection: jest.fn().mockResolvedValue({
    success: true,
    message: 'Connection successful',
  }),
}));

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: (namespace: string) => (key: string, params?: Record<string, string>) => {
    const translations: Record<string, Record<string, string>> = {
      onboarding: {
        welcome: 'Welcome to Cognia',
        welcomeDescription: "Let's get you set up in just a few steps",
        featureChat: 'AI Chat',
        featureChatDesc: 'Natural conversations with advanced AI models',
        featureAgent: 'Agent Mode',
        featureAgentDesc: 'Execute code, analyze data, and automate tasks',
        featureResearch: 'Research Mode',
        featureResearchDesc: 'Deep web research with source citations',
        selectProvider: 'Choose Your AI Provider',
        selectProviderDescription: 'Select a default AI provider to get started.',
        configureApiKey: `Configure ${params?.provider || ''}`,
        configureApiKeyDescription: 'Enter your API key to start using this provider.',
        configureOllamaDescription: 'Configure the Ollama server URL.',
        ollamaUrl: 'Ollama Server URL',
        ollamaHint: 'Make sure Ollama is running locally.',
        apiKey: 'API Key',
        apiKeyPlaceholder: 'Enter your API key...',
        getApiKeyFrom: 'Get your API key from',
        testing: 'Testing...',
        testConnection: 'Test Connection',
        searchConfig: 'Web Search Setup',
        searchConfigDescription: 'Enable AI to search the web.',
        enableWebSearch: 'Enable Web Search',
        enableWebSearchDesc: 'Allow AI to search the web',
        tavilyApiKey: 'Tavily API Key',
        tavilyApiKeyPlaceholder: 'tvly-...',
        getTavilyKey: 'Get your free API key from',
        searchOptionalHint: 'This step is optional.',
        mcpConfig: 'MCP Servers',
        mcpConfigDescription: 'Extend AI capabilities.',
        mcpOptionalHint: 'This step is optional.',
        appearance: 'Personalize Your Experience',
        appearanceDescription: 'Choose your preferred theme and language.',
        themeLabel: 'Theme',
        themeLight: 'Light',
        themeDark: 'Dark',
        themeSystem: 'System',
        languageLabel: 'Language',
        complete: "You're All Set!",
        completeDescription: 'Your configuration is complete.',
        summaryProvider: 'Default Provider',
        summarySearch: 'Web Search',
        summaryMcp: 'MCP Servers',
        summaryMcpCount: `${params?.count || '0'} selected`,
        summaryConfigured: 'Configured',
        summarySkipped: 'Skipped',
        summaryTheme: 'Theme',
        summaryLanguage: 'Language',
        skip: 'Skip for now',
        skipStep: 'Skip',
        next: 'Continue',
        getStarted: 'Get Started',
        saveAndContinue: 'Save & Continue',
        finish: 'Start Using Cognia',
      },
      common: {
        back: 'Back',
      },
    };
    return translations[namespace]?.[key] || key;
  },
}));

// Mock UI components
jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
    disabled,
  }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
}));

jest.mock('@/components/ui/input', () => ({
  Input: ({
    value,
    onChange,
    placeholder,
    id,
    type,
  }: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      id={id}
      type={type}
      data-testid={id || 'input'}
    />
  ),
}));

jest.mock('@/components/ui/label', () => ({
  Label: ({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) => (
    <label htmlFor={htmlFor}>{children}</label>
  ),
}));

jest.mock('@/components/ui/card', () => ({
  Card: ({
    children,
    onClick,
    className,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    className?: string;
  }) => (
    <div data-testid="card" onClick={onClick} className={className}>
      {children}
    </div>
  ),
  CardDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  CardHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: React.ReactNode }) => <h3>{children}</h3>,
}));

jest.mock('@/components/ui/alert', () => ({
  Alert: ({ children }: { children: React.ReactNode }) => (
    <div role="alert">{children}</div>
  ),
  AlertDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
}));

jest.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('@/components/ui/switch', () => ({
  Switch: ({
    checked,
    onCheckedChange,
  }: {
    checked: boolean;
    onCheckedChange: (checked: boolean) => void;
  }) => (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onCheckedChange(!checked)}
      data-testid="switch"
    >
      {checked ? 'On' : 'Off'}
    </button>
  ),
}));

jest.mock('@/lib/utils', () => ({
  cn: (...classes: (string | undefined | boolean)[]) => classes.filter(Boolean).join(' '),
}));

describe('SetupWizard', () => {
  const defaultProps = {
    open: true,
    onOpenChange: jest.fn(),
    onComplete: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders when open', () => {
    render(<SetupWizard {...defaultProps} />);
    expect(screen.getByTestId('dialog')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(<SetupWizard {...defaultProps} open={false} />);
    expect(screen.queryByTestId('dialog')).not.toBeInTheDocument();
  });

  it('displays welcome step initially', () => {
    render(<SetupWizard {...defaultProps} />);
    expect(screen.getByText('Welcome to Cognia')).toBeInTheDocument();
    expect(
      screen.getByText("Let's get you set up in just a few steps")
    ).toBeInTheDocument();
  });

  it('displays feature highlights on welcome step', () => {
    render(<SetupWizard {...defaultProps} />);
    expect(screen.getByText('AI Chat')).toBeInTheDocument();
    expect(screen.getByText('Agent Mode')).toBeInTheDocument();
    expect(screen.getByText('Research Mode')).toBeInTheDocument();
  });

  it('displays skip button on welcome step', () => {
    render(<SetupWizard {...defaultProps} />);
    expect(screen.getByText('Skip for now')).toBeInTheDocument();
  });

  it('displays get started button on welcome step', () => {
    render(<SetupWizard {...defaultProps} />);
    expect(screen.getByText('Get Started')).toBeInTheDocument();
  });

  it('navigates to provider selection when clicking Get Started', () => {
    render(<SetupWizard {...defaultProps} />);
    fireEvent.click(screen.getByText('Get Started'));
    expect(screen.getByText('Choose Your AI Provider')).toBeInTheDocument();
  });

  it('skips onboarding when clicking Skip', () => {
    render(<SetupWizard {...defaultProps} />);
    fireEvent.click(screen.getByText('Skip for now'));
    expect(mockSetOnboardingCompleted).toHaveBeenCalledWith(true);
    expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false);
  });

  it('displays provider cards on provider step', () => {
    render(<SetupWizard {...defaultProps} />);
    fireEvent.click(screen.getByText('Get Started'));
    expect(screen.getByText('OpenAI')).toBeInTheDocument();
    expect(screen.getByText('Anthropic')).toBeInTheDocument();
    expect(screen.getByText('Google AI')).toBeInTheDocument();
  });

  it('navigates to API key step when clicking Continue on provider step', () => {
    render(<SetupWizard {...defaultProps} />);
    fireEvent.click(screen.getByText('Get Started'));
    fireEvent.click(screen.getByText('Continue'));
    expect(screen.getByText('Configure OpenAI')).toBeInTheDocument();
  });

  it('shows back button on provider step', () => {
    render(<SetupWizard {...defaultProps} />);
    fireEvent.click(screen.getByText('Get Started'));
    expect(screen.getByText('Back')).toBeInTheDocument();
  });

  it('navigates back to welcome when clicking Back on provider step', () => {
    render(<SetupWizard {...defaultProps} />);
    fireEvent.click(screen.getByText('Get Started'));
    fireEvent.click(screen.getByText('Back'));
    expect(screen.getByText('Welcome to Cognia')).toBeInTheDocument();
  });

  it('shows test connection button on API key step', () => {
    render(<SetupWizard {...defaultProps} />);
    fireEvent.click(screen.getByText('Get Started'));
    fireEvent.click(screen.getByText('Continue'));
    expect(screen.getByText('Test Connection')).toBeInTheDocument();
  });

  it('navigates through all steps to completion', async () => {
    render(<SetupWizard {...defaultProps} />);

    // Welcome -> Provider
    fireEvent.click(screen.getByText('Get Started'));
    expect(screen.getByText('Choose Your AI Provider')).toBeInTheDocument();

    // Provider -> API Key
    fireEvent.click(screen.getByText('Continue'));
    expect(screen.getByText('Configure OpenAI')).toBeInTheDocument();

    // Enter API key
    const apiKeyInput = screen.getByTestId('api-key');
    fireEvent.change(apiKeyInput, { target: { value: 'sk-test12345678901234567890' } });

    // API Key -> Search
    fireEvent.click(screen.getByText('Save & Continue'));
    
    await waitFor(() => {
      expect(mockUpdateProviderSettings).toHaveBeenCalled();
    });
  });

  it('displays search configuration step', async () => {
    render(<SetupWizard {...defaultProps} />);

    // Navigate to search step
    fireEvent.click(screen.getByText('Get Started'));
    fireEvent.click(screen.getByText('Continue'));
    const apiKeyInput = screen.getByTestId('api-key');
    fireEvent.change(apiKeyInput, { target: { value: 'sk-test12345678901234567890' } });
    fireEvent.click(screen.getByText('Save & Continue'));

    await waitFor(() => {
      expect(screen.getByText('Web Search Setup')).toBeInTheDocument();
    });
  });

  it('displays MCP configuration step', async () => {
    render(<SetupWizard {...defaultProps} />);

    // Navigate to MCP step
    fireEvent.click(screen.getByText('Get Started'));
    fireEvent.click(screen.getByText('Continue'));
    const apiKeyInput = screen.getByTestId('api-key');
    fireEvent.change(apiKeyInput, { target: { value: 'sk-test12345678901234567890' } });
    fireEvent.click(screen.getByText('Save & Continue'));

    await waitFor(() => {
      expect(screen.getByText('Web Search Setup')).toBeInTheDocument();
    });

    // Search -> MCP
    fireEvent.click(screen.getByText('Skip'));

    await waitFor(() => {
      expect(screen.getByText('MCP Servers')).toBeInTheDocument();
    });
  });

  it('displays MCP server options', async () => {
    render(<SetupWizard {...defaultProps} />);

    // Navigate to MCP step
    fireEvent.click(screen.getByText('Get Started'));
    fireEvent.click(screen.getByText('Continue'));
    const apiKeyInput = screen.getByTestId('api-key');
    fireEvent.change(apiKeyInput, { target: { value: 'sk-test12345678901234567890' } });
    fireEvent.click(screen.getByText('Save & Continue'));

    await waitFor(() => {
      expect(screen.getByText('Web Search Setup')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Skip'));

    await waitFor(() => {
      expect(screen.getByText('Filesystem')).toBeInTheDocument();
      expect(screen.getByText('GitHub')).toBeInTheDocument();
    });
  });

  it('displays enable search toggle on search step', async () => {
    render(<SetupWizard {...defaultProps} />);

    // Navigate to search step
    fireEvent.click(screen.getByText('Get Started'));
    fireEvent.click(screen.getByText('Continue'));
    const apiKeyInput = screen.getByTestId('api-key');
    fireEvent.change(apiKeyInput, { target: { value: 'sk-test12345678901234567890' } });
    fireEvent.click(screen.getByText('Save & Continue'));

    await waitFor(() => {
      expect(screen.getByText('Enable Web Search')).toBeInTheDocument();
    });
  });

  it('displays tavily API key input on search step', async () => {
    render(<SetupWizard {...defaultProps} />);

    // Navigate to search step
    fireEvent.click(screen.getByText('Get Started'));
    fireEvent.click(screen.getByText('Continue'));
    const apiKeyInput = screen.getByTestId('api-key');
    fireEvent.change(apiKeyInput, { target: { value: 'sk-test12345678901234567890' } });
    fireEvent.click(screen.getByText('Save & Continue'));

    await waitFor(() => {
      expect(screen.getByText('Tavily API Key')).toBeInTheDocument();
    });
  });

  it('displays optional hint on search step', async () => {
    render(<SetupWizard {...defaultProps} />);

    // Navigate to search step
    fireEvent.click(screen.getByText('Get Started'));
    fireEvent.click(screen.getByText('Continue'));
    const apiKeyInput = screen.getByTestId('api-key');
    fireEvent.change(apiKeyInput, { target: { value: 'sk-test12345678901234567890' } });
    fireEvent.click(screen.getByText('Save & Continue'));

    await waitFor(() => {
      expect(screen.getByText('This step is optional.')).toBeInTheDocument();
    });
  });

  it('saves search settings when configured', async () => {
    render(<SetupWizard {...defaultProps} />);

    // Navigate to search step
    fireEvent.click(screen.getByText('Get Started'));
    fireEvent.click(screen.getByText('Continue'));
    const apiKeyInput = screen.getByTestId('api-key');
    fireEvent.change(apiKeyInput, { target: { value: 'sk-test12345678901234567890' } });
    fireEvent.click(screen.getByText('Save & Continue'));

    await waitFor(() => {
      expect(screen.getByText('Web Search Setup')).toBeInTheDocument();
    });

    // Enter Tavily API key
    const tavilyInput = screen.getByTestId('tavily-key');
    fireEvent.change(tavilyInput, { target: { value: 'tvly-test123456789' } });

    // Save & Continue should appear
    fireEvent.click(screen.getByText('Save & Continue'));

    await waitFor(() => {
      expect(mockSetSearchProviderApiKey).toHaveBeenCalledWith('tavily', 'tvly-test123456789');
    });
  });

  it('allows selecting multiple MCP servers', async () => {
    render(<SetupWizard {...defaultProps} />);

    // Navigate to MCP step
    fireEvent.click(screen.getByText('Get Started'));
    fireEvent.click(screen.getByText('Continue'));
    const apiKeyInput = screen.getByTestId('api-key');
    fireEvent.change(apiKeyInput, { target: { value: 'sk-test12345678901234567890' } });
    fireEvent.click(screen.getByText('Save & Continue'));

    await waitFor(() => {
      expect(screen.getByText('Web Search Setup')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Skip'));

    await waitFor(() => {
      expect(screen.getByText('MCP Servers')).toBeInTheDocument();
    });

    // Click on Filesystem server card
    const cards = screen.getAllByTestId('card');
    expect(cards.length).toBeGreaterThan(0);
    fireEvent.click(cards[0]);
  });

  it('displays optional hint on MCP step', async () => {
    render(<SetupWizard {...defaultProps} />);

    // Navigate to MCP step
    fireEvent.click(screen.getByText('Get Started'));
    fireEvent.click(screen.getByText('Continue'));
    const apiKeyInput = screen.getByTestId('api-key');
    fireEvent.change(apiKeyInput, { target: { value: 'sk-test12345678901234567890' } });
    fireEvent.click(screen.getByText('Save & Continue'));

    await waitFor(() => {
      expect(screen.getByText('Web Search Setup')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Skip'));

    await waitFor(() => {
      expect(screen.getByText('This step is optional.')).toBeInTheDocument();
    });
  });

  it('shows configuration summary on complete step', async () => {
    render(<SetupWizard {...defaultProps} />);

    // Navigate through all steps
    fireEvent.click(screen.getByText('Get Started'));
    fireEvent.click(screen.getByText('Continue'));
    const apiKeyInput = screen.getByTestId('api-key');
    fireEvent.change(apiKeyInput, { target: { value: 'sk-test12345678901234567890' } });
    fireEvent.click(screen.getByText('Save & Continue'));

    // Skip search
    await waitFor(() => {
      expect(screen.getByText('Web Search Setup')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Skip'));

    // Skip MCP
    await waitFor(() => {
      expect(screen.getByText('MCP Servers')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Skip'));

    // Skip appearance
    await waitFor(() => {
      expect(screen.getByText('Personalize Your Experience')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Continue'));

    // Complete step should show summary
    await waitFor(() => {
      expect(screen.getByText('Default Provider')).toBeInTheDocument();
      expect(screen.getByText('Web Search')).toBeInTheDocument();
      expect(screen.getByText('MCP Servers')).toBeInTheDocument();
      expect(screen.getByText('Theme')).toBeInTheDocument();
    });
  });

  it('shows skipped status for unconfigured options', async () => {
    render(<SetupWizard {...defaultProps} />);

    // Navigate through all steps
    fireEvent.click(screen.getByText('Get Started'));
    fireEvent.click(screen.getByText('Continue'));
    const apiKeyInput = screen.getByTestId('api-key');
    fireEvent.change(apiKeyInput, { target: { value: 'sk-test12345678901234567890' } });
    fireEvent.click(screen.getByText('Save & Continue'));

    await waitFor(() => {
      expect(screen.getByText('Web Search Setup')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Skip'));

    await waitFor(() => {
      expect(screen.getByText('MCP Servers')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Skip'));

    await waitFor(() => {
      expect(screen.getByText('Personalize Your Experience')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Continue'));

    // Both search and MCP should show "Skipped" status
    await waitFor(() => {
      const skippedElements = screen.getAllByText('Skipped');
      expect(skippedElements.length).toBe(2);
    });
  });

  it('calls onComplete when finishing wizard', async () => {
    render(<SetupWizard {...defaultProps} />);

    // Navigate through all steps
    fireEvent.click(screen.getByText('Get Started'));
    fireEvent.click(screen.getByText('Continue'));

    // Enter API key
    const apiKeyInput = screen.getByTestId('api-key');
    fireEvent.change(apiKeyInput, { target: { value: 'sk-test12345678901234567890' } });
    fireEvent.click(screen.getByText('Save & Continue'));

    // Skip search
    await waitFor(() => {
      expect(screen.getByText('Web Search Setup')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Skip'));

    // Skip MCP
    await waitFor(() => {
      expect(screen.getByText('MCP Servers')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Skip'));

    // Appearance -> Complete
    await waitFor(() => {
      expect(screen.getByText('Personalize Your Experience')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Continue'));

    await waitFor(() => {
      expect(screen.getByText("You're All Set!")).toBeInTheDocument();
    });

    // Finish
    fireEvent.click(screen.getByText('Start Using Cognia'));
    
    expect(mockSetOnboardingCompleted).toHaveBeenCalledWith(true);
    expect(defaultProps.onComplete).toHaveBeenCalled();
    expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false);
  });
});
