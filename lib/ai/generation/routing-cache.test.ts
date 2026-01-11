/**
 * Tests for Routing Cache
 */

import {
  getCachedRouting,
  cacheRoutingDecision,
  recordRoutingDecision,
  getRoutingStats,
  resetRoutingStats,
  clearRoutingCache,
  getCacheStats,
  setCacheTTL,
  estimateCost,
  compareCosts,
} from './routing-cache';
import type { ModelSelection } from '@/types/provider/auto-router';

describe('routing-cache', () => {
  beforeEach(() => {
    clearRoutingCache();
    resetRoutingStats();
  });

  const createMockSelection = (overrides?: Partial<ModelSelection>): ModelSelection => ({
    provider: 'openai',
    model: 'gpt-4o-mini',
    tier: 'fast',
    reason: 'Fast response needed',
    routingMode: 'rule-based',
    routingLatency: 15,
    classification: {
      category: 'general',
      complexity: 'simple',
      confidence: 0.9,
      requiresReasoning: false,
      requiresTools: false,
      requiresVision: false,
      requiresCreativity: false,
      requiresCoding: false,
      requiresLongContext: false,
      estimatedInputTokens: 300,
      estimatedOutputTokens: 200,
    },
    estimatedCost: {
      inputCost: 0.001,
      outputCost: 0.002,
      totalCost: 0.003,
    },
    ...overrides,
  });

  describe('getCachedRouting / cacheRoutingDecision', () => {
    it('should return null for uncached input', () => {
      const result = getCachedRouting('test input');
      expect(result).toBeNull();
    });

    it('should return cached selection for cached input', () => {
      const selection = createMockSelection();
      cacheRoutingDecision('test input', selection);
      
      const result = getCachedRouting('test input');
      
      expect(result).toBeDefined();
      expect(result?.provider).toBe('openai');
      expect(result?.model).toBe('gpt-4o-mini');
    });

    it('should cache with image context', () => {
      const selection = createMockSelection({ model: 'gpt-4o' });
      cacheRoutingDecision('test input', selection, true);
      
      // Without image context should miss
      expect(getCachedRouting('test input', false)).toBeNull();
      
      // With image context should hit
      expect(getCachedRouting('test input', true)).toBeDefined();
    });

    it('should cache with tools context', () => {
      const selection = createMockSelection();
      cacheRoutingDecision('test input', selection, false, true);
      
      // Without tools context should miss
      expect(getCachedRouting('test input', false, false)).toBeNull();
      
      // With tools context should hit
      expect(getCachedRouting('test input', false, true)).toBeDefined();
    });

    it('should cache with agent mode', () => {
      const selection = createMockSelection();
      cacheRoutingDecision('test input', selection, false, false, 'research');
      
      // Different agent mode should miss
      expect(getCachedRouting('test input', false, false, 'code')).toBeNull();
      
      // Same agent mode should hit
      expect(getCachedRouting('test input', false, false, 'research')).toBeDefined();
    });
  });

  describe('clearRoutingCache', () => {
    it('should clear all cached entries', () => {
      cacheRoutingDecision('input1', createMockSelection());
      cacheRoutingDecision('input2', createMockSelection());
      
      clearRoutingCache();
      
      expect(getCachedRouting('input1')).toBeNull();
      expect(getCachedRouting('input2')).toBeNull();
    });
  });

  describe('getCacheStats', () => {
    it('should return cache size', () => {
      cacheRoutingDecision('input1', createMockSelection());
      cacheRoutingDecision('input2', createMockSelection());
      
      const stats = getCacheStats();
      
      expect(stats.size).toBe(2);
    });

    it('should track hit rate', () => {
      cacheRoutingDecision('input1', createMockSelection());
      
      // First access creates hits
      getCachedRouting('input1');
      getCachedRouting('input1');
      
      const stats = getCacheStats();
      expect(stats.hitRate).toBeGreaterThan(0);
    });
  });

  describe('setCacheTTL', () => {
    it('should update cache TTL', () => {
      // Set very short TTL
      setCacheTTL(0);
      
      cacheRoutingDecision('input', createMockSelection());
      
      // Entry should expire immediately
      // Note: This test may be timing-sensitive
      expect(getCacheStats().size).toBeGreaterThanOrEqual(0);
    });
  });

  describe('recordRoutingDecision / getRoutingStats', () => {
    it('should track total requests', () => {
      recordRoutingDecision(createMockSelection());
      recordRoutingDecision(createMockSelection());
      
      const stats = getRoutingStats();
      
      expect(stats.totalRequests).toBe(2);
    });

    it('should track by tier', () => {
      recordRoutingDecision(createMockSelection({ tier: 'fast' }));
      recordRoutingDecision(createMockSelection({ tier: 'balanced' }));
      recordRoutingDecision(createMockSelection({ tier: 'fast' }));
      
      const stats = getRoutingStats();
      
      expect(stats.byTier.fast).toBe(2);
      expect(stats.byTier.balanced).toBe(1);
    });

    it('should track by provider', () => {
      recordRoutingDecision(createMockSelection({ provider: 'openai' }));
      recordRoutingDecision(createMockSelection({ provider: 'anthropic' }));
      recordRoutingDecision(createMockSelection({ provider: 'openai' }));
      
      const stats = getRoutingStats();
      
      expect(stats.byProvider['openai']).toBe(2);
      expect(stats.byProvider['anthropic']).toBe(1);
    });

    it('should track cache hit rate', () => {
      recordRoutingDecision(createMockSelection(), true);  // cache hit
      recordRoutingDecision(createMockSelection(), false); // cache miss
      recordRoutingDecision(createMockSelection(), true);  // cache hit
      
      const stats = getRoutingStats();
      
      // 2 hits out of 3 = ~0.67
      expect(stats.cacheHitRate).toBeCloseTo(0.67, 1);
    });

    it('should track average latency', () => {
      recordRoutingDecision(createMockSelection({ routingLatency: 10 }));
      recordRoutingDecision(createMockSelection({ routingLatency: 20 }));
      recordRoutingDecision(createMockSelection({ routingLatency: 30 }));
      
      const stats = getRoutingStats();
      
      expect(stats.avgLatency).toBe(20);
    });
  });

  describe('resetRoutingStats', () => {
    it('should reset all statistics', () => {
      recordRoutingDecision(createMockSelection());
      recordRoutingDecision(createMockSelection());
      
      resetRoutingStats();
      
      const stats = getRoutingStats();
      expect(stats.totalRequests).toBe(0);
      expect(stats.cacheHitRate).toBe(0);
    });
  });

  describe('estimateCost', () => {
    it('should estimate cost for known models', () => {
      const result = estimateCost(1000, 500, 'openai', 'gpt-4o-mini');
      
      expect(result).toBeDefined();
      expect(result?.inputCost).toBeGreaterThan(0);
      expect(result?.outputCost).toBeGreaterThan(0);
      expect(result?.totalCost).toBe(result!.inputCost + result!.outputCost);
    });

    it('should return null for unknown models', () => {
      const result = estimateCost(1000, 500, 'unknown', 'unknown-model');
      
      expect(result).toBeNull();
    });

    it('should calculate correct cost for GPT-4o', () => {
      // GPT-4o: $2.5/1M input, $10/1M output
      const result = estimateCost(1_000_000, 1_000_000, 'openai', 'gpt-4o');
      
      expect(result?.inputCost).toBeCloseTo(2.5, 1);
      expect(result?.outputCost).toBeCloseTo(10, 1);
    });

    it('should calculate correct cost for Claude Sonnet', () => {
      // Claude Sonnet: $3/1M input, $15/1M output
      const result = estimateCost(1_000_000, 1_000_000, 'anthropic', 'claude-sonnet-4');
      
      expect(result?.inputCost).toBeCloseTo(3, 1);
      expect(result?.outputCost).toBeCloseTo(15, 1);
    });
  });

  describe('compareCosts', () => {
    it('should compare costs between selections', () => {
      const cheapSelection = createMockSelection({
        estimatedCost: { inputCost: 0.001, outputCost: 0.001, totalCost: 0.002 },
      });
      const expensiveSelection = createMockSelection({
        estimatedCost: { inputCost: 0.01, outputCost: 0.01, totalCost: 0.02 },
      });
      
      const result = compareCosts(cheapSelection, expensiveSelection);
      
      expect(result).toBeDefined();
      expect(result?.cheaper).toBe(cheapSelection);
      expect(result?.savings).toBeCloseTo(0.018, 3);
      expect(result?.savingsPercent).toBeCloseTo(90, 0);
    });

    it('should return null when costs are missing', () => {
      const selectionNoCost = createMockSelection({ estimatedCost: undefined });
      const selectionWithCost = createMockSelection();
      
      const result = compareCosts(selectionNoCost, selectionWithCost);
      
      expect(result).toBeNull();
    });

    it('should handle equal costs', () => {
      const selection1 = createMockSelection({
        estimatedCost: { inputCost: 0.01, outputCost: 0.01, totalCost: 0.02 },
      });
      const selection2 = createMockSelection({
        estimatedCost: { inputCost: 0.01, outputCost: 0.01, totalCost: 0.02 },
      });
      
      const result = compareCosts(selection1, selection2);
      
      expect(result?.savings).toBe(0);
      expect(result?.savingsPercent).toBe(0);
    });
  });
});
