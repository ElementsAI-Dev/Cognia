/**
 * Workflows module exports
 */

export {
  createWorkflowRegistry,
  getGlobalWorkflowRegistry,
  resetGlobalWorkflowRegistry,
  type WorkflowRegistry,
  type ValidationResult,
} from './registry';

export {
  executeWorkflow,
  createWorkflowExecution,
  pauseWorkflow,
  resumeWorkflow,
  cancelWorkflow,
  type WorkflowExecutorConfig,
  type WorkflowExecutorCallbacks,
  type WorkflowExecutorResult,
} from './executor';

export {
  PPT_GENERATION_WORKFLOW,
  registerPPTWorkflow,
  PPT_WORKFLOW_TEMPLATES,
} from './ppt-workflow';

export {
  PPTWorkflowExecutor,
  generatePresentation,
  generatePresentationFromMaterials,
  type PPTExecutorConfig,
  type ExecutorState,
} from './ppt-executor';
