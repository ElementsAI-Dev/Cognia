/**
 * Tests for AI Client configuration
 */

import {
  createOpenAIClient,
  createAnthropicClient,
  createGoogleClient,
  createMistralClient,
  createDeepSeekClient,
  createGroqClient,
  createCustomProviderClient,
  getProviderModel,
  getCustomProviderModel,
  defaultModels,
  type ProviderName,
} from './client';

// Helper type for mock model results
interface MockModelResult {
  model: string;
  provider?: string;
  apiKey?: string;
  baseURL?: string;
}

// Mock the AI SDK providers
jest.mock('@ai-sdk/openai', () => ({
  createOpenAI: jest.fn((config) => {
    const mockProvider = jest.fn((model: string) => ({ model, provider: 'openai', ...config }));
    return mockProvider;
  }),
}));

jest.mock('@ai-sdk/anthropic', () => ({
  createAnthropic: jest.fn((config) => {
    const mockProvider = jest.fn((model: string) => ({ model, provider: 'anthropic', ...config }));
    return mockProvider;
  }),
}));

jest.mock('@ai-sdk/google', () => ({
  createGoogleGenerativeAI: jest.fn((config) => {
    const mockProvider = jest.fn((model: string) => ({ model, provider: 'google', ...config }));
    return mockProvider;
  }),
}));

jest.mock('@ai-sdk/mistral', () => ({
  createMistral: jest.fn((config) => {
    const mockProvider = jest.fn((model: string) => ({ model, provider: 'mistral', ...config }));
    return mockProvider;
  }),
}));

describe('createOpenAIClient', () => {
  it('creates OpenAI client with API key', () => {
    const client = createOpenAIClient('test-api-key');
    expect(client).toBeDefined();
    expect(typeof client).toBe('function');
  });

  it('returns a callable model function', () => {
    const client = createOpenAIClient('test-api-key');
    const model = client('gpt-4o') as unknown as MockModelResult;
    expect(model).toBeDefined();
    expect(model.model).toBe('gpt-4o');
  });
});

describe('createAnthropicClient', () => {
  it('creates Anthropic client with API key', () => {
    const client = createAnthropicClient('test-api-key');
    expect(client).toBeDefined();
    expect(typeof client).toBe('function');
  });

  it('returns a callable model function', () => {
    const client = createAnthropicClient('test-api-key');
    const model = client('claude-sonnet-4-20250514') as unknown as MockModelResult;
    expect(model).toBeDefined();
    expect(model.model).toBe('claude-sonnet-4-20250514');
  });
});

describe('createGoogleClient', () => {
  it('creates Google AI client with API key', () => {
    const client = createGoogleClient('test-api-key');
    expect(client).toBeDefined();
    expect(typeof client).toBe('function');
  });

  it('returns a callable model function', () => {
    const client = createGoogleClient('test-api-key');
    const model = client('gemini-2.0-flash-exp') as unknown as MockModelResult;
    expect(model).toBeDefined();
    expect(model.model).toBe('gemini-2.0-flash-exp');
  });
});

describe('createMistralClient', () => {
  it('creates Mistral client with API key', () => {
    const client = createMistralClient('test-api-key');
    expect(client).toBeDefined();
    expect(typeof client).toBe('function');
  });

  it('returns a callable model function', () => {
    const client = createMistralClient('test-api-key');
    const model = client('mistral-large-latest') as unknown as MockModelResult;
    expect(model).toBeDefined();
    expect(model.model).toBe('mistral-large-latest');
  });
});

describe('createDeepSeekClient', () => {
  it('creates DeepSeek client with correct base URL', () => {
    const client = createDeepSeekClient('test-api-key');
    expect(client).toBeDefined();
    expect(typeof client).toBe('function');
  });

  it('returns a callable model function', () => {
    const client = createDeepSeekClient('test-api-key');
    const model = client('deepseek-chat') as unknown as MockModelResult;
    expect(model).toBeDefined();
    expect(model.model).toBe('deepseek-chat');
    expect(model.baseURL).toBe('https://api.deepseek.com/v1');
  });
});

describe('createGroqClient', () => {
  it('creates Groq client with correct base URL', () => {
    const client = createGroqClient('test-api-key');
    expect(client).toBeDefined();
    expect(typeof client).toBe('function');
  });

  it('returns a callable model function', () => {
    const client = createGroqClient('test-api-key');
    const model = client('llama-3.3-70b-versatile') as unknown as MockModelResult;
    expect(model).toBeDefined();
    expect(model.model).toBe('llama-3.3-70b-versatile');
    expect(model.baseURL).toBe('https://api.groq.com/openai/v1');
  });
});

