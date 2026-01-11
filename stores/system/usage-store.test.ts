/**
 * Tests for Usage Store
 */

import { act } from '@testing-library/react';
import { useUsageStore } from './usage-store';

// Mock calculateCost function
jest.mock('@/types/system/usage', () => ({
  calculateCost: jest.fn(() => 0.01),
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

      const openaiUsage = providerUsage.find(p => p.provider === 'openai');
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
});
