/**
 * Tests for glm-tokenizer.ts
 * GLM API tokenizer for Zhipu models
 */

import { GLMTokenizer, glmTokenizer } from './glm-tokenizer';
import type { TokenCountMessage } from '@/types/system/tokenizer';

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('glm-tokenizer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('GLMTokenizer', () => {
    describe('properties', () => {
      it('should have provider set to glm-api', () => {
        const tokenizer = new GLMTokenizer();
        expect(tokenizer.provider).toBe('glm-api');
      });

      it('should have isRemote set to true', () => {
        const tokenizer = new GLMTokenizer();
        expect(tokenizer.isRemote).toBe(true);
      });
    });

    describe('constructor', () => {
      it('should accept API key', () => {
        const tokenizer = new GLMTokenizer('test-key');
        expect(tokenizer).toBeDefined();
      });

      it('should accept custom base URL', () => {
        const tokenizer = new GLMTokenizer('key', 'https://custom.api.com');
        expect(tokenizer).toBeDefined();
      });

      it('should accept custom timeout', () => {
        const tokenizer = new GLMTokenizer('key', undefined, 10000);
        expect(tokenizer).toBeDefined();
      });
    });

    describe('countTokens', () => {
      it('should return 0 for empty content', async () => {
        const tokenizer = new GLMTokenizer('test-key');
        const result = await tokenizer.countTokens('');
        
        expect(result.tokens).toBe(0);
        expect(result.isExact).toBe(true);
      });

      it('should call GLM API with content', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({
            id: 'test-id',
            usage: { prompt_tokens: 10, total_tokens: 12 },
            created: Date.now(),
          }),
        });

        const tokenizer = new GLMTokenizer('test-api-key');
        const result = await tokenizer.countTokens('Hello world');

        expect(result.tokens).toBe(12);
        expect(result.isExact).toBe(true);
        expect(result.provider).toBe('glm-api');
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/tokenizer'),
          expect.objectContaining({
            method: 'POST',
            headers: expect.objectContaining({
              Authorization: 'Bearer test-api-key',
            }),
          })
        );
      });

      it('should use API key from options', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({
            id: 'id',
            usage: { prompt_tokens: 5, total_tokens: 5 },
            created: Date.now(),
          }),
        });

        const tokenizer = new GLMTokenizer();
        await tokenizer.countTokens('Test', { apiKey: 'option-key' });

        expect(mockFetch).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            headers: expect.objectContaining({
              Authorization: 'Bearer option-key',
            }),
          })
        );
      });

      it('should fallback to estimation without API key', async () => {
        const tokenizer = new GLMTokenizer();
        const result = await tokenizer.countTokens('Hello world');

        expect(result.isExact).toBe(false);
        expect(result.provider).toBe('estimation');
        expect(result.error).toContain('No GLM API key');
        expect(mockFetch).not.toHaveBeenCalled();
      });

      it('should fallback on API error', async () => {
        mockFetch.mockResolvedValue({
          ok: false,
          status: 401,
          text: () => Promise.resolve('Unauthorized'),
        });

        const tokenizer = new GLMTokenizer('bad-key');
        const result = await tokenizer.countTokens('Test');

        expect(result.isExact).toBe(false);
        expect(result.provider).toBe('estimation');
        expect(result.error).toContain('API error');
      });

      it('should use specified model', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({
            id: 'id',
            usage: { prompt_tokens: 5, total_tokens: 5 },
            created: Date.now(),
          }),
        });

        const tokenizer = new GLMTokenizer('key');
        await tokenizer.countTokens('Test', { model: 'glm-4' });

        const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
        expect(callBody.model).toBe('glm-4');
      });

      it('should include image and video tokens if returned', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({
            id: 'id',
            usage: { 
              prompt_tokens: 10, 
              image_tokens: 100,
              video_tokens: 200,
              total_tokens: 310 
            },
            created: Date.now(),
          }),
        });

        const tokenizer = new GLMTokenizer('key');
        const result = await tokenizer.countTokens('Test with media');

        expect(result.tokens).toBe(310);
        expect(result.imageTokens).toBe(100);
        expect(result.videoTokens).toBe(200);
      });
    });

    describe('countMessageTokens', () => {
      it('should return 0 for empty messages', async () => {
        const tokenizer = new GLMTokenizer('key');
        const result = await tokenizer.countMessageTokens([]);
        
        expect(result.tokens).toBe(0);
        expect(result.isExact).toBe(true);
      });

      it('should call API with messages', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({
            id: 'id',
            usage: { prompt_tokens: 20, total_tokens: 25 },
            created: Date.now(),
          }),
        });

        const tokenizer = new GLMTokenizer('test-key');
        const messages: TokenCountMessage[] = [
          { role: 'user', content: 'Hello' },
          { role: 'assistant', content: 'Hi there!' },
        ];

        const result = await tokenizer.countMessageTokens(messages);

        expect(result.tokens).toBe(25);
        expect(result.isExact).toBe(true);
      });

      it('should include system message', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({
            id: 'id',
            usage: { prompt_tokens: 15, total_tokens: 15 },
            created: Date.now(),
          }),
        });

        const tokenizer = new GLMTokenizer('key');
        const messages: TokenCountMessage[] = [
          { role: 'system', content: 'You are helpful' },
          { role: 'user', content: 'Hello' },
        ];

        await tokenizer.countMessageTokens(messages);

        const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
        expect(callBody.messages).toHaveLength(2);
        expect(callBody.messages[0].role).toBe('system');
      });

      it('should fallback to estimation without API key', async () => {
        const tokenizer = new GLMTokenizer();
        const messages: TokenCountMessage[] = [
          { role: 'user', content: 'Hello' },
        ];

        const result = await tokenizer.countMessageTokens(messages);

        expect(result.isExact).toBe(false);
        expect(result.provider).toBe('estimation');
      });

      it('should fallback on API error', async () => {
        mockFetch.mockRejectedValue(new Error('Network error'));

        const tokenizer = new GLMTokenizer('key');
        const messages: TokenCountMessage[] = [
          { role: 'user', content: 'Test' },
        ];

        const result = await tokenizer.countMessageTokens(messages);

        expect(result.isExact).toBe(false);
        expect(result.provider).toBe('estimation');
      });
    });

    describe('supportsModel', () => {
      it('should return true for GLM models', () => {
        const tokenizer = new GLMTokenizer();
        
        expect(tokenizer.supportsModel('glm-4')).toBe(true);
        expect(tokenizer.supportsModel('glm-4.6')).toBe(true);
        expect(tokenizer.supportsModel('chatglm-6b')).toBe(true);
        expect(tokenizer.supportsModel('GLM-4-Flash')).toBe(true);
      });

      it('should return false for non-GLM models', () => {
        const tokenizer = new GLMTokenizer();
        
        expect(tokenizer.supportsModel('gpt-4')).toBe(false);
        expect(tokenizer.supportsModel('claude-3')).toBe(false);
        expect(tokenizer.supportsModel('gemini-pro')).toBe(false);
      });

      it('should return false for empty model', () => {
        const tokenizer = new GLMTokenizer();
        expect(tokenizer.supportsModel('')).toBe(false);
      });
    });

    describe('GLM-specific estimation', () => {
      it('should estimate tokens for Chinese text', async () => {
        const tokenizer = new GLMTokenizer();
        const chineseText = '你好世界';
        const result = await tokenizer.countTokens(chineseText);

        expect(result.tokens).toBeGreaterThan(0);
        expect(result.isExact).toBe(false);
      });

      it('should estimate more tokens for CJK characters', async () => {
        const tokenizer = new GLMTokenizer();
        const chinese = '你好';
        const english = 'Hi';

        const chineseResult = await tokenizer.countTokens(chinese);
        const englishResult = await tokenizer.countTokens(english);

        // Chinese should have more tokens due to CJK multiplier
        expect(chineseResult.tokens).toBeGreaterThanOrEqual(englishResult.tokens);
      });

      it('should handle mixed content', async () => {
        const tokenizer = new GLMTokenizer();
        const mixedText = 'Hello 你好 World 世界';

        const result = await tokenizer.countTokens(mixedText);

        expect(result.tokens).toBeGreaterThan(0);
        expect(result.isExact).toBe(false);
      });

      it('should return 0 for empty content', async () => {
        const tokenizer = new GLMTokenizer();
        // Test internal estimation directly
        const result = await tokenizer.countTokens('');

        expect(result.tokens).toBe(0);
      });
    });
  });

  describe('glmTokenizer singleton', () => {
    it('should be an instance of GLMTokenizer', () => {
      expect(glmTokenizer).toBeInstanceOf(GLMTokenizer);
    });

    it('should have glm-api provider', () => {
      expect(glmTokenizer.provider).toBe('glm-api');
    });
  });
});
