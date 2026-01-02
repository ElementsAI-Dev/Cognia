'use client';

/**
 * useStructuredOutput - Hook for generating structured AI output
 * Provides easy access to structured output functionality with Zod schemas
 */

import { useCallback, useState } from 'react';
import { useSettingsStore } from '@/stores';
import type { ProviderName } from '@/types/provider';
import {
  generateStructuredObject,
  streamStructuredObject,
  generateStructuredArray,
  type StructuredOutputConfig,
  EntityExtractionSchema,
  SentimentAnalysisSchema,
  TextClassificationSchema,
  CodeAnalysisSchema,
} from '@/lib/ai/generation/structured-output';
import { z } from 'zod';

// Summary schema for summarization
const SummarySchema = z.object({
  summary: z.string().describe('The summarized text'),
  keyPoints: z.array(z.string()).describe('Key points from the text'),
  wordCount: z.number().describe('Approximate word count of summary'),
});

export interface UseStructuredOutputOptions {
  provider?: ProviderName;
  model?: string;
  temperature?: number;
}

export interface UseStructuredOutputReturn<T> {
  // State
  isLoading: boolean;
  error: string | null;
  result: T | null;

  // Generation methods
  generate: <S extends z.ZodType>(
    prompt: string,
    schema: S,
    systemPrompt?: string
  ) => Promise<z.infer<S> | null>;

  generateArray: <S extends z.ZodType>(
    prompt: string,
    itemSchema: S,
    systemPrompt?: string
  ) => Promise<z.infer<S>[] | null>;

  streamGenerate: <S extends z.ZodType>(
    prompt: string,
    schema: S,
    onPartial: (partial: Partial<z.infer<S>>) => void,
    systemPrompt?: string
  ) => Promise<z.infer<S> | null>;

  // Preset methods for common use cases
  extractEntities: (text: string) => Promise<z.infer<typeof EntityExtractionSchema> | null>;
  analyzeSentiment: (text: string) => Promise<z.infer<typeof SentimentAnalysisSchema> | null>;
  classifyText: (text: string, categories: string[]) => Promise<z.infer<typeof TextClassificationSchema> | null>;
  summarize: (text: string, maxLength?: number) => Promise<z.infer<typeof SummarySchema> | null>;
  analyzeCode: (code: string, language?: string) => Promise<z.infer<typeof CodeAnalysisSchema> | null>;

  // Utilities
  reset: () => void;
}

export function useStructuredOutput<T = unknown>(
  options: UseStructuredOutputOptions = {}
): UseStructuredOutputReturn<T> {
  const { provider: overrideProvider, model: overrideModel, temperature = 0.3 } = options;

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<T | null>(null);

  const defaultProviderRaw = useSettingsStore((state) => state.defaultProvider);
  const defaultProvider = (overrideProvider || defaultProviderRaw) as ProviderName;
  const providerSettings = useSettingsStore((state) => state.providerSettings);
  const defaultModel = overrideModel || providerSettings[defaultProvider]?.defaultModel || 'gpt-4o';

  // Get API key for current provider
  const getApiKey = useCallback((): string => {
    const settings = providerSettings[defaultProvider];
    return settings?.apiKey || '';
  }, [defaultProvider, providerSettings]);

  // Build config
  const buildConfig = useCallback(
    (): StructuredOutputConfig => ({
      provider: defaultProvider,
      model: defaultModel,
      apiKey: getApiKey(),
      temperature,
    }),
    [defaultProvider, defaultModel, getApiKey, temperature]
  );

  // Generate structured object
  const generate = useCallback(
    async <S extends z.ZodType>(
      prompt: string,
      schema: S,
      systemPrompt?: string
    ): Promise<z.infer<S> | null> => {
      setIsLoading(true);
      setError(null);
      try {
        const config = buildConfig();
        const response = await generateStructuredObject({
          schema,
          prompt,
          systemPrompt,
          config,
        });
        setResult(response.object as T);
        return response.object;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Generation failed';
        setError(message);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [buildConfig]
  );

  // Generate structured array
  const generateArray = useCallback(
    async <S extends z.ZodType>(
      prompt: string,
      itemSchema: S,
      systemPrompt?: string
    ): Promise<z.infer<S>[] | null> => {
      setIsLoading(true);
      setError(null);
      try {
        const config = buildConfig();
        const response = await generateStructuredArray({
          elementSchema: itemSchema,
          prompt,
          systemPrompt,
          config,
        });
        setResult(response.object as T);
        return response.object;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Generation failed';
        setError(message);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [buildConfig]
  );

  // Stream structured object
  const streamGenerate = useCallback(
    async <S extends z.ZodType>(
      prompt: string,
      schema: S,
      onPartial: (partial: Partial<z.infer<S>>) => void,
      systemPrompt?: string
    ): Promise<z.infer<S> | null> => {
      setIsLoading(true);
      setError(null);
      try {
        const config = buildConfig();
        const response = await streamStructuredObject({
          schema,
          prompt,
          systemPrompt,
          config,
          onPartial,
        });
        setResult(response as T);
        return response;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Streaming failed';
        setError(message);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [buildConfig]
  );

  // Preset: Extract entities
  const extractEntities = useCallback(
    async (text: string) => {
      return generate(
        `Extract all entities (people, organizations, locations, dates, etc.) from the following text:\n\n${text}`,
        EntityExtractionSchema,
        'You are an expert at extracting named entities from text. Be thorough and accurate.'
      );
    },
    [generate]
  );

  // Preset: Analyze sentiment
  const analyzeSentiment = useCallback(
    async (text: string) => {
      return generate(
        `Analyze the sentiment of the following text:\n\n${text}`,
        SentimentAnalysisSchema,
        'You are an expert at sentiment analysis. Consider both overall sentiment and specific aspects.'
      );
    },
    [generate]
  );

  // Preset: Classify text
  const classifyText = useCallback(
    async (text: string, categories: string[]) => {
      return generate(
        `Classify the following text into one of these categories: ${categories.join(', ')}\n\nText:\n${text}`,
        TextClassificationSchema,
        'You are an expert at text classification. Choose the most appropriate category.'
      );
    },
    [generate]
  );

  // Preset: Summarize
  const summarize = useCallback(
    async (text: string, maxLength?: number) => {
      const lengthInstruction = maxLength ? ` Keep the summary under ${maxLength} words.` : '';
      return generate(
        `Summarize the following text.${lengthInstruction}\n\nText:\n${text}`,
        SummarySchema,
        'You are an expert at summarization. Be concise and capture the key points.'
      );
    },
    [generate]
  );

  // Preset: Analyze code
  const analyzeCode = useCallback(
    async (code: string, language?: string) => {
      const langInfo = language ? ` (${language})` : '';
      return generate(
        `Analyze the following code${langInfo} and provide insights about its structure, complexity, and potential improvements:\n\n\`\`\`\n${code}\n\`\`\``,
        CodeAnalysisSchema,
        'You are an expert code reviewer. Identify issues and suggest improvements.'
      );
    },
    [generate]
  );

  // Reset state
  const reset = useCallback(() => {
    setIsLoading(false);
    setError(null);
    setResult(null);
  }, []);

  return {
    isLoading,
    error,
    result,
    generate,
    generateArray,
    streamGenerate,
    extractEntities,
    analyzeSentiment,
    classifyText,
    summarize,
    analyzeCode,
    reset,
  };
}

export default useStructuredOutput;
