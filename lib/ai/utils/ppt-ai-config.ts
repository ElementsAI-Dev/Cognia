/**
 * Shared PPT AI Configuration
 *
 * Consolidates duplicate provider config + API key rotation logic from:
 * - hooks/ppt/use-ppt-generation.ts
 * - hooks/designer/use-ppt-ai.ts
 */

import { getProxyProviderModel } from '@/lib/ai/core/proxy-client';
import { getNextApiKey } from '@/lib/ai/infrastructure/api-key-rotation';
import type { ProviderName, ApiKeyRotationStrategy, ApiKeyUsageStats } from '@/types/provider';
import type { LanguageModel } from 'ai';

export interface PPTAIConfig {
  provider: ProviderName;
  model: string;
  apiKey: string;
  baseURL?: string;
}

/**
 * Resolve the active AI configuration from settings, including API key rotation.
 *
 * @param defaultProvider - The user's selected provider
 * @param providerSettings - Full provider settings map from the settings store
 * @returns Resolved config with rotated API key
 */
export function resolvePPTAIConfig(
  defaultProvider: ProviderName,
  providerSettings: Record<string, { apiKey?: string; apiKeys?: string[]; apiKeyRotationEnabled?: boolean; apiKeyRotationStrategy?: ApiKeyRotationStrategy; currentKeyIndex?: number; apiKeyUsageStats?: Record<string, ApiKeyUsageStats>; defaultModel?: string; baseURL?: string } | undefined>,
): PPTAIConfig {
  const settings = providerSettings[defaultProvider];
  const model = settings?.defaultModel || 'gpt-4o';
  let apiKey = settings?.apiKey || '';
  const baseURL = settings?.baseURL;

  // Support API key rotation
  if (settings?.apiKeys && settings.apiKeys.length > 0 && settings.apiKeyRotationEnabled) {
    const usageStats: Record<string, ApiKeyUsageStats> = settings.apiKeyUsageStats || {};
    const rotationResult = getNextApiKey(
      settings.apiKeys,
      settings.apiKeyRotationStrategy || 'round-robin',
      settings.currentKeyIndex || 0,
      usageStats
    );
    apiKey = rotationResult.apiKey;

    // Lazy import to avoid circular deps when called from hooks
    import('@/stores').then(({ useSettingsStore }) => {
      useSettingsStore.getState().updateProviderSettings(defaultProvider, {
        currentKeyIndex: rotationResult.index,
      });
    });
  }

  return { provider: defaultProvider, model, apiKey, baseURL };
}

/**
 * Create a model instance from resolved config.
 */
export function createPPTModelInstance(config: PPTAIConfig): LanguageModel {
  return getProxyProviderModel(
    config.provider,
    config.model,
    config.apiKey,
    config.baseURL,
    true,
  );
}
