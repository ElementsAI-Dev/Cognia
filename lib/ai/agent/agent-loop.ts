/**
 * Agent Loop - Higher-level agent orchestration with planning
 * 
 * Features:
 * - Task planning and breakdown
 * - Multi-step execution
 * - Cancellation support
 * - Progress tracking
 * - Dynamic model selection via auto-router integration
 */

import { executeAgent, type AgentTool } from './agent-executor';
import type { ProviderName } from '../core/client';
import { 
  classifyTaskRuleBased, 
  classifyTaskHybrid,
  routerHealthManager,
  type RouterModelConfig,
} from '../generation/auto-router';
import type { ModelTier, TaskClassification } from '@/types/provider/auto-router';

export interface AgentTask {
  id: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  result?: string;
  error?: string;
}

/**
 * Cancellation token for agent loop
 */
export interface AgentLoopCancellationToken {
  isCancelled: boolean;
  cancel: () => void;
  onCancel?: () => void;
}

/**
 * Create a cancellation token for agent loop
 */
export function createAgentLoopCancellationToken(): AgentLoopCancellationToken {
  const token: AgentLoopCancellationToken = {
    isCancelled: false,
    cancel: () => {
      token.isCancelled = true;
      token.onCancel?.();
    },
  };
  return token;
}

// Model tier configuration for dynamic routing
export interface TierModelConfig {
  provider: ProviderName;
  model: string;
  apiKey: string;
  baseURL?: string;
}

// Dynamic routing configuration
export interface DynamicRoutingConfig {
  enabled: boolean;
  /** Model configurations for each tier */
  tierModels?: {
    fast?: TierModelConfig;
    balanced?: TierModelConfig;
    powerful?: TierModelConfig;
    reasoning?: TierModelConfig;
  };
  /** Router model for LLM-based classification */
  routerModel?: RouterModelConfig;
  /** Use simple tasks with fast models, complex tasks with powerful models */
  adaptiveModelSelection?: boolean;
  /** Confidence threshold for rule-based routing (0-1) */
  confidenceThreshold?: number;
}

export interface AgentLoopConfig {
  provider: ProviderName;
  model: string;
  apiKey: string;
  baseURL?: string;
  tools?: Record<string, AgentTool>;
  maxStepsPerTask?: number;
  maxTotalSteps?: number;
  planningEnabled?: boolean;
  /** Cancellation token to stop the loop */
  cancellationToken?: AgentLoopCancellationToken;
  onTaskStart?: (task: AgentTask) => void;
  onTaskComplete?: (task: AgentTask) => void;
  onProgress?: (progress: { completed: number; total: number; currentTask?: string }) => void;
  /** Called when the loop is cancelled */
  onCancel?: (tasks: AgentTask[]) => void;
  /** Dynamic routing configuration for adaptive model selection */
  dynamicRouting?: DynamicRoutingConfig;
  /** Called when model is dynamically selected */
  onModelSelected?: (selection: { tier: ModelTier; provider: ProviderName; model: string; reason: string }) => void;
}

export interface AgentLoopResult {
  success: boolean;
  tasks: AgentTask[];
  totalSteps: number;
  duration: number;
  finalSummary?: string;
  error?: string;
  /** Whether the loop was cancelled */
  cancelled?: boolean;
}

/**
 * Planning prompt to break down complex tasks
 */
const PLANNING_PROMPT = `You are a task planning assistant. Break down the following task into smaller, actionable subtasks.
Each subtask should be:
1. Specific and actionable
2. Independent when possible
3. Ordered logically

Return a numbered list of subtasks, one per line.

Task: `;

/**
 * Summary prompt to consolidate results
 */
const SUMMARY_PROMPT = `Summarize the following task results into a coherent response:

`;

/**
 * Parse planning response into tasks
 */
function parsePlanningResponse(response: string): string[] {
  const lines = response.split('\n');
  const tasks: string[] = [];

  for (const line of lines) {
    // Match numbered items like "1.", "1)", "1:"
    const match = line.match(/^\s*\d+[.):\s]+(.+)/);
    if (match) {
      tasks.push(match[1].trim());
    } else if (line.trim() && !line.startsWith('#')) {
      // Also include non-numbered non-empty lines that aren't headers
      const trimmed = line.trim();
      if (trimmed.length > 10) {
        tasks.push(trimmed);
      }
    }
  }

  return tasks;
}

/**
 * Select optimal model for a task based on classification
 * Uses dynamic routing to choose between fast/balanced/powerful/reasoning models
 */
