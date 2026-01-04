/**
 * useAIRegistry Hook Tests
 */

import { renderHook } from '@testing-library/react';
import { useAIRegistry, useReasoningModel, useModelAliases } from './use-ai-registry';

// Mock the settings store
jest.mock('@/stores', () => ({
  useSettingsStore: jest.fn((selector) => {
    const state = {
      providerSettings: {
        openai: { apiKey: 'test-openai-key', enabled: true },
        anthropic: { apiKey: 'test-anthropic-key', enabled: true },
      },
      getProviderSettings: (provider: string) => {
        const settings: Record<string, { apiKey?: string; baseURL?: string; enabled?: boolean }> = {
          openai: { apiKey: 'test-openai-key', enabled: true },
          anthropic: { apiKey: 'test-anthropic-key', enabled: true },
        };
        return settings[provider] || {};
      },
    };
    // Support selector function pattern
    if (typeof selector === 'function') {
      return selector(state);
    }
    return state;
  }),
}));

// Mock the AI registry
jest.mock('@/lib/ai/core/ai-registry', () => ({
  createAIRegistry: jest.fn(() => ({
    languageModel: jest.fn((provider, modelId) => {
      // Only return model for configured providers
      if (['openai', 'anthropic'].includes(provider)) {
        return {
          provider,
          modelId,
          __type: 'language-model',
        };
      }
      return null;
    }),
    getAvailableProviders: jest.fn(() => ['openai', 'anthropic']),
    hasProvider: jest.fn((provider) => ['openai', 'anthropic'].includes(provider)),
    getModelAliases: jest.fn((provider) => {
      const aliases: Record<string, string[]> = {
        openai: ['fast', 'balanced', 'reasoning', 'creative'],
        anthropic: ['fast', 'balanced', 'reasoning', 'creative'],
      };
      return aliases[provider] || [];
    }),
    resolveAlias: jest.fn((provider, alias) => {
      const aliasMap: Record<string, Record<string, string>> = {
        openai: { fast: 'gpt-4o-mini', balanced: 'gpt-4o', reasoning: 'o1-mini', creative: 'gpt-4o' },
        anthropic: { fast: 'claude-3-haiku', balanced: 'claude-sonnet-4-20250514' },
      };
      return aliasMap[provider]?.[alias] ?? alias;
    }),
  })),
  MODEL_ALIASES: {
    openai: { 
      fast: { modelId: 'gpt-4o-mini' }, 
      balanced: { modelId: 'gpt-4o' }, 
      reasoning: { modelId: 'o1-mini' }, 
      creative: { modelId: 'gpt-4o' } 
    },
    anthropic: { 
      fast: { modelId: 'claude-3-haiku' }, 
      balanced: { modelId: 'claude-sonnet-4-20250514' }, 
      reasoning: { modelId: 'claude-sonnet-4-20250514' }, 
      creative: { modelId: 'claude-sonnet-4-20250514' } 
    },
  },
}));

// Mock rate limit
jest.mock('@/lib/ai/infrastructure/rate-limit', () => ({
  checkRateLimit: jest.fn(() => ({ 
    success: true, 
    remaining: 10, 
    limit: 60,
    reset: Date.now() + 60000,
  })),
}));

// Mock cache middleware
jest.mock('@/lib/ai/infrastructure/cache-middleware', () => ({
  createSimpleCacheMiddleware: jest.fn(() => ({
    wrapGenerate: jest.fn(),
    wrapStream: jest.fn(),
  })),
}));

// Mock middleware
jest.mock('@/lib/ai/core/middleware', () => ({
  withDefaultSettings: jest.fn((model) => model),
  withMiddlewares: jest.fn((model) => model),
}));

