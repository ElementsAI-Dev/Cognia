'use client';

import { useCallback, useMemo, useState } from 'react';
import { useSettingsStore } from '@/stores/settings';
import { useAIChat } from '@/lib/ai/generation/use-ai-chat';
import type { ProviderName } from '@/types/provider';

export type LatexAITextAction =
  | 'improveWriting'
  | 'fixGrammar'
  | 'makeConcise'
  | 'expandText'
  | 'translate';

export interface UseLatexAITextActionOptions {
  action: LatexAITextAction;
  text: string;
  targetLanguage?: string;
}

export interface UseLatexAIReturn {
  isLoading: boolean;
  error: string | null;
  runTextAction: (options: UseLatexAITextActionOptions) => Promise<string | null>;
  generateEquation: (prompt: string) => Promise<string | null>;
  stop: () => void;
}

function resolveProvider(
  defaultProvider: string,
  providerSettings: Record<string, { enabled?: boolean; apiKey?: string }>
) {
  if (defaultProvider === 'auto') {
    const candidates = Object.keys(providerSettings)
      .filter((key) => key !== 'auto')
      .filter(
        (key) =>
          providerSettings[key]?.enabled &&
          (key === 'ollama' || Boolean(providerSettings[key]?.apiKey))
      );

    const first = candidates[0];
    return (first ? first : 'openai') as ProviderName;
  }

  return defaultProvider as ProviderName;
}

function buildTextPrompt(action: LatexAITextAction, text: string, targetLanguage?: string) {
  switch (action) {
    case 'improveWriting':
      return `Improve the following text for clarity and flow while keeping the original meaning. Only output the improved text:\n\n"${text}"`;
    case 'fixGrammar':
      return `Fix grammar, spelling, and punctuation issues in the following text. Only output the corrected text:\n\n"${text}"`;
    case 'makeConcise':
      return `Rewrite the following text to be more concise while preserving meaning. Only output the rewritten text:\n\n"${text}"`;
    case 'expandText':
      return `Expand the following text with more details and context while preserving meaning. Only output the expanded text:\n\n"${text}"`;
    case 'translate':
      return `Translate the following text to ${targetLanguage || 'Chinese (Simplified)'}. Only output the translated text:\n\n"${text}"`;
    default:
      return text;
  }
}

function buildEquationPrompt(prompt: string) {
  return `You are an expert in LaTeX. Convert the user request into valid LaTeX math.\n\nRequirements:\n- Output ONLY LaTeX code.\n- Do NOT wrap in markdown fences.\n- Prefer inline math content (e.g. \\frac{a}{b}) unless the user asks for an environment.\n\nUser request:\n${prompt}`;
}

export function useLatexAI(): UseLatexAIReturn {
  const defaultProvider = useSettingsStore((s) => s.defaultProvider);
  const providerSettings = useSettingsStore((s) => s.providerSettings);

  const provider = useMemo(
    () => resolveProvider(defaultProvider, providerSettings as unknown as Record<string, { enabled?: boolean; apiKey?: string }>),
    [defaultProvider, providerSettings]
  );

  const model = useMemo(() => {
    const current = providerSettings[provider];
    if (current?.defaultModel) return current.defaultModel;

    const defaults: Record<string, string> = {
      openai: 'gpt-4o-mini',
      anthropic: 'claude-3-haiku-20240307',
      google: 'gemini-1.5-flash',
      deepseek: 'deepseek-chat',
      groq: 'llama-3.1-8b-instant',
    };

    return defaults[provider] || 'gpt-4o-mini';
  }, [provider, providerSettings]);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { sendMessage, stop } = useAIChat({
    provider,
    model,
    onError: (err) => {
      setError(err.message);
      setIsLoading(false);
    },
    onFinish: () => {
      setIsLoading(false);
    },
  });

  const runTextAction = useCallback(
    async ({ action, text, targetLanguage }: UseLatexAITextActionOptions) => {
      const input = text.trim();
      if (!input) return null;

      setIsLoading(true);
      setError(null);

      try {
        const prompt = buildTextPrompt(action, input, targetLanguage);
        const result = await sendMessage({
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.3,
          maxTokens: 2000,
        });

        const trimmed = result.trim();
        return trimmed ? trimmed : null;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'AI request failed';
        setError(message);
        setIsLoading(false);
        return null;
      }
    },
    [sendMessage]
  );

  const generateEquation = useCallback(
    async (prompt: string) => {
      const input = prompt.trim();
      if (!input) return null;

      setIsLoading(true);
      setError(null);

      try {
        const result = await sendMessage({
          messages: [{ role: 'user', content: buildEquationPrompt(input) }],
          temperature: 0.2,
          maxTokens: 1200,
        });

        const trimmed = result.trim();
        return trimmed ? trimmed : null;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'AI request failed';
        setError(message);
        setIsLoading(false);
        return null;
      }
    },
    [sendMessage]
  );

  return {
    isLoading,
    error,
    runTextAction,
    generateEquation,
    stop,
  };
}

export default useLatexAI;
