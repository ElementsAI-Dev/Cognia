/**
 * Tests for AI Provider Plugin API
 */

import { createAIProviderAPI, getCustomAIProviders, clearCustomAIProviders } from './ai-provider-api';
import type { AIProviderDefinition, AIChatMessage } from '@/types/plugin/plugin-extended';

// Mock the settings store
jest.mock('@/stores', () => ({
  useSettingsStore: {
    getState: jest.fn(() => ({
      defaultProvider: 'openai',
      providerSettings: {
        openai: {
          defaultModel: 'gpt-4o',
        },
      },
    })),
  },
}));

describe('AI Provider API', () => {
  const testPluginId = 'test-plugin';

  beforeEach(() => {
    // Clear custom providers before each test
    clearCustomAIProviders();
  });

  describe('createAIProviderAPI', () => {
    it('should create an API object with all expected methods', () => {
      const api = createAIProviderAPI(testPluginId);

      expect(api).toBeDefined();
      expect(typeof api.registerProvider).toBe('function');
      expect(typeof api.getAvailableModels).toBe('function');
      expect(typeof api.getProviderModels).toBe('function');
      expect(typeof api.chat).toBe('function');
      expect(typeof api.embed).toBe('function');
      expect(typeof api.getDefaultModel).toBe('function');
      expect(typeof api.getDefaultProvider).toBe('function');
    });
  });

  describe('registerProvider', () => {
    it('should register a custom AI provider', () => {
      const api = createAIProviderAPI(testPluginId);

      const provider: AIProviderDefinition = {
        id: 'custom-provider',
        name: 'Custom Provider',
        description: 'Test provider description',
        models: [
          { 
            id: 'custom-model', 
            name: 'Custom Model', 
            provider: 'custom-provider',
            contextLength: 4096,
            capabilities: ['chat']
          },
        ],
        chat: async function* () {
          yield { content: 'test' };
        },
      };

      const unregister = api.registerProvider(provider);

      expect(typeof unregister).toBe('function');
      
      const providers = getCustomAIProviders();
      expect(providers.length).toBe(1);
      expect(providers[0].name).toBe('Custom Provider');
    });

    it('should prefix provider ID with plugin ID', () => {
      const api = createAIProviderAPI(testPluginId);

      const provider: AIProviderDefinition = {
        id: 'my-provider',
        name: 'My Provider',
        description: 'Test provider',
        models: [],
        chat: async function* () {
          yield { content: 'test' };
        },
      };

      api.registerProvider(provider);

      const providers = getCustomAIProviders();
      expect(providers[0].id).toBe(`${testPluginId}:my-provider`);
    });

    it('should unregister provider when cleanup function is called', () => {
      const api = createAIProviderAPI(testPluginId);

      const provider: AIProviderDefinition = {
        id: 'temp-provider',
        name: 'Temp Provider',
        description: 'Temp provider',
        models: [],
        chat: async function* () {
          yield { content: 'test' };
        },
      };

      const unregister = api.registerProvider(provider);
      expect(getCustomAIProviders().length).toBe(1);

      unregister();
      expect(getCustomAIProviders().length).toBe(0);
    });
  });

  describe('getAvailableModels', () => {
    it('should return models from custom providers', () => {
      const api = createAIProviderAPI(testPluginId);

      const provider: AIProviderDefinition = {
        id: 'provider-1',
        name: 'Provider 1',
        description: 'Provider 1 description',
        models: [
          { id: 'model-a', name: 'Model A', provider: 'provider-1', contextLength: 4096, capabilities: ['chat'] },
          { id: 'model-b', name: 'Model B', provider: 'provider-1', contextLength: 8192, capabilities: ['chat'] },
        ],
        chat: async function* () {
          yield { content: 'test' };
        },
      };

      api.registerProvider(provider);

      const models = api.getAvailableModels();
      expect(models.length).toBe(2);
      expect(models[0].id).toBe('model-a');
      expect(models[1].id).toBe('model-b');
    });

    it('should return empty array when no providers registered', () => {
      const api = createAIProviderAPI(testPluginId);

      const models = api.getAvailableModels();
      expect(models).toEqual([]);
    });
  });

  describe('getProviderModels', () => {
    it('should return models for a specific provider', () => {
      const api = createAIProviderAPI(testPluginId);

      const provider: AIProviderDefinition = {
        id: 'specific-provider',
        name: 'Specific Provider',
        description: 'Specific provider description',
        models: [
          { id: 'specific-model', name: 'Specific Model', provider: 'specific-provider', contextLength: 4096, capabilities: ['chat'] },
        ],
        chat: async function* () {
          yield { content: 'test' };
        },
      };

      api.registerProvider(provider);

      const models = api.getProviderModels(`${testPluginId}:specific-provider`);
      expect(models.length).toBe(1);
      expect(models[0].id).toBe('specific-model');
    });

    it('should return empty array for non-existent provider', () => {
      const api = createAIProviderAPI(testPluginId);

      const models = api.getProviderModels('non-existent');
      expect(models).toEqual([]);
    });
  });

  describe('chat', () => {
    it('should yield error chunk when no matching provider found', async () => {
      const api = createAIProviderAPI(testPluginId);

      const messages: AIChatMessage[] = [
        { role: 'user', content: 'Hello' },
      ];

      const chunks: Array<{ content: string; finishReason?: string }> = [];
      for await (const chunk of api.chat(messages)) {
        chunks.push(chunk);
      }

      expect(chunks.length).toBe(1);
      expect(chunks[0].content).toContain('AI chat requires a registered provider');
    });

    it('should use custom provider when model matches', async () => {
      const api = createAIProviderAPI(testPluginId);

      const provider: AIProviderDefinition = {
        id: 'chat-provider',
        name: 'Chat Provider',
        description: 'Chat provider description',
        models: [
          { id: 'chat-model', name: 'Chat Model', provider: 'chat-provider', contextLength: 4096, capabilities: ['chat'] },
        ],
        chat: async function* () {
          yield { content: 'Hello from custom provider!' };
          yield { content: ' More content', finishReason: 'stop' };
        },
      };

      api.registerProvider(provider);

      const messages: AIChatMessage[] = [
        { role: 'user', content: 'Hello' },
      ];

      const chunks: Array<{ content: string; finishReason?: string }> = [];
      for await (const chunk of api.chat(messages, { model: 'chat-model' })) {
        chunks.push(chunk);
      }

      expect(chunks.length).toBe(2);
      expect(chunks[0].content).toBe('Hello from custom provider!');
    });
  });

  describe('embed', () => {
    it('should return empty embeddings when no embedding provider available', async () => {
      const api = createAIProviderAPI(testPluginId);

      const result = await api.embed(['text1', 'text2']);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(2);
      expect(result[0]).toEqual([]);
      expect(result[1]).toEqual([]);
    });

    it('should use custom provider embedding function when available', async () => {
      const api = createAIProviderAPI(testPluginId);

      const provider: AIProviderDefinition = {
        id: 'embed-provider',
        name: 'Embed Provider',
        description: 'Embed provider description',
        models: [],
        chat: async function* () {
          yield { content: 'test' };
        },
        embed: async (texts: string[]) => {
          return texts.map(() => [0.1, 0.2, 0.3]);
        },
      };

      api.registerProvider(provider);

      const result = await api.embed(['text1', 'text2']);

      expect(result.length).toBe(2);
      expect(result[0]).toEqual([0.1, 0.2, 0.3]);
    });
  });

  describe('getDefaultModel', () => {
    it('should return default model from settings', () => {
      const api = createAIProviderAPI(testPluginId);

      const defaultModel = api.getDefaultModel();
      expect(defaultModel).toBe('gpt-4o');
    });
  });

  describe('getDefaultProvider', () => {
    it('should return default provider from settings', () => {
      const api = createAIProviderAPI(testPluginId);

      const defaultProvider = api.getDefaultProvider();
      expect(defaultProvider).toBe('openai');
    });
  });

  describe('getCustomAIProviders', () => {
    it('should return all registered custom providers', () => {
      const api = createAIProviderAPI(testPluginId);

      const provider1: AIProviderDefinition = {
        id: 'provider-1',
        name: 'Provider 1',
        description: 'Provider 1 description',
        models: [
          { id: 'model-a', name: 'Model A', provider: 'provider-1', contextLength: 4096, capabilities: ['chat'] },
          { id: 'model-b', name: 'Model B', provider: 'provider-1', contextLength: 8192, capabilities: ['chat'] },
        ],
        chat: async function* () {
          yield { content: 'test' };
        },
      };

      const provider2: AIProviderDefinition = {
        id: 'provider-2',
        name: 'Provider 2',
        description: 'Provider 2',
        models: [],
        chat: async function* () {
          yield { content: 'test' };
        },
      };

      api.registerProvider(provider1);
      api.registerProvider(provider2);

      const providers = getCustomAIProviders();
      expect(providers.length).toBe(2);
    });
  });
});
