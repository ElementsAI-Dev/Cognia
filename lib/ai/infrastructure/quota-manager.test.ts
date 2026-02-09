/**
 * Quota Manager Tests
 */

import {
  QuotaManager,
  getQuotaManager,
  recordApiUsage,
  checkQuota,
  getProviderQuotaStatus,
  calculateRequestCost,
  DEFAULT_QUOTA_LIMITS,
} from './quota-manager';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();

Object.defineProperty(global, 'localStorage', { value: localStorageMock });

describe('QuotaManager', () => {
  let quotaManager: QuotaManager;

  beforeEach(() => {
    localStorageMock.clear();
    quotaManager = new QuotaManager({
      enabled: true,
      persistUsage: false,
      storageKeyPrefix: 'test_quota_',
    });
  });

  describe('initialization', () => {
    it('should create with default config', () => {
      const qm = new QuotaManager();
      expect(qm).toBeDefined();
    });

    it('should accept custom config', () => {
      const qm = new QuotaManager({
        warningThreshold: 0.7,
        criticalThreshold: 0.9,
      });
      expect(qm).toBeDefined();
    });
  });

  describe('quota limits', () => {
    it('should set and get limits', () => {
      quotaManager.setLimits('openai', {
        maxRequestsPerDay: 100,
        maxCostPerMonth: 50,
      });

      const limits = quotaManager.getLimits('openai');
      expect(limits.maxRequestsPerDay).toBe(100);
      expect(limits.maxCostPerMonth).toBe(50);
    });

    it('should return default limits for known providers', () => {
      const limits = quotaManager.getLimits('openai');
      expect(limits).toBeDefined();
    });

    it('should return empty limits for unknown providers', () => {
      const limits = quotaManager.getLimits('unknown-provider');
      expect(Object.keys(limits).length).toBe(0);
    });
  });

  describe('usage recording', () => {
    it('should record usage', () => {
      quotaManager.recordUsage({
        providerId: 'openai',
        modelId: 'gpt-4o',
        inputTokens: 100,
        outputTokens: 50,
        cost: 0.01,
        success: true,
        latencyMs: 500,
      });

      const stats = quotaManager.getUsageStats('openai', 'day');
      expect(stats.totalRequests).toBe(1);
      expect(stats.totalInputTokens).toBe(100);
      expect(stats.totalOutputTokens).toBe(50);
      expect(stats.totalCost).toBe(0.01);
    });

    it('should track successful and failed requests', () => {
      quotaManager.recordUsage({
        providerId: 'openai',
        modelId: 'gpt-4o',
        inputTokens: 100,
        outputTokens: 50,
        cost: 0.01,
        success: true,
        latencyMs: 500,
      });

      quotaManager.recordUsage({
        providerId: 'openai',
        modelId: 'gpt-4o',
        inputTokens: 100,
        outputTokens: 0,
        cost: 0,
        success: false,
        latencyMs: 100,
      });

      const stats = quotaManager.getUsageStats('openai', 'day');
      expect(stats.totalRequests).toBe(2);
      expect(stats.successfulRequests).toBe(1);
      expect(stats.failedRequests).toBe(1);
    });

    it('should calculate average latency', () => {
      quotaManager.recordUsage({
        providerId: 'openai',
        modelId: 'gpt-4o',
        inputTokens: 100,
        outputTokens: 50,
        cost: 0.01,
        success: true,
        latencyMs: 200,
      });

      quotaManager.recordUsage({
        providerId: 'openai',
        modelId: 'gpt-4o',
        inputTokens: 100,
        outputTokens: 50,
        cost: 0.01,
        success: true,
        latencyMs: 400,
      });

      const stats = quotaManager.getUsageStats('openai', 'day');
      expect(stats.averageLatency).toBe(300);
    });
  });

  describe('canMakeRequest', () => {
    it('should allow requests when under quota', () => {
      quotaManager.setLimits('openai', { maxRequestsPerDay: 100 });

      const result = quotaManager.canMakeRequest('openai');
      expect(result.allowed).toBe(true);
    });

    it('should block requests when quota exceeded', () => {
      quotaManager.setLimits('openai', { maxRequestsPerDay: 2 });

      // Record 2 requests
      for (let i = 0; i < 2; i++) {
        quotaManager.recordUsage({
          providerId: 'openai',
          modelId: 'gpt-4o',
          inputTokens: 100,
          outputTokens: 50,
          cost: 0.01,
          success: true,
          latencyMs: 500,
        });
      }

      // Create a new manager with blockOnExceeded enabled
      const blockingManager = new QuotaManager({
        enabled: true,
        blockOnExceeded: true,
        persistUsage: false,
      });
      blockingManager.setLimits('openai', { maxRequestsPerDay: 2 });
      
      // Record 2 requests on the blocking manager
      for (let i = 0; i < 2; i++) {
        blockingManager.recordUsage({
          providerId: 'openai',
          modelId: 'gpt-4o',
          inputTokens: 100,
          outputTokens: 50,
          cost: 0.01,
          success: true,
          latencyMs: 500,
        });
      }

      const result = blockingManager.canMakeRequest('openai');
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('exceeded');
    });

    it('should allow when quota tracking disabled', () => {
      const disabledManager = new QuotaManager({ enabled: false });
      const result = disabledManager.canMakeRequest('openai');
      expect(result.allowed).toBe(true);
    });
  });

  describe('quota status', () => {
    it('should return complete quota status', () => {
      quotaManager.setLimits('openai', {
        maxRequestsPerDay: 100,
        maxCostPerMonth: 50,
      });

      quotaManager.recordUsage({
        providerId: 'openai',
        modelId: 'gpt-4o',
        inputTokens: 100,
        outputTokens: 50,
        cost: 1,
        success: true,
        latencyMs: 500,
      });

      const status = quotaManager.getQuotaStatus('openai');

      expect(status.providerId).toBe('openai');
      expect(status.limits.maxRequestsPerDay).toBe(100);
      expect(status.usage.today.totalRequests).toBe(1);
      expect(status.remaining.requestsToday).toBe(99);
      expect(status.remaining.costThisMonth).toBe(49);
    });
  });

  describe('usage history', () => {
    it('should get usage history', () => {
      for (let i = 0; i < 5; i++) {
        quotaManager.recordUsage({
          providerId: 'openai',
          modelId: 'gpt-4o',
          inputTokens: 100,
          outputTokens: 50,
          cost: 0.01,
          success: true,
          latencyMs: 500,
        });
      }

      const history = quotaManager.getUsageHistory('openai');
      expect(history.length).toBe(5);
    });

    it('should limit history results', () => {
      for (let i = 0; i < 10; i++) {
        quotaManager.recordUsage({
          providerId: 'openai',
          modelId: 'gpt-4o',
          inputTokens: 100,
          outputTokens: 50,
          cost: 0.01,
          success: true,
          latencyMs: 500,
        });
      }

      const history = quotaManager.getUsageHistory('openai', { limit: 3 });
      expect(history.length).toBe(3);
    });
  });

  describe('alerts', () => {
    it('should register alert callback', () => {
      const callback = jest.fn();
      const unsubscribe = quotaManager.onAlert(callback);

      expect(typeof unsubscribe).toBe('function');
    });

    it('should unsubscribe from alerts', () => {
      const callback = jest.fn();
      const unsubscribe = quotaManager.onAlert(callback);
      unsubscribe();

      // No error when callback removed
    });
  });

  describe('clear usage data', () => {
    it('should clear data for specific provider', () => {
      quotaManager.recordUsage({
        providerId: 'openai',
        modelId: 'gpt-4o',
        inputTokens: 100,
        outputTokens: 50,
        cost: 0.01,
        success: true,
        latencyMs: 500,
      });

      quotaManager.clearUsageData('openai');

      const stats = quotaManager.getUsageStats('openai', 'day');
      expect(stats.totalRequests).toBe(0);
    });

    it('should clear all data', () => {
      quotaManager.recordUsage({
        providerId: 'openai',
        modelId: 'gpt-4o',
        inputTokens: 100,
        outputTokens: 50,
        cost: 0.01,
        success: true,
        latencyMs: 500,
      });

      quotaManager.recordUsage({
        providerId: 'anthropic',
        modelId: 'claude',
        inputTokens: 100,
        outputTokens: 50,
        cost: 0.01,
        success: true,
        latencyMs: 500,
      });

      quotaManager.clearUsageData();

      expect(quotaManager.getUsageStats('openai', 'day').totalRequests).toBe(0);
      expect(quotaManager.getUsageStats('anthropic', 'day').totalRequests).toBe(0);
    });
  });

  describe('getAllProviderStats', () => {
    it('should get stats for all providers', () => {
      quotaManager.recordUsage({
        providerId: 'openai',
        modelId: 'gpt-4o',
        inputTokens: 100,
        outputTokens: 50,
        cost: 0.01,
        success: true,
        latencyMs: 500,
      });

      quotaManager.recordUsage({
        providerId: 'anthropic',
        modelId: 'claude',
        inputTokens: 100,
        outputTokens: 50,
        cost: 0.01,
        success: true,
        latencyMs: 500,
      });

      const allStats = quotaManager.getAllProviderStats('day');

      expect(allStats.size).toBe(2);
      expect(allStats.has('openai')).toBe(true);
      expect(allStats.has('anthropic')).toBe(true);
    });
  });
});

