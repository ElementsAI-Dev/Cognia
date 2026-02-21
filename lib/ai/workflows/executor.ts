/**
 * Workflow Executor - Executes workflows step by step
 * 
 * Handles step orchestration, dependency resolution, and state management.
 * Step-specific execution logic has been extracted to step-executors/ modules.
 * Enhanced with execution state persistence for recovery and history.
 */

import { nanoid } from 'nanoid';
import type { ProviderName } from '../core/client';
import { getGlobalWorkflowRegistry } from './registry';
import { workflowRepository } from '@/lib/db/repositories/workflow-repository';
import { loggers } from '@/lib/logger';
import type {
  WorkflowDefinition,
  WorkflowExecution,
  WorkflowStepExecution,
  WorkflowStepStatus,
  WorkflowLog,
  WorkflowStepDefinition,
} from '@/types/workflow';

const log = loggers.ai;

// Import step executors from extracted modules
import {
  executeAIStep,
  executeToolStep,
  executeConditionalStep,
  executeCodeStep,
  executeTransformStep,
  executeLoopStep,
  executeWebhookStep,
  executeDelayStep,
  executeMergeStep,
  executeSubworkflowStep,
  executeKnowledgeRetrievalStep,
  setExecuteWorkflowFn,
} from './step-executors';

export interface WorkflowExecutorConfig {
  provider: ProviderName;
  model: string;
  apiKey: string;
  baseURL?: string;
  temperature?: number;
  maxRetries?: number;
  stepTimeout?: number;
}

export interface WorkflowExecutorCallbacks {
  onStart?: (execution: WorkflowExecution) => void;
  onStepStart?: (execution: WorkflowExecution, stepId: string) => void;
  onStepComplete?: (execution: WorkflowExecution, stepId: string, output: unknown) => void;
  onStepError?: (execution: WorkflowExecution, stepId: string, error: string) => void;
  onProgress?: (execution: WorkflowExecution, progress: number) => void;
  onComplete?: (execution: WorkflowExecution) => void;
  onError?: (execution: WorkflowExecution, error: string) => void;
  onLog?: (log: WorkflowLog) => void;
  requireApproval?: (execution: WorkflowExecution, stepId: string) => Promise<boolean>;
}

export interface WorkflowExecutorResult {
  execution: WorkflowExecution;
  success: boolean;
  output?: Record<string, unknown>;
  error?: string;
}

/**
 * Create initial execution state for a workflow
 */
export function createWorkflowExecution(
  workflow: WorkflowDefinition,
  sessionId: string,
  input: Record<string, unknown> = {},
  config: Record<string, unknown> = {}
): WorkflowExecution {
  const now = new Date();
  
  const steps: WorkflowStepExecution[] = workflow.steps.map(step => ({
    stepId: step.id,
    status: 'pending' as WorkflowStepStatus,
    retryCount: 0,
    logs: [],
  }));

  return {
    id: nanoid(),
    workflowId: workflow.id,
    workflowName: workflow.name,
    workflowType: workflow.type,
    sessionId,
    status: 'idle',
    config: { ...workflow.defaultConfig, ...config },
    input,
    steps,
    progress: 0,
    logs: [],
    startedAt: now,
  };
}

/**
 * Add log entry to execution
 */
function addLog(
  execution: WorkflowExecution,
  level: WorkflowLog['level'],
  message: string,
  stepId?: string,
  data?: unknown,
  onLog?: (log: WorkflowLog) => void
): void {
  const log: WorkflowLog = {
    timestamp: new Date(),
    level,
    message,
    stepId,
    data,
  };
  execution.logs.push(log);
  
  const step = execution.steps.find(s => s.stepId === stepId);
  if (step) {
    step.logs.push(log);
  }
  
  onLog?.(log);
}

function executeStructuredPassthroughStep(
  step: WorkflowStepDefinition,
  input: Record<string, unknown>
): Record<string, unknown> {
  return {
    result: input,
    stepType: step.type,
    passthrough: true,
  };
}

/**
 * Get steps that are ready to execute (all dependencies completed)
 */
function getReadySteps(
  workflow: WorkflowDefinition,
  execution: WorkflowExecution
): WorkflowStepDefinition[] {
  const completedStepIds = new Set(
    execution.steps
      .filter(s => s.status === 'completed' || s.status === 'skipped')
      .map(s => s.stepId)
  );

  return workflow.steps.filter(step => {
    const stepExecution = execution.steps.find(s => s.stepId === step.id);
    if (!stepExecution || stepExecution.status !== 'pending') {
      return false;
    }

    // Check if all dependencies are completed
    if (step.dependencies && step.dependencies.length > 0) {
      return step.dependencies.every(depId => completedStepIds.has(depId));
    }

    return true;
  });
}

