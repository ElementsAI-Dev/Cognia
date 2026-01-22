/**
 * useSubAgent Hook Tests
 */

import { renderHook, act } from '@testing-library/react';
import { useSubAgentStore } from '@/stores/agent';

// Mock the stores before importing the hook
jest.mock('@/stores/agent');
jest.mock('@/stores/settings', () => ({
  useSettingsStore: jest.fn((selector) => {
    if (typeof selector !== 'function') return {};
    const state = {
      providerSettings: {
        openai: {
          apiKey: 'test-api-key',
          defaultModel: 'gpt-4o',
        },
      },
      defaultProvider: 'openai',
    };
    return selector(state);
  }),
}));

// Mock the sub-agent executor
jest.mock('@/lib/ai/agent/sub-agent-executor', () => ({
  executeSubAgent: jest.fn().mockResolvedValue({
    success: true,
    finalResponse: 'Test response',
    steps: [],
    totalSteps: 1,
    duration: 1000,
  }),
  executeSubAgentsParallel: jest.fn().mockResolvedValue({
    success: true,
    results: {},
    aggregatedResponse: 'Aggregated response',
    totalDuration: 2000,
  }),
  executeSubAgentsSequential: jest.fn().mockResolvedValue({
    success: true,
    results: {},
    aggregatedResponse: 'Aggregated response',
    totalDuration: 2000,
  }),
}));

// Import after mocks
import { useSubAgent } from './use-sub-agent';

