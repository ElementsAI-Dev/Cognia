import {
  getExecutionControlState,
  isEditorExecutionTerminalStatus,
  mapEditorToWorkflowExecutionStatus,
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
});

