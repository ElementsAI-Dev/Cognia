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
  createXaiClient,
  createTogetherAIClient,
  createOpenRouterClient,
  createCohereClient,
  createFireworksClient,
  createCerebrasClient,
  createSambaNovaClient,
  createCustomProviderClient,
  getProviderModel,
  getCustomProviderModel,
  defaultModels,
  isValidProvider,
  isVisionModel,
  supportsToolCalling,
  getDefaultModel,
  type ProviderName,
} from '../core/client';

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

describe('createXaiClient', () => {
  it('creates xAI client with correct base URL', () => {
    const client = createXaiClient('test-api-key');
    expect(client).toBeDefined();
    expect(typeof client).toBe('function');
  });

  it('returns a callable model function', () => {
    const client = createXaiClient('test-api-key');
    const model = client('grok-3') as unknown as MockModelResult;
    expect(model).toBeDefined();
    expect(model.model).toBe('grok-3');
    expect(model.baseURL).toBe('https://api.x.ai/v1');
  });
});

describe('createTogetherAIClient', () => {
  it('creates Together AI client with correct base URL', () => {
    const client = createTogetherAIClient('test-api-key');
    expect(client).toBeDefined();
    expect(typeof client).toBe('function');
  });

  it('returns a callable model function', () => {
    const client = createTogetherAIClient('test-api-key');
    const model = client('meta-llama/Llama-3.3-70B-Instruct-Turbo') as unknown as MockModelResult;
    expect(model).toBeDefined();
    expect(model.model).toBe('meta-llama/Llama-3.3-70B-Instruct-Turbo');
    expect(model.baseURL).toBe('https://api.together.xyz/v1');
  });
});

describe('createOpenRouterClient', () => {
  it('creates OpenRouter client with correct base URL and headers', () => {
    const client = createOpenRouterClient('test-api-key');
    expect(client).toBeDefined();
    expect(typeof client).toBe('function');
  });

  it('returns a callable model function', () => {
    const client = createOpenRouterClient('test-api-key');
    const model = client('anthropic/claude-sonnet-4') as unknown as MockModelResult;
    expect(model).toBeDefined();
    expect(model.model).toBe('anthropic/claude-sonnet-4');
    expect(model.baseURL).toBe('https://openrouter.ai/api/v1');
  });
});

describe('createCohereClient', () => {
  it('creates Cohere client with correct base URL', () => {
    const client = createCohereClient('test-api-key');
    expect(client).toBeDefined();
    expect(typeof client).toBe('function');
  });

  it('returns a callable model function', () => {
    const client = createCohereClient('test-api-key');
    const model = client('command-r-plus') as unknown as MockModelResult;
    expect(model).toBeDefined();
    expect(model.model).toBe('command-r-plus');
    expect(model.baseURL).toBe('https://api.cohere.com/compatibility/v1');
  });
});

describe('createFireworksClient', () => {
  it('creates Fireworks client with correct base URL', () => {
    const client = createFireworksClient('test-api-key');
    expect(client).toBeDefined();
    expect(typeof client).toBe('function');
  });

  it('returns a callable model function', () => {
    const client = createFireworksClient('test-api-key');
    const model = client('accounts/fireworks/models/llama-v3p3-70b-instruct') as unknown as MockModelResult;
    expect(model).toBeDefined();
    expect(model.model).toBe('accounts/fireworks/models/llama-v3p3-70b-instruct');
    expect(model.baseURL).toBe('https://api.fireworks.ai/inference/v1');
  });
});

describe('createCerebrasClient', () => {
  it('creates Cerebras client with correct base URL', () => {
    const client = createCerebrasClient('test-api-key');
    expect(client).toBeDefined();
    expect(typeof client).toBe('function');
  });

  it('returns a callable model function', () => {
    const client = createCerebrasClient('test-api-key');
    const model = client('llama-3.3-70b') as unknown as MockModelResult;
    expect(model).toBeDefined();
    expect(model.model).toBe('llama-3.3-70b');
    expect(model.baseURL).toBe('https://api.cerebras.ai/v1');
  });
});

