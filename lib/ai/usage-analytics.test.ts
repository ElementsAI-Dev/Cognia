/**
 * Usage Analytics Tests
 */

import {
  calculateUsageStatistics,
  getModelUsageBreakdown,
  getProviderUsageBreakdown,
  filterRecordsByPeriod,
  generateUsageTimeSeries,
  analyzeUsageTrend,
  calculateCostEfficiency,
  getTopSessionsByUsage,
  getDailyUsageSummary,
  formatCost,
  formatTokens,
  getUsageRecommendations,
} from './usage-analytics';
import type { UsageRecord } from '@/types/system/usage';

// Helper to create mock usage records
const createMockRecord = (
  overrides: Partial<UsageRecord> = {}
): UsageRecord => ({
  id: `record-${Math.random()}`,
  provider: 'openai',
  model: 'gpt-4o',
  sessionId: 'session-1',
  messageId: 'msg-1',
  tokens: {
    prompt: 100,
    completion: 50,
    total: 150,
  },
  cost: 0.01,
  createdAt: new Date(),
  ...overrides,
});

describe('Usage Analytics', () => {
  describe('calculateUsageStatistics', () => {
    it('should return zero values for empty records', () => {
      const stats = calculateUsageStatistics([]);
      expect(stats.totalTokens).toBe(0);
      expect(stats.totalCost).toBe(0);
      expect(stats.totalRequests).toBe(0);
    });

    it('should calculate correct statistics', () => {
      const records = [
        createMockRecord({ tokens: { prompt: 100, completion: 50, total: 150 }, cost: 0.01 }),
        createMockRecord({ tokens: { prompt: 200, completion: 100, total: 300 }, cost: 0.02 }),
      ];

      const stats = calculateUsageStatistics(records);
      expect(stats.totalTokens).toBe(450);
      expect(stats.totalCost).toBe(0.03);
      expect(stats.totalRequests).toBe(2);
      expect(stats.averageTokensPerRequest).toBe(225);
      expect(stats.inputTokens).toBe(300);
      expect(stats.outputTokens).toBe(150);
    });

    it('should calculate input/output ratio', () => {
      const records = [
        createMockRecord({ tokens: { prompt: 400, completion: 100, total: 500 } }),
      ];

      const stats = calculateUsageStatistics(records);
      expect(stats.inputOutputRatio).toBe(4);
    });
  });

  describe('getModelUsageBreakdown', () => {
    it('should group usage by model', () => {
      const records = [
        createMockRecord({ model: 'gpt-4o', tokens: { prompt: 100, completion: 50, total: 150 } }),
        createMockRecord({ model: 'gpt-4o', tokens: { prompt: 100, completion: 50, total: 150 } }),
        createMockRecord({ model: 'gpt-3.5-turbo', tokens: { prompt: 50, completion: 25, total: 75 } }),
      ];

      const breakdown = getModelUsageBreakdown(records);
      expect(breakdown).toHaveLength(2);
      expect(breakdown[0].model).toBe('gpt-4o');
      expect(breakdown[0].tokens).toBe(300);
      expect(breakdown[0].requests).toBe(2);
      expect(breakdown[1].model).toBe('gpt-3.5-turbo');
      expect(breakdown[1].tokens).toBe(75);
    });

    it('should calculate percentages correctly', () => {
      const records = [
        createMockRecord({ model: 'gpt-4o', tokens: { prompt: 75, completion: 0, total: 75 } }),
        createMockRecord({ model: 'gpt-3.5-turbo', tokens: { prompt: 25, completion: 0, total: 25 } }),
      ];

      const breakdown = getModelUsageBreakdown(records);
      expect(breakdown[0].percentage).toBe(75);
      expect(breakdown[1].percentage).toBe(25);
    });
  });

  describe('getProviderUsageBreakdown', () => {
    it('should group usage by provider', () => {
      const records = [
        createMockRecord({ provider: 'openai', tokens: { prompt: 100, completion: 50, total: 150 } }),
        createMockRecord({ provider: 'anthropic', tokens: { prompt: 100, completion: 50, total: 150 } }),
      ];

      const breakdown = getProviderUsageBreakdown(records);
      expect(breakdown).toHaveLength(2);
    });
  });

  describe('filterRecordsByPeriod', () => {
    it('should return all records for "all" period', () => {
      const records = [createMockRecord(), createMockRecord()];
      const filtered = filterRecordsByPeriod(records, 'all');
      expect(filtered).toHaveLength(2);
    });

    it('should filter records by day', () => {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);

      const records = [
        createMockRecord({ createdAt: now }),
        createMockRecord({ createdAt: yesterday }),
      ];

      const filtered = filterRecordsByPeriod(records, 'day');
      expect(filtered).toHaveLength(1);
    });

    it('should filter records by week', () => {
      const now = new Date();
      const lastMonth = new Date(now.getTime() - 31 * 24 * 60 * 60 * 1000);

      const records = [
        createMockRecord({ createdAt: now }),
        createMockRecord({ createdAt: lastMonth }),
      ];

      const filtered = filterRecordsByPeriod(records, 'week');
      expect(filtered).toHaveLength(1);
    });
  });

  describe('generateUsageTimeSeries', () => {
    it('should generate time series data points', () => {
      const now = new Date();
      const records = [
        createMockRecord({ createdAt: now, tokens: { prompt: 100, completion: 50, total: 150 } }),
        createMockRecord({ createdAt: now, tokens: { prompt: 100, completion: 50, total: 150 } }),
      ];

      const timeSeries = generateUsageTimeSeries(records, 'week', 'day');
      expect(timeSeries.length).toBeGreaterThan(0);
      expect(timeSeries[0].tokens).toBe(300);
      expect(timeSeries[0].requests).toBe(2);
    });

    it('should return empty array for no records', () => {
      const timeSeries = generateUsageTimeSeries([], 'week');
      expect(timeSeries).toHaveLength(0);
    });
  });

  describe('analyzeUsageTrend', () => {
    it('should analyze usage trend', () => {
      const records = [createMockRecord()];
      const trend = analyzeUsageTrend(records, 'week');

      expect(trend.period).toBe('week');
      expect(trend.totalTokens).toBeGreaterThanOrEqual(0);
      expect(['increasing', 'decreasing', 'stable']).toContain(trend.trend);
    });

    it('should detect increasing trend', () => {
      const now = Date.now();
      const records = [
        // Earlier records with low usage
        createMockRecord({ 
          createdAt: new Date(now - 6 * 24 * 60 * 60 * 1000),
          tokens: { prompt: 10, completion: 5, total: 15 }
        }),
        // Recent records with high usage
        createMockRecord({ 
          createdAt: new Date(now - 1 * 24 * 60 * 60 * 1000),
          tokens: { prompt: 1000, completion: 500, total: 1500 }
        }),
      ];

      const trend = analyzeUsageTrend(records, 'week');
      expect(trend.trend).toBe('increasing');
    });
  });

  describe('calculateCostEfficiency', () => {
    it('should calculate cost efficiency metrics', () => {
      const records = [
        createMockRecord({ 
          model: 'gpt-4o-mini', 
          tokens: { prompt: 1000, completion: 500, total: 1500 },
          cost: 0.001
        }),
        createMockRecord({ 
          model: 'gpt-4o', 
          tokens: { prompt: 1000, completion: 500, total: 1500 },
          cost: 0.01
        }),
      ];

      const efficiency = calculateCostEfficiency(records);
      expect(efficiency.costPerKToken).toBeGreaterThan(0);
      expect(efficiency.tokensPerDollar).toBeGreaterThan(0);
      expect(efficiency.mostEfficientModel).toBe('gpt-4o-mini');
      expect(efficiency.leastEfficientModel).toBe('gpt-4o');
    });

    it('should handle empty records', () => {
      const efficiency = calculateCostEfficiency([]);
      expect(efficiency.costPerKToken).toBe(0);
      expect(efficiency.mostEfficientModel).toBeNull();
    });
  });

  describe('getTopSessionsByUsage', () => {
    it('should return top sessions by token usage', () => {
      const records = [
        createMockRecord({ sessionId: 'session-1', tokens: { prompt: 100, completion: 50, total: 150 } }),
        createMockRecord({ sessionId: 'session-1', tokens: { prompt: 100, completion: 50, total: 150 } }),
        createMockRecord({ sessionId: 'session-2', tokens: { prompt: 50, completion: 25, total: 75 } }),
      ];

      const topSessions = getTopSessionsByUsage(records, 5);
      expect(topSessions).toHaveLength(2);
      expect(topSessions[0].sessionId).toBe('session-1');
      expect(topSessions[0].tokens).toBe(300);
      expect(topSessions[0].requests).toBe(2);
    });

    it('should limit results', () => {
      const records = Array.from({ length: 20 }, (_, i) => 
        createMockRecord({ sessionId: `session-${i}` })
      );

      const topSessions = getTopSessionsByUsage(records, 5);
      expect(topSessions).toHaveLength(5);
    });
  });

  describe('getDailyUsageSummary', () => {
    it('should calculate daily summaries', () => {
      const records = [createMockRecord()];
      const summary = getDailyUsageSummary(records);

      expect(summary.today).toBeDefined();
      expect(summary.yesterday).toBeDefined();
      expect(summary.thisWeek).toBeDefined();
      expect(summary.thisMonth).toBeDefined();
    });
  });

  describe('formatCost', () => {
    it('should format small costs', () => {
      expect(formatCost(0.001)).toBe('$0.0010');
    });

    it('should format medium costs', () => {
      expect(formatCost(0.123)).toBe('$0.123');
    });

    it('should format large costs', () => {
      expect(formatCost(12.34)).toBe('$12.34');
    });
  });

  describe('formatTokens', () => {
    it('should format small token counts', () => {
      expect(formatTokens(500)).toBe('500');  // toFixed(0) returns string
    });

    it('should format thousands', () => {
      expect(formatTokens(1500)).toBe('1.5K');
    });

    it('should format millions', () => {
      expect(formatTokens(1500000)).toBe('1.5M');
    });
  });

  describe('getUsageRecommendations', () => {
    it('should return message for empty records', () => {
      const recommendations = getUsageRecommendations([]);
      expect(recommendations).toContain('No usage data available for analysis.');
    });

    it('should return recommendations for usage patterns', () => {
      const records = [
        createMockRecord({ 
          tokens: { prompt: 1000, completion: 100, total: 1100 },
          cost: 0.01
        }),
      ];

      const recommendations = getUsageRecommendations(records);
      expect(recommendations.length).toBeGreaterThan(0);
    });

    it('should detect high input/output ratio', () => {
      const records = [
        createMockRecord({ 
          tokens: { prompt: 1000, completion: 100, total: 1100 },
        }),
      ];

      const recommendations = getUsageRecommendations(records);
      expect(recommendations.some(r => r.includes('input to output ratio'))).toBe(true);
    });
  });
});
