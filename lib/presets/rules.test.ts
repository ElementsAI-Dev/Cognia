/**
 * Tests for shared preset rules.
 */

import {
  normalizePresetInput,
  resolveProviderModel,
  validatePresetDraft,
} from './rules';

describe('validatePresetDraft', () => {
  it('returns errors for missing required fields', () => {
    const result = validatePresetDraft({
      name: '   ',
      provider: null,
      model: '',
    });

    expect(result.valid).toBe(false);
    expect(result.fieldErrors).toEqual({
      name: 'nameRequired',
      provider: 'providerRequired',
      model: 'modelRequired',
    });
    expect(result.firstError).toBe('nameRequired');
  });

  it('validates maxTokens as a positive number', () => {
    const result = validatePresetDraft({
      name: 'Preset',
      provider: 'openai',
      model: 'gpt-4o',
      maxTokens: 0,
    });

    expect(result.valid).toBe(false);
    expect(result.fieldErrors.maxTokens).toBe('maxTokensInvalid');
  });

  it('passes valid draft input', () => {
    const result = validatePresetDraft({
      name: 'Preset',
      provider: 'openai',
      model: 'gpt-4o',
      maxTokens: 512,
    });

    expect(result.valid).toBe(true);
    expect(result.fieldErrors).toEqual({});
  });
});

describe('resolveProviderModel', () => {
  it('falls back to auto when provider is disabled', () => {
    const result = resolveProviderModel({
      provider: 'anthropic',
      model: 'claude-sonnet-4-20250514',
      providerSettings: {
        anthropic: { enabled: false, apiKey: 'x' },
        openai: { enabled: true, apiKey: 'x' },
      },
    });

    expect(result.provider).toBe('auto');
    expect(result.model).toBe('gpt-4o');
    expect(result.adjustment?.code).toBe('providerFallback');
  });

  it('falls back to provider default model when model is unavailable', () => {
    const result = resolveProviderModel({
      provider: 'openai',
      model: 'not-a-real-model',
      providerSettings: {
        openai: { enabled: true, apiKey: 'x' },
      },
    });

    expect(result.provider).toBe('openai');
    expect(result.model).toBe('gpt-4o');
    expect(result.adjustment?.code).toBe('modelFallback');
  });
});

describe('normalizePresetInput', () => {
  it('normalizes and clamps numeric fields', () => {
    const result = normalizePresetInput(
      {
        name: '  New Preset  ',
        provider: 'openai',
        model: 'gpt-4o',
        temperature: 3,
        maxTokens: -5,
        mode: 'unknown-mode',
      },
      {
        openai: { enabled: true, apiKey: 'x' },
      },
    );

    expect(result.normalized.name).toBe('New Preset');
    expect(result.normalized.temperature).toBe(2);
    expect(result.normalized.maxTokens).toBeUndefined();
    expect(result.normalized.mode).toBe('chat');
  });

  it('normalizes builtin prompts and strips empty entries', () => {
    const result = normalizePresetInput(
      {
        name: 'Preset',
        provider: 'openai',
        model: 'gpt-4o',
        builtinPrompts: [
          { name: '  ', content: ' ' },
          { name: 'Ask', content: 'Explain this', description: '  test  ' },
        ],
      },
      {
        openai: { enabled: true, apiKey: 'x' },
      },
    );

    expect(result.normalized.builtinPrompts).toHaveLength(1);
    expect(result.normalized.builtinPrompts?.[0].name).toBe('Ask');
    expect(result.normalized.builtinPrompts?.[0].description).toBe('test');
  });

  it('returns compatibility adjustment when model fallback is applied', () => {
    const result = normalizePresetInput(
      {
        name: 'Preset',
        provider: 'openai',
        model: 'invalid-model',
      },
      {
        openai: { enabled: true, apiKey: 'x' },
      },
    );

    expect(result.normalized.provider).toBe('openai');
    expect(result.normalized.model).toBe('gpt-4o');
    expect(result.adjustment?.code).toBe('modelFallback');
  });
});
