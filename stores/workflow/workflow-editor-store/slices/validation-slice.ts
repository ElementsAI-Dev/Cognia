/**
 * Validation Slice
 * Handles workflow validation
 */

import type { SliceCreator, ValidationSliceActions, ValidationSliceState, ValidationError } from '../types';
import { validateCompleteWorkflow } from '@/lib/workflow-editor';

export const validationSliceInitialState: ValidationSliceState = {
  validationErrors: [],
};

export const createValidationSlice: SliceCreator<ValidationSliceActions> = (set, get) => {
  return {
    validate: () => {
      const { currentWorkflow } = get();
      if (!currentWorkflow) return [];

      const result = validateCompleteWorkflow(currentWorkflow.nodes, currentWorkflow.edges);

      const normalized: ValidationError[] = [];

      result.structureValidation.errors.forEach((e) => {
        normalized.push({
          nodeId: e.nodeId,
          edgeId: e.edgeId,
          message: e.message,
          severity: 'error',
        });
      });
      result.structureValidation.warnings.forEach((w) => {
        normalized.push({
          nodeId: w.nodeId,
          edgeId: w.edgeId,
          message: w.message,
          severity: 'warning',
        });
      });

      result.ioValidation.errors.forEach((e) => {
        normalized.push({
          nodeId: e.targetNodeId,
          message: e.message,
          severity: 'error',
        });
      });
      result.ioValidation.warnings.forEach((w) => {
        normalized.push({
          nodeId: w.targetNodeId,
          message: w.message,
          severity: 'warning',
        });
      });

      set({ validationErrors: normalized });
      return normalized;
    },

    clearValidationErrors: () => {
      set({ validationErrors: [] });
    },
  };
};
