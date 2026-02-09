/**
 * Tests for unified AI Model/Provider Icon Utilities
 */

import {
  getProviderIconInfo,
  getProviderIconPath,
  getProviderBrandColor,
  getProviderDisplayName,
  resolveProviderFromModel,
  getModelDisplayName,
  getProviderInitial,
  hasLocalProviderIcon,
  getAllProviderIds,
} from './icons';

describe('getProviderIconInfo', () => {
  it('returns correct info for known providers', () => {
    const info = getProviderIconInfo('openai');
    expect(info.name).toBe('OpenAI');
    expect(info.localIcon).toBe('/icons/providers/openai.svg');
    expect(info.brandColor).toBe('#10a37f');
    expect(info.hasLocalIcon).toBe(true);
  });

  it('is case-insensitive', () => {
    const info = getProviderIconInfo('OpenAI');
    expect(info.name).toBe('OpenAI');
    expect(info.hasLocalIcon).toBe(true);
  });

  it('returns fallback for unknown providers', () => {
    const info = getProviderIconInfo('unknown-provider');
    expect(info.name).toBe('unknown-provider');
    expect(info.localIcon).toBe('/icons/providers/unknown-provider.svg');
    expect(info.brandColor).toBe('#6b7280');
    expect(info.hasLocalIcon).toBe(false);
  });

  it('returns correct info for all registered providers', () => {
    const providers = ['anthropic', 'google', 'deepseek', 'groq', 'mistral', 'xai', 'togetherai', 'openrouter', 'cohere', 'fireworks', 'cerebras', 'sambanova', 'ollama', 'lmstudio', 'vllm'];
    for (const provider of providers) {
      const info = getProviderIconInfo(provider);
      expect(info.hasLocalIcon).toBe(true);
      expect(info.localIcon).toContain(provider);
      expect(info.name.length).toBeGreaterThan(0);
    }
  });
});

describe('getProviderIconPath', () => {
  it('returns local path for known providers', () => {
    expect(getProviderIconPath('openai')).toBe('/icons/providers/openai.svg');
    expect(getProviderIconPath('anthropic')).toBe('/icons/providers/anthropic.svg');
  });

  it('returns CDN URL for unknown providers', () => {
    const path = getProviderIconPath('some-new-provider');
    expect(path).toContain('https://models.dev/logos/');
    expect(path).toContain('some-new-provider');
  });
});

describe('getProviderBrandColor', () => {
  it('returns brand color for known providers', () => {
    expect(getProviderBrandColor('openai')).toBe('#10a37f');
    expect(getProviderBrandColor('anthropic')).toBe('#d4a574');
    expect(getProviderBrandColor('google')).toBe('#4285f4');
  });

  it('returns gray for unknown providers', () => {
    expect(getProviderBrandColor('unknown')).toBe('#6b7280');
  });
});

describe('getProviderDisplayName', () => {
  it('returns display name for known providers', () => {
    expect(getProviderDisplayName('openai')).toBe('OpenAI');
    expect(getProviderDisplayName('anthropic')).toBe('Anthropic');
    expect(getProviderDisplayName('google')).toBe('Google AI');
    expect(getProviderDisplayName('xai')).toBe('xAI');
  });

  it('returns raw ID for unknown providers', () => {
    expect(getProviderDisplayName('custom-provider')).toBe('custom-provider');
  });
});

describe('resolveProviderFromModel', () => {
  it('resolves OpenAI models', () => {
    expect(resolveProviderFromModel('gpt-4o')).toBe('openai');
    expect(resolveProviderFromModel('gpt-3.5-turbo')).toBe('openai');
    expect(resolveProviderFromModel('o1-preview')).toBe('openai');
    expect(resolveProviderFromModel('o3-mini')).toBe('openai');
  });

  it('resolves Anthropic models', () => {
    expect(resolveProviderFromModel('claude-3-5-sonnet-20241022')).toBe('anthropic');
    expect(resolveProviderFromModel('claude-sonnet-4-20250514')).toBe('anthropic');
  });

  it('resolves Google models', () => {
    expect(resolveProviderFromModel('gemini-2.0-flash')).toBe('google');
    expect(resolveProviderFromModel('gemini-1.5-pro')).toBe('google');
    expect(resolveProviderFromModel('gemma-7b')).toBe('google');
  });

  it('resolves DeepSeek models', () => {
    expect(resolveProviderFromModel('deepseek-chat')).toBe('deepseek');
    expect(resolveProviderFromModel('deepseek-coder')).toBe('deepseek');
  });

  it('resolves xAI models', () => {
    expect(resolveProviderFromModel('grok-3')).toBe('xai');
    expect(resolveProviderFromModel('grok-3-mini')).toBe('xai');
  });

  it('resolves Mistral models', () => {
    expect(resolveProviderFromModel('mistral-large-latest')).toBe('mistral');
    expect(resolveProviderFromModel('mixtral-8x7b-32768')).toBe('mistral');
    expect(resolveProviderFromModel('codestral-latest')).toBe('mistral');
  });

  it('resolves Cohere models', () => {
    expect(resolveProviderFromModel('command-r-plus')).toBe('cohere');
  });

  it('returns null for unknown models', () => {
    expect(resolveProviderFromModel('some-custom-model')).toBeNull();
    expect(resolveProviderFromModel('')).toBeNull();
  });
});

describe('getModelDisplayName', () => {
  it('returns display name for known models', () => {
    expect(getModelDisplayName('gpt-4o')).toBe('GPT-4o');
    expect(getModelDisplayName('gpt-4o-mini')).toBe('GPT-4o Mini');
    expect(getModelDisplayName('claude-sonnet-4-20250514')).toBe('Claude Sonnet 4');
    expect(getModelDisplayName('deepseek-chat')).toBe('DeepSeek Chat');
    expect(getModelDisplayName('grok-3-mini')).toBe('Grok 3 Mini');
  });

  it('returns raw model ID for unknown models', () => {
    expect(getModelDisplayName('custom-model-v2')).toBe('custom-model-v2');
  });
});

describe('getProviderInitial', () => {
  it('returns first letter of provider name', () => {
    expect(getProviderInitial('openai')).toBe('O');
    expect(getProviderInitial('anthropic')).toBe('A');
    expect(getProviderInitial('google')).toBe('G');
    expect(getProviderInitial('deepseek')).toBe('D');
  });

  it('returns first letter of raw ID for unknown providers', () => {
    expect(getProviderInitial('custom')).toBe('C');
  });
});

describe('hasLocalProviderIcon', () => {
  it('returns true for known providers', () => {
    expect(hasLocalProviderIcon('openai')).toBe(true);
    expect(hasLocalProviderIcon('anthropic')).toBe(true);
    expect(hasLocalProviderIcon('google')).toBe(true);
  });

  it('returns false for unknown providers', () => {
    expect(hasLocalProviderIcon('unknown')).toBe(false);
  });
});

describe('getAllProviderIds', () => {
  it('returns array of all registered provider IDs', () => {
    const ids = getAllProviderIds();
    expect(ids).toContain('openai');
    expect(ids).toContain('anthropic');
    expect(ids).toContain('google');
    expect(ids).toContain('deepseek');
    expect(ids.length).toBeGreaterThanOrEqual(16);
  });
});
