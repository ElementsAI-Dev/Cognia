/**
 * Tests for OpenRouter configuration helpers
 */

import {
  BYOK_PROVIDERS,
  getConfigPlaceholder,
  getConfigHelp,
  type BYOKProviderConfig,
} from './openrouter-config';

describe('BYOK_PROVIDERS', () => {
  it('should have all expected BYOK providers', () => {
    const expectedProviders = [
      'openai',
      'anthropic',
      'google',
      'mistral',
      'cohere',
      'groq',
      'azure',
      'bedrock',
      'vertex',
    ];

    const providerIds = BYOK_PROVIDERS.map((p) => p.id);
    expectedProviders.forEach((id) => {
      expect(providerIds).toContain(id);
    });
    expect(BYOK_PROVIDERS.length).toBe(expectedProviders.length);
  });

  it('should have correct config types for each provider', () => {
    const simpleProviders = ['openai', 'anthropic', 'google', 'mistral', 'cohere', 'groq'];
    const complexProviders = {
      azure: 'azure',
      bedrock: 'bedrock',
      vertex: 'vertex',
    };

    simpleProviders.forEach((id) => {
      const provider = BYOK_PROVIDERS.find((p) => p.id === id);
      expect(provider?.configType).toBe('simple');
    });

    Object.entries(complexProviders).forEach(([id, configType]) => {
      const provider = BYOK_PROVIDERS.find((p) => p.id === id);
      expect(provider?.configType).toBe(configType);
    });
  });

  it('should have required fields for all providers', () => {
    BYOK_PROVIDERS.forEach((provider: BYOKProviderConfig) => {
      expect(provider.id).toBeDefined();
      expect(provider.name).toBeDefined();
      expect(provider.name.length).toBeGreaterThan(0);
      expect(provider.description).toBeDefined();
      expect(provider.description.length).toBeGreaterThan(0);
      expect(provider.configType).toBeDefined();
      expect(['simple', 'azure', 'bedrock', 'vertex']).toContain(provider.configType);
    });
  });
});

describe('getConfigPlaceholder', () => {
  it('should return Azure placeholder for azure config type', () => {
    const placeholder = getConfigPlaceholder('azure');
    expect(placeholder).toContain('model_slug');
    expect(placeholder).toContain('endpoint_url');
    expect(placeholder).toContain('api_key');
    expect(placeholder).toContain('model_id');
    expect(placeholder).toContain('openai.azure.com');
  });

  it('should return Bedrock placeholder for bedrock config type', () => {
    const placeholder = getConfigPlaceholder('bedrock');
    expect(placeholder).toContain('Option 1');
    expect(placeholder).toContain('Option 2');
    expect(placeholder).toContain('accessKeyId');
    expect(placeholder).toContain('secretAccessKey');
    expect(placeholder).toContain('region');
  });

  it('should return Vertex placeholder for vertex config type', () => {
    const placeholder = getConfigPlaceholder('vertex');
    expect(placeholder).toContain('service_account');
    expect(placeholder).toContain('project_id');
    expect(placeholder).toContain('private_key');
    expect(placeholder).toContain('client_email');
  });

  it('should return empty string for simple config type', () => {
    expect(getConfigPlaceholder('simple')).toBe('');
  });

  it('should return empty string for undefined config type', () => {
    expect(getConfigPlaceholder(undefined)).toBe('');
  });

  it('should return empty string for unknown config type', () => {
    expect(getConfigPlaceholder('unknown')).toBe('');
  });
});

describe('getConfigHelp', () => {
  it('should return Azure help text for azure config type', () => {
    const help = getConfigHelp('azure');
    expect(help).toContain('Azure');
    expect(help).toContain('JSON');
  });

  it('should return Bedrock help text for bedrock config type', () => {
    const help = getConfigHelp('bedrock');
    expect(help).toContain('Bedrock');
    expect(help).toContain('API key');
    expect(help).toContain('credentials');
  });

  it('should return Vertex help text for vertex config type', () => {
    const help = getConfigHelp('vertex');
    expect(help).toContain('Google Cloud');
    expect(help).toContain('service account');
  });

  it('should return empty string for simple config type', () => {
    expect(getConfigHelp('simple')).toBe('');
  });

  it('should return empty string for undefined config type', () => {
    expect(getConfigHelp(undefined)).toBe('');
  });

  it('should return empty string for unknown config type', () => {
    expect(getConfigHelp('unknown')).toBe('');
  });
});
