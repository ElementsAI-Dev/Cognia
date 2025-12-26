/**
 * SubAgent Executor - Execute sub-agents spawned by parent agents
 * 
 * Features:
 * - Execute sub-agents with inherited or custom configuration
 * - Support for parallel and sequential execution
 * - Context sharing between parent and sub-agents
 * - Result aggregation and error handling
 */

import { nanoid } from 'nanoid';
import { executeAgent, type AgentConfig, type AgentResult, type AgentTool } from './agent-executor';
import type { ProviderName } from '../client';
import {
  DEFAULT_SUB_AGENT_CONFIG,
  type SubAgent,
  type SubAgentConfig,
  type SubAgentContext,
  type SubAgentResult,
  type SubAgentStep,
  type SubAgentLog,
  type SubAgentExecutionOptions,
  type SubAgentOrchestrationResult,
  type CreateSubAgentInput,
} from '@/types/sub-agent';

/**
 * SubAgent executor configuration
 */
export interface SubAgentExecutorConfig {
  provider: ProviderName;
  model: string;
  apiKey: string;
  baseURL?: string;
  parentContext?: Record<string, unknown>;
  siblingResults?: Record<string, SubAgentResult>;
  globalTools?: Record<string, AgentTool>;
}

/**
 * Create a new sub-agent instance
 */
export function createSubAgent(input: CreateSubAgentInput): SubAgent {
  const now = new Date();
  const config: SubAgentConfig = {
    ...DEFAULT_SUB_AGENT_CONFIG,
    ...input.config,
  };

  return {
    id: nanoid(),
    parentAgentId: input.parentAgentId,
    name: input.name,
    description: input.description || '',
    task: input.task,
    status: 'pending',
    config,
    logs: [],
    progress: 0,
    createdAt: now,
    retryCount: 0,
    order: input.order ?? 0,
    tags: input.tags,
  };
}

/**
 * Add log entry to sub-agent
 */
function addLog(
  subAgent: SubAgent,
  level: SubAgentLog['level'],
  message: string,
  data?: unknown,
  stepNumber?: number
): SubAgentLog {
  const log: SubAgentLog = {
    timestamp: new Date(),
    level,
    message,
    data,
    stepNumber,
  };
  subAgent.logs.push(log);
  return log;
}

/**
 * Build system prompt for sub-agent
 */
function buildSubAgentSystemPrompt(
  subAgent: SubAgent,
  context: SubAgentContext
): string {
  const parts: string[] = [];

  // Custom system prompt
  if (subAgent.config.systemPrompt) {
    parts.push(subAgent.config.systemPrompt);
  }

  // Parent context
  if (subAgent.config.inheritParentContext && context.parentContext) {
    parts.push('\n--- Parent Context ---');
    parts.push(JSON.stringify(context.parentContext, null, 2));
  }

  // Sibling results
  if (subAgent.config.shareResults && context.siblingResults) {
    const completedSiblings = Object.entries(context.siblingResults)
      .filter(([_, result]) => result.success)
      .map(([id, result]) => `${id}: ${result.finalResponse.slice(0, 500)}`);
    
    if (completedSiblings.length > 0) {
      parts.push('\n--- Results from Other Sub-Agents ---');
      parts.push(completedSiblings.join('\n\n'));
    }
  }

  // Task-specific instructions
  parts.push('\n--- Your Task ---');
  parts.push(`You are a sub-agent named "${subAgent.name}".`);
  if (subAgent.description) {
    parts.push(`Purpose: ${subAgent.description}`);
  }
  parts.push('Focus on completing your assigned task efficiently and accurately.');
  parts.push('Provide clear, actionable results that can be used by the parent agent.');

  return parts.join('\n');
}

/**
 * Convert AgentResult to SubAgentResult
 */
function convertToSubAgentResult(agentResult: AgentResult): SubAgentResult {
  const steps: SubAgentStep[] = agentResult.steps.map(step => ({
    stepNumber: step.stepNumber,
    response: step.response,
    toolCalls: step.toolCalls,
    timestamp: step.timestamp,
    duration: undefined,
    tokenUsage: step.usage,
  }));

  return {
    success: agentResult.success,
    finalResponse: agentResult.finalResponse,
    steps,
    totalSteps: agentResult.totalSteps,
    duration: agentResult.duration,
    toolResults: agentResult.toolResults,
    error: agentResult.error,
  };
}