describe('calculateRequestCost', () => {
  it('should calculate cost for known model', () => {
    const cost = calculateRequestCost('openai', 'gpt-4o', 1000000, 500000);
    // Input: 1M * 2.5 / 1M = 2.5
    // Output: 0.5M * 10 / 1M = 5
    expect(cost).toBe(7.5);
  });

  it('should return 0 for unknown provider', () => {
    const cost = calculateRequestCost('unknown', 'model', 1000, 1000);
    expect(cost).toBe(0);
  });

  it('should return 0 for unknown model', () => {
    const cost = calculateRequestCost('openai', 'unknown-model', 1000, 1000);
    expect(cost).toBe(0);
  });

  it('should handle free models', () => {
    const cost = calculateRequestCost('google', 'gemini-2.0-flash-exp', 1000000, 500000);
    expect(cost).toBe(0);
  });

  it('should calculate cost for CNY-only models via USD conversion', () => {
    // qwen-max is only in MODEL_PRICING_CNY: input=20, output=60 per 1M tokens
    const cost = calculateRequestCost('alibaba', 'qwen-max', 1000000, 1000000);
    expect(cost).toBeGreaterThan(0);
  });

  it('should calculate cost for glm-4-plus (CNY-only)', () => {
    const cost = calculateRequestCost('zhipu', 'glm-4-plus', 1000000, 500000);
    expect(cost).toBeGreaterThan(0);
  });

  it('should calculate cost for moonshot-v1-8k (CNY-only)', () => {
    const cost = calculateRequestCost('moonshot', 'moonshot-v1-8k', 1000000, 500000);
    expect(cost).toBeGreaterThan(0);
  });

  it('should return 0 for free CNY models', () => {
    // hunyuan-mt-7b has input=0, output=0 in CNY pricing
    const cost = calculateRequestCost('tencent', 'hunyuan-mt-7b', 1000000, 500000);
    expect(cost).toBe(0);
  });
});

