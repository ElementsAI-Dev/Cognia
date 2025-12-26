/**
 * SubAgent Type Definitions
 * Defines types for sub-agents that can be spawned by parent agents
 */

import type { AgentTool, ToolCall } from '@/lib/ai/agent';
import type { ProviderName } from './provider';

/**
 * SubAgent execution status
 */
export type SubAgentStatus =
  | 'pending'      // Waiting to be started
  | 'queued'       // In execution queue
  | 'running'      // Currently executing
  | 'waiting'      // Waiting for dependency or approval
  | 'completed'    // Successfully completed
  | 'failed'       // Execution failed
  | 'cancelled'    // Cancelled by user or parent
  | 'timeout';     // Execution timed out

/**
 * SubAgent priority levels
 */
export type SubAgentPriority = 'critical' | 'high' | 'normal' | 'low' | 'background';

/**
 * SubAgent execution mode
 */
export type SubAgentExecutionMode = 
  | 'sequential'   // Execute one after another
  | 'parallel'     // Execute simultaneously
  | 'conditional'; // Execute based on conditions

/**
 * SubAgent configuration
 */
export interface SubAgentConfig {
  /** Custom system prompt for the sub-agent */
  systemPrompt?: string;
  /** Available tools for this sub-agent */
  tools?: string[];
  /** Custom tool definitions */
  customTools?: Record<string, AgentTool>;
  /** Maximum execution steps */
  maxSteps?: number;
  /** Execution timeout in milliseconds */
  timeout?: number;
  /** Execution priority */
  priority?: SubAgentPriority;
  /** Whether to inherit parent agent's context */
  inheritParentContext?: boolean;
  /** Whether to share results with sibling sub-agents */
  shareResults?: boolean;
  /** Provider override */
  provider?: ProviderName;
  /** Model override */
  model?: string;
  /** Temperature override */
  temperature?: number;
  /** Retry configuration */
  retryConfig?: {
    maxRetries: number;
    retryDelay: number;
    exponentialBackoff: boolean;
  };
  /** Dependencies - IDs of sub-agents that must complete first */
  dependencies?: string[];
  /** Condition for conditional execution */
  condition?: string | ((context: SubAgentContext) => boolean);
}

/**
 * SubAgent execution context
 */
export interface SubAgentContext {
  /** Parent agent ID */
  parentAgentId: string;
  /** Session ID */
  sessionId: string;
  /** Shared context from parent */
  parentContext?: Record<string, unknown>;
  /** Results from sibling sub-agents */
  siblingResults?: Record<string, SubAgentResult>;
  /** Global variables */
  variables?: Record<string, unknown>;
  /** Execution start time */
  startTime: Date;
  /** Current step number */
  currentStep: number;
}

/**
 * SubAgent execution step
 */
