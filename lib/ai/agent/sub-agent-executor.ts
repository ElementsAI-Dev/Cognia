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
import type { ProviderName } from '../core/client';
import {
  DEFAULT_SUB_AGENT_CONFIG,
  createCancellationToken,
  type SubAgent,
  type SubAgentConfig,
  type SubAgentContext,
  type SubAgentResult,
  type SubAgentStep,
  type SubAgentLog,
  type SubAgentExecutionOptions,
  type SubAgentOrchestrationResult,
  type CreateSubAgentInput,
  type CancellationToken,
  type SubAgentTokenUsage,
} from '@/types/agent/sub-agent';
import type { ExternalAgentExecutionOptions } from '@/types/agent/external-agent';
import { loggers } from '@/lib/logger';

const log = loggers.agent;

/**
 * Execution metrics collector for analytics
 */
interface ExecutionMetricsCollector {
  startTime: number;
  stepCount: number;
  totalTokens: number;
  retryCount: number;
}

/**
 * Create a timeout promise with proper cleanup
 */
function createTimeoutPromise(
  timeout: number,
  cancellationToken?: CancellationToken
): { promise: Promise<never>; cleanup: () => void } {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let rejectFn: ((error: Error) => void) | null = null;

  const promise = new Promise<never>((_, reject) => {
    rejectFn = reject;
    timeoutId = setTimeout(() => {
      reject(new Error('Sub-agent execution timeout'));
    }, timeout);
  });

  // Handle cancellation
  if (cancellationToken) {
    cancellationToken.signal.addEventListener('abort', () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      if (rejectFn) {
        rejectFn(new Error('Operation cancelled'));
      }
    });
  }

  const cleanup = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };

  return { promise, cleanup };
}

/**
 * Safely evaluate a condition without using new Function()
 * Only supports simple expressions for security
 */
function evaluateCondition(
  condition: string | ((context: SubAgentContext) => boolean),
  context: SubAgentContext
): boolean {
  if (typeof condition === 'function') {
    return condition(context);
  }

  // Parse simple conditions safely
  // Supported formats:
  // - "true" / "false"
  // - "siblingResults.agentId.success"
  // - "siblingResults.agentId.success === true"
  const trimmed = condition.trim().toLowerCase();
  
  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;

  // Check for sibling result success condition
  const siblingMatch = condition.match(/siblingResults\.([\w-]+)\.success/);
  if (siblingMatch && context.siblingResults) {
    const agentId = siblingMatch[1];
    const result = context.siblingResults[agentId];
    return result?.success ?? false;
  }

  // Check for sibling result exists condition
  const existsMatch = condition.match(/siblingResults\.([\w-]+)/);
  if (existsMatch && context.siblingResults) {
    const agentId = existsMatch[1];
    return agentId in context.siblingResults;
  }

  // Default to true for unrecognized conditions (safe fallback)
  log.warn('Unrecognized condition format, defaulting to true', { condition });
  return true;
}

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
  /** Cancellation token for aborting execution */
  cancellationToken?: CancellationToken;
  /** Enable metrics collection */
  collectMetrics?: boolean;
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

// =============================================================================
// Context Isolation (Claude Best Practice)
// Prevent context pollution by summarizing results before returning to parent.
// =============================================================================

/**
 * Default summarization prompt for sub-agent results
 */
const DEFAULT_SUMMARIZATION_PROMPT = `Summarize the following sub-agent execution result concisely. 
Focus on:
1. Key findings and conclusions
2. Important data or metrics discovered
3. Actions taken and their outcomes
4. Any warnings or issues encountered

Keep the summary focused and actionable for the parent agent.
Omit verbose details, intermediate steps, and raw data dumps.

Sub-agent result to summarize:
{{result}}

Provide a concise summary (max {{maxTokens}} tokens):`;

/**
 * Estimate token count for a string (rough approximation)
 */
function estimateTokens(text: string): number {
  // Rough estimate: 1 token ≈ 4 characters
  return Math.ceil(text.length / 4);
}

/**
 * Summarize sub-agent result to prevent context pollution
 * This implements Claude's recommendation for context isolation in multi-agent systems
 */
export async function summarizeSubAgentResult(
  result: SubAgentResult,
  config: SubAgentConfig,
  executorConfig: SubAgentExecutorConfig
): Promise<string> {
  const maxTokens = config.maxResultTokens ?? 500;
  const originalResponse = result.finalResponse;
  
  // If response is already short enough, return as-is
  const estimatedTokens = estimateTokens(originalResponse);
  if (estimatedTokens <= maxTokens) {
    return originalResponse;
  }
  
  // Build summarization prompt
  const prompt = (config.summarizationPrompt || DEFAULT_SUMMARIZATION_PROMPT)
    .replace('{{result}}', originalResponse.slice(0, 8000)) // Limit input to avoid token overflow
    .replace('{{maxTokens}}', maxTokens.toString());
  
  try {
    const { generateText } = await import('ai');
    const { getProviderModel } = await import('../core/client');
    
    const modelInstance = getProviderModel(
      executorConfig.provider,
      executorConfig.model,
      executorConfig.apiKey,
      executorConfig.baseURL
    );
    
    const summaryResult = await generateText({
      model: modelInstance,
      prompt,
      temperature: 0.3, // Lower temperature for consistent summarization
    });
    
    return summaryResult.text || originalResponse.slice(0, maxTokens * 4);
  } catch (error) {
    // Fallback to simple truncation if summarization fails
    log.warn('Result summarization failed, using truncation', { error: String(error) });
    return originalResponse.slice(0, maxTokens * 4) + '\n\n[Result truncated for context efficiency]';
  }
}

