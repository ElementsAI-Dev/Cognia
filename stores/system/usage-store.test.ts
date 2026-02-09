/**
 * Tests for Usage Store
 */

import { act } from '@testing-library/react';
import { useUsageStore } from './usage-store';

// Mock calculateCost and calculateCostFromTokens
jest.mock('@/types/system/usage', () => ({
  calculateCost: jest.fn(() => 0.01),
  calculateCostFromTokens: jest.fn(() => 0.02),
}));

describe('useUsageStore', () => {
  beforeEach(() => {
    useUsageStore.setState({
      records: [],
      totalTokens: 0,
      totalCost: 0,
    });
  });

  describe('initial state', () => {
    it('has correct initial state', () => {
      const state = useUsageStore.getState();
      expect(state.records).toEqual([]);
      expect(state.totalTokens).toBe(0);
      expect(state.totalCost).toBe(0);
    });
  });

  describe('addUsageRecord', () => {
    it('should add usage record', () => {
      act(() => {
        useUsageStore.getState().addUsageRecord({
          messageId: 'msg-1',
          sessionId: 'session-1',
          provider: 'openai',
          model: 'gpt-4',
          tokens: { prompt: 100, completion: 50, total: 150 },
        });
      });

      const state = useUsageStore.getState();
      expect(state.records).toHaveLength(1);
      expect(state.records[0].sessionId).toBe('session-1');
      expect(state.records[0].tokens.total).toBe(150);
      expect(state.totalTokens).toBe(150);
    });

    it('should accumulate total tokens and cost', () => {
      act(() => {
        useUsageStore.getState().addUsageRecord({
          messageId: 'msg-1',
          sessionId: 'session-1',
          provider: 'openai',
          model: 'gpt-4',
          tokens: { prompt: 100, completion: 50, total: 150 },
        });
        useUsageStore.getState().addUsageRecord({
          messageId: 'msg-2',
          sessionId: 'session-2',
          provider: 'openai',
          model: 'gpt-4',
          tokens: { prompt: 200, completion: 100, total: 300 },
        });
      });

      const state = useUsageStore.getState();
      expect(state.records).toHaveLength(2);
      expect(state.totalTokens).toBe(450);
    });
  });

  describe('clearUsageRecords', () => {
    it('should clear all records', () => {
      act(() => {
        useUsageStore.getState().addUsageRecord({
          messageId: 'msg-1',
          sessionId: 'session-1',
          provider: 'openai',
          model: 'gpt-4',
          tokens: { prompt: 100, completion: 50, total: 150 },
        });
      });

      act(() => {
        useUsageStore.getState().clearUsageRecords();
      });

      const state = useUsageStore.getState();
      expect(state.records).toHaveLength(0);
      expect(state.totalTokens).toBe(0);
      expect(state.totalCost).toBe(0);
    });
  });

  describe('clearRecordsBefore', () => {
    it('should clear records before date', () => {
      const oldDate = new Date('2024-01-01');
      const newDate = new Date('2024-06-01');

      useUsageStore.setState({
        records: [
          {
            id: '1',
            messageId: 'msg-1',
            sessionId: 'session-1',
            provider: 'openai',
            model: 'gpt-4',
            tokens: { prompt: 100, completion: 50, total: 150 },
            cost: 0.01,
            createdAt: oldDate,
          },
          {
            id: '2',
            messageId: 'msg-2',
            sessionId: 'session-2',
            provider: 'openai',
            model: 'gpt-4',
            tokens: { prompt: 200, completion: 100, total: 300 },
            cost: 0.02,
            createdAt: newDate,
          },
        ],
        totalTokens: 450,
        totalCost: 0.03,
      });

      act(() => {
        useUsageStore.getState().clearRecordsBefore(new Date('2024-03-01'));
      });

      const state = useUsageStore.getState();
      expect(state.records).toHaveLength(1);
      expect(state.totalTokens).toBe(300);
    });
  });

  describe('selectors', () => {
    beforeEach(() => {
      useUsageStore.setState({
        records: [
          {
            id: '1',
            messageId: 'msg-1',
            sessionId: 'session-1',
            provider: 'openai',
            model: 'gpt-4',
            tokens: { prompt: 100, completion: 50, total: 150 },
            cost: 0.01,
            createdAt: new Date(),
          },
          {
            id: '2',
            messageId: 'msg-2',
            sessionId: 'session-1',
            provider: 'openai',
            model: 'gpt-4',
            tokens: { prompt: 200, completion: 100, total: 300 },
            cost: 0.02,
            createdAt: new Date(),
          },
          {
            id: '3',
            messageId: 'msg-3',
            sessionId: 'session-2',
            provider: 'anthropic',
            model: 'claude-3',
            tokens: { prompt: 50, completion: 25, total: 75 },
            cost: 0.005,
            createdAt: new Date(),
          },
        ],
        totalTokens: 525,
        totalCost: 0.035,
      });
    });

    it('should get usage by session', () => {
      const session1Usage = useUsageStore.getState().getUsageBySession('session-1');
      expect(session1Usage).toHaveLength(2);
    });

    it('should get usage by provider', () => {
      const providerUsage = useUsageStore.getState().getUsageByProvider();
      expect(providerUsage).toHaveLength(2);

      const openaiUsage = providerUsage.find((p) => p.provider === 'openai');
      expect(openaiUsage?.tokens).toBe(450);
      expect(openaiUsage?.requests).toBe(2);
    });

    it('should get daily usage', () => {
      const dailyUsage = useUsageStore.getState().getDailyUsage(7);
      expect(dailyUsage).toHaveLength(8); // 7 days + today
    });

    it('should get total usage', () => {
      const total = useUsageStore.getState().getTotalUsage();
      expect(total.tokens).toBe(525);
      expect(total.cost).toBe(0.035);
      expect(total.requests).toBe(3);
    });
  });

  describe('addUsageFromTokens', () => {
    it('should add a record from AI SDK token counts', () => {
      act(() => {
        useUsageStore.getState().addUsageFromTokens({
          sessionId: 'session-1',
          messageId: 'msg-1',
          provider: 'openai',
          model: 'gpt-4o',
          inputTokens: 500,
          outputTokens: 200,
        });
      });

      const state = useUsageStore.getState();
      expect(state.records).toHaveLength(1);
      expect(state.records[0].tokens.prompt).toBe(500);
      expect(state.records[0].tokens.completion).toBe(200);
      expect(state.records[0].tokens.total).toBe(700);
      expect(state.totalTokens).toBe(700);
    });

    it('should store optional latency and status fields', () => {
      act(() => {
        useUsageStore.getState().addUsageFromTokens({
          sessionId: 'session-1',
          messageId: 'msg-1',
          provider: 'openai',
          model: 'gpt-4o',
          inputTokens: 100,
          outputTokens: 50,
          latency: 1500,
          status: 'error',
          errorMessage: 'Rate limit exceeded',
          timeToFirstToken: 200,
        });
      });

      const record = useUsageStore.getState().records[0];
      expect(record.latency).toBe(1500);
      expect(record.status).toBe('error');
      expect(record.errorMessage).toBe('Rate limit exceeded');
      expect(record.timeToFirstToken).toBe(200);
    });

    it('should default status to success', () => {
      act(() => {
        useUsageStore.getState().addUsageFromTokens({
          sessionId: 's1',
          messageId: 'm1',
          provider: 'openai',
          model: 'gpt-4o',
          inputTokens: 100,
          outputTokens: 50,
        });
      });

      expect(useUsageStore.getState().records[0].status).toBe('success');
    });
  });

  describe('autoCleanup', () => {
    it('should remove records older than retention period', () => {
      const oldDate = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000); // 100 days ago
      const recentDate = new Date();

      useUsageStore.setState({
        records: [
          {
            id: 'old-1',
            messageId: 'msg-old',
            sessionId: 'session-old',
            provider: 'openai',
            model: 'gpt-4',
            tokens: { prompt: 100, completion: 50, total: 150 },
            cost: 0.01,
            createdAt: oldDate,
          },
          {
            id: 'new-1',
            messageId: 'msg-new',
            sessionId: 'session-new',
            provider: 'openai',
            model: 'gpt-4',
            tokens: { prompt: 200, completion: 100, total: 300 },
            cost: 0.02,
            createdAt: recentDate,
          },
        ],
        totalTokens: 450,
        totalCost: 0.03,
      });

      act(() => {
        useUsageStore.getState().autoCleanup();
      });

      const state = useUsageStore.getState();
      expect(state.records).toHaveLength(1);
      expect(state.records[0].id).toBe('new-1');
      expect(state.totalTokens).toBe(300);
      expect(state.totalCost).toBe(0.02);
    });

    it('should not modify records if all are within retention', () => {
      const recentDate = new Date();

      useUsageStore.setState({
        records: [
          {
            id: '1',
            messageId: 'msg-1',
            sessionId: 'session-1',
            provider: 'openai',
            model: 'gpt-4',
            tokens: { prompt: 100, completion: 50, total: 150 },
            cost: 0.01,
            createdAt: recentDate,
          },
        ],
        totalTokens: 150,
        totalCost: 0.01,
      });

      act(() => {
        useUsageStore.getState().autoCleanup();
      });

      const state = useUsageStore.getState();
      expect(state.records).toHaveLength(1);
      expect(state.totalTokens).toBe(150);
    });
  });

  describe('getUsageByModel', () => {
    it('should return model breakdown sorted by tokens', () => {
      useUsageStore.setState({
        records: [
          {
            id: '1',
            messageId: 'msg-1',
            sessionId: 's1',
            provider: 'openai',
            model: 'gpt-4o',
            tokens: { prompt: 100, completion: 50, total: 150 },
            cost: 0.01,
            createdAt: new Date(),
            latency: 500,
          },
          {
            id: '2',
            messageId: 'msg-2',
            sessionId: 's1',
            provider: 'openai',
            model: 'gpt-4o',
            tokens: { prompt: 200, completion: 100, total: 300 },
            cost: 0.02,
            createdAt: new Date(),
            latency: 700,
          },
          {
            id: '3',
            messageId: 'msg-3',
            sessionId: 's2',
            provider: 'anthropic',
            model: 'claude-3',
            tokens: { prompt: 50, completion: 25, total: 75 },
            cost: 0.005,
            createdAt: new Date(),
            latency: 300,
          },
        ],
        totalTokens: 525,
        totalCost: 0.035,
      });

      const modelUsage = useUsageStore.getState().getUsageByModel();
      expect(modelUsage).toHaveLength(2);

      // gpt-4o should be first (450 tokens > 75 tokens)
      expect(modelUsage[0].model).toBe('gpt-4o');
      expect(modelUsage[0].tokens).toBe(450);
      expect(modelUsage[0].requests).toBe(2);
      expect(modelUsage[0].cost).toBeCloseTo(0.03);
      expect(modelUsage[0].avgLatency).toBe(600); // (500+700)/2
      expect(modelUsage[0].errorCount).toBe(0);

      expect(modelUsage[1].model).toBe('claude-3');
      expect(modelUsage[1].tokens).toBe(75);
      expect(modelUsage[1].requests).toBe(1);
    });

    it('should count errors in model breakdown', () => {
      useUsageStore.setState({
        records: [
          {
            id: '1',
            messageId: 'msg-1',
            sessionId: 's1',
            provider: 'openai',
            model: 'gpt-4o',
            tokens: { prompt: 100, completion: 50, total: 150 },
            cost: 0.01,
            createdAt: new Date(),
            status: 'success' as const,
          },
          {
            id: '2',
            messageId: 'msg-2',
            sessionId: 's1',
            provider: 'openai',
            model: 'gpt-4o',
            tokens: { prompt: 100, completion: 0, total: 100 },
            cost: 0,
            createdAt: new Date(),
            status: 'error' as const,
          },
          {
            id: '3',
            messageId: 'msg-3',
            sessionId: 's1',
            provider: 'openai',
            model: 'gpt-4o',
            tokens: { prompt: 100, completion: 0, total: 100 },
            cost: 0,
            createdAt: new Date(),
            status: 'timeout' as const,
          },
        ],
        totalTokens: 350,
        totalCost: 0.01,
      });

      const modelUsage = useUsageStore.getState().getUsageByModel();
      expect(modelUsage).toHaveLength(1);
      expect(modelUsage[0].errorCount).toBe(2);
      expect(modelUsage[0].requests).toBe(3);
    });
  });

  describe('getUsageByDateRange', () => {
    it('should filter records within date range', () => {
      const jan = new Date('2024-01-15');
      const mar = new Date('2024-03-15');
      const jun = new Date('2024-06-15');

      useUsageStore.setState({
        records: [
          { id: '1', messageId: 'm1', sessionId: 's1', provider: 'openai', model: 'gpt-4', tokens: { prompt: 100, completion: 50, total: 150 }, cost: 0.01, createdAt: jan },
          { id: '2', messageId: 'm2', sessionId: 's1', provider: 'openai', model: 'gpt-4', tokens: { prompt: 200, completion: 100, total: 300 }, cost: 0.02, createdAt: mar },
          { id: '3', messageId: 'm3', sessionId: 's1', provider: 'openai', model: 'gpt-4', tokens: { prompt: 50, completion: 25, total: 75 }, cost: 0.005, createdAt: jun },
        ],
        totalTokens: 525,
        totalCost: 0.035,
      });

      const result = useUsageStore.getState().getUsageByDateRange(new Date('2024-02-01'), new Date('2024-05-01'));
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('2');
    });

    it('should use current time as end date when not specified', () => {
      const pastDate = new Date('2024-01-01');
      const recentDate = new Date();

      useUsageStore.setState({
        records: [
          { id: '1', messageId: 'm1', sessionId: 's1', provider: 'openai', model: 'gpt-4', tokens: { prompt: 100, completion: 50, total: 150 }, cost: 0.01, createdAt: pastDate },
          { id: '2', messageId: 'm2', sessionId: 's1', provider: 'openai', model: 'gpt-4', tokens: { prompt: 200, completion: 100, total: 300 }, cost: 0.02, createdAt: recentDate },
        ],
        totalTokens: 450,
        totalCost: 0.03,
      });

      const result = useUsageStore.getState().getUsageByDateRange(new Date('2024-06-01'));
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('2');
    });
  });

  describe('getPerformanceMetrics', () => {
    it('should return zero metrics for empty records', () => {
      const metrics = useUsageStore.getState().getPerformanceMetrics();
      expect(metrics.avgLatency).toBe(0);
      expect(metrics.p95Latency).toBe(0);
      expect(metrics.avgTimeToFirstToken).toBe(0);
      expect(metrics.errorRate).toBe(0);
      expect(metrics.successRate).toBe(1);
      expect(metrics.avgTokensPerSecond).toBe(0);
      expect(metrics.totalErrors).toBe(0);
      expect(metrics.totalSuccesses).toBe(0);
    });

    it('should calculate latency metrics correctly', () => {
      useUsageStore.setState({
        records: [
          { id: '1', messageId: 'm1', sessionId: 's1', provider: 'openai', model: 'gpt-4', tokens: { prompt: 100, completion: 50, total: 150 }, cost: 0.01, createdAt: new Date(), latency: 200, status: 'success' as const },
          { id: '2', messageId: 'm2', sessionId: 's1', provider: 'openai', model: 'gpt-4', tokens: { prompt: 100, completion: 50, total: 150 }, cost: 0.01, createdAt: new Date(), latency: 400, status: 'success' as const },
          { id: '3', messageId: 'm3', sessionId: 's1', provider: 'openai', model: 'gpt-4', tokens: { prompt: 100, completion: 50, total: 150 }, cost: 0.01, createdAt: new Date(), latency: 600, status: 'success' as const },
        ],
        totalTokens: 450,
        totalCost: 0.03,
      });

      const metrics = useUsageStore.getState().getPerformanceMetrics();
      expect(metrics.avgLatency).toBe(400); // (200+400+600)/3
      expect(metrics.p95Latency).toBe(600);
      expect(metrics.totalSuccesses).toBe(3);
      expect(metrics.totalErrors).toBe(0);
      expect(metrics.errorRate).toBe(0);
      expect(metrics.successRate).toBe(1);
    });

    it('should calculate error rate correctly', () => {
      useUsageStore.setState({
        records: [
          { id: '1', messageId: 'm1', sessionId: 's1', provider: 'openai', model: 'gpt-4', tokens: { prompt: 100, completion: 50, total: 150 }, cost: 0.01, createdAt: new Date(), status: 'success' as const },
          { id: '2', messageId: 'm2', sessionId: 's1', provider: 'openai', model: 'gpt-4', tokens: { prompt: 100, completion: 0, total: 100 }, cost: 0, createdAt: new Date(), status: 'error' as const },
          { id: '3', messageId: 'm3', sessionId: 's1', provider: 'openai', model: 'gpt-4', tokens: { prompt: 100, completion: 0, total: 100 }, cost: 0, createdAt: new Date(), status: 'timeout' as const },
          { id: '4', messageId: 'm4', sessionId: 's1', provider: 'openai', model: 'gpt-4', tokens: { prompt: 100, completion: 50, total: 150 }, cost: 0.01, createdAt: new Date(), status: 'success' as const },
        ],
        totalTokens: 500,
        totalCost: 0.02,
      });

      const metrics = useUsageStore.getState().getPerformanceMetrics();
      expect(metrics.errorRate).toBe(0.5); // 2 errors out of 4
      expect(metrics.successRate).toBe(0.5);
      expect(metrics.totalErrors).toBe(2);
      expect(metrics.totalSuccesses).toBe(2);
    });

    it('should calculate time to first token average', () => {
      useUsageStore.setState({
        records: [
          { id: '1', messageId: 'm1', sessionId: 's1', provider: 'openai', model: 'gpt-4', tokens: { prompt: 100, completion: 50, total: 150 }, cost: 0.01, createdAt: new Date(), timeToFirstToken: 100 },
          { id: '2', messageId: 'm2', sessionId: 's1', provider: 'openai', model: 'gpt-4', tokens: { prompt: 100, completion: 50, total: 150 }, cost: 0.01, createdAt: new Date(), timeToFirstToken: 300 },
        ],
        totalTokens: 300,
        totalCost: 0.02,
      });

      const metrics = useUsageStore.getState().getPerformanceMetrics();
      expect(metrics.avgTimeToFirstToken).toBe(200); // (100+300)/2
    });

    it('should calculate tokens per second', () => {
      useUsageStore.setState({
        records: [
          { id: '1', messageId: 'm1', sessionId: 's1', provider: 'openai', model: 'gpt-4', tokens: { prompt: 100, completion: 500, total: 600 }, cost: 0.01, createdAt: new Date(), latency: 1000 },
          { id: '2', messageId: 'm2', sessionId: 's1', provider: 'openai', model: 'gpt-4', tokens: { prompt: 100, completion: 1000, total: 1100 }, cost: 0.01, createdAt: new Date(), latency: 2000 },
        ],
        totalTokens: 1700,
        totalCost: 0.02,
      });

      const metrics = useUsageStore.getState().getPerformanceMetrics();
      // Record 1: 500 tokens / 1s = 500 tok/s
      // Record 2: 1000 tokens / 2s = 500 tok/s
      // Average: 500 tok/s
      expect(metrics.avgTokensPerSecond).toBe(500);
    });

    it('should filter by providerId when specified', () => {
      useUsageStore.setState({
        records: [
          { id: '1', messageId: 'm1', sessionId: 's1', provider: 'openai', model: 'gpt-4', tokens: { prompt: 100, completion: 50, total: 150 }, cost: 0.01, createdAt: new Date(), latency: 200, status: 'success' as const },
          { id: '2', messageId: 'm2', sessionId: 's1', provider: 'anthropic', model: 'claude-3', tokens: { prompt: 100, completion: 0, total: 100 }, cost: 0, createdAt: new Date(), latency: 500, status: 'error' as const },
        ],
        totalTokens: 250,
        totalCost: 0.01,
      });

      const openaiMetrics = useUsageStore.getState().getPerformanceMetrics('openai');
      expect(openaiMetrics.totalErrors).toBe(0);
      expect(openaiMetrics.avgLatency).toBe(200);

      const anthropicMetrics = useUsageStore.getState().getPerformanceMetrics('anthropic');
      expect(anthropicMetrics.totalErrors).toBe(1);
      expect(anthropicMetrics.errorRate).toBe(1);
    });
  });

  describe('getErrorRate', () => {
    it('should return 0 for empty records', () => {
      expect(useUsageStore.getState().getErrorRate()).toBe(0);
    });

    it('should calculate overall error rate', () => {
      useUsageStore.setState({
        records: [
          { id: '1', messageId: 'm1', sessionId: 's1', provider: 'openai', model: 'gpt-4', tokens: { prompt: 100, completion: 50, total: 150 }, cost: 0.01, createdAt: new Date(), status: 'success' as const },
          { id: '2', messageId: 'm2', sessionId: 's1', provider: 'openai', model: 'gpt-4', tokens: { prompt: 100, completion: 0, total: 100 }, cost: 0, createdAt: new Date(), status: 'error' as const },
        ],
        totalTokens: 250,
        totalCost: 0.01,
      });

      expect(useUsageStore.getState().getErrorRate()).toBe(0.5);
    });

    it('should calculate error rate per provider', () => {
      useUsageStore.setState({
        records: [
          { id: '1', messageId: 'm1', sessionId: 's1', provider: 'openai', model: 'gpt-4', tokens: { prompt: 100, completion: 50, total: 150 }, cost: 0.01, createdAt: new Date(), status: 'success' as const },
          { id: '2', messageId: 'm2', sessionId: 's1', provider: 'anthropic', model: 'claude-3', tokens: { prompt: 100, completion: 0, total: 100 }, cost: 0, createdAt: new Date(), status: 'error' as const },
        ],
        totalTokens: 250,
        totalCost: 0.01,
      });

      expect(useUsageStore.getState().getErrorRate('openai')).toBe(0);
      expect(useUsageStore.getState().getErrorRate('anthropic')).toBe(1);
    });

    it('should count timeout as error', () => {
      useUsageStore.setState({
        records: [
          { id: '1', messageId: 'm1', sessionId: 's1', provider: 'openai', model: 'gpt-4', tokens: { prompt: 100, completion: 0, total: 100 }, cost: 0, createdAt: new Date(), status: 'timeout' as const },
        ],
        totalTokens: 100,
        totalCost: 0,
      });

      expect(useUsageStore.getState().getErrorRate()).toBe(1);
    });
  });
});
