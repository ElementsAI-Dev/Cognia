/**
 * Provider Registry Tests
 */

import {
  getPricingProvider,
  getPricingProvidersByRegion,
  getAllPricingProviders,
  listPricingProviderIds,
  getStatusProvider,
  getStatusProvidersByRegion,
  getAllStatusProviders,
  listStatusProviderIds,
  getRegionCounts,
  PRICING_PROVIDERS,
  STATUS_PROVIDERS,
} from '../utils/providers';

describe('Pricing Providers', () => {
  test('getAllPricingProviders returns all providers', () => {
    const providers = getAllPricingProviders();
    expect(providers).toHaveLength(PRICING_PROVIDERS.length);
    expect(providers.length).toBeGreaterThan(10);
  });

  test('getPricingProvider returns correct provider', () => {
    const openai = getPricingProvider('openai');
    expect(openai).toBeDefined();
    expect(openai?.name).toBe('OpenAI');
    expect(openai?.region).toBe('US');

    const deepseek = getPricingProvider('deepseek');
    expect(deepseek).toBeDefined();
    expect(deepseek?.name).toBe('DeepSeek');
    expect(deepseek?.region).toBe('CN');
  });

  test('getPricingProvider returns undefined for unknown provider', () => {
    const unknown = getPricingProvider('unknown-provider');
    expect(unknown).toBeUndefined();
  });

  test('getPricingProvidersByRegion filters correctly', () => {
    const usProviders = getPricingProvidersByRegion('US');
    expect(usProviders.every((p) => p.region === 'US')).toBe(true);
    expect(usProviders.length).toBeGreaterThan(0);

    const cnProviders = getPricingProvidersByRegion('CN');
    expect(cnProviders.every((p) => p.region === 'CN')).toBe(true);
    expect(cnProviders.length).toBeGreaterThan(0);
  });

  test('listPricingProviderIds returns all IDs', () => {
    const ids = listPricingProviderIds();
    expect(ids).toContain('openai');
    expect(ids).toContain('anthropic');
    expect(ids).toContain('deepseek');
    expect(ids).toContain('zhipu');
  });

  test('all pricing providers have required fields', () => {
    const providers = getAllPricingProviders();

    for (const provider of providers) {
      expect(provider.id).toBeDefined();
      expect(provider.name).toBeDefined();
      expect(provider.region).toMatch(/^(US|CN)$/);
      expect(provider.urls).toBeDefined();
      expect(provider.urls.length).toBeGreaterThan(0);
      expect(provider.currency).toMatch(/^(\$|¥)$/);
      expect(provider.unit).toBeDefined();
      expect(provider.type).toMatch(/^(scraper|api)$/);
    }
  });
});

describe('Status Providers', () => {
  test('getAllStatusProviders returns all providers', () => {
    const providers = getAllStatusProviders();
    expect(providers).toHaveLength(STATUS_PROVIDERS.length);
    expect(providers.length).toBeGreaterThan(5);
  });

  test('getStatusProvider returns correct provider', () => {
    const openai = getStatusProvider('openai');
    expect(openai).toBeDefined();
    expect(openai?.name).toBe('OpenAI');
    expect(openai?.endpoints.length).toBeGreaterThan(0);

    const deepseek = getStatusProvider('deepseek');
    expect(deepseek).toBeDefined();
    expect(deepseek?.name).toBe('DeepSeek');
  });

  test('getStatusProvider returns undefined for unknown provider', () => {
    const unknown = getStatusProvider('unknown-provider');
    expect(unknown).toBeUndefined();
  });

  test('getStatusProvidersByRegion filters correctly', () => {
    const usProviders = getStatusProvidersByRegion('US');
    expect(usProviders.every((p) => p.region === 'US')).toBe(true);

    const cnProviders = getStatusProvidersByRegion('CN');
    expect(cnProviders.every((p) => p.region === 'CN')).toBe(true);
  });

  test('listStatusProviderIds returns all IDs', () => {
    const ids = listStatusProviderIds();
    expect(ids).toContain('openai');
    expect(ids).toContain('anthropic');
    expect(ids).toContain('deepseek');
  });

  test('getRegionCounts returns correct counts', () => {
    const counts = getRegionCounts();
    expect(counts.US).toBeGreaterThan(0);
    expect(counts.CN).toBeGreaterThan(0);
    expect(counts.EU).toBe(0); // No EU providers yet
  });

  test('all status providers have required fields', () => {
    const providers = getAllStatusProviders();

    for (const provider of providers) {
      expect(provider.id).toBeDefined();
      expect(provider.name).toBeDefined();
      expect(provider.region).toMatch(/^(US|CN|EU)$/);
      expect(provider.endpoints).toBeDefined();
      expect(provider.endpoints.length).toBeGreaterThan(0);

      for (const endpoint of provider.endpoints) {
        expect(endpoint.name).toBeDefined();
        expect(endpoint.url).toBeDefined();
        expect(endpoint.type).toBeDefined();
      }
    }
  });
});
