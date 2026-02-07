/**
 * Prompt Optimizer - AI-powered prompt enhancement
 */

import { generateText } from 'ai';
import { getProviderModel, type ProviderName } from '../core/client';
import type {
  PromptOptimizationStyle,
  PromptOptimizationConfig,
  OptimizedPrompt,
} from '@/types/content/prompt';

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

/**
 * Detect if the prompt text is primarily in Chinese/CJK.
 */
export function detectPromptLanguage(text: string): 'zh' | 'en' | 'mixed' {
  const cjkPattern = /[\u4e00-\u9fff\u3400-\u4dbf\u{20000}-\u{2a6df}\u{2a700}-\u{2b73f}]/u;
  const cjkChars = (text.match(new RegExp(cjkPattern.source, 'gu')) || []).length;
  const latinChars = (text.match(/[a-zA-Z]/g) || []).length;
  const total = cjkChars + latinChars;
  if (total === 0) return 'en';
  const cjkRatio = cjkChars / total;
  if (cjkRatio > 0.3) return 'zh';
  if (cjkRatio > 0.1) return 'mixed';
  return 'en';
}

const COMMON_RULES = `
Critical rules:
- Preserve all code blocks (triple backticks), inline code, and technical identifiers exactly as-is.
- Preserve all variable placeholders like {{variable_name}}.
- Use clear delimiters (###, ---, or XML tags) to separate logical sections when appropriate.
- Detect the language of the input prompt and output the optimized prompt in the SAME language.
- Output ONLY the optimized prompt without any explanation, commentary, or meta-text.`;

const STYLE_PROMPTS: Record<PromptOptimizationStyle, string> = {
  concise: `You are a prompt optimization expert. Your task is to make the given prompt more concise and direct while preserving its core intent. Remove unnecessary words, simplify complex sentences, and focus on the essential request.${COMMON_RULES}`,

  detailed: `You are a prompt optimization expert. Your task is to enhance the given prompt by adding relevant context, specific requirements, and clear expectations. Make the prompt more comprehensive while keeping it focused. Include format preferences if applicable. Add few-shot examples where they would significantly improve response quality.${COMMON_RULES}`,

  creative: `You are a prompt optimization expert. Your task is to transform the given prompt to encourage creative, imaginative, and innovative responses. Add elements that inspire unique perspectives and unconventional thinking. Use vivid language and open-ended framing.${COMMON_RULES}`,

  professional: `You are a prompt optimization expert. Your task is to refine the given prompt using formal, business-appropriate language. Ensure clarity, professionalism, and appropriate tone for workplace communication. Structure the request with clear deliverables.${COMMON_RULES}`,

  academic: `You are a prompt optimization expert. Your task is to transform the given prompt into scholarly, research-oriented language. Include requests for citations, evidence-based reasoning, and academic rigor where appropriate. Encourage systematic analysis and critical evaluation.${COMMON_RULES}`,

  technical: `You are a prompt optimization expert. Your task is to optimize the given prompt for technical precision. Use accurate terminology, specify technical requirements clearly, and structure the prompt for optimal code or technical output. Include constraints, edge cases, and expected input/output formats.${COMMON_RULES}`,

  'step-by-step': `You are a prompt optimization expert. Your task is to restructure the given prompt using chain-of-thought reasoning. Break down the task into clear sequential steps, add "think step by step" or "let's work through this" framing, and ensure each step builds logically on the previous one. This style is ideal for complex reasoning, math, and multi-part tasks.${COMMON_RULES}`,

  structured: `You are a prompt optimization expert. Your task is to optimize the given prompt for structured, well-formatted output. Add explicit output format specifications (JSON, Markdown table, numbered list, etc.), define the expected schema or structure, include constraints on the response format, and add clear section headers or labels. This style is ideal when you need parseable, consistent output.${COMMON_RULES}`,

  custom: `You are a prompt optimization expert. Follow the custom instructions provided to optimize the given prompt.${COMMON_RULES}`,
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

    // Add language-awareness instruction
    const lang = detectPromptLanguage(prompt);
    if (lang === 'zh') {
      systemPrompt += '\n\nIMPORTANT: The input prompt is in Chinese. You MUST output the optimized prompt in Chinese as well.';
    } else if (lang === 'mixed') {
      systemPrompt += '\n\nIMPORTANT: The input prompt contains mixed Chinese and English. Preserve the language mix and optimize in both languages as appropriate.';
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
