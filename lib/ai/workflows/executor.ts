/**
 * Workflow Executor - Executes workflows step by step
 * 
 * Handles step orchestration, dependency resolution, and state management
 */

import { generateText } from 'ai';
import { nanoid } from 'nanoid';
import { getProviderModel, type ProviderName } from '../core/client';
import { getGlobalToolRegistry } from '../tools/registry';
import { getGlobalWorkflowRegistry } from './registry';
import type {
  WorkflowDefinition,
  WorkflowExecution,
  WorkflowStepExecution,
  WorkflowStepStatus,
  WorkflowLog,
  WorkflowStepDefinition,
} from '@/types/workflow';

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
 * Execute an AI-based step
 */
async function executeAIStep(
  step: WorkflowStepDefinition,
  input: Record<string, unknown>,
  config: WorkflowExecutorConfig
): Promise<unknown> {
  const modelInstance = getProviderModel(
    config.provider,
    config.model,
    config.apiKey,
    config.baseURL
  );

  // Build prompt with input context
  let prompt = step.aiPrompt || '';
  for (const [key, value] of Object.entries(input)) {
    prompt = prompt.replace(`{{${key}}}`, String(value));
  }

  const result = await generateText({
    model: modelInstance,
    prompt,
    temperature: config.temperature || 0.7,
  });

  return {
    text: result.text,
    usage: result.usage,
  };
}

/**
 * Execute a tool-based step
 */
async function executeToolStep(
  step: WorkflowStepDefinition,
  input: Record<string, unknown>
): Promise<unknown> {
  if (!step.toolName) {
    throw new Error('Tool step requires toolName');
  }

  const registry = getGlobalToolRegistry();
  const toolDef = registry.get(step.toolName);

  if (!toolDef) {
    throw new Error(`Tool not found: ${step.toolName}`);
  }

  const toolFn = toolDef.create({});
  return toolFn(input);
}

/**
 * Execute a conditional step
 */
async function executeConditionalStep(
  step: WorkflowStepDefinition,
  input: Record<string, unknown>,
  _execution: WorkflowExecution
): Promise<unknown> {
  if (!step.condition) {
    return input;
  }

  // Simple condition evaluation
  // In a real implementation, this could use a proper expression parser
  try {
    const conditionFn = new Function(...Object.keys(input), `return ${step.condition}`);
    const result = conditionFn(...Object.values(input));
    return { conditionResult: result, ...input };
  } catch (_error) {
    throw new Error(`Failed to evaluate condition: ${step.condition}`);
  }
}

/**
 * Execute a code step - runs JavaScript/TypeScript code
 */