async function selectModelForTask(
  taskDescription: string,
  config: AgentLoopConfig
): Promise<{ provider: ProviderName; model: string; apiKey: string; baseURL?: string; tier: ModelTier; classification: TaskClassification }> {
  const { provider, model, apiKey, baseURL, dynamicRouting } = config;
  
  // Default: use the provided model
  const defaultResult = {
    provider,
    model,
    apiKey,
    baseURL,
    tier: 'balanced' as ModelTier,
    classification: classifyTaskRuleBased(taskDescription),
  };
  
  // If dynamic routing is not enabled, return default
  if (!dynamicRouting?.enabled || !dynamicRouting.adaptiveModelSelection) {
    return defaultResult;
  }
  
  // Classify the task
  let classification: TaskClassification;
  let recommendedTier: ModelTier;
  
  if (dynamicRouting.routerModel && apiKey) {
    // Use hybrid classification (rule + LLM)
    const result = await classifyTaskHybrid(
      taskDescription,
      dynamicRouting.routerModel,
      apiKey,
      baseURL,
      dynamicRouting.confidenceThreshold || 0.75
    );
    classification = result.classification;
    recommendedTier = result.recommendedTier;
  } else {
    // Use rule-based classification only
    classification = classifyTaskRuleBased(taskDescription);
    recommendedTier = classification.complexity === 'simple' ? 'fast' :
                      classification.complexity === 'complex' ? 
                        (classification.requiresReasoning ? 'reasoning' : 'powerful') : 
                      'balanced';
  }
  
  // Get the model config for the recommended tier
  const tierModels = dynamicRouting.tierModels;
  if (!tierModels) {
    return { ...defaultResult, tier: recommendedTier, classification };
  }
  
  const tierConfig = tierModels[recommendedTier];
  if (!tierConfig) {
    // Fallback to default model
    return { ...defaultResult, tier: recommendedTier, classification };
  }
  
  // Check router health for the selected tier
  if (!routerHealthManager.isHealthy(tierConfig.provider, tierConfig.model)) {
    // Fall back to balanced tier if available, otherwise use default
    const balancedConfig = tierModels.balanced;
    if (balancedConfig && routerHealthManager.isHealthy(balancedConfig.provider, balancedConfig.model)) {
      return {
        provider: balancedConfig.provider,
        model: balancedConfig.model,
        apiKey: balancedConfig.apiKey,
        baseURL: balancedConfig.baseURL,
        tier: 'balanced',
        classification,
      };
    }
    return { ...defaultResult, tier: recommendedTier, classification };
  }
  
  return {
    provider: tierConfig.provider,
    model: tierConfig.model,
    apiKey: tierConfig.apiKey,
    baseURL: tierConfig.baseURL,
    tier: recommendedTier,
    classification,
  };
}

/**
 * Execute a complex task with optional planning and multi-step execution
 */
