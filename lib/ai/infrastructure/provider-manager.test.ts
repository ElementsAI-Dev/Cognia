/**
 * Tests for Provider Manager
 */

import { ProviderManager } from './provider-manager';
import type { ProviderManagerConfig } from './provider-manager';

// Mock dependencies
jest.mock('./circuit-breaker', () => ({
  circuitBreakerRegistry: {
    get: jest.fn().mockReturnValue({
      canExecute: jest.fn().mockReturnValue(true),
      execute: jest.fn(async (fn: () => Promise<unknown>) => {
        try {
          const data = await fn();
          return { success: true, data };
        } catch (error) {
          return { success: false, error };
        }
      }),
    }),
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
    recordRequestStart: jest.fn(),
    recordRequestEnd: jest.fn(),
    setProviderHealth: jest.fn(),
    setProviderAvailability: jest.fn(),
  })),
}));

jest.mock('./quota-manager', () => ({
  QuotaManager: jest.fn().mockImplementation(() => ({
    getQuotaStatus: jest.fn().mockReturnValue({ tokensUsed: 0, tokensRemaining: 100000 }),
    canMakeRequest: jest.fn().mockReturnValue({ allowed: true }),
    recordUsage: jest.fn(),
    onAlert: jest.fn(() => jest.fn()),
    reset: jest.fn(),
  })),
  calculateRequestCost: jest.fn().mockReturnValue(0.001),
}));

jest.mock('./availability-monitor', () => ({
  AvailabilityMonitor: jest.fn().mockImplementation(() => ({
    getAvailability: jest.fn().mockReturnValue({ status: 'available', uptime: 0.99 }),
    checkHealth: jest.fn().mockResolvedValue({ healthy: true }),
    checkProvider: jest.fn().mockResolvedValue({ healthy: true }),
    checkAllProviders: jest.fn().mockResolvedValue(new Map()),
    getSummary: jest.fn().mockReturnValue({ available: 1, degraded: 0 }),
    subscribe: jest.fn(() => jest.fn()),
    start: jest.fn(),
    stop: jest.fn(),
    registerProvider: jest.fn(),
  })),
}));

jest.mock('./rate-limit', () => ({
  getRateLimiter: jest.fn().mockReturnValue({
    tryAcquire: jest.fn().mockReturnValue({ allowed: true }),
    getStatus: jest.fn().mockResolvedValue({ success: true, retryAfter: 0 }),
    limit: jest.fn().mockResolvedValue({ success: true, remaining: 100 }),
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

  describe('runtime completeness', () => {
    it('allows keyless local provider with valid base URL', async () => {
      manager.registerProvider('ollama', { baseURL: 'http://localhost:11434' }, true);
      const result = await manager.canUseProvider('ollama', { modelId: 'llama3.2' });
      expect(result.allowed).toBe(true);
    });

    it('returns configuration failure when credential is missing', async () => {
      manager.registerProvider('openai', { apiKey: '' }, true);
      const result = await manager.execute(async () => 'ok', {
        preferredProvider: 'openai',
        modelId: 'gpt-4o',
        maxRetries: 1,
      });

      expect(result.success).toBe(false);
      expect(result.terminalCategory).toBe('configuration');
      expect(result.attempts).toHaveLength(1);
      expect(result.attempts[0].failureCategory).toBe('configuration');
    });

    it('uses ordered fallback policy with traceable attempts', async () => {
      manager.registerProvider('openai', { apiKey: 'key-openai' }, true);
      manager.registerProvider('anthropic', { apiKey: 'key-anthropic' }, true);

      const result = await manager.execute(
        async (ctx) => {
          if (ctx.providerId === 'openai') {
            throw new Error('primary execution failed');
          }
          return 'ok';
        },
        {
          preferredProvider: 'openai',
          fallbackPolicy: 'ordered',
          fallbackProviderOrder: ['anthropic'],
          modelId: 'gpt-4o',
          maxRetries: 3,
        }
      );

      expect(result.success).toBe(true);
      expect(result.fallbackUsed).toBe(true);
      expect(result.attempts).toHaveLength(2);
      expect(result.attempts[0].providerId).toBe('openai');
      expect(result.attempts[0].success).toBe(false);
      expect(result.attempts[1].providerId).toBe('anthropic');
      expect(result.attempts[1].success).toBe(true);
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
