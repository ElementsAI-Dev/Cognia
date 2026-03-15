'use client';

import { useCallback, useMemo, useState } from 'react';
import { useSettingsStore } from '@/stores/settings';
import { useAIChat } from '@/lib/ai/generation/use-ai-chat';
import { resolveLatexAIChatConfig } from '@/lib/latex/ai-config';

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

type LatexAIOperationStatus = 'idle' | 'loading' | 'success' | 'error';
type LatexAIOperationType = 'text-action' | 'equation' | null;

interface LastLatexAIRequest {
  type: Exclude<LatexAIOperationType, null>;
  payload: UseLatexAITextActionOptions | string;
}

export interface UseLatexAIReturn {
  isLoading: boolean;
  error: string | null;
  status: LatexAIOperationStatus;
  activeOperation: LatexAIOperationType;
  runTextAction: (options: UseLatexAITextActionOptions) => Promise<string | null>;
  generateEquation: (prompt: string) => Promise<string | null>;
  retryLastAction: () => Promise<string | null>;
  stop: () => void;
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

  const config = useMemo(
    () => resolveLatexAIChatConfig(defaultProvider, providerSettings),
    [defaultProvider, providerSettings]
  );

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<LatexAIOperationStatus>('idle');
  const [activeOperation, setActiveOperation] = useState<LatexAIOperationType>(null);
  const [lastRequest, setLastRequest] = useState<LastLatexAIRequest | null>(null);

  const { sendMessage, stop } = useAIChat({
    provider: config.provider,
    model: config.model,
    onError: (err) => {
      setError(err.message);
      setIsLoading(false);
      setStatus('error');
    },
    onFinish: () => {
      setIsLoading(false);
      setActiveOperation(null);
    },
  });

  const runTextAction = useCallback(
    async ({ action, text, targetLanguage }: UseLatexAITextActionOptions) => {
      const input = text.trim();
      if (!input) return null;

      setIsLoading(true);
      setError(null);
      setStatus('loading');
      setActiveOperation('text-action');
      setLastRequest({
        type: 'text-action',
        payload: {
          action,
          text: input,
          targetLanguage,
        },
      });

      try {
        const prompt = buildTextPrompt(action, input, targetLanguage);
        const result = await sendMessage({
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.3,
          maxTokens: 2000,
        });

        const trimmed = result.trim();
        setIsLoading(false);
        setActiveOperation(null);
        setStatus('success');
        return trimmed ? trimmed : null;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'AI request failed';
        setError(message);
        setIsLoading(false);
        setActiveOperation(null);
        setStatus('error');
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
      setStatus('loading');
      setActiveOperation('equation');
      setLastRequest({
        type: 'equation',
        payload: input,
      });

      try {
        const result = await sendMessage({
          messages: [{ role: 'user', content: buildEquationPrompt(input) }],
          temperature: 0.2,
          maxTokens: 1200,
        });

        const trimmed = result.trim();
        setIsLoading(false);
        setActiveOperation(null);
        setStatus('success');
        return trimmed ? trimmed : null;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'AI request failed';
        setError(message);
        setIsLoading(false);
        setActiveOperation(null);
        setStatus('error');
        return null;
      }
    },
    [sendMessage]
  );

  const retryLastAction = useCallback(async () => {
    if (!lastRequest) return null;

    if (lastRequest.type === 'text-action') {
      return runTextAction(lastRequest.payload as UseLatexAITextActionOptions);
    }

    return generateEquation(lastRequest.payload as string);
  }, [generateEquation, lastRequest, runTextAction]);

  return {
    isLoading,
    error,
    status,
    activeOperation,
    runTextAction,
    generateEquation,
    retryLastAction,
    stop,
  };
}

export default useLatexAI;