/**
 * Execute a single sub-agent
 */
export async function executeSubAgent(
  subAgent: SubAgent,
  executorConfig: SubAgentExecutorConfig,
  options: SubAgentExecutionOptions = {}
): Promise<SubAgentResult> {
  const startTime = Date.now();
  
  // Update status
  subAgent.status = 'running';
  subAgent.startedAt = new Date();
  subAgent.progress = 0;
  
  addLog(subAgent, 'info', `Starting sub-agent: ${subAgent.name}`);
  options.onStart?.(subAgent);

  // Build context
  const context: SubAgentContext = {
    parentAgentId: subAgent.parentAgentId,
    sessionId: executorConfig.parentContext?.sessionId as string || '',
    parentContext: executorConfig.parentContext,
    siblingResults: executorConfig.siblingResults,
    startTime: new Date(),
    currentStep: 0,
  };
  subAgent.context = context;

  // Build agent config
  const agentConfig: AgentConfig = {
    provider: subAgent.config.provider || executorConfig.provider,
    model: subAgent.config.model || executorConfig.model,
    apiKey: executorConfig.apiKey,
    baseURL: executorConfig.baseURL,
    systemPrompt: buildSubAgentSystemPrompt(subAgent, context),
    temperature: subAgent.config.temperature ?? 0.7,
    maxSteps: subAgent.config.maxSteps ?? 10,
    tools: {
      ...executorConfig.globalTools,
      ...subAgent.config.customTools,
    },
    onStepStart: (step) => {
      context.currentStep = step;
      subAgent.progress = Math.min(90, (step / (subAgent.config.maxSteps || 10)) * 100);
      options.onProgress?.(subAgent, subAgent.progress);
    },
    onStepComplete: (step, response, toolCalls) => {
      const subAgentStep: SubAgentStep = {
        stepNumber: step,
        response,
        toolCalls,
        timestamp: new Date(),
      };
      addLog(subAgent, 'info', `Step ${step} completed`, { response: response.slice(0, 200) }, step);
      options.onStep?.(subAgent, subAgentStep);
    },
    onToolCall: (toolCall) => {
      addLog(subAgent, 'info', `Tool call: ${toolCall.name}`, toolCall.args);
      options.onToolCall?.(subAgent, toolCall);
    },
    onToolResult: (toolCall) => {
      addLog(subAgent, 'info', `Tool result: ${toolCall.name}`, toolCall.result);
      options.onToolResult?.(subAgent, toolCall);
    },
    onError: (error) => {
      addLog(subAgent, 'error', `Error: ${error.message}`);
    },
  };

  try {
    // Execute with timeout if configured
    let agentResult: AgentResult;
    
    if (subAgent.config.timeout) {
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Sub-agent execution timeout')), subAgent.config.timeout);
      });
      
      agentResult = await Promise.race([
        executeAgent(subAgent.task, agentConfig),
        timeoutPromise,
      ]);
    } else {
      agentResult = await executeAgent(subAgent.task, agentConfig);
    }

    // Convert result
    const result = convertToSubAgentResult(agentResult);
    result.duration = Date.now() - startTime;

    // Update sub-agent state
    subAgent.result = result;
    subAgent.status = result.success ? 'completed' : 'failed';
    subAgent.completedAt = new Date();
    subAgent.progress = 100;
    subAgent.error = result.error;

    addLog(subAgent, result.success ? 'info' : 'error', 
      result.success ? 'Sub-agent completed successfully' : `Sub-agent failed: ${result.error}`);

    if (result.success) {
      options.onComplete?.(subAgent, result);
    } else {
      options.onError?.(subAgent, result.error || 'Unknown error');
    }

    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Sub-agent execution failed';
    const duration = Date.now() - startTime;

    // Check if we should retry
    const maxRetries = subAgent.config.retryConfig?.maxRetries ?? 0;
    if (subAgent.retryCount < maxRetries) {
      subAgent.retryCount++;
      subAgent.status = 'pending';
      
      const retryDelay = subAgent.config.retryConfig?.exponentialBackoff
        ? (subAgent.config.retryConfig.retryDelay || 1000) * Math.pow(2, subAgent.retryCount - 1)
        : (subAgent.config.retryConfig?.retryDelay || 1000);

      addLog(subAgent, 'warn', `Retrying sub-agent (attempt ${subAgent.retryCount}/${maxRetries}) after ${retryDelay}ms`);
      
      await new Promise(resolve => setTimeout(resolve, retryDelay));
      return executeSubAgent(subAgent, executorConfig, options);
    }

    // Final failure
    const result: SubAgentResult = {
      success: false,
      finalResponse: '',
      steps: [],
      totalSteps: 0,
      duration,
      error: errorMessage,
    };

    subAgent.result = result;
    subAgent.status = errorMessage.includes('timeout') ? 'timeout' : 'failed';
    subAgent.completedAt = new Date();
    subAgent.error = errorMessage;

    addLog(subAgent, 'error', `Sub-agent failed: ${errorMessage}`);
    options.onError?.(subAgent, errorMessage);

    return result;
  }
}

