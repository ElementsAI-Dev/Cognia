/**
 * Tests for workflow-editor-store
 */

import { renderHook, act } from '@testing-library/react';

// Mock dependencies
jest.mock('nanoid', () => ({
  nanoid: jest.fn(() => 'test-id-123'),
}));

jest.mock('@xyflow/react', () => ({
  applyNodeChanges: jest.fn((changes, nodes) => nodes),
  applyEdgeChanges: jest.fn((changes, edges) => edges),
  addEdge: jest.fn((connection, edges) => [...edges, { id: 'edge-1', ...connection }]),
}));

jest.mock('@/types/workflow/workflow-editor', () => ({
  createEmptyVisualWorkflow: jest.fn(() => ({
    id: 'workflow-1',
    name: 'New Workflow',
    nodes: [],
    edges: [],
    settings: {},
  })),
  createDefaultNodeData: jest.fn((type) => ({
    type,
    label: `${type} Node`,
    config: {},
  })),
}));

jest.mock('@/lib/workflow-editor', () => ({
  executeVisualWorkflow: jest.fn(),
  pauseVisualWorkflow: jest.fn(),
  resumeVisualWorkflow: jest.fn(),
  cancelVisualWorkflow: jest.fn(),
  validateVisualWorkflow: jest.fn(() => []),
}));

jest.mock('../settings/settings-store', () => ({
  useSettingsStore: {
    getState: () => ({
      defaultProvider: 'openai',
      providerSettings: {
        openai: { apiKey: 'test-key', defaultModel: 'gpt-4o' },
      },
    }),
  },
}));

// Import after mocks
import { useWorkflowEditorStore } from './workflow-editor-store';

