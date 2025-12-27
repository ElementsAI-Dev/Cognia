/**
 * Tests for useWorkflow hook
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useWorkflow } from './use-workflow';

// Mock settings store
jest.mock('@/stores', () => ({
  useSettingsStore: (selector: (state: unknown) => unknown) => {
    const state = {
      defaultProvider: 'openai',
      providerSettings: {
        openai: {
          apiKey: 'test-api-key',
          defaultModel: 'gpt-4o',
          baseURL: undefined,
        },
      },
    };
    return selector(state);
  },
}));

// Mock workflow functions
const mockExecuteWorkflow = jest.fn();
const mockCreateWorkflowExecution = jest.fn();
const mockPauseWorkflow = jest.fn();
const mockResumeWorkflow = jest.fn();
const mockCancelWorkflow = jest.fn();
const mockGetGlobalWorkflowRegistry = jest.fn();

jest.mock('@/lib/ai/workflows', () => ({
  executeWorkflow: (...args: unknown[]) => mockExecuteWorkflow(...args),
  createWorkflowExecution: (...args: unknown[]) => mockCreateWorkflowExecution(...args),
  pauseWorkflow: (...args: unknown[]) => mockPauseWorkflow(...args),
  resumeWorkflow: (...args: unknown[]) => mockResumeWorkflow(...args),
  cancelWorkflow: (...args: unknown[]) => mockCancelWorkflow(...args),
  getGlobalWorkflowRegistry: () => mockGetGlobalWorkflowRegistry(),
}));

// Mock PPT workflow registration
jest.mock('@/lib/ai/workflows/ppt-workflow', () => ({
  registerPPTWorkflow: jest.fn(),
}));

describe('useWorkflow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetGlobalWorkflowRegistry.mockReturnValue({
      get: jest.fn((id: string) => ({
        id,
        name: 'Test Workflow',
        type: 'custom',
        steps: [],
      })),
      getAll: jest.fn(() => [
        { id: 'workflow1', name: 'Workflow 1', type: 'custom' },
        { id: 'workflow2', name: 'Workflow 2', type: 'ppt' },
      ]),
      getByType: jest.fn((type: string) => [
        { id: 'workflow1', name: 'Workflow 1', type },
      ]),
    });
  });

  describe('initialization', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => useWorkflow());

      expect(result.current.isRunning).toBe(false);
      expect(result.current.isPaused).toBe(false);
      expect(result.current.progress).toBe(0);
      expect(result.current.currentStepId).toBeNull();
      expect(result.current.execution).toBeNull();
      expect(result.current.result).toBeNull();
      expect(result.current.error).toBeNull();
      expect(result.current.logs).toEqual([]);
    });
  });

  describe('run', () => {
    it('should execute workflow successfully', async () => {
      const mockExecution = {
        id: 'exec-1',
        workflowId: 'test-workflow',
        status: 'completed',
        output: { result: 'success' },
      };

      mockExecuteWorkflow.mockResolvedValue({
        execution: mockExecution,
        success: true,
        output: { result: 'success' },
      });

      const { result } = renderHook(() => useWorkflow());

      let workflowResult: unknown;
      await act(async () => {
        workflowResult = await result.current.run('test-workflow', { input: 'test' });
      });

      expect(mockExecuteWorkflow).toHaveBeenCalled();
      expect(workflowResult).toHaveProperty('success', true);
    });

    it('should handle workflow execution error', async () => {
      mockExecuteWorkflow.mockRejectedValue(new Error('Workflow failed'));
      mockCreateWorkflowExecution.mockReturnValue({
        id: 'exec-1',
        workflowId: 'test-workflow',
        status: 'failed',
      });

      const { result } = renderHook(() => useWorkflow());

      let workflowResult: unknown;
      await act(async () => {
        workflowResult = await result.current.run('test-workflow', { input: 'test' });
      });

      expect(workflowResult).toHaveProperty('success', false);
      expect(result.current.error).toBe('Workflow failed');
    });

    it('should call onStart callback', async () => {
      const onStart = jest.fn();
      const mockExecution = { id: 'exec-1', status: 'running' };

      mockExecuteWorkflow.mockImplementation(async (_id, _session, _input, _config, callbacks) => {
        callbacks.onStart(mockExecution);
        return { execution: mockExecution, success: true };
      });

      const { result } = renderHook(() => useWorkflow({ onStart }));

      await act(async () => {
        await result.current.run('test-workflow', {});
      });

      expect(onStart).toHaveBeenCalledWith(mockExecution);
    });

    it('should call onProgress callback', async () => {
      const onProgress = jest.fn();
      const mockExecution = { id: 'exec-1', status: 'running' };

      mockExecuteWorkflow.mockImplementation(async (_id, _session, _input, _config, callbacks) => {
        callbacks.onProgress(mockExecution, 50);
        return { execution: mockExecution, success: true };
      });

      const { result } = renderHook(() => useWorkflow({ onProgress }));

      await act(async () => {
        await result.current.run('test-workflow', {});
      });

      expect(onProgress).toHaveBeenCalledWith(mockExecution, 50);
    });
  });

  describe('runPPT', () => {
    it('should run PPT generation workflow', async () => {
      mockExecuteWorkflow.mockResolvedValue({
        execution: { id: 'exec-1' },
        success: true,
        output: { presentation: { slides: [] } },
      });

      const { result } = renderHook(() => useWorkflow());

      await act(async () => {
        await result.current.runPPT({
          topic: 'Test Topic',
          description: 'Test Description',
          slideCount: 5,
        });
      });

      expect(mockExecuteWorkflow).toHaveBeenCalledWith(
        'ppt-generation',
        expect.any(String),
        expect.objectContaining({
          topic: 'Test Topic',
          description: 'Test Description',
          slideCount: 5,
        }),
        expect.any(Object),
        expect.any(Object)
      );
    });
  });

  describe('pause/resume/cancel', () => {
    it('should pause workflow', async () => {
      const mockExecution = { id: 'exec-1', status: 'running' };

      mockExecuteWorkflow.mockImplementation(async (_id, _session, _input, _config, callbacks) => {
        callbacks.onStart(mockExecution);
        // Simulate long running workflow
        await new Promise(resolve => setTimeout(resolve, 100));
        return { execution: mockExecution, success: true };
      });

      const { result } = renderHook(() => useWorkflow());

      // Start workflow (don't await)
      act(() => {
        result.current.run('test-workflow', {});
      });

      await waitFor(() => {
        expect(result.current.isRunning).toBe(true);
      });

      act(() => {
        result.current.pause();
      });

      expect(result.current.isPaused).toBe(true);
    });

    it('should cancel workflow', async () => {
      const mockExecution = { id: 'exec-1', status: 'running' };

      mockExecuteWorkflow.mockImplementation(async (_id, _session, _input, _config, callbacks) => {
        callbacks.onStart(mockExecution);
        await new Promise(resolve => setTimeout(resolve, 100));
        return { execution: mockExecution, success: true };
      });

      const { result } = renderHook(() => useWorkflow());

      act(() => {
        result.current.run('test-workflow', {});
      });

      await waitFor(() => {
        expect(result.current.isRunning).toBe(true);
      });

      act(() => {
        result.current.cancel();
      });

      expect(result.current.isRunning).toBe(false);
    });
  });

  describe('workflow management', () => {
    it('should get workflow by id', () => {
      const { result } = renderHook(() => useWorkflow());

      const workflow = result.current.getWorkflow('test-workflow');

      expect(workflow).toBeDefined();
      expect(workflow?.id).toBe('test-workflow');
    });

    it('should get all workflows', () => {
      const { result } = renderHook(() => useWorkflow());

      const workflows = result.current.getWorkflows();

      expect(workflows.length).toBe(2);
    });

    it('should get workflows by type', () => {
      const { result } = renderHook(() => useWorkflow());

      const workflows = result.current.getWorkflowsByType('custom');

      expect(workflows.length).toBe(1);
    });
  });

  describe('reset', () => {
    it('should reset all state', async () => {
      mockExecuteWorkflow.mockResolvedValue({
        execution: { id: 'exec-1' },
        success: true,
      });

      const { result } = renderHook(() => useWorkflow());

      await act(async () => {
        await result.current.run('test-workflow', {});
      });

      act(() => {
        result.current.reset();
      });

      expect(result.current.isRunning).toBe(false);
      expect(result.current.isPaused).toBe(false);
      expect(result.current.progress).toBe(0);
      expect(result.current.execution).toBeNull();
      expect(result.current.result).toBeNull();
      expect(result.current.error).toBeNull();
      expect(result.current.logs).toEqual([]);
    });
  });

  describe('getLastOutput', () => {
    it('should return output from result', async () => {
      mockExecuteWorkflow.mockResolvedValue({
        execution: { id: 'exec-1' },
        success: true,
        output: { data: 'test-output' },
      });

      const { result } = renderHook(() => useWorkflow());

      await act(async () => {
        await result.current.run('test-workflow', {});
      });

      const output = result.current.getLastOutput();
      expect(output).toEqual({ data: 'test-output' });
    });
  });

  describe('getPPTPresentation', () => {
    it('should return presentation from output', async () => {
      const mockPresentation = { slides: [{ title: 'Slide 1' }] };

      mockExecuteWorkflow.mockResolvedValue({
        execution: { id: 'exec-1' },
        success: true,
        output: { presentation: mockPresentation },
      });

      const { result } = renderHook(() => useWorkflow());

      await act(async () => {
        await result.current.runPPT({ topic: 'Test' });
      });

      const presentation = result.current.getPPTPresentation();
      expect(presentation).toEqual(mockPresentation);
    });

    it('should return undefined if no presentation', async () => {
      mockExecuteWorkflow.mockResolvedValue({
        execution: { id: 'exec-1' },
        success: true,
        output: {},
      });

      const { result } = renderHook(() => useWorkflow());

      await act(async () => {
        await result.current.run('test-workflow', {});
      });

      const presentation = result.current.getPPTPresentation();
      expect(presentation).toBeUndefined();
    });
  });
});
