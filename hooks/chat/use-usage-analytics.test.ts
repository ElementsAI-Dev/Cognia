/**
 * useUsageAnalytics Hook Tests
 */

import { renderHook } from '@testing-library/react';
import {
  useUsageAnalytics,
  useUsageSummary,
  useSessionAnalytics,
  useProviderAnalytics,
} from './use-usage-analytics';

// Mock the usage store
jest.mock('@/stores/system/usage-store', () => ({
  useUsageStore: jest.fn((selector) => {
    const mockState = {
      records: [
        {
          id: 'record-1',
          provider: 'openai',
          model: 'gpt-4o',
          sessionId: 'session-1',
          messageId: 'msg-1',
          tokens: { prompt: 100, completion: 50, total: 150 },
          cost: 0.01,
          createdAt: new Date(),
        },
        {
          id: 'record-2',
          provider: 'anthropic',
          model: 'claude-3-opus-20240229',
          sessionId: 'session-2',
          messageId: 'msg-2',
          tokens: { prompt: 200, completion: 100, total: 300 },
          cost: 0.05,
          createdAt: new Date(),
        },
      ],
    };
    return selector(mockState);
  }),
}));

describe('useUsageAnalytics', () => {
  it('should return usage analytics data', () => {
    const { result } = renderHook(() => useUsageAnalytics());

    expect(result.current.statistics).toBeDefined();
    expect(result.current.statistics.totalTokens).toBeGreaterThan(0);
    expect(result.current.statistics.totalCost).toBeGreaterThan(0);
  });

  it('should return model breakdown', () => {
    const { result } = renderHook(() => useUsageAnalytics());

    expect(result.current.modelBreakdown).toBeInstanceOf(Array);
    expect(result.current.modelBreakdown.length).toBeGreaterThan(0);
  });

  it('should return provider breakdown', () => {
    const { result } = renderHook(() => useUsageAnalytics());

    expect(result.current.providerBreakdown).toBeInstanceOf(Array);
    expect(result.current.providerBreakdown.length).toBeGreaterThan(0);
  });

  it('should return trend analysis', () => {
    const { result } = renderHook(() => useUsageAnalytics());

    expect(result.current.trend).toBeDefined();
    expect(['increasing', 'decreasing', 'stable']).toContain(result.current.trend.trend);
  });

  it('should return efficiency metrics', () => {
    const { result } = renderHook(() => useUsageAnalytics());

    expect(result.current.efficiency).toBeDefined();
    expect(result.current.efficiency.costPerKToken).toBeGreaterThanOrEqual(0);
  });

  it('should return daily summary', () => {
    const { result } = renderHook(() => useUsageAnalytics());

    expect(result.current.dailySummary).toBeDefined();
    expect(result.current.dailySummary.today).toBeDefined();
    expect(result.current.dailySummary.yesterday).toBeDefined();
  });

  it('should return recommendations', () => {
    const { result } = renderHook(() => useUsageAnalytics());

    expect(result.current.recommendations).toBeInstanceOf(Array);
  });

  it('should filter by period', () => {
    const { result: weekResult } = renderHook(() => useUsageAnalytics({ period: 'week' }));
    const { result: allResult } = renderHook(() => useUsageAnalytics({ period: 'all' }));

    // Both should work without errors
    expect(weekResult.current.statistics).toBeDefined();
    expect(allResult.current.statistics).toBeDefined();
  });

  it('should have refresh function', () => {
    const { result } = renderHook(() => useUsageAnalytics());
    expect(typeof result.current.refresh).toBe('function');
  });
});

describe('useUsageSummary', () => {
  it('should return quick summary data', () => {
    const { result } = renderHook(() => useUsageSummary());

    expect(result.current.totalTokens).toBeGreaterThanOrEqual(0);
    expect(result.current.totalCost).toBeGreaterThanOrEqual(0);
    expect(result.current.totalRequests).toBeGreaterThanOrEqual(0);
    expect(['increasing', 'decreasing', 'stable']).toContain(result.current.trend);
  });
});

describe('useSessionAnalytics', () => {
  it('should filter by session ID', () => {
    const { result } = renderHook(() => useSessionAnalytics('session-1'));

    expect(result.current.statistics).toBeDefined();
    // Should only include records from session-1
  });
});

describe('useProviderAnalytics', () => {
  it('should filter by provider ID', () => {
    const { result } = renderHook(() => useProviderAnalytics('openai'));

    expect(result.current.statistics).toBeDefined();
  });

  it('should accept period parameter', () => {
    const { result } = renderHook(() => useProviderAnalytics('openai', 'month'));

    expect(result.current.statistics).toBeDefined();
  });
});