/**
 * Execute a single workflow step
 */
async function executeStep(
  step: WorkflowStepDefinition,
  execution: WorkflowExecution,
  config: WorkflowExecutorConfig,
  callbacks: WorkflowExecutorCallbacks
): Promise<unknown> {
  const stepExecution = execution.steps.find(s => s.stepId === step.id);
  if (!stepExecution) {
    throw new Error(`Step execution not found: ${step.id}`);
  }

  stepExecution.status = 'running';
  stepExecution.startedAt = new Date();
  
  addLog(execution, 'info', `Starting step: ${step.name}`, step.id, undefined, callbacks.onLog);
  callbacks.onStepStart?.(execution, step.id);

  try {
    let result: unknown;

    // Gather inputs from previous step outputs
    const stepInput: Record<string, unknown> = { ...execution.input };
    for (const [key, schema] of Object.entries(step.inputs)) {
      // Check if input comes from a dependency output
      if (step.dependencies) {
        for (const depId of step.dependencies) {
          const depExecution = execution.steps.find(s => s.stepId === depId);
          if (depExecution?.output && key in depExecution.output) {
            stepInput[key] = depExecution.output[key];
          }
        }
      }
      // Use default if not provided and required
      if (!(key in stepInput) && schema.default !== undefined) {
        stepInput[key] = schema.default;
      }
    }
    stepExecution.input = stepInput;

    switch (step.type) {
      case 'ai':
        result = await executeAIStep(step, stepInput, config);
        break;
      case 'tool':
        result = await executeToolStep(step, stepInput);
        break;
      case 'human':
        if (callbacks.requireApproval) {
          stepExecution.status = 'waiting_approval';
          const approved = await callbacks.requireApproval(execution, step.id);
          if (!approved) {
            throw new Error('Step rejected by user');
          }
        }
        result = stepInput;
        break;
      case 'conditional':
        result = await executeConditionalStep(step, stepInput, execution);
        break;
      case 'parallel':
        // Parallel steps are handled by the main executor
        result = stepInput;
        break;
      case 'code':
        result = await executeCodeStep(step, stepInput);
        break;
      case 'transform':
        result = await executeTransformStep(step, stepInput);
        break;
      case 'loop':
        result = await executeLoopStep(step, stepInput, execution, config, callbacks);
        break;
      case 'webhook':
        result = await executeWebhookStep(step, stepInput);
        break;
      case 'delay':
        result = await executeDelayStep(step);
        break;
      case 'merge':
        result = await executeMergeStep(step, stepInput);
        break;
      case 'subworkflow':
        result = await executeSubworkflowStep(step, stepInput, config, callbacks);
        break;
      case 'knowledgeRetrieval':
        result = await executeKnowledgeRetrievalStep(step, stepInput, execution);
        break;
      case 'parameterExtractor':
      case 'variableAggregator':
      case 'questionClassifier':
      case 'templateTransform':
      case 'chart':
      case 'lineChart':
      case 'barChart':
      case 'pieChart':
      case 'areaChart':
      case 'scatterChart':
      case 'radarChart':
        result = executeStructuredPassthroughStep(step, stepInput);
        break;
      default:
        throw new Error(`Unknown step type: ${step.type}`);
    }

    stepExecution.status = 'completed';
    stepExecution.completedAt = new Date();
    stepExecution.duration = stepExecution.completedAt.getTime() - stepExecution.startedAt.getTime();
    stepExecution.output = typeof result === 'object' ? result as Record<string, unknown> : { result };

    addLog(execution, 'info', `Completed step: ${step.name}`, step.id, result, callbacks.onLog);
    callbacks.onStepComplete?.(execution, step.id, result);

    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Step execution failed';
    
    stepExecution.status = 'failed';
    stepExecution.completedAt = new Date();
    stepExecution.duration = stepExecution.completedAt.getTime() - (stepExecution.startedAt?.getTime() || 0);
    stepExecution.error = errorMessage;
    stepExecution.retryCount++;

    addLog(execution, 'error', `Step failed: ${errorMessage}`, step.id, undefined, callbacks.onLog);
    callbacks.onStepError?.(execution, step.id, errorMessage);

    // Check if we should retry
    const maxRetries = step.retryCount || config.maxRetries || 0;
    if (stepExecution.retryCount <= maxRetries) {
      addLog(execution, 'info', `Retrying step (attempt ${stepExecution.retryCount}/${maxRetries})`, step.id, undefined, callbacks.onLog);
      stepExecution.status = 'pending';
      return executeStep(step, execution, config, callbacks);
    }

    throw error;
  }
}