export interface SubAgentStep {
  stepNumber: number;
  response: string;
  toolCalls: ToolCall[];
  timestamp: Date;
  duration?: number;
  tokenUsage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/**
 * SubAgent execution result
 */
export interface SubAgentResult {
  /** Whether execution was successful */
  success: boolean;
  /** Final response text */
  finalResponse: string;
  /** Execution steps */
  steps: SubAgentStep[];
  /** Total steps executed */
  totalSteps: number;
  /** Execution duration in milliseconds */
  duration: number;
  /** Tool call results */
  toolResults?: Array<{
    toolCallId: string;
    toolName: string;
    result: unknown;
  }>;
  /** Structured output data */
  output?: Record<string, unknown>;
  /** Error message if failed */
  error?: string;
  /** Token usage statistics */
  tokenUsage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/**
 * SubAgent log entry
 */
export interface SubAgentLog {
  timestamp: Date;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  data?: unknown;
  stepNumber?: number;
}

/**
 * SubAgent definition
 */
export interface SubAgent {
  /** Unique identifier */
  id: string;
  /** Parent agent ID */
  parentAgentId: string;
  /** Human-readable name */
  name: string;
  /** Description of the sub-agent's purpose */
  description: string;
  /** Task to execute */
  task: string;
  /** Current status */
  status: SubAgentStatus;
  /** Configuration */
  config: SubAgentConfig;
  /** Execution context */
  context?: SubAgentContext;
  /** Execution result */
  result?: SubAgentResult;
  /** Execution logs */
  logs: SubAgentLog[];
  /** Progress percentage (0-100) */
  progress: number;
  /** Creation timestamp */
  createdAt: Date;
  /** Start timestamp */
  startedAt?: Date;
  /** Completion timestamp */
  completedAt?: Date;
  /** Error message if failed */
  error?: string;
  /** Retry count */
  retryCount: number;
  /** Order in execution sequence */
  order: number;
  /** Tags for categorization */
  tags?: string[];
}

/**
 * SubAgent group for organizing related sub-agents
 */
export interface SubAgentGroup {
  id: string;
  name: string;
  description?: string;
  executionMode: SubAgentExecutionMode;
  subAgentIds: string[];
  maxConcurrency?: number;
  status: SubAgentStatus;
  progress: number;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

/**
 * Input for creating a new sub-agent
 */
export interface CreateSubAgentInput {
  parentAgentId: string;
  name: string;
  description?: string;
  task: string;
  config?: Partial<SubAgentConfig>;
  order?: number;
  tags?: string[];
}

/**
 * Input for updating a sub-agent
 */
export interface UpdateSubAgentInput {
  name?: string;
  description?: string;
  task?: string;
  config?: Partial<SubAgentConfig>;
  status?: SubAgentStatus;
  tags?: string[];
}

/**
 * SubAgent execution options
 */
export interface SubAgentExecutionOptions {
  /** Callback when sub-agent starts */
  onStart?: (subAgent: SubAgent) => void;
  /** Callback for each step */
  onStep?: (subAgent: SubAgent, step: SubAgentStep) => void;
  /** Callback when sub-agent completes */
  onComplete?: (subAgent: SubAgent, result: SubAgentResult) => void;
  /** Callback when sub-agent fails */
  onError?: (subAgent: SubAgent, error: string) => void;
  /** Callback for progress updates */
  onProgress?: (subAgent: SubAgent, progress: number) => void;
  /** Callback for log entries */
  onLog?: (subAgent: SubAgent, log: SubAgentLog) => void;
  /** Callback for tool calls */
  onToolCall?: (subAgent: SubAgent, toolCall: ToolCall) => void;
  /** Callback for tool results */
  onToolResult?: (subAgent: SubAgent, toolCall: ToolCall) => void;
}

/**
 * SubAgent orchestration result
 */
export interface SubAgentOrchestrationResult {
  /** Whether all sub-agents completed successfully */
  success: boolean;
  /** Results from all sub-agents */
  results: Record<string, SubAgentResult>;
  /** Aggregated final response */
  aggregatedResponse?: string;
  /** Total execution duration */
  totalDuration: number;
  /** Total token usage */
  totalTokenUsage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  /** Errors from failed sub-agents */
  errors?: Record<string, string>;
}

/**
 * Default sub-agent configuration
 */
export const DEFAULT_SUB_AGENT_CONFIG: SubAgentConfig = {
  maxSteps: 10,
  timeout: 300000, // 5 minutes
  priority: 'normal',
  inheritParentContext: true,
  shareResults: true,
  retryConfig: {
    maxRetries: 2,
    retryDelay: 1000,
    exponentialBackoff: true,
  },
};

/**
 * SubAgent status display configuration
 */
export const SUB_AGENT_STATUS_CONFIG: Record<SubAgentStatus, {
  label: string;
  color: string;
  icon: string;
}> = {
  pending: { label: 'Pending', color: 'text-muted-foreground', icon: 'Circle' },
  queued: { label: 'Queued', color: 'text-blue-500', icon: 'Clock' },
  running: { label: 'Running', color: 'text-primary', icon: 'Loader2' },
  waiting: { label: 'Waiting', color: 'text-yellow-500', icon: 'Pause' },
  completed: { label: 'Completed', color: 'text-green-500', icon: 'CheckCircle' },
  failed: { label: 'Failed', color: 'text-destructive', icon: 'XCircle' },
  cancelled: { label: 'Cancelled', color: 'text-orange-500', icon: 'Ban' },
  timeout: { label: 'Timeout', color: 'text-red-500', icon: 'AlertTriangle' },
};

/**
 * SubAgent priority display configuration
 */
export const SUB_AGENT_PRIORITY_CONFIG: Record<SubAgentPriority, {
  label: string;
  color: string;
  weight: number;
}> = {
  critical: { label: 'Critical', color: 'text-red-500', weight: 5 },
  high: { label: 'High', color: 'text-orange-500', weight: 4 },
  normal: { label: 'Normal', color: 'text-blue-500', weight: 3 },
  low: { label: 'Low', color: 'text-muted-foreground', weight: 2 },
  background: { label: 'Background', color: 'text-gray-400', weight: 1 },
};
