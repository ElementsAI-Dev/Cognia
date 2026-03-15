/**
 * Tests for getPresetAIConfig utility
 */

import { getPresetAIConfig, type PresetAIConfig } from './get-ai-config';

describe('getPresetAIConfig', () => {
  const providerSettings = {
    openai: { apiKey: 'sk-openai-key', baseURL: 'https://api.openai.com' },
    anthropic: { apiKey: 'sk-anthropic-key', baseURL: 'https://api.anthropic.com' },
    google: { apiKey: '', baseURL: undefined },
    deepseek: undefined,
  };

  function expectResolvedConfig(result: PresetAIConfig | null, expected: Partial<PresetAIConfig>) {
    expect(result).toEqual(
      expect.objectContaining({
        isCustomProvider: false,
        useProxy: true,
        ...expected,
      })
    );
  }

  describe('preferred provider', () => {
    it('returns preferred provider when it has an API key', () => {
      const result = getPresetAIConfig(providerSettings, 'anthropic');
      expectResolvedConfig(result, {
        provider: 'anthropic',
        model: 'claude-sonnet-4-20250514',
        apiKey: 'sk-anthropic-key',
        baseURL: 'https://api.anthropic.com',
        protocol: 'anthropic',
      });
    });

    it('resolves "auto" to "openai"', () => {
      const result = getPresetAIConfig(providerSettings, 'auto');
      expectResolvedConfig(result, {
        provider: 'openai',
        model: 'gpt-4o',
        apiKey: 'sk-openai-key',
        baseURL: 'https://api.openai.com',
        protocol: 'openai',
      });
    });

    it('falls back to openai when preferred provider has no key', () => {
      const result = getPresetAIConfig(providerSettings, 'google');
      expectResolvedConfig(result, {
        provider: 'openai',
        model: 'gpt-4o',
        apiKey: 'sk-openai-key',
        baseURL: 'https://api.openai.com',
        protocol: 'openai',
      });
    });

    it('falls back to openai when preferred provider is undefined', () => {
      const result = getPresetAIConfig(providerSettings, 'deepseek');
      expectResolvedConfig(result, {
        provider: 'openai',
        model: 'gpt-4o',
        apiKey: 'sk-openai-key',
        baseURL: 'https://api.openai.com',
        protocol: 'openai',
      });
    });
  });

  describe('no preferred provider', () => {
    it('falls back to openai when no preferred provider given', () => {
      const result = getPresetAIConfig(providerSettings);
      expectResolvedConfig(result, {
        provider: 'openai',
        model: 'gpt-4o',
        apiKey: 'sk-openai-key',
        baseURL: 'https://api.openai.com',
        protocol: 'openai',
      });
    });

    it('falls back to openai with undefined preferredProvider', () => {
      const result = getPresetAIConfig(providerSettings, undefined);
      expectResolvedConfig(result, {
        provider: 'openai',
        model: 'gpt-4o',
        apiKey: 'sk-openai-key',
        baseURL: 'https://api.openai.com',
        protocol: 'openai',
      });
    });
  });

  describe('fallback to any provider', () => {
    it('falls back to any provider with a key when openai has no key', () => {
      const settings = {
        openai: { apiKey: '', baseURL: undefined },
        anthropic: { apiKey: 'sk-anthropic-key', baseURL: 'https://api.anthropic.com' },
      };
      const result = getPresetAIConfig(settings);
      expectResolvedConfig(result, {
        provider: 'anthropic',
        model: 'claude-sonnet-4-20250514',
        apiKey: 'sk-anthropic-key',
        baseURL: 'https://api.anthropic.com',
        protocol: 'anthropic',
      });
    });

    it('falls back to any provider when preferred and openai both lack keys', () => {
      const settings = {
        openai: { apiKey: '' },
        google: { apiKey: '' },
        deepseek: { apiKey: 'sk-deepseek-key', baseURL: 'https://api.deepseek.com' },
      };
      const result = getPresetAIConfig(settings, 'google');
      expectResolvedConfig(result, {
        provider: 'deepseek',
        model: 'deepseek-chat',
        apiKey: 'sk-deepseek-key',
        baseURL: 'https://api.deepseek.com',
        protocol: 'openai',
      });
    });
  });

  describe('no keys available', () => {
    it('returns null when no provider has an API key', () => {
      const settings = {
        openai: { apiKey: '' },
        anthropic: { apiKey: '' },
      };
      const result = getPresetAIConfig(settings);
      expect(result).toBeNull();
    });

    it('returns null for empty settings', () => {
      const result = getPresetAIConfig({});
      expect(result).toBeNull();
    });

    it('returns null when all providers are undefined', () => {
      const settings = {
        openai: undefined,
        anthropic: undefined,
      };
      const result = getPresetAIConfig(settings);
      expect(result).toBeNull();
    });
  });

  describe('edge cases', () => {
    it('handles baseURL being undefined', () => {
      const settings = { openai: { apiKey: 'sk-key' } };
      const result = getPresetAIConfig(settings);
      expectResolvedConfig(result, {
        provider: 'openai',
        model: 'gpt-4o',
        apiKey: 'sk-key',
        baseURL: undefined,
        protocol: 'openai',
      });
    });

    it('handles unknown preferred provider gracefully', () => {
      const result = getPresetAIConfig(providerSettings, 'unknown-provider');
      // Should fall back to openai
      expect(result?.provider).toBe('openai');
    });

    it('handles empty string preferred provider', () => {
      const result = getPresetAIConfig(providerSettings, '');
      // Empty string is falsy, should fall back to openai
      expect(result?.provider).toBe('openai');
    });

    it('uses the configured default provider when provided through the shared snapshot', () => {
      const result = getPresetAIConfig(
        providerSettings,
        undefined,
        {
          defaultProvider: 'anthropic',
        }
      );

      expect(result).toEqual<PresetAIConfig>({
        provider: 'anthropic',
        model: 'claude-sonnet-4-20250514',
        apiKey: 'sk-anthropic-key',
        baseURL: 'https://api.anthropic.com',
        protocol: 'anthropic',
        isCustomProvider: false,
        useProxy: true,
      });
    });

    it('supports configured custom providers through the shared resolver', () => {
      const result = getPresetAIConfig(
        providerSettings,
        'custom-openai',
        {
          customProviders: {
            'custom-openai': {
              baseURL: 'https://custom.example.com/v1',
              apiKey: 'sk-custom',
              apiProtocol: 'openai',
              defaultModel: 'custom-model',
              enabled: true,
            },
          },
        }
      );

      expect(result).toEqual<PresetAIConfig>({
        provider: 'custom-openai',
        model: 'custom-model',
        apiKey: 'sk-custom',
        baseURL: 'https://custom.example.com/v1',
        protocol: 'openai',
        isCustomProvider: true,
        useProxy: true,
      });
    });
  });
});
