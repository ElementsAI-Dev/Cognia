/**
 * Validation Slice
 * Handles workflow validation
 */

import type {
  SliceCreator,
  ValidationSliceActions,
  ValidationSliceState,
  ValidationError,
  WorkflowNodeType,
} from '../types';
import { validateCompleteWorkflow, validateNode } from '@/lib/workflow-editor/validation';
import { createValidationIssueId, isBlockingValidationError } from '../utils/lifecycle';

export const validationSliceInitialState: ValidationSliceState = {
  validationErrors: [],
  clientValidationErrors: [],
  serverValidationErrors: [],
  validationFocusTarget: null,
};

export const createValidationSlice: SliceCreator<ValidationSliceActions> = (set, get) => {
  const mergeValidationErrors = (
    clientErrors: ValidationError[],
    serverErrors: ValidationError[]
  ): ValidationError[] => {
    const merged = [...clientErrors, ...serverErrors];
    const deduped = new Map<string, ValidationError>();

    merged.forEach((error, index) => {
      const id = createValidationIssueId(error, index);
      deduped.set(id, {
        ...error,
        id,
      });
    });

    return Array.from(deduped.values());
  };

  const getClientValidationErrors = (): ValidationError[] => {
    const { currentWorkflow } = get();
    if (!currentWorkflow) return [];

    const result = validateCompleteWorkflow(currentWorkflow.nodes, currentWorkflow.edges);
    const normalized: ValidationError[] = [];

    result.structureValidation.errors.forEach((error, index) => {
      normalized.push({
        id: `client:structure:error:${index}`,
        nodeId: error.nodeId,
        edgeId: error.edgeId,
        message: error.message,
        severity: 'error',
        blocking: true,
        source: 'client',
        code: error.code,
      });
    });

    result.structureValidation.warnings.forEach((warning, index) => {
      normalized.push({
        id: `client:structure:warning:${index}`,
        nodeId: warning.nodeId,
        edgeId: warning.edgeId,
        message: warning.message,
        severity: 'warning',
        blocking: false,
        source: 'client',
        code: warning.code,
      });
    });

    result.ioValidation.errors.forEach((error, index) => {
      normalized.push({
        id: `client:io:error:${index}`,
        nodeId: error.targetNodeId,
        edgeId: undefined,
        field: error.targetInput,
        message: error.message,
        severity: 'error',
        blocking: true,
        source: 'client',
        code: error.code,
      });
    });

    result.ioValidation.warnings.forEach((warning, index) => {
      normalized.push({
        id: `client:io:warning:${index}`,
        nodeId: warning.targetNodeId,
        edgeId: undefined,
        field: warning.targetInput,
        message: warning.message,
        severity: 'warning',
        blocking: false,
        source: 'client',
        code: warning.code,
      });
    });

    currentWorkflow.nodes.forEach((node) => {
      if (node.type === 'annotation' || node.type === 'group') {
        return;
      }

      const nodeValidation = validateNode(node.type as WorkflowNodeType, node.data);
      nodeValidation.errors.forEach((error) => {
        normalized.push({
          nodeId: node.id,
          field: error.field,
          message: error.message,
          severity: 'error',
          blocking: true,
          source: 'client',
          code: error.code,
        });
      });
      nodeValidation.warnings.forEach((warning) => {
        normalized.push({
          nodeId: node.id,
          field: warning.field,
          message: warning.message,
          severity: 'warning',
          blocking: false,
          source: 'client',
          code: warning.code,
        });
      });
    });

    return mergeValidationErrors(normalized, []);
  };

  return {
    validate: () => {
      const { serverValidationErrors } = get();
      const clientValidationErrors = getClientValidationErrors();
      const validationErrors = mergeValidationErrors(clientValidationErrors, serverValidationErrors);

      set({
        clientValidationErrors,
        validationErrors,
      });
      get().syncLifecycleState();
      return validationErrors;
    },

    clearValidationErrors: () => {
      set({
        validationErrors: [],
        clientValidationErrors: [],
        serverValidationErrors: [],
      });
      get().syncLifecycleState();
    },

    setServerValidationErrors: (errors) => {
      const serverValidationErrors = mergeValidationErrors(
        [],
        errors.map((error) => ({
          ...error,
          source: 'server',
          blocking:
            error.blocking ?? (error.severity !== 'warning' && error.severity !== 'info'),
        }))
      );
      const validationErrors = mergeValidationErrors(get().clientValidationErrors, serverValidationErrors);
      set({
        serverValidationErrors,
        validationErrors,
      });
      get().syncLifecycleState();
    },

    clearServerValidationErrors: () => {
      const validationErrors = mergeValidationErrors(get().clientValidationErrors, []);
      set({
        serverValidationErrors: [],
        validationErrors,
      });
      get().syncLifecycleState();
    },

    focusValidationIssue: (issueId) => {
      const issue = get().validationErrors.find((error) => error.id === issueId);
      if (!issue) {
        return;
      }

      set({
        validationFocusTarget: {
          issueId,
          nodeId: issue.nodeId,
          edgeId: issue.edgeId,
          issuedAt: Date.now(),
        },
      });

      if (issue.nodeId) {
        get().selectNodes([issue.nodeId]);
        get().selectEdges([]);
      } else if (issue.edgeId) {
        get().selectEdges([issue.edgeId]);
        get().selectNodes([]);
      }
    },

    clearValidationFocus: () => {
      set({
        validationFocusTarget: null,
      });
    },

    getBlockingValidationErrors: () => {
      return get().validationErrors.filter(isBlockingValidationError);
    },
  };
};
