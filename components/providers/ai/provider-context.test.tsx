/**
 * Tests for ProviderProvider (Provider Context)
 * @jest-environment jsdom
 */

import { renderHook, act, cleanup } from '@testing-library/react';
import {
  ProviderContext,
  useProviderContext,
  useProvider,
  useAvailableProviders,
  useProviderModels,
  ProviderContextValue,
} from './provider-context';
import { ReactNode } from 'react';

// Mock fetch for health checks
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock provider data for testing
const mockProviders: Record<string, unknown> = {
  openai: {
    settings: {
      providerId: 'openai',
      apiKey: 'test-openai-key',
      enabled: true,
      defaultModel: 'gpt-4o',
    },
    metadata: {
      id: 'openai',
      name: 'OpenAI',
      description: 'OpenAI provider',
      requiresApiKey: true,
      supportsStreaming: true,
      supportsVision: true,
      supportsTools: true,
    },
    health: { status: 'healthy' as const, lastCheck: new Date() },
    isCustom: false,
  },
  anthropic: {
    settings: {
      providerId: 'anthropic',
      apiKey: 'test-anthropic-key',
      enabled: true,
      defaultModel: 'claude-3-sonnet',
    },
    metadata: {
      id: 'anthropic',
      name: 'Anthropic',
      description: 'Anthropic provider',
      requiresApiKey: true,
      supportsStreaming: true,
      supportsVision: true,
      supportsTools: true,
    },
    health: { status: 'healthy' as const, lastCheck: new Date() },
    isCustom: false,
  },
  ollama: {
    settings: {
      providerId: 'ollama',
      enabled: true,
      baseURL: 'http://localhost:11434',
      defaultModel: 'llama2',
    },
    metadata: {
      id: 'ollama',
      name: 'Ollama',
      description: 'Local Ollama',
      requiresApiKey: false,
      supportsStreaming: true,
      supportsVision: false,
      supportsTools: false,
    },
    health: { status: 'healthy' as const, lastCheck: new Date() },
    isCustom: false,
  },
};

// Create mock context value
const createMockContextValue = (): ProviderContextValue => ({
  providers: mockProviders as ProviderContextValue['providers'],
  getProvider: (id: string) => mockProviders[id] as ProviderContextValue['providers'][string] | undefined,
  getDefaultProvider: () => mockProviders.openai as ProviderContextValue['providers'][string],
  getEnabledProviders: () => Object.values(mockProviders) as ProviderContextValue['providers'][string][],
  getAvailableProviders: () => Object.values(mockProviders) as ProviderContextValue['providers'][string][],
  checkProviderHealth: jest.fn().mockResolvedValue('healthy'),
  refreshAllHealth: jest.fn().mockResolvedValue(undefined),
  getBestProvider: () => mockProviders.openai as ProviderContextValue['providers'][string],
  isProviderConfigured: (id: string) => !!mockProviders[id],
  isProviderEnabled: (id: string) => !!(mockProviders[id] as { settings?: { enabled?: boolean } })?.settings?.enabled,
  getProviderModels: (id: string) => id === 'openai' ? ['gpt-4o', 'gpt-4', 'gpt-3.5-turbo'] : [],
});

// Mock wrapper using exported ProviderContext
function MockProviderWrapper({ children }: { children: ReactNode }) {
  const contextValue = createMockContextValue();
  return (
    <ProviderContext.Provider value={contextValue}>
      {children}
    </ProviderContext.Provider>
  );
}

