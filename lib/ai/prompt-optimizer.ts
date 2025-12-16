/**
 * Prompt Optimizer - AI-powered prompt enhancement
 */

import { generateText } from 'ai';
import { getProviderModel, type ProviderName } from './client';
import type {
  PromptOptimizationStyle,
  PromptOptimizationConfig,
  OptimizedPrompt,
} from '@/types/prompt';

export interface OptimizePromptOptions {
  prompt: string;
  config: PromptOptimizationConfig;
  apiKey: string;
  baseURL?: string;
}

export interface OptimizePromptResult {
  success: boolean;
  optimizedPrompt?: OptimizedPrompt;
  error?: string;
}

const STYLE_PROMPTS: Record<PromptOptimizationStyle, string> = {
  concise: `You are a prompt optimization expert. Your task is to make the given prompt more concise and direct while preserving its core intent. Remove unnecessary words, simplify complex sentences, and focus on the essential request. Output only the optimized prompt without any explanation.`,
  
  detailed: `You are a prompt optimization expert. Your task is to enhance the given prompt by adding relevant context, specific requirements, and clear expectations. Make the prompt more comprehensive while keeping it focused. Include format preferences if applicable. Output only the optimized prompt without any explanation.`,
  
  creative: `You are a prompt optimization expert. Your task is to transform the given prompt to encourage creative, imaginative, and innovative responses. Add elements that inspire unique perspectives and unconventional thinking. Output only the optimized prompt without any explanation.`,
  
  professional: `You are a prompt optimization expert. Your task is to refine the given prompt using formal, business-appropriate language. Ensure clarity, professionalism, and appropriate tone for workplace communication. Output only the optimized prompt without any explanation.`,
  
  academic: `You are a prompt optimization expert. Your task is to transform the given prompt into scholarly, research-oriented language. Include requests for citations, evidence-based reasoning, and academic rigor where appropriate. Output only the optimized prompt without any explanation.`,
  
  technical: `You are a prompt optimization expert. Your task is to optimize the given prompt for technical precision. Use accurate terminology, specify technical requirements clearly, and structure the prompt for optimal code or technical output. Output only the optimized prompt without any explanation.`,
  
  custom: `You are a prompt optimization expert. Follow the custom instructions provided to optimize the given prompt. Output only the optimized prompt without any explanation.`,
};

const IMPROVEMENT_ANALYSIS_PROMPT = `Analyze the differences between the original and optimized prompts. List 2-4 specific improvements made, each as a brief phrase. Format as a JSON array of strings. Example: ["Added specific context", "Clarified expected format", "Removed ambiguity"]`;

/**
 * Optimize a prompt using AI
 */
export async function optimizePrompt(
  options: OptimizePromptOptions
): Promise<OptimizePromptResult> {
  const { prompt, config, apiKey, baseURL } = options;
  const { style, targetModel, targetProvider, customPrompt, preserveIntent, enhanceClarity, addContext } = config;

  const provider = (targetProvider || 'openai') as ProviderName;
  const model = targetModel || 'gpt-4o-mini';

  try {
    const modelInstance = getProviderModel(provider, model, apiKey, baseURL);

    // Build the system prompt
    let systemPrompt = style === 'custom' && customPrompt 
      ? customPrompt 
      : STYLE_PROMPTS[style];

    // Add additional instructions based on config
    const additionalInstructions: string[] = [];
    if (preserveIntent) {
      additionalInstructions.push('Ensure the core intent and meaning of the original prompt is preserved.');
    }
    if (enhanceClarity) {
      additionalInstructions.push('Focus on improving clarity and reducing ambiguity.');
    }
    if (addContext) {
      additionalInstructions.push('Add helpful context that would improve the AI response quality.');
    }

    if (additionalInstructions.length > 0) {
      systemPrompt += '\n\nAdditional requirements:\n' + additionalInstructions.map(i => `- ${i}`).join('\n');
    }

    // Generate optimized prompt
    const result = await generateText({
      model: modelInstance,
      system: systemPrompt,
      prompt: `Original prompt:\n\n${prompt}\n\nOptimized prompt:`,
      temperature: 0.7,
      maxOutputTokens: 2000,
    });

    const optimizedText = result.text.trim();

    // Generate improvement analysis
    let improvements: string[] = [];
    try {
      const analysisResult = await generateText({
        model: modelInstance,
        system: IMPROVEMENT_ANALYSIS_PROMPT,
        prompt: `Original: "${prompt}"\n\nOptimized: "${optimizedText}"`,
        temperature: 0.3,
        maxOutputTokens: 500,
      });

      const parsed = JSON.parse(analysisResult.text.trim());
      if (Array.isArray(parsed)) {
        improvements = parsed.filter((item): item is string => typeof item === 'string');
      }
    } catch {
      improvements = ['Prompt optimized for ' + style + ' style'];
    }

    return {
      success: true,
      optimizedPrompt: {
        original: prompt,
        optimized: optimizedText,
        style,
        improvements,
        model,
        provider,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to optimize prompt',
    };
  }
}

/**
 * Quick optimize with default settings
 */
export async function quickOptimize(
  prompt: string,
  style: PromptOptimizationStyle,
  provider: ProviderName,
  model: string,
  apiKey: string,
  baseURL?: string
): Promise<OptimizePromptResult> {
  return optimizePrompt({
    prompt,
    config: {
      style,
      targetProvider: provider,
      targetModel: model,
      preserveIntent: true,
      enhanceClarity: true,
      addContext: style === 'detailed',
    },
    apiKey,
    baseURL,
  });
}

/**
 * Batch optimize multiple prompts
 */
export async function batchOptimize(
  prompts: string[],
  config: PromptOptimizationConfig,
  apiKey: string,
  baseURL?: string
): Promise<OptimizePromptResult[]> {
  const results = await Promise.all(
    prompts.map((prompt) =>
      optimizePrompt({ prompt, config, apiKey, baseURL })
    )
  );
  return results;
}
