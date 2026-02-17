/**
 * Workflow orchestrator.
 * Single execution entrypoint for workflow editor actions.
 */

import { workflowRepository } from '@/lib/db/repositories';
import type { ExecutionLog, WorkflowExecutionHistoryRecord, VisualWorkflow } from '@/types/workflow/workflow-editor';

import {
  getWorkflowRuntimeAdapter,
  type WorkflowExecutionEvent,
  type WorkflowRuntimeAdapter,
  type WorkflowRuntimeExecutionResult,
} from './runtime-adapter';
import { visualToDefinition } from './converter';

export interface WorkflowRunParams {
  workflow: VisualWorkflow;
  input?: Record<string, unknown>;
  triggerId?: string;
  isReplay?: boolean;
  onEvent?: (event: WorkflowExecutionEvent) => void;
}

export interface WorkflowPersistParams {
  result: WorkflowRuntimeExecutionResult;
  logs?: ExecutionLog[];
}

export class WorkflowOrchestrator {
  private readonly runtimeAdapter: WorkflowRuntimeAdapter;
  private readonly activeExecutions = new Map<string, WorkflowRuntimeExecutionResult>();

  constructor(runtimeAdapter: WorkflowRuntimeAdapter = getWorkflowRuntimeAdapter()) {
    this.runtimeAdapter = runtimeAdapter;
  }

  get runtime(): WorkflowRuntimeAdapter['runtime'] {
    return this.runtimeAdapter.runtime;
  }

  async run(params: WorkflowRunParams): Promise<WorkflowRuntimeExecutionResult> {
    const input = params.input || {};

    const result = await this.runtimeAdapter.execute({
      workflow: params.workflow,
      definition: visualToDefinition(params.workflow),
      input,
      triggerId: params.triggerId,
      isReplay: params.isReplay,
      onEvent: params.onEvent,
    });

    if (result.status === 'running' || result.status === 'paused' || result.status === 'pending') {
      this.activeExecutions.set(result.executionId, result);
    } else {
      this.activeExecutions.delete(result.executionId);
    }

    return result;
  }

  async pause(executionId: string): Promise<void> {
    await this.runtimeAdapter.pause(executionId);
    const current = this.activeExecutions.get(executionId);
    if (current) {
      this.activeExecutions.set(executionId, {
        ...current,
        status: 'paused',
      });
    }
  }

  async resume(executionId: string): Promise<void> {
    await this.runtimeAdapter.resume(executionId);
    const current = this.activeExecutions.get(executionId);
    if (current) {
      this.activeExecutions.set(executionId, {
        ...current,
        status: 'running',
      });
    }
  }

  async cancel(executionId: string): Promise<void> {
    await this.runtimeAdapter.cancel(executionId);

    const current = this.activeExecutions.get(executionId);
    if (current) {
      this.activeExecutions.set(executionId, {
        ...current,
        status: 'cancelled',
        completedAt: new Date(),
      });
    }
  }

  async replay(params: WorkflowRunParams): Promise<WorkflowRuntimeExecutionResult> {
    return this.run({
      ...params,
      isReplay: true,
    });
  }

  async getExecution(executionId: string): Promise<WorkflowRuntimeExecutionResult | null> {
    const active = this.activeExecutions.get(executionId);
    if (active) {
      return active;
    }

    return this.runtimeAdapter.getExecution(executionId);
  }

  async listExecutions(workflowId?: string, limit?: number): Promise<WorkflowRuntimeExecutionResult[]> {
    return this.runtimeAdapter.listExecutions(workflowId, limit);
  }

  async persistExecution({ result, logs }: WorkflowPersistParams): Promise<void> {
    const record: WorkflowExecutionHistoryRecord = {
      id: result.executionId,
      workflowId: result.workflowId,
      status: result.status,
      input: result.input,
      output: result.output,
      nodeStates: result.nodeStates,
      logs,
      error: result.error,
      startedAt: result.startedAt || new Date(),
      completedAt: result.completedAt,
    };

    const existing = await workflowRepository.getExecution(record.id);
    if (!existing) {
      await workflowRepository.createExecution(record.workflowId, record.input || {}, {
        executionId: record.id,
        status: record.status,
        startedAt: record.startedAt,
      });
    }

    await workflowRepository.updateExecution(record.id, {
      status: record.status,
      output: record.output,
      nodeStates: record.nodeStates,
      logs: record.logs,
      error: record.error,
      completedAt: record.completedAt,
    });
  }

  clearActive(executionId: string): void {
    this.activeExecutions.delete(executionId);
  }

  clearAllActive(): void {
    this.activeExecutions.clear();
  }
}

let orchestratorSingleton: WorkflowOrchestrator | null = null;

export function getWorkflowOrchestrator(): WorkflowOrchestrator {
  if (!orchestratorSingleton) {
    orchestratorSingleton = new WorkflowOrchestrator();
  }
  return orchestratorSingleton;
}

export function setWorkflowOrchestrator(orchestrator: WorkflowOrchestrator): void {
  orchestratorSingleton = orchestrator;
}

export const workflowOrchestrator = getWorkflowOrchestrator();

export default workflowOrchestrator;
