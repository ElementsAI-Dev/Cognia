/**
 * Tests for useWorkflowExecution hook
 */

import { renderHook, act } from '@testing-library/react';
import { useWorkflowExecution, useQuickWorkflowExecution, useWorkflowExecutionWithKeyboard } from './use-workflow-execution';

// Mock the store
const mockStartExecution = jest.fn();
const mockPauseExecution = jest.fn();
const mockResumeExecution = jest.fn();
const mockCancelExecution = jest.fn();
const mockClearExecutionState = jest.fn();
const mockToggleExecutionPanel = jest.fn();

let mockStoreState = {
  currentWorkflow: { id: 'wf-1', name: 'Test Workflow' },
  executionState: null as null | {
    status: string;
    progress: number;
    currentNodeId?: string;
    logs: Array<{ timestamp: Date; level: string; message: string }>;
    nodeStates: Record<string, unknown>;
    executionId: string;
    startedAt?: Date;
    completedAt?: Date;
    output?: Record<string, unknown>;
    error?: string;
  },
  isExecuting: false,
  showExecutionPanel: false,
};

jest.mock('@/stores/workflow', () => ({
  useWorkflowEditorStore: jest.fn((selector) => {
    const state = {
      ...mockStoreState,
      startExecution: mockStartExecution,
      pauseExecution: mockPauseExecution,
      resumeExecution: mockResumeExecution,
      cancelExecution: mockCancelExecution,
      clearExecutionState: mockClearExecutionState,
      toggleExecutionPanel: mockToggleExecutionPanel,
    };
    return selector(state);
  }),
}));