/**
 * Execute a sub-agent on an external agent
 */
async function executeSubAgentOnExternal(
  subAgent: SubAgent,
  executorConfig: SubAgentExecutorConfig,
  options: SubAgentExecutionOptions = {}
): Promise<SubAgentResult> {
  const startTime = Date.now();
  
  if (!subAgent.config.externalAgentId) {
    throw new Error('External agent ID not configured');
  }

  addLog(subAgent, 'info', `Delegating to external agent: ${subAgent.config.externalAgentId}`);

  try {
    // Dynamic import to avoid circular dependencies
    const { getExternalAgentManager } = await import('./external/manager');
    const manager = getExternalAgentManager();

    // Check if agent is connected
    const agent = manager.getAgent(subAgent.config.externalAgentId);
    if (!agent) {
      throw new Error(`External agent not found: ${subAgent.config.externalAgentId}`);
    }

    if (agent.connectionStatus !== 'connected') {
      await manager.connect(subAgent.config.externalAgentId);
    }

    // Build context for external agent
    const context: SubAgentContext = {
      parentAgentId: subAgent.parentAgentId,
      sessionId: executorConfig.parentContext?.sessionId as string || '',
      parentContext: executorConfig.parentContext,
      siblingResults: executorConfig.siblingResults,
      startTime: new Date(),
      currentStep: 0,
    };
    subAgent.context = context;

    // Build execution options
    const execOptions: ExternalAgentExecutionOptions = {
      systemPrompt: buildSubAgentSystemPrompt(subAgent, context),
      permissionMode: subAgent.config.externalAgentPermissionMode || 'default',
      timeout: subAgent.config.timeout,
      onProgress: (progress, message) => {
        subAgent.progress = progress;
        addLog(subAgent, 'debug', message || `Progress: ${progress}%`);
        options.onProgress?.(subAgent, progress);
      },
    };

    // Execute on external agent
    const result = await manager.execute(
      subAgent.config.externalAgentId,
      subAgent.task,
      execOptions
    );

    // Convert to SubAgentResult
    const subAgentResult: SubAgentResult = {
      success: result.success,
      finalResponse: result.finalResponse,
      steps: result.steps.map((step, idx) => ({
        stepNumber: idx + 1,
        response: step.content?.find(c => c.type === 'text')?.text || '',
        toolCalls: step.toolCall ? [{
          id: step.toolCall.id,
          name: step.toolCall.name,
          args: step.toolCall.input,
          status: 'completed' as const,
        }] : [],
        timestamp: step.startedAt || new Date(),
        duration: step.duration,
      })),
      totalSteps: result.steps.length,
      duration: Date.now() - startTime,
      output: result.output,
      tokenUsage: result.tokenUsage ? {
        promptTokens: result.tokenUsage.promptTokens,
        completionTokens: result.tokenUsage.completionTokens,
        totalTokens: result.tokenUsage.totalTokens,
      } : undefined,
      error: result.error,
    };

    // Apply context isolation if configured
    if (subAgentResult.success && subAgent.config.summarizeResults) {
      try {
        const summarizedResponse = await summarizeSubAgentResult(
          subAgentResult,
          subAgent.config,
          executorConfig
        );
        subAgentResult.finalResponse = summarizedResponse;
        addLog(subAgent, 'debug', 'Result summarized for context isolation');
      } catch (summarizeError) {
        addLog(subAgent, 'warn', `Result summarization failed: ${summarizeError}`);
      }
    }

    // Update sub-agent state
    subAgent.result = subAgentResult;
    subAgent.status = subAgentResult.success ? 'completed' : 'failed';
    subAgent.completedAt = new Date();
    subAgent.progress = 100;
    subAgent.error = subAgentResult.error;

    addLog(subAgent, subAgentResult.success ? 'info' : 'error',
      subAgentResult.success 
        ? 'External sub-agent completed successfully' 
        : `External sub-agent failed: ${subAgentResult.error}`);

    if (subAgentResult.success) {
      options.onComplete?.(subAgent, subAgentResult);
    } else {
      options.onError?.(subAgent, subAgentResult.error || 'Unknown error');
    }

    return subAgentResult;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    addLog(subAgent, 'error', `External agent execution failed: ${errorMessage}`);
    
    const failedResult: SubAgentResult = {
      success: false,
      finalResponse: '',
      steps: [],
      totalSteps: 0,
      duration: Date.now() - startTime,
      error: `External agent execution failed: ${errorMessage}`,
    };

    subAgent.result = failedResult;
    subAgent.status = 'failed';
    subAgent.completedAt = new Date();
    subAgent.progress = 100;
    subAgent.error = failedResult.error;

    options.onError?.(subAgent, failedResult.error || 'Unknown error');
    return failedResult;
  }
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
  const metrics: ExecutionMetricsCollector = {
    startTime,
    stepCount: 0,
    totalTokens: 0,
    retryCount: subAgent.retryCount,
  };
  
  // Check cancellation before starting
  if (executorConfig.cancellationToken?.isCancelled) {
    return createCancelledResult(subAgent, startTime);
  }

  // Check if this sub-agent should use an external agent
  if (subAgent.config.useExternalAgent && subAgent.config.externalAgentId) {
    log.info('Delegating sub-agent to external agent', {
      subAgentId: subAgent.id,
      externalAgentId: subAgent.config.externalAgentId,
    });
    return executeSubAgentOnExternal(subAgent, executorConfig, options);
  }
  
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
      // Check cancellation at each step
      if (executorConfig.cancellationToken?.isCancelled) {
        throw new Error('Operation cancelled');
      }
      context.currentStep = step;
      metrics.stepCount = step;
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

  // Setup timeout with proper cleanup
  let timeoutCleanup: (() => void) | null = null;
  
  try {
    // Execute with timeout if configured
    let agentResult: AgentResult;
    
    if (subAgent.config.timeout) {
      const { promise: timeoutPromise, cleanup } = createTimeoutPromise(
        subAgent.config.timeout,
        executorConfig.cancellationToken
      );
      timeoutCleanup = cleanup;
      
      agentResult = await Promise.race([
        executeAgent(subAgent.task, agentConfig),
        timeoutPromise,
      ]);
      
      // Clean up timeout after successful execution
      cleanup();
    } else {
      agentResult = await executeAgent(subAgent.task, agentConfig);
    }
    
    // Track token usage from steps
    if (executorConfig.collectMetrics) {
      metrics.totalTokens = agentResult.steps.reduce(
        (sum, step) => sum + (step.usage?.totalTokens ?? 0),
        0
      );
    }

    // Convert result
    const result = convertToSubAgentResult(agentResult);
    result.duration = Date.now() - startTime;

    // Apply context isolation: summarize results if configured (Claude Best Practice)
    if (result.success && subAgent.config.summarizeResults) {
      try {
        const summarizedResponse = await summarizeSubAgentResult(
          result,
          subAgent.config,
          executorConfig
        );
        result.finalResponse = summarizedResponse;
        addLog(subAgent, 'debug', 'Result summarized for context isolation');
      } catch (summarizeError) {
        addLog(subAgent, 'warn', `Result summarization failed: ${summarizeError}`);
        // Continue with original response if summarization fails
      }
    }

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
    // Clean up timeout on error
    if (timeoutCleanup) {
      timeoutCleanup();
    }
    
    const errorMessage = error instanceof Error ? error.message : 'Sub-agent execution failed';
    const duration = Date.now() - startTime;
    
    // Check if this was a cancellation
    if (errorMessage === 'Operation cancelled' || executorConfig.cancellationToken?.isCancelled) {
      return createCancelledResult(subAgent, startTime);
    }

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

    // Check condition using safe evaluation
    if (subAgent.config.condition) {
      const context: SubAgentContext = {
        parentAgentId: subAgent.parentAgentId,
        sessionId: '',
        siblingResults: results,
        startTime: new Date(),
        currentStep: 0,
      };

      const shouldExecute = evaluateCondition(subAgent.config.condition, context);

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

/**
 * Create a cancelled result for a sub-agent
 */
function createCancelledResult(subAgent: SubAgent, startTime: number): SubAgentResult {
  const duration = Date.now() - startTime;
  
  subAgent.status = 'cancelled';
  subAgent.completedAt = new Date();
  subAgent.error = 'Operation cancelled';
  
  addLog(subAgent, 'info', 'Sub-agent cancelled');
  
  return {
    success: false,
    finalResponse: '',
    steps: [],
    totalSteps: 0,
    duration,
    error: 'Operation cancelled',
  };
}

/**
 * Create a cancellation token for sub-agent execution
 */
export { createCancellationToken };

/**
 * Aggregate token usage from multiple results
 */
export function aggregateTokenUsage(
  results: Record<string, SubAgentResult>
): SubAgentTokenUsage | undefined {
  const usages = Object.values(results)
    .map(r => r.tokenUsage)
    .filter((t): t is SubAgentTokenUsage => t !== undefined);

  if (usages.length === 0) return undefined;

  return usages.reduce(
    (acc, t) => ({
      promptTokens: acc.promptTokens + t.promptTokens,
      completionTokens: acc.completionTokens + t.completionTokens,
      totalTokens: acc.totalTokens + t.totalTokens,
    }),
    { promptTokens: 0, completionTokens: 0, totalTokens: 0 }
  );
}
