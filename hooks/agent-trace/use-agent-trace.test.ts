/**
 * Tests for useAgentTrace hook
 */

import { renderHook, act } from '@testing-library/react';
import { useAgentTrace } from './use-agent-trace';

// Mock dependencies
jest.mock('dexie-react-hooks', () => ({
  useLiveQuery: jest.fn((queryFn, deps, defaultValue) => {
    // Return default value for initial render
    return defaultValue;
  }),
}));

jest.mock('@/lib/db', () => ({
  db: {
    agentTraces: {
      where: jest.fn().mockReturnThis(),
      between: jest.fn().mockReturnThis(),
      reverse: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      toArray: jest.fn().mockResolvedValue([]),
      orderBy: jest.fn().mockReturnThis(),
      below: jest.fn().mockReturnThis(),
      count: jest.fn().mockResolvedValue(0),
      bulkDelete: jest.fn().mockResolvedValue(undefined),
    },
  },
}));

// Mock repository - use inline jest.fn() to avoid hoisting issues
jest.mock('@/lib/db/repositories/agent-trace-repository', () => ({
  agentTraceRepository: {
    getById: jest.fn(),
    delete: jest.fn(),
    clear: jest.fn(),
    findByLineNumber: jest.fn(),
    findLineAttributionWithBlame: jest.fn(),
    exportAsSpecRecord: jest.fn(),
  },
}));

// Import the mocked module to access mock functions
import { agentTraceRepository } from '@/lib/db/repositories/agent-trace-repository';
const mockGetById = agentTraceRepository.getById as jest.Mock;
const mockDelete = agentTraceRepository.delete as jest.Mock;
const mockClear = agentTraceRepository.clear as jest.Mock;
const mockFindByLineNumber = agentTraceRepository.findByLineNumber as jest.Mock;
const mockFindLineAttributionWithBlame = agentTraceRepository.findLineAttributionWithBlame as jest.Mock;
const mockExportAsSpecRecord = agentTraceRepository.exportAsSpecRecord as jest.Mock;

jest.mock('@/stores/settings', () => ({
  useSettingsStore: jest.fn((selector) => {
    const state = {
      agentTraceSettings: { enabled: true },
    };
    return selector(state);
  }),
}));