describe('useWorkflowExecution', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStoreState = {
      currentWorkflow: { id: 'wf-1', name: 'Test Workflow' },
      executionState: null,
      isExecuting: false,
      showExecutionPanel: false,
    };
  });

  describe('initialization', () => {
    it('should return initial state', () => {
      const { result } = renderHook(() => useWorkflowExecution());

      expect(result.current.executionState).toBeNull();
      expect(result.current.isExecuting).toBe(false);
      expect(result.current.isPaused).toBe(false);
      expect(result.current.progress).toBe(0);
      expect(result.current.logs).toEqual([]);
    });

    it('should return action functions', () => {
      const { result } = renderHook(() => useWorkflowExecution());

      expect(typeof result.current.start).toBe('function');
      expect(typeof result.current.pause).toBe('function');
      expect(typeof result.current.resume).toBe('function');
      expect(typeof result.current.cancel).toBe('function');
    });

    it('should return utility functions', () => {
      const { result } = renderHook(() => useWorkflowExecution());

      expect(typeof result.current.getNodeState).toBe('function');
      expect(typeof result.current.getStepLogs).toBe('function');
      expect(typeof result.current.clearLogs).toBe('function');
    });
  });

  describe('status helpers', () => {
    it('should indicate canStart when workflow loaded and not executing', () => {
      const { result } = renderHook(() => useWorkflowExecution());

      expect(result.current.canStart).toBe(true);
      expect(result.current.canPause).toBe(false);
      expect(result.current.canResume).toBe(false);
      expect(result.current.canCancel).toBe(false);
    });

    it('should indicate canPause when executing', () => {
      mockStoreState.isExecuting = true;

      const { result } = renderHook(() => useWorkflowExecution());

      expect(result.current.canStart).toBe(false);
      expect(result.current.canPause).toBe(true);
      expect(result.current.canCancel).toBe(true);
    });

    it('should indicate canResume when paused', () => {
      mockStoreState.executionState = {
        status: 'paused',
        progress: 50,
        logs: [],
        nodeStates: {},
        executionId: 'exec-1',
      };

      const { result } = renderHook(() => useWorkflowExecution());

      expect(result.current.isPaused).toBe(true);
      expect(result.current.canResume).toBe(true);
    });
  });

  describe('start execution', () => {
    it('should call startExecution with input', async () => {
      const { result } = renderHook(() => useWorkflowExecution());

      await act(async () => {
        await result.current.start({ key: 'value' });
      });

      expect(mockStartExecution).toHaveBeenCalledWith({ key: 'value' });
    });

    it('should show execution panel if not visible', async () => {
      mockStoreState.showExecutionPanel = false;

      const { result } = renderHook(() => useWorkflowExecution());

      await act(async () => {
        await result.current.start();
      });

      expect(mockToggleExecutionPanel).toHaveBeenCalled();
    });

    it('should call onError callback on failure', async () => {
      mockStartExecution.mockRejectedValueOnce(new Error('Start failed'));
      const onError = jest.fn();

      const { result } = renderHook(() => useWorkflowExecution({ onError }));

      await act(async () => {
        await result.current.start();
      });

      expect(onError).toHaveBeenCalledWith('Start failed');
    });
  });

  describe('pause execution', () => {
    it('should call pauseExecution when executing', () => {
      mockStoreState.isExecuting = true;

      const { result } = renderHook(() => useWorkflowExecution());

      act(() => {
        result.current.pause();
      });

      expect(mockPauseExecution).toHaveBeenCalled();
    });

    it('should not pause when already paused', () => {
      mockStoreState.isExecuting = true;
      mockStoreState.executionState = {
        status: 'paused',
        progress: 50,
        logs: [],
        nodeStates: {},
        executionId: 'exec-1',
      };

      const { result } = renderHook(() => useWorkflowExecution());

      act(() => {
        result.current.pause();
      });

      expect(mockPauseExecution).not.toHaveBeenCalled();
    });
  });

  describe('resume execution', () => {
    it('should call resumeExecution when paused', () => {
      mockStoreState.executionState = {
        status: 'paused',
        progress: 50,
        logs: [],
        nodeStates: {},
        executionId: 'exec-1',
      };

      const { result } = renderHook(() => useWorkflowExecution());

      act(() => {
        result.current.resume();
      });

      expect(mockResumeExecution).toHaveBeenCalled();
    });

    it('should not resume when not paused', () => {
      mockStoreState.isExecuting = true;

      const { result } = renderHook(() => useWorkflowExecution());

      act(() => {
        result.current.resume();
      });

      expect(mockResumeExecution).not.toHaveBeenCalled();
    });
  });

  describe('cancel execution', () => {
    it('should call cancelExecution when executing', () => {
      mockStoreState.isExecuting = true;

      const { result } = renderHook(() => useWorkflowExecution());

      act(() => {
        result.current.cancel();
      });

      expect(mockCancelExecution).toHaveBeenCalled();
    });

    it('should call cancelExecution when paused', () => {
      mockStoreState.executionState = {
        status: 'paused',
        progress: 50,
        logs: [],
        nodeStates: {},
        executionId: 'exec-1',
      };

      const { result } = renderHook(() => useWorkflowExecution());

      act(() => {
        result.current.cancel();
      });

      expect(mockCancelExecution).toHaveBeenCalled();
    });
  });

  describe('getNodeState', () => {
    it('should return node state when available', () => {
      mockStoreState.executionState = {
        status: 'running',
        progress: 50,
        logs: [],
        nodeStates: { 'node-1': { status: 'completed' } },
        executionId: 'exec-1',
      };

      const { result } = renderHook(() => useWorkflowExecution());

      const state = result.current.getNodeState('node-1');

      expect(state).toEqual({ status: 'completed' });
    });

    it('should return undefined for unknown node', () => {
      mockStoreState.executionState = {
        status: 'running',
        progress: 50,
        logs: [],
        nodeStates: {},
        executionId: 'exec-1',
      };

      const { result } = renderHook(() => useWorkflowExecution());

      const state = result.current.getNodeState('unknown');

      expect(state).toBeUndefined();
    });
  });

  describe('getStepLogs', () => {
    it('should filter logs by step id', () => {
      mockStoreState.executionState = {
        status: 'running',
        progress: 50,
        logs: [
          { timestamp: new Date(), level: 'info', message: 'step-1: Starting' },
          { timestamp: new Date(), level: 'info', message: 'step-2: Running' },
          { timestamp: new Date(), level: 'info', message: 'step-1: Done' },
        ],
        nodeStates: {},
        executionId: 'exec-1',
      };

      const { result } = renderHook(() => useWorkflowExecution());

      const logs = result.current.getStepLogs('step-1');

      expect(logs).toHaveLength(2);
    });
  });
});

describe('useQuickWorkflowExecution', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStoreState = {
      currentWorkflow: { id: 'wf-1', name: 'Test Workflow' },
      executionState: null,
      isExecuting: false,
      showExecutionPanel: false,
    };
  });

  it('should auto-start with provided input', () => {
    renderHook(() => useQuickWorkflowExecution({ data: 'test' }));

    // Auto-start is triggered via useEffect
    expect(mockStartExecution).toHaveBeenCalledWith({ data: 'test' });
  });
});

describe('useWorkflowExecutionWithKeyboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStoreState = {
      currentWorkflow: { id: 'wf-1', name: 'Test Workflow' },
      executionState: null,
      isExecuting: true,
      showExecutionPanel: false,
    };
  });

  it('should pause on Space key when executing', () => {
    renderHook(() => useWorkflowExecutionWithKeyboard());

    act(() => {
      const event = new KeyboardEvent('keydown', { key: ' ' });
      window.dispatchEvent(event);
    });

    expect(mockPauseExecution).toHaveBeenCalled();
  });

  it('should cancel on Escape key', () => {
    renderHook(() => useWorkflowExecutionWithKeyboard());

    act(() => {
      const event = new KeyboardEvent('keydown', { key: 'Escape' });
      window.dispatchEvent(event);
    });

    expect(mockCancelExecution).toHaveBeenCalled();
  });
});
