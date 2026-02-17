/**
 * Workflow runtime adapter abstraction.
 * Browser adapter uses existing JS workflow executor.
 * Tauri adapter forwards execution to Rust workflow runtime commands.
 */

import {
  executeVisualWorkflow,
  pauseVisualWorkflow,
  resumeVisualWorkflow,
  cancelVisualWorkflow,
} from '@/lib/workflow-editor/executor-integration';
import {
  onWorkflowRuntimeEvent,
  workflowRunDefinition,
  workflowCancelExecution,
  workflowPauseExecution,
  workflowResumeExecution,
  workflowGetExecution,
  workflowListExecutions,
  type WorkflowRuntimeExecutionRecord,
  type WorkflowRuntimeLogLevel,
  type WorkflowRuntimeNativeEvent,
  type WorkflowRuntimeStepState,
} from '@/lib/native/workflow-runtime';
import { isTauri } from '@/lib/utils';
import { useSettingsStore } from '@/stores/settings';
import { loggers } from '@/lib/logger';
import type { WorkflowDefinition } from '@/types/workflow';
import type { ProviderName } from '@/types/provider';
import type {
  EditorExecutionStatus,
  NodeExecutionStatus,
  NodeExecutionState,
  VisualWorkflow,
} from '@/types/workflow/workflow-editor';

const log = loggers.app;

export type WorkflowRuntimeSource = 'browser' | 'tauri';

export type WorkflowExecutionEventType =
  | 'execution_started'
  | 'execution_progress'
  | 'step_started'
  | 'step_completed'
  | 'step_failed'
  | 'execution_log'
  | 'execution_completed'
  | 'execution_failed'
  | 'execution_cancelled';

export interface WorkflowExecutionEvent {
  type: WorkflowExecutionEventType;
  eventId?: string;
  level?: WorkflowRuntimeLogLevel;
  code?: string;
  requestId?: string;
  traceId?: string;
  executionId: string;
  workflowId: string;
  runtime: WorkflowRuntimeSource;
  timestamp: Date;
  progress?: number;
  stepId?: string;
  message?: string;
  error?: string;
  data?: Record<string, unknown>;
}

export interface WorkflowRuntimeExecuteRequest {
  workflow: VisualWorkflow;
  definition: WorkflowDefinition;
  input: Record<string, unknown>;
  triggerId?: string;
  isReplay?: boolean;
  runtimeConfig?: {
    provider?: string;
    model?: string;
    timeoutMs?: number;
    retry?: number;
    toolBridge?: 'native' | 'ipc' | 'auto';
    [key: string]: unknown;
  };
  signal?: AbortSignal;
  onEvent?: (event: WorkflowExecutionEvent) => void;
}

export interface WorkflowRuntimeExecutionResult {
  executionId: string;
  workflowId: string;
  runtime: WorkflowRuntimeSource;
  status: EditorExecutionStatus;
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
  nodeStates: Record<string, NodeExecutionState>;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
  triggerId?: string;
  isReplay?: boolean;
  logs?: WorkflowRuntimeExecutionRecord['logs'];
}

export interface WorkflowRuntimeAdapter {
  readonly runtime: WorkflowRuntimeSource;
  execute(request: WorkflowRuntimeExecuteRequest): Promise<WorkflowRuntimeExecutionResult>;
  pause(executionId: string): Promise<void>;
  resume(executionId: string): Promise<void>;
  cancel(executionId: string): Promise<void>;
  getExecution(executionId: string): Promise<WorkflowRuntimeExecutionResult | null>;
  listExecutions(workflowId?: string, limit?: number): Promise<WorkflowRuntimeExecutionResult[]>;
}

function emitEvent(
  runtime: WorkflowRuntimeSource,
  workflowId: string,
  executionId: string,
  onEvent: WorkflowRuntimeExecuteRequest['onEvent'],
  payload: Omit<WorkflowExecutionEvent, 'runtime' | 'workflowId' | 'executionId' | 'timestamp'> & {
    timestamp?: Date;
  }
): void {
  onEvent?.({
    ...payload,
    runtime,
    workflowId,
    executionId,
    timestamp: payload.timestamp || new Date(),
  });
}

function createInitialNodeStates(workflow: VisualWorkflow): Record<string, NodeExecutionState> {
  const states: Record<string, NodeExecutionState> = {};
  workflow.nodes.forEach((node) => {
    states[node.id] = {
      nodeId: node.id,
      status: 'pending',
      logs: [],
      retryCount: 0,
    };
  });
  return states;
}

