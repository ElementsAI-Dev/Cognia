/**
 * Tests for useToolbarActions hook
 */

import { renderHook, act } from '@testing-library/react';
import { useToolbarActions } from './use-toolbar-actions';

// Mock store state with proper types
const mockStore: {
  currentWorkflow: { id: string; name: string } | null;
  isDirty: boolean;
  isExecuting: boolean;
  executionState: { status: string } | null;
  selectedNodes: string[];
  history: object[];
  historyIndex: number;
  validationErrors: { id: string; message: string }[];
  showNodePalette: boolean;
  showConfigPanel: boolean;
  showMinimap: boolean;
  saveWorkflow: jest.Mock;
  undo: jest.Mock;
  redo: jest.Mock;
  deleteNodes: jest.Mock;
  duplicateNode: jest.Mock;
  startExecution: jest.Mock;
  pauseExecution: jest.Mock;
  resumeExecution: jest.Mock;
  cancelExecution: jest.Mock;
  autoLayout: jest.Mock;
  alignNodes: jest.Mock;
  toggleNodePalette: jest.Mock;
  toggleConfigPanel: jest.Mock;
  toggleMinimap: jest.Mock;
  validate: jest.Mock;
} = {
  currentWorkflow: { id: 'workflow-1', name: 'Test Workflow' },
  isDirty: false,
  isExecuting: false,
  executionState: null,
  selectedNodes: [],
  history: [{}],
  historyIndex: 0,
  validationErrors: [],
  showNodePalette: true,
  showConfigPanel: true,
  showMinimap: false,
  saveWorkflow: jest.fn(),
  undo: jest.fn(),
  redo: jest.fn(),
  deleteNodes: jest.fn(),
  duplicateNode: jest.fn(),
  startExecution: jest.fn(),
  pauseExecution: jest.fn(),
  resumeExecution: jest.fn(),
  cancelExecution: jest.fn(),
  autoLayout: jest.fn(),
  alignNodes: jest.fn(),
  toggleNodePalette: jest.fn(),
  toggleConfigPanel: jest.fn(),
  toggleMinimap: jest.fn(),
  validate: jest.fn().mockReturnValue([]),
};

jest.mock('@/stores/workflow', () => ({
  useWorkflowEditorStore: jest.fn((selector) => selector(mockStore)),
}));

jest.mock('zustand/react/shallow', () => ({
  useShallow: jest.fn((selector) => selector),
}));

