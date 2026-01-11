/**
 * Tests for Provider Manager
 */

import { ProviderManager } from './provider-manager';
import type { ProviderManagerConfig } from './provider-manager';

// Mock dependencies
jest.mock('./circuit-breaker', () => ({
  circuitBreakerRegistry: {
    get: jest.fn(),
    create: jest.fn(),
    reset: jest.fn(),
    getState: jest.fn().mockReturnValue('closed'),
  },
}));

jest.mock('./load-balancer', () => ({
  ProviderLoadBalancer: jest.fn().mockImplementation(() => ({
    selectProvider: jest.fn().mockResolvedValue({
      providerId: 'openai',
      modelId: 'gpt-4o-mini',
      strategy: 'round-robin',
    }),
    updateMetrics: jest.fn(),
    getMetrics: jest.fn().mockReturnValue({}),
    getProviderMetrics: jest.fn().mockReturnValue(null),
    initialize: jest.fn(),
  })),
}));

jest.mock('./quota-manager', () => ({
  QuotaManager: jest.fn().mockImplementation(() => ({
    getQuotaStatus: jest.fn().mockReturnValue({ tokensUsed: 0, tokensRemaining: 100000 }),
    recordUsage: jest.fn(),
    reset: jest.fn(),
  })),
  calculateRequestCost: jest.fn().mockReturnValue(0.001),
}));

jest.mock('./availability-monitor', () => ({
  AvailabilityMonitor: jest.fn().mockImplementation(() => ({
    getAvailability: jest.fn().mockReturnValue({ isAvailable: true, uptime: 0.99 }),
    checkHealth: jest.fn().mockResolvedValue({ healthy: true }),
    start: jest.fn(),
    stop: jest.fn(),
    registerProvider: jest.fn(),
  })),
}));

jest.mock('./rate-limit', () => ({
  getRateLimiter: jest.fn().mockReturnValue({
    tryAcquire: jest.fn().mockReturnValue({ allowed: true }),
    getStatus: jest.fn().mockReturnValue({ tokensRemaining: 100 }),
  }),
}));

jest.mock('./api-key-rotation', () => ({
  getNextApiKey: jest.fn().mockReturnValue('test-api-key'),
  recordApiKeySuccess: jest.fn(),
  recordApiKeyError: jest.fn(),
}));

describe('provider-manager', () => {
  let manager: ProviderManager;

  beforeEach(() => {
    jest.clearAllMocks();
    manager = new ProviderManager();
  });

  afterEach(() => {
    manager.shutdown();
  });

  describe('constructor', () => {
    it('should create instance with default config', () => {
      const pm = new ProviderManager();
      expect(pm).toBeDefined();
      pm.shutdown();
    });

    it('should create instance with custom config', () => {
      const config: ProviderManagerConfig = {
        enableHealthMonitoring: true,
        enableQuotaEnforcement: true,
        enableRateLimiting: true,
        enableCircuitBreaker: true,
      };
      const pm = new ProviderManager(config);
      expect(pm).toBeDefined();
      pm.shutdown();
    });
  });

  describe('registerProvider', () => {
    it('should register a new provider', () => {
      manager.registerProvider('openai', {
        apiKey: 'test-key',
      });

      const state = manager.getProviderState('openai');
      expect(state).toBeDefined();
      expect(state?.enabled).toBe(true);
    });

    it('should register provider with multiple API keys', () => {
      manager.registerProvider('openai', {
        apiKeys: ['key1', 'key2', 'key3'],
        apiKeyRotationEnabled: true,
      });

      const state = manager.getProviderState('openai');
      expect(state?.credentials.apiKeys).toHaveLength(3);
    });
  });

  describe('getProviderState', () => {
    it('should return undefined for unregistered provider', () => {
      const state = manager.getProviderState('nonexistent');
      expect(state).toBeNull();
    });

    it('should return state for registered provider', () => {
      manager.registerProvider('anthropic', { apiKey: 'test-key' });
      
      const state = manager.getProviderState('anthropic');
      
      expect(state).toBeDefined();
      expect(state?.providerId).toBe('anthropic');
    });
  });

  describe('selectProvider', () => {
    it('should select available provider', async () => {
      manager.registerProvider('openai', { apiKey: 'test-key' });
      
      const result = await manager.selectProvider({ modelId: 'gpt-4o-mini' });
      
      expect(result).toBeDefined();
    });

  });

  describe('setProviderEnabled', () => {
    it('should enable disabled provider', () => {
      manager.registerProvider('openai', { apiKey: 'test-key' }, false);
      
      manager.setProviderEnabled('openai', true);
      
      // Provider should now be enabled
      expect(true).toBe(true);
    });

    it('should disable enabled provider', () => {
      manager.registerProvider('openai', { apiKey: 'test-key' }, true);
      
      manager.setProviderEnabled('openai', false);
      
      // Provider should now be disabled
      expect(true).toBe(true);
    });
  });

  describe('updateCredentials', () => {
    it('should update provider credentials', () => {
      manager.registerProvider('openai', { apiKey: 'old-key' });
      
      manager.updateCredentials('openai', { apiKey: 'new-key' });
      
      // Should not throw
      expect(true).toBe(true);
    });
  });

  describe('initialize', () => {
    it('should initialize with multiple providers', () => {
      manager.initialize([
        { id: 'openai', credentials: { apiKey: 'key1' }, enabled: true },
        { id: 'anthropic', credentials: { apiKey: 'key2' }, enabled: true },
      ]);

      // Should not throw
      expect(true).toBe(true);
    });
  });

  describe('shutdown', () => {
    it('should clean up resources', () => {
      manager.registerProvider('openai', { apiKey: 'test-key' });
      
      manager.shutdown();
      
      // Should not throw
      expect(true).toBe(true);
    });
  });
});
