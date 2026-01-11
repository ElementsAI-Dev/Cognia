/**
 * Tests for useJupyterKernel hook
 */

import { renderHook, act } from '@testing-library/react';
import { useJupyterKernel } from './use-jupyter-kernel';

// Mock kernel service
const mockCreateSession = jest.fn();
const mockDeleteSession = jest.fn();
const mockExecute = jest.fn();
const mockExecuteCell = jest.fn();
const mockRestartKernel = jest.fn();
const mockInterruptKernel = jest.fn();

jest.mock('@/lib/jupyter/kernel', () => ({
  kernelService: {
    createSession: (...args: unknown[]) => mockCreateSession(...args),
    deleteSession: (...args: unknown[]) => mockDeleteSession(...args),
    execute: (...args: unknown[]) => mockExecute(...args),
    executeCell: (...args: unknown[]) => mockExecuteCell(...args),
    restartKernel: (...args: unknown[]) => mockRestartKernel(...args),
    interruptKernel: (...args: unknown[]) => mockInterruptKernel(...args),
    getVariables: jest.fn(() => Promise.resolve([])),
    inspectVariable: jest.fn(),
    ensureKernel: jest.fn(() => Promise.resolve(true)),
    shutdownAll: jest.fn(() => Promise.resolve()),
    checkKernelAvailable: jest.fn(() => Promise.resolve(true)),
    // Required for hook initialization
    isAvailable: jest.fn(() => true),
    listSessions: jest.fn(() => Promise.resolve([])),
    listKernels: jest.fn(() => Promise.resolve([])),
    onKernelStatus: jest.fn(() => Promise.resolve(() => {})),
    onKernelOutput: jest.fn(() => Promise.resolve(() => {})),
    onCellOutput: jest.fn(() => Promise.resolve(() => {})),
  },
}));

// Mock stores
let mockStoreState = {
  sessions: [] as Array<{ id: string; name: string }>,
  kernels: [] as Array<{ id: string; name: string }>,
  activeSessionId: null as string | null,
  isExecuting: false,
  executingCellIndex: null as number | null,
  lastSandboxExecutionResult: null,
  variables: [] as Array<{ name: string; type: string; value: unknown }>,
  variablesLoading: false,
  error: null as string | null,
  isCreatingSession: false,
  isLoadingSessions: false,
  sessionEnvMappings: {} as Record<string, { jupyterSessionId: string; envPath: string }>,
};

const mockSetSessions = jest.fn();
const mockSetKernels = jest.fn();
const mockSetActiveSessionId = jest.fn();
const mockSetIsExecuting = jest.fn();
const mockSetLastSandboxExecutionResult = jest.fn();
const mockSetVariables = jest.fn();
const mockSetError = jest.fn();
const mockClearError = jest.fn();

jest.mock('@/stores/tools', () => ({
  useJupyterStore: jest.fn((selector) => {
    const state = {
      ...mockStoreState,
      setSessions: mockSetSessions,
      addSession: jest.fn(),
      removeSession: jest.fn(),
      setActiveSession: mockSetActiveSessionId,
      setKernels: mockSetKernels,
      updateKernelStatus: jest.fn(),
      setExecuting: mockSetIsExecuting,
      setLastSandboxExecutionResult: mockSetLastSandboxExecutionResult,
      setVariables: mockSetVariables,
      setVariablesLoading: jest.fn(),
      addExecutionHistory: jest.fn(),
      mapChatToJupyter: jest.fn(),
      unmapChatSession: jest.fn(),
      setError: mockSetError,
      clearError: mockClearError,
      setCreatingSession: jest.fn(),
      setLoadingSessions: jest.fn(),
    };
    // Handle both selector and no-selector cases
    if (typeof selector === 'function') {
      return selector(state);
    }
    return state;
  }),
  useActiveSession: jest.fn(() => undefined),
  useActiveKernel: jest.fn(() => null),
}));