/**
 * Execute multiple sub-agents in parallel
 */
export async function executeSubAgentsParallel(
  subAgents: SubAgent[],
  executorConfig: SubAgentExecutorConfig,
  options: SubAgentExecutionOptions = {},
  maxConcurrency: number = 3
): Promise<SubAgentOrchestrationResult> {
  const startTime = Date.now();
  const results: Record<string, SubAgentResult> = {};
  const errors: Record<string, string> = {};

  // Sort by priority
  const sortedAgents = [...subAgents].sort((a, b) => {
    const priorityOrder = { critical: 0, high: 1, normal: 2, low: 3, background: 4 };
    const aPriority = priorityOrder[a.config.priority || 'normal'];
    const bPriority = priorityOrder[b.config.priority || 'normal'];
    return aPriority - bPriority || a.order - b.order;
  });

  // Execute in batches based on concurrency
  for (let i = 0; i < sortedAgents.length; i += maxConcurrency) {
    const batch = sortedAgents.slice(i, i + maxConcurrency);
    
    // Update sibling results for context sharing
    const siblingResults = { ...executorConfig.siblingResults, ...results };
    const batchConfig = { ...executorConfig, siblingResults };

    const batchPromises = batch.map(subAgent => 
      executeSubAgent(subAgent, batchConfig, options)
        .then(result => {
          results[subAgent.id] = result;
          if (!result.success && result.error) {
            errors[subAgent.id] = result.error;
          }
        })
        .catch(error => {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          errors[subAgent.id] = errorMessage;
          results[subAgent.id] = {
            success: false,
            finalResponse: '',
            steps: [],
            totalSteps: 0,
            duration: 0,
            error: errorMessage,
          };
        })
    );

    await Promise.all(batchPromises);
  }

  // Calculate totals
  const totalDuration = Date.now() - startTime;
  const allSucceeded = Object.values(results).every(r => r.success);
  
  let totalTokenUsage: SubAgentOrchestrationResult['totalTokenUsage'];
  const tokenUsages = Object.values(results)
    .map(r => r.tokenUsage)
    .filter((t): t is NonNullable<typeof t> => t !== undefined);
  
  if (tokenUsages.length > 0) {
    totalTokenUsage = tokenUsages.reduce(
      (acc, t) => ({
        promptTokens: acc.promptTokens + t.promptTokens,
        completionTokens: acc.completionTokens + t.completionTokens,
        totalTokens: acc.totalTokens + t.totalTokens,
      }),
      { promptTokens: 0, completionTokens: 0, totalTokens: 0 }
    );
  }

  // Aggregate responses
  const successfulResponses = Object.entries(results)
    .filter(([_, r]) => r.success)
    .map(([id, r]) => {
      const agent = subAgents.find(a => a.id === id);
      return `[${agent?.name || id}]: ${r.finalResponse}`;
    });

  return {
    success: allSucceeded,
    results,
    aggregatedResponse: successfulResponses.join('\n\n'),
    totalDuration,
    totalTokenUsage,
    errors: Object.keys(errors).length > 0 ? errors : undefined,
  };
}

/**
 * Execute multiple sub-agents sequentially
 */
