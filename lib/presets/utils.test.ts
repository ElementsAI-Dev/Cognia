/**
 * @jest-environment jsdom
 */

/**
 * Tests for lib/presets/utils
 */

import { getModeLabel, getAvailableModels, getEnabledProviders } from './utils';

// --- getModeLabel ---

describe('getModeLabel', () => {
  const mockT = jest.fn((key: string) => `translated_${key}`);

  beforeEach(() => {
    mockT.mockClear();
  });

  it('returns translated label for "chat"', () => {
    const result = getModeLabel('chat', mockT);
    expect(mockT).toHaveBeenCalledWith('modeChat');
    expect(result).toBe('translated_modeChat');
  });

  it('returns translated label for "agent"', () => {
    const result = getModeLabel('agent', mockT);
    expect(mockT).toHaveBeenCalledWith('modeAgent');
    expect(result).toBe('translated_modeAgent');
  });

  it('returns translated label for "research"', () => {
    const result = getModeLabel('research', mockT);
    expect(mockT).toHaveBeenCalledWith('modeResearch');
    expect(result).toBe('translated_modeResearch');
  });

  it('returns translated label for "learning"', () => {
    const result = getModeLabel('learning', mockT);
    expect(mockT).toHaveBeenCalledWith('modeLearning');
    expect(result).toBe('translated_modeLearning');
  });

  it('returns raw mode string for unknown modes', () => {
    const result = getModeLabel('custom-mode', mockT);
    expect(mockT).not.toHaveBeenCalled();
    expect(result).toBe('custom-mode');
  });
});

// --- getAvailableModels ---

describe('getAvailableModels', () => {
  it('returns models for a specific provider', () => {
    const models = getAvailableModels('openai');
    expect(Array.isArray(models)).toBe(true);
    expect(models.length).toBeGreaterThan(0);
    expect(models[0]).toHaveProperty('id');
    expect(models[0]).toHaveProperty('name');
  });

  it('returns all models when provider is "auto"', () => {
    const autoModels = getAvailableModels('auto');
    const specificModels = getAvailableModels('openai');
    expect(autoModels.length).toBeGreaterThan(specificModels.length);
  });

  it('returns empty array for unknown provider', () => {
    const models = getAvailableModels('nonexistent-provider');
    expect(models).toEqual([]);
  });
});

// --- getEnabledProviders ---

describe('getEnabledProviders', () => {
  it('returns only enabled providers', () => {
    const settings = {
      openai: { enabled: true },
      anthropic: { enabled: false },
      google: { enabled: true },
    };
    const result = getEnabledProviders(settings);
    expect(result).toContain('openai');
    expect(result).toContain('google');
    expect(result).not.toContain('anthropic');
  });

  it('returns empty array when no providers are enabled', () => {
    const settings = {
      openai: { enabled: false },
      anthropic: { enabled: false },
    };
    const result = getEnabledProviders(settings);
    expect(result).toEqual([]);
  });

  it('handles undefined settings entries', () => {
    const settings: Record<string, { enabled?: boolean } | undefined> = {
      openai: undefined,
      anthropic: { enabled: true },
    };
    const result = getEnabledProviders(settings);
    expect(result).toEqual(['anthropic']);
  });

  it('handles empty settings object', () => {
    const result = getEnabledProviders({});
    expect(result).toEqual([]);
  });
});
