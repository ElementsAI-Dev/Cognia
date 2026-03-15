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
} from '@/types/jupyter';

const WORKSPACE_RETENTION_LIMIT = 5;

type TestNotebookWorkspaceRecoveryStatus = 'ready' | 'restoring' | 'needs_reconnect' | 'error';

interface TestNotebookWorkspaceSnapshot {
  surfaceId: string;
  sessionId: string | null;
  kernelId: string | null;
  selectedEnvPath: string | null;
  filePath: string | null;
  notebookContent: string | null;
  isDirty: boolean;
  recoveryStatus: TestNotebookWorkspaceRecoveryStatus;
  recoveryError: string | null;
  lastSavedAt: string | null;
  lastExecutedAt: string | null;
  updatedAt: string;
}

interface WorkspaceStoreExtensions {
  workspaces: Record<string, TestNotebookWorkspaceSnapshot>;
  upsertWorkspace: (snapshot: TestNotebookWorkspaceSnapshot) => void;
  getWorkspace: (surfaceId: string) => TestNotebookWorkspaceSnapshot | null;
}

const createMockSession = (overrides: Partial<JupyterSession> = {}): JupyterSession => ({
  id: 'session-1',
  name: 'Test Session',
  kernelId: null,
  envPath: '/path/to/env',
  createdAt: new Date().toISOString(),
  lastActivityAt: null,
  metadata: {},
  ...overrides,
});

const createMockKernel = (overrides: Partial<KernelInfo> = {}): KernelInfo => ({
  id: 'kernel-1',
  name: 'Python 3',
  envPath: '/path/to/env',
  status: 'idle',
  pythonVersion: '3.10.0',
  executionCount: 0,
  createdAt: new Date().toISOString(),
  lastActivityAt: null,
  ...overrides,
});

const _createMockVariable = (overrides: Partial<VariableInfo> = {}): VariableInfo => ({
  name: 'test_var',
  type: 'int',
  value: '42',
  size: null,
  ...overrides,
});

const _createMockResult = (
  overrides: Partial<KernelSandboxExecutionResult> = {}
): KernelSandboxExecutionResult => ({
  success: true,
  executionCount: 1,
  stdout: '',
  stderr: '',
  displayData: [],
  error: null,
  executionTimeMs: 100,
  ...overrides,
});

const createMockWorkspace = (
  overrides: Partial<TestNotebookWorkspaceSnapshot> = {}
): TestNotebookWorkspaceSnapshot => ({
  surfaceId: 'notebook-page',
  sessionId: 'session-1',
  kernelId: 'kernel-1',
  selectedEnvPath: '/path/to/env',
  filePath: 'C:/notebooks/demo.ipynb',
  notebookContent: '{"cells":[],"metadata":{},"nbformat":4,"nbformat_minor":5}',
  isDirty: true,
  recoveryStatus: 'ready',
  recoveryError: null,
  lastSavedAt: null,
  lastExecutedAt: null,
  updatedAt: '2026-03-14T10:00:00.000Z',
  ...overrides,
});