export async function executeSubAgentsSequential(
  subAgents: SubAgent[],
  executorConfig: SubAgentExecutorConfig,
  options: SubAgentExecutionOptions = {},
  stopOnError: boolean = true
): Promise<SubAgentOrchestrationResult> {
  const startTime = Date.now();
  const results: Record<string, SubAgentResult> = {};
  const errors: Record<string, string> = {};

  // Sort by order
  const sortedAgents = [...subAgents].sort((a, b) => a.order - b.order);

  for (const subAgent of sortedAgents) {
    // Check dependencies
    if (subAgent.config.dependencies && subAgent.config.dependencies.length > 0) {
      const unmetDependencies = subAgent.config.dependencies.filter(depId => {
        const depResult = results[depId];
        return !depResult || !depResult.success;
      });

      if (unmetDependencies.length > 0) {
        const errorMessage = `Unmet dependencies: ${unmetDependencies.join(', ')}`;
        errors[subAgent.id] = errorMessage;
        subAgent.status = 'failed';
        subAgent.error = errorMessage;
        
        if (stopOnError) break;
        continue;
      }
    }

    // Check condition
    if (subAgent.config.condition) {
      const context: SubAgentContext = {
        parentAgentId: subAgent.parentAgentId,
        sessionId: '',
        siblingResults: results,
        startTime: new Date(),
        currentStep: 0,
      };

      let shouldExecute = true;
      if (typeof subAgent.config.condition === 'function') {
        shouldExecute = subAgent.config.condition(context);
      } else {
        try {
          shouldExecute = new Function('context', `return ${subAgent.config.condition}`)(context);
        } catch {
          shouldExecute = true;
        }
      }

      if (!shouldExecute) {
        subAgent.status = 'cancelled';
        continue;
      }
    }

    // Update sibling results for context sharing
    const siblingResults = { ...executorConfig.siblingResults, ...results };
    const agentConfig = { ...executorConfig, siblingResults };

    try {
      const result = await executeSubAgent(subAgent, agentConfig, options);
      results[subAgent.id] = result;

      if (!result.success) {
        errors[subAgent.id] = result.error || 'Unknown error';
        if (stopOnError) break;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      errors[subAgent.id] = errorMessage;
      results[subAgent.id] = {
        success: false,
        finalResponse: '',
        steps: [],
        totalSteps: 0,
        duration: 0,
        error: errorMessage,
      };
      if (stopOnError) break;
    }
  }

  // Calculate totals
  const totalDuration = Date.now() - startTime;
  const allSucceeded = Object.values(results).every(r => r.success);

  let totalTokenUsage: SubAgentOrchestrationResult['totalTokenUsage'];
  const tokenUsages = Object.values(results)
    .map(r => r.tokenUsage)
    .filter((t): t is NonNullable<typeof t> => t !== undefined);

  if (tokenUsages.length > 0) {
    totalTokenUsage = tokenUsages.reduce(
      (acc, t) => ({
        promptTokens: acc.promptTokens + t.promptTokens,
        completionTokens: acc.completionTokens + t.completionTokens,
        totalTokens: acc.totalTokens + t.totalTokens,
      }),
      { promptTokens: 0, completionTokens: 0, totalTokens: 0 }
    );
  }

  // Aggregate responses
  const successfulResponses = Object.entries(results)
    .filter(([_, r]) => r.success)
    .map(([id, r]) => {
      const agent = subAgents.find(a => a.id === id);
      return `[${agent?.name || id}]: ${r.finalResponse}`;
    });

  return {
    success: allSucceeded,
    results,
    aggregatedResponse: successfulResponses.join('\n\n'),
    totalDuration,
    totalTokenUsage,
    errors: Object.keys(errors).length > 0 ? errors : undefined,
  };
}

/**
 * Cancel a sub-agent execution
 */
export function cancelSubAgent(subAgent: SubAgent): void {
  if (subAgent.status === 'running' || subAgent.status === 'pending' || subAgent.status === 'queued') {
    subAgent.status = 'cancelled';
    subAgent.completedAt = new Date();
    addLog(subAgent, 'info', 'Sub-agent cancelled');
  }
}

/**
 * Cancel all sub-agents in a group
 */
export function cancelAllSubAgents(subAgents: SubAgent[]): void {
  subAgents.forEach(cancelSubAgent);
}
