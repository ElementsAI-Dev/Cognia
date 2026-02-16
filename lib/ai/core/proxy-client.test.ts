/**
 * Proxy Client Tests
 */

import {
  createProxyOpenAIClient,
  createProxyAnthropicClient,
  createProxyGoogleClient,
  createProxyMistralClient,
  createProxyDeepSeekClient,
  createProxyGroqClient,
  createProxyXaiClient,
  createProxyTogetherAIClient,
  createProxyOpenRouterClient,
  createProxyCohereClient,
  createProxyFireworksClient,
  createProxyCerebrasClient,
  createProxySambaNovaClient,
  createProxyOllamaClient,
  createProxyCustomClient,
  getProxyProviderModel,
  logProxyStatus,
} from './proxy-client';
import { loggers } from '@/lib/logger';

// Mock proxy-fetch module
jest.mock('@/lib/network/proxy-fetch', () => ({
  proxyFetch: jest.fn(),
  isProxyEnabled: jest.fn(() => true),
  getCurrentProxyUrl: jest.fn(() => 'http://localhost:8080'),
}));

// Mock AI SDK providers
jest.mock('@ai-sdk/openai', () => ({
  createOpenAI: jest.fn((config) => {
    const mockProvider = jest.fn((modelId: string) => ({ modelId, provider: 'openai', ...config }));
    return mockProvider;
  }),
}));

jest.mock('@ai-sdk/anthropic', () => ({
  createAnthropic: jest.fn((config) => {
    return jest.fn((modelId: string) => ({ modelId, provider: 'anthropic', ...config }));
  }),
}));

jest.mock('@ai-sdk/google', () => ({
  createGoogleGenerativeAI: jest.fn((config) => {
    return jest.fn((modelId: string) => ({ modelId, provider: 'google', ...config }));
  }),
}));

jest.mock('@ai-sdk/mistral', () => ({
  createMistral: jest.fn((config) => {
    return jest.fn((modelId: string) => ({ modelId, provider: 'mistral', ...config }));
  }),
}));

