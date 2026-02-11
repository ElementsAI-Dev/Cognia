/**
 * usePresetAI - shared hook for AI-powered preset operations.
 * Encapsulates generate-from-description, optimize-prompt, and generate-builtin-prompts
 * logic used by both CreatePresetDialog and PresetManagerDialog.
 */

import { useState, useCallback } from 'react';
import { useSettingsStore } from '@/stores';
import { toast } from '@/components/ui/sonner';
import { loggers } from '@/lib/logger';
import { getPresetAIConfig } from '@/lib/presets';
import {
  generatePresetFromDescription,
  optimizePresetPrompt,
  generateBuiltinPrompts as generateBuiltinPromptsAI,
  type GeneratedPreset,
  type GeneratedBuiltinPrompt,
} from '@/lib/ai/presets';

interface UsePresetAIOptions {
  onGenerateSuccess?: (preset: GeneratedPreset) => void;
  onOptimizeSuccess?: (optimizedPrompt: string) => void;
  onGeneratePromptsSuccess?: (prompts: GeneratedBuiltinPrompt[]) => void;
  onError?: (error: string) => void;
}

interface UsePresetAIReturn {
  isGeneratingPreset: boolean;
  isOptimizingPrompt: boolean;
  isGeneratingPrompts: boolean;
  handleGeneratePreset: (description: string, preferredProvider?: string) => Promise<void>;
  handleOptimizePrompt: (prompt: string, preferredProvider?: string) => Promise<void>;
  handleGenerateBuiltinPrompts: (
    name: string,
    description: string | undefined,
    systemPrompt: string | undefined,
    existingPrompts: Array<{ name: string; content: string }>,
    preferredProvider?: string,
    count?: number,
  ) => Promise<void>;
}

export function usePresetAI(options: UsePresetAIOptions = {}): UsePresetAIReturn {
  const { onGenerateSuccess, onOptimizeSuccess, onGeneratePromptsSuccess, onError } = options;
  const providerSettings = useSettingsStore((state) => state.providerSettings);

  const [isGeneratingPreset, setIsGeneratingPreset] = useState(false);
  const [isOptimizingPrompt, setIsOptimizingPrompt] = useState(false);
  const [isGeneratingPrompts, setIsGeneratingPrompts] = useState(false);

  const resolveConfig = useCallback(
    (preferredProvider?: string) => {
      const config = getPresetAIConfig(providerSettings, preferredProvider);
      if (!config) {
        onError?.('noApiKey');
        return null;
      }
      return config;
    },
    [providerSettings, onError],
  );

  const handleGeneratePreset = useCallback(
    async (description: string, preferredProvider?: string) => {
      if (!description.trim()) return;

      const aiConfig = resolveConfig(preferredProvider);
      if (!aiConfig) return;

      setIsGeneratingPreset(true);
      try {
        const result = await generatePresetFromDescription(description, aiConfig);
        if (result.success && result.preset) {
          onGenerateSuccess?.(result.preset);
        } else {
          const errMsg = result.error || 'Failed to generate preset';
          onError?.(errMsg);
          toast.error(errMsg);
        }
      } catch (error) {
        loggers.ui.error('Failed to generate preset:', error);
        onError?.('Failed to generate preset');
      } finally {
        setIsGeneratingPreset(false);
      }
    },
    [resolveConfig, onGenerateSuccess, onError],
  );

  const handleOptimizePrompt = useCallback(
    async (prompt: string, preferredProvider?: string) => {
      if (!prompt.trim()) return;

      const aiConfig = resolveConfig(preferredProvider);
      if (!aiConfig) return;

      setIsOptimizingPrompt(true);
      try {
        const result = await optimizePresetPrompt(prompt, aiConfig);
        if (result.success && result.optimizedPrompt) {
          onOptimizeSuccess?.(result.optimizedPrompt);
        } else {
          const errMsg = result.error || 'Failed to optimize prompt';
          onError?.(errMsg);
          toast.error(errMsg);
        }
      } catch (error) {
        loggers.ui.error('Failed to optimize prompt:', error);
        onError?.('Failed to optimize prompt');
      } finally {
        setIsOptimizingPrompt(false);
      }
    },
    [resolveConfig, onOptimizeSuccess, onError],
  );

  const handleGenerateBuiltinPrompts = useCallback(
    async (
      name: string,
      description: string | undefined,
      systemPrompt: string | undefined,
      existingPrompts: Array<{ name: string; content: string }>,
      preferredProvider?: string,
      count: number = 3,
    ) => {
      if (!name.trim()) return;

      const aiConfig = resolveConfig(preferredProvider);
      if (!aiConfig) return;

      setIsGeneratingPrompts(true);
      try {
        const result = await generateBuiltinPromptsAI(
          name,
          description,
          systemPrompt,
          existingPrompts,
          aiConfig,
          count,
        );
        if (result.success && result.prompts) {
          onGeneratePromptsSuccess?.(result.prompts);
        } else {
          const errMsg = result.error || 'Failed to generate prompts';
          onError?.(errMsg);
          toast.error(errMsg);
        }
      } catch (error) {
        loggers.ui.error('Failed to generate prompts:', error);
        onError?.('Failed to generate prompts');
      } finally {
        setIsGeneratingPrompts(false);
      }
    },
    [resolveConfig, onGeneratePromptsSuccess, onError],
  );

  return {
    isGeneratingPreset,
    isOptimizingPrompt,
    isGeneratingPrompts,
    handleGeneratePreset,
    handleOptimizePrompt,
    handleGenerateBuiltinPrompts,
  };
}
