/**
 * Shared utility to resolve AI provider settings for preset AI operations.
 * Consolidates the repeated "find available API key" logic from
 * presets-manager, create-preset-dialog, and preset-manager-dialog.
 */

import {
  resolveFeatureProvider,
  type ProviderSettingsSnapshot,
} from '@/lib/ai/provider-consumption';
import type { ApiKeyUsageStats, ApiProtocol } from '@/types/provider';

export interface PresetAIConfig {
  provider: string;
  model?: string;
  apiKey: string;
  baseURL?: string;
  protocol?: ApiProtocol;
  isCustomProvider: boolean;
  useProxy: boolean;
}

interface ProviderSettingsEntry {
  apiKey?: string;
  baseURL?: string;
  defaultModel?: string;
  enabled?: boolean;
  providerId?: string;
  apiKeys?: string[];
  apiKeyRotationEnabled?: boolean;
  apiKeyRotationStrategy?: 'round-robin' | 'random' | 'least-used';
  currentKeyIndex?: number;
  apiKeyUsageStats?: Record<string, ApiKeyUsageStats>;
}

interface CustomProviderEntry {
  baseURL?: string;
  apiKey?: string;
  apiProtocol?: ApiProtocol;
  defaultModel?: string;
  enabled?: boolean;
}

interface PresetAIConfigOptions {
  customProviders?: Record<string, CustomProviderEntry | undefined>;
  defaultProvider?: string;
}

/**
 * Resolve the best available AI config for preset operations.
 *
 * Strategy:
 * 1. If `preferredProvider` is given and has an API key, use it.
 * 2. Otherwise fall back to OpenAI.
 * 3. Otherwise fall back to any provider that has an API key.
 *
 * @returns PresetAIConfig if a key is available, or null if none found.
 */
export function getPresetAIConfig(
  providerSettings: Record<string, ProviderSettingsEntry | undefined>,
  preferredProvider?: string,
  options: PresetAIConfigOptions = {},
): PresetAIConfig | null {
  const configuredProviders = [
    ...Object.keys(providerSettings),
    ...Object.keys(options.customProviders || {}),
  ];

  const snapshot: ProviderSettingsSnapshot = {
    defaultProvider: options.defaultProvider,
    providerSettings,
    customProviders: options.customProviders,
  };

  const resolution = resolveFeatureProvider(
    preferredProvider && preferredProvider !== 'auto'
      ? {
          featureId: 'preset-ai',
          selectionMode: 'supported-providers',
          providerId: preferredProvider,
          supportedProviders: Array.from(
            new Set([preferredProvider, 'openai', ...configuredProviders])
          ),
          fallbackMode: 'first-eligible',
          proxyMode: 'preferred',
        }
      : {
          featureId: 'preset-ai',
          selectionMode: 'default-provider',
          supportedProviders: Array.from(new Set(configuredProviders)),
          fallbackMode: 'first-eligible',
          proxyMode: 'preferred',
        },
    snapshot
  );

  if (resolution.kind !== 'resolved') {
    return null;
  }

  return {
    provider: resolution.providerId,
    model: resolution.model,
    apiKey: resolution.apiKey,
    baseURL: resolution.baseURL,
    protocol: resolution.protocol,
    isCustomProvider: resolution.isCustomProvider,
    useProxy: resolution.useProxy,
  };
}