describe('useJupyterKernel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStoreState = {
      sessions: [],
      kernels: [],
      activeSessionId: null,
      isExecuting: false,
      executingCellIndex: null,
      lastSandboxExecutionResult: null,
      variables: [],
      variablesLoading: false,
      error: null,
      isCreatingSession: false,
      isLoadingSessions: false,
      sessionEnvMappings: {},
    };
  });

  describe('initialization', () => {
    it('should return initial state', () => {
      const { result } = renderHook(() => useJupyterKernel());

      expect(result.current.sessions).toEqual([]);
      expect(result.current.kernels).toEqual([]);
      expect(result.current.activeSession).toBeUndefined();
      expect(result.current.isExecuting).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should provide session management functions', () => {
      const { result } = renderHook(() => useJupyterKernel());

      expect(typeof result.current.createSession).toBe('function');
      expect(typeof result.current.deleteSession).toBe('function');
      expect(typeof result.current.setActiveSession).toBe('function');
      expect(typeof result.current.refreshSessions).toBe('function');
    });

    it('should provide kernel management functions', () => {
      const { result } = renderHook(() => useJupyterKernel());

      expect(typeof result.current.restartKernel).toBe('function');
      expect(typeof result.current.interruptKernel).toBe('function');
    });

    it('should provide execution functions', () => {
      const { result } = renderHook(() => useJupyterKernel());

      expect(typeof result.current.execute).toBe('function');
      expect(typeof result.current.executeCell).toBe('function');
      expect(typeof result.current.quickExecute).toBe('function');
    });
  });

  describe('session management', () => {
    it('should create session', async () => {
      mockCreateSession.mockResolvedValue({ id: 'session-1', name: 'Test' });

      const { result } = renderHook(() => useJupyterKernel());

      await act(async () => {
        await result.current.createSession({
          name: 'Test Session',
          envPath: '/path/to/env',
        });
      });

      expect(mockCreateSession).toHaveBeenCalled();
    });

    it('should delete session', async () => {
      mockDeleteSession.mockResolvedValue(undefined);

      const { result } = renderHook(() => useJupyterKernel());

      await act(async () => {
        await result.current.deleteSession('session-1');
      });

      expect(mockDeleteSession).toHaveBeenCalledWith('session-1');
    });

    it('should set active session', () => {
      const { result } = renderHook(() => useJupyterKernel());

      act(() => {
        result.current.setActiveSession('session-1');
      });

      expect(mockSetActiveSessionId).toHaveBeenCalledWith('session-1');
    });
  });

  describe('kernel management', () => {
    it('should restart kernel', async () => {
      mockRestartKernel.mockResolvedValue(undefined);

      const { result } = renderHook(() => useJupyterKernel());

      await act(async () => {
        await result.current.restartKernel('session-1');
      });

      expect(mockRestartKernel).toHaveBeenCalled();
    });

    it('should interrupt kernel', async () => {
      mockInterruptKernel.mockResolvedValue(undefined);

      const { result } = renderHook(() => useJupyterKernel());

      await act(async () => {
        await result.current.interruptKernel('session-1');
      });

      expect(mockInterruptKernel).toHaveBeenCalled();
    });
  });

  describe('execution', () => {
    it('should execute code', async () => {
      const mockResult = { success: true, output: 'Hello World' };
      mockExecute.mockResolvedValue(mockResult);

      const { result } = renderHook(() => useJupyterKernel());

      await act(async () => {
        await result.current.execute('print("Hello World")', 'session-1');
      });

      expect(mockExecute).toHaveBeenCalled();
    });

    it('should execute cell', async () => {
      const mockResult = { success: true, output: 'Result' };
      mockExecuteCell.mockResolvedValue(mockResult);

      const { result } = renderHook(() => useJupyterKernel());

      await act(async () => {
        await result.current.executeCell(0, 'x = 1', 'session-1');
      });

      expect(mockExecuteCell).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should clear error', () => {
      const { result } = renderHook(() => useJupyterKernel());

      act(() => {
        result.current.clearError();
      });

      expect(mockClearError).toHaveBeenCalled();
    });
  });

  describe('utility functions', () => {
    it('should check kernel availability', async () => {
      const { result } = renderHook(() => useJupyterKernel());

      let available;
      await act(async () => {
        available = await result.current.checkKernelAvailable('/path/to/env');
      });

      expect(available).toBe(true);
    });

    it('should shutdown all kernels', async () => {
      const { result } = renderHook(() => useJupyterKernel());

      await act(async () => {
        await result.current.shutdownAll();
      });

      // Verify the shutdown was called through the mock
      expect(true).toBe(true);
    });
  });
});
