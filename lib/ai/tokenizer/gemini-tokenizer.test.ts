/**
 * Tests for gemini-tokenizer.ts
 * Gemini API tokenizer for Google models
 */

import { GeminiTokenizer, geminiTokenizer } from './gemini-tokenizer';
import type { TokenCountMessage } from '@/types/system/tokenizer';

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('gemini-tokenizer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('GeminiTokenizer', () => {
    describe('properties', () => {
      it('should have provider set to gemini-api', () => {
        const tokenizer = new GeminiTokenizer();
        expect(tokenizer.provider).toBe('gemini-api');
      });

      it('should have isRemote set to true', () => {
        const tokenizer = new GeminiTokenizer();
        expect(tokenizer.isRemote).toBe(true);
      });
    });

    describe('constructor', () => {
      it('should accept API key', () => {
        const tokenizer = new GeminiTokenizer('test-key');
        expect(tokenizer).toBeDefined();
      });

      it('should accept custom base URL', () => {
        const tokenizer = new GeminiTokenizer('key', 'https://custom.api.com');
        expect(tokenizer).toBeDefined();
      });

      it('should accept custom timeout', () => {
        const tokenizer = new GeminiTokenizer('key', undefined, 10000);
        expect(tokenizer).toBeDefined();
      });
    });

    describe('countTokens', () => {
      it('should return 0 for empty content', async () => {
        const tokenizer = new GeminiTokenizer('test-key');
        const result = await tokenizer.countTokens('');
        
        expect(result.tokens).toBe(0);
        expect(result.isExact).toBe(true);
      });

      it('should call Gemini API with content', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ totalTokens: 15 }),
        });

        const tokenizer = new GeminiTokenizer('test-api-key');
        const result = await tokenizer.countTokens('Hello world');

        expect(result.tokens).toBe(15);
        expect(result.isExact).toBe(true);
        expect(result.provider).toBe('gemini-api');
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/models/gemini-2.0-flash:countTokens'),
          expect.objectContaining({ method: 'POST' })
        );
      });

      it('should include API key in URL', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ totalTokens: 5 }),
        });

        const tokenizer = new GeminiTokenizer('my-api-key');
        await tokenizer.countTokens('Test');

        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('key=my-api-key'),
          expect.any(Object)
        );
      });

      it('should use API key from options', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ totalTokens: 5 }),
        });

        const tokenizer = new GeminiTokenizer();
        await tokenizer.countTokens('Test', { apiKey: 'option-key' });

        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('key=option-key'),
          expect.any(Object)
        );
      });

      it('should fallback to estimation without API key', async () => {
        const tokenizer = new GeminiTokenizer();
        const result = await tokenizer.countTokens('Hello world');

        expect(result.isExact).toBe(false);
        expect(result.provider).toBe('estimation');
        expect(result.error).toContain('No Gemini API key');
        expect(mockFetch).not.toHaveBeenCalled();
      });

      it('should fallback on API error', async () => {
        mockFetch.mockResolvedValue({
          ok: false,
          status: 401,
          text: () => Promise.resolve('Unauthorized'),
        });

        const tokenizer = new GeminiTokenizer('bad-key');
        const result = await tokenizer.countTokens('Test');

        expect(result.isExact).toBe(false);
        expect(result.provider).toBe('estimation');
        expect(result.error).toContain('API error');
      });

      it('should use specified model', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ totalTokens: 5 }),
        });

        const tokenizer = new GeminiTokenizer('key');
        await tokenizer.countTokens('Test', { model: 'gemini-1.5-pro' });

        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/models/gemini-1.5-pro:countTokens'),
          expect.any(Object)
        );
      });

      it('should include cached token count if returned', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ 
            totalTokens: 20, 
            cachedContentTokenCount: 5 
          }),
        });

        const tokenizer = new GeminiTokenizer('key');
        const result = await tokenizer.countTokens('Test');

        expect(result.tokens).toBe(20);
        expect(result.cachedTokens).toBe(5);
      });
    });

    describe('countMessageTokens', () => {
      it('should return 0 for empty messages', async () => {
        const tokenizer = new GeminiTokenizer('key');
        const result = await tokenizer.countMessageTokens([]);
        
        expect(result.tokens).toBe(0);
        expect(result.isExact).toBe(true);
      });

      it('should call API with messages', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ totalTokens: 25 }),
        });

        const tokenizer = new GeminiTokenizer('test-key');
        const messages: TokenCountMessage[] = [
          { role: 'user', content: 'Hello' },
          { role: 'assistant', content: 'Hi there!' },
        ];

        const result = await tokenizer.countMessageTokens(messages);

        expect(result.tokens).toBe(25);
        expect(result.isExact).toBe(true);
      });

      it('should convert assistant role to model', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ totalTokens: 10 }),
        });

        const tokenizer = new GeminiTokenizer('key');
        const messages: TokenCountMessage[] = [
          { role: 'assistant', content: 'Hello' },
        ];

        await tokenizer.countMessageTokens(messages);

        const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
        expect(callBody.contents[0].role).toBe('model');
      });

      it('should include system instruction when provided', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ totalTokens: 15 }),
        });

        const tokenizer = new GeminiTokenizer('key');
        const messages: TokenCountMessage[] = [
          { role: 'user', content: 'Hello' },
        ];

        await tokenizer.countMessageTokens(messages, {
          systemInstruction: 'Be helpful',
        });

        const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
        expect(callBody.systemInstruction).toBeDefined();
        expect(callBody.systemInstruction.parts[0].text).toBe('Be helpful');
      });

      it('should fallback to estimation without API key', async () => {
        const tokenizer = new GeminiTokenizer();
        const messages: TokenCountMessage[] = [
          { role: 'user', content: 'Hello' },
        ];

        const result = await tokenizer.countMessageTokens(messages);

        expect(result.isExact).toBe(false);
        expect(result.provider).toBe('estimation');
      });

      it('should fallback on API error', async () => {
        mockFetch.mockRejectedValue(new Error('Network error'));

        const tokenizer = new GeminiTokenizer('key');
        const messages: TokenCountMessage[] = [
          { role: 'user', content: 'Test' },
        ];

        const result = await tokenizer.countMessageTokens(messages);

        expect(result.isExact).toBe(false);
        expect(result.provider).toBe('estimation');
      });
    });

    describe('supportsModel', () => {
      it('should return true for Gemini models', () => {
        const tokenizer = new GeminiTokenizer();
        
        expect(tokenizer.supportsModel('gemini-pro')).toBe(true);
        expect(tokenizer.supportsModel('gemini-1.5-pro')).toBe(true);
        expect(tokenizer.supportsModel('gemini-2.0-flash')).toBe(true);
        expect(tokenizer.supportsModel('Gemini-Pro-Vision')).toBe(true);
      });

      it('should return false for non-Gemini models', () => {
        const tokenizer = new GeminiTokenizer();
        
        expect(tokenizer.supportsModel('gpt-4')).toBe(false);
        expect(tokenizer.supportsModel('claude-3')).toBe(false);
        expect(tokenizer.supportsModel('llama-2')).toBe(false);
      });

      it('should return false for empty model', () => {
        const tokenizer = new GeminiTokenizer();
        expect(tokenizer.supportsModel('')).toBe(false);
      });
    });
  });

  describe('geminiTokenizer singleton', () => {
    it('should be an instance of GeminiTokenizer', () => {
      expect(geminiTokenizer).toBeInstanceOf(GeminiTokenizer);
    });

    it('should have gemini-api provider', () => {
      expect(geminiTokenizer.provider).toBe('gemini-api');
    });
  });
});
