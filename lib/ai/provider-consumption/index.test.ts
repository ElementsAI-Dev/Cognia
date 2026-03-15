jest.mock('@ai-sdk/openai', () => ({
  createOpenAI: jest.fn((config) => jest.fn((modelId: string) => ({ provider: 'openai', modelId, ...config }))),
}));

jest.mock('@ai-sdk/anthropic', () => ({
  createAnthropic: jest.fn((config) => jest.fn((modelId: string) => ({ provider: 'anthropic', modelId, ...config }))),
}));

jest.mock('@ai-sdk/google', () => ({
  createGoogleGenerativeAI: jest.fn((config) => jest.fn((modelId: string) => ({ provider: 'google', modelId, ...config }))),
}));

jest.mock('@ai-sdk/mistral', () => ({
  createMistral: jest.fn((config) => jest.fn((modelId: string) => ({ provider: 'mistral', modelId, ...config }))),
}));

jest.mock('@ai-sdk/cohere', () => ({
  createCohere: jest.fn((config) => jest.fn((modelId: string) => ({ provider: 'cohere', modelId, ...config }))),
}));

jest.mock('@/lib/network/proxy-fetch', () => ({
  proxyFetch: jest.fn(),
  isProxyEnabled: jest.fn(() => true),
  getCurrentProxyUrl: jest.fn(() => 'http://proxy.local'),
}));

import {
  createProviderSettingsSnapshot,
  createFeatureRoutePolicy,
  createFeatureProviderModel,
  createFeatureProviderModelFromRuntimeConfig,
  getFeatureProviderBlockedGuidance,
  getFeatureProviderFallbackTrace,
  resolveFeatureProvider,
  resolveFeatureProviderCandidates,
  type FeatureProviderPolicy,
  type ProviderSettingsSnapshot,
} from './index';

