import {
  deriveEditorLifecycleState,
  isBlockingValidationError,
} from './lifecycle';

describe('workflow editor lifecycle utils', () => {
  it('returns clean when no workflow is loaded', () => {
    const state = deriveEditorLifecycleState({
      hasWorkflow: false,
      isDirty: false,
      isSaving: false,
      hasSaveError: false,
      validationErrors: [],
    });

    expect(state).toBe('clean');
  });

  it('returns saving when save is in-flight', () => {
    const state = deriveEditorLifecycleState({
      hasWorkflow: true,
      isDirty: true,
      isSaving: true,
      hasSaveError: false,
      validationErrors: [],
    });

    expect(state).toBe('saving');
  });

  it('returns saveFailed when last save failed', () => {
    const state = deriveEditorLifecycleState({
      hasWorkflow: true,
      isDirty: true,
      isSaving: false,
      hasSaveError: true,
      validationErrors: [],
    });

    expect(state).toBe('saveFailed');
  });

  it('returns publishBlocked when blocking validation issues exist', () => {
    const state = deriveEditorLifecycleState({
      hasWorkflow: true,
      isDirty: true,
      isSaving: false,
      hasSaveError: false,
      validationErrors: [
        {
          message: 'Missing required field',
          severity: 'error',
          blocking: true,
        },
      ],
    });

    expect(state).toBe('publishBlocked');
  });

  it('returns readyToPublish when dirty without blocking issues', () => {
    const state = deriveEditorLifecycleState({
      hasWorkflow: true,
      isDirty: true,
      isSaving: false,
      hasSaveError: false,
      validationErrors: [
        {
          message: 'Minor warning',
          severity: 'warning',
          blocking: false,
        },
      ],
    });

    expect(state).toBe('readyToPublish');
  });

  it('treats missing severity as blocking by default', () => {
    expect(
      isBlockingValidationError({
        message: 'Unclassified validation issue',
        severity: undefined as never,
      })
    ).toBe(true);
  });
});

