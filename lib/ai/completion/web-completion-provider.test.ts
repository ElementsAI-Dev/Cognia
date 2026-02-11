/**
 * Tests for Web Completion Provider
 */

import {
  triggerWebCompletion,
  cancelWebCompletion,
  clearWebCompletionCache,
} from './web-completion-provider';

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock proxyFetch to delegate to global.fetch
jest.mock('@/lib/network/proxy-fetch', () => ({
  proxyFetch: (...args: unknown[]) => (global.fetch as jest.MockedFunction<typeof fetch>)(...args as Parameters<typeof fetch>),
}));

// Mock logger
jest.mock('@/lib/logger', () => ({
  createLogger: jest.fn(() => ({
    trace: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    fatal: jest.fn(),
  })),
}));

describe('web-completion-provider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    cancelWebCompletion();
    clearWebCompletionCache();
  });

  describe('defaults', () => {
    it('should use Ollama endpoint by default', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ response: 'test' }),
      });

      await triggerWebCompletion('test');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:11434/api/generate',
        expect.objectContaining({
          method: 'POST',
        })
      );
    });

    it('should use default model qwen2.5-coder:0.5b', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ response: 'test' }),
      });

      const result = await triggerWebCompletion('test');

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.model).toBe('qwen2.5-coder:0.5b');
      expect(result.model).toBe('qwen2.5-coder:0.5b');
    });
  });

  describe('cancelWebCompletion', () => {
    it('should not throw when no request is pending', () => {
      expect(() => cancelWebCompletion()).not.toThrow();
    });
  });

  describe('triggerWebCompletion', () => {
    describe('Ollama provider', () => {
      it('should request completion from Ollama endpoint', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ response: 'completed text' }),
        });

        const result = await triggerWebCompletion('const x = ', {
          provider: 'ollama',
          endpoint: 'http://localhost:11434',
        });

        expect(mockFetch).toHaveBeenCalledWith(
          'http://localhost:11434/api/generate',
          expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
          })
        );
        expect(result.suggestions).toHaveLength(1);
        expect(result.suggestions[0].text).toBe('completed text');
      });

      it('should return empty suggestions on failed request', async () => {
        mockFetch.mockResolvedValueOnce({ ok: false });

        const result = await triggerWebCompletion('const x = ', {
          provider: 'ollama',
        });

        expect(result.suggestions).toHaveLength(0);
      });

      it('should return empty suggestions on empty response', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ response: '' }),
        });

        const result = await triggerWebCompletion('const x = ', {
          provider: 'ollama',
        });

        expect(result.suggestions).toHaveLength(0);
      });

      it('should use default Ollama endpoint when not specified', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ response: 'test' }),
        });

        await triggerWebCompletion('test', { provider: 'ollama' });

        expect(mockFetch).toHaveBeenCalledWith(
          'http://localhost:11434/api/generate',
          expect.any(Object)
        );
      });
    });

    describe('OpenAI provider', () => {
      it('should request completion from OpenAI endpoint', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            choices: [{ message: { content: 'completed code' } }],
          }),
        });

        const result = await triggerWebCompletion('function hello() {', {
          provider: 'openai',
          apiKey: 'sk-test-key',
        });

        expect(mockFetch).toHaveBeenCalledWith(
          'https://api.openai.com/v1/chat/completions',
          expect.objectContaining({
            method: 'POST',
            headers: expect.objectContaining({
              'Authorization': 'Bearer sk-test-key',
            }),
          })
        );
        expect(result.suggestions).toHaveLength(1);
        expect(result.suggestions[0].text).toBe('completed code');
      });

      it('should return empty when no API key provided', async () => {
        const result = await triggerWebCompletion('test', {
          provider: 'openai',
          apiKey: '',
        });

        expect(mockFetch).not.toHaveBeenCalled();
        expect(result.suggestions).toHaveLength(0);
      });
    });

    describe('Groq provider', () => {
      it('should use Groq endpoint', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            choices: [{ message: { content: 'groq result' } }],
          }),
        });

        await triggerWebCompletion('test', {
          provider: 'groq',
          apiKey: 'gsk-test',
        });

        expect(mockFetch).toHaveBeenCalledWith(
          'https://api.groq.com/openai/v1/chat/completions',
          expect.any(Object)
        );
      });
    });

    describe('Custom provider', () => {
      it('should request from custom endpoint', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ text: 'custom result' }),
        });

        await triggerWebCompletion('test', {
          provider: 'custom',
          endpoint: 'https://my-api.example.com/complete',
          apiKey: 'custom-key',
        });

        expect(mockFetch).toHaveBeenCalledWith(
          'https://my-api.example.com/complete',
          expect.objectContaining({
            method: 'POST',
            headers: expect.objectContaining({
              'Authorization': 'Bearer custom-key',
            }),
          })
        );
      });

      it('should return empty when no endpoint provided', async () => {
        const result = await triggerWebCompletion('test', {
          provider: 'custom',
        });

        expect(mockFetch).not.toHaveBeenCalled();
        expect(result.suggestions).toHaveLength(0);
      });
    });

    describe('error handling', () => {
      it('should handle network errors gracefully', async () => {
        mockFetch.mockRejectedValueOnce(new Error('Network error'));

        const result = await triggerWebCompletion('test', {
          provider: 'ollama',
        });

        expect(result.suggestions).toHaveLength(0);
      });

      it('should handle abort errors silently', async () => {
        const abortError = new Error('Aborted');
        abortError.name = 'AbortError';
        mockFetch.mockRejectedValueOnce(abortError);

        const result = await triggerWebCompletion('test', {
          provider: 'ollama',
        });

        expect(result.suggestions).toHaveLength(0);
        expect(result.latency_ms).toBe(0);
      });

      it('should include latency in result', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ response: 'test' }),
        });

        const result = await triggerWebCompletion('test', {
          provider: 'ollama',
        });

        expect(result.latency_ms).toBeGreaterThanOrEqual(0);
      });

      it('should include model in result', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ response: 'test' }),
        });

        const result = await triggerWebCompletion('test', {
          provider: 'ollama',
          modelId: 'codellama',
        });

        expect(result.model).toBe('codellama');
      });
    });

    describe('cancellation', () => {
      it('should not throw when cancelling with no active request', () => {
        expect(() => cancelWebCompletion()).not.toThrow();
      });
    });

    describe('caching', () => {
      it('should return cached result for identical input', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ response: 'cached response' }),
        });

        // First call - should hit the API
        const result1 = await triggerWebCompletion('const x = ', {
          provider: 'ollama',
        });

        expect(result1.suggestions).toHaveLength(1);
        expect(mockFetch).toHaveBeenCalledTimes(1);

        // Second call with same input - should use cache
        const result2 = await triggerWebCompletion('const x = ', {
          provider: 'ollama',
        });

        expect(result2.suggestions).toHaveLength(1);
        expect(result2.suggestions[0].text).toBe('cached response');
        // fetch should not be called again
        expect(mockFetch).toHaveBeenCalledTimes(1);
      });

      it('should not cache empty results', async () => {
        mockFetch
          .mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({ response: '' }),
          })
          .mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({ response: 'now it works' }),
          });

        // First call - empty response
        const result1 = await triggerWebCompletion('x', {
          provider: 'ollama',
        });
        expect(result1.suggestions).toHaveLength(0);

        // Second call - should hit API again since empty wasn't cached
        const result2 = await triggerWebCompletion('x', {
          provider: 'ollama',
        });
        expect(result2.suggestions).toHaveLength(1);
        expect(mockFetch).toHaveBeenCalledTimes(2);
      });

      it('should use different cache keys for different models', async () => {
        mockFetch
          .mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({ response: 'model-a response' }),
          })
          .mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({ response: 'model-b response' }),
          });

        const result1 = await triggerWebCompletion('test', {
          provider: 'ollama',
          modelId: 'model-a',
        });

        const result2 = await triggerWebCompletion('test', {
          provider: 'ollama',
          modelId: 'model-b',
        });

        expect(result1.suggestions[0].text).toBe('model-a response');
        expect(result2.suggestions[0].text).toBe('model-b response');
        expect(mockFetch).toHaveBeenCalledTimes(2);
      });
    });
  });
});
