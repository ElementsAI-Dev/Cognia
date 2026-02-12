/**
 * Tests for useObservabilityData hook
 */

import { renderHook, act } from '@testing-library/react';
import { useObservabilityData, useObservabilityActions } from './use-observability-data';

// Mock usage store
const mockUsageStore = {
  records: [],
  clearUsageRecords: jest.fn(),
  clearRecordsBefore: jest.fn(),
};

jest.mock('@/stores', () => ({
  useUsageStore: jest.fn((selector) => selector(mockUsageStore)),
}));

// Mock usage analytics
jest.mock('@/lib/ai/usage-analytics', () => ({
  calculateUsageStatistics: jest.fn(() => ({
    totalRequests: 0,
    totalTokens: 0,
    totalCost: 0,
    averageTokensPerRequest: 0,
    averageCostPerRequest: 0,
  })),
  getModelUsageBreakdown: jest.fn(() => []),
  getProviderUsageBreakdown: jest.fn(() => []),
  generateUsageTimeSeries: jest.fn(() => []),
  analyzeUsageTrend: jest.fn(() => ({
    direction: 'stable',
    percentageChange: 0,
    periodComparison: { current: 0, previous: 0 },
  })),
  calculateCostEfficiency: jest.fn(() => ({
    costPerToken: 0,
    tokensPerDollar: 0,
    averageResponseTime: 0,
  })),
  getUsageRecommendations: jest.fn(() => []),
  getDailyUsageSummary: jest.fn(() => ({
    today: { totalRequests: 0, totalTokens: 0, totalCost: 0 },
    yesterday: { totalRequests: 0, totalTokens: 0, totalCost: 0 },
    thisWeek: { totalRequests: 0, totalTokens: 0, totalCost: 0 },
    thisMonth: { totalRequests: 0, totalTokens: 0, totalCost: 0 },
  })),
  filterRecordsByPeriod: jest.fn((records) => records),
}));

