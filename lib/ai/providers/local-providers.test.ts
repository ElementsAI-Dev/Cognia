/**
 * Tests for local provider clients
 */

import {
  LOCAL_PROVIDER_CONFIGS,
  normalizeBaseUrl,
  getDefaultBaseURL,
  isLocalProvider,
  getLocalProviderIds,
} from '@/lib/ai/providers/local-providers';

describe('local-providers', () => {
  describe('LOCAL_PROVIDER_CONFIGS', () => {
    it('should have all expected local providers', () => {
      const expectedProviders = [
        'ollama',
        'lmstudio',
        'llamacpp',
        'llamafile',
        'vllm',
        'localai',
        'jan',
        'textgenwebui',
        'koboldcpp',
        'tabbyapi',
      ];

      expectedProviders.forEach((provider) => {
        expect(LOCAL_PROVIDER_CONFIGS[provider]).toBeDefined();
        expect(LOCAL_PROVIDER_CONFIGS[provider].id).toBe(provider);
        expect(LOCAL_PROVIDER_CONFIGS[provider].name).toBeDefined();
        expect(LOCAL_PROVIDER_CONFIGS[provider].defaultPort).toBeGreaterThan(0);
        expect(LOCAL_PROVIDER_CONFIGS[provider].defaultBaseURL).toContain('localhost');
      });
    });

    it('should have correct default ports', () => {
      expect(LOCAL_PROVIDER_CONFIGS.ollama.defaultPort).toBe(11434);
      expect(LOCAL_PROVIDER_CONFIGS.lmstudio.defaultPort).toBe(1234);
      expect(LOCAL_PROVIDER_CONFIGS.llamacpp.defaultPort).toBe(8080);
      expect(LOCAL_PROVIDER_CONFIGS.vllm.defaultPort).toBe(8000);
      expect(LOCAL_PROVIDER_CONFIGS.jan.defaultPort).toBe(1337);
    });

    it('should have website URLs for all providers', () => {
      Object.values(LOCAL_PROVIDER_CONFIGS).forEach((config) => {
        expect(config.website).toMatch(/^https?:\/\//);
      });
    });
  });

  describe('normalizeBaseUrl', () => {
    it('should remove trailing slashes', () => {
      expect(normalizeBaseUrl('http://localhost:8080/')).toBe('http://localhost:8080');
      expect(normalizeBaseUrl('http://localhost:8080///')).toBe('http://localhost:8080');
    });

    it('should remove /v1 suffix', () => {
      expect(normalizeBaseUrl('http://localhost:8080/v1')).toBe('http://localhost:8080');
      expect(normalizeBaseUrl('http://localhost:8080/v1/')).toBe('http://localhost:8080');
    });

    it('should trim whitespace', () => {
      expect(normalizeBaseUrl('  http://localhost:8080  ')).toBe('http://localhost:8080');
    });

    it('should handle clean URLs', () => {
      expect(normalizeBaseUrl('http://localhost:8080')).toBe('http://localhost:8080');
    });
  });

  describe('getDefaultBaseURL', () => {
    it('should return correct default URLs for known providers', () => {
      expect(getDefaultBaseURL('ollama')).toBe('http://localhost:11434');
      expect(getDefaultBaseURL('lmstudio')).toBe('http://localhost:1234');
      expect(getDefaultBaseURL('vllm')).toBe('http://localhost:8000');
    });

    it('should return fallback for unknown providers', () => {
      expect(getDefaultBaseURL('unknown')).toBe('http://localhost:8080');
    });
  });

  describe('isLocalProvider', () => {
    it('should return true for local providers', () => {
      expect(isLocalProvider('ollama')).toBe(true);
      expect(isLocalProvider('lmstudio')).toBe(true);
      expect(isLocalProvider('vllm')).toBe(true);
    });

    it('should return false for cloud providers', () => {
      expect(isLocalProvider('openai')).toBe(false);
      expect(isLocalProvider('anthropic')).toBe(false);
      expect(isLocalProvider('unknown')).toBe(false);
    });
  });

  describe('getLocalProviderIds', () => {
    it('should return all local provider IDs', () => {
      const ids = getLocalProviderIds();
      expect(ids).toContain('ollama');
      expect(ids).toContain('lmstudio');
      expect(ids).toContain('vllm');
      expect(ids).toContain('llamacpp');
      expect(ids.length).toBeGreaterThanOrEqual(10);
    });
  });
});
