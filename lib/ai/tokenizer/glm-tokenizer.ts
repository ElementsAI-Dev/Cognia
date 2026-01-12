/**
 * GLM API tokenizer for Zhipu models
 * Uses the Zhipu tokenizer API for exact token counts
 * 
 * Reference: https://docs.z.ai/api-reference/tools/tokenizer
 */

import type {
  Tokenizer,
  TokenizerProvider,
  TokenCountResult,
  TokenCountMessage,
  TokenCountOptions,
} from '@/types/system/tokenizer';
// Note: Uses internal estimation method optimized for Chinese

const DEFAULT_GLM_API_URL = 'https://api.z.ai/api/paas/v4';
const DEFAULT_TIMEOUT = 5000;

interface GLMTokenizerResponse {
  id: string;
  usage: {
    prompt_tokens: number;
    image_tokens?: number;
    video_tokens?: number;
    total_tokens: number;
  };
  created: number;
  request_id?: string;
}

interface GLMMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

/**
 * GLM API tokenizer for Zhipu models
 * Provides exact token counts using Zhipu's tokenizer API
 */
export class GLMTokenizer implements Tokenizer {
  readonly provider: TokenizerProvider = 'glm-api';
  readonly isRemote = true;

  private apiKey?: string;
  private baseUrl: string;
  private timeout: number;

  constructor(apiKey?: string, baseUrl?: string, timeout?: number) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl || DEFAULT_GLM_API_URL;
    this.timeout = timeout || DEFAULT_TIMEOUT;
  }

  async countTokens(content: string, options?: TokenCountOptions): Promise<TokenCountResult> {
    if (!content || content.length === 0) {
      return { tokens: 0, isExact: true, provider: this.provider };
    }

    const apiKey = options?.apiKey || this.apiKey;
    if (!apiKey) {
      // Fallback to estimation
      return {
        tokens: this.estimateGLMTokens(content),
        isExact: false,
        provider: 'estimation',
        error: 'No GLM API key provided',
      };
    }

    const model = options?.model || 'glm-4.6';
    const timeout = options?.timeout || this.timeout;

    try {
      // For single content, wrap in a user message
      const response = await this.callTokenizerAPI(
        apiKey,
        model,
        [{ role: 'user', content }],
        timeout
      );
      return {
        tokens: response.usage.total_tokens,
        isExact: true,
        provider: this.provider,
        model,
        imageTokens: response.usage.image_tokens,
        videoTokens: response.usage.video_tokens,
      };
    } catch (error) {
      console.warn('GLM tokenizer API failed:', error);
      return {
        tokens: this.estimateGLMTokens(content),
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
        totalTokens += this.estimateGLMTokens(msg.content) + 4;
      }
      return {
        tokens: totalTokens,
        isExact: false,
        provider: 'estimation',
        error: 'No GLM API key provided',
      };
    }

    const model = options?.model || 'glm-4.6';
    const timeout = options?.timeout || this.timeout;

    try {
      // Convert messages to GLM format
      const glmMessages: GLMMessage[] = messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      const response = await this.callTokenizerAPI(apiKey, model, glmMessages, timeout);

      return {
        tokens: response.usage.total_tokens,
        isExact: true,
        provider: this.provider,
        model,
        imageTokens: response.usage.image_tokens,
        videoTokens: response.usage.video_tokens,
      };
    } catch (error) {
      console.warn('GLM tokenizer API failed for messages:', error);
      let totalTokens = 0;
      for (const msg of messages) {
        totalTokens += this.estimateGLMTokens(msg.content) + 4;
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
    return modelLower.includes('glm') || modelLower.includes('chatglm');
  }

  /**
   * GLM-specific token estimation
   * GLM uses a custom tokenizer optimized for Chinese
   */
  private estimateGLMTokens(content: string): number {
    if (!content || content.length === 0) return 0;

    // Base estimation
    let tokens = 0;

    // Count CJK characters (Chinese, Japanese, Korean)
    const cjkMatches = content.match(/[\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af]/g);
    const cjkCount = cjkMatches ? cjkMatches.length : 0;

    // Count non-CJK characters
    const nonCjkLength = content.length - cjkCount;

    // CJK characters: ~1.5-2 tokens per character on average
    tokens += Math.ceil(cjkCount * 1.7);

    // Non-CJK: ~4 characters per token (similar to English)
    tokens += Math.ceil(nonCjkLength / 4);

    // Message overhead
    tokens += 4;

    return tokens;
  }

  private async callTokenizerAPI(
    apiKey: string,
    model: string,
    messages: GLMMessage[],
    timeout: number
  ): Promise<GLMTokenizerResponse> {
    const url = `${this.baseUrl}/tokenizer`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`GLM API error: ${response.status} - ${errorText}`);
      }

      return await response.json();
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

export const glmTokenizer = new GLMTokenizer();
