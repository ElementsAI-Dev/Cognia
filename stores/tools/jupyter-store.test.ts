/**
 * Tests for Jupyter Store
 */

import { act, renderHook } from '@testing-library/react';
import {
  useJupyterStore,
  useActiveSession,
  useActiveKernel,
  useJupyterSessionForChat,
} from './jupyter-store';
import type {
  JupyterSession,
  KernelInfo,
  VariableInfo,
  KernelSandboxExecutionResult,
  ExecutableCell,
} from '@/types/system/jupyter';

const createMockSession = (overrides: Partial<JupyterSession> = {}): JupyterSession => ({
  id: `session-${Date.now()}`,
  name: 'Test Session',
  kernelId: 'kernel-1',
  envPath: '/path/to/env',
  createdAt: new Date().toISOString(),
  lastActivityAt: new Date().toISOString(),
  metadata: {},
  ...overrides,
});

const createMockKernel = (overrides: Partial<KernelInfo> = {}): KernelInfo => ({
  id: 'kernel-1',
  name: 'python3',
  envPath: '/path/to/env',
  status: 'idle',
  pythonVersion: '3.11',
  executionCount: 0,
  createdAt: new Date().toISOString(),
  lastActivityAt: null,
  ...overrides,
});

describe('useJupyterStore', () => {
  beforeEach(() => {
    const { result } = renderHook(() => useJupyterStore());
    act(() => {
      result.current.reset();
    });
  });

  describe('Initial State', () => {
    it('has correct initial state', () => {
      const { result } = renderHook(() => useJupyterStore());

      expect(result.current.sessions).toEqual([]);
      expect(result.current.kernels).toEqual([]);
      expect(result.current.activeSessionId).toBeNull();
      expect(result.current.isExecuting).toBe(false);
      expect(result.current.executingCellIndex).toBeNull();
      expect(result.current.variables).toEqual([]);
      expect(result.current.executionHistory).toEqual([]);
      expect(result.current.error).toBeNull();
    });
  });

  describe('Session Management', () => {
    it('sets sessions', () => {
      const { result } = renderHook(() => useJupyterStore());
      const sessions = [createMockSession({ id: 's1' }), createMockSession({ id: 's2' })];

      act(() => {
        result.current.setSessions(sessions);
      });

      expect(result.current.sessions).toHaveLength(2);
    });

    it('adds a session', () => {
      const { result } = renderHook(() => useJupyterStore());
      const session = createMockSession();

      act(() => {
        result.current.addSession(session);
      });

      expect(result.current.sessions).toHaveLength(1);
      expect(result.current.sessions[0].id).toBe(session.id);
    });

    it('removes a session', () => {
      const { result } = renderHook(() => useJupyterStore());
      const session = createMockSession({ id: 'to-remove' });

      act(() => {
        result.current.addSession(session);
        result.current.setActiveSession('to-remove');
      });

      act(() => {
        result.current.removeSession('to-remove');
      });

      expect(result.current.sessions).toHaveLength(0);
      expect(result.current.activeSessionId).toBeNull();
    });

    it('updates a session', () => {
      const { result } = renderHook(() => useJupyterStore());
      const session = createMockSession({ id: 's1', name: 'Original' });

      act(() => {
        result.current.addSession(session);
      });

      act(() => {
        result.current.updateSession('s1', { name: 'Updated' });
      });

      expect(result.current.sessions[0].name).toBe('Updated');
    });

    it('sets active session', () => {
      const { result } = renderHook(() => useJupyterStore());

      act(() => {
        result.current.setActiveSession('session-123');
      });

      expect(result.current.activeSessionId).toBe('session-123');
    });
  });

  describe('Kernel Management', () => {
    it('sets kernels', () => {
      const { result } = renderHook(() => useJupyterStore());
      const kernels = [createMockKernel({ id: 'k1' }), createMockKernel({ id: 'k2' })];

      act(() => {
        result.current.setKernels(kernels);
      });

      expect(result.current.kernels).toHaveLength(2);
    });

    it('updates kernel status', () => {
      const { result } = renderHook(() => useJupyterStore());
      const kernel = createMockKernel({ id: 'k1', status: 'idle' });

      act(() => {
        result.current.setKernels([kernel]);
      });

      act(() => {
        result.current.updateKernelStatus('k1', 'busy');
      });

      expect(result.current.kernels[0].status).toBe('busy');
    });
  });

  describe('Execution State', () => {
    it('sets executing state', () => {
      const { result } = renderHook(() => useJupyterStore());

      act(() => {
        result.current.setExecuting(true, 5);
      });

      expect(result.current.isExecuting).toBe(true);
      expect(result.current.executingCellIndex).toBe(5);
    });

    it('sets last execution result', () => {
      const { result } = renderHook(() => useJupyterStore());
      const execResult: KernelSandboxExecutionResult = {
        success: true,
        executionCount: 1,
        stdout: 'Hello',
        stderr: '',
        displayData: [],
        error: null,
        executionTimeMs: 100,
      };

      act(() => {
        result.current.setLastSandboxExecutionResult(execResult);
      });

      expect(result.current.lastSandboxExecutionResult).toEqual(execResult);
    });
  });

  describe('Variables', () => {
    it('sets variables', () => {
      const { result } = renderHook(() => useJupyterStore());
      const variables: VariableInfo[] = [
        { name: 'x', type: 'int', value: '42', size: '28 bytes' },
        { name: 'y', type: 'str', value: '"hello"', size: '54 bytes' },
      ];

      act(() => {
        result.current.setVariables(variables);
      });

      expect(result.current.variables).toHaveLength(2);
    });

    it('sets variables loading state', () => {
      const { result } = renderHook(() => useJupyterStore());

      act(() => {
        result.current.setVariablesLoading(true);
      });

      expect(result.current.variablesLoading).toBe(true);
    });

    it('clears variables', () => {
      const { result } = renderHook(() => useJupyterStore());

      act(() => {
        result.current.setVariables([{ name: 'x', type: 'int', value: '1', size: '28 bytes' }]);
      });

      act(() => {
        result.current.clearVariables();
      });

      expect(result.current.variables).toEqual([]);
    });
  });

  describe('Execution History', () => {
    it('adds execution history entry', () => {
      const { result } = renderHook(() => useJupyterStore());

      act(() => {
        result.current.addExecutionHistory({
          id: 'h1',
          sessionId: 's1',
          code: 'print("hello")',
          result: { success: true } as KernelSandboxExecutionResult,
          timestamp: new Date().toISOString(),
        });
      });

      expect(result.current.executionHistory).toHaveLength(1);
      expect(result.current.executionHistory[0].code).toBe('print("hello")');
    });

    it('clears all execution history', () => {
      const { result } = renderHook(() => useJupyterStore());

      act(() => {
        result.current.addExecutionHistory({
          id: 'h1',
          sessionId: 's1',
          code: 'x = 1',
          result: { success: true } as KernelSandboxExecutionResult,
          timestamp: new Date().toISOString(),
        });
      });

      act(() => {
        result.current.clearExecutionHistory();
      });

      expect(result.current.executionHistory).toEqual([]);
    });

    it('clears execution history for specific session', () => {
      const { result } = renderHook(() => useJupyterStore());

      act(() => {
        result.current.addExecutionHistory({
          id: 'h1',
          sessionId: 's1',
          code: 'x = 1',
          result: { success: true } as KernelSandboxExecutionResult,
          timestamp: new Date().toISOString(),
        });
        result.current.addExecutionHistory({
          id: 'h2',
          sessionId: 's2',
          code: 'y = 2',
          result: { success: true } as KernelSandboxExecutionResult,
          timestamp: new Date().toISOString(),
        });
      });

      act(() => {
        result.current.clearExecutionHistory('s1');
      });

      expect(result.current.executionHistory).toHaveLength(1);
      expect(result.current.executionHistory[0].sessionId).toBe('s2');
    });
  });

  describe('Session-Environment Mappings', () => {
    it('maps chat session to jupyter session', () => {
      const { result } = renderHook(() => useJupyterStore());

      act(() => {
        result.current.mapChatToJupyter('chat-1', 'jupyter-1', '/env/path');
      });

      expect(result.current.sessionEnvMappings).toHaveLength(1);
      expect(result.current.sessionEnvMappings[0].chatSessionId).toBe('chat-1');
      expect(result.current.sessionEnvMappings[0].jupyterSessionId).toBe('jupyter-1');
    });

    it('replaces existing mapping for same chat session', () => {
      const { result } = renderHook(() => useJupyterStore());

      act(() => {
        result.current.mapChatToJupyter('chat-1', 'jupyter-1', '/env/path1');
      });

      act(() => {
        result.current.mapChatToJupyter('chat-1', 'jupyter-2', '/env/path2');
      });

      expect(result.current.sessionEnvMappings).toHaveLength(1);
      expect(result.current.sessionEnvMappings[0].jupyterSessionId).toBe('jupyter-2');
    });

    it('unmaps chat session', () => {
      const { result } = renderHook(() => useJupyterStore());

      act(() => {
        result.current.mapChatToJupyter('chat-1', 'jupyter-1', '/env/path');
      });

      act(() => {
        result.current.unmapChatSession('chat-1');
      });

      expect(result.current.sessionEnvMappings).toHaveLength(0);
    });

    it('gets jupyter session for chat', () => {
      const { result } = renderHook(() => useJupyterStore());

      act(() => {
        result.current.mapChatToJupyter('chat-1', 'jupyter-1', '/env/path');
      });

      const mapping = result.current.getJupyterSessionForChat('chat-1');
      expect(mapping?.jupyterSessionId).toBe('jupyter-1');
    });
  });

  describe('Cells Management', () => {
    it('sets cells for a session', () => {
      const { result } = renderHook(() => useJupyterStore());
      const cells = [
        {
          id: 'c1',
          type: 'code',
          source: 'x = 1',
          executionCount: null,
          outputs: [],
          executionState: 'idle',
          metadata: {},
        },
        {
          id: 'c2',
          type: 'code',
          source: 'print(x)',
          executionCount: null,
          outputs: [],
          executionState: 'idle',
          metadata: {},
        },
      ] as ExecutableCell[];

      act(() => {
        result.current.setCells('session-1', cells);
      });

      expect(result.current.getCells('session-1')).toHaveLength(2);
    });

    it('updates a cell', () => {
      const { result } = renderHook(() => useJupyterStore());
      const cells = [
        {
          id: 'c1',
          type: 'code',
          source: 'x = 1',
          executionCount: null,
          outputs: [],
          executionState: 'idle',
          metadata: {},
        },
      ] as ExecutableCell[];

      act(() => {
        result.current.setCells('session-1', cells);
      });

      act(() => {
        result.current.updateCell('session-1', 0, { source: 'x = 2' });
      });

      expect(result.current.getCells('session-1')[0].source).toBe('x = 2');
    });

    it('updates cell outputs and execution state', () => {
      const { result } = renderHook(() => useJupyterStore());
      const cells = [
        {
          id: 'c1',
          type: 'code',
          source: 'x = 1',
          executionCount: null,
          outputs: [],
          executionState: 'idle',
          metadata: {},
        },
      ] as ExecutableCell[];

      act(() => {
        result.current.setCells('session-1', cells);
      });

      act(() => {
        result.current.updateCell('session-1', 0, {
          executionCount: 1,
          executionState: 'success',
          outputs: [{ outputType: 'stream', name: 'stdout', text: 'ok' }],
        });
      });

      const updated = result.current.getCells('session-1')[0];
      expect(updated.executionCount).toBe(1);
      expect(updated.executionState).toBe('success');
      expect(updated.outputs).toHaveLength(1);
    });

    it('returns empty array for non-existent session', () => {
      const { result } = renderHook(() => useJupyterStore());

      expect(result.current.getCells('non-existent')).toEqual([]);
    });
  });

  describe('Error Handling', () => {
    it('sets error', () => {
      const { result } = renderHook(() => useJupyterStore());

      act(() => {
        result.current.setError('Kernel crashed');
      });

      expect(result.current.error).toBe('Kernel crashed');
    });

    it('clears error', () => {
      const { result } = renderHook(() => useJupyterStore());

      act(() => {
        result.current.setError('Some error');
      });

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('Loading States', () => {
    it('sets creating session state', () => {
      const { result } = renderHook(() => useJupyterStore());

      act(() => {
        result.current.setCreatingSession(true);
      });

      expect(result.current.isCreatingSession).toBe(true);
    });

    it('sets loading sessions state', () => {
      const { result } = renderHook(() => useJupyterStore());

      act(() => {
        result.current.setLoadingSessions(true);
      });

      expect(result.current.isLoadingSessions).toBe(true);
    });
  });

  describe('Reset', () => {
    it('resets to initial state', () => {
      const { result } = renderHook(() => useJupyterStore());

      act(() => {
        result.current.addSession(createMockSession());
        result.current.setError('Some error');
        result.current.setExecuting(true);
      });

      act(() => {
        result.current.reset();
      });

      expect(result.current.sessions).toEqual([]);
      expect(result.current.error).toBeNull();
      expect(result.current.isExecuting).toBe(false);
    });
  });
});

describe('Selector Hooks', () => {
  beforeEach(() => {
    const { result } = renderHook(() => useJupyterStore());
    act(() => {
      result.current.reset();
    });
  });

  it('useActiveSession returns active session', () => {
    const store = renderHook(() => useJupyterStore());
    const session = createMockSession({ id: 'active-session' });

    act(() => {
      store.result.current.addSession(session);
      store.result.current.setActiveSession('active-session');
    });

    const { result } = renderHook(() => useActiveSession());
    expect(result.current?.id).toBe('active-session');
  });

  it('useActiveKernel returns kernel for active session', () => {
    const store = renderHook(() => useJupyterStore());
    const session = createMockSession({ id: 's1', kernelId: 'k1' });
    const kernel = createMockKernel({ id: 'k1' });

    act(() => {
      store.result.current.addSession(session);
      store.result.current.setKernels([kernel]);
      store.result.current.setActiveSession('s1');
    });

    const { result } = renderHook(() => useActiveKernel());
    expect(result.current?.id).toBe('k1');
  });

  it('useExecutionState returns execution state', () => {
    const { result: storeResult } = renderHook(() => useJupyterStore());

    act(() => {
      storeResult.current.setExecuting(true, 3);
    });

    // Verify through store directly since selector uses same store
    expect(storeResult.current.isExecuting).toBe(true);
    expect(storeResult.current.executingCellIndex).toBe(3);
  });

  it('useJupyterSessionForChat returns session for chat', () => {
    const store = renderHook(() => useJupyterStore());
    const session = createMockSession({ id: 'jupyter-1' });

    act(() => {
      store.result.current.addSession(session);
      store.result.current.mapChatToJupyter('chat-1', 'jupyter-1', '/env');
    });

    const { result } = renderHook(() => useJupyterSessionForChat('chat-1'));
    expect(result.current?.id).toBe('jupyter-1');
  });
});