describe('createCustomProviderClient', () => {
  it('creates custom provider client with base URL and API key', () => {
    const client = createCustomProviderClient('https://custom.api.com/v1', 'test-api-key');
    expect(client).toBeDefined();
    expect(typeof client).toBe('function');
  });

  it('returns a callable model function with custom config', () => {
    const client = createCustomProviderClient('https://custom.api.com/v1', 'test-api-key');
    const model = client('custom-model') as unknown as MockModelResult;
    expect(model).toBeDefined();
    expect(model.model).toBe('custom-model');
    expect(model.baseURL).toBe('https://custom.api.com/v1');
  });
});

describe('getProviderModel', () => {
  it('returns OpenAI model for openai provider', () => {
    const model = getProviderModel('openai', 'gpt-4o', 'test-key') as unknown as MockModelResult;
    expect(model).toBeDefined();
    expect(model.model).toBe('gpt-4o');
  });

  it('returns Anthropic model for anthropic provider', () => {
    const model = getProviderModel('anthropic', 'claude-sonnet-4-20250514', 'test-key') as unknown as MockModelResult;
    expect(model).toBeDefined();
    expect(model.model).toBe('claude-sonnet-4-20250514');
  });

  it('returns Google model for google provider', () => {
    const model = getProviderModel('google', 'gemini-2.0-flash-exp', 'test-key') as unknown as MockModelResult;
    expect(model).toBeDefined();
    expect(model.model).toBe('gemini-2.0-flash-exp');
  });

  it('returns Mistral model for mistral provider', () => {
    const model = getProviderModel('mistral', 'mistral-large-latest', 'test-key') as unknown as MockModelResult;
    expect(model).toBeDefined();
    expect(model.model).toBe('mistral-large-latest');
  });

  it('returns DeepSeek model for deepseek provider', () => {
    const model = getProviderModel('deepseek', 'deepseek-chat', 'test-key') as unknown as MockModelResult;
    expect(model).toBeDefined();
    expect(model.model).toBe('deepseek-chat');
  });

  it('returns Groq model for groq provider', () => {
    const model = getProviderModel('groq', 'llama-3.3-70b-versatile', 'test-key') as unknown as MockModelResult;
    expect(model).toBeDefined();
    expect(model.model).toBe('llama-3.3-70b-versatile');
  });

  it('returns Ollama model with default base URL', () => {
    const model = getProviderModel('ollama', 'llama3.2', 'test-key') as unknown as MockModelResult;
    expect(model).toBeDefined();
    expect(model.model).toBe('llama3.2');
    expect(model.baseURL).toBe('http://localhost:11434/v1');
  });

  it('returns Ollama model with custom base URL', () => {
    const model = getProviderModel('ollama', 'llama3.2', 'test-key', 'http://custom:11434/v1') as unknown as MockModelResult;
    expect(model).toBeDefined();
    expect(model.model).toBe('llama3.2');
    expect(model.baseURL).toBe('http://custom:11434/v1');
  });

  it('throws error for unknown provider', () => {
    expect(() => {
      getProviderModel('unknown' as ProviderName, 'model', 'test-key');
    }).toThrow('Unknown provider: unknown');
  });
});

describe('getCustomProviderModel', () => {
  it('returns model with provider settings', () => {
    const provider = {
      id: 'custom',
      name: 'Custom Provider',
      baseURL: 'https://custom.api.com/v1',
      apiKey: 'test-key',
      defaultModel: 'custom-default',
      models: ['custom-default', 'custom-large'],
      enabled: true,
    };

    const model = getCustomProviderModel(provider) as unknown as MockModelResult;
    expect(model).toBeDefined();
    expect(model.model).toBe('custom-default');
  });

  it('uses specified model over default', () => {
    const provider = {
      id: 'custom',
      name: 'Custom Provider',
      baseURL: 'https://custom.api.com/v1',
      apiKey: 'test-key',
      defaultModel: 'custom-default',
      models: ['custom-default', 'custom-large'],
      enabled: true,
    };

    const model = getCustomProviderModel(provider, 'custom-large') as unknown as MockModelResult;
    expect(model).toBeDefined();
    expect(model.model).toBe('custom-large');
  });
});

describe('defaultModels', () => {
  it('has default model for openai', () => {
    expect(defaultModels.openai).toBe('gpt-4o');
  });

  it('has default model for anthropic', () => {
    expect(defaultModels.anthropic).toBe('claude-sonnet-4-20250514');
  });

  it('has default model for google', () => {
    expect(defaultModels.google).toBe('gemini-2.0-flash-exp');
  });

  it('has default model for deepseek', () => {
    expect(defaultModels.deepseek).toBe('deepseek-chat');
  });

  it('has default model for groq', () => {
    expect(defaultModels.groq).toBe('llama-3.3-70b-versatile');
  });

  it('has default model for mistral', () => {
    expect(defaultModels.mistral).toBe('mistral-large-latest');
  });

  it('has default model for ollama', () => {
    expect(defaultModels.ollama).toBe('llama3.2');
  });

  it('does not have auto in defaultModels', () => {
    expect('auto' in defaultModels).toBe(false);
  });
});
