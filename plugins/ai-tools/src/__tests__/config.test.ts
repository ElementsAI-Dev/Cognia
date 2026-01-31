/**
 * Configuration Types and Helpers Tests
 */

import {
  AIToolsConfig,
  DEFAULT_CONFIG,
  getConfigValue,
  parseConfig,
} from '../types/config';

describe('DEFAULT_CONFIG', () => {
  test('has all required fields', () => {
    expect(DEFAULT_CONFIG.defaultOutputDir).toBe('ai-tools-output');
    expect(DEFAULT_CONFIG.defaultTimeout).toBe(30000);
    expect(DEFAULT_CONFIG.headlessMode).toBe(true);
    expect(DEFAULT_CONFIG.enableScreenshots).toBe(false);
    expect(DEFAULT_CONFIG.cacheExpiry).toBe(3600000);
    expect(DEFAULT_CONFIG.pricingCacheExpiry).toBe(3600000);
    expect(DEFAULT_CONFIG.statusCacheExpiry).toBe(300000);
    expect(DEFAULT_CONFIG.rankingsCacheExpiry).toBe(1800000);
    expect(DEFAULT_CONFIG.enabledProviders).toEqual([]);
    expect(DEFAULT_CONFIG.preferredRegion).toBe('all');
  });

  test('cache expiry values are reasonable', () => {
    // Pricing cache: 1 hour
    expect(DEFAULT_CONFIG.pricingCacheExpiry).toBe(60 * 60 * 1000);
    // Status cache: 5 minutes
    expect(DEFAULT_CONFIG.statusCacheExpiry).toBe(5 * 60 * 1000);
    // Rankings cache: 30 minutes
    expect(DEFAULT_CONFIG.rankingsCacheExpiry).toBe(30 * 60 * 1000);
  });

  test('timeout is within acceptable range', () => {
    expect(DEFAULT_CONFIG.defaultTimeout).toBeGreaterThanOrEqual(5000);
    expect(DEFAULT_CONFIG.defaultTimeout).toBeLessThanOrEqual(120000);
  });
});

describe('getConfigValue', () => {
  test('returns value from config when present', () => {
    const config = { defaultTimeout: 60000 };
    expect(getConfigValue(config, 'defaultTimeout')).toBe(60000);
  });

  test('returns default value when key is missing', () => {
    const config = {};
    expect(getConfigValue(config, 'defaultTimeout')).toBe(DEFAULT_CONFIG.defaultTimeout);
  });

  test('returns default value for all keys when config is empty', () => {
    const config = {};
    expect(getConfigValue(config, 'defaultOutputDir')).toBe(DEFAULT_CONFIG.defaultOutputDir);
    expect(getConfigValue(config, 'headlessMode')).toBe(DEFAULT_CONFIG.headlessMode);
    expect(getConfigValue(config, 'cacheExpiry')).toBe(DEFAULT_CONFIG.cacheExpiry);
    expect(getConfigValue(config, 'preferredRegion')).toBe(DEFAULT_CONFIG.preferredRegion);
  });

  test('handles boolean values correctly', () => {
    const config = { headlessMode: false, enableScreenshots: true };
    expect(getConfigValue(config, 'headlessMode')).toBe(false);
    expect(getConfigValue(config, 'enableScreenshots')).toBe(true);
  });

  test('handles array values correctly', () => {
    const config = { enabledProviders: ['openai', 'anthropic'] };
    expect(getConfigValue(config, 'enabledProviders')).toEqual(['openai', 'anthropic']);
  });

  test('handles string enum values correctly', () => {
    const config = { preferredRegion: 'US' as const };
    expect(getConfigValue(config, 'preferredRegion')).toBe('US');

    const config2 = { preferredRegion: 'CN' as const };
    expect(getConfigValue(config2, 'preferredRegion')).toBe('CN');
  });
});

describe('parseConfig', () => {
  test('returns full config with defaults for empty input', () => {
    const result = parseConfig({});

    expect(result).toEqual(DEFAULT_CONFIG);
  });

  test('merges partial config with defaults', () => {
    const partial = {
      defaultTimeout: 60000,
      headlessMode: false,
    };

    const result = parseConfig(partial);

    expect(result.defaultTimeout).toBe(60000);
    expect(result.headlessMode).toBe(false);
    // Other values should be defaults
    expect(result.defaultOutputDir).toBe(DEFAULT_CONFIG.defaultOutputDir);
    expect(result.cacheExpiry).toBe(DEFAULT_CONFIG.cacheExpiry);
  });

  test('parses complete config correctly', () => {
    const fullConfig = {
      defaultOutputDir: 'custom-output',
      defaultTimeout: 45000,
      headlessMode: false,
      enableScreenshots: true,
      cacheExpiry: 7200000,
      pricingCacheExpiry: 1800000,
      statusCacheExpiry: 600000,
      rankingsCacheExpiry: 3600000,
      enabledProviders: ['openai', 'anthropic', 'deepseek'],
      preferredRegion: 'US' as const,
    };

    const result = parseConfig(fullConfig);

    expect(result.defaultOutputDir).toBe(fullConfig.defaultOutputDir);
    expect(result.defaultTimeout).toBe(fullConfig.defaultTimeout);
    expect(result.enabledProviders).toEqual(fullConfig.enabledProviders);
    expect(result.preferredRegion).toBe(fullConfig.preferredRegion);
  });

  test('handles mixed valid and invalid keys', () => {
    const configWithExtra = {
      defaultTimeout: 50000,
      unknownKey: 'should be ignored',
      anotherUnknown: 123,
    };

    const result = parseConfig(configWithExtra);

    expect(result.defaultTimeout).toBe(50000);
    // Should not have extra keys (parseConfig only picks known keys)
    expect('unknownKey' in result).toBe(false);
  });

  test('returns immutable-like config (new object)', () => {
    const input = { defaultTimeout: 60000 };
    const result = parseConfig(input);

    // Result should be a new object
    expect(result).not.toBe(input);
    expect(result).not.toBe(DEFAULT_CONFIG);
  });
});

describe('AIToolsConfig type', () => {
  test('can create valid config object', () => {
    const config: AIToolsConfig = {
      defaultOutputDir: 'output',
      defaultTimeout: 30000,
      headlessMode: true,
      enableScreenshots: false,
      cacheExpiry: 3600000,
      pricingCacheExpiry: 3600000,
      statusCacheExpiry: 300000,
      rankingsCacheExpiry: 1800000,
      enabledProviders: [],
      preferredRegion: 'all',
    };

    expect(config.defaultOutputDir).toBe('output');
    expect(config.preferredRegion).toBe('all');
  });

  test('preferredRegion accepts valid values', () => {
    const configUS: AIToolsConfig = { ...DEFAULT_CONFIG, preferredRegion: 'US' };
    const configCN: AIToolsConfig = { ...DEFAULT_CONFIG, preferredRegion: 'CN' };
    const configAll: AIToolsConfig = { ...DEFAULT_CONFIG, preferredRegion: 'all' };

    expect(configUS.preferredRegion).toBe('US');
    expect(configCN.preferredRegion).toBe('CN');
    expect(configAll.preferredRegion).toBe('all');
  });
});
