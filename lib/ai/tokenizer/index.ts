/**
 * Tokenizer Module - Multi-provider token counting
 * 
 * Exports:
 * - TokenizerRegistry: Main entry point for token counting
 * - Individual tokenizers for direct use
 * - Utility functions
 */

// Registry
export {
  TokenizerRegistry,
  getTokenizerRegistry,
  resetTokenizerRegistry,
  type TokenizerApiKeys,
} from './tokenizer-registry';

// Tokenizers
export { EstimationTokenizer, estimationTokenizer, estimateTokensFast, getEncodingForModel } from './base-tokenizer';
export { TiktokenTokenizer, tiktokenTokenizer, clearEncoderCache } from './tiktoken-tokenizer';
export { GeminiTokenizer, geminiTokenizer } from './gemini-tokenizer';
export { ClaudeTokenizer, claudeTokenizer } from './claude-tokenizer';
export { GLMTokenizer, glmTokenizer } from './glm-tokenizer';

// Re-export types for convenience
export type {
  Tokenizer,
  TokenizerProvider,
  TokenCountResult,
  TokenCountMessage,
  TokenCountOptions,
  TokenizerSettings,
  TiktokenEncoding,
} from '@/types/system/tokenizer';

export {
  DEFAULT_TOKENIZER_SETTINGS,
  getTokenizerForModel,
  MODEL_TOKENIZER_MAP,
  hashContent,
} from '@/types/system/tokenizer';