describe('useObservabilityData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUsageStore.records = [];
  });

  describe('initialization', () => {
    it('should return initial state with default time range', () => {
      const { result } = renderHook(() => useObservabilityData());

      expect(result.current.hasData).toBe(false);
      expect(result.current.recordCount).toBe(0);
      expect(result.current.statistics).toBeDefined();
      expect(result.current.metricsData).toBeDefined();
    });

    it('should accept time range parameter', () => {
      const { result } = renderHook(() => useObservabilityData('7d'));

      expect(result.current.hasData).toBe(false);
    });
  });

  describe('statistics', () => {
    it('should return usage statistics', () => {
      const { result } = renderHook(() => useObservabilityData());

      expect(result.current.statistics).toEqual({
        totalRequests: 0,
        totalTokens: 0,
        totalCost: 0,
        averageTokensPerRequest: 0,
        averageCostPerRequest: 0,
      });
    });
  });

  describe('breakdowns', () => {
    it('should return model breakdown', () => {
      const { result } = renderHook(() => useObservabilityData());

      expect(result.current.modelBreakdown).toEqual([]);
    });

    it('should return provider breakdown', () => {
      const { result } = renderHook(() => useObservabilityData());

      expect(result.current.providerBreakdown).toEqual([]);
    });
  });

  describe('time series', () => {
    it('should return time series data', () => {
      const { result } = renderHook(() => useObservabilityData());

      expect(result.current.timeSeries).toEqual([]);
    });
  });

  describe('trend', () => {
    it('should return usage trend', () => {
      const { result } = renderHook(() => useObservabilityData());

      expect(result.current.trend).toEqual({
        direction: 'stable',
        percentageChange: 0,
        periodComparison: { current: 0, previous: 0 },
      });
    });
  });

  describe('efficiency', () => {
    it('should return cost efficiency metrics', () => {
      const { result } = renderHook(() => useObservabilityData());

      expect(result.current.efficiency).toEqual({
        costPerToken: 0,
        tokensPerDollar: 0,
        averageResponseTime: 0,
      });
    });
  });

  describe('recommendations', () => {
    it('should return usage recommendations', () => {
      const { result } = renderHook(() => useObservabilityData());

      expect(result.current.recommendations).toEqual([]);
    });
  });

  describe('daily summary', () => {
    it('should return daily summary', () => {
      const { result } = renderHook(() => useObservabilityData());

      expect(result.current.dailySummary).toEqual({
        today: { totalRequests: 0, totalTokens: 0, totalCost: 0 },
        yesterday: { totalRequests: 0, totalTokens: 0, totalCost: 0 },
        thisWeek: { totalRequests: 0, totalTokens: 0, totalCost: 0 },
        thisMonth: { totalRequests: 0, totalTokens: 0, totalCost: 0 },
      });
    });
  });

  describe('metricsData', () => {
    it('should return metrics data for dashboard', () => {
      const { result } = renderHook(() => useObservabilityData());

      expect(result.current.metricsData).toEqual({
        totalRequests: 0,
        totalTokens: 0,
        totalCost: 0,
        averageLatency: 0,
        errorRate: 0,
        requestsByProvider: {},
        requestsByModel: {},
        tokensByProvider: {},
        costByProvider: {},
        latencyPercentiles: {
          p50: 0,
          p90: 0,
          p99: 0,
        },
      });
    });
  });

  describe('time range conversion', () => {
    it('should handle 1h time range', () => {
      const { result } = renderHook(() => useObservabilityData('1h'));

      expect(result.current.hasData).toBe(false);
    });

    it('should handle 24h time range', () => {
      const { result } = renderHook(() => useObservabilityData('24h'));

      expect(result.current.hasData).toBe(false);
    });

    it('should handle 7d time range', () => {
      const { result } = renderHook(() => useObservabilityData('7d'));

      expect(result.current.hasData).toBe(false);
    });

    it('should handle 30d time range', () => {
      const { result } = renderHook(() => useObservabilityData('30d'));

      expect(result.current.hasData).toBe(false);
    });
  });

  describe('hasData', () => {
    it('should be false when no records', () => {
      mockUsageStore.records = [];

      const { result } = renderHook(() => useObservabilityData());

      expect(result.current.hasData).toBe(false);
    });

    it('should be true when records exist', () => {
      mockUsageStore.records = [{ id: '1' }] as unknown as typeof mockUsageStore.records;

      const { result } = renderHook(() => useObservabilityData());

      expect(result.current.hasData).toBe(true);
    });
  });
});

describe('useObservabilityActions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('clearAllData', () => {
    it('should call clearUsageRecords', () => {
      const { result } = renderHook(() => useObservabilityActions());

      act(() => {
        result.current.clearAllData();
      });

      expect(mockUsageStore.clearUsageRecords).toHaveBeenCalled();
    });
  });

  describe('clearOldData', () => {
    it('should call clearRecordsBefore with correct date', () => {
      const { result } = renderHook(() => useObservabilityActions());

      act(() => {
        result.current.clearOldData(7);
      });

      expect(mockUsageStore.clearRecordsBefore).toHaveBeenCalled();
      const calledDate = mockUsageStore.clearRecordsBefore.mock.calls[0][0];
      expect(calledDate).toBeInstanceOf(Date);
    });

    it('should calculate correct cutoff date', () => {
      const { result } = renderHook(() => useObservabilityActions());

      act(() => {
        result.current.clearOldData(30);
      });

      const calledDate = mockUsageStore.clearRecordsBefore.mock.calls[0][0];
      const expectedDate = new Date();
      expectedDate.setDate(expectedDate.getDate() - 30);

      // Allow 1 second tolerance for test execution time
      expect(Math.abs(calledDate.getTime() - expectedDate.getTime())).toBeLessThan(1000);
    });
  });
});
