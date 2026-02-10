/**
 * Gemini API tokenizer for Google models
 * Uses the Gemini countTokens API for exact token counts
 * 
 * Reference: https://ai.google.dev/gemini-api/docs/tokens
 */

import type {
  Tokenizer,
  TokenizerProvider,
  TokenCountResult,
  TokenCountMessage,
  TokenCountOptions,
} from '@/types/system/tokenizer';
import { estimateTokensFast } from './base-tokenizer';
import { proxyFetch } from '@/lib/network/proxy-fetch';
import { loggers } from '@/lib/logger';

const log = loggers.ai;

const DEFAULT_GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta';
const DEFAULT_TIMEOUT = 5000;

interface GeminiCountTokensResponse {
  totalTokens: number;
  cachedContentTokenCount?: number;
}

interface GeminiContent {
  role: string;
  parts: Array<{ text: string }>;
}

/**
 * Gemini API tokenizer
 * Provides exact token counts using Google's countTokens API
 */
export class GeminiTokenizer implements Tokenizer {
  readonly provider: TokenizerProvider = 'gemini-api';
  readonly isRemote = true;

  private apiKey?: string;
  private baseUrl: string;
  private timeout: number;

  constructor(apiKey?: string, baseUrl?: string, timeout?: number) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl || DEFAULT_GEMINI_API_URL;
    this.timeout = timeout || DEFAULT_TIMEOUT;
  }

  async countTokens(content: string, options?: TokenCountOptions): Promise<TokenCountResult> {
    if (!content || content.length === 0) {
      return { tokens: 0, isExact: true, provider: this.provider };
    }

    const apiKey = options?.apiKey || this.apiKey;
    if (!apiKey) {
      // Fallback to estimation if no API key
      return {
        tokens: estimateTokensFast(content),
        isExact: false,
        provider: 'estimation',
        error: 'No Gemini API key provided',
      };
    }

    const model = options?.model || 'gemini-2.0-flash';
    const timeout = options?.timeout || this.timeout;

    try {
      const response = await this.callCountTokensAPI(apiKey, model, [content], timeout);
      return {
        tokens: response.totalTokens,
        isExact: true,
        provider: this.provider,
        model,
        cachedTokens: response.cachedContentTokenCount,
      };
    } catch (error) {
      log.warn('Gemini countTokens API failed', { error });
      return {
        tokens: estimateTokensFast(content),
        isExact: false,
        provider: 'estimation',
        error: error instanceof Error ? error.message : 'API call failed',
      };
    }
  }

  async countMessageTokens(
    messages: TokenCountMessage[],
    options?: TokenCountOptions
  ): Promise<TokenCountResult> {
    if (messages.length === 0) {
      return { tokens: 0, isExact: true, provider: this.provider };
    }

    const apiKey = options?.apiKey || this.apiKey;
    if (!apiKey) {
      // Fallback to estimation
      let totalTokens = 0;
      for (const msg of messages) {
        totalTokens += estimateTokensFast(msg.content) + 4;
      }
      return {
        tokens: totalTokens,
        isExact: false,
        provider: 'estimation',
        error: 'No Gemini API key provided',
      };
    }

    const model = options?.model || 'gemini-2.0-flash';
    const timeout = options?.timeout || this.timeout;

    try {
      // Convert messages to Gemini format
      const contents: GeminiContent[] = messages.map((msg) => ({
        role: msg.role === 'assistant' ? 'model' : msg.role,
        parts: [{ text: msg.content }],
      }));

      const response = await this.callCountTokensAPIWithContents(
        apiKey,
        model,
        contents,
        options?.systemInstruction,
        timeout
      );

      return {
        tokens: response.totalTokens,
        isExact: true,
        provider: this.provider,
        model,
        cachedTokens: response.cachedContentTokenCount,
      };
    } catch (error) {
      log.warn('Gemini countTokens API failed for messages', { error });
      let totalTokens = 0;
      for (const msg of messages) {
        totalTokens += estimateTokensFast(msg.content) + 4;
      }
      return {
        tokens: totalTokens,
        isExact: false,
        provider: 'estimation',
        error: error instanceof Error ? error.message : 'API call failed',
      };
    }
  }

  supportsModel(model: string): boolean {
    if (!model) return false;
    const modelLower = model.toLowerCase();
    return modelLower.includes('gemini');
  }

  private async callCountTokensAPI(
    apiKey: string,
    model: string,
    texts: string[],
    timeout: number
  ): Promise<GeminiCountTokensResponse> {
    const url = `${this.baseUrl}/models/${model}:countTokens?key=${apiKey}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await proxyFetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: texts.map((text) => ({
            parts: [{ text }],
          })),
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
      }

      return await response.json();
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private async callCountTokensAPIWithContents(
    apiKey: string,
    model: string,
    contents: GeminiContent[],
    systemInstruction?: string,
    timeout?: number
  ): Promise<GeminiCountTokensResponse> {
    const url = `${this.baseUrl}/models/${model}:countTokens?key=${apiKey}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout || this.timeout);

    try {
      const body: Record<string, unknown> = { contents };

      if (systemInstruction) {
        body.systemInstruction = {
          parts: [{ text: systemInstruction }],
        };
      }

      const response = await proxyFetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
      }

      return await response.json();
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

export const geminiTokenizer = new GeminiTokenizer();
