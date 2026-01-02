/**
 * useWorkflowEditor Hook Tests
 */

import { renderHook, act } from '@testing-library/react';
import { useWorkflowEditor } from './use-workflow-editor';

// Mock dependencies
jest.mock('@/stores/workflow', () => ({
  useWorkflowEditorStore: jest.fn(() => ({
    currentWorkflow: null,
    isDirty: false,
    isExecuting: false,
    validationErrors: [],
    createWorkflow: jest.fn(),
    loadWorkflow: jest.fn(),
    saveWorkflow: jest.fn(),
    validate: jest.fn(() => []),
    startExecution: jest.fn(),
    pauseExecution: jest.fn(),
    resumeExecution: jest.fn(),
    cancelExecution: jest.fn(),
    updateNodeExecutionState: jest.fn(),
    addExecutionLog: jest.fn(),
    clearExecutionState: jest.fn(),
  })),
}));

jest.mock('@/hooks/use-workflow', () => ({
  useWorkflow: jest.fn(() => ({
    run: jest.fn().mockResolvedValue({ id: 'exec-1', status: 'completed' }),
    pause: jest.fn(),
    resume: jest.fn(),
    cancel: jest.fn(),
    isRunning: false,
  })),
}));

jest.mock('@/lib/workflow-editor/converter', () => ({
  visualToDefinition: jest.fn((workflow) => ({
    id: workflow?.id || 'test-id',
    name: workflow?.name || 'Test Workflow',
    steps: [],
  })),
}));

import { useWorkflowEditorStore } from '@/stores/workflow';
import { useWorkflow } from '@/hooks/designer';

const mockUseWorkflowEditorStore = useWorkflowEditorStore as jest.MockedFunction<typeof useWorkflowEditorStore>;
const mockUseWorkflow = useWorkflow as jest.MockedFunction<typeof useWorkflow>;

describe('useWorkflowEditor', () => {
  const mockStoreFunctions = {
    currentWorkflow: null,
    isDirty: false,
    isExecuting: false,
    validationErrors: [],
    createWorkflow: jest.fn(),
    loadWorkflow: jest.fn(),
    saveWorkflow: jest.fn(),
    validate: jest.fn(() => []),
    startExecution: jest.fn(),
    pauseExecution: jest.fn(),
    resumeExecution: jest.fn(),
    cancelExecution: jest.fn(),
    updateNodeExecutionState: jest.fn(),
    addExecutionLog: jest.fn(),
    clearExecutionState: jest.fn(),
  };

  const mockWorkflowFunctions = {
    run: jest.fn().mockResolvedValue({ id: 'exec-1', status: 'completed' }),
    pause: jest.fn(),
    resume: jest.fn(),
    cancel: jest.fn(),
    isRunning: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseWorkflowEditorStore.mockReturnValue(mockStoreFunctions);
    mockUseWorkflow.mockReturnValue(mockWorkflowFunctions);
  });

  it('should return initial state', () => {
    const { result } = renderHook(() => useWorkflowEditor());

    expect(result.current.currentWorkflow).toBeNull();
    expect(result.current.isDirty).toBe(false);
    expect(result.current.isExecuting).toBe(false);
    expect(result.current.validationErrors).toEqual([]);
  });

  it('should provide createWorkflow action', () => {
    const { result } = renderHook(() => useWorkflowEditor());

    act(() => {
      result.current.createWorkflow('New Workflow');
    });

    expect(mockStoreFunctions.createWorkflow).toHaveBeenCalledWith('New Workflow');
  });

  it('should provide loadWorkflow action', () => {
    const { result } = renderHook(() => useWorkflowEditor());
    const mockWorkflow = { id: 'wf-1', name: 'Test', nodes: [], edges: [] };

    act(() => {
      result.current.loadWorkflow(mockWorkflow as never);
    });

    expect(mockStoreFunctions.loadWorkflow).toHaveBeenCalledWith(mockWorkflow);
  });

  it('should provide saveWorkflow action', () => {
    const { result } = renderHook(() => useWorkflowEditor());

    act(() => {
      result.current.saveWorkflow();
    });

    expect(mockStoreFunctions.saveWorkflow).toHaveBeenCalled();
  });

  it('should provide validate action', () => {
    const { result } = renderHook(() => useWorkflowEditor());

    let isValid;
    act(() => {
      isValid = result.current.validate();
    });

    expect(mockStoreFunctions.validate).toHaveBeenCalled();
    expect(isValid).toBe(true);
  });

  it('should execute workflow', async () => {
    mockUseWorkflowEditorStore.mockReturnValue({
      ...mockStoreFunctions,
      currentWorkflow: { id: 'wf-1', name: 'Test', nodes: [], edges: [] },
    });

    const { result } = renderHook(() => useWorkflowEditor());

    await act(async () => {
      await result.current.executeWorkflow({ input: 'test' });
    });

    expect(mockStoreFunctions.startExecution).toHaveBeenCalled();
  });

  it('should return null when executing without workflow', async () => {
    const { result } = renderHook(() => useWorkflowEditor());

    let execution;
    await act(async () => {
      execution = await result.current.executeWorkflow();
    });

    expect(execution).toBeNull();
  });

  it('should provide pause/resume/cancel actions', () => {
    const { result } = renderHook(() => useWorkflowEditor());

    act(() => {
      result.current.pauseExecution();
    });
    expect(mockWorkflowFunctions.pause).toHaveBeenCalled();

    act(() => {
      result.current.resumeExecution();
    });
    expect(mockWorkflowFunctions.resume).toHaveBeenCalled();

    act(() => {
      result.current.cancelExecution();
    });
    expect(mockWorkflowFunctions.cancel).toHaveBeenCalled();
  });

  it('should export workflow as JSON', () => {
    mockUseWorkflowEditorStore.mockReturnValue({
      ...mockStoreFunctions,
      currentWorkflow: { id: 'wf-1', name: 'Test', nodes: [], edges: [] },
    });

    const { result } = renderHook(() => useWorkflowEditor());

    let exported;
    act(() => {
      exported = result.current.exportWorkflow();
    });

    expect(typeof exported).toBe('string');
  });

  it('should return null when exporting without workflow', () => {
    const { result } = renderHook(() => useWorkflowEditor());

    let exported;
    act(() => {
      exported = result.current.exportWorkflow();
    });

    expect(exported).toBeNull();
  });

  it('should import workflow from JSON', () => {
    const { result } = renderHook(() => useWorkflowEditor());
    const json = JSON.stringify({ id: 'wf-1', name: 'Imported', nodes: [], edges: [] });

    let imported;
    act(() => {
      imported = result.current.importWorkflow(json);
    });

    expect(imported).toBe(true);
    expect(mockStoreFunctions.loadWorkflow).toHaveBeenCalled();
  });

  it('should handle invalid JSON on import', () => {
    const { result } = renderHook(() => useWorkflowEditor());

    let imported;
    act(() => {
      imported = result.current.importWorkflow('invalid json');
    });

    expect(imported).toBe(false);
  });

  it('should accept options', () => {
    const onComplete = jest.fn();
    const onError = jest.fn();

    const { result } = renderHook(() => 
      useWorkflowEditor({
        autoSave: false,
        autoSaveInterval: 60000,
        onExecutionComplete: onComplete,
        onExecutionError: onError,
      })
    );

    expect(result.current.currentWorkflow).toBeNull();
  });
});
