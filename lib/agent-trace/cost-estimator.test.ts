import { estimateTraceCost, hasPricingData, getKnownPricedModels, formatCost } from './cost-estimator';

describe('cost-estimator', () => {
  describe('estimateTraceCost', () => {
    it('returns undefined when modelId is undefined', () => {
      expect(estimateTraceCost(undefined, { promptTokens: 100, completionTokens: 50 })).toBeUndefined();
    });

    it('returns undefined when tokenUsage is undefined', () => {
      expect(estimateTraceCost('gpt-4o', undefined)).toBeUndefined();
    });

    it('returns undefined when both tokens are zero', () => {
      expect(estimateTraceCost('gpt-4o', { promptTokens: 0, completionTokens: 0 })).toBeUndefined();
    });

    it('returns undefined for unknown model', () => {
      expect(estimateTraceCost('unknown-model-xyz', { promptTokens: 1000, completionTokens: 500 })).toBeUndefined();
    });

    it('calculates cost for gpt-4o', () => {
      const result = estimateTraceCost('gpt-4o', { promptTokens: 1_000_000, completionTokens: 500_000 });
      expect(result).toBeDefined();
      expect(result!.inputCost).toBe(2.5);
      expect(result!.outputCost).toBe(5);
      expect(result!.totalCost).toBe(7.5);
      expect(result!.currency).toBe('USD');
    });

    it('calculates cost for claude-sonnet-4', () => {
      const result = estimateTraceCost('claude-sonnet-4-20250514', {
        promptTokens: 1_000_000,
        completionTokens: 1_000_000,
      });
      expect(result).toBeDefined();
      expect(result!.inputCost).toBe(3);
      expect(result!.outputCost).toBe(15);
      expect(result!.totalCost).toBe(18);
    });

    it('strips provider prefix from modelId', () => {
      const result = estimateTraceCost('openai/gpt-4o-mini', {
        promptTokens: 1_000_000,
        completionTokens: 1_000_000,
      });
      expect(result).toBeDefined();
      expect(result!.inputCost).toBe(0.15);
      expect(result!.outputCost).toBe(0.6);
    });

    it('handles free-tier models (zero cost)', () => {
      const result = estimateTraceCost('llama-3.3-70b-versatile', {
        promptTokens: 1_000_000,
        completionTokens: 500_000,
      });
      expect(result).toBeDefined();
      expect(result!.totalCost).toBe(0);
    });

    it('calculates fractional costs for small token counts', () => {
      const result = estimateTraceCost('gpt-4o', { promptTokens: 100, completionTokens: 50 });
      expect(result).toBeDefined();
      expect(result!.totalCost).toBeGreaterThan(0);
      expect(result!.totalCost).toBeLessThan(0.001);
    });
  });

  describe('hasPricingData', () => {
    it('returns true for known models', () => {
      expect(hasPricingData('gpt-4o')).toBe(true);
      expect(hasPricingData('claude-sonnet-4-20250514')).toBe(true);
    });

    it('returns false for unknown models', () => {
      expect(hasPricingData('unknown-model')).toBe(false);
    });

    it('strips provider prefix', () => {
      expect(hasPricingData('openai/gpt-4o')).toBe(true);
    });
  });

  describe('getKnownPricedModels', () => {
    it('returns non-empty array', () => {
      const models = getKnownPricedModels();
      expect(models.length).toBeGreaterThan(0);
    });

    it('includes common models', () => {
      const models = getKnownPricedModels();
      expect(models).toContain('gpt-4o');
      expect(models).toContain('claude-sonnet-4-20250514');
    });
  });

  describe('formatCost', () => {
    it('formats zero cost', () => {
      expect(formatCost(0)).toBe('$0.00');
    });

    it('formats very small costs', () => {
      expect(formatCost(0.00001)).toBe('< $0.0001');
    });

    it('formats small costs with 4 decimals', () => {
      expect(formatCost(0.005)).toBe('$0.0050');
    });

    it('formats medium costs with 3 decimals', () => {
      expect(formatCost(0.5)).toBe('$0.500');
    });

    it('formats large costs with 2 decimals', () => {
      expect(formatCost(12.345)).toBe('$12.35');
    });
  });
});
