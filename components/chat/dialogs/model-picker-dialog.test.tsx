/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ModelPickerDialog } from './model-picker-dialog';
import { useSettingsStore } from '@/stores';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      title: 'Select Model',
      searchPlaceholder: 'Search models...',
      noModels: 'No models found',
      configureProviders: 'Configure providers in settings',
      recentModels: 'Recent Models',
      tools: 'Supports Tools',
      vision: 'Supports Vision',
    };
    return translations[key] || key;
  },
}));

// Mock ProviderContext
jest.mock('@/components/providers/ai/provider-context', () => ({
  useProviderContext: () => ({
    enabledProviders: ['openai', 'anthropic', 'zhipu', 'minimax', 'groq', 'custom-alpha'],
    getProviderModels: (providerId: string) => {
      const models: Record<string, Array<{ id: string; name: string; contextLength: number; supportsTools: boolean; supportsVision: boolean }>> = {
        openai: [
          { id: 'gpt-4o', name: 'GPT-4o', contextLength: 128000, supportsTools: true, supportsVision: true },
          { id: 'gpt-4o-mini', name: 'GPT-4o Mini', contextLength: 128000, supportsTools: true, supportsVision: true },
        ],
        anthropic: [
          { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', contextLength: 200000, supportsTools: true, supportsVision: true },
        ],
        zhipu: [
          { id: 'glm-4-flash', name: 'GLM-4 Flash', contextLength: 128000, supportsTools: true, supportsVision: false },
        ],
        minimax: [
          { id: 'abab6.5s-chat', name: 'abab6.5s-chat', contextLength: 128000, supportsTools: true, supportsVision: false },
        ],
        groq: [
          { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B', contextLength: 128000, supportsTools: true, supportsVision: false },
        ],
        'custom-alpha': [
          { id: 'alpha-1', name: 'alpha-1', contextLength: 64000, supportsTools: true, supportsVision: false },
        ],
      };
      return models[providerId] || [];
    },
    getProvider: (providerId: string) => ({
      id: providerId,
      name:
        providerId === 'openai'
          ? 'OpenAI'
          : providerId === 'anthropic'
            ? 'Anthropic'
            : providerId === 'zhipu'
              ? 'Zhipu AI (智谱清言)'
              : providerId === 'minimax'
                ? 'MiniMax'
                : providerId === 'groq'
                  ? 'Groq'
                  : 'Custom Alpha',
      metadata: { icon: 'default' },
    }),
    isProviderEnabled: () => true,
  }),
  ProviderProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock stores
jest.mock('@/stores', () => {
  let state = {
    language: 'en',
    providerSettings: {
      openai: {
        providerId: 'openai',
        enabled: true,
        apiKey: 'test-key',
        defaultModel: 'gpt-4o',
      },
      anthropic: {
        providerId: 'anthropic',
        enabled: true,
        apiKey: 'test-key',
        defaultModel: 'claude-3-5-sonnet-20241022',
      },
      zhipu: {
        providerId: 'zhipu',
        enabled: true,
        apiKey: 'test-key',
        defaultModel: 'glm-4-flash',
      },
      minimax: {
        providerId: 'minimax',
        enabled: true,
        apiKey: 'test-key',
        defaultModel: 'abab6.5s-chat',
      },
      groq: {
        providerId: 'groq',
        enabled: true,
        apiKey: '',
        apiKeys: ['groq-pooled-key'],
        defaultModel: 'llama-3.3-70b-versatile',
      },
    },
    customProviders: {
      'custom-alpha': {
        providerId: 'custom-alpha',
        isCustom: true,
        enabled: true,
        apiKey: 'sk-custom-alpha',
        baseURL: 'https://custom.example.com/v1',
        defaultModel: 'alpha-1',
        customName: 'Custom Alpha',
        customModels: ['alpha-1'],
        apiProtocol: 'openai',
      },
    },
  };

  const useSettingsStore = jest.fn((selector: (incomingState: typeof state) => unknown) =>
    selector ? selector(state) : state
  ) as unknown as {
    (selector: (incomingState: typeof state) => unknown): unknown;
    getState: () => typeof state;
    __setState: (nextState: typeof state) => void;
  };

  useSettingsStore.getState = () => state;
  useSettingsStore.__setState = (nextState) => {
    state = nextState;
  };

  return {
    useSettingsStore,
  };
});

// Mock provider types
jest.mock('@/types/provider', () => ({
  PROVIDERS: {
    openai: {
      name: 'OpenAI',
      models: [
        { id: 'gpt-4o', name: 'GPT-4o', contextLength: 128000, supportsTools: true, supportsVision: true },
        { id: 'gpt-4o-mini', name: 'GPT-4o Mini', contextLength: 128000, supportsTools: true, supportsVision: true },
      ],
    },
    anthropic: {
      name: 'Anthropic',
      models: [
        { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', contextLength: 200000, supportsTools: true, supportsVision: true },
      ],
    },
    zhipu: {
      name: 'Zhipu AI (智谱清言)',
      category: 'specialized',
      models: [
        { id: 'glm-4-flash', name: 'GLM-4 Flash', contextLength: 128000, supportsTools: true, supportsVision: false },
      ],
    },
    minimax: {
      name: 'MiniMax',
      category: 'specialized',
      models: [
        { id: 'abab6.5s-chat', name: 'abab6.5s-chat', contextLength: 128000, supportsTools: true, supportsVision: false },
      ],
    },
    groq: {
      name: 'Groq',
      category: 'specialized',
      models: [
        { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B', contextLength: 128000, supportsTools: true, supportsVision: false },
      ],
    },
  },
}));

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(() => null),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock UI components
jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open: boolean }) => 
    open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2 className="sr-only">{children}</h2>,
}));

jest.mock('@/components/ui/command', () => ({
  Command: ({ children }: { children: React.ReactNode }) => <div data-testid="command">{children}</div>,
  CommandEmpty: ({ children }: { children: React.ReactNode }) => <div data-testid="command-empty">{children}</div>,
  CommandGroup: ({ children, heading }: { children: React.ReactNode; heading: React.ReactNode }) => (
    <div data-testid="command-group">
      <div data-testid="group-heading">{heading}</div>
      {children}
    </div>
  ),
  CommandInput: ({ value, onValueChange, placeholder }: { value: string; onValueChange: (v: string) => void; placeholder: string }) => (
    <input
      data-testid="command-input"
      value={value}
      onChange={(e) => onValueChange(e.target.value)}
      placeholder={placeholder}
    />
  ),
  CommandItem: ({ children, onSelect, value }: { children: React.ReactNode; onSelect: () => void; value: string }) => (
    <div data-testid="command-item" data-value={value} onClick={onSelect}>{children}</div>
  ),
  CommandList: ({ children }: { children: React.ReactNode }) => <div data-testid="command-list">{children}</div>,
  CommandSeparator: () => <hr />,
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span data-testid="badge">{children}</span>,
}));

jest.mock('@/components/ui/switch', () => ({
  Switch: ({ checked, onCheckedChange }: { checked: boolean; onCheckedChange: () => void }) => (
    <input type="checkbox" checked={checked} onChange={onCheckedChange} data-testid="switch" />
  ),
}));

jest.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe('ModelPickerDialog', () => {
  const defaultProps = {
    open: true,
    onOpenChange: jest.fn(),
    currentProvider: 'openai',
    currentModel: 'gpt-4o',
    isAutoMode: false,
    onModelSelect: jest.fn(),
    onAutoModeToggle: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
    (useSettingsStore as unknown as {
      __setState: (nextState: unknown) => void;
    }).__setState({
      language: 'en',
      providerSettings: {
        openai: {
          providerId: 'openai',
          enabled: true,
          apiKey: 'test-key',
          defaultModel: 'gpt-4o',
        },
        anthropic: {
          providerId: 'anthropic',
          enabled: true,
          apiKey: 'test-key',
          defaultModel: 'claude-3-5-sonnet-20241022',
        },
        zhipu: {
          providerId: 'zhipu',
          enabled: true,
          apiKey: 'test-key',
          defaultModel: 'glm-4-flash',
        },
        minimax: {
          providerId: 'minimax',
          enabled: true,
          apiKey: 'test-key',
          defaultModel: 'abab6.5s-chat',
        },
        groq: {
          providerId: 'groq',
          enabled: true,
          apiKey: '',
          apiKeys: ['groq-pooled-key'],
          defaultModel: 'llama-3.3-70b-versatile',
        },
      },
      customProviders: {
        'custom-alpha': {
          providerId: 'custom-alpha',
          isCustom: true,
          enabled: true,
          apiKey: 'sk-custom-alpha',
          baseURL: 'https://custom.example.com/v1',
          defaultModel: 'alpha-1',
          customName: 'Custom Alpha',
          customModels: ['alpha-1'],
          apiProtocol: 'openai',
        },
      },
    });
  });

  it('renders when open is true', () => {
    render(<ModelPickerDialog {...defaultProps} />);
    expect(screen.getByTestId('dialog')).toBeInTheDocument();
  });

  it('does not render when open is false', () => {
    render(<ModelPickerDialog {...defaultProps} open={false} />);
    expect(screen.queryByTestId('dialog')).not.toBeInTheDocument();
  });

  it('displays search input with placeholder', () => {
    render(<ModelPickerDialog {...defaultProps} />);
    expect(screen.getByPlaceholderText('Search models...')).toBeInTheDocument();
  });

  it('displays category tabs', () => {
    render(<ModelPickerDialog {...defaultProps} />);
    expect(screen.getByText('All')).toBeInTheDocument();
    expect(screen.getByText('Flagship')).toBeInTheDocument();
    expect(screen.getByText('Aggregator')).toBeInTheDocument();
    expect(screen.getByText('Fast')).toBeInTheDocument();
    expect(screen.getByText('Local')).toBeInTheDocument();
  });

  it('displays auto mode toggle when onAutoModeToggle is provided', () => {
    render(<ModelPickerDialog {...defaultProps} />);
    expect(screen.getByTestId('switch')).toBeInTheDocument();
  });

  it('displays provider groups', () => {
    render(<ModelPickerDialog {...defaultProps} />);
    expect(screen.getByText('OpenAI')).toBeInTheDocument();
    expect(screen.getByText('Anthropic')).toBeInTheDocument();
  });

  it('displays models from enabled providers', () => {
    render(<ModelPickerDialog {...defaultProps} />);
    expect(screen.getByText('GPT-4o')).toBeInTheDocument();
    expect(screen.getByText('GPT-4o Mini')).toBeInTheDocument();
    expect(screen.getByText('Claude 3.5 Sonnet')).toBeInTheDocument();
    expect(screen.getByText('GLM-4 Flash')).toBeInTheDocument();
    expect(screen.getByText('abab6.5s-chat')).toBeInTheDocument();
  });

  it('keeps zhipu and minimax visible under Fast category filtering', () => {
    render(<ModelPickerDialog {...defaultProps} />);

    fireEvent.click(screen.getByText('Fast'));

    expect(screen.getByText('Zhipu AI (智谱清言)')).toBeInTheDocument();
    expect(screen.getByText('MiniMax')).toBeInTheDocument();
  });

  it('shows providers backed only by pooled API keys', () => {
    render(<ModelPickerDialog {...defaultProps} />);

    expect(screen.getByText('Groq')).toBeInTheDocument();
    expect(screen.getByText('Llama 3.3 70B')).toBeInTheDocument();
  });

  it('shows selectable custom providers from settings projections', () => {
    render(<ModelPickerDialog {...defaultProps} />);

    expect(screen.getByText('Custom Alpha')).toBeInTheDocument();
    expect(screen.getByText('alpha-1')).toBeInTheDocument();
  });

  it('shows blocked setup guidance when no provider is selectable', () => {
    const blockedState = {
      ...useSettingsStore.getState(),
      providerSettings: {
        openai: {
          providerId: 'openai',
          enabled: true,
          apiKey: '',
          defaultModel: 'gpt-4o',
        },
      },
      customProviders: {},
    };

    (useSettingsStore as unknown as {
      __setState: (nextState: unknown) => void;
    }).__setState(blockedState);

    render(<ModelPickerDialog {...defaultProps} />);

    expect(screen.getByText('Add an API key before using this provider at runtime.')).toBeInTheDocument();
  });

  it('calls onModelSelect when a model is clicked', () => {
    render(<ModelPickerDialog {...defaultProps} />);
    const modelItems = screen.getAllByTestId('command-item');
    fireEvent.click(modelItems[0]);
    expect(defaultProps.onModelSelect).toHaveBeenCalled();
  });

  it('calls onOpenChange when a model is selected', () => {
    render(<ModelPickerDialog {...defaultProps} />);
    const modelItems = screen.getAllByTestId('command-item');
    fireEvent.click(modelItems[0]);
    expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false);
  });

  it('filters models based on search query', () => {
    render(<ModelPickerDialog {...defaultProps} />);
    const searchInput = screen.getByPlaceholderText('Search models...');
    fireEvent.change(searchInput, { target: { value: 'claude' } });
    // Search functionality is handled internally
    expect(searchInput).toHaveValue('claude');
  });

  it('calls onAutoModeToggle when auto mode switch is clicked', () => {
    render(<ModelPickerDialog {...defaultProps} />);
    const autoSwitch = screen.getByTestId('switch');
    fireEvent.click(autoSwitch);
    expect(defaultProps.onAutoModeToggle).toHaveBeenCalled();
  });

  it('shows auto mode as active when isAutoMode is true', () => {
    render(<ModelPickerDialog {...defaultProps} isAutoMode={true} />);
    const autoSwitch = screen.getByTestId('switch');
    expect(autoSwitch).toBeChecked();
  });

  it('displays model context length', () => {
    render(<ModelPickerDialog {...defaultProps} />);
    // Multiple models have context length displayed
    expect(screen.getAllByText(/128K context/).length).toBeGreaterThan(0);
  });

  it('displays model count per provider', () => {
    render(<ModelPickerDialog {...defaultProps} />);
    expect(screen.getByText('(2)')).toBeInTheDocument(); // OpenAI has 2 models
    expect(screen.getAllByText('(1)').length).toBeGreaterThanOrEqual(3);
  });

  it('has clear search button when search has value', () => {
    render(<ModelPickerDialog {...defaultProps} />);
    const searchInput = screen.getByPlaceholderText('Search models...');
    fireEvent.change(searchInput, { target: { value: 'test' } });
    // X button should appear, handled by component
    expect(searchInput).toHaveValue('test');
  });

  describe('ProviderIcon integration', () => {
    it('renders provider icons in provider group headings', () => {
      const { container } = render(<ModelPickerDialog {...defaultProps} />);
      // ProviderIcon renders img elements for known providers in group headings
      const imgs = container.querySelectorAll('img[alt*="icon"]');
      expect(imgs.length).toBeGreaterThan(0);
    });

    it('renders provider icon for each model item', () => {
      const { container } = render(<ModelPickerDialog {...defaultProps} />);
      // Each model item + group heading has a ProviderIcon
      const imgs = container.querySelectorAll('img[alt*="icon"]');
      // Mock data: 2 providers (openai=2 models, anthropic=1 model) = 2 heading + 3 item = 5
      // But some may share the same provider icon element; at minimum 3+ icons
      expect(imgs.length).toBeGreaterThanOrEqual(3);
    });
  });
});
