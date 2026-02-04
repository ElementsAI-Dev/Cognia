/**
 * Tests for Provider helper functions
 */

import React from 'react';
import {
  getProviderDashboardUrl,
  getProviderDescription,
  getCategoryIcon,
  CATEGORY_CONFIG,
  PROVIDER_CATEGORIES,
  type ProviderCategory,
} from './provider-helpers';

describe('getProviderDashboardUrl', () => {
  describe('cloud providers', () => {
    it('should return correct URL for OpenAI', () => {
      expect(getProviderDashboardUrl('openai')).toBe('https://platform.openai.com/api-keys');
    });

    it('should return correct URL for Anthropic', () => {
      expect(getProviderDashboardUrl('anthropic')).toBe('https://console.anthropic.com/settings/keys');
    });

    it('should return correct URL for Google', () => {
      expect(getProviderDashboardUrl('google')).toBe('https://aistudio.google.com/app/apikey');
    });

    it('should return correct URL for OpenRouter', () => {
      expect(getProviderDashboardUrl('openrouter')).toBe('https://openrouter.ai/keys');
    });

    it('should return correct URL for DeepSeek', () => {
      expect(getProviderDashboardUrl('deepseek')).toBe('https://platform.deepseek.com/api_keys');
    });

    it('should return correct URL for Groq', () => {
      expect(getProviderDashboardUrl('groq')).toBe('https://console.groq.com/keys');
    });
  });

  describe('local providers', () => {
    it('should return correct URL for Ollama', () => {
      expect(getProviderDashboardUrl('ollama')).toBe('https://ollama.ai');
    });

    it('should return correct URL for LM Studio', () => {
      expect(getProviderDashboardUrl('lmstudio')).toBe('https://lmstudio.ai');
    });

    it('should return correct URL for vLLM', () => {
      expect(getProviderDashboardUrl('vllm')).toBe('https://docs.vllm.ai');
    });

    it('should return correct URL for llama.cpp', () => {
      expect(getProviderDashboardUrl('llamacpp')).toBe('https://github.com/ggerganov/llama.cpp');
    });
  });

  describe('proxy providers', () => {
    it('should return correct URL for CLIProxyAPI', () => {
      expect(getProviderDashboardUrl('cliproxyapi')).toBe('http://localhost:8317/management.html');
    });
  });

  it('should return # for unknown provider', () => {
    expect(getProviderDashboardUrl('unknown-provider')).toBe('#');
  });
});

describe('getProviderDescription', () => {
  describe('flagship providers', () => {
    it('should return description for OpenAI', () => {
      const desc = getProviderDescription('openai');
      expect(desc).toContain('GPT');
    });

    it('should return description for Anthropic', () => {
      const desc = getProviderDescription('anthropic');
      expect(desc).toContain('Claude');
    });

    it('should return description for Google', () => {
      const desc = getProviderDescription('google');
      expect(desc).toContain('Gemini');
    });
  });

  describe('specialized providers', () => {
    it('should return description for DeepSeek', () => {
      const desc = getProviderDescription('deepseek');
      expect(desc).toContain('DeepSeek');
    });

    it('should return description for Groq', () => {
      const desc = getProviderDescription('groq');
      expect(desc.toLowerCase()).toContain('fast');
    });
  });

  describe('local providers', () => {
    it('should return description for Ollama', () => {
      const desc = getProviderDescription('ollama');
      expect(desc.toLowerCase()).toContain('local');
    });

    it('should return description for LM Studio', () => {
      const desc = getProviderDescription('lmstudio');
      expect(desc.toLowerCase()).toContain('local');
    });
  });

  it('should return empty string for unknown provider', () => {
    expect(getProviderDescription('unknown-provider')).toBe('');
  });
});

describe('getCategoryIcon', () => {
  it('should return icon for flagship category', () => {
    const icon = getCategoryIcon('flagship');
    expect(icon).toBeDefined();
    expect(React.isValidElement(icon)).toBe(true);
  });

  it('should return icon for aggregator category', () => {
    const icon = getCategoryIcon('aggregator');
    expect(icon).toBeDefined();
    expect(React.isValidElement(icon)).toBe(true);
  });

  it('should return icon for specialized category', () => {
    const icon = getCategoryIcon('specialized');
    expect(icon).toBeDefined();
    expect(React.isValidElement(icon)).toBe(true);
  });

  it('should return icon for local category', () => {
    const icon = getCategoryIcon('local');
    expect(icon).toBeDefined();
    expect(React.isValidElement(icon)).toBe(true);
  });

  it('should return default icon for undefined category', () => {
    const icon = getCategoryIcon(undefined);
    expect(icon).toBeDefined();
    expect(React.isValidElement(icon)).toBe(true);
  });

  it('should return default icon for unknown category', () => {
    const icon = getCategoryIcon('unknown');
    expect(icon).toBeDefined();
    expect(React.isValidElement(icon)).toBe(true);
  });
});

describe('CATEGORY_CONFIG', () => {
  const expectedCategories: ProviderCategory[] = ['all', 'flagship', 'aggregator', 'specialized', 'local'];

  it('should have all expected categories', () => {
    expectedCategories.forEach((category) => {
      expect(CATEGORY_CONFIG[category]).toBeDefined();
    });
  });

  it('should have label for each category', () => {
    expectedCategories.forEach((category) => {
      expect(CATEGORY_CONFIG[category].label).toBeDefined();
      expect(CATEGORY_CONFIG[category].label.length).toBeGreaterThan(0);
    });
  });

  it('should have description for each category', () => {
    expectedCategories.forEach((category) => {
      expect(CATEGORY_CONFIG[category].description).toBeDefined();
      expect(CATEGORY_CONFIG[category].description.length).toBeGreaterThan(0);
    });
  });

  it('should have icon for non-all categories', () => {
    expectedCategories.filter((c) => c !== 'all').forEach((category) => {
      const icon = CATEGORY_CONFIG[category].icon;
      expect(icon === null || React.isValidElement(icon)).toBe(true);
    });
  });

  it('should have null icon for all category', () => {
    expect(CATEGORY_CONFIG.all.icon).toBeNull();
  });
});

describe('PROVIDER_CATEGORIES', () => {
  describe('flagship providers', () => {
    const flagshipProviders = ['openai', 'anthropic', 'google', 'xai'];
    it.each(flagshipProviders)('%s should be in flagship category', (provider) => {
      expect(PROVIDER_CATEGORIES[provider]).toBe('flagship');
    });
  });

  describe('aggregator providers', () => {
    const aggregatorProviders = ['openrouter', 'cliproxyapi', 'togetherai'];
    it.each(aggregatorProviders)('%s should be in aggregator category', (provider) => {
      expect(PROVIDER_CATEGORIES[provider]).toBe('aggregator');
    });
  });

  describe('specialized providers', () => {
    const specializedProviders = ['groq', 'cerebras', 'deepseek', 'fireworks', 'mistral', 'cohere', 'sambanova'];
    it.each(specializedProviders)('%s should be in specialized category', (provider) => {
      expect(PROVIDER_CATEGORIES[provider]).toBe('specialized');
    });
  });

  describe('local providers', () => {
    const localProviders = [
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
    it.each(localProviders)('%s should be in local category', (provider) => {
      expect(PROVIDER_CATEGORIES[provider]).toBe('local');
    });
  });
});
