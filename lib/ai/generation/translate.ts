/**
 * Translation utilities using AI
 */

import { generateText } from 'ai';
import { getProviderModel, type ProviderName } from '../core/client';

export interface TranslationResult {
  success: boolean;
  translatedText?: string;
  sourceLanguage?: string;
  targetLanguage: string;
  error?: string;
}

export interface TranslationConfig {
  provider: ProviderName;
  model: string;
  apiKey: string;
  baseURL?: string;
}

export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'zh', name: 'Chinese', nativeName: '中文' },
  { code: 'zh-TW', name: 'Traditional Chinese', nativeName: '繁體中文' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語' },
  { code: 'ko', name: 'Korean', nativeName: '한국어' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'th', name: 'Thai', nativeName: 'ไทย' },
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt' },
] as const;

export type LanguageCode = (typeof SUPPORTED_LANGUAGES)[number]['code'];

/**
 * Translate text using AI
 */
export async function translateText(
  text: string,
  targetLanguage: LanguageCode,
  config: TranslationConfig
): Promise<TranslationResult> {
  try {
    const targetLangInfo = SUPPORTED_LANGUAGES.find(
      (l) => l.code === targetLanguage
    );
    
    if (!targetLangInfo) {
      return {
        success: false,
        targetLanguage,
        error: `Unsupported language: ${targetLanguage}`,
      };
    }

    const { provider, model, apiKey, baseURL } = config;

    if (!apiKey && provider !== 'ollama') {
      return {
        success: false,
        targetLanguage,
        error: `API key not configured for ${provider}`,
      };
    }

    const modelInstance = getProviderModel(provider, model, apiKey, baseURL);

    const systemPrompt = `You are a professional translator. Translate the following text to ${targetLangInfo.name} (${targetLangInfo.nativeName}). 
Only output the translated text, nothing else. Preserve the original formatting, including line breaks and paragraphs.
If the text is already in the target language, return it as is.`;

    const result = await generateText({
      model: modelInstance,
      system: systemPrompt,
      prompt: text,
      temperature: 0.3,
    });

    const translatedText = result.text.trim();

    if (!translatedText) {
      return {
        success: false,
        targetLanguage,
        error: 'No translation received',
      };
    }

    return {
      success: true,
      translatedText,
      targetLanguage,
    };
  } catch (error) {
    return {
      success: false,
      targetLanguage,
      error: error instanceof Error ? error.message : 'Translation failed',
    };
  }
}

/**
 * Detect the language of text
 */
export async function detectLanguage(
  text: string,
  config: TranslationConfig
): Promise<{ code: LanguageCode; confidence: number } | null> {
  try {
    const { provider, model, apiKey, baseURL } = config;

    if (!apiKey && provider !== 'ollama') return null;

    const modelInstance = getProviderModel(provider, model, apiKey, baseURL);

    const result = await generateText({
      model: modelInstance,
      system: `Detect the language of the following text. Respond with only the ISO 639-1 language code (e.g., "en", "zh", "ja", "ko", "es", "fr", "de"). If uncertain, respond with "unknown".`,
      prompt: text.slice(0, 500),
      temperature: 0,
    });

    const detectedCode = result.text.trim().toLowerCase();

    if (
      detectedCode &&
      SUPPORTED_LANGUAGES.some((l) => l.code === detectedCode)
    ) {
      return {
        code: detectedCode as LanguageCode,
        confidence: 0.9,
      };
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Get language name by code
 */
export function getLanguageName(code: LanguageCode): string {
  const lang = SUPPORTED_LANGUAGES.find((l) => l.code === code);
  return lang ? lang.name : code;
}

/**
 * Get native language name by code
 */
export function getNativeLanguageName(code: LanguageCode): string {
  const lang = SUPPORTED_LANGUAGES.find((l) => l.code === code);
  return lang ? lang.nativeName : code;
}
