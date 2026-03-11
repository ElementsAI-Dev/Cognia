import {
  normalizeServerValidationErrors,
  summarizeServerValidationErrors,
} from './server-validation';

describe('server-validation', () => {
  it('normalizes structured validation errors from response payload', () => {
    const issues = normalizeServerValidationErrors({
      response: {
        data: {
          validationErrors: [
            {
              nodeId: 'node-1',
              field: 'label',
              message: 'Label is required',
              code: 'REQUIRED_FIELD',
              severity: 'error',
            },
          ],
        },
      },
    });

    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({
      nodeId: 'node-1',
      field: 'label',
      message: 'Label is required',
      source: 'server',
      blocking: true,
      severity: 'error',
    });
  });

  it('falls back to message-based validation error when no structured list exists', () => {
    const issues = normalizeServerValidationErrors({
      message: 'Validation failed: required field missing',
    });

    expect(issues).toHaveLength(1);
    expect(issues[0]?.message).toContain('Validation failed');
    expect(issues[0]?.source).toBe('server');
  });

  it('returns empty list for non-validation errors', () => {
    const issues = normalizeServerValidationErrors({
      message: 'Network timeout',
    });

    expect(issues).toEqual([]);
  });

  it('summarizes blocking server validation issues', () => {
    const summary = summarizeServerValidationErrors([
      {
        id: 'server:global:validation:0',
        message: 'First issue',
        severity: 'error',
        blocking: true,
        source: 'server',
      },
      {
        id: 'server:node-2:validation:1',
        nodeId: 'node-2',
        message: 'Second issue',
        severity: 'error',
        blocking: true,
        source: 'server',
      },
    ]);

    expect(summary).toContain('2 blocking issue(s)');
    expect(summary).toContain('First issue');
  });
});

