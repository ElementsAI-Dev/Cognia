/**
 * Tests for useMcpToolUsage hook
 */

import { renderHook, act } from '@testing-library/react';
import { useMcpToolUsage } from './use-mcp-tool-usage';
import type { ToolUsageRecord } from '@/types/mcp';

// Mock format-utils
jest.mock('@/lib/mcp/format-utils', () => ({
  getSuccessRate: jest.fn((record: ToolUsageRecord) => {
    if (record.usageCount === 0) return 0;
    return Math.round((record.successCount / record.usageCount) * 100);
  }),
  getToolDisplayName: jest.fn((toolName: string) => {
    const parts = toolName.split('_');
    if (parts.length > 2) return parts.slice(2).join('_');
    return toolName;
  }),
  getServerNameFromToolName: jest.fn((toolName: string) => {
    const parts = toolName.split('_');
    if (parts.length > 1) return parts[1];
    return '';
  }),
}));

// Mock the MCP store with selector support
const mockStoreState: Record<string, unknown> = {};
jest.mock('@/stores', () => ({
  useMcpStore: jest.fn((selector?: (state: Record<string, unknown>) => unknown) => {
    if (selector) return selector(mockStoreState);
    return mockStoreState;
  }),
}));

describe('useMcpToolUsage', () => {
  const mockResetToolUsageHistory = jest.fn();

  const createRecord = (overrides: Partial<ToolUsageRecord> = {}): ToolUsageRecord => ({
    toolName: 'mcp_server1_read_file',
    usageCount: 10,
    successCount: 8,
    failureCount: 2,
    lastUsedAt: Date.now(),
    avgExecutionTime: 500,
    ...overrides,
  });

  const setMockStore = (overrides: Record<string, unknown> = {}) => {
    Object.assign(mockStoreState, {
      toolUsageHistory: new Map<string, ToolUsageRecord>(),
      resetToolUsageHistory: mockResetToolUsageHistory,
      ...overrides,
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();
    for (const key of Object.keys(mockStoreState)) delete mockStoreState[key];
  });

  describe('initial state', () => {
    it('should return empty records when no history', () => {
      setMockStore();

      const { result } = renderHook(() => useMcpToolUsage());

      expect(result.current.usageRecords).toEqual([]);
      expect(result.current.maxUsageCount).toBe(1);
      expect(result.current.sortBy).toBe('usage');
      expect(typeof result.current.setSortBy).toBe('function');
      expect(typeof result.current.resetHistory).toBe('function');
    });
  });

  describe('usageRecords processing', () => {
    it('should enrich records with successRate, displayName, and serverName', () => {
      const history = new Map<string, ToolUsageRecord>([
        ['mcp_server1_read_file', createRecord()],
      ]);
      setMockStore({ toolUsageHistory: history });

      const { result } = renderHook(() => useMcpToolUsage());

      expect(result.current.usageRecords).toHaveLength(1);
      expect(result.current.usageRecords[0].successRate).toBe(80);
      expect(result.current.usageRecords[0].displayName).toBe('read_file');
      expect(result.current.usageRecords[0].serverName).toBe('server1');
    });

    it('should handle records with zero usage', () => {
      const history = new Map<string, ToolUsageRecord>([
        ['tool1', createRecord({ toolName: 'tool1', usageCount: 0, successCount: 0 })],
      ]);
      setMockStore({ toolUsageHistory: history });

      const { result } = renderHook(() => useMcpToolUsage());

      expect(result.current.usageRecords[0].successRate).toBe(0);
    });
  });

  describe('sorting', () => {
    it('should sort by usage count descending by default', () => {
      const history = new Map<string, ToolUsageRecord>([
        ['tool-a', createRecord({ toolName: 'tool-a', usageCount: 5 })],
        ['tool-b', createRecord({ toolName: 'tool-b', usageCount: 15 })],
        ['tool-c', createRecord({ toolName: 'tool-c', usageCount: 10 })],
      ]);
      setMockStore({ toolUsageHistory: history });

      const { result } = renderHook(() => useMcpToolUsage());

      expect(result.current.usageRecords[0].toolName).toBe('tool-b');
      expect(result.current.usageRecords[1].toolName).toBe('tool-c');
      expect(result.current.usageRecords[2].toolName).toBe('tool-a');
    });

    it('should sort by success rate when sortBy is "success"', () => {
      const history = new Map<string, ToolUsageRecord>([
        ['tool-a', createRecord({ toolName: 'tool-a', usageCount: 10, successCount: 5 })],
        ['tool-b', createRecord({ toolName: 'tool-b', usageCount: 10, successCount: 9 })],
        ['tool-c', createRecord({ toolName: 'tool-c', usageCount: 10, successCount: 7 })],
      ]);
      setMockStore({ toolUsageHistory: history });

      const { result } = renderHook(() => useMcpToolUsage());

      act(() => {
        result.current.setSortBy('success');
      });

      expect(result.current.usageRecords[0].toolName).toBe('tool-b');
      expect(result.current.usageRecords[1].toolName).toBe('tool-c');
      expect(result.current.usageRecords[2].toolName).toBe('tool-a');
    });

    it('should sort by execution time when sortBy is "time"', () => {
      const history = new Map<string, ToolUsageRecord>([
        ['tool-a', createRecord({ toolName: 'tool-a', avgExecutionTime: 200 })],
        ['tool-b', createRecord({ toolName: 'tool-b', avgExecutionTime: 800 })],
        ['tool-c', createRecord({ toolName: 'tool-c', avgExecutionTime: 500 })],
      ]);
      setMockStore({ toolUsageHistory: history });

      const { result } = renderHook(() => useMcpToolUsage());

      act(() => {
        result.current.setSortBy('time');
      });

      expect(result.current.usageRecords[0].toolName).toBe('tool-b');
      expect(result.current.usageRecords[1].toolName).toBe('tool-c');
      expect(result.current.usageRecords[2].toolName).toBe('tool-a');
    });
  });

  describe('maxItems', () => {
    it('should limit records to maxItems', () => {
      const history = new Map<string, ToolUsageRecord>();
      for (let i = 0; i < 30; i++) {
        history.set(`tool-${i}`, createRecord({ toolName: `tool-${i}`, usageCount: 30 - i }));
      }
      setMockStore({ toolUsageHistory: history });

      const { result } = renderHook(() => useMcpToolUsage({ maxItems: 5 }));

      expect(result.current.usageRecords).toHaveLength(5);
    });

    it('should default maxItems to 20', () => {
      const history = new Map<string, ToolUsageRecord>();
      for (let i = 0; i < 25; i++) {
        history.set(`tool-${i}`, createRecord({ toolName: `tool-${i}`, usageCount: 25 - i }));
      }
      setMockStore({ toolUsageHistory: history });

      const { result } = renderHook(() => useMcpToolUsage());

      expect(result.current.usageRecords).toHaveLength(20);
    });
  });

  describe('maxUsageCount', () => {
    it('should return max usage count from records', () => {
      const history = new Map<string, ToolUsageRecord>([
        ['tool-a', createRecord({ toolName: 'tool-a', usageCount: 5 })],
        ['tool-b', createRecord({ toolName: 'tool-b', usageCount: 20 })],
        ['tool-c', createRecord({ toolName: 'tool-c', usageCount: 10 })],
      ]);
      setMockStore({ toolUsageHistory: history });

      const { result } = renderHook(() => useMcpToolUsage());

      expect(result.current.maxUsageCount).toBe(20);
    });

    it('should return 1 when no records (minimum)', () => {
      setMockStore();

      const { result } = renderHook(() => useMcpToolUsage());

      expect(result.current.maxUsageCount).toBe(1);
    });
  });

  describe('resetHistory', () => {
    it('should delegate to store resetToolUsageHistory', () => {
      setMockStore();

      const { result } = renderHook(() => useMcpToolUsage());

      act(() => {
        result.current.resetHistory();
      });

      expect(mockResetToolUsageHistory).toHaveBeenCalled();
    });
  });

  describe('setSortBy', () => {
    it('should update sortBy state', () => {
      setMockStore();

      const { result } = renderHook(() => useMcpToolUsage());

      expect(result.current.sortBy).toBe('usage');

      act(() => {
        result.current.setSortBy('success');
      });

      expect(result.current.sortBy).toBe('success');

      act(() => {
        result.current.setSortBy('time');
      });

      expect(result.current.sortBy).toBe('time');
    });
  });
});