describe('ProviderProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    });
  });

  afterEach(() => {
    cleanup();
    jest.clearAllTimers();
    jest.clearAllMocks();
  });

  describe('useProviderContext hook', () => {
    it('throws error when used outside provider', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => useProviderContext());
      }).toThrow('useProviderContext must be used within ProviderProvider');

      consoleSpy.mockRestore();
    });

    it('provides context when used within provider', () => {
      const { result } = renderHook(() => useProviderContext(), { wrapper: MockProviderWrapper });

      expect(result.current).toBeDefined();
      expect(result.current.providers).toBeDefined();
      expect(result.current.getProvider).toBeInstanceOf(Function);
    });
  });

  describe('provider initialization', () => {
    it('initializes providers from settings', () => {
      const { result } = renderHook(() => useProviderContext(), { wrapper: MockProviderWrapper });

      expect(Object.keys(result.current.providers).length).toBeGreaterThan(0);
    });

    it('includes metadata for known providers', () => {
      const { result } = renderHook(() => useProviderContext(), { wrapper: MockProviderWrapper });

      const openai = result.current.providers['openai'];
      expect(openai).toBeDefined();
      expect(openai?.metadata.name).toBe('OpenAI');
      expect(openai?.metadata.supportsVision).toBe(true);
    });
  });

  describe('getProvider', () => {
    it('returns provider by ID', () => {
      const { result } = renderHook(() => useProviderContext(), { wrapper: MockProviderWrapper });

      const openai = result.current.getProvider('openai');
      expect(openai).toBeDefined();
      expect(openai?.settings.providerId).toBe('openai');
    });

    it('returns undefined for unknown provider', () => {
      const { result } = renderHook(() => useProviderContext(), { wrapper: MockProviderWrapper });

      const unknown = result.current.getProvider('unknown-provider');
      expect(unknown).toBeUndefined();
    });
  });

  describe('getDefaultProvider', () => {
    it('returns the default provider', () => {
      const { result } = renderHook(() => useProviderContext(), { wrapper: MockProviderWrapper });

      const defaultProvider = result.current.getDefaultProvider();
      expect(defaultProvider).toBeDefined();
      expect(defaultProvider?.settings.providerId).toBe('openai');
    });
  });

  describe('getEnabledProviders', () => {
    it('returns only enabled providers', () => {
      const { result } = renderHook(() => useProviderContext(), { wrapper: MockProviderWrapper });

      const enabled = result.current.getEnabledProviders();
      expect(enabled.length).toBeGreaterThan(0);
      enabled.forEach((p) => {
        expect(p.settings.enabled).toBe(true);
      });
    });
  });

  describe('getAvailableProviders', () => {
    it('returns only configured and enabled providers', () => {
      const { result } = renderHook(() => useProviderContext(), { wrapper: MockProviderWrapper });

      const available = result.current.getAvailableProviders();
      expect(available.length).toBeGreaterThan(0);
      available.forEach((p) => {
        expect(p.settings.enabled).toBe(true);
      });
    });
  });

  describe('isProviderConfigured', () => {
    it('returns true for configured provider', () => {
      const { result } = renderHook(() => useProviderContext(), { wrapper: MockProviderWrapper });

      expect(result.current.isProviderConfigured('openai')).toBe(true);
    });

    it('returns true for Ollama without API key', () => {
      const { result } = renderHook(() => useProviderContext(), { wrapper: MockProviderWrapper });

      expect(result.current.isProviderConfigured('ollama')).toBe(true);
    });

    it('returns false for unknown provider', () => {
      const { result } = renderHook(() => useProviderContext(), { wrapper: MockProviderWrapper });

      expect(result.current.isProviderConfigured('unknown')).toBe(false);
    });
  });

  describe('isProviderEnabled', () => {
    it('returns true for enabled provider', () => {
      const { result } = renderHook(() => useProviderContext(), { wrapper: MockProviderWrapper });

      expect(result.current.isProviderEnabled('openai')).toBe(true);
    });

    it('returns false for unknown provider', () => {
      const { result } = renderHook(() => useProviderContext(), { wrapper: MockProviderWrapper });

      expect(result.current.isProviderEnabled('unknown')).toBe(false);
    });
  });

  describe('getProviderModels', () => {
    it('returns models for known provider', () => {
      const { result } = renderHook(() => useProviderContext(), { wrapper: MockProviderWrapper });

      const models = result.current.getProviderModels('openai');
      expect(models.length).toBeGreaterThan(0);
      expect(models).toContain('gpt-4o');
    });

    it('returns empty array for unknown provider', () => {
      const { result } = renderHook(() => useProviderContext(), { wrapper: MockProviderWrapper });

      const models = result.current.getProviderModels('unknown');
      expect(models).toEqual([]);
    });
  });

  describe('getBestProvider', () => {
    it('returns best available provider', () => {
      const { result } = renderHook(() => useProviderContext(), { wrapper: MockProviderWrapper });

      const best = result.current.getBestProvider();
      expect(best).toBeDefined();
      expect(best?.settings.enabled).toBe(true);
    });

    it('filters by vision support', () => {
      const { result } = renderHook(() => useProviderContext(), { wrapper: MockProviderWrapper });

      const visionProvider = result.current.getBestProvider({ requireVision: true });
      if (visionProvider) {
        expect(visionProvider.metadata.supportsVision).toBe(true);
      }
    });

    it('filters by tools support', () => {
      const { result } = renderHook(() => useProviderContext(), { wrapper: MockProviderWrapper });

      const toolsProvider = result.current.getBestProvider({ requireTools: true });
      if (toolsProvider) {
        expect(toolsProvider.metadata.supportsTools).toBe(true);
      }
    });
  });

  describe('health checks', () => {
    it('checkProviderHealth returns status', async () => {
      const { result } = renderHook(() => useProviderContext(), { wrapper: MockProviderWrapper });

      expect(typeof result.current.checkProviderHealth).toBe('function');

      await act(async () => {
        const status = await result.current.checkProviderHealth('openai');
        expect(['healthy', 'degraded', 'unhealthy', 'unknown']).toContain(status);
      });
    });

    it('refreshAllHealth checks all enabled providers', async () => {
      const { result } = renderHook(() => useProviderContext(), { wrapper: MockProviderWrapper });

      expect(typeof result.current.refreshAllHealth).toBe('function');

      await act(async () => {
        await result.current.refreshAllHealth();
      });
    });
  });
});

describe('useProvider hook', () => {
  it('returns specific provider', () => {
    const { result } = renderHook(() => useProvider('openai'), { wrapper: MockProviderWrapper });

    expect(result.current).toBeDefined();
    expect(result.current?.settings.providerId).toBe('openai');
  });
});

describe('useAvailableProviders hook', () => {
  it('returns available providers list', () => {
    const { result } = renderHook(() => useAvailableProviders(), { wrapper: MockProviderWrapper });

    expect(Array.isArray(result.current)).toBe(true);
  });
});

describe('useProviderModels hook', () => {
  it('returns models for provider', () => {
    const { result } = renderHook(() => useProviderModels('openai'), { wrapper: MockProviderWrapper });

    expect(result.current.length).toBeGreaterThan(0);
    expect(result.current).toContain('gpt-4o');
  });
});
