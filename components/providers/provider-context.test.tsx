/**
 * Tests for ProviderProvider (Provider Context)
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import {
  ProviderProvider,
  useProviderContext,
  useProvider,
  useAvailableProviders,
  useProviderModels,
} from './provider-context';
import { useSettingsStore } from '@/stores/settings-store';
import { ReactNode } from 'react';

// Mock the settings store
jest.mock('@/stores/settings-store', () => ({
  useSettingsStore: jest.fn(),
}));

// Mock fetch for health checks
const mockFetch = jest.fn();
global.fetch = mockFetch;

const mockUseSettingsStore = useSettingsStore as jest.MockedFunction<typeof useSettingsStore>;

describe('ProviderProvider', () => {
  const defaultProviderSettings = {
    openai: {
      providerId: 'openai',
      apiKey: 'test-openai-key',
      enabled: true,
    },
    anthropic: {
      providerId: 'anthropic',
      apiKey: 'test-anthropic-key',
      enabled: true,
    },
    ollama: {
      providerId: 'ollama',
      enabled: true,
      baseURL: 'http://localhost:11434',
    },
  };

  const wrapper = ({ children }: { children: ReactNode }) => (
    <ProviderProvider enableHealthChecks={false}>
      {children}
    </ProviderProvider>
  );

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    mockUseSettingsStore.mockImplementation((selector) => {
      const state = {
        providerSettings: defaultProviderSettings,
        customProviders: {},
        defaultProvider: 'openai',
      };
      // @ts-expect-error - Partial mock state for testing
      return selector(state);
    });

    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    });
  });

  afterEach(() => {
    jest.useRealTimers();
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
      const { result } = renderHook(() => useProviderContext(), { wrapper });

      expect(result.current).toBeDefined();
      expect(result.current.providers).toBeDefined();
      expect(result.current.getProvider).toBeInstanceOf(Function);
    });
  });

  describe('provider initialization', () => {
    it('initializes providers from settings', async () => {
      const { result } = renderHook(() => useProviderContext(), { wrapper });

      await waitFor(() => {
        expect(Object.keys(result.current.providers).length).toBeGreaterThan(0);
      });
    });

    it('includes metadata for known providers', async () => {
      const { result } = renderHook(() => useProviderContext(), { wrapper });

      await waitFor(() => {
        const openai = result.current.providers['openai'];
        expect(openai).toBeDefined();
        expect(openai?.metadata.name).toBe('OpenAI');
        expect(openai?.metadata.supportsVision).toBe(true);
      });
    });
  });

  describe('getProvider', () => {
    it('returns provider by ID', async () => {
      const { result } = renderHook(() => useProviderContext(), { wrapper });

      await waitFor(() => {
        const openai = result.current.getProvider('openai');
        expect(openai).toBeDefined();
        expect(openai?.settings.providerId).toBe('openai');
      });
    });

    it('returns undefined for unknown provider', async () => {
      const { result } = renderHook(() => useProviderContext(), { wrapper });

      await waitFor(() => {
        const unknown = result.current.getProvider('unknown-provider');
        expect(unknown).toBeUndefined();
      });
    });
  });

  describe('getDefaultProvider', () => {
    it('returns the default provider', async () => {
      const { result } = renderHook(() => useProviderContext(), { wrapper });

      await waitFor(() => {
        const defaultProvider = result.current.getDefaultProvider();
        expect(defaultProvider).toBeDefined();
        expect(defaultProvider?.settings.providerId).toBe('openai');
      });
    });
  });

  describe('getEnabledProviders', () => {
    it('returns only enabled providers', async () => {
      const { result } = renderHook(() => useProviderContext(), { wrapper });

      await waitFor(() => {
        const enabled = result.current.getEnabledProviders();
        expect(enabled.length).toBeGreaterThan(0);
        enabled.forEach((p) => {
          expect(p.settings.enabled).toBe(true);
        });
      });
    });
  });

  describe('getAvailableProviders', () => {
    it('returns only configured and enabled providers', async () => {
      const { result } = renderHook(() => useProviderContext(), { wrapper });

      await waitFor(() => {
        const available = result.current.getAvailableProviders();
        expect(available.length).toBeGreaterThan(0);
        available.forEach((p) => {
          expect(p.settings.enabled).toBe(true);
          // Should have API key or be Ollama
          expect(
            p.settings.apiKey || p.settings.providerId === 'ollama'
          ).toBeTruthy();
        });
      });
    });
  });

  describe('isProviderConfigured', () => {
    it('returns true for configured provider', async () => {
      const { result } = renderHook(() => useProviderContext(), { wrapper });

      await waitFor(() => {
        expect(result.current.isProviderConfigured('openai')).toBe(true);
      });
    });

    it('returns true for Ollama without API key', async () => {
      const { result } = renderHook(() => useProviderContext(), { wrapper });

      await waitFor(() => {
        expect(result.current.isProviderConfigured('ollama')).toBe(true);
      });
    });

    it('returns false for unknown provider', async () => {
      const { result } = renderHook(() => useProviderContext(), { wrapper });

      await waitFor(() => {
        expect(result.current.isProviderConfigured('unknown')).toBe(false);
      });
    });
  });

  describe('isProviderEnabled', () => {
    it('returns true for enabled provider', async () => {
      const { result } = renderHook(() => useProviderContext(), { wrapper });

      await waitFor(() => {
        expect(result.current.isProviderEnabled('openai')).toBe(true);
      });
    });

    it('returns false for unknown provider', async () => {
      const { result } = renderHook(() => useProviderContext(), { wrapper });

      await waitFor(() => {
        expect(result.current.isProviderEnabled('unknown')).toBe(false);
      });
    });
  });

  describe('getProviderModels', () => {
    it('returns models for known provider', async () => {
      const { result } = renderHook(() => useProviderContext(), { wrapper });

      await waitFor(() => {
        const models = result.current.getProviderModels('openai');
        expect(models.length).toBeGreaterThan(0);
        expect(models).toContain('gpt-4o');
      });
    });

    it('returns empty array for unknown provider', async () => {
      const { result } = renderHook(() => useProviderContext(), { wrapper });

      await waitFor(() => {
        const models = result.current.getProviderModels('unknown');
        expect(models).toEqual([]);
      });
    });
  });

  describe('getBestProvider', () => {
    it('returns best available provider', async () => {
      const { result } = renderHook(() => useProviderContext(), { wrapper });

      await waitFor(() => {
        const best = result.current.getBestProvider();
        expect(best).toBeDefined();
        expect(best?.settings.enabled).toBe(true);
      });
    });

    it('filters by vision support', async () => {
      const { result } = renderHook(() => useProviderContext(), { wrapper });

      await waitFor(() => {
        const visionProvider = result.current.getBestProvider({ requireVision: true });
        if (visionProvider) {
          expect(visionProvider.metadata.supportsVision).toBe(true);
        }
      });
    });

    it('filters by tools support', async () => {
      const { result } = renderHook(() => useProviderContext(), { wrapper });

      await waitFor(() => {
        const toolsProvider = result.current.getBestProvider({ requireTools: true });
        if (toolsProvider) {
          expect(toolsProvider.metadata.supportsTools).toBe(true);
        }
      });
    });
  });

  describe('health checks', () => {
    it('checkProviderHealth returns status', async () => {
      const { result } = renderHook(() => useProviderContext(), { wrapper });

      await waitFor(() => {
        expect(result.current.checkProviderHealth).toBeInstanceOf(Function);
      });

      await act(async () => {
        const status = await result.current.checkProviderHealth('openai');
        expect(['healthy', 'degraded', 'unhealthy', 'unknown']).toContain(status);
      });
    });

    it('returns unhealthy for disabled provider', async () => {
      mockUseSettingsStore.mockImplementation((selector) => {
        const state = {
          providerSettings: {
            openai: {
              providerId: 'openai',
              apiKey: 'test-key',
              enabled: false, // Disabled
            },
          },
          customProviders: {},
          defaultProvider: 'openai',
        };
        // @ts-expect-error - Partial mock state for testing
        return selector(state);
      });

      const { result } = renderHook(() => useProviderContext(), { wrapper });

      await waitFor(() => {
        expect(Object.keys(result.current.providers).length).toBeGreaterThan(0);
      });

      await act(async () => {
        const status = await result.current.checkProviderHealth('openai');
        expect(status).toBe('unhealthy');
      });
    });

    it('refreshAllHealth checks all enabled providers', async () => {
      const { result } = renderHook(() => useProviderContext(), { wrapper });

      await waitFor(() => {
        expect(result.current.refreshAllHealth).toBeInstanceOf(Function);
      });

      await act(async () => {
        await result.current.refreshAllHealth();
      });
    });
  });
});

describe('useProvider hook', () => {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <ProviderProvider enableHealthChecks={false}>
      {children}
    </ProviderProvider>
  );

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseSettingsStore.mockImplementation((selector) => {
      const state = {
        providerSettings: {
          openai: {
            providerId: 'openai',
            apiKey: 'test-key',
            enabled: true,
          },
        },
        customProviders: {},
        defaultProvider: 'openai',
      };
      // @ts-expect-error - Partial mock state for testing
      return selector(state);
    });
  });

  it('returns specific provider', async () => {
    const { result } = renderHook(() => useProvider('openai'), { wrapper });

    await waitFor(() => {
      expect(result.current).toBeDefined();
      expect(result.current?.settings.providerId).toBe('openai');
    });
  });
});

describe('useAvailableProviders hook', () => {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <ProviderProvider enableHealthChecks={false}>
      {children}
    </ProviderProvider>
  );

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseSettingsStore.mockImplementation((selector) => {
      const state = {
        providerSettings: {
          openai: {
            providerId: 'openai',
            apiKey: 'test-key',
            enabled: true,
          },
        },
        customProviders: {},
        defaultProvider: 'openai',
      };
      // @ts-expect-error - Partial mock state for testing
      return selector(state);
    });
  });

  it('returns available providers list', async () => {
    const { result } = renderHook(() => useAvailableProviders(), { wrapper });

    await waitFor(() => {
      expect(Array.isArray(result.current)).toBe(true);
    });
  });
});

describe('useProviderModels hook', () => {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <ProviderProvider enableHealthChecks={false}>
      {children}
    </ProviderProvider>
  );

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseSettingsStore.mockImplementation((selector) => {
      const state = {
        providerSettings: {},
        customProviders: {},
        defaultProvider: 'openai',
      };
      // @ts-expect-error - Partial mock state for testing
      return selector(state);
    });
  });

  it('returns models for provider', async () => {
    const { result } = renderHook(() => useProviderModels('openai'), { wrapper });

    await waitFor(() => {
      expect(result.current.length).toBeGreaterThan(0);
      expect(result.current).toContain('gpt-4o');
    });
  });
});