function toEditorStatus(status: string): EditorExecutionStatus {
  if (status === 'executing') {
    return 'running';
  }

  if (
    status === 'pending' ||
    status === 'running' ||
    status === 'paused' ||
    status === 'completed' ||
    status === 'failed' ||
    status === 'cancelled' ||
    status === 'idle'
  ) {
    return status;
  }

  return 'failed';
}

function toNodeStatus(status: string): NodeExecutionStatus {
  switch (status) {
    case 'idle':
    case 'pending':
    case 'running':
    case 'completed':
    case 'failed':
    case 'skipped':
    case 'waiting':
      return status;
    case 'waiting_approval':
      return 'waiting';
    default:
      return 'failed';
  }
}

function normalizeEventData(data: unknown): Record<string, unknown> | undefined {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return undefined;
  }
  return data as Record<string, unknown>;
}

function createRequestId(): string {
  return `wf-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function isTauriSupportedDefinition(definition: WorkflowDefinition): boolean {
  const fallbackStepTypes = new Set(['ai', 'human', 'subworkflow']);
  return !definition.steps.some((step) => fallbackStepTypes.has(String(step.type || '')));
}

function isTerminalStatus(status: EditorExecutionStatus): boolean {
  return status === 'completed' || status === 'failed' || status === 'cancelled';
}

function toNodeStateFromStep(step: WorkflowRuntimeStepState): NodeExecutionState {
  return {
    nodeId: step.stepId,
    status: toNodeStatus(step.status),
    input: step.input,
    output: step.output,
    error: step.error,
    startedAt: step.startedAt ? new Date(step.startedAt) : undefined,
    completedAt: step.completedAt ? new Date(step.completedAt) : undefined,
    logs: [],
    retryCount: step.retryCount || 0,
  };
}

export class BrowserRuntimeAdapter implements WorkflowRuntimeAdapter {
  readonly runtime: WorkflowRuntimeSource = 'browser';

  async execute(request: WorkflowRuntimeExecuteRequest): Promise<WorkflowRuntimeExecutionResult> {
    const { workflow, input, onEvent, triggerId, isReplay } = request;
    const nodeStates = createInitialNodeStates(workflow);
    let executionId = `exec-browser-${workflow.id}-${Date.now()}`;
    const requestId = createRequestId();
    const startedAt = new Date();

    emitEvent(this.runtime, workflow.id, executionId, onEvent, {
      type: 'execution_started',
      requestId,
      level: 'info',
      code: 'workflow.execution.started',
      progress: 0,
    });

    const settings = useSettingsStore.getState();
    const provider = settings.defaultProvider as ProviderName;
    const providerSettings = settings.providerSettings[provider];

    if (!providerSettings) {
      throw new Error('No provider configured for workflow execution');
    }

    const result = await executeVisualWorkflow(
      workflow,
      input,
      {
        provider,
        model: providerSettings.defaultModel || 'gpt-4o',
        apiKey: providerSettings.apiKey || '',
        baseURL: providerSettings.baseURL,
        temperature: 0.7,
        maxRetries: workflow.settings.maxRetries || 3,
        stepTimeout: workflow.settings.maxExecutionTime || 300000,
      },
      {
        onStart: (execution) => {
          executionId = execution.id;
        },
        onProgress: (_execution, progress) => {
          emitEvent(this.runtime, workflow.id, executionId, onEvent, {
            type: 'execution_progress',
            progress: Math.round(progress * 100),
          });
        },
        onStepStart: (_execution, stepId) => {
          const current = nodeStates[stepId];
          if (current) {
            nodeStates[stepId] = {
              ...current,
              status: 'running',
              startedAt: new Date(),
            };
          }
          emitEvent(this.runtime, workflow.id, executionId, onEvent, {
            type: 'step_started',
            stepId,
          });
        },
        onStepComplete: (_execution, stepId, output) => {
          const current = nodeStates[stepId];
          if (current) {
            nodeStates[stepId] = {
              ...current,
              status: 'completed',
              output: (output || {}) as Record<string, unknown>,
              completedAt: new Date(),
            };
          }
          emitEvent(this.runtime, workflow.id, executionId, onEvent, {
            type: 'step_completed',
            stepId,
            data: (output || {}) as Record<string, unknown>,
          });
        },
        onStepError: (_execution, stepId, error) => {
          const current = nodeStates[stepId];
          if (current) {
            nodeStates[stepId] = {
              ...current,
              status: 'failed',
              error,
              completedAt: new Date(),
            };
          }
          emitEvent(this.runtime, workflow.id, executionId, onEvent, {
            type: 'step_failed',
            stepId,
            error,
          });
        },
        onLog: (entry) => {
          emitEvent(this.runtime, workflow.id, executionId, onEvent, {
            type: 'execution_log',
            level:
              entry.level === 'warn' ||
              entry.level === 'error' ||
              entry.level === 'debug'
                ? entry.level
                : 'info',
            message: entry.message,
            stepId: entry.stepId,
            data:
              entry.data && typeof entry.data === 'object'
                ? (entry.data as Record<string, unknown>)
                : undefined,
          });
        },
      }
    );

    const execution = result.execution;
    const status = toEditorStatus(execution.status);

    if (status === 'completed') {
      emitEvent(this.runtime, workflow.id, execution.id, onEvent, {
        type: 'execution_completed',
        progress: 100,
      });
    } else if (status === 'failed') {
      emitEvent(this.runtime, workflow.id, execution.id, onEvent, {
        type: 'execution_failed',
        error: result.error || execution.error,
      });
    }

    execution.steps.forEach((step) => {
      const current = nodeStates[step.stepId] || {
        nodeId: step.stepId,
        status: 'pending',
        logs: [],
        retryCount: 0,
      };

      nodeStates[step.stepId] = {
        ...current,
        status:
          step.status === 'waiting_approval'
            ? 'waiting'
            : (step.status as NodeExecutionState['status']),
        input: step.input,
        output: step.output,
        error: step.error,
        retryCount: step.retryCount,
        startedAt: step.startedAt,
        completedAt: step.completedAt,
        duration: step.duration,
      };
    });

    return {
      executionId: execution.id,
      workflowId: workflow.id,
      runtime: this.runtime,
      status,
      input,
      output: execution.output,
      nodeStates,
      startedAt,
      completedAt: execution.completedAt,
      error: result.error || execution.error,
      triggerId,
      isReplay,
    };
  }

  async pause(executionId: string): Promise<void> {
    pauseVisualWorkflow(executionId);
  }

  async resume(executionId: string): Promise<void> {
    resumeVisualWorkflow(executionId);
  }

  async cancel(executionId: string): Promise<void> {
    cancelVisualWorkflow(executionId);
  }

  async getExecution(_executionId: string): Promise<WorkflowRuntimeExecutionResult | null> {
    return null;
  }

  async listExecutions(_workflowId?: string, _limit?: number): Promise<WorkflowRuntimeExecutionResult[]> {
    return [];
  }
}

export class TauriRuntimeAdapter implements WorkflowRuntimeAdapter {
  readonly runtime: WorkflowRuntimeSource = 'tauri';
  private readonly browserFallback = new BrowserRuntimeAdapter();

  async execute(request: WorkflowRuntimeExecuteRequest): Promise<WorkflowRuntimeExecutionResult> {
    const { workflow, definition, input, onEvent, triggerId, isReplay, runtimeConfig, signal } = request;

    if (!isTauriSupportedDefinition(definition)) {
      const fallbackExecutionId = `exec-tauri-fallback-${workflow.id}-${Date.now()}`;
      emitEvent(this.runtime, workflow.id, fallbackExecutionId, onEvent, {
        type: 'execution_log',
        level: 'warn',
        code: 'workflow.runtime.fallback.unsupported_definition',
        message:
          'Tauri runtime fallback to browser runtime: unsupported step type includes ai/tool/human/subworkflow',
      });
      return this.browserFallback.execute(request);
    }

    const nodeStates = createInitialNodeStates(workflow);
    const emittedStepTransitions = new Set<string>();
    const seenEventIds = new Set<string>();
    const requestId = createRequestId();
    const startedAt = new Date();

    let executionId = `exec-tauri-${workflow.id}-${Date.now()}`;
    let runtimeTerminalStatus: EditorExecutionStatus | null = null;
    let reconciledRecord: WorkflowRuntimeExecutionRecord | null = null;
    let pollingStopped = false;
    let pollTimer: ReturnType<typeof setInterval> | null = null;
    let unlisten: (() => void) | null = null;
    let abortNotified = false;

    const applyStepState = (
      stepId: string,
      status: NodeExecutionStatus,
      details?: {
        input?: Record<string, unknown>;
        output?: Record<string, unknown>;
        error?: string;
        retryCount?: number;
        startedAt?: string;
        completedAt?: string;
      },
      emit = true
    ) => {
      const current = nodeStates[stepId] || {
        nodeId: stepId,
        status: 'pending',
        logs: [],
        retryCount: 0,
      };
      nodeStates[stepId] = {
        ...current,
        status,
        input: details?.input ?? current.input,
        output: details?.output ?? current.output,
        error: details?.error ?? current.error,
        retryCount: details?.retryCount ?? current.retryCount,
        startedAt: details?.startedAt ? new Date(details.startedAt) : current.startedAt,
        completedAt: details?.completedAt ? new Date(details.completedAt) : current.completedAt,
      };

      if (!emit) {
        return;
      }

      const key = `${stepId}:${status}`;
      if (emittedStepTransitions.has(key)) {
        return;
      }
      emittedStepTransitions.add(key);

      if (status === 'running') {
        emitEvent(this.runtime, workflow.id, executionId, onEvent, {
          type: 'step_started',
          stepId,
        });
      } else if (status === 'completed') {
        emitEvent(this.runtime, workflow.id, executionId, onEvent, {
          type: 'step_completed',
          stepId,
          data: details?.output,
        });
      } else if (status === 'failed') {
        emitEvent(this.runtime, workflow.id, executionId, onEvent, {
          type: 'step_failed',
          stepId,
          error: details?.error,
        });
      }
    };

    const applyRecordSnapshot = (record: WorkflowRuntimeExecutionRecord, emit = true) => {
      executionId = record.executionId || executionId;
      (record.stepStates || []).forEach((step) => {
        applyStepState(step.stepId, toNodeStatus(step.status), {
          input: step.input,
          output: step.output,
          error: step.error,
          retryCount: step.retryCount,
          startedAt: step.startedAt,
          completedAt: step.completedAt,
        }, emit);
      });
    };

    const stopPolling = () => {
      if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
      }
      pollingStopped = true;
    };

    const startPolling = () => {
      if (pollTimer || pollingStopped || !executionId) {
        return;
      }
      pollTimer = setInterval(async () => {
        if (pollingStopped || !executionId) {
          return;
        }
        try {
          const record = await workflowGetExecution(executionId);
          if (!record) {
            return;
          }
          applyRecordSnapshot(record);
        } catch (error) {
          log.debug('[WorkflowRuntime] polling snapshot failed', {
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }, 600);
    };

    emitEvent(this.runtime, workflow.id, executionId, onEvent, {
      type: 'execution_started',
      progress: 0,
    });

    unlisten = await onWorkflowRuntimeEvent((nativeEvent: WorkflowRuntimeNativeEvent) => {
      if (nativeEvent.requestId !== requestId) {
        return;
      }

      if (nativeEvent.eventId) {
        if (seenEventIds.has(nativeEvent.eventId)) {
          return;
        }
        seenEventIds.add(nativeEvent.eventId);
      }

      executionId = nativeEvent.executionId || executionId;
      startPolling();

      switch (nativeEvent.type) {
        case 'execution_started':
          emitEvent(this.runtime, workflow.id, executionId, onEvent, {
            type: 'execution_started',
            eventId: nativeEvent.eventId,
            requestId: nativeEvent.requestId,
            traceId: nativeEvent.traceId,
            level: nativeEvent.level || 'info',
            code: nativeEvent.code,
            timestamp: new Date(nativeEvent.timestamp),
            progress: 0,
          });
          break;
        case 'execution_progress':
          emitEvent(this.runtime, workflow.id, executionId, onEvent, {
            type: 'execution_progress',
            eventId: nativeEvent.eventId,
            requestId: nativeEvent.requestId,
            traceId: nativeEvent.traceId,
            level: nativeEvent.level || 'info',
            code: nativeEvent.code,
            timestamp: new Date(nativeEvent.timestamp),
            progress: nativeEvent.progress,
          });
          break;
        case 'step_started':
          if (nativeEvent.stepId) {
            applyStepState(nativeEvent.stepId, 'running');
          }
          break;
        case 'step_completed':
          if (nativeEvent.stepId) {
            applyStepState(nativeEvent.stepId, 'completed', {
              output: normalizeEventData(nativeEvent.data),
            });
          }
          break;
        case 'step_failed':
          if (nativeEvent.stepId) {
            applyStepState(nativeEvent.stepId, 'failed', {
              error: nativeEvent.error,
            });
          }
          break;
        case 'execution_log':
          emitEvent(this.runtime, workflow.id, executionId, onEvent, {
            type: 'execution_log',
            eventId: nativeEvent.eventId,
            requestId: nativeEvent.requestId,
            traceId: nativeEvent.traceId,
            level: nativeEvent.level || (nativeEvent.error ? 'error' : 'info'),
            code: nativeEvent.code,
            timestamp: new Date(nativeEvent.timestamp),
            message: nativeEvent.message,
            stepId: nativeEvent.stepId,
            error: nativeEvent.error,
            data: normalizeEventData(nativeEvent.data),
          });
          break;
        case 'execution_completed':
          runtimeTerminalStatus = 'completed';
          emitEvent(this.runtime, workflow.id, executionId, onEvent, {
            type: 'execution_completed',
            eventId: nativeEvent.eventId,
            requestId: nativeEvent.requestId,
            traceId: nativeEvent.traceId,
            level: nativeEvent.level || 'info',
            code: nativeEvent.code,
            timestamp: new Date(nativeEvent.timestamp),
            progress: 100,
          });
          break;
        case 'execution_failed':
          runtimeTerminalStatus = 'failed';
          emitEvent(this.runtime, workflow.id, executionId, onEvent, {
            type: 'execution_failed',
            eventId: nativeEvent.eventId,
            requestId: nativeEvent.requestId,
            traceId: nativeEvent.traceId,
            level: nativeEvent.level || 'error',
            code: nativeEvent.code,
            timestamp: new Date(nativeEvent.timestamp),
            error: nativeEvent.error,
          });
          break;
        case 'execution_cancelled':
          runtimeTerminalStatus = 'cancelled';
          emitEvent(this.runtime, workflow.id, executionId, onEvent, {
            type: 'execution_cancelled',
            eventId: nativeEvent.eventId,
            requestId: nativeEvent.requestId,
            traceId: nativeEvent.traceId,
            level: nativeEvent.level || 'warn',
            code: nativeEvent.code,
            timestamp: new Date(nativeEvent.timestamp),
          });
          break;
        default:
          break;
      }
    });

    const abortHandler = async () => {
      if (abortNotified) {
        return;
      }
      abortNotified = true;
      if (executionId) {
        try {
          await workflowCancelExecution(executionId);
        } catch (error) {
          log.warn('[WorkflowRuntime] cancel request failed', {
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
      emitEvent(this.runtime, workflow.id, executionId, onEvent, {
        type: 'execution_cancelled',
        requestId,
        level: 'warn',
        code: 'workflow.execution.cancelled',
      });
    };

    if (signal?.aborted) {
      await abortHandler();
    } else {
      signal?.addEventListener('abort', () => {
        void abortHandler();
      }, { once: true });
    }

    let response;
    try {
      const settings = useSettingsStore.getState();
      const provider = settings.defaultProvider as ProviderName | undefined;
      const providerSettings = provider ? settings.providerSettings[provider] : undefined;

      response = await workflowRunDefinition({
        definition,
        input,
        options: {
          triggerId,
          isReplay,
          requestId,
          runtimeConfig: {
            provider,
            model: providerSettings?.defaultModel,
            timeoutMs: workflow.settings.maxExecutionTime,
            retry: workflow.settings.maxRetries,
            toolBridge: 'auto',
            ...(runtimeConfig || {}),
          },
        },
      });
    } finally {
      stopPolling();
      if (unlisten) {
        unlisten();
      }
    }

    executionId = response.executionId || executionId;

    // One final reconciliation snapshot to avoid event loss.
    try {
      const finalRecord = await workflowGetExecution(executionId);
      if (finalRecord) {
        reconciledRecord = finalRecord;
        applyRecordSnapshot(finalRecord, false);
      }
    } catch (error) {
      log.debug('[WorkflowRuntime] final reconciliation snapshot failed', {
        error: error instanceof Error ? error.message : String(error),
      });
    }

    response.stepStates.forEach((step: WorkflowRuntimeStepState) => {
      const next = toNodeStateFromStep(step);
      nodeStates[step.stepId] = {
        ...(nodeStates[step.stepId] || next),
        ...next,
      };
    });

    const responseStatus = toEditorStatus(response.status);
    const finalStatus = isTerminalStatus(responseStatus)
      ? responseStatus
      : runtimeTerminalStatus || responseStatus;

    if (finalStatus === 'completed') {
      emitEvent(this.runtime, workflow.id, executionId, onEvent, {
        type: 'execution_completed',
        requestId,
        level: 'info',
        code: 'workflow.execution.completed',
        progress: 100,
      });
    } else if (finalStatus === 'failed') {
      emitEvent(this.runtime, workflow.id, executionId, onEvent, {
        type: 'execution_failed',
        requestId,
        level: 'error',
        code: 'workflow.execution.failed',
        error: response.error,
      });
    } else if (finalStatus === 'cancelled') {
      emitEvent(this.runtime, workflow.id, executionId, onEvent, {
        type: 'execution_cancelled',
        requestId,
        level: 'warn',
        code: 'workflow.execution.cancelled',
      });
    }

    return {
      executionId,
      workflowId: workflow.id,
      runtime: this.runtime,
      status: finalStatus,
      input,
      output: response.output,
      nodeStates,
      startedAt: response.startedAt ? new Date(response.startedAt) : startedAt,
      completedAt: response.completedAt ? new Date(response.completedAt) : undefined,
      error: response.error,
      triggerId,
      isReplay,
      logs: reconciledRecord?.logs,
    };
  }

  async pause(executionId: string): Promise<void> {
    const ok = await workflowPauseExecution(executionId);
    if (!ok) {
      log.warn('[WorkflowRuntime] pause request ignored by tauri runtime', { executionId });
    }
  }

  async resume(executionId: string): Promise<void> {
    const ok = await workflowResumeExecution(executionId);
    if (!ok) {
      log.warn('[WorkflowRuntime] resume request ignored by tauri runtime', { executionId });
    }
  }

  async cancel(executionId: string): Promise<void> {
    await workflowCancelExecution(executionId);
  }

  async getExecution(executionId: string): Promise<WorkflowRuntimeExecutionResult | null> {
    const record = await workflowGetExecution(executionId);
    if (!record) {
      return null;
    }

    const nodeStates: Record<string, NodeExecutionState> = {};
    (record.stepStates || []).forEach((step) => {
      nodeStates[step.stepId] = toNodeStateFromStep(step);
    });

    return {
      executionId: record.executionId,
      workflowId: record.workflowId,
      runtime: this.runtime,
      status: toEditorStatus(record.status),
      input: record.input || {},
      output: record.output,
      nodeStates,
      startedAt: record.startedAt ? new Date(record.startedAt) : undefined,
      completedAt: record.completedAt ? new Date(record.completedAt) : undefined,
      error: record.error,
      logs: record.logs,
    };
  }

  async listExecutions(workflowId?: string, limit?: number): Promise<WorkflowRuntimeExecutionResult[]> {
    const records = await workflowListExecutions(workflowId, limit);
    return records.map((record) => {
      const nodeStates: Record<string, NodeExecutionState> = {};
      (record.stepStates || []).forEach((step) => {
        nodeStates[step.stepId] = toNodeStateFromStep(step);
      });

      return {
        executionId: record.executionId,
        workflowId: record.workflowId,
        runtime: this.runtime,
        status: toEditorStatus(record.status),
        input: record.input || {},
        output: record.output,
        nodeStates,
        startedAt: record.startedAt ? new Date(record.startedAt) : undefined,
        completedAt: record.completedAt ? new Date(record.completedAt) : undefined,
        error: record.error,
        logs: record.logs,
      } satisfies WorkflowRuntimeExecutionResult;
    });
  }
}

let defaultRuntimeAdapter: WorkflowRuntimeAdapter | null = null;

export function createWorkflowRuntimeAdapter(): WorkflowRuntimeAdapter {
  if (isTauri()) {
    return new TauriRuntimeAdapter();
  }
  return new BrowserRuntimeAdapter();
}

export function getWorkflowRuntimeAdapter(): WorkflowRuntimeAdapter {
  if (!defaultRuntimeAdapter) {
    defaultRuntimeAdapter = createWorkflowRuntimeAdapter();
  }
  return defaultRuntimeAdapter;
}

export function setWorkflowRuntimeAdapter(adapter: WorkflowRuntimeAdapter): void {
  defaultRuntimeAdapter = adapter;
}
