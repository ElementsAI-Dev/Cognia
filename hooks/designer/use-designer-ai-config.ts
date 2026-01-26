/**
 * useDesignerAIConfig - Shared hook for getting AI configuration
 * Eliminates duplicate getConfig callbacks across components
 */

import { useCallback } from 'react';
import { useSettingsStore } from '@/stores';
import { getDesignerAIConfig, type DesignerAIConfig } from '@/lib/designer';

export interface UseDesignerAIConfigReturn {
  getConfig: () => DesignerAIConfig;
  provider: string | null;
  hasApiKey: boolean;
}

/**
 * Hook that provides a memoized function to get the current AI configuration
 * based on settings store state
 *
 * @returns Object containing getConfig function and current provider info
 *
 * @example
 * ```tsx
 * const { getConfig, hasApiKey } = useDesignerAIConfig();
 *
 * const handleAIAction = async () => {
 *   if (!hasApiKey) {
 *     setError('No API key configured');
 *     return;
 *   }
 *   const config = getConfig();
 *   const result = await executeDesignerAIEdit(prompt, code, config);
 * };
 * ```
 */
export function useDesignerAIConfig(): UseDesignerAIConfigReturn {
  const providerSettings = useSettingsStore((state) => state.providerSettings);
  const defaultProvider = useSettingsStore((state) => state.defaultProvider);

  const getConfig = useCallback((): DesignerAIConfig => {
    return getDesignerAIConfig(defaultProvider, providerSettings);
  }, [defaultProvider, providerSettings]);

  // Check if the current provider has an API key configured
  const hasApiKey = useCallback((): boolean => {
    const provider = defaultProvider || 'openai';
    const settings = providerSettings[provider];
    // Ollama doesn't require an API key
    if (provider === 'ollama') return true;
    return Boolean(settings?.apiKey);
  }, [defaultProvider, providerSettings]);

  return {
    getConfig,
    provider: defaultProvider,
    hasApiKey: hasApiKey(),
  };
}

export default useDesignerAIConfig;