describe('useSubAgent', () => {
  const mockSubAgents: Record<string, unknown> = {};
  const mockCreateSubAgent = jest.fn((input) => {
    const subAgent = {
      id: 'sub-agent-1',
      parentAgentId: input.parentAgentId,
      name: input.name,
      task: input.task,
      status: 'pending',
      progress: 0,
      config: {},
      logs: [],
      retryCount: 0,
      order: 0,
      createdAt: new Date(),
    };
    mockSubAgents[subAgent.id] = subAgent;
    return subAgent;
  });
  const mockUpdateSubAgent = jest.fn();
  const mockDeleteSubAgent = jest.fn();
  const mockSetSubAgentStatus = jest.fn();
  const mockSetSubAgentProgress = jest.fn();
  const mockSetSubAgentResult = jest.fn();
  const mockSetSubAgentError = jest.fn();
  const mockAddSubAgentLog = jest.fn();
  const mockCancelAllSubAgents = jest.fn();
  const mockClearCompletedSubAgents = jest.fn();
  const mockReorderSubAgents = jest.fn();
  const mockGetSubAgentsByParent = jest.fn().mockReturnValue([]);

  beforeEach(() => {
    jest.clearAllMocks();
    Object.keys(mockSubAgents).forEach((key) => delete mockSubAgents[key]);

    (useSubAgentStore as unknown as jest.Mock).mockImplementation((selector) => {
      const state = {
        subAgents: mockSubAgents,
        createSubAgent: mockCreateSubAgent,
        updateSubAgent: mockUpdateSubAgent,
        deleteSubAgent: mockDeleteSubAgent,
        setSubAgentStatus: mockSetSubAgentStatus,
        setSubAgentProgress: mockSetSubAgentProgress,
        setSubAgentResult: mockSetSubAgentResult,
        setSubAgentError: mockSetSubAgentError,
        addSubAgentLog: mockAddSubAgentLog,
        cancelAllSubAgents: mockCancelAllSubAgents,
        clearCompletedSubAgents: mockClearCompletedSubAgents,
        reorderSubAgents: mockReorderSubAgents,
        getSubAgentsByParent: mockGetSubAgentsByParent,
      };
      if (typeof selector === 'function') {
        return selector(state);
      }
      return state;
    });
  });

  describe('initialization', () => {
    it('should initialize with empty sub-agents', () => {
      const { result } = renderHook(() => useSubAgent({ parentAgentId: 'parent-1' }));

      expect(result.current.subAgents).toEqual([]);
      expect(result.current.activeSubAgents).toEqual([]);
      expect(result.current.completedSubAgents).toEqual([]);
      expect(result.current.failedSubAgents).toEqual([]);
      expect(result.current.isExecuting).toBe(false);
      expect(result.current.progress).toBe(0);
    });
  });

  describe('createSubAgent', () => {
    it('should create a sub-agent with parent ID', () => {
      const { result } = renderHook(() => useSubAgent({ parentAgentId: 'parent-1' }));

      act(() => {
        result.current.createSubAgent({
          name: 'Test SubAgent',
          task: 'Test task',
        });
      });

      expect(mockCreateSubAgent).toHaveBeenCalledWith({
        parentAgentId: 'parent-1',
        name: 'Test SubAgent',
        task: 'Test task',
      });
    });
  });

  describe('updateSubAgent', () => {
    it('should call store updateSubAgent', () => {
      const { result } = renderHook(() => useSubAgent({ parentAgentId: 'parent-1' }));

      act(() => {
        result.current.updateSubAgent('sub-agent-1', { name: 'Updated Name' });
      });

      expect(mockUpdateSubAgent).toHaveBeenCalledWith('sub-agent-1', { name: 'Updated Name' });
    });
  });

  describe('deleteSubAgent', () => {
    it('should call store deleteSubAgent', () => {
      const { result } = renderHook(() => useSubAgent({ parentAgentId: 'parent-1' }));

      act(() => {
        result.current.deleteSubAgent('sub-agent-1');
      });

      expect(mockDeleteSubAgent).toHaveBeenCalledWith('sub-agent-1');
    });
  });

  describe('cancelAll', () => {
    it('should cancel all sub-agents for the parent', () => {
      const { result } = renderHook(() => useSubAgent({ parentAgentId: 'parent-1' }));

      act(() => {
        result.current.cancelAll();
      });

      expect(mockCancelAllSubAgents).toHaveBeenCalledWith('parent-1');
    });
  });

  describe('reorder', () => {
    it('should reorder sub-agents', () => {
      const { result } = renderHook(() => useSubAgent({ parentAgentId: 'parent-1' }));

      act(() => {
        result.current.reorder(['id-3', 'id-1', 'id-2']);
      });

      expect(mockReorderSubAgents).toHaveBeenCalledWith('parent-1', ['id-3', 'id-1', 'id-2']);
    });
  });

  describe('clearCompleted', () => {
    it('should clear completed sub-agents', () => {
      const { result } = renderHook(() => useSubAgent({ parentAgentId: 'parent-1' }));

      act(() => {
        result.current.clearCompleted();
      });

      expect(mockClearCompletedSubAgents).toHaveBeenCalledWith('parent-1');
    });
  });

  describe('computed values', () => {
    it('should compute isExecuting based on active sub-agents', () => {
      mockGetSubAgentsByParent.mockReturnValue([
        { id: '1', status: 'running', progress: 50 },
        { id: '2', status: 'pending', progress: 0 },
      ]);

      const { result } = renderHook(() => useSubAgent({ parentAgentId: 'parent-1' }));

      expect(result.current.isExecuting).toBe(true);
      expect(result.current.activeSubAgents).toHaveLength(1);
    });

    it('should compute progress based on all sub-agents', () => {
      mockGetSubAgentsByParent.mockReturnValue([
        { id: '1', status: 'completed', progress: 100 },
        { id: '2', status: 'running', progress: 50 },
      ]);

      const { result } = renderHook(() => useSubAgent({ parentAgentId: 'parent-1' }));

      expect(result.current.progress).toBe(75);
    });

    it('should filter completed and failed sub-agents', () => {
      mockGetSubAgentsByParent.mockReturnValue([
        { id: '1', status: 'completed', progress: 100 },
        { id: '2', status: 'failed', progress: 30 },
        { id: '3', status: 'timeout', progress: 20 },
        { id: '4', status: 'running', progress: 50 },
      ]);

      const { result } = renderHook(() => useSubAgent({ parentAgentId: 'parent-1' }));

      expect(result.current.completedSubAgents).toHaveLength(1);
      expect(result.current.failedSubAgents).toHaveLength(2);
    });
  });
});
