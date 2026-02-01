/**
 * Tiktoken-based tokenizer for OpenAI models
 * Provides accurate local token counting using js-tiktoken
 */

import { getEncoding, type Tiktoken } from 'js-tiktoken';
import type {
  Tokenizer,
  TokenizerProvider,
  TokenCountResult,
  TokenCountMessage,
  TokenCountOptions,
  TiktokenEncoding,
} from '@/types/system/tokenizer';
import { estimateTokensFast, getEncodingForModel } from './base-tokenizer';
import { loggers } from '@/lib/logger';

const log = loggers.ai;

// Encoder cache for different encodings
const encoderCache: Map<TiktokenEncoding, Tiktoken> = new Map();

/**
 * Get or create a tiktoken encoder for the specified encoding
 */
function getTiktokenEncoder(encoding: TiktokenEncoding = 'o200k_base'): Tiktoken | null {
  try {
    if (!encoderCache.has(encoding)) {
      const encoder = getEncoding(encoding);
      encoderCache.set(encoding, encoder);
    }
    return encoderCache.get(encoding) || null;
  } catch (error) {
    log.warn(`Failed to get tiktoken encoder for ${encoding}`, { error });
    return null;
  }
}

/**
 * Clear encoder cache (useful for testing or memory management)
 */
export function clearEncoderCache(): void {
  encoderCache.clear();
}

/**
 * Tiktoken tokenizer for OpenAI models
 */
export class TiktokenTokenizer implements Tokenizer {
  readonly provider: TokenizerProvider = 'tiktoken';
  readonly isRemote = false;

  private encoding: TiktokenEncoding;

  constructor(encoding: TiktokenEncoding = 'o200k_base') {
    this.encoding = encoding;
  }

  async countTokens(content: string, options?: TokenCountOptions): Promise<TokenCountResult> {
    if (!content || content.length === 0) {
      return { tokens: 0, isExact: true, provider: this.provider, encoding: this.encoding };
    }

    const encoding = options?.model ? getEncodingForModel(options.model) : this.encoding;
    const encoder = getTiktokenEncoder(encoding);

    if (!encoder) {
      // Fallback to estimation
      return {
        tokens: estimateTokensFast(content),
        isExact: false,
        provider: 'estimation',
        error: 'Failed to initialize tiktoken encoder',
      };
    }

    try {
      const tokens = encoder.encode(content);
      return {
        tokens: tokens.length,
        isExact: true,
        provider: this.provider,
        encoding,
        model: options?.model,
      };
    } catch (error) {
      log.warn('Tiktoken encoding failed, falling back to estimation', { error });
      return {
        tokens: estimateTokensFast(content),
        isExact: false,
        provider: 'estimation',
        error: error instanceof Error ? error.message : 'Encoding failed',
      };
    }
  }

  async countMessageTokens(
    messages: TokenCountMessage[],
    options?: TokenCountOptions
  ): Promise<TokenCountResult> {
    const encoding = options?.model ? getEncodingForModel(options.model) : this.encoding;
    const encoder = getTiktokenEncoder(encoding);

    if (!encoder) {
      // Fallback to estimation
      let totalTokens = 0;
      for (const msg of messages) {
        totalTokens += estimateTokensFast(msg.content) + 4;
      }
      totalTokens += 3; // Priming
      return {
        tokens: totalTokens,
        isExact: false,
        provider: 'estimation',
        error: 'Failed to initialize tiktoken encoder',
      };
    }

    try {
      let numTokens = 0;

      for (const message of messages) {
        // Every message follows <|start|>{role/name}\n{content}<|end|>\n
        numTokens += 3; // <|start|>, role, <|end|>
        numTokens += encoder.encode(message.content).length;

        if (message.name) {
          numTokens += encoder.encode(message.name).length;
          numTokens += 1; // role is always required and name is additional
        }
      }

      // Every reply is primed with <|start|>assistant<|message|>
      numTokens += 3;

      return {
        tokens: numTokens,
        isExact: true,
        provider: this.provider,
        encoding,
        model: options?.model,
      };
    } catch (error) {
      log.warn('Tiktoken message counting failed', { error });
      let totalTokens = 0;
      for (const msg of messages) {
        totalTokens += estimateTokensFast(msg.content) + 4;
      }
      totalTokens += 3;
      return {
        tokens: totalTokens,
        isExact: false,
        provider: 'estimation',
        error: error instanceof Error ? error.message : 'Encoding failed',
      };
    }
  }

  supportsModel(model: string): boolean {
    if (!model) return false;
    const modelLower = model.toLowerCase();
    return (
      modelLower.includes('gpt') ||
      modelLower.includes('o1') ||
      modelLower.includes('o3') ||
      modelLower.includes('text-embedding') ||
      modelLower.includes('davinci') ||
      modelLower.includes('curie') ||
      modelLower.includes('babbage') ||
      modelLower.includes('ada')
    );
  }

  getEncodingForModel(model: string): TiktokenEncoding | undefined {
    return getEncodingForModel(model);
  }
}

export const tiktokenTokenizer = new TiktokenTokenizer();
