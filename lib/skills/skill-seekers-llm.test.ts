/**
 * Tests for Skill Seekers LLM Integration
 */

import {
  SUPPORTED_ENHANCE_PROVIDERS,
  getConfiguredEnhanceProviders,
  getDefaultEnhanceProvider,
  getEnhanceProviderApiKey,
  buildEnhanceConfig,
  hasEnhanceProvider,
  getProviderDisplayInfo,
} from './skill-seekers-llm';

// Mock the settings store
const mockGetState = jest.fn();

jest.mock('@/stores/settings', () => ({
  useSettingsStore: {
    getState: () => mockGetState(),
  },
}));

describe('SUPPORTED_ENHANCE_PROVIDERS', () => {
  it('contains anthropic', () => {
    expect(SUPPORTED_ENHANCE_PROVIDERS).toContain('anthropic');
  });

  it('contains google', () => {
    expect(SUPPORTED_ENHANCE_PROVIDERS).toContain('google');
  });

  it('contains openai', () => {
    expect(SUPPORTED_ENHANCE_PROVIDERS).toContain('openai');
  });

  it('is a readonly tuple of 3 providers', () => {
    expect(SUPPORTED_ENHANCE_PROVIDERS.length).toBe(3);
  });
});

describe('getConfiguredEnhanceProviders', () => {
  beforeEach(() => {
    mockGetState.mockReset();
  });

  it('returns empty array when no providers configured', () => {
    mockGetState.mockReturnValue({
      providerSettings: {
        anthropic: { apiKey: '', enabled: true },
        google: { apiKey: '', enabled: true },
        openai: { apiKey: '', enabled: true },
      },
    });

    const result = getConfiguredEnhanceProviders();

    expect(result).toEqual([]);
  });

  it('returns providers with API keys and enabled', () => {
    mockGetState.mockReturnValue({
      providerSettings: {
        anthropic: { apiKey: 'sk-ant-123', enabled: true },
        google: { apiKey: 'sk-google-456', enabled: true },
        openai: { apiKey: '', enabled: true },
      },
    });

    const result = getConfiguredEnhanceProviders();

    expect(result).toEqual(['anthropic', 'google']);
  });

  it('excludes disabled providers', () => {
    mockGetState.mockReturnValue({
      providerSettings: {
        anthropic: { apiKey: 'sk-ant-123', enabled: true },
        google: { apiKey: 'sk-google-456', enabled: false },
        openai: { apiKey: 'sk-open-789', enabled: true },
      },
    });

    const result = getConfiguredEnhanceProviders();

    expect(result).toEqual(['anthropic', 'openai']);
  });

  it('handles enabled: undefined as enabled', () => {
    mockGetState.mockReturnValue({
      providerSettings: {
        anthropic: { apiKey: 'sk-ant-123' },
        google: { apiKey: 'sk-google-456' },
        openai: { apiKey: '' },
      },
    });

    const result = getConfiguredEnhanceProviders();

    expect(result).toEqual(['anthropic', 'google']);
  });
});

describe('getDefaultEnhanceProvider', () => {
  beforeEach(() => {
    mockGetState.mockReset();
  });

  it('returns null when no providers configured', () => {
    mockGetState.mockReturnValue({
      providerSettings: {},
      defaultProvider: 'openai',
    });

    const result = getDefaultEnhanceProvider();

    expect(result).toBeNull();
  });

  it('returns first configured provider when default is not configured', () => {
    mockGetState.mockReturnValue({
      providerSettings: {
        google: { apiKey: 'sk-google-456', enabled: true },
        openai: { apiKey: '', enabled: true },
      },
      defaultProvider: 'anthropic',
    });

    const result = getDefaultEnhanceProvider();

    expect(result).toBe('google');
  });

  it('returns default provider when it is configured', () => {
    mockGetState.mockReturnValue({
      providerSettings: {
        anthropic: { apiKey: 'sk-ant-123', enabled: true },
        google: { apiKey: 'sk-google-456', enabled: true },
      },
      defaultProvider: 'google',
    });

    const result = getDefaultEnhanceProvider();

    expect(result).toBe('google');
  });

  it('returns first provider when default provider has no API key', () => {
    mockGetState.mockReturnValue({
      providerSettings: {
        anthropic: { apiKey: '', enabled: true },
        google: { apiKey: 'sk-google-456', enabled: true },
      },
      defaultProvider: 'anthropic',
    });

    const result = getDefaultEnhanceProvider();

    expect(result).toBe('google');
  });
});

describe('getEnhanceProviderApiKey', () => {
  beforeEach(() => {
    mockGetState.mockReset();
  });

  it('returns API key for anthropic provider', () => {
    mockGetState.mockReturnValue({
      providerSettings: {
        anthropic: { apiKey: 'sk-ant-123', enabled: true },
      },
    });

    const result = getEnhanceProviderApiKey('anthropic');

    expect(result).toBe('sk-ant-123');
  });

  it('returns API key for google provider', () => {
    mockGetState.mockReturnValue({
      providerSettings: {
        google: { apiKey: 'sk-google-456', enabled: true },
      },
    });

    const result = getEnhanceProviderApiKey('google');

    expect(result).toBe('sk-google-456');
  });

  it('returns API key for openai provider', () => {
    mockGetState.mockReturnValue({
      providerSettings: {
        openai: { apiKey: 'sk-open-789', enabled: true },
      },
    });

    const result = getEnhanceProviderApiKey('openai');

    expect(result).toBe('sk-open-789');
  });

  it('returns null when provider has no API key', () => {
    mockGetState.mockReturnValue({
      providerSettings: {
        anthropic: { apiKey: '', enabled: true },
      },
    });

    const result = getEnhanceProviderApiKey('anthropic');

    expect(result).toBeNull();
  });

  it('returns null when provider settings not found', () => {
    mockGetState.mockReturnValue({
      providerSettings: {},
    });

    const result = getEnhanceProviderApiKey('anthropic');

    expect(result).toBeNull();
  });
});