describe('createSambaNovaClient', () => {
  it('creates SambaNova client with correct base URL', () => {
    const client = createSambaNovaClient('test-api-key');
    expect(client).toBeDefined();
    expect(typeof client).toBe('function');
  });

  it('returns a callable model function', () => {
    const client = createSambaNovaClient('test-api-key');
    const model = client('Meta-Llama-3.3-70B-Instruct') as unknown as MockModelResult;
    expect(model).toBeDefined();
    expect(model.model).toBe('Meta-Llama-3.3-70B-Instruct');
    expect(model.baseURL).toBe('https://api.sambanova.ai/v1');
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

  it('returns xAI model for xai provider', () => {
    const model = getProviderModel('xai', 'grok-3', 'test-key') as unknown as MockModelResult;
    expect(model).toBeDefined();
    expect(model.model).toBe('grok-3');
  });

  it('returns Together AI model for togetherai provider', () => {
    const model = getProviderModel('togetherai', 'meta-llama/Llama-3.3-70B-Instruct-Turbo', 'test-key') as unknown as MockModelResult;
    expect(model).toBeDefined();
    expect(model.model).toBe('meta-llama/Llama-3.3-70B-Instruct-Turbo');
  });

  it('returns OpenRouter model for openrouter provider', () => {
    const model = getProviderModel('openrouter', 'anthropic/claude-sonnet-4', 'test-key') as unknown as MockModelResult;
    expect(model).toBeDefined();
    expect(model.model).toBe('anthropic/claude-sonnet-4');
  });

  it('returns Cohere model for cohere provider', () => {
    const model = getProviderModel('cohere', 'command-r-plus', 'test-key') as unknown as MockModelResult;
    expect(model).toBeDefined();
    expect(model.model).toBe('command-r-plus');
  });

  it('returns Fireworks model for fireworks provider', () => {
    const model = getProviderModel('fireworks', 'accounts/fireworks/models/llama-v3p3-70b-instruct', 'test-key') as unknown as MockModelResult;
    expect(model).toBeDefined();
    expect(model.model).toBe('accounts/fireworks/models/llama-v3p3-70b-instruct');
  });

  it('returns Cerebras model for cerebras provider', () => {
    const model = getProviderModel('cerebras', 'llama-3.3-70b', 'test-key') as unknown as MockModelResult;
    expect(model).toBeDefined();
    expect(model.model).toBe('llama-3.3-70b');
  });

  it('returns SambaNova model for sambanova provider', () => {
    const model = getProviderModel('sambanova', 'Meta-Llama-3.3-70B-Instruct', 'test-key') as unknown as MockModelResult;
    expect(model).toBeDefined();
    expect(model.model).toBe('Meta-Llama-3.3-70B-Instruct');
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

  it('has default model for xai', () => {
    expect(defaultModels.xai).toBe('grok-3');
  });

  it('has default model for togetherai', () => {
    expect(defaultModels.togetherai).toBe('meta-llama/Llama-3.3-70B-Instruct-Turbo');
  });

  it('has default model for openrouter', () => {
    expect(defaultModels.openrouter).toBe('anthropic/claude-sonnet-4');
  });

  it('has default model for cohere', () => {
    expect(defaultModels.cohere).toBe('command-r-plus');
  });

  it('has default model for fireworks', () => {
    expect(defaultModels.fireworks).toBe('accounts/fireworks/models/llama-v3p3-70b-instruct');
  });

  it('has default model for cerebras', () => {
    expect(defaultModels.cerebras).toBe('llama-3.3-70b');
  });

  it('has default model for sambanova', () => {
    expect(defaultModels.sambanova).toBe('Meta-Llama-3.3-70B-Instruct');
  });
});

describe('isValidProvider', () => {
  it('returns true for valid providers', () => {
    const validProviders = [
      'openai', 'anthropic', 'google', 'deepseek', 'groq',
      'mistral', 'xai', 'togetherai', 'openrouter', 'cohere',
      'fireworks', 'cerebras', 'sambanova', 'ollama', 'auto'
    ];
    validProviders.forEach(provider => {
      expect(isValidProvider(provider)).toBe(true);
    });
  });

  it('returns false for invalid providers', () => {
    expect(isValidProvider('invalid')).toBe(false);
    expect(isValidProvider('')).toBe(false);
    expect(isValidProvider('unknown')).toBe(false);
  });
});

describe('isVisionModel', () => {
  it('returns true for vision-capable models', () => {
    expect(isVisionModel('gpt-4o')).toBe(true);
    expect(isVisionModel('gpt-4o-mini')).toBe(true);
    expect(isVisionModel('gpt-4-turbo')).toBe(true);
    expect(isVisionModel('claude-3-opus')).toBe(true);
    expect(isVisionModel('claude-sonnet-4-20250514')).toBe(true);
    expect(isVisionModel('gemini-1.5-pro')).toBe(true);
    expect(isVisionModel('gemini-2.0-flash')).toBe(true);
    expect(isVisionModel('grok-3')).toBe(true);
  });

  it('returns false for non-vision models', () => {
    expect(isVisionModel('gpt-3.5-turbo')).toBe(false);
    expect(isVisionModel('llama-3.3-70b')).toBe(false);
    expect(isVisionModel('mistral-large')).toBe(false);
  });
});

describe('supportsToolCalling', () => {
  it('returns true for models that support tool calling', () => {
    expect(supportsToolCalling('gpt-4o')).toBe(true);
    expect(supportsToolCalling('claude-sonnet-4-20250514')).toBe(true);
    expect(supportsToolCalling('gemini-2.0-flash')).toBe(true);
    expect(supportsToolCalling('llama-3.3-70b')).toBe(true);
  });

  it('returns false for models that do not support tool calling', () => {
    expect(supportsToolCalling('o1')).toBe(false);
    expect(supportsToolCalling('o1-mini')).toBe(false);
    expect(supportsToolCalling('o1-preview')).toBe(false);
    expect(supportsToolCalling('deepseek-reasoner')).toBe(false);
  });
});

describe('getDefaultModel', () => {
  it('returns correct default model for each provider', () => {
    expect(getDefaultModel('openai')).toBe('gpt-4o');
    expect(getDefaultModel('anthropic')).toBe('claude-sonnet-4-20250514');
    expect(getDefaultModel('google')).toBe('gemini-2.0-flash-exp');
    expect(getDefaultModel('openrouter')).toBe('anthropic/claude-sonnet-4');
  });

  it('returns openai default for auto mode', () => {
    expect(getDefaultModel('auto')).toBe('gpt-4o');
  });
});
