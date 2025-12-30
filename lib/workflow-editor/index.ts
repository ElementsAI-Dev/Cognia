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

export type { WorkflowEditorTemplate } from '@/types/workflow-editor';

export {
  executeVisualWorkflow,
  createVisualWorkflowExecution,
  getWorkflowDefinition,
  pauseVisualWorkflow,
  resumeVisualWorkflow,
  cancelVisualWorkflow,
  validateVisualWorkflow,
  executorIntegration,
} from './executor-integration';

export {
  validateNode,
  getFieldError,
  getFieldWarning,
  hasFieldError,
  hasFieldWarning,
  validationUtils,
  type ValidationResult,
  type ValidationError,
  type ValidationWarning,
} from './validation';
