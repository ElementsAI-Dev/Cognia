/**
 * Tests for execution-slice.ts
 * Verifies loggers.store usage and execution state management
 */

jest.mock('@xyflow/react', () => ({
  applyNodeChanges: jest.fn((changes, nodes) => nodes),
  applyEdgeChanges: jest.fn((changes, edges) => edges),
  addEdge: jest.fn((connection, edges) => [...edges, { id: 'edge-1', ...connection }]),
}));

jest.mock('nanoid', () => ({
  nanoid: jest.fn(() => 'test-id-123'),
}));

jest.mock('@/types/workflow/workflow-editor', () => ({
  createEmptyVisualWorkflow: jest.fn(() => ({
    id: 'workflow-1',
    name: 'New Workflow',
    nodes: [],
    edges: [],
    settings: {},
  })),
  createDefaultNodeData: jest.fn((type: string) => ({
    type,
    label: `${type} Node`,
    config: {},
  })),
}));

jest.mock('@/lib/logger', () => ({
  createLogger: jest.fn(() => ({
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    child: jest.fn(() => ({
      error: jest.fn(),
      warn: jest.fn(),
      info: jest.fn(),
      debug: jest.fn(),
    })),
  })),
  loggers: {
    store: {
      error: jest.fn(),
      warn: jest.fn(),
      info: jest.fn(),
      debug: jest.fn(),
    },
  },
}));

jest.mock('@/lib/workflow-editor', () => ({
  executeVisualWorkflow: jest.fn(),
  pauseVisualWorkflow: jest.fn(),
  resumeVisualWorkflow: jest.fn(),
  cancelVisualWorkflow: jest.fn(),
  validateVisualWorkflow: jest.fn(() => []),
  validateCompleteWorkflow: jest.fn(() => ({
    structureValidation: { errors: [], warnings: [] },
    ioValidation: { errors: [], warnings: [] },
  })),
}));

const mockOrchestratorRun = jest.fn();
const mockOrchestratorPersistExecution = jest.fn().mockResolvedValue(undefined);
const mockOrchestratorPause = jest.fn().mockResolvedValue(undefined);
const mockOrchestratorResume = jest.fn().mockResolvedValue(undefined);
const mockOrchestratorCancel = jest.fn().mockResolvedValue(undefined);

jest.mock('@/lib/workflow-editor/orchestrator', () => ({
  workflowOrchestrator: {
    runtime: 'browser',
    run: (...args: unknown[]) => mockOrchestratorRun(...args),
    persistExecution: (...args: unknown[]) => mockOrchestratorPersistExecution(...args),
    pause: (...args: unknown[]) => mockOrchestratorPause(...args),
    resume: (...args: unknown[]) => mockOrchestratorResume(...args),
    cancel: (...args: unknown[]) => mockOrchestratorCancel(...args),
  },
}));

jest.mock('@/lib/workflow-editor/layout', () => ({
  autoLayout: jest.fn((nodes: unknown[]) => nodes),
}));

