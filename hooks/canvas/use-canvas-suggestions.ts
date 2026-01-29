'use client';

/**
 * useCanvasSuggestions - Hook for AI-powered inline suggestions in Canvas
 */

import { useCallback, useState, useRef } from 'react';
import { generateText } from 'ai';
import { getProviderModel, type ProviderName } from '@/lib/ai/core/client';
import { useSettingsStore, useSessionStore, useArtifactStore } from '@/stores';
import type { CanvasSuggestion, ArtifactLanguage } from '@/types';
import { nanoid } from 'nanoid';
import { contextAnalyzer } from '@/lib/canvas/ai/context-analyzer';

export interface SuggestionContext {
  content: string;
  language: ArtifactLanguage;
  cursorLine?: number;
  selection?: string;
}

export interface GenerateSuggestionsOptions {
  maxSuggestions?: number;
  focusArea?: 'bugs' | 'improvements' | 'style' | 'all';
}

interface UseSuggestionsReturn {
  suggestions: CanvasSuggestion[];
  isGenerating: boolean;
  error: string | null;
  generateSuggestions: (
    context: SuggestionContext,
    options?: GenerateSuggestionsOptions
  ) => Promise<CanvasSuggestion[]>;
  applySuggestion: (suggestionId: string) => void;
  rejectSuggestion: (suggestionId: string) => void;
  clearSuggestions: () => void;
}

const SUGGESTION_PROMPT = `You are a code/text analyst. Analyze the following content and provide specific, actionable suggestions.

For each suggestion, output in this exact JSON format (one per line):
{"type": "fix|improve|comment|edit", "startLine": <number>, "endLine": <number>, "original": "<original text>", "suggested": "<suggested replacement>", "explanation": "<why this change helps>"}

Rules:
- Only output valid JSON lines, no other text
- startLine and endLine are 1-indexed
- Keep suggestions focused and specific
- Maximum 5 suggestions
- Focus on the most impactful improvements`;

export function useCanvasSuggestions(): UseSuggestionsReturn {
  const [suggestions, setSuggestions] = useState<CanvasSuggestion[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const providerSettings = useSettingsStore((state) => state.providerSettings);
  const defaultProvider = useSettingsStore((state) => state.defaultProvider);
  const getActiveSession = useSessionStore((state) => state.getActiveSession);
  const addSuggestion = useArtifactStore((state) => state.addSuggestion);
  const activeCanvasId = useArtifactStore((state) => state.activeCanvasId);

  const generateSuggestions = useCallback(
    async (
      context: SuggestionContext,
      options: GenerateSuggestionsOptions = {}
    ): Promise<CanvasSuggestion[]> => {
      const { maxSuggestions = 5, focusArea = 'all' } = options;

      // Cancel any pending request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      setIsGenerating(true);
      setError(null);

      try {
        const session = getActiveSession();
        const provider = (session?.provider || defaultProvider || 'openai') as ProviderName;
        const model = session?.model || providerSettings[provider]?.defaultModel || 'gpt-4o-mini';
        const settings = providerSettings[provider];

        if (!settings?.apiKey && provider !== 'ollama') {
          throw new Error(`No API key configured for ${provider}`);
        }

        const modelInstance = getProviderModel(
          provider,
          model,
          settings?.apiKey || '',
          settings?.baseURL
        );

        let focusInstruction = '';
        if (focusArea !== 'all') {
          const focusMap = {
            bugs: 'Focus on finding bugs, errors, and potential issues.',
            improvements: 'Focus on code quality and performance improvements.',
            style: 'Focus on style, formatting, and readability.',
          };
          focusInstruction = focusMap[focusArea];
        }

        // Analyze context for better suggestions
        const documentContext = contextAnalyzer.analyzeContext(
          context.content,
          { line: context.cursorLine || 1, column: 1 },
          context.language
        );
        const contextualInfo = contextAnalyzer.generateContextualPrompt(documentContext, 'review');

        const prompt = `${SUGGESTION_PROMPT}

${focusInstruction}

Language: ${context.language}
Maximum suggestions: ${maxSuggestions}
${context.cursorLine ? `Cursor at line: ${context.cursorLine}` : ''}
${context.selection ? `Selected text:\n${context.selection}\n` : ''}

Context Analysis:
${contextualInfo}

Content:
\`\`\`${context.language}
${context.content}
\`\`\`

Provide suggestions:`;

        const result = await generateText({
          model: modelInstance,
          prompt,
          temperature: 0.5,
          abortSignal: abortControllerRef.current?.signal,
        });

        // Parse suggestions from response
        const parsedSuggestions: CanvasSuggestion[] = [];
        const lines = result.text.split('\n').filter((line) => line.trim());

        for (const line of lines) {
          try {
            const trimmed = line.trim();
            if (!trimmed.startsWith('{')) continue;

            const parsed = JSON.parse(trimmed);
            if (parsed.type && parsed.startLine && parsed.suggested) {
              const suggestion: CanvasSuggestion = {
                id: nanoid(),
                type: parsed.type as 'edit' | 'comment' | 'fix' | 'improve',
                range: {
                  startLine: parsed.startLine,
                  endLine: parsed.endLine || parsed.startLine,
                  startColumn: parsed.startColumn,
                  endColumn: parsed.endColumn,
                },
                originalText: parsed.original || '',
                suggestedText: parsed.suggested,
                explanation: parsed.explanation || '',
                status: 'pending',
              };
              parsedSuggestions.push(suggestion);

              // Also add to store if we have an active canvas
              if (activeCanvasId) {
                addSuggestion(activeCanvasId, {
                  type: suggestion.type,
                  range: suggestion.range,
                  originalText: suggestion.originalText,
                  suggestedText: suggestion.suggestedText,
                  explanation: suggestion.explanation,
                  status: suggestion.status,
                });
              }
            }
          } catch {
            // Skip invalid JSON lines
          }
        }

        setSuggestions(parsedSuggestions);
        return parsedSuggestions;
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          return [];
        }
        const errorMsg = err instanceof Error ? err.message : 'Failed to generate suggestions';
        setError(errorMsg);
        return [];
      } finally {
        setIsGenerating(false);
      }
    },
    [getActiveSession, defaultProvider, providerSettings, activeCanvasId, addSuggestion]
  );

  const applySuggestion = useCallback((suggestionId: string) => {
    setSuggestions((prev) =>
      prev.map((s) => (s.id === suggestionId ? { ...s, status: 'accepted' as const } : s))
    );
  }, []);

  const rejectSuggestion = useCallback((suggestionId: string) => {
    setSuggestions((prev) =>
      prev.map((s) => (s.id === suggestionId ? { ...s, status: 'rejected' as const } : s))
    );
  }, []);

  const clearSuggestions = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setSuggestions([]);
    setError(null);
  }, []);

  return {
    suggestions,
    isGenerating,
    error,
    generateSuggestions,
    applySuggestion,
    rejectSuggestion,
    clearSuggestions,
  };
}

export default useCanvasSuggestions;
