/**
 * Shared utility to resolve AI provider settings for preset AI operations.
 * Consolidates the repeated "find available API key" logic from
 * presets-manager, create-preset-dialog, and preset-manager-dialog.
 */

import type { ProviderName } from '@/types/provider';

export interface PresetAIConfig {
  provider: ProviderName;
  apiKey: string;
  baseURL?: string;
}

interface ProviderSettingsEntry {
  apiKey?: string;
  baseURL?: string;
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
): PresetAIConfig | null {
  const resolvedProvider = preferredProvider === 'auto' ? 'openai' : preferredProvider;

  // Try preferred provider
  if (resolvedProvider) {
    const settings = providerSettings[resolvedProvider];
    if (settings?.apiKey) {
      return {
        provider: resolvedProvider as ProviderName,
        apiKey: settings.apiKey,
        baseURL: settings.baseURL,
      };
    }
  }

  // Fallback to openai
  const openaiSettings = providerSettings['openai'];
  if (openaiSettings?.apiKey) {
    return {
      provider: 'openai' as ProviderName,
      apiKey: openaiSettings.apiKey,
      baseURL: openaiSettings.baseURL,
    };
  }

  // Fallback to any available provider
  const anyEntry = Object.entries(providerSettings).find(([, s]) => s?.apiKey);
  if (anyEntry && anyEntry[1]?.apiKey) {
    return {
      provider: anyEntry[0] as ProviderName,
      apiKey: anyEntry[1].apiKey,
      baseURL: anyEntry[1].baseURL,
    };
  }

  return null;
}