/**
 * Calculate workflow progress
 */
function calculateProgress(execution: WorkflowExecution): number {
  const total = execution.steps.length;
  if (total === 0) return 100;

  const completed = execution.steps.filter(
    s => s.status === 'completed' || s.status === 'skipped'
  ).length;

  return Math.round((completed / total) * 100);
}

/**
 * Persist execution state to database (non-blocking)
 */
async function persistExecutionState(execution: WorkflowExecution): Promise<void> {
  try {
    // Convert step execution states to node states format
    const nodeStates: Record<string, {
      nodeId: string;
      status: string;
      startedAt?: Date;
      completedAt?: Date;
      duration?: number;
      input?: Record<string, unknown>;
      output?: Record<string, unknown>;
      error?: string;
      logs: Array<{ timestamp: Date; level: string; message: string; data?: unknown }>;
      retryCount: number;
    }> = {};
    
    for (const step of execution.steps) {
      nodeStates[step.stepId] = {
        nodeId: step.stepId,
        status: step.status,
        startedAt: step.startedAt,
        completedAt: step.completedAt,
        duration: step.duration,
        input: step.input,
        output: step.output,
        error: step.error,
        logs: step.logs.map(l => ({
          timestamp: l.timestamp,
          level: l.level,
          message: l.message,
          data: l.data,
        })),
        retryCount: step.retryCount,
      };
    }

    // Convert logs to execution log format
    const executionLogs = execution.logs.map(l => ({
      timestamp: l.timestamp,
      level: l.level as 'debug' | 'info' | 'warn' | 'error',
      message: l.message,
      data: l.data,
    }));

    await workflowRepository.updateExecution(execution.id, {
      status: execution.status as 'pending' | 'running' | 'completed' | 'failed' | 'cancelled',
      output: execution.output,
      nodeStates: nodeStates as Record<string, import('@/types/workflow/workflow-editor').NodeExecutionState>,
      logs: executionLogs,
      error: execution.error,
      completedAt: execution.completedAt,
    });
  } catch (error) {
    log.warn('[Workflow Executor] Failed to persist execution state', {
      executionId: execution.id,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Execute a complete workflow
 */
export async function executeWorkflow(
  workflowId: string,
  sessionId: string,
  input: Record<string, unknown>,
  config: WorkflowExecutorConfig,
  callbacks: WorkflowExecutorCallbacks = {}
): Promise<WorkflowExecutorResult> {
  const registry = getGlobalWorkflowRegistry();
  const workflow = registry.get(workflowId);

  if (!workflow) {
    throw new Error(`Workflow not found: ${workflowId}`);
  }

  const execution = createWorkflowExecution(workflow, sessionId, input);
  execution.status = 'executing';
  execution.startedAt = new Date();

  // Persist initial execution state to database
  try {
    await workflowRepository.createExecution(workflow.id, input, {
      executionId: execution.id,
      status: 'running',
      startedAt: execution.startedAt,
    });
    log.info('[Workflow Executor] Execution record created', {
      executionId: execution.id,
      workflowId: workflow.id,
      workflowName: workflow.name,
    });
  } catch (error) {
    log.warn('[Workflow Executor] Failed to create execution record', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }

  addLog(execution, 'info', `Starting workflow: ${workflow.name}`, undefined, undefined, callbacks.onLog);
  callbacks.onStart?.(execution);

  try {
    // Execute steps in dependency order
    while (true) {
      const readySteps = getReadySteps(workflow, execution);
      
      if (readySteps.length === 0) {
        // Check if all steps are completed
        const allCompleted = execution.steps.every(
          s => s.status === 'completed' || s.status === 'skipped' || s.status === 'failed'
        );
        
        if (allCompleted) {
          break;
        }
        
        // Check for stuck execution (no ready steps but not all completed)
        const hasRunning = execution.steps.some(s => s.status === 'running');
        if (!hasRunning) {
          throw new Error('Workflow stuck: no ready steps and not all completed');
        }
        
        // Wait for running steps to complete
        await new Promise(resolve => setTimeout(resolve, 100));
        continue;
      }

      // Execute ready steps (potentially in parallel for parallel step types)
      const parallelSteps = readySteps.filter(s => s.type === 'parallel');
      const sequentialSteps = readySteps.filter(s => s.type !== 'parallel');

      // Execute parallel steps concurrently
      if (parallelSteps.length > 0) {
        await Promise.all(
          parallelSteps.map(step => executeStep(step, execution, config, callbacks))
        );
      }

      // Execute sequential steps one by one
      for (const step of sequentialSteps) {
        // Check if step should be skipped
        if (step.optional) {
          const stepExecution = execution.steps.find(s => s.stepId === step.id);
          if (stepExecution) {
            // Skip optional steps if their dependencies failed
            const depFailed = step.dependencies?.some(depId => {
              const dep = execution.steps.find(s => s.stepId === depId);
              return dep?.status === 'failed';
            });
            
            if (depFailed) {
              stepExecution.status = 'skipped';
              addLog(execution, 'info', `Skipping optional step: ${step.name}`, step.id, undefined, callbacks.onLog);
              continue;
            }
          }
        }

        await executeStep(step, execution, config, callbacks);
      }

      // Update progress
      execution.progress = calculateProgress(execution);
      callbacks.onProgress?.(execution, execution.progress);

      // Persist state periodically (checkpoint)
      void persistExecutionState(execution);
    }

    // Gather final outputs
    const output: Record<string, unknown> = {};
    for (const [key] of Object.entries(workflow.outputs || {})) {
      // Find output from completed steps
      for (const stepExecution of execution.steps) {
        if (stepExecution.output && key in stepExecution.output) {
          output[key] = stepExecution.output[key];
        }
      }
    }

    // Check if any steps failed
    const failedSteps = execution.steps.filter(s => s.status === 'failed');
    if (failedSteps.length > 0) {
      execution.status = 'failed';
      execution.completedAt = new Date();
      execution.duration = execution.completedAt.getTime() - (execution.startedAt?.getTime() || 0);
      execution.error = `${failedSteps.length} step(s) failed`;
      addLog(execution, 'error', execution.error, undefined, undefined, callbacks.onLog);
      callbacks.onError?.(execution, execution.error);
      
      // Persist final failed state
      await persistExecutionState(execution);
      
      return {
        execution,
        success: false,
        output,
        error: execution.error,
      };
    }

    execution.status = 'completed';
    execution.completedAt = new Date();
    execution.duration = execution.completedAt.getTime() - (execution.startedAt?.getTime() || 0);
    execution.output = output;
    execution.progress = 100;

    addLog(execution, 'info', `Workflow completed: ${workflow.name}`, undefined, undefined, callbacks.onLog);
    callbacks.onComplete?.(execution);

    // Persist final completed state
    await persistExecutionState(execution);

    return {
      execution,
      success: true,
      output,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Workflow execution failed';
    
    execution.status = 'failed';
    execution.completedAt = new Date();
    execution.duration = execution.completedAt.getTime() - (execution.startedAt?.getTime() || 0);
    execution.error = errorMessage;

    addLog(execution, 'error', errorMessage, undefined, undefined, callbacks.onLog);
    callbacks.onError?.(execution, errorMessage);

    // Persist final error state
    await persistExecutionState(execution);

    return {
      execution,
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Pause a workflow execution
 */
export function pauseWorkflow(execution: WorkflowExecution): void {
  if (execution.status === 'executing') {
    execution.status = 'paused';
    addLog(execution, 'info', 'Workflow paused');
  }
}

/**
 * Resume a paused workflow execution
 */
export function resumeWorkflow(execution: WorkflowExecution): void {
  if (execution.status === 'paused') {
    execution.status = 'executing';
    addLog(execution, 'info', 'Workflow resumed');
  }
}

/**
 * Cancel a workflow execution
 */
export function cancelWorkflow(execution: WorkflowExecution): void {
  if (execution.status === 'executing' || execution.status === 'paused') {
    execution.status = 'cancelled';
    execution.completedAt = new Date();
    execution.duration = execution.completedAt.getTime() - (execution.startedAt?.getTime() || 0);
    addLog(execution, 'info', 'Workflow cancelled');
  }
}

// Initialize subworkflow executor with executeWorkflow reference
setExecuteWorkflowFn(executeWorkflow);
