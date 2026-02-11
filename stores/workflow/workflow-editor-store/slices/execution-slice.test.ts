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
}));

jest.mock('@/lib/workflow-editor/layout', () => ({
  autoLayout: jest.fn((nodes: unknown[]) => nodes),
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

      // Mock repository.getExecution to throw (simulates DB failure)
      (workflowRepository.getExecution as jest.Mock).mockRejectedValueOnce(
        new Error('DB read failed')
      );

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
