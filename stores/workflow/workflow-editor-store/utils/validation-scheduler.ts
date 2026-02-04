/**
 * Workflow validation scheduler
 * Provides debounced validation to avoid excessive recalculation
 */

import type { WorkflowEditorStore } from '../types';

let validationTimer: ReturnType<typeof setTimeout> | undefined;

export const scheduleWorkflowValidation = (
  get: () => WorkflowEditorStore,
  delay = 400
): void => {
  if (validationTimer) {
    clearTimeout(validationTimer);
  }

  validationTimer = setTimeout(() => {
    validationTimer = undefined;
    get().validate();
  }, delay);
};

export const clearWorkflowValidationTimer = (): void => {
  if (validationTimer) {
    clearTimeout(validationTimer);
    validationTimer = undefined;
  }
};
