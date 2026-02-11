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

  describe('preferred provider', () => {
    it('returns preferred provider when it has an API key', () => {
      const result = getPresetAIConfig(providerSettings, 'anthropic');
      expect(result).toEqual<PresetAIConfig>({
        provider: 'anthropic',
        apiKey: 'sk-anthropic-key',
        baseURL: 'https://api.anthropic.com',
      });
    });

    it('resolves "auto" to "openai"', () => {
      const result = getPresetAIConfig(providerSettings, 'auto');
      expect(result).toEqual<PresetAIConfig>({
        provider: 'openai',
        apiKey: 'sk-openai-key',
        baseURL: 'https://api.openai.com',
      });
    });

    it('falls back to openai when preferred provider has no key', () => {
      const result = getPresetAIConfig(providerSettings, 'google');
      expect(result).toEqual<PresetAIConfig>({
        provider: 'openai',
        apiKey: 'sk-openai-key',
        baseURL: 'https://api.openai.com',
      });
    });

    it('falls back to openai when preferred provider is undefined', () => {
      const result = getPresetAIConfig(providerSettings, 'deepseek');
      expect(result).toEqual<PresetAIConfig>({
        provider: 'openai',
        apiKey: 'sk-openai-key',
        baseURL: 'https://api.openai.com',
      });
    });
  });

  describe('no preferred provider', () => {
    it('falls back to openai when no preferred provider given', () => {
      const result = getPresetAIConfig(providerSettings);
      expect(result).toEqual<PresetAIConfig>({
        provider: 'openai',
        apiKey: 'sk-openai-key',
        baseURL: 'https://api.openai.com',
      });
    });

    it('falls back to openai with undefined preferredProvider', () => {
      const result = getPresetAIConfig(providerSettings, undefined);
      expect(result).toEqual<PresetAIConfig>({
        provider: 'openai',
        apiKey: 'sk-openai-key',
        baseURL: 'https://api.openai.com',
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
      expect(result).toEqual<PresetAIConfig>({
        provider: 'anthropic',
        apiKey: 'sk-anthropic-key',
        baseURL: 'https://api.anthropic.com',
      });
    });

    it('falls back to any provider when preferred and openai both lack keys', () => {
      const settings = {
        openai: { apiKey: '' },
        google: { apiKey: '' },
        deepseek: { apiKey: 'sk-deepseek-key', baseURL: 'https://api.deepseek.com' },
      };
      const result = getPresetAIConfig(settings, 'google');
      expect(result).toEqual<PresetAIConfig>({
        provider: 'deepseek',
        apiKey: 'sk-deepseek-key',
        baseURL: 'https://api.deepseek.com',
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
      expect(result).toEqual<PresetAIConfig>({
        provider: 'openai',
        apiKey: 'sk-key',
        baseURL: undefined,
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
  });
});