jest.mock('@/lib/workflow-editor/trigger-sync-service', () => ({
  workflowTriggerSyncService: {
    ensureTriggerTask: jest.fn().mockResolvedValue(undefined),
    removeTriggerTask: jest.fn().mockResolvedValue(undefined),
    ensureBindings: jest.fn().mockResolvedValue(undefined),
    syncAllWorkflowTriggers: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('@/stores/settings', () => ({
  useSettingsStore: {
    getState: () => ({
      defaultProvider: 'openai',
      providerSettings: {
        openai: { apiKey: 'test-key', defaultModel: 'gpt-4o' },
      },
    }),
  },
}));

jest.mock('@/lib/db/repositories', () => ({
  workflowRepository: {
    getExecution: jest.fn(),
    saveExecution: jest.fn(),
    updateExecution: jest.fn(),
  },
}));

jest.mock('sonner', () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
    info: jest.fn(),
  },
}));

import { renderHook, act } from '@testing-library/react';
import { useWorkflowEditorStore } from '../index';
import { workflowRepository } from '@/lib/db/repositories';

describe('execution-slice (loggers integration)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const store = useWorkflowEditorStore.getState();
    if (store.reset) {
      act(() => {
        store.reset();
      });
    }
  });

  describe('persistExecution', () => {
    it('should use loggers.store.error on persistence failure', async () => {
      const { result } = renderHook(() => useWorkflowEditorStore());

      // Set up store with a workflow and execution state
      act(() => {
        result.current.createWorkflow('Test');
      });

      // Manually set executionState so persistExecution has data
      act(() => {
        useWorkflowEditorStore.setState({
          executionState: {
            executionId: 'exec-1',
            workflowId: result.current.currentWorkflow!.id,
            status: 'completed',
            input: {},
            output: {},
            nodeStates: {},
            logs: [],
            startedAt: new Date().toISOString(),
            completedAt: new Date().toISOString(),
          } as never,
        });
      });

      // Mock orchestrator persistence to throw (simulates persistence failure)
      mockOrchestratorPersistExecution.mockRejectedValueOnce(new Error('Persist failed'));

      await act(async () => {
        await result.current.persistExecution();
      });

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { loggers } = require('@/lib/logger');
      expect(loggers.store.error).toHaveBeenCalledWith(
        'Failed to persist execution',
        expect.any(Error)
      );
    });
  });

  describe('replayExecution', () => {
    it('should use loggers.store.error on replay failure', async () => {
      const { result } = renderHook(() => useWorkflowEditorStore());

      // Mock repository to throw
      (workflowRepository.getExecution as jest.Mock).mockRejectedValueOnce(
        new Error('DB read failed')
      );

      await act(async () => {
        await result.current.replayExecution('nonexistent-exec');
      });

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { loggers } = require('@/lib/logger');
      expect(loggers.store.error).toHaveBeenCalledWith(
        'Failed to replay execution',
        expect.any(Error)
      );
    });
  });

  describe('event convergence', () => {
    it('handles execution_completed event branch idempotently', async () => {
      const { result } = renderHook(() => useWorkflowEditorStore());

      act(() => {
        result.current.createWorkflow('Test');
      });

      mockOrchestratorRun.mockImplementationOnce(async (params: {
        workflow: { id: string };
        input: Record<string, unknown>;
        onEvent?: (event: {
          type: string;
          executionId: string;
          workflowId: string;
          runtime: 'browser' | 'tauri';
          timestamp: Date;
        }) => void;
      }) => {
        const now = new Date();
        params.onEvent?.({
          type: 'execution_started',
          executionId: 'exec-completed-1',
          workflowId: params.workflow.id,
          runtime: 'browser',
          timestamp: now,
        });
        params.onEvent?.({
          type: 'execution_completed',
          executionId: 'exec-completed-1',
          workflowId: params.workflow.id,
          runtime: 'browser',
          timestamp: now,
        });
        params.onEvent?.({
          type: 'execution_completed',
          executionId: 'exec-completed-1',
          workflowId: params.workflow.id,
          runtime: 'browser',
          timestamp: now,
        });
        return {
          executionId: 'exec-completed-1',
          workflowId: params.workflow.id,
          runtime: 'browser' as const,
          status: 'completed' as const,
          input: params.input,
          output: { ok: true },
          nodeStates: {},
          startedAt: now,
          completedAt: now,
        };
      });

      await act(async () => {
        await result.current.startExecution({});
      });

      const messages = (result.current.executionState?.logs || []).map((log) => log.message);
      const completionLogs = messages.filter((message) =>
        message.includes('Workflow execution completed successfully')
      );
      expect(completionLogs).toHaveLength(1);
      expect(result.current.executionState?.status).toBe('completed');
    });

    it('handles execution_failed event branch idempotently', async () => {
      const { result } = renderHook(() => useWorkflowEditorStore());

      act(() => {
        result.current.createWorkflow('Test');
      });

      mockOrchestratorRun.mockImplementationOnce(async (params: {
        workflow: { id: string };
        input: Record<string, unknown>;
        onEvent?: (event: {
          type: string;
          executionId: string;
          workflowId: string;
          runtime: 'browser' | 'tauri';
          timestamp: Date;
          error?: string;
        }) => void;
      }) => {
        const now = new Date();
        params.onEvent?.({
          type: 'execution_started',
          executionId: 'exec-failed-1',
          workflowId: params.workflow.id,
          runtime: 'browser',
          timestamp: now,
        });
        params.onEvent?.({
          type: 'execution_failed',
          executionId: 'exec-failed-1',
          workflowId: params.workflow.id,
          runtime: 'browser',
          timestamp: now,
          error: 'boom',
        });
        params.onEvent?.({
          type: 'execution_failed',
          executionId: 'exec-failed-1',
          workflowId: params.workflow.id,
          runtime: 'browser',
          timestamp: now,
          error: 'boom',
        });
        return {
          executionId: 'exec-failed-1',
          workflowId: params.workflow.id,
          runtime: 'browser' as const,
          status: 'failed' as const,
          input: params.input,
          output: {},
          nodeStates: {},
          startedAt: now,
          completedAt: now,
          error: 'boom',
        };
      });

      await act(async () => {
        await result.current.startExecution({});
      });

      const messages = (result.current.executionState?.logs || []).map((log) => log.message);
      const failedLogs = messages.filter((message) => message.includes('Workflow execution failed'));
      expect(failedLogs).toHaveLength(1);
      expect(result.current.executionState?.status).toBe('failed');
    });
  });

  describe('execution state', () => {
    it('should initialize with isExecuting false', () => {
      const { result } = renderHook(() => useWorkflowEditorStore());
      expect(result.current.isExecuting).toBe(false);
    });

    it('should initialize with executionState null', () => {
      const { result } = renderHook(() => useWorkflowEditorStore());
      expect(result.current.executionState).toBeNull();
    });

    it('should have clearExecutionState function', () => {
      const { result } = renderHook(() => useWorkflowEditorStore());
      expect(typeof result.current.clearExecutionState).toBe('function');
    });

    it('should have startExecution function', () => {
      const { result } = renderHook(() => useWorkflowEditorStore());
      expect(typeof result.current.startExecution).toBe('function');
    });

    it('should have persistExecution function', () => {
      const { result } = renderHook(() => useWorkflowEditorStore());
      expect(typeof result.current.persistExecution).toBe('function');
    });

    it('should have replayExecution function', () => {
      const { result } = renderHook(() => useWorkflowEditorStore());
      expect(typeof result.current.replayExecution).toBe('function');
    });
  });
});
