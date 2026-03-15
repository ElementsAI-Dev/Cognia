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
  const customProviders = useSettingsStore((state) => state.customProviders);
  const defaultProvider = useSettingsStore((state) => state.defaultProvider);

  const getConfig = useCallback((): DesignerAIConfig => {
    return getDesignerAIConfig(defaultProvider, providerSettings, customProviders);
  }, [defaultProvider, providerSettings, customProviders]);

  // Check if the current provider has an API key configured
  const hasApiKey = useCallback((): boolean => {
    const config = getConfig();
    return Boolean(config.apiKey) || config.provider === 'ollama';
  }, [getConfig]);

  return {
    getConfig,
    provider: defaultProvider,
    hasApiKey: hasApiKey(),
  };
}

export default useDesignerAIConfig;
