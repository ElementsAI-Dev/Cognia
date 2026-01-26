/**
 * Step Executor Types
 * Shared types for all step executors
 */

import type {
  WorkflowExecution,
  WorkflowStepDefinition,
  WorkflowLog,
} from '@/types/workflow';
import type { ProviderName } from '@/lib/ai/core/client';

export type {
  WorkflowExecution,
  WorkflowStepDefinition,
  WorkflowLog,
};

export interface StepExecutorConfig {
  provider: ProviderName;
  model: string;
  apiKey: string;
  baseURL?: string;
  temperature?: number;
  maxRetries?: number;
  stepTimeout?: number;
}

export interface StepExecutorCallbacks {
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

export type StepExecutorResult = unknown;

export interface StepExecutorContext {
  config: StepExecutorConfig;
  callbacks: StepExecutorCallbacks;
  execution: WorkflowExecution;
}
