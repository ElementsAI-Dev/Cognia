/**
 * Claude API tokenizer for Anthropic models
 * Uses the Anthropic message counting API for exact token counts
 * 
 * Reference: https://docs.anthropic.com/en/docs/build-with-claude/token-counting
 */

import type {
  Tokenizer,
  TokenizerProvider,
  TokenCountResult,
  TokenCountMessage,
  TokenCountOptions,
} from '@/types/system/tokenizer';
import { proxyFetch } from '@/lib/network/proxy-fetch';
import { loggers } from '@/lib/logger';
// Note: Uses internal estimation method instead of base-tokenizer

const log = loggers.ai;

const DEFAULT_CLAUDE_API_URL = 'https://api.anthropic.com/v1';
const DEFAULT_TIMEOUT = 5000;

interface ClaudeCountTokensResponse {
  input_tokens: number;
}

interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * Claude API tokenizer
 * Provides exact token counts using Anthropic's token counting API
 */
export class ClaudeTokenizer implements Tokenizer {
  readonly provider: TokenizerProvider = 'claude-api';
  readonly isRemote = true;

  private apiKey?: string;
  private baseUrl: string;
  private timeout: number;

  constructor(apiKey?: string, baseUrl?: string, timeout?: number) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl || DEFAULT_CLAUDE_API_URL;
    this.timeout = timeout || DEFAULT_TIMEOUT;
  }

  async countTokens(content: string, options?: TokenCountOptions): Promise<TokenCountResult> {
    if (!content || content.length === 0) {
      return { tokens: 0, isExact: true, provider: this.provider };
    }

    const apiKey = options?.apiKey || this.apiKey;
    if (!apiKey) {
      // Fallback to Claude-specific estimation
      return {
        tokens: this.estimateClaudeTokens(content),
        isExact: false,
        provider: 'estimation',
        error: 'No Claude API key provided',
      };
    }

    const model = options?.model || 'claude-sonnet-4-20250514';
    const timeout = options?.timeout || this.timeout;

    try {
      // For single content, wrap in a user message
      const response = await this.callCountTokensAPI(
        apiKey,
        model,
        [{ role: 'user', content }],
        undefined,
        timeout
      );
      return {
        tokens: response.input_tokens,
        isExact: true,
        provider: this.provider,
        model,
      };
    } catch (error) {
      log.warn('Claude countTokens API failed', { error });
      return {
        tokens: this.estimateClaudeTokens(content),
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
        totalTokens += this.estimateClaudeTokens(msg.content) + 4;
      }
      return {
        tokens: totalTokens,
        isExact: false,
        provider: 'estimation',
        error: 'No Claude API key provided',
      };
    }

    const model = options?.model || 'claude-sonnet-4-20250514';
    const timeout = options?.timeout || this.timeout;

    try {
      // Convert messages to Claude format (filter out system messages)
      const claudeMessages: ClaudeMessage[] = messages
        .filter((msg) => msg.role !== 'system')
        .map((msg) => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        }));

      // Extract system message if present
      const systemMessage = messages.find((msg) => msg.role === 'system');
      const system = systemMessage?.content || options?.systemInstruction;

      const response = await this.callCountTokensAPI(
        apiKey,
        model,
        claudeMessages,
        system,
        timeout
      );

      return {
        tokens: response.input_tokens,
        isExact: true,
        provider: this.provider,
        model,
      };
    } catch (error) {
      log.warn('Claude countTokens API failed for messages', { error });
      let totalTokens = 0;
      for (const msg of messages) {
        totalTokens += this.estimateClaudeTokens(msg.content) + 4;
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
    return modelLower.includes('claude');
  }

  /**
   * Claude-specific token estimation
   * Claude uses a similar tokenization to GPT-4 but with slight differences
   */
  private estimateClaudeTokens(content: string): number {
    if (!content || content.length === 0) return 0;

    // Claude's tokenization averages ~3.5-4 characters per token for English
    let tokens = Math.ceil(content.length / 3.8);

    // Claude tends to tokenize code more granularly
    const codeBlockMatches = content.match(/```[\s\S]*?```/g);
    if (codeBlockMatches) {
      const codeLength = codeBlockMatches.reduce((sum, block) => sum + block.length, 0);
      tokens += Math.ceil(codeLength * 0.05); // 5% increase for code
    }

    // Add message overhead
    tokens += 3;

    return tokens;
  }

  private async callCountTokensAPI(
    apiKey: string,
    model: string,
    messages: ClaudeMessage[],
    system?: string,
    timeout?: number
  ): Promise<ClaudeCountTokensResponse> {
    const url = `${this.baseUrl}/messages/count_tokens`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout || this.timeout);

    try {
      const body: Record<string, unknown> = {
        model,
        messages,
      };

      if (system) {
        body.system = system;
      }

      const response = await proxyFetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Claude API error: ${response.status} - ${errorText}`);
      }

      return await response.json();
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

export const claudeTokenizer = new ClaudeTokenizer();