describe('DEFAULT_QUOTA_LIMITS', () => {
  it('should have limits for common providers', () => {
    expect(DEFAULT_QUOTA_LIMITS.openai).toBeDefined();
    expect(DEFAULT_QUOTA_LIMITS.anthropic).toBeDefined();
    expect(DEFAULT_QUOTA_LIMITS.google).toBeDefined();
  });

  it('should have no limits for local providers', () => {
    expect(Object.keys(DEFAULT_QUOTA_LIMITS.ollama || {}).length).toBe(0);
  });
});

describe('Utility functions', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  describe('getQuotaManager', () => {
    it('should return singleton instance', () => {
      const qm1 = getQuotaManager();
      const qm2 = getQuotaManager();
      expect(qm1).toBe(qm2);
    });
  });

  describe('recordApiUsage', () => {
    it('should record usage to global manager', () => {
      recordApiUsage({
        providerId: 'openai',
        modelId: 'gpt-4o',
        inputTokens: 100,
        outputTokens: 50,
        cost: 0.01,
        success: true,
        latencyMs: 500,
      });

      const status = getProviderQuotaStatus('openai');
      expect(status.usage.today.totalRequests).toBeGreaterThanOrEqual(1);
    });
  });

  describe('checkQuota', () => {
    it('should check quota for provider', () => {
      const result = checkQuota('openai');
      expect(result.allowed).toBe(true);
    });
  });
});