describe('useJupyterStore', () => {
  beforeEach(() => {
    const { result } = renderHook(() => useJupyterStore());
    act(() => {
      result.current.reset();
    });
  });

  describe('Session Management', () => {
    it('adds a session', () => {
      const { result } = renderHook(() => useJupyterStore());
      const session = createMockSession();

      act(() => {
        result.current.addSession(session);
      });

      expect(result.current.sessions).toHaveLength(1);
      expect(result.current.sessions[0].id).toBe('session-1');
    });

    it('removes a session', () => {
      const { result } = renderHook(() => useJupyterStore());

      act(() => {
        result.current.addSession(createMockSession({ id: 's1' }));
        result.current.addSession(createMockSession({ id: 's2' }));
      });

      act(() => {
        result.current.removeSession('s1');
      });

      expect(result.current.sessions).toHaveLength(1);
      expect(result.current.sessions[0].id).toBe('s2');
    });

    it('clears active session when removed', () => {
      const { result } = renderHook(() => useJupyterStore());

      act(() => {
        result.current.addSession(createMockSession({ id: 's1' }));
        result.current.setActiveSession('s1');
      });

      act(() => {
        result.current.removeSession('s1');
      });

      expect(result.current.activeSessionId).toBeNull();
    });

    it('updates a session', () => {
      const { result } = renderHook(() => useJupyterStore());

      act(() => {
        result.current.addSession(createMockSession({ id: 's1', name: 'Old Name' }));
      });

      act(() => {
        result.current.updateSession('s1', { name: 'New Name' });
      });

      expect(result.current.sessions[0].name).toBe('New Name');
    });

    it('sets active session', () => {
      const { result } = renderHook(() => useJupyterStore());

      act(() => {
        result.current.setActiveSession('session-1');
      });

      expect(result.current.activeSessionId).toBe('session-1');
    });
  });

  describe('Kernel Management', () => {
    it('sets kernels', () => {
      const { result } = renderHook(() => useJupyterStore());
      const kernels = [createMockKernel()];

      act(() => {
        result.current.setKernels(kernels);
      });

      expect(result.current.kernels).toHaveLength(1);
    });

    it('updates kernel status', () => {
      const { result } = renderHook(() => useJupyterStore());

      act(() => {
        result.current.setKernels([createMockKernel({ id: 'k1', status: 'idle' })]);
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

    it('clears executing state', () => {
      const { result } = renderHook(() => useJupyterStore());

      act(() => {
        result.current.setExecuting(true, 3);
      });

      act(() => {
        result.current.setExecuting(false);
      });

      expect(result.current.isExecuting).toBe(false);
      expect(result.current.executingCellIndex).toBeNull();
    });
  });

  describe('Variables', () => {
    it('sets variables', () => {
      const { result } = renderHook(() => useJupyterStore());

      act(() => {
        result.current.setVariables([
          { name: 'x', type: 'int', value: '10', size: null },
        ]);
      });

      expect(result.current.variables).toHaveLength(1);
      expect(result.current.variables[0].name).toBe('x');
    });

    it('clears variables', () => {
      const { result } = renderHook(() => useJupyterStore());

      act(() => {
        result.current.setVariables([
          { name: 'x', type: 'int', value: '10', size: null },
        ]);
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
          id: 'exec-1',
          sessionId: 's1',
          code: 'print("hello")',
          result: _createMockResult(),
          timestamp: new Date().toISOString(),
        });
      });

      expect(result.current.executionHistory).toHaveLength(1);
    });

    it('clears execution history for specific session', () => {
      const { result } = renderHook(() => useJupyterStore());

      act(() => {
        result.current.addExecutionHistory({
          id: 'exec-1',
          sessionId: 's1',
          code: 'x = 1',
          result: _createMockResult(),
          timestamp: new Date().toISOString(),
        });
        result.current.addExecutionHistory({
          id: 'exec-2',
          sessionId: 's2',
          code: 'y = 2',
          result: _createMockResult(),
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

  describe('Notebook Workspaces', () => {
    it('stores and restores a notebook workspace by surface id', () => {
      const { result } = renderHook(() => useJupyterStore());
      const workspaceStore = result.current as typeof result.current & WorkspaceStoreExtensions;
      const workspace = createMockWorkspace();

      act(() => {
        workspaceStore.upsertWorkspace(workspace);
      });

      const state = useJupyterStore.getState() as typeof result.current & WorkspaceStoreExtensions;

      expect(state.workspaces['notebook-page']).toMatchObject({
        filePath: 'C:/notebooks/demo.ipynb',
        selectedEnvPath: '/path/to/env',
        isDirty: true,
      });
      expect(state.getWorkspace('notebook-page')).toMatchObject({
        surfaceId: 'notebook-page',
        notebookContent: workspace.notebookContent,
      });
    });

    it('keeps document context and marks workspace for reconnect when its session is removed', () => {
      const { result } = renderHook(() => useJupyterStore());
      const workspaceStore = result.current as typeof result.current & WorkspaceStoreExtensions;

      act(() => {
        result.current.addSession(createMockSession({ id: 'session-1', kernelId: 'kernel-1' }));
        workspaceStore.upsertWorkspace(
          createMockWorkspace({
            surfaceId: 'notebook-page',
            sessionId: 'session-1',
            kernelId: 'kernel-1',
            notebookContent: '{"cells":[{"cell_type":"code","source":["print(1)"]}]}',
            filePath: 'C:/notebooks/recover.ipynb',
          })
        );
      });

      act(() => {
        result.current.removeSession('session-1');
      });

      const state = useJupyterStore.getState() as typeof result.current & WorkspaceStoreExtensions;

      expect(state.getWorkspace('notebook-page')).toMatchObject({
        surfaceId: 'notebook-page',
        sessionId: null,
        kernelId: null,
        recoveryStatus: 'needs_reconnect',
        filePath: 'C:/notebooks/recover.ipynb',
        notebookContent: '{"cells":[{"cell_type":"code","source":["print(1)"]}]}',
      });
    });

    it('evicts the oldest workspace snapshots beyond the retention limit', () => {
      const { result } = renderHook(() => useJupyterStore());
      const workspaceStore = result.current as typeof result.current & WorkspaceStoreExtensions;

      act(() => {
        for (let i = 0; i <= WORKSPACE_RETENTION_LIMIT; i += 1) {
          workspaceStore.upsertWorkspace(
            createMockWorkspace({
              surfaceId: `surface-${i}`,
              updatedAt: `2026-03-14T10:0${i}:00.000Z`,
            })
          );
        }
      });

      const state = useJupyterStore.getState() as typeof result.current & WorkspaceStoreExtensions;

      expect(Object.keys(state.workspaces)).toHaveLength(WORKSPACE_RETENTION_LIMIT);
      expect(state.getWorkspace('surface-0')).toBeNull();
      expect(state.getWorkspace(`surface-${WORKSPACE_RETENTION_LIMIT}`)).toMatchObject({
        surfaceId: `surface-${WORKSPACE_RETENTION_LIMIT}`,
      });
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
