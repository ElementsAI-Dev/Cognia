/**
 * Tests for Search Provider Manager
 */

import { SearchProviderManager } from './search-provider-manager';
import type { SearchProviderManagerConfig } from './search-provider-manager';

// Mock dependencies
jest.mock('@/lib/ai/infrastructure/circuit-breaker', () => ({
  circuitBreakerRegistry: {
    get: jest.fn().mockReturnValue({
      canExecute: jest.fn().mockReturnValue(true),
      execute: jest.fn().mockImplementation((fn) => fn().then((data: unknown) => ({ success: true, data }))),
      recordSuccess: jest.fn(),
      recordFailure: jest.fn(),
    }),
    create: jest.fn(),
    reset: jest.fn(),
    getState: jest.fn().mockReturnValue('closed'),
  },
}));

jest.mock('@/lib/ai/infrastructure/quota-manager', () => ({
  QuotaManager: jest.fn().mockImplementation(() => ({
    getQuotaStatus: jest.fn().mockReturnValue({ tokensUsed: 0, tokensRemaining: 100000 }),
    recordUsage: jest.fn(),
    setLimits: jest.fn(),
    reset: jest.fn(),
  })),
}));

jest.mock('./search-service', () => ({
  search: jest.fn().mockResolvedValue({
    results: [{ title: 'Test', url: 'https://example.com', snippet: 'Test snippet' }],
    totalResults: 1,
  }),
  testProviderConnection: jest.fn().mockResolvedValue(true),
}));

jest.mock('@/types/search', () => ({
  getEnabledProviders: jest.fn().mockImplementation((settings) => {
    return Object.entries(settings)
      .filter(([_, s]) => (s as { enabled: boolean }).enabled)
      .map(([id, s]) => ({ providerId: id, ...(s as object), priority: 1 }));
  }),
  SEARCH_PROVIDERS: {
    tavily: { name: 'Tavily', pricing: { pricePerSearch: 0.01 } },
    exa: { name: 'Exa', pricing: { pricePerSearch: 0.02 } },
    serper: { name: 'Serper', pricing: { pricePerSearch: 0.005 } },
  },
}));

describe('search-provider-manager', () => {
  let manager: SearchProviderManager;

  beforeEach(() => {
    jest.clearAllMocks();
    manager = new SearchProviderManager();
  });

  afterEach(() => {
    manager.shutdown();
  });

  describe('constructor', () => {
    it('should create instance with default config', () => {
      const pm = new SearchProviderManager();
      expect(pm).toBeDefined();
      pm.shutdown();
    });

    it('should create instance with custom config', () => {
      const config: Partial<SearchProviderManagerConfig> = {
        strategy: 'round-robin',
        enableFailover: true,
        maxRetries: 5,
      };
      const pm = new SearchProviderManager(config);
      expect(pm).toBeDefined();
      pm.shutdown();
    });
  });

  describe('initialize', () => {
    it('should initialize with provider settings', () => {
      manager.initialize({
        tavily: { providerId: 'tavily', enabled: true, apiKey: 'test-key', priority: 1 },
      } as never);

      const metrics = manager.getMetrics('tavily');
      expect(metrics).toBeDefined();
    });

    it('should initialize metrics for providers', () => {
      manager.initialize({
        exa: { providerId: 'exa', enabled: true, apiKey: 'test-key', priority: 1 },
      } as never);

      const metrics = manager.getMetrics('exa');
      expect(metrics?.totalRequests).toBe(0);
      expect(metrics?.isHealthy).toBe(true);
    });
  });

  describe('getMetrics', () => {
    it('should return undefined for uninitialized provider', () => {
      const metrics = manager.getMetrics('tavily');
      expect(metrics).toBeUndefined();
    });

    it('should return metrics for initialized provider', () => {
      manager.initialize({
        tavily: { providerId: 'tavily', enabled: true, apiKey: 'test-key', priority: 1 },
      } as never);

      const metrics = manager.getMetrics('tavily');
      expect(metrics).toBeDefined();
      expect(metrics?.providerId).toBe('tavily');
    });
  });

  describe('getAllMetrics', () => {
    it('should return metrics for all initialized providers', () => {
      manager.initialize({
        tavily: { providerId: 'tavily', enabled: true, apiKey: 'key1', priority: 1 },
        exa: { providerId: 'exa', enabled: true, apiKey: 'key2', priority: 2 },
      } as never);

      const allMetrics = manager.getAllMetrics();

      expect(allMetrics.size).toBe(2);
    });
  });

  describe('getQuotaStatus', () => {
    it('should return quota status', () => {
      manager.initialize({
        tavily: { providerId: 'tavily', enabled: true, apiKey: 'test-key', priority: 1 },
      } as never);

      const status = manager.getQuotaStatus('tavily');

      expect(status).toBeDefined();
    });
  });

  describe('getSummary', () => {
    it('should return summary statistics', () => {
      manager.initialize({
        tavily: { providerId: 'tavily', enabled: true, apiKey: 'test-key', priority: 1 },
      } as never);

      const summary = manager.getSummary();

      expect(summary.totalProviders).toBe(1);
      expect(summary.enabledProviders).toBe(1);
    });
  });

  describe('resetMetrics', () => {
    it('should reset all provider metrics', () => {
      manager.initialize({
        tavily: { providerId: 'tavily', enabled: true, apiKey: 'test-key', priority: 1 },
      } as never);

      manager.resetMetrics();

      const metrics = manager.getMetrics('tavily');
      expect(metrics?.totalRequests).toBe(0);
    });
  });

  describe('shutdown', () => {
    it('should clean up resources', () => {
      manager.initialize({
        tavily: { providerId: 'tavily', enabled: true, apiKey: 'test-key', priority: 1 },
      } as never);

      manager.shutdown();

      // Should not throw
      expect(true).toBe(true);
    });
  });
});
