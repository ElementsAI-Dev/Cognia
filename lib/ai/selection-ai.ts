/**
 * Selection AI Service
 * 
 * Provides AI-powered text processing for the selection toolbar.
 * Uses the existing AI infrastructure to process selected text.
 */

import { generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { useSettingsStore } from "@/stores/settings-store";
import type { ProviderName } from "@/types/provider";

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

/**
 * Get a provider instance based on provider name
 */
function getProvider(providerName: ProviderName, apiKey: string) {
  switch (providerName) {
    case "openai":
      return createOpenAI({ apiKey });
    case "anthropic":
      return createAnthropic({ apiKey });
    case "google":
      return createGoogleGenerativeAI({ apiKey });
    default:
      return createOpenAI({ apiKey });
  }
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
    // Get current settings
    const settings = useSettingsStore.getState();
    const providerId = settings.defaultProvider;
    const providerSettings = settings.providerSettings[providerId];

    if (!providerSettings?.apiKey) {
      return {
        success: false,
        error: "No API key configured. Please configure a provider in settings.",
        action,
        originalText: text,
        processingTime: Date.now() - startTime,
      };
    }

    // Get provider instance
    const provider = getProvider(providerId, providerSettings.apiKey);

    // Build prompt
    const prompt = customPrompt || PROMPT_TEMPLATES[action](text, { targetLanguage });

    // Generate response
    const { text: result } = await generateText({
      model: provider(providerSettings.defaultModel),
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