describe('provider-consumption', () => {
  const buildSnapshot = (
    overrides: Partial<ProviderSettingsSnapshot> = {}
  ): ProviderSettingsSnapshot => ({
    defaultProvider: 'openai',
    providerSettings: {
      openai: {
        providerId: 'openai',
        apiKey: 'sk-openai',
        defaultModel: 'gpt-4o',
        enabled: true,
      },
      deepseek: {
        providerId: 'deepseek',
        apiKey: 'sk-deepseek',
        defaultModel: 'deepseek-chat',
        enabled: true,
      },
      ollama: {
        providerId: 'ollama',
        baseURL: 'http://localhost:11434',
        defaultModel: 'llama3.2',
        enabled: true,
      },
    },
    customProviders: {
      'custom-openai': {
        id: 'custom-openai',
        name: 'Custom OpenAI',
        baseURL: 'https://custom.example.com/v1',
        apiKey: 'sk-custom',
        apiProtocol: 'openai',
        models: ['custom-model'],
        defaultModel: 'custom-model',
        enabled: true,
      },
    },
    ...overrides,
  });

  it('resolves the configured default provider for generic text features', () => {
    const resolved = resolveFeatureProvider(
      {
        featureId: 'preset-ai',
        selectionMode: 'default-provider',
      },
      buildSnapshot()
    );

    expect(resolved.kind).toBe('resolved');
    if (resolved.kind !== 'resolved') {
      throw new Error('Expected resolved provider result');
    }
    expect(resolved.providerId).toBe('openai');
    expect(resolved.model).toBe('gpt-4o');
    expect(resolved.apiKey).toBe('sk-openai');
  });

  it('creates normalized provider settings snapshots for feature callers', () => {
    const snapshot = createProviderSettingsSnapshot({
      defaultProvider: null,
      providerSettings: {
        openai: {
          providerId: 'openai',
          apiKey: 'sk-openai',
          enabled: true,
        },
      },
    });

    expect(snapshot).toEqual({
      defaultProvider: '',
      providerSettings: {
        openai: {
          providerId: 'openai',
          apiKey: 'sk-openai',
          enabled: true,
        },
      },
      customProviders: {},
    });
  });

  it('creates a general-text route profile with shared routing defaults', () => {
    const policy = createFeatureRoutePolicy('general-text', {
      featureId: 'workflow-ai',
    });

    expect(policy).toMatchObject({
      featureId: 'workflow-ai',
      routeProfile: 'general-text',
      selectionMode: 'default-provider',
      fallbackMode: 'first-eligible',
      executionMode: 'direct-model',
      proxyMode: 'preferred',
    });
  });

  it('creates a capability-bound route profile with supported-provider routing', () => {
    const policy = createFeatureRoutePolicy('capability-bound', {
      featureId: 'subtitle-transcription',
      supportedProviders: ['google', 'openai'],
      fallbackMode: 'ordered',
    });

    expect(policy).toMatchObject({
      featureId: 'subtitle-transcription',
      routeProfile: 'capability-bound',
      selectionMode: 'supported-providers',
      supportedProviders: ['google', 'openai'],
      fallbackMode: 'ordered',
    });
  });

  it('reuses provider-settings blocked guidance when the selected provider is ineligible', () => {
    const resolved = resolveFeatureProvider(
      {
        featureId: 'preset-ai',
        providerId: 'openai',
        selectionMode: 'explicit-provider',
      },
      buildSnapshot({
        providerSettings: {
          openai: {
            providerId: 'openai',
            enabled: true,
            defaultModel: 'gpt-4o',
          },
        },
      })
    );

    expect(resolved.kind).toBe('blocked');
    if (resolved.kind !== 'blocked') {
      throw new Error('Expected blocked provider result');
    }
    expect(resolved.code).toBe('missing_credential');
    expect(resolved.nextAction).toBe('add_api_key');
  });

  it('selects only eligible providers inside the supported-provider subset', () => {
    const policy: FeatureProviderPolicy = {
      featureId: 'subtitle-transcription',
      selectionMode: 'supported-providers',
      supportedProviders: ['google', 'openai'],
      fallbackMode: 'first-eligible',
    };

    const resolved = resolveFeatureProvider(
      policy,
      buildSnapshot({
        providerSettings: {
          openai: {
            providerId: 'openai',
            enabled: true,
            defaultModel: 'gpt-4o',
          },
        },
      })
    );

    expect(resolved.kind).toBe('blocked');
    if (resolved.kind !== 'blocked') {
      throw new Error('Expected blocked provider result');
    }
    expect(resolved.code).toBe('missing_credential');
    expect(resolved.attemptedProviderIds).toEqual(['openai']);
  });

  it('derives reusable blocked guidance from blocked routing results', () => {
    const policy = createFeatureRoutePolicy('capability-bound', {
      featureId: 'subtitle-transcription',
      supportedProviders: ['google', 'openai'],
      fallbackMode: 'first-eligible',
    });

    const resolved = resolveFeatureProvider(
      policy,
      buildSnapshot({
        providerSettings: {
          openai: {
            providerId: 'openai',
            enabled: true,
            defaultModel: 'gpt-4o',
          },
        },
      })
    );

    if (resolved.kind !== 'blocked') {
      throw new Error('Expected blocked provider result');
    }

    expect(getFeatureProviderBlockedGuidance(resolved)).toMatchObject({
      featureId: 'subtitle-transcription',
      routeProfile: 'capability-bound',
      code: 'missing_credential',
      nextAction: 'add_api_key',
      supportedProviderIds: ['google', 'openai'],
    });
  });

  it('captures fallback trace for resolved providers', () => {
    const policy = createFeatureRoutePolicy('general-text', {
      featureId: 'academic-analysis',
    });

    const resolved = resolveFeatureProvider(
      policy,
      buildSnapshot({
        defaultProvider: 'deepseek',
        customProviders: {},
        providerSettings: {
          deepseek: {
            providerId: 'deepseek',
            enabled: true,
            defaultModel: 'deepseek-chat',
          },
          openai: {
            providerId: 'openai',
            apiKey: 'sk-openai',
            enabled: true,
            defaultModel: 'gpt-4o',
          },
        },
      })
    );

    if (resolved.kind !== 'resolved') {
      throw new Error('Expected resolved provider result');
    }

    expect(getFeatureProviderFallbackTrace(policy, resolved)).toMatchObject({
      featureId: 'academic-analysis',
      routeProfile: 'general-text',
      fallbackMode: 'first-eligible',
      selectedProviderId: 'openai',
      attemptedProviderIds: ['deepseek', 'openai'],
      remainingProviderIds: [],
    });
  });

  it('returns the rotated API key when key rotation is enabled', () => {
    const resolved = resolveFeatureProvider(
      {
        featureId: 'ppt-ai',
        providerId: 'openai',
        selectionMode: 'explicit-provider',
        rotateApiKey: true,
      },
      buildSnapshot({
        providerSettings: {
          openai: {
            providerId: 'openai',
            apiKey: 'sk-primary',
            apiKeys: ['sk-one', 'sk-two'],
            apiKeyRotationEnabled: true,
            apiKeyRotationStrategy: 'round-robin',
            currentKeyIndex: 0,
            defaultModel: 'gpt-4o',
            enabled: true,
          },
        },
      })
    );

    expect(resolved.kind).toBe('resolved');
    if (resolved.kind !== 'resolved') {
      throw new Error('Expected resolved provider result');
    }
    expect(resolved.apiKey).toBe('sk-two');
    expect(resolved.nextKeyIndex).toBe(1);
  });

  it('allows compatible keyless local providers', () => {
    const resolved = resolveFeatureProvider(
      {
        featureId: 'chat',
        providerId: 'ollama',
        selectionMode: 'explicit-provider',
      },
      buildSnapshot()
    );

    expect(resolved.kind).toBe('resolved');
    if (resolved.kind !== 'resolved') {
      throw new Error('Expected resolved provider result');
    }
    expect(resolved.providerId).toBe('ollama');
    expect(resolved.apiKey).toBe('ollama');
  });

  it('resolves compatible custom providers with protocol metadata', () => {
    const resolved = resolveFeatureProvider(
      {
        featureId: 'academic-analysis',
        providerId: 'custom-openai',
        selectionMode: 'explicit-provider',
      },
      buildSnapshot()
    );

    expect(resolved.kind).toBe('resolved');
    if (resolved.kind !== 'resolved') {
      throw new Error('Expected resolved provider result');
    }
    expect(resolved.providerId).toBe('custom-openai');
    expect(resolved.isCustomProvider).toBe(true);
    expect(resolved.protocol).toBe('openai');
    expect(resolved.model).toBe('custom-model');
  });

  it('creates proxy-aware models from resolved provider configs', () => {
    const resolved = resolveFeatureProvider(
      {
        featureId: 'preset-ai',
        providerId: 'openai',
        selectionMode: 'explicit-provider',
        proxyMode: 'required',
      },
      buildSnapshot()
    );

    if (resolved.kind !== 'resolved') {
      throw new Error('Expected resolved provider result');
    }

    const model = createFeatureProviderModel(resolved);
    expect(model).toEqual(
      expect.objectContaining({
        provider: 'openai',
        modelId: 'gpt-4o',
        apiKey: 'sk-openai',
      })
    );
  });

  it('builds a feature model from explicit runtime config through the shared routing contract', () => {
    const model = createFeatureProviderModelFromRuntimeConfig(
      createFeatureRoutePolicy('general-text', {
        featureId: 'workflow-ai-step',
        selectionMode: 'explicit-provider',
        providerId: 'openai',
        fallbackMode: 'none',
      }),
      {
        providerId: 'openai',
        model: 'gpt-4o-mini',
        apiKey: 'sk-openai',
      }
    );

    expect(model).toEqual(
      expect.objectContaining({
        provider: 'openai',
        modelId: 'gpt-4o-mini',
        apiKey: 'sk-openai',
      })
    );
  });

  it('returns ordered resolved candidates for feature-level fallback loops', () => {
    const candidates = resolveFeatureProviderCandidates(
      {
        featureId: 'academic-analysis',
        selectionMode: 'default-provider',
        fallbackMode: 'first-eligible',
      },
      buildSnapshot({
        defaultProvider: 'deepseek',
      })
    );

    expect(candidates).toHaveLength(4);
    expect(candidates.map((candidate) => candidate.providerId)).toEqual([
      'deepseek',
      'openai',
      'ollama',
      'custom-openai',
    ]);
  });
});
