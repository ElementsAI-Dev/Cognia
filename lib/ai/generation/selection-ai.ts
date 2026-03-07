/**
 * Selection AI Service
 * 
 * Provides AI-powered text processing for the selection toolbar.
 * Uses the existing AI infrastructure to process selected text.
 */

import { generateText } from "ai";
import { useSettingsStore } from "@/stores/settings";
import {
  getProviderModelFromConfig,
  isValidProvider,
  type ProviderName,
} from "@/lib/ai/core/client";
import { getProviderConfig } from "@/types/provider";

export type SelectionAIAction =
  | "explain"
  | "translate"
  | "extract"
  | "summarize"
  | "define"
  | "rewrite"
  | "grammar";

export interface SelectionAIOptions {
  action: SelectionAIAction;
  text: string;
  targetLanguage?: string;
  customPrompt?: string;
}

export interface SelectionAIResult {
  success: boolean;
  result?: string;
  error?: string;
  action: SelectionAIAction;
  originalText: string;
  processingTime: number;
}

// Prompt templates for different actions
const PROMPT_TEMPLATES: Record<SelectionAIAction, (text: string, options?: { targetLanguage?: string }) => string> = {
  explain: (text) => 
    `Please explain the following text in a clear and concise way. Provide context if needed:\n\n"${text}"`,
  
  translate: (text, options) => 
    `Translate the following text to ${options?.targetLanguage || "Chinese (Simplified)"}. Only provide the translation, no explanations:\n\n"${text}"`,
  
  extract: (text) => 
    `Extract the key points from the following text as a concise bullet list:\n\n"${text}"`,
  
  summarize: (text) => 
    `Summarize the following text in 1-3 sentences, capturing the main idea:\n\n"${text}"`,
  
  define: (text) => 
    `Provide a clear definition and explanation for the following term or concept:\n\n"${text}"`,
  
  rewrite: (text) => 
    `Rewrite the following text to be clearer and more professional while keeping the same meaning:\n\n"${text}"`,
  
  grammar: (text) => 
    `Check and correct any grammar, spelling, or punctuation errors in the following text. Only provide the corrected version:\n\n"${text}"`,
};

interface SelectionProviderConfigResult {
  provider: ProviderName;
  model: string;
  apiKey: string;
  baseURL?: string;
}

function resolveSelectionProviderConfig():
  | { ok: true; config: SelectionProviderConfigResult }
  | { ok: false; error: string } {
  const settings = useSettingsStore.getState();
  const configuredProvider = settings.defaultProvider || "openai";
  const provider = isValidProvider(configuredProvider)
    ? (configuredProvider as ProviderName)
    : "openai";
  const providerSettings =
    settings.providerSettings[configuredProvider] ||
    settings.providerSettings[provider];

  if (!providerSettings) {
    return {
      ok: false,
      error: `Provider ${provider} has no settings. Configure provider settings before using selection AI.`,
    };
  }

  if (providerSettings.enabled === false) {
    return {
      ok: false,
      error: `Provider ${provider} is disabled. Enable it in settings to continue.`,
    };
  }

  const providerMeta = getProviderConfig(provider);
  const requiresApiKey = providerMeta?.apiKeyRequired ?? true;
  const apiKey =
    providerSettings.apiKey?.trim() ||
    providerSettings.apiKeys?.find((key) => key?.trim()) ||
    "";

  if (requiresApiKey && !apiKey) {
    return {
      ok: false,
      error: `Provider ${provider} requires an API key. Add a key in settings before using selection AI.`,
    };
  }

  const model = providerSettings.defaultModel?.trim();
  if (!model) {
    return {
      ok: false,
      error: `Provider ${provider} has no default model configured. Select a model in settings first.`,
    };
  }

  return {
    ok: true,
    config: {
      provider,
      model,
      apiKey,
      baseURL: providerSettings.baseURL,
    },
  };
}

/**
 * Process text with AI based on the specified action
 */
export async function processSelectionWithAI(
  options: SelectionAIOptions
): Promise<SelectionAIResult> {
  const startTime = Date.now();
  const { action, text, targetLanguage, customPrompt } = options;

  try {
    const providerResolution = resolveSelectionProviderConfig();
    if (!providerResolution.ok) {
      return {
        success: false,
        error: providerResolution.error,
        action,
        originalText: text,
        processingTime: Date.now() - startTime,
      };
    }
    const { config } = providerResolution;

    // Build prompt
    const prompt = customPrompt || PROMPT_TEMPLATES[action](text, { targetLanguage });
    const { model } = getProviderModelFromConfig({
      provider: config.provider,
      model: config.model,
      apiKey: config.apiKey,
      baseURL: config.baseURL,
    });

    // Generate response
    const { text: result } = await generateText({
      model,
      prompt,
    });

    return {
      success: true,
      result,
      action,
      originalText: text,
      processingTime: Date.now() - startTime,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "An unknown error occurred",
      action,
      originalText: text,
      processingTime: Date.now() - startTime,
    };
  }
}

/**
 * Quick translate function
 */
export async function quickTranslate(
  text: string,
  targetLanguage: string = "zh-CN"
): Promise<string> {
  const result = await processSelectionWithAI({
    action: "translate",
    text,
    targetLanguage: getLanguageName(targetLanguage),
  });

  if (result.success && result.result) {
    return result.result;
  }

  throw new Error(result.error || "Translation failed");
}

/**
 * Quick explain function
 */
export async function quickExplain(text: string): Promise<string> {
  const result = await processSelectionWithAI({
    action: "explain",
    text,
  });

  if (result.success && result.result) {
    return result.result;
  }

  throw new Error(result.error || "Explanation failed");
}

/**
 * Quick summarize function
 */
export async function quickSummarize(text: string): Promise<string> {
  const result = await processSelectionWithAI({
    action: "summarize",
    text,
  });

  if (result.success && result.result) {
    return result.result;
  }

  throw new Error(result.error || "Summarization failed");
}

// Helper to convert language code to name
function getLanguageName(code: string): string {
  const languages: Record<string, string> = {
    "zh-CN": "Chinese (Simplified)",
    "zh-TW": "Chinese (Traditional)",
    "en": "English",
    "ja": "Japanese",
    "ko": "Korean",
    "es": "Spanish",
    "fr": "French",
    "de": "German",
    "ru": "Russian",
    "ar": "Arabic",
    "pt": "Portuguese",
    "it": "Italian",
  };

  return languages[code] || code;
}
