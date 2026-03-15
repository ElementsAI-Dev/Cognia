import {
  getWorkflowExecutionControlsSummary,
  getWorkflowLifecycleLabel,
  getWorkflowValidationSummary,
} from './surface-state';

describe('workflow surface state helpers', () => {
  it('summarizes blocking errors and warnings consistently', () => {
    const summary = getWorkflowValidationSummary([
      { id: 'error-1', message: 'Blocking', severity: 'error' } as never,
      { id: 'warn-1', message: 'Warn', severity: 'warning' } as never,
    ]);

    expect(summary.blockingCount).toBe(1);
    expect(summary.warningCount).toBe(1);
    expect(summary.hasBlockingErrors).toBe(true);
    expect(summary.hasWarnings).toBe(true);
  });

  it('blocks run controls when blocking validation errors exist', () => {
    const controls = getWorkflowExecutionControlsSummary({
      hasWorkflow: true,
      isExecuting: false,
      status: undefined,
      validationErrors: [{ id: 'error-1', message: 'Blocking', severity: 'error' } as never],
    });

    expect(controls.canRun).toBe(false);
    expect(controls.runReason).toBe('Validation errors present');
  });

  it('maps lifecycle states to stable labels', () => {
    expect(getWorkflowLifecycleLabel('saving')).toBe('Saving...');
    expect(getWorkflowLifecycleLabel('saveFailed')).toBe('Save failed');
    expect(getWorkflowLifecycleLabel('dirty')).toBe('Unsaved changes');
    expect(getWorkflowLifecycleLabel('clean')).toBe('Saved');
  });
});