describe('useToolbarActions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset mock store state
    mockStore.currentWorkflow = { id: 'workflow-1', name: 'Test Workflow' };
    mockStore.isDirty = false;
    mockStore.isExecuting = false;
    mockStore.executionState = null;
    mockStore.selectedNodes = [];
    mockStore.history = [{}];
    mockStore.historyIndex = 0;
    mockStore.validationErrors = [];
    mockStore.validate.mockReturnValue([]);
  });

  describe('state', () => {
    it('should return toolbar state', () => {
      const { result } = renderHook(() => useToolbarActions());

      expect(result.current.state).toBeDefined();
      expect(result.current.state.canUndo).toBe(false);
      expect(result.current.state.canRedo).toBe(false);
      expect(result.current.state.canSave).toBe(false);
      expect(result.current.state.canRun).toBe(true);
      expect(result.current.state.canPause).toBe(false);
      expect(result.current.state.canResume).toBe(false);
      expect(result.current.state.canStop).toBe(false);
      expect(result.current.state.isValid).toBe(true);
      expect(result.current.state.hasSelection).toBe(false);
    });

    it('should compute canUndo correctly', () => {
      mockStore.historyIndex = 1;

      const { result } = renderHook(() => useToolbarActions());

      expect(result.current.state.canUndo).toBe(true);
    });

    it('should compute canRedo correctly', () => {
      mockStore.history = [{}, {}, {}];
      mockStore.historyIndex = 1;

      const { result } = renderHook(() => useToolbarActions());

      expect(result.current.state.canRedo).toBe(true);
    });

    it('should compute canSave correctly', () => {
      mockStore.isDirty = true;

      const { result } = renderHook(() => useToolbarActions());

      expect(result.current.state.canSave).toBe(true);
    });

    it('should compute canRun correctly when executing', () => {
      mockStore.isExecuting = true;

      const { result } = renderHook(() => useToolbarActions());

      expect(result.current.state.canRun).toBe(false);
    });

    it('should compute canPause correctly', () => {
      mockStore.isExecuting = true;
      mockStore.executionState = { status: 'running' };

      const { result } = renderHook(() => useToolbarActions());

      expect(result.current.state.canPause).toBe(true);
    });

    it('should compute canResume correctly', () => {
      mockStore.isExecuting = true;
      mockStore.executionState = { status: 'paused' };

      const { result } = renderHook(() => useToolbarActions());

      expect(result.current.state.canResume).toBe(true);
    });

    it('should compute canStop correctly', () => {
      mockStore.isExecuting = true;

      const { result } = renderHook(() => useToolbarActions());

      expect(result.current.state.canStop).toBe(true);
    });

    it('should compute isValid correctly', () => {
      mockStore.validationErrors = [{ id: '1', message: 'Error' }];

      const { result } = renderHook(() => useToolbarActions());

      expect(result.current.state.isValid).toBe(false);
    });

    it('should compute hasSelection correctly', () => {
      mockStore.selectedNodes = ['node-1', 'node-2'];

      const { result } = renderHook(() => useToolbarActions());

      expect(result.current.state.hasSelection).toBe(true);
    });
  });

  describe('handleSave', () => {
    it('should save when canSave is true', () => {
      mockStore.isDirty = true;

      const { result } = renderHook(() => useToolbarActions());

      act(() => {
        result.current.handleSave();
      });

      expect(mockStore.saveWorkflow).toHaveBeenCalled();
    });

    it('should not save when canSave is false', () => {
      mockStore.isDirty = false;

      const { result } = renderHook(() => useToolbarActions());

      act(() => {
        result.current.handleSave();
      });

      expect(mockStore.saveWorkflow).not.toHaveBeenCalled();
    });
  });

  describe('handleRun', () => {
    it('should validate and run when valid', () => {
      mockStore.validate.mockReturnValue([]);

      const { result } = renderHook(() => useToolbarActions());

      act(() => {
        result.current.handleRun();
      });

      expect(mockStore.validate).toHaveBeenCalled();
      expect(mockStore.startExecution).toHaveBeenCalledWith({});
    });

    it('should not run when validation fails', () => {
      mockStore.validate.mockReturnValue([{ id: '1', message: 'Error' }]);

      const { result } = renderHook(() => useToolbarActions());

      act(() => {
        result.current.handleRun();
      });

      expect(mockStore.validate).toHaveBeenCalled();
      expect(mockStore.startExecution).not.toHaveBeenCalled();
    });

    it('should not run when canRun is false', () => {
      mockStore.isExecuting = true;

      const { result } = renderHook(() => useToolbarActions());

      act(() => {
        result.current.handleRun();
      });

      expect(mockStore.validate).not.toHaveBeenCalled();
      expect(mockStore.startExecution).not.toHaveBeenCalled();
    });
  });

  describe('handleDeleteSelection', () => {
    it('should delete selected nodes', () => {
      mockStore.selectedNodes = ['node-1', 'node-2'];

      const { result } = renderHook(() => useToolbarActions());

      act(() => {
        result.current.handleDeleteSelection();
      });

      expect(mockStore.deleteNodes).toHaveBeenCalledWith(['node-1', 'node-2']);
    });

    it('should not delete when no selection', () => {
      mockStore.selectedNodes = [];

      const { result } = renderHook(() => useToolbarActions());

      act(() => {
        result.current.handleDeleteSelection();
      });

      expect(mockStore.deleteNodes).not.toHaveBeenCalled();
    });
  });

  describe('handleDuplicateSelection', () => {
    it('should duplicate selected nodes', () => {
      mockStore.selectedNodes = ['node-1', 'node-2'];

      const { result } = renderHook(() => useToolbarActions());

      act(() => {
        result.current.handleDuplicateSelection();
      });

      expect(mockStore.duplicateNode).toHaveBeenCalledTimes(2);
      expect(mockStore.duplicateNode).toHaveBeenCalledWith('node-1');
      expect(mockStore.duplicateNode).toHaveBeenCalledWith('node-2');
    });

    it('should not duplicate when no selection', () => {
      mockStore.selectedNodes = [];

      const { result } = renderHook(() => useToolbarActions());

      act(() => {
        result.current.handleDuplicateSelection();
      });

      expect(mockStore.duplicateNode).not.toHaveBeenCalled();
    });
  });

  describe('handleAlign', () => {
    it('should align nodes when multiple selected', () => {
      mockStore.selectedNodes = ['node-1', 'node-2'];

      const { result } = renderHook(() => useToolbarActions());

      act(() => {
        result.current.handleAlign('left');
      });

      expect(mockStore.alignNodes).toHaveBeenCalledWith('left');
    });

    it('should not align when less than 2 nodes selected', () => {
      mockStore.selectedNodes = ['node-1'];

      const { result } = renderHook(() => useToolbarActions());

      act(() => {
        result.current.handleAlign('center');
      });

      expect(mockStore.alignNodes).not.toHaveBeenCalled();
    });

    it('should support all alignment directions', () => {
      mockStore.selectedNodes = ['node-1', 'node-2'];

      const { result } = renderHook(() => useToolbarActions());

      const directions = ['left', 'center', 'right', 'top', 'middle', 'bottom'] as const;

      for (const direction of directions) {
        mockStore.alignNodes.mockClear();

        act(() => {
          result.current.handleAlign(direction);
        });

        expect(mockStore.alignNodes).toHaveBeenCalledWith(direction);
      }
    });
  });

  describe('exposed store actions', () => {
    it('should expose undo', () => {
      const { result } = renderHook(() => useToolbarActions());

      act(() => {
        result.current.undo();
      });

      expect(mockStore.undo).toHaveBeenCalled();
    });

    it('should expose redo', () => {
      const { result } = renderHook(() => useToolbarActions());

      act(() => {
        result.current.redo();
      });

      expect(mockStore.redo).toHaveBeenCalled();
    });

    it('should expose autoLayout', () => {
      const { result } = renderHook(() => useToolbarActions());

      act(() => {
        result.current.autoLayout();
      });

      expect(mockStore.autoLayout).toHaveBeenCalled();
    });

    it('should expose pauseExecution', () => {
      const { result } = renderHook(() => useToolbarActions());

      act(() => {
        result.current.pauseExecution();
      });

      expect(mockStore.pauseExecution).toHaveBeenCalled();
    });

    it('should expose resumeExecution', () => {
      const { result } = renderHook(() => useToolbarActions());

      act(() => {
        result.current.resumeExecution();
      });

      expect(mockStore.resumeExecution).toHaveBeenCalled();
    });

    it('should expose cancelExecution', () => {
      const { result } = renderHook(() => useToolbarActions());

      act(() => {
        result.current.cancelExecution();
      });

      expect(mockStore.cancelExecution).toHaveBeenCalled();
    });

    it('should expose toggle functions', () => {
      const { result } = renderHook(() => useToolbarActions());

      act(() => {
        result.current.toggleNodePalette();
        result.current.toggleConfigPanel();
        result.current.toggleMinimap();
      });

      expect(mockStore.toggleNodePalette).toHaveBeenCalled();
      expect(mockStore.toggleConfigPanel).toHaveBeenCalled();
      expect(mockStore.toggleMinimap).toHaveBeenCalled();
    });

    it('should expose validate', () => {
      const { result } = renderHook(() => useToolbarActions());

      act(() => {
        result.current.validate();
      });

      expect(mockStore.validate).toHaveBeenCalled();
    });
  });

  describe('exposed state', () => {
    it('should expose currentWorkflow', () => {
      const { result } = renderHook(() => useToolbarActions());

      expect(result.current.currentWorkflow).toEqual({ id: 'workflow-1', name: 'Test Workflow' });
    });

    it('should expose panel visibility states', () => {
      const { result } = renderHook(() => useToolbarActions());

      expect(result.current.showNodePalette).toBe(true);
      expect(result.current.showConfigPanel).toBe(true);
      expect(result.current.showMinimap).toBe(false);
    });

    it('should expose selectedNodes', () => {
      mockStore.selectedNodes = ['node-1'];

      const { result } = renderHook(() => useToolbarActions());

      expect(result.current.selectedNodes).toEqual(['node-1']);
    });

    it('should expose validationErrors', () => {
      mockStore.validationErrors = [{ id: '1', message: 'Error' }];

      const { result } = renderHook(() => useToolbarActions());

      expect(result.current.validationErrors).toEqual([{ id: '1', message: 'Error' }]);
    });

    it('should expose execution state', () => {
      mockStore.isExecuting = true;
      mockStore.executionState = { status: 'running' };

      const { result } = renderHook(() => useToolbarActions());

      expect(result.current.isExecuting).toBe(true);
      expect(result.current.executionState).toEqual({ status: 'running' });
    });
  });
});
