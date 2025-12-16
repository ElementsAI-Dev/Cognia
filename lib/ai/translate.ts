/**
 * Translation utilities using AI
 */

// Translation utilities - uses direct fetch for simplicity

export interface TranslationResult {
  success: boolean;
  translatedText?: string;
  sourceLanguage?: string;
  targetLanguage: string;
  error?: string;
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
  _provider = 'openai',
  model: string = 'gpt-4o-mini'
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

    // For now, use a simple fetch-based approach
    // In production, this would use the AI SDK with proper provider selection
    const apiKey = localStorage.getItem('openai_api_key');
    if (!apiKey) {
      return {
        success: false,
        targetLanguage,
        error: 'OpenAI API key not configured',
      };
    }

    const systemPrompt = `You are a professional translator. Translate the following text to ${targetLangInfo.name} (${targetLangInfo.nativeName}). 
Only output the translated text, nothing else. Preserve the original formatting, including line breaks and paragraphs.
If the text is already in the target language, return it as is.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: text },
        ],
        temperature: 0.3,
        max_tokens: 4096,
      }),
    });

    if (!response.ok) {
      return {
        success: false,
        targetLanguage,
        error: `API error: ${response.status}`,
      };
    }

    const data = await response.json();
    const translatedText = data.choices?.[0]?.message?.content?.trim();

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
  _provider = 'openai',
  model: string = 'gpt-4o-mini'
): Promise<{ code: LanguageCode; confidence: number } | null> {
  try {
    const apiKey = localStorage.getItem('openai_api_key');
    if (!apiKey) return null;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content: `Detect the language of the following text. Respond with only the ISO 639-1 language code (e.g., "en", "zh", "ja", "ko", "es", "fr", "de"). If uncertain, respond with "unknown".`,
          },
          { role: 'user', content: text.slice(0, 500) },
        ],
        temperature: 0,
        max_tokens: 10,
      }),
    });

    if (!response.ok) return null;

    const data = await response.json();
    const detectedCode = data.choices?.[0]?.message?.content
      ?.trim()
      .toLowerCase();

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
