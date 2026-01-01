/**
 * Provider Registry Tests
 */

import {
  createCogniaProviderRegistry,
  parseModelId,
  formatModelId,
  type RegistryConfig,
} from './provider-registry';

// Mock AI SDK providers
jest.mock('@ai-sdk/openai', () => ({
  createOpenAI: jest.fn((config) => {
    const mockProvider = jest.fn((modelId: string) => ({ modelId, provider: 'openai', ...config }));
    (mockProvider as { embedding?: (modelId: string) => object }).embedding = (modelId: string) => ({
      modelId,
      type: 'embedding',
    });
    return mockProvider;
  }),
}));

jest.mock('@ai-sdk/anthropic', () => ({
  createAnthropic: jest.fn((config) => {
    return jest.fn((modelId: string) => ({ modelId, provider: 'anthropic', ...config }));
  }),
}));

jest.mock('@ai-sdk/google', () => ({
  createGoogleGenerativeAI: jest.fn((config) => {
    return jest.fn((modelId: string) => ({ modelId, provider: 'google', ...config }));
  }),
}));

jest.mock('@ai-sdk/mistral', () => ({
  createMistral: jest.fn((config) => {
    return jest.fn((modelId: string) => ({ modelId, provider: 'mistral', ...config }));
  }),
}));

jest.mock('@ai-sdk/cohere', () => ({
  createCohere: jest.fn((config) => {
    return jest.fn((modelId: string) => ({ modelId, provider: 'cohere', ...config }));
  }),
}));

