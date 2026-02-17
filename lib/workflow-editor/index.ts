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

export {
  applyDagreLayout,
  type LayoutDirection,
  type LayoutOptions,
} from './layout';

export {
  formatExecutionDuration,
  getExecutionSummary,
  filterLogsByLevel,
  getLogsForNode,
  getFailedNodes,
  getExecutionTimeline,
  estimateRemainingTime,
  exportExecutionState,
  formatExecutionStatus,
  getStatusColor,
  getNodeStatusColor,
  canRetryExecution,
  getRetryableNodes,
  calculateExecutionStats,
  validateWorkflowInput,
  sanitizeWorkflowOutput,
} from './execution-utils';

export {
  type WorkflowRuntimeAdapter,
  type WorkflowRuntimeExecutionResult,
  type WorkflowRuntimeExecuteRequest,
  type WorkflowExecutionEvent,
  type WorkflowRuntimeSource,
  BrowserRuntimeAdapter,
  TauriRuntimeAdapter,
  createWorkflowRuntimeAdapter,
  getWorkflowRuntimeAdapter,
  setWorkflowRuntimeAdapter,
} from './runtime-adapter';

export {
  WorkflowOrchestrator,
  getWorkflowOrchestrator,
  setWorkflowOrchestrator,
  workflowOrchestrator,
  type WorkflowRunParams,
  type WorkflowPersistParams,
} from './orchestrator';

export {
  CURRENT_WORKFLOW_SCHEMA_VERSION,
  migrateWorkflowSchema,
  type WorkflowSchemaMigrationResult,
} from './migration';

export {
  WorkflowTriggerSyncService,
  workflowTriggerSyncService,
  getTriggerSyncBadgeVariant,
} from './trigger-sync-service';
