/**
 * AI Registry Tests
 */

import {
  createAIRegistry,
  MODEL_ALIASES,
  type AIRegistryConfig,
} from './ai-registry';

// Mock provider modules
jest.mock('@ai-sdk/openai', () => ({
  createOpenAI: jest.fn(() => (modelId: string) => ({ modelId, provider: 'openai' })),
}));

jest.mock('@ai-sdk/anthropic', () => ({
  createAnthropic: jest.fn(() => (modelId: string) => ({ modelId, provider: 'anthropic' })),
}));

jest.mock('@ai-sdk/google', () => ({
  createGoogleGenerativeAI: jest.fn(() => (modelId: string) => ({ modelId, provider: 'google' })),
}));

describe('AI Registry', () => {
  describe('MODEL_ALIASES', () => {
    it('should have aliases for all supported providers', () => {
      expect(MODEL_ALIASES.openai).toBeDefined();
      expect(MODEL_ALIASES.anthropic).toBeDefined();
      expect(MODEL_ALIASES.google).toBeDefined();
    });

    it('should have standard alias types', () => {
      expect(MODEL_ALIASES.openai.fast).toBeDefined();
      expect(MODEL_ALIASES.openai.balanced).toBeDefined();
      expect(MODEL_ALIASES.openai.reasoning).toBeDefined();
      expect(MODEL_ALIASES.openai.creative).toBeDefined();
    });

    it('should have valid model IDs', () => {
      expect(MODEL_ALIASES.openai.fast.modelId).toMatch(/gpt-/);
      expect(MODEL_ALIASES.anthropic.balanced.modelId).toMatch(/claude-/);
      expect(MODEL_ALIASES.google.fast.modelId).toMatch(/gemini-/);
    });
  });

  describe('createAIRegistry', () => {
    const mockConfig: AIRegistryConfig = {
      providers: {
        openai: { apiKey: 'test-openai-key' },
        anthropic: { apiKey: 'test-anthropic-key' },
      },
    };

    it('should create a registry with configured providers', () => {
      const registry = createAIRegistry(mockConfig);
      
      expect(registry).toBeDefined();
      expect(registry.languageModel).toBeDefined();
      expect(registry.getAvailableProviders).toBeDefined();
    });

    it('should return available providers', () => {
      const registry = createAIRegistry(mockConfig);
      
      const providers = registry.getAvailableProviders();
      
      expect(providers).toContain('openai');
      expect(providers).toContain('anthropic');
    });

    it('should get language model by provider and model ID', () => {
      const registry = createAIRegistry(mockConfig);
      
      const model = registry.languageModel('openai', 'gpt-4o');
      
      expect(model).toBeDefined();
    });

    it('should resolve model aliases', () => {
      const registry = createAIRegistry(mockConfig);
      
      const model = registry.languageModel('openai', 'fast');
      
      expect(model).toBeDefined();
    });

    it('should return null for unconfigured providers', () => {
      const registry = createAIRegistry({
        providers: {
          openai: { apiKey: 'test' },
        },
      });
      
      const model = registry.languageModel('mistral', 'mistral-large');
      
      expect(model).toBeNull();
    });

    it('should check if provider is available', () => {
      const registry = createAIRegistry(mockConfig);
      
      expect(registry.hasProvider('openai')).toBe(true);
      expect(registry.hasProvider('mistral')).toBe(false);
    });

    it('should get model aliases for provider', () => {
      const registry = createAIRegistry(mockConfig);
      
      const aliases = registry.getModelAliases('openai');
      
      // getModelAliases returns an array of alias names
      expect(Array.isArray(aliases)).toBe(true);
      expect(aliases).toContain('fast');
      expect(aliases).toContain('balanced');
    });

    it('should return empty array for unknown provider aliases', () => {
      const registry = createAIRegistry(mockConfig);
      
      const aliases = registry.getModelAliases('unknown' as never);
      
      expect(Array.isArray(aliases)).toBe(true);
      expect(aliases).toHaveLength(0);
    });
  });

  describe('registry with reasoning', () => {
    it('should support reasoning config', () => {
      const registry = createAIRegistry({
        providers: {
          openai: { apiKey: 'test' },
        },
        enableReasoning: true,
        reasoningTagName: 'think',
      });
      
      expect(registry).toBeDefined();
    });

    it('should get reasoning model via alias', () => {
      const registry = createAIRegistry({
        providers: {
          openai: { apiKey: 'test' },
        },
        enableReasoning: true,
      });
      
      const model = registry.languageModel('openai', 'reasoning');
      
      expect(model).toBeDefined();
    });
  });

  describe('registry with custom base URLs', () => {
    it('should support custom base URL per provider', () => {
      const registry = createAIRegistry({
        providers: {
          openai: { 
            apiKey: 'test',
            baseURL: 'https://custom-openai.example.com/v1',
          },
        },
      });
      
      expect(registry.hasProvider('openai')).toBe(true);
    });
  });
});
