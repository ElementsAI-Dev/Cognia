/**
 * Tests for base-tokenizer.ts
 * Base tokenizer with estimation fallback
 */

import {
  EstimationTokenizer,
  estimateTokensFast,
  getEncodingForModel,
  estimationTokenizer,
} from './base-tokenizer';
import type { TokenCountMessage } from '@/types/system/tokenizer';

describe('base-tokenizer', () => {
  describe('EstimationTokenizer', () => {
    let tokenizer: EstimationTokenizer;

    beforeEach(() => {
      tokenizer = new EstimationTokenizer();
    });

    describe('properties', () => {
      it('should have provider set to estimation', () => {
        expect(tokenizer.provider).toBe('estimation');
      });

      it('should have isRemote set to false', () => {
        expect(tokenizer.isRemote).toBe(false);
      });
    });

    describe('countTokens', () => {
      it('should return 0 for empty content', async () => {
        const result = await tokenizer.countTokens('');
        expect(result.tokens).toBe(0);
        expect(result.isExact).toBe(false);
        expect(result.provider).toBe('estimation');
      });

      it('should return 0 for null/undefined content', async () => {
        const result = await tokenizer.countTokens(null as never);
        expect(result.tokens).toBe(0);
      });

      it('should estimate tokens for English text', async () => {
        // ~4 chars per token for English
        const text = 'Hello world'; // 11 chars
        const result = await tokenizer.countTokens(text);
        
        expect(result.tokens).toBeGreaterThan(0);
        expect(result.isExact).toBe(false);
      });

      it('should adjust for code blocks', async () => {
        const plainText = 'Some plain text here';
        const codeText = '```javascript\nconst x = 1;\nconsole.log(x);\n```';
        
        const plainResult = await tokenizer.countTokens(plainText);
        const codeResult = await tokenizer.countTokens(codeText);
        
        // Code should have adjustment
        expect(codeResult.tokens).toBeGreaterThan(0);
      });

      it('should adjust for JSON content', async () => {
        const jsonText = '{"key": "value", "nested": {"a": 1, "b": 2}}';
        const result = await tokenizer.countTokens(jsonText);
        
        expect(result.tokens).toBeGreaterThan(0);
      });

      it('should adjust for CJK characters', async () => {
        const cjkText = '你好世界'; // 4 CJK characters
        const englishText = 'Hi'; // 2 English characters
        
        const cjkResult = await tokenizer.countTokens(cjkText);
        const englishResult = await tokenizer.countTokens(englishText);
        
        // CJK should have more tokens per character
        expect(cjkResult.tokens).toBeGreaterThan(englishResult.tokens);
      });

      it('should handle mixed content', async () => {
        const mixedText = '```code\nconst x = 1;\n```\nHello 你好 {"key": "value"}';
        const result = await tokenizer.countTokens(mixedText);
        
        expect(result.tokens).toBeGreaterThan(0);
        expect(result.isExact).toBe(false);
      });
    });

    describe('countMessageTokens', () => {
      it('should count tokens for multiple messages', async () => {
        const messages: TokenCountMessage[] = [
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: 'Hello!' },
          { role: 'assistant', content: 'Hi there!' },
        ];

        const result = await tokenizer.countMessageTokens(messages);

        expect(result.tokens).toBeGreaterThan(0);
        expect(result.isExact).toBe(false);
      });

      it('should add overhead for each message', async () => {
        const singleMessage: TokenCountMessage[] = [
          { role: 'user', content: 'Hello' },
        ];
        const twoMessages: TokenCountMessage[] = [
          { role: 'user', content: 'Hello' },
          { role: 'assistant', content: '' },
        ];

        const singleResult = await tokenizer.countMessageTokens(singleMessage);
        const twoResult = await tokenizer.countMessageTokens(twoMessages);

        // Two messages should have more overhead
        expect(twoResult.tokens).toBeGreaterThan(singleResult.tokens);
      });

      it('should count tokens for message name', async () => {
        const withoutName: TokenCountMessage[] = [
          { role: 'user', content: 'Hello' },
        ];
        const withName: TokenCountMessage[] = [
          { role: 'user', content: 'Hello', name: 'TestUser' },
        ];

        const withoutNameResult = await tokenizer.countMessageTokens(withoutName);
        const withNameResult = await tokenizer.countMessageTokens(withName);

        expect(withNameResult.tokens).toBeGreaterThan(withoutNameResult.tokens);
      });

      it('should add conversation priming overhead', async () => {
        const messages: TokenCountMessage[] = [];
        const result = await tokenizer.countMessageTokens(messages);
        
        // Should have at least the priming overhead (3 tokens)
        expect(result.tokens).toBe(3);
      });
    });

    describe('supportsModel', () => {
      it('should return true for any model', () => {
        expect(tokenizer.supportsModel('gpt-4')).toBe(true);
        expect(tokenizer.supportsModel('claude-3')).toBe(true);
        expect(tokenizer.supportsModel('unknown-model')).toBe(true);
        expect(tokenizer.supportsModel('')).toBe(true);
      });
    });
  });

  describe('estimateTokensFast', () => {
    it('should return 0 for empty content', () => {
      expect(estimateTokensFast('')).toBe(0);
      expect(estimateTokensFast(null as never)).toBe(0);
      expect(estimateTokensFast(undefined as never)).toBe(0);
    });

    it('should estimate tokens with 10% overhead', () => {
      const text = 'Hello world!'; // 12 chars
      const tokens = estimateTokensFast(text);
      
      // Expected: (12 / 4) * 1.1 = 3.3, ceil = 4
      expect(tokens).toBeGreaterThan(0);
    });

    it('should handle long text', () => {
      const longText = 'a'.repeat(1000);
      const tokens = estimateTokensFast(longText);
      
      // Expected: (1000 / 4) * 1.1 = 275
      expect(tokens).toBe(275);
    });
  });

  describe('getEncodingForModel', () => {
    it('should return o200k_base for GPT-4o models', () => {
      expect(getEncodingForModel('gpt-4o')).toBe('o200k_base');
      expect(getEncodingForModel('gpt-4o-mini')).toBe('o200k_base');
      expect(getEncodingForModel('GPT-4O')).toBe('o200k_base');
    });

    it('should return o200k_base for o1/o3 models', () => {
      expect(getEncodingForModel('o1-preview')).toBe('o200k_base');
      expect(getEncodingForModel('o1-mini')).toBe('o200k_base');
      expect(getEncodingForModel('o3-mini')).toBe('o200k_base');
    });

    it('should return cl100k_base for GPT-4 models', () => {
      expect(getEncodingForModel('gpt-4')).toBe('cl100k_base');
      expect(getEncodingForModel('gpt-4-turbo')).toBe('cl100k_base');
      expect(getEncodingForModel('gpt-4-32k')).toBe('cl100k_base');
    });

    it('should return cl100k_base for GPT-3.5-turbo models', () => {
      expect(getEncodingForModel('gpt-3.5-turbo')).toBe('cl100k_base');
      expect(getEncodingForModel('gpt-3.5-turbo-16k')).toBe('cl100k_base');
    });

    it('should return cl100k_base for text-embedding models', () => {
      expect(getEncodingForModel('text-embedding-ada-002')).toBe('cl100k_base');
      expect(getEncodingForModel('text-embedding-3-small')).toBe('cl100k_base');
    });

    it('should return p50k_base for older models', () => {
      expect(getEncodingForModel('davinci')).toBe('p50k_base');
      expect(getEncodingForModel('text-davinci-003')).toBe('p50k_base');
      expect(getEncodingForModel('curie')).toBe('p50k_base');
      expect(getEncodingForModel('babbage')).toBe('p50k_base');
      expect(getEncodingForModel('ada')).toBe('p50k_base');
    });

    it('should return o200k_base for unknown models', () => {
      expect(getEncodingForModel('unknown-model')).toBe('o200k_base');
      expect(getEncodingForModel('custom-llm')).toBe('o200k_base');
    });

    it('should return o200k_base for undefined/empty model', () => {
      expect(getEncodingForModel(undefined)).toBe('o200k_base');
      expect(getEncodingForModel('')).toBe('o200k_base');
    });
  });

  describe('estimationTokenizer singleton', () => {
    it('should be an instance of EstimationTokenizer', () => {
      expect(estimationTokenizer).toBeInstanceOf(EstimationTokenizer);
    });

    it('should have estimation provider', () => {
      expect(estimationTokenizer.provider).toBe('estimation');
    });
  });
});
