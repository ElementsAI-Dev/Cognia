/**
 * Skill Seekers LLM Integration
 *
 * Bridges Skill Seekers enhancement configuration with existing
 * Cognia LLM provider settings.
 */

import { useSettingsStore } from '@/stores/settings';
import type { EnhanceConfig, EnhanceProvider } from '@/lib/native/skill-seekers';

/** Provider mapping from Cognia to Skill Seekers */
const PROVIDER_MAP: Record<string, EnhanceProvider> = {
  anthropic: 'anthropic',
  google: 'google',
  openai: 'openai',
};

/** Supported providers for Skill Seekers enhancement */
export const SUPPORTED_ENHANCE_PROVIDERS = ['anthropic', 'google', 'openai'] as const;

/** Get configured providers that can be used for enhancement */
export function getConfiguredEnhanceProviders(): EnhanceProvider[] {
  const state = useSettingsStore.getState();
  const providers: EnhanceProvider[] = [];

  for (const providerId of SUPPORTED_ENHANCE_PROVIDERS) {
    const settings = state.providerSettings[providerId];
    if (settings?.apiKey && settings.enabled !== false) {
      const mapped = PROVIDER_MAP[providerId];
      if (mapped) {
        providers.push(mapped);
      }
    }
  }

  return providers;
}

/** Get the default enhancement provider based on configured providers */
export function getDefaultEnhanceProvider(): EnhanceProvider | null {
  const configured = getConfiguredEnhanceProviders();
  if (configured.length === 0) return null;

  const state = useSettingsStore.getState();
  const defaultProvider = state.defaultProvider;

  if (defaultProvider && PROVIDER_MAP[defaultProvider] && configured.includes(PROVIDER_MAP[defaultProvider])) {
    return PROVIDER_MAP[defaultProvider];
  }

  return configured[0];
}

/** Get API key for a specific enhancement provider */
export function getEnhanceProviderApiKey(provider: EnhanceProvider): string | null {
  const state = useSettingsStore.getState();

  const cogniaProvider = Object.entries(PROVIDER_MAP).find(([_, v]) => v === provider)?.[0];
  if (!cogniaProvider) return null;

  return state.providerSettings[cogniaProvider]?.apiKey || null;
}

/** Build enhancement configuration using existing LLM settings */
export function buildEnhanceConfig(
  provider?: EnhanceProvider,
  quality: 'minimal' | 'standard' | 'comprehensive' = 'standard'
): EnhanceConfig {
  const effectiveProvider = provider || getDefaultEnhanceProvider();

  if (!effectiveProvider) {
    return {
      mode: 'local',
      quality,
    };
  }

  const apiKey = getEnhanceProviderApiKey(effectiveProvider);

  return {
    mode: apiKey ? 'api' : 'local',
    provider: effectiveProvider,
    api_key: apiKey || undefined,
    quality,
  };
}

/** Check if any enhancement provider is configured */
export function hasEnhanceProvider(): boolean {
  return getConfiguredEnhanceProviders().length > 0;
}

/** Get provider display information */
export function getProviderDisplayInfo(provider: EnhanceProvider): { name: string; icon: string } {
  switch (provider) {
    case 'anthropic':
      return { name: 'Anthropic (Claude)', icon: '🤖' };
    case 'google':
      return { name: 'Google (Gemini)', icon: '✨' };
    case 'openai':
      return { name: 'OpenAI (GPT)', icon: '🧠' };
    default:
      return { name: provider, icon: '🔧' };
  }
}

const skillSeekersLlm = {
  getConfiguredEnhanceProviders,
  getDefaultEnhanceProvider,
  getEnhanceProviderApiKey,
  buildEnhanceConfig,
  hasEnhanceProvider,
  getProviderDisplayInfo,
  SUPPORTED_ENHANCE_PROVIDERS,
};

export default skillSeekersLlm;
