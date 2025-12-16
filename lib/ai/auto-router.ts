'use client';

/**
 * Auto Router - intelligent model selection based on task complexity
 * Routes queries to appropriate model tiers: fast, balanced, powerful
 */

import { useCallback } from 'react';
import { useSettingsStore } from '@/stores';
import type { ProviderName } from '@/types/provider';

export interface ModelSelection {
  provider: ProviderName;
  model: string;
  reason: string;
}

interface TaskClassification {
  complexity: 'simple' | 'moderate' | 'complex';
  requiresReasoning: boolean;
  requiresTools: boolean;
  requiresVision: boolean;
  estimatedTokens: number;
}

// Patterns to detect task complexity
const COMPLEX_PATTERNS = [
  /write.*code|implement|create.*function|build.*app/i,
  /analyze.*data|research|investigate/i,
  /explain.*in.*detail|comprehensive|thorough/i,
  /multi-step|step.*by.*step/i,
  /compare.*and.*contrast|pros.*and.*cons/i,
  /debug|fix.*bug|troubleshoot/i,
  /architect|design.*system/i,
  /refactor|optimize|improve.*performance/i,
];

const REASONING_PATTERNS = [
  /why|how.*does|explain.*reasoning/i,
  /prove|derive|calculate/i,
  /logic|mathematical|theorem/i,
  /solve.*problem|figure.*out/i,
  /think.*through|reason.*about/i,
];

const SIMPLE_PATTERNS = [
  /what.*is|define|meaning.*of/i,
  /translate|convert/i,
  /summarize|tldr|brief/i,
  /yes.*or.*no|true.*or.*false/i,
  /list|enumerate/i,
  /^hi|^hello|^hey/i,
];

function classifyTask(input: string): TaskClassification {
  const isComplex = COMPLEX_PATTERNS.some((p) => p.test(input));
  const isSimple = SIMPLE_PATTERNS.some((p) => p.test(input)) && !isComplex;
  const requiresReasoning = REASONING_PATTERNS.some((p) => p.test(input));

  // Estimate complexity based on input length and patterns
  const wordCount = input.split(/\s+/).length;
  const estimatedTokens = Math.ceil(wordCount * 1.3);

  let complexity: 'simple' | 'moderate' | 'complex' = 'moderate';
  if (isSimple && wordCount < 20) {
    complexity = 'simple';
  } else if (isComplex || wordCount > 100 || requiresReasoning) {
    complexity = 'complex';
  }

  return {
    complexity,
    requiresReasoning,
    requiresTools: /use.*tool|search|browse|execute/i.test(input),
    requiresVision: /image|picture|photo|screenshot|diagram/i.test(input),
    estimatedTokens,
  };
}

// Model tiers for auto-routing
// Each tier is ordered by preference (first available will be selected)
const MODEL_TIERS = {
  fast: [
    { provider: 'groq' as ProviderName, model: 'llama-3.3-70b-versatile' },
    { provider: 'google' as ProviderName, model: 'gemini-2.0-flash-exp' },
    { provider: 'openai' as ProviderName, model: 'gpt-4o-mini' },
    { provider: 'anthropic' as ProviderName, model: 'claude-3-5-haiku-20241022' },
    { provider: 'deepseek' as ProviderName, model: 'deepseek-chat' },
    { provider: 'mistral' as ProviderName, model: 'mistral-small-latest' },
  ],
  balanced: [
    { provider: 'google' as ProviderName, model: 'gemini-1.5-pro' },
    { provider: 'openai' as ProviderName, model: 'gpt-4o' },
    { provider: 'anthropic' as ProviderName, model: 'claude-sonnet-4-20250514' },
    { provider: 'mistral' as ProviderName, model: 'mistral-large-latest' },
  ],
  powerful: [
    { provider: 'anthropic' as ProviderName, model: 'claude-opus-4-20250514' },
    { provider: 'openai' as ProviderName, model: 'o1' },
    { provider: 'deepseek' as ProviderName, model: 'deepseek-reasoner' },
  ],
};

export function useAutoRouter() {
  const providerSettings = useSettingsStore((state) => state.providerSettings);

  const getEnabledModels = useCallback(
    (tier: keyof typeof MODEL_TIERS) => {
      return MODEL_TIERS[tier].filter((m) => {
        const settings = providerSettings[m.provider];
        // Check if provider is enabled and has API key (or is Ollama)
        return settings?.enabled && (settings.apiKey || m.provider === 'ollama');
      });
    },
    [providerSettings]
  );

  const selectModel = useCallback(
    (input: string): ModelSelection => {
      const classification = classifyTask(input);

      // Determine tier based on classification
      let tier: keyof typeof MODEL_TIERS;
      if (classification.complexity === 'simple' && !classification.requiresReasoning) {
        tier = 'fast';
      } else if (classification.complexity === 'complex' || classification.requiresReasoning) {
        tier = 'powerful';
      } else {
        tier = 'balanced';
      }

      // Get available models for the tier
      let availableModels = getEnabledModels(tier);

      // Fallback to lower tiers if no models available
      if (availableModels.length === 0) {
        if (tier === 'powerful') {
          availableModels = getEnabledModels('balanced');
          if (availableModels.length > 0) {
            tier = 'balanced';
          }
        }
        if (availableModels.length === 0) {
          availableModels = getEnabledModels('fast');
          if (availableModels.length > 0) {
            tier = 'fast';
          }
        }
        if (availableModels.length === 0) {
          availableModels = getEnabledModels('balanced');
        }
      }

      // Default fallback if no providers are configured
      if (availableModels.length === 0) {
        return {
          provider: 'openai',
          model: 'gpt-4o-mini',
          reason: 'Fallback: No configured providers available. Please add API keys in Settings.',
        };
      }

      // Select first available model from tier
      const selected = availableModels[0];

      const tierDescriptions = {
        fast: 'quick response',
        balanced: 'balanced quality/speed',
        powerful: 'complex reasoning',
      };

      return {
        provider: selected.provider,
        model: selected.model,
        reason: `Auto: ${tierDescriptions[tier]} (${classification.complexity} task)`,
      };
    },
    [getEnabledModels]
  );

  return { selectModel, classifyTask };
}

export { classifyTask };
