/**
 * Tests for claude-tokenizer.ts
 * Claude API tokenizer for Anthropic models
 */

import { ClaudeTokenizer, claudeTokenizer } from './claude-tokenizer';
import type { TokenCountMessage } from '@/types/system/tokenizer';

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('claude-tokenizer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('ClaudeTokenizer', () => {
    describe('properties', () => {
      it('should have provider set to claude-api', () => {
        const tokenizer = new ClaudeTokenizer();
        expect(tokenizer.provider).toBe('claude-api');
      });

      it('should have isRemote set to true', () => {
        const tokenizer = new ClaudeTokenizer();
        expect(tokenizer.isRemote).toBe(true);
      });
    });

    describe('constructor', () => {
      it('should accept API key', () => {
        const tokenizer = new ClaudeTokenizer('test-key');
        expect(tokenizer).toBeDefined();
      });

      it('should accept custom base URL', () => {
        const tokenizer = new ClaudeTokenizer('key', 'https://custom.api.com');
        expect(tokenizer).toBeDefined();
      });

      it('should accept custom timeout', () => {
        const tokenizer = new ClaudeTokenizer('key', undefined, 10000);
        expect(tokenizer).toBeDefined();
      });
    });

    describe('countTokens', () => {
      it('should return 0 for empty content', async () => {
        const tokenizer = new ClaudeTokenizer('test-key');
        const result = await tokenizer.countTokens('');
        
        expect(result.tokens).toBe(0);
        expect(result.isExact).toBe(true);
      });

      it('should call Claude API with content', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ input_tokens: 10 }),
        });

        const tokenizer = new ClaudeTokenizer('test-api-key');
        const result = await tokenizer.countTokens('Hello world');

        expect(result.tokens).toBe(10);
        expect(result.isExact).toBe(true);
        expect(result.provider).toBe('claude-api');
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/messages/count_tokens'),
          expect.objectContaining({
            method: 'POST',
            headers: expect.objectContaining({
              'x-api-key': 'test-api-key',
            }),
          })
        );
      });

      it('should use API key from options', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ input_tokens: 5 }),
        });

        const tokenizer = new ClaudeTokenizer();
        await tokenizer.countTokens('Test', { apiKey: 'option-key' });

        expect(mockFetch).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            headers: expect.objectContaining({
              'x-api-key': 'option-key',
            }),
          })
        );
      });

      it('should fallback to estimation without API key', async () => {
        const tokenizer = new ClaudeTokenizer();
        const result = await tokenizer.countTokens('Hello world');

        expect(result.isExact).toBe(false);
        expect(result.provider).toBe('estimation');
        expect(result.error).toContain('No Claude API key');
        expect(mockFetch).not.toHaveBeenCalled();
      });

      it('should fallback on API error', async () => {
        mockFetch.mockResolvedValue({
          ok: false,
          status: 401,
          text: () => Promise.resolve('Unauthorized'),
        });

        const tokenizer = new ClaudeTokenizer('bad-key');
        const result = await tokenizer.countTokens('Test');

        expect(result.isExact).toBe(false);
        expect(result.provider).toBe('estimation');
        expect(result.error).toContain('API error');
      });

      it('should use specified model', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ input_tokens: 5 }),
        });

        const tokenizer = new ClaudeTokenizer('key');
        await tokenizer.countTokens('Test', { model: 'claude-3-opus' });

        const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
        expect(callBody.model).toBe('claude-3-opus');
      });
    });

    describe('countMessageTokens', () => {
      it('should return 0 for empty messages', async () => {
        const tokenizer = new ClaudeTokenizer('key');
        const result = await tokenizer.countMessageTokens([]);
        
        expect(result.tokens).toBe(0);
        expect(result.isExact).toBe(true);
      });

      it('should call API with messages', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ input_tokens: 20 }),
        });

        const tokenizer = new ClaudeTokenizer('test-key');
        const messages: TokenCountMessage[] = [
          { role: 'user', content: 'Hello' },
          { role: 'assistant', content: 'Hi there!' },
        ];

        const result = await tokenizer.countMessageTokens(messages);

        expect(result.tokens).toBe(20);
        expect(result.isExact).toBe(true);
      });

      it('should filter out system messages from API call', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ input_tokens: 15 }),
        });

        const tokenizer = new ClaudeTokenizer('key');
        const messages: TokenCountMessage[] = [
          { role: 'system', content: 'You are helpful' },
          { role: 'user', content: 'Hello' },
        ];

        await tokenizer.countMessageTokens(messages);

        const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
        expect(callBody.messages).toHaveLength(1);
        expect(callBody.system).toBe('You are helpful');
      });

      it('should use systemInstruction from options', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ input_tokens: 10 }),
        });

        const tokenizer = new ClaudeTokenizer('key');
        const messages: TokenCountMessage[] = [
          { role: 'user', content: 'Hello' },
        ];

        await tokenizer.countMessageTokens(messages, {
          systemInstruction: 'Be concise',
        });

        const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
        expect(callBody.system).toBe('Be concise');
      });

      it('should fallback to estimation without API key', async () => {
        const tokenizer = new ClaudeTokenizer();
        const messages: TokenCountMessage[] = [
          { role: 'user', content: 'Hello' },
        ];

        const result = await tokenizer.countMessageTokens(messages);

        expect(result.isExact).toBe(false);
        expect(result.provider).toBe('estimation');
      });

      it('should fallback on API error', async () => {
        mockFetch.mockRejectedValue(new Error('Network error'));

        const tokenizer = new ClaudeTokenizer('key');
        const messages: TokenCountMessage[] = [
          { role: 'user', content: 'Test' },
        ];

        const result = await tokenizer.countMessageTokens(messages);

        expect(result.isExact).toBe(false);
        expect(result.provider).toBe('estimation');
      });
    });

    describe('supportsModel', () => {
      it('should return true for Claude models', () => {
        const tokenizer = new ClaudeTokenizer();
        
        expect(tokenizer.supportsModel('claude-3-opus')).toBe(true);
        expect(tokenizer.supportsModel('claude-3-sonnet')).toBe(true);
        expect(tokenizer.supportsModel('claude-2')).toBe(true);
        expect(tokenizer.supportsModel('Claude-3-Haiku')).toBe(true);
      });

      it('should return false for non-Claude models', () => {
        const tokenizer = new ClaudeTokenizer();
        
        expect(tokenizer.supportsModel('gpt-4')).toBe(false);
        expect(tokenizer.supportsModel('gemini-pro')).toBe(false);
        expect(tokenizer.supportsModel('llama-2')).toBe(false);
      });

      it('should return false for empty model', () => {
        const tokenizer = new ClaudeTokenizer();
        expect(tokenizer.supportsModel('')).toBe(false);
      });
    });

    describe('Claude-specific estimation', () => {
      it('should estimate tokens for English text', async () => {
        const tokenizer = new ClaudeTokenizer();
        const result = await tokenizer.countTokens('Hello world test');

        expect(result.tokens).toBeGreaterThan(0);
        expect(result.isExact).toBe(false);
      });

      it('should add overhead for code blocks', async () => {
        const tokenizer = new ClaudeTokenizer();
        const codeContent = '```javascript\nconst x = 1;\n```';
        const plainContent = 'const x = 1;';

        const codeResult = await tokenizer.countTokens(codeContent);
        const plainResult = await tokenizer.countTokens(plainContent);

        // Code should have slightly more tokens due to block overhead
        expect(codeResult.tokens).toBeGreaterThanOrEqual(plainResult.tokens);
      });
    });
  });

  describe('claudeTokenizer singleton', () => {
    it('should be an instance of ClaudeTokenizer', () => {
      expect(claudeTokenizer).toBeInstanceOf(ClaudeTokenizer);
    });

    it('should have claude-api provider', () => {
      expect(claudeTokenizer.provider).toBe('claude-api');
    });
  });
});
