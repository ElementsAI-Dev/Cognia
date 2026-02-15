/**
 * Tests for Unified Context Budget Manager
 */

import {
  computeBudget,
  segmentHeadroom,
  isCompressionRecommended,
  type BudgetInput,
} from './context-budget';

// Mock model-limits
jest.mock('./model-limits', () => ({
  getModelContextLimits: jest.fn((model: string) => {
    if (model === 'gpt-4o') return { maxTokens: 128000, reserveTokens: 8000 };
    if (model === 'claude-3.5-sonnet') return { maxTokens: 200000, reserveTokens: 10000 };
    return { maxTokens: 100000, reserveTokens: 2000 };
  }),
}));

// Mock context-fs estimateTokens
jest.mock('@/lib/context/context-fs', () => ({
  estimateTokens: jest.fn((text: string) => Math.ceil(text.length / 4)),
}));

describe('context-budget', () => {
  describe('computeBudget', () => {
    it('should compute budget with default limit percent', () => {
      const input: BudgetInput = {
        model: 'gpt-4o',
        segments: {
          systemPrompt: 500,
          messages: 2000,
        },
      };

      const budget = computeBudget(input);

      expect(budget.modelMaxTokens).toBe(128000);
      expect(budget.effectiveMaxTokens).toBe(128000);
      expect(budget.reserveTokens).toBe(8000);
      expect(budget.availableInputTokens).toBe(120000);
      expect(budget.segments.systemPrompt).toBe(500);
      expect(budget.segments.messages).toBe(2000);
      expect(budget.segments.ragContext).toBe(0);
      expect(budget.segments.crossSessionHistory).toBe(0);
      expect(budget.segments.toolDescriptions).toBe(0);
      expect(budget.usedInputTokens).toBe(2500);
      expect(budget.remainingTokens).toBe(117500);
      expect(budget.status).toBe('healthy');
    });

    it('should apply context limit percent', () => {
      const input: BudgetInput = {
        model: 'gpt-4o',
        contextLimitPercent: 50,
        segments: { messages: 1000 },
      };

      const budget = computeBudget(input);

      expect(budget.effectiveMaxTokens).toBe(64000);
      expect(budget.availableInputTokens).toBe(56000); // 64000 - 8000 reserve
    });

    it('should return critical status when utilization >= 90%', () => {
      const input: BudgetInput = {
        model: 'gpt-4o',
        contextLimitPercent: 10, // 12800 effective
        segments: { messages: 4500 }, // > 90% of (12800-8000)=4800
      };

      const budget = computeBudget(input);

      expect(budget.status).toBe('critical');
      expect(budget.utilizationPercent).toBeGreaterThanOrEqual(90);
    });

    it('should return warning status when utilization 70-89%', () => {
      const input: BudgetInput = {
        model: 'gpt-4o',
        contextLimitPercent: 10, // 12800 effective, 4800 available
        segments: { messages: 3500 }, // ~73% of 4800
      };

      const budget = computeBudget(input);

      expect(budget.status).toBe('warning');
    });

    it('should return healthy status when utilization < 70%', () => {
      const input: BudgetInput = {
        model: 'claude-3.5-sonnet',
        segments: { messages: 5000 },
      };

      const budget = computeBudget(input);

      expect(budget.status).toBe('healthy');
      expect(budget.utilizationPercent).toBeLessThan(70);
    });

    it('should handle all segments', () => {
      const input: BudgetInput = {
        model: 'gpt-4o',
        segments: {
          systemPrompt: 500,
          ragContext: 1000,
          crossSessionHistory: 300,
          messages: 2000,
          toolDescriptions: 200,
        },
      };

      const budget = computeBudget(input);

      expect(budget.usedInputTokens).toBe(4000);
    });

    it('should clamp remaining tokens to zero when over budget', () => {
      const input: BudgetInput = {
        model: 'unknown-model', // defaults to 100000 max, 2000 reserve
        contextLimitPercent: 5, // 5000 effective, 3000 available
        segments: { messages: 50000 },
      };

      const budget = computeBudget(input);

      expect(budget.remainingTokens).toBe(0);
      expect(budget.utilizationPercent).toBe(100);
    });
  });

  describe('segmentHeadroom', () => {
    it('should compute how much a segment can grow', () => {
      const input: BudgetInput = {
        model: 'gpt-4o',
        segments: {
          systemPrompt: 500,
          messages: 2000,
          ragContext: 1000,
        },
      };

      const budget = computeBudget(input);
      const headroom = segmentHeadroom(budget, 'ragContext', 90);

      // 90% of 120000 = 108000; other segments = 500 + 2000 = 2500
      // headroom for ragContext = 108000 - 2500 = 105500
      expect(headroom).toBe(105500);
    });

    it('should return 0 when other segments already exceed cap', () => {
      const input: BudgetInput = {
        model: 'gpt-4o',
        contextLimitPercent: 10, // 12800 effective, 4800 available
        segments: {
          systemPrompt: 4500,
          messages: 500,
        },
      };

      const budget = computeBudget(input);
      const headroom = segmentHeadroom(budget, 'ragContext', 90);

      // 90% of 4800 = 4320; other segments = 5000; headroom = 0
      expect(headroom).toBe(0);
    });
  });

  describe('isCompressionRecommended', () => {
    it('should return true for warning status', () => {
      const input: BudgetInput = {
        model: 'gpt-4o',
        contextLimitPercent: 10,
        segments: { messages: 3500 },
      };

      const budget = computeBudget(input);

      expect(isCompressionRecommended(budget)).toBe(true);
    });

    it('should return true for critical status', () => {
      const input: BudgetInput = {
        model: 'gpt-4o',
        contextLimitPercent: 10,
        segments: { messages: 4500 },
      };

      const budget = computeBudget(input);

      expect(isCompressionRecommended(budget)).toBe(true);
    });

    it('should return false for healthy status', () => {
      const input: BudgetInput = {
        model: 'gpt-4o',
        segments: { messages: 1000 },
      };

      const budget = computeBudget(input);

      expect(isCompressionRecommended(budget)).toBe(false);
    });
  });
});
