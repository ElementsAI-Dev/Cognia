import { resolveFeatureProvider } from '@/lib/ai/provider-consumption';
import type { ProviderName } from '@/types/provider';

interface LatexProviderSettingsEntry {
  enabled?: boolean;
  apiKey?: string;
  defaultModel?: string;
  baseURL?: string;
}

export interface LatexAIChatConfig {
  provider: ProviderName;
  model: string;
}

export function resolveLatexAIChatConfig(
  defaultProvider: string,
  providerSettings: Record<string, LatexProviderSettingsEntry>
): LatexAIChatConfig {
  const resolution = resolveFeatureProvider(
    {
      featureId: 'latex-ai-chat',
      selectionMode: 'default-provider',
      fallbackMode: 'first-eligible',
      supportedProviders: Object.keys(providerSettings).filter((providerId) => providerId !== 'auto'),
    },
    {
      defaultProvider,
      providerSettings,
      customProviders: {},
    }
  );

  if (resolution.kind === 'resolved') {
    return {
      provider: resolution.providerId as ProviderName,
      model: resolution.model,
    };
  }

  const fallbackProvider = (defaultProvider && defaultProvider !== 'auto'
    ? defaultProvider
    : 'openai') as ProviderName;

  return {
    provider: fallbackProvider,
    model: providerSettings[fallbackProvider]?.defaultModel || 'gpt-4o-mini',
  };
}
