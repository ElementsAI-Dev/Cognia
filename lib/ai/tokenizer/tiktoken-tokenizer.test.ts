/**
 * Tests for tiktoken-tokenizer.ts
 * Tiktoken-based tokenizer for OpenAI models
 */

import { TiktokenTokenizer, tiktokenTokenizer, clearEncoderCache } from './tiktoken-tokenizer';
import { getEncoding } from 'js-tiktoken';
import type { TokenCountMessage } from '@/types/system/tokenizer';

// Mock js-tiktoken
jest.mock('js-tiktoken', () => ({
  getEncoding: jest.fn(),
}));

const mockedGetEncoding = getEncoding as jest.MockedFunction<typeof getEncoding>;

describe('tiktoken-tokenizer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearEncoderCache();
  });

  describe('TiktokenTokenizer', () => {
    let tokenizer: TiktokenTokenizer;

    beforeEach(() => {
      tokenizer = new TiktokenTokenizer();
    });

    describe('properties', () => {
      it('should have provider set to tiktoken', () => {
        expect(tokenizer.provider).toBe('tiktoken');
      });

      it('should have isRemote set to false', () => {
        expect(tokenizer.isRemote).toBe(false);
      });
    });

    describe('countTokens', () => {
      it('should return 0 for empty content', async () => {
        const result = await tokenizer.countTokens('');
        expect(result.tokens).toBe(0);
        expect(result.isExact).toBe(true);
      });

      it('should count tokens using tiktoken', async () => {
        const mockEncoder = {
          encode: jest.fn().mockReturnValue([1, 2, 3, 4, 5]),
        };
        mockedGetEncoding.mockReturnValue(mockEncoder as never);

        const result = await tokenizer.countTokens('Hello world');

        expect(result.tokens).toBe(5);
        expect(result.isExact).toBe(true);
        expect(result.provider).toBe('tiktoken');
      });

      it('should fallback to estimation when encoder fails', async () => {
        mockedGetEncoding.mockImplementation(() => {
          throw new Error('Failed to load');
        });

        const result = await tokenizer.countTokens('Hello world');

        expect(result.isExact).toBe(false);
        expect(result.provider).toBe('estimation');
        expect(result.error).toBeDefined();
      });

      it('should fallback when encoding throws', async () => {
        const mockEncoder = {
          encode: jest.fn().mockImplementation(() => {
            throw new Error('Encoding error');
          }),
        };
        mockedGetEncoding.mockReturnValue(mockEncoder as never);

        const result = await tokenizer.countTokens('Test content');

        expect(result.isExact).toBe(false);
        expect(result.provider).toBe('estimation');
      });

      it('should use model-specific encoding', async () => {
        const mockEncoder = {
          encode: jest.fn().mockReturnValue([1, 2, 3]),
        };
        mockedGetEncoding.mockReturnValue(mockEncoder as never);

        await tokenizer.countTokens('Test', { model: 'gpt-4' });

        expect(mockedGetEncoding).toHaveBeenCalledWith('cl100k_base');
      });

      it('should cache encoders', async () => {
        const mockEncoder = { encode: jest.fn().mockReturnValue([1]) };
        mockedGetEncoding.mockReturnValue(mockEncoder as never);

        await tokenizer.countTokens('Test 1');
        await tokenizer.countTokens('Test 2');

        // Should only create encoder once due to caching
        expect(mockedGetEncoding).toHaveBeenCalledTimes(1);
      });
    });

    describe('countMessageTokens', () => {
      it('should count tokens for messages', async () => {
        const mockEncoder = {
          encode: jest.fn().mockReturnValue([1, 2]),
        };
        mockedGetEncoding.mockReturnValue(mockEncoder as never);

        const messages: TokenCountMessage[] = [
          { role: 'user', content: 'Hello' },
          { role: 'assistant', content: 'Hi' },
        ];

        const result = await tokenizer.countMessageTokens(messages);

        expect(result.tokens).toBeGreaterThan(0);
        expect(result.isExact).toBe(true);
      });

      it('should add overhead for message structure', async () => {
        const mockEncoder = {
          encode: jest.fn().mockReturnValue([1]),
        };
        mockedGetEncoding.mockReturnValue(mockEncoder as never);

        const messages: TokenCountMessage[] = [
          { role: 'user', content: 'Hi' },
        ];

        const result = await tokenizer.countMessageTokens(messages);

        // 1 token for content + 3 overhead + 3 priming = 7
        expect(result.tokens).toBe(7);
      });

      it('should count tokens for message names', async () => {
        const mockEncoder = {
          encode: jest.fn().mockReturnValue([1, 2]),
        };
        mockedGetEncoding.mockReturnValue(mockEncoder as never);

        const withoutName: TokenCountMessage[] = [
          { role: 'user', content: 'Hi' },
        ];
        const withName: TokenCountMessage[] = [
          { role: 'user', content: 'Hi', name: 'TestUser' },
        ];

        const withoutNameResult = await tokenizer.countMessageTokens(withoutName);
        const withNameResult = await tokenizer.countMessageTokens(withName);

        expect(withNameResult.tokens).toBeGreaterThan(withoutNameResult.tokens);
      });

      it('should fallback to estimation when encoder unavailable', async () => {
        mockedGetEncoding.mockImplementation(() => {
          throw new Error('No encoder');
        });

        const messages: TokenCountMessage[] = [
          { role: 'user', content: 'Hello' },
        ];

        const result = await tokenizer.countMessageTokens(messages);

        expect(result.isExact).toBe(false);
        expect(result.provider).toBe('estimation');
      });

      it('should handle encoding errors gracefully', async () => {
        const mockEncoder = {
          encode: jest.fn().mockImplementation(() => {
            throw new Error('Encode failed');
          }),
        };
        mockedGetEncoding.mockReturnValue(mockEncoder as never);

        const messages: TokenCountMessage[] = [
          { role: 'user', content: 'Test' },
        ];

        const result = await tokenizer.countMessageTokens(messages);

        expect(result.isExact).toBe(false);
        expect(result.provider).toBe('estimation');
      });
    });

    describe('supportsModel', () => {
      it('should return true for GPT models', () => {
        expect(tokenizer.supportsModel('gpt-4')).toBe(true);
        expect(tokenizer.supportsModel('gpt-4o')).toBe(true);
        expect(tokenizer.supportsModel('gpt-3.5-turbo')).toBe(true);
      });

      it('should return true for o1/o3 models', () => {
        expect(tokenizer.supportsModel('o1-preview')).toBe(true);
        expect(tokenizer.supportsModel('o3-mini')).toBe(true);
      });

      it('should return true for embedding models', () => {
        expect(tokenizer.supportsModel('text-embedding-ada-002')).toBe(true);
        expect(tokenizer.supportsModel('text-embedding-3-small')).toBe(true);
      });

      it('should return true for older models', () => {
        expect(tokenizer.supportsModel('davinci')).toBe(true);
        expect(tokenizer.supportsModel('curie')).toBe(true);
        expect(tokenizer.supportsModel('babbage')).toBe(true);
        expect(tokenizer.supportsModel('ada')).toBe(true);
      });

      it('should return false for non-OpenAI models', () => {
        expect(tokenizer.supportsModel('claude-3')).toBe(false);
        expect(tokenizer.supportsModel('gemini-pro')).toBe(false);
        expect(tokenizer.supportsModel('llama-2')).toBe(false);
      });

      it('should return false for empty model', () => {
        expect(tokenizer.supportsModel('')).toBe(false);
      });
    });

    describe('getEncodingForModel', () => {
      it('should return encoding for supported models', () => {
        expect(tokenizer.getEncodingForModel('gpt-4')).toBe('cl100k_base');
        expect(tokenizer.getEncodingForModel('gpt-4o')).toBe('o200k_base');
      });
    });
  });

  describe('clearEncoderCache', () => {
    it('should clear cached encoders', async () => {
      const mockEncoder = { encode: jest.fn().mockReturnValue([1]) };
      mockedGetEncoding.mockReturnValue(mockEncoder as never);

      const tokenizer = new TiktokenTokenizer();
      await tokenizer.countTokens('Test');

      clearEncoderCache();
      await tokenizer.countTokens('Test');

      // Should create encoder twice after cache clear
      expect(mockedGetEncoding).toHaveBeenCalledTimes(2);
    });
  });

  describe('tiktokenTokenizer singleton', () => {
    it('should be an instance of TiktokenTokenizer', () => {
      expect(tiktokenTokenizer).toBeInstanceOf(TiktokenTokenizer);
    });

    it('should have tiktoken provider', () => {
      expect(tiktokenTokenizer.provider).toBe('tiktoken');
    });
  });
});