describe('buildEnhanceConfig', () => {
  beforeEach(() => {
    mockGetState.mockReset();
  });

  it('returns local mode config when no provider available', () => {
    mockGetState.mockReturnValue({
      providerSettings: {},
      defaultProvider: 'openai',
    });

    const result = buildEnhanceConfig();

    expect(result).toEqual({
      mode: 'local',
      quality: 'standard',
    });
  });

  it('returns api mode config with provider and key', () => {
    mockGetState.mockReturnValue({
      providerSettings: {
        anthropic: { apiKey: 'sk-ant-123', enabled: true },
      },
      defaultProvider: 'anthropic',
    });

    const result = buildEnhanceConfig();

    expect(result).toEqual({
      mode: 'api',
      provider: 'anthropic',
      api_key: 'sk-ant-123',
      quality: 'standard',
    });
  });

  it('uses specified provider when given', () => {
    mockGetState.mockReturnValue({
      providerSettings: {
        anthropic: { apiKey: 'sk-ant-123', enabled: true },
        google: { apiKey: 'sk-google-456', enabled: true },
      },
      defaultProvider: 'anthropic',
    });

    const result = buildEnhanceConfig('google');

    expect(result).toEqual({
      mode: 'api',
      provider: 'google',
      api_key: 'sk-google-456',
      quality: 'standard',
    });
  });

  it('respects quality parameter', () => {
    mockGetState.mockReturnValue({
      providerSettings: {
        anthropic: { apiKey: 'sk-ant-123', enabled: true },
      },
      defaultProvider: 'anthropic',
    });

    const result = buildEnhanceConfig(undefined, 'minimal');

    expect(result).toEqual({
      mode: 'api',
      provider: 'anthropic',
      api_key: 'sk-ant-123',
      quality: 'minimal',
    });
  });

  it('returns comprehensive quality option', () => {
    mockGetState.mockReturnValue({
      providerSettings: {
        anthropic: { apiKey: 'sk-ant-123', enabled: true },
      },
      defaultProvider: 'anthropic',
    });

    const result = buildEnhanceConfig(undefined, 'comprehensive');

    expect(result).toEqual({
      mode: 'api',
      provider: 'anthropic',
      api_key: 'sk-ant-123',
      quality: 'comprehensive',
    });
  });

  it('defaults to local mode when provider has no API key', () => {
    mockGetState.mockReturnValue({
      providerSettings: {
        anthropic: { apiKey: '', enabled: true },
      },
      defaultProvider: 'anthropic',
    });

    const result = buildEnhanceConfig();

    expect(result).toEqual({
      mode: 'local',
      quality: 'standard',
    });
  });
});

describe('hasEnhanceProvider', () => {
  beforeEach(() => {
    mockGetState.mockReset();
  });

  it('returns true when at least one provider is configured', () => {
    mockGetState.mockReturnValue({
      providerSettings: {
        anthropic: { apiKey: 'sk-ant-123', enabled: true },
      },
    });

    const result = hasEnhanceProvider();

    expect(result).toBe(true);
  });

  it('returns false when no providers are configured', () => {
    mockGetState.mockReturnValue({
      providerSettings: {
        anthropic: { apiKey: '', enabled: true },
        google: { apiKey: '', enabled: true },
        openai: { apiKey: '', enabled: true },
      },
    });

    const result = hasEnhanceProvider();

    expect(result).toBe(false);
  });

  it('returns false when providerSettings is empty', () => {
    mockGetState.mockReturnValue({
      providerSettings: {},
    });

    const result = hasEnhanceProvider();

    expect(result).toBe(false);
  });
});

describe('getProviderDisplayInfo', () => {
  it('returns correct info for anthropic', () => {
    const result = getProviderDisplayInfo('anthropic');

    expect(result).toEqual({
      name: 'Anthropic (Claude)',
      icon: '🤖',
    });
  });

  it('returns correct info for google', () => {
    const result = getProviderDisplayInfo('google');

    expect(result).toEqual({
      name: 'Google (Gemini)',
      icon: '✨',
    });
  });

  it('returns correct info for openai', () => {
    const result = getProviderDisplayInfo('openai');

    expect(result).toEqual({
      name: 'OpenAI (GPT)',
      icon: '🧠',
    });
  });

  it('returns generic info for unknown providers', () => {
    const result = getProviderDisplayInfo('unknown' as unknown as import('@/lib/native/skill-seekers').EnhanceProvider);

    expect(result).toEqual({
      name: 'unknown',
      icon: '🔧',
    });
  });

  it('always returns name and icon properties', () => {
    const providers: Array<'anthropic' | 'google' | 'openai'> = ['anthropic', 'google', 'openai'];

    providers.forEach((provider) => {
      const result = getProviderDisplayInfo(provider);
      expect(result).toHaveProperty('name');
      expect(result).toHaveProperty('icon');
      expect(typeof result.name).toBe('string');
      expect(typeof result.icon).toBe('string');
    });
  });
});
