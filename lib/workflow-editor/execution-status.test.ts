import {
  deriveCanonicalExecutionState,
  getExecutionControlState,
  getWorkflowLifecycleCapability,
  isEditorExecutionTerminalStatus,
  mapEditorToWorkflowExecutionStatus,
  reconcileEditorExecutionStatus,
} from './execution-status';

describe('execution-status helpers', () => {
  describe('mapEditorToWorkflowExecutionStatus', () => {
    it('maps running to executing', () => {
      expect(mapEditorToWorkflowExecutionStatus('running')).toBe('executing');
    });

    it('maps pending to planning', () => {
      expect(mapEditorToWorkflowExecutionStatus('pending')).toBe('planning');
    });

    it('keeps completed/failed/cancelled status values', () => {
      expect(mapEditorToWorkflowExecutionStatus('completed')).toBe('completed');
      expect(mapEditorToWorkflowExecutionStatus('failed')).toBe('failed');
      expect(mapEditorToWorkflowExecutionStatus('cancelled')).toBe('cancelled');
    });
  });

  describe('isEditorExecutionTerminalStatus', () => {
    it('returns true for terminal statuses', () => {
      expect(isEditorExecutionTerminalStatus('completed')).toBe(true);
      expect(isEditorExecutionTerminalStatus('failed')).toBe(true);
      expect(isEditorExecutionTerminalStatus('cancelled')).toBe(true);
    });

    it('returns false for active statuses', () => {
      expect(isEditorExecutionTerminalStatus('running')).toBe(false);
      expect(isEditorExecutionTerminalStatus('paused')).toBe(false);
      expect(isEditorExecutionTerminalStatus('pending')).toBe(false);
    });
  });

  describe('getExecutionControlState', () => {
    it('enables run only when not executing', () => {
      expect(
        getExecutionControlState({ isExecuting: false, status: 'idle' })
      ).toEqual({
        canRun: true,
        canPause: false,
        canResume: false,
        canCancel: false,
      });
    });

    it('enables pause and cancel while running', () => {
      expect(
        getExecutionControlState({ isExecuting: true, status: 'running' })
      ).toEqual({
        canRun: false,
        canPause: true,
        canResume: false,
        canCancel: true,
      });
    });

    it('enables resume and cancel while paused', () => {
      expect(
        getExecutionControlState({ isExecuting: true, status: 'paused' })
      ).toEqual({
        canRun: false,
        canPause: false,
        canResume: true,
        canCancel: true,
      });
    });
  });

  describe('getWorkflowLifecycleCapability', () => {
    it('returns disabled run state with reason when validation errors exist', () => {
      const capability = getWorkflowLifecycleCapability({
        hasWorkflow: true,
        isExecuting: false,
        status: 'idle',
        hasValidationErrors: true,
      });

      expect(capability.actions.run.allowed).toBe(false);
      expect(capability.actions.run.reason).toContain('Validation');
      expect(capability.actions.run.recoveryHint).toContain('Fix');
    });
  });

  describe('reconcileEditorExecutionStatus', () => {
    it('keeps terminal state when non-terminal event arrives later', () => {
      expect(reconcileEditorExecutionStatus('failed', 'running')).toBe('failed');
    });

    it('allows pause and resume transitions', () => {
      expect(reconcileEditorExecutionStatus('running', 'paused')).toBe('paused');
      expect(reconcileEditorExecutionStatus('paused', 'running')).toBe('running');
    });
  });

  describe('deriveCanonicalExecutionState', () => {
    it('prefers runtime state while actively executing', () => {
      expect(
        deriveCanonicalExecutionState({
          isExecuting: true,
          runtimeStatus: 'running',
          runtimeProgress: 42,
          historyStatus: 'completed',
        })
      ).toMatchObject({
        status: 'executing',
        progress: 42,
        source: 'runtime',
      });
    });

    it('falls back to history when runtime state is absent', () => {
      expect(
        deriveCanonicalExecutionState({
          isExecuting: false,
          historyStatus: 'completed',
          historyProgress: 100,
        })
      ).toMatchObject({
        status: 'completed',
        progress: 100,
        source: 'history',
      });
    });
  });
});

