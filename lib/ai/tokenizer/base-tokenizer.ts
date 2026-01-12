/**
 * Base tokenizer with estimation fallback
 * Provides fast local token estimation without API calls
 */

import type {
  Tokenizer,
  TokenizerProvider,
  TokenCountResult,
  TokenCountMessage,
  TokenCountOptions,
  TiktokenEncoding,
} from '@/types/system/tokenizer';

/**
 * Estimation-based tokenizer (fast fallback)
 * Uses character-based heuristics for approximate token counts
 */
export class EstimationTokenizer implements Tokenizer {
  readonly provider: TokenizerProvider = 'estimation';
  readonly isRemote = false;

  async countTokens(content: string, _options?: TokenCountOptions): Promise<TokenCountResult> {
    if (!content || content.length === 0) {
      return { tokens: 0, isExact: false, provider: this.provider };
    }

    const tokens = this.estimateTokens(content);
    return { tokens, isExact: false, provider: this.provider };
  }

  async countMessageTokens(
    messages: TokenCountMessage[],
    options?: TokenCountOptions
  ): Promise<TokenCountResult> {
    let totalTokens = 0;

    for (const message of messages) {
      const contentResult = await this.countTokens(message.content, options);
      totalTokens += contentResult.tokens;
      totalTokens += 4; // Message overhead (role, delimiters)
      
      if (message.name) {
        totalTokens += Math.ceil(message.name.length / 4);
      }
    }

    // Conversation priming overhead
    totalTokens += 3;

    return { tokens: totalTokens, isExact: false, provider: this.provider };
  }

  supportsModel(_model: string): boolean {
    return true; // Estimation works for any model
  }

  /**
   * Estimate tokens with content-aware adjustments
   */
  private estimateTokens(content: string): number {
    if (!content || content.length === 0) return 0;

    // Base estimation: ~4 characters per token for English
    let tokens = Math.ceil(content.length / 4);

    // Adjust for code content (more tokens per character)
    const codeBlockMatches = content.match(/```[\s\S]*?```/g);
    if (codeBlockMatches) {
      const codeLength = codeBlockMatches.reduce((sum, block) => sum + block.length, 0);
      // Code typically has ~3 chars per token
      tokens += Math.ceil(codeLength * (1 / 3 - 1 / 4));
    }

    // Adjust for JSON/structured content
    const jsonMatches = content.match(/\{[\s\S]*?\}/g);
    if (jsonMatches) {
      const jsonLength = jsonMatches.reduce((sum, block) => sum + block.length, 0);
      // JSON has many punctuation marks
      tokens += Math.ceil(jsonLength * 0.1);
    }

    // Adjust for CJK characters (Chinese/Japanese/Korean)
    // CJK characters typically tokenize as 1-2 tokens each
    const cjkMatches = content.match(/[\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af]/g);
    if (cjkMatches) {
      // CJK is about 1.5 tokens per character on average
      tokens += Math.ceil(cjkMatches.length * 0.5);
    }

    return tokens;
  }
}

/**
 * Fast estimation function (static utility)
 */
export function estimateTokensFast(content: string): number {
  if (!content || content.length === 0) return 0;
  // OpenAI's rule of thumb: 1 token ≈ 4 characters for English
  // Add 10% for special tokens and encoding overhead
  return Math.ceil((content.length / 4) * 1.1);
}

/**
 * Get tiktoken encoding for model
 */
export function getEncodingForModel(model?: string): TiktokenEncoding {
  if (!model) return 'o200k_base';

  const modelLower = model.toLowerCase();

  // GPT-4o and newer use o200k_base
  if (modelLower.includes('gpt-4o') || modelLower.includes('o1') || modelLower.includes('o3')) {
    return 'o200k_base';
  }

  // GPT-4, GPT-3.5-turbo use cl100k_base
  if (
    modelLower.includes('gpt-4') ||
    modelLower.includes('gpt-3.5') ||
    modelLower.includes('text-embedding')
  ) {
    return 'cl100k_base';
  }

  // Older models use p50k_base
  if (
    modelLower.includes('davinci') ||
    modelLower.includes('curie') ||
    modelLower.includes('babbage') ||
    modelLower.includes('ada')
  ) {
    return 'p50k_base';
  }

  // Default to newest encoding
  return 'o200k_base';
}

export const estimationTokenizer = new EstimationTokenizer();