export async function executeAgentLoop(
  task: string,
  config: AgentLoopConfig
): Promise<AgentLoopResult> {
  const {
    provider,
    model,
    apiKey,
    baseURL,
    tools = {},
    maxStepsPerTask = 5,
    maxTotalSteps = 20,
    planningEnabled = true,
    cancellationToken,
    onTaskStart,
    onTaskComplete,
    onProgress,
    onCancel,
  } = config;

  const startTime = Date.now();
  const tasks: AgentTask[] = [];
  let totalSteps = 0;

  // Helper to check cancellation
  const checkCancellation = (): boolean => {
    return cancellationToken?.isCancelled ?? false;
  };

  // Helper to handle cancellation
  const handleCancellation = (): AgentLoopResult => {
    // Mark remaining pending tasks as cancelled
    tasks.forEach((t) => {
      if (t.status === 'pending' || t.status === 'running') {
        t.status = 'cancelled';
      }
    });
    onCancel?.(tasks);
    return {
      success: false,
      tasks,
      totalSteps,
      duration: Date.now() - startTime,
      error: 'Agent loop cancelled',
      cancelled: true,
    };
  };

  try {
    // Check cancellation before starting
    if (checkCancellation()) {
      return handleCancellation();
    }

    // Step 1: Planning (if enabled)
    let subtasks: string[] = [task];

    if (planningEnabled) {
      const planningResult = await executeAgent(PLANNING_PROMPT + task, {
        provider,
        model,
        apiKey,
        baseURL,
        temperature: 0.3,
        maxSteps: 1,
      });

      // Check cancellation after planning
      if (checkCancellation()) {
        return handleCancellation();
      }

      if (planningResult.success && planningResult.finalResponse) {
        const parsed = parsePlanningResponse(planningResult.finalResponse);
        if (parsed.length > 0) {
          subtasks = parsed;
        }
      }
      totalSteps += planningResult.totalSteps;
    }

    // Initialize tasks
    for (let i = 0; i < subtasks.length; i++) {
      tasks.push({
        id: `task-${i + 1}`,
        description: subtasks[i],
        status: 'pending',
      });
    }

    // Step 2: Execute each subtask
    const results: string[] = [];

    for (let i = 0; i < tasks.length; i++) {
      // Check cancellation before each task
      if (checkCancellation()) {
        return handleCancellation();
      }

      const currentTask = tasks[i];

      // Check if we've exceeded max total steps
      if (totalSteps >= maxTotalSteps) {
        currentTask.status = 'failed';
        currentTask.error = 'Maximum total steps exceeded';
        continue;
      }

      currentTask.status = 'running';
      onTaskStart?.(currentTask);
      onProgress?.({
        completed: i,
        total: tasks.length,
        currentTask: currentTask.description,
      });

      // Dynamic model selection based on task complexity
      const modelSelection = await selectModelForTask(currentTask.description, config);
      
      // Notify about model selection
      config.onModelSelected?.({
        tier: modelSelection.tier,
        provider: modelSelection.provider,
        model: modelSelection.model,
        reason: `Task complexity: ${modelSelection.classification.complexity}, Category: ${modelSelection.classification.category}`,
      });

      const taskResult = await executeAgent(currentTask.description, {
        provider: modelSelection.provider,
        model: modelSelection.model,
        apiKey: modelSelection.apiKey,
        baseURL: modelSelection.baseURL,
        tools,
        maxSteps: maxStepsPerTask,
      });

      // Check cancellation after task execution
      if (checkCancellation()) {
        currentTask.status = 'cancelled';
        return handleCancellation();
      }

      totalSteps += taskResult.totalSteps;

      if (taskResult.success) {
        currentTask.status = 'completed';
        currentTask.result = taskResult.finalResponse;
        results.push(`Task ${i + 1}: ${currentTask.description}\nResult: ${taskResult.finalResponse}`);
      } else {
        currentTask.status = 'failed';
        currentTask.error = taskResult.error;
      }

      onTaskComplete?.(currentTask);
    }

    // Step 3: Summarize results
    let finalSummary: string | undefined;

    if (results.length > 1) {
      const summaryResult = await executeAgent(
        SUMMARY_PROMPT + results.join('\n\n'),
        {
          provider,
          model,
          apiKey,
          baseURL,
          temperature: 0.3,
          maxSteps: 1,
        }
      );

      if (summaryResult.success) {
        finalSummary = summaryResult.finalResponse;
      }
      totalSteps += summaryResult.totalSteps;
    } else if (results.length === 1) {
      finalSummary = tasks[0].result;
    }

    onProgress?.({
      completed: tasks.length,
      total: tasks.length,
    });

    const allSucceeded = tasks.every((t) => t.status === 'completed');

    return {
      success: allSucceeded,
      tasks,
      totalSteps,
      duration: Date.now() - startTime,
      finalSummary,
      error: allSucceeded ? undefined : 'Some tasks failed',
    };
  } catch (error) {
    return {
      success: false,
      tasks,
      totalSteps,
      duration: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Agent loop failed',
    };
  }
}

/**
 * Create a reusable agent loop instance with cancellation support
 */
export function createAgentLoop(baseConfig: Omit<AgentLoopConfig, 'provider' | 'model' | 'apiKey'>) {
  let currentCancellationToken: AgentLoopCancellationToken | null = null;

  return {
    /**
     * Execute the agent loop with the given task
     */
    execute: async (
      task: string,
      providerConfig: { provider: ProviderName; model: string; apiKey: string; baseURL?: string }
    ) => {
      // Create new cancellation token for this execution
      currentCancellationToken = createAgentLoopCancellationToken();

      return executeAgentLoop(task, {
        ...baseConfig,
        ...providerConfig,
        cancellationToken: currentCancellationToken,
      });
    },

    /**
     * Cancel the currently running agent loop
     */
    cancel: () => {
      if (currentCancellationToken) {
        currentCancellationToken.cancel();
      }
    },

    /**
     * Check if there's an active cancellation token
     */
    isRunning: () => {
      return currentCancellationToken !== null && !currentCancellationToken.isCancelled;
    },

    /**
     * Add a tool to the agent loop
     */
    addTool: (name: string, tool: AgentTool) => {
      baseConfig.tools = baseConfig.tools || {};
      baseConfig.tools[name] = tool;
    },

    /**
     * Remove a tool from the agent loop
     */
    removeTool: (name: string) => {
      if (baseConfig.tools) {
        delete baseConfig.tools[name];
      }
    },
  };
}
