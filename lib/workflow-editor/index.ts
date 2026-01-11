/**
 * Workflow Editor Library
 */

export {
  visualToDefinition,
  definitionToVisual,
  validateVisualWorkflow as validateWorkflowConverter,
} from './converter';

export {
  workflowEditorTemplates,
  getTemplateById,
  getTemplatesByCategory,
  getTemplateCategories,
} from './templates';

export type { WorkflowEditorTemplate } from '@/types/workflow/workflow-editor';

export {
  executeVisualWorkflow,
  createVisualWorkflowExecution,
  getWorkflowDefinition,
  pauseVisualWorkflow,
  resumeVisualWorkflow,
  cancelVisualWorkflow,
  validateVisualWorkflow,
  executorIntegration,
  // New execution management exports
  removeActiveExecution,
  getActiveExecutions,
  getActiveExecutionCount,
} from './executor-integration';

export {
  validateNode,
  getFieldError,
  getFieldWarning,
  hasFieldError,
  hasFieldWarning,
  validationUtils,
  validateWorkflowStructure,
  validateIOCompatibility,
  validateCompleteWorkflow,
  getValidationSummary,
  type ValidationResult,
  type ValidationError,
  type ValidationWarning,
  type WorkflowValidationResult,
  type WorkflowStructureError,
  type WorkflowStructureWarning,
  type IOCompatibilityResult,
  type IOCompatibilityError,
  type IOCompatibilityWarning,
} from './validation';
