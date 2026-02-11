/**
 * Tests for PPT AI Config shared utility
 */

import { resolvePPTAIConfig, createPPTModelInstance, type PPTAIConfig } from './ppt-ai-config';

// Mock getProxyProviderModel
const mockGetProxyProviderModel = jest.fn().mockReturnValue('mock-model-instance');
jest.mock('@/lib/ai/core/proxy-client', () => ({
  getProxyProviderModel: (...args: unknown[]) => mockGetProxyProviderModel(...args),
}));

// Mock getNextApiKey
const mockGetNextApiKey = jest.fn().mockReturnValue({ apiKey: 'rotated-key', index: 1 });
jest.mock('@/lib/ai/infrastructure/api-key-rotation', () => ({
  getNextApiKey: (...args: unknown[]) => mockGetNextApiKey(...args),
}));

// Mock stores (lazy import in ppt-ai-config)
const mockUpdateProviderSettings = jest.fn();
jest.mock('@/stores', () => ({
  useSettingsStore: {
    getState: () => ({
      updateProviderSettings: mockUpdateProviderSettings,
    }),
  },
}));

describe('resolvePPTAIConfig', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should resolve basic config from provider settings', () => {
    const result = resolvePPTAIConfig('openai', {
      openai: {
        apiKey: 'sk-test-key',
        defaultModel: 'gpt-4o',
        baseURL: 'https://api.openai.com',
      },
    });

    expect(result).toEqual({
      provider: 'openai',
      model: 'gpt-4o',
      apiKey: 'sk-test-key',
      baseURL: 'https://api.openai.com',
    });
  });

  it('should use default model when none specified', () => {
    const result = resolvePPTAIConfig('openai', {
      openai: {
        apiKey: 'sk-test-key',
      },
    });

    expect(result.model).toBe('gpt-4o');
  });

  it('should return empty apiKey when none configured', () => {
    const result = resolvePPTAIConfig('openai', {
      openai: {},
    });

    expect(result.apiKey).toBe('');
  });

  it('should handle missing provider settings', () => {
    const result = resolvePPTAIConfig('openai', {});

    expect(result).toEqual({
      provider: 'openai',
      model: 'gpt-4o',
      apiKey: '',
      baseURL: undefined,
    });
  });

  it('should handle undefined provider settings entry', () => {
    const result = resolvePPTAIConfig('openai', {
      openai: undefined,
    });

    expect(result.apiKey).toBe('');
    expect(result.model).toBe('gpt-4o');
  });

  it('should use API key rotation when enabled', () => {
    const result = resolvePPTAIConfig('openai', {
      openai: {
        apiKey: 'sk-primary',
        apiKeys: ['sk-key-1', 'sk-key-2', 'sk-key-3'],
        apiKeyRotationEnabled: true,
        apiKeyRotationStrategy: 'round-robin',
        currentKeyIndex: 0,
        apiKeyUsageStats: {},
        defaultModel: 'gpt-4o',
      },
    });

    expect(mockGetNextApiKey).toHaveBeenCalledWith(
      ['sk-key-1', 'sk-key-2', 'sk-key-3'],
      'round-robin',
      0,
      {}
    );
    expect(result.apiKey).toBe('rotated-key');
  });

  it('should not use rotation when apiKeys is empty', () => {
    resolvePPTAIConfig('openai', {
      openai: {
        apiKey: 'sk-primary',
        apiKeys: [],
        apiKeyRotationEnabled: true,
      },
    });

    expect(mockGetNextApiKey).not.toHaveBeenCalled();
  });

  it('should not use rotation when disabled', () => {
    resolvePPTAIConfig('openai', {
      openai: {
        apiKey: 'sk-primary',
        apiKeys: ['sk-key-1', 'sk-key-2'],
        apiKeyRotationEnabled: false,
      },
    });

    expect(mockGetNextApiKey).not.toHaveBeenCalled();
  });

  it('should default rotation strategy to round-robin', () => {
    resolvePPTAIConfig('openai', {
      openai: {
        apiKey: 'sk-primary',
        apiKeys: ['sk-key-1'],
        apiKeyRotationEnabled: true,
        currentKeyIndex: 0,
        apiKeyUsageStats: {},
      },
    });

    expect(mockGetNextApiKey).toHaveBeenCalledWith(
      ['sk-key-1'],
      'round-robin',
      0,
      {}
    );
  });
});

describe('createPPTModelInstance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create model instance with correct parameters', () => {
    const config: PPTAIConfig = {
      provider: 'openai',
      model: 'gpt-4o',
      apiKey: 'sk-test',
      baseURL: 'https://api.openai.com',
    };

    const result = createPPTModelInstance(config);

    expect(mockGetProxyProviderModel).toHaveBeenCalledWith(
      'openai',
      'gpt-4o',
      'sk-test',
      'https://api.openai.com',
      true
    );
    expect(result).toBe('mock-model-instance');
  });

  it('should handle undefined baseURL', () => {
    const config: PPTAIConfig = {
      provider: 'anthropic',
      model: 'claude-3',
      apiKey: 'sk-anthropic',
    };

    createPPTModelInstance(config);

    expect(mockGetProxyProviderModel).toHaveBeenCalledWith(
      'anthropic',
      'claude-3',
      'sk-anthropic',
      undefined,
      true
    );
  });
});