async function executeCodeStep(
  step: WorkflowStepDefinition,
  input: Record<string, unknown>
): Promise<unknown> {
  if (!step.code) {
    throw new Error('Code step requires code');
  }

  try {
    // Create a sandboxed function with input as context
    const asyncFn = new Function(
      'input',
      `return (async () => { ${step.code} })()`
    );
    const result = await asyncFn(input);
    return typeof result === 'object' ? result : { result };
  } catch (error) {
    throw new Error(`Code execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Execute a transform step - transforms data using expression
 */
async function executeTransformStep(
  step: WorkflowStepDefinition,
  input: Record<string, unknown>
): Promise<unknown> {
  if (!step.expression) {
    return input;
  }

  try {
    const data = input.data || input;
    
    switch (step.transformType) {
      case 'map': {
        if (!Array.isArray(data)) {
          throw new Error('Map transform requires array input');
        }
        const mapFn = new Function('item', 'index', `return ${step.expression}`);
        return { result: data.map((item, index) => mapFn(item, index)) };
      }
      case 'filter': {
        if (!Array.isArray(data)) {
          throw new Error('Filter transform requires array input');
        }
        const filterFn = new Function('item', 'index', `return ${step.expression}`);
        return { result: data.filter((item, index) => filterFn(item, index)) };
      }
      case 'reduce': {
        if (!Array.isArray(data)) {
          throw new Error('Reduce transform requires array input');
        }
        const reduceFn = new Function('acc', 'item', 'index', `return ${step.expression}`);
        return { result: data.reduce((acc, item, index) => reduceFn(acc, item, index), null) };
      }
      case 'sort': {
        if (!Array.isArray(data)) {
          throw new Error('Sort transform requires array input');
        }
        const sortFn = new Function('a', 'b', `return ${step.expression}`);
        return { result: [...data].sort((a, b) => sortFn(a, b)) };
      }
      case 'custom':
      default: {
        const customFn = new Function('data', 'input', `return ${step.expression}`);
        return { result: customFn(data, input) };
      }
    }
  } catch (error) {
    throw new Error(`Transform failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Execute a loop step - iterates over collection or condition
 */
async function executeLoopStep(
  step: WorkflowStepDefinition,
  input: Record<string, unknown>,
  _execution: WorkflowExecution,
  _config: WorkflowExecutorConfig,
  _callbacks: WorkflowExecutorCallbacks
): Promise<unknown> {
  const maxIterations = step.maxIterations || 100;
  const results: unknown[] = [];
  
  switch (step.loopType) {
    case 'forEach': {
      const collection = step.collection ? input[step.collection] : input.collection;
      if (!Array.isArray(collection)) {
        throw new Error('forEach loop requires array collection');
      }
      for (let i = 0; i < Math.min(collection.length, maxIterations); i++) {
        results.push({ [step.iteratorVariable || 'item']: collection[i], index: i });
      }
      break;
    }
    case 'times': {
      for (let i = 0; i < maxIterations; i++) {
        results.push({ [step.iteratorVariable || 'index']: i });
      }
      break;
    }
    case 'while': {
      if (!step.condition) {
        throw new Error('while loop requires condition');
      }
      let iteration = 0;
      let conditionResult = true;
      while (conditionResult && iteration < maxIterations) {
        try {
          const conditionFn = new Function('iteration', 'input', `return ${step.condition}`);
          conditionResult = conditionFn(iteration, input);
          if (conditionResult) {
            results.push({ [step.iteratorVariable || 'iteration']: iteration });
            iteration++;
          }
        } catch {
          break;
        }
      }
      break;
    }
  }

  return { iterations: results, count: results.length };
}

/**
 * Execute a webhook step - makes HTTP request
 */
async function executeWebhookStep(
  step: WorkflowStepDefinition,
  input: Record<string, unknown>
): Promise<unknown> {
  if (!step.webhookUrl) {
    throw new Error('Webhook step requires webhookUrl');
  }

  try {
    // Replace placeholders in URL and body
    let url = step.webhookUrl;
    let body = step.body || '';
    
    for (const [key, value] of Object.entries(input)) {
      url = url.replace(`{{${key}}}`, String(value));
      body = body.replace(`{{${key}}}`, String(value));
    }

    const response = await fetch(url, {
      method: step.method || 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...step.headers,
      },
      body: step.method !== 'GET' ? body : undefined,
    });

    const responseText = await response.text();
    let responseData: unknown;
    
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = responseText;
    }

    return {
      status: response.status,
      statusText: response.statusText,
      data: responseData,
      headers: Object.fromEntries(response.headers.entries()),
    };
  } catch (error) {
    throw new Error(`Webhook request failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Execute a delay step - waits for specified duration
 */
async function executeDelayStep(
  step: WorkflowStepDefinition
): Promise<unknown> {
  switch (step.delayType) {
    case 'fixed': {
      const ms = step.delayMs || 1000;
      await new Promise(resolve => setTimeout(resolve, ms));
      return { delayed: ms };
    }
    case 'until': {
      if (step.untilTime) {
        const targetTime = new Date(step.untilTime).getTime();
        const now = Date.now();
        if (targetTime > now) {
          await new Promise(resolve => setTimeout(resolve, targetTime - now));
        }
      }
      return { delayed: true, until: step.untilTime };
    }
    case 'cron':
    default:
      // Cron expressions would need a proper scheduler - just pass through for now
      return { delayed: false, reason: 'Cron scheduling not supported in immediate execution' };
  }
}

/**
 * Execute a merge step - combines multiple inputs
 */
async function executeMergeStep(
  step: WorkflowStepDefinition,
  input: Record<string, unknown>
): Promise<unknown> {
  const inputs = Object.values(input);
  
  switch (step.mergeStrategy) {
    case 'concat': {
      // Concatenate arrays
      const arrays = inputs.filter(Array.isArray);
      return { result: arrays.flat() };
    }
    case 'merge': {
      // Deep merge objects
      return { result: Object.assign({}, ...inputs.filter(v => typeof v === 'object' && v !== null)) };
    }
    case 'first': {
      return { result: inputs[0] };
    }
    case 'last': {
      return { result: inputs[inputs.length - 1] };
    }
    case 'custom':
    default: {
      // Return all inputs as-is
      return { result: input };
    }
  }
}

/**
 * Execute a subworkflow step - runs another workflow
 */
async function executeSubworkflowStep(
  step: WorkflowStepDefinition,
  input: Record<string, unknown>,
  config: WorkflowExecutorConfig,
  callbacks: WorkflowExecutorCallbacks
): Promise<unknown> {
  if (!step.workflowId) {
    throw new Error('Subworkflow step requires workflowId');
  }

  // Map inputs according to inputMapping
  const subworkflowInput: Record<string, unknown> = {};
  if (step.inputMapping) {
    for (const [targetKey, sourceKey] of Object.entries(step.inputMapping)) {
      subworkflowInput[targetKey] = input[sourceKey];
    }
  } else {
    Object.assign(subworkflowInput, input);
  }

  // Execute the subworkflow
  const result = await executeWorkflow(
    step.workflowId,
    `sub-${Date.now()}`,
    subworkflowInput,
    config,
    callbacks
  );

  if (!result.success) {
    throw new Error(`Subworkflow failed: ${result.error}`);
  }

  // Map outputs according to outputMapping
  const output: Record<string, unknown> = {};
  if (step.outputMapping && result.output) {
    for (const [targetKey, sourceKey] of Object.entries(step.outputMapping)) {
      output[targetKey] = result.output[sourceKey];
    }
  } else {
    Object.assign(output, result.output);
  }

  return output;
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
      execution.error = `${failedSteps.length} step(s) failed`;
      addLog(execution, 'error', execution.error, undefined, undefined, callbacks.onLog);
      callbacks.onError?.(execution, execution.error);
      
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
