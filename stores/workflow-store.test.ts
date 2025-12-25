/**
 * Workflow Store Tests
 */

import { act, renderHook } from '@testing-library/react';
import { useWorkflowStore } from './workflow-store';
import type { WorkflowExecution, PPTPresentation } from '@/types/workflow';

const createMockExecution = (overrides: Partial<WorkflowExecution> = {}): WorkflowExecution => ({
  id: `exec-${Date.now()}`,
  workflowId: 'test-workflow',
  workflowName: 'Test Workflow',
  workflowType: 'ppt-generation',
  sessionId: 'session-1',
  status: 'idle',
  config: {},
  input: {},
  steps: [],
  progress: 0,
  logs: [],
  ...overrides,
});

const createMockPresentation = (overrides: Partial<PPTPresentation> = {}): PPTPresentation => ({
  id: `ppt-${Date.now()}`,
  title: 'Test Presentation',
  theme: {
    id: 'default',
    name: 'Default',
    primaryColor: '#3B82F6',
    secondaryColor: '#1E40AF',
    accentColor: '#60A5FA',
    backgroundColor: '#FFFFFF',
    textColor: '#1E293B',
    headingFont: 'Inter',
    bodyFont: 'Inter',
    codeFont: 'Mono',
  },
  slides: [],
  totalSlides: 0,
  aspectRatio: '16:9',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

describe('useWorkflowStore', () => {
  beforeEach(() => {
    const { result } = renderHook(() => useWorkflowStore());
    act(() => {
      result.current.reset();
    });
  });

  describe('execution management', () => {
    it('should add an execution', () => {
      const { result } = renderHook(() => useWorkflowStore());
      const execution = createMockExecution({ id: 'exec-1' });

      act(() => {
        result.current.addExecution(execution);
      });

      expect(result.current.executions['exec-1']).toBeDefined();
      expect(result.current.activeExecutionId).toBe('exec-1');
    });

    it('should update an execution', () => {
      const { result } = renderHook(() => useWorkflowStore());
      const execution = createMockExecution({ id: 'exec-1', progress: 0 });

      act(() => {
        result.current.addExecution(execution);
        result.current.updateExecution('exec-1', { progress: 50 });
      });

      expect(result.current.executions['exec-1'].progress).toBe(50);
    });

    it('should remove an execution', () => {
      const { result } = renderHook(() => useWorkflowStore());
      const execution = createMockExecution({ id: 'exec-1' });

      act(() => {
        result.current.addExecution(execution);
        result.current.removeExecution('exec-1');
      });

      expect(result.current.executions['exec-1']).toBeUndefined();
      expect(result.current.activeExecutionId).toBeNull();
    });

    it('should get active execution', () => {
      const { result } = renderHook(() => useWorkflowStore());
      const execution = createMockExecution({ id: 'exec-1' });

      act(() => {
        result.current.addExecution(execution);
      });

      expect(result.current.getActiveExecution()?.id).toBe('exec-1');
    });

    it('should get executions by session', () => {
      const { result } = renderHook(() => useWorkflowStore());
      const exec1 = createMockExecution({ id: 'exec-1', sessionId: 'session-1' });
      const exec2 = createMockExecution({ id: 'exec-2', sessionId: 'session-2' });

      act(() => {
        result.current.addExecution(exec1);
        result.current.addExecution(exec2);
      });

      const session1Execs = result.current.getExecutionsBySession('session-1');
      expect(session1Execs).toHaveLength(1);
      expect(session1Execs[0].id).toBe('exec-1');
    });
  });

  describe('execution status', () => {
    it('should start an execution', () => {
      const { result } = renderHook(() => useWorkflowStore());
      const execution = createMockExecution({ id: 'exec-1' });

      act(() => {
        result.current.addExecution(execution);
        result.current.startExecution('exec-1');
      });

      expect(result.current.executions['exec-1'].status).toBe('executing');
      expect(result.current.executions['exec-1'].startedAt).toBeDefined();
    });

    it('should pause an execution', () => {
      const { result } = renderHook(() => useWorkflowStore());
      const execution = createMockExecution({ id: 'exec-1', status: 'executing' });

      act(() => {
        result.current.addExecution(execution);
        result.current.pauseExecution('exec-1');
      });

      expect(result.current.executions['exec-1'].status).toBe('paused');
    });

    it('should resume an execution', () => {
      const { result } = renderHook(() => useWorkflowStore());
      const execution = createMockExecution({ id: 'exec-1', status: 'paused' });

      act(() => {
        result.current.addExecution(execution);
        result.current.resumeExecution('exec-1');
      });

      expect(result.current.executions['exec-1'].status).toBe('executing');
    });

    it('should complete an execution and add to history', () => {
      const { result } = renderHook(() => useWorkflowStore());
      const execution = createMockExecution({ id: 'exec-1', status: 'executing', startedAt: new Date() });

      act(() => {
        result.current.addExecution(execution);
        result.current.completeExecution('exec-1', { result: 'success' });
      });

      expect(result.current.executions['exec-1'].status).toBe('completed');
      expect(result.current.executions['exec-1'].progress).toBe(100);
      expect(result.current.history).toHaveLength(1);
    });

    it('should fail an execution and add to history', () => {
      const { result } = renderHook(() => useWorkflowStore());
      const execution = createMockExecution({ id: 'exec-1', status: 'executing', startedAt: new Date() });

      act(() => {
        result.current.addExecution(execution);
        result.current.failExecution('exec-1', 'Something went wrong');
      });

      expect(result.current.executions['exec-1'].status).toBe('failed');
      expect(result.current.executions['exec-1'].error).toBe('Something went wrong');
      expect(result.current.history).toHaveLength(1);
    });

    it('should cancel an execution and add to history', () => {
      const { result } = renderHook(() => useWorkflowStore());
      const execution = createMockExecution({ id: 'exec-1', status: 'executing', startedAt: new Date() });

      act(() => {
        result.current.addExecution(execution);
        result.current.cancelExecution('exec-1');
      });

      expect(result.current.executions['exec-1'].status).toBe('cancelled');
      expect(result.current.history).toHaveLength(1);
    });
  });

  describe('step management', () => {
    it('should update step status', () => {
      const { result } = renderHook(() => useWorkflowStore());
      const execution = createMockExecution({
        id: 'exec-1',
        steps: [
          { stepId: 'step-1', status: 'pending', retryCount: 0, logs: [] },
          { stepId: 'step-2', status: 'pending', retryCount: 0, logs: [] },
        ],
      });

      act(() => {
        result.current.addExecution(execution);
        result.current.updateStepStatus('exec-1', 'step-1', 'completed', { output: 'done' });
      });

      const steps = result.current.executions['exec-1'].steps;
      expect(steps[0].status).toBe('completed');
      expect(steps[0].output).toEqual({ output: 'done' });
    });

    it('should calculate progress based on completed steps', () => {
      const { result } = renderHook(() => useWorkflowStore());
      const execution = createMockExecution({
        id: 'exec-1',
        steps: [
          { stepId: 'step-1', status: 'pending', retryCount: 0, logs: [] },
          { stepId: 'step-2', status: 'pending', retryCount: 0, logs: [] },
        ],
      });

      act(() => {
        result.current.addExecution(execution);
        result.current.updateStepStatus('exec-1', 'step-1', 'completed');
      });

      expect(result.current.executions['exec-1'].progress).toBe(50);
    });
  });

  describe('PPT management', () => {
    it('should add a presentation', () => {
      const { result } = renderHook(() => useWorkflowStore());
      const presentation = createMockPresentation({ id: 'ppt-1' });

      act(() => {
        result.current.addPresentation(presentation);
      });

      expect(result.current.presentations['ppt-1']).toBeDefined();
      expect(result.current.activePresentationId).toBe('ppt-1');
    });

    it('should update a presentation', () => {
      const { result } = renderHook(() => useWorkflowStore());
      const presentation = createMockPresentation({ id: 'ppt-1', title: 'Original' });

      act(() => {
        result.current.addPresentation(presentation);
        result.current.updatePresentation('ppt-1', { title: 'Updated' });
      });

      expect(result.current.presentations['ppt-1'].title).toBe('Updated');
    });

    it('should delete a presentation', () => {
      const { result } = renderHook(() => useWorkflowStore());
      const presentation = createMockPresentation({ id: 'ppt-1' });

      act(() => {
        result.current.addPresentation(presentation);
        result.current.deletePresentation('ppt-1');
      });

      expect(result.current.presentations['ppt-1']).toBeUndefined();
      expect(result.current.activePresentationId).toBeNull();
    });

    it('should get active presentation', () => {
      const { result } = renderHook(() => useWorkflowStore());
      const presentation = createMockPresentation({ id: 'ppt-1' });

      act(() => {
        result.current.addPresentation(presentation);
      });

      expect(result.current.getActivePresentation()?.id).toBe('ppt-1');
    });
  });

  describe('history management', () => {
    it('should limit history size', () => {
      const { result } = renderHook(() => useWorkflowStore());

      act(() => {
        // Add more than maxHistorySize executions
        for (let i = 0; i < 60; i++) {
          const execution = createMockExecution({
            id: `exec-${i}`,
            status: 'executing',
            startedAt: new Date(),
          });
          result.current.addExecution(execution);
          result.current.completeExecution(`exec-${i}`);
          result.current.removeExecution(`exec-${i}`);
        }
      });

      expect(result.current.history.length).toBeLessThanOrEqual(50);
    });

    it('should clear history', () => {
      const { result } = renderHook(() => useWorkflowStore());
      const execution = createMockExecution({ id: 'exec-1', status: 'executing', startedAt: new Date() });

      act(() => {
        result.current.addExecution(execution);
        result.current.completeExecution('exec-1');
        result.current.clearHistory();
      });

      expect(result.current.history).toHaveLength(0);
    });
  });

  describe('UI state', () => {
    it('should toggle workflow panel', () => {
      const { result } = renderHook(() => useWorkflowStore());

      expect(result.current.isWorkflowPanelOpen).toBe(false);

      act(() => {
        result.current.openWorkflowPanel();
      });

      expect(result.current.isWorkflowPanelOpen).toBe(true);

      act(() => {
        result.current.closeWorkflowPanel();
      });

      expect(result.current.isWorkflowPanelOpen).toBe(false);
    });

    it('should set selected workflow type', () => {
      const { result } = renderHook(() => useWorkflowStore());

      act(() => {
        result.current.setSelectedWorkflowType('ppt-generation');
      });

      expect(result.current.selectedWorkflowType).toBe('ppt-generation');
    });
  });

  describe('reset and clear', () => {
    it('should reset all state', () => {
      const { result } = renderHook(() => useWorkflowStore());

      act(() => {
        result.current.addExecution(createMockExecution({ id: 'exec-1' }));
        result.current.addPresentation(createMockPresentation({ id: 'ppt-1' }));
        result.current.openWorkflowPanel();
        result.current.reset();
      });

      expect(Object.keys(result.current.executions)).toHaveLength(0);
      expect(Object.keys(result.current.presentations)).toHaveLength(0);
      expect(result.current.isWorkflowPanelOpen).toBe(false);
    });

    it('should clear session data', () => {
      const { result } = renderHook(() => useWorkflowStore());

      act(() => {
        result.current.addExecution(createMockExecution({ id: 'exec-1', sessionId: 'session-1' }));
        result.current.addExecution(createMockExecution({ id: 'exec-2', sessionId: 'session-2' }));
        result.current.clearSessionData('session-1');
      });

      expect(result.current.executions['exec-1']).toBeUndefined();
      expect(result.current.executions['exec-2']).toBeDefined();
    });
  });
});