describe('proxy-client', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createProxyOpenAIClient', () => {
    it('should create OpenAI client with proxy', () => {
      const client = createProxyOpenAIClient({ apiKey: 'test-key' });

      expect(client).toBeDefined();
      expect(typeof client).toBe('function');
    });

    it('should create OpenAI client with custom baseURL', () => {
      const client = createProxyOpenAIClient({
        apiKey: 'test-key',
        baseURL: 'https://custom.api.com',
      });

      expect(client).toBeDefined();
    });

    it('should create OpenAI client without proxy when disabled', () => {
      const client = createProxyOpenAIClient({
        apiKey: 'test-key',
        useProxy: false,
      });

      expect(client).toBeDefined();
    });
  });

  describe('createProxyAnthropicClient', () => {
    it('should create Anthropic client with proxy', () => {
      const client = createProxyAnthropicClient({ apiKey: 'test-key' });

      expect(client).toBeDefined();
      expect(typeof client).toBe('function');
    });

    it('should create Anthropic client with custom baseURL', () => {
      const client = createProxyAnthropicClient({
        apiKey: 'test-key',
        baseURL: 'https://custom.anthropic.com',
      });

      expect(client).toBeDefined();
    });
  });

  describe('createProxyGoogleClient', () => {
    it('should create Google AI client with proxy', () => {
      const client = createProxyGoogleClient({ apiKey: 'test-key' });

      expect(client).toBeDefined();
      expect(typeof client).toBe('function');
    });
  });

  describe('createProxyMistralClient', () => {
    it('should create Mistral client with proxy', () => {
      const client = createProxyMistralClient({ apiKey: 'test-key' });

      expect(client).toBeDefined();
      expect(typeof client).toBe('function');
    });
  });

  describe('createProxyDeepSeekClient', () => {
    it('should create DeepSeek client with proxy', () => {
      const client = createProxyDeepSeekClient({ apiKey: 'test-key' });

      expect(client).toBeDefined();
    });
  });

  describe('createProxyGroqClient', () => {
    it('should create Groq client with proxy', () => {
      const client = createProxyGroqClient({ apiKey: 'test-key' });

      expect(client).toBeDefined();
    });
  });

  describe('createProxyXaiClient', () => {
    it('should create xAI client with proxy', () => {
      const client = createProxyXaiClient({ apiKey: 'test-key' });

      expect(client).toBeDefined();
    });
  });

  describe('createProxyTogetherAIClient', () => {
    it('should create Together AI client with proxy', () => {
      const client = createProxyTogetherAIClient({ apiKey: 'test-key' });

      expect(client).toBeDefined();
    });
  });

  describe('createProxyOpenRouterClient', () => {
    it('should create OpenRouter client with proxy', () => {
      const client = createProxyOpenRouterClient({ apiKey: 'test-key' });

      expect(client).toBeDefined();
    });
  });

  describe('createProxyCohereClient', () => {
    it('should create Cohere client with proxy', () => {
      const client = createProxyCohereClient({ apiKey: 'test-key' });

      expect(client).toBeDefined();
    });
  });

  describe('createProxyFireworksClient', () => {
    it('should create Fireworks client with proxy', () => {
      const client = createProxyFireworksClient({ apiKey: 'test-key' });

      expect(client).toBeDefined();
    });
  });

  describe('createProxyCerebrasClient', () => {
    it('should create Cerebras client with proxy', () => {
      const client = createProxyCerebrasClient({ apiKey: 'test-key' });

      expect(client).toBeDefined();
    });
  });

  describe('createProxySambaNovaClient', () => {
    it('should create SambaNova client with proxy', () => {
      const client = createProxySambaNovaClient({ apiKey: 'test-key' });

      expect(client).toBeDefined();
    });
  });

  describe('createProxyOllamaClient', () => {
    it('should create Ollama client with proxy', () => {
      const client = createProxyOllamaClient({ apiKey: '' });

      expect(client).toBeDefined();
    });

    it('should create Ollama client with custom baseURL', () => {
      const client = createProxyOllamaClient({
        apiKey: '',
        baseURL: 'http://192.168.1.100:11434/v1',
      });

      expect(client).toBeDefined();
    });
  });

  describe('createProxyCustomClient', () => {
    it('should create custom OpenAI-compatible client with proxy', () => {
      const client = createProxyCustomClient({
        apiKey: 'test-key',
        baseURL: 'https://custom.llm.com/v1',
      });

      expect(client).toBeDefined();
    });
  });

  describe('getProxyProviderModel', () => {
    it('should get OpenAI model with proxy', () => {
      const model = getProxyProviderModel('openai', 'gpt-4o', 'test-key');

      expect(model).toBeDefined();
    });

    it('should get Anthropic model with proxy', () => {
      const model = getProxyProviderModel('anthropic', 'claude-3-opus', 'test-key');

      expect(model).toBeDefined();
    });

    it('should get Google model with proxy', () => {
      const model = getProxyProviderModel('google', 'gemini-pro', 'test-key');

      expect(model).toBeDefined();
    });

    it('should get Mistral model with proxy', () => {
      const model = getProxyProviderModel('mistral', 'mistral-large', 'test-key');

      expect(model).toBeDefined();
    });

    it('should get DeepSeek model with proxy', () => {
      const model = getProxyProviderModel('deepseek', 'deepseek-chat', 'test-key');

      expect(model).toBeDefined();
    });

    it('should get Groq model with proxy', () => {
      const model = getProxyProviderModel('groq', 'llama-3.1-70b', 'test-key');

      expect(model).toBeDefined();
    });

    it('should get xAI model with proxy', () => {
      const model = getProxyProviderModel('xai', 'grok-beta', 'test-key');

      expect(model).toBeDefined();
    });

    it('should get TogetherAI model with proxy', () => {
      const model = getProxyProviderModel('togetherai', 'llama-3.1-70b', 'test-key');

      expect(model).toBeDefined();
    });

    it('should get OpenRouter model with proxy', () => {
      const model = getProxyProviderModel('openrouter', 'openai/gpt-4o', 'test-key');

      expect(model).toBeDefined();
    });

    it('should get Cohere model with proxy', () => {
      const model = getProxyProviderModel('cohere', 'command-r-plus', 'test-key');

      expect(model).toBeDefined();
    });

    it('should get Fireworks model with proxy', () => {
      const model = getProxyProviderModel('fireworks', 'llama-v3p1-70b', 'test-key');

      expect(model).toBeDefined();
    });

    it('should get Cerebras model with proxy', () => {
      const model = getProxyProviderModel('cerebras', 'llama3.1-70b', 'test-key');

      expect(model).toBeDefined();
    });

    it('should get SambaNova model with proxy', () => {
      const model = getProxyProviderModel('sambanova', 'llama-3-70b', 'test-key');

      expect(model).toBeDefined();
    });

    it('should get Ollama model with proxy', () => {
      const model = getProxyProviderModel('ollama', 'llama3', '');

      expect(model).toBeDefined();
    });

    it('should throw for unknown provider', () => {
      expect(() => {
        getProxyProviderModel('unknown' as never, 'model', 'key');
      }).toThrow('Unknown provider: unknown');
    });

    it('should respect useProxy option', () => {
      const model = getProxyProviderModel('openai', 'gpt-4o', 'test-key', undefined, false);

      expect(model).toBeDefined();
    });

    it('should use custom baseURL', () => {
      const model = getProxyProviderModel(
        'openai',
        'gpt-4o',
        'test-key',
        'https://custom.api.com'
      );

      expect(model).toBeDefined();
    });
  });

  describe('logProxyStatus', () => {
    let infoSpy: jest.SpyInstance;

    beforeEach(() => {
      infoSpy = jest.spyOn(loggers.ai, 'info').mockImplementation();
    });

    afterEach(() => {
      infoSpy.mockRestore();
    });

    it('should log proxy enabled status', () => {
      logProxyStatus();

      expect(infoSpy).toHaveBeenCalledWith(
        expect.stringContaining('Proxy enabled:')
      );
    });

    it('should log proxy disabled status when proxy is off', () => {
      const { isProxyEnabled } = jest.requireMock('@/lib/network/proxy-fetch');
      isProxyEnabled.mockReturnValueOnce(false);

      logProxyStatus();

      expect(infoSpy).toHaveBeenCalledWith('Proxy disabled');
    });
  });
});