describe('useWorkflowEditorStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    const store = useWorkflowEditorStore.getState();
    if (store.reset) {
      act(() => {
        store.reset();
      });
    }
  });

  describe('initialization', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => useWorkflowEditorStore());

      expect(result.current.currentWorkflow).toBeNull();
      expect(result.current.selectedNodes).toEqual([]);
      expect(result.current.selectedEdges).toEqual([]);
      expect(result.current.isDirty).toBe(false);
      expect(result.current.isExecuting).toBe(false);
    });
  });

  describe('createWorkflow', () => {
    it('should create a new workflow', () => {
      const { result } = renderHook(() => useWorkflowEditorStore());

      act(() => {
        result.current.createWorkflow('Test Workflow');
      });

      expect(result.current.currentWorkflow).not.toBeNull();
    });

    it('should create workflow with default name', () => {
      const { result } = renderHook(() => useWorkflowEditorStore());

      act(() => {
        result.current.createWorkflow();
      });

      expect(result.current.currentWorkflow).not.toBeNull();
    });
  });

  describe('loadWorkflow', () => {
    it('should load a workflow', () => {
      const { result } = renderHook(() => useWorkflowEditorStore());

      const workflow = {
        id: 'test-workflow',
        name: 'Test',
        nodes: [],
        edges: [],
        settings: {},
      };

      act(() => {
        result.current.loadWorkflow(workflow as never);
      });

      expect(result.current.currentWorkflow?.id).toBe('test-workflow');
    });
  });

  describe('node operations', () => {
    it('should add a node', () => {
      const { result } = renderHook(() => useWorkflowEditorStore());

      act(() => {
        result.current.createWorkflow();
      });

      act(() => {
        result.current.addNode('prompt' as never, { x: 100, y: 100 });
      });

      expect(result.current.currentWorkflow?.nodes.length).toBeGreaterThan(0);
    });

    it('should update a node', () => {
      const { result } = renderHook(() => useWorkflowEditorStore());

      act(() => {
        result.current.createWorkflow();
      });

      let nodeId: string = '';
      act(() => {
        nodeId = result.current.addNode('prompt' as never, { x: 100, y: 100 });
      });

      act(() => {
        result.current.updateNode(nodeId, { label: 'Updated Node' } as never);
      });

      expect(result.current.isDirty).toBe(true);
    });

    it('should delete a node', () => {
      const { result } = renderHook(() => useWorkflowEditorStore());

      act(() => {
        result.current.createWorkflow();
      });

      let nodeId: string = '';
      act(() => {
        nodeId = result.current.addNode('prompt' as never, { x: 100, y: 100 });
      });

      const initialCount = result.current.currentWorkflow?.nodes.length || 0;

      act(() => {
        result.current.deleteNode(nodeId);
      });

      expect(result.current.currentWorkflow?.nodes.length).toBeLessThan(initialCount);
    });
  });

  describe('selection', () => {
    it('should select nodes', () => {
      const { result } = renderHook(() => useWorkflowEditorStore());

      act(() => {
        result.current.createWorkflow();
      });

      act(() => {
        result.current.selectNodes(['node-1', 'node-2']);
      });

      expect(result.current.selectedNodes).toContain('node-1');
      expect(result.current.selectedNodes).toContain('node-2');
    });

    it('should clear selection', () => {
      const { result } = renderHook(() => useWorkflowEditorStore());

      act(() => {
        result.current.selectNodes(['node-1']);
      });

      act(() => {
        result.current.clearSelection();
      });

      expect(result.current.selectedNodes).toEqual([]);
    });
  });

  describe('UI state', () => {
    it('should toggle node palette', () => {
      const { result } = renderHook(() => useWorkflowEditorStore());

      const initial = result.current.showNodePalette;

      act(() => {
        result.current.toggleNodePalette();
      });

      expect(result.current.showNodePalette).toBe(!initial);
    });

    it('should toggle config panel', () => {
      const { result } = renderHook(() => useWorkflowEditorStore());

      const initial = result.current.showConfigPanel;

      act(() => {
        result.current.toggleConfigPanel();
      });

      expect(result.current.showConfigPanel).toBe(!initial);
    });

    it('should toggle minimap', () => {
      const { result } = renderHook(() => useWorkflowEditorStore());

      const initial = result.current.showMinimap;

      act(() => {
        result.current.toggleMinimap();
      });

      expect(result.current.showMinimap).toBe(!initial);
    });
  });

  describe('search', () => {
    it('should set search query', () => {
      const { result } = renderHook(() => useWorkflowEditorStore());

      act(() => {
        result.current.setSearchQuery('test query');
      });

      expect(result.current.searchQuery).toBe('test query');
    });
  });

  describe('history', () => {
    it('should support undo', () => {
      const { result } = renderHook(() => useWorkflowEditorStore());

      act(() => {
        result.current.createWorkflow();
      });

      // Make a change
      act(() => {
        result.current.addNode('prompt' as never, { x: 100, y: 100 });
      });

      // Undo should be available
      expect(typeof result.current.undo).toBe('function');
    });

    it('should support redo', () => {
      const { result } = renderHook(() => useWorkflowEditorStore());

      expect(typeof result.current.redo).toBe('function');
    });
  });

  describe('validation', () => {
    it('should have validationErrors array', () => {
      const { result } = renderHook(() => useWorkflowEditorStore());

      expect(Array.isArray(result.current.validationErrors)).toBe(true);
    });
  });

  describe('debug mode', () => {
    it('should initialize with debug mode off', () => {
      const { result } = renderHook(() => useWorkflowEditorStore());

      expect(result.current.isDebugMode).toBe(false);
      expect(result.current.breakpoints.size).toBe(0);
      expect(result.current.debugStepIndex).toBe(-1);
      expect(result.current.isPausedAtBreakpoint).toBe(false);
    });

    it('should toggle debug mode', () => {
      const { result } = renderHook(() => useWorkflowEditorStore());

      act(() => {
        result.current.toggleDebugMode();
      });

      expect(result.current.isDebugMode).toBe(true);

      act(() => {
        result.current.toggleDebugMode();
      });

      expect(result.current.isDebugMode).toBe(false);
    });

    it('should reset debug state when toggling off', () => {
      const { result } = renderHook(() => useWorkflowEditorStore());

      act(() => {
        result.current.toggleDebugMode();
        result.current.setBreakpoint('node-1');
      });

      expect(result.current.isDebugMode).toBe(true);
      expect(result.current.breakpoints.has('node-1')).toBe(true);

      act(() => {
        result.current.toggleDebugMode();
      });

      expect(result.current.isDebugMode).toBe(false);
      expect(result.current.debugStepIndex).toBe(-1);
      expect(result.current.isPausedAtBreakpoint).toBe(false);
    });

    it('should set breakpoint', () => {
      const { result } = renderHook(() => useWorkflowEditorStore());

      act(() => {
        result.current.setBreakpoint('node-1');
      });

      expect(result.current.breakpoints.has('node-1')).toBe(true);
    });

    it('should remove breakpoint', () => {
      const { result } = renderHook(() => useWorkflowEditorStore());

      act(() => {
        result.current.setBreakpoint('node-1');
        result.current.setBreakpoint('node-2');
      });

      expect(result.current.breakpoints.size).toBe(2);

      act(() => {
        result.current.removeBreakpoint('node-1');
      });

      expect(result.current.breakpoints.has('node-1')).toBe(false);
      expect(result.current.breakpoints.has('node-2')).toBe(true);
    });

    it('should clear all breakpoints', () => {
      const { result } = renderHook(() => useWorkflowEditorStore());

      act(() => {
        result.current.setBreakpoint('node-1');
        result.current.setBreakpoint('node-2');
        result.current.setBreakpoint('node-3');
      });

      expect(result.current.breakpoints.size).toBe(3);

      act(() => {
        result.current.clearBreakpoints();
      });

      expect(result.current.breakpoints.size).toBe(0);
    });

    it('should have stepOver function', () => {
      const { result } = renderHook(() => useWorkflowEditorStore());

      expect(typeof result.current.stepOver).toBe('function');
    });

    it('should have stepInto function', () => {
      const { result } = renderHook(() => useWorkflowEditorStore());

      expect(typeof result.current.stepInto).toBe('function');
    });

    it('should have continueExecution function', () => {
      const { result } = renderHook(() => useWorkflowEditorStore());

      expect(typeof result.current.continueExecution).toBe('function');
    });

    it('should reset isPausedAtBreakpoint on continueExecution', () => {
      const { result } = renderHook(() => useWorkflowEditorStore());

      act(() => {
        result.current.toggleDebugMode();
      });

      // continueExecution should reset isPausedAtBreakpoint
      act(() => {
        result.current.continueExecution();
      });

      expect(result.current.isPausedAtBreakpoint).toBe(false);
    });
  });
});
