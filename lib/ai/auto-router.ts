'use client';

/**
 * Auto Router - intelligent model selection based on task complexity
 * Routes queries to appropriate model tiers: fast, balanced, powerful
 * 
 * Features:
 * - Task complexity classification (simple, moderate, complex)
 * - Multi-tier model selection (fast, balanced, powerful)
 * - Provider availability checking
 * - Fallback mechanisms
 * - Vision and tool requirement detection
 */

import { useCallback, useMemo } from 'react';
import { useSettingsStore } from '@/stores';
import type { ProviderName } from '@/types/provider';
import { supportsToolCalling } from './client';

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
  /step.*by.*step.*reasoning/i,
  /chain.*of.*thought/i,
];

const CODE_PATTERNS = [
  /write.*code|implement|create.*function/i,
  /debug|fix.*bug|error.*in.*code/i,
  /refactor|optimize.*code/i,
  /\bapi\b|endpoint|backend/i,
  /\bsql\b|database|query/i,
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
  const requiresCode = CODE_PATTERNS.some((p) => p.test(input));

  // Estimate complexity based on input length and patterns
  const wordCount = input.split(/\s+/).length;
  const estimatedTokens = Math.ceil(wordCount * 1.3);

  // More nuanced complexity detection
  let complexity: 'simple' | 'moderate' | 'complex' = 'moderate';
  
  if (isSimple && wordCount < 20 && !requiresCode) {
    complexity = 'simple';
  } else if (isComplex || wordCount > 100 || requiresReasoning || requiresCode) {
    complexity = 'complex';
  }

  // Check for tool requirements
  const requiresTools = /use.*tool|search|browse|execute|fetch|call.*api/i.test(input);
  
  // Check for vision requirements
  const requiresVision = /image|picture|photo|screenshot|diagram|visual|look.*at/i.test(input);

  return {
    complexity,
    requiresReasoning,
    requiresTools,
    requiresVision,
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

  // Memoize enabled providers list
  const enabledProviders = useMemo(() => {
    const enabled: ProviderName[] = [];
    for (const [name, settings] of Object.entries(providerSettings)) {
      if (settings?.enabled && (settings.apiKey || name === 'ollama')) {
        enabled.push(name as ProviderName);
      }
    }
    return enabled;
  }, [providerSettings]);

  const getEnabledModels = useCallback(
    (tier: keyof typeof MODEL_TIERS) => {
      return MODEL_TIERS[tier].filter((m) => enabledProviders.includes(m.provider));
    },
    [enabledProviders]
  );

  // Filter models based on requirements
  const filterByRequirements = useCallback(
    (
      models: Array<{ provider: ProviderName; model: string }>,
      classification: TaskClassification
    ) => {
      return models.filter((m) => {
        // If tools are required, filter out models that don't support them
        if (classification.requiresTools && !supportsToolCalling(m.model)) {
          return false;
        }
        return true;
      });
    },
    []
  );

  const selectModel = useCallback(
    (input: string, options?: { preferredProvider?: ProviderName }): ModelSelection => {
      const classification = classifyTask(input);

      // Determine initial tier based on classification
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
      
      // Filter by requirements
      availableModels = filterByRequirements(availableModels, classification);

      // Fallback to lower tiers if no models available
      if (availableModels.length === 0) {
        const fallbackOrder: Array<keyof typeof MODEL_TIERS> = 
          tier === 'powerful' ? ['balanced', 'fast'] :
          tier === 'fast' ? ['balanced', 'powerful'] :
          ['fast', 'powerful'];

        for (const fallbackTier of fallbackOrder) {
          let fallbackModels = getEnabledModels(fallbackTier);
          fallbackModels = filterByRequirements(fallbackModels, classification);
          if (fallbackModels.length > 0) {
            availableModels = fallbackModels;
            tier = fallbackTier;
            break;
          }
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

      // If preferred provider is specified and available, use it
      if (options?.preferredProvider) {
        const preferred = availableModels.find((m) => m.provider === options.preferredProvider);
        if (preferred) {
          return {
            provider: preferred.provider,
            model: preferred.model,
            reason: `Auto: preferred provider (${classification.complexity} task)`,
          };
        }
      }

      // Select first available model from tier
      const selected = availableModels[0];

      const tierDescriptions = {
        fast: 'quick response',
        balanced: 'balanced quality/speed',
        powerful: 'complex reasoning',
      };

      // Build detailed reason
      const details: string[] = [];
      if (classification.requiresReasoning) details.push('reasoning');
      if (classification.requiresTools) details.push('tools');
      if (classification.requiresVision) details.push('vision');
      
      const detailStr = details.length > 0 ? ` [${details.join(', ')}]` : '';

      return {
        provider: selected.provider,
        model: selected.model,
        reason: `Auto: ${tierDescriptions[tier]} (${classification.complexity} task)${detailStr}`,
      };
    },
    [getEnabledModels, filterByRequirements]
  );

  // Get all available models across tiers
  const getAvailableModels = useCallback(() => {
    return {
      fast: getEnabledModels('fast'),
      balanced: getEnabledModels('balanced'),
      powerful: getEnabledModels('powerful'),
    };
  }, [getEnabledModels]);

  return { 
    selectModel, 
    classifyTask,
    getAvailableModels,
    enabledProviders,
  };
}

export { classifyTask };

/**
 * Get recommended model for a specific use case
 */
export function getRecommendedModel(
  useCase: 'chat' | 'code' | 'analysis' | 'creative' | 'fast',
  enabledProviders: ProviderName[]
): { provider: ProviderName; model: string } | null {
  const recommendations: Record<string, Array<{ provider: ProviderName; model: string }>> = {
    chat: [
      { provider: 'anthropic', model: 'claude-sonnet-4-20250514' },
      { provider: 'openai', model: 'gpt-4o' },
      { provider: 'google', model: 'gemini-1.5-pro' },
    ],
    code: [
      { provider: 'anthropic', model: 'claude-sonnet-4-20250514' },
      { provider: 'deepseek', model: 'deepseek-chat' },
      { provider: 'openai', model: 'gpt-4o' },
    ],
    analysis: [
      { provider: 'anthropic', model: 'claude-opus-4-20250514' },
      { provider: 'openai', model: 'o1' },
      { provider: 'deepseek', model: 'deepseek-reasoner' },
    ],
    creative: [
      { provider: 'anthropic', model: 'claude-sonnet-4-20250514' },
      { provider: 'openai', model: 'gpt-4o' },
      { provider: 'google', model: 'gemini-1.5-pro' },
    ],
    fast: [
      { provider: 'groq', model: 'llama-3.3-70b-versatile' },
      { provider: 'google', model: 'gemini-2.0-flash-exp' },
      { provider: 'openai', model: 'gpt-4o-mini' },
    ],
  };

  const options = recommendations[useCase] || recommendations.chat;
  
  for (const option of options) {
    if (enabledProviders.includes(option.provider)) {
      return option;
    }
  }

  return null;
}

/**
 * Estimate cost for a model and token count
 */
export function estimateModelCost(
  provider: ProviderName,
  model: string,
  inputTokens: number,
  outputTokens: number
): { inputCost: number; outputCost: number; totalCost: number } | null {
  // Approximate pricing per 1M tokens (as of late 2024)
  const pricing: Record<string, { input: number; output: number }> = {
    'gpt-4o': { input: 2.5, output: 10 },
    'gpt-4o-mini': { input: 0.15, output: 0.6 },
    'o1': { input: 15, output: 60 },
    'claude-sonnet-4': { input: 3, output: 15 },
    'claude-opus-4': { input: 15, output: 75 },
    'gemini-1.5-pro': { input: 1.25, output: 5 },
    'gemini-2.0-flash': { input: 0.075, output: 0.3 },
    'deepseek-chat': { input: 0.14, output: 0.28 },
  };

  // Find matching pricing
  const key = Object.keys(pricing).find((k) => model.toLowerCase().includes(k.toLowerCase()));
  if (!key) return null;

  const { input, output } = pricing[key];
  const inputCost = (inputTokens / 1_000_000) * input;
  const outputCost = (outputTokens / 1_000_000) * output;

  return {
    inputCost,
    outputCost,
    totalCost: inputCost + outputCost,
  };
}
