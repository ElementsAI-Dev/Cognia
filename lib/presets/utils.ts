/**
 * Shared preset utility functions
 */

import { PROVIDERS, type ProviderName } from '@/types/provider';

/**
 * Resolve a human-readable label for a chat mode.
 * @param mode - The chat mode string (chat, agent, research, learning)
 * @param t - Translation function scoped to 'chat' namespace
 */
export function getModeLabel(
  mode: string,
  t: (key: string) => string,
): string {
  switch (mode) {
    case 'chat':
      return t('modeChat');
    case 'agent':
      return t('modeAgent');
    case 'research':
      return t('modeResearch');
    case 'learning':
      return t('modeLearning');
    default:
      return mode;
  }
}

/**
 * Get the list of available models for a given provider.
 * When provider is 'auto', returns models from all providers.
 */
export function getAvailableModels(provider: string) {
  return provider === 'auto'
    ? Object.values(PROVIDERS).flatMap((p) => p.models)
    : PROVIDERS[provider as ProviderName]?.models || [];
}

/**
 * Get the list of enabled provider names from provider settings.
 */
export function getEnabledProviders(
  providerSettings: Record<string, { enabled?: boolean } | undefined>,
): ProviderName[] {
  return Object.entries(providerSettings)
    .filter(([, settings]) => settings?.enabled)
    .map(([name]) => name as ProviderName);
}
