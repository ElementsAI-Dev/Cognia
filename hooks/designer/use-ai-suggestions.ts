/**
 * useAISuggestions - Shared hook for AI-powered design suggestions
 * Consolidates duplicate suggestion logic from AIChatPanel and AISuggestionsPanel
 */

import { useState, useCallback } from 'react';
import {
  getAIStyleSuggestions,
  getAIAccessibilitySuggestions,
  getAIResponsiveSuggestions,
  getAILayoutSuggestions,
  executeDesignerAIEdit,
  type AISuggestion,
  type DesignerAIResult,
} from '@/lib/designer';
import { useDesignerAIConfig } from './use-designer-ai-config';

export type SuggestionType = 'style' | 'accessibility' | 'responsive' | 'layout';

export interface UseAISuggestionsOptions {
  onCodeChange?: (code: string) => void;
  onError?: (error: string) => void;
}

export interface UseAISuggestionsReturn {
  suggestions: AISuggestion[];
  isLoading: boolean;
  isApplying: string | null;
  error: string | null;
  fetchSuggestions: (type: SuggestionType) => Promise<void>;
  applySuggestion: (suggestion: AISuggestion) => Promise<DesignerAIResult>;
  applyAllSuggestions: (suggestions: AISuggestion[]) => Promise<DesignerAIResult>;
  clearSuggestions: () => void;
  clearError: () => void;
}

/**
 * Hook for managing AI design suggestions
 *
 * @param code - Current component code to analyze
 * @param options - Optional callbacks for code changes and errors
 * @returns Suggestion state and actions
 *
 * @example
 * ```tsx
 * const {
 *   suggestions,
 *   isLoading,
 *   fetchSuggestions,
 *   applySuggestion,
 * } = useAISuggestions(code, {
 *   onCodeChange: setCode,
 *   onError: setError,
 * });
 *
 * // Fetch style suggestions
 * await fetchSuggestions('style');
 *
 * // Apply a single suggestion
 * await applySuggestion(suggestions[0]);
 * ```
 */
export function useAISuggestions(
  code: string,
  options: UseAISuggestionsOptions = {}
): UseAISuggestionsReturn {
  const { onCodeChange, onError } = options;

  const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isApplying, setIsApplying] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { getConfig, hasApiKey } = useDesignerAIConfig();

  const handleError = useCallback(
    (errorMsg: string) => {
      setError(errorMsg);
      onError?.(errorMsg);
    },
    [onError]
  );

  const fetchSuggestions = useCallback(
    async (type: SuggestionType) => {
      if (!hasApiKey) {
        handleError('No API key configured. Please add your API key in Settings.');
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const config = getConfig();
        let result;

        switch (type) {
          case 'style':
            result = await getAIStyleSuggestions(code, config);
            break;
          case 'accessibility':
            result = await getAIAccessibilitySuggestions(code, config);
            break;
          case 'responsive':
            result = await getAIResponsiveSuggestions(code, config);
            break;
          case 'layout':
            result = await getAILayoutSuggestions(code, config);
            break;
        }

        if (result.success && result.suggestions) {
          setSuggestions(result.suggestions);
        } else {
          handleError(result.error || 'Failed to fetch suggestions');
        }
      } catch (err) {
        handleError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setIsLoading(false);
      }
    },
    [code, getConfig, hasApiKey, handleError]
  );

  const applySuggestion = useCallback(
    async (suggestion: AISuggestion): Promise<DesignerAIResult> => {
      if (!hasApiKey) {
        const errorMsg = 'No API key configured';
        handleError(errorMsg);
        return { success: false, error: errorMsg };
      }

      setIsApplying(suggestion.id);
      setError(null);

      try {
        const config = getConfig();
        const prompt = `Apply this improvement: ${suggestion.title}. ${suggestion.description}${
          suggestion.code ? ` Suggested code/classes: ${suggestion.code}` : ''
        }`;

        const result = await executeDesignerAIEdit(prompt, code, config);

        if (result.success && result.code) {
          onCodeChange?.(result.code);
          // Remove applied suggestion from list
          setSuggestions((prev) => prev.filter((s) => s.id !== suggestion.id));
        } else {
          handleError(result.error || 'Failed to apply suggestion');
        }

        return result;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'An error occurred';
        handleError(errorMsg);
        return { success: false, error: errorMsg };
      } finally {
        setIsApplying(null);
      }
    },
    [code, getConfig, hasApiKey, onCodeChange, handleError]
  );

  const applyAllSuggestions = useCallback(
    async (suggestionsToApply: AISuggestion[]): Promise<DesignerAIResult> => {
      if (suggestionsToApply.length === 0) {
        return { success: true, code };
      }

      if (!hasApiKey) {
        const errorMsg = 'No API key configured';
        handleError(errorMsg);
        return { success: false, error: errorMsg };
      }

      setIsApplying('all');
      setError(null);

      try {
        const config = getConfig();
        const prompt = `Apply the following improvements to this component:
${suggestionsToApply
  .map(
    (s, i) =>
      `${i + 1}. ${s.title}: ${s.description}${s.code ? ` (use: ${s.code})` : ''}`
  )
  .join('\n')}`;

        const result = await executeDesignerAIEdit(prompt, code, config);

        if (result.success && result.code) {
          onCodeChange?.(result.code);
          // Clear all applied suggestions
          setSuggestions((prev) =>
            prev.filter((s) => !suggestionsToApply.some((applied) => applied.id === s.id))
          );
        } else {
          handleError(result.error || 'Failed to apply suggestions');
        }

        return result;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'An error occurred';
        handleError(errorMsg);
        return { success: false, error: errorMsg };
      } finally {
        setIsApplying(null);
      }
    },
    [code, getConfig, hasApiKey, onCodeChange, handleError]
  );

  const clearSuggestions = useCallback(() => {
    setSuggestions([]);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    suggestions,
    isLoading,
    isApplying,
    error,
    fetchSuggestions,
    applySuggestion,
    applyAllSuggestions,
    clearSuggestions,
    clearError,
  };
}

export default useAISuggestions;