describe('useAgentTrace', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should return initial state', () => {
      const { result } = renderHook(() => useAgentTrace());

      expect(result.current.traces).toEqual([]);
      expect(result.current.error).toBeNull();
      expect(result.current.totalCount).toBe(0);
      expect(result.current.isEnabled).toBe(true);
    });

    it('should accept options', () => {
      const options = {
        sessionId: 'test-session',
        filePath: 'test/path',
        limit: 100,
      };

      const { result } = renderHook(() => useAgentTrace(options));

      expect(result.current.traces).toEqual([]);
    });
  });

  describe('getById', () => {
    it('should get trace by ID', async () => {
      const mockTrace = { id: 'trace-1', sessionId: 'session-1' };
      mockGetById.mockResolvedValue(mockTrace);

      const { result } = renderHook(() => useAgentTrace());

      let trace;
      await act(async () => {
        trace = await result.current.getById('trace-1');
      });

      expect(trace).toEqual(mockTrace);
      expect(mockGetById).toHaveBeenCalledWith('trace-1');
    });

    it('should handle getById error', async () => {
      mockGetById.mockRejectedValue(new Error('Not found'));

      const { result } = renderHook(() => useAgentTrace());

      let trace;
      await act(async () => {
        trace = await result.current.getById('invalid-id');
      });

      expect(trace).toBeNull();
      expect(result.current.error).toBe('Not found');
    });
  });

  describe('deleteTrace', () => {
    it('should delete a trace', async () => {
      mockDelete.mockResolvedValue(undefined);

      const { result } = renderHook(() => useAgentTrace());

      await act(async () => {
        await result.current.deleteTrace('trace-1');
      });

      expect(mockDelete).toHaveBeenCalledWith('trace-1');
    });

    it('should handle delete error', async () => {
      mockDelete.mockRejectedValue(new Error('Delete failed'));

      const { result } = renderHook(() => useAgentTrace());

      await expect(
        act(async () => {
          await result.current.deleteTrace('trace-1');
        })
      ).rejects.toThrow('Delete failed');
    });
  });

  describe('clearAll', () => {
    it('should clear all traces', async () => {
      mockClear.mockResolvedValue(undefined);

      const { result } = renderHook(() => useAgentTrace());

      await act(async () => {
        await result.current.clearAll();
      });

      expect(mockClear).toHaveBeenCalled();
    });

    it('should handle clear error', async () => {
      mockClear.mockRejectedValue(new Error('Clear failed'));

      const { result } = renderHook(() => useAgentTrace());

      await expect(
        act(async () => {
          await result.current.clearAll();
        })
      ).rejects.toThrow('Clear failed');
    });
  });

  describe('exportAsJson', () => {
    it('should export empty array as JSON', () => {
      const { result } = renderHook(() => useAgentTrace());

      const json = result.current.exportAsJson();
      expect(json).toBe('[]');
    });
  });

  describe('exportAsJsonl', () => {
    it('should export empty array as JSONL', () => {
      const { result } = renderHook(() => useAgentTrace());

      const jsonl = result.current.exportAsJsonl();
      expect(jsonl).toBe('');
    });
  });

  describe('findLineAttribution', () => {
    it('should find line attribution', async () => {
      const mockAttribution = {
        traceId: 'trace-1',
        filePath: 'src/test.ts',
        lineNumber: 10,
      };
      mockFindByLineNumber.mockResolvedValue(mockAttribution);

      const { result } = renderHook(() => useAgentTrace());

      let attribution;
      await act(async () => {
        attribution = await result.current.findLineAttribution('src/test.ts', 10);
      });

      expect(attribution).toEqual(mockAttribution);
      expect(mockFindByLineNumber).toHaveBeenCalledWith(
        'src/test.ts',
        10,
        undefined
      );
    });

    it('should find line attribution with vcs revision', async () => {
      mockFindByLineNumber.mockResolvedValue(null);

      const { result } = renderHook(() => useAgentTrace());

      await act(async () => {
        await result.current.findLineAttribution('src/test.ts', 10, 'abc123');
      });

      expect(mockFindByLineNumber).toHaveBeenCalledWith(
        'src/test.ts',
        10,
        'abc123'
      );
    });

    it('should handle findLineAttribution error', async () => {
      mockFindByLineNumber.mockRejectedValue(new Error('Find failed'));

      const { result } = renderHook(() => useAgentTrace());

      let attribution;
      await act(async () => {
        attribution = await result.current.findLineAttribution('src/test.ts', 10);
      });

      expect(attribution).toBeNull();
      expect(result.current.error).toBe('Find failed');
    });
  });

  describe('findLineAttributionWithBlame', () => {
    it('should find line attribution with blame', async () => {
      const mockResult = {
        blameInfo: { author: 'test', commitHash: 'abc123' },
        traceAttribution: { traceId: 'trace-1' },
      };
      mockFindLineAttributionWithBlame.mockResolvedValue(mockResult);

      const { result } = renderHook(() => useAgentTrace());

      let attribution;
      await act(async () => {
        attribution = await result.current.findLineAttributionWithBlame('src/test.ts', 10);
      });

      expect(attribution).toEqual(mockResult);
    });

    it('should handle findLineAttributionWithBlame error', async () => {
      mockFindLineAttributionWithBlame.mockRejectedValue(
        new Error('Blame failed')
      );

      const { result } = renderHook(() => useAgentTrace());

      let attribution;
      await act(async () => {
        attribution = await result.current.findLineAttributionWithBlame('src/test.ts', 10);
      });

      expect(attribution).toEqual({ blameInfo: null, traceAttribution: null });
      expect(result.current.error).toBe('Blame failed');
    });
  });

  describe('exportAsSpecRecord', () => {
    it('should export as spec record', async () => {
      const mockRecord = { id: 'record-1', files: [] };
      mockExportAsSpecRecord.mockResolvedValue(mockRecord);

      const { result } = renderHook(() => useAgentTrace());

      let record;
      await act(async () => {
        record = await result.current.exportAsSpecRecord();
      });

      expect(record).toEqual(mockRecord);
    });

    it('should export as spec record with session filter', async () => {
      mockExportAsSpecRecord.mockResolvedValue(null);

      const { result } = renderHook(() => useAgentTrace({ sessionId: 'session-1' }));

      await act(async () => {
        await result.current.exportAsSpecRecord();
      });

      expect(mockExportAsSpecRecord).toHaveBeenCalledWith({
        sessionId: 'session-1',
      });
    });

    it('should handle exportAsSpecRecord error', async () => {
      mockExportAsSpecRecord.mockRejectedValue(new Error('Export failed'));

      const { result } = renderHook(() => useAgentTrace());

      let record;
      await act(async () => {
        record = await result.current.exportAsSpecRecord();
      });

      expect(record).toBeNull();
      expect(result.current.error).toBe('Export failed');
    });
  });

  describe('refresh', () => {
    it('should trigger refresh', () => {
      const { result } = renderHook(() => useAgentTrace());

      // Should not throw
      act(() => {
        result.current.refresh();
      });
    });
  });
});
