/**
 * Plugin AI Provider API Implementation
 * 
 * Provides AI provider capabilities to plugins.
 */

import { useSettingsStore } from '@/stores';
import type {
  PluginAIProviderAPI,
  AIProviderDefinition,
  AIModel,
  AIChatMessage,
  AIChatOptions,
  AIChatChunk,
} from '@/types/plugin-extended';

// Registry for custom AI providers
const customProviders = new Map<string, AIProviderDefinition>();

/**
 * Create the AI Provider API for a plugin
 */
export function createAIProviderAPI(pluginId: string): PluginAIProviderAPI {
  return {
    registerProvider: (provider: AIProviderDefinition) => {
      const providerId = `${pluginId}:${provider.id}`;
      customProviders.set(providerId, { ...provider, id: providerId });
      console.log(`[Plugin:${pluginId}] Registered AI provider: ${provider.name}`);

      return () => {
        customProviders.delete(providerId);
        console.log(`[Plugin:${pluginId}] Unregistered AI provider: ${provider.name}`);
      };
    },

    getAvailableModels: (): AIModel[] => {
      const models: AIModel[] = [];

      // Add models from custom providers
      for (const provider of customProviders.values()) {
        models.push(...provider.models);
      }

      // Built-in models would be added here from settings
      // For now, return custom provider models only
      return models;
    },

    getProviderModels: (providerId: string): AIModel[] => {
      const provider = customProviders.get(providerId);
      return provider?.models || [];
    },

    chat: async function* (
      messages: AIChatMessage[],
      options?: AIChatOptions
    ): AsyncIterable<AIChatChunk> {
      // Determine which provider to use
      const _defaultProvider = useSettingsStore.getState().defaultProvider;
      
      // Check for custom provider first
      for (const provider of customProviders.values()) {
        if (options?.model && provider.models.some(m => m.id === options.model)) {
          // Use this custom provider
          yield* provider.chat(messages, options);
          return;
        }
      }

      // Fallback: yield an error chunk
      yield {
        content: `[Plugin:${pluginId}] AI chat requires a registered provider or model`,
        finishReason: 'stop',
      };
    },

    embed: async (texts: string[]): Promise<number[][]> => {
      // Check custom providers for embedding support
      for (const provider of customProviders.values()) {
        if (provider.embed) {
          return provider.embed(texts);
        }
      }

      // No custom provider with embedding support
      console.warn(`[Plugin:${pluginId}] No embedding provider available`);
      return texts.map(() => []);
    },

    getDefaultModel: (): string => {
      const settings = useSettingsStore.getState();
      const provider = settings.providerSettings?.[settings.defaultProvider];
      return provider?.defaultModel || 'gpt-4o';
    },

    getDefaultProvider: (): string => {
      return useSettingsStore.getState().defaultProvider;
    },
  };
}

/**
 * Get all registered custom AI providers
 */
export function getCustomAIProviders(): AIProviderDefinition[] {
  return Array.from(customProviders.values());
}