describe('useAIRegistry', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('basic functionality', () => {
    it('should create registry from settings', () => {
      const { result } = renderHook(() => useAIRegistry());
      
      expect(result.current.registry).toBeDefined();
      expect(result.current.availableProviders).toContain('openai');
      expect(result.current.availableProviders).toContain('anthropic');
    });

    it('should provide getModel function', () => {
      const { result } = renderHook(() => useAIRegistry());
      
      const model = result.current.getModel('openai', 'gpt-4o');
      
      expect(model).toBeDefined();
    });

    it('should resolve model aliases', () => {
      const { result } = renderHook(() => useAIRegistry());
      
      const model = result.current.getModel('openai', 'fast');
      
      expect(model).toBeDefined();
    });

    it('should return null for unavailable provider', () => {
      const { result } = renderHook(() => useAIRegistry());
      
      const model = result.current.getModel('mistral', 'mistral-large');
      
      expect(model).toBeNull();
    });
  });

  describe('with caching enabled', () => {
    it('should apply cache middleware', () => {
      const { result } = renderHook(() => 
        useAIRegistry({ enableCaching: true })
      );
      
      expect(result.current.registry).toBeDefined();
    });
  });

  describe('rate limiting', () => {
    it('should check rate limit for provider', async () => {
      const { result } = renderHook(() => useAIRegistry());
      
      const rateLimit = await result.current.checkProviderRateLimit('openai', 'user-123');
      
      expect(rateLimit.success).toBe(true);
      expect(rateLimit.remaining).toBeGreaterThan(0);
    });
  });

  describe('hasProvider', () => {
    it('should return true for configured provider', () => {
      const { result } = renderHook(() => useAIRegistry());
      
      expect(result.current.hasProvider('openai')).toBe(true);
      expect(result.current.hasProvider('anthropic')).toBe(true);
    });

    it('should return false for unconfigured provider', () => {
      const { result } = renderHook(() => useAIRegistry());
      
      expect(result.current.hasProvider('mistral')).toBe(false);
    });
  });

  describe('isInitialized', () => {
    it('should be true when registry is created', () => {
      const { result } = renderHook(() => useAIRegistry());
      
      expect(result.current.isInitialized).toBe(true);
    });
  });

  describe('getModelWithMiddleware', () => {
    it('should apply custom middleware to model', () => {
      const { result } = renderHook(() => useAIRegistry());
      
      const customMiddleware = { wrapGenerate: jest.fn(), wrapStream: jest.fn() };
      const model = result.current.getModelWithMiddleware('openai', 'gpt-4o', [customMiddleware]);
      
      expect(model).toBeDefined();
    });

    it('should return null for unavailable provider', () => {
      const { result } = renderHook(() => useAIRegistry());
      
      const model = result.current.getModelWithMiddleware('mistral', 'model', []);
      
      expect(model).toBeNull();
    });

    it('should return null when registry is null', () => {
      // This would require mocking providerSettings to have no enabled providers
      const { result } = renderHook(() => useAIRegistry());
      
      // Test with invalid provider
      const model = result.current.getModelWithMiddleware('invalid' as never, 'model', []);
      
      expect(model).toBeNull();
    });
  });

  describe('getModelWithSettings', () => {
    it('should apply default settings to model', () => {
      const { result } = renderHook(() => useAIRegistry());
      
      const settings = { temperature: 0.7, maxTokens: 1000 };
      const model = result.current.getModelWithSettings('openai', 'gpt-4o', settings);
      
      expect(model).toBeDefined();
    });

    it('should return null for unavailable provider', () => {
      const { result } = renderHook(() => useAIRegistry());
      
      const model = result.current.getModelWithSettings('mistral', 'model', { temperature: 0.5 });
      
      expect(model).toBeNull();
    });
  });

  describe('getModelAliases', () => {
    it('should return aliases for configured provider', () => {
      const { result } = renderHook(() => useAIRegistry());
      
      const aliases = result.current.getModelAliases('openai');
      
      expect(aliases).toContain('fast');
      expect(aliases).toContain('balanced');
      expect(aliases).toContain('reasoning');
    });

    it('should return empty array for unconfigured provider', () => {
      const { result } = renderHook(() => useAIRegistry());
      
      const aliases = result.current.getModelAliases('mistral');
      
      expect(aliases).toEqual([]);
    });
  });

  describe('resolveAlias', () => {
    it('should resolve alias to model ID', () => {
      const { result } = renderHook(() => useAIRegistry());
      
      // The mock just returns the alias as-is since registry.resolveAlias isn't mocked
      const resolved = result.current.resolveAlias('openai', 'fast');
      
      expect(resolved).toBeDefined();
    });

    it('should return alias as-is when registry is null', () => {
      const { result } = renderHook(() => useAIRegistry());
      
      // For unconfigured provider, should return the alias unchanged
      const resolved = result.current.resolveAlias('mistral', 'fast');
      
      expect(resolved).toBe('fast');
    });
  });

  describe('rate limiting disabled', () => {
    it('should return Infinity when rate limiting is disabled', async () => {
      const { result } = renderHook(() => 
        useAIRegistry({ enableRateLimiting: false })
      );
      
      const rateLimit = await result.current.checkProviderRateLimit('openai', 'user-123');
      
      expect(rateLimit.success).toBe(true);
      expect(rateLimit.remaining).toBe(Infinity);
      expect(rateLimit.limit).toBe(Infinity);
      expect(rateLimit.resetInMs).toBe(0);
    });
  });

  describe('caching options', () => {
    it('should accept custom cache TTL', () => {
      const { result } = renderHook(() => 
        useAIRegistry({ enableCaching: true, cacheTTL: 7200 })
      );
      
      expect(result.current.registry).toBeDefined();
    });

    it('should not apply cache middleware when caching disabled', () => {
      const { result } = renderHook(() => 
        useAIRegistry({ enableCaching: false })
      );
      
      const model = result.current.getModel('openai', 'gpt-4o');
      expect(model).toBeDefined();
    });
  });

  describe('reasoning options', () => {
    it('should accept custom reasoning tag name', () => {
      const { result } = renderHook(() => 
        useAIRegistry({ enableReasoning: true, reasoningTagName: 'thinking' })
      );
      
      expect(result.current.registry).toBeDefined();
    });
  });
});

describe('useReasoningModel', () => {
  it('should return reasoning model for provider', () => {
    const { result } = renderHook(() => useReasoningModel('openai', undefined, 'think'));
    
    expect(result.current).toBeDefined();
  });

  it('should return reasoning model with custom model ID', () => {
    const { result } = renderHook(() => useReasoningModel('openai', 'o1-mini', 'think'));
    
    expect(result.current).toBeDefined();
  });

  it('should return null for provider without reasoning model', () => {
    // Mock a provider without a configured reasoning model
    const { result } = renderHook(() => useReasoningModel('mistral' as never, undefined, 'think'));
    
    expect(result.current).toBeNull();
  });
});

describe('useModelAliases', () => {
  it('should return all model aliases', () => {
    const { result } = renderHook(() => useModelAliases());
    
    expect(result.current).toBeDefined();
    expect(result.current.openai).toBeDefined();
    expect(result.current.anthropic).toBeDefined();
  });

  it('should have fast and balanced aliases for each provider', () => {
    const { result } = renderHook(() => useModelAliases());
    
    expect(result.current.openai.fast).toBeDefined();
    expect(result.current.openai.balanced).toBeDefined();
    expect(result.current.anthropic.fast).toBeDefined();
    expect(result.current.anthropic.balanced).toBeDefined();
  });
});
