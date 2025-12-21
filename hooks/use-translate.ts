'use client';

/**
 * useTranslate - Hook for AI-powered text translation
 * Provides easy access to translation functionality
 */

import { useCallback, useState } from 'react';
import { useSettingsStore } from '@/stores';
import type { ProviderName } from '@/types/provider';
import {
  translateText,
  detectLanguage,
  SUPPORTED_LANGUAGES,
  type LanguageCode,
  type TranslationResult,
  type TranslationConfig,
} from '@/lib/ai/translate';

export type LanguageDetectionResult = { code: LanguageCode; confidence: number };

export interface UseTranslateOptions {
  provider?: ProviderName;
  model?: string;
}

export interface UseTranslateReturn {
  // State
  isLoading: boolean;
  error: string | null;
  result: TranslationResult | null;
  detectedLanguage: LanguageDetectionResult | null;

  // Translation methods
  translate: (
    text: string,
    targetLanguage: LanguageCode
  ) => Promise<TranslationResult | null>;

  detect: (text: string) => Promise<LanguageDetectionResult | null>;

  // Batch translation
  translateBatch: (
    texts: string[],
    targetLanguage: LanguageCode
  ) => Promise<TranslationResult[] | null>;

  // Utilities
  getSupportedLanguages: () => typeof SUPPORTED_LANGUAGES;
  reset: () => void;
}

export function useTranslate(options: UseTranslateOptions = {}): UseTranslateReturn {
  const { provider: overrideProvider, model: overrideModel } = options;

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TranslationResult | null>(null);
  const [detectedLanguage, setDetectedLanguage] = useState<LanguageDetectionResult | null>(null);

  const defaultProviderRaw = useSettingsStore((state) => state.defaultProvider);
  const defaultProvider = (overrideProvider || defaultProviderRaw) as ProviderName;
  const providerSettings = useSettingsStore((state) => state.providerSettings);
  const defaultModel = overrideModel || providerSettings[defaultProvider]?.defaultModel || 'gpt-4o';

  // Get API key for current provider
  const getApiKey = useCallback((): string => {
    const settings = providerSettings[defaultProvider];
    return settings?.apiKey || '';
  }, [defaultProvider, providerSettings]);

  // Build translation config
  const buildConfig = useCallback((): TranslationConfig => ({
    provider: defaultProvider,
    model: defaultModel,
    apiKey: getApiKey(),
  }), [defaultProvider, defaultModel, getApiKey]);

  // Translate text
  const translate = useCallback(
    async (
      text: string,
      targetLanguage: LanguageCode
    ): Promise<TranslationResult | null> => {
      setIsLoading(true);
      setError(null);
      try {
        const config = buildConfig();
        const translationResult = await translateText(text, targetLanguage, config);
        setResult(translationResult);
        if (!translationResult.success) {
          setError(translationResult.error || 'Translation failed');
        }
        return translationResult;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Translation failed';
        setError(message);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [buildConfig]
  );

  // Detect language
  const detect = useCallback(
    async (text: string): Promise<LanguageDetectionResult | null> => {
      setIsLoading(true);
      setError(null);
      try {
        const config = buildConfig();
        const detection = await detectLanguage(text, config);
        setDetectedLanguage(detection);
        return detection;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Language detection failed';
        setError(message);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [buildConfig]
  );

  // Batch translate
  const translateBatch = useCallback(
    async (
      texts: string[],
      targetLanguage: LanguageCode
    ): Promise<TranslationResult[] | null> => {
      setIsLoading(true);
      setError(null);
      try {
        const config = buildConfig();
        const results: TranslationResult[] = [];
        for (const text of texts) {
          const translationResult = await translateText(text, targetLanguage, config);
          results.push(translationResult);
        }
        return results;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Batch translation failed';
        setError(message);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [buildConfig]
  );

  // Get supported languages
  const getSupportedLanguages = useCallback(() => SUPPORTED_LANGUAGES, []);

  // Reset state
  const reset = useCallback(() => {
    setIsLoading(false);
    setError(null);
    setResult(null);
    setDetectedLanguage(null);
  }, []);

  return {
    isLoading,
    error,
    result,
    detectedLanguage,
    translate,
    detect,
    translateBatch,
    getSupportedLanguages,
    reset,
  };
}

export type { LanguageCode, TranslationResult };
export { SUPPORTED_LANGUAGES };
export default useTranslate;