describe('provider-registry', () => {
  describe('createCogniaProviderRegistry', () => {
    const mockConfig: RegistryConfig = {
      providers: {
        openai: { apiKey: 'test-openai-key' },
        anthropic: { apiKey: 'test-anthropic-key' },
      },
      defaultProvider: 'openai',
    };

    it('should create a registry with configured providers', () => {
      const registry = createCogniaProviderRegistry(mockConfig);

      expect(registry).toBeDefined();
      expect(registry.languageModel).toBeDefined();
      expect(registry.getAvailableProviders).toBeDefined();
      expect(registry.hasProvider).toBeDefined();
    });

    it('should return available providers', () => {
      const registry = createCogniaProviderRegistry(mockConfig);

      const providers = registry.getAvailableProviders();

      expect(providers).toContain('openai');
      expect(providers).toContain('anthropic');
      expect(providers).not.toContain('mistral');
    });

    it('should check if provider exists', () => {
      const registry = createCogniaProviderRegistry(mockConfig);

      expect(registry.hasProvider('openai')).toBe(true);
      expect(registry.hasProvider('anthropic')).toBe(true);
      expect(registry.hasProvider('mistral')).toBe(false);
    });

    it('should get language model by provider and model ID', () => {
      const registry = createCogniaProviderRegistry(mockConfig);

      const model = registry.languageModel('openai', 'gpt-4o');

      expect(model).toBeDefined();
    });

    it('should return null for unconfigured providers', () => {
      const registry = createCogniaProviderRegistry(mockConfig);

      const model = registry.languageModel('mistral', 'mistral-large');

      expect(model).toBeNull();
    });

    it('should get default provider', () => {
      const registry = createCogniaProviderRegistry(mockConfig);

      const defaultProvider = registry.getDefaultProvider();

      expect(defaultProvider).toBe('openai');
    });

    it('should fallback to first available provider if default not set', () => {
      const registry = createCogniaProviderRegistry({
        providers: {
          anthropic: { apiKey: 'test-key' },
        },
      });

      const defaultProvider = registry.getDefaultProvider();

      expect(defaultProvider).toBe('anthropic');
    });

    it('should return undefined if no providers available', () => {
      const registry = createCogniaProviderRegistry({
        providers: {},
      });

      const defaultProvider = registry.getDefaultProvider();

      expect(defaultProvider).toBeUndefined();
    });

    it('should get provider credentials', () => {
      const registry = createCogniaProviderRegistry(mockConfig);

      const credentials = registry.getCredentials('openai');

      expect(credentials).toEqual({ apiKey: 'test-openai-key' });
    });

    it('should return undefined for unconfigured provider credentials', () => {
      const registry = createCogniaProviderRegistry(mockConfig);

      const credentials = registry.getCredentials('mistral');

      expect(credentials).toBeUndefined();
    });

    it('should get raw provider instance', () => {
      const registry = createCogniaProviderRegistry(mockConfig);

      const provider = registry.getProvider('openai');

      expect(provider).toBeDefined();
      expect(typeof provider).toBe('function');
    });

    it('should return null for unconfigured raw provider', () => {
      const registry = createCogniaProviderRegistry(mockConfig);

      const provider = registry.getProvider('mistral');

      expect(provider).toBeNull();
    });

    it('should get text embedding model', () => {
      const registry = createCogniaProviderRegistry(mockConfig);

      const embeddingModel = registry.textEmbeddingModel('openai', 'text-embedding-3-small');

      expect(embeddingModel).toBeDefined();
    });

    it('should return null for embedding model from unsupported provider', () => {
      const registry = createCogniaProviderRegistry(mockConfig);

      const embeddingModel = registry.textEmbeddingModel('anthropic', 'some-model');

      expect(embeddingModel).toBeNull();
    });

    it('should return null for embedding model from unconfigured provider', () => {
      const registry = createCogniaProviderRegistry(mockConfig);

      const embeddingModel = registry.textEmbeddingModel('mistral', 'some-model');

      expect(embeddingModel).toBeNull();
    });

    it('should skip providers without credentials', () => {
      const registry = createCogniaProviderRegistry({
        providers: {
          openai: { apiKey: '' },
          anthropic: { apiKey: 'valid-key' },
        },
      });

      expect(registry.hasProvider('openai')).toBe(false);
      expect(registry.hasProvider('anthropic')).toBe(true);
    });

    it('should support custom baseURL', () => {
      const registry = createCogniaProviderRegistry({
        providers: {
          openai: { apiKey: 'test-key', baseURL: 'https://custom.api.com' },
        },
      });

      expect(registry.hasProvider('openai')).toBe(true);
    });
  });

  describe('createCogniaProviderRegistry with different providers', () => {
    it('should create google provider', () => {
      const registry = createCogniaProviderRegistry({
        providers: {
          google: { apiKey: 'test-google-key' },
        },
      });

      expect(registry.hasProvider('google')).toBe(true);
    });

    it('should create mistral provider', () => {
      const registry = createCogniaProviderRegistry({
        providers: {
          mistral: { apiKey: 'test-mistral-key' },
        },
      });

      expect(registry.hasProvider('mistral')).toBe(true);
    });

    it('should create cohere provider', () => {
      const registry = createCogniaProviderRegistry({
        providers: {
          cohere: { apiKey: 'test-cohere-key' },
        },
      });

      expect(registry.hasProvider('cohere')).toBe(true);
    });

    it('should create deepseek provider (OpenAI compatible)', () => {
      const registry = createCogniaProviderRegistry({
        providers: {
          deepseek: { apiKey: 'test-deepseek-key' },
        },
      });

      expect(registry.hasProvider('deepseek')).toBe(true);
    });

    it('should create groq provider (OpenAI compatible)', () => {
      const registry = createCogniaProviderRegistry({
        providers: {
          groq: { apiKey: 'test-groq-key' },
        },
      });

      expect(registry.hasProvider('groq')).toBe(true);
    });

    it('should create xai provider (OpenAI compatible)', () => {
      const registry = createCogniaProviderRegistry({
        providers: {
          xai: { apiKey: 'test-xai-key' },
        },
      });

      expect(registry.hasProvider('xai')).toBe(true);
    });

    it('should create togetherai provider (OpenAI compatible)', () => {
      const registry = createCogniaProviderRegistry({
        providers: {
          togetherai: { apiKey: 'test-together-key' },
        },
      });

      expect(registry.hasProvider('togetherai')).toBe(true);
    });

    it('should create openrouter provider (OpenAI compatible)', () => {
      const registry = createCogniaProviderRegistry({
        providers: {
          openrouter: { apiKey: 'test-openrouter-key' },
        },
      });

      expect(registry.hasProvider('openrouter')).toBe(true);
    });

    it('should create fireworks provider (OpenAI compatible)', () => {
      const registry = createCogniaProviderRegistry({
        providers: {
          fireworks: { apiKey: 'test-fireworks-key' },
        },
      });

      expect(registry.hasProvider('fireworks')).toBe(true);
    });

    it('should create cerebras provider (OpenAI compatible)', () => {
      const registry = createCogniaProviderRegistry({
        providers: {
          cerebras: { apiKey: 'test-cerebras-key' },
        },
      });

      expect(registry.hasProvider('cerebras')).toBe(true);
    });

    it('should create sambanova provider (OpenAI compatible)', () => {
      const registry = createCogniaProviderRegistry({
        providers: {
          sambanova: { apiKey: 'test-sambanova-key' },
        },
      });

      expect(registry.hasProvider('sambanova')).toBe(true);
    });

    it('should create ollama provider without API key', () => {
      const registry = createCogniaProviderRegistry({
        providers: {
          ollama: { apiKey: '' },
        },
      });

      expect(registry.hasProvider('ollama')).toBe(true);
    });
  });

  describe('parseModelId', () => {
    it('should parse model ID with provider prefix', () => {
      const result = parseModelId('openai:gpt-4o');

      expect(result.provider).toBe('openai');
      expect(result.model).toBe('gpt-4o');
    });

    it('should parse model ID with anthropic prefix', () => {
      const result = parseModelId('anthropic:claude-3-opus');

      expect(result.provider).toBe('anthropic');
      expect(result.model).toBe('claude-3-opus');
    });

    it('should handle model ID without prefix using default provider', () => {
      const result = parseModelId('gpt-4o', 'openai');

      expect(result.provider).toBe('openai');
      expect(result.model).toBe('gpt-4o');
    });

    it('should default to openai when no prefix and no default', () => {
      const result = parseModelId('gpt-4o');

      expect(result.provider).toBe('openai');
      expect(result.model).toBe('gpt-4o');
    });

    it('should handle model ID with multiple colons', () => {
      const result = parseModelId('openai:ft:gpt-4o:custom');

      expect(result.provider).toBe('openai');
      expect(result.model).toBe('ft:gpt-4o:custom');
    });

    it('should handle empty model part after colon', () => {
      const result = parseModelId('openai:');

      expect(result.provider).toBe('openai');
      expect(result.model).toBe('');
    });
  });

  describe('formatModelId', () => {
    it('should format provider and model into model ID', () => {
      const result = formatModelId('openai', 'gpt-4o');

      expect(result).toBe('openai:gpt-4o');
    });

    it('should format anthropic provider', () => {
      const result = formatModelId('anthropic', 'claude-3-opus');

      expect(result).toBe('anthropic:claude-3-opus');
    });

    it('should handle empty model', () => {
      const result = formatModelId('openai', '');

      expect(result).toBe('openai:');
    });
  });
});
