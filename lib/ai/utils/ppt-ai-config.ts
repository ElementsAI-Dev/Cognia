/**
 * Shared PPT AI Configuration
 *
 * Consolidates duplicate provider config + API key rotation logic from:
 * - hooks/ppt/use-ppt-generation.ts
 * - hooks/designer/use-ppt-ai.ts
 */

import {
  createFeatureProviderClient,
  resolveFeatureProvider,
} from '@/lib/ai/provider-consumption';
import type { ApiProtocol, ApiKeyRotationStrategy, ApiKeyUsageStats } from '@/types/provider';
import type { LanguageModel } from 'ai';

export interface PPTAIConfig {
  provider: string;
  model: string;
  apiKey: string;
  baseURL?: string;
  protocol?: ApiProtocol;
  isCustomProvider?: boolean;
}

/**
 * Resolve the active AI configuration from settings, including API key rotation.
 *
 * @param defaultProvider - The user's selected provider
 * @param providerSettings - Full provider settings map from the settings store
 * @returns Resolved config with rotated API key
 */
export function resolvePPTAIConfig(
  defaultProvider: string,
  providerSettings: Record<string, { apiKey?: string; apiKeys?: string[]; apiKeyRotationEnabled?: boolean; apiKeyRotationStrategy?: ApiKeyRotationStrategy; currentKeyIndex?: number; apiKeyUsageStats?: Record<string, ApiKeyUsageStats>; defaultModel?: string; baseURL?: string } | undefined>,
  customProviders: Record<
    string,
    {
      apiKey?: string;
      baseURL?: string;
      apiProtocol?: ApiProtocol;
      defaultModel?: string;
      enabled?: boolean;
    } | undefined
  > = {},
): PPTAIConfig {
  const resolution = resolveFeatureProvider(
    {
      featureId: 'ppt-ai',
      selectionMode: 'default-provider',
      fallbackMode: 'first-eligible',
      proxyMode: 'required',
      rotateApiKey: true,
    },
    {
      defaultProvider,
      providerSettings,
      customProviders,
    }
  );

  if (resolution.kind === 'resolved') {
    if (typeof resolution.nextKeyIndex === 'number' && resolution.providerId === defaultProvider) {
      import('@/stores').then(({ useSettingsStore }) => {
        useSettingsStore.getState().updateProviderSettings(defaultProvider, {
          currentKeyIndex: resolution.nextKeyIndex,
        });
      });
    }

    return {
      provider: resolution.providerId,
      model: resolution.model,
      apiKey: resolution.apiKey,
      baseURL: resolution.baseURL,
      protocol: resolution.protocol,
      isCustomProvider: resolution.isCustomProvider,
    };
  }

  const fallbackSettings = providerSettings[defaultProvider];
  return {
    provider: defaultProvider,
    model: fallbackSettings?.defaultModel || 'gpt-4o',
    apiKey: fallbackSettings?.apiKey || '',
    baseURL: fallbackSettings?.baseURL,
    protocol: 'openai',
    isCustomProvider: false,
  };
}

/**
 * Create a model instance from resolved config.
 */
export function createPPTModelInstance(config: PPTAIConfig): LanguageModel {
  return createFeatureProviderClient({
    providerId: config.provider,
    apiKey: config.apiKey,
    baseURL: config.baseURL,
    protocol: config.protocol,
    isCustomProvider: config.isCustomProvider,
    useProxy: true,
  })(config.model) as LanguageModel;
}
